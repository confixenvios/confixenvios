// Placeholder component - will be rebuilt for new motorista system
interface FinalizarEntregaModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  shipment?: any;
  onSuccess?: () => void;
}

export const FinalizarEntregaModal = ({ isOpen, onClose, shipment, onSuccess }: FinalizarEntregaModalProps) => {
  if (!isOpen) return null;
  
  return (
    <div className="p-4 text-center text-muted-foreground">
      Modal de finalização em desenvolvimento
    </div>
  );
};

export default FinalizarEntregaModal;
