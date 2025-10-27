import { http, HttpResponse } from "msw";
import type { StlDashboardResponse, DashboardPeriod } from "@/lib/api/stlSales";

const baseProducts = Array.from({ length: 40 }, (_, index) => {
  const units = Math.floor(Math.random() * 500) + 20;
  const revenue = units * (Math.floor(Math.random() * 8000) + 15000);
  const conversion = Number((Math.random() * 0.15 + 0.05).toFixed(3));
  const rating = Number((Math.random() * 1.5 + 3.5).toFixed(1));
  return {
    id: `stl-${index + 1}`,
    name: `Modelo STL ${index + 1}`,
    sku: `STL-${(index + 1).toString().padStart(4, "0")}`,
    thumbnailUrl: `/images/stl-${(index % 6) + 1}.jpg`,
    unitsSold: units,
    revenueCents: revenue,
    lastSaleAt: new Date(Date.now() - index * 36_000_00).toISOString(),
    rating,
    conversionRate: conversion
  };
});

const historyBase = Array.from({ length: 90 }, (_, idx) => {
  const date = new Date();
  date.setDate(date.getDate() - idx);
  const units = Math.floor(Math.random() * 12) + 3;
  const revenue = units * (Math.floor(Math.random() * 10_000) + 18_000);
  return {
    date: date.toISOString(),
    unitsSold: units,
    revenueCents: revenue
  };
});

function buildDashboard(period: DashboardPeriod): StlDashboardResponse {
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const history = historyBase.slice(0, days).reverse();
  const products = baseProducts.slice(0, period === "7d" ? 10 : period === "30d" ? 20 : 30);
  const totalRevenueCents = history.reduce((total, point) => total + point.revenueCents, 0);
  const unitsSold = history.reduce((total, point) => total + point.unitsSold, 0);
  const activeListings = 18;
  const avgRating = 4.3;
  const conversionRate = 0.126;

  return {
    summary: {
      totalRevenueCents,
      unitsSold,
      activeListings,
      avgRating,
      conversionRate
    },
    products,
    history
  };
}

export const stlSalesHandlers = [
  http.get("/api/stl-sales/dashboard", ({ request }) => {
    const url = new URL(request.url);
    const period = (url.searchParams.get("period") ?? "30d") as DashboardPeriod;
    const data = buildDashboard(period);
    return HttpResponse.json(data);
  })
];

export default stlSalesHandlers;
