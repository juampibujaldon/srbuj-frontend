import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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

  const userId = "login-username";
  const passId = "login-password";
  const errorId = error ? "login-error" : undefined;

  const onSubmit = async (event) => {
    event.preventDefault();
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
    <main className="auth-layout auth-layout--with-preview">
      <section className="auth-panel">
        <Link to="/" className="auth-brand">
          <img src="/images/logo.png" alt="SrBuj 3D" height="40" />
          <span>SrBuj 3D</span>
        </Link>

        <div className="auth-panel__body">
          <div className="auth-panel__intro">
            <span className="auth-badge">Bienvenido otra vez</span>
            <h1 className="auth-title">Ingresá a tu cuenta</h1>
            <p className="auth-subtitle">
              Gestioná pedidos, guardá personalizaciones y obtené seguimiento en tiempo real.
            </p>
          </div>

          {justRegistered && (
            <div className="auth-alert" role="status">
              Registro exitoso. Ingresá con tus credenciales para continuar.
            </div>
          )}

          {error && (
            <div className="auth-alert auth-alert--error" role="alert" id={errorId}>
              {error}
            </div>
          )}

          <form className="auth-form" onSubmit={onSubmit} noValidate>
            <div className="auth-form__field">
              <label htmlFor={userId}>Email o usuario</label>
              <input
                id={userId}
                className="auth-input"
                value={user}
                onChange={(event) => setUser(event.target.value)}
                placeholder="tu@correo.com"
                autoComplete="email"
                aria-describedby={errorId}
              />
            </div>

            <div className="auth-form__field">
              <label htmlFor={passId}>Contraseña</label>
              <div className="auth-input-group">
                <input
                  id={passId}
                  type={showPass ? "text" : "password"}
                  className="auth-input"
                  value={pass}
                  onChange={(event) => setPass(event.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  aria-describedby={errorId}
                />
                <button
                  type="button"
                  className="auth-toggle"
                  onClick={() => setShowPass((state) => !state)}
                  aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPass ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <div className="auth-form__footer">
              <label className="auth-checkbox">
                <input type="checkbox" defaultChecked />
                <span>Mantener sesión iniciada</span>
              </label>
              <button
                type="button"
                className="auth-link"
                onClick={() =>
                  alert("Contactanos por WhatsApp o Instagram para recuperar tu acceso.")
                }
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>

          <div className="auth-panel__footer">
            <span>¿Todavía no tenés cuenta?</span>
            <Link to="/register" className="auth-link auth-link--primary">
              Crear cuenta
            </Link>
          </div>
        </div>
      </section>

      <section
        className="auth-preview"
        aria-hidden="true"
      >
        <div
          className="auth-preview__media"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(51, 255, 181, 0.25), transparent 60%), url('/images/printing_logo.jpeg')",
          }}
        />
        <div className="auth-preview__overlay" />
        <div className="auth-preview__content">
        </div>
      </section>
    </main>
  );
}
