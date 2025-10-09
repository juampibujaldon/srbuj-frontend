export default function OrderStatusBadge({ status }) {
  const normalized = (() => {
    if (!status) return "draft";
    const normalizedStatus = String(status).toLowerCase();
    switch (normalizedStatus) {
      case "en_proceso":
      case "procesando":
        return "pending";
      case "imprimiendo":
      case "printing":
      case "pagado":
        return "paid";
      case "entregado":
      case "finalizado":
      case "completado":
        return "fulfilled";
      case "cancelado":
        return "cancelled";
      case "draft":
      case "pending":
      case "paid":
      case "fulfilled":
      case "cancelled":
        return normalizedStatus;
      default:
        return "pending";
    }
  })();

  const map = {
    draft: "secondary",
    pending: "warning",
    paid: "info",
    fulfilled: "success",
    cancelled: "secondary",
  };

  const label =
    {
      draft: "Borrador",
      pending: "Pendiente",
      paid: "Pagado",
      fulfilled: "Completado",
      cancelled: "Cancelado",
    }[normalized] || normalized;

  return <span className={`badge text-bg-${map[normalized] || "light"}`}>{label}</span>;
}
