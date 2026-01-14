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
  carrier_order_id?: string | null;
  carrier_barcode?: string | null;
  sender_address: ShipmentAddress;
  recipient_address: ShipmentAddress;
  pricing_table_name?: string;
  pricing_table_id?: string;
  document_type?: string;
  observations?: string | null;
  eti_code?: string | null;
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

// ===== Interface de Visibilidade do Motorista =====
export interface MotoristaVisibilidade {
  ve_convencional: boolean;
  ve_b2b_coleta: boolean;
  ve_b2b_entrega: boolean;
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
  
  // Buscar remessas normais (sem join com motoristas - nova tabela não tem relação direta)
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
      carrier_order_id,
      carrier_barcode,
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
      )
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

  // Buscar motoristas para as remessas normais
  const motoristaIds = (data || [])
    .map((s: any) => s.motorista_id)
    .filter((id: string | null) => id !== null);

  let motoristasMap: Record<string, { nome: string; telefone: string }> = {};
  
  if (motoristaIds.length > 0) {
    const { data: motoristasData } = await supabase
      .from('motoristas')
      .select('id, nome, telefone')
      .in('id', motoristaIds);
    
    if (motoristasData) {
      motoristasMap = motoristasData.reduce((acc: any, m: any) => {
        acc[m.id] = { nome: m.nome, telefone: m.telefone };
        return acc;
      }, {});
    }
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
      observations,
      total_volumes,
      total_weight,
      total_price,
      delivery_date,
      vehicle_type,
      motorista_coleta_id,
      motorista_entrega_id,
      b2b_client_id,
      pickup_address_id,
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
  const shipmentsWithDetails: AdminShipment[] = await Promise.all(
    (data || []).map(async (shipment: any) => {
      let clientProfile = null;
      if (shipment.user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name, email')
          .eq('id', shipment.user_id)
          .maybeSingle();
        clientProfile = profile;
      }

      const motoristaData = shipment.motorista_id 
        ? motoristasMap[shipment.motorista_id] 
        : undefined;

      const result = {
        ...normalizeShipmentData(shipment),
        client_name: clientProfile 
          ? `${clientProfile.first_name || ''} ${clientProfile.last_name || ''}`.trim() || clientProfile.email || 'Cliente Anônimo'
          : 'Cliente Anônimo',
        motoristas: motoristaData
      };

      return result;
    })
  );

  // Buscar motoristas para B2B
  const b2bMotoristaIds = [
    ...(b2bData || []).map((s: any) => s.motorista_coleta_id),
    ...(b2bData || []).map((s: any) => s.motorista_entrega_id)
  ].filter((id: string | null) => id !== null);
  
  let b2bMotoristasMap: Record<string, { nome: string; telefone: string }> = {};
  
  if (b2bMotoristaIds.length > 0) {
    const { data: motoristasData } = await supabase
      .from('motoristas')
      .select('id, nome, telefone')
      .in('id', b2bMotoristaIds);
    
    if (motoristasData) {
      b2bMotoristasMap = motoristasData.reduce((acc: any, m: any) => {
        acc[m.id] = { nome: m.nome, telefone: m.telefone };
        return acc;
      }, {});
    }
  }

  // Normalizar remessas B2B para o mesmo formato
  const b2bShipmentsWithDetails: AdminShipment[] = (b2bData || []).map((b2bShipment: any) => {
    const b2bClient = Array.isArray(b2bShipment.b2b_clients) 
      ? b2bShipment.b2b_clients[0] 
      : b2bShipment.b2b_clients;

    const motoristaColeta = b2bShipment.motorista_coleta_id 
      ? b2bMotoristasMap[b2bShipment.motorista_coleta_id] 
      : undefined;

    const motoristaEntrega = b2bShipment.motorista_entrega_id 
      ? b2bMotoristasMap[b2bShipment.motorista_entrega_id] 
      : undefined;

    return {
      id: b2bShipment.id,
      tracking_code: b2bShipment.tracking_code || '',
      status: b2bShipment.status,
      weight: b2bShipment.total_weight || 0,
      length: 0,
      width: 0,
      height: 0,
      format: 'caixa',
      selected_option: 'b2b_express',
      pickup_option: 'pickup',
      quote_data: {
        observations: b2bShipment.observations,
        volume_count: b2bShipment.total_volumes,
        delivery_date: b2bShipment.delivery_date
      },
      payment_data: null,
      created_at: b2bShipment.created_at,
      label_pdf_url: null,
      cte_key: null,
      user_id: undefined,
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
        complement: undefined,
        reference: undefined
      },
      recipient_address: {
        name: 'Múltiplos Volumes',
        street: '',
        number: '',
        neighborhood: '',
        city: '',
        state: '',
        cep: '',
        complement: undefined,
        reference: undefined
      },
      motoristas: motoristaColeta || motoristaEntrega,
      motorista_coleta: motoristaColeta,
      motorista_entrega: motoristaEntrega,
      vehicle_type: b2bShipment.vehicle_type
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
  
  // Buscar volumes B2B onde o motorista é coleta ou entrega
  const { data: b2bVolumes, error: b2bError } = await supabase
    .from('b2b_volumes')
    .select(`
      id,
      eti_code,
      volume_number,
      weight,
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
      motorista_coleta_id,
      motorista_entrega_id,
      b2b_shipment_id,
      b2b_shipments(
        id,
        tracking_code,
        delivery_date,
        observations,
        pickup_address_id,
        b2b_clients(company_name, email, phone, cnpj)
      )
    `)
    .or(`motorista_coleta_id.eq.${motoristaId},motorista_entrega_id.eq.${motoristaId}`)
    .order('created_at', { ascending: false });

  if (b2bError) {
    console.error('❌ Erro ao buscar volumes B2B do motorista:', b2bError);
  }

  console.log('📦 Volumes B2B do motorista:', b2bVolumes?.length || 0);

  // Processar remessas normais
  const normalShipments: MotoristaShipment[] = (normalData || []).map((item: any) => ({
    ...item,
    sender_address: item.sender_address || createEmptyAddress(),
    recipient_address: item.recipient_address || createEmptyAddress(),
    motorista_id: motoristaId
  }));

  // Processar volumes B2B
  const b2bShipments: MotoristaShipment[] = (b2bVolumes || []).map((volume: any) => {
    const shipment = volume.b2b_shipments;
    const client = shipment?.b2b_clients;
    
    return {
      id: volume.id,
      tracking_code: `${shipment?.tracking_code || 'B2B'}-V${volume.volume_number}`,
      status: volume.status,
      created_at: volume.created_at,
      weight: volume.weight || 0,
      length: 0,
      width: 0,
      height: 0,
      format: 'box',
      selected_option: 'b2b_express',
      pickup_option: 'pickup',
      eti_code: volume.eti_code,
      quote_data: {
        observations: shipment?.observations,
        delivery_date: shipment?.delivery_date
      },
      payment_data: null,
      label_pdf_url: null,
      cte_key: null,
      motorista_id: motoristaId,
      sender_address: {
        name: client?.company_name || 'Cliente B2B',
        street: '',
        number: '',
        neighborhood: '',
        city: '',
        state: '',
        cep: ''
      },
      recipient_address: {
        name: volume.recipient_name || 'Destinatário',
        street: volume.recipient_street || '',
        number: volume.recipient_number || '',
        neighborhood: volume.recipient_neighborhood || '',
        city: volume.recipient_city || '',
        state: volume.recipient_state || '',
        cep: volume.recipient_cep || '',
        complement: volume.recipient_complement || ''
      }
    };
  });

  const allShipments = [...normalShipments, ...b2bShipments];
  console.log('📦 Total de remessas do motorista:', allShipments.length);
  
  return allShipments;
};

/**
 * Buscar configurações de visibilidade do motorista
 */
export const getMotoristaVisibilidade = async (motoristaUsername: string): Promise<MotoristaVisibilidade> => {
  const { data, error } = await supabase
    .from('motoristas')
    .select('*')
    .eq('username', motoristaUsername)
    .maybeSingle();

  if (error || !data) {
    console.warn('⚠️ Não foi possível buscar visibilidade do motorista, usando padrão');
    return { ve_convencional: true, ve_b2b_coleta: false, ve_b2b_entrega: false };
  }

  // Por enquanto, todos os motoristas ativos podem ver tudo
  return {
    ve_convencional: true,
    ve_b2b_coleta: true,
    ve_b2b_entrega: true
  };
};

/**
 * Buscar remessas disponíveis para motoristas
 */
export const getAvailableShipments = async (visibilidade?: MotoristaVisibilidade): Promise<BaseShipment[]> => {
  console.log('📋 Buscando remessas disponíveis, visibilidade:', JSON.stringify(visibilidade));
  
  try {
    let remessasNormais: BaseShipment[] = [];
    let remessasB2BColeta: BaseShipment[] = [];

    const loadConvencional = visibilidade?.ve_convencional ?? true;
    const loadB2BColeta = visibilidade?.ve_b2b_coleta ?? false;
    
    console.log('📋 Flags: Conv=', loadConvencional, ', B2B Coleta=', loadB2BColeta);

    // Remessas convencionais
    if (loadConvencional) {
      const { data: shipmentsData, error: shipmentsError } = await supabase
        .from('shipments')
        .select('*')
        .is('motorista_id', null)
        .in('status', ['PAYMENT_CONFIRMED', 'PAID', 'PENDING_LABEL', 'LABEL_GENERATED', 'PAGO_AGUARDANDO_ETIQUETA'])
        .order('created_at', { ascending: false });
      
      if (shipmentsError) {
        console.error('❌ Erro remessas normais:', shipmentsError);
      }
      
      console.log('📦 Convencionais:', shipmentsData?.length || 0);
      
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
          
          return normalizeShipmentData({
            ...shipment,
            sender_address: senderAddress || createEmptyAddress(),
            recipient_address: recipientAddress || createEmptyAddress()
          });
        })
      );
    }

    // Remessas B2B para motorista de coleta (volumes PENDENTE)
    if (loadB2BColeta) {
      console.log('📦 Buscando B2B para coleta...');
      
      const { data: b2bData, error: b2bError } = await supabase
        .from('b2b_volumes')
        .select(`
          id, eti_code, volume_number, weight, status, created_at,
          recipient_name, recipient_phone, recipient_cep, recipient_street,
          recipient_number, recipient_complement, recipient_neighborhood,
          recipient_city, recipient_state,
          b2b_shipment_id,
          b2b_shipments(
            id, tracking_code, delivery_date, observations,
            b2b_clients(company_name, email, phone, cnpj)
          )
        `)
        .eq('status', 'AGUARDANDO_ACEITE_COLETA')
        .is('motorista_coleta_id', null)
        .order('created_at', { ascending: false });

      if (b2bError) {
        console.error('❌ Erro B2B coleta:', b2bError);
      }

      console.log('📦 B2B Coleta encontradas:', b2bData?.length || 0);
      remessasB2BColeta = (b2bData || []).map((volume: any) => normalizeB2BVolume(volume));
    }
    
    const allShipments = [...remessasNormais, ...remessasB2BColeta];
    allShipments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    console.log('✅ Total disponíveis:', allShipments.length);
    return allShipments;
    
  } catch (error) {
    console.error('❌ Erro busca disponíveis:', error);
    throw error;
  }
};

