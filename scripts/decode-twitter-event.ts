import { ethers } from "hardhat";
import { Interface } from "ethers";

async function main() {
  // Event signature: VerifyTwitterByAuthCodeRequested(address,string,string,uint256)
  const eventSignature = "VerifyTwitterByAuthCodeRequested(address,string,string,uint256)";
  const iface = new Interface([`event ${eventSignature}`]);
  
  // Transaction hash from the logs - pass as environment variable
  const txHash = process.env.TX_HASH || "0x4891353ad7af211c0b8f91e6cbd8c00778a1a15b3527f3c67aaf2a6a3d96dccb";
  
  console.log("Decoding transaction:", txHash);
  
  const provider = ethers.provider;
  const receipt = await provider.getTransactionReceipt(txHash);
  
  if (!receipt) {
    console.error("Transaction not found");
    return;
  }
  
  console.log("\n=== Transaction Details ===");
  console.log("Block:", receipt.blockNumber);
  console.log("From:", receipt.from);
  console.log("To:", receipt.to);
  console.log("Status:", receipt.status === 1 ? "Success ✅" : "Failed ❌");
  
  // Find VerifyTwitterByAuthCodeRequested events
  const events = receipt.logs
    .map((log) => {
      try {
        const parsed = iface.parseLog(log);
        return parsed;
      } catch {
        return null;
      }
    })
    .filter((e) => e !== null);
  
  if (events.length > 0) {
    console.log("\n=== VerifyTwitterByAuthCodeRequested Event ===");
    events.forEach((event, i) => {
      console.log(`Event ${i + 1}:`);
      console.log("  Wallet:", event.args.wallet);
      console.log("  Auth Code:", event.args.authCode);
      console.log("  Tweet ID:", event.args.tweetID);
      console.log("  Twitter ID:", event.args.twitterID.toString());
    });
  } else {
    console.log("\n⚠️  No VerifyTwitterByAuthCodeRequested events found");
  }
  
  // Check for TwitterVerificationResult events
  const resultIface = new Interface([
    "event TwitterVerificationResult(uint256 twitterID, address indexed wallet, bool isSuccess, string errorMsg)"
  ]);
  
  const resultEvents = receipt.logs
    .map((log) => {
      try {
        const parsed = resultIface.parseLog(log);
        return parsed;
      } catch {
        return null;
      }
    })
    .filter((e) => e !== null);
  
  if (resultEvents.length > 0) {
    console.log("\n=== TwitterVerificationResult Event ===");
    resultEvents.forEach((event, i) => {
      console.log(`Result ${i + 1}:`);
      console.log("  Twitter ID:", event.args.twitterID.toString());
      console.log("  Wallet:", event.args.wallet);
      console.log("  Success:", event.args.isSuccess ? "✅ Yes" : "❌ No");
      console.log("  Error:", event.args.errorMsg || "None");
    });
  } else {
    console.log("\n⚠️  No TwitterVerificationResult events found yet");
    console.log("   This means Gelato hasn't processed the verification yet.");
    console.log("   Check back in a few minutes or check Gelato dashboard.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

