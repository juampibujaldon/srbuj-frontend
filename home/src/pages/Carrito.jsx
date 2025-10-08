// src/pages/Carrito.jsx
import React, { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./carrito.css";
import apiFetch from "../api/client";

const formatARS = (n) =>
  `AR$ ${Number(n || 0).toLocaleString("es-AR", {
    maximumFractionDigits: 0,
  })}`;

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
export default function Carrito({ cart = [], removeFromCart, clearCart }) {
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
  const [feedback, setFeedback] = useState("");
  const [submittingOrder, setSubmittingOrder] = useState(false);

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

  const persistLocalOrder = (order) => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("ordersState");
      const list = raw ? JSON.parse(raw) : [];
      const filtered = Array.isArray(list)
        ? list.filter((entry) => entry && entry.id !== order.id)
        : [];
      const next = [order, ...filtered];
      window.localStorage.setItem("ordersState", JSON.stringify(next));
    } catch (err) {
      console.warn("No se pudo guardar la orden local", err);
    }
  };

  const submitOrder = async (overridePayment) => {
    const finalPayment = overridePayment || payment;
    const body = {
      items: lineas.map(({ id, title, price, qty }) => ({ id, title, price, qty })),
      shipping,
      shippingQuote,
      payment: finalPayment,
      subtotal,
      total,
    };

    setSubmittingOrder(true);
    try {
      const res = await apiFetch("/api/ordenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        let responseData = null;
        try {
          responseData = await res.json();
        } catch (parseErr) {
          responseData = null;
        }
        const createdOrder = responseData?.order || {};
        const localOrder = {
          id: createdOrder.id || `sim-${Date.now()}`,
          status: createdOrder.status || "processing",
          updated_at: createdOrder.updated_at || new Date().toISOString(),
          product_name:
            createdOrder.items?.[0]?.title || lineas[0]?.title || "Pedido personalizado",
          items:
            createdOrder.items ||
            lineas.map(({ id, title, price, qty }) => ({ id, title, price, qty })),
          total: createdOrder.total || total,
          customer: createdOrder.customer || shipping.nombre,
          shipping,
          shippingQuote,
        };
        persistLocalOrder(localOrder);
        clearCart?.();
        const redirectUrl = responseData?.redirect || null;
        if (finalPayment.metodo === "mercadopago" && redirectUrl) {
          window.location.href = redirectUrl;
        } else {
          window.location.href = "/pedidos";
        }
        return;
      }
      throw new Error("No se pudo crear la orden");
    } catch (err) {
      console.warn("Fallo al crear la orden, modo sin pago", err);
      const localOrder = {
        id: `sim-${Date.now()}`,
        status: "processing",
        updated_at: new Date().toISOString(),
        product_name: lineas[0]?.title || "Pedido personalizado",
        items: lineas.map(({ id, title, price, qty }) => ({ id, title, price, qty })),
        total,
        customer: shipping.nombre,
        shipping,
        shippingQuote,
      };
      persistLocalOrder(localOrder);
      clearCart?.();
      window.location.href = "/pedidos";
    } finally {
      setSubmittingOrder(false);
    }
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
          anchoCm: 12,
          largoCm: 12,
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
    await submitOrder();
  };

  const handlePayWithoutPay = async () => {
    if (lineas.length === 0) return;
    if (!open.shipping) {
      setOpen((o) => ({ ...o, shipping: true }));
      return scrollTo(shippingRef);
    }
    if (!validateShipping()) {
      return scrollTo(shippingRef);
    }
    if (!shippingQuote) {
      await cotizarAndreani();
      return scrollTo(shippingRef);
    }
    await submitOrder({ metodo: "manual" });
  };

  const itemLabel = cart.length === 1 ? "item" : "items";
  const headingMeta = lineas.length
    ? "Revisá tus piezas, calculá el envío y finalizá tu pedido cuando quieras."
    : "Todavía no agregaste productos. Explorá el catálogo y sumá tus favoritos.";

  return (
    <div className="cart-page">
      <div className="cart-heading">
        <div>
          <span className="badge-soft">Tu selección</span>
          <h2 className="cart-heading__title gradient-text">
            Carrito ({cart.length} {itemLabel})
          </h2>
          <p className="cart-heading__meta">{headingMeta}</p>
        </div>
        <Link to="/productos" className="btn btn-outline-secondary">
          Seguir explorando
        </Link>
      </div>

      <div className="cart-grid">
        <div className="cart-list">
          <div className="cart-card cart-card--list">
            {lineas.length === 0 ? (
              <div className="cart-empty">
                <span className="cart-empty__emoji" aria-hidden="true">
                  🛒
                </span>
                <p>Tu carrito está vacío.</p>
                <Link to="/productos" className="btn btn-primary btn-sm">
                  Ir al catálogo
                </Link>
              </div>
            ) : (
              lineas.map((it) => (
                <ProductoLinea
                  key={it.id}
                  item={it}
                  onRemove={() => removeFromCart?.(it.id)}
                />
              ))
            )}
          </div>
        </div>

        <aside className="cart-aside">
          <MiniCart items={lineas} />

          <Resumen
            subtotal={subtotal}
            envio={shippingQuote?.precio}
            total={total}
            eta={shippingQuote?.eta}
            onFinalizar={handleFinalizar}
            onPayWithoutPay={handlePayWithoutPay}
            loading={submittingOrder}
            feedback={feedback}
            disabled={lineas.length === 0}
          />

          <Accordion
            title="Información de envío"
            open={open.shipping}
            onToggle={() => setOpen((o) => ({ ...o, shipping: !o.shipping }))}
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
  const customizationDetails = [];
  if (item.customization?.shapeLabel || item.customization?.shape) {
    customizationDetails.push(
      `Modelo ${item.customization.shapeLabel || item.customization.shape}`,
    );
  }
  if (item.customization?.color) {
    customizationDetails.push(`Color ${item.customization.color}`);
  }
  if (item.customization?.materialLabel || item.customization?.material) {
    customizationDetails.push(
      `Material ${item.customization.materialLabel || item.customization.material}`,
    );
  }
  if (item.customization?.engraving) {
    customizationDetails.push(`“${item.customization.engraving}”`);
  }

  return (
    <div className="producto-linea">
      <img
        className="producto-linea__thumb"
        src={item.image || item.thumb || "/images/placeholder.png"}
        alt={item.title}
        loading="lazy"
      />
      <div className="producto-linea__info">
        <h3 className="producto-linea__title">{item.title}</h3>
        {customizationDetails.length > 0 && (
          <div className="producto-linea__meta">{customizationDetails.join(" · ")}</div>
        )}
        {item.descripcion && (
          <div className="producto-linea__meta">{item.descripcion}</div>
        )}
        <span className="producto-linea__qty">
          Cantidad: <b>{item.qty}</b>
        </span>
      </div>
      <div className="producto-linea__actions">
        <span className="producto-linea__price">
          {formatARS(item.price * item.qty)}
        </span>
        <button
          onClick={onRemove}
          className="btn btn-outline-danger btn-sm rounded-pill"
          type="button"
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
    <div className="cart-card">
      <h4 className="cart-card__title">Resumen rápido</h4>
      <div className="mini-item-list">
        {items.map((it) => (
          <div key={it.id} className="mini-item">
            <img
              className="mini-item__thumb"
              src={it.thumb || it.image || "/images/placeholder.png"}
              alt={it.title}
              loading="lazy"
            />
            <div>
              <p className="mini-item__title">{it.title}</p>
              <span className="mini-item__count">x{it.qty}</span>
            </div>
            <span className="mini-item__price">{formatARS(it.price * it.qty)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Resumen({
  subtotal,
  envio,
  total,
  eta,
  onFinalizar,
  onPayWithoutPay,
  loading,
  disabled,
  feedback,
}) {
  return (
    <div className="cart-card cart-summary">
      <h3 className="cart-card__title">Resumen</h3>
      <Row label="Subtotal" value={formatARS(subtotal)} />
      <Row label="Envío" value={envio != null ? formatARS(envio) : "—"} />
      <hr />
      <Row
        label={<span className="cart-summary__total">Total</span>}
        value={<span className="cart-summary__total">{formatARS(total)}</span>}
      />
      {eta && <p className="cart-summary__eta">Llega aprox.: {eta}</p>}
      <button
        onClick={onFinalizar}
        disabled={disabled || loading}
        className="btn btn-primary cart-summary__cta"
        title={disabled ? "Agregá productos al carrito para continuar" : undefined}
      >
        {loading ? "Procesando..." : "Finalizar compra"}
      </button>
      {onPayWithoutPay && (
        <button
          type="button"
          onClick={onPayWithoutPay}
          disabled={disabled || loading}
          className="btn btn-outline-success cart-summary__cta"
        >
          {loading ? "Procesando..." : "Pagar sin pagar"}
        </button>
      )}
      <p className="cart-summary__helper">
        * Al continuar aceptarás los términos y condiciones de SrBuj 3D.
      </p>
      {feedback && <div className="alert alert-info py-2 mt-2">{feedback}</div>}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="cart-summary__row">
      <span>{label}</span>
      <span className="cart-summary__value">{value}</span>
    </div>
  );
}

function Accordion({ title, open, onToggle, children, innerRef }) {
  return (
    <div ref={innerRef} className={`cart-accordion${open ? " is-open" : ""}`}>
      <button
        type="button"
        onClick={onToggle}
        className="cart-accordion__trigger"
        aria-expanded={open}
      >
        <span>{title}</span>
        <span className="cart-accordion__icon" aria-hidden="true">
          ▾
        </span>
      </button>
      <div className="cart-accordion__content">
        <div className="cart-accordion__body">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div className="cart-field">
      <label className="cart-field__label">{label}</label>
      {children}
      {error && <div className="cart-field__error">{error}</div>}
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

  const radioClass = (tipo) =>
    `cart-radio-pill${value.tipo === tipo ? " is-active" : ""}`;

  return (
    <>
      <Field label="Nombre y Apellido" error={errors.nombre}>
        <input
          value={value.nombre}
          onChange={(e) => onChange({ nombre: e.target.value })}
          className="form-control cart-input"
        />
      </Field>

      <div className="cart-form-two">
        <Field label="Email" error={errors.email}>
          <input
            value={value.email}
            onChange={(e) => onChange({ email: e.target.value })}
            className="form-control cart-input"
          />
        </Field>
        <Field label="Teléfono" error={errors.telefono}>
          <input
            value={value.telefono}
            onChange={(e) => onChange({ telefono: e.target.value })}
            className="form-control cart-input"
          />
        </Field>
      </div>

      <div className="cart-form-two">
        <Field label="DNI" error={errors.dni}>
          <input
            value={value.dni}
            onChange={(e) => onChange({ dni: e.target.value })}
            className="form-control cart-input"
          />
        </Field>
        <Field label="Código Postal" error={errors.cp}>
          <input
            value={value.cp}
            onChange={(e) => onChange({ cp: e.target.value })}
            className="form-control cart-input"
          />
        </Field>
      </div>

      <div className="cart-form-two">
        <Field label="Provincia" error={errors.provincia}>
          <input
            value={value.provincia}
            onChange={(e) => onChange({ provincia: e.target.value })}
            className="form-control cart-input"
          />
        </Field>
        <Field label="Localidad" error={errors.localidad}>
          <input
            value={value.localidad}
            onChange={(e) => onChange({ localidad: e.target.value })}
            className="form-control cart-input"
          />
        </Field>
      </div>

      <div className="cart-radio-group">
        <label className={radioClass("domicilio")}>
          <input
            type="radio"
            name="shipping-type"
            checked={value.tipo === "domicilio"}
            onChange={() => onChange({ tipo: "domicilio" })}
          />
          Envío a domicilio
        </label>
        <label className={radioClass("sucursal")}>
          <input
            type="radio"
            name="shipping-type"
            checked={value.tipo === "sucursal"}
            onChange={() => onChange({ tipo: "sucursal" })}
          />
          Retiro en sucursal Andreani
        </label>
      </div>

      {value.tipo === "domicilio" ? (
        <div className="cart-form-three">
          <Field label="Calle" error={errors.calle}>
            <input
              value={value.calle}
              onChange={(e) => onChange({ calle: e.target.value })}
              className="form-control cart-input"
            />
          </Field>
          <Field label="Número" error={errors.numero}>
            <input
              value={value.numero}
              onChange={(e) => onChange({ numero: e.target.value })}
              className="form-control cart-input"
            />
          </Field>
          <Field label="Piso/Dto. (opcional)">
            <input
              value={value.depto}
              onChange={(e) => onChange({ depto: e.target.value })}
              className="form-control cart-input"
            />
          </Field>
        </div>
      ) : (
        <Field label="Sucursal Andreani" error={errors.sucursalAndreani}>
          <input
            placeholder="Ej: Sucursal San Rafael - Av. X 123"
            value={value.sucursalAndreani}
            onChange={(e) => onChange({ sucursalAndreani: e.target.value })}
            className="form-control cart-input"
          />
        </Field>
      )}

      <div className="cart-form-actions">
        <button
          type="button"
          onClick={onCotizar}
          className="btn btn-primary btn-sm"
        >
          {cotizado ? "Recalcular envío" : "Calcular envío con Andreani"}
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="btn btn-outline-secondary btn-sm"
        >
          Limpiar datos
        </button>
      </div>
    </>
  );
}

function PaymentForm({ value, errors, onChange }) {
  return (
    <>
      <Field label="Elegí un medio de pago" error={errors.metodo}>
        <select
          className="form-select cart-input"
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
        <p className="cart-note">
          Completaremos los datos de tu tarjeta al finalizar la compra.
        </p>
      )}
      {value.metodo === "debito" && (
        <p className="cart-note">
          Completaremos los datos de tu tarjeta al finalizar la compra.
        </p>
      )}
      {value.metodo === "mercadopago" && (
        <p className="cart-note">Te redirigiremos a Mercado Pago para terminar el pago.</p>
      )}
    </>
  );
}
