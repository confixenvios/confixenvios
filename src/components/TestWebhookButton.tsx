import { Button } from "@/components/ui/button";
import { TestTube } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TestWebhookButtonProps {
  shipmentId: string;
}

const TestWebhookButton = ({ shipmentId }: TestWebhookButtonProps) => {
  const { toast } = useToast();

  const handleTestWebhook = async () => {
    try {
      // Simulate external TMS system responding with label data
      const { data, error } = await supabase.functions.invoke('webhook-tms', {
        body: {
          shipmentId: shipmentId,
          cteKey: "35200214200166000187550000000000123456789",
          labelPdfUrl: "https://example.com/sample-label.pdf",
          status: "LABEL_AVAILABLE"
        }
      });

      if (error) throw error;

      toast({
        title: "Teste de Webhook Executado",
        description: "O webhook foi simulado com sucesso. Verifique o status da remessa."
      });

      // Refresh the page to show updated status
      window.location.reload();
    } catch (error) {
      console.error('Error testing webhook:', error);
      toast({
        title: "Erro no Teste",
        description: "Não foi possível executar o teste do webhook.",
        variant: "destructive"
      });
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleTestWebhook}
      className="gap-2"
    >
      <TestTube className="h-4 w-4" />
      Simular Webhook TMS
    </Button>
  );
};

export default TestWebhookButton;