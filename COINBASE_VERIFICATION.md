# Coinbase Verification Implementation

This document describes the Coinbase verification feature that allows users to prove they are real humans (not bots) by verifying their wallets through Coinbase's onchain verification system.

## Overview

The Coinbase verification system uses Ethereum Attestation Service (EAS) attestations on the Base network. When a user verifies their wallet on Coinbase, an attestation is created that can be verified on-chain.

## Architecture

### Smart Contract Layer

**File**: `contracts/AccountManager.sol`

The `AccountManager` contract has been extended with:

1. **Storage**:
   - `mapping(uint256 => bytes32) coinbaseAttestationUIDByUserId` - Stores the EAS attestation UID for each verified user

2. **Functions**:
   - `requestCoinbaseVerification(bytes32 attestationUID)` - Public function that emits an event to trigger verification
   - `setCoinbaseVerification(address wallet, bytes32 attestationUID)` - Gelato-only function that sets the verification status
   - `coinbaseVerificationError(address wallet, bytes32 attestationUID, string errorMsg)` - Gelato-only function for error reporting
   - `getUserByWallet(address wallet)` - Returns user data including Coinbase verification status

3. **Events**:
   - `VerifyCoinbaseRequested(address indexed wallet, bytes32 attestationUID)` - Emitted when user requests verification
   - `CoinbaseVerificationResult(address indexed wallet, bytes32 attestationUID, bool isSuccess, string errorMsg)` - Emitted when verification completes

4. **Updated Structures**:
   - `UnifiedUser` struct now includes `coinbaseAttestationUID` field

### Web3Function Layer (Gelato Oracle)

**File**: `web3-functions/coinbase-verification/index.ts`

The Web3Function:

1. Listens for `VerifyCoinbaseRequested` events
2. Fetches the attestation UID from Coinbase Indexer contract on Base network
3. Verifies the attestation using EAS SDK:
   - Checks attestation exists and is not revoked
   - Verifies recipient matches the wallet
   - Verifies schema matches Coinbase Verified Account schema
4. Calls `setCoinbaseVerification` on the contract if verification succeeds

**Configuration**:
- Coinbase Indexer Address: `0x2c7eE1E5f416dfF40054c27A62f7B357C4E8619C` (Base)
- EAS Contract Address: `0x4200000000000000000000000000000000000021` (Base)
- Schema ID: `0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9` (Coinbase Verified Account)

### Frontend Layer

**Files**:
- `frontend/src/hooks/useCoinbaseVerification.ts` - Hook for Coinbase verification
- `frontend/src/components/coinbase-verification-button.tsx` - UI component

**Features**:
- Fetches attestation UID from Coinbase Indexer
- Displays verification status
- Handles embedded wallet (Reown) connections with special instructions
- Provides step-by-step instructions for verification

## User Flow

### Standard Wallet Flow

1. User clicks "Verify by Coinbase" button
2. Instructions modal appears
3. New tab opens to `https://www.coinbase.com/onchain-verify`
4. User signs in to Coinbase
5. User connects their wallet (same one used in the app)
6. User completes verification on Coinbase
7. User returns to the app and clicks "Verify"
8. App fetches attestation UID from Coinbase Indexer
9. App calls `requestCoinbaseVerification` on the contract
10. Gelato Web3Function verifies the attestation
11. Contract updates user's verification status

### Embedded Wallet (Reown) Flow

For users with embedded wallets, the flow is similar but with additional steps:

1. User clicks "Verify by Coinbase" button
2. Instructions modal appears with embedded wallet-specific guidance:
   - Option to use WalletConnect if supported
   - Option to export wallet and import into MetaMask
   - Then connect to Coinbase
3. Rest of the flow is the same

## Integration

### Adding to Your UI

To add the Coinbase verification button to your UI:

```tsx
import { CoinbaseVerificationButton } from "@/components/coinbase-verification-button";

// In your component
<CoinbaseVerificationButton />
```

### Using the Hook

```tsx
import { useCoinbaseVerification } from "@/hooks/useCoinbaseVerification";

function MyComponent() {
  const {
    isCoinbaseVerified,
    coinbaseAttestationUID,
    isLoading,
    error,
    requestCoinbaseVerification,
    isEmbeddedWallet,
  } = useCoinbaseVerification();

  // Use the verification status and functions
}
```

## Environment Variables

Add to your `.env` file:

```
NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org
```

For the Web3Function, add to Gelato secrets:

```
BASE_RPC_URL=https://mainnet.base.org
```

## Deployment

### Smart Contract

1. Deploy the updated `AccountManager` contract
2. Update the contract address in your frontend environment variables

### Web3Function

1. Install dependencies:
   ```bash
   cd web3-functions/coinbase-verification
   npm install
   ```

2. Deploy to Gelato:
   - Use Gelato's dashboard or CLI to deploy the Web3Function
   - Configure it to listen for `VerifyCoinbaseRequested` events
   - Set the `verifierContractAddress` user arg to your AccountManager address
   - Set the `BASE_RPC_URL` secret

### Frontend

1. Install dependencies (if needed):
   ```bash
   cd frontend
   npm install
   ```

2. Build and deploy:
   ```bash
   npm run build
   ```

## Testing

### Test the Flow

1. Connect a wallet to your app
2. Go to Coinbase and verify the wallet: https://www.coinbase.com/onchain-verify
3. Return to your app and click "Verify by Coinbase"
4. Check that the verification status updates

### Verify on Contract

```solidity
// Get user by wallet
UnifiedUser memory user = accountManager.getUserByWallet(walletAddress);

// Check verification
require(user.humanVerification == HumanVerification.CoinbaseVerification);
require(user.coinbaseAttestationUID != bytes32(0));
```

## Troubleshooting

### Attestation Not Found

- Ensure the wallet is verified on Coinbase first
- Check that you're using the correct schema ID
- Verify the Base RPC URL is correct

### Embedded Wallet Issues

- Users may need to export their wallet and import into MetaMask
- Or use WalletConnect if the embedded wallet supports it

### Web3Function Errors

- Check Gelato logs for detailed error messages
- Verify the Base RPC URL is accessible
- Ensure the contract address is correct

## Security Considerations

1. **Attestation Verification**: The Web3Function verifies:
   - Attestation exists and is not revoked
   - Recipient matches the wallet
   - Schema matches Coinbase Verified Account schema

2. **Access Control**: Only Gelato can call `setCoinbaseVerification`

3. **Event-Based**: Verification is triggered by events, ensuring transparency

## Future Enhancements

- Support for other Coinbase verification types (Business, Country, etc.)
- Batch verification for multiple wallets
- Verification expiry handling
- UI improvements for embedded wallet flow
