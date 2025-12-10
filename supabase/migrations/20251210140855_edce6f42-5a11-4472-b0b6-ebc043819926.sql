-- Desabilitar RLS na tabela shipment_status_history para INSERT (permitir qualquer insert)
DROP POLICY IF EXISTS "Motoristas podem criar ocorrências de suas remessas" ON public.shipment_status_history;
DROP POLICY IF EXISTS "Sistema pode criar atualizações de status" ON public.shipment_status_history;
DROP POLICY IF EXISTS "Motoristas podem inserir status history" ON public.shipment_status_history;
DROP POLICY IF EXISTS "Motoristas auth can insert status history" ON public.shipment_status_history;
DROP POLICY IF EXISTS "Motoristas podem criar histórico de remessas B2B" ON public.shipment_status_history;

-- Criar uma policy única e simples para INSERT que permite qualquer inserção
CREATE POLICY "Permitir insert de status history"
ON public.shipment_status_history
FOR INSERT
WITH CHECK (true);