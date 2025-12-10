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

  // Buscar remessas B2B com motorista
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
      motorista_id,
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

  // Buscar dados dos motoristas para B2B
  const motoristaIds = (b2bData || [])
    .map((s: any) => s.motorista_id)
    .filter((id: string | null) => id !== null);
  
  let motoristasMap: Record<string, { nome: string; telefone: string; email: string }> = {};
  
  if (motoristaIds.length > 0) {
    const { data: motoristasData } = await supabase
      .from('motoristas')
      .select('id, nome, telefone, email')
      .in('id', motoristaIds);
    
    if (motoristasData) {
      motoristasMap = motoristasData.reduce((acc: any, m: any) => {
        acc[m.id] = { nome: m.nome, telefone: m.telefone, email: m.email };
        return acc;
      }, {});
    }
  }

  // Normalizar remessas B2B para o mesmo formato
  const b2bShipmentsWithDetails: AdminShipment[] = (b2bData || []).map((b2bShipment: any) => {
    const b2bClient = Array.isArray(b2bShipment.b2b_clients) 
      ? b2bShipment.b2b_clients[0] 
      : b2bShipment.b2b_clients;

    const motoristaData = b2bShipment.motorista_id 
      ? motoristasMap[b2bShipment.motorista_id] 
      : undefined;

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
      motorista_id: b2bShipment.motorista_id,
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
      motoristas: motoristaData
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
  console.log('📋 Buscando remessas do motorista:', motoristaId);
  
  // Buscar remessas NORMAIS via RPC
  const { data: normalData, error: normalError } = await supabase
    .rpc('get_motorista_shipments_public', { 
      motorista_uuid: motoristaId 
    });

  if (normalError) {
    console.error('❌ Erro ao buscar remessas normais:', normalError);
  }
  
  console.log('📦 Remessas normais do motorista:', normalData?.length || 0);
  
  // Buscar remessas B2B atribuídas atualmente ao motorista
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
      motorista_id,
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
    .eq('motorista_id', motoristaId)
    .order('created_at', { ascending: false });

  if (b2bError) {
    console.error('❌ Erro ao buscar remessas B2B do motorista:', b2bError);
  }

  console.log('📦 Remessas B2B atuais do motorista:', b2bData?.length || 0);

  // Buscar IDs de remessas B2B que o motorista participou no histórico (B2B-1 coletas finalizadas)
  const { data: historyData, error: historyError } = await supabase
    .from('shipment_status_history')
    .select('b2b_shipment_id')
    .eq('motorista_id', motoristaId)
    .not('b2b_shipment_id', 'is', null);

  if (historyError) {
    console.error('❌ Erro ao buscar histórico do motorista:', historyError);
  }

  // Obter IDs únicos de remessas B2B do histórico que não estão nas remessas atuais
  const currentB2BIds = new Set((b2bData || []).map((b: any) => b.id));
  const historyB2BIds = [...new Set((historyData || []).map((h: any) => h.b2b_shipment_id))]
    .filter(id => id && !currentB2BIds.has(id));

  console.log('📦 Remessas B2B do histórico (coletas B2B-1):', historyB2BIds.length);

  // Buscar dados completos das remessas B2B do histórico
  let historyB2BData: any[] = [];
  if (historyB2BIds.length > 0) {
    const { data: additionalB2B, error: additionalError } = await supabase
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
        motorista_id,
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
      .in('id', historyB2BIds);

    if (additionalError) {
      console.error('❌ Erro ao buscar remessas B2B do histórico:', additionalError);
    } else {
      historyB2BData = additionalB2B || [];
    }
  }

  // Combinar remessas B2B atuais e do histórico
  const allB2BData = [...(b2bData || []), ...historyB2BData];
  console.log('📦 Total remessas B2B (atuais + histórico):', allB2BData.length);

  // Processar remessas normais
  const normalShipments: MotoristaShipment[] = normalData?.map((item: any) => ({
    ...item,
    sender_address: item.sender_address || createEmptyAddress(),
    recipient_address: item.recipient_address || createEmptyAddress(),
    motorista_id: motoristaId
  })) || [];

  // Processar remessas B2B
  const b2bShipments: MotoristaShipment[] = allB2BData.map((b2b: any) => {
    const client = b2b.b2b_clients;
    let observationsData: any = {};
    
    try {
      if (b2b.observations) {
        observationsData = typeof b2b.observations === 'string' 
          ? JSON.parse(b2b.observations) 
          : b2b.observations;
      }
    } catch (e) {
      console.warn('Erro ao parsear observations B2B:', e);
    }

    // Marcar se é remessa do histórico (motorista B2B-1 que finalizou coleta)
    const isFromHistory = historyB2BIds.includes(b2b.id);

    return {
      id: b2b.id,
      tracking_code: b2b.tracking_code,
      status: b2b.status,
      created_at: b2b.created_at,
      weight: observationsData.total_weight || 0,
      length: 0,
      width: 0,
      height: 0,
      format: 'box',
      selected_option: 'b2b_express',
      pickup_option: 'pickup',
      quote_data: {
        merchandiseDetails: {
          volumes: observationsData.volume_weights?.map((w: number, i: number) => ({
            weight: w,
            length: 0,
            width: 0,
            height: 0,
            merchandise_type: 'Mercadoria'
          })) || []
        },
        volumeAddresses: observationsData.volume_addresses || [],
        isFromHistory // Flag para indicar que veio do histórico
      },
      payment_data: null,
      label_pdf_url: null,
      cte_key: null,
      motorista_id: isFromHistory ? motoristaId : b2b.motorista_id, // Manter o motoristaId original para remessas do histórico
      sender_address: {
        name: client?.company_name || 'Cliente B2B',
        street: client?.default_pickup_street || '',
        number: client?.default_pickup_number || '',
        neighborhood: client?.default_pickup_neighborhood || '',
        city: client?.default_pickup_city || '',
        state: client?.default_pickup_state || '',
        cep: client?.default_pickup_cep || '',
        complement: client?.default_pickup_complement || '',
        reference: ''
      },
      recipient_address: {
        name: b2b.recipient_name || 'Destinatário',
        street: b2b.recipient_street || '',
        number: b2b.recipient_number || '',
        neighborhood: b2b.recipient_neighborhood || '',
        city: b2b.recipient_city || '',
        state: b2b.recipient_state || '',
        cep: b2b.recipient_cep || '',
        complement: b2b.recipient_complement || '',
        reference: ''
      }
    };
  });

  // Combinar e retornar todas as remessas
  const allShipments = [...normalShipments, ...b2bShipments];
  console.log('📦 Total de remessas do motorista:', allShipments.length);
  
  return allShipments;
};

export interface MotoristaVisibilidade {
  ve_convencional: boolean;
  ve_b2b_coleta: boolean;
  ve_b2b_entrega: boolean;
}

/**
 * Buscar configurações de visibilidade do motorista
 */
export const getMotoristaVisibilidade = async (motoristaEmail: string): Promise<MotoristaVisibilidade> => {
  const { data, error } = await supabase
    .from('motoristas')
    .select('ve_convencional, ve_b2b_coleta, ve_b2b_entrega')
    .eq('email', motoristaEmail)
    .single();

  if (error || !data) {
    console.warn('⚠️ Não foi possível buscar visibilidade do motorista, usando padrão');
    return { ve_convencional: true, ve_b2b_coleta: false, ve_b2b_entrega: false };
  }

  return {
    ve_convencional: data.ve_convencional ?? true,
    ve_b2b_coleta: data.ve_b2b_coleta ?? false,
    ve_b2b_entrega: data.ve_b2b_entrega ?? false
  };
};

/**
 * Serviço para buscar remessas disponíveis para motoristas (normais + B2B)
 * Agora filtra baseado nas flags de visibilidade do motorista
 */
export const getAvailableShipments = async (visibilidade?: MotoristaVisibilidade): Promise<BaseShipment[]> => {
  console.log('📋 Iniciando busca por remessas disponíveis');
  console.log('📋 Visibilidade recebida:', JSON.stringify(visibilidade));
  
  try {
    let remessasNormais: BaseShipment[] = [];
    let remessasB2BColeta: BaseShipment[] = [];
    let remessasB2BEntrega: BaseShipment[] = [];

    // Se não tiver visibilidade definida, carrega tudo (comportamento legado)
    const loadConvencional = visibilidade?.ve_convencional ?? true;
    const loadB2BColeta = visibilidade?.ve_b2b_coleta ?? false;
    const loadB2BEntrega = visibilidade?.ve_b2b_entrega ?? false;
    
    console.log('📋 Flags de carregamento: Conv=', loadConvencional, ', B2B-1=', loadB2BColeta, ', B2B-2=', loadB2BEntrega);

    // Buscar remessas NORMAIS/CONVENCIONAIS (se permitido)
    if (loadConvencional) {
      const { data: shipmentsData, error: shipmentsError } = await supabase
        .from('shipments')
        .select('*')
        .is('motorista_id', null)
        .in('status', ['PAYMENT_CONFIRMED', 'PAID', 'PENDING_LABEL', 'LABEL_GENERATED', 'PAGO_AGUARDANDO_ETIQUETA'])
        .order('created_at', { ascending: false });
      
      if (shipmentsError) {
        console.error('❌ Erro ao buscar remessas normais:', shipmentsError);
      }
      
      console.log('📦 Remessas convencionais encontradas:', shipmentsData?.length || 0);
      
      // Processar remessas normais com endereços
      remessasNormais = await Promise.all(
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
    }

    // Buscar remessas B2B - Fase 1 Coleta (PENDENTE - aguardando primeiro motorista)
    if (loadB2BColeta) {
      console.log('📦 Buscando B2B-1 (coleta) com status PENDENTE e motorista_id null...');
      
      const { data: b2bColetaData, error: b2bColetaError } = await supabase
        .from('b2b_shipments')
        .select(`
          id, tracking_code, status, created_at, updated_at,
          recipient_name, recipient_phone, recipient_cep, recipient_street,
          recipient_number, recipient_complement, recipient_neighborhood,
          recipient_city, recipient_state, observations, package_type,
          volume_count, delivery_type, delivery_date, b2b_client_id,
          b2b_clients(company_name, email, phone, cnpj,
            default_pickup_cep, default_pickup_street, default_pickup_number,
            default_pickup_complement, default_pickup_neighborhood,
            default_pickup_city, default_pickup_state)
        `)
        .eq('status', 'PENDENTE')
        .is('motorista_id', null)
        .order('created_at', { ascending: false });

      if (b2bColetaError) {
        console.error('❌ Erro ao buscar B2B coleta:', b2bColetaError);
        console.error('❌ Detalhes do erro:', JSON.stringify(b2bColetaError));
      }

      console.log('📦 Remessas B2B-1 (coleta) encontradas:', b2bColetaData?.length || 0);
      console.log('📦 Dados B2B-1 raw:', JSON.stringify(b2bColetaData?.slice(0, 2)));
      remessasB2BColeta = (b2bColetaData || []).map(b2b => normalizeB2BShipment(b2b, 'B2B-1'));
    }

    // Buscar remessas B2B - Fase 2 Entrega (COLETA_FINALIZADA - aguardando segundo motorista)
    if (loadB2BEntrega) {
      const { data: b2bEntregaData, error: b2bEntregaError } = await supabase
        .from('b2b_shipments')
        .select(`
          id, tracking_code, status, created_at, updated_at,
          recipient_name, recipient_phone, recipient_cep, recipient_street,
          recipient_number, recipient_complement, recipient_neighborhood,
          recipient_city, recipient_state, observations, package_type,
          volume_count, delivery_type, delivery_date, b2b_client_id, motorista_id,
          b2b_clients(company_name, email, phone, cnpj,
            default_pickup_cep, default_pickup_street, default_pickup_number,
            default_pickup_complement, default_pickup_neighborhood,
            default_pickup_city, default_pickup_state)
        `)
        .eq('status', 'B2B_COLETA_FINALIZADA')
        .is('motorista_id', null)
        .order('created_at', { ascending: false });

      if (b2bEntregaError) {
        console.error('❌ Erro ao buscar B2B entrega:', b2bEntregaError);
      }

      console.log('📦 Remessas B2B-2 (entrega) encontradas:', b2bEntregaData?.length || 0);
      remessasB2BEntrega = (b2bEntregaData || []).map(b2b => normalizeB2BShipment(b2b, 'B2B-2'));
    }
    
    // Combinar todas as remessas e ordenar por data
    const allShipments = [...remessasNormais, ...remessasB2BColeta, ...remessasB2BEntrega];
    allShipments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    console.log('✅ Total de remessas disponíveis:', allShipments.length, 
      '(Conv:', remessasNormais.length, 
      ', B2B-1:', remessasB2BColeta.length, 
      ', B2B-2:', remessasB2BEntrega.length, ')');
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
 * Normaliza remessa B2B para o formato BaseShipment
 */
function normalizeB2BShipment(b2bShipment: any, phase: string): BaseShipment {
  const b2bClient = Array.isArray(b2bShipment.b2b_clients) 
    ? b2bShipment.b2b_clients[0] 
    : b2bShipment.b2b_clients;

  let parsedObs: any = {};
  try {
    if (b2bShipment.observations) {
      parsedObs = JSON.parse(b2bShipment.observations);
    }
  } catch (e) {}

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
      parsedObservations: parsedObs,
      b2b_phase: phase
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
 * Suporta tanto remessas normais quanto B2B
 */
export const acceptShipment = async (shipmentId: string, motoristaId: string) => {
  // Primeiro, verificar se é uma remessa B2B pelo ID
  const { data: b2bCheck } = await supabase
    .from('b2b_shipments')
    .select('id, tracking_code, status')
    .eq('id', shipmentId)
    .maybeSingle();
  
  if (b2bCheck) {
    // É uma remessa B2B - determinar o novo status baseado no status atual
    // Se estava em B2B_COLETA_FINALIZADA, agora é fase 2 (entrega)
    const newStatus = b2bCheck.status === 'B2B_COLETA_FINALIZADA' 
      ? 'B2B_ENTREGA_ACEITA' 
      : 'ACEITA';
    
    const { error: updateError } = await supabase
      .from('b2b_shipments')
      .update({ 
        motorista_id: motoristaId,
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', shipmentId);
    
    if (updateError) {
      console.error('❌ Erro ao aceitar B2B:', updateError);
      return { success: false, error: updateError.message };
    }
    
    const phase = newStatus === 'B2B_ENTREGA_ACEITA' ? '(Entrega)' : '(Coleta)';
    const phaseLabel = newStatus === 'B2B_ENTREGA_ACEITA' ? 'B2B-2' : 'B2B-1';
    
    // Registrar no histórico de status usando b2b_shipment_id
    const statusDescription = newStatus === 'B2B_ENTREGA_ACEITA' 
      ? 'Entrega aceita pelo motorista (B2B-2)'
      : 'Coleta aceita pelo motorista (B2B-1)';
    
    const { error: historyError } = await supabase
      .from('shipment_status_history')
      .insert({
        b2b_shipment_id: shipmentId,
        motorista_id: motoristaId,
        status: newStatus,
        status_description: statusDescription,
        observacoes: `Remessa ${b2bCheck.tracking_code} ${phase} aceita pelo motorista.`
      });
    
    if (historyError) {
      console.warn('⚠️ Erro ao registrar histórico B2B:', historyError);
      // Não falhar por isso
    }
    
    console.log(`✅ Remessa B2B aceita ${phase}:`, b2bCheck.tracking_code);
    return { success: true, message: `Remessa B2B ${b2bCheck.tracking_code} ${phase} aceita com sucesso!` };
  }
  
  // Remessa normal - usar RPC
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