import { Navigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuthProfile } from '../hooks/useAuthProfile';
import LoadingScreen from '../components/LoadingScreen';

export default function AdminRoute({ children }) {
  const { session, authLoading, isAdmin } = useAuthProfile(supabase);

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <Navigate to="/" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}
