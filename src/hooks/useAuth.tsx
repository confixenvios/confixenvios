import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import {
  apiClient,
  ApiError,
  JwtPayload,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  UpdateProfileRequest,
  UpdateProfileResponse,
} from '@/services/apiClient';

// ─── Types exposed to consumers ──────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  first_name: string;
  role: string;
  status: string;
  created_at?: string;
}

export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  document: string | null;
  inscricao_estadual: string | null;
}

interface UserRole {
  role: string;
}

interface AuthContextType {
  user: AuthUser | null;
  profile: Profile | null;
  userRole: UserRole | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    firstName?: string,
    lastName?: string,
    phone?: string,
    document?: string,
    inscricaoEstadual?: string,
    documentType?: 'pf' | 'pj',
  ) => Promise<{ error: any; needsConfirmation?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: (redirectTo?: string) => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (password: string) => Promise<{ error: any }>;
  updateProfile: (data: UpdateProfileRequest) => Promise<{ error: any }>;
  isAdmin: boolean;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// ─── Helper: build user & profile from JWT ───────────────────────────────────

function buildUserFromToken(payload: JwtPayload): AuthUser {
  return {
    id: payload.sub,
    email: payload.email,
    first_name: payload.first_name,
    role: payload.role,
    status: payload.status,
  };
}

function buildProfileFromToken(payload: JwtPayload): Profile {
  return {
    id: payload.sub,
    first_name: payload.first_name || null,
    last_name: null,
    email: payload.email || null,
    phone: null,
    document: null,
    inscricao_estadual: null,
  };
}

// ─── Provider ────────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  // Hydrate from stored token on mount
  useEffect(() => {
    try {
      if (apiClient.hasToken() && !apiClient.isTokenExpired()) {
        const payload = apiClient.decodeToken();
        if (payload) {
          setUser(buildUserFromToken(payload));
          setProfile(buildProfileFromToken(payload));
          setUserRole({ role: payload.role });
        }
      } else if (apiClient.hasToken()) {
        // Token expired — clear
        apiClient.clearToken();
      }
    } catch {
      apiClient.clearToken();
    }
    setLoading(false);
  }, []);

  // ─── Sign In ──────────────────────────────────────────────────────────────

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const data = await apiClient.post<LoginResponse>(
        '/auth/login',
        { email, password },
        { skipAuth: true },
      );

      apiClient.setToken(data.access_token);
      const payload = apiClient.decodeToken();
      if (payload) {
        setUser(buildUserFromToken(payload));
        setProfile(buildProfileFromToken(payload));
        setUserRole({ role: payload.role });
      }

      return { error: null };
    } catch (err: any) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Erro inesperado ao fazer login';
      return { error: { message } };
    }
  }, []);

  // ─── Sign Up ──────────────────────────────────────────────────────────────

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      firstName = '',
      lastName = '',
      phone = '',
      document = '',
      inscricaoEstadual = '',
      documentType: 'pf' | 'pj' = 'pf',
    ) => {
      try {
        const body: RegisterRequest = {
          role: 'customer',
          email,
          password,
          first_name: firstName,
          last_name: lastName || undefined,
          phone: phone || undefined,
          document,
          document_type: documentType,
          state_registration_number: (inscricaoEstadual && inscricaoEstadual !== 'ISENTO') ? inscricaoEstadual : undefined,
        };

        await apiClient.post<RegisterResponse>('/users', body, { skipAuth: true });

        // Auto-login after register
        const loginResult = await signIn(email, password);
        if (loginResult.error) {
          return { error: null, needsConfirmation: false };
        }

        return { error: null, needsConfirmation: false };
      } catch (err: any) {
        const message =
          err instanceof ApiError ? err.message : 'Erro inesperado ao criar conta';
        return { error: { message }, needsConfirmation: false };
      }
    },
    [signIn],
  );

  // ─── Sign Out ─────────────────────────────────────────────────────────────

  const signOut = useCallback(async (redirectTo?: string) => {
    apiClient.clearToken();
    setUser(null);
    setProfile(null);
    setUserRole(null);
    window.location.replace(redirectTo || '/auth');
  }, []);

  // ─── Update Profile ───────────────────────────────────────────────────────

  const updateProfile = useCallback(async (data: UpdateProfileRequest) => {
    try {
      const resp = await apiClient.patch<UpdateProfileResponse>('/users', data);
      // Update local state
      setProfile((prev) => ({
        id: prev?.id || resp.id,
        first_name: resp.first_name || prev?.first_name || null,
        last_name: resp.last_name || prev?.last_name || null,
        email: resp.email || prev?.email || null,
        phone: resp.phone || prev?.phone || null,
        document: resp.document || prev?.document || null,
        inscricao_estadual: resp.state_registration_number || prev?.inscricao_estadual || null,
      }));
      if (resp.first_name) {
        setUser((prev) => (prev ? { ...prev, first_name: resp.first_name } : prev));
      }
      return { error: null };
    } catch (err: any) {
      const message =
        err instanceof ApiError ? err.message : 'Erro inesperado ao atualizar perfil';
      return { error: { message } };
    }
  }, []);

  // ─── Update Password ─────────────────────────────────────────────────────

  const updatePassword = useCallback(async (password: string) => {
    return updateProfile({ password });
  }, [updateProfile]);

  // ─── Reset Password (not available in current API — stub) ─────────────────

  const resetPassword = useCallback(async (_email: string) => {
    return { error: { message: 'Funcionalidade de redefinição de senha ainda não disponível na API.' } };
  }, []);

  // ─── Refresh ──────────────────────────────────────────────────────────────

  const refreshUserData = useCallback(async () => {
    const payload = apiClient.decodeToken();
    if (payload) {
      setUser(buildUserFromToken(payload));
      setProfile(buildProfileFromToken(payload));
      setUserRole({ role: payload.role });
    }
  }, []);

  const isAdmin = userRole?.role === 'admin';

  const value: AuthContextType = {
    user,
    profile,
    userRole,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    isAdmin,
    refreshUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
