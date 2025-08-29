import { useState } from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Mail, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const EmailConfirmationBanner = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isVisible, setIsVisible] = useState(true);
  const [isResending, setIsResending] = useState(false);

  // Only show if user exists but email is not confirmed
  if (!user || user.email_confirmed_at || !isVisible) {
    return null;
  }

  const handleResendConfirmation = async () => {
    if (!user?.email) return;

    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          // Redirect will be handled based on user role after confirmation
          emailRedirectTo: `${window.location.origin}/auth`
        }
      });

      if (error) {
        toast({
          title: "Erro ao reenviar",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Email reenviado!",
          description: "Verifique sua caixa de entrada para o link de confirmação.",
        });
      }
    } catch (error) {
      toast({
        title: "Erro inesperado",
        description: "Tente novamente em alguns minutos.",
        variant: "destructive"
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Alert className="mb-6 border-amber-200 bg-amber-50 text-amber-800">
      <Mail className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <div className="flex-1">
          <strong>Confirme seu email:</strong> Verifique sua caixa de entrada e clique no link de confirmação para ativar todas as funcionalidades.
        </div>
        <div className="flex items-center space-x-2 ml-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResendConfirmation}
            disabled={isResending}
            className="border-amber-300 text-amber-800 hover:bg-amber-100"
          >
            {isResending ? "Reenviando..." : "Reenviar"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(false)}
            className="text-amber-600 hover:text-amber-800 hover:bg-amber-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default EmailConfirmationBanner;