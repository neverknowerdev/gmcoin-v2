# Backend Migration to Next.js API Routes

## Overview

All backend functionality has been migrated from a separate Express.js backend to Next.js API routes. This consolidates the entire application into a single Next.js monorepo.

## Changes Made

### 1. Database Client (`src/lib/db/`)
- **Moved from:** `backend/src/db/`
- **Location:** `frontend/src/lib/db/`
- **Files:**
  - `client.ts` - Database connection and query utilities
  - `schema.ts` - Drizzle ORM schema definitions

### 2. API Routes (`src/app/api/`)
All API endpoints are now Next.js route handlers:

- **Health Check:** `src/app/api/health/route.ts`
- **Epochs:**
  - `src/app/api/epochs/current/route.ts` - Current active epoch
  - `src/app/api/epochs/route.ts` - Epoch history
- **Users:**
  - `src/app/api/users/[wallet]/transactions/route.ts` - User transactions
  - `src/app/api/users/[wallet]/balance/route.ts` - User balance
- **Leaderboard:** `src/app/api/leaderboard/route.ts`
- **Statistics:**
  - `src/app/api/stats/global/route.ts` - Global stats
  - `src/app/api/stats/daily/route.ts` - Daily stats

### 3. API Client (`src/lib/api/client.ts`)
- **Updated:** Changed `API_BASE_URL` from external URL to empty string (relative paths)
- **Result:** All API calls now use relative paths (`/api/...`) instead of `http://localhost:3001/api/...`

### 4. Test Files (`src/__tests__/`)
- **Moved from:** `backend/src/__tests__/`
- **Location:** `frontend/src/__tests__/`
- **Files:**
  - `setup.ts` - Test utilities for database setup/teardown
  - `api-routes.test.ts` - Tests for Next.js API routes
- **Configuration:**
  - `jest.config.js` - Jest configuration with Next.js support
  - `jest.setup.js` - Test environment setup

### 5. Dependencies (`package.json`)
**Added:**
- `drizzle-orm` - Database ORM
- `ethers` - Ethereum utilities
- `pg` - PostgreSQL client
- `jest` - Testing framework
- `jest-environment-node` - Node test environment
- `@types/jest` - Jest TypeScript types
- `@types/pg` - PostgreSQL TypeScript types

**Scripts Added:**
- `npm test` - Run tests
- `npm run test:watch` - Watch mode
- `npm run test:coverage` - Coverage report

## API Endpoints

All endpoints maintain the same structure and behavior:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/epochs/current` | GET | Current active epoch |
| `/api/epochs` | GET | Epoch history (with `?limit=N`) |
| `/api/users/[wallet]/transactions` | GET | User transactions (with `?type=minting\|transfer&limit=N`) |
| `/api/users/[wallet]/balance` | GET | User balance and stats |
| `/api/leaderboard` | GET | Leaderboard (with `?limit=N`) |
| `/api/stats/global` | GET | Global platform statistics |
| `/api/stats/daily` | GET | Daily tokenization stats (with `?days=N`) |

## Environment Variables

The following environment variables are used:

- `DATABASE_URL` or `DB_CONNECTION_STRING` - PostgreSQL connection string
- `TEST_DATABASE_URL` - Test database connection (for tests)
- `NODE_ENV` - Environment (development/production)

## Running the Application

### Development
```bash
cd frontend
npm install
npm run dev
```

The API routes will be available at `http://localhost:3000/api/...`

### Production Build
```bash
npm run build
npm start
```

## Running Tests

### Setup Test Database
```bash
createdb gmcoin_test
DATABASE_URL="postgres://postgres:postgres@localhost:5432/gmcoin_test" npm run migrate
```

### Run Tests
```bash
npm test
npm run test:watch
npm run test:coverage
```

## Migration Notes

1. **No Separate Backend Server:** The Express.js backend server is no longer needed. All API functionality is handled by Next.js.

2. **Database Connection:** The database client is now imported directly in API routes. Connection pooling is handled automatically.

3. **API Client:** Frontend API client now uses relative paths, making it work seamlessly in both development and production.

4. **Testing:** Tests now use Next.js route handlers directly instead of Express app instances.

5. **Deployment:** Everything can be deployed as a single Next.js application (e.g., Vercel, Netlify, etc.).

## Benefits

- ✅ Single codebase and deployment
- ✅ No need to manage separate backend server
- ✅ Simplified development workflow
- ✅ Better integration with Next.js features
- ✅ Easier deployment (single application)
- ✅ Reduced infrastructure complexity

## Migration Complete ✅

All backend functionality has been successfully migrated to Next.js API routes. The separate backend folder has been removed, and the codebase is now consolidated into a single Next.js application.
