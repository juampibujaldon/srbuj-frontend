import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

const MATERIAL_PRESETS = {
  mate: { label: "Mate clásico", metalness: 0.1, roughness: 0.7, priceMultiplier: 1 },
  metalizado: { label: "Metalizado", metalness: 1, roughness: 0.25, priceMultiplier: 1.25 },
  translucido: { label: "Translúcido", metalness: 0.05, roughness: 0.15, priceMultiplier: 1.1 },
};

const SHAPE_VARIANTS = {
  basico: {
    label: "Mate básico",
    priceMultiplier: 1,
    path: "/models/Mate_Basico.stl",
    rotation: { x: -Math.PI / 2, y: 0, z: 0 },
    targetSize: 2.4,
    engravingOffset: { x: 0, y: 0.3, z: 1.1 },
  },
  manija: {
    label: "Mate con manija",
    priceMultiplier: 1.1,
    path: "/models/Mate_manija.stl",
    rotation: { x: -Math.PI / 2, y: 0, z: 0 },
    targetSize: 2.4,
    engravingOffset: { x: 0, y: 0.28, z: 1.18 },
  },
  stanley: {
    label: "Mate estilo Stanley",
    priceMultiplier: 1.2,
    path: "/models/MateStanley.stl",
    rotation: { x: -Math.PI / 2, y: 0, z: 0 },
    targetSize: 2.4,
    engravingOffset: { x: 0, y: 0.24, z: 1.08 },
  },
};

const BASE_PRICE = 7200;

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
  const loadTokenRef = useRef(0);
  const colorRef = useRef("#ff6b6b");
  const materialKeyRef = useRef("mate");

  const [color, setColor] = useState("#ff6b6b");
  const [materialKey, setMaterialKey] = useState("mate");
  const [engraving, setEngraving] = useState("SrBuj 3D");
  const [notes, setNotes] = useState("");
  const [shapeKey, setShapeKey] = useState("basico");

  colorRef.current = color;
  materialKeyRef.current = materialKey;

  const currentPreset = MATERIAL_PRESETS[materialKey];
  const price = useMemo(() => {
    const materialMultiplier = currentPreset?.priceMultiplier ?? 1;
    const shapeMultiplier = SHAPE_VARIANTS[shapeKey]?.priceMultiplier ?? 1;
    return Math.round(BASE_PRICE * materialMultiplier * shapeMultiplier);
  }, [currentPreset, shapeKey]);

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

    const materialPreset = MATERIAL_PRESETS[currentMaterialKey] || MATERIAL_PRESETS.mate;

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
        const halfSize = scaledSize.clone().multiplyScalar(0.5);
        const offset = variant.engravingOffset ?? { x: 0, y: 0.2, z: 1.05 };
        textMesh.position.set(
          halfSize.x * (offset.x ?? 0),
          halfSize.y * (offset.y ?? 0),
          halfSize.z * (offset.z ?? 1.05),
        );
        textMesh.rotation.set(0, 0, 0);
        textMesh.scale.setScalar(uniformScale);
        textMesh.material.map.needsUpdate = true;
        group.add(textMesh);

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
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 80px 'Poppins', sans-serif";
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
    const textMaterial = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
    const textGeom = new THREE.PlaneGeometry(1.4, 0.45);
    const textMesh = new THREE.Mesh(textGeom, textMaterial);
    textMeshRef.current = textMesh;

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      if (shapeGroupRef.current) {
        shapeGroupRef.current.rotation.y += 0.005;
      }
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
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
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
    updateTextTexture(engraving);
  }, [engraving]);

  useEffect(() => {
    loadShape(shapeKey, colorRef.current, materialKeyRef.current);
  }, [shapeKey, loadShape]);

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
        notes,
      },
      descripcion: `Modelo ${SHAPE_VARIANTS[shapeKey]?.label || shapeKey}. Grabado "${engraving}"`,
    });
  };

  return (
    <section className="container my-5">
      <div className="row g-4">
        <div className="col-12 col-lg-6">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h1 className="h4 mb-3">Configurá tu mate 3D</h1>
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
                <div className="form-text">Ajustá brillo y textura superficial.</div>
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

              <div className="mb-4">
                <label className="form-label">Notas adicionales</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Colores secundarios, packaging, etc."
                />
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
