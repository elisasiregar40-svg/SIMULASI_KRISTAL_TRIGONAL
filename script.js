const canvas = document.getElementById('c');

if(typeof THREE === 'undefined'){
	const overlay = document.createElement('div');
	overlay.className = 'overlay-msg';
	overlay.innerHTML = '<strong>Three.js tidak dimuat.</strong><br/>Periksa koneksi internet atau muat library lokal. Buka console (F12) untuk melihat error.';
	document.body.appendChild(overlay);
	throw new Error('THREE not found');
}

const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0x06101f, 1);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x06101f);
scene.fog = new THREE.FogExp2(0x06101f, 0.03);

const camera = new THREE.PerspectiveCamera(45, 2, 0.1, 1000);
camera.position.set(6, 6, 10);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.1;
controls.rotateSpeed = 0.7;
controls.minDistance = 3;
controls.maxDistance = 30;
controls.target.set(2.2, 1.6, 2.5);

const light = new THREE.DirectionalLight(0xe8f6ff, 1.1);
light.position.set(8, 12, 7);
scene.add(light);

const light2 = new THREE.PointLight(0x7dcfff, 0.6, 30);
light2.position.set(-8, 6, 10);
scene.add(light2);

scene.add(new THREE.AmbientLight(0xabcde5, 0.35));

const ground = new THREE.GridHelper(14, 14, 0x2b4c78, 0x122032);
ground.position.y = -0.02;
scene.add(ground);

const axes = new THREE.AxesHelper(4.5);
axes.material.depthTest = false;
axes.renderOrder = 999;
scene.add(axes);

let cellGroup = new THREE.Group();
let atomGroup = new THREE.Group();
let faceGroup = new THREE.Group();

scene.add(cellGroup, faceGroup, atomGroup);

const edgeMaterial = new THREE.LineBasicMaterial({
	color: 0x7dc8ff,
	transparent:true,
	opacity:0.9
});

const atomMaterials = {
	A: new THREE.MeshPhysicalMaterial({
		color:0xffb660,
		metalness:0.25,
		roughness:0.25,
		clearcoat:0.5
	}),
	B: new THREE.MeshPhysicalMaterial({
		color:0x75c8ff,
		metalness:0.15,
		roughness:0.3,
		clearcoat:0.4
	})
};

function makeLine(a,b){
	const geom = new THREE.BufferGeometry().setFromPoints([a,b]);
	return new THREE.Line(geom, edgeMaterial);
}

function degToRad(deg){
	return deg * Math.PI / 180;
}

function fractionalToCartesian(frac, a, c, alphaDeg, betaDeg, gammaDeg){
	const alpha = degToRad(alphaDeg);
	const beta = degToRad(betaDeg);
	const gamma = degToRad(gammaDeg);

	const b = a;

	const a1 = new THREE.Vector3(a, 0, 0);

	const a2 = new THREE.Vector3(
		b * Math.cos(gamma),
		b * Math.sin(gamma),
		0
	);

	const cx = c * Math.cos(beta);
	const cy = c * (Math.cos(alpha) - Math.cos(beta) * Math.cos(gamma)) / Math.sin(gamma);
	const cz = Math.sqrt(Math.max(c * c - cx * cx - cy * cy, 0));

	const a3 = new THREE.Vector3(cx, cy, cz);

	return new THREE.Vector3()
		.addScaledVector(a1, frac.x)
		.addScaledVector(a2, frac.y)
		.addScaledVector(a3, frac.z);
}

function buildCell(a,c,alpha,beta,gamma){
	const corners = [
		new THREE.Vector3(0,0,0),
		new THREE.Vector3(1,0,0),
		new THREE.Vector3(0,1,0),
		new THREE.Vector3(0,0,1),
		new THREE.Vector3(1,1,0),
		new THREE.Vector3(1,0,1),
		new THREE.Vector3(0,1,1),
		new THREE.Vector3(1,1,1)
	];

	const edgePairs = [
		[0,1],[0,2],[0,3],
		[1,4],[1,5],
		[2,4],[2,6],
		[3,5],[3,6],
		[4,7],[5,7],[6,7]
	];

	const lines = new THREE.Group();

	edgePairs.forEach(([i,j]) => {
		lines.add(makeLine(
			fractionalToCartesian(corners[i], a, c, alpha, beta, gamma),
			fractionalToCartesian(corners[j], a, c, alpha, beta, gamma)
		));
	});

	return lines;
}

