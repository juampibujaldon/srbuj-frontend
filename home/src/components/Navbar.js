import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  FaShoppingCart,
  FaUser,
  FaHome,
  FaStore,
  FaCubes,
  FaUpload,
  FaClipboardList,
  FaTools,
  FaTruck,
  FaSignOutAlt,
  FaSearch,
  FaTimes,
  FaMoon,
  FaSun,
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";

export default function TopNav({ cartCount = 0, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isAdmin, logout, loading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, cycleTheme } = useTheme();
  const isDarkMode = theme === "dark";

  useEffect(() => {
    if (location.pathname.startsWith("/productos")) {
      const params = new URLSearchParams(location.search);
      setSearchQuery(params.get("search") ?? "");
    }
  }, [location]);

  useEffect(() => {
    if (!mobileOpen) return;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileOpen]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    onLogout?.();
    navigate("/login");
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const trimmed = searchQuery.trim();
    const params = new URLSearchParams();
    if (trimmed) params.set("search", trimmed);
    navigate({ pathname: "/productos", search: params.toString() ? `?${params.toString()}` : "" });
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    if (location.pathname.startsWith("/productos")) {
      navigate("/productos");
    }
  };

  const navItems = [
    { to: "/", label: "Inicio", icon: <FaHome className="nav-icon" />, end: true },
    { to: "/productos", label: "Catálogo", icon: <FaStore className="nav-icon" /> },
    { to: "/personalizador/3d", label: "3D", icon: <FaCubes className="nav-icon" /> },
    { to: "/personalizador/subir-stl", label: "STL", icon: <FaUpload className="nav-icon" /> },
  ];

  if (isAuthenticated) {
    navItems.push({ to: "/pedidos", label: "Pedidos", icon: <FaClipboardList className="nav-icon" /> });
  }

  if (isAdmin) {
    navItems.push(
      { to: "/admin", label: "Admin", icon: <FaTools className="nav-icon" /> },
      { to: "/admin/orders", label: "Órdenes", icon: <FaTruck className="nav-icon" /> },
    );
  }

  const navLinkClass = ({ isActive }) => `nav-link nav-pill${isActive ? " active" : ""}`;
  const collapseClassName = useMemo(
    () => `collapse navbar-collapse${mobileOpen ? " show" : ""}`,
    [mobileOpen],
  );

  return (
    <nav
      className="navbar navbar-expand-lg navbar-main bg-body-tertiary sticky-top py-3"
      style={{ backgroundColor: 'var(--app-navbar-solid)' }}
    >
      <div className="container-fluid">
        <Link className="navbar-brand d-flex align-items-center gap-2" to="/">
          <img src="/images/logo.png" alt="SrBuj 3D" height="36" className="rounded" />
          <span className="fw-bold">SrBuj 3D</span>
          <span className="badge-soft d-none d-md-inline">E-commerce 3D</span>
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          aria-controls="nav"
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Cerrar navegación" : "Abrir navegación"}
          onClick={() => setMobileOpen((prev) => !prev)}
        >
          <span className="navbar-toggler-icon" />
        </button>

        <div className={collapseClassName} id="nav">
          <div className="d-flex flex-column flex-lg-row align-items-lg-center w-100 gap-3">
            <form
              className="navbar-search order-1 order-lg-2 flex-grow-1"
              role="search"
              onSubmit={handleSearchSubmit}
            >
              <FaSearch className="search-icon" aria-hidden="true" />
              <input
                type="search"
                className="form-control"
                placeholder="Buscar productos, categorías o etiquetas"
                aria-label="Buscar"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="btn-clear-search"
                  onClick={handleClearSearch}
                  aria-label="Limpiar búsqueda"
                >
                  <FaTimes size={12} />
                </button>
              )}
            </form>

            <ul className="navbar-nav me-lg-auto mb-2 mb-lg-0 align-items-lg-center gap-lg-2 nav-pill-group order-2 order-lg-1">
              {navItems.map(({ to, label, icon, end }) => (
                <li key={to} className="nav-item">
                  <NavLink to={to} end={end} className={navLinkClass} onClick={() => setMobileOpen(false)}>
                    <span className="nav-pill-icon">{icon}</span>
                    <span className="nav-pill-label">{label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>

            <div className="d-flex align-items-center gap-2 order-3 order-lg-3 mt-2 mt-lg-0">
              <button
                type="button"
                className="btn btn-outline-secondary btn-icon d-lg-none"
                onClick={cycleTheme}
                aria-label={isDarkMode ? "Activar modo claro" : "Activar modo oscuro"}
              >
                {isDarkMode ? <FaSun className="nav-icon" /> : <FaMoon className="nav-icon" />}
              </button>
              <Link to="/carrito" className="btn btn-primary btn-icon position-relative">
                <FaShoppingCart className="nav-icon" />
                {cartCount > 0 && (
                  <span className="badge bg-danger rounded-pill position-absolute top-0 start-100 translate-middle">
                    {cartCount}
                  </span>
                )}
              </Link>

              {isAuthenticated ? (
                <button
                  onClick={handleLogout}
                  className="btn btn-outline-secondary btn-icon"
                  disabled={loading}
                  title="Cerrar sesión"
                >
                  <FaSignOutAlt className="nav-icon" />
                </button>
              ) : (
                <Link to="/login" className="btn btn-outline-secondary btn-icon" title="Ingresar">
                  <FaUser className="nav-icon" />
                </Link>
              )}
              <button
                type="button"
                className="btn btn-outline-secondary btn-icon d-none d-lg-grid"
                onClick={cycleTheme}
                aria-label={isDarkMode ? "Activar modo claro" : "Activar modo oscuro"}
              >
                {isDarkMode ? <FaSun className="nav-icon" /> : <FaMoon className="nav-icon" />}
              </button>
            </div>
          </div>
        </div>
      </div>
      {mobileOpen && (
        <button
          type="button"
          className="nav-backdrop d-lg-none"
          aria-label="Cerrar navegación"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </nav>
  );
}
