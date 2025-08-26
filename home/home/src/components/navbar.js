// src/components/Navbar.js
import { Link, useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem("token");

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <nav style={{ display: "flex", gap: "1rem", padding: "1rem", background: "#eee" }}>
      <Link to="/">Home</Link>
      {isLoggedIn ? (
        <button onClick={handleLogout} className="btn btn-danger">
          Log out
        </button>
      ) : (
        <Link to="/login" className="btn btn-primary">
          Iniciar sesión
        </Link>
      )}
    </nav>
  );
}
