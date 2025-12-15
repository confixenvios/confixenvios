-- =====================================================
-- PRIMEIRO: Limpar referências de foreign key
-- =====================================================

-- Limpar histórico que referencia motoristas
DELETE FROM public.shipment_status_history WHERE motorista_id IS NOT NULL;

-- Limpar shipment_occurrences que referenciam motoristas
DELETE FROM public.shipment_occurrences WHERE motorista_id IS NOT NULL;

-- Limpar b2b_volume_labels
DELETE FROM public.b2b_volume_labels;

-- Limpar shipment_status_history B2B
DELETE FROM public.shipment_status_history WHERE b2b_shipment_id IS NOT NULL;

-- Agora limpar b2b_shipments
DELETE FROM public.b2b_shipments;

-- Limpar endereços B2B
DELETE FROM public.b2b_delivery_addresses;
DELETE FROM public.b2b_pickup_addresses;

-- Limpar clientes B2B
DELETE FROM public.b2b_clients;

-- Agora podemos limpar motoristas
DELETE FROM public.motoristas;

-- Limpar cd_users
DELETE FROM public.cd_users;

-- =====================================================
-- DROP E RECRIAÇÃO DAS TABELAS B2B
-- =====================================================

-- Drop tabelas antigas em ordem correta
DROP TABLE IF EXISTS public.b2b_volume_labels CASCADE;
DROP TABLE IF EXISTS public.b2b_status_history CASCADE;
DROP TABLE IF EXISTS public.b2b_volumes CASCADE;
DROP TABLE IF EXISTS public.b2b_shipments CASCADE;
DROP TABLE IF EXISTS public.b2b_delivery_addresses CASCADE;
DROP TABLE IF EXISTS public.b2b_pickup_addresses CASCADE;
DROP TABLE IF EXISTS public.b2b_clients CASCADE;
DROP TABLE IF EXISTS public.motoristas CASCADE;
DROP TABLE IF EXISTS public.cd_users CASCADE;

-- =====================================================
-- NOVA ESTRUTURA: MOTORISTAS (sem email, apenas username)
-- =====================================================

CREATE TABLE public.motoristas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    nome TEXT NOT NULL,
    cpf TEXT UNIQUE NOT NULL,
    telefone TEXT NOT NULL,
    senha TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'ativo', 'inativo')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.motoristas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous driver registration" ON public.motoristas
    FOR INSERT WITH CHECK (status = 'pendente');

CREATE POLICY "Active drivers can view own data" ON public.motoristas
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage all drivers" ON public.motoristas
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- NOVA ESTRUTURA: CLIENTES B2B
-- =====================================================

CREATE TABLE public.b2b_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    cnpj TEXT,
    email TEXT NOT NULL,
    phone TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.b2b_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "B2B clients can view own data" ON public.b2b_clients
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "B2B clients can update own data" ON public.b2b_clients
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Allow insert for authenticated users" ON public.b2b_clients
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all B2B clients" ON public.b2b_clients
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- NOVA ESTRUTURA: ENDEREÇOS DE COLETA
-- =====================================================

CREATE TABLE public.b2b_pickup_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    b2b_client_id UUID REFERENCES public.b2b_clients(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    cep TEXT NOT NULL,
    street TEXT NOT NULL,
    number TEXT NOT NULL,
    complement TEXT,
    neighborhood TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    reference TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.b2b_pickup_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "B2B clients can manage own pickup addresses" ON public.b2b_pickup_addresses
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.b2b_clients WHERE id = b2b_pickup_addresses.b2b_client_id AND user_id = auth.uid())
    );

CREATE POLICY "Admins can manage all pickup addresses" ON public.b2b_pickup_addresses
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- NOVA ESTRUTURA: ENDEREÇOS DE VOLUMES (Destinatários)
-- =====================================================

CREATE TABLE public.b2b_delivery_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    b2b_client_id UUID REFERENCES public.b2b_clients(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    recipient_phone TEXT NOT NULL,
    recipient_document TEXT,
    cep TEXT NOT NULL,
    street TEXT NOT NULL,
    number TEXT NOT NULL,
    complement TEXT,
    neighborhood TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    reference TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.b2b_delivery_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "B2B clients can manage own delivery addresses" ON public.b2b_delivery_addresses
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.b2b_clients WHERE id = b2b_delivery_addresses.b2b_client_id AND user_id = auth.uid())
    );

