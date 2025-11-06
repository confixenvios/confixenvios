-- Adicionar campo inscrição estadual para remetentes e destinatários
ALTER TABLE saved_senders 
ADD COLUMN inscricao_estadual TEXT;

ALTER TABLE saved_recipients 
ADD COLUMN inscricao_estadual TEXT;

-- Comentários para documentação
COMMENT ON COLUMN saved_senders.inscricao_estadual IS 'Inscrição Estadual para empresas (CNPJ)';
COMMENT ON COLUMN saved_recipients.inscricao_estadual IS 'Inscrição Estadual para empresas (CNPJ)';