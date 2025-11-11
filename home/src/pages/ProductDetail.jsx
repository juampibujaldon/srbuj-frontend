import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { fetchProduct, fetchProducts } from "../api/products";
import ProductCard from "../components/ProductCard";
import { formatPrice } from "../lib/currency";

const normalizeGallery = (item = {}) => {
  const candidates = [
    item.gallery,
    item.images,
    item.media,
    item.galeria,
    item.photos,
    item.fotos,
  ];
  const urls = new Set();
  candidates.forEach((value) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.filter(Boolean).forEach((url) => urls.add(url));
    } else if (typeof value === "string") {
      urls.add(value);
    }
  });
  if (item.img) urls.add(item.img);
  if (item.imagen_url) urls.add(item.imagen_url);
  return Array.from(urls).filter(Boolean);
};

const mapProductFields = (item) => {
  if (!item) {
    return {
      id: "",
      title: "Producto",
      author: "SrBuj",
      img: "/images/placeholder.png",
      price: 0,
      desc: "Producto impreso en 3D con materiales de alta calidad.",
      gallery: ["/images/placeholder.png"],
    };
  }
  const gallery = normalizeGallery(item);
  const primaryImage = gallery[0] || item.img || item.imagen_url || "/images/placeholder.png";
  const rawPrice = item.price ?? item.precio;
  const numericPrice = Number(rawPrice);
  return {
    id: item.id,
    title: item.title ?? item.nombre ?? "Producto",
    author: item.author ?? item.autor ?? "SrBuj",
    img: primaryImage,
    price: Number.isFinite(numericPrice) ? numericPrice : rawPrice,
    desc:
      item.desc ??
      item.descripcion ??
      "Producto impreso en 3D con materiales de alta calidad.",
    gallery: gallery.length > 0 ? gallery : [primaryImage],
  };
};

