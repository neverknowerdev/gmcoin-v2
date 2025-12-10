import { ethers } from "hardhat";
import { writeFileSync } from "fs";
import { join } from "path";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Network:", (await ethers.provider.getNetwork()).name);
    console.log("Deploying contracts with the account:", deployer.address);

    // Get configuration from environment variables
    const owner = process.env.GMCOIN_OWNER ?? deployer.address;
    const feeAddress = process.env.GMCOIN_FEE_ADDRESS ?? deployer.address;
    const treasuryAddress = process.env.GMCOIN_TREASURY_ADDRESS ?? deployer.address;
    const coinsMultiplicator = Number(process.env.GMCOIN_COINS_MULTIPLICATOR ?? "300");
    const epochDays = Number(process.env.GMCOIN_EPOCH_DAYS ?? "30");
    const timeDelay = Number(process.env.GMCOIN_TIME_DELAY ?? "0");
    
    // W3F Manager address - constant, already deployed by user
    const w3fManagerAddress = process.env.W3F_MANAGER_ADDRESS;
    const w3fDedicatedMsgSender = process.env.W3F_DEDICATED_MSG_SENDER;
    
    if (!w3fManagerAddress || !w3fDedicatedMsgSender) {
        throw new Error("W3F_MANAGER_ADDRESS and W3F_DEDICATED_MSG_SENDER must be set");
    }
    
    if (!Number.isFinite(coinsMultiplicator) || !Number.isFinite(epochDays) || !Number.isFinite(timeDelay)) {
        throw new Error("Invalid numeric env values for GMCOIN_COINS_MULTIPLICATOR, GMCOIN_EPOCH_DAYS, or GMCOIN_TIME_DELAY");
    }

    console.log("Configuration:");
    console.log("  Owner:", owner);
    console.log("  Fee Address:", feeAddress);
    console.log("  Treasury Address:", treasuryAddress);
    console.log("  Coins Multiplicator:", coinsMultiplicator);
    console.log("  Epoch Days:", epochDays);
    console.log("  Time Delay:", timeDelay);
    console.log("  W3F Manager Address:", w3fManagerAddress);
    console.log("  W3F Dedicated Msg Sender:", w3fDedicatedMsgSender);

    const deploymentInfo: any = {
        network: (await ethers.provider.getNetwork()).name,
        deployedAt: new Date().toISOString(),
        deployer: deployer.address,
    };

    // 1. Deploy AccountManager
    console.log("\n=== Deploying AccountManager ===");
    const AccountManagerFactory = await ethers.getContractFactory("AccountManager");
    const accountManagerImpl = await AccountManagerFactory.deploy();
    await accountManagerImpl.waitForDeployment();
    const accountManagerImplAddress = await accountManagerImpl.getAddress();
    console.log("AccountManager implementation deployed:", accountManagerImplAddress);

    const accountManagerInitData = AccountManagerFactory.interface.encodeFunctionData("initialize", [
        w3fDedicatedMsgSender,
        timeDelay,
    ]);

    const GMAccountManagerFactory = await ethers.getContractFactory("GMAccountManager");
    const accountManagerProxy = await GMAccountManagerFactory.deploy(
        accountManagerImplAddress,
        accountManagerInitData
    );
    await accountManagerProxy.waitForDeployment();
    const accountManagerAddress = await accountManagerProxy.getAddress();
    console.log("AccountManager proxy deployed:", accountManagerAddress);
    deploymentInfo.accountManagerAddress = accountManagerAddress;
    deploymentInfo.accountManagerImplAddress = accountManagerImplAddress;

    // 2. Deploy Minter
    console.log("\n=== Deploying Minter ===");
    // coinsPerPost calculation - based on multiplicator, we'll use 100 as default
    const coinsPerPost = 100;
    const MinterFactory = await ethers.getContractFactory("Minter");
    const minterImpl = await MinterFactory.deploy();
    await minterImpl.waitForDeployment();
    const minterImplAddress = await minterImpl.getAddress();
    console.log("Minter implementation deployed:", minterImplAddress);

    const minterInitData = MinterFactory.interface.encodeFunctionData("initialize", [
        coinsPerPost,
        w3fDedicatedMsgSender,
        epochDays,
    ]);

    const GMMinterFactory = await ethers.getContractFactory("GMMinter");
    const minterProxy = await GMMinterFactory.deploy(
        minterImplAddress,
        minterInitData
    );
    await minterProxy.waitForDeployment();
    const minterAddress = await minterProxy.getAddress();
    console.log("Minter proxy deployed:", minterAddress);
    deploymentInfo.minterAddress = minterAddress;
    deploymentInfo.minterImplAddress = minterImplAddress;

    // 3. Deploy GMCoin
    console.log("\n=== Deploying GMCoin ===");
    const GMCoinFactory = await ethers.getContractFactory("GMCoinImplementation");
    const GMProxyFactory = await ethers.getContractFactory("GMCoin");
    
    const gmCoinInitData = GMCoinFactory.interface.encodeFunctionData("initialize", [
        owner,
        feeAddress,
        treasuryAddress,
        coinsMultiplicator,
        epochDays,
        w3fDedicatedMsgSender,
        timeDelay,
    ]);

    const gmCoinImpl = await GMCoinFactory.deploy();
    await gmCoinImpl.waitForDeployment();
    const gmCoinImplAddress = await gmCoinImpl.getAddress();
    console.log("GMCoin implementation deployed:", gmCoinImplAddress);

    const gmCoinProxy = await GMProxyFactory.deploy(gmCoinImplAddress, gmCoinInitData);
    await gmCoinProxy.waitForDeployment();
    const gmCoinAddress = await gmCoinProxy.getAddress();
    console.log("GMCoin proxy deployed:", gmCoinAddress);
    deploymentInfo.gmCoinAddress = gmCoinAddress;
    deploymentInfo.gmCoinImplAddress = gmCoinImplAddress;

    // 4. Deploy Treasury
    console.log("\n=== Deploying Treasury ===");
    const TreasuryFactory = await ethers.getContractFactory("GMTreasury");
    const treasury = await TreasuryFactory.deploy(owner);
    await treasury.waitForDeployment();
    const treasuryAddressDeployed = await treasury.getAddress();
    console.log("Treasury deployed:", treasuryAddressDeployed);
    deploymentInfo.treasuryAddress = treasuryAddressDeployed;

    // 5. Save deployment info to deployment.json
    const deploymentFile = 'deployment.json';
    let allDeployments: Record<string, any> = {};
    
    try {
        const fs = require('fs');
        if (fs.existsSync(deploymentFile)) {
            const existingContent = fs.readFileSync(deploymentFile, 'utf8');
            allDeployments = JSON.parse(existingContent);
        }
    } catch (error) {
        console.log("⚠️  Could not read deployment.json, starting fresh");
        allDeployments = {};
    }

    const networkName = (await ethers.provider.getNetwork()).name;
    allDeployments[networkName] = deploymentInfo;

    writeFileSync(deploymentFile, JSON.stringify(allDeployments, null, 2));
    console.log(`\n✅ Deployment info saved to deployment.json under network: ${networkName}`);
    console.log(`📁 File now contains deployments for ${Object.keys(allDeployments).length} network(s)`);

    console.log("\n=== Deployment Summary ===");
    console.log("AccountManager:", accountManagerAddress);
    console.log("Minter:", minterAddress);
    console.log("GMCoin:", gmCoinAddress);
    console.log("Treasury:", treasuryAddressDeployed);
    console.log("W3F Manager (constant):", w3fManagerAddress);
    console.log("W3F Dedicated Msg Sender (constant):", w3fDedicatedMsgSender);
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});

