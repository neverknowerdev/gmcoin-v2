# GMCoin Frontend

This is a [Next.js](https://nextjs.org) project for the GMCoin application, featuring social account verification through Twitter/X and Farcaster integration with the AccountManager smart contract.

## Getting Started

First, install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Account Manager Contract
NEXT_PUBLIC_ACCOUNT_MANAGER_ADDRESS=0x... # Your deployed AccountManager contract address

# OnchainKit (optional)
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_api_key

# RPC URLs (optional)
NEXT_PUBLIC_OP_MAINNET_RPC_URL=https://mainnet.optimism.io

# X/Twitter OAuth (optional, for OAuth flow)
X_OAUTH_CLIENT_ID=your_client_id
X_OAUTH_CLIENT_SECRET=your_client_secret
X_OAUTH_REDIRECT_URI=http://localhost:3000/api/x/callback
X_OAUTH_SCOPES=tweet.read users.read offline.access

# Farcaster OAuth (optional, for OAuth flow)
FARCASTER_OAUTH_CLIENT_ID=your_client_id
FARCASTER_OAUTH_CLIENT_SECRET=your_client_secret
FARCASTER_OAUTH_REDIRECT_URI=http://localhost:3000/api/farcaster/callback
FARCASTER_OAUTH_AUTHORIZE_URL=https://warpcast.com/~/oauth/authorize
FARCASTER_OAUTH_TOKEN_URL=https://api.warpcast.com/v2/oauth/token
FARCASTER_OAUTH_USERINFO_URL=https://api.warpcast.com/v2/me
FARCASTER_OAUTH_SCOPES=openid offline_access
```

## Social Verification Implementation

The frontend integrates with the `AccountManager` contract to verify social accounts through two methods:

### 1. Twitter/X Verification

Users connect their X account via OAuth, post a verification tweet with an auth code, and submit the tweet ID to the contract.

#### Flow

1. User clicks "Connect X" → OAuth flow starts
2. User authorizes app → OAuth callback stores profile in cookie
3. Frontend detects OAuth completion → Shows `TwitterVerificationModal`
4. Modal displays auth code → User posts tweet with auth code
5. User enters tweet ID → Frontend calls `requestTwitterVerificationByAuthCode(authCode, twitterID, tweetID)`
6. Gelato picks up event → Verifies tweet contains auth code
7. Gelato calls `createOrLinkUser` → Emits `TwitterVerificationResult` event
8. Frontend listens for event → Updates verification status

#### Components

- **`TwitterVerificationModal`**: `frontend/src/components/twitter-verification-modal.tsx`
  - Shows auth code to user
  - Collects tweet ID from user
  - Submits verification request to contract

- **`generateTwitterAuthCode`**: `frontend/src/lib/twitter-auth-code.ts`
  - Generates auth code in format: `GM{walletStartingIndex}{wallet10Letters}{random2}`
  - Based on contract test requirements

### 2. Farcaster Verification

Farcaster verification supports two flows:

#### A. SIWE Flow (Recommended)

When users sign in with Farcaster using Sign-In with Ethereum (SIWE), the frontend automatically triggers verification.

**Flow:**

1. **User Signs In with Farcaster**
   - User clicks "Connect" on the Farcaster button in `WelcomeCard`
   - `signInFarcaster()` from `@farcaster/auth-kit` is called
   - User completes SIWE flow (signs message with their wallet)

2. **Authentication Complete**
   - `useProfile()` hook returns profile with `fid`
   - `isAuthenticated` becomes `true`
   - Connected wallet address is available via `useWalletConnection()`

3. **Automatic Verification Trigger**
   - `useFarcasterSIWE` hook detects authentication completion
   - Checks that we have: `isAuthenticated`, `profile.fid`, and `address`
   - Calls `requestFarcasterVerification(fid, wallet)` on the contract
   - Sets status to "pending"

4. **Gelato W3F Processing**
   - Gelato picks up `VerifyFarcasterRequested` event
   - Fetches primary wallet for the FID from Farcaster API
   - Verifies that the requesting wallet matches the FID's primary wallet
   - If match: Calls `createOrLinkUser(wallet, twitterID, farcasterFid)`
   - If mismatch: Calls `farcasterVerificationError(fid, wallet, errorMsg)`
   - Emits `FarcasterVerificationResult` event

5. **Frontend Updates**
   - `useFarcasterSIWE` hook listens for `FarcasterVerificationResult` events
   - Updates verification status to "success" or "error"
   - UI shows "Verifying…" during the process

**Hook: `useFarcasterSIWE`**

- **Location**: `frontend/src/hooks/useFarcasterSIWE.ts`
- **Responsibilities**:
  - Monitors Farcaster authentication status
  - Automatically triggers verification when SIWE completes
  - Listens for verification result events
  - Manages verification state
- **Key Features**:
  - Only triggers once per authentication session
  - Resets when user disconnects
  - Handles errors and allows retry
  - Updates UI status based on events

#### B. OAuth Flow (Legacy)

Users connect their Farcaster account via OAuth, and the frontend automatically calls the contract to request verification.

**Flow:**

1. User clicks "Connect Farcaster" → OAuth flow starts
2. User authorizes app → OAuth callback stores profile in cookie
3. Frontend detects OAuth completion → Automatically calls `requestFarcasterVerification(fid, wallet)`
4. Gelato picks up event → Verifies wallet matches FID's primary wallet
5. Gelato calls `createOrLinkUser` → Emits `FarcasterVerificationResult` event
6. Frontend listens for event → Updates verification status

**Differences:**

- **SIWE Flow**: Uses `@farcaster/auth-kit`, wallet connected as part of SIWE, no OAuth redirect
- **OAuth Flow**: Uses OAuth redirect, profile stored in cookies, separate from wallet connection

Both flows are supported, but SIWE is the recommended approach for better UX.

## Implementation Details

### Contract Integration

- **Contract ABI**: `frontend/src/lib/contracts/accountManager.ts`
  - Contains the ABI for `requestTwitterVerificationByAuthCode` and `requestFarcasterVerification`
  - Contract address should be set via `NEXT_PUBLIC_ACCOUNT_MANAGER_ADDRESS` environment variable

### Hooks

- **`useAccountManager`**: `frontend/src/hooks/useAccountManager.ts`
  - Provides `requestTwitterVerification` and `requestFarcasterVerification` functions
  - Handles transaction state (pending, confirming, confirmed)
  - Uses wagmi/viem for contract interactions

- **`useVerificationEvents`**: Listens for `TwitterVerificationResult` and `FarcasterVerificationResult` events
  - Automatically updates verification status when events are emitted
  - Filters events by wallet address

- **`useFarcasterSIWE`**: `frontend/src/hooks/useFarcasterSIWE.ts`
  - Monitors Farcaster authentication status
  - Automatically triggers verification when SIWE completes
  - Listens for verification result events

### Components

- **`VerificationHandler`**: `frontend/src/components/verification-handler.tsx`
  - Automatically triggers Farcaster verification after OAuth completes
  - Listens for verification result events
  - Manages verification status state

- **`TwitterVerificationModal`**: `frontend/src/components/twitter-verification-modal.tsx`
  - Shows auth code to user
  - Collects tweet ID from user
  - Submits verification request to contract

- **`WelcomeCard`**: `frontend/src/components/home/welcome-card.tsx`
  - Uses `useFarcasterSIWE` hook for SIWE flow
  - Shows "Verifying…" status during verification
  - Disables button during verification process

## Gelato W3F Verification Process

The Gelato W3F (`web3-functions/farcaster-verification/index.ts`) performs:

1. **Fetch Primary Wallet**: Gets the FID's primary wallet from Farcaster API
   - Tries Warpcast API first: `https://api.farcaster.xyz/fc/primary-address?fid={fid}`
   - Falls back to Neynar API if needed

2. **Wallet Validation**: Compares requesting wallet with primary wallet
   - Must match exactly (case-insensitive)
   - If mismatch: returns error "Wallet does not match primary wallet for this FID"

3. **Twitter Integration**: Optionally fetches Twitter ID if linked
   - Checks Farcaster account verifications for Twitter/X
   - Passes Twitter ID to `createOrLinkUser` if found

4. **User Creation/Linking**: Calls `createOrLinkUser(wallet, twitterID, farcasterFid)`
   - Creates new user if wallet not registered
   - Links to existing user if wallet already registered
   - Emits `FarcasterVerificationResult` event

## Error Handling

### Common Errors

**Twitter/X:**
- "TwitterIdAlreadyLinked" - Account already verified
- "InvalidSignature" - Signature validation issues

**Farcaster:**
- "No primary wallet found for this FID" - FID doesn't have a primary wallet set
- "Wallet does not match primary wallet for this FID" - User's connected wallet doesn't match their Farcaster primary wallet
- "Wallet not connected" - No wallet connected when verification is triggered
- "FarcasterAccountAlreadyLinked" - Account already verified

### Error Recovery

- Errors reset the `hasTriggered` flag, allowing retry
- Error messages are displayed in the verification status
- User can disconnect and reconnect to retry

## Testing

The implementation follows the test patterns in:
- `test/TestTwitterVerification.ts` - Twitter verification flow
- `test/TestFarcasterVerification.ts` - Farcaster verification flow

### Testing SIWE Flow

1. Ensure wallet is connected
2. Click "Connect" on Farcaster button
3. Complete SIWE flow (sign message)
4. Verify that:
   - "Verifying…" status appears
   - Contract transaction is submitted
   - `VerifyFarcasterRequested` event is emitted
   - Gelato processes the verification
   - `FarcasterVerificationResult` event is received
   - Status updates to "success" or "error"

### Testing OAuth Flows

1. Test Twitter verification flow end-to-end
2. Test Farcaster OAuth verification flow end-to-end
3. Verify event listeners update UI correctly
4. Test error scenarios

## Notes

- Twitter verification requires user interaction (posting tweet and providing tweet ID)
- Farcaster SIWE verification is automatic after sign-in
- Farcaster OAuth verification is automatic after OAuth
- Both flows wait for Gelato to process verification off-chain
- Event listeners automatically update UI when verification completes
- Error handling is in place for contract call failures
- The verification requires the connected wallet to match the FID's primary wallet (for Farcaster)
- Users must have their Farcaster account's primary wallet set
- The Gelato W3F handles all off-chain verification logic

## Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── api/                # API routes (OAuth callbacks)
│   │   └── page.tsx            # Main page
│   ├── components/              # React components
│   │   ├── home/               # Home page components
│   │   ├── verification-handler.tsx
│   │   └── twitter-verification-modal.tsx
│   ├── hooks/                   # Custom React hooks
│   │   ├── useAccountManager.ts
│   │   ├── useFarcasterSIWE.ts
│   │   └── useWalletConnection.ts
│   ├── lib/                     # Utilities and configurations
│   │   ├── contracts/           # Contract ABIs and configs
│   │   ├── client/              # Client-side utilities
│   │   └── server/              # Server-side utilities
│   └── types/                    # TypeScript types
└── README.md                     # This file
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [Wagmi Documentation](https://wagmi.sh) - React Hooks for Ethereum
- [Farcaster Auth Kit](https://docs.farcaster.xyz/auth-kit/getting-started) - Sign in with Farcaster

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
