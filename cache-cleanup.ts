import { cacheService } from './server/services/cache-service';
import { db } from './server/db';
import { cacheEntries } from './shared/schema';
import { sql } from 'drizzle-orm';

async function runCleanup() {
  console.log('Starting manual cache cleanup...');
  
  try {
    // First insert an expired cache entry
    console.log('Adding an expired cache entry for testing...');
    const pastDate = new Date();
    pastDate.setMinutes(pastDate.getMinutes() - 15); // 15 minutes in the past
    const pastDateIso = pastDate.toISOString();
    
    // Insert using drizzle-orm
    await db.insert(cacheEntries).values({
      cacheKey: 'test:expired',
      data: JSON.stringify({ test: 'data' }),
      createdAt: pastDate,
      expiresAt: pastDate,
      network: 'test'
    });
    
    // Check current cache entries
    console.log('Current cache entries:');
    const entries = await db.select().from(cacheEntries);
    entries.forEach(entry => {
      console.log(`- ${entry.cacheKey}: expires at ${entry.expiresAt}`);
    });
    
    console.log('Running cache cleanup...');
    await cacheService.cleanup();
    console.log('Manual cleanup complete');
    
    // Check remaining cache entries
    console.log('Remaining cache entries after cleanup:');
    const remainingEntries = await db.select().from(cacheEntries);
    remainingEntries.forEach(entry => {
      console.log(`- ${entry.cacheKey}: expires at ${entry.expiresAt}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

runCleanup();