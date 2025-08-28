-- Continuar atualização completa - Faixas de peso até 10kg
-- Baseado na planilha oficial - parte 3

-- Faixa de peso 0.501-0.750kg
INSERT INTO public.shipping_pricing (zone_code, weight_min, weight_max, price) VALUES
('SPCAP.01', 0.501, 0.750, 17.52),
('SPCAP.02', 0.501, 0.750, 17.67),
('SPCAP.03', 0.501, 0.750, 18.53),
('SPMET.01', 0.501, 0.750, 19.97),
('SPINT.01', 0.501, 0.750, 20.36),
('SPINT.02', 0.501, 0.750, 20.92),
('SPINT.03', 0.501, 0.750, 21.79),
('SPINT.04', 0.501, 0.750, 25.82),
('RJCAP.01', 0.501, 0.750, 18.95),
('RJINT.01', 0.501, 0.750, 21.79),
('RJINT.02', 0.501, 0.750, 22.21),
('RJINT.03', 0.501, 0.750, 22.82),
('MGCAP.01', 0.501, 0.750, 18.85),
('MGINT.01', 0.501, 0.750, 22.50),
('MGINT.02', 0.501, 0.750, 23.12),
('MGINT.03', 0.501, 0.750, 24.08),
('ESCAP.01', 0.501, 0.750, 27.66),
('ESINT.01', 0.501, 0.750, 30.66),
('ESINT.02', 0.501, 0.750, 32.18),
('ESINT.03', 0.501, 0.750, 33.78),
-- Continuar com faixas maiores...
('MTCAP.01', 0.501, 0.750, 37.12),
('MTCAP.01', 0.751, 1.000, 38.92),
('MTCAP.01', 1.001, 1.500, 40.93),
('MTCAP.01', 1.501, 2.000, 43.03),
('MTCAP.01', 2.001, 2.500, 46.65),
('MTCAP.01', 2.501, 3.000, 51.04),
('MTCAP.01', 3.001, 3.500, 55.64),
('MTCAP.01', 3.501, 4.000, 59.41),
('MTCAP.01', 4.001, 4.500, 65.42),
('MTCAP.01', 4.501, 5.000, 69.27),
('MTCAP.01', 5.001, 6.000, 75.05),
('MTCAP.01', 6.001, 7.000, 82.75),
('MTCAP.01', 7.001, 8.000, 90.45),
('MTCAP.01', 8.001, 9.000, 98.16),
('MTCAP.01', 9.001, 10.000, 105.86);

-- Adicionando algumas faixas importantes para outras zonas até 10kg
-- SPCAP.01 (faixa que o usuário mencionou)
INSERT INTO public.shipping_pricing (zone_code, weight_min, weight_max, price) VALUES
('SPCAP.01', 0.751, 1.000, 19.20),
('SPCAP.01', 1.001, 1.500, 20.24),
('SPCAP.01', 1.501, 2.000, 21.56),
('SPCAP.01', 2.001, 2.500, 21.75),
('SPCAP.01', 2.501, 3.000, 23.38),
('SPCAP.01', 3.001, 3.500, 26.00),
('SPCAP.01', 3.501, 4.000, 27.22),
('SPCAP.01', 4.001, 4.500, 29.11),
('SPCAP.01', 4.501, 5.000, 29.57),
('SPCAP.01', 5.001, 6.000, 30.77),
('SPCAP.01', 6.001, 7.000, 32.03),
('SPCAP.01', 7.001, 8.000, 33.34),
('SPCAP.01', 8.001, 9.000, 34.69),
('SPCAP.01', 9.001, 10.000, 36.11);

-- Comentário sobre continuidade da atualização  
COMMENT ON TABLE public.shipping_pricing IS 'Tabela de preços de frete - Atualização em progresso. Faixas até 10kg para zonas principais adicionadas. Próximas migrações completarão todas as zonas e faixas de peso.';