import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Search, UserPlus, Shield, Truck, Users, Headset, Building2, Loader2, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import AdminLayout from './AdminLayout';

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
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [selectedRole, setSelectedRole] = useState<RoleType>('user');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Carregar todos os profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Carregar todos os roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Mapear roles por user_id
      const rolesByUser = new Map<string, RoleType[]>();
      roles?.forEach((r) => {
        const existing = rolesByUser.get(r.user_id) || [];
        existing.push(r.role as RoleType);
        rolesByUser.set(r.user_id, existing);
      });

      // Combinar dados
      const usersWithRoles: UserWithRole[] = (profiles || []).map((p) => ({
        id: p.id,
        email: p.email || '',
        first_name: p.first_name,
        last_name: p.last_name,
        phone: p.phone,
        document: p.document,
        created_at: p.created_at || '',
        status: p.status || 'active',
        roles: rolesByUser.get(p.id) || ['user'],
      }));

      setUsers(usersWithRoles);
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

  const handleSaveRole = async () => {
    if (!selectedUser) return;
    setSaving(true);

    try {
      // Remover roles existentes do usuário
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', selectedUser.id);

      // Adicionar novo role
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

  const counts = getCounts();

  return (
    <AdminLayout>
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
                          <TableRow key={user.id}>
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
                                {user.status === 'active' ? 'Ativo' : user.status}
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
                                  <DropdownMenuItem onClick={() => handleEditRole(user)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Alterar Função
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
    </AdminLayout>
  );
};

export default AdminCadastros;
