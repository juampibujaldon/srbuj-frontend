import React, { useEffect, useMemo, useState } from "react";
import {
  FaBoxOpen,
  FaClock,
  FaPlusCircle,
  FaSyncAlt,
  FaWhatsapp,
  FaCalendarAlt,
  FaDownload,
} from "react-icons/fa";
import OrderStatusTracker from "../components/OrderStatusTracker.jsx";
import { fetchOrders, fetchOrder } from "../api/orders";
import { createListingDraft } from "../api/listings";

const STATUS_LABELS = {
  draft: "Borrador",
  pending: "Pendiente",
  paid: "Pagado",
  fulfilled: "Completado",
  cancelled: "Cancelado",
};

const STATUS_FILTERS = [
  { key: "active", label: "Activas", statuses: ["draft", "pending", "paid"] },
  { key: "history", label: "Historial", statuses: ["fulfilled", "cancelled"] },
  { key: "all", label: "Todas", statuses: [] },
  { key: "draft", label: "Borradores", statuses: ["draft"] },
  { key: "pending", label: "Pendientes", statuses: ["pending"] },
  { key: "paid", label: "Pagadas", statuses: ["paid"] },
  { key: "fulfilled", label: "Completadas", statuses: ["fulfilled"] },
  { key: "cancelled", label: "Canceladas", statuses: ["cancelled"] },
];

const isValidCuit = (raw) => {
  const digits = (raw || "").replace(/[^\d]/g, "");
  if (digits.length !== 11) return false;
  const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const sum = multipliers.reduce((acc, mult, idx) => acc + mult * Number(digits[idx]), 0);
  const mod11 = sum % 11;
  const check = mod11 === 0 ? 0 : mod11 === 1 ? 9 : 11 - mod11;
  return check === Number(digits[10]);
};

const MODALITY_OPTIONS = [
  { value: "stl_digital", label: "Venta de archivo STL" },
  { value: "print_on_demand", label: "Impresión bajo demanda" },
  { value: "stock_ready", label: "Stock físico" },
];

