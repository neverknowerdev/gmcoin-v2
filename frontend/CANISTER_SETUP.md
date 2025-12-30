# Canister Configuration Setup

This document explains how to configure the ICP canister with your contract address.

## Overview

The canister needs to know:
1. **Contract Address**: Where your AccountManager contract is deployed on Base Mainnet
2. **Event Signatures**: The keccak256 hashes of the event signatures it should listen for

## Configuration Steps

### 1. Set Contract Address Environment Variable

Add to your `.env.local`:

```env
NEXT_PUBLIC_ACCOUNT_MANAGER_ADDRESS=0xYourContractAddressHere
```

### 2. Configure the Canister

You have two options:

#### Option A: Use the API Route (Recommended)

Call the API endpoint to configure the canister:

```bash
curl -X POST http://localhost:3000/api/canister/set-config \
  -H "Content-Type: application/json" \
  -d '{
    "contractAddress": "0xYourContractAddressHere"
  }'
```

Or if you want to provide custom event signatures:

```bash
curl -X POST http://localhost:3000/api/canister/set-config \
  -H "Content-Type: application/json" \
  -d '{
    "contractAddress": "0xYourContractAddressHere",
    "eventSignatures": {
      "VerifyTwitterByAuthCodeRequested": "0x...",
      "VerifyFarcasterRequested": "0x..."
    }
  }'
```

#### Option B: Use Candid UI Directly

1. Go to: https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=pbyvv-piaaa-aaaal-qs6cq-cai
2. Find `setConfig` method
3. Fill in the form with:
   - `contracts.Base Mainnet`: `["0xYourContractAddressHere"]`
   - `contracts.WorldChain`: `[]`
   - `contracts.Monad`: `[]`
   - `eventSignatures.VerifyTwitterByAuthCodeRequested`: `"0x..."` (keccak256 hash)
   - `eventSignatures.VerifyFarcasterRequested`: `"0x..."` (keccak256 hash)
4. Click "Call"

### 3. Event Signatures

The default event signatures are calculated automatically by the API route using ethers.js:

- `VerifyTwitterByAuthCodeRequested`: `keccak256("VerifyTwitterByAuthCodeRequested(address,string,string,uint256)")`
- `VerifyFarcasterRequested`: `keccak256("VerifyFarcasterRequested(uint256,address)")`

To calculate manually:

```javascript
import { ethers } from "ethers";

// Twitter event signature
const twitterSig = ethers.id("VerifyTwitterByAuthCodeRequested(address,string,string,uint256)");
console.log("Twitter:", twitterSig);

// Farcaster event signature  
const farcasterSig = ethers.id("VerifyFarcasterRequested(uint256,address)");
console.log("Farcaster:", farcasterSig);
```

## Verification

After configuration, verify the canister is set up correctly:

1. Check canister logs: `dfx canister logs gm-icp-canister --network ic`
2. Trigger a verification transaction
3. Check that the canister processes the event

## Important Notes

- The canister must be configured **before** processing events
- Contract address must be the AccountManager contract on Base Mainnet
- Event signatures must match exactly (including parameter types and order)
- The canister will only process events from the configured contract address

