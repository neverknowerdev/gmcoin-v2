import { ethers } from "hardhat";
import type { AccountManager } from "../typechain-types";
import { normalizeSalt, predictCreate3DeployedAddress } from "./utils/create3";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);

    // Read config from env or defaults
    const gelatoDedicatedMsgSender = process.env.ACCOUNT_MANAGER_GELATO_SENDER ?? deployer.address;
    const timeDelay = Number(process.env.ACCOUNT_MANAGER_TIME_DELAY ?? "0");

    if (!Number.isFinite(timeDelay)) {
        throw new Error("Invalid numeric env value for ACCOUNT_MANAGER_TIME_DELAY");
    }

    // Salt inputs (string or hex). We hash strings to bytes32 for convenience.
    const implSaltInput = process.env.CREATE3_SALT_ACCOUNT_MANAGER_IMPL ?? "account-manager-impl";
    const proxySaltInput = process.env.CREATE3_SALT_ACCOUNT_MANAGER_PROXY ?? "account-manager-proxy";

    const implSalt = normalizeSalt(implSaltInput);
    const proxySalt = normalizeSalt(proxySaltInput);

    // 0) Get or deploy a Create3Deployer
    let create3DeployerAddress = process.env.CREATE3_DEPLOYER_ADDRESS as string | undefined;
    let create3: any;

    if (create3DeployerAddress) {
        console.log("Using existing Create3Deployer:", create3DeployerAddress);
        const Create3DeployerFactory = await ethers.getContractFactory("Create3Deployer");
        create3 = Create3DeployerFactory.attach(create3DeployerAddress).connect(deployer);
    } else {
        console.log("Deploying Create3Deployer...");
        const Create3DeployerFactory = await ethers.getContractFactory("Create3Deployer");
        create3 = await Create3DeployerFactory.deploy();
        await create3.waitForDeployment();
        create3DeployerAddress = await create3.getAddress();
        console.log("Create3Deployer deployed at:", create3DeployerAddress);
    }

    if (!create3DeployerAddress) {
        throw new Error("Failed to resolve Create3Deployer address");
    }
    const factoryAddress = create3DeployerAddress;

    console.log("\nConfiguration:");
    console.log("  Gelato Dedicated Msg Sender:", gelatoDedicatedMsgSender);
    console.log("  Time Delay:", timeDelay);
    console.log("  Implementation Salt:", implSaltInput);
    console.log("  Proxy Salt:", proxySaltInput);

    // 1) Prepare and deploy AccountManager implementation via CREATE3 (no constructor args)
    const AccountManagerFactory = await ethers.getContractFactory("AccountManager");
    const implDeployTx = await AccountManagerFactory.getDeployTransaction();
    if (!implDeployTx.data) throw new Error("Failed to build AccountManager init code");

    const predictedImpl = await create3.getDeployedAddress(implSalt);
    const offlinePredictedImpl = predictCreate3DeployedAddress(factoryAddress, implSalt);
    console.log("\n=== AccountManager Implementation ===");
    console.log("Predicted (on-chain):", predictedImpl);
    console.log("Predicted (offline):", offlinePredictedImpl);

    let implementationAddress = predictedImpl;
    const existingImplCode = await ethers.provider.getCode(predictedImpl);
    if (existingImplCode && existingImplCode !== "0x") {
        console.log("✅ Implementation already deployed, skipping CREATE3 call.");
    } else {
        console.log("Deploying implementation...");
        const implTx = await create3.deploy(implSalt, implDeployTx.data);
        const receipt = await implTx.wait();
        implementationAddress = await create3.getDeployedAddress(implSalt);
        console.log("✅ AccountManager implementation deployed:", implementationAddress);
        console.log("   Transaction hash:", receipt?.hash);
    }

    // 2) Encode initializer for proxy -> calls AccountManager.initialize(...)
    const initData = AccountManagerFactory.interface.encodeFunctionData("initialize", [
        gelatoDedicatedMsgSender,
        timeDelay,
    ]);

    // 3) Prepare and deploy ERC1967 proxy via CREATE3 with constructor(impl, initData)
    const GMAccountManagerFactory = await ethers.getContractFactory("GMAccountManager");
    const proxyDeployTx = await GMAccountManagerFactory.getDeployTransaction(implementationAddress, initData);
    if (!proxyDeployTx.data) throw new Error("Failed to build AccountManager proxy init code");

    const predictedProxy = await create3.getDeployedAddress(proxySalt);
    const offlinePredictedProxy = predictCreate3DeployedAddress(factoryAddress, proxySalt);
    console.log("\n=== AccountManager Proxy ===");
    console.log("Predicted (on-chain):", predictedProxy);
    console.log("Predicted (offline):", offlinePredictedProxy);

    let proxyAddress = predictedProxy;
    const existingProxyCode = await ethers.provider.getCode(predictedProxy);
    if (existingProxyCode && existingProxyCode !== "0x") {
        console.log("✅ Proxy already deployed, skipping CREATE3 call.");
    } else {
        console.log("Deploying proxy...");
        const proxyTx = await create3.deploy(proxySalt, proxyDeployTx.data);
        const receipt = await proxyTx.wait();
        proxyAddress = await create3.getDeployedAddress(proxySalt);
        console.log("✅ AccountManager proxy deployed:", proxyAddress);
        console.log("   Transaction hash:", receipt?.hash);
    }

    // 4) Verify deployment by reading from proxy
    console.log("\n=== Verification ===");
    const accountManager = AccountManagerFactory.attach(proxyAddress).connect(
        deployer
    ) as AccountManager;
    
    try {
        const owner = await accountManager.owner();
        console.log("✅ Owner:", owner);
        console.log("✅ Proxy address:", proxyAddress);
        console.log("✅ Implementation address:", implementationAddress);
    } catch (error) {
        console.warn("⚠️  Could not verify deployment:", error);
    }

    console.log("\n=== Deployment Summary ===");
    console.log("AccountManager Proxy:", proxyAddress);
    console.log("AccountManager Implementation:", implementationAddress);
    console.log("\n💡 Set this in your frontend .env:");
    console.log(`NEXT_PUBLIC_ACCOUNT_MANAGER_ADDRESS=${proxyAddress}`);
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});

