import { Contract } from "ethers";
import { Storage } from "./storage";
import { Logger } from "../twitter-worker/cloudwatch";
import { FarcasterAccountWithUsername } from "./consts";

const ACCOUNT_FETCH_LIMIT = 1000;

export class SmartContractConnector {
    private accountManager: Contract;
    private storage: Storage;
    private logger: Logger;

    constructor(accountManager: Contract, storage: Storage, logger: Logger) {
        this.accountManager = accountManager;
        this.storage = storage;
        this.logger = logger;
    }

    async getNextAccounts(startIndex: number, minRecords: number): Promise<FarcasterAccountWithUsername[]> {
        let accounts = await this.storage.getRemainingAccounts();

        if (accounts.length >= minRecords) {
            return accounts;
        }

        const isFetchedLastUser = await this.storage.getIsFetchedLastUserIndex();
        if (isFetchedLastUser) {
            return accounts;
        }

        this.logger.info(
            "fetching new Farcaster accounts from AccountManager",
            startIndex,
            ACCOUNT_FETCH_LIMIT
        );

        const rawAccounts = await this.accountManager.getFarcasterAccountsInfo(
            startIndex,
            ACCOUNT_FETCH_LIMIT
        );

        if (rawAccounts.length === 0) {
            await this.storage.setIsFetchedLastUserIndex(true);
            return accounts;
        }

        const enrichedAccounts: FarcasterAccountWithUsername[] = [];
        for (const info of rawAccounts) {
            const wallet = info.wallet as string;
            if (!wallet || wallet === "0x0000000000000000000000000000000000000000") {
                this.logger.warn(`Skipping Farcaster account ${info.accountId} due to missing wallet`);
                continue;
            }
            enrichedAccounts.push({
                fid: info.accountId.toString(),
                userId: info.userId.toString(),
                primaryWallet: wallet,
                username: "",
            });
        }

        accounts = accounts.concat(enrichedAccounts);

        await this.storage.saveRemainingAccounts(accounts);

        if (rawAccounts.length < ACCOUNT_FETCH_LIMIT) {
            await this.storage.setIsFetchedLastUserIndex(true);
        }

        return accounts;
    }
}
