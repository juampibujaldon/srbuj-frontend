import jsPDF from "jspdf";
import { OrderDetail } from "@/lib/api/orders";
import { formatCurrency, formatDate } from "@/lib/i18n";

function addSectionTitle(doc: jsPDF, title: string, x: number, y: number) {
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(title, x, y);
}

export function generateInvoicePdf(order: OrderDetail) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  let cursorY = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("SrBuj - Comprobante de pago", margin, cursorY);
  cursorY += 24;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Factura para: ${order.customerName}`, margin, cursorY);
  cursorY += 14;
  doc.text(`Email: ${order.customerEmail}`, margin, cursorY);
  cursorY += 14;
  doc.text(`Pedido: ${order.number}`, margin, cursorY);
  cursorY += 14;
  doc.text(`Fecha: ${formatDate(order.createdAt)}`, margin, cursorY);
  cursorY += 24;

  addSectionTitle(doc, "Resumen de pago", margin, cursorY);
  cursorY += 14;
  doc.setFont("helvetica", "normal");
  doc.text(`Método: ${order.payment.method}`, margin, cursorY);
  cursorY += 14;
  doc.text(`Estado: ${order.payment.status}`, margin, cursorY);
  cursorY += 14;
  if (order.payment.externalId) {
    doc.text(`Referencia externa: ${order.payment.externalId}`, margin, cursorY);
    cursorY += 14;
  }

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
  order.items.forEach((item) => {
    if (cursorY > 720) {
      doc.addPage();
      cursorY = margin;
    }
    const values = [
      `${item.name} (SKU ${item.sku})`,
      String(item.quantity),
      formatCurrency(item.unitPrice),
      formatCurrency(item.unitPrice * item.quantity)
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
  const subtotal = order.items.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
  doc.setFont("helvetica", "normal");
  doc.text(`Subtotal: ${formatCurrency(subtotal)}`, margin, cursorY);
  cursorY += 14;
  doc.text(`Envío (${order.shipping.carrier}): ${order.shipping.trackingCode ?? "pendiente"}`, margin, cursorY);
  cursorY += 14;
  doc.text(`Total abonado: ${formatCurrency(order.totalCents)}`, margin, cursorY);
  cursorY += 18;

  addSectionTitle(doc, "Datos de envío", margin, cursorY);
  cursorY += 16;
  doc.setFont("helvetica", "normal");
  doc.text(`Carrier: ${order.shipping.carrier}`, margin, cursorY);
  cursorY += 14;
  if (order.shipping.trackingCode) {
    doc.text(`Tracking: ${order.shipping.trackingCode}`, margin, cursorY);
    cursorY += 14;
  }
  if (order.shipping.eta) {
    doc.text(`ETA: ${formatDate(order.shipping.eta)}`, margin, cursorY);
    cursorY += 14;
  }

  cursorY += 30;
  doc.setFontSize(10);
  doc.setTextColor(120);
  const disclaimer =
    "Este comprobante no reemplaza a una factura fiscal si corresponde. Conservá este PDF como constancia de tu compra.";
  doc.text(doc.splitTextToSize(disclaimer, 500), margin, cursorY);

  doc.save(`Factura-${order.number}.pdf`);
}
