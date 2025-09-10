-- Create table for CTE emissions
CREATE TABLE public.cte_emissoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID REFERENCES public.shipments(id),
  remessa_id TEXT NOT NULL, -- ID interno da remessa
  chave_cte TEXT NOT NULL, -- Chave do CT-e
  uuid_cte UUID NOT NULL, -- UUID do CT-e
  serie TEXT NOT NULL, -- Série do CT-e
  numero_cte TEXT NOT NULL, -- Número do CT-e
  status TEXT NOT NULL CHECK (status IN ('aprovado', 'reprovado', 'cancelado', 'processando', 'contingencia')),
  motivo TEXT, -- Motivo (especialmente para reprovações)
  modelo TEXT NOT NULL, -- Modelo do CT-e
  epec BOOLEAN DEFAULT false, -- EPEC (sim/não)
  xml_url TEXT, -- Link para o XML
  dacte_url TEXT, -- Link para o DACTE
  payload_bruto JSONB, -- Payload completo do webhook
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.cte_emissoes ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Admins can manage all CTE emissions" 
ON public.cte_emissoes 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create policy for webhook insertions (system access)
CREATE POLICY "System can insert CTE emissions" 
ON public.cte_emissoes 
FOR INSERT 
WITH CHECK (true);

-- Create policy for webhook updates (system access)
CREATE POLICY "System can update CTE emissions" 
ON public.cte_emissoes 
FOR UPDATE 
USING (true)
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_cte_emissoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_cte_emissoes_updated_at
  BEFORE UPDATE ON public.cte_emissoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cte_emissoes_updated_at();

-- Create indexes for better performance
CREATE INDEX idx_cte_emissoes_shipment_id ON public.cte_emissoes(shipment_id);
CREATE INDEX idx_cte_emissoes_remessa_id ON public.cte_emissoes(remessa_id);
CREATE INDEX idx_cte_emissoes_chave_cte ON public.cte_emissoes(chave_cte);
CREATE INDEX idx_cte_emissoes_status ON public.cte_emissoes(status);
CREATE INDEX idx_cte_emissoes_created_at ON public.cte_emissoes(created_at);
CREATE INDEX idx_cte_emissoes_updated_at ON public.cte_emissoes(updated_at);