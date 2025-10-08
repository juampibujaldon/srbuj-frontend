import React, { useEffect, useMemo, useState } from "react";
import {
  FaBoxOpen,
  FaCheckCircle,
  FaClock,
  FaFilter,
  FaPrint,
  FaSyncAlt,
  FaTools,
  FaTruck,
} from "react-icons/fa";
import OrderStatusTracker from "../components/OrderStatusTracker.jsx";
import { fetchOrders, updateOrderStatus } from "../api/orders";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pendiente", icon: <FaClock /> },
  { value: "processing", label: "En preparación", icon: <FaTools /> },
  { value: "printing", label: "Imprimiendo", icon: <FaPrint /> },
  { value: "completed", label: "Finalizado", icon: <FaCheckCircle /> },
  { value: "shipped", label: "En el correo", icon: <FaTruck /> },
];

const isClosedStatus = (status) => status === "completed" || status === "shipped";

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
      const data = await fetchOrders();
      setOrders(data);
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
      const updated = await updateOrderStatus(orderId, newStatus);
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
                      <FaBoxOpen /> {order.product_name || "Producto personalizado"}
                    </div>

                    <OrderStatusTracker status={order.status} updatedAt={order.updated_at} />

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
