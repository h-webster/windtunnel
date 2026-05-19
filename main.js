import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

// ─── Constants ────────────────────────────────────────────────────────────────
const TUNNEL_L = 11;
const TUNNEL_H = 6;
const TUNNEL_D = 4;
const SL_STEPS = 200; 

const CD_MAP = { car: 0.28, sphere: 0.47, box: 0.96, cylinder: 0.82 };
const CL_MAP = { car: 0.18, sphere: 0.01, box: 0.08, cylinder: 0.03 };

const halfL = TUNNEL_L / 2;
const halfH = TUNNEL_H / 2 - 0.1;
const halfD = TUNNEL_D / 2 - 0.1;

// ─── State ────────────────────────────────────────────────────────────────────
let windSpeed    = 2.0;
let showPressure = true;
let currentShape = 'car';
let baseCd       = 0.28;
let SL_Y         = 12; 
let SL_Z         = 12; 
let SL_TOTAL     = SL_Y * SL_Z;

// ─── Raycasting Setup for Geometry Interaction ────────────────────────────────
const raycaster = new THREE.Raycaster();
const maxRayDist = 2.5; 
const rayDir = new THREE.Vector3(1, 0, 0); 

// ─── Renderer ─────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x05090f);
document.body.appendChild(renderer.domElement);

// ─── Scene ────────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x05090f, 0.03);

// ─── Camera & controls ────────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 300);
camera.position.set(0, 7, 22);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;

// ─── Lights ───────────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0x203050, 3.5));
const sun = new THREE.DirectionalLight(0xffd4a0, 2.5);
sun.position.set(8, 14, 6);
const undersun = new THREE.DirectionalLight(0xffd4a0, 2.5);
sun.position.set(8, 0, 6);
scene.add(sun);
scene.add(undersun);

// ─── Tunnel Wireframe ─────────────────────────────────────────────────────────
scene.add(new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(TUNNEL_L, TUNNEL_H, TUNNEL_D)),
  new THREE.LineBasicMaterial({ color: 0x1a5070, transparent: true, opacity: 0.3 })
));

// ─── Obstacle management ──────────────────────────────────────────────────────
let obstacle = null;
let raycastTargets = []; 

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

function setObstacle(shape) {
  if (obstacle) scene.remove(obstacle);
  currentShape = shape;
  baseCd = CD_MAP[shape] ?? 0.47;
  raycastTargets = [];

  if (shape === 'car') {
    obstacle = new THREE.Group();
    const bodyGeo = new THREE.ExtrudeGeometry(buildCarShape(), { depth: 1.4, bevelEnabled: false });
    bodyGeo.center();
    const bodyMesh = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({ color: 0xcc2200, metalness: 0.5, roughness: 0.42 }));
    obstacle.add(bodyMesh);
    raycastTargets.push(bodyMesh); 

    const wGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.22, 12);
    const wMat = new THREE.MeshStandardMaterial({ color: 0x0e0e0e });
    for (const [x, z] of [[-1.05, -0.82], [-1.05, 0.82], [1.05, -0.82], [1.05, 0.82]]) {
      const w = new THREE.Mesh(wGeo, wMat);
      w.rotation.x = Math.PI / 2; w.position.set(x, -0.6, z); 
      obstacle.add(w);
      raycastTargets.push(w); 
    }
  } else {
    const geo =
        shape === 'box'      ? new THREE.BoxGeometry(1.8, 1.8, 1.8)
      : shape === 'cylinder' ? new THREE.CylinderGeometry(0.85, 0.85, 2.4, 24)
      :                        new THREE.SphereGeometry(1.0, 24, 24);
    
    obstacle = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xdd3311, metalness: 0.35, roughness: 0.5 }));
    raycastTargets.push(obstacle);
  }
  
  scene.add(obstacle);
  traceAllStreamlines();
}

