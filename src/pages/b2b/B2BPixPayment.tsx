import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Zap, Copy, QrCode, Clock } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const B2BPixPayment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [paymentIntent, setPaymentIntent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(300);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('PENDING');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { amount, shipmentData } = location.state || {};
  
  useEffect(() => {
    if (!amount || !shipmentData) {
      navigate('/b2b-expresso/nova-remessa');
      return;
    }
    
    createPixPayment();
  }, [amount, shipmentData]);

  useEffect(() => {
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

  useEffect(() => {
    if (!paymentIntent?.paymentId || paymentStatus === 'PAID') return;
    
    const pollInterval = setInterval(async () => {
      await checkPaymentStatus();
    }, 3000);

    const timeout = setTimeout(() => {
      clearInterval(pollInterval);
    }, 10 * 60 * 1000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  }, [paymentIntent?.paymentId, paymentStatus]);

  const createPixPayment = async () => {
    try {
      setIsLoading(true);
      
      const pixData = {
        name: shipmentData?.clientName || "Cliente B2B",
        phone: shipmentData?.clientPhone || "(00) 00000-0000",
        email: shipmentData?.clientEmail || "cliente@b2b.com",
        cpf: shipmentData?.clientDocument || "000.000.000-00",
        amount,
        description: `B2B Expresso - ${shipmentData?.volumeCount} volumes`,
        userId: shipmentData?.userId || null,
        isB2B: true,
        b2bData: {
          clientId: shipmentData?.clientId,
          volumeCount: shipmentData?.volumeCount,
          volumeWeights: shipmentData?.volumeWeights,
          totalWeight: shipmentData?.totalWeight,
          deliveryDate: shipmentData?.deliveryDate,
          vehicleType: shipmentData?.vehicleType,
          volumeAddresses: shipmentData?.volumeAddresses,
          pickupAddress: shipmentData?.pickupAddress
        }
      };

      const { data, error } = await supabase.functions.invoke('create-pix-payment', {
        body: pixData
      });

      if (error) {
        toast({
          title: "Erro ao gerar PIX",
          description: error.message || "Erro desconhecido",
          variant: "destructive"
        });
        return;
      }

      if (!data || !data.success) {
        toast({
          title: "Erro ao gerar PIX",
          description: data?.error || "Resposta inválida da API",
          variant: "destructive"
        });
        return;
      }

      setPaymentIntent(data);
      
    } catch (error: any) {
      toast({
        title: "Erro ao gerar PIX", 
        description: error.message || "Erro interno",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/b2b-expresso/nova-remessa');
  };

  const copyPixCode = () => {
    const pixCode = paymentIntent?.pixCode || '';
    navigator.clipboard.writeText(pixCode);
    toast({
      title: "Código PIX copiado!",
      description: "Cole no seu app do banco para realizar o pagamento."
    });
  };

  const checkPaymentStatus = async () => {
    if (!paymentIntent?.paymentId || isCheckingPayment || paymentStatus === 'PAID') return;
    
    try {
      setIsCheckingPayment(true);
      
      const { data, error } = await supabase.functions.invoke('check-pix-status', {
        body: { paymentId: paymentIntent.paymentId, isB2B: true }
      });

      if (error) return;

      if (data?.success && data.isPaid) {
        setPaymentStatus('PAID');
        // Remessa B2B é criada automaticamente pela edge function check-pix-status
        navigate('/b2b-expresso/dashboard', {
          state: { paymentSuccess: true }
        });
      }
      
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    } finally {
      setIsCheckingPayment(false);
    }
  };

  const createB2BShipment = async () => {
    try {
      const { error } = await supabase
        .from('b2b_shipments')
        .insert({
          b2b_client_id: shipmentData.clientId,
          volume_count: shipmentData.volumeCount,
          delivery_date: shipmentData.deliveryDate,
          status: 'PENDENTE',
          observations: JSON.stringify({
            vehicle_type: shipmentData.vehicleType,
            volume_addresses: shipmentData.volumeAddresses,
            volume_weights: shipmentData.volumeWeights,
            total_weight: shipmentData.totalWeight,
            pickup_address: shipmentData.pickupAddress,
            amount_paid: amount,
            paid: true,
            paid_at: new Date().toISOString()
          })
        });

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao criar remessa B2B:', error);
    }
  };

  const handleManualCheck = async () => {
    if (!paymentIntent?.paymentId) return;
    
    try {
      setIsCheckingPayment(true);
      
      toast({
        title: "Verificando pagamento...",
        description: "Aguarde enquanto verificamos o status do PIX."
      });
      
      const { data, error } = await supabase.functions.invoke('check-pix-status', {
        body: { paymentId: paymentIntent.paymentId, isB2B: true }
      });

      if (error) {
        toast({
          title: "Erro ao verificar",
          description: "Não foi possível verificar o status do pagamento.",
          variant: "destructive"
        });
        return;
      }

      if (data?.success && data.isPaid) {
        setPaymentStatus('PAID');
        toast({
          title: "Pagamento confirmado!",
          description: "PIX processado com sucesso. Redirecionando..."
        });
        // Remessa B2B é criada automaticamente pela edge function check-pix-status
        navigate('/b2b-expresso/dashboard', {
          state: { paymentSuccess: true }
        });
      } else {
        toast({
          title: "PIX ainda pendente",
          description: `Status atual: ${data.status}. Tente novamente em alguns instantes.`,
          variant: "destructive"
        });
      }
      
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro interno ao verificar status.",
        variant: "destructive"
      });
    } finally {
      setIsCheckingPayment(false);
    }
  };

  const handleConcluir = async () => {
    try {
      setIsProcessing(true);
      
      const { data } = await supabase.functions.invoke('check-pix-status', {
        body: { paymentId: paymentIntent.paymentId, isB2B: true }
      });
      
      if (data?.isPaid) {
        await createB2BShipment();
        toast({
          title: "Pagamento confirmado!",
          description: "Sua solicitação foi registrada com sucesso."
        });
        navigate('/b2b-expresso/dashboard', {
          state: { paymentSuccess: true }
        });
      } else {
        toast({
          title: "Pagamento pendente",
          description: "O PIX ainda não foi confirmado. Aguarde ou tente novamente.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erro ao processar",
        description: "Erro ao processar o pagamento. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
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
                {shipmentData?.volumeCount} volumes - {shipmentData?.totalWeight?.toFixed(2)}kg total
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              QR Code PIX
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
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

        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                {isCheckingPayment ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    Verificando pagamento...
                  </>
                ) : (
                  <>
                    <div className="h-2 w-2 bg-yellow-500 rounded-full animate-pulse"></div>
                    Aguardando pagamento
                  </>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleManualCheck}
                  variant="outline"
                  disabled={isCheckingPayment}
                  className="flex-1"
                >
                  Verificar Status
                </Button>
                
                <Button 
                  onClick={handleConcluir}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? 'Processando...' : 'Concluir'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default B2BPixPayment;
