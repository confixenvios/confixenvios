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
    id: 'em_transito',
    label: 'Em Trânsito',
    description: 'Mercadoria em deslocamento para entrega',
    icon: Truck,
    color: 'default',
    newStatus: 'EM_TRANSITO'
  },
  {
    id: 'tentativa_entrega',
    label: 'Insucesso na Entrega',
    description: 'Tentativa de entrega sem sucesso (requer motivo)',
    icon: AlertTriangle,
    color: 'destructive',
    newStatus: 'TENTATIVA_ENTREGA'
  },
  {
    id: 'entregue',
    label: 'Entregue ao Destinatário com Sucesso',
    description: 'Mercadoria entregue com sucesso ao destinatário',
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
      <DialogContent className="w-[95vw] max-w-sm p-4 gap-3">
        <DialogHeader className="space-y-2">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Alterar Status da Remessa
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!selectedType ? (
            <>
              <p className="text-sm text-muted-foreground mb-3">
                Selecione o próximo status da remessa:
              </p>
              <div className="space-y-3">
                {OCCURRENCE_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <div
                      key={type.id}
                      className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedType(type)}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium text-sm">{type.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {type.description}
                          </div>
                        </div>
                      </div>
                        <Badge 
                          variant="outline"
                          className={`text-xs ${
                            type.id === 'coleta_realizada' ? 'border-blue-500 text-blue-700 bg-blue-50' :
                            type.id === 'em_transito' ? 'border-purple-500 text-purple-700 bg-purple-50' :
                            type.id === 'tentativa_entrega' ? 'border-red-500 text-red-700 bg-red-50' :
                            type.id === 'entregue' ? 'border-green-500 text-green-700 bg-green-50' : ''
                          }`}
                        >
                          {type.id === 'coleta_realizada' ? 'Coleta' :
                           type.id === 'em_transito' ? 'Transporte' : 
                           type.id === 'tentativa_entrega' ? 'Insucesso' : 
                           type.id === 'entregue' ? 'Entrega' : ''}
                        </Badge>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <selectedType.icon className="h-5 w-5" />
                <div className="flex-1">
                  <div className="font-medium">{selectedType.label}</div>
                  <div className="text-sm text-muted-foreground">
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

              <div className="flex gap-2 pt-2">
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
                  Registrar
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};