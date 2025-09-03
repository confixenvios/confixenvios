-- Add document field (CPF/CNPJ) to profiles table
ALTER TABLE public.profiles 
ADD COLUMN document TEXT;

-- Create index for document field for better performance
CREATE INDEX idx_profiles_document ON public.profiles(document);

-- Add constraint to ensure document is unique if provided
ALTER TABLE public.profiles 
ADD CONSTRAINT unique_document UNIQUE (document);