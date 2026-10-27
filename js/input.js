// Bàn phím + nút cảm ứng.
window.SH = window.SH || {};
(function (SH) {
  'use strict';

  const held = { up: false, down: false, left: false, right: false, center: false, fine: false };
  const HOLD = {
    KeyW: 'up', ArrowUp: 'up',
    KeyS: 'down', ArrowDown: 'down',
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right',
    KeyF: 'center',
    ShiftLeft: 'fine', ShiftRight: 'fine',
  };
  const ACT = {
    Digit1: 'gear:P', Numpad1: 'gear:P',
    Digit2: 'gear:R', Numpad2: 'gear:R',
    Digit3: 'gear:N', Numpad3: 'gear:N',
    Digit4: 'gear:D', Numpad4: 'gear:D',
    KeyZ: 'sigL', KeyX: 'sigR', KeyC: 'sigOff',
    KeyH: 'hazard', KeyB: 'belt', Space: 'handbrake',
    KeyV: 'view', KeyG: 'mirror', KeyM: 'mute', Escape: 'pause',
  };

  let onAction = () => {};
  let enabled = false;

  function init(cb) {
    onAction = cb;
    window.addEventListener('keydown', (e) => {
      if (!enabled) return;
      if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
      const h = HOLD[e.code];
      if (h) { held[h] = true; e.preventDefault(); return; }
      const a = ACT[e.code];
      if (a) { e.preventDefault(); if (!e.repeat) onAction(a); }
    });
    window.addEventListener('keyup', (e) => {
      const h = HOLD[e.code];
      if (h) held[h] = false;
    });
    window.addEventListener('blur', release);

    document.querySelectorAll('[data-hold]').forEach((el) => {
      const k = el.dataset.hold;
      const on = (e) => { e.preventDefault(); held[k] = true; el.classList.add('on'); if (el.setPointerCapture) try { el.setPointerCapture(e.pointerId); } catch (_) {} };
      const off = () => { held[k] = false; el.classList.remove('on'); };
      el.addEventListener('pointerdown', on);
      el.addEventListener('pointerup', off);
      el.addEventListener('pointercancel', off);
      el.addEventListener('lostpointercapture', off);
    });
    document.querySelectorAll('[data-act]').forEach((el) => {
      el.addEventListener('click', (e) => { e.preventDefault(); el.blur(); if (enabled) onAction(el.dataset.act); });
    });
  }

  function release() { for (const k in held) held[k] = false; }

  SH.Input = {
    held,
    init,
    release,
    setEnabled(v) { enabled = v; if (!v) release(); },
  };
})(window.SH);
