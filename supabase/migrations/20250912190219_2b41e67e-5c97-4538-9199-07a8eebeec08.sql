-- Corrigir políticas para permitir inserção de ocorrências por motoristas

-- Remover política restritiva anterior se existir
DROP POLICY IF EXISTS "Allow motorista occurrence insertions" ON public.shipment_occurrences;

-- Remover política temporária se existir
DROP POLICY IF EXISTS "Inserção temporária permissiva para debug" ON public.shipment_occurrences;

-- Criar política permissiva temporária para debug (até autenticação estar funcionando)
CREATE POLICY "Debug - qualquer um pode inserir ocorrências" ON public.shipment_occurrences
FOR INSERT 
WITH CHECK (occurrence_type IN ('foto', 'audio'));

-- Comentário explicativo
COMMENT ON POLICY "Debug - qualquer um pode inserir ocorrências" ON public.shipment_occurrences IS 
'Política temporária muito permissiva para debugging. Deve ser substituída por validação de motorista real em produção.';

-- Log da mudança
INSERT INTO public.webhook_logs (
  event_type,
  shipment_id,
  payload,
  response_status,
  response_body
) VALUES (
  'rls_policy_updated',
  'debug_occurrences',
  '{"action": "created_permissive_occurrence_policy", "reason": "debug_motorista_uploads"}'::jsonb,
  200,
  '{"status": "policy_updated"}'::jsonb
);