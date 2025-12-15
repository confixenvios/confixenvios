import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Truck, Package, MapPin, Warehouse } from 'lucide-react';

interface B2BStatusBadgeProps {
  status: string;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

const B2BStatusBadge = ({ status, showIcon = false, size = 'md' }: B2BStatusBadgeProps) => {
  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; icon: typeof Clock; className: string }> = {
      'PENDENTE': { 
        label: 'Pendente', 
        icon: Clock,
        className: 'bg-yellow-100 text-yellow-800 border-yellow-300'
      },
      'EM_TRANSITO': { 
        label: 'Em Trânsito', 
        icon: Truck,
        className: 'bg-blue-100 text-blue-800 border-blue-300'
      },
      'NO_CD': { 
        label: 'No CD', 
        icon: Warehouse,
        className: 'bg-purple-100 text-purple-800 border-purple-300'
      },
      'EM_ROTA': { 
        label: 'Em Rota', 
        icon: MapPin,
        className: 'bg-indigo-100 text-indigo-800 border-indigo-300'
      },
      'ENTREGUE': { 
        label: 'Entregue', 
        icon: CheckCircle,
        className: 'bg-green-100 text-green-800 border-green-300'
      },
      // Legacy status support
      'ACEITA': { 
        label: 'Aceita', 
        icon: Package,
        className: 'bg-orange-100 text-orange-800 border-orange-300'
      },
      'COLETA_ACEITA': { 
        label: 'Coleta Aceita', 
        icon: Package,
        className: 'bg-orange-100 text-orange-800 border-orange-300'
      },
      'B2B_COLETA_FINALIZADA': { 
        label: 'Coletado', 
        icon: Truck,
        className: 'bg-blue-100 text-blue-800 border-blue-300'
      },
      'B2B_ENTREGA_ACEITA': { 
        label: 'Saiu para Entrega', 
        icon: MapPin,
        className: 'bg-purple-100 text-purple-800 border-purple-300'
      },
      'ENTREGA_FINALIZADA': { 
        label: 'Entregue', 
        icon: CheckCircle,
        className: 'bg-green-100 text-green-800 border-green-300'
      },
    };
    return configs[status] || { 
      label: status, 
      icon: Clock,
      className: 'bg-gray-100 text-gray-800 border-gray-300'
    };
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';

  return (
    <Badge 
      variant="outline" 
      className={`${config.className} ${sizeClass} font-medium`}
    >
      {showIcon && <Icon className={`${size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} mr-1`} />}
      {config.label}
    </Badge>
  );
};

export default B2BStatusBadge;
