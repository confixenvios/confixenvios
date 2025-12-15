-- Criar bucket para fotos de entrega B2B
INSERT INTO storage.buckets (id, name, public)
VALUES ('shipment-photos', 'shipment-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas para o bucket de fotos
CREATE POLICY "Anyone can view shipment photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'shipment-photos');

CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'shipment-photos');

CREATE POLICY "Users can update their photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'shipment-photos');

CREATE POLICY "Users can delete their photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'shipment-photos');