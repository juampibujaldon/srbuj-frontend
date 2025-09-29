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
  FaSun,
  FaMoon,
  FaRegMoon,
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";

export default function TopNav({ cartCount = 0, onLogout }) {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, logout, user, loading } = useAuth();
  const { theme, cycleTheme } = useTheme();

  const themeIconMap = {
    light: <FaSun className="nav-icon" />,
    dark: <FaMoon className="nav-icon" />,
    black: <FaRegMoon className="nav-icon" />,
  };

  const themeLabelMap = {
    light: "Claro",
    dark: "Oscuro",
    black: "Negro",
  };

  const handleLogout = async () => {
    await logout();
    onLogout?.();
    navigate("/login");
  };

  return (
    <nav className="navbar navbar-expand-lg bg-body-tertiary sticky-top border-bottom">
      <div className="container-fluid">
        <img src="/images/logo.png" alt="SrBuj 3D" height="32" className="me-2" />
        <Link className="navbar-brand fw-bold" to="/">SrBuj 3D</Link>

        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#nav" aria-controls="nav" aria-expanded="false" aria-label="Toggle navigation">
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="nav">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item">
              <NavLink to="/" end className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
                <FaHome className="me-1 nav-icon" /> Inicio
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/productos" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
                <FaStore className="me-1 nav-icon" /> Productos
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/personalizador/3d" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
                <FaCubes className="me-1 nav-icon" /> Personalizador 3D
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/personalizador/subir-stl" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
                <FaUpload className="me-1 nav-icon" /> Subí tu STL
              </NavLink>
            </li>

            {isAuthenticated && (
              <li className="nav-item">
                <NavLink to="/pedidos" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
                  <FaClipboardList className="me-1 nav-icon" /> Mis pedidos
                </NavLink>
              </li>
            )}

            {isAdmin && (
              <>
                <li className="nav-item">
                  <NavLink to="/admin" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
                    <FaTools className="me-1 nav-icon" /> Admin
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink to="/admin/orders" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
                    <FaTruck className="me-1 nav-icon" /> Pedidos (admin)
                  </NavLink>
                </li>
              </>
            )}
          </ul>

          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={cycleTheme}
              title={`Modo ${themeLabelMap[theme] ?? theme}`}
            >
              {themeIconMap[theme] ?? <FaSun className="nav-icon" />} {themeLabelMap[theme] ?? theme}
            </button>
            <Link to="/carrito" className="btn btn-outline-secondary position-relative">
              <FaShoppingCart className="nav-icon" />
              {cartCount > 0 && (
                <span className="badge bg-danger rounded-pill position-absolute top-0 start-100 translate-middle">
                  {cartCount}
                </span>
              )}
            </Link>

            {isAuthenticated ? (
              <button onClick={handleLogout} className="btn btn-outline-danger" disabled={loading}>
                Log out {user?.username ? `(${user.username})` : ""}
              </button>
            ) : (
              <Link to="/login" className="btn btn-outline-primary">
                <FaUser style={{ verticalAlign: "middle", marginRight: 6 }} /> Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
