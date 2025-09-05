import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Plus, Edit2, Check, Trash2, Star } from "lucide-react";
import InputMask from "react-input-mask";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { sanitizeTextInput } from "@/utils/inputValidation";

interface SavedAddress {
  id: string;
  name: string;
  document: string;
  phone: string;
  email: string;
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  reference?: string;
  is_default: boolean;
}

interface AddressData {
  name: string;
  document: string;
  phone: string;
  email: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  reference: string;
}

interface SavedAddressManagerProps {
  type: 'sender' | 'recipient';
  title: string;
  currentAddressData: AddressData;
  onAddressSelect: (addressData: AddressData) => void;
  onAddressSave?: (addressData: AddressData) => void;
}

const SavedAddressManager = ({ 
  type, 
  title, 
  currentAddressData, 
  onAddressSelect, 
  onAddressSave 
}: SavedAddressManagerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);
  const [isNewAddress, setIsNewAddress] = useState(false);

  const tableName = type === 'sender' ? 'saved_senders' : 'saved_recipients';

  // Carregar endereços salvos
  const loadSavedAddresses = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSavedAddresses(data || []);
      
      // Selecionar automaticamente o endereço padrão
      const defaultAddress = data?.find(address => address.is_default);
      if (defaultAddress) {
        setSelectedAddressId(defaultAddress.id);
        onAddressSelect({
          name: defaultAddress.name,
          document: defaultAddress.document,
          phone: defaultAddress.phone,
          email: defaultAddress.email,
          cep: defaultAddress.cep,
          street: defaultAddress.street,
          number: defaultAddress.number,
          complement: defaultAddress.complement || "",
          neighborhood: defaultAddress.neighborhood,
          city: defaultAddress.city,
          state: defaultAddress.state,
          reference: defaultAddress.reference || ""
        });
      }
    } catch (error) {
      console.error(`Erro ao carregar ${type}s:`, error);
      toast({
        title: "Erro",
        description: `Não foi possível carregar os ${type === 'sender' ? 'remetentes' : 'destinatários'} salvos`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSavedAddresses();
  }, [user]);

  // Salvar endereço atual
  const saveAddress = async (addressData: AddressData, setAsDefault = false) => {
    if (!user) return;

    setLoading(true);
    try {
      // Se definir como padrão, remover padrão de outros
      if (setAsDefault) {
        await supabase
          .from(tableName)
          .update({ is_default: false })
          .eq('user_id', user.id);
      }

      const { data, error } = await supabase
        .from(tableName)
        .insert({
          user_id: user.id,
          name: addressData.name,
          document: addressData.document,
          phone: addressData.phone,
          email: addressData.email,
          cep: addressData.cep,
          street: addressData.street,
          number: addressData.number,
          complement: addressData.complement || null,
          neighborhood: addressData.neighborhood,
          city: addressData.city,
          state: addressData.state,
          reference: addressData.reference || null,
          is_default: setAsDefault || savedAddresses.length === 0 // Primeiro endereço é padrão
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: `${type === 'sender' ? 'Remetente' : 'Destinatário'} salvo!`,
        description: setAsDefault ? "Definido como padrão para futuras cotações" : "Salvo com sucesso"
      });

      loadSavedAddresses();
      onAddressSave?.(addressData);
    } catch (error) {
      console.error(`Erro ao salvar ${type}:`, error);
      toast({
        title: "Erro",
        description: `Não foi possível salvar o ${type === 'sender' ? 'remetente' : 'destinatário'}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Atualizar endereço
  const updateAddress = async (addressId: string, addressData: AddressData) => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from(tableName)
        .update({
          name: addressData.name,
          document: addressData.document,
          phone: addressData.phone,
          email: addressData.email,
          cep: addressData.cep,
          street: addressData.street,
          number: addressData.number,
          complement: addressData.complement || null,
          neighborhood: addressData.neighborhood,
          city: addressData.city,
          state: addressData.state,
          reference: addressData.reference || null
        })
        .eq('id', addressId);

      if (error) throw error;

      toast({
        title: `${type === 'sender' ? 'Remetente' : 'Destinatário'} atualizado!`,
        description: "Dados atualizados com sucesso"
      });

      loadSavedAddresses();
      setShowEditDialog(false);
      setEditingAddress(null);
    } catch (error) {
      console.error(`Erro ao atualizar ${type}:`, error);
      toast({
        title: "Erro",
        description: `Não foi possível atualizar o ${type === 'sender' ? 'remetente' : 'destinatário'}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Definir como padrão
  const setAsDefault = async (addressId: string) => {
    if (!user) return;

    setLoading(true);
    try {
      // Remover padrão de todos
      await supabase
        .from(tableName)
        .update({ is_default: false })
        .eq('user_id', user.id);

      // Definir novo padrão
      await supabase
        .from(tableName)
        .update({ is_default: true })
        .eq('id', addressId);

      toast({
        title: "Padrão atualizado!",
        description: `Este ${type === 'sender' ? 'remetente' : 'destinatário'} será usado automaticamente`
      });

      loadSavedAddresses();
    } catch (error) {
      console.error('Erro ao definir padrão:', error);
      toast({
        title: "Erro",
        description: "Não foi possível definir como padrão",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Deletar endereço
  const deleteAddress = async (addressId: string) => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', addressId);

      if (error) throw error;

      toast({
        title: `${type === 'sender' ? 'Remetente' : 'Destinatário'} removido`,
        description: `${type === 'sender' ? 'Remetente' : 'Destinatário'} removido com sucesso`
      });

      loadSavedAddresses();
    } catch (error) {
      console.error(`Erro ao deletar ${type}:`, error);
      toast({
        title: "Erro",
        description: `Não foi possível remover o ${type === 'sender' ? 'remetente' : 'destinatário'}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Selecionar endereço
  const handleAddressSelect = (addressId: string) => {
    const address = savedAddresses.find(s => s.id === addressId);
    if (address) {
      setSelectedAddressId(addressId);
      onAddressSelect({
        name: address.name,
        document: address.document,
        phone: address.phone,
        email: address.email,
        cep: address.cep,
        street: address.street,
        number: address.number,
        complement: address.complement || "",
        neighborhood: address.neighborhood,
        city: address.city,
        state: address.state,
        reference: address.reference || ""
      });
    }
  };

  // Verificar se dados atuais são diferentes dos salvos
  const isCurrentDataNew = () => {
    if (!selectedAddressId) return true;
    
    const selectedAddress = savedAddresses.find(s => s.id === selectedAddressId);
    if (!selectedAddress) return true;

    return (
      selectedAddress.name !== currentAddressData.name ||
      selectedAddress.document !== currentAddressData.document ||
      selectedAddress.phone !== currentAddressData.phone ||
      selectedAddress.email !== currentAddressData.email ||
      selectedAddress.cep !== currentAddressData.cep ||
      selectedAddress.street !== currentAddressData.street ||
      selectedAddress.number !== currentAddressData.number ||
      (selectedAddress.complement || "") !== currentAddressData.complement ||
      selectedAddress.neighborhood !== currentAddressData.neighborhood ||
      selectedAddress.city !== currentAddressData.city ||
      selectedAddress.state !== currentAddressData.state ||
      (selectedAddress.reference || "") !== currentAddressData.reference
    );
  };

  if (!user) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <User className="h-5 w-5 text-primary" />
            <span>{title}</span>
          </div>
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setIsNewAddress(true);
                  setEditingAddress(null);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {isNewAddress ? `Adicionar Novo ${type === 'sender' ? 'Remetente' : 'Destinatário'}` : `Editar ${type === 'sender' ? 'Remetente' : 'Destinatário'}`}
                </DialogTitle>
              </DialogHeader>
              <AddressFormContent 
                editingAddress={editingAddress} 
                isNewAddress={isNewAddress}
                onSave={(addressData) => {
                  if (isNewAddress) {
                    saveAddress(addressData, false);
                  } else if (editingAddress) {
                    updateAddress(editingAddress.id, addressData);
                  }
                  setShowEditDialog(false);
                }}
                onCancel={() => {
                  setShowEditDialog(false);
                  setEditingAddress(null);
                  setIsNewAddress(false);
                }}
                loading={loading}
              />
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {savedAddresses.length > 0 && (
          <div className="space-y-3">
            <Select value={selectedAddressId} onValueChange={handleAddressSelect}>
              <SelectTrigger>
                <SelectValue placeholder={`Selecione um ${type === 'sender' ? 'remetente' : 'destinatário'} salvo`} />
              </SelectTrigger>
              <SelectContent>
                {savedAddresses.map((address) => (
                  <SelectItem key={address.id} value={address.id}>
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium">{address.name}</span>
                      {address.is_default && (
                        <Badge variant="secondary" className="ml-2">
                          <Star className="h-3 w-3 mr-1" />
                          Padrão
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedAddressId && (
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const address = savedAddresses.find(s => s.id === selectedAddressId);
                    if (address) {
                      setEditingAddress(address);
                      setIsNewAddress(false);
                      setShowEditDialog(true);
                    }
                  }}
                >
                  <Edit2 className="h-4 w-4 mr-1" />
                  Editar
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAsDefault(selectedAddressId)}
                  disabled={savedAddresses.find(s => s.id === selectedAddressId)?.is_default}
                >
                  <Star className="h-4 w-4 mr-1" />
                  Definir Padrão
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteAddress(selectedAddressId)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Remover
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Botões de ação para dados atuais */}
        <div className="flex space-x-2 pt-2 border-t">
          {isCurrentDataNew() && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => saveAddress(currentAddressData, false)}
                disabled={loading || !currentAddressData.name}
              >
                <Plus className="h-4 w-4 mr-2" />
                Salvar Atual
              </Button>
              
              <Button
                size="sm"
                onClick={() => saveAddress(currentAddressData, true)}
                disabled={loading || !currentAddressData.name}
              >
                <Check className="h-4 w-4 mr-2" />
                Salvar como Padrão
              </Button>
            </>
          )}
          
          {selectedAddressId && !isCurrentDataNew() && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateAddress(selectedAddressId, currentAddressData)}
              disabled={loading}
            >
              <Check className="h-4 w-4 mr-2" />
              Atualizar Dados
            </Button>
          )}
        </div>

        {savedAddresses.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum {type === 'sender' ? 'remetente' : 'destinatário'} salvo ainda.</p>
            <p className="text-sm">Preencha os dados abaixo e salve para reutilizar.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Componente interno do formulário
interface AddressFormContentProps {
  editingAddress: SavedAddress | null;
  isNewAddress: boolean;
  onSave: (addressData: AddressData) => void;
  onCancel: () => void;
  loading: boolean;
}

const AddressFormContent = ({ editingAddress, isNewAddress, onSave, onCancel, loading }: AddressFormContentProps) => {
  const [formData, setFormData] = useState<AddressData>({
    name: editingAddress?.name || "",
    document: editingAddress?.document || "",
    phone: editingAddress?.phone || "",
    email: editingAddress?.email || "",
    cep: editingAddress?.cep || "",
    street: editingAddress?.street || "",
    number: editingAddress?.number || "",
    complement: editingAddress?.complement || "",
    neighborhood: editingAddress?.neighborhood || "",
    city: editingAddress?.city || "",
    state: editingAddress?.state || "",
    reference: editingAddress?.reference || ""
  });

  const handleInputChange = (field: keyof AddressData, value: string) => {
    const shouldPreserveSpaces = field === 'name' || field === 'street' || field === 'neighborhood' || field === 'city';
    let sanitizedValue: string;
    
    if (field === 'document') {
      sanitizedValue = value.replace(/[^0-9.\-\/]/g, '').substring(0, 18);
    } else if (field === 'phone') {
      sanitizedValue = value.replace(/[^0-9()\-\s]/g, '').substring(0, 20);
    } else if (field === 'email') {
      sanitizedValue = value.replace(/[^a-zA-Z0-9@._\-]/g, '').substring(0, 100);
    } else if (field === 'cep') {
      sanitizedValue = value.replace(/[^0-9\-]/g, '').substring(0, 9);
    } else if (shouldPreserveSpaces) {
      sanitizedValue = value.replace(/[<>\"'&\x00-\x1f\x7f-\x9f]/g, '').substring(0, 100);
    } else {
      sanitizedValue = sanitizeTextInput(value);
    }
    
    setFormData(prev => ({ ...prev, [field]: sanitizedValue }));
  };

  const isFormValid = () => {
    const requiredFields: (keyof AddressData)[] = [
      'name', 'document', 'phone', 'email', 'cep', 'street', 
      'number', 'neighborhood', 'city', 'state'
    ];
    return requiredFields.every(field => formData[field].trim() !== "");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormValid()) {
      onSave(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <Label>Nome completo *</Label>
          <Input
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Nome completo"
            required
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>CPF/CNPJ *</Label>
            <Input
              value={formData.document}
              onChange={(e) => handleInputChange('document', e.target.value)}
              placeholder="CPF ou CNPJ"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Telefone *</Label>
            <InputMask
              mask="(99) 99999-9999"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
            >
              {(inputProps: any) => (
                <Input
                  {...inputProps}
                  placeholder="(00) 00000-0000"
                  required
                />
              )}
            </InputMask>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label>E-mail *</Label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="email@exemplo.com"
            required
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>CEP *</Label>
            <InputMask
              mask="99999-999"
              value={formData.cep}
              onChange={(e) => handleInputChange('cep', e.target.value)}
            >
              {(inputProps: any) => (
                <Input
                  {...inputProps}
                  placeholder="00000-000"
                  required
                />
              )}
            </InputMask>
          </div>
          <div className="space-y-2">
            <Label>Número *</Label>
            <Input
              value={formData.number}
              onChange={(e) => handleInputChange('number', e.target.value)}
              placeholder="123"
              required
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label>Endereço *</Label>
          <Input
            value={formData.street}
            onChange={(e) => handleInputChange('street', e.target.value)}
            placeholder="Rua, Avenida..."
            required
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Bairro *</Label>
            <Input
              value={formData.neighborhood}
              onChange={(e) => handleInputChange('neighborhood', e.target.value)}
              placeholder="Bairro"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Complemento</Label>
            <Input
              value={formData.complement}
              onChange={(e) => handleInputChange('complement', e.target.value)}
              placeholder="Apto, Bloco..."
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Cidade *</Label>
            <Input
              value={formData.city}
              onChange={(e) => handleInputChange('city', e.target.value)}
              placeholder="Cidade"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Estado *</Label>
            <Input
              value={formData.state}
              onChange={(e) => handleInputChange('state', e.target.value)}
              placeholder="GO"
              maxLength={2}
              required
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label>Referência</Label>
          <Input
            value={formData.reference}
            onChange={(e) => handleInputChange('reference', e.target.value)}
            placeholder="Ponto de referência"
          />
        </div>
      </div>

      <div className="flex space-x-2 pt-4">
        <Button
          type="submit"
          disabled={!isFormValid() || loading}
        >
          {loading ? "Salvando..." : "Salvar"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
};

export default SavedAddressManager;