import {
  CheckCircle, ArrowRightLeft, X, History, AlertTriangle, Copy
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { STATUS, SECTOR_OPTIONS, assetMatchesProfileSector } from '../constants';
import { getStatusClass, getStatusIcon, getStatusLabel } from '../utils/assetStatus';

export default function AssetDetailSheet() {
  const {
    selectedAsset, setSelectedAsset, sector,
    newLocation, setNewLocation,
    showSectorChange, setShowSectorChange, newSector, setNewSector,
    handleConfirm, handleUpdateLocation, handleChangeSector, handleConditionChange, handleUndoRegistration,
    handleConfirmRecebimento, handleRejectTransfer, handleUndoValidation,
  } = useInventory();

  const userMatchesAssetSector = selectedAsset && sector && assetMatchesProfileSector(selectedAsset.sector, sector);
  const isMoved = selectedAsset && selectedAsset.status === STATUS.MOVED;
  const isReceiver = isMoved && userMatchesAssetSector;
  const canUserVerify = selectedAsset && (selectedAsset.status === STATUS.PENDING || (selectedAsset.status === STATUS.MOVED && !userMatchesAssetSector));

  return (
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
              <div>
                <strong>Tombamento:</strong>{' '}
                <span
                  className="tombamento-badge bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-md flex items-center gap-1.5 text-sm font-medium hover:bg-blue-100 cursor-pointer transition-colors w-fit"
                  title="Clique para copiar"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigator.clipboard.writeText(String(selectedAsset.id)); }}
                >
                  #{selectedAsset.id} <Copy size={14} />
                </span>
              </div>
              <div><strong>Nome Sistema:</strong> {selectedAsset.systemName}</div>
              <div><strong>Ano:</strong> {selectedAsset.year}</div>
              <div><strong>Setor:</strong> {selectedAsset.sector}</div>
              {selectedAsset.isExtra && <div><span className="extra-badge">ITEM EXTRA</span></div>}
            </div>

            <div style={{ marginBottom: '20px', padding: '16px', background: 'var(--surface-light)', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>Status</span>
                <div className={`asset-status ${getStatusClass(selectedAsset.status)}`}>
                  {getStatusIcon(selectedAsset.status)} {getStatusLabel(selectedAsset.status)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {isReceiver ? (
                  <div style={{ flex: 1 }}>
                    <div style={{ padding: '12px', background: 'var(--surface)', borderRadius: 8, marginBottom: 8 }}>
                      Este item foi transferido para o seu setor.
                    </div>
                    {selectedAsset.validation ? (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <span className={`condition-badge condition-${selectedAsset.validation.toLowerCase()}`} style={{ alignSelf: 'center' }}>{selectedAsset.validation}</span>
                        <button type="button" className="btn btn-outline" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleUndoValidation(selectedAsset.id); }}>Desfazer Validação</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button type="button" className="btn btn-success" style={{ flex: 1 }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleConfirmRecebimento(selectedAsset.id); }}>Confirmar Recebimento</button>
                        <button type="button" className="btn btn-danger" style={{ flex: 1 }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRejectTransfer(selectedAsset.id); }}>Rejeitar Transferência</button>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {canUserVerify && (
                      <button type="button" className="btn btn-success" style={{ flex: 1 }} onClick={handleConfirm}>
                        <CheckCircle size={18} /> Confirmar Presença
                      </button>
                    )}
                    {!canUserVerify && selectedAsset.status !== STATUS.PENDING && (
                      <button
                        type="button"
                        className="btn btn-danger"
                        style={{ flex: 1 }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (window.confirm('Deseja realmente desfazer o registro deste bem?')) {
                            handleUndoRegistration(selectedAsset.id);
                          }
                        }}
                      >
                        <X size={16} /> Desfazer Lançamento
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 16px', fontSize: '0.95rem', fontWeight: 600 }}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowSectorChange(!showSectorChange); setNewSector(''); }}
                    >
                      <ArrowRightLeft size={18} /> Trocar Divisão
                    </button>
                  </>
                )}
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
                    {SECTOR_OPTIONS.filter(s => s !== selectedAsset.sector).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ marginTop: '10px' }}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleChangeSector(); }}
                    disabled={!newSector || newSector === selectedAsset.sector}
                  >
                    <ArrowRightLeft size={16} /> Confirmar Transferência
                  </button>
                </div>
              )}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label className="input-label">Local Exato (Ambiente)</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="text" className="text-input" value={newLocation} onChange={e => setNewLocation(e.target.value)} placeholder="Ex: Sala 42, Bloco C" />
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ width: 'auto', padding: '12px 16px', flexShrink: 0 }}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleUpdateLocation(); }}
                  disabled={!newLocation.trim() || newLocation === selectedAsset.location}
                >Salvar</button>
              </div>
              {selectedAsset.originalLocation && selectedAsset.location !== selectedAsset.originalLocation && (
                <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#FBBF24', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertTriangle size={12} /> Original: {selectedAsset.originalLocation}
                </div>
              )}
            </div>

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
  );
}
