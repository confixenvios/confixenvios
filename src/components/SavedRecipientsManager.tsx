import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useSavedRecipients } from "@/hooks/useSavedRecipients";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { User, Edit, Trash2, Star, Save, UserPlus } from "lucide-react";
import InputMask from "react-input-mask";
import { sanitizeTextInput } from "@/utils/inputValidation";

interface SavedRecipient {
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

interface SavedRecipientsManagerProps {
  currentRecipientData: AddressData;
  onRecipientSelect: (data: AddressData) => void;
  onRecipientSave: (data: AddressData) => void;
}

const SavedRecipientsManager = ({ 
  currentRecipientData, 
  onRecipientSelect, 
  onRecipientSave 
}: SavedRecipientsManagerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    savedRecipients,
    isLoading,
    saveApprovedRecipient,
    updateRecipient,
    convertToAddressData,
    setAsDefault,
    deleteRecipient
  } = useSavedRecipients();

  const [selectedRecipient, setSelectedRecipient] = useState<SavedRecipient | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState<SavedRecipient | null>(null);

  // Function to handle recipient selection
  const handleRecipientSelect = (recipientId: string) => {
    const recipient = savedRecipients.find(s => s.id === recipientId);
    if (recipient) {
      setSelectedRecipient(recipient);
      const addressData = convertToAddressData(recipient);
      onRecipientSelect(addressData);
      
      toast({
        title: "Destinatário selecionado!",
        description: `Dados de ${recipient.name} carregados com sucesso.`,
      });
    }
  };

  // Check if current data is different from selected recipient
  const isCurrentDataNew = () => {
    if (!selectedRecipient) return true;
    
    const recipientData = convertToAddressData(selectedRecipient);
    return JSON.stringify(recipientData) !== JSON.stringify(currentRecipientData);
  };

