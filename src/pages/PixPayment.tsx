import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Zap, Copy, QrCode, Clock } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const PixPayment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [paymentIntent, setPaymentIntent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  
  // Get payment data from location state
  const { amount, shipmentData } = location.state || {};
  
  useEffect(() => {
    if (!amount || !shipmentData) {
      navigate('/pagamento');
      return;
    }
    
    createPixPayment();
  }, [amount, shipmentData]);

  useEffect(() => {
    // Countdown timer
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const createPixPayment = async () => {
    try {
      setIsLoading(true);
      
      // Buscar dados do perfil do usuário
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', 'b28911e8-d3f5-4207-bf25-a43a5a3d92ed')
        .single();
      
      const pixData = {
        name: profile?.first_name && profile?.last_name 
          ? `${profile.first_name} ${profile.last_name}`
          : "Cliente",
        phone: profile?.phone || "62999191438",
        email: profile?.email || "cliente@example.com",
        cpf: profile?.document || "000.000.000-00",
        amount,
        description: `Frete - Envio de ${shipmentData?.weight || 0}kg`,
        userId: 'b28911e8-d3f5-4207-bf25-a43a5a3d92ed'
      };

      console.log('Dados do PIX:', pixData);

      const { data, error } = await supabase.functions.invoke('create-pix-payment', {
        body: pixData
      });

      if (error) {
        console.error('PIX payment error:', error);
        toast({
          title: "Erro ao gerar PIX",
          description: error.message || "Tente novamente em alguns instantes.",
          variant: "destructive"
        });
        navigate('/pagamento');
        return;
      }

      console.log('PIX payment created:', data);
      setPaymentIntent(data);
      
    } catch (error) {
      console.error('PIX payment error:', error);
      toast({
        title: "Erro ao gerar PIX", 
        description: "Tente novamente em alguns instantes.",
        variant: "destructive"
      });
      navigate('/pagamento');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/pagamento');
  };

  const copyPixCode = () => {
    const pixCode = paymentIntent?.pixCode || '';
    navigator.clipboard.writeText(pixCode);
    toast({
      title: "Código PIX copiado!",
      description: "Cole no seu app do banco para realizar o pagamento."
    });
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-background/80 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Gerando PIX...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/80 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={handleBack}
            className="mb-4 hover:bg-background/80"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Pagamento PIX</h1>
          </div>
          <p className="text-muted-foreground">
            Escaneie o QR Code ou copie o código PIX para pagar
          </p>
        </div>

        {/* Payment Info */}
        <Card className="border-border/50 mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              Valor a Pagar
              <Badge variant="secondary" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTime(timeLeft)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">
                R$ {amount?.toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground">
                Frete de {shipmentData?.weight || 0}kg
              </p>
            </div>
          </CardContent>
        </Card>

        {/* QR Code Section */}
        <Card className="border-border/50 mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              QR Code PIX
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              {/* QR Code */}
              {paymentIntent?.qrCodeImage ? (
                <img 
                  src={paymentIntent.qrCodeImage} 
                  alt="QR Code PIX"
                  className="mx-auto w-48 h-48 border-2 border-border rounded-lg"
                />
              ) : (
                <div className="mx-auto w-48 h-48 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-border">
                  <div className="text-center">
                    <QrCode className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Carregando QR Code...</p>
                  </div>
                </div>
              )}
              
              <p className="text-sm text-muted-foreground">
                Abra o app do seu banco e escaneie o código
              </p>
            </div>
          </CardContent>
        </Card>

        {/* PIX Code */}
        <Card className="border-border/50 mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Código PIX</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-mono break-all text-muted-foreground">
                {paymentIntent?.pixCode}
              </p>
            </div>
            
            <Button 
              onClick={copyPixCode}
              variant="outline" 
              className="w-full"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copiar Código PIX
            </Button>
            
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Cole este código no seu app do banco</p>
              <p>• O pagamento é processado instantaneamente</p>
              <p>• Este código expira em {formatTime(timeLeft)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Status Check */}
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              <div className="animate-pulse text-sm text-muted-foreground">
                Aguardando confirmação do pagamento...
              </div>
              
              <Button 
                variant="outline" 
                onClick={() => navigate('/pagamento-sucesso')}
                className="w-full"
              >
                Já Paguei - Verificar Status
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PixPayment;