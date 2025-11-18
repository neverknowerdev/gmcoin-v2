import { Batch, Result, Cast, w3fStorage, FarcasterAccountWithUsername } from "./consts";

export class Storage {
    private storage: w3fStorage;
    private mintingDayTimestamp: number;
    private static ACCOUNT_INFO_KEY_SUFFIX = "_accountInfo";

    constructor(storage: w3fStorage, mintingDayTimestamp: number) {
        this.storage = storage;
        this.mintingDayTimestamp = mintingDayTimestamp;
    }

    async clearAll() {
        const keys = await this.storage.getKeys();
        for (let i = 0; i < keys.length; i++) {
            if (keys[i].startsWith(`${this.mintingDayTimestamp}`)) {
                await this.storage.delete(keys[i]);
            }
        }
    }

    async loadUserResults(): Promise<Map<number, Result>> {
        const array = JSON.parse(await this.storage.get(`${this.mintingDayTimestamp}_userResults`) || '[]');
        return new Map<number, Result>(array)
    }

    async saveUserResults(userResults: Map<number, Result>) {
        const array = Array.from(userResults.entries()); // Convert Map to array of key-value pairs
        await this.storage.set(`${this.mintingDayTimestamp}_userResults`, JSON.stringify(array));
    }

    async clearBatchData(batch: Batch) {
        await this.storage.delete(`${this.mintingDayTimestamp}_accountsForBatch_${batch.startIndex}:${batch.endIndex}`);
    }

    async saveRemainingAccounts(accounts: FarcasterAccountWithUsername[]) {
        await this.storage.set(`${this.mintingDayTimestamp}_nextAccounts`, JSON.stringify(accounts));
    }

    async getRemainingAccounts(): Promise<FarcasterAccountWithUsername[]> {
        return Promise.resolve(JSON.parse(await this.storage.get(`${this.mintingDayTimestamp}_nextAccounts`) || '[]'))
    }

    async getIsFetchedLastUserIndex(): Promise<boolean> {
        return Promise.resolve(await this.storage.get(`${this.mintingDayTimestamp}_isFetchedLastUserIndex`) == 'true');
    }

    async setIsFetchedLastUserIndex(val: boolean) {
        await this.storage.set(`${this.mintingDayTimestamp}_isFetchedLastUserIndex`, val ? 'true' : 'false');
    }

    async setAccountsForBatch(startIndex: number, endIndex: number, accounts: FarcasterAccountWithUsername[]) {
        await this.storage.set(`${this.mintingDayTimestamp}_accountsForBatch_${startIndex}:${endIndex}`, JSON.stringify(accounts));
    }

    async getAccountsForBatch(startIndex: number, endIndex: number): Promise<FarcasterAccountWithUsername[]> {
        const res: FarcasterAccountWithUsername[] = JSON.parse(await this.storage.get(`${this.mintingDayTimestamp}_accountsForBatch_${startIndex}:${endIndex}`) || '[]');
        return Promise.resolve(res);
    }

    async saveMaxEndIndex(maxIndex: number) {
        await this.storage.set(`${this.mintingDayTimestamp}_maxEndIndex`, maxIndex.toString());
    }

    async getMaxEndIndex(): Promise<number> {
        return Promise.resolve(parseInt(await this.storage.get(`${this.mintingDayTimestamp}_maxEndIndex`) || '0'));
    }

    async getCastsToVerify(): Promise<Cast[]> {
        return JSON.parse(await this.storage.get(`${this.mintingDayTimestamp}_castsToVerify`) || '[]') as Cast[];
    }

    async saveCastsToVerify(casts: Cast[]) {
        await this.storage.set(`${this.mintingDayTimestamp}_castsToVerify`, JSON.stringify(casts));
    }

    async saveRunningHash(hash: string) {
        await this.storage.set(`${this.mintingDayTimestamp}_runningHash`, hash);
    }

    async getRunningHash(): Promise<string> {
        return await this.storage.get(`${this.mintingDayTimestamp}_runningHash`) || '';
    }

    async saveCastOrder(order: number) {
        await this.storage.set(`${this.mintingDayTimestamp}_castOrder`, order.toString());
    }

    async getCastOrder(): Promise<number> {
        return parseInt(await this.storage.get(`${this.mintingDayTimestamp}_castOrder`) || '0');
    }

    async loadAccountInfoMap(): Promise<Map<number, FarcasterAccountWithUsername>> {
        const raw = await this.storage.get(`${this.mintingDayTimestamp}${Storage.ACCOUNT_INFO_KEY_SUFFIX}`);
        if (!raw) {
            return new Map();
        }
        const parsed: Array<[number, FarcasterAccountWithUsername]> = JSON.parse(raw);
        return new Map(parsed);
    }

    async saveAccountInfoMap(map: Map<number, FarcasterAccountWithUsername>) {
        const array = Array.from(map.entries());
        await this.storage.set(`${this.mintingDayTimestamp}${Storage.ACCOUNT_INFO_KEY_SUFFIX}`, JSON.stringify(array));
    }

    async getMintingSettings(): Promise<string | undefined> {
        return await this.storage.get(`${this.mintingDayTimestamp}_mintingSettings`);
    }

    async saveMintingSettings(settings: string) {
        await this.storage.set(`${this.mintingDayTimestamp}_mintingSettings`, settings);
    }
}