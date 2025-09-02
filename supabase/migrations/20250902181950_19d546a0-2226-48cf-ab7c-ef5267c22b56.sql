-- Create webhook_logs table to store all webhook calls
CREATE TABLE public.webhook_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER NOT NULL,
  response_body JSONB,
  source_ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access only
CREATE POLICY "Admins can view all webhook logs" 
ON public.webhook_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert webhook logs" 
ON public.webhook_logs 
FOR INSERT 
WITH CHECK (true); -- Allow system inserts

-- Create index for better performance
CREATE INDEX idx_webhook_logs_shipment_id ON public.webhook_logs(shipment_id);
CREATE INDEX idx_webhook_logs_created_at ON public.webhook_logs(created_at);
CREATE INDEX idx_webhook_logs_event_type ON public.webhook_logs(event_type);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_webhook_logs_updated_at
BEFORE UPDATE ON public.webhook_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();