# GMCoin ICP Canister

This is the ICP canister for GMCoin that handles Twitter and Farcaster verification.

## Structure

The canister implements:

1. **UserManagement**: User data structure with support for multiple wallets per user, each associated with a chain ID
2. **Twitter Verification**: `verifyTwitter(chainId, txId)` - validates VerifyTwitterRequested events from Base contract
3. **Farcaster Verification**: `verifyFarcaster(chainId, txId)` - validates VerifyFarcasterRequested events from Base contract
4. **View Functions**: Query users by various identifiers

## Data Structures

### User
- `userId`: Unique user identifier
- `twitterId`: Twitter ID (0 if not linked)
- `primaryWallet`: Primary wallet address
- `farcasterId`: Farcaster FID (0 if not linked)
- `wallets`: Array of Wallet objects (address + chain)
- `registeredAt`: Unix timestamp
- `isVerified`: Verification status

### Wallet
- `address`: EVM address (20 bytes)
- `chain`: Chain ID (e.g., 8453 for Base)

## Functions

### Public Functions

- `verifyTwitter(chainId: Nat, txId: Text)`: Verifies Twitter account by fetching transaction receipt and parsing VerifyTwitterRequested event
- `verifyFarcaster(chainId: Nat, txId: Text)`: Verifies Farcaster account by fetching transaction receipt and parsing VerifyFarcasterRequested event
- `canisterDedicatedEvmAddress()`: Returns the canister's dedicated EVM address (for Threshold signature verification)

### Query Functions

- `getUserById(userId: Nat)`: Get user by ID
- `getUserByTwitterId(twitterId: Nat)`: Get user by Twitter ID
- `getUserByFarcasterId(farcasterId: Nat)`: Get user by Farcaster ID
- `getUserByWallet(wallet: Address)`: Get user by wallet address

### Admin Functions

- `setBaseContractAddress(address: Address)`: Set Base contract address
- `setBaseRpcUrl(url: Text)`: Set RPC URL (deprecated - uses EVM RPC canister)
- `setCanisterEvmAddress(address: Address)`: Set canister's EVM address

## Event Signatures

- `VerifyTwitterRequested`: `0x86a32547e5117138a4d48f65f420f0ac0bc06f91be0c2abe77bedd581e7fda3d`
- `VerifyFarcasterRequested`: `0x97f98b2d30a159c52786acc5e6743f8c7b1eadd7dfdb3eeb94a1f5d1a5e4ca18`

## Setup Instructions

### Prerequisites

#### 1. Install dfx (Internet Computer SDK)

If you don't have `dfx` installed, install it first:

```bash
# Install the IC SDK
sh -ci "$(curl -fsSL https://internetcomputer.org/install.sh)"

# Verify installation
dfx --version
```

**Note for Apple Silicon Macs (M1/M2):**
```bash
softwareupdate --install-rosetta
```

**Note:** Node.js is required. Install with `brew install node` if needed.

#### 2. Initialize dfx (if first time)

```bash
dfx identity new default  # or use existing identity
```

### EVM RPC Canister Dependency

The canister requires the EVM RPC canister to be pulled and initialized before it can be compiled.

#### Steps to resolve the "canister alias not defined" error:

1. **Pull the dependency:**
   ```bash
   dfx deps pull
   ```

2. **Initialize the EVM RPC canister:**
   ```bash
   dfx deps init evm_rpc --argument '(record {})'
   ```

3. **Deploy the dependency:**
   ```bash
   dfx deps deploy
   ```

4. **Build your canister:**
   ```bash
   dfx build gmcoin_verifier
   ```

The linter error will disappear once the dependencies are pulled and initialized.

## Deployment

```bash
# Navigate to canister directory
cd canister

# Start local replica (if needed)
dfx start --background

# Create canister
dfx canister create gmcoin_verifier

# Build and deploy
dfx build
dfx deploy

# Set configuration
dfx canister call gmcoin_verifier setBaseContractAddress '(variant { Ok = "0x..." })'
dfx canister call gmcoin_verifier setCanisterEvmAddress '(variant { Ok = "0x..." })'
```

