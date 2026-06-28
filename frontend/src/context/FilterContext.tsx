/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { STATUS } from '../constants';

export interface FilterState {
  search: string;
  statusFilter: string;
  conditionFilter: string;
}

export interface FilterActions {
  setSearch: (search: string) => void;
  setStatusFilter: (filter: string) => void;
  setConditionFilter: (filter: string) => void;
  clearFilters: () => void;
}

export type FilterContextType = FilterState & FilterActions;

const FilterContext = createContext<FilterContextType | null>(null);

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [conditionFilter, setConditionFilter] = useState('all');

  const clearFilters = useCallback(() => {
    setSearch('');
    setStatusFilter('all');
    setConditionFilter('all');
  }, []);

  const value: FilterContextType = useMemo(() => ({
    search,
    statusFilter,
    conditionFilter,
    setSearch,
    setStatusFilter,
    setConditionFilter,
    clearFilters,
  }), [search, statusFilter, conditionFilter, clearFilters]);

  return (
    <FilterContext.Provider value={value}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters(): FilterContextType {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error('useFilters must be used within FilterProvider');
  return ctx;
}

export function useFilteredAssets(sectorAssets: import('../types').Asset[]) {
  const { search, statusFilter, conditionFilter } = useFilters();

  return useMemo(() => {
    return sectorAssets.filter(a => {
      const matchesSearch = !search ||
        (a.name && a.name.toLowerCase().includes(search.toLowerCase())) ||
        (a.id && a.id.toString().includes(search));
      const matchesCondition = conditionFilter === 'all' || (a.condition && a.condition === conditionFilter);
      const matchesStatus = conditionFilter !== 'all' ? true : (statusFilter === 'all' || a.status === statusFilter);
      return matchesSearch && matchesCondition && matchesStatus;
    });
  }, [sectorAssets, search, statusFilter, conditionFilter]);
}