// ─── Streamlines Setup ────────────────────────────────────────────────────────
let slPos = [], slSpeeds = [], slColors = [], slLines = [];
const slMat = new LineMaterial({
  vertexColors: true,
  transparent: true,
  opacity: 0.85,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  linewidth: 4.0, // Control girth in screenspace pixels here
});

slMat.resolution.set(window.innerWidth, window.innerHeight);

function initStreamlines() {
  if (slLines.length > 0) {
    for (const line of slLines) { scene.remove(line); line.geometry.dispose(); }
  }
  slPos = []; slSpeeds = []; slColors = []; slLines = [];
  
  for (let i = 0; i < SL_TOTAL; i++) {
    const positions = new Float32Array(SL_STEPS * 3);
    const colors    = new Float32Array(SL_STEPS * 3);

    // FIX 1: Provide a dummy distribution sequence so bounding computations don't collapse to (0,0,0)
    for(let s=0; s < SL_STEPS; s++) {
      positions[s*3] = -halfL + (s * (TUNNEL_L / SL_STEPS));
    }

    const geo = new LineGeometry();
    geo.setPositions(positions); 
    geo.setColors(colors);

    // FIX 2: Completely removed standard geo.setAttribute methods which conflicted with LineGeometry internals
    
    const line = new Line2(geo, slMat);
    // Tell the renderer not to drop lines outside early zero bounds
    line.computeLineDistances();
    
    scene.add(line);
    slPos.push(positions);
    slSpeeds.push(new Float32Array(SL_STEPS));
    slColors.push(colors);
    slLines.push(line);
  } 
}

// ─── Raycast-Based Real Geometry Interaction Math ────────────────────────────
const originVec = new THREE.Vector3();

function velocityAtGeometry(px, py, pz) {
  let vx = windSpeed;
  let vy = 0;
  let vz = 0;

  originVec.set(px, py, pz);
  raycaster.set(originVec, rayDir);
  raycaster.far = maxRayDist;

  const intersections = raycaster.intersectObjects(raycastTargets);

  if (intersections.length > 0) {
    const hit = intersections[0];
    const distance = hit.distance;

    if (hit.face) {
      const normal = hit.face.normal.clone();
      normal.transformDirection(hit.object.matrixWorld);
      const proximityFactor = Math.pow(1.0 - (distance / maxRayDist), 2);
      
      vx -= proximityFactor * windSpeed * 0.75; 
      vy += normal.y * proximityFactor * windSpeed * 2.5;
      vz += normal.z * proximityFactor * windSpeed * 2.5;
    }
  }

  return [vx, vy, vz];
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

        const [vx, vy, vz] = velocityAtGeometry(x, y, z);
        speeds[s] = Math.sqrt(vy*vy + vz*vz);

        const vmag = Math.sqrt(vx*vx + vy*vy + vz*vz) || windSpeed;
        
        x += (vx / vmag) * stepSize;
        let nextY = y + (vy / vmag) * stepSize * 0.5;
        let nextZ = z + (vz / vmag) * stepSize * 0.5;

        if (x > 0.5) {
          const recoveryFactor = Math.min(1.0, (x - 0.5) / halfL) * 0.15; 
          nextY += (seedY - nextY) * recoveryFactor;
          nextZ += (seedZ - nextZ) * recoveryFactor;
        }

        y = Math.max(-halfH, Math.min(halfH, nextY));
        z = Math.max(-halfD, Math.min(halfD, nextZ));

        if (x >= halfL) {
          for (let r = s + 1; r < SL_STEPS; r++) {
            positions[r*3] = x; positions[r*3+1] = y; positions[r*3+2] = z;
            speeds[r] = 0;
          }
          break;
        }
      }

      // Explicitly pipe our calculations directly into the active render buffer structure
      slLines[idx].geometry.setPositions(positions);
      idx++;
    }
  }
}

