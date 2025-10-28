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
} from "react-icons/fa";
import { fetchOrders, updateOrder } from "../api/orders";
import { downloadInvoiceForOrder } from "../lib/invoice";
import "./AdminOrders.css";

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

  const handleInvoiceClick = async (order) => {
    if (!order) return;
    const invoiceUrl = order.invoice_url || order.invoiceUrl;
    if (invoiceUrl) {
      window.open(invoiceUrl, "_blank", "noopener,noreferrer");
      return;
    }
    try {
      await downloadInvoiceForOrder(order.id);
    } catch (err) {
      setFeedback({ type: "danger", text: err.message || "No pudimos descargar la factura" });
    }
  };

  const handleTrackingClick = (order) => {
    const { url, code } = getTrackingData(order);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    if (code) {
      window.alert(`Código de seguimiento: ${code}`);
    }
  };

  return (
    <section className="orders-admin container py-5">
      <header className="orders-admin__header">
        <div className="orders-admin__title">
          <h1>Pedidos</h1>
          <p>Seguimiento rápido de las órdenes y su estado actual.</p>
        </div>
        <div className="orders-admin__controls">
          <div className="orders-admin__search">
            <FaFilter className="orders-admin__search-icon" />
            <input
              type="search"
              placeholder="Buscar por número o producto"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="orders-admin__search-input"
            />
          </div>
          <button
            type="button"
            className="orders-admin__refresh"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <FaSyncAlt className={refreshing ? "orders-admin__refresh-icon--spin" : ""} />
            {refreshing ? "Actualizando…" : "Refrescar"}
          </button>
        </div>
      </header>

      <section className="orders-admin__summary">
        <article className="orders-admin__summary-card">
          <span>Total</span>
          <strong>{totalOrders}</strong>
        </article>
        <article className="orders-admin__summary-card">
          <span>Activas</span>
          <strong>{activeCount}</strong>
        </article>
        <article className="orders-admin__summary-card">
          <span>Historial</span>
          <strong>{historyCount}</strong>
        </article>
      </section>

      <div className="orders-admin__filters">
        <button
          type="button"
          className={`orders-admin__filter ${filterStatus === "active" ? "is-active" : ""}`}
          onClick={() => setFilterStatus("active")}
        >
          Activas
        </button>
        <button
          type="button"
          className={`orders-admin__filter ${filterStatus === "history" ? "is-active" : ""}`}
          onClick={() => setFilterStatus("history")}
        >
          Historial
        </button>
        <button
          type="button"
          className={`orders-admin__filter ${filterStatus === "all" ? "is-active" : ""}`}
          onClick={() => setFilterStatus("all")}
        >
          Todas
        </button>
        {STATUS_OPTIONS.map((option) => (
          <button
            type="button"
            key={option.value}
            className={`orders-admin__filter ${filterStatus === option.value ? "is-active" : ""}`}
            onClick={() => setFilterStatus(option.value)}
          >
            {option.icon}
            <span>{option.label}</span>
          </button>
        ))}
      </div>

      {feedback && (
        <div className={`orders-admin__feedback orders-admin__feedback--${feedback.type}`}>
          {feedback.text}
        </div>
      )}

      <div className="orders-admin__list">
        {filteredOrders.length === 0 ? (
          <p className="orders-admin__empty">Sin pedidos registrados.</p>
        ) : (
          filteredOrders.map((order) => {
            const statusInfo = STATUS_OPTIONS.find((opt) => opt.value === order.status);
            const shipping = order.shipping_address || order.shipping || {};
            const quote = order.shipping_quote || order.shippingQuote || {};
            const customer =
              shipping.nombre || shipping.nombreApellido || order.customer || "Cliente";
            const address = shipping.tipo === "sucursal"
              ? `Retiro en sucursal ${shipping.sucursalAndreani || ""}`
              : [shipping.calle, shipping.numero, shipping.localidad]
                  .filter(Boolean)
                  .join(" ");
            const title = order.product_name || order.items?.[0]?.title || "Pedido personalizado";
            const tracking = getTrackingData(order);
            return (
              <article key={order.id} className="orders-admin__card">
                <header className="orders-admin__card-header">
                  <div>
                    <span className="orders-admin__id">#{order.number || order.id}</span>
                    <h2>{title}</h2>
                  </div>
                  <div className="orders-admin__status-block">
                    <span className={`orders-admin__status orders-admin__status--${order.status}`}>
                      {statusInfo?.label || order.status}
                    </span>
                    <span className="orders-admin__total">
                      {formatARS(order.total || order.total_amount || 0)}
                    </span>
                  </div>
                </header>

                <div className="orders-admin__meta">
                  <span>{formatDateTime(order.updated_at || order.updatedAt)}</span>
                  <span>{customer}</span>
                </div>

                <div className="orders-admin__info">
                  <span>
                    <FaBoxOpen /> {title}
                  </span>
                  {address && <span>{address}</span>}
                  {quote?.eta && <span>{quote.eta}</span>}
                </div>

                <footer className="orders-admin__footer">
                  <div className="orders-admin__status-control">
                    <label htmlFor={`status-${order.id}`}>Estado</label>
                    <select
                      id={`status-${order.id}`}
                      value={order.status}
                      onChange={(event) => handleStatusChange(order.id, event.target.value)}
                      disabled={updating === order.id}
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="orders-admin__actions">
                    <button type="button" onClick={() => handleInvoiceClick(order)}>
                      Factura
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTrackingClick(order)}
                      disabled={!tracking.url && !tracking.code}
                    >
                      Seguimiento
                    </button>
                  </div>
                </footer>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

const formatDateTime = (value) =>
  new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(
    value ? new Date(value) : new Date(),
  );

function getTrackingData(order) {
  if (!order) return { url: null, code: null };
  const shippingQuote = order.shippingQuote || order.shipping_quote || {};
  return {
    url: shippingQuote.tracking_url || shippingQuote.trackingUrl || null,
    code: shippingQuote.tracking_code || shippingQuote.trackingCode || null,
  };
}
