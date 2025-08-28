-- SECURITY FIX: Implement proper access control for shipments table
-- This fixes the critical security vulnerability where shipments were publicly readable

-- Add user_id column to link shipments to their owners
ALTER TABLE public.shipments 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX idx_shipments_user_id ON public.shipments(user_id);

-- Drop the existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can create shipments" ON public.shipments;
DROP POLICY IF EXISTS "Anyone can update shipments" ON public.shipments;
DROP POLICY IF EXISTS "Anyone can view shipments" ON public.shipments;

-- Create secure RLS policies

-- Policy 1: Users can only view their own shipments
CREATE POLICY "Users can view own shipments"
  ON public.shipments FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 2: Users can only create shipments for themselves
CREATE POLICY "Users can create own shipments"
  ON public.shipments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can only update their own shipments  
CREATE POLICY "Users can update own shipments"
  ON public.shipments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy 4: Users can delete their own shipments
CREATE POLICY "Users can delete own shipments"
  ON public.shipments FOR DELETE
  USING (auth.uid() = user_id);

-- Policy 5: Admins can view all shipments (for management purposes)
CREATE POLICY "Admins can view all shipments"
  ON public.shipments FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Policy 6: Admins can manage all shipments (for support purposes)
CREATE POLICY "Admins can manage all shipments"
  ON public.shipments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Update existing shipments to belong to the system (will need manual assignment later)
-- This prevents data loss during migration
UPDATE public.shipments 
SET user_id = (SELECT id FROM auth.users LIMIT 1)
WHERE user_id IS NULL AND EXISTS (SELECT 1 FROM auth.users);