-- Correção de preços para todas as zonas INT
-- Remove todos os preços existentes das zonas INT
DELETE FROM shipping_pricing WHERE zone_code LIKE '%INT%';

-- SPINT.01 (SP Interior 01)
INSERT INTO shipping_pricing (weight_min, weight_max, zone_code, price) VALUES
(0.001, 0.200, 'SPINT.01', 19.00),
(0.201, 0.350, 'SPINT.01', 19.14),
(0.351, 0.500, 'SPINT.01', 20.18),
(0.501, 0.750, 'SPINT.01', 20.36),
(0.751, 1.000, 'SPINT.01', 21.33),
(1.001, 1.500, 'SPINT.01', 23.56),
(1.501, 2.000, 'SPINT.01', 24.69),
(2.001, 2.500, 'SPINT.01', 25.29),
(2.501, 3.000, 'SPINT.01', 27.10),
(29.001, 30.000, 'SPINT.01', 41.91);

-- SPINT.02 (SP Interior 02)
INSERT INTO shipping_pricing (weight_min, weight_max, zone_code, price) VALUES
(0.001, 0.200, 'SPINT.02', 19.52),
(0.201, 0.350, 'SPINT.02', 19.66),
(0.351, 0.500, 'SPINT.02', 20.75),
(0.501, 0.750, 'SPINT.02', 20.92),
(0.751, 1.000, 'SPINT.02', 21.92),
(1.001, 1.500, 'SPINT.02', 24.21),
(1.501, 2.000, 'SPINT.02', 25.38),
(2.001, 2.500, 'SPINT.02', 26.53),
(2.501, 3.000, 'SPINT.02', 28.39),
(29.001, 30.000, 'SPINT.02', 43.92);

-- SPINT.03 (SP Interior 03)
INSERT INTO shipping_pricing (weight_min, weight_max, zone_code, price) VALUES
(0.001, 0.200, 'SPINT.03', 20.07),
(0.201, 0.350, 'SPINT.03', 20.23),
(0.351, 0.500, 'SPINT.03', 21.57),
(0.501, 0.750, 'SPINT.03', 21.79),
(0.751, 1.000, 'SPINT.03', 22.56),
(1.001, 1.500, 'SPINT.03', 24.90),
(1.501, 2.000, 'SPINT.03', 26.10),
(2.001, 2.500, 'SPINT.03', 27.82),
(2.501, 3.000, 'SPINT.03', 29.74),
(29.001, 30.000, 'SPINT.03', 46.05);

-- SPINT.04 (SP Interior 04)
INSERT INTO shipping_pricing (weight_min, weight_max, zone_code, price) VALUES
(0.001, 0.200, 'SPINT.04', 23.73),
(0.201, 0.350, 'SPINT.04', 23.91),
(0.351, 0.500, 'SPINT.04', 25.57),
(0.501, 0.750, 'SPINT.04', 25.82),
(0.751, 1.000, 'SPINT.04', 27.16),
(1.001, 1.500, 'SPINT.04', 29.44),
(1.501, 2.000, 'SPINT.04', 30.87),
(2.001, 2.500, 'SPINT.04', 31.63),
(2.501, 3.000, 'SPINT.04', 33.79),
(29.001, 30.000, 'SPINT.04', 48.26);

-- RJINT.01 (RJ Interior 01)
INSERT INTO shipping_pricing (weight_min, weight_max, zone_code, price) VALUES
(0.001, 0.200, 'RJINT.01', 20.36),
(0.201, 0.350, 'RJINT.01', 20.50),
(0.351, 0.500, 'RJINT.01', 21.63),
(0.501, 0.750, 'RJINT.01', 21.79),
(0.751, 1.000, 'RJINT.01', 22.85),
(1.001, 1.500, 'RJINT.01', 25.21),
(1.501, 2.000, 'RJINT.01', 26.44),
(2.001, 2.500, 'RJINT.01', 27.06),
(2.501, 3.000, 'RJINT.01', 30.49),
(29.001, 30.000, 'RJINT.01', 60.12);

