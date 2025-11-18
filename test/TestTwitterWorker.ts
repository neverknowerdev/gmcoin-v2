import { expect } from "chai";
import hre from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { Web3FunctionResultV2 } from "@gelatonetwork/web3-functions-sdk";
import { Web3FunctionHardhat } from "@gelatonetwork/web3-functions-sdk/hardhat-plugin";
import { deployAllContracts } from "./tools/deployContract";
import { MinterEvents } from "./tools/helpers";

const { w3f } = hre;

describe("Twitter Worker (v2)", function () {
    it("mints precomputed results and calls processMintingBatches/finishMinting", async function () {
        const {
            accountManager,
            minter,
            gmCoin,
            gelatoAddr,
            otherAcc1: userWallet,
        } = await loadFixture(deployAllContracts);

        const twitterId = 123456789n;
        await accountManager
            .connect(gelatoAddr)
            .createOrLinkUser(userWallet.address, twitterId, 0);

        const mintingDayTimestamp = 1_700_000_000;
        const userIndex = 0;

        const userResult = {
            userIndex,
            hashtagTweets: 1,
            cashtagTweets: 0,
            simpleTweets: 2,
            tweets: 3,
            likes: 5,
        };

        const accountInfo = {
            twitterId: twitterId.toString(),
            userId: "1",
            primaryWallet: userWallet.address,
            username: "user123",
        };

        const storageState: Record<string, string> = {
            [`${mintingDayTimestamp}_userResults`]: JSON.stringify([
                [userIndex, userResult],
            ]),
            [`${mintingDayTimestamp}_accountInfo`]: JSON.stringify([
                [userIndex, accountInfo],
            ]),
            [`${mintingDayTimestamp}_isFetchedLastUserIndex`]: "true",
            [`${mintingDayTimestamp}_nextAccounts`]: JSON.stringify([]),
            [`${mintingDayTimestamp}_runningHash`]: "",
            [`${mintingDayTimestamp}_tweetOrder`]: "0",
            [`${mintingDayTimestamp}_tweetsToVerify`]: JSON.stringify([]),
        };

        const log = MinterEvents.MintingProcessed(0, mintingDayTimestamp, []);

        const oracleW3f: Web3FunctionHardhat = w3f.get("twitter-worker");

        const { result } = await oracleW3f.run("onRun", {
            userArgs: {
                minterAddress: await minter.getAddress(),
                accountManagerAddress: await accountManager.getAddress(),
                gmCoinAddress: await gmCoin.getAddress(),
                concurrencyLimit: 1,
                serverURLPrefix: "https://api.example.com/",
                tweetLookupURL: "https://api.twitter.com/2/tweets",
                twitterOptimizedServerHost: "https://api.example.com",
            },
            log,
            storage: storageState,
            secrets: {
                AWS_ACCESS_KEY_ID: "test",
                AWS_SECRET_ACCESS_KEY: "test",
                ENV: "local",
                TWITTER_BEARER: "test",
                TWITTER_OPTIMIZED_SERVER_KEY: "test",
                TWITTER_OPTIMIZED_SERVER_AUTH_HEADER_NAME: "x-test",
                SERVER_API_KEY: "test",
            },
        });

        const errorMessage = "message" in result ? result.message : undefined;
        expect(result.canExec, errorMessage).to.equal(true);
        if (!result.canExec) {
            throw new Error(errorMessage ?? "web3 function is not executable");
        }

        const execResult = result as Extract<Web3FunctionResultV2, { canExec: true }>;
        expect(execResult.callData).to.have.length(3);

        const gmCall = execResult.callData[0];
        const processCall = execResult.callData[1];
        const finishCall = execResult.callData[2];

        const gmInterface = gmCoin.interface;
        const minterInterface = minter.interface;

        const decodedMint = gmInterface.decodeFunctionData(
            "mintFromGelatoW3F",
            gmCall.data
        );
        expect(decodedMint[0]).to.deep.equal([userWallet.address]);

        const mintingSettings = await minter.getMintingSettings();
        const pointsPerPost = BigInt(mintingSettings.pointsPerPost.toString());
        const pointsPerLike = BigInt(mintingSettings.pointsPerLike.toString());
        const pointsPerHashtag = BigInt(
            mintingSettings.pointsPerHashtag.toString()
        );
        const pointsPerCashtag = BigInt(
            mintingSettings.pointsPerCashtag.toString()
        );
        const coinsMultiplicator = BigInt(
            mintingSettings.coinsMultiplicator.toString()
        );

        const expectedPoints =
            BigInt(userResult.simpleTweets) * pointsPerPost +
            BigInt(userResult.hashtagTweets) * pointsPerHashtag +
            BigInt(userResult.cashtagTweets) * pointsPerCashtag +
            BigInt(userResult.likes) * pointsPerLike;
        const expectedAmount = expectedPoints * coinsMultiplicator;
        expect(decodedMint[1][0]).to.equal(expectedAmount);

        const decodedProcess = minterInterface.decodeFunctionData(
            "processMintingBatches",
            processCall.data
        );
        expect(decodedProcess[0]).to.equal(0); // Platform.Twitter
        expect(decodedProcess[1]).to.equal(expectedPoints);
        expect(decodedProcess[2]).to.equal(BigInt(mintingDayTimestamp));
        expect(decodedProcess[3]).to.deep.equal([]);

        const decodedFinish = minterInterface.decodeFunctionData(
            "finishMinting",
            finishCall.data
        );
        expect(decodedFinish[0]).to.equal(0); // Platform.Twitter
        expect(decodedFinish[1]).to.equal(BigInt(mintingDayTimestamp));
    });
});

