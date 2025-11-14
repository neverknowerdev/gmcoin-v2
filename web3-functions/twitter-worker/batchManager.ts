import { Batch, TwitterAccountWithUsername } from "./consts";
import { Storage } from "./storage";
import { SmartContractConnector } from "./smartContractConnector";
import { TwitterRequester } from "./twitterRequester";
import { Logger } from "./cloudwatch";

const MAX_TWITTER_SEARCH_QUERY_LENGTH = 512;
const KEYWORD = "gm";

export class BatchManager {
    private storage: Storage;
    private mintingDayTimestamp: number;
    private concurrencyLimit: number;
    private contractConnector: SmartContractConnector;
    private logger: Logger;
    private queryList: string[] = [];
    private userIndexByUsername: Map<string, number> = new Map();
    private accountInfoByUserIndex: Map<number, TwitterAccountWithUsername> = new Map();

    constructor(logger: Logger, storage: Storage, contractConnector: SmartContractConnector, mintingDayTimestamp: number, concurrencyLimit: number) {
        this.storage = storage;
        this.mintingDayTimestamp = mintingDayTimestamp;
        this.concurrencyLimit = concurrencyLimit;
        this.contractConnector = contractConnector;
        this.logger = logger;
    }

    async generateNewBatches(requester: TwitterRequester, mintingDayTimestamp: number, batches: Batch[]): Promise<{
        batchesToProcess: Batch[];
        queryList: string[];
        userIndexByUsername: Map<string, number>;
        accountInfoByUserIndex: Map<number, TwitterAccountWithUsername>;
    }> {
        // skip already done batches: nextCursor == '' && errorCount == 0
        batches = batches.filter(batch => !(batch.nextCursor == '' && batch.errorCount == 0))
            .sort((a, b) => Number(a.startIndex - b.startIndex));

        for (let i = 0; i < batches.length; i++) {
            this.logger.info(`restoreBatch`, i, batches[i]);
            const cur = batches[i];

            // cache userIDs for batches
            // fetch them here
            const batchAccounts = await this.storage.getAccountsForBatch(cur.startIndex, cur.endIndex);
            this.logger.info(`batchAccounts`, batchAccounts.length, batchAccounts);

            const generatedQuery = createUserQueryStringStatic(batchAccounts, mintingDayTimestamp, KEYWORD);
            this.queryList.push(generatedQuery);

            this.logger.info(`userIndexByUsername`, batchAccounts.length, cur.startIndex, batchAccounts);
            fillUserIndexByAccounts(this.logger, this.userIndexByUsername, this.accountInfoByUserIndex, batchAccounts, cur.startIndex);
        }

        if (batches.length < this.concurrencyLimit) {
            // console.log('generating new batches and queries..');
            const newCursorsCount = this.concurrencyLimit - batches.length;

            const maxEndIndex = await this.storage.getMaxEndIndex();
            let startIndex = maxEndIndex;

            this.logger.info(`generateNewBatches`, newCursorsCount);
            let remainingAccounts = await this.contractConnector.getNextAccounts(requester, startIndex, newCursorsCount * 50);
            this.logger.info(`remainingAccounts fetched from smart-contract`, remainingAccounts.length, remainingAccounts);

            for (let i = 0; i < newCursorsCount; i++) {
                if (remainingAccounts.length == 0) {
                    break;
                }

                this.logger.info(`generateNewBatches`, i, remainingAccounts.length);

                const {
                    queryString,
                    recordInsertedCount
                } = createUserQueryString(remainingAccounts, this.mintingDayTimestamp, MAX_TWITTER_SEARCH_QUERY_LENGTH, KEYWORD);

                if (recordInsertedCount == 0) {
                    break;
                }

                this.queryList.push(queryString);

                const newBatch: Batch = {
                    startIndex: startIndex,
                    endIndex: startIndex + recordInsertedCount,
                    nextCursor: '',
                    errorCount: 0,
                }

                if (newBatch.endIndex > maxEndIndex) {
                    await this.storage.saveMaxEndIndex(newBatch.endIndex);
                }

                startIndex += recordInsertedCount;

                batches.push(newBatch);

                const batchAccounts = remainingAccounts.slice(0, recordInsertedCount);

                this.logger.info(`batchAccounts`, batchAccounts.length, newBatch.startIndex, batchAccounts);
                fillUserIndexByAccounts(this.logger, this.userIndexByUsername, this.accountInfoByUserIndex, batchAccounts, newBatch.startIndex);

                await this.storage.setAccountsForBatch(newBatch.startIndex, newBatch.endIndex, batchAccounts);

                remainingAccounts = remainingAccounts.slice(recordInsertedCount);
                this.logger.info(`remainingAccounts final`, remainingAccounts.length, remainingAccounts);
            }

            await this.storage.saveRemainingAccounts(remainingAccounts);
        }

        return Promise.resolve({
            batchesToProcess: batches,
            queryList: this.queryList,
            userIndexByUsername: this.userIndexByUsername,
            accountInfoByUserIndex: this.accountInfoByUserIndex
        });
    }
}

