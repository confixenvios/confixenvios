import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreditCard, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  isDefault: boolean;
}

interface SavedCardsSelectorProps {
  onCardSelected: (paymentMethodId: string) => void;
  onNewCard: () => void;
  disabled?: boolean;
}

const SavedCardsSelector = ({ onCardSelected, onNewCard, disabled = false }: SavedCardsSelectorProps) => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedCard, setSelectedCard] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('list-payment-methods');
      
      if (error) throw error;
      
      setPaymentMethods(data.paymentMethods || []);
      
      // Auto-select first card if available
      if (data.paymentMethods && data.paymentMethods.length > 0) {
        const defaultCard = data.paymentMethods.find((pm: PaymentMethod) => pm.isDefault) || data.paymentMethods[0];
        setSelectedCard(defaultCard.id);
        onCardSelected(defaultCard.id);
      }
    } catch (error: any) {
      console.error('Error loading payment methods:', error);
      setError('Erro ao carregar métodos de pagamento');
    } finally {
      setLoading(false);
    }
  };

  const getBrandIcon = (brand: string) => {
    switch (brand.toLowerCase()) {
      case 'visa':
        return '💳';
      case 'mastercard':
        return '💳';
      case 'amex':
      case 'american_express':
        return '💳';
      default:
        return '💳';
    }
  };

  const formatBrand = (brand: string) => {
    switch (brand.toLowerCase()) {
      case 'visa':
        return 'Visa';
      case 'mastercard':
        return 'Mastercard';
      case 'amex':
      case 'american_express':
        return 'American Express';
      default:
        return brand.charAt(0).toUpperCase() + brand.slice(1);
    }
  };

  const handleCardChange = (cardId: string) => {
    if (cardId === 'new') {
      onNewCard();
    } else {
      setSelectedCard(cardId);
      onCardSelected(cardId);
    }
  };

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>Carregando métodos de pagamento...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-6">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CreditCard className="w-5 h-5" />
          <span>Método de Pagamento</span>
        </CardTitle>
        <CardDescription>
          Escolha um cartão salvo ou adicione um novo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={selectedCard}
          onValueChange={handleCardChange}
          disabled={disabled}
          className="space-y-3"
        >
          {paymentMethods.map((method) => (
            <div key={method.id} className="flex items-center space-x-3">
              <RadioGroupItem value={method.id} id={method.id} />
              <Label
                htmlFor={method.id}
                className="flex items-center justify-between flex-1 p-3 border border-border rounded-lg cursor-pointer hover:bg-accent/50"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getBrandIcon(method.brand)}</span>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">
                        {formatBrand(method.brand)} •••• {method.last4}
                      </span>
                      {method.isDefault && (
                        <Badge variant="secondary" className="text-xs">
                          Padrão
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Expira em {method.exp_month.toString().padStart(2, '0')}/{method.exp_year}
                    </p>
                  </div>
                </div>
              </Label>
            </div>
          ))}

          <div className="flex items-center space-x-3">
            <RadioGroupItem value="new" id="new" />
            <Label
              htmlFor="new"
              className="flex items-center justify-between flex-1 p-3 border border-dashed border-border rounded-lg cursor-pointer hover:bg-accent/50"
            >
              <div className="flex items-center space-x-3">
                <Plus className="w-6 h-6 text-muted-foreground" />
                <div>
                  <span className="font-medium">Adicionar Novo Cartão</span>
                  <p className="text-sm text-muted-foreground">
                    Cadastre um novo método de pagamento
                  </p>
                </div>
              </div>
            </Label>
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  );
};

export default SavedCardsSelector;