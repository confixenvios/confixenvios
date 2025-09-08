-- Remover políticas antigas que não funcionam com motoristas
DROP POLICY IF EXISTS "Allow motoristas to upload audio files" ON storage.objects;
DROP POLICY IF EXISTS "Allow motoristas to view their own audio files" ON storage.objects;
DROP POLICY IF EXISTS "Motoristas podem fazer upload de áudio de remessa" ON storage.objects;
DROP POLICY IF EXISTS "Motoristas podem ver áudios de suas remessas" ON storage.objects;

-- Criar políticas que funcionam para o sistema de motoristas
-- Permitir upload de áudio para qualquer usuário (motoristas não têm auth.uid())
CREATE POLICY "Permitir upload de áudio para shipment-audio" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'shipment-audio');

-- Permitir visualização de áudios para usuários autenticados e sistema público
CREATE POLICY "Permitir visualização de áudios do bucket shipment-audio" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'shipment-audio');

-- Permitir que administradores vejam e gerenciem todos os áudios
CREATE POLICY "Administradores podem gerenciar áudios" 
ON storage.objects 
FOR ALL 
USING (
  bucket_id = 'shipment-audio' AND 
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Tornar o bucket público para facilitar o acesso
UPDATE storage.buckets SET public = true WHERE id = 'shipment-audio';