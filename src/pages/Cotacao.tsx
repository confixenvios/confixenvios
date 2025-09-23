import Header from "@/components/Header";
import QuoteForm from "@/components/QuoteForm";
import { Truck, Zap, Package } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";

const Cotacao = () => {
  const { user, loading } = useAuth();

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
        <div className="container mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm sm:text-base text-muted-foreground">
              © 2025 Confix Envios. Todos os direitos reservados.
            </p>
            
            <div className="flex items-center gap-4 text-sm">
              <Link 
                to="/motorista/registro" 
                className="text-primary hover:underline flex items-center gap-1"
              >
                <Truck className="h-4 w-4" />
                Seja um Motorista
              </Link>
              <Link 
                to="/motorista/auth" 
                className="text-muted-foreground hover:text-primary hover:underline"
              >
                Portal do Motorista
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Cotacao;