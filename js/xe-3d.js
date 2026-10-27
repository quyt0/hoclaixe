// Ô tô cơ bản 3D cho người mới: mô hình xe (ngoại thất, khoang máy, buồng lái lái bên trái), điểm chú thích, điều khiển thử.
// Toạ độ xe: x hướng đầu xe, y lên trên, z sang phải. Cầu sau ở x = 0, cầu trước ở x = 2,55.
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const T = window.THREE;

  // ------------------------------------------------------------------ trạng thái xe
  const S = {
    ign: 'off', sig: 0, hazard: false, lights: 'off', wiper: 'off', wash: 0,
    gear: 'P', brake: false, handbrake: true, belt: false, hood: false, fuel: false, manual: false, night: false,
    ignT: 0, wiperA: 0, wiperDir: 1, hoodA: 0, fuelA: 0, rpm: 0,
  };

  // ------------------------------------------------------------------ cảnh
  const viewer = $('viewer');
  const renderer = new T.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  viewer.prepend(renderer.domElement);
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(45, 1, 0.02, 300);
  const controls = new T.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  const hemi = new T.HemisphereLight(0xeaf2ff, 0x55606a, 0.9);
  const sun = new T.DirectionalLight(0xffffff, 0.9);
  sun.position.set(6, 10, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 30 });
  scene.add(hemi, sun);

  // mặt đường bãi đỗ
  const gc = document.createElement('canvas'); gc.width = gc.height = 512;
  const gx = gc.getContext('2d');
  gx.fillStyle = '#5b5f66'; gx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 4000; i++) { gx.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,.08)' : 'rgba(255,255,255,.06)'; gx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2); }
  gx.fillStyle = '#f2f2ee'; gx.fillRect(0, 0, 512, 10); gx.fillRect(0, 502, 512, 10);
  const gTex = new T.CanvasTexture(gc);
  gTex.wrapS = gTex.wrapT = T.RepeatWrapping; gTex.repeat.set(6, 6);
  const ground = new T.Mesh(new T.PlaneGeometry(36, 36), new T.MeshStandardMaterial({ map: gTex, roughness: 0.95 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  function applyBg() {
    const dark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
    const c = S.night ? 0x0b0f18 : dark ? 0x26303b : 0xcfe0ee;
    scene.background = new T.Color(c);
    scene.fog = new T.Fog(c, 18, 40);
    hemi.intensity = S.night ? 0.12 : 0.9;
    sun.intensity = S.night ? 0.05 : 0.9;
  }
  new MutationObserver(applyBg).observe(document.documentElement, { attributes: true, attributeFilter: ['data-bs-theme'] });

  // ------------------------------------------------------------------ vật liệu
  const paint = new T.MeshStandardMaterial({ color: 0xc8102e, metalness: 0.45, roughness: 0.35, side: T.DoubleSide });
  const black = new T.MeshStandardMaterial({ color: 0x15171b, roughness: 0.8 });
  const plastic = new T.MeshStandardMaterial({ color: 0x2b2e34, roughness: 0.85 });
  const plasticL = new T.MeshStandardMaterial({ color: 0x4a4e56, roughness: 0.85 });
  const chrome = new T.MeshStandardMaterial({ color: 0xc9ced4, metalness: 0.9, roughness: 0.2 });
  const glass = new T.MeshStandardMaterial({ color: 0x223040, metalness: 0.3, roughness: 0.05, transparent: true, opacity: 0.32, side: T.DoubleSide, depthWrite: false });
  const fabric = new T.MeshStandardMaterial({ color: 0x3a3d44, roughness: 1 });
  const mk = (color, e) => new T.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: e || 0, roughness: 0.35 });

  const car = new T.Group();
  car.position.x = -1.24;
  scene.add(car);
  const occluders = [];
  function add(obj, parent, occ) {
    (parent || car).add(obj);
    obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (occ !== false) occluders.push(o); } });
    return obj;
  }
  function box(mat, w, h, d, x, y, z, parent, occ) {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    return add(m, parent, occ);
  }
  function rod(a, b, r, mat, parent) {
    const dir = new T.Vector3().subVectors(b, a);
    const m = new T.Mesh(new T.CylinderGeometry(r, r, dir.length(), 10), mat);
    m.position.copy(a).addScaledVector(dir, 0.5);
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir.normalize());
    return add(m, parent);
  }


  // ------------------------------------------------------------------ thân xe rỗng: vỏ hông + khối đầu + khối đuôi + sàn
  const W = 1.75, HW = W / 2;
  function shapeExtrude(build, depth, mat, z, bevel) {
    const sh = new T.Shape();
    build(sh);
    const g = new T.ExtrudeGeometry(sh, { depth, bevelEnabled: !!bevel, bevelSize: 0.035, bevelThickness: 0.035, bevelSegments: 3, curveSegments: 14 });
    g.translate(0, 0, z - depth / 2);
    return add(new T.Mesh(g, mat));
  }
  // vỏ hông: toàn bộ dáng xe nhìn ngang, có hốc bánh
  const sideOutline = (sh) => {
    sh.moveTo(-0.975, 0.36); sh.lineTo(-0.40, 0.36);
    sh.absarc(0, 0.31, 0.39, Math.PI, 0, true);
    sh.lineTo(2.16, 0.36);
    sh.absarc(2.55, 0.31, 0.39, Math.PI, 0, true);
    sh.lineTo(3.42, 0.38); sh.lineTo(3.46, 0.62); sh.lineTo(3.38, 0.78); sh.lineTo(2.85, 0.89); sh.lineTo(2.05, 0.98);
    sh.lineTo(-0.35, 0.99); sh.lineTo(-0.72, 0.95); sh.lineTo(-0.98, 0.84); sh.lineTo(-1.0, 0.5); sh.closePath();
  };
  for (const sg of [-1, 1]) shapeExtrude(sideOutline, 0.045, paint, sg * (HW - 0.0225));
  // khối đầu xe: cản trước + sàn khoang máy (khoang máy để trống phía trên)
  shapeExtrude((sh) => {
    sh.moveTo(2.08, 0.36); sh.lineTo(2.16, 0.36);
    sh.absarc(2.55, 0.31, 0.39, Math.PI, 0, true);
    sh.lineTo(3.42, 0.38); sh.lineTo(3.46, 0.62); sh.lineTo(3.34, 0.64); sh.lineTo(3.34, 0.72); sh.lineTo(2.08, 0.72); sh.closePath();
  }, W - 0.12, paint, 0, true);
  // khối đuôi xe: cốp và cản sau
  shapeExtrude((sh) => {
    sh.moveTo(-0.975, 0.36); sh.lineTo(-0.40, 0.36);
    sh.absarc(0, 0.31, 0.39, Math.PI, 2.533, true);
    sh.lineTo(-0.32, 0.99); sh.lineTo(-0.35, 0.99); sh.lineTo(-0.72, 0.95); sh.lineTo(-0.98, 0.84); sh.lineTo(-1.0, 0.5); sh.closePath();
  }, W - 0.12, paint, 0, true);
  box(black, 2.4, 0.04, 1.22, 0.88, 0.4, 0, car, false);              // sàn khoang lái (hẹp hơn để chừa chỗ bánh xe)
  box(paint, 0.1, 0.03, W - 0.1, 2.03, 0.975, 0);                      // ốp chân kính lái
  box(plastic, 0.04, 0.28, W - 0.12, 2.07, 0.85, 0);             // vách ngăn khoang máy
  box(black, 1.24, 0.02, W - 0.14, 2.7, 0.725, 0);               // sàn khoang máy
  box(black, 0.05, 0.12, 1.3, 3.39, 0.70, 0);                    // lưới tản nhiệt
  box(plastic, 0.05, 0.16, 1.1, 3.30, 0.80, 0);                  // két nước

  // nắp capo (bản lề ở chân kính lái)
  const hoodPivot = new T.Group();
  hoodPivot.position.set(2.05, 0.99, 0);
  car.add(hoodPivot);
  {
    const nx = 14, nz = 10, L = 1.33, Z = HW - 0.02;
    const line = (x) => (x < 0.8 ? 0.98 - 0.09 * (x / 0.8) : 0.89 - 0.11 * ((x - 0.8) / 0.53)) - 0.99;
    const pos = [], idx = [];
    for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) {
      const x = L * i / nx, z = -Z + 2 * Z * j / nz;
      pos.push(x, line(x) + 0.035 * (1 - (z / Z) ** 2), z);
    }
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const a = i * (nz + 1) + j, b = a + nz + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    add(new T.Mesh(g, paint), hoodPivot);
  }

  // kính, nóc, trụ A
  {
    const gh = new T.Shape();
    gh.moveTo(-0.38, 0.97); gh.lineTo(0.12, 1.40); gh.lineTo(1.38, 1.42); gh.lineTo(2.05, 0.97); gh.closePath();
    const g = new T.ExtrudeGeometry(gh, { depth: 1.56, bevelEnabled: false });
    g.translate(0, 0, -0.78);
    car.add(new T.Mesh(g, glass));
    box(paint, 1.3, 0.05, 1.58, 0.75, 1.425, 0);
    for (const sg of [-1, 1]) {
      rod(new T.Vector3(2.05, 0.97, sg * 0.77), new T.Vector3(1.38, 1.42, sg * 0.77), 0.035, paint);
      rod(new T.Vector3(0.12, 1.40, sg * 0.77), new T.Vector3(-0.38, 0.97, sg * 0.77), 0.05, paint);
      box(paint, 0.08, 0.44, 0.04, 0.55, 1.2, sg * 0.775);       // trụ B
    }
  }

  // gương chiếu hậu ngoài + xi nhan trên gương
  const ind = { L: [], R: [] };
  const indMat = () => mk(0xffa21a, 0);
  for (const [sd, sg] of [['L', -1], ['R', 1]]) {
    const g = new T.Group();
    g.position.set(1.93, 1.03, sg * 0.98);
    box(paint, 0.12, 0.13, 0.22, 0, 0, 0, g);
    box(black, 0.01, 0.10, 0.18, -0.065, 0, 0, g);
    const rep = box(indMat(), 0.08, 0.02, 0.08, 0.02, -0.06, sg * 0.06, g);
    ind[sd].push(rep);
    add(g);
  }

  // đèn
  const headMat = mk(0xfff6dd, 0.2);
  const tailMat = mk(0xb3121b, 0.15);
  const revMat = mk(0xf5f5f5, 0);
  const brake3 = mk(0xb3121b, 0);
  for (const sg of [-1, 1]) {
    box(headMat, 0.06, 0.09, 0.32, 3.41, 0.70, sg * 0.58);
    box(tailMat, 0.04, 0.12, 0.30, -1.03, 0.80, sg * 0.62);
    box(revMat, 0.04, 0.06, 0.12, -1.04, 0.66, sg * 0.42);
    ind[sg < 0 ? 'L' : 'R'].push(box(indMat(), 0.04, 0.05, 0.14, 3.5, 0.6, sg * 0.70));
    ind[sg < 0 ? 'L' : 'R'].push(box(indMat(), 0.04, 0.05, 0.16, -1.0, 0.90, sg * 0.68));
  }
  box(brake3, 0.03, 0.03, 0.4, -0.3, 1.32, 0);
  const beams = [];
  for (const sg of [-1, 1]) {
    const sp = new T.SpotLight(0xfff3d6, 0, 22, 0.42, 0.5, 1.2);
    sp.position.set(3.42, 0.7, sg * 0.58);
    sp.target.position.set(9, 0, sg * 0.9);
    car.add(sp, sp.target);
    beams.push(sp);
  }
  const tailGlow = new T.PointLight(0xff2020, 0, 3);
  tailGlow.position.set(-1.3, 0.8, 0);
  car.add(tailGlow);

  // bánh xe
  const wheels = [];
  for (const [x, sg] of [[2.55, -1], [2.55, 1], [0, -1], [0, 1]]) {
    const g = new T.Group();
    g.position.set(x, 0.31, sg * 0.76);
    const tire = new T.Mesh(new T.CylinderGeometry(0.31, 0.31, 0.21, 32), black);
    tire.rotation.x = Math.PI / 2;
    const rim = new T.Mesh(new T.CylinderGeometry(0.2, 0.2, 0.22, 20), chrome);
    rim.rotation.x = Math.PI / 2;
    g.add(tire, rim);
    for (let k = 0; k < 5; k++) {
      const sp = new T.Mesh(new T.BoxGeometry(0.06, 0.34, 0.03), chrome);
      sp.rotation.z = k * Math.PI * 2 / 5;
      sp.position.z = sg * 0.1;
      g.add(sp);
    }
    add(g);
    wheels.push(g);
  }

  // nắp bình xăng (bên trái phía sau)
  const fuelPivot = new T.Group();
  fuelPivot.position.set(-0.42, 0.8, -HW - 0.035);
  car.add(fuelPivot);
  box(paint, 0.18, 0.16, 0.015, -0.09, 0, 0, fuelPivot);
  box(black, 0.16, 0.14, 0.01, -0.51, 0.8, -HW - 0.028);
  const fuelCap = new T.Mesh(new T.CylinderGeometry(0.035, 0.035, 0.03, 16), black);
  fuelCap.rotation.x = Math.PI / 2;
  fuelCap.position.set(-0.51, 0.8, -HW - 0.03);
  add(fuelCap);

  // biển số
  const plateTex = (() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#f4f4f0'; g.fillRect(0, 0, 256, 64); g.strokeStyle = '#111'; g.lineWidth = 4; g.strokeRect(3, 3, 250, 58);
    g.fillStyle = '#111'; g.font = 'bold 36px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('30A-123.45', 128, 34);
    return new T.CanvasTexture(c);
  })();
  for (const [x, ry] of [[3.5, Math.PI / 2], [-1.045, -Math.PI / 2]]) {
    const p = new T.Mesh(new T.PlaneGeometry(0.52, 0.12), new T.MeshStandardMaterial({ map: plateTex }));
    p.position.set(x, 0.5, 0);
    p.rotation.y = ry;
    car.add(p);
  }

  // gạt mưa trên mặt phẳng kính lái
  const wipers = [];
  {
    const d = new T.Vector3(-0.67, 0.45, 0).normalize();
    const n = new T.Vector3(0.45, 0.67, 0).normalize();
    const plane = new T.Group();
    plane.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(d, n, new T.Vector3(0, 0, -1)));
    plane.position.set(2.02, 1.0, 0);
    car.add(plane);
    for (const z0 of [-0.66, -0.02]) {
      const piv = new T.Group();
      piv.position.set(0, 0.01, -z0);            // trục z cục bộ đã đảo dấu
      const arm = new T.Mesh(new T.BoxGeometry(0.02, 0.012, 0.6), black);
      arm.position.z = -0.3;
      piv.add(arm);
      plane.add(piv);
      occluders.push(arm);
      wipers.push(piv);
    }
  }

  // ------------------------------------------------------------------ khoang động cơ
  const bay = {};
  bay.engine = box(new T.MeshStandardMaterial({ color: 0x80868e, metalness: 0.6, roughness: 0.4 }), 0.62, 0.17, 0.7, 2.68, 0.81, 0.08);
  bay.cover = box(black, 0.6, 0.05, 0.62, 2.68, 0.92, 0.08);
  bay.oilCap = box(mk(0xe6b422, 0.05), 0.07, 0.04, 0.07, 2.58, 0.96, 0.24);
  bay.dipstick = add(new T.Mesh(new T.TorusGeometry(0.035, 0.012, 8, 20), mk(0xf2b705, 0.1)));
  bay.dipstick.position.set(2.92, 0.98, -0.2);
  bay.dipstick.rotation.y = Math.PI / 2;
  rod(new T.Vector3(2.92, 0.95, -0.2), new T.Vector3(2.92, 0.86, -0.2), 0.008, chrome);
  bay.battery = box(new T.MeshStandardMaterial({ color: 0x1f2a36, roughness: 0.6 }), 0.24, 0.19, 0.17, 3.06, 0.82, -0.55);
  box(mk(0xd62828, 0.1), 0.04, 0.03, 0.04, 3.13, 0.93, -0.51);
  box(black, 0.04, 0.03, 0.04, 2.99, 0.93, -0.51);
  rod(new T.Vector3(3.13, 0.94, -0.51), new T.Vector3(3.2, 0.94, -0.3), 0.012, mk(0xd62828, 0.05));
  bay.fuseBox = box(black, 0.22, 0.09, 0.15, 2.72, 0.78, -0.62);
  box(plasticL, 0.2, 0.01, 0.13, 2.72, 0.83, -0.62);
  const resMat = new T.MeshStandardMaterial({ color: 0xf0f0ec, roughness: 0.3, transparent: true, opacity: 0.75 });
  bay.coolant = box(resMat, 0.14, 0.14, 0.12, 3.1, 0.83, 0.58);
  box(mk(0xe0559a, 0.1), 0.12, 0.07, 0.1, 3.1, 0.795, 0.58);
  box(black, 0.06, 0.03, 0.06, 3.1, 0.915, 0.58);
  bay.brakeFluid = box(resMat, 0.1, 0.08, 0.08, 2.2, 0.82, -0.5);
  box(mk(0xf2c230, 0.1), 0.05, 0.03, 0.05, 2.2, 0.875, -0.5);
  bay.washer = box(mk(0x1d6fd6, 0.1), 0.06, 0.03, 0.06, 3.18, 0.78, 0.2);
  bay.airbox = box(black, 0.28, 0.12, 0.22, 2.42, 0.8, 0.52);

  // ------------------------------------------------------------------ nội thất (lái bên trái, z âm)
  const DRV = -0.36;
  box(plastic, 0.02, 0.62, W - 0.12, 2.04, 0.7, 0);             // vách táp-lô
  box(plastic, 0.46, 0.2, W - 0.14, 1.83, 0.88, 0);              // táp-lô
  box(plasticL, 0.5, 0.02, W - 0.16, 1.82, 0.985, 0);            // mặt táp-lô
  box(plastic, 0.14, 0.05, 0.5, 1.66, 1.105, DRV);               // mái che đồng hồ
  for (const sg of [-1, 1]) box(plastic, 2.4, 0.6, 0.04, 0.85, 0.69, sg * (HW - 0.06), car, false);   // ốp cửa
  box(new T.MeshStandardMaterial({ color: 0x8c8f96, roughness: 1, side: T.DoubleSide }), 1.6, 0.01, 1.5, 0.7, 1.395, 0, car, false); // trần

  const cabinLight = new T.PointLight(0xfff4e0, 0.55, 2.6, 1.5);
  cabinLight.position.set(0.9, 1.3, 0);
  car.add(cabinLight);

  // bảng đồng hồ (vẽ bằng canvas)
  const cc = document.createElement('canvas'); cc.width = 768; cc.height = 256;
  const cTex = new T.CanvasTexture(cc);
  const cluster = new T.Mesh(new T.PlaneGeometry(0.46, 0.153), new T.MeshBasicMaterial({ map: cTex }));
  cluster.rotation.y = -Math.PI / 2;
  cluster.rotation.x = 0;
  cluster.position.set(1.585, 1.005, DRV);
  car.add(cluster);

  // vô-lăng + trụ lái + cần điều khiển
  const swBase = new T.Group();
  swBase.position.set(1.4, 0.85, DRV);
  swBase.rotation.z = 0.42;
  car.add(swBase);
  const rim = new T.Mesh(new T.TorusGeometry(0.19, 0.025, 10, 40), black);
  rim.rotation.y = Math.PI / 2;
  add(rim, swBase);
  const horn = new T.Mesh(new T.CylinderGeometry(0.07, 0.07, 0.05, 24), plastic);
  horn.rotation.z = Math.PI / 2;
  add(horn, swBase);
  for (const a of [0, 2.2, -2.2]) {
    const sp = new T.Mesh(new T.BoxGeometry(0.02, 0.15, 0.035), plastic);
    sp.position.set(0, Math.cos(a) * -0.09, Math.sin(a) * 0.09);
    sp.rotation.x = a;
    add(sp, swBase);
  }
  const col = new T.Mesh(new T.CylinderGeometry(0.04, 0.05, 0.36, 12), plastic);
  col.rotation.z = Math.PI / 2;
  col.position.set(0.18, 0, 0);
  add(col, swBase);
  const stalkL = new T.Group(); stalkL.position.set(0.1, 0, -0.05); swBase.add(stalkL);
  add(new T.Mesh(new T.BoxGeometry(0.02, 0.02, 0.17).translate(0, 0, -0.085), plasticL), stalkL);
  const stalkR = new T.Group(); stalkR.position.set(0.1, 0, 0.05); swBase.add(stalkR);
  add(new T.Mesh(new T.BoxGeometry(0.02, 0.02, 0.17).translate(0, 0, 0.085), plasticL), stalkR);

  // màn hình giữa, nút cảnh báo nguy hiểm, điều hoà
  const scr = box(mk(0x0d1b2a, 0.25), 0.02, 0.15, 0.26, 1.592, 1.03, 0.02);
  const hazBtn = box(mk(0xd62828, 0.1), 0.025, 0.035, 0.05, 1.59, 0.935, 0.02);
  for (const dz of [-0.09, 0.13]) {
    const k = new T.Mesh(new T.CylinderGeometry(0.025, 0.025, 0.03, 16), chrome);
    k.rotation.z = Math.PI / 2; k.position.set(1.585, 0.86, dz); add(k);
  }
  // bệ tì tay, cần số, phanh tay
  box(plastic, 0.8, 0.2, 0.22, 1.2, 0.52, 0.02);
  const gearPlate = box(plasticL, 0.2, 0.012, 0.12, 1.38, 0.625, 0.02);
  const gearLever = new T.Group(); gearLever.position.set(1.38, 0.63, 0.02); car.add(gearLever);
  rod(new T.Vector3(0, 0, 0), new T.Vector3(0, 0.12, 0), 0.012, chrome, gearLever);
  add(new T.Mesh(new T.SphereGeometry(0.035, 16, 12).translate(0, 0.14, 0), black), gearLever);
  const hbLever = new T.Group(); hbLever.position.set(1.0, 0.62, 0.02); car.add(hbLever);
  add(new T.Mesh(new T.BoxGeometry(0.26, 0.03, 0.04).translate(0.13, 0, 0), plasticL), hbLever);
  // ghế
  for (const z of [DRV, 0.4]) {
    box(fabric, 0.5, 0.12, 0.5, 0.78, 0.5, z, car, false);
    const back = box(fabric, 0.11, 0.62, 0.5, 0.48, 0.85, z, car, false);
    back.rotation.z = 0.2;
    box(fabric, 0.08, 0.14, 0.26, 0.4, 1.22, z, car, false);
  }
  box(fabric, 0.45, 0.12, 1.2, -0.02, 0.5, 0, car, false);
  box(fabric, 0.11, 0.5, 1.2, -0.26, 0.8, 0, car, false);
  // dây an toàn ghế lái
  const beltMat = new T.MeshStandardMaterial({ color: 0x202226, roughness: 0.9 });
  const beltOn = new T.Group(); car.add(beltOn);
  rod(new T.Vector3(0.52, 1.25, -0.75), new T.Vector3(0.72, 0.62, -0.18), 0.012, beltMat, beltOn);
  rod(new T.Vector3(0.72, 0.62, -0.18), new T.Vector3(0.68, 0.6, -0.68), 0.012, beltMat, beltOn);
  const beltOff = rod(new T.Vector3(0.52, 1.25, -0.75), new T.Vector3(0.5, 0.62, -0.76), 0.012, beltMat);
  box(chrome, 0.05, 0.04, 0.03, 0.72, 0.6, -0.12);
  // gương chiếu hậu trong
  box(plastic, 0.03, 0.07, 0.25, 1.55, 1.33, 0);
  box(new T.MeshBasicMaterial({ color: 0xa9bccd }), 0.005, 0.055, 0.23, 1.534, 1.33, 0);
  // bàn đạp
  const pedals = {};
  for (const [k, z, w] of [['gas', DRV + 0.15, 0.06], ['brake', DRV - 0.02, 0.1], ['clutch', DRV - 0.2, 0.08]]) {
    const g = new T.Group(); g.position.set(1.72, 0.7, z); car.add(g);
    rod(new T.Vector3(0, 0, 0), new T.Vector3(-0.06, -0.2, 0), 0.01, plasticL, g);
    add(new T.Mesh(new T.BoxGeometry(0.03, 0.09, w).translate(-0.07, -0.24, 0), black), g);
    pedals[k] = g;
  }
  // lẫy mở capo, lẫy mở nắp xăng
  const hoodLatch = box(plasticL, 0.06, 0.03, 0.04, 1.75, 0.6, -0.76);
  const fuelLatch = box(plasticL, 0.06, 0.02, 0.03, 0.95, 0.44, -0.66);

  // ------------------------------------------------------------------ bảng đồng hồ
  let lastCluster = '';
  function drawCluster(t) {
    const run = S.ign === 'run', on = S.ign !== 'off';
    const check = on && S.ignT < 2;                    // tự kiểm tra đèn vài giây sau khi bật chìa
    const blink = Math.floor(t * 2.6) % 2 === 0;
    const L = { batt: check || (on && !run), oil: check || (on && !run), eng: check || (on && !run), abs: check, bag: check, brake: on && (check || S.handbrake), belt: on && (check || !S.belt), turnL: on && blink && (S.sig < 0 || S.hazard) || (!on && blink && S.hazard), turnR: on && blink && (S.sig > 0 || S.hazard) || (!on && blink && S.hazard), low: S.lights !== 'off', high: S.lights === 'high' };
    const rpm = run ? 750 + (S.brake ? 0 : 0) : 0;
    const key = JSON.stringify(L) + S.ign + S.gear + Math.round(rpm);
    if (key === lastCluster) return;
    lastCluster = key;
    const g = cc.getContext('2d');
    g.fillStyle = '#05070b'; g.fillRect(0, 0, 768, 256);
    const lit = on;
    function dial(cx, label, max, val, unit) {
      g.lineWidth = 6; g.strokeStyle = lit ? '#2a5d8f' : '#1a1f27';
      g.beginPath(); g.arc(cx, 140, 92, Math.PI * 0.75, Math.PI * 2.25); g.stroke();
      g.fillStyle = lit ? '#cfe6ff' : '#2a3038'; g.font = 'bold 18px Arial'; g.textAlign = 'center';
      for (let i = 0; i <= 8; i++) {
        const a = Math.PI * 0.75 + i / 8 * Math.PI * 1.5;
        g.fillText(String(Math.round(max * i / 8 / (max > 1000 ? 1000 : 1))), cx + Math.cos(a) * 70, 146 + Math.sin(a) * 70);
      }
      const a = Math.PI * 0.75 + Math.min(1, val / max) * Math.PI * 1.5;
      g.strokeStyle = lit ? '#ff4d3d' : '#3a1414'; g.lineWidth = 5;
      g.beginPath(); g.moveTo(cx, 140); g.lineTo(cx + Math.cos(a) * 80, 140 + Math.sin(a) * 80); g.stroke();
      g.fillStyle = lit ? '#8aa4bf' : '#2a3038'; g.font = '14px Arial'; g.fillText(unit, cx, 200);
      g.fillText(label, cx, 222);
    }
    dial(130, 'Tốc độ', 200, 0, 'km/h');
    dial(638, 'Vòng tua', 8000, rpm, 'x1000 vòng/phút');
    // giữa: số, nhiên liệu, nhiệt độ
    g.textAlign = 'center';
    g.fillStyle = lit ? '#e8f1ff' : '#22272e'; g.font = 'bold 54px Arial'; g.fillText(S.gear, 384, 120);
    g.font = '15px Arial'; g.fillStyle = lit ? '#8aa4bf' : '#22272e';
    g.fillText('Nhiên liệu', 330, 205); g.fillText('Nhiệt độ', 440, 205);
    g.fillStyle = lit ? '#1f6f3f' : '#14181d'; g.fillRect(295, 170, 70 * (lit ? 0.7 : 1), 14);
    g.fillStyle = lit ? '#2a5d8f' : '#14181d'; g.fillRect(405, 170, 70 * (run ? 0.5 : lit ? 0.2 : 1), 14);
    // đèn báo
    const icons = [
      ['turnL', '◀', '#22e36b', 300, 40], ['turnR', '▶', '#22e36b', 468, 40],
      ['low', 'ĐÈN', '#22e36b', 340, 40], ['high', 'PHA', '#3b82f6', 428, 40],
      ['batt', '▭±', '#ff3b30', 250, 238], ['oil', 'DẦU', '#ff3b30', 300, 238], ['brake', '(!)', '#ff3b30', 350, 238],
      ['belt', 'DÂY', '#ff3b30', 400, 238], ['bag', 'TÚI KHÍ', '#ff3b30', 462, 238], ['eng', 'ĐỘNG CƠ', '#ffb020', 540, 238], ['abs', 'ABS', '#ffb020', 610, 238],
    ];
    g.font = 'bold 18px Arial';
    for (const [k, txt, col, x, y] of icons) { g.fillStyle = L[k] ? col : '#161a20'; g.fillText(txt, x, y); }
    cTex.needsUpdate = true;
  }

  // ------------------------------------------------------------------ âm thanh
  let ac = null, hornNodes = null, eng = null;
  const actx = () => (ac = ac || new (window.AudioContext || window.webkitAudioContext)());
  function click() {
    try { const c = actx(), o = c.createOscillator(), g = c.createGain(); o.type = 'square'; o.frequency.value = 1500; g.gain.setValueAtTime(0.05, c.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.03); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.04); } catch (e) { /* bỏ qua */ }
  }
  function hornOn(on) {
    try {
      const c = actx();
      if (on && !hornNodes) {
        const g = c.createGain(); g.gain.value = 0.12; g.connect(c.destination);
        hornNodes = [420, 510].map((f) => { const o = c.createOscillator(); o.type = 'square'; o.frequency.value = f; o.connect(g); o.start(); return o; });
        hornNodes.g = g;
      } else if (!on && hornNodes) { hornNodes.forEach((o) => o.stop()); hornNodes = null; }
    } catch (e) { /* bỏ qua */ }
  }
  function engineSound(run) {
    try {
      const c = actx();
      if (!eng) {
        const o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
        o.type = 'sawtooth'; o.frequency.value = 38; f.type = 'lowpass'; f.frequency.value = 220; g.gain.value = 0;
        o.connect(f); f.connect(g); g.connect(c.destination); o.start(); eng = g;
      }
      eng.gain.setTargetAtTime(run ? 0.05 : 0, c.currentTime, 0.2);
    } catch (e) { /* bỏ qua */ }
  }

  // ------------------------------------------------------------------ điểm chú thích
  const ART = (id, label) => `<a class="btn btn-outline-success btn-sm" href="bai-viet.html?id=${id}"><i class="bi bi-book"></i> ${label || 'Đọc bài cẩm nang'}</a>`;
  const ACT = (act, label, icon) => `<button class="btn btn-success btn-sm" type="button" data-act="${act}"><i class="bi ${icon || 'bi-play-fill'}"></i> ${label}</button>`;
  const wp = (obj, dy) => () => { const v = new T.Vector3(); obj.getWorldPosition(v); v.y += dy || 0; return v; };
  const at = (x, y, z) => () => car.localToWorld(new T.Vector3(x, y, z));
  const HOTSPOTS = [
    // ---- bên ngoài
    { id: 'headlights', view: 'ext', pos: at(3.45, 0.72, 0.58), title: 'Đèn pha / đèn cốt', body: '<p><b>Đèn cốt</b> (chiếu gần) dùng khi đi trong thành phố và khi gặp xe ngược chiều. <b>Đèn pha</b> (chiếu xa) chỉ dùng trên đường vắng, tối; phải chuyển về cốt khi gặp xe ngược chiều để không làm loá mắt người khác.</p><p class="mb-0">Bật "Trời tối" để thấy rõ vùng chiếu sáng của cốt và pha.</p>', actions: () => ACT('lights-low', 'Bật đèn cốt', 'bi-lightbulb') + ACT('lights-high', 'Bật đèn pha', 'bi-lightbulb-fill') + ACT('night', 'Trời tối', 'bi-moon-stars') },
    { id: 'signals', view: 'ext', pos: at(3.45, 0.61, -0.7), title: 'Đèn xi nhan & đèn cảnh báo nguy hiểm', body: '<p>Xi nhan có ở đầu xe, đuôi xe và trên gương. Bật xi nhan <b>trước khi</b> chuyển hướng, chuyển làn hoặc tách khỏi lề – không phải đang rẽ mới bật.</p><p class="mb-0"><b>Đèn cảnh báo nguy hiểm</b> (cả hai bên cùng nháy) dùng khi xe gặp sự cố phải dừng, hoặc trong tình huống nguy hiểm của bài thi sa hình.</p>', actions: () => ACT('sig-left', 'Xi nhan trái', 'bi-arrow-left') + ACT('sig-right', 'Xi nhan phải', 'bi-arrow-right') + ACT('hazard', 'Đèn cảnh báo', 'bi-exclamation-triangle') },
    { id: 'mirror', view: 'ext', pos: wp(ind.L[0], 0.08), title: 'Gương chiếu hậu ngoài', body: '<p>Chỉnh gương sao cho thấy một phần nhỏ thân xe ở mép trong và đường chân trời nằm khoảng giữa gương. Luôn nhìn gương trước khi chuyển làn, mở cửa và lùi xe.</p><p class="mb-0">Gương ngoài vẫn có <b>điểm mù</b> – hãy quay đầu kiểm tra nhanh trước khi chuyển làn.</p>' },
    { id: 'wipers', view: 'ext', pos: at(2.05, 1.03, -0.3), title: 'Gạt mưa & nước rửa kính', body: '<p>Cần gạt mưa nằm bên <b>phải</b> vô-lăng: gạt xuống để chọn chậm/nhanh, kéo về phía người lái để phun nước rửa kính.</p><p class="mb-0">Không bật gạt mưa khi kính khô. Lưỡi gạt nên thay sau khoảng 6–12 tháng.</p>', actions: () => ACT('wiper-slow', 'Gạt chậm', 'bi-cloud-drizzle') + ACT('wash', 'Phun nước rửa kính', 'bi-droplet-half') + ART('thay-gat-mua', 'Cách thay lưỡi gạt mưa') },
    { id: 'tyre', view: 'ext', pos: at(2.55, 0.55, -0.88), title: 'Lốp xe & áp suất lốp', body: '<p>Áp suất lốp chuẩn ghi trên <b>tem dán ở khung cửa người lái</b> (đơn vị psi, bar hoặc kPa). Đo khi lốp nguội, ít nhất mỗi tháng một lần.</p><p class="mb-0">Gai lốp mòn ngang gờ chỉ thị trong rãnh gai (khoảng 1,6 mm) là phải thay. Lốp non hơi làm tốn xăng, nóng lốp và dễ nổ lốp.</p>', actions: () => ART('kiem-tra-truoc-chuyen-di', 'Kiểm tra xe trước chuyến đi') },
    { id: 'fuel', view: 'ext', pos: at(-0.5, 0.92, -0.9), title: 'Nắp bình xăng', body: '<p>Trên đồng hồ nhiên liệu có biểu tượng cây xăng kèm <b>mũi tên nhỏ</b> chỉ phía có nắp bình xăng – rất hữu ích khi lái xe lạ vào trạm.</p><p class="mb-0">Nhiều xe mở nắp bằng <b>lẫy cạnh ghế lái</b> hoặc bấm vào nắp. Tắt máy khi đổ xăng và đổ đúng loại nhiên liệu.</p>', actions: () => ACT('fuel', 'Mở / đóng nắp xăng', 'bi-fuel-pump') },
    { id: 'rear', view: 'ext', pos: at(-1.02, 0.86, 0.6), title: 'Đèn hậu: phanh, lùi, xi nhan', body: '<p><b>Đèn phanh</b> sáng đỏ khi đạp phanh (thêm đèn phanh trên cao ở kính sau). <b>Đèn lùi</b> màu trắng sáng khi vào số R để báo người phía sau.</p><p class="mb-0">Thử đạp phanh và vào số R để xem đèn sáng.</p>', actions: () => ACT('brake', 'Đạp phanh', 'bi-sign-stop') + ACT('gear-R', 'Vào số lùi', 'bi-arrow-counterclockwise') },
    { id: 'hood', view: 'ext', pos: at(2.7, 1.0, 0.1), title: 'Khoang động cơ (capo)', body: '<p>Mở capo: kéo <b>lẫy mở capo dưới táp-lô bên trái</b>, rồi ra đầu xe gạt chốt phụ ở khe giữa capo và lưới tản nhiệt, nâng capo và gác thanh chống.</p><p class="mb-0">Chỉ mở capo kiểm tra khi động cơ đã tắt và nguội. Các mục kiểm tra định kỳ được đánh số khi capo mở.</p>', actions: () => ACT('hood', 'Mở / đóng capo', 'bi-box-arrow-up') + ART('kiem-tra-truoc-chuyen-di', 'Kiểm tra 5 loại dung dịch') },
    { id: 'battery', view: 'ext', bay: true, pos: wp(bay.battery, 0.16), title: 'Ắc quy 12 V', body: '<p>Cung cấp điện để khởi động và khi máy chưa nổ. <b>Cọc dương (+) màu đỏ</b>, cọc âm (−) màu đen nối thân xe.</p><p class="mb-0">Khi tháo: tháo cọc âm trước, lắp cọc âm sau cùng. Ắc quy thường dùng được 2–4 năm.</p>', actions: () => ART('he-thong-dien', 'Hệ thống điện trên ô tô') + ART('cau-binh-ac-quy', 'Câu bình khi hết điện') },
    { id: 'dipstick', view: 'ext', bay: true, pos: wp(bay.dipstick, 0.06), title: 'Que thăm dầu máy', body: '<p>Tay cầm vòng màu vàng/cam. Rút ra, lau sạch, cắm lại hết cỡ rồi rút ra xem: mức dầu phải nằm <b>giữa vạch MIN và MAX</b>.</p><p class="mb-0">Châm dầu qua <b>nắp đổ dầu</b> (biểu tượng bình dầu) trên nắp máy, đúng loại theo sách hướng dẫn.</p>', actions: () => ART('kiem-tra-truoc-chuyen-di') },
    { id: 'coolant', view: 'ext', bay: true, pos: wp(bay.coolant, 0.12), title: 'Bình nước làm mát', body: '<p>Bình nhựa trong có vạch <b>LOW – FULL</b>; nước làm mát thường màu hồng, xanh hoặc lục.</p><p class="mb-0 text-danger"><b>Không mở nắp két nước khi máy còn nóng</b> – nước có áp suất có thể phun ra gây bỏng.</p>', actions: () => ART('kiem-tra-truoc-chuyen-di') },
    { id: 'brakefluid', view: 'ext', bay: true, pos: wp(bay.brakeFluid, 0.1), title: 'Bình dầu phanh', body: '<p>Bình nhỏ, nắp màu vàng, sát vách khoang máy phía người lái. Mức dầu giữa <b>MIN và MAX</b>.</p><p class="mb-0">Dầu phanh tụt nhanh là dấu hiệu má phanh mòn hoặc rò rỉ – cần kiểm tra ngay ở gara.</p>' },
    { id: 'washer', view: 'ext', bay: true, pos: wp(bay.washer, 0.08), title: 'Bình nước rửa kính', body: '<p>Nắp màu xanh có biểu tượng kính và tia nước. Đổ nước rửa kính chuyên dụng, không đổ nước rửa chén.</p>', actions: () => ACT('wash', 'Phun nước rửa kính', 'bi-droplet-half') },
    { id: 'fusebox', view: 'ext', bay: true, pos: wp(bay.fuseBox, 0.1), title: 'Hộp cầu chì khoang máy', body: '<p>Chứa cầu chì và rơ-le của các mạch lớn (quạt két nước, đèn pha, bơm xăng, ECU…). Sơ đồ in ở mặt trong nắp hộp; kẹp gắp cầu chì thường gài sẵn bên trong.</p><p class="mb-0">Thay cầu chì đứt bằng cầu chì <b>cùng định mức ampe</b>.</p>', actions: () => ART('thay-cau-chi', 'Thay cầu chì khi chết máy') },
    { id: 'airbox', view: 'ext', bay: true, pos: wp(bay.airbox, 0.1), title: 'Hộp lọc gió động cơ', body: '<p>Lọc bụi cho không khí đi vào động cơ. Lọc gió bẩn làm xe yếu và tốn nhiên liệu; thường vệ sinh/thay theo lịch bảo dưỡng (đường bụi thì sớm hơn).</p>' },
    // ---- buồng lái
    { id: 'wheel', view: 'int', pos: at(1.38, 0.86, DRV), title: 'Vô-lăng & còi', body: '<p>Cầm vô-lăng ở vị trí <b>9 giờ 15 phút</b>, hai tay thả lỏng. Còi bấm ở giữa vô-lăng – chỉ dùng để báo hiệu cần thiết, không bấm còi trong khu dân cư từ 22h đến 5h.</p><p class="mb-0">Túi khí nằm trong ốp giữa vô-lăng: không đặt tay hay đồ vật lên đó.</p>', actions: () => ACT('horn', 'Bấm còi', 'bi-megaphone') },
    { id: 'cluster', view: 'int', pos: at(1.66, 1.07, DRV), title: 'Bảng đồng hồ & đèn cảnh báo', body: '<p>Hai đồng hồ lớn: <b>tốc độ</b> (km/h) và <b>vòng tua</b> động cơ. Giữa là số đang chọn, mức nhiên liệu và nhiệt độ nước làm mát.</p><p class="mb-0">Bật chìa khoá ON: các đèn cảnh báo sáng vài giây để tự kiểm tra; đèn ắc quy và áp suất dầu chỉ tắt khi máy đã nổ. Thử bấm ON rồi Nổ máy.</p>', actions: () => ACT('ign-on', 'Bật chìa ON', 'bi-key') + ACT('ign-run', 'Nổ máy', 'bi-power') + ART('den-canh-bao', 'Đọc hiểu đèn cảnh báo') },
    { id: 'stalkL', view: 'int', pos: at(1.47, 0.88, DRV - 0.2), title: 'Cần xi nhan & đèn (bên trái)', body: '<p>Gạt <b>lên</b> = xi nhan phải, gạt <b>xuống</b> = xi nhan trái. Xoay núm ở đầu cần để bật đèn cốt; đẩy cần ra phía trước = đèn pha, kéo về phía người lái = nháy pha (xin vượt).</p><p class="mb-0">Xi nhan tự tắt khi trả lái sau khi rẽ; khi chuyển làn cần tắt bằng tay.</p>', actions: () => ACT('sig-left', 'Xi nhan trái', 'bi-arrow-left') + ACT('sig-right', 'Xi nhan phải', 'bi-arrow-right') + ACT('lights-low', 'Đèn cốt', 'bi-lightbulb') },
    { id: 'stalkR', view: 'int', pos: at(1.47, 0.88, DRV + 0.2), title: 'Cần gạt mưa (bên phải)', body: '<p>Gạt xuống từng nấc: <b>tự động/ngắt quãng → chậm → nhanh</b>. Kéo cần về phía người lái để phun nước rửa kính và gạt vài lần.</p>', actions: () => ACT('wiper-slow', 'Gạt chậm', 'bi-cloud-drizzle') + ACT('wiper-fast', 'Gạt nhanh', 'bi-cloud-rain-heavy') + ACT('wash', 'Phun nước', 'bi-droplet-half') },
    { id: 'hazardBtn', view: 'int', pos: wp(hazBtn, 0.04), title: 'Nút đèn cảnh báo nguy hiểm', body: '<p>Nút tam giác đỏ giữa táp-lô. Bấm khi xe gặp sự cố phải dừng trên đường, khi bị kéo, hoặc theo yêu cầu bài tình huống nguy hiểm. Hoạt động cả khi tắt máy.</p>', actions: () => ACT('hazard', 'Bật / tắt đèn cảnh báo', 'bi-exclamation-triangle') },
    { id: 'gear', view: 'int', pos: wp(gearLever, 0.2), title: 'Cần số tự động P – R – N – D', body: '<p><b>P</b> đỗ xe (khoá bánh), <b>R</b> lùi, <b>N</b> số mo, <b>D</b> chạy tới. Luôn <b>đạp phanh</b> khi chuyển từ P sang số khác và chỉ chuyển R/D khi xe đã dừng hẳn.</p><p class="mb-0">Xe số sàn có cần số theo sơ đồ chữ H và bàn đạp côn – xem trang <a href="hop-so.html">cấu tạo hộp số sàn</a>.</p>', actions: () => ACT('gear-D', 'Vào số D', 'bi-arrow-up') + ACT('gear-R', 'Vào số R', 'bi-arrow-down') + ACT('gear-P', 'Về P', 'bi-p-circle') },
    { id: 'handbrake', view: 'int', pos: wp(hbLever, 0.08), title: 'Phanh tay', body: '<p>Kéo phanh tay mỗi khi đỗ xe. Khi phanh tay đang kéo, đèn cảnh báo phanh (dấu "!" màu đỏ) sáng trên bảng đồng hồ. Nhớ nhả phanh tay trước khi chạy.</p>', actions: () => ACT('handbrake', 'Kéo / nhả phanh tay', 'bi-p-square') },
    { id: 'pedals', view: 'int', pos: at(1.6, 0.42, DRV), title: 'Bàn đạp ga, phanh (và côn)', body: '<p>Xe số tự động có 2 bàn đạp: <b>ga bên phải, phanh bên trái</b> – chỉ dùng chân phải cho cả hai. Xe số sàn có thêm <b>côn</b> ở ngoài cùng bên trái, đạp bằng chân trái.</p><p class="mb-0">Bấm "Hiện bàn đạp côn" để xem bố trí xe số sàn.</p>', actions: () => ACT('manual', 'Hiện / ẩn bàn đạp côn', 'bi-gear') + ACT('brake', 'Đạp phanh', 'bi-sign-stop') },
    { id: 'belt', view: 'int', pos: at(0.65, 1.0, -0.6), title: 'Dây an toàn', body: '<p>Thắt dây trước khi xe chạy: đai vai qua giữa ngực, đai hông thấp qua xương chậu, không để dây xoắn. Chưa thắt dây thì đèn báo dây an toàn sáng.</p><p class="mb-0">Trong bài thi sa hình, không thắt dây an toàn bị trừ 5 điểm.</p>', actions: () => ACT('belt', 'Thắt / tháo dây', 'bi-person-check') },
    { id: 'mirrorIn', view: 'int', pos: at(1.54, 1.38, 0), title: 'Gương chiếu hậu trong xe', body: '<p>Chỉnh để thấy toàn bộ kính sau. Kết hợp gương trong và hai gương ngoài để quan sát phía sau trước khi phanh, chuyển làn, lùi xe.</p>' },
    { id: 'screen', view: 'int', pos: wp(scr, 0.1), title: 'Màn hình giải trí & điều hoà', body: '<p>Điều chỉnh điều hoà, quạt gió và sấy kính. Khi kính bị mờ hơi nước, bật <b>sấy kính trước</b> và A/C. Hạn chế thao tác màn hình khi đang lái.</p>' },
    { id: 'hoodLatch', view: 'int', pos: wp(hoodLatch, 0.05), title: 'Lẫy mở capo', body: '<p>Lẫy có biểu tượng xe mở capo, nằm dưới táp-lô bên trái chân người lái. Kéo lẫy, capo bật hé ra, sau đó gạt chốt phụ ở đầu xe.</p>', actions: () => ACT('hood', 'Mở capo', 'bi-box-arrow-up') },
    { id: 'fuelLatch', view: 'int', pos: wp(fuelLatch, 0.05), title: 'Lẫy mở nắp bình xăng', body: '<p>Trên nhiều xe, lẫy có biểu tượng cây xăng nằm cạnh ghế lái dưới sàn. Một số xe chỉ cần bấm vào nắp bình xăng khi đã mở khoá cửa.</p>', actions: () => ACT('fuel', 'Mở nắp xăng', 'bi-fuel-pump') },
  ];

  // ------------------------------------------------------------------ hành động
  function setRadio(name, val) { const el = document.querySelector(`input[name="${name}"][value="${val}"]`); if (el) el.checked = true; }
  function setCheck(id, v) { $(id).checked = v; }
  let toastT = null;
  function toast(msg) {
    const el = $('toast');
    el.innerHTML = msg; el.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 3500);
  }
  const needOn = () => { if (S.ign === 'off') { toast('<i class="bi bi-key"></i> Bật chìa khoá (ON) hoặc nổ máy trước – xi nhan, gạt mưa cần có điện.'); return false; } return true; };
  const ACTIONS = {
    'lights-low': () => { S.lights = 'low'; setRadio('lights', 'low'); },
    'lights-high': () => { S.lights = 'high'; setRadio('lights', 'high'); },
    night: () => { S.night = !S.night; setCheck('night', S.night); applyBg(); },
    'sig-left': () => { if (needOn()) { S.sig = -1; setRadio('sig', '-1'); } },
    'sig-right': () => { if (needOn()) { S.sig = 1; setRadio('sig', '1'); } },
    hazard: () => { S.hazard = !S.hazard; setCheck('hazard', S.hazard); },
    'wiper-slow': () => { if (needOn()) { S.wiper = 'slow'; setRadio('wiper', 'slow'); } },
    'wiper-fast': () => { if (needOn()) { S.wiper = 'fast'; setRadio('wiper', 'fast'); } },
    wash: () => { if (needOn()) { S.wash = 3.5; toast('<i class="bi bi-droplet-half"></i> Phun nước rửa kính – gạt mưa tự gạt vài lần.'); } },
    fuel: () => { S.fuel = !S.fuel; setCheck('fuelDoor', S.fuel); },
    hood: () => { S.hood = !S.hood; setCheck('hood', S.hood); if (S.hood && view === 'ext') flyTo(PRESETS.ext[2]); },
    brake: () => { S.brake = true; setTimeout(() => { S.brake = false; }, 1800); },
    'gear-R': () => setGear('R'), 'gear-D': () => setGear('D'), 'gear-P': () => setGear('P'),
    horn: () => { hornOn(true); setTimeout(() => hornOn(false), 450); },
    'ign-on': () => setIgn('on'), 'ign-run': () => setIgn('run'),
    handbrake: () => { S.handbrake = !S.handbrake; setCheck('handbrake', S.handbrake); },
    belt: () => { S.belt = !S.belt; setCheck('belt', S.belt); },
    manual: () => { S.manual = !S.manual; setCheck('manual', S.manual); },
  };
  function setGear(g) {
    if (g !== 'P' && S.gear === 'P' && !S.brake) { S.brake = true; setTimeout(() => { S.brake = false; }, 900); toast('<i class="bi bi-info-circle"></i> Đạp phanh khi chuyển từ P sang số khác (đã tự đạp phanh cho bạn).'); }
    S.gear = g; setRadio('gear', g);
  }
  function setIgn(v) {
    if (S.ign === 'off' && v !== 'off') S.ignT = 0;
    if (v === 'run' && S.gear !== 'P' && S.gear !== 'N') { toast('<i class="bi bi-exclamation-circle"></i> Xe số tự động chỉ khởi động được ở P hoặc N.'); setRadio('ign', S.ign); return; }
    S.ign = v; setRadio('ign', v);
    engineSound(v === 'run');
    if (v === 'off') { S.sig = 0; setRadio('sig', '0'); S.wiper = 'off'; setRadio('wiper', 'off'); }
  }
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (b && ACTIONS[b.dataset.act]) ACTIONS[b.dataset.act](); });

  // điều khiển ở bảng bên dưới
  document.querySelectorAll('input[name="ign"]').forEach((r) => r.addEventListener('change', () => setIgn(r.value)));
  document.querySelectorAll('input[name="sig"]').forEach((r) => r.addEventListener('change', () => { if (r.value !== '0' && !needOn()) { setRadio('sig', String(S.sig)); return; } S.sig = Number(r.value); }));
  document.querySelectorAll('input[name="lights"]').forEach((r) => r.addEventListener('change', () => { S.lights = r.value; }));
  document.querySelectorAll('input[name="wiper"]').forEach((r) => r.addEventListener('change', () => { if (r.value !== 'off' && !needOn()) { setRadio('wiper', S.wiper); return; } S.wiper = r.value; }));
  document.querySelectorAll('input[name="gear"]').forEach((r) => r.addEventListener('change', () => setGear(r.value)));
  $('btnWash').addEventListener('click', ACTIONS.wash);
  $('hazard').addEventListener('change', (e) => { S.hazard = e.target.checked; });
  $('handbrake').addEventListener('change', (e) => { S.handbrake = e.target.checked; });
  $('belt').addEventListener('change', (e) => { S.belt = e.target.checked; });
  $('hood').addEventListener('change', (e) => { S.hood = e.target.checked; if (S.hood && view === 'ext') flyTo(PRESETS.ext[2]); });
  $('fuelDoor').addEventListener('change', (e) => { S.fuel = e.target.checked; });
  $('manual').addEventListener('change', (e) => { S.manual = e.target.checked; });
  $('night').addEventListener('change', (e) => { S.night = e.target.checked; applyBg(); });
  const hornBtn = $('btnHorn'), brakeBtn = $('btnBrake');
  hornBtn.addEventListener('pointerdown', () => hornOn(true));
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => hornBtn.addEventListener(ev, () => hornOn(false)));
  brakeBtn.addEventListener('pointerdown', () => { S.brake = true; });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => brakeBtn.addEventListener(ev, () => { S.brake = false; }));

  // ------------------------------------------------------------------ góc nhìn
  let view = 'ext';
  const EYE = new T.Vector3(0.82, 1.18, DRV);
  const PRESETS = {
    ext: [
      { label: 'Toàn cảnh', pos: [5.6, 2.6, -5.2], target: [0.1, 0.65, 0] },
      { label: 'Đầu xe', pos: [6.2, 1.5, 0.8], target: [1.4, 0.7, 0] },
      { label: 'Khoang máy', pos: [3.9, 2.6, -1.6], target: [1.45, 0.85, -0.05] },
      { label: 'Bên hông', pos: [0.4, 1.3, -5.6], target: [0.2, 0.7, 0] },
      { label: 'Đuôi xe', pos: [-5.8, 1.7, 1.6], target: [-1.6, 0.7, 0] },
    ],
    int: [
      { label: 'Nhìn thẳng', look: [1, -0.12, 0] },
      { label: 'Bảng đồng hồ', look: [1, -0.35, 0.02] },
      { label: 'Cần số & phanh tay', look: [0.55, -0.75, 0.55] },
      { label: 'Bàn đạp', look: [0.45, -0.88, 0.05] },
      { label: 'Nhìn trái', look: [0.1, -0.15, -1] },
    ],
  };
  let camAnim = null;
  function flyTo(p) {
    let pos, target;
    if (view === 'ext') { pos = new T.Vector3(...p.pos); target = new T.Vector3(...p.target); }
    else {
      const eye = car.localToWorld(EYE.clone());
      const dir = new T.Vector3(...p.look).normalize();
      target = eye.clone().addScaledVector(dir, 0.06);
      pos = eye;
    }
    camAnim = { t: 0, p0: camera.position.clone(), t0: controls.target.clone(), p1: pos, t1: target };
  }
  function setView(v) {
    view = v;
    setRadio('view', v);
    if (v === 'ext') {
      controls.minDistance = 2.5; controls.maxDistance = 16; controls.enablePan = true; controls.enableZoom = true;
      controls.maxPolarAngle = Math.PI * 0.49; controls.minPolarAngle = 0.1;
      camera.fov = 45; camera.near = 0.05;
      $('hint').textContent = 'Kéo chuột để xoay quanh xe · cuộn để phóng to · bấm số để xem chi tiết';
    } else {
      controls.minDistance = 0.06; controls.maxDistance = 0.06; controls.enablePan = false; controls.enableZoom = false;
      controls.maxPolarAngle = Math.PI * 0.92; controls.minPolarAngle = 0.25;
      camera.fov = 70; camera.near = 0.02;
      $('hint').textContent = 'Kéo chuột để nhìn quanh buồng lái · bấm số để xem chi tiết';
    }
    camera.updateProjectionMatrix();
    controls.rotateSpeed = v === 'int' ? -0.35 : 1;
    // trong buồng lái: đặt camera ngay tại mắt người lái
    if (v === 'int') {
      const eye = car.localToWorld(EYE.clone());
      const dir = new T.Vector3(1, -0.12, 0).normalize();
      controls.target.copy(eye).addScaledVector(dir, 0.06);
      camera.position.copy(eye);
      camAnim = null;
    } else flyTo(PRESETS.ext[0]);
    renderPresets();
    renderList();
  }
  function renderPresets() {
    const box = $('presets');
    box.innerHTML = '';
    PRESETS[view].forEach((p) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'btn btn-light'; b.textContent = p.label;
      b.addEventListener('click', () => flyTo(p));
      box.appendChild(b);
    });
  }
  document.querySelectorAll('input[name="view"]').forEach((r) => r.addEventListener('change', () => setView(r.value)));

  // ------------------------------------------------------------------ điểm chú thích trên màn hình
  const dotsBox = $('dots');
  const visible = () => HOTSPOTS.filter((h) => h.view === view && (!h.bay || S.hood));
  let selected = null;
  function renderList() {
    const list = $('list');
    const hs = visible();
    list.innerHTML = '';
    dotsBox.innerHTML = '';
    hs.forEach((h, i) => {
      h.num = i + 1;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'list-group-item list-group-item-action d-flex gap-2 align-items-center' + (selected === h ? ' active' : '');
      b.innerHTML = `<span class="car-dot-static">${h.num}</span><span>${h.title}</span>`;
      b.addEventListener('click', () => select(h, true));
      list.appendChild(b);
      const d = document.createElement('button');
      d.type = 'button';
      d.className = 'car-dot' + (selected === h ? ' sel' : '');
      d.textContent = h.num;
      d.title = h.title;
      d.setAttribute('aria-label', h.title);
      d.addEventListener('click', () => select(h, false));
      dotsBox.appendChild(d);
      h.el = d;
    });
    $('listCount').textContent = hs.length;
    if (view === 'ext' && !S.hood) list.insertAdjacentHTML('beforeend', '<button type="button" class="list-group-item list-group-item-action text-success" data-act="hood"><i class="bi bi-box-arrow-up"></i> Mở capo để xem thêm 7 chi tiết trong khoang máy</button>');
  }
  function select(h, fly) {
    selected = h;
    $('infoNum').textContent = h.num;
    $('infoTitle').textContent = h.title;
    $('infoBody').innerHTML = h.body;
    $('infoActions').innerHTML = h.actions ? h.actions() : '';
    renderList();
    if (fly) {
      const p = h.pos();
      if (view === 'ext') {
        const dir = new T.Vector3().subVectors(camera.position, controls.target).normalize();
        camAnim = { t: 0, p0: camera.position.clone(), t0: controls.target.clone(), p1: p.clone().addScaledVector(dir, 3.2), t1: p.clone() };
      } else {
        const eye = car.localToWorld(EYE.clone());
        const dir = p.clone().sub(eye).normalize();
        camAnim = { t: 0, p0: camera.position.clone(), t0: controls.target.clone(), p1: eye, t1: eye.clone().addScaledVector(dir, 0.06) };
      }
    }
    if (window.innerWidth < 1200) $('info').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  $('showDots').addEventListener('change', (e) => { dotsBox.hidden = !e.target.checked; });

  const ray = new T.Raycaster();
  const v3 = new T.Vector3();
  function updateDots() {
    const r = renderer.domElement.getBoundingClientRect();
    for (const h of visible()) {
      if (!h.el) continue;
      const p = h.pos();
      v3.copy(p).project(camera);
      const behind = v3.z > 1 || v3.z < -1;
      const x = (v3.x * 0.5 + 0.5) * r.width, y = (-v3.y * 0.5 + 0.5) * r.height;
      const out = behind || x < -20 || y < -20 || x > r.width + 20 || y > r.height + 20;
      h.el.style.display = out ? 'none' : '';
      if (out) continue;
      h.el.style.transform = `translate(${x - 13}px, ${y - 13}px)`;
      // mờ đi khi bị chi tiết khác che khuất
      const dist = camera.position.distanceTo(p);
      ray.set(camera.position, p.clone().sub(camera.position).normalize());
      ray.far = dist;
      const hit = ray.intersectObjects(occluders, false)[0];
      h.el.classList.toggle('dim', !!hit && hit.distance < dist - 0.12);
    }
  }

  // ------------------------------------------------------------------ cập nhật mô hình
  let lastHoodVisible = S.hood, lastBlink = 0;
  function update(dt, t) {
    if (S.ign !== 'off') S.ignT += dt;
    const blink = Math.floor(t * 2.6) % 2 === 0;
    const elec = S.ign !== 'off';
    const onL = blink && (S.hazard || (elec && S.sig < 0));
    const onR = blink && (S.hazard || (elec && S.sig > 0));
    ind.L.forEach((m) => { m.material.emissiveIntensity = onL ? 2 : 0; });
    ind.R.forEach((m) => { m.material.emissiveIntensity = onR ? 2 : 0; });
    const bl = Math.floor(t * 2.6) % 2;
    if (bl !== lastBlink && (S.hazard || (elec && S.sig))) click();
    lastBlink = bl;

    headMat.emissiveIntensity = S.lights === 'off' ? 0.15 : S.lights === 'low' ? 1.6 : 2.6;
    beams.forEach((b) => {
      b.intensity = S.lights === 'off' ? 0 : S.lights === 'low' ? 2.2 : 3.2;
      b.distance = S.lights === 'high' ? 34 : 16;
      b.angle = S.lights === 'high' ? 0.36 : 0.48;
      b.target.position.set(S.lights === 'high' ? 14 : 7, S.lights === 'high' ? 0.4 : 0, b.position.z * 1.6);
    });
    tailMat.emissiveIntensity = S.brake ? 2.4 : S.lights !== 'off' ? 0.9 : 0.15;
    brake3.emissiveIntensity = S.brake ? 2.4 : 0;
    revMat.emissiveIntensity = S.gear === 'R' && elec ? 2 : 0;
    tailGlow.intensity = S.brake ? 1.2 : 0;

    // gạt mưa: quét 0 → ~95° rồi về
    const speed = S.wash > 0 || S.wiper === 'slow' ? 1.6 : S.wiper === 'fast' ? 2.8 : 0;
    if (S.wash > 0) S.wash -= dt;
    if (speed && elec) {
      S.wiperA += S.wiperDir * speed * dt;
      if (S.wiperA > 1.65) { S.wiperA = 1.65; S.wiperDir = -1; }
      if (S.wiperA < 0) { S.wiperA = 0; S.wiperDir = 1; }
    } else if (S.wiperA > 0) { S.wiperA = Math.max(0, S.wiperA - 2 * dt); S.wiperDir = 1; }
    wipers.forEach((w) => { w.rotation.y = -S.wiperA; });

    // capo, nắp xăng
    S.hoodA += ((S.hood ? 1.15 : 0) - S.hoodA) * Math.min(1, dt * 4);
    hoodPivot.rotation.z = S.hoodA;
    S.fuelA += ((S.fuel ? 1.4 : 0) - S.fuelA) * Math.min(1, dt * 5);
    fuelPivot.rotation.y = -S.fuelA;          // mở ra phía ngoài xe
    if (lastHoodVisible !== S.hood) { lastHoodVisible = S.hood; renderList(); }

    // nội thất
    stalkL.rotation.x = S.sig * 0.25;
    stalkR.rotation.x = S.wiper === 'off' ? 0 : S.wiper === 'slow' ? -0.2 : -0.35;
    const gz = { P: 0.07, R: 0.035, N: 0, D: -0.035 }[S.gear];
    gearLever.position.x = 1.38 + gz;
    hbLever.rotation.z = S.handbrake ? 0.45 : 0.05;
    pedals.brake.rotation.z = S.brake ? -0.25 : 0;
    pedals.clutch.visible = S.manual;
    beltOn.visible = S.belt; beltOff.visible = !S.belt;
    scr.material.emissiveIntensity = elec ? 1 : 0.05;
    hazBtn.material.emissiveIntensity = S.hazard && blink ? 2 : 0.15;
    drawCluster(t);
  }

  // ------------------------------------------------------------------ vòng lặp
  function resize() {
    const w = viewer.clientWidth, h = viewer.clientHeight;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(viewer);
  resize();
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt, now / 1000);
    if (camAnim) {
      camAnim.t = Math.min(1, camAnim.t + dt / 0.8);
      const e = camAnim.t * camAnim.t * (3 - 2 * camAnim.t);
      camera.position.lerpVectors(camAnim.p0, camAnim.p1, e);
      controls.target.lerpVectors(camAnim.t0, camAnim.t1, e);
      if (camAnim.t >= 1) camAnim = null;
    }
    controls.update();
    renderer.render(scene, camera);
    updateDots();
  }

  // ------------------------------------------------------------------ khởi động
  applyBg();
  camera.position.set(...PRESETS.ext[0].pos);
  controls.target.set(...PRESETS.ext[0].target);
  setView('ext');
  camAnim = null;
  // mở thẳng một chi tiết: xe-co-ban.html#battery
  const hash = location.hash.slice(1);
  const hs = HOTSPOTS.find((h) => h.id === hash);
  if (hash === 'hood' || (hs && hs.bay)) { S.hood = true; setCheck('hood', true); renderList(); }
  if (hs) {
    if (hs.view === 'int') setView('int');
    setTimeout(() => select(visible().find((h) => h.id === hs.id), true), 300);
  } else if (hash === 'hood') setTimeout(() => flyTo(PRESETS.ext[2]), 200);
  requestAnimationFrame(frame);
  window.Car3D = { S, setView, select: (id) => select(visible().find((h) => h.id === id), true), ACTIONS };
})();
