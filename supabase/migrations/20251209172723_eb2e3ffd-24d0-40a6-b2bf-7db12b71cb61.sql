-- Permitir motoristas inserirem no histórico de status
CREATE POLICY "Motoristas podem inserir status history"
ON public.shipment_status_history
FOR INSERT
WITH CHECK (true);

-- Permitir motoristas lerem histórico de status das suas remessas
CREATE POLICY "Motoristas podem ver status history das suas remessas"
ON public.shipment_status_history
FOR SELECT
USING (true);