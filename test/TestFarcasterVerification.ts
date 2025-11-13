import { expect } from "chai";
import { ethers } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { deployAllContracts } from "./tools/deployContract";

describe("FarcasterVerification", function () {
  const SAMPLE_FID_1 = 123456;
  const SAMPLE_FID_2 = 789012;

  it("should allow users to request Farcaster verification", async function () {
    const { accountManager, otherAcc1: user1 } = await loadFixture(deployAllContracts);

    // User requests Farcaster verification
    await expect(
      accountManager.connect(user1).requestFarcasterVerification(SAMPLE_FID_1, user1.address)
    ).to.emit(accountManager, "VerifyFarcasterRequested")
      .withArgs(SAMPLE_FID_1, user1.address);
  });

  it("should complete Farcaster verification when called by Gelato", async function () {
    const { accountManager, gelatoAddr, otherAcc1: user1 } = await loadFixture(deployAllContracts);

    // Gelato completes verification by calling createOrLinkUser
    await expect(
      accountManager.connect(gelatoAddr).createOrLinkUser(user1.address, 0, SAMPLE_FID_1)
    ).to.emit(accountManager, "FarcasterVerificationResult")
      .withArgs(SAMPLE_FID_1, user1.address, true, '');

    // Verify user is registered by querying events
    const filter = accountManager.filters.FarcasterVerificationResult(SAMPLE_FID_1, user1.address);
    const events = await accountManager.queryFilter(filter, -1);
    expect(events.length).to.be.greaterThan(0);

    const event = events[events.length - 1];
    expect(event.args.isSuccess).to.be.true;
    expect(event.args.farcasterFid.toString()).to.equal(SAMPLE_FID_1.toString());
    expect(event.args.wallet).to.equal(user1.address);

    let resultUser = await accountManager.getUserByFarcasterFID(SAMPLE_FID_1);
    expect(resultUser.primaryWallet).to.equal(user1.address);
    expect(resultUser.farcasterFid.toString()).to.equal(SAMPLE_FID_1.toString());
  });

  it("should handle verification errors", async function () {
    const { accountManager, gelatoAddr, otherAcc1: user1 } = await loadFixture(deployAllContracts);

    await expect(
      accountManager.connect(gelatoAddr).farcasterVerificationError(
        SAMPLE_FID_1,
        user1.address,
        "Wallet mismatch"
      )
    ).to.emit(accountManager, "FarcasterVerificationResult")
      .withArgs(SAMPLE_FID_1, user1.address, false, "Wallet mismatch");
  });

  it("should link Farcaster account to existing user", async function () {
    const { accountManager, gelatoAddr, otherAcc1: user1 } = await loadFixture(deployAllContracts);

    // First create a user with Twitter
    const twitterId = 123456789;
    await accountManager.connect(gelatoAddr).createOrLinkUser(user1.address, twitterId, 0);

    // Then link Farcaster account
    await expect(
      accountManager.connect(gelatoAddr).createOrLinkUser(user1.address, 0, SAMPLE_FID_1)
    ).to.emit(accountManager, "FarcasterVerificationResult")
      .withArgs(SAMPLE_FID_1, user1.address, true, '');

    // Verify both accounts are linked by checking Twitter user
    const user = await accountManager.getUserByTwitterID(twitterId);
    expect(user.primaryWallet).to.equal(user1.address);
    expect(user.farcasterFid.toString()).to.equal(SAMPLE_FID_1.toString());

    let resultUser = await accountManager.getUserByFarcasterFID(SAMPLE_FID_1);
    expect(resultUser.primaryWallet).to.equal(user1.address);
    expect(resultUser.twitterId.toString()).to.equal(twitterId.toString());
  });
});
