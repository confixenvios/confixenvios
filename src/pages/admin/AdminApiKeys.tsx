import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Copy, Eye, EyeOff, Trash2, Key, Activity, Calendar, Building } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ApiKey {
  id: string;
  company_name: string;
  company_cnpj: string;
  api_key: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
  usage_count: number;
  rate_limit_per_hour: number;
  description: string | null;
}

const AdminApiKeys = () => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    company_name: '',
    company_cnpj: '',
    description: '',
    rate_limit_per_hour: 1000
  });

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApiKeys(data || []);
    } catch (error) {
      console.error('Erro ao buscar API keys:', error);
      toast.error('Erro ao carregar API keys');
    } finally {
      setLoading(false);
    }
  };

  const generateApiKey = async () => {
    try {
      // Gerar API key usando a função do banco
      const { data: newKey, error: keyError } = await supabase.rpc('generate_api_key');
      
      if (keyError) throw keyError;

      // Inserir nova API key
      const { error: insertError } = await supabase
        .from('api_keys')
        .insert({
          company_name: formData.company_name,
          company_cnpj: formData.company_cnpj,
          api_key: newKey,
          description: formData.description,
          rate_limit_per_hour: formData.rate_limit_per_hour,
          is_active: true
        });

      if (insertError) throw insertError;

      toast.success('API Key gerada com sucesso!');
      setShowDialog(false);
      setFormData({
        company_name: '',
        company_cnpj: '',
        description: '',
        rate_limit_per_hour: 1000
      });
      fetchApiKeys();
    } catch (error) {
      console.error('Erro ao gerar API key:', error);
      toast.error('Erro ao gerar API key');
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    const newVisibleKeys = new Set(visibleKeys);
    if (newVisibleKeys.has(keyId)) {
      newVisibleKeys.delete(keyId);
    } else {
      newVisibleKeys.add(keyId);
    }
    setVisibleKeys(newVisibleKeys);
  };

  const copyApiKey = (apiKey: string) => {
    navigator.clipboard.writeText(apiKey);
    toast.success('API Key copiada para a área de transferência!');
  };

  const toggleKeyStatus = async (keyId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('api_keys')
        .update({ is_active: !currentStatus })
        .eq('id', keyId);

      if (error) throw error;

      toast.success(`API Key ${!currentStatus ? 'ativada' : 'desativada'} com sucesso!`);
      fetchApiKeys();
    } catch (error) {
      console.error('Erro ao alterar status da API key:', error);
      toast.error('Erro ao alterar status da API key');
    }
  };

  const deleteApiKey = async (keyId: string) => {
    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', keyId);

      if (error) throw error;

      toast.success('API Key removida com sucesso!');
      fetchApiKeys();
    } catch (error) {
      console.error('Erro ao remover API key:', error);
      toast.error('Erro ao remover API key');
    }
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 12) return key;
    return `${key.substring(0, 12)}${'*'.repeat(key.length - 12)}`;
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-[400px]">Carregando...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Gerenciar API Keys</h1>
          <p className="text-muted-foreground">
            Gerencie as chaves de acesso da API pública para empresas integradoras.
          </p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova API Key
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Gerar Nova API Key</DialogTitle>
              <DialogDescription>
                Crie uma nova chave de acesso para uma empresa integradora.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="company_name">Nome da Empresa</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                  placeholder="Nome da empresa integradora"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="company_cnpj">CNPJ (opcional)</Label>
                <Input
                  id="company_cnpj"
                  value={formData.company_cnpj}
                  onChange={(e) => setFormData({...formData, company_cnpj: e.target.value})}
                  placeholder="00.000.000/0001-00"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rate_limit">Limite por Hora</Label>
                <Input
                  id="rate_limit"
                  type="number"
                  value={formData.rate_limit_per_hour}
                  onChange={(e) => setFormData({...formData, rate_limit_per_hour: parseInt(e.target.value) || 1000})}
                  placeholder="1000"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Descrição da integração..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={generateApiKey}>
                <Key className="h-4 w-4 mr-2" />
                Gerar API Key
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Estatísticas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="text-2xl font-bold">{apiKeys.length}</div>
                <div className="text-sm text-muted-foreground">Total de Keys</div>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {apiKeys.filter(key => key.is_active).length}
                </div>
                <div className="text-sm text-muted-foreground">Ativas</div>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {apiKeys.filter(key => !key.is_active).length}
                </div>
                <div className="text-sm text-muted-foreground">Inativas</div>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {apiKeys.reduce((total, key) => total + key.usage_count, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Total de Usos</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Keys</CardTitle>
            <CardDescription>
              Gerencie as chaves de acesso e monitore o uso da API.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {apiKeys.length === 0 ? (
              <div className="text-center py-8">
                <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma API Key encontrada</h3>
                <p className="text-muted-foreground">
                  Crie a primeira chave de acesso para começar a usar a API.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>API Key</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Uso</TableHead>
                    <TableHead>Último Acesso</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiKeys.map((apiKey) => (
                    <TableRow key={apiKey.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{apiKey.company_name}</div>
                            {apiKey.company_cnpj && (
                              <div className="text-sm text-muted-foreground">{apiKey.company_cnpj}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                            {visibleKeys.has(apiKey.id) ? apiKey.api_key : maskApiKey(apiKey.api_key)}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => toggleKeyVisibility(apiKey.id)}
                          >
                            {visibleKeys.has(apiKey.id) ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => copyApiKey(apiKey.api_key)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={apiKey.is_active ? "default" : "secondary"}
                          className={apiKey.is_active ? "bg-green-500" : "bg-red-500"}
                        >
                          {apiKey.is_active ? "Ativa" : "Inativa"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{apiKey.usage_count} requisições</div>
                          <div className="text-muted-foreground">
                            Limite: {apiKey.rate_limit_per_hour}/hora
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {apiKey.last_used_at ? 
                            format(new Date(apiKey.last_used_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : 
                            "Nunca usado"
                          }
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleKeyStatus(apiKey.id, apiKey.is_active)}
                          >
                            {apiKey.is_active ? "Desativar" : "Ativar"}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir esta API Key? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteApiKey(apiKey.id)}>
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminApiKeys;