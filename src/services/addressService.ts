// Secure address operations with session management
import { supabase } from '@/integrations/supabase/client';
import { SessionManager } from '@/utils/sessionManager';

interface AddressData {
  address_type: 'sender' | 'recipient';
  user_id?: string | null;
  name: string;
  document: string;
  phone: string;
  email: string;
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  reference?: string;
}

/**
 * Create address with proper session management for anonymous users
 */
export async function createAddress(addressData: AddressData) {
  const sessionId = SessionManager.getSessionId();
  
  // Add session_id for anonymous users
  const dataWithSession = {
    ...addressData,
    session_id: addressData.user_id ? null : sessionId
  };

  // Create a custom request with session headers
  const requestInit = {
    headers: {
      'x-session-id': sessionId,
      'Content-Type': 'application/json'
    }
  };

  const { data, error } = await supabase
    .from('addresses')
    .insert(dataWithSession)
    .select()
    .single();

  if (error) {
    console.error('Address creation error:', error);
    throw new Error(`Erro ao salvar endereço: ${error.message}`);
  }

  return data;
}

/**
 * Get addresses for current user/session
 */
export async function getAddresses(userId?: string) {
  if (userId) {
    // Authenticated user - get by user_id
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Address fetch error:', error);
      throw new Error(`Erro ao buscar endereços: ${error.message}`);
    }

    return data || [];
  } else {
    // Anonymous user - get by session_id
    const sessionId = SessionManager.getSessionId();
    
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('session_id', sessionId)
      .is('user_id', null);

    if (error) {
      console.error('Address fetch error:', error);
      throw new Error(`Erro ao buscar endereços: ${error.message}`);
    }

    return data || [];
  }
}

/**
 * Update address with session validation
 */
export async function updateAddress(addressId: string, updates: Partial<AddressData>, userId?: string) {
  const sessionId = SessionManager.getSessionId();

  let query = supabase
    .from('addresses')
    .update(updates)
    .eq('id', addressId);

  if (userId) {
    query = query.eq('user_id', userId);
  } else {
    query = query.eq('session_id', sessionId).is('user_id', null);
  }

  const { data, error } = await query.select().single();

  if (error) {
    console.error('Address update error:', error);
    throw new Error(`Erro ao atualizar endereço: ${error.message}`);
  }

  return data;
}