/**
 * Buscar volume por código ETI para motorista de entrega
 */
export const searchVolumeByEtiCode = async (etiCodeInput: string): Promise<BaseShipment | null> => {
  console.log('🔍 Buscando volume por ETI:', etiCodeInput);
  
  // Normalizar ETI code
  const fullEtiCode = etiCodeInput.startsWith('ETI-') 
    ? etiCodeInput 
    : `ETI-${etiCodeInput.padStart(4, '0')}`;
  
  const { data, error } = await supabase
    .from('b2b_volumes')
    .select(`
      id, eti_code, volume_number, weight, status, created_at,
      recipient_name, recipient_phone, recipient_cep, recipient_street,
      recipient_number, recipient_complement, recipient_neighborhood,
      recipient_city, recipient_state, motorista_coleta_id, motorista_entrega_id,
      b2b_shipment_id,
      b2b_shipments(
        id, tracking_code, delivery_date, observations,
        b2b_clients(company_name, email, phone, cnpj)
      )
    `)
    .eq('eti_code', fullEtiCode)
    .maybeSingle();

  if (error || !data) {
    console.log('❌ Volume não encontrado:', error?.message);
    return null;
  }

  console.log('✅ Volume encontrado:', data.id, 'Status:', data.status);
  return normalizeB2BVolume(data);
};

