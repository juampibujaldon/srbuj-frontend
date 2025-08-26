import { Link, NavLink, useNavigate } from "react-router-dom";
import { FaShoppingCart, FaUser } from "react-icons/fa";

export default function TopNav({ cartCount = 0 }) {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem("token");
  const isAdmin = localStorage.getItem("role") === "admin";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/login");
  };

  return (
    <nav className="navbar navbar-expand-lg bg-body-tertiary sticky-top border-bottom">
      <div className="container-fluid">
        <Link className="navbar-brand fw-bold" to="/">SrBuj 3D</Link>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#nav"
          aria-controls="nav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="nav">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item">
              <NavLink to="/" end className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
                Inicio
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/productos" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
                Productos
              </NavLink>
            </li>

            {/* dentro del <ul> de navegación */}
            {isAdmin && (
              <li className="nav-item">
                <NavLink to="/admin" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
                  Admin
                </NavLink>
              </li>
            )}
          </ul>

          <div className="d-flex align-items-center gap-2">
            <Link to="/carrito" className="btn btn-outline-secondary position-relative">
              <FaShoppingCart />
              {cartCount > 0 && (
                <span className="badge bg-danger rounded-pill position-absolute top-0 start-100 translate-middle">
                  {cartCount}
                </span>
              )}
            </Link>

            {isLoggedIn ? (
              <button onClick={handleLogout} className="btn btn-outline-danger">
                Log out
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
