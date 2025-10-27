import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const STATUS_ORDER = [
  "pending_payment",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "canceled",
  "refunded",
  "failed"
] as const;

export type OrderStatus = (typeof STATUS_ORDER)[number];

export function isTransitionAllowed(from: OrderStatus, to: OrderStatus) {
  switch (from) {
    case "pending_payment":
      return to === "paid" || to === "canceled" || to === "failed";
    case "paid":
      return to === "processing" || to === "refunded" || to === "failed";
    case "processing":
      return to === "shipped" || to === "failed";
    case "shipped":
      return to === "delivered" || to === "failed";
    case "delivered":
      return to === "failed";
    case "canceled":
    case "refunded":
      return to === "failed";
    case "failed":
      return false;
    default:
      return false;
  }
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "Pendiente de pago",
  paid: "Pagado",
  processing: "Procesando",
  shipped: "Enviado",
  delivered: "Entregado",
  canceled: "Cancelado",
  refunded: "Reembolsado",
  failed: "Error"
};
