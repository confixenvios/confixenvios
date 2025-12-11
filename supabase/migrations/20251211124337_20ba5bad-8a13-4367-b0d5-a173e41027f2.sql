-- First, clean up duplicate ETI codes - keep only the first ones created per shipment
DELETE FROM b2b_volume_labels 
WHERE id NOT IN (
  SELECT DISTINCT ON (b2b_shipment_id, volume_number) id
  FROM b2b_volume_labels
  ORDER BY b2b_shipment_id, volume_number, created_at ASC
);

-- Reset the sequence to start fresh
DROP SEQUENCE IF EXISTS eti_code_sequence;
CREATE SEQUENCE eti_code_sequence START WITH 1;

-- Recreate the function to ONLY return existing codes, never generate new ones
CREATE OR REPLACE FUNCTION public.generate_eti_codes_for_shipment(p_b2b_shipment_id uuid, p_volume_count integer)
 RETURNS TABLE(eti_code character varying, eti_sequence_number integer, volume_number integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only return existing ETI codes, do not generate new ones
  RETURN QUERY
  SELECT 
    bvl.eti_code,
    bvl.eti_sequence_number,
    bvl.volume_number
  FROM b2b_volume_labels bvl
  WHERE bvl.b2b_shipment_id = p_b2b_shipment_id
  ORDER BY bvl.volume_number;
END;
$function$;

-- Create a new function to generate ETI codes only when creating shipment (called once)
CREATE OR REPLACE FUNCTION public.create_eti_codes_for_shipment(p_b2b_shipment_id uuid, p_volume_count integer)
 RETURNS TABLE(eti_code character varying, eti_sequence_number integer, volume_number integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_volume integer;
  v_seq_number integer;
  v_eti_code varchar;
  existing_count integer;
BEGIN
  -- Check if ETI codes already exist for this shipment
  SELECT COUNT(*) INTO existing_count 
  FROM b2b_volume_labels 
  WHERE b2b_shipment_id = p_b2b_shipment_id;
  
  -- If codes already exist, return them instead of creating new ones
  IF existing_count > 0 THEN
    RETURN QUERY
    SELECT 
      bvl.eti_code,
      bvl.eti_sequence_number,
      bvl.volume_number
    FROM b2b_volume_labels bvl
    WHERE bvl.b2b_shipment_id = p_b2b_shipment_id
    ORDER BY bvl.volume_number;
    RETURN;
  END IF;

  -- Generate new ETI codes only if none exist
  FOR v_volume IN 1..p_volume_count LOOP
    -- Get next sequence number
    v_seq_number := nextval('eti_code_sequence');
    
    -- Generate ETI code with 4-digit format
    v_eti_code := 'ETI-' || LPAD(v_seq_number::text, 4, '0');
    
    -- Insert into labels table
    INSERT INTO b2b_volume_labels (b2b_shipment_id, volume_number, eti_code, eti_sequence_number)
    VALUES (p_b2b_shipment_id, v_volume, v_eti_code, v_seq_number);
    
    eti_code := v_eti_code;
    eti_sequence_number := v_seq_number;
    volume_number := v_volume;
    RETURN NEXT;
  END LOOP;
END;
$function$;