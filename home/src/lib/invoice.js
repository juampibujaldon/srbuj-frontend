import jsPDF from "jspdf";
import { fetchOrder } from "../api/orders";
import { formatPrice } from "./currency";
import { calculateOrderTotals } from "./orderTotals";

const formatCurrency = (value) => formatPrice(value);

const formatDate = (value) =>
  new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(new Date(value));

function addSectionTitle(doc, title, x, y) {
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(title, x, y);
}

export function generateInvoicePdf(order) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  let cursorY = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("SrBuj - Comprobante de pago", margin, cursorY);
  cursorY += 24;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Factura para: ${order.customer || order.customerName || "Cliente"}`, margin, cursorY);
  cursorY += 14;
  doc.text(`Email: ${order.shipping_address?.email || order.customer_email || "-"}`, margin, cursorY);
  cursorY += 14;
  doc.text(`Pedido: ${order.number || order.id}`, margin, cursorY);
  cursorY += 14;
  doc.text(`Fecha: ${formatDate(order.created_at || order.createdAt || new Date())}`, margin, cursorY);
  cursorY += 24;

  addSectionTitle(doc, "Resumen de pago", margin, cursorY);
  cursorY += 14;
  doc.setFont("helvetica", "normal");
  doc.text(`Método: ${order.payment_metadata?.metodo || order.payment?.method || "--"}`, margin, cursorY);
  cursorY += 14;
  doc.text(`Estado: ${order.status || "--"}`, margin, cursorY);
  cursorY += 14;

  cursorY += 10;
  addSectionTitle(doc, "Detalle de items", margin, cursorY);
  cursorY += 18;

  const headers = ["Item", "Cant.", "Unitario", "Total"];
  const colWidths = [220, 60, 100, 100];
  const headerY = cursorY;
  headers.forEach((header, index) => {
    const x = margin + colWidths.slice(0, index).reduce((acc, val) => acc + val, 0);
    doc.setFont("helvetica", "bold");
    doc.text(header, x, headerY);
  });
  cursorY += 16;

  doc.setFont("helvetica", "normal");
  (order.items || []).forEach((item) => {
    if (cursorY > 720) {
      doc.addPage();
      cursorY = margin;
    }
    const values = [
      `${item.title || item.name} (SKU ${item.sku || item.id || "-"})`,
      String(item.quantity || 1),
      formatCurrency(item.unit_price || item.price || 0),
      formatCurrency((item.unit_price || item.price || 0) * (item.quantity || 1)),
    ];
    values.forEach((value, index) => {
      const x = margin + colWidths.slice(0, index).reduce((acc, val) => acc + val, 0);
      const lines = doc.splitTextToSize(value, colWidths[index] - 10);
      doc.text(lines, x, cursorY, { baseline: "top" });
    });
    cursorY += 20;
  });

  cursorY += 10;
  addSectionTitle(doc, "Totales", margin, cursorY);
  cursorY += 16;
  const subtotal = (order.items || []).reduce(
    (total, item) => total + (item.unit_price || item.price || 0) * (item.quantity || 1),
    0
  );
  doc.setFont("helvetica", "normal");
  doc.text(`Subtotal: ${formatCurrency(subtotal)}`, margin, cursorY);
  cursorY += 14;
  const shippingCost = order.shipping_quote?.precio || order.shippingQuote?.precio || 0;
  doc.text(`Envío: ${formatCurrency(shippingCost)}`, margin, cursorY);
  cursorY += 14;
  const { total: normalizedTotal } = calculateOrderTotals(order);
  doc.text(`Total abonado: ${formatCurrency(normalizedTotal || subtotal + Number(shippingCost || 0))}`, margin, cursorY);
  cursorY += 18;

  cursorY += 30;
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(
    doc.splitTextToSize(
      "Este comprobante no reemplaza a una factura fiscal si corresponde. Conservá este PDF como constancia de tu compra.",
      500
    ),
    margin,
    cursorY
  );

  doc.save(`Factura-${order.number || order.id}.pdf`);
}

export async function downloadInvoiceForOrder(orderId) {
  const detail = await fetchOrder(orderId);
  generateInvoicePdf(detail);
}
