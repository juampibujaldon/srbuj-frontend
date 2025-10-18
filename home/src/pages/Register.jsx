import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Register() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { register: registerUserAuth } = useAuth();

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.username.trim() || !form.email.trim() || !form.password.trim()) {
      setError("Completá todos los campos obligatorios.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      const data = await registerUserAuth({
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      navigate(data.role === "admin" ? "/admin" : "/login?registered=1");
    } catch (err) {
      setError(err.message || "No se pudo registrar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-layout">
      <section className="auth-panel auth-panel--compact">
        <Link to="/" className="auth-brand">
          <img src="/images/logo.png" alt="SrBuj 3D" height="40" />
          <span>SrBuj 3D</span>
        </Link>

        <div className="auth-panel__body">
          <div className="auth-panel__intro">
            <span className="auth-badge">Crear cuenta</span>
            <h1 className="auth-title">Sumate a la comunidad SrBuj</h1>
            <p className="auth-subtitle">
              Guardá tus diseños favoritos, recibí actualizaciones y coordiná pedidos en un solo lugar.
            </p>
          </div>

          {error && (
            <div className="auth-alert auth-alert--error" role="alert">
              {error}
            </div>
          )}

          <form className="auth-form" onSubmit={onSubmit} noValidate>
            <div className="auth-form__grid">
              <div className="auth-form__field auth-form__field--full">
                <label htmlFor="register-username">Nombre de usuario *</label>
                <input
                  id="register-username"
                  name="username"
                  className="auth-input"
                  value={form.username}
                  onChange={handleChange}
                  placeholder="tumarca3d"
                  autoComplete="username"
                />
              </div>

              <div className="auth-form__field auth-form__field--full">
                <label htmlFor="register-email">Email *</label>
                <input
                  id="register-email"
                  type="email"
                  name="email"
                  className="auth-input"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="hola@tumarca.com"
                  autoComplete="email"
                />
              </div>

              <div className="auth-form__field">
                <label htmlFor="register-password">Contraseña *</label>
                <input
                  id="register-password"
                  type="password"
                  name="password"
                  className="auth-input"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>

              <div className="auth-form__field">
                <label htmlFor="register-confirm">Repetir contraseña *</label>
                <input
                  id="register-confirm"
                  type="password"
                  name="confirm"
                  className="auth-input"
                  value={form.confirm}
                  onChange={handleChange}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <p className="auth-note">
              Al registrarte aceptás nuestros términos y confirmás que la información es correcta.
            </p>

            <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
              {loading ? "Registrando..." : "Crear cuenta"}
            </button>
          </form>

          <div className="auth-panel__footer">
            <span>¿Ya tenés cuenta?</span>
            <Link to="/login" className="auth-link auth-link--primary">
              Iniciá sesión
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