CREATE POLICY "Admins can manage all delivery addresses" ON public.b2b_delivery_addresses
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- NOVA ESTRUTURA: ENVIOS B2B
-- =====================================================

CREATE TABLE public.b2b_shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    b2b_client_id UUID REFERENCES public.b2b_clients(id) ON DELETE CASCADE NOT NULL,
    tracking_code TEXT UNIQUE,
    pickup_address_id UUID REFERENCES public.b2b_pickup_addresses(id),
    delivery_date DATE NOT NULL,
    total_volumes INTEGER NOT NULL DEFAULT 1,
    total_weight NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    vehicle_type TEXT CHECK (vehicle_type IN ('moto', 'carro', 'caminhao')),
    status TEXT NOT NULL DEFAULT 'AGUARDANDO_PAGAMENTO' CHECK (status IN (
        'AGUARDANDO_PAGAMENTO',
        'PENDENTE',
        'ACEITO',
        'COLETADO',
        'A_CAMINHO_CD',
        'EM_TRIAGEM',
        'AGUARDANDO_EXPEDICAO',
        'DESPACHADO',
        'CONCLUIDO',
        'DEVOLUCAO'
    )),
    motorista_coleta_id UUID REFERENCES public.motoristas(id),
    motorista_entrega_id UUID REFERENCES public.motoristas(id),
    payment_data JSONB,
    observations TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.b2b_shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "B2B clients can view own shipments" ON public.b2b_shipments
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.b2b_clients WHERE id = b2b_shipments.b2b_client_id AND user_id = auth.uid())
    );

CREATE POLICY "B2B clients can create own shipments" ON public.b2b_shipments
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.b2b_clients WHERE id = b2b_shipments.b2b_client_id AND user_id = auth.uid())
    );

CREATE POLICY "Drivers can view all shipments" ON public.b2b_shipments
    FOR SELECT USING (true);

CREATE POLICY "Drivers can update shipments" ON public.b2b_shipments
    FOR UPDATE USING (true);

CREATE POLICY "Admins can manage all shipments" ON public.b2b_shipments
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- NOVA ESTRUTURA: VOLUMES INDIVIDUAIS
-- =====================================================

CREATE TABLE public.b2b_volumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    b2b_shipment_id UUID REFERENCES public.b2b_shipments(id) ON DELETE CASCADE NOT NULL,
    eti_code TEXT UNIQUE NOT NULL,
    volume_number INTEGER NOT NULL,
    weight NUMERIC(10,2) NOT NULL,
    delivery_address_id UUID REFERENCES public.b2b_delivery_addresses(id),
    recipient_name TEXT NOT NULL,
    recipient_phone TEXT NOT NULL,
    recipient_document TEXT,
    recipient_cep TEXT NOT NULL,
    recipient_street TEXT NOT NULL,
    recipient_number TEXT NOT NULL,
    recipient_complement TEXT,
    recipient_neighborhood TEXT NOT NULL,
    recipient_city TEXT NOT NULL,
    recipient_state TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDENTE' CHECK (status IN (
        'PENDENTE',
        'ACEITO',
        'COLETADO',
        'A_CAMINHO_CD',
        'EM_TRIAGEM',
        'AGUARDANDO_EXPEDICAO',
        'DESPACHADO',
        'CONCLUIDO',
        'DEVOLUCAO'
    )),
    motorista_coleta_id UUID REFERENCES public.motoristas(id),
    motorista_entrega_id UUID REFERENCES public.motoristas(id),
    foto_entrega_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.b2b_volumes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "B2B clients can view own volumes" ON public.b2b_volumes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.b2b_shipments s
            JOIN public.b2b_clients c ON s.b2b_client_id = c.id
            WHERE s.id = b2b_volumes.b2b_shipment_id AND c.user_id = auth.uid()
        )
    );

