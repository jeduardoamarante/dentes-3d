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
  label.style.fontSize = "72px";
  label.style.fontWeight = "700";
  label.style.letterSpacing = "0.35em";
  label.style.textTransform = "uppercase";
  label.style.whiteSpace = "nowrap";
  label.style.color = "rgba(0,0,0,0.12)";
  label.style.textShadow = "0 2px 6px rgba(0,0,0,0.12)";

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

async function fileExists(url: string) {
  try {
    const r = await fetch(url);
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
}

/* =====================
   THREE.JS
===================== */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
view.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe2e2e2);

const modelGroup = new THREE.Group();
scene.add(modelGroup);

const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 1000);
camera.position.set(0,0,2.5);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

scene.add(new THREE.HemisphereLight(0xffffff,0x666666,1));
const dir = new THREE.DirectionalLight(0xffffff,1.2);
dir.position.set(3,5,4);
scene.add(dir);

const loader = new GLTFLoader();
let current: THREE.Object3D | null = null;

function resize() {
  const w = view.clientWidth;
  const h = view.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w,h);
  camera.aspect = w/h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);

function clearModel() {
  modelGroup.clear();
}

async function loadModel() {
  const url = `models/${toothSel.value}/${toothSel.value}_${varSel.value}.glb`;
  statusEl.textContent = `Carregando ${url}`;
  setProgress(0);

  clearModel();

  loader.load(
    url,
    (gltf: GLTF) => {
      current = gltf.scene;
      modelGroup.add(current);
      resize();
      setProgress(1);
      statusEl.textContent = "OK";
    },
    e => {
      if ((e as any).total)
        setProgress((e as any).loaded / (e as any).total);
    },
    () => statusEl.textContent = "Erro ao carregar"
  );
}

/* =====================
   UI EVENTS
===================== */
prevBtn.onclick = () => { varSel.selectedIndex--; loadModel(); };
nextBtn.onclick = () => { varSel.selectedIndex++; loadModel(); };
resetBtn.onclick = resize;
rotateBtn.onclick = () => controls.autoRotate = !controls.autoRotate;

toothSel.onchange = async () => {
  await populateVariantsForTooth(toothSel.value);
  loadModel();
};
varSel.onchange = loadModel;

/* =====================
   BOOT
===================== */
await populateTeeth();
await populateVariantsForTooth(toothSel.value);
resize();
loadModel();

/* =====================
   LOOP
===================== */
function animate() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();
