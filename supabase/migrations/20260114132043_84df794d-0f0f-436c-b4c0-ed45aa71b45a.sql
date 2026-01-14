-- Inserir integração do webhook de CT-e (Webmania)
INSERT INTO public.integrations (name, webhook_url, active, secret_key)
VALUES (
  'Webmania CT-e Webhook',
  'https://webhook.grupoconfix.com/webhook/cd6d1d7d-b6a0-483d-8314-662e54dda78b',
  true,
  NULL
)
ON CONFLICT DO NOTHING;