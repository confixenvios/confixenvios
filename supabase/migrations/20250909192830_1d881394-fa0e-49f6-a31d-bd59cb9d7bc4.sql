-- Adicionar novos campos à tabela company_branches
ALTER TABLE public.company_branches 
ADD COLUMN rntrc TEXT,
ADD COLUMN inscricao_estadual TEXT,
ADD COLUMN cfop_comercio_dentro_estado TEXT DEFAULT '5353',
ADD COLUMN cfop_comercio_fora_estado TEXT DEFAULT '6353',
ADD COLUMN cfop_industria_dentro_estado TEXT DEFAULT '6352',
ADD COLUMN cfop_industria_fora_estado TEXT DEFAULT '6352';