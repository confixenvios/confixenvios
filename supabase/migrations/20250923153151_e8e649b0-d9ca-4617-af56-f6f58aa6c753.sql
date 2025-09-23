-- Criar tabela para gerenciar API keys das empresas integradoras
CREATE TABLE public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  company_cnpj TEXT,
  api_key TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  usage_count INTEGER NOT NULL DEFAULT 0,
  rate_limit_per_hour INTEGER NOT NULL DEFAULT 1000,
  description TEXT
);

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso - apenas admins podem gerenciar API keys
CREATE POLICY "Admins can manage all API keys" 
ON public.api_keys 
FOR ALL
TO authenticated 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Criar tabela para logs de uso da API
CREATE TABLE public.api_usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id UUID NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  request_body JSONB,
  response_status INTEGER NOT NULL,
  response_body JSONB,
  ip_address TEXT,
  user_agent TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS para logs
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;

-- Política para logs - apenas admins podem ver
CREATE POLICY "Admins can view all API usage logs" 
ON public.api_usage_logs 
FOR SELECT
TO authenticated 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Permitir inserção do sistema (service role)
CREATE POLICY "System can insert API usage logs" 
ON public.api_usage_logs 
FOR INSERT
WITH CHECK (true);

-- Função para gerar API key segura
CREATE OR REPLACE FUNCTION public.generate_api_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_api_key TEXT;
BEGIN
  -- Gerar uma API key com formato: conf_live_[32 caracteres aleatórios]
  new_api_key := 'conf_live_' || encode(gen_random_bytes(24), 'base64');
  -- Remover caracteres especiais que podem causar problemas
  new_api_key := replace(replace(replace(new_api_key, '+', ''), '/', ''), '=', '');
  
  RETURN new_api_key;
END;
$$;

-- Função para validar API key
CREATE OR REPLACE FUNCTION public.validate_api_key(p_api_key TEXT)
RETURNS TABLE(
  key_id UUID,
  company_name TEXT,
  is_valid BOOLEAN,
  rate_limit_per_hour INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ak.id,
    ak.company_name,
    ak.is_active AND (ak.rate_limit_per_hour > COALESCE(
      (SELECT COUNT(*) FROM public.api_usage_logs 
       WHERE api_key_id = ak.id 
       AND created_at > (now() - interval '1 hour')), 0
    )) as is_valid,
    ak.rate_limit_per_hour
  FROM public.api_keys ak
  WHERE ak.api_key = p_api_key;
END;
$$;

-- Trigger para atualizar timestamp
CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_saved_recipients_updated_at();