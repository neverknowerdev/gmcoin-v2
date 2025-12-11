-- Migration: 002_create_helper_functions.up.sql
-- Description: Create helper functions for common database operations
-- Date: 2024-12-19

-- Function to get user statistics
CREATE OR REPLACE FUNCTION public.get_user_statistics(user_wallet VARCHAR)
RETURNS TABLE (
    total_transactions BIGINT,
    total_earned NUMERIC,
    total_transferred NUMERIC,
    current_balance NUMERIC,
    twitter_transactions BIGINT,
    farcaster_transactions BIGINT,
    last_transaction_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT t.id)::BIGINT as total_transactions,
        COALESCE(SUM(CASE WHEN t.type = 'mint' OR t.type = 'reward' THEN t.value ELSE 0 END), 0)::NUMERIC(78, 0) as total_earned,
        COALESCE(SUM(CASE WHEN t.type = 'transfer' THEN t.value ELSE 0 END), 0)::NUMERIC(78, 0) as total_transferred,
        COALESCE(b.balance, 0)::NUMERIC(78, 0) as current_balance,
        COUNT(DISTINCT CASE WHEN t.platform = 'twitter' THEN t.id END)::BIGINT as twitter_transactions,
        COUNT(DISTINCT CASE WHEN t.platform = 'farcaster' THEN t.id END)::BIGINT as farcaster_transactions,
        MAX(t.block_timestamp) as last_transaction_at
    FROM public.users u
    LEFT JOIN public.balances b ON b.user_id = u.user_id
    LEFT JOIN public.transactions t ON t.user_id = u.user_id
    WHERE u.primary_wallet = user_wallet
    GROUP BY u.id, b.balance;
END;
$$ LANGUAGE plpgsql;

