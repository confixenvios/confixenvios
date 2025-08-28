-- Completar dados faltantes na tabela shipping_pricing
-- Adicionar todas as faixas de peso que estão faltando

-- Faixa 0,501 a 0,750 kg
INSERT INTO public.shipping_pricing (zone_code, weight_min, weight_max, price) VALUES
('SPCAP.01', 0.501, 0.750, 17.52), ('SPCAP.02', 0.501, 0.750, 17.67), ('SPCAP.03', 0.501, 0.750, 18.53), ('SPMET.01', 0.501, 0.750, 19.97), ('SPINT.01', 0.501, 0.750, 20.36), ('SPINT.02', 0.501, 0.750, 20.92), ('SPINT.03', 0.501, 0.750, 21.79), ('SPINT.04', 0.501, 0.750, 25.82), ('RJCAP.01', 0.501, 0.750, 18.95), ('RJINT.01', 0.501, 0.750, 21.79), ('RJINT.02', 0.501, 0.750, 22.21), ('RJINT.03', 0.501, 0.750, 22.82), ('MGCAP.01', 0.501, 0.750, 18.85), ('MGINT.01', 0.501, 0.750, 22.50), ('MGINT.02', 0.501, 0.750, 23.12), ('MGINT.03', 0.501, 0.750, 24.08);

-- Faixa 0,751 a 1,000 kg
INSERT INTO public.shipping_pricing (zone_code, weight_min, weight_max, price) VALUES
('SPCAP.01', 0.751, 1.000, 19.20), ('SPCAP.02', 0.751, 1.000, 19.38), ('SPCAP.03', 0.751, 1.000, 19.42), ('SPMET.01', 0.751, 1.000, 20.95), ('SPINT.01', 0.751, 1.000, 21.33), ('SPINT.02', 0.751, 1.000, 21.92), ('SPINT.03', 0.751, 1.000, 22.56), ('SPINT.04', 0.751, 1.000, 27.16), ('RJCAP.01', 0.751, 1.000, 20.75), ('RJINT.01', 0.751, 1.000, 22.85), ('RJINT.02', 0.751, 1.000, 23.27), ('RJINT.03', 0.751, 1.000, 23.91), ('MGCAP.01', 0.751, 1.000, 20.65), ('MGINT.01', 0.751, 1.000, 23.58), ('MGINT.02', 0.751, 1.000, 24.22), ('MGINT.03', 0.751, 1.000, 24.93);

-- Faixa 1,501 a 2,000 kg
INSERT INTO public.shipping_pricing (zone_code, weight_min, weight_max, price) VALUES
('SPCAP.01', 1.501, 2.000, 21.56), ('SPCAP.02', 1.501, 2.000, 21.73), ('SPCAP.03', 1.501, 2.000, 22.46), ('SPMET.01', 1.501, 2.000, 24.25), ('SPINT.01', 1.501, 2.000, 24.69), ('SPINT.02', 1.501, 2.000, 25.38), ('SPINT.03', 1.501, 2.000, 26.10), ('SPINT.04', 1.501, 2.000, 30.87), ('RJCAP.01', 1.501, 2.000, 23.30), ('RJINT.01', 1.501, 2.000, 26.44), ('RJINT.02', 1.501, 2.000, 26.92), ('RJINT.03', 1.501, 2.000, 28.65), ('MGCAP.01', 1.501, 2.000, 23.19), ('MGINT.01', 1.501, 2.000, 27.28), ('MGINT.02', 1.501, 2.000, 28.03), ('MGINT.03', 1.501, 2.000, 28.83);

