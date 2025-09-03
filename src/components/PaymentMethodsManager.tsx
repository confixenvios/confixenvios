import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreditCard, Plus, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  isDefault: boolean;
}

const PaymentMethodsManager = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [showAddCard, setShowAddCard] = useState(false);
  const [setupSecret, setSetupSecret] = useState<string>('');
  const [error, setError] = useState('');
  const { toast } = useToast();

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('list-payment-methods');
      
      if (error) throw error;
      
      setPaymentMethods(data.paymentMethods || []);
    } catch (error: any) {
      console.error('Error loading payment methods:', error);
      setError('Erro ao carregar métodos de pagamento');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCard = async () => {
    try {
      setAdding(true);
      const { data, error } = await supabase.functions.invoke('create-setup-intent');
      
      if (error) throw error;
      
      setSetupSecret(data.client_secret);
      setShowAddCard(true);
    } catch (error: any) {
      console.error('Error creating setup intent:', error);
      toast({
        title: "Erro",
        description: "Erro ao preparar adição de cartão",
        variant: "destructive"
      });
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveCard = async (paymentMethodId: string) => {
    try {
      setRemoving(paymentMethodId);
      const { data, error } = await supabase.functions.invoke('remove-payment-method', {
        body: { paymentMethodId }
      });
      
      if (error) throw error;
      
      toast({
        title: "Cartão removido",
        description: "Método de pagamento removido com sucesso"
      });
      
      await loadPaymentMethods();
    } catch (error: any) {
      console.error('Error removing payment method:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover método de pagamento",
        variant: "destructive"
      });
    } finally {
      setRemoving(null);
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

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const handleCardAdded = () => {
    setShowAddCard(false);
    setSetupSecret('');
    loadPaymentMethods();
    toast({
      title: "Cartão adicionado",
      description: "Método de pagamento salvo com sucesso"
    });
  };

  return (
    <Card className="border-border/50 shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5" />
            <span>Métodos de Pagamento</span>
          </div>
          <Button 
            onClick={handleAddCard}
            disabled={adding}
            size="sm"
            className="flex items-center space-x-2"
          >
            {adding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            <span>Adicionar Cartão</span>
          </Button>
        </CardTitle>
        <CardDescription>
          Gerencie seus cartões salvos para pagamentos futuros
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Carregando métodos de pagamento...</span>
          </div>
        ) : paymentMethods.length === 0 ? (
          <div className="text-center py-8">
            <CreditCard className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              Nenhum método de pagamento salvo
            </p>
            <Button onClick={handleAddCard} disabled={adding}>
              {adding ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Adicionar Primeiro Cartão
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg"
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveCard(method.id)}
                  disabled={removing === method.id}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  {removing === method.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add Card Dialog - We'll implement Stripe Elements here */}
        <Dialog open={showAddCard} onOpenChange={setShowAddCard}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Novo Cartão</DialogTitle>
              <DialogDescription>
                Adicione um novo método de pagamento para suas compras futuras
              </DialogDescription>
            </DialogHeader>
            
            {setupSecret && (
              <div className="py-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Para adicionar um cartão, você será redirecionado para uma página segura do Stripe.
                </p>
                
                <div className="flex space-x-2">
                  <Button 
                    onClick={() => {
                      // For now, we'll just close the dialog and show a message
                      // In a full implementation, we'd integrate Stripe Elements here
                      setShowAddCard(false);
                      toast({
                        title: "Funcionalidade em desenvolvimento",
                        description: "A integração completa do Stripe Elements será implementada em breve",
                      });
                    }}
                    className="flex-1"
                  >
                    Continuar para o Stripe
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowAddCard(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default PaymentMethodsManager;