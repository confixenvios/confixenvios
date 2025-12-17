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
import { PhoneInput } from "@/components/ui/phone-input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface SavedSender {
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
  inscricao_estadual?: string;
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
  inscricaoEstadual?: string;
}

interface SavedSendersManagerProps {
  currentSenderData: AddressData;
  onSenderSelect: (senderData: AddressData) => void;
  onSenderSave?: (senderData: AddressData) => void;
}

const SavedSendersManager = ({ currentSenderData, onSenderSelect, onSenderSave }: SavedSendersManagerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [savedSenders, setSavedSenders] = useState<SavedSender[]>([]);
  const [selectedSenderId, setSelectedSenderId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingSender, setEditingSender] = useState<SavedSender | null>(null);
  const [isNewSender, setIsNewSender] = useState(false);

  // Carregar remetentes salvos
  const loadSavedSenders = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('saved_senders')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSavedSenders(data || []);
      
      // Selecionar automaticamente o remetente padrão
      const defaultSender = data?.find(sender => sender.is_default);
      if (defaultSender) {
        setSelectedSenderId(defaultSender.id);
        onSenderSelect({
          name: defaultSender.name,
          document: defaultSender.document,
          phone: defaultSender.phone,
          email: defaultSender.email,
          cep: defaultSender.cep,
          street: defaultSender.street,
          number: defaultSender.number,
          complement: defaultSender.complement || "",
          neighborhood: defaultSender.neighborhood,
          city: defaultSender.city,
          state: defaultSender.state,
          reference: defaultSender.reference || "",
          inscricaoEstadual: defaultSender.inscricao_estadual || ""
        });
      }
    } catch (error) {
      console.error('Erro ao carregar remetentes:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os remetentes salvos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSavedSenders();
  }, [user]);

  // Salvar remetente atual
  const saveSender = async (senderData: AddressData, setAsDefault = false) => {
    if (!user) return;

    setLoading(true);
    try {
      // Se definir como padrão, remover padrão de outros
      if (setAsDefault) {
        await supabase
          .from('saved_senders')
          .update({ is_default: false })
          .eq('user_id', user.id);
      }

      const { data, error } = await supabase
        .from('saved_senders')
        .insert({
          user_id: user.id,
          name: senderData.name,
          document: senderData.document,
          phone: senderData.phone,
          email: senderData.email,
          cep: senderData.cep,
          street: senderData.street,
          number: senderData.number,
          complement: senderData.complement || null,
          neighborhood: senderData.neighborhood,
          city: senderData.city,
          state: senderData.state,
          reference: senderData.reference || null,
          is_default: setAsDefault || savedSenders.length === 0 // Primeiro remetente é padrão
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Remetente salvo!",
        description: setAsDefault ? "Definido como padrão para futuras cotações" : "Salvo com sucesso"
      });

      loadSavedSenders();
      onSenderSave?.(senderData);
    } catch (error) {
      console.error('Erro ao salvar remetente:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o remetente",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Atualizar remetente
  const updateSender = async (senderId: string, senderData: AddressData) => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('saved_senders')
        .update({
          name: senderData.name,
          document: senderData.document,
          phone: senderData.phone,
          email: senderData.email,
          cep: senderData.cep,
          street: senderData.street,
          number: senderData.number,
          complement: senderData.complement || null,
          neighborhood: senderData.neighborhood,
          city: senderData.city,
          state: senderData.state,
          reference: senderData.reference || null
        })
        .eq('id', senderId);

      if (error) throw error;

      toast({
        title: "Remetente atualizado!",
        description: "Dados atualizados com sucesso"
      });

      loadSavedSenders();
      setShowEditDialog(false);
      setEditingSender(null);
    } catch (error) {
      console.error('Erro ao atualizar remetente:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o remetente",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Definir como padrão
  const setAsDefault = async (senderId: string) => {
    if (!user) return;

    setLoading(true);
    try {
      // Remover padrão de todos
      await supabase
        .from('saved_senders')
        .update({ is_default: false })
        .eq('user_id', user.id);

      // Definir novo padrão
      await supabase
        .from('saved_senders')
        .update({ is_default: true })
        .eq('id', senderId);

      toast({
        title: "Padrão atualizado!",
        description: "Este remetente será usado automaticamente"
      });

      loadSavedSenders();
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

  // Deletar remetente
  const deleteSender = async (senderId: string) => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('saved_senders')
        .delete()
        .eq('id', senderId);

      if (error) throw error;

      toast({
        title: "Remetente removido",
        description: "Remetente removido com sucesso"
      });

      loadSavedSenders();
    } catch (error) {
      console.error('Erro ao deletar remetente:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o remetente",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Selecionar remetente
  const handleSenderSelect = (senderId: string) => {
    const sender = savedSenders.find(s => s.id === senderId);
    if (sender) {
      setSelectedSenderId(senderId);
      onSenderSelect({
        name: sender.name,
        document: sender.document,
        phone: sender.phone,
        email: sender.email,
        cep: sender.cep,
        street: sender.street,
        number: sender.number,
        complement: sender.complement || "",
        neighborhood: sender.neighborhood,
        city: sender.city,
        state: sender.state,
        reference: sender.reference || ""
      });
    }
  };

  // Verificar se dados atuais são diferentes dos salvos
  const isCurrentDataNew = () => {
    if (!selectedSenderId) return true;
    
    const selectedSender = savedSenders.find(s => s.id === selectedSenderId);
    if (!selectedSender) return true;

    return (
      selectedSender.name !== currentSenderData.name ||
      selectedSender.document !== currentSenderData.document ||
      selectedSender.phone !== currentSenderData.phone ||
      selectedSender.email !== currentSenderData.email ||
      selectedSender.cep !== currentSenderData.cep ||
      selectedSender.street !== currentSenderData.street ||
      selectedSender.number !== currentSenderData.number ||
      (selectedSender.complement || "") !== currentSenderData.complement ||
      selectedSender.neighborhood !== currentSenderData.neighborhood ||
      selectedSender.city !== currentSenderData.city ||
      selectedSender.state !== currentSenderData.state ||
      (selectedSender.reference || "") !== currentSenderData.reference
    );
  };

  if (!user) return null;

  return (
    <Card className="border-primary/20 mb-4">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <User className="h-5 w-5 text-primary" />
            <span>Remetentes Salvos</span>
          </div>
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setIsNewSender(true);
                  setEditingSender(null);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {isNewSender ? "Adicionar Novo Remetente" : "Editar Remetente"}
                </DialogTitle>
              </DialogHeader>
              <SenderFormContent 
                editingSender={editingSender} 
                isNewSender={isNewSender}
                onSave={(senderData) => {
                  if (isNewSender) {
                    saveSender(senderData, false);
                  } else if (editingSender) {
                    updateSender(editingSender.id, senderData);
                  }
                  setShowEditDialog(false);
                }}
                onCancel={() => {
                  setShowEditDialog(false);
                  setEditingSender(null);
                  setIsNewSender(false);
                }}
                loading={loading}
              />
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {savedSenders.length > 0 && (
          <div className="space-y-3">
            <Select value={selectedSenderId} onValueChange={handleSenderSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um remetente salvo" />
              </SelectTrigger>
              <SelectContent>
                {savedSenders.map((sender) => (
                  <SelectItem key={sender.id} value={sender.id}>
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium">{sender.name}</span>
                      {sender.is_default && (
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

            {selectedSenderId && (
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const sender = savedSenders.find(s => s.id === selectedSenderId);
                    if (sender) {
                      setEditingSender(sender);
                      setIsNewSender(false);
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
                  onClick={() => setAsDefault(selectedSenderId)}
                  disabled={savedSenders.find(s => s.id === selectedSenderId)?.is_default}
                >
                  <Star className="h-4 w-4 mr-1" />
                  Definir Padrão
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteSender(selectedSenderId)}
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
                onClick={() => saveSender(currentSenderData, false)}
                disabled={loading || !currentSenderData.name}
              >
                <Plus className="h-4 w-4 mr-2" />
                Salvar Atual
              </Button>
              
              <Button
                size="sm"
                onClick={() => saveSender(currentSenderData, true)}
                disabled={loading || !currentSenderData.name}
              >
                <Check className="h-4 w-4 mr-2" />
                Salvar como Padrão
              </Button>
            </>
          )}
          
          {selectedSenderId && !isCurrentDataNew() && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateSender(selectedSenderId, currentSenderData)}
              disabled={loading}
            >
              <Check className="h-4 w-4 mr-2" />
              Atualizar Dados
            </Button>
          )}
        </div>

        {savedSenders.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum remetente salvo ainda.</p>
            <p className="text-sm">Preencha os dados abaixo e salve para reutilizar.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Componente interno do formulário
interface SenderFormContentProps {
  editingSender: SavedSender | null;
  isNewSender: boolean;
  onSave: (senderData: AddressData) => void;
  onCancel: () => void;
  loading: boolean;
}

const SenderFormContent = ({ editingSender, isNewSender, onSave, onCancel, loading }: SenderFormContentProps) => {
  const [formData, setFormData] = useState<AddressData>({
    name: editingSender?.name || "",
    document: editingSender?.document || "",
    phone: editingSender?.phone || "",
    email: editingSender?.email || "",
    cep: editingSender?.cep || "",
    street: editingSender?.street || "",
    number: editingSender?.number || "",
    complement: editingSender?.complement || "",
    neighborhood: editingSender?.neighborhood || "",
    city: editingSender?.city || "",
    state: editingSender?.state || "",
    reference: editingSender?.reference || "",
    inscricaoEstadual: editingSender?.inscricao_estadual || ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleInputChange = (field: keyof AddressData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Nome Completo */}
        <div className="md:col-span-2">
          <Label htmlFor="name">Nome Completo *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            placeholder="Nome do remetente"
            required
          />
        </div>

        {/* CPF/CNPJ */}
        <div>
          <Label htmlFor="document">CPF/CNPJ *</Label>
          <InputMask
            mask="999.999.999-99"
            value={formData.document}
            onChange={(e: any) => handleInputChange("document", e.target.value)}
          >
            {(inputProps: any) => (
              <Input
                {...inputProps}
                id="document"
                placeholder="000.000.000-00"
                required
              />
            )}
          </InputMask>
        </div>

        {/* Telefone */}
        <div>
          <Label htmlFor="phone">Telefone *</Label>
          <PhoneInput
            value={formData.phone}
            onChange={(e: any) => handleInputChange("phone", e.target.value)}
            placeholder="(00) 0000-0000"
            required
          />
        </div>

        {/* Email */}
        <div className="md:col-span-2">
          <Label htmlFor="email">E-mail *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange("email", e.target.value)}
            placeholder="email@exemplo.com"
            required
          />
        </div>

        {/* Inscrição Estadual */}
        <div className="md:col-span-2">
          <Label htmlFor="inscricaoEstadual">Inscrição Estadual (apenas para empresas)</Label>
          <Input
            id="inscricaoEstadual"
            value={formData.inscricaoEstadual || ""}
            onChange={(e) => handleInputChange("inscricaoEstadual", e.target.value)}
            placeholder="123456789"
          />
        </div>

        {/* CEP */}
        <div>
          <Label htmlFor="cep">CEP *</Label>
          <InputMask
            mask="99999-999"
            value={formData.cep}
            onChange={(e: any) => handleInputChange("cep", e.target.value)}
          >
            {(inputProps: any) => (
              <Input
                {...inputProps}
                id="cep"
                placeholder="00000-000"
                required
              />
            )}
          </InputMask>
        </div>

        {/* Estado */}
        <div>
          <Label htmlFor="state">Estado *</Label>
          <Input
            id="state"
            value={formData.state}
            onChange={(e) => handleInputChange("state", e.target.value)}
            placeholder="Ex: GO"
            required
          />
        </div>

        {/* Cidade */}
        <div>
          <Label htmlFor="city">Cidade *</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => handleInputChange("city", e.target.value)}
            placeholder="Nome da cidade"
            required
          />
        </div>

        {/* Bairro */}
        <div>
          <Label htmlFor="neighborhood">Bairro *</Label>
          <Input
            id="neighborhood"
            value={formData.neighborhood}
            onChange={(e) => handleInputChange("neighborhood", e.target.value)}
            placeholder="Nome do bairro"
            required
          />
        </div>

        {/* Rua */}
        <div className="md:col-span-2">
          <Label htmlFor="street">Rua/Avenida *</Label>
          <Input
            id="street"
            value={formData.street}
            onChange={(e) => handleInputChange("street", e.target.value)}
            placeholder="Nome da rua ou avenida"
            required
          />
        </div>

        {/* Número */}
        <div>
          <Label htmlFor="number">Número *</Label>
          <Input
            id="number"
            value={formData.number}
            onChange={(e) => handleInputChange("number", e.target.value)}
            placeholder="123"
            required
          />
        </div>

        {/* Complemento */}
        <div className="md:col-span-2">
          <Label htmlFor="complement">Complemento *</Label>
          <Input
            id="complement"
            value={formData.complement}
            onChange={(e) => handleInputChange("complement", e.target.value)}
            placeholder="Apto, bloco, etc."
            required
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : isNewSender ? "Adicionar Remetente" : "Atualizar Remetente"}
        </Button>
      </div>
    </form>
  );
};

export default SavedSendersManager;