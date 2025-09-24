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
  };
}

export default function ProductCard({ item, onAdd }) {
  const data = normalizeItem(item);

  return (
    <div className="card card-product h-100">
      <div className="position-relative">
        <img
          src={data.img}
          alt={data.title}
          className="card-img-top"
          style={{ objectFit: "cover", height: 220 }}
        />
      </div>
      <div className="card-body">
        <h5 className="card-title mb-1 text-truncate">{data.title}</h5>
        <div className="text-secondary small mb-2">por {data.author}</div>

        <div className="d-flex gap-3 align-items-center small text-secondary mb-3">
          <span title="Me gusta">👍 {data.likes}</span>
          <span title="Descargas">⬇ {data.downloads}</span>
        </div>

        <div className="d-flex gap-2">
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
