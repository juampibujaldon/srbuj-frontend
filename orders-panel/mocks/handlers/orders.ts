import { HttpResponse, http } from "msw";
import type {
  OrderDetail,
  OrderSummary,
  OrderTimelineEvent,
  OrdersPage,
  OrdersFilters,
  OrderNote
} from "@/lib/api/orders";
import { ORDER_STATUS_LABELS, OrderStatus, STATUS_ORDER } from "@/lib/utils";
import { formatDateTime } from "@/lib/i18n";

interface OrderRecord extends OrderDetail {}

const actors = ["system", "admin", "customer"] as const;

const paymentStatusSequence: OrderDetail["payment"]["status"][] = [
  "approved",
  "pending",
  "rejected"
];

const carriers = ["Andreani", "Correo Argentino", "OCA", "Moto Flex"];

const customers = [
  { name: "Juan Pérez", email: "juan@example.com" },
  { name: "María González", email: "maria@example.com" },
  { name: "Carlos Díaz", email: "carlos@example.com" },
  { name: "Lucía López", email: "lucia@example.com" },
  { name: "Ana Torres", email: "ana@example.com" }
];

const catalog = [
  { name: "Mate clásico", sku: "MAT-CLASIC", price: 2300 },
  { name: "Mate imperial", sku: "MAT-IMP", price: 4200 },
  { name: "Bombilla acero", sku: "BOM-STEEL", price: 1800 },
  { name: "Kit Matero", sku: "KIT-MAT", price: 6700 },
  { name: "Termo 1L", sku: "TER-1L", price: 9800 }
];

function random<T>(array: readonly T[], index: number) {
  return array[index % array.length];
}

function buildTimeline(id: string, status: OrderStatus, createdAt: string) {
  const currentIndex = STATUS_ORDER.indexOf(status);
  const events: OrderTimelineEvent[] = [];
  for (let i = 0; i <= currentIndex; i++) {
    events.push({
      id: `${id}-event-${i}`,
      actor: random(actors, i),
      createdAt: new Date(new Date(createdAt).getTime() + i * 3600_000).toISOString(),
      note: `Estado ${ORDER_STATUS_LABELS[STATUS_ORDER[i]]}`,
      status: STATUS_ORDER[i]
    });
  }
  return events;
}

function buildItems(seed: number) {
  const items = [] as OrderDetail["items"];
  const itemCount = (seed % 3) + 1;
  for (let i = 0; i < itemCount; i++) {
    const product = catalog[(seed + i) % catalog.length];
    const quantity = ((seed + i) % 4) + 1;
    items.push({
      id: `${product.sku}-${seed}-${i}`,
      sku: product.sku,
      name: product.name,
      quantity,
      unitPrice: product.price * 100,
      imageUrl: `/images/${product.sku.toLowerCase()}.jpg`
    });
  }
  return items;
}

function calculateTotal(items: OrderDetail["items"]) {
  return items.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
}

function buildOrder(index: number): OrderRecord {
  const customer = customers[index % customers.length];
  const status = STATUS_ORDER[index % STATUS_ORDER.length];
  const createdAt = new Date(Date.now() - index * 3600_000).toISOString();
  const items = buildItems(index);
  const totalCents = calculateTotal(items);
  const paymentStatus = paymentStatusSequence[index % paymentStatusSequence.length];
  const shippingCarrier = carriers[index % carriers.length];
  return {
    id: `order-${index}`,
    number: `SRB-${(3000 + index).toString().padStart(5, "0")}`,
    createdAt,
    customerName: customer.name,
    customerEmail: customer.email,
    status,
    totalCents,
    payment: {
      method: index % 2 === 0 ? "MercadoPago" : "Transferencia",
      status: paymentStatus,
      externalId: index % 2 === 0 ? `MP-${index}` : undefined
    },
    shipping: {
      carrier: shippingCarrier,
      trackingCode: status === "pending_payment" ? undefined : `TRK-${index}`,
      eta: new Date(new Date(createdAt).getTime() + 5 * 24 * 3600_000).toISOString(),
      url: `https://tracking.example.com/TRK-${index}`,
      status: status === "delivered" ? "delivered" : "in_transit"
    },
    invoiceUrl: `/invoices/${index}.pdf`,
    trackingUrl: `https://tracking.example.com/TRK-${index}`,
    items,
    timeline: buildTimeline(`order-${index}`, status, createdAt),
    notes: [
      {
        id: `note-${index}-0`,
        createdAt,
        author: "Sistema",
        internal: false,
        content: "Pedido creado"
      }
    ]
  };
}

const orderStore: OrderRecord[] = Array.from({ length: 200 }, (_, i) => buildOrder(i + 1));

