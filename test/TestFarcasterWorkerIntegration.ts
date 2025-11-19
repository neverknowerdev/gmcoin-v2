import { expect } from "chai";
import hre from "hardhat";
import isEqual from 'lodash/isEqual';
import { Web3FunctionHardhat } from "@gelatonetwork/web3-functions-sdk/hardhat-plugin";
import { Provider, HDNodeWallet } from "ethers";
import { MockHttpServer } from './tools/mockServer';
import { deployAllContracts } from "./tools/deployContract";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import * as url from 'url';
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { IncomingHttpHeaders } from "http";
import { blake2b } from "blakejs";
import { MinterEvents } from './tools/helpers';

const { ethers, w3f } = hre;

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

        let allUserCastsByFid = generateUserCastsMap(userLimit);

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
            neynarFeedURL: 'http://localhost:8118/v2/farcaster/feed/',
        };

        const {
            userMintCount,
            treasuryMintCount,
            finalRunningHash,
            storageState,
            mintedAmountsByFid,
        } = await mintUntilEnd(minter, gmCoin, accountManager, gelatoAddr, treasuryAddr, userArgs, mintingDay, fidByWallet);

        const mintingSettings = await minter.getMintingSettings();
        const coinsMultiplicatorBigInt = BigInt(mintingSettings.coinsMultiplicator.toString());

        const mintedEntries = Array.from(mintedAmountsByFid.entries());
        console.log("mintedEntries.length", mintedEntries.length);
        const zeroEntries = mintedEntries.filter(([, amount]) => amount === 0n);
        console.log("zero minted entries sample", zeroEntries.slice(0, 5));
        console.log("first minted entries sample", mintedEntries.slice(0, 5));
        expect(mintedEntries.length).to.be.greaterThan(0, "no user mints recorded");

        for (const [fid, amount] of mintedEntries) {
            const wallet = walletByFid.get(fid);
            expect(wallet, `wallet for fid ${fid}`).to.exist;
            expect(amount, `mint amount for fid ${fid}`).to.be.greaterThan(0n);

            const onChainBalance = await gmCoin.balanceOf(wallet as any);
            expect(onChainBalance, `fid ${fid}`).to.equal(amount);

            const points = amount / coinsMultiplicatorBigInt;
            expect(points, `points for fid ${fid}`).to.be.greaterThan(0n);
            expect(points * coinsMultiplicatorBigInt).to.equal(amount);
        }

        const remainingKeys = Object.keys(storageState).filter(key => key.startsWith(`${mintingDay}`));
        console.log("remaining mintingDay keys", remainingKeys);
        const storedResultsRaw = storageState[`${mintingDay}_userResults`] || '[]';
        const storedResultsEntries: Array<[number, unknown]> = JSON.parse(storedResultsRaw);
        console.log("remaining storedResults entries", storedResultsEntries.length);
        expect(storedResultsEntries.length, "expected worker state to be cleared").to.equal(0);

        console.log('minting finished here!!');
        console.log('treasuryMintCount', treasuryMintCount);
        console.log('eligibleUsersCount', mintedEntries.length);
        expect(userMintCount).to.be.equal(mintedEntries.length);
        expect(treasuryMintCount).to.be.equal(mintedEntries.length);
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

        let savedCasts: Cast[] = [];
        mockServer.mockFunc('/SaveCasts', 'POST', (url: url.UrlWithParsedQuery, headers: IncomingHttpHeaders, body: any) => {
            const receivedJSON = typeof body === "string" ? JSON.parse(body) : body;
            const apiKey = headers.authorization;
            expect(apiKey?.indexOf('sN') === 0).to.be.true;

            expect(receivedJSON.mintingDayTimestamp).to.be.equal(mintingDay);
            savedCasts.push(...receivedJSON.casts);

            return {
                success: true
            }
        });

        mockServer.mockFunc('/UploadCastsToIPFS', 'POST', (url: url.UrlWithParsedQuery, headers: IncomingHttpHeaders, body: any) => {
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
            neynarFeedURL: 'http://localhost:8118/v2/farcaster/feed/',
        };

        const {
            userMintCount,
            treasuryMintCount,
            finalRunningHash,
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
    finalRunningHash: string,
    storageState: Record<string, string>,
    mintedAmountsByFid: Map<number, bigint>,
}> {
    const gelatoMinter = minter.connect(gelatoAddr);
    const minterAddress = await minter.getAddress();

    await gelatoMinter.startMinting();

    let overrideLog = MinterEvents.MintingProcessed(1, mintingDay, []); // Platform.Farcaster = 1

    let hasLogsToProcess = true;
    let prevBatches: any = null;
    let actualStorage: any = {};

    let finalRunningHash = '';
    let mintedAmountsByFid: Map<number, bigint> = new Map();

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
                                const fid = fidByWallet?.get(decodedLog.args[1]);
                                if (fid) {
                                    const amount = BigInt(decodedLog.args[2].toString());
                                    const prev = mintedAmountsByFid.get(fid) || 0n;
                                    mintedAmountsByFid.set(fid, prev + amount);
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
        finalRunningHash: finalRunningHash,
        storageState: actualStorage,
        mintedAmountsByFid,
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
    const castString = `${cast.castHash || cast.cast_hash}|${cast.fid}|${cast.castContent}|${cast.likesCount}`;
    const data = prevHash ? prevHash + castString : castString;
    return arrayBufferToHex(blake2b(stringToUint8Array(data), undefined, 32));
}

function toCastKey(cast: any): string {
    return `${cast.castHash || cast.cast_hash}`
}

function stringToUint8Array(str: string): Uint8Array {
    const encoder = new TextEncoder();
    return encoder.encode(str);
}

function arrayBufferToHex(bytes: Uint8Array | ArrayBuffer): string {
    const byteArray = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    return Array.from(byteArray, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function generateUserCastsMap(limit: number): UserCastsMap {
    const userCasts: UserCastsMap = new Map();

    for (let fid = 1; fid <= limit; fid++) {
        let text: string;
        if (fid % 3 === 0) {
            text = `$gm alpha drop user${fid}`;
        } else if (fid % 3 === 1) {
            text = `#gm rally by user${fid}`;
        } else {
            text = `gm from user${fid}`;
        }

        userCasts.set(fid, [createDeterministicCast(fid, 0, text, 5 + (fid % 5))]);
    }

    return userCasts;
}

function createDeterministicCast(fid: number, index: number, text: string, likes: number): Cast {
    const castDate = new Date();
    castDate.setDate(castDate.getDate() - 1);
    const hour = (fid + index) % 24;
    const minute = ((fid * 7) + index * 13) % 60;
    castDate.setHours(hour, minute, 0, 0);

    return {
        castContent: text,
        likesCount: likes,
        fid,
        cast_hash: `castHash${fid}_${index}`,
        timestamp: castDate.toISOString(),
    };
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

