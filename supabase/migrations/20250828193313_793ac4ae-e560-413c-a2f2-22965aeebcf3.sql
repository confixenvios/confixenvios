-- Adicionar dados de preços faltantes para zona MTCAP.01
-- Baseado na planilha oficial de preços por faixa de peso

-- Zona MTCAP.01 já tem dados até 0.350kg, vamos adicionar o restante

INSERT INTO public.shipping_pricing (zone_code, weight_min, weight_max, price) VALUES
-- Faixas de peso baseadas na planilha oficial para MTCAP.01
('MTCAP.01', 0.351, 0.500, 26.33),
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
('MTCAP.01', 9.001, 10.000, 105.86),
('MTCAP.01', 10.001, 11.000, 116.77),
('MTCAP.01', 11.001, 12.000, 124.47),
('MTCAP.01', 12.001, 13.000, 132.18),
('MTCAP.01', 13.001, 14.000, 139.88),
('MTCAP.01', 14.001, 15.000, 147.58),
('MTCAP.01', 15.001, 16.000, 155.37),
('MTCAP.01', 16.001, 17.000, 163.07),
('MTCAP.01', 17.001, 18.000, 170.77),
('MTCAP.01', 18.001, 19.000, 178.48),
('MTCAP.01', 19.001, 20.000, 186.18),
('MTCAP.01', 20.001, 21.000, 196.51),
('MTCAP.01', 21.001, 22.000, 204.22),
('MTCAP.01', 22.001, 23.000, 211.92),
('MTCAP.01', 23.001, 24.000, 219.63),
('MTCAP.01', 24.001, 25.000, 227.33),
('MTCAP.01', 25.001, 26.000, 235.04),
('MTCAP.01', 26.001, 27.000, 242.74),
('MTCAP.01', 27.001, 28.000, 250.45),
('MTCAP.01', 28.001, 29.000, 258.15),
('MTCAP.01', 29.001, 30.000, 265.86);

-- Comentário sobre a correção
COMMENT ON TABLE public.shipping_pricing IS 'Tabela de preços de frete por zona e faixa de peso, baseada na planilha oficial. Dados completos para MTCAP.01 adicionados em 28/08/2025.';