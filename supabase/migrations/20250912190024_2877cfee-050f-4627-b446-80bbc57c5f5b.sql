-- Remover políticas restritivas e criar políticas mais permissivas para motoristas

-- Remover política muito restritiva
DROP POLICY IF EXISTS "Allow motorista occurrence insertions" ON public.shipment_occurrences;

-- Criar política mais ampla que permite inserção de ocorrências para qualquer motorista válido
CREATE POLICY "Motoristas ativos podem criar ocorrências" ON public.shipment_occurrences
FOR INSERT 
WITH CHECK (
  occurrence_type IN ('foto', 'audio') AND
  EXISTS (
    SELECT 1 FROM public.motoristas m 
    WHERE m.id = motorista_id AND m.status = 'ativo'
  )
);

-- Política para storage de fotos - permitir uploads para motoristas
INSERT INTO storage.objects (bucket_id, name, owner, metadata) VALUES ('shipment-photos', '.emptyFolderPlaceholder', null, '{}') ON CONFLICT DO NOTHING;

-- Criar políticas de storage para shipment-photos
INSERT INTO storage.policies (bucket_id, policy_name, definition) VALUES 
('shipment-photos', 'Motoristas podem fazer upload de fotos', 'bucket_id = ''shipment-photos''')
ON CONFLICT DO NOTHING;

-- Política para storage de áudios - permitir uploads para motoristas  
INSERT INTO storage.objects (bucket_id, name, owner, metadata) VALUES ('shipment-audio', '.emptyFolderPlaceholder', null, '{}') ON CONFLICT DO NOTHING;

-- Criar políticas de storage para shipment-audio
INSERT INTO storage.policies (bucket_id, policy_name, definition) VALUES 
('shipment-audio', 'Motoristas podem fazer upload de áudios', 'bucket_id = ''shipment-audio''')
ON CONFLICT DO NOTHING;

-- Política temporária mais permissiva para debug
CREATE POLICY "Inserção temporária permissiva para debug" ON public.shipment_occurrences
FOR INSERT
WITH CHECK (occurrence_type IN ('foto', 'audio'));

-- Comentário explicativo
COMMENT ON POLICY "Inserção temporária permissiva para debug" ON public.shipment_occurrences IS 
'Política temporária para permitir inserção de ocorrências durante debugging. Deve ser ajustada em produção.';