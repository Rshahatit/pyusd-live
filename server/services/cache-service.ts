import { db } from '../db';
import { sql } from 'drizzle-orm';
import { NetworkType } from '../utils/network-config';

// Cache expiration time in milliseconds (10 minutes)
const CACHE_EXPIRATION_MS = 10 * 60 * 1000;

/**
 * Caching service to reduce load on GCP Blockchain endpoints
 * Caches data for 10 minutes before fetching fresh data
 */
export class CacheService {
  /**
   * Get data from cache if it exists and is not expired
   * @param key The cache key
   * @param network The blockchain network
   * @returns The cached data or null if not found
   */
  async get<T>(key: string, network: NetworkType = 'mainnet'): Promise<T | null> {
    try {
      // Get cache entry using raw SQL to avoid type issues
      const result = await db.execute<{
        id: number;
        cacheKey: string;
        data: T;
        createdAt: Date;
        expiresAt: Date;
        network: string;
      }>(sql`
        SELECT * FROM cache_entries 
        WHERE cache_key = ${key} 
        AND network = ${network}
        LIMIT 1
      `);

      if (result.length === 0) {
        console.log(`[Cache] Cache miss for key: ${key}`);
        return null;
      }

      const entry = result[0];
      // Check if entry is expired
      if (new Date(entry.expiresAt) > new Date()) {
        console.log(`[Cache] Cache hit for key: ${key}`);
        return entry.data;
      }

      console.log(`[Cache] Cache expired for key: ${key}`);
      return null;
    } catch (error) {
      console.error(`[Cache] Error retrieving cache for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Store data in cache
   * @param key The cache key
   * @param data The data to cache
   * @param network The blockchain network
   * @param expirationMs Optional custom expiration time in ms (defaults to 10 minutes)
   */
  async set<T>(
    key: string, 
    data: T, 
    network: NetworkType = 'mainnet',
    expirationMs: number = CACHE_EXPIRATION_MS
  ): Promise<void> {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + expirationMs);

      // Use raw SQL with upsert for simplicity
      await db.execute(sql`
        INSERT INTO cache_entries (cache_key, data, created_at, expires_at, network)
        VALUES (${key}, ${JSON.stringify(data)}, ${now.toISOString()}, ${expiresAt.toISOString()}, ${network})
        ON CONFLICT (cache_key) 
        DO UPDATE SET 
          data = ${JSON.stringify(data)},
          created_at = ${now.toISOString()},
          expires_at = ${expiresAt.toISOString()}
      `);
      
      console.log(`[Cache] Set cache for key: ${key}`);
    } catch (error) {
      console.error(`[Cache] Error setting cache for key ${key}:`, error);
    }
  }

  /**
   * Force delete a cache entry
   * @param key The cache key
   * @param network The blockchain network
   */
  async invalidate(key: string, network: NetworkType = 'mainnet'): Promise<void> {
    try {
      await db.execute(sql`
        DELETE FROM cache_entries
        WHERE cache_key = ${key}
        AND network = ${network}
      `);
      
      console.log(`[Cache] Invalidated cache entry for key: ${key}`);
    } catch (error) {
      console.error(`[Cache] Error invalidating cache for key ${key}:`, error);
    }
  }

  /**
   * Clean up expired cache entries
   */
  async cleanup(): Promise<void> {
    try {
      const now = new Date();
      const result = await db.execute<{ count: number }>(sql`
        DELETE FROM cache_entries
        WHERE expires_at < ${now.toISOString()}
        RETURNING id
      `);
      
      if (result.length > 0) {
        console.log(`[Cache] Cleaned up ${result.length} expired cache entries`);
      }
    } catch (error) {
      console.error('[Cache] Error cleaning up expired cache entries:', error);
    }
  }
  
  /**
   * Clear all cache entries regardless of expiration time
   * @param pattern Optional pattern to match against cache keys
   * @param network Optional network to filter by
   */
  async clearAll(pattern?: string, network?: NetworkType): Promise<void> {
    try {
      // Simplified approach with explicit conditions
      if (pattern && network) {
        // Both pattern and network provided
        await db.execute(sql`
          DELETE FROM cache_entries
          WHERE cache_key LIKE ${'%' + pattern + '%'}
          AND network = ${network}
        `);
      } else if (pattern) {
        // Only pattern provided
        await db.execute(sql`
          DELETE FROM cache_entries
          WHERE cache_key LIKE ${'%' + pattern + '%'}
        `);
      } else if (network) {
        // Only network provided
        await db.execute(sql`
          DELETE FROM cache_entries
          WHERE network = ${network}
        `);
      } else {
        // No filters, delete all
        await db.execute(sql`DELETE FROM cache_entries`);
      }
      
      console.log(`[Cache] Cleared cache entries${pattern ? ` matching "${pattern}"` : ''}${network ? ` for network "${network}"` : ''}`);
    } catch (error) {
      console.error('[Cache] Error clearing cache entries:', error);
    }
  }
}

// Export a singleton instance
export const cacheService = new CacheService();