import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { SessionManager } from '@/utils/sessionManager';

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
}

interface UserRole {
  role: 'admin' | 'user';
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  userRole: UserRole | null;
  loading: boolean;
  signUp: (email: string, password: string, firstName?: string, lastName?: string, phone?: string) => Promise<{ error: any; needsConfirmation?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (password: string) => Promise<{ error: any }>;
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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserProfile = async (userId: string) => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (profileData) setProfile(profileData);
      if (roleData && roleData.length > 0) {
        // Check if user has admin role
        const hasAdminRole = roleData.some(r => r.role === 'admin');
        const primaryRole = hasAdminRole ? 'admin' : roleData[0]?.role || 'user';
        setUserRole({ role: primaryRole });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  useEffect(() => {
    let authSubscription: any;
    
    const initAuth = async () => {
      try {
        // Set up auth state listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log('Auth event:', event, 'Session:', !!session);
            
            if (event === 'SIGNED_OUT') {
              // Clear all local state immediately on signout
              setSession(null);
              setUser(null);
              setProfile(null);
              setUserRole(null);
              setLoading(false);
              return;
            }
            
            setSession(session);
            setUser(session?.user ?? null);
            
            if (session?.user) {
              // Defer profile loading to prevent deadlocks
              setTimeout(() => {
                loadUserProfile(session.user.id);
              }, 0);
            } else {
              setProfile(null);
              setUserRole(null);
            }
            
            setLoading(false);
          }
        );
        
        authSubscription = subscription;

        // Check for existing session
        const { data: { session } } = await supabase.auth.getSession();
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            loadUserProfile(session.user.id);
          }, 0);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error initializing auth:', error);
        setLoading(false);
      }
    };

    initAuth();

    return () => {
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, []);

  const signUp = async (email: string, password: string, firstName = '', lastName = '', phone = '') => {
    const redirectUrl = `${window.location.origin}/auth`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: firstName,
          last_name: lastName,
          phone: phone,
        }
      }
    });
    
    // With email confirmation enabled, user won't be logged in immediately
    // The session will be null until they confirm their email
    if (data.user && !error) {
      if (data.session) {
        // User is logged in immediately (email confirmation disabled)
        return { error: null, needsConfirmation: false };
      } else {
        // User needs to confirm email (email confirmation enabled)
        return { error: null, needsConfirmation: true };
      }
    }
    
    return { error, needsConfirmation: false };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    // Don't redirect immediately, let the auth state change handle it
    return { error };
  };

  const refreshUserData = async () => {
    if (user) {
      await loadUserProfile(user.id);
    }
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/auth?reset=true`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    
    return { error };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({
      password: password
    });
    
    return { error };
  };

  const signOut = async () => {
    try {
      // Clear anonymous session
      SessionManager.clearSession();
      
      // Clear local state first
      setUser(null);
      setSession(null);
      setProfile(null);
      setUserRole(null);
      
      // Clear any stored auth data from localStorage
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          localStorage.removeItem(key);
        }
      });
      
      // Try to sign out from Supabase (may fail if session doesn't exist)
      await supabase.auth.signOut({ scope: 'global' });
    } catch (error) {
      console.error('Error signing out:', error);
      // Even if signOut fails, we still want to clear local state
    } finally {
      // Force navigation to home page
      window.location.href = '/';
    }
  };

  const isAdmin = userRole?.role === 'admin';

  const value = {
    user,
    session,
    profile,
    userRole,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    isAdmin,
    refreshUserData,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};