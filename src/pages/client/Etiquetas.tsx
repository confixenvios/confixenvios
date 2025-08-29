import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Etiquetas = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Etiquetas</h1>
        <p className="text-muted-foreground">
          Baixe e imprima suas etiquetas de envio
        </p>
      </div>

      <Card className="border-border/50 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Suas Etiquetas</span>
          </CardTitle>
          <CardDescription>
            Aqui você pode baixar e imprimir as etiquetas das suas remessas
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-12">
          <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-6" />
          <h3 className="text-lg font-semibold mb-2">Nenhuma etiqueta disponível</h3>
          <p className="text-muted-foreground mb-6">
            Suas etiquetas aparecerão aqui após criar remessas e fazer o pagamento.
          </p>
          <Button asChild>
            <Link to="/dashboard">
              <Download className="w-4 h-4 mr-2" />
              Criar Nova Remessa
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Etiquetas;