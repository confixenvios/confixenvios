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
  cte_emission?: {
    id: string;
    chave_cte: string;
    uuid_cte: string;
    serie: string;
    numero_cte: string;
    status: string;
    motivo: string | null;
    modelo: string;
    xml_url: string | null;
    dacte_url: string | null;
    payload_bruto: any;
    created_at: string;
  } | null;
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
  
  // Buscar remessas normais
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

  console.log('📊 [ADMIN SHIPMENTS SERVICE] Resultado da query remessas normais:', {
    count: data?.length || 0,
    error: error?.message || 'Sem erro'
  });

  if (error) {
    console.error('❌ [ADMIN SHIPMENTS SERVICE] Erro na query:', error);
    throw error;
  }

  // Buscar remessas B2B
  const { data: b2bData, error: b2bError } = await supabase
    .from('b2b_shipments')
    .select(`
      id,
      tracking_code,
      status,
      created_at,
      updated_at,
      recipient_name,
      recipient_phone,
      recipient_cep,
      recipient_street,
      recipient_number,
      recipient_complement,
      recipient_neighborhood,
      recipient_city,
      recipient_state,
      observations,
      package_type,
      volume_count,
      delivery_type,
      delivery_date,
      b2b_client_id,
      b2b_clients(company_name, email, phone, cnpj)
    `)
    .order('created_at', { ascending: false });

  console.log('📊 [ADMIN SHIPMENTS SERVICE] Resultado da query remessas B2B:', {
    count: b2bData?.length || 0,
    error: b2bError?.message || 'Sem erro'
  });

  if (b2bError) {
    console.error('❌ [ADMIN SHIPMENTS SERVICE] Erro na query B2B:', b2bError);
  }

  // Buscar informações dos clientes para cada remessa normal
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

      return result;
    })
  );

  // Normalizar remessas B2B para o mesmo formato
  const b2bShipmentsWithDetails: AdminShipment[] = (b2bData || []).map((b2bShipment) => {
    const b2bClient = Array.isArray(b2bShipment.b2b_clients) 
      ? b2bShipment.b2b_clients[0] 
      : b2bShipment.b2b_clients;

    return {
      id: b2bShipment.id,
      tracking_code: b2bShipment.tracking_code || '',
      status: b2bShipment.status,
      weight: 0, // B2B não tem peso individual
      length: 0,
      width: 0,
      height: 0,
      format: b2bShipment.package_type || 'caixa',
      selected_option: b2bShipment.delivery_type || 'economico',
      pickup_option: 'pickup',
      quote_data: {
        observations: b2bShipment.observations,
        volume_count: b2bShipment.volume_count,
        delivery_date: b2bShipment.delivery_date
      },
      payment_data: null,
      created_at: b2bShipment.created_at,
      label_pdf_url: null,
      cte_key: null,
      user_id: undefined,
      motorista_id: undefined,
      pricing_table_id: undefined,
      pricing_table_name: undefined,
      document_type: 'declaracao_conteudo',
      client_name: `${b2bClient?.company_name || 'Cliente B2B'} (Expresso)`,
      sender_address: {
        name: b2bClient?.company_name || 'Cliente B2B',
        street: '',
        number: '',
        neighborhood: '',
        city: '',
        state: '',
        cep: '',
        complement: null,
        reference: null
      },
      recipient_address: {
        name: b2bShipment.recipient_name || '',
        street: b2bShipment.recipient_street || '',
        number: b2bShipment.recipient_number || '',
        neighborhood: b2bShipment.recipient_neighborhood || '',
        city: b2bShipment.recipient_city || '',
        state: b2bShipment.recipient_state || '',
        cep: b2bShipment.recipient_cep || '',
        complement: b2bShipment.recipient_complement || null,
        reference: null
      },
      motoristas: undefined
    };
  });

  // Combinar remessas normais e B2B
  const allShipments = [...shipmentsWithDetails, ...b2bShipmentsWithDetails];
  
  // Ordenar por data de criação (mais recente primeiro)
  allShipments.sort((a, b) => {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  console.log('✅ [ADMIN SHIPMENTS SERVICE] Processamento concluído:', {
    totalProcessed: allShipments.length,
    normalShipments: shipmentsWithDetails.length,
    b2bShipments: b2bShipmentsWithDetails.length
  });

  return allShipments;
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
 * Serviço para buscar remessas disponíveis para motoristas (normais + B2B)
 */
export const getAvailableShipments = async (): Promise<BaseShipment[]> => {
  console.log('📋 Iniciando busca por remessas disponíveis (normais + B2B)...');
  
  try {
    // Buscar remessas NORMAIS disponíveis
    const { data: shipmentsData, error: shipmentsError } = await supabase
      .from('shipments')
      .select('*')
      .is('motorista_id', null)
      .in('status', ['PAYMENT_CONFIRMED', 'PAID', 'PENDING_LABEL', 'LABEL_GENERATED', 'PAGO_AGUARDANDO_ETIQUETA'])
      .order('created_at', { ascending: false });
    
    if (shipmentsError) {
      console.error('❌ Erro ao buscar remessas normais:', shipmentsError);
    }
    
    console.log('📦 Remessas normais encontradas:', shipmentsData?.length || 0);
    
    // Buscar remessas B2B disponíveis (PENDENTE = aguardando motorista)
    const { data: b2bData, error: b2bError } = await supabase
      .from('b2b_shipments')
      .select(`
        id,
        tracking_code,
        status,
        created_at,
        updated_at,
        recipient_name,
        recipient_phone,
        recipient_cep,
        recipient_street,
        recipient_number,
        recipient_complement,
        recipient_neighborhood,
        recipient_city,
        recipient_state,
        observations,
        package_type,
        volume_count,
        delivery_type,
        delivery_date,
        b2b_client_id,
        b2b_clients(
          company_name, 
          email, 
          phone, 
          cnpj,
          default_pickup_cep,
          default_pickup_street,
          default_pickup_number,
          default_pickup_complement,
          default_pickup_neighborhood,
          default_pickup_city,
          default_pickup_state
        )
      `)
      .eq('status', 'PENDENTE')
      .order('created_at', { ascending: false });

    if (b2bError) {
      console.error('❌ Erro ao buscar remessas B2B:', b2bError);
    }

    console.log('📦 Remessas B2B encontradas:', b2bData?.length || 0);
    
    // Processar remessas normais com endereços
    const remessasNormais = await Promise.all(
      (shipmentsData || []).map(async (shipment) => {
        const { data: senderAddress } = await supabase
          .from('addresses')
          .select('*')
          .eq('id', shipment.sender_address_id)
          .maybeSingle();
        
        const { data: recipientAddress } = await supabase
          .from('addresses')
          .select('*')
          .eq('id', shipment.recipient_address_id)
          .maybeSingle();
        
        return {
          ...normalizeShipmentData({
            ...shipment,
            sender_address: senderAddress || createEmptyAddress(),
            recipient_address: recipientAddress || createEmptyAddress()
          })
        };
      })
    );
    
    // Normalizar remessas B2B para o mesmo formato BaseShipment
    const remessasB2B: BaseShipment[] = (b2bData || []).map((b2bShipment) => {
      const b2bClient = Array.isArray(b2bShipment.b2b_clients) 
        ? b2bShipment.b2b_clients[0] 
        : b2bShipment.b2b_clients;

      // Parsear observations para extrair dados adicionais
      let parsedObs: any = {};
      try {
        if (b2bShipment.observations) {
          parsedObs = JSON.parse(b2bShipment.observations);
        }
      } catch (e) {
        console.log('⚠️ Não foi possível parsear observations do B2B:', b2bShipment.id);
      }

      return {
        id: b2bShipment.id,
        tracking_code: b2bShipment.tracking_code || '',
        status: b2bShipment.status,
        weight: parsedObs.total_weight || 0,
        length: 0,
        width: 0,
        height: 0,
        format: b2bShipment.package_type || 'caixa',
        selected_option: b2bShipment.delivery_type || 'economico',
        pickup_option: 'pickup',
        quote_data: {
          observations: b2bShipment.observations,
          volume_count: b2bShipment.volume_count,
          delivery_date: b2bShipment.delivery_date,
          parsedObservations: parsedObs
        },
        payment_data: null,
        created_at: b2bShipment.created_at,
        label_pdf_url: null,
        cte_key: null,
        sender_address: {
          name: b2bClient?.company_name || 'Cliente B2B',
          street: b2bClient?.default_pickup_street || parsedObs.pickup_address?.street || '',
          number: b2bClient?.default_pickup_number || parsedObs.pickup_address?.number || '',
          neighborhood: b2bClient?.default_pickup_neighborhood || parsedObs.pickup_address?.neighborhood || '',
          city: b2bClient?.default_pickup_city || parsedObs.pickup_address?.city || '',
          state: b2bClient?.default_pickup_state || parsedObs.pickup_address?.state || '',
          cep: b2bClient?.default_pickup_cep || parsedObs.pickup_address?.cep || '',
          complement: b2bClient?.default_pickup_complement || parsedObs.pickup_address?.complement || '',
          phone: b2bClient?.phone || parsedObs.pickup_address?.contact_phone || ''
        },
        recipient_address: {
          name: b2bShipment.recipient_name || '',
          street: b2bShipment.recipient_street || '',
          number: b2bShipment.recipient_number || '',
          neighborhood: b2bShipment.recipient_neighborhood || '',
          city: b2bShipment.recipient_city || '',
          state: b2bShipment.recipient_state || '',
          cep: b2bShipment.recipient_cep || '',
          complement: b2bShipment.recipient_complement || '',
          phone: b2bShipment.recipient_phone || ''
        }
      };
    });
    
    // Combinar todas as remessas e ordenar por data
    const allShipments = [...remessasNormais, ...remessasB2B];
    allShipments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    console.log('✅ Total de remessas disponíveis:', allShipments.length, '(Normais:', remessasNormais.length, ', B2B:', remessasB2B.length, ')');
    return allShipments;
    
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
  console.log('🔄 [NORMALIZE] Pricing table data:', {
    pricing_table_name: shipment.pricing_table_name,
    pricing_table_id: shipment.pricing_table_id
  });
  
  // Debug específico para remessa ID2025Y077F3
  if (shipment.tracking_code === 'ID2025Y077F3') {
    console.log('🐛 [DEBUG] Remessa ID2025Y077F3 - document_type:', shipment.document_type);
    console.log('🐛 [DEBUG] Remessa ID2025Y077F3 - dados completos:', shipment);
  }
  
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

  const result = {
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
  
  // Debug específico para remessa ID2025Y077F3
  if (shipment.tracking_code === 'ID2025Y077F3') {
    console.log('🐛 [DEBUG] Remessa ID2025Y077F3 - document_type final:', result.document_type);
  }
  
  return result;
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
    p_shipment_id: shipmentId,
    p_motorista_uuid: motoristaId
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