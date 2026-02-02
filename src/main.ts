import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

/* =====================
   BASE HTML
===================== */
const app = document.getElementById("app")!;
document.documentElement.style.height = "100%";
document.body.style.height = "100%";
document.body.style.margin = "0";

app.innerHTML = `
<div style="position:fixed; inset:0; display:flex; flex-direction:column;">
  <div style="padding:10px; display:flex; gap:8px; align-items:center; background:#fff; border-bottom:1px solid #ddd;">
    <button id="toothPrev">«</button>
    <label>Dente (FDI):</label>
    <select id="tooth"></select>
    <button id="toothNext">»</button>

    <label>Variação:</label>
    <select id="var"></select>

    <button id="prev">◀</button>
    <button id="next">▶</button>
    <button id="reset">Reset</button>
    <button id="rotate">Auto</button>

    <div id="barWrap" style="width:140px;height:8px;background:#eee;border-radius:999px;overflow:hidden;">
      <div id="bar" style="height:100%;width:0%;background:#4a90e2;"></div>
    </div>
    <span id="pct" style="font-size:12px;width:42px;text-align:right;">0%</span>

    <span id="status" style="margin-left:auto;font-size:12px;"></span>
  </div>

  <div id="view" style="flex:1; min-height:0;"></div>
</div>
`;

/* =====================
   WATERMARK ISNF / UFF
   (mais transparente)
===================== */
function ensureWatermark() {
  const old = document.getElementById("watermark");
  if (old) old.remove();

  const wrap = document.createElement("div");
  wrap.id = "watermark";
  wrap.style.position = "fixed";
  wrap.style.inset = "0";
  wrap.style.display = "flex";
  wrap.style.alignItems = "center";
  wrap.style.justifyContent = "center";
  wrap.style.pointerEvents = "none";
  wrap.style.zIndex = "999999";
  wrap.style.userSelect = "none";

  const label = document.createElement("div");
  label.textContent = "ISNF / UFF";
  label.style.transform = "rotate(-30deg)";
  label.style.fontFamily = "system-ui";
  label.style.fontSize = "48px";
  label.style.fontWeight = "700";
  label.style.letterSpacing = "0.35em";
  label.style.textTransform = "uppercase";
  label.style.whiteSpace = "nowrap";
  label.style.color = "rgba(0,0,0,0.04)"; // <<< MAIS TRANSPARENTE
  label.style.textShadow = "none";        // <<< tira sombra (escurece muito)

  wrap.appendChild(label);
  document.body.appendChild(wrap);
}
ensureWatermark();

/* =====================
   UI ELEMENTS
===================== */
const toothSel = document.getElementById("tooth") as HTMLSelectElement;
const varSel = document.getElementById("var") as HTMLSelectElement;
const statusEl = document.getElementById("status") as HTMLSpanElement;
const view = document.getElementById("view") as HTMLDivElement;

const toothPrevBtn = document.getElementById("toothPrev") as HTMLButtonElement;
const toothNextBtn = document.getElementById("toothNext") as HTMLButtonElement;
const prevBtn = document.getElementById("prev") as HTMLButtonElement;
const nextBtn = document.getElementById("next") as HTMLButtonElement;
const resetBtn = document.getElementById("reset") as HTMLButtonElement;
const rotateBtn = document.getElementById("rotate") as HTMLButtonElement;

const bar = document.getElementById("bar") as HTMLDivElement;
const pct = document.getElementById("pct") as HTMLSpanElement;

function setProgress(v: number) {
  const p = Math.max(0, Math.min(1, v));
  bar.style.width = `${Math.round(p * 100)}%`;
  pct.textContent = `${Math.round(p * 100)}%`;
}

/* =====================
   DATA
===================== */
const CANDIDATES = [
  11,12,13,14,15,16,17,
  21,22,23,24,25,26,27,
  31,32,33,34,35,36,37,
  41,42,43,44,45,46,47
];

// GitHub Pages: caminho relativo
async function fileExists(url: string) {
  try {
    const r = await fetch(url, { method: "GET" });
    return r.ok;
  } catch {
    return false;
  }
}

async function populateTeeth() {
  toothSel.innerHTML = "";
  for (const t of CANDIDATES) {
    if (await fileExists(`models/${t}/${t}_v01.glb`)) {
      const opt = document.createElement("option");
      opt.value = String(t);
      opt.textContent = String(t);
      toothSel.appendChild(opt);
    }
  }
}

async function populateVariantsForTooth(tooth: string) {
  varSel.innerHTML = "";
  for (let i = 1; i <= 12; i++) {
    const v = `v${String(i).padStart(2,"0")}`;
    if (await fileExists(`models/${tooth}/${tooth}_${v}.glb`)) {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v.toUpperCase();
      varSel.appendChild(opt);
    }
  }
  // fallback
  if (varSel.options.length === 0) {
    const opt = document.createElement("option");
    opt.value = "v01";
    opt.textContent = "V01";
    varSel.appendChild(opt);
  }
}

