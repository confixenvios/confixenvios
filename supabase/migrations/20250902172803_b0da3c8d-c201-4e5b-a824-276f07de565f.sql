-- Add back anonymous address creation but with stricter controls
CREATE POLICY "Anonymous users can create addresses with restrictions" 
ON public.addresses 
FOR INSERT 
WITH CHECK (
  user_id IS NULL 
  AND created_at IS NOT NULL
);

-- Add anonymous address update policy for the temporary session period
CREATE POLICY "Anonymous users can update recent addresses" 
ON public.addresses 
FOR UPDATE 
USING (user_id IS NULL AND created_at > (now() - interval '24 hours'))
WITH CHECK (user_id IS NULL);

-- Create a function to clean up old anonymous addresses
CREATE OR REPLACE FUNCTION public.cleanup_anonymous_addresses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete anonymous addresses older than 7 days
  DELETE FROM public.addresses 
  WHERE user_id IS NULL 
  AND created_at < (now() - interval '7 days');
  
  RAISE NOTICE 'Cleaned up old anonymous addresses';
END;
$$;