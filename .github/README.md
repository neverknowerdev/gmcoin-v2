# GitHub Actions Workflows

This directory contains GitHub Actions workflows for automated testing and CI/CD for GMCoin v2.

## Workflows

### 1. CI (`ci.yml`)
- **Triggers**: Pull requests to any branch (opened, synchronize, reopened)
- **Job**: `Run Tests` - Runs Hardhat tests
- **Purpose**: Prevents merging PRs with failing tests when set as required status check

### 2. Deploy to Preview (`deploy-to-preview.yml`)
- **Triggers**: Pull requests to any branch (opened, synchronize, reopened)
- **Jobs**:
  - **Deploy to Vercel**: 
    - Deploys smart contracts (AccountManager, Minter, GMCoin, Treasury) to Base Sepolia
    - Sets up database and runs migrations (if migrations directory exists)
    - Deploys frontend to Vercel
    - Comments PR with deployment info and preview URLs

## Actions

### 1. Deploy Contract (`actions/deploy-contract/`)
Deploys smart contracts to Base Sepolia with caching support:
- AccountManager (proxy)
- Minter (proxy)
- GMCoin (proxy)
- Treasury

**Key Features:**
- Caches deployments based on contracts hash
- Uses constant W3F Manager address and dedicated message sender (configured in secrets)
- Skips deployment if contracts haven't changed

**Required Secrets:**
- `BASE_SEPOLIA_RPC_URL`
- `BASE_SEPOLIA_PRIVATE_KEY`
- `ETHERSCAN_API_KEY`
- `W3F_MANAGER_ADDRESS` (constant, already deployed)
- `W3F_DEDICATED_MSG_SENDER` (constant)
- `GMCOIN_OWNER`
- `GMCOIN_FEE_ADDRESS`
- `GMCOIN_TREASURY_ADDRESS`
- `GMCOIN_COINS_MULTIPLICATOR`
- `GMCOIN_EPOCH_DAYS`
- `GMCOIN_TIME_DELAY`

### 2. Setup Database (`actions/setup-database/`)
Creates database and runs migrations with caching support:
- Creates a new database per branch (sanitized branch name)
- Runs migrations from `migrations/` directory if it exists
- Caches migrations hash to skip re-running unchanged migrations

**Key Features:**
- Automatically creates branch-specific databases
- Skips migrations if hash matches cache
- Supports `migrations/run-migrations.sh` script (like chessball) or direct SQL files

**Required Secrets:**
- `DB_CONNECTION_STRING` (PostgreSQL connection string)

## W3F Manager Setup

**Important**: The W3F Manager contract must be deployed manually to Base Sepolia before using these workflows. This is a one-time setup to avoid needing Gelato approval for every deployment.

1. Deploy W3F Manager to Base Sepolia
2. Get the W3F Manager address and dedicated message sender address
3. Add them to GitHub Secrets:
   - `W3F_MANAGER_ADDRESS`
   - `W3F_DEDICATED_MSG_SENDER`

These addresses will be used for every deployment, while AccountManager, Minter, and GMCoin addresses will be different for each deployment.

## Environment Variables

### GitHub Secrets (Repository Settings → Secrets and variables → Actions)

#### Smart Contract Deployment
- `BASE_SEPOLIA_RPC_URL` - Base Sepolia RPC endpoint
- `BASE_SEPOLIA_PRIVATE_KEY` - Deployer wallet private key
- `ETHERSCAN_API_KEY` - Etherscan API key for contract verification
- `W3F_MANAGER_ADDRESS` - Pre-deployed W3F Manager address (constant)
- `W3F_DEDICATED_MSG_SENDER` - W3F Dedicated Message Sender address (constant)
- `GMCOIN_OWNER` - Owner address for GMCoin contract
- `GMCOIN_FEE_ADDRESS` - Fee collection address
- `GMCOIN_TREASURY_ADDRESS` - Treasury address
- `GMCOIN_COINS_MULTIPLICATOR` - Coins multiplicator (default: 300)
- `GMCOIN_EPOCH_DAYS` - Epoch duration in days (default: 30)
- `GMCOIN_TIME_DELAY` - Timelock delay in seconds (default: 0)

#### Database
- `DB_CONNECTION_STRING` - PostgreSQL connection string

#### Vercel
- `VERCEL_TOKEN` - Vercel authentication token
- `VERCEL_ORG_ID` - Vercel organization ID (GitHub Variables)
- `VERCEL_PROJECT_ID` - Vercel project ID (GitHub Variables)

## Deployment Process

1. **Contract Deployment**
   - Calculates hash of all contracts
   - Checks cache for existing deployment with matching hash
   - Deploys new contracts if hash changed or force_deploy is true
   - Saves deployment addresses to cache

2. **Database Setup**
   - Creates branch-specific database (sanitized branch name)
   - Calculates hash of migration files
   - Runs migrations if hash changed or database is new
   - Caches migration hash

3. **Vercel Deployment**
   - Deploys frontend with contract addresses as environment variables
   - Comments PR with preview URL

## Deployment Output

The deployment script (`scripts/deploy-testnet.ts`) outputs a `deployment.json` file with the following structure:

```json
{
  "baseSepolia": {
    "network": "baseSepolia",
    "deployedAt": "2024-01-01T00:00:00.000Z",
    "deployer": "0x...",
    "accountManagerAddress": "0x...",
    "accountManagerImplAddress": "0x...",
    "minterAddress": "0x...",
    "minterImplAddress": "0x...",
    "gmCoinAddress": "0x...",
    "gmCoinImplAddress": "0x...",
    "treasuryAddress": "0x..."
  }
}
```

## Setting Up Required Status Checks

To prevent PRs from being merged if tests fail:

1. Go to your GitHub repository
2. Navigate to **Settings** → **Branches**
3. Click **Add rule** or edit existing branch protection rule
4. Set **Branch name pattern** to `main` (and `develop` if you want)
5. Enable these options:
   - ✅ **Require status checks to pass before merging**
   - ✅ **Require branches to be up to date before merging**
6. In the status checks section, add: `Run Tests`
7. Click **Create** or **Save changes**

**Result**: PRs cannot be merged until the "Run Tests" check passes! 🚫❌

## Troubleshooting

### Contracts not deploying
- Check that all required secrets are set
- Verify `BASE_SEPOLIA_PRIVATE_KEY` has sufficient funds
- Check `BASE_SEPOLIA_RPC_URL` is accessible

### Database setup failing
- Ensure `DB_CONNECTION_STRING` is correct
- Check that the database server allows connections from GitHub Actions IPs
- Verify migrations directory structure if using `run-migrations.sh`

### Vercel deployment failing
- Verify `VERCEL_TOKEN` is valid
- Check `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` are set as GitHub Variables (not Secrets)
- Ensure frontend directory structure is correct

