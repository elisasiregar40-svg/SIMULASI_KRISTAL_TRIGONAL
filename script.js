const canvas = document.getElementById('c');

if (typeof THREE === 'undefined') {
  alert('Three.js tidak dimuat. Pastikan file three.min.js ada di folder proyek.');
  throw new Error('THREE not found');
}

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0x06101f, 1);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x06101f);
scene.fog = new THREE.FogExp2(0x06101f, 0.025);

const camera = new THREE.PerspectiveCamera(45, 2, 0.1, 1000);
camera.position.set(8, 7, 10);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.rotateSpeed = 0.7;
controls.minDistance = 3;
controls.maxDistance = 35;

const light = new THREE.DirectionalLight(0xe8f6ff, 1.2);
light.position.set(8, 12, 8);
scene.add(light);

const light2 = new THREE.PointLight(0x7dcfff, 0.7, 40);
light2.position.set(-8, 7, 10);
scene.add(light2);

scene.add(new THREE.AmbientLight(0xabcde5, 0.45));

const ground = new THREE.GridHelper(18, 18, 0x2b4c78, 0x13233a);
ground.position.y = -0.02;
scene.add(ground);

let cellGroup = new THREE.Group();
let atomGroup = new THREE.Group();
let faceGroup = new THREE.Group();
let axesGroup = new THREE.Group();
let labelGroup = new THREE.Group();
let pointGroup = new THREE.Group();

scene.add(cellGroup);
scene.add(faceGroup);
scene.add(atomGroup);
scene.add(axesGroup);
scene.add(labelGroup);
scene.add(pointGroup);

const edgeMaterial = new THREE.LineBasicMaterial({
  color: 0x8fd3ff,
  transparent: true,
  opacity: 0.95
});

const pointMaterial = new THREE.MeshBasicMaterial({
  color: 0xffffff
});

const atomMaterials = {
  A: new THREE.MeshPhysicalMaterial({
    color: 0xd6a84a,
    metalness: 0.28,
    roughness: 0.22,
    clearcoat: 0.6
  }),
  B: new THREE.MeshPhysicalMaterial({
    color: 0x58bdf7,
    metalness: 0.18,
    roughness: 0.28,
    clearcoat: 0.5
  })
};

function degToRad(deg) {
  return deg * Math.PI / 180;
}

function makeLine(a, b, color = 0x8fd3ff) {
  const geom = new THREE.BufferGeometry().setFromPoints([a, b]);
  const mat = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.95
  });
  return new THREE.Line(geom, mat);
}

function makeTextSprite(text, color = '#ffffff') {
  const canvasText = document.createElement('canvas');
  const ctx = canvasText.getContext('2d');
  canvasText.width = 512;
  canvasText.height = 160;

  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.roundRect(10, 20, 492, 100, 18);
  ctx.fill();

  ctx.font = 'bold 48px Arial';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 70);

  const texture = new THREE.CanvasTexture(canvasText);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true
  });

  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.25, 0.38, 1);
  return sprite;
}

function fractionalToCartesian(frac, a, c, alphaDeg, betaDeg, gammaDeg) {
  const alpha = degToRad(alphaDeg);
  const beta = degToRad(betaDeg);
  const gamma = degToRad(gammaDeg);

  const ax = a;
  const ay = 0;
  const az = 0;

  const bx = a * Math.cos(gamma);
  const by = a * Math.sin(gamma);
  const bz = 0;

  const cx = c * Math.cos(beta);
  const cy = c * (Math.cos(alpha) - Math.cos(beta) * Math.cos(gamma)) / Math.sin(gamma);
  const cz = Math.sqrt(Math.max(c * c - cx * cx - cy * cy, 0.0001));

  const a1 = new THREE.Vector3(ax, ay, az);
  const a2 = new THREE.Vector3(bx, by, bz);
  const a3 = new THREE.Vector3(cx, cy, cz);

  return new THREE.Vector3()
    .addScaledVector(a1, frac.x)
    .addScaledVector(a2, frac.y)
    .addScaledVector(a3, frac.z);
}

function buildCell(a, c, alpha, beta, gamma) {
  const corners = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(1, 1, 0),
    new THREE.Vector3(1, 0, 1),
    new THREE.Vector3(0, 1, 1),
    new THREE.Vector3(1, 1, 1)
  ];

  const edgePairs = [
    [0, 1], [0, 2], [0, 3],
    [1, 4], [1, 5],
    [2, 4], [2, 6],
    [3, 5], [3, 6],
    [4, 7], [5, 7], [6, 7]
  ];

  const lines = new THREE.Group();

  edgePairs.forEach(([i, j]) => {
    lines.add(makeLine(
      fractionalToCartesian(corners[i], a, c, alpha, beta, gamma),
      fractionalToCartesian(corners[j], a, c, alpha, beta, gamma)
    ));
  });

  return lines;
}

