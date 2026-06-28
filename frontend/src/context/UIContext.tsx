/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback } from 'react';

export interface UIState {
  isDetailSheetOpen: boolean;
  selectedAsset: import('../types').Asset | null;
  isAddExtraModalOpen: boolean;
  isSectorChangeOpen: boolean;
  newLocation: string;
  newSector: string;
  extraTombamento: string;
  extraName: string;
  extraLocation: string;
  toast: string | null;
  reportTab: import('../types').ReportTab;
}

export interface UIActions {
  openAsset: (asset: import('../types').Asset) => void;
  closeDetailSheet: () => void;
  setNewLocation: (location: string) => void;
  setNewSector: (sector: string) => void;
  openAddExtraModal: () => void;
  closeAddExtraModal: () => void;
  setExtraTombamento: (tombamento: string) => void;
  setExtraName: (name: string) => void;
  setExtraLocation: (location: string) => void;
  setReportTab: (tab: import('../types').ReportTab) => void;
  showToast: (msg: string) => void;
  openSectorChange: () => void;
  closeSectorChange: () => void;
}

export type UIContextType = UIState & UIActions;

const UIContext = createContext<UIContextType | null>(null);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [selectedAsset, setSelectedAsset] = useState<import('../types').Asset | null>(null);
  const [isAddExtraModalOpen, setIsAddExtraModalOpen] = useState(false);
  const [isSectorChangeOpen, setIsSectorChangeOpen] = useState(false);
  const [newLocation, setNewLocation] = useState('');
  const [newSector, setNewSector] = useState('');
  const [extraTombamento, setExtraTombamento] = useState('');
  const [extraName, setExtraName] = useState('');
  const [extraLocation, setExtraLocation] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [reportTab, setReportTab] = useState<import('../types').ReportTab>('missing');

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const openAsset = useCallback((asset: import('../types').Asset) => {
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
    isAddExtraModalOpen,
    isSectorChangeOpen,
    newLocation,
    newSector,
    extraTombamento,
    extraName,
    extraLocation,
    toast,
    reportTab,
    openAsset,
    closeDetailSheet,
    setNewLocation,
    setNewSector,
    openAddExtraModal,
    closeAddExtraModal,
    setExtraTombamento,
    setExtraName,
    setExtraLocation,
    setReportTab,
    showToast,
    openSectorChange,
    closeSectorChange,
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
