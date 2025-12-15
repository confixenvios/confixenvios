// Placeholder component - will be rebuilt for new motorista system
interface B2BOccurrenceModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  shipment?: any;
  onSuccess?: () => void;
}

export const B2BOccurrenceModal = ({ isOpen, onClose, shipment, onSuccess }: B2BOccurrenceModalProps) => {
  if (!isOpen) return null;
  
  return (
    <div className="p-4 text-center text-muted-foreground">
      Modal de ocorrência em desenvolvimento
    </div>
  );
};

export default B2BOccurrenceModal;
