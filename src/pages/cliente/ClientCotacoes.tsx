import QuoteForm from '@/components/QuoteForm';
import ShippingTestRunner from '@/components/ShippingTestRunner';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator } from "lucide-react";

const ClientCotacoes = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center">
          <Calculator className="mr-3 h-8 w-8 text-primary" />
          Cotações
        </h1>
        <p className="text-muted-foreground mt-2">
          Calcule o frete dos seus envios
        </p>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Nova Cotação</CardTitle>
        </CardHeader>
        <CardContent>
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