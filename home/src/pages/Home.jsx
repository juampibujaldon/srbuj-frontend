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
      <header className="hero-home py-5 py-lg-5 mb-5">
        <div className="container">
          <div className="row align-items-center g-4">
            <div className="col-12 col-lg-6 text-center text-lg-start">
              <div className="badge-soft d-inline-flex align-items-center gap-2 mb-3">
                <span className="badge-dot" />
                Tienda online de impresiones 3D
              </div>
              <h1 className="display-4 fw-bold mb-3">
                Piezas 3D para destacar tu marca
              </h1>
              <p className="lead mb-4" style={{ maxWidth: 520 }}>
                Personalizá llaveros, mates, merchandising y piezas técnicas con acabados premium.
                Prototipos listos en días, no en semanas.
              </p>
              <div className="d-flex flex-wrap justify-content-center justify-content-lg-start gap-3 mb-4">
                <a href="/personalizador/3d" className="btn btn-light btn-lg px-4 shadow-sm">
                  Probar personalizador
                </a>
                <a href="#tendencias" className="btn btn-outline-secondary btn-lg px-4">
                  Ver catálogo
                </a>
              </div>
              <div className="d-flex flex-wrap justify-content-center justify-content-lg-start gap-4">
                {[
                  { value: "+120", label: "Pedidos enviados" },
                  { value: "48 hs", label: "Respuesta promedio" },
                ].map((stat) => (
                  <div key={stat.label} className="stat-block text-start">
                    <span className="stat-value">{stat.value}</span>
                    <span className="stat-label">{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="col-12 col-lg-6">
              <div className="card glass-card border-0 shadow-lg hero-side-card">
                <div className="card-body p-4 p-lg-5">
                  <span className="badge-soft mb-3 d-inline-flex align-items-center gap-2">
                    <span className="badge-dot" />
                    Pedido rápido
                  </span>
                  <h2 className="h4 fw-bold mb-3">¿Tenés listo tu STL?</h2>
                  <p className="text-muted mb-4">
                    Subí el archivo, elegí color y material. Te enviamos presupuesto en minutos
                    y coordinamos la entrega desde nuestra planta en Córdoba.
                  </p>
                  <div className="d-flex flex-column flex-sm-row gap-2">
                    <a href="/personalizador/subir-stl" className="btn btn-primary flex-grow-1">
                      Subir archivo STL
                    </a>
                    <a href="/contacto" className="btn btn-outline-secondary flex-grow-1">
                      Hablar con un asesor
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Highlights */}
      <section className="container mb-5">
        <div className="section-heading text-center text-lg-start">
          <span className="badge-soft mb-2">Qué nos eligen</span>
          <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-end gap-3">
            <h2 className="h3 fw-bold mb-0">Especialistas en impresiones 3D personalizadas</h2>
            <p className="text-muted mb-0" style={{ maxWidth: 460 }}>
              Acompañamos a emprendedores, agencias y equipos de producto creando piezas únicas
              con procesos rápidos y controlados.
            </p>
          </div>
        </div>
        <div className="row g-4 mt-2">
          {[
            {
              title: "Branding memorable",
              text: "Merchandising cuidado para lanzamientos, eventos y kits corporativos.",
            },
            {
              title: "Ingeniería a medida",
              text: "Replicamos piezas funcionales y prototipos con tolerancias precisas.",
            },
            {
              title: "Escala sin drama",
              text: "Producciones cortas o medianas con control de calidad pieza por pieza.",
            },
          ].map((feature) => (
            <div key={feature.title} className="col-12 col-md-4">
              <div className="card border-0 h-100 shadow-sm highlight-card">
                <div className="card-body">
                  <h3 className="h5 fw-bold mb-2">{feature.title}</h3>
                  <p className="text-muted mb-0">{feature.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Chips de categorías */}
      <section className="section-lined py-4">
        <div className="container text-center">
          <h2 className="h5 text-muted mb-3">Explorá por categorías</h2>
          <div className="d-flex justify-content-center flex-wrap gap-3">
            <div className="category-chip-group flex-wrap justify-content-center">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedCategory(c)}
                  className={`chip btn px-3 py-2 rounded-pill ${
                    selectedCategory === c ? "active" : ""
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Grid de tendencias */}
      <section id="tendencias" className="container my-5">
        <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center mb-4 gap-3">
          <div>
            <span className="badge-soft mb-2">Lo más pedido</span>
            <h2 className="h3 fw-bold mb-0">Tendencias 3D</h2>
            <p className="text-muted mb-0">
              Selección curada para inspirarte y sumar a tu colección.
            </p>
          </div>
          <a href="/productos" className="btn btn-outline-secondary btn-sm px-3">
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

      {/* Process */}
      <section className="container my-5">
        <div className="section-heading text-center">
          <span className="badge-soft mb-2">Proceso express</span>
          <h2 className="h3 fw-bold">Así trabajamos con vos</h2>
        </div>
        <div className="row g-4 mt-1 justify-content-center">
          {[
            {
              step: "01",
              title: "Diseño o STL",
              text: "Compartís tu archivo o idea y definimos materiales y colores.",
            },
            {
              step: "02",
              title: "Producción",
              text: "Imprimimos y controlamos cada pieza para asegurar calidad.",
            },
            {
              step: "03",
              title: "Entrega",
              text: "Retiro por taller o envío asegurado a todo el país en tiempo récord.",
            },
          ].map((item) => (
            <div key={item.step} className="col-12 col-md-4">
              <div className="card border-0 h-100 shadow-sm process-card text-center">
                <div className="card-body">
                  <span className="process-step">{item.step}</span>
                  <h3 className="h5 fw-bold mt-3 mb-2">{item.title}</h3>
                  <p className="text-muted mb-0">{item.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="section-soft py-5">
        <div className="container">
          <div className="row g-4 align-items-stretch">
            {[
              {
                quote:
                  "Recibimos los llaveros en tiempo récord y la calidad superó lo que prometieron. Ideal para nuestros eventos.",
                author: "Agustina, Agencia BrandLab",
              },
              {
                quote:
                  "Nos ayudaron a iterar piezas para un prototipo electrónico en 72 horas. Profesionalismo total.",
                author: "Juan, Hardware Studio",
              },
            ].map((item) => (
              <div key={item.author} className="col-12 col-lg-6">
                <div className="card border-0 h-100 testimonial-card shadow-sm">
                  <div className="card-body">
                    <p className="testimonial-quote">“{item.quote}”</p>
                    <p className="testimonial-author">{item.author}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="section-contrast text-center py-5 mt-5">
        <div className="container">
          <h3 className="fw-bold mb-3">¿Listo para tu impresión personalizada?</h3>
          <p className="mb-4" style={{ maxWidth: 540, margin: "0 auto" }}>
            Contanos tu idea y la fabricamos con plazos rápidos y terminaciones impecables.
          </p>
          <a href="/productos" className="btn btn-primary btn-lg px-4 shadow">
            Ver catálogo completo
          </a>
        </div>
      </section>
    </>
  );
}
