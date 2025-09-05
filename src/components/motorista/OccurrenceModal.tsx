import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  Truck, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  MapPin,
  FileText
} from 'lucide-react';

interface OccurrenceType {
  id: string;
  label: string;
  description: string;
  icon: any;
  color: 'success' | 'default' | 'destructive' | 'secondary';
  newStatus: string;
}

const OCCURRENCE_TYPES: OccurrenceType[] = [
  {
    id: 'coleta_realizada',
    label: 'Coleta Realizada',
    description: 'Mercadoria coletada com sucesso',
    icon: Package,
    color: 'success',
    newStatus: 'COLETA_FINALIZADA'
  },
  {
    id: 'tentativa_entrega',
    label: 'Tentativa de Entrega',
    description: 'Entrega não realizada (requer motivo)',
    icon: AlertTriangle,
    color: 'destructive',
    newStatus: 'TENTATIVA_ENTREGA'
  },
  {
    id: 'entregue',
    label: 'Entregue ao Destinatário',
    description: 'Mercadoria entregue com sucesso',
    icon: CheckCircle,
    color: 'success',
    newStatus: 'ENTREGA_FINALIZADA'
  }
];

interface OccurrenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (occurrence: {
    type: string;
    description: string;
    observations: string;
    newStatus: string;
  }) => void;
  shipmentId: string;
}

export const OccurrenceModal = ({ isOpen, onClose, onSave, shipmentId }: OccurrenceModalProps) => {
  const [selectedType, setSelectedType] = useState<OccurrenceType | null>(null);
  const [observations, setObservations] = useState('');

  const handleSave = () => {
    if (!selectedType) return;

    onSave({
      type: selectedType.id,
      description: selectedType.label,
      observations,
      newStatus: selectedType.newStatus
    });

    // Reset form
    setSelectedType(null);
    setObservations('');
    onClose();
  };

  const handleClose = () => {
    setSelectedType(null);
    setObservations('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg w-full mx-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Registrar Ocorrência
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!selectedType ? (
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Selecione o tipo de ocorrência:
                </p>
                <div className="space-y-2">
                  {OCCURRENCE_TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                      <Button
                        key={type.id}
                        variant="outline"
                        className="w-full justify-start h-auto p-4"
                        onClick={() => setSelectedType(type)}
                      >
                        <div className="flex items-center gap-3 w-full">
                          <Icon className="h-5 w-5 flex-shrink-0" />
                          <div className="flex-1 text-left">
                            <div className="font-medium">{type.label}</div>
                            <div className="text-xs text-muted-foreground">
                              {type.description}
                            </div>
                          </div>
                          <Badge variant={type.color} className="ml-2">
                            {type.id === 'tentativa_entrega' ? 'Insucesso' : 
                             type.id === 'entregue' ? 'Entrega' : 'Coleta'}
                          </Badge>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-3 p-3 bg-muted rounded-md">
                  <selectedType.icon className="h-5 w-5" />
                  <div>
                    <div className="font-medium">{selectedType.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {selectedType.description}
                    </div>
                  </div>
                  <Badge variant={selectedType.color}>
                    Selecionado
                  </Badge>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Observações {selectedType.id === 'tentativa_entrega' && '(obrigatório)'}
                  </label>
                  <Textarea
                    placeholder={
                      selectedType.id === 'tentativa_entrega' 
                        ? "Informe o motivo da não entrega..."
                        : "Adicione observações sobre esta ocorrência (opcional)..."
                    }
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setSelectedType(null)}
                  >
                    Voltar
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleSave}
                    disabled={
                      selectedType.id === 'tentativa_entrega' && !observations.trim()
                    }
                  >
                    Registrar Ocorrência
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};