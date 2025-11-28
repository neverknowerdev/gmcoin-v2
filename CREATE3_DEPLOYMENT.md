# CREATE3 Deterministic Deployment Guide

This guide explains how to use CREATE3 to deploy the same smart contract to the same address across different blockchains.

## 📖 What is CREATE3?

CREATE3 is a deterministic deployment pattern that allows you to deploy contracts to the **same address** on different blockchains, regardless of:
- The contract's initialization code (bytecode)
- Constructor arguments
- Network differences

This is achieved by:
1. Deploying a minimal proxy contract via CREATE2 (which depends only on salt)
2. Using that proxy to deploy the actual contract via CREATE (nonce-based)
3. The final address depends only on the CREATE3Deployer address and the salt

### Why Use CREATE3?

- **Multi-chain consistency**: Same contract address across all chains
- **Simplified integrations**: Frontends and tools can use the same address
- **Address vanity**: Find salts that produce addresses with desired prefixes/suffixes
- **Deterministic deployments**: Reproducible deployments without nonce dependencies

## 🏗️ Architecture

```
CREATE3Deployer (factory)
    ↓ (CREATE2 with salt)
Proxy Contract (intermediate)
    ↓ (CREATE with nonce=1)
Final Contract (your GMCoin proxy)
```

The final address formula:
```
proxy = CREATE2(factory, salt, PROXY_INITCODE_HASH)
final = CREATE(proxy, nonce=1)
```

## 🚀 Quick Start

### 1. Bootstrap the Deterministic CREATE2 Factory

The CREATE3 workflow assumes the canonical deterministic deployer (often called the SingletonFactory) exists at `0x4e59b44847b379578588920ca78fbf26c0b4956c`. Most major public chains already include it, but if your target network does not, you can broadcast the pre-signed raw transaction via:

```bash
npx hardhat run scripts/deploy-deterministic-deployer.ts --network <network>
```

This script:

- Checks whether bytecode already exists at the canonical factory address.
- Broadcasts the Arachnid deterministic deployer raw transaction if needed.
- Waits for confirmation and re-validates the code deployment.

> ℹ️ The raw transaction is chain-agnostic (no EIP-155 chain ID), so it can be replayed on any EVM-compatible network that supports legacy transactions. Make sure your RPC endpoint allows `eth_sendRawTransaction`.

### 2. Deploy CREATE3Deployer (One-Time Setup Per Chain)

First, deploy the `Create3Deployer` factory contract on each target network:

```bash
# Deterministic deployment via CREATE2
npx hardhat run scripts/deploy-create3deployer-create2.ts --network sepolia
```

**Important**: The `Create3Deployer` must be deployed to the **same address** on all networks for CREATE3 to work. Our CREATE2 helper ensures this automatically as long as:

- The deterministic deployer lives at `0x4e59b44847b379578588920ca78fbf26c0b4956c`.
- You reuse the same salt (`gmcoin-create3-factory` by default).

Save the deployed address for use in subsequent deployments.

### 3. Deploy GMCoin via CREATE3

Deploy the GMCoin proxy using CREATE3:

```bash
# Set environment variables
export CREATE3_DEPLOYER_ADDRESS=0x...  # From step 1
export CREATE3_SALT_IMPL="gmcoin-impl"
export CREATE3_SALT_PROXY="gmcoin-proxy"

# Optional: Configure GMCoin parameters
export GMCOIN_OWNER=0x...
export GMCOIN_FEE_ADDRESS=0x...
export GMCOIN_TREASURY_ADDRESS=0x...
export GMCOIN_COINS_MULTIPLICATOR=300
export GMCOIN_EPOCH_DAYS=30
export GMCOIN_TIME_DELAY=0
export GMCOIN_GELATO_SENDER=0x...

# Deploy
npx hardhat run scripts/deploy-gmcoin-create3.ts --network sepolia
```

The script will:
1. Deploy `GMCoinImplementation` via CREATE3 (using `CREATE3_SALT_IMPL`)
2. Deploy `GMCoin` proxy via CREATE3 (using `CREATE3_SALT_PROXY`)
3. Print both on-chain and offline predicted addresses for verification

### 3. Verify Determinism

The deployment script prints both:
- **On-chain prediction**: From the `Create3Deployer` contract
- **Offline prediction**: From our utility functions

These should match exactly. If they do, you can deploy to other networks with the same salt and get the same address.

## 🔍 Finding Vanity Addresses

Use the salt finder script to search for salts that produce addresses with desired prefixes or suffixes.

### Search by Prefix/Suffix

```bash
export CREATE3_DEPLOYER_ADDRESS=0x...
export PREFIX="dead"
export SUFFIX="beef"

# Optional: Control search
export START_NUMBER=0
export PROGRESS_EVERY=10000
export MAX_ITERATIONS=1000000

npx hardhat run scripts/find-salt-create3.ts
```

