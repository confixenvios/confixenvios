import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import InputMask from 'react-input-mask';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  CreditCard, 
  QrCode, 
  Copy, 
  CheckCircle, 
  Clock, 
  Loader2, 
  AlertCircle, 
  User,
  Mail,
  Phone,
  FileText
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface PixData {
  pixCode: string;
  qrCodeImage: string;
  paymentId: string;
}

interface FormData {
  name: string;
  phone: string;
  email: string;
  cpf: string;
}

interface PixPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  onPaymentSuccess?: () => void;
}

const PixPaymentModal: React.FC<PixPaymentModalProps> = ({
  isOpen,
  onClose,
  amount,
  onPaymentSuccess
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [step, setStep] = useState<'form' | 'qrcode'>('form');
  const [loading, setLoading] = useState(false);
  const [loadingUserData, setLoadingUserData] = useState(false);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [copied, setCopied] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'checking' | 'paid'>('pending');
  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: '',
    email: '',
    cpf: ''
  });

  // Carregar dados do usuário quando logado
  useEffect(() => {
    if (user && isOpen && !formData.name) {
      console.log('🔄 Carregando dados do usuário logado...');
      setLoadingUserData(true);
      
      const loadUserData = async () => {
        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('first_name, last_name, email, phone, document')
            .eq('id', user.id)
            .maybeSingle();

          if (profile && !error) {
            console.log('✅ Dados do perfil carregados:', profile);
            setFormData({
              name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
              phone: profile.phone || '',
              email: profile.email || user.email || '',
              cpf: profile.document || ''
            });
          } else {
            console.log('ℹ️ Usando dados básicos do usuário');
            setFormData(prev => ({
              ...prev,
              email: user.email || ''
            }));
          }
        } catch (error) {
          console.error('❌ Erro ao carregar dados do usuário:', error);
        } finally {
          setLoadingUserData(false);
        }
      };

      loadUserData();
    }
  }, [user, isOpen, formData.name]);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isFormValid = () => {
    return formData.name.trim() !== '' &&
           formData.phone.trim() !== '' &&
           formData.email.trim() !== '' &&
           formData.cpf.trim() !== '';
  };

  const handleFormSubmit = async () => {
    if (!isFormValid()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      console.log('💳 Criando pagamento PIX com dados:', formData);

      // Recuperar dados completos da cotação do sessionStorage
      const completeShipmentData = JSON.parse(sessionStorage.getItem('completeShipmentData') || '{}');
      const documentData = JSON.parse(sessionStorage.getItem('documentData') || '{}');
      
      console.log('Dados completos recuperados:', completeShipmentData);
      console.log('Dados do documento:', documentData);

      // Preparar dados para PIX com TODOS os dados da cotação
      const pixPayload = {
        amount: Math.round(amount), // Valor em reais
        name: formData.name,
        email: formData.email,
        phone: formData.phone.replace(/\D/g, ''),
        cpf: formData.cpf.replace(/\D/g, ''),
        description: `Pagamento de frete - R$ ${amount.toFixed(2)}`,
        userId: user?.id || null,
        // Adicionar dados completos da cotação
        quoteData: {
          senderData: completeShipmentData.addressData?.sender || {},
          recipientData: completeShipmentData.addressData?.recipient || {},
          formData: completeShipmentData.originalFormData || {},
          selectedOption: completeShipmentData.deliveryDetails?.selectedOption || 'standard',
          pickupOption: completeShipmentData.deliveryDetails?.pickupOption || 'dropoff',
          quoteData: completeShipmentData.quoteData || {},
          totalMerchandiseValue: completeShipmentData.merchandiseDetails?.totalValue || amount,
          pickupDetails: completeShipmentData.deliveryDetails?.pickupDetails || {}
        },
        documentData: documentData
      };

      console.log('📋 Payload PIX completo:', pixPayload);

      const { data, error } = await supabase.functions.invoke('create-pix-payment', {
        body: pixPayload
      });

      console.log('🔍 Resposta create-pix-payment:', { data, error });

      if (error) {
        console.error('❌ Erro na função PIX:', error);
        toast({
          title: "Erro no PIX",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      if (data && data.success) {
        console.log('✅ PIX criado com sucesso:', data);
        setPixData(data);
        setStep('qrcode');
        toast({
          title: "PIX gerado",
          description: "QR Code PIX gerado com sucesso!"
        });
      } else {
        console.error('❌ Resposta inválida:', data);
        const errorMessage = data?.error || 'Erro desconhecido ao gerar PIX';
        toast({
          title: "Erro",
          description: errorMessage,
          variant: "destructive"
        });
      }
      
    } catch (error) {
      console.error('💥 Erro na criação do PIX:', error);
      toast({
        title: "Erro",
        description: "Erro ao processar pagamento PIX",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPixCode = async () => {
    if (pixData?.pixCode) {
      try {
        await navigator.clipboard.writeText(pixData.pixCode);
        setCopied(true);
        toast({
          title: "Copiado",
          description: "Código PIX copiado!"
        });
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        toast({
          title: "Erro",
          description: "Erro ao copiar código",
          variant: "destructive"
        });
      }
    }
  };

  const handleClose = () => {
    setStep('form');
    setPixData(null);
    setPaymentStatus('pending');
    setFormData({ name: '', phone: '', email: '', cpf: '' });
    setCopied(false);
    onClose();
  };

  // Função para processar sucesso do pagamento (disponível globalmente)
  const processPaymentSuccess = () => {
    console.log('🎉 Pagamento PIX confirmado!');
    
    setPaymentStatus('paid');
    
    toast({
      title: "Pagamento confirmado!",
      description: "PIX confirmado! Redirecionando..."
    });

    // Fechar modal e redirecionar
    setTimeout(() => {
      handleClose();
      navigate('/pix-sucesso', {
        state: {
          paymentId: pixData?.paymentId,
          amount: amount,
          trackingCode: 'Processando...',
          success: true
        }
      });
    }, 500);
  };

  // Sistema de verificação PIX APRIMORADO - mais frequente + fallback manual
  useEffect(() => {
    if (step !== 'qrcode' || !pixData?.paymentId || paymentStatus !== 'pending') return;

    console.log('🎯 Iniciando verificação PIX APRIMORADA para:', pixData.paymentId);
    setPaymentStatus('checking');

    let isMounted = true;
    let pollInterval: NodeJS.Timeout;

    // Verificação mais agressiva inicialmente
    let attempts = 0;
    const maxAttempts = 600; // 20 minutos total
    
    const checkPaymentViaAPI = async () => {
      if (!isMounted || attempts >= maxAttempts) {
        if (attempts >= maxAttempts) {
          console.log('⏰ Tempo limite atingido para verificação automática');
          toast({
            title: "Verificação pausada",
            description: "Use o botão 'Verificar Pagamento' se já fez o PIX.",
            variant: "default"
          });
        }
        return;
      }
      
      attempts++;
      
      // Intervalo dinâmico: 2s nos primeiros 2 minutos, depois 5s
      const interval = attempts < 60 ? 2000 : 5000;
      const totalSeconds = (attempts < 60 ? attempts * 2 : 120 + (attempts - 60) * 5);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      
      console.log(`🔍 Verificação ${attempts}/${maxAttempts} (${minutes}m${seconds}s) - Intervalo: ${interval/1000}s`);

      try {
        const { data: response, error } = await supabase.functions.invoke('check-pix-status', {
          body: { paymentId: pixData.paymentId }
        });

        console.log('📊 Resposta completa da API:', response);
        console.log('📊 Status PIX atual:', response?.data?.status);
        console.log('📊 isPaid:', response?.isPaid);
        console.log('📊 Sucesso da resposta:', response?.success);

        if (!error && response?.success && (response?.data?.status === 'PAID' || response?.isPaid === true)) {
          console.log('✅ 🎉 PIX CONFIRMADO PELA API! Processando sucesso...');
          processPaymentSuccess();
          return;
        }

        // Continuar verificação se ainda montado
        if (isMounted && attempts < maxAttempts) {
          pollInterval = setTimeout(checkPaymentViaAPI, interval);
        }

      } catch (error) {
        console.error('❌ Erro na verificação PIX:', error);
        if (isMounted && attempts < maxAttempts) {
          pollInterval = setTimeout(checkPaymentViaAPI, interval);
        }
      }
    };

    // Iniciar verificação imediata
    checkPaymentViaAPI();

    return () => {
      console.log('🧹 Limpando verificação PIX aprimorada...');
      isMounted = false;
      if (pollInterval) clearTimeout(pollInterval);
    };
  }, [step, pixData, paymentStatus, navigate, toast, amount]);

  const renderForm = () => (
    <div className="space-y-4">
      {loadingUserData && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200 flex items-center gap-2">
            <Clock className="h-4 w-4 animate-spin" />
            Carregando seus dados do perfil...
          </p>
        </div>
      )}
      
      {user && !loadingUserData && formData.name && (
        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
          <p className="text-sm text-green-800 dark:text-green-200 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Dados preenchidos automaticamente do seu perfil
          </p>
        </div>
      )}
      
      <div>
        <Label htmlFor="name">Nome Completo</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          placeholder="Seu nome completo"
          disabled={loadingUserData}
        />
      </div>

      <div>
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          placeholder="seu@email.com"
          disabled={loadingUserData}
        />
      </div>

      <div>
        <Label htmlFor="phone">Telefone</Label>
        <InputMask
          mask="(99) 99999-9999"
          value={formData.phone}
          onChange={(e) => handleInputChange('phone', e.target.value)}
          disabled={loadingUserData}
        >
          {(inputProps: any) => (
            <Input
              {...inputProps}
              id="phone"
              type="tel"
              placeholder="(00) 00000-0000"
            />
          )}
        </InputMask>
      </div>

      <div>
        <Label htmlFor="cpf">CPF/CNPJ</Label>
        <InputMask
          mask={formData.cpf.replace(/\D/g, "").length > 11 ? "99.999.999/9999-99" : "999.999.999-99"}
          value={formData.cpf}
          onChange={(e) => handleInputChange('cpf', e.target.value)}
          disabled={loadingUserData}
        >
          {(inputProps: any) => (
            <Input
              {...inputProps}
              id="cpf"
              placeholder="000.000.000-00"
            />
          )}
        </InputMask>
      </div>

      <Separator />

      <div className="bg-accent/20 p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="font-medium">Total a pagar:</span>
          <span className="text-2xl font-bold text-primary">
            R$ {amount.toFixed(2).replace('.', ',')}
          </span>
        </div>
      </div>
    </div>
  );

  const renderQRCode = () => (
    <div className="space-y-6">
      {/* Status do pagamento */}
      <div className="text-center">
        {paymentStatus === 'checking' && (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <span className="text-blue-800 dark:text-blue-200 font-medium">
                Aguardando pagamento...
              </span>
            </div>
            <p className="text-sm text-blue-600 dark:text-blue-400">
              Verificando status do PIX automaticamente
            </p>
          </div>
        )}

        {paymentStatus === 'paid' && (
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-green-800 dark:text-green-200 font-medium">
                Pagamento confirmado!
              </span>
            </div>
            <p className="text-sm text-green-600 dark:text-green-400">
              Redirecionando...
            </p>
          </div>
        )}
      </div>

      {/* QR Code */}
      {pixData?.qrCodeImage && (
        <div className="flex flex-col items-center space-y-4">
          <div className="bg-white p-4 rounded-lg shadow-lg">
            <img 
              src={pixData.qrCodeImage} 
              alt="QR Code PIX"
              className="w-64 h-64 object-contain"
            />
          </div>
          
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Escaneie o código ou copie o PIX Copia e Cola
            </p>
            <Badge variant="secondary" className="text-lg font-mono px-4 py-2">
              R$ {amount.toFixed(2).replace('.', ',')}
            </Badge>
          </div>
        </div>
      )}

      {/* PIX Copia e Cola */}
      {pixData?.pixCode && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">PIX Copia e Cola:</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyPixCode}
              className="text-xs"
              disabled={copied}
            >
              {copied ? (
                <>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-1" />
                  Copiar
                </>
              )}
            </Button>
          </div>
          
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs font-mono break-all text-muted-foreground">
              {pixData.pixCode}
            </p>
          </div>
        </div>
      )}

      {/* Instruções */}
      <div className="bg-accent/10 p-4 rounded-lg">
        <h4 className="font-medium mb-2 flex items-center">
          <AlertCircle className="h-4 w-4 mr-2" />
          Como pagar:
        </h4>
        <ol className="text-sm space-y-1 text-muted-foreground">
          <li>1. Abra o app do seu banco</li>
          <li>2. Escaneie o QR Code ou cole o código PIX</li>
          <li>3. Confirme o pagamento</li>
          <li>4. O status será atualizado automaticamente</li>
        </ol>
      </div>

      {/* Botão PAGUEI - Verificação manual */}
      {paymentStatus === 'checking' && (
        <div className="space-y-3">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-center">
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
              Já fez o pagamento? Verifique manualmente:
            </p>
          </div>
          
          <Button
            variant="default"
            size="lg"
            onClick={async () => {
              try {
                console.log('🔍 🚀 VERIFICAÇÃO MANUAL via botão PAGUEI para:', pixData.paymentId);
                
                toast({
                  title: "Verificando PIX...",
                  description: "Consultando status do pagamento..."
                });
                
                const { data: response, error } = await supabase.functions.invoke('check-pix-status', {
                  body: { paymentId: pixData.paymentId }
                });
                
                console.log('📋 Resposta do botão PAGUEI:', response);
                
                if (!error && response?.success && (response?.data?.status === 'PAID' || response?.isPaid === true)) {
                  console.log('✅ 🎉 PIX CONFIRMADO via botão PAGUEI!');
                  processPaymentSuccess();
                } else {
                  console.log('⏳ PIX ainda pendente via botão PAGUEI');
                  toast({
                    title: "Pagamento não confirmado ainda",
                    description: "Aguarde alguns instantes e tente novamente. A verificação automática continua ativa.",
                    variant: "default"
                  });
                }
              } catch (error) {
                console.error('❌ Erro no botão PAGUEI:', error);
                toast({
                  title: "Erro na verificação",
                  description: "Tente novamente em alguns segundos.",
                  variant: "destructive"
                });
              }
            }}
            className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-semibold text-base"
          >
            <CheckCircle className="h-5 w-5 mr-2" />
            PAGUEI
          </Button>
          
          <p className="text-center text-xs text-muted-foreground">
            Verificação automática ativa a cada 2 segundos
          </p>
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <QrCode className="h-5 w-5" />
            <span>Pagamento PIX</span>
          </DialogTitle>
        </DialogHeader>

        {step === 'form' && (
          <div className="space-y-4">
            {renderForm()}
            
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleFormSubmit}
                disabled={!isFormValid() || loading || loadingUserData}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Gerando PIX...
                  </>
                ) : (
                  <>
                    <QrCode className="h-4 w-4 mr-2" />
                    Gerar PIX
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'qrcode' && paymentStatus !== 'paid' && (
          <div className="space-y-4">
            {renderQRCode()}
          </div>
        )}

        {step === 'qrcode' && paymentStatus === 'paid' && (
          <div className="text-center space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
                Pagamento Confirmado!
              </h3>
              <p className="text-sm text-green-600 dark:text-green-400">
                Redirecionando para página de sucesso...
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PixPaymentModal;