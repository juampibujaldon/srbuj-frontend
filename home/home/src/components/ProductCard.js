import { Link } from "react-router-dom";

export default function ProductCard({ item, addToCart }) {
  return (
    <div className="card card-product h-100">
      <img src={item.img} alt={item.title} className="card-img-top object-cover" />
      <div className="card-body">
        <h5 className="card-title mb-1 text-truncate">{item.title}</h5>
        <div className="text-secondary small mb-3">por {item.author}</div>

        <div className="d-flex gap-2">
          <button
            type="button"                     // ← evita submit si hay un <form> arriba
            className="btn btn-primary btn-sm flex-grow-1"
            onClick={() => addToCart?.(item)}
          >
            🛒 Agregar
          </button>

          <Link
            to={`/producto/${item.id}`}       // ← ruta debe coincidir con App.js
            className="btn btn-outline-secondary btn-sm"
          >
            Ver
          </Link>
        </div>
      </div>
    </div>
  );
}
