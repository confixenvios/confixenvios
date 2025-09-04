-- Remove the public read access policy from motoristas table
-- This policy currently allows anyone to read sensitive driver data
DROP POLICY IF EXISTS "Allow motoristas read access" ON public.motoristas;

-- The existing admin policy "Admins can manage all motoristas" remains intact
-- The authenticate_motorista() function will continue to work due to SECURITY DEFINER privilege
-- This ensures only admins can access driver data while preserving authentication functionality