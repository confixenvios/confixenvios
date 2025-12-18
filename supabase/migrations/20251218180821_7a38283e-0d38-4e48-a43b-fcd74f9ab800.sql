-- Remove is_b2b column from profiles table (no longer needed with unified registration)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_b2b;