-- Function to get user balance with history
CREATE OR REPLACE FUNCTION public.get_user_balance_history(
    user_wallet VARCHAR,
    limit_param INTEGER DEFAULT 50,
    offset_param INTEGER DEFAULT 0
)
RETURNS TABLE (
    transaction_hash VARCHAR,
    block_number BIGINT,
    block_timestamp TIMESTAMP,
    type VARCHAR,
    platform VARCHAR,
    value NUMERIC,
    from_address VARCHAR,
    to_address VARCHAR,
    epoch_id BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.hash as transaction_hash,
        t.block_number,
        t.block_timestamp,
        t.type,
        t.platform,
        t.value,
        t."from" as from_address,
        t."to" as to_address,
        t.epoch_id
    FROM public.transactions t
    JOIN public.users u ON u.user_id = t.user_id
    WHERE u.primary_wallet = user_wallet
    ORDER BY t.block_timestamp DESC, t.block_number DESC
    LIMIT limit_param
    OFFSET offset_param;
END;
$$ LANGUAGE plpgsql;

-- Function to get epoch statistics
CREATE OR REPLACE FUNCTION public.get_epoch_statistics(epoch_number_param INTEGER)
RETURNS TABLE (
    epoch_id BIGINT,
    epoch_number INTEGER,
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    total_transactions BIGINT,
    total_points NUMERIC,
    twitter_points NUMERIC,
    farcaster_points NUMERIC,
    total_users BIGINT,
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id as epoch_id,
        e.epoch_number,
        e.started_at,
        e.ended_at,
        COUNT(DISTINCT t.id)::BIGINT as total_transactions,
        COALESCE(SUM(t.value), 0)::NUMERIC(78, 0) as total_points,
        COALESCE(SUM(CASE WHEN t.platform = 'twitter' THEN t.value ELSE 0 END), 0)::NUMERIC(78, 0) as twitter_points,
        COALESCE(SUM(CASE WHEN t.platform = 'farcaster' THEN t.value ELSE 0 END), 0)::NUMERIC(78, 0) as farcaster_points,
        COUNT(DISTINCT t.user_id)::BIGINT as total_users,
        e.is_active
    FROM public.epochs e
    LEFT JOIN public.transactions t ON t.epoch_id = e.id
    WHERE e.epoch_number = epoch_number_param
    GROUP BY e.id, e.epoch_number, e.started_at, e.ended_at, e.is_active;
END;
$$ LANGUAGE plpgsql;

-- Function to get active epoch
CREATE OR REPLACE FUNCTION public.get_active_epoch()
RETURNS TABLE (
    id BIGINT,
    epoch_number INTEGER,
    started_at TIMESTAMP,
    multiplicator NUMERIC,
    current_epoch_points NUMERIC,
    current_epoch_points_twitter NUMERIC,
    current_epoch_points_farcaster NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.epoch_number,
        e.started_at,
        e.multiplicator,
        e.current_epoch_points,
        e.current_epoch_points_twitter,
        e.current_epoch_points_farcaster
    FROM public.epochs e
    WHERE e.is_active = TRUE
    ORDER BY e.started_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to get transactions by type and platform
CREATE OR REPLACE FUNCTION public.get_transactions_by_filters(
    type_param VARCHAR DEFAULT NULL,
    platform_param VARCHAR DEFAULT NULL,
    epoch_id_param BIGINT DEFAULT NULL,
    limit_param INTEGER DEFAULT 50,
    offset_param INTEGER DEFAULT 0
)
RETURNS TABLE (
    id BIGINT,
    hash VARCHAR,
    block_number BIGINT,
    block_timestamp TIMESTAMP,
    type VARCHAR,
    platform VARCHAR,
    value NUMERIC,
    from_address VARCHAR,
    to_address VARCHAR,
    user_id BIGINT,
    epoch_id BIGINT,
    status VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.hash,
        t.block_number,
        t.block_timestamp,
        t.type,
        t.platform,
        t.value,
        t."from" as from_address,
        t."to" as to_address,
        t.user_id,
        t.epoch_id,
        t.status
    FROM public.transactions t
    WHERE 
        (type_param IS NULL OR t.type = type_param)
        AND (platform_param IS NULL OR t.platform = platform_param)
        AND (epoch_id_param IS NULL OR t.epoch_id = epoch_id_param)
    ORDER BY t.block_timestamp DESC, t.block_number DESC
    LIMIT limit_param
    OFFSET offset_param;
END;
$$ LANGUAGE plpgsql;

-- Function to get top users by balance
CREATE OR REPLACE FUNCTION public.get_top_users_by_balance(
    limit_param INTEGER DEFAULT 100
)
RETURNS TABLE (
    user_id BIGINT,
    primary_wallet VARCHAR,
    balance NUMERIC,
    total_earned NUMERIC,
    total_transferred NUMERIC,
    rank BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.user_id,
        u.primary_wallet,
        COALESCE(b.balance, 0)::NUMERIC(78, 0) as balance,
        COALESCE(b.total_earned, 0)::NUMERIC(78, 0) as total_earned,
        COALESCE(b.total_transferred, 0)::NUMERIC(78, 0) as total_transferred,
        ROW_NUMBER() OVER (ORDER BY COALESCE(b.balance, 0) DESC)::BIGINT as rank
    FROM public.users u
    LEFT JOIN public.balances b ON b.user_id = u.user_id
    ORDER BY COALESCE(b.balance, 0) DESC
    LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;

-- Function to get daily statistics for a date range
CREATE OR REPLACE FUNCTION public.get_daily_statistics_range(
    start_date DATE,
    end_date DATE
)
RETURNS TABLE (
    date DATE,
    tokens_minted NUMERIC,
    new_users BIGINT,
    transactions BIGINT,
    twitter_tokens NUMERIC,
    farcaster_tokens NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ds.date,
        ds.tokens_minted,
        ds.new_users,
        ds.transactions,
        ds.twitter_tokens,
        ds.farcaster_tokens
    FROM public.daily_stats ds
    WHERE ds.date >= start_date AND ds.date <= end_date
    ORDER BY ds.date DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to update user balance (used by indexer)
CREATE OR REPLACE FUNCTION public.update_user_balance(
    user_id_param BIGINT,
    amount_change NUMERIC,
    is_earned BOOLEAN DEFAULT FALSE,
    is_transferred BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN AS $$
DECLARE
    updated BOOLEAN := FALSE;
BEGIN
    INSERT INTO public.balances (user_id, balance, total_earned, total_transferred, last_updated)
    VALUES (
        user_id_param,
        COALESCE(amount_change, 0),
        CASE WHEN is_earned THEN COALESCE(amount_change, 0) ELSE 0 END,
        CASE WHEN is_transferred THEN COALESCE(amount_change, 0) ELSE 0 END,
        NOW()
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
        balance = balances.balance + COALESCE(amount_change, 0),
        total_earned = balances.total_earned + CASE WHEN is_earned THEN COALESCE(amount_change, 0) ELSE 0 END,
        total_transferred = balances.total_transferred + CASE WHEN is_transferred THEN COALESCE(amount_change, 0) ELSE 0 END,
        last_updated = NOW();
    
    GET DIAGNOSTICS updated = FOUND;
    RETURN updated;
END;
$$ LANGUAGE plpgsql;

-- Function to get minting day statistics
CREATE OR REPLACE FUNCTION public.get_minting_day_statistics(
    minting_day_timestamp TIMESTAMP,
    platform_param VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    id BIGINT,
    minting_day_timestamp TIMESTAMP,
    platform VARCHAR,
    status VARCHAR,
    total_points NUMERIC,
    batches_processed INTEGER,
    batches_errored INTEGER,
    running_hash TEXT,
    ipfs_cid TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        md.id,
        md.minting_day_timestamp,
        md.platform,
        md.status,
        md.total_points,
        md.batches_processed,
        md.batches_errored,
        md.running_hash,
        md.ipfs_cid
    FROM public.minting_days md
    WHERE 
        md.minting_day_timestamp = minting_day_timestamp
        AND (platform_param IS NULL OR md.platform = platform_param)
    ORDER BY md.minting_day_timestamp DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get global statistics
CREATE OR REPLACE FUNCTION public.get_global_statistics()
RETURNS TABLE (
    total_tokenized NUMERIC,
    total_users BIGINT,
    total_transactions BIGINT,
    twitter_percentage DOUBLE PRECISION,
    farcaster_percentage DOUBLE PRECISION,
    last_updated TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gs.total_tokenized,
        gs.total_users,
        gs.total_transactions,
        gs.twitter_percentage,
        gs.farcaster_percentage,
        gs.last_updated
    FROM public.global_stats gs
    ORDER BY gs.last_updated DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to update global statistics
CREATE OR REPLACE FUNCTION public.update_global_statistics()
RETURNS BOOLEAN AS $$
DECLARE
    total_users_count BIGINT;
    total_transactions_count BIGINT;
    total_tokenized_amount NUMERIC;
    twitter_tokens NUMERIC;
    farcaster_tokens NUMERIC;
    twitter_pct DOUBLE PRECISION;
    farcaster_pct DOUBLE PRECISION;
BEGIN
    -- Get counts
    SELECT COUNT(*)::BIGINT INTO total_users_count FROM public.users;
    SELECT COUNT(*)::BIGINT INTO total_transactions_count FROM public.transactions;
    
    -- Get total tokenized (sum of all minted tokens)
    SELECT COALESCE(SUM(value), 0)::NUMERIC(78, 0) INTO total_tokenized_amount
    FROM public.transactions
    WHERE type = 'mint';
    
    -- Get platform-specific tokens
    SELECT COALESCE(SUM(value), 0)::NUMERIC(78, 0) INTO twitter_tokens
    FROM public.transactions
    WHERE type = 'mint' AND platform = 'twitter';
    
    SELECT COALESCE(SUM(value), 0)::NUMERIC(78, 0) INTO farcaster_tokens
    FROM public.transactions
    WHERE type = 'mint' AND platform = 'farcaster';
    
    -- Calculate percentages
    IF total_tokenized_amount > 0 THEN
        twitter_pct := (twitter_tokens / total_tokenized_amount) * 100;
        farcaster_pct := (farcaster_tokens / total_tokenized_amount) * 100;
    ELSE
        twitter_pct := 0;
        farcaster_pct := 0;
    END IF;
    
    -- Update or insert global stats
    INSERT INTO public.global_stats (
        total_tokenized,
        total_users,
        total_transactions,
        twitter_percentage,
        farcaster_percentage,
        last_updated
    ) VALUES (
        total_tokenized_amount,
        total_users_count,
        total_transactions_count,
        twitter_pct,
        farcaster_pct,
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        total_tokenized = EXCLUDED.total_tokenized,
        total_users = EXCLUDED.total_users,
        total_transactions = EXCLUDED.total_transactions,
        twitter_percentage = EXCLUDED.twitter_percentage,
        farcaster_percentage = EXCLUDED.farcaster_percentage,
        last_updated = NOW();
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get user by wallet address
CREATE OR REPLACE FUNCTION public.get_user_by_wallet(wallet_address VARCHAR)
RETURNS TABLE (
    id BIGINT,
    user_id BIGINT,
    primary_wallet VARCHAR,
    twitter_id BIGINT,
    farcaster_fid BIGINT,
    human_verification INTEGER,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.user_id,
        u.primary_wallet,
        u.twitter_id,
        u.farcaster_fid,
        u.human_verification,
        u.created_at,
        u.updated_at
    FROM public.users u
    WHERE u.primary_wallet = wallet_address
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to get transactions for a specific user
CREATE OR REPLACE FUNCTION public.get_user_transactions(
    user_wallet VARCHAR,
    limit_param INTEGER DEFAULT 50,
    offset_param INTEGER DEFAULT 0
)
RETURNS TABLE (
    id BIGINT,
    hash VARCHAR,
    block_number BIGINT,
    block_timestamp TIMESTAMP,
    type VARCHAR,
    platform VARCHAR,
    value NUMERIC,
    from_address VARCHAR,
    to_address VARCHAR,
    epoch_id BIGINT,
    status VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.hash,
        t.block_number,
        t.block_timestamp,
        t.type,
        t.platform,
        t.value,
        t."from" as from_address,
        t."to" as to_address,
        t.epoch_id,
        t.status
    FROM public.transactions t
    JOIN public.users u ON u.user_id = t.user_id
    WHERE u.primary_wallet = user_wallet
    ORDER BY t.block_timestamp DESC, t.block_number DESC
    LIMIT limit_param
    OFFSET offset_param;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_statistics(VARCHAR) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_balance_history(VARCHAR, INTEGER, INTEGER) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_epoch_statistics(INTEGER) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_active_epoch() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_transactions_by_filters(VARCHAR, VARCHAR, BIGINT, INTEGER, INTEGER) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_top_users_by_balance(INTEGER) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_daily_statistics_range(DATE, DATE) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_user_balance(BIGINT, NUMERIC, BOOLEAN, BOOLEAN) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_minting_day_statistics(TIMESTAMP, VARCHAR) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_global_statistics() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_global_statistics() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_by_wallet(VARCHAR) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_transactions(VARCHAR, INTEGER, INTEGER) TO PUBLIC;

-- Add comments
COMMENT ON FUNCTION public.get_user_statistics(VARCHAR) IS 'Get comprehensive statistics for a user (transactions, earnings, transfers, balance)';
COMMENT ON FUNCTION public.get_user_balance_history(VARCHAR, INTEGER, INTEGER) IS 'Get paginated transaction history for a user';
COMMENT ON FUNCTION public.get_epoch_statistics(INTEGER) IS 'Get comprehensive statistics for a specific epoch';
COMMENT ON FUNCTION public.get_active_epoch() IS 'Get the currently active epoch';
COMMENT ON FUNCTION public.get_transactions_by_filters(VARCHAR, VARCHAR, BIGINT, INTEGER, INTEGER) IS 'Get paginated transactions filtered by type, platform, and epoch';
COMMENT ON FUNCTION public.get_top_users_by_balance(INTEGER) IS 'Get top users ranked by balance';
COMMENT ON FUNCTION public.get_daily_statistics_range(DATE, DATE) IS 'Get daily statistics for a date range';
COMMENT ON FUNCTION public.update_user_balance(BIGINT, NUMERIC, BOOLEAN, BOOLEAN) IS 'Update user balance (used by indexer)';
COMMENT ON FUNCTION public.get_minting_day_statistics(TIMESTAMP, VARCHAR) IS 'Get statistics for a specific minting day';
COMMENT ON FUNCTION public.get_global_statistics() IS 'Get global platform statistics';
COMMENT ON FUNCTION public.update_global_statistics() IS 'Recalculate and update global statistics';
COMMENT ON FUNCTION public.get_user_by_wallet(VARCHAR) IS 'Get user by wallet address';
COMMENT ON FUNCTION public.get_user_transactions(VARCHAR, INTEGER, INTEGER) IS 'Get paginated transactions for a user';
