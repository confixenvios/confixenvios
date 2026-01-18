import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  Download, 
  Calendar,
  TrendingUp,
  Package,
  Truck
} from 'lucide-react';

interface CarrierPartner {
  id: string;
  company_name: string;
}

const ParceirosRelatorios = () => {
  const { partner } = useOutletContext<{ partner: CarrierPartner }>();

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Relatórios</h1>
          <p className="text-muted-foreground">
            Relatórios e análises - {partner?.company_name}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-all cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-500" />
              Entregas por Período
            </CardTitle>
            <CardDescription>Relatório de entregas realizadas</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Gerar Relatório
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Performance
            </CardTitle>
            <CardDescription>Métricas de desempenho</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Gerar Relatório
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-amber-500" />
              Entregas Pendentes
            </CardTitle>
            <CardDescription>Lista de pendências</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Gerar Relatório
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-slate-700" />
            Análises em Breve
          </CardTitle>
          <CardDescription>Gráficos e análises detalhadas serão disponibilizados em breve</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Em Desenvolvimento</p>
            <p className="text-sm">Relatórios detalhados estarão disponíveis em breve</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ParceirosRelatorios;