-- Atualizar webhook para URL de produção (remover 'test' da URL)
UPDATE integrations 
SET webhook_url = 'https://n8n.grupoconfix.com/webhook/confixenvios'
WHERE name = 'n8n' AND active = true;