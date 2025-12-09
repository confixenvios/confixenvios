-- Função auxiliar para verificar se usuário é motorista
CREATE OR REPLACE FUNCTION public.is_motorista(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'motorista'::app_role
  )
$$;

-- Função para criar role motorista automaticamente quando usuário se registra com metadata motorista
CREATE OR REPLACE FUNCTION public.handle_new_motorista_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Se o usuário tem metadata indicando que é motorista
  IF NEW.raw_user_meta_data->>'is_motorista' = 'true' THEN
    -- Criar role motorista
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'motorista'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Inserir dados no profile com dados do motorista
    INSERT INTO public.profiles (id, first_name, email, phone, document)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'nome',
      NEW.email,
      NEW.raw_user_meta_data->>'telefone',
      NEW.raw_user_meta_data->>'cpf'
    )
    ON CONFLICT (id) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      phone = EXCLUDED.phone,
      document = EXCLUDED.document;
  END IF;
  RETURN NEW;
END;
$$;

-- Criar trigger para novos motoristas
DROP TRIGGER IF EXISTS on_auth_motorista_created ON auth.users;
CREATE TRIGGER on_auth_motorista_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_motorista_user();

-- Atualizar políticas de b2b_shipments para motoristas autenticados via Supabase Auth
DROP POLICY IF EXISTS "Motoristas can view available B2B shipments" ON public.b2b_shipments;
DROP POLICY IF EXISTS "Public can view available B2B shipments" ON public.b2b_shipments;

CREATE POLICY "Motoristas can view available B2B shipments"
ON public.b2b_shipments
FOR SELECT
TO authenticated
USING (
  status = 'PENDENTE' 
  AND public.is_motorista(auth.uid())
);

-- Atualizar políticas de shipments para motoristas autenticados
DROP POLICY IF EXISTS "Motoristas can view available shipments" ON public.shipments;
CREATE POLICY "Motoristas can view available shipments"
ON public.shipments
FOR SELECT
TO authenticated
USING (
  (status IN ('PAID', 'PAYMENT_CONFIRMED', 'LABEL_GENERATED', 'PAGO_AGUARDANDO_ETIQUETA') 
   AND motorista_id IS NULL 
   AND public.is_motorista(auth.uid()))
  OR (motorista_id = auth.uid() AND public.is_motorista(auth.uid()))
);

-- Motoristas podem atualizar remessas (aceitar/finalizar)
DROP POLICY IF EXISTS "Motoristas auth can update shipments" ON public.shipments;
CREATE POLICY "Motoristas auth can update shipments"
ON public.shipments
FOR UPDATE
TO authenticated
USING (public.is_motorista(auth.uid()))
WITH CHECK (public.is_motorista(auth.uid()));

-- Motoristas podem inserir ocorrências
DROP POLICY IF EXISTS "Motoristas auth can insert occurrences" ON public.shipment_occurrences;
CREATE POLICY "Motoristas auth can insert occurrences"
ON public.shipment_occurrences
FOR INSERT
TO authenticated
WITH CHECK (public.is_motorista(auth.uid()));

-- Motoristas podem ver suas ocorrências
DROP POLICY IF EXISTS "Motoristas auth can view occurrences" ON public.shipment_occurrences;
CREATE POLICY "Motoristas auth can view occurrences"
ON public.shipment_occurrences
FOR SELECT
TO authenticated
USING (public.is_motorista(auth.uid()));

-- Motoristas podem inserir histórico de status
DROP POLICY IF EXISTS "Motoristas auth can insert status history" ON public.shipment_status_history;
CREATE POLICY "Motoristas auth can insert status history"
ON public.shipment_status_history
FOR INSERT
TO authenticated
WITH CHECK (public.is_motorista(auth.uid()));

-- Motoristas podem ver histórico de status
DROP POLICY IF EXISTS "Motoristas auth can view status history" ON public.shipment_status_history;
CREATE POLICY "Motoristas auth can view status history"
ON public.shipment_status_history
FOR SELECT
TO authenticated
USING (public.is_motorista(auth.uid()));