import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { quoteStlModel } from "../api/customization";
import Spinner from "../components/Spinner";

const MATERIAL_OPTIONS = [
  { value: "PLA", label: "PLA" },
  { value: "PLA_PLUS", label: "PLA+" },
  { value: "PLA_MATE", label: "PLA mate" },
  { value: "PETG", label: "PETG" },
];

const MATERIAL_LABELS = MATERIAL_OPTIONS.reduce((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {});

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

const DEFAULT_FORM = {
  material: MATERIAL_OPTIONS[0].value,
  infill: INFILL_OPTIONS[0].value,
  quality: QUALITY_OPTIONS[1].value,
};

const DEFAULT_COLOR = "#f25f5c";
const STORAGE_KEY = "upload-model-snapshot";

let inMemorySnapshot = null;

const MATERIAL_PROPERTIES = {
  PLA: { density: 1.24, priceMultiplier: 1 },
  PLA_PLUS: { density: 1.25, priceMultiplier: 1.3 },
  PLA_MATE: { density: 1.24, priceMultiplier: 1.5 },
  PETG: { density: 1.24, priceMultiplier: 1.5 },
};

const QUALITY_SPEED_MULTIPLIER = {
  draft: 1.4,
  standard: 1,
  fine: 0.7,
};

const MACHINE_RATE_PER_HOUR = {
  draft: 700,
  standard: 900,
  fine: 1200,
};

// Bambu Lab A1 Combo imprime más rápido que una FDM estándar; usamos un promedio de 32 cm³/h.
const BASE_EXTRUSION_RATE_CM3_H = 32;
const FINISHING_BASE_COST = 350;
const MINIMUM_PRICE = 5000;
const FILAMENT_COST_PER_GRAM = 20;
const FILAMENT_PROFIT_PER_GRAM = FILAMENT_COST_PER_GRAM * 3;
const TARGET_PRICE_PER_GRAM = FILAMENT_COST_PER_GRAM + FILAMENT_PROFIT_PER_GRAM;

export default function UploadModel({ addToCart }) {
  const [form, setForm] = useState(() => ({ ...DEFAULT_FORM }));
  const [selectedFile, setSelectedFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState("");
  const [analysisError, setAnalysisError] = useState("");
  const [added, setAdded] = useState(false);
  const [previewStats, setPreviewStats] = useState(null);
  const [meshColor, setMeshColor] = useState(DEFAULT_COLOR);
  const [fileMeta, setFileMeta] = useState(null);

  const viewerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const meshRef = useRef(null);
  const loaderRef = useRef(null);
  const animationRef = useRef(null);
  const meshColorRef = useRef(meshColor);
  const fileInputRef = useRef(null);
  const hydrationDoneRef = useRef(false);

  meshColorRef.current = meshColor;

  const applySnapshot = useCallback((snapshot) => {
    if (!snapshot) return;
    if (snapshot.form) {
      setForm((prev) => ({ ...prev, ...snapshot.form }));
    }
    if (snapshot.meshColor) {
      setMeshColor(snapshot.meshColor);
    }
    setPreviewStats(null);
    setQuote(null);
    setFileMeta(null);
    setSelectedFile(null);
    setAdded(false);
    setError("");
    setAnalysisError("");
  }, []);

  useEffect(() => {
    if (inMemorySnapshot) {
      applySnapshot(inMemorySnapshot);
      hydrationDoneRef.current = true;
      return;
    }

    if (typeof window === "undefined") {
      hydrationDoneRef.current = true;
      return;
    }

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        applySnapshot(parsed);
      }
    } catch (storageError) {
      console.error("No se pudo restaurar el presupuesto guardado", storageError);
    } finally {
      hydrationDoneRef.current = true;
    }
  }, [applySnapshot]);

  useEffect(() => {
    if (!hydrationDoneRef.current) return;

    inMemorySnapshot = {
      form,
      meshColor,
    };

    if (typeof window === "undefined") return;
    try {
      const snapshot = {
        form,
        meshColor,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch (storageError) {
      console.error("No se pudo guardar el presupuesto", storageError);
    }
  }, [form, meshColor]);

  const fileName = selectedFile?.name ?? fileMeta?.name ?? "";
  const fileSizeMb = selectedFile
    ? Number((selectedFile.size / (1024 * 1024)).toFixed(2))
    : fileMeta?.sizeMb ?? null;

  const canSubmit = useMemo(
    () => !submitting && Boolean(selectedFile && previewStats),
    [submitting, selectedFile, previewStats],
  );

  const canAddToCart = useMemo(
    () => Boolean(quote && Number(quote.estimated_price || 0) > 0 && selectedFile),
    [quote, selectedFile],
  );

  const totalPrice = quote ? Math.round(Number(quote.estimated_price || 0)) : 0;
  const formattedTotalPrice = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(totalPrice || 0);
  useEffect(() => {
    const container = viewerRef.current;
    if (!container) return undefined;

    const width = container.clientWidth || 600;
    const height = 360;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#f5f7fb");
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 5000);
    camera.position.set(0, 120, 240);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = true;
    controlsRef.current = controls;

    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambient);
    const directional = new THREE.DirectionalLight(0xffffff, 0.75);
    directional.position.set(150, 200, 150);
    scene.add(directional);
    const backLight = new THREE.DirectionalLight(0xffffff, 0.35);
    backLight.position.set(-120, 80, -120);
    scene.add(backLight);

    const grid = new THREE.GridHelper(200, 20, 0x8892b0, 0xd0d4e4);
    grid.position.y = -0.1;
    scene.add(grid);

    loaderRef.current = new STLLoader();

    const renderLoop = () => {
      animationRef.current = requestAnimationFrame(renderLoop);
      controls.update();
      renderer.render(scene, camera);
    };
    renderLoop();

    const handleResize = () => {
      if (!rendererRef.current || !cameraRef.current || !viewerRef.current) return;
      const newWidth = viewerRef.current.clientWidth;
      rendererRef.current.setSize(newWidth, height);
      cameraRef.current.aspect = newWidth / height;
      cameraRef.current.updateProjectionMatrix();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationRef.current);
      controls.dispose();
      grid.geometry.dispose();
      if (Array.isArray(grid.material)) grid.material.forEach((mat) => mat.dispose?.());
      else grid.material.dispose?.();
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      if (meshRef.current) {
        disposeMesh(meshRef.current);
        meshRef.current = null;
      }
      scene.clear();
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      controlsRef.current = null;
    };
  }, []);

  const loadStlToScene = useCallback(
    (arrayBuffer) => {
      if (!loaderRef.current || !sceneRef.current || !cameraRef.current) return;
      try {
        const geometry = loaderRef.current.parse(arrayBuffer);
        const stats = computeGeometryStats(geometry);
        setPreviewStats(stats);
        setAnalysisError("");

        const viewGeometry = geometry.clone();
        centerGeometryOnBase(viewGeometry);
        viewGeometry.computeVertexNormals();

        const material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(meshColorRef.current),
          metalness: 0.25,
          roughness: 0.65,
        });
        const mesh = new THREE.Mesh(viewGeometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        if (meshRef.current) {
          sceneRef.current.remove(meshRef.current);
          disposeMesh(meshRef.current);
        }

        sceneRef.current.add(mesh);
        meshRef.current = mesh;

        const alignedBox = new THREE.Box3().setFromObject(mesh);
        fitCameraToBoundingBox(cameraRef.current, controlsRef.current, alignedBox);
        geometry.dispose();
      } catch (parseError) {
        console.error("Error al analizar STL", parseError);
        setPreviewStats(null);
        setAnalysisError("No pudimos leer el STL. Revisá que sea un archivo binario válido.");
      }
    },
    [],
  );

  useEffect(() => {
    if (!selectedFile) {
      if (!quote) {
        setPreviewStats(null);
        setAnalysisError("");
      }
      if (meshRef.current && sceneRef.current) {
        sceneRef.current.remove(meshRef.current);
        disposeMesh(meshRef.current);
        meshRef.current = null;
      }
      return undefined;
    }

    let fileReader;
    try {
      fileReader = new FileReader();
      fileReader.onload = (event) => {
        if (!event.target?.result) return;
        loadStlToScene(event.target.result);
      };
      fileReader.onerror = () => {
        setPreviewStats(null);
        setAnalysisError("No pudimos leer el archivo STL.");
      };
      fileReader.readAsArrayBuffer(selectedFile);
    } catch (readError) {
      console.error("Error al leer STL", readError);
      setPreviewStats(null);
      setAnalysisError("Ocurrió un error al procesar el archivo.");
    }

    return () => {
      if (fileReader && fileReader.readyState === FileReader.LOADING) {
        fileReader.abort();
      }
    };
  }, [selectedFile, loadStlToScene, quote]);

  useEffect(() => {
    if (meshRef.current && meshRef.current.material) {
      const material = meshRef.current.material;
      material.color.set(meshColor);
      material.needsUpdate = true;
    }
  }, [meshColor]);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!selectedFile || !previewStats) {
        setError("Subí un STL válido antes de cotizar.");
        return;
      }

      setSubmitting(true);
      setError("");
      const localEstimate = estimatePrintQuote(previewStats, form, fileSizeMb);

      try {
        const formData = new FormData();
        formData.append("stl", selectedFile);
        formData.append("material", form.material);
        formData.append("infill", form.infill);
        formData.append("quality", form.quality);

        const data = await quoteStlModel(formData);
        if (data && Object.keys(data).length > 0) {
          const serverRawPrice = Number(data.estimated_price);
          const serverTotal = Number.isFinite(serverRawPrice)
            ? serverRawPrice >= MINIMUM_PRICE
              ? serverRawPrice
              : MINIMUM_PRICE + serverRawPrice
            : 0;
          const localPrice = Number(localEstimate?.estimated_price ?? 0);
          const combinedRawPrice = Math.max(localPrice, serverTotal);
          const combinedPrice = Math.max(
            Math.round(combinedRawPrice / 10) * 10,
            MINIMUM_PRICE,
          );

          const mergedQuote = {
            ...localEstimate,
            ...data,
            file_size_mb: data.file_size_mb ?? localEstimate.file_size_mb,
            size_mm: data.size_mm ?? localEstimate.size_mm,
            triangle_count: data.triangle_count ?? localEstimate.triangle_count,
            material_label:
              data.material_label ?? MATERIAL_LABELS[data.material] ?? localEstimate.material_label,
            color_hex: meshColorRef.current,
            source: "server",
          };

          mergedQuote.estimated_price = combinedPrice;
          mergedQuote.breakdown = {
            ...(localEstimate.breakdown ?? {}),
            base_fee: MINIMUM_PRICE,
            server_estimated_price: Number.isFinite(serverRawPrice)
              ? Number(serverRawPrice.toFixed(0))
              : undefined,
          };

          setQuote(mergedQuote);
          setAdded(false);
        } else {
          setQuote({ ...localEstimate, source: "local", color_hex: meshColorRef.current });
          setAdded(false);
          setError("El servidor no devolvió datos, mostramos una estimación local.");
        }
      } catch (err) {
        if (localEstimate) {
          setQuote({ ...localEstimate, source: "local", color_hex: meshColorRef.current });
          setAdded(false);
          setError("No pudimos conectarnos al servidor. Mostramos una estimación local basada en el STL.");
        } else {
          setQuote(null);
          setError(err.message || "No pudimos cotizar tu modelo");
        }
      } finally {
        setSubmitting(false);
      }
    },
    [selectedFile, previewStats, form, fileSizeMb],
  );

  const handleAddToCart = useCallback(() => {
    if (!quote || Number(quote.estimated_price || 0) <= 0) return;
    const materialLabel = MATERIAL_LABELS[quote.material] || quote.material;
    const stlFileMeta =
      fileMeta ||
      (selectedFile
        ? {
            name: selectedFile.name,
            sizeMb: Number((selectedFile.size / (1024 * 1024)).toFixed(2)),
          }
        : null);
    const extractQuoteReference = (currentQuote = {}) => {
      const upload = currentQuote.upload || currentQuote.file || {};
      const assets = Array.isArray(currentQuote.files) ? currentQuote.files : [];
      const firstAsset = assets.length > 0 ? assets[0] : {};
      return {
        quoteId: currentQuote.id || currentQuote.quote_id || currentQuote.reference || null,
        uploadId:
          currentQuote.upload_id ||
          currentQuote.uploadId ||
          upload.id ||
          currentQuote.file_id ||
          firstAsset.id ||
          null,
        downloadUrl:
          currentQuote.download_url ||
          currentQuote.file_url ||
          currentQuote.url ||
          upload.download_url ||
          upload.file_url ||
          firstAsset.download_url ||
          firstAsset.url ||
          null,
        signedUrl: currentQuote.signed_url || upload.signed_url || firstAsset.signed_url || null,
        storageKey: currentQuote.storage_key || upload.key || firstAsset.storage_key || null,
        mimeType:
          currentQuote.mime_type || upload.mime_type || firstAsset.mime_type || "model/stl",
      };
    };

    const quoteReference = extractQuoteReference(quote);

    addToCart?.({
      id: `stl-${Date.now()}`,
      title: `Modelo personalizado (${materialLabel || MATERIAL_LABELS[form.material]})`,
      price: Number(quote.estimated_price || 0),
      image: "/images/placeholder.png",
      descripcion: `Infill ${quote.infill}% · Calidad ${quote.quality}. Peso estimado ${quote.weight_g} g${
        meshColor ? ` · Color ${meshColor.toUpperCase()}` : ""
      }`,
      customization: {
        type: "uploaded-stl",
        material: quote.material || form.material,
        materialLabel,
        infill: quote.infill,
        quality: quote.quality,
        weightG: quote.weight_g,
        estimatedTimeHours: quote.estimated_time_hours,
        colorHex: meshColor,
        breakdown: quote.breakdown ?? null,
        fileMeta: stlFileMeta,
        stlQuote: {
          ...quoteReference,
          fileName: stlFileMeta?.name || null,
          fileSizeMb: stlFileMeta?.sizeMb || null,
          estimatedPrice: Number(quote.estimated_price || 0),
          volumeCm3: quote.volume_cm3,
          surfaceAreaCm2: quote.surface_area_cm2,
          weightG: quote.weight_g,
          estimatedTimeHours: quote.estimated_time_hours,
          source: quote.source || "server",
        },
      },
    });
    setAdded(true);
  }, [quote, addToCart, form.material, meshColor, fileMeta, selectedFile]);

  const handleResetQuote = () => {
    setSelectedFile(null);
    setFileMeta(null);
    setPreviewStats(null);
    setQuote(null);
    setAdded(false);
    setAnalysisError("");
    setError("");
    setForm({ ...DEFAULT_FORM });
    setMeshColor(DEFAULT_COLOR);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (meshRef.current && sceneRef.current) {
      sceneRef.current.remove(meshRef.current);
      disposeMesh(meshRef.current);
      meshRef.current = null;
    }
    inMemorySnapshot = null;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch (storageError) {
        console.error("No se pudo limpiar el presupuesto guardado", storageError);
      }
    }
  };

  return (
    <section className="container my-5">
      <h1 className="h3 mb-3">Subí tu STL y recibí un presupuesto</h1>
      <p className="text-muted mb-4">
        Visualizamos el modelo, calculamos volumen, peso estimado y una tarifa sugerida según tus parámetros.
      </p>

      <div className="row g-4">
        <div className="col-12 col-lg-7">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <h2 className="h5 mb-3">Visor 3D del STL</h2>
              <div
                ref={viewerRef}
                className="border rounded bg-white"
                style={{ minHeight: 360, overflow: "hidden" }}
              />
              {analysisError && <div className="alert alert-warning mt-3 mb-0">{analysisError}</div>}
              {!analysisError && !previewStats && (
                <p className="text-muted small mt-3 mb-0">
                  Elegí un archivo STL para verlo en 3D y calcular sus métricas.
                </p>
              )}
              {!analysisError && previewStats && (
                <dl className="row row-cols-1 row-cols-md-2 small mt-3 mb-0">
                  <SummaryItem
                    label="Dimensiones"
                    value={`${previewStats.dimensionsMm.x.toFixed(1)} × ${previewStats.dimensionsMm.y.toFixed(1)} × ${previewStats.dimensionsMm.z.toFixed(1)} mm`}
                  />
                  <SummaryItem
                    label="Volumen"
                    value={`${previewStats.volumeCm3.toFixed(2)} cm³`}
                  />
                  <SummaryItem
                    label="Superficie"
                    value={`${previewStats.surfaceAreaCm2.toFixed(1)} cm²`}
                  />
                  <SummaryItem
                    label="Triángulos"
                    value={previewStats.triangleCount.toLocaleString("es-AR")}
                  />
                </dl>
              )}
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-5">
          <form className="card shadow-sm border-0 h-100" onSubmit={handleSubmit}>
            <div className="card-body">
              <h2 className="h5 mb-3">Parámetros de impresión</h2>
              <div className="mb-3">
                <label className="form-label">Archivo STL *</label>
                <input
                  type="file"
                  accept=".stl"
                  className="form-control"
                  ref={fileInputRef}
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    setSelectedFile(file);
                    setFileMeta(
                      file
                        ? {
                            name: file.name,
                            sizeMb: Number((file.size / (1024 * 1024)).toFixed(2)),
                          }
                        : null,
                    );
                    setQuote(null);
                    setAdded(false);
                    setAnalysisError("");
                    setError("");
                  }}
                />
                {fileName && (
                  <div className="form-text">
                    {fileName}
                    {fileSizeMb ? ` · ${fileSizeMb} MB` : ""}
                  </div>
                )}
                <div className="mt-3 d-flex flex-wrap align-items-center gap-3">
                  <span className="text-muted small mb-0">¿No tenés un STL?</span>
                  <a
                    href="https://www.thingiverse.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="d-inline-flex align-items-center"
                    aria-label="Encontrá modelos STL gratuitos en Thingiverse"
                  >
                    <img
                      src="/images/thingiverse-logo.svg"
                      alt="Thingiverse"
                      height="32"
                      width="120"
                      style={{ objectFit: "contain" }}
                    />
                  </a>
                  <a
                    href="https://makerworld.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="d-inline-flex align-items-center"
                    style={{ filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))" }}
                    aria-label="Buscá modelos STL en MakerWorld"
                  >
                    <img
                      src="/images/makerworld-logo.svg"
                      alt="MakerWorld"
                      height="32"
                      width="120"
                      style={{ objectFit: "contain" }}
                    />
                  </a>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">Color de referencia</label>
                <input
                  type="color"
                  className="form-control form-control-color"
                  value={meshColor}
                  title="Color sugerido para la pieza"
                  onChange={(event) => setMeshColor(event.target.value)}
                />
                <div className="form-text">Se usa para visualizar y guardar tu preferencia.</div>
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

            <div className="card-footer bg-white d-flex flex-column flex-md-row gap-2 justify-content-between align-items-stretch align-items-md-center">
              <div className="d-flex flex-column flex-sm-row gap-2">
                <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
                  {submitting ? (
                    <>
                      <Spinner size={22} /> <span className="ms-2">Calculando...</span>
                    </>
                  ) : (
                    "Calcular presupuesto"
                  )}
                </button>
                {quote && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={handleResetQuote}
                  >
                    Realizar otro presupuesto
                  </button>
                )}
              </div>
              {canAddToCart && (
                <button type="button" className="btn btn-success" onClick={handleAddToCart}>
                  Agregar al carrito
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {error && <div className="alert alert-info mt-4">{error}</div>}

      {quote && Number(quote.estimated_price || 0) > 0 && (
        <div className="card border-0 shadow-sm mt-4">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
              <h2 className="h5 mb-0">Estimación {quote.source === "local" ? "(local)" : ""}</h2>
              <span className="badge text-bg-light">
                Origen: {quote.source === "server" ? "Servidor" : "Estimación local"}
              </span>
            </div>
            <div className="alert alert-success text-center shadow-sm">
              <p className="text-uppercase fw-semibold mb-1">Precio final estimado</p>
              <p className="display-5 fw-bold mb-0">{formattedTotalPrice}</p>
            </div>
            {added && (
              <div className="alert alert-success mt-3 mb-0">Modelo agregado al carrito 🎉</div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function computeGeometryStats(geometry) {
  const position = geometry.getAttribute("position");
  if (!position) {
    throw new Error("El STL no contiene vértices");
  }

  if (!geometry.boundingBox) {
    geometry.computeBoundingBox();
  }

  const boundingBox = geometry.boundingBox?.clone();
  const sizeVector = new THREE.Vector3();
  boundingBox?.getSize(sizeVector);

  const { volume, area } = accumulateVolumeAndArea(position, geometry.getIndex());
  const triangleCount = geometry.getIndex()
    ? geometry.getIndex().count / 3
    : position.count / 3;

  return {
    volumeMm3: volume,
    volumeCm3: volume / 1000,
    surfaceAreaMm2: area,
    surfaceAreaCm2: area / 100,
    boundingBox,
    dimensionsMm: {
      x: sizeVector.x,
      y: sizeVector.y,
      z: sizeVector.z,
    },
    triangleCount,
  };
}

function accumulateVolumeAndArea(position, index) {
  const arr = position.array;
  const indexArray = index ? index.array : null;

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const cross = new THREE.Vector3();

  let volume = 0;
  let area = 0;

  const handleTriangle = (ia, ib, ic) => {
    a.fromArray(arr, ia * 3);
    b.fromArray(arr, ib * 3);
    c.fromArray(arr, ic * 3);

    ab.subVectors(b, a);
    ac.subVectors(c, a);
    cross.crossVectors(ab, ac);

    area += cross.length() * 0.5;
    volume += a.dot(cross) / 6;
  };

  if (indexArray) {
    for (let i = 0; i < indexArray.length; i += 3) {
      handleTriangle(indexArray[i], indexArray[i + 1], indexArray[i + 2]);
    }
  } else {
    for (let i = 0; i < position.count; i += 3) {
      handleTriangle(i, i + 1, i + 2);
    }
  }

  return {
    volume: Math.abs(volume),
    area,
  };
}

function estimatePrintQuote(stats, form, fileSizeMb) {
  if (!stats) return null;

  const materialProps = MATERIAL_PROPERTIES[form.material] ?? MATERIAL_PROPERTIES.PLA;
  const density = materialProps.density;
  const pricePerGram = TARGET_PRICE_PER_GRAM;
  const materialMultiplier = materialProps.priceMultiplier ?? 1;

  const infillRatio = Number(form.infill) / 100;
  const shellFactor = 0.25; // perímetros, tapas y relleno mínimo
  const effectiveMaterialRatio = shellFactor + (1 - shellFactor) * infillRatio;

  const volumeCm3 = stats.volumeCm3;
  const effectiveVolume = volumeCm3 * effectiveMaterialRatio;
  const solidWeight = volumeCm3 * density;
  const weightG = solidWeight * effectiveMaterialRatio;

  const materialCost = weightG * pricePerGram * materialMultiplier;

  const speedMultiplier = QUALITY_SPEED_MULTIPLIER[form.quality] ?? 1;
  const machineRate = MACHINE_RATE_PER_HOUR[form.quality] ?? MACHINE_RATE_PER_HOUR.standard;
  const hours = Math.max(effectiveVolume / (BASE_EXTRUSION_RATE_CM3_H * speedMultiplier), 0.2);
  const machineCost = hours * machineRate;

  const finishingCost = FINISHING_BASE_COST + stats.surfaceAreaCm2 * 0.12;
  const subtotal = materialCost + machineCost + finishingCost;
  const totalBeforeRounding = MINIMUM_PRICE + subtotal;
  const estimatedPrice = Math.max(Math.round(totalBeforeRounding / 10) * 10, MINIMUM_PRICE);

  // Guardamos el detalle para administración: material + máquina + post-proceso
  return {
    estimated_price: estimatedPrice,
    material: form.material,
    material_label: MATERIAL_LABELS[form.material] || form.material,
    infill: Number(form.infill),
    quality: form.quality,
    weight_g: Number(weightG.toFixed(1)),
    volume_cm3: Number(volumeCm3.toFixed(2)),
    surface_area_cm2: Number(stats.surfaceAreaCm2.toFixed(1)),
    estimated_time_hours: Number(hours.toFixed(2)),
    size_mm: stats.dimensionsMm,
    triangle_count: stats.triangleCount,
    file_size_mb: fileSizeMb ?? null,
    breakdown: {
      base_fee: MINIMUM_PRICE,
      material_cost: Number(materialCost.toFixed(0)),
      machine_cost: Number(machineCost.toFixed(0)),
      finishing_cost: Number(finishingCost.toFixed(0)),
    },
  };
}

function disposeMesh(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((mat) => {
        if (mat.map) mat.map.dispose?.();
        mat.dispose?.();
      });
    }
  });
}

function fitCameraToBoundingBox(camera, controls, box) {
  if (!camera || !box) return;

  const size = new THREE.Vector3();
  box.getSize(size);
  const center = new THREE.Vector3();
  box.getCenter(center);

  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const distance = (maxDim / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2))) * 1.35;
  const direction = new THREE.Vector3(1, 0.85, 1).normalize();

  camera.position.copy(direction.multiplyScalar(distance).add(center));
  camera.near = Math.max(distance / 100, 0.1);
  camera.far = Math.max(distance * 10, camera.near + 1000);
  camera.lookAt(center);
  camera.updateProjectionMatrix();

  if (controls) {
    controls.target.copy(center);
    controls.update();
  }
}

function centerGeometryOnBase(geometry) {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (!box) return;

  const offset = new THREE.Vector3(
    -(box.min.x + box.max.x) / 2,
    -box.min.y,
    -(box.min.z + box.max.z) / 2,
  );

  geometry.translate(offset.x, offset.y, offset.z);
  geometry.computeBoundingBox();
}

function SummaryItem({ label, value }) {
  return (
    <>
      <dt className="col-6 col-md-4 text-muted small">{label}</dt>
      <dd className="col-6 col-md-8 fw-semibold">{value}</dd>
    </>
  );
}