-- Faixa 2,001 a 2,500 kg
INSERT INTO public.shipping_pricing (zone_code, weight_min, weight_max, price) VALUES
('SPCAP.01', 2.001, 2.500, 21.75), ('SPCAP.02', 2.001, 2.500, 21.94), ('SPCAP.03', 2.001, 2.500, 23.00), ('SPMET.01', 2.001, 2.500, 24.82), ('SPINT.01', 2.001, 2.500, 25.29), ('SPINT.02', 2.001, 2.500, 26.53), ('SPINT.03', 2.001, 2.500, 27.82), ('SPINT.04', 2.001, 2.500, 31.63), ('RJCAP.01', 2.001, 2.500, 23.51), ('RJINT.01', 2.001, 2.500, 27.06), ('RJINT.02', 2.001, 2.500, 29.33), ('RJINT.03', 2.001, 2.500, 30.94), ('MGCAP.01', 2.001, 2.500, 23.39), ('MGINT.01', 2.001, 2.500, 27.93), ('MGINT.02', 2.001, 2.500, 29.30), ('MGINT.03', 2.001, 2.500, 30.71);

-- Faixa 2,501 a 3,000 kg
INSERT INTO public.shipping_pricing (zone_code, weight_min, weight_max, price) VALUES
('SPCAP.01', 2.501, 3.000, 23.38), ('SPCAP.02', 2.501, 3.000, 23.57), ('SPCAP.03', 2.501, 3.000, 24.70), ('SPMET.01', 2.501, 3.000, 25.86), ('SPINT.01', 2.501, 3.000, 27.10), ('SPINT.02', 2.501, 3.000, 28.39), ('SPINT.03', 2.501, 3.000, 29.74), ('SPINT.04', 2.501, 3.000, 33.79), ('RJCAP.01', 2.501, 3.000, 25.21), ('RJINT.01', 2.501, 3.000, 30.49), ('RJINT.02', 2.501, 3.000, 31.31), ('RJINT.03', 2.501, 3.000, 32.94), ('MGCAP.01', 2.501, 3.000, 25.08), ('MGINT.01', 2.501, 3.000, 30.67), ('MGINT.02', 2.501, 3.000, 31.95), ('MGINT.03', 2.501, 3.000, 38.67);

-- Faixa 3,001 a 3,500 kg
INSERT INTO public.shipping_pricing (zone_code, weight_min, weight_max, price) VALUES
('SPCAP.01', 3.001, 3.500, 26.00), ('SPCAP.02', 3.001, 3.500, 26.23), ('SPCAP.03', 3.001, 3.500, 27.46), ('SPMET.01', 3.001, 3.500, 28.78), ('SPINT.01', 3.001, 3.500, 30.14), ('SPINT.02', 3.001, 3.500, 31.58), ('SPINT.03', 3.001, 3.500, 33.10), ('SPINT.04', 3.001, 3.500, 34.70), ('RJCAP.01', 3.001, 3.500, 29.20), ('RJINT.01', 3.001, 3.500, 36.85), ('RJINT.02', 3.001, 3.500, 36.27), ('RJINT.03', 3.001, 3.500, 39.47), ('MGCAP.01', 3.001, 3.500, 28.75), ('MGINT.01', 3.001, 3.500, 36.79), ('MGINT.02', 3.001, 3.500, 39.44), ('MGINT.03', 3.001, 3.500, 47.75);

-- Faixa 3,501 a 4,000 kg
INSERT INTO public.shipping_pricing (zone_code, weight_min, weight_max, price) VALUES
('SPCAP.01', 3.501, 4.000, 27.22), ('SPCAP.02', 3.501, 4.000, 27.46), ('SPCAP.03', 3.501, 4.000, 28.78), ('SPMET.01', 3.501, 4.000, 30.14), ('SPINT.01', 3.501, 4.000, 31.58), ('SPINT.02', 3.501, 4.000, 33.10), ('SPINT.03', 3.501, 4.000, 34.70), ('SPINT.04', 3.501, 4.000, 36.36), ('RJCAP.01', 3.501, 4.000, 30.56), ('RJINT.01', 3.501, 4.000, 38.44), ('RJINT.02', 3.501, 4.000, 37.99), ('RJINT.03', 3.501, 4.000, 41.06), ('MGCAP.01', 3.501, 4.000, 30.18), ('MGINT.01', 3.501, 4.000, 39.10), ('MGINT.02', 3.501, 4.000, 41.43), ('MGINT.03', 3.501, 4.000, 50.29);

