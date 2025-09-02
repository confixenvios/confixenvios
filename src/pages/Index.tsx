import Header from "@/components/Header";
import QuoteForm from "@/components/QuoteForm";
import { Truck, Clock, Shield, Zap, Package, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Index = () => {
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
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-glow opacity-30"></div>
        
        <div className="container mx-auto text-center relative">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Envie suas encomendas com
            <span className="bg-gradient-primary bg-clip-text text-transparent block">
              rapidez e economia
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-16 max-w-3xl mx-auto">
            Cote fretes em segundos, escolha a melhor opção e acompanhe tudo em tempo real.
          </p>
          
          {/* Benefícios */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 max-w-5xl mx-auto">
            <div className="flex flex-col items-center space-y-4 p-6 bg-card/50 backdrop-blur-sm rounded-2xl border border-border/20 shadow-card">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Zap className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Cotação Rápida em 1 Minuto</h3>
              <p className="text-muted-foreground text-center">
                Compare preços instantaneamente e descubra o frete mais barato para sua entrega.
              </p>
            </div>
            
            <div className="flex flex-col items-center space-y-4 p-6 bg-card/50 backdrop-blur-sm rounded-2xl border border-border/20 shadow-card">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Truck className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Entrega Ágil e Segura</h3>
              <p className="text-muted-foreground text-center">
                Escolha opções expressas ou econômicas, sempre com rastreio atualizado.
              </p>
            </div>
            
            <div className="flex flex-col items-center space-y-4 p-6 bg-card/50 backdrop-blur-sm rounded-2xl border border-border/20 shadow-card">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Package className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Rastreamento Completo</h3>
              <p className="text-muted-foreground text-center">
                Acompanhe cada etapa da sua remessa, do envio à entrega final, direto no painel.
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