import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Users, Plus, MapPin, Phone, Mail, Edit2, Trash2, Star, Loader2, Search, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useSavedSenders } from '@/hooks/useSavedSenders';
import { useSavedRecipients } from '@/hooks/useSavedRecipients';
import { toast } from 'sonner';

interface FormData {
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
  inscricaoEstadual: string;
}

const emptyForm: FormData = {
  name: '',
  document: '',
  phone: '',
  email: '',
  cep: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  reference: '',
  inscricaoEstadual: ''
};

const PainelCadastros = () => {
  const [activeTab, setActiveTab] = useState<'remetentes' | 'destinatarios'>('remetentes');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Hooks for senders
  const { 
    savedSenders, 
    loading: loadingSenders, 
    saveApprovedSender, 
    updateSender, 
    deleteSender, 
    setAsDefault: setDefaultSender 
  } = useSavedSenders();

  // Hooks for recipients
  const { 
    savedRecipients, 
    isLoading: loadingRecipients, 
    saveApprovedRecipient, 
    updateRecipient, 
    deleteRecipient, 
    setAsDefault: setDefaultRecipient 
  } = useSavedRecipients();

  const loading = activeTab === 'remetentes' ? loadingSenders : loadingRecipients;
  const items = activeTab === 'remetentes' ? savedSenders : savedRecipients;
  const entityName = activeTab === 'remetentes' ? 'Remetente' : 'Destinatário';
  const entityNamePlural = activeTab === 'remetentes' ? 'Remetentes' : 'Destinatários';

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.document.includes(searchTerm) ||
    item.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenNew = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setShowModal(true);
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setFormData({
      name: item.name || '',
      document: item.document || '',
      phone: item.phone || '',
      email: item.email || '',
      cep: item.cep || '',
      street: item.street || '',
      number: item.number || '',
      complement: item.complement || '',
      neighborhood: item.neighborhood || '',
      city: item.city || '',
      state: item.state || '',
      reference: item.reference || '',
      inscricaoEstadual: item.inscricao_estadual || ''
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.document || !formData.phone || !formData.email || !formData.cep) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setSaving(true);
    try {
      if (activeTab === 'remetentes') {
        if (editingId) {
          await updateSender(editingId, formData);
          toast.success('Remetente atualizado com sucesso!');
        } else {
          await saveApprovedSender(formData, savedSenders.length === 0);
          toast.success('Remetente cadastrado com sucesso!');
        }
      } else {
        if (editingId) {
          await updateRecipient(editingId, formData);
          toast.success('Destinatário atualizado com sucesso!');
        } else {
          await saveApprovedRecipient(formData, savedRecipients.length === 0);
          toast.success('Destinatário cadastrado com sucesso!');
        }
      }
      setShowModal(false);
    } catch (error) {
      toast.error(`Erro ao salvar ${entityName.toLowerCase()}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    
    try {
      if (activeTab === 'remetentes') {
        const success = await deleteSender(deletingId);
        if (success) {
          toast.success('Remetente removido com sucesso!');
        }
      } else {
        await deleteRecipient(deletingId);
        toast.success('Destinatário removido com sucesso!');
      }
    } catch (error) {
      toast.error(`Erro ao remover ${entityName.toLowerCase()}`);
    }
    setShowDeleteDialog(false);
    setDeletingId(null);
  };

  const handleSetDefault = async (id: string) => {
    try {
      if (activeTab === 'remetentes') {
        await setDefaultSender(id);
      } else {
        await setDefaultRecipient(id);
        toast.success('Destinatário definido como padrão!');
      }
    } catch (error) {
      toast.error('Erro ao definir como padrão');
    }
  };

  const fetchAddressByCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          street: data.logradouro || '',
          neighborhood: data.bairro || '',
          city: data.localidade || '',
          state: data.uf || ''
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as 'remetentes' | 'destinatarios');
    setSearchTerm('');
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Cadastros</h1>
        <p className="text-muted-foreground">Gerencie remetentes e destinatários salvos</p>
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <div className="flex justify-between items-center flex-wrap gap-4">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  <TabsTrigger value="remetentes" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Remetentes
                  </TabsTrigger>
                  <TabsTrigger value="destinatarios" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Destinatários
                  </TabsTrigger>
                </TabsList>
                <Button onClick={handleOpenNew} className="bg-primary hover:bg-primary/90">
                  <Plus className="mr-2 h-4 w-4" />
                  Novo {entityName}
                </Button>
              </div>
            </Tabs>

            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, documento ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-12">
              {activeTab === 'remetentes' ? (
                <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              ) : (
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              )}
              <p className="text-muted-foreground mb-4">Nenhum {entityName.toLowerCase()} cadastrado ainda</p>
              <Button onClick={handleOpenNew}>
                <Plus className="mr-2 h-4 w-4" />
                Cadastrar Primeiro {entityName}
              </Button>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Nenhum {entityName.toLowerCase()} encontrado</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 border rounded-xl shadow-sm hover:shadow-md transition-all bg-white"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{item.name}</h3>
                      {item.is_default && (
                        <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700">
                          <Star className="h-3 w-3 mr-1" /> Padrão
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 text-sm text-muted-foreground">
                    <p className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5" />
                      {item.document}
                    </p>
                    <p className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5" />
                      {item.phone}
                    </p>
                    <p className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5" />
                      {item.email}
                    </p>
                    <p className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5" />
                      {item.street}, {item.number} - {item.neighborhood}, {item.city}/{item.state}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-3 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(item)}
                    >
                      <Edit2 className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    {!item.is_default && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(item.id)}
                      >
                        <Star className="h-4 w-4 mr-1" />
                        Padrão
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive ml-auto"
                      onClick={() => {
                        setDeletingId(item.id);
                        setShowDeleteDialog(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Edição/Criação */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? `Editar ${entityName}` : `Novo ${entityName}`}</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nome Completo *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome completo ou razão social"
                />
              </div>
              <div>
                <Label>CPF/CNPJ *</Label>
                <Input
                  value={formData.document}
                  onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                  placeholder="000.000.000-00"
                />
              </div>
              <div>
                <Label>Telefone *</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <Label>E-mail *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div>
                <Label>Inscrição Estadual</Label>
                <Input
                  value={formData.inscricaoEstadual}
                  onChange={(e) => setFormData({ ...formData, inscricaoEstadual: e.target.value })}
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div className="border-t pt-4 mt-2">
              <h4 className="font-medium mb-3">Endereço</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>CEP *</Label>
                  <Input
                    value={formData.cep}
                    onChange={(e) => {
                      setFormData({ ...formData, cep: e.target.value });
                      fetchAddressByCep(e.target.value);
                    }}
                    placeholder="00000-000"
                  />
                </div>
                <div>
                  <Label>Número *</Label>
                  <Input
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    placeholder="123"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Endereço</Label>
                  <Input
                    value={formData.street}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    placeholder="Rua, Avenida, etc."
                  />
                </div>
                <div>
                  <Label>Bairro</Label>
                  <Input
                    value={formData.neighborhood}
                    onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                    placeholder="Bairro"
                  />
                </div>
                <div>
                  <Label>Complemento</Label>
                  <Input
                    value={formData.complement}
                    onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                    placeholder="Apto, Bloco, etc."
                  />
                </div>
                <div>
                  <Label>Cidade</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Cidade"
                  />
                </div>
                <div>
                  <Label>Estado</Label>
                  <Input
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="UF"
                    maxLength={2}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Referência</Label>
                  <Input
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    placeholder="Ponto de referência (opcional)"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? 'Salvar Alterações' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover {entityName.toLowerCase()}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O {entityName.toLowerCase()} será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PainelCadastros;