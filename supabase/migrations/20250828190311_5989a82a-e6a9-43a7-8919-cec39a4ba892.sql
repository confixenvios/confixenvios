-- Corrigir funções existentes para ter search_path seguro
DROP FUNCTION IF EXISTS public.update_updated_at_column();
DROP FUNCTION IF EXISTS public.generate_tracking_code();

-- Recriar função update_updated_at_column com search_path seguro
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Recriar função generate_tracking_code com search_path seguro
CREATE OR REPLACE FUNCTION public.generate_tracking_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  code TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- Generate a tracking code in format TRK-YYYY followed by 6 random characters
    code := 'TRK-' || EXTRACT(YEAR FROM NOW()) || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
    
    -- Check if this code already exists
    SELECT EXISTS(SELECT 1 FROM public.shipments WHERE tracking_code = code) INTO exists_check;
    
    -- If it doesn't exist, break the loop
    IF NOT exists_check THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN code;
END;
$function$;