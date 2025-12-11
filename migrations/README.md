# Database Migrations

This folder contains database migration files for the GMCoin v2 project.

## Migration Files

Each migration has two files:
- `.up.sql` - Applies the migration
- `.down.sql` - Rolls back the migration

### 001_initial_schema
**Up Migration:** Creates the initial database schema with the following tables:
- `users` - Users table with wallet addresses and social platform IDs
- `epochs` - Epochs table tracking reward periods and multipliers
- `transactions` - Transactions table tracking on-chain and off-chain transactions
- `balances` - User balances table tracking token balances and earnings
- `minting_days` - Minting days table tracking daily minting operations
- `global_stats` - Global statistics table (single row)
- `daily_stats` - Daily statistics table tracking daily metrics

Also creates:
- Indexes on key columns for performance
- Foreign key constraints
- Triggers for automatic `updated_at` timestamp updates
- Helper function `update_updated_at_column()` for triggers

**Down Migration:** Removes all tables, triggers, functions, and indexes

### 002_create_helper_functions
**Up Migration:** Creates helper functions for common database operations:
- `get_user_statistics()` - Get comprehensive user statistics (transactions, earnings, transfers, balance)
- `get_user_balance_history()` - Get paginated transaction history for a user
- `get_epoch_statistics()` - Get comprehensive statistics for a specific epoch
- `get_active_epoch()` - Get the currently active epoch
- `get_transactions_by_filters()` - Get paginated transactions filtered by type, platform, and epoch
- `get_top_users_by_balance()` - Get top users ranked by balance
- `get_daily_statistics_range()` - Get daily statistics for a date range
- `update_user_balance()` - Update user balance (used by indexer)
- `get_minting_day_statistics()` - Get statistics for a specific minting day
- `get_global_statistics()` - Get global platform statistics
- `update_global_statistics()` - Recalculate and update global statistics
- `get_user_by_wallet()` - Get user by wallet address
- `get_user_transactions()` - Get paginated transactions for a user

**Down Migration:** Removes all helper functions

### 003_add_is_verified_to_users
**Up Migration:** Adds `is_verified` boolean column to users table
- Adds `is_verified` column (default: false)
- Creates index on `is_verified` column

**Down Migration:** Removes `is_verified` column and index

## Migration Tracking System

The migration system uses a `migrations` table to track all applied migrations. This table is automatically created by the migration script and contains:

- `version` - Primary key (INTEGER)
- `name` - Migration name with operation suffix (e.g., `001_initial_schema.up`)
- `hash` - SHA256 hash of the migration file
- `is_dirty` - Boolean flag indicating if migration is in progress
- `created_at` - Timestamp when the migration was applied

The system ensures:
- Migrations are only applied once
- Failed migrations are marked as dirty
- Version numbers are stored as integers
- Rollbacks remove migration records from the tracking table

## Usage

### Running Migrations

The migration system uses `run-migrations.sh` script which supports both up and down migrations.

#### Apply Migrations (Up)

Apply all new migrations that haven't been applied yet:
```bash
# Apply all new migrations
./migrations/run-migrations.sh up

# Apply migrations up to a specific version
./migrations/run-migrations.sh up 001
```

**Examples:**
```bash
# Apply all pending migrations
./migrations/run-migrations.sh up

# Apply only migrations up to version 001
./migrations/run-migrations.sh up 001

# With custom database connection string
DB_CONNECTION_STRING="postgres://user:pass@localhost:5432/dbname" ./migrations/run-migrations.sh up
```

The script will:
1. Check database connection
2. Ensure migrations table exists
3. Find the latest applied migration
4. Apply all new migrations in order
5. Track each migration in the database with hash and version

#### Rollback Migrations (Down)

Rollback migrations to a specific version:
```bash
# Rollback to a specific version number
./migrations/run-migrations.sh down 001

# Rollback to a specific migration by name
./migrations/run-migrations.sh down initial_schema
```

**Examples:**
```bash
# Rollback to version 001 (removes all migrations after 001)
./migrations/run-migrations.sh down 001

# Rollback to a migration by name
./migrations/run-migrations.sh down initial_schema

# With custom database connection string
DB_CONNECTION_STRING="postgres://user:pass@localhost:5432/dbname" ./migrations/run-migrations.sh down 001

# Skip confirmation prompt
./migrations/run-migrations.sh down 001 --force
```

**Important Notes:**
- Down migrations require a target version or migration name (required argument)
- The script will show a confirmation prompt before rolling back (unless --force is used)
- Migrations are rolled back in reverse order (newest first)
- Rolled back migrations are removed from the tracking table

### Migration File Naming

Migration files must follow this naming convention:
- Up migrations: `NNN_description.up.sql` (e.g., `001_initial_schema.up.sql`)
- Down migrations: `NNN_description.down.sql` (e.g., `001_initial_schema.down.sql`)

Where:
- `NNN` is a zero-padded version number (e.g., `001`, `002`, `015`)
- `description` is a descriptive name using underscores
- The version number is parsed as an integer (leading zeros are handled automatically)

### Checking Migration Status

You can check the current migration status by querying the migrations table:
```sql
-- View all applied migrations
SELECT version, name, is_dirty, created_at
FROM public.migrations
ORDER BY version;

-- Check for dirty (failed) migrations
SELECT version, name, created_at
FROM public.migrations
WHERE is_dirty = true;

-- Get latest applied version
SELECT MAX(version) as latest_version
FROM public.migrations
WHERE is_dirty = false;
```

### Environment Variables

The migration script uses the `DB_CONNECTION_STRING` environment variable:
```bash
# Set database connection string
export DB_CONNECTION_STRING="postgres://user:password@localhost:5432/database"

# Or use inline
DB_CONNECTION_STRING="postgres://user:password@localhost:5432/database" ./migrations/run-migrations.sh up
```

If not set, it defaults to: `postgres://postgres:postgres@localhost:5432/postgres`

### Troubleshooting

**Migration marked as dirty:**
If a migration fails, it will be marked as `is_dirty = true`. You should:
1. Fix the issue in the migration file
2. Manually clean up any partial changes
3. Update the migration record: `UPDATE public.migrations SET is_dirty = false WHERE version = X;`
4. Re-run the migration

**Version conflicts:**
If you need to re-apply a migration:
1. Remove it from the migrations table: `DELETE FROM public.migrations WHERE version = X;`
2. Re-run the migration script

**Checking migration file hash:**
The system tracks file hashes to detect changes. If a migration file is modified after being applied, you'll need to remove the old record and re-apply it.

## Notes

- All migrations use `IF NOT EXISTS` to prevent errors on re-runs
- Foreign key constraints ensure referential integrity
- Default values are set for appropriate columns
- All tables include comprehensive comments for documentation
- Migration versions are stored as integers in the database
- The migration system automatically tracks applied migrations and prevents duplicate applications
- Failed migrations are marked as dirty to prevent data corruption

## Dependencies

- PostgreSQL 12+ (for JSONB support and other features)
- The `users` table must be created before `transactions` and `balances` due to foreign key dependencies
- The `epochs` table must be created before `transactions` due to foreign key dependencies
