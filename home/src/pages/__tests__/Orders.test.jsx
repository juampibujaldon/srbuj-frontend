import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Orders from "../Orders.jsx";
import { fetchOrders, fetchOrder } from "../../api/orders";
import { useAuth } from "../../context/AuthContext.jsx";
import { CustomerOnly } from "../../components/RouteGuards.jsx";
import { downloadInvoiceForOrder } from "../../lib/invoice";

jest.mock("../../api/orders", () => ({
  fetchOrders: jest.fn(),
  fetchOrder: jest.fn(),
}));

jest.mock("../../context/AuthContext.jsx", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../../lib/invoice", () => ({
  __esModule: true,
  downloadInvoiceForOrder: jest.fn(),
}));

describe("Orders page", () => {
  beforeEach(() => {
    useAuth.mockReturnValue({ user: { username: "Test" }, loading: false });
    fetchOrder.mockResolvedValue({ id: 1, items: [] });
    downloadInvoiceForOrder.mockResolvedValue();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("muestra empty state cuando no hay pedidos", async () => {
    fetchOrders.mockResolvedValue({ results: [], meta: { count: 0 } });
    render(
      <MemoryRouter>
        <Orders />
      </MemoryRouter>
    );

    await screen.findByText(/Aún no tenés pedidos/i);
  });

  it("renderiza la tabla de pedidos para clientes", async () => {
    fetchOrders.mockResolvedValue({
      results: [
        {
          id: 10,
          number: "SRB-10",
          status: "paid",
          created_at: "2024-10-01T10:00:00Z",
          items: [
            { title: "Mate", quantity: 1, unit_price: 1000 },
          ],
        },
      ],
      meta: { count: 1 },
    });
    render(
      <MemoryRouter>
        <Orders />
      </MemoryRouter>
    );

    expect(await screen.findByRole("table", { name: /Listado de pedidos/i })).toBeInTheDocument();
    expect(screen.getByText("SRB-10")).toBeInTheDocument();
  });

  it("redirige a /admin cuando un admin intenta acceder a /orders", () => {
    useAuth.mockReturnValue({ user: { role: "admin" }, loading: false });
    render(
      <MemoryRouter initialEntries={["/orders"]}>
        <Routes>
          <Route
            path="/orders"
            element={
              <CustomerOnly>
                <div>Cliente</div>
              </CustomerOnly>
            }
          />
          <Route path="/admin" element={<div>Panel admin</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/Panel admin/i)).toBeInTheDocument();
  });
});
