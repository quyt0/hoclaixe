// Trang cấu tạo hộp số: điều khiển côn – ga – cần số, kịch bản từng bước, khoá tính năng Pro / dùng thử.
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const G = window.Gearbox, H = window.HLX;
  const S = G.S;

  // ------------------------------------------------------------------ thông báo trên khung 3D
  let alertTimer = null;
  G.ui.alert = (kind, html) => {
    const el = $('gbAlert');
    el.className = 'gb-alert position-absolute start-50 translate-middle-x alert alert-' + kind + ' shadow py-2 px-3 small';
    el.innerHTML = html;
    el.hidden = false;
    clearTimeout(alertTimer);
    alertTimer = setTimeout(() => { el.hidden = true; }, 5000);
  };

  // ------------------------------------------------------------------ côn, ga, phanh
  $('pedal').addEventListener('input', (e) => G.pedalTo(e.target.value / 100, 0.15));
  $('btnPress').addEventListener('click', () => G.pedalTo(1, 0.6));
  $('btnSlow').addEventListener('click', () => G.pedalTo(0, 3));
  $('btnDump').addEventListener('click', () => G.pedalTo(0, 0.08));
  $('throttle').addEventListener('input', (e) => G.setThrottle(e.target.value / 100));
  const brake = $('btnBrake');
  const brakeOn = (e) => { e.preventDefault(); G.setBrake(true); brake.classList.add('active'); };
  const brakeOff = () => { G.setBrake(false); brake.classList.remove('active'); };
  brake.addEventListener('pointerdown', brakeOn);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => brake.addEventListener(ev, brakeOff));
  $('btnRestart').addEventListener('click', () => G.restart());
  $('btnReset').addEventListener('click', () => { stopDemo(); G.reset(); syncInputs(); });

  // ------------------------------------------------------------------ cần số H
  document.querySelectorAll('#hSvg .h-pos').forEach((g) => {
    const go = () => G.shift(g.dataset.gear);
    g.addEventListener('click', go);
    g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  });
  G.ui.onGear = () => {
    document.querySelectorAll('#hSvg .h-pos').forEach((g) => g.classList.toggle('on', g.dataset.gear === S.gear && !S.shift));
  };

  // ------------------------------------------------------------------ góc nhìn, vỏ, đường truyền lực
  document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => G.views[b.dataset.view]()));
  document.querySelectorAll('input[name="shell"]').forEach((r) => r.addEventListener('change', () => G.setHousing(r.value)));
  $('flowToggle').addEventListener('change', (e) => { S.showFlow = e.target.checked; });

  // ------------------------------------------------------------------ danh sách chi tiết + bảng tỉ số
  const list = $('partList');
  for (const p of G.parts) {
    const a = document.createElement('button');
    a.type = 'button';
    a.className = 'list-group-item list-group-item-action';
    a.innerHTML = '<div class="fw-semibold">' + p.name + '</div><div class="text-body-secondary">' + p.desc + '</div>';
    a.addEventListener('click', () => G.focusOn(p.id));
    list.appendChild(a);
  }
  const NAMES = { 1: 'Số 1', 2: 'Số 2', 3: 'Số 3', 4: 'Số 4', 5: 'Số 5', R: 'Lùi' };
  for (const g of ['1', '2', '3', '4', '5', 'R']) {
    const d = G.GEARS[g];
    const tr = document.createElement('tr');
    const dot = '<span class="d-inline-block rounded-circle me-1" style="width:10px;height:10px;background:#' + d.color.toString(16).padStart(6, '0') + '"></span>';
    tr.innerHTML = '<td class="ps-3">' + dot + NAMES[g] + '</td><td>' + (d.direct ? 'truyền thẳng' : d.zc + ' → ' + d.zo + (d.zi ? ' (qua ' + d.zi + ')' : '')) + '</td><td class="text-end pe-3 fw-semibold">' + Math.abs(G.ratioOf(g)).toFixed(2).replace('.', ',') + '</td>';
    $('ratioTable').appendChild(tr);
  }

  // ------------------------------------------------------------------ số liệu (10 lần/giây)
  const FLOW_NAMES = { input: 'Trục sơ cấp', drive: 'BR dẫn động', counter: 'Trục trung gian', sleeveA: 'Ống gài 1–2', sleeveB: 'Ống gài 3–4', sleeveC: 'Ống gài 5–R', output: 'Trục thứ cấp', wheel: 'Bánh xe' };
  let lastUi = 0;
  G.ui.tick = (t) => {
    if (t - lastUi < 0.1) return;
    lastUi = t;
    $('rEngine').textContent = S.stalled && S.wE < 1 ? 'Tắt máy' : G.rpm(S.wE);
    $('rInput').textContent = G.rpm(S.wIn);
    $('rCounter').textContent = G.rpm(G.counterW());
    $('rOutput').textContent = G.rpm(G.outW());
    $('rSpeed').textContent = (Math.abs(S.v) * 3.6).toFixed(1).replace('.', ',') + (S.v < -0.05 ? ' (lùi)' : '');
    $('rGear').textContent = S.shift ? '…' : S.gear;
    $('rRatio').textContent = S.gear === 'N' || S.shift ? 'không truyền' : 'i = ' + Math.abs(G.ratioOf(S.gear)).toFixed(2).replace('.', ',');

    const c = G.clutchC(S.pedal);
    $('pedalPct').textContent = Math.round(S.pedal * 100) + '%';
    if (document.activeElement !== $('pedal')) $('pedal').value = Math.round(S.pedal * 100);
    $('clutchBar').style.width = Math.round(c * 100) + '%';
    $('clutchPct').textContent = Math.round(c * 100) + '%';
    $('clutchTq').textContent = Math.round(Math.abs(S.Tc));
    const badge = $('clutchBadge');
    if (c < 0.02) { badge.className = 'badge text-bg-secondary'; badge.textContent = 'Ngắt'; }
    else if (S.locked) { badge.className = 'badge text-bg-success'; badge.textContent = 'Đóng'; }
    else { badge.className = 'badge text-bg-warning'; badge.textContent = 'Đang trượt'; }
    $('btnRestart').hidden = !S.stalled;

    // núm cần số trên sơ đồ H
    const k = $('hKnob');
    k.setAttribute('cx', 110 + S.lever.u * 60);
    k.setAttribute('cy', 85 + S.lever.w * 55);

    // dòng chữ đường truyền lực
    let txt;
    if (S.stalled) txt = '<i class="bi bi-power text-danger"></i> Động cơ đã tắt';
    else if (!S.clutchOn) txt = '<i class="bi bi-scissors"></i> Ly hợp đang ngắt: động cơ quay, hộp số không nhận mô-men';
    else if (S.gear === 'N' || S.shift) txt = '<i class="bi bi-circle"></i> Số N: trục sơ cấp và trục trung gian quay, trục thứ cấp không được khoá';
    else {
      const seq = ['Động cơ', 'Ly hợp'].concat(S.flowPath.map((id) => FLOW_NAMES[id] || (id[0] === 'g' ? 'Cặp BR ' + (id[1] === 'R' ? 'lùi' : 'số ' + id[1]) : id)));
      txt = '<i class="bi bi-lightning-charge-fill text-warning"></i> ' + seq.join(' → ');
    }
    $('flowText').innerHTML = txt;
    updateGate();
  };

  function syncInputs() {
    $('throttle').value = Math.round(S.throttle * 100);
    $('throttlePct').textContent = Math.round(S.throttle * 100) + '%';
  }
  $('throttle').addEventListener('input', syncInputs);

  // ------------------------------------------------------------------ kịch bản từng bước
  // Chờ theo thời gian mô phỏng (không theo giờ thật) để máy chậm vẫn chạy đúng thứ tự
  const until = (cond) => new Promise((r) => { const f = () => (cond() ? r() : requestAnimationFrame(f)); f(); });
  const wait = (s) => { const end = S.simT + s; return until(() => S.simT >= end); };
  let demoId = 0;
  function stopDemo() { demoId++; }
  async function pedal(p, sec) { G.pedalTo(p, sec); await until(() => Math.abs(S.pedal - p) < 0.005); }
  function throttle(v) { G.setThrottle(v); syncInputs(); }

  const DEMOS = {
    start: [
      ['Chuẩn bị', 'Xe đứng yên, số N, động cơ nổ máy cầm chừng 800 vòng/phút. Ly hợp đóng nên trục sơ cấp quay cùng động cơ.', async () => { G.reset(); syncInputs(); G.views.all(); await wait(1.5); }],
      ['Đạp côn hết hành trình', 'Bi tê ép vào lò xo đĩa → bàn ép lùi ra → đĩa ly hợp tách khỏi bánh đà. Trục sơ cấp không còn nhận mô-men, quay chậm dần.', async () => { G.views.clutch(); await pedal(1, 0.8); await wait(1.4); }],
      ['Đẩy cần số vào số 1', 'Cần số chọn thanh trượt 1–2 rồi đẩy lên. Càng gạt kéo ống gài về phía bánh răng số 1; vành đồng tốc làm cùng tốc độ rồi ống gài khoá bánh răng số 1 vào trục thứ cấp.', async () => { G.views.gears(); await wait(0.6); await G.shift('1'); await wait(1.2); }],
      ['Nhả côn từ từ tới điểm tiếp xúc', 'Đĩa ly hợp bắt đầu chạm bánh đà (trượt côn): mô-men truyền dần sang hộp số, xe nhích bánh, vòng tua hơi tụt.', async () => { G.views.all(); await pedal(0.48, 1.6); await wait(1.5); }],
      ['Nhả hết côn', 'Ly hợp đóng hoàn toàn: động cơ → ly hợp → trục sơ cấp → trục trung gian → cặp bánh răng số 1 → ống gài → trục thứ cấp → bánh xe. Xe chạy ở số 1.', async () => { await pedal(0, 1.8); await wait(2); }],
    ],
    up: [
      ['Đang chạy số 1', 'Nếu chưa ở số 1 thì khởi hành trước. Đạp ga để xe tăng tốc.', async () => {
        if (S.gear !== '1' || S.stalled) { G.reset(); await pedal(1, 0.5); await G.shift('1'); await pedal(0, 2.2); }
        throttle(0.35); await wait(2.5);
      }],
      ['Nhả ga, đạp côn', 'Nhả ga để giảm tải, đạp côn để ngắt ly hợp.', async () => { throttle(0); await pedal(1, 0.4); await wait(0.6); }],
      ['Kéo cần về số 2', 'Cần kéo thẳng xuống từ số 1 qua N tới số 2. Ống gài 1–2 trượt sang bánh răng số 2; bộ đồng tốc hạ tốc độ trục sơ cấp cho khớp với bánh răng số 2.', async () => { G.views.gears(); await G.shift('2'); await wait(1); }],
      ['Nhả côn, đạp ga nhẹ', 'Nhả côn đều tay và thêm ga – xe tiếp tục tăng tốc ở số 2 với tỉ số truyền nhỏ hơn.', async () => { G.views.all(); await pedal(0, 1.2); throttle(0.25); await wait(2.5); throttle(0); }],
    ],
    stall: [
      ['Chuẩn bị', 'Xe đứng yên, đạp côn và vào số 1.', async () => { G.reset(); syncInputs(); await pedal(1, 0.5); await G.shift('1'); await wait(0.8); }],
      ['Nhả côn đột ngột', 'Ly hợp đóng ngay lập tức: quán tính của cả chiếc xe ghìm trục sơ cấp, mô-men cản lớn hơn mô-men động cơ ở vòng tua cầm chừng.', async () => { G.views.clutch(); await pedal(0, 0.08); await wait(2.5); }],
      ['Kết quả: chết máy', 'Vòng tua tụt dưới mức tối thiểu → động cơ tắt. Cách đúng: nhả côn từ từ tới điểm tiếp xúc, giữ một chút cho xe lăn bánh rồi mới nhả hết.', async () => { await wait(1); }],
    ],
    grind: [
      ['Chuẩn bị', 'Xe đứng yên ở số N, không đạp côn: trục sơ cấp vẫn quay cùng động cơ.', async () => { G.reset(); syncInputs(); G.views.gears(); await wait(1.2); }],
      ['Cố đẩy cần vào số 1', 'Trục sơ cấp đang bị động cơ kéo quay, bộ đồng tốc không thể làm bánh răng số 1 đứng yên như trục thứ cấp → vấu răng va nhau kêu “rắc”, số không vào.', async () => { await G.shift('1'); await wait(2.5); }],
      ['Cách đúng', 'Đạp hết côn trước, chờ một nhịp rồi mới vào số.', async () => { await pedal(1, 0.6); await G.shift('1'); await wait(1); }],
    ],
  };

  async function runDemo(name) {
    const id = ++demoId;
    const steps = DEMOS[name];
    const ol = $('demoSteps');
    ol.innerHTML = '';
    const items = steps.map(([title]) => {
      const li = document.createElement('li');
      li.className = 'list-group-item';
      li.textContent = title;
      ol.appendChild(li);
      return li;
    });
    for (let i = 0; i < steps.length; i++) {
      if (id !== demoId) return;
      items.forEach((li, k) => { li.classList.toggle('active', k === i); li.classList.toggle('text-body-secondary', k < i); });
      $('demoDetail').innerHTML = '<i class="bi bi-info-circle text-primary"></i> ' + steps[i][1];
      await steps[i][2]();
    }
    if (id === demoId) items.forEach((li) => { li.classList.remove('active'); li.classList.add('text-body-secondary'); });
  }
  document.querySelectorAll('[data-demo]').forEach((b) => b.addEventListener('click', () => { if (unlocked()) runDemo(b.dataset.demo); }));

  // ------------------------------------------------------------------ khoá Pro / dùng thử
  const unlocked = () => H.isPro() || H.trialLeft() > 0;
  let wasUnlocked = null;
  function updateGate() {
    const ok = unlocked();
    const pro = H.isPro();
    const left = H.trialLeft();
    $('gate').hidden = ok;
    $('controls').disabled = !ok;
    $('viewer').classList.toggle('gb-locked', !ok);
    $('btnTrial').disabled = !!H.trial();
    $('btnTrial').innerHTML = H.trial() ? '<i class="bi bi-hourglass-bottom"></i> Đã dùng hết lượt dùng thử' : '<i class="bi bi-hourglass-split"></i> Dùng thử miễn phí 3 phút';
    const st = $('gateStatus');
    if (pro) st.innerHTML = '<i class="bi bi-gem text-warning"></i> ' + H.statusText();
    else if (left > 0) st.innerHTML = '<i class="bi bi-hourglass-split text-warning"></i> Đang dùng thử';
    else st.innerHTML = '<i class="bi bi-lock"></i> Gói miễn phí';
    const tb = $('trialBadge');
    tb.hidden = pro || left <= 0;
    tb.textContent = 'Dùng thử còn ' + Math.floor(left / 60) + ':' + String(Math.floor(left % 60)).padStart(2, '0');
    if (wasUnlocked === true && !ok) { stopDemo(); G.reset(); G.ui.alert('warning', '<i class="bi bi-hourglass-bottom"></i> Hết thời gian dùng thử. Nâng cấp Pro để tiếp tục sử dụng.'); }
    wasUnlocked = ok;
  }
  $('btnTrial').addEventListener('click', () => {
    if (H.startTrial()) { G.ui.alert('success', '<i class="bi bi-hourglass-split"></i> Bắt đầu dùng thử 3 phút. Bấm “Khởi hành số 1” để xem mô phỏng!'); }
    updateGate();
  });
  document.addEventListener('hlx:license', updateGate);
  updateGate();
  G.ui.onGear();
  syncInputs();
})();
