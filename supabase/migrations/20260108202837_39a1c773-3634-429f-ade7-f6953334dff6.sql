-- Enum para prioridade de tickets
CREATE TYPE public.ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Enum para status de tickets
CREATE TYPE public.ticket_status AS ENUM ('open', 'pending', 'in_progress', 'resolved', 'closed');

-- Enum para categoria de tickets
CREATE TYPE public.ticket_category AS ENUM ('technical', 'billing', 'general', 'feedback', 'complaint');

-- Tabela de tickets de suporte
CREATE TABLE public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    ticket_number TEXT UNIQUE NOT NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    category ticket_category NOT NULL DEFAULT 'general',
    priority ticket_priority NOT NULL DEFAULT 'medium',
    status ticket_status NOT NULL DEFAULT 'open',
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    sla_due_at TIMESTAMP WITH TIME ZONE,
    first_response_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de mensagens/respostas dos tickets
CREATE TABLE public.ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    message TEXT NOT NULL,
    is_internal BOOLEAN NOT NULL DEFAULT false,
    is_from_support BOOLEAN NOT NULL DEFAULT false,
    attachment_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de configurações de SLA
CREATE TABLE public.sla_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    priority ticket_priority NOT NULL UNIQUE,
    first_response_hours INTEGER NOT NULL,
    resolution_hours INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inserir configurações padrão de SLA
INSERT INTO public.sla_configs (priority, first_response_hours, resolution_hours) VALUES
('low', 48, 168),
('medium', 24, 72),
('high', 8, 24),
('urgent', 2, 8);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies para support_tickets
CREATE POLICY "Users can view their own tickets"
ON public.support_tickets FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create their own tickets"
ON public.support_tickets FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tickets"
ON public.support_tickets FOR UPDATE
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies para ticket_messages
CREATE POLICY "Users can view messages of their tickets"
ON public.ticket_messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.support_tickets 
        WHERE id = ticket_id 
        AND (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
    AND (is_internal = false OR public.has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Users can create messages on their tickets"
ON public.ticket_messages FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.support_tickets 
        WHERE id = ticket_id 
        AND (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
);

-- RLS Policy para sla_configs (público para leitura)
CREATE POLICY "Anyone can read SLA configs"
ON public.sla_configs FOR SELECT
USING (true);

-- Função para gerar número do ticket
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    new_number TEXT;
    year_prefix TEXT;
    sequence_num INTEGER;
BEGIN
    year_prefix := TO_CHAR(NOW(), 'YYYY');
    SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 6) AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM public.support_tickets
    WHERE ticket_number LIKE year_prefix || '-%';
    
    new_number := year_prefix || '-' || LPAD(sequence_num::TEXT, 6, '0');
    RETURN new_number;
END;
$$;

-- Trigger para gerar número do ticket automaticamente
CREATE OR REPLACE FUNCTION public.set_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.ticket_number IS NULL THEN
        NEW.ticket_number := public.generate_ticket_number();
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_ticket_number
BEFORE INSERT ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.set_ticket_number();

-- Trigger para calcular SLA automaticamente
CREATE OR REPLACE FUNCTION public.calculate_sla_due()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    resolution_hours INTEGER;
BEGIN
    SELECT sc.resolution_hours INTO resolution_hours
    FROM public.sla_configs sc
    WHERE sc.priority = NEW.priority;
    
    NEW.sla_due_at := NEW.created_at + (resolution_hours || ' hours')::INTERVAL;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_calculate_sla
BEFORE INSERT ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.calculate_sla_due();

-- Trigger para atualizar updated_at
CREATE TRIGGER update_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();