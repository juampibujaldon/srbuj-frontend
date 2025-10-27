import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_LABELS, OrderStatus } from "@/lib/utils";

const STATUS_VARIANTS: Record<OrderStatus, "default" | "warning" | "success" | "danger" | "info"> = {
  pending_payment: "warning",
  paid: "info",
  processing: "info",
  shipped: "info",
  delivered: "success",
  canceled: "danger",
  refunded: "warning",
  failed: "danger"
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant={STATUS_VARIANTS[status]}>{ORDER_STATUS_LABELS[status]}</Badge>;
}
