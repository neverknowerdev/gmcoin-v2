import { readFileSync, existsSync, writeFileSync, unlinkSync } from 'fs';
import { join, resolve } from 'path';
import { execSync } from 'child_process';
import { tmpdir } from 'os';
import { db } from '@/lib/db/client';

/**
 * Split SQL file into individual statements
 * Handles PL/pgSQL functions with $$ delimiters and multiple statements
 */
function splitSQLStatements(sql: string): string[] {
  const statements: string[] = [];
  let currentStatement = '';
  let inFunctionBody = false;
  let dollarDelimiter = '';
  
  const lines = sql.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Skip comment-only lines (but keep them if inside function)
    if (trimmed.startsWith('--') && !inFunctionBody) {
      continue;
    }
    
    currentStatement += line + '\n';
    
    // Check for $$ delimiter (PL/pgSQL function body delimiter)
    // Match patterns like $$, $tag$, etc.
    const dollarMatches = line.match(/\$[^$]*\$/g);
    if (dollarMatches) {
      for (const match of dollarMatches) {
        if (!inFunctionBody) {
          // Starting a function body (e.g., "AS $$" or "RETURNS ... AS $$")
          inFunctionBody = true;
          dollarDelimiter = match;
        } else if (match === dollarDelimiter) {
          // Ending a function body (e.g., "END; $$ LANGUAGE plpgsql;")
          // The function definition statement continues until the semicolon
          inFunctionBody = false;
          dollarDelimiter = '';
          // Don't break here - wait for semicolon to end the statement
        }
      }
    }
    
    // Split on semicolons, but only when not inside a function body
    // Function definitions end with semicolon after the closing $$ delimiter
    if (trimmed.endsWith(';')) {
      if (!inFunctionBody) {
        // Regular statement or function definition that just ended
        const stmt = currentStatement.trim();
        if (stmt && stmt.length > 1 && !stmt.match(/^\s*--/)) {
          statements.push(stmt);
        }
        currentStatement = '';
      }
      // If inFunctionBody is true, we're still inside the function body, keep accumulating
      // The semicolon will be part of the function body until we see the closing $$
    }
  }
  
  // Add any remaining statement
  const remaining = currentStatement.trim();
  if (remaining && remaining.length > 0 && !remaining.match(/^\s*--/)) {
    statements.push(remaining);
  }
  
  return statements.filter(s => s.length > 0);
}

/**
 * Run migrations programmatically for tests
 */
export async function runMigrations() {
  // Migrations folder is at the root level
  // When running from frontend directory, go up one level to reach migrations
  // Try multiple possible paths
  const possiblePaths = [
    join(process.cwd(), '..', 'migrations'), // From frontend/
    join(process.cwd(), 'migrations'), // From root/
    resolve(__dirname, '..', '..', '..', 'migrations'), // From compiled dist/
  ];
  
  let migrationsDir: string | null = null;
  for (const path of possiblePaths) {
    if (existsSync(join(path, '001_initial_schema.up.sql'))) {
      migrationsDir = path;
      break;
    }
  }
  
  if (!migrationsDir) {
    throw new Error(`Could not find migrations directory. Tried: ${possiblePaths.join(', ')}`);
  }
  
  // Read migration files in order
  const migrationFiles = [
    '001_initial_schema.up.sql',
    '002_create_helper_functions.up.sql',
    '003_add_is_verified_to_users.up.sql',
  ];

  // Ensure migrations table exists
  await db.query(`
    CREATE TABLE IF NOT EXISTS public.migrations (
      version INTEGER PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      hash VARCHAR(64) NOT NULL,
      is_dirty BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  // Check which migrations have been applied
  const appliedMigrations = await db.query<{ version: number; name: string }>(
    'SELECT version, name FROM public.migrations WHERE is_dirty = false ORDER BY version'
  );

  const appliedVersions = new Set(appliedMigrations.rows.map(m => m.version));

  // Run pending migrations
  for (const file of migrationFiles) {
    const version = parseInt(file.split('_')[0]);
    
    if (appliedVersions.has(version)) {
      continue; // Skip already applied migrations
    }

    const migrationPath = join(migrationsDir, file);
    
    if (!existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }
    
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    try {
      // Use psql to execute migration files - this properly handles PL/pgSQL functions
      // The pg library's query() method doesn't handle GET DIAGNOSTICS correctly
      const dbUrl = process.env.DATABASE_URL || process.env.TEST_DATABASE_URL;
      if (!dbUrl) {
        throw new Error('DATABASE_URL or TEST_DATABASE_URL must be set');
      }
      
      // Write SQL to temp file
      const tmpFile = join(tmpdir(), `migration_${version}_${Date.now()}.sql`);
      
      try {
        writeFileSync(tmpFile, migrationSQL);
        
        // Execute via psql - this handles PL/pgSQL functions correctly
        execSync(`psql "${dbUrl}" -f "${tmpFile}"`, {
          stdio: 'pipe',
          encoding: 'utf-8',
          env: { ...process.env, PGOPTIONS: '-c client_min_messages=WARNING' },
        });
      } finally {
        // Clean up temp file
        if (existsSync(tmpFile)) {
          unlinkSync(tmpFile);
        }
      }
      
      // Record migration
      await db.query(
        `INSERT INTO public.migrations (version, name, hash, is_dirty)
         VALUES ($1, $2, $3, false)
         ON CONFLICT (version) DO UPDATE SET is_dirty = false`,
        [version, file, 'test-hash'] // Hash not critical for tests
      );
    } catch (error) {
      // Mark as dirty on failure
      await db.query(
        `INSERT INTO public.migrations (version, name, hash, is_dirty)
         VALUES ($1, $2, $3, true)
         ON CONFLICT (version) DO UPDATE SET is_dirty = true`,
        [version, file, 'test-hash']
      );
      throw error;
    }
  }
}
