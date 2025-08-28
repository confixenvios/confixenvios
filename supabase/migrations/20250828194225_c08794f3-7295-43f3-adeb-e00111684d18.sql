-- Corrigir todos os prazos de entrega baseado na tabela oficial de prazos
-- Definindo prazos mais realistas e corretos por região

-- Zona SPCAP.01, SPCAP.02, SPCAP.03 (São Paulo Capital) - 1 dia padrão, expresso no mesmo dia
UPDATE public.shipping_zones 
SET delivery_days = 1, express_delivery_days = 1 
WHERE zone_code IN ('SPCAP.01', 'SPCAP.02', 'SPCAP.03');

-- Zona SPMET.01 (São Paulo Metropolitana) - 2 dias padrão, 1 dia expresso
UPDATE public.shipping_zones 
SET delivery_days = 2, express_delivery_days = 1 
WHERE zone_code = 'SPMET.01';

-- Zonas SPINT (São Paulo Interior) - 3 dias padrão, 2 dias expresso
UPDATE public.shipping_zones 
SET delivery_days = 3, express_delivery_days = 2 
WHERE zone_code IN ('SPINT.01', 'SPINT.02', 'SPINT.03', 'SPINT.04');

-- Zona RJCAP.01 (Rio de Janeiro Capital) - 2 dias padrão, 1 dia expresso
UPDATE public.shipping_zones 
SET delivery_days = 2, express_delivery_days = 1 
WHERE zone_code = 'RJCAP.01';

-- Zonas RJINT (Rio de Janeiro Interior) - 3 dias padrão, 2 dias expresso
UPDATE public.shipping_zones 
SET delivery_days = 3, express_delivery_days = 2 
WHERE zone_code IN ('RJINT.01', 'RJINT.02', 'RJINT.03');

-- Zona MGCAP.01 (Minas Gerais Capital) - 2 dias padrão, 1 dia expresso
UPDATE public.shipping_zones 
SET delivery_days = 2, express_delivery_days = 1 
WHERE zone_code = 'MGCAP.01';

-- Zonas MGINT (Minas Gerais Interior) - 3 dias padrão, 2 dias expresso
UPDATE public.shipping_zones 
SET delivery_days = 3, express_delivery_days = 2 
WHERE zone_code IN ('MGINT.01', 'MGINT.02', 'MGINT.03');

-- Zona GOCAP.01, GOCAP.02 (Goiás Capital - nossa origem) - entrega no mesmo dia
UPDATE public.shipping_zones 
SET delivery_days = 1, express_delivery_days = 1 
WHERE zone_code IN ('GOCAP.01', 'GOCAP.02');

-- Zona GOINT.01 (Goiás Interior) - 1 dia padrão, mesmo dia expresso
UPDATE public.shipping_zones 
SET delivery_days = 1, express_delivery_days = 1 
WHERE zone_code = 'GOINT.01';

-- Zona DFCAP.01 (Distrito Federal) - 1 dia padrão, mesmo dia expresso
UPDATE public.shipping_zones 
SET delivery_days = 1, express_delivery_days = 1 
WHERE zone_code = 'DFCAP.01';

-- Zona MTCAP.01 (Mato Grosso Capital) - 1 dia padrão, mesmo dia expresso
UPDATE public.shipping_zones 
SET delivery_days = 1, express_delivery_days = 1 
WHERE zone_code = 'MTCAP.01';

-- Zona MSCAP.01 (Mato Grosso do Sul Capital) - 2 dias padrão, 1 dia expresso
UPDATE public.shipping_zones 
SET delivery_days = 2, express_delivery_days = 1 
WHERE zone_code = 'MSCAP.01';

-- Zona MSINT.01 (Mato Grosso do Sul Interior) - 3 dias padrão, 2 dias expresso
UPDATE public.shipping_zones 
SET delivery_days = 3, express_delivery_days = 2 
WHERE zone_code = 'MSINT.01';

-- Demais capitais (Nordeste e Sul) - 3 dias padrão, 2 dias expresso
UPDATE public.shipping_zones 
SET delivery_days = 3, express_delivery_days = 2 
WHERE zone_code IN ('PRCAP.01', 'PRCAP.02', 'SCCAP.01', 'RSCAP.01', 'BACAP.01', 'PECAP.01', 'CECAP.01', 'MACAP.01', 'ALCAP.01', 'RNCAP.01', 'PBCAP.01', 'PICAP.01', 'SECAP.01', 'PACAP.01', 'TOCAP.01', 'ESCAP.01');

-- Demais interiores - 4 dias padrão, 3 dias expresso
UPDATE public.shipping_zones 
SET delivery_days = 4, express_delivery_days = 3 
WHERE zone_code IN ('PRINT.01', 'PRINT.02', 'PRINT.03', 'SCINT.01', 'SCINT.02', 'SCINT.03', 'RSINT.01', 'RSINT.02', 'RSINT.03', 'BAINT.01', 'BAINT.02', 'BAINT.03', 'PEINT.01', 'PEINT.02', 'PEINT.03', 'CEINT.01', 'ALINT.01', 'RNINT.01', 'PBINT.01', 'PBINT.02', 'PBINT.03', 'PAINT.01', 'TOINT.01', 'TOINT.02', 'ESINT.01', 'ESINT.02', 'ESINT.03');

-- Comentário sobre a correção de prazos
COMMENT ON COLUMN public.shipping_zones.delivery_days IS 'Prazo de entrega padrão corrigido baseado na distância de Aparecida de Goiânia-GO';
COMMENT ON COLUMN public.shipping_zones.express_delivery_days IS 'Prazo de entrega expressa corrigido baseado na distância de Aparecida de Goiânia-GO';