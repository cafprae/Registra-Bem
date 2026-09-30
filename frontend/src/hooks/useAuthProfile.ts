import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { supabase as defaultSupabase } from '../supabaseClient';
import { AUTHORIZED_ROLES } from '../constants';
import type { Profile } from '../types';

// Cache em nível de módulo para estabilizar sessões e perfis entre trocas de páginas/rotas
let cachedSession: Session | null = null;
let cachedProfile: Profile | null = null;

export function clearProfileCache(): void {
  cachedSession = null;
  cachedProfile = null;
}

export function useAuthProfile(supabaseClient: SupabaseClient = defaultSupabase) {
  const [session, setSession] = useState<Session | null>(() => cachedSession);
  const [profile, setProfile] = useState<Profile | null>(() => cachedProfile);
  const [authLoading, setAuthLoading] = useState<boolean>(() => !cachedProfile);

  // Controle de requisições concorrentes e deduplicação de buscas
  const isFetchingRef = useRef(false);
  const fetchedUserIdRef = useRef<string | null>(cachedProfile ? cachedProfile.id : null);

  // Dependência primitiva estável extraída da sessão
  const userId = session?.user?.id;

  // 1. Efeito do Listener de Autenticação (onAuthStateChange e getSession)
  // Registra o ouvinte uma única vez por instância do cliente Supabase
  useEffect(() => {
    let isMounted = true;

    // Busca inicial de sessão ativa
    supabaseClient.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return;
      if (error) {
        console.error('Erro ao verificar sessão inicial:', error);
        setAuthLoading(false);
        return;
      }
      const initialSession = data?.session ?? null;
      cachedSession = initialSession;
      setSession(initialSession);
      if (!initialSession) {
        setAuthLoading(false);
      }
    }).catch((err) => {
      console.error('Erro inesperado ao verificar sessão:', err);
      if (isMounted) {
        setAuthLoading(false);
      }
    });

    // Subscrição a eventos de mudança de autenticação
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((event, newSession) => {
      if (!isMounted) return;

      cachedSession = newSession ?? null;
      setSession(newSession ?? null);

      if (event === 'SIGNED_OUT' || !newSession) {
        cachedProfile = null;
        fetchedUserIdRef.current = null;
        setProfile(null);
        setAuthLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabaseClient]);

  // Função para executar a consulta otimizada na tabela profiles
  const executeProfileFetch = useCallback(async (targetUserId: string, isMountedCheck?: () => boolean) => {
    if (!targetUserId || isFetchingRef.current) return;

    isFetchingRef.current = true;
    try {
      // Otimização da consulta: busca apenas as colunas necessárias para o contexto
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('id, full_name, role, sector')
        .eq('id', targetUserId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      const fetchedProfile = (data as Profile) || null;
      cachedProfile = fetchedProfile;
      fetchedUserIdRef.current = targetUserId;

      if (!isMountedCheck || isMountedCheck()) {
        setProfile(fetchedProfile);
      }
    } catch (err) {
      console.error('Erro ao buscar perfil:', err);
    } finally {
      isFetchingRef.current = false;
      if (!isMountedCheck || isMountedCheck()) {
        setAuthLoading(false);
      }
    }
  }, [supabaseClient]);

  // 2. Efeito de Busca do Perfil
  // Dependência estabilizada: utiliza estritamente o tipo primitivo 'userId' (string | undefined)
  useEffect(() => {
    let isMounted = true;

    if (!userId) {
      if (isMounted) {
        setProfile(null);
      }
      cachedProfile = null;
      fetchedUserIdRef.current = null;
      return;
    }

    // Se o perfil já estiver disponível para este userId (em cache ou memória), não refaz a requisição
    if (cachedProfile && cachedProfile.id === userId) {
      if (profile?.id !== userId && isMounted) {
        setProfile(cachedProfile);
      }
      if (isMounted) {
        setAuthLoading(false);
      }
      fetchedUserIdRef.current = userId;
      return;
    }

    if (fetchedUserIdRef.current === userId && profile?.id === userId) {
      if (isMounted) {
        setAuthLoading(false);
      }
      return;
    }

    executeProfileFetch(userId, () => isMounted);

    return () => {
      isMounted = false;
    };
  }, [userId, executeProfileFetch, profile?.id]);

  // Função manual para forçar atualização do perfil quando necessário
  const refetchProfile = useCallback(async () => {
    if (userId) {
      await executeProfileFetch(userId);
    }
  }, [userId, executeProfileFetch]);

  // Memorização de permissões com base na role primitiva
  const role = profile?.role?.toLowerCase();
  const isAdmin = useMemo(() => role === 'admin', [role]);
  const isAuthorized = useMemo(() => (
    role ? AUTHORIZED_ROLES.includes(role) : false
  ), [role]);

  return { session, profile, authLoading, isAdmin, isAuthorized, refetchProfile };
}


