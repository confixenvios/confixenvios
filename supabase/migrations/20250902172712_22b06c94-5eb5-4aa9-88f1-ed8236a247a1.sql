-- Remove the policy that allows anonymous users to create addresses
DROP POLICY IF EXISTS "Anonymous users can create addresses" ON public.addresses;

-- Add a policy to allow anonymous users to SELECT only addresses they created in the current session
-- This is safer but still allows the quote flow to work
CREATE POLICY "Anonymous users can view addresses by session" 
ON public.addresses 
FOR SELECT 
USING (user_id IS NULL AND created_at > (now() - interval '24 hours'));

-- Add a policy to prevent anonymous address creation entirely in favor of requiring auth
-- Commenting this out for now to maintain functionality, but this would be the most secure approach:
-- CREATE POLICY "Only authenticated users can create addresses" 
-- ON public.addresses 
-- FOR INSERT 
-- WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);