export default function ProductDetail({ addToCart }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    (async () => {
      try {
        const [current, list] = await Promise.all([
          fetchProduct(id),
          fetchProducts(),
        ]);
        if (!active) return;
        setProduct(current);
        const rel = list.filter((p) => String(p.id) !== String(id)).slice(0, 3);
        setRelated(rel);
      } catch (err) {
        if (!active) return;
        setError(err.message || "No pudimos obtener el producto");
        setProduct(null);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [id]);

  const mappedProduct = useMemo(() => mapProductFields(product), [product]);
  const mappedRelated = useMemo(() => related.map(mapProductFields), [related]);

  if (loading) {
    return (
      <section className="container my-5">
        <p>Cargando producto...</p>
      </section>
    );
  }

  if (error || !product) {
    return (
      <section className="container my-5">
        <div className="alert alert-warning">
          {error || "Producto no encontrado."}{" "}
          <Link className="alert-link" to="/productos">
            Volver al catálogo
          </Link>
        </div>
      </section>
    );
  }

  const handleAdd = () => {
    for (let i = 0; i < qty; i += 1) addToCart?.(mappedProduct);
  };

  return (
    <section className="container my-5">
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb mb-0">
          <li className="breadcrumb-item">
            <Link to="/">Inicio</Link>
          </li>
          <li className="breadcrumb-item">
            <Link to="/productos">Productos</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            {mappedProduct.title}
          </li>
        </ol>
      </nav>

      <div className="row g-4">
        <div className="col-12 col-lg-6">
          <ProductImageGallery images={mappedProduct.gallery} title={mappedProduct.title} />
        </div>

        <div className="col-12 col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h1 className="h3 mb-2">{mappedProduct.title}</h1>
              <div className="text-muted mb-3">por {mappedProduct.author}</div>

              <div className="d-flex align-items-center gap-2 mb-3">
                <span className="badge text-bg-primary">3D Print</span>
                <span className="badge text-bg-light">Personalizable</span>
                <span className="badge text-bg-success">Stock</span>
              </div>

              {mappedProduct.price ? (
                <div className="h4 mb-3">{formatPrice(mappedProduct.price)}</div>
              ) : (
                <div className="h5 text-warning mb-3">Precio a consultar</div>
              )}

              <p className="mb-3">{mappedProduct.desc}</p>

              <div className="d-flex align-items-center gap-2 mb-3">
                <label className="form-label m-0 me-2">Cantidad</label>
                <div className="input-group" style={{ width: 140 }}>
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    className="form-control text-center"
                    min="1"
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                  />
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={() => setQty((q) => q + 1)}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="d-flex flex-wrap gap-2">
                <button className="btn btn-primary" type="button" onClick={handleAdd}>
                  🛒 Agregar
                </button>
                <button className="btn btn-outline-secondary" type="button" onClick={() => navigate(-1)}>
                  Volver
                </button>
              </div>

              <div className="accordion mt-4" id="productInfo">
                <div className="accordion-item">
                  <h2 className="accordion-header" id="specsHead">
                    <button
                      className="accordion-button"
                      type="button"
                      data-bs-toggle="collapse"
                      data-bs-target="#specs"
                      aria-expanded="true"
                      aria-controls="specs"
                    >
                      Especificaciones
                    </button>
                  </h2>
                  <div id="specs" className="accordion-collapse collapse show" data-bs-parent="#productInfo">
                    <div className="accordion-body">
                      <ul className="mb-0">
                        <li>Material: PLA/PETG premium</li>
                        <li>Tiempo de producción: 3–5 días hábiles</li>
                        <li>Color: a elección</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="accordion-item">
                  <h2 className="accordion-header" id="shipHead">
                    <button
                      className="accordion-button collapsed"
                      type="button"
                      data-bs-toggle="collapse"
                      data-bs-target="#ship"
                      aria-expanded="false"
                      aria-controls="ship"
                    >
                      Envío y devoluciones
                    </button>
                  </h2>
                  <div id="ship" className="accordion-collapse collapse" data-bs-parent="#productInfo">
                    <div className="accordion-body">
                      Envíos a todo el país. Embalaje seguro. Devoluciones dentro de 7 días si el
                      producto llega dañado.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <h3 className="h5 mb-3">También te puede interesar</h3>
        <div className="row g-3">
          {mappedRelated.map((r) => (
            <div key={r.id} className="col-12 col-sm-6 col-lg-4">
              <ProductCard item={r} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductImageGallery({ images = [], title }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [images]);

  if (!images.length) {
    return (
      <div className="card border-0 shadow-sm h-100">
        <img
          src="/images/placeholder.png"
          alt={title}
          className="img-fluid rounded-top"
          style={{ objectFit: "cover", width: "100%", aspectRatio: "1 / 1" }}
        />
      </div>
    );
  }

  const current = images[index] || "/images/placeholder.png";
  const hasMultiple = images.length > 1;

  return (
    <div className="card border-0 shadow-sm h-100">
      <div className="position-relative">
        <img
          key={current}
          src={current}
          alt={title}
          className="img-fluid rounded-top"
          style={{ objectFit: "cover", width: "100%", aspectRatio: "1 / 1" }}
        />
        {hasMultiple && (
          <>
            <button
              type="button"
              className="btn btn-light btn-sm position-absolute top-50 start-0 translate-middle-y"
              style={{ borderRadius: "999px" }}
              onClick={() => setIndex((prev) => (prev - 1 + images.length) % images.length)}
              aria-label="Imagen anterior"
            >
              ‹
            </button>
            <button
              type="button"
              className="btn btn-light btn-sm position-absolute top-50 end-0 translate-middle-y"
              style={{ borderRadius: "999px" }}
              onClick={() => setIndex((prev) => (prev + 1) % images.length)}
              aria-label="Imagen siguiente"
            >
              ›
            </button>
            <div className="position-absolute bottom-0 start-50 translate-middle-x mb-2 d-flex gap-2">
              {images.map((img, idx) => (
                <button
                  key={img || idx}
                  type="button"
                  className={`carousel-dot${idx === index ? " is-active" : ""}`}
                  aria-label={`Ver imagen ${idx + 1}`}
                  onClick={() => setIndex(idx)}
                />
              ))}
            </div>
          </>
        )}
      </div>
      {hasMultiple && (
        <div className="d-flex gap-2 p-3 flex-wrap">
          {images.map((img, idx) => (
            <button
              key={img || idx}
              type="button"
              className={`thumbnail-btn${idx === index ? " is-active" : ""}`}
              onClick={() => setIndex(idx)}
              aria-label={`Seleccionar imagen ${idx + 1}`}
            >
              <img src={img} alt={`${title} vista ${idx + 1}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
