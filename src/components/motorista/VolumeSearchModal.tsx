// Placeholder component - will be rebuilt for new motorista system
interface VolumeSearchModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onVolumeFound?: (volume: any) => void;
}

export const VolumeSearchModal = ({ isOpen, onClose, onVolumeFound }: VolumeSearchModalProps) => {
  if (!isOpen) return null;
  
  return (
    <div className="p-4 text-center text-muted-foreground">
      Modal de busca em desenvolvimento
    </div>
  );
};

export default VolumeSearchModal;