function buildPlane(a,c,alpha,beta,gamma,indices){
	const points = indices.map(i => fractionalToCartesian(
		new THREE.Vector3(...i),
		a,
		c,
		alpha,
		beta,
		gamma
	));

	const geometry = new THREE.BufferGeometry();
	const material = new THREE.MeshBasicMaterial({
		color:0x4f7fd8,
		transparent:true,
		opacity:0.08,
		side:THREE.DoubleSide
	});

	const verts = new Float32Array([].concat(...points.map(p => [p.x,p.y,p.z])));
	geometry.setAttribute('position', new THREE.BufferAttribute(verts, 3));
	geometry.setIndex([0,1,2,0,2,3]);

	return new THREE.Mesh(geometry, material);
}

function buildTrigonal(a,c,atomRadius,alpha,beta,gamma){
	cellGroup.clear();
	atomGroup.clear();
	faceGroup.clear();

	cellGroup.add(buildCell(a,c,alpha,beta,gamma));

	const faceIndices = [
		[[0,0,0],[1,0,0],[1,1,0],[0,1,0]],
		[[0,0,0],[1,0,0],[1,0,1],[0,0,1]],
		[[0,0,0],[0,1,0],[0,1,1],[0,0,1]],
		[[1,1,1],[1,0,1],[1,0,0],[1,1,0]],
		[[1,1,1],[0,1,1],[0,1,0],[1,1,0]],
		[[1,1,1],[0,1,1],[0,0,1],[1,0,1]]
	];

	faceIndices.forEach(face => {
		faceGroup.add(buildPlane(a,c,alpha,beta,gamma,face));
	});

	const sphereGeom = new THREE.SphereGeometry(Math.max(atomRadius, 0.10), 32, 24);

	const basis = [
		new THREE.Vector3(0,0,0),
		new THREE.Vector3(2/3, 1/3, 1/2)
	];

	for(let i=-1;i<=1;i++){
		for(let j=-1;j<=1;j++){
			for(let k=-1;k<=1;k++){
				basis.forEach((site, idx) => {
					const frac = new THREE.Vector3(site.x + i, site.y + j, site.z + k);
					const pos = fractionalToCartesian(frac, a, c, alpha, beta, gamma);

					const sphere = new THREE.Mesh(
						sphereGeom,
						idx === 0 ? atomMaterials.A : atomMaterials.B
					);

					sphere.position.copy(pos);

					const glow = new THREE.PointLight(
						idx === 0 ? 0xf9c06d : 0x77c3ff,
						0.12,
						a * 1.5
					);

					glow.position.copy(pos);

					atomGroup.add(glow);
					atomGroup.add(sphere);
				});
			}
		}
	}

	const center = fractionalToCartesian(
		new THREE.Vector3(1.5, 1.5, 1.5),
		a,
		c,
		alpha,
		beta,
		gamma
	);

	const radius = Math.max(a * 3.0, c * 2.4, 5);
	camera.position.set(radius, radius, radius * 1.1);
	controls.target.copy(center);
	controls.update();
}

function resizeRendererToDisplaySize(){
	const width = canvas.clientWidth;
	const height = canvas.clientHeight;

	if(
		canvas.width !== Math.floor(width * window.devicePixelRatio) ||
		canvas.height !== Math.floor(height * window.devicePixelRatio)
	){
		renderer.setSize(width, height, false);
		camera.aspect = width / height;
		camera.updateProjectionMatrix();
	}
}

const aRange = document.getElementById('aRange');
const cRange = document.getElementById('cRange');
const rRange = document.getElementById('rRange');

const alphaRange = document.getElementById('alphaRange');
const betaRange = document.getElementById('betaRange');
const gammaRange = document.getElementById('gammaRange');

const aVal = document.getElementById('aVal');
const cVal = document.getElementById('cVal');
const rVal = document.getElementById('rVal');

const alphaVal = document.getElementById('alphaVal');
const betaVal = document.getElementById('betaVal');
const gammaVal = document.getElementById('gammaVal');

