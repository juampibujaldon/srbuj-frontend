import ProductCard from "../components/ProductCard";
import { useProducts } from "../hooks/useProducts";

export default function Productos({ addToCart }) {
  const { items, loading, error } = useProducts();

  return (
    <section className="container my-5">
      <h2 className="mb-4">Catálogo de Productos</h2>
      {loading && <p>Cargando productos...</p>}
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="row g-3">
        {!loading && !error && items.length === 0 && (
          <p className="text-muted">No hay productos disponibles.</p>
        )}
        {items.map((it) => (
          <div key={it.id} className="col-12 col-sm-6 col-lg-4">
            <ProductCard item={it} onAdd={addToCart} />
          </div>
        ))}
      </div>
    </section>
  );
}
