import { useEffect, useMemo, useState } from "react";
import ProductCard from "../components/ProductCard";
import { useProducts } from "../hooks/useProducts";

export default function Home({ addToCart }) {
  const { items, loading, error } = useProducts();
  const homeItems = useMemo(
    () => items.filter((it) => it.featured !== false && it.mostrar_inicio !== false),
    [items],
  );
  const [selectedCategory, setSelectedCategory] = useState("Todos");

  const categories = useMemo(() => {
    const staticCategories = [
      "Todos",
      "Llaveros",
      "Mates",
      "Pins",
      "Mini figuras",
      "Hogar",
      "Soportes",
    ];
    const list = [...staticCategories];
    const dynamic = new Set();
    homeItems.forEach((it) => {
      const cat = it?.categoria || it?.category || it?.Category;
      if (cat) dynamic.add(cat);
    });
    dynamic.forEach((cat) => {
      if (!list.includes(cat)) list.push(cat);
    });
    if (!list.length) return ["Todos"];
    if (!list.includes("Todos")) list.unshift("Todos");
    return list;
  }, [homeItems]);

  useEffect(() => {
    if (!categories.includes(selectedCategory)) {
      setSelectedCategory("Todos");
    }
  }, [categories, selectedCategory]);

  const filteredItems = useMemo(() => {
    if (selectedCategory === "Todos") return homeItems;
    return homeItems.filter((it) => {
      const cat = it?.categoria || it?.category || it?.Category;
      if (!cat) return false;
      return cat.toLowerCase() === selectedCategory.toLowerCase();
    });
  }, [homeItems, selectedCategory]);

  const visibleItems = filteredItems.slice(0, 6);

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
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedCategory(c)}
                className={`btn rounded-pill px-3 shadow-sm ${
                  selectedCategory === c
                    ? "btn-primary text-white"
                    : "btn-outline-primary"
                }`}
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

        {loading && <p>Cargando productos...</p>}
        {error && <div className="alert alert-danger">{error}</div>}
        <div className="row g-4">
          {!loading && !error && visibleItems.length === 0 && (
            <p className="text-muted">
              {selectedCategory === "Todos"
                ? "Todavía no hay productos cargados."
                : "No encontramos productos en esta categoría."}
            </p>
          )}
          {visibleItems.map((it) => (
            <div key={it.id} className="col-12 col-sm-6 col-lg-4">
              <ProductCard item={it} onAdd={addToCart} />
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
