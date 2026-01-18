import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface CarrierPartner {
  id: string;
  company_name: string;
}

const ParceirosOcorrencias = () => {
  const { partner } = useOutletContext<{ partner: CarrierPartner }>();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Ocorrências</h1>
        <p className="text-muted-foreground">
          Gestão de ocorrências - {partner?.company_name}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Ocorrências
          </CardTitle>
          <CardDescription>Entregas com ocorrências registradas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Nenhuma ocorrência</p>
            <p className="text-sm">Não há ocorrências registradas no momento</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ParceirosOcorrencias;