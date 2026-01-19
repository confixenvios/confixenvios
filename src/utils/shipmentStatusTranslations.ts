// Mapeamento centralizado de traduções de status de remessas
// Todos os status em português profissional

export interface StatusConfig {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  color?: string;
}

export const shipmentStatusTranslations: Record<string, StatusConfig> = {
  // Status de pagamento
  'PENDING_PAYMENT': { label: 'Aguardando Pagamento', variant: 'destructive' },
  'PAYMENT_CONFIRMED': { label: 'Pagamento Confirmado', variant: 'default', color: 'success' },
  'PAID': { label: 'Pagamento Confirmado', variant: 'default', color: 'success' },
  'PAGO_AGUARDANDO_ETIQUETA': { label: 'Aguardando Etiqueta', variant: 'secondary' },
  
  // Status de etiqueta
  'PENDING_LABEL': { label: 'Aguardando Etiqueta', variant: 'secondary' },
  'LABEL_GENERATED': { label: 'Etiqueta Gerada', variant: 'default' },
  'LABEL_AVAILABLE': { label: 'Etiqueta Disponível', variant: 'default', color: 'success' },
  
  // Status de coleta
  'COLETA_ACEITA': { label: 'Coleta Aceita', variant: 'default' },
  'COLETADO': { label: 'Coletado', variant: 'default' },
  'COLETA_REALIZADA': { label: 'Coleta Realizada', variant: 'default' },
  
  // Status de transporte
  'EM_TRANSITO': { label: 'Em Trânsito', variant: 'default', color: 'info' },
  'IN_TRANSIT': { label: 'Em Trânsito', variant: 'default', color: 'info' },
  'in_transit': { label: 'Em Trânsito', variant: 'default', color: 'info' },
  'SAIU_PARA_ENTREGA': { label: 'Saiu para Entrega', variant: 'default', color: 'info' },
  
  // Status de entrega
  'ENTREGUE': { label: 'Entregue', variant: 'secondary', color: 'success' },
  'DELIVERED': { label: 'Entregue', variant: 'secondary', color: 'success' },
  'delivered': { label: 'Entregue', variant: 'secondary', color: 'success' },
  'ENTREGA_FINALIZADA': { label: 'Entrega Finalizada', variant: 'secondary', color: 'success' },
  
  // Status pendentes
  'PENDING': { label: 'Pendente', variant: 'secondary' },
  'pending': { label: 'Pendente', variant: 'secondary' },
  'PENDENTE': { label: 'Pendente', variant: 'secondary' },
  
  // Status de aceite
  'ACEITO': { label: 'Aceito', variant: 'default' },
  'accepted': { label: 'Aceito', variant: 'default' },
  'paid': { label: 'Pagamento Confirmado', variant: 'default', color: 'success' },
  
  // Ocorrências
  'OCORRENCIA': { label: 'Ocorrência', variant: 'destructive' },
  'TENTATIVA_ENTREGA': { label: 'Tentativa de Entrega', variant: 'destructive' },
  'DEVOLVIDO': { label: 'Devolvido', variant: 'destructive' },
  
  // Cancelamento
  'CANCELLED': { label: 'Cancelado', variant: 'destructive' },
  'cancelled': { label: 'Cancelado', variant: 'destructive' },
  'CANCELADO': { label: 'Cancelado', variant: 'destructive' },
};

export const getStatusTranslation = (status: string): StatusConfig => {
  return shipmentStatusTranslations[status] || { 
    label: status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), 
    variant: 'outline' as const 
  };
};

export const getStatusLabel = (status: string): string => {
  return getStatusTranslation(status).label;
};

export const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  return getStatusTranslation(status).variant;
};
