/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback } from 'react';
import type { UIState, UIActions, UIContextType, Asset, ReportTab } from '../types';

export type { UIState, UIActions, UIContextType };

const UIContext = createContext<UIContextType | null>(null);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isAddExtraModalOpen, setIsAddExtraModalOpen] = useState(false);
  const [isSectorChangeOpen, setIsSectorChangeOpen] = useState(false);
  const [newLocation, setNewLocation] = useState('');
  const [newSector, setNewSector] = useState('');
  const [extraTombamento, setExtraTombamento] = useState('');
  const [extraName, setExtraName] = useState('');
  const [extraLocation, setExtraLocation] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [reportTab, setReportTab] = useState<ReportTab>('missing');

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const openAsset = useCallback((asset: Asset) => {
    setSelectedAsset(asset);
    setNewLocation(asset.location || '');
  }, []);

  const closeDetailSheet = useCallback(() => {
    setSelectedAsset(null);
  }, []);

  const openAddExtraModal = useCallback(() => {
    setIsAddExtraModalOpen(true);
  }, []);

  const closeAddExtraModal = useCallback(() => {
    setIsAddExtraModalOpen(false);
    setExtraTombamento('');
    setExtraName('');
    setExtraLocation('');
  }, []);

  const openSectorChange = useCallback(() => {
    setIsSectorChangeOpen(true);
  }, []);

  const closeSectorChange = useCallback(() => {
    setIsSectorChangeOpen(false);
    setNewSector('');
  }, []);

  const value: UIContextType = {
    isDetailSheetOpen: selectedAsset !== null,
    selectedAsset,
    setSelectedAsset,
    isAddExtraModalOpen,
    isSectorChangeOpen,
    openSectorChange,
    closeSectorChange,
    newLocation,
    setNewLocation,
    newSector,
    setNewSector,
    extraTombamento,
    setExtraTombamento,
    extraName,
    setExtraName,
    extraLocation,
    setExtraLocation,
    toast,
    reportTab,
    setReportTab,
    openAsset,
    closeDetailSheet,
    openAddExtraModal,
    closeAddExtraModal,
    showToast,
  };

  return (
    <UIContext.Provider value={value}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI(): UIContextType {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used within UIProvider');
  return ctx;
}
