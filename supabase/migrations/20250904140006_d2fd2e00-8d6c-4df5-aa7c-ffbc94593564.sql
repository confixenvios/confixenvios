-- Criar tabela de motoristas
CREATE TABLE public.motoristas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cpf TEXT NOT NULL UNIQUE,
  telefone TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  senha TEXT NOT NULL, -- senha hash para login
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.motoristas ENABLE ROW LEVEL SECURITY;

-- Policies para motoristas
CREATE POLICY "Admins can manage all motoristas" 
ON public.motoristas 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Motoristas can view own profile" 
ON public.motoristas 
FOR SELECT 
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Adicionar coluna motorista_id na tabela shipments
ALTER TABLE public.shipments 
ADD COLUMN motorista_id UUID REFERENCES public.motoristas(id);

-- Criar tabela de histórico de status
CREATE TABLE public.shipment_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  motorista_id UUID REFERENCES public.motoristas(id),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS para histórico
ALTER TABLE public.shipment_status_history ENABLE ROW LEVEL SECURITY;

-- Policies para histórico
CREATE POLICY "Admins can view all status history" 
ON public.shipment_status_history 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their shipment history" 
ON public.shipment_status_history 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.shipments s 
    WHERE s.id = shipment_id 
    AND s.user_id = auth.uid()
  )
);

CREATE POLICY "Motoristas can view and insert status for assigned shipments" 
ON public.shipment_status_history 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.shipments s 
    JOIN public.motoristas m ON s.motorista_id = m.id 
    WHERE s.id = shipment_id 
    AND m.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.shipments s 
    JOIN public.motoristas m ON s.motorista_id = m.id 
    WHERE s.id = shipment_id 
    AND m.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Trigger para atualizar updated_at nos motoristas
CREATE TRIGGER update_motoristas_updated_at
BEFORE UPDATE ON public.motoristas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Função para autenticar motorista
CREATE OR REPLACE FUNCTION public.authenticate_motorista(input_email TEXT, input_senha TEXT)
RETURNS TABLE(motorista_id UUID, nome TEXT, status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT m.id, m.nome, m.status
  FROM public.motoristas m
  WHERE m.email = input_email 
    AND m.senha = crypt(input_senha, m.senha)
    AND m.status = 'ativo';
END;
$$;