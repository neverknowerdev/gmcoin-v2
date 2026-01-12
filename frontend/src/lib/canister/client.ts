import { Actor, HttpAgent } from '@dfinity/agent';
import { IDL } from '@dfinity/candid';
import { Principal } from '@dfinity/principal';

// Canister ID from canister_ids.json
// Mainnet canister: ylges-qaaaa-aaaal-qtlsq-cai
const CANISTER_ID = process.env.NEXT_PUBLIC_ICP_CANISTER_ID || 'ylges-qaaaa-aaaal-qtlsq-cai';
const IC_HOST = process.env.NEXT_PUBLIC_IC_HOST || 'https://icp-api.io';

// Candid interface for the canister - matches gm-account-manager-canister.did
const canisterIdlFactory = () => {
  return IDL.Service({
    // Query methods
    evmWalletAddress: IDL.Func([], [IDL.Text], ['query']),
    encryptionPublicKey: IDL.Func([], [IDL.Text], ['query']),
    getUser: IDL.Func(
      [IDL.Nat64],
      [IDL.Opt(IDL.Record({
        userId: IDL.Nat64,
        chains: IDL.Vec(IDL.Text),
        twitterId: IDL.Nat64,
        farcasterId: IDL.Nat64,
        isVerified: IDL.Bool,
        verifications: IDL.Vec(IDL.Text),
        primaryWallet: IDL.Text,
        primaryChain: IDL.Text,
        wallets: IDL.Vec(IDL.Record({
          wallet: IDL.Text,
          chain: IDL.Text,
        })),
      }))],
      ['query']
    ),
    getUserByTwitterId: IDL.Func(
      [IDL.Nat64],
      [IDL.Opt(IDL.Record({
        userId: IDL.Nat64,
        chains: IDL.Vec(IDL.Text),
        twitterId: IDL.Nat64,
        farcasterId: IDL.Nat64,
        isVerified: IDL.Bool,
        verifications: IDL.Vec(IDL.Text),
        primaryWallet: IDL.Text,
        primaryChain: IDL.Text,
        wallets: IDL.Vec(IDL.Record({
          wallet: IDL.Text,
          chain: IDL.Text,
        })),
      }))],
      ['query']
    ),
    getUserByFarcasterId: IDL.Func(
      [IDL.Nat64],
      [IDL.Opt(IDL.Record({
        userId: IDL.Nat64,
        chains: IDL.Vec(IDL.Text),
        twitterId: IDL.Nat64,
        farcasterId: IDL.Nat64,
        isVerified: IDL.Bool,
        verifications: IDL.Vec(IDL.Text),
        primaryWallet: IDL.Text,
        primaryChain: IDL.Text,
        wallets: IDL.Vec(IDL.Record({
          wallet: IDL.Text,
          chain: IDL.Text,
        })),
      }))],
      ['query']
    ),
    getUsers: IDL.Func(
      [IDL.Vec(IDL.Nat64)],
      [IDL.Vec(IDL.Record({
        userId: IDL.Nat64,
        chains: IDL.Vec(IDL.Text),
        twitterId: IDL.Nat64,
        farcasterId: IDL.Nat64,
        isVerified: IDL.Bool,
        verifications: IDL.Vec(IDL.Text),
        primaryWallet: IDL.Text,
        primaryChain: IDL.Text,
        wallets: IDL.Vec(IDL.Record({
          wallet: IDL.Text,
          chain: IDL.Text,
        })),
      }))],
      ['query']
    ),
    getTwitterUsers: IDL.Func(
      [IDL.Nat32, IDL.Nat64, IDL.Nat64],
      [IDL.Vec(IDL.Record({
        userId: IDL.Nat64,
        accountId: IDL.Nat64,
        walletAddress: IDL.Text,
      }))],
      ['query']
    ),
    getFarcasterUsers: IDL.Func(
      [IDL.Nat32, IDL.Nat64, IDL.Nat64],
      [IDL.Vec(IDL.Record({
        userId: IDL.Nat64,
        accountId: IDL.Nat64,
        walletAddress: IDL.Text,
      }))],
      ['query']
    ),
    getTransactionStatus: IDL.Func([IDL.Nat32, IDL.Text], [IDL.Text], ['query']),
    
    // Update methods
    handleEvent: IDL.Func([IDL.Nat32, IDL.Text], [IDL.Null], []),
    initEvmWalletAddress: IDL.Func([], [IDL.Text], []),
    setContractAddresses: IDL.Func(
      [IDL.Record({
        contracts: IDL.Record({
          'Base Mainnet': IDL.Record({
            accountManager: IDL.Text,
            GMCoin: IDL.Opt(IDL.Text),
          }),
          'WorldChain': IDL.Record({
            accountManager: IDL.Text,
            GMCoin: IDL.Opt(IDL.Text),
          }),
        }),
      })],
      [IDL.Null],
      []
    ),
    setTwitterConfig: IDL.Func(
      [IDL.Record({
        tweetFetchURLEncrypted: IDL.Text,
        headerNameEncrypted: IDL.Text,
        bearerTokenEncrypted: IDL.Text,
      })],
      [IDL.Null],
      []
    ),
    setFarcasterConfig: IDL.Func(
      [IDL.Record({
        apiKeyEncrypted: IDL.Text,
        apiUrl: IDL.Opt(IDL.Text),
      })],
      [IDL.Null],
      []
    ),
  });
};

