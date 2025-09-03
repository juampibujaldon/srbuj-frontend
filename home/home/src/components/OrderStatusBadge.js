export default function OrderStatusBadge({ status }) {
  const map = {
    en_proceso: "warning",
    enviado: "info",
    finalizado: "success",
    cancelado: "secondary",
  };
  const label =
    {
      en_proceso: "En proceso",
      enviado: "Enviado",
      finalizado: "Finalizado",
      cancelado: "Cancelado",
    }[status] || status;

  return <span className={`badge text-bg-${map[status] || "light"}`}>{label}</span>;
}
