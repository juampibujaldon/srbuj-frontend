import React, { useEffect, useState } from "react";
import OrderStatusTracker from "../components/OrderStatusTracker.jsx";
import { fetchOrders } from "../api/orders";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const activeOrder = orders.find((order) => order.id === selectedOrderId);

  return (
    <section className="container py-5">
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2 mb-4">
        <div>
          <h1 className="h3 mb-1">Seguimiento de pedidos</h1>
          <p className="text-muted mb-0">
            Visualizá el estado actual de cada impresión y su última actualización.
          </p>
        </div>
        <div className="ms-md-auto">
          <label htmlFor="order-selector" className="form-label small mb-1">
            Seleccioná un pedido
          </label>
          <select
            id="order-selector"
            className="form-select form-select-sm"
            value={selectedOrderId ?? ""}
            onChange={(event) => setSelectedOrderId(event.target.value || null)}
          >
            {orders.map((order) => (
              <option key={order.id} value={order.id}>
                Pedido #{order.id}
              </option>
            ))}
          </select>
        </div>
      </div>

      {activeOrder ? (
        <div className="row g-4">
          <div className="col-12 col-lg-6 col-xl-4">
            <OrderStatusTracker status={activeOrder.status} updatedAt={activeOrder.updated_at} />
            <div className="text-muted small mt-2">
              Pedido #{activeOrder.id} · Total AR$ {Number(activeOrder.total || 0).toLocaleString("es-AR")}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-muted">No encontramos un pedido con el identificador seleccionado.</p>
      )}
    </section>
  );
}
