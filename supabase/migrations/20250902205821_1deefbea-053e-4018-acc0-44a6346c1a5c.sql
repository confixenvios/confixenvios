-- Configure N8n webhook for automatic dispatch after payment
UPDATE public.integrations 
SET webhook_url = 'https://n8n.grupoconfix.com/webhook-test/confixenvios',
    name = 'N8n Production Webhook',
    active = true
WHERE name ILIKE '%n8n%' OR name ILIKE '%webhook%'
   OR webhook_url ILIKE '%n8n%';

-- Insert webhook configuration if not exists
INSERT INTO public.integrations (name, webhook_url, active)
SELECT 'N8n Production Webhook', 'https://n8n.grupoconfix.com/webhook-test/confixenvios', true
WHERE NOT EXISTS (
    SELECT 1 FROM public.integrations 
    WHERE webhook_url = 'https://n8n.grupoconfix.com/webhook-test/confixenvios'
);