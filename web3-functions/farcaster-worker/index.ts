import { Interface } from "@ethersproject/abi";
import { Storage } from "./storage";
import { Web3Function, Web3FunctionEventContext, Web3FunctionResult } from "@gelatonetwork/web3-functions-sdk";
import { Contract, ContractRunner, InterfaceAbi } from "ethers";
import { Web3FunctionResultCallData } from "@gelatonetwork/web3-functions-sdk/dist/lib/types/Web3FunctionResult";
import { Batch, BatchToString, defaultResult, Result, Cast, CastProcessingType, MinterABI, AccountManagerABI, GMCoinABI, Platform, MintingSettings, FarcasterAccountWithUsername } from "./consts";
import { BatchManager } from "./batchManager";
import { FarcasterRequester } from "./farcasterRequester";
import { SmartContractConnector } from "./smartContractConnector";
import { BatchUploader } from "./batchUploader";
import { CloudwatchLogger } from "../twitter-worker/cloudwatch";

const KEYWORD = "gm";
const verifyCastBatchSize = 300;

Web3Function.onFail(async (context: Web3FunctionFailContext) => {
    const { reason } = context;

    if (reason === "ExecutionReverted") {
        console.log(`onFail: ${reason} txHash: ${context.transactionHash}`);
    } else if (reason === "SimulationFailed") {
        console.log(
            `onFail: ${reason} callData: ${JSON.stringify(context.callData)}`
        );
    } else {
        console.log(`onFail: ${reason}`);
    }
});

Web3Function.onRun(async (context: Web3FunctionEventContext): Promise<Web3FunctionResult> => {
    console.log('onRun - Farcaster Worker');

    const awsAccessKeyID = await context.secrets.get("AWS_ACCESS_KEY_ID");
    if (!awsAccessKeyID) {
        return { canExec: false, message: `Missing AWS_ACCESS_KEY_ID environment variable` };
    }

    const awsSecretAccessKey = await context.secrets.get("AWS_SECRET_ACCESS_KEY");
    if (!awsSecretAccessKey) {
        return { canExec: false, message: `Missing AWS_SECRET_ACCESS_KEY environment variable` };
    }

    const env = await context.secrets.get("ENV") || 'local';

    const logStreamName = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    const logGroupName = env === 'mainnet' ? `FarcasterWorkerGelatoLogs-prod` : `FarcasterWorkerGelatoLogs`;

    const logger = new CloudwatchLogger({
        region: 'eu-central-1',
        accessKeyId: awsAccessKeyID,
        secretAccessKey: awsSecretAccessKey,
        logGroupName: logGroupName,
        logStreamName: logStreamName,
        bufferSize: 100,
        flushInterval: 0,
        enabled: env !== 'local'
    });

    try {
        const result = await executeFarcasterWorker(logger, context);
        if (!result.canExec) {
            logger.error(`result ${JSON.stringify(result)}`);
        } else {
            logger.info(`result.canExec true`);
        }

        await logger.flushAndSend(1);
        return result;
    } catch (error: any) {
        logger.error(`Error in onRun: ${error}`);
        await logger.flushAndSend(1);
        return {
            canExec: false,
            message: 'Unexpected error in onRun: ' + error.message,
        };
    }
});

