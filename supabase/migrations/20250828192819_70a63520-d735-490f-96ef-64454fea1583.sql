-- Atualizar todos os prazos baseado na lógica de distância e proximidade da origem (Aparecida de Goiânia-GO)
-- Origem: Aparecida de Goiânia, GO (GOCAP.02)

-- GOIÁS (mais próximos da origem)
UPDATE public.shipping_zones SET delivery_days = 1, express_delivery_days = 1 WHERE zone_code = 'GOCAP.01'; -- Goiânia Capital
UPDATE public.shipping_zones SET delivery_days = 1, express_delivery_days = 1 WHERE zone_code = 'GOCAP.02'; -- Aparecida de Goiânia  
UPDATE public.shipping_zones SET delivery_days = 2, express_delivery_days = 1 WHERE zone_code = 'GOINT.01'; -- Interior de Goiás

-- DISTRITO FEDERAL (próximo)
UPDATE public.shipping_zones SET delivery_days = 2, express_delivery_days = 1 WHERE zone_code = 'DFCAP.01'; -- Brasília

-- MATO GROSSO (estados vizinhos)
UPDATE public.shipping_zones SET delivery_days = 2, express_delivery_days = 1 WHERE zone_code = 'MTCAP.01'; -- Cuiabá
UPDATE public.shipping_zones SET delivery_days = 3, express_delivery_days = 2 WHERE zone_code = 'MSCAP.01'; -- Campo Grande
UPDATE public.shipping_zones SET delivery_days = 4, express_delivery_days = 2 WHERE zone_code = 'MSINT.01'; -- Interior MS

-- MINAS GERAIS (relativamente próximo)
UPDATE public.shipping_zones SET delivery_days = 3, express_delivery_days = 2 WHERE zone_code = 'MGCAP.01'; -- Belo Horizonte
UPDATE public.shipping_zones SET delivery_days = 4, express_delivery_days = 2 WHERE zone_code = 'MGINT.01'; -- Interior MG 1
UPDATE public.shipping_zones SET delivery_days = 4, express_delivery_days = 3 WHERE zone_code = 'MGINT.02'; -- Interior MG 2  
UPDATE public.shipping_zones SET delivery_days = 5, express_delivery_days = 3 WHERE zone_code = 'MGINT.03'; -- Interior MG 3

-- SÃO PAULO (conforme informado pelo usuário)
UPDATE public.shipping_zones SET delivery_days = 3, express_delivery_days = 2 WHERE zone_code = 'SPCAP.01'; -- SP Capital - conforme usuário informou
UPDATE public.shipping_zones SET delivery_days = 3, express_delivery_days = 2 WHERE zone_code = 'SPCAP.02'; -- SP Capital 2
UPDATE public.shipping_zones SET delivery_days = 3, express_delivery_days = 2 WHERE zone_code = 'SPCAP.03'; -- SP Capital 3
UPDATE public.shipping_zones SET delivery_days = 3, express_delivery_days = 2 WHERE zone_code = 'SPMET.01'; -- SP Metropolitana
UPDATE public.shipping_zones SET delivery_days = 4, express_delivery_days = 3 WHERE zone_code = 'SPINT.01'; -- SP Interior 1
UPDATE public.shipping_zones SET delivery_days = 4, express_delivery_days = 3 WHERE zone_code = 'SPINT.02'; -- SP Interior 2
UPDATE public.shipping_zones SET delivery_days = 5, express_delivery_days = 3 WHERE zone_code = 'SPINT.03'; -- SP Interior 3
UPDATE public.shipping_zones SET delivery_days = 5, express_delivery_days = 4 WHERE zone_code = 'SPINT.04'; -- SP Interior 4

-- RIO DE JANEIRO  
UPDATE public.shipping_zones SET delivery_days = 4, express_delivery_days = 3 WHERE zone_code = 'RJCAP.01'; -- Rio Capital
UPDATE public.shipping_zones SET delivery_days = 5, express_delivery_days = 3 WHERE zone_code = 'RJINT.01'; -- RJ Interior 1
UPDATE public.shipping_zones SET delivery_days = 5, express_delivery_days = 4 WHERE zone_code = 'RJINT.02'; -- RJ Interior 2
UPDATE public.shipping_zones SET delivery_days = 6, express_delivery_days = 4 WHERE zone_code = 'RJINT.03'; -- RJ Interior 3

-- BAHIA
UPDATE public.shipping_zones SET delivery_days = 5, express_delivery_days = 3 WHERE zone_code = 'BACAP.01'; -- Salvador
UPDATE public.shipping_zones SET delivery_days = 6, express_delivery_days = 4 WHERE zone_code = 'BAINT.01'; -- BA Interior 1
UPDATE public.shipping_zones SET delivery_days = 7, express_delivery_days = 5 WHERE zone_code = 'BAINT.02'; -- BA Interior 2
UPDATE public.shipping_zones SET delivery_days = 8, express_delivery_days = 6 WHERE zone_code = 'BAINT.03'; -- BA Interior 3

-- SUL (mais distantes)
UPDATE public.shipping_zones SET delivery_days = 4, express_delivery_days = 3 WHERE zone_code = 'PRCAP.01'; -- Curitiba
UPDATE public.shipping_zones SET delivery_days = 4, express_delivery_days = 3 WHERE zone_code = 'PRCAP.02'; -- Curitiba 2
UPDATE public.shipping_zones SET delivery_days = 5, express_delivery_days = 4 WHERE zone_code = 'PRINT.01'; -- PR Interior 1
UPDATE public.shipping_zones SET delivery_days = 6, express_delivery_days = 4 WHERE zone_code = 'PRINT.02'; -- PR Interior 2
UPDATE public.shipping_zones SET delivery_days = 7, express_delivery_days = 5 WHERE zone_code = 'PRINT.03'; -- PR Interior 3

