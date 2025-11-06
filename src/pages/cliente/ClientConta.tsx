import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User, Mail, Phone, Calendar, Lock, Key, FileText, Edit } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import PaymentMethodsManager from "@/components/PaymentMethodsManager";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

const ClientConta = () => {
  const { user, profile, userRole, updatePassword, refreshUserData } = useAuth();
  const { toast } = useToast();
  
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    phone: profile?.phone || '',
    document: profile?.document || '',
    inscricao_estadual: profile?.inscricao_estadual || ''
  });
  const [profileError, setProfileError] = useState('');

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    
    if (!passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError('Preencha todos os campos');
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('As senhas não coincidem');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      setPasswordError('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }
    
    setIsChangingPassword(true);
    
    try {
      const { error } = await updatePassword(passwordData.newPassword);
      
      if (error) {
        setPasswordError('Erro ao alterar senha: ' + error.message);
      } else {
        toast({
          title: "Senha alterada com sucesso!",
          description: "Sua senha foi atualizada.",
        });
        
        // Clear form
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      }
    } catch (error) {
      setPasswordError('Erro inesperado ao alterar senha');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    
    if (!profileData.first_name) {
      setProfileError('O nome é obrigatório');
      return;
    }
    
    setIsUpdatingProfile(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: profileData.first_name,
          last_name: profileData.last_name,
          phone: profileData.phone,
          document: profileData.document,
          inscricao_estadual: profileData.inscricao_estadual,
        })
        .eq('id', user?.id);
      
      if (error) {
        setProfileError('Erro ao atualizar perfil: ' + error.message);
      } else {
        toast({
          title: "Perfil atualizado!",
          description: "Suas informações foram atualizadas com sucesso.",
        });
        
        // Refresh user data
        await refreshUserData();
        setIsEditDialogOpen(false);
      }
    } catch (error) {
      setProfileError('Erro inesperado ao atualizar perfil');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const openEditDialog = () => {
    setProfileData({
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
      phone: profile?.phone || '',
      document: profile?.document || '',
      inscricao_estadual: profile?.inscricao_estadual || ''
    });
    setProfileError('');
    setIsEditDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Minha Conta</h1>
        <p className="text-muted-foreground">
          Gerencie suas informações pessoais e configurações
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Informações Pessoais */}
        <Card className="border-border/50 shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5" />
                  <span>Informações Pessoais</span>
                </CardTitle>
                <CardDescription>
                  Suas informações de cadastro
                </CardDescription>
              </div>
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" onClick={openEditDialog}>
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Editar Informações Pessoais</DialogTitle>
                    <DialogDescription>
                      Atualize suas informações de cadastro
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-first-name">Nome *</Label>
                        <Input
                          id="edit-first-name"
                          placeholder="Digite seu nome"
                          value={profileData.first_name}
                          onChange={(e) => setProfileData(prev => ({
                            ...prev,
                            first_name: e.target.value
                          }))}
                          disabled={isUpdatingProfile}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-last-name">Sobrenome</Label>
                        <Input
                          id="edit-last-name"
                          placeholder="Digite seu sobrenome"
                          value={profileData.last_name}
                          onChange={(e) => setProfileData(prev => ({
                            ...prev,
                            last_name: e.target.value
                          }))}
                          disabled={isUpdatingProfile}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="edit-phone">Telefone</Label>
                      <Input
                        id="edit-phone"
                        placeholder="(00) 00000-0000"
                        value={profileData.phone}
                        onChange={(e) => setProfileData(prev => ({
                          ...prev,
                          phone: e.target.value
                        }))}
                        disabled={isUpdatingProfile}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="edit-document">CPF/CNPJ</Label>
                      <Input
                        id="edit-document"
                        placeholder="000.000.000-00"
                        value={profileData.document}
                        onChange={(e) => setProfileData(prev => ({
                          ...prev,
                          document: e.target.value
                        }))}
                        disabled={isUpdatingProfile}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="edit-inscricao">Inscrição Estadual</Label>
                      <Input
                        id="edit-inscricao"
                        placeholder="Digite a inscrição estadual"
                        value={profileData.inscricao_estadual}
                        onChange={(e) => setProfileData(prev => ({
                          ...prev,
                          inscricao_estadual: e.target.value
                        }))}
                        disabled={isUpdatingProfile}
                      />
                    </div>

                    {profileError && (
                      <Alert variant="destructive">
                        <AlertDescription>{profileError}</AlertDescription>
                      </Alert>
                    )}

                    <div className="flex gap-2 justify-end">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsEditDialogOpen(false)}
                        disabled={isUpdatingProfile}
                      >
                        Cancelar
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={isUpdatingProfile}
                      >
                        {isUpdatingProfile ? (
                          <>
                            <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                            Salvando...
                          </>
                        ) : (
                          'Salvar Alterações'
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3">
              <User className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Nome Completo</p>
                <p className="text-sm text-muted-foreground">
                  {profile?.first_name && profile?.last_name 
                    ? `${profile.first_name} ${profile.last_name}`
                    : profile?.first_name || 'Não informado'
                  }
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">
                  {user?.email || 'Não informado'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Telefone</p>
                <p className="text-sm text-muted-foreground">
                  {profile?.phone || 'Não informado'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">CPF/CNPJ</p>
                <p className="text-sm text-muted-foreground">
                  {profile?.document || 'Não informado'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Membro desde</p>
                <p className="text-sm text-muted-foreground">
                  {user?.created_at 
                    ? new Date(user.created_at).toLocaleDateString('pt-BR')
                    : 'Não informado'
                  }
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Inscrição Estadual</p>
                <p className="text-sm text-muted-foreground">
                  {profile?.inscricao_estadual || 'Não informado'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Badge variant="secondary" className="mt-2">
                {userRole?.role === 'admin' ? 'Administrador' : 'Cliente'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Configurações */}
        <Card className="border-border/50 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Lock className="w-5 h-5" />
              <span>Segurança</span>
            </CardTitle>
            <CardDescription>
              Gerencie suas configurações de segurança
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h4 className="font-medium flex items-center space-x-2">
                <Key className="w-4 h-4 text-primary" />
                <span>Redefinir Senha</span>
              </h4>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova Senha</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Digite sua nova senha"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({
                      ...prev,
                      newPassword: e.target.value
                    }))}
                    disabled={isChangingPassword}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Confirme sua nova senha"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({
                      ...prev,
                      confirmPassword: e.target.value
                    }))}
                    disabled={isChangingPassword}
                  />
                </div>

                {passwordError && (
                  <Alert variant="destructive">
                    <AlertDescription>{passwordError}</AlertDescription>
                  </Alert>
                )}

                <Button 
                  type="submit" 
                  disabled={isChangingPassword}
                  className="w-full"
                >
                  {isChangingPassword ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                      Alterando...
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4 mr-2" />
                      Alterar Senha
                    </>
                  )}
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Methods Section */}
      <div className="mt-6">
        <PaymentMethodsManager />
      </div>
    </div>
  );
};

export default ClientConta;