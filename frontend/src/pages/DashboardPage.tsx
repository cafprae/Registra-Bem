// @ts-nocheck
import { Building, Database } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { getSectorName, STATUS } from '../constants';
import { Navigate } from 'react-router-dom';

export default function DashboardPage() {
  const { assets, sectors, openAsset, profile, authLoading, isAdmin } = useInventory();

  const userRole = profile?.role?.toLowerCase();
  if (!authLoading && !isAdmin && userRole !== 'gestor') {
    return <Navigate to="/inventory" replace />;
  }

  const totalAssets = assets.length;
  const globalConfirmed = assets.filter(a => a.status === STATUS.CONFIRMED).length;
  const globalMoved = assets.filter(a => a.status === STATUS.MOVED).length;
  const globalPending = assets.filter(a => a.status === STATUS.PENDING).length;

  const condBom = assets.filter(a => a.condition === 'Bom').length;
  const condRuim = assets.filter(a => a.condition === 'Ruim').length;
  const condInservivel = assets.filter(a => a.condition === 'Inserv├¡vel').length;
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
    let cat = a.name.split('-')[0].trim().split(' ').slice(0, 2).join(' ').toUpperCase();
    if (!cat) cat = 'OUTROS';
    itemsCount[cat] = (itemsCount[cat] || 0) + 1;
  });
  const topCategories = Object.entries(itemsCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

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
        <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '16px' }}>Sa├║de e Condi├º├úo (Itens Verificados)</h3>
        <div className="chart-bar-horizontal">
          {condBom > 0 && <div className="chart-segment" style={{ width: `${(condBom / globalDone) * 100}%`, background: '#34D399' }} />}
          {condRuim > 0 && <div className="chart-segment" style={{ width: `${(condRuim / globalDone) * 100}%`, background: '#FBBF24' }} />}
          {condInservivel > 0 && <div className="chart-segment" style={{ width: `${(condInservivel / globalDone) * 100}%`, background: '#EF4444' }} />}
          {condNaoAvaliado > 0 && globalDone > 0 && <div className="chart-segment" style={{ width: `${(condNaoAvaliado / globalDone) * 100}%`, background: '#334155' }} />}
        </div>
        <div className="chart-legend" style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '0.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '10px', height: '10px', background: '#34D399', borderRadius: '2px' }} /> Bom ({condBom})</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '10px', height: '10px', background: '#FBBF24', borderRadius: '2px' }} /> Ruim ({condRuim})</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '10px', height: '10px', background: '#EF4444', borderRadius: '2px' }} /> Inserv├¡vel ({condInservivel})</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '10px', height: '10px', background: '#334155', borderRadius: '2px' }} /> S/ Avalia├º├úo ({condNaoAvaliado})</div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '16px' }}>Progresso por Divis├úo (Setor)</h3>
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
          Invent├írio Geral (Todos os Setores)
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Vis├úo gerencial completa de todos os {totalAssets} patrim├┤nios cadastrados na unidade.
        </p>
        <div style={{ height: '400px', overflowY: 'auto', paddingRight: '8px', border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--surface)' }}>
          {[...assets].sort((a, b) => a.sector.localeCompare(b.sector) || a.name.localeCompare(b.name)).map(item => (
            <div
              key={item.id}
              className="report-item"
              style={{ cursor: 'pointer', margin: 0, padding: '12px', borderRadius: 0, borderBottom: '1px solid var(--glass-border)' }}
              onClick={() => openAsset(item)}
            >
              <div className="report-item-header">
                <span className="report-item-name">{item.name.substring(0, 45)}{item.name.length > 45 ? '...' : ''}</span>
                <span className="report-item-id">#{item.id}</span>
              </div>
              <div className="report-item-detail" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                <span style={{ color: 'var(--primary)' }}><Building size={12} style={{ marginRight: '4px' }} /> {item.sector}</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {item.condition && <span>­ƒöº {item.condition}</span>}
                  <span style={{ color: item.status === STATUS.PENDING ? '#94A3B8' : item.status === STATUS.CONFIRMED ? '#34D399' : '#FBBF24' }}>
                    {item.status === STATUS.PENDING ? 'ÔÅ│ PENDENTE' : item.status === STATUS.CONFIRMED ? 'Ô£à CONFIRMADO' : '­ƒöä MOVIDO'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
