import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, PoolConfig, QueryResultRow } from 'pg';
import * as schema from './schema';

const DEFAULT_CONNECTION = 'postgres://postgres:postgres@localhost:5432/postgres';
const ENV_CONNECTION = process.env.DB_CONNECTION_STRING || process.env.DATABASE_URL || '';

// Determine if we're in a production/preview environment
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
const isPreview = process.env.VERCEL_ENV === 'preview';
const isProductionOrPreview = isProduction || isPreview;

// Check if connection string already has SSL parameters
const connectionString = ENV_CONNECTION || DEFAULT_CONNECTION;
const hasSSLInConnectionString = connectionString.includes('sslmode=') || 
                                  connectionString.includes('ssl=true') ||
                                  connectionString.includes('ssl=1');

// Configure pool with SSL for production/preview environments
const poolConfig: PoolConfig = {
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000, // Increased from 2000ms to 30s for slower connections
    // Note: statement_timeout should be set via connection string or after connection
    // Format: postgres://user:pass@host:port/db?statement_timeout=30000
};

// Add SSL configuration for production/preview if not already in connection string
if (isProductionOrPreview && !hasSSLInConnectionString) {
    // For Supabase and other managed PostgreSQL services, require SSL
    // but don't reject unauthorized certificates (common in managed services)
    poolConfig.ssl = {
        rejectUnauthorized: false,
    };
}

const pool = new Pool(poolConfig);

// Test connection
pool.on('connect', () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('✅ Connected to PostgreSQL database');
  }
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  if (process.env.NODE_ENV === 'production') {
    process.exit(-1);
  }
});

const drizzleDb = drizzle({ client: pool, schema });

export type Database = ReturnType<typeof drizzle<typeof schema>>;

// Compatibility layer for existing code that uses db.query()
// TODO: Migrate all code to use Drizzle query builder instead
// This provides backward compatibility while transitioning to Drizzle ORM
const db = {
  ...drizzleDb,
  query: async <T extends QueryResultRow = QueryResultRow>(text: string, params?: any[]) => {
    const start = Date.now();
    try {
      const res = await pool.query<T>(text, params);
      const duration = Date.now() - start;
      if (process.env.NODE_ENV === 'development') {
        console.log('Executed query', { text, duration, rows: res.rowCount });
      }
      return res;
    } catch (error: any) {
      // Log more details about connection errors
      if (error.message?.includes('timeout') || error.message?.includes('Connection terminated')) {
        console.error('Database connection error:', {
          message: error.message,
          code: error.code,
          query: text.substring(0, 100), // Log first 100 chars of query
        });
      } else {
        console.error('Database query error:', error);
      }
      throw error;
    }
  },
  getClient: () => {
    return pool.connect();
  },
  end: async () => {
    await pool.end();
  },
};

// Export both: db (with compatibility layer) and drizzleDb (pure Drizzle)
export { db, drizzleDb, pool, schema };
export default db;
