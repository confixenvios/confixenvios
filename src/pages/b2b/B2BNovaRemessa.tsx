import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, Loader2, Truck, Car, Bike, MapPin, Scale, DollarSign, Plus, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface B2BClient {
  id: string;
  company_name: string;
  email: string;
  phone: string | null;
  cnpj: string | null;
  user_id: string | null;
}

interface DeliveryAddress {
  id: string;
  name: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_document: string | null;
  cep: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  reference: string | null;
  is_default: boolean;
}

const B2BNovaRemessa = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [client, setClient] = useState<B2BClient | null>(null);
  const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);
  const [formData, setFormData] = useState({
    volume_count: '',
    delivery_date: '',
    vehicle_type: '',
    volume_weights: [''] as string[],
    volume_addresses: [''] as string[], // IDs dos endereços selecionados
  });

  // Calcula o valor total do frete
  const calculateTotal = () => {
    const basePrice = 15;
    const weights = formData.volume_weights.map(w => parseFloat(w) || 0);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    
    if (totalWeight <= 5) {
      return basePrice;
    }
    
    const extraKgs = Math.ceil(totalWeight - 5);
    return basePrice + extraKgs;
  };

  const totalWeight = formData.volume_weights.map(w => parseFloat(w) || 0).reduce((sum, w) => sum + w, 0);
  const totalPrice = calculateTotal();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/b2b-expresso');
        return;
      }

      const { data: clientData, error } = await supabase
        .from('b2b_clients')
        .select('id, company_name, email, phone, cnpj, user_id')
        .eq('user_id', user.id)
        .single();

      if (error || !clientData) {
        toast.error('Cliente não encontrado');
        navigate('/b2b-expresso');
        return;
      }

      setClient(clientData);

      // Buscar endereços cadastrados
      const { data: addressesData, error: addressesError } = await supabase
        .from('b2b_delivery_addresses')
        .select('*')
        .eq('b2b_client_id', clientData.id)
        .order('is_default', { ascending: false })
        .order('name');

      if (addressesError) throw addressesError;
      setAddresses(addressesData || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;

    // Validar tipo de veículo
    if (!formData.vehicle_type) {
      toast.error('Selecione o tipo de veículo para coleta e entrega');
      return;
    }

    // Validar pesos
    const hasValidWeights = formData.volume_weights.every(w => parseFloat(w) > 0);
    if (!hasValidWeights) {
      toast.error('Preencha o peso de todos os volumes');
      return;
    }

    // Validar endereços
    const hasValidAddresses = formData.volume_addresses.every(a => a && a !== '');
    if (!hasValidAddresses) {
      toast.error('Selecione o endereço de entrega para cada volume');
      return;
    }

    setLoading(true);

    try {
      // Preparar dados dos endereços selecionados
      const selectedAddresses = formData.volume_addresses.map(id => 
        addresses.find(a => a.id === id)
      );

      // Navegar para tela de pagamento PIX
      navigate('/b2b-expresso/pix-pagamento', {
        state: {
          amount: totalPrice,
          shipmentData: {
            clientId: client.id,
            clientName: client.company_name,
            clientEmail: client.email,
            clientPhone: client.phone,
            clientDocument: client.cnpj,
            userId: client.user_id,
            volumeCount: parseInt(formData.volume_count),
            deliveryDate: formData.delivery_date,
            vehicleType: formData.vehicle_type,
            volumeWeights: formData.volume_weights.map(w => parseFloat(w) || 0),
            volumeAddresses: selectedAddresses,
            totalWeight: totalWeight
          }
        }
      });
    } catch (error: any) {
      toast.error(error.message || 'Erro ao processar solicitação');
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    if (field === 'volume_count') {
      const volumeCount = parseInt(value) || 0;
      setFormData(prev => ({
        ...prev,
        [field]: value,
        volume_weights: Array(volumeCount).fill('').map((_, i) => prev.volume_weights[i] || ''),
        volume_addresses: Array(volumeCount).fill('').map((_, i) => prev.volume_addresses[i] || '')
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleWeightChange = (index: number, value: string) => {
    const formatted = value.replace(/[^\d.]/g, '');
    
    setFormData(prev => ({
      ...prev,
      volume_weights: prev.volume_weights.map((w, i) => i === index ? formatted : w)
    }));
  };

  const handleAddressChange = (index: number, addressId: string) => {
    setFormData(prev => ({
      ...prev,
      volume_addresses: prev.volume_addresses.map((a, i) => i === index ? addressId : a)
    }));
  };

  const getAddressById = (id: string) => addresses.find(a => a.id === id);

  if (loadingData) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Package className="h-12 w-12 animate-pulse mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

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
          {addresses.length === 0 ? (
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>Você precisa cadastrar endereços de entrega antes de solicitar um envio.</span>
                <Button size="sm" onClick={() => navigate('/b2b-expresso/enderecos')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Cadastrar Endereços
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
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

              {/* Seção 2: Volumes com Peso e Endereço */}
              {parseInt(formData.volume_count) > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <MapPin className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-lg">Volumes e Endereços de Entrega</h3>
                  </div>

                  <p className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-900">
                    Informe o peso e selecione o endereço de entrega para cada volume
                  </p>

                  <div className="space-y-4">
                    {formData.volume_weights.map((weight, index) => (
                      <div key={index} className="p-4 bg-muted/30 rounded-lg space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="h-4 w-4 text-primary" />
                          <span className="font-semibold">Volume {index + 1}</span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`weight_${index}`} className="text-sm">Peso (kg) *</Label>
                            <Input
                              id={`weight_${index}`}
                              type="text"
                              value={weight}
                              onChange={(e) => handleWeightChange(index, e.target.value)}
                              required
                              placeholder="Ex: 2.5"
                              className="h-10"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor={`address_${index}`} className="text-sm">Endereço de Entrega *</Label>
                            <Select
                              value={formData.volume_addresses[index] || ''}
                              onValueChange={(value) => handleAddressChange(index, value)}
                              required
                            >
                              <SelectTrigger className="h-10">
                                <SelectValue placeholder="Selecione o endereço" />
                              </SelectTrigger>
                              <SelectContent>
                                {addresses.map((addr) => (
                                  <SelectItem key={addr.id} value={addr.id}>
                                    <div className="flex flex-col">
                                      <span className="font-medium">{addr.name}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {addr.recipient_name} - {addr.city}/{addr.state}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {formData.volume_addresses[index] && (
                          <div className="text-xs text-muted-foreground bg-background p-2 rounded border">
                            {(() => {
                              const addr = getAddressById(formData.volume_addresses[index]);
                              if (!addr) return null;
                              return (
                                <>
                                  <p><strong>{addr.recipient_name}</strong> - {addr.recipient_phone}</p>
                                  <p>{addr.street}, {addr.number}{addr.complement && `, ${addr.complement}`}</p>
                                  <p>{addr.neighborhood} - {addr.city}/{addr.state} - CEP: {addr.cep}</p>
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <strong>Peso total:</strong> {totalWeight.toFixed(2)} kg
                    </p>
                  </div>
                </div>
              )}

              {/* Seção 3: Tipo de Veículo */}
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

              {/* Seção 4: Valor Total */}
              {parseInt(formData.volume_count) > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-lg">Valor do Frete</h3>
                  </div>

                  <div className="p-6 bg-primary/5 border-2 border-primary/20 rounded-lg">
                    <div className="text-center space-y-2">
                      <p className="text-sm text-muted-foreground">Valor Total a Pagar</p>
                      <p className="text-4xl font-bold text-primary">
                        R$ {totalPrice.toFixed(2)}
                      </p>
                      <div className="text-xs text-muted-foreground space-y-1 mt-4">
                        <p>• Valor base: R$ 15,00 (até 5kg)</p>
                        {totalWeight > 5 && (
                          <p>• Adicional: R$ {(totalPrice - 15).toFixed(2)} ({Math.ceil(totalWeight - 5)}kg extras)</p>
                        )}
                        <p>• Peso total: {totalWeight.toFixed(2)} kg</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={loading || addresses.length === 0}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Package className="mr-2 h-4 w-4" />
                    Solicitar Coleta e Entrega
                  </>
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default B2BNovaRemessa;