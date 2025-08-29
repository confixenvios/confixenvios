-- CRITICAL SECURITY FIX: Remove public access to sensitive address data
-- and implement proper user-scoped RLS policies

-- Drop the existing dangerous policies that expose all address data publicly
DROP POLICY IF EXISTS "Anyone can view addresses" ON public.addresses;
DROP POLICY IF EXISTS "Anyone can create addresses" ON public.addresses;

-- Add user_id column to addresses table to establish ownership
ALTER TABLE public.addresses 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create secure RLS policies that respect user ownership
CREATE POLICY "Users can view own addresses" 
ON public.addresses 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own addresses" 
ON public.addresses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own addresses" 
ON public.addresses 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own addresses" 
ON public.addresses 
FOR DELETE 
USING (auth.uid() = user_id);

-- Admin policies for full access
CREATE POLICY "Admins can manage all addresses" 
ON public.addresses 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Update existing addresses to have a user_id (for demo purposes, we'll leave them as NULL for now)
-- In production, you'd need to properly map existing addresses to users