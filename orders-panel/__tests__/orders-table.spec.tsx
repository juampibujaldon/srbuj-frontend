import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { OrdersTable } from "@/components/orders/OrdersTable";
import { renderWithProviders } from "@/test/test-utils";
import { OrderSummary } from "@/lib/api/orders";

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({ index, start: index * 60 })),
    getTotalSize: () => count * 60
  })
}));

const baseOrders: OrderSummary[] = [
  {
    id: "order-1",
    number: "SRB-00001",
    customerName: "Juan Pérez",
    customerEmail: "juan@example.com",
    createdAt: new Date().toISOString(),
    status: "processing",
    totalCents: 120000,
    payment: { method: "MercadoPago", status: "approved", externalId: "MP-1" },
    shipping: { carrier: "Andreani", trackingCode: "TRK-1", eta: new Date().toISOString(), status: "in_transit", url: "https://tracking" },
    invoiceUrl: "/invoice-1.pdf",
    trackingUrl: "https://tracking",
    timeline: [],
    notes: []
  },
  {
    id: "order-2",
    number: "SRB-00002",
    customerName: "Ana Torres",
    customerEmail: "ana@example.com",
    createdAt: new Date().toISOString(),
    status: "pending_payment",
    totalCents: 89000,
    payment: { method: "Transferencia", status: "pending" },
    shipping: { carrier: "OCA", trackingCode: undefined, eta: new Date().toISOString(), status: "pending", url: "" },
    timeline: [],
    notes: []
  }
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("OrdersTable", () => {
  it("muestra pedidos para cliente", () => {
    renderWithProviders(
      <OrdersTable
        role="customer"
        data={baseOrders}
        isLoading={false}
        isFetchingNextPage={false}
        hasNextPage={false}
        onLoadMore={() => {}}
        onViewDetail={() => {}}
      />
    );

    expect(screen.getByText("SRB-00001")).toBeInTheDocument();
    expect(screen.getByText("SRB-00002")).toBeInTheDocument();
    expect(screen.getAllByLabelText(/Detalle/)).toHaveLength(2);
  });

  it("permite selección en admin", () => {
    renderWithProviders(
      <OrdersTable
        role="admin"
        data={baseOrders}
        isLoading={false}
        isFetchingNextPage={false}
        hasNextPage={false}
        onLoadMore={() => {}}
        onViewDetail={() => {}}
      />
    );

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBeGreaterThan(0);

    const rowCheckbox = checkboxes[1];
    fireEvent.click(rowCheckbox);
    expect(rowCheckbox).toBeChecked();
  });
});
