// src/pages/Register.js
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
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
      if (data.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/");
      }
    } catch (err) {
      setError(err.message || "No se pudo registrar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-md-8 col-lg-6">
          <div className="card shadow-sm border-0">
            <div className="card-body p-4">
              <h1 className="h4 mb-3">Crear cuenta</h1>

              {error && <div className="alert alert-danger py-2">{error}</div>}

              <form onSubmit={onSubmit} className="row g-3">
                <div className="col-12">
                  <label className="form-label">Nombre de usuario *</label>
                  <input
                    name="username"
                    className="form-control"
                    value={form.username}
                    onChange={onChange}
                    placeholder="tu_nombre"
                    autoFocus
                  />
                </div>

                <div className="col-12">
                  <label className="form-label">Email *</label>
                  <input
                    type="email"
                    name="email"
                    className="form-control"
                    value={form.email}
                    onChange={onChange}
                    placeholder="tu@email.com"
                  />
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">Contraseña *</label>
                  <input
                    type="password"
                    name="password"
                    className="form-control"
                    value={form.password}
                    onChange={onChange}
                    placeholder="••••••••"
                  />
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">Repetir contraseña *</label>
                  <input
                    type="password"
                    name="confirm"
                    className="form-control"
                    value={form.confirm}
                    onChange={onChange}
                    placeholder="••••••••"
                  />
                </div>

                <div className="col-12 d-grid pt-2">
                  <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                    {loading ? "Registrando..." : "Registrarme"}
                  </button>
                </div>
              </form>

              <p className="text-muted small mt-3 mb-0">
                ¿Ya tenés cuenta? <Link to="/login">Iniciá sesión</Link>
              </p>
            </div>
          </div>

          <p className="text-center text-muted small mt-3 mb-0">
            Tus credenciales se almacenan de forma segura en el backend.
          </p>
        </div>
      </div>
    </div>
  );
}
