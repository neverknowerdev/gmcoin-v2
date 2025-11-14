import { expect } from "chai";
import hre from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { Web3FunctionHardhat } from "@gelatonetwork/web3-functions-sdk/hardhat-plugin";
import { deployAllContracts } from "./tools/deployContract";
import { MinterEvents } from "./tools/helpers";

const { w3f } = hre;

describe("Farcaster Worker (v2)", function () {
    it("mints precomputed results and calls processMintingBatches/finishMinting", async function () {
        const {
            accountManager,
            minter,
            gmCoin,
            gelatoAddr,
            otherAcc1: userWallet,
        } = await loadFixture(deployAllContracts);

        const farcasterFid = 987654321n;
        await accountManager
            .connect(gelatoAddr)
            .createOrLinkUser(userWallet.address, 0, farcasterFid);

        const mintingDayTimestamp = 1_700_000_100;
        const userIndex = 0;

        const userResult = {
            userIndex,
            hashtagCasts: 2,
            cashtagCasts: 1,
            simpleCasts: 3,
            casts: 6,
            likes: 4,
        };

        const accountInfo = {
            fid: farcasterFid.toString(),
            userId: "1",
            primaryWallet: userWallet.address,
            username: "",
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
            [`${mintingDayTimestamp}_castOrder`]: "0",
            [`${mintingDayTimestamp}_castsToVerify`]: JSON.stringify([]),
        };

        const log = MinterEvents.MintingProcessed(1, mintingDayTimestamp, []);

        const oracleW3f: Web3FunctionHardhat = w3f.get("farcaster-worker");

        const { result } = await oracleW3f.run("onRun", {
            userArgs: {
                minterAddress: await minter.getAddress(),
                accountManagerAddress: await accountManager.getAddress(),
                gmCoinAddress: await gmCoin.getAddress(),
                concurrencyLimit: 1,
                serverURLPrefix: "https://api.example.com/",
                neynarFeedURL: "https://api.neynar.com/v2/farcaster/feed/",
            },
            log,
            storage: storageState,
            secrets: {
                AWS_ACCESS_KEY_ID: "test",
                AWS_SECRET_ACCESS_KEY: "test",
                ENV: "local",
                SERVER_API_KEY: "test",
                NEYNAR_API_KEY: "test",
            },
        });

        expect(result.canExec).to.equal(true);
        expect(result.callData).to.have.length(3);

        const gmCall = result.callData[0];
        const processCall = result.callData[1];
        const finishCall = result.callData[2];

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
            BigInt(userResult.simpleCasts) * pointsPerPost +
            BigInt(userResult.hashtagCasts) * pointsPerHashtag +
            BigInt(userResult.cashtagCasts) * pointsPerCashtag +
            BigInt(userResult.likes) * pointsPerLike;
        const expectedAmount = expectedPoints * coinsMultiplicator;
        expect(decodedMint[1][0]).to.equal(expectedAmount);

        const decodedProcess = minterInterface.decodeFunctionData(
            "processMintingBatches",
            processCall.data
        );
        expect(decodedProcess[0]).to.equal(1); // Platform.Farcaster
        expect(decodedProcess[1]).to.equal(expectedPoints);
        expect(decodedProcess[2]).to.equal(BigInt(mintingDayTimestamp));
        expect(decodedProcess[3]).to.deep.equal([]);

        const decodedFinish = minterInterface.decodeFunctionData(
            "finishMinting",
            finishCall.data
        );
        expect(decodedFinish[0]).to.equal(1); // Platform.Farcaster
        expect(decodedFinish[1]).to.equal(BigInt(mintingDayTimestamp));
    });
});

