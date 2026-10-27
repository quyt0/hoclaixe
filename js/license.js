// Gói Pro: bảng giá, mã kích hoạt, hạn dùng, dùng thử. Lưu trong trình duyệt (bản demo, không có máy chủ).
// Mã kích hoạt dạng HLX-XXXX-XXXX-XXXX: ký tự đầu là mã gói, 4 ký tự cuối là checksum.
(function () {
  'use strict';

  const PLANS = {
    M: { id: 'M', name: 'Pro 1 tháng', price: 49000, days: 30 },
    Y: { id: 'Y', name: 'Pro 12 tháng', price: 299000, days: 365, best: true },
    L: { id: 'L', name: 'Pro trọn đời', price: 599000, days: null },
  };
  const COUPONS = {
    SINHVIEN: { pct: 20, note: 'Ưu đãi sinh viên −20%' },
    HOCLAIXE10: { pct: 10, note: 'Giảm 10% cho học viên' },
  };
  const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // bỏ I, O, 0, 1 cho dễ đọc
  const SECRET = 'hoclaixe-2026';
  const KEY_LIC = 'hlx_license', KEY_ORD = 'hlx_orders', KEY_TRIAL = 'hlx_trial';
  const TRIAL_SEC = 180;

  function load(k, def) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? def : v; } catch (e) { return def; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }

  function checksum(body) {
    let h = 2166136261;
    const s = body + '|' + SECRET;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    let out = '';
    for (let i = 0; i < 4; i++) { out += ALPHA[h % 32]; h = Math.floor(h / 32); }
    return out;
  }

  function generateKey(planId) {
    let body = planId;
    const rnd = new Uint32Array(7);
    (window.crypto || window.msCrypto).getRandomValues(rnd);
    for (const r of rnd) body += ALPHA[r % 32];
    const k = body + checksum(body);
    return 'HLX-' + k.slice(0, 4) + '-' + k.slice(4, 8) + '-' + k.slice(8, 12);
  }

  // Trả về { ok, plan, key } hoặc { ok:false, error }
  function parseKey(raw) {
    const k = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!/^HLX[A-Z0-9]{12}$/.test(k)) return { ok: false, error: 'Mã phải có dạng HLX-XXXX-XXXX-XXXX.' };
    const body = k.slice(3, 11), sum = k.slice(11);
    if (!PLANS[body[0]]) return { ok: false, error: 'Mã không thuộc gói nào.' };
    if (checksum(body) !== sum) return { ok: false, error: 'Mã kích hoạt không hợp lệ.' };
    return { ok: true, plan: PLANS[body[0]], key: 'HLX-' + k.slice(3, 7) + '-' + k.slice(7, 11) + '-' + k.slice(11) };
  }

  function activate(raw, extra) {
    const p = parseKey(raw);
    if (!p.ok) return p;
    const now = Date.now();
    const cur = getLicense();
    // gia hạn cộng dồn nếu đang còn hạn
    const base = cur && cur.expiresAt && cur.expiresAt > now ? cur.expiresAt : now;
    const lic = {
      key: p.key, plan: p.plan.id, activatedAt: now,
      expiresAt: p.plan.days ? base + p.plan.days * 864e5 : null,
      ...(extra || {}),
    };
    if (cur && !cur.expiresAt) lic.expiresAt = null; // đã có trọn đời
    save(KEY_LIC, lic);
    document.dispatchEvent(new CustomEvent('hlx:license'));
    return { ok: true, license: lic, plan: p.plan };
  }

  function getLicense() { return load(KEY_LIC, null); }

  function isPro() {
    const l = getLicense();
    if (!l) return false;
    return !l.expiresAt || l.expiresAt > Date.now();
  }

  function daysLeft() {
    const l = getLicense();
    if (!l || !l.expiresAt) return null;
    return Math.max(0, Math.ceil((l.expiresAt - Date.now()) / 864e5));
  }

  function deactivate() {
    try { localStorage.removeItem(KEY_LIC); } catch (e) { /* bỏ qua */ }
    document.dispatchEvent(new CustomEvent('hlx:license'));
  }

  // ---- dùng thử: 1 lần / trình duyệt
  function trial() { return load(KEY_TRIAL, null); }
  function startTrial() {
    if (trial()) return false;
    save(KEY_TRIAL, { startedAt: Date.now() });
    return true;
  }
  function trialLeft() {
    const t = trial();
    if (!t) return 0;
    return Math.max(0, TRIAL_SEC - (Date.now() - t.startedAt) / 1000);
  }

  // ---- đơn hàng
  function priceOf(planId, coupon) {
    const plan = PLANS[planId];
    const c = coupon && COUPONS[String(coupon).trim().toUpperCase()];
    const discount = c ? Math.round(plan.price * c.pct / 100 / 1000) * 1000 : 0;
    return { plan, coupon: c ? String(coupon).trim().toUpperCase() : null, couponNote: c ? c.note : null, subtotal: plan.price, discount, total: plan.price - discount };
  }
  function newOrderId() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return 'HLX' + p(d.getFullYear() % 100) + p(d.getMonth() + 1) + p(d.getDate()) + Math.floor(1000 + Math.random() * 9000);
  }
  function addOrder(o) { const list = load(KEY_ORD, []); list.unshift(o); save(KEY_ORD, list.slice(0, 50)); }
  function orders() { return load(KEY_ORD, []); }

  const vnd = (n) => n.toLocaleString('vi-VN') + 'đ';
  const fmtDate = (ts) => new Date(ts).toLocaleDateString('vi-VN');

  function statusText() {
    if (!isPro()) return null;
    const l = getLicense();
    return l.expiresAt ? `${PLANS[l.plan].name} · còn ${daysLeft()} ngày` : PLANS[l.plan].name;
  }

  // ---- nút tài khoản trên thanh menu (mọi trang)
  function renderNav() {
    document.querySelectorAll('[data-pro-nav]').forEach((el) => {
      if (isPro()) {
        el.className = 'btn btn-warning btn-sm px-3';
        el.innerHTML = '<i class="bi bi-gem"></i> ' + (daysLeft() == null ? 'Pro' : 'Pro · ' + daysLeft() + ' ngày');
        el.title = statusText();
      } else {
        el.className = 'btn btn-success btn-sm px-3';
        el.innerHTML = '<i class="bi bi-gem"></i> Nâng cấp Pro';
        el.title = 'Mở khoá tính năng Pro';
      }
    });
  }
  document.addEventListener('hlx:license', renderNav);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderNav); else renderNav();

  window.HLX = {
    PLANS, COUPONS, TRIAL_SEC,
    generateKey, parseKey, activate, deactivate, getLicense, isPro, daysLeft, statusText,
    trial, startTrial, trialLeft, priceOf, newOrderId, addOrder, orders, vnd, fmtDate,
  };
})();
