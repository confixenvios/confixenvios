import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Settings, 
  Building2,
  Phone,
  Mail,
  Save
} from 'lucide-react';
import { toast } from 'sonner';

interface CarrierPartner {
  id: string;
  email: string;
  company_name: string;
  cnpj: string | null;
  contact_name: string | null;
  phone: string | null;
  status: string;
  logo_url: string | null;
}

const ParceirosConfiguracoes = () => {
  const { partner } = useOutletContext<{ partner: CarrierPartner }>();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configurações</h1>
        <p className="text-muted-foreground">
          Configurações da conta - {partner?.company_name}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-slate-700" />
              Dados da Empresa
            </CardTitle>
            <CardDescription>Informações cadastrais da transportadora</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Razão Social</Label>
              <Input value={partner?.company_name || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input value={partner?.cnpj || 'Não informado'} disabled />
            </div>
            <div className="space-y-2">
              <Label>Contato</Label>
              <Input value={partner?.contact_name || 'Não informado'} disabled />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input value={partner?.email || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={partner?.phone || 'Não informado'} disabled />
            </div>
            <p className="text-xs text-muted-foreground">
              Para alterar dados cadastrais, entre em contato com a Confix Envios.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-slate-700" />
              Preferências
            </CardTitle>
            <CardDescription>Configurações do portal</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Em Desenvolvimento</p>
              <p className="text-sm">Mais configurações estarão disponíveis em breve</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ParceirosConfiguracoes;