export { MinterABI, GMCoinABI, Platform, MintingSettings } from "../twitter-worker/consts";

export const AccountManagerABI = [
    {
        "inputs": [
            {
                "internalType": "uint64",
                "name": "start",
                "type": "uint64"
            },
            {
                "internalType": "uint16",
                "name": "count",
                "type": "uint16"
            }
        ],
        "name": "getFarcasterAccountsInfo",
        "outputs": [
            {
                "components": [
                    {
                        "internalType": "address",
                        "name": "wallet",
                        "type": "address"
                    },
                    {
                        "internalType": "uint256",
                        "name": "accountId",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "userId",
                        "type": "uint256"
                    }
                ],
                "internalType": "struct AccountManager.UserAccountInfo[]",
                "name": "",
                "type": "tuple[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

export interface Batch {
    startIndex: number;
    endIndex: number;
    nextCursor: string;
    errorCount: number;
}

export function BatchToString(initBatches: Batch[]): string {
    let res: string = '';
    for (const batch of initBatches) {
        res += `[${batch.startIndex},${batch.endIndex},${batch.nextCursor},${batch.errorCount}],`
    }
    return '[' + res + ']';
}

export interface Cast {
    userIndex: number;
    fid: number;
    username: string;
    castHash: string;
    castContent: string;
    likesCount: number;
    recastsCount: number;
    timestamp: string;
}

export interface NeynarApiResponse {
    casts: Array<{
        hash: string;
        parent_hash?: string;
        parent_url?: string;
        root_parent_url?: string;
        parent_author?: {
            fid: number;
        };
        author: {
            object: string;
            fid: number;
            custody_address: string;
            username: string;
            display_name: string;
            pfp_url: string;
            profile: {
                bio: {
                    text: string;
                };
            };
            follower_count: number;
            following_count: number;
            verifications: string[];
            verified_addresses: {
                eth_addresses: string[];
                sol_addresses: string[];
            };
            active_status: string;
            power_badge: boolean;
        };
        text: string;
        timestamp: string;
        embeds: Array<{
            url: string;
            cast_id?: {
                fid: number;
                hash: string;
            };
        }>;
        reactions: {
            likes_count: number;
            recasts_count: number;
            likes: Array<{
                fid: number;
                fname: string;
            }>;
            recasts: Array<{
                fid: number;
                fname: string;
                timestamp: string;
            }>;
        };
        replies: {
            count: number;
        };
        channel?: {
            object: string;
            id: string;
            name: string;
            description: string;
            image_url: string;
            created_at: number;
            parent_url: string;
            url: string;
            lead_fid: number;
            moderator_fids: number[];
            member_count: number;
        };
        mentioned_profiles: Array<{
            object: string;
            fid: number;
            custody_address: string;
            username: string;
            display_name: string;
            pfp_url: string;
            profile: {
                bio: {
                    text: string;
                };
            };
        }>;
    }>;
    next_cursor?: string;
}

export interface w3fStorage {
    get(key: string): Promise<string | undefined>;
    set(key: string, value: string): Promise<void>;
    delete(key: string): Promise<void>;
    getKeys(): Promise<string[]>;
    getSize(): Promise<number>;
}

export enum CastProcessingType {
    Skipped = 0,
    Simple = 1,
    Hashtag = 2,
    Cashtag = 3,
}

// Define the result structure for Farcaster users
export interface Result {
    userIndex: number;
    hashtagCasts: number;
    cashtagCasts: number;
    simpleCasts: number;
    casts: number;
    likes: number;
}

export const defaultResult: Result = {
    userIndex: 0,
    hashtagCasts: 0,
    cashtagCasts: 0,
    simpleCasts: 0,
    casts: 0,
    likes: 0,
};

export interface FarcasterAccountInfo {
    fid: string;
    userId: string;
    primaryWallet: string;
}

export interface FarcasterAccountWithUsername extends FarcasterAccountInfo {
    username: string;
    userIndex?: number;
}