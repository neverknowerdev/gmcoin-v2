import { Batch, FarcasterAccountWithUsername } from "./consts";
import { Storage } from "./storage";
import { SmartContractConnector } from "./smartContractConnector";
import { FarcasterRequester } from "./farcasterRequester";
import { Logger } from "../twitter-worker/cloudwatch";

const MAX_FIDS_PER_BATCH = 100; // Neynar API limit
const KEYWORD = "gm";

export class BatchManager {
    private storage: Storage;
    private mintingDayTimestamp: number;
    private concurrencyLimit: number;
    private contractConnector: SmartContractConnector;
    private logger: Logger;
    private fidBatches: number[][] = [];
    private userIndexByFID: Map<number, number> = new Map();
    private accountInfoByUserIndex: Map<number, FarcasterAccountWithUsername> = new Map();

    constructor(logger: Logger, storage: Storage, contractConnector: SmartContractConnector, mintingDayTimestamp: number, concurrencyLimit: number) {
        this.storage = storage;
        this.mintingDayTimestamp = mintingDayTimestamp;
        this.concurrencyLimit = concurrencyLimit;
        this.contractConnector = contractConnector;
        this.logger = logger;
    }

    async generateNewBatches(requester: FarcasterRequester, mintingDayTimestamp: number, batches: Batch[]): Promise<{
        batchesToProcess: Batch[];
        fidBatches: number[][];
        userIndexByFID: Map<number, number>;
        accountInfoByUserIndex: Map<number, FarcasterAccountWithUsername>;
    }> {
        // Skip already done batches: nextCursor == '' && errorCount == 0
        batches = batches.filter(batch => !(batch.nextCursor == '' && batch.errorCount == 0))
            .sort((a, b) => Number(a.startIndex - b.startIndex));

        for (let i = 0; i < batches.length; i++) {
            this.logger.info(`restoreBatch`, i, batches[i]);
            const cur = batches[i];

            // Cache FIDs for batches
            const batchAccounts = await this.storage.getAccountsForBatch(cur.startIndex, cur.endIndex);
            const batchFIDs = batchAccounts.map((account) => parseInt(account.fid));
            this.logger.info(`batchFIDs`, batchFIDs.length, batchFIDs);

            this.fidBatches.push(batchFIDs);
            fillUserIndexByFIDs(this.logger, this.userIndexByFID, this.accountInfoByUserIndex, batchAccounts, cur.startIndex);
        }

        if (batches.length < this.concurrencyLimit) {
            const newBatchesCount = this.concurrencyLimit - batches.length;
            const maxEndIndex = await this.storage.getMaxEndIndex();
            let startIndex = maxEndIndex;

            this.logger.info(`generateNewBatches`, newBatchesCount);
            let remainingAccounts = await this.contractConnector.getNextAccounts(startIndex, newBatchesCount * MAX_FIDS_PER_BATCH);
            this.logger.info(`remainingAccounts fetched from smart-contract`, remainingAccounts.length, remainingAccounts);

            for (let i = 0; i < newBatchesCount; i++) {
                if (remainingAccounts.length == 0) {
                    break;
                }

                this.logger.info(`generateNewBatches`, i, remainingAccounts.length);

                const { accountBatch, recordInsertedCount } = createAccountBatch(remainingAccounts, MAX_FIDS_PER_BATCH);
                const fidBatch = accountBatch.map((account) => parseInt(account.fid));

                if (recordInsertedCount == 0) {
                    break;
                }

                this.fidBatches.push(fidBatch);

                const endIndex = startIndex + recordInsertedCount;
                fillUserIndexByFIDs(this.logger, this.userIndexByFID, this.accountInfoByUserIndex, accountBatch, startIndex);

                await this.storage.setAccountsForBatch(startIndex, endIndex, accountBatch);

                const newBatch: Batch = {
                    startIndex: startIndex,
                    endIndex: endIndex,
                    nextCursor: '',
                    errorCount: 0
                };

                batches.push(newBatch);
                startIndex = endIndex;

                remainingAccounts = remainingAccounts.slice(recordInsertedCount);
            }

            await this.storage.saveRemainingAccounts(remainingAccounts);
        }

        return Promise.resolve({
            batchesToProcess: batches,
            fidBatches: this.fidBatches,
            userIndexByFID: this.userIndexByFID,
            accountInfoByUserIndex: this.accountInfoByUserIndex
        });
    }
}

function createAccountBatch(accounts: FarcasterAccountWithUsername[], maxBatchSize: number): {
    accountBatch: FarcasterAccountWithUsername[];
    recordInsertedCount: number;
} {
    const accountBatch: FarcasterAccountWithUsername[] = [];
    let count = 0;

    for (let i = 0; i < accounts.length && count < maxBatchSize; i++) {
        accountBatch.push(accounts[i]);
        count++;
    }

    return {
        accountBatch,
        recordInsertedCount: count
    };
}

function fillUserIndexByFIDs(
    logger: Logger,
    userIndexByFID: Map<number, number>,
    accountInfoByUserIndex: Map<number, FarcasterAccountWithUsername>,
    accounts: FarcasterAccountWithUsername[],
    startIndex: number
) {
    for (let i = 0; i < accounts.length; i++) {
        const userIndex = startIndex + i;
        const fid = parseInt(accounts[i].fid);
        userIndexByFID.set(fid, userIndex);
        accountInfoByUserIndex.set(userIndex, {
            ...accounts[i],
            userIndex,
        });
        logger.info(`userIndexByFID.set(${fid}, ${userIndex})`);
    }
}