import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { BulkActions } from "@/components/orders/BulkActions";
import { renderWithProviders } from "@/test/test-utils";
import { OrderSummary } from "@/lib/api/orders";

const mutateAsync = vi.fn();
const toastMock = vi.fn();
const downloadMock = vi.fn();

vi.mock("@/lib/api/orders", async (original) => {
  const actual: any = await original();
  return {
    ...actual,
    useUpdateOrderStatus: () => ({ mutateAsync, isPending: false })
  };
});

vi.mock("@/components/ui/use-toast", () => ({
  toast: (payload: unknown) => toastMock(payload)
}));

vi.mock("@/lib/csv/exportOrders", () => ({
  downloadOrdersCsv: (...args: unknown[]) => downloadMock(args)
}));

const baseOrder: OrderSummary = {
  id: "order-1",
  number: "SRB-1",
  customerName: "Cliente",
  customerEmail: "cliente@example.com",
  createdAt: new Date().toISOString(),
  status: "pending_payment",
  totalCents: 1000,
  payment: { method: "MP", status: "pending" },
  shipping: { carrier: "Andreani", trackingCode: "TRK", eta: new Date().toISOString(), status: "in_transit", url: "https://tracking" }
};

describe("BulkActions", () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    toastMock.mockReset();
    downloadMock.mockReset();
  });

  it("avisa cuando no hay selección", () => {
    let api: { openTransitions: () => void } | null = null;
    renderWithProviders(
      <BulkActions selectedOrders={[]} visibleOrders={[]} onExpose={(exposed) => (api = exposed)} />
    );

    api?.openTransitions();
    expect(toastMock).toHaveBeenCalled();
  });

  it("ejecuta transición masiva", () => {
    let api: { openTransitions: () => void } | null = null;
    renderWithProviders(
      <BulkActions selectedOrders={[baseOrder]} visibleOrders={[baseOrder]} onExpose={(exposed) => (api = exposed)} />
    );

    api?.openTransitions();
    fireEvent.click(screen.getByText("Pagado"));
    fireEvent.click(screen.getByText("Confirmar"));

    expect(mutateAsync).toHaveBeenCalledWith({ id: "order-1", nextStatus: "paid", note: undefined });
  });
});
