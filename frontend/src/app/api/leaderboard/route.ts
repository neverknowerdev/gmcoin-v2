import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { ethers } from 'ethers';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100');

    const result = await db.query<{
      user_id: string;
      primary_wallet: string;
      balance: string;
      total_earned: string;
    }>(
      `SELECT b.user_id, u.primary_wallet, b.balance, b.total_earned
       FROM balances b
       JOIN users u ON b.user_id = u.user_id
       ORDER BY b.balance DESC
       LIMIT $1`,
      [limit]
    );

    const leaderboard = result.rows.map((row, index) => ({
      rank: index + 1,
      userId: row.user_id,
      wallet: row.primary_wallet,
      balance: ethers.formatEther(row.balance),
      totalEarned: ethers.formatEther(row.total_earned),
    }));

    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
