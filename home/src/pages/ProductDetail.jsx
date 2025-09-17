 import { useParams, Link, useNavigate } from "react-router-dom";
 import items from "../data/items";
 import React, { useMemo, useState } from "react";

 const ARS = (n) =>
   `AR$ ${Number(n || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;

 export default function ProductDetail({ addToCart }) {
   const { id } = useParams();
   const navigate = useNavigate();
   const [qty, setQty] = useState(1);

   const product = useMemo(
     () => items.find((p) => p.id === Number(id)),
     [id]
   );

   const related = useMemo(
     () => items.filter((p) => p.id !== Number(id)).slice(0, 3),
     [id]
   );

   if (!product) {
     return (
       <section className="container my-5">
         <div className="alert alert-warning">
           Producto no encontrado.{" "}
           <Link className="alert-link" to="/productos">
             Volver al catálogo
           </Link>
         </div>
       </section>
     );
   }

   const handleAdd = () => {
     for (let i = 0; i < qty; i++) addToCart?.(product);
   };

   return (
     <section className="container my-5">
       {/* migas */}
       <nav aria-label="breadcrumb" className="mb-3">
         <ol className="breadcrumb mb-0">
           <li className="breadcrumb-item">
             <Link to="/">Inicio</Link>
           </li>
           <li className="breadcrumb-item">
             <Link to="/productos">Productos</Link>
           </li>
           <li className="breadcrumb-item active" aria-current="page">
             {product.title}
           </li>
         </ol>
       </nav>

       <div className="row g-4">
         {/* Imagen */}
         <div className="col-12 col-lg-6">
           <div className="card border-0 shadow-sm h-100">
             <img
               src={product.img}
               alt={product.title}
               className="img-fluid rounded-top"
               style={{ objectFit: "cover", width: "100%", aspectRatio: "1 / 1" }}
               onError={(e) => (e.currentTarget.style.opacity = 0.2)}
             />
           </div>
         </div>

         {/* Info */}
         <div className="col-12 col-lg-6">
           <div className="card border-0 shadow-sm h-100">
             <div className="card-body">
               <h1 className="h3 mb-2">{product.title}</h1>
               <div className="text-muted mb-3">por {product.author || "SrBuj"}</div>

               <div className="d-flex align-items-center gap-2 mb-3">
                 <span className="badge text-bg-primary">3D Print</span>
                 <span className="badge text-bg-light">Personalizable</span>
                 <span className="badge text-bg-success">Stock</span>
               </div>

               {product.price ? (
                 <div className="h4 mb-3">{ARS(product.price)}</div>
               ) : (
                 <div className="h5 text-warning mb-3">Precio a consultar</div>
               )}

               <p className="mb-3">
                 {product.desc ||
                   "Producto impreso en 3D con materiales de alta calidad. Ideal para regalo o uso diario."}
               </p>

               {/* Selector cantidad */}
               <div className="d-flex align-items-center gap-2 mb-3">
                 <label className="form-label m-0 me-2">Cantidad</label>
                 <div className="input-group" style={{ width: 140 }}>
                   <button
                     className="btn btn-outline-secondary"
                     type="button"
                     onClick={() => setQty((q) => Math.max(1, q - 1))}
                   >
                     −
                   </button>
                   <input
                     type="number"
                     className="form-control text-center"
                     min="1"
                     value={qty}
                     onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                   />
                   <button
                     className="btn btn-outline-secondary"
                     type="button"
                     onClick={() => setQty((q) => q + 1)}
                   >
                     +
                   </button>
                 </div>
               </div>

               <div className="d-flex flex-wrap gap-2">
                 <button className="btn btn-primary" type="button" onClick={handleAdd}>
                   🛒 Agregar
                 </button>
                 <button className="btn btn-outline-secondary" type="button" onClick={() => navigate(-1)}>
                   Volver
                 </button>
               </div>

               {/* Acordeones */}
               <div className="accordion mt-4" id="productInfo">
                 <div className="accordion-item">
                   <h2 className="accordion-header" id="specsHead">
                     <button
                       className="accordion-button"
                       type="button"
                       data-bs-toggle="collapse"
                       data-bs-target="#specs"
                       aria-expanded="true"
                       aria-controls="specs"
                     >
                       Especificaciones
                     </button>
                   </h2>
                   <div id="specs" className="accordion-collapse collapse show" data-bs-parent="#productInfo">
                     <div className="accordion-body">
                       <ul className="mb-0">
                         <li>Material: PLA/PETG premium</li>
                         <li>Tiempo de producción: 3–5 días hábiles</li>
                         <li>Color: a elección</li>
                       </ul>
                     </div>
                   </div>
                 </div>

                 <div className="accordion-item">
                   <h2 className="accordion-header" id="shipHead">
                     <button
                       className="accordion-button collapsed"
                       type="button"
                       data-bs-toggle="collapse"
                       data-bs-target="#ship"
                       aria-expanded="false"
                       aria-controls="ship"
                     >
                       Envío y devoluciones
                     </button>
                   </h2>
                   <div id="ship" className="accordion-collapse collapse" data-bs-parent="#productInfo">
                     <div className="accordion-body">
                       Envíos a todo el país. Embalaje seguro. Devoluciones dentro de 7 días si el
                       producto llega dañado.
                     </div>
                   </div>
                 </div>
               </div>
             </div>
           </div>
         </div>
       </div>      

       {/* Relacionados */}
       <div className="mt-5">
         <h3 className="h5 mb-3">También te puede interesar</h3>
         <div className="row g-3">
           {related.map((r) => (
             <div key={r.id} className="col-12 col-sm-6 col-lg-4">
               <div className="card h-100 border-0 shadow-sm">
                 <img
                   src={r.img}
                   alt={r.title}
                   className="card-img-top"
                   style={{ objectFit: "cover", aspectRatio: "4 / 3" }}
                 />
                 <div className="card-body">
                   <h6 className="card-title mb-1 text-truncate">{r.title}</h6>
                   <div className="text-muted small mb-2">por {r.author || "SrBuj"}</div>
                   {r.price && <div className="fw-semibold mb-2">{ARS(r.price)}</div>}
                   <Link to={`/producto/${r.id}`} className="btn btn-sm btn-outline-primary">
                     Ver
                   </Link>
                 </div>
               </div>
             </div>
           ))}
         </div>
       </div>
     </section>
   );
 }
