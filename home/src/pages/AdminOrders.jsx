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
  FaPaperclip,
} from "react-icons/fa";
import { fetchOrders, updateOrder } from "../api/orders";
import { downloadInvoiceForOrder } from "../lib/invoice";
import { apiUrl } from "../api/client";
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
            const attachments = extractOrderFiles(order);
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

                {attachments.length > 0 && (
                  <div className="orders-admin__files" role="group" aria-label="Archivos del pedido">
                    <div className="orders-admin__files-title">
                      <FaPaperclip aria-hidden="true" />
                      <span>Archivos del cliente</span>
                      <span className="orders-admin__files-count">{attachments.length}</span>
                    </div>
                    <div className="orders-admin__file-list">
                      {attachments.map((file) => {
                        const meta = formatFileMeta(file);
                        return (
                          <a
                            key={file.id}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="orders-admin__file"
                            download
                          >
                            <div>
                              <span className="orders-admin__file-name">{file.name}</span>
                              {meta && <span className="orders-admin__file-meta">{meta}</span>}
                            </div>
                            <FaDownload aria-hidden="true" />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

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

function extractOrderFiles(order) {
  if (!order) return [];
  const attachments = [];
  const directFiles = Array.isArray(order.files) ? order.files : [];
  directFiles.forEach((file, index) => {
    const normalized = normalizeAttachment(file, {
      fallbackName: `Archivo adjunto ${index + 1}`,
      source: "upload",
    });
    if (normalized) {
      attachments.push(normalized);
    }
  });

  const items = Array.isArray(order.items) ? order.items : [];
  items.forEach((item, index) => {
    const fromItem = normalizeItemAttachment(item, index);
    if (fromItem) {
      attachments.push(fromItem);
    }
  });

  return dedupeAttachments(attachments);
}

function normalizeItemAttachment(item, index) {
  if (!item) return null;
  const metadata = item.metadata || item.customization || {};
  const stlQuote = metadata.stlQuote || metadata.stl_quote || null;
  if (!stlQuote) return null;

  const normalizedSource = {
    ...stlQuote,
    id: stlQuote.uploadId || stlQuote.quoteId || stlQuote.id || `${item.sku || item.id || index}`,
    filename: stlQuote.fileName || stlQuote.filename || stlQuote.name,
    size_mb: stlQuote.fileSizeMb ?? stlQuote.size_mb,
    mime_type: stlQuote.mimeType || stlQuote.mime_type || "model/stl",
    download_url:
      stlQuote.download_url ||
      stlQuote.downloadUrl ||
      stlQuote.signedUrl ||
      stlQuote.fileUrl ||
      stlQuote.url ||
      stlQuote.storageUrl ||
      null,
  };

  const normalized = normalizeAttachment(normalizedSource, {
    fallbackName:
      stlQuote.fileName || item.title || item.name || `Archivo STL ${index + 1}`,
    source: "item",
  });

  return normalized;
}

function normalizeAttachment(file, { fallbackName, source } = {}) {
  if (!file) return null;
  if (typeof file === "string") {
    const url = resolveAttachmentUrl(file);
    if (!url) return null;
    return {
      id: url,
      name: fallbackName || file.split("/").pop() || "Archivo",
      mimeType: null,
      sizeMb: null,
      url,
      source,
    };
  }
  const url = resolveAttachmentUrl(file);
  if (!url) return null;
  const name =
    file.original_name ||
    file.originalName ||
    file.file_name ||
    file.fileName ||
    file.filename ||
    file.name ||
    fallbackName ||
    "Archivo";
  const mimeType =
    file.mime_type ||
    file.mimeType ||
    file.content_type ||
    file.type ||
    file.file?.content_type ||
    null;
  const sizeMb = inferSizeMb(file);
  return {
    id: file.id || file.uuid || file.storage_key || url,
    name,
    mimeType,
    sizeMb,
    url,
    source,
  };
}

function dedupeAttachments(files = []) {
  const seen = new Set();
  return files.filter((file) => {
    if (!file?.url) return false;
    const key = `${file.url}|${file.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function inferSizeMb(file) {
  const candidates = [
    file.sizeMb,
    file.size_mb,
    file.fileSizeMb,
    file.file_size_mb,
    file.file_size,
    file.size,
    file.bytes,
  ];
  for (const candidate of candidates) {
    if (candidate == null) continue;
    const value = Number(candidate);
    if (Number.isNaN(value) || value <= 0) continue;
    if (value > 10_000) {
      return value / (1024 * 1024);
    }
    return value;
  }
  return null;
}

function resolveAttachmentUrl(fileOrUrl) {
  if (!fileOrUrl) return null;
  if (typeof fileOrUrl === "string") {
    return normalizeUrl(fileOrUrl);
  }
  const candidates = [
    fileOrUrl.signed_url,
    fileOrUrl.signedUrl,
    fileOrUrl.download_url,
    fileOrUrl.downloadUrl,
    fileOrUrl.file_url,
    fileOrUrl.fileUrl,
    fileOrUrl.url,
    fileOrUrl.path,
    fileOrUrl.location,
  ];
  for (const candidate of candidates) {
    const resolved = resolveAttachmentUrl(candidate);
    if (resolved) return resolved;
  }
  if (fileOrUrl.file && typeof fileOrUrl.file === "object") {
    return resolveAttachmentUrl(fileOrUrl.file);
  }
  return null;
}

function normalizeUrl(rawUrl) {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  if (/^blob:|^data:/i.test(trimmed)) {
    return trimmed;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }
  if (trimmed.startsWith("/")) {
    return apiUrl(trimmed);
  }
  return apiUrl(`/${trimmed}`);
}

function formatFileMeta(file) {
  if (!file) return "";
  const parts = [];
  const sizeValue = Number(file.sizeMb);
  if (!Number.isNaN(sizeValue) && sizeValue > 0) {
    const rounded = sizeValue >= 1 ? sizeValue.toFixed(1) : sizeValue.toFixed(2);
    parts.push(`${rounded} MB`);
  }
  if (file.mimeType) {
    const segments = file.mimeType.split("/");
    const label = segments[segments.length - 1] || file.mimeType;
    parts.push(label.toUpperCase());
  }
  if (file.source === "item") {
    parts.push("Desde personalizador");
  } else if (file.source === "upload") {
    parts.push("Adjunto checkout");
  }
  return parts.join(" · ");
}
