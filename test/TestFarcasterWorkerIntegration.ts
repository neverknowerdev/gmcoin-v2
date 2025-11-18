import { expect } from "chai";
import hre from "hardhat";
import isEqual from 'lodash/isEqual';
import { ethers, w3f } from hre;
import {
    Web3FunctionUserArgs,
    Web3FunctionResultV2,
} from "@gelatonetwork/web3-functions-sdk";
import { Web3FunctionHardhat } from "@gelatonetwork/web3-functions-sdk/hardhat-plugin";
import { Provider, HDNodeWallet, EventLog, Contract } from "ethers";
import { MockHttpServer } from './tools/mockServer';
import { deployAllContracts } from "./tools/deployContract";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import * as url from 'url';
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { IncomingHttpHeaders } from "http";
import { blake2b } from "blakejs";
import { MinterEvents } from './tools/helpers';

describe("GelatoW3F Farcaster Worker Integration", function () {
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

    it('farcaster-worker success', async function () {
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

        let walletByFid: Map<number, string> = new Map();
        let fidByWallet: Map<string, number> = new Map();
        for (let i = 0; i < userLimit; i++) {
            const fid = i + 1;
            await gelatoAccountManager.createOrLinkUser(generatedWallets[i].address, 0, BigInt(fid));
            walletByFid.set(fid, generatedWallets[i].address);
            fidByWallet.set(generatedWallets[i].address, fid);
        }

        let allUserCastsByFid = generateUserCastsMap(userLimit, true);

        let castMap: Map<string, Cast> = new Map();
        for (let [fid, casts] of allUserCastsByFid) {
            for (let cast of casts) {
                castMap.set(cast.cast_hash, cast);
            }
        }

        let queryCount = 0;
        let queryErrorCount: Map<string, number> = new Map();
        mockServer.mockFunc('/v2/farcaster/feed/', 'GET', (url: url.UrlWithParsedQuery) => {
            queryCount++;

            const fids = (url.query["fids"] as string)?.split(',') || [];
            const cursor = url.query["cursor"] as string || '';

            const fidKey = fids.join(',');
            const alreadyErroredCount = queryErrorCount.get(fidKey) || 0;
            if (alreadyErroredCount < 2) {
                if (queryCount % 5 == 0) {
                    queryErrorCount.set(fidKey, alreadyErroredCount + 1);
                    throw new Error("some random error");
                }
            }

            const { filteredCasts, nextCursor } = filterUserCasts(allUserCastsByFid, fids.map(f => parseInt(f)), cursor, 100);

            let response = generateNeynarResponse(filteredCasts, nextCursor);
            return response;
        });

        mockServer.mock('/SaveCasts', 'POST', { success: true });

        mockServer.mockFunc('/UploadCastsToIPFS', 'POST', (url: url.UrlWithParsedQuery, headers: IncomingHttpHeaders, body: any) => {
            const receivedJSON = JSON.parse(body);
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
            neynarFeedURL: 'http://localhost:8118/v2/farcaster/feed/',
        };

        const {
            userMintCount,
            treasuryMintCount,
            finalRunningHash
        } = await mintUntilEnd(minter, gmCoin, accountManager, gelatoAddr, treasuryAddr, userArgs, mintingDay, fidByWallet);

        let userPoints: Map<number, number> = new Map();
        let totalEligibleUsers: number = 0;

        const mintingSettings = await minter.getMintingSettings();
        const perPost = Number(mintingSettings.pointsPerPost);
        const perLike = Number(mintingSettings.pointsPerLike);
        const perHashtag = Number(mintingSettings.pointsPerHashtag);
        const perCashtag = Number(mintingSettings.pointsPerCashtag);

        allUserCastsByFid.forEach((casts, fid) => {
            let totalHashtagsCount = 0;
            let totalCashtagCount = 0;
            const calculateTotalPoints = (casts: Cast[]): number => {
                return casts.reduce((totalPoints, cast) => {
                    const gmCount = (cast.castContent.match(/\bgm\b/gi) || []).length;
                    const hashtagGmCount = (cast.castContent.match(/#gm\b/gi) || []).length;
                    const dollarGmCount = (cast.castContent.match(/\$gm\b/gi) || []).length;

                    let pointsPerCast = 0;
                    if (dollarGmCount > 0) {
                        totalCashtagCount++;

                        if (totalCashtagCount <= 10) {
                            pointsPerCast = perCashtag;
                        }
                    } else if (hashtagGmCount > 0) {
                        totalHashtagsCount++;

                        if (totalHashtagsCount <= 10) {
                            pointsPerCast = perHashtag;
                        }
                    } else if (gmCount > 0) {
                        pointsPerCast = perPost;
                    }

                    if (pointsPerCast > 0) {
                        pointsPerCast += cast.likesCount * perLike;
                    }

                    return totalPoints + pointsPerCast;
                }, 0);
            };

            let upoints = calculateTotalPoints(casts);
            if (upoints > 0) {
                totalEligibleUsers++;
            }

            userPoints.set(fid, upoints);
        });

        for (const [fid, wallet] of walletByFid) {
            const points = userPoints.get(fid) || 0;
            const balance = await gmCoin.balanceOf(wallet as any);
            const coinsMultiplicatorBigInt = BigInt(coinsMultiplicator);
            const actualPoints = balance / coinsMultiplicatorBigInt / 10n ** 18n;

            const expectedPoints = points;

            expect(actualPoints, `fid ${fid}`).to.be.equal(BigInt(expectedPoints));
        }

        console.log('minting finished here!!');
        console.log('treasuryMintCount', treasuryMintCount);
        console.log('eligibleUsersCount', totalEligibleUsers);
        expect(userMintCount).to.be.equal(totalEligibleUsers);
        expect(treasuryMintCount).to.be.equal(totalEligibleUsers);
    });

    it('farcaster-worker runningHash', async function () {
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

        let walletByFid: Map<number, string> = new Map();
        for (let i = 0; i < userLimit; i++) {
            const fid = i + 1;
            await gelatoAccountManager.createOrLinkUser(generatedWallets[i].address, 0, BigInt(fid));
            walletByFid.set(fid, generatedWallets[i].address);
        }

        let allUserCastsByFid = generateUserCastsMap(userLimit);

        let castMap: Map<string, Cast> = new Map();
        for (let [fid, casts] of allUserCastsByFid) {
            for (let cast of casts) {
                if (cast.likesCount > 100) {
                    cast.likesCount = 99;
                }
                castMap.set(cast.cast_hash, cast);
            }
        }

        mockServer.mockFunc('/v2/farcaster/feed/', 'GET', (url: url.UrlWithParsedQuery) => {
            const fids = (url.query["fids"] as string)?.split(',') || [];
            const cursor = url.query["cursor"] as string || '';

            const { filteredCasts, nextCursor } = filterUserCasts(allUserCastsByFid, fids.map(f => parseInt(f)), cursor, 100);

            let response = generateNeynarResponse(filteredCasts, nextCursor);
            return response;
        });

        let savedCasts = [];
        mockServer.mockFunc('/SaveCasts', 'POST', (url: url.UrlWithParsedQuery, headers: IncomingHttpHeaders, body: any) => {
            const receivedJSON = JSON.parse(body);
            const apiKey = headers.authorization;
            expect(apiKey?.indexOf('sN') === 0).to.be.true;

            expect(receivedJSON.mintingDayTimestamp).to.be.equal(mintingDay);
            savedCasts.push(...receivedJSON.casts);

            return {
                success: true
            }
        });

        mockServer.mockFunc('/UploadCastsToIPFS', 'POST', (url: url.UrlWithParsedQuery, headers: IncomingHttpHeaders, body: any) => {
            const receivedJSON = JSON.parse(body);
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
            neynarFeedURL: 'http://localhost:8118/v2/farcaster/feed/',
        };

        const {
            userMintCount,
            treasuryMintCount,
            finalRunningHash
        } = await mintUntilEnd(minter, gmCoin, accountManager, gelatoAddr, treasuryAddr, userArgs, mintingDay);

        let runningHash = '';

        for (let i = 0; i < savedCasts.length; i++) {
            if (savedCasts[i].castContent.indexOf('gm') === -1) {
                continue;
            }
            runningHash = calculateRunningHash(runningHash, savedCasts[i]);
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
    fidByWallet?: Map<string, number>
): Promise<{
    userMintCount: number,
    treasuryMintCount: number,
    finalRunningHash: string
}> {
    const gelatoMinter = minter.connect(gelatoAddr);
    const minterAddress = await minter.getAddress();

    await gelatoMinter.startMinting();

    let overrideLog = MinterEvents.MintingProcessed(1, mintingDay, []); // Platform.Farcaster = 1

    let hasLogsToProcess = true;
    let prevBatches: any = null;
    let actualStorage: any = {};

    let finalRunningHash = '';

    let mintedFIDs: number[] = [];

    let userMintsLogsCount = 0;
    let treasuryMintingLogsCount = 0;
    while (hasLogsToProcess) {
        const oracleW3f: Web3FunctionHardhat = w3f.get("farcaster-worker");
        let { result, storage } = await oracleW3f.run("onRun", {
            userArgs: userArgs,
            storage: actualStorage,
            log: overrideLog,
            secrets: {
                AWS_ACCESS_KEY_ID: "test",
                AWS_SECRET_ACCESS_KEY: "test",
                ENV: "local",
                NEYNAR_API_KEY: "test",
                SERVER_API_KEY: "sNtest",
            },
        });
        actualStorage = storage.storage;

        expect(result.canExec, result.message).to.equal(true);

        if (result.canExec) {
            expect(result.callData.length).to.be.greaterThan(0);

            hasLogsToProcess = false;
            for (let calldata of result.callData) {
                const tx = await gelatoAddr.sendTransaction({ to: calldata.to, data: calldata.data });
                const receipt = await tx.wait();
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
                                const fid = fidByWallet?.get(decodedLog.args[1]);
                                if (fid) {
                                    mintedFIDs.push(fid);
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

type UserCastsMap = Map<number, Cast[]>;

interface Cast {
    castContent: string;
    likesCount: number;
    fid: number;
    cast_hash: string;
    timestamp: string;
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

function calculateRunningHash(prevHash: string, cast: any): string {
    const prevHashBytes = base64ToArrayBuffer(prevHash);
    const runningHashLength = prevHashBytes.length;
    const encodedCast = stringToUint8Array(toCastKey(cast));
    const combinedArray = new Uint8Array(runningHashLength + encodedCast.length);
    if (runningHashLength > 0) {
        combinedArray.set(prevHashBytes);
    }
    combinedArray.set(encodedCast, runningHashLength);

    return arrayBufferToBase64(blake2b(combinedArray, undefined, 20));
}

function toCastKey(cast: any): string {
    return `${cast.castHash || cast.cast_hash}`
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

function generateUserCastsMap(limit: number, testRulesOf10?: boolean): UserCastsMap {
    const userCasts: UserCastsMap = new Map();

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    for (let fid = 1; fid <= limit; fid++) {
        const numberOfCasts = Math.floor(Math.random() * 5) + 1;
        const casts: Cast[] = [];

        for (let i = 0; i < numberOfCasts; i++) {
            const castDate = new Date(yesterday);
            castDate.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), 0, 0);

            const cast: Cast = {
                castContent: generateRandomCastText(),
                likesCount: generateRandomLikes(),
                fid: fid,
                cast_hash: `castHash${fid}_${i}`,
                timestamp: castDate.toISOString(),
            };
            casts.push(cast);
        }

        userCasts.set(fid, casts);
    }

    if (testRulesOf10) {
        userCasts.set(1, generateCasts(1, [
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

        userCasts.set(2, generateCasts(2, [
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

    return userCasts;
}

function generateRandomLikes(): number {
    const isHighLikes = Math.random() < 0.05;
    return isHighLikes ? Math.floor(Math.random() * 100000) : Math.floor(Math.random() * 11);
}

function generateRandomCastText(): string {
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

    const castParts = [gmWord, generalWords[Math.floor(Math.random() * generalWords.length)]];
    return castParts.filter(Boolean).join(" ").trim();
}

function generateCasts(fid: number, texts: string[]): Cast[] {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    let result: Cast[] = [];
    for (let i = 0; i < texts.length; i++) {
        const castDate = new Date(yesterday);
        castDate.setHours(Math.floor(i / 10), (i % 10) * 6, 0, 0);

        result.push({
            castContent: texts[i],
            likesCount: 10,
            fid: fid,
            cast_hash: `castHash${fid}_${i}`,
            timestamp: castDate.toISOString(),
        })
    }

    return result;
}

function filterUserCasts(
    userCasts: UserCastsMap,
    fids: number[],
    cursor: string,
    limit: number,
): { filteredCasts: Cast[]; nextCursor: string } {
    const filteredCasts: Cast[] = [];
    let castCount = 0;
    let nextCursor = '';

    for (const fid of fids) {
        const casts = userCasts.get(fid);
        if (!casts) continue;

        for (const cast of casts) {
            if (castCount >= limit) {
                nextCursor = `cursor_${fid}_${cast.cast_hash}`;
                break;
            }
            filteredCasts.push(cast);
            castCount++;
        }

        if (castCount >= limit) break;
    }

    return { filteredCasts, nextCursor };
}

function generateNeynarResponse(casts: Cast[], nextCursor: string): any {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    return {
        casts: casts.map(cast => ({
            hash: cast.cast_hash,
            text: cast.castContent,
            timestamp: cast.timestamp,
            author: {
                fid: cast.fid,
                username: `user${cast.fid}`,
                display_name: `User ${cast.fid}`,
                pfp_url: `https://example.com/pfp/${cast.fid}.jpg`,
                profile: {
                    bio: {
                        text: `Bio for user ${cast.fid}`
                    }
                }
            },
            reactions: {
                likes_count: cast.likesCount,
                recasts_count: 0,
                likes: [],
                recasts: []
            },
            replies: {
                count: 0
            }
        })),
        next_cursor: nextCursor || undefined
    };
}

