import { ethers } from "hardhat";
import type { GMCoinImplementation } from "../typechain-types";
import { normalizeSalt, predictCreate3DeployedAddress } from "./utils/create3";

async function main() {

    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);

    // Read config from env or defaults
    const owner = process.env.GMCOIN_OWNER ?? deployer.address;
    const feeAddress = process.env.GMCOIN_FEE_ADDRESS ?? deployer.address;
    const treasuryAddress = process.env.GMCOIN_TREASURY_ADDRESS ?? deployer.address;
    const coinsMultiplicator = Number(process.env.GMCOIN_COINS_MULTIPLICATOR ?? "300");
    const epochDays = Number(process.env.GMCOIN_EPOCH_DAYS ?? "30");
    const timeDelay = Number(process.env.GMCOIN_TIME_DELAY ?? "0");
    const gelatoDedicatedMsgSender = process.env.GMCOIN_GELATO_SENDER ?? deployer.address;

    if (!Number.isFinite(coinsMultiplicator) || !Number.isFinite(epochDays)) {
        throw new Error("Invalid numeric env values for GMCOIN_COINS_MULTIPLICATOR or GMCOIN_EPOCH_DAYS");
    }

    // Salt inputs (string or hex). We hash strings to bytes32 for convenience.
    const implSaltInput = process.env.CREATE3_SALT_IMPL ?? "gmcoin-impl";
    const proxySaltInput = process.env.CREATE3_SALT_PROXY ?? "gmcoin-proxy";

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

    // 1) Prepare and deploy GMCoin implementation via CREATE3 (no constructor args)
    const GMCoinImplementationFactory = await ethers.getContractFactory("GMCoinImplementation");
    const implDeployTx = await GMCoinImplementationFactory.getDeployTransaction();
    if (!implDeployTx.data) throw new Error("Failed to build GMCoin init code");

    const predictedImpl = await create3.getDeployedAddress(implSalt);
    console.log("Predicted GMCoin implementation:", predictedImpl);

    const implTx = await create3.deploy(implSalt, implDeployTx.data);
    const implReceipt = await implTx.wait();
    const implementationAddress = await create3.getDeployedAddress(implSalt);
    console.log("GMCoin implementation deployed:", implementationAddress);

    // 2) Encode initializer for proxy -> calls GMCoin.initialize(...)
    const initData = GMCoinImplementationFactory.interface.encodeFunctionData("initialize", [
        owner,
        feeAddress,
        treasuryAddress,
        coinsMultiplicator,
        epochDays,
        gelatoDedicatedMsgSender,
        timeDelay,
    ]);

    // 3) Prepare and deploy ERC1967 proxy via CREATE3 with constructor(impl, initData)
    const GMProxyFactory = await ethers.getContractFactory("GMCoin");
    const proxyDeployTx = await GMProxyFactory.getDeployTransaction(implementationAddress, initData);
    if (!proxyDeployTx.data) throw new Error("Failed to build GMProxy init code");

    const predictedProxy = await create3.getDeployedAddress(proxySalt);
    const offlinePredictedProxy = predictCreate3DeployedAddress(factoryAddress, proxySalt);
    console.log("Predicted GMCoin proxy:", predictedProxy);
    console.log("Offline predicted proxy:", offlinePredictedProxy);

    const proxyTx = await create3.deploy(proxySalt, proxyDeployTx.data);
    await proxyTx.wait();
    const proxyAddress = await create3.getDeployedAddress(proxySalt);
    console.log("GMCoin proxy deployed:", proxyAddress);

    // 4) Quick sanity read via proxy
    const gmcoin = GMCoinImplementationFactory.attach(proxyAddress).connect(
        deployer
    ) as GMCoinImplementation;
    console.log("GMCoin name via proxy:", await gmcoin.name());
    console.log("GMCoin symbol via proxy:", await gmcoin.symbol());
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});


