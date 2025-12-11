-- Migration: 002_create_helper_functions.down.sql
-- Description: Rollback for helper functions
-- Date: 2024-12-19

-- Drop functions
DROP FUNCTION IF EXISTS public.get_user_transactions(VARCHAR, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.get_user_by_wallet(VARCHAR);
DROP FUNCTION IF EXISTS public.update_global_statistics();
DROP FUNCTION IF EXISTS public.get_global_statistics();
DROP FUNCTION IF EXISTS public.get_minting_day_statistics(TIMESTAMP, VARCHAR);
DROP FUNCTION IF EXISTS public.update_user_balance(BIGINT, NUMERIC, BOOLEAN, BOOLEAN);
DROP FUNCTION IF EXISTS public.get_daily_statistics_range(DATE, DATE);
DROP FUNCTION IF EXISTS public.get_top_users_by_balance(INTEGER);
DROP FUNCTION IF EXISTS public.get_transactions_by_filters(VARCHAR, VARCHAR, BIGINT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.get_active_epoch();
DROP FUNCTION IF EXISTS public.get_epoch_statistics(INTEGER);
DROP FUNCTION IF EXISTS public.get_user_balance_history(VARCHAR, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.get_user_statistics(VARCHAR);
