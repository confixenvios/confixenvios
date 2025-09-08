-- Corrigir constraint de status se necessário e testar novamente
ALTER TABLE public.motoristas DROP CONSTRAINT IF EXISTS motoristas_status_check;

ALTER TABLE public.motoristas 
ADD CONSTRAINT motoristas_status_check 
CHECK (status IN ('ativo', 'inativo', 'pendente'));

-- Testar inserção final
INSERT INTO public.motoristas (nome, cpf, telefone, email, senha, status) 
VALUES ('Validacao Final', '555.666.777-88', '(11) 55555-5555', 'validacao.final@email.com', 'senha123', 'pendente')
RETURNING nome, email, status,
  CASE 
    WHEN senha ~ '^\$2[abxy]?\$\d+\$' THEN 'Sistema de hash funcionando!'
    ELSE 'Erro no hash'
  END as resultado_hash;

-- Limpar o teste
DELETE FROM public.motoristas WHERE email = 'validacao.final@email.com';