-- Faixa 4,001 a 4,500 kg
INSERT INTO public.shipping_pricing (zone_code, weight_min, weight_max, price) VALUES
('SPCAP.01', 4.001, 4.500, 29.11), ('SPCAP.02', 4.001, 4.500, 29.36), ('SPCAP.03', 4.001, 4.500, 30.76), ('SPMET.01', 4.001, 4.500, 32.23), ('SPINT.01', 4.001, 4.500, 33.78), ('SPINT.02', 4.001, 4.500, 35.41), ('SPINT.03', 4.001, 4.500, 37.11), ('SPINT.04', 4.001, 4.500, 38.91), ('RJCAP.01', 4.001, 4.500, 32.68), ('RJINT.01', 4.001, 4.500, 43.05), ('RJINT.02', 4.001, 4.500, 41.79), ('RJINT.03', 4.001, 4.500, 44.48), ('MGCAP.01', 4.001, 4.500, 32.26), ('MGINT.01', 4.001, 4.500, 43.47), ('MGINT.02', 4.001, 4.500, 45.94), ('MGINT.03', 4.001, 4.500, 56.15);

-- Faixa 4,501 a 5,000 kg
INSERT INTO public.shipping_pricing (zone_code, weight_min, weight_max, price) VALUES
('SPCAP.01', 4.501, 5.000, 29.57), ('SPCAP.02', 4.501, 5.000, 29.83), ('SPCAP.03', 4.501, 5.000, 31.25), ('SPMET.01', 4.501, 5.000, 32.76), ('SPINT.01', 4.501, 5.000, 34.34), ('SPINT.02', 4.501, 5.000, 35.99), ('SPINT.03', 4.501, 5.000, 37.73), ('SPINT.04', 4.501, 5.000, 39.55), ('RJCAP.01', 4.501, 5.000, 33.19), ('RJINT.01', 4.501, 5.000, 44.67), ('RJINT.02', 4.501, 5.000, 43.42), ('RJINT.03', 4.501, 5.000, 46.11), ('MGCAP.01', 4.501, 5.000, 33.72), ('MGINT.01', 4.501, 5.000, 45.82), ('MGINT.02', 4.501, 5.000, 47.97), ('MGINT.03', 4.501, 5.000, 58.74);

-- Faixas CRÍTICAS que estão faltando para 6-10kg
-- Faixa 6,001 a 7,000 kg
INSERT INTO public.shipping_pricing (zone_code, weight_min, weight_max, price) VALUES
('SPCAP.01', 6.001, 7.000, 32.03), ('RJCAP.01', 6.001, 7.000, 35.95), ('MGCAP.01', 6.001, 7.000, 38.81);

-- Faixa 7,001 a 8,000 kg
INSERT INTO public.shipping_pricing (zone_code, weight_min, weight_max, price) VALUES
('SPCAP.01', 7.001, 8.000, 33.34), ('RJCAP.01', 7.001, 8.000, 37.41), ('MGCAP.01', 7.001, 8.000, 41.71);

-- Faixa 8,001 a 9,000 kg
INSERT INTO public.shipping_pricing (zone_code, weight_min, weight_max, price) VALUES
('SPCAP.01', 8.001, 9.000, 34.69), ('RJCAP.01', 8.001, 9.000, 42.20), ('MGCAP.01', 8.001, 9.000, 44.62);

