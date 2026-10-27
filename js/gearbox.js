// Cấu tạo hộp số sàn 5 cấp + số lùi: mô hình 3D cắt lớp (three.js) + mô phỏng ly hợp, đồng tốc, sang số theo sơ đồ H.
// Trục: x dọc trục hộp số (động cơ ở phía −x), y lên trên. Trục sơ cấp/thứ cấp ở y = 0, trục trung gian ở y = −2,4.
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const T = window.THREE;

  // ------------------------------------------------------------------ thông số
  const MOD = 0.1;                 // mô-đun bánh răng (đơn vị cảnh)
  const CNT_Y = -2.4;              // trục trung gian: khoảng cách trục = MOD·(16+32)/2
  const VIS = 0.06;                // tỉ lệ tốc độ quay hiển thị (để mắt theo kịp)
  const FD = 4.1, RW = 0.3, MASS = 1150;   // tỉ số truyền cuối, bán kính bánh xe (m), khối lượng xe (kg)
  const J_E = 0.18, J_IN = 0.04;   // mô-men quán tính động cơ, trục sơ cấp + đĩa ly hợp (kg·m²)
  const CLUTCH_MAX = 260;          // mô-men ly hợp tối đa (N·m)
  const W_IDLE = 84;               // 800 vòng/phút
  const RPM = 60 / (2 * Math.PI);

  // Số: mặt phẳng H (u), hướng cần (w: −1 đẩy lên, +1 kéo xuống), ống gài, số răng trung gian/thứ cấp
  const GEARS = {
    1: { u: -1, w: -1, sleeve: 'A', zc: 17, zo: 31, x: 0.75, color: 0xe25555 },
    2: { u: -1, w: 1, sleeve: 'A', zc: 23, zo: 25, x: -0.15, color: 0xf08c2e },
    3: { u: 0, w: -1, sleeve: 'B', zc: 28, zo: 20, x: -0.7, color: 0xe6c12f },
    4: { u: 0, w: 1, sleeve: 'B', direct: true, color: 0x4b8fe0 },
    5: { u: 1, w: -1, sleeve: 'C', zc: 34, zo: 14, x: 2.2, color: 0x3fb56a },
    R: { u: 1, w: 1, sleeve: 'C', zc: 14, zo: 30, zi: 12, x: 1.3, color: 0x9a6ae0 },
  };
  const SLEEVES = { A: { x: 0.3, u: -1 }, B: { x: -1.15, u: 0 }, C: { x: 1.75, u: 1 } };
  const SLEEVE_TRAVEL = 0.13;
  function ratioOf(g) {
    if (!g || g === 'N') return 0;
    const d = GEARS[g];
    if (d.direct) return 1;
    const r = 2 * d.zo / d.zc;
    return g === 'R' ? -r : r;
  }

  // ------------------------------------------------------------------ hình học
  function gearGeo(z, width, holeR, mod) {
    const m = mod || MOD;
    const rp = m * z / 2, ra = rp + m, rr = rp - 1.25 * m;
    const s = new T.Shape();
    const p = (2 * Math.PI) / z;
    const pt = (a, r) => [Math.cos(a) * r, Math.sin(a) * r];
    for (let i = 0; i < z; i++) {
      const a0 = i * p;
      const seq = [[0, rr], [0.2, rr], [0.3, ra], [0.5, ra], [0.6, rr]];
      seq.forEach(([f, r], k) => {
        const [x, y] = pt(a0 + f * p, r);
        if (i === 0 && k === 0) s.moveTo(x, y); else s.lineTo(x, y);
      });
    }
    s.closePath();
    if (holeR) { const h = new T.Path(); h.absarc(0, 0, holeR, 0, Math.PI * 2, true); s.holes.push(h); }
    const g = new T.ExtrudeGeometry(s, { depth: width, bevelEnabled: false, curveSegments: 6 });
    g.translate(0, 0, -width / 2);
    g.rotateY(Math.PI / 2);
    return g;
  }
  function cylX(r0, r1, len, seg, open) {
    const g = new T.CylinderGeometry(r0, r1, len, seg || 32, 1, !!open);
    g.rotateZ(-Math.PI / 2);
    return g;
  }
  // Ống tròn quay quanh trục x từ biên dạng [bán kính, x]
  function latheX(profile, seg) {
    const g = new T.LatheGeometry(profile.map(([r, x]) => new T.Vector2(r, x)), seg || 48);
    g.rotateZ(-Math.PI / 2);
    return g;
  }
  function rodBetween(a, b, r, mat) {
    const dir = new T.Vector3().subVectors(b, a);
    const m = new T.Mesh(new T.CylinderGeometry(r, r, dir.length(), 12), mat);
    m.position.copy(a).addScaledVector(dir, 0.5);
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir.normalize());
    return m;
  }
  const steel = (c) => new T.MeshStandardMaterial({ color: c || 0xb9c0c8, metalness: 0.75, roughness: 0.32 });
  const tinted = (c) => new T.MeshStandardMaterial({ color: c, metalness: 0.55, roughness: 0.38 });

  // ------------------------------------------------------------------ cảnh
  const viewer = $('viewer');
  const renderer = new T.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.localClippingEnabled = true;
  viewer.prepend(renderer.domElement);
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(42, 1, 0.1, 200);
  camera.position.set(4.5, 3.2, 12);
  const controls = new T.OrbitControls(camera, renderer.domElement);
  controls.target.set(-0.2, -1, 0);
  controls.enableDamping = true;
  controls.minDistance = 3;
  controls.maxDistance = 30;

  scene.add(new T.HemisphereLight(0xffffff, 0x445566, 0.85));
  const key = new T.DirectionalLight(0xffffff, 0.9); key.position.set(6, 10, 8); scene.add(key);
  const rim = new T.DirectionalLight(0xbcd4ff, 0.45); rim.position.set(-8, 4, -6); scene.add(rim);

  function applyBg() {
    const dark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
    scene.background = new T.Color(dark ? 0x1b1f26 : 0xeef1f5);
  }
  applyBg();
  new MutationObserver(applyBg).observe(document.documentElement, { attributes: true, attributeFilter: ['data-bs-theme'] });

  // ---- danh sách chi tiết (tên + mô tả) để hiện nhãn, tô sáng
  const parts = [];
  const pickables = [];
  function part(id, name, desc, objs) {
    const list = [].concat(objs);
    const mats = new Set();
    list.forEach((o) => o.traverse((c) => { if (c.isMesh) { pickables.push(c); c.userData.part = id; mats.add(c.material); } }));
    const p = { id, name, desc, objs: list, mats: [...mats] };
    parts.push(p);
    return p;
  }
  const partById = (id) => parts.find((p) => p.id === id);

  // ---- động cơ + ly hợp
  const engineRot = new T.Group(); scene.add(engineRot);
  const inputRot = new T.Group(); scene.add(inputRot);
  const outputRot = new T.Group(); scene.add(outputRot);
  const counterRot = new T.Group(); counterRot.position.y = CNT_Y; scene.add(counterRot);

  const block = new T.Mesh(new T.BoxGeometry(1.6, 4.2, 3.6), new T.MeshStandardMaterial({ color: 0x5b6470, metalness: 0.3, roughness: 0.7, transparent: true, opacity: 0.35 }));
  block.position.set(-5.0, -0.4, 0);
  scene.add(block);
  const crank = new T.Mesh(cylX(0.28, 0.28, 1.2), steel(0x8c939c));
  crank.position.x = -4.2;
  engineRot.add(crank);
  part('engine', 'Động cơ (trục khuỷu)', 'Nguồn mô-men xoắn. Trục khuỷu quay liên tục khi động cơ nổ máy và gắn cứng với bánh đà.', [block, crank]);

  const flywheel = new T.Group();
  const fwDisc = new T.Mesh(cylX(2.05, 2.05, 0.28, 64), steel(0x7e858e));
  const ring = new T.Mesh(gearGeo(44, 0.18, 2.05), steel(0x9aa1aa));
  flywheel.add(fwDisc, ring);
  flywheel.position.x = -3.6;
  engineRot.add(flywheel);
  part('flywheel', 'Bánh đà', 'Gắn vào trục khuỷu, có vành răng để máy khởi động quay. Mặt sau là bề mặt ma sát để đĩa ly hợp ép vào.', flywheel);

  const facingMat = new T.MeshStandardMaterial({ color: 0x6b4a32, roughness: 0.95 });
  const disc = new T.Group();
  disc.add(new T.Mesh(latheX([[0.62, -0.05], [1.5, -0.05], [1.5, 0.05], [0.62, 0.05]], 64), facingMat));
  disc.add(new T.Mesh(cylX(0.4, 0.4, 0.18, 24), steel(0xa8afb7)));
  disc.position.x = -3.36;
  inputRot.add(disc);
  part('disc', 'Đĩa ly hợp (đĩa ma sát)', 'Lắp then hoa trên trục sơ cấp, hai mặt có lớp ma sát. Bị bàn ép kẹp vào bánh đà thì truyền mô-men từ động cơ sang hộp số.', disc);

  const pressure = new T.Mesh(latheX([[0.75, -0.07], [1.55, -0.07], [1.55, 0.07], [0.75, 0.07]], 64), steel(0x9da5ae));
  pressure.position.x = -3.2;
  engineRot.add(pressure);
  part('pressure', 'Bàn ép', 'Quay cùng bánh đà. Lò xo đĩa đẩy bàn ép kẹp chặt đĩa ly hợp; khi đạp côn, bàn ép lùi ra để nhả đĩa.', pressure);

  const coverMat = new T.MeshStandardMaterial({ color: 0x8a929b, metalness: 0.6, roughness: 0.4, transparent: true, opacity: 0.45, side: T.DoubleSide });
  const cover = new T.Mesh(latheX([[2.0, -3.46], [1.75, -3.4], [1.72, -2.98], [0.55, -2.92]], 64), coverMat);
  engineRot.add(cover);
  const diaphragm = new T.Mesh(latheX([[1.45, -3.08], [0.42, -2.86]], 48), new T.MeshStandardMaterial({ color: 0x40464e, metalness: 0.7, roughness: 0.35, side: T.DoubleSide }));
  engineRot.add(diaphragm);
  part('cover', 'Vỏ ly hợp & lò xo đĩa', 'Vỏ bắt bu-lông vào bánh đà. Lò xo đĩa (lò xo màng) tạo lực ép; đầu các lá lò xo bị bi tê đẩy vào khi đạp côn.', [cover, diaphragm]);

  const bearing = new T.Mesh(latheX([[0.3, -0.1], [0.55, -0.1], [0.55, 0.1], [0.3, 0.1]], 32), steel(0xd0d5da));
  bearing.position.x = -2.62;
  scene.add(bearing);
  const forkMat = steel(0x5f6873);
  const releaseFork = new T.Group();
  releaseFork.position.set(-2.45, 0, 0);
  releaseFork.add(rodBetween(new T.Vector3(0, 0.75, 0.05), new T.Vector3(0, -1.6, 0.05), 0.06, forkMat));
  scene.add(releaseFork);
  const slave = new T.Mesh(cylX(0.16, 0.16, 0.7), steel(0x9aa1aa));
  slave.position.set(-1.85, -1.6, 0.05);
  scene.add(slave);
  part('bearing', 'Bi tê & càng cắt ly hợp', 'Khi đạp côn, xi-lanh con đẩy càng cắt, càng đẩy bi tê ép vào đầu lò xo đĩa làm bàn ép nhả đĩa ly hợp.', [bearing, releaseFork, slave]);

  // bàn đạp côn
  const pedal = new T.Group();
  pedal.position.set(-4.6, -2.2, 2.6);
  const pedalArm = rodBetween(new T.Vector3(0, 0, 0), new T.Vector3(0.15, -1.5, 0), 0.06, steel(0x3c424a));
  const pad = new T.Mesh(new T.BoxGeometry(0.5, 0.12, 0.6), new T.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 }));
  pad.position.set(0.18, -1.55, 0);
  pedal.add(pedalArm, pad, new T.Mesh(cylX(0.08, 0.08, 0.1), steel()));
  pedal.children[2].rotation.y = Math.PI / 2;
  scene.add(pedal);
  const pushrod = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 1, 8), steel(0x8a929b));
  scene.add(pushrod);
  part('pedal', 'Bàn đạp côn', 'Người lái đạp côn → dầu trong xi-lanh chính đẩy xi-lanh con → càng cắt ly hợp. Nhả côn từ từ thì đĩa ly hợp ăn dần.', [pedal, pushrod]);

  // ---- trục sơ cấp + bánh răng dẫn động (số 4 truyền thẳng)
  const inShaft = new T.Mesh(cylX(0.22, 0.22, 2.05), steel(0x9fa7b0));
  inShaft.position.x = -2.45;
  inputRot.add(inShaft);
  const driveMat = tinted(GEARS[4].color);
  const driveGear = new T.Mesh(gearGeo(16, 0.3, 0.2), driveMat);
  driveGear.position.x = -1.6;
  inputRot.add(driveGear);
  const driveDog = new T.Mesh(gearGeo(22, 0.07, 0.2, 0.045), driveMat);
  driveDog.position.x = -1.415;
  inputRot.add(driveDog);
  part('input', 'Trục sơ cấp', 'Nhận mô-men từ đĩa ly hợp. Đạp côn thì trục này tách khỏi động cơ.', inShaft);
  part('drive', 'Bánh răng dẫn động (số 4 truyền thẳng)', 'Liền với trục sơ cấp, luôn ăn khớp với bánh răng trên trục trung gian. Ở số 4, ống gài 3–4 khoá thẳng trục sơ cấp với trục thứ cấp (tỉ số 1:1).', [driveGear, driveDog]);

  // ---- trục thứ cấp + ống gài + vành đồng tốc
  const outShaft = new T.Mesh(cylX(0.25, 0.25, 4.85), steel(0xa9b1ba));
  outShaft.position.x = 0.98;
  outputRot.add(outShaft);
  const flange = new T.Mesh(cylX(0.6, 0.6, 0.12, 6), steel(0x7e858e));
  flange.position.x = 3.45;
  outputRot.add(flange);
  part('output', 'Trục thứ cấp (trục ra)', 'Nối ra cầu xe. Các bánh răng số lồng không trên trục này; chỉ bánh răng được ống gài khoá mới truyền lực.', [outShaft, flange]);

  const brassMat = new T.MeshStandardMaterial({ color: 0xc9a227, metalness: 0.8, roughness: 0.3 });
  const sleeveObjs = {};
  for (const [id, s] of Object.entries(SLEEVES)) {
    const g = new T.Group();
    g.add(new T.Mesh(latheX([[0.3, -0.12], [0.62, -0.12], [0.62, -0.06], [0.53, -0.06], [0.53, 0.06], [0.62, 0.06], [0.62, 0.12], [0.3, 0.12]], 48), tinted(0xd9b44a)));
    for (const sgn of [-1, 1]) {
      const blk = new T.Mesh(cylX(0.5, 0.44, 0.06, 32, true), brassMat);
      blk.position.x = sgn * 0.2;
      g.add(blk);
    }
    const hub = new T.Mesh(cylX(0.33, 0.33, 0.22, 24), steel(0x8a929b));
    g.add(hub);
    g.position.x = s.x;
    outputRot.add(g);
    sleeveObjs[id] = g;
  }
  part('sleeveA', 'Ống gài số 1–2 (bộ đồng tốc)', 'Lắp then hoa trên trục thứ cấp, trượt dọc trục. Vành đồng tốc (màu đồng) dùng ma sát làm bánh răng cùng tốc độ với trục rồi ống gài mới khớp vấu răng.', sleeveObjs.A);
  part('sleeveB', 'Ống gài số 3–4 (bộ đồng tốc)', 'Gạt về phía động cơ: khoá trục sơ cấp với trục thứ cấp (số 4). Gạt ngược lại: khoá bánh răng số 3.', sleeveObjs.B);
  part('sleeveC', 'Ống gài số 5–lùi', 'Gạt lên: khoá bánh răng số 5. Gạt xuống: khoá bánh răng số lùi.', sleeveObjs.C);

  // ---- trục trung gian + các bánh răng số
  const cntShaft = new T.Mesh(cylX(0.25, 0.25, 4.5), steel(0x98a0a9));
  cntShaft.position.x = 0.25;
  counterRot.add(cntShaft);
  const cntDrive = new T.Mesh(gearGeo(32, 0.3, 0.25), tinted(GEARS[4].color));
  cntDrive.position.x = -1.6;
  counterRot.add(cntDrive);
  part('counter', 'Trục trung gian', 'Luôn được bánh răng dẫn động quay (tỉ số 2:1). Mang các bánh răng liền trục, luôn ăn khớp với các bánh răng số trên trục thứ cấp.', [cntShaft, cntDrive]);

  const outGears = {}, cntGears = {};
  for (const [g, d] of Object.entries(GEARS)) {
    if (d.direct) continue;
    const mat = tinted(d.color);
    const cg = new T.Mesh(gearGeo(d.zc, 0.3, 0.25), mat);
    cg.position.x = d.x;
    counterRot.add(cg);
    cntGears[g] = cg;
    const og = new T.Group();
    og.add(new T.Mesh(gearGeo(d.zo, 0.3, 0.27), mat.clone()));
    const side = Math.sign(SLEEVES[d.sleeve].x - d.x);
    const dog = new T.Mesh(gearGeo(22, 0.07, 0.27, 0.045), og.children[0].material);
    dog.position.x = side * 0.185;
    og.add(dog);
    og.position.x = d.x;
    scene.add(og);
    outGears[g] = og;
  }
  const NAMES = { 1: 'số 1', 2: 'số 2', 3: 'số 3', 5: 'số 5', R: 'số lùi' };
  for (const g of ['1', '2', '3', '5']) {
    part('g' + g, `Cặp bánh răng ${NAMES[g]}`, `Bánh răng trên trục trung gian (${GEARS[g].zc} răng) luôn ăn khớp với bánh răng ${NAMES[g]} lồng không trên trục thứ cấp (${GEARS[g].zo} răng). Tỉ số truyền tổng: ${ratioOf(g).toFixed(2).replace('.', ',')}.`, [cntGears[g], outGears[g]]);
  }
  // số lùi có bánh răng trung gian đảo chiều
  const OUT_IDLER = { y: -1.7667, z: 1.1353 };
  const idlerGear = new T.Mesh(gearGeo(12, 0.3, 0.2), tinted(GEARS.R.color));
  idlerGear.position.set(GEARS.R.x, OUT_IDLER.y, OUT_IDLER.z);
  scene.add(idlerGear);
  const idlerShaft = new T.Mesh(cylX(0.12, 0.12, 0.8), steel(0x8a929b));
  idlerShaft.position.copy(idlerGear.position);
  scene.add(idlerShaft);
  part('gR', 'Cặp bánh răng số lùi + bánh răng đảo chiều', 'Bánh răng trung gian (bánh răng lùi) chen giữa làm trục thứ cấp quay ngược chiều. Chỉ được vào số lùi khi xe đã dừng hẳn.', [cntGears.R, outGears.R, idlerGear, idlerShaft]);

  // ---- càng gạt, thanh trượt, cần số
  const RAIL_Y = 1.95;
  // thanh trượt xếp theo mặt phẳng H; ngón chọn ở chân cần số chạm đúng thanh đang chọn
  const railZ = { A: -0.21, B: 0, C: 0.21 };
  const forkGroups = {};
  for (const id of Object.keys(SLEEVES)) {
    const g = new T.Group();
    const rail = new T.Mesh(cylX(0.06, 0.06, 4.6), steel(0x868e98));
    rail.position.set(0.3 - SLEEVES[id].x, RAIL_Y, railZ[id]);
    g.add(rail);
    const yoke = new T.Mesh(new T.TorusGeometry(0.58, 0.045, 8, 28, Math.PI), forkMat);
    yoke.rotation.y = Math.PI / 2;
    g.add(yoke);
    g.add(rodBetween(new T.Vector3(0, 0.6, 0), new T.Vector3(0, RAIL_Y, railZ[id]), 0.05, forkMat));
    const notch = new T.Mesh(new T.BoxGeometry(0.16, 0.22, 0.16), forkMat);
    notch.position.set(0.3 - SLEEVES[id].x, RAIL_Y + 0.15, railZ[id]);
    g.add(notch);
    g.position.x = SLEEVES[id].x;
    scene.add(g);
    forkGroups[id] = g;
  }
  part('forks', 'Càng gạt & thanh trượt', 'Mỗi thanh trượt mang một càng gạt ôm vào rãnh ống gài. Cần số chọn thanh (sang trái/phải) rồi đẩy thanh tới/lui để gạt ống gài.', Object.values(forkGroups));

  const lever = new T.Group();
  lever.position.set(0.3, 3.0, 0);
  const LEVER_LEN = 1.7;
  lever.add(rodBetween(new T.Vector3(0, -0.85, 0), new T.Vector3(0, LEVER_LEN, 0), 0.06, steel(0x5a626c)));
  const knob = new T.Mesh(new T.SphereGeometry(0.24, 24, 16), new T.MeshStandardMaterial({ color: 0x1f2328, roughness: 0.5 }));
  knob.position.y = LEVER_LEN;
  lever.add(knob);
  lever.add(new T.Mesh(new T.SphereGeometry(0.16, 16, 12), steel(0x9aa1aa)));
  scene.add(lever);
  // tấm dẫn hướng chữ H
  const gc = document.createElement('canvas'); gc.width = gc.height = 256;
  const gx = gc.getContext('2d');
  gx.fillStyle = '#2b3036'; gx.fillRect(0, 0, 256, 256);
  gx.strokeStyle = '#0d0f12'; gx.lineWidth = 26; gx.lineCap = 'round';
  gx.beginPath();
  for (const u of [-1, 0, 1]) { gx.moveTo(128 + u * 70, 52); gx.lineTo(128 + u * 70, 204); }
  gx.moveTo(58, 128); gx.lineTo(198, 128); gx.stroke();
  gx.fillStyle = '#e8edf3'; gx.font = 'bold 26px Arial'; gx.textAlign = 'center'; gx.textBaseline = 'middle';
  [['1', -1, 26], ['2', -1, 230], ['3', 0, 26], ['4', 0, 230], ['5', 1, 26], ['R', 1, 230]].forEach(([t, u, y]) => gx.fillText(t, 128 + u * 70, y));
  const gateTex = new T.CanvasTexture(gc);
  const gate = new T.Mesh(new T.BoxGeometry(1.3, 0.06, 1.3), [forkMat, forkMat, new T.MeshStandardMaterial({ map: gateTex }), forkMat, forkMat, forkMat]);
  gate.position.set(0.3, 3.6, 0);
  gate.rotation.y = -Math.PI / 2;      // chữ số 1 hướng về phía động cơ
  scene.add(gate);
  part('lever', 'Cần số (sơ đồ H)', 'Gạt sang trái/phải để chọn thanh trượt, đẩy lên/kéo xuống để vào số. Phải đạp hết côn trước khi vào số.', [lever, gate]);

  // ---- bánh xe chủ động (qua vi sai)
  const wheel = new T.Group();
  wheel.position.set(5.0, -1.2, 0);
  const tire = new T.Mesh(new T.TorusGeometry(0.95, 0.32, 16, 40), new T.MeshStandardMaterial({ color: 0x23262b, roughness: 0.9 }));
  const rimM = new T.Mesh(new T.CylinderGeometry(0.75, 0.75, 0.3, 24), steel(0xc5cbd2));
  rimM.rotation.x = Math.PI / 2;
  const spokes = new T.Mesh(new T.BoxGeometry(1.4, 0.18, 0.34), steel(0x8a929b));
  wheel.add(tire, rimM, spokes);
  scene.add(wheel);
  const prop = new T.Mesh(cylX(0.12, 0.12, 1.2), steel(0x7e858e));
  prop.position.x = 4.05;
  outputRot.add(prop);
  part('wheel', 'Bánh xe chủ động (qua vi sai, tỉ số 4,1)', 'Trục thứ cấp nối qua các-đăng và bộ vi sai tới bánh xe. Ở số N, bánh xe quay tự do không nối với động cơ.', [wheel, prop]);

  // ---- vỏ hộp số (cắt lớp)
  const shellMat = new T.MeshStandardMaterial({ color: 0x9fb3c8, metalness: 0.3, roughness: 0.6, transparent: true, opacity: 0.22, side: T.DoubleSide, depthWrite: false });
  const edgeMat = new T.LineBasicMaterial({ color: 0x6b7f94, transparent: true, opacity: 0.6 });
  const cutPlane = new T.Plane(new T.Vector3(0, 0, -1), 0);
  const housing = new T.Group();
  {
    const s = new T.Shape();
    const y0 = -4.5, y1 = 2.35, z0 = -2.2, z1 = 2.2, r = 0.8;
    s.moveTo(z0 + r, y0); s.lineTo(z1 - r, y0); s.quadraticCurveTo(z1, y0, z1, y0 + r);
    s.lineTo(z1, y1 - r); s.quadraticCurveTo(z1, y1, z1 - r, y1); s.lineTo(z0 + r, y1);
    s.quadraticCurveTo(z0, y1, z0, y1 - r); s.lineTo(z0, y0 + r); s.quadraticCurveTo(z0, y0, z0 + r, y0);
    const g = new T.ExtrudeGeometry(s, { depth: 4.85, bevelEnabled: false, curveSegments: 10 });
    g.rotateY(Math.PI / 2);            // đùn theo trục x; hình cắt nằm trong mặt (y, z)
    g.translate(-2.05, 0, 0);
    housing.add(new T.Mesh(g, shellMat));
    housing.add(new T.LineSegments(new T.EdgesGeometry(g, 25), edgeMat));
    const bell = latheX([[2.55, -4.0], [2.55, -3.0], [2.0, -2.05]], 64);
    housing.add(new T.Mesh(bell, shellMat));
    housing.add(new T.LineSegments(new T.EdgesGeometry(bell, 25), edgeMat));
  }
  scene.add(housing);
  part('housing', 'Vỏ hộp số & vỏ ly hợp', 'Vỏ nhôm đúc chứa dầu bôi trơn và đỡ các ổ bi của trục. Mô hình được cắt bỏ nửa trước để nhìn thấy bên trong.', housing);
  function setHousing(mode) {
    housing.visible = mode !== 'hide';
    const planes = mode === 'cut' ? [cutPlane] : [];
    shellMat.clippingPlanes = planes; edgeMat.clippingPlanes = planes;
    shellMat.opacity = mode === 'cut' ? 0.35 : 0.16;
    shellMat.needsUpdate = edgeMat.needsUpdate = true;
  }
  setHousing('cut');

  // ------------------------------------------------------------------ pha ăn khớp bánh răng
  // Góc ψ của hướng (y, z) trong mặt quay: (y, z) = (sin ψ, −cos ψ)
  const dirAngle = (dy, dz) => Math.atan2(dy, -dz);
  // Bánh B ăn khớp với A: răng của A ở hướng tiếp xúc thì rãnh của B đối diện
  function meshAngle(thA, zA, zB, psiAB) {
    const pA = 2 * Math.PI / zA, pB = 2 * Math.PI / zB;
    return (psiAB + Math.PI - 0.9 * pB) - (thA - (psiAB - 0.4 * pA)) * zA / zB;
  }
  const PSI_DOWN = dirAngle(-1, 0), PSI_UP = dirAngle(1, 0);
  const PSI_CI = dirAngle(OUT_IDLER.y - CNT_Y, OUT_IDLER.z);
  const PSI_IO = dirAngle(-OUT_IDLER.y, -OUT_IDLER.z);

  // ------------------------------------------------------------------ trạng thái mô phỏng
  const S = {
    pedal: 0, pedalTarget: 0, pedalRate: 2,
    throttle: 0, brake: false,
    gear: 'N', lever: { u: 0, w: 0 }, shift: null,
    wE: W_IDLE, wIn: W_IDLE, v: 0, stalled: false, locked: true, Tc: 0,
    thE: 0, thIn: 0, thOut: 0, thWheel: 0, showFlow: true, simT: 0,
  };
  const clutchC = (p) => { let c = Math.min(1, Math.max(0, (0.72 - p) / 0.42)); return c * c * (3 - 2 * c); };
  const engaged = () => S.gear !== 'N' && !S.shift;

  function engineTorque() {
    if (S.stalled) return S.wE > 0.5 ? -30 : 0;
    const target = W_IDLE + S.throttle * 330;
    const tmax = 80 + 140 * S.throttle;
    return Math.max(-25, Math.min(tmax, 4 * (target - S.wE) + 10));
  }

  function physics(dt) {
    // bàn đạp côn tiến dần về vị trí đích
    const dp = S.pedalTarget - S.pedal;
    S.pedal += Math.sign(dp) * Math.min(Math.abs(dp), S.pedalRate * dt);
    const cap = clutchC(S.pedal) * CLUTCH_MAX;
    const Te = engineTorque();

    let Jin = J_IN, TL, ground = false;
    const R = ratioOf(engaged() ? S.gear : 'N');
    if (R) {
      Jin = MASS * Math.pow(RW / (Math.abs(R) * FD), 2) + J_IN;
      const sv = Math.sign(S.v);
      const F = 160 * sv + 0.4 * S.v * Math.abs(S.v) + (S.brake ? 9000 * sv : 0);
      TL = F * RW / (R * FD);
      if (S.brake && Math.abs(S.v) < 0.08) { ground = true; S.v = 0; S.wIn = 0; }
    } else {
      TL = 0.8 * Math.sign(S.wIn) + 0.002 * S.wIn;
    }

    if (S.locked && !ground && cap > 0) {
      const a = (Te - TL) / (J_E + Jin);
      const need = TL + Jin * a;
      if (Math.abs(need) > cap) S.locked = false;
      else { S.wE += a * dt; S.wIn = S.wE; S.Tc = need; }
    } else S.locked = false;

    if (!S.locked) {
      const s = S.wE - S.wIn;
      const Tc = cap > 0 && Math.abs(s) > 1e-6 ? cap * Math.sign(s) : 0;
      S.Tc = Tc;
      S.wE += (Te - Tc) / J_E * dt;
      if (!ground) {
        const prev = S.wIn;
        S.wIn += (Tc - TL) / Jin * dt;
        if (!R && Math.abs(S.wIn) < 0.5 && Math.abs(Tc) < 0.8) S.wIn = 0;
        if (!R && Math.sign(S.wIn) !== Math.sign(prev) && Math.abs(Tc) < 0.8) S.wIn = 0;
      }
      if (cap > 0 && !ground && Math.sign(S.wE - S.wIn) !== Math.sign(s)) {
        const w = (J_E * S.wE + Jin * S.wIn) / (J_E + Jin);
        S.wE = S.wIn = w; S.locked = true;
      }
    }

    if (S.stalled && S.wE < 0.5) S.wE = 0;
    if (!S.stalled && S.wE < 33) { S.stalled = true; onStall(); }

    if (R) {
      if (!ground) S.v = S.wIn / (R * FD) * RW;
    } else {
      const dec = 0.14 + (S.brake ? 6 : 0) + 0.0003 * S.v * S.v;
      S.v = Math.abs(S.v) <= dec * dt ? 0 : S.v - Math.sign(S.v) * dec * dt;
    }
  }

  // ------------------------------------------------------------------ sang số
  function leverTarget(g) { return g === 'N' ? { u: S.lever.u, w: 0 } : { u: GEARS[g].u, w: GEARS[g].w }; }
  const ui = {};       // hàm cập nhật giao diện (gán ở dưới)

  function requestShift(target) {
    if (S.shift || target === S.gear) return Promise.resolve(false);
    const free = clutchC(S.pedal) < 0.02;
    if (target !== 'N' && !free) {
      grind('Rắc rắc! Chưa đạp hết côn nên ống gài không vào được số. Hãy đạp côn hết hành trình rồi mới vào số.');
      return Promise.resolve(false);
    }
    if (target === 'R' && S.v > 0.3) { grind('Xe đang chạy tới – phải dừng hẳn xe mới được vào số lùi.'); return Promise.resolve(false); }
    if (target !== 'R' && target !== 'N' && S.v < -0.3) { grind('Xe đang lùi – phải dừng hẳn xe mới được vào số tiến.'); return Promise.resolve(false); }
    const to = leverTarget(target);
    const from = { ...S.lever };
    const path = [from];
    if (from.w !== 0) path.push({ u: from.u, w: 0 });
    if (to.u !== from.u) path.push({ u: to.u, w: 0 });
    if (to.w !== 0) path.push(to);
    if (path.length === 1) path.push(to);
    S.gear = 'N';
    return new Promise((resolve) => {
      S.shift = { path, seg: 0, t: 0, target, resolve };
    });
  }

  function stepShift(dt) {
    const sh = S.shift;
    if (!sh) return;
    const a = sh.path[sh.seg], b = sh.path[sh.seg + 1];
    const len = Math.max(0.2, Math.hypot(b.u - a.u, b.w - a.w));
    sh.t += dt / (0.28 * len);
    const k = Math.min(1, sh.t);
    const e = k * k * (3 - 2 * k);
    S.lever.u = a.u + (b.u - a.u) * e;
    S.lever.w = a.w + (b.w - a.w) * e;
    // bộ đồng tốc: khi ống gài tiến gần bánh răng, trục sơ cấp (đang tách côn) được kéo về đúng tốc độ
    if (sh.target !== 'N' && sh.seg === sh.path.length - 2 && Math.abs(S.lever.w) > 0.55) {
      const want = S.v / RW * FD * ratioOf(sh.target);
      S.wIn += (want - S.wIn) * Math.min(1, dt * 12);
    }
    if (k >= 1) {
      sh.seg++; sh.t = 0;
      if (sh.seg >= sh.path.length - 1) {
        S.lever = { ...sh.path[sh.path.length - 1] };
        if (sh.target !== 'N') {
          S.gear = sh.target;
          S.wIn = S.v / RW * FD * ratioOf(sh.target);
          S.locked = false;
        }
        S.shift = null;
        sh.resolve(true);
        ui.onGear && ui.onGear();
      }
    }
  }

  // ------------------------------------------------------------------ âm thanh nhỏ
  let actx = null;
  function noise(dur, freq, vol) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const n = Math.floor(actx.sampleRate * dur);
      const buf = actx.createBuffer(1, n, actx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) * (Math.sin(i / actx.sampleRate * freq * 6.283) > 0 ? 1 : 0.3);
      const src = actx.createBufferSource(), g = actx.createGain();
      g.gain.value = vol; src.buffer = buf; src.connect(g); g.connect(actx.destination); src.start();
    } catch (e) { /* trình duyệt không hỗ trợ âm thanh */ }
  }
  function grind(msg) {
    noise(0.55, 38, 0.35);
    S.lever.shake = 0.35;
    ui.alert && ui.alert('danger', '<i class="bi bi-exclamation-octagon-fill"></i> ' + msg);
  }
  function onStall() {
    noise(0.4, 9, 0.25);
    ui.alert && ui.alert('warning', '<i class="bi bi-power"></i> <b>Chết máy!</b> Nhả côn quá nhanh: ly hợp đóng đột ngột, mô-men cản của xe ghìm động cơ xuống dưới vòng tua tối thiểu. Hãy đạp côn hoặc về N rồi bấm “Khởi động lại”.');
  }
  function restartEngine() {
    if (!S.stalled) return;
    if (engaged() && clutchC(S.pedal) > 0.02) { ui.alert('warning', 'Đạp côn hoặc về số N trước khi khởi động lại động cơ.'); return; }
    S.stalled = false; S.wE = W_IDLE;
    if (!engaged()) S.locked = false;
    ui.alert('success', '<i class="bi bi-check-circle"></i> Động cơ đã nổ máy lại.');
  }

  // ------------------------------------------------------------------ cập nhật mô hình 3D
  const flowParts = { engine: [], gear: [] };
  function setGlow(ids, on, t) {
    const k = on ? 0.35 + 0.25 * Math.sin(t * 6) : 0;
    for (const id of ids) {
      const p = partById(id);
      if (!p) continue;
      for (const m of p.mats) if (m.emissive) { m.emissive.setHex(0xff7a00); m.emissiveIntensity = k; }
    }
  }
  let focusPart = null, focusT = 0;

  function syncModel(dt, t) {
    S.thE += S.wE * VIS * dt;
    S.thIn += S.wIn * VIS * dt;
    engineRot.rotation.x = S.thE;
    inputRot.rotation.x = S.thIn;
    const thC = meshAngle(S.thIn, 16, 32, PSI_DOWN);
    counterRot.rotation.x = thC;
    const gearAngles = {};
    for (const [g, d] of Object.entries(GEARS)) {
      if (d.direct) continue;
      let th;
      if (g === 'R') {
        const thI = meshAngle(thC, d.zc, d.zi, PSI_CI);
        idlerGear.rotation.x = thI;
        th = meshAngle(thI, d.zi, d.zo, PSI_IO + Math.PI);
      } else th = meshAngle(thC, d.zc, d.zo, PSI_UP);
      outGears[g].rotation.x = th;
      gearAngles[g] = th;
    }
    // trục thứ cấp: khoá với bánh răng đã vào số, nếu không thì quay theo bánh xe
    if (engaged()) S.thOut = GEARS[S.gear].direct ? S.thIn : gearAngles[S.gear];
    else S.thOut += (S.v / RW * FD) * VIS * dt;
    outputRot.rotation.x = S.thOut;
    S.thWheel += (S.v / RW) * VIS * 3 * dt;
    wheel.rotation.z = -S.thWheel;

    // ly hợp: bàn ép, lò xo đĩa, bi tê, càng cắt, bàn đạp
    const p = S.pedal;
    pressure.position.x = -3.2 + 0.09 * clutchSep(p);
    diaphragm.scale.x = 1 - 0.35 * p;
    bearing.position.x = -2.62 - 0.22 * p;
    releaseFork.rotation.z = -0.12 * p;
    pedal.rotation.z = 0.45 * p;
    // thanh đẩy từ giữa cần bàn đạp tới xi-lanh con
    pedal.updateMatrixWorld();
    const a = new T.Vector3(0.08, -0.8, 0).applyMatrix4(pedal.matrixWorld);
    const b = new T.Vector3(-1.5, -1.6, 0.05);
    const dir = new T.Vector3().subVectors(b, a);
    pushrod.position.copy(a).addScaledVector(dir, 0.5);
    pushrod.scale.y = dir.length();
    pushrod.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir.normalize());

    // ống gài + càng gạt theo vị trí cần số
    for (const [id, s] of Object.entries(SLEEVES)) {
      const active = Math.abs(S.lever.u - s.u) < 0.02;
      const off = active ? -S.lever.w * SLEEVE_TRAVEL : 0;
      sleeveObjs[id].position.x = s.x + off;
      forkGroups[id].position.x = s.x + off;
    }
    let shake = 0;
    if (S.lever.shake > 0) { S.lever.shake -= dt; shake = Math.sin(t * 70) * 0.05 * S.lever.shake / 0.35; }
    // cần số là đòn bẩy quanh khớp cầu: tay nắm đi ngược chiều ngón chọn (tỉ lệ 2:1)
    const dx = S.lever.w * 0.26, dz = -S.lever.u * 0.42;
    lever.rotation.set(Math.asin(dz / LEVER_LEN), 0, Math.asin(-dx / LEVER_LEN) + shake);

    // đường truyền lực
    const clutchOn = clutchC(p) > 0.02 && !S.stalled;
    const path = [];
    if (clutchOn && engaged()) {
      path.push('input', 'drive');
      if (GEARS[S.gear].direct) path.push('sleeveB');
      else path.push('counter', 'g' + S.gear, 'sleeve' + GEARS[S.gear].sleeve);
      path.push('output', 'wheel');
    }
    const engineSide = S.stalled ? [] : ['engine', 'flywheel', 'pressure', 'cover'].concat(clutchOn ? ['disc'] : []);
    const all = ['engine', 'flywheel', 'pressure', 'cover', 'disc', 'input', 'drive', 'counter', 'g1', 'g2', 'g3', 'g5', 'gR', 'sleeveA', 'sleeveB', 'sleeveC', 'output', 'wheel'];
    const on = new Set(S.showFlow ? engineSide.concat(path) : []);
    setGlow(all.filter((x) => !on.has(x)), false, t);
    setGlow([...on], true, t);
    if (focusPart && focusT > 0) {
      focusT -= dt;
      for (const m of focusPart.mats) if (m.emissive) { m.emissive.setHex(0x2f8cff); m.emissiveIntensity = 0.6 * Math.abs(Math.sin(t * 7)); }
    }
    S.flowPath = path;
    S.clutchOn = clutchOn;
  }
  const clutchSep = (p) => Math.min(1, Math.max(0, (p - 0.3) / 0.42));

  // ------------------------------------------------------------------ vòng lặp
  let last = performance.now(), running = true;
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

  let camAnim = null;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;
    if (running) {
      const n = 8;
      for (let i = 0; i < n; i++) { stepShift(dt / n); physics(dt / n); }
      S.simT += dt;
      syncModel(dt, t);
    }
    if (camAnim) {
      camAnim.t = Math.min(1, camAnim.t + dt / 0.9);
      const e = camAnim.t * camAnim.t * (3 - 2 * camAnim.t);
      camera.position.lerpVectors(camAnim.p0, camAnim.p1, e);
      controls.target.lerpVectors(camAnim.t0, camAnim.t1, e);
      if (camAnim.t >= 1) camAnim = null;
    }
    controls.update();
    renderer.render(scene, camera);
    if (ui.tick) ui.tick(t);
  }
  requestAnimationFrame(frame);

  function flyTo(target, dist, dirV) {
    const t1 = target.clone();
    const d = (dirV || new T.Vector3().subVectors(camera.position, controls.target).normalize()).clone().normalize();
    camAnim = { t: 0, p0: camera.position.clone(), t0: controls.target.clone(), p1: t1.clone().addScaledVector(d, dist), t1 };
  }
  const VIEWS = {
    all: () => flyTo(new T.Vector3(-0.2, -1, 0), 13, new T.Vector3(0.35, 0.25, 1)),
    clutch: () => flyTo(new T.Vector3(-3.2, -0.3, 0), 7, new T.Vector3(0.9, 0.35, 1)),
    gears: () => flyTo(new T.Vector3(0.6, -1.2, 0), 8.5, new T.Vector3(0.1, 0.15, 1)),
    shifter: () => flyTo(new T.Vector3(0.5, 2.2, 0), 6.5, new T.Vector3(0.6, 0.9, 0.9)),
  };

  // ------------------------------------------------------------------ nhãn khi rê chuột
  const ray = new T.Raycaster();
  const ndc = new T.Vector2();
  const tip = $('gbTip');
  function pickAt(ev) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const shown = (o) => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; };
    const hits = ray.intersectObjects(pickables.filter(shown), false);
    // bỏ qua nửa vỏ đã cắt
    const hit = hits.find((h) => !(h.object.userData.part === 'housing' && shellMat.clippingPlanes.length && h.point.z > 0));
    return hit ? partById(hit.object.userData.part) : null;
  }
  renderer.domElement.addEventListener('pointermove', (ev) => {
    if (ev.buttons) { tip.hidden = true; return; }
    const p = pickAt(ev);
    if (!p) { tip.hidden = true; return; }
    const r = viewer.getBoundingClientRect();
    tip.innerHTML = '<b>' + p.name + '</b><br>' + p.desc;
    tip.hidden = false;
    const x = Math.min(ev.clientX - r.left + 14, r.width - tip.offsetWidth - 8);
    const y = Math.min(ev.clientY - r.top + 14, r.height - tip.offsetHeight - 8);
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  });
  renderer.domElement.addEventListener('pointerleave', () => { tip.hidden = true; });
  function focusOn(id) {
    const p = partById(id);
    if (!p) return;
    const box = new T.Box3();
    p.objs.forEach((o) => box.expandByObject(o));
    const c = box.getCenter(new T.Vector3());
    const size = box.getSize(new T.Vector3()).length();
    flyTo(c, Math.max(4, size * 1.6));
    focusPart = p; focusT = 2.5;
  }

  // ------------------------------------------------------------------ API cho giao diện
  window.Gearbox = {
    S, GEARS, ratioOf, clutchC, parts,
    pedalTo(p, sec) { S.pedalTarget = Math.max(0, Math.min(1, p)); S.pedalRate = Math.abs(S.pedalTarget - S.pedal) / Math.max(0.02, sec || 0.02) || 50; },
    shift: requestShift,
    setThrottle(v) { S.throttle = Math.max(0, Math.min(1, v)); },
    setBrake(on) { S.brake = !!on; },
    restart: restartEngine,
    reset() {
      if (S.shift) S.shift.resolve(false);
      Object.assign(S, { pedal: 0, pedalTarget: 0, throttle: 0, brake: false, gear: 'N', lever: { u: 0, w: 0 }, shift: null, wE: W_IDLE, wIn: W_IDLE, v: 0, stalled: false, locked: true, Tc: 0 });
      ui.onGear && ui.onGear();
    },
    setHousing, views: VIEWS, focusOn,
    setRunning(v) { running = v; },
    ui,
    rpm: (w) => Math.round(Math.abs(w) * RPM),
    counterW: () => S.wIn * 0.5,
    outW: () => (engaged() ? S.wIn / ratioOf(S.gear) : S.v / RW * FD),
  };
})();
