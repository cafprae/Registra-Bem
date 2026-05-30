/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../supabaseClient';
import { STATUS, assetMatchesProfileSector, getSectorStorageValue } from '../constants';
import { useAssets } from '../hooks/useAssets';
import { useAuthProfile } from '../hooks/useAuthProfile';

const InventoryContext = createContext(null);

export function InventoryProvider({ children }) {
  const { session, profile, authLoading, isAdmin, isAuthorized } = useAuthProfile(supabase);
  const { assets, setAssets } = useAssets(supabase);

  const sector = profile?.sector ?? null;
  const sectorStorage = getSectorStorageValue(sector);

  const [search, setSearch] = useState('');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [newLocation, setNewLocation] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [conditionFilter, setConditionFilter] = useState('all');
  const [showAddExtra, setShowAddExtra] = useState(false);
  const [extraTombamento, setExtraTombamento] = useState('');
  const [extraName, setExtraName] = useState('');
  const [extraLocation, setExtraLocation] = useState('');
  const [toast, setToast] = useState(null);
  const [reportTab, setReportTab] = useState('missing');
  const [showSectorChange, setShowSectorChange] = useState(false);
  const [newSector, setNewSector] = useState('');

  const sectors = useMemo(() => {
    const unique = [...new Set(assets.map(a => a.sector))].sort();
    if (isAdmin) return unique;
    return unique.filter(s => assetMatchesProfileSector(s, sector));
  }, [assets, sector, isAdmin]);

  const sectorAssets = useMemo(() => {
    if (isAdmin) return assets;
    return assets.filter(a => assetMatchesProfileSector(a.sector, sector));
  }, [assets, sector, isAdmin]);

  const filteredAssets = useMemo(() => sectorAssets.filter(a => {
    const matchesSearch = !search ||
      (a.name && a.name.toLowerCase().includes(search.toLowerCase())) ||
      (a.id && a.id.toString().includes(search));
    const matchesCondition = conditionFilter === 'all' || (a.condition && a.condition === conditionFilter);
    // If a condition filter is active, ignore status filter (condition filters act standalone)
    const matchesStatus = conditionFilter !== 'all' ? true : (statusFilter === 'all' || a.status === statusFilter);
    return matchesSearch && matchesCondition && matchesStatus;
  }), [sectorAssets, search, statusFilter, conditionFilter]);

  const stats = useMemo(() => ({
    total: sectorAssets.length,
    confirmed: sectorAssets.filter(a => a.status === STATUS.CONFIRMED).length,
    moved: sectorAssets.filter(a => a.status === STATUS.MOVED).length,
    pending: sectorAssets.filter(a => a.status === STATUS.PENDING).length,
    extras: sectorAssets.filter(a => a.isExtra).length,
  }), [sectorAssets]);

  const progress = stats.total > 0 ? Math.round(((stats.confirmed + stats.moved) / stats.total) * 100) : 0;

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const rollbackAssetChange = useCallback((previousAssets, previousSelected, message = 'Erro ao salvar. Alteração desfeita.') => {
    setAssets(previousAssets);
    setSelectedAsset(previousSelected);
    showToast(message);
  }, [setAssets, showToast]);

  const handleConfirm = async () => {
    if (!selectedAsset) return;
    if (!isAuthorized) {
      showToast('Acesso restrito: apenas agentes autorizados podem editar.');
      return;
    }
    const previousAssets = assets;
    const previousSelected = selectedAsset;
    const newStatus = (selectedAsset.location && selectedAsset.location !== selectedAsset.originalLocation)
      ? STATUS.MOVED : STATUS.CONFIRMED;

    try {
      const { error } = await supabase.from('tabela_inicial')
        .update({ situacao: (newStatus === STATUS.CONFIRMED ? 'Confirmado' : 'Movido') })
        .eq('tombamento', selectedAsset.id);
      if (error) throw error;

      // update frontend state after DB success
      setAssets(prev => prev.map(a => a.id === selectedAsset.id ? { ...a, status: newStatus } : a));
      setSelectedAsset(prev => ({ ...prev, status: newStatus }));
      showToast(newStatus === STATUS.CONFIRMED ? 'Item confirmado!' : 'Marcado como movimentado!');
    } catch (e) {
      console.error('Erro BD', e);
      rollbackAssetChange(previousAssets, previousSelected);
    }
  };

  const handleUpdateLocation = async () => {
    if (!selectedAsset || !newLocation.trim() || newLocation === selectedAsset.location) return;
    if (!isAuthorized) {
      showToast('Acesso restrito: apenas agentes autorizados podem editar.');
      return;
    }
    const previousAssets = assets;
    const previousSelected = selectedAsset;
    const previousLocationInput = newLocation;
    const logEntry = {
      date: new Date().toLocaleString('pt-BR'),
      from: selectedAsset.location || 'Não definido',
      to: newLocation
    };
    const newStatus = (newLocation === selectedAsset.originalLocation) ? STATUS.CONFIRMED : STATUS.MOVED;

    try {
      const { error } = await supabase.from('tabela_inicial')
        .update({ local_exato_ambiente: newLocation, situacao: (newStatus === STATUS.CONFIRMED ? 'Confirmado' : 'Movido') })
        .eq('tombamento', selectedAsset.id);
      if (error) throw error;

      // Update frontend state after DB success
      setAssets(prev => prev.map(a =>
        a.id === selectedAsset.id ? { ...a, location: newLocation, status: newStatus, logs: [logEntry, ...a.logs] } : a
      ));
      setSelectedAsset(prev => ({ ...prev, location: newLocation, status: newStatus, logs: [logEntry, ...prev.logs] }));
      setNewLocation('');
      showToast('Localização atualizada!');
    } catch (e) {
      console.error('Erro BD', e);
      setNewLocation(previousLocationInput);
      rollbackAssetChange(previousAssets, previousSelected);
    }
  };

  const handleChangeSector = async () => {
    if (!selectedAsset || !newSector || newSector === selectedAsset.sector) return;
    if (!isAuthorized) {
      showToast('Acesso restrito: apenas agentes autorizados podem editar.');
      return;
    }
    const previousAssets = assets;
    const previousSelected = selectedAsset;
    const previousNewSector = newSector;
    const previousShowSectorChange = showSectorChange;
    const logEntry = {
      date: new Date().toLocaleString('pt-BR'),
      from: `Divisão: ${selectedAsset.sector}`,
      to: `Divisão: ${newSector}`
    };
    try {
      const storageValue = getSectorStorageValue(newSector);
      const { error } = await supabase.from('tabela_inicial')
        .update({ local_sistema: storageValue, situacao: 'Movido' })
        .eq('tombamento', selectedAsset.id);
      if (error) throw error;

      setAssets(prev => prev.map(a =>
        a.id === selectedAsset.id ? { ...a, sector: newSector, status: STATUS.MOVED, logs: [logEntry, ...a.logs] } : a
      ));
      setSelectedAsset(prev => ({ ...prev, sector: newSector, status: STATUS.MOVED, logs: [logEntry, ...prev.logs] }));
      setShowSectorChange(false);
      setNewSector('');
      showToast('Divisão alterada!');
    } catch (e) {
      console.error('Erro BD', e);
      setNewSector(previousNewSector);
      setShowSectorChange(previousShowSectorChange);
      rollbackAssetChange(previousAssets, previousSelected);
    }
  };

  const handleConditionChange = async (value) => {
    if (!selectedAsset) return;
    if (!isAuthorized) {
      showToast('Acesso restrito: apenas agentes autorizados podem editar.');
      return;
    }
    const previousAssets = assets;
    const previousSelected = selectedAsset;
    setAssets(prev => prev.map(a =>
      a.id === selectedAsset.id ? { ...a, condition: value } : a
    ));
    setSelectedAsset(prev => ({ ...prev, condition: value }));

    try {
      const { error } = await supabase.from('tabela_inicial')
        .update({ condicao: value })
        .eq('tombamento', selectedAsset.id);
      if (error) throw error;
      if (value) showToast(`Condição: ${value}`);
    } catch (e) {
      console.error('Erro BD', e);
      rollbackAssetChange(previousAssets, previousSelected);
    }
  };

  const handleUndoRegistration = async (tombamento) => {
    const assetToUndo = assets.find(a => a.id === tombamento);
    if (!assetToUndo) return showToast('Bem não encontrado.');
    if (!isAuthorized) return showToast('Acesso restrito: apenas agentes autorizados podem editar.');
    const previousAssets = assets;
    const previousSelected = selectedAsset;

    try {
      // Persist reset to DB first to avoid triggering frontend auto-saves
      const { error } = await supabase.from('tabela_inicial')
        .update({ condicao: null, local_exato_ambiente: null, situacao: 'Pendente' })
        .eq('tombamento', tombamento);
      if (error) throw error;

      // Update frontend state after successful DB update
      setAssets(prev => prev.map(a => a.id === tombamento ? { ...a, condition: '', location: '', status: STATUS.PENDING } : a));
      if (selectedAsset && selectedAsset.id === tombamento) {
        setSelectedAsset(prev => ({ ...prev, condition: '', location: '', status: STATUS.PENDING }));
      }

      showToast('Registro desfeito!');
    } catch (e) {
      console.error('Erro BD', e);
      rollbackAssetChange(previousAssets, previousSelected, 'Erro ao desfazer. Alteração desfeita.');
    }
  };

  const handleConfirmRecebimento = async (tombamento) => {
    const asset = assets.find(a => a.id === tombamento);
    if (!asset) return showToast('Bem não encontrado.');
    if (!isAuthorized) return showToast('Acesso restrito: apenas agentes autorizados podem editar.');
    const previousAssets = assets;
    const previousSelected = selectedAsset;

    try {
      const { error } = await supabase.from('tabela_inicial')
        .update({ validacao: 'Confirmada', situacao: 'Confirmado' })
        .eq('tombamento', tombamento);
      if (error) throw error;

      setAssets(prev => prev.map(a => a.id === tombamento ? { ...a, validation: 'Confirmada', status: STATUS.CONFIRMED } : a));
      if (selectedAsset && selectedAsset.id === tombamento) {
        setSelectedAsset(prev => ({ ...prev, validation: 'Confirmada', status: STATUS.CONFIRMED }));
      }
      showToast('Recebimento confirmado!');
    } catch (e) {
      console.error('Erro BD', e);
      rollbackAssetChange(previousAssets, previousSelected);
    }
  };

  const handleRejectTransfer = async (tombamento) => {
    const asset = assets.find(a => a.id === tombamento);
    if (!asset) return showToast('Bem não encontrado.');
    if (!isAuthorized) return showToast('Acesso restrito: apenas agentes autorizados podem editar.');
    const previousAssets = assets;
    const previousSelected = selectedAsset;

    try {
      const { error } = await supabase.from('tabela_inicial')
        .update({ validacao: 'Rejeitada' })
        .eq('tombamento', tombamento);
      if (error) throw error;

      setAssets(prev => prev.map(a => a.id === tombamento ? { ...a, validation: 'Rejeitada' } : a));
      if (selectedAsset && selectedAsset.id === tombamento) {
        setSelectedAsset(prev => ({ ...prev, validation: 'Rejeitada' }));
      }
      showToast('Transferência rejeitada.');
    } catch (e) {
      console.error('Erro BD', e);
      rollbackAssetChange(previousAssets, previousSelected);
    }
  };

  const handleUndoValidation = async (tombamento) => {
    const asset = assets.find(a => a.id === tombamento);
    if (!asset) return showToast('Bem não encontrado.');
    if (!isAuthorized) return showToast('Acesso restrito: apenas agentes autorizados podem editar.');
    const previousAssets = assets;
    const previousSelected = selectedAsset;

    try {
      const { error } = await supabase.from('tabela_inicial')
        .update({ validacao: null })
        .eq('tombamento', tombamento);
      if (error) throw error;

      setAssets(prev => prev.map(a => a.id === tombamento ? { ...a, validation: null } : a));
      if (selectedAsset && selectedAsset.id === tombamento) {
        setSelectedAsset(prev => ({ ...prev, validation: null }));
      }
      showToast('Validação desfeita.');
    } catch (e) {
      console.error('Erro BD', e);
      rollbackAssetChange(previousAssets, previousSelected);
    }
  };

  const handleAddExtra = async () => {
    if (!extraTombamento.trim() || !extraLocation.trim()) { showToast('Preencha tombamento e local.'); return; }
    if (!isAuthorized) {
      showToast('Acesso restrito: apenas agentes autorizados podem editar.');
      return;
    }
    if (assets.some(a => a.id.toString() === extraTombamento.trim())) { showToast('Tombamento já existe.'); return; }
    const previousAssets = assets;
    const previousForm = { extraTombamento, extraName, extraLocation };
    const newAsset = {
      id: extraTombamento.trim(), systemName: 'Item Extra (Manual)', sector: sectorStorage,
      year: new Date().getFullYear(), name: extraName.trim() || `Bem #${extraTombamento.trim()}`,
      location: extraLocation.trim(), originalLocation: '', status: STATUS.CONFIRMED, isExtra: true,
      condition: '',
      logs: [{ date: new Date().toLocaleString('pt-BR'), from: 'Registro Manual', to: extraLocation.trim() }]
    };
    setAssets(prev => [newAsset, ...prev]);
    setShowAddExtra(false);
    setExtraTombamento('');
    setExtraName('');
    setExtraLocation('');

    try {
      const { error } = await supabase.from('tabela_inicial').insert([{
        tombamento: newAsset.id,
        local_sistema: newAsset.sector,
        nome: newAsset.name,
        local_exato_ambiente: newAsset.location,
        condicao: newAsset.condition,
        situacao: (newAsset.status === STATUS.CONFIRMED ? 'Confirmado' : newAsset.status === STATUS.MOVED ? 'Movido' : 'Pendente')
      }]);
      if (error) throw error;
      showToast('Item adicionado!');
    } catch (e) {
      console.error('Erro BD', e);
      setAssets(previousAssets);
      setShowAddExtra(true);
      setExtraTombamento(previousForm.extraTombamento);
      setExtraName(previousForm.extraName);
      setExtraLocation(previousForm.extraLocation);
      showToast('Erro ao salvar. Item extra não foi registrado.');
    }
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
      'Condição': a.condition || '',
      'Status': a.status === STATUS.CONFIRMED ? 'Confirmado' : a.status === STATUS.MOVED ? 'Movido' : 'Pendente',
      'Item Extra': a.isExtra ? 'Sim' : 'Não',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório');
    const sectorSlug = (sectorStorage || 'setor').replace(/\s+/g, '_');
    XLSX.writeFile(wb, `relatorio_${sectorSlug}_${new Date().toISOString().split('T')[0]}.ods`, { bookType: 'ods' });
    showToast('📊 Planilha ODS baixada!');
  };

  const openAsset = useCallback((asset) => {
    setSelectedAsset(asset);
    setNewLocation(asset.location || '');
  }, []);

  const value = {
    session, profile, authLoading, isAdmin, isAuthorized,
    assets, sector, sectorStorage, sectors, sectorAssets,
    search, setSearch, statusFilter, setStatusFilter, filteredAssets,
    conditionFilter, setConditionFilter,
    stats, progress,
    selectedAsset, setSelectedAsset, openAsset,
    newLocation, setNewLocation,
    showSectorChange, setShowSectorChange, newSector, setNewSector,
    showAddExtra, setShowAddExtra,
    extraTombamento, setExtraTombamento, extraName, setExtraName, extraLocation, setExtraLocation,
    reportTab, setReportTab,
    toast, showToast,
    handleConfirm, handleUpdateLocation, handleChangeSector, handleConditionChange, handleUndoRegistration,
    handleConfirmRecebimento, handleRejectTransfer, handleUndoValidation,
    handleAddExtra, handleDownloadOds,
  };

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error('useInventory must be used within InventoryProvider');
  return ctx;
}
