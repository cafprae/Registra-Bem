import { Building, Package } from 'lucide-react';
import { getSectorName, STATUS } from '../constants';

export default function SectorSelector({ assets, sectors, onSelectSector }) {
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
            {sectors.map(sector => {
              const sectorItems = assets.filter(asset => asset.sector === sector);
              const done = sectorItems.filter(asset => asset.status !== STATUS.PENDING).length;
              return (
                <button key={sector} className="sector-btn" onClick={() => onSelectSector(sector)}>
                  <Building size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                  <span className="sector-btn-name">{getSectorName(sector)}</span>
                  <span className="sector-btn-count">{done}/{sectorItems.length}</span>
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

