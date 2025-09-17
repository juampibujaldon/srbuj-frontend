import React from "react";
import { Link } from "react-router-dom";

export default function ProductCard({ item, onAdd }) {
  return (
    <div className="card card-product h-100">
      <div className="position-relative">
        <img
          src={item.img}
          alt={item.title}
          className="card-img-top"
          style={{ objectFit: "cover", height: 220 }}
        />
      </div>
      <div className="card-body">
        <h5 className="card-title mb-1 text-truncate">{item.title}</h5>
        <div className="text-secondary small mb-2">por {item.author || "SrBuj"}</div>

        <div className="d-flex gap-3 align-items-center small text-secondary mb-3">
          <span title="Me gusta">👍 {item.likes ?? 0}</span>
          <span title="Descargas">⬇ {item.downloads ?? 0}</span>
        </div>

        <div className="d-flex gap-2">
          <button
            className="btn btn-primary btn-sm flex-grow-1"
            onClick={() => onAdd?.(item)}
          >
            Agregar
          </button>
          <Link
            to={`/producto/${item.id}`}
            className="btn btn-outline-secondary btn-sm"
          >
            Ver
          </Link>
        </div>
      </div>
    </div>
  );
}
