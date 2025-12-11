# GMCoin v2 - Full Stack Architecture

## Overview

This document describes the complete fullstack architecture for GMCoin v2, including database design, API services, and frontend integration.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                    │
│  - React Components                                          │
│  - React Query for data fetching                             │
│  - Wagmi for blockchain interactions                         │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ HTTP/REST API
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Next.js API Routes (Server-side)                │
│  - Next.js API Route Handlers                              │
│  - Query indexed data from PostgreSQL                        │
│  - Aggregated statistics                                    │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ Database Queries
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                  PostgreSQL Database                          │
│  - Users, Epochs, Transactions                               │
│  - Balances, Leaderboard, Stats                              │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ Indexed Data
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Database (PostgreSQL)                           │
│  - Stores indexed blockchain data                            │
│  - Users, Epochs, Transactions, Balances                    │
│  - Statistics and aggregated data                            │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ Data Storage
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    Blockchain (Base Sepolia)                 │
│  - AccountManager Contract                                  │
│  - GMCoin ERC20 Contract                                   │
│  - Minter Contract                                          │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### Core Tables

#### `users`
Stores on-chain user accounts from AccountManager contract.
- `userId`: On-chain user ID (unique)
- `primaryWallet`: Ethereum address
- `twitterId`: Twitter account ID (optional)
- `farcasterFid`: Farcaster FID (optional)
- `humanVerification`: Verification status enum
- `createdAt`, `updatedAt`: Timestamps

#### `epochs`
Stores epoch information and settings.
- `epochNumber`: Sequential epoch number
- `startedAt`, `endedAt`: Epoch time range
- `multiplicator`: Coin multiplicator for this epoch
- `lastEpochPoints`: Points from previous epoch
- `currentEpochPoints`: Points accumulated in current epoch
- `isActive`: Whether this epoch is currently active

#### `transactions`
Stores all GMCoin transfers and mints.
- `hash`: Transaction hash (unique)
- `blockNumber`, `blockTimestamp`: Block information
- `from`, `to`: Transaction addresses
- `value`: Amount transferred/minted
- `type`: "minting" | "transfer"
- `platform`: "twitter" | "farcaster" | null
- `status`: "pending" | "completed" | "failed"
- Relations: `userId`, `epochId`

#### `balances`
Stores user balances and earnings.
- `userId`: Reference to user
- `balance`: Current GM balance
- `totalEarned`: Total GM earned from minting
- `totalTransferred`: Total GM transferred out
- `lastUpdated`: Last update timestamp

#### `minting_days`
Tracks daily minting process.
- `mintingDayTimestamp`: Day start timestamp (unique)
- `platform`: "twitter" | "farcaster"
- `status`: "started" | "processing" | "finished" | "errored"
- `totalPoints`: Points processed for this day
- `runningHash`, `ipfsCid`: Minting metadata

#### `global_stats`
Aggregated global statistics (single row).
- `totalTokenized`: Total GM tokens minted
- `totalUsers`: Total unique users
- `totalTransactions`: Total transaction count
- `twitterPercentage`, `farcasterPercentage`: Platform distribution

#### `daily_stats`
Daily aggregated statistics.
- `date`: Date (unique)
- `tokensMinted`: Tokens minted on this day
- `newUsers`: New users registered
- `transactions`: Transaction count
- `twitterTokens`, `farcasterTokens`: Platform-specific tokens

## API Services

### Next.js API Routes (`frontend/src/app/api/`)

**Purpose**: Provide REST API endpoints for frontend data queries.

All API functionality is handled by Next.js API routes, eliminating the need for a separate backend server.

**Endpoints**:

#### Epochs
- `GET /api/epochs/current` - Get current active epoch
- `GET /api/epochs?limit=50` - Get epoch history

#### User Data
- `GET /api/users/:wallet/balance` - Get user balance
- `GET /api/users/:wallet/transactions?type=minting&limit=50` - Get transaction history

#### Leaderboard
- `GET /api/leaderboard?limit=100` - Get top users by balance