async function executeFarcasterWorker(logger: CloudwatchLogger, context: Web3FunctionEventContext): Promise<Web3FunctionResult> {
    logger.info('Starting Farcaster worker execution');

    // Get event log from Web3FunctionEventContext
    const { log, userArgs, multiChainProvider, storage: w3fStorage } = context;

    const CONCURRENCY_LIMIT = userArgs.concurrencyLimit as number;
    const serverURLPrefix = userArgs.serverURLPrefix as string;

    const neynarAPIKey = await context.secrets.get("NEYNAR_API_KEY");
    if (!neynarAPIKey)
        return { canExec: false, message: `NEYNAR_API_KEY not set in secrets` };

    const serverApiKey = await context.secrets.get("SERVER_API_KEY");
    if (!serverApiKey) {
        return { canExec: false, message: `Missing SERVER_API_KEY env variable` };
    }

    if (!userArgs.minterAddress) {
        return { canExec: false, message: `Missing minterAddress user argument` };
    }
    if (!userArgs.accountManagerAddress) {
        return { canExec: false, message: `Missing accountManagerAddress user argument` };
    }
    if (!userArgs.gmCoinAddress) {
        return { canExec: false, message: `Missing gmCoinAddress user argument` };
    }

    const neynarFeedURL = userArgs.neynarFeedURL as string || 'https://api.neynar.com/v2/farcaster/feed/';

    try {
        const provider = multiChainProvider.default() as unknown as ContractRunner;
        const minterContract = new Contract(
            userArgs.minterAddress as string,
            MinterABI,
            provider
        );
        const gmCoinContract = new Contract(
            userArgs.gmCoinAddress as string,
            GMCoinABI,
            provider
        );
        const accountManagerContract = new Contract(
            userArgs.accountManagerAddress as string,
            AccountManagerABI,
            provider
        );

        const minterInterface = new Interface(MinterABI as InterfaceAbi);
        const event = minterInterface.parseLog(log);

        const { platform, mintingDayTimestamp, batches: eventBatches } = event.args;

        if (Number(platform) !== Platform.Farcaster) {
            logger.warn(`Received event for non-farcaster platform: ${platform}`);
            return {
                canExec: false,
                message: "Event platform does not match Farcaster worker",
            };
        }

        let storage = new Storage(w3fStorage, mintingDayTimestamp);

        let farcasterRequester = new FarcasterRequester({
            NeynarAPIKey: neynarAPIKey,
        }, {
            neynarFeedURL: neynarFeedURL,
        });

        let contractConnector = new SmartContractConnector(accountManagerContract, storage, logger);

        let batchManager = new BatchManager(logger, storage, contractConnector, mintingDayTimestamp, CONCURRENCY_LIMIT);

        const initBatches = eventBatches.map((item: any) => ({
            startIndex: item.startIndex.toNumber(),
            endIndex: item.endIndex.toNumber(),
            nextCursor: item.nextCursor,
            errorCount: item.errorCount,
        }));

        let batchUploader = new BatchUploader(mintingDayTimestamp, storage, serverURLPrefix, serverApiKey, logger);
        await batchUploader.loadStateFromStorage();

        logger.info(`received batches:`, BatchToString(initBatches));

        let accountInfoMap = await storage.loadAccountInfoMap();

        let {
            batchesToProcess,
            fidBatches,
            userIndexByFID,
            accountInfoByUserIndex
        } = await batchManager.generateNewBatches(farcasterRequester, mintingDayTimestamp, initBatches);

        accountInfoByUserIndex.forEach((value, key) => {
            accountInfoMap.set(key, value);
        });
        await storage.saveAccountInfoMap(accountInfoMap);

        logger.info(`userIndexByFID size:`, userIndexByFID.size, `content:`, userIndexByFID);
        logger.info(`generateNewBatches count:`, batchesToProcess.length, `batches:`, BatchToString(batchesToProcess));
        logger.info(`fidBatches count:`, fidBatches.length, `batches:`, fidBatches);

        let transactions: any[] = [];

        let UserResults = await storage.loadUserResults();
        const mintingSettings = await fetchMintingSettings(minterContract, storage, logger);

        if (batchesToProcess.length > 0) { // process batches
            logger.info(`Processing`, batchesToProcess.length, `batches`);

            // Processing casts here..
            const {
                casts,
                batches,
                errorBatches
            } = await farcasterRequester.fetchCastsInBatches(batchesToProcess, fidBatches, userIndexByFID);

            batchesToProcess = batches;

            logger.info(`batchesToProcess:`, batchesToProcess.length, `errorBatches:`, errorBatches.length);
            logger.info(`Fetched`, casts.length, `casts`);

            for (let i = 0; i < casts.length; i++) {
                const foundKeyword = findKeywordWithPrefix(casts[i].castContent)
                if (foundKeyword == "") {
                    continue;
                }
                logger.info(`casts[i] ${JSON.stringify(casts[i])}`);

                let result = UserResults.get(casts[i].userIndex) || { ...defaultResult };
                result.userIndex = casts[i].userIndex;
                const processingType = calculateCastByKeyword(result, casts[i].likesCount, foundKeyword);

                batchUploader.add(casts[i], processingType);

                if (processingType == CastProcessingType.Skipped) {
                    logger.warn(`skipping cast ${casts[i].castHash} ${casts[i].castContent}`);
                    continue;
                }

                UserResults.set(casts[i].userIndex, result);
            }

            let results: Result[] = [];

            let allUserIndexes = Array.from(UserResults.keys()).sort((a, b) => a - b);

            const ongoingBatches = batchesToProcess.concat(errorBatches).filter((b) => b.nextCursor != '');
            for (const userIndex of allUserIndexes) {

                let isOngoingBatch = false;
                for (const batch of ongoingBatches) {
                    if (batch.startIndex < userIndex && userIndex < batch.endIndex) {
                        isOngoingBatch = true;
                        break;
                    }
                }

                if (isOngoingBatch) {
                    continue;
                }

                const res = UserResults.get(userIndex) as Result;
                if (res.casts < 1000) {
                    results.push(res);
                }
                UserResults.delete(userIndex);
            }

            const finishedBatches = batchesToProcess.filter((b) => b.nextCursor == '');
            for (const finishedBatch of finishedBatches) {
                await storage.clearBatchData(finishedBatch);
            }

            await storage.saveUserResults(UserResults);
            const sortedResults = results.sort((a, b) => Number(a.userIndex - b.userIndex));

            const runningHash = batchUploader.getRunningHash();

            const uploaded = await batchUploader.uploadToServer();
            if (!uploaded) {
                throw new Error('failed to upload casts to the server');
            }
            await batchUploader.saveStateToStorage();

            logger.info(`sortedResults ${JSON.stringify(sortedResults)}`);

            // retry errored batches that has less than 3 retries
            const batchesToRetry = errorBatches.filter((b) => b.errorCount < 3);
            const errorBatchesToLog = errorBatches.filter((b) => b.errorCount >= 3);

            if (batchesToRetry.length > 0) {
                batchesToProcess.push(...batchesToRetry);
            }

            const { addresses, amounts, totalPoints } = buildMintPayload(sortedResults, accountInfoMap, mintingSettings, logger);

            if (addresses.length > 0) {
                transactions.push({
                    to: userArgs.gmCoinAddress as string,
                    data: gmCoinContract.interface.encodeFunctionData("mintFromGelatoW3F", [
                        addresses,
                        amounts,
                    ]),
                });
            }

            if (totalPoints > 0n || batchesToProcess.length > 0) {
                transactions.push({
                    to: userArgs.minterAddress as string,
                    data: minterContract.interface.encodeFunctionData("processMintingBatches", [
                        Platform.Farcaster,
                        totalPoints,
                        BigInt(mintingDayTimestamp),
                        batchesToProcess,
                    ]),
                });
            }
            if (errorBatchesToLog.length > 0) {
                logger.info(`logFarcasterErrorBatches ${errorBatches.length}`);
                transactions.push({
                    to: userArgs.minterAddress as string,
                    data: minterContract.interface.encodeFunctionData("logErrorBatches", [
                        Platform.Farcaster,
                        BigInt(mintingDayTimestamp),
                        errorBatches,
                    ]),
                })
            }

            logger.info(`sending txs.. ${transactions.length}`);
            logger.info(`transactions ${JSON.stringify(transactions)}`);
            if (transactions.length > 0) {
                return {
                    canExec: true,
                    callData: transactions,
                };
            }

            return {
                canExec: false,
                message: 'unexpected behavior',
            };
        }
        // minting finished
        if (batchesToProcess.length == 0) {
            logger.info('mintingFinished');

            let transactions: Web3FunctionResultCallData[] = [];
            try {

                const results = [...UserResults.values()].sort((a, b) => Number(a.userIndex - b.userIndex));

                const { addresses, amounts, totalPoints } = buildMintPayload(results, accountInfoMap, mintingSettings, logger);

                if (addresses.length > 0) {
                    transactions.push({
                        to: userArgs.gmCoinAddress as string,
                        data: gmCoinContract.interface.encodeFunctionData("mintFromGelatoW3F", [
                            addresses,
                            amounts,
                        ]),
                    });
                }

                if (totalPoints > 0n) {
                    transactions.push({
                        to: userArgs.minterAddress as string,
                        data: minterContract.interface.encodeFunctionData("processMintingBatches", [
                            Platform.Farcaster,
                            totalPoints,
                            BigInt(mintingDayTimestamp),
                            [],
                        ]),
                    });
                }
            } catch (error) {
                // Handle errors for this batch
                logger.error(`Error fetching batch for verifyCasts: ${error}`);

                return {
                    canExec: false,
                    message: `error during verifying casts: ${error}`
                }
            }

            const finalHash = batchUploader.getRunningHash();
            logger.info(`finalHash ${finalHash}`);

            const uploaded = await batchUploader.uploadToServer();
            if (!uploaded) {
                throw new Error('failed to SaveCasts (verifiedCasts) to the server');
            }

            // don't wait for response, cause it takes too long to complete (like 30-60 secs)
            batchUploader.sendUploadToIPFSRequest();
            // wait for 1 sec
            await new Promise(f => setTimeout(f, 1000));

            // finish minting at all
            await storage.clearAll();

            transactions.push({
                to: userArgs.minterAddress as string,
                data: minterContract.interface.encodeFunctionData("finishMinting", [
                    Platform.Farcaster,
                    BigInt(mintingDayTimestamp),
                    finalHash
                ]),
            });

            logger.info(`transactions to send ${JSON.stringify(transactions)}`);

            return {
                canExec: true,
                callData: transactions
            }
        }

        return {
            canExec: false,
            message: 'No batches to process and minting not finished',
        };

    } catch (error: any) {
        if (error.code === 'CALL_EXCEPTION' && error.reason) {
            logger.error(error);
            logger.error(`transaction reverted: ${error.reason}`);
        }

        logger.error(`Error in farcaster-worker: ${error}`);
        return {
            canExec: false,
            message: 'Unexpected error in farcaster-worker: ' + error.message,
        };
    }
}

