-- Criar tabela para gerenciar tabelas de preços das transportadoras
CREATE TABLE public.pricing_tables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  cnpj TEXT NOT NULL,
  company_branch_id UUID REFERENCES public.company_branches(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('upload', 'google_sheets')),
  file_url TEXT,
  google_sheets_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  validation_status TEXT DEFAULT 'pending' CHECK (validation_status IN ('pending', 'valid', 'invalid')),
  validation_errors JSONB,
  last_validation_at TIMESTAMP WITH TIME ZONE
);

-- Habilitar RLS
ALTER TABLE public.pricing_tables ENABLE ROW LEVEL SECURITY;

-- Política para admins
CREATE POLICY "Admins can manage all pricing tables" 
ON public.pricing_tables 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Adicionar coluna na tabela de remessas para rastrear qual tabela foi usada
ALTER TABLE public.shipments ADD COLUMN pricing_table_id UUID REFERENCES public.pricing_tables(id);
ALTER TABLE public.shipments ADD COLUMN pricing_table_name TEXT;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_pricing_tables_updated_at
BEFORE UPDATE ON public.pricing_tables
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_pricing_tables_cnpj ON public.pricing_tables(cnpj);
CREATE INDEX idx_pricing_tables_company_branch ON public.pricing_tables(company_branch_id);
CREATE INDEX idx_pricing_tables_active ON public.pricing_tables(is_active);
CREATE INDEX idx_shipments_pricing_table ON public.shipments(pricing_table_id);