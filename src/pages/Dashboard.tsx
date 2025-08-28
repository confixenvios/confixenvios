import { useAuth } from '@/hooks/useAuth';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Package, 
  User, 
  LogOut, 
  Plus, 
  Search, 
  Settings,
  ShieldCheck,
  Calculator
} from "lucide-react";
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { user, profile, userRole, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleNewShipment = () => {
    navigate('/');
  };

  const handleTrackShipment = () => {
    navigate('/rastreio');
  };

  const handleAdminPanel = () => {
    navigate('/admin');
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
    return 'U';
  };

  const getDisplayName = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    if (profile?.first_name) {
      return profile.first_name;
    }
    return user?.email || 'Usuário';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/80">
      {/* Header */}
      <header className="bg-card/50 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-foreground">Confix Envios</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAdminPanel}
                  className="text-primary border-primary hover:bg-primary/10"
                >
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Painel Admin
                </Button>
              )}
              
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">{getDisplayName()}</span>
                    <Badge variant={isAdmin ? "default" : "secondary"} className="text-xs">
                      {userRole?.role === 'admin' ? 'Admin' : 'Usuário'}
                    </Badge>
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
            Bem-vindo, {profile?.first_name || 'Usuário'}!
          </h2>
          <p className="text-muted-foreground">
            Gerencie seus envios e acompanhe suas encomendas
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-border/50" onClick={handleNewShipment}>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Calculator className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Novo Envio</CardTitle>
                  <CardDescription>Calcule frete e crie etiquetas</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-border/50" onClick={handleTrackShipment}>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Search className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Rastrear Envio</CardTitle>
                  <CardDescription>Acompanhe suas encomendas</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-border/50">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Meus Envios</CardTitle>
                  <CardDescription>Histórico de envios</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Profile Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Informações do Perfil</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nome Completo</label>
                <p className="text-foreground">
                  {profile?.first_name && profile?.last_name 
                    ? `${profile.first_name} ${profile.last_name}`
                    : 'Não informado'
                  }
                </p>
              </div>
              <Separator />
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="text-foreground">{user?.email}</p>
              </div>
              <Separator />
              <div>
                <label className="text-sm font-medium text-muted-foreground">Telefone</label>
                <p className="text-foreground">{profile?.phone || 'Não informado'}</p>
              </div>
              <Separator />
              <div>
                <label className="text-sm font-medium text-muted-foreground">Tipo de Conta</label>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant={isAdmin ? "default" : "secondary"}>
                    {userRole?.role === 'admin' ? 'Administrador' : 'Usuário'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5" />
                <span>Estatísticas Rápidas</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Envios este mês:</span>
                  <span className="font-semibold">0</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total de envios:</span>
                  <span className="font-semibold">0</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Status da conta:</span>
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    Ativa
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;