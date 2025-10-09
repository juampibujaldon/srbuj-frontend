import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Spinner from "../components/Spinner.jsx";
import { confirmPayment, updateOrder } from "../api/orders";

export default function PaymentStatus() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paymentId = searchParams.get("payment_id");
  const orderId = searchParams.get("order_id");
  const [status, setStatus] = useState({ loading: true, paid: false, detail: "" });

  useEffect(() => {
    if (!paymentId) {
      setStatus({ loading: false, paid: false, detail: "No recibimos el identificador de pago." });
      return;
    }

    let active = true;
    (async () => {
      try {
        const result = await confirmPayment(paymentId);
        if (!active) return;
        if (result.paid) {
          if (orderId) {
            try {
              await updateOrder(orderId, { status: "paid" });
            } catch (error) {
              console.warn("No se pudo actualizar la orden a pagada desde el front", error);
            }
          }
          setStatus({ loading: false, paid: true, detail: "Confirmamos el pago con el proveedor." });
        } else {
          setStatus({
            loading: false,
            paid: false,
            detail: "El pago todavía no figura como acreditado. Probá nuevamente en unos instantes.",
          });
        }
      } catch (error) {
        console.error("Fallo al confirmar el pago", error);
        setStatus({
          loading: false,
          paid: false,
          detail: error.message || "No pudimos consultar el estado del pago. Intentá otra vez.",
        });
      }
    })();
    return () => {
      active = false;
    };
  }, [paymentId, orderId]);

  if (status.loading) {
    return (
      <section className="container py-5 text-center">
        <Spinner />
        <p className="text-muted mt-3">Confirmando el estado del pago…</p>
      </section>
    );
  }

  return (
    <section className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-md-8 col-lg-6">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center py-5">
              <h1 className="h4 mb-3">
                {status.paid ? "¡Pago confirmado!" : "Estamos esperando la confirmación"}
              </h1>
              <p className="text-muted mb-4">{status.detail}</p>

              <div className="d-flex flex-column gap-2">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => navigate("/pedidos")}
                >
                  Ir a mis pedidos
                </button>
                {!status.paid && (
                  <Link to={`/carrito${orderId ? `?order=${orderId}` : ""}`} className="btn btn-outline-secondary">
                    Volver al carrito
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
