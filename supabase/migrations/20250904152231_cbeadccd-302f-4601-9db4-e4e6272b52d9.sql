-- Fix critical security vulnerability in shipment status history
-- Remove the overly permissive policy that allows anyone to manipulate status history
DROP POLICY IF EXISTS "Allow status history management" ON public.shipment_status_history;

-- Create secure policies for shipment status history management
-- Note: Avoiding conflict with existing "Admins can view all status history" SELECT policy

-- Allow admins to insert, update, delete status history (complementing existing SELECT policy)
CREATE POLICY "Admins can insert status history" 
ON public.shipment_status_history 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update status history" 
ON public.shipment_status_history 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete status history" 
ON public.shipment_status_history 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow system/webhook operations to insert status updates (for automated processes)
CREATE POLICY "System can insert status updates" 
ON public.shipment_status_history 
FOR INSERT 
WITH CHECK (auth.uid() IS NULL);

-- Allow motoristas to insert status updates for their assigned shipments
CREATE POLICY "Motoristas can update assigned shipment status" 
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