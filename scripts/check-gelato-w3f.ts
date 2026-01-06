import { ethers } from "hardhat";
import { GelatoW3FManager } from "../typechain-types";

async function main() {
  const gelatoW3FManagerAddress = process.env.GELATO_W3F_MANAGER_ADDRESS;
  
  if (!gelatoW3FManagerAddress) {
    console.error("❌ GELATO_W3F_MANAGER_ADDRESS not set in .env");
    console.log("\n💡 Set it to your GelatoW3FManager contract address");
    process.exit(1);
  }

  const [deployer] = await ethers.getSigners();
  console.log("Checking Gelato W3F deployment status...");
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("Deployer:", deployer.address);
  console.log("GelatoW3FManager:", gelatoW3FManagerAddress);
  console.log("");

  const GelatoW3FManagerFactory = await ethers.getContractFactory("GelatoW3FManager");
  const gelatoW3FManager = GelatoW3FManagerFactory.attach(gelatoW3FManagerAddress).connect(deployer) as GelatoW3FManager;

  // Check Gelato config
  const config = await gelatoW3FManager.gelatoConfig();
  
  console.log("=== Gelato W3F Task Status ===");
  console.log("");

  // Twitter Verification Authcode
  const twitterAuthcodeTaskId = config.gelatoTaskId_twitterVerificationAuthcode;
  console.log("📱 Twitter Verification Authcode:");
  if (twitterAuthcodeTaskId === ethers.ZeroHash || twitterAuthcodeTaskId === "0x0000000000000000000000000000000000000000000000000000000000000000") {
    console.log("   ❌ Task NOT created (taskId is zero)");
    console.log("   💡 Call createTwitterVerificationAuthcodeFunction() to create the task");
  } else {
    console.log("   ✅ Task ID:", twitterAuthcodeTaskId);
    console.log("   🔗 Check on Gelato: https://app.gelato.network/task/" + twitterAuthcodeTaskId);
  }
  console.log("");

  // Twitter Verification
  const twitterVerificationTaskId = config.gelatoTaskId_twitterVerification;
  console.log("🐦 Twitter Verification:");
  if (twitterVerificationTaskId === ethers.ZeroHash || twitterVerificationTaskId === "0x0000000000000000000000000000000000000000000000000000000000000000") {
    console.log("   ❌ Task NOT created (taskId is zero)");
  } else {
    console.log("   ✅ Task ID:", twitterVerificationTaskId);
    console.log("   🔗 Check on Gelato: https://app.gelato.network/task/" + twitterVerificationTaskId);
  }
  console.log("");

  // Farcaster Verification
  const farcasterVerificationTaskId = config.gelatoTaskId_farcasterVerification;
  console.log("🔮 Farcaster Verification:");
  if (farcasterVerificationTaskId === ethers.ZeroHash || farcasterVerificationTaskId === "0x0000000000000000000000000000000000000000000000000000000000000000") {
    console.log("   ❌ Task NOT created (taskId is zero)");
  } else {
    console.log("   ✅ Task ID:", farcasterVerificationTaskId);
    console.log("   🔗 Check on Gelato: https://app.gelato.network/task/" + farcasterVerificationTaskId);
  }
  console.log("");

  // Twitter Worker
  const twitterWorkerTaskId = config.gelatoTaskId_twitterWorker;
  console.log("⚙️  Twitter Worker:");
  if (twitterWorkerTaskId === ethers.ZeroHash || twitterWorkerTaskId === "0x0000000000000000000000000000000000000000000000000000000000000000") {
    console.log("   ❌ Task NOT created (taskId is zero)");
  } else {
    console.log("   ✅ Task ID:", twitterWorkerTaskId);
    console.log("   🔗 Check on Gelato: https://app.gelato.network/task/" + twitterWorkerTaskId);
  }
  console.log("");

  // Farcaster Worker
  const farcasterWorkerTaskId = config.gelatoTaskId_farcasterWorker;
  console.log("⚙️  Farcaster Worker:");
  if (farcasterWorkerTaskId === ethers.ZeroHash || farcasterWorkerTaskId === "0x0000000000000000000000000000000000000000000000000000000000000000") {
    console.log("   ❌ Task NOT created (taskId is zero)");
  } else {
    console.log("   ✅ Task ID:", farcasterWorkerTaskId);
    console.log("   🔗 Check on Gelato: https://app.gelato.network/task/" + farcasterWorkerTaskId);
  }
  console.log("");

  console.log("=== Next Steps ===");
  console.log("");
  console.log("1. If tasks are NOT created, you need to:");
  console.log("   - Deploy your Web3Function to Gelato (using Gelato CLI or dashboard)");
  console.log("   - Get the W3F hash/IPFS CID");
  console.log("   - Call createTwitterVerificationAuthcodeFunction() with the hash");
  console.log("");
  console.log("2. To deploy Web3Function to Gelato:");
  console.log("   - Use Hardhat plugin (already configured):");
  console.log("   - Deploy: npx hardhat w3f-deploy twitter-verification-authcode");
  console.log("   - Or: npx hardhat w3f-deploy twitter-verification-authcode --network baseSepolia");
  console.log("   - Get the IPFS CID/hash from the output");
  console.log("   - Then call createTwitterVerificationAuthcodeFunction() with that hash");
  console.log("");
  console.log("3. Check Gelato Dashboard:");
  console.log("   - Go to: https://app.gelato.network/");
  console.log("   - Check 'Web3 Functions' section");
  console.log("   - Look for your deployed functions");
  console.log("   - Check execution logs for any errors");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

