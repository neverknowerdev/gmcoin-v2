# IMPORTANT: Canister ID Update Required

## Issue
The error shows you're calling the **OLD canister** (`pbyvv-piaaa-aaaal-qs6cq-cai`) which has a different interface.

The old canister expects: `handleEvent(text, text)`  
The new canister expects: `handleEvent(nat32, text)`

## Solution

You **MUST** set the environment variable to use the new canister ID:

### 1. Update `.env.local` file

Add or update this line:
```bash
NEXT_PUBLIC_ICP_CANISTER_ID=ylges-qaaaa-aaaal-qtlsq-cai
```

### 2. Remove the old canister ID if present

Make sure you DON'T have:
```bash
NEXT_PUBLIC_ICP_CANISTER_ID=pbyvv-piaaa-aaaal-qs6cq-cai  # ❌ OLD - REMOVE THIS
```

### 3. Restart the dev server

After updating `.env.local`, restart your Next.js dev server:
```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
```

## Verify

Check that the correct canister ID is being used:
1. Check browser console - look for canister calls
2. The error should disappear after updating
3. The new canister ID is: `ylges-qaaaa-aaaal-qtlsq-cai`

## Canister IDs

- ❌ **OLD** (don't use): `pbyvv-piaaa-aaaal-qs6cq-cai`
- ✅ **NEW** (use this): `ylges-qaaaa-aaaal-qtlsq-cai`

The new canister:
- Has the fixed `initEvmWalletAddress()` 
- Uses `handleEvent(nat32, text)` interface (chain ID as number)
- Is deployed on mainnet

