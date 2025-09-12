-- Verificar e criar buckets de storage necessários
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('shipment-photos', 'shipment-photos', true),
  ('shipment-audio', 'shipment-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas para bucket de fotos
INSERT INTO storage.policies (id, bucket_id, command, target, using, with_check)
VALUES 
  ('shipment-photos-public-read', 'shipment-photos', 'SELECT', 'objects', 'true', NULL),
  ('shipment-photos-insert', 'shipment-photos', 'INSERT', 'objects', 'true', 'true'),
  ('shipment-audio-public-read', 'shipment-audio', 'SELECT', 'objects', 'true', NULL),
  ('shipment-audio-insert', 'shipment-audio', 'INSERT', 'objects', 'true', 'true')
ON CONFLICT (id) DO NOTHING;