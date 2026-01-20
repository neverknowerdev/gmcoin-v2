import { ethers, run } from "hardhat";
import { concat, getCreate2Address, keccak256 } from "ethers";
import { normalizeSalt } from "./utils/create3";

async function verifyContract(address: string, constructorArguments: any[] = []) {
    console.log("\n=== Verifying Contract ===");
    console.log("Address:", address);
    try {
        await run("verify:verify", {
            address,
            constructorArguments,
        });
        console.log("✅ Contract verified successfully");
    } catch (error: any) {
        if (error.message.includes("Already Verified")) {
            console.log("✅ Contract already verified");
        } else {
            console.error("❌ Verification failed:", error.message);
        }
    }
}

const DEFAULT_CREATE2_FACTORY = "0x4e59b44847b379578588920ca78fbf26c0b4956c";

async function main() {
    const [signer] = await ethers.getSigners();

    const saltInput = process.env.CREATE3_FACTORY_SALT || "gmcoin-deterministic-deployer";
    const salt = normalizeSalt(saltInput);

    const create2FactoryAddress =
        process.env.CREATE2_FACTORY_ADDRESS || DEFAULT_CREATE2_FACTORY;

    console.log("Deployer:", signer.address);
    console.log("CREATE2 factory:", create2FactoryAddress);
    console.log("Salt (normalized):", salt);

    const factoryCode = await ethers.provider.getCode(create2FactoryAddress);
    if (factoryCode === "0x") {
        throw new Error(
            `No contract found at ${create2FactoryAddress}. Deploy the deterministic CREATE2 factory first (run scripts/deploy-deterministic-deployer.ts).`
        );
    }

    const Create3Factory = await ethers.getContractFactory("Create3Deployer");
    const initCode = Create3Factory.bytecode;
    const initCodeHash = keccak256(initCode);

    const predictedAddress = getCreate2Address(
        create2FactoryAddress,
        salt,
        initCodeHash
    );

    console.log("Predicted Create3Deployer address:", predictedAddress);

    const existingCode = await ethers.provider.getCode(predictedAddress);
    if (existingCode && existingCode !== "0x") {
        console.log("Code already present at predicted address. Skipping deployment.");
        return;
    }

    const payload = concat([salt, initCode]);
    const gasEstimate = await ethers.provider.estimateGas({
        to: create2FactoryAddress,
        data: payload,
        from: signer.address,
    });

    const tx = await signer.sendTransaction({
        to: create2FactoryAddress,
        data: payload,
        gasLimit: gasEstimate * 12n / 10n,
    });

    console.log(`Deploy tx: ${tx.hash}`);
    const receipt = await tx.wait();
    if (!receipt) {
        throw new Error("Transaction dropped before confirmation");
    }

    console.log("Deployment confirmed in block:", receipt.blockNumber);
    console.log("Create3Deployer deployed at:", predictedAddress);

    // Verify the contract (no constructor arguments)
    await verifyContract(predictedAddress, []);
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});


