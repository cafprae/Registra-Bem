import type { Session, User } from '@supabase/supabase-js';
import type { ReactNode, Dispatch, SetStateAction } from 'react';

// =============================================================================
// Database Types (Supabase)
// =============================================================================

export type UserRole = 'admin' | 'editor' | 'viewer' | 'agente' | 'gestor' | 'coordenador';

export type AssetStatus = 'confirmed' | 'moved' | 'pending';

export type AssetCondition = 'Bom' | 'Ruim' | 'Inservível' | '';

export type ReportTab = 'missing' | 'moved' | 'extras';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  sector: string | null;
  updated_at: string;
}

export interface AssetLog {
  date: string;
  from: string;
  to: string;
}

export interface Asset {
  id: number;
  tombamento: number;
  name: string;
  systemName: string;
  sector: string;
  year: number;
  location: string;
  originalLocation: string;
  status: AssetStatus;
  condition: AssetCondition;
  isExtra: boolean;
  logs: AssetLog[];
  validation?: string;
}

// Supabase raw row types
export interface AssetRow {
  tombamento: number;
  nome: string | null;
  local_sistema: string | null;
  local_exato_ambiente: string | null;
  situacao: string | null;
  condicao: string | null;
  nome_sistema: string | null;
  validacao?: unknown;
}

export interface ProfileRow {
  id: string;
  full_name: string;
  role: string;
  sector: string | null;
  updated_at: string;
}

// =============================================================================
// Stats Types
// =============================================================================

export interface Stats {
  total: number;
  confirmed: number;
  moved: number;
  pending: number;
  extras: number;
}

export interface SectorStat {
  name: string;
  total: number;
  done: number;
  progress: number;
}

// =============================================================================
// Context Types
// =============================================================================

export interface UIState {
  isDetailSheetOpen: boolean;
  selectedAsset: Asset | null;
  isAddExtraModalOpen: boolean;
  isSectorChangeOpen: boolean;
  newLocation: string;
  newSector: string;
  extraTombamento: string;
  extraName: string;
  extraLocation: string;
  toast: string | null;
  reportTab: ReportTab;
}

export interface UIActions {
  openAsset: (asset: Asset) => void;
  closeDetailSheet: () => void;
  setSelectedAsset: (asset: Asset | null) => void;
  setNewLocation: Dispatch<SetStateAction<string>>;
  setNewSector: Dispatch<SetStateAction<string>>;
  openAddExtraModal: () => void;
  closeAddExtraModal: () => void;
  openSectorChange: () => void;
  closeSectorChange: () => void;
  setExtraTombamento: Dispatch<SetStateAction<string>>;
  setExtraName: Dispatch<SetStateAction<string>>;
  setExtraLocation: Dispatch<SetStateAction<string>>;
  setReportTab: Dispatch<SetStateAction<ReportTab>>;
  showToast: (msg: string) => void;
}

export type UIContextType = UIState & UIActions;

export interface FilterState {
  search: string;
  statusFilter: string;
  conditionFilter: string;
}

export interface FilterActions {
  setSearch: Dispatch<SetStateAction<string>>;
  setStatusFilter: Dispatch<SetStateAction<string>>;
  setConditionFilter: Dispatch<SetStateAction<string>>;
  clearFilters: () => void;
}

export type FilterContextType = FilterState & FilterActions;

export interface InventoryState {
  session: Session | null;
  profile: Profile | null;
  authLoading: boolean;
  isAdmin: boolean;
  isAuthorized: boolean;
  assets: Asset[];
  sector: string | null;
  sectorStorage: string | null;
  sectors: string[];
  sectorAssets: Asset[];
  stats: Stats;
  progress: number;
}

export interface InventoryActions {
  handleConfirm: () => Promise<void>;
  handleUpdateLocation: () => Promise<void>;
  handleChangeSector: () => Promise<void>;
  handleConditionChange: (condition: string) => void;
  handleUndoRegistration: (tombamento: number) => Promise<void>;
  handleConfirmRecebimento: (tombamento: number) => Promise<void>;
  handleRejectTransfer: (tombamento: number) => Promise<void>;
  handleUndoValidation: (tombamento: number) => Promise<void>;
  handleAddExtra: () => Promise<void>;
  handleDownloadOds: () => void;
}

export type InventoryContextType = InventoryState & InventoryActions;

// =============================================================================
// Component Props Types
// =============================================================================

export interface ReportViewProps {
  sectorAssets: Asset[];
  reportTab: ReportTab;
  setReportTab: Dispatch<SetStateAction<ReportTab>>;
  stats: Stats;
  progress: number;
  onDownloadOds: () => void;
}

export interface UserManagementUser {
  id: string;
  full_name: string;
  role: UserRole;
  sector: string | null;
  updated_at: string;
}
