import { forEach } from "lodash";

export enum Platform {
    Twitter = 0,
    Farcaster = 1,
}

export const MinterABI = [
    {
        "inputs": [
            {
                "internalType": "uint8",
                "name": "platform",
                "type": "uint8"
            },
            {
                "internalType": "uint256",
                "name": "userPoints",
                "type": "uint256"
            },
            {
                "internalType": "uint32",
                "name": "mintingDayTimestamp",
                "type": "uint32"
            },
            {
                "components": [
                    {
                        "internalType": "uint64",
                        "name": "startIndex",
                        "type": "uint64"
                    },
                    {
                        "internalType": "uint64",
                        "name": "endIndex",
                        "type": "uint64"
                    },
                    {
                        "internalType": "string",
                        "name": "nextCursor",
                        "type": "string"
                    },
                    {
                        "internalType": "uint8",
                        "name": "errorCount",
                        "type": "uint8"
                    }
                ],
                "internalType": "struct Minter.Batch[]",
                "name": "batches",
                "type": "tuple[]"
            }
        ],
        "name": "processMintingBatches",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint8",
                "name": "platform",
                "type": "uint8"
            },
            {
                "internalType": "uint32",
                "name": "mintingDayTimestamp",
                "type": "uint32"
            },
            {
                "components": [
                    {
                        "internalType": "uint64",
                        "name": "startIndex",
                        "type": "uint64"
                    },
                    {
                        "internalType": "uint64",
                        "name": "endIndex",
                        "type": "uint64"
                    },
                    {
                        "internalType": "string",
                        "name": "nextCursor",
                        "type": "string"
                    },
                    {
                        "internalType": "uint8",
                        "name": "errorCount",
                        "type": "uint8"
                    }
                ],
                "internalType": "struct Minter.Batch[]",
                "name": "batches",
                "type": "tuple[]"
            }
        ],
        "name": "logErrorBatches",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint8",
                "name": "platform",
                "type": "uint8"
            },
            {
                "internalType": "uint32",
                "name": "mintingDayTimestamp",
                "type": "uint32"
            },
            {
                "internalType": "string",
                "name": "runningHash",
                "type": "string"
            }
        ],
        "name": "finishMinting",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getMintingSettings",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "pointsPerPost",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "pointsPerLike",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "pointsPerHashtag",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "pointsPerCashtag",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "coinsMultiplicator",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "uint8",
                "name": "platform",
                "type": "uint8"
            },
            {
                "indexed": true,
                "internalType": "uint32",
                "name": "mintingDayTimestamp",
                "type": "uint32"
            },
            {
                "components": [
                    {
                        "internalType": "uint64",
                        "name": "startIndex",
                        "type": "uint64"
                    },
                    {
                        "internalType": "uint64",
                        "name": "endIndex",
                        "type": "uint64"
                    },
                    {
                        "internalType": "string",
                        "name": "nextCursor",
                        "type": "string"
                    },
                    {
                        "internalType": "uint8",
                        "name": "errorCount",
                        "type": "uint8"
                    }
                ],
                "indexed": false,
                "internalType": "struct Minter.Batch[]",
                "name": "batches",
                "type": "tuple[]"
            }
        ],
        "name": "MintingProcessed",
        "type": "event"
    }
];

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
        "name": "getTwitterAcoountsInfo",
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

export const GMCoinABI = [
    {
        "inputs": [
            {
                "internalType": "address[]",
                "name": "to",
                "type": "address[]"
            },
            {
                "internalType": "uint256[]",
                "name": "amounts",
                "type": "uint256[]"
            }
        ],
        "name": "mintFromGelatoW3F",
        "outputs": [],
        "stateMutability": "nonpayable",
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

export interface Tweet {
    userIndex: number;
    userID: string;
    username: string;
    tweetID: string;
    tweetContent: string;
    likesCount: number;
    userDescriptionText: string;
}

export interface UserResult {
    rest_id: string; // This is the userID
    profile_bio: {
        description: string;
    };
    core: {
        name: string;
        screen_name: string;
    }
}

interface TwitterResultCore {
    user_results: {
        result: UserResult
    };
}

interface TweetLegacy {
    full_text: string; // The tweet content
    favorite_count: number; // The number of likes
    created_at: string;
}

export interface TwitterApiResponse {
    data: {
        search_by_raw_query: {
            search_timeline: {
                timeline: {
                    instructions: Array<{
                        entry?: {
                            content: {
                                cursor_type?: string,
                                value?: string
                            }
                        },
                        entries?: Array<{
                            content: {
                                cursor_type?: string,
                                value?: string,

                                content?: {
                                    tweet_results?: {
                                        rest_id: string; // This is the tweetID
                                        result: {
                                            rest_id?: string; // This
                                            core?: TwitterResultCore;
                                            tweet?: {
                                                rest_id?: string
                                                core: TwitterResultCore;
                                                legacy: TweetLegacy
                                            }
                                            legacy?: TweetLegacy
                                        };
                                    };
                                };
                            };
                        }>;
                    }>;
                };
            };
        };
    };
}

export interface w3fStorage {
    get(key: string): Promise<string | undefined>;

    set(key: string, value: string): Promise<void>;

    delete(key: string): Promise<void>;

    getKeys(): Promise<string[]>;

    getSize(): Promise<number>;
}


export enum TweetProcessingType {
    Skipped = 0,
    Simple = 1,
    Hashtag = 2,
    Cashtag = 3,
}

// Define the result structure
export interface Result {
    userIndex: number;
    hashtagTweets: number;
    cashtagTweets: number;
    simpleTweets: number;
    tweets: number;
    likes: number;
}

export const defaultResult: Result = {
    userIndex: 0,
    hashtagTweets: 0,
    cashtagTweets: 0,
    simpleTweets: 0,
    tweets: 0,
    likes: 0,
};

export interface TwitterAccountInfo {
    twitterId: string;
    userId: string;
    primaryWallet: string;
}

export interface TwitterAccountWithUsername extends TwitterAccountInfo {
    username: string;
    userIndex?: number;
}

export interface MintingSettings {
    pointsPerPost: bigint;
    pointsPerLike: bigint;
    pointsPerHashtag: bigint;
    pointsPerCashtag: bigint;
    coinsMultiplicator: bigint;
}