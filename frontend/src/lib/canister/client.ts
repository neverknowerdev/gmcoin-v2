import { Actor, HttpAgent } from '@dfinity/agent';
import { IDL } from '@dfinity/candid';
import { Principal } from '@dfinity/principal';

// Canister ID from canister_ids.json
const CANISTER_ID = process.env.NEXT_PUBLIC_ICP_CANISTER_ID || 'pbyvv-piaaa-aaaal-qs6cq-cai';
const IC_HOST = process.env.NEXT_PUBLIC_IC_HOST || 'https://icp-api.io';

// Candid interface for the canister
const canisterIdlFactory = () => {
  return IDL.Service({
    greet: IDL.Func([IDL.Text], [IDL.Text], ['query']),
    handleEvent: IDL.Func([IDL.Text, IDL.Text], [IDL.Null], []),
    setConfig: IDL.Func(
      [
        IDL.Record({
          contracts: IDL.Record({
            'Base Mainnet': IDL.Vec(IDL.Text),
            'WorldChain': IDL.Vec(IDL.Text),
            'Monad': IDL.Vec(IDL.Text),
          }),
          eventSignatures: IDL.Record({
            VerifyTwitterByAuthCodeRequested: IDL.Text,
            VerifyFarcasterRequested: IDL.Text,
          }),
        }),
      ],
      [IDL.Null],
      []
    ),
    initializeTwitterWorker: IDL.Func(
      [
        IDL.Record({
          contractAddress: IDL.Text,
          chain: IDL.Text,
          tweetLookupURL: IDL.Text,
          serverURLPrefix: IDL.Text,
          concurrencyLimit: IDL.Nat32,
          twitterOptimizedServerHost: IDL.Text,
        }),
        IDL.Record({
          bearerToken: IDL.Text,
          optimizedAPISecretKey: IDL.Text,
          authHeaderName: IDL.Text,
        }),
      ],
      [IDL.Null],
      []
    ),
    initializeFarcasterWorker: IDL.Func(
      [
        IDL.Record({
          contractAddress: IDL.Text,
          chain: IDL.Text,
          farcasterAPIURL: IDL.Text,
          serverURLPrefix: IDL.Text,
          concurrencyLimit: IDL.Nat32,
        }),
        IDL.Record({
          apiKey: IDL.Text,
          bearerToken: IDL.Opt(IDL.Text),
        }),
      ],
      [IDL.Null],
      []
    ),
    isTwitterWorkerInitialized: IDL.Func([], [IDL.Bool], ['query']),
    isFarcasterWorkerInitialized: IDL.Func([], [IDL.Bool], ['query']),
  });
};

export interface CanisterConfig {
  contracts: {
    'Base Mainnet': string[];
    'WorldChain': string[];
    'Monad': string[];
  };
  eventSignatures: {
    VerifyTwitterByAuthCodeRequested: string;
    VerifyFarcasterRequested: string;
  };
}

export interface TwitterWorkerConfig {
  contractAddress: string;
  chain: string;
  tweetLookupURL: string;
  serverURLPrefix: string;
  concurrencyLimit: number;
  twitterOptimizedServerHost: string;
}

export interface TwitterWorkerSecrets {
  bearerToken: string;
  optimizedAPISecretKey: string;
  authHeaderName: string;
}

export interface FarcasterWorkerConfig {
  contractAddress: string;
  chain: string;
  farcasterAPIURL: string;
  serverURLPrefix: string;
  concurrencyLimit: number;
}

export interface FarcasterWorkerSecrets {
  apiKey: string;
  bearerToken?: string;
}

export interface CanisterActor {
  greet: (name: string) => Promise<string>;
  handleEvent: (chain: string, transactionId: string) => Promise<void>;
  setConfig: (config: CanisterConfig) => Promise<void>;
  initializeTwitterWorker: (config: TwitterWorkerConfig, secrets: TwitterWorkerSecrets) => Promise<void>;
  initializeFarcasterWorker: (config: FarcasterWorkerConfig, secrets: FarcasterWorkerSecrets) => Promise<void>;
  isTwitterWorkerInitialized: () => Promise<boolean>;
  isFarcasterWorkerInitialized: () => Promise<boolean>;
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
 * @param chain - Chain name ("Base Mainnet", "WorldChain", or "Monad")
 * @param transactionId - Transaction hash from the smart contract
 */
export async function handleCanisterEvent(
  chain: string,
  transactionId: string
): Promise<void> {
  try {
    const actor = await createCanisterActor();
    await actor.handleEvent(chain, transactionId);
    console.log(`Successfully processed event for chain ${chain}, tx: ${transactionId}`);
  } catch (error) {
    console.error(`Error calling canister handleEvent:`, error);
    throw error;
  }
}

/**
 * Checks if Twitter worker is initialized
 */
export async function isTwitterWorkerInitialized(): Promise<boolean> {
  try {
    const actor = await createCanisterActor();
    return await actor.isTwitterWorkerInitialized();
  } catch (error) {
    console.error(`Error checking Twitter worker status:`, error);
    return false;
  }
}

/**
 * Checks if Farcaster worker is initialized
 */
export async function isFarcasterWorkerInitialized(): Promise<boolean> {
  try {
    const actor = await createCanisterActor();
    return await actor.isFarcasterWorkerInitialized();
  } catch (error) {
    console.error(`Error checking Farcaster worker status:`, error);
    return false;
  }
}

