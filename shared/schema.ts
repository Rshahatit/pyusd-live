import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  ethAddress: text("eth_address"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Transaction traces
export const transactionTraces = pgTable("transaction_traces", {
  id: serial("id").primaryKey(),
  txHash: text("tx_hash").notNull().unique(),
  blockNumber: integer("block_number"),
  timestamp: timestamp("timestamp").defaultNow(),
  data: jsonb("data"),
  isPYUSD: boolean("is_pyusd").default(false),
  analysis: text("analysis"),
});

// PYUSD payments
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  fromAddress: text("from_address").notNull(),
  toAddress: text("to_address").notNull(),
  amount: text("amount").notNull(),
  status: text("status").notNull(), // pending, completed, failed
  txHash: text("tx_hash"),
  memo: text("memo"),
  timestamp: timestamp("timestamp").defaultNow(),
  gasSpeed: text("gas_speed"),
  gasUsed: text("gas_used"),
  gasSaved: text("gas_saved"),
});

// Faucet requests
export const faucetRequests = pgTable("faucet_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  address: text("address").notNull(),
  amount: text("amount").notNull(),
  status: text("status").notNull(), // pending, completed, failed
  txHash: text("tx_hash"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Dashboard statistics
export const dashboardStats = pgTable("dashboard_stats", {
  id: serial("id").primaryKey(),
  date: timestamp("date").defaultNow(),
  totalSupply: text("total_supply"),
  activeWallets: integer("active_wallets"),
  txVolume24h: text("tx_volume_24h"),
  avgTxValue: text("avg_tx_value"),
  holderDistribution: jsonb("holder_distribution"),
  data: jsonb("data"),
});

// Cache table for blockchain data to reduce GCP API calls
export const cacheEntries = pgTable("cache_entries", {
  id: serial("id").primaryKey(),
  cacheKey: text("cache_key").notNull().unique(),
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  network: text("network").notNull().default("mainnet"),
});

// Schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  ethAddress: true,
});

export const insertTraceSchema = createInsertSchema(transactionTraces).pick({
  txHash: true,
  blockNumber: true,
  data: true,
  isPYUSD: true,
  analysis: true,
});

export const insertPaymentSchema = createInsertSchema(payments).pick({
  userId: true,
  fromAddress: true,
  toAddress: true,
  amount: true,
  status: true,
  memo: true,
  gasSpeed: true,
});

export const insertFaucetRequestSchema = createInsertSchema(faucetRequests).pick({
  userId: true,
  address: true,
  amount: true,
  status: true,
});

export const insertCacheEntrySchema = createInsertSchema(cacheEntries).pick({
  cacheKey: true,
  data: true,
  expiresAt: true,
  network: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertTrace = z.infer<typeof insertTraceSchema>;
export type Trace = typeof transactionTraces.$inferSelect;

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

export type InsertFaucetRequest = z.infer<typeof insertFaucetRequestSchema>;
export type FaucetRequest = typeof faucetRequests.$inferSelect;

export type InsertCacheEntry = z.infer<typeof insertCacheEntrySchema>;
export type CacheEntry = typeof cacheEntries.$inferSelect;
