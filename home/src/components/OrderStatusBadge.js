const normalize = (status) => {
  switch (status) {
    case "en_proceso":
      return "procesando";
    case "finalizado":
      return "entregado";
    default:
      return status;
  }
};

export default function OrderStatusBadge({ status }) {
  const normalized = normalize(status);
  const map = {
    pendiente: "secondary",
    procesando: "warning",
    enviado: "info",
    entregado: "success",
    cancelado: "secondary",
  };
  const label =
    {
      pendiente: "Pendiente",
      procesando: "Procesando",
      enviado: "Enviado",
      entregado: "Entregado",
      cancelado: "Cancelado",
    }[normalized] || normalized;

  return <span className={`badge text-bg-${map[normalized] || "light"}`}>{label}</span>;
}
