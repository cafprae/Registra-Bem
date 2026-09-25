const fs = require('fs');
const p = 'c:\\Users\\speed\\OneDrive - Universidade Federal do Ceará\\Aplicativos\\Registra Bem\\frontend\\src\\components\\ReportView.tsx';

const newContent = `import { CheckCircle, FileSpreadsheet, MapPin, Calendar, Hash } from 'lucide-react';
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
        <div className="progress-bar"><div className="progress-fill" style={{ width: \`\${progress}%\` }} /></div>
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
        <button className={\`pill \${reportTab === 'missing' ? 'active' : ''}\`} onClick={() => setReportTab('missing')}>
          Faltantes <span className="pill-count">({pending.length})</span>
        </button>
        <button className={\`pill \${reportTab === 'novo' ? 'active' : ''}\`} onClick={() => setReportTab('novo')}>
          Novo <span className="pill-count">({novo.length})</span>
        </button>
        <button className={\`pill \${reportTab === 'aberto' ? 'active' : ''}\`} onClick={() => setReportTab('aberto')}>
          Aberto <span className="pill-count">({aberto.length})</span>
        </button>
        <button className={\`pill \${reportTab === 'moved' ? 'active' : ''}\`} onClick={() => setReportTab('moved')}>
          Movimentados <span className="pill-count">({moved.length})</span>
        </button>
        <button className={\`pill \${reportTab === 'extras' ? 'active' : ''}\`} onClick={() => setReportTab('extras')}>
          Extras <span className="pill-count">({extras.length})</span>
        </button>
      </div>
`;

fs.writeFileSync(p, newContent, 'utf8');
console.log('Part 1 done!', newContent.length);
