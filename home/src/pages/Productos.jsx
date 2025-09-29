import ProductCard from "../components/ProductCard";
import { useProducts } from "../hooks/useProducts";

export default function Productos({ addToCart }) {
  const { items, loading, error } = useProducts();

  return (
    <>
      <section className="hero-secondary py-5 mb-5">
        <div className="container py-3">
          <div className="row align-items-center g-4">
            <div className="col-12 col-lg-7">
              <div className="badge-soft mb-3 d-inline-flex align-items-center gap-2">
                <span className="rounded-circle" style={{ width: 8, height: 8, backgroundColor: "#8bffcb" }} />
                Catálogo actualizado
              </div>
              <h1 className="display-5 fw-bold mb-3">Modelos listos para imprimir</h1>
              <p className="lead mb-0">
                Elegí tus diseños favoritos, sumalos al carrito y coordiná la producción
                en el acto. Actualizamos la tienda todas las semanas con novedades.
              </p>
            </div>
            <div className="col-12 col-lg-5">
              <div className="card glass-card border-0 shadow-lg">
                <div className="card-body text-start">
                  <h2 className="h5 fw-bold mb-2">¿Buscás algo especial?</h2>
                  <p className="text-muted mb-3">
                    Subí tu STL o contanos tu idea y armamos el presupuesto a medida.
                  </p>
                  <div className="d-flex gap-2 flex-wrap">
                    <a href="/personalizador/subir-stl" className="btn btn-light btn-sm px-3">
                      Subir archivo
                    </a>
                    <a href="/contacto" className="btn btn-outline-secondary btn-sm px-3">
                      Hablar con nosotros
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container my-5">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-4">
          <div>
            <h2 className="h3 fw-bold mb-0">Catálogo de productos</h2>
            <p className="text-muted mb-0">Más de 180 modelos listos para producir bajo demanda.</p>
          </div>
          <span className="badge-soft">{items.length} modelos publicados</span>
        </div>

        {loading && <p>Cargando productos...</p>}
        {error && <div className="alert alert-danger">{error}</div>}
        <div className="row g-4">
          {!loading && !error && items.length === 0 && (
            <p className="text-muted">No hay productos disponibles.</p>
          )}
          {items.map((it) => (
            <div key={it.id} className="col-12 col-sm-6 col-lg-4">
              <ProductCard item={it} onAdd={addToCart} />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