/**
 * Aceitar volume para coleta (motorista coleta)
 */
export const acceptB2BVolumeForColeta = async (volumeId: string, motoristaId: string): Promise<{ success: boolean; error?: string }> => {
  console.log('🚚 Aceitando volume para coleta:', volumeId);
  
  const { error } = await supabase
    .from('b2b_volumes')
    .update({ 
      motorista_coleta_id: motoristaId,
      status: 'EM_TRANSITO'
    })
    .eq('id', volumeId)
    .eq('status', 'AGUARDANDO_ACEITE_COLETA');

  if (error) {
    console.error('❌ Erro ao aceitar volume:', error);
    return { success: false, error: error.message };
  }

  // Registrar no histórico
  await supabase.from('b2b_status_history').insert({
    volume_id: volumeId,
    motorista_id: motoristaId,
    status: 'EM_TRANSITO',
    observacoes: 'Volume aceito para coleta'
  });

  return { success: true };
};

/**
 * Aceitar volume para entrega (motorista entrega)
 */
export const acceptB2BVolumeForEntrega = async (volumeId: string, motoristaId: string): Promise<{ success: boolean; error?: string }> => {
  console.log('🚚 Aceitando volume para entrega:', volumeId);
  
  const { error } = await supabase
    .from('b2b_volumes')
    .update({ 
      motorista_entrega_id: motoristaId,
      status: 'EM_ROTA'
    })
    .eq('id', volumeId)
    .in('status', ['NO_CD', 'AGUARDANDO_ENTREGA']);

  if (error) {
    console.error('❌ Erro ao aceitar volume para entrega:', error);
    return { success: false, error: error.message };
  }

  // Registrar no histórico
  await supabase.from('b2b_status_history').insert({
    volume_id: volumeId,
    motorista_id: motoristaId,
    status: 'EM_ROTA',
    observacoes: 'Volume aceito para entrega'
  });

  return { success: true };
};

