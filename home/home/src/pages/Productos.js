import ProductCard from "../components/ProductCard";
import items from "../data/items";

export default function Productos({ addToCart }) {
  return (
    <section className="container my-5">
      <h2 className="mb-4">Catálogo de Productos</h2>
      <div className="row g-3">
        {items.map((it) => (
          <div key={it.id} className="col-12 col-sm-6 col-lg-4">
            <ProductCard item={it} addToCart={addToCart} />
          </div>
        ))}
      </div>
    </section>
  );
}
