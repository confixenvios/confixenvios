import { apiClient } from './apiClient';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ContactAddress {
  id: string;
  cep: string;
  street: string;
  number: string;
  complement: string | null;
  district: string;
  city: string;
  state: string;
  reference: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  user_id: string;
  address_id: string;
  contact_type: 'sender' | 'recipient' | 'pickup';
  name: string | null;
  document: string | null;
  document_type: string | null;
  state_registration_number: string | null;
  phone: string | null;
  email: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  address: ContactAddress;
}

export interface CreateContactRequest {
  contact_type: 'sender' | 'recipient' | 'pickup';
  name?: string;
  document?: string;
  document_type?: string;
  state_registration_number?: string;
  phone?: string;
  email?: string;
  is_default?: boolean;
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  district?: string;
  city?: string;
  state?: string;
  reference?: string;
}

export interface UpdateContactRequest extends Partial<CreateContactRequest> {}

// ─── Service ────────────────────────────────────────────────────────────────

export const contactsService = {
  list(userId?: string) {
    const query = userId ? `?user_id=${userId}` : '';
    return apiClient.get<Contact[]>(`/contacts${query}`);
  },

  getById(id: string) {
    return apiClient.get<Contact>(`/contacts/${id}`);
  },

  create(data: CreateContactRequest) {
    return apiClient.post<Contact>('/contacts', data);
  },

  update(id: string, data: UpdateContactRequest) {
    return apiClient.patch<Contact>(`/contacts/${id}`, data);
  },

  delete(id: string) {
    return apiClient.delete(`/contacts/${id}`);
  },
};
