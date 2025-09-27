import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const MATERIAL_PRESETS = {
  pla: { label: "PLA", metalness: 0.25, roughness: 0.45, priceMultiplier: 1 },
  pla_mate: { label: "PLA mate", metalness: 0.05, roughness: 0.75, priceMultiplier: 1.08 },
};

const SHAPE_VARIANTS = {
  basico: {
    label: "Mate básico",
    priceMultiplier: 1,
    path: "/models/Mate_Basico.stl",
    rotation: { x: -Math.PI / 2, y: 0, z: 0 },
    targetSize: 2.4,
    engravingOffset: { radial: 1.02, up: 0.05, tangent: 0 },
    planeWidthFactor: 0.8,
    planeHeightFactor: 0.28,
  },
  manija: {
    label: "Mate con manija",
    priceMultiplier: 1.1,
    path: "/models/Mate_manija.stl",
    rotation: { x: -Math.PI / 2, y: 0, z: 0 },
    targetSize: 2.4,
    engravingOffset: { radial: 1.03, up: 0.02, tangent: -0.1 },
    planeWidthFactor: 0.6,
    planeHeightFactor: 0.26,
  },
  stanley: {
    label: "Mate estilo Stanley",
    priceMultiplier: 1.2,
    path: "/models/MateStanley.stl",
    rotation: { x: -Math.PI / 2, y: 0, z: 0 },
    targetSize: 2.4,
    engravingOffset: { radial: 1.05, up: 0.02, tangent: 0 },
    planeWidthFactor: 0.7,
    planeHeightFactor: 0.24,
  },
};

const BASE_PRICE = 12000;

