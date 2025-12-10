-- Create table to track sequential ETI codes for B2B volume labels
CREATE TABLE public.b2b_volume_labels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  b2b_shipment_id UUID NOT NULL REFERENCES public.b2b_shipments(id) ON DELETE CASCADE,
  volume_number INTEGER NOT NULL,
  eti_code VARCHAR(20) NOT NULL UNIQUE,
  eti_sequence_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for fast lookup
CREATE INDEX idx_b2b_volume_labels_shipment ON public.b2b_volume_labels(b2b_shipment_id);
CREATE INDEX idx_b2b_volume_labels_eti_code ON public.b2b_volume_labels(eti_code);

-- Create sequence for ETI codes
CREATE SEQUENCE IF NOT EXISTS eti_code_sequence START 1;

-- Function to generate ETI codes for a B2B shipment
CREATE OR REPLACE FUNCTION public.generate_eti_codes_for_shipment(
  p_b2b_shipment_id UUID,
  p_volume_count INTEGER
)
RETURNS TABLE(volume_number INTEGER, eti_code VARCHAR(20), eti_sequence_number INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
  v_volume_num INTEGER;
  v_seq_num INTEGER;
  v_eti_code VARCHAR(20);
BEGIN
  -- Check if labels already exist for this shipment
  IF EXISTS (SELECT 1 FROM public.b2b_volume_labels WHERE b2b_shipment_id = p_b2b_shipment_id) THEN
    -- Return existing labels
    RETURN QUERY
    SELECT bvl.volume_number, bvl.eti_code, bvl.eti_sequence_number
    FROM public.b2b_volume_labels bvl
    WHERE bvl.b2b_shipment_id = p_b2b_shipment_id
    ORDER BY bvl.volume_number;
    RETURN;
  END IF;

  -- Generate new labels for each volume
  FOR v_volume_num IN 1..p_volume_count LOOP
    -- Get next sequence number
    v_seq_num := nextval('eti_code_sequence');
    
    -- Format ETI code with leading zeros (ETI-00000001)
    v_eti_code := 'ETI-' || LPAD(v_seq_num::TEXT, 8, '0');
    
    -- Insert the label record
    INSERT INTO public.b2b_volume_labels (b2b_shipment_id, volume_number, eti_code, eti_sequence_number)
    VALUES (p_b2b_shipment_id, v_volume_num, v_eti_code, v_seq_num);
    
    -- Return the generated label
    volume_number := v_volume_num;
    eti_code := v_eti_code;
    eti_sequence_number := v_seq_num;
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$$;

-- Disable RLS for initial phase (per product strategy)
ALTER TABLE public.b2b_volume_labels DISABLE ROW LEVEL SECURITY;