import React from "react";
import { Link } from "react-router-dom";

function normalizeItem(item = {}) {
  return {
    id: item.id,
    title: item.title ?? item.nombre ?? "Producto",
    author: item.author ?? item.autor ?? "SrBuj",
    img: item.img ?? item.imagen_url ?? "/images/placeholder.png",
    likes: item.likes ?? 0,
    downloads: item.downloads ?? 0,
    price: item.price ?? item.precio,
    weightGr: item.weightGr ?? item.peso_gr ?? 300,
    tag: item.tag ?? item.etiqueta ?? item.badge,
  };
}

export default function ProductCard({ item, onAdd }) {
  const data = normalizeItem(item);
  const priceLabel =
    typeof data.price === "number"
      ? `AR$ ${Number(data.price).toLocaleString("es-AR")}`
      : data.price ?? "Consultar";

  return (
    <div className="card card-product h-100">
      <div className="position-relative">
        <img
          src={data.img}
          alt={data.title}
          className="card-img-top"
          style={{ objectFit: "cover", height: 220 }}
        />
        {data.tag && (
          <span className="badge position-absolute top-0 start-0 m-3 px-3 py-2" style={{
            background: "linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(237, 255, 246, 0.9))",
            color: "#0a3a24",
            borderRadius: 999,
            fontWeight: 600,
          }}>
            {data.tag}
          </span>
        )}
        <div
          className="position-absolute bottom-0 start-0 end-0"
          style={{
            height: 80,
            background: "linear-gradient(0deg, rgba(var(--bs-primary-rgb), 0.6), transparent)",
            pointerEvents: "none",
          }}
        />
      </div>
      <div className="card-body d-flex flex-column">
        <h5 className="card-title mb-1 text-truncate">{data.title}</h5>
        <div className="text-secondary small mb-2">por {data.author}</div>

        <div className="d-flex justify-content-between align-items-center mb-3">
          <span className="badge-soft">{priceLabel}</span>
          <span className="text-muted small">~{data.weightGr} g</span>
        </div>

        <div className="d-flex gap-3 align-items-center small text-muted mb-4">
          <span title="Me gusta">👍 {data.likes}</span>
          <span title="Descargas">⬇ {data.downloads}</span>
        </div>

        <div className="d-flex gap-2 mt-auto">
          <button
            className="btn btn-primary btn-sm flex-grow-1"
            onClick={() => onAdd?.(data)}
            disabled={!onAdd}
          >
            Agregar
          </button>
          <Link
            to={`/producto/${data.id}`}
            className="btn btn-outline-secondary btn-sm"
          >
            Ver
          </Link>
        </div>
      </div>
    </div>
  );
}