-- RJINT.02 (RJ Interior 02)
INSERT INTO shipping_pricing (weight_min, weight_max, zone_code, price) VALUES
(0.001, 0.200, 'RJINT.02', 20.74),
(0.201, 0.350, 'RJINT.02', 20.89),
(0.351, 0.500, 'RJINT.02', 22.02),
(0.501, 0.750, 'RJINT.02', 22.21),
(0.751, 1.000, 'RJINT.02', 23.27),
(1.001, 1.500, 'RJINT.02', 25.69),
(1.501, 2.000, 'RJINT.02', 26.92),
(2.001, 2.500, 'RJINT.02', 29.33),
(2.501, 3.000, 'RJINT.02', 31.31),
(29.001, 30.000, 'RJINT.02', 58.92);

-- RJINT.03 (RJ Interior 03)
INSERT INTO shipping_pricing (weight_min, weight_max, zone_code, price) VALUES
(0.001, 0.200, 'RJINT.03', 21.30),
(0.201, 0.350, 'RJINT.03', 21.45),
(0.351, 0.500, 'RJINT.03', 22.64),
(0.501, 0.750, 'RJINT.03', 22.82),
(0.751, 1.000, 'RJINT.03', 23.91),
(1.001, 1.500, 'RJINT.03', 27.21),
(1.501, 2.000, 'RJINT.03', 28.65),
(2.001, 2.500, 'RJINT.03', 30.94),
(2.501, 3.000, 'RJINT.03', 32.94),
(29.001, 30.000, 'RJINT.03', 61.55);

-- MGINT.01 (MG Interior 01)
INSERT INTO shipping_pricing (weight_min, weight_max, zone_code, price) VALUES
(0.001, 0.200, 'MGINT.01', 21.01),
(0.201, 0.350, 'MGINT.01', 21.16),
(0.351, 0.500, 'MGINT.01', 22.31),
(0.501, 0.750, 'MGINT.01', 22.50),
(0.751, 1.000, 'MGINT.01', 23.58),
(1.001, 1.500, 'MGINT.01', 26.03),
(1.501, 2.000, 'MGINT.01', 27.28),
(2.001, 2.500, 'MGINT.01', 27.93),
(2.501, 3.000, 'MGINT.01', 30.67),
(29.001, 30.000, 'MGINT.01', 68.13);

-- MGINT.02 (MG Interior 02)
INSERT INTO shipping_pricing (weight_min, weight_max, zone_code, price) VALUES
(0.001, 0.200, 'MGINT.02', 21.58),
(0.201, 0.350, 'MGINT.02', 21.74),
(0.351, 0.500, 'MGINT.02', 22.94),
(0.501, 0.750, 'MGINT.02', 23.12),
(0.751, 1.000, 'MGINT.02', 24.22),
(1.001, 1.500, 'MGINT.02', 26.74),
(1.501, 2.000, 'MGINT.02', 28.03),
(2.001, 2.500, 'MGINT.02', 29.30),
(2.501, 3.000, 'MGINT.02', 31.95),
(29.001, 30.000, 'MGINT.02', 67.29);

-- MGINT.03 (MG Interior 03)
INSERT INTO shipping_pricing (weight_min, weight_max, zone_code, price) VALUES
(0.001, 0.200, 'MGINT.03', 22.19),
(0.201, 0.350, 'MGINT.03', 22.36),
(0.351, 0.500, 'MGINT.03', 23.84),
(0.501, 0.750, 'MGINT.03', 24.08),
(0.751, 1.000, 'MGINT.03', 24.93),
(1.001, 1.500, 'MGINT.03', 27.51),
(1.501, 2.000, 'MGINT.03', 28.83),
(2.001, 2.500, 'MGINT.03', 30.71),
(2.501, 3.000, 'MGINT.03', 38.67),
(29.001, 30.000, 'MGINT.03', 83.38);

-- ESINT.01 (ES Interior 01)
INSERT INTO shipping_pricing (weight_min, weight_max, zone_code, price) VALUES
(0.001, 0.200, 'ESINT.01', 26.84),
(0.201, 0.350, 'ESINT.01', 28.23),
(0.351, 0.500, 'ESINT.01', 29.80),
(0.501, 0.750, 'ESINT.01', 30.66),
(0.751, 1.000, 'ESINT.01', 32.18),
(1.001, 1.500, 'ESINT.01', 33.78),
(1.501, 2.000, 'ESINT.01', 35.44),
(2.001, 2.500, 'ESINT.01', 38.73),
(2.501, 3.000, 'ESINT.01', 41.76),
(29.001, 30.000, 'ESINT.01', 77.28);

