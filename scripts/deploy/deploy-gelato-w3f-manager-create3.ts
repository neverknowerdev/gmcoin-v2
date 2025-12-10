import { ethers, run } from "hardhat";
import type { GelatoW3FManager } from "../../typechain-types";
import { normalizeSalt, predictCreate3DeployedAddress } from "../utils/create3";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);

    // Get network information
    const network = await ethers.provider.getNetwork();
    console.log("Network:", network.name);
    console.log("Chain ID:", network.chainId.toString());

    // Read config from env or defaults
    const owner = process.env.GELATO_W3F_MANAGER_OWNER ?? deployer.address;

    // Get Gelato Automate address - try env var first, then auto-detect from network
    let gelatoAutomateTaskCreator = process.env.GELATO_AUTOMATE_TASK_CREATOR;

    if (!gelatoAutomateTaskCreator) {
        const autoDetectedAddress = getGelatoAutomateAddress(network);
        if (autoDetectedAddress) {
            gelatoAutomateTaskCreator = autoDetectedAddress;
            console.log(`Auto-detected Gelato Automate address: ${gelatoAutomateTaskCreator}`);
        } else {
            throw new Error(
                `GELATO_AUTOMATE_TASK_CREATOR not set and could not auto-detect for network "${network.name}" (chainId: ${network.chainId}). ` +
                `Please set GELATO_AUTOMATE_TASK_CREATOR environment variable or add the network to the mapping. ` +
                `See: https://docs.gelato.cloud/web3-functions/additional-resources/supported-networks`
            );
        }
    } else {
        console.log(`Using Gelato Automate address from env: ${gelatoAutomateTaskCreator}`);
    }

    // Salt inputs (string or hex). We hash strings to bytes32 for convenience.
    const implSaltInput = process.env.CREATE3_SALT_IMPL ?? "gelato-w3f-manager-impl";
    const proxySaltInput = process.env.CREATE3_SALT_PROXY ?? "gelato-w3f-manager-proxy";

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

    // Verify ownership of Create3Deployer
    const create3Owner = await create3.owner();
    if (create3Owner.toLowerCase() !== deployer.address.toLowerCase()) {
        throw new Error(
            `Deployer ${deployer.address} is not the owner of Create3Deployer ${create3DeployerAddress}. ` +
            `Owner is ${create3Owner}. Please use the owner account or transfer ownership.`
        );
    }
    console.log("✓ Verified: Deployer is the owner of Create3Deployer");

    // 1) Prepare and deploy GelatoW3FManager implementation via CREATE3 (no constructor args)
    const GelatoW3FManagerFactory = await ethers.getContractFactory("GelatoW3FManager");
    const implDeployTx = await GelatoW3FManagerFactory.getDeployTransaction();
    if (!implDeployTx.data) throw new Error("Failed to build GelatoW3FManager init code");

    const predictedImpl = await create3.getDeployedAddress(implSalt);
    console.log("Predicted GelatoW3FManager implementation:", predictedImpl);

    let implementationAddress = predictedImpl;
    const existingImplCode = await ethers.provider.getCode(predictedImpl);
    if (existingImplCode && existingImplCode !== "0x") {
        console.log("Implementation already deployed, skipping CREATE3 call.");
        await verifyContract(implementationAddress, []);
    } else {
        const implTx = await create3.deploy(implSalt, implDeployTx.data);
        await implTx.wait();
        implementationAddress = await create3.getDeployedAddress(implSalt);
        console.log("GelatoW3FManager implementation deployed:", implementationAddress);
    }

    // 2) Encode initializer for proxy -> calls GelatoW3FManager.__GelatoWeb3Functions__init(...)
    const initData = GelatoW3FManagerFactory.interface.encodeFunctionData("initialize", [
        owner,
        gelatoAutomateTaskCreator,
    ]);

    // 3) Prepare and deploy ERC1967 proxy via CREATE3 with constructor(impl, initData)
    const GMProxyFactory = await ethers.getContractFactory("GMProxy");
    const proxyDeployTx = await GMProxyFactory.getDeployTransaction(implementationAddress, initData);
    if (!proxyDeployTx.data) throw new Error("Failed to build GMProxy init code");

    const predictedProxy = await create3.getDeployedAddress(proxySalt);
    const offlinePredictedProxy = predictCreate3DeployedAddress(factoryAddress, proxySalt);
    console.log("Predicted GelatoW3FManager proxy:", predictedProxy);
    console.log("Offline predicted proxy:", offlinePredictedProxy);

    let proxyAddress = predictedProxy;
    const existingProxyCode = await ethers.provider.getCode(predictedProxy);
    if (existingProxyCode && existingProxyCode !== "0x") {
        console.log("Proxy already deployed, skipping CREATE3 call.");
        await verifyProxy(proxyAddress, [implementationAddress, initData]);
    } else {
        console.log("Deploying proxy via CREATE3...");
        console.log("  Implementation:", implementationAddress);
        console.log("  Gelato Automate:", gelatoAutomateTaskCreator);
        console.log("  Owner:", owner);
        console.log("  Note: If this fails, the issue is likely that getProxyOf() is being called");
        console.log("  during contract creation before the proxy exists in Gelato's system.");
        console.log("  This may require modifying AutomateReadyUpgradeable to handle this case.");

        const proxyTx = await create3.deploy(proxySalt, proxyDeployTx.data);
        await proxyTx.wait();
        proxyAddress = await create3.getDeployedAddress(proxySalt);
        console.log("GelatoW3FManager proxy deployed:", proxyAddress);
    }

    // 4) Quick sanity read via proxy
    // const gelatoW3FManager = GelatoW3FManagerFactory.attach(proxyAddress).connect(
    //     deployer
    // ) as unknown as GelatoW3FManager;
    // console.log("GelatoW3FManager owner via proxy:", await gelatoW3FManager.owner());

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

