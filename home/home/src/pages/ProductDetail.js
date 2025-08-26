import { useParams, Link } from "react-router-dom";
import items from "../data/items";

export default function ProductDetail({ addToCart }) {
  const { id } = useParams();
  const product = items.find((p) => p.id === Number(id));

  if (!product) {
    return (
      <section className="container my-5">
        <h2 className="mb-3">Producto no encontrado</h2>
        <Link to="/productos" className="btn btn-secondary">Volver al catálogo</Link>
      </section>
    );
  }

  return (
    <section className="container my-5">
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><Link to="/">Inicio</Link></li>
          <li className="breadcrumb-item"><Link to="/productos">Productos</Link></li>
          <li className="breadcrumb-item active" aria-current="page">{product.title}</li>
        </ol>
      </nav>

      <div className="row g-4">
        <div className="col-12 col-md-6">
          <img src={product.img} alt={product.title} className="img-fluid rounded shadow-sm" />
        </div>
        <div className="col-12 col-md-6">
          <h1 className="h3">{product.title}</h1>
          <p className="text-secondary mb-2">por {product.author}</p>
          <div className="d-flex gap-3 small text-secondary my-2">
            <span>👍 {product.likes}</span>
            <span>⬇ {product.downloads}</span>
          </div>
          {product.price && <h2 className="h4 my-3">AR$ {product.price.toLocaleString("es-AR")}</h2>}
          {product.desc && <p className="mb-4">{product.desc}</p>}
          <div className="d-flex gap-2">
            <button className="btn btn-primary" onClick={() => addToCart?.(product)}>🛒 Agregar al carrito</button>
            <Link to="/productos" className="btn btn-outline-secondary">Volver</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
