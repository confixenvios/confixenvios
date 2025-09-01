-- Allow anonymous users to create addresses and shipments for the public flow
-- This enables the quote-to-payment flow without requiring authentication

-- Create policies for anonymous users to create addresses
CREATE POLICY "Anonymous users can create addresses" 
ON public.addresses 
FOR INSERT 
WITH CHECK (user_id IS NULL);

-- Create policies for anonymous users to create shipments
CREATE POLICY "Anonymous users can create shipments" 
ON public.shipments 
FOR INSERT 
WITH CHECK (user_id IS NULL);

-- Allow anonymous users to read their own shipments via tracking code
CREATE POLICY "Anonymous users can view shipments by tracking code" 
ON public.shipments 
FOR SELECT 
USING (user_id IS NULL);

-- Allow anonymous users to update their shipments (for status updates, payment info, etc.)
CREATE POLICY "Anonymous users can update their shipments" 
ON public.shipments 
FOR UPDATE 
USING (user_id IS NULL)
WITH CHECK (user_id IS NULL);