// ─── Color animation (every frame) ────────────────────────────────────────────
const _c = new THREE.Color();
function updateStreamlineColors(time) {
  const maxLat = windSpeed * 1.2 + 0.01;
  const phase  = time * windSpeed * 1.5;
  const kFreq  = 0.22;

  for (let i = 0; i < SL_TOTAL; i++) {
    const speeds = slSpeeds[i];
    const colors = slColors[i];
    const phaseOff = (i / SL_TOTAL) * Math.PI * 2;

    for (let s = 0; s < SL_STEPS; s++) {
      const normSpeed = Math.min(speeds[s] / maxLat, 1.0);
      const pulse     = 0.4 + 0.6 * Math.max(0, Math.sin(phase - s * kFreq + phaseOff));

      if (showPressure) {
        _c.setHSL(0.62 - normSpeed * 0.62, 1.0, (0.22 + 0.38 * normSpeed) * pulse);
      } else {
        const b = 0.55 * pulse;
        _c.setRGB(0.25 * b, 0.55 * b, b);
      }
      colors[s*3] = _c.r; colors[s*3+1] = _c.g; colors[s*3+2] = _c.b;
    }
    slLines[i].geometry.setColors(colors);
  }
}

// ─── Aerodynamic metrics ──────────────────────────────────────────────────────
let wakeSmooth = 0;
function updateMetrics() {
  let sum = 0, cnt = 0;
  for (let i = 0; i < SL_TOTAL; i++) {
    const pos = slPos[i];
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

  const wakeMod    = Math.min(wakeSmooth / (windSpeed * 0.6 + 0.01), 0.25);
  const Cd         = Math.min(baseCd * (1 + wakeMod), 1.35);
  const efficiency = Math.max(0, Math.round((1 - (Cd - 0.04) / 1.25) * 100));
  const topSpeed   = Math.round(200 * Math.pow(0.28 / Cd, 1 / 3));
  const downforce  = Math.round((CL_MAP[currentShape] ?? 0.01) * windSpeed * windSpeed * 60);

  if(document.getElementById('metCd')) document.getElementById('metCd').textContent = Cd.toFixed(2);
  if(document.getElementById('metEff')) document.getElementById('metEff').textContent = efficiency + '%';
  if(document.getElementById('metSpeed')) document.getElementById('metSpeed').textContent = topSpeed + ' km/h';
  if(document.getElementById('metDown')) document.getElementById('metDown').textContent = downforce + ' N';
}

// ─── Initial execution sequence ──────────────────────────────────────────────
initStreamlines();
setObstacle('car');

// ─── Render loop ──────────────────────────────────────────────────────────────
let frameCount = 0;
(function loop() {
  requestAnimationFrame(loop);
  const now = performance.now();
  frameCount++;

  updateStreamlineColors(now * 0.001);
  if (frameCount % 6 === 0) updateMetrics();

  controls.update();
  renderer.render(scene, camera);
})();

// ─── UI events ────────────────────────────────────────────────────────────────
document.getElementById('windSpeed')?.addEventListener('input', e => {
  windSpeed = parseFloat(e.target.value);
  if(document.getElementById('windSpeedVal')) document.getElementById('windSpeedVal').textContent = windSpeed.toFixed(1);
  traceAllStreamlines();
});

document.getElementById('streamlines')?.addEventListener('input', e => {
  SL_Y = parseInt(e.target.value);
  SL_Z = SL_Y;
  SL_TOTAL = SL_Y * SL_Z;
  if(document.getElementById('streamlinesVal')) document.getElementById('streamlinesVal').textContent = SL_Z;
  initStreamlines();
  traceAllStreamlines();
});

document.getElementById('obstacleShape')?.addEventListener('change', e => {
  setObstacle(e.target.value);
});

document.getElementById('showPressure')?.addEventListener('change', e => {
  showPressure = e.target.checked;
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  slMat.resolution.set(window.innerWidth, window.innerHeight);
});