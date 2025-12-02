# AccountManager Deployment Guide

This guide explains how to deploy the AccountManager contract using CREATE3 for deterministic addresses.

## Prerequisites

1. **Environment Variables**: Set up your `.env` file with:
   ```bash
   BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
   BASE_SEPOLIA_PRIVATE_KEY=your_private_key
   ```

2. **CREATE3 Deployer**: You need a CREATE3Deployer contract deployed. If you don't have one:
   ```bash
   # First deploy the CREATE2 factory (if needed)
   npx hardhat run scripts/deploy-deterministic-deployer.ts --network baseSepolia
   
   # Then deploy CREATE3Deployer
   npx hardhat run scripts/deploy-create3deployer-create2.ts --network baseSepolia
   ```

## Deployment Steps

### Step 1: Set Environment Variables

```bash
# Required: CREATE3 Deployer address (from previous step)
export CREATE3_DEPLOYER_ADDRESS=0x...

# Optional: AccountManager configuration
export ACCOUNT_MANAGER_GELATO_SENDER=0x...  # Gelato dedicated message sender (defaults to deployer)
export ACCOUNT_MANAGER_TIME_DELAY=0          # Timelock delay in seconds (default: 0)

# Optional: Custom salts for deterministic addresses
export CREATE3_SALT_ACCOUNT_MANAGER_IMPL="account-manager-impl"
export CREATE3_SALT_ACCOUNT_MANAGER_PROXY="account-manager-proxy"
```

### Step 2: Deploy AccountManager

```bash
npx hardhat run scripts/deploy-account-manager-create3.ts --network baseSepolia
```

The script will:
1. Deploy AccountManager implementation via CREATE3
2. Deploy AccountManager proxy via CREATE3
3. Initialize the proxy with Gelato sender and time delay
4. Print the deployed addresses

### Step 3: Update Frontend Configuration

After deployment, update your frontend `.env.local`:

```bash
NEXT_PUBLIC_ACCOUNT_MANAGER_ADDRESS=0x...  # The proxy address from deployment
```

## Multi-Chain Deployment

To deploy to the same address on multiple chains:

1. **Deploy CREATE3Deployer** on each chain with the same salt:
   ```bash
   export CREATE3_FACTORY_SALT="gmcoin-create3-factory"
   npx hardhat run scripts/deploy-create3deployer-create2.ts --network baseSepolia
   npx hardhat run scripts/deploy-create3deployer-create2.ts --network sepolia
   ```

2. **Deploy AccountManager** on each chain with the same salts:
   ```bash
   export CREATE3_DEPLOYER_ADDRESS=0x...  # Same on all chains
   export CREATE3_SALT_ACCOUNT_MANAGER_IMPL="account-manager-impl"
   export CREATE3_SALT_ACCOUNT_MANAGER_PROXY="account-manager-proxy"
   
   npx hardhat run scripts/deploy-account-manager-create3.ts --network baseSepolia
   npx hardhat run scripts/deploy-account-manager-create3.ts --network sepolia
   ```

The proxy address will be **identical** on all chains! ✅

## Verification

After deployment, verify the contract:

```bash
# Check owner
npx hardhat run --network baseSepolia -c "
const AccountManager = await ethers.getContractFactory('AccountManager');
const accountManager = AccountManager.attach('PROXY_ADDRESS');
console.log('Owner:', await accountManager.owner());
"
```

## Troubleshooting

### "CREATE3_DEPLOYER_ADDRESS not set"
- Deploy CREATE3Deployer first using `scripts/deploy-create3deployer-create2.ts`

### "Address already exists"
- The salt has already been used. Use a different salt or deploy to a different network.

### "Insufficient funds"
- Make sure your deployer account has enough ETH for gas fees.

