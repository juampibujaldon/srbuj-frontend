// src/pages/Home.js
import ProductCard from "../components/ProductCard";

const items = [
  { id: 1, title: "Llavero Personalizado", author: "SrBuj", img: "https://picsum.photos/seed/key/600/400", likes: 120, downloads: 340 },
  { id: 2, title: "Mate Hogwarts", author: "SrBuj", img: "https://picsum.photos/seed/mate/600/400", likes: 210, downloads: 530 },
  { id: 3, title: "Mini Figura", author: "SrBuj", img: "https://picsum.photos/seed/mini/600/400", likes: 89, downloads: 190 },
  { id: 4, title: "Soporte Celular", author: "SrBuj", img: "https://picsum.photos/seed/stand/600/400", likes: 56, downloads: 145 },
  { id: 5, title: "Organizador Cable", author: "SrBuj", img: "https://picsum.photos/seed/cable/600/400", likes: 132, downloads: 402 },
  { id: 6, title: "Pin Carpincho", author: "SrBuj", img: "https://picsum.photos/seed/capy/600/400", likes: 310, downloads: 890 },
];

export default function Home({ addToCart }) {
  return (
    <>
      <header className="hero d-flex align-items-center text-center">
        <div className="container py-5">
          <h1 className="display-4 fw-bold mb-3">Impresiones 3D Personalizadas</h1>
          <p className="lead mb-4">Llaveros, mates, mini figuras y piezas técnicas hechas a tu medida.</p>
          <div className="d-flex gap-2 justify-content-center mb-4 flex-wrap">
            <span className="badge badge-soft">Modelado a medida</span>
            <span className="badge badge-soft">PETG / PLA Premium</span>
            <span className="badge badge-soft">Envíos a todo el país</span>
          </div>
        </div>
      </header>

      <section className="container my-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="h4 m-0">Tendencias</h2>
        </div>

        <div className="row g-3">
          {items.slice(0, 6).map((it) => (
            <div key={it.id} className="col-12 col-sm-6 col-lg-4">
              <ProductCard item={it} addToCart={addToCart} />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
