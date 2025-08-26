export default function Carrito({ cart, removeFromCart }) {
  return (
    <section className="container my-5">
      <h2 className="mb-4">Tu Carrito</h2>
      {cart.length === 0 ? (
        <p>No hay productos en el carrito.</p>
      ) : (
        <ul className="list-group">
          {cart.map((it, idx) => (
            <li key={idx} className="list-group-item d-flex justify-content-between align-items-center">
              {it.title}
              <button
                className="btn btn-sm btn-danger"
                onClick={() => removeFromCart(it.id)}
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
