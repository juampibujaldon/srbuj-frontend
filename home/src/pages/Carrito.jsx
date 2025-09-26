// src/pages/Carrito.jsx
import React, { useMemo, useRef, useState } from "react";
import "./carrito.css";
import apiFetch from "../api/client";

/**
 * Estructura esperada de item en cart:
 * {
 *   id: string|number,
 *   title: string,
 *   price: number,
 *   image?: string,   // URL grande
 *   thumb?: string,   // URL chica
 *   weightGr?: number // opcional (default 300g)
 * }
 */
export default function Carrito({ cart = [], removeFromCart }) {
  // --- Agrupar por id para contar cantidades
  const lineas = useMemo(() => {
    const map = new Map();
    for (const it of cart) {
      const key = it.id;
      if (!map.has(key)) map.set(key, { ...it, qty: 0 });
      map.get(key).qty += 1;
    }
    return Array.from(map.values());
  }, [cart]);

  const subtotal = lineas.reduce((acc, it) => acc + it.price * it.qty, 0);

  // --- Estado acordeones (envío/pago) + refs para scroll
  const [open, setOpen] = useState({ shipping: false, payment: false });
  const shippingRef = useRef(null);
  const paymentRef = useRef(null);

  // --- Formulario Envío
  const [shipping, setShipping] = useState({
    nombre: "",
    email: "",
    telefono: "",
    dni: "",
    provincia: "",
    localidad: "",
    cp: "",
    calle: "",
    numero: "",
    depto: "",
    tipo: "domicilio", // "domicilio" | "sucursal"
    sucursalAndreani: "",
  });
  const [shippingErrors, setShippingErrors] = useState({});
  const [shippingQuote, setShippingQuote] = useState(null); // {precio, eta}

  // --- Formulario Pago
  const [payment, setPayment] = useState({
    metodo: "", // "mercadopago" | "transferencia"
  });
  const [paymentErrors, setPaymentErrors] = useState({});

  const envio = shippingQuote?.precio ?? 0;
  const total = subtotal + envio;

  const scrollTo = (ref) => {
    if (!ref?.current) return;
    ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const validateShipping = () => {
    const e = {};
    if (!shipping.nombre.trim()) e.nombre = "Ingresá tu nombre completo.";
    if (!/^\S+@\S+\.\S+$/.test(shipping.email)) e.email = "Email inválido.";
    if (!/^\d{7,15}$/.test(shipping.telefono.replace(/\D/g, "")))
      e.telefono = "Teléfono inválido (solo números).";
    if (!/^\d{7,9}$/.test(shipping.dni.replace(/\D/g, "")))
      e.dni = "DNI inválido.";
    if (!shipping.provincia) e.provincia = "Seleccioná provincia.";
    if (!shipping.localidad) e.localidad = "Seleccioná localidad.";
    if (!/^\d{4}$/.test(shipping.cp)) e.cp = "CP argentino de 4 dígitos.";

    if (shipping.tipo === "domicilio") {
      if (!shipping.calle.trim()) e.calle = "Calle obligatoria.";
      if (!shipping.numero.trim()) e.numero = "Número obligatorio.";
    } else {
      if (!shipping.sucursalAndreani)
        e.sucursalAndreani = "Elegí una sucursal de Andreani.";
    }

    setShippingErrors(e);
    return Object.keys(e).length === 0;
  };

  const validatePayment = () => {
    const e = {};
    if (!payment.metodo) e.metodo = "Elegí un medio de pago.";
    setPaymentErrors(e);
    return Object.keys(e).length === 0;
  };

  // --- Andreani: cotización (hacer REAL desde tu backend!)
  const cotizarAndreani = async () => {
    try {
      const pesoTotalGr = lineas.reduce(
        (acc, it) => acc + (it.weightGr || 300) * it.qty,
        0
      );
      const res = await apiFetch("/api/andreani/cotizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cpDestino: shipping.cp,
          provincia: shipping.provincia,
          localidad: shipping.localidad,
          tipo: shipping.tipo, // domicilio/sucursal
          pesoGr: pesoTotalGr,
          altoCm: 12,
          anchoCm: 20,
          largoCm: 28,
        }),
      });
      if (!res.ok) throw new Error("No se pudo cotizar envío");
      const data = await res.json(); // {precio:number, eta:string}
      setShippingQuote({ precio: data.precio, eta: data.eta });
    } catch (err) {
      console.error(err);
      setShippingQuote(null);
      alert("No pudimos cotizar Andreani. Intentá de nuevo.");
    }
  };

  const handleFinalizar = async () => {
    if (lineas.length === 0) return;
    // 1) Abrir envío si está cerrado
    if (!open.shipping) {
      setOpen((o) => ({ ...o, shipping: true }));
      return scrollTo(shippingRef);
    }
    // 2) Validar envío
    if (!validateShipping()) {
      return scrollTo(shippingRef);
    }
    // 3) Cotizar si no hay cotización
    if (!shippingQuote) {
      await cotizarAndreani();
      return scrollTo(shippingRef);
    }
    // 4) Abrir pago si está cerrado
    if (!open.payment) {
      setOpen((o) => ({ ...o, payment: true }));
      return scrollTo(paymentRef);
    }
    // 5) Validar pago
    if (!validatePayment()) {
      return scrollTo(paymentRef);
    }
    // 6) Crear orden + redirigir si aplica
    try {
      const res = await apiFetch("/api/ordenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lineas.map(({ id, title, price, qty }) => ({
            id,
            title,
            price,
            qty,
          })),
          shipping,
          shippingQuote,
          payment,
          subtotal,
          total,
        }),
      });
      if (!res.ok) throw new Error("No se pudo crear la orden");
      const { redirect } = await res.json(); // p.ej. URL de Mercado Pago
      if (payment.metodo === "mercadopago" && redirect) {
        window.location.href = redirect;
      } else {
        alert("¡Orden creada! Te enviamos un email con los pasos.");
      }
    } catch (e) {
      console.error(e);
      alert("Error al crear la orden.");
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 16 }}>
      <h2 style={{ margin: "8px 0 16px" }}>
        Carrito ({cart.length} {cart.length === 1 ? "item" : "items"})
      </h2>

      <div className="cart-grid">
        {/* Columna izquierda: LISTA GRANDE de productos (siempre visible) */}
        <div>
          <div
            style={{
              border: "1px solid #eee",
              borderRadius: 12,
              padding: 12,
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            }}
          >
            {lineas.length === 0 ? (
              <p>Tu carrito está vacío.</p>
            ) : (
              lineas.map((it) => (
                <ProductoLinea
                  key={it.id}
                  item={it}
                  onRemove={() => removeFromCart?.(it.id)}
                />
              ))
            )}

            <div style={{ marginTop: 12 }}>
              <a href="/" style={{ textDecoration: "none" }}>
                ← Seguir comprando
              </a>
            </div>
          </div>
        </div>

        {/* Columna derecha: STICKY (mini-carrito + resumen + acordeones) */}
        <aside className="cart-aside">
          <MiniCart items={lineas} />

          <Resumen
            subtotal={subtotal}
            envio={shippingQuote?.precio}
            total={total}
            eta={shippingQuote?.eta}
            onFinalizar={handleFinalizar}
            disabled={lineas.length === 0}
          />

          <Accordion
            title="Información de envío"
            open={open.shipping}
            onToggle={() =>
              setOpen((o) => ({ ...o, shipping: !o.shipping }))
            }
            innerRef={shippingRef}
          >
            <ShippingForm
              value={shipping}
              errors={shippingErrors}
              onChange={(patch) => setShipping((s) => ({ ...s, ...patch }))}
              onCotizar={cotizarAndreani}
              cotizado={!!shippingQuote}
            />
          </Accordion>

          <Accordion
            title="Medios de pago"
            open={open.payment}
            onToggle={() => setOpen((o) => ({ ...o, payment: !o.payment }))}
            innerRef={paymentRef}
          >
            <PaymentForm
              value={payment}
              errors={paymentErrors}
              onChange={(patch) => setPayment((p) => ({ ...p, ...patch }))}
            />
          </Accordion>
        </aside>
      </div>
    </div>
  );
}

