import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Package, Loader2, Truck, Car, Bike, MapPin, Plus, AlertCircle, ChevronLeft, ChevronRight, Check, Calendar, Scale } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

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

const TOTAL_STEPS = 5;

const B2BNovaRemessa = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
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
  // Regra: R$15 por endereço único + R$1 por kg acima de 5kg
  const calculateTotal = () => {
    const basePricePerAddress = 15;
    
    // Contar endereços únicos
    const uniqueAddresses = new Set(formData.volume_addresses.filter(a => a && a !== ''));
    const uniqueAddressCount = Math.max(uniqueAddresses.size, 1); // Mínimo 1
    
    // Base = quantidade de endereços únicos x R$15
    const baseTotal = uniqueAddressCount * basePricePerAddress;
    
    // Calcular peso total
    const weights = formData.volume_weights.map(w => parseFloat(w) || 0);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    
    // Adicional de peso: R$1 por kg acima de 5kg
    let weightExtra = 0;
    if (totalWeight > 5) {
      weightExtra = Math.ceil(totalWeight - 5);
    }
    
    return baseTotal + weightExtra;
  };

  const totalWeight = formData.volume_weights.map(w => parseFloat(w) || 0).reduce((sum, w) => sum + w, 0);
  const uniqueAddressCount = new Set(formData.volume_addresses.filter(a => a && a !== '')).size || 1;
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

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.pickup_address_id) {
          toast.error('Selecione o endereço de coleta');
          return false;
        }
        return true;
      case 2:
        if (!formData.volume_count || parseInt(formData.volume_count) < 1) {
          toast.error('Informe a quantidade de volumes');
          return false;
        }
        if (!formData.delivery_date) {
          toast.error('Selecione a data de entrega');
          return false;
        }
        return true;
      case 3:
        const hasValidWeights = formData.volume_weights.every(w => parseFloat(w) > 0);
        if (!hasValidWeights) {
          toast.error('Preencha o peso de todos os volumes');
          return false;
        }
        const hasValidAddresses = formData.volume_addresses.every(a => a && a !== '');
        if (!hasValidAddresses) {
          toast.error('Selecione o endereço de entrega para cada volume');
          return false;
        }
        return true;
      case 4:
        if (!formData.vehicle_type) {
          toast.error('Selecione o tipo de veículo');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, TOTAL_STEPS));
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!client) return;

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
    return value.replace(/\D/g, '').slice(0, 14);
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

  const getStepTitle = (step: number) => {
    switch (step) {
      case 1: return 'Onde coletar?';
      case 2: return 'Detalhes do Envio';
      case 3: return 'Volumes';
      case 4: return 'Veículo';
      case 5: return 'Confirmar';
      default: return '';
    }
  };

  const getStepIcon = (step: number) => {
    switch (step) {
      case 1: return <MapPin className="h-6 w-6" />;
      case 2: return <Calendar className="h-6 w-6" />;
      case 3: return <Package className="h-6 w-6" />;
      case 4: return <Truck className="h-6 w-6" />;
      case 5: return <Check className="h-6 w-6" />;
      default: return null;
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
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {/* Progress Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              {getStepIcon(currentStep)}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Etapa {currentStep} de {TOTAL_STEPS}</p>
              <h1 className="text-xl font-bold">{getStepTitle(currentStep)}</h1>
            </div>
          </div>
        </div>
        <Progress value={(currentStep / TOTAL_STEPS) * 100} className="h-2" />
      </div>

      {/* Step Content */}
      <div className="min-h-[400px]">
        {/* Step 1: Endereço de Coleta */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <p className="text-muted-foreground text-center">
              Selecione o local onde vamos buscar seus volumes
            </p>

            {pickupAddresses.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center">
                  <AlertCircle className="h-10 w-10 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-lg">Nenhum endereço cadastrado</p>
                  <p className="text-sm text-muted-foreground">Cadastre seu primeiro endereço de coleta</p>
                </div>
                <Button
                  onClick={() => setShowPickupAddressModal(true)}
                  size="lg"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Cadastrar Endereço
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {pickupAddresses.map((addr) => (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, pickup_address_id: addr.id }))}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      formData.pickup_address_id === addr.id
                        ? 'border-green-600 bg-green-50 dark:bg-green-950/20'
                        : 'border-border hover:border-green-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                        formData.pickup_address_id === addr.id
                          ? 'border-green-600 bg-green-600'
                          : 'border-muted-foreground'
                      }`}>
                        {formData.pickup_address_id === addr.id && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">{addr.name}</p>
                        <p className="text-sm text-muted-foreground">{addr.contact_name} - {addr.contact_phone}</p>
                        <p className="text-sm text-muted-foreground">
                          {addr.street}, {addr.number} - {addr.neighborhood}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {addr.city}/{addr.state} - CEP: {addr.cep}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPickupAddressModal(true)}
                  className="w-full border-dashed border-2 h-14"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Adicionar novo endereço
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Informações do Envio */}
        {currentStep === 2 && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="space-y-4">
              <div className="text-center">
                <Package className="h-12 w-12 mx-auto mb-3 text-primary" />
                <Label className="text-lg font-medium">Quantos volumes você vai enviar?</Label>
              </div>
              <Input
                type="number"
                min="1"
                value={formData.volume_count}
                onChange={(e) => handleChange('volume_count', e.target.value)}
                className="text-center text-2xl font-bold h-16"
                placeholder="1"
              />
            </div>

            <div className="space-y-4">
              <div className="text-center">
                <Calendar className="h-12 w-12 mx-auto mb-3 text-primary" />
                <Label className="text-lg font-medium">Quando você deseja a entrega?</Label>
              </div>
              <Input
                type="date"
                value={formData.delivery_date}
                onChange={(e) => handleChange('delivery_date', e.target.value)}
                min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                className="text-center text-lg h-14"
              />
              <p className="text-sm text-center text-muted-foreground">
                A data mínima é D+1 (amanhã)
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Detalhes dos Volumes */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <p className="text-muted-foreground text-center">
              Informe o peso e destino de cada volume
            </p>

            {addresses.length === 0 ? (
              <div className="text-center py-8 space-y-4">
                <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground" />
                <div>
                  <p className="font-medium">Nenhum endereço de entrega</p>
                  <p className="text-sm text-muted-foreground">Cadastre endereços de entrega primeiro</p>
                </div>
                <Button onClick={() => setShowAddressModal(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Cadastrar Endereço
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {formData.volume_weights.map((weight, index) => (
                  <div key={index} className="border rounded-xl p-4 bg-card space-y-4">
                    <div className="flex items-center gap-2 text-primary">
                      <Package className="h-5 w-5" />
                      <span className="font-semibold">Volume {index + 1}</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-sm flex items-center gap-1">
                          <Scale className="h-3 w-3" />
                          Peso (kg)
                        </Label>
                        <Input
                          type="text"
                          value={weight}
                          onChange={(e) => handleWeightChange(index, e.target.value)}
                          placeholder="Ex: 2.5"
                          className="h-12"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          Destino
                        </Label>
                        <Select
                          value={formData.volume_addresses[index] || ''}
                          onValueChange={(value) => handleAddressChange(index, value)}
                        >
                          <SelectTrigger className="h-12 border border-border">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {addresses.map((addr) => (
                              <SelectItem key={addr.id} value={addr.id}>
                                <span className="font-medium">{addr.name}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {formData.volume_addresses[index] && (
                      <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                        {(() => {
                          const addr = getAddressById(formData.volume_addresses[index]);
                          if (!addr) return null;
                          return (
                            <>
                              <p className="font-medium text-foreground">{addr.recipient_name}</p>
                              <p>{addr.street}, {addr.number} - {addr.city}/{addr.state}</p>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                ))}
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddressModal(true)}
                  className="w-full border-dashed h-12"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Novo endereço de entrega
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Tipo de Veículo */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <p className="text-muted-foreground text-center">
              Qual veículo você precisa para a coleta e entrega?
            </p>

            <RadioGroup
              value={formData.vehicle_type}
              onValueChange={(value) => handleChange('vehicle_type', value)}
              className="space-y-3"
            >
              {[
                { id: 'moto', label: 'Moto', icon: Bike, desc: 'Ideal para pequenos volumes' },
                { id: 'carro', label: 'Carro Utilitário', icon: Car, desc: 'Para volumes médios' },
                { id: 'caminhao', label: 'Caminhão', icon: Truck, desc: 'Para grandes cargas' },
              ].map((vehicle) => (
                <label
                  key={vehicle.id}
                  htmlFor={vehicle.id}
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    formData.vehicle_type === vehicle.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <RadioGroupItem value={vehicle.id} id={vehicle.id} className="sr-only" />
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                    formData.vehicle_type === vehicle.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}>
                    <vehicle.icon className="h-7 w-7" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{vehicle.label}</p>
                    <p className="text-sm text-muted-foreground">{vehicle.desc}</p>
                  </div>
                  {formData.vehicle_type === vehicle.id && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </label>
              ))}
            </RadioGroup>
          </div>
        )}

        {/* Step 5: Resumo */}
        {currentStep === 5 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <p className="text-muted-foreground text-center">
              Confira os dados do seu envio
            </p>

            <div className="space-y-4">
              {/* Coleta */}
              <div className="border rounded-xl p-4 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-green-600" />
                  <span className="font-semibold text-green-800 dark:text-green-200">Coleta</span>
                </div>
                {(() => {
                  const addr = getPickupAddressById(formData.pickup_address_id);
                  if (!addr) return null;
                  return (
                    <div className="text-sm text-green-700 dark:text-green-300">
                      <p className="font-medium">{addr.name}</p>
                      <p>{addr.street}, {addr.number} - {addr.city}/{addr.state}</p>
                    </div>
                  );
                })()}
              </div>

              {/* Volumes */}
              <div className="border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="h-4 w-4 text-primary" />
                  <span className="font-semibold">{formData.volume_count} Volume(s)</span>
                </div>
                <div className="space-y-2">
                  {formData.volume_weights.map((weight, index) => {
                    const addr = getAddressById(formData.volume_addresses[index]);
                    return (
                      <div key={index} className="flex justify-between text-sm py-2 border-b last:border-0">
                        <span className="text-muted-foreground">Vol. {index + 1} - {weight}kg</span>
                        <span className="font-medium">{addr?.name || '-'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Veículo e Data */}
              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Truck className="h-4 w-4 text-primary" />
                    <span className="text-sm text-muted-foreground">Veículo</span>
                  </div>
                  <p className="font-semibold capitalize">{formData.vehicle_type}</p>
                </div>
                <div className="border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="text-sm text-muted-foreground">Entrega</span>
                  </div>
                  <p className="font-semibold">
                    {formData.delivery_date ? new Date(formData.delivery_date + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                  </p>
                </div>
              </div>

              {/* Total */}
              <div className="border-2 border-primary rounded-xl p-6 bg-primary/5 text-center">
                <p className="text-sm text-muted-foreground mb-1">Valor do Frete</p>
                <p className="text-4xl font-bold text-primary">R$ {totalPrice.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-3 mt-8">
        {currentStep > 1 && (
          <Button
            type="button"
            variant="outline"
            onClick={handlePrev}
            className="flex-1 h-14"
          >
            <ChevronLeft className="mr-2 h-5 w-5" />
            Voltar
          </Button>
        )}
        
        {currentStep < TOTAL_STEPS ? (
          <Button
            type="button"
            onClick={handleNext}
            className="flex-1 h-14"
            disabled={
              (currentStep === 1 && pickupAddresses.length === 0) ||
              (currentStep === 3 && addresses.length === 0)
            }
          >
            Continuar
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleSubmit}
            className="flex-1 h-14 bg-destructive hover:bg-destructive/90"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Check className="mr-2 h-5 w-5" />
                Confirmar e Pagar
              </>
            )}
          </Button>
        )}
      </div>

      {/* Modal para cadastrar novo endereço de entrega */}
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
                placeholder="Somente números"
                maxLength={14}
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
