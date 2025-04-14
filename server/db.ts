import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@shared/schema';

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Please set it in your environment variables.');
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
console.log('[DB] Connecting to database...');

// Create a client
const client = postgres(connectionString);
export const db = drizzle(client, { schema });

console.log('[DB] Database connection established');