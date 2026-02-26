import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { contactsService, Contact, CreateContactRequest } from '@/services/contactsService';
import {
  Plus, Trash2, Edit, MapPin, User, Building, Phone, Mail, Loader2, Search
} from 'lucide-react';

const contactTypeLabels: Record<string, string> = {
  sender: 'Remetente',
  recipient: 'Destinatário',
  pickup: 'Local de Coleta',
};

const PainelContatos = () => {
  const { toast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const emptyForm: CreateContactRequest = {
    contact_type: 'sender',
    name: '',
    document: '',
    document_type: 'pf',
    phone: '',
    email: '',
    is_default: false,
    cep: '',
    street: '',
    number: '',
    complement: '',
    district: '',
    city: '',
    state: '',
    reference: '',
  };
  const [form, setForm] = useState<CreateContactRequest>(emptyForm);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await contactsService.list();
      setContacts(data);
    } catch {
      toast({ title: 'Erro ao carregar contatos', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const openCreate = () => {
    setEditingContact(null);
    setForm(emptyForm);
    setError('');
    setDialogOpen(true);
  };

  const openEdit = (c: Contact) => {
    setEditingContact(c);
    setForm({
      contact_type: c.contact_type,
      name: c.name || '',
      document: c.document || '',
      document_type: c.document_type || 'pf',
      state_registration_number: c.state_registration_number || '',
      phone: c.phone || '',
      email: c.email || '',
      is_default: c.is_default,
      cep: c.address?.cep || '',
      street: c.address?.street || '',
      number: c.address?.number || '',
      complement: c.address?.complement || '',
      district: c.address?.district || '',
      city: c.address?.city || '',
      state: c.address?.state || '',
      reference: c.address?.reference || '',
    });
    setError('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.cep || !form.street || !form.number || !form.city || !form.state) {
      setError('Preencha os campos obrigatórios: nome, CEP, rua, número, cidade e estado.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editingContact) {
        await contactsService.update(editingContact.id, form);
        toast({ title: 'Contato atualizado!' });
      } else {
        await contactsService.create(form);
        toast({ title: 'Contato criado!' });
      }
      setDialogOpen(false);
      fetchContacts();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar contato');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este contato?')) return;
    try {
      await contactsService.delete(id);
      toast({ title: 'Contato excluído!' });
      fetchContacts();
    } catch {
      toast({ title: 'Erro ao excluir contato', variant: 'destructive' });
    }
  };

  const filtered = contacts.filter((c) => {
    if (filterType !== 'all' && c.contact_type !== filterType) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        c.name?.toLowerCase().includes(s) ||
        c.email?.toLowerCase().includes(s) ||
        c.document?.includes(s) ||
        c.address?.city?.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const updateField = (field: string, value: any) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contatos</h1>
          <p className="text-muted-foreground text-sm">Gerencie remetentes, destinatários e locais de coleta</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" /> Novo Contato
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingContact ? 'Editar Contato' : 'Novo Contato'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={form.contact_type} onValueChange={(v) => updateField('contact_type', v)} disabled={!!editingContact}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sender">Remetente</SelectItem>
                    <SelectItem value="recipient">Destinatário</SelectItem>
                    <SelectItem value="pickup">Local de Coleta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input value={form.name || ''} onChange={(e) => updateField('name', e.target.value)} placeholder="Nome completo" />
                </div>
                <div className="space-y-2">
                  <Label>Documento</Label>
                  <Input value={form.document || ''} onChange={(e) => updateField('document', e.target.value)} placeholder="CPF ou CNPJ" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input value={form.phone || ''} onChange={(e) => updateField('phone', e.target.value)} placeholder="(11) 99999-9999" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={form.email || ''} onChange={(e) => updateField('email', e.target.value)} placeholder="email@exemplo.com" />
                </div>
              </div>

              <hr />
              <p className="text-sm font-semibold text-foreground">Endereço</p>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>CEP *</Label>
                  <Input value={form.cep || ''} onChange={(e) => updateField('cep', e.target.value)} placeholder="00000-000" />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Rua *</Label>
                  <Input value={form.street || ''} onChange={(e) => updateField('street', e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Número *</Label>
                  <Input value={form.number || ''} onChange={(e) => updateField('number', e.target.value)} />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Complemento</Label>
                  <Input value={form.complement || ''} onChange={(e) => updateField('complement', e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bairro</Label>
                  <Input value={form.district || ''} onChange={(e) => updateField('district', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Cidade *</Label>
                  <Input value={form.city || ''} onChange={(e) => updateField('city', e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Estado *</Label>
                  <Input value={form.state || ''} onChange={(e) => updateField('state', e.target.value)} placeholder="SP" maxLength={2} />
                </div>
                <div className="space-y-2">
                  <Label>Referência</Label>
                  <Input value={form.reference || ''} onChange={(e) => updateField('reference', e.target.value)} />
                </div>
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Salvando...</> : 'Salvar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-10" placeholder="Buscar por nome, email, documento..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="sender">Remetentes</SelectItem>
            <SelectItem value="recipient">Destinatários</SelectItem>
            <SelectItem value="pickup">Locais de Coleta</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Nenhum contato encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <Card key={c.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {c.contact_type === 'sender' && <User className="h-4 w-4 text-primary" />}
                    {c.contact_type === 'recipient' && <MapPin className="h-4 w-4 text-green-600" />}
                    {c.contact_type === 'pickup' && <Building className="h-4 w-4 text-orange-600" />}
                    <CardTitle className="text-base">{c.name || 'Sem nome'}</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-xs">{contactTypeLabels[c.contact_type]}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                {c.document && <p className="flex items-center gap-1"><Building className="h-3 w-3" /> {c.document}</p>}
                {c.phone && <p className="flex items-center gap-1"><Phone className="h-3 w-3" /> {c.phone}</p>}
                {c.email && <p className="flex items-center gap-1"><Mail className="h-3 w-3" /> {c.email}</p>}
                {c.address && (
                  <p className="flex items-start gap-1">
                    <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                    {c.address.street}, {c.address.number} - {c.address.district}, {c.address.city}/{c.address.state} - {c.address.cep}
                  </p>
                )}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(c)}>
                    <Edit className="h-3 w-3 mr-1" /> Editar
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(c.id)}>
                    <Trash2 className="h-3 w-3 mr-1" /> Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PainelContatos;
