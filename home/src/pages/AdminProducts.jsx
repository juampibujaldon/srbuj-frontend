import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../api/products";
import { apiUrl } from "../api/client";

const numericDefaults = {
  precio: 0,
  stock: 0,
  peso_gr: 300,
};

const createEmptyForm = () => ({
  nombre: "",
  autor: "SrBuj",
  imagen_url: "",
  imagenFile: null,
  originalImagenUrl: "",
  precio: "",
  stock: "0",
  descripcion: "",
  categoria: "General",
  peso_gr: "300",
  mostrar_inicio: true,
});

const buildProductFormData = (data) => {
  const formData = new FormData();

  const append = (key, value) => {
    if (value === undefined || value === null) return;
    formData.append(key, value);
  };

  append("nombre", data.nombre?.trim() ?? "");
  append("autor", data.autor ?? "");
  append("descripcion", data.descripcion ?? "");
  append("categoria", data.categoria ?? "");

  Object.entries(numericDefaults).forEach(([key, fallback]) => {
    const raw = data[key];
    const value =
      raw === "" || raw === null || raw === undefined ? fallback : raw;
    append(key, value);
  });

  if (data.mostrar_inicio !== undefined) {
    append("mostrar_inicio", data.mostrar_inicio ? "true" : "false");
  }

  if (data.imagenFile) {
    append("imagen", data.imagenFile);
    append("imagen_url", "");
  } else if (data.imagen_url?.trim()) {
    append("imagen_url", data.imagen_url.trim());
  } else if (data.originalImagenUrl) {
    append("imagen_url", "");
  }

  return formData;
};

const resolveProductImage = (product) => {
  if (product?.imagen) {
    if (product.imagen.startsWith("http")) return product.imagen;
    if (product.imagen.startsWith("/")) return apiUrl(product.imagen);
    return apiUrl(`/media/${product.imagen}`);
  }
  if (product?.imagen_url) {
    return product.imagen_url;
  }
  return "/images/placeholder.png";
};

