-- Adicionar campo de inscrição estadual na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN inscricao_estadual text;