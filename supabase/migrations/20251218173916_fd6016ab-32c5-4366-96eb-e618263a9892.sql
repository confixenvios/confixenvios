-- Add status field to profiles table for approval workflow
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pendente';

-- Add is_b2b field to profiles to track if client has B2B access
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_b2b boolean NOT NULL DEFAULT false;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- Update existing profiles to 'aprovado' (approved) so current users aren't blocked
UPDATE public.profiles SET status = 'aprovado' WHERE status = 'pendente';

-- Comment on columns
COMMENT ON COLUMN public.profiles.status IS 'Client approval status: pendente, aprovado, rejeitado';
COMMENT ON COLUMN public.profiles.is_b2b IS 'Whether client has access to B2B features';