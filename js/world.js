// Dựng cảnh 3D: mặt đất, dốc, vệt bánh xe, đèn tín hiệu, đường sắt, biển báo, cây, nhà điều hành.
window.SH = window.SH || {};
(function (SH) {
  'use strict';
  const C = SH.COURSE;

  function canvasTex(THREE, w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    return t;
  }

  // ---- hình biển báo (canvas 256×256, nền trong suốt)
  function triangle(g, fill) {
    g.beginPath(); g.moveTo(128, 14); g.lineTo(244, 228); g.lineTo(12, 228); g.closePath();
    g.fillStyle = '#d0141a'; g.fill();
    g.beginPath(); g.moveTo(128, 50); g.lineTo(212, 210); g.lineTo(44, 210); g.closePath();
    g.fillStyle = fill || '#f6c400'; g.fill();
  }
  function blueSquare(g) { g.fillStyle = '#0b4fa8'; g.fillRect(14, 14, 228, 228); g.strokeStyle = '#fff'; g.lineWidth = 8; g.strokeRect(22, 22, 212, 212); }
  function blueCircle(g) { g.fillStyle = '#0b4fa8'; g.beginPath(); g.arc(128, 128, 116, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 6; g.stroke(); }
  function person(g, x, y, s, color) {
    g.fillStyle = color; g.strokeStyle = color; g.lineWidth = 9 * s; g.lineCap = 'round';
    g.beginPath(); g.arc(x, y - 52 * s, 13 * s, 0, 7); g.fill();
    g.beginPath(); g.moveTo(x, y - 36 * s); g.lineTo(x - 4 * s, y + 4 * s);
    g.moveTo(x - 4 * s, y + 4 * s); g.lineTo(x - 22 * s, y + 42 * s);
    g.moveTo(x - 4 * s, y + 4 * s); g.lineTo(x + 18 * s, y + 42 * s);
    g.moveTo(x - 2 * s, y - 26 * s); g.lineTo(x - 26 * s, y - 2 * s);
    g.moveTo(x - 2 * s, y - 26 * s); g.lineTo(x + 24 * s, y - 8 * s);
    g.stroke();
  }
  const SIGN_DRAW = {
    stop(g) {
      g.fillStyle = '#d0141a'; g.beginPath();
      for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; g.lineTo(128 + 116 * Math.cos(a), 128 + 116 * Math.sin(a)); }
      g.closePath(); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 7; g.stroke();
      g.fillStyle = '#fff'; g.font = '800 70px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('STOP', 128, 132);
    },
    ped(g) {
      blueSquare(g);
      g.fillStyle = '#fff'; g.beginPath(); g.moveTo(128, 40); g.lineTo(218, 208); g.lineTo(38, 208); g.closePath(); g.fill();
      g.fillStyle = '#111'; for (let i = 0; i < 4; i++) g.fillRect(70 + i * 30, 190, 18, 10);
      person(g, 128, 150, 0.95, '#111');
    },
    slope(g) {
      triangle(g);
      g.fillStyle = '#111'; g.beginPath(); g.moveTo(66, 200); g.lineTo(190, 200); g.lineTo(190, 120); g.closePath(); g.fill();
      g.font = '800 34px Arial'; g.textAlign = 'center'; g.fillText('10%', 118, 150);
    },
    rail(g) {
      triangle(g);
      g.fillStyle = '#111';
      g.fillRect(70, 150, 112, 40); g.fillRect(150, 118, 34, 34); g.fillRect(84, 130, 14, 22);
      for (const x of [86, 120, 160]) { g.beginPath(); g.arc(x, 196, 11, 0, 7); g.fill(); }
    },
    railx(g) {
      g.translate(128, 128);
      for (const a of [Math.PI / 4, -Math.PI / 4]) {
        g.save(); g.rotate(a); g.fillStyle = '#fff'; g.fillRect(-120, -20, 240, 40); g.strokeStyle = '#d0141a'; g.lineWidth = 8; g.strokeRect(-116, -16, 232, 32); g.restore();
      }
    },
    parking(g) { blueSquare(g); g.fillStyle = '#fff'; g.font = '800 170px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('P', 128, 138); },
    light(g) {
      triangle(g);
      g.fillStyle = '#111'; g.fillRect(104, 82, 48, 116);
      [['#ff2a1a', 104], ['#ffbf1a', 140], ['#1aff6a', 176]].forEach(([c, y]) => { g.fillStyle = c; g.beginPath(); g.arc(128, y, 14, 0, 7); g.fill(); });
    },
    arrowL(g) {
      blueCircle(g);
      g.fillStyle = '#fff'; g.beginPath();
      g.moveTo(160, 210); g.lineTo(160, 120); g.lineTo(110, 120); g.lineTo(110, 90); g.lineTo(52, 135); g.lineTo(110, 180); g.lineTo(110, 150); g.lineTo(130, 150); g.lineTo(130, 210);
      g.closePath(); g.fill();
    },
    arrowR(g) {
      blueCircle(g);
      g.fillStyle = '#fff'; g.beginPath();
      g.moveTo(96, 210); g.lineTo(96, 120); g.lineTo(146, 120); g.lineTo(146, 90); g.lineTo(204, 135); g.lineTo(146, 180); g.lineTo(146, 150); g.lineTo(126, 150); g.lineTo(126, 210);
      g.closePath(); g.fill();
    },
    arrowS(g) {
      blueCircle(g);
      g.fillStyle = '#fff'; g.beginPath();
      g.moveTo(112, 212); g.lineTo(112, 110); g.lineTo(78, 110); g.lineTo(128, 44); g.lineTo(178, 110); g.lineTo(144, 110); g.lineTo(144, 212);
      g.closePath(); g.fill();
    },
    speed(g) {
      g.fillStyle = '#fff'; g.beginPath(); g.arc(128, 128, 116, 0, 7); g.fill();
      g.lineWidth = 26; g.strokeStyle = '#d0141a'; g.beginPath(); g.arc(128, 128, 102, 0, 7); g.stroke();
      g.fillStyle = '#111'; g.font = '800 104px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('24', 128, 134);
    },
  };

  function buildWorld(THREE, renderer, opts) {
    const scene = new THREE.Scene();
    const sky = 0xa9cfe9;
    scene.background = new THREE.Color(sky);
    scene.fog = new THREE.Fog(sky, 150, 480);

    scene.add(new THREE.HemisphereLight(0xe6f2ff, 0x4f6b3a, 0.8));
    const sun = new THREE.DirectionalLight(0xffffff, 0.9);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 220 });
    sun.shadow.bias = -0.0006;
    sun.shadow.camera.layers.enable(1);   // vỏ xe (lớp 1) vẫn đổ bóng
    scene.add(sun, sun.target);

    // ---- mặt đất
    const maxTex = Math.min(renderer.capabilities.maxTextureSize, opts.lowRes ? 2048 : 4096);
    const visCanvas = C.buildVisual(maxTex);
    const groundTex = new THREE.CanvasTexture(visCanvas);
    groundTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(C.MAP_W, C.MAP_H), new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.95 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(C.MAP_W / 2, 0, C.MAP_H / 2);
    ground.receiveShadow = true;
    scene.add(ground);

    const outer = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), new THREE.MeshStandardMaterial({ color: 0x5d8a3c, roughness: 1 }));
    outer.rotation.x = -Math.PI / 2;
    outer.position.set(C.MAP_W / 2, -0.6, C.MAP_H / 2);   // thấp hẳn để không tranh độ sâu với mặt sân
    outer.receiveShadow = true;
    scene.add(outer);

    // ---- bó vỉa cao 0,15 m sơn đỏ trắng: dọc mép đường, đường nối, hình sát hạch và góc bo nút giao
    {
      const blocks = [];
      const addLine = (pts, off) => {
        for (const sgn of [-1, 1]) {
          let k = 0;
          for (let i = 0; i < pts.length - 1; i++) {
            const [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
            const len = Math.hypot(x1 - x0, z1 - z0);
            if (len < 0.05) continue;
            const dx = (x1 - x0) / len, dz = (z1 - z0) / len;
            const n = Math.max(1, Math.round(len));
            for (let s = 0; s < n; s++, k++) {
              const t = (s + 0.5) / n;
              blocks.push({ x: x0 + (x1 - x0) * t - dz * off * sgn, z: z0 + (z1 - z0) * t + dx * off * sgn, len: len / n + 0.04, ang: Math.atan2(dz, dx), red: k % 2 === 1 });
            }
          }
        }
      };
      const HR = C.DIM.road / 2;
      for (const r of C.roads) addLine(r, HR + 0.15);
      for (const p of C.route) if (p.kind === 'conn') addLine(p.pts, p.w / 2 + 0.15);
      for (const p of C.route.concat(C.decor)) if (p.kind === 'fig') addLine(p.pts, p.w / 2 + 0.35);
      for (const f of C.fillets) {
        const R = C.FILLET_R - 0.15, kx = f.cx + f.sx * HR, kz = f.cz + f.sz * HR;
        const ox = kx + f.sx * C.FILLET_R, oz = kz + f.sz * C.FILLET_R;
        const a0 = Math.atan2(0, kx - ox), a1 = Math.atan2(kz - oz, 0);
        let da = a1 - a0;
        if (da > Math.PI) da -= 2 * Math.PI;
        if (da < -Math.PI) da += 2 * Math.PI;
        const n = Math.round(Math.abs(da) * R);
        for (let s = 0; s < n; s++) {
          const a = a0 + da * (s + 0.5) / n;
          blocks.push({ x: ox + R * Math.cos(a), z: oz + R * Math.sin(a), len: Math.abs(da) * R / n + 0.05, ang: a + Math.PI / 2, red: s % 2 === 1 });
        }
      }
      const keep = blocks.filter(b => C.classAtVis(b.x, b.z) === 0 && C.heightAt(b.x, b.z) === 0);
      const geo = new THREE.BoxGeometry(1, 0.15, 0.3);
      geo.translate(0, 0.075, 0);
      const inst = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }), keep.length);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
      const red = new THREE.Color(0xc8102e), wht = new THREE.Color(0xeeeeea);
      keep.forEach((b, i) => {
        q.setFromAxisAngle(up, -b.ang);
        sc.set(b.len, 1, 1);
        p.set(b.x, 0, b.z);
        m.compose(p, q, sc);
        inst.setMatrixAt(i, m);
        inst.setColorAt(i, b.red ? red : wht);
      });
      inst.receiveShadow = true;
      scene.add(inst);
    }

    // ---- dốc (bài 3): mặt dốc dùng chung texture mặt đất (UV theo toạ độ thế giới)
    const hl = C.hill;
    {
      const ax = hl.axis === 'x';
      const P = (u, c, y) => ax ? [u, y, c] : [c, y, u];
      const pos = [], uv = [], idx = [];
      for (const u of hl.ps) {
        const h = C.hillAlong(u) + 0.012;
        for (const c of [hl.c0, hl.c1]) {
          const v = P(u, c, h);
          pos.push(...v);
          uv.push(v[0] / C.MAP_W, 1 - v[2] / C.MAP_H);
        }
      }
      for (let i = 0; i < hl.ps.length - 1; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      const top = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.95, side: THREE.DoubleSide }));
      top.receiveShadow = true;
      scene.add(top);

      const wpos = [], widx = [];
      for (const c of [hl.c0, hl.c1]) {
        const base = wpos.length / 3;
        for (const u of hl.ps) wpos.push(...P(u, c, 0), ...P(u, c, C.hillAlong(u)));
        for (let i = 0; i < hl.ps.length - 1; i++) { const a = base + i * 2; widx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
      }
      const wg = new THREE.BufferGeometry();
      wg.setAttribute('position', new THREE.Float32BufferAttribute(wpos, 3));
      wg.setIndex(widx);
      wg.computeVertexNormals();
      scene.add(new THREE.Mesh(wg, new THREE.MeshStandardMaterial({ color: 0xb9b4a8, roughness: 0.9, side: THREE.DoubleSide })));
      // lan can đỏ trắng hai bên dốc
      const stripe = canvasTex(THREE, 128, 8, (gg) => { for (let i = 0; i < 8; i++) { gg.fillStyle = i % 2 ? '#fff' : '#d0141a'; gg.fillRect(i * 16, 0, 16, 8); } });
      const railMat = new THREE.MeshStandardMaterial({ map: stripe, roughness: 0.5 });
      for (const c of [hl.c0 - 0.05, hl.c1 + 0.05]) {
        for (let i = 0; i < hl.ps.length - 1; i++) {
          const u0 = hl.ps[i], u1 = hl.ps[i + 1], h0 = C.hillAlong(u0), h1 = C.hillAlong(u1);
          const len = Math.hypot(u1 - u0, h1 - h0);
          const r = new THREE.Mesh(new THREE.BoxGeometry(len, 0.08, 0.08), railMat);
          const mid = P((u0 + u1) / 2, c, (h0 + h1) / 2 + 0.7);
          r.position.set(mid[0], mid[1], mid[2]);
          if (!ax) r.rotation.y = -Math.PI / 2;
          r.rotation.z = Math.atan2(h1 - h0, u1 - u0);
          scene.add(r);
          const nPost = Math.max(1, Math.floor(len / 2));
          for (let k = 0; k <= nPost; k++) {
            const t = k / nPost;
            const pp = P(u0 + (u1 - u0) * t, c, 0);
            const post = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.75, 0.07), railMat);
            post.position.set(pp[0], h0 + (h1 - h0) * t + 0.37, pp[2]);
            scene.add(post);
          }
        }
      }
    }

    // ---- vệt bánh xe (bài 4): dải nổi thấp
    const vt = C.vet;
    {
      const tex = canvasTex(THREE, 256, 16, (g, w, h) => { g.fillStyle = '#c8c3b6'; g.fillRect(0, 0, w, h); g.fillStyle = '#b0aa9b'; for (let i = 0; i < 16; i++) g.fillRect(i * 16, 0, 2, h); });
      const m = new THREE.Mesh(new THREE.BoxGeometry(vt.x1 - vt.x0, vt.h, vt.w), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }));
      m.position.set((vt.x0 + vt.x1) / 2, vt.h / 2, vt.zc);
      m.receiveShadow = true;
      scene.add(m);
    }

    // ---- cột, biển báo
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x9aa1a8, metalness: 0.5, roughness: 0.4 });
    function pole(x, z, h, r) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r || 0.05, r || 0.05, h, 10), poleMat);
      m.position.set(x, h / 2, z);
      m.castShadow = true;
      scene.add(m);
    }
    // heading: hướng xe chạy tới biển; mặt biển quay về phía xe.
    function plate(x, z, heading, w, h, y, tex, shaped) {
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      g.rotation.y = -(heading + Math.PI);
      let mesh;
      if (shaped) {
        mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6 }));
        mesh.rotation.y = Math.PI / 2;
        mesh.position.x = 0.06;
      } else {
        const back = new THREE.MeshStandardMaterial({ color: 0x7c848c, roughness: 0.6 });
        mesh = new THREE.Mesh(new THREE.BoxGeometry(0.05, h, w), [new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }), back, back, back, back, back]);
      }
      mesh.position.y = y;
      mesh.castShadow = true;
      g.add(mesh);
      scene.add(g);
      pole(x, z, y - (shaped ? 0.1 : h / 2) + 0.05);
    }

    const sharedTex = {};
    for (const s of C.signs) {
      if (s.type === 'lesson' || s.type === 'text') {
        const isLesson = s.type === 'lesson';
        const tex = canvasTex(THREE, 384, isLesson ? 216 : 160, (g, w, h) => {
          g.fillStyle = isLesson ? '#0b4fa8' : '#fff'; g.fillRect(0, 0, w, h);
          g.strokeStyle = isLesson ? '#fff' : '#111'; g.lineWidth = 8; g.strokeRect(8, 8, w - 16, h - 16);
          g.fillStyle = isLesson ? '#fff' : '#111'; g.textAlign = 'center'; g.textBaseline = 'middle';
          const text = isLesson ? s.s : s.t;
          if (isLesson) { g.font = '800 72px Arial, sans-serif'; g.fillText(s.t, w / 2, 70); }
          g.font = `700 ${isLesson ? 27 : 34}px Arial, sans-serif`;
          const words = text.split(' '), lines = [''];
          for (const wd of words) {
            const tryL = (lines[lines.length - 1] + ' ' + wd).trim();
            if (g.measureText(tryL).width > w - 40 && lines[lines.length - 1]) lines.push(wd); else lines[lines.length - 1] = tryL;
          }
          const y0 = isLesson ? 132 : h / 2 - (lines.length - 1) * 20;
          lines.forEach((l, i) => g.fillText(l, w / 2, y0 + i * (isLesson ? 32 : 40)));
        });
        if (isLesson) plate(s.x, s.z, s.h, 1.7, 0.96, 2.4, tex);
        else plate(s.x, s.z, s.h, 1.2, 0.5, 1.7, tex);
      } else {
        if (!sharedTex[s.type]) sharedTex[s.type] = canvasTex(THREE, 256, 256, (g) => SIGN_DRAW[s.type](g));
        const size = s.type === 'railx' ? 1.1 : 0.75;
        plate(s.x, s.z, s.h, size, size, s.y || 2.2, sharedTex[s.type], true);
      }
    }

    // người đi bộ chờ qua đường (bài 2)
    {
      const g = new THREE.Group();
      const skin = new THREE.MeshStandardMaterial({ color: 0xe0b48f });
      const shirt = new THREE.MeshStandardMaterial({ color: 0xd9452b });
      const pants = new THREE.MeshStandardMaterial({ color: 0x2b3a55 });
      const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.85, 10), pants); legs.position.y = 0.43;
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.65, 10), shirt); body.position.y = 1.18;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), skin); head.position.y = 1.65;
      for (const m of [legs, body, head]) { m.castShadow = true; g.add(m); }
      g.position.set(C.lines.l2Stop.p.x + 3.5, 0, C.RING.z1 + C.DIM.road / 2 + 1.6);
      scene.add(g);
    }

    // ---- đèn tín hiệu (4 hướng)
    const lights = {};
    const cols = { red: 0xff2a1a, yellow: 0xffbf1a, green: 0x1aff6a };
    for (const key of Object.keys(C.lights)) {
      const cfg = C.lights[key];
      const g = new THREE.Group();
      g.position.set(cfg.x, 0, cfg.z);
      g.rotation.y = -cfg.facing;
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 4.4, 12), poleMat);
      p.position.y = 2.2; p.castShadow = true; g.add(p);
      const house = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1.05, 0.38), new THREE.MeshStandardMaterial({ color: 0x1a1d22, roughness: 0.6 }));
      house.position.set(0, 3.75, 0); house.castShadow = true; g.add(house);
      const mats = {};
      [['red', 0.32], ['yellow', 0], ['green', -0.32]].forEach(([k, dy]) => {
        const m = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: cols[k], emissiveIntensity: 0.05 });
        const l = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), m);
        l.position.set(0.17, 3.75 + dy, 0);
        l.scale.set(0.5, 1, 1);
        g.add(l);
        mats[k] = m;
      });
      // đồng hồ đếm ngược
      const cdCanvas = document.createElement('canvas');
      cdCanvas.width = 128; cdCanvas.height = 64;
      const cdTex = new THREE.CanvasTexture(cdCanvas);
      const cd = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.25), new THREE.MeshBasicMaterial({ map: cdTex }));
      cd.rotation.y = Math.PI / 2;
      cd.position.set(0.2, 3.05, 0);
      g.add(cd);
      scene.add(g);
      let lastTxt = '';
      lights[key] = {
        set(state, left) {
          for (const k in mats) {
            const on = k === state;
            mats[k].emissiveIntensity = on ? 2.2 : 0.05;
            mats[k].color.setHex(on ? cols[k] : 0x222222);
          }
          const txt = String(Math.max(0, Math.ceil(left || 0)));
          if (txt + state !== lastTxt) {
            lastTxt = txt + state;
            const c = cdCanvas.getContext('2d');
            c.fillStyle = '#000'; c.fillRect(0, 0, 128, 64);
            c.fillStyle = state === 'red' ? '#ff3b2f' : state === 'yellow' ? '#ffc21a' : '#22ff77';
            c.font = '800 52px monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
            c.fillText(txt.padStart(2, '0'), 64, 34);
            cdTex.needsUpdate = true;
          }
        },
      };
      lights[key].set('red', 0);
    }

    // ---- đường sắt (không rào chắn), ray chạy theo trục x cắt ngang đường phải
    const rl = C.rail;
    const railMat = new THREE.MeshStandardMaterial({ color: 0x8d949b, metalness: 0.8, roughness: 0.35 });
    for (const z of [rl.z0, rl.z1]) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(rl.x1 - rl.x0, 0.05, 0.08), railMat);
      r.position.set((rl.x0 + rl.x1) / 2, 0.025, z + 0.04);
      scene.add(r);
    }
    const tieMat = new THREE.MeshStandardMaterial({ color: 0x5b4636, roughness: 1 });
    for (let x = rl.x0; x <= rl.x1; x += 0.7) {
      if (Math.abs(x - C.RING.x1) < C.DIM.road / 2 + 0.3) continue;
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 1.8), tieMat);
      t.position.set(x, 0.02, (rl.z0 + rl.z1) / 2);
      scene.add(t);
    }

    // ---- nhà điều hành sát hạch + xe chờ thi
    {
      const winTex = canvasTex(THREE, 256, 128, (g, w, h) => {
        g.fillStyle = '#ece6da'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#5c7894';
        for (let i = 0; i < 8; i++) for (let j = 0; j < 2; j++) g.fillRect(8 + i * 31, 14 + j * 60, 20, 40);
      });
      winTex.wrapS = THREE.RepeatWrapping; winTex.repeat.set(3, 1);
      const wallMat = new THREE.MeshStandardMaterial({ map: winTex, roughness: 0.9 });
      const roofMat = new THREE.MeshStandardMaterial({ color: 0x9b4a32, roughness: 0.9 });
      C.buildings.forEach((bd, i) => {
        const hgt = i === 0 ? 9 : 6;
        const m = new THREE.Mesh(new THREE.BoxGeometry(bd.w, hgt, bd.d), [wallMat, wallMat, roofMat, roofMat, wallMat, wallMat]);
        m.position.set(bd.x, hgt / 2, bd.z);
        m.castShadow = true; m.receiveShadow = true;
        scene.add(m);
        const text = i === 0 ? 'TRUNG TÂM SÁT HẠCH LÁI XE' : 'PHÒNG ĐIỀU HÀNH SÁT HẠCH';
        const tex = canvasTex(THREE, 1024, 128, (g, w, h) => {
          g.fillStyle = '#0b4fa8'; g.fillRect(0, 0, w, h);
          g.fillStyle = '#fff'; g.font = '800 60px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.fillText(text, w / 2, h / 2 + 4);
        });
        const sg = new THREE.Mesh(new THREE.PlaneGeometry(bd.w * 0.85, bd.w * 0.85 / 8), new THREE.MeshStandardMaterial({ map: tex }));
        const sgn = bd.face === 'S' ? 1 : -1;
        sg.position.set(bd.x, hgt + 1.2, bd.z + sgn * (bd.d / 2 + 0.12));
        sg.rotation.y = bd.face === 'S' ? 0 : Math.PI;
        scene.add(sg);
      });
      const lot = C.lot;
      const colors = [0xf3f4f6, 0xf3f4f6, 0xc9ced6, 0xf3f4f6, 0xd9452b, 0xf3f4f6];
      for (let i = 0; i < 6; i++) {
        const car = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.4, 4.3), new THREE.MeshStandardMaterial({ color: colors[i], roughness: 0.5 }));
        car.position.set(lot.x0 + 4.4 + i * 2.8, 0.7, lot.z0 + 2.8);
        car.castShadow = true;
        scene.add(car);
      }
    }

    // ---- cây (instanced)
    {
      const spots = [];
      const isClear = (x, z) => {
        for (const bd of C.buildings) if (Math.abs(x - bd.x) < bd.w / 2 + 4 && Math.abs(z - bd.z) < bd.d / 2 + 4) return false;
        if (x > C.lot.x0 - 3 && x < C.lot.x1 + 3 && z > C.lot.z0 - 3 && z < C.lot.z1 + 3) return false;
        for (let a = 0; a < 8; a++) {
          if (C.classAt(x + Math.cos(a * Math.PI / 4) * 5.5, z + Math.sin(a * Math.PI / 4) * 5.5) !== 0) return false;
        }
        if (x > C.rail.x0 - 2 && x < C.rail.x1 + 2 && z > C.rail.z0 - 4 && z < C.rail.z1 + 4) return false;
        return C.classAt(x, z) === 0;
      };
      for (let gx = -60; gx <= C.MAP_W + 60; gx += 8.5) {
        for (let gz = -60; gz <= C.MAP_H + 60; gz += 8.5) {
          const x = gx + (Math.random() - 0.5) * 6, z = gz + (Math.random() - 0.5) * 6;
          const inside = x > 0 && z > 0 && x < C.MAP_W && z < C.MAP_H;
          if (inside && Math.random() < 0.6) continue;
          if (inside && !isClear(x, z)) continue;
          spots.push([x, z, 0.75 + Math.random() * 0.6]);
        }
      }
      const trunkGeo = new THREE.CylinderGeometry(0.16, 0.22, 2.2, 7);
      trunkGeo.translate(0, 1.1, 0);
      const crownGeo = new THREE.IcosahedronGeometry(1.7, 0);
      crownGeo.translate(0, 3.4, 0);
      const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 1 }), spots.length);
      const crowns = new THREE.InstancedMesh(crownGeo, new THREE.MeshStandardMaterial({ color: 0x3f7a35, roughness: 0.9, flatShading: true }), spots.length);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), col = new THREE.Color();
      spots.forEach(([x, z, s], i) => {
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * 6.28);
        sc.set(s, s * (0.85 + Math.random() * 0.4), s);
        p.set(x, 0, z);
        m.compose(p, q, sc);
        trunks.setMatrixAt(i, m);
        crowns.setMatrixAt(i, m);
        col.setHSL(0.27 + Math.random() * 0.07, 0.45, 0.28 + Math.random() * 0.1);
        crowns.setColorAt(i, col);
      });
      crowns.castShadow = true;
      scene.add(trunks, crowns);
    }

    return {
      scene, sun, visCanvas, lights,
      followSun(x, z) {
        sun.position.set(x + 30, 60, z + 20);
        sun.target.position.set(x, 0, z);
      },
    };
  }

  SH.buildWorld = buildWorld;
})(window.SH);
