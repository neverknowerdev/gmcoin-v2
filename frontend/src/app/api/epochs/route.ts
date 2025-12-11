import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { ethers } from 'ethers';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');

    const result = await db.query<{
      epoch_number: number;
      started_at: Date;
      ended_at: Date | null;
      multiplicator: string;
      is_active: boolean;
    }>(
      'SELECT epoch_number, started_at, ended_at, multiplicator, is_active FROM epochs ORDER BY epoch_number DESC LIMIT $1',
      [limit]
    );

    const now = new Date();

    const formattedEpochs = result.rows.map((epoch) => {
      const daysSinceStart = Math.floor(
        (now.getTime() - epoch.started_at.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        epochNumber: epoch.epoch_number,
        isCurrent: epoch.is_active,
        currentDay: epoch.is_active ? daysSinceStart + 1 : null,
        totalDays: 30,
        startDate: epoch.started_at.toISOString().split('T')[0],
        endDate: epoch.ended_at?.toISOString().split('T')[0] || null,
        mintingDifficulty: `${ethers.formatEther(epoch.multiplicator)} GM`,
      };
    });

    return NextResponse.json(formattedEpochs);
  } catch (error) {
    console.error('Error fetching epochs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
