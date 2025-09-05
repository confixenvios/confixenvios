-- Criar buckets para fotos e assinaturas do motorista
INSERT INTO storage.buckets (id, name, public) 
VALUES ('shipment-photos', 'shipment-photos', false);

INSERT INTO storage.buckets (id, name, public) 
VALUES ('shipment-signatures', 'shipment-signatures', false);

-- Políticas para fotos de remessas
CREATE POLICY "Admins can view all shipment photos" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'shipment-photos' AND 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Motoristas can upload shipment photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'shipment-photos' AND 
  auth.uid() IS NOT NULL
);

CREATE POLICY "Motoristas can view own uploaded photos" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'shipment-photos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Políticas para assinaturas de remessas
CREATE POLICY "Admins can view all shipment signatures" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'shipment-signatures' AND 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Motoristas can upload shipment signatures" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'shipment-signatures' AND 
  auth.uid() IS NOT NULL
);

CREATE POLICY "Motoristas can view own uploaded signatures" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'shipment-signatures' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Adicionar campos para fotos e assinaturas no histórico de status
ALTER TABLE public.shipment_status_history 
ADD COLUMN photos_urls TEXT[],
ADD COLUMN signature_url TEXT,
ADD COLUMN occurrence_data JSONB;