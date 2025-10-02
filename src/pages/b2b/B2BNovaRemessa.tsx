import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface B2BClient {
  id: string;
  company_name: string;
}

const B2BNovaRemessa = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [client, setClient] = useState<B2BClient | null>(null);
  const [formData, setFormData] = useState({
    volume_count: '',
    delivery_date: '',
  });

  useEffect(() => {
    loadClient();
  }, []);

  const loadClient = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/b2b-expresso');
        return;
      }

      const { data: clientData, error } = await supabase
        .from('b2b_clients')
        .select('id, company_name')
        .eq('user_id', user.id)
        .single();

      if (error || !clientData) {
        toast.error('Cliente não encontrado');
        navigate('/b2b-expresso');
        return;
      }

      setClient(clientData);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;

    // Validação
    if (!formData.volume_count || parseInt(formData.volume_count) <= 0) {
      toast.error('Informe um número de volumes válido');
      return;
    }

    if (!formData.delivery_date) {
      toast.error('Informe a data de entrega');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('b2b_shipments')
        .insert({
          b2b_client_id: client.id,
          volume_count: parseInt(formData.volume_count),
          delivery_date: formData.delivery_date,
          status: 'PENDENTE',
        });

      if (error) throw error;

      toast.success('Solicitação de coleta enviada com sucesso!');
      navigate('/b2b-expresso/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar solicitação');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <Package className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Novo Envio</CardTitle>
                <CardDescription>Solicite a coleta de volumes para entrega</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Número de Volumes */}
              <div className="space-y-2">
                <Label htmlFor="volume_count">Número de Volumes *</Label>
                <Input
                  id="volume_count"
                  type="number"
                  min="1"
                  value={formData.volume_count}
                  onChange={(e) => handleChange('volume_count', e.target.value)}
                  required
                  placeholder="Ex: 5"
                />
                <p className="text-xs text-muted-foreground">
                  Quantos volumes você deseja enviar?
                </p>
              </div>

              {/* Data de Entrega */}
              <div className="space-y-2">
                <Label htmlFor="delivery_date">Data para Entrega *</Label>
                <Input
                  id="delivery_date"
                  type="date"
                  value={formData.delivery_date}
                  onChange={(e) => handleChange('delivery_date', e.target.value)}
                  required
                  min={new Date().toISOString().split('T')[0]}
                />
                <p className="text-xs text-muted-foreground">
                  Qual a data prevista para a entrega dos volumes?
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Package className="mr-2 h-4 w-4" />
                    Solicitar Coleta
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
    </div>
  );
};

export default B2BNovaRemessa;
