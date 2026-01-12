-- Drop the old function and create a new one that handles concurrency properly
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_number TEXT;
    year_prefix TEXT;
    sequence_num INTEGER;
    max_retries INTEGER := 10;
    current_retry INTEGER := 0;
BEGIN
    year_prefix := TO_CHAR(NOW(), 'YYYY');
    
    -- Use a loop to handle race conditions
    LOOP
        -- Get the next sequence number based on existing tickets
        SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 6) AS INTEGER)), 0) + 1
        INTO sequence_num
        FROM public.support_tickets
        WHERE ticket_number LIKE year_prefix || '-%';
        
        new_number := year_prefix || '-' || LPAD(sequence_num::TEXT, 6, '0');
        
        -- Check if this number already exists
        IF NOT EXISTS (SELECT 1 FROM public.support_tickets WHERE ticket_number = new_number) THEN
            RETURN new_number;
        END IF;
        
        current_retry := current_retry + 1;
        IF current_retry >= max_retries THEN
            -- If we've tried too many times, use a higher sequence number
            RETURN year_prefix || '-' || LPAD((sequence_num + current_retry)::TEXT, 6, '0');
        END IF;
        
        -- Small delay to reduce contention
        PERFORM pg_sleep(0.01);
    END LOOP;
END;
$$;