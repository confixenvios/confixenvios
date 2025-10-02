-- Adicionar campo para tipo de envio na tabela b2b_shipments
ALTER TABLE public.b2b_shipments
ADD COLUMN IF NOT EXISTS package_type text;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_b2b_shipments_package_type 
ON public.b2b_shipments(package_type);

COMMENT ON COLUMN public.b2b_shipments.package_type IS 'Tipo de envio: envelope, documento, caixa_pequena, caixa_media, caixa_grande, peca, eletronico, medicamento, fragil';