-- Primeiro remover a check constraint existente
ALTER TABLE b2b_volumes DROP CONSTRAINT IF EXISTS b2b_volumes_status_check;

-- Atualizar status na tabela b2b_volumes
UPDATE b2b_volumes SET status = 'AGUARDANDO_ACEITE_COLETA' WHERE status = 'PENDENTE';
UPDATE b2b_volumes SET status = 'COLETA_ACEITA' WHERE status = 'ACEITO';
UPDATE b2b_volumes SET status = 'AGUARDANDO_ACEITE_EXPEDICAO' WHERE status = 'AGUARDANDO_EXPEDICAO';
UPDATE b2b_volumes SET status = 'EXPEDIDO' WHERE status = 'DESPACHADO';

-- Atualizar status na tabela b2b_status_history
UPDATE b2b_status_history SET status = 'AGUARDANDO_ACEITE_COLETA' WHERE status = 'PENDENTE';
UPDATE b2b_status_history SET status = 'COLETA_ACEITA' WHERE status = 'ACEITO';
UPDATE b2b_status_history SET status = 'AGUARDANDO_ACEITE_EXPEDICAO' WHERE status = 'AGUARDANDO_EXPEDICAO';
UPDATE b2b_status_history SET status = 'EXPEDIDO' WHERE status = 'DESPACHADO';

-- Recriar a check constraint com os novos valores permitidos
ALTER TABLE b2b_volumes ADD CONSTRAINT b2b_volumes_status_check 
CHECK (status IN (
  'AGUARDANDO_ACEITE_COLETA',
  'COLETA_ACEITA', 
  'COLETADO',
  'EM_TRIAGEM',
  'AGUARDANDO_ACEITE_EXPEDICAO',
  'EXPEDIDO',
  'CONCLUIDO',
  'DEVOLUCAO'
));