// src/pages/Login.js
import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { search } = useLocation();
  const justRegistered = new URLSearchParams(search).get("registered") === "1";
  const { login } = useAuth();

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!user.trim() || !pass.trim()) {
      setError("Completá usuario y contraseña.");
      return;
    }

    setLoading(true);
    try {
      const data = await login({ username: user.trim(), password: pass });
      navigate(data.role === "admin" ? "/admin" : "/");
    } catch (err) {
      setError(err.message || "Usuario o contraseña incorrectos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid min-vh-100 bg-dark bg-gradient">
      <div className="row g-0 min-vh-100">
        {/* Columna: Formulario */}
        <div className="col-12 col-lg-5 d-flex align-items-center justify-content-center p-4">
          <div className="w-100" style={{ maxWidth: 420 }}>
            <div className="text-center mb-4">
              <img
                src="/img/logo.png"
                alt="SrBuj 3D"
                height="48"
                className="mb-2"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
              <h1 className="h4 text-white mb-0">Iniciar sesión</h1>
            </div>

            {justRegistered && (
              <div className="alert alert-success py-2">
                Registro exitoso. Ingresá con tu usuario y contraseña.
              </div>
            )}
            {error && <div className="alert alert-danger py-2">{error}</div>}

            <form onSubmit={onSubmit} className="card shadow-lg border-0">
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label">Usuario o email</label>
                  <input
                    className="form-control form-control-lg"
                    value={user}
                    onChange={(e) => setUser(e.target.value)}
                    placeholder="tu@correo.com o admin"
                    autoFocus
                  />
                </div>

                <div className="mb-2">
                  <label className="form-label">Contraseña</label>
                  <div className="input-group input-group-lg">
                    <input
                      type={showPass ? "text" : "password"}
                      className="form-control"
                      value={pass}
                      onChange={(e) => setPass(e.target.value)}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setShowPass((s) => !s)}
                      aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showPass ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div className="form-check">
                    <input className="form-check-input" type="checkbox" id="remember" defaultChecked />
                    <label className="form-check-label" htmlFor="remember">
                      Recordarme
                    </label>
                  </div>
                  <button
                    type="button"
                    className="btn btn-link small text-decoration-none p-0"
                    style={{ lineHeight: 1 }}
                    onClick={() => alert("Contactanos para recuperar tu acceso.")}
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>

                <button type="submit" className="btn btn-primary btn-lg w-100" disabled={loading}>
                  {loading ? "Ingresando..." : "Ingresar"}
                </button>
                <Link
                  to="/register"
                  className="btn btn-outline-secondary btn-lg w-100 mt-3 text-white border-0"
                  style={{
                    background: "linear-gradient(135deg, rgba(36, 75, 160, 0.9), rgba(251, 251, 251, 0.85))",
                  }}
                >
                  Crear cuenta
                </Link>
              </div>
            </form>

            <p className="text-center text-white-50 small mt-3 mb-0">
              ¿No tenés cuenta?{" "}
              <Link to="/register" className="link-light text-decoration-none">Registrate</Link>
            </p>
          </div>
        </div>

        {/* Foto del costado logiin */}
        <div className="col-lg-7 d-none d-lg-block position-relative">
          <div className="h-100 w-100 position-relative">
            <video
              className="w-100 h-100 object-fit-cover"
              poster="/images/printing_logo.jpeg" // opcional
            >
            </video>

            <div className="position-absolute top-0 start-0 w-100 h-100 bg-dark bg-opacity-25"></div>
            <div className="position-absolute bottom-0 start-0 end-0 p-5 text-center text-white">
              {/* copy opcional */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