function buildPlane(a, c, alpha, beta, gamma, indices) {
  const points = indices.map(i =>
    fractionalToCartesian(new THREE.Vector3(...i), a, c, alpha, beta, gamma)
  );

  const material = new THREE.MeshBasicMaterial({
    color: 0x4f7fd8,
    transparent: true,
    opacity: 0.08,
    side: THREE.DoubleSide
  });

  const geometry = new THREE.BufferGeometry();
  const verts = new Float32Array([].concat(...points.map(p => [p.x, p.y, p.z])));
  geometry.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);

  return new THREE.Mesh(geometry, material);
}

function addAxesLabels(a, c, alpha, beta, gamma) {
  axesGroup.clear();

  const origin = new THREE.Vector3(0, 0, 0);
  const aEnd = fractionalToCartesian(new THREE.Vector3(1.3, 0, 0), a, c, alpha, beta, gamma);
  const bEnd = fractionalToCartesian(new THREE.Vector3(0, 1.3, 0), a, c, alpha, beta, gamma);
  const cEnd = fractionalToCartesian(new THREE.Vector3(0, 0, 1.3), a, c, alpha, beta, gamma);

  axesGroup.add(makeLine(origin, aEnd, 0xff8c00));
  axesGroup.add(makeLine(origin, bEnd, 0x238bff));
  axesGroup.add(makeLine(origin, cEnd, 0x59ff3b));

  const labelA = makeTextSprite('Sumbu a', '#ffb15c');
  labelA.position.copy(aEnd.clone().multiplyScalar(1.05));
  axesGroup.add(labelA);

  const labelB = makeTextSprite('Sumbu b', '#5db4ff');
  labelB.position.copy(bEnd.clone().multiplyScalar(1.05));
  axesGroup.add(labelB);

  const labelC = makeTextSprite('Sumbu c', '#79ff68');
  labelC.position.copy(cEnd.clone().multiplyScalar(1.05));
  axesGroup.add(labelC);
}

function addCornerPointsAndLabels(a, c, alpha, beta, gamma) {
  pointGroup.clear();

  const corners = [
    [0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1],
    [1, 1, 0], [1, 0, 1], [0, 1, 1], [1, 1, 1]
  ];

  corners.forEach((corner, index) => {
    const pos = fractionalToCartesian(new THREE.Vector3(...corner), a, c, alpha, beta, gamma);

    const point = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 16, 12),
      pointMaterial
    );
    point.position.copy(pos);
    pointGroup.add(point);

    const label = makeTextSprite(`P${index + 1}`, '#ffffff');
    label.position.copy(pos.clone().add(new THREE.Vector3(0.15, 0.15, 0.15)));
    pointGroup.add(label);
  });
}

function addAngleLabels(a, c, alpha, beta, gamma) {
  const alphaLabel = makeTextSprite(`α = ${alpha}°`, '#ffffff');
  alphaLabel.position.copy(fractionalToCartesian(new THREE.Vector3(0.15, 0.85, 0.2), a, c, alpha, beta, gamma));
  labelGroup.add(alphaLabel);

  const betaLabel = makeTextSprite(`β = ${beta}°`, '#ffffff');
  betaLabel.position.copy(fractionalToCartesian(new THREE.Vector3(0.85, 0.15, 0.2), a, c, alpha, beta, gamma));
  labelGroup.add(betaLabel);

  const gammaLabel = makeTextSprite(`γ = ${gamma}°`, '#ffffff');
  gammaLabel.position.copy(fractionalToCartesian(new THREE.Vector3(0.55, 0.55, 0.05), a, c, alpha, beta, gamma));
  labelGroup.add(gammaLabel);
}

function buildTrigonal(a, c, alpha, beta, gamma, atomRadius) {
  cellGroup.clear();
  atomGroup.clear();
  faceGroup.clear();
  labelGroup.clear();
  pointGroup.clear();

  cellGroup.add(buildCell(a, c, alpha, beta, gamma));

  const faceIndices = [
    [[0,0,0],[1,0,0],[1,1,0],[0,1,0]],
    [[0,0,0],[1,0,0],[1,0,1],[0,0,1]],
    [[0,0,0],[0,1,0],[0,1,1],[0,0,1]],
    [[1,1,1],[1,0,1],[1,0,0],[1,1,0]],
    [[1,1,1],[0,1,1],[0,1,0],[1,1,0]],
    [[1,1,1],[0,1,1],[0,0,1],[1,0,1]]
  ];

  faceIndices.forEach(face => {
    faceGroup.add(buildPlane(a, c, alpha, beta, gamma, face));
  });

  const sphereGeom = new THREE.SphereGeometry(Math.max(atomRadius, 0.08), 32, 24);

  const basis = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(2 / 3, 1 / 3, 1 / 2)
  ];

  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      for (let k = -1; k <= 1; k++) {
        basis.forEach((site, idx) => {
          const frac = new THREE.Vector3(site.x + i, site.y + j, site.z + k);
          const pos = fractionalToCartesian(frac, a, c, alpha, beta, gamma);

          const sphere = new THREE.Mesh(sphereGeom, idx === 0 ? atomMaterials.A : atomMaterials.B);
          sphere.position.copy(pos);

          const glow = new THREE.PointLight(idx === 0 ? 0xd6a84a : 0x58bdf7, 0.12, a * 1.7);
          glow.position.copy(pos);

          atomGroup.add(glow);
          atomGroup.add(sphere);
        });
      }
    }
  }

  addAxesLabels(a, c, alpha, beta, gamma);
  addCornerPointsAndLabels(a, c, alpha, beta, gamma);
  addAngleLabels(a, c, alpha, beta, gamma);

  const center = fractionalToCartesian(new THREE.Vector3(0.5, 0.5, 0.5), a, c, alpha, beta, gamma);
  const radius = Math.max(a * 3.2, c * 2.5, 7);

  camera.position.set(radius, radius * 0.8, radius * 1.1);
  controls.target.copy(center);
  controls.update();
}

