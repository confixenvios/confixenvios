// Placeholder component - will be rebuilt for new CD system
interface CdShipmentDetailsModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  shipment?: any;
}

const CdShipmentDetailsModal = ({ isOpen, onClose, shipment }: CdShipmentDetailsModalProps) => {
  if (!isOpen) return null;
  
  return (
    <div className="p-4 text-center text-muted-foreground">
      Modal de detalhes em desenvolvimento
    </div>
  );
};

export default CdShipmentDetailsModal;
