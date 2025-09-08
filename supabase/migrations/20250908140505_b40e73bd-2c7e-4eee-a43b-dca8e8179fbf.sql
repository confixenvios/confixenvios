-- Testar inserção final para validar o funcionamento
INSERT INTO public.motoristas (nome, cpf, telefone, email, senha, status) 
VALUES ('Motorista Teste Final', '111.222.333-44', '(11) 77777-7777', 'teste.final@email.com', 'minhasenha123', 'pendente')
RETURNING id, nome, email, status, 
  CASE 
    WHEN senha ~ '^\$2[abxy]?\$\d+\$' THEN 'Hash bcrypt aplicado ✓'
    ELSE 'Erro no hash ✗'
  END as hash_status,
  LENGTH(senha) as senha_length;

-- Limpar o teste
DELETE FROM public.motoristas WHERE email = 'teste.final@email.com';