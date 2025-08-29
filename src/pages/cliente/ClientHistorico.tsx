import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Package } from "lucide-react";

const ClientHistorico = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Histórico</h1>
        <p className="text-muted-foreground">
          Visualize o histórico completo das suas remessas
        </p>
      </div>

      <Card className="border-border/50 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>Histórico de Remessas</span>
          </CardTitle>
          <CardDescription>
            Aqui você verá o histórico completo de todas as suas remessas
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-12">
          <Clock className="w-16 h-16 mx-auto text-muted-foreground mb-6" />
          <h3 className="text-lg font-semibold mb-2">Histórico vazio</h3>
          <p className="text-muted-foreground">
            Seu histórico de remessas aparecerá aqui conforme você for utilizando o sistema.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientHistorico;