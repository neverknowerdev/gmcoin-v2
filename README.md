# GMCoin v2

A decentralized social media reward system that mints tokens to users based on their activity on Twitter and Farcaster. GMCoin uses Gelato Web3Functions for off-chain automation and OpenZeppelin upgradeable contracts for on-chain logic.

## 🎯 Overview

GMCoin is an ERC20 token that rewards users for their social media engagement. Users can link their Twitter and Farcaster accounts to a unified on-chain identity, and earn tokens based on their posts, likes, hashtags, and cashtags. The system uses epoch-based reward distribution with dynamic complexity adjustments.

## 🏗️ Architecture

The system consists of two main layers:

1. **On-Chain Smart Contracts** - Manage user accounts, token minting, and reward distribution
2. **Off-Chain Web3Functions** - Automate verification, data fetching, and batch processing via Gelato Network

### System Flow

```
User Activity (Twitter/Farcaster)
    ↓
Web3Functions (Off-chain automation)
    ↓
Smart Contracts (On-chain logic)
    ↓
Token Distribution (GMCoin ERC20)
```

## 📦 Components

### Smart Contracts

#### 1. **AccountManager** (`contracts/AccountManager.sol`)
The core identity management contract that creates a unified user system.

**Features:**
- Links multiple wallets to a single user ID
- Supports Twitter and Farcaster account verification
- Manages social account linking and merging
- Human verification tracking (Worldcoin, Binance BAB, Coinbase)
- Upgradeable via UUPS proxy pattern

**Key Functions:**
- `createOrLinkUser()` - Creates or links social accounts to wallets
- `requestTwitterVerificationByAuthCode()` - Initiates Twitter verification
- `requestFarcasterVerification()` - Initiates Farcaster verification
- `getUserByTwitterID()` / `getUserByFarcasterFID()` - Query user data

**Libraries:**
- `UserAccount` - Manages social account mappings (Twitter/Farcaster IDs)
- `UserWallets` - Manages wallet-to-user relationships
- `Timelock` - Enforces upgrade delays for security

#### 2. **GMCoin** (`contracts/GMCoin.sol`)
The ERC20 token contract with built-in fee mechanism.

**Features:**
- Standard ERC20 token ("GM Coin", "GM")
- Transfer fees (configurable via `coinsMultiplicator`)
- Minting fees sent to treasury
- Upgradeable via UUPS proxy
- Only Gelato can mint tokens (via `mintFromGelatoW3F`)

**Tokenomics:**
- Minting: A percentage goes to treasury
- Transfers: A percentage goes to fee address
- Fee rate: Controlled by `coinsMultiplicator` (basis points)

#### 3. **Minter** (`contracts/Minter.sol`)
Calculates and distributes rewards based on social media activity.

**Features:**
- Epoch-based reward system
- Points calculation for posts, likes, hashtags, cashtags
- Dynamic complexity adjustment based on activity
- Batch processing for efficient minting
- Platform-specific tracking (Twitter vs Farcaster)

**Reward Calculation:**
- Points per post: 1
- Points per like: 1
- Points per hashtag: 3
- Points per cashtag: 5
- Coins = Points × Multiplicator (adjusted per epoch)

**Epoch System:**
- Configurable epoch duration (default: 30 days)
- Complexity adjusts based on total points in previous epoch
- New epoch starts automatically when threshold is reached

#### 4. **Treasury** (`contracts/Treasury.sol`)
Holds and manages the token treasury.

**Features:**
- Receives minting fees
- Token withdrawal functionality
- Upgradeable contract

#### 5. **GelatoW3FManager** (`contracts/GelatoW3FManager.sol`)
Manages Gelato Web3Function tasks and automation.

**Features:**
- Creates and cancels Web3Function tasks
- Manages task hashes and configurations
- Integrates with Gelato Automate

### Web3Functions (Off-Chain Automation)

Web3Functions run on Gelato Network and handle off-chain operations:

#### 1. **Twitter Verification** (`web3-functions/twitter-verification-authcode/`)
Verifies Twitter accounts using auth code method.

**Process:**
1. User requests verification with auth code
2. Web3Function fetches tweet from Twitter API
3. Validates auth code in tweet content
4. Verifies user ID matches
5. Calls `createOrLinkUser()` on-chain

#### 2. **Twitter Worker** (`web3-functions/twitter-worker/`)
Processes Twitter activity and calculates rewards.

**Process:**
1. Fetches user posts from Twitter API
2. Calculates points (posts, likes, hashtags, cashtags)
3. Batches data for efficient processing
4. Uploads to IPFS
5. Triggers minting on Minter contract

#### 3. **Farcaster Verification** (`web3-functions/farcaster-verification/`)
Verifies Farcaster accounts.

**Process:**
1. User requests verification
2. Web3Function validates Farcaster FID
3. Calls `createOrLinkUser()` on-chain

#### 4. **Farcaster Worker** (`web3-functions/farcaster-worker/`)
Processes Farcaster activity and calculates rewards.

**Process:**
Similar to Twitter worker but for Farcaster platform.

## 🔄 How It All Works Together

### User Onboarding Flow

