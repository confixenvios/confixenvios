-- Adicionar campo para especificar qual aba ler na planilha Google Sheets
ALTER TABLE public.pricing_tables 
ADD COLUMN sheet_name TEXT DEFAULT NULL;

-- Adicionar comentário para documentar o campo
COMMENT ON COLUMN public.pricing_tables.sheet_name IS 'Nome da aba/sheet específica para ler no Google Sheets. Se NULL, usa a primeira aba disponível.';