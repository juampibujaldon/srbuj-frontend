import React, { useMemo, useState } from "react";
import { quoteStlModel } from "../api/customization";

const MATERIAL_OPTIONS = [
  { value: "PLA", label: "PLA (versátil)" },
  { value: "PETG", label: "PETG (resistente)" },
  { value: "ABS", label: "ABS (alta temperatura)" },
  { value: "Resina", label: "Resina (detalles finos)" },
];

const INFILL_OPTIONS = [
  { value: "20", label: "20%" },
  { value: "40", label: "40%" },
  { value: "60", label: "60%" },
  { value: "80", label: "80%" },
];

const QUALITY_OPTIONS = [
  { value: "draft", label: "Borrador" },
  { value: "standard", label: "Estándar" },
  { value: "fine", label: "Alta" },
];

export default function UploadModel({ addToCart }) {
  const [form, setForm] = useState({
    material: MATERIAL_OPTIONS[0].value,
    infill: INFILL_OPTIONS[0].value,
    quality: QUALITY_OPTIONS[1].value,
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);

  const fileName = selectedFile?.name ?? "";

  const canSubmit = useMemo(
    () => !submitting && Boolean(selectedFile),
    [submitting, selectedFile],
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedFile) return;
    setSubmitting(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("stl", selectedFile);
      formData.append("material", form.material);
      formData.append("infill", form.infill);
      formData.append("quality", form.quality);
      const data = await quoteStlModel(formData);
      setQuote(data);
      setAdded(false);
    } catch (err) {
      setQuote(null);
      setError(err.message || "No pudimos cotizar tu modelo");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddToCart = () => {
    if (!quote) return;
    addToCart?.({
      id: `stl-${Date.now()}`,
      title: `Modelo personalizado (${form.material})`,
      price: Number(quote.estimated_price || 0),
      image: "/images/placeholder.png",
      descripcion: `Infill ${quote.infill}%, calidad ${quote.quality}. Peso estimado ${quote.weight_g} g`,
    });
    setAdded(true);
  };

  return (
    <section className="container my-5" style={{ maxWidth: 720 }}>
      <h1 className="h3 mb-3">Subí tu STL y recibí un presupuesto</h1>
      <p className="text-muted mb-4">
        Calculamos volumen, peso estimado y tiempo de impresión para tu archivo STL.
      </p>

      <form className="card shadow-sm border-0" onSubmit={handleSubmit}>
        <div className="card-body">
          <div className="mb-3">
            <label className="form-label">Archivo STL *</label>
            <input
              type="file"
              accept=".stl"
              className="form-control"
              onChange={(event) => {
                setSelectedFile(event.target.files?.[0] || null);
                setQuote(null);
              }}
            />
            {fileName && <div className="form-text">{fileName}</div>}
          </div>

          <div className="row g-3">
            <div className="col-12 col-md-4">
              <label className="form-label">Material</label>
              <select
                className="form-select"
                value={form.material}
                onChange={(event) => setForm((prev) => ({ ...prev, material: event.target.value }))}
              >
                {MATERIAL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label">Relleno</label>
              <select
                className="form-select"
                value={form.infill}
                onChange={(event) => setForm((prev) => ({ ...prev, infill: event.target.value }))}
              >
                {INFILL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label">Calidad</label>
              <select
                className="form-select"
                value={form.quality}
                onChange={(event) => setForm((prev) => ({ ...prev, quality: event.target.value }))}
              >
                {QUALITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="card-footer bg-white d-flex justify-content-between align-items-center">
          <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
            {submitting ? "Calculando..." : "Calcular presupuesto"}
          </button>
          {quote && (
            <button type="button" className="btn btn-success" onClick={handleAddToCart}>
              Agregar al carrito
            </button>
          )}
        </div>
      </form>

      {error && <div className="alert alert-danger mt-3">{error}</div>}

      {quote && (
        <div className="card border-0 shadow-sm mt-4">
          <div className="card-body">
            <h2 className="h5 mb-3">Estimación</h2>
            <dl className="row mb-0">
              <SummaryItem label="Precio estimado" value={`AR$ ${quote.estimated_price}`} />
              <SummaryItem label="Volumen" value={`${quote.volume_cm3} cm³`} />
              <SummaryItem label="Peso" value={`${quote.weight_g} g`} />
              <SummaryItem label="Tiempo" value={`${quote.estimated_time_hours} h aprox.`} />
              <SummaryItem label="Material" value={quote.material} />
              <SummaryItem label="Relleno" value={`${quote.infill}%`} />
              <SummaryItem label="Calidad" value={quote.quality} />
              <SummaryItem label="Tamaño archivo" value={`${quote.file_size_mb} MB`} />
            </dl>
            <small className="text-muted">
              * Los valores son aproximados y pueden variar según ajustes finales.
            </small>
            {added && (
              <div className="alert alert-success mt-3 mb-0">
                Modelo agregado al carrito 🎉
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function SummaryItem({ label, value }) {
  return (
    <>
      <dt className="col-6 col-md-4 text-muted small">{label}</dt>
      <dd className="col-6 col-md-8 fw-semibold">{value}</dd>
    </>
  );
}
