import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { ethers } from 'ethers';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '7');
    const startDate = new Date();
    startDate.setUTCDate(startDate.getUTCDate() - days);
    startDate.setUTCHours(0, 0, 0, 0);

    const result = await db.query<{
      date: Date;
      sum: string;
    }>(
      `SELECT DATE(block_timestamp) as date, COALESCE(SUM(value), '0') as sum
       FROM transactions
       WHERE type = 'minting' AND block_timestamp >= $1
       GROUP BY DATE(block_timestamp)
       ORDER BY date ASC`,
      [startDate]
    );

    // Create a map of dates to tokens
    const dailyData: Record<string, bigint> = {};
    result.rows.forEach((row) => {
      const dateStr = row.date.toISOString().split('T')[0];
      dailyData[dateStr] = BigInt(row.sum);
    });

    // Fill in missing days with 0
    const formattedResult = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setUTCDate(date.getUTCDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const tokens = dailyData[dateStr] || BigInt(0);
      formattedResult.push(Number(ethers.formatEther(tokens)));
    }

    return NextResponse.json(formattedResult);
  } catch (error) {
    console.error('Error fetching daily stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