1. **User connects wallet** → Calls `requestTwitterVerificationByAuthCode()` or `requestFarcasterVerification()`
2. **Event emitted** → `VerifyTwitterByAuthCodeRequested` or `VerifyFarcasterRequested`
3. **Web3Function triggered** → Gelato picks up the event
4. **Verification** → Web3Function validates social account
5. **Account created** → Calls `createOrLinkUser()` to create unified user
6. **Success event** → `TwitterVerificationResult` or `FarcasterVerificationResult` emitted

### Reward Distribution Flow

1. **Daily trigger** → Gelato Web3Function runs daily
2. **Data collection** → Twitter/Farcaster workers fetch user activity
3. **Points calculation** → Calculate points for posts, likes, hashtags, cashtags
4. **Batch processing** → Process users in batches for efficiency
5. **IPFS upload** → Store activity data on IPFS
6. **Minting** → Call `mintFromGelatoW3F()` on GMCoin contract
7. **Epoch management** → Minter tracks epochs and adjusts complexity

### Epoch System

- **Epoch Duration**: Configurable (default 30 days)
- **Complexity Adjustment**: Based on total points in previous epoch
- **New Epoch**: Automatically starts when duration threshold reached
- **Points Reset**: Current epoch points become last epoch points

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Yarn or npm
- Hardhat
- Access to Gelato Network (for Web3Functions)

### Installation

```bash
# Install dependencies
yarn install

# Compile contracts
yarn hardhat compile

# Generate TypeScript types
yarn hardhat typechain
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Network Configuration
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
SEPOLIA_PRIVATE_KEY=your_private_key

# GMCoin Configuration
GMCOIN_OWNER=0x...
GMCOIN_FEE_ADDRESS=0x...
GMCOIN_TREASURY_ADDRESS=0x...
GMCOIN_COINS_MULTIPLICATOR=300
GMCOIN_EPOCH_DAYS=30
GMCOIN_GELATO_SENDER=0x...

# Twitter API (for Web3Functions)
TWITTER_BEARER=your_twitter_bearer_token
TWITTER_GET_TWEET_URL=https://api.twitter.com/2/tweets
```

### Deployment

Deploy all contracts:

```bash
# Deploy to local network
yarn hardhat node

# In another terminal, deploy contracts
yarn hardhat run scripts/deploy-gmcoin.ts --network localhost
```

Or use the test deployment helper:

```typescript
import { deployAllContracts } from "./test/tools/deployContract";

const contracts = await deployAllContracts(
  epochDays: 30,
  coinsMultiplicator: 1_000_000,
  timeDelay: 0
);
```

### Testing

Run the test suite:

```bash
# Run all tests
yarn hardhat test

# Run specific test file
yarn hardhat test test/TestTwitterVerification.ts

# Run with grep filter
yarn hardhat test --grep "twitter-verification"
```

## 📁 Project Structure

```
gmcoin-v2/
├── contracts/              # Smart contracts
│   ├── AccountManager.sol  # User identity management
│   ├── GMCoin.sol          # ERC20 token
│   ├── Minter.sol          # Reward calculation & distribution
│   ├── Treasury.sol        # Token treasury
│   ├── GelatoW3FManager.sol # Web3Function management
│   └── lib/                # Internal libraries
│       ├── UserAccount.sol
│       ├── UserWallets.sol
│       └── Timelock.sol
├── web3-functions/         # Gelato Web3Functions
│   ├── twitter-verification-authcode/
│   ├── twitter-worker/
│   ├── farcaster-verification/
│   └── farcaster-worker/
├── test/                   # Test files
│   ├── TestTwitterVerification.ts
│   ├── TestFarcasterVerification.ts
│   └── tools/              # Test utilities
├── scripts/                 # Deployment scripts
└── hardhat.config.ts        # Hardhat configuration
```

## 🔐 Security Features

- **Upgradeable Contracts**: All contracts use UUPS proxy pattern for upgradability
- **Timelock**: Upgrade delays enforced via Timelock library
- **Access Control**: Only Gelato can mint tokens and manage verifications
- **Signature Verification**: Wallet linking requires cryptographic signatures
- **Input Validation**: Comprehensive checks for all user inputs

## 🧪 Development

### Adding a New Web3Function

1. Create a new directory in `web3-functions/`
2. Add `index.ts` with your Web3Function logic
3. Add `schema.json` for user arguments
4. Register the function in `GelatoW3FManager`

### Contract Upgrades

All contracts support upgrades via UUPS pattern:

```typescript
// Schedule upgrade
await contract.scheduleUpgrade(newImplementationAddress);

// Wait for timelock delay

// Execute upgrade
await contract.upgradeToAndCall(newImplementationAddress, initData);
```

## 📝 License

UNLICENSED - See individual contract files for license information.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📚 Additional Resources

- [Gelato Network Documentation](https://docs.gelato.network/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Hardhat Documentation](https://hardhat.org/docs)
- [TypeChain Documentation](https://github.com/dethcrypto/TypeChain)

## 🐛 Troubleshooting

### Common Issues

**Typechain types not found:**
```bash
yarn hardhat compile
yarn hardhat typechain
```

**Web3Function provider errors:**
- Ensure `hardhat.config.ts` has correct `w3f` configuration
- Check that network is properly configured in Gelato dashboard

**Contract deployment fails:**
- Verify all environment variables are set
- Check that deployer account has sufficient funds
- Ensure network RPC URL is correct

## 📞 Support

For issues and questions, please open an issue on GitHub.
