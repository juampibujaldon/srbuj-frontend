"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { formatDate } from "@/lib/i18n";

const periodSchema = z.enum(["7d", "30d", "90d"]);

export type DashboardPeriod = z.infer<typeof periodSchema>;

export interface StlSummary {
  totalRevenueCents: number;
  unitsSold: number;
  activeListings: number;
  avgRating: number;
  conversionRate: number;
}

export interface StlProduct {
  id: string;
  name: string;
  sku: string;
  thumbnailUrl?: string;
  unitsSold: number;
  revenueCents: number;
  lastSaleAt: string;
  rating: number;
  conversionRate: number;
}

export interface StlHistoryPoint {
  date: string;
  unitsSold: number;
  revenueCents: number;
}

export interface StlDashboardResponse {
  summary: StlSummary;
  products: StlProduct[];
  history: StlHistoryPoint[];
}

async function fetchDashboard(period: DashboardPeriod) {
  const searchParams = new URLSearchParams({ period });
  const response = await fetch(`/api/stl-sales/dashboard?${searchParams.toString()}`);
  if (!response.ok) {
    throw new Error("No pudimos cargar tus ventas");
  }
  const payload = (await response.json()) as StlDashboardResponse;
  periodSchema.parse(period);
  return payload;
}

export function useStlDashboard(period: DashboardPeriod) {
  return useQuery({
    queryKey: ["stl-dashboard", period],
    queryFn: () => fetchDashboard(period),
    staleTime: 60_000
  });
}

export function useStlHistoryPeriod(history: StlHistoryPoint[]) {
  return useMemo(() => {
    return history.map((point) => ({
      label: formatDate(point.date),
      units: point.unitsSold,
      revenueCents: point.revenueCents
    }));
  }, [history]);
}
