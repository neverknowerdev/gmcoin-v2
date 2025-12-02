import { ethers } from "hardhat";
import { GelatoW3FManager } from "../typechain-types";
import { keccak256, toUtf8Bytes } from "ethers";

async function main() {
  const gelatoW3FManagerAddress = process.env.GELATO_W3F_MANAGER_ADDRESS;
  const accountManagerAddress = process.env.NEXT_PUBLIC_ACCOUNT_MANAGER_ADDRESS;
  const w3fHash = process.env.W3F_HASH || "QmcTRjxu2F4hyyVg4vsjGyDphYTCfhZjNBQeaveW6e1n2i"; // Default to the one just deployed

  if (!gelatoW3FManagerAddress) {
    console.error("❌ GELATO_W3F_MANAGER_ADDRESS not set in .env");
    process.exit(1);
  }

  if (!accountManagerAddress) {
    console.error("❌ NEXT_PUBLIC_ACCOUNT_MANAGER_ADDRESS not set in .env");
    process.exit(1);
  }

  const [deployer] = await ethers.getSigners();
  console.log("Creating Gelato task for Twitter Verification Authcode...");
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("Deployer:", deployer.address);
  console.log("GelatoW3FManager:", gelatoW3FManagerAddress);
  console.log("AccountManager:", accountManagerAddress);
  console.log("W3F Hash (IPFS CID):", w3fHash);
  console.log("");

  // Prepare userArgs
  const userArgs = {
    verifierContractAddress: accountManagerAddress,
  };
  const userArgsJson = JSON.stringify(userArgs);
  console.log("User Args:", userArgsJson);

  // Calculate argsHash (keccak256 of the userArgs JSON)
  const argsHash = keccak256(toUtf8Bytes(userArgsJson));
  console.log("Args Hash:", argsHash);
  console.log("");

  // Prepare event topics for VerifyTwitterByAuthCodeRequested event
  // Event: VerifyTwitterByAuthCodeRequested(address wallet, string authCode, string tweetID, uint256 twitterID)
  // Note: None of the parameters are indexed, so we only need the event signature
  const eventSignature = keccak256(
    toUtf8Bytes("VerifyTwitterByAuthCodeRequested(address,string,string,uint256)")
  );
  console.log("Event Signature:", eventSignature);

  // Topics array: [eventSignature]
  // The event trigger will listen to events from AccountManager contract
  // Note: The contract's createWeb3FunctionEvent uses address(this) which might need to be AccountManager
  // If events aren't being picked up, you may need to update the contract to use AccountManager address
  const topics: string[][] = [[eventSignature]];
  console.log("Topics:", JSON.stringify(topics, null, 2));
  console.log("");

  const GelatoW3FManagerFactory = await ethers.getContractFactory("GelatoW3FManager");
  const gelatoW3FManager = GelatoW3FManagerFactory.attach(gelatoW3FManagerAddress).connect(deployer) as GelatoW3FManager;

  // Check current task
  const config = await gelatoW3FManager.gelatoConfig();
  const currentTaskId = config.gelatoTaskId_twitterVerificationAuthcode;
  
  if (currentTaskId !== ethers.ZeroHash && currentTaskId !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
    console.log("⚠️  Task already exists:", currentTaskId);
    console.log("   It will be cancelled and replaced with the new one.");
    console.log("");
  }

  console.log("Creating task...");
  const tx = await gelatoW3FManager.createTwitterVerificationAuthcodeFunction(
    w3fHash,
    argsHash,
    topics
  );

  console.log("Transaction hash:", tx.hash);
  console.log("Waiting for confirmation...");
  const receipt = await tx.wait();
  console.log("✅ Task created successfully!");
  console.log("");

  // Get the new task ID
  const newConfig = await gelatoW3FManager.gelatoConfig();
  const newTaskId = newConfig.gelatoTaskId_twitterVerificationAuthcode;
  console.log("New Task ID:", newTaskId);
  console.log("🔗 View on Gelato: https://app.gelato.network/task/" + newTaskId);
  console.log("");

  console.log("✅ Twitter Verification Authcode task is now active!");
  console.log("   It will listen for VerifyTwitterByAuthCodeRequested events");
  console.log("   from AccountManager:", accountManagerAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

