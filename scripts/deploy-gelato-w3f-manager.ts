import { ethers } from "hardhat";
import { GelatoW3FManager } from "../typechain-types";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying GelatoW3FManager...");
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("Deployer:", deployer.address);
  console.log("");

  // Gelato Automate Task Creator address for Base Sepolia
  const gelatoAutomateTaskCreator = process.env.GELATO_AUTOMATE_TASK_CREATOR || 
    "0x527a819db1eb0e34426297b03bae11F2f8B3A19E"; // Base Sepolia default

  console.log("Gelato Automate Task Creator:", gelatoAutomateTaskCreator);
  console.log("");

  // Deploy contract directly (not upgradeable, so no proxy needed)
  const GelatoW3FManagerFactory = await ethers.getContractFactory("GMWeb3Functions");
  
  console.log("Deploying contract...");
  const contract = await GelatoW3FManagerFactory.deploy();
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();
  console.log("✅ GelatoW3FManager deployed:", contractAddress);
  
  // Initialize the contract
  console.log("Initializing contract...");
  const initTx = await contract.__GelatoWeb3Functions__init(
    deployer.address, // owner
    gelatoAutomateTaskCreator // gelatoAutomateTaskCreator
  );
  await initTx.wait();
  console.log("✅ Contract initialized");
  console.log("");

  // Attach and verify
  const gelatoW3FManager = GelatoW3FManagerFactory.attach(contractAddress) as GelatoW3FManager;
  
  // Verify owner
  const owner = await gelatoW3FManager.owner();
  console.log("✅ Owner:", owner);
  
  // Check config
  const config = await gelatoW3FManager.gelatoConfig();
  console.log("✅ Trusted Signer:", config.trustedSigner);
  console.log("");

  console.log("=== Deployment Summary ===");
  console.log("GelatoW3FManager:", contractAddress);
  console.log("");
  console.log("💡 Add this to your .env:");
  console.log(`GELATO_W3F_MANAGER_ADDRESS=${contractAddress}`);
  console.log("");
  console.log("Next step: Create the Gelato task:");
  console.log("  npx hardhat run scripts/create-gelato-task-twitter-authcode.ts --network baseSepolia");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
