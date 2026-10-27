// Trang nâng cấp Pro: chọn gói, mã giảm giá, thanh toán mô phỏng, cấp & kích hoạt mã, lịch sử đơn.
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const H = window.HLX;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const qs = new URLSearchParams(location.search);
  let planId = H.PLANS[qs.get('plan')] ? qs.get('plan') : 'Y';
  let coupon = null;
  const orderId = H.newOrderId();

  // ---- thẻ chọn gói
  const PERKS = { M: 'Phù hợp ôn cấp tốc trước kỳ thi', Y: 'Tiết kiệm 49% so với gói tháng', L: 'Thanh toán một lần, dùng mãi mãi' };
  const box = $('planCards');
  for (const p of Object.values(H.PLANS)) {
    const col = document.createElement('div');
    col.className = 'col';
    const per = p.days === 30 ? '/tháng' : p.days === 365 ? '/năm' : ' một lần';
    col.innerHTML = `<input type="radio" class="btn-check" name="plan" id="plan${p.id}" value="${p.id}">
      <label class="btn btn-outline-success w-100 h-100 text-start p-3 position-relative" for="plan${p.id}">
        ${p.best ? '<span class="position-absolute top-0 end-0 m-2 badge text-bg-warning">Phổ biến</span>' : ''}
        <div class="fw-semibold">${p.name}</div>
        <div class="fs-4 fw-bold">${H.vnd(p.price)}<span class="fs-6 fw-normal">${per}</span></div>
        <small class="opacity-75">${PERKS[p.id]}</small>
      </label>`;
    box.appendChild(col);
  }
  box.addEventListener('change', (e) => { if (e.target.name === 'plan') { planId = e.target.value; render(); } });
  $('plan' + planId).checked = true;

  // ---- mã giảm giá
  function applyCoupon() {
    const code = $('fCoupon').value.trim().toUpperCase();
    const msg = $('couponMsg');
    if (!code) { coupon = null; msg.className = 'form-text'; msg.innerHTML = 'Sinh viên nhập <b>SINHVIEN</b> để được giảm 20%.'; render(); return; }
    if (H.COUPONS[code]) { coupon = code; msg.className = 'form-text text-success'; msg.textContent = 'Đã áp dụng: ' + H.COUPONS[code].note; }
    else { coupon = null; msg.className = 'form-text text-danger'; msg.textContent = 'Mã giảm giá không tồn tại hoặc đã hết hạn.'; }
    render();
  }
  $('btnCoupon').addEventListener('click', applyCoupon);
  $('fCoupon').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); applyCoupon(); } });

  // ---- phương thức
  document.querySelectorAll('input[name="pay"]').forEach((r) => r.addEventListener('change', () => {
    $('payProvider').textContent = r.value === 'bank' ? 'Ngân hàng DEMO' : 'Ví điện tử DEMO';
  }));

  // ---- tóm tắt
  function render() {
    const pr = H.priceOf(planId, coupon);
    $('sumPlan').textContent = pr.plan.name;
    $('sumSub').textContent = H.vnd(pr.subtotal);
    $('sumDiscRow').hidden = !pr.discount;
    $('sumDiscNote').textContent = pr.couponNote || 'Giảm giá';
    $('sumDisc').textContent = '−' + H.vnd(pr.discount);
    $('sumTotal').textContent = H.vnd(pr.total);
    $('sumOrder').textContent = orderId;
    $('payAmount').textContent = H.vnd(pr.total);
    $('payMemo').textContent = orderId + ' ' + planId;
  }

  // ---- thanh toán (mô phỏng)
  const modal = new bootstrap.Modal($('doneModal'));
  $('btnPay').addEventListener('click', () => {
    const form = $('checkout');
    form.classList.add('was-validated');
    if (!form.checkValidity()) {
      const bad = form.querySelector(':invalid');
      if (bad) bad.focus();
      return;
    }
    const btn = $('btnPay');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Đang xác nhận giao dịch…';
    setTimeout(() => {
      const pr = H.priceOf(planId, coupon);
      const key = H.generateKey(planId);
      const res = H.activate(key, { orderId, buyer: $('fName').value.trim() });
      H.addOrder({ id: orderId, ts: Date.now(), plan: planId, total: pr.total, coupon: pr.coupon, key, email: $('fEmail').value.trim() });
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-lock-fill"></i> Xác nhận đã thanh toán (demo)';
      $('doneKey').textContent = key;
      $('doneText').textContent = `${pr.plan.name} đã được kích hoạt` + (res.license.expiresAt ? ` đến ${H.fmtDate(res.license.expiresAt)}.` : ' vĩnh viễn.') + ' Mã cũng được ghi trong lịch sử đơn hàng.';
      modal.show();
      renderCurrent(); renderOrders();
    }, 1500);
  });
  $('btnCopyKey').addEventListener('click', () => {
    const k = $('doneKey').textContent;
    if (navigator.clipboard) navigator.clipboard.writeText(k).then(() => { $('btnCopyKey').innerHTML = '<i class="bi bi-check2"></i> Đã sao chép'; });
  });

  // ---- kích hoạt bằng mã
  $('keyForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const inp = $('keyInput');
    const res = H.activate(inp.value);
    if (!res.ok) { inp.classList.add('is-invalid'); $('keyErr').textContent = res.error; return; }
    inp.classList.remove('is-invalid');
    inp.value = '';
    $('doneTitle').textContent = 'Kích hoạt thành công!';
    $('doneKey').textContent = res.license.key;
    $('doneText').textContent = `${res.plan.name} đã được kích hoạt` + (res.license.expiresAt ? ` đến ${H.fmtDate(res.license.expiresAt)}.` : ' vĩnh viễn.');
    modal.show();
    renderCurrent();
  });
  $('keyInput').addEventListener('input', (e) => e.target.classList.remove('is-invalid'));

  // ---- gói hiện tại & lịch sử
  function renderCurrent() {
    const l = H.getLicense();
    const pro = H.isPro();
    $('currentCard').hidden = !l;
    if (!l) return;
    $('curPlan').textContent = (pro ? 'Bạn đang dùng ' : 'Đã hết hạn: ') + H.PLANS[l.plan].name;
    $('curInfo').innerHTML = 'Mã <code>' + esc(l.key) + '</code> · kích hoạt ' + H.fmtDate(l.activatedAt) +
      (l.expiresAt ? ' · hết hạn ' + H.fmtDate(l.expiresAt) + (pro ? ' (còn ' + H.daysLeft() + ' ngày)' : '') : ' · không thời hạn');
  }
  $('btnDeactivate').addEventListener('click', () => {
    if (confirm('Huỷ kích hoạt Pro trên trình duyệt này? Bạn có thể kích hoạt lại bằng mã trong lịch sử đơn hàng.')) { H.deactivate(); renderCurrent(); }
  });
  function renderOrders() {
    const list = H.orders();
    const body = $('orderBody');
    body.innerHTML = list.length ? '' : '<tr><td colspan="5" class="text-center text-body-secondary py-3">Chưa có đơn hàng nào.</td></tr>';
    for (const o of list) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td class="ps-3 font-monospace">${esc(o.id)}</td><td>${H.fmtDate(o.ts)}</td><td>${esc(H.PLANS[o.plan].name)}${o.coupon ? ' <span class="badge text-bg-success">' + esc(o.coupon) + '</span>' : ''}</td><td class="text-end">${H.vnd(o.total)}</td><td class="pe-3 font-monospace">${esc(o.key)}</td>`;
      body.appendChild(tr);
    }
  }

  render(); renderCurrent(); renderOrders();
  if (location.hash === '#kich-hoat') setTimeout(() => $('keyInput').focus(), 300);
})();
