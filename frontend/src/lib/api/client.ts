// Use relative paths for Next.js API routes
const API_BASE_URL = '';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
  }

  // Epochs
  async getCurrentEpoch() {
    return this.fetch<{
      epochNumber: number;
      startedAt: string;
      endedAt: string | null;
      multiplicator: string;
      currentDay: number;
      totalDays: number;
      mintingDifficulty: string;
      isActive: boolean;
    }>('/api/epochs/current');
  }

  async getEpochs(limit?: number) {
    return this.fetch<
      Array<{
        epochNumber: number;
        isCurrent?: boolean;
        currentDay?: number | null;
        totalDays: number;
        startDate: string;
        endDate: string | null;
        mintingDifficulty: string;
      }>
    >(`/api/epochs${limit ? `?limit=${limit}` : ''}`);
  }

  // User data
  async getUserBalance(wallet: string) {
    return this.fetch<{
      balance: string;
      totalEarned: string;
      totalTransferred: string;
    }>(`/api/users/${wallet}/balance`);
  }

  async getUserTransactions(wallet: string, options?: { limit?: number; type?: 'minting' | 'transfer' }) {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.type) params.append('type', options.type);
    const query = params.toString();
    return this.fetch<
      Array<{
        id: string;
        type: string;
        platform: string | null;
        amount: string;
        status: string;
        timestamp: Date;
        transferDirection: 'in' | 'out' | null;
        transferTime: string;
      }>
    >(`/api/users/${wallet}/transactions${query ? `?${query}` : ''}`);
  }

  // Leaderboard
  async getLeaderboard(limit?: number) {
    return this.fetch<
      Array<{
        rank: number;
        userId: string;
        wallet: string;
        balance: string;
        totalEarned: string;
      }>
    >(`/api/leaderboard${limit ? `?limit=${limit}` : ''}`);
  }

  // Statistics
  async getGlobalStats() {
    return this.fetch<{
      totalTokenized: string;
      totalUsers: number;
      usersToday: number;
      twitterPercentage: number;
      farcasterPercentage: number;
    }>('/api/stats/global');
  }

  async getDailyStats(days?: number) {
    return this.fetch<number[]>(`/api/stats/daily${days ? `?days=${days}` : ''}`);
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
