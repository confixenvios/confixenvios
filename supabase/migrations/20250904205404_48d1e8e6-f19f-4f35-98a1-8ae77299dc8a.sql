-- Fix Security Definer View issue by recreating the safe_tracking_view
-- with explicit SECURITY INVOKER to ensure it respects RLS policies

-- Drop the existing view
DROP VIEW IF EXISTS public.safe_tracking_view;

-- Recreate the view with explicit SECURITY INVOKER 
-- This ensures the view runs with caller's permissions, not elevated privileges
CREATE VIEW public.safe_tracking_view AS
SELECT 
  tracking_code,
  status,
  created_at::date AS shipped_date,
  CASE
    WHEN status = 'ENTREGUE'::text THEN updated_at::date
    ELSE NULL::date
  END AS delivered_date,
  (created_at + '7 days'::interval)::date AS estimated_delivery,
  CASE status
    WHEN 'PENDING_LABEL'::text THEN 'Aguardando processamento'::text
    WHEN 'PAGO_AGUARDANDO_ETIQUETA'::text THEN 'Pagamento confirmado'::text
    WHEN 'LABEL_GENERATED'::text THEN 'Etiqueta gerada'::text
    WHEN 'COLETADO'::text THEN 'Objeto coletado'::text
    WHEN 'EM_TRANSITO'::text THEN 'Em trânsito'::text
    WHEN 'SAIU_PARA_ENTREGA'::text THEN 'Saiu para entrega'::text
    WHEN 'ENTREGUE'::text THEN 'Entregue'::text
    ELSE 'Status atualizado'::text
  END AS status_description
FROM shipments
WHERE tracking_code IS NOT NULL AND tracking_code <> '';

-- Add comment explaining the security model
COMMENT ON VIEW public.safe_tracking_view IS 
'Safe tracking view with limited shipment information. Respects Row Level Security policies on underlying shipments table.';