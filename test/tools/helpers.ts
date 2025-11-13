import { ethers, Interface } from 'ethers';
import fs from 'fs';
import path from 'path';

// Contract type enum
export enum ContractType {
    AccountManager = 'AccountManager',
    Minter = 'Minter',
    GMCoin = 'GMCoin',
    Treasury = 'Treasury',
}

// ABI paths for each contract
const ABI_PATHS = {
    [ContractType.AccountManager]: 'artifacts/contracts/AccountManager.sol/AccountManager.json',
    [ContractType.Minter]: 'artifacts/contracts/Minter.sol/Minter.json',
    [ContractType.GMCoin]: 'artifacts/contracts/GMCoin.sol/GMCoinImplementation.json',
    [ContractType.Treasury]: 'artifacts/contracts/Treasury.sol/GMTreasury.json',
};

/**
 * Load ABI from artifact file
 */
function loadABI(contractType: ContractType): any[] {
    const abiPath = ABI_PATHS[contractType];
    if (!fs.existsSync(abiPath)) {
        throw new Error(`ABI file not found for ${contractType}: ${abiPath}`);
    }
    const abiFile = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
    return abiFile.abi;
}

/**
 * Generate event log for a specific contract
 */
export function generateEventLogForContract(
    contractType: ContractType,
    eventName: string,
    params: any[]
): any {
    const abi = loadABI(contractType);
    const iface = new Interface(abi);
    const event = iface.getEvent(eventName);

    if (event == null) {
        throw new Error(`Event '${eventName}' not found in ${contractType} contract`);
    }

    const encodedLog = iface.encodeEventLog(event, params);

    return {
        address: "0xYourContractAddress",
        topics: encodedLog.topics,
        data: encodedLog.data,
        blockNumber: "0",
        transactionHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
        transactionIndex: "0",
        blockHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
        logIndex: "0",
        removed: false
    };
}

/**
 * Generate event log for AccountManager contract
 */
export function generateAccountManagerEventLog(eventName: string, params: any[]): any {
    return generateEventLogForContract(ContractType.AccountManager, eventName, params);
}

/**
 * Generate event log for Minter contract
 */
export function generateMinterEventLog(eventName: string, params: any[]): any {
    return generateEventLogForContract(ContractType.Minter, eventName, params);
}

/**
 * Generate event log for GMCoin contract
 */
export function generateGMCoinEventLog(eventName: string, params: any[]): any {
    return generateEventLogForContract(ContractType.GMCoin, eventName, params);
}

/**
 * Generate event log for Treasury contract
 */
export function generateTreasuryEventLog(eventName: string, params: any[]): any {
    return generateEventLogForContract(ContractType.Treasury, eventName, params);
}

