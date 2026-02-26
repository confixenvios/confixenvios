import { apiClient } from './apiClient';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface OrderAddress {
  id: string;
  cep: string;
  street: string;
  number: string;
  complement: string | null;
  district: string;
  city: string;
  state: string;
  reference: string | null;
}

export interface OrderCarrier {
  id: string;
  name: string;
}

export interface Order {
  id: string;
  user_id: string;
  carrier_id: string;
  status: string;
  is_sender_address: boolean;
  pickup_option: 'collect' | 'post';
  address_sender_id: string;
  address_recipient_id: string;
  address_pickup_id: string | null;
  origin: string | null;
  document_type: string | null;
  selected_option: string | null;
  format: string | null;
  pricing_table_name: string | null;
  carrier: OrderCarrier | null;
  address_sender: OrderAddress | null;
  address_recipient: OrderAddress | null;
  address_pickup: OrderAddress | null;
  created_at: string;
  updated_at: string;
}

export interface CreateOrderRequest {
  carrier_id: string;
  is_sender_address: boolean;
  pickup_option: 'collect' | 'post';
  address_sender_id: string;
  address_recipient_id: string;
  address_pickup_id?: string;
  origin?: string;
  document_type?: string;
  selected_option?: string;
  format?: string;
  pricing_table_name?: string;
}

export interface UpdateOrderRequest {
  status?: string;
  is_sender_address?: boolean;
  pickup_option?: 'collect' | 'post';
  address_sender_id?: string;
  address_recipient_id?: string;
  address_pickup_id?: string;
  origin?: string;
  document_type?: string;
  selected_option?: string;
  format?: string;
  pricing_table_name?: string;
}

// ─── Service ────────────────────────────────────────────────────────────────

export const ordersService = {
  list(userId?: string) {
    const query = userId ? `?user_id=${userId}` : '';
    return apiClient.get<Order[]>(`/orders${query}`);
  },

  getById(id: string) {
    return apiClient.get<Order>(`/orders/${id}`);
  },

  create(data: CreateOrderRequest) {
    return apiClient.post<Order>('/orders', data);
  },

  update(id: string, data: UpdateOrderRequest) {
    return apiClient.patch<Order>(`/orders/${id}`, data);
  },
};
