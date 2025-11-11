import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FaCheck } from "react-icons/fa";
import { apiUrl } from "../api/client";

const toAbsoluteUrl = (value) => {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed) || /^data:|^blob:/i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }
  if (trimmed.startsWith("/")) {
    return apiUrl(trimmed);
  }
  return apiUrl(`/media/${trimmed}`);
};

function normalizeItem(item = {}) {
  const gallery = Array.isArray(item.gallery)
    ? item.gallery
        .map((entry) => toAbsoluteUrl(entry) || entry)
        .filter(Boolean)
    : [];
  const derivedImage =
    gallery[0] ||
    toAbsoluteUrl(item.imagen) ||
    toAbsoluteUrl(item.img) ||
    toAbsoluteUrl(item.cover);
  const primaryImage = derivedImage || item.img || item.imagen_url || "/images/placeholder.png";
  return {
    id: item.id,
    title: item.title ?? item.nombre ?? "Producto",
    author: item.author ?? item.autor ?? "SrBuj",
    img: primaryImage,
    gallery,
    price: item.price ?? item.precio,
    weightGr: item.weightGr ?? item.peso_gr ?? null,
    tag: item.tag ?? item.etiqueta ?? item.badge,
  };
}

export default function ProductCard({ item, onAdd }) {
  const data = normalizeItem(item);
  const [added, setAdded] = useState(false);
  const resetTimer = useRef();

  useEffect(() => {
    return () => clearTimeout(resetTimer.current);
  }, []);

  const priceLabel =
    typeof data.price === "number"
      ? `AR$ ${Number(data.price).toLocaleString("es-AR")}`
      : data.price ?? "Consultar";

  const showWeight = data.weightGr ? `${data.weightGr} g` : null;

  const handleAdd = () => {
    if (!onAdd) return;
    onAdd(data);
    setAdded(true);
    clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setAdded(false), 1600);
  };

  return (
    <article className="card card-product product-card h-100 border-0 shadow-sm">
      <div className="product-card__media">
        <img
          src={data.img}
          alt={data.title}
          className="product-card__image"
          loading="lazy"
        />
        {data.tag && <span className="product-card__badge">{data.tag}</span>}
      </div>
      <div className="card-body d-flex flex-column gap-2">
        <div>
          <h3 className="product-card__title">{data.title}</h3>
          <p className="product-card__meta">por {data.author}</p>
        </div>

        <div className="d-flex justify-content-between align-items-center">
          <span className="product-card__price badge-soft">{priceLabel}</span>
          {showWeight && <span className="product-card__details">{showWeight}</span>}
        </div>

        <div className="d-flex gap-2 mt-auto">
          <button
            className={`btn btn-primary btn-sm flex-grow-1 product-card__action${
              added ? " is-success" : ""
            }`}
            onClick={handleAdd}
            disabled={!onAdd}
            type="button"
            aria-live="polite"
          >
            {added ? (
              <span className="d-inline-flex align-items-center justify-content-center gap-2">
                <FaCheck aria-hidden="true" />
                Listo
              </span>
            ) : (
              "Agregar"
            )}
          </button>
          <Link to={`/producto/${data.id}`} className="btn btn-outline-secondary btn-sm">
            Ver
          </Link>
        </div>
      </div>
    </article>
  );
}
