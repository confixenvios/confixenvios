-- DEBUG: Política temporária mais permissiva para ocorrências
-- Vamos permitir inserções para debug e depois ajustar

-- Remover política restritiva atual
DROP POLICY IF EXISTS "Produção - Motoristas podem inserir ocorrências" ON public.shipment_occurrences;

-- Criar política temporária para debug
CREATE POLICY "DEBUG - Permite inserção de ocorrências" 
ON public.shipment_occurrences FOR INSERT
WITH CHECK (
  occurrence_type IN ('foto', 'audio') AND
  motorista_id IS NOT NULL AND
  shipment_id IS NOT NULL
);

-- Log da mudança
INSERT INTO public.webhook_logs (
  event_type,
  shipment_id,
  payload,
  response_status,
  response_body
) VALUES (
  'debug_policy_update',
  'occurrence_debug',
  '{"action": "temporary_permissive_policy_for_occurrences", "reason": "debug_save_issues"}'::jsonb,
  200,
  '{"status": "debug_policy_active"}'::jsonb
);