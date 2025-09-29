import { Link, NavLink, useNavigate } from "react-router-dom";
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
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext.jsx";

export default function TopNav({ cartCount = 0, onLogout }) {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, logout, user, loading } = useAuth();

  const handleLogout = async () => {
    await logout();
    onLogout?.();
    navigate("/login");
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

  return (
    <nav className="navbar navbar-expand-lg navbar-main sticky-top border-0 py-3">
      <div className="container-fluid">
        <Link className="navbar-brand d-flex align-items-center gap-2" to="/">
          <img src="/images/logo.png" alt="SrBuj 3D" height="36" className="rounded" />
          <span className="fw-bold">SrBuj 3D</span>
          <span className="badge-soft d-none d-md-inline">E-commerce 3D</span>
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#nav"
          aria-controls="nav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon" />
        </button>

        <div className="collapse navbar-collapse" id="nav">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0 align-items-lg-center gap-lg-2 nav-pill-group">
            {navItems.map(({ to, label, icon, end }) => (
              <li key={to} className="nav-item">
                <NavLink to={to} end={end} className={navLinkClass}>
                  <span className="nav-pill-icon">{icon}</span>
                  <span className="nav-pill-label">{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="d-flex align-items-center gap-2">
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
          </div>
        </div>
      </div>
    </nav>
  );
}
