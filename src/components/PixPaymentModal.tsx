import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QrCode, Copy, Check, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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
  const [step, setStep] = useState<'form' | 'qrcode' | 'paid'>('form');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'checking' | 'paid'>('pending');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    cpf: ''
  });

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const handleInputChange = (field: string, value: string) => {
    let formattedValue = value;
    
    if (field === 'cpf') {
      formattedValue = formatCPF(value);
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
    
    if (!cpf.trim() || cpf.replace(/\D/g, '').length !== 11) {
      toast.error('CPF válido é obrigatório');
      return false;
    }
    
    return true;
  };

  const handleCreateQRCode = async () => {
    if (!validateForm()) return;

    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-pix-payment', {
        body: {
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          cpf: formData.cpf,
          amount: amount,
          description: description || 'Pagamento via PIX'
        }
      });

      if (error) {
        console.error('Erro ao criar PIX:', error);
        toast.error('Erro ao gerar código PIX');
        return;
      }

      if (data.success) {
        setPixData(data);
        setStep('qrcode');
        toast.success('QR Code PIX gerado com sucesso!');
      } else {
        console.error('Erro da API:', data);
        const errorMessage = data.error || data.details || 'Erro ao gerar PIX';
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Erro:', error);
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

  // Polling para verificar status do pagamento
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (step === 'qrcode' && pixData?.paymentId && paymentStatus === 'pending') {
      setPaymentStatus('checking');
      
      const checkPaymentStatus = async () => {
        try {
          const { data, error } = await supabase.functions.invoke('check-pix-status', {
            body: { paymentId: pixData.paymentId }
          });

          if (error) {
            console.error('Erro ao verificar status:', error);
            return;
          }

          if (data.success && data.isPaid) {
            setPaymentStatus('paid');
            setStep('paid');
            toast.success('Pagamento recebido com sucesso! 🎉');
            clearInterval(intervalId);
          }
        } catch (error) {
          console.error('Erro ao verificar pagamento:', error);
        }
      };

      // Verificar imediatamente
      checkPaymentStatus();
      
      // Verificar a cada 5 segundos
      intervalId = setInterval(checkPaymentStatus, 5000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
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
      <div>
        <Label htmlFor="name">Nome Completo</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          placeholder="Seu nome completo"
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
        />
      </div>

      <div>
        <Label htmlFor="cpf">CPF</Label>
        <Input
          id="cpf"
          value={formData.cpf}
          onChange={(e) => handleInputChange('cpf', e.target.value)}
          placeholder="000.000.000-00"
          maxLength={14}
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
        disabled={loading}
      >
        {loading ? 'Gerando QR Code...' : 'Gerar QR Code PIX'}
      </Button>
    </div>
  );

  const renderQRCode = () => (
    <div className="space-y-4 text-center">
      {pixData?.qrCodeImage && (
        <div className="flex justify-center">
          <img 
            src={pixData.qrCodeImage} 
            alt="QR Code PIX" 
            className="w-64 h-64 border rounded-lg"
          />
        </div>
      )}

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Escaneie o QR Code ou copie o código PIX:
        </p>
        
        <div className="bg-muted p-3 rounded-lg break-all text-sm font-mono">
          {pixData?.pixCode}
        </div>
        
        <Button
          variant="outline"
          onClick={handleCopyPixCode}
          className="w-full"
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