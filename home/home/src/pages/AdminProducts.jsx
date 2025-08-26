import React, { useState } from "react";
import itemsSeed from "../data/items";                
import { loadItems, saveItems } from "../data/itemsStore"; 

const fmtARS = (n) =>
  n == null || n === ""
    ? ""
    : `AR$ ${Number(n).toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;

export default function AdminProducts() {
  const [products, setProducts] = useState(() => loadItems(itemsSeed));

  const [form, setForm] = useState({
    title: "",
    author: "SrBuj",
    img: "",
    price: "",
  });

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    author: "SrBuj",
    img: "",
    price: "",
  });

  const persist = (next) => {
    setProducts(next);
    saveItems(next); 
  };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.img.trim()) {
      alert("Título e imagen son obligatorios.");
      return;
    }
    const price =
      form.price === "" || form.price == null ? undefined : Number(form.price);

    const newProduct = {
      id: Date.now(),
      title: form.title.trim(),
      author: (form.author || "SrBuj").trim(),
      img: form.img.trim(),
      price,
      likes: 0,
      downloads: 0,
    };

    persist([...products, newProduct]);
    setForm({ title: "", author: "SrBuj", img: "", price: "" });
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    setEditForm({
      title: p.title || "",
      author: p.author || "SrBuj",
      img: p.img || "",
      price: p.price == null ? "" : String(p.price),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ title: "", author: "SrBuj", img: "", price: "" });
  };

  const saveEdit = () => {
    if (!editForm.title.trim() || !editForm.img.trim()) {
      alert("Título e imagen son obligatorios.");
      return;
    }
    const price =
      editForm.price === "" || editForm.price == null
        ? undefined
        : Number(editForm.price);

    const next = products.map((p) =>
      p.id === editingId
        ? {
            ...p,
            title: editForm.title.trim(),
            author: (editForm.author || "SrBuj").trim(),
            img: editForm.img.trim(),
            price,
          }
        : p
    );
    persist(next);
    cancelEdit();
  };

  const handleDelete = (id) => {
    if (!window.confirm("¿Seguro que querés borrar este producto?")) return;
    persist(products.filter((p) => p.id !== id));
  };

  return (
    <section className="container my-5">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h1 className="h4 m-0">Gestionar Productos</h1>
      </div>

      {/* Agregar producto */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <h5 className="card-title mb-3">Agregar producto</h5>
          <form className="row g-2" onSubmit={handleAdd}>
            <div className="col-12 col-md-3">
              <input
                className="form-control"
                placeholder="Título *"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="col-12 col-md-2">
              <input
                className="form-control"
                placeholder="Autor"
                value={form.author}
                onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
              />
            </div>
            <div className="col-12 col-md-4">
              <input
                className="form-control"
                placeholder="URL de imagen *"
                value={form.img}
                onChange={(e) => setForm((f) => ({ ...f, img: e.target.value }))}
              />
            </div>
            <div className="col-6 col-md-2">
              <input
                type="number"
                className="form-control"
                placeholder="Precio (opcional)"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              />
            </div>
            <div className="col-6 col-md-1 d-grid">
              <button className="btn btn-success" type="submit">
                Agregar
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Listado */}
      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <h5 className="card-title mb-3">Listado</h5>

          <div className="table-responsive">
            <table className="table align-middle table-hover">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 80 }}>Img</th>
                  <th>Título</th>
                  <th>Autor</th>
                  <th>Precio</th>
                  <th style={{ width: 220 }}></th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <img
                        src={p.img}
                        alt={p.title}
                        className="img-fluid rounded"
                        style={{ maxHeight: 56, objectFit: "cover" }}
                      />
                    </td>

                    {editingId === p.id ? (
                      <>
                        <td>
                          <input
                            className="form-control form-control-sm"
                            value={editForm.title}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, title: e.target.value }))
                            }
                          />
                        </td>
                        <td>
                          <input
                            className="form-control form-control-sm"
                            value={editForm.author}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, author: e.target.value }))
                            }
                          />
                        </td>
                        <td style={{ maxWidth: 140 }}>
                          <input
                            className="form-control form-control-sm"
                            placeholder="Precio"
                            value={editForm.price}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, price: e.target.value }))
                            }
                          />
                        </td>
                        <td className="text-end">
                          <div className="btn-group btn-group-sm">
                            <button type="button" className="btn btn-primary" onClick={saveEdit}>
                              Guardar
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-secondary"
                              onClick={cancelEdit}
                            >
                              Cancelar
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{p.title}</td>
                        <td className="text-muted">{p.author || "SrBuj"}</td>
                        <td>
                          {p.price ? fmtARS(p.price) : <span className="text-warning">A consultar</span>}
                        </td>
                        <td className="text-end">
                          <div className="btn-group btn-group-sm">
                            <button
                              type="button"
                              className="btn btn-outline-primary"
                              onClick={() => startEdit(p)}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-danger"
                              onClick={() => handleDelete(p.id)}
                            >
                              Borrar
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}

                {!products.length && (
                  <tr>
                    <td colSpan="5" className="text-center text-muted py-4">
                      No hay productos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