export default function Configurator({ addToCart }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const animationRef = useRef(null);
  const textCanvasRef = useRef(null);
  const textMeshRef = useRef(null);
  const shapeGroupRef = useRef(null);
  const colorMaterialsRef = useRef([]);
  const loaderRef = useRef(null);
  const controlsRef = useRef(null);
  const loadTokenRef = useRef(0);
  const colorRef = useRef("#ff6b6b");
  const textColorRef = useRef("#ffffff");
  const materialKeyRef = useRef("pla");
  const textScaleRef = useRef(1);

  const [color, setColor] = useState("#ff6b6b");
  const [textColor, setTextColor] = useState("#ffffff");
  const [textScale, setTextScale] = useState(1);
  const [materialKey, setMaterialKey] = useState("pla");
  const [engraving, setEngraving] = useState("SrBuj 3D");
  const [notes, setNotes] = useState("");
  const [shapeKey, setShapeKey] = useState("basico");
  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [autoRotate, setAutoRotate] = useState(true);
  const [includeBombilla, setIncludeBombilla] = useState(false);

  colorRef.current = color;
  textColorRef.current = textColor;
  materialKeyRef.current = materialKey;
  textScaleRef.current = textScale;

  const currentPreset = MATERIAL_PRESETS[materialKey];
  const price = useMemo(() => {
    const materialMultiplier = currentPreset?.priceMultiplier ?? 1;
    const shapeMultiplier = SHAPE_VARIANTS[shapeKey]?.priceMultiplier ?? 1;
    const baseTotal = Math.round(BASE_PRICE * materialMultiplier * shapeMultiplier);
    return baseTotal + (includeBombilla ? 3500 : 0);
  }, [currentPreset, shapeKey, includeBombilla]);

  const disposeObject = (root) => {
    root.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        const disposeMaterial = (mat) => {
          if (mat.map) mat.map.dispose();
          if (mat.dispose) mat.dispose();
        };
        if (Array.isArray(child.material)) child.material.forEach(disposeMaterial);
        else disposeMaterial(child.material);
      }
    });
  };

  const loadShape = useCallback((key, currentColor, currentMaterialKey) => {
    const scene = sceneRef.current;
    const textMesh = textMeshRef.current;
    const camera = cameraRef.current;
    if (!scene || !textMesh || !camera) return;

    const variant = SHAPE_VARIANTS[key] || SHAPE_VARIANTS.basico;

    if (!loaderRef.current) loaderRef.current = new STLLoader();
    const loader = loaderRef.current;

    const requestId = ++loadTokenRef.current;

    const materialPreset = MATERIAL_PRESETS[currentMaterialKey] || MATERIAL_PRESETS.pla;

    loader.load(
      variant.path,
      (geometry) => {
        if (loadTokenRef.current !== requestId) return;

        geometry.computeVertexNormals();
        geometry.center();

        const material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(currentColor),
          metalness: materialPreset.metalness,
          roughness: materialPreset.roughness,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const group = new THREE.Group();
        const box = new THREE.Box3().setFromObject(mesh);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const targetSize = variant.targetSize ?? 2.4;
        const uniformScale = targetSize / maxDim;
        mesh.scale.set(uniformScale, uniformScale, uniformScale);
        mesh.rotation.set(
          variant.rotation?.x ?? 0,
          variant.rotation?.y ?? 0,
          variant.rotation?.z ?? 0,
        );
        group.add(mesh);

        const scaledBox = new THREE.Box3().setFromObject(mesh);
        const scaledSize = scaledBox.getSize(new THREE.Vector3());
        const offset = variant.engravingOffset ?? { radial: 1.02, up: 0, tangent: 0 };
        const planeWidth = scaledSize.x * (variant.planeWidthFactor ?? 0.85) || 1;
        const planeHeight = scaledSize.y * (variant.planeHeightFactor ?? 0.3) || 1;
        if (textMesh.geometry) textMesh.geometry.dispose();
        textMesh.geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
        const textScaleValue = textScale || 1;
        textMesh.scale.set(textScaleValue, textScaleValue, 1);

        const normalDir = new THREE.Vector3(1, 0, 0).applyQuaternion(mesh.quaternion).normalize();
        const upDir = new THREE.Vector3(0, 1, 0).applyQuaternion(mesh.quaternion).normalize();
        const tangentDir = new THREE.Vector3().crossVectors(upDir, normalDir).normalize();

        const radial = (scaledSize.x * 0.5) * (offset.radial ?? 1.02) + 0.002;
        const heightShift = upDir.clone().multiplyScalar((offset.up ?? 0) * scaledSize.y * 0.5);
        const tangentShift = tangentDir.clone().multiplyScalar((offset.tangent ?? 0) * scaledSize.z * 0.5);
        const basePos = normalDir.clone().multiplyScalar(radial).add(heightShift).add(tangentShift);
        textMesh.position.copy(basePos);

        const orientationMatrix = new THREE.Matrix4().makeBasis(
          tangentDir,
          upDir,
          normalDir,
        );
        textMesh.quaternion.setFromRotationMatrix(orientationMatrix);
        textMesh.material.map.needsUpdate = true;
        group.add(textMesh);

        if (logoPreview) {
          const logoWidth = planeWidth * 0.55 * textScaleValue;
          const logoHeight = planeHeight * 0.55 * textScaleValue;
          const planeGeom = new THREE.PlaneGeometry(logoWidth, logoHeight);
          const texture = new THREE.TextureLoader().load(logoPreview);
          texture.colorSpace = THREE.SRGBColorSpace;
          const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
          const plane = new THREE.Mesh(planeGeom, mat);
          const logoOffset = upDir.clone().multiplyScalar(-planeHeight * 0.35 * textScaleValue);
          plane.position.copy(textMesh.position).add(logoOffset);
          plane.quaternion.copy(textMesh.quaternion);
          group.add(plane);
        }

        const fitHeightDistance = scaledSize.y / (2 * Math.tan((camera.fov * Math.PI) / 360));
        const fitWidthDistance = scaledSize.x / (2 * Math.tan((camera.fov * Math.PI) / 360) * camera.aspect);
        const distance = Math.max(fitHeightDistance, fitWidthDistance) * 1.4;
        camera.position.set(0, scaledSize.y * 0.15, distance + (variant.cameraOffset ?? 0));
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();

        if (shapeGroupRef.current) {
          if (textMesh.parent === shapeGroupRef.current) {
            shapeGroupRef.current.remove(textMesh);
          }
          scene.remove(shapeGroupRef.current);
          disposeObject(shapeGroupRef.current);
        }

        colorMaterialsRef.current = [material];
        scene.add(group);
        shapeGroupRef.current = group;

        if (controlsRef.current) {
          controlsRef.current.target.set(0, variant.orbitTargetY ?? 0, 0);
          controlsRef.current.update();
        }
      },
      undefined,
      (error) => {
        console.error("No se pudo cargar el STL", error);
      },
    );
  }, []);

  const updateTextTexture = (text) => {
    const canvas = textCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(0,0,0,0)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const baseFont = 88 * textScaleRef.current;
    let fontSize = baseFont;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `bold ${fontSize}px 'Poppins', sans-serif`;
    const maxWidth = canvas.width * 0.8;
    if (text) {
      let metrics = ctx.measureText(text);
      while (metrics.width > maxWidth && fontSize > 24) {
        fontSize -= 4;
        ctx.font = `bold ${fontSize}px 'Poppins', sans-serif`;
        metrics = ctx.measureText(text);
      }
    }
    ctx.fillStyle = textColorRef.current;
    ctx.fillText(text || "", canvas.width / 2, canvas.height / 2);
    if (textMeshRef.current) {
      const texture = textMeshRef.current.material.map;
      texture.needsUpdate = true;
    }
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return undefined;

    const width = container.clientWidth;
    const height = 420;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#f4f6fb");
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 1.2, 2.6);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 1.2;
    controls.enabled = true;
    controls.enableRotate = true;
    controlsRef.current = controls;

    const handlePointerDown = () => {
      controls.autoRotate = false;
    };
    const handlePointerUp = () => {
      controls.autoRotate = autoRotate;
    };
    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointerup", handlePointerUp);
    renderer.domElement.addEventListener("pointerleave", handlePointerUp);

    const ambient = new THREE.AmbientLight(0xffffff, 1);
    scene.add(ambient);
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    hemi.position.set(0, 20, 0);
    scene.add(hemi);
    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(5, 5, 5);
    scene.add(directional);

    const textCanvas = document.createElement("canvas");
    textCanvas.width = 512;
    textCanvas.height = 256;
    textCanvasRef.current = textCanvas;
    updateTextTexture(engraving);
    const texture = new THREE.CanvasTexture(textCanvas);
    const textMaterial = new THREE.MeshBasicMaterial({ map: texture, transparent: true, color: new THREE.Color(textColorRef.current) });
    const textGeom = new THREE.PlaneGeometry(1.4, 0.45);
    const textMesh = new THREE.Mesh(textGeom, textMaterial);
    textMeshRef.current = textMesh;

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      const newWidth = mountRef.current.clientWidth;
      renderer.setSize(newWidth, height);
      camera.aspect = newWidth / height;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", handleResize);

    loadShape(shapeKey, colorRef.current, materialKeyRef.current);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", handleResize);
      if (shapeGroupRef.current) {
        if (textMeshRef.current && shapeGroupRef.current.children.includes(textMeshRef.current)) {
          shapeGroupRef.current.remove(textMeshRef.current);
        }
        scene.remove(shapeGroupRef.current);
        disposeObject(shapeGroupRef.current);
        shapeGroupRef.current = null;
      }
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      renderer.domElement.removeEventListener("pointerleave", handlePointerUp);
      colorMaterialsRef.current = [];
      sceneRef.current = null;
      textMeshRef.current = null;
      rendererRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    colorMaterialsRef.current.forEach((mat) => {
      mat.color.set(color);
      mat.needsUpdate = true;
    });
  }, [color]);

  useEffect(() => {
    const preset = MATERIAL_PRESETS[materialKey];
    if (!preset) return;
    colorMaterialsRef.current.forEach((mat) => {
      mat.metalness = preset.metalness;
      mat.roughness = preset.roughness;
      mat.needsUpdate = true;
    });
  }, [materialKey]);

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
    }
  }, [autoRotate]);

  useEffect(() => {
    updateTextTexture(engraving);
    if (textMeshRef.current) {
      textMeshRef.current.material.color.set(textColor);
      textMeshRef.current.material.needsUpdate = true;
    }
  }, [engraving, textColor, textScale]);

  useEffect(() => {
    loadShape(shapeKey, colorRef.current, materialKeyRef.current);
  }, [shapeKey, loadShape, textScale, logoPreview]);

  const handleLogoUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setLogo(null);
      setLogoPreview("");
      return;
    }
    if (!file.type.includes("png")) {
      alert("Subí un logo en formato PNG.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setLogo(file);
      setLogoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleReset = () => {
    setColor("#ff6b6b");
    setMaterialKey("pla");
    setTextColor("#ffffff");
    setTextScale(1);
    setShapeKey("basico");
    setEngraving("SrBuj 3D");
    setNotes("");
    setLogo(null);
    setLogoPreview("");
    setAutoRotate(true);
    setIncludeBombilla(false);
  };

  const handleAddToCart = () => {
    const snapshot = rendererRef.current?.domElement.toDataURL("image/png");
    addToCart?.({
      id: `config-${Date.now()}`,
      title: "Mate personalizado",
      price,
      image: snapshot || "/images/placeholder.png",
      thumb: snapshot || "/images/placeholder.png",
      customization: {
        shape: shapeKey,
        shapeLabel: SHAPE_VARIANTS[shapeKey]?.label ?? shapeKey,
        color,
        material: materialKey,
        materialLabel: MATERIAL_PRESETS[materialKey]?.label ?? materialKey,
        engraving,
        textColor,
        textScale,
        notes,
        logoName: logo?.name,
        logoPreview,
        includeBombilla,
      },
      descripcion: `Modelo ${SHAPE_VARIANTS[shapeKey]?.label || shapeKey}. Grabado "${engraving}"${
        includeBombilla ? ". Incluye bombilla." : ""
      }`,
    });
  };

  return (
    <section className="container my-5">
      <div className="row g-4">
        <div className="col-12 col-lg-6">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h1 className="h4 mb-3">Mates personalizados</h1>
              <div className="d-flex flex-wrap gap-2 mb-3">
                <button
                  type="button"
                  className={`btn btn-sm ${autoRotate ? "btn-primary" : "btn-outline-primary"}`}
                  onClick={() => setAutoRotate(true)}
                >
                  ▶ Girar
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${!autoRotate ? "btn-primary" : "btn-outline-primary"}`}
                  onClick={() => setAutoRotate(false)}
                >
                  ❚❚ Pausa
                </button>
              </div>
              <div ref={mountRef} />
            </div>
          </div>
        </div>
        <div className="col-12 col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h2 className="h5">Ajustes</h2>

              <div className="mb-3">
                <label className="form-label">Modelo</label>
                <select
                  className="form-select"
                  value={shapeKey}
                  onChange={(event) => setShapeKey(event.target.value)}
                >
                  {Object.entries(SHAPE_VARIANTS).map(([key, variant]) => (
                    <option key={key} value={key}>
                      {variant.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label">Color base</label>
                <input
                  type="color"
                  className="form-control form-control-color"
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                  title="Elegí un color"
                />
              </div>

              <div className="form-check form-switch mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="includeBombilla"
                  checked={includeBombilla}
                  onChange={(event) => setIncludeBombilla(event.target.checked)}
                />
                <label className="form-check-label" htmlFor="includeBombilla">
                  Incluir bombilla para mate (+AR$ 3500)
                </label>
              </div>

              <div className="mb-3">
                <label className="form-label">Material</label>
                <select
                  className="form-select"
                  value={materialKey}
                  onChange={(event) => setMaterialKey(event.target.value)}
                >
                  {Object.entries(MATERIAL_PRESETS).map(([key, preset]) => (
                    <option key={key} value={key}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label">Grabado frontal</label>
                <input
                  className="form-control"
                  value={engraving}
                  onChange={(event) => setEngraving(event.target.value.slice(0, 18))}
                  placeholder="Texto a grabar"
                />
                <div className="form-text">Máx. 18 caracteres.</div>
              </div>

              <div className="mb-3 row g-2">
                <div className="col-6">
                  <label className="form-label">Color del texto</label>
                  <input
                    type="color"
                    className="form-control form-control-color"
                    value={textColor}
                    onChange={(event) => setTextColor(event.target.value)}
                    title="Color del grabado"
                  />
                </div>
                <div className="col-6">
                  <label className="form-label">Tamaño del texto</label>
                  <input
                    type="range"
                    className="form-range"
                    min="1"
                    max="10"
                    step=".5"
                    value={textScale}
                    onChange={(event) => setTextScale(Number(event.target.value))}
                  />
                  <div className="form-text">Escala actual: ×{textScale.toFixed(2)}</div>
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label">Notas adicionales</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Colores secundarios, packaging, etc."
                />
                <div className="mt-2">
                  <label className="form-label">Logo en PNG (opcional)</label>
                  <input
                    type="file"
                    accept="image/png"
                    className="form-control"
                    onChange={handleLogoUpload}
                  />
                  <div className="form-text">Ideal logos simples de alto contraste.</div>
                  {logoPreview && (
                    <img
                      src={logoPreview}
                      alt="Logo"
                      className="img-fluid rounded border mt-2"
                      style={{ maxHeight: 120, objectFit: "contain" }}
                    />
                  )}
                </div>
              </div>

              <button className="btn btn-primary w-100" type="button" onClick={handleAddToCart}>
                Agregar al carrito (AR$ {price})
              </button>
              <p className="text-muted small mt-3 mb-0">
                ¿Tenés tu propio modelo? <a href="/personalizador/subir-stl">Subí tu STL para cotizarlo</a>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
