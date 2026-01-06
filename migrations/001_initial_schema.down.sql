-- Migration: 001_initial_schema.down.sql
-- Description: Rollback for initial database schema
-- Date: 2024-12-19

-- Drop triggers
DROP TRIGGER IF EXISTS update_global_stats_last_updated ON public.global_stats;
DROP TRIGGER IF EXISTS update_balances_last_updated ON public.balances;
DROP TRIGGER IF EXISTS update_daily_stats_updated_at ON public.daily_stats;
DROP TRIGGER IF EXISTS update_minting_days_updated_at ON public.minting_days;
DROP TRIGGER IF EXISTS update_epochs_updated_at ON public.epochs;
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;

-- Drop function
DROP FUNCTION IF EXISTS public.update_updated_at_column();

-- Drop tables (in reverse order due to foreign keys)
DROP TABLE IF EXISTS public.daily_stats CASCADE;
DROP TABLE IF EXISTS public.global_stats CASCADE;
DROP TABLE IF EXISTS public.minting_days CASCADE;
DROP TABLE IF EXISTS public.balances CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.epochs CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
