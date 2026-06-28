import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  Package, LogIn, BarChart3, List, ClipboardList, Users, Plus
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useInventory } from '../context/InventoryContext';
import { useUI } from '../context/UIContext';
import { getRoleLabel, getSectorName } from '../constants';
import AssetDetailSheet from '../components/AssetDetailSheet';
import AddExtraModal from '../components/AddExtraModal';
import LoadingScreen from '../components/LoadingScreen';

const PAGE_META = {
  '/dashboard': { title: 'Visão Geral da Unidade', subtitle: 'Visão Geral', showSector: false },
  '/inventory': { title: 'Lista de Patrimônios Ativos', subtitle: 'Lista de Patrimônios', showSector: true },
  '/reports': { title: 'Relatório de Auditoria', subtitle: 'Relatório', showSector: true },
};

export default function InventoryLayout() {
  const { pathname } = useLocation();
  const {
    session, profile, authLoading, isAdmin, isAuthorized, sector,
  } = useInventory();
  const { toast, openAddExtraModal } = useUI();

  const meta = PAGE_META[pathname] ?? PAGE_META['/inventory'];
  const isInventory = pathname === '/inventory';
  const userEmail = session?.user?.email ?? '';
  const userInitial = userEmail ? userEmail.charAt(0).toUpperCase() : '?';

  if (authLoading || !session) {
    return <LoadingScreen />;
  }

  return (
    <>
      {toast && <div className="toast fade-in">{toast}</div>}

      <div className="app-container fade-in">
        <header className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Package size={22} color="var(--primary)" />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h1 className="header-title" style={{ fontSize: '1.05rem', lineHeight: '1.2' }}>{getSectorName(sector)}</h1>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{meta.subtitle}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-outline mobile-only" onClick={() => supabase.auth.signOut()} style={{ padding: '6px' }}>
              <LogIn size={16} style={{ transform: 'rotate(180deg)' }} />
            </button>
          </div>
        </header>

        <div className="app-content-wrapper">
          <nav className="nav-bar">
            <div className="nav-logo desktop-only" style={{ marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Package size={28} color="var(--primary)" />
              <h2 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Registra Bem</h2>
            </div>

            {(isAdmin || profile?.role?.toLowerCase() === 'gestor') && (
              <NavLink to="/dashboard" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
                <BarChart3 size={20} /> <span className="nav-label">Visão Geral</span>
              </NavLink>
            )}
            <NavLink to="/inventory" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <List size={20} /> <span className="nav-label">Patrimônios</span>
            </NavLink>
            <NavLink to="/reports" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <ClipboardList size={20} /> <span className="nav-label">Relatório</span>
            </NavLink>
            {isAdmin && (
              <NavLink to="/admin" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
                <Users size={20} /> <span className="nav-label">Usuários</span>
              </NavLink>
            )}

            <div className="desktop-only" style={{ marginTop: 'auto', padding: '20px 0', borderTop: '1px solid var(--glass-border)', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', padding: '0 16px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: '700' }}>
                  {userInitial}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userEmail}</div>
                  <div style={{ fontSize: '0.7rem', color: isAuthorized ? 'var(--secondary)' : 'var(--warning)' }}>
                    {isAuthorized ? getRoleLabel(profile?.role) : 'Aguardando Liberação'}
                  </div>
                </div>
              </div>
              <button className="nav-item" onClick={() => supabase.auth.signOut()} style={{ width: '100%', color: 'var(--danger)', justifyContent: 'flex-start' }}>
                <LogIn size={20} style={{ transform: 'rotate(180deg)' }} /> <span className="nav-label">Sair da Conta</span>
              </button>
            </div>

            {isInventory && (
              <div className="desktop-only" style={{ marginTop: 'auto', width: '100%' }}>
                <button className="nav-item nav-item-add" onClick={() => openAddExtraModal}>
                  <Plus size={20} /> <span className="nav-label">Registrar Item Extra</span>
                </button>
              </div>
            )}
          </nav>

          <main className="main-content">
            <div className="desktop-only" style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column' }}>
              <h1 style={{ fontSize: '1.6rem', fontWeight: '700' }}>{meta.title}</h1>
              {meta.showSector && (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>{getSectorName(sector)}</span>
              )}
            </div>
            <Outlet />
          </main>

          <AssetDetailSheet />
        </div>
      </div>

      {isInventory && (
        <button className="fab mobile-only" onClick={() => openAddExtraModal} title="Registrar item extra">
          <Plus size={26} />
        </button>
      )}

      <AddExtraModal />
    </>
  );
}
