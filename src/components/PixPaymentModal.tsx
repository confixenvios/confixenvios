import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QrCode, Copy, Check, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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

  // Escutar pagamentos aprovados via webhook usando realtime
  useEffect(() => {
    if (step === 'qrcode' && pixData?.paymentId && paymentStatus === 'pending') {
      console.log('🔄 Aguardando confirmação de pagamento via webhook...');
      setPaymentStatus('checking');
      
      const channel = supabase
        .channel('payment-updates')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'shipments',
            filter: `payment_data->>pixPaymentId=eq.${pixData.paymentId}`
          },
          (payload) => {
            console.log('🎉 Pagamento confirmado via webhook!', payload);
            setPaymentStatus('paid');
            setStep('paid');
            toast.success('Pagamento confirmado! Redirecionando...', {
              duration: 2000
            });
            
            // Redirecionar após 2 segundos para mostrar sucesso
            setTimeout(() => {
              handleClose();
              window.location.href = '/pix-sucesso';
            }, 2000);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
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
          Após o pagamento, sua compra será processada automaticamente.
        </p>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setStep('form')} className="flex-1">
          Voltar
        </Button>
        <Button onClick={handleClose} className="flex-1">
          Concluir
        </Button>
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