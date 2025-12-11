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
  observations?: string | null;
  is_volume?: boolean;
  parent_shipment_id?: string | null;
  volume_eti_code?: string | null;
  volume_number?: number | null;
  volume_weight?: number | null;
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
  motorista_coleta?: {
    nome: string;
    telefone: string;
  };
  motorista_entrega?: {
    nome: string;
    telefone: string;
  };
  vehicle_type?: string;
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

// ===== NOVO: Interface de Visibilidade atualizada para 3 fases =====
export interface MotoristaVisibilidade {
  ve_convencional: boolean;
  ve_b2b_0: boolean;  // B2B-0: Coleta externa
  ve_b2b_2: boolean;  // B2B-2: Entrega final (volumes)
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

  // Buscar remessas B2B com motorista (remessas pai, não volumes)
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
      is_volume,
      parent_shipment_id,
      volume_eti_code,
      volume_number,
      volume_weight,
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

  // Buscar histórico de status B2B para identificar motoristas de coleta e entrega
  const b2bIds = (b2bData || []).map((s: any) => s.id);
  let b2bStatusHistory: Record<string, { motorista_coleta?: { nome: string; telefone: string }; motorista_entrega?: { nome: string; telefone: string } }> = {};
  
  if (b2bIds.length > 0) {
    const { data: historyData } = await supabase
      .from('shipment_status_history')
      .select(`
        b2b_shipment_id,
        status,
        motorista_id,
        motoristas(nome, telefone)
      `)
      .in('b2b_shipment_id', b2bIds)
      .in('status', ['B2B_COLETA_ACEITA', 'B2B_NO_CD', 'B2B_VOLUME_ACEITO', 'ENTREGUE']);
    
    if (historyData) {
      // Processar histórico para identificar motoristas de coleta e entrega
      historyData.forEach((record: any) => {
        const shipmentId = record.b2b_shipment_id;
        if (!b2bStatusHistory[shipmentId]) {
          b2bStatusHistory[shipmentId] = {};
        }
        
        const motoristaInfo = record.motoristas;
        if (motoristaInfo) {
          // B2B_COLETA_ACEITA ou B2B_NO_CD = motorista de coleta (B2B-0)
          if (record.status === 'B2B_COLETA_ACEITA' || record.status === 'B2B_NO_CD') {
            if (!b2bStatusHistory[shipmentId].motorista_coleta) {
              b2bStatusHistory[shipmentId].motorista_coleta = {
                nome: motoristaInfo.nome,
                telefone: motoristaInfo.telefone
              };
            }
          }
          // B2B_VOLUME_ACEITO ou ENTREGUE = motorista de entrega (B2B-2)
          if (record.status === 'B2B_VOLUME_ACEITO' || record.status === 'ENTREGUE') {
            b2bStatusHistory[shipmentId].motorista_entrega = {
              nome: motoristaInfo.nome,
              telefone: motoristaInfo.telefone
            };
          }
        }
      });
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

    // Extrair vehicle_type do observations
    let vehicleType: string | undefined = undefined;
    let observations: any = null;
    if (b2bShipment.observations) {
      try {
        observations = typeof b2bShipment.observations === 'string' 
          ? JSON.parse(b2bShipment.observations) 
          : b2bShipment.observations;
        vehicleType = observations.vehicle_type;
      } catch (e) {
        console.warn('Erro ao parsear observations:', e);
      }
    }

    // Buscar motoristas de coleta/entrega do histórico
    const historyMotoristas = b2bStatusHistory[b2bShipment.id] || {};

    return {
      id: b2bShipment.id,
      tracking_code: b2bShipment.tracking_code || '',
      status: b2bShipment.status,
      weight: b2bShipment.volume_weight || 0,
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
      client_name: b2bShipment.is_volume 
        ? `Volume ${b2bShipment.volume_number} - ${b2bShipment.volume_eti_code}` 
        : `${b2bClient?.company_name || 'Cliente B2B'} (Expresso)`,
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
      motoristas: motoristaData,
      motorista_coleta: historyMotoristas.motorista_coleta,
      motorista_entrega: historyMotoristas.motorista_entrega,
      vehicle_type: vehicleType,
      is_volume: b2bShipment.is_volume,
      parent_shipment_id: b2bShipment.parent_shipment_id,
      volume_eti_code: b2bShipment.volume_eti_code,
      volume_number: b2bShipment.volume_number,
      volume_weight: b2bShipment.volume_weight
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
  
  // Buscar remessas B2B atribuídas atualmente ao motorista (incluindo volumes)
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
      is_volume,
      parent_shipment_id,
      volume_eti_code,
      volume_number,
      volume_weight,
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

  // Buscar IDs de remessas B2B que o motorista participou no histórico
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

  console.log('📦 Remessas B2B do histórico:', historyB2BIds.length);

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
        is_volume,
        parent_shipment_id,
        volume_eti_code,
        volume_number,
        volume_weight,
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

    // Marcar se é remessa do histórico
    const isFromHistory = historyB2BIds.includes(b2b.id);

    // Construir pickup_address para B2B
    const pickupAddress = observationsData.pickup_address || observationsData.pickupAddress;
    
    // Para B2B, sender_address deve ser o pickup_address
    const senderAddress = pickupAddress ? {
      name: pickupAddress.name || pickupAddress.contact_name || client?.company_name || 'Cliente B2B',
      street: pickupAddress.street || '',
      number: pickupAddress.number || '',
      neighborhood: pickupAddress.neighborhood || '',
      city: pickupAddress.city || '',
      state: pickupAddress.state || '',
      cep: pickupAddress.cep || '',
      complement: pickupAddress.complement || '',
      reference: pickupAddress.reference || '',
      phone: pickupAddress.contact_phone || pickupAddress.phone || ''
    } : {
      name: client?.company_name || 'Cliente B2B',
      street: client?.default_pickup_street || '',
      number: client?.default_pickup_number || '',
      neighborhood: client?.default_pickup_neighborhood || '',
      city: client?.default_pickup_city || '',
      state: client?.default_pickup_state || '',
      cep: client?.default_pickup_cep || '',
      complement: client?.default_pickup_complement || '',
      reference: ''
    };
    
    return {
      id: b2b.id,
      tracking_code: b2b.tracking_code,
      status: b2b.status,
      created_at: b2b.created_at,
      weight: b2b.volume_weight || observationsData.total_weight || 0,
      length: 0,
      width: 0,
      height: 0,
      format: 'box',
      selected_option: 'b2b_express',
      pickup_option: 'pickup',
      observations: b2b.observations,
      is_volume: b2b.is_volume,
      parent_shipment_id: b2b.parent_shipment_id,
      volume_eti_code: b2b.volume_eti_code,
      volume_number: b2b.volume_number,
      volume_weight: b2b.volume_weight,
      quote_data: {
        observations: b2b.observations,
        parsedObservations: observationsData,
        merchandiseDetails: {
          volumes: observationsData.volume_weights?.map((w: number, i: number) => ({
            weight: w,
            length: 0,
            width: 0,
            height: 0,
            merchandise_type: 'Mercadoria'
          })) || []
        },
        volumeAddresses: observationsData.volume_addresses || observationsData.volumeAddresses || [],
        isFromHistory
      },
      payment_data: null,
      label_pdf_url: null,
      cte_key: null,
      motorista_id: isFromHistory ? motoristaId : b2b.motorista_id,
      sender_address: senderAddress,
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

/**
 * Buscar configurações de visibilidade do motorista (ATUALIZADO para 3 fases)
 * Suporta tanto colunas antigas (ve_b2b_coleta, ve_b2b_entrega) quanto novas (ve_b2b_0, ve_b2b_2)
 */
export const getMotoristaVisibilidade = async (motoristaEmail: string): Promise<MotoristaVisibilidade> => {
  // Tenta buscar com colunas antigas primeiro (compatibilidade)
  const { data, error } = await supabase
    .from('motoristas')
    .select('ve_convencional, ve_b2b_coleta, ve_b2b_entrega')
    .eq('email', motoristaEmail)
    .single();

  if (error || !data) {
    console.warn('⚠️ Não foi possível buscar visibilidade do motorista, usando padrão');
    return { ve_convencional: true, ve_b2b_0: false, ve_b2b_2: false };
  }

  // Mapeia colunas antigas para novo formato
  return {
    ve_convencional: (data as any).ve_convencional ?? true,
    ve_b2b_0: (data as any).ve_b2b_coleta ?? (data as any).ve_b2b_0 ?? false,
    ve_b2b_2: (data as any).ve_b2b_entrega ?? (data as any).ve_b2b_2 ?? false
  };
};

/**
 * Serviço para buscar remessas disponíveis para motoristas (normais + B2B)
 * ATUALIZADO: Novo fluxo de 3 fases (B2B-0, B2B-1, B2B-2)
 * 
 * B2B-0: Coleta externa - motoristas com ve_b2b_0 veem remessas B2B_COLETA_PENDENTE
 * B2B-1: Processamento interno - NÃO aparece para motoristas
 * B2B-2: Entrega final - motoristas com ve_b2b_2 buscam volumes por código ETI
 */
export const getAvailableShipments = async (visibilidade?: MotoristaVisibilidade): Promise<BaseShipment[]> => {
  console.log('📋 Iniciando busca por remessas disponíveis');
  console.log('📋 Visibilidade recebida:', JSON.stringify(visibilidade));
  
  try {
    let remessasNormais: BaseShipment[] = [];
    let remessasB2B0: BaseShipment[] = [];
    // B2B-2 não lista automaticamente - motorista precisa buscar por ETI

    // Se não tiver visibilidade definida, carrega convencionais apenas
    const loadConvencional = visibilidade?.ve_convencional ?? true;
    const loadB2B0 = visibilidade?.ve_b2b_0 ?? false;
    // B2B-2 não carrega listagem - é busca ativa por ETI
    
    console.log('📋 Flags de carregamento: Conv=', loadConvencional, ', B2B-0=', loadB2B0);

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

    // Buscar remessas B2B-0 (Fase de Coleta - status B2B_COLETA_PENDENTE)
    if (loadB2B0) {
      console.log('📦 Buscando B2B-0 (coleta) com status B2B_COLETA_PENDENTE...');
      
      const { data: b2b0Data, error: b2b0Error } = await supabase
        .from('b2b_shipments')
        .select(`
          id, tracking_code, status, created_at, updated_at,
          recipient_name, recipient_phone, recipient_cep, recipient_street,
          recipient_number, recipient_complement, recipient_neighborhood,
          recipient_city, recipient_state, observations, package_type,
          volume_count, delivery_type, delivery_date, b2b_client_id,
          is_volume, parent_shipment_id,
          b2b_clients(company_name, email, phone, cnpj,
            default_pickup_cep, default_pickup_street, default_pickup_number,
            default_pickup_complement, default_pickup_neighborhood,
            default_pickup_city, default_pickup_state)
        `)
        .eq('status', 'B2B_COLETA_PENDENTE')
        .is('motorista_id', null)
        .eq('is_volume', false)  // Apenas remessas pai, não volumes
        .order('created_at', { ascending: false });

      if (b2b0Error) {
        console.error('❌ Erro ao buscar B2B-0:', b2b0Error);
      }

      console.log('📦 Remessas B2B-0 (coleta) encontradas:', b2b0Data?.length || 0);
      remessasB2B0 = (b2b0Data || []).map(b2b => normalizeB2BShipment(b2b, 'B2B-0'));
    }
    
    // Combinar todas as remessas e ordenar por data
    const allShipments = [...remessasNormais, ...remessasB2B0];
    allShipments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    console.log('✅ Total de remessas disponíveis:', allShipments.length, 
      '(Conv:', remessasNormais.length, 
      ', B2B-0:', remessasB2B0.length, ')');
    return allShipments;
    
  } catch (error) {
    console.error('❌ Erro completo ao buscar remessas disponíveis:', error);
    throw error;
  }
};

/**
 * NOVO: Buscar volume B2B-2 por código ETI (últimos 4 dígitos)
 */
export const searchVolumeByEtiCode = async (etiCodeDigits: string): Promise<BaseShipment | null> => {
  console.log('🔍 Buscando volume por ETI:', etiCodeDigits);
  
  const fullEtiCode = `ETI-${etiCodeDigits.padStart(4, '0')}`;
  
  const { data, error } = await supabase
    .from('b2b_shipments')
    .select(`
      id, tracking_code, status, created_at, updated_at,
      recipient_name, recipient_phone, recipient_cep, recipient_street,
      recipient_number, recipient_complement, recipient_neighborhood,
      recipient_city, recipient_state, observations, package_type,
      volume_count, delivery_type, delivery_date, b2b_client_id,
      is_volume, parent_shipment_id, volume_eti_code, volume_number, volume_weight,
      b2b_clients(company_name, email, phone, cnpj)
    `)
    .eq('is_volume', true)
    .eq('volume_eti_code', fullEtiCode)
    .eq('status', 'B2B_VOLUME_DISPONIVEL')
    .is('motorista_id', null)
    .single();

  if (error || !data) {
    console.log('❌ Volume não encontrado ou já atribuído:', error?.message);
    return null;
  }

  console.log('✅ Volume encontrado:', data.id);
  return normalizeB2BShipment(data, 'B2B-2');
};

/**
 * NOVO: Aceitar volume B2B-2 (vincula ao motorista)
 */
export const acceptB2BVolume = async (volumeId: string, motoristaId: string): Promise<{ success: boolean; error?: string }> => {
  console.log('🚚 Aceitando volume B2B-2:', volumeId, 'para motorista:', motoristaId);
  
  const { error } = await supabase
    .from('b2b_shipments')
    .update({ 
      motorista_id: motoristaId,
      status: 'B2B_VOLUME_ACEITO'
    })
    .eq('id', volumeId)
    .eq('is_volume', true)
    .is('motorista_id', null);

  if (error) {
    console.error('❌ Erro ao aceitar volume:', error);
    return { success: false, error: error.message };
  }

  // Registrar no histórico
  await supabase.from('shipment_status_history').insert({
    b2b_shipment_id: volumeId,
    motorista_id: motoristaId,
    status: 'B2B_VOLUME_ACEITO',
    observacoes: 'Volume aceito pelo motorista B2B-2'
  });

  console.log('✅ Volume aceito com sucesso');
  return { success: true };
};

/**
 * Normaliza os dados de uma remessa para garantir consistência
 */
function normalizeShipmentData(shipment: any): BaseShipment {
  // Tentar usar dados originais do formulário (quote_data.addressData) primeiro
  let senderAddress = shipment.sender_address || createEmptyAddress();
  let recipientAddress = shipment.recipient_address || createEmptyAddress();
  
  // Se existem dados originais no quote_data, usar esses dados
  if (shipment.quote_data?.addressData) {
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
  
  return {
    id: shipment.id,
    tracking_code: shipment.tracking_code,
    status: shipment.status,
    weight: shipment.weight,
    length: shipment.length,
    width: shipment.width,
    height: shipment.height,
    format: shipment.format,
    selected_option: shipment.selected_option,
    pickup_option: shipment.pickup_option,
    quote_data: shipment.quote_data,
    payment_data: shipment.payment_data,
    created_at: shipment.created_at,
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
 * Cria um endereço vazio padrão
 */
function createEmptyAddress(): ShipmentAddress {
  return {
    name: 'Não informado',
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '',
    cep: '',
    complement: '',
    reference: ''
  };
}

/**
 * Normaliza remessa B2B para formato padrão
 */
function normalizeB2BShipment(b2b: any, phase: 'B2B-0' | 'B2B-2'): BaseShipment {
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

  const pickupAddress = observationsData.pickup_address || observationsData.pickupAddress;
  
  const senderAddress = pickupAddress ? {
    name: pickupAddress.name || pickupAddress.contact_name || client?.company_name || 'Cliente B2B',
    street: pickupAddress.street || '',
    number: pickupAddress.number || '',
    neighborhood: pickupAddress.neighborhood || '',
    city: pickupAddress.city || '',
    state: pickupAddress.state || '',
    cep: pickupAddress.cep || '',
    complement: pickupAddress.complement || '',
    reference: pickupAddress.reference || '',
    phone: pickupAddress.contact_phone || pickupAddress.phone || ''
  } : {
    name: client?.company_name || 'Cliente B2B',
    street: client?.default_pickup_street || '',
    number: client?.default_pickup_number || '',
    neighborhood: client?.default_pickup_neighborhood || '',
    city: client?.default_pickup_city || '',
    state: client?.default_pickup_state || '',
    cep: client?.default_pickup_cep || '',
    complement: client?.default_pickup_complement || '',
    reference: ''
  };

  return {
    id: b2b.id,
    tracking_code: b2b.tracking_code || '',
    status: b2b.status,
    created_at: b2b.created_at,
    weight: b2b.volume_weight || observationsData.total_weight || 0,
    length: 0,
    width: 0,
    height: 0,
    format: b2b.package_type || 'caixa',
    selected_option: 'b2b_express',
    pickup_option: 'pickup',
    observations: b2b.observations,
    is_volume: b2b.is_volume || false,
    parent_shipment_id: b2b.parent_shipment_id,
    volume_eti_code: b2b.volume_eti_code,
    volume_number: b2b.volume_number,
    volume_weight: b2b.volume_weight,
    quote_data: {
      observations: b2b.observations,
      parsedObservations: observationsData,
      volume_count: b2b.volume_count,
      merchandiseDetails: {
        volumes: observationsData.volume_weights?.map((w: number, i: number) => ({
          weight: w,
          length: 0,
          width: 0,
          height: 0,
          merchandise_type: 'Mercadoria'
        })) || []
      },
      volumeAddresses: observationsData.volume_addresses || observationsData.volumeAddresses || [],
      b2bPhase: phase
    },
    payment_data: null,
    label_pdf_url: null,
    cte_key: null,
    sender_address: senderAddress,
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
}

/**
 * Aceita uma remessa (convencional ou B2B-0)
 */
export const acceptShipment = async (shipmentId: string, motoristaId: string): Promise<any> => {
  console.log('🚚 Aceitando remessa:', shipmentId, 'para motorista:', motoristaId);
  
  // Verificar se é B2B ou convencional
  const { data: b2bShipment } = await supabase
    .from('b2b_shipments')
    .select('id, status, is_volume')
    .eq('id', shipmentId)
    .maybeSingle();
  
  if (b2bShipment) {
    // É uma remessa B2B-0 (coleta)
    const { error } = await supabase
      .from('b2b_shipments')
      .update({ 
        motorista_id: motoristaId,
        status: 'B2B_COLETA_ACEITA'  // Novo status para B2B-0 aceita
      })
      .eq('id', shipmentId)
      .eq('status', 'B2B_COLETA_PENDENTE');

    if (error) {
      console.error('❌ Erro ao aceitar B2B-0:', error);
      return { success: false, error: error.message };
    }

    // Registrar no histórico
    await supabase.from('shipment_status_history').insert({
      b2b_shipment_id: shipmentId,
      motorista_id: motoristaId,
      status: 'B2B_COLETA_ACEITA',
      observacoes: 'Remessa B2B-0 aceita pelo motorista de coleta'
    });

    console.log('✅ Remessa B2B-0 aceita com sucesso');
    return { success: true, message: 'Remessa B2B aceita com sucesso!' };
  }
  
  // É uma remessa convencional
  const { data, error } = await supabase
    .rpc('accept_shipment', { 
      p_shipment_id: shipmentId,
      p_motorista_uuid: motoristaId
    });

  if (error) {
    console.error('❌ Erro ao aceitar remessa convencional:', error);
    return { success: false, error: error.message };
  }

  return data;
};

/**
 * Atualiza status de uma remessa
 */
export const updateShipmentStatus = async (
  shipmentId: string, 
  newStatus: string, 
  motoristaId?: string,
  observacoes?: string
): Promise<{ success: boolean; error?: string }> => {
  console.log('📊 Atualizando status da remessa:', shipmentId, 'para:', newStatus);
  
  // Verificar se é B2B ou convencional
  const { data: b2bShipment } = await supabase
    .from('b2b_shipments')
    .select('id, is_volume, parent_shipment_id')
    .eq('id', shipmentId)
    .maybeSingle();
  
  if (b2bShipment) {
    // É uma remessa B2B
    const { error } = await supabase
      .from('b2b_shipments')
      .update({ status: newStatus })
      .eq('id', shipmentId);

    if (error) {
      console.error('❌ Erro ao atualizar status B2B:', error);
      return { success: false, error: error.message };
    }

    // Registrar no histórico
    await supabase.from('shipment_status_history').insert({
      b2b_shipment_id: shipmentId,
      motorista_id: motoristaId,
      status: newStatus,
      observacoes: observacoes || `Status atualizado para ${newStatus}`
    });

    // Se é um volume e foi entregue, verificar se todos os volumes foram entregues
    if (b2bShipment.is_volume && b2bShipment.parent_shipment_id && newStatus === 'ENTREGUE') {
      await checkAndUpdateParentShipmentStatus(b2bShipment.parent_shipment_id);
    }

    return { success: true };
  }
  
  // É uma remessa convencional
  const { error } = await supabase
    .from('shipments')
    .update({ status: newStatus })
    .eq('id', shipmentId);

  if (error) {
    console.error('❌ Erro ao atualizar status convencional:', error);
    return { success: false, error: error.message };
  }

  // Registrar no histórico
  await supabase.from('shipment_status_history').insert({
    shipment_id: shipmentId,
    motorista_id: motoristaId,
    status: newStatus,
    observacoes: observacoes || `Status atualizado para ${newStatus}`
  });

  return { success: true };
};

/**
 * Verifica se todos os volumes foram entregues e atualiza a remessa pai
 */
async function checkAndUpdateParentShipmentStatus(parentId: string): Promise<void> {
  console.log('🔍 Verificando status de todos os volumes da remessa pai:', parentId);
  
  const { data: volumes } = await supabase
    .from('b2b_shipments')
    .select('id, status')
    .eq('parent_shipment_id', parentId)
    .eq('is_volume', true);

  if (!volumes || volumes.length === 0) {
    console.log('⚠️ Nenhum volume encontrado para a remessa pai');
    return;
  }

  const allDelivered = volumes.every(v => v.status === 'ENTREGUE');
  
  if (allDelivered) {
    console.log('✅ Todos os volumes foram entregues! Atualizando remessa pai...');
    
    await supabase
      .from('b2b_shipments')
      .update({ status: 'ENTREGUE' })
      .eq('id', parentId);

    await supabase.from('shipment_status_history').insert({
      b2b_shipment_id: parentId,
      status: 'ENTREGUE',
      observacoes: 'Todos os volumes foram entregues - remessa finalizada automaticamente'
    });
  } else {
    const delivered = volumes.filter(v => v.status === 'ENTREGUE').length;
    console.log(`📦 Volumes entregues: ${delivered}/${volumes.length}`);
  }
}
