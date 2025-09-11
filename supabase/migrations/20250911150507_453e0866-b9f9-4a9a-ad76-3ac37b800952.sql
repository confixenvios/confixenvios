-- Tornar o campo CNPJ opcional na tabela pricing_tables
ALTER TABLE public.pricing_tables ALTER COLUMN cnpj DROP NOT NULL;

-- Atualizar registros existentes com CNPJ vazio para NULL
UPDATE public.pricing_tables SET cnpj = NULL WHERE cnpj = '' OR cnpj = '00000000000000';