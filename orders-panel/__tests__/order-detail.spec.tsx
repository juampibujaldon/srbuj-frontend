import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { OrderDetailDrawer } from "@/components/orders/OrderDetailDrawer";

const mutateAsync = vi.fn();

const mockOrder = {
  id: "order-1",
  number: "SRB-00001",
  customerName: "Juan Pérez",
  customerEmail: "juan@example.com",
  createdAt: new Date().toISOString(),
  status: "shipped",
  totalCents: 123000,
  payment: { method: "MercadoPago", status: "approved", externalId: "MP-1" },
  shipping: { carrier: "Andreani", trackingCode: "TRK-1", eta: new Date().toISOString(), url: "https://tracking", status: "in_transit" },
  invoiceUrl: "/invoice.pdf",
  trackingUrl: "https://tracking",
  items: [
    { id: "item-1", sku: "MAT-1", name: "Mate", quantity: 1, unitPrice: 123000 }
  ],
  timeline: [
    { id: "event-1", actor: "system", createdAt: new Date().toISOString(), note: "Creado", status: "paid" }
  ],
  notes: []
};

vi.mock("@/lib/api/orders", () => ({
  useOrderDetail: () => ({ data: mockOrder, isLoading: false }),
  useAddNote: () => ({ mutateAsync, isPending: false })
}));

describe("OrderDetailDrawer", () => {
  beforeEach(() => {
    mutateAsync.mockReset();
  });

  it("muestra la información del pedido", () => {
    render(<OrderDetailDrawer role="customer" orderId="order-1" open onClose={() => {}} />);

    expect(screen.getByText("SRB-00001")).toBeInTheDocument();
    expect(screen.getByText(/MercadoPago/)).toBeInTheDocument();
    expect(screen.getByText(/Andreani/)).toBeInTheDocument();
  });

  it("permite enviar una nota", async () => {
    render(<OrderDetailDrawer role="customer" orderId="order-1" open onClose={() => {}} />);

    fireEvent.click(screen.getByText("Necesito ayuda"));
    const textarea = await screen.findByLabelText("Mensaje");
    fireEvent.change(textarea, { target: { value: "Necesito soporte" } });
    fireEvent.click(screen.getByText("Enviar"));

    expect(mutateAsync).toHaveBeenCalledWith({ id: "order-1", content: "Necesito soporte", internal: false });
  });
});
