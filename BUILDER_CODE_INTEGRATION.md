# Base Builder Code Integration

This document describes the Base Builder Code integration for ERC-8021 attribution.

## Overview

All transactions sent from the frontend automatically include a Base Builder Code suffix for onchain attribution. This allows Base to track which app initiated each transaction and qualifies the app for potential rewards.

## Configuration

Set the `NEXT_PUBLIC_BASE_BUILDER_CODE` environment variable with your Builder Code:

```bash
NEXT_PUBLIC_BASE_BUILDER_CODE=k3p9da
```

You can get your Builder Code by registering your app at [base.dev](https://base.dev). The code will be available under **Settings** → **Builder Code**.

## Implementation

### Files

1. **`frontend/src/lib/builder-code.ts`**
   - Utility functions for encoding Builder Codes to ERC-8021 suffixes
   - Uses the `ox` library's `Attribution.toDataSuffix` function

2. **`frontend/src/hooks/useWriteContractWithBuilderCode.ts`**
   - Wrapper hook around wagmi's `useWriteContract`
   - Automatically appends Builder Code suffix to all transactions
   - Maintains the same API as `useWriteContract` for drop-in replacement

3. **Updated Hooks**
   - `useAccountManager` - Uses `useWriteContractWithBuilderCode`
   - `useCoinbaseVerification` - Uses `useWriteContractWithBuilderCode`

## How It Works

1. When a transaction is sent via `useWriteContractWithBuilderCode`:
   - The function call is encoded using viem's `encodeFunctionData`
   - The Builder Code is encoded to an ERC-8021 suffix using `ox/erc8021`
   - The suffix is appended to the encoded function data
   - The transaction is sent with the modified data

2. The suffix format follows ERC-8021 specification:
   - Magic bytes: `0x8021`
   - Code length and code data
   - Properly encoded for onchain attribution

## Supported Transaction Types

- ✅ Smart Account (ERC-4337) transactions
- ✅ EOA transactions (via manual data appending)

## Dependencies

- `ox` - ERC-8021 attribution encoding library
- `viem` - Transaction encoding
- `wagmi` - Ethereum wallet integration

## Notes

- If `NEXT_PUBLIC_BASE_BUILDER_CODE` is not set or empty, transactions will be sent without the suffix (no error, just no attribution)
- The suffix is appended to all contract write operations automatically
- No changes are needed to existing contract interaction code - just use `useWriteContractWithBuilderCode` instead of `useWriteContract`

## Testing

To verify the integration is working:

1. Set `NEXT_PUBLIC_BASE_BUILDER_CODE` in your `.env.local`
2. Send a transaction from the app
3. Check the transaction on Base explorer
4. The transaction data should end with the ERC-8021 suffix containing your Builder Code

## References

- [Base Builder Codes Documentation](https://docs.base.org/base-chain/quickstart/builder-codes)
- [ERC-8021 Specification](https://eips.ethereum.org/EIPS/eip-8021)
- [Ox Library Documentation](https://oxlib.sh/ercs/erc8021/Attribution)
