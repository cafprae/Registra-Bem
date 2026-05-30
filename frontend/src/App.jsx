import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search, CheckCircle, MapPin, Building, Package, CheckCircle2,
  History, Plus, ClipboardList, Download, ArrowRightLeft, LogIn,
  X, Clock, Database, List, AlertTriangle, BarChart3,
  Users, Shield, UserCheck, UserX, Edit3, Eye
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from './supabaseClient';
import Auth from './Auth';
import LoadingScreen from './components/LoadingScreen';
import ReportView from './components/ReportView';
import SectorSelector from './components/SectorSelector';
import { getRoleColor, getRoleLabel, getSectorName, STATUS } from './constants';
import { useAssets } from './hooks/useAssets';
import { useAuthProfile } from './hooks/useAuthProfile';

export default function App() {
  const { session, profile, authLoading, isAdmin, isAuthorized } = useAuthProfile(supabase);
  const { assets, setAssets } = useAssets(supabase);
  const [sector, setSector] = useState(() => localStorage.getItem('registrabem_sector') || null);

  // === USER MANAGEMENT (admin only) ===
  const [allUsers, setAllUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  const fetchAllUsers = useCallback(async () => {
    if (!isAdmin) return;
    setUsersLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAllUsers(data || []);
    } catch (err) {
      console.error('Erro ao buscar usuários:', err);
    } finally {
      setUsersLoading(false);
    }
  }, [isAdmin]);

  const handleChangeRole = async (userId, newRole) => {
    if (!isAdmin) return;
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

  const getRoleIcon = (role) => {
    if (role === 'admin') return <Shield size={14} />;
    if (role === 'editor') return <Edit3 size={14} />;
    return <Eye size={14} />;
  };

  const [search, setSearch] = useState('');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [newLocation, setNewLocation] = useState('');
  const [view, setView] = useState('list');
  // When admin switches to users view, fetch the list
  useEffect(() => {
    if (view === 'users' && isAdmin) fetchAllUsers();
  }, [view, isAdmin, fetchAllUsers]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddExtra, setShowAddExtra] = useState(false);
  const [extraTombamento, setExtraTombamento] = useState('');
  const [extraName, setExtraName] = useState('');
  const [extraLocation, setExtraLocation] = useState('');
  const [toast, setToast] = useState(null);
  const [reportTab, setReportTab] = useState('missing');
  const [showSectorChange, setShowSectorChange] = useState(false);
  const [newSector, setNewSector] = useState('');

  useEffect(() => {
    if (sector) localStorage.setItem('registrabem_sector', sector);
    else localStorage.removeItem('registrabem_sector');
  }, [sector]);

  const sectors = useMemo(() => [...new Set(assets.map(a => a.sector))].sort(), [assets]);
  const sectorAssets = useMemo(() => assets.filter(a => a.sector === sector), [assets, sector]);

  const filteredAssets = useMemo(() => sectorAssets.filter(a => {
    const matchesSearch = !search ||
      (a.name && a.name.toLowerCase().includes(search.toLowerCase())) ||
      (a.id && a.id.toString().includes(search));
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  }), [sectorAssets, search, statusFilter]);

  const stats = useMemo(() => ({
    total: sectorAssets.length,
    confirmed: sectorAssets.filter(a => a.status === STATUS.CONFIRMED).length,
    moved: sectorAssets.filter(a => a.status === STATUS.MOVED).length,
    pending: sectorAssets.filter(a => a.status === STATUS.PENDING).length,
    extras: sectorAssets.filter(a => a.isExtra).length,
  }), [sectorAssets]);

  const progress = stats.total > 0 ? Math.round(((stats.confirmed + stats.moved) / stats.total) * 100) : 0;

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const rollbackAssetChange = (previousAssets, previousSelected, message = 'Erro ao salvar. Alteração desfeita.') => {
    setAssets(previousAssets);
    setSelectedAsset(previousSelected);
    showToast(message);
  };

  // === HANDLERS ===
  const handleConfirm = async () => {
    if (!selectedAsset) return;
    if (!isAuthorized) {
      showToast('Acesso restrito: apenas agentes autorizados podem editar.');
      return;
    }
    const previousAssets = assets;
    const previousSelected = selectedAsset;
    const newStatus = (selectedAsset.location && selectedAsset.location !== selectedAsset.originalLocation)
      ? STATUS.MOVED : STATUS.CONFIRMED;
    setAssets(prev => prev.map(a => a.id === selectedAsset.id ? { ...a, status: newStatus } : a));
    setSelectedAsset(prev => ({ ...prev, status: newStatus }));

    try {
      const { error } = await supabase.from('tabela_inicial')
        .update({ status: newStatus })
        .eq('tombamento', selectedAsset.id);
      if (error) throw error;
      showToast(newStatus === STATUS.CONFIRMED ? 'Item confirmado!' : 'Marcado como movimentado!');
    } catch(e) {
      console.error("Erro BD", e);
      rollbackAssetChange(previousAssets, previousSelected);
    }
  };

  const handleUpdateLocation = async () => {
    if (!selectedAsset || !newLocation.trim() || newLocation === selectedAsset.location) return;
    if (!isAuthorized) {
      showToast('Acesso restrito: apenas agentes autorizados podem editar.');
      return;
    }
    const previousAssets = assets;
    const previousSelected = selectedAsset;
    const previousLocationInput = newLocation;
    const logEntry = {
      date: new Date().toLocaleString('pt-BR'),
      from: selectedAsset.location || 'Não definido',
      to: newLocation
    };
    const newStatus = (newLocation === selectedAsset.originalLocation) ? STATUS.CONFIRMED : STATUS.MOVED;
    setAssets(prev => prev.map(a =>
      a.id === selectedAsset.id ? { ...a, location: newLocation, status: newStatus, logs: [logEntry, ...a.logs] } : a
    ));
    setSelectedAsset(prev => ({ ...prev, location: newLocation, status: newStatus, logs: [logEntry, ...prev.logs] }));
    setNewLocation('');

    try {
      const { error } = await supabase.from('tabela_inicial')
        .update({ status: newStatus, local_exato_ambiente: newLocation })
        .eq('tombamento', selectedAsset.id);
      if (error) throw error;
      showToast('Localização atualizada!');
    } catch(e) {
      console.error("Erro BD", e);
      setNewLocation(previousLocationInput);
      rollbackAssetChange(previousAssets, previousSelected);
    }
  };

  const handleChangeSector = async () => {
    if (!selectedAsset || !newSector || newSector === selectedAsset.sector) return;
    if (!isAuthorized) {
      showToast('Acesso restrito: apenas agentes autorizados podem editar.');
      return;
    }
    const previousAssets = assets;
    const previousSelected = selectedAsset;
    const previousNewSector = newSector;
    const previousShowSectorChange = showSectorChange;
    const logEntry = {
      date: new Date().toLocaleString('pt-BR'),
      from: `Divisão: ${selectedAsset.sector}`,
      to: `Divisão: ${newSector}`
    };
    setAssets(prev => prev.map(a =>
      a.id === selectedAsset.id ? { ...a, sector: newSector, status: STATUS.MOVED, logs: [logEntry, ...a.logs] } : a
    ));
    setSelectedAsset(prev => ({ ...prev, sector: newSector, status: STATUS.MOVED, logs: [logEntry, ...prev.logs] }));
    setShowSectorChange(false);
    setNewSector('');

    try {
      const { error } = await supabase.from('tabela_inicial')
        .update({ status: STATUS.MOVED, local_sistema: newSector })
        .eq('tombamento', selectedAsset.id);
      if (error) throw error;
      showToast('Divisão alterada!');
    } catch(e) {
      console.error("Erro BD", e);
      setNewSector(previousNewSector);
      setShowSectorChange(previousShowSectorChange);
      rollbackAssetChange(previousAssets, previousSelected);
    }
  };

  const handleConditionChange = async (value) => {
    if (!selectedAsset) return;
    if (!isAuthorized) {
      showToast('Acesso restrito: apenas agentes autorizados podem editar.');
      return;
    }
    const previousAssets = assets;
    const previousSelected = selectedAsset;
    setAssets(prev => prev.map(a =>
      a.id === selectedAsset.id ? { ...a, condition: value } : a
    ));
    setSelectedAsset(prev => ({ ...prev, condition: value }));

    try {
      const { error } = await supabase.from('tabela_inicial')
        .update({ condicao: value })
        .eq('tombamento', selectedAsset.id);
      if (error) throw error;
      if (value) showToast(`Condição: ${value}`);
    } catch(e) {
      console.error("Erro BD", e);
      rollbackAssetChange(previousAssets, previousSelected);
    }
  };

  const handleAddExtra = async () => {
    if (!extraTombamento.trim() || !extraLocation.trim()) { showToast('Preencha tombamento e local.'); return; }
    if (!isAuthorized) {
      showToast('Acesso restrito: apenas agentes autorizados podem editar.');
      return;
    }
    if (assets.some(a => a.id.toString() === extraTombamento.trim())) { showToast('Tombamento já existe.'); return; }
    const previousAssets = assets;
    const previousForm = { extraTombamento, extraName, extraLocation };
    const newAsset = {
      id: extraTombamento.trim(), systemName: 'Item Extra (Manual)', sector,
      year: new Date().getFullYear(), name: extraName.trim() || `Bem #${extraTombamento.trim()}`,
      location: extraLocation.trim(), originalLocation: '', status: STATUS.CONFIRMED, isExtra: true,
      condition: '',
      logs: [{ date: new Date().toLocaleString('pt-BR'), from: 'Registro Manual', to: extraLocation.trim() }]
    };
    setAssets(prev => [newAsset, ...prev]);
    setShowAddExtra(false); setExtraTombamento(''); setExtraName(''); setExtraLocation('');

    try {
      const { error } = await supabase.from('tabela_inicial').insert([{
        tombamento: newAsset.id,
        local_sistema: newAsset.sector,
        nome: newAsset.name,
        local_exato_ambiente: newAsset.location,
        status: newAsset.status,
        condicao: newAsset.condition
      }]);
      if (error) throw error;
      showToast('Item adicionado!');
    } catch(e) {
      console.error("Erro BD", e);
      setAssets(previousAssets);
      setShowAddExtra(true);
      setExtraTombamento(previousForm.extraTombamento);
      setExtraName(previousForm.extraName);
      setExtraLocation(previousForm.extraLocation);
      showToast('Erro ao salvar. Item extra não foi registrado.');
    }
  };



  // === REPORT/EXPORT ===
  const handleDownloadOds = () => {
    const rows = sectorAssets.map(a => ({
      'Tombamento': a.id,
      'Nome': a.name,
      'Nome Sistema': a.systemName,
      'Setor': a.sector,
      'Ano': a.year,
      'Localização Atual': a.location || '',
      'Localização Original': a.originalLocation || '',
      'Condição': a.condition || '',
      'Status': a.status === STATUS.CONFIRMED ? 'Confirmado' : a.status === STATUS.MOVED ? 'Movimentado' : 'Pendente',
      'Item Extra': a.isExtra ? 'Sim' : 'Não',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório');
    XLSX.writeFile(wb, `relatorio_${sector.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.ods`, { bookType: 'ods' });
    showToast('📊 Planilha ODS baixada!');
  };

  const getStatusIcon = (s) => s === STATUS.CONFIRMED ? <CheckCircle2 size={14} /> : s === STATUS.MOVED ? <ArrowRightLeft size={14} /> : <Clock size={14} />;
  const getStatusLabel = (s) => s === STATUS.CONFIRMED ? 'Confirmado' : s === STATUS.MOVED ? 'Movimentado' : 'Pendente';
  const getStatusClass = (s) => s === STATUS.CONFIRMED ? 'status-confirmed' : s === STATUS.MOVED ? 'status-moved' : 'status-pending';

  // ==============================
  // LOADING / AUTH SCREENS
  // ==============================
  if (authLoading) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <Auth />;
  }

  if (!sector) {
    return (
      <SectorSelector
        assets={assets}
        sectors={sectors}
        onSelectSector={(selectedSector) => {
          setSector(selectedSector);
          setSearch('');
        }}
      />
    );
  }

  // ==============================
  // DASHBOARD VIEW
  // ==============================
  const renderDashboard = () => {
    const totalAssets = assets.length;
    const globalConfirmed = assets.filter(a => a.status === STATUS.CONFIRMED).length;
    const globalMoved = assets.filter(a => a.status === STATUS.MOVED).length;
    const globalPending = assets.filter(a => a.status === STATUS.PENDING).length;
    
    const condBom = assets.filter(a => a.condition === 'Bom').length;
    const condRuim = assets.filter(a => a.condition === 'Ruim').length;
    const condInservivel = assets.filter(a => a.condition === 'Inservível').length;
    const condNaoAvaliado = totalAssets - (condBom + condRuim + condInservivel);

    const globalDone = globalConfirmed + globalMoved;
    const globalProgress = totalAssets > 0 ? Math.round((globalDone / totalAssets) * 100) : 0;

    const sectorStats = sectors.map(s => {
      const items = assets.filter(a => a.sector === s);
      const done = items.filter(a => a.status !== STATUS.PENDING).length;
      return { name: s, total: items.length, done, progress: items.length > 0 ? Math.round((done / items.length) * 100) : 0 };
    }).sort((a, b) => b.progress - a.progress); 

    const itemsCount = {};
    assets.forEach(a => {
      // Create a simplified category name (first two words usually define the object like "Ar Condicionado", "Mesa L", "Monitor")
      let cat = a.name.split('-')[0].trim().split(' ').slice(0, 2).join(' ').toUpperCase();
      if (!cat) cat = "OUTROS";
      itemsCount[cat] = (itemsCount[cat] || 0) + 1;
    });
    const topCategories = Object.entries(itemsCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5); // top 5 categorias

    return (
      <div className="dashboard-view fade-in">
        
        <div className="stats-grid">
          <div className="stat-card"><div className="stat-value">{totalAssets}</div><div className="stat-label">Total GERAL</div></div>
          <div className="stat-card"><div className="stat-value" style={{ color: '#34D399' }}>{globalDone}</div><div className="stat-label">Verificados</div></div>
          <div className="stat-card"><div className="stat-value" style={{ color: '#FBBF24' }}>{globalMoved}</div><div className="stat-label">Movimentados</div></div>
          <div className="stat-card"><div className="stat-value" style={{ color: '#94A3B8' }}>{globalPending}</div><div className="stat-label">Pendentes</div></div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '16px' }}>Progresso Total da Auditoria</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--secondary)' }}>{globalProgress}%</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{globalDone} de {totalAssets} itens</span>
          </div>
          <div className="progress-bar"><div className="progress-fill" style={{ width: `${globalProgress}%` }} /></div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '16px' }}>Saúde e Condição (Itens Verificados)</h3>
          <div className="chart-bar-horizontal">
            {condBom > 0 && <div className="chart-segment" style={{ width: `${(condBom / globalDone) * 100}%`, background: '#34D399' }} />}
            {condRuim > 0 && <div className="chart-segment" style={{ width: `${(condRuim / globalDone) * 100}%`, background: '#FBBF24' }} />}
            {condInservivel > 0 && <div className="chart-segment" style={{ width: `${(condInservivel / globalDone) * 100}%`, background: '#EF4444' }} />}
            {condNaoAvaliado > 0 && globalDone > 0 && <div className="chart-segment" style={{ width: `${(condNaoAvaliado / globalDone) * 100}%`, background: '#334155' }} />}
          </div>
          <div className="chart-legend" style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '10px', height: '10px', background: '#34D399', borderRadius: '2px' }} /> Bom ({condBom})</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '10px', height: '10px', background: '#FBBF24', borderRadius: '2px' }} /> Ruim ({condRuim})</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '10px', height: '10px', background: '#EF4444', borderRadius: '2px' }} /> Inservível ({condInservivel})</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '10px', height: '10px', background: '#334155', borderRadius: '2px' }} /> S/ Avaliação ({condNaoAvaliado})</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '16px' }}>Progresso por Divisão (Setor)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {sectorStats.map(stat => (
              <div key={stat.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                  <strong style={{ color: 'var(--text-main)' }}>{getSectorName(stat.name)}</strong>
                  <span style={{ color: 'var(--text-muted)' }}>{stat.done}/{stat.total} ({stat.progress}%)</span>
                </div>
                <div className="progress-bar" style={{ height: '6px', background: 'var(--background)' }}>
                  <div className="progress-fill" style={{ width: `${stat.progress}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '16px' }}>Top 5 Categorias (Itens Mais Comuns)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {topCategories.map((cat, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--surface)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'var(--surface-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{idx + 1}</span>
                  {cat[0]}
                </span>
                <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--primary)' }}>{cat[1]} un.</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', marginBottom: '40px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center' }}>
            <Database size={16} style={{ marginRight: '8px', color: 'var(--primary)' }} />
            Inventário Geral (Todos os Setores)
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Visão gerencial completa de todos os {totalAssets} patrimônios cadastrados na unidade.
          </p>
          <div style={{ height: '400px', overflowY: 'auto', paddingRight: '8px', border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--surface)' }}>
            {[...assets].sort((a, b) => a.sector.localeCompare(b.sector) || a.name.localeCompare(b.name)).map(item => (
              <div key={item.id} className="report-item" style={{ cursor: 'pointer', margin: 0, padding: '12px', borderRadius: 0, borderBottom: '1px solid var(--glass-border)' }} onClick={() => setSelectedAsset(item)}>
                <div className="report-item-header">
                  <span className="report-item-name">{item.name.substring(0, 45)}{item.name.length > 45 ? '...' : ''}</span>
                  <span className="report-item-id">#{item.id}</span>
                </div>
                <div className="report-item-detail" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                  <span style={{ color: 'var(--primary)' }}><Building size={12} style={{ marginRight: '4px' }}/> {item.sector}</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {item.condition && <span>🔧 {item.condition}</span>}
                    <span style={{ color: item.status === STATUS.PENDING ? '#94A3B8' : item.status === STATUS.CONFIRMED ? '#34D399' : '#FBBF24' }}>
                      {item.status === STATUS.PENDING ? '⏳ PENDENTE' : item.status === STATUS.CONFIRMED ? '✅ CONFIRMADO' : '🔄 MOVIDO'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    );
  };


  // ==============================
  // USER MANAGEMENT VIEW (admin only)
  // ==============================
  const renderUserManagement = () => {
    const filteredUsers = allUsers.filter(u => {
      if (!userSearch) return true;
      const search = userSearch.toLowerCase();
      return (u.full_name && u.full_name.toLowerCase().includes(search)) ||
             (u.id && u.id.toLowerCase().includes(search));
    });

    const countByRole = {
      admin: allUsers.filter(u => u.role === 'admin').length,
      editor: allUsers.filter(u => u.role === 'editor').length,
      viewer: allUsers.filter(u => !u.role || u.role === 'viewer').length,
    };

    return (
      <div className="fade-in">
        {/* Stats */}
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

        {/* Info box */}
        <div className="glass-panel" style={{ padding: '16px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <Shield size={20} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            <strong style={{ color: 'var(--text-main)' }}>Níveis de Acesso:</strong><br/>
            <span style={{ color: '#EF4444' }}>Administrador</span> — Acesso total + gerenciamento de usuários<br/>
            <span style={{ color: '#3B82F6' }}>Editor</span> — Pode confirmar, movimentar e registrar bens<br/>
            <span style={{ color: '#94A3B8' }}>Visualizador</span> — Apenas visualização (sem edição)
          </div>
        </div>

        {/* Search */}
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

        {/* Refresh */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <button className="btn btn-outline" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={fetchAllUsers} disabled={usersLoading}>
            {usersLoading ? 'Carregando...' : '🔄 Atualizar Lista'}
          </button>
        </div>

        {/* User list */}
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
                      ID: {user.id.substring(0, 8)}...
                    </div>
                  </div>
                </div>

                {/* Current role badge */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600',
                  background: `${getRoleColor(user.role)}20`, color: getRoleColor(user.role),
                  border: `1px solid ${getRoleColor(user.role)}40`
                }}>
                  {getRoleIcon(user.role)} {getRoleLabel(user.role)}
                </div>
              </div>

              {/* Role change buttons */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  className={`btn ${user.role === 'viewer' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ flex: 1, padding: '10px 12px', fontSize: '0.82rem', minWidth: '100px' }}
                  onClick={() => handleChangeRole(user.id, 'viewer')}
                  disabled={user.role === 'viewer'}
                >
                  <Eye size={14} /> Visualizador
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
    );
  };

  // ==============================
  // MAIN RENDER
  // ==============================
  return (
    <>
      {toast && <div className="toast fade-in">{toast}</div>}

      <div className="app-container fade-in">
            {/* Header (Mobile) */}
            <header className="header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Package size={22} color="var(--primary)" />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <h1 className="header-title" style={{ fontSize: '1.05rem', lineHeight: '1.2' }}>{getSectorName(sector)}</h1>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{view === 'dashboard' ? 'Visão Geral' : view === 'list' ? 'Lista de Patrimônios' : 'Relatório'}</span>
                </div>
              </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-outline mobile-only" onClick={() => supabase.auth.signOut()} style={{ padding: '6px' }}>
              <LogIn size={16} style={{ transform: 'rotate(180deg)' }}/>
            </button>
            <button className="btn-outline" onClick={() => { setSector(null); setView('list'); setSearch(''); }} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
              <ArrowRightLeft size={14} style={{ marginRight: '6px' }}/> Mudar
            </button>
          </div>
        </header>

        <div className="app-content-wrapper">
          {/* Desktop Left Nav / Mobile Bottom Nav */}
          <nav className="nav-bar">
            <div className="nav-logo desktop-only" style={{ marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Package size={28} color="var(--primary)" />
              <h2 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Registra Bem</h2>
            </div>
            <button className={`nav-item ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}>
              <BarChart3 size={20} /> <span className="nav-label">Visão Geral</span>
            </button>
            <button className={`nav-item ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>
              <List size={20} /> <span className="nav-label">Patrimônios</span>
            </button>
            <button className={`nav-item ${view === 'report' ? 'active' : ''}`} onClick={() => setView('report')}>
              <ClipboardList size={20} /> <span className="nav-label">Relatório</span>
            </button>
            {isAdmin && (
              <button className={`nav-item ${view === 'users' ? 'active' : ''}`} onClick={() => setView('users')}>
                <Users size={20} /> <span className="nav-label">Usuários</span>
              </button>
            )}
            <div className="desktop-only" style={{ marginTop: 'auto', padding: '20px 0', borderTop: '1px solid var(--glass-border)', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', padding: '0 16px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: '700' }}>
                  {session.user.email.charAt(0).toUpperCase()}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{session.user.email}</div>
                  <div style={{ fontSize: '0.7rem', color: isAuthorized ? 'var(--secondary)' : 'var(--warning)' }}>
                    {isAuthorized ? `${getRoleLabel(profile?.role)}` : 'Aguardando Liberação'}
                  </div>
                </div>
              </div>
              <button className="nav-item" onClick={() => supabase.auth.signOut()} style={{ width: '100%', color: 'var(--danger)', justifyContent: 'flex-start' }}>
                <LogIn size={20} style={{ transform: 'rotate(180deg)' }} /> <span className="nav-label">Sair da Conta</span>
              </button>
            </div>
            {/* Desktop Bottom Actions */}
            <div className="desktop-only" style={{ marginTop: 'auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button className="btn btn-outline" onClick={() => { setSector(null); setView('list'); setSearch(''); }}>
                <Building size={18} /> Trocar Setor
              </button>
              {view === 'list' && (
                 <button className="nav-item nav-item-add" onClick={() => setShowAddExtra(true)}>
                   <Plus size={20} /> <span className="nav-label">Registrar Item Extra</span>
                 </button>
              )}
            </div>
          </nav>

          <main className="main-content">
            <div className="desktop-only" style={{ marginBottom: '24px' }}>
              <h1 style={{ fontSize: '1.6rem', fontWeight: '700' }}>
                 {view === 'dashboard' ? 'Visão Geral da Unidade' : view === 'users' ? 'Gerenciamento de Usuários' : (view === 'list' ? 'Lista de Patrimônios Ativos' : 'Relatório de Auditoria')}
              </h1>
              {view !== 'dashboard' && view !== 'users' && <span style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>{getSectorName(sector)}</span>}
              {view === 'users' && <span style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Gerencie os acessos dos usuários cadastrados</span>}
            </div>

            {view === 'users' && isAdmin ? renderUserManagement() : view === 'dashboard' ? renderDashboard() : view === 'report' ? (
              <ReportView
                sectorAssets={sectorAssets}
                reportTab={reportTab}
                setReportTab={setReportTab}
                stats={stats}
                progress={progress}
                onDownloadOds={handleDownloadOds}
              />
            ) : (
            <>
              {/* Stats */}
              <div className="stats-grid">
                <div className="stat-card"><div className="stat-value">{stats.total}</div><div className="stat-label">Total</div></div>
                <div className="stat-card"><div className="stat-value" style={{ color: '#34D399' }}>{stats.confirmed}</div><div className="stat-label">Confirmados</div></div>
                <div className="stat-card"><div className="stat-value" style={{ color: '#FBBF24' }}>{stats.moved}</div><div className="stat-label">Movimentados</div></div>
                <div className="stat-card"><div className="stat-value" style={{ color: '#94A3B8' }}>{stats.pending}</div><div className="stat-label">Pendentes</div></div>
              </div>

              {/* Progress */}
              <div className="progress-section">
                <div className="progress-header">
                  <span className="progress-label">Progresso</span>
                  <span className="progress-value">{progress}%</span>
                </div>
                <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
              </div>

              {/* Search */}
              <div className="search-container">
                <Search className="search-icon" size={18} />
                <input type="text" className="text-input search-input" placeholder="Buscar por nome ou tombamento..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>

              {/* Filter Pills */}
              <div className="filter-pills">
                <button className={`pill ${statusFilter === 'all' ? 'active' : ''}`} onClick={() => setStatusFilter('all')}>Todos ({sectorAssets.length})</button>
                <button className={`pill ${statusFilter === STATUS.PENDING ? 'active' : ''}`} onClick={() => setStatusFilter(STATUS.PENDING)}>Pendentes ({stats.pending})</button>
                <button className={`pill ${statusFilter === STATUS.CONFIRMED ? 'active' : ''}`} onClick={() => setStatusFilter(STATUS.CONFIRMED)}>Confirmados ({stats.confirmed})</button>
                <button className={`pill ${statusFilter === STATUS.MOVED ? 'active' : ''}`} onClick={() => setStatusFilter(STATUS.MOVED)}>Movidos ({stats.moved})</button>
              </div>

              {/* Asset List */}
              <div>
                {filteredAssets.map(asset => (
                  <div key={asset.id} className="asset-card glass-panel" onClick={() => { setSelectedAsset(asset); setNewLocation(asset.location || ''); }}>
                    <div className="asset-header">
                      <h3 className="asset-title">{asset.name.substring(0, 40)}{asset.name.length > 40 ? '...' : ''}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {asset.isExtra && <span className="extra-badge">EXTRA</span>}
                        <span className="asset-id">#{asset.id}</span>
                      </div>
                    </div>
                    <div className="asset-details">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={14} /> {asset.location || 'Local não definido'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <div className={`asset-status ${getStatusClass(asset.status)}`}>
                        {getStatusIcon(asset.status)} {getStatusLabel(asset.status)}
                      </div>
                      {asset.condition && (
                        <span className={`condition-badge condition-${asset.condition.toLowerCase()}`}>{asset.condition}</span>
                      )}
                    </div>
                  </div>
                ))}
                {filteredAssets.length === 0 && (
                  <div className="empty-state">
                    <div className="empty-state-icon"><Search size={40} /></div>
                    Nenhum item encontrado.
                  </div>
                )}
              </div>
            </>
          )}
        </main>

        {/* === ASSET DETAIL SHEET (Inside wrap for desktop layout) === */}
        <div className={`bottom-sheet-overlay desktop-sidebar ${selectedAsset ? 'open' : ''}`} onClick={() => setSelectedAsset(null)}>
          <div className="bottom-sheet" onClick={e => e.stopPropagation()}>
          <div className="sheet-handle" />
          {selectedAsset && (
            <div style={{ paddingBottom: '30px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', gap: '12px' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: '700', lineHeight: '1.3', flex: 1 }}>{selectedAsset.name}</h2>
                <button className="btn-icon" onClick={() => setSelectedAsset(null)}><X size={18} /></button>
              </div>

              <div className="asset-details" style={{ fontSize: '0.95rem', marginBottom: '20px' }}>
                <div><strong>Tombamento:</strong> {selectedAsset.id}</div>
                <div><strong>Nome Sistema:</strong> {selectedAsset.systemName}</div>
                <div><strong>Ano:</strong> {selectedAsset.year}</div>
                <div><strong>Setor:</strong> {selectedAsset.sector}</div>
                {selectedAsset.isExtra && <div><span className="extra-badge">ITEM EXTRA</span></div>}
              </div>

              {/* Status */}
              <div style={{ marginBottom: '20px', padding: '16px', background: 'var(--surface-light)', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>Status</span>
                  <div className={`asset-status ${getStatusClass(selectedAsset.status)}`}>
                    {getStatusIcon(selectedAsset.status)} {getStatusLabel(selectedAsset.status)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {selectedAsset.status === STATUS.PENDING && (
                    <button className="btn btn-success" style={{ flex: 1 }} onClick={handleConfirm}>
                      <CheckCircle size={18} /> Confirmar Presença
                    </button>
                  )}
                  <button
                    className="btn btn-outline"
                    style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 16px', fontSize: '0.95rem', fontWeight: 600 }}
                    onClick={() => { setShowSectorChange(!showSectorChange); setNewSector(''); }}
                  >
                    <ArrowRightLeft size={18} /> Trocar Divisão
                  </button>
                </div>
                {showSectorChange && (
                  <div style={{ marginTop: '12px', padding: '14px', background: 'var(--surface)', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
                    <label className="input-label">Selecione a nova divisão</label>
                    <select
                      className="text-input select-input"
                      value={newSector}
                      onChange={e => setNewSector(e.target.value)}
                    >
                      <option value="">-- Selecionar divisão --</option>
                      {sectors.filter(s => s !== selectedAsset.sector).map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <button
                      className="btn btn-primary"
                      style={{ marginTop: '10px' }}
                      onClick={handleChangeSector}
                      disabled={!newSector || newSector === selectedAsset.sector}
                    >
                      <ArrowRightLeft size={16} /> Confirmar Transferência
                    </button>
                  </div>
                )}
              </div>

              {/* Location */}
              <div style={{ marginBottom: '20px' }}>
                <label className="input-label">Local Exato (Ambiente)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input type="text" className="text-input" value={newLocation} onChange={e => setNewLocation(e.target.value)} placeholder="Ex: Sala 42, Bloco C" />
                  <button
                    className="btn btn-primary"
                    style={{ width: 'auto', padding: '12px 16px', flexShrink: 0 }}
                    onClick={handleUpdateLocation}
                    disabled={!newLocation.trim() || newLocation === selectedAsset.location}
                  >Salvar</button>
                </div>
                {selectedAsset.originalLocation && selectedAsset.location !== selectedAsset.originalLocation && (
                  <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#FBBF24', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertTriangle size={12} /> Original: {selectedAsset.originalLocation}
                  </div>
                )}
              </div>

              {/* Condition */}
              <div style={{ marginBottom: '20px' }}>
                <label className="input-label">Condição do Item</label>
                <select
                  className="text-input select-input"
                  value={selectedAsset.condition || ''}
                  onChange={e => handleConditionChange(e.target.value)}
                >
                  <option value="">-- Selecionar condição --</option>
                  <option value="Bom">✅ Bom</option>
                  <option value="Ruim">⚠️ Ruim</option>
                  <option value="Inservível">❌ Inservível</option>
                </select>
              </div>

              {/* Logs */}
              {selectedAsset.logs && selectedAsset.logs.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '1rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <History size={16} /> Histórico de Movimentação
                  </h3>
                  {selectedAsset.logs.map((log, idx) => (
                    <div key={idx} className="log-item">
                      <div className="log-date">{log.date}</div>
                      <div>De <strong>{log.from}</strong> → <strong>{log.to}</strong></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      </div> {/* End app-content-wrapper */}
      </div> {/* End app-container */}

      {/* Mobile FAB */}
      {view === 'list' && (
        <button className="fab mobile-only" onClick={() => setShowAddExtra(true)} title="Registrar item extra">
          <Plus size={26} />
        </button>
      )}

      {/* === ADD EXTRA SHEET === */}
      <div className={`bottom-sheet-overlay center-modal-desktop ${showAddExtra ? 'open' : ''}`} onClick={() => setShowAddExtra(false)}>
        <div className="bottom-sheet" onClick={e => e.stopPropagation()}>
          <div className="sheet-handle" />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Registrar Bem Não Listado</h2>
            <button className="btn-icon" onClick={() => setShowAddExtra(false)}><X size={18} /></button>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
            Encontrou um bem que não está na lista do seu setor? Registre-o abaixo.
          </p>
          <div className="form-group">
            <label className="input-label">Nº de Tombamento *</label>
            <input type="text" className="text-input" value={extraTombamento} onChange={e => setExtraTombamento(e.target.value)} placeholder="Ex: 123456" />
          </div>
          <div className="form-group">
            <label className="input-label">Nome do Bem (opcional)</label>
            <input type="text" className="text-input" value={extraName} onChange={e => setExtraName(e.target.value)} placeholder="Ex: Cadeira Giratória" />
          </div>
          <div className="form-group">
            <label className="input-label">Localização *</label>
            <input type="text" className="text-input" value={extraLocation} onChange={e => setExtraLocation(e.target.value)} placeholder="Ex: Sala 12, Bloco B" />
          </div>
          <button className="btn btn-primary" onClick={handleAddExtra} style={{ marginTop: '8px' }}>
            <Plus size={18} /> Registrar Item Extra
          </button>
        </div>
      </div>
    </>
  );
}