function calculateCastByKeyword(result: Result, likesCount: number, keyword: string): CastProcessingType {
    let processingType = CastProcessingType.Skipped;

    if (keyword == "") {
        return processingType;
    }

    // limit 10 hashtag/cashtag per day per user
    if (keyword == "$" + KEYWORD && result.cashtagCasts < 10) {
        processingType = CastProcessingType.Cashtag;
    } else if (keyword == "#" + KEYWORD && result.hashtagCasts < 10) {
        processingType = CastProcessingType.Hashtag;
    } else if (keyword == KEYWORD) {
        processingType = CastProcessingType.Simple;
    }

    switch (processingType) {
        case CastProcessingType.Simple:
            result.simpleCasts++;
            break;
        case CastProcessingType.Hashtag:
            result.hashtagCasts++;
            break;
        case CastProcessingType.Cashtag:
            result.cashtagCasts++;
            break;
        default:
            return processingType
    }

    result.casts++;
    result.likes += likesCount;

    return processingType;
}

function findKeywordWithPrefix(text: string): string {
    const words = text.split(/\s+/);  // Split by whitespace to get individual words

    let foundWord = "";
    for (const word of words) {
        // Remove punctuation from the word
        const cleanedWord = word.replace(/[.,!?;:()]/g, "").toLowerCase();

        // Check for cashtag casts
        if (cleanedWord === "$" + KEYWORD) {
            return "$" + KEYWORD;
        }
        // Check for hashtag casts
        else if (cleanedWord === "#" + KEYWORD) {
            foundWord = "#gm";
        }
        // Check for simple keyword casts
        else if (cleanedWord === KEYWORD && foundWord == "") {
            foundWord = cleanedWord;
        }
    }

    return foundWord;
}