-- ESINT.02 (ES Interior 02)
INSERT INTO shipping_pricing (weight_min, weight_max, zone_code, price) VALUES
(0.001, 0.200, 'ESINT.02', 28.23),
(0.201, 0.350, 'ESINT.02', 29.61),
(0.351, 0.500, 'ESINT.02', 31.28),
(0.501, 0.750, 'ESINT.02', 32.18),
(0.751, 1.000, 'ESINT.02', 33.78),
(1.001, 1.500, 'ESINT.02', 35.44),
(1.501, 2.000, 'ESINT.02', 37.21),
(2.001, 2.500, 'ESINT.02', 44.48),
(2.501, 3.000, 'ESINT.02', 47.51),
(29.001, 30.000, 'ESINT.02', 84.54);

-- ESINT.03 (ES Interior 03)
INSERT INTO shipping_pricing (weight_min, weight_max, zone_code, price) VALUES
(0.001, 0.200, 'ESINT.03', 29.61),
(0.201, 0.350, 'ESINT.03', 31.08),
(0.351, 0.500, 'ESINT.03', 32.82),
(0.501, 0.750, 'ESINT.03', 33.78),
(0.751, 1.000, 'ESINT.03', 35.44),
(1.001, 1.500, 'ESINT.03', 37.21),
(1.501, 2.000, 'ESINT.03', 39.05),
(2.001, 2.500, 'ESINT.03', 49.00),
(2.501, 3.000, 'ESINT.03', 51.98),
(29.001, 30.000, 'ESINT.03', 87.35);

-- PRINT.01 (PR Interior 01)
INSERT INTO shipping_pricing (weight_min, weight_max, zone_code, price) VALUES
(0.001, 0.200, 'PRINT.01', 20.55),
(0.201, 0.350, 'PRINT.01', 21.53),
(0.351, 0.500, 'PRINT.01', 22.74),
(0.501, 0.750, 'PRINT.01', 23.37),
(0.751, 1.000, 'PRINT.01', 24.50),
(1.001, 1.500, 'PRINT.01', 27.40),
(1.501, 2.000, 'PRINT.01', 28.83),
(2.001, 2.500, 'PRINT.01', 30.20),
(2.501, 3.000, 'PRINT.01', 34.38),
(29.001, 30.000, 'PRINT.01', 53.11);

-- PRINT.02 (PR Interior 02)
INSERT INTO shipping_pricing (weight_min, weight_max, zone_code, price) VALUES
(0.001, 0.200, 'PRINT.02', 21.34),
(0.201, 0.350, 'PRINT.02', 22.36),
(0.351, 0.500, 'PRINT.02', 23.60),
(0.501, 0.750, 'PRINT.02', 24.25),
(0.751, 1.000, 'PRINT.02', 25.44),
(1.001, 1.500, 'PRINT.02', 28.45),
(1.501, 2.000, 'PRINT.02', 29.93),
(2.001, 2.500, 'PRINT.02', 31.92),
(2.501, 3.000, 'PRINT.02', 36.18),
(29.001, 30.000, 'PRINT.02', 47.97);

-- PRINT.03 (PR Interior 03)
INSERT INTO shipping_pricing (weight_min, weight_max, zone_code, price) VALUES
(0.001, 0.200, 'PRINT.03', 24.07),
(0.201, 0.350, 'PRINT.03', 25.22),
(0.351, 0.500, 'PRINT.03', 26.61),
(0.501, 0.750, 'PRINT.03', 27.36),
(0.751, 1.000, 'PRINT.03', 28.69),
(1.001, 1.500, 'PRINT.03', 32.07),
(1.501, 2.000, 'PRINT.03', 33.73),
(2.001, 2.500, 'PRINT.03', 33.98),
(2.501, 3.000, 'PRINT.03', 38.57),
(29.001, 30.000, 'PRINT.03', 69.12);

-- SCINT.01 (SC Interior 01)
INSERT INTO shipping_pricing (weight_min, weight_max, zone_code, price) VALUES
(0.001, 0.200, 'SCINT.01', 26.17),
(0.201, 0.350, 'SCINT.01', 27.28),
(0.351, 0.500, 'SCINT.01', 28.75),
(0.501, 0.750, 'SCINT.01', 29.55),
(0.751, 1.000, 'SCINT.01', 30.96),
(1.001, 1.500, 'SCINT.01', 34.60),
(1.501, 2.000, 'SCINT.01', 36.39),
(2.001, 2.500, 'SCINT.01', 38.11),
(2.501, 3.000, 'SCINT.01', 43.21),
(29.001, 30.000, 'SCINT.01', 66.66);

