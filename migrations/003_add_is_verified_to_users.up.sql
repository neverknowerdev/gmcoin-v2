-- Migration: 003_add_is_verified_to_users.up.sql
-- Description: Add is_verified column to users table
-- Date: 2024-12-19

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_is_verified ON public.users(is_verified);

COMMENT ON COLUMN public.users.is_verified IS 'Verification status of the user';
