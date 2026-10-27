// Giao diện sáng / tối dùng chung cho các trang (Bootstrap data-bs-theme), lưu lựa chọn trong trình duyệt.
(function () {
  'use strict';
  const toggle = document.getElementById('themeToggle');

  function setTheme(t) {
    document.documentElement.setAttribute('data-bs-theme', t);
    try { localStorage.setItem('sahinh_theme', t); } catch (e) { /* bộ nhớ bị chặn */ }
    if (toggle) toggle.querySelector('i').className = t === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill';
    document.querySelectorAll('[data-theme-set]').forEach((b) => b.classList.toggle('active', b.dataset.themeSet === t));
  }

  if (toggle) {
    toggle.addEventListener('click', () => {
      setTheme(document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark');
    });
  }
  document.querySelectorAll('[data-theme-set]').forEach((b) => b.addEventListener('click', () => setTheme(b.dataset.themeSet)));
  setTheme(document.documentElement.getAttribute('data-bs-theme') || 'light');

  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