CREATE POLICY "System can create volumes" ON public.b2b_volumes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update volumes" ON public.b2b_volumes
    FOR UPDATE USING (true);

CREATE POLICY "Anyone can view volumes" ON public.b2b_volumes
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage all volumes" ON public.b2b_volumes
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- NOVA ESTRUTURA: HISTÓRICO DE STATUS
-- =====================================================

CREATE TABLE public.b2b_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    volume_id UUID REFERENCES public.b2b_volumes(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL,
    motorista_id UUID REFERENCES public.motoristas(id),
    motorista_nome TEXT,
    observacoes TEXT,
    is_alert BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.b2b_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view status history" ON public.b2b_status_history
    FOR SELECT USING (true);

CREATE POLICY "System can insert status history" ON public.b2b_status_history
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can manage status history" ON public.b2b_status_history
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- USUÁRIOS CD (Admin do Centro de Distribuição)
-- =====================================================

CREATE TABLE public.cd_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.cd_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CD users can view own data" ON public.cd_users
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage CD users" ON public.cd_users
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- SEQUÊNCIA GLOBAL PARA ETI CODES
-- =====================================================

DROP SEQUENCE IF EXISTS public.eti_code_seq;
CREATE SEQUENCE public.eti_code_seq START WITH 1 INCREMENT BY 1;

-- Função para gerar ETI code
CREATE OR REPLACE FUNCTION public.generate_eti_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    next_val INTEGER;
BEGIN
    SELECT nextval('public.eti_code_seq') INTO next_val;
    RETURN 'ETI-' || LPAD(next_val::TEXT, 4, '0');
END;
$$;

-- Função para gerar tracking code B2B
CREATE OR REPLACE FUNCTION public.generate_b2b_tracking_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        new_code := 'B2B-' || UPPER(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
        SELECT EXISTS(SELECT 1 FROM public.b2b_shipments WHERE tracking_code = new_code) INTO code_exists;
        EXIT WHEN NOT code_exists;
    END LOOP;
    RETURN new_code;
END;
$$;

-- Trigger para gerar tracking code automaticamente
CREATE OR REPLACE FUNCTION public.set_b2b_tracking_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.tracking_code IS NULL THEN
        NEW.tracking_code := public.generate_b2b_tracking_code();
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_b2b_tracking_code_trigger ON public.b2b_shipments;
CREATE TRIGGER set_b2b_tracking_code_trigger
    BEFORE INSERT ON public.b2b_shipments
    FOR EACH ROW
    EXECUTE FUNCTION public.set_b2b_tracking_code();

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_b2b_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_b2b_shipments_updated_at ON public.b2b_shipments;
CREATE TRIGGER update_b2b_shipments_updated_at
    BEFORE UPDATE ON public.b2b_shipments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_b2b_updated_at();

DROP TRIGGER IF EXISTS update_b2b_volumes_updated_at ON public.b2b_volumes;
CREATE TRIGGER update_b2b_volumes_updated_at
    BEFORE UPDATE ON public.b2b_volumes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_b2b_updated_at();

-- Trigger para hash de senha do motorista
CREATE OR REPLACE FUNCTION public.hash_motorista_senha()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.senha IS NOT NULL AND NOT (NEW.senha ~ '^\$2[abxy]?\$\d+\$') THEN
        NEW.senha := crypt(NEW.senha, gen_salt('bf', 8));
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hash_motorista_senha_trigger ON public.motoristas;
CREATE TRIGGER hash_motorista_senha_trigger
    BEFORE INSERT OR UPDATE OF senha ON public.motoristas
    FOR EACH ROW
    EXECUTE FUNCTION public.hash_motorista_senha();

-- Função para autenticar motorista por username
CREATE OR REPLACE FUNCTION public.authenticate_motorista_username(p_username TEXT, p_password TEXT)
RETURNS TABLE(id UUID, nome TEXT, username TEXT, telefone TEXT, status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.nome,
        m.username,
        m.telefone,
        m.status
    FROM public.motoristas m
    WHERE m.username = p_username 
      AND m.senha = crypt(p_password, m.senha)
      AND m.status = 'ativo';
END;
$$;