## Dependencies

The canister uses:
- `mo:base/HashMap` for efficient key-value storage
- `mo:base` for standard library functions
- `canister:evm_rpc` for EVM blockchain interactions
- `mo:base/ExperimentalCycles` for cycle management

## Architecture

```
User clicks verify on website
  ↓
Backend sends tx to Base smart contract
  ↓
Backend receives tx receipt
  ↓
Backend calls canister.verifyTwitter/verifyFarcaster with txId
  ↓
Canister fetches transaction receipt via EVM RPC canister
  ↓
Canister parses VerifyTwitterRequested/VerifyFarcasterRequested event
  ↓
Canister validates event data
  ↓
Canister signs transaction using Threshold keys
  ↓
Canister sends createOrLinkUser transaction to Base contract
  ↓
User is verified and linked in both ICP canister and Base contract
```

## Implementation Status

### ✅ Completed

#### 1. Project Structure
- Created `dfx.json` configuration
- Set up Motoko source files
- Code compiles successfully

#### 2. Data Structures
- ✅ `User` structure with:
  - userId, twitterId, primaryWallet, farcasterId
  - wallets array with chain support (address + chainId)
  - registeredAt timestamp
  - isVerified flag
- ✅ `Wallet` structure (address + chain)
- ✅ Event type definitions

#### 3. User Management
- ✅ User creation and linking logic
- ✅ Multiple wallets per user support
- ✅ Chain-aware wallet storage
- ✅ Social account linking (Twitter/Farcaster)
- ✅ User lookup by Twitter ID, Farcaster ID, or wallet address

#### 4. Verification Functions (Structure)
- ✅ `verifyTwitter(chainId, txId)` - function structure complete
- ✅ `verifyFarcaster(chainId, txId)` - function structure complete
- ✅ Event parsing logic for both event types
- ✅ Transaction receipt fetching structure (using EVM RPC canister)

#### 5. Event Signatures
- ✅ VerifyTwitterRequested: `0x86a32547e5117138a4d48f65f420f0ac0bc06f91be0c2abe77bedd581e7fda3d`
- ✅ VerifyFarcasterRequested: `0x97f98b2d30a159c52786acc5e6743f8c7b1eadd7dfdb3eeb94a1f5d1a5e4ca18`

#### 6. Query Functions
- ✅ `getUserById(userId)`
- ✅ `getUserByTwitterId(twitterId)`
- ✅ `getUserByFarcasterId(farcasterId)`
- ✅ `getUserByWallet(wallet)`
- ✅ `canisterDedicatedEvmAddress()`

#### 7. Admin Functions
- ✅ `setBaseContractAddress(address)`
- ✅ `setCanisterEvmAddress(address)`

#### 8. Syntax Fixes
- ✅ All Motoko syntax errors fixed
- ✅ Code compiles successfully
- ✅ HashMap usage corrected
- ✅ Text operations implemented
- ✅ Control flow refactored

### ⚠️ In Progress / Needs Completion

#### 1. RPC Integration
- ✅ Structure in place using EVM RPC canister
- ⚠️ **JSON parsing for transaction receipts** - needs proper JSON library integration
- ⚠️ **EVM RPC service configuration** - needs correct API structure
- ⚠️ Error handling and retry logic

#### 2. Event Parsing
- ✅ Topic parsing (indexed parameters)
- ⚠️ **Data field parsing** - non-indexed string parameters (accessCodeEncrypted) need ABI decoding

#### 3. Threshold ECDSA Integration
- ⚠️ **Full implementation pending** - see Threshold ECDSA section below
- Needs:
  - ECDSA canister integration
  - Public key derivation
  - EVM address derivation
  - Transaction signing
  - Transaction submission

#### 4. Testing
- ⚠️ Unit tests needed
- ⚠️ Integration tests needed
- ⚠️ End-to-end tests needed

## Threshold ECDSA Signatures for Base Contract Calls

