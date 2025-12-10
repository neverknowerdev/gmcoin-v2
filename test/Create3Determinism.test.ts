import { expect } from "chai";
import { ethers, network } from "hardhat";
import {
    normalizeSalt,
    predictCreate3DeployedAddress,
} from "../scripts/utils/create3";

const TEST_CHAIN_IDS = [
    { name: "Hardhat (31337)" },
    { name: "Ethereum Sepolia (simulated)" },
    { name: "Base Sepolia (simulated)" },
    { name: "Arbitrum Sepolia (simulated)" },
];

describe("CREATE3 deterministic deployments", function () {
    this.timeout(120000);

    after(async () => {
        await network.provider.request({ method: "hardhat_reset" });
    });

    it("predicts addresses exactly like the on-chain helper", async () => {
        const Create3DeployerFactory = await ethers.getContractFactory("Create3Deployer");
        const create3 = await Create3DeployerFactory.deploy();
        await create3.waitForDeployment();
        const factoryAddress = await create3.getAddress();

        const salts = [
            normalizeSalt("gmcoin-impl"),
            normalizeSalt("gmcoin-proxy"),
            normalizeSalt("random-salt-" + Date.now().toString()),
        ];

        for (const salt of salts) {
            const onchain = await create3.getDeployedAddress(salt);
            const offline = predictCreate3DeployedAddress(factoryAddress, salt);
            expect(offline).to.equal(onchain);
        }
    });

    it("deploys the GM proxy to the same address on multiple chains", async () => {
        /**
         * We simulate multiple public testnets by resetting Hardhat to a clean genesis
         * before each deployment. CREATE3 addresses depend only on the deployer address
         * and salt, so proving determinism across clean networks is equivalent to
         * deploying on different chains (actual chainId does not influence the formula).
         */
        const observed: Record<string, string> = {};
        let referenceAddress: string | undefined;

        for (const chain of TEST_CHAIN_IDS) {
            await network.provider.request({ method: "hardhat_reset" });
            const { proxyAddress } = await deployGmcoinDeterministically();
            observed[chain.name] = proxyAddress;
            if (!referenceAddress) {
                referenceAddress = proxyAddress;
            } else {
                expect(proxyAddress, `Mismatch on ${chain.name}`).to.equal(referenceAddress);
            }
        }

        expect(Object.values(observed)).to.have.lengthOf(TEST_CHAIN_IDS.length);
    });
});

async function deployGmcoinDeterministically() {
    const implSalt = normalizeSalt("gmcoin-impl");
    const proxySalt = normalizeSalt("gmcoin-proxy");

    const [owner, fee, treasury, gelato] = await ethers.getSigners();

    const Create3DeployerFactory = await ethers.getContractFactory("Create3Deployer");
    const create3 = await Create3DeployerFactory.deploy();
    await create3.waitForDeployment();
    const factoryAddress = await create3.getAddress();

    const GMCoinImplementationFactory = await ethers.getContractFactory("GMCoinImplementation");
    const implDeployTx = await GMCoinImplementationFactory.getDeployTransaction();
    if (!implDeployTx.data) {
        throw new Error("Failed to encode GMCoinImplementation init code");
    }
    await (await create3.deploy(implSalt, implDeployTx.data)).wait();
    const implementationAddress = await create3.getDeployedAddress(implSalt);

    const initData = GMCoinImplementationFactory.interface.encodeFunctionData("initialize", [
        owner.address,
        fee.address,
        treasury.address,
        300,
        30,
        gelato.address,
        0,
    ]);

    const ProxyFactory = await ethers.getContractFactory("GMCoin");
    const proxyDeployTx = await ProxyFactory.getDeployTransaction(implementationAddress, initData);
    if (!proxyDeployTx.data) {
        throw new Error("Failed to encode GMCoin proxy init code");
    }
    await (await create3.deploy(proxySalt, proxyDeployTx.data)).wait();
    const proxyAddress = await create3.getDeployedAddress(proxySalt);
    const offlineAddress = predictCreate3DeployedAddress(factoryAddress, proxySalt);

    expect(proxyAddress).to.equal(offlineAddress);

    return { proxyAddress, factoryAddress };
}


