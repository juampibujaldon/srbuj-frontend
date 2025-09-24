import { useEffect, useMemo, useState } from "react";
import SalesChart from "../components/SalesChart";
import OrderStatusBadge from "../components/OrderStatusBadge";
import { fetchOrders, fetchDashboardSummary, updateOrderStatus } from "../api/admin";

const formatARS = (n) => `AR$ ${Number(n || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState({ totalRevenue: 0, totalOrders: 0, avgTicket: 0, finalizedPct: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [ordersData, summaryData] = await Promise.all([fetchOrders(), fetchDashboardSummary()]);
      setOrders(ordersData);
      setSummary(summaryData);
    } catch (err) {
      setError(err.message || "No se pudieron obtener los datos del dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const salesByDay = useMemo(() => {
    const map = new Map();
    orders.forEach((order) => {
      if (!order.fecha) return;
      const isoDay = new Date(order.fecha).toISOString().slice(0, 10);
      const amount = Number(order.total || 0);
      map.set(isoDay, (map.get(isoDay) || 0) + amount);
    });
    return Array.from(map.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [orders]);

  const handleChangeStatus = async (id, newStatus) => {
    setSaving(true);
    try {
      await updateOrderStatus(id, newStatus);
      await loadData();
    } catch (err) {
      alert(err.message || "No se pudo actualizar el estado");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container my-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h1 className="h3 m-0">Dashboard de Administrador</h1>
        {saving && <span className="text-muted small">Guardando cambios...</span>}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-3 mb-4">
        <div className="col-12 col-md-3">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted">Ingresos</div>
              <div className="h4 fw-bold">{formatARS(summary.totalRevenue)}</div>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-3">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted">Pedidos</div>
              <div className="h4 fw-bold">{summary.totalOrders}</div>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-3">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted">Ticket promedio</div>
              <div className="h4 fw-bold">{formatARS(summary.avgTicket)}</div>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-3">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted">% Entregados</div>
              <div className="h4 fw-bold">{summary.finalizedPct.toFixed(0)}%</div>
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
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-4 text-muted">
                    Cargando órdenes...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-4 text-muted">
                    Todavía no hay órdenes cargadas.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id}>
                    <td className="fw-semibold">#{o.id}</td>
                    <td>{o.customer || "Anon"}</td>
                    <td>{o.fecha ? new Date(o.fecha).toLocaleString() : ""}</td>
                    <td>
                      <ul className="list-unstyled mb-0 small">
                        {(o.items || []).map((it, idx) => (
                          <li key={idx}>
                            {it.title || it.nombre} × {it.qty || it.cantidad}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td>{formatARS(o.total)}</td>
                    <td>
                      <OrderStatusBadge status={o.estado} />
                    </td>
                    <td style={{ minWidth: 220 }}>
                      <select
                        className="form-select form-select-sm"
                        value={o.estado}
                        onChange={(e) => handleChangeStatus(o.id, e.target.value)}
                        disabled={saving}
                      >
                        <option value="pendiente">Pendiente</option>
                        <option value="procesando">Procesando</option>
                        <option value="enviado">Enviado</option>
                        <option value="entregado">Entregado</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
