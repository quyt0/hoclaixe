// Ghép nối: vòng lặp, camera, HUD, menu, lịch sử.
window.SH = window.SH || {};
(function (SH) {
  'use strict';
  const C = SH.COURSE;
  const A = SH.Audio;
  const $ = (id) => document.getElementById(id);

  if (!window.THREE) {
    $('loading').innerHTML = '<div class="loader"><p>Không tải được thư viện 3D (vendor/three.min.js).</p></div>';
    return;
  }

  function load(key, def) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v ? v : def; } catch (e) { return def; }
  }
  function save(key, v) {
    try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* bộ nhớ bị chặn */ }
  }

  const settings = Object.assign({ cam: 'cabin', voice: true, sound: true, assist: true, mirrors: true }, load('sahinh_settings', {}));
  const isCoarse = matchMedia('(pointer: coarse)').matches;
  const STEP = 1 / 120;
  const CAMS = ['cabin', 'chase', 'top'];
  const CAM_NAMES = { cabin: 'Trong xe', chase: 'Sau xe', top: 'Từ trên' };

  let renderer, world, camera, car, mesh, minimapBase, mm;
  let exam = null, mode = 'exam', state = 'loading';
  let camMode = settings.cam;
  let headYaw = 0, headPitch = 0;
  let last = 0, acc = 0, hudT = 0, lastBlink = 0;
  let menuSignals = null;
  const spokenAt = {};
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();

  // ------------------------------------------------------------ khởi tạo
  function init() {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isCoarse ? 1.5 : 2));
    renderer.setSize(innerWidth, innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false;
    $('stage').appendChild(renderer.domElement);

    C.buildSemantic();
    world = SH.buildWorld(THREE, renderer, { lowRes: isCoarse });
    camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 900);
    camera.rotation.order = 'YXZ';
    world.scene.add(camera);

    car = new SH.Car();
    mesh = SH.buildCarMesh(THREE);
    world.scene.add(mesh.root);
    buildMirrors();
    mesh.sync(car, 0);
    menuSignals = new SH.Signals();

    buildMinimap();
    SH.Input.init(onAction);
    bindUI();
    setupMouseLook();
    addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'drive') pause(); });

    A.setSound(settings.sound);
    A.setVoice(settings.voice);
    showMenu();
    $('loading').hidden = true;
    openFromUrl();
    last = performance.now();
    requestAnimationFrame(frame);
  }

  function onResize() {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    if (state !== 'menu') camera.fov = fovFor(camMode);
    camera.updateProjectionMatrix();
    layoutMirrors();
  }

  // ------------------------------------------------------------ gương chiếu hậu
  // Camera gắn trên xe (toạ độ xe: +x tiến, +z bên phải). Gương: ảnh lật ngang như gương thật.
  // W: camera nhìn xuống bánh trước bên phải (giúp canh vệt bánh xe, vạch giới hạn).
  const MIRRORS = [
    { id: 'L', label: 'GƯƠNG TRÁI', pos: [1.92, 1.02, -0.97], dir: [-1, -0.08, -0.2], fov: 30, w: 360, h: 240, flip: true },
    { id: 'R', label: 'GƯƠNG PHẢI', pos: [1.92, 1.02, 0.97], dir: [-1, -0.08, 0.26], fov: 30, w: 360, h: 240, flip: true },
    { id: 'C', label: 'GƯƠNG GIỮA', pos: [1.2, 1.32, 0], dir: [-1, -0.05, 0], fov: 20, w: 720, h: 200, flip: true },
    { id: 'W', label: 'CAMERA BÁNH PHẢI', pos: [3.15, 1.15, 1.3], dir: [-0.75, -1.1, -0.55], fov: 55, w: 360, h: 240, flip: false },
  ];
  let hudScene, hudCam;
  const mirrorObjs = [];

  function flipU(geo) {
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i));
    uv.needsUpdate = true;
  }

  function buildMirrors() {
    hudScene = new THREE.Scene();
    hudCam = new THREE.OrthographicCamera(0, 1, 1, 0, -10, 10);
    const m4 = new THREE.Matrix4(), up = new THREE.Vector3(0, 1, 0);
    const labelBox = document.createElement('div');
    labelBox.id = 'mirrorLabels';
    $('hud').appendChild(labelBox);
    for (const d of MIRRORS) {
      const cam = new THREE.PerspectiveCamera(d.fov, d.w / d.h, 0.1, 500);
      const eye = new THREE.Vector3(...d.pos);
      m4.lookAt(eye, eye.clone().add(new THREE.Vector3(...d.dir)), up);
      cam.quaternion.setFromRotationMatrix(m4);
      cam.position.copy(eye);
      cam.layers.set(0);
      cam.layers.enable(mesh.LAYER_EXT);       // gương thấy thân xe, không thấy nội thất
      mesh.tilt.add(cam);
      const rt = new THREE.WebGLRenderTarget(d.w, d.h);
      const geo = new THREE.PlaneGeometry(1, 1);
      if (d.flip) flipU(geo);
      const frameMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0x0b0d12 }));
      const glass = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: rt.texture }));
      glass.position.z = 1;
      hudScene.add(frameMesh, glass);
      const label = document.createElement('span');
      label.textContent = d.label;
      labelBox.appendChild(label);
      // kính gương thật trong xe dùng chung ảnh
      const real = mesh.mirrorGlass[d.id];
      if (real) {
        if (d.flip) flipU(real.geometry);
        real.material.map = rt.texture;
        real.material.color.setHex(0xffffff);
        real.material.needsUpdate = true;
      }
      mirrorObjs.push({ d, cam, rt, frameMesh, glass, label });
    }
    layoutMirrors();
  }

  function layoutMirrors() {
    if (!hudCam) return;
    const W = innerWidth, H = innerHeight;
    hudCam.right = W; hudCam.top = H;
    hudCam.updateProjectionMatrix();
    const s = Math.max(0.5, Math.min(1, W / 1400));
    const narrow = W < 760;
    const vis = mirrorsVisible();
    let cH = 0, rTop = 0;
    const place = {};
    for (const m of mirrorObjs) {
      let w, h, x, y;
      // màn hình hẹp: gương giữa đặt dưới thẻ bài thi để không che chữ
      if (m.d.id === 'C') { w = (narrow ? 220 : 400 * s); h = w * m.d.h / m.d.w; x = narrow ? 10 + w / 2 : W / 2; y = narrow ? H - 246 - h / 2 : H - 10 - h / 2; cH = narrow ? 246 + h - 14 : h; }
      else if (m.d.id === 'W') continue;
      else { w = 230 * s; h = w * m.d.h / m.d.w; x = m.d.id === 'L' ? 14 + w / 2 : W - 14 - w / 2; y = narrow ? H * 0.42 : H * 0.5; if (m.d.id === 'R') rTop = y + h / 2; }
      place[m.d.id] = { w, h, x, y };
    }
    const wm = mirrorObjs.find(m => m.d.id === 'W');
    if (wm) {
      const w = 230 * s, h = w * wm.d.h / wm.d.w;
      place.W = { w, h, x: W - 14 - w / 2, y: rTop + 22 + h / 2 };
    }
    for (const m of mirrorObjs) {
      const p = place[m.d.id];
      m.glass.scale.set(p.w, p.h, 1); m.glass.position.set(p.x, p.y, 1);
      m.frameMesh.scale.set(p.w + 8, p.h + 8, 1); m.frameMesh.position.set(p.x, p.y, 0);
      m.label.style.left = (p.x - p.w / 2) + 'px';
      m.label.style.top = (H - p.y - p.h / 2) + 'px';
      m.label.hidden = !vis;
    }
    $('toasts').style.top = vis ? (cH + 26) + 'px' : '';
  }

  function mirrorsVisible() {
    return settings.mirrors && camMode === 'cabin' && state !== 'menu' && state !== 'loading';
  }

  function renderMirrors() {
    for (const m of mirrorObjs) {
      renderer.setRenderTarget(m.rt);
      renderer.render(world.scene, m.cam);
    }
    renderer.setRenderTarget(null);
  }

  // Trong xe: thấy nội thất, ẩn vỏ xe; ngoài xe: thấy vỏ xe.
  function setCamLayers(cabin) {
    camera.layers.set(0);
    camera.layers.enable(cabin ? mesh.LAYER_INT : mesh.LAYER_EXT);
  }

  // ------------------------------------------------------------ camera
  function applyCam(m) {
    camMode = m;
    camera.up.set(0, 1, 0);
    setCamLayers(m === 'cabin');
    if (m === 'cabin') {
      mesh.eye.add(camera);
      camera.position.set(0, 0, 0);
      camera.fov = fovFor('cabin');
    } else {
      world.scene.add(camera);
      camera.fov = fovFor(m);
      snapCam();
    }
    camera.updateProjectionMatrix();
    layoutMirrors();
  }

  // Màn hình dọc cần góc nhìn dọc rộng hơn để thấy đủ đường.
  function fovFor(m) {
    const base = m === 'cabin' ? 72 : m === 'top' ? 50 : 60;
    return camera.aspect < 1 ? base * 1.3 : base;
  }

  function chaseTarget() {
    const c = car.center, d = car.dir, y = car.yRear;
    if (camMode === 'top') {
      camPos.set(c.x, y + 26, c.z);
      camLook.set(c.x, y, c.z);
    } else {
      camPos.set(c.x - d.x * 7.5, y + 3.4, c.z - d.z * 7.5);
      camLook.set(c.x + d.x * 2.5, y + 0.9, c.z + d.z * 2.5);
    }
  }

  function snapCam() { chaseTarget(); camera.position.copy(camPos); }

  function updateCamera(dt, t) {
    if (state === 'menu') {
      const a = t * 0.04;
      camera.position.set(C.CX + Math.cos(a) * 175, 80, C.CZ + Math.sin(a) * 150);
      camera.up.set(0, 1, 0);
      camera.lookAt(C.CX, 0, C.CZ);
      return;
    }
    if (camMode === 'cabin') {
      camera.rotation.set(-0.1 + headPitch, -Math.PI / 2 + headYaw, 0);
      return;
    }
    chaseTarget();
    const k = 1 - Math.exp(-dt * (camMode === 'top' ? 8 : 4.5));
    camera.position.lerp(camPos, k);
    if (camMode === 'top') camera.up.set(car.dir.x, 0, car.dir.z);
    else camera.up.set(0, 1, 0);
    camera.lookAt(camLook);
  }

  function setupMouseLook() {
    const el = renderer.domElement;
    let drag = null;
    el.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || camMode !== 'cabin') return;
      drag = { x: e.clientX, y: e.clientY };
    });
    addEventListener('pointermove', (e) => {
      if (!drag) return;
      headYaw = Math.max(-1.8, Math.min(1.8, headYaw - (e.clientX - drag.x) * 0.005));
      headPitch = Math.max(-0.5, Math.min(0.4, headPitch - (e.clientY - drag.y) * 0.004));
      drag = { x: e.clientX, y: e.clientY };
    });
    addEventListener('pointerup', () => { drag = null; });
    el.addEventListener('dblclick', () => { headYaw = 0; headPitch = 0; });
  }

  // ------------------------------------------------------------ minimap
  function buildMinimap() {
    const cv = $('minimap');
    mm = cv.getContext('2d');
    minimapBase = document.createElement('canvas');
    minimapBase.width = cv.width;
    minimapBase.height = cv.height;
    const g = minimapBase.getContext('2d');
    g.drawImage(world.visCanvas, 0, 0, cv.width, cv.height);
  }

  function drawMinimap(t) {
    const cv = $('minimap');
    const s = cv.width / C.MAP_W;
    mm.drawImage(minimapBase, 0, 0);
    const cur = exam && exam.current;
    if (cur && cur.entry && !cur.entered) {
      const p = cur.entry.p;
      mm.strokeStyle = 'rgba(16,211,154,.95)';
      mm.lineWidth = 2;
      mm.beginPath();
      mm.arc(p.x * s, p.z * s, 4 + (Math.sin(t * 5) + 1) * 3, 0, Math.PI * 2);
      mm.stroke();
    }
    mm.save();
    mm.translate(car.center.x * s, car.center.z * s);
    mm.rotate(car.h);
    mm.fillStyle = '#ffdd33';
    mm.strokeStyle = '#111';
    mm.lineWidth = 1.5;
    mm.beginPath();
    mm.moveTo(6, 0); mm.lineTo(-5, -4); mm.lineTo(-3, 0); mm.lineTo(-5, 4); mm.closePath();
    mm.fill(); mm.stroke();
    mm.restore();
  }

  // ------------------------------------------------------------ toast & HUD
  function toast(msg, kind, ms) {
    const box = $('toasts');
    const el = document.createElement('div');
    el.className = 'toast ' + (kind || 'info');
    el.textContent = msg;
    box.appendChild(el);
    while (box.children.length > 4) box.removeChild(box.firstChild);
    setTimeout(() => el.classList.add('out'), ms || 3200);
    setTimeout(() => el.remove(), (ms || 3200) + 450);
  }

  function fmtTime(s) {
    s = Math.max(0, Math.floor(s));
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }

  function renderDots() {
    const box = $('dots');
    box.innerHTML = '';
    exam.lessons.forEach((l, i) => {
      const el = document.createElement('i');
      el.textContent = l.num;
      if (l.done) el.className = 'done';
      else if (i === exam.idx) el.className = 'cur';
      box.appendChild(el);
    });
  }

  function renderPenList() {
    const ul = $('penList');
    ul.innerHTML = '';
    exam.log.slice(-6).reverse().forEach((e) => {
      const li = document.createElement('li');
      if (e.fail) li.className = 'f';
      const b = document.createElement('b');
      b.textContent = e.fail ? 'TQ' : (exam.practice ? '!' : '−' + e.pts);
      const sp = document.createElement('span');
      sp.textContent = `${e.tag}: ${e.msg}`;
      li.append(b, sp);
      ul.appendChild(li);
    });
  }

  function setCls(id, cls, on) { $(id).classList.toggle(cls, !!on); }

  function updateHud(t) {
    const blink = Math.floor(t * 2.6) % 2 === 0;
    setCls('indL', 'on', blink && (car.sigL || car.hazard));
    setCls('indR', 'on', blink && (car.sigR || car.hazard));
    $('wheelSvg').style.transform = `rotate(${car.steer * 270}deg)`;
    const cur = exam.current;
    // Đèn trên taplo xe sát hạch: xanh = lệnh xuất phát, đỏ = tình huống nguy hiểm
    setCls('lampGo', 'on', !!(cur && cur.num === 1 && cur.entered && state === 'drive'));
    setCls('lampEm', 'on', !!(exam.em && exam.em.phase === 'alarm' && blink));
    if (t - hudT < 0.08) return;
    hudT = t;

    if (cur) {
      $('lessonNum').textContent = cur.entered ? `BÀI ${cur.num} / ${SH.LESSON_COUNT}` : `TIẾP THEO · BÀI ${cur.num}`;
      $('lessonTitle').textContent = cur.title + (cur.sub ? ` (${cur.sub})` : '');
    }
    $('timeTotal').textContent = fmtTime(exam.t);
    const sc = $('score');
    if (exam.practice) { sc.textContent = '—'; sc.className = 'score'; }
    else {
      sc.textContent = Math.max(0, exam.score);
      sc.className = 'score' + (exam.score < SH.PASS_SCORE ? ' bad' : exam.score < 90 ? ' warn' : '');
    }
    const kmh = car.kmh;
    $('speed').textContent = kmh < 0.5 ? '0' : kmh.toFixed(0);
    setCls('speed', 'over', !(cur && cur.fast && cur.entered) && kmh > SH.SPEED_LIMIT + 0.4);
    for (const g of ['P', 'R', 'N', 'D']) setCls('g' + g, 'on', car.gear === g);
    setCls('icBelt', 'on', car.belt);
    setCls('icBelt', 'alert', !car.belt);
    setCls('icHb', 'alert', car.handbrake);
    setCls('icHz', 'on', car.hazard);
    $('icHz').classList.add('hz');

    const assist = (settings.assist || exam.practice) && state === 'drive' ? exam.assist : null;
    const as = $('assist');
    if (assist) { as.textContent = assist; as.hidden = false; } else as.hidden = true;

    const ml = $('miniLight');
    if (cur && cur.light && cur.entered && !cur.inBox) {
      ml.hidden = false;
      ml.className = exam.signals.state(cur.light);
    } else ml.hidden = true;

    drawMinimap(t);
  }

  // ------------------------------------------------------------ hook bài thi
  // Không đọc lặp cùng một câu trong vài giây (ví dụ lỗi quá tốc độ trừ liên tục).
  function say(...texts) {
    const now = performance.now();
    const key = texts.join('|');
    if (spokenAt[key] && now - spokenAt[key] < 6000) return;
    spokenAt[key] = now;
    A.speak(...texts);
  }

  function makeHooks() {
    return {
      onPenalty(e) {
        if (e.fail) {
          toast(`ĐÌNH CHỈ SÁT HẠCH · ${e.msg}`, 'fail', 4500);
          A.fail();
          say(e.msg, 'Đình chỉ sát hạch');
        } else {
          toast(exam.practice ? `Lỗi (−${e.pts}) · ${e.msg}` : `−${e.pts} · ${e.msg}`, 'pen');
          A.penalty();
          say(e.msg, `Trừ ${e.pts} điểm`);
        }
        renderPenList();
      },
      onInfo(msg, kind) {
        toast(msg, kind || 'info');
        if (SH.VOICE_FILES && SH.VOICE_FILES[msg]) say(msg);
      },
      onLessonStart(l) {
        toast(`Bài ${l.num}: ${l.title}${l.sub ? ' – ' + l.sub : ''}`, 'lesson');
        A.tingTong();
        say(SH.lessonSpeech(l));
        renderDots();
      },
      onLessonDone() { renderDots(); },
      onEmergency(ph) {
        const b = $('emBanner');
        if (ph === 'start') {
          b.className = '';
          b.textContent = '⚠ TÌNH HUỐNG NGUY HIỂM – Phanh dừng xe trong 3 giây, bật tín hiệu nguy hiểm (H) trong 5 giây';
          b.hidden = false;
          A.stopVoice();
          say('Có tình huống nguy hiểm');
        } else if (ph === 'end') {
          b.className = 'end';
          b.textContent = 'Hết tình huống nguy hiểm – Tắt tín hiệu nguy hiểm (H) rồi đi tiếp';
          say('Hết tình huống nguy hiểm');
        } else b.hidden = true;
      },
      onFinish(r) {
        state = 'ending';
        $('emBanner').hidden = true;
        if (r.passed) { A.pass(); say('Chúc mừng, bạn đã đạt bài thi sát hạch'); }
        else { A.fail(); say('Bài thi không đạt'); }
        const hist = load('sahinh_history', []);
        hist.unshift({ ts: Date.now(), score: r.score, passed: r.passed, failReason: r.failReason, duration: Math.round(r.duration), completed: r.completed, log: r.log.map(e => ({ l: e.tag, p: e.pts, f: !!e.fail, m: e.msg })) });
        save('sahinh_history', hist.slice(0, 100));
        setTimeout(() => showResult(r), 1800);
      },
    };
  }

  // ------------------------------------------------------------ phiên lái
  function startSession(m) {
    A.unlock();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    mode = m;
    car.reset(C.start.x, C.start.z, C.start.heading);
    exam = new SH.Exam(m, makeHooks());
    hideOverlays();
    $('hud').hidden = false;
    $('modeTag').textContent = m === 'exam' ? 'THI' : 'LÁI THỬ';
    $('modeTag').className = 'tag' + (m === 'exam' ? '' : ' prac');
    $('scoreBox').style.opacity = m === 'exam' ? 1 : 0.75;
    $('emBanner').hidden = true;
    $('toasts').innerHTML = '';
    headYaw = headPitch = 0;
    renderDots();
    renderPenList();
    applyCam(camMode);
    SH.Input.setEnabled(true);
    if (m === 'practice') {
      state = 'drive';
      layoutMirrors();
      toast('Lái thử tự do – lỗi chỉ để tham khảo, không trừ điểm. Nhấn Esc để dịch chuyển tới bài.', 'info', 5000);
      return;
    }
    state = 'countdown';
    layoutMirrors();
    const cd = $('countdown');
    let n = 3;
    cd.hidden = false;
    cd.textContent = n;
    A.beep();
    const iv = setInterval(() => {
      if (state !== 'countdown') { clearInterval(iv); cd.hidden = true; return; }
      n--;
      if (n > 0) { cd.textContent = n; A.beep(); return; }
      clearInterval(iv);
      cd.hidden = true;
      say('Bắt đầu bài thi sát hạch');
      state = 'drive';
    }, 1000);
  }

  function pause() {
    if (state !== 'drive') return;
    state = 'paused';
    SH.Input.release();
    $('tpBox').hidden = mode !== 'practice';
    $('pause').hidden = false;
  }

  function resume() {
    $('pause').hidden = true;
    state = 'drive';
    last = performance.now();
  }

  function onAction(a) {
    A.unlock();
    if (a === 'pause') {
      if (state === 'drive') pause();
      else if (state === 'paused') resume();
      return;
    }
    if (state !== 'drive' && state !== 'countdown') return;
    if (a.startsWith('gear:')) {
      const g = a.slice(5);
      if (car.gear === 'P' && g !== 'P' && !isCoarse && !SH.Input.held.down && car.brake < 0.1) {
        toast('Đạp phanh (giữ S) khi chuyển số ra khỏi P', 'info');
        return;
      }
      if (!car.setGear(g)) toast('Dừng hẳn xe trước khi chuyển số', 'info');
      return;
    }
    switch (a) {
      case 'sigL': car.toggleSignal('L'); break;
      case 'sigR': car.toggleSignal('R'); break;
      case 'sigOff': car.toggleSignal('off'); break;
      case 'hazard': car.hazard = !car.hazard; break;
      case 'belt':
        car.belt = !car.belt;
        toast(car.belt ? 'Đã thắt dây an toàn' : 'Đã tháo dây an toàn', 'info', 1500);
        A.click();
        break;
      case 'handbrake':
        car.handbrake = !car.handbrake;
        toast(car.handbrake ? 'Kéo phanh tay' : 'Nhả phanh tay', 'info', 1500);
        break;
      case 'view': {
        const m = CAMS[(CAMS.indexOf(camMode) + 1) % CAMS.length];
        applyCam(m);
        toast('Góc nhìn: ' + CAM_NAMES[m], 'info', 1200);
        break;
      }
      case 'mirror':
        settings.mirrors = !settings.mirrors;
        save('sahinh_settings', settings);
        layoutMirrors();
        toast(settings.mirrors ? 'Hiện gương chiếu hậu' : 'Ẩn gương chiếu hậu', 'info', 1200);
        break;
      case 'mute':
        settings.sound = !settings.sound;
        A.setSound(settings.sound);
        save('sahinh_settings', settings);
        toast(settings.sound ? 'Bật âm thanh' : 'Tắt âm thanh', 'info', 1200);
        break;
    }
  }

  function teleport(tp) {
    car.reset(tp.x, tp.z, tp.h, true);
    if (car.gear === 'P') { car.gear = 'D'; car.handbrake = false; car.belt = true; }
    exam.jumpTo(tp.lesson, car);
    if (tp.lesson === 0) car.gear = 'P';
    $('emBanner').hidden = true;
    renderDots();
    snapCam();
    resume();
  }

  // ------------------------------------------------------------ màn hình
  function hideOverlays() {
    for (const id of ['menu', 'pause', 'result', 'history', 'guide']) $(id).hidden = true;
  }

  function showMenu() {
    state = 'menu';
    exam = null;
    SH.Input.setEnabled(false);
    hideOverlays();
    $('hud').hidden = true;
    world.scene.add(camera);
    camera.fov = 55;
    setCamLayers(false);
    camera.updateProjectionMatrix();
    layoutMirrors();
    A.stopVoice();
    car.reset(C.start.x, C.start.z, C.start.heading);
    const hist = load('sahinh_history', []);
    const pass = hist.filter(h => h.passed).length;
    $('statCount').textContent = hist.length;
    $('statPass').textContent = pass;
    $('statBest').textContent = hist.length ? Math.max(...hist.map(h => h.score)) : '–';
    $('statBar').style.width = hist.length ? (pass / hist.length * 100).toFixed(0) + '%' : '0%';
    $('menu').hidden = false;
  }

  function showResult(r) {
    state = 'result';
    SH.Input.setEnabled(false);
    const head = $('resHead');
    head.className = 'res-head' + (r.passed ? '' : ' ko');
    $('resScore').textContent = r.score;
    $('resTitle').textContent = r.passed ? 'ĐẠT' : 'KHÔNG ĐẠT';
    $('resSub').textContent = (r.failReason ? r.failReason + ' · ' : '') + `Thời gian ${fmtTime(r.duration)} · hoàn thành ${r.completed}/${exam.lessons.length} phần thi`;
    const ul = $('resLog');
    ul.innerHTML = '';
    if (!r.log.length) {
      const li = document.createElement('li');
      li.innerHTML = '<span class="none">Không mắc lỗi nào. Xuất sắc!</span>';
      ul.appendChild(li);
    }
    for (const e of r.log) {
      const li = document.createElement('li');
      if (e.fail) li.className = 'f';
      const a = document.createElement('span'); a.className = 'ls'; a.textContent = e.tag;
      const b = document.createElement('span'); b.textContent = e.msg + (e.detail ? ` (${e.detail})` : '');
      const c = document.createElement('span'); c.className = 'pt'; c.textContent = e.fail ? 'TQ' : '−' + e.pts;
      li.append(a, b, c);
      ul.appendChild(li);
    }
    $('result').hidden = false;
  }

  function renderHistory() {
    const box = $('histList');
    const hist = load('sahinh_history', []);
    box.innerHTML = '';
    if (!hist.length) { box.innerHTML = '<div class="empty">Chưa có lượt thi nào.</div>'; return; }
    for (const h of hist) {
      const el = document.createElement('div');
      el.className = 'hist ' + (h.passed ? 'ok' : 'ko');
      const sc = document.createElement('div'); sc.className = 'sc'; sc.textContent = h.score;
      const mid = document.createElement('div');
      const d = new Date(h.ts);
      const t1 = document.createElement('div');
      t1.textContent = d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
      const t2 = document.createElement('div'); t2.className = 'meta';
      const errs = h.log.length ? `${h.log.length} lỗi` : 'không lỗi';
      t2.textContent = `${fmtTime(h.duration)} · ${errs}` + (h.failReason ? ` · ${h.failReason}` : '');
      mid.append(t1, t2);
      const st = document.createElement('span'); st.className = 'st'; st.textContent = h.passed ? 'ĐẠT' : 'TRƯỢT';
      el.append(sc, mid, st);
      box.appendChild(el);
    }
  }

  function bindUI() {
    $('btnStart').onclick = () => startSession('exam');
    $('btnPractice').onclick = () => startSession('practice');
    $('btnResume').onclick = resume;
    $('btnRestart').onclick = () => startSession(mode);
    $('btnMenu').onclick = showMenu;
    $('btnAgain').onclick = () => startSession('exam');
    $('btnResMenu').onclick = showMenu;
    $('btnClearHist').onclick = () => {
      if (confirm('Xoá toàn bộ lịch sử thi?')) { save('sahinh_history', []); renderHistory(); }
    };
    document.querySelectorAll('[data-open]').forEach((b) => {
      b.onclick = () => {
        const id = b.dataset.open;
        if (id === 'history') renderHistory();
        $(id).hidden = false;
      };
    });
    document.querySelectorAll('[data-close]').forEach((b) => {
      b.onclick = () => {
        b.closest('.overlay').hidden = true;
        if (state === 'menu') showMenu();
      };
    });
    document.querySelectorAll('#camSeg button').forEach((b) => {
      b.classList.toggle('on', b.dataset.cam === camMode);
      b.onclick = () => {
        camMode = settings.cam = b.dataset.cam;
        save('sahinh_settings', settings);
        document.querySelectorAll('#camSeg button').forEach(x => x.classList.toggle('on', x === b));
      };
    });
    const tog = (id, key, fn) => {
      const el = $(id);
      el.checked = !!settings[key];
      el.onchange = () => { settings[key] = el.checked; save('sahinh_settings', settings); if (fn) fn(el.checked); };
    };
    tog('optVoice', 'voice', (v) => { A.setVoice(v); if (v && !A.hasViVoice()) alert('Trình duyệt này không có giọng đọc tiếng Việt – thông báo sẽ chỉ hiện bằng chữ.'); });
    tog('optSound', 'sound', (v) => A.setSound(v));
    tog('optAssist', 'assist');
    tog('optMirrors', 'mirrors', () => layoutMirrors());

    const names = SH.makeLessons();
    const grid = $('tpGrid');
    // Điểm dịch chuyển: lùi 12 m theo tim làn trước điểm vào mỗi bài
    C.teleports = names.map((l, i) => {
      let p;
      if (i === 0) p = { x: C.start.x, z: C.start.z, h: C.start.heading };
      else p = C.poseBefore(l.entry || C.lines.finish, l.entry ? 12 : 30);
      return { lesson: i, x: p.x, z: p.z, h: p.h };
    });
    C.teleports.forEach((tp) => {
      const l = names[tp.lesson];
      const b = document.createElement('button');
      const bb = document.createElement('b'); bb.textContent = 'Bài ' + l.num + (l.sub ? ' · ' + l.sub : '');
      b.append(bb, document.createTextNode(l.title));
      b.onclick = () => teleport(tp);
      grid.appendChild(b);
    });
  }

  // ------------------------------------------------------------ vòng lặp
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const t = now / 1000;

    if (state === 'drive' || state === 'ending') {
      acc += dt;
      while (acc >= STEP) {
        acc -= STEP;
        car.step(STEP, SH.Input.held);
        if (exam && state === 'drive') exam.update(STEP, car);
      }
    } else acc = 0;

    mesh.sync(car, t);
    const sig = exam ? exam.signals : menuSignals;
    if (!exam && state === 'menu') menuSignals.update(dt);
    for (const k in world.lights) world.lights[k].set(sig.state(k), sig.remaining(k));

    updateCamera(dt, t);
    world.followSun(car.center.x, car.center.z);
    renderer.shadowMap.needsUpdate = true;
    const mirrors = mirrorsVisible();
    // gương thật trong xe luôn cần ảnh khi ngồi trong xe
    if (camMode === 'cabin' && state !== 'menu' && state !== 'loading') renderMirrors();
    renderer.render(world.scene, camera);
    if (mirrors) {
      renderer.autoClear = false;
      renderer.clearDepth();
      renderer.render(hudScene, hudCam);
      renderer.autoClear = true;
    }

    const driving = state === 'drive' || state === 'countdown' || state === 'ending' || state === 'paused';
    if (driving && exam) {
      updateHud(t);
      const bl = Math.floor(t * 2.6) % 2;
      if (bl !== lastBlink && (car.sigL || car.sigR || car.hazard) && state === 'drive') A.click();
      lastBlink = bl;
    }
    A.engine(car.kmh, car.throttle, driving && state !== 'paused');
  }

  // Mở thẳng từ trang chủ: sa-hinh.html?mode=practice&bai=4 (lái thử tại bài 4)
  function openFromUrl() {
    const qs = new URLSearchParams(location.search);
    if (qs.get('mode') !== 'practice') return;
    startSession('practice');
    const bai = Number(qs.get('bai'));
    const i = SH.makeLessons().findIndex(l => l.num === bai);
    if (i > 0) teleport(C.teleports[i]);
  }

  // Truy cập trạng thái từ console (debug).
  SH.debug = { car: () => car, exam: () => exam, world: () => world, state: () => state, start: startSession, teleport, applyCam };

  setTimeout(init, 30);
})(window.SH);
