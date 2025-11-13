import { Interface } from "@ethersproject/abi";
import { Contract } from "ethers";
import { Web3Function, Web3FunctionEventContext } from "@gelatonetwork/web3-functions-sdk";
import { Web3FunctionResult } from "@gelatonetwork/web3-functions-sdk/types";
import ky, { HTTPError } from "ky";

const VerifierContractABI = [
    "function createOrLinkUser(address wallet, uint256 twitterId, uint256 farcasterFid) public returns (uint256)",
    "function twitterVerificationError(address wallet, uint256 twitterID, string calldata errorMsg) public",
    "event VerifyTwitterByAuthCodeRequested(address wallet, string authCode, string tweetID, uint256 twitterID)",
];

interface TwitterResponseV1 {
    data: {
        tweet_result: {
            result: {
                legacy: {
                    full_text: string;
                    user_id_str: string;
                };
            };
        };
    };
}

interface TwitterResponseV2 {
    text: string;
    author_id: string;
}


Web3Function.onRun(async (context: Web3FunctionEventContext): Promise<Web3FunctionResult> => {
    const { log, userArgs, multiChainProvider } = context;

    const provider = multiChainProvider.default();

    const verifierContract = new Contract(
        userArgs.verifierContractAddress as string,
        VerifierContractABI,
        provider as any
    );

    const contract = new Interface(VerifierContractABI);
    const event = contract.parseLog(log);

    // Handle event data
    // Note: twitterID is uint256 in the event, but verifyTwitter expects string
    const { wallet, authCode, tweetID, twitterID } = event.args;
    const userID = twitterID.toString(); // Convert uint256 to string for use in functions
    console.log('tweetID', tweetID);
    console.log(`Verifying Twitter for address ${wallet}..`);
    console.log('authCode', authCode);

    // Validate auth code format and wallet letters
    const authCodeValidation = validateAuthCode(authCode, wallet);
    console.log('authCodeValidation', authCodeValidation);
    if (!authCodeValidation.isValid) {
        return await returnError(verifierContract, userID, wallet, authCodeValidation.error || "Invalid auth code");
    }

    const tweetFetchURL = await context.secrets.get("TWITTER_GET_TWEET_URL");
    if (!tweetFetchURL) {
        return await returnError(verifierContract, userID, wallet, "TWITTER_GET_TWEET_URL not set in secrets");
    }

    const headerName = await context.secrets.get("TWITTER_HEADER_NAME");
    if (!headerName) {
        return await returnError(verifierContract, userID, wallet, "HEADER_NAME not set in secrets");
    }

    const twitterBearer = await context.secrets.get("TWITTER_BEARER");
    if (!twitterBearer) {
        return await returnError(verifierContract, userID, wallet, "TWITTER_BEARER not set in secrets");
    }

    console.log('tweetFetchURL', tweetFetchURL);
    console.log('headerName', headerName);
    console.log('twitterBearer', twitterBearer);

    console.log('here');

    try {
        // Fetch tweet using Twitter API
        const response = await ky.get(`${tweetFetchURL}?tweet_id=${tweetID}`, {
            headers: {
                [headerName as string]: twitterBearer,
            },
        }).json<any>();

        console.log('response', response);

        const tweetData = getTweetContentAndAuthorId(response);
        if (!tweetData) {
            console.log('Failed to parse tweet data');
            return await returnError(verifierContract, userID, wallet, "Failed to parse tweet data");
        }

        console.log('tweetData', tweetData);

        const { tweetContent, authorId } = tweetData;
        console.log('Tweet content:', tweetContent);

        // Check if auth code exists in tweet content
        if (!tweetContent.includes(authCode)) {
            return await returnError(verifierContract, userID, wallet, "Auth code not found in tweet");
        }

        // Verify user ID matches
        if (authorId !== userID) {
            return await returnError(verifierContract, userID, wallet, "User ID mismatch");
        }

        // Call createOrLinkUser to link the Twitter account (farcasterFid = 0 for Twitter-only verification)
        // Convert twitterID to a proper BigNumberish value (it might be a BigNumber from ethers v5)
        const twitterIDValue = typeof twitterID === 'object' && twitterID.toString ? twitterID.toString() : twitterID;
        return {
            canExec: true,
            callData: [
                {
                    to: userArgs.verifierContractAddress as string,
                    data: verifierContract.interface.encodeFunctionData("createOrLinkUser", [
                        wallet,
                        twitterIDValue,
                        0 // farcasterFid = 0 for Twitter-only verification
                    ]),
                },
            ],
        };
    } catch (error: any) {
        console.log('error', error);
        if (error instanceof HTTPError) {
            // Attempt to read the error response as JSON
            const errorBody = await error.response.json();
            return await returnError(verifierContract, userID, wallet, `Failed to retrieve tweet: ${JSON.stringify(errorBody)}`);
        } else {
            return await returnError(verifierContract, userID, wallet, `An unexpected error occurred: ${error.message}`);
        }
    }
});

async function returnError(contract: Contract, userID: string, userWallet: string, errorMsg: string): Promise<Web3FunctionResult> {
    const contractAddress = await contract.getAddress();
    // Convert userID string to uint256 for the function call
    const twitterID = BigInt(userID);
    return {
        canExec: true,
        callData: [
            {
                to: contractAddress,
                data: contract.interface.encodeFunctionData("twitterVerificationError", [
                    userWallet,
                    twitterID,
                    errorMsg
                ]),
            },
        ],
    }
}

function getTweetContentAndAuthorId(response: any): { tweetContent: string; authorId: string } | null {
    // Check for V1 format
    if (response.data?.tweet_results?.result?.legacy) {
        return {
            tweetContent: response.data.tweet_results.result.legacy.full_text,
            authorId: response.data.tweet_results.result.legacy.user_id_str
        };
    }

    // Check for V2 format
    if (response.text && response.author_id) {
        return {
            tweetContent: response.text,
            authorId: response.author_id
        };
    }

    return null;
}

function validateAuthCode(authCode: string, walletAddress: string): { isValid: boolean; error?: string } {
    // Auth code format: GM${walletStartingLetterNumberStr}${wallet10Letters}${random2}
    if (!authCode.startsWith('GM')) {
        return { isValid: false, error: "Auth code must start with 'GM'" };
    }

    // Extract wallet starting letter number (2 digits)
    const walletStartingLetterNumberStr = authCode.substring(2, 4);
    if (!/^\d{2}$/.test(walletStartingLetterNumberStr)) {
        return { isValid: false, error: "Invalid wallet starting letter number format" };
    }

    // Extract wallet 10 letters
    const wallet10Letters = authCode.substring(4, 14);
    if (!/^[a-fA-F0-9]{10}$/.test(wallet10Letters)) {
        return { isValid: false, error: "Invalid wallet letters format" };
    }

    // Get the actual wallet letters from the wallet address
    const walletStartingLetterNumber = parseInt(walletStartingLetterNumberStr);
    const actualWalletLetters = walletAddress.substring(walletStartingLetterNumber, walletStartingLetterNumber + 10);

    if (wallet10Letters.toLowerCase() !== actualWalletLetters.toLowerCase()) {
        return { isValid: false, error: "Wallet letters in auth code do not match the wallet address" };
    }

    return { isValid: true };
}