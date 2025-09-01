import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Package, ArrowRight } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";

const PaymentSuccessStripe = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [isProcessing, setIsProcessing] = useState(true);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  useEffect(() => {
    if (sessionId) {
      // Simulate payment confirmation process
      setTimeout(() => {
        setPaymentConfirmed(true);
        setIsProcessing(false);
      }, 2000);
    } else {
      setIsProcessing(false);
    }
  }, [sessionId]);

  const handleGoToDashboard = () => {
    navigate('/');
  };

  const handleTrackShipment = () => {
    navigate('/rastreamento');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/80 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-green-500/10 rounded-full">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Pagamento Realizado com Sucesso!
          </h1>
          <p className="text-muted-foreground">
            Seu envio foi processado e está sendo preparado
          </p>
        </div>

        {/* Payment Status */}
        <Card className="border-border/50 mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" />
              Status do Pedido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Pagamento</span>
              <Badge variant="default" className="bg-green-500">
                Confirmado
              </Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Etiqueta</span>
              <Badge variant="secondary">
                {isProcessing ? "Processando..." : "Aguardando"}
              </Badge>
            </div>

            {sessionId && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">ID da Sessão</span>
                <span className="text-sm font-mono">{sessionId.slice(-8)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card className="border-border/50 mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Próximos Passos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-semibold text-primary">1</span>
              </div>
              <div>
                <p className="font-medium">Processamento do pedido</p>
                <p className="text-sm text-muted-foreground">
                  Estamos gerando sua etiqueta de envio
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-semibold text-primary">2</span>
              </div>
              <div>
                <p className="font-medium">Preparação para envio</p>
                <p className="text-sm text-muted-foreground">
                  Você receberá um email com os detalhes e código de rastreamento
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-semibold text-primary">3</span>
              </div>
              <div>
                <p className="font-medium">Acompanhe seu envio</p>
                <p className="text-sm text-muted-foreground">
                  Use o código de rastreamento para acompanhar a entrega
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid gap-3">
          <Button 
            onClick={handleGoToDashboard}
            className="w-full h-12 text-base font-semibold"
          >
            Voltar ao Início
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          
          <Button 
            variant="outline"
            onClick={handleTrackShipment}
            className="w-full h-12 text-base"
          >
            Rastrear Envio
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessStripe;