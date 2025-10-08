-- Permitir leitura pública da configuração do agente IA
DROP POLICY IF EXISTS "Anyone can read AI quote config" ON ai_quote_config;
CREATE POLICY "Anyone can read AI quote config"
ON ai_quote_config
FOR SELECT
TO public
USING (true);

-- Permitir que admins vejam todos os logs de cotação (incluindo anônimos)
DROP POLICY IF EXISTS "Admins can view all quote logs" ON ai_quote_logs;
CREATE POLICY "Admins can view all quote logs"
ON ai_quote_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Permitir que o sistema insira logs de cotação (via edge function)
DROP POLICY IF EXISTS "Service role can insert quote logs" ON ai_quote_logs;
CREATE POLICY "Service role can insert quote logs"
ON ai_quote_logs
FOR INSERT
TO public
WITH CHECK (true);