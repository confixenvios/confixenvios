-- Criar tabela de clientes B2B
CREATE TABLE IF NOT EXISTS public.b2b_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  cnpj TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Endereço padrão de coleta (opcional)
  default_pickup_cep TEXT,
  default_pickup_street TEXT,
  default_pickup_number TEXT,
  default_pickup_complement TEXT,
  default_pickup_neighborhood TEXT,
  default_pickup_city TEXT,
  default_pickup_state TEXT
);

-- Criar tabela de remessas B2B
CREATE TABLE IF NOT EXISTS public.b2b_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  b2b_client_id UUID NOT NULL REFERENCES public.b2b_clients(id) ON DELETE CASCADE,
  tracking_code TEXT UNIQUE,
  
  -- Dados do destinatário
  recipient_name TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  recipient_cep TEXT NOT NULL,
  recipient_street TEXT NOT NULL,
  recipient_number TEXT NOT NULL,
  recipient_complement TEXT,
  recipient_neighborhood TEXT NOT NULL,
  recipient_city TEXT NOT NULL,
  recipient_state TEXT NOT NULL,
  
  -- Tipo de entrega
  delivery_type TEXT NOT NULL CHECK (delivery_type IN ('mesmo_dia', 'proximo_dia')),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'EM_TRANSITO', 'CONCLUIDA', 'CANCELADA')),
  
  -- Observações
  observations TEXT,
  
  -- Vinculação com shipment principal (se processado)
  shipment_id UUID REFERENCES public.shipments(id) ON DELETE SET NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Adicionar coluna tipo_cliente na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS tipo_cliente TEXT DEFAULT 'normal' CHECK (tipo_cliente IN ('normal', 'b2b_expresso'));

-- Adicionar coluna origem na tabela shipments
ALTER TABLE public.shipments
ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT 'cotacao_normal' CHECK (origem IN ('cotacao_normal', 'b2b_expresso'));

-- Enable RLS
ALTER TABLE public.b2b_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_shipments ENABLE ROW LEVEL SECURITY;

-- RLS Policies para b2b_clients
CREATE POLICY "Admins can manage all B2B clients"
ON public.b2b_clients
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "B2B clients can view own data"
ON public.b2b_clients
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "B2B clients can update own data"
ON public.b2b_clients
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS Policies para b2b_shipments
CREATE POLICY "Admins can manage all B2B shipments"
ON public.b2b_shipments
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "B2B clients can view own shipments"
ON public.b2b_shipments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.b2b_clients
    WHERE b2b_clients.id = b2b_shipments.b2b_client_id
    AND b2b_clients.user_id = auth.uid()
  )
);

CREATE POLICY "B2B clients can create own shipments"
ON public.b2b_shipments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.b2b_clients
    WHERE b2b_clients.id = b2b_shipments.b2b_client_id
    AND b2b_clients.user_id = auth.uid()
  )
);

-- Criar função para gerar tracking code B2B
CREATE OR REPLACE FUNCTION generate_b2b_tracking_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Gerar código no formato B2B-XXXXXXXX
    new_code := 'B2B-' || UPPER(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    
    -- Verificar se já existe
    SELECT EXISTS(
      SELECT 1 FROM public.b2b_shipments WHERE tracking_code = new_code
    ) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- Trigger para gerar tracking code automaticamente
CREATE OR REPLACE FUNCTION set_b2b_tracking_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.tracking_code IS NULL THEN
    NEW.tracking_code := generate_b2b_tracking_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER b2b_shipments_tracking_code
BEFORE INSERT ON public.b2b_shipments
FOR EACH ROW
EXECUTE FUNCTION set_b2b_tracking_code();

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_b2b_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER b2b_clients_updated_at
BEFORE UPDATE ON public.b2b_clients
FOR EACH ROW
EXECUTE FUNCTION update_b2b_updated_at();

CREATE TRIGGER b2b_shipments_updated_at
BEFORE UPDATE ON public.b2b_shipments
FOR EACH ROW
EXECUTE FUNCTION update_b2b_updated_at();

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_b2b_clients_user_id ON public.b2b_clients(user_id);
CREATE INDEX IF NOT EXISTS idx_b2b_clients_email ON public.b2b_clients(email);
CREATE INDEX IF NOT EXISTS idx_b2b_shipments_client_id ON public.b2b_shipments(b2b_client_id);
CREATE INDEX IF NOT EXISTS idx_b2b_shipments_tracking_code ON public.b2b_shipments(tracking_code);
CREATE INDEX IF NOT EXISTS idx_b2b_shipments_status ON public.b2b_shipments(status);
CREATE INDEX IF NOT EXISTS idx_b2b_shipments_created_at ON public.b2b_shipments(created_at);

-- Função para obter estatísticas do cliente B2B
CREATE OR REPLACE FUNCTION get_b2b_client_stats(client_id UUID)
RETURNS TABLE(
  total_shipments BIGINT,
  pending_shipments BIGINT,
  in_transit_shipments BIGINT,
  completed_shipments BIGINT,
  month_shipments BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_shipments,
    COUNT(*) FILTER (WHERE status = 'PENDENTE') as pending_shipments,
    COUNT(*) FILTER (WHERE status = 'EM_TRANSITO') as in_transit_shipments,
    COUNT(*) FILTER (WHERE status = 'CONCLUIDA') as completed_shipments,
    COUNT(*) FILTER (WHERE created_at >= date_trunc('month', now())) as month_shipments
  FROM public.b2b_shipments
  WHERE b2b_client_id = client_id;
END;
$$;