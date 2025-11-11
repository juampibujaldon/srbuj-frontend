// src/pages/Carrito.jsx
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./carrito.css";
import {
  createOrder,
  submitOrder as submitOrderApi,
  uploadOrderFile,
  fetchFeatureFlags,
} from "../api/orders";
import {
  quoteShipping,
  mockShippingQuote,
  SHIPPING_PROVIDERS,
  getProviderLabel,
} from "../api/shipping";
import { formatPrice } from "../lib/currency";

const ORDER_DRAFT_KEY = "orderDraft";
const DEFAULT_WEIGHT_GR = 300;
const MIN_WEIGHT_GR = 50;
const DEFAULT_DIMENSIONS_CM = { lengthCm: 20, widthCm: 20, heightCm: 15 };
const DEFAULT_PROVIDER = SHIPPING_PROVIDERS.ANDREANI;
const PICKUP_PROVIDER = "pickup-local";
const PICKUP_QUOTE = Object.freeze({
  precio: 0,
  eta: "Retirá en nuestro taller (coordinamos por WhatsApp).",
  provider: PICKUP_PROVIDER,
  simulado: true,
});

const PRODUCT_DIMENSIONS = {
  "mate-clasico": { lengthCm: 12, widthCm: 12, heightCm: 18 },
  "mate-imperial": { lengthCm: 14, widthCm: 14, heightCm: 20 },
  "stl-digital": { lengthCm: 18, widthCm: 18, heightCm: 5 },
};

const PRODUCT_WEIGHT = {
  "mate-clasico": 280,
  "mate-imperial": 360,
  "stl-digital": 150,
};

const buildFallbackQuote = (provider, cartSummary = {}, cp = "") => {
  const summary =
    cartSummary && Object.keys(cartSummary).length
      ? cartSummary
      : { totalWeightGr: DEFAULT_WEIGHT_GR };
  return mockShippingQuote(provider, {
    cp,
    cartSummary: summary,
  });
};

const SHIPPING_REQUIRED_FIELDS = ["cp", "provincia", "localidad", "calle", "numero"];

const SHIPPING_SENSITIVE_FIELDS = [
  "cp",
  "provincia",
  "localidad",
  "calle",
  "numero",
  "tipo",
  "sucursalAndreani",
  "provider",
];

const getItemKey = (item = {}) =>
  (item.sku || item.codigo || item.id || item.title || "").toString().toLowerCase();

const getItemDimensions = (item) => {
  const key = getItemKey(item);
  return PRODUCT_DIMENSIONS[key] || DEFAULT_DIMENSIONS_CM;
};

const getItemWeight = (item) => {
  const key = getItemKey(item);
  const fallback = PRODUCT_WEIGHT[key] ?? DEFAULT_WEIGHT_GR;
  const value = Number(item?.weightGr ?? fallback);
  return Math.max(value || fallback, MIN_WEIGHT_GR);
};

const buildCartSummary = (items = []) => {
  const summaryItems = items.map((item, index) => {
    const dimensions = getItemDimensions(item);
    const weightGr = getItemWeight(item);
    return {
      id: String(item.id ?? item.sku ?? item.title ?? `linea-${index}`),
      sku: item.sku || item.id || item.title || "sku-desconocido",
      title: item.title,
      qty: item.qty,
      weightGr,
      dimensions,
    };
  });
  const totalWeightGr = summaryItems.reduce((acc, item) => acc + item.weightGr * item.qty, 0);
  const totalVolumeCm3 = summaryItems.reduce((acc, item) => {
    const volume = item.dimensions.lengthCm * item.dimensions.widthCm * item.dimensions.heightCm;
    return acc + volume * item.qty;
  }, 0);
  return { items: summaryItems, totalWeightGr, totalVolumeCm3 };
};

const loadOrderDraft = () => {
  if (typeof window === "undefined") return null;
  try {
    const saved = window.localStorage.getItem(ORDER_DRAFT_KEY);
    if (!saved) return null;
    return JSON.parse(saved);
  } catch (error) {
    console.warn("No se pudo leer orderDraft", error);
    return null;
  }
};

