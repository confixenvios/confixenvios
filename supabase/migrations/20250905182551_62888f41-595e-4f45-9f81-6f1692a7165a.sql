-- Adicionar campo para tipo de documento na tabela shipments
ALTER TABLE public.shipments ADD COLUMN document_type text DEFAULT 'declaracao_conteudo';

-- Adicionar comentário para documentar o campo
COMMENT ON COLUMN public.shipments.document_type IS 'Tipo de documento fiscal: declaracao_conteudo ou nota_fiscal_eletronica';

-- Expandir quote_data para incluir mais detalhes dos formulários
-- (O JSONB já é flexível, mas vamos documentar a estrutura esperada)
COMMENT ON COLUMN public.shipments.quote_data IS 'Dados completos da cotação incluindo: dados originais do formulário, opções selecionadas, preços, dados de mercadoria, etc.';