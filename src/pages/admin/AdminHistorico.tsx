import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History } from "lucide-react";

const AdminHistorico = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center">
          <History className="mr-3 h-8 w-8 text-primary" />
          Histórico Geral
        </h1>
        <p className="text-muted-foreground mt-2">
          Histórico completo de operações do sistema
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Operações</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Em breve...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminHistorico;