import Header from "@/components/Header";
import QuoteForm from "@/components/QuoteForm";
import { Truck, Clock, Shield, Zap, Package, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const { user, loading } = useAuth();
  const [isTestingShipment, setIsTestingShipment] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Função de teste para simular criação de remessa
  const testShipmentCreation = async () => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para testar.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsTestingShipment(true);
      console.log('🧪 TESTE: Iniciando criação de remessa simulada');

      // Dados simulados para teste
      const testShipmentData = {
        user_id: user.id,
        sender_address_id: null,
        recipient_address_id: null,
        weight: 1,
        length: 20,
        width: 15,
        height: 10,
        format: 'package',
        pickup_option: 'collection',
        selected_option: 'standard',
        quote_data: {
          totalPrice: 10,
          test: true
        },
        payment_data: {
          method: 'pix',
          payment_id: 'test_' + Date.now(),
          amount: 10,
          confirmed_at: new Date().toISOString()
        },
        status: 'PAYMENT_CONFIRMED'
      };

      console.log('🧪 TESTE: Dados da remessa:', testShipmentData);

      const { data: newShipment, error: shipmentError } = await supabase
        .from('shipments')
        .insert(testShipmentData)
        .select()
        .single();

      if (shipmentError) {
        console.error('🧪 TESTE: Erro ao criar remessa:', shipmentError);
        throw shipmentError;
      }

      console.log('🧪 TESTE: Remessa criada com sucesso:', newShipment);
      
      toast({
        title: "✅ Teste Concluído!",
        description: `Remessa de teste criada: ID ${newShipment.id}`,
      });

      // Redirecionar para remessas
      navigate('/cliente/remessas');

    } catch (error) {
      console.error('🧪 TESTE: Erro:', error);
      toast({
        title: "❌ Teste Falhou",
        description: "Erro ao criar remessa de teste: " + error.message,
        variant: "destructive"
      });
    } finally {
      setIsTestingShipment(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-light flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-light">
      <Header />
      
      {/* Hero Section */}
      <section className="relative py-12 sm:py-16 md:py-20 px-2 sm:px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-glow opacity-30"></div>
        
        <div className="container mx-auto text-center relative">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-bold mb-4 sm:mb-6 leading-tight px-2">
            Envie suas encomendas com
            <span className="bg-gradient-primary bg-clip-text text-transparent block">
              rapidez e economia
            </span>
          </h1>
          
          {/* Botão de Teste para DEBUG */}
          {user && (
            <div className="mb-6">
              <Button
                onClick={testShipmentCreation}
                disabled={isTestingShipment}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3"
              >
                {isTestingShipment ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Testando...
                  </>
                ) : (
                  '🧪 TESTE: Criar Remessa Simulada'
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Botão de teste para verificar se o fluxo de criação de remessa funciona
              </p>
            </div>
          )}
          
          <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-8 sm:mb-12 md:mb-16 max-w-3xl mx-auto px-2">
            O melhor preço, o menor prazo e a máxima segurança para suas entregas.
          </p>
          
          {/* Benefícios */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 mb-8 sm:mb-12 md:mb-16 max-w-5xl mx-auto px-2">
            <div className="flex flex-col items-center space-y-3 sm:space-y-4 p-4 sm:p-6 bg-card/50 backdrop-blur-sm rounded-2xl border border-border/20 shadow-card">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Zap className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-center">Cotação Instantânea</h3>
              <p className="text-sm sm:text-base text-muted-foreground text-center">
                Tenha o melhor preço do mercado em segundos, sem complicação.
              </p>
            </div>
            
            <div className="flex flex-col items-center space-y-3 sm:space-y-4 p-4 sm:p-6 bg-card/50 backdrop-blur-sm rounded-2xl border border-border/20 shadow-card">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Truck className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-center">Melhor Custo-Benefício</h3>
              <p className="text-sm sm:text-base text-muted-foreground text-center">
                Preço justo, entrega rápida e segura. Tudo o que você precisa em um só lugar.
              </p>
            </div>
            
            <div className="flex flex-col items-center space-y-3 sm:space-y-4 p-4 sm:p-6 bg-card/50 backdrop-blur-sm rounded-2xl border border-border/20 shadow-card sm:col-span-2 lg:col-span-1">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Package className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-center">Rastreamento Completo</h3>
              <p className="text-sm sm:text-base text-muted-foreground text-center">
                Acompanhe sua encomenda do envio à entrega, com atualizações em tempo real.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Quote Form Section */}
      <section className="py-8 sm:py-12 md:py-16 px-1 sm:px-2 md:px-4">
        <div className="container mx-auto">
          <QuoteForm />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6 sm:py-8 px-2 sm:px-4">
        <div className="container mx-auto text-center">
          <p className="text-sm sm:text-base text-muted-foreground">
            © 2025 Confix Envios. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;