/**
 * Gelato Automate contract addresses by network
 * Reference: https://docs.gelato.cloud/web3-functions/additional-resources/supported-networks
 * 
 * NOTE: Addresses should be verified/updated from the official Gelato documentation.
 * You can override by setting GELATO_AUTOMATE_TASK_CREATOR environment variable.
 * 
 * Group A Address: 0x2A6C106ae13B558BB9E2Ec64Bd2f1f7BEFF3A5E0
 * Group B Address: 0xafd37d0558255aA687167560cd3AaeEa75c2841E
 * Group C Address: 0x1F7c992B937CE4a5A77de0E460b8Eab007BA0c37 (typically same as Group B)
 */
const GELATO_AUTOMATE_ADDRESSES: Record<string, string> = {
    // ============================================
    // GROUP A - Mainnets
    // ============================================
    // Ethereum Mainnet
    "1": "0x2A6C106ae13B558BB9E2Ec64Bd2f1f7BEFF3A5E0",
    "mainnet": "0x2A6C106ae13B558BB9E2Ec64Bd2f1f7BEFF3A5E0",
    "ethereum": "0x2A6C106ae13B558BB9E2Ec64Bd2f1f7BEFF3A5E0",

    // Ethereum Sepolia
    "11155111": "0x2A6C106ae13B558BB9E2Ec64Bd2f1f7BEFF3A5E0",
    "sepolia": "0x2A6C106ae13B558BB9E2Ec64Bd2f1f7BEFF3A5E0",

    // Polygon Mainnet
    "137": "0x2A6C106ae13B558BB9E2Ec64Bd2f1f7BEFF3A5E0",
    "polygon": "0x2A6C106ae13B558BB9E2Ec64Bd2f1f7BEFF3A5E0",
    "matic": "0x2A6C106ae13B558BB9E2Ec64Bd2f1f7BEFF3A5E0",

    // Arbitrum One
    "42161": "0x2A6C106ae13B558BB9E2Ec64Bd2f1f7BEFF3A5E0",
    "arbitrum": "0x2A6C106ae13B558BB9E2Ec64Bd2f1f7BEFF3A5E0",
    "arbitrum-one": "0x2A6C106ae13B558BB9E2Ec64Bd2f1f7BEFF3A5E0",

    // Optimism Mainnet
    "10": "0x2A6C106ae13B558BB9E2Ec64Bd2f1f7BEFF3A5E0",
    "optimism": "0x2A6C106ae13B558BB9E2Ec64Bd2f1f7BEFF3A5E0",
    "optimism-mainnet": "0x2A6C106ae13B558BB9E2Ec64Bd2f1f7BEFF3A5E0",


    // BNB Smart Chain (BSC)
    "56": "0x2A6C106ae13B558BB9E2Ec64Bd2f1f7BEFF3A5E0",
    "bsc": "0x2A6C106ae13B558BB9E2Ec64Bd2f1f7BEFF3A5E0",
    "binance": "0x2A6C106ae13B558BB9E2Ec64Bd2f1f7BEFF3A5E0",
    "bnb": "0x2A6C106ae13B558BB9E2Ec64Bd2f1f7BEFF3A5E0",

    // Base Mainnet
    "8453": "0x2A6C106ae13B558BB9E2Ec64Bd2f1f7BEFF3A5E0",
    "base": "0x2A6C106ae13B558BB9E2Ec64Bd2f1f7BEFF3A5E0",
    "base-mainnet": "0x2A6C106ae13B558BB9E2Ec64Bd2f1f7BEFF3A5E0",

    // ============================================
    // GROUP A - Testnets
    // ============================================

    // Polygon Amoy
    "80002": "0x2A6C106ae13B558BB9E2Ec64Bd2f1f7BEFF3A5E0",
    "amoy": "0x2A6C106ae13B558BB9E2Ec64Bd2f1f7BEFF3A5E0",
    "polygon-amoy": "0x2A6C106ae13B558BB9E2Ec64Bd2f1f7BEFF3A5E0",

    // Arbitrum Goerli
    "421613": "0x2A6C106ae13B558BB9E2Ec64Bd2f1f7BEFF3A5E0",
    "arbitrum-goerli": "0x2A6C106ae13B558BB9E2Ec64Bd2f1f7BEFF3A5E0",

    // Arbitrum Sepolia
    "421614": "0x2A6C106ae13B558BB9E2Ec64Bd2f1f7BEFF3A5E0",
    "arbitrum-sepolia": "0x2A6C106ae13B558BB9E2Ec64Bd2f1f7BEFF3A5E0",

    // Optimism Goerli
    "420": "0x2A6C106ae13B558BB9E2Ec64Bd2f1f7BEFF3A5E0",
    "optimism-goerli": "0x2A6C106ae13B558BB9E2Ec64Bd2f1f7BEFF3A5E0",

    // Optimism Sepolia
    "11155420": "0x2A6C106ae13B558BB9E2Ec64Bd2f1f7BEFF3A5E0",
    "optimism-sepolia": "0x2A6C106ae13B558BB9E2Ec64Bd2f1f7BEFF3A5E0",

    // BSC Testnet
    "97": "0x2A6C106ae13B558BB9E2Ec64Bd2f1f7BEFF3A5E0",
    "bsc-testnet": "0x2A6C106ae13B558BB9E2Ec64Bd2f1f7BEFF3A5E0",
    "bnbt": "0x2A6C106ae13B558BB9E2Ec64Bd2f1f7BEFF3A5E0",

    // Base Sepolia
    "84532": "0x2A6C106ae13B558BB9E2Ec64Bd2f1f7BEFF3A5E0",
    "base-sepolia": "0x2A6C106ae13B558BB9E2Ec64Bd2f1f7BEFF3A5E0",
    "base-goerli": "0x2A6C106ae13B558BB9E2Ec64Bd2f1f7BEFF3A5E0",

    "6342": "0x1F7c992B937CE4a5A77de0E460b8Eab007BA0c37",
    "megaeth-testnet": "0x1F7c992B937CE4a5A77de0E460b8Eab007BA0c37",

    "4326": "0x1F7c992B937CE4a5A77de0E460b8Eab007BA0c37",
    "megaeth": "0x1F7c992B937CE4a5A77de0E460b8Eab007BA0c37",

    "10143": "0xafd37d0558255aA687167560cd3AaeEa75c2841E",
    "monad-testnet": "0xafd37d0558255aA687167560cd3AaeEa75c2841E",

    "143": "0xafd37d0558255aA687167560cd3AaeEa75c2841E",
    "monad": "0xafd37d0558255aA687167560cd3AaeEa75c2841E",

    "763373": "0xafd37d0558255aA687167560cd3AaeEa75c2841E",
    "ink-sepolia": "0xafd37d0558255aA687167560cd3AaeEa75c2841E",

    "57073": "0xafd37d0558255aA687167560cd3AaeEa75c2841E",
    "ink": "0xafd37d0558255aA687167560cd3AaeEa75c2841E",

    "998": "0xafd37d0558255aA687167560cd3AaeEa75c2841E",
    "hyperevm-testnet": "0xafd37d0558255aA687167560cd3AaeEa75c2841E",

    "999": "0xafd37d0558255aA687167560cd3AaeEa75c2841E",
    "hyperevm": "0xafd37d0558255aA687167560cd3AaeEa75c2841E",
};

/**
 * Get Gelato Automate contract address for the current network
 * @param network Network object from ethers
 * @returns Automate contract address
 */
function getGelatoAutomateAddress(network: { chainId: bigint; name: string }): string | null {
    // Try chain ID first (most reliable)
    const chainIdStr = network.chainId.toString();
    if (GELATO_AUTOMATE_ADDRESSES[chainIdStr]) {
        return GELATO_AUTOMATE_ADDRESSES[chainIdStr];
    }

    // Try network name (case-insensitive)
    const networkNameLower = network.name.toLowerCase();
    if (GELATO_AUTOMATE_ADDRESSES[networkNameLower]) {
        return GELATO_AUTOMATE_ADDRESSES[networkNameLower];
    }

    return null;
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});

