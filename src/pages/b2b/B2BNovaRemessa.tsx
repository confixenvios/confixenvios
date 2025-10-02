import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
    package_type: '',
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

    setLoading(true);

    try {
      const { error } = await supabase
        .from('b2b_shipments')
        .insert({
          b2b_client_id: client.id,
          volume_count: parseInt(formData.volume_count),
          delivery_date: formData.delivery_date,
          package_type: formData.package_type,
          status: 'PENDENTE',
        });

      if (error) throw error;

      toast.success('Solicitação de coleta enviada com sucesso!');
      navigate('/b2b-expresso/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao solicitar coleta');
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
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="package_type">Tipo de Envio *</Label>
                <Select
                  value={formData.package_type}
                  onValueChange={(value) => handleChange('package_type', value)}
                  required
                >
                  <SelectTrigger id="package_type">
                    <SelectValue placeholder="Selecione o tipo de envio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="envelope">Envelope</SelectItem>
                    <SelectItem value="documento">Documento</SelectItem>
                    <SelectItem value="caixa_pequena">Caixa Pequena</SelectItem>
                    <SelectItem value="caixa_media">Caixa Média</SelectItem>
                    <SelectItem value="caixa_grande">Caixa Grande</SelectItem>
                    <SelectItem value="peca">Peça</SelectItem>
                    <SelectItem value="eletronico">Eletrônico</SelectItem>
                    <SelectItem value="medicamento">Medicamento</SelectItem>
                    <SelectItem value="fragil">Frágil</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Selecione o tipo de item que será enviado
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="volume_count">Número de Volumes *</Label>
                <Input
                  id="volume_count"
                  type="number"
                  min="1"
                  value={formData.volume_count}
                  onChange={(e) => handleChange('volume_count', e.target.value)}
                  required
                  placeholder="Quantos volumes serão coletados?"
                />
                <p className="text-xs text-muted-foreground">
                  Informe quantos volumes precisam ser coletados
                </p>
              </div>

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
                  Quando os volumes devem ser entregues?
                </p>
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Solicitando coleta...
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
