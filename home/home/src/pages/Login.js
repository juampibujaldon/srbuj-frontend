// src/pages/Login.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";

export default function Login() {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const onSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!user.trim() || !pass.trim()) {
      setError("Completá usuario y contraseña.");
      return;
    }

    if (user === "admin" && pass === "admin") {
      localStorage.setItem("token", "ok");
      localStorage.setItem("role", "admin");
      navigate("/admin");
    } else {
      localStorage.setItem("token", "ok");
      localStorage.setItem("role", "user");
      navigate("/");
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
              <div className="text-white-50 small mt-1">
                Tip: usuario <b>admin</b> / contraseña <b>admin</b>
              </div>
            </div>

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
                  <a href="#" className="small text-decoration-none">¿Olvidaste tu contraseña?</a>
                </div>

                <button type="submit" className="btn btn-primary btn-lg w-100">
                  Ingresar
                </button>
              </div>
            </form>

            <p className="text-center text-white-50 small mt-3 mb-0">
              ¿No tenés cuenta? <a href="#" className="link-light text-decoration-none">Contactanos</a>
            </p>
          </div>
        </div>

        {/* Columna: Video Bambu Lab imprimiendo el logo */}
        <div className="col-lg-7 d-none d-lg-block position-relative">
          {/* Contenedor del video */}
          <div className="h-100 w-100 position-relative">
            <video
              className="w-100 h-100 object-fit-cover"
              autoPlay
              muted
              loop
              playsInline
              poster="/img/login-side.jpg"  // opcional
            >
              {/* Dos fuentes para mejor compatibilidad */}
              <source src="/video/bambu-logo.webm" type="video/webm" />
              <source src="/video/bambu-logo.mp4" type="video/mp4" />
              Tu navegador no soporta el video HTML5.
            </video>

            {/* Overlay oscuro para contraste del texto */}
            <div className="position-absolute top-0 start-0 w-100 h-100 bg-dark bg-opacity-25"></div>

            {/* Copy sobre el video */}
            <div className="position-absolute bottom-0 start-0 end-0 p-5 text-center text-white">
              {/* <h2 className="display-6 fw-bold mb-2">Impresión 3D en acción</h2>
              <p className="lead mb-0">Bambu Lab imprimiendo tu logo de SrBuj 3D.</p> */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
