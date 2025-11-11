import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FaCheck } from "react-icons/fa";
import { formatPrice } from "../lib/currency";
import { resolveImageUrl } from "../lib/media";

function normalizeItem(item = {}) {
  const gallery = Array.isArray(item.gallery)
    ? item.gallery
        .map((entry) => resolveImageUrl(entry) || (typeof entry === "string" ? entry : null))
        .filter(Boolean)
    : [];
  const derivedImage =
    gallery[0] ||
    resolveImageUrl(item.imagen) ||
    resolveImageUrl(item.imagen_url) ||
    resolveImageUrl(item.img) ||
    resolveImageUrl(item.cover);
  const primaryImage =
    derivedImage || item.img || item.imagen_url || item.cover || "/images/placeholder.png";
  const rawPrice = item.price ?? item.precio;
  const numericPrice = Number(rawPrice);
  const resolvedPrice = Number.isFinite(numericPrice) ? numericPrice : rawPrice;
  return {
    id: item.id,
    title: item.title ?? item.nombre ?? "Producto",
    author: item.author ?? item.autor ?? "SrBuj",
    img: primaryImage,
    gallery,
    price: resolvedPrice,
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

  const numericPrice = Number(data.price);
  const hasNumericPrice = Number.isFinite(numericPrice);
  const priceLabel = hasNumericPrice ? formatPrice(numericPrice) : data.price ?? "Consultar";

  const showWeight = data.weightGr ? `${data.weightGr} g` : null;

  const handleAdd = () => {
    if (!onAdd) return;
    const payload = hasNumericPrice ? { ...data, price: numericPrice } : data;
    onAdd(payload);
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
