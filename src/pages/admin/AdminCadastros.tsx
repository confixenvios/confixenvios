import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Search, Shield, Truck, Users, Headset, Building2, Loader2, MoreVertical, Edit, Eye, Power, Calendar, Phone, Mail, FileText } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type RoleType = 'admin' | 'user' | 'motorista' | 'cd' | 'suporte';

interface UserWithRole {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  document: string | null;
  created_at: string;
  status: string;
  roles: RoleType[];
  source: 'profile' | 'motorista' | 'cd';
}

const roleLabels: Record<RoleType, { label: string; color: string; icon: React.ReactNode }> = {
  admin: { label: 'Admin', color: 'bg-red-100 text-red-700 border-red-200', icon: <Shield className="h-3 w-3" /> },
  user: { label: 'Cliente', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: <Users className="h-3 w-3" /> },
  motorista: { label: 'Motorista', color: 'bg-green-100 text-green-700 border-green-200', icon: <Truck className="h-3 w-3" /> },
  cd: { label: 'CD', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: <Building2 className="h-3 w-3" /> },
  suporte: { label: 'Suporte', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: <Headset className="h-3 w-3" /> },
};

const AdminCadastros = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | RoleType>('all');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [selectedRole, setSelectedRole] = useState<RoleType>('user');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const [profilesRes, rolesRes, motoristasRes, cdUsersRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('user_roles').select('user_id, role'),
        supabase.from('motoristas').select('*').order('created_at', { ascending: false }),
        supabase.from('cd_users').select('*').order('created_at', { ascending: false }),
      ]);

      if (profilesRes.error) throw profilesRes.error;

      const rolesByUser = new Map<string, RoleType[]>();
      rolesRes.data?.forEach((r) => {
        const existing = rolesByUser.get(r.user_id) || [];
        existing.push(r.role as RoleType);
        rolesByUser.set(r.user_id, existing);
      });

      const profileUsers: UserWithRole[] = (profilesRes.data || []).map((p) => ({
        id: p.id,
        email: p.email || '',
        first_name: p.first_name,
        last_name: p.last_name,
        phone: p.phone,
        document: p.document,
        created_at: p.created_at || '',
        status: p.status || 'active',
        roles: rolesByUser.get(p.id) || ['user'],
        source: 'profile' as const,
      }));

      const motoristaUsers: UserWithRole[] = (motoristasRes.data || []).map((m) => ({
        id: m.id,
        email: m.username || '',
        first_name: m.nome,
        last_name: null,
        phone: m.telefone,
        document: m.cpf,
        created_at: m.created_at || '',
        status: m.status === 'ativo' ? 'active' : m.status,
        roles: ['motorista'] as RoleType[],
        source: 'motorista' as const,
      }));

      const cdUsersList: UserWithRole[] = (cdUsersRes.data || []).map((c) => ({
        id: c.id,
        email: c.email || '',
        first_name: c.nome,
        last_name: null,
        phone: c.telefone,
        document: c.cpf,
        created_at: c.created_at || '',
        status: c.status === 'ativo' ? 'active' : c.status,
        roles: ['cd'] as RoleType[],
        source: 'cd' as const,
      }));

      const allUsers = [...profileUsers, ...motoristaUsers, ...cdUsersList];
      allUsers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setUsers(allUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os usuários',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.document?.includes(searchTerm);

    if (activeTab === 'all') return matchesSearch;
    return matchesSearch && user.roles.includes(activeTab);
  });

  const handleEditRole = (user: UserWithRole) => {
    setSelectedUser(user);
    setSelectedRole(user.roles[0] || 'user');
    setEditModalOpen(true);
  };

  const handleViewDetails = (user: UserWithRole) => {
    setSelectedUser(user);
    setDetailsModalOpen(true);
  };

  const handleToggleStatus = async (user: UserWithRole) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    const newStatusLabel = user.status === 'active' ? 'inativo' : 'ativo';

    try {
      let error = null;

      if (user.source === 'profile') {
        const result = await supabase
          .from('profiles')
          .update({ status: newStatus })
          .eq('id', user.id);
        error = result.error;
      } else if (user.source === 'motorista') {
        const result = await supabase
          .from('motoristas')
          .update({ status: newStatus === 'active' ? 'ativo' : 'inativo' })
          .eq('id', user.id);
        error = result.error;
      } else if (user.source === 'cd') {
        const result = await supabase
          .from('cd_users')
          .update({ status: newStatus === 'active' ? 'ativo' : 'inativo' })
          .eq('id', user.id);
        error = result.error;
      }

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: `Usuário ${newStatusLabel} com sucesso`,
      });

      loadUsers();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar o status',
        variant: 'destructive',
      });
    }
  };

  const handleSaveRole = async () => {
    if (!selectedUser) return;
    setSaving(true);

    try {
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', selectedUser.id);

      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: selectedUser.id,
          role: selectedRole,
        });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Função do usuário atualizada com sucesso',
      });

      setEditModalOpen(false);
      loadUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a função',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getDisplayName = (user: UserWithRole) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    if (user.first_name) return user.first_name;
    return user.email?.split('@')[0] || 'Sem nome';
  };

  const getCounts = () => {
    const counts: Record<string, number> = { all: users.length };
    Object.keys(roleLabels).forEach((role) => {
      counts[role] = users.filter((u) => u.roles.includes(role as RoleType)).length;
    });
    return counts;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return '-';
    }
  };

  const counts = getCounts();

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cadastros</h1>
          <p className="text-muted-foreground">Gerencie usuários e suas funções no sistema</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou documento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="mb-4 flex-wrap h-auto gap-1">
              <TabsTrigger value="all" className="gap-2">
                <Users className="h-4 w-4" />
                Todos
                <Badge variant="secondary" className="ml-1">{counts.all}</Badge>
              </TabsTrigger>
              <TabsTrigger value="user" className="gap-2">
                <Users className="h-4 w-4" />
                Clientes
                <Badge variant="secondary" className="ml-1">{counts.user}</Badge>
              </TabsTrigger>
              <TabsTrigger value="admin" className="gap-2">
                <Shield className="h-4 w-4" />
                Admins
                <Badge variant="secondary" className="ml-1">{counts.admin}</Badge>
              </TabsTrigger>
              <TabsTrigger value="motorista" className="gap-2">
                <Truck className="h-4 w-4" />
                Motoristas
                <Badge variant="secondary" className="ml-1">{counts.motorista}</Badge>
              </TabsTrigger>
              <TabsTrigger value="cd" className="gap-2">
                <Building2 className="h-4 w-4" />
                CD
                <Badge variant="secondary" className="ml-1">{counts.cd}</Badge>
              </TabsTrigger>
              <TabsTrigger value="suporte" className="gap-2">
                <Headset className="h-4 w-4" />
                Suporte
                <Badge variant="secondary" className="ml-1">{counts.suporte}</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhum usuário encontrado</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Documento</TableHead>
                        <TableHead>Função</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={`${user.source}-${user.id}`} className={user.status !== 'active' ? 'opacity-60' : ''}>
                          <TableCell className="font-medium">
                            {getDisplayName(user)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {user.email}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {user.document || '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {user.roles.map((role) => (
                                <Badge key={role} variant="outline" className={`${roleLabels[role]?.color} flex items-center gap-1`}>
                                  {roleLabels[role]?.icon}
                                  {roleLabels[role]?.label}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                              {user.status === 'active' ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewDetails(user)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver Detalhes
                                </DropdownMenuItem>
                                {user.source === 'profile' && (
                                  <DropdownMenuItem onClick={() => handleEditRole(user)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Alterar Função
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleToggleStatus(user)}
                                  className={user.status === 'active' ? 'text-destructive' : 'text-green-600'}
                                >
                                  <Power className="h-4 w-4 mr-2" />
                                  {user.status === 'active' ? 'Desativar' : 'Ativar'}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Modal de Detalhes */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedUser && roleLabels[selectedUser.roles[0]]?.icon}
              Detalhes do Cadastro
            </DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-semibold text-primary">
                    {getDisplayName(selectedUser).charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-semibold">{getDisplayName(selectedUser)}</p>
                  <div className="flex gap-1 mt-1">
                    {selectedUser.roles.map((role) => (
                      <Badge key={role} variant="outline" className={`${roleLabels[role]?.color} text-xs`}>
                        {roleLabels[role]?.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email / Username</p>
                    <p className="text-sm font-medium">{selectedUser.email || '-'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Telefone</p>
                    <p className="text-sm font-medium">{selectedUser.phone || '-'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Documento (CPF/CNPJ)</p>
                    <p className="text-sm font-medium">{selectedUser.document || '-'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Cadastrado em</p>
                    <p className="text-sm font-medium">{formatDate(selectedUser.created_at)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Power className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge variant={selectedUser.status === 'active' ? 'default' : 'secondary'}>
                      {selectedUser.status === 'active' ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Origem</p>
                    <p className="text-sm font-medium">
                      {selectedUser.source === 'profile' ? 'Sistema (Auth)' : 
                       selectedUser.source === 'motorista' ? 'Tabela Motoristas' : 'Tabela CD'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsModalOpen(false)}>
              Fechar
            </Button>
            {selectedUser && (
              <Button 
                variant={selectedUser.status === 'active' ? 'destructive' : 'default'}
                onClick={() => {
                  handleToggleStatus(selectedUser);
                  setDetailsModalOpen(false);
                }}
              >
                <Power className="h-4 w-4 mr-2" />
                {selectedUser.status === 'active' ? 'Desativar' : 'Ativar'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição de Role */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Função do Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-muted-foreground">Usuário</Label>
              <p className="font-medium">{selectedUser ? getDisplayName(selectedUser) : ''}</p>
              <p className="text-sm text-muted-foreground">{selectedUser?.email}</p>
            </div>
            <div className="space-y-2">
              <Label>Nova Função</Label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as RoleType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(roleLabels).map(([key, { label, icon }]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        {icon}
                        {label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveRole} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCadastros;
