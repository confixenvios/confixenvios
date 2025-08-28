import Header from "@/components/Header";
import QuoteForm from "@/components/QuoteForm";
import { Truck, Clock, Shield } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-dark">
      <Header />
      
      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-glow opacity-20"></div>
        
        <div className="container mx-auto text-center relative">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Envie com
            <span className="bg-gradient-primary bg-clip-text text-transparent ml-3">
              Confiança
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Calcule fretes, compare preços e acompanhe suas encomendas em tempo real
          </p>
          
          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 max-w-4xl mx-auto">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-16 h-16 bg-card rounded-full flex items-center justify-center shadow-card">
                <Truck className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Melhor Preço</h3>
              <p className="text-muted-foreground text-center">
                Compare opções e escolha a mais econômica
              </p>
            </div>
            
            <div className="flex flex-col items-center space-y-3">
              <div className="w-16 h-16 bg-card rounded-full flex items-center justify-center shadow-card">
                <Clock className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Entrega Rápida</h3>
              <p className="text-muted-foreground text-center">
                Opções de entrega expressa disponíveis
              </p>
            </div>
            
            <div className="flex flex-col items-center space-y-3">
              <div className="w-16 h-16 bg-card rounded-full flex items-center justify-center shadow-card">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Rastreio Completo</h3>
              <p className="text-muted-foreground text-center">
                Acompanhe seu envio em tempo real
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Quote Form Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <QuoteForm />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="container mx-auto text-center">
          <p className="text-muted-foreground">
            © 2025 Confix Envios. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;