-- SCINT.02 (SC Interior 02)
INSERT INTO shipping_pricing (weight_min, weight_max, zone_code, price) VALUES
(0.001, 0.200, 'SCINT.02', 27.28),
(0.201, 0.350, 'SCINT.02', 28.56),
(0.351, 0.500, 'SCINT.02', 30.14),
(0.501, 0.750, 'SCINT.02', 30.96),
(0.751, 1.000, 'SCINT.02', 32.46),
(1.001, 1.500, 'SCINT.02', 36.28),
(1.501, 2.000, 'SCINT.02', 38.15),
(2.001, 2.500, 'SCINT.02', 43.58),
(2.501, 3.000, 'SCINT.02', 51.64),
(29.001, 30.000, 'SCINT.02', 121.41);

-- SCINT.03 (SC Interior 03)
INSERT INTO shipping_pricing (weight_min, weight_max, zone_code, price) VALUES
(0.001, 0.200, 'SCINT.03', 27.08),
(0.201, 0.350, 'SCINT.03', 28.40),
(0.351, 0.500, 'SCINT.03', 29.94),
(0.501, 0.750, 'SCINT.03', 30.78),
(0.751, 1.000, 'SCINT.03', 32.27),
(1.001, 1.500, 'SCINT.03', 36.07),
(1.501, 2.000, 'SCINT.03', 37.93),
(2.001, 2.500, 'SCINT.03', 39.72),
(2.501, 3.000, 'SCINT.03', 45.00),
(29.001, 30.000, 'SCINT.03', 69.42);

-- RSINT.01 (RS Interior 01)
INSERT INTO shipping_pricing (weight_min, weight_max, zone_code, price) VALUES
(0.001, 0.200, 'RSINT.01', 25.70),
(0.201, 0.350, 'RSINT.01', 26.95),
(0.351, 0.500, 'RSINT.01', 28.45),
(0.501, 0.750, 'RSINT.01', 29.25),
(0.751, 1.000, 'RSINT.01', 30.69),
(1.001, 1.500, 'RSINT.01', 34.21),
(1.501, 2.000, 'RSINT.01', 35.88),
(2.001, 2.500, 'RSINT.01', 37.49),
(2.501, 3.000, 'RSINT.01', 46.44),
(29.001, 30.000, 'RSINT.01', 71.05);

-- RSINT.02 (RS Interior 02)
INSERT INTO shipping_pricing (weight_min, weight_max, zone_code, price) VALUES
(0.001, 0.200, 'RSINT.02', 26.95),
(0.201, 0.350, 'RSINT.02', 28.27),
(0.351, 0.500, 'RSINT.02', 29.84),
(0.501, 0.750, 'RSINT.02', 30.69),
(0.751, 1.000, 'RSINT.02', 32.19),
(1.001, 1.500, 'RSINT.02', 35.88),
(1.501, 2.000, 'RSINT.02', 37.65),
(2.001, 2.500, 'RSINT.02', 39.35),
(2.501, 3.000, 'RSINT.02', 48.68),
(29.001, 30.000, 'RSINT.02', 94.98);

-- RSINT.03 (RS Interior 03)
INSERT INTO shipping_pricing (weight_min, weight_max, zone_code, price) VALUES
(0.001, 0.200, 'RSINT.03', 28.27),
(0.201, 0.350, 'RSINT.03', 29.65),
(0.351, 0.500, 'RSINT.03', 31.30),
(0.501, 0.750, 'RSINT.03', 32.19),
(0.751, 1.000, 'RSINT.03', 33.76),
(1.001, 1.500, 'RSINT.03', 37.65),
(1.501, 2.000, 'RSINT.03', 39.51),
(2.001, 2.500, 'RSINT.03', 41.28),
(2.501, 3.000, 'RSINT.03', 51.03),
(29.001, 30.000, 'RSINT.03', 78.79);

