import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { ethers } from 'ethers';

export async function GET() {
  try {
    const result = await db.query<{
      epoch_number: number;
      started_at: Date;
      ended_at: Date | null;
      multiplicator: string;
      is_active: boolean;
    }>(
      'SELECT epoch_number, started_at, ended_at, multiplicator, is_active FROM epochs WHERE is_active = TRUE ORDER BY epoch_number DESC LIMIT 1'
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'No active epoch found' },
        { status: 404 }
      );
    }

    const epoch = result.rows[0];
    const now = new Date();
    const daysSinceStart = Math.floor(
      (now.getTime() - epoch.started_at.getTime()) / (1000 * 60 * 60 * 24)
    );

    return NextResponse.json({
      epochNumber: epoch.epoch_number,
      startedAt: epoch.started_at.toISOString(),
      endedAt: epoch.ended_at?.toISOString() || null,
      multiplicator: epoch.multiplicator,
      currentDay: daysSinceStart + 1,
      totalDays: 30, // Default epoch duration
      mintingDifficulty: `${ethers.formatEther(epoch.multiplicator)} GM`,
      isActive: epoch.is_active,
    });
  } catch (error) {
    console.error('Error fetching current epoch:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
