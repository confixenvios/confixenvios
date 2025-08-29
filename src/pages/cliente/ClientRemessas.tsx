import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Remessas = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Minhas Remessas</h1>
        <p className="text-muted-foreground">
          Gerencie todas as suas remessas em um só lugar
        </p>
      </div>

      <Card className="border-border/50 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="w-5 h-5" />
            <span>Suas Remessas</span>
          </CardTitle>
          <CardDescription>
            Aqui você verá todas as suas remessas e poderá acompanhar o status
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-12">
          <Package className="w-16 h-16 mx-auto text-muted-foreground mb-6" />
          <h3 className="text-lg font-semibold mb-2">Nenhuma remessa encontrada</h3>
          <p className="text-muted-foreground mb-6">
            Você ainda não criou nenhuma remessa. Comece fazendo uma cotação.
          </p>
          <Button asChild>
            <Link to="/dashboard">
              <Plus className="w-4 h-4 mr-2" />
              Nova Cotação
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Remessas;