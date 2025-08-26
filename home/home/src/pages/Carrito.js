 import React, { useMemo } from "react";
 import { Link } from "react-router-dom";

 const formatARS = (n) =>
   `AR$ ${Number(n || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;

 export default function Carrito({ cart = [], removeFromCart }) {
    // Agrupar productos por id para mostrar cantidad
   const lineas = useMemo(() => {
     const map = new Map();
     for (const it of cart) {
       const key = it.id;
       if (!map.has(key)) map.set(key, { ...it, qty: 0 });
       map.get(key).qty += 1;
     }
     return Array.from(map.values());
   }, [cart]);

   const totals = useMemo(() => {
     const items = lineas.reduce((acc, it) => acc + it.qty, 0);
     const subtotal = lineas.reduce((acc, it) => acc + (it.price || 0) * it.qty, 0);
     const envio = subtotal > 0 ? 1500 : 0;  //ejemplo
     const total = subtotal + envio;
     return { items, subtotal, envio, total };
   }, [lineas]);

   if (!cart.length) {
     return (
       <section className="container my-5">
         <div className="row justify-content-center">
           <div className="col-lg-8">
             <div className="card border-0 shadow-sm">
               <div className="card-body text-center py-5">
                 <div className="display-6 mb-3">🛒</div>
                 <h3 className="fw-bold mb-2">Tu carrito está vacío</h3>
                 <p className="text-muted mb-4">Agregá productos para verlos acá.</p>
                 <Link to="/productos" className="btn btn-primary btn-lg">
                   Ver catálogo
                 </Link>
               </div>
             </div>
           </div>
         </div>
       </section>
     );
   }

   return (
     <section className="container my-5">
       <div className="row g-4">
         {/* Lista de productos */}
         <div className="col-12 col-lg-8">
           <div className="card border-0 shadow-sm">
             <div className="card-header bg-white py-3">
               <h5 className="m-0">Carrito ({totals.items} {totals.items === 1 ? "item" : "items"})</h5>
             </div>

             <div className="list-group list-group-flush">
               {lineas.map((it) => (
                 <div key={it.id} className="list-group-item">
                   <div className="row g-3 align-items-center">
                     <div className="col-3 col-md-2">
                       <img
                         src={it.img}
                         alt={it.title}
                         className="img-fluid rounded"
                         style={{ objectFit: "cover", aspectRatio: "1 / 1" }}
                       />
                     </div>

                     <div className="col-9 col-md-6">
                       <h6 className="mb-1">{it.title}</h6>
                       <p className="text-muted small mb-1">por {it.author || "SrBuj"}</p>
                       <div className="text-muted small">
                         Cantidad: <span className="badge text-bg-light">{it.qty}</span>
                       </div>
                     </div>

                     <div className="col-12 col-md-4 text-md-end">
                       <div className="mb-2">
                         <div className="fw-bold">{formatARS((it.price || 0) * it.qty)}</div>
                         {it.price ? (
                           <div className="text-muted small">
                             {formatARS(it.price)} c/u
                           </div>
                         ) : (
                           <div className="text-warning small">Precio a confirmar</div>
                         )}
                       </div>

                       <button
                         type="button"
                         className="btn btn-outline-danger btn-sm"
                         onClick={() => removeFromCart?.(it.id)}
                         title="Quitar producto"
                       >
                         Quitar
                       </button>
                     </div>
                   </div>
                 </div>
               ))}
             </div>

             <div className="card-body d-flex justify-content-between">
               <Link to="/productos" className="btn btn-outline-secondary">
                 ← Seguir comprando
               </Link>
             </div>
           </div>
         </div>

         {/* Resumen */}
         <div className="col-12 col-lg-4">
           <div className="card border-0 shadow-sm">
             <div className="card-header bg-white py-3">
               <h6 className="m-0">Resumen de compra</h6>
             </div>
             <div className="card-body">
               <div className="d-flex justify-content-between mb-2">
                 <span className="text-muted">Subtotal</span>
                 <strong>{formatARS(totals.subtotal)}</strong>
               </div>
               <div className="d-flex justify-content-between mb-2">
                 <span className="text-muted">Envío</span>
                 <strong>{totals.envio ? formatARS(totals.envio) : "Gratis"}</strong>
               </div>
               <hr />
               <div className="d-flex justify-content-between mb-3">
                 <span className="fw-bold">Total</span>
                 <span className="h5 m-0">{formatARS(totals.total)}</span>
               </div>

               <button type="button" className="btn btn-primary w-100 btn-lg">
                 Finalizar compra
               </button>

               <p className="text-muted small mt-3 mb-0">
                 * Al continuar aceptarás los términos y condiciones de SrBuj 3D.
               </p>
             </div>
           </div>

           {/* Acordeón info adicional */}
           <div className="accordion mt-3" id="cartInfo">
             <div className="accordion-item">
               <h2 className="accordion-header" id="envioHeading">
                 <button
                   className="accordion-button collapsed"
                   type="button"
                   data-bs-toggle="collapse"
                   data-bs-target="#envio"
                   aria-expanded="false"
                   aria-controls="envio"
                 >
                   Información de envío
                 </button>
               </h2>
               <div id="envio" className="accordion-collapse collapse" data-bs-parent="#cartInfo">
                 <div className="accordion-body">
                   Envíos a todo el país. Tiempo de producción: 3–5 días hábiles.
                 </div>
               </div>
             </div>

             <div className="accordion-item">
               <h2 className="accordion-header" id="pagoHeading">
                 <button
                   className="accordion-button collapsed"
                   type="button"
                   data-bs-toggle="collapse"
                   data-bs-target="#pago"
                   aria-expanded="false"
                   aria-controls="pago"
                 >
                   Medios de pago
                 </button>
               </h2>
               <div id="pago" className="accordion-collapse collapse" data-bs-parent="#cartInfo">
                 <div className="accordion-body">
                   Transferencia bancaria, débito y crédito. Consultá por cuotas.
                 </div>
               </div>
             </div>
           </div>
         </div>
       </div>
     </section>
   );
 }
