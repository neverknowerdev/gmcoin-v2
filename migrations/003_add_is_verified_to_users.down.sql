-- Migration: 003_add_is_verified_to_users.down.sql
-- Description: Rollback for adding is_verified column to users table
-- Date: 2024-12-19

DROP INDEX IF EXISTS idx_users_is_verified;

ALTER TABLE public.users
DROP COLUMN IF EXISTS is_verified;