export interface ContractAddressesConfig {
  contracts: {
    'Base Mainnet': {
      accountManager: string;
      GMCoin?: string;
    };
    'WorldChain': {
      accountManager: string;
      GMCoin?: string;
    };
  };
}

export interface User {
  userId: bigint;
  chains: string[];
  twitterId: bigint;
  farcasterId: bigint;
  isVerified: boolean;
  verifications: string[];
  primaryWallet: string;
  primaryChain: string;
  wallets: Array<{ wallet: string; chain: string }>;
}

export interface CanisterActor {
  // Query methods
  evmWalletAddress: () => Promise<string>;
  encryptionPublicKey: () => Promise<string>;
  getUser: (userId: bigint) => Promise<User | []>;
  getUserByTwitterId: (twitterId: bigint) => Promise<User | []>;
  getUserByFarcasterId: (farcasterId: bigint) => Promise<User | []>;
  getUsers: (userIds: bigint[]) => Promise<User[]>;
  getTwitterUsers: (chainId: number, startIndex: bigint, limit: bigint) => Promise<Array<{ userId: bigint; accountId: bigint; walletAddress: string }>>;
  getFarcasterUsers: (chainId: number, startIndex: bigint, limit: bigint) => Promise<Array<{ userId: bigint; accountId: bigint; walletAddress: string }>>;
  getTransactionStatus: (chainId: number, txHash: string) => Promise<string>;
  
  // Update methods
  handleEvent: (chainId: number, transactionId: string) => Promise<void>;
  initEvmWalletAddress: () => Promise<string>;
  setContractAddresses: (config: ContractAddressesConfig) => Promise<void>;
  setTwitterConfig: (config: { tweetFetchURLEncrypted: string; headerNameEncrypted: string; bearerTokenEncrypted: string }) => Promise<void>;
  setFarcasterConfig: (config: { apiKeyEncrypted: string; apiUrl?: string }) => Promise<void>;
}

/**
 * Creates an actor to interact with the ICP canister
 * For server-side use only (no authentication needed for handleEvent)
 */
export async function createCanisterActor(): Promise<CanisterActor> {
  const agent = new HttpAgent({
    host: IC_HOST,
  });

  // For production, verify the canister
  if (IC_HOST.includes('icp-api.io') || IC_HOST.includes('ic0.app')) {
    await agent.fetchRootKey();
  }

  const canisterPrincipal = Principal.fromText(CANISTER_ID);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actor = Actor.createActor<CanisterActor>(canisterIdlFactory as any, {
    agent,
    canisterId: canisterPrincipal,
  });

  return actor;
}

/**
 * Calls the canister to handle an event from a smart contract transaction
 * @param chainId - Chain ID (e.g., 8453 for Base Mainnet, 480 for WorldChain)
 * @param transactionId - Transaction hash from the smart contract
 */
export async function handleCanisterEvent(
  chainId: number,
  transactionId: string
): Promise<void> {
  try {
    const actor = await createCanisterActor();
    await actor.handleEvent(chainId, transactionId);
    console.log(`Successfully processed event for chain ${chainId}, tx: ${transactionId}`);
  } catch (error) {
    console.error(`Error calling canister handleEvent:`, error);
    throw error;
  }
}

/**
 * Initialize EVM wallet address on the canister
 * @returns The Ethereum wallet address
 */
export async function initEvmWalletAddress(): Promise<string> {
  try {
    const actor = await createCanisterActor();
    const address = await actor.initEvmWalletAddress();
    console.log(`EVM wallet address initialized: ${address}`);
    return address;
  } catch (error) {
    console.error(`Error initializing EVM wallet address:`, error);
    throw error;
  }
}

/**
 * Get the EVM wallet address (query method)
 * @returns The Ethereum wallet address, or throws if not initialized
 */
export async function getEvmWalletAddress(): Promise<string> {
  try {
    const actor = await createCanisterActor();
    return await actor.evmWalletAddress();
  } catch (error) {
    console.error(`Error getting EVM wallet address:`, error);
    throw error;
  }
}

/**
 * Set contract addresses on the canister
 * @param config - Contract addresses configuration
 */
export async function setContractAddresses(config: ContractAddressesConfig): Promise<void> {
  try {
    const actor = await createCanisterActor();
    await actor.setContractAddresses(config);
    console.log('Contract addresses set successfully');
  } catch (error) {
    console.error(`Error setting contract addresses:`, error);
    throw error;
  }
}