// Specific event generators for AccountManager
export const AccountManagerEvents = {
    /**
     * Generate verifyTwitterByAuthCodeRequested event log
     * Note: Event name in contract is 'verifyTwitterByAuthCodeRequested' (lowercase v)
     * @param wallet - Wallet address
     * @param authCode - Auth code string
     * @param tweetID - Tweet ID string
     * @param twitterID - Twitter ID (uint256)
     */
    verifyTwitterByAuthCodeRequested: (wallet: string, authCode: string, tweetID: string, twitterID: string | number) => {
        // Event name in contract is 'VerifyTwitterByAuthCodeRequested' (capital V)
        return generateAccountManagerEventLog('VerifyTwitterByAuthCodeRequested', [
            wallet,
            authCode,
            tweetID,
            twitterID
        ]);
    },

    /**
     * Generate VerifyTwitterRequested event log
     * @param accessCodeEncrypted - Encrypted access code
     * @param twitterID - Twitter ID (uint256)
     * @param wallet - Wallet address
     */
    VerifyTwitterRequested: (accessCodeEncrypted: string, twitterID: string | number, wallet: string) => {
        return generateAccountManagerEventLog('VerifyTwitterRequested', [
            accessCodeEncrypted,
            twitterID,
            wallet
        ]);
    },

    /**
     * Generate TwitterVerificationResult event log
     * @param twitterID - Twitter ID (uint256)
     * @param wallet - Wallet address
     * @param isSuccess - Success flag
     * @param errorMsg - Error message (empty string if success)
     */
    TwitterVerificationResult: (twitterID: string | number, wallet: string, isSuccess: boolean, errorMsg: string) => {
        return generateAccountManagerEventLog('TwitterVerificationResult', [
            twitterID,
            wallet,
            isSuccess,
            errorMsg
        ]);
    },

    /**
     * Generate VerifyFarcasterRequested event log
     * @param farcasterFid - Farcaster FID (uint256)
     * @param wallet - Wallet address
     */
    VerifyFarcasterRequested: (farcasterFid: string | number, wallet: string) => {
        return generateAccountManagerEventLog('VerifyFarcasterRequested', [
            farcasterFid,
            wallet
        ]);
    },

    /**
     * Generate FarcasterVerificationResult event log
     * @param farcasterFid - Farcaster FID (uint256)
     * @param wallet - Wallet address
     * @param isSuccess - Success flag
     * @param errorMsg - Error message (empty string if success)
     */
    FarcasterVerificationResult: (farcasterFid: string | number, wallet: string, isSuccess: boolean, errorMsg: string) => {
        return generateAccountManagerEventLog('FarcasterVerificationResult', [
            farcasterFid,
            wallet,
            isSuccess,
            errorMsg
        ]);
    },

    /**
     * Generate UserCreated event log
     * @param userId - User ID (uint256)
     * @param primaryWallet - Primary wallet address
     * @param twitterId - Twitter ID (uint256, 0 if not linked)
     * @param farcasterFid - Farcaster FID (uint256, 0 if not linked)
     */
    UserCreated: (userId: string | number, primaryWallet: string, twitterId: string | number, farcasterFid: string | number) => {
        return generateAccountManagerEventLog('UserCreated', [
            userId,
            primaryWallet,
            twitterId,
            farcasterFid
        ]);
    },

    /**
     * Generate SocialAccountLinked event log
     * @param userId - User ID (uint256)
     * @param platform - Platform name (string)
     * @param platformId - Platform ID (uint256)
     */
    SocialAccountLinked: (userId: string | number, platform: string, platformId: string | number) => {
        return generateAccountManagerEventLog('SocialAccountLinked', [
            userId,
            platform,
            platformId
        ]);
    },

    /**
     * Generate WalletLinked event log
     * @param userId - User ID (uint256)
     * @param wallet - Wallet address
     */
    WalletLinked: (userId: string | number, wallet: string) => {
        return generateAccountManagerEventLog('WalletLinked', [
            userId,
            wallet
        ]);
    },

    /**
     * Generate HumanVerificationUpdated event log
     * @param userId - User ID (uint256)
     * @param verification - Human verification enum value (uint8)
     */
    HumanVerificationUpdated: (userId: string | number, verification: number) => {
        return generateAccountManagerEventLog('HumanVerificationUpdated', [
            userId,
            verification
        ]);
    },
};

