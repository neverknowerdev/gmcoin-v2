import { ethers } from "hardhat";

async function main() {

    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);

    const Create3DeployerFactory = await ethers.getContractFactory("Create3Deployer");
    const create3 = await Create3DeployerFactory.deploy();
    await create3.waitForDeployment();
    const addr = await create3.getAddress();
    console.log("Create3Deployer deployed at:", addr);
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});


