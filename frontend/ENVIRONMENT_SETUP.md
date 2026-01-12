# Environment Setup for Base Mainnet

## Required Environment Variables

Make sure these are set in your `.env.local` file or deployment environment:

```bash
# Base Mainnet Configuration
NEXT_PUBLIC_BASE_MAINNET_RPC_URL=https://mainnet.base.org
# OR use Coinbase Developer RPC (if you have an API key)
# NEXT_PUBLIC_BASE_MAINNET_RPC_URL=https://api.developer.coinbase.com/rpc/v1/base/YOUR_API_KEY

# AccountManager Contract Address (Base Mainnet)
NEXT_PUBLIC_ACCOUNT_MANAGER_ADDRESS=0x7ea1bc48c4CafE3349D696d14f0E3c9C63F02002

# ICP Canister Configuration
NEXT_PUBLIC_ICP_CANISTER_ID=ylges-qaaaa-aaaal-qtlsq-cai
NEXT_PUBLIC_IC_HOST=https://icp-api.io

# OnchainKit (optional, for Coinbase Wallet integration)
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_api_key_here

# Dynamic Wallet (optional)
NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID=your_dynamic_env_id
```

## Chain Configuration

- **Main Chain**: Base Mainnet (Chain ID: 8453)
- **Contract Address**: `0x7ea1bc48c4CafE3349D696d14f0E3c9C63F02002`
- **Block Explorer**: https://basescan.org

## Verification

1. **Check contract address is set**:
   ```bash
   echo $NEXT_PUBLIC_ACCOUNT_MANAGER_ADDRESS
   # Should output: 0x7ea1bc48c4CafE3349D696d14f0E3c9C63F02002
   ```

2. **Verify chain configuration**:
   - All components should use Base Mainnet (8453)
   - No references to Base Sepolia (84532)

3. **Test wallet connection**:
   - Connect wallet to Base Mainnet
   - Verify transactions work on Base Mainnet

## Integration Points

### Smart Contract
- Address: `0x7ea1bc48c4CafE3349D696d14f0E3c9C63F02002`
- Chain: Base Mainnet (8453)
- Functions: `requestTwitterVerificationByAuthCode`, `requestFarcasterVerification`

### ICP Canister
- Canister ID: `ylges-qaaaa-aaaal-qtlsq-cai`
- Processes events from Base Mainnet transactions
- Chain ID mapping: 8453 → Base Mainnet

### Frontend
- Uses Base Mainnet for all transactions
- Dynamic wallet configured for Base Mainnet
- All error messages reference Base Mainnet

