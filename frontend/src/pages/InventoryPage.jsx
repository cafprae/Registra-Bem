import { Search, MapPin, Copy } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { STATUS } from '../constants';
import { getStatusClass, getStatusIcon, getStatusLabel } from '../utils/assetStatus';

export default function InventoryPage() {
  const {
    sectorAssets, filteredAssets, stats, progress,
    search, setSearch, statusFilter, setStatusFilter,
    conditionFilter, setConditionFilter,
    openAsset,
  } = useInventory();

  const countBom = sectorAssets.filter(a => a.condition === 'Bom').length;
  const countRuim = sectorAssets.filter(a => a.condition === 'Ruim').length;
  const countInservivel = sectorAssets.filter(a => a.condition === 'Inservível').length;

  return (
    <div className="fade-in">
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-value">{stats.total}</div><div className="stat-label">Total</div></div>
        <div className="stat-card"><div className="stat-value" style={{ color: '#34D399' }}>{stats.confirmed}</div><div className="stat-label">Confirmados</div></div>
        <div className="stat-card"><div className="stat-value" style={{ color: '#FBBF24' }}>{stats.moved}</div><div className="stat-label">Movimentados</div></div>
        <div className="stat-card"><div className="stat-value" style={{ color: '#94A3B8' }}>{stats.pending}</div><div className="stat-label">Pendentes</div></div>
      </div>

      <div className="progress-section">
        <div className="progress-header">
          <span className="progress-label">Progresso</span>
          <span className="progress-value">{progress}%</span>
        </div>
        <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
      </div>

      <div className="search-container">
        <Search className="search-icon" size={18} />
        <input
          type="text"
          className="text-input search-input"
          placeholder="Buscar por nome ou tombamento..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="filter-pills">
        <button className={`pill ${statusFilter === 'all' ? 'active' : ''}`} onClick={() => { setStatusFilter('all'); setConditionFilter('all'); }}>Todos ({sectorAssets.length})</button>
        <button className={`pill ${statusFilter === STATUS.PENDING ? 'active' : ''}`} onClick={() => { setStatusFilter(STATUS.PENDING); setConditionFilter('all'); }}>Pendentes ({stats.pending})</button>
        <button className={`pill ${statusFilter === STATUS.CONFIRMED ? 'active' : ''}`} onClick={() => { setStatusFilter(STATUS.CONFIRMED); setConditionFilter('all'); }}>Confirmados ({stats.confirmed})</button>
        <button className={`pill ${statusFilter === STATUS.MOVED ? 'active' : ''}`} onClick={() => { setStatusFilter(STATUS.MOVED); setConditionFilter('all'); }}>Movidos ({stats.moved})</button>

        <div style={{ width: '8px' }} />

        <button className={`pill ${conditionFilter === 'Bom' ? 'active' : ''}`} onClick={() => { setConditionFilter('Bom'); setStatusFilter('all'); }}>Bom ({countBom})</button>
        <button className={`pill ${conditionFilter === 'Ruim' ? 'active' : ''}`} onClick={() => { setConditionFilter('Ruim'); setStatusFilter('all'); }}>Ruim ({countRuim})</button>
        <button className={`pill ${conditionFilter === 'Inservível' ? 'active' : ''}`} onClick={() => { setConditionFilter('Inservível'); setStatusFilter('all'); }}>Inservível ({countInservivel})</button>
      </div>

      <div>
        {filteredAssets.map(asset => (
          <div key={asset.id} className="asset-card glass-panel" onClick={() => openAsset(asset)}>
            <div className="asset-header">
              <h3 className="asset-title">{asset.name.substring(0, 40)}{asset.name.length > 40 ? '...' : ''}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {asset.isExtra && <span className="extra-badge">EXTRA</span>}
                <span
                  className="tombamento-badge bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-md flex items-center gap-1.5 text-sm font-medium hover:bg-blue-100 cursor-pointer transition-colors w-fit"
                  title="Clique para copiar"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigator.clipboard.writeText(String(asset.id)); }}
                >
                  #{asset.id} <Copy size={14} />
                </span>
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
    </div>
  );
}
