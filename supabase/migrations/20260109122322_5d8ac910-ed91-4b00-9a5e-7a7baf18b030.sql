-- Adicionar novos roles ao enum app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'cd';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'suporte';