import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ─── Constants ────────────────────────────────────────────────────────────────
const TUNNEL_L = 22;
const TUNNEL_H = 6;
const TUNNEL_D = 6;
const SL_Y     = 8;             // streamline seeds in Y
const SL_Z     = 8;             // streamline seeds in Z
const SL_TOTAL = SL_Y * SL_Z;  // 64 streamlines
const SL_STEPS = 200;           // path points per streamline

const INF_R_MAP = { car: 2.8, sphere: 2.3, box: 2.5, cylinder: 2.4 };
const CD_MAP    = { car: 0.28, sphere: 0.47, box: 0.96, cylinder: 0.82 };
const CL_MAP    = { car: 0.18, sphere: 0.01, box: 0.08, cylinder: 0.03 };

const halfL = TUNNEL_L / 2;
const halfH = TUNNEL_H / 2 - 0.1;
const halfD = TUNNEL_D / 2 - 0.1;

// ─── State ────────────────────────────────────────────────────────────────────
let windSpeed    = 2.0;
let showPressure = true;
let currentShape = 'car';
let baseCd       = 0.28;
let infR         = 2.8;

// ─── Renderer ─────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x05090f);
document.body.appendChild(renderer.domElement);

// ─── Scene ────────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.fog   = new THREE.FogExp2(0x05090f, 0.03);

// ─── Camera & controls ────────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 300);
camera.position.set(0, 7, 22);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance   = 5;
controls.maxDistance   = 60;

// ─── Lights ───────────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0x203050, 3.5));
const sun = new THREE.DirectionalLight(0xffd4a0, 2.5);
sun.position.set(8, 14, 6);
scene.add(sun);
const fill = new THREE.DirectionalLight(0x4080a0, 0.8);
fill.position.set(-5, 2, -8);
scene.add(fill);

// ─── Tunnel wireframe + floor ─────────────────────────────────────────────────
scene.add(new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(TUNNEL_L, TUNNEL_H, TUNNEL_D)),
  new THREE.LineBasicMaterial({ color: 0x1a5070, transparent: true, opacity: 0.55 })
));
const grid = new THREE.GridHelper(TUNNEL_L, 22, 0x0d2035, 0x0d2035);
grid.position.y = -(TUNNEL_H / 2);
scene.add(grid);

// ─── Inlet arrows ─────────────────────────────────────────────────────────────
const arrowHelpers = [];
const arrowDir = new THREE.Vector3(1, 0, 0);
let arrowBaseOpacity = 0.5;

for (let yi = 0; yi < 3; yi++) {
  for (let zi = 0; zi < 3; zi++) {
    const arrow = new THREE.ArrowHelper(
      arrowDir,
      new THREE.Vector3(-halfL, (yi / 2 - 0.5) * (TUNNEL_H - 2), (zi / 2 - 0.5) * (TUNNEL_D - 2)),
      1.5, 0x4db8e0, 0.42, 0.22
    );
    arrow.line.material.transparent = true;
    arrow.cone.material.transparent = true;
    arrowHelpers.push(arrow);
    scene.add(arrow);
  }
}

function updateArrows() {
  const t       = (windSpeed - 0.5) / 4.5;
  const len     = 0.5 + windSpeed * 0.42;
  const headLen = Math.min(len * 0.28, 0.55);
  arrowBaseOpacity = 0.2 + t * 0.78;
  const color = new THREE.Color().setHSL(0.58 - t * 0.08, 1.0, 0.5 + t * 0.14);
  for (const a of arrowHelpers) {
    a.setLength(len, headLen, headLen * 0.55);
    a.setColor(color);
  }
}
updateArrows();

// ─── Car geometry ─────────────────────────────────────────────────────────────
function buildCarShape() {
  const s = new THREE.Shape();
  s.moveTo(-1.75, -0.35);
  s.lineTo( 1.75, -0.35); s.lineTo( 1.75,  0.12);
  s.lineTo( 1.52,  0.32); s.lineTo( 1.08,  0.52);
  s.lineTo( 0.60,  0.82); s.lineTo(-0.28,  0.85);
  s.lineTo(-0.62,  0.70); s.lineTo(-1.10,  0.28);
  s.lineTo(-1.58,  0.16); s.lineTo(-1.75,  0.04);
  s.lineTo(-1.75, -0.35);
  return s;
}

