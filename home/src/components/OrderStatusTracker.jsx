import React, { useMemo } from "react";
import PropTypes from "prop-types";
import "./OrderStatusTracker.css";

const STATUS_MAP = {
  pending: {
    label: "Pendiente",
    description: "Estamos revisando tu pedido.",
  },
  processing: {
    label: "En preparación",
    description: "Orden lista para comenzar la impresión.",
  },
  printing: {
    label: "Imprimiendo",
    description: "La impresora está creando tu pieza.",
  },
  completed: {
    label: "Finalizado",
    description: "La impresión terminó y estamos empaquetando.",
  },
  shipped: {
    label: "En el correo",
    description: "Tu pedido está en camino.",
  },
};

const STATUS_SEQUENCE = ["pending", "processing", "printing", "completed", "shipped"];

export default function OrderStatusTracker({ status, updatedAt }) {
  const normalizedStatus = STATUS_SEQUENCE.includes(status) ? status : "pending";

  const { label, description } = useMemo(() => {
    return STATUS_MAP[normalizedStatus] ?? STATUS_MAP.pending;
  }, [normalizedStatus]);

  const currentIndex = STATUS_SEQUENCE.indexOf(normalizedStatus);

  return (
    <div className="order-status card border-0 shadow-sm h-100">
      <div className="card-body">
        <div className={`printer printer--${normalizedStatus}`}>
          <div className="printer__frame">
            <div className="printer__head" />
            <div className="printer__nozzle" />
            <div className="printer__bed">
              <div className="printer__object" />
            </div>
            <div className="printer__base" />
          </div>
        </div>

        <h3 className="h6 mt-3 mb-1">{label}</h3>
        <p className="text-muted small mb-3">{description}</p>
        {updatedAt && (
          <p className="text-muted extra-small mb-0">
            Actualizado: {new Date(updatedAt).toLocaleString()}
          </p>
        )}
      </div>

      <div className="card-footer bg-body-tertiary py-2">
        <ul className="status-timeline">
          {STATUS_SEQUENCE.map((step, index) => {
            const stepInfo = STATUS_MAP[step];
            const reached = index <= currentIndex;
            return (
              <li
                key={step}
                className={`status-timeline__item ${reached ? "is-active" : ""}`}
              >
                <span className="dot" />
                <span className="label">{stepInfo.label}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

OrderStatusTracker.propTypes = {
  status: PropTypes.string,
  updatedAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
};

OrderStatusTracker.defaultProps = {
  status: "pending",
  updatedAt: null,
};
