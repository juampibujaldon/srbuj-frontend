import { useEffect, useMemo, useState } from "react";
import SalesChart from "../components/SalesChart";
import OrderStatusBadge from "../components/OrderStatusBadge";
import { ordersSeed, salesByDaySeed } from "../data/orders";

const LS_ORDERS_KEY = "srbuj_admin_orders";

export default function AdminDashboard() {
  const [orders, setOrders] = useState(() => {
    const saved = localStorage.getItem(LS_ORDERS_KEY);
    return saved ? JSON.parse(saved) : ordersSeed;
  });
  const [salesByDay] = useState(salesByDaySeed);

  useEffect(() => {
    localStorage.setItem(LS_ORDERS_KEY, JSON.stringify(orders));
  }, [orders]);

  const kpis = useMemo(() => {
    const totalRevenue = orders.reduce((acc, o) => acc + (o.total || 0), 0);
    const totalOrders = orders.length;
    const avgTicket = totalOrders ? totalRevenue / totalOrders : 0;
    const finalized = orders.filter((o) => o.status === "finalizado").length;
    const finalizedPct = totalOrders ? (finalized / totalOrders) * 100 : 0;
    return { totalRevenue, totalOrders, avgTicket, finalizedPct };
  }, [orders]);

  const handleChangeStatus = (id, newStatus) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o)));
  };

  return (
    <div className="container my-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h1 className="h3 m-0">Dashboard de Administrador</h1>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-12 col-md-3">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted">Ingresos</div>
              <div className="h4 fw-bold">
                AR$ {kpis.totalRevenue.toLocaleString("es-AR")}
              </div>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-3">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted">Pedidos</div>
              <div className="h4 fw-bold">{kpis.totalOrders}</div>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-3">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted">Ticket promedio</div>
              <div className="h4 fw-bold">
                AR$ {kpis.avgTicket.toFixed(0).toLocaleString("es-AR")}
              </div>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-3">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted">% Finalizados</div>
              <div className="h4 fw-bold">{kpis.finalizedPct.toFixed(0)}%</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <SalesChart data={salesByDay} />
      </div>

      <div className="card">
        <div className="card-header fw-bold">Pedidos confirmados</div>
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th>OC</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Items</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Cambiar estado</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="fw-semibold">{o.id}</td>
                  <td>{o.customer}</td>
                  <td>{o.date}</td>
                  <td>
                    <ul className="list-unstyled mb-0 small">
                      {o.items.map((it, idx) => (
                        <li key={idx}>
                          {it.title} × {it.qty}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td>AR$ {o.total.toLocaleString("es-AR")}</td>
                  <td>
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td style={{ minWidth: 200 }}>
                    <select
                      className="form-select form-select-sm"
                      value={o.status}
                      onChange={(e) => handleChangeStatus(o.id, e.target.value)}
                    >
                      <option value="en_proceso">En proceso</option>
                      <option value="enviado">Enviado</option>
                      <option value="finalizado">Finalizado</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center py-4 text-muted">
                    No hay pedidos aún.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
