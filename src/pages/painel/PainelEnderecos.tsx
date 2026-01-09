import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Plus, Loader2, Pencil, Trash2, Star, Package, Truck, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  sanitizeName,
  formatCep,
  sanitizeCep,
  sanitizeStreet,
  sanitizeNumber,
  sanitizeComplement,
  sanitizeNeighborhood,
  sanitizeCity,
  sanitizeState,
  sanitizeReference,
  sanitizeContactName,
  formatPhone,
  formatDocument
} from '@/utils/addressFieldValidation';

// Faixas de CEP permitidas para Envio Local (são as mesmas bloqueadas no Nacional)
const LOCAL_ALLOWED_CEP_RANGES: [number, number][] = [
  [74000000, 74899999],
  [74900000, 74999999],
  [75000000, 75159999],
  [75170000, 75174999],
  [75250000, 75264999],
  [75340000, 75344999],
  [75345000, 75349999],
  [75380000, 75394799],
];

const isAllowedLocalCep = (cep: string): boolean => {
  const cleanCep = cep.replace(/\D/g, "");
  if (cleanCep.length !== 8) return false;
  
  const cepNum = parseInt(cleanCep, 10);
  return LOCAL_ALLOWED_CEP_RANGES.some(([min, max]) => cepNum >= min && cepNum <= max);
};

