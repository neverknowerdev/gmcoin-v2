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
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const type = searchParams.get('type') || undefined;

    // Get user ID if exists
    const userResult = await db.query<{ user_id: string }>(
      'SELECT user_id FROM users WHERE primary_wallet = $1',
      [wallet]
    );
    const userId = userResult.rows.length > 0 ? userResult.rows[0].user_id : null;

    // Build query
    let query = `
      SELECT hash, block_timestamp, "from", "to", value, type, platform, status
      FROM transactions
      WHERE ("from" = $1 OR "to" = $1${userId ? ' OR user_id = $2' : ''})
    `;
    const queryParams: any[] = [wallet];
    if (userId) queryParams.push(userId);

    if (type && (type === 'minting' || type === 'transfer')) {
      query += ` AND type = $${queryParams.length + 1}`;
      queryParams.push(type);
    }

    query += ` ORDER BY block_timestamp DESC LIMIT $${queryParams.length + 1}`;
    queryParams.push(limit);

    const result = await db.query<{
      hash: string;
      block_timestamp: Date;
      from: string;
      to: string;
      value: string;
      type: string;
      platform: string | null;
      status: string;
    }>(query, queryParams);

    const formatted = result.rows.map((tx) => {
      const isOutgoing = tx.from.toLowerCase() === wallet;
      return {
        id: tx.hash,
        type: tx.type,
        platform: tx.platform,
        amount: ethers.formatEther(tx.value),
        status: tx.status,
        timestamp: tx.block_timestamp,
        transferDirection: tx.type === 'transfer' ? (isOutgoing ? 'out' : 'in') : null,
        transferTime: tx.block_timestamp.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
    });

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