  // Save current data as new recipient
  const saveSender = async (setAsDefaultRecipient: boolean = false) => {
    try {
      await saveApprovedRecipient(currentRecipientData, setAsDefaultRecipient);
      onRecipientSave(currentRecipientData);
      toast({
        title: "Destinatário salvo!",
        description: setAsDefaultRecipient ? 
          "Destinatário salvo e definido como padrão." : 
          "Destinatário salvo com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar o destinatário. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  // Update existing recipient
  const updateSender = async () => {
    if (!selectedRecipient) return;
    
    try {
      await updateRecipient(selectedRecipient.id, currentRecipientData);
      toast({
        title: "Destinatário atualizado!",
        description: "Dados do destinatário atualizados com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o destinatário. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  // Set recipient as default
  const setAsDefaultRecipient = async (recipientId: string) => {
    try {
      await setAsDefault(recipientId);
      toast({
        title: "Destinatário padrão alterado!",
        description: "O destinatário foi definido como padrão.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível definir como padrão.",
        variant: "destructive"
      });
    }
  };

  // Delete recipient
  const deleteSender = async (recipientId: string) => {
    try {
      await deleteRecipient(recipientId);
      if (selectedRecipient?.id === recipientId) {
        setSelectedRecipient(null);
      }
      toast({
        title: "Destinatário removido!",
        description: "O destinatário foi removido com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao remover",
        description: "Não foi possível remover o destinatário.",
        variant: "destructive"
      });
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Card className="border-accent/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center space-x-2">
          <User className="h-4 w-4 text-primary" />
          <span>Destinatários Salvos</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {savedRecipients.length > 0 ? (
          <>
            <div className="space-y-3">
              <Label className="text-sm font-medium">Selecionar destinatário:</Label>
              <Select onValueChange={handleRecipientSelect}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Escolha um destinatário salvo" />
                </SelectTrigger>
                <SelectContent>
                  {savedRecipients.map((recipient) => (
                    <SelectItem key={recipient.id} value={recipient.id}>
                      <div className="flex items-center space-x-2">
                        <span>{recipient.name}</span>
                        {recipient.is_default && (
                          <Badge variant="secondary" className="text-xs">
                            <Star className="h-3 w-3 mr-1" />
                            Padrão
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedRecipient && (
              <div className="bg-accent/10 p-3 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">{selectedRecipient.name}</h4>
                  <div className="flex space-x-1">
                    {!selectedRecipient.is_default && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setAsDefaultRecipient(selectedRecipient.id)}
                        className="h-7 px-2"
                      >
                        <Star className="h-3 w-3" />
                      </Button>
                    )}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setIsEditing(true);
                            setEditingRecipient(selectedRecipient);
                          }}
                          className="h-7 px-2"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Editar Destinatário</DialogTitle>
                        </DialogHeader>
                        <RecipientFormContent
                          recipient={editingRecipient}
                          onSave={(data) => {
                            updateRecipient(selectedRecipient.id, data);
                            setIsEditing(false);
                            setEditingRecipient(null);
                          }}
                          onCancel={() => {
                            setIsEditing(false);
                            setEditingRecipient(null);
                          }}
                        />
                      </DialogContent>
                    </Dialog>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteSender(selectedRecipient.id)}
                      className="h-7 px-2 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedRecipient.email} • {selectedRecipient.phone}
                </p>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum destinatário salvo ainda.</p>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col space-y-2 pt-2">
          {isCurrentDataNew() && (
            <Button
              onClick={() => saveSender(false)}
              size="sm"
              variant="outline"
              className="w-full"
              disabled={isLoading}
            >
              <Save className="h-4 w-4 mr-2" />
              Salvar dados atuais
            </Button>
          )}

          {selectedRecipient && !isCurrentDataNew() && (
            <Button
              onClick={updateSender}
              size="sm"
              variant="outline"  
              className="w-full"
              disabled={isLoading}
            >
              <Edit className="h-4 w-4 mr-2" />
              Atualizar dados
            </Button>
          )}

          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost" className="w-full">
                <UserPlus className="h-4 w-4 mr-2" />
                Novo destinatário
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Adicionar Novo Destinatário</DialogTitle>
              </DialogHeader>
              <RecipientFormContent
                onSave={(data) => {
                  saveApprovedRecipient(data, false);
                  setShowDialog(false);
                }}
                onCancel={() => setShowDialog(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
};

// Form component for adding/editing recipients
const RecipientFormContent = ({ 
  recipient, 
  onSave, 
  onCancel 
}: { 
  recipient?: SavedRecipient | null; 
  onSave: (data: AddressData) => void; 
  onCancel: () => void; 
}) => {
  const [formData, setFormData] = useState<AddressData>({
    name: recipient?.name || "",
    document: recipient?.document || "",
    phone: recipient?.phone || "",
    email: recipient?.email || "",
    cep: recipient?.cep || "",
    street: recipient?.street || "",
    number: recipient?.number || "",
    complement: recipient?.complement || "",
    neighborhood: recipient?.neighborhood || "",
    city: recipient?.city || "",
    state: recipient?.state || "",
    reference: recipient?.reference || ""
  });

  const handleInputChange = (field: keyof AddressData, value: string) => {
    const shouldPreserveSpaces = field === 'name' || field === 'street' || field === 'neighborhood' || field === 'city';
    const sanitizedValue = shouldPreserveSpaces 
      ? value.replace(/[<>\"'&]/g, '').substring(0, 500)
      : sanitizeTextInput(value);
    
    setFormData(prev => ({ ...prev, [field]: sanitizedValue }));
  };

  const isFormValid = () => {
    const requiredFields: (keyof AddressData)[] = [
      'name', 'document', 'phone', 'email', 'cep', 'street', 
      'number', 'neighborhood', 'city', 'state'
    ];
    return requiredFields.every(field => formData[field].trim() !== "");
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <Label>Nome completo *</Label>
          <Input
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Nome completo"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>CPF/CNPJ *</Label>
            <Input
              value={formData.document}
              onChange={(e) => handleInputChange('document', e.target.value)}
              placeholder="CPF ou CNPJ"
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
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label>Endereço *</Label>
          <Input
            value={formData.street}
            onChange={(e) => handleInputChange('street', e.target.value)}
            placeholder="Rua, Avenida..."
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Bairro *</Label>
            <Input
              value={formData.neighborhood}
              onChange={(e) => handleInputChange('neighborhood', e.target.value)}
              placeholder="Bairro"
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
            />
          </div>
          <div className="space-y-2">
            <Label>Estado *</Label>
            <Input
              value={formData.state}
              onChange={(e) => handleInputChange('state', e.target.value)}
              placeholder="GO"
              maxLength={2}
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
        <Button onClick={onCancel} variant="outline" className="flex-1">
          Cancelar
        </Button>
        <Button 
          onClick={() => onSave(formData)} 
          disabled={!isFormValid()}
          className="flex-1"
        >
          Salvar
        </Button>
      </div>
    </div>
  );
};

export default SavedRecipientsManager;