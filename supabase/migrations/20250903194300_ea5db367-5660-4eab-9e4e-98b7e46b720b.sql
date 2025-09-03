-- Criar tabela para salvar remetentes dos usuários
CREATE TABLE public.saved_senders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  document TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  cep TEXT NOT NULL,
  street TEXT NOT NULL,
  number TEXT NOT NULL,
  complement TEXT,
  neighborhood TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  reference TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.saved_senders ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para saved_senders
CREATE POLICY "Users can view own saved senders"
ON public.saved_senders
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own saved senders"
ON public.saved_senders
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved senders"
ON public.saved_senders
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved senders"
ON public.saved_senders
FOR DELETE
USING (auth.uid() = user_id);

-- Admins podem gerenciar todos os remetentes salvos
CREATE POLICY "Admins can manage all saved senders"
ON public.saved_senders
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_saved_senders_updated_at
BEFORE UPDATE ON public.saved_senders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índice para melhor performance
CREATE INDEX idx_saved_senders_user_id ON public.saved_senders(user_id);
CREATE INDEX idx_saved_senders_default ON public.saved_senders(user_id, is_default) WHERE is_default = true;