-- GOINT.01 (GO Interior 01)
INSERT INTO shipping_pricing (weight_min, weight_max, zone_code, price) VALUES
(0.001, 0.200, 'GOINT.01', 27.65),
(0.201, 0.350, 'GOINT.01', 29.00),
(0.351, 0.500, 'GOINT.01', 31.83),
(0.501, 0.750, 'GOINT.01', 32.75),
(0.751, 1.000, 'GOINT.01', 34.36),
(1.001, 1.500, 'GOINT.01', 39.44),
(1.501, 2.000, 'GOINT.01', 41.47),
(2.001, 2.500, 'GOINT.01', 48.26),
(2.501, 3.000, 'GOINT.01', 50.89),
(29.001, 30.000, 'GOINT.01', 83.59);

-- MSINT.01 (MS Interior 01)
INSERT INTO shipping_pricing (weight_min, weight_max, zone_code, price) VALUES
(0.001, 0.200, 'MSINT.01', 36.05),
(0.201, 0.350, 'MSINT.01', 37.01),
(0.351, 0.500, 'MSINT.01', 40.64),
(0.501, 0.750, 'MSINT.01', 41.78),
(0.751, 1.000, 'MSINT.01', 43.82),
(1.001, 1.500, 'MSINT.01', 46.07),
(1.501, 2.000, 'MSINT.01', 48.44),
(2.001, 2.500, 'MSINT.01', 50.71),
(2.501, 3.000, 'MSINT.01', 53.93),
(29.001, 30.000, 'MSINT.01', 83.96);

-- BAINT.01 (BA Interior 01)
INSERT INTO shipping_pricing (weight_min, weight_max, zone_code, price) VALUES
(0.001, 0.200, 'BAINT.01', 19.89),
(0.201, 0.350, 'BAINT.01', 20.85),
(0.351, 0.500, 'BAINT.01', 22.89),
(0.501, 0.750, 'BAINT.01', 36.14),
(0.751, 1.000, 'BAINT.01', 37.92),
(1.001, 1.500, 'BAINT.01', 43.98),
(1.501, 2.000, 'BAINT.01', 53.66),
(2.001, 2.500, 'BAINT.01', 59.24),
(2.501, 3.000, 'BAINT.01', 65.62),
(29.001, 30.000, 'BAINT.01', 146.36);

-- BAINT.02 (BA Interior 02)
INSERT INTO shipping_pricing (weight_min, weight_max, zone_code, price) VALUES
(0.001, 0.200, 'BAINT.02', 19.31),
(0.201, 0.350, 'BAINT.02', 20.25),
(0.351, 0.500, 'BAINT.02', 22.23),
(0.501, 0.750, 'BAINT.02', 38.71),
(0.751, 1.000, 'BAINT.02', 40.61),
(1.001, 1.500, 'BAINT.02', 47.09),
(1.501, 2.000, 'BAINT.02', 48.85),
(2.001, 2.500, 'BAINT.02', 55.72),
(2.501, 3.000, 'BAINT.02', 63.41),
(29.001, 30.000, 'BAINT.02', 162.10);

-- BAINT.03 (BA Interior 03)
INSERT INTO shipping_pricing (weight_min, weight_max, zone_code, price) VALUES
(0.001, 0.200, 'BAINT.03', 19.83),
(0.201, 0.350, 'BAINT.03', 20.79),
(0.351, 0.500, 'BAINT.03', 22.84),
(0.501, 0.750, 'BAINT.03', 39.78),
(0.751, 1.000, 'BAINT.03', 41.71),
(1.001, 1.500, 'BAINT.03', 48.37),
(1.501, 2.000, 'BAINT.03', 50.70),
(2.001, 2.500, 'BAINT.03', 54.14),
(2.501, 3.000, 'BAINT.03', 55.64),
(29.001, 30.000, 'BAINT.03', 162.10);

-- PEINT.01 (PE Interior 01)
INSERT INTO shipping_pricing (weight_min, weight_max, zone_code, price) VALUES
(0.001, 0.200, 'PEINT.01', 34.05),
(0.201, 0.350, 'PEINT.01', 34.29),
(0.351, 0.500, 'PEINT.01', 37.63),
(0.501, 0.750, 'PEINT.01', 38.70),
(0.751, 1.000, 'PEINT.01', 40.57),
(1.001, 1.500, 'PEINT.01', 47.05),
(1.501, 2.000, 'PEINT.01', 64.57),
(2.001, 2.500, 'PEINT.01', 78.70),
(2.501, 3.000, 'PEINT.01', 88.09),
(29.001, 30.000, 'PEINT.01', 216.81);