function createCar() {
  const g = new THREE.Group();
  const bodyGeo = new THREE.ExtrudeGeometry(buildCarShape(), { depth: 1.4, bevelEnabled: false });
  bodyGeo.center();
  g.add(new THREE.Mesh(bodyGeo,
    new THREE.MeshStandardMaterial({ color: 0xcc2200, metalness: 0.5, roughness: 0.42 })));

  const wGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.22, 18);
  const rGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.24, 8);
  const wMat = new THREE.MeshStandardMaterial({ color: 0x0e0e0e, metalness: 0.1,  roughness: 0.85 });
  const rMat = new THREE.MeshStandardMaterial({ color: 0xc8c8c8, metalness: 0.85, roughness: 0.18 });

  for (const [x, z] of [[-1.05, -0.82], [-1.05, 0.82], [1.05, -0.82], [1.05, 0.82]]) {
    const w = new THREE.Mesh(wGeo, wMat);
    w.rotation.x = Math.PI / 2; w.position.set(x, -0.6, z); g.add(w);
    const r = new THREE.Mesh(rGeo, rMat);
    r.rotation.x = Math.PI / 2; r.position.set(x, -0.6, z); g.add(r);
  }
  return g;
}

// ─── Obstacle management ──────────────────────────────────────────────────────
let obstacle = null;

function setObstacle(shape) {
  if (obstacle) scene.remove(obstacle);
  currentShape = shape;
  baseCd = CD_MAP[shape] ?? 0.47;
  infR   = INF_R_MAP[shape] ?? 2.3;

  if (shape === 'car') {
    obstacle = createCar();
  } else {
    const geo =
      shape === 'box'      ? new THREE.BoxGeometry(1.8, 1.8, 1.8)
    : shape === 'cylinder' ? new THREE.CylinderGeometry(0.85, 0.85, 2.4, 28)
    :                        new THREE.SphereGeometry(1.0, 36, 28);
    obstacle = new THREE.Mesh(geo,
      new THREE.MeshStandardMaterial({ color: 0xdd3311, metalness: 0.35, roughness: 0.5 }));
  }
  scene.add(obstacle);
  traceAllStreamlines();
}

// ─── Velocity field ───────────────────────────────────────────────────────────
function velocityAt(px, py, pz) {
  let vx = windSpeed, vy = 0, vz = 0;
  const dist = Math.sqrt(px*px + py*py + pz*pz);
  if (dist < infR && dist > 0.01) {
    const t = 1 - dist / infR;
    const f = t * t * 6.0;
    vy += (py / dist) * f;
    vz += (pz / dist) * f;
    if (px < 0) vx -= t * 2.2;
  }
  return [vx, vy, vz];
}

// ─── Streamlines — pre-allocated ──────────────────────────────────────────────
const slPos    = [];  // Float32Array per line (positions, static per retrace)
const slSpeeds = [];  // Float32Array per line (lateral speed per step)
const slColors = [];  // Float32Array per line (updated each frame)
const slLines  = [];  // THREE.Line objects

const slMat = new THREE.LineBasicMaterial({
  vertexColors: true, transparent: true, opacity: 0.9,
  blending: THREE.AdditiveBlending, depthWrite: false,
});

for (let i = 0; i < SL_TOTAL; i++) {
  const positions = new Float32Array(SL_STEPS * 3);
  const colors    = new Float32Array(SL_STEPS * 3);
  const geo       = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
  const line = new THREE.Line(geo, slMat);
  scene.add(line);
  slPos.push(positions);
  slSpeeds.push(new Float32Array(SL_STEPS));
  slColors.push(colors);
  slLines.push(line);
}

function traceAllStreamlines() {
  const stepSize = TUNNEL_L / SL_STEPS;
  const ySpan    = 2 * halfH - 1.0;
  const zSpan    = 2 * halfD - 1.0;
  let idx = 0;

  for (let yi = 0; yi < SL_Y; yi++) {
    for (let zi = 0; zi < SL_Z; zi++) {
      const seedY = -halfH + 0.5 + yi * ySpan / (SL_Y - 1);
      const seedZ = -halfD + 0.5 + zi * zSpan / (SL_Z - 1);

      const positions = slPos[idx];
      const speeds    = slSpeeds[idx];
      let x = -halfL + 0.1, y = seedY, z = seedZ;

      for (let s = 0; s < SL_STEPS; s++) {
        positions[s*3]   = x;
        positions[s*3+1] = y;
        positions[s*3+2] = z;

        const [vx, vy, vz] = velocityAt(x, y, z);
        speeds[s] = Math.sqrt(vy*vy + vz*vz);

        const vmag = Math.sqrt(vx*vx + vy*vy + vz*vz) || windSpeed;
        x += (vx / vmag) * stepSize;
        y  = Math.max(-halfH, Math.min(halfH, y + (vy / vmag) * stepSize * 0.4));
        z  = Math.max(-halfD, Math.min(halfD, z + (vz / vmag) * stepSize * 0.4));

        if (x >= halfL) {
          for (let r = s + 1; r < SL_STEPS; r++) {
            positions[r*3] = x; positions[r*3+1] = y; positions[r*3+2] = z;
            speeds[r] = 0;
          }
          break;
        }
      }

      slLines[idx].geometry.attributes.position.needsUpdate = true;
      idx++;
    }
  }
}

