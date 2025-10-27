import { OrderDetail } from "@/lib/api/orders";
import { generateInvoicePdf } from "@/lib/invoice/generateInvoicePdf";

export async function downloadInvoicePdf(orderId: string) {
  const response = await fetch(`/api/orders/${orderId}`);
  if (!response.ok) {
    throw new Error("No pudimos generar la factura, intentá de nuevo");
  }
  const detail = (await response.json()) as OrderDetail;
  generateInvoicePdf(detail);
}
