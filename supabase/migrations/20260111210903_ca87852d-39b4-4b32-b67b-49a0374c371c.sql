-- Corrigir função de geração de número de ticket para ser sequencial
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    new_number TEXT;
    year_prefix TEXT;
    sequence_num INTEGER;
BEGIN
    year_prefix := TO_CHAR(NOW(), 'YYYY');
    
    -- Get the next sequence number based on existing tickets (strictly sequential)
    SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 6) AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM public.support_tickets
    WHERE ticket_number LIKE year_prefix || '-%';
    
    new_number := year_prefix || '-' || LPAD(sequence_num::TEXT, 6, '0');
    
    RETURN new_number;
END;
$function$;