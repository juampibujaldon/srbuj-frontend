import { formatCurrency, formatDate } from "@/lib/i18n";
import { OrderSummary } from "@/lib/api/orders";

interface ExportOptions {
  onlySelected?: boolean;
  filename?: string;
}

export function buildOrdersCsv(orders: OrderSummary[]) {
  const headers = [
    "Numero",
    "Fecha",
    "Cliente",
    "Email",
    "Estado",
    "Pago",
    "Total",
    "Carrier",
    "Tracking"
  ];
  const lines = orders.map((order) =>
    [
      order.number,
      formatDate(order.createdAt),
      order.customerName,
      order.customerEmail,
      order.status,
      order.payment.status,
      formatCurrency(order.totalCents),
      order.shipping.carrier,
      order.shipping.trackingCode ?? ""
    ].join(",")
  );
  return [headers.join(","), ...lines].join("\n");
}

export function downloadOrdersCsv(orders: OrderSummary[], options: ExportOptions = {}) {
  if (typeof window === "undefined") return;
  const csv = buildOrdersCsv(orders);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.setAttribute("download", options.filename ?? "pedidos.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