UPDATE public.shipping_zones SET delivery_days = 5, express_delivery_days = 4 WHERE zone_code = 'SCCAP.01'; -- Florianópolis
UPDATE public.shipping_zones SET delivery_days = 6, express_delivery_days = 4 WHERE zone_code = 'SCINT.01'; -- SC Interior 1
UPDATE public.shipping_zones SET delivery_days = 7, express_delivery_days = 5 WHERE zone_code = 'SCINT.02'; -- SC Interior 2
UPDATE public.shipping_zones SET delivery_days = 8, express_delivery_days = 6 WHERE zone_code = 'SCINT.03'; -- SC Interior 3

UPDATE public.shipping_zones SET delivery_days = 5, express_delivery_days = 4 WHERE zone_code = 'RSCAP.01'; -- Porto Alegre
UPDATE public.shipping_zones SET delivery_days = 6, express_delivery_days = 5 WHERE zone_code = 'RSINT.01'; -- RS Interior 1
UPDATE public.shipping_zones SET delivery_days = 7, express_delivery_days = 5 WHERE zone_code = 'RSINT.02'; -- RS Interior 2
UPDATE public.shipping_zones SET delivery_days = 8, express_delivery_days = 6 WHERE zone_code = 'RSINT.03'; -- RS Interior 3

-- ESPÍRITO SANTO
UPDATE public.shipping_zones SET delivery_days = 4, express_delivery_days = 3 WHERE zone_code = 'ESCAP.01'; -- Vitória
UPDATE public.shipping_zones SET delivery_days = 5, express_delivery_days = 4 WHERE zone_code = 'ESINT.01'; -- ES Interior 1
UPDATE public.shipping_zones SET delivery_days = 6, express_delivery_days = 4 WHERE zone_code = 'ESINT.02'; -- ES Interior 2
UPDATE public.shipping_zones SET delivery_days = 7, express_delivery_days = 5 WHERE zone_code = 'ESINT.03'; -- ES Interior 3

-- NORDESTE (mais distantes)
UPDATE public.shipping_zones SET delivery_days = 6, express_delivery_days = 4 WHERE zone_code = 'PECAP.01'; -- Recife
UPDATE public.shipping_zones SET delivery_days = 7, express_delivery_days = 5 WHERE zone_code = 'PEINT.01'; -- PE Interior 1  
UPDATE public.shipping_zones SET delivery_days = 8, express_delivery_days = 6 WHERE zone_code = 'PEINT.02'; -- PE Interior 2
UPDATE public.shipping_zones SET delivery_days = 9, express_delivery_days = 7 WHERE zone_code = 'PEINT.03'; -- PE Interior 3

UPDATE public.shipping_zones SET delivery_days = 6, express_delivery_days = 5 WHERE zone_code = 'CECAP.01'; -- Fortaleza
UPDATE public.shipping_zones SET delivery_days = 8, express_delivery_days = 6 WHERE zone_code = 'CEINT.01'; -- CE Interior

UPDATE public.shipping_zones SET delivery_days = 7, express_delivery_days = 5 WHERE zone_code = 'MACAP.01'; -- São Luís
UPDATE public.shipping_zones SET delivery_days = 7, express_delivery_days = 5 WHERE zone_code = 'ALCAP.01'; -- Maceió
UPDATE public.shipping_zones SET delivery_days = 8, express_delivery_days = 6 WHERE zone_code = 'ALINT.01'; -- AL Interior
UPDATE public.shipping_zones SET delivery_days = 7, express_delivery_days = 5 WHERE zone_code = 'RNCAP.01'; -- Natal
UPDATE public.shipping_zones SET delivery_days = 8, express_delivery_days = 6 WHERE zone_code = 'RNINT.01'; -- RN Interior
UPDATE public.shipping_zones SET delivery_days = 7, express_delivery_days = 5 WHERE zone_code = 'PBCAP.01'; -- João Pessoa
UPDATE public.shipping_zones SET delivery_days = 8, express_delivery_days = 6 WHERE zone_code = 'PBINT.01'; -- PB Interior 1
UPDATE public.shipping_zones SET delivery_days = 9, express_delivery_days = 7 WHERE zone_code = 'PBINT.02'; -- PB Interior 2
UPDATE public.shipping_zones SET delivery_days = 10, express_delivery_days = 8 WHERE zone_code = 'PBINT.03'; -- PB Interior 3

UPDATE public.shipping_zones SET delivery_days = 8, express_delivery_days = 6 WHERE zone_code = 'PICAP.01'; -- Teresina
UPDATE public.shipping_zones SET delivery_days = 8, express_delivery_days = 6 WHERE zone_code = 'SECAP.01'; -- Aracaju

-- NORTE (mais distantes)
UPDATE public.shipping_zones SET delivery_days = 7, express_delivery_days = 5 WHERE zone_code = 'PACAP.01'; -- Belém
UPDATE public.shipping_zones SET delivery_days = 9, express_delivery_days = 7 WHERE zone_code = 'PAINT.01'; -- PA Interior
UPDATE public.shipping_zones SET delivery_days = 6, express_delivery_days = 4 WHERE zone_code = 'TOCAP.01'; -- Palmas
UPDATE public.shipping_zones SET delivery_days = 7, express_delivery_days = 5 WHERE zone_code = 'TOINT.01'; -- TO Interior 1
UPDATE public.shipping_zones SET delivery_days = 8, express_delivery_days = 6 WHERE zone_code = 'TOINT.02'; -- TO Interior 2