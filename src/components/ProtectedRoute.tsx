import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireClient?: boolean;
}

const ProtectedRoute = ({ children, requireAdmin = false, requireClient = false }: ProtectedRouteProps) => {
  const { user, loading, isAdmin, userRole } = useAuth();

  console.log('🔒 [PROTECTED ROUTE]', { 
    loading, 
    hasUser: !!user, 
    isAdmin, 
    userRole, 
    requireAdmin, 
    requireClient 
  });

  // Show loading while checking auth state OR while user role is still loading
  if (loading || (user && userRole === null)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-background/80 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('🔒 [PROTECTED ROUTE] No user, redirecting to /auth');
    return <Navigate to="/auth" replace />;
  }

  if (requireAdmin && !isAdmin) {
    console.log('🔒 [PROTECTED ROUTE] Admin required but user is not admin, redirecting to /cliente/dashboard');
    return <Navigate to="/cliente/dashboard" replace />;
  }

  if (requireClient && isAdmin) {
    // Allow admin to access client area too, don't redirect
    console.log('🔒 [PROTECTED ROUTE] Admin accessing client area - allowed');
  }

  console.log('🔒 [PROTECTED ROUTE] Access granted');
  return <>{children}</>;
};

export default ProtectedRoute;