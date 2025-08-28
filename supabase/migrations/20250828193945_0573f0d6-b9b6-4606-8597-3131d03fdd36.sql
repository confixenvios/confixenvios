-- Completar dados para principais zonas até 10kg
-- Baseado na planilha oficial - dados essenciais

-- GOCAP.01 - Goiás Capital (nossa origem)
INSERT INTO public.shipping_pricing (zone_code, weight_min, weight_max, price) VALUES
('GOCAP.01', 0.501, 0.750, 18.00),
('GOCAP.01', 0.751, 1.000, 18.00),
('GOCAP.01', 1.001, 1.500, 18.00),
('GOCAP.01', 1.501, 2.000, 18.00),
('GOCAP.01', 2.001, 2.500, 18.00),
('GOCAP.01', 2.501, 3.000, 18.00),
('GOCAP.01', 3.001, 3.500, 18.00),
('GOCAP.01', 3.501, 4.000, 18.00),
('GOCAP.01', 4.001, 4.500, 18.00),
('GOCAP.01', 4.501, 5.000, 18.00),
('GOCAP.01', 5.001, 6.000, 18.00),
('GOCAP.01', 6.001, 7.000, 18.00),
('GOCAP.01', 7.001, 8.000, 18.00),
('GOCAP.01', 8.001, 9.000, 18.00),
('GOCAP.01', 9.001, 10.000, 18.00),

-- GOCAP.02 - Goiás Capital 2
('GOCAP.02', 0.501, 0.750, 18.00),
('GOCAP.02', 0.751, 1.000, 18.00),
('GOCAP.02', 1.001, 1.500, 18.00),
('GOCAP.02', 1.501, 2.000, 18.00),
('GOCAP.02', 2.001, 2.500, 18.00),
('GOCAP.02', 2.501, 3.000, 18.00),
('GOCAP.02', 3.001, 3.500, 18.00),
('GOCAP.02', 3.501, 4.000, 18.00),
('GOCAP.02', 4.001, 4.500, 18.00),
('GOCAP.02', 4.501, 5.000, 18.00),
('GOCAP.02', 5.001, 6.000, 18.00),
('GOCAP.02', 6.001, 7.000, 18.00),
('GOCAP.02', 7.001, 8.000, 18.00),
('GOCAP.02', 8.001, 9.000, 18.00),
('GOCAP.02', 9.001, 10.000, 18.00),

-- RJCAP.01 - Rio de Janeiro Capital
('RJCAP.01', 0.751, 1.000, 20.75),
('RJCAP.01', 1.001, 1.500, 21.89),
('RJCAP.01', 1.501, 2.000, 23.30),
('RJCAP.01', 2.001, 2.500, 23.51),
('RJCAP.01', 2.501, 3.000, 25.21),
('RJCAP.01', 3.001, 3.500, 29.20),
('RJCAP.01', 3.501, 4.000, 30.56),
('RJCAP.01', 4.001, 4.500, 32.68),
('RJCAP.01', 4.501, 5.000, 33.19),
('RJCAP.01', 5.001, 6.000, 34.54),
('RJCAP.01', 6.001, 7.000, 35.95),
('RJCAP.01', 7.001, 8.000, 37.41),
('RJCAP.01', 8.001, 9.000, 42.20),
('RJCAP.01', 9.001, 10.000, 40.51),

-- MGCAP.01 - Minas Gerais Capital
('MGCAP.01', 0.751, 1.000, 20.65),
('MGCAP.01', 1.001, 1.500, 21.78),
('MGCAP.01', 1.501, 2.000, 23.19),
('MGCAP.01', 2.001, 2.500, 23.39),
('MGCAP.01', 2.501, 3.000, 25.08),
('MGCAP.01', 3.001, 3.500, 28.75),
('MGCAP.01', 3.501, 4.000, 30.18),
('MGCAP.01', 4.001, 4.500, 32.26),
('MGCAP.01', 4.501, 5.000, 33.72),
('MGCAP.01', 5.001, 6.000, 35.90),
('MGCAP.01', 6.001, 7.000, 38.81),
('MGCAP.01', 7.001, 8.000, 41.71),
('MGCAP.01', 8.001, 9.000, 44.62),
('MGCAP.01', 9.001, 10.000, 47.53);

-- Comentário sobre dados principais completados
COMMENT ON TABLE public.shipping_pricing IS 'Tabela de preços atualizada com dados das principais zonas até 10kg: SPCAP.01, MTCAP.01, RJCAP.01, MGCAP.01, GOCAP.01/02. Sistema funcional para cálculos principais.';