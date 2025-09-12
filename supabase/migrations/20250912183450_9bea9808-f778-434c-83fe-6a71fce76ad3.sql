-- Fix RLS policies for shipment_occurrences
-- Problem: Motoristas don't use Supabase Auth, so the current policy fails
-- Solution: Create permissive policy for motorista occurrence insertions

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Motoristas podem criar ocorrências de suas remessas" ON shipment_occurrences;

-- Create new permissive policy for motorista occurrences
CREATE POLICY "Allow motorista occurrence insertions"
ON shipment_occurrences FOR INSERT
WITH CHECK (
  -- Verify motorista exists and is active
  EXISTS (
    SELECT 1 FROM motoristas m 
    WHERE m.id = motorista_id AND m.status = 'ativo'
  ) 
  AND 
  -- Verify shipment exists
  EXISTS (
    SELECT 1 FROM shipments s 
    WHERE s.id = shipment_id
  )
  AND
  -- Verify occurrence type is valid
  occurrence_type IN ('foto', 'audio')
);

-- Keep existing admin and user view policies unchanged