async function fetchMintingSettings(minterContract: Contract, storage: Storage, logger: CloudwatchLogger): Promise<MintingSettings> {
    // Check cache first
    const cached = await storage.getMintingSettings();
    if (cached) {
        logger.info('Using cached minting settings');
        return JSON.parse(cached) as MintingSettings;
    }

    // Fetch from contract if not cached
    logger.info('Fetching minting settings from contract');
    const [pointsPerPost, pointsPerLike, pointsPerHashtag, pointsPerCashtag, coinsMultiplicator] = await minterContract.getMintingSettings();
    const settings: MintingSettings = {
        pointsPerPost: BigInt(pointsPerPost),
        pointsPerLike: BigInt(pointsPerLike),
        pointsPerHashtag: BigInt(pointsPerHashtag),
        pointsPerCashtag: BigInt(pointsPerCashtag),
        coinsMultiplicator: BigInt(coinsMultiplicator),
    };
    
    // Cache for future runs of this mintingDay
    await storage.saveMintingSettings(JSON.stringify(settings));
    return settings;
}

function buildMintPayload(
    results: Result[],
    accountInfoMap: Map<number, FarcasterAccountWithUsername>,
    settings: MintingSettings,
    logger: CloudwatchLogger
): { addresses: string[]; amounts: bigint[]; totalPoints: bigint } {
    const addresses: string[] = [];
    const amounts: bigint[] = [];
    let totalPoints = 0n;

    for (const result of results) {
        const accountInfo = accountInfoMap.get(result.userIndex);
        if (!accountInfo) {
            logger.warn(`Missing account info for userIndex ${result.userIndex}, skipping mint`);
            continue;
        }

        const points = calculateUserPoints(result, settings);
        if (points === 0n) {
            continue;
        }

        totalPoints += points;
        const coins = points * settings.coinsMultiplicator;

        addresses.push(accountInfo.primaryWallet);
        amounts.push(coins);
    }

    return { addresses, amounts, totalPoints };
}

function calculateUserPoints(result: Result, settings: MintingSettings): bigint {
    return (
        BigInt(result.simpleCasts) * settings.pointsPerPost +
        BigInt(result.hashtagCasts) * settings.pointsPerHashtag +
        BigInt(result.cashtagCasts) * settings.pointsPerCashtag +
        BigInt(result.likes) * settings.pointsPerLike
    );
}