### Overview

To call `createOrLinkUser` on the Base contract from the ICP canister, we need to:
1. Sign transactions using ICP's Threshold ECDSA API
2. Construct Ethereum transaction data
3. Send the signed transaction to Base network via RPC

### ICP Threshold ECDSA API

ICP provides a canister interface for ECDSA signing. The canister needs to:

1. **Derive an EVM address** from the canister's public key
2. **Request signatures** for transaction hashes
3. **Construct transactions** with the signatures
4. **Submit transactions** via RPC

### Implementation Plan

#### 1. Get Canister's EVM Address

The canister should derive its EVM address from its public key:

```motoko
// Use ICP's ECDSA API to derive public key
// Then derive EVM address (last 20 bytes of keccak256(public_key))
```

#### 2. Sign Transaction Hash

Before signing, construct the transaction data for `createOrLinkUser(address wallet, uint256 twitterId, uint256 farcasterFid)`:

```motoko
// 1. ABI encode function call
// 2. Create transaction object (nonce, gasPrice, gasLimit, to, value, data)
// 3. RLP encode transaction
// 4. Keccak256 hash of RLP encoded transaction
// 5. Request signature from Threshold ECDSA API
```

#### 3. Submit Transaction

Send the signed transaction to Base network:

```motoko
// 1. Attach signature to transaction
// 2. RLP encode signed transaction
// 3. Send via eth_sendRawTransaction RPC call
```

### Resources

- [ICP ECDSA API Documentation](https://internetcomputer.org/docs/current/developer-docs/integrations/t-ecdsa/)
- [Threshold ECDSA Canister Interface](https://internetcomputer.org/docs/current/references/ic-interface-spec/#ic-ecdsa_public_key)
- [EVM Transaction Format](https://ethereum.org/en/developers/docs/transactions/)

### Current Status

⚠️ **Pending Implementation**

The structure is in place in `callCreateOrLinkUser`, but full implementation requires:
- Integration with ICP's ECDSA canister
- RLP encoding library for Motoko
- Keccak256 hashing implementation
- Transaction construction logic

### Alternative Approach

For initial development, consider:
1. Using the backend to handle signing (not ideal for decentralization)
2. Using a service that handles ECDSA signing on behalf of the canister
3. Implementing a simpler verification flow that doesn't require on-chain calls (just local state updates)

However, the goal is to have the canister directly call the Base contract for full decentralization.

## Next Steps

### Priority 1: Complete RPC Integration
1. Integrate proper JSON parsing library (e.g., `mo:json`)
2. Implement transaction receipt parsing from JSON
3. Configure EvmRpc service types correctly
4. Add comprehensive error handling

### Priority 2: Complete Event Parsing
1. Implement ABI decoding for non-indexed parameters
2. Parse `accessCodeEncrypted` from event data field
3. Add validation for event structure

### Priority 3: Threshold ECDSA Implementation
1. Research and implement ICP ECDSA API integration
2. Implement RLP encoding for transactions
3. Implement Keccak256 hashing
4. Complete transaction construction and signing
5. Implement transaction submission

### Priority 4: Testing & Validation
1. Add unit tests for event parsing
2. Add integration tests with mock RPC responses
3. Add end-to-end tests on testnet
4. Validate against actual Base contract events

## Dependencies Needed

1. **JSON Parsing**: `mo:json` or similar library for parsing RPC responses
2. **RLP Encoding**: Motoko library for RLP encoding transactions
3. **Keccak256**: Motoko implementation of Keccak256 hashing
4. **ABI Encoding/Decoding**: Library for encoding/decoding function calls

## Notes

- The core structure follows the same patterns as the existing Solidity `AccountManager` contract
- User management logic mirrors the `_createOrLinkUser` function from the contract
- Event signatures match exactly with the Solidity contract events
- The implementation is designed to be chain-agnostic (supports multiple chains via chainId parameter)
- All syntax errors have been fixed and the code compiles successfully
- The canister uses `persistent actor` to support stable variables across upgrades
