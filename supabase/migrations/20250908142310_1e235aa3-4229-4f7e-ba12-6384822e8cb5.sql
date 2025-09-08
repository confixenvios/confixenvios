-- Testar se o registro de motorista está funcionando
-- Inserir um motorista de teste para verificar se as políticas RLS estão corretas
DO $$
DECLARE
  test_result RECORD;
BEGIN
  -- Primeiro, vamos ver se existe algum problema com a inserção
  BEGIN
    INSERT INTO public.motoristas (nome, cpf, telefone, email, senha, status) 
    VALUES ('Teste Motorista', '123.456.789-01', '(11) 99999-9999', 'teste.motorista@email.com', 'senha123', 'pendente');
    
    RAISE NOTICE '✅ Inserção de motorista funcionou corretamente!';
    
    -- Verificar se a senha foi hasheada
    SELECT nome, email, status,
      CASE 
        WHEN senha ~ '^\$2[abxy]?\$\d+\$' THEN '✅ Hash bcrypt aplicado'
        ELSE '❌ Senha não foi hasheada: ' || LEFT(senha, 10)
      END as status_senha
    INTO test_result
    FROM public.motoristas 
    WHERE email = 'teste.motorista@email.com';
    
    RAISE NOTICE 'Dados inseridos: nome=%, email=%, status=%, senha=%', 
      test_result.nome, test_result.email, test_result.status, test_result.status_senha;
    
    -- Limpar o teste
    DELETE FROM public.motoristas WHERE email = 'teste.motorista@email.com';
    RAISE NOTICE '🗑️ Dados de teste removidos';
    
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ ERRO na inserção: % - %', SQLSTATE, SQLERRM;
  END;
END $$;