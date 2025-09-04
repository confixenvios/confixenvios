-- Comprehensive fix for shipment status history security vulnerability
-- First, drop ALL existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow status history management" ON public.shipment_status_history;
DROP POLICY IF EXISTS "Admins can insert status history" ON public.shipment_status_history;
DROP POLICY IF EXISTS "Admins can update status history" ON public.shipment_status_history;
DROP POLICY IF EXISTS "Admins can delete status history" ON public.shipment_status_history;
DROP POLICY IF EXISTS "System can insert status updates" ON public.shipment_status_history;
DROP POLICY IF EXISTS "Motoristas can update assigned shipment status" ON public.shipment_status_history;

-- Now create the secure policies from scratch
-- Allow admins full access to status history
CREATE POLICY "Secure: Admins full access to status history" 
ON public.shipment_status_history 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow system/webhook operations to insert status updates (for automated processes)
CREATE POLICY "Secure: System status updates" 
ON public.shipment_status_history 
FOR INSERT 
WITH CHECK (auth.uid() IS NULL);

-- Allow motoristas to insert status updates for their assigned shipments only
CREATE POLICY "Secure: Motoristas assigned shipments" 
ON public.shipment_status_history 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.shipments s 
    WHERE s.id = shipment_status_history.shipment_id 
    AND s.motorista_id = auth.uid()
  )
);