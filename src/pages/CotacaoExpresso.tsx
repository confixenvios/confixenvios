import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import QuoteForm from "@/components/QuoteForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, Clock, MapPin } from "lucide-react";

const CotacaoExpresso = () => {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Truck className="h-12 w-12 text-primary mr-4" />
            <h1 className="text-4xl md:text-6xl font-bold text-foreground">
              Expresso GYN
            </h1>
          </div>
          <p className="text-xl text-muted-foreground mb-6 max-w-2xl mx-auto">
            Coleta e entrega rápida em Goiânia e região
          </p>
          
          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
            <div className="flex flex-col items-center p-6 bg-card rounded-lg border">
              <Clock className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold mb-2">Entrega Rápida</h3>
              <p className="text-sm text-muted-foreground text-center">
                Coleta e entrega no mesmo dia ou próximo dia útil
              </p>
            </div>
            <div className="flex flex-col items-center p-6 bg-card rounded-lg border">
              <MapPin className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold mb-2">Cobertura Regional</h3>
              <p className="text-sm text-muted-foreground text-center">
                Atendemos Goiânia e toda região metropolitana
              </p>
            </div>
            <div className="flex flex-col items-center p-6 bg-card rounded-lg border">
              <Truck className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold mb-2">Serviço Especializado</h3>
              <p className="text-sm text-muted-foreground text-center">
                Dedicado exclusivamente para entregas expressas
              </p>
            </div>
          </div>
        </div>

        {/* Quote Form */}
        <Card className="max-w-4xl mx-auto shadow-card">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Faça sua Cotação Expresso</CardTitle>
            <p className="text-muted-foreground">
              Obtenha o melhor preço para sua entrega expressa em Goiânia
            </p>
          </CardHeader>
          <CardContent>
            <QuoteForm />
          </CardContent>
        </Card>
      </main>
      
      {/* Footer */}
      <footer className="bg-card border-t mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-sm text-muted-foreground">
            <p>&copy; 2024 Confix Envios. Todos os direitos reservados.</p>
            <div className="mt-4 space-x-4">
              <a href="/motorista/registro" className="hover:text-primary transition-colors">
                Cadastro de Motorista
              </a>
              <a href="/motorista" className="hover:text-primary transition-colors">
                Portal do Motorista
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CotacaoExpresso;