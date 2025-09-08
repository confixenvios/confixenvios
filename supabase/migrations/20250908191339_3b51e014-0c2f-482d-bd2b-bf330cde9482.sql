-- Criar políticas para o bucket shipment-audio
-- Permitir que usuários autenticados façam upload de áudio
CREATE POLICY "Motoristas podem fazer upload de áudio de remessa" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'shipment-audio' AND 
  auth.uid() IS NOT NULL
);

-- Permitir que usuários autenticados vejam seus próprios áudios
CREATE POLICY "Motoristas podem ver áudios de suas remessas" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'shipment-audio' AND 
  auth.uid() IS NOT NULL
);

-- Permitir que administradores vejam todos os áudios
CREATE POLICY "Administradores podem ver todos os áudios de remessa" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'shipment-audio' AND 
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);