/**
 * Finalizar entrega de volume B2B
 */
export const finalizarEntregaB2BVolume = async (
  volumeId: string, 
  motoristaId: string, 
  fotoUrl: string
): Promise<{ success: boolean; error?: string }> => {
  console.log('✅ Finalizando entrega do volume:', volumeId);
  
  const { error } = await supabase
    .from('b2b_volumes')
    .update({ 
      status: 'ENTREGUE',
      foto_entrega_url: fotoUrl
    })
    .eq('id', volumeId);

  if (error) {
    console.error('❌ Erro ao finalizar entrega:', error);
    return { success: false, error: error.message };
  }

  // Registrar no histórico
  await supabase.from('b2b_status_history').insert({
    volume_id: volumeId,
    motorista_id: motoristaId,
    status: 'ENTREGUE',
    observacoes: 'Entrega finalizada com comprovante'
  });

  return { success: true };
};

/**
 * Registrar ocorrência em volume B2B
 */
export const registrarOcorrenciaB2B = async (
  volumeId: string,
  motoristaId: string,
  tipoOcorrencia: string,
  observacoes?: string
): Promise<{ success: boolean; error?: string }> => {
  console.log('⚠️ Registrando ocorrência:', volumeId, tipoOcorrencia);
  
  await supabase.from('b2b_status_history').insert({
    volume_id: volumeId,
    motorista_id: motoristaId,
    status: 'OCORRENCIA',
    observacoes: `${tipoOcorrencia}${observacoes ? `: ${observacoes}` : ''}`,
    is_alert: true
  });

  return { success: true };
};

