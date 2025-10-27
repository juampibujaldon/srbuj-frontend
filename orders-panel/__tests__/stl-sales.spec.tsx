import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import SellerStlSalesPage from "@/app/(seller)/stl-sales/page";
import { renderWithProviders } from "@/test/test-utils";
import type { StlDashboardResponse } from "@/lib/api/stlSales";

const mockData: StlDashboardResponse = {
  summary: {
    totalRevenueCents: 2500000,
    unitsSold: 320,
    activeListings: 12,
    avgRating: 4.6,
    conversionRate: 0.14
  },
  products: [
    {
      id: "stl-1",
      name: "Mate fileteado",
      sku: "STL-0001",
      unitsSold: 120,
      revenueCents: 1200000,
      lastSaleAt: new Date().toISOString(),
      rating: 4.8,
      conversionRate: 0.19
    },
    {
      id: "stl-2",
      name: "Termo modular",
      sku: "STL-0002",
      unitsSold: 90,
      revenueCents: 780000,
      lastSaleAt: new Date().toISOString(),
      rating: 4.5,
      conversionRate: 0.12
    }
  ],
  history: [
    { date: new Date().toISOString(), unitsSold: 14, revenueCents: 140000 },
    { date: new Date(Date.now() - 86_400_000).toISOString(), unitsSold: 12, revenueCents: 115000 }
  ]
};

const refetch = vi.fn();
const toastMock = vi.fn();
const downloadMock = vi.fn();

vi.mock("@/lib/api/stlSales", () => ({
  useStlDashboard: () => ({
    data: mockData,
    isLoading: false,
    isFetching: false,
    refetch
  })
}));

vi.mock("@/components/ui/use-toast", () => ({
  toast: (payload: unknown) => toastMock(payload)
}));

vi.mock("@/lib/csv/exportStlSales", () => ({
  downloadStlSalesCsv: (...args: unknown[]) => downloadMock(args)
}));

vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={props.alt} {...props} />;
  }
}));

describe("Seller STL sales dashboard", () => {
  it("renderiza estadísticas clave", () => {
    renderWithProviders(<SellerStlSalesPage />);

    expect(screen.getByText("Mis STL vendidos")).toBeInTheDocument();
    expect(screen.getByText("Mate fileteado")).toBeInTheDocument();
    expect(screen.getByText("320")).toBeInTheDocument();
  });

  it("permite exportar CSV", () => {
    renderWithProviders(<SellerStlSalesPage />);

    fireEvent.click(screen.getByText("Exportar CSV"));
    expect(downloadMock).toHaveBeenCalled();
  });
});
