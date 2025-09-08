-- Ajustar políticas RLS para permitir motoristas salvarem ocorrências
-- Primeiro, remover políticas antigas que exigem auth.uid() para motoristas
DROP POLICY IF EXISTS "Secure: Motoristas assigned shipments" ON shipment_status_history;
DROP POLICY IF EXISTS "Secure: System status updates" ON shipment_status_history;

-- Criar política que permite motoristas salvarem ocorrências usando a tabela motoristas diretamente
CREATE POLICY "Motoristas podem criar ocorrências de suas remessas" 
ON shipment_status_history 
FOR INSERT 
WITH CHECK (
  -- Verificar se o motorista_id existe na tabela motoristas e está ativo
  EXISTS (
    SELECT 1 FROM motoristas m 
    WHERE m.id = shipment_status_history.motorista_id 
    AND m.status = 'ativo'
  )
  AND
  -- Verificar se a remessa pertence ao motorista
  EXISTS (
    SELECT 1 FROM shipments s 
    WHERE s.id = shipment_status_history.shipment_id 
    AND s.motorista_id = shipment_status_history.motorista_id
  )
);

-- Política para sistema inserir atualizações de status automáticas (sem motorista_id)
CREATE POLICY "Sistema pode criar atualizações de status" 
ON shipment_status_history 
FOR INSERT 
WITH CHECK (motorista_id IS NULL);