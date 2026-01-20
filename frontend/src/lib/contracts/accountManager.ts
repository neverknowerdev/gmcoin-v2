// Contract ABI - extracted from artifacts/contracts/AccountManager.sol/AccountManager.json
export const ACCOUNT_MANAGER_ABI = [
  {
    inputs: [
      {
        internalType: "string",
        name: "authCode",
        type: "string",
      },
      {
        internalType: "uint256",
        name: "twitterID",
        type: "uint256",
      },
      {
        internalType: "string",
        name: "tweetID",
        type: "string",
      },
    ],
    name: "requestTwitterVerificationByAuthCode",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "farcasterFid",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "wallet",
        type: "address",
      },
    ],
    name: "requestFarcasterVerification",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "attestationUID",
        type: "bytes32",
      },
    ],
    name: "requestCoinbaseVerification",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "wallet",
        type: "address",
      },
      {
        indexed: false,
        internalType: "string",
        name: "authCode",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "tweetID",
        type: "string",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "twitterID",
        type: "uint256",
      },
    ],
    name: "VerifyTwitterByAuthCodeRequested",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "farcasterFid",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "wallet",
        type: "address",
      },
    ],
    name: "VerifyFarcasterRequested",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "twitterID",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "wallet",
        type: "address",
      },
      {
        indexed: false,
        internalType: "bool",
        name: "isSuccess",
        type: "bool",
      },
      {
        indexed: false,
        internalType: "string",
        name: "errorMsg",
        type: "string",
      },
    ],
    name: "TwitterVerificationResult",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "farcasterFid",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "wallet",
        type: "address",
      },
      {
        indexed: false,
        internalType: "bool",
        name: "isSuccess",
        type: "bool",
      },
      {
        indexed: false,
        internalType: "string",
        name: "errorMsg",
        type: "string",
      },
    ],
    name: "FarcasterVerificationResult",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "wallet",
        type: "address",
      },
      {
        indexed: false,
        internalType: "bytes32",
        name: "attestationUID",
        type: "bytes32",
      },
    ],
    name: "VerifyCoinbaseRequested",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "wallet",
        type: "address",
      },
      {
        indexed: false,
        internalType: "bytes32",
        name: "attestationUID",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "bool",
        name: "isSuccess",
        type: "bool",
      },
      {
        indexed: false,
        internalType: "string",
        name: "errorMsg",
        type: "string",
      },
    ],
    name: "CoinbaseVerificationResult",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "twitterID",
        type: "uint256",
      },
    ],
    name: "getUserByTwitterID",
    outputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "userId",
            type: "uint256",
          },
          {
            internalType: "address",
            name: "primaryWallet",
            type: "address",
          },
          {
            internalType: "enum AccountManager.HumanVerification",
            name: "humanVerification",
            type: "uint8",
          },
          {
            internalType: "uint32",
            name: "createdAt",
            type: "uint32",
          },
          {
            internalType: "uint256",
            name: "twitterId",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "farcasterFid",
            type: "uint256",
          },
          {
            internalType: "bytes32",
            name: "coinbaseAttestationUID",
            type: "bytes32",
          },
        ],
        internalType: "struct AccountManager.UnifiedUser",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "farcasterFID",
        type: "uint256",
      },
    ],
    name: "getUserByFarcasterFID",
    outputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "userId",
            type: "uint256",
          },
          {
            internalType: "address",
            name: "primaryWallet",
            type: "address",
          },
          {
            internalType: "enum AccountManager.HumanVerification",
            name: "humanVerification",
            type: "uint8",
          },
          {
            internalType: "uint32",
            name: "createdAt",
            type: "uint32",
          },
          {
            internalType: "uint256",
            name: "twitterId",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "farcasterFid",
            type: "uint256",
          },
          {
            internalType: "bytes32",
            name: "coinbaseAttestationUID",
            type: "bytes32",
          },
        ],
        internalType: "struct AccountManager.UnifiedUser",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "wallet",
        type: "address",
      },
    ],
    name: "getUserByWallet",
    outputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "userId",
            type: "uint256",
          },
          {
            internalType: "address",
            name: "primaryWallet",
            type: "address",
          },
          {
            internalType: "enum AccountManager.HumanVerification",
            name: "humanVerification",
            type: "uint8",
          },
          {
            internalType: "uint32",
            name: "createdAt",
            type: "uint32",
          },
          {
            internalType: "uint256",
            name: "twitterId",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "farcasterFid",
            type: "uint256",
          },
          {
            internalType: "bytes32",
            name: "coinbaseAttestationUID",
            type: "bytes32",
          },
        ],
        internalType: "struct AccountManager.UnifiedUser",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  // Custom errors
  {
    inputs: [],
    name: "UserNotExist",
    type: "error",
  },
  {
    inputs: [],
    name: "UserAlreadyLinked",
    type: "error",
  },
  {
    inputs: [],
    name: "WalletAlreadyLinked",
    type: "error",
  },
  {
    inputs: [],
    name: "WalletAlreadyLinkedToFid",
    type: "error",
  },
  {
    inputs: [],
    name: "FarcasterAccountAlreadyLinked",
    type: "error",
  },
  {
    inputs: [],
    name: "InvalidSignature",
    type: "error",
  },
  {
    inputs: [],
    name: "WalletAlreadyRegistered",
    type: "error",
  },
  {
    inputs: [],
    name: "CallerNotRegistered",
    type: "error",
  },
  {
    inputs: [],
    name: "FromUserNotExist",
    type: "error",
  },
  {
    inputs: [],
    name: "ToUserNotExist",
    type: "error",
  },
  {
    inputs: [],
    name: "CannotMergeSameUser",
    type: "error",
  },
  {
    inputs: [],
    name: "TwitterIdAlreadyLinked",
    type: "error",
  },
  {
    inputs: [],
    name: "FarcasterFidAlreadyLinked",
    type: "error",
  },
  {
    inputs: [],
    name: "WalletNotLinked",
    type: "error",
  },
  {
    inputs: [],
    name: "CannotRemoveUserActiveWorkers",
    type: "error",
  },
  {
    inputs: [],
    name: "GelatoOnly",
    type: "error",
  },
] as const;

// Contract address - should be set via environment variable
export const ACCOUNT_MANAGER_ADDRESS = (process.env.NEXT_PUBLIC_ACCOUNT_MANAGER_ADDRESS ||
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

