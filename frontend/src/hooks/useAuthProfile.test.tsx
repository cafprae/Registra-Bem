// @vitest-environment jsdom
// @ts-nocheck
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuthProfile, clearProfileCache } from './useAuthProfile';

function TestAuthComponent({ supabase, onRender }: { supabase: any; onRender?: (state: any) => void }) {
  const auth = useAuthProfile(supabase);
  if (onRender) onRender(auth);

  return (
    <div>
      <span data-testid="loading">{auth.authLoading ? 'loading' : 'ready'}</span>
      <span data-testid="role">{auth.profile?.role || 'none'}</span>
      <span data-testid="isAdmin">{auth.isAdmin ? 'admin' : 'not-admin'}</span>
      <span data-testid="isAuthorized">{auth.isAuthorized ? 'authorized' : 'not-authorized'}</span>
    </div>
  );
}

describe('useAuthProfile hook', () => {
  let mockSupabase: any;
  let authStateCallback: ((event: string, session: any) => void) | null = null;
  let unsubscribeMock: any;
  let selectMock: any;
  let eqMock: any;
  let singleMock: any;
  let fromMock: any;

  const fakeUser = { id: 'user-123', email: 'test@ufc.br' };
  const fakeSession = { user: fakeUser, access_token: 'fake-token' };
  const fakeProfile = {
    id: 'user-123',
    full_name: 'Usuário de Teste',
    role: 'admin',
    sector: 'TI',
    updated_at: '2026-09-29T12:00:00Z',
  };

  beforeEach(() => {
    clearProfileCache();
    authStateCallback = null;
    unsubscribeMock = vi.fn();

    singleMock = vi.fn().mockResolvedValue({ data: fakeProfile, error: null });
    eqMock = vi.fn().mockReturnValue({ single: singleMock });
    selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    fromMock = vi.fn().mockReturnValue({ select: selectMock });

    mockSupabase = {
      from: fromMock,
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: fakeSession },
          error: null,
        }),
        onAuthStateChange: vi.fn().mockImplementation((cb) => {
          authStateCallback = cb;
          return {
            data: {
              subscription: {
                unsubscribe: unsubscribeMock,
              },
            },
          };
        }),
      },
    };
  });

  it('deve buscar o perfil inicial selecionando apenas as colunas necessárias e definir isAdmin corretamente', async () => {
    render(<TestAuthComponent supabase={mockSupabase} />);

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('ready');
    });

    expect(fromMock).toHaveBeenCalledWith('profiles');
    expect(selectMock).toHaveBeenCalledWith('id, full_name, role, sector');
    expect(eqMock).toHaveBeenCalledWith('id', 'user-123');
    expect(screen.getByTestId('role').textContent).toBe('admin');
    expect(screen.getByTestId('isAdmin').textContent).toBe('admin');
    expect(screen.getByTestId('isAuthorized').textContent).toBe('authorized');
    expect(fromMock).toHaveBeenCalledTimes(1);
  });

  it('não deve disparar requisições duplicadas para a tabela profiles se o onAuthStateChange emitir eventos repetidos da mesma sessão', async () => {
    const { rerender } = render(<TestAuthComponent supabase={mockSupabase} />);

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('ready');
    });

    expect(fromMock).toHaveBeenCalledTimes(1);

    // Simula múltiplos disparos de onAuthStateChange (ex: TOKEN_REFRESHED) com a mesma sessão
    act(() => {
      if (authStateCallback) {
        authStateCallback('TOKEN_REFRESHED', { ...fakeSession, access_token: 'new-token' });
        authStateCallback('USER_UPDATED', { ...fakeSession });
      }
    });

    // Força re-render do componente
    rerender(<TestAuthComponent supabase={mockSupabase} />);

    // A tabela profiles NÃO deve ser consultada novamente
    expect(fromMock).toHaveBeenCalledTimes(1);
  });

  it('reutiliza o cache de perfil ao desmontar e montar novamente (evitando requisição repetida ao navegar)', async () => {
    const { unmount } = render(<TestAuthComponent supabase={mockSupabase} />);

    await waitFor(() => {
      expect(fromMock).toHaveBeenCalledTimes(1);
    });

    unmount();

    // Novo componente montado (como ao navegar entre /admin e /inventory)
    render(<TestAuthComponent supabase={mockSupabase} />);

    // Como já está em cache, authLoading já é falso imediatamente ou o perfil é reutilizado
    expect(screen.getByTestId('role').textContent).toBe('admin');

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('ready');
    });

    // Número de chamadas deve continuar 1!
    expect(fromMock).toHaveBeenCalledTimes(1);
  });
});
