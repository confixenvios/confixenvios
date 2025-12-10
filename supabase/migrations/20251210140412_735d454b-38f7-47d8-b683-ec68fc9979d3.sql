-- Adicionar policy para permitir motoristas inserirem histórico para remessas B2B
CREATE POLICY "Motoristas podem criar histórico de remessas B2B"
ON public.shipment_status_history
FOR INSERT
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM motoristas m
    WHERE m.id = shipment_status_history.motorista_id 
    AND m.status = 'ativo'
  ))
  AND
  (EXISTS (
    SELECT 1 FROM b2b_shipments b
    WHERE b.id = shipment_status_history.shipment_id
  ))
);