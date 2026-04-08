import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, CheckCircle, MapPin, Building, Package, CheckCircle2,
  History, Plus, ClipboardList, Download, ArrowRightLeft,
  X, Clock, Database, List, AlertTriangle, FileSpreadsheet, BarChart3
} from 'lucide-react';
import rawData from './data.json';
import * as XLSX from 'xlsx';

const STATUS = { PENDING: 'pending', CONFIRMED: 'confirmed', MOVED: 'moved' };

const initData = () => {
  try {
    const cached = localStorage.getItem('registrabem_data');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.length > 0 && !('status' in parsed[0])) {
        const migrated = parsed.map(item => ({
          ...item,
          status: item.isVerified ? STATUS.CONFIRMED : STATUS.PENDING,
          originalLocation: item.location || '',
          isExtra: false,
          condition: item.condition || '',
        }));
        localStorage.setItem('registrabem_data', JSON.stringify(migrated));
        return migrated;
      }
      // Migrate existing data to add condition field if missing
      if (parsed.length > 0 && !('condition' in parsed[0])) {
        const migrated = parsed.map(item => ({ ...item, condition: item.condition || '' }));
        localStorage.setItem('registrabem_data', JSON.stringify(migrated));
        return migrated;
      }
      return parsed;
    }
  } catch (e) {
    console.warn("Could not read local storage", e);
  }

  const mapped = rawData.map(r => ({
    id: r['Tombamento'],
    systemName: r['Nome Sistema'] || 'Não especificado',
    sector: r['Local Sistema'] || 'Geral',
    year: r['Ano'],
    name: r['Nome'],
    location: r['Ambiente (Local Exato)'] || '',
    originalLocation: r['Ambiente (Local Exato)'] || '',
    status: STATUS.PENDING,
    isExtra: false,
    condition: '',
    logs: []
  }));
  localStorage.setItem('registrabem_data', JSON.stringify(mapped));
  return mapped;
};

