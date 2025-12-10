import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Truck, Package, MapPin } from 'lucide-react';

interface B2BStatusBadgeProps {
  status: string;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

const B2BStatusBadge = ({ status, showIcon = false, size = 'md' }: B2BStatusBadgeProps) => {
  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Clock; className?: string }> = {
      'PENDENTE': { 
        label: 'Aguardando Coleta', 
        variant: 'secondary', 
        icon: Clock,
        className: 'bg-yellow-100 text-yellow-800 border-yellow-300'
      },
      'ACEITA': { 
        label: 'Coleta Aceita', 
        variant: 'secondary', 
        icon: Package,
        className: 'bg-orange-100 text-orange-800 border-orange-300'
      },
      'COLETA_ACEITA': { 
        label: 'Coleta Aceita', 
        variant: 'secondary', 
        icon: Package,
        className: 'bg-orange-100 text-orange-800 border-orange-300'
      },
      'B2B_COLETA_FINALIZADA': { 
        label: 'Em Trânsito', 
        variant: 'default', 
        icon: Truck,
        className: 'bg-blue-100 text-blue-800 border-blue-300'
      },
      'B2B_ENTREGA_ACEITA': { 
        label: 'Saiu para Entrega', 
        variant: 'default', 
        icon: MapPin,
        className: 'bg-purple-100 text-purple-800 border-purple-300'
      },
      'ENTREGUE': { 
        label: 'Entregue', 
        variant: 'default', 
        icon: CheckCircle,
        className: 'bg-green-100 text-green-800 border-green-300'
      },
      'ENTREGA_FINALIZADA': { 
        label: 'Entregue', 
        variant: 'default', 
        icon: CheckCircle,
        className: 'bg-green-100 text-green-800 border-green-300'
      },
    };
    return configs[status] || { 
      label: status, 
      variant: 'outline' as const, 
      icon: Clock,
      className: ''
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
