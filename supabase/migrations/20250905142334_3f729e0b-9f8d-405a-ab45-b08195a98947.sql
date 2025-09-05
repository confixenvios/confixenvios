-- Atualizar todos os tracking codes existentes de TRK- para ID
UPDATE public.shipments 
SET tracking_code = 'ID' || SUBSTRING(tracking_code FROM 5)
WHERE tracking_code IS NOT NULL 
  AND tracking_code LIKE 'TRK-%';

-- Verificar se não há duplicatas após a conversão
-- Se houver duplicatas, adicionar um sufixo único
UPDATE public.shipments 
SET tracking_code = tracking_code || '_' || SUBSTRING(id::text FROM 1 FOR 4)
WHERE tracking_code IN (
  SELECT tracking_code 
  FROM public.shipments 
  WHERE tracking_code IS NOT NULL
  GROUP BY tracking_code 
  HAVING COUNT(*) > 1
);