export default function App() {
  const [assets, setAssets] = useState(initData);
  const [sector, setSector] = useState(() => localStorage.getItem('registrabem_sector') || null);
  const [search, setSearch] = useState('');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [newLocation, setNewLocation] = useState('');
  const [view, setView] = useState('list');
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
    localStorage.setItem('registrabem_data', JSON.stringify(assets));
  }, [assets]);

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

  // === HANDLERS ===
  const handleConfirm = () => {
    if (!selectedAsset) return;
    const newStatus = (selectedAsset.location && selectedAsset.location !== selectedAsset.originalLocation)
      ? STATUS.MOVED : STATUS.CONFIRMED;
    setAssets(prev => prev.map(a => a.id === selectedAsset.id ? { ...a, status: newStatus } : a));
    setSelectedAsset(prev => ({ ...prev, status: newStatus }));
    showToast(newStatus === STATUS.CONFIRMED ? '✅ Item confirmado!' : '🔄 Marcado como movimentado!');
  };

  const handleUpdateLocation = () => {
    if (!selectedAsset || !newLocation.trim() || newLocation === selectedAsset.location) return;
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
    showToast('📍 Localização atualizada!');
  };

  const handleChangeSector = () => {
    if (!selectedAsset || !newSector || newSector === selectedAsset.sector) return;
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
    showToast('🔄 Divisão alterada!');
  };

  const handleConditionChange = (value) => {
    if (!selectedAsset) return;
    setAssets(prev => prev.map(a =>
      a.id === selectedAsset.id ? { ...a, condition: value } : a
    ));
    setSelectedAsset(prev => ({ ...prev, condition: value }));
    if (value) showToast(`📋 Condição: ${value}`);
  };

  const handleAddExtra = () => {
    if (!extraTombamento.trim() || !extraLocation.trim()) { showToast('⚠️ Preencha tombamento e local!'); return; }
    if (assets.some(a => a.id.toString() === extraTombamento.trim())) { showToast('⚠️ Tombamento já existe!'); return; }
    const newAsset = {
      id: extraTombamento.trim(), systemName: 'Item Extra (Manual)', sector,
      year: new Date().getFullYear(), name: extraName.trim() || `Bem #${extraTombamento.trim()}`,
      location: extraLocation.trim(), originalLocation: '', status: STATUS.CONFIRMED, isExtra: true,
      condition: '',
      logs: [{ date: new Date().toLocaleString('pt-BR'), from: 'Registro Manual', to: extraLocation.trim() }]
    };
    setAssets(prev => [...prev, newAsset]);
    setExtraTombamento(''); setExtraName(''); setExtraLocation('');
    setShowAddExtra(false);
    showToast('✅ Item extra registrado!');
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
  // SECTOR SELECTION SCREEN
  // ==============================
  if (!sector) {
    return (
      <div className="app-container fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div style={{ width: '100%', maxWidth: '500px', padding: '20px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ display: 'inline-flex', padding: '16px', background: 'linear-gradient(135deg, var(--primary), #7C3AED)', borderRadius: '24px', marginBottom: '20px' }}>
              <Package size={48} color="white" />
            </div>
            <h1 className="header-title" style={{ fontSize: '2.2rem', marginBottom: '8px' }}>Registra Bem</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Gestão Inteligente de Patrimônio</p>
          </div>

          <div className="glass-panel" style={{ padding: '24px' }}>
            <h2 style={{ marginBottom: '20px', fontSize: '1.2rem', textAlign: 'center' }}>Selecione sua Divisão</h2>
            <div className="sector-list" style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '8px' }}>
              {sectors.map(s => {
                const si = assets.filter(a => a.sector === s);
                const done = si.filter(a => a.status !== STATUS.PENDING).length;
                return (
                  <button key={s} className="sector-btn" onClick={() => { setSector(s); setSearch(''); }}>
                    <Building size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                    <span className="sector-btn-name">{s}</span>
                    <span className="sector-btn-count">{done}/{si.length}</span>
                  </button>
                );
              })}
              {sectors.length === 0 && <div className="empty-state">Nenhum setor disponível no momento.</div>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==============================
  // REPORT VIEW
  // ==============================
  const renderReport = () => {
    const pending = sectorAssets.filter(a => a.status === STATUS.PENDING);
    const moved = sectorAssets.filter(a => a.status === STATUS.MOVED);
    const extras = sectorAssets.filter(a => a.isExtra);
    const tabData = reportTab === 'missing' ? pending : reportTab === 'moved' ? moved : extras;

    return (
      <>
        <div className="progress-section">
          <div className="progress-header">
            <span className="progress-label">Progresso da Auditoria</span>
            <span className="progress-value">{progress}%</span>
          </div>
          <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
        </div>

        <div className="stats-grid">
          <div className="stat-card"><div className="stat-value">{stats.total}</div><div className="stat-label">Total</div></div>
          <div className="stat-card"><div className="stat-value" style={{ color: '#34D399' }}>{stats.confirmed}</div><div className="stat-label">Confirmados</div></div>
          <div className="stat-card"><div className="stat-value" style={{ color: '#FBBF24' }}>{stats.moved}</div><div className="stat-label">Movimentados</div></div>
          <div className="stat-card"><div className="stat-value" style={{ color: '#94A3B8' }}>{stats.pending}</div><div className="stat-label">Pendentes</div></div>
        </div>

        <div className="export-actions">
          <button className="export-btn" onClick={handleDownloadOds}><FileSpreadsheet size={16} /> Baixar ODS</button>
        </div>

        <div className="filter-pills">
          <button className={`pill ${reportTab === 'missing' ? 'active' : ''}`} onClick={() => setReportTab('missing')}>
            ⏳ Faltantes <span className="pill-count">({pending.length})</span>
          </button>
          <button className={`pill ${reportTab === 'moved' ? 'active' : ''}`} onClick={() => setReportTab('moved')}>
            🔄 Movimentados <span className="pill-count">({moved.length})</span>
          </button>
          <button className={`pill ${reportTab === 'extras' ? 'active' : ''}`} onClick={() => setReportTab('extras')}>
            ➕ Extras <span className="pill-count">({extras.length})</span>
          </button>
        </div>

        <div>
          {tabData.length === 0 && <div className="empty-state"><div className="empty-state-icon"><CheckCircle size={40} /></div>Nenhum item nesta categoria.</div>}
          {tabData.map(item => (
            <div key={item.id} className="report-item">
              <div className="report-item-header">
                <span className="report-item-name">{item.name.substring(0, 45)}{item.name.length > 45 ? '...' : ''}</span>
                <span className="report-item-id">#{item.id}</span>
              </div>
              {reportTab === 'moved' && (
                <div className="report-item-detail">
                  <MapPin size={12} /> {item.originalLocation || 'N/D'} → {item.location}
                </div>
              )}
              {reportTab === 'missing' && item.location && (
                <div className="report-item-detail"><MapPin size={12} /> {item.location}</div>
              )}
              {reportTab === 'extras' && (
                <div className="report-item-detail"><MapPin size={12} /> {item.location}</div>
              )}
            </div>
          ))}
        </div>
      </>
    );
  };

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
                  <strong style={{ color: 'var(--text-main)' }}>{stat.name}</strong>
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
              <div key={item.id} className="report-item" style={{ cursor: 'pointer', borderBottom: '1px solid var(--border)', margin: 0, padding: '12px', borderRadius: 0, border: 'none', borderBottom: '1px solid var(--glass-border)' }} onClick={() => setSelectedAsset(item)}>
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
              <h1 className="header-title" style={{ fontSize: '1.05rem', lineHeight: '1.2' }}>{sector}</h1>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{view === 'dashboard' ? 'Visão Geral' : view === 'list' ? 'Lista de Patrimônios' : 'Relatório'}</span>
            </div>
          </div>
          <button className="btn-outline" onClick={() => { setSector(null); setView('list'); setSearch(''); }} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
            <ArrowRightLeft size={14} style={{ marginRight: '6px' }}/> Mudar
          </button>
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
                 {view === 'dashboard' ? 'Visão Geral da Unidade' : sector}
              </h1>
              {view !== 'dashboard' && <span style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>{view === 'list' ? 'Lista de Patrimônios Ativos' : 'Relatório de Auditoria da Divisão'}</span>}
            </div>

            {view === 'dashboard' ? renderDashboard() : view === 'report' ? renderReport() : (
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