// Specific event generators for Minter
export const MinterEvents = {
    /**
     * Generate NewEpochStarted event log
     */
    NewEpochStarted: (epochNumber: number, multiplicator: string | number, lastEpochPoints: string | number, lastEpochPointsTwitter: string | number, lastEpochPointsFarcaster: string | number) => {
        return generateMinterEventLog('NewEpochStarted', [
            epochNumber,
            multiplicator,
            lastEpochPoints,
            lastEpochPointsTwitter,
            lastEpochPointsFarcaster
        ]);
    },

    /**
     * Generate ChangedComplexity event log
     */
    ChangedComplexity: (newMultiplicator: string | number) => {
        return generateMinterEventLog('ChangedComplexity', [newMultiplicator]);
    },

    /**
     * Generate MintingProcessed event log
     */
    MintingProcessed: (platform: number, mintingDayTimestamp: number, batches: any[]) => {
        return generateMinterEventLog('MintingProcessed', [
            platform,
            mintingDayTimestamp,
            batches
        ]);
    },

    /**
     * Generate MintingErrored event log
     */
    MintingErrored: (platform: number, mintingDayTimestamp: number, errorBatches: any[]) => {
        return generateMinterEventLog('MintingErrored', [
            platform,
            mintingDayTimestamp,
            errorBatches
        ]);
    },

    /**
     * Generate MintingStarted event log
     */
    MintingStarted: (platform: number, mintingDayTimestamp: number) => {
        return generateMinterEventLog('MintingStarted', [
            platform,
            mintingDayTimestamp
        ]);
    },

    /**
     * Generate MintingFinished event log
     */
    MintingFinished: (platform: number, mintingDayTimestamp: number, runningHash: string) => {
        return generateMinterEventLog('MintingFinished', [
            platform,
            mintingDayTimestamp,
            runningHash
        ]);
    },

    /**
     * Generate MintingFinishedForAllPlatforms event log
     */
    MintingFinishedForAllPlatforms: (mintingDayTimestamp: number) => {
        return generateMinterEventLog('MintingFinishedForAllPlatforms', [mintingDayTimestamp]);
    },

    /**
     * Generate MintingFinished_UploadedToIPFS event log
     */
    MintingFinished_UploadedToIPFS: (platform: number, mintingDayTimestamp: number, finalHash: string, cid: string) => {
        return generateMinterEventLog('MintingFinished_UploadedToIPFS', [
            platform,
            mintingDayTimestamp,
            finalHash,
            cid
        ]);
    },
};

// Specific event generators for GMCoin
export const GMCoinEvents = {
    // Add GMCoin-specific events here when needed
};

// Specific event generators for Treasury
export const TreasuryEvents = {
    /**
     * Generate TokensWithdrawn event log
     */
    TokensWithdrawn: (owner: string, amount: string | number) => {
        return generateTreasuryEventLog('TokensWithdrawn', [owner, amount]);
    },

    /**
     * Generate TokenSet event log
     */
    TokenSet: (token: string) => {
        return generateTreasuryEventLog('TokenSet', [token]);
    },
};

// Legacy function for backward compatibility (deprecated - use AccountManagerEvents instead)
export async function generateEventLog(eventName: string, params: any[]): Promise<any> {
    console.warn('generateEventLog is deprecated. Use AccountManagerEvents.verifyTwitterByAuthCodeRequested() instead.');
    return AccountManagerEvents.verifyTwitterByAuthCodeRequested(
        params[0] as string,
        params[1] as string,
        params[2] as string,
        params[3] as string | number
    );
}

// Version that accepts a contract parameter (for backward compatibility)
export function generateEventLogFromContract(contract: any, eventName: string, params: any[]): any {
    const iface = contract.interface;
    const event = iface.getEvent(eventName);
    if (event == null) {
        throw Error('event not found');
    }

    const encodedLog = iface.encodeEventLog(event, params);

    return {
        address: "0xYourContractAddress",
        topics: encodedLog.topics,
        data: encodedLog.data,
        blockNumber: "0",
        transactionHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
        transactionIndex: "0",
        blockHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
        logIndex: "0",
        removed: false
    };
}

export async function writeEventLogFile(dirPath: string, eventName: string, params: any[]): Promise<void> {
    const log = await generateEventLog(eventName, params);

    // Convert log data to JSON string
    const logJson = JSON.stringify(log, null, 2);

    // Ensure the directory exists
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }

    // Define the file path
    const filePath = path.join(dirPath, 'log.json');

    console.log(`writing to ${filePath}..`);

    // Write the JSON string to log.json file
    try {
        await fs.promises.writeFile(filePath, logJson, 'utf8');
        console.log(`Log file created at: ${filePath}`);
    } catch (error: any) {
        console.error(`Failed to write log file: ${error.message}`);
    }
}