interface B2BClient {
  id: string;
  company_name: string;
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

type AddressType = 'coleta' | 'entrega';

const PainelEnderecos = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [client, setClient] = useState<B2BClient | null>(null);
  const [deliveryAddresses, setDeliveryAddresses] = useState<DeliveryAddress[]>([]);
  const [pickupAddresses, setPickupAddresses] = useState<PickupAddress[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<DeliveryAddress | PickupAddress | null>(null);
  const [addressType, setAddressType] = useState<AddressType>('coleta');
  const [activeTab, setActiveTab] = useState<'todos' | 'coleta' | 'entrega'>('todos');
  const [cepError, setCepError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    contact_name: '',
    contact_phone: '',
    recipient_document: '',
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    reference: '',
    is_default: false,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: clientData, error: clientError } = await supabase
        .from('b2b_clients')
        .select('id, company_name')
        .eq('user_id', user.id)
        .single();

      if (clientError || !clientData) {
        toast.error('Cliente não encontrado');
        navigate('/painel');
        return;
      }

      setClient(clientData);

      // Carregar endereços de entrega
      const { data: deliveryData } = await supabase
        .from('b2b_delivery_addresses')
        .select('*')
        .eq('b2b_client_id', clientData.id)
        .order('is_default', { ascending: false })
        .order('name');

      setDeliveryAddresses(deliveryData || []);

      // Carregar endereços de coleta
      const { data: pickupData } = await supabase
        .from('b2b_pickup_addresses')
        .select('*')
        .eq('b2b_client_id', clientData.id)
        .order('is_default', { ascending: false })
        .order('name');

      setPickupAddresses(pickupData || []);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar endereços');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      contact_name: '',
      contact_phone: '',
      recipient_document: '',
      cep: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      reference: '',
      is_default: false,
    });
    setEditingAddress(null);
    setCepError(null);
  };

  const handleOpenDialog = (type: AddressType, address?: DeliveryAddress | PickupAddress) => {
    setAddressType(type);
    setCepError(null);
    if (address) {
      setEditingAddress(address);
      setFormData({
        name: address.name,
        contact_name: type === 'coleta' 
          ? (address as PickupAddress).contact_name 
          : (address as DeliveryAddress).recipient_name,
        contact_phone: type === 'coleta'
          ? (address as PickupAddress).contact_phone
          : (address as DeliveryAddress).recipient_phone,
        recipient_document: type === 'entrega' 
          ? (address as DeliveryAddress).recipient_document || ''
          : '',
        cep: address.cep,
        street: address.street,
        number: address.number,
        complement: address.complement || '',
        neighborhood: address.neighborhood,
        city: address.city,
        state: address.state,
        reference: address.reference || '',
        is_default: address.is_default,
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleCepSearch = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    // Validar se o CEP está na faixa permitida para Local
    if (!isAllowedLocalCep(cleanCep)) {
      setCepError('CEP fora da área de atendimento Local. Somente região metropolitana de Goiânia.');
      return;
    }

    setCepError(null);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          street: data.logradouro || '',
          neighborhood: data.bairro || '',
          city: data.localidade || '',
          state: data.uf || '',
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    }
  };

  const handleCepChange = (value: string) => {
    const formatted = formatCep(value);
    setFormData(prev => ({ ...prev, cep: formatted }));
    
    const cleanCep = sanitizeCep(value);
    if (cleanCep.length === 8) {
      handleCepSearch(formatted);
    } else {
      setCepError(null);
    }
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhone(value);
    setFormData(prev => ({ ...prev, contact_phone: formatted }));
  };

  const handleDocumentChange = (value: string) => {
    const formatted = formatDocument(value);
    setFormData(prev => ({ ...prev, recipient_document: formatted }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;

    // Validar CEP antes de salvar
    const cleanCep = sanitizeCep(formData.cep);
    if (!isAllowedLocalCep(cleanCep)) {
      setCepError('CEP fora da área de atendimento Local. Somente região metropolitana de Goiânia.');
      toast.error('CEP não permitido para envios locais');
      return;
    }

    setSaving(true);

    try {
      if (addressType === 'coleta') {
        const addressData = {
          b2b_client_id: client.id,
          name: formData.name,
          contact_name: formData.contact_name,
          contact_phone: formData.contact_phone,
          cep: formData.cep,
          street: formData.street,
          number: formData.number,
          complement: formData.complement || null,
          neighborhood: formData.neighborhood,
          city: formData.city,
          state: formData.state,
          reference: formData.reference || null,
          is_default: formData.is_default,
        };

        if (editingAddress) {
          const { error } = await supabase
            .from('b2b_pickup_addresses')
            .update(addressData)
            .eq('id', editingAddress.id);
          if (error) throw error;
          toast.success('Endereço de coleta atualizado!');
        } else {
          const { error } = await supabase
            .from('b2b_pickup_addresses')
            .insert(addressData);
          if (error) throw error;
          toast.success('Endereço de coleta cadastrado!');
        }
      } else {
        const addressData = {
          b2b_client_id: client.id,
          name: formData.name,
          recipient_name: formData.contact_name,
          recipient_phone: formData.contact_phone,
          recipient_document: formData.recipient_document || null,
          cep: formData.cep,
          street: formData.street,
          number: formData.number,
          complement: formData.complement || null,
          neighborhood: formData.neighborhood,
          city: formData.city,
          state: formData.state,
          reference: formData.reference || null,
          is_default: formData.is_default,
        };

        if (editingAddress) {
          const { error } = await supabase
            .from('b2b_delivery_addresses')
            .update(addressData)
            .eq('id', editingAddress.id);
          if (error) throw error;
          toast.success('Endereço de entrega atualizado!');
        } else {
          const { error } = await supabase
            .from('b2b_delivery_addresses')
            .insert(addressData);
          if (error) throw error;
          toast.success('Endereço de entrega cadastrado!');
        }
      }

      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar endereço');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (type: AddressType, id: string) => {
    if (!confirm('Tem certeza que deseja excluir este endereço?')) return;

    try {
      const table = type === 'coleta' ? 'b2b_pickup_addresses' : 'b2b_delivery_addresses';
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      toast.success('Endereço excluído!');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir endereço');
    }
  };

  const handleSetDefault = async (type: AddressType, id: string) => {
    if (!client) return;

    try {
      const table = type === 'coleta' ? 'b2b_pickup_addresses' : 'b2b_delivery_addresses';
      
      await supabase.from(table).update({ is_default: false }).eq('b2b_client_id', client.id);
      await supabase.from(table).update({ is_default: true }).eq('id', id);

      toast.success('Endereço padrão definido!');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao definir endereço padrão');
    }
  };

  const renderAddressCard = (address: DeliveryAddress | PickupAddress, type: AddressType) => {
    const isPickup = type === 'coleta';
    const contactName = isPickup 
      ? (address as PickupAddress).contact_name 
      : (address as DeliveryAddress).recipient_name;
    const contactPhone = isPickup
      ? (address as PickupAddress).contact_phone
      : (address as DeliveryAddress).recipient_phone;

    return (
      <Card key={address.id} className={`shadow-md hover:shadow-lg transition-all border-0 overflow-hidden ${address.is_default ? 'ring-2 ring-primary' : ''}`}>
        <div className={`h-1 ${address.is_default ? 'bg-primary' : 'bg-slate-200'}`} />
        <CardContent className="pt-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold flex items-center gap-2">
              {isPickup ? <Package className="h-4 w-4 text-green-600" /> : <Truck className="h-4 w-4 text-blue-600" />}
              {address.name}
            </span>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className={isPickup ? 'text-green-600 border-green-200' : 'text-blue-600 border-blue-200'}>
                {isPickup ? 'Coleta' : 'Entrega'}
              </Badge>
              {address.is_default && (
                <Badge className="text-xs bg-primary text-white">
                  <Star className="h-3 w-3 mr-1" />
                  Padrão
                </Badge>
              )}
            </div>
          </div>
          <p className="font-medium text-sm">{contactName}</p>
          <p className="text-xs text-muted-foreground">{contactPhone}</p>
          <p className="text-sm">
            {address.street}, {address.number}
            {address.complement && `, ${address.complement}`}
          </p>
          <p className="text-sm text-muted-foreground">
            {address.neighborhood} - {address.city}/{address.state}
          </p>
          <p className="text-xs text-muted-foreground">CEP: {address.cep}</p>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => handleOpenDialog(type, address)}>
              <Pencil className="h-3 w-3 mr-1" />
              Editar
            </Button>
            {!address.is_default && (
              <Button variant="outline" size="sm" onClick={() => handleSetDefault(type, address.id)}>
                <Star className="h-3 w-3 mr-1" />
                Padrão
              </Button>
            )}
            <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive hover:text-white" onClick={() => handleDelete(type, address.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const filteredAddresses = () => {
    if (activeTab === 'coleta') {
      return { pickup: pickupAddresses, delivery: [] };
    }
    if (activeTab === 'entrega') {
      return { pickup: [], delivery: deliveryAddresses };
    }
    return { pickup: pickupAddresses, delivery: deliveryAddresses };
  };

  const { pickup, delivery } = filteredAddresses();

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <MapPin className="h-12 w-12 animate-pulse mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Endereços</h1>
          <p className="text-muted-foreground">Gerencie seus endereços de coleta e entrega</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => handleOpenDialog('coleta')} 
            variant="outline"
            className="border-green-200 text-green-700 hover:bg-green-50"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Coleta
          </Button>
          <Button 
            onClick={() => handleOpenDialog('entrega')} 
            className="bg-gradient-to-r from-primary to-red-600"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Entrega
          </Button>
        </div>
      </div>

      {/* Filtro de tipo */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'todos' | 'coleta' | 'entrega')}>
        <TabsList>
          <TabsTrigger value="todos">Todos</TabsTrigger>
          <TabsTrigger value="coleta">Coleta</TabsTrigger>
          <TabsTrigger value="entrega">Entrega</TabsTrigger>
        </TabsList>
      </Tabs>

      {pickup.length === 0 && delivery.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">Nenhum endereço cadastrado</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => handleOpenDialog('coleta')} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Cadastrar Coleta
              </Button>
              <Button onClick={() => handleOpenDialog('entrega')}>
                <Plus className="mr-2 h-4 w-4" />
                Cadastrar Entrega
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pickup.map((addr) => renderAddressCard(addr, 'coleta'))}
          {delivery.map((addr) => renderAddressCard(addr, 'entrega'))}
        </div>
      )}

      {/* Dialog para adicionar/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAddress ? 'Editar' : 'Novo'} Endereço de {addressType === 'coleta' ? 'Coleta' : 'Entrega'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Endereço (apelido) *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: sanitizeName(e.target.value) }))}
                placeholder={addressType === 'coleta' ? 'Ex: Matriz, Filial Centro' : 'Ex: Casa, Escritório'}
                maxLength={40}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_name">{addressType === 'coleta' ? 'Nome do Responsável' : 'Nome do Destinatário'} *</Label>
                <Input
                  id="contact_name"
                  value={formData.contact_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, contact_name: sanitizeContactName(e.target.value) }))}
                  maxLength={40}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_phone">Telefone *</Label>
                <Input
                  id="contact_phone"
                  value={formData.contact_phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                  required
                />
              </div>
            </div>

            {addressType === 'entrega' && (
              <div className="space-y-2">
                <Label htmlFor="recipient_document">CPF/CNPJ</Label>
                <Input
                  id="recipient_document"
                  value={formData.recipient_document}
                  onChange={(e) => handleDocumentChange(e.target.value)}
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  maxLength={18}
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cep">CEP *</Label>
                <Input
                  id="cep"
                  value={formData.cep}
                  onChange={(e) => handleCepChange(e.target.value)}
                  placeholder="00000-000"
                  maxLength={9}
                  required
                  className={cepError ? 'border-destructive' : ''}
                />
                {cepError && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {cepError}
                  </p>
                )}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="street">Rua *</Label>
                <Input
                  id="street"
                  value={formData.street}
                  onChange={(e) => setFormData(prev => ({ ...prev, street: sanitizeStreet(e.target.value) }))}
                  maxLength={40}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="number">Número *</Label>
                <Input
                  id="number"
                  value={formData.number}
                  onChange={(e) => setFormData(prev => ({ ...prev, number: sanitizeNumber(e.target.value) }))}
                  maxLength={6}
                  required
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="complement">Complemento</Label>
                <Input
                  id="complement"
                  value={formData.complement}
                  onChange={(e) => setFormData(prev => ({ ...prev, complement: sanitizeComplement(e.target.value) }))}
                  maxLength={40}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="neighborhood">Bairro *</Label>
                <Input
                  id="neighborhood"
                  value={formData.neighborhood}
                  onChange={(e) => setFormData(prev => ({ ...prev, neighborhood: sanitizeNeighborhood(e.target.value) }))}
                  maxLength={40}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Cidade *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: sanitizeCity(e.target.value) }))}
                  maxLength={40}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">Estado *</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData(prev => ({ ...prev, state: sanitizeState(e.target.value) }))}
                  maxLength={2}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference">Referência</Label>
              <Input
                id="reference"
                value={formData.reference}
                onChange={(e) => setFormData(prev => ({ ...prev, reference: sanitizeReference(e.target.value) }))}
                placeholder="Próximo a..."
                maxLength={40}
              />
            </div>

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Endereço'
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PainelEnderecos;