export default function AdminProducts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(() => createEmptyForm());
  const [formPreview, setFormPreview] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(() => createEmptyForm());
  const [editPreview, setEditPreview] = useState("");

  const loadProducts = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchProducts({ admin: true });
      setProducts(data);
    } catch (err) {
      setError(err.message || "Error al cargar productos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setShowAddForm(true);
      const next = new URLSearchParams(searchParams);
      next.delete("new");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(
    () => () => {
      if (formPreview && formPreview.startsWith("blob:")) {
        URL.revokeObjectURL(formPreview);
      }
    },
    [formPreview],
  );

  useEffect(
    () => () => {
      if (editPreview && editPreview.startsWith("blob:")) {
        URL.revokeObjectURL(editPreview);
      }
    },
    [editPreview],
  );

  const handleFieldChange = (setter, previewSetter) => (event) => {
    const { name, value } = event.target;
    if (name === "imagen_url" && previewSetter) {
      previewSetter("");
    }
    setter((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "imagen_url" ? { imagenFile: null } : {}),
    }));
  };

  const handleFileChange = (setter, previewSetter) => (event) => {
    const file = event.target.files?.[0];
    if (previewSetter) {
      previewSetter((prevUrl) => {
        if (prevUrl && prevUrl.startsWith("blob:")) {
          URL.revokeObjectURL(prevUrl);
        }
        return file ? URL.createObjectURL(file) : "";
      });
    }
    setter((prev) => ({
      ...prev,
      imagenFile: file || null,
      imagen_url: file ? "" : prev.imagen_url,
    }));
  };

  const resetFormState = () => {
    setForm(createEmptyForm());
    setFormPreview((prev) => {
      if (prev && prev.startsWith("blob:")) {
        URL.revokeObjectURL(prev);
      }
      return "";
    });
  };

  const resetEditState = () => {
    setEditForm(createEmptyForm());
    setEditPreview((prev) => {
      if (prev && prev.startsWith("blob:")) {
        URL.revokeObjectURL(prev);
      }
      return "";
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    resetEditState();
  };

  const handleToggleAddForm = () => {
    if (showAddForm) {
      resetFormState();
      setShowAddForm(false);
    } else {
      resetFormState();
      cancelEdit();
      setShowAddForm(true);
    }
  };

  const onCreateChange = handleFieldChange(setForm, setFormPreview);
  const onEditChange = handleFieldChange(setEditForm, setEditPreview);
  const onCreateFileChange = handleFileChange(setForm, setFormPreview);
  const onEditFileChange = handleFileChange(setEditForm, setEditPreview);

  const handleAdd = async (event) => {
    event.preventDefault();
    if (!form.nombre.trim()) {
      alert("El nombre es obligatorio");
      return;
    }
    if (!form.imagenFile && !form.imagen_url.trim()) {
      alert("Debes subir una imagen o indicar una URL");
      return;
    }
    setSaving(true);
    try {
      const payload = buildProductFormData(form);
      await createProduct(payload);
      resetFormState();
      setShowAddForm(false);
      await loadProducts();
    } catch (err) {
      alert(err.message || "No se pudo crear el producto");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (product) => {
    setShowAddForm(false);
    setEditPreview((prev) => {
      if (prev && prev.startsWith("blob:")) {
        URL.revokeObjectURL(prev);
      }
      return "";
    });
    setEditingId(product.id);
    setEditForm({
      nombre: product.nombre ?? "",
      autor: product.autor ?? "SrBuj",
      imagen_url: product.imagen_url?.trim() ?? "",
      imagenFile: null,
      originalImagenUrl: product.imagen_url?.trim() ?? "",
      precio:
        product.precio !== null && product.precio !== undefined
          ? String(product.precio)
          : "",
      stock:
        product.stock !== null && product.stock !== undefined
          ? String(product.stock)
          : "0",
      descripcion: product.descripcion ?? "",
      categoria: product.categoria ?? "General",
      peso_gr:
        product.peso_gr !== null && product.peso_gr !== undefined
          ? String(product.peso_gr)
          : "300",
      mostrar_inicio:
        product.mostrar_inicio !== undefined && product.mostrar_inicio !== null
          ? Boolean(product.mostrar_inicio)
          : true,
    });
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    if (!editForm.nombre.trim()) {
      alert("El nombre es obligatorio");
      return;
    }
    const existingProduct = products.find((item) => item.id === editingId);
    const hasExistingImage = existingProduct
      ? resolveProductImage(existingProduct) !== "/images/placeholder.png"
      : false;
    if (!editForm.imagenFile && !editForm.imagen_url.trim() && !hasExistingImage) {
      alert("Debes mantener o cargar una imagen");
      return;
    }
    setSaving(true);
    try {
      const payload = buildProductFormData(editForm);
      await updateProduct(editingId, payload);
      cancelEdit();
      await loadProducts();
    } catch (err) {
      alert(err.message || "No se pudo actualizar el producto");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Seguro que querés eliminar este producto?")) return;
    setSaving(true);
    try {
      await deleteProduct(id);
      await loadProducts();
    } catch (err) {
      alert(err.message || "No se pudo eliminar el producto");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="container my-5">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h1 className="h4 m-0">Gestionar Productos</h1>
        <div className="d-flex align-items-center gap-3">
          {saving && <span className="text-muted small">Guardando cambios...</span>}
          <button
            className="btn btn-primary"
            type="button"
            onClick={handleToggleAddForm}
          >
            {showAddForm ? "Cerrar formulario" : "Agregar producto"}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {showAddForm && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <h5 className="card-title mb-3">Nuevo producto</h5>
            <form className="row g-3" onSubmit={handleAdd}>
              <div className="col-12 col-md-6">
                <label className="form-label">Nombre *</label>
                <input
                  name="nombre"
                  className="form-control"
                  placeholder="Nombre del producto"
                  value={form.nombre}
                  onChange={onCreateChange}
                  required
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">Autor</label>
                <input
                  name="autor"
                  className="form-control"
                  placeholder="Autor"
                  value={form.autor}
                  onChange={onCreateChange}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">Categoría</label>
                <input
                  name="categoria"
                  className="form-control"
                  placeholder="General, Mate, Decoración..."
                  value={form.categoria}
                  onChange={onCreateChange}
                />
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label">Precio</label>
                <input
                  type="number"
                  name="precio"
                  className="form-control"
                  min="0"
                  step="0.01"
                  value={form.precio}
                  onChange={onCreateChange}
                />
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label">Stock</label>
                <input
                  type="number"
                  name="stock"
                  className="form-control"
                  min="0"
                  value={form.stock}
                  onChange={onCreateChange}
                />
              </div>
              <div className="col-12 col-md-3 d-flex align-items-end">
                <div className="form-check form-switch">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="nuevo-mostrar-inicio"
                    checked={Boolean(form.mostrar_inicio)}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        mostrar_inicio: e.target.checked,
                      }))
                    }
                  />
                  <label className="form-check-label" htmlFor="nuevo-mostrar-inicio">
                    Mostrar en inicio
                  </label>
                </div>
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label">Peso (gr)</label>
                <input
                  type="number"
                  name="peso_gr"
                  className="form-control"
                  min="0"
                  value={form.peso_gr}
                  onChange={onCreateChange}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">Imagen (archivo)</label>
                <input
                  type="file"
                  accept="image/*"
                  className="form-control"
                  onChange={onCreateFileChange}
                />
                <div className="form-text">
                  Podés subir una foto o pegar un enlace en el campo de URL.
                </div>
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">URL de imagen</label>
                <input
                  name="imagen_url"
                  className="form-control"
                  placeholder="https://example.com/imagen.jpg"
                  value={form.imagen_url}
                  onChange={onCreateChange}
                />
              </div>
              {(formPreview || form.imagen_url) && (
                <div className="col-12">
                  <label className="form-label d-block">Previsualización</label>
                  <img
                    src={formPreview || form.imagen_url}
                    alt="Previsualización del producto"
                    className="img-fluid rounded border"
                    style={{ maxHeight: 220, objectFit: "contain" }}
                  />
                </div>
              )}
              <div className="col-12">
                <label className="form-label">Descripción</label>
                <textarea
                  name="descripcion"
                  className="form-control"
                  placeholder="Detalle del producto, materiales, dimensiones..."
                  rows="3"
                  value={form.descripcion}
                  onChange={onCreateChange}
                />
              </div>
              <div className="col-12 d-flex justify-content-end gap-2">
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  onClick={() => {
                    resetFormState();
                    setShowAddForm(false);
                  }}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button className="btn btn-success" type="submit" disabled={saving}>
                  Guardar producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <h5 className="card-title mb-3">Listado</h5>
          {loading ? (
            <p>Cargando productos...</p>
          ) : products.length === 0 ? (
            <p className="text-muted">Todavía no hay productos cargados.</p>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle table-hover">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: 80 }}>Img</th>
                    <th>Nombre</th>
                    <th>Autor</th>
                    <th>Categoría</th>
                    <th>Precio</th>
                    <th>Stock</th>
                    <th>Inicio</th>
                    <th style={{ width: 220 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => {
                    const isEditing = editingId === product.id;
                    const imgSrc = resolveProductImage(product);
                    const previewSrc = isEditing
                      ? editPreview || editForm.imagen_url?.trim() || imgSrc
                      : null;

                    return (
                      <React.Fragment key={product.id}>
                        <tr>
                          <td>
                            <img
                              src={imgSrc}
                              alt={product.nombre}
                              className="img-fluid rounded"
                              style={{ maxHeight: 56, objectFit: "cover" }}
                            />
                          </td>
                          {isEditing ? (
                            <>
                              <td>
                                <input
                                  name="nombre"
                                  className="form-control form-control-sm"
                                  value={editForm.nombre}
                                  onChange={onEditChange}
                                />
                              </td>
                              <td>
                                <input
                                  name="autor"
                                  className="form-control form-control-sm"
                                  value={editForm.autor}
                                  onChange={onEditChange}
                                />
                              </td>
                              <td>
                                <input
                                  name="categoria"
                                  className="form-control form-control-sm"
                                  value={editForm.categoria}
                                  onChange={onEditChange}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  name="precio"
                                  className="form-control form-control-sm"
                                  value={editForm.precio}
                                  onChange={onEditChange}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  name="stock"
                                  className="form-control form-control-sm"
                                  value={editForm.stock}
                                  onChange={onEditChange}
                                />
                              </td>
                              <td>
                                <div className="form-check form-switch">
                                  <input
                                    type="checkbox"
                                    className="form-check-input"
                                    id={`edit-inicio-${product.id}`}
                                    checked={Boolean(editForm.mostrar_inicio)}
                                    onChange={(e) =>
                                      setEditForm((prev) => ({
                                        ...prev,
                                        mostrar_inicio: e.target.checked,
                                      }))
                                    }
                                  />
                                </div>
                              </td>
                              <td className="text-end">
                                <div className="d-flex gap-2 justify-content-end">
                                  <button
                                    className="btn btn-sm btn-success"
                                    type="button"
                                    onClick={handleUpdate}
                                    disabled={saving}
                                  >
                                    Guardar
                                  </button>
                                  <button
                                    className="btn btn-sm btn-secondary"
                                    type="button"
                                    onClick={cancelEdit}
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td>{product.nombre}</td>
                              <td>{product.autor}</td>
                              <td>{product.categoria}</td>
                              <td>{product.precio}</td>
                              <td>{product.stock}</td>
                              <td>{product.mostrar_inicio ? "Sí" : "No"}</td>
                              <td className="text-end">
                                <div className="d-flex gap-2 justify-content-end">
                                  <button
                                    className="btn btn-sm btn-outline-primary"
                                    type="button"
                                    onClick={() => startEdit(product)}
                                  >
                                    Editar
                                  </button>
                                  <button
                                    className="btn btn-sm btn-outline-danger"
                                    type="button"
                                    onClick={() => handleDelete(product.id)}
                                    disabled={saving}
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                        {isEditing && (
                          <tr>
                            <td></td>
                            <td colSpan={7}>
                              <div className="row g-3 py-3 border-top">
                                <div className="col-12 col-md-3">
                                  <label className="form-label">Peso (gr)</label>
                                  <input
                                    type="number"
                                    name="peso_gr"
                                    className="form-control"
                                    min="0"
                                    value={editForm.peso_gr}
                                    onChange={onEditChange}
                                  />
                                </div>
                                <div className="col-12 col-md-6">
                                  <label className="form-label">Imagen (archivo)</label>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="form-control"
                                    onChange={onEditFileChange}
                                  />
                                  <div className="form-text">
                                    Seleccioná una imagen nueva para reemplazar la actual.
                                  </div>
                                </div>
                                <div className="col-12 col-md-6">
                                  <label className="form-label">URL de imagen</label>
                                  <input
                                    name="imagen_url"
                                    className="form-control"
                                    placeholder="https://example.com/imagen.jpg"
                                    value={editForm.imagen_url}
                                    onChange={onEditChange}
                                  />
                                </div>
                                <div className="col-12">
                                  <label className="form-label">Descripción</label>
                                  <textarea
                                    name="descripcion"
                                    className="form-control"
                                    rows="3"
                                    value={editForm.descripcion}
                                    onChange={onEditChange}
                                  />
                                </div>
                                {previewSrc && (
                                  <div className="col-12">
                                    <label className="form-label d-block">Previsualización</label>
                                    <img
                                      src={previewSrc}
                                      alt="Previsualización"
                                      className="img-fluid rounded border"
                                      style={{ maxHeight: 220, objectFit: "contain" }}
                                    />
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