-- FAIXA CRUCIAL: 9,001 a 10,000 kg (Esta é a que estava faltando!)
INSERT INTO public.shipping_pricing (zone_code, weight_min, weight_max, price) VALUES
('SPCAP.01', 9.001, 10.000, 36.11), ('SPCAP.02', 9.001, 10.000, 36.43), ('SPCAP.03', 9.001, 10.000, 38.16), ('SPMET.01', 9.001, 10.000, 39.99), ('SPINT.01', 9.001, 10.000, 41.91), ('SPINT.02', 9.001, 10.000, 43.92), ('SPINT.03', 9.001, 10.000, 46.05), ('SPINT.04', 9.001, 10.000, 48.26), ('RJCAP.01', 9.001, 10.000, 40.51), ('RJINT.01', 9.001, 10.000, 60.12), ('RJINT.02', 9.001, 10.000, 58.92), ('RJINT.03', 9.001, 10.000, 61.55), ('MGCAP.01', 9.001, 10.000, 47.53), ('MGINT.01', 9.001, 10.000, 68.13), ('MGINT.02', 9.001, 10.000, 67.29), ('MGINT.03', 9.001, 10.000, 83.38);

-- Continuar com outras faixas importantes
-- Faixa 11,001 a 12,000 kg
INSERT INTO public.shipping_pricing (zone_code, weight_min, weight_max, price) VALUES
('SPCAP.01', 11.001, 12.000, 39.11), ('RJCAP.01', 11.001, 12.000, 46.64), ('MGCAP.01', 11.001, 12.000, 55.93);

-- Faixa 12,001 a 13,000 kg
INSERT INTO public.shipping_pricing (zone_code, weight_min, weight_max, price) VALUES
('SPCAP.01', 12.001, 13.000, 40.69), ('RJCAP.01', 12.001, 13.000, 49.19), ('MGCAP.01', 12.001, 13.000, 58.84);

-- Faixa 13,001 a 14,000 kg
INSERT INTO public.shipping_pricing (zone_code, weight_min, weight_max, price) VALUES
('SPCAP.01', 13.001, 14.000, 42.35), ('RJCAP.01', 13.001, 14.000, 51.74), ('MGCAP.01', 13.001, 14.000, 61.75);

-- Faixa 14,001 a 15,000 kg
INSERT INTO public.shipping_pricing (zone_code, weight_min, weight_max, price) VALUES
('SPCAP.01', 14.001, 15.000, 44.07), ('RJCAP.01', 14.001, 15.000, 54.30), ('MGCAP.01', 14.001, 15.000, 64.66);

-- Faixa 15,001 a 16,000 kg
INSERT INTO public.shipping_pricing (zone_code, weight_min, weight_max, price) VALUES
('SPCAP.01', 15.001, 16.000, 45.85), ('RJCAP.01', 15.001, 16.000, 56.99), ('MGCAP.01', 15.001, 16.000, 67.62);

-- Faixa 16,001 a 17,000 kg
INSERT INTO public.shipping_pricing (zone_code, weight_min, weight_max, price) VALUES
('SPCAP.01', 16.001, 17.000, 47.71), ('RJCAP.01', 16.001, 17.000, 59.54), ('MGCAP.01', 16.001, 17.000, 70.53);

-- Faixa 17,001 a 18,000 kg
INSERT INTO public.shipping_pricing (zone_code, weight_min, weight_max, price) VALUES
('SPCAP.01', 17.001, 18.000, 49.65), ('RJCAP.01', 17.001, 18.000, 62.09), ('MGCAP.01', 17.001, 18.000, 73.44);

-- Faixa 18,001 a 19,000 kg
INSERT INTO public.shipping_pricing (zone_code, weight_min, weight_max, price) VALUES
('SPCAP.01', 18.001, 19.000, 51.66), ('RJCAP.01', 18.001, 19.000, 64.64), ('MGCAP.01', 18.001, 19.000, 76.35);

-- Faixa 19,001 a 20,000 kg
INSERT INTO public.shipping_pricing (zone_code, weight_min, weight_max, price) VALUES
('SPCAP.01', 19.001, 20.000, 53.75), ('RJCAP.01', 19.001, 20.000, 67.19), ('MGCAP.01', 19.001, 20.000, 79.25);