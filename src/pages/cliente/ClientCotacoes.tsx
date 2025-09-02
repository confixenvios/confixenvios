import QuoteForm from '@/components/QuoteForm';
import ShippingTestRunner from '@/components/ShippingTestRunner';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator } from "lucide-react";

const ClientCotacoes = () => {
  return (
    <div className="p-2 md:p-6">
      <div className="mb-4 md:mb-6">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center">
          <Calculator className="mr-2 md:mr-3 h-6 w-6 md:h-8 md:w-8 text-primary" />
          Cotações
        </h1>
        <p className="text-muted-foreground mt-2">
          Calcule o frete dos seus envios
        </p>
      </div>

      <Card className="shadow-card">
        <CardHeader className="p-3 md:p-6">
          <CardTitle className="text-lg md:text-xl">Nova Cotação</CardTitle>
        </CardHeader>
        <CardContent className="p-3 md:p-6">
          <QuoteForm />
        </CardContent>
      </Card>

      <div className="mt-8">
        <ShippingTestRunner />
      </div>
    </div>
  );
};

export default ClientCotacoes;