// ===== Helper Functions =====

function createEmptyAddress(): ShipmentAddress {
  return {
    name: '',
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '',
    cep: ''
  };
}

function normalizeShipmentData(item: any): BaseShipment {
  const senderAddress = item.sender_address || createEmptyAddress();
  const recipientAddress = item.recipient_address || createEmptyAddress();
  
  return {
    id: item.id,
    tracking_code: item.tracking_code,
    status: item.status,
    created_at: item.created_at,
    weight: item.weight,
    length: item.length,
    width: item.width,
    height: item.height,
    format: item.format,
    selected_option: item.selected_option,
    pickup_option: item.pickup_option,
    quote_data: item.quote_data,
    payment_data: item.payment_data,
    label_pdf_url: item.label_pdf_url,
    cte_key: item.cte_key,
    carrier_order_id: item.carrier_order_id,
    carrier_barcode: item.carrier_barcode,
    pricing_table_name: item.pricing_table_name,
    pricing_table_id: item.pricing_table_id,
    document_type: item.document_type,
    sender_address: Array.isArray(senderAddress) ? senderAddress[0] : senderAddress,
    recipient_address: Array.isArray(recipientAddress) ? recipientAddress[0] : recipientAddress
  };
}

function normalizeB2BVolume(volume: any): BaseShipment {
  const shipment = volume.b2b_shipments;
  const client = shipment?.b2b_clients;
  
  return {
    id: volume.id,
    tracking_code: `${shipment?.tracking_code || 'B2B'}-V${volume.volume_number}`,
    status: volume.status,
    created_at: volume.created_at,
    weight: volume.weight || 0,
    length: 0,
    width: 0,
    height: 0,
    format: 'box',
    selected_option: 'b2b_express',
    pickup_option: 'pickup',
    eti_code: volume.eti_code,
    quote_data: {
      observations: shipment?.observations,
      delivery_date: shipment?.delivery_date
    },
    payment_data: null,
    label_pdf_url: null,
    cte_key: null,
    sender_address: {
      name: client?.company_name || 'Cliente B2B',
      street: '',
      number: '',
      neighborhood: '',
      city: '',
      state: '',
      cep: ''
    },
    recipient_address: {
      name: volume.recipient_name || 'Destinatário',
      street: volume.recipient_street || '',
      number: volume.recipient_number || '',
      neighborhood: volume.recipient_neighborhood || '',
      city: volume.recipient_city || '',
      state: volume.recipient_state || '',
      cep: volume.recipient_cep || '',
      complement: volume.recipient_complement || ''
    }
  };
}

/**
 * Atualizar status de remessa (convencional ou B2B)
 */
export const updateShipmentStatus = async (
  shipmentId: string,
  newStatus: string,
  motoristaId?: string,
  observacoes?: string
): Promise<{ success: boolean; error?: string }> => {
  console.log('🔄 Atualizando status:', shipmentId, '->', newStatus);
  
  // Primeiro, verificar se é uma remessa B2B ou convencional
  const { data: b2bCheck } = await supabase
    .from('b2b_shipments')
    .select('id')
    .eq('id', shipmentId)
    .maybeSingle();
  
  if (b2bCheck) {
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
