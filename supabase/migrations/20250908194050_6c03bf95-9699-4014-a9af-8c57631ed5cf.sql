-- Criar tabela separada para ocorrências (fotos e áudio)
CREATE TABLE public.shipment_occurrences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID NOT NULL,
  motorista_id UUID,
  occurrence_type TEXT NOT NULL CHECK (occurrence_type IN ('foto', 'audio')),
  file_url TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Simplificar tabela de status history para focar apenas em mudanças de status
ALTER TABLE public.shipment_status_history 
DROP COLUMN IF EXISTS photos_urls,
DROP COLUMN IF EXISTS audio_url,
DROP COLUMN IF EXISTS signature_url;

-- Atualizar para ter apenas campos de status
ALTER TABLE public.shipment_status_history 
ADD COLUMN IF NOT EXISTS status_description TEXT;

-- Comentário para clarificar
COMMENT ON TABLE public.shipment_occurrences IS 'Tabela para armazenar ocorrências (fotos e áudios) das remessas';
COMMENT ON TABLE public.shipment_status_history IS 'Tabela para armazenar apenas mudanças de status das remessas';

-- Habilitar RLS na nova tabela
ALTER TABLE public.shipment_occurrences ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para shipment_occurrences
CREATE POLICY "Admins can manage all occurrences" 
ON public.shipment_occurrences 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Motoristas podem criar ocorrências de suas remessas" 
ON public.shipment_occurrences 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM motoristas m 
    WHERE m.id = shipment_occurrences.motorista_id 
    AND m.status = 'ativo'
  ) AND EXISTS (
    SELECT 1 FROM shipments s 
    WHERE s.id = shipment_occurrences.shipment_id 
    AND s.motorista_id = shipment_occurrences.motorista_id
  )
);

CREATE POLICY "Users can view occurrences of their shipments" 
ON public.shipment_occurrences 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM shipments s 
    WHERE s.id = shipment_occurrences.shipment_id 
    AND s.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all occurrences" 
ON public.shipment_occurrences 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));