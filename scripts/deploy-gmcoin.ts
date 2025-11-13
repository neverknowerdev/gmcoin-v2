import { ethers } from "hardhat";

async function main() {

    const [deployer] = await ethers.getSigners();

    const owner = process.env.GMCOIN_OWNER ?? deployer.address;
    const feeAddress = process.env.GMCOIN_FEE_ADDRESS ?? deployer.address;
    const treasuryAddress = process.env.GMCOIN_TREASURY_ADDRESS ?? deployer.address;
    const coinsMultiplicator = Number(process.env.GMCOIN_COINS_MULTIPLICATOR ?? "300");
    const epochDays = Number(process.env.GMCOIN_EPOCH_DAYS ?? "30");
    const gelatoDedicatedMsgSender = process.env.GMCOIN_GELATO_SENDER ?? deployer.address;

    if (!Number.isFinite(coinsMultiplicator) || !Number.isFinite(epochDays)) {
        throw new Error("Invalid numeric env values for GMCOIN_COINS_MULTIPLICATOR or GMCOIN_EPOCH_DAYS");
    }

    console.log("Deployer:", deployer.address);

    // 1) Deploy implementation
    const GMCoinFactory = await ethers.getContractFactory("GMCoin");
    const implementation = await GMCoinFactory.deploy();
    await implementation.waitForDeployment();
    const implementationAddress = await implementation.getAddress();
    console.log("GMCoin implementation:", implementationAddress);

    // 2) Encode initializer call
    const initData = GMCoinFactory.interface.encodeFunctionData("initialize", [
        owner,
        feeAddress,
        treasuryAddress,
        coinsMultiplicator,
        epochDays,
        gelatoDedicatedMsgSender,
    ]);

    // 3) Deploy ERC1967 proxy pointing to implementation, calling initialize
    const GMProxyFactory = await ethers.getContractFactory("GMProxy");
    const proxy = await GMProxyFactory.deploy(implementationAddress, initData);
    await proxy.waitForDeployment();
    const proxyAddress = await proxy.getAddress();
    console.log("GMCoin proxy:", proxyAddress);

    // 4) Interact through the proxy using the implementation ABI
    const gmcoin = GMCoinFactory.attach(proxyAddress);
    console.log("GMCoin name via proxy:", await gmcoin.name());
    console.log("GMCoin symbol via proxy:", await gmcoin.symbol());
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});


