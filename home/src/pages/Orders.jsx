import React, { useEffect, useMemo, useState } from "react";
import "./orders-simple.css";
import { fetchOrders, fetchOrder } from "../api/orders";
import { downloadInvoiceForOrder } from "../lib/invoice";
import { useAuth } from "../context/AuthContext.jsx";

const STATUS_LABELS = {
  draft: "Borrador",
  pending: "Pendiente",
  paid: "Pagado",
  processing: "En proceso",
  fulfilled: "Completado",
  cancelled: "Cancelado",
};

const STATUS_ORDER = ["draft", "pending", "paid", "processing", "fulfilled", "cancelled"];

const formatCurrency = (value) =>
  `AR$ ${Number(value || 0).toLocaleString("es-AR", { minimumFractionDigits: 0 })}`;

const formatDate = (value) =>
  new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(
    value ? new Date(value) : new Date()
  );

const getOrderTotal = (order) => {
  if (!order) return 0;
  if (typeof order.total === "number") return order.total;
  if (typeof order.total_amount === "number") return order.total_amount;
  const items = Array.isArray(order.items) ? order.items : [];
  const itemsTotal = items.reduce((acc, item) => acc + (item.quantity || 1) * (item.unit_price || item.price || 0), 0);
  const shippingCost = order.shipping_cost ?? order.shipping_quote?.precio ?? 0;
  return itemsTotal + shippingCost;
};

const getTrackingData = (order) => {
  if (!order) return { url: null, code: null };
  const shippingQuote = order.shippingQuote || order.shipping_quote || {};
  return {
    url: shippingQuote.tracking_url || shippingQuote.trackingUrl || null,
    code: shippingQuote.tracking_code || shippingQuote.trackingCode || null,
  };
};

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const { results } = await fetchOrders({ pageSize: 50, role: "customer" });
        if (!active) return;
        setOrders(results);
        if (results[0]) {
          setDetail(results[0]);
        }
      } catch (err) {
        if (active) {
          setError(err.message || "No pudimos cargar tus pedidos");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      const dateA = new Date(a.updated_at || a.created_at || a.createdAt || a.updatedAt || 0);
      const dateB = new Date(b.updated_at || b.created_at || b.createdAt || b.updatedAt || 0);
      return dateB - dateA;
    });
  }, [orders]);

  const handleView = async (orderId) => {
    setDetailError("");
    const cached = orders.find((o) => o.id === orderId);
    if (cached) {
      setDetail(cached);
    }
    try {
      setDetailLoading(true);
      const full = await fetchOrder(orderId);
      setDetail(full);
    } catch (err) {
      setDetailError(err.message || "No pudimos cargar el detalle del pedido.");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleInvoice = async (order) => {
    if (!order) return;
    const invoiceUrl = order.invoice_url || order.invoiceUrl;
    if (invoiceUrl) {
      window.open(invoiceUrl, "_blank", "noopener,noreferrer");
      return;
    }
    try {
      await downloadInvoiceForOrder(order.id);
    } catch (err) {
      setError(err.message || "No pudimos descargar la factura.");
    }
  };

  const handleTracking = (order) => {
    const { url, code } = getTrackingData(order);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    if (code) {
      window.alert(`Código de seguimiento: ${code}`);
    }
  };

  const renderStatus = (status) => {
    const value = STATUS_LABELS[status] || status || "-";
    const index = STATUS_ORDER.indexOf(status);
    const className = index >= 0 ? `status-badge status-${status}` : "status-badge";
    return <span className={className}>{value}</span>;
  };

  if (loading) {
    return <div className="orders-container">Cargando tus pedidos...</div>;
  }

  if (error) {
    return (
      <div className="orders-container" role="alert">
        <p className="orders-error">{error}</p>
      </div>
    );
  }

  if (!sortedOrders.length) {
    return (
      <div className="orders-container orders-empty" role="status">
        <p>Aún no tenés pedidos.</p>
      </div>
    );
  }

  const currentUserLabel = user?.username || user?.email || "Tu cuenta";

  return (
    <div className="orders-container">
      <header className="orders-header">
        <div>
          <p className="orders-subtitle">Resumen de pedidos</p>
          <h1 className="orders-title">Mis órdenes</h1>
        </div>
        <span className="orders-user">{currentUserLabel}</span>
      </header>

      <div className="orders-table-wrapper">
        <table className="orders-table" aria-label="Listado de pedidos">
          <thead>
            <tr>
              <th>Nº</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th>Total</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sortedOrders.map((order) => (
              <tr key={order.id}
                className={detail?.id === order.id ? "is-selected" : undefined}
              >
                <td>{order.number || `#${order.id}`}</td>
                <td>{formatDate(order.created_at || order.createdAt)}</td>
                <td>{renderStatus(order.status)}</td>
                <td>{formatCurrency(getOrderTotal(order))}</td>
                <td className="orders-actions">
                  <button type="button" onClick={() => handleView(order.id)}>
                    Ver
                  </button>
                  <button type="button" onClick={() => handleInvoice(order)}>
                    Factura
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTracking(order)}
                    disabled={!getTrackingData(order).url && !getTrackingData(order).code}
                  >
                    Tracking
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detail && (
        <section className="order-detail" aria-live="polite">
          <header className="order-detail__header">
            <div>
              <p className="order-detail__label">Detalle</p>
              <h2 className="order-detail__title">Pedido {detail.number || `#${detail.id}`}</h2>
            </div>
            <div className="order-detail__status">{renderStatus(detail.status)}</div>
          </header>
          {detailLoading && <p className="orders-note">Actualizando detalle...</p>}
          {detailError && (
            <p className="orders-error" role="alert">
              {detailError}
            </p>
          )}
          <div className="order-detail__grid">
            <div>
              <h3>Items</h3>
              <ul>
                {(detail.items || []).map((item) => (
                  <li key={`${detail.id}-${item.title}-${item.quantity}`}>
                    <span>{item.quantity || 1}× {item.title || item.name}</span>
                    <span>{formatCurrency((item.unit_price || item.price || 0) * (item.quantity || 1))}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Envío</h3>
              <p>{detail.shipping_address?.calle ? `${detail.shipping_address.calle} ${detail.shipping_address.numero || ""}` : "A definir"}</p>
              <p>{detail.shipping_address?.localidad} {detail.shipping_address?.provincia}</p>
              <p>{detail.shipping_quote?.eta || detail.shippingQuote?.eta || "Sin ETA"}</p>
            </div>
            <div>
              <h3>Pago</h3>
              <p>{detail.payment_metadata?.metodo || detail.payment?.method || "A confirmar"}</p>
              <p>Total abonado: {formatCurrency(getOrderTotal(detail))}</p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
