// Cẩm nang kỹ thuật: danh sách bài (tìm kiếm, lọc chủ đề) và trang chi tiết (mục lục, bài liên quan, khoá Pro).
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const A = window.ARTICLES || [];
  const H = window.HLX;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
  const fmtDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('vi-VN');
  const isPro = () => H && H.isPro();

  function card(a) {
    return `<div class="col"><a class="card h-100 lesson-card text-decoration-none" href="bai-viet.html?id=${a.id}">
      <div class="article-cover text-bg-${a.color} bg-opacity-75">${a.cover
        ? `<img src="${a.cover}" alt="" loading="lazy"><span class="article-cover-icon badge text-bg-${a.color}"><i class="bi ${a.icon}"></i></span>`
        : `<i class="bi ${a.icon}"></i>`}
        ${a.pro ? '<span class="badge text-bg-warning position-absolute top-0 end-0 m-2"><i class="bi bi-gem"></i> Pro</span>' : ''}</div>
      <div class="card-body">
        <div class="small text-${a.color}-emphasis fw-semibold mb-1">${esc(a.cat)}</div>
        <h2 class="h6 fw-bold text-body">${esc(a.title)}</h2>
        <p class="small text-body-secondary mb-0">${esc(a.summary)}</p>
      </div>
      <div class="card-footer small text-body-secondary d-flex justify-content-between">
        <span><i class="bi bi-calendar3"></i> ${fmtDate(a.date)}</span><span><i class="bi bi-clock"></i> ${a.minutes} phút đọc</span>
      </div></a></div>`;
  }

  // ------------------------------------------------------------------ trang danh sách
  if ($('list')) {
    const cats = ['Tất cả', ...new Set(A.map((a) => a.cat))];
    let cat = 'Tất cả';
    const box = $('cats');
    cats.forEach((c, i) => {
      const id = 'cat' + i;
      box.insertAdjacentHTML('beforeend', `<input type="radio" class="btn-check" name="cat" id="${id}" value="${esc(c)}" ${i === 0 ? 'checked' : ''}><label class="btn btn-outline-success btn-sm rounded-pill" for="${id}">${esc(c)}</label>`);
    });
    box.addEventListener('change', (e) => { cat = e.target.value; render(); });
    const qs = new URLSearchParams(location.search);
    if (qs.get('q')) $('q').value = qs.get('q');
    $('q').addEventListener('input', render);
    function render() {
      const q = norm($('q').value.trim());
      const list = A.filter((a) => (cat === 'Tất cả' || a.cat === cat) && (!q || norm(a.title + ' ' + a.summary + ' ' + a.cat).includes(q)));
      $('list').innerHTML = list.map(card).join('');
      $('empty').hidden = list.length > 0;
    }
    render();
  }

  // ------------------------------------------------------------------ trang chi tiết
  if ($('article')) {
    const id = new URLSearchParams(location.search).get('id');
    const a = A.find((x) => x.id === id);
    if (!a) { $('notFound').hidden = false; $('tocCard').hidden = true; renderRelated(null); return; }
    document.title = a.title + ' – Cẩm nang kỹ thuật – HocLaiXe';
    $('crumb').textContent = a.title;
    const head = `<header class="mb-4">
        <span class="badge text-bg-${a.color} mb-2">${esc(a.cat)}</span>
        ${a.pro ? '<span class="badge text-bg-warning mb-2"><i class="bi bi-gem"></i> Bài viết Pro</span>' : ''}
        <h1 class="h2 fw-bold">${esc(a.title)}</h1>
        <div class="small text-body-secondary"><i class="bi bi-calendar3"></i> ${fmtDate(a.date)} · <i class="bi bi-clock"></i> ${a.minutes} phút đọc · Ban biên tập HocLaiXe</div>
      </header>`;
    const body = document.createElement('div');
    body.className = 'article-body';
    body.innerHTML = a.html;
    $('article').insertAdjacentHTML('afterbegin', head);
    $('article').appendChild(body);

    // khoá bài Pro: giữ phần mở đầu và mục đầu tiên, làm mờ phần còn lại
    const locked = a.pro && !isPro();
    if (locked) {
      const h2s = body.querySelectorAll('h2');
      if (h2s.length > 1) {
        const rest = document.createElement('div');
        rest.className = 'article-locked';
        let n = h2s[1];
        while (n) { const next = n.nextSibling; rest.appendChild(n); n = next; }
        body.appendChild(rest);
        body.insertAdjacentHTML('beforeend', `<div class="card border-warning shadow text-center pro-wall">
          <div class="card-body p-4">
            <div class="fs-1 text-warning"><i class="bi bi-lock-fill"></i></div>
            <div class="h4 fw-bold">Đọc tiếp với gói Pro</div>
            <p class="text-body-secondary">Bài viết này dành cho thành viên Pro. Nâng cấp để đọc toàn bộ cẩm nang và mở khoá cấu tạo hộp số sàn 3D.</p>
            <a class="btn btn-warning fw-semibold" href="nang-cap.html?plan=Y"><i class="bi bi-gem"></i> Nâng cấp Pro – từ 49.000đ</a>
            <div class="small mt-2"><a href="nang-cap.html#kich-hoat">Đã có mã kích hoạt?</a></div>
          </div></div>`);
      }
    }

    // mục lục từ các tiêu đề h2 (chỉ các mục đọc được)
    const toc = $('toc');
    body.querySelectorAll('h2').forEach((h, i) => {
      if (!h.id) h.id = 'muc-' + (i + 1);
      const inLock = h.closest('.article-locked');
      toc.insertAdjacentHTML('beforeend', `<a class="list-group-item list-group-item-action${inLock ? ' disabled' : ''}" href="#${h.id}">${inLock ? '<i class="bi bi-lock"></i> ' : ''}${esc(h.textContent)}</a>`);
    });
    if (!toc.children.length) $('tocCard').hidden = true;
    renderRelated(a);
    document.addEventListener('hlx:license', () => location.reload());
  }

  function renderRelated(a) {
    const box = $('related');
    if (!box) return;
    const others = A.filter((x) => !a || x.id !== a.id).sort((x, y) => (a && y.cat === a.cat) - (a && x.cat === a.cat)).slice(0, 4);
    box.innerHTML = others.map((x) => `<a class="list-group-item list-group-item-action d-flex gap-2" href="bai-viet.html?id=${x.id}">
      <i class="bi ${x.icon} text-${x.color}"></i><span>${esc(x.title)}${x.pro ? ' <span class="badge text-bg-warning">Pro</span>' : ''}</span></a>`).join('')
      + '<a class="list-group-item list-group-item-action fw-semibold" href="cam-nang.html">Xem tất cả bài viết <i class="bi bi-arrow-right"></i></a>';
  }

  // cho trang chủ dùng lại thẻ bài viết
  window.ArticleCard = card;
})();
