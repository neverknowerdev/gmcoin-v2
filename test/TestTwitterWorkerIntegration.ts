import { expect, use } from "chai";
import hre from "hardhat";
import isEqual from 'lodash/isEqual';
import { Web3FunctionHardhat } from "@gelatonetwork/web3-functions-sdk/hardhat-plugin";
import { Provider, HDNodeWallet, EventLog, Contract, JsonRpcProvider } from "ethers";
import { MockHttpServer } from './tools/mockServer';
import { deployAllContracts } from "./tools/deployContract";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import * as url from 'url';
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { IncomingHttpHeaders } from "http";
import { blake2b } from "blakejs";
import { MinterEvents } from './tools/helpers';

const { ethers, w3f } = hre;

describe("GelatoW3F Twitter Worker Integration", function () {
    let mockServer: MockHttpServer;

    before(async function () {
        // Initialize and start the mock server
        mockServer = new MockHttpServer(8118);
        mockServer.start();
    });

    after(async function () {
        // Stop the mock server after all tests
        mockServer.stop();
    });

    beforeEach(async function () {
        // Reset mocks before each test
        mockServer.resetMocks();
    });

    it('twitter-worker success', async function () {
        /*
          Test case 1:
          start minting: empty Batch[]
          mint for 200 users by batches
          verify by Twitter API
          finish minting
        */

        const {
            accountManager,
            minter,
            gmCoin,
            treasury,
            owner,
            feeAddr,
            treasuryAddr,
            gelatoAddr,
            coinsMultiplicator
        } = await loadFixture(deployAllContracts);

        const gelatoMinter = minter.connect(gelatoAddr);
        const gelatoAccountManager = accountManager.connect(gelatoAddr);

        const userLimit = 200;
        const concurrencyLimit = 50;

        const generatedWallets: HDNodeWallet[] = generateWallets(ethers.provider, userLimit);

        let walletByTwitterId: Map<string, string> = new Map();
        let twitterIdByWallet: Map<string, string> = new Map();
        for (let i = 0; i < userLimit; i++) {
            const twitterId = String(i + 1);
            await gelatoAccountManager.createOrLinkUser(generatedWallets[i].address, BigInt(twitterId), 0);
            walletByTwitterId.set(twitterId, generatedWallets[i].address);
            twitterIdByWallet.set(generatedWallets[i].address, twitterId);
        }

        let allUserTweetsByUsername = generateUserTweetsMap(userLimit, true);

        let tweetMap: Map<string, Tweet> = new Map();
        for (let [userID, tweets] of allUserTweetsByUsername) {
            for (let tweet of tweets) {
                tweetMap.set(tweet.tweet_id, tweet);
            }
        }

        let queryCount = 0;
        let queryErrorCount: Map<string, number> = new Map();
        mockServer.mockFunc('/Search', 'GET', (url: url.UrlWithParsedQuery) => {
            queryCount++;

            const q = url.query["q"] as string;
            const cursor = url.query["cursor"] as string;
            const usernamesList = extractUserIDs(q);

            const alreadyErroredCount = queryErrorCount.get(q) || 0;
            if (alreadyErroredCount < 2) {
                if (queryCount % 5 == 0) {
                    queryErrorCount.set(q, alreadyErroredCount + 1);
                    throw new Error("some random error");
                }
            }

            const { filteredTweets, nextCursor } = filterUserTweets(allUserTweetsByUsername, usernamesList, cursor, 20);

            let response = generateResponse(filteredTweets, nextCursor, cursor == '');
            return response;
        });

        mockServer.mockFunc('/tweet-lookup/', 'GET', (url: url.UrlWithParsedQuery) => {
            const idList = url.query["ids"] as string;
            const tweetIDs = idList.split(',');

            const expansionFields = (url.query["tweet.fields"] as string).split(",");
            expect(expansionFields.indexOf("public_metrics")).to.be.greaterThan(-1);

            return generateResponseForTweetLookup(tweetMap, tweetIDs, 0);
        });

        mockServer.mockFunc('/UserResultsByRestIds', 'GET', (url: url.UrlWithParsedQuery) => {
            const idList = url.query["user_ids"] as string;
            const userIDs = idList.split(',');

            let response: { data: { users: Array<{ result: { core: { screen_name: string } }; rest_id: string }> } } = { data: { users: [] } };
            for (const userID of userIDs) {
                response.data.users.push({
                    result: {
                        core: {
                            screen_name: `user${userID}`
                        },
                    },
                    rest_id: userID,
                })
            }

            return response;
        });

        mockServer.mock('/SaveTweets', 'POST', { success: true });

        mockServer.mockFunc('/UploadTweetsToIPFS', 'POST', (url: url.UrlWithParsedQuery, headers: IncomingHttpHeaders, body: any) => {
            const receivedJSON = typeof body === "string" ? JSON.parse(body) : body;
            const apiKey = headers.authorization;
            expect(apiKey?.indexOf('sN') === 0).to.be.true;

            expect(receivedJSON.mintingDayTimestamp).to.be.equal(mintingDay);

            return {
                success: true
            }
        });

        const accountManagerAddress = await accountManager.getAddress();
        const minterAddress = await minter.getAddress();
        const gmCoinAddress = await gmCoin.getAddress();

        let today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const mintingDay = Math.floor(today.setDate(today.getDate() - 1) / 1000);

        const userArgs = {
            minterAddress: minterAddress,
            accountManagerAddress: accountManagerAddress,
            gmCoinAddress: gmCoinAddress,
            concurrencyLimit: concurrencyLimit,
            twitterOptimizedServerHost: "http://localhost:8118",
            serverURLPrefix: 'http://localhost:8118/',
            tweetLookupURL: "http://localhost:8118/tweet-lookup/",
        };

        const {
            userMintCount,
            treasuryMintCount,
            finalRunningHash
        } = await mintUntilEnd(minter, gmCoin, accountManager, gelatoAddr, treasuryAddr, userArgs, mintingDay, twitterIdByWallet);

        let userPoints: Map<string, number> = new Map();
        let totalEligibleUsers: number = 0;

        const mintingSettings = await minter.getMintingSettings();
        const perTweet = Number(mintingSettings.pointsPerPost);
        const perLike = Number(mintingSettings.pointsPerLike);
        const perHashtag = Number(mintingSettings.pointsPerHashtag);
        const perCashtag = Number(mintingSettings.pointsPerCashtag);
        const coinsMultiplicatorBigInt = BigInt(mintingSettings.coinsMultiplicator.toString());

        allUserTweetsByUsername.forEach((tweets, uid) => {
            let totalHashtagsCount = 0;
            let totalCashtagCount = 0;
            const calculateTotalPoints = (tweets: Tweet[]): number => {
                return tweets.reduce((totalPoints, tweet) => {
                    const gmCount = (tweet.text.match(/\bgm\b/gi) || []).length;
                    const hashtagGmCount = (tweet.text.match(/#gm\b/gi) || []).length;
                    const dollarGmCount = (tweet.text.match(/\$gm\b/gi) || []).length;

                    let pointsPerTweet = 0;
                    if (dollarGmCount > 0) {
                        totalCashtagCount++;

                        if (totalCashtagCount <= 10) {
                            pointsPerTweet = perCashtag;
                        }
                    } else if (hashtagGmCount > 0) {
                        totalHashtagsCount++;

                        if (totalHashtagsCount <= 10) {
                            pointsPerTweet = perHashtag;
                        }
                    } else if (gmCount > 0) {
                        pointsPerTweet = perTweet;
                    }

                    if (pointsPerTweet > 0) {
                        pointsPerTweet += tweet.likesCount * perLike;
                    }

                    return totalPoints + pointsPerTweet;
                }, 0);
            };

            let upoints = calculateTotalPoints(tweets);
            if (upoints > 0) {
                totalEligibleUsers++;
            }

            userPoints.set(uid, upoints);
        });

        for (const [twitterId, wallet] of walletByTwitterId) {
            const points = userPoints.get(`user${twitterId}`) || 0;
            const balance = await gmCoin.balanceOf(wallet as any);
            const expectedAmount = BigInt(points) * coinsMultiplicatorBigInt;

            expect(balance, `twitterId ${twitterId}`).to.be.equal(expectedAmount);
        }

        console.log('minting finished here!!');
        console.log('treasuryMintCount', treasuryMintCount);
        console.log('eligibleUsersCount', totalEligibleUsers);
        expect(userMintCount).to.be.equal(totalEligibleUsers);
        expect(treasuryMintCount).to.be.equal(totalEligibleUsers);
    });

    it('twitter-worker runningHash', async function () {
        const {
            accountManager,
            minter,
            gmCoin,
            treasury,
            owner,
            feeAddr,
            gelatoAddr,
            treasuryAddr,
            coinsMultiplicator
        } = await loadFixture(deployAllContracts);

        const gelatoAccountManager = accountManager.connect(gelatoAddr);

        const userLimit = 100;
        const concurrencyLimit = 5;

        const generatedWallets: HDNodeWallet[] = generateWallets(ethers.provider, userLimit);

        let walletByTwitterId: Map<string, string> = new Map();
        for (let i = 0; i < userLimit; i++) {
            const twitterId = String(i + 1);
            await gelatoAccountManager.createOrLinkUser(generatedWallets[i].address, BigInt(twitterId), 0);
            walletByTwitterId.set(twitterId, generatedWallets[i].address);
        }

        let allUserTweetsByUsername = generateUserTweetsMap(userLimit);

        let tweetMap: Map<string, Tweet> = new Map();
        for (let [userID, tweets] of allUserTweetsByUsername) {
            for (let tweet of tweets) {
                if (tweet.likesCount > 100) {
                    tweet.likesCount = 99;
                }
                tweetMap.set(tweet.tweet_id, tweet);
            }
        }

        mockServer.mockFunc('/Search', 'GET', (url: url.UrlWithParsedQuery) => {
            const q = url.query["q"] as string;
            const cursor = url.query["cursor"] as string;
            const usernamesList = extractUserIDs(q);

            const { filteredTweets, nextCursor } = filterUserTweets(allUserTweetsByUsername, usernamesList, cursor, 20);

            let response = generateResponse(filteredTweets, nextCursor, cursor == '');
            return response;
        });

        mockServer.mockFunc('/tweet-lookup/', 'GET', (url: url.UrlWithParsedQuery) => {
            const idList = url.query["ids"] as string;
            const tweetIDs = idList.split(',');

            const expansionFields = (url.query["tweet.fields"] as string).split(",");
            expect(expansionFields.indexOf("public_metrics")).to.be.greaterThan(-1);

            return generateResponseForTweetLookup(tweetMap, tweetIDs, 0);
        });

        mockServer.mockFunc('/UserResultsByRestIds', 'GET', (url: url.UrlWithParsedQuery) => {
            const idList = url.query["user_ids"] as string;
            const userIDs = idList.split(',');

            let response: { data: { users: Array<{ result: { core: { screen_name: string } }; rest_id: string }> } } = { data: { users: [] } };
            for (const userID of userIDs) {
                response.data.users.push({
                    result: {
                        core: {
                            screen_name: `user${userID}`
                        },
                    },
                    rest_id: userID,
                })
            }

            return response;
        });

        let savedTweets: any[] = [];
        mockServer.mockFunc('/SaveTweets', 'POST', (url: url.UrlWithParsedQuery, headers: IncomingHttpHeaders, body: any) => {
            const receivedJSON = typeof body === "string" ? JSON.parse(body) : body;
            const apiKey = headers.authorization;
            expect(apiKey?.indexOf('sN') === 0).to.be.true;

            expect(receivedJSON.mintingDayTimestamp).to.be.equal(mintingDay);
            savedTweets.push(...receivedJSON.tweets);

            return {
                success: true
            }
        });

        mockServer.mockFunc('/UploadTweetsToIPFS', 'POST', (url: url.UrlWithParsedQuery, headers: IncomingHttpHeaders, body: any) => {
            const receivedJSON = typeof body === "string" ? JSON.parse(body) : body;
            const apiKey = headers.authorization;
            expect(apiKey?.indexOf('sN') === 0).to.be.true;

            expect(receivedJSON.mintingDayTimestamp).to.be.equal(mintingDay);

            return {
                success: true
            }
        });

        const accountManagerAddress = await accountManager.getAddress();
        const minterAddress = await minter.getAddress();
        const gmCoinAddress = await gmCoin.getAddress();

        let today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const mintingDay = Math.floor(today.setDate(today.getDate() - 1) / 1000);

        const userArgs = {
            minterAddress: minterAddress,
            accountManagerAddress: accountManagerAddress,
            gmCoinAddress: gmCoinAddress,
            concurrencyLimit: concurrencyLimit,
            serverURLPrefix: 'http://localhost:8118/',
            tweetLookupURL: "http://localhost:8118/tweet-lookup/",
            twitterOptimizedServerHost: "http://localhost:8118",
        };

        const {
            userMintCount,
            treasuryMintCount,
            finalRunningHash
        } = await mintUntilEnd(minter, gmCoin, accountManager, gelatoAddr, treasuryAddr, userArgs, mintingDay);

        let runningHash = '';

        for (let i = 0; i < savedTweets.length; i++) {
            if (savedTweets[i].tweetContent.indexOf('gm') === -1) {
                continue;
            }
            runningHash = calculateRunningHash(runningHash, savedTweets[i]);
        }
        console.log('calculated runningHash', runningHash);

        expect(finalRunningHash).to.be.not.empty;
        expect(finalRunningHash).to.be.equal(runningHash);
    });
});

async function mintUntilEnd(
    minter: any,
    gmCoin: any,
    accountManager: any,
    gelatoAddr: HardhatEthersSigner,
    treasuryAddr: HardhatEthersSigner,
    userArgs: any,
    mintingDay: number,
    twitterIdByWallet?: Map<string, string>
): Promise<{
    userMintCount: number,
    treasuryMintCount: number,
    finalRunningHash: string
}> {
    const gelatoMinter = minter.connect(gelatoAddr);
    const minterAddress = await minter.getAddress();

    await gelatoMinter.startMinting();

    let overrideLog = MinterEvents.MintingProcessed(0, mintingDay, []);

    let hasLogsToProcess = true;
    let prevBatches: any = null;
    let actualStorage: any = {};

    let finalRunningHash = '';

    let mintedUserIDs: string[] = [];

    let userMintsLogsCount = 0;
    let treasuryMintingLogsCount = 0;
    while (hasLogsToProcess) {
        const oracleW3f: Web3FunctionHardhat = w3f.get("twitter-worker");
        let { result, storage } = await oracleW3f.run("onRun", {
            userArgs: userArgs,
            storage: actualStorage,
            log: overrideLog,
            secrets: {
                AWS_ACCESS_KEY_ID: "test",
                AWS_SECRET_ACCESS_KEY: "test",
                ENV: "local",
                TWITTER_BEARER: "test",
                TWITTER_OPTIMIZED_SERVER_KEY: "test",
                TWITTER_OPTIMIZED_SERVER_AUTH_HEADER_NAME: "x-test",
                SERVER_API_KEY: "sNtest",
            },
        });
        actualStorage = storage.storage;

        const errorMessage = "message" in result ? result.message : undefined;
        expect(result.canExec, errorMessage).to.equal(true);

        if (result.canExec) {
            expect(result.callData.length).to.be.greaterThan(0);

            hasLogsToProcess = false;
            for (let calldata of result.callData) {
                if (typeof calldata === "string") {
                    throw new Error("unexpected legacy callData format");
                }
                const tx = await gelatoAddr.sendTransaction({ to: calldata.to, data: calldata.data });
                const receipt = await tx.wait();
                if (!receipt) {
                    throw new Error("transaction receipt is null");
                }
                console.log('receipt.logs', receipt.logs.length);
                for (const log of receipt.logs) {
                    // Check GMCoin Transfer events
                    try {
                        const decodedLog = gmCoin.interface.parseLog(log);
                        if (decodedLog && decodedLog.name == "Transfer") {
                            if (decodedLog.args[0] != 0x0) {
                                continue;
                            }

                            if (decodedLog.args[1] == treasuryAddr.address) {
                                treasuryMintingLogsCount++;
                            } else {
                                const twitterId = twitterIdByWallet?.get(decodedLog.args[1]);
                                if (twitterId) {
                                    mintedUserIDs.push(twitterId);
                                }
                                userMintsLogsCount++;
                            }
                            continue;
                        }
                    } catch (e) {
                        // Not a GMCoin event
                    }

                    // Check Minter events
                    try {
                        const decodedLog = minter.interface.parseLog(log);
                        if (decodedLog == null) {
                            continue;
                        }

                        if (decodedLog.name == "MintingFinished") {
                            expect(decodedLog.args.mintingDayTimestamp).to.be.equal(mintingDay);
                            finalRunningHash = decodedLog.args.runningHash;
                            break;
                        }

                        if (decodedLog.name == "MintingProcessed") {
                            expect(decodedLog.args.mintingDayTimestamp).to.be.equal(mintingDay);

                            const isBatchesTheSame = isEqual(decodedLog.args.batches, prevBatches);
                            if (isBatchesTheSame) {
                                const batches = decodedLog.args.batches.map((result: any) => {
                                    return `{${result[0]}-${result[1]},${result[2]}}`
                                });

                                expect(isBatchesTheSame, `current batch and prev are equals: ${batches}`).to.be.false;
                            }

                            hasLogsToProcess = true;
                            prevBatches = decodedLog.args.batches;

                            overrideLog = log;
                        }
                    } catch (e) {
                        // Not a Minter event
                    }
                }
            }
        }
    }

    return {
        userMintCount: userMintsLogsCount,
        treasuryMintCount: treasuryMintingLogsCount,
        finalRunningHash: finalRunningHash
    };
}

type UserTweetsMap = Map<string, Tweet[]>;

interface Tweet {
    text: string;
    likesCount: number;
    author_id: string;
    tweet_id: string;
}

function generateWallets(provider: Provider, count: number = 1000): HDNodeWallet[] {
    const wallets: HDNodeWallet[] = [];

    for (let i = 0; i < count; i++) {
        const wallet = ethers.Wallet.createRandom();
        const connectedWallet = wallet.connect(provider);
        wallets.push(connectedWallet);
    }

    return wallets;
}

function calculateRunningHash(prevHash: string, tweet: any): string {
    const prevHashBytes = base64ToArrayBuffer(prevHash);
    const runningHashLength = prevHashBytes.length;
    const encodedTweet = stringToUint8Array(toTweetKey(tweet));
    const combinedArray = new Uint8Array(runningHashLength + encodedTweet.length);
    if (runningHashLength > 0) {
        combinedArray.set(prevHashBytes);
    }
    combinedArray.set(encodedTweet, runningHashLength);

    return arrayBufferToBase64(blake2b(combinedArray, undefined, 20));
}

function toTweetKey(tweet: any): string {
    return `${tweet.tweetID || tweet.tweet_id}`
}

function stringToUint8Array(str: string): Uint8Array {
    const encoder = new TextEncoder();
    return encoder.encode(str);
}

function arrayBufferToBase64(bytes: Uint8Array | ArrayBuffer): string {
    let binary = '';
    const byteArray = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    const len = byteArray.byteLength;

    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(byteArray[i]);
    }

    return btoa(binary);
}

function base64ToArrayBuffer(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

function generateUserTweetsMap(limit: number, testRulesOf10?: boolean): UserTweetsMap {
    const userTweets: UserTweetsMap = new Map();

    for (let userId = 1; userId <= limit; userId++) {
        const numberOfTweets = Math.floor(Math.random() * 5) + 1;
        const tweets: Tweet[] = [];

        for (let i = 0; i < numberOfTweets; i++) {
            const tweet: Tweet = {
                text: generateRandomTweetText(),
                likesCount: generateRandomLikes(),
                author_id: userId.toString(),
                tweet_id: `tweetId${userId}_${i}`,
            };
            tweets.push(tweet);
        }

        userTweets.set(`user${userId}`, tweets);
    }

    if (testRulesOf10) {
        userTweets.set(`user1`, generateTweets(1, [
            "#gm GM!",
            "#gmgmgm should not work",
            "#gm @someUser",
            "hello my sweet #GM",
            "#Gm people",
            "#gm is never going to stop",
            "#gm crypto will take over",
            "#gm #gm #gm",
            "#gm gm GM",
            "#gm",
            "#gm Sun!",
            "@user use hashtag #gm!",
            "#gm 11",
            "#gm 12"
        ]));

        userTweets.set(`user2`, generateTweets(2, [
            "$gm GM!",
            "$gmgmgm should not work",
            "$gm @someUser",
            "hello my sweet $GM",
            "$Gm people",
            "$gm is never going to stop",
            "$gm crypto will take over",
            "$gm #gm #gm",
            "$gm gm GM",
            "$gm",
            "$gm Sun!",
            "@user use cashtag $gm!",
            "$gm 11",
            "$gm 12"
        ]));
    }

    return userTweets;
}

function generateRandomLikes(): number {
    const isHighLikes = Math.random() < 0.05;
    return isHighLikes ? Math.floor(Math.random() * 100000) : Math.floor(Math.random() * 11);
}

function generateRandomTweetText(): string {
    const gmWords = ["gm", "#gm", "$gm"];
    const otherGmWords = ["alignment", "fragmental", "judgment", "biomagnetic"];
    const generalWords = [
        "hello world",
        "to the moon",
        "crypto is life",
        "stay positive",
        "just chilling",
        "time to grind",
        "what a beautiful day",
        "let's conquer today",
        "rise and shine",
    ];

    const includeGm = Math.random() < 0.7;
    const gmWord = includeGm ? gmWords.concat(otherGmWords)[Math.floor(Math.random() * (gmWords.length + otherGmWords.length))] : "";

    const tweetParts = [gmWord, generalWords[Math.floor(Math.random() * generalWords.length)]];
    return tweetParts.filter(Boolean).join(" ").trim();
}

function generateTweets(userId: number, texts: string[]): Tweet[] {
    let result: Tweet[] = [];
    for (let i = 0; i < texts.length; i++) {
        result.push({
            text: texts[i],
            likesCount: 10,
            author_id: `${userId}`,
            tweet_id: `tweetId${userId}_${i}`
        })
    }

    return result;
}

function filterUserTweets(
    userTweets: UserTweetsMap,
    usernamesList: string[],
    cursor: string,
    limit: number,
): { filteredTweets: UserTweetsMap; nextCursor: string } {
    const filteredTweets: UserTweetsMap = new Map();

    let startUsername = '';
    let startTi = 0;
    if (cursor != "") {
        const cursorParts = cursor.split(':');
        startUsername = cursorParts[1];
        startTi = parseInt(cursorParts[2]);
    }
    let afterCursor: boolean = cursor == '';
    let nextCursor = '';
    let tweetInserted: number = 0;
    for (let i = 0; i < usernamesList.length; i++) {
        const username = usernamesList[i];
        if (!afterCursor) {
            if (username == startUsername) {
                afterCursor = true;
            } else {
                continue;
            }
        }

        const tweets = userTweets.get(username) as Tweet[];
        if (!tweets) {
            continue;
        }

        let tweetsToInsert: Tweet[] = [];
        let ti: number = 0;
        for (; ti < tweets.length; ti++) {
            if (tweetInserted + (ti + 1) > limit) {
                break
            }
            if (startUsername != '' && username == startUsername) {
                if (ti >= startTi) {
                    tweetsToInsert.push(tweets[ti]);
                }
                continue;
            }
            tweetsToInsert.push(tweets[ti]);
        }

        if (tweetsToInsert.length > 0) {
            filteredTweets.set(username, tweetsToInsert);
            tweetInserted += tweetsToInsert.length;
        }

        if (tweetInserted == limit) {
            if (ti < tweets.length || i < usernamesList.length) {
                nextCursor = `cursor(${usernamesList[0]}-${usernamesList[usernamesList.length - 1]}):${username}:${ti}`
            }
            break;
        }
    }

    return { filteredTweets, nextCursor };
}

function extractUserIDs(query: string): string[] {
    const userIDs: string[] = [];
    const regex = /from:([^\s\)]+)/g;

    let match;
    while ((match = regex.exec(query)) !== null) {
        userIDs.push(match[1]);
    }

    return userIDs;
}

function generateResponseForTweetLookup(tweetMap: Map<string, Tweet>, tweetIDs: string[], likesDelta: number): any {
    let response: any = {
        "data": [],
        "includes": {
            "users": []
        }
    }

    let usersMap: Map<string, string> = new Map();
    for (const tweetID of tweetIDs) {
        const tweet = tweetMap.get(tweetID);
        if (!tweet) continue;
        let likesCount = tweet.likesCount - likesDelta;
        if (likesCount < 0) {
            likesCount = 0;
        }

        usersMap.set(tweet?.author_id as string, `user${tweet?.author_id}`);

        const res = {
            "id": `${tweetID}`,
            "text": `${tweet.text}`,
            "author_id": `${tweet.author_id}`,
            "public_metrics": {
                "like_count": likesCount,
            }
        };

        response.data.push(res);
    }

    for (const [userID, username] of usersMap) {
        response.includes.users.push({
            id: userID,
            username: username,
            name: `UserName ${userID}`
        })
    }

    return response;
}

function generateResponse(userTweets: Map<string, Tweet[]>, nextCursor: string, isFirstCursorReply: boolean): any {
    const randomString = (length: number) => Math.random().toString(36).substr(2, length);
    const randomNumber = (min: number, max: number) =>
        Math.floor(Math.random() * (max - min + 1)) + min;

    const resultTweets = [];

    resultTweets.push({
        content: {
            __typename: "TimelineTimelineModule",
            client_event_info: {
                "component": "user_module",
                "element": "module"
            },
            display_type: "Carousel",
            header: {},
            footer: {},
            items: {}
        }
    })

    for (const [username, tweets] of userTweets) {
        for (const tweet of tweets) {
            const tweetId = tweet.tweet_id;
            const userId = username.slice(4);
            const userScreenName = `${username}`;

            const tweetObject = {
                content: {
                    __typename: "TimelineTimelineItem",
                    client_event_info: {
                        component: "result",
                        details: {
                            timelines_details: {
                                controller_data: randomString(16),
                            },
                        },
                        element: "tweet",
                    },
                    content: {
                        __typename: "TimelineTweet",
                        highlights: {
                            text_highlights: [],
                        },
                        timeline_tweet_display_type: "Tweet",
                        tweet_results: {
                            rest_id: tweetId,
                            result: {
                                rest_id: tweetId,
                                __typename: "Tweet",
                                core: {
                                    user_results: {
                                        rest_id: username,
                                        result: {
                                            rest_id: username,
                                            __typename: "User",
                                            profile_bio: {
                                                description: "test description",
                                            },
                                            action_counts: {
                                                favorites_count: randomNumber(0, 10000),
                                            },
                                            avatar: {
                                                image_url: `https://randomuser.me/api/portraits/thumb/men/${randomNumber(
                                                    1,
                                                    99
                                                )}.jpg`,
                                            },
                                            banner: {
                                                image_url: `https://picsum.photos/1000/300?random=${username}`,
                                            },
                                            core: {
                                                created_at: new Date(
                                                    Date.now() -
                                                    randomNumber(1, 365) * 24 * 60 * 60 * 1000
                                                ).toUTCString(),
                                                name: userId,
                                                screen_name: userScreenName,
                                            },
                                        },
                                    },
                                },
                                legacy: {
                                    bookmark_count: 0,
                                    conversation_id_str: tweetId,
                                    created_at: new Date().toUTCString(),
                                    display_text_range: [0, tweet.text.length],
                                    favorite_count: tweet.likesCount,
                                    full_text: tweet.text,
                                    lang: "en",
                                    retweet_count: randomNumber(0, 100),
                                    user_id_str: username,
                                },
                            },
                        },
                    },
                },
                entry_id: `tweet-${tweetId}`,
                sort_index: randomString(12),
            };

            resultTweets.push(tweetObject);
        }
    }

    let response;
    if (isFirstCursorReply) {
        resultTweets.push({
            content: {
                cursor_type: "Bottom",
                value: nextCursor
            }
        })
        response = {
            data: {
                search_by_raw_query: {
                    id: `U2VhcmNoUXVlcnk6Z20gc2luY2U6${randomString(16)}`,
                    rest_id: `${randomString(20)}`,
                    search_timeline: {
                        id: `VGltZWxpbmU6DAB+${randomString(16)}`,
                        timeline: {
                            id: "LatestTabSrpProduct-Timeline",
                            instructions: [
                                {
                                    __typename: "TimelineAddEntries",
                                    entries: resultTweets,
                                },
                            ],
                        },
                    },
                },
            },
        };
    } else {
        response = {
            data: {
                search_by_raw_query: {
                    id: `U2VhcmNoUXVlcnk6Z20gc2luY2U6${randomString(16)}`,
                    rest_id: `${randomString(20)}`,
                    search_timeline: {
                        id: `VGltZWxpbmU6DAB+${randomString(16)}`,
                        timeline: {
                            id: "LatestTabSrpProduct-Timeline",
                            instructions: [
                                {
                                    __typename: "TimelineAddEntries",
                                    entries: resultTweets,
                                },
                                {
                                    entry: {
                                        content: {
                                            cursor_type: "Bottom",
                                            value: nextCursor
                                        }
                                    }
                                }
                            ],
                        },
                    },
                },
            },
        };
    }

    return response;
}

