-- Permitir motoristas atualizarem status para ENTREGA_FINALIZADA
CREATE POLICY "Motoristas podem finalizar entregas"
ON public.shipments
FOR UPDATE
USING (
  motorista_id IS NOT NULL 
  AND status = 'COLETA_ACEITA'
)
WITH CHECK (
  motorista_id IS NOT NULL 
  AND status = 'ENTREGA_FINALIZADA'
);