import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { Web3FunctionResultV2 } from "@gelatonetwork/web3-functions-sdk";
import { Web3FunctionHardhat } from "@gelatonetwork/web3-functions-sdk/hardhat-plugin";
import { MockHttpServer } from "./tools/mockServer";
import { deployAllContracts } from "./tools/deployContract";
import { AccountManagerEvents } from "./tools/helpers";
import { UrlWithParsedQuery } from "url";
import { IncomingHttpHeaders } from "http";

const { w3f } = hre;

describe("Farcaster SIWE Verification (Gelato W3F)", function () {
  let mockServer: MockHttpServer;

  before(async function () {
    // Initialize and start the mock server
    // Note: The W3F currently uses hardcoded Farcaster API URLs.
    // For full testing with mocks, the W3F would need to be updated to accept
    // API URLs as configuration (similar to how Twitter verification accepts TWITTER_GET_TWEET_URL).
    // For now, this test structure is ready but may need W3F updates for complete mock testing.
    mockServer = new MockHttpServer(8119);
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

  it("should complete Farcaster SIWE verification successfully", async function () {
    const {
      accountManager,
      gelatoAddr,
      otherAcc1: userWallet,
    } = await loadFixture(deployAllContracts);

    const farcasterFid = 123456;
    const walletAddress = userWallet.address.toLowerCase();
    const neynarApiKey = "test-neynar-api-key";

    // TODO: Mock Farcaster API endpoints
    // The W3F currently uses hardcoded URLs:
    // - https://api.farcaster.xyz/fc/primary-address?fid={fid}&protocol=ethereum
    // - https://api.farcaster.xyz/fc/account-verifications?fid={fid}&platform=x
    // - https://api.neynar.com/v2/farcaster/user/bulk?fids={fid}&viewer_fid=1
    //
    // To enable full mock testing, the W3F should be updated to accept these URLs as secrets:
    // - FARCASTER_PRIMARY_ADDRESS_URL
    // - FARCASTER_ACCOUNT_VERIFICATIONS_URL
    // - NEYNAR_USER_BULK_URL
    //
    // For now, these mocks are set up but won't be called until W3F is updated.
    // The test structure validates the contract interaction flow.
    mockServer.mockFunc(
      "/fc/primary-address",
      "GET",
      (url: UrlWithParsedQuery, headers: IncomingHttpHeaders) => {
        expect(url.query.fid).to.equal(farcasterFid.toString());
        expect(url.query.protocol).to.equal("ethereum");
        return {
          result: {
            address: {
              address: walletAddress,
            },
          },
        };
      }
    );

    mockServer.mockFunc(
      "/fc/account-verifications",
      "GET",
      (url: UrlWithParsedQuery, headers: IncomingHttpHeaders) => {
        expect(url.query.fid).to.equal(farcasterFid.toString());
        expect(url.query.platform).to.equal("x");
        return {
          result: {
            verifications: [],
          },
        };
      }
    );

    const verifierAddress = await accountManager.getAddress();
    console.log(`Deployed AccountManager to ${verifierAddress}`);

    // Step 1: User requests Farcaster verification (simulating SIWE flow)
    // Note: The contract uses msg.sender as the wallet, so we pass the wallet address
    // but the event will emit with the actual sender address (which may have different casing)
    await expect(
      accountManager
        .connect(userWallet)
        .requestFarcasterVerification(farcasterFid, userWallet.address)
    )
      .to.emit(accountManager, "VerifyFarcasterRequested")
      .withArgs(farcasterFid, userWallet.address);

    // Step 2: Generate event log for VerifyFarcasterRequested
    // Use the actual wallet address from the signer (contract uses msg.sender)
    const log = AccountManagerEvents.VerifyFarcasterRequested(
      farcasterFid,
      userWallet.address
    );
    // Update log address to match the contract
    log.address = verifierAddress;

    console.log("Generated event log:", log);

    // Step 3: Get the web3-function
    let oracleW3f: Web3FunctionHardhat = w3f.get("farcaster-verification");

    // Step 4: Run the Gelato W3F
    // Pass mock server URLs via secrets for testing
    let { result } = await oracleW3f.run("onRun", {
      userArgs: {
        verifierContractAddress: verifierAddress,
      },
      log: log,
      secrets: {
        NEYNAR_API_KEY: neynarApiKey,
        FARCASTER_PRIMARY_ADDRESS_URL: `http://localhost:8119/fc/primary-address`,
        FARCASTER_ACCOUNT_VERIFICATIONS_URL: `http://localhost:8119/fc/account-verifications`,
        NEYNAR_USER_BULK_URL: `http://localhost:8119/v2/farcaster/user/bulk`,
      },
    });
    result = result as Web3FunctionResultV2;

    console.log("Gelato W3F result:", result);
    expect(result.canExec).to.equal(true);

    if (result.canExec && result.callData) {
      // Step 5: Execute the transaction (simulating Gelato execution)
      for (let calldata of result.callData) {
        const tx = await gelatoAddr.sendTransaction({
          to: calldata.to,
          data: calldata.data,
        });
        await tx.wait();
      }

      // Step 6: Query for FarcasterVerificationResult event
      const filter = accountManager.filters.FarcasterVerificationResult(
        farcasterFid,
        userWallet.address
      );
      const events = await accountManager.queryFilter(filter, -1);
      expect(events.length).to.be.greaterThan(0);

      const event = events[events.length - 1];
      console.log("Verification result event:", event);
      expect(event.args.isSuccess).to.be.true;
      expect(event.args.farcasterFid.toString()).to.equal(
        farcasterFid.toString()
      );
      expect(event.args.wallet.toLowerCase()).to.equal(
        userWallet.address.toLowerCase()
      );
      expect(event.args.errorMsg).to.equal("");

      // Step 7: Verify user is registered
      const resultUser = await accountManager.getUserByFarcasterFID(farcasterFid);
      expect(resultUser.primaryWallet.toLowerCase()).to.equal(
        userWallet.address.toLowerCase()
      );
      expect(resultUser.farcasterFid.toString()).to.equal(
        farcasterFid.toString()
      );
      expect(resultUser.twitterId.toString()).to.equal("0"); // No Twitter linked
    }
  });

  it("should handle wallet mismatch error", async function () {
    const {
      accountManager,
      gelatoAddr,
      otherAcc1: userWallet,
      otherAcc2: differentWallet,
    } = await loadFixture(deployAllContracts);

    const farcasterFid = 789012;
    const requestingWallet = userWallet.address.toLowerCase();
    const primaryWallet = differentWallet.address.toLowerCase(); // Different wallet
    const neynarApiKey = "test-neynar-api-key";

    // Mock Farcaster API - primary wallet endpoint (returns different wallet)
    mockServer.mockFunc(
      "/fc/primary-address",
      "GET",
      (url: UrlWithParsedQuery, headers: IncomingHttpHeaders) => {
        expect(url.query.fid).to.equal(farcasterFid.toString());
        return {
          result: {
            address: {
              address: primaryWallet,
            },
          },
        };
      }
    );

    const verifierAddress = await accountManager.getAddress();

    // User requests verification with wallet that doesn't match primary wallet
    await accountManager
      .connect(userWallet)
      .requestFarcasterVerification(farcasterFid, userWallet.address);

    const log = AccountManagerEvents.VerifyFarcasterRequested(
      farcasterFid,
      userWallet.address
    );
    log.address = verifierAddress;

    let oracleW3f: Web3FunctionHardhat = w3f.get("farcaster-verification");

    let { result } = await oracleW3f.run("onRun", {
      userArgs: {
        verifierContractAddress: verifierAddress,
      },
      log: log,
      secrets: {
        NEYNAR_API_KEY: neynarApiKey,
        FARCASTER_PRIMARY_ADDRESS_URL: `http://localhost:8119/fc/primary-address`,
        FARCASTER_ACCOUNT_VERIFICATIONS_URL: `http://localhost:8119/fc/account-verifications`,
        NEYNAR_USER_BULK_URL: `http://localhost:8119/v2/farcaster/user/bulk`,
      },
    });
    result = result as Web3FunctionResultV2;

    expect(result.canExec).to.equal(true);

    if (result.canExec && result.callData) {
      // Execute error transaction
      for (let calldata of result.callData) {
        const tx = await gelatoAddr.sendTransaction({
          to: calldata.to,
          data: calldata.data,
        });
        await tx.wait();
      }

      // Verify error event was emitted
      const filter = accountManager.filters.FarcasterVerificationResult(
        farcasterFid,
        userWallet.address
      );
      const events = await accountManager.queryFilter(filter, -1);
      expect(events.length).to.be.greaterThan(0);

      const event = events[events.length - 1];
      expect(event.args.isSuccess).to.be.false;
      expect(event.args.errorMsg).to.include("Wallet does not match");
      expect(event.args.farcasterFid.toString()).to.equal(
        farcasterFid.toString()
      );
      expect(event.args.wallet.toLowerCase()).to.equal(
        userWallet.address.toLowerCase()
      );
    }
  });

  it("should handle missing primary wallet error", async function () {
    const {
      accountManager,
      gelatoAddr,
      otherAcc1: userWallet,
    } = await loadFixture(deployAllContracts);

    const farcasterFid = 999999;
    const neynarApiKey = "test-neynar-api-key";

    // Mock Farcaster API - primary wallet endpoint (returns no wallet)
    mockServer.mockFunc(
      "/fc/primary-address",
      "GET",
      (url: UrlWithParsedQuery, headers: IncomingHttpHeaders) => {
        return {
          result: null, // No primary wallet
        };
      }
    );

    // Mock Neynar fallback - also returns no wallet
    mockServer.mockFunc(
      "/v2/farcaster/user/bulk",
      "GET",
      (url: UrlWithParsedQuery, headers: IncomingHttpHeaders) => {
        expect(headers["x-api-key"]).to.equal(neynarApiKey);
        expect(url.query.fids).to.equal(farcasterFid.toString());
        return {
          users: [
            {
              verifications: [],
            },
          ],
        };
      }
    );

    const verifierAddress = await accountManager.getAddress();

    await accountManager
      .connect(userWallet)
      .requestFarcasterVerification(farcasterFid, userWallet.address);

    const log = AccountManagerEvents.VerifyFarcasterRequested(
      farcasterFid,
      userWallet.address
    );
    log.address = verifierAddress;

    let oracleW3f: Web3FunctionHardhat = w3f.get("farcaster-verification");

    let { result } = await oracleW3f.run("onRun", {
      userArgs: {
        verifierContractAddress: verifierAddress,
      },
      log: log,
      secrets: {
        NEYNAR_API_KEY: neynarApiKey,
        FARCASTER_PRIMARY_ADDRESS_URL: `http://localhost:8119/fc/primary-address`,
        FARCASTER_ACCOUNT_VERIFICATIONS_URL: `http://localhost:8119/fc/account-verifications`,
        NEYNAR_USER_BULK_URL: `http://localhost:8119/v2/farcaster/user/bulk`,
      },
    });
    result = result as Web3FunctionResultV2;

    expect(result.canExec).to.equal(true);

    if (result.canExec && result.callData) {
      for (let calldata of result.callData) {
        const tx = await gelatoAddr.sendTransaction({
          to: calldata.to,
          data: calldata.data,
        });
        await tx.wait();
      }

      const filter = accountManager.filters.FarcasterVerificationResult(
        farcasterFid,
        userWallet.address
      );
      const events = await accountManager.queryFilter(filter, -1);
      expect(events.length).to.be.greaterThan(0);

      const event = events[events.length - 1];
      expect(event.args.isSuccess).to.be.false;
      expect(event.args.errorMsg).to.include("No primary wallet found");
    }
  });

  it("should link Twitter ID when Farcaster has Twitter verification", async function () {
    const {
      accountManager,
      gelatoAddr,
      otherAcc1: userWallet,
    } = await loadFixture(deployAllContracts);

    const farcasterFid = 456789;
    const twitterId = "1796129942104657921";
    const neynarApiKey = "test-neynar-api-key";

    // Mock primary wallet
    mockServer.mockFunc(
      "/fc/primary-address",
      "GET",
      (url: UrlWithParsedQuery, headers: IncomingHttpHeaders) => {
        return {
          result: {
            address: {
              address: userWallet.address,
            },
          },
        };
      }
    );

    // Mock Twitter verification linked to Farcaster
    mockServer.mockFunc(
      "/fc/account-verifications",
      "GET",
      (url: UrlWithParsedQuery, headers: IncomingHttpHeaders) => {
        expect(url.query.platform).to.equal("x");
        return {
          result: {
            verifications: [
              {
                platform: "x",
                platformId: twitterId,
                platformUsername: "testuser",
              },
            ],
          },
        };
      }
    );

    const verifierAddress = await accountManager.getAddress();

    await accountManager
      .connect(userWallet)
      .requestFarcasterVerification(farcasterFid, userWallet.address);

    const log = AccountManagerEvents.VerifyFarcasterRequested(
      farcasterFid,
      userWallet.address
    );
    log.address = verifierAddress;

    let oracleW3f: Web3FunctionHardhat = w3f.get("farcaster-verification");

    let { result } = await oracleW3f.run("onRun", {
      userArgs: {
        verifierContractAddress: verifierAddress,
      },
      log: log,
      secrets: {
        NEYNAR_API_KEY: neynarApiKey,
        FARCASTER_PRIMARY_ADDRESS_URL: `http://localhost:8119/fc/primary-address`,
        FARCASTER_ACCOUNT_VERIFICATIONS_URL: `http://localhost:8119/fc/account-verifications`,
        NEYNAR_USER_BULK_URL: `http://localhost:8119/v2/farcaster/user/bulk`,
      },
    });
    result = result as Web3FunctionResultV2;

    expect(result.canExec).to.equal(true);

    if (result.canExec && result.callData) {
      for (let calldata of result.callData) {
        const tx = await gelatoAddr.sendTransaction({
          to: calldata.to,
          data: calldata.data,
        });
        await tx.wait();
      }

      // Verify both Farcaster and Twitter are linked
      // First check via Farcaster FID
      const farcasterUser = await accountManager.getUserByFarcasterFID(
        farcasterFid
      );
      expect(farcasterUser.primaryWallet.toLowerCase()).to.equal(
        userWallet.address.toLowerCase()
      );
      expect(farcasterUser.twitterId.toString()).to.equal(twitterId);

      // Also verify via Twitter ID (only if Twitter ID is not empty)
      if (twitterId && twitterId !== "") {
        const twitterUser = await accountManager.getUserByTwitterID(twitterId);
        expect(twitterUser.primaryWallet.toLowerCase()).to.equal(
          userWallet.address.toLowerCase()
        );
        expect(twitterUser.farcasterFid.toString()).to.equal(
          farcasterFid.toString()
        );
      }
    }
  });

  it("should link Farcaster to existing user with Twitter", async function () {
    const {
      accountManager,
      gelatoAddr,
      otherAcc1: userWallet,
    } = await loadFixture(deployAllContracts);

    const twitterId = 123456789;
    const farcasterFid = 987654;
    const neynarApiKey = "test-neynar-api-key";

    // First, create a user with Twitter
    await accountManager
      .connect(gelatoAddr)
      .createOrLinkUser(userWallet.address, twitterId, 0);

    // Mock primary wallet
    mockServer.mockFunc(
      "/fc/primary-address",
      "GET",
      (url: UrlWithParsedQuery, headers: IncomingHttpHeaders) => {
        return {
          result: {
            address: {
              address: userWallet.address,
            },
          },
        };
      }
    );

    // Mock no Twitter verification
    mockServer.mockFunc(
      "/fc/account-verifications",
      "GET",
      (url: UrlWithParsedQuery, headers: IncomingHttpHeaders) => {
        return {
          result: {
            verifications: [],
          },
        };
      }
    );

    const verifierAddress = await accountManager.getAddress();

    // Request Farcaster verification
    await accountManager
      .connect(userWallet)
      .requestFarcasterVerification(farcasterFid, userWallet.address);

    const log = AccountManagerEvents.VerifyFarcasterRequested(
      farcasterFid,
      userWallet.address
    );
    log.address = verifierAddress;

    let oracleW3f: Web3FunctionHardhat = w3f.get("farcaster-verification");

    let { result } = await oracleW3f.run("onRun", {
      userArgs: {
        verifierContractAddress: verifierAddress,
      },
      log: log,
      secrets: {
        NEYNAR_API_KEY: neynarApiKey,
        FARCASTER_PRIMARY_ADDRESS_URL: `http://localhost:8119/fc/primary-address`,
        FARCASTER_ACCOUNT_VERIFICATIONS_URL: `http://localhost:8119/fc/account-verifications`,
        NEYNAR_USER_BULK_URL: `http://localhost:8119/v2/farcaster/user/bulk`,
      },
    });
    result = result as Web3FunctionResultV2;

    expect(result.canExec).to.equal(true);

    if (result.canExec && result.callData) {
      for (let calldata of result.callData) {
        const tx = await gelatoAddr.sendTransaction({
          to: calldata.to,
          data: calldata.data,
        });
        await tx.wait();
      }

      // Verify both accounts are linked
      const farcasterUser = await accountManager.getUserByFarcasterFID(
        farcasterFid
      );
      expect(farcasterUser.primaryWallet.toLowerCase()).to.equal(
        userWallet.address.toLowerCase()
      );
      expect(farcasterUser.twitterId.toString()).to.equal(twitterId.toString());

      const twitterUser = await accountManager.getUserByTwitterID(twitterId);
      expect(twitterUser.primaryWallet.toLowerCase()).to.equal(
        userWallet.address.toLowerCase()
      );
      expect(twitterUser.farcasterFid.toString()).to.equal(
        farcasterFid.toString()
      );
    }
  });
});

