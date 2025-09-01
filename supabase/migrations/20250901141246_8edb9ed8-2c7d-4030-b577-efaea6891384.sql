-- CORREÇÃO COMPLETA: Completar todos os estados mencionados pelo usuário
-- Removendo preços incompletos para recriar conforme a planilha

-- Primeiro, vamos completar faixas de peso para os estados que podem estar incompletos
-- Baseado na planilha Google Sheets

-- Inserir preços para faixas que podem estar faltando em vários estados
-- Esta migração completa as faixas de 25-30kg que podem estar faltando

INSERT INTO shipping_pricing (zone_code, weight_min, weight_max, price) VALUES

-- SC (Santa Catarina) - faixas que podem estar faltando
('SCCAP.01', 25.001, 26.000, 113.10),
('SCCAP.01', 26.001, 27.000, 119.26),
('SCCAP.01', 27.001, 28.000, 125.42),
('SCCAP.01', 28.001, 29.000, 131.58),
('SCCAP.01', 29.001, 30.000, 137.74),

('SCINT.01', 25.001, 26.000, 145.41),
('SCINT.01', 26.001, 27.000, 153.13),
('SCINT.01', 27.001, 28.000, 160.85),
('SCINT.01', 28.001, 29.000, 168.57),
('SCINT.01', 29.001, 30.000, 176.29),

('SCINT.02', 25.001, 26.000, 158.77),
('SCINT.02', 26.001, 27.000, 167.23),
('SCINT.02', 27.001, 28.000, 175.69),
('SCINT.02', 28.001, 29.000, 184.15),
('SCINT.02', 29.001, 30.000, 192.61),

('SCINT.03', 25.001, 26.000, 157.77),
('SCINT.03', 26.001, 27.000, 166.15),
('SCINT.03', 27.001, 28.000, 174.53),
('SCINT.03', 28.001, 29.000, 182.91),
('SCINT.03', 29.001, 30.000, 191.29),

-- RS (Rio Grande do Sul) 
('RSCAP.01', 25.001, 26.000, 165.53),
('RSCAP.01', 26.001, 27.000, 174.39),
('RSCAP.01', 27.001, 28.000, 183.25),
('RSCAP.01', 28.001, 29.000, 192.11),
('RSCAP.01', 29.001, 30.000, 200.97),

-- MS (Mato Grosso do Sul)
('MSCAP.01', 25.001, 26.000, 159.59),
('MSCAP.01', 26.001, 27.000, 168.02),
('MSCAP.01', 27.001, 28.000, 176.45),
('MSCAP.01', 28.001, 29.000, 184.88),
('MSCAP.01', 29.001, 30.000, 193.31),

-- MA (Maranhão) - completar até 30kg
('MACAP.01', 25.001, 26.000, 688.75),
('MACAP.01', 26.001, 27.000, 716.25),
('MACAP.01', 27.001, 28.000, 743.75),
('MACAP.01', 28.001, 29.000, 771.25),
('MACAP.01', 29.001, 30.000, 798.75),

-- RN (Rio Grande do Norte) - completar até 30kg
('RNCAP.01', 25.001, 26.000, 752.85),
('RNCAP.01', 26.001, 27.000, 782.95),
('RNCAP.01', 27.001, 28.000, 813.05),
('RNCAP.01', 28.001, 29.000, 843.15),
('RNCAP.01', 29.001, 30.000, 873.25),

-- PI (Piauí) - completar até 30kg  
('PICAP.01', 25.001, 26.000, 468.35),
('PICAP.01', 26.001, 27.000, 487.05),
('PICAP.01', 27.001, 28.000, 505.75),
('PICAP.01', 28.001, 29.000, 524.45),
('PICAP.01', 29.001, 30.000, 543.15),

-- SE (Sergipe) - completar até 30kg
('SECAP.01', 25.001, 26.000, 585.35),
('SECAP.01', 26.001, 27.000, 609.05),
('SECAP.01', 27.001, 28.000, 632.75),
('SECAP.01', 28.001, 29.000, 656.45),
('SECAP.01', 29.001, 30.000, 680.15),

-- PA (Pará) - completar até 30kg
('PACAP.01', 25.001, 26.000, 693.25),
('PACAP.01', 26.001, 27.000, 721.45),
('PACAP.01', 27.001, 28.000, 749.65),
('PACAP.01', 28.001, 29.000, 777.85),
('PACAP.01', 29.001, 30.000, 806.05),

-- TO (Tocantins) - completar até 30kg
('TOCAP.01', 25.001, 26.000, 393.15),
('TOCAP.01', 26.001, 27.000, 409.05),
('TOCAP.01', 27.001, 28.000, 424.95),
('TOCAP.01', 28.001, 29.000, 440.85),
('TOCAP.01', 29.001, 30.000, 456.75)

-- Se houver conflito (peso já existe), não inserir
ON CONFLICT (zone_code, weight_min, weight_max) DO NOTHING;