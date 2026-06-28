// @vitest-environment jsdom
// @ts-nocheck - Migração gradual para TypeScript
// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../context/InventoryContext', () => ({
  useInventory: vi.fn(),
}));

vi.mock('../context/UIContext', () => ({
  useUI: vi.fn(),
}));

vi.mock('lucide-react', () => ({
  X: () => <div data-testid="icon-x" />,
  Copy: () => <div data-testid="icon-copy" />,
  Trash2: () => <div data-testid="icon-trash" />,
  Undo: () => <div data-testid="icon-undo" />,
  Save: () => <div data-testid="icon-save" />,
  Check: () => <div data-testid="icon-check" />,
  CheckCircle2: () => <div data-testid="icon-check-circle-2" />,
  ArrowRightLeft: () => <div data-testid="icon-arrow-right-left" />,
  Clock: () => <div data-testid="icon-clock" />,
  AlertTriangle: () => <div data-testid="icon-alert-triangle" />,
  History: () => <div data-testid="icon-history" />
}));

import { useInventory } from '../context/InventoryContext';
import { useUI } from '../context/UIContext';
import AssetDetailSheet from './AssetDetailSheet';

describe('AssetDetailSheet', () => {
  const mockSetSelectedAsset = vi.fn();
  const mockSetNewLocation = vi.fn();
  const mockHandleUndoRegistration = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the asset name correctly', () => {
    useInventory.mockReturnValue({
      sector: 'Test Sector',
      handleConfirm: vi.fn(),
      handleUpdateLocation: vi.fn(),
      handleChangeSector: vi.fn(),
      handleConditionChange: vi.fn(),
      handleUndoRegistration: mockHandleUndoRegistration,
      handleConfirmRecebimento: vi.fn(),
      handleRejectTransfer: vi.fn(),
      handleUndoValidation: vi.fn(),
    });

    useUI.mockReturnValue({
      selectedAsset: { id: 123, tombamento: 123, name: 'Test Asset', systemName: 'Test', sector: 'Test Sector', year: 2024, location: '', originalLocation: '', status: 'confirmed', condition: '', isExtra: false, logs: [] },
      setSelectedAsset: mockSetSelectedAsset,
      newLocation: '',
      setNewLocation: mockSetNewLocation,
      isSectorChangeOpen: false,
      openSectorChange: vi.fn(),
      closeSectorChange: vi.fn(),
      newSector: '',
      setNewSector: vi.fn(),
      isAddExtraModalOpen: false,
      openAddExtraModal: vi.fn(),
      closeAddExtraModal: vi.fn(),
      extraTombamento: '',
      setExtraTombamento: vi.fn(),
      extraName: '',
      setExtraName: vi.fn(),
      extraLocation: '',
      setExtraLocation: vi.fn(),
      toast: null,
      reportTab: 'missing',
      setReportTab: vi.fn(),
      openAsset: vi.fn(),
      closeDetailSheet: vi.fn(),
      showToast: vi.fn(),
    });

    render(<AssetDetailSheet />);

    expect(screen.getByText('Test Asset')).toBeTruthy();
  });

  it('disables the Save button when the location input is empty', () => {
    useInventory.mockReturnValue({
      sector: 'Test Sector',
      handleConfirm: vi.fn(),
      handleUpdateLocation: vi.fn(),
      handleChangeSector: vi.fn(),
      handleConditionChange: vi.fn(),
      handleUndoRegistration: mockHandleUndoRegistration,
      handleConfirmRecebimento: vi.fn(),
      handleRejectTransfer: vi.fn(),
      handleUndoValidation: vi.fn(),
    });

    useUI.mockReturnValue({
      selectedAsset: { id: 123, tombamento: 123, name: 'Test Asset', systemName: 'Test', sector: 'Test Sector', year: 2024, location: 'Sala 1', originalLocation: 'Sala 1', status: 'confirmed', condition: '', isExtra: false, logs: [] },
      setSelectedAsset: mockSetSelectedAsset,
      newLocation: '',
      setNewLocation: mockSetNewLocation,
      isSectorChangeOpen: false,
      openSectorChange: vi.fn(),
      closeSectorChange: vi.fn(),
      newSector: '',
      setNewSector: vi.fn(),
      isAddExtraModalOpen: false,
      openAddExtraModal: vi.fn(),
      closeAddExtraModal: vi.fn(),
      extraTombamento: '',
      setExtraTombamento: vi.fn(),
      extraName: '',
      setExtraName: vi.fn(),
      extraLocation: '',
      setExtraLocation: vi.fn(),
      toast: null,
      reportTab: 'missing',
      setReportTab: vi.fn(),
      openAsset: vi.fn(),
      closeDetailSheet: vi.fn(),
      showToast: vi.fn(),
    });

    render(<AssetDetailSheet />);

    const saveButton = screen.getByRole('button', { name: /Salvar/i });
    expect(saveButton).toBeDisabled();
  });

  it('calls handleUndoRegistration when Delete (Desfazer Lançamento) is clicked and confirmed', () => {
    useInventory.mockReturnValue({
      sector: 'Test Sector',
      handleConfirm: vi.fn(),
      handleUpdateLocation: vi.fn(),
      handleChangeSector: vi.fn(),
      handleConditionChange: vi.fn(),
      handleUndoRegistration: mockHandleUndoRegistration,
      handleConfirmRecebimento: vi.fn(),
      handleRejectTransfer: vi.fn(),
      handleUndoValidation: vi.fn(),
    });

    useUI.mockReturnValue({
      selectedAsset: { id: 123, tombamento: 123, name: 'Test Asset', systemName: 'Test', sector: 'Test Sector', year: 2024, location: 'Sala 1', originalLocation: 'Sala 1', status: 'confirmed', condition: '', isExtra: false, logs: [] },
      setSelectedAsset: mockSetSelectedAsset,
      newLocation: '',
      setNewLocation: mockSetNewLocation,
      isSectorChangeOpen: false,
      openSectorChange: vi.fn(),
      closeSectorChange: vi.fn(),
      newSector: '',
      setNewSector: vi.fn(),
      isAddExtraModalOpen: false,
      openAddExtraModal: vi.fn(),
      closeAddExtraModal: vi.fn(),
      extraTombamento: '',
      setExtraTombamento: vi.fn(),
      extraName: '',
      setExtraName: vi.fn(),
      extraLocation: '',
      setExtraLocation: vi.fn(),
      toast: null,
      reportTab: 'missing',
      setReportTab: vi.fn(),
      openAsset: vi.fn(),
      closeDetailSheet: vi.fn(),
      showToast: vi.fn(),
    });

    const originalConfirm = window.confirm;
    window.confirm = vi.fn(() => true);

    render(<AssetDetailSheet />);

    const deleteButton = screen.getByRole('button', { name: /Desfazer Lançamento/i });
    fireEvent.click(deleteButton);

    expect(window.confirm).toHaveBeenCalled();
    expect(mockHandleUndoRegistration).toHaveBeenCalledWith(123);

    window.confirm = originalConfirm;
  });
});
