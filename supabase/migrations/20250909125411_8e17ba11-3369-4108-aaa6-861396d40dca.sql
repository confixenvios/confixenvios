-- Criar tabela para filiais do embarcador
CREATE TABLE public.company_branches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  cnpj TEXT NOT NULL UNIQUE,
  fantasy_name TEXT,
  email TEXT,
  phone TEXT,
  cep TEXT NOT NULL,
  street TEXT NOT NULL,
  number TEXT NOT NULL,
  complement TEXT,
  neighborhood TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  is_main_branch BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar RLS
ALTER TABLE public.company_branches ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - apenas admins podem gerenciar filiais
CREATE POLICY "Admins can manage all company branches"
ON public.company_branches
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_company_branches_updated_at
  BEFORE UPDATE ON public.company_branches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir filial principal da Confix Envios como exemplo
INSERT INTO public.company_branches (
  name,
  cnpj,
  fantasy_name,
  email,
  phone,
  cep,
  street,
  number,
  neighborhood,
  city,
  state,
  is_main_branch,
  active
) VALUES (
  'Confix Envios Ltda',
  '00.000.000/0001-00',
  'Confix Envios',
  'grupoconfix@gmail.com',
  '(11) 99999-9999',
  '00000-000',
  'Rua Principal',
  '123',
  'Centro',
  'São Paulo',
  'SP',
  true,
  true
);