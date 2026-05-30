import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Shield, Edit3, Eye, Users, ArrowLeft, Package, Trash2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { getRoleColor, getRoleLabel, getSectorName } from '../constants';

const getRoleIcon = (role) => {
  if (role === 'admin') return <Shield size={14} />;
  if (role === 'editor') return <Edit3 size={14} />;
  if (role === 'gestor') return <Users size={14} />;
  return <Eye size={14} />;
};

export default function UserManagement() {
  const [allUsers, setAllUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [toast, setToast] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const fetchAllUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      setAllUsers(data || []);
    } catch (err) {
      console.error('Erro ao buscar usuários:', err);
      showToast('Erro ao carregar usuários.');
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllUsers();
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, [fetchAllUsers]);

  const handleDeleteUser = async (user) => {
    const label = user.full_name || user.id.substring(0, 8);
    const confirmed = window.confirm(
      `Excluir permanentemente o usuário "${label}"?\n\nEsta ação remove a conta de autenticação e o perfil. Não pode ser desfeita.`
    );
    if (!confirmed) return;

    setDeletingId(user.id);
    try {
      const { error } = await supabase.rpc('admin_delete_user', { target_uid: user.id });
      if (error) throw error;
      setAllUsers(prev => prev.filter(u => u.id !== user.id));
      showToast('Usuário excluído com sucesso.');
    } catch (err) {
      console.error('Erro ao excluir usuário:', err);
      showToast(err.message || 'Erro ao excluir usuário.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleChangeRole = async (userId, newRole) => {
    const previousUsers = allUsers;
    setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', userId);
      if (error) throw error;
      showToast(`Perfil atualizado para: ${getRoleLabel(newRole)}`);
    } catch (err) {
      console.error('Erro ao atualizar role:', err);
      setAllUsers(previousUsers);
      showToast('Erro ao atualizar perfil. Alteração desfeita.');
    }
  };

  const filteredUsers = allUsers.filter(u => {
    if (!userSearch) return true;
    const q = userSearch.toLowerCase();
    return (u.full_name && u.full_name.toLowerCase().includes(q)) ||
           (u.id && u.id.toLowerCase().includes(q));
  });

  const countByRole = {
    admin: allUsers.filter(u => u.role === 'admin').length,
    editor: allUsers.filter(u => u.role === 'editor').length,
    gestor: allUsers.filter(u => u.role === 'gestor').length,
    viewer: allUsers.filter(u => !u.role || u.role === 'viewer').length,
  };

  const navigate = useNavigate();

  return (
    <>
      {toast && <div className="toast fade-in">{toast}</div>}

      <div className="app-container fade-in">
        <header className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Package size={22} color="var(--primary)" />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h1 className="header-title" style={{ fontSize: '1.05rem', lineHeight: '1.2' }}>
                Gerenciamento de Usuários
              </h1>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Painel administrativo</span>
            </div>
          </div>
          <button to="/inventory" className="btn-outline" style={{ padding: '6px 12px', fontSize: '0.8rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={() => navigate('/inventory')}>
            <ArrowLeft size={14} /> Voltar
          </button>
        </header>

        <main className="main-content" style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
          <div className="desktop-only" style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column' }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: '700' }}>Gerenciamento de Usuários</h1>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              Gerencie os acessos dos usuários cadastrados
            </span>
          </div>

          <div className="fade-in">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">{allUsers.length}</div>
                <div className="stat-label">Total</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ color: '#EF4444' }}>{countByRole.admin}</div>
                <div className="stat-label">Admins</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ color: '#3B82F6' }}>{countByRole.editor}</div>
                <div className="stat-label">Editores</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ color: '#94A3B8' }}>{countByRole.viewer}</div>
                <div className="stat-label">Visualizadores</div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '16px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <Shield size={20} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                <strong style={{ color: 'var(--text-main)' }}>Níveis de Acesso:</strong><br />
                <span style={{ color: '#EF4444' }}>Administrador</span> — Acesso total + gerenciamento de usuários<br />
                <span style={{ color: '#3B82F6' }}>Editor</span> — Pode confirmar, movimentar e registrar bens<br />
                <span style={{ color: '#94A3B8' }}>Visualizador</span> — Apenas visualização (sem edição)
              </div>
            </div>

            <div className="search-container" style={{ marginBottom: '20px' }}>
              <Search className="search-icon" size={18} />
              <input
                type="text"
                className="text-input search-input"
                placeholder="Buscar por nome ou e-mail..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
              <button className="btn btn-outline" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={fetchAllUsers} disabled={usersLoading}>
                {usersLoading ? 'Carregando...' : '🔄 Atualizar Lista'}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredUsers.map(user => (
                <div key={user.id} className="glass-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                      <div style={{
                        width: '40px', height: '40px', borderRadius: '50%',
                        background: `linear-gradient(135deg, ${getRoleColor(user.role)}, ${getRoleColor(user.role)}99)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1rem', fontWeight: '700', color: 'white', flexShrink: 0
                      }}>
                        {(user.full_name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: '600', fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {user.full_name || 'Sem nome'}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {user.sector ? getSectorName(user.sector) : 'Sem setor'} · ID: {user.id.substring(0, 8)}...
                        </div>
                      </div>
                    </div>

                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '6px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600',
                      background: `${getRoleColor(user.role)}20`, color: getRoleColor(user.role),
                      border: `1px solid ${getRoleColor(user.role)}40`
                    }}>
                      {getRoleIcon(user.role)} {getRoleLabel(user.role)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{
                        flex: '0 0 auto', padding: '10px 12px', fontSize: '0.82rem',
                        color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.4)',
                      }}
                      onClick={() => handleDeleteUser(user)}
                      disabled={deletingId === user.id || user.id === currentUserId}
                      title={user.id === currentUserId ? 'Você não pode excluir sua própria conta' : 'Excluir usuário'}
                    >
                      <Trash2 size={14} /> {deletingId === user.id ? 'Excluindo...' : 'Excluir'}
                    </button>
                    <button
                      className={`btn ${user.role === 'viewer' ? 'btn-primary' : 'btn-outline'}`}
                      style={{ flex: 1, padding: '10px 12px', fontSize: '0.82rem', minWidth: '100px' }}
                      onClick={() => handleChangeRole(user.id, 'viewer')}
                      disabled={user.role === 'viewer'}
                    >
                      <Eye size={14} /> Visualizador
                    </button>
                    <button
                      className={`btn ${user.role === 'gestor' ? 'btn-primary' : 'btn-outline'}`}
                      style={{ flex: 1, padding: '10px 12px', fontSize: '0.82rem', minWidth: '100px' }}
                      onClick={() => handleChangeRole(user.id, 'gestor')}
                      disabled={user.role === 'gestor'}
                    >
                      <Users size={14} /> Gestor
                    </button>
                    <button
                      className={`btn ${user.role === 'editor' ? 'btn-primary' : 'btn-outline'}`}
                      style={{ flex: 1, padding: '10px 12px', fontSize: '0.82rem', minWidth: '100px' }}
                      onClick={() => handleChangeRole(user.id, 'editor')}
                      disabled={user.role === 'editor'}
                    >
                      <Edit3 size={14} /> Editor
                    </button>
                    <button
                      className={`btn ${user.role === 'admin' ? 'btn-primary' : 'btn-outline'}`}
                      style={{ flex: 1, padding: '10px 12px', fontSize: '0.82rem', minWidth: '100px' }}
                      onClick={() => handleChangeRole(user.id, 'admin')}
                      disabled={user.role === 'admin'}
                    >
                      <Shield size={14} /> Admin
                    </button>
                  </div>
                </div>
              ))}

              {filteredUsers.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state-icon"><Users size={40} /></div>
                  {usersLoading ? 'Carregando usuários...' : 'Nenhum usuário encontrado.'}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
