import { useCallback, useEffect, useMemo, useState } from 'react';
import { AUTHORIZED_ROLES } from '../constants';

export function useAuthProfile(supabase) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const fetchProfile = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setProfile(data);
    } catch (err) {
      console.error('Erro ao buscar perfil:', err);
    } finally {
      setAuthLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setAuthLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile, supabase]);

  const isAdmin = useMemo(() => profile?.role?.toLowerCase() === 'admin', [profile]);

  const isAuthorized = useMemo(() => (
    AUTHORIZED_ROLES.includes(profile?.role?.toLowerCase())
  ), [profile]);

  return { session, profile, authLoading, isAdmin, isAuthorized };
}

