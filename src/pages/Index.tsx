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

  // Se o usuário estiver logado, mostra a cotação
  if (user) {
    return (
      <div className="min-h-screen bg-gradient-light">
        <Header />
        
        {/* Hero Section for Logged Users */}
        <section className="relative py-12 px-4 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-glow opacity-30"></div>
          
          <div className="container mx-auto text-center relative">
            <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
              Envie com
              <span className="bg-gradient-primary bg-clip-text text-transparent ml-3">
                Confiança
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Calcule fretes, compare preços e acompanhe suas encomendas em tempo real
            </p>
          </div>
        </section>

        {/* Quote Form Section */}
        <section className="py-8 px-4">
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
  }

  // Landing page para usuários não logados
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
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Cote fretes em segundos, escolha a melhor opção e acompanhe tudo em tempo real.
          </p>
          
          <Button asChild size="lg" className="mb-16 text-lg px-8 py-6 shadow-glow">
            <Link to="/auth">
              Entrar e Fazer Cotação
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          
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

      {/* Chamada de Confiança */}
      <section className="py-16 px-4 bg-card/30 backdrop-blur-sm">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Mais do que enviar: oferecemos transparência, economia e praticidade
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Tudo em um único sistema, sem complicação.
          </p>
          
          <Button asChild size="lg" variant="outline" className="text-lg px-8 py-6 border-2 hover:bg-primary hover:text-primary-foreground transition-all duration-300">
            <Link to="/auth">
              Criar Conta Grátis e Enviar Agora
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
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