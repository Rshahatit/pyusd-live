import { cacheService } from './cache-service';
import { NetworkType } from '../utils/network-config';
import { 
  getTopHolders, 
  getPYUSDTotalSupply, 
  getActivityData,
  getActiveWallets,
  getRecentTransactions
} from '../utils/bigquery-client';

/**
 * Cache keys for different types of dashboard data
 */
const CACHE_KEYS = {
  TOP_HOLDERS: 'dashboard:top_holders',
  TOTAL_SUPPLY: 'dashboard:total_supply', 
  ACTIVITY_DATA: 'dashboard:activity_data',
  ACTIVE_WALLETS: 'dashboard:active_wallets',
  DAILY_STATS: 'dashboard:daily_stats',
  RECENT_TRANSACTIONS: 'dashboard:recent_transactions'
};

/**
 * Service to cache dashboard data from BigQuery and blockchain
 */
export class DashboardCacheService {
  /**
   * Store total supply in cache
   * @param totalSupply The total supply value
   * @param network Blockchain network
   */
  async storeTotalSupply(totalSupply: number, network: NetworkType = 'mainnet') {
    return cacheService.set(CACHE_KEYS.TOTAL_SUPPLY, totalSupply, network);
  }

  /**
   * Store active wallets count in cache
   * @param count Number of active wallets
   * @param network Blockchain network
   */
  async storeActiveWallets(count: number, network: NetworkType = 'mainnet') {
    return cacheService.set(CACHE_KEYS.ACTIVE_WALLETS, count, network);
  }

  /**
   * Store top holders in cache
   * @param holders The holders data to cache
   * @param network Blockchain network
   */
  async storeTopHolders(holders: any[], network: NetworkType = 'mainnet') {
    // Cache for 1 hour (3600000 ms) since getting top holders uses expensive RPC calls
    return cacheService.set(CACHE_KEYS.TOP_HOLDERS, holders, network, 3600000);
  }

  /**
   * Store activity data in cache
   * @param data The activity data to cache
   * @param network Blockchain network
   */
  async storeActivityData(data: any, network: NetworkType = 'mainnet') {
    return cacheService.set(CACHE_KEYS.ACTIVITY_DATA, data, network);
  }
  
  /**
   * Store recent transactions in cache
   * @param transactions The transaction data to cache
   * @param network Blockchain network
   */
  async storeRecentTransactions(transactions: any[], network: NetworkType = 'mainnet') {
    // Cache for 15 minutes (900000 ms) - shorter than holders since tx data changes more frequently
    return cacheService.set(CACHE_KEYS.RECENT_TRANSACTIONS, transactions, network, 900000);
  }
  /**
   * Get top PYUSD holders with caching
   * @param limit Number of holders to return
   * @param network Blockchain network
   * @returns Cached or fresh holder data
   */
  async getTopHolders(limit = 10, network: NetworkType = 'mainnet') {
    const cacheKey = `${CACHE_KEYS.TOP_HOLDERS}:${limit}`;
    
    // Try to get from cache first
    const cachedData = await cacheService.get(cacheKey, network);
    if (cachedData) {
      console.log('[Dashboard Cache] Using cached top holders data');
      return cachedData;
    }
    
    // If not in cache, fetch fresh data
    console.log('[Dashboard Cache] Fetching fresh top holders data');
    try {
      const holders = await getTopHolders(limit);
      
      // Store in cache if we got data
      if (holders && holders.length > 0) {
        // Cache top holders for 1 hour (3600000 ms) because it uses expensive on-chain RPC calls
        await cacheService.set(cacheKey, holders, network, 3600000);
      }
      
      return holders;
    } catch (error) {
      console.error('[Dashboard Cache] Error fetching top holders:', error);
      throw error;
    }
  }

  /**
   * Get PYUSD total supply with caching
   * @param network Blockchain network
   * @returns Cached or fresh total supply
   */
  async getTotalSupply(network: NetworkType = 'mainnet') {
    const cacheKey = CACHE_KEYS.TOTAL_SUPPLY;
    
    // Try to get from cache first
    const cachedData = await cacheService.get<number>(cacheKey, network);
    if (cachedData !== null) {
      console.log('[Dashboard Cache] Using cached total supply data');
      return cachedData;
    }
    
    // If not in cache, fetch fresh data
    console.log('[Dashboard Cache] Fetching fresh total supply data');
    try {
      const totalSupply = await getPYUSDTotalSupply();
      
      // Store in cache if we got data
      if (totalSupply) {
        await cacheService.set(cacheKey, totalSupply, network);
      }
      
      return totalSupply;
    } catch (error) {
      console.error('[Dashboard Cache] Error fetching total supply:', error);
      throw error;
    }
  }

