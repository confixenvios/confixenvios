import React, { useState, useEffect } from 'react';
import InputMask from 'react-input-mask';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PhoneInput } from "@/components/ui/phone-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  CreditCard, 
  Barcode, 
  Loader2, 
  CheckCircle, 
  Clock,
  ExternalLink
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface FormData {
  name: string;
  phone: string;
  email: string;
  cpf: string;
}

interface PaymentDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  billingType: 'CREDIT_CARD' | 'BOLETO';
  onPaymentSuccess?: () => void;
}

const PaymentDataModal: React.FC<PaymentDataModalProps> = ({
  isOpen,
  onClose,
  amount,
  billingType,
  onPaymentSuccess
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [loadingUserData, setLoadingUserData] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: '',
    email: '',
    cpf: ''
  });

  const isCreditCard = billingType === 'CREDIT_CARD';
  const title = isCreditCard ? 'Pagamento com Cartão' : 'Pagamento com Boleto';
  const icon = isCreditCard ? CreditCard : Barcode;
  const Icon = icon;

  // Load user data when logged in
  useEffect(() => {
    if (user && isOpen && !formData.name) {
      setLoadingUserData(true);
      
      const loadUserData = async () => {
        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('first_name, last_name, email, phone, document')
            .eq('id', user.id)
            .maybeSingle();

          if (profile && !error) {
            setFormData({
              name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
              phone: profile.phone || '',
              email: profile.email || user.email || '',
              cpf: profile.document || ''
            });
          } else {
            setFormData(prev => ({
              ...prev,
              email: user.email || ''
            }));
          }
        } catch (error) {
          console.error('Error loading user data:', error);
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

  const handleSubmit = async () => {
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
      console.log(`💳 Criando pagamento ${billingType} com dados:`, formData);

      // Get quote data from sessionStorage
      const completeShipmentData = JSON.parse(sessionStorage.getItem('completeShipmentData') || '{}');
      const documentData = JSON.parse(sessionStorage.getItem('documentData') || '{}');

      const paymentPayload = {
        amount: parseFloat(amount.toFixed(2)),
        name: formData.name,
        email: formData.email,
        phone: formData.phone.replace(/\D/g, ''),
        cpf: formData.cpf.replace(/\D/g, ''),
        billingType: billingType,
        description: `Pagamento de frete - R$ ${amount.toFixed(2)}`,
        userId: user?.id || null,
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

      console.log('📋 Payload completo:', paymentPayload);

      const { data, error } = await supabase.functions.invoke('create-asaas-payment', {
        body: paymentPayload
      });

      console.log('🔍 Resposta create-asaas-payment:', { data, error });

      if (error) {
        console.error('❌ Erro na função:', error);
        toast({
          title: "Erro no pagamento",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      if (data && data.success) {
        console.log('✅ Pagamento criado com sucesso:', data);

        if (billingType === 'CREDIT_CARD') {
          // For credit card, redirect to Asaas checkout
          if (data.invoiceUrl) {
            toast({
              title: "Redirecionando...",
              description: "Você será redirecionado para o checkout seguro.",
            });
            window.location.href = data.invoiceUrl;
          } else {
            toast({
              title: "Pagamento processado!",
              description: "Cartão aprovado com sucesso.",
            });
            onPaymentSuccess?.();
            handleClose();
          }
        } else if (billingType === 'BOLETO') {
          // For boleto, open the PDF
          if (data.bankSlipUrl) {
            toast({
              title: "Boleto gerado!",
              description: "O boleto foi aberto em uma nova aba. Vencimento em 3 dias úteis.",
            });
            window.open(data.bankSlipUrl, '_blank');
            onPaymentSuccess?.();
            handleClose();
          } else if (data.invoiceUrl) {
            toast({
              title: "Boleto gerado!",
              description: "Você será redirecionado para visualizar o boleto.",
            });
            window.location.href = data.invoiceUrl;
          } else {
            toast({
              title: "Erro",
              description: "URL do boleto não encontrada",
              variant: "destructive"
            });
          }
        }
      } else {
        const errorMessage = data?.error || 'Erro desconhecido ao processar pagamento';
        toast({
          title: "Erro",
          description: errorMessage,
          variant: "destructive"
        });
      }
      
    } catch (error) {
      console.error('💥 Erro no pagamento:', error);
      toast({
        title: "Erro",
        description: "Erro ao processar pagamento",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: '', phone: '', email: '', cpf: '' });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
        </DialogHeader>

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
            <PhoneInput
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="(00) 0000-0000"
            />
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

          {billingType === 'BOLETO' && (
            <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                📋 O boleto terá vencimento em 3 dias úteis. Após a confirmação do pagamento, sua remessa será processada.
              </p>
            </div>
          )}

          {billingType === 'CREDIT_CARD' && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200 flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Você será redirecionado para o checkout seguro para informar os dados do cartão.
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1"
              disabled={!isFormValid() || loading || loadingUserData}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processando...
                </>
              ) : (
                <>
                  <Icon className="h-4 w-4 mr-2" />
                  {isCreditCard ? 'Pagar com Cartão' : 'Gerar Boleto'}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentDataModal;
