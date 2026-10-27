// Sân sát hạch hạng B theo sơ đồ sân chuẩn đang dùng phổ biến (khu ghép xe trên trái, chữ S trên giữa,
// chữ Z dưới phải, ngã tư giữa sân bên trái, xuất phát ở đường dưới, kết thúc ở đường trái).
// Kích thước hình theo QCVN 40:2024/BGTVT mục 2.1.15; luật chấm theo Phụ lục IV Thông tư 12/2025/TT-BCA.
// Đơn vị mét. Hệ toạ độ: x hướng Đông, z hướng Nam (mặt phẳng XZ của three.js). Xe chạy bên phải.
window.SH = window.SH || {};
(function (SH) {
  'use strict';

  const MAP_W = 244, MAP_H = 190;

  // Xe sát hạch (Toyota Vios): a = dài toàn bộ, b = rộng toàn bộ, B1 = bề rộng lốp sau bên phụ, Rqv = bán kính quay vòng.
  const CAR = { a: 4.425, b: 1.73, B1: 0.185, Rqv: 5.15 };

  const DIM = {
    lane: 3.75,
    road: 7.5,
    vetW: CAR.B1 + 0.2,                                 // Bvb = B1 + 0,2
    vetL: CAR.a,                                        // Lvb = a
    vgW: 2.2 * CAR.b,                                   // Bv = 2,2b
    vgS: 1.5 * CAR.a,                                   // Sv = 1,5a
    vgL: 2.0 * CAR.a,                                   // Lv = 2,0a
    qcW: 2.2 * CAR.b,                                   // Bqc = 2,2b
    qcRn: CAR.Rqv + 1.2,                                // Rn = Rqv + 1,2
    docL: CAR.a + 1.0,                                  // Ld = a + 1,0
    docR: CAR.b + 0.6,                                  // Rd = b + 0,6
    ngL: 1.5 * CAR.a,                                   // Lg = 3a/2
    ngR: 1.25 * CAR.b,                                  // Rg = 5b/4
    line: 0.1,
  };
  DIM.qcRtr = DIM.qcRn - DIM.qcW;
  DIM.qcRc = (DIM.qcRn + DIM.qcRtr) / 2;

  const LO = DIM.lane / 2;
  const HR = DIM.road / 2;
  // Vành đai + đường dọc giữa (V) + đường ngang giữa (M) + đường ngang phụ (R2)
  const RING = { x0: 10, x1: 232, z0: 14, z1: 176, r: 12 };
  const VX = 98, MZ = 74, R2Z = 101;
  const CX = VX, CZ = MZ;                               // ngã tư có đèn
  const BOX = { x0: CX - HR, x1: CX + HR, z0: CZ - HR, z1: CZ + HR };

  const N = { x: 0, z: -1 }, E = { x: 1, z: 0 }, S = { x: 0, z: 1 }, W = { x: -1, z: 0 };
  const H = { E: 0, S: Math.PI / 2, W: Math.PI, N: -Math.PI / 2 };

  // ---------------------------------------------------------------- lộ trình (rùa vẽ tim làn xe chạy)
  class Builder {
    constructor(x, z, h) { this.x = x; this.z = z; this.h = h; this.pieces = []; this.cur = null; this.marks = {}; }
    use(kind, w, extra) {
      if (!this.cur || this.cur.kind !== kind || this.cur.w !== w || extra) {
        this.cur = Object.assign({ kind, w, pts: [[this.x, this.z]] }, extra || {});
        this.pieces.push(this.cur);
      }
      return this;
    }
    push() { this.cur.pts.push([this.x, this.z]); }
    fwd(d) {
      const n = Math.max(1, Math.ceil(d / 2));
      for (let i = 0; i < n; i++) { this.x += Math.cos(this.h) * d / n; this.z += Math.sin(this.h) * d / n; this.push(); }
      return this;
    }
    fwdTo(axis, v) {
      const c = axis === 'x' ? Math.cos(this.h) : Math.sin(this.h);
      return this.fwd((v - this[axis]) / c);
    }
    // deg > 0: rẽ phải, deg < 0: rẽ trái
    turn(r, deg) {
      const ang = deg * Math.PI / 180, s = Math.sign(ang);
      const cx = this.x - Math.sin(this.h) * r * s, cz = this.z + Math.cos(this.h) * r * s;
      const a0 = Math.atan2(this.z - cz, this.x - cx);
      const n = Math.max(6, Math.ceil(Math.abs(ang) * r / 0.4));
      for (let i = 1; i <= n; i++) {
        const a = a0 + ang * i / n;
        this.x = cx + r * Math.cos(a); this.z = cz + r * Math.sin(a); this.push();
      }
      this.h += ang;
      return this;
    }
    corner(deg) { this.h += deg * Math.PI / 180; return this; }
    mark(name) { this.marks[name] = { x: this.x, z: this.z, h: this.h }; return this; }
  }

  const rIn = RING.r - LO, rOut = RING.r + LO;          // bán kính góc vành đai: làn trong / làn ngoài
  const b = new Builder(RING.x0 + RING.r, RING.z1 + LO, H.E);
  // (1) Đường dưới, hướng Đông: xuất phát → người đi bộ → dốc cầu
  b.use('road', DIM.lane).fwdTo('x', RING.x1 - RING.r);
  b.use('road', DIM.lane).turn(rOut, -90);                          // góc Đông Nam, lên phía Bắc
  b.use('road', DIM.lane).fwdTo('z', 156);
  b.use('turn', 5.5).turn(6, -90);                                  // rẽ trái vào làn chữ Z (làn B)
  b.use('conn', 4).fwd(8);
  // (2) Bài 4: vệt bánh xe + 2 hình vuông góc ngược chiều (rẽ phải rồi rẽ trái)
  b.mark('f4Start').use('fig', DIM.vgW, { join: 'miter', lesson: 4 }).fwd(6).mark('vetStart').fwd(DIM.vetL).mark('vetEnd').fwd(4);
  b.corner(90).fwd(DIM.vgL).corner(-90).fwd(DIM.vgS).mark('f4End');
  b.use('conn', 4).fwdTo('x', VX + LO + 6);
  b.use('turn', 5.5).turn(6, 90);                                   // ra đường dọc giữa, hướng Bắc
  // (3) Ngã tư lần 1: từ phía Nam đi thẳng
  b.use('road', DIM.lane).fwdTo('z', BOX.z1);
  b.use('cross', DIM.lane).fwdTo('z', BOX.z0);
  b.use('road', DIM.lane).fwdTo('z', RING.z0 + LO + 6);
  b.use('turn', 5.5).turn(6, 90);                                   // lên đường trên, hướng Đông
  b.use('road', DIM.lane).fwdTo('x', 112);
  b.use('turn', 5.5).turn(6, 90);                                   // rẽ phải vào chữ S (làn B)
  b.use('conn', 4).fwdTo('z', 30);
  // (4) Bài 6: hai nửa vòng tròn ngược chiều
  b.mark('f6Start').use('fig', DIM.qcW, { lesson: 6 }).turn(DIM.qcRc, -180).turn(DIM.qcRc, 180).mark('f6End');
  b.use('conn', 4).fwdTo('z', MZ - LO - 6);
  b.use('turn', 5.5).turn(6, 90);                                   // ra đường giữa, hướng Tây
  // (5) Ngã tư lần 2: từ phía Đông đi thẳng
  b.use('road', DIM.lane).fwdTo('x', BOX.x1);
  b.use('cross', DIM.lane).fwdTo('x', BOX.x0);
  b.use('road', DIM.lane).fwdTo('x', RING.x0 + LO + 6);
  b.use('turn', 5.5).turn(6, 90);                                   // lên đường trái, hướng Bắc
  b.use('road', DIM.lane).fwdTo('z', RING.z0 + RING.r);
  b.use('road', DIM.lane).turn(rIn, 90);                            // góc Tây Bắc, hướng Đông
  // (6) Bài 7: ghép xe dọc (chuồng B bên phải đường trên)
  b.use('road', DIM.lane).fwdTo('x', VX - LO - 6);
  b.use('turn', 5.5).turn(6, 90);                                   // rẽ phải xuống đường dọc giữa
  // (7) Ngã tư lần 3: từ phía Bắc rẽ trái
  b.use('road', DIM.lane).fwdTo('z', BOX.z0);
  b.use('cross', DIM.lane).turn(BOX.x1 - (VX - LO), -90);
  b.use('road', DIM.lane).fwdTo('x', RING.x1 + LO - 8);
  b.use('turn', 5.5).turn(8, -90);                                  // rẽ trái lên đường phải, hướng Bắc
  // (8) Bài 9: đường sắt → (9) Bài 10: thay đổi số trên đường trên (hướng Tây)
  b.use('road', DIM.lane).fwdTo('z', RING.z0 + RING.r);
  b.use('road', DIM.lane).turn(rOut, -90);                          // góc Đông Bắc, hướng Tây
  b.use('road', DIM.lane).fwdTo('x', RING.x0 + RING.r);
  b.use('road', DIM.lane).turn(rOut, -90);                          // góc Tây Bắc, hướng Nam
  b.use('road', DIM.lane).fwdTo('z', MZ + LO - 8);
  b.use('turn', 5.5).turn(8, -90);                                  // rẽ trái vào đường giữa, hướng Đông
  // (10) Bài 8: ghép xe ngang → (11) Ngã tư lần 4: từ phía Tây rẽ phải
  b.use('road', DIM.lane).fwdTo('x', VX - LO - 6);
  b.use('cross', DIM.lane).turn(6, 90);
  b.use('road', DIM.lane).fwdTo('z', R2Z - LO - 6);
  b.use('turn', 5.5).turn(6, 90);                                   // rẽ phải vào đường ngang phụ, hướng Tây
  b.use('road', DIM.lane).fwdTo('x', RING.x0 - LO + 6);
  b.use('turn', 5.5).turn(6, -90);                                  // rẽ trái xuống đường trái, hướng Nam
  // (12) Bài 11: kết thúc trên đường trái, rồi về lại điểm xuất phát
  b.use('road', DIM.lane).fwdTo('z', RING.z1 - RING.r);
  b.use('road', DIM.lane).turn(rOut, -90);

  const route = b.pieces;
  const M = b.marks;

  const path = [];
  {
    let s = 0, prev = null;
    for (const p of route) for (const [x, z] of p.pts) {
      if (prev) {
        const d = Math.hypot(x - prev[0], z - prev[1]);
        if (d < 1e-6) continue;
        const n = Math.max(1, Math.ceil(d / 0.5));
        for (let i = 1; i <= n; i++) {
          s += d / n;
          path.push({ x: prev[0] + (x - prev[0]) * i / n, z: prev[1] + (z - prev[1]) * i / n, s });
        }
      } else path.push({ x, z, s: 0 });
      prev = [x, z];
    }
  }

  // ---------------------------------------------------------------- mạng đường hai chiều
  function ringPts() {
    const { x0, x1, z0, z1, r } = RING, pts = [];
    const arcP = (cx, cz, a0) => { for (let i = 0; i <= 12; i++) { const a = a0 + Math.PI / 2 * i / 12; pts.push([cx + r * Math.cos(a), cz + r * Math.sin(a)]); } };
    arcP(x0 + r, z0 + r, Math.PI);
    arcP(x1 - r, z0 + r, -Math.PI / 2);
    arcP(x1 - r, z1 - r, 0);
    arcP(x0 + r, z1 - r, Math.PI / 2);
    pts.push(pts[0]);
    return pts;
  }
  const roads = [
    ringPts(),
    [[VX, RING.z0], [VX, RING.z1]],
    [[RING.x0, MZ], [RING.x1, MZ]],
    [[RING.x0, R2Z], [VX, R2Z]],
  ];
  const junctions = [[VX, RING.z0], [VX, RING.z1], [RING.x0, MZ], [RING.x1, MZ], [RING.x0, R2Z], [VX, R2Z], [CX, CZ]];

  // ---------------------------------------------------------------- vị trí bài thi
  function line(x, z, d) { return { p: { x, z }, d }; }
  const zE = RING.z1 + LO;        // làn hướng Đông của đường dưới
  const xN = RING.x1 + LO;        // làn hướng Bắc của đường phải
  const zTW = RING.z0 - LO;       // làn hướng Tây của đường trên
  const zTE = RING.z0 + LO;       // làn hướng Đông của đường trên
  const zMW = MZ - LO, zME = MZ + LO;
  const xVN = VX + LO, xVS = VX - LO;
  const xLS = RING.x0 - LO;       // làn hướng Nam của đường trái

  // Bài 3 – dốc cầu trên đường dưới (xe đi hướng Đông): dốc lên 15 m, 10 %
  const hill = { axis: 'x', ps: [140, 155, 165, 180], hs: [0, 1.5, 1.5, 0], c0: RING.z1 - HR - 0.3, c1: RING.z1 + HR + 0.3 };

  // Chuồng ghép xe: bên phải làn theo hướng chạy
  const roadS = RING.z0 + HR;     // mép Nam đường trên
  const roadMS = MZ + HR;         // mép Nam đường giữa
  const bays = {
    doc: { x0: 36, x1: 36 + DIM.docR, z0: roadS, z1: roadS + DIM.docL, open: 'N' },
    ngang: { x0: 40, x1: 40 + DIM.ngL, z0: roadMS, z1: roadMS + DIM.ngR, open: 'N' },
  };

  // Vệt bánh xe: bên phải theo chiều chạy (xe đi hướng Tây → phía Bắc của làn)
  const vet = { x0: M.vetEnd.x, x1: M.vetStart.x, zc: M.vetStart.z - 0.72, w: DIM.vetW, h: 0.05 };

  const stopOff = 5;
  const L = {
    start: line(52, zE, E),
    startOff: line(57, zE, E),
    l2Entry: line(104, zE, E),
    l2Stop: line(110, zE, E),
    l2Exit: line(118, zE, E),
    l3Entry: line(139, zE, E),
    l3Stop: line(149, zE, E),
    l3Exit: line(168, zE, E),
    l4Entry: line(M.f4Start.x, M.f4Start.z, W),
    l4Exit: line(M.f4End.x, M.f4End.z, W),
    x1Entry: line(xVN, BOX.z1 + 18, N),
    x1Stop: line(xVN, BOX.z1 + stopOff, N),
    x1Box: line(xVN, BOX.z1, N),
    x1End: line(xVN, BOX.z0 - 4, N),
    l6Entry: line(M.f6Start.x, M.f6Start.z, S),
    l6Exit: line(M.f6End.x, M.f6End.z, S),
    x2Entry: line(BOX.x1 + 18, zMW, W),
    x2Stop: line(BOX.x1 + stopOff, zMW, W),
    x2Box: line(BOX.x1, zMW, W),
    x2End: line(BOX.x0 - 4, zMW, W),
    l7Entry: line(RING.x0 + RING.r + 3, zTE, E),
    l7Exit: line(56, zTE, E),
    x3Entry: line(xVS, BOX.z0 - 18, S),
    x3Stop: line(xVS, BOX.z0 - stopOff, S),
    x3Box: line(xVS, BOX.z0, S),
    x3End: line(BOX.x1 + 4, zME, E),
    l9Entry: line(xN, 56, N),
    l9Stop: line(xN, 44.5, N),
    l9Exit: line(xN, 34, N),
    l10Entry: line(200, zTW, W),
    l10Mid: line(175, zTW, W),
    l10Exit: line(150, zTW, W),
    l8Entry: line(30, zME, E),
    l8Exit: line(60, zME, E),
    x4Entry: line(BOX.x0 - 20, zME, E),
    x4Stop: line(BOX.x0 - stopOff, zME, E),
    x4Box: line(BOX.x0, zME, E),
    x4End: line(xVS, BOX.z1 + 4, S),
    finish: line(xLS, 140, S),
  };

  // Đường sắt cắt ngang đường phải: 2 ray (khổ 1 m), vạch dừng cách ray gần nhất ≥ 5 m
  const rail = { axis: 'x', z0: 38, z1: 39, x0: RING.x1 - HR - 6, x1: RING.x1 + HR + 4 };

  // Tình huống nguy hiểm: 5 vị trí ngoài khu vực bài thi
  const danger = [
    { a: line(184, zE, E), b: line(214, zE, E) },
    { a: line(195, M.f4End.z, W), b: line(120, M.f4End.z, W) },
    { a: line(110, zME, E), b: line(215, zME, E) },
    { a: line(140, zTW, W), b: line(108, zTW, W) },
    { a: line(86, R2Z - LO, W), b: line(22, R2Z - LO, W) },
  ];

  // Đèn tín hiệu ở góc gần bên phải mỗi hướng vào ngã tư (key = hướng xe tới)
  const lights = {
    N: { x: BOX.x0 - 1.2, z: BOX.z0 - 1.2, facing: -Math.PI / 2 },
    S: { x: BOX.x1 + 1.2, z: BOX.z1 + 1.2, facing: Math.PI / 2 },
    W: { x: BOX.x0 - 1.2, z: BOX.z1 + 1.2, facing: Math.PI },
    E: { x: BOX.x1 + 1.2, z: BOX.z0 - 1.2, facing: 0 },
  };

  // Hình của các hạng khác (C, D, E) – chỉ để sân giống thật, xe hạng B không đi vào
  const decor = [];
  for (const [z, w] of [[124, 4.4], [110, 4.8], [96, 5.2]]) {
    decor.push({ kind: 'fig', w, join: 'miter', pts: [[RING.x1 - HR, z], [200, z], [200, z - 10], [120, z - 10], [BOX.x1 + 0.2, z - 10]] });
  }
  for (const [x, r, w] of [[150, 5.6, 4.8], [190, 6.4, 5.2]]) {
    const sb = new Builder(x, RING.z0 + HR, H.S);
    sb.use('fig', w).fwdTo('z', 30).turn(r, -180).turn(r, 180).fwdTo('z', MZ - HR);
    decor.push(sb.pieces[0]);
  }
  const decorBays = [
    { x0: 60, x1: 63.2, z0: roadS, z1: roadS + 7, open: 'N' },
    { x0: 70, x1: 79, z0: MZ - HR - 3, z1: MZ - HR, open: 'S' },
    { x0: 62, x1: 71, z0: roadMS, z1: roadMS + 2.8, open: 'N' },
  ];

  const COURSE = {
    MAP_W, MAP_H, CAR, DIM, RING, CX, CZ, BOX, VX, MZ, R2Z, route, roads, junctions, path, bays, decorBays, decor, vet, hill, rail, lights, danger,
    lines: L, marks: M, dirs: { N, E, S, W },
    start: { x: 48, z: zE, heading: H.E },
    stopOff,
    buildings: [{ x: 72, z: 140, w: 26, d: 14, face: 'S' }, { x: 60, z: 48, w: 26, d: 12, face: 'N' }],
    lot: { x0: 16, z0: 112, x1: 56, z1: 158 },
  };

  // ---------------------------------------------------------------- biển báo (đặt bên phải làn)
  const rightOf = (ln, back, off) => ({ x: ln.p.x - ln.d.x * back - ln.d.z * off, z: ln.p.z - ln.d.z * back + ln.d.x * off });
  const SIGNS = [];
  function sign(ln, back, off, type, t, s, y) {
    const p = rightOf(ln, back, off);
    SIGNS.push({ x: p.x, z: p.z, h: Math.atan2(ln.d.z, ln.d.x), type, t, s, y });
  }
  const RD = LO + 0.3 + 1.3;   // từ tim làn ra lề phải đường hai chiều
  const FD = DIM.vgW / 2 + 0.5 + 1.5;
  sign(L.start, 6, RD, 'lesson', 'BÀI 1', 'Xuất phát');
  sign(L.l2Stop, 8, RD, 'lesson', 'BÀI 2', 'Dừng xe nhường đường cho người đi bộ');
  sign(L.l2Stop, 2.5, RD, 'ped');
  sign(L.l2Stop, 1.2, RD + 0.2, 'stop', null, null, 1.2);
  sign(L.l3Entry, 3, RD, 'lesson', 'BÀI 3', 'Dừng và khởi hành xe ngang dốc');
  sign(L.l3Entry, 0.5, RD + 0.4, 'slope');
  sign(L.l3Stop, 0.8, RD + 0.4, 'stop');
  sign(L.l4Entry, 3, FD, 'lesson', 'BÀI 4', 'Qua vệt bánh xe và đường vòng vuông góc');
  sign(L.x1Entry, 2, RD, 'lesson', 'BÀI 5', 'Qua ngã tư có tín hiệu điều khiển giao thông');
  sign(L.x1Entry, -4, RD, 'light');
  sign(L.x1Entry, -8, RD, 'arrowS');
  sign(L.l6Entry, 6, FD, 'lesson', 'BÀI 6', 'Qua đường vòng quanh co');
  sign(L.x2Entry, 2, RD, 'lesson', 'BÀI 5', 'Qua ngã tư có tín hiệu điều khiển giao thông');
  sign(L.x2Entry, -8, RD, 'arrowS');
  sign(L.l7Entry, -1, RD + 0.2, 'lesson', 'BÀI 7', 'Ghép xe dọc vào nơi đỗ');
  sign(L.l7Entry, -6, RD + 0.2, 'parking');
  sign(L.x3Entry, 2, RD, 'lesson', 'BÀI 5', 'Qua ngã tư có tín hiệu điều khiển giao thông');
  sign(L.x3Entry, -8, RD, 'arrowL');
  sign(L.l9Entry, 2, RD, 'lesson', 'BÀI 9', 'Tạm dừng ở chỗ có đường sắt chạy qua');
  sign(L.l9Entry, -5, RD, 'rail');
  sign(L.l9Stop, 0.8, RD + 0.4, 'stop');
  sign(L.l9Stop, -3, RD + 0.6, 'railx');
  sign(L.l10Entry, 4, RD, 'lesson', 'BÀI 10', 'Thay đổi số trên đường bằng');
  sign(L.l10Entry, 0, RD, 'text', 'Bắt đầu tăng số, tăng tốc độ');
  sign(L.l10Mid, 0, RD, 'text', 'Bắt đầu giảm số, giảm tốc độ');
  sign(L.l10Exit, 0, RD, 'text', 'Kết thúc giảm số, giảm tốc độ');
  sign(L.l8Entry, 2, RD + 0.2, 'lesson', 'BÀI 8', 'Ghép xe ngang vào nơi đỗ');
  sign(L.l8Entry, -4, RD + 0.2, 'parking');
  sign(L.x4Entry, 0, RD, 'lesson', 'BÀI 5', 'Qua ngã tư có tín hiệu điều khiển giao thông');
  sign(L.x4Entry, -8, RD, 'arrowR');
  sign(L.finish, 8, RD, 'lesson', 'BÀI 11', 'Kết thúc');
  sign(L.startOff, -6, RD, 'speed');
  sign(L.x2Entry, 10, RD, 'speed');
  sign(L.l9Entry, 8, RD, 'speed');
  COURSE.signs = SIGNS;

  // ---------------------------------------------------------------- vẽ bản đồ
  function strokePts(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    const a = pts[0], z = pts[pts.length - 1];
    if (pts.length > 2 && Math.hypot(a[0] - z[0], a[1] - z[1]) < 1e-6) ctx.closePath();
    ctx.stroke();
  }

  // Góc bo bó vỉa tại nút giao: (cx, cz) tâm nút, (sx, sz) góc phần tư
  const FILLET_R = 8;
  const fillets = [];
  {
    const add = (cx, cz, qs) => { for (const [sx, sz] of qs) fillets.push({ cx, cz, sx, sz }); };
    const all = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
    add(CX, CZ, all);
    add(VX, RING.z0, [[-1, 1], [1, 1]]);
    add(VX, RING.z1, [[-1, -1], [1, -1]]);
    add(RING.x0, MZ, [[1, -1], [1, 1]]);
    add(RING.x1, MZ, [[-1, -1], [-1, 1]]);
    add(RING.x0, R2Z, [[1, -1], [1, 1]]);
    add(VX, R2Z, [[-1, -1], [-1, 1]]);
  }
  function filletArc(ctx, f) {
    const R = FILLET_R, kx = f.cx + f.sx * HR, kz = f.cz + f.sz * HR;
    const ox = kx + f.sx * R, oz = kz + f.sz * R;
    ctx.beginPath();
    ctx.arc(ox, oz, R - 0.3, Math.atan2(0, kx - ox), Math.atan2(kz - oz, 0), f.sx * f.sz < 0);
  }
  function filletPath(ctx, f) {
    const R = FILLET_R, kx = f.cx + f.sx * HR, kz = f.cz + f.sz * HR;
    const ox = kx + f.sx * R, oz = kz + f.sz * R;
    ctx.beginPath();
    ctx.moveTo(kx, kz);
    ctx.lineTo(kx, oz);
    ctx.arc(ox, oz, R, Math.atan2(0, kx - ox), Math.atan2(kz - oz, 0), f.sx * f.sz < 0);
    ctx.lineTo(kx, kz);
    ctx.closePath();
  }

  function bayRect(bay, pad, ext) {
    let { x0, x1, z0, z1 } = bay;
    x0 -= pad; x1 += pad; z0 -= pad; z1 += pad;
    if (bay.open === 'E') x1 += ext;
    if (bay.open === 'W') x0 -= ext;
    if (bay.open === 'S') z1 += ext;
    if (bay.open === 'N') z0 -= ext;
    return [x0, z0, x1 - x0, z1 - z0];
  }

  // Hình sát hạch: vạch giới hạn 0,1 m cách bó vỉa 0,1 m
  function drawFig(ctx, p, pal) {
    ctx.lineJoin = p.join || 'round';
    if (pal.curb) {
      ctx.strokeStyle = pal.curb; ctx.lineWidth = p.w + 0.4 + 0.6; strokePts(ctx, p.pts);
      if (pal.curb2) { ctx.save(); ctx.setLineDash([1, 1]); ctx.strokeStyle = pal.curb2; strokePts(ctx, p.pts); ctx.restore(); }
    }
    ctx.strokeStyle = pal.road; ctx.lineWidth = p.w + 0.4; strokePts(ctx, p.pts);
    if (pal.line) { ctx.strokeStyle = pal.line; ctx.lineWidth = p.w + 0.2; strokePts(ctx, p.pts); }
    ctx.strokeStyle = pal.road; ctx.lineWidth = p.w; strokePts(ctx, p.pts);
  }

  function drawBay(ctx, bay, pal) {
    if (pal.curb) {
      ctx.fillStyle = pal.curb; ctx.fillRect(...bayRect(bay, 0.5, -0.5));
      if (pal.curb2) { ctx.save(); ctx.setLineDash([1, 1]); ctx.strokeStyle = pal.curb2; ctx.lineWidth = 0.3; const r = bayRect(bay, 0.35, -0.35); ctx.strokeRect(...r); ctx.restore(); }
    }
    ctx.fillStyle = pal.road; ctx.fillRect(...bayRect(bay, 0.2, -0.2));
    if (pal.line) { ctx.fillStyle = pal.line; ctx.fillRect(...bayRect(bay, 0.1, -0.1)); }
    ctx.fillStyle = pal.road; ctx.fillRect(...bayRect(bay, 0, 0.6));
  }

  // pal: { curb, line, road } – null = không vẽ lớp đó. decorOn: vẽ cả hình của hạng khác
  function drawRoads(ctx, pal, decorOn) {
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'round';
    if (pal.curb) {
      for (const col of [pal.curb, pal.curb2]) {
        if (!col) continue;
        ctx.save();
        ctx.strokeStyle = col;
        if (col === pal.curb2) ctx.setLineDash([1, 1]);
        ctx.lineWidth = DIM.road + 0.6;
        for (const r of roads) strokePts(ctx, r);
        for (const p of route) if (p.kind === 'conn') { ctx.lineWidth = p.w + 0.6; strokePts(ctx, p.pts); }
        ctx.lineWidth = 0.6;
        for (const fl of fillets) { filletArc(ctx, fl); ctx.stroke(); }
        ctx.restore();
      }
    }
    if (decorOn) { for (const p of decor) drawFig(ctx, p, pal); for (const bb of decorBays) drawBay(ctx, bb, pal); }
    for (const p of route) if (p.kind === 'fig') drawFig(ctx, p, pal);
    for (const k in bays) drawBay(ctx, bays[k], pal);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = pal.road;
    ctx.lineWidth = DIM.road;
    for (const r of roads) strokePts(ctx, r);
    for (const p of route) {
      if (p.kind === 'conn' || p.kind === 'turn') { ctx.lineWidth = p.w; strokePts(ctx, p.pts); }
    }
    ctx.fillStyle = pal.road;
    for (const f of fillets) { filletPath(ctx, f); ctx.fill(); }
  }

  function textAt(ctx, x, z, ang, txt, size, color) {
    ctx.save();
    ctx.translate(x, z);
    ctx.rotate(ang);
    ctx.fillStyle = color || '#f4f4f0';
    ctx.font = `700 ${size}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(txt, 0, 0);
    ctx.restore();
  }
  const angFor = (d) => Math.atan2(d.z, d.x) + Math.PI / 2;

  // Vạch dừng ngang làn, nằm trước vạch (phía xe tới), mép trước trùng ln.p
  function stopBar(ctx, ln, w, thick, color) {
    const { p, d } = ln, nx = -d.z, nz = d.x;
    ctx.strokeStyle = color || '#f4f4f0';
    ctx.lineWidth = thick;
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(p.x - d.x * thick / 2 - nx * w / 2, p.z - d.z * thick / 2 - nz * w / 2);
    ctx.lineTo(p.x - d.x * thick / 2 + nx * w / 2, p.z - d.z * thick / 2 + nz * w / 2);
    ctx.stroke();
  }

  // Vạch người đi bộ ngang toàn bộ mặt đường; (cx, cz) tâm dải, d = hướng dọc đường
  function zebra(ctx, cx, cz, d, depth) {
    const nx = -d.z, nz = d.x;
    ctx.fillStyle = '#f4f4f0';
    for (let o = -HR + 0.25; o < HR - 0.2; o += 1.0) {
      ctx.save();
      ctx.translate(cx + nx * o, cz + nz * o);
      ctx.rotate(Math.atan2(d.z, d.x));
      ctx.fillRect(-depth / 2, -0.25, depth, 0.5);
      ctx.restore();
    }
  }

  function arrowMark(ctx, x, z, h, kind) {
    ctx.save();
    ctx.translate(x, z);
    ctx.rotate(h);
    if (kind === 'R') ctx.scale(1, -1);
    ctx.fillStyle = 'rgba(244,244,240,.9)';
    ctx.beginPath();
    if (kind === 'L' || kind === 'R') {
      ctx.moveTo(-2, 0.18); ctx.lineTo(0.4, 0.18); ctx.lineTo(0.4, -0.9); ctx.lineTo(0.85, -0.9);
      ctx.lineTo(0.12, -1.7); ctx.lineTo(-0.6, -0.9); ctx.lineTo(-0.18, -0.9); ctx.lineTo(-0.18, -0.18); ctx.lineTo(-2, -0.18);
    } else {
      ctx.moveTo(1.6, 0); ctx.lineTo(0.2, -0.6); ctx.lineTo(0.2, -0.2); ctx.lineTo(-1.6, -0.2);
      ctx.lineTo(-1.6, 0.2); ctx.lineTo(0.2, 0.2); ctx.lineTo(0.2, 0.6);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawMarkings(ctx) {
    const white = '#f4f4f0', yellow = '#f2c230';
    // vạch tim đường (vàng, đứt), bỏ qua nút giao
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, MAP_W, MAP_H);
    for (const [gx, gz] of junctions) ctx.rect(gx - 9.5, gz - 9.5, 19, 19);
    ctx.clip('evenodd');
    ctx.strokeStyle = yellow; ctx.lineWidth = 0.14; ctx.setLineDash([3, 3]);
    for (const r of roads) strokePts(ctx, r);
    ctx.restore();
    // vạch liền gần ngã tư
    ctx.strokeStyle = yellow; ctx.lineWidth = 0.14;
    for (const [x0, z0, x1, z1] of [[CX, BOX.z0 - 22, CX, BOX.z0 - 9.5], [CX, BOX.z1 + 9.5, CX, BOX.z1 + 22], [BOX.x0 - 22, CZ, BOX.x0 - 9.5, CZ], [BOX.x1 + 9.5, CZ, BOX.x1 + 22, CZ]]) {
      ctx.beginPath(); ctx.moveTo(x0, z0); ctx.lineTo(x1, z1); ctx.stroke();
    }

    stopBar(ctx, L.start, DIM.lane, 0.3);
    textAt(ctx, L.start.p.x - 2.2, L.start.p.z, angFor(E), 'XUẤT PHÁT', 0.8, white);
    stopBar(ctx, L.finish, DIM.lane, 0.3);
    textAt(ctx, L.finish.p.x, L.finish.p.z - 2.2, angFor(S), 'KẾT THÚC', 0.8, white);

    // Bài 2
    stopBar(ctx, L.l2Stop, DIM.lane, 0.4);
    zebra(ctx, L.l2Stop.p.x + 3.5, RING.z1, E, 4);
    textAt(ctx, L.l2Stop.p.x - 2.6, L.l2Stop.p.z, angFor(E), 'DỪNG', 1.0, white);
    // Bài 3 (vẽ trên dốc qua UV)
    stopBar(ctx, L.l3Stop, DIM.lane, 0.4);
    textAt(ctx, L.l3Stop.p.x - 2.6, L.l3Stop.p.z, angFor(E), 'DỪNG', 1.0, white);

    // Ngã tư: vạch dừng 4 hướng + vạch người đi bộ + mũi tên hướng đi
    for (const k of ['x1', 'x2', 'x3', 'x4']) stopBar(ctx, L[k + 'Stop'], DIM.lane, 0.4);
    zebra(ctx, CX, BOX.z0 - 2.5, S, 3);
    zebra(ctx, CX, BOX.z1 + 2.5, S, 3);
    zebra(ctx, BOX.x0 - 2.5, CZ, E, 3);
    zebra(ctx, BOX.x1 + 2.5, CZ, E, 3);
    arrowMark(ctx, xVN, BOX.z1 + 12, -Math.PI / 2, 'S');
    arrowMark(ctx, BOX.x1 + 12, zMW, Math.PI, 'S');
    arrowMark(ctx, xVS, BOX.z0 - 12, Math.PI / 2, 'L');
    arrowMark(ctx, BOX.x0 - 12, zME, 0, 'R');

    // Bài 4: hai vạch giới hạn vệt bánh xe
    ctx.fillStyle = white;
    ctx.fillRect(vet.x0, vet.zc - vet.w / 2 - DIM.line, vet.x1 - vet.x0, DIM.line);
    ctx.fillRect(vet.x0, vet.zc + vet.w / 2, vet.x1 - vet.x0, DIM.line);

    // Bài 7, 8
    textAt(ctx, (bays.doc.x0 + bays.doc.x1) / 2, (bays.doc.z0 + bays.doc.z1) / 2, 0, 'P', 1.5, 'rgba(244,244,240,.6)');
    textAt(ctx, (bays.ngang.x0 + bays.ngang.x1) / 2, (bays.ngang.z0 + bays.ngang.z1) / 2, 0, 'P', 1.5, 'rgba(244,244,240,.6)');
    textAt(ctx, bays.doc.x0 - 2.2, roadS + 1.4, 0, 'B', 1.3, yellow);
    textAt(ctx, bays.ngang.x0 - 2.2, roadMS + 1.2, 0, 'B', 1.3, yellow);

    // Bài 9: vạch dừng + nền đường sắt
    stopBar(ctx, L.l9Stop, DIM.lane, 0.4);
    textAt(ctx, L.l9Stop.p.x, L.l9Stop.p.z + 2.6, angFor(N), 'DỪNG', 1.0, white);
    ctx.fillStyle = '#56483a';
    ctx.fillRect(RING.x1 - HR, rail.z0 - 0.9, DIM.road, rail.z1 - rail.z0 + 1.8);
    ctx.fillStyle = '#9aa0a6';
    ctx.fillRect(RING.x1 - HR, rail.z0, DIM.road, 0.08);
    ctx.fillRect(RING.x1 - HR, rail.z1, DIM.road, 0.08);

    // Bài 10: mốc 25 m
    for (const ln of [L.l10Entry, L.l10Mid, L.l10Exit]) stopBar(ctx, ln, DIM.lane, 0.15, yellow);

    // mũi tên chỉ hướng
    for (const [x, z, h] of [[80, zE, 0], [192, zE, 0], [xN, 120, -Math.PI / 2], [xVN, 120, -Math.PI / 2], [120, zMW, Math.PI], [40, zMW, Math.PI],
      [70, zTE, 0], [160, zME, 0], [xN, 60, -Math.PI / 2], [120, zTW, Math.PI], [xLS, 45, Math.PI / 2], [24, zME, 0], [60, R2Z - LO, Math.PI], [xLS, 120, Math.PI / 2]]) {
      arrowMark(ctx, x, z, h, 'S');
    }
  }

  function noiseCanvas(size, amp) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const img = g.createImageData(size, size);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 128 + (Math.random() - 0.5) * amp;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  function buildVisual(maxPx) {
    const ppm = maxPx / MAP_W;
    const c = document.createElement('canvas');
    c.width = Math.round(MAP_W * ppm);
    c.height = Math.round(MAP_H * ppm);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#5d8a3c';
    ctx.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < 2500; i++) {
      ctx.fillStyle = Math.random() < 0.5 ? 'rgba(70,110,45,.35)' : 'rgba(120,160,80,.25)';
      ctx.beginPath();
      ctx.arc(Math.random() * c.width, Math.random() * c.height, (1 + Math.random() * 4) * ppm, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.setTransform(ppm, 0, 0, ppm, 0, 0);
    // bãi xe chờ thi
    const lot = COURSE.lot;
    ctx.fillStyle = '#c9c6bd'; ctx.fillRect(lot.x0 - 0.3, lot.z0 - 0.3, lot.x1 - lot.x0 + 0.6, lot.z1 - lot.z0 + 0.6);
    ctx.fillStyle = '#4a4d52'; ctx.fillRect(lot.x0, lot.z0, lot.x1 - lot.x0, lot.z1 - lot.z0);
    ctx.strokeStyle = '#f4f4f0'; ctx.lineWidth = 0.12;
    for (let x = lot.x0 + 3; x < lot.x1 - 2; x += 2.8) { ctx.beginPath(); ctx.moveTo(x, lot.z0); ctx.lineTo(x, lot.z0 + 5.5); ctx.stroke(); }
    drawRoads(ctx, { curb: '#e9e6df', curb2: '#c8102e', line: '#f4f4f0', road: '#4a4d52' }, true);
    drawMarkings(ctx);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 0.09;
    ctx.fillStyle = ctx.createPattern(noiseCanvas(256, 255), 'repeat');
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.globalAlpha = 1;
    return c;
  }

  // Bản đồ ngữ nghĩa: 0 = ngoài đường / bó vỉa, 1 = mặt đường, 2 = vạch giới hạn hình.
  const SEM_PPM = 10;
  let sem = null, semVis = null;

  function buildSemantic() {
    const c = document.createElement('canvas');
    c.width = MAP_W * SEM_PPM;
    c.height = MAP_H * SEM_PPM;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.setTransform(SEM_PPM, 0, 0, SEM_PPM, 0, 0);
    drawRoads(ctx, { curb: null, line: '#ff0000', road: '#00ff00' }, false);
    const toClass = () => {
      const data = ctx.getImageData(0, 0, c.width, c.height).data;
      const out = new Uint8Array(c.width * c.height);
      for (let i = 0, j = 0; j < out.length; i += 4, j++) out[j] = data[i] > 110 ? 2 : (data[i + 1] > 110 ? 1 : 0);
      return out;
    };
    sem = toClass();
    // bản thứ hai có cả hình trang trí (chỉ dùng để dựng bó vỉa 3D)
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.setTransform(SEM_PPM, 0, 0, SEM_PPM, 0, 0);
    drawRoads(ctx, { curb: null, line: '#ff0000', road: '#00ff00' }, true);
    semVis = toClass();
  }

  function classAtVis(x, z) {
    const px = Math.floor(x * SEM_PPM), pz = Math.floor(z * SEM_PPM);
    if (px < 0 || pz < 0 || px >= MAP_W * SEM_PPM || pz >= MAP_H * SEM_PPM) return 0;
    return semVis[pz * MAP_W * SEM_PPM + px];
  }

  function classAt(x, z) {
    const px = Math.floor(x * SEM_PPM), pz = Math.floor(z * SEM_PPM);
    if (px < 0 || pz < 0 || px >= MAP_W * SEM_PPM || pz >= MAP_H * SEM_PPM) return 0;
    return sem[pz * MAP_W * SEM_PPM + px];
  }

  // Độ cao dốc theo vị trí dọc trục dốc
  function hillAlong(u) {
    const { ps, hs } = hill;
    if (u <= ps[0] || u >= ps[ps.length - 1]) return 0;
    for (let i = 0; i < ps.length - 1; i++) {
      if (u <= ps[i + 1]) return hs[i] + (hs[i + 1] - hs[i]) * (u - ps[i]) / (ps[i + 1] - ps[i]);
    }
    return 0;
  }

  function heightAt(x, z) {
    const u = hill.axis === 'x' ? x : z, c = hill.axis === 'x' ? z : x;
    if (c < hill.c0 || c > hill.c1) return 0;
    return hillAlong(u);
  }

  function onVet(x, z) {
    return x >= vet.x0 && x <= vet.x1 && Math.abs(z - vet.zc) <= vet.w / 2;
  }

  function along(pt, ln) { return (pt.x - ln.p.x) * ln.d.x + (pt.z - ln.p.z) * ln.d.z; }
  function lateral(pt, ln) { return Math.abs((pt.x - ln.p.x) * -ln.d.z + (pt.z - ln.p.z) * ln.d.x); }
  // Đã vượt qua vạch (chỉ tính khi ở gần vạch theo phương ngang)
  function passed(pt, ln, near) { return along(pt, ln) > 0 && lateral(pt, ln) < (near || 8); }
  function insideRect(pt, r) { return pt.x >= r.x0 && pt.x <= r.x1 && pt.z >= r.z0 && pt.z <= r.z1; }

  function nearestPath(x, z, hint, back, ahead) {
    let lo = 0, hi = path.length - 1;
    if (hint != null) { lo = Math.max(0, hint - (back || 40)); hi = Math.min(path.length - 1, hint + (ahead || 80)); }
    let best = Infinity, bi = lo;
    for (let i = lo; i <= hi; i++) {
      const d = (path[i].x - x) ** 2 + (path[i].z - z) ** 2;
      if (d < best) { best = d; bi = i; }
    }
    return { i: bi, d: Math.sqrt(best) };
  }

  // Tư thế xe (tâm xe) lùi `back` mét theo tim làn tính từ điểm gần vạch `ln` nhất (cùng hướng).
  function poseBefore(ln, back) {
    let bi = 1, best = Infinity;
    for (let i = 1; i < path.length; i++) {
      const dx = path[i].x - path[i - 1].x, dz = path[i].z - path[i - 1].z;
      const len = Math.hypot(dx, dz) || 1;
      if ((dx * ln.d.x + dz * ln.d.z) / len < 0.7) continue;
      const d = (path[i].x - ln.p.x) ** 2 + (path[i].z - ln.p.z) ** 2;
      if (d < best) { best = d; bi = i; }
    }
    const j = Math.max(1, bi - Math.round(back * 2));
    const p0 = path[j - 1], p1 = path[j];
    return { x: p1.x, z: p1.z, h: Math.atan2(p1.z - p0.z, p1.x - p0.x) };
  }

  Object.assign(COURSE, {
    fillets, FILLET_R, buildVisual, buildSemantic, classAt, classAtVis, heightAt, hillAlong, onVet,
    along, lateral, passed, insideRect, nearestPath, poseBefore,
  });
  SH.COURSE = COURSE;
})(window.SH);
