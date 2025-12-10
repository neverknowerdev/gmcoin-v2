import { ethers } from "hardhat";

const DEFAULT_FACTORY_ADDRESS = "0x4e59b44847b379578588920ca78fbf26c0b4956c";
const DEFAULT_RAW_TX =
    "0xf8a58085174876e800830186a08080b853604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf31ba02222222222222222222222222222222222222222222222222222222222222222a02222222222222222222222222222222222222222222222222222222222222222";

async function main() {
    const provider = ethers.provider;

    const factoryAddress =
        process.env.DETERMINISTIC_DEPLOYER_ADDRESS || DEFAULT_FACTORY_ADDRESS;
    const rawTx =
        process.env.DETERMINISTIC_DEPLOYER_TX?.trim() || DEFAULT_RAW_TX;

    const currentCode = await provider.getCode(factoryAddress);
    if (currentCode && currentCode !== "0x") {
        console.log(`Deterministic deployer already present at ${factoryAddress}`);
        return;
    }

    console.log("Broadcasting deterministic deployer transaction...");
    console.log("Factory address:", factoryAddress);

    const txHash = await provider.send("eth_sendRawTransaction", [rawTx]);
    console.log("Submitted tx:", txHash);

    const receipt = await provider.waitForTransaction(txHash);
    console.log("Deployment confirmed in block:", receipt.blockNumber);

    const deployedCode = await provider.getCode(factoryAddress);
    if (deployedCode === "0x") {
        throw new Error("Factory code missing after deployment, check node logs.");
    }

    console.log("Deterministic deployer live at:", factoryAddress);
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});


