import React, { useEffect, useMemo, useState } from "react";
import {
  FaBoxOpen,
  FaCheckCircle,
  FaClock,
  FaFilter,
  FaBan,
  FaSyncAlt,
  FaTools,
  FaTruck,
  FaDownload,
} from "react-icons/fa";
import OrderStatusTracker from "../components/OrderStatusTracker.jsx";
import { fetchOrders, updateOrder } from "../api/orders";

const formatARS = (n) => `AR$ ${Number(n || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;

const STATUS_OPTIONS = [
  { value: "draft", label: "Borrador", icon: <FaClock /> },
  { value: "pending", label: "Pendiente", icon: <FaTools /> },
  { value: "paid", label: "Pagado", icon: <FaCheckCircle /> },
  { value: "fulfilled", label: "Completado", icon: <FaTruck /> },
  { value: "cancelled", label: "Cancelado", icon: <FaBan /> },
];

const isClosedStatus = (status) => status === "fulfilled" || status === "cancelled";

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [filterStatus, setFilterStatus] = useState("active");
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = async () => {
    try {
      const { results } = await fetchOrders({ pageSize: 200, role: "admin" });
      setOrders(results);
    } catch (err) {
      console.error("No se pudieron cargar los pedidos", err);
      setError(err.message || "No se pudo cargar la lista de pedidos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    const order = orders.find((it) => it.id === orderId);
    if (!order || order.status === newStatus) return;
    setUpdating(orderId);
    setFeedback(null);
    try {
      const updated = await updateOrder(orderId, { status: newStatus });
      setOrders((prev) =>
        prev.map((order) => (order.id === updated.id ? { ...order, ...updated } : order)),
      );
      const label = STATUS_OPTIONS.find((opt) => opt.value === updated.status)?.label || updated.status;
      setFeedback({ type: "success", text: `Pedido ${orderId} actualizado a "${label}"` });
    } catch (err) {
      console.error("No se pudo actualizar el pedido", err);
      setFeedback({ type: "danger", text: err.message || "No se pudo actualizar el pedido" });
    } finally {
      setUpdating(null);
    }
  };

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const totalOrders = orders.length;
  const activeCount = orders.filter((order) => !isClosedStatus(order.status)).length;
  const historyCount = totalOrders - activeCount;

  const filteredOrders = useMemo(() => {
    const lowerSearch = searchTerm.trim().toLowerCase();
    return orders
      .filter((order) => {
        let matchesStatus = true;
        if (filterStatus === "active") {
          matchesStatus = !isClosedStatus(order.status);
        } else if (filterStatus === "history") {
          matchesStatus = isClosedStatus(order.status);
        } else if (filterStatus !== "all") {
          matchesStatus = order.status === filterStatus;
        }
        const matchesSearch = lowerSearch
          ? String(order.id).includes(lowerSearch) ||
            (order.product_name || "").toLowerCase().includes(lowerSearch)
          : true;
        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  }, [orders, filterStatus, searchTerm]);

  if (loading) {
    return (
      <section className="container py-5 text-center">
        <div className="spinner-border text-primary mb-3" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
        <p className="text-muted">Obteniendo pedidos…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="container py-5 text-center text-danger">
        <p>{error}</p>
      </section>
    );
  }

  return (
    <section className="container py-5">
      <div className="d-flex flex-column flex-xl-row align-items-xl-center justify-content-between gap-3 mb-4">
        <div>
          <h1 className="h3 mb-1">Gestión de pedidos</h1>
          <p className="text-muted mb-0">
            Actualizá el estado de las impresiones y notificá a los clientes en tiempo real.
          </p>
        </div>
        <div className="d-flex flex-column flex-sm-row align-items-stretch align-items-sm-center gap-2">
          <div className="admin-orders-search position-relative">
            <FaFilter className="search-icon" />
            <input
              type="search"
              className="form-control"
              placeholder="Buscar por número o producto"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-2"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <FaSyncAlt className={refreshing ? "icon-spin" : ""} />
            {refreshing ? "Actualizando…" : "Refrescar"}
          </button>
        </div>
      </div>

      <div className="status-filter-group mb-4">
        <button
          type="button"
          className={`status-filter ${filterStatus === "active" ? "active" : ""}`}
          onClick={() => setFilterStatus("active")}
        >
          Activas <span className="badge bg-light text-dark">{activeCount}</span>
        </button>
        <button
          type="button"
          className={`status-filter ${filterStatus === "history" ? "active" : ""}`}
          onClick={() => setFilterStatus("history")}
        >
          Historial <span className="badge bg-light text-dark">{historyCount}</span>
        </button>
        <button
          type="button"
          className={`status-filter ${filterStatus === "all" ? "active" : ""}`}
          onClick={() => setFilterStatus("all")}
        >
          Todas <span className="badge bg-light text-dark">{totalOrders}</span>
        </button>
        {STATUS_OPTIONS.map((option) => {
          const count = orders.filter((order) => order.status === option.value).length;
          return (
            <button
              type="button"
              key={option.value}
              className={`status-filter status-filter--${option.value} ${
                filterStatus === option.value ? "active" : ""
              }`}
              onClick={() => setFilterStatus(option.value)}
            >
              {option.icon} {option.label}
              <span className="badge bg-light text-dark">{count}</span>
            </button>
          );
        })}
      </div>

      {feedback && (
        <div className={`alert alert-${feedback.type}`} role="alert">
          {feedback.text}
        </div>
      )}

      {filteredOrders.length === 0 ? (
        <p className="text-muted">Sin pedidos registrados.</p>
      ) : (
        <div className="row g-4">
          {filteredOrders.map((order) => {
            const statusInfo = STATUS_OPTIONS.find((opt) => opt.value === order.status);
            return (
              <div key={order.id} className="col-12 col-xl-6">
                <div className="card admin-order-card border-0 shadow-sm h-100">
                  <div className="card-body p-4">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <h2 className="h5 mb-1">Pedido #{order.id}</h2>
                        <div className="text-muted small">
                          Actualizado {new Date(order.updated_at).toLocaleString("es-AR")}
                        </div>
                      </div>
                      <div className="text-end">
                        <span className={`status-chip status-chip--${order.status}`}>
                          {statusInfo?.label || order.status}
                        </span>
                        <div className="fw-semibold mt-1">
                          AR$ {Number(order.total || 0).toLocaleString("es-AR")}
                        </div>
                      </div>
                    </div>

                    <div className="d-flex align-items-center gap-2 mb-3 text-muted small">
                      <FaBoxOpen /> {order.product_name || order.items?.[0]?.title || "Producto personalizado"}
                    </div>

                    {(() => {
                      const shipping = order.shipping_address || order.shipping || {};
                      if (Object.keys(shipping).length === 0) return null;
                      const quote = order.shipping_quote || order.shippingQuote || {};
                      return (
                        <div className="admin-order-shipping small text-muted mb-3">
                          <div className="fw-semibold text-dark mb-1">Datos de envío</div>
                          <p className="mb-1">{shipping.nombre || "Cliente"}</p>
                          {shipping.email && <p className="mb-1">Email: {shipping.email}</p>}
                          {shipping.telefono && <p className="mb-1">Teléfono: {shipping.telefono}</p>}
                          {shipping.dni && <p className="mb-1">DNI: {shipping.dni}</p>}
                          {shipping.tipo === "sucursal" ? (
                            <>
                              <p className="mb-1">Retiro en sucursal Andreani</p>
                              {shipping.sucursalAndreani && (
                                <p className="mb-1">Sucursal: {shipping.sucursalAndreani}</p>
                              )}
                            </>
                          ) : (
                            <p className="mb-1">
                              {`${shipping.calle || ""} ${shipping.numero || ""}`.trim()}
                              {shipping.depto ? ` - Depto ${shipping.depto}` : ""}
                            </p>
                          )}
                          <p className="mb-0">
                            {[
                              shipping.localidad,
                              shipping.provincia,
                              shipping.cp ? `CP ${shipping.cp}` : "",
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                          {quote?.precio && (
                            <p className="mt-2 mb-0">
                              Envío estimado: {formatARS(quote.precio)}
                              {quote.eta ? ` · ${quote.eta}` : ""}
                            </p>
                          )}
                        </div>
                      );
                    })()}

                    {Array.isArray(order.items) && order.items.length > 0 && (
                      <div className="admin-order-items small text-muted mb-3">
                        <div className="fw-semibold text-dark mb-1">Ítems del pedido</div>
                        <ul className="list-unstyled mb-0">
                          {order.items.map((item) => {
                            const metadata = item.metadata || item.customization || {};
                            const isUploadedStl = metadata.type === "uploaded-stl";
                            const stlQuote = metadata.stlQuote || {};
                            const downloadUrl = stlQuote.downloadUrl || stlQuote.signedUrl || "";
                            return (
                              <li
                                key={`${order.id}-${item.id || item.sku || item.title}`}
                                className="mb-2 pb-2 border-bottom border-light-subtle"
                              >
                                <div className="fw-semibold text-dark">{item.title}</div>
                                <div>
                                  {item.quantity} × {formatARS(item.unit_price || 0)} ={" "}
                                  {formatARS((item.quantity || 1) * (item.unit_price || 0))}
                                </div>
                                {isUploadedStl && (
                                  <div className="mt-2">
                                    {metadata.fileMeta?.name && (
                                      <div>
                                        Archivo: {metadata.fileMeta.name}
                                        {metadata.fileMeta.sizeMb ? ` · ${metadata.fileMeta.sizeMb} MB` : ""}
                                      </div>
                                    )}
                                    <div>
                                      Material: {metadata.materialLabel || metadata.material} · Infill{" "}
                                      {metadata.infill}% · Calidad {metadata.quality}
                                    </div>
                                    {metadata.weightG && (
                                      <div>
                                        Peso estimado: {metadata.weightG} g
                                        {metadata.estimatedTimeHours
                                          ? ` · ${metadata.estimatedTimeHours} h`
                                          : ""}
                                      </div>
                                    )}
                                    {downloadUrl ? (
                                      <a
                                        href={downloadUrl}
                                        className="btn btn-outline-secondary btn-sm mt-2 d-inline-flex align-items-center gap-2"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        <FaDownload /> Descargar STL
                                      </a>
                                    ) : (
                                      stlQuote.uploadId && (
                                        <div className="mt-2">
                                          ID de archivo: <code>{stlQuote.uploadId}</code>
                                        </div>
                                      )
                                    )}
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}

                    <OrderStatusTracker status={order.status} updatedAt={order.updated_at || order.updatedAt} />

                    <div className="mt-3">
                      <div className="status-pill-group" role="group" aria-label="Actualizar estado">
                        {STATUS_OPTIONS.map((option) => {
                          const isActive = option.value === order.status;
                          return (
                            <button
                              type="button"
                              key={option.value}
                              className={`status-pill status-pill--${option.value} ${
                                isActive ? "active" : ""
                              }`}
                              onClick={() => handleStatusChange(order.id, option.value)}
                              disabled={updating === order.id || isActive}
                            >
                              <span className="status-pill__icon">{option.icon}</span>
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