### Search for Exact Address

```bash
export CREATE3_DEPLOYER_ADDRESS=0x...
export TARGET_ADDRESS=0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef

npx hardhat run scripts/find-salt-create3.ts
```

### Search for Multiple Addresses

```bash
export CREATE3_DEPLOYER_ADDRESS=0x...
export TARGET_ADDRESSES='["0xdead...", "0xbeef..."]'

npx hardhat run scripts/find-salt-create3.ts
```

### Multiple Prefix/Suffix Pairs

```bash
export CREATE3_DEPLOYER_ADDRESS=0x...
export PREFIX_SUFFIX_PAIRS='[{"prefix":"dead","suffix":"beef"},{"prefix":"cafe","suffix":"babe"}]'

npx hardhat run scripts/find-salt-create3.ts
```

## 📝 Environment Variables

### Deployment Script (`deploy-gmcoin-create3.ts`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CREATE3_DEPLOYER_ADDRESS` | No* | - | Address of Create3Deployer contract |
| `CREATE3_SALT_IMPL` | No | `"gmcoin-impl"` | Salt for implementation deployment |
| `CREATE3_SALT_PROXY` | No | `"gmcoin-proxy"` | Salt for proxy deployment |
| `GMCOIN_OWNER` | No | Deployer address | Owner of GMCoin contract |
| `GMCOIN_FEE_ADDRESS` | No | Deployer address | Address receiving transfer fees |
| `GMCOIN_TREASURY_ADDRESS` | No | Deployer address | Treasury address |
| `GMCOIN_COINS_MULTIPLICATOR` | No | `300` | Fee multiplicator (basis points) |
| `GMCOIN_EPOCH_DAYS` | No | `30` | Epoch duration in days |
| `GMCOIN_TIME_DELAY` | No | `0` | Timelock delay for upgrades |
| `GMCOIN_GELATO_SENDER` | No | Deployer address | Gelato dedicated message sender |

\* If not provided, the script will deploy a new `Create3Deployer` (not recommended for multi-chain)

### Salt Finder Script (`find-salt-create3.ts`)

| Variable | Required | Description |
|----------|----------|-------------|
| `CREATE3_DEPLOYER_ADDRESS` | **Yes** | Address of Create3Deployer contract |
| `TARGET_ADDRESS` | No* | Exact address to find (checksummed) |
| `TARGET_ADDRESSES` | No* | JSON array of exact addresses |
| `PREFIX` | No* | Address prefix (without 0x) |
| `SUFFIX` | No* | Address suffix (without 0x) |
| `PREFIX_SUFFIX_PAIRS` | No* | JSON array of `{prefix, suffix}` objects |
| `START_NUMBER` | No | Starting salt nonce (default: 0) |
| `PROGRESS_EVERY` | No | Print progress every N iterations (default: 1000) |
| `MAX_ITERATIONS` | No | Maximum iterations before stopping (default: unlimited) |

\* At least one target specification is required

## 🧪 Testing

Run the deterministic deployment tests:

```bash
npx hardhat test test/Create3Determinism.test.ts
```

The test suite verifies:
1. **Address prediction accuracy**: Offline predictions match on-chain contract predictions
2. **Multi-chain determinism**: Same salt produces the same address across multiple network resets

### Test Output

```
  CREATE3 deterministic deployments
    ✔ predicts addresses exactly like the on-chain helper (943ms)
    ✔ deploys the GM proxy to the same address on multiple chains (219ms)

  2 passing (1s)
```

## 📚 Utility Functions

The `scripts/utils/create3.ts` module provides pure functions for CREATE3 address computation:

### `normalizeSalt(input: SaltInput): string`

Normalizes various salt inputs to a bytes32 hex string:
- Hex strings: Zero-padded to 32 bytes
- Plain strings: Keccak256 hashed
- Numbers/BigInts: Converted to hex and padded

```typescript
import { normalizeSalt } from "./scripts/utils/create3";

const salt1 = normalizeSalt("my-salt");           // Keccak256 hash
const salt2 = normalizeSalt(12345);               // Hex padded
const salt3 = normalizeSalt("0x1234");           // Zero-padded
```

### `predictCreate3DeployedAddress(factoryAddress: string, salt: SaltInput): string`

Computes the final CREATE3 deployment address:

```typescript
import { predictCreate3DeployedAddress } from "./scripts/utils/create3";

const factory = "0x...";
const salt = "gmcoin-proxy";
const address = predictCreate3DeployedAddress(factory, salt);
```

### `predictCreate3ProxyAddress(factoryAddress: string, salt: SaltInput): string`

