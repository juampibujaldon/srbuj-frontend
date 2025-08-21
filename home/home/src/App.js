import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js"; // para navbar colapsable
import { BrowserRouter as Router, Routes, Route, NavLink, Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import "./App.css";
import { FaUser } from "react-icons/fa"; // 👤 icono
import "./App.css";


// --- Datos de ejemplo (luego los podés traer de tu API) ---
const items = [
  { id: 1, title: "Llavero Personalizado", author: "SrBuj", img: "https://picsum.photos/seed/key/600/400", likes: 120, downloads: 340 },
  { id: 2, title: "Mate Hogwarts", author: "SrBuj", img: "https://picsum.photos/seed/mate/600/400", likes: 210, downloads: 530 },
  { id: 3, title: "Mini Figura", author: "SrBuj", img: "https://picsum.photos/seed/mini/600/400", likes: 89, downloads: 190 },
  { id: 4, title: "Soporte Celular", author: "SrBuj", img: "https://picsum.photos/seed/stand/600/400", likes: 56, downloads: 145 },
  { id: 5, title: "Organizador Cable", author: "SrBuj", img: "https://picsum.photos/seed/cable/600/400", likes: 132, downloads: 402 },
  { id: 6, title: "Pin Carpincho", author: "SrBuj", img: "https://picsum.photos/seed/capy/600/400", likes: 310, downloads: 890 },
];

function ProductCard({ item }) {
  return (
    <div className="card card-product h-100">
      <div className="position-relative">
        <img src={item.img} alt={item.title} className="card-img-top object-cover" />
      </div>
      <div className="card-body">
        <h5 className="card-title mb-1 text-truncate">{item.title}</h5>
        <div className="text-secondary small mb-2">por {item.author}</div>

        <div className="d-flex gap-3 align-items-center small text-secondary mb-3">
          <span title="Me gusta">👍 {item.likes}</span>
          <span title="Descargas">⬇ {item.downloads}</span>
        </div>

        <div className="d-flex gap-2">
          <button className="btn btn-primary btn-sm flex-grow-1">Comprar</button>
          <button className="btn btn-outline-secondary btn-sm">Ver</button>
        </div>
      </div>
    </div>
  );
}

function Home() {
  return (
    <>
      {/* Hero */}
      <header className="hero d-flex align-items-center text-center">
        <div className="container py-5">
          <h1 className="display-4 fw-bold mb-3">Impresiones 3D Personalizadas</h1>
          <p className="lead mb-4">Llaveros, mates, mini figuras y piezas técnicas hechas a tu medida.</p>
          <div className="d-flex gap-2 justify-content-center mb-4 flex-wrap">
            <span className="badge badge-soft">Modelado a medida</span>
            <span className="badge badge-soft">PETG / PLA Premium</span>
            <span className="badge badge-soft">Envíos a todo el país</span>
          </div>
        </div>
      </header>

      {/* Chips de categorías */}
      <section className="bg-light">
        <div className="container py-3">
          <div className="d-flex justify-content-center gap-2 flex-wrap">
            {["Todos", "Llaveros", "Mates", "Pins", "Mini figuras", "Hogar", "Soportes"].map((c) => (
              <button key={c} className="btn btn-outline-secondary btn-sm rounded-pill my-2">{c}</button>
            ))}
          </div>
        </div>
      </section>

      {/* Grid de tendencias en home */}
      <section className="container my-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="h4 m-0">Tendencias</h2>
        </div>

        <div className="row g-3">
          {items.slice(0, 6).map((it) => (
            <div key={it.id} className="col-12 col-sm-6 col-lg-4">
              <ProductCard item={it} />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function Productos() {
  return (
    <section className="container my-5">
      <h2 className="mb-4">Catálogo de Productos</h2>
      <div className="row g-3">
        {items.map((it) => (
          <div key={it.id} className="col-12 col-sm-6 col-lg-4">
            <ProductCard item={it} />
          </div>
        ))}
      </div>
    </section>
  );
}

// CTA con animación que cambia según la ruta
function AnimatedCTA() {
  const location = useLocation();
  const isProductos = location.pathname === "/productos";

  return (
    <div className="d-flex justify-content-center my-4">
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        {isProductos ? (
          <Link to="/" className="btn btn-secondary btn-lg px-4">
            Volver
          </Link>
        ) : (
          <Link to="/productos" className="btn btn-primary btn-lg px-4">
            Ver Catálogo
          </Link>
        )}
      </motion.div>
    </div>
  );
}

function Login({ onLogin }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(true); // simula login exitoso
  };

  return (
    <section className="container my-5 text-center">
      <h2 className="mb-4">Login / Registro</h2>
      <form onSubmit={handleSubmit} className="mx-auto" style={{ maxWidth: 400 }}>
        <div className="mb-3">
          <input type="email" className="form-control" placeholder="Correo electrónico" />
        </div>
        <div className="mb-3">
          <input type="password" className="form-control" placeholder="Contraseña" />
        </div>
        <button type="submit" className="btn btn-primary w-100 mb-2">Ingresar</button>
        <button type="button" className="btn btn-outline-secondary w-100">Registrarse</button>
      </form>
    </section>
  );
}


export default function App() {
  return (
    <Router>
      <nav className="navbar navbar-expand-lg bg-body-tertiary sticky-top border-bottom">
        <div className="container-fluid">
          <Link className="navbar-brand fw-bold" to="/">SrBuj 3D</Link>

          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#nav">
            <span className="navbar-toggler-icon"></span>
          </button>

          <div className="collapse navbar-collapse" id="nav">
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
              <li className="nav-item">
                <NavLink to="/" end className={({isActive}) => "nav-link" + (isActive ? " active" : "")}>
                  Inicio
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/productos" className={({isActive}) => "nav-link" + (isActive ? " active" : "")}>
                  Productos
                </NavLink>
              </li>
            </ul>

            <form className="d-flex" role="search">
              <input className="form-control me-2" type="search" placeholder="Buscar" aria-label="Buscar" />
              <button className="btn btn-outline-success" type="submit">Buscar</button>
            </form>
          </div>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/productos" element={<Productos />} />
      </Routes>

      {/* Botón animado que cambia entre Ver Catálogo / Volver */}
      <AnimatedCTA />

      <footer className="bg-dark text-white text-center py-4 mt-5">
        <p className="mb-0">© {new Date().getFullYear()} SrBuj 3D — Impresiones Personalizadas</p>
      </footer>
    </Router>
  );
}
