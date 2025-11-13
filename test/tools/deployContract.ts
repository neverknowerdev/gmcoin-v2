import { ethers, upgrades } from "hardhat";
import type { AccountManager } from "../../typechain-types";
import type { Minter } from "../../typechain-types";
import type { GMCoinImplementation } from "../../typechain-types";
import type { GMTreasury } from "../../typechain-types";

export interface DeployedContracts {
    accountManager: AccountManager;
    minter: Minter;
    gmCoin: GMCoinImplementation;
    treasury: GMTreasury;
    owner: any;
    feeAddr: any;
    treasuryAddr: any;
    gelatoAddr: any;
    relayerServerAcc: any;
    otherAcc1: any;
    otherAcc2: any;
    coinsMultiplicator: number;
}

/**
 * Deploys AccountManager with proxy pattern
 */
export async function deployAccountManager(
    gelatoDedicatedMsgSender: string,
    timeDelay: number = 0,
    deployer?: any
): Promise<AccountManager> {
    const signers = await ethers.getSigners();
    const deployerSigner = deployer || signers[0];

    // Deploy implementation (no library linking needed - all library functions are internal)
    const AccountManagerFactory = await ethers.getContractFactory("AccountManager");
    const implementation = await AccountManagerFactory.deploy();
    await implementation.waitForDeployment();
    const implementationAddress = await implementation.getAddress();

    // Encode initializer call
    const initData = AccountManagerFactory.interface.encodeFunctionData("initialize", [
        gelatoDedicatedMsgSender,
        timeDelay,
    ]);

    // Deploy proxy
    const GMAccountManagerFactory = await ethers.getContractFactory("GMAccountManager");
    const proxy = await GMAccountManagerFactory.deploy(implementationAddress, initData);
    await proxy.waitForDeployment();
    const proxyAddress = await proxy.getAddress();

    // Return contract instance attached to proxy
    return AccountManagerFactory.attach(proxyAddress) as unknown as AccountManager;
}

/**
 * Deploys Minter with proxy pattern
 * Note: Minter doesn't have an initialize function, only __TwitterOracle__init
 * We deploy the proxy with __TwitterOracle__init call, but note that parent contracts
 * (OwnableUpgradeable, UUPSUpgradeable) may not be fully initialized.
 * This might need to be fixed in the contract itself.
 */
export async function deployMinter(
    coinsPerPost: number,
    gelatoAddress: string,
    epochDays: number,
    deployer?: any
): Promise<Minter> {
    const signers = await ethers.getSigners();
    const deployerSigner = deployer || signers[0];

    // Deploy implementation
    const MinterFactory = await ethers.getContractFactory("Minter");
    const implementation = await MinterFactory.deploy();
    await implementation.waitForDeployment();
    const implementationAddress = await implementation.getAddress();

    // Encode __TwitterOracle__init call
    // Note: This won't initialize parent contracts (OwnableUpgradeable, UUPSUpgradeable)
    // The contract may need an initialize function that calls parent initializers
    const initData = MinterFactory.interface.encodeFunctionData("initialize", [
        coinsPerPost,
        gelatoAddress,
        epochDays,
    ]);

    // Deploy proxy using GMMinter factory
    const GMMinterFactory = await ethers.getContractFactory("GMMinter");
    const proxy = await GMMinterFactory.deploy(implementationAddress, initData);
    await proxy.waitForDeployment();
    const proxyAddress = await proxy.getAddress();

    // Return contract instance attached to proxy
    return MinterFactory.attach(proxyAddress) as unknown as Minter;
}

/**
 * Deploys GMCoin with proxy pattern
 */
export async function deployGMCoin(
    owner: string,
    feeAddress: string,
    treasuryAddress: string,
    coinsMultiplicator: number,
    epochDays: number,
    gelatoDedicatedMsgSender: string,
    timeDelay: number = 0,
    deployer?: any
): Promise<GMCoinImplementation> {
    const signers = await ethers.getSigners();
    const deployerSigner = deployer || signers[0];

    // Deploy implementation
    const GMCoinFactory = await ethers.getContractFactory("GMCoinImplementation");
    const gmCoinContract = await upgrades.deployProxy(
        GMCoinFactory,
        [
            owner,
            feeAddress,
            treasuryAddress,
            coinsMultiplicator,
            epochDays,
            gelatoDedicatedMsgSender,
            timeDelay,
        ],
        {
            kind: "uups",
        }
    ) as unknown as GMCoinImplementation;
    await gmCoinContract.waitForDeployment();

    return gmCoinContract;
}

/**
 * Deploys Treasury (regular contract, not upgradeable)
 */
export async function deployTreasury(deployer?: any): Promise<GMTreasury> {
    const signers = await ethers.getSigners();
    const deployerSigner = deployer || signers[0];

    const TreasuryFactory = await ethers.getContractFactory("GMTreasury");
    const treasury = await TreasuryFactory.deploy();
    await treasury.waitForDeployment();

    return treasury as unknown as GMTreasury;
}

/**
 * Main deployment function that deploys all contracts separately
 */
export async function deployAllContracts(
    epochDays: number = 2,
    coinsMultiplicator: number = 1_000_000,
    timeDelay: number = 0
): Promise<DeployedContracts> {
    const signers = await ethers.getSigners();
    if (signers.length < 7) {
        throw new Error(`Not enough signers available. Got ${signers.length}, need at least 7 signers.`);
    }
    const [owner, feeAddr, treasuryAddr, gelatoAddr, relayerServerAcc, otherAcc1, otherAcc2] = signers;

    // Deploy AccountManager
    const accountManager = await deployAccountManager(
        gelatoAddr.address,
        timeDelay,
        owner
    );

    // Deploy Minter
    // coinsPerPost is calculated from coinsMultiplicator
    // coinsMultiplicator = coinsPerPost * 10^18, so coinsPerPost = coinsMultiplicator / 10^18
    const coinsPerPost = 100;
    const minter = await deployMinter(
        coinsPerPost,
        gelatoAddr.address,
        epochDays,
        owner
    );

    // Deploy GMCoin
    const gmCoin = await deployGMCoin(
        owner.address,
        feeAddr.address,
        treasuryAddr.address,
        coinsMultiplicator,
        epochDays,
        gelatoAddr.address,
        timeDelay,
        owner
    );

    // Deploy Treasury
    const treasury = await deployTreasury(owner);

    return {
        accountManager,
        minter,
        gmCoin,
        treasury,
        owner,
        feeAddr,
        treasuryAddr,
        gelatoAddr,
        relayerServerAcc,
        otherAcc1,
        otherAcc2,
        coinsMultiplicator,
    };
}