/* ---------- Subcomponentes ---------- */

function ProductoLinea({ item, onRemove }) {
  return (
    <div className="producto-linea" style={{ padding: "8px 0", borderBottom: "1px solid #f0f0f0" }}>
      <img className="pl-img" src={item.image || item.thumb} alt={item.title} />
      <div>
        <div style={{ fontWeight: 600 }}>{item.title}</div>
        {item.customization && (
          <div style={{ fontSize: 12, color: "#777" }}>
            Modelo {item.customization.shapeLabel || item.customization.shape || "personalizado"}
            {item.customization.color ? ` · Color ${item.customization.color}` : ""}
            {item.customization.materialLabel || item.customization.material
              ? ` · Material ${item.customization.materialLabel || item.customization.material}`
              : ""}
            {item.customization.engraving ? ` · "${item.customization.engraving}"` : ""}
          </div>
        )}
        {item.descripcion && (
          <div style={{ fontSize: 12, color: "#777" }}>{item.descripcion}</div>
        )}
        <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>
          Cantidad: <b>{item.qty}</b>
        </div>
      </div>
      <div className="pl-right" style={{ textAlign: "right" }}>
        <div style={{ fontWeight: 700 }}>
          AR$ {Number(item.price * item.qty).toLocaleString("es-AR")}
        </div>
        <button
          onClick={onRemove}
          style={{
            marginTop: 8,
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid #ffd5d5",
            background: "#fff5f5",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          Quitar
        </button>
      </div>
    </div>
  );
}

function MiniCart({ items }) {
  if (!items?.length) return null;
  return (
    <div
      style={{
        border: "1px solid #eee",
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
      }}
    >
      <h4 style={{ margin: "0 0 8px" }}>Tu carrito</h4>
      <div style={{ display: "grid", rowGap: 8 }}>
        {items.map((it) => (
          <div key={it.id} className="mini-item">
            <img className="mi-img" src={it.thumb || it.image} alt={it.title} />
            <div style={{ fontSize: 13, lineHeight: 1.2 }}>
              <div style={{ fontWeight: 600 }}>{it.title}</div>
              <div style={{ color: "#666" }}>x{it.qty}</div>
            </div>
            <div className="mi-right" style={{ fontSize: 13, fontWeight: 600 }}>
              AR$ {Number(it.price * it.qty).toLocaleString("es-AR")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Resumen({ subtotal, envio, total, eta, onFinalizar, disabled }) {
  const formatARS = (n) =>
    `AR$ ${Number(n || 0).toLocaleString("es-AR", {
      maximumFractionDigits: 0,
    })}`;
  return (
    <div
      style={{
        border: "1px solid #eee",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        boxShadow: "0 2px 8px rgba(0,0,0,.05)",
      }}
    >
      <h3 style={{ marginTop: 0 }}>Resumen</h3>
      <Row label="Subtotal" value={formatARS(subtotal)} />
      <Row label="Envío" value={envio != null ? formatARS(envio) : "—"} />
      <hr />
      <Row label={<b>Total</b>} value={<b>{formatARS(total)}</b>} />
      {eta && (
        <p style={{ fontSize: 12, color: "#555", margin: "6px 0 0" }}>
          Llega aprox.: {eta}
        </p>
      )}
      <button
        onClick={onFinalizar}
        disabled={disabled}
        style={{
          width: "100%",
          marginTop: 12,
          padding: "12px 16px",
          borderRadius: 10,
          border: "none",
          background: disabled ? "#c0c6d4" : "#1677ff",
          color: "#fff",
          fontWeight: 600,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.7 : 1,
          transition: "opacity .2s ease",
        }}
        title={disabled ? "Agregá productos al carrito para continuar" : undefined}
      >
        Finalizar compra
      </button>
      <p style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
        * Al continuar aceptarás los términos y condiciones de SrBuj 3D.
      </p>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function Accordion({ title, open, onToggle, children, innerRef }) {
  return (
    <div
      ref={innerRef}
      style={{ marginTop: 12, border: "1px solid #eee", borderRadius: 12 }}
    >
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "12px 14px",
          background: "white",
          border: "none",
          borderRadius: "12px 12px 0 0",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        {title} <span style={{ float: "right" }}>{open ? "▾" : "▸"}</span>
      </button>
      <div
        style={{
          maxHeight: open ? 900 : 0,
          overflow: "hidden",
          transition: "max-height .35s ease",
          padding: open ? "0 14px 12px 14px" : "0 14px",
          background: "#fff",
          borderTop: "1px solid #eee",
          borderRadius: "0 0 12px 12px",
        }}
      >
        {open && children}
      </div>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div style={{ marginTop: 10 }}>
      <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>
        {label}
      </label>
      {children}
      {error && (
        <div style={{ color: "#d00", fontSize: 12, marginTop: 4 }}>{error}</div>
      )}
    </div>
  );
}

function ShippingForm({ value, errors, onChange, onCotizar, cotizado }) {
  const handleReset = () => {
    onChange({
      nombre: "",
      email: "",
      telefono: "",
      dni: "",
      provincia: "",
      localidad: "",
      cp: "",
      calle: "",
      numero: "",
      depto: "",
      tipo: "domicilio",
      sucursalAndreani: "",
    });
  };

  return (
    <div style={{ paddingTop: 10 }}>
      <Field label="Nombre y Apellido" error={errors.nombre}>
        <input
          value={value.nombre}
          onChange={(e) => onChange({ nombre: e.target.value })}
          className="inp"
        />
      </Field>

      <div className="two-col">
        <Field label="Email" error={errors.email}>
          <input
            value={value.email}
            onChange={(e) => onChange({ email: e.target.value })}
            className="inp"
          />
        </Field>
        <Field label="Teléfono" error={errors.telefono}>
          <input
            value={value.telefono}
            onChange={(e) => onChange({ telefono: e.target.value })}
            className="inp"
          />
        </Field>
      </div>

      <div className="two-col">
        <Field label="DNI" error={errors.dni}>
          <input
            value={value.dni}
            onChange={(e) => onChange({ dni: e.target.value })}
            className="inp"
          />
        </Field>
        <Field label="Código Postal" error={errors.cp}>
          <input
            value={value.cp}
            onChange={(e) => onChange({ cp: e.target.value })}
            className="inp"
          />
        </Field>
      </div>

      <div className="two-col">
        <Field label="Provincia" error={errors.provincia}>
          <input
            value={value.provincia}
            onChange={(e) => onChange({ provincia: e.target.value })}
            className="inp"
          />
        </Field>
        <Field label="Localidad" error={errors.localidad}>
          <input
            value={value.localidad}
            onChange={(e) => onChange({ localidad: e.target.value })}
            className="inp"
          />
        </Field>
      </div>

      <div style={{ marginTop: 10 }}>
        <label style={{ fontSize: 13, marginRight: 12 }}>
          <input
            type="radio"
            checked={value.tipo === "domicilio"}
            onChange={() => onChange({ tipo: "domicilio" })}
          />{" "}
          Envío a domicilio
        </label>
        <label style={{ fontSize: 13 }}>
          <input
            type="radio"
            checked={value.tipo === "sucursal"}
            onChange={() => onChange({ tipo: "sucursal" })}
          />{" "}
          Retiro en sucursal Andreani
        </label>
      </div>

      {value.tipo === "domicilio" ? (
        <div className="addr-grid">
          <Field label="Calle" error={errors.calle}>
            <input
              value={value.calle}
              onChange={(e) => onChange({ calle: e.target.value })}
              className="inp"
            />
          </Field>
          <Field label="Número" error={errors.numero}>
            <input
              value={value.numero}
              onChange={(e) => onChange({ numero: e.target.value })}
              className="inp"
            />
          </Field>
          <Field label="Piso/Dto. (opcional)">
            <input
              value={value.depto}
              onChange={(e) => onChange({ depto: e.target.value })}
              className="inp"
            />
          </Field>
        </div>
      ) : (
        <Field label="Sucursal Andreani" error={errors.sucursalAndreani}>
          {/* En producción: reemplazar por un <select> con /api/andreani/sucursales?cp=XXXX */}
          <input
            placeholder="Ej: Sucursal San Rafael - Av. X 123"
            value={value.sucursalAndreani}
            onChange={(e) => onChange({ sucursalAndreani: e.target.value })}
            className="inp"
          />
        </Field>
      )}

      <button
        type="button"
        onClick={onCotizar}
        style={{
          marginTop: 12,
          padding: "10px 12px",
          borderRadius: 8,
          border: "1px solid #ddd",
          cursor: "pointer",
        }}
      >
        {cotizado ? "Recalcular envío" : "Calcular envío con Andreani"}
      </button>
      <button
        type="button"
        onClick={handleReset}
        style={{
          marginTop: 12,
          marginLeft: 8,
          padding: "10px 12px",
          borderRadius: 8,
          border: "1px solid #ddd",
          cursor: "pointer",
          background: "#f5f5f5",
        }}
      >
        Limpiar datos
      </button>
    </div>
  );
}

function PaymentForm({ value, errors, onChange }) {
  return (
    <div style={{ paddingTop: 10 }}>
      <Field label="Elegí un medio de pago" error={errors.metodo}>
        <select
          className="inp"
          value={value.metodo}
          onChange={(e) => onChange({ metodo: e.target.value })}
        >
          <option value="">— Seleccionar —</option>
          <option value="credito">Tarjeta de crédito</option>
          <option value="debito">Tarjeta de débito</option>
          <option value="mercadopago">Mercado Pago</option>
        </select>
      </Field>
      {value.metodo === "credito" && (
        <div style={{ marginTop: 8, fontSize: 13, color: "#444" }}>
          Completaremos los datos de tu tarjeta al finalizar la compra.
        </div>
      )}
      {value.metodo === "debito" && (
        <div style={{ marginTop: 8, fontSize: 13, color: "#444" }}>
          Completaremos los datos de tu tarjeta al finalizar la compra.
        </div>
      )}
      {value.metodo === "mercadopago" && (
        <div style={{ marginTop: 8, fontSize: 13, color: "#444" }}>
          Te redirigiremos a Mercado Pago para terminar el pago.
        </div>
      )}
    </div>
  );
}
