import React, { useEffect, useMemo, useState } from "react";
import {
  FaBoxOpen,
  FaClock,
  FaHistory,
  FaPlusCircle,
  FaSyncAlt,
  FaWhatsapp,
} from "react-icons/fa";
import OrderStatusTracker from "../components/OrderStatusTracker.jsx";
import { fetchOrders } from "../api/orders";
import { createListingDraft } from "../api/listings";

const STATUS_LABELS = {
  pending: "Pendiente",
  processing: "En preparación",
  printing: "Imprimiendo",
  completed: "Finalizado",
  shipped: "En el correo",
};

const isClosedStatus = (status) => status === "completed" || status === "shipped";

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

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
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

  const loadOrders = async () => {
    try {
      const data = await fetchOrders();
      setOrders(data);
      return data;
    } catch (err) {
      console.error("No se pudieron cargar los pedidos", err);
      setError(err.message || "Ocurrió un error al cargar tus pedidos");
      return [];
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await loadOrders();
        if (active && data.length) {
          const latest = [...data].sort(
            (a, b) => new Date(b.updated_at) - new Date(a.updated_at),
          )[0];
          setSelectedOrderId((prev) => prev ?? latest.id);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!orders.length) return;
    if (!selectedOrderId || !orders.some((order) => order.id === selectedOrderId)) {
      const latest = [...orders].sort(
        (a, b) => new Date(b.updated_at) - new Date(a.updated_at),
      )[0];
      setSelectedOrderId(latest?.id ?? null);
    }
  }, [orders, selectedOrderId]);

  useEffect(() => {
    if (!orders.length) return;
    const interval = setInterval(() => {
      loadOrders();
    }, 20000);
    return () => clearInterval(interval);
  }, [orders.length]);

  const sortedOrders = useMemo(
    () => [...orders].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)),
    [orders],
  );

  const activeOrders = useMemo(
    () => sortedOrders.filter((order) => !isClosedStatus(order.status)),
    [sortedOrders],
  );

  const completedOrders = useMemo(
    () => sortedOrders.filter((order) => isClosedStatus(order.status)),
    [sortedOrders],
  );

  const visibleOrders = showCompleted ? sortedOrders : activeOrders;
  const hasOrders = sortedOrders.length > 0;

  const activeOrder = useMemo(
    () => sortedOrders.find((order) => order.id === selectedOrderId) || null,
    [sortedOrders, selectedOrderId],
  );

  useEffect(() => {
    if (!showCompleted && activeOrder && isClosedStatus(activeOrder.status)) {
      const nextActive = activeOrders[0] || null;
      setSelectedOrderId(nextActive ? nextActive.id : null);
    }
  }, [showCompleted, activeOrder, activeOrders]);

  useEffect(() => {
    if (!draftSuccess) return;
    const timer = setTimeout(() => setDraftSuccess(""), 4000);
    return () => clearTimeout(timer);
  }, [draftSuccess]);

  const handleRefresh = async () => {
    setRefreshing(true);
    const data = await loadOrders();
    if (data.length) {
      const latest = [...data].sort(
        (a, b) => new Date(b.updated_at) - new Date(a.updated_at),
      )[0];
      setSelectedOrderId((prev) => prev ?? latest.id);
    }
    setRefreshing(false);
  };

  const whatsappUrl = activeOrder
    ? `https://wa.me/5492604055455?text=Hola%20SrBuj%203D,%20consulto%20por%20el%20pedido%20%23${activeOrder.id}`
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
    if (draftData.price) {
      const numericPrice = Number(draftData.price);
      if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
        setDraftError("El precio sugerido debe ser un número mayor a 0.");
        return;
      }
      if (numericPrice > 6000) {
        setDraftError("El precio sugerido no puede superar AR$ 6000.");
        return;
      }
    }
    if (draftData.cuil.trim() && !isValidCuit(draftData.cuil.trim())) {
      setDraftError("Ingresá un CUIL/CUIT válido (ej: 20-12345678-9).");
      return;
    }

    const formData = new FormData();
    formData.append("product_name", draftData.productName.trim());
    formData.append("status", "pending");
    if (draftData.category.trim()) formData.append("category", draftData.category.trim());
    if (draftData.price) formData.append("suggested_price", draftData.price);
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
          <div className="form-check form-switch orders-toggle mb-0">
            <input
              className="form-check-input"
              type="checkbox"
              id="orders-show-completed"
              checked={showCompleted}
              onChange={(event) => {
                const value = event.target.checked;
                setShowCompleted(value);
                if (!value) setShowHistory(false);
              }}
            />
            <label className="form-check-label" htmlFor="orders-show-completed">
              Mostrar completados
            </label>
          </div>
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
                <label className="form-label">Categoría</label>
                <input
                  className="form-control"
                  value={draftData.category}
                  onChange={(e) => handleDraftChange("category", e.target.value)}
                  placeholder="Decoración, Merch, Prototipo…"
                />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label">Precio sugerido (ARS)</label>
                <input
                  type="number"
                  className="form-control"
                  min="0"
                  max="6000"
                  step="0.01"
                  value={draftData.price}
                  onChange={(e) => handleDraftChange("price", e.target.value)}
                  placeholder="6000"
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

      <div className="row g-4">
        <div className="col-12 col-xl-4">
          <div className="orders-sidebar card border-0 shadow-sm h-100">
            <div className="card-body p-3">
              <h2 className="h6 mb-3">Tus pedidos</h2>
              <div className="orders-list">
                {!hasOrders ? (
                  <div className="text-muted small">Aún no registramos pedidos en tu cuenta.</div>
                ) : visibleOrders.length === 0 && !showCompleted ? (
                  <div className="text-muted small">
                    Todas tus órdenes activas están finalizadas. Revisá el historial más abajo.
                  </div>
                ) : (
                  visibleOrders.map((order) => {
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
                            <FaBoxOpen className="me-1" /> {order.product_name || "Pedido"}
                          </span>
                          <span className="order-list-item__date">
                            <FaClock className="me-1" />
                            {new Date(order.updated_at).toLocaleDateString("es-AR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {!showCompleted && completedOrders.length > 0 && (
                <div className="orders-history mt-3">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-2"
                    onClick={() => setShowHistory((prev) => !prev)}
                  >
                    <FaHistory /> {showHistory ? "Ocultar historial" : "Ver historial"}
                    <span className="badge bg-light text-dark">{completedOrders.length}</span>
                  </button>
                  {showHistory && (
                    <div className="orders-list mt-3">
                      {completedOrders.map((order) => {
                        const isActive = order.id === selectedOrderId;
                        const statusLabel = STATUS_LABELS[order.status] || "Pendiente";
                        return (
                          <button
                            type="button"
                            key={`history-${order.id}`}
                            className={`order-list-item order-list-item--history ${
                              isActive ? "is-active" : ""
                            }`}
                            onClick={() => setSelectedOrderId(order.id)}
                          >
                            <div className="order-list-item__header">
                              <span className="order-list-item__id">Pedido #{order.id}</span>
                              <span className={`status-chip status-chip--${order.status}`}>{statusLabel}</span>
                            </div>
                            <div className="order-list-item__meta">
                              <span className="order-list-item__product">
                                <FaBoxOpen className="me-1" /> {order.product_name || "Pedido"}
                              </span>
                              <span className="order-list-item__date">
                                <FaClock className="me-1" />
                                {new Date(order.updated_at).toLocaleDateString("es-AR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-8">
          {activeOrder ? (
            <div className="order-detail card border-0 shadow-sm">
              <div className="card-body p-4">
                <div className="d-flex flex-column flex-md-row justify-content-between gap-3">
                  <div>
                    <h2 className="h5 mb-1">Pedido #{activeOrder.id}</h2>
                    <p className="text-muted mb-0">
                      Última actualización: {new Date(activeOrder.updated_at).toLocaleString("es-AR")}
                    </p>
                  </div>
                  <div className="text-md-end">
                    <span className={`status-chip status-chip--${activeOrder.status} mb-2`}>
                      {STATUS_LABELS[activeOrder.status] || "Pendiente"}
                    </span>
                    <div className="fw-bold">
                      Total AR$ {Number(activeOrder.total || 0).toLocaleString("es-AR")}
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <OrderStatusTracker status={activeOrder.status} updatedAt={activeOrder.updated_at} />
                </div>

                <div className="order-detail__footer mt-4 d-flex flex-column flex-md-row gap-3">
                  <div className="flex-grow-1">
                    <div className="small text-muted mb-1">Producto</div>
                    <div className="fw-semibold">{activeOrder.product_name || "Modelo personalizado"}</div>
                  </div>
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
                </div>
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
