import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Package, Loader2, Truck, Car, Bike, MapPin } from 'lucide-react';
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
    same_cep: 'yes',
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
      const cepCount = formData.same_cep === 'no' ? volumeCount : 1;
      setFormData(prev => ({
        ...prev,
        [field]: value,
        delivery_ceps: Array(cepCount).fill('').map((_, i) => prev.delivery_ceps[i] || '')
      }));
    } else if (field === 'same_cep') {
      const volumeCount = parseInt(formData.volume_count) || 0;
      const cepCount = value === 'no' ? volumeCount : 1;
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
    // Formata CEP automaticamente
    const formatted = value
      .replace(/\D/g, '')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 9);
    
    setFormData(prev => ({
      ...prev,
      delivery_ceps: prev.delivery_ceps.map((cep, i) => i === index ? formatted : cep)
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
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Seção 1: Informações Básicas */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Package className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">Informações do Envio</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="volume_count" className="text-base">Quantos volumes? *</Label>
                  <Input
                    id="volume_count"
                    type="number"
                    min="1"
                    value={formData.volume_count}
                    onChange={(e) => handleChange('volume_count', e.target.value)}
                    required
                    placeholder="Ex: 10"
                    className="h-12 text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="delivery_date" className="text-base">Data de entrega desejada *</Label>
                  <Input
                    id="delivery_date"
                    type="date"
                    value={formData.delivery_date}
                    onChange={(e) => handleChange('delivery_date', e.target.value)}
                    required
                    min={new Date().toISOString().split('T')[0]}
                    className="h-12 text-base"
                  />
                </div>
              </div>
            </div>

            {/* Seção 2: Tipo de Veículo */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Truck className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">Tipo de Veículo Necessário</h3>
              </div>

              <div className="space-y-3">
                <Label className="text-base">Selecione o veículo para coleta e entrega *</Label>
                <RadioGroup
                  value={formData.vehicle_type}
                  onValueChange={(value) => handleChange('vehicle_type', value)}
                  className="grid grid-cols-1 md:grid-cols-3 gap-4"
                  required
                >
                  <label
                    htmlFor="moto"
                    className={`flex items-center space-x-3 border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      formData.vehicle_type === 'moto' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <RadioGroupItem value="moto" id="moto" />
                    <div className="flex items-center gap-3">
                      <Bike className="h-6 w-6" />
                      <span className="font-medium">Moto</span>
                    </div>
                  </label>

                  <label
                    htmlFor="carro"
                    className={`flex items-center space-x-3 border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      formData.vehicle_type === 'carro' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <RadioGroupItem value="carro" id="carro" />
                    <div className="flex items-center gap-3">
                      <Car className="h-6 w-6" />
                      <span className="font-medium">Carro Utilitário</span>
                    </div>
                  </label>

                  <label
                    htmlFor="caminhao"
                    className={`flex items-center space-x-3 border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      formData.vehicle_type === 'caminhao' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <RadioGroupItem value="caminhao" id="caminhao" />
                    <div className="flex items-center gap-3">
                      <Truck className="h-6 w-6" />
                      <span className="font-medium">Caminhão</span>
                    </div>
                  </label>
                </RadioGroup>
              </div>
            </div>

            {/* Seção 3: Endereços de Entrega */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <MapPin className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">Endereços de Entrega</h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-3">
                  <Label className="text-base">Todos os volumes vão para o mesmo endereço? *</Label>
                  <RadioGroup
                    value={formData.same_cep}
                    onValueChange={(value) => handleChange('same_cep', value)}
                    className="flex gap-6"
                    required
                  >
                    <label htmlFor="same_yes" className="flex items-center space-x-2 cursor-pointer">
                      <RadioGroupItem value="yes" id="same_yes" />
                      <span>Sim, mesmo endereço</span>
                    </label>
                    <label htmlFor="same_no" className="flex items-center space-x-2 cursor-pointer">
                      <RadioGroupItem value="no" id="same_no" />
                      <span>Não, endereços diferentes</span>
                    </label>
                  </RadioGroup>
                </div>

                {formData.same_cep === 'yes' ? (
                  <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
                    <Label htmlFor="cep_0" className="text-base">CEP de Entrega *</Label>
                    <Input
                      id="cep_0"
                      type="text"
                      value={formData.delivery_ceps[0] || ''}
                      onChange={(e) => handleCepChange(0, e.target.value)}
                      required
                      placeholder="00000-000"
                      maxLength={9}
                      className="h-12 text-base"
                    />
                    <p className="text-sm text-muted-foreground">
                      Todos os {formData.volume_count || '0'} volumes serão entregues neste endereço
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-900">
                      Informe o CEP de entrega para cada volume
                    </p>
                    {formData.delivery_ceps.map((cep, index) => (
                      <div key={index} className="space-y-2 p-4 bg-muted/30 rounded-lg">
                        <Label htmlFor={`cep_${index}`} className="text-base font-medium">
                          Volume {index + 1} - CEP de Entrega *
                        </Label>
                        <Input
                          id={`cep_${index}`}
                          type="text"
                          value={cep}
                          onChange={(e) => handleCepChange(index, e.target.value)}
                          required
                          placeholder="00000-000"
                          maxLength={9}
                          className="h-12 text-base"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>


            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando solicitação...
                </>
              ) : (
                <>
                  <Package className="mr-2 h-4 w-4" />
                  Solicitar Coleta e Entrega
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