  /**
   * Get PYUSD activity data with caching
   * @param network Blockchain network
   * @returns Cached or fresh activity data
   */
  async getActivityData(network: NetworkType = 'mainnet') {
    const cacheKey = CACHE_KEYS.ACTIVITY_DATA;
    
    // Try to get from cache first
    const cachedData = await cacheService.get(cacheKey, network);
    if (cachedData) {
      console.log('[Dashboard Cache] Using cached activity data');
      return cachedData;
    }
    
    // If not in cache, fetch fresh data
    console.log('[Dashboard Cache] Fetching fresh activity data');
    try {
      const activityData = await getActivityData();
      
      // Store in cache if we got data
      if (activityData) {
        await cacheService.set(cacheKey, activityData, network);
      }
      
      return activityData;
    } catch (error) {
      console.error('[Dashboard Cache] Error fetching activity data:', error);
      throw error;
    }
  }

  /**
   * Get active PYUSD wallets with caching
   * @param daysAgo Number of days to look back
   * @param network Blockchain network
   * @returns Cached or fresh active wallets count
   */
  async getActiveWallets(daysAgo = 7, network: NetworkType = 'mainnet') {
    const cacheKey = `${CACHE_KEYS.ACTIVE_WALLETS}:${daysAgo}`;
    
    // Try to get from cache first
    const cachedData = await cacheService.get<number>(cacheKey, network);
    if (cachedData !== null) {
      console.log('[Dashboard Cache] Using cached active wallets data');
      return cachedData;
    }
    
    // If not in cache, fetch fresh data
    console.log('[Dashboard Cache] Fetching fresh active wallets data');
    try {
      const activeWallets = await getActiveWallets(daysAgo);
      
      // Store in cache if we got data
      if (activeWallets !== undefined) {
        await cacheService.set(cacheKey, activeWallets, network);
      }
      
      return activeWallets;
    } catch (error) {
      console.error('[Dashboard Cache] Error fetching active wallets:', error);
      throw error;
    }
  }

  /**
   * Store daily statistics in cache (transaction volume, count, avg value)
   * @param stats The stats to cache
   * @param network Blockchain network
   */
  async storeDailyStats(stats: {
    volume: number;
    count: number;
    average: number;
  }, network: NetworkType = 'mainnet') {
    const cacheKey = CACHE_KEYS.DAILY_STATS;
    await cacheService.set(cacheKey, stats, network);
    console.log('[Dashboard Cache] Stored daily stats in cache');
  }

  /**
   * Get cached daily statistics
   * @param network Blockchain network
   * @returns Cached daily stats or null
   */
  async getDailyStats(network: NetworkType = 'mainnet') {
    const cacheKey = CACHE_KEYS.DAILY_STATS;
    return await cacheService.get(cacheKey, network);
  }
  
  /**
   * Get recent PYUSD transactions with caching and on-chain verification
   * @param limit Number of transactions to return
   * @param network Blockchain network
   * @returns Cached or fresh transaction data
   */
  async getRecentTransactions(limit = 5, network: NetworkType = 'mainnet') {
    const cacheKey = `${CACHE_KEYS.RECENT_TRANSACTIONS}:${limit}`;
    
    // Try to get from cache first
    const cachedData = await cacheService.get(cacheKey, network);
    if (cachedData) {
      console.log('[Dashboard Cache] Using cached recent transactions data');
      return cachedData;
    }
    
    // If not in cache, fetch fresh data
    console.log('[Dashboard Cache] Fetching fresh recent transactions data');
    try {
      const transactions = await getRecentTransactions(limit);
      
      // Store in cache if we got data
      if (transactions && transactions.length > 0) {
        // Cache for 15 minutes (900000 ms) - shorter than holders since tx data changes more frequently
        await cacheService.set(cacheKey, transactions, network, 900000);
      }
      
      return transactions;
    } catch (error) {
      console.error('[Dashboard Cache] Error fetching recent transactions:', error);
      throw error;
    }
  }

  /**
   * Invalidate all dashboard caches
   * @param network Blockchain network
   */
  async invalidateAll(network: NetworkType = 'mainnet') {
    for (const key of Object.values(CACHE_KEYS)) {
      await cacheService.invalidate(key, network);
    }
    console.log('[Dashboard Cache] Invalidated all dashboard caches');
  }
}

// Export a singleton instance
export const dashboardCache = new DashboardCacheService();