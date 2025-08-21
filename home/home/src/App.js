import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";

function Home() {
  return (
    <div>
      {/* Hero */}
      <header className="bg-light text-center py-5">
        <h1 className="display-4 fw-bold">Impresiones 3D Personalizadas</h1>
        <p className="lead">Llavero, figuras, piezas técnicas y mucho más.</p>
        {/* Usamos Link en lugar de button */}
        <Link to="/productos" className="btn btn-primary btn-lg">
          Ver Catálogo
        </Link>
      </header>
    </div>
  );
}

function CardExample() {
  return (
    <div className="card" style={{ width: "18rem" }}>
      <img src="https://via.placeholder.com/150" className="card-img-top" alt="..." />
      <div className="card-body">
        <h5 className="card-title">Card title</h5>
        <p className="card-text">
          Some quick example text to build on the card title and make up the bulk of the card’s content.
        </p>
        <a href="#" className="btn btn-primary">
          Go somewhere
        </a>
      </div>
    </div>
  );
}


function Productos() {
  const items = [
    { id: 1, title: "Llavero Personalizado" },
    { id: 2, title: "Mate 3D" },
    { id: 3, title: "Mini Figura" },
  ];

  return (
    <section className="container my-5">
      <h2 className="mb-4">Catálogo de Productos</h2>

      <div className="row g-4">
        {items.map(item => (
          <div className="col-12 col-sm-6 col-md-4" key={item.id}>
            <CardExample />
          </div>
        ))}
      </div>
    </section>
  );
}


export default function App() {
  return (
    <Router>
      <nav className="navbar bg-body-tertiary">
        <div className="container-fluid d-flex justify-content-between align-items-center">
          <a className="navbar-brand">Navbar</a>
          <ul className="nav nav-tabs me-auto ms-3">
            <li className="nav-item">
              <Link to="/" className="nav-link active">
                Inicio
              </Link>
            </li>
            <li className="nav-item">
              <Link to="/productos" className="nav-link">
                Productos
              </Link>
            </li>
          </ul>
          <form className="d-flex" role="search">
            <input
              className="form-control me-2"
              type="search"
              placeholder="Search"
              aria-label="Search"
            />
            <button className="btn btn-outline-success" type="submit">
              Search
            </button>
          </form>
        </div>
      </nav>

      {/* Rutas */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/productos" element={<Productos />} />
      </Routes>

      <footer className="bg-dark text-white text-center py-3">
        <p>© {new Date().getFullYear()} SrBuj 3D - Impresiones Personalizadas</p>
      </footer>
    </Router>
  );
}
