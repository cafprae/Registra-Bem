import { CheckCircle, FileSpreadsheet, MapPin } from 'lucide-react';
import { STATUS } from '../constants';

export default function ReportView({
  sectorAssets,
  reportTab,
  setReportTab,
  stats,
  progress,
  onDownloadOds,
}) {
  const pending = sectorAssets.filter(asset => asset.status === STATUS.PENDING);
  const moved = sectorAssets.filter(asset => asset.status === STATUS.MOVED);
  const extras = sectorAssets.filter(asset => asset.isExtra);
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
        <button className="export-btn" onClick={onDownloadOds}><FileSpreadsheet size={16} /> Baixar ODS</button>
      </div>

      <div className="filter-pills">
        <button className={`pill ${reportTab === 'missing' ? 'active' : ''}`} onClick={() => setReportTab('missing')}>
          Faltantes <span className="pill-count">({pending.length})</span>
        </button>
        <button className={`pill ${reportTab === 'moved' ? 'active' : ''}`} onClick={() => setReportTab('moved')}>
          Movimentados <span className="pill-count">({moved.length})</span>
        </button>
        <button className={`pill ${reportTab === 'extras' ? 'active' : ''}`} onClick={() => setReportTab('extras')}>
          Extras <span className="pill-count">({extras.length})</span>
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
                <MapPin size={12} /> {item.originalLocation || 'N/D'} {'->'} {item.location}
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
}
