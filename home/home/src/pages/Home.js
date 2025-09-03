import ProductCard from "../components/ProductCard";
import items from "../data/items";

export default function Home({ addToCart }) {
  return (
    <>
      {/* Hero */}
      <header className="bg-primary text-white text-center py-5 mb-5">
        <div className="container">
          <h1 className="display-3 fw-bold">Impresiones 3D Personalizadas</h1>
          <p className="lead mb-4">
            Llaveros, mates, mini figuras y piezas técnicas hechas a tu medida.
          </p>
          <a href="#tendencias" className="btn btn-light btn-lg shadow-sm px-4">
            Ver productos
          </a>
        </div>
      </header>

      {/* Chips de categorías */}
      <section className="bg-light py-4">
        <div className="container">
          <h2 className="h5 text-center mb-3 text-muted">Explorá por categorías</h2>
          <div className="d-flex justify-content-center gap-2 flex-wrap">
            {["Todos", "Llaveros", "Mates", "Pins", "Mini figuras", "Hogar", "Soportes"].map((c) => (
              <button
                key={c}
                className="btn btn-outline-primary rounded-pill px-3 shadow-sm"
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Grid de tendencias */}
      <section id="tendencias" className="container my-5">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="h4 fw-bold">🔥 Tendencias</h2>
          <a href="/productos" className="btn btn-sm btn-outline-primary">
            Ver todo
          </a>
        </div>

        <div className="row g-4">
          {items.slice(0, 6).map((it) => (
            <div key={it.id} className="col-12 col-sm-6 col-lg-4">
              <ProductCard item={it} addToCart={addToCart} />
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-dark text-white py-5 mt-5">
        <div className="container text-center">
          <h3 className="fw-bold mb-3">¿Listo para tu impresión personalizada?</h3>
          <p className="mb-4">
            Contanos tu idea y la hacemos realidad en 3D.
          </p>
          <a href="/productos" className="btn btn-primary btn-lg px-4 shadow">
            Ver catálogo completo
          </a>
        </div>
      </section>
    </>
  );
}
