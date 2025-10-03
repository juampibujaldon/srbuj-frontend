import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import SalesChart from "../components/SalesChart";
import OrderStatusBadge from "../components/OrderStatusBadge";
import { fetchOrders, fetchDashboardSummary, updateOrderStatus } from "../api/admin";
import { resetFeaturedClients, useFeaturedClients } from "../hooks/useFeaturedClients";

const formatARS = (n) => `AR$ ${Number(n || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState({ totalRevenue: 0, totalOrders: 0, avgTicket: 0, finalizedPct: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [featuredClients, setFeaturedClients] = useFeaturedClients();
  const [showClientsPanel, setShowClientsPanel] = useState(false);
  const logoInputRef = useRef(null);
  const [clientForm, setClientForm] = useState({ name: "", href: "https://", logo: "", logoName: "" });
  const [clientFormError, setClientFormError] = useState("");

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

  const handleClientFieldChange = (event) => {
    const { name, value } = event.target;
    setClientForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleClientLogoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setClientForm((prev) => ({ ...prev, logo: "", logoName: "" }));
      return;
    }
    if (!file.type.startsWith("image/")) {
      setClientFormError("Subí un archivo de imagen (PNG, JPG o SVG).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setClientForm((prev) => ({
        ...prev,
        logo: typeof reader.result === "string" ? reader.result : "",
        logoName: file.name,
      }));
      setClientFormError("");
    };
    reader.onerror = () => {
      setClientFormError("No se pudo leer el archivo. Probá con otro formato.");
    };
    reader.readAsDataURL(file);
  };

  const handleAddClient = (event) => {
    event.preventDefault();
    const href = clientForm.href.trim();
    const logo = clientForm.logo;
    if (!logo) {
      setClientFormError("Subí un logo para el cliente.");
      return;
    }
    if (!href) {
      setClientFormError("Ingresá un enlace válido.");
      return;
    }
    let normalizedHref = href;
    try {
      const parsed = new URL(href);
      normalizedHref = parsed.toString();
    } catch (err) {
      console.warn("URL inválida", err);
      setClientFormError("El enlace debe ser una URL válida (https://...)");
      return;
    }

    const name = clientForm.name.trim() || "Cliente";
    const newClient = {
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `client-${Date.now()}`,
      name,
      href: normalizedHref,
      logo,
    };

    setFeaturedClients((prev) => [...prev, newClient]);
    setClientForm({ name: "", href: "https://", logo: "", logoName: "" });
    if (logoInputRef.current) {
      logoInputRef.current.value = "";
    }
    setClientFormError("");
  };

  const handleRemoveClient = (id) => {
    setFeaturedClients((prev) => prev.filter((client) => client.id !== id));
  };

  const handleResetClients = () => {
    const defaults = resetFeaturedClients();
    setFeaturedClients(defaults);
    if (logoInputRef.current) {
      logoInputRef.current.value = "";
    }
    setClientForm({ name: "", href: "https://", logo: "", logoName: "" });
    setClientFormError("");
  };

  return (
    <div className="container my-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h1 className="h3 m-0">Dashboard de Administrador</h1>
        <div className="d-flex align-items-center gap-3">
          {saving && <span className="text-muted small">Guardando cambios...</span>}
          <Link to="/admin/products?new=1" className="btn btn-primary btn-sm">
            Agregar producto
          </Link>
        </div>
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

      <div className="d-flex justify-content-between align-items-center mb-3">
        <button
          type="button"
          className="btn btn-outline-primary d-inline-flex align-items-center gap-2"
          onClick={() => setShowClientsPanel((prev) => !prev)}
          aria-expanded={showClientsPanel}
          aria-controls="admin-clients-panel"
        >
          Clientes frecuentes
          <span
            className={`admin-clients-toggle ${showClientsPanel ? "admin-clients-toggle--open" : ""}`}
            aria-hidden="true"
          >
          </span>
        </button>
      </div>

      {showClientsPanel && (
        <div id="admin-clients-panel" className="card admin-clients-card mb-4">
          <div className="card-header d-flex flex-wrap align-items-center justify-content-between gap-2">
            <div>
              <div className="fw-bold">Clientes frecuentes</div>
              <small className="text-muted">Mostramos estos logos en la página de inicio.</small>
            </div>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleResetClients}>
              Restaurar predeterminado
            </button>
          </div>
          <div className="card-body">
            <div className="row g-4">
            <div className="col-12 col-lg-4">
              <form onSubmit={handleAddClient} className="admin-client-form">
                <div className="mb-3">
                  <label className="form-label fw-semibold" htmlFor="client-name">
                    Nombre del cliente
                  </label>
                  <input
                    id="client-name"
                    name="name"
                    type="text"
                    className="form-control"
                    placeholder="Ej: Icono Viajes"
                    value={clientForm.name}
                    onChange={handleClientFieldChange}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold" htmlFor="client-link">
                    Enlace
                  </label>
                  <input
                    id="client-link"
                    name="href"
                    type="url"
                    className="form-control"
                    placeholder="https://..."
                    value={clientForm.href}
                    onChange={handleClientFieldChange}
                    required
                  />
                  <div className="form-text">Abrirá en una nueva pestaña.</div>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold" htmlFor="client-logo">
                    Logo
                  </label>
                  <input
                    ref={logoInputRef}
                    id="client-logo"
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml"
                    className="form-control"
                    onChange={handleClientLogoChange}
                  />
                  {clientForm.logoName && <div className="form-text">{clientForm.logoName}</div>}
                  {clientForm.logo && (
                    <div className="admin-client-logo-preview mt-2">
                      <img src={clientForm.logo} alt="Vista previa del logo" />
                    </div>
                  )}
                </div>
                {clientFormError && (
                  <div className="alert alert-warning py-2 px-3">{clientFormError}</div>
                )}
                <button type="submit" className="btn btn-primary w-100">
                  Agregar cliente
                </button>
              </form>
            </div>
            <div className="col-12 col-lg-8">
              <div className="admin-clients-grid">
                {featuredClients.map((client) => (
                  <div key={client.id} className="admin-clients-grid__item">
                    <a
                      href={client.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="admin-clients-grid__preview"
                    >
                      <img src={client.logo} alt={client.name} />
                    </a>
                    <div className="admin-clients-grid__meta">
                      <span className="admin-clients-grid__name">{client.name}</span>
                      <button
                        type="button"
                        className="btn btn-link btn-sm text-danger px-0"
                        onClick={() => handleRemoveClient(client.id)}
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        </div>
      )}

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
