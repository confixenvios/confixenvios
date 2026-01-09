import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Users } from 'lucide-react';
import { Navigate } from 'react-router-dom';

const PainelCadastros = () => {
  const [activeTab, setActiveTab] = useState<'remetentes' | 'destinatarios'>('remetentes');

  // Use redirect to the individual pages with a tab parameter
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Cadastros</h1>
        <p className="text-muted-foreground">Gerencie remetentes e destinatários</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'remetentes' | 'destinatarios')}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="remetentes" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Remetentes
          </TabsTrigger>
          <TabsTrigger value="destinatarios" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Destinatários
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Redirect based on tab */}
      {activeTab === 'remetentes' ? (
        <Navigate to="/painel/convencional/remetentes" replace />
      ) : (
        <Navigate to="/painel/convencional/destinatarios" replace />
      )}
    </div>
  );
};

export default PainelCadastros;
