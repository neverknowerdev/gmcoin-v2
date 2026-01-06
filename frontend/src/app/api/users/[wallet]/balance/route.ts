import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { ethers } from 'ethers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ wallet: string }> }
) {
  try {
    const { wallet: walletParam } = await params;
    const wallet = walletParam.toLowerCase();
    const userResult = await db.query<{ user_id: string }>(
      'SELECT user_id FROM users WHERE primary_wallet = $1',
      [wallet]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({
        balance: '0',
        totalEarned: '0',
        totalTransferred: '0',
      });
    }

    const userId = userResult.rows[0].user_id;
    const balanceResult = await db.query<{
      balance: string;
      total_earned: string;
      total_transferred: string;
    }>(
      'SELECT balance, total_earned, total_transferred FROM balances WHERE user_id = $1',
      [userId]
    );

    if (balanceResult.rows.length === 0) {
      return NextResponse.json({
        balance: '0',
        totalEarned: '0',
        totalTransferred: '0',
      });
    }

    const balance = balanceResult.rows[0];
    return NextResponse.json({
      balance: ethers.formatEther(balance.balance),
      totalEarned: ethers.formatEther(balance.total_earned),
      totalTransferred: ethers.formatEther(balance.total_transferred),
    });
  } catch (error) {
    console.error('Error fetching balance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
