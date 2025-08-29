import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const AuthRedirect = () => {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      if (isAdmin) {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/cliente/dashboard', { replace: true });
      }
    }
  }, [user, isAdmin, loading, navigate]);

  return null;
};

export default AuthRedirect;