// src/pages/Productos.js
import ProductCard from "../components/ProductCard";

const items = [
  { id: 1, title: "Llavero Personalizado", author: "SrBuj", img: "https://picsum.photos/seed/key/600/400", likes: 120, downloads: 340 },
  { id: 2, title: "Mate Hogwarts", author: "SrBuj", img: "https://picsum.photos/seed/mate/600/400", likes: 210, downloads: 530 },
  { id: 3, title: "Mini Figura", author: "SrBuj", img: "https://picsum.photos/seed/mini/600/400", likes: 89, downloads: 190 },
  { id: 4, title: "Soporte Celular", author: "SrBuj", img: "https://picsum.photos/seed/stand/600/400", likes: 56, downloads: 145 },
  { id: 5, title: "Organizador Cable", author: "SrBuj", img: "https://picsum.photos/seed/cable/600/400", likes: 132, downloads: 402 },
  { id: 6, title: "Pin Carpincho", author: "SrBuj", img: "https://picsum.photos/seed/capy/600/400", likes: 310, downloads: 890 },
];

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
