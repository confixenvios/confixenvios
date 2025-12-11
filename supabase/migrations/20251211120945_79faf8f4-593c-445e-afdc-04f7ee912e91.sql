-- Limpar todos os arquivos dos buckets de remessas
DELETE FROM storage.objects WHERE bucket_id = 'shipment-photos';
DELETE FROM storage.objects WHERE bucket_id = 'shipment-audio';
DELETE FROM storage.objects WHERE bucket_id = 'shipping-labels';
DELETE FROM storage.objects WHERE bucket_id = 'shipment-signatures';