/* =====================
   THREE.JS
===================== */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.domElement.style.display = "block";
view.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe2e2e2);

const modelGroup = new THREE.Group();
scene.add(modelGroup);

const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 1000);
camera.position.set(0, 0, 2.5);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = true;
controls.screenSpacePanning = true;
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };

scene.add(new THREE.HemisphereLight(0xffffff, 0x666666, 1.0));

const dir = new THREE.DirectionalLight(0xffffff, 1.2);
dir.position.set(3, 5, 4);
scene.add(dir);

const rim = new THREE.DirectionalLight(0xffffff, 0.18);
rim.position.set(0, 2, -5);
scene.add(rim);

const fill = new THREE.DirectionalLight(0xffffff, 0.8);
fill.position.set(-3, 2, -4);
scene.add(fill);

const loader = new GLTFLoader();
let current: THREE.Object3D | null = null;
let loadSeq = 0;

function resize() {
  const w = view.clientWidth;
  const h = view.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  controls.update();
}
window.addEventListener("resize", resize);

function disposeObject(obj: THREE.Object3D) {
  obj.traverse((child: any) => {
    if (child.geometry) child.geometry.dispose?.();
    if (child.material) {
      const m = child.material;
      if (Array.isArray(m)) m.forEach((x) => x.dispose?.());
      else m.dispose?.();
    }
  });
}

function clearModelGroup() {
  while (modelGroup.children.length > 0) {
    const obj = modelGroup.children[0];
    modelGroup.remove(obj);
    disposeObject(obj);
  }
}

function fitCameraToObject(object: THREE.Object3D) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = THREE.MathUtils.degToRad(camera.fov);
  let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
  cameraZ *= 1.6;

  camera.position.set(center.x, center.y, center.z + cameraZ);
  camera.near = cameraZ / 100;
  camera.far = cameraZ * 100;
  camera.updateProjectionMatrix();
  camera.lookAt(center);

  controls.target.copy(center);
  controls.update();
}

async function loadModel() {
  const tooth = toothSel.value;
  const v = varSel.value;
  const url = `models/${tooth}/${tooth}_${v}.glb`;

  const mySeq = ++loadSeq;
  statusEl.textContent = `Carregando ${url}...`;
  setProgress(0);

  clearModelGroup();
  current = null;

  return new Promise<void>((resolve, reject) => {
    loader.load(
      url,
      (gltf: GLTF) => {
        if (mySeq !== loadSeq) return;

        current = gltf.scene;

        current.traverse((child: any) => {
          if (child.isMesh && child.material) {
            child.material.roughness = 0.75;
            child.material.metalness = 0.0;
          }
        });

        modelGroup.add(current);

        requestAnimationFrame(() => {
          resize();
          fitCameraToObject(current!); // <<< ESSENCIAL p/ aparecer
          setProgress(1);
        });

        statusEl.textContent = `OK: ${tooth} ${v.toUpperCase()}`;
        resolve();
      },
      (ev: ProgressEvent<EventTarget>) => {
        if (mySeq !== loadSeq) return;
        const anyEv = ev as any;
        const loaded = typeof anyEv.loaded === "number" ? anyEv.loaded : 0;
        const total = typeof anyEv.total === "number" ? anyEv.total : 0;
        if (total > 0) setProgress(loaded / total);
      },
      (err: unknown) => {
        if (mySeq !== loadSeq) return;
        setProgress(0);
        statusEl.textContent = `Não achei: ${url}`;
        reject(err);
      }
    );
  });
}

/* =====================
   UI EVENTS
===================== */
function stepVariant(delta: number) {
  const n = varSel.options.length;
  if (n <= 1) return;
  varSel.selectedIndex = (varSel.selectedIndex + delta + n) % n;
  loadModel().catch(() => {});
}

async function stepTooth(delta: number) {
  const n = toothSel.options.length;
  if (n <= 1) return;
  toothSel.selectedIndex = (toothSel.selectedIndex + delta + n) % n;
  await populateVariantsForTooth(toothSel.value);
  loadModel().catch(() => {});
}

prevBtn.onclick = () => stepVariant(-1);
nextBtn.onclick = () => stepVariant(+1);

resetBtn.onclick = () => {
  resize();
  if (current) fitCameraToObject(current);
};

rotateBtn.onclick = () => {
  controls.autoRotate = !controls.autoRotate;
  rotateBtn.textContent = controls.autoRotate ? "Auto: ON" : "Auto";
};

toothPrevBtn.onclick = () => stepTooth(-1);
toothNextBtn.onclick = () => stepTooth(+1);

toothSel.onchange = async () => {
  await populateVariantsForTooth(toothSel.value);
  loadModel().catch(() => {});
};
varSel.onchange = () => loadModel().catch(() => {});

/* =====================
   BOOT + LOOP
===================== */
await populateTeeth();
await populateVariantsForTooth(toothSel.value);

resize();
loadModel().catch(() => {});

function animate() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();
