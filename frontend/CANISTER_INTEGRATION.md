# ICP Canister Integration

This document describes how the gmcoin-v2 frontend integrates with the gm-icp-canister for Twitter and Farcaster verification processing.

## Overview

The ICP canister (`pbyvv-piaaa-aaaal-qs6cq-cai`) processes verification events emitted from the smart contract. After a user verifies their Twitter or Farcaster account via the smart contract, the frontend automatically triggers the canister to process the event.

## Flow

1. **User Verification**: User connects via OAuth (Twitter/Farcaster) and calls the smart contract
2. **Transaction Confirmation**: Smart contract transaction is confirmed on-chain
3. **Event Processing**: Frontend automatically calls the canister's `handleEvent` method
4. **Canister Processing**: Canister processes the event and updates user state

## Implementation Details

### Files Created

- `src/lib/canister/client.ts` - Canister client utility for interacting with ICP canister
- `src/app/api/canister/handle-event/route.ts` - API route to trigger canister event processing

### Files Modified

- `src/hooks/useAccountManager.ts` - Added automatic canister call after transaction confirmation

### Environment Variables

Add these to your `.env.local`:

```env
# ICP Canister Configuration
NEXT_PUBLIC_ICP_CANISTER_ID=pbyvv-piaaa-aaaal-qs6cq-cai
NEXT_PUBLIC_IC_HOST=https://icp-api.io
```

For local development with dfx:
```env
NEXT_PUBLIC_IC_HOST=http://localhost:4943
```

## How It Works

### Automatic Canister Triggering

When a verification transaction is confirmed:

1. `useAccountManager` hook detects transaction confirmation
2. Extracts transaction hash and chain ID
3. Maps chain ID to canister chain name:
   - Base Mainnet (8453) → "Base Mainnet"
   - Base Sepolia (84532) → "Base Mainnet" (uses same canister config)
4. Calls `/api/canister/handle-event` API route
5. API route calls canister's `handleEvent(chain, transactionId)` method

### Chain Name Mapping

The canister expects chain names in this format:
- `"Base Mainnet"` - For Base mainnet and Base Sepolia
- `"WorldChain"` - For WorldChain
- `"Monad"` - For Monad

Currently, the implementation maps both Base Mainnet and Base Sepolia to `"Base Mainnet"` since they use the same canister configuration.

## API Endpoints

### POST `/api/canister/handle-event`

Triggers canister event processing.

**Request Body:**
```json
{
  "chain": "Base Mainnet",
  "transactionId": "0x..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Event processed for chain Base Mainnet, transaction 0x..."
}
```

## Canister Methods

The canister exposes these methods (via `src/lib/canister/client.ts`):

- `handleEvent(chain, transactionId)` - Process a verification event
- `isTwitterWorkerInitialized()` - Check if Twitter worker is ready
- `isFarcasterWorkerInitialized()` - Check if Farcaster worker is ready

## Error Handling

- Canister calls are non-blocking - errors are logged but don't prevent the UI from updating
- If canister call fails, the verification will still be processed by the smart contract
- The canister processes events asynchronously, so failures don't affect user experience

## Testing

To test the integration:

1. Connect wallet and verify Twitter/Farcaster account
2. Check browser console for canister call logs
3. Verify canister logs: `dfx canister logs gm-icp-canister --network ic`

## Troubleshooting

### Canister call fails

- Check `NEXT_PUBLIC_ICP_CANISTER_ID` is set correctly
- Verify `NEXT_PUBLIC_IC_HOST` points to correct ICP network
- Check canister is deployed and has cycles

### Transaction not triggering canister

- Verify transaction is confirmed (`isConfirmed` is true)
- Check browser console for errors
- Verify chain ID mapping is correct

### Canister not processing events

- Check canister configuration is set via `setConfig`
- Verify contract addresses are configured in canister
- Check event signatures match smart contract events

