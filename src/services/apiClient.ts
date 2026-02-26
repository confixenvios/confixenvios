const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  setToken(token: string) {
    localStorage.setItem('access_token', token);
  }

  clearToken() {
    localStorage.removeItem('access_token');
  }

  hasToken(): boolean {
    return !!this.getToken();
  }

  /** Decode JWT payload without verifying signature */
  decodeToken(): JwtPayload | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload) as JwtPayload;
    } catch {
      return null;
    }
  }

  isTokenExpired(): boolean {
    const payload = this.decodeToken();
    if (!payload?.exp) return true;
    return Date.now() >= payload.exp * 1000;
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { skipAuth = false, headers: customHeaders, ...rest } = options;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(customHeaders as Record<string, string>),
    };

    if (!skipAuth) {
      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...rest,
      headers,
    });

    // Handle 401 globally — clear token and redirect
    if (response.status === 401 && !skipAuth) {
      this.clearToken();
      window.location.replace('/auth');
      throw new Error('Sessão expirada. Faça login novamente.');
    }

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const message =
        typeof body.message === 'string'
          ? body.message
          : Array.isArray(body.message)
          ? body.message.join(', ')
          : `Erro ${response.status}`;
      throw new ApiError(message, response.status, body);
    }

    return response.json() as Promise<T>;
  }

  get<T>(endpoint: string, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) });
  }

  patch<T>(endpoint: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(body) });
  }

  delete<T>(endpoint: string, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export interface JwtPayload {
  sub: string;
  email: string;
  first_name: string;
  status: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface LoginResponse {
  access_token: string;
}

export interface RegisterRequest {
  role: 'customer' | 'driver';
  email: string;
  password: string;
  first_name: string;
  last_name?: string;
  phone?: string;
  document: string;
  document_type: 'pf' | 'pj';
  state_registration_number?: string;
  username?: string;
}

export interface RegisterResponse {
  id: string;
  email: string;
  username?: string;
  first_name: string;
  last_name?: string;
  phone?: string;
  document: string;
  state_registration_number?: string;
  status: string;
  role: string;
  message: string;
}

export interface UpdateProfileRequest {
  id?: string;
  password?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  document?: string;
  username?: string;
  inscricao_estadual?: string;
}

export interface UpdateProfileResponse {
  id: string;
  email: string;
  username?: string;
  first_name: string;
  last_name?: string;
  phone?: string;
  document: string;
  state_registration_number?: string;
  status: string;
  message: string;
}

export const apiClient = new ApiClient(API_BASE_URL);