function createUserQueryString(accounts: TwitterAccountWithUsername[], mintingDayTimestamp: number, maxLength: number, queryPrefix: string): {
    queryString: string;
    recordInsertedCount: number
} {
    const untilDayStr = formatDay(mintingDayTimestamp, 1);
    const sinceDayStr = formatDay(mintingDayTimestamp, 0);
    let queryString = `${queryPrefix} since:${sinceDayStr} until:${untilDayStr} AND (`;
    let ri = 0; // record inserted count

    let usernameAdded = 0;
    for (; ri < accounts.length; ri++) {
        const username = accounts[ri].username;
        if (username == '' || !username) {
            continue;
        }

        const nextPart = `from:${username}`;

        if (queryString.length + nextPart.length + 1 + 4 > maxLength) {
            break;
        }

        if (usernameAdded > 0) {
            queryString += ` OR `;
        }

        queryString += nextPart;
        usernameAdded++;
    }

    queryString += ')';

    // Close the final query string with parentheses
    return { queryString, recordInsertedCount: ri };
}

function createUserQueryStringStatic(accounts: TwitterAccountWithUsername[], mintingDayTimestamp: number, queryPrefix: string): string {
    const untilDayStr = formatDay(mintingDayTimestamp, 1);
    const sinceDayStr = formatDay(mintingDayTimestamp, 0);
    let queryString = `${queryPrefix} since:${sinceDayStr} until:${untilDayStr} AND (`;
    for (let i = 0; i < accounts.length; i++) {
        const username = accounts[i].username;
        if (!username || username == '') {
            continue;
        }

        if (i > 0) {
            queryString += ` OR `;
        }
        queryString += `from:${username}`;
    }

    queryString += `)`;

    return queryString;
}

function formatDay(timestamp: number, addDays: number): string {
    // Create a Date object from the timestamp
    const date = new Date(timestamp * 1000);
    if (addDays != 0) {
        date.setDate(date.getDate() + addDays);
    }

    // Use Intl.DateTimeFormat to format the date as "YYYY-MM-DD"
    const formatter = new Intl.DateTimeFormat('en-CA'); // 'en-CA' ensures "YYYY-MM-DD" format
    return formatter.format(date);
}

function fillUserIndexByAccounts(
    logger: Logger,
    userIndexByUsernames: Map<string, number>,
    accountInfoByUserIndex: Map<number, TwitterAccountWithUsername>,
    batchAccounts: TwitterAccountWithUsername[],
    startIndex: number
) {
    for (let i = 0; i < batchAccounts.length; i++) {
        const account = batchAccounts[i];
        if (!account.username || account.username == '') {
            continue;
        }

        const userIndex = startIndex + i;
        logger.info(`fillUserIndexByUsernames`, account.username, userIndex);
        userIndexByUsernames.set(account.username, userIndex);
        accountInfoByUserIndex.set(userIndex, {
            ...account,
            userIndex,
        });
    }
}