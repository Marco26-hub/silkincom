-- Migration 002: Add admin reply columns to reviews table
-- Run this in Supabase SQL editor

ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS admin_reply TEXT,
  ADD COLUMN IF NOT EXISTS admin_replied_at TIMESTAMPTZ;
