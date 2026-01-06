import {
    pgTable,
    bigserial,
    bigint,
    integer,
    numeric,
    varchar,
    text,
    timestamp,
    boolean,
    date,
    doublePrecision
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    userId: bigint('user_id', { mode: 'number' }).notNull().unique(),
    primaryWallet: varchar('primary_wallet', { length: 42 }).notNull(),
    twitterId: bigint('twitter_id', { mode: 'number' }),
    farcasterFid: bigint('farcaster_fid', { mode: 'number' }),
    humanVerification: integer('human_verification').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow().notNull()
});

export const epochs = pgTable('epochs', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    epochNumber: integer('epoch_number').notNull().unique(),
    startedAt: timestamp('started_at', { withTimezone: false }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: false }),
    multiplicator: numeric('multiplicator', { precision: 78, scale: 0 }).notNull(),
    lastEpochPoints: numeric('last_epoch_points', { precision: 78, scale: 0 }).default('0').notNull(),
    lastEpochPointsTwitter: numeric('last_epoch_points_twitter', { precision: 78, scale: 0 }).default('0').notNull(),
    lastEpochPointsFarcaster: numeric('last_epoch_points_farcaster', { precision: 78, scale: 0 }).default('0').notNull(),
    currentEpochPoints: numeric('current_epoch_points', { precision: 78, scale: 0 }).default('0').notNull(),
    currentEpochPointsTwitter: numeric('current_epoch_points_twitter', { precision: 78, scale: 0 }).default('0').notNull(),
    currentEpochPointsFarcaster: numeric('current_epoch_points_farcaster', { precision: 78, scale: 0 }).default('0').notNull(),
    isActive: boolean('is_active').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow().notNull()
});

export const transactions = pgTable('transactions', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    hash: varchar('hash', { length: 66 }).notNull().unique(),
    blockNumber: bigint('block_number', { mode: 'number' }).notNull(),
    blockTimestamp: timestamp('block_timestamp', { withTimezone: false }).notNull(),
    from: varchar('from', { length: 42 }).notNull(),
    to: varchar('to', { length: 42 }).notNull(),
    value: numeric('value', { precision: 78, scale: 0 }).notNull(),
    type: varchar('type', { length: 20 }).notNull(),
    platform: varchar('platform', { length: 20 }),
    status: varchar('status', { length: 20 }).default('completed').notNull(),
    userId: bigint('user_id', { mode: 'number' }),
    epochId: bigint('epoch_id', { mode: 'number' }),
    createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull()
});

export const balances = pgTable('balances', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    userId: bigint('user_id', { mode: 'number' }).notNull().unique(),
    balance: numeric('balance', { precision: 78, scale: 0 }).default('0').notNull(),
    totalEarned: numeric('total_earned', { precision: 78, scale: 0 }).default('0').notNull(),
    totalTransferred: numeric('total_transferred', { precision: 78, scale: 0 }).default('0').notNull(),
    lastUpdated: timestamp('last_updated', { withTimezone: false }).defaultNow().notNull()
});

export const mintingDays = pgTable('minting_days', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    mintingDayTimestamp: timestamp('minting_day_timestamp', { withTimezone: false }).notNull().unique(),
    platform: varchar('platform', { length: 20 }).notNull(),
    status: varchar('status', { length: 20 }).notNull(),
    totalPoints: numeric('total_points', { precision: 78, scale: 0 }).default('0').notNull(),
    batchesProcessed: integer('batches_processed').default(0).notNull(),
    batchesErrored: integer('batches_errored').default(0).notNull(),
    runningHash: text('running_hash'),
    ipfsCid: text('ipfs_cid'),
    createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow().notNull()
});

export const globalStats = pgTable('global_stats', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    totalTokenized: numeric('total_tokenized', { precision: 78, scale: 0 }).default('0').notNull(),
    totalUsers: bigint('total_users', { mode: 'number' }).default(0).notNull(),
    totalTransactions: bigint('total_transactions', { mode: 'number' }).default(0).notNull(),
    twitterPercentage: doublePrecision('twitter_percentage').default(0).notNull(),
    farcasterPercentage: doublePrecision('farcaster_percentage').default(0).notNull(),
    lastUpdated: timestamp('last_updated', { withTimezone: false }).defaultNow().notNull()
});

export const dailyStats = pgTable('daily_stats', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    date: date('date', { mode: 'string' }).notNull().unique(),
    tokensMinted: numeric('tokens_minted', { precision: 78, scale: 0 }).default('0').notNull(),
    newUsers: bigint('new_users', { mode: 'number' }).default(0).notNull(),
    transactions: bigint('transactions', { mode: 'number' }).default(0).notNull(),
    twitterTokens: numeric('twitter_tokens', { precision: 78, scale: 0 }).default('0').notNull(),
    farcasterTokens: numeric('farcaster_tokens', { precision: 78, scale: 0 }).default('0').notNull(),
    createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow().notNull()
});

export type User = typeof users.$inferSelect;
export type Epoch = typeof epochs.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Balance = typeof balances.$inferSelect;
export type MintingDay = typeof mintingDays.$inferSelect;
export type GlobalStat = typeof globalStats.$inferSelect;
export type DailyStat = typeof dailyStats.$inferSelect;
