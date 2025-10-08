import React, { useEffect, useMemo, useState } from "react";
import { FaBoxOpen, FaClock, FaHistory, FaSyncAlt, FaWhatsapp } from "react-icons/fa";
import OrderStatusTracker from "../components/OrderStatusTracker.jsx";
import { fetchOrders } from "../api/orders";

const STATUS_LABELS = {
  pending: "Pendiente",
  processing: "En preparación",
  printing: "Imprimiendo",
  completed: "Finalizado",
  shipped: "En el correo",
};

const isClosedStatus = (status) => status === "completed" || status === "shipped";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

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

  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  }, [orders]);

  const activeOrder = useMemo(() => {
    return sortedOrders.find((order) => order.id === selectedOrderId);
  }, [sortedOrders, selectedOrderId]);

  const activeOrders = useMemo(() => sortedOrders.filter((order) => !isClosedStatus(order.status)), [sortedOrders]);

  const completedOrders = useMemo(() => sortedOrders.filter((order) => isClosedStatus(order.status)), [sortedOrders]);

  const visibleOrders = showCompleted ? sortedOrders : activeOrders;

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

  if (!orders.length) {
    return (
      <section className="container py-5 text-center text-muted">
        <h1 className="h4 mb-2">Tus pedidos</h1>
        <p>Aún no registramos pedidos en tu cuenta.</p>
      </section>
    );
  }

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
        </div>
      </div>

      <div className="row g-4">
        <div className="col-12 col-xl-4">
          <div className="orders-sidebar card border-0 shadow-sm h-100">
            <div className="card-body p-3">
              <h2 className="h6 mb-3">Tus pedidos</h2>
              <div className="orders-list">
                {visibleOrders.length === 0 && !showCompleted ? (
                  <div className="text-muted small">
                    Todas tus órdenes están finalizadas. Podés revisar el historial más abajo.
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
                    <div className="fw-bold">Total AR$ {Number(activeOrder.total || 0).toLocaleString("es-AR")}</div>
                  </div>
                </div>

                <div className="mt-4">
                  <OrderStatusTracker
                    status={activeOrder.status}
                    updatedAt={activeOrder.updated_at}
                  />
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
            <p className="text-muted">Seleccioná un pedido para ver el detalle.</p>
          )}
        </div>
      </div>
    </section>
  );
}