// ─── Color animation (every frame) ────────────────────────────────────────────
const _c = new THREE.Color();

function updateStreamlineColors(time) {
  const maxLat = windSpeed * 0.9 + 0.01;
  // Pulse phase travels downstream (increasing s) as time increases
  const phase  = time * windSpeed * 1.5;
  const kFreq  = 0.22; // radians per step — controls spacing of bright slugs

  for (let i = 0; i < SL_TOTAL; i++) {
    const speeds = slSpeeds[i];
    const colors = slColors[i];
    // Stagger each streamline's phase so they don't all pulse in lockstep
    const phaseOff = (i / SL_TOTAL) * Math.PI * 2;

    for (let s = 0; s < SL_STEPS; s++) {
      const normSpeed = Math.min(speeds[s] / maxLat, 1.0);
      const pulse     = 0.4 + 0.6 * Math.max(0, Math.sin(phase - s * kFreq + phaseOff));

      if (showPressure) {
        // Blue (slow) → cyan → green → yellow → red (fast), CFD convention
        _c.setHSL(0.62 - normSpeed * 0.62, 1.0, (0.22 + 0.38 * normSpeed) * pulse);
      } else {
        const b = 0.55 * pulse;
        _c.setRGB(0.25 * b, 0.55 * b, b);
      }

      colors[s*3] = _c.r; colors[s*3+1] = _c.g; colors[s*3+2] = _c.b;
    }

    slLines[i].geometry.attributes.color.needsUpdate = true;
  }
}

// ─── Aerodynamic metrics ──────────────────────────────────────────────────────
let wakeSmooth = 0;

function updateMetrics() {
  let sum = 0, cnt = 0;
  for (let i = 0; i < SL_TOTAL; i++) {
    const pos    = slPos[i];
    const speeds = slSpeeds[i];
    for (let s = 0; s < SL_STEPS; s++) {
      const px = pos[s*3];
      if (px > 1.2 && px < 5.0) {
        const py = pos[s*3+1], pz = pos[s*3+2];
        if (py*py + pz*pz < 5.5) { sum += speeds[s]; cnt++; }
      }
    }
  }
  wakeSmooth = wakeSmooth * 0.92 + (cnt > 0 ? sum / cnt : 0) * 0.08;

  const wakeMod    = Math.min(wakeSmooth / (windSpeed * 0.6 + 0.01), 0.20);
  const Cd         = Math.min(baseCd * (1 + wakeMod), 1.25);
  const efficiency = Math.max(0, Math.round((1 - (Cd - 0.04) / 1.16) * 100));
  const topSpeed   = Math.round(200 * Math.pow(0.28 / Cd, 1 / 3));
  const downforce  = Math.round((CL_MAP[currentShape] ?? 0.01) * windSpeed * windSpeed * 60);

  document.getElementById('metCd').textContent    = Cd.toFixed(2);
  document.getElementById('metEff').textContent   = efficiency + '%';
  document.getElementById('metSpeed').textContent = topSpeed + ' km/h';
  document.getElementById('metDown').textContent  = downforce + ' N';
}

// ─── Initial build ────────────────────────────────────────────────────────────
setObstacle('car');

// ─── Render loop ──────────────────────────────────────────────────────────────
let frameCount = 0;

(function loop() {
  requestAnimationFrame(loop);
  const now = performance.now();
  frameCount++;

  updateStreamlineColors(now * 0.001);

  // Inlet arrow pulse scales with wind speed
  const pulse = 0.72 + 0.28 * Math.abs(Math.sin(now * 0.001 * (0.5 + windSpeed * 0.4)));
  for (const a of arrowHelpers) {
    a.line.material.opacity = arrowBaseOpacity * pulse;
    a.cone.material.opacity = arrowBaseOpacity * pulse;
  }

  if (frameCount % 8 === 0) updateMetrics();

  controls.update();
  renderer.render(scene, camera);
})();

// ─── UI events ────────────────────────────────────────────────────────────────
document.getElementById('windSpeed').addEventListener('input', e => {
  windSpeed = parseFloat(e.target.value);
  document.getElementById('windSpeedVal').textContent = windSpeed.toFixed(1);
  updateArrows();
  traceAllStreamlines();
});

document.getElementById('obstacleShape').addEventListener('change', e => {
  setObstacle(e.target.value);
});

document.getElementById('showPressure').addEventListener('change', e => {
  showPressure = e.target.checked;
  document.getElementById('legend').style.opacity = showPressure ? '1' : '0.3';
});

document.getElementById('resetBtn').addEventListener('click', () => {
  traceAllStreamlines();
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