#### Statistics
- `GET /api/stats/global` - Global statistics
- `GET /api/stats/daily?days=7` - Daily tokenization data

**Features**:
- Fast queries on indexed data (no direct blockchain calls)
- Pagination and filtering
- Real-time data (as indexer processes blocks)
- Error handling and validation

## Frontend Integration

### API Client (`frontend/src/lib/api/client.ts`)

Type-safe API client with methods for all endpoints.

### React Hooks (`frontend/src/hooks/`)

- `useEpochs()` - Fetch epoch data
- `useCurrentEpoch()` - Get current epoch
- `useUserBalance()` - Get user balance
- `useUserTransactions()` - Get transaction history
- `useLeaderboard()` - Get leaderboard
- `useGlobalStats()` - Get global statistics
- `useDailyStats()` - Get daily statistics

All hooks use React Query for:
- Automatic caching
- Background refetching
- Loading/error states
- Optimistic updates

### Updated Pages

#### `/epoch-history`
- Fetches real epoch data from API
- Displays current and historical epochs
- Shows minting difficulty and dates

#### `/history`
- Fetches user transactions from API
- Filters by type (minting/transfer)
- Shows platform (Twitter/Farcaster)
- Displays real balance

#### `/stats`
- Shows global statistics
- Daily tokenization chart
- Platform distribution (Twitter vs Farcaster)
- Current epoch information

#### `/home`
- Real user balance
- Live leaderboard
- Current epoch card
- Tokenization progress

## Data Flow

### User Registration Flow
1. User connects wallet → Frontend
2. User verifies Twitter/Farcaster → AccountManager contract
3. Verification event emitted → Blockchain
4. Indexer picks up event → Indexer Service
5. User data fetched from contract → Indexer Service
6. User stored in database → PostgreSQL
7. Frontend queries user data → API → Frontend

### Minting Flow
1. Daily minting process → Minter contract
2. Minting events emitted → Blockchain
3. Indexer processes events → Indexer Service
4. Transactions stored → PostgreSQL
5. Balances updated → PostgreSQL
6. Frontend queries balance → API → Frontend

### Query Flow
1. User opens page → Frontend
2. React hook calls API → API Client
3. Next.js API route queries database → PostgreSQL
4. Data returned → Next.js API Route → Frontend
5. UI updates → React Components

## Performance Considerations

### Indexer
- Processes blocks in batches (1000 at a time)
- Continues from last processed block
- Handles reorgs gracefully
- Efficient event filtering

### API
- Indexed queries (no blockchain calls)
- Pagination for large datasets
- Caching via React Query
- Background refetching

### Database
- Indexes on frequently queried fields:
  - `users.primaryWallet`
  - `transactions.blockTimestamp`
  - `transactions.userId`
  - `epochs.epochNumber`
  - `balances.balance`

## Security

- API endpoints validate input
- Database uses parameterized queries (pg library with SQL)
- No sensitive data stored (only public blockchain data)
- CORS configured for frontend domain
- Environment variables for secrets

## Scalability

### Horizontal Scaling
- API service can run multiple instances (stateless)
- Indexer should run single instance (stateful)
- Database can be replicated for read queries

### Optimization
- Database indexes on query patterns
- Batch processing in indexer
- Pagination in API responses
- React Query caching reduces API calls

## Monitoring

### Indexer Health
- Console logs for block processing
- Error logging for failed events
- Database query monitoring

### API Health
- `/health` endpoint
- Error logging
- Response time monitoring

### Database Health
- Connection pool monitoring
- Query performance
- Table sizes and growth

## Future Enhancements

1. **Real-time Updates**: WebSocket support for live data
2. **Analytics**: More detailed statistics and charts
3. **Caching Layer**: Redis for frequently accessed data
4. **Search**: Full-text search for users/transactions
5. **Notifications**: User notifications for minting/transfers
6. **GraphQL**: Alternative API with GraphQL
7. **Multi-chain**: Support for multiple blockchain networks
