-- Migration: add_default_uuid_to_content.sql
-- Ensure uuid-ossp extension is available (idempotent)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create helper function to execute raw SQL via RPC
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE sql;
END;
$$;

-- Set default UUID generation for content.id
ALTER TABLE public.content ALTER COLUMN id SET DEFAULT uuid_generate_v4();
