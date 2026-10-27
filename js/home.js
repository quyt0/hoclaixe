// Trang chủ: ảnh tính năng, thành tích & tiến độ (từ lịch sử thi lưu trong trình duyệt), 11 bài thi.
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function load(key, def) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v || def; } catch (e) { return def; }
  }

  // ---------------------------------------------------------------- tính năng (đổi ảnh)
  document.querySelectorAll('#featureList [data-img]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#featureList .active').forEach((x) => x.classList.remove('active'));
      btn.classList.add('active');
      const img = $('featureImg');
      img.style.opacity = 0;
      setTimeout(() => { img.src = btn.dataset.img; img.style.opacity = 1; }, 150);
      $('featureCaption').textContent = btn.dataset.caption;
    });
  });

  // ---------------------------------------------------------------- dữ liệu lịch sử thi
  const hist = load('sahinh_history', []).filter((h) => h && typeof h.score === 'number');
  const fmtTime = (s) => { s = Math.max(0, Math.round(s || 0)); return Math.floor(s / 60) + 'p ' + String(s % 60).padStart(2, '0') + 's'; };
  const fmtDate = (ts) => new Date(ts).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });

  if (hist.length) $('welcome').textContent = 'Chào mừng trở lại!';

  // ---- bảng thành tích
  function renderRank(filter) {
    let list = hist.slice();
    if (filter === 'pass') list = list.filter((h) => h.passed);
    if (filter === 'fail') list = list.filter((h) => !h.passed);
    // Lượt đạt xếp trước lượt trượt/đình chỉ, rồi theo điểm, rồi thời gian ngắn hơn
    list.sort((a, b) => (b.passed - a.passed) || b.score - a.score || a.duration - b.duration || b.ts - a.ts);

    const podium = $('podium');
    podium.innerHTML = '';
    const top = list.slice(0, 3);
    if (!top.length) {
      podium.innerHTML = `<div class="col-12"><div class="text-center text-body-secondary py-4">
        <i class="bi bi-trophy fs-1 d-block mb-2"></i>Chưa có lượt thi nào${filter === 'all' ? '' : ' phù hợp'}.
        <div class="mt-2"><a class="btn btn-success btn-sm" href="sa-hinh.html">Thi lượt đầu tiên</a></div></div></div>`;
    } else {
      const order = [1, 0, 2];
      const medal = ['text-bg-warning', 'text-bg-secondary', 'text-bg-danger'];
      const label = ['QUÁN QUÂN', 'HẠNG 2', 'HẠNG 3'];
      for (const i of order) {
        const h = top[i];
        const col = document.createElement('div');
        col.className = 'col-md-4' + (h ? '' : ' d-none d-md-block');
        if (h) {
          col.innerHTML = `<div class="card podium-card text-center h-100 ${i === 0 ? 'border-warning shadow podium-first' : ''}">
            <div class="card-body">
              <span class="badge ${medal[i]} mb-2">${label[i]}</span>
              <div class="avatar rounded-circle mx-auto mb-2 ${h.passed ? 'text-bg-success' : 'text-bg-danger'}">${h.score}</div>
              <div class="fw-semibold">${esc(fmtDate(h.ts))}</div>
              <span class="badge rounded-pill ${h.passed ? 'text-bg-success' : 'text-bg-danger'} my-2">${h.passed ? 'ĐẠT' : 'TRƯỢT'}</span>
              <div class="row small text-body-secondary">
                <div class="col">Điểm<br><b class="text-body">${h.score}</b></div>
                <div class="col">Thời gian<br><b class="text-body">${fmtTime(h.duration)}</b></div>
              </div>
            </div></div>`;
        }
        podium.appendChild(col);
      }
    }

    const body = $('rankBody');
    body.innerHTML = '';
    const rest = list.slice(3, 13);
    if (!rest.length) {
      body.innerHTML = `<tr><td colspan="5" class="text-center text-body-secondary small py-3">${list.length ? 'Chưa có lượt thi khác.' : 'Kết quả các lượt thi sẽ hiện ở đây.'}</td></tr>`;
      return;
    }
    rest.forEach((h, k) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td class="text-body-secondary">#${k + 4}</td>
        <td>${esc(fmtDate(h.ts))}</td>
        <td><span class="badge ${h.passed ? 'text-bg-success' : 'text-bg-danger'}">${h.passed ? 'Đạt' : 'Trượt'}</span>
          ${h.failReason ? `<small class="text-body-secondary d-none d-md-inline ms-1">${esc(h.failReason)}</small>` : ''}</td>
        <td class="text-end fw-semibold">${h.score}</td>
        <td class="text-end text-body-secondary">${fmtTime(h.duration)}</td>`;
      body.appendChild(tr);
    });
  }
  document.querySelectorAll('#rankFilter input').forEach((r) => r.addEventListener('change', () => renderRank(r.value)));
  renderRank('all');

  // ---- tiến độ
  const pass = hist.filter((h) => h.passed).length;
  const fails = hist.filter((h) => !h.passed && h.failReason && !/dưới 80/.test(h.failReason)).length;
  $('stTotal').textContent = hist.length;
  $('stRate').textContent = hist.length ? Math.round(pass / hist.length * 100) + '%' : '0%';
  $('stRateSub').textContent = `${pass} đạt / ${hist.length} lượt`;
  $('stAvg').textContent = hist.length ? Math.round(hist.reduce((s, h) => s + h.score, 0) / hist.length) : 0;
  $('stBest').textContent = hist.length ? Math.max(...hist.map((h) => h.score)) : '–';
  $('stFail').textContent = fails;

  // ---- lỗi hay mắc
  const errCount = {}, lessonErr = {};
  let errTotal = 0;
  for (const h of hist) {
    for (const e of h.log || []) {
      const key = (e.l || 'Chung') + '|' + e.m;
      errCount[key] = (errCount[key] || 0) + 1;
      errTotal++;
      const m = /Bài (\d+)/.exec(e.l || '');
      if (m) lessonErr[m[1]] = (lessonErr[m[1]] || 0) + 1;
    }
  }
  $('errTotal').textContent = errTotal + ' lỗi';
  const top = Object.entries(errCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const errList = $('errList');
  if (!top.length) {
    errList.innerHTML = `<div class="text-body-secondary small"><i class="bi bi-emoji-smile"></i> ${hist.length ? 'Chưa ghi nhận lỗi nào – rất tốt!' : 'Hãy thi thử một lượt để xem thống kê lỗi.'}</div>`;
  } else {
    const max = top[0][1];
    for (const [key, n] of top) {
      const [tag, msg] = key.split('|');
      const num = (/Bài (\d+)/.exec(tag) || [])[1];
      const div = document.createElement('div');
      div.innerHTML = `<div class="d-flex justify-content-between small mb-1 gap-2">
          <span><span class="badge text-bg-secondary me-1">${esc(tag)}</span>${esc(msg)}</span>
          <span class="text-nowrap"><b>${n}</b> lần${num ? ` · <a href="sa-hinh.html?mode=practice&bai=${num}">luyện</a>` : ''}</span>
        </div>
        <div class="progress" role="progressbar" aria-label="${esc(msg)}" aria-valuenow="${n}" aria-valuemin="0" aria-valuemax="${max}" style="height: 6px">
          <div class="progress-bar bg-warning" style="width: ${Math.round(n / max * 100)}%"></div>
        </div>`;
      errList.appendChild(div);
    }
  }

  // ---------------------------------------------------------------- cẩm nang mới nhất
  if (window.ARTICLES && window.ArticleCard) {
    const latest = window.ARTICLES.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 3);
    $('homeArticles').innerHTML = latest.map(window.ArticleCard).join('');
  }

  // ---------------------------------------------------------------- 11 bài thi
  const LESSONS = [
    { n: 1, t: 'Xuất phát', d: 'Thắt dây an toàn, bật xi nhan trái, qua vạch xuất phát trong 20 giây, tắt xi nhan sau 5 m.', i: 'bi-flag' },
    { n: 2, t: 'Dừng xe nhường đường cho người đi bộ', d: 'Dừng sao cho cản trước cách vạch dừng không quá 500 mm.', i: 'bi-person-walking' },
    { n: 3, t: 'Dừng và khởi hành xe ngang dốc', d: 'Dừng đúng vạch trên dốc 10 %, không tụt dốc quá 500 mm, qua vạch trong 30 giây.', i: 'bi-graph-up-arrow' },
    { n: 4, t: 'Qua vệt bánh xe và đường vòng vuông góc', d: 'Bánh trước và sau bên phải đi trong vệt, không đè vạch, hoàn thành trong 2 phút.', i: 'bi-sign-turn-right' },
    { n: 5, t: 'Qua ngã tư có tín hiệu điều khiển giao thông', d: 'Đèn đỏ dừng đúng vạch, bật xi nhan khi rẽ, qua ngã tư trong 20 giây từ khi đèn xanh.', i: 'bi-stoplights' },
    { n: 6, t: 'Qua đường vòng quanh co', d: 'Đi hình chữ S không để bánh xe đè vạch giới hạn, hoàn thành trong 2 phút.', i: 'bi-bezier2' },
    { n: 7, t: 'Ghép xe dọc vào nơi đỗ', d: 'Lùi xe vào chuồng, toàn bộ thân xe nằm trong nơi đỗ, không đè vạch.', i: 'bi-p-square' },
    { n: 8, t: 'Ghép xe ngang vào nơi đỗ', d: 'Lùi xe song song vào nơi đỗ bên phải làn đường.', i: 'bi-arrow-left-right' },
    { n: 9, t: 'Tạm dừng ở chỗ có đường sắt chạy qua', d: 'Dừng trước vạch dừng không quá 500 mm rồi mới đi tiếp.', i: 'bi-train-front' },
    { n: 10, t: 'Thay đổi số trên đường bằng', d: '25 m đầu tăng tốc trên 24 km/h, 25 m còn lại giảm xuống dưới 24 km/h.', i: 'bi-speedometer2' },
    { n: 11, t: 'Kết thúc', d: 'Bật xi nhan phải khi xe qua vạch kết thúc.', i: 'bi-flag-fill' },
  ];
  const grid = $('lessonGrid');
  for (const l of LESSONS) {
    const n = lessonErr[l.n] || 0;
    const col = document.createElement('div');
    col.className = 'col';
    col.innerHTML = `<a class="card lesson-card h-100 text-decoration-none" href="sa-hinh.html?mode=practice&bai=${l.n}">
      <div class="card-body d-flex gap-3 align-items-start">
        <span class="lesson-num rounded-3 text-bg-success bg-opacity-75">${l.n}</span>
        <div class="flex-grow-1">
          <div class="small text-success fw-semibold text-uppercase">Bài ${l.n} <i class="bi ${l.i}"></i></div>
          <div class="fw-semibold text-body">${esc(l.t)}</div>
          <div class="small text-body-secondary">${esc(l.d)}</div>
        </div>
        <div class="text-end">
          ${n ? `<span class="badge text-bg-warning">${n} lỗi</span>` : ''}
          <i class="bi bi-chevron-right text-body-secondary d-block mt-2"></i>
        </div>
      </div></a>`;
    grid.appendChild(col);
  }
  const em = document.createElement('div');
  em.className = 'col';
  em.innerHTML = `<a class="card lesson-card h-100 text-decoration-none border-danger-subtle" href="sa-hinh.html?mode=practice">
    <div class="card-body d-flex gap-3 align-items-start">
      <span class="lesson-num rounded-3 text-bg-danger"><i class="bi bi-exclamation-triangle"></i></span>
      <div class="flex-grow-1">
        <div class="small text-danger fw-semibold text-uppercase">Tình huống nguy hiểm</div>
        <div class="fw-semibold text-body">Xuất hiện ngẫu nhiên ngoài các bài thi</div>
        <div class="small text-body-secondary">Phanh dừng trong 3 giây, bật tín hiệu nguy hiểm trong 5 giây, tắt trước khi đi tiếp.</div>
      </div>
      <i class="bi bi-chevron-right text-body-secondary"></i>
    </div></a>`;
  grid.appendChild(em);

  // Plugin Facebook vẽ theo tham số width trong URL (180–500px): đặt theo bề rộng khung để không bị cắt
  const fbFrame = document.querySelector('.fb-wrap iframe');
  if (fbFrame) {
    const w = Math.max(180, Math.min(500, Math.floor(fbFrame.parentElement.clientWidth)));
    fbFrame.src = fbFrame.src.replace(/width=\d+/, 'width=' + w);
  }

})();