-- PEINT.02 (PE Interior 02)
INSERT INTO shipping_pricing (weight_min, weight_max, zone_code, price) VALUES
(0.001, 0.200, 'PEINT.02', 34.71),
(0.201, 0.350, 'PEINT.02', 36.40),
(0.351, 0.500, 'PEINT.02', 39.95),
(0.501, 0.750, 'PEINT.02', 41.07),
(0.751, 1.000, 'PEINT.02', 43.09),
(1.001, 1.500, 'PEINT.02', 49.96),
(1.501, 2.000, 'PEINT.02', 71.21),
(2.001, 2.500, 'PEINT.02', 82.03),
(2.501, 3.000, 'PEINT.02', 90.53),
(29.001, 30.000, 'PEINT.02', 208.25);

-- PEINT.03 (PE Interior 03)
INSERT INTO shipping_pricing (weight_min, weight_max, zone_code, price) VALUES
(0.001, 0.200, 'PEINT.03', 38.69),
(0.201, 0.350, 'PEINT.03', 38.94),
(0.351, 0.500, 'PEINT.03', 42.75),
(0.501, 0.750, 'PEINT.03', 43.09),
(0.751, 1.000, 'PEINT.03', 45.18),
(1.001, 1.500, 'PEINT.03', 52.37),
(1.501, 2.000, 'PEINT.03', 55.69),
(2.001, 2.500, 'PEINT.03', 59.40),
(2.501, 3.000, 'PEINT.03', 60.90),
(29.001, 30.000, 'PEINT.03', 80.55);

-- CEINT.01 (CE Interior 01)
INSERT INTO shipping_pricing (weight_min, weight_max, zone_code, price) VALUES
(0.001, 0.200, 'CEINT.01', 20.20),
(0.201, 0.350, 'CEINT.01', 20.40),
(0.351, 0.500, 'CEINT.01', 21.50),
(0.501, 0.750, 'CEINT.01', 41.30),
(0.751, 1.000, 'CEINT.01', 43.51),
(1.001, 1.500, 'CEINT.01', 50.45),
(1.501, 2.000, 'CEINT.01', 65.21),
(2.001, 2.500, 'CEINT.01', 76.66),
(2.501, 3.000, 'CEINT.01', 89.00),
(29.001, 30.000, 'CEINT.01', 252.30);

-- ALINT.01 (AL Interior 01)
INSERT INTO shipping_pricing (weight_min, weight_max, zone_code, price) VALUES
(0.001, 0.200, 'ALINT.01', 29.49),
(0.201, 0.350, 'ALINT.01', 30.97),
(0.351, 0.500, 'ALINT.01', 33.75),
(0.501, 0.750, 'ALINT.01', 36.85),
(0.751, 1.000, 'ALINT.01', 39.02),
(1.001, 1.500, 'ALINT.01', 53.68),
(1.501, 2.000, 'ALINT.01', 64.86),
(2.001, 2.500, 'ALINT.01', 78.75),
(2.501, 3.000, 'ALINT.01', 85.87),
(29.001, 30.000, 'ALINT.01', 186.57);

-- RNINT.01 (RN Interior 01)
INSERT INTO shipping_pricing (weight_min, weight_max, zone_code, price) VALUES
(0.001, 0.200, 'RNINT.01', 19.49),
(0.201, 0.350, 'RNINT.01', 20.85),
(0.351, 0.500, 'RNINT.01', 23.04),
(0.501, 0.750, 'RNINT.01', 37.11),
(0.751, 1.000, 'RNINT.01', 40.14),
(1.001, 1.500, 'RNINT.01', 55.13),
(1.501, 2.000, 'RNINT.01', 62.88),
(2.001, 2.500, 'RNINT.01', 71.47),
(2.501, 3.000, 'RNINT.01', 80.49),
(29.001, 30.000, 'RNINT.01', 199.17);

