import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  function handleSubmit(e) {
    e.preventDefault();
    if (user === "admin" && pass === "admin") {
      localStorage.setItem("token", "FAKE_ADMIN_TOKEN");
      navigate("/", { replace: true });
    } else {
      setError("Usuario o contraseña incorrectos");
    }
    // Dentro de handleSubmit, cuando validás admin/admin:
if (user === "admin" && pass === "admin") {
  localStorage.setItem("token", "FAKE_ADMIN_TOKEN");
  localStorage.setItem("role", "admin"); // <— para el guard
  navigate("/", { replace: true });
} else {
  // ...
}

  }

  return (
    <div style={{ maxWidth: 400, margin: "40px auto" }}>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label>Usuario</label>
          <input
            className="form-control"
            type="text"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <label>Contraseña</label>
          <input
            className="form-control"
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            required
          />
        </div>
        <button className="btn btn-primary" type="submit">
          Ingresar
        </button>
        {error && <p style={{ color: "red", marginTop: 10 }}>{error}</p>}
      </form>
    </div>
  );
}
