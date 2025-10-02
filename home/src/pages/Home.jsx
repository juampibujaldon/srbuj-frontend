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
        <span className="hero-floating-badge" aria-hidden="true" />
        <span className="hero-orb hero-orb--one" aria-hidden="true" />
        <span className="hero-orb hero-orb--two" aria-hidden="true" />
        <span className="hero-orb hero-orb--three" aria-hidden="true" />
        <div className="container">
          <div className="row align-items-center g-4">
            <div className="col-12 col-lg-6 text-center text-lg-start">
              <div className="hero-kicker mb-3">
                <span className="spark" /> Impresiones 3D premium para tu marca
              </div>
              <h1 className="display-4 fw-bold mb-3 gradient-text">
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
              <div className="home-trust-badges">
                {["Materiales eco-friendly", "Color matching preciso", "Asesoría dedicada"]
                  .map((badge) => (
                    <span key={badge} className="home-trust-badge">
                      <span className="badge-dot" /> {badge}
                    </span>
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
          <span className="home-subtitle">Qué nos hace diferentes</span>
          <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-end gap-3">
            <h2 className="h3 fw-bold mb-0 gradient-text">Especialistas en impresiones 3D personalizadas</h2>
            <p className="text-muted mb-0" style={{ maxWidth: 460 }}>
              Acompañamos a emprendedores, agencias y equipos de producto creando piezas únicas
              con procesos rápidos y controlados.
            </p>
          </div>
        </div>
        <div className="row g-4 mt-2">
          {[
            {
              icon: "✨",
              title: "Branding memorable",
              text: "Merchandising cuidado para lanzamientos, eventos y kits corporativos.",
            },
            {
              icon: "⚡",
              title: "Ingeniería a medida",
              text: "Replicamos piezas funcionales y prototipos con tolerancias precisas.",
            },
            {
              icon: "🎯",
              title: "Escala sin drama",
              text: "Producciones cortas o medianas con control de calidad pieza por pieza.",
            },
          ].map((feature) => (
            <div key={feature.title} className="col-12 col-md-4">
              <div className="card border-0 h-100 shadow-sm highlight-card">
                <div className="card-body">
                  <span className="feature-icon" aria-hidden="true">
                    {feature.icon}
                  </span>
                  <h3 className="h5 fw-bold mb-2">{feature.title}</h3>
                  <p className="text-muted mb-0">{feature.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="home-gradient-strip" aria-hidden="true" />

      {/* Chips de categorías */}
      <section className="section-lined py-4">
        <div className="container text-center">
          <span className="home-subtitle d-inline-block mb-2">Explorá por categorías</span>
          <h2 className="h4 fw-bold mb-3 gradient-text">Curamos colecciones para cada experiencia</h2>
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
        <div className="home-trending">
          <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center mb-4 gap-3">
            <div>
              <span className="badge-soft mb-2">Lo más pedido</span>
              <h2 className="h3 fw-bold mb-0 gradient-text">Tendencias 3D</h2>
              <p className="text-muted mb-0">
                Los productos que enamoran a clientes y comunidades.
              </p>
            </div>
            <a href="/productos" className="btn btn-outline-secondary btn-sm px-3">
              Ver todo
            </a>
          </div>

          {loading && <p className="text-muted">Cargando productos...</p>}
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
        </div>
      </section>

      {/* Proceso */}
      <section className="container my-5">
        <div className="section-heading text-center text-lg-start mb-4">
          <span className="home-subtitle">Proceso simple</span>
          <h2 className="h3 fw-bold gradient-text">Diseñamos y producimos en tres pasos</h2>
        </div>
        <div className="home-step-grid">
          {[
            {
              title: "Brief ágil",
              description:
                "Compartinos referencias, cantidades y plazos. Nuestro equipo traduce tu idea en un plan de producción realista.",
            },
            {
              title: "Iteraciones guiadas",
              description:
                "Validamos prototipos, elegimos materiales y colores con muestras físicas o renders 3D listos para aprobar.",
            },
            {
              title: "Entrega sincronizada",
              description:
                "Coordinamos envíos a todo el país con packaging personalizado y seguimiento en tiempo real.",
            },
          ].map((step, index) => (
            <div key={step.title} className="home-step-card">
              <span className="home-step-number">0{index + 1}</span>
              <h3 className="h5 fw-semibold mb-1">{step.title}</h3>
              <p className="text-muted mb-0">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Showcase */}
      <section className="home-showcase container">
        <div className="row g-4 align-items-center">
          <div className="col-12 col-lg-6">
            <span className="home-subtitle d-inline-block mb-2">Experiencias a medida</span>
            <h2 className="h3 fw-bold gradient-text">Activaciones, merchandising y prototipos que brillan</h2>
            <p className="text-muted">
              Creamos kits completos para eventos, lanzamientos y campañas internas. Coordinamos desde el diseño hasta la entrega para que tu marca destaque con piezas duraderas y memorables.
            </p>
            <div className="home-pill-list">
              {["Onboarding corporativo", "Regalos para influencers", "Kits educativos", "Series limitadas"]
                .map((item) => (
                  <span key={item} className="home-pill">
                    {item.includes("Regalos") ? <em>★</em> : <em>•</em>} {item}
                  </span>
                ))}
            </div>
          </div>
          <div className="col-12 col-lg-6">
            <div className="illustration">
              <div className="showcase-grid">
                <div className="showcase-card accent" data-span="wide">
                  <em>Branding</em>
                  Kits para eventos y lanzamientos memorables
                </div>
                <div className="showcase-card" data-span="tall">
                  <em>Prototipos</em>
                  Ajustamos tolerancias, ensambles y texturas funcionales.
                </div>
                <div className="showcase-card">
                  <em>Merch</em>
                  Llaveros, pins y piezas de edición limitada.
                </div>
                <div className="showcase-card" data-span="wide">
                  <em>Packaging</em>
                  Presentaciones listas para sorprender a tu comunidad.
                </div>
              </div>
              <div className="text-center text-muted small mt-3">
                Diseñamos composiciones multi-material listas para entregar.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Garantías */}
      <section className="container my-5">
        <div className="section-heading text-center text-lg-start mb-4">
          <span className="home-subtitle">Calidad que podés medir</span>
          <h2 className="h3 fw-bold gradient-text">Cada proyecto llega listo para usar</h2>
        </div>
        <div className="row g-4 mt-1 justify-content-center">
          {[
            {
              step: "1",
              title: "Control de materiales",
              text: "Filamentos certificados, acabados pulidos y opciones premium para merchandising o piezas técnicas.",
            },
            {
              step: "2",
              title: "QA pieza por pieza",
              text: "Validamos medidas, tolerancias y colorimetría para que recibas resultados consistentes.",
            },
            {
              step: "3",
              title: "Logística cuidada",
              text: "Empaques personalizados, seguimiento proactivo y entregas en tiempo récord.",
            },
          ].map((item) => (
            <div key={item.title} className="col-12 col-md-4">
              <div className="card border-0 h-100 shadow-sm process-card text-center">
                <div className="card-body">
                  <span className="process-step">0{item.step}</span>
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
          <span className="home-subtitle d-inline-block mb-2">Listo para crear</span>
          <h3 className="fw-bold mb-3 gradient-text">¿Listo para tu impresión personalizada?</h3>
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
