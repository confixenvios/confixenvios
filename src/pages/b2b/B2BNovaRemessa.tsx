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
    vehicle_type: '',
    unique_ceps: '1',
    delivery_ceps: [''],
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
          status: 'PENDENTE',
          observations: JSON.stringify({
            vehicle_type: formData.vehicle_type,
            delivery_ceps: formData.delivery_ceps.filter(cep => cep.trim() !== '')
          })
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
    if (field === 'volume_count') {
      const volumeCount = parseInt(value) || 0;
      const uniqueCeps = parseInt(formData.unique_ceps) || 1;
      const cepCount = Math.min(volumeCount, uniqueCeps);
      setFormData(prev => ({
        ...prev,
        [field]: value,
        delivery_ceps: Array(cepCount).fill('').map((_, i) => prev.delivery_ceps[i] || '')
      }));
    } else if (field === 'unique_ceps') {
      const uniqueCeps = parseInt(value) || 1;
      const volumeCount = parseInt(formData.volume_count) || 0;
      const cepCount = Math.min(volumeCount, uniqueCeps);
      setFormData(prev => ({
        ...prev,
        [field]: value,
        delivery_ceps: Array(cepCount).fill('').map((_, i) => prev.delivery_ceps[i] || '')
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleCepChange = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      delivery_ceps: prev.delivery_ceps.map((cep, i) => i === index ? value : cep)
    }));
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
                <Label htmlFor="volume_count">Número de Volumes *</Label>
                <Input
                  id="volume_count"
                  type="number"
                  min="1"
                  value={formData.volume_count}
                  onChange={(e) => handleChange('volume_count', e.target.value)}
                  required
                  placeholder="Quantos volumes serão enviados?"
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

              <div className="space-y-2">
                <Label htmlFor="vehicle_type">Tipo de Veículo para Coleta *</Label>
                <Select
                  value={formData.vehicle_type}
                  onValueChange={(value) => handleChange('vehicle_type', value)}
                  required
                >
                  <SelectTrigger id="vehicle_type">
                    <SelectValue placeholder="Selecione o tipo de veículo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="moto">Moto</SelectItem>
                    <SelectItem value="carro">Carro Utilitário</SelectItem>
                    <SelectItem value="caminhao">Caminhão</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Qual veículo será necessário para coleta e entrega?
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="unique_ceps">CEPs de Entrega Diferentes *</Label>
                <Input
                  id="unique_ceps"
                  type="number"
                  min="1"
                  max={formData.volume_count || '1'}
                  value={formData.unique_ceps}
                  onChange={(e) => handleChange('unique_ceps', e.target.value)}
                  required
                  placeholder="Quantos CEPs diferentes?"
                />
                <p className="text-xs text-muted-foreground">
                  Se todos os volumes vão para o mesmo CEP, informe 1
                </p>
              </div>

              {formData.delivery_ceps.map((cep, index) => (
                <div key={index} className="space-y-2">
                  <Label htmlFor={`cep_${index}`}>
                    CEP de Entrega {formData.delivery_ceps.length > 1 ? `${index + 1}` : ''} *
                  </Label>
                  <Input
                    id={`cep_${index}`}
                    type="text"
                    value={cep}
                    onChange={(e) => handleCepChange(index, e.target.value)}
                    required
                    placeholder="00000-000"
                    maxLength={9}
                  />
                  {formData.delivery_ceps.length === 1 && (
                    <p className="text-xs text-muted-foreground">
                      Todos os {formData.volume_count || '0'} volumes serão entregues neste CEP
                    </p>
                  )}
                </div>
              ))}
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Solicitando envio...
                </>
              ) : (
                <>
                  <Package className="mr-2 h-4 w-4" />
                  Solicitar Envio
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