function applyFilters(data: OrderRecord[], filters?: OrdersFilters) {
  if (!filters) return data;
  return data.filter((order) => {
    if (filters.search) {
      const intent = filters.search.toLowerCase();
      const matches =
        order.number.toLowerCase().includes(intent) ||
        order.items.some((item) => item.name.toLowerCase().includes(intent));
      if (!matches) return false;
    }
    if (filters.status && filters.status.length > 0) {
      if (!filters.status.includes(order.status)) return false;
    }
    if (filters.customer) {
      const target = filters.customer.toLowerCase();
      if (
        !order.customerName.toLowerCase().includes(target) &&
        !order.customerEmail.toLowerCase().includes(target)
      )
        return false;
    }
    if (filters.paymentStatus && filters.paymentStatus.length > 0) {
      if (!filters.paymentStatus.includes(order.payment.status)) return false;
    }
    if (filters.carrier) {
      if (order.shipping.carrier !== filters.carrier) return false;
    }
    if (filters.dateFrom) {
      if (new Date(order.createdAt) < new Date(filters.dateFrom)) return false;
    }
    if (filters.dateTo) {
      if (new Date(order.createdAt) > new Date(filters.dateTo)) return false;
    }
    return true;
  });
}

function toSummary(order: OrderRecord): OrderSummary {
  const { notes, items, timeline, ...summary } = order;
  return summary;
}

function findOrder(id: string) {
  const order = orderStore.find((item) => item.id === id);
  if (!order) {
    throw new Error("Pedido no encontrado");
  }
  return order;
}

function paginate(data: OrderRecord[], cursor?: string, pageSize = 30): OrdersPage {
  const startIndex = cursor ? data.findIndex((order) => order.id === cursor) + 1 : 0;
  const slice = data.slice(startIndex, startIndex + pageSize);
  const nextCursor = slice.length === pageSize ? slice[slice.length - 1].id : undefined;
  return {
    data: slice.map(toSummary),
    nextCursor
  };
}

function appendTimeline(order: OrderRecord, status: OrderStatus, note?: string, actor: OrderTimelineEvent["actor"] = "admin") {
  order.timeline.push({
    id: `${order.id}-event-${order.timeline.length + 1}`,
    createdAt: new Date().toISOString(),
    actor,
    status,
    note: note ?? `Estado actualizado a ${ORDER_STATUS_LABELS[status]}`
  });
}

export const ordersHandlers = [
  http.get("/api/orders", async ({ request }) => {
    const url = new URL(request.url);
    const role = url.searchParams.get("role") as "customer" | "admin" | null;
    const cursor = url.searchParams.get("cursor") ?? undefined;
    const pageSize = Number(url.searchParams.get("pageSize") ?? "30");
    const statusParams = url.searchParams.getAll("status");
    const paymentParams = url.searchParams.getAll("paymentStatus");
    const filters: OrdersFilters = {
      search: url.searchParams.get("search") ?? undefined,
      customer: url.searchParams.get("customer") ?? undefined,
      carrier: url.searchParams.get("carrier") ?? undefined,
      dateFrom: url.searchParams.get("dateFrom") ?? undefined,
      dateTo: url.searchParams.get("dateTo") ?? undefined,
      status: statusParams.length ? (statusParams as OrderStatus[]) : undefined,
      paymentStatus: paymentParams.length
        ? (paymentParams as OrderDetail["payment"]["status"][])
        : undefined
    };

    let data = [...orderStore];
    if (role === "customer") {
      data = data.filter((order) => order.payment.status !== "rejected");
    }
    data = applyFilters(data, filters);
    const page = paginate(data, cursor, pageSize);
    return HttpResponse.json(page);
  }),

  http.get("/api/orders/:id", ({ params }) => {
    const order = findOrder(params.id as string);
    return HttpResponse.json(order);
  }),

  http.post("/api/orders/:id/status", async ({ request, params }) => {
    const order = findOrder(params.id as string);
    const { status, note } = (await request.json()) as { status: OrderStatus; note?: string };
    order.status = status;
    appendTimeline(order, status, note ?? "Cambio de estado manual");
    return HttpResponse.json(order);
  }),

  http.post("/api/orders/:id/cancel", async ({ request, params }) => {
    const order = findOrder(params.id as string);
    const { reason } = (await request.json()) as { reason?: string };
    order.status = "canceled";
    appendTimeline(order, "canceled", reason ?? "Cancelado por el cliente", "customer");
    return HttpResponse.json(order);
  }),

  http.post("/api/orders/:id/tracking", async ({ request, params }) => {
    const order = findOrder(params.id as string);
    const { carrier, trackingCode, eta } = (await request.json()) as {
      carrier: string;
      trackingCode: string;
      eta?: string;
    };
    order.shipping = {
      ...order.shipping,
      carrier,
      trackingCode,
      eta
    };
    appendTimeline(order, order.status, `Tracking actualizado a ${trackingCode}`);
    return HttpResponse.json(order);
  }),

  http.post("/api/orders/:id/notes", async ({ request, params }) => {
    const order = findOrder(params.id as string);
    const { content, internal } = (await request.json()) as {
      content: string;
      internal?: boolean;
    };
    const note: OrderNote = {
      id: `${order.id}-note-${order.notes.length + 1}`,
      author: internal ? "Admin" : "Cliente",
      content,
      internal: Boolean(internal),
      createdAt: new Date().toISOString()
    };
    order.notes.push(note);
    return HttpResponse.json(order);
  }),

  http.post("/api/orders/:id/resend-email", () => {
    return HttpResponse.json({ success: true, deliveredAt: formatDateTime(new Date().toISOString()) });
  })
];

export default ordersHandlers;
