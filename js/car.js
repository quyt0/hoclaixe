// Xe sát hạch số tự động: vật lý (mô hình xe đạp, gốc tại tâm cầu sau) + mô hình 3D (vỏ ngoài + nội thất).
window.SH = window.SH || {};
(function (SH) {
  'use strict';
  const C = SH.COURSE;

  // Xe hạng B cỡ nhỏ: dài 4,30 m, rộng 1,68 m (QCVN 40:2024: xe hạng B dài ≥ 4,2 m, rộng ≥ 1,6 m).
  const SPEC = {
    WB: 2.48,        // chiều dài cơ sở
    FO: 0.873,       // nhô trước
    RO: 0.947,       // nhô sau
    W: 1.68,         // chiều rộng thân
    TRACK: 1.44,     // vết bánh
    TIRE: 0.19,      // bề rộng lốp
    WR: 0.30,        // bán kính bánh
    MAX_STEER: 0.6,  // góc đánh lái tối đa (rad)
  };
  const CENTER_OFF = SPEC.WB / 2 + (SPEC.FO - SPEC.RO) / 2;
  const G = 9.81;
  // Lớp hiển thị: vỏ xe (nhìn từ ngoài, trong gương) và nội thất (chỉ góc nhìn trong xe)
  const LAYER_EXT = 1, LAYER_INT = 2;
  // Vỏ xe dựng theo kích thước gốc 4,425 × 1,73 rồi thu theo tỉ lệ
  const EXT_SX = (SPEC.WB + SPEC.FO + SPEC.RO) / 4.425, EXT_SZ = SPEC.W / 1.73;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  class Car {
    constructor() {
      this.autoCenter = false;
      this.reset(C.start.x, C.start.z, C.start.heading);
    }

    // (cx, cz) là tâm thân xe.
    reset(cx, cz, h, keepState) {
      this.h = h;
      this.x = cx - Math.cos(h) * CENTER_OFF;
      this.z = cz - Math.sin(h) * CENTER_OFF;
      this.v = 0;
      this.steer = 0;
      this.throttle = 0;
      this.brake = 0;
      this.wheelRot = 0;
      if (!keepState) {
        this.gear = 'P';
        this.handbrake = true;
        this.belt = false;
        this.sigL = false;
        this.sigR = false;
        this.hazard = false;
      }
      this.odo = 0;
      this.update();
    }

    get kmh() { return Math.abs(this.v) * 3.6; }

    setGear(g) {
      if (g === this.gear) return true;
      // Không cho vào P/R/D ngược chiều khi xe đang chạy.
      if (Math.abs(this.v) > 0.4 && g !== 'N') return false;
      this.gear = g;
      return true;
    }

    toggleSignal(side) {
      if (side === 'L') { this.sigL = !this.sigL; if (this.sigL) this.sigR = false; }
      else if (side === 'R') { this.sigR = !this.sigR; if (this.sigR) this.sigL = false; }
      else { this.sigL = this.sigR = false; }
    }

    step(dt, inp) {
      // Bàn đạp ga/phanh tăng dần để dễ giữ tốc độ thấp.
      this.throttle = clamp(this.throttle + (inp.up ? 0.9 : -2.5) * dt, 0, 1);
      this.brake = clamp(this.brake + (inp.down ? 3.2 : -5) * dt, 0, 1);
      if (inp.throttleAxis != null) this.throttle = inp.throttleAxis;

      // Vô-lăng giữ nguyên góc khi nhả phím; F trả lái về giữa; Shift đánh lái chậm để chỉnh nhỏ.
      const rate = inp.fine ? 0.3 : 0.9;
      if (inp.left && !inp.right) this.steer -= rate * dt;
      else if (inp.right && !inp.left) this.steer += rate * dt;
      else if (inp.center) {
        const r = 1.6 * dt;
        this.steer = Math.abs(this.steer) <= r ? 0 : this.steer - Math.sign(this.steer) * r;
      } else if (this.autoCenter) {
        const r = Math.min(1.2, Math.abs(this.v) * 0.18) * dt;
        this.steer = Math.abs(this.steer) <= r ? 0 : this.steer - Math.sign(this.steer) * r;
      }
      this.steer = clamp(this.steer, -1, 1);

      if (this.gear === 'P') {
        this.v = 0;
        this.update();
        return;
      }

      let a = -G * Math.sin(this.pitch);
      const v = this.v;
      if (this.gear === 'D') {
        const creep = 1.5 * clamp(1 - v / 1.9, 0, 1);
        a += creep + 2.8 * this.throttle * Math.max(0, 1 - v / 17);
      } else if (this.gear === 'R') {
        const creep = 1.5 * clamp(1 + v / 1.9, 0, 1);
        a -= creep + 2.0 * this.throttle * Math.max(0, 1 + v / 4.5);
      }
      const resist = 0.12 + 0.0004 * v * v + this.brake * 7.5 + (this.handbrake ? 5 : 0);
      let nv = v + a * dt;
      if (Math.abs(nv) <= resist * dt) nv = 0;
      else nv -= Math.sign(nv) * resist * dt;
      this.v = nv;

      const delta = this.steer * SPEC.MAX_STEER;
      this.h += nv / SPEC.WB * Math.tan(delta) * dt;
      if (this.h > Math.PI) this.h -= 2 * Math.PI;
      if (this.h < -Math.PI) this.h += 2 * Math.PI;
      this.x += Math.cos(this.h) * nv * dt;
      this.z += Math.sin(this.h) * nv * dt;
      this.wheelRot += nv / SPEC.WR * dt;
      this.odo += Math.abs(nv) * dt;
      this.update();
    }

    // Tính các điểm dẫn xuất: cản trước/sau, bánh xe, góc thân, độ cao.
    update() {
      const ch = Math.cos(this.h), sh = Math.sin(this.h);
      const d = { x: ch, z: sh };
      const r = { x: -sh, z: ch };   // bên phải xe
      this.dir = d;
      this.right = r;
      const P = (f, s) => ({ x: this.x + d.x * f + r.x * s, z: this.z + d.z * f + r.z * s });
      const t2 = SPEC.TRACK / 2, w2 = SPEC.W / 2;
      this.center = P(CENTER_OFF, 0);
      this.front = P(SPEC.WB + SPEC.FO, 0);
      this.rear = P(-SPEC.RO, 0);
      this.wheels = [
        Object.assign(P(SPEC.WB, -t2), { id: 'FL' }),
        Object.assign(P(SPEC.WB, t2), { id: 'FR' }),
        Object.assign(P(0, -t2), { id: 'RL' }),
        Object.assign(P(0, t2), { id: 'RR' }),
      ];
      // Điểm tiếp xúc hai mép lốp để kiểm tra đè vạch.
      const e = SPEC.TIRE / 2;
      this.tireEdges = [];
      for (const [f, s] of [[SPEC.WB, -t2], [SPEC.WB, t2], [0, -t2], [0, t2]]) {
        this.tireEdges.push(P(f, s - e), P(f, s + e));
      }
      this.corners = [P(SPEC.WB + SPEC.FO, -w2), P(SPEC.WB + SPEC.FO, w2), P(-SPEC.RO, -w2), P(-SPEC.RO, w2)];

      const hw = this.wheels.map(w => C.heightAt(w.x, w.z) + (C.onVet(w.x, w.z) ? C.vet.h : 0));
      this.yRear = (hw[2] + hw[3]) / 2;
      this.pitch = Math.atan2((hw[0] + hw[1]) / 2 - this.yRear, SPEC.WB);
      this.roll = Math.atan2((hw[0] + hw[2]) / 2 - (hw[1] + hw[3]) / 2, SPEC.TRACK);
    }
  }

  // ------------------------------------------------------------------ 3D
  function setLayer(obj, n) { obj.traverse(o => o.layers.set(n)); }

  function buildMesh(THREE) {
    const root = new THREE.Group();
    const tilt = new THREE.Group();
    root.add(tilt);
    const ext = new THREE.Group();
    ext.scale.set(EXT_SX, EXT_SX, EXT_SZ);
    tilt.add(ext);
    const int = new THREE.Group();
    tilt.add(int);

    const white = new THREE.MeshStandardMaterial({ color: 0xf3f4f6, metalness: 0.35, roughness: 0.38 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x15181d, roughness: 0.8 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x1a2632, metalness: 0.5, roughness: 0.15 });
    const trim = new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.6 });

    function shadowed(m) { m.castShadow = true; return m; }

    // ---- vỏ xe: biên dạng hông có hốc bánh
    const s = new THREE.Shape();
    s.moveTo(-0.975, 0.36);
    s.lineTo(-0.40, 0.36);
    s.absarc(0, 0.31, 0.39, Math.PI, 0, true);
    s.lineTo(2.16, 0.36);
    s.absarc(2.55, 0.31, 0.39, Math.PI, 0, true);
    s.lineTo(3.42, 0.38);
    s.lineTo(3.46, 0.62);
    s.lineTo(3.38, 0.78);
    s.lineTo(2.85, 0.89);
    s.lineTo(2.05, 0.98);
    s.lineTo(-0.35, 0.99);
    s.lineTo(-0.72, 0.95);
    s.lineTo(-0.98, 0.84);
    s.lineTo(-1.0, 0.5);
    s.closePath();
    const bodyGeo = new THREE.ExtrudeGeometry(s, { depth: 1.65, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2, curveSegments: 10 });
    bodyGeo.translate(0, 0, -0.825);
    ext.add(shadowed(new THREE.Mesh(bodyGeo, white)));

    const gh = new THREE.Shape();
    gh.moveTo(-0.38, 0.97);
    gh.lineTo(0.12, 1.40);
    gh.lineTo(1.38, 1.42);
    gh.lineTo(2.07, 0.97);
    gh.closePath();
    const ghGeo = new THREE.ExtrudeGeometry(gh, { depth: 1.52, bevelEnabled: false });
    ghGeo.translate(0, 0, -0.76);
    ext.add(shadowed(new THREE.Mesh(ghGeo, glass)));

    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.05, 1.5), white);
    roof.position.set(0.75, 1.425, 0);
    ext.add(shadowed(roof));

    // Biển "SÁT HẠCH" trên nóc
    const sc = document.createElement('canvas');
    sc.width = 256; sc.height = 64;
    const sg = sc.getContext('2d');
    sg.fillStyle = '#1d4ed8'; sg.fillRect(0, 0, 256, 64);
    sg.fillStyle = '#fff'; sg.font = '700 38px Arial, sans-serif'; sg.textAlign = 'center'; sg.textBaseline = 'middle';
    sg.fillText('SÁT HẠCH', 128, 34);
    const signMat = new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(sc), roughness: 0.5 });
    const roofSign = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.86), [white, white, white, white, signMat, signMat]);
    roofSign.rotation.y = Math.PI / 2;
    roofSign.position.set(0.75, 1.56, 0);
    ext.add(shadowed(roofSign));

    for (const sgn of [-1, 1]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.18), white);
      m.position.set(1.98, 1.02, sgn * 0.95);
      ext.add(m);
    }

    // Đèn
    const mk = (color, e) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: e, roughness: 0.4 });
    const headMat = mk(0xfff6dd, 0.5);
    const tailMat = mk(0xd01818, 0.25);
    const revMat = mk(0xffffff, 0.0);
    const indMat = mk(0xffa21a, 0.0);
    const lamp = (mat, w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); ext.add(m); return m; };
    for (const sg2 of [-1, 1]) {
      lamp(headMat, 0.06, 0.1, 0.34, 3.43, 0.68, sg2 * 0.58);
      lamp(tailMat, 0.06, 0.12, 0.34, -1.0, 0.76, sg2 * 0.62);
      lamp(revMat, 0.06, 0.07, 0.12, -1.0, 0.62, sg2 * 0.45);
    }
    const indL = [lamp(indMat.clone(), 0.06, 0.06, 0.12, 3.43, 0.6, -0.78), lamp(indMat.clone(), 0.06, 0.06, 0.12, -1.0, 0.88, -0.74), lamp(indMat.clone(), 0.1, 0.04, 0.06, 1.98, 1.0, -1.04)];
    const indR = [lamp(indMat.clone(), 0.06, 0.06, 0.12, 3.43, 0.6, 0.78), lamp(indMat.clone(), 0.06, 0.06, 0.12, -1.0, 0.88, 0.74), lamp(indMat.clone(), 0.1, 0.04, 0.06, 1.98, 1.0, 1.04)];

    // Bánh xe (vị trí theo thông số thật, không theo tỉ lệ vỏ)
    const tireGeo = new THREE.CylinderGeometry(SPEC.WR, SPEC.WR, SPEC.TIRE, 22);
    tireGeo.rotateX(Math.PI / 2);
    const rimGeo = new THREE.CylinderGeometry(0.19, 0.19, SPEC.TIRE + 0.01, 14);
    rimGeo.rotateX(Math.PI / 2);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xb8bdc4, metalness: 0.7, roughness: 0.3 });
    const spokeGeo = new THREE.BoxGeometry(0.34, 0.05, SPEC.TIRE + 0.02);
    const wheels = [];
    const steerGroups = [];
    const wheelRoot = new THREE.Group();
    tilt.add(wheelRoot);
    for (const [x, zs, front] of [[SPEC.WB, -1, true], [SPEC.WB, 1, true], [0, -1, false], [0, 1, false]]) {
      const holder = new THREE.Group();
      holder.position.set(x, SPEC.WR, zs * (SPEC.TRACK / 2 + 0.04));
      wheelRoot.add(holder);
      const spin = new THREE.Group();
      spin.add(shadowed(new THREE.Mesh(tireGeo, dark)));
      spin.add(new THREE.Mesh(rimGeo, rimMat));
      const sp1 = new THREE.Mesh(spokeGeo, trim);
      const sp2 = sp1.clone(); sp2.rotation.z = Math.PI / 2;
      spin.add(sp1, sp2);
      holder.add(spin);
      wheels.push(spin);
      if (front) steerGroups.push(holder);
    }

    // ---- nội thất (chỉ hiện ở góc nhìn trong xe)
    const plastic = new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.85 });
    const plasticDark = new THREE.MeshStandardMaterial({ color: 0x1b1d21, roughness: 0.9 });
    const headliner = new THREE.MeshStandardMaterial({ color: 0x3b3e44, roughness: 0.95 });
    const xs = EXT_SX, zsc = EXT_SZ;
    const winBaseX = 2.05 * xs, roofFrontX = 1.38 * xs, beltY = 0.98 * xs, roofY = 1.40 * xs;
    const box = (mat, w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); int.add(m); return m; };
    // nắp capo (phần nhìn thấy qua kính lái)
    {
      const hx0 = winBaseX + 0.02, hx1 = 3.30 * xs, hy0 = beltY + 0.005, hy1 = 0.80 * xs, hz0 = 0.80 * zsc, hz1 = 0.74 * zsc;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute([hx0, hy0, -hz0, hx0, hy0, hz0, hx1, hy1, -hz1, hx1, hy1, hz1], 3));
      g.setIndex([0, 2, 1, 1, 2, 3]);
      g.computeVertexNormals();
      int.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xe9ebee, metalness: 0.3, roughness: 0.4, side: THREE.DoubleSide })));
    }
    // taplo + hộc đồng hồ
    box(plastic, 0.56, 0.24, 1.62 * zsc, winBaseX - 0.26, beltY - 0.1, 0);
    box(plasticDark, 0.62, 0.02, 1.6 * zsc, winBaseX - 0.28, beltY + 0.02, 0);
    box(plasticDark, 0.16, 0.05, 0.40, winBaseX - 0.5, beltY + 0.035, -0.36);
    // màn hình đồng hồ
    const clusterCanvas = document.createElement('canvas');
    clusterCanvas.width = 384; clusterCanvas.height = 128;
    const clusterTex = new THREE.CanvasTexture(clusterCanvas);
    const cluster = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.12), new THREE.MeshBasicMaterial({ map: clusterTex }));
    cluster.rotation.y = -Math.PI / 2;
    cluster.position.set(winBaseX - 0.56, beltY - 0.01, -0.36);
    int.add(cluster);
    // cột A
    for (const sgn of [-1, 1]) {
      const ax0 = winBaseX, ay0 = beltY, ax1 = roofFrontX, ay1 = roofY;
      const len = Math.hypot(ax0 - ax1, ay1 - ay0);
      const p = box(plasticDark, len, 0.08, 0.1, (ax0 + ax1) / 2, (ay0 + ay1) / 2, sgn * 0.71 * zsc);
      p.rotation.z = Math.atan2(ay1 - ay0, ax1 - ax0);
    }
    // trần xe, ốp cửa
    box(headliner, 1.7, 0.03, 1.52 * zsc, roofFrontX - 0.85, roofY + 0.005, 0);
    for (const sgn of [-1, 1]) {
      box(plastic, 2.3, 0.45, 0.05, 0.85, beltY - 0.22, sgn * 0.8 * zsc);
      box(plasticDark, 2.3, 0.03, 0.12, 0.85, beltY + 0.0, sgn * 0.77 * zsc);
      // khung kính cửa phía sau ghế lái (cột B)
      box(plasticDark, 0.12, roofY - beltY, 0.06, 0.25, (roofY + beltY) / 2, sgn * 0.75 * zsc);
    }
    // vô-lăng
    const swBase = new THREE.Group();
    swBase.position.set(1.25, 0.94, -0.36);
    swBase.rotation.z = 0.42;
    int.add(swBase);
    const swSpin = new THREE.Group();
    swBase.add(swSpin);
    const swMat = new THREE.MeshStandardMaterial({ color: 0x202226, roughness: 0.7 });
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.185, 0.026, 10, 36), swMat);
    rim.rotation.y = Math.PI / 2;
    swSpin.add(rim);
    for (const a of [0, Math.PI / 2 + 0.5, -Math.PI / 2 - 0.5]) {
      const sp = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.17, 0.035), swMat);
      sp.position.set(0, Math.cos(a) * -0.085, Math.sin(a) * 0.085);
      sp.rotation.x = a;
      swSpin.add(sp);
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 16), swMat);
    hub.rotation.z = Math.PI / 2;
    swSpin.add(hub);
    const logo = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.052, 12), new THREE.MeshStandardMaterial({ color: 0xb8bdc4, metalness: 0.8 }));
    logo.rotation.z = Math.PI / 2;
    swSpin.add(logo);
    // gương chiếu hậu thật (kính gương gán ảnh từ camera gương trong main.js)
    const mirrorGlass = {};
    const housingMat = new THREE.MeshStandardMaterial({ color: 0xe9ebee, metalness: 0.3, roughness: 0.4 });
    for (const [id, sgn] of [['L', -1], ['R', 1]]) {
      const g = new THREE.Group();
      g.position.set(1.95 * xs, 1.0 * xs, sgn * 1.0 * zsc);
      const hsg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 0.25), housingMat);
      hsg.position.x = 0.03;
      g.add(hsg);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.1), housingMat);
      arm.position.set(0.03, -0.05, -sgn * 0.14);
      g.add(arm);
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.12), new THREE.MeshBasicMaterial({ color: 0x8899aa }));
      gl.rotation.y = -Math.PI / 2;
      gl.position.x = -0.025;
      g.add(gl);
      int.add(g);
      mirrorGlass[id] = gl;
    }
    {
      const g = new THREE.Group();
      g.position.set(roofFrontX + 0.2, roofY - 0.08, 0);
      const hsg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.065, 0.24), plasticDark);
      g.add(hsg);
      const stem = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.08, 0.03), plasticDark);
      stem.position.set(0.02, 0.06, 0);
      g.add(stem);
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.055), new THREE.MeshBasicMaterial({ color: 0x8899aa }));
      gl.rotation.y = -Math.PI / 2;
      gl.position.x = -0.022;
      g.add(gl);
      int.add(g);
      mirrorGlass.C = gl;
    }

    setLayer(ext, LAYER_EXT);
    setLayer(wheelRoot, LAYER_EXT);
    setLayer(int, LAYER_INT);

    const eye = new THREE.Object3D();
    eye.position.set(0.78, 1.2, -0.36);
    tilt.add(eye);

    let clusterKey = '';
    function drawCluster(car) {
      const kmh = car.kmh < 0.5 ? 0 : Math.round(car.kmh);
      const key = kmh + car.gear + (car.sigL ? 'L' : '') + (car.sigR ? 'R' : '') + (car.hazard ? 'H' : '') + (car.handbrake ? 'P' : '') + (car.belt ? 'B' : '');
      if (key === clusterKey) return;
      clusterKey = key;
      const g = clusterCanvas.getContext('2d');
      g.fillStyle = '#05070c'; g.fillRect(0, 0, 384, 128);
      g.strokeStyle = '#1f3a5f'; g.lineWidth = 4; g.strokeRect(2, 2, 380, 124);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#e8f1ff'; g.font = '700 58px Arial'; g.fillText(String(kmh), 192, 62);
      g.fillStyle = '#7d8ea8'; g.font = '600 16px Arial'; g.fillText('km/h', 192, 104);
      g.font = '800 30px Arial';
      ['P', 'R', 'N', 'D'].forEach((gr, i) => { g.fillStyle = car.gear === gr ? '#22e36b' : '#3a4352'; g.fillText(gr, 300 + i * 20 - 30 + i * 4, 62); });
      g.fillStyle = car.sigL || car.hazard ? '#22e36b' : '#1d2633'; g.fillText('◀', 40, 40);
      g.fillStyle = car.sigR || car.hazard ? '#22e36b' : '#1d2633'; g.fillText('▶', 92, 40);
      g.font = '700 18px Arial';
      g.fillStyle = car.handbrake ? '#ff3b3b' : '#1d2633'; g.fillText('(P)', 50, 92);
      g.fillStyle = car.belt ? '#1d2633' : '#ff3b3b'; g.fillText('DÂY', 98, 92);
      clusterTex.needsUpdate = true;
    }

    return {
      root, tilt, eye, mirrorGlass, LAYER_EXT, LAYER_INT,
      sync(car, t) {
        root.position.set(car.x, car.yRear, car.z);
        root.rotation.y = -car.h;
        tilt.rotation.set(car.roll, 0, car.pitch);
        const delta = car.steer * SPEC.MAX_STEER;
        for (const g of steerGroups) g.rotation.y = -delta;
        for (const w of wheels) w.rotation.z = -car.wheelRot;
        swSpin.rotation.x = car.steer * Math.PI * 1.5;
        tailMat.emissiveIntensity = car.brake > 0.05 || car.handbrake ? 1.4 : 0.25;
        revMat.emissiveIntensity = car.gear === 'R' ? 1.2 : 0;
        const blink = Math.floor(t * 2.6) % 2 === 0;
        const onL = blink && (car.sigL || car.hazard);
        const onR = blink && (car.sigR || car.hazard);
        for (const m of indL) m.material.emissiveIntensity = onL ? 1.6 : 0;
        for (const m of indR) m.material.emissiveIntensity = onR ? 1.6 : 0;
        drawCluster(car);
      },
    };
  }

  SH.Car = Car;
  SH.CAR_SPEC = SPEC;
  SH.buildCarMesh = buildMesh;
})(window.SH);
