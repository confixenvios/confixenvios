import QuoteForm from '@/components/QuoteForm';
import PaymentTestRunner from '@/components/PaymentTestRunner';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, TestTube } from "lucide-react";

const ClientCotacoes = () => {
  return (
    <div className="px-2 py-4 md:px-6 md:py-8 min-h-screen bg-background">
      <div className="w-full max-w-7xl mx-auto">
        <div className="mb-4 md:mb-6">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center">
            <Calculator className="mr-2 md:mr-3 h-6 w-6 md:h-8 md:w-8 text-primary" />
            Cotações
          </h1>
          <p className="text-muted-foreground mt-2">
            Calcule o frete dos seus envios
          </p>
        </div>

        <Tabs defaultValue="cotacao" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="cotacao" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Nova Cotação
            </TabsTrigger>
            <TabsTrigger value="teste" className="flex items-center gap-2">
              <TestTube className="h-4 w-4" />
              Teste Sistema
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="cotacao">
            <Card className="shadow-card w-full">
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="text-lg md:text-xl">Nova Cotação</CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6">
                <QuoteForm />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="teste">
            <PaymentTestRunner />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ClientCotacoes;