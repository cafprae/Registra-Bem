import { Outlet } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { supabase } from '../supabaseClient';
import Auth from '../Auth';
import LoadingScreen from '../components/LoadingScreen';
import { InventoryProvider, useInventory } from '../context/InventoryContext';

function AuthGate() {
  const { session, authLoading } = useInventory();

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <Auth />;
  }

  return <ProfileGate />;
}

function ProfileGate() {
  const { profile, authLoading } = useInventory();

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (!profile?.sector) {
    return (
      <div className="auth-screen">
        <div className="glass-panel" style={{ padding: '32px', maxWidth: '440px', width: '100%', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '12px' }}>Setor não configurado</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '24px' }}>
            Seu perfil não possui um setor vinculado. Entre em contato com um administrador para atualizar seu cadastro.
          </p>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => supabase.auth.signOut()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <LogIn size={18} style={{ transform: 'rotate(180deg)' }} /> Sair da conta
          </button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}

export default function InventoryGate() {
  return (
    <InventoryProvider>
      <AuthGate />
    </InventoryProvider>
  );
}
