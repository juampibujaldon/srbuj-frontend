// src/components/ProductCard.js
export default function ProductCard({ item, addToCart }) {
  return (
    <div className="card card-product h-100">
      <div className="position-relative">
        <img src={item.img} alt={item.title} className="card-img-top object-cover" />
      </div>
      <div className="card-body">
        <h5 className="card-title mb-1 text-truncate">{item.title}</h5>
        <div className="text-secondary small mb-2">por {item.author}</div>
        <div className="d-flex gap-2">
          <button className="btn btn-primary btn-sm flex-grow-1" onClick={() => addToCart?.(item)}>
            🛒 Agregar
          </button>
          <button className="btn btn-outline-secondary btn-sm">Ver</button>
        </div>
      </div>
    </div>
  );
}
