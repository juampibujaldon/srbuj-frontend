import React, { useEffect, useState } from "react";
import OrderStatusTracker from "../components/OrderStatusTracker.jsx";
import { fetchOrders, updateOrderStatus } from "../api/orders";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pendiente" },
  { value: "processing", label: "En preparación" },
  { value: "printing", label: "Imprimiendo" },
  { value: "completed", label: "Finalizado" },
  { value: "shipped", label: "En el correo" },
];

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(null);
  const [message, setMessage] = useState("");

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
    setUpdating(orderId);
    setMessage("");
    try {
      const updated = await updateOrderStatus(orderId, newStatus);
      setOrders((prev) =>
        prev.map((order) => (order.id === updated.id ? { ...order, ...updated } : order)),
      );
      setMessage(`Pedido ${orderId} actualizado a "${
        STATUS_OPTIONS.find((opt) => opt.value === updated.status)?.label || updated.status
      }"`);
    } catch (err) {
      console.error("No se pudo actualizar el pedido", err);
      setMessage(err.message || "No se pudo actualizar el pedido");
    } finally {
      setUpdating(null);
    }
  };

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
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2 mb-4">
        <div>
          <h1 className="h3 mb-1">Gestión de pedidos</h1>
          <p className="text-muted mb-0">
            Actualizá el estado de las impresiones y notificá a los clientes en tiempo real.
          </p>
        </div>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={loadOrders}>
          Refrescar
        </button>
      </div>

      {message && <div className="alert alert-info" role="alert">{message}</div>}

      {orders.length === 0 ? (
        <p className="text-muted">Sin pedidos registrados.</p>
      ) : (
        <div className="row g-4">
          {orders.map((order) => (
            <div key={order.id} className="col-12 col-xl-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h2 className="h5 mb-0">Pedido #{order.id}</h2>
                    <span className="badge text-bg-light">
                      Total AR$ {Number(order.total || 0).toLocaleString("es-AR")}
                    </span>
                  </div>
                  <OrderStatusTracker status={order.status} updatedAt={order.updated_at} />

                  <div className="mt-3">
                    <label htmlFor={`status-${order.id}`} className="form-label small">
                      Estado
                    </label>
                    <select
                      id={`status-${order.id}`}
                      className="form-select"
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
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
