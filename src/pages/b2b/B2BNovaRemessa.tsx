import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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

interface PickupAddress {
  id: string;
  name: string;
  contact_name: string;
  contact_phone: string;
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
  const [pickupAddresses, setPickupAddresses] = useState<PickupAddress[]>([]);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showPickupAddressModal, setShowPickupAddressModal] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [savingPickupAddress, setSavingPickupAddress] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [loadingPickupCep, setLoadingPickupCep] = useState(false);
  const [newAddress, setNewAddress] = useState({
    name: '',
    recipient_name: '',
    recipient_phone: '',
    recipient_document: '',
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    reference: '',
  });
  const [newPickupAddress, setNewPickupAddress] = useState({
    name: '',
    contact_name: '',
    contact_phone: '',
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    reference: '',
  });
  const [formData, setFormData] = useState({
    volume_count: '1',
    delivery_date: '',
    vehicle_type: '',
    pickup_address_id: '',
    volume_weights: [''] as string[],
    volume_addresses: [''] as string[],
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

      // Buscar endereços de entrega cadastrados
      const { data: addressesData, error: addressesError } = await supabase
        .from('b2b_delivery_addresses')
        .select('*')
        .eq('b2b_client_id', clientData.id)
        .order('is_default', { ascending: false })
        .order('name');

      if (addressesError) throw addressesError;
      setAddresses(addressesData || []);

      // Buscar endereços de coleta cadastrados
      const { data: pickupData, error: pickupError } = await supabase
        .from('b2b_pickup_addresses')
        .select('*')
        .eq('b2b_client_id', clientData.id)
        .order('is_default', { ascending: false })
        .order('name');

      if (pickupError) throw pickupError;
      setPickupAddresses(pickupData || []);

      // Auto-selecionar endereço de coleta padrão
      const defaultPickup = (pickupData || []).find((a: PickupAddress) => a.is_default);
      if (defaultPickup) {
        setFormData(prev => ({ ...prev, pickup_address_id: defaultPickup.id }));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;

    // Validar endereço de coleta
    if (!formData.pickup_address_id) {
      toast.error('Selecione o endereço de coleta');
      return;
    }

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

    // Validar endereços de entrega
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

      // Encontrar endereço de coleta selecionado
      const selectedPickupAddress = pickupAddresses.find(a => a.id === formData.pickup_address_id);

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
            pickupAddress: selectedPickupAddress,
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
  const getPickupAddressById = (id: string) => pickupAddresses.find(a => a.id === id);

  const handleCepLookup = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        toast.error('CEP não encontrado');
        return;
      }

      setNewAddress(prev => ({
        ...prev,
        street: data.logradouro || '',
        neighborhood: data.bairro || '',
        city: data.localidade || '',
        state: data.uf || '',
      }));
    } catch (error) {
      toast.error('Erro ao buscar CEP');
    } finally {
      setLoadingCep(false);
    }
  };

  const formatDocument = (value: string): string => {
    return value.replace(/\D/g, '').slice(0, 14); // Max 14 digits for CNPJ
  };

  const handleNewAddressChange = (field: string, value: string) => {
    if (field === 'recipient_phone') {
      const formattedPhone = formatPhone(value);
      setNewAddress(prev => ({ ...prev, [field]: formattedPhone }));
      return;
    }
    
    if (field === 'recipient_document') {
      const formattedDocument = formatDocument(value);
      setNewAddress(prev => ({ ...prev, [field]: formattedDocument }));
      return;
    }
    
    setNewAddress(prev => ({ ...prev, [field]: value }));
    
    if (field === 'cep' && value.replace(/\D/g, '').length === 8) {
      handleCepLookup(value);
    }
  };

  const resetNewAddress = () => {
    setNewAddress({
      name: '',
      recipient_name: '',
      recipient_phone: '',
      recipient_document: '',
      cep: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      reference: '',
    });
  };

  const resetNewPickupAddress = () => {
    setNewPickupAddress({
      name: '',
      contact_name: '',
      contact_phone: '',
      cep: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      reference: '',
    });
  };

  const handlePickupCepLookup = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setLoadingPickupCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        toast.error('CEP não encontrado');
        return;
      }

      setNewPickupAddress(prev => ({
        ...prev,
        street: data.logradouro || '',
        neighborhood: data.bairro || '',
        city: data.localidade || '',
        state: data.uf || '',
      }));
    } catch (error) {
      toast.error('Erro ao buscar CEP');
    } finally {
      setLoadingPickupCep(false);
    }
  };

  const formatPhone = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits.length ? `(${digits}` : '';
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handleNewPickupAddressChange = (field: string, value: string) => {
    if (field === 'contact_phone') {
      const formattedPhone = formatPhone(value);
      setNewPickupAddress(prev => ({ ...prev, [field]: formattedPhone }));
      return;
    }
    
    setNewPickupAddress(prev => ({ ...prev, [field]: value }));
    
    if (field === 'cep' && value.replace(/\D/g, '').length === 8) {
      handlePickupCepLookup(value);
    }
  };

  const handleSaveNewPickupAddress = async () => {
    if (!client) return;

    if (!newPickupAddress.name || !newPickupAddress.contact_name || !newPickupAddress.contact_phone ||
        !newPickupAddress.cep || !newPickupAddress.street || !newPickupAddress.number ||
        !newPickupAddress.neighborhood || !newPickupAddress.city || !newPickupAddress.state || !newPickupAddress.complement) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const phoneDigits = newPickupAddress.contact_phone.replace(/\D/g, '');
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      toast.error('Telefone deve ter 10 (fixo) ou 11 (celular) dígitos');
      return;
    }

    setSavingPickupAddress(true);
    try {
      const { data, error } = await supabase
        .from('b2b_pickup_addresses')
        .insert({
          b2b_client_id: client.id,
          name: newPickupAddress.name,
          contact_name: newPickupAddress.contact_name,
          contact_phone: newPickupAddress.contact_phone,
          cep: newPickupAddress.cep.replace(/\D/g, ''),
          street: newPickupAddress.street,
          number: newPickupAddress.number,
          complement: newPickupAddress.complement,
          neighborhood: newPickupAddress.neighborhood,
          city: newPickupAddress.city,
          state: newPickupAddress.state,
          reference: newPickupAddress.reference || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Endereço de coleta cadastrado com sucesso!');
      setPickupAddresses(prev => [...prev, data]);
      setFormData(prev => ({ ...prev, pickup_address_id: data.id }));
      setShowPickupAddressModal(false);
      resetNewPickupAddress();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar endereço de coleta');
    } finally {
      setSavingPickupAddress(false);
    }
  };

  const handleSaveNewAddress = async () => {
    if (!client) return;

    if (!newAddress.name || !newAddress.recipient_name || !newAddress.recipient_phone ||
        !newAddress.cep || !newAddress.street || !newAddress.number ||
        !newAddress.neighborhood || !newAddress.city || !newAddress.state || !newAddress.complement) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const phoneDigits = newAddress.recipient_phone.replace(/\D/g, '');
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      toast.error('Telefone deve ter 10 (fixo) ou 11 (celular) dígitos');
      return;
    }

    setSavingAddress(true);
    try {
      const { data, error } = await supabase
        .from('b2b_delivery_addresses')
        .insert({
          b2b_client_id: client.id,
          name: newAddress.name,
          recipient_name: newAddress.recipient_name,
          recipient_phone: newAddress.recipient_phone,
          recipient_document: newAddress.recipient_document || null,
          cep: newAddress.cep.replace(/\D/g, ''),
          street: newAddress.street,
          number: newAddress.number,
          complement: newAddress.complement,
          neighborhood: newAddress.neighborhood,
          city: newAddress.city,
          state: newAddress.state,
          reference: newAddress.reference || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Endereço cadastrado com sucesso!');
      setAddresses(prev => [...prev, data]);
      setShowAddressModal(false);
      resetNewAddress();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar endereço');
    } finally {
      setSavingAddress(false);
    }
  };

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
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Package className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Novo Envio</h1>
        </div>
        <p className="text-muted-foreground">Solicite a coleta de volumes para entrega</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Seção: Endereço de Coleta */}
        <div className="bg-card border rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-green-600" />
              <h2 className="font-semibold text-lg">Endereço de Coleta</h2>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPickupAddressModal(true)}
              className="text-green-600 border-green-600 hover:bg-green-50"
            >
              <Plus className="h-4 w-4 mr-1" />
              Novo Endereço de Coleta
            </Button>
          </div>

          {pickupAddresses.length === 0 ? (
            <div className="text-center py-8 space-y-3 bg-muted/30 rounded-lg">
              <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground" />
              <div>
                <p className="font-medium">Nenhum endereço de coleta cadastrado</p>
                <p className="text-sm text-muted-foreground">Cadastre um endereço de coleta para continuar.</p>
              </div>
              <Button
                type="button"
                onClick={() => setShowPickupAddressModal(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                Cadastrar Endereço de Coleta
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Selecione o endereço de coleta *</Label>
              <Select
                value={formData.pickup_address_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, pickup_address_id: value }))}
                required
              >
                <SelectTrigger className="h-10 border bg-background w-fit min-w-[180px]">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Selecionar endereço" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {pickupAddresses.map((addr) => (
                    <SelectItem key={addr.id} value={addr.id}>
                      {addr.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {formData.pickup_address_id && (
                <div className="text-sm text-foreground bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  {(() => {
                    const addr = getPickupAddressById(formData.pickup_address_id);
                    if (!addr) return null;
                    return (
                      <div className="space-y-1">
                        <p className="font-semibold text-green-800 dark:text-green-200">{addr.contact_name} - {addr.contact_phone}</p>
                        <p className="text-green-700 dark:text-green-300">{addr.street}, {addr.number}{addr.complement && `, ${addr.complement}`}</p>
                        <p className="text-green-600 dark:text-green-400">{addr.neighborhood} - {addr.city}/{addr.state} - CEP: {addr.cep}</p>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Seção: Informações do Envio */}
        <div className="bg-card border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-lg">Informações do Envio</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="volume_count" className="text-sm font-medium">Quantos volumes? *</Label>
              <Input
                id="volume_count"
                type="number"
                min="1"
                value={formData.volume_count}
                onChange={(e) => handleChange('volume_count', e.target.value)}
                required
                placeholder="Ex: 10"
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="delivery_date" className="text-sm font-medium">Data de entrega desejada *</Label>
              <Input
                id="delivery_date"
                type="date"
                value={formData.delivery_date}
                onChange={(e) => handleChange('delivery_date', e.target.value)}
                required
                min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                className="h-12"
              />
            </div>
          </div>
        </div>

        {/* Seção: Volumes */}
        {parseInt(formData.volume_count) > 0 && (
          <div className="bg-card border rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-lg">Volumes</h2>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddressModal(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Endereço
              </Button>
            </div>

            {addresses.length === 0 ? (
              <div className="text-center py-8 space-y-3 bg-muted/30 rounded-lg">
                <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground" />
                <div>
                  <p className="font-medium">Nenhum endereço de entrega cadastrado</p>
                  <p className="text-sm text-muted-foreground">Cadastre endereços de entrega para os volumes.</p>
                </div>
                <Button
                  type="button"
                  onClick={() => setShowAddressModal(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Cadastrar Endereço de Entrega
                </Button>
              </div>
            ) : (
              <>
                <div className="bg-primary/5 border border-primary/20 p-3 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Informe o peso e selecione o endereço de entrega para cada volume
                  </p>
                </div>

                <div className="space-y-3">
                  {formData.volume_weights.map((weight, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-muted/20 space-y-3">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-sm">Volume {index + 1}</span>
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
                          <div className="flex items-center justify-between">
                            <Label htmlFor={`address_${index}`} className="text-sm">Endereço de Entrega *</Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setShowAddressModal(true)}
                              className="h-6 text-xs text-primary border-primary hover:bg-primary/5"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Novo
                            </Button>
                          </div>
                          <Select
                            value={formData.volume_addresses[index] || ''}
                            onValueChange={(value) => handleAddressChange(index, value)}
                            required
                          >
                            <SelectTrigger className="h-10 border border-input">
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
                        <div className="text-xs text-muted-foreground bg-background p-3 rounded border">
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
              </>
            )}
          </div>
        )}

        {/* Seção: Tipo de Veículo */}
        <div className="bg-card border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-lg">Tipo de Veículo</h2>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Selecione o veículo para coleta e entrega *</Label>
            <RadioGroup
              value={formData.vehicle_type}
              onValueChange={(value) => handleChange('vehicle_type', value)}
              className="grid grid-cols-1 md:grid-cols-3 gap-3"
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
                  <Bike className="h-5 w-5" />
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
                  <Car className="h-5 w-5" />
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
                  <Truck className="h-5 w-5" />
                  <span className="font-medium">Caminhão</span>
                </div>
              </label>
            </RadioGroup>
          </div>
        </div>

        {/* Resumo dos Volumes */}
        {parseInt(formData.volume_count) > 0 && (
          <div className="bg-primary/5 border-2 border-primary/20 rounded-xl p-6">
            <h3 className="font-semibold mb-4">Resumo do Envio</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Quantidade de Volumes</p>
                <p className="text-2xl font-bold text-primary">{formData.volume_count}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Peso Total</p>
                <p className="text-2xl font-bold">{totalWeight.toFixed(2)} kg</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Previsão de Entrega</p>
                <p className="text-2xl font-bold">
                  {formData.delivery_date ? new Date(formData.delivery_date + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Valor do Frete</p>
                <p className="text-2xl font-bold text-primary">R$ {totalPrice.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Botão de Ação */}
        <Button 
          type="submit" 
          className="w-full h-14 text-lg font-semibold bg-destructive hover:bg-destructive/90" 
          size="lg" 
          disabled={loading || pickupAddresses.length === 0 || addresses.length === 0}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <Package className="mr-2 h-5 w-5" />
              Solicitar Coleta e Entrega
            </>
          )}
        </Button>
      </form>

      {/* Modal para cadastrar novo endereço */}
      <Dialog open={showAddressModal} onOpenChange={setShowAddressModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Novo Endereço de Entrega
            </DialogTitle>
            <DialogDescription>
              Cadastre um novo endereço para usar nas suas entregas
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="addr_name">Nome do Endereço *</Label>
              <Input
                id="addr_name"
                value={newAddress.name}
                onChange={(e) => handleNewAddressChange('name', e.target.value)}
                placeholder="Ex: Casa do João, Escritório Centro"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="addr_recipient_name">Nome do Destinatário *</Label>
                <Input
                  id="addr_recipient_name"
                  value={newAddress.recipient_name}
                  onChange={(e) => handleNewAddressChange('recipient_name', e.target.value)}
                  placeholder="Nome completo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addr_recipient_phone">Telefone *</Label>
                <Input
                  id="addr_recipient_phone"
                  value={newAddress.recipient_phone}
                  onChange={(e) => handleNewAddressChange('recipient_phone', e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="addr_recipient_document">CPF/CNPJ (opcional)</Label>
              <Input
                id="addr_recipient_document"
                value={newAddress.recipient_document}
                onChange={(e) => handleNewAddressChange('recipient_document', e.target.value)}
                placeholder="Documento do destinatário"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="addr_cep">CEP *</Label>
                <div className="relative">
                  <Input
                    id="addr_cep"
                    value={newAddress.cep}
                    onChange={(e) => handleNewAddressChange('cep', e.target.value)}
                    placeholder="00000-000"
                    maxLength={9}
                  />
                  {loadingCep && (
                    <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="addr_state">Estado *</Label>
                <Input
                  id="addr_state"
                  value={newAddress.state}
                  onChange={(e) => handleNewAddressChange('state', e.target.value)}
                  placeholder="UF"
                  maxLength={2}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="addr_street">Rua *</Label>
              <Input
                id="addr_street"
                value={newAddress.street}
                onChange={(e) => handleNewAddressChange('street', e.target.value)}
                placeholder="Nome da rua"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="addr_number">Número *</Label>
                <Input
                  id="addr_number"
                  value={newAddress.number}
                  onChange={(e) => handleNewAddressChange('number', e.target.value)}
                  placeholder="Número"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addr_complement">Complemento *</Label>
                <Input
                  id="addr_complement"
                  value={newAddress.complement}
                  onChange={(e) => handleNewAddressChange('complement', e.target.value)}
                  placeholder="Apto, Bloco, etc."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="addr_neighborhood">Bairro *</Label>
              <Input
                id="addr_neighborhood"
                value={newAddress.neighborhood}
                onChange={(e) => handleNewAddressChange('neighborhood', e.target.value)}
                placeholder="Bairro"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="addr_city">Cidade *</Label>
              <Input
                id="addr_city"
                value={newAddress.city}
                onChange={(e) => handleNewAddressChange('city', e.target.value)}
                placeholder="Cidade"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="addr_reference">Referência (opcional)</Label>
              <Input
                id="addr_reference"
                value={newAddress.reference}
                onChange={(e) => handleNewAddressChange('reference', e.target.value)}
                placeholder="Ponto de referência"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddressModal(false);
                  resetNewAddress();
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSaveNewAddress}
                disabled={savingAddress}
                className="flex-1"
              >
                {savingAddress ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Salvar Endereço
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal para cadastrar novo endereço de coleta */}
      <Dialog open={showPickupAddressModal} onOpenChange={setShowPickupAddressModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-green-600" />
              Novo Endereço de Coleta
            </DialogTitle>
            <DialogDescription>
              Cadastre um novo endereço de coleta para suas remessas
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="pickup_name">Nome do Endereço *</Label>
              <Input
                id="pickup_name"
                value={newPickupAddress.name}
                onChange={(e) => handleNewPickupAddressChange('name', e.target.value)}
                placeholder="Ex: Sede, Filial Centro"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pickup_contact_name">Nome do Contato *</Label>
                <Input
                  id="pickup_contact_name"
                  value={newPickupAddress.contact_name}
                  onChange={(e) => handleNewPickupAddressChange('contact_name', e.target.value)}
                  placeholder="Nome do responsável"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pickup_contact_phone">Telefone *</Label>
                <Input
                  id="pickup_contact_phone"
                  value={newPickupAddress.contact_phone}
                  onChange={(e) => handleNewPickupAddressChange('contact_phone', e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pickup_cep">CEP *</Label>
                <div className="relative">
                  <Input
                    id="pickup_cep"
                    value={newPickupAddress.cep}
                    onChange={(e) => handleNewPickupAddressChange('cep', e.target.value)}
                    placeholder="00000-000"
                    maxLength={9}
                  />
                  {loadingPickupCep && (
                    <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pickup_state">Estado *</Label>
                <Input
                  id="pickup_state"
                  value={newPickupAddress.state}
                  onChange={(e) => handleNewPickupAddressChange('state', e.target.value)}
                  placeholder="UF"
                  maxLength={2}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pickup_street">Rua *</Label>
              <Input
                id="pickup_street"
                value={newPickupAddress.street}
                onChange={(e) => handleNewPickupAddressChange('street', e.target.value)}
                placeholder="Nome da rua"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pickup_number">Número *</Label>
                <Input
                  id="pickup_number"
                  value={newPickupAddress.number}
                  onChange={(e) => handleNewPickupAddressChange('number', e.target.value)}
                  placeholder="Número"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pickup_complement">Complemento *</Label>
                <Input
                  id="pickup_complement"
                  value={newPickupAddress.complement}
                  onChange={(e) => handleNewPickupAddressChange('complement', e.target.value)}
                  placeholder="Apto, Bloco, etc."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pickup_neighborhood">Bairro *</Label>
              <Input
                id="pickup_neighborhood"
                value={newPickupAddress.neighborhood}
                onChange={(e) => handleNewPickupAddressChange('neighborhood', e.target.value)}
                placeholder="Bairro"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pickup_city">Cidade *</Label>
              <Input
                id="pickup_city"
                value={newPickupAddress.city}
                onChange={(e) => handleNewPickupAddressChange('city', e.target.value)}
                placeholder="Cidade"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pickup_reference">Referência (opcional)</Label>
              <Input
                id="pickup_reference"
                value={newPickupAddress.reference}
                onChange={(e) => handleNewPickupAddressChange('reference', e.target.value)}
                placeholder="Ponto de referência"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowPickupAddressModal(false);
                  resetNewPickupAddress();
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSaveNewPickupAddress}
                disabled={savingPickupAddress}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {savingPickupAddress ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Salvar Endereço
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default B2BNovaRemessa;