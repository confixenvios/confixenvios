import { useAuth } from '@/hooks/useAuth';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Users, 
  Package, 
  TrendingUp, 
  Settings,
  LogOut, 
  ArrowLeft,
  Shield,
  Database,
  FileText,
  DollarSign
} from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Stats {
  totalUsers: number;
  totalShipments: number;
  totalAdmins: number;
  pendingShipments: number;
}

const Admin = () => {
  const { user, profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalShipments: 0,
    totalAdmins: 0,
    pendingShipments: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    
    loadStats();
  }, [isAdmin, navigate]);

  const loadStats = async () => {
    try {
      // Get total users
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get total shipments
      const { count: shipmentsCount } = await supabase
        .from('shipments')
        .select('*', { count: 'exact', head: true });

      // Get total admins
      const { count: adminsCount } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin');

      // Get pending shipments
      const { count: pendingCount } = await supabase
        .from('shipments')
        .select('*', { count: 'exact', head: true })
        .in('status', ['PENDING_DOCUMENT', 'PENDING_LABEL']);

      setStats({
        totalUsers: usersCount || 0,
        totalShipments: shipmentsCount || 0,
        totalAdmins: adminsCount || 0,
        pendingShipments: pendingCount || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  const getInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`.toUpperCase();
    }
    if (profile?.first_name) {
      return profile.first_name.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'A';
  };

  const getDisplayName = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    if (profile?.first_name) {
      return profile.first_name;
    }
    return user?.email || 'Admin';
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/80">
      {/* Header */}
      <header className="bg-card/50 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-primary" />
                <h1 className="text-xl font-bold text-foreground">Painel Administrativo</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">{getDisplayName()}</span>
                    <Badge className="text-xs">Admin</Badge>
                  </div>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className="text-muted-foreground hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Painel Administrativo
          </h2>
          <p className="text-muted-foreground">
            Gerencie usuários, envios e configurações do sistema
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total de Usuários</p>
                  <p className="text-2xl font-bold text-foreground">
                    {loading ? '...' : stats.totalUsers}
                  </p>
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total de Envios</p>
                  <p className="text-2xl font-bold text-foreground">
                    {loading ? '...' : stats.totalShipments}
                  </p>
                </div>
                <Package className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Administradores</p>
                  <p className="text-2xl font-bold text-foreground">
                    {loading ? '...' : stats.totalAdmins}
                  </p>
                </div>
                <Shield className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Envios Pendentes</p>
                  <p className="text-2xl font-bold text-foreground">
                    {loading ? '...' : stats.pendingShipments}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Management Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Management */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Gestão de Usuários</span>
              </CardTitle>
              <CardDescription>
                Gerencie contas de usuário e permissões
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full" variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Ver Todos os Usuários
              </Button>
              <Button className="w-full" variant="outline">
                <Shield className="h-4 w-4 mr-2" />
                Gerenciar Administradores
              </Button>
            </CardContent>
          </Card>

          {/* Shipment Management */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5" />
                <span>Gestão de Envios</span>
              </CardTitle>
              <CardDescription>
                Monitore e gerencie todos os envios
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full" variant="outline">
                <Package className="h-4 w-4 mr-2" />
                Ver Todos os Envios
              </Button>
              <Button className="w-full" variant="outline">
                <TrendingUp className="h-4 w-4 mr-2" />
                Relatórios de Envio
              </Button>
            </CardContent>
          </Card>

          {/* System Settings */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Configurações do Sistema</span>
              </CardTitle>
              <CardDescription>
                Configure parâmetros do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full" variant="outline">
                <Database className="h-4 w-4 mr-2" />
                Configurar Zonas de Entrega
              </Button>
              <Button className="w-full" variant="outline">
                <DollarSign className="h-4 w-4 mr-2" />
                Gerenciar Preços
              </Button>
            </CardContent>
          </Card>

          {/* Reports */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Relatórios</span>
              </CardTitle>
              <CardDescription>
                Visualize estatísticas e relatórios
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full" variant="outline">
                <TrendingUp className="h-4 w-4 mr-2" />
                Relatório de Vendas
              </Button>
              <Button className="w-full" variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Relatório de Usuários
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Admin;