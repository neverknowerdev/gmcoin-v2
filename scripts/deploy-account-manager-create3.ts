import { ethers, run } from "hardhat";
import type { AccountManager } from "../typechain-types";
import { normalizeSalt, predictCreate3DeployedAddress } from "./utils/create3";

async function verifyContract(
    address: string,
    constructorArguments: any[] = [],
    contractName?: string,
    contractPath?: string
) {
    console.log(`\nVerifying ${contractName || "contract"} at ${address}...`);
    try {
        const verifyParams: any = {
            address,
            constructorArguments,
        };

        // Specify contract if multiple matches found
        if (contractPath) {
            verifyParams.contract = contractPath;
        }

        await run("verify:verify", verifyParams);
        console.log(`✅ ${contractName || "Contract"} verified successfully`);
    } catch (error: any) {
        if (error.message.includes("Already Verified")) {
            console.log(`✅ ${contractName || "Contract"} already verified`);
        } else {
            console.error(`❌ Verification failed:`, error.message);
        }
    }
}

const DEFAULT_CREATE3_DEPLOYER_ADDRESS = "0xb2ea28DC7Ea2E92f80CC3B89671cfe0712E0E9b9";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);

    // Read config from env (optional)
    const icpCanisterAddress = process.env.ACCOUNT_MANAGER_ICP_CANISTER;

    // Salt inputs (string or hex). We hash strings to bytes32 for convenience.
    const implSaltInput = process.env.CREATE3_SALT_ACCOUNT_MANAGER_IMPL ?? "account-manager-impl";
    const proxySaltInput = process.env.CREATE3_SALT_ACCOUNT_MANAGER_PROXY ?? "account-manager-proxy";

    const implSalt = normalizeSalt(implSaltInput);
    const proxySalt = normalizeSalt(proxySaltInput);

    // 0) Get or deploy a Create3Deployer
    let create3DeployerAddress = process.env.CREATE3_DEPLOYER_ADDRESS as string || DEFAULT_CREATE3_DEPLOYER_ADDRESS;
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
    console.log("  ICP Canister Address:", icpCanisterAddress || "(not set - will skip)");
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
    // return;

    let implementationAddress = predictedImpl;
    const existingImplCode = await ethers.provider.getCode(predictedImpl);
    let implWasDeployed = false;
    if (existingImplCode && existingImplCode !== "0x") {
        console.log("✅ Implementation already deployed, skipping CREATE3 call.");
    } else {
        console.log("Deploying implementation...");
        const implTx = await create3.deploy(implSalt, implDeployTx.data);
        const receipt = await implTx.wait();
        implementationAddress = await create3.getDeployedAddress(implSalt);
        console.log("✅ AccountManager implementation deployed:", implementationAddress);
        console.log("   Transaction hash:", receipt?.hash);
        implWasDeployed = true;
    }

    // 2) Encode initializer for proxy -> calls AccountManager.initialize() (no parameters)
    const initData = AccountManagerFactory.interface.encodeFunctionData("initialize", []);

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
    let proxyWasDeployed = false;
    if (existingProxyCode && existingProxyCode !== "0x") {
        console.log("✅ Proxy already deployed, skipping CREATE3 call.");
    } else {
        console.log("Deploying proxy...");
        const proxyTx = await create3.deploy(proxySalt, proxyDeployTx.data);
        const receipt = await proxyTx.wait();
        proxyAddress = await create3.getDeployedAddress(proxySalt);
        console.log("✅ AccountManager proxy deployed:", proxyAddress);
        console.log("   Transaction hash:", receipt?.hash);
        proxyWasDeployed = true;
    }

    // 4) Verify contracts on block explorer
    console.log("\n=== Contract Verification ===");

    // Wait a bit for block explorer to index (only if contracts were just deployed)
    if (implWasDeployed || proxyWasDeployed) {
        console.log("Waiting 10 seconds for block explorer to index...");
        await new Promise(resolve => setTimeout(resolve, 10000));
    }

    // Verify implementation (no constructor args)
    await verifyContract(implementationAddress, [], "AccountManager Implementation");

    // Verify proxy (constructor args: implementation address and init data)
    await verifyContract(
        proxyAddress,
        [implementationAddress, initData],
        "GMAccountManager Proxy",
        "contracts/GMProxy.sol:GMAccountManager"
    );

    // 5) Runtime verification and optionally set ICP Canister Address
    console.log("\n=== Runtime Verification ===");
    const accountManager = AccountManagerFactory.attach(proxyAddress).connect(
        deployer
    ) as AccountManager;

    try {
        const owner = await accountManager.owner();
        console.log("✅ Owner:", owner);
        console.log("✅ Proxy address:", proxyAddress);
        console.log("✅ Implementation address:", implementationAddress);

        // Set the ICP canister address only if provided
        if (icpCanisterAddress) {
            console.log("\n=== Setting ICP Canister Address ===");
            console.log("Setting ICP canister address:", icpCanisterAddress);
            const setICPTx = await (accountManager as any).setICPAccountManagementAddress(icpCanisterAddress);
            await setICPTx.wait();
            console.log("✅ ICP canister address set");
            console.log("   Transaction hash:", setICPTx.hash);
        } else {
            console.log("\n⚠️  ICP Canister Address not set (ACCOUNT_MANAGER_ICP_CANISTER env var not provided)");
            console.log("   You can set it later by calling setICPAccountManagementAddress()");
        }
    } catch (error: any) {
        console.warn("⚠️  Could not verify runtime state or set ICP address:", error.message);
        console.log("   This might be normal if the contract hasn't been initialized yet.");
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

