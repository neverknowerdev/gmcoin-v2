-- Migration: 001_initial_schema.up.sql
-- Description: Create initial database schema for GMCoin v2
-- Date: 2024-12-19

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT UNIQUE NOT NULL,
  primary_wallet VARCHAR(42) NOT NULL,
  twitter_id BIGINT,
  farcaster_fid BIGINT,
  human_verification INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_primary_wallet ON public.users(primary_wallet);
CREATE INDEX IF NOT EXISTS idx_users_twitter_id ON public.users(twitter_id);
CREATE INDEX IF NOT EXISTS idx_users_farcaster_fid ON public.users(farcaster_fid);

-- Epochs table
CREATE TABLE IF NOT EXISTS public.epochs (
  id BIGSERIAL PRIMARY KEY,
  epoch_number INTEGER UNIQUE NOT NULL,
  started_at TIMESTAMP NOT NULL,
  ended_at TIMESTAMP,
  multiplicator NUMERIC(78, 0) NOT NULL,
  last_epoch_points NUMERIC(78, 0) DEFAULT 0,
  last_epoch_points_twitter NUMERIC(78, 0) DEFAULT 0,
  last_epoch_points_farcaster NUMERIC(78, 0) DEFAULT 0,
  current_epoch_points NUMERIC(78, 0) DEFAULT 0,
  current_epoch_points_twitter NUMERIC(78, 0) DEFAULT 0,
  current_epoch_points_farcaster NUMERIC(78, 0) DEFAULT 0,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_epochs_epoch_number ON public.epochs(epoch_number);
CREATE INDEX IF NOT EXISTS idx_epochs_started_at ON public.epochs(started_at);

-- Transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id BIGSERIAL PRIMARY KEY,
  hash VARCHAR(66) UNIQUE NOT NULL,
  block_number BIGINT NOT NULL,
  block_timestamp TIMESTAMP NOT NULL,
  "from" VARCHAR(42) NOT NULL,
  "to" VARCHAR(42) NOT NULL,
  value NUMERIC(78, 0) NOT NULL,
  type VARCHAR(20) NOT NULL,
  platform VARCHAR(20),
  status VARCHAR(20) DEFAULT 'completed',
  user_id BIGINT,
  epoch_id BIGINT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_from ON public.transactions("from");
CREATE INDEX IF NOT EXISTS idx_transactions_to ON public.transactions("to");
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_block_timestamp ON public.transactions(block_timestamp);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_platform ON public.transactions(platform);
CREATE INDEX IF NOT EXISTS idx_transactions_epoch_id ON public.transactions(epoch_id);

ALTER TABLE public.transactions ADD CONSTRAINT fk_transactions_user FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;
ALTER TABLE public.transactions ADD CONSTRAINT fk_transactions_epoch FOREIGN KEY (epoch_id) REFERENCES public.epochs(id) ON DELETE SET NULL;

-- Balances table
CREATE TABLE IF NOT EXISTS public.balances (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT UNIQUE NOT NULL,
  balance NUMERIC(78, 0) DEFAULT 0,
  total_earned NUMERIC(78, 0) DEFAULT 0,
  total_transferred NUMERIC(78, 0) DEFAULT 0,
  last_updated TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_balances_user_id ON public.balances(user_id);
CREATE INDEX IF NOT EXISTS idx_balances_balance ON public.balances(balance);

ALTER TABLE public.balances ADD CONSTRAINT fk_balances_user FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;

-- Minting days table
CREATE TABLE IF NOT EXISTS public.minting_days (
  id BIGSERIAL PRIMARY KEY,
  minting_day_timestamp TIMESTAMP UNIQUE NOT NULL,
  platform VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  total_points NUMERIC(78, 0) DEFAULT 0,
  batches_processed INTEGER DEFAULT 0,
  batches_errored INTEGER DEFAULT 0,
  running_hash TEXT,
  ipfs_cid TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_minting_days_timestamp ON public.minting_days(minting_day_timestamp);
CREATE INDEX IF NOT EXISTS idx_minting_days_platform ON public.minting_days(platform);
CREATE INDEX IF NOT EXISTS idx_minting_days_status ON public.minting_days(status);

-- Global stats table (single row)
CREATE TABLE IF NOT EXISTS public.global_stats (
  id BIGSERIAL PRIMARY KEY,
  total_tokenized NUMERIC(78, 0) DEFAULT 0,
  total_users BIGINT DEFAULT 0,
  total_transactions BIGINT DEFAULT 0,
  twitter_percentage DOUBLE PRECISION DEFAULT 0,
  farcaster_percentage DOUBLE PRECISION DEFAULT 0,
  last_updated TIMESTAMP DEFAULT NOW()
);

-- Daily stats table
CREATE TABLE IF NOT EXISTS public.daily_stats (
  id BIGSERIAL PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  tokens_minted NUMERIC(78, 0) DEFAULT 0,
  new_users BIGINT DEFAULT 0,
  transactions BIGINT DEFAULT 0,
  twitter_tokens NUMERIC(78, 0) DEFAULT 0,
  farcaster_tokens NUMERIC(78, 0) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON public.daily_stats(date);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_epochs_updated_at BEFORE UPDATE ON public.epochs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_minting_days_updated_at BEFORE UPDATE ON public.minting_days
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_stats_updated_at BEFORE UPDATE ON public.daily_stats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_balances_last_updated BEFORE UPDATE ON public.balances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_global_stats_last_updated BEFORE UPDATE ON public.global_stats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments
COMMENT ON TABLE public.users IS 'Users table for GMCoin v2 with wallet addresses and social platform IDs';
COMMENT ON TABLE public.epochs IS 'Epochs table tracking reward periods and multipliers';
COMMENT ON TABLE public.transactions IS 'Transactions table tracking on-chain and off-chain transactions';
COMMENT ON TABLE public.balances IS 'User balances table tracking token balances and earnings';
COMMENT ON TABLE public.minting_days IS 'Minting days table tracking daily minting operations';
COMMENT ON TABLE public.global_stats IS 'Global statistics table (single row)';
COMMENT ON TABLE public.daily_stats IS 'Daily statistics table tracking daily metrics';
