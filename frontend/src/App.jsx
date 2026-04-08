import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, CheckCircle, MapPin, Building, Package, CheckCircle2,
  History, Plus, ClipboardList, Download, ArrowRightLeft,
  X, Clock, Database, List, AlertTriangle, FileSpreadsheet
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
        }));
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

  const handleAddExtra = () => {
    if (!extraTombamento.trim() || !extraLocation.trim()) { showToast('⚠️ Preencha tombamento e local!'); return; }
    if (assets.some(a => a.id.toString() === extraTombamento.trim())) { showToast('⚠️ Tombamento já existe!'); return; }
    const newAsset = {
      id: extraTombamento.trim(), systemName: 'Item Extra (Manual)', sector,
      year: new Date().getFullYear(), name: extraName.trim() || `Bem #${extraTombamento.trim()}`,
      location: extraLocation.trim(), originalLocation: '', status: STATUS.CONFIRMED, isExtra: true,
      logs: [{ date: new Date().toLocaleString('pt-BR'), from: 'Registro Manual', to: extraLocation.trim() }]
    };
    setAssets(prev => [...prev, newAsset]);
    setExtraTombamento(''); setExtraName(''); setExtraLocation('');
    setShowAddExtra(false);
    showToast('✅ Item extra registrado!');
  };



  // === REPORT/EXPORT ===
  const generateReport = () => {
    const t = new Date().toLocaleString('pt-BR');
    const pending = sectorAssets.filter(a => a.status === STATUS.PENDING);
    const moved = sectorAssets.filter(a => a.status === STATUS.MOVED);
    const extras = sectorAssets.filter(a => a.isExtra);
    let r = `══════════════════════════════\n  📋 RELATÓRIO DE AUDITORIA\n  Registra Bem - PRAE/UFC\n══════════════════════════════\n\n`;
    r += `📍 Setor: ${sector}\n📅 Data: ${t}\n📊 Progresso: ${progress}%\n\n`;
    r += `── RESUMO ──────────────────\n  Total: ${stats.total}\n  ✅ Confirmados: ${stats.confirmed}\n  🔄 Movimentados: ${stats.moved}\n  ⏳ Pendentes: ${stats.pending}\n`;
    if (stats.extras > 0) r += `  ➕ Extras: ${stats.extras}\n`;
    r += `\n`;
    if (pending.length) { r += `── BENS NÃO VERIFICADOS ────\n`; pending.forEach((it, i) => { r += `  ${i + 1}. #${it.id} - ${it.name}\n`; if (it.location) r += `     📍 Local: ${it.location}\n`; }); r += `\n`; }
    if (moved.length) { r += `── BENS MOVIMENTADOS ───────\n`; moved.forEach((it, i) => { r += `  ${i + 1}. #${it.id} - ${it.name}\n     De: ${it.originalLocation || 'N/D'} → Para: ${it.location}\n`; }); r += `\n`; }
    if (extras.length) { r += `── ITENS EXTRAS ────────────\n`; extras.forEach((it, i) => { r += `  ${i + 1}. #${it.id} - ${it.name}\n     📍 ${it.location}\n`; }); r += `\n`; }
    r += `══════════════════════════════\nGerado por Registra Bem v2.0\n`;
    return r;
  };



  const handleDownload = () => {
    const blob = new Blob([generateReport()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `relatorio_${sector.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
    a.click(); URL.revokeObjectURL(url);
    showToast('📥 Relatório baixado!');
  };

  const handleBackupJson = () => {
    const blob = new Blob([JSON.stringify({ sector, exportDate: new Date().toISOString(), assets: sectorAssets }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `backup_${sector.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    a.click(); URL.revokeObjectURL(url);
    showToast('💾 Backup JSON salvo!');
  };

  const handleDownloadOds = () => {
    const rows = sectorAssets.map(a => ({
      'Tombamento': a.id,
      'Nome': a.name,
      'Nome Sistema': a.systemName,
      'Setor': a.sector,
      'Ano': a.year,
      'Localização Atual': a.location || '',
      'Localização Original': a.originalLocation || '',
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
    const filteredSectors = sectors.filter(s => s.toLowerCase().includes(search.toLowerCase()));
    return (
      <div className="app-container fade-in">
        <div className="main-content" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100vh', padding: '40px 20px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ display: 'inline-flex', padding: '16px', background: 'linear-gradient(135deg, var(--primary), #7C3AED)', borderRadius: '24px', marginBottom: '20px' }}>
              <Package size={48} color="white" />
            </div>
            <h1 className="header-title" style={{ fontSize: '2.2rem', marginBottom: '8px' }}>Registra Bem</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Gestão Inteligente de Patrimônio</p>
          </div>



          <div className="glass-panel" style={{ padding: '20px' }}>
            <h2 style={{ marginBottom: '16px', fontSize: '1.1rem', textAlign: 'center' }}>Selecione seu Setor</h2>
            <div className="search-container" style={{ marginBottom: '12px' }}>
              <Search className="search-icon" size={18} />
              <input type="text" className="text-input search-input" placeholder="Buscar setor..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="sector-list" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
              {filteredSectors.map(s => {
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
              {filteredSectors.length === 0 && <div className="empty-state">Nenhum setor encontrado.</div>}
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
          <button className="export-btn" onClick={handleDownload}><Download size={16} /> Baixar .txt</button>
          <button className="export-btn" onClick={handleBackupJson}><Database size={16} /> Backup JSON</button>
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
  // MAIN RENDER
  // ==============================
  return (
    <>
      {toast && <div className="toast fade-in">{toast}</div>}

      <div className="app-container fade-in">
        {/* Header */}
        <header className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Package size={22} color="var(--primary)" />
            <h1 className="header-title">{view === 'list' ? 'Registra Bem' : 'Relatório'}</h1>
          </div>
          <button className="btn-outline" onClick={() => { setSector(null); setView('list'); setSearch(''); }}>
            Trocar Setor
          </button>
        </header>

        <div className="app-content-wrapper">
          <main className="main-content">
            {view === 'report' ? renderReport() : (
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
                    <div className={`asset-status ${getStatusClass(asset.status)}`}>
                      {getStatusIcon(asset.status)} {getStatusLabel(asset.status)}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: selectedAsset.status === STATUS.PENDING ? '14px' : '0' }}>
                  <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>Status</span>
                  <div className={`asset-status ${getStatusClass(selectedAsset.status)}`}>
                    {getStatusIcon(selectedAsset.status)} {getStatusLabel(selectedAsset.status)}
                  </div>
                </div>
                {selectedAsset.status === STATUS.PENDING && (
                  <button className="btn btn-success" onClick={handleConfirm}>
                    <CheckCircle size={20} /> Confirmar Presença do Item
                  </button>
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

      {/* Bottom Nav */}
      <nav className="nav-bar">
        <button className={`nav-item ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>
          <List size={20} /> Patrimônios
        </button>
        <button className={`nav-item ${view === 'report' ? 'active' : ''}`} onClick={() => setView('report')}>
          <ClipboardList size={20} /> Relatório
        </button>
      </nav>

      {/* FAB */}
      {view === 'list' && (
        <button className="fab" onClick={() => setShowAddExtra(true)} title="Registrar item extra">
          <Plus size={26} />
        </button>
      )}

      {/* === ADD EXTRA SHEET === */}
      <div className={`bottom-sheet-overlay ${showAddExtra ? 'open' : ''}`} onClick={() => setShowAddExtra(false)}>
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