const persistOrderDraft = (data) => {
  if (typeof window === "undefined") return;
  try {
    if (!data) {
      window.localStorage.removeItem(ORDER_DRAFT_KEY);
      return;
    }
    window.localStorage.setItem(ORDER_DRAFT_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn("No se pudo guardar orderDraft", error);
  }
};

const ALLOWED_ATTACHMENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/zip",
  "application/x-zip-compressed",
  "model/stl",
  "application/vnd.ms-pki.stl",
];

const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024; // 25 MB

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
  const navigate = useNavigate();
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

  const cartSummary = useMemo(() => buildCartSummary(lineas), [lineas]);
  const subtotal = lineas.reduce((acc, it) => {
    const priceValue = Number(it.price);
    const linePrice = Number.isFinite(priceValue) ? priceValue : 0;
    return acc + linePrice * it.qty;
  }, 0);

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
    provider: DEFAULT_PROVIDER,
  });
  const [shippingErrors, setShippingErrors] = useState({});
  const [shippingQuote, setShippingQuote] = useState(null); // {precio, eta}
  const [quoteStatus, setQuoteStatus] = useState("idle");
  const [quoteError, setQuoteError] = useState("");
  const quoteResetGuard = useRef(false);
  const shouldSkipResetRef = useRef(false);

  // --- Formulario Pago
  const [payment, setPayment] = useState({
    metodo: "", // "mercadopago" | "transferencia"
  });
  const [paymentErrors, setPaymentErrors] = useState({});
  const [feedback, setFeedback] = useState("");
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const [featureFlags, setFeatureFlags] = useState({});
  const pesoTotalGr = cartSummary.totalWeightGr;
  const clearDraftSelection = useCallback(() => {
    setShippingQuote(null);
    setQuoteStatus("idle");
    setQuoteError("");
    setFeedback("");
    persistOrderDraft(null);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const flags = await fetchFeatureFlags();
        if (active) setFeatureFlags(flags);
      } catch (error) {
        console.warn("No se pudieron obtener los feature flags", error);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const saved = loadOrderDraft();
    if (!saved) return;
    shouldSkipResetRef.current = true;
    if (saved.shipping) {
      setShipping((prev) => ({
        ...prev,
        ...saved.shipping,
        provider: saved.shipping.provider || prev.provider || DEFAULT_PROVIDER,
      }));
    }
    if (saved.quote) {
      setShippingQuote(saved.quote);
      setQuoteStatus("success");
      const savedProviderLabel = getProviderLabel(saved.quote.provider || saved.provider || DEFAULT_PROVIDER);
      setFeedback(saved.feedback || `Usamos la última cotización de ${savedProviderLabel}.`);
    }
  }, []);

  useEffect(() => {
    if (!shipping.provider) {
      setShipping((prev) => ({ ...prev, provider: DEFAULT_PROVIDER }));
      return;
    }
    if (shipping.provider !== SHIPPING_PROVIDERS.ANDREANI && shipping.tipo === "sucursal") {
      setShipping((prev) => ({ ...prev, tipo: "domicilio", sucursalAndreani: "" }));
    }
  }, [shipping.provider, shipping.tipo]);

  const quoteSensitiveSignature = SHIPPING_SENSITIVE_FIELDS.map((field) => shipping[field] || "").join("|");
  const cartSignature = cartSummary.items.map((item) => `${item.id}:${item.qty}:${item.weightGr}`).join("|");

  useEffect(() => {
    if (shouldSkipResetRef.current) {
      shouldSkipResetRef.current = false;
      return;
    }
    if (!quoteResetGuard.current) {
      quoteResetGuard.current = true;
      return;
    }
    setShippingQuote(null);
    setQuoteStatus("idle");
    setQuoteError("");
  }, [quoteSensitiveSignature, cartSignature]);

  const provider = shipping.provider || DEFAULT_PROVIDER;
  const isPickup = shipping.tipo === "retiro" || provider === PICKUP_PROVIDER;
  const providerLabel =
    provider === PICKUP_PROVIDER ? "Retiro en taller" : getProviderLabel(provider);
  const activeQuote = isPickup ? PICKUP_QUOTE : shippingQuote;
  const envio = activeQuote?.precio ?? 0;
  const total = subtotal + envio;
  const itemLabel = cart.length === 1 ? "item" : "items";
  const hasItems = lineas.length > 0;
  const missingFields = [];
  if (!isPickup) {
    for (const field of SHIPPING_REQUIRED_FIELDS) {
      if (field === "calle" || field === "numero") {
        continue;
      }
      if (!String(shipping[field] || "").trim()) {
        missingFields.push(field);
      }
    }
    if (!provider) {
      missingFields.unshift("operador de envío");
    }
    if (provider === SHIPPING_PROVIDERS.ANDREANI && shipping.tipo === "sucursal") {
      if (!String(shipping.sucursalAndreani || "").trim()) {
        missingFields.push("sucursal");
      }
    } else {
      if (!String(shipping.calle || "").trim()) missingFields.push("calle");
      if (!String(shipping.numero || "").trim()) missingFields.push("número");
    }
  }
  const quoteDisabledReason = isPickup
    ? ""
    : !hasItems
      ? "Agregá productos al carrito."
      : missingFields.length
        ? `Completá ${missingFields.join(", ")}.`
        : pesoTotalGr <= 0
          ? "Los productos necesitan peso válido para cotizar."
          : "";
  const canQuoteShipping = !isPickup && !quoteDisabledReason;
  const quoteHelperMessage = isPickup
    ? "Coordinamos el retiro en nuestro taller sin datos de dirección."
    : quoteDisabledReason
      ? quoteDisabledReason
      : quoteStatus === "loading"
        ? `Cotizando con ${providerLabel}...`
        : quoteStatus === "error"
          ? quoteError || `No pudimos cotizar ${providerLabel}.`
          : quoteStatus === "success" && shippingQuote
            ? shippingQuote.simulado
              ? "Tarifa estimada lista."
              : `Tarifa de ${providerLabel} confirmada.`
            : "";
  const shippingReady = hasItems && (isPickup || Boolean(shippingQuote));
  const paymentLabelMap = {
    credito: "Tarjeta de crédito",
    debito: "Tarjeta de débito",
    mercadopago: "Mercado Pago",
    transferencia: "Transferencia",
    manual: "Coordinación manual",
  };
  const paymentLabel = paymentLabelMap[payment.metodo] || null;
  const paymentReady = Boolean(payment.metodo);
  const flowStep = (() => {
    if (!hasItems) return 1;
    if (submittingOrder) return 3;
    if (open.payment || paymentReady) return 3;
    if (open.shipping || shippingReady) return 2;
    return 1;
  })();
  const shippingDescription = shippingReady
    ? isPickup
      ? "Retiro en taller"
      : activeQuote?.eta
        ? `ETA ${activeQuote.eta}`
        : "Tarifa confirmada"
    : "Completá tus datos";
  const paymentDescription = paymentReady
    ? paymentLabel
    : submittingOrder
      ? "Confirmando..."
      : "Seleccioná un medio";
  const steps = useMemo(
    () => [
      {
        id: "items",
        label: "Productos",
        status: !hasItems ? "empty" : flowStep > 1 ? "complete" : "current",
        description: hasItems ? `${cart.length} ${itemLabel}` : "Sin productos",
      },
      {
        id: "shipping",
        label: "Envío",
        status: shippingReady
          ? flowStep > 2
            ? "complete"
            : "current"
          : flowStep === 2
            ? "current"
            : "upcoming",
        description: shippingDescription,
      },
      {
        id: "payment",
        label: "Pago",
        status: submittingOrder
          ? "processing"
          : paymentReady
            ? "complete"
            : flowStep === 3
              ? "current"
              : "upcoming",
        description: paymentDescription,
      },
    ],
    [
      cart.length,
      flowStep,
      hasItems,
      itemLabel,
      paymentDescription,
      paymentReady,
      shippingDescription,
      shippingReady,
      submittingOrder,
    ],
  );
  const primaryActionLabel = (() => {
    if (!hasItems) return "Agregar productos";
    if (!open.shipping && !shippingReady) return "Completar envío";
    if (!shippingReady) return "Calcular envío";
    if (!open.payment && !paymentReady) return "Elegir medio de pago";
    if (!paymentReady) return "Seleccionar medio de pago";
    return "Confirmar pedido";
  })();
  const secondaryActionLabel = shippingReady ? "Coordinar sin pagar" : "Hablar con asesor";

  const scrollTo = (ref) => {
    if (!ref?.current) return;
    ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleAttachmentChange = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) {
      setAttachments([]);
      setUploadError("");
      return;
    }

    const validated = [];
    for (const file of files) {
      if (file.size > MAX_ATTACHMENT_SIZE) {
        setUploadError("Cada archivo debe pesar menos de 25 MB.");
        return;
      }
      if (file.type && !ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
        setUploadError("Formato no permitido. Usá PDF, ZIP o imágenes JPG/PNG.");
        return;
      }
      validated.push(file);
    }

    setUploadError("");
    setAttachments(validated);
  };

  const validateShipping = () => {
    const e = {};
    if (!shipping.nombre.trim()) e.nombre = "Ingresá tu nombre completo.";
    if (!/^\S+@\S+\.\S+$/.test(shipping.email)) e.email = "Email inválido.";
    if (!/^\d{7,15}$/.test(shipping.telefono.replace(/\D/g, "")))
      e.telefono = "Teléfono inválido (solo números).";
    if (!/^\d{7,9}$/.test(shipping.dni.replace(/\D/g, "")))
      e.dni = "DNI inválido.";
    if (isPickup) {
      setShippingErrors(e);
      return Object.keys(e).length === 0;
    }
    const provider = shipping.provider || DEFAULT_PROVIDER;
    const providerLabel = getProviderLabel(provider);
    if (!provider) e.provider = "Elegí un operador de envío.";
    if (!shipping.provincia) e.provincia = "Seleccioná provincia.";
    if (!shipping.localidad) e.localidad = "Seleccioná localidad.";
    if (!/^\d{4}$/.test(shipping.cp)) e.cp = "CP argentino de 4 dígitos.";

    const needsSucursal =
      provider === SHIPPING_PROVIDERS.ANDREANI && shipping.tipo === "sucursal";

    if (needsSucursal) {
      if (!shipping.sucursalAndreani)
        e.sucursalAndreani = `Elegí una sucursal de ${providerLabel}.`;
    } else {
      if (!shipping.calle.trim()) e.calle = "Calle obligatoria.";
      if (!shipping.numero.trim()) e.numero = "Número obligatorio.";
    }

    setShippingErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleTogglePickup = () => {
    setShippingErrors({});
    setShipping((prev) => {
      const nextIsPickup = !(prev.tipo === "retiro" || prev.provider === PICKUP_PROVIDER);
      if (nextIsPickup) {
        return { ...prev, tipo: "retiro", provider: PICKUP_PROVIDER };
      }
      return { ...prev, tipo: "domicilio", provider: DEFAULT_PROVIDER };
    });
    setShippingQuote(null);
    setQuoteStatus("idle");
    setQuoteError("");
    setFeedback(
      isPickup ? "" : "Activaste el retiro sin costo. Coordinamos la entrega con vos.",
    );
  };

  const validatePayment = () => {
    const e = {};
    if (!payment.metodo) e.metodo = "Elegí un medio de pago.";
    setPaymentErrors(e);
    return Object.keys(e).length === 0;
  };

  const buildOrderPayload = (finalPayment) => ({
    items: lineas.map(({ id, title, price, qty, customization }) => ({
      product_id: typeof id === "number" ? id : null,
      title,
      quantity: qty,
      unit_price: Number.isFinite(Number(price)) ? Number(price) : 0,
      metadata: customization || {},
    })),
    shipping_address: shipping,
    shipping_quote: activeQuote || {},
    shipping_cost: activeQuote?.precio ?? 0,
    payment_metadata: finalPayment,
  });

  const submitOrder = async (overridePayment) => {
    const finalPayment = overridePayment || payment;
    setSubmittingOrder(true);
    setOrderError("");
    setUploadError("");
    setUploadProgress(0);

    try {
      const orderPayload = buildOrderPayload(finalPayment);
      const order = await createOrder(orderPayload);

      if (attachments.length) {
        const totalUploads = attachments.length;
        const uploadNotes = shipping.notas || shipping.observaciones || "Adjunto desde checkout";
        for (const [index, file] of attachments.entries()) {
          await uploadOrderFile(order.id, file, {
            notes: uploadNotes,
            onProgress: (progress) => {
              const base = (index / totalUploads) * 100;
              setUploadProgress(Math.min(100, Math.round(base + progress / totalUploads)));
            },
          });
        }
        setUploadProgress(100);
      }

      await submitOrderApi(order.id);
      clearCart?.();
      clearDraftSelection();
      navigate("/orders");
    } catch (err) {
      console.error("No se pudo generar la orden", err);
      setOrderError(err.message || "No pudimos generar el pedido. Intentá nuevamente.");
    } finally {
      setSubmittingOrder(false);
      setUploadProgress(0);
    }
  };

  // --- Cotización de envío (Andreani / Correo Argentino con fallback)
  const cotizarEnvio = async () => {
    if (isPickup) {
      return;
    }
    if (!validateShipping()) {
      return;
    }
    if (!hasItems || !canQuoteShipping) {
      setShippingErrors((prev) => ({ ...prev }));
      return;
    }

    const provider = shipping.provider || DEFAULT_PROVIDER;
    const providerLabel = getProviderLabel(provider);
    const payload = {
      cp: shipping.cp.trim(),
      provincia: shipping.provincia.trim(),
      localidad: shipping.localidad.trim(),
      addressLine: [shipping.calle, shipping.numero, shipping.depto].filter(Boolean).join(" "),
      tipo: shipping.tipo,
      provider,
      cartSummary,
    };

    setQuoteStatus("loading");
    setQuoteError("");
    setFeedback("");

    try {
      if (
        featureFlags &&
        ((provider === SHIPPING_PROVIDERS.ANDREANI && featureFlags.ENABLE_ANDREANI_QUOTE === false) ||
          (provider === SHIPPING_PROVIDERS.CORREO_ARGENTINO &&
            featureFlags.ENABLE_CORREO_ARGENTINO_QUOTE === false))
      ) {
        const fallback = buildFallbackQuote(provider, cartSummary, shipping.cp);
        setShippingQuote(fallback);
        setQuoteStatus("success");
        setFeedback(`Mostramos un estimado porque ${providerLabel} está deshabilitado.`);
        persistOrderDraft({
          shipping,
          quote: fallback,
          provider,
          cartSummary,
          requestedAt: new Date().toISOString(),
        });
        return;
      }

      const response = await quoteShipping(provider, payload);
      const quote = {
        precio: response.precio,
        eta: response.eta,
        simulado: Boolean(response.simulado),
        provider: response.provider || provider,
        metadata: response.metadata,
      };
      setShippingQuote(quote);
      setQuoteStatus("success");
      if (response.detalle) {
        setFeedback(response.detalle);
      }
      persistOrderDraft({
        shipping,
        quote,
        provider,
        cartSummary,
        requestedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error(`Fallo cotización ${provider}`, err);
      const fallback = buildFallbackQuote(provider, cartSummary, shipping.cp);
      setShippingQuote(fallback);
      setQuoteStatus("error");
      const message = err?.name === "AbortError" ? "La cotización tardó demasiado." : err?.message;
      setQuoteError(message || `No pudimos cotizar ${providerLabel}.`);
      setFeedback(`Mostramos una tarifa estimada porque la cotización de ${providerLabel} falló.`);
      persistOrderDraft({
        shipping,
        quote: fallback,
        provider,
        cartSummary,
        error: message || "quote_failed",
        requestedAt: new Date().toISOString(),
      });
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
    if (!isPickup && !shippingQuote) {
      await cotizarEnvio();
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
    if (!isPickup && !shippingQuote) {
      await cotizarEnvio();
      return scrollTo(shippingRef);
    }
    await submitOrder({ metodo: "manual" });
  };

  const headingMeta = hasItems
    ? "Revisá tus piezas, calculá el envío y finalizá tu pedido cuando quieras."
    : "Todavía no agregaste productos. Explorá el catálogo y sumá tus favoritos.";

  return (
    <div className="cart-page">
      <CheckoutSteps steps={steps} />
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
            envio={envio}
            envioLabel={isPickup ? "Retiro sin costo" : undefined}
            total={total}
            eta={activeQuote?.eta}
            onFinalizar={handleFinalizar}
            onPayWithoutPay={handlePayWithoutPay}
            loading={submittingOrder}
            feedback={feedback}
            disabled={!hasItems}
            primaryLabel={primaryActionLabel}
            secondaryLabel={secondaryActionLabel}
            loadingLabel="Procesando..."
          />

          <Accordion
            id="shipping"
            title="Información de envío"
            open={open.shipping}
            onToggle={() => setOpen((o) => ({ ...o, shipping: !o.shipping }))}
            innerRef={shippingRef}
          >
            <ShippingForm
              value={shipping}
              errors={shippingErrors}
              onChange={(patch) => setShipping((s) => ({ ...s, ...patch }))}
              onCotizar={cotizarEnvio}
              pickupEnabled={isPickup}
              onTogglePickup={handleTogglePickup}
              cotizado={isPickup || !!shippingQuote}
              quote={activeQuote}
              canQuote={canQuoteShipping}
              quoteStatus={isPickup ? "success" : quoteStatus}
              quoteMessage={quoteHelperMessage}
              onResetDraft={clearDraftSelection}
            />
          </Accordion>

          <Accordion
            id="payment"
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

          <div className="card border-0 shadow-sm mt-3">
            <div className="card-body">
              <h3 className="h6 mb-2">Archivos adicionales</h3>
              <p className="text-muted small mb-3">
                Podés adjuntar especificaciones, planos o referencias (PDF, ZIP o imágenes). Máximo 25 MB por archivo.
              </p>
              <input
                type="file"
                multiple
                className="form-control form-control-sm"
                accept=".pdf,.png,.jpg,.jpeg,.zip,.stl"
                onChange={handleAttachmentChange}
              />
              {uploadError && <div className="text-danger small mt-2">{uploadError}</div>}
              {attachments.length > 0 && (
                <ul className="list-unstyled mt-2 mb-0 attachments-list">
                  {attachments.map((file) => (
                    <li key={file.name} className="d-flex justify-content-between small">
                      <span>{file.name}</span>
                      <span className="text-muted">{(file.size / (1024 * 1024)).toFixed(1)} MB</span>
                    </li>
                  ))}
                </ul>
              )}
              {submittingOrder && (attachments.length > 0 || uploadProgress > 0) && (
                <div className="progress mt-3" style={{ height: 6 }}>
                  <div
                    className="progress-bar bg-success"
                    role="progressbar"
                    style={{ width: `${uploadProgress}%` }}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={uploadProgress}
                  />
                </div>
              )}
            </div>
          </div>
          {orderError && <div className="alert alert-danger mt-3 mb-0 py-2">{orderError}</div>}
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
          {formatPrice(item.price * item.qty)}
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
            <span className="mini-item__price">{formatPrice(it.price * it.qty)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Resumen({
  subtotal,
  envio,
  envioLabel,
  total,
  eta,
  onFinalizar,
  onPayWithoutPay,
  loading,
  disabled,
  feedback,
  primaryLabel = "Finalizar compra",
  secondaryLabel = "Coordinar sin pagar",
  loadingLabel = "Procesando...",
}) {
  const resolveEnvioValue = () => {
    if (envioLabel) return envioLabel;
    if (typeof envio === "number") return formatPrice(envio);
    if (envio == null) return "—";
    return envio;
  };
  return (
    <div className="cart-card cart-summary">
      <h3 className="cart-card__title">Resumen</h3>
      <Row label="Subtotal" value={formatPrice(subtotal)} />
      <Row label="Envío" value={resolveEnvioValue()} />
      <hr />
      <Row
        label={<span className="cart-summary__total">Total</span>}
        value={<span className="cart-summary__total">{formatPrice(total)}</span>}
      />
      {eta && <p className="cart-summary__eta">Llega aprox.: {eta}</p>}
      <button
        onClick={onFinalizar}
        disabled={disabled || loading}
        className="btn btn-primary cart-summary__cta"
        title={disabled ? "Agregá productos al carrito para continuar" : undefined}
      >
        {loading ? loadingLabel : primaryLabel}
      </button>
      {onPayWithoutPay && (
        <button
          type="button"
          onClick={onPayWithoutPay}
          disabled={disabled || loading}
          className="btn btn-outline-success cart-summary__cta"
        >
          {loading ? loadingLabel : secondaryLabel}
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

function CheckoutSteps({ steps }) {
  if (!steps?.length) return null;
  return (
    <nav className="checkout-steps" aria-label="Progreso de checkout">
      <ol className="checkout-steps__list">
        {steps.map((step, index) => {
          const statusClass = step.status ? ` checkout-steps__item--${step.status}` : "";
          const ariaCurrent =
            step.status === "current" || step.status === "processing" ? "step" : undefined;
          const displayIndex = step.status === "complete" ? "✓" : index + 1;
          return (
            <li
              key={step.id || step.label}
              className={`checkout-steps__item${statusClass}`}
              aria-current={ariaCurrent}
            >
              <span className="checkout-steps__index" aria-hidden="true">
                {displayIndex}
              </span>
              <div className="checkout-steps__body">
                <span className="checkout-steps__label">{step.label}</span>
                {step.description && (
                  <span className="checkout-steps__description">{step.description}</span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function Accordion({ id, title, open, onToggle, children, innerRef }) {
  const contentId = id ? `${id}-content` : undefined;
  const triggerId = id ? `${id}-trigger` : undefined;
  return (
    <div ref={innerRef} className={`cart-accordion${open ? " is-open" : ""}`}>
      <button
        type="button"
        onClick={onToggle}
        className="cart-accordion__trigger"
        aria-expanded={open}
        aria-controls={contentId}
        id={triggerId}
      >
        <span>{title}</span>
        <span className="cart-accordion__icon" aria-hidden="true">
          ▾
        </span>
      </button>
      <div
        className="cart-accordion__content"
        id={contentId}
        role="region"
        aria-labelledby={triggerId}
        aria-hidden={!open}
      >
        <div className="cart-accordion__body">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, error, children }) {
  const fieldId = useId();
  const controlId = React.isValidElement(children) && children.props.id ? children.props.id : `${fieldId}-input`;
  const describedBy = error ? `${fieldId}-error` : undefined;
  const control = React.isValidElement(children)
    ? React.cloneElement(children, {
        id: controlId,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": [children.props?.["aria-describedby"], describedBy]
          .filter(Boolean)
          .join(" ") || undefined,
      })
    : children;
  return (
    <div className={`cart-field${error ? " cart-field--error" : ""}`}>
      <label className="cart-field__label" htmlFor={controlId}>
        {label}
      </label>
      {control}
      {error && (
        <div id={describedBy} className="cart-field__error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

function ShippingForm({
  value,
  errors,
  onChange,
  onCotizar,
  pickupEnabled = false,
  onTogglePickup,
  cotizado,
  quote,
  canQuote,
  quoteStatus,
  quoteMessage,
  onResetDraft,
}) {
  const provider = value.provider || DEFAULT_PROVIDER;
  const providerLabel = getProviderLabel(provider);
  const providerOptions = [
    { value: SHIPPING_PROVIDERS.ANDREANI, label: "Andreani" },
    { value: SHIPPING_PROVIDERS.CORREO_ARGENTINO, label: "Correo Argentino" },
  ];
  const allowSucursal = provider === SHIPPING_PROVIDERS.ANDREANI;

  const handleProviderChange = (nextProvider) => {
    onChange({
      provider: nextProvider,
      tipo: nextProvider === SHIPPING_PROVIDERS.ANDREANI ? value.tipo : "domicilio",
      sucursalAndreani:
        nextProvider === SHIPPING_PROVIDERS.ANDREANI ? value.sucursalAndreani : "",
    });
  };

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
      provider: DEFAULT_PROVIDER,
    });
    onResetDraft?.();
  };

  const radioClass = (tipo) =>
    `cart-radio-pill${value.tipo === tipo ? " is-active" : ""}`;
  const isLoadingQuote = quoteStatus === "loading";
  const buttonLabel = isLoadingQuote
    ? "Cotizando..."
    : cotizado
      ? "Recalcular envío"
      : `Calcular envío con ${providerLabel}`;

  const pickupButtonLabel = pickupEnabled
    ? "Quiero envío a domicilio"
    : "Retirar en el taller sin costo";

  return (
    <>
      <div className="cart-pickup-toggle">
        <div>
          <p className="cart-note mb-1">¿Preferís retirar tu pedido en persona?</p>
          <p className="cart-note mb-0">Activalo para saltar la dirección y coordinar el retiro.</p>
        </div>
        <button
          type="button"
          className={`btn btn-sm ${pickupEnabled ? "btn-outline-secondary" : "btn-outline-success"}`}
          onClick={onTogglePickup}
        >
          {pickupButtonLabel}
        </button>
      </div>
      {pickupEnabled && (
        <div className="alert alert-success cart-pickup-alert py-2 px-3">
          <p className="mb-0 small">
            Coordinamos el retiro en nuestra planta de Mendoza. No necesitamos tu dirección.
          </p>
        </div>
      )}

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

      <Field label="DNI" error={errors.dni}>
        <input
          value={value.dni}
          onChange={(e) => onChange({ dni: e.target.value })}
          className="form-control cart-input"
        />
      </Field>

      {!pickupEnabled && (
        <>
          <div className="cart-form-two">
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

          <Field label="Operador de envío" error={errors.provider}>
            <select
              className="form-select cart-input"
              value={provider}
              onChange={(event) => handleProviderChange(event.target.value)}
            >
              {providerOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

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
                disabled={!allowSucursal}
              />
              Retiro en sucursal {providerLabel}
            </label>
            {!allowSucursal && (
              <p className="cart-note mb-0">Disponible solo para Andreani.</p>
            )}
          </div>

          {value.tipo === "domicilio" || !allowSucursal ? (
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
            <Field label={`Sucursal ${providerLabel}`} error={errors.sucursalAndreani}>
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
              disabled={!canQuote || isLoadingQuote}
              data-testid="shipping-quote-button"
            >
              {buttonLabel}
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
      )}

      {cotizado && quote && (
        <div className="cart-quote" aria-live="polite">
          <span className="cart-quote__price">{formatPrice(quote.precio)}</span>
          {quote.eta && <span className="cart-quote__eta">{quote.eta}</span>}
          {quote.simulado && <span className="cart-quote__badge">Estimado</span>}
          <span className="cart-quote__provider">
            Servicio: {getProviderLabel(quote.provider || provider)}
          </span>
          {quote.metadata?.chargeableKg && (
            <span className="cart-quote__meta">
              Peso facturable: {quote.metadata.chargeableKg} kg
            </span>
          )}
        </div>
      )}
      {quoteMessage && <p className="cart-note mt-2" role="status">{quoteMessage}</p>}
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