-- PBINT.01 (PB Interior 01)
INSERT INTO shipping_pricing (weight_min, weight_max, zone_code, price) VALUES
(0.001, 0.200, 'PBINT.01', 33.31),
(0.201, 0.350, 'PBINT.01', 33.55),
(0.351, 0.500, 'PBINT.01', 36.84),
(0.501, 0.750, 'PBINT.01', 37.88),
(0.751, 1.000, 'PBINT.01', 39.73),
(1.001, 1.500, 'PBINT.01', 44.16),
(1.501, 2.000, 'PBINT.01', 52.08),
(2.001, 2.500, 'PBINT.01', 59.85),
(2.501, 3.000, 'PBINT.01', 68.45),
(29.001, 30.000, 'PBINT.01', 183.59);

-- PBINT.02 (PB Interior 02)
INSERT INTO shipping_pricing (weight_min, weight_max, zone_code, price) VALUES
(0.001, 0.200, 'PBINT.02', 34.26),
(0.201, 0.350, 'PBINT.02', 35.92),
(0.351, 0.500, 'PBINT.02', 39.44),
(0.501, 0.750, 'PBINT.02', 40.56),
(0.751, 1.000, 'PBINT.02', 42.54),
(1.001, 1.500, 'PBINT.02', 48.16),
(1.501, 2.000, 'PBINT.02', 68.52),
(2.001, 2.500, 'PBINT.02', 83.55),
(2.501, 3.000, 'PBINT.02', 91.83),
(29.001, 30.000, 'PBINT.02', 203.93);

-- PBINT.03 (PB Interior 03)
INSERT INTO shipping_pricing (weight_min, weight_max, zone_code, price) VALUES
(0.001, 0.200, 'PBINT.03', 35.92),
(0.201, 0.350, 'PBINT.03', 37.67),
(0.351, 0.500, 'PBINT.03', 41.37),
(0.501, 0.750, 'PBINT.03', 42.54),
(0.751, 1.000, 'PBINT.03', 44.63),
(1.001, 1.500, 'PBINT.03', 50.69),
(1.501, 2.000, 'PBINT.03', 72.83),
(2.001, 2.500, 'PBINT.03', 86.02),
(2.501, 3.000, 'PBINT.03', 94.63),
(29.001, 30.000, 'PBINT.03', 214.89);

-- PAINT.01 (PA Interior 01)
INSERT INTO shipping_pricing (weight_min, weight_max, zone_code, price) VALUES
(0.001, 0.200, 'PAINT.01', 34.68),
(0.201, 0.350, 'PAINT.01', 36.36),
(0.351, 0.500, 'PAINT.01', 39.94),
(0.501, 0.750, 'PAINT.01', 41.04),
(0.751, 1.000, 'PAINT.01', 43.89),
(1.001, 1.500, 'PAINT.01', 63.93),
(1.501, 2.000, 'PAINT.01', 100.63),
(2.001, 2.500, 'PAINT.01', 117.17),
(2.501, 3.000, 'PAINT.01', 132.70),
(29.001, 30.000, 'PAINT.01', 344.97);

-- TOINT.01 (TO Interior 01)
INSERT INTO shipping_pricing (weight_min, weight_max, zone_code, price) VALUES
(0.001, 0.200, 'TOINT.01', 22.75),
(0.201, 0.350, 'TOINT.01', 23.86),
(0.351, 0.500, 'TOINT.01', 39.94),
(0.501, 0.750, 'TOINT.01', 40.27),
(0.751, 1.000, 'TOINT.01', 40.40),
(1.001, 1.500, 'TOINT.01', 46.84),
(1.501, 2.000, 'TOINT.01', 63.95),
(2.001, 2.500, 'TOINT.01', 76.52),
(2.501, 3.000, 'TOINT.01', 82.32),
(29.001, 30.000, 'TOINT.01', 164.74);

-- TOINT.02 (TO Interior 02)
INSERT INTO shipping_pricing (weight_min, weight_max, zone_code, price) VALUES
(0.001, 0.200, 'TOINT.02', 23.86),
(0.201, 0.350, 'TOINT.02', 25.03),
(0.351, 0.500, 'TOINT.02', 41.86),
(0.501, 0.750, 'TOINT.02', 42.22),
(0.751, 1.000, 'TOINT.02', 42.45),
(1.001, 1.500, 'TOINT.02', 46.87),
(1.501, 2.000, 'TOINT.02', 61.72),
(2.001, 2.500, 'TOINT.02', 68.92),
(2.501, 3.000, 'TOINT.02', 73.93),
(29.001, 30.000, 'TOINT.02', 142.50);