function resizeRendererToDisplaySize() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  const needResize =
    canvas.width !== Math.floor(width * window.devicePixelRatio) ||
    canvas.height !== Math.floor(height * window.devicePixelRatio);

  if (needResize) {
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
}

const aRange = document.getElementById('aRange');
const cRange = document.getElementById('cRange');
const alphaRange = document.getElementById('alphaRange');
const betaRange = document.getElementById('betaRange');
const gammaRange = document.getElementById('gammaRange');
const rRange = document.getElementById('rRange');

const aVal = document.getElementById('aVal');
const cVal = document.getElementById('cVal');
const alphaVal = document.getElementById('alphaVal');
const betaVal = document.getElementById('betaVal');
const gammaVal = document.getElementById('gammaVal');
const rVal = document.getElementById('rVal');

const dispA = document.getElementById('dispA');
const dispC = document.getElementById('dispC');
const dispAlpha = document.getElementById('dispAlpha');
const dispBeta = document.getElementById('dispBeta');
const dispGamma = document.getElementById('dispGamma');
const dispR = document.getElementById('dispR');

const showCell = document.getElementById('showCell');
const showAtoms = document.getElementById('showAtoms');
const showPlanes = document.getElementById('showPlanes');
const showAxes = document.getElementById('showAxes');
const showGrid = document.getElementById('showGrid');
const showLabels = document.getElementById('showLabels');

const resetBtn = document.getElementById('resetBtn');
const downloadBtn = document.getElementById('downloadBtn');
const siteStatus = document.getElementById('siteStatus');

function updateInfoBar() {
  const a = parseFloat(aRange.value);
  const c = parseFloat(cRange.value);
  const alpha = parseInt(alphaRange.value);
  const beta = parseInt(betaRange.value);
  const gamma = parseInt(gammaRange.value);
  const countAtoms = atomGroup.children.filter(o => o.isMesh).length;

  siteStatus.textContent =
    `A=${a.toFixed(2)} Å, C=${c.toFixed(2)} Å, α=${alpha}°, β=${beta}°, γ=${gamma}°, ${countAtoms} atom`;
}

function updateFromUI() {
  const a = parseFloat(aRange.value);
  const c = parseFloat(cRange.value);
  const alpha = parseInt(alphaRange.value);
  const beta = parseInt(betaRange.value);
  const gamma = parseInt(gammaRange.value);
  const r = parseFloat(rRange.value);

  aVal.textContent = a.toFixed(2);
  cVal.textContent = c.toFixed(2);
  alphaVal.textContent = alpha;
  betaVal.textContent = beta;
  gammaVal.textContent = gamma;
  rVal.textContent = r.toFixed(2);

  dispA.textContent = a.toFixed(2);
  dispC.textContent = c.toFixed(2);
  dispAlpha.textContent = alpha;
  dispBeta.textContent = beta;
  dispGamma.textContent = gamma;
  dispR.textContent = r.toFixed(2);

  buildTrigonal(a, c, alpha, beta, gamma, r);

  cellGroup.visible = showCell.checked;
  atomGroup.visible = showAtoms.checked;
  faceGroup.visible = showPlanes.checked;
  axesGroup.visible = showAxes.checked;
  ground.visible = showGrid.checked;
  labelGroup.visible = showLabels.checked;
  pointGroup.visible = showLabels.checked;

  updateInfoBar();
}

[aRange, cRange, alphaRange, betaRange, gammaRange, rRange].forEach(input => {
  input.addEventListener('input', updateFromUI);
});

[showCell, showAtoms, showPlanes, showAxes, showGrid, showLabels].forEach(input => {
  input.addEventListener('change', updateFromUI);
});

resetBtn.addEventListener('click', () => {
  updateFromUI();
});

downloadBtn.addEventListener('click', () => {
  try {
    const dataURL = renderer.domElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = `kristal_trigonal.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (e) {
    alert('Gagal mengekspor gambar.');
  }
});

window.addEventListener('resize', resizeRendererToDisplaySize);

updateFromUI();
resizeRendererToDisplaySize();

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

animate();