// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../context/InventoryContext', () => ({
  useInventory: vi.fn(),
}));

vi.mock('lucide-react', () => ({
  X: () => <div data-testid="icon-x" />,
  Copy: () => <div data-testid="icon-copy" />, // ✨ OLHA A MARMOTA AQUI!
  Trash2: () => <div data-testid="icon-trash" />,
  Undo: () => <div data-testid="icon-undo" />,
  Save: () => <div data-testid="icon-save" />,
  Check: () => <div data-testid="icon-check" />
}));

import { useInventory } from '../context/InventoryContext';
// 👇 Ajustei para ./ porque o teste está na mesma pasta que o arquivo original!
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
      selectedAsset: { id: '123', name: 'Test Asset', location: '', originalLocation: '', status: 'confirmed', logs: [] },
      setSelectedAsset: mockSetSelectedAsset,
      newLocation: '',
      setNewLocation: mockSetNewLocation,
      showSectorChange: false,
      setShowSectorChange: vi.fn(),
      newSector: '',
      setNewSector: vi.fn(),
      handleConfirm: vi.fn(),
      handleUpdateLocation: vi.fn(),
      handleChangeSector: vi.fn(),
      handleConditionChange: vi.fn(),
      handleUndoRegistration: mockHandleUndoRegistration,
      handleConfirmRecebimento: vi.fn(),
      handleRejectTransfer: vi.fn(),
      handleUndoValidation: vi.fn(),
    });

    render(<AssetDetailSheet />);

    expect(screen.getByText('Test Asset')).toBeTruthy();
  });

  it('disables the Save button when the location input is empty', () => {
    useInventory.mockReturnValue({
      selectedAsset: { id: '123', name: 'Test Asset', location: 'Sala 1', originalLocation: 'Sala 1', status: 'confirmed', logs: [] },
      setSelectedAsset: mockSetSelectedAsset,
      newLocation: '', // empty -> Save should be disabled
      setNewLocation: mockSetNewLocation,
      showSectorChange: false,
      setShowSectorChange: vi.fn(),
      newSector: '',
      setNewSector: vi.fn(),
      handleConfirm: vi.fn(),
      handleUpdateLocation: vi.fn(),
      handleChangeSector: vi.fn(),
      handleConditionChange: vi.fn(),
      handleUndoRegistration: mockHandleUndoRegistration,
      handleConfirmRecebimento: vi.fn(),
      handleRejectTransfer: vi.fn(),
      handleUndoValidation: vi.fn(),
    });

    render(<AssetDetailSheet />);

    const saveButton = screen.getByRole('button', { name: /Salvar/i });
    expect(saveButton).toBeDisabled();
  });

  it('calls handleUndoRegistration when Delete (Desfazer Lançamento) is clicked and confirmed', () => {
    useInventory.mockReturnValue({
      selectedAsset: { id: '123', name: 'Test Asset', location: 'Sala 1', originalLocation: 'Sala 1', status: 'confirmed', logs: [] },
      setSelectedAsset: mockSetSelectedAsset,
      newLocation: '',
      setNewLocation: mockSetNewLocation,
      showSectorChange: false,
      setShowSectorChange: vi.fn(),
      newSector: '',
      setNewSector: vi.fn(),
      handleConfirm: vi.fn(),
      handleUpdateLocation: vi.fn(),
      handleChangeSector: vi.fn(),
      handleConditionChange: vi.fn(),
      handleUndoRegistration: mockHandleUndoRegistration,
      handleConfirmRecebimento: vi.fn(),
      handleRejectTransfer: vi.fn(),
      handleUndoValidation: vi.fn(),
    });

    // Mock window.confirm to simulate user confirming deletion
    const originalConfirm = window.confirm;
    window.confirm = vi.fn(() => true);

    render(<AssetDetailSheet />);

    const deleteButton = screen.getByRole('button', { name: /Desfazer Lançamento/i });
    fireEvent.click(deleteButton);

    expect(window.confirm).toHaveBeenCalled();
    expect(mockHandleUndoRegistration).toHaveBeenCalledWith('123');

    // restore
    window.confirm = originalConfirm;
  });
});