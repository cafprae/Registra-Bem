// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useAuthProfile: vi.fn(),
  useAssets: vi.fn(),
  useUI: vi.fn(),
  useFilters: vi.fn(),
  setAssets: vi.fn(),
  from: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
}));

vi.mock('../hooks/useAuthProfile', () => ({ useAuthProfile: mocks.useAuthProfile }));
vi.mock('../hooks/useAssets', () => ({ useAssets: mocks.useAssets }));
vi.mock('../supabaseClient', () => ({ supabase: { from: mocks.from } }));
vi.mock('./UIContext', () => ({ useUI: mocks.useUI }));
vi.mock('./FilterContext', () => ({ useFilters: mocks.useFilters }));

import { useInventory, InventoryProvider } from './InventoryContext';

const asset = {
  id: 123,
  tombamento: 123,
  name: 'Bem de teste',
  systemName: 'Bem de teste',
  sector: 'Coordenadoria Administrativa e Financeira - CAF',
  year: 2024,
  location: '',
  originalLocation: '',
  status: 'pending',
  condition: 'Bom',
  isExtra: false,
  logs: [],
};

let inventoryContext;
let uiContext;

function ContextProbe() {
  inventoryContext = useInventory();
  return null;
}

describe('InventoryProvider asset actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    uiContext = {
      selectedAsset: asset,
      setSelectedAsset: vi.fn(),
      newLocation: '',
      setNewLocation: vi.fn(),
      isSectorChangeOpen: true,
      closeSectorChange: vi.fn(),
      newSector: 'Divisao de Serviços Operacionais - DSO',
      setNewSector: vi.fn(),
    };

    mocks.useAuthProfile.mockReturnValue({
      session: null,
      profile: { sector: asset.sector },
      authLoading: false,
      isAdmin: false,
      isAuthorized: true,
    });
    mocks.useAssets.mockReturnValue({ assets: [asset], setAssets: mocks.setAssets });
    mocks.useUI.mockReturnValue(uiContext);
    mocks.useFilters.mockReturnValue({});
    mocks.from.mockReturnValue({ update: mocks.update });
    mocks.update.mockReturnValue({ eq: mocks.eq });
    mocks.eq.mockResolvedValue({ error: null });

    render(
      <InventoryProvider>
        <ContextProbe />
      </InventoryProvider>,
    );
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('confirms the asset selected in the UI context', async () => {
    await act(async () => {
      await inventoryContext.handleConfirm();
    });

    expect(mocks.update).toHaveBeenCalledWith({ situacao: 'Confirmado' });
    expect(mocks.eq).toHaveBeenCalledWith('tombamento', asset.id);
    expect(uiContext.setSelectedAsset).toHaveBeenCalled();
  });

  it('transfers the selected asset to the UI-selected sector', async () => {
    await act(async () => {
      await inventoryContext.handleChangeSector();
    });

    expect(mocks.update).toHaveBeenCalledWith({ local_sistema: 'DSO', situacao: 'Movido' });
    expect(mocks.eq).toHaveBeenCalledWith('tombamento', asset.id);
    expect(uiContext.setSelectedAsset).toHaveBeenCalled();
    expect(uiContext.closeSectorChange).toHaveBeenCalled();
  });

  it('undoes registration without clearing the asset condition or sending null values', async () => {
    await act(async () => {
      await inventoryContext.handleUndoRegistration(asset.id);
    });

    expect(mocks.update).toHaveBeenCalledWith({ local_exato_ambiente: '', situacao: 'Pendente' });
    expect(Object.values(mocks.update.mock.calls[0][0]).every(value => value !== null)).toBe(true);
    expect(mocks.eq).toHaveBeenCalledWith('tombamento', asset.id);

    const updateAssets = mocks.setAssets.mock.calls[0][0];
    const updatedAsset = updateAssets([asset])[0];
    expect(updatedAsset).toMatchObject({ condition: 'Bom', location: '', status: 'pending' });

    const updateSelectedAsset = uiContext.setSelectedAsset.mock.calls[0][0];
    expect(updateSelectedAsset(asset)).toMatchObject({ condition: 'Bom', location: '', status: 'pending' });
  });
});