import { Plus, X } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';

export default function AddExtraModal() {
  const {
    showAddExtra, setShowAddExtra,
    extraTombamento, setExtraTombamento,
    extraName, setExtraName,
    extraLocation, setExtraLocation,
    handleAddExtra,
  } = useInventory();

  return (
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
  );
}
