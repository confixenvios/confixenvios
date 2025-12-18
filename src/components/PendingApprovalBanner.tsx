import { AlertTriangle, Clock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface PendingApprovalBannerProps {
  type?: 'client' | 'b2b';
}

const PendingApprovalBanner = ({ type = 'client' }: PendingApprovalBannerProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="max-w-md mx-4">
        <Alert className="border-warning bg-warning/10">
          <Clock className="h-5 w-5 text-warning" />
          <AlertTitle className="text-lg font-semibold text-foreground">
            Cadastro Aguardando Aprovação
          </AlertTitle>
          <AlertDescription className="mt-2 text-muted-foreground">
            <p className="mb-3">
              Seu cadastro foi recebido com sucesso e está sendo analisado pela nossa equipe.
            </p>
            <p className="mb-3">
              Em breve você receberá uma confirmação e poderá utilizar todos os recursos da plataforma{type === 'b2b' ? ' B2B Express' : ''}.
            </p>
            <div className="flex items-center gap-2 mt-4 p-3 bg-muted/50 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <span className="text-sm">
                Se tiver dúvidas, entre em contato com nosso suporte.
              </span>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
};

export default PendingApprovalBanner;
