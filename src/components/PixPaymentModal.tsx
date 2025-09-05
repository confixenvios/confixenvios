import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QrCode, Copy, Check, CheckCircle, Clock, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface PixPaymentModalProps {
  open: boolean;
  onClose: () => void;
  amount: number;
  description?: string;
}

interface PixData {
  pixCode: string;
  qrCodeImage?: string;
  paymentId: string;
  amount: number;
  expiresAt: string;
  webhookUrl?: string;
}

const PixPaymentModal: React.FC<PixPaymentModalProps> = ({ 
  open, 
  onClose, 
  amount, 
  description 
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<'form' | 'qrcode' | 'paid'>('form');
  const [loading, setLoading] = useState(false);
  const [loadingUserData, setLoadingUserData] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'checking' | 'paid'>('pending');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    cpf: ''
  });

  // Carregar dados do usuário automaticamente quando o modal abrir
  useEffect(() => {
    const loadUserData = async () => {
      if (open && user?.id) {
        setLoadingUserData(true);
        try {
          console.log('Carregando dados do usuário:', user.id);
          
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

          if (error) {
            console.error('Erro ao carregar perfil:', error);
            return;
          }

          if (profile) {
            console.log('Dados do perfil carregados:', profile);
            
            // Formatar o documento (CPF ou CNPJ) se existir
            const formattedDocument = profile.document ? formatDocument(profile.document) : '';
            
            setFormData({
              name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || '',
              phone: profile.phone || '',
              email: profile.email || user.email || '',
              cpf: formattedDocument
            });
            
            toast.success('Dados carregados do seu perfil!');
          }
        } catch (error) {
          console.error('Erro ao buscar dados do usuário:', error);
        } finally {
          setLoadingUserData(false);
        }
      }
    };

    loadUserData();
  }, [open, user?.id, user?.email]);

  const formatDocument = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      // CPF: 000.000.000-00
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else {
      // CNPJ: 00.000.000/0000-00
      return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const handleInputChange = (field: string, value: string) => {
    let formattedValue = value;
    
    if (field === 'cpf') {
      formattedValue = formatDocument(value);
    } else if (field === 'phone') {
      formattedValue = formatPhone(value);
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: formattedValue
    }));
  };

  const validateForm = () => {
    const { name, phone, email, cpf } = formData;
    
    if (!name.trim()) {
      toast.error('Nome é obrigatório');
      return false;
    }
    
    if (!email.trim() || !email.includes('@')) {
      toast.error('E-mail válido é obrigatório');
      return false;
    }
    
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
      toast.error('Telefone válido é obrigatório');
      return false;
    }
    
    const docNumbers = cpf.replace(/\D/g, '');
    if (!cpf.trim() || (docNumbers.length !== 11 && docNumbers.length !== 14)) {
      toast.error('CPF ou CNPJ válido é obrigatório');
      return false;
    }
    
    return true;
  };

  const handleCreateQRCode = async () => {
    if (!validateForm()) return;

    setLoading(true);
    
    try {
      console.log('🔵 Iniciando criação do PIX...');
      
      // Buscar dados completos da cotação no sessionStorage
      const currentShipment = JSON.parse(sessionStorage.getItem('currentShipment') || '{}');
      const documentData = JSON.parse(sessionStorage.getItem('documentData') || '{}');
      
      console.log('📦 Dados da cotação encontrados:', currentShipment);
      console.log('📄 Dados do documento encontrados:', documentData);
      
      if (!currentShipment.quoteData) {
        toast.error('Dados da cotação não encontrados. Reinicie o processo.');
        return;
      }
      
      const pixPayload = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        cpf: formData.cpf,
        amount: amount,
        description: description || 'Pagamento via PIX - Confix Envios',
        userId: user?.id || null,
        // Enviar dados completos da cotação para salvar na temp_quotes
        quoteData: currentShipment,
        documentData: documentData
      };
      
      console.log('📤 Enviando payload completo:', pixPayload);

      const { data, error } = await supabase.functions.invoke('create-pix-payment', {
        body: pixPayload
      });

      console.log('📥 Resposta recebida:', { data, error });

      if (error) {
        console.error('❌ Erro da função:', error);
        toast.error(error.message || 'Erro ao gerar código PIX');
        return;
      }

      if (data && data.success) {
        console.log('✅ PIX criado com sucesso:', data);
        console.log('🔍 Debug QR Code:', {
          hasQrCodeImage: !!data.qrCodeImage,
          qrCodeImageLength: data.qrCodeImage?.length || 0,
          qrCodeImagePrefix: data.qrCodeImage?.substring(0, 50) || 'N/A'
        });
        setPixData(data);
        setStep('qrcode');
        toast.success('QR Code PIX gerado com sucesso!');
      } else {
        console.error('❌ Resposta inválida:', data);
        const errorMessage = data?.error || 'Erro desconhecido ao gerar PIX';
        toast.error(errorMessage);
      }
      
    } catch (error) {
      console.error('💥 Erro na criação do PIX:', error);
      toast.error('Erro ao processar pagamento PIX');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPixCode = async () => {
    if (pixData?.pixCode) {
      try {
        await navigator.clipboard.writeText(pixData.pixCode);
        setCopied(true);
        toast.success('Código PIX copiado!');
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        toast.error('Erro ao copiar código');
      }
    }
  };

  // Sistema MELHORADO de detecção de pagamento PIX
  useEffect(() => {
    if (step !== 'qrcode' || !pixData?.paymentId || paymentStatus !== 'pending') return;

    console.log('🎯 Iniciando sistema MELHORADO de detecção PIX');
    console.log('📊 Dados:', { pixId: pixData.paymentId, amount, externalId: pixData.externalId });
    
    let isMounted = true;
    let supabaseChannel: any;
    let pollInterval: NodeJS.Timeout;

    setPaymentStatus('checking');

    const setupEnhancedDetection = async () => {
      try {
        // 1. Canal real-time melhorado
        console.log('📡 Configurando detecção real-time...');
        supabaseChannel = supabase
          .channel(`pix-detection-${pixData.paymentId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'shipments'
            },
            (payload) => {
              console.log('🚛 Nova remessa detectada:', payload);
              
              if (!isMounted) return;

              const shipment = payload.new;
              const paymentData = shipment.payment_data;

              // Verificar se é o nosso pagamento PIX
              if (paymentData?.method === 'PIX') {
                const matches = 
                  paymentData?.pixData?.externalId === pixData.paymentId ||
                  paymentData?.pixData?.orderId === pixData.paymentId ||
                  paymentData?.externalId === pixData.paymentId ||
                  paymentData?.pixPaymentId === pixData.paymentId;

                if (matches) {
                  console.log('✅ PAGAMENTO DETECTADO via real-time!');
                  handleDetectedPayment(shipment);
                }
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'temp_quotes'
            },
            (payload) => {
              console.log('📋 Update em temp_quotes:', payload);
              
              if (!isMounted) return;

              const quote = payload.new;
              if (quote.status === 'processed' && quote.external_id === pixData.paymentId) {
                console.log('✅ Quote processada! Buscando remessa...');
                setTimeout(checkForExistingShipment, 2000);
              }
            }
          )
          .subscribe();

        // 2. Polling agressivo da API
        let attempts = 0;
        const maxAttempts = 360; // 30 minutos
        
        const aggressivePolling = async () => {
          if (!isMounted || attempts >= maxAttempts) return;
          
          attempts++;
          const mins = Math.floor((attempts * 5) / 60);
          const secs = (attempts * 5) % 60;
          
          console.log(`🔄 Tentativa ${attempts}/${maxAttempts} (${mins}m${secs}s)`);

          try {
            // Verificar API do Abacate Pay
            const { data: status, error } = await supabase.functions.invoke('check-pix-status', {
              body: { paymentId: pixData.paymentId }
            });

            console.log('📊 Status API:', status);

            if (!error && status?.isPaid) {
              console.log('🎉 PAGO confirmado pela API!');
              if (isMounted) {
                handleDetectedPayment();
              }
              return;
            }

            // Verificar banco de dados
            await checkForExistingShipment();

            // Continuar polling
            if (isMounted && attempts < maxAttempts) {
              pollInterval = setTimeout(aggressivePolling, 5000);
            }

          } catch (error) {
            console.error('❌ Erro no polling:', error);
            if (isMounted && attempts < maxAttempts) {
              pollInterval = setTimeout(aggressivePolling, 5000);
            }
          }
        };

        // 3. Verificar remessas existentes
        const checkForExistingShipment = async () => {
          try {
            console.log('🔍 Verificando remessas existentes...');

            const { data: shipments } = await supabase
              .from('shipments')
              .select('*')
              .not('payment_data', 'is', null)
              .or(`payment_data->pixData->>externalId.eq.${pixData.paymentId},payment_data->pixData->>orderId.eq.${pixData.paymentId},payment_data->>pixPaymentId.eq.${pixData.paymentId}`)
              .order('created_at', { ascending: false })
              .limit(3);

            if (shipments && shipments.length > 0) {
              const paidShipment = shipments.find(s => 
                s.payment_data?.status === 'PAID' || 
                s.status === 'PENDING_PICKUP'
              ) || shipments[0];
              
              console.log('✅ Remessa encontrada no banco!', paidShipment);
              if (isMounted) {
                handleDetectedPayment(paidShipment);
              }
              return true;
            }
            return false;
          } catch (error) {
            console.error('❌ Erro ao buscar remessas:', error);
            return false;
          }
        };

        // Iniciar sistema
        aggressivePolling();
        setTimeout(checkForExistingShipment, 1000);

      } catch (error) {
        console.error('❌ Erro na configuração:', error);
      }
    };

    const handleDetectedPayment = (shipmentData?: any) => {
      console.log('🎉 PROCESSANDO PAGAMENTO DETECTADO!', shipmentData);
      
      if (!isMounted) return;

      setPaymentStatus('paid');
      handleClose();
      
      toast.success('🎉 Pagamento PIX confirmado! Remessa criada com sucesso!', {
        duration: 3000
      });

      setTimeout(() => {
        const shipment = shipmentData || JSON.parse(sessionStorage.getItem('currentShipment') || '{}');
        
        navigate('/pix-sucesso', {
          state: {
            paymentId: pixData.paymentId,
            amount: amount,
            shipmentData: shipment,
            trackingCode: shipment?.tracking_code || 'Processando...',
            success: true
          }
        });
      }, 1000);
    };

    setupEnhancedDetection();

    // Cleanup
    return () => {
      console.log('🧹 Limpeza do sistema de detecção...');
      isMounted = false;
      if (pollInterval) clearTimeout(pollInterval);
      if (supabaseChannel) supabase.removeChannel(supabaseChannel);
    };
  }, [step, pixData, paymentStatus, handleClose, navigate, toast]);
            
            handleClose();
            toast.success('Pagamento confirmado! Redirecionando...', {
              duration: 1500
            });
            
            setTimeout(() => {
              const currentShipment = JSON.parse(sessionStorage.getItem('currentShipment') || '{}');
              navigate('/pix-sucesso', {
                state: {
                  paymentId: pixData.paymentId,
                  amount: amount,
                  shipmentData: currentShipment
                }
              });
            }, 500);
          }
        } catch (error) {
          console.error('Erro ao verificar pagamento:', error);
        }
      };

      // Verificar a cada 5 segundos
      const interval = setInterval(checkPayment, 5000);

      return () => {
        supabase.removeChannel(channel);
        clearInterval(interval);
      };
    }
  }, [step, pixData?.paymentId, paymentStatus]);

  const handleClose = () => {
    setStep('form');
    setPixData(null);
    setPaymentStatus('pending');
    setFormData({ name: '', phone: '', email: '', cpf: '' });
    setCopied(false);
    onClose();
  };

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
        <Input
          id="phone"
          value={formData.phone}
          onChange={(e) => handleInputChange('phone', e.target.value)}
          placeholder="(11) 99999-9999"
          maxLength={15}
          disabled={loadingUserData}
        />
      </div>

      <div>
        <Label htmlFor="cpf">CPF/CNPJ</Label>
        <Input
          id="cpf"
          value={formData.cpf}
          onChange={(e) => handleInputChange('cpf', e.target.value)}
          placeholder="000.000.000-00 ou 00.000.000/0000-00"
          maxLength={18}
          disabled={loadingUserData}
        />
      </div>

      <div className="bg-muted p-4 rounded-lg">
        <p className="text-sm font-medium">Valor do Pagamento:</p>
        <p className="text-2xl font-bold text-primary">
          R$ {amount.toFixed(2).replace('.', ',')}
        </p>
      </div>

      <Button 
        onClick={handleCreateQRCode} 
        className="w-full"
        disabled={loading || loadingUserData}
      >
        {loading ? 'Gerando QR Code...' : loadingUserData ? 'Carregando dados...' : 'Gerar QR Code PIX'}
      </Button>
    </div>
  );

  const renderQRCode = () => (
    <div className="space-y-4 text-center">
      <div className="flex justify-center">
        {pixData?.qrCodeImage ? (
          <div className="relative">
            <img 
              src={pixData.qrCodeImage} 
              alt="QR Code PIX" 
              className="w-64 h-64 border rounded-lg object-contain bg-white"
              onError={(e) => {
                console.error('Erro ao carregar QR Code:', e);
                e.currentTarget.style.display = 'none';
              }}
              onLoad={() => {
                console.log('✅ QR Code carregado com sucesso');
              }}
            />
            {/* Fallback se a imagem não carregar */}
            <div 
              className="absolute inset-0 flex items-center justify-center bg-muted border rounded-lg"
              style={{ display: 'none' }}
              id="qr-fallback"
            >
              <div className="text-center">
                <QrCode className="h-16 w-16 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  QR Code temporariamente indisponível
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-64 h-64 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-border">
            <div className="text-center">
              <QrCode className="h-16 w-16 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Carregando QR Code...</p>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Escaneie o QR Code ou copie o código PIX:
        </p>
        
        <div className="bg-muted p-3 rounded-lg break-all text-sm font-mono max-h-24 overflow-auto">
          {pixData?.pixCode || 'Carregando código PIX...'}
        </div>
        
        <Button
          variant="outline"
          onClick={handleCopyPixCode}
          className="w-full"
          disabled={!pixData?.pixCode}
        >
          {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
          {copied ? 'Copiado!' : 'Copiar Código PIX'}
        </Button>
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          {paymentStatus === 'checking' ? (
            <Clock className="h-4 w-4 text-yellow-600 animate-spin" />
          ) : (
            <Clock className="h-4 w-4 text-yellow-600" />
          )}
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            {paymentStatus === 'checking' 
              ? 'Aguardando pagamento...' 
              : 'Aguardando pagamento'
            }
          </p>
        </div>
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          <strong>Importante:</strong> Este PIX expira em 30 minutos.
          Após o pagamento, você será redirecionado automaticamente.
        </p>
      </div>
    </div>
  );

  const renderPaid = () => (
    <div className="space-y-6 text-center">
      <div className="flex justify-center">
        <CheckCircle className="h-16 w-16 text-green-500" />
      </div>

      <div className="space-y-2">
        <h3 className="text-xl font-bold text-green-700 dark:text-green-400">
          Pagamento Recebido! 🎉
        </h3>
        <p className="text-muted-foreground">
          Seu pagamento PIX foi processado com sucesso.
        </p>
      </div>

      <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
        <div className="space-y-2 text-sm">
          <p className="font-medium text-green-800 dark:text-green-200">
            Valor pago: R$ {amount.toFixed(2).replace('.', ',')}
          </p>
          <p className="text-green-700 dark:text-green-300">
            Sua remessa foi criada automaticamente e você receberá as informações de rastreamento em breve.
          </p>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Próximos passos:</strong><br />
          • Você receberá um e-mail com o código de rastreamento<br />
          • Prepare sua embalagem para coleta<br />
          • Acompanhe o status da sua remessa no painel
        </p>
      </div>

      <Button onClick={handleClose} className="w-full">
        Finalizar
      </Button>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'paid' ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                Pagamento Aprovado
              </>
            ) : (
              <>
                <QrCode className="h-5 w-5" />
                {step === 'form' ? 'Pagamento PIX' : 'QR Code PIX'}
              </>
            )}
          </DialogTitle>
        </DialogHeader>
        
        {step === 'form' && renderForm()}
        {step === 'qrcode' && renderQRCode()}
        {step === 'paid' && renderPaid()}
      </DialogContent>
    </Dialog>
  );
};

export default PixPaymentModal;