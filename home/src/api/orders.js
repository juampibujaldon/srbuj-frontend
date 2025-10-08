import { apiJson } from "./client";
import { ordersSeed } from "../data/orders";

const STATUS_TRANSLATIONS = {
  pendiente: "pending",
  pendiente_pago: "pending",
  en_proceso: "processing",
  preparando: "processing",
  imprimiendo: "printing",
  finalizado: "completed",
  completado: "completed",
  enviado: "shipped",
  correo: "shipped",
  printing: "printing",
  processing: "processing",
  completed: "completed",
  shipped: "shipped",
  en_correo: "shipped",
};

const LOCAL_STORAGE_KEY = "ordersState";

const isBrowser = typeof window !== "undefined" && !!window.localStorage;

const normalizeStatus = (status) => {
  if (!status) return "pending";
  const lower = String(status).toLowerCase();
  return STATUS_TRANSLATIONS[lower] || "pending";
};

const normalizeOrder = (order) => ({
  id: order.id ?? order.order_id ?? "",
  status: normalizeStatus(order.status),
  updated_at: order.updated_at ?? order.date ?? new Date().toISOString(),
  product_name: order.product_name ?? order.items?.[0]?.title ?? "Pedido",
  total: order.total ?? order.amount ?? 0,
  items: Array.isArray(order.items) ? order.items : [],
  shipping: order.shipping || order.envio || order.shipping_address || null,
  shippingQuote: order.shippingQuote || order.envio_cotizacion || null,
  customer: order.customer || order.cliente || (order.shipping && order.shipping.nombre) || null,
});

const loadLocalOrders = () => {
  if (!isBrowser) return null;
  try {
    const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn("No se pudo leer ordersState", error);
  }
  return null;
};

const persistOrders = (orders) => {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(orders));
  } catch (error) {
    console.warn("No se pudo guardar ordersState", error);
  }
};

const normalizeOrdersList = (orders = []) => orders.map(normalizeOrder);

export async function fetchOrders() {
  const hasAuthToken = isBrowser && !!localStorage.getItem("token");
  try {
    const data = await apiJson("/api/orders/", { method: "GET" });
    if (Array.isArray(data)) {
      const normalized = normalizeOrdersList(data);
      persistOrders(normalized);
      return normalized;
    }
  } catch (error) {
    console.warn("Falling back to cached or seed orders", error);
  }

  const cached = loadLocalOrders();
  if (cached) {
    return normalizeOrdersList(cached);
  }

  if (hasAuthToken) {
    persistOrders([]);
    return [];
  }

  const seeded = normalizeOrdersList(ordersSeed);
  persistOrders(seeded);
  return seeded;
}

export const fetchUserOrders = fetchOrders;

export async function updateOrderStatus(orderId, status) {
  const normalizedStatus = normalizeStatus(status);
  let updatedOrder = null;

  try {
    const data = await apiJson(`/api/orders/${orderId}/`, {
      method: "PATCH",
      json: { status: normalizedStatus },
    });
    if (data) {
      updatedOrder = normalizeOrder(data);
    }
  } catch (error) {
    console.warn("No se pudo actualizar el pedido en el backend, usando cache local", error);
  }

  let currentOrders = loadLocalOrders();
  if (!currentOrders || currentOrders.length === 0) {
    currentOrders = normalizeOrdersList(ordersSeed);
  } else {
    currentOrders = normalizeOrdersList(currentOrders);
  }

  if (!updatedOrder) {
    updatedOrder = currentOrders.find((order) => order.id === orderId) || {
      id: orderId,
    };
    updatedOrder = {
      ...updatedOrder,
      status: normalizedStatus,
      updated_at: new Date().toISOString(),
    };
  }

  const mergedOrders = currentOrders.map((order) =>
    order.id === updatedOrder.id ? { ...order, ...updatedOrder } : order,
  );

  if (!mergedOrders.some((order) => order.id === updatedOrder.id)) {
    mergedOrders.push(updatedOrder);
  }

  persistOrders(mergedOrders);
  return updatedOrder;
}
