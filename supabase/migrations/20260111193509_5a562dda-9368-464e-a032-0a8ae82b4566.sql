-- Drop existing function
DROP FUNCTION IF EXISTS generate_ticket_number();

-- Create a sequence for ticket numbers per year
CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START 1;

-- Create improved function with retry logic for race conditions
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    new_number TEXT;
    year_prefix TEXT;
    sequence_num INTEGER;
    max_attempts INTEGER := 10;
    attempt INTEGER := 0;
BEGIN
    year_prefix := TO_CHAR(NOW(), 'YYYY');
    
    LOOP
        attempt := attempt + 1;
        
        -- Get the next sequence number based on existing tickets
        SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 6) AS INTEGER)), 0) + 1
        INTO sequence_num
        FROM public.support_tickets
        WHERE ticket_number LIKE year_prefix || '-%';
        
        -- Add random offset to reduce collision probability
        sequence_num := sequence_num + (random() * 10)::INTEGER;
        
        new_number := year_prefix || '-' || LPAD(sequence_num::TEXT, 6, '0');
        
        -- Check if this number already exists
        IF NOT EXISTS (SELECT 1 FROM public.support_tickets WHERE ticket_number = new_number) THEN
            RETURN new_number;
        END IF;
        
        -- Increment and try again
        IF attempt >= max_attempts THEN
            -- Use timestamp-based fallback
            new_number := year_prefix || '-' || LPAD((EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT::TEXT, 12, '0');
            RETURN new_number;
        END IF;
    END LOOP;
END;
$$;