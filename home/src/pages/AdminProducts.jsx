import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
};

const TAG_OPTIONS = [
  { value: "", label: "Sin etiqueta destacada" },
  { value: "Nuevo", label: "Nuevo" },
  { value: "Destacado", label: "Destacado" },
  { value: "Edición limitada", label: "Edición limitada" },
  { value: "Más pedido", label: "Más pedido" },
  { value: "Colección especial", label: "Colección especial" },
];

const createEmptyForm = () => ({
  nombre: "",
  autor: "SrBuj",
  imagen_url: "",
  imagenFile: null,
  galleryFiles: [],
  galleryUrls: "",
  replaceGallery: false,
  originalImagenUrl: "",
  precio: "",
  stock: "0",
  descripcion: "",
  categoria: "General",
  etiqueta: "",
  mostrar_inicio: true,
});

const buildProductFormData = (data, { clearGallery = false } = {}) => {
  const formData = new FormData();

  const append = (key, value) => {
    if (value === undefined || value === null) return;
    formData.append(key, value);
  };

  append("nombre", data.nombre?.trim() ?? "");
  append("autor", data.autor ?? "");
  append("descripcion", data.descripcion ?? "");
  append("categoria", data.categoria ?? "");
  append("etiqueta", data.etiqueta?.trim() ?? "");

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

  if (Array.isArray(data.galleryFiles)) {
    data.galleryFiles.forEach((file) => {
      if (file) formData.append("gallery", file);
    });
  }

  if (typeof data.galleryUrls === "string" && data.galleryUrls.trim()) {
    data.galleryUrls
      .split(/\n|,/)
      .map((entry) => entry.trim())
      .filter(Boolean)
      .forEach((url) => formData.append("gallery_urls", url));
  }

  if (clearGallery) {
    append("clear_gallery", "true");
  }

  return formData;
};

const resolveProductImage = (product) => {
  const gallery = Array.isArray(product?.gallery) ? product.gallery : [];
  if (gallery.length > 0) {
    return gallery[0];
  }
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
  const navigate = useNavigate();
  const cameFromDashboardRef = useRef(false);
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
      setProducts(Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : data?.results || []);
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
      cameFromDashboardRef.current = true;
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
  event.target.value = "";
  setter((prev) => ({
    ...prev,
    imagenFile: file || null,
    imagen_url: file ? "" : prev.imagen_url,
    galleryFiles: prev.galleryFiles || [],
  }));
};

const handleGalleryFilesChange = (setter) => (event) => {
  const files = Array.from(event.target.files || []);
  event.target.value = "";
  setter((prev) => ({
    ...prev,
    galleryFiles: files,
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

  const closeAddForm = () => {
    resetFormState();
    setShowAddForm(false);
    if (cameFromDashboardRef.current) {
      cameFromDashboardRef.current = false;
      navigate("/admin");
    }
  };

  const handleToggleAddForm = () => {
    if (showAddForm) {
      closeAddForm();
    } else {
      resetFormState();
  cancelEdit();
  setShowAddForm(true);
  cameFromDashboardRef.current = false;
  }
  };

  const onCreateChange = handleFieldChange(setForm, setFormPreview);
  const onEditChange = handleFieldChange(setEditForm, setEditPreview);
  const onCreateFileChange = handleFileChange(setForm, setFormPreview);
  const onEditFileChange = handleFileChange(setEditForm, setEditPreview);
  const onCreateGalleryFilesChange = handleGalleryFilesChange(setForm);
  const onEditGalleryFilesChange = handleGalleryFilesChange(setEditForm);

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
    const shouldClearGallery = form.galleryFiles.length > 0 || (form.galleryUrls || "").trim().length > 0;
    const payload = buildProductFormData(form, { clearGallery: shouldClearGallery });
      await createProduct(payload);
      await loadProducts();
      closeAddForm();
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
    galleryFiles: [],
    galleryUrls: "",
    replaceGallery: false,
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
      etiqueta: product.etiqueta ?? product.tag ?? "",
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
      const payload = buildProductFormData(editForm, {
        clearGallery:
          editForm.replaceGallery || editForm.galleryFiles.length > 0 || (editForm.galleryUrls || "").trim().length > 0,
      });
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
        <div className="card admin-form-card border-0 shadow-sm mb-4">
          <div className="card-body">
            <h5 className="card-title mb-3">Nuevo producto</h5>
            <form className="admin-product-form" onSubmit={handleAdd}>
              <div className="admin-product-grid">
                <section className="admin-product-panel">
                  <h6 className="admin-product-title">Datos generales</h6>
                  <div className="row g-3">
                    <div className="col-12 col-lg-6">
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
                    <div className="col-12 col-lg-6">
                      <label className="form-label">Autor</label>
                      <input
                        name="autor"
                        className="form-control"
                        placeholder="Autor o diseñador"
                        value={form.autor}
                        onChange={onCreateChange}
                      />
                    </div>
                    <div className="col-12 col-lg-6">
                      <label className="form-label">Categoría</label>
                      <input
                        name="categoria"
                        className="form-control"
                        placeholder="General, Mate, Decoración..."
                        value={form.categoria}
                        onChange={onCreateChange}
                      />
                    </div>
                    <div className="col-12 col-lg-6">
                      <label className="form-label">Etiqueta</label>
                      <select
                        name="etiqueta"
                        className="form-select"
                        value={form.etiqueta}
                        onChange={onCreateChange}
                      >
                        {TAG_OPTIONS.map((option) => (
                          <option key={option.value || "none"} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label">Descripción</label>
                      <textarea
                        name="descripcion"
                        className="form-control"
                        rows="3"
                        placeholder="Detalle del producto, materiales, dimensiones..."
                        value={form.descripcion}
                        onChange={onCreateChange}
                      />
                    </div>
                  </div>
                </section>

                <section className="admin-product-panel">
                  <h6 className="admin-product-title">Precio y visibilidad</h6>
                  <div className="row g-3 align-items-end">
                    <div className="col-12 col-md-6">
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
                    <div className="col-12 col-md-6">
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
                    <div className="col-12">
                      <button
                        type="button"
                        className={`btn admin-toggle ${form.mostrar_inicio ? "admin-toggle--active" : ""}`}
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            mostrar_inicio: !prev.mostrar_inicio,
                          }))
                        }
                      >
                        {form.mostrar_inicio ? "Se muestra en la portada" : "Oculto en la portada"}
                      </button>
                    </div>
                  </div>
                </section>

                <section className="admin-product-panel">
                  <h6 className="admin-product-title">Imágenes</h6>
                  <div className="row g-3">
                    <div className="col-12 col-lg-6">
                      <label className="form-label">Imagen principal (archivo)</label>
                      <input
                        type="file"
                        accept="image/*"
                        className="form-control"
                        onChange={onCreateFileChange}
                      />
                      <div className="form-text">Subí una foto o pegá una URL externa.</div>
                    </div>
                    <div className="col-12 col-lg-6">
                      <label className="form-label">Imagen principal (URL)</label>
                      <input
                        name="imagen_url"
                        className="form-control"
                        placeholder="https://example.com/imagen.jpg"
                        value={form.imagen_url}
                        onChange={onCreateChange}
                      />
                    </div>
                    <div className="col-12 col-lg-6">
                      <label className="form-label">Galería (archivos)</label>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="form-control"
                        onChange={onCreateGalleryFilesChange}
                      />
                      <div className="form-text">Podés sumar varias imágenes adicionales.</div>
                      {form.galleryFiles.length > 0 && (
                        <div className="small text-muted mt-2">
                          {form.galleryFiles.length} archivo{form.galleryFiles.length > 1 ? "s" : ""} seleccionado{form.galleryFiles.length > 1 ? "s" : ""}.
                        </div>
                      )}
                    </div>
                    <div className="col-12 col-lg-6">
                      <label className="form-label">Galería (URLs, una por línea)</label>
                      <textarea
                        name="galleryUrls"
                        className="form-control"
                        rows="3"
                        placeholder="https://example.com/imagen-1.jpg&#10;https://example.com/imagen-2.jpg"
                        value={form.galleryUrls}
                        onChange={onCreateChange}
                      />
                    </div>
                    {(formPreview || form.imagen_url) && (
                      <div className="col-12">
                        <div className="admin-product-preview">
                          <img
                            src={formPreview || form.imagen_url}
                            alt="Previsualización del producto"
                            className="img-fluid rounded"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              </div>

              <div className="admin-product-actions">
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  onClick={closeAddForm}
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

      <div className="card admin-surface-card border-0 shadow-sm">
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
                    <th>Etiqueta</th>
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
                                <select
                                  name="etiqueta"
                                  className="form-select form-select-sm"
                                  value={editForm.etiqueta}
                                  onChange={onEditChange}
                                >
                                  {TAG_OPTIONS.map((option) => (
                                    <option key={option.value || "none"} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
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
                                <button
                                  type="button"
                                  className={`btn btn-sm ${editForm.mostrar_inicio ? "btn-dark" : "btn-outline-dark"}`}
                                  onClick={() =>
                                    setEditForm((prev) => ({
                                      ...prev,
                                      mostrar_inicio: !prev.mostrar_inicio,
                                    }))
                                  }
                                >
                                  {editForm.mostrar_inicio ? "Se muestra" : "No se muestra"}
                                </button>
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
                              <td>{product.etiqueta || "—"}</td>
                              <td>{product.precio}</td>
                              <td>{product.stock}</td>
                              <td>
                                <span
                                  className={`badge ${
                                    product.mostrar_inicio ? "text-bg-dark" : "text-bg-secondary"
                                  }`}
                                >
                                  {product.mostrar_inicio ? "En inicio" : "Oculto"}
                                </span>
                              </td>
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
                            <td colSpan={8}>
                              <div className="row g-3 py-3 border-top">
                                <div className="col-12 col-md-6 col-xl-4">
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
                                <div className="col-12 col-md-6 col-xl-4">
                                  <label className="form-label">URL de imagen</label>
                                  <input
                                    name="imagen_url"
                                    className="form-control"
                                    placeholder="https://example.com/imagen.jpg"
                                    value={editForm.imagen_url}
                                    onChange={onEditChange}
                                  />
                                </div>
                                <div className="col-12 col-md-6 col-xl-4">
                                  <label className="form-label">Galería (archivos)</label>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="form-control"
                                    onChange={onEditGalleryFilesChange}
                                  />
                                  <div className="form-text">
                                    Subí nuevas imágenes para la galería (se reemplazan al guardar si marcás reemplazar).
                                  </div>
                                  {editForm.galleryFiles.length > 0 && (
                                    <div className="small text-muted mt-2">
                                      {editForm.galleryFiles.length} archivo{editForm.galleryFiles.length > 1 ? "s" : ""} seleccionado{editForm.galleryFiles.length > 1 ? "s" : ""}.
                                    </div>
                                  )}
                                </div>
                                <div className="col-12 col-md-6 col-xl-4">
                                  <label className="form-label">Galería (URLs)</label>
                                  <textarea
                                    name="galleryUrls"
                                    className="form-control"
                                    rows="3"
                                    placeholder="https://example.com/imagen-1.jpg&#10;https://example.com/imagen-2.jpg"
                                    value={editForm.galleryUrls}
                                    onChange={onEditChange}
                                  />
                                  <div className="form-text">
                                    Pegá enlaces (uno por línea) para sumar a la galería.
                                  </div>
                                </div>
                                <div className="col-12 col-md-6 col-xl-4 d-flex align-items-end">
                                  <button
                                    type="button"
                                    className={`btn btn-sm w-100 ${editForm.replaceGallery ? "btn-dark" : "btn-outline-dark"}`}
                                    onClick={() =>
                                      setEditForm((prev) => ({
                                        ...prev,
                                        replaceGallery: !prev.replaceGallery,
                                      }))
                                    }
                                  >
                                    {editForm.replaceGallery ? "Reemplazar galería existente" : "Conservar galería actual"}
                                  </button>
                                </div>
                                <div className="col-12 col-xl-4">
                                  <label className="form-label">Etiqueta destacada</label>
                                  <select
                                    name="etiqueta"
                                    className="form-select"
                                    value={editForm.etiqueta}
                                    onChange={onEditChange}
                                  >
                                    {TAG_OPTIONS.map((option) => (
                                      <option key={option.value || "none"} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                  <div className="form-text">
                                    Ayuda a que el producto aparezca en búsquedas y listados.
                                  </div>
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
                                {Array.isArray(product.gallery) && product.gallery.length > 0 && (
                                  <div className="col-12">
                                    <label className="form-label d-block">Galería actual</label>
                                    <div className="d-flex gap-2 flex-wrap">
                                      {product.gallery.map((url, idx) => (
                                        <img
                                          key={`${product.id}-gallery-${idx}`}
                                          src={url}
                                          alt={`${product.nombre} vista ${idx + 1}`}
                                          className="rounded border"
                                          style={{ width: 72, height: 72, objectFit: "cover" }}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                )}
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
