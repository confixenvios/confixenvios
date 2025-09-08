-- Teste final para validar o cadastro de motorista
INSERT INTO public.motoristas (nome, cpf, telefone, email, senha, status) 
VALUES ('Teste Sistema', '123.456.789-01', '(11) 99999-9999', 'teste.sistema@email.com', 'minhasenha', 'pendente')
RETURNING nome, email, status,
  CASE 
    WHEN senha ~ '^\$2[abxy]?\$\d+\$' THEN '✅ Hash bcrypt aplicado com sucesso!'
    ELSE '❌ Erro no hash'
  END as status_hash,
  LENGTH(senha) as tamanho_hash;

-- Limpar teste
DELETE FROM public.motoristas WHERE email = 'teste.sistema@email.com';