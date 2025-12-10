import { ethers } from "hardhat";
import type { GMTreasury } from "../../typechain-types";
import { normalizeSalt, predictCreate3DeployedAddress } from "../utils/create3";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);

    // Read config from env or defaults
    const owner = process.env.TREASURY_OWNER ?? deployer.address;

    // Salt input (string or hex). We hash strings to bytes32 for convenience.
    const saltInput = process.env.CREATE3_SALT_TREASURY ?? "treasury";

    const salt = normalizeSalt(saltInput);

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

    // Note: Treasury is a simple contract (not upgradable proxy)
    // 1) Prepare and deploy Treasury via CREATE3 with constructor(owner)
    const TreasuryFactory = await ethers.getContractFactory("GMTreasury");
    const deployTx = await TreasuryFactory.getDeployTransaction(owner);
    if (!deployTx.data) throw new Error("Failed to build Treasury init code");

    const predictedAddress = await create3.getDeployedAddress(salt);
    const offlinePredictedAddress = predictCreate3DeployedAddress(factoryAddress, salt);
    console.log("Predicted Treasury address:", predictedAddress);
    console.log("Offline predicted address:", offlinePredictedAddress);

    let treasuryAddress = predictedAddress;
    const existingCode = await ethers.provider.getCode(predictedAddress);
    if (existingCode && existingCode !== "0x") {
        console.log("Treasury already deployed, skipping CREATE3 call.");
    } else {
        const tx = await create3.deploy(salt, deployTx.data);
        await tx.wait();
        treasuryAddress = await create3.getDeployedAddress(salt);
        console.log("Treasury deployed:", treasuryAddress);
    }

    // 2) Quick sanity read
    const treasury = TreasuryFactory.attach(treasuryAddress).connect(
        deployer
    ) as unknown as GMTreasury;
    console.log("Treasury owner:", await treasury.owner());
    console.log("Treasury unlock time:", await treasury.unlockTime());
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});

