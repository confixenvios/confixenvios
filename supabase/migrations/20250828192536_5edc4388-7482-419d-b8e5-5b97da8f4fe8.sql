-- Atualizar prazos de entrega baseados na tabela oficial
-- Corrigir os prazos para serem assertivos com a planilha

-- Zona SPCAP.01 (São Paulo Capital) - Prazo padrão: 3 dias, Expresso: 1 dia
UPDATE public.shipping_zones 
SET delivery_days = 3, express_delivery_days = 1 
WHERE zone_code = 'SPCAP.01';

-- Zona SPCAP.02 (São Paulo Capital 2)
UPDATE public.shipping_zones 
SET delivery_days = 3, express_delivery_days = 1 
WHERE zone_code = 'SPCAP.02';

-- Zona SPCAP.03 (São Paulo Capital 3)
UPDATE public.shipping_zones 
SET delivery_days = 3, express_delivery_days = 1 
WHERE zone_code = 'SPCAP.03';

-- Zona RJCAP.01 (Rio de Janeiro Capital) - Prazo padrão: 4 dias, Expresso: 2 dias  
UPDATE public.shipping_zones 
SET delivery_days = 4, express_delivery_days = 2 
WHERE zone_code = 'RJCAP.01';

-- Zona MGCAP.01 (Minas Gerais Capital) - Prazo padrão: 4 dias, Expresso: 2 dias
UPDATE public.shipping_zones 
SET delivery_days = 4, express_delivery_days = 2 
WHERE zone_code = 'MGCAP.01';

-- Zonas Interior SP - Prazo padrão: 5 dias, Expresso: 3 dias
UPDATE public.shipping_zones 
SET delivery_days = 5, express_delivery_days = 3 
WHERE zone_code IN ('SPMET.01', 'SPINT.01', 'SPINT.02', 'SPINT.03', 'SPINT.04');

-- Zonas Interior RJ - Prazo padrão: 6 dias, Expresso: 4 dias
UPDATE public.shipping_zones 
SET delivery_days = 6, express_delivery_days = 4 
WHERE zone_code IN ('RJINT.01', 'RJINT.02', 'RJINT.03');

-- Zonas Interior MG - Prazo padrão: 6 dias, Expresso: 4 dias
UPDATE public.shipping_zones 
SET delivery_days = 6, express_delivery_days = 4 
WHERE zone_code IN ('MGINT.01', 'MGINT.02', 'MGINT.03');

-- Outras capitais - Prazo padrão: 5 dias, Expresso: 3 dias
UPDATE public.shipping_zones 
SET delivery_days = 5, express_delivery_days = 3 
WHERE zone_code IN ('ESCAP.01', 'PRCAP.01', 'PRCAP.02', 'SCCAP.01', 'RSCAP.01', 'DFCAP.01', 'GOCAP.01', 'GOCAP.02', 'MSCAP.01', 'MTCAP.01', 'BACAP.01', 'PECAP.01', 'CECAP.01', 'MACAP.01', 'ALCAP.01', 'RNCAP.01', 'PBCAP.01', 'PICAP.01', 'SECAP.01', 'PACAP.01', 'TOCAP.01');

-- Outros interiores - Prazo padrão: 7 dias, Expresso: 5 dias
UPDATE public.shipping_zones 
SET delivery_days = 7, express_delivery_days = 5 
WHERE zone_code IN ('ESINT.01', 'ESINT.02', 'ESINT.03', 'PRINT.01', 'PRINT.02', 'PRINT.03', 'SCINT.01', 'SCINT.02', 'SCINT.03', 'RSINT.01', 'RSINT.02', 'RSINT.03', 'GOINT.01', 'MSINT.01', 'BAINT.01', 'BAINT.02', 'BAINT.03', 'PEINT.01', 'PEINT.02', 'PEINT.03', 'CEINT.01', 'ALINT.01', 'RNINT.01', 'PBINT.01', 'PBINT.02', 'PBINT.03', 'PAINT.01', 'TOINT.01', 'TOINT.02');

-- Comentário sobre a atualização
COMMENT ON COLUMN public.shipping_zones.delivery_days IS 'Prazo de entrega padrão em dias úteis, baseado na tabela oficial de prazos por região';
COMMENT ON COLUMN public.shipping_zones.express_delivery_days IS 'Prazo de entrega expressa em dias úteis, baseado na tabela oficial de prazos por região';