-- Verificar se o trigger existe e está ativo
SELECT 
  tgname AS trigger_name,
  tgenabled AS enabled,
  pg_get_triggerdef(oid) AS definition
FROM pg_trigger 
WHERE tgname LIKE '%webhook%';

-- Recriar o trigger para garantir que funciona automaticamente para todas as remessas
DROP TRIGGER IF EXISTS trigger_shipment_webhook ON public.shipments;

CREATE OR REPLACE TRIGGER trigger_shipment_webhook
  AFTER INSERT OR UPDATE ON public.shipments
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_shipment_webhook();

-- Garantir que o trigger seja executado para inserções E atualizações de status
COMMENT ON TRIGGER trigger_shipment_webhook ON public.shipments IS 'Dispara webhook automaticamente quando remessa é criada ou status é atualizado para PAID/PAYMENT_CONFIRMED';