/**
 * Tests for Next.js API routes
 * 
 * Note: These tests require a test database to be set up.
 * Run migrations on test database before running tests.
 */

import { GET as getHealth } from '@/app/api/health/route';
import { GET as getCurrentEpoch } from '@/app/api/epochs/current/route';
import { GET as getEpochs } from '@/app/api/epochs/route';
import { GET as getUserTransactions } from '@/app/api/users/[wallet]/transactions/route';
import { GET as getUserBalance } from '@/app/api/users/[wallet]/balance/route';
import { GET as getLeaderboard } from '@/app/api/leaderboard/route';
import { GET as getGlobalStats } from '@/app/api/stats/global/route';
import { GET as getDailyStats } from '@/app/api/stats/daily/route';
import { NextRequest } from 'next/server';
import {
  setupTestDatabase,
  cleanupTestData,
  createTestUser,
  createTestBalance,
  createTestEpoch,
  createTestTransaction,
  closeTestDatabase,
} from './setup';

// Type definitions for API responses
type TransactionResponse = {
  id: string;
  type: string;
  platform: string | null;
  amount: string;
  status: string;
  timestamp: Date;
  transferDirection: 'in' | 'out' | null;
  transferTime: string;
};

describe('API Routes', () => {
  const testWallet1 = '0x1111111111111111111111111111111111111111'; // 42 chars (0x + 40 hex)
  const testWallet2 = '0x2222222222222222222222222222222222222222'; // 42 chars (0x + 40 hex)
  const testUserId1 = 1001;
  const testUserId2 = 1002;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await getHealth();
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('status', 'ok');
      expect(data).toHaveProperty('timestamp');
      expect(new Date(data.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('GET /api/epochs/current', () => {
    it('should return 404 when no active epoch exists', async () => {
      const response = await getCurrentEpoch();
      const data = await response.json();
      
      expect(response.status).toBe(404);
      expect(data).toHaveProperty('error', 'No active epoch found');
    });

    it('should return current active epoch', async () => {
      await createTestEpoch(1000, true, '2000000000000000000');
      
      const response = await getCurrentEpoch();
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('epochNumber', 1000);
      expect(data).toHaveProperty('isActive', true);
      expect(data).toHaveProperty('currentDay');
      expect(data).toHaveProperty('totalDays', 30);
      expect(data).toHaveProperty('mintingDifficulty');
      expect(data).toHaveProperty('startedAt');
      expect(data.mintingDifficulty).toContain('GM');
      expect(parseInt(data.currentDay)).toBeGreaterThan(0);
    });
  });

  describe('GET /api/epochs', () => {
    it('should return empty array when no epochs exist', async () => {
      const request = new NextRequest('http://localhost/api/epochs');
      const response = await getEpochs(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toEqual([]);
    });

    it('should return epoch history with default limit', async () => {
      await createTestEpoch(1000, false);
      await createTestEpoch(1001, true);
      
      const request = new NextRequest('http://localhost/api/epochs');
      const response = await getEpochs(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      expect(data[0]).toHaveProperty('epochNumber');
      expect(data[0]).toHaveProperty('isCurrent');
      expect(data[0]).toHaveProperty('startDate');
      expect(data[0]).toHaveProperty('mintingDifficulty');
    });

    it('should respect limit query parameter', async () => {
      await createTestEpoch(1000, false);
      await createTestEpoch(1001, false);
      await createTestEpoch(1002, false);
      
      const request = new NextRequest('http://localhost/api/epochs?limit=2');
      const response = await getEpochs(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.length).toBeLessThanOrEqual(2);
    });
  });

  describe('GET /api/users/[wallet]/transactions', () => {
    it('should return empty array for wallet with no transactions', async () => {
      const request = new NextRequest(`http://localhost/api/users/${testWallet1}/transactions`);
      const response = await getUserTransactions(request, { params: { wallet: testWallet1 } });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toEqual([]);
    });

    it('should return transactions for a wallet', async () => {
      await createTestUser(testWallet1, testUserId1);
      await createTestTransaction('test_hash_1', testWallet1, testWallet2, '100', 'minting', 'twitter', testUserId1);
      
      const request = new NextRequest(`http://localhost/api/users/${testWallet1}/transactions`);
      const response = await getUserTransactions(request, { params: { wallet: testWallet1 } });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      expect(data[0]).toHaveProperty('id');
      expect(data[0]).toHaveProperty('type');
      expect(data[0]).toHaveProperty('amount');
      expect(data[0]).toHaveProperty('status');
      expect(data[0]).toHaveProperty('timestamp');
    });

    it('should filter transactions by type', async () => {
      await createTestUser(testWallet1, testUserId1);
      await createTestTransaction('test_hash_1', testWallet1, testWallet2, '100', 'minting', 'twitter', testUserId1);
      await createTestTransaction('test_hash_2', testWallet1, testWallet2, '50', 'transfer', null, testUserId1);
      
      const request = new NextRequest(`http://localhost/api/users/${testWallet1}/transactions?type=minting`);
      const response = await getUserTransactions(request, { params: { wallet: testWallet1 } });
      const data = (await response.json()) as TransactionResponse[];
      
      expect(response.status).toBe(200);
      expect(data.every((tx) => tx.type === 'minting')).toBe(true);
    });
  });

  describe('GET /api/users/[wallet]/balance', () => {
    it('should return zero balance for non-existent user', async () => {
      const request = new NextRequest(`http://localhost/api/users/${testWallet1}/balance`);
      const response = await getUserBalance(request, { params: { wallet: testWallet1 } });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toEqual({
        balance: '0',
        totalEarned: '0',
        totalTransferred: '0',
      });
    });

    it('should return balance for existing user', async () => {
      await createTestUser(testWallet1, testUserId1);
      await createTestBalance(testUserId1, '1000', '1500', '500');
      
      const request = new NextRequest(`http://localhost/api/users/${testWallet1}/balance`);
      const response = await getUserBalance(request, { params: { wallet: testWallet1 } });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('balance');
      expect(data).toHaveProperty('totalEarned');
      expect(data).toHaveProperty('totalTransferred');
      expect(parseFloat(data.balance)).toBe(1000);
      expect(parseFloat(data.totalEarned)).toBe(1500);
      expect(parseFloat(data.totalTransferred)).toBe(500);
    });
  });

  describe('GET /api/leaderboard', () => {
    it('should return empty array when no users exist', async () => {
      const request = new NextRequest('http://localhost/api/leaderboard');
      const response = await getLeaderboard(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toEqual([]);
    });

    it('should return leaderboard ordered by balance descending', async () => {
      await createTestUser(testWallet1, testUserId1);
      await createTestUser(testWallet2, testUserId2);
      await createTestBalance(testUserId1, '1000', '1000', '0');
      await createTestBalance(testUserId2, '2000', '2000', '0');
      
      const request = new NextRequest('http://localhost/api/leaderboard');
      const response = await getLeaderboard(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(2);
      
      if (data.length >= 2) {
        const balance1 = parseFloat(data[0].balance);
        const balance2 = parseFloat(data[1].balance);
        expect(balance1).toBeGreaterThanOrEqual(balance2);
      }
      
      expect(data[0]).toHaveProperty('rank');
      expect(data[0]).toHaveProperty('userId');
      expect(data[0]).toHaveProperty('wallet');
      expect(data[0]).toHaveProperty('balance');
      expect(data[0]).toHaveProperty('totalEarned');
    });
  });

  describe('GET /api/stats/global', () => {
    it('should return global stats with zero values when no data exists', async () => {
      const response = await getGlobalStats();
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('totalTokenized', '0.0');
      expect(data).toHaveProperty('totalUsers', 0);
      expect(data).toHaveProperty('usersToday', 0);
      expect(data).toHaveProperty('twitterPercentage', 0);
      expect(data).toHaveProperty('farcasterPercentage', 0);
    });

    it('should calculate correct global stats', async () => {
      await createTestUser(testWallet1, testUserId1);
      await createTestUser(testWallet2, testUserId2);
      
      const epochNumber = 1000;
      const epochId = await createTestEpoch(epochNumber, false);
      
      await createTestTransaction('test_mint_1', testWallet1, testWallet2, '1000', 'minting', 'twitter', testUserId1, epochId);
      await createTestTransaction('test_mint_2', testWallet2, testWallet1, '500', 'minting', 'farcaster', testUserId2, epochId);
      
      const response = await getGlobalStats();
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.totalUsers).toBeGreaterThanOrEqual(2);
      expect(parseFloat(data.totalTokenized)).toBeGreaterThan(0);
      expect(data.twitterPercentage + data.farcasterPercentage).toBeCloseTo(100, 1);
    });
  });

  describe('GET /api/stats/daily', () => {
    it('should return array of zeros when no transactions exist', async () => {
      const request = new NextRequest('http://localhost/api/stats/daily?days=7');
      const response = await getDailyStats(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(7);
      expect(data.every((val: number) => val === 0)).toBe(true);
    });

    it('should return daily stats for specified number of days', async () => {
      const request = new NextRequest('http://localhost/api/stats/daily?days=14');
      const response = await getDailyStats(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.length).toBe(14);
    });

    it('should use default of 7 days when days parameter not provided', async () => {
      const request = new NextRequest('http://localhost/api/stats/daily');
      const response = await getDailyStats(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.length).toBe(7);
    });
  });
});
