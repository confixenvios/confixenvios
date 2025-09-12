import { supabase } from "@/integrations/supabase/client";

// Tipos padronizados para todos os portais
export interface ShipmentAddress {
  name: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
  complement?: string;
  reference?: string;
  phone?: string;
}

export interface BaseShipment {
  id: string;
  tracking_code: string | null;
  status: string;
  created_at: string;
  weight: number | string;
  length: number | string;
  width: number | string;
  height: number | string;
  format: string;
  selected_option: string;
  pickup_option: string;
  quote_data: any;
  payment_data: any;
  label_pdf_url?: string | null;
  cte_key?: string | null;
  sender_address: ShipmentAddress;
  recipient_address: ShipmentAddress;
  pricing_table_name?: string;
  pricing_table_id?: string;
  document_type?: string;
}

export interface ClientShipment extends BaseShipment {
  user_id: string;
}

export interface AdminShipment extends BaseShipment {
  user_id?: string;
  client_name: string;
  motoristas?: {
    nome: string;
    telefone: string;
    email: string;
  };
}

export interface MotoristaShipment extends BaseShipment {
  motorista_id: string;
}

/**
 * Serviço para buscar remessas do portal do cliente
 */
export const getClientShipments = async (userId: string): Promise<ClientShipment[]> => {
  const { data, error } = await supabase
    .from('shipments')
    .select(`
      id,
      tracking_code,
      status,
      weight,
      length,
      width,
      height,
      format,
      selected_option,
      pickup_option,
      created_at,
      label_pdf_url,
      cte_key,
      quote_data,
      payment_data,
      user_id,
      sender_address:addresses!sender_address_id (
        name,
        street,
        number,
        neighborhood,
        city,
        state,
        cep,
        complement,
        reference
      ),
      recipient_address:addresses!recipient_address_id (
        name,
        street,
        number,
        neighborhood,
        city,
        state,
        cep,
        complement,
        reference
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  
  return data?.map(item => ({
    ...normalizeShipmentData(item),
    user_id: item.user_id
  })) || [];
};

/**
 * Serviço para buscar remessas do portal do admin
 */
export const getAdminShipments = async (): Promise<AdminShipment[]> => {
  console.log('🔄 [ADMIN SHIPMENTS SERVICE] Iniciando busca de remessas admin...');
  
  const { data, error } = await supabase
    .from('shipments')
    .select(`
      id,
      tracking_code,
      weight,
      length,
      width,
      height,
      format,
      selected_option,
      pickup_option,
      quote_data,
      payment_data,
      status,
      created_at,
      label_pdf_url,
      cte_key,
      user_id,
      motorista_id,
      pricing_table_id,
      pricing_table_name,
      document_type,
      sender_address:addresses!shipments_sender_address_id_fkey(
        name,
        street,
        number,
        neighborhood,
        city,
        state,
        cep,
        complement,
        reference
      ),
      recipient_address:addresses!shipments_recipient_address_id_fkey(
        name,
        street,
        number,
        neighborhood,
        city,
        state,
        cep,
        complement,
        reference
      ),
      motoristas(nome, telefone, email)
    `)
    .order('created_at', { ascending: false });

  console.log('📊 [ADMIN SHIPMENTS SERVICE] Resultado da query:', {
    count: data?.length || 0,
    error: error?.message || 'Sem erro'
  });

  if (error) {
    console.error('❌ [ADMIN SHIPMENTS SERVICE] Erro na query:', error);
    throw error;
  }

  // Buscar informações dos clientes para cada remessa
  const shipmentsWithDetails = await Promise.all(
    (data || []).map(async (shipment) => {
      let clientProfile = null;
      if (shipment.user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name, email')
          .eq('id', shipment.user_id)
          .maybeSingle();
        clientProfile = profile;
      }

      const result = {
        ...normalizeShipmentData(shipment),
        client_name: clientProfile 
          ? `${clientProfile.first_name || ''} ${clientProfile.last_name || ''}`.trim() || clientProfile.email || 'Cliente Anônimo'
          : 'Cliente Anônimo',
        motoristas: shipment.motoristas
      };

      // Debug da remessa mais recente
      if (shipment.tracking_code === 'ID20251VROOK') {
        console.log('🔍 [ADMIN SHIPMENTS SERVICE] Remessa ID20251VROOK encontrada:', {
          id: result.id,
          tracking_code: result.tracking_code,
          client_name: result.client_name,
          created_at: result.created_at,
          user_id: shipment.user_id,
          profile: clientProfile
        });
      }

      return result;
    })
  );

  console.log('✅ [ADMIN SHIPMENTS SERVICE] Processamento concluído:', {
    totalProcessed: shipmentsWithDetails.length,
    kennedyShipments: shipmentsWithDetails.filter(s => 
      s.client_name.toLowerCase().includes('kennedy')
    ).length
  });

  return shipmentsWithDetails;
};

/**
 * Serviço para buscar remessas do portal do motorista
 */
export const getMotoristaShipments = async (motoristaId: string): Promise<MotoristaShipment[]> => {
  // Usar a função RPC para maior segurança
  const { data, error } = await supabase
    .rpc('get_motorista_shipments_public', { 
      motorista_uuid: motoristaId 
    });

  if (error) throw error;
  
  return data?.map((item: any) => ({
    ...item,
    sender_address: item.sender_address || createEmptyAddress(),
    recipient_address: item.recipient_address || createEmptyAddress(),
    motorista_id: motoristaId
  })) || [];
};

/**
 * Serviço para buscar remessas disponíveis para motoristas
 */
export const getAvailableShipments = async (): Promise<BaseShipment[]> => {
  console.log('📋 Iniciando busca por remessas disponíveis...');
  
  try {
    // Buscar remessas sem join primeiro para testar
    const { data: shipmentsData, error: shipmentsError } = await supabase
      .from('shipments')
      .select('*')
      .is('motorista_id', null)
      .in('status', ['PAYMENT_CONFIRMED', 'PAID', 'PENDING_LABEL', 'LABEL_GENERATED'])
      .order('created_at', { ascending: true });
    
    if (shipmentsError) {
      console.error('❌ Erro ao buscar remessas:', shipmentsError);
      throw shipmentsError;
    }
    
    console.log('📦 Remessas encontradas:', shipmentsData?.length || 0, shipmentsData);
    
    if (!shipmentsData || shipmentsData.length === 0) {
      console.log('⚠️ Nenhuma remessa disponível encontrada');
      return [];
    }
    
    // Buscar endereços separadamente para cada remessa
    const remessasComEnderecos = await Promise.all(
      shipmentsData.map(async (shipment) => {
        console.log(`🔍 Buscando endereços para remessa ${shipment.id}...`);
        
        // Buscar endereço do remetente
        const { data: senderAddress } = await supabase
          .from('addresses')
          .select('*')
          .eq('id', shipment.sender_address_id)
          .maybeSingle();
        
        // Buscar endereço do destinatário
        const { data: recipientAddress } = await supabase
          .from('addresses')
          .select('*')
          .eq('id', shipment.recipient_address_id)
          .maybeSingle();
        
        console.log(`📍 Endereços da remessa ${shipment.id}:`, {
          sender: senderAddress,
          recipient: recipientAddress
        });
        
        return {
          ...normalizeShipmentData({
            ...shipment,
            sender_address: senderAddress || createEmptyAddress(),
            recipient_address: recipientAddress || createEmptyAddress()
          })
        };
      })
    );
    
    console.log('✅ Remessas processadas com sucesso:', remessasComEnderecos);
    return remessasComEnderecos;
    
  } catch (error) {
    console.error('❌ Erro completo ao buscar remessas disponíveis:', error);
    throw error;
  }
};

/**
 * Normaliza os dados de uma remessa para garantir consistência
 * PRIORIZA os dados originais do formulário do usuário (quote_data.addressData)
 */
function normalizeShipmentData(shipment: any): BaseShipment {
  console.log('🔄 [NORMALIZE] Normalizando dados da remessa:', shipment.id);
  
  // Tentar usar dados originais do formulário (quote_data.addressData) primeiro
  let senderAddress = shipment.sender_address || createEmptyAddress();
  let recipientAddress = shipment.recipient_address || createEmptyAddress();
  
  // Se existem dados originais no quote_data, usar esses dados (SEMPRE CORRETOS)
  if (shipment.quote_data?.addressData) {
    console.log('✅ [NORMALIZE] Usando dados originais do formulário (quote_data.addressData)');
    
    if (shipment.quote_data.addressData.sender) {
      senderAddress = {
        name: shipment.quote_data.addressData.sender.name || senderAddress.name,
        street: shipment.quote_data.addressData.sender.street || senderAddress.street,
        number: shipment.quote_data.addressData.sender.number || senderAddress.number,
        neighborhood: shipment.quote_data.addressData.sender.neighborhood || senderAddress.neighborhood,
        city: shipment.quote_data.addressData.sender.city || senderAddress.city,
        state: shipment.quote_data.addressData.sender.state || senderAddress.state,
        cep: shipment.quote_data.addressData.sender.cep || senderAddress.cep,
        complement: shipment.quote_data.addressData.sender.complement || senderAddress.complement,
        reference: shipment.quote_data.addressData.sender.reference || senderAddress.reference,
        phone: shipment.quote_data.addressData.sender.phone || senderAddress.phone,
      };
    }
    
    if (shipment.quote_data.addressData.recipient) {
      recipientAddress = {
        name: shipment.quote_data.addressData.recipient.name || recipientAddress.name,
        street: shipment.quote_data.addressData.recipient.street || recipientAddress.street,
        number: shipment.quote_data.addressData.recipient.number || recipientAddress.number,
        neighborhood: shipment.quote_data.addressData.recipient.neighborhood || recipientAddress.neighborhood,
        city: shipment.quote_data.addressData.recipient.city || recipientAddress.city,
        state: shipment.quote_data.addressData.recipient.state || recipientAddress.state,
        cep: shipment.quote_data.addressData.recipient.cep || recipientAddress.cep,
        complement: shipment.quote_data.addressData.recipient.complement || recipientAddress.complement,
        reference: shipment.quote_data.addressData.recipient.reference || recipientAddress.reference,
        phone: shipment.quote_data.addressData.recipient.phone || recipientAddress.phone,
      };
    }
  }
  
  console.log('📦 [NORMALIZE] Endereços finalizados:', {
    sender: senderAddress.name + ' - ' + senderAddress.street + ', ' + senderAddress.number,
    recipient: recipientAddress.name + ' - ' + recipientAddress.street + ', ' + recipientAddress.number
  });

  return {
    id: shipment.id,
    tracking_code: shipment.tracking_code,
    status: shipment.status,
    created_at: shipment.created_at,
    weight: shipment.weight,
    length: shipment.length,
    width: shipment.width,
    height: shipment.height,
    format: shipment.format,
    selected_option: shipment.selected_option,
    pickup_option: shipment.pickup_option,
    quote_data: shipment.quote_data,
    payment_data: shipment.payment_data,
    label_pdf_url: shipment.label_pdf_url,
    cte_key: shipment.cte_key,
    sender_address: senderAddress,
    recipient_address: recipientAddress,
    pricing_table_name: shipment.pricing_table_name,
    pricing_table_id: shipment.pricing_table_id,
    document_type: shipment.document_type
  };
}

/**
 * Cria um endereço vazio com a estrutura correta
 */
function createEmptyAddress(): ShipmentAddress {
  return {
    name: '',
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '',
    cep: '',
    complement: '',
    reference: '',
    phone: ''
  };
}

/**
 * Aceitar uma remessa (apenas para motoristas)
 */
export const acceptShipment = async (shipmentId: string, motoristaId: string) => {
  const { data, error } = await supabase.rpc('accept_shipment', {
    shipment_id: shipmentId,
    motorista_uuid: motoristaId
  });

  if (error) throw error;
  return data;
};

/**
 * Obter estatísticas de remessas para dashboards
 */
export const getShipmentStats = async (userId?: string) => {
  let query = supabase.from('shipments').select('status', { count: 'exact' });
  
  if (userId) {
    query = query.eq('user_id', userId);
  }
  
  const { data, error, count } = await query;
  
  if (error) throw error;
  
  // Contar por status
  const statusCounts = (data || []).reduce((acc: Record<string, number>, shipment) => {
    acc[shipment.status] = (acc[shipment.status] || 0) + 1;
    return acc;
  }, {});
  
  return {
    total: count || 0,
    statusCounts
  };
};