import { useState } from "react";
import { useNavigate } from "react-router-dom";

// import React from "react";

// function Login() {
//   return (
//     <div className="login-container">
//       <h2>Iniciar Sesión</h2>
//       <form>
//         <input type="text" placeholder="Usuario" />
//         <input type="password" placeholder="Contraseña" />
//         <button type="submit">Entrar</button>
//       </form>
//     </div>
//   );
// }

// export default Login;
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
