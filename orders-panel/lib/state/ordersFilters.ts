"use client";

import { create } from "zustand";
import { OrdersFilters } from "@/lib/api/orders";

interface OrdersFiltersState {
  filters: OrdersFilters;
  setFilters: (filters: Partial<OrdersFilters>) => void;
  clearFilters: () => void;
  selectedIds: string[];
  toggleSelection: (id: string) => void;
  setSelection: (ids: string[]) => void;
  clearSelection: () => void;
  detailDrawerId: string | null;
  openDetail: (id: string | null) => void;
}

export const initialOrdersFilters: OrdersFilters = {
  search: "",
  status: undefined,
  paymentStatus: undefined,
  carrier: undefined,
  customer: undefined,
  dateFrom: undefined,
  dateTo: undefined
};

export const useOrdersFilters = create<OrdersFiltersState>((set) => ({
  filters: initialOrdersFilters,
  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters }
    })),
  clearFilters: () => set({ filters: initialOrdersFilters }),
  selectedIds: [],
  toggleSelection: (id) =>
    set((state) => ({
      selectedIds: state.selectedIds.includes(id)
        ? state.selectedIds.filter((item) => item !== id)
        : [...state.selectedIds, id]
    })),
  setSelection: (ids) => set({ selectedIds: ids }),
  clearSelection: () => set({ selectedIds: [] }),
  detailDrawerId: null,
  openDetail: (id) => set({ detailDrawerId: id })
}));
