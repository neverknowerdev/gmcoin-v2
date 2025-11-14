import { Contract } from "ethers";
import { TwitterRequester } from "./twitterRequester";
import { Storage } from "./storage";
import { Logger } from "./cloudwatch";
import { TwitterAccountWithUsername } from "./consts";

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

    async getNextAccounts(
        requester: TwitterRequester,
        startIndex: number,
        minRecords: number
    ): Promise<TwitterAccountWithUsername[]> {
        let accounts = await this.storage.getRemainingAccounts();

        if (accounts.length >= minRecords) {
            return accounts;
        }

        const isFetchedLastUser = await this.storage.getIsFetchedLastUserIndex();
        if (isFetchedLastUser) {
            return accounts;
        }

        this.logger.info(
            "fetching new Twitter accounts from AccountManager",
            startIndex,
            ACCOUNT_FETCH_LIMIT
        );

        const rawAccounts = await this.accountManager.getTwitterAcoountsInfo(
            startIndex,
            ACCOUNT_FETCH_LIMIT
        );

        this.logger.info("accounts fetched", rawAccounts.length);

        if (rawAccounts.length === 0) {
            await this.storage.setIsFetchedLastUserIndex(true);
            return accounts;
        }

        const twitterIds = rawAccounts.map((info: any) =>
            info.accountId.toString()
        );
        const usernames = await requester.convertToUsernames(twitterIds);

        const enrichedAccounts: TwitterAccountWithUsername[] = [];

        for (let i = 0; i < rawAccounts.length; i++) {
            const username = usernames[i];
            const wallet = rawAccounts[i].wallet as string;

            if (!username || username === "") {
                this.logger.warn(
                    `missing username for twitterId ${twitterIds[i]}, skipping`
                );
                continue;
            }
            if (!wallet || wallet === "0x0000000000000000000000000000000000000000") {
                this.logger.warn(
                    `missing wallet for twitterId ${twitterIds[i]}, skipping`
                );
                continue;
            }

            enrichedAccounts.push({
                twitterId: twitterIds[i],
                userId: rawAccounts[i].userId.toString(),
                primaryWallet: wallet,
                username: username,
            });
        }

        if (enrichedAccounts.length === 0) {
            this.logger.warn("no valid accounts fetched from AccountManager");
        }

        accounts = accounts.concat(enrichedAccounts);

        await this.storage.saveRemainingAccounts(accounts);

        if (rawAccounts.length < ACCOUNT_FETCH_LIMIT) {
            await this.storage.setIsFetchedLastUserIndex(true);
        }

        return accounts;
    }
}
