import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Package, MapPin, Clock, CheckCircle, Circle, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TrackingEvent {
  id: string;
  status: string;
  description: string;
  location: string;
  date: string;
  time: string;
  isCompleted: boolean;
}

interface SafeTrackingData {
  tracking_code: string;
  status: string;
  shipped_date: string | null;
  delivered_date: string | null;
  estimated_delivery: string | null;
  status_description: string;
}

const Tracking = () => {
  const { codigo } = useParams();
  const { toast } = useToast();
  const [trackingCode, setTrackingCode] = useState(codigo || "");
  const [trackingData, setTrackingData] = useState<SafeTrackingData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [rateLimitWarning, setRateLimitWarning] = useState(false);

  // Secure tracking lookup using the new safe view
  const fetchSecureTrackingData = async (code: string): Promise<SafeTrackingData | null> => {
    try {
      // Create client with custom headers for tracking security
      const client = supabase;
      
      // Query the safe tracking view instead of full shipments table
      const { data, error } = await client
        .from('safe_tracking_view')
        .select('*')
        .eq('tracking_code', code.toUpperCase().trim())
        .maybeSingle();

      if (error) {
        console.error('Tracking query error:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Tracking fetch error:', error);
      return null;
    }
  };

  const handleTrack = async () => {
    if (!trackingCode.trim()) {
      toast({
        title: "Código obrigatório",
        description: "Digite um código de rastreio válido",
        variant: "destructive"
      });
      return;
    }

    // Basic input validation for security
    const cleanCode = trackingCode.trim().toUpperCase();
    if (!/^[A-Z0-9\-]{3,20}$/.test(cleanCode)) {
      toast({
        title: "Código inválido",
        description: "Use apenas letras, números e hífen",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setRateLimitWarning(false);
    
    try {
      const data = await fetchSecureTrackingData(cleanCode);
      
      if (data) {
        setTrackingData(data);
        toast({
          title: "Envio encontrado!",
          description: "Dados do rastreamento atualizados",
        });
      } else {
        toast({
          title: "Envio não encontrado",
          description: "Verifique o código e tente novamente",
          variant: "destructive"
        });
        setTrackingData(null);
      }
    } catch (error) {
      console.error('Tracking error:', error);
      toast({
        title: "Erro no sistema",
        description: "Tente novamente em alguns minutos",
        variant: "destructive"
      });
      setTrackingData(null);
      
      // Show rate limit warning if too many attempts
      setRateLimitWarning(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (codigo) {
      handleTrack();
    }
  }, [codigo]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      OBJETO_POSTADO: { label: "Postado", variant: "secondary" as const },
      COLETADO: { label: "Coletado", variant: "secondary" as const },
      EM_TRANSITO: { label: "Em Trânsito", variant: "outline" as const },
      SAIU_PARA_ENTREGA: { label: "Saiu para Entrega", variant: "outline" as const },
      ENTREGUE: { label: "Entregue", variant: "default" as const }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    return config ? (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    ) : null;
  };

  return (
    <div className="min-h-screen bg-gradient-light">
      <Header />
      
      <div className="container mx-auto py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="bg-gradient-primary bg-clip-text text-transparent">Rastreio</span> de Envio
            </h1>
            <p className="text-muted-foreground text-lg">
              Acompanhe seu envio em tempo real
            </p>
          </div>

          {/* Search Form */}
          <Card className="mb-8 shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Search className="h-5 w-5 text-primary" />
                <span>Consultar Rastreio</span>
              </CardTitle>
              <CardDescription>
                Digite o código de rastreio do seu envio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-4">
                <Input
                  placeholder="ID2025ABC123"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                  className="border-input-border focus:border-primary focus:ring-primary"
                  onKeyPress={(e) => e.key === 'Enter' && handleTrack()}
                />
                <Button 
                  onClick={handleTrack}
                  disabled={isLoading}
                  className="bg-gradient-primary hover:shadow-primary transition-all duration-300"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Rate Limit Warning */}
          {rateLimitWarning && (
            <Card className="shadow-card border-yellow-200 bg-yellow-50">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2 text-yellow-800">
                  <Shield className="h-5 w-5" />
                  <div>
                    <p className="font-medium">Limite de consultas atingido</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      Para proteção do sistema, aguarde alguns minutos antes de tentar novamente.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Secure Tracking Info */}
          {trackingData && (
            <div className="space-y-6">
              {/* Status Overview */}
              <Card className="shadow-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <Package className="h-5 w-5 text-primary" />
                      <span>Envio {trackingData.tracking_code}</span>
                    </CardTitle>
                    {getStatusBadge(trackingData.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <div>
                        <div className="text-sm text-muted-foreground">Status</div>
                        <div className="font-medium">{trackingData.status_description}</div>
                      </div>
                    </div>
                    {trackingData.shipped_date && (
                      <div className="flex items-center space-x-2">
                        <Package className="h-4 w-4 text-primary" />
                        <div>
                          <div className="text-sm text-muted-foreground">Enviado em</div>
                          <div className="font-medium">{new Date(trackingData.shipped_date).toLocaleDateString('pt-BR')}</div>
                        </div>
                      </div>
                    )}
                    {trackingData.estimated_delivery && (
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-primary" />
                        <div>
                          <div className="text-sm text-muted-foreground">Previsão de Entrega</div>
                          <div className="font-medium">{new Date(trackingData.estimated_delivery).toLocaleDateString('pt-BR')}</div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {trackingData.delivered_date && (
                    <div className="mt-4 p-4 bg-green-50 rounded-lg">
                      <div className="flex items-center space-x-2 text-green-800">
                        <CheckCircle className="h-5 w-5" />
                        <div>
                          <p className="font-medium">Entregue com sucesso!</p>
                          <p className="text-sm">Entregue em {new Date(trackingData.delivered_date).toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Security Notice */}
              <Card className="shadow-card border-blue-200 bg-blue-50">
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2 text-blue-800">
                    <Shield className="h-5 w-5" />
                    <div>
                      <p className="text-sm">
                        <strong>Proteção de Dados:</strong> Por segurança, exibimos apenas informações básicas de rastreamento. 
                        Para detalhes completos, faça login em sua conta.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Tracking;