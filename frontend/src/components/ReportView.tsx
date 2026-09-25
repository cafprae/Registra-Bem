import { CheckCircle, FileSpreadsheet, MapPin, Calendar, Hash } from 'lucide-react';
import { STATUS } from '../constants';

const statusConfig = {
  pending: { label: 'Pendente', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  novo: { label: 'Novo', color: 'bg-violet-100 text-violet-800 border-violet-200' },
  aberto: { label: 'Aberto', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  in_progress: { label: 'Em Andamento', color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  completed: { label: 'Concluído', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  cancelled: { label: 'Cancelado', color: 'bg-slate-100 text-slate-600 border-slate-200' },
};

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
  const novo = sectorAssets.filter(asset => asset.status === 'novo');
  const aberto = sectorAssets.filter(asset => asset.status === 'aberto');

  const getTabData = () => {
    switch (reportTab) {
      case 'missing': return pending;
      case 'moved': return moved;
      case 'extras': return extras;
      case 'novo': return novo;
      case 'aberto': return aberto;
      default: return pending;
    }
  };

  const tabData = getTabData();

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

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
        <button className={`pill ${reportTab === 'novo' ? 'active' : ''}`} onClick={() => setReportTab('novo')}>
          Novo <span className="pill-count">({novo.length})</span>
        </button>
        <button className={`pill ${reportTab === 'aberto' ? 'active' : ''}`} onClick={() => setReportTab('aberto')}>
          Aberto <span className="pill-count">({aberto.length})</span>
        </button>
        <button className={`pill ${reportTab === 'moved' ? 'active' : ''}`} onClick={() => setReportTab('moved')}>
          Movimentados <span className="pill-count">({moved.length})</span>
        </button>
        <button className={`pill ${reportTab === 'extras' ? 'active' : ''}`} onClick={() => setReportTab('extras')}>
          Extras <span className="pill-count">({extras.length})</span>
        </button>
      </div>

      {/* Desktop Table - Hidden on mobile */}
      <div className="hidden md:block">
        {tabData.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><CheckCircle size={40} /></div>
            Nenhum item nesta categoria.
          </div>
        ) : (
          <div className="glass-panel overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Patrimônio</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Local</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {tabData.map(item => (
                  <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{item.name.substring(0, 40)}{item.name.length > 40 ? '...' : ''}</div>
                      <div className="text-xs text-slate-500">#{item.id}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div className="flex items-center gap-1">
                        <MapPin size={14} className="text-slate-400" />
                        {item.location || 'N/D'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${statusConfig[item.status]?.color || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {statusConfig[item.status]?.label || item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mobile Cards - Hidden on desktop */}
      <div className="block md:hidden flex flex-col space-y-4">
        {tabData.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><CheckCircle size={40} /></div>
            Nenhum item nesta categoria.
          </div>
        ) : (
          tabData.map(item => (
            <div
              key={item.id}
              className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 active:scale-[0.98] transition-transform cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Hash size={14} className="text-slate-400" />
                  <span className="font-semibold text-slate-900">#{item.id}</span>
                </div>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${statusConfig[item.status]?.color || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                  {statusConfig[item.status]?.label || item.status}
                </span>
              </div>

              <div className="mb-3">
                <h3 className="font-medium text-slate-900 mb-1">{item.name}</h3>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <MapPin size={14} className="text-slate-400" />
                  {item.location || 'Local não definido'}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Calendar size={12} />
                  Criado em {formatDate(item.created_at || new Date().toISOString())}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
