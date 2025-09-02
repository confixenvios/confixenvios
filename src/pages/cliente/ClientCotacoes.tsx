import QuoteForm from '@/components/QuoteForm';
import ShippingTestRunner from '@/components/ShippingTestRunner';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator } from "lucide-react";

const ClientCotacoes = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Fixed header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center">
            <Calculator className="mr-3 h-7 w-7 text-primary" />
            Cotação Rápida
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Calcule o frete dos seus envios
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        <QuoteForm />
      </div>

      <div className="max-w-3xl mx-auto px-4 pb-6">
        <ShippingTestRunner />
      </div>
    </div>
  );
};

export default ClientCotacoes;