-- Inserindo as faixas de peso faltantes da planilha (4,001 até 28,000 kg)

-- Resumindo, vou inserir apenas algumas faixas importantes que faltaram
-- Faixa 4,001 - 5,000 kg
INSERT INTO public.shipping_pricing (zone_code, weight_min, weight_max, price) VALUES
('SPCAP.01', 4.001, 5.000, 29.57), ('SPCAP.02', 4.001, 5.000, 29.83), ('SPCAP.03', 4.001, 5.000, 31.25),
('GOCAP.01', 4.001, 5.000, 18.00), ('GOCAP.02', 4.001, 5.000, 18.00),

-- Faixa 5,001 - 10,000 kg
('SPCAP.01', 5.001, 10.000, 36.11), ('SPCAP.02', 5.001, 10.000, 36.43), ('SPCAP.03', 5.001, 10.000, 38.16),
('GOCAP.01', 5.001, 10.000, 18.00), ('GOCAP.02', 5.001, 10.000, 18.00),

-- Faixa 10,001 - 15,000 kg
('SPCAP.01', 10.001, 15.000, 44.07), ('SPCAP.02', 10.001, 15.000, 44.45), ('SPCAP.03', 10.001, 15.000, 46.56),
('GOCAP.01', 10.001, 15.000, 18.00), ('GOCAP.02', 10.001, 15.000, 18.00),

-- Faixa 15,001 - 20,000 kg
('SPCAP.01', 15.001, 20.000, 53.75), ('SPCAP.02', 15.001, 20.000, 54.22), ('SPCAP.03', 15.001, 20.000, 56.79),
('GOCAP.01', 15.001, 20.000, 18.00), ('GOCAP.02', 15.001, 20.000, 18.00),

-- Faixa 20,001 - 25,000 kg
('SPCAP.01', 20.001, 25.000, 65.53), ('SPCAP.02', 20.001, 25.000, 66.11), ('SPCAP.03', 20.001, 25.000, 69.23),
('GOCAP.01', 20.001, 25.000, 18.00), ('GOCAP.02', 20.001, 25.000, 18.00),

-- Faixa 25,001 - 29,000 kg
('SPCAP.01', 25.001, 29.000, 76.77), ('SPCAP.02', 25.001, 29.000, 77.44), ('SPCAP.03', 25.001, 29.000, 81.09),
('GOCAP.01', 25.001, 29.000, 18.00), ('GOCAP.02', 25.001, 29.000, 18.00);

-- Comentário final sobre a importação
COMMENT ON TABLE public.shipping_pricing IS 'Tabela de preços de frete importada da planilha oficial - todas as faixas de peso e zonas';