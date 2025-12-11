import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { ethers } from 'ethers';

export async function GET() {
  try {
    const totalUsersResult = await db.query<{ count: string }>(
      'SELECT COUNT(*) as count FROM users'
    );
    const totalUsers = parseInt(totalUsersResult.rows[0].count);

    const totalTransactionsResult = await db.query<{ count: string }>(
      'SELECT COUNT(*) as count FROM transactions'
    );
    const totalTransactions = parseInt(totalTransactionsResult.rows[0].count);

    const totalTokenizedResult = await db.query<{ sum: string }>(
      "SELECT COALESCE(SUM(value), '0') as sum FROM transactions WHERE type = 'minting'"
    );
    const totalTokenized = totalTokenizedResult.rows[0].sum || '0';

    const twitterTokensResult = await db.query<{ sum: string }>(
      "SELECT COALESCE(SUM(value), '0') as sum FROM transactions WHERE type = 'minting' AND platform = 'twitter'"
    );
    const twitterTotal = twitterTokensResult.rows[0].sum || '0';

    const farcasterTokensResult = await db.query<{ sum: string }>(
      "SELECT COALESCE(SUM(value), '0') as sum FROM transactions WHERE type = 'minting' AND platform = 'farcaster'"
    );
    const farcasterTotal = farcasterTokensResult.rows[0].sum || '0';

    const totalMinted = BigInt(totalTokenized);
    const twitterBigInt = BigInt(twitterTotal);
    const farcasterBigInt = BigInt(farcasterTotal);

    const twitterPercentage = totalMinted > 0
      ? Number((twitterBigInt * BigInt(10000)) / totalMinted) / 100
      : 0;
    const farcasterPercentage = totalMinted > 0
      ? Number((farcasterBigInt * BigInt(10000)) / totalMinted) / 100
      : 0;

    // Get users today
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const usersTodayResult = await db.query<{ count: string }>(
      'SELECT COUNT(*) as count FROM users WHERE created_at >= $1',
      [today]
    );
    const usersToday = parseInt(usersTodayResult.rows[0].count);

    return NextResponse.json({
      totalTokenized: ethers.formatEther(totalTokenized),
      totalUsers,
      usersToday,
      twitterPercentage,
      farcasterPercentage,
    });
  } catch (error) {
    console.error('Error fetching global stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
