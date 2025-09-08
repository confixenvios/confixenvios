-- Add audio_url column to shipment_status_history table
ALTER TABLE public.shipment_status_history 
ADD COLUMN audio_url TEXT;