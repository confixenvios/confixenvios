-- Corrigir a constraint de status para incluir 'pendente'
-- Primeiro, remover a constraint atual
ALTER TABLE public.motoristas DROP CONSTRAINT IF EXISTS motoristas_status_check;

-- Criar nova constraint que inclui 'pendente', 'ativo' e 'inativo'
ALTER TABLE public.motoristas 
ADD CONSTRAINT motoristas_status_check 
CHECK (status IN ('pendente', 'ativo', 'inativo'));

-- Testar a função novamente para verificar se funciona
SELECT public.register_motorista_public(
  'Teste Motorista',
  '123.456.789-01', 
  '(11) 99999-9999',
  'teste.final@email.com',
  'senha123'
) as resultado_teste;