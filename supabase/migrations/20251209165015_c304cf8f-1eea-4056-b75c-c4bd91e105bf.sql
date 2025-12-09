-- Garantir que o bucket shipment-photos existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('shipment-photos', 'shipment-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Remover políticas existentes e criar uma totalmente aberta para upload
DROP POLICY IF EXISTS "Permitir upload de fotos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read of shipment-photos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir visualização de fotos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir delete de fotos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all shipment photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage shipment-photos" ON storage.objects;

-- Política totalmente aberta para INSERT no bucket shipment-photos
CREATE POLICY "Permitir upload de fotos aberto"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'shipment-photos');

-- Política aberta para SELECT
CREATE POLICY "Permitir visualização de fotos aberta"
ON storage.objects
FOR SELECT
USING (bucket_id = 'shipment-photos');

-- Política aberta para DELETE
CREATE POLICY "Permitir delete de fotos aberto"
ON storage.objects
FOR DELETE
USING (bucket_id = 'shipment-photos');