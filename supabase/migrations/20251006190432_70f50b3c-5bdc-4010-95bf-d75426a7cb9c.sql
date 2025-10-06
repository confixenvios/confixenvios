-- Atualizar valores padrão de Ad Valorem e GRIS para 0.3% (0.003 em decimal)
UPDATE public.pricing_tables
SET 
  ad_valorem_percentage = COALESCE(ad_valorem_percentage, 0.003),
  gris_percentage = COALESCE(gris_percentage, 0.003)
WHERE ad_valorem_percentage IS NULL OR gris_percentage IS NULL;

-- Atualizar valores existentes que estejam incorretos (0.30 deveria ser 0.003)
UPDATE public.pricing_tables
SET 
  ad_valorem_percentage = 0.003,
  gris_percentage = 0.003
WHERE ad_valorem_percentage = 0.30 OR gris_percentage = 0.30;
