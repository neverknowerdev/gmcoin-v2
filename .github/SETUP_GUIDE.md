# GitHub Actions Setup Guide for GMCoin v2

This guide explains how to set up GitHub Actions for GMCoin v2, including smart contract deployment, database setup, and Vercel deployment.

## Overview

The GitHub Actions setup for GMCoin v2 includes:

1. **CI Workflow** - Runs tests on pull requests
2. **Deploy to Preview Workflow** - Deploys contracts, sets up database, and deploys to Vercel

## Prerequisites

### 1. Deploy W3F Manager (One-Time Setup)

Before using the GitHub Actions, you must manually deploy the W3F Manager contract to Base Sepolia:

1. Deploy the W3F Manager contract to Base Sepolia
2. Get the following addresses:
   - W3F Manager contract address
   - W3F Dedicated Message Sender address
3. These addresses will be **constant** across all deployments

### 2. Required GitHub Secrets

Go to your repository → Settings → Secrets and variables → Actions → New repository secret

Add the following secrets:

#### Smart Contract Deployment
```
BASE_SEPOLIA_RPC_URL=<your-base-sepolia-rpc-url>
BASE_SEPOLIA_PRIVATE_KEY=<deployer-private-key>
ETHERSCAN_API_KEY=<your-etherscan-api-key>
W3F_MANAGER_ADDRESS=<w3f-manager-contract-address>  # Constant
W3F_DEDICATED_MSG_SENDER=<w3f-dedicated-msg-sender-address>  # Constant
GMCOIN_OWNER=<owner-address>
GMCOIN_FEE_ADDRESS=<fee-address>
GMCOIN_TREASURY_ADDRESS=<treasury-address>
GMCOIN_COINS_MULTIPLICATOR=300  # Optional, defaults to 300
GMCOIN_EPOCH_DAYS=30  # Optional, defaults to 30
GMCOIN_TIME_DELAY=0  # Optional, defaults to 0
```

#### Database
```
DB_CONNECTION_STRING=<postgresql-connection-string>
```

#### Vercel
```
VERCEL_TOKEN=<your-vercel-token>
```

### 3. Required GitHub Variables

Go to your repository → Settings → Secrets and variables → Actions → Variables tab

Add the following variables:

```
VERCEL_ORG_ID=<your-vercel-org-id>
VERCEL_PROJECT_ID=<your-vercel-project-id>
```

## How It Works

### Smart Contract Deployment

The deployment process:

1. **Calculates contracts hash** - Creates a hash of all contract files
2. **Checks cache** - Looks for existing deployment with matching hash
3. **Deploys if needed** - Only deploys if:
   - Contracts changed (hash mismatch)
   - Force deploy is enabled (new PR opened)
   - Cache miss (first deployment)
4. **Saves to cache** - Stores deployment addresses for future use

**Deployed Contracts:**
- AccountManager (proxy + implementation)
- Minter (proxy + implementation)
- GMCoin (proxy + implementation)
- Treasury

**Important**: W3F Manager and Dedicated Message Sender addresses are **constant** and come from secrets. They are not deployed as part of this workflow.

### Database Setup

The database setup process:

1. **Creates branch database** - Sanitizes branch name and creates a new database
2. **Calculates migrations hash** - Creates a hash of all migration files
3. **Checks cache** - Looks for existing migrations with matching hash
4. **Runs migrations if needed** - Only runs if:
   - Migrations changed (hash mismatch)
   - Database is new
   - Force deploy is enabled

**Note**: If there's no `migrations/` directory, the database setup step will be skipped gracefully.

### Vercel Deployment

The Vercel deployment:

1. **Deploys frontend** - Uses Vercel CLI to deploy the frontend
2. **Sets environment variables** - Includes all contract addresses and database connection string
3. **Comments PR** - Adds a comment with preview URL

## Workflow Triggers

### CI Workflow
- Triggers on: Pull request (opened, synchronize, reopened)
- Runs: Tests

### Deploy to Preview Workflow
- Triggers on: Pull request (opened, synchronize, reopened)
- Runs: Contract deployment, database setup, Vercel deployment

## Deployment Output

After a successful deployment, you'll see:

1. **PR Comment** with deployment info:
   ```
   ## 🚀 Deployment Complete
   
   **📦 Smart Contracts Deployed**
   - AccountManager: `0x...`
   - Minter: `0x...`
   - GMCoin: `0x...`
   - Treasury: `0x...`
   
   **🗄️ Database Created/Migrated**
   - Database Name: `branch_name`
   ```

2. **PR Comment** with Vercel preview URL:
   ```
   ## 🚀 Vercel Preview Deployment
   
   Preview deployment is ready:
   
   **🔗 [Branch Preview](https://...)**
   ```

3. **deployment.json** file (cached) with all contract addresses:
   ```json
   {
     "baseSepolia": {
       "network": "baseSepolia",
       "accountManagerAddress": "0x...",
       "minterAddress": "0x...",
       "gmCoinAddress": "0x...",
       "treasuryAddress": "0x..."
     }
   }
   ```

## Troubleshooting

### Contracts not deploying

**Problem**: Deployment step fails

**Solutions**:
- Check that all required secrets are set correctly
- Verify `BASE_SEPOLIA_PRIVATE_KEY` has sufficient funds
- Ensure `BASE_SEPOLIA_RPC_URL` is accessible
- Check that `W3F_MANAGER_ADDRESS` and `W3F_DEDICATED_MSG_SENDER` are valid addresses

### Database setup failing

**Problem**: Database creation or migrations fail

**Solutions**:
- Verify `DB_CONNECTION_STRING` is correct
- Check that the database server allows connections from GitHub Actions IPs
- Ensure migrations directory structure is correct if using `run-migrations.sh`
- Check PostgreSQL client is installed (should be automatic in action)

### Vercel deployment failing

**Problem**: Vercel deployment step fails

**Solutions**:
- Verify `VERCEL_TOKEN` is valid
- Check `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` are set as **Variables** (not Secrets)
- Ensure frontend directory structure is correct
- Check that `frontend/` directory exists

### Cache issues

**Problem**: Old deployments are being used even after changes

**Solutions**:
- The cache is based on contract/migration hashes, so changes should invalidate it automatically
- To force a fresh deployment, you can delete the cache manually in GitHub Actions
- Or reopen the PR to trigger `force_deploy: true`

## Key Differences from Tactiball/Chessball

1. **W3F Manager is constant** - Unlike other contracts, W3F Manager and Dedicated Message Sender addresses are constant and come from secrets
2. **Multiple contracts** - Deploys 4 contracts (AccountManager, Minter, GMCoin, Treasury) instead of one
3. **Database is optional** - If no migrations directory exists, database setup is skipped gracefully

## Next Steps

1. Deploy W3F Manager to Base Sepolia
2. Add all required secrets and variables to GitHub
3. Create a test PR to verify everything works
4. Set up branch protection rules to require tests to pass

## Support

For issues or questions, check:
- `.github/README.md` - Detailed documentation
- GitHub Actions logs - For detailed error messages
- Contract deployment logs - In the deploy-contract action output

