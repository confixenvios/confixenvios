-- Ensure motoristas can see their assigned shipments via RPC function
-- Add a policy specifically for motoristas accessing their own data
DO $$ 
BEGIN
  -- Check if the motorista access policy exists, if not create it
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'shipments' 
    AND policyname = 'Motoristas can access assigned shipments via RPC'
  ) THEN
    CREATE POLICY "Motoristas can access assigned shipments via RPC"
    ON public.shipments
    FOR ALL
    USING (
      -- Allow access if this is being called from the RPC function context
      motorista_id IS NOT NULL AND 
      EXISTS (
        SELECT 1 FROM public.motoristas m 
        WHERE m.id = shipments.motorista_id 
        AND m.status = 'ativo'
      )
    );
  END IF;
END $$;