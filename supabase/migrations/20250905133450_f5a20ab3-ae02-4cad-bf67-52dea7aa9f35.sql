-- Criar tabela para armazenar cotações temporárias antes do pagamento
CREATE TABLE IF NOT EXISTS public.temp_quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  external_id TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  
  -- Dados da cotação
  sender_data JSONB NOT NULL,
  recipient_data JSONB NOT NULL,
  package_data JSONB NOT NULL,
  quote_options JSONB NOT NULL,
  
  -- Metadados
  status TEXT NOT NULL DEFAULT 'pending_payment',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '2 hours'),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.temp_quotes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can manage their own temp quotes" 
ON public.temp_quotes 
FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Anonymous users with valid session can manage temp quotes" 
ON public.temp_quotes 
FOR ALL 
USING (
  user_id IS NULL 
  AND session_id IS NOT NULL 
  AND session_id = (validate_session_with_security_monitoring(
    ((current_setting('request.headers', true))::jsonb ->> 'x-session-token'),
    ((current_setting('request.headers', true))::jsonb ->> 'x-forwarded-for')
  ))::text
);

CREATE POLICY "System can access temp quotes for webhook processing" 
ON public.temp_quotes 
FOR SELECT 
USING (true);

-- Índices para performance
CREATE INDEX idx_temp_quotes_external_id ON public.temp_quotes(external_id);
CREATE INDEX idx_temp_quotes_expires_at ON public.temp_quotes(expires_at);
CREATE INDEX idx_temp_quotes_user_id ON public.temp_quotes(user_id);

-- Trigger para updated_at
CREATE TRIGGER update_temp_quotes_updated_at
    BEFORE UPDATE ON public.temp_quotes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Função para limpar cotações expiradas
CREATE OR REPLACE FUNCTION public.cleanup_expired_temp_quotes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.temp_quotes 
  WHERE expires_at < now();
  
  RAISE NOTICE 'Cleaned up expired temporary quotes';
END;
$$;