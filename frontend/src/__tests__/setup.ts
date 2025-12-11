import { db } from '@/lib/db/client';
import { ethers } from 'ethers';
import { runMigrations } from './migrate';

/**
 * Test database setup and teardown utilities
 */

export async function setupTestDatabase() {
  // Run migrations first to ensure tables exist
  try {
    await runMigrations();
  } catch (error) {
    console.error('Failed to run migrations:', error);
    throw error;
  }
  
  // Clean up test data before starting
  await cleanupTestData();
}

export async function cleanupTestData() {
  // Delete test data in reverse order of dependencies
  // Wrap in try-catch to handle cases where tables don't exist yet
  try {
    await db.query('DELETE FROM transactions WHERE hash LIKE $1 OR hash LIKE $2', ['test_%', 'test_mint_%']);
  } catch (error: any) {
    // Table doesn't exist yet, skip cleanup
    if (!error.message?.includes('does not exist')) throw error;
  }
  
  try {
    // Clean up balances for test users (matching test wallet patterns)
    await db.query(`
      DELETE FROM balances 
      WHERE user_id IN (
        SELECT user_id FROM users 
        WHERE primary_wallet LIKE $1 
           OR primary_wallet LIKE $2
           OR primary_wallet = $3
           OR primary_wallet = $4
      )
    `, ['0xtest%', '0x1111%', '0x1111111111111111111111111111111111111111', '0x2222222222222222222222222222222222222222']);
  } catch (error: any) {
    if (!error.message?.includes('does not exist')) throw error;
  }
  
  try {
    // Clean up test users (matching test wallet patterns)
    await db.query(`
      DELETE FROM users 
      WHERE primary_wallet LIKE $1 
         OR primary_wallet LIKE $2
         OR primary_wallet = $3
         OR primary_wallet = $4
    `, ['0xtest%', '0x1111%', '0x1111111111111111111111111111111111111111', '0x2222222222222222222222222222222222222222']);
  } catch (error: any) {
    if (!error.message?.includes('does not exist')) throw error;
  }
  
  try {
    await db.query('DELETE FROM epochs WHERE epoch_number >= $1', [1000]); // Test epochs start at 1000
  } catch (error: any) {
    if (!error.message?.includes('does not exist')) throw error;
  }
}

export async function createTestUser(wallet: string, userId: number = 1) {
  await db.query(
    `INSERT INTO users (user_id, primary_wallet, created_at, updated_at)
     VALUES ($1, $2, NOW(), NOW())
     ON CONFLICT (user_id) DO NOTHING`,
    [userId.toString(), wallet.toLowerCase()]
  );
  return userId;
}

export async function createTestBalance(userId: number, balance: string, totalEarned: string = '0', totalTransferred: string = '0') {
  const balanceWei = ethers.parseEther(balance).toString();
  const earnedWei = ethers.parseEther(totalEarned).toString();
  const transferredWei = ethers.parseEther(totalTransferred).toString();
  
  await db.query(
    `INSERT INTO balances (user_id, balance, total_earned, total_transferred, last_updated)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (user_id) DO UPDATE SET balance = $2, total_earned = $3, total_transferred = $4`,
    [userId.toString(), balanceWei, earnedWei, transferredWei]
  );
}

export async function createTestEpoch(epochNumber: number, isActive: boolean = false, multiplicator: string = '1000000000000000000'): Promise<number> {
  const startedAt = new Date();
  startedAt.setDate(startedAt.getDate() - (isActive ? 5 : 35)); // Active epoch started 5 days ago, inactive 35 days ago
  
  const endedAt = isActive ? null : new Date(startedAt);
  if (endedAt) {
    endedAt.setDate(endedAt.getDate() + 30);
  }

  const result = await db.query<{ id: number }>(
    `INSERT INTO epochs (epoch_number, started_at, ended_at, multiplicator, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
     ON CONFLICT (epoch_number) DO UPDATE SET
       started_at = $2, ended_at = $3, multiplicator = $4, is_active = $5
     RETURNING id`,
    [epochNumber, startedAt, endedAt, multiplicator, isActive]
  );
  
  return result.rows[0].id;
}

export async function createTestTransaction(
  hash: string,
  from: string,
  to: string,
  value: string,
  type: 'minting' | 'transfer',
  platform: 'twitter' | 'farcaster' | null = null,
  userId: number | null = null,
  epochId: number | null = null
) {
  const valueWei = ethers.parseEther(value).toString();
  const blockNumber = Math.floor(Math.random() * 1000000);
  const blockTimestamp = new Date();
  blockTimestamp.setDate(blockTimestamp.getDate() - Math.floor(Math.random() * 30));

  await db.query(
    `INSERT INTO transactions (hash, block_number, block_timestamp, "from", "to", value, type, platform, status, user_id, epoch_id, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
    [
      hash,
      blockNumber,
      blockTimestamp,
      from.toLowerCase(),
      to.toLowerCase(),
      valueWei,
      type,
      platform,
      'completed',
      userId?.toString() || null,
      epochId || null,
    ]
  );
}

export async function closeTestDatabase() {
  await cleanupTestData();
  // Don't close the pool as it's shared
}