const CATEGORY_OPTIONS = [
  "General",
  "Decoración",
  "Merchandising",
  "Prototipos",
  "Hogar",
  "Llaveros",
  "Mates",
  "Accesorios",
];

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [orderMeta, setOrderMeta] = useState({ count: 0, featureFlags: {} });
  const [orderCache, setOrderCache] = useState({});
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState("active");
  const [filterCounts, setFilterCounts] = useState({});
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [showVendorForm, setShowVendorForm] = useState(false);

  const [draftSubmitting, setDraftSubmitting] = useState(false);
  const [draftError, setDraftError] = useState("");
  const [draftSuccess, setDraftSuccess] = useState("");
  const [draftPhotos, setDraftPhotos] = useState([]);
  const [draftStlFile, setDraftStlFile] = useState(null);
  const [draftData, setDraftData] = useState({
    productName: "",
    category: "",
    price: "",
    stlLink: "",
    modalities: [],
    alias: "",
    cuil: "",
    mpEmail: "",
  });

  const loadOrders = async ({ silent = false, activeRef } = {}) => {
    const isActive = () => (activeRef ? activeRef() : true);
    if (!silent) {
      setLoading(true);
    }
    setError("");
    try {
      const filterConfig = STATUS_FILTERS.find((item) => item.key === statusFilter);
      const statuses = filterConfig?.statuses ?? [];
      const { results, meta } = await fetchOrders({
        page,
        pageSize,
        status: statuses,
        from: fromDate || undefined,
        to: toDate || undefined,
      });
      if (!isActive()) return [];

      setOrders(results);
      setOrderMeta(meta);
      setFilterCounts((prev) => ({ ...prev, [statusFilter]: meta.count }));
      setOrderCache((prev) => {
        const next = { ...prev };
        results.forEach((order) => {
          if (order?.id != null) {
            next[order.id] = order;
          }
        });
        return next;
      });

      if (!results.length) {
        if (!selectedOrderId) {
          setSelectedOrderId(null);
        }
        return results;
      }

      const selectedInResults = selectedOrderId
        ? results.some((order) => order.id === selectedOrderId)
        : false;
      const selectedInCache = selectedOrderId ? Boolean(orderCache[selectedOrderId]) : false;

      if (!selectedOrderId || (!selectedInResults && !selectedInCache)) {
        setSelectedOrderId(results[0].id);
      }

      return results;
    } catch (err) {
      console.error("No se pudieron cargar los pedidos", err);
      if (isActive()) {
        setError(err.message || "Ocurrió un error al cargar tus pedidos");
      }
      return [];
    } finally {
      if (!silent && isActive()) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      await loadOrders({ activeRef: () => active });
      if (active) {
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, fromDate, toDate]);

  useEffect(() => {
    if (page !== 1) {
      setPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [fromDate, toDate]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadOrders({ silent: true });
    }, 20000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, fromDate, toDate]);

  const sortedOrders = useMemo(
    () => [...orders].sort((a, b) => new Date(b.updated_at || b.updatedAt) - new Date(a.updated_at || a.updatedAt)),
    [orders],
  );

  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) return null;
    return orderCache[selectedOrderId] || sortedOrders.find((order) => order.id === selectedOrderId) || null;
  }, [selectedOrderId, sortedOrders, orderCache]);

  const hasOrders = sortedOrders.length > 0;
  const totalPages = Math.max(1, Math.ceil((orderMeta.count || 0) / pageSize));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    if (!selectedOrderId) return;
    if (orderCache[selectedOrderId]) return;
    let active = true;
    setLoadingDetail(true);
    fetchOrder(selectedOrderId)
      .then((order) => {
        if (!active || !order) return;
        setOrderCache((prev) => ({ ...prev, [order.id]: order }));
      })
      .catch((err) => {
        console.warn("No se pudo cargar el pedido", err);
      })
      .finally(() => {
        if (active) setLoadingDetail(false);
      });
    return () => {
      active = false;
    };
  }, [selectedOrderId, orderCache]);

  useEffect(() => {
    if (!draftSuccess) return;
    const timer = setTimeout(() => setDraftSuccess(""), 4000);
    return () => clearTimeout(timer);
  }, [draftSuccess]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOrders({ silent: true });
    setRefreshing(false);
  };

  const whatsappUrl = selectedOrder
    ? `https://wa.me/5492604055455?text=Hola%20SrBuj%203D,%20consulto%20por%20el%20pedido%20%23${selectedOrder.id}`
    : "https://wa.me/5492604055455";

  const handleDraftChange = (field, value) => {
    setDraftData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleModality = (value) => {
    setDraftData((prev) => {
      const hasValue = prev.modalities.includes(value);
      return {
        ...prev,
        modalities: hasValue
          ? prev.modalities.filter((item) => item !== value)
          : [...prev.modalities, value],
      };
    });
  };

  const resetDraftForm = () => {
    setDraftData({
      productName: "",
      category: "",
      price: "",
      stlLink: "",
      modalities: [],
      alias: "",
      cuil: "",
      mpEmail: "",
    });
    setDraftPhotos([]);
    setDraftStlFile(null);
  };

  const handleDraftSubmit = async (event) => {
    event.preventDefault();
    setDraftError("");
    setDraftSuccess("");

    if (!draftData.productName.trim()) {
      setDraftError("Indicá el nombre del producto.");
      return;
    }
    if (!draftData.alias.trim()) {
      setDraftError("Necesitamos tu alias o nombre público.");
      return;
    }
    if (!draftData.mpEmail.trim()) {
      setDraftError("Ingresá el email de Mercado Pago para las liquidaciones.");
      return;
    }
    if (draftData.modalities.length === 0) {
      setDraftError("Seleccioná al menos una modalidad de venta.");
      return;
    }
    if (!draftData.category) {
      setDraftError("Seleccioná una categoría.");
      return;
    }
    if (!draftData.price) {
      setDraftError("Indicá un precio sugerido mayor a AR$ 6000.");
      return;
    }
    const numericPrice = Number(draftData.price);
    if (!Number.isFinite(numericPrice) || numericPrice <= 6000) {
      setDraftError("El precio sugerido debe ser mayor a AR$ 6000.");
      return;
    }
    if (draftData.cuil.trim() && !isValidCuit(draftData.cuil.trim())) {
      setDraftError("Ingresá un CUIL/CUIT válido (ej: 20-12345678-9).");
      return;
    }

    const formData = new FormData();
    formData.append("product_name", draftData.productName.trim());
    formData.append("status", "pending");
    if (draftData.category) formData.append("category", draftData.category);
    formData.append("suggested_price", numericPrice);
    if (draftData.stlLink.trim()) formData.append("stl_url", draftData.stlLink.trim());
    draftData.modalities.forEach((modality) => formData.append("modalities", modality));
    formData.append("seller_alias", draftData.alias.trim());
    if (draftData.cuil.trim()) formData.append("seller_cuil", draftData.cuil.trim());
    formData.append("seller_mp_email", draftData.mpEmail.trim());

    draftPhotos.forEach((file) => formData.append("photos", file));
    if (draftStlFile) formData.append("stl_file", draftStlFile);

    setDraftSubmitting(true);
    try {
      await createListingDraft(formData);
      setDraftSuccess("¡Gracias! Revisaremos la propuesta y te contactaremos.");
      resetDraftForm();
    } catch (err) {
      setDraftError(err.message || "No pudimos guardar tu propuesta, probá nuevamente.");
    } finally {
      setDraftSubmitting(false);
    }
  };

  if (loading) {
    return (
      <section className="container py-5 text-center">
        <div className="spinner-border text-primary mb-3" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
        <p className="text-muted">Consultando el estado de tus pedidos…</p>
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
    <section className="container py-5 orders-layout">
      <div className="orders-header d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3 mb-4">
        <div>
          <h1 className="h3 mb-1">Seguimiento de pedidos</h1>
          <p className="text-muted mb-0">
            Visualizá el estado actual de cada impresión, su última actualización y mantené tus pedidos al día.
          </p>
        </div>
        <div className="d-flex flex-column flex-sm-row align-items-stretch align-items-sm-center gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm align-self-start align-self-lg-center"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <FaSyncAlt className={`me-2 ${refreshing ? "icon-spin" : ""}`} />
            {refreshing ? "Actualizando…" : "Actualizar"}
          </button>
          <button
            type="button"
            className={`btn btn-sm ${showVendorForm ? "btn-outline-primary" : "btn-primary"}`}
            onClick={() => {
              setShowVendorForm((prev) => !prev);
              setDraftError("");
              setDraftSuccess("");
            }}
          >
            <FaPlusCircle className="me-2" /> {showVendorForm ? "Cerrar formulario" : "Quiero vender"}
          </button>
        </div>
      </div>

      {showVendorForm && (
        <div className="card vendor-card border-0 shadow-sm mb-4">
          <div className="card-body p-4">
            <h2 className="h5 mb-3">Enviá tu producto para publicar</h2>
            <p className="text-muted small mb-4">
              Completá los datos del modelo. Crearemos un borrador para que nuestro equipo lo revise y active en la tienda cuando esté aprobado.
            </p>
            {draftError && <div className="alert alert-danger py-2">{draftError}</div>}
            {draftSuccess && <div className="alert alert-success py-2">{draftSuccess}</div>}
            <form className="row g-3" onSubmit={handleDraftSubmit}>
              <div className="col-12 col-md-6">
                <label className="form-label">Nombre del producto *</label>
                <input
                  className="form-control"
                  value={draftData.productName}
                  onChange={(e) => handleDraftChange("productName", e.target.value)}
                  placeholder="Mate gamer, set de llaveros…"
                  required
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">Categoría *</label>
                <select
                  className="form-select"
                  value={draftData.category}
                  onChange={(e) => handleDraftChange("category", e.target.value)}
                  required
                >
                  <option value="">Seleccioná una categoría</option>
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label">Precio sugerido (ARS)</label>
                <input
                  type="number"
                  className="form-control"
                  min="6001"
                  step="0.01"
                  value={draftData.price}
                  onChange={(e) => handleDraftChange("price", e.target.value)}
                  placeholder="6500"
                  required
                />
              </div>
              <div className="col-12 col-md-8">
                <label className="form-label">Modalidades</label>
                <div className="d-flex flex-wrap gap-2">
                  {MODALITY_OPTIONS.map((option) => {
                    const isActive = draftData.modalities.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={`modality-chip ${isActive ? "active" : ""}`}
                        onClick={() => toggleModality(option.value)}
                        aria-pressed={isActive}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
                <div className="form-text">Seleccioná todas las opciones que apliquen a tu servicio.</div>
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">Fotos</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="form-control"
                  onChange={(e) => setDraftPhotos(Array.from(e.target.files || []))}
                />
                <div className="form-text">Hasta 5 imágenes en JPG o PNG.</div>
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">Archivo STL (opcional)</label>
                <input
                  type="file"
                  accept=".stl"
                  className="form-control"
                  onChange={(e) => setDraftStlFile((e.target.files && e.target.files[0]) || null)}
                />
                <div className="form-text">También podés compartir un enlace.</div>
              </div>
              <div className="col-12">
                <label className="form-label">Link a STL o carpeta (opcional)</label>
                <input
                  className="form-control"
                  value={draftData.stlLink}
                  onChange={(e) => handleDraftChange("stlLink", e.target.value)}
                  placeholder="https://drive.google.com/..."
                />
              </div>

              <div className="col-12 col-lg-4">
                <label className="form-label">Alias o nombre público *</label>
                <input
                  className="form-control"
                  value={draftData.alias}
                  onChange={(e) => handleDraftChange("alias", e.target.value)}
                  placeholder="@impresionesmza"
                  required
                />
              </div>
              <div className="col-12 col-lg-4">
                <label className="form-label">CUIL / CUIT (opcional)</label>
                <input
                  className="form-control"
                  value={draftData.cuil}
                  onChange={(e) => handleDraftChange("cuil", e.target.value)}
                  placeholder="20-12345678-9"
                />
              </div>
              <div className="col-12 col-lg-4">
                <label className="form-label">Email de Mercado Pago *</label>
                <input
                  type="email"
                  className="form-control"
                  value={draftData.mpEmail}
                  onChange={(e) => handleDraftChange("mpEmail", e.target.value)}
                  placeholder="pagos@tuemail.com"
                  required
                />
              </div>

              <div className="col-12 d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    resetDraftForm();
                    setDraftError("");
                    setDraftSuccess("");
                    setShowVendorForm(false);
                  }}
                  disabled={draftSubmitting}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={draftSubmitting}>
                  {draftSubmitting ? "Enviando…" : "Enviar propuesta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body py-3">
          <div className="d-flex flex-wrap gap-2 mb-3">
            {STATUS_FILTERS.map((filter) => {
              const isActive = statusFilter === filter.key;
              const count = filterCounts[filter.key];
              return (
                <button
                  key={filter.key}
                  type="button"
                  className={`status-filter ${isActive ? "active" : ""}`}
                  onClick={() => {
                    setStatusFilter(filter.key);
                  }}
                >
                  {filter.label}
                  {typeof count === "number" && (
                    <span className="badge bg-light text-dark ms-2">{count}</span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="d-flex flex-column flex-lg-row align-items-lg-center gap-3">
            <div className="d-flex align-items-center gap-2">
              <FaCalendarAlt className="text-muted" />
              <input
                type="date"
                className="form-control form-control-sm"
                value={fromDate}
                max={toDate || undefined}
                onChange={(event) => setFromDate(event.target.value)}
                aria-label="Desde"
              />
            </div>
            <div className="d-flex align-items-center gap-2">
              <FaCalendarAlt className="text-muted" />
              <input
                type="date"
                className="form-control form-control-sm"
                value={toDate}
                min={fromDate || undefined}
                onChange={(event) => setToDate(event.target.value)}
                aria-label="Hasta"
              />
            </div>
            {(fromDate || toDate) && (
              <button
                type="button"
                className="btn btn-link btn-sm text-decoration-none"
                onClick={() => {
                  setFromDate("");
                  setToDate("");
                }}
              >
                Limpiar fechas
              </button>
            )}
            <div className="ms-lg-auto text-muted small">
              Total filtrado: {orderMeta.count ?? 0} pedidos
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-12 col-xl-4">
          <div className="orders-sidebar card border-0 shadow-sm h-100">
            <div className="card-body p-0">
              {hasOrders ? (
                <div className="orders-list">
                  {sortedOrders.map((order) => {
                    const isActive = order.id === selectedOrderId;
                    const statusLabel = STATUS_LABELS[order.status] || "Pendiente";
                    return (
                      <button
                        type="button"
                        key={order.id}
                        className={`order-list-item ${isActive ? "is-active" : ""}`}
                        onClick={() => setSelectedOrderId(order.id)}
                      >
                        <div className="order-list-item__header">
                          <span className="order-list-item__id">Pedido #{order.id}</span>
                          <span className={`status-chip status-chip--${order.status}`}>{statusLabel}</span>
                        </div>
                        <div className="order-list-item__meta">
                          <span className="order-list-item__product">
                            <FaBoxOpen className="me-1" /> {order.product_name || order.items?.[0]?.title || "Pedido"}
                          </span>
                          <span className="order-list-item__date">
                            <FaClock className="me-1" />
                            {new Date(order.updated_at || order.updatedAt).toLocaleDateString("es-AR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-muted py-4">
                  {statusFilter === "history"
                    ? "No encontramos pedidos en el historial seleccionado."
                    : "Todavía no generaste pedidos que coincidan con este filtro."}
                </div>
              )}
            </div>
            <div className="card-footer d-flex justify-content-between align-items-center">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
              >
                Anterior
              </button>
              <span className="small text-muted">
                Página {page} de {totalPages}
              </span>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages}
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-8">
          {selectedOrder ? (
            <div className="order-detail card border-0 shadow-sm">
              <div className="card-body p-4">
                <div className="d-flex flex-column flex-md-row justify-content-between gap-3">
                  <div>
                    <h2 className="h5 mb-1">Pedido #{selectedOrder.id}</h2>
                    <p className="text-muted mb-0">
                      Última actualización: {new Date(selectedOrder.updated_at || selectedOrder.updatedAt).toLocaleString("es-AR")}
                    </p>
                  </div>
                  <div className="text-md-end">
                    <span className={`status-chip status-chip--${selectedOrder.status} mb-2`}>
                      {STATUS_LABELS[selectedOrder.status] || "Pendiente"}
                    </span>
                    <div className="fw-bold">
                      Total AR$ {Number(selectedOrder.total || 0).toLocaleString("es-AR")}
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <OrderStatusTracker status={selectedOrder.status} updatedAt={selectedOrder.updated_at} />
                </div>

                <div className="order-detail__body mt-4">
                  <h3 className="h6 mb-2">Productos</h3>
                  {Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 ? (
                    <ul className="list-group list-group-flush">
                      {selectedOrder.items.map((item) => {
                        const metadata = item.metadata || item.customization || {};
                        const isUploadedStl = metadata.type === "uploaded-stl";
                        const stlQuote = metadata.stlQuote || {};
                        const downloadUrl = stlQuote.downloadUrl || stlQuote.signedUrl || "";
                        return (
                          <li
                            key={`${selectedOrder.id}-${item.id || item.sku || item.title}`}
                            className="list-group-item px-0 d-flex justify-content-between align-items-start"
                          >
                            <div>
                              <div className="fw-semibold">{item.title}</div>
                              <div className="text-muted small">
                                {item.quantity} × AR$ {Number(item.unit_price || 0).toLocaleString("es-AR")}
                              </div>
                              {isUploadedStl && (
                                <div className="text-muted small mt-2">
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
                            </div>
                            <div className="fw-semibold">
                              AR$ {Number((item.quantity || 1) * (item.unit_price || 0)).toLocaleString("es-AR")}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-muted small mb-0">El pedido se registró sin detalle de ítems.</p>
                  )}

                  {selectedOrder.shipping_quote?.precio && (
                    <div className="mt-3">
                      <div className="small text-muted">Envío estimado</div>
                      <div className="fw-semibold">
                        AR$ {Number(selectedOrder.shipping_quote.precio).toLocaleString("es-AR")}
                        {selectedOrder.shipping_quote.eta ? ` · ${selectedOrder.shipping_quote.eta}` : ""}
                      </div>
                    </div>
                  )}
                </div>

                <div className="order-detail__footer mt-4 d-flex flex-column flex-md-row gap-3">
                  <div className="flex-grow-1">
                    <div className="small text-muted mb-1">Seguimiento</div>
                    <a
                      href={whatsappUrl}
                      className="btn btn-outline-success btn-sm d-inline-flex align-items-center gap-2"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <FaWhatsapp /> Consultar por WhatsApp
                    </a>
                  </div>
                  <div className="flex-grow-1 text-muted small text-md-end">
                    Estado actual: {STATUS_LABELS[selectedOrder.status] || "Pendiente"}
                  </div>
                </div>

                {loadingDetail && (
                  <div className="text-center text-muted mt-3">
                    <div className="spinner-border spinner-border-sm me-2" role="status" />
                    Actualizando datos del pedido…
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center py-5 text-muted">
                {hasOrders
                  ? "Seleccioná un pedido del listado para ver el seguimiento."
                  : "Aquí verás el seguimiento de tus pedidos cuando generes uno."}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