Computes the intermediate proxy address:

```typescript
import { predictCreate3ProxyAddress } from "./scripts/utils/create3";

const proxy = predictCreate3ProxyAddress(factory, salt);
```

### `getCreate3Addresses(factoryAddress: string, salt: SaltInput)`

Returns both proxy and final addresses:

```typescript
import { getCreate3Addresses } from "./scripts/utils/create3";

const { proxy, deployed } = getCreate3Addresses(factory, salt);
```

## 🔄 Multi-Chain Deployment Workflow

### Step 1: Ensure Deterministic Factory Exists

Run `scripts/deploy-deterministic-deployer.ts` on every new network that does **not** already host the canonical factory.

### Step 2: Deploy CREATE3Deployer on All Networks

Deterministically deploy the CREATE3 factory:

```bash
# Network 1: Sepolia
npx hardhat run scripts/deploy-create3deployer-create2.ts --network sepolia

# Network 2: Base Sepolia
npx hardhat run scripts/deploy-create3deployer-create2.ts --network baseSepolia

# Network 3: Arbitrum Sepolia
npx hardhat run scripts/deploy-create3deployer-create2.ts --network arbitrumSepolia
```

### Step 3: Deploy GMCoin with Same Salt

Use the same salt values on all networks:

```bash
export CREATE3_DEPLOYER_ADDRESS=0x...  # Same on all networks
export CREATE3_SALT_IMPL="gmcoin-impl"
export CREATE3_SALT_PROXY="gmcoin-proxy"

# Deploy to each network
npx hardhat run scripts/deploy-gmcoin-create3.ts --network sepolia
npx hardhat run scripts/deploy-gmcoin-create3.ts --network baseSepolia
npx hardhat run scripts/deploy-gmcoin-create3.ts --network arbitrumSepolia
```

The proxy address will be **identical** on all networks! ✅

## 🎯 Example: Vanity Address Search

Find a salt that produces an address starting with "dead":

```bash
export CREATE3_DEPLOYER_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
export PREFIX="dead"
export PROGRESS_EVERY=10000

npx hardhat run scripts/find-salt-create3.ts
```

Output:
```
Searching salts for factory: 0x5FbDB2315678afecb367f032d93F642f64180aa3
Targets:
  - prefix=dead suffix=
Starting at nonce: 0
Checked 0 salts | Found 0/1 | Last: 0x...
Checked 10000 salts | Found 0/1 | Last: 0x...
...

✓ Found prefix=dead suffix=
  Salt: 0x0000000000000000000000000000000000000000000000000000000000012345
  Address: 0xdeadbeef1234567890abcdef1234567890abcdef
  Iterations: 74561
```

Use the found salt in your deployment:

```bash
export CREATE3_SALT_PROXY=0x0000000000000000000000000000000000000000000000000000000000012345
npx hardhat run scripts/deploy-gmcoin-create3.ts --network sepolia
```

## ⚠️ Important Notes

1. **Factory Address Consistency**: The `Create3Deployer` must be at the same address on all networks for CREATE3 to work. Plan your factory deployment carefully.

2. **Salt Uniqueness**: Each salt produces a unique address. If you deploy with the same salt twice on the same network, the second deployment will fail (address already exists).

3. **Salt Format**: Salts are bytes32 values. You can use:
   - Plain strings (auto-hashed)
   - Hex strings (32 bytes)
   - Numbers (converted to hex)

4. **Network Independence**: CREATE3 addresses are independent of:
   - Chain ID
   - Network name
   - Block number
   - Gas prices

   They depend only on:
   - Factory address
   - Salt value

5. **Offline Computation**: All address predictions can be computed offline using the utility functions - no network connection required.

## 🐛 Troubleshooting

### "Address already exists" Error

This means the salt has already been used on this network. Choose a different salt or deploy to a different network.

### "Factory address mismatch"

Ensure `CREATE3_DEPLOYER_ADDRESS` is set correctly and matches the deployed factory address on the target network.

### Salt finder not finding addresses

- Increase `MAX_ITERATIONS` for longer searches
- Use `START_NUMBER` to resume from a specific point
- Consider that finding specific prefixes/suffixes can take millions of iterations

### Address predictions don't match

- Verify the factory address is correct
- Ensure salt normalization is consistent
- Check that you're using the same salt format (string vs hex)

## 📚 Additional Resources

- [Solady CREATE3 Documentation](https://github.com/Vectorized/solady/blob/main/src/utils/CREATE3.sol)
- [EIP-1014: CREATE2](https://eips.ethereum.org/EIPS/eip-1014)
- [Hardhat Network Documentation](https://hardhat.org/hardhat-network/docs)

## 🤝 Contributing

If you find issues or have improvements, please open an issue or submit a pull request.

