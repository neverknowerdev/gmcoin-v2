import { ethers, run } from "hardhat";
import type { Minter } from "../../typechain-types";
import { normalizeSalt, predictCreate3DeployedAddress } from "../utils/create3";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);

    // Read config from env or defaults
    // const owner = process.env.MINTER_OWNER ?? deployer.address;
    const coinsPerPost = Number(process.env.MINTER_COINS_PER_POST ?? "100");
    const gelatoAddress = process.env.MINTER_GELATO_ADDRESS ?? deployer.address;
    const epochDays = Number(process.env.MINTER_EPOCH_DAYS ?? "30");

    if (!Number.isFinite(coinsPerPost) || !Number.isFinite(epochDays)) {
        throw new Error("Invalid numeric env values for MINTER_COINS_PER_POST or MINTER_EPOCH_DAYS");
    }

    const owner = process.env.OWNER ?? deployer.address;

    // Salt inputs (string or hex). We hash strings to bytes32 for convenience.
    const implSaltInput = process.env.CREATE3_SALT_IMPL ?? "minter-impl";
    const proxySaltInput = process.env.CREATE3_SALT_PROXY ?? "minter-proxy";

    const implSalt = normalizeSalt(implSaltInput);
    const proxySalt = normalizeSalt(proxySaltInput);

    // 0) Get or deploy a Create3Deployer
    let create3DeployerAddress = process.env.CREATE3_DEPLOYER_ADDRESS as string | undefined;
    let create3: any;

    if (create3DeployerAddress) {
        console.log("Using existing Create3Deployer:", create3DeployerAddress);
        const Create3DeployerFactory = await ethers.getContractFactory("Create3Deployer");
        create3 = Create3DeployerFactory.attach(create3DeployerAddress).connect(deployer);
    }

    if (!create3DeployerAddress) {
        throw new Error("Failed to resolve Create3Deployer address");
    }
    const factoryAddress = create3DeployerAddress;

    // 1) Prepare and deploy Minter implementation via CREATE3 (no constructor args)
    const MinterFactory = await ethers.getContractFactory("Minter");
    const implDeployTx = await MinterFactory.getDeployTransaction();
    if (!implDeployTx.data) throw new Error("Failed to build Minter init code");

    const predictedImpl = await create3.getDeployedAddress(implSalt);
    console.log("Predicted Minter implementation:", predictedImpl);

    let implementationAddress = predictedImpl;
    const existingImplCode = await ethers.provider.getCode(predictedImpl);
    if (existingImplCode && existingImplCode !== "0x") {
        console.log("Implementation already deployed, skipping CREATE3 call.");
        await verifyContract(implementationAddress, []);
    } else {
        const implTx = await create3.deploy(implSalt, implDeployTx.data);
        await implTx.wait();
        implementationAddress = await create3.getDeployedAddress(implSalt);
        console.log("Minter implementation deployed:", implementationAddress);
    }

    // 2) Encode initializer for proxy -> calls Minter.initialize(...)
    const initData = MinterFactory.interface.encodeFunctionData("initialize", [
        owner,
        coinsPerPost,
        gelatoAddress,
        epochDays,
    ]);

    // 3) Prepare and deploy ERC1967 proxy via CREATE3 with constructor(impl, initData)
    const GMProxyFactory = await ethers.getContractFactory("GMProxy");
    const proxyDeployTx = await GMProxyFactory.getDeployTransaction(implementationAddress, initData);
    if (!proxyDeployTx.data) throw new Error("Failed to build GMMinter init code");

    const predictedProxy = await create3.getDeployedAddress(proxySalt);
    const offlinePredictedProxy = predictCreate3DeployedAddress(factoryAddress, proxySalt);
    console.log("Predicted Minter proxy:", predictedProxy);
    console.log("Offline predicted proxy:", offlinePredictedProxy);

    let proxyAddress = predictedProxy;
    const existingProxyCode = await ethers.provider.getCode(predictedProxy);
    if (existingProxyCode && existingProxyCode !== "0x") {
        console.log("Proxy already deployed, skipping CREATE3 call.");
        await verifyProxy(proxyAddress, [implementationAddress, initData]);
    } else {
        const proxyTx = await create3.deploy(proxySalt, proxyDeployTx.data);
        await proxyTx.wait();
        proxyAddress = await create3.getDeployedAddress(proxySalt);
        console.log("Minter proxy deployed:", proxyAddress);
    }

    // 4) Quick sanity read via proxy
    // const minter = MinterFactory.attach(proxyAddress).connect(
    //     deployer
    // ) as unknown as Minter;
    // console.log("Minter owner via proxy:", await minter.owner());

    // 5) Verify contracts on Etherscan (only if they were just deployed)
    const wasImplJustDeployed = !(existingImplCode && existingImplCode !== "0x");
    const wasProxyJustDeployed = !(existingProxyCode && existingProxyCode !== "0x");

    if (wasImplJustDeployed) {
        await verifyContract(implementationAddress, []);
    }
    if (wasProxyJustDeployed) {
        await verifyProxy(proxyAddress, [implementationAddress, initData]);
    }
}

async function verifyProxy(proxyAddress: string, constructorArguments: any[]) {
    await verifyContract(proxyAddress, constructorArguments, "contracts/GMProxy.sol:GMProxy");
}

async function verifyContract(address: string, constructorArguments: any[], contractName: string | undefined = undefined) {
    console.log("\n=== Verifying contract on Etherscan ===");
    console.log("Address:", address);
    console.log("Constructor arguments:", constructorArguments);
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const chainId = await ethers.provider.getNetwork().then((network) => network.chainId);
    console.log("Chain ID:", chainId);

    try {
        await run("verify:verify", {
            address,
            constructorArguments,
            contract: contractName,
        });
        console.log("✅ Contract verified successfully");
    } catch (error: any) {
        if (error.message?.includes("Already Verified") || error.message?.includes("already verified")) {
            console.log("✅ Contract already verified");
        } else {
            console.error("❌ Verification failed:", error.message);
            // Don't throw - verification failure shouldn't stop the script
        }
    }
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});