const showCell = document.getElementById('showCell');
const showAtoms = document.getElementById('showAtoms');
const showPlanes = document.getElementById('showPlanes');
const showAxes = document.getElementById('showAxes');
const showGrid = document.getElementById('showGrid');

const resetBtn = document.getElementById('resetBtn');
const downloadBtn = document.getElementById('downloadBtn');

const dispA = document.getElementById('dispA');
const dispC = document.getElementById('dispC');
const dispR = document.getElementById('dispR');

const dispAlpha = document.getElementById('dispAlpha');
const dispBeta = document.getElementById('dispBeta');
const dispGamma = document.getElementById('dispGamma');

const siteStatus = document.getElementById('siteStatus');

function updateInfoBar(){
	const a = parseFloat(aRange.value);
	const c = parseFloat(cRange.value);
	const alpha = parseFloat(alphaRange.value);
	const beta = parseFloat(betaRange.value);
	const gamma = parseFloat(gammaRange.value);

	const countAtoms = atomGroup.children.filter(o => o.isMesh).length;
	const countLines = cellGroup.children.length;

	const status = `A=${a.toFixed(2)} Å, C=${c.toFixed(2)} Å, α=${alpha}°, β=${beta}°, γ=${gamma}°, ${countAtoms} atom, ${countLines} garis sel`;
	siteStatus.textContent = status;
}

function updateFromUI(){
	const a = parseFloat(aRange.value);
	const c = parseFloat(cRange.value);
	const r = parseFloat(rRange.value);

	const alpha = parseFloat(alphaRange.value);
	const beta = parseFloat(betaRange.value);
	const gamma = parseFloat(gammaRange.value);

	aVal.textContent = a.toFixed(2);
	cVal.textContent = c.toFixed(2);
	rVal.textContent = r.toFixed(2);

	alphaVal.textContent = alpha;
	betaVal.textContent = beta;
	gammaVal.textContent = gamma;

	if(dispA) dispA.textContent = a.toFixed(2);
	if(dispC) dispC.textContent = c.toFixed(2);
	if(dispR) dispR.textContent = r.toFixed(2);

	if(dispAlpha) dispAlpha.textContent = alpha;
	if(dispBeta) dispBeta.textContent = beta;
	if(dispGamma) dispGamma.textContent = gamma;

	buildTrigonal(a,c,r,alpha,beta,gamma);

	cellGroup.visible = showCell.checked;
	faceGroup.visible = showPlanes.checked;
	atomGroup.visible = showAtoms.checked;
	axes.visible = showAxes.checked;
	ground.visible = showGrid.checked;

	updateInfoBar();
}

aRange.addEventListener('input', updateFromUI);
cRange.addEventListener('input', updateFromUI);
rRange.addEventListener('input', updateFromUI);

alphaRange.addEventListener('input', updateFromUI);
betaRange.addEventListener('input', updateFromUI);
gammaRange.addEventListener('input', updateFromUI);

showCell.addEventListener('change', updateFromUI);
showAtoms.addEventListener('change', updateFromUI);
showPlanes.addEventListener('change', updateFromUI);
showAxes.addEventListener('change', updateFromUI);
showGrid.addEventListener('change', updateFromUI);

resetBtn.addEventListener('click', () => {
	updateFromUI();
});

if(downloadBtn){
	downloadBtn.addEventListener('click', () => {
		try{
			const dataURL = renderer.domElement.toDataURL('image/png');
			const a = document.createElement('a');

			a.href = dataURL;
			a.download = `kristal_trigonal_a${aRange.value}_c${cRange.value}_alpha${alphaRange.value}_beta${betaRange.value}_gamma${gammaRange.value}.png`;

			document.body.appendChild(a);
			a.click();
			a.remove();
		}catch(e){
			console.error('Gagal membuat gambar:', e);
			alert('Gagal mengekspor gambar. Coba gunakan browser terbaru.');
		}
	});
}

window.addEventListener('resize', resizeRendererToDisplaySize);

updateFromUI();
resizeRendererToDisplaySize();

function animate(){
	requestAnimationFrame(animate);
	controls.update();
	renderer.render(scene, camera);
}

animate();