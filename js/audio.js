// Âm thanh tổng hợp (WebAudio) + giọng đọc tiếng Việt thu sẵn (audio/voice), dự phòng Web Speech API.
window.SH = window.SH || {};
(function (SH) {
  'use strict';

  let ctx = null, master = null, engine = null;
  const state = { sound: true, voice: true };
  let viVoice = null;
  const queue = [];
  let playing = false, current = null;

  function playNext() {
    const text = queue.shift();
    if (!text) { playing = false; return; }
    playing = true;
    const file = SH.VOICE_FILES && SH.VOICE_FILES[text];
    if (file) {
      const el = new Audio(file);
      current = el;
      el.volume = 1;
      el.onended = el.onerror = () => { current = null; playNext(); };
      el.play().catch(() => { current = null; playNext(); });
      return;
    }
    if ('speechSynthesis' in window && viVoice) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'vi-VN'; u.voice = viVoice; u.rate = 1.05;
      u.onend = u.onerror = () => playNext();
      speechSynthesis.speak(u);
      return;
    }
    playNext();
  }

  function pickVoice() {
    if (!('speechSynthesis' in window)) return;
    const vs = speechSynthesis.getVoices();
    viVoice = vs.find(v => /^vi/i.test(v.lang)) || null;
  }
  if ('speechSynthesis' in window) {
    pickVoice();
    speechSynthesis.onvoiceschanged = pickVoice;
  }

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = state.sound ? 0.8 : 0;
    master.connect(ctx.destination);
    return ctx;
  }

  function tone(freq, dur, type, vol, delay) {
    if (!ensure() || !state.sound) return;
    const t0 = ctx.currentTime + (delay || 0);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.25, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  const A = {
    state,
    unlock() { ensure(); },
    setSound(on) {
      state.sound = on;
      if (master) master.gain.value = on ? 0.8 : 0;
    },
    setVoice(on) { state.voice = on; if (!on) A.stopVoice(); },
    hasViVoice() { return !!viVoice || !!SH.VOICE_FILES; },
    tingTong() { tone(1046, 0.5, 'sine', 0.3); tone(784, 0.8, 'sine', 0.3, 0.32); },
    ting() { tone(1318, 0.6, 'sine', 0.28); },
    penalty() { tone(196, 0.32, 'square', 0.16); tone(147, 0.4, 'square', 0.14, 0.18); },
    fail() { tone(220, 0.5, 'sawtooth', 0.18); tone(165, 0.9, 'sawtooth', 0.18, 0.4); },
    pass() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.45, 'triangle', 0.22, i * 0.16)); },
    click() { tone(1800, 0.03, 'square', 0.05); },
    alarm() { for (let i = 0; i < 6; i++) tone(i % 2 ? 620 : 940, 0.24, 'square', 0.12, i * 0.25); },
    beep() { tone(880, 0.12, 'sine', 0.2); },

    // Đọc thông báo: ưu tiên file thu sẵn (audio/voice), xếp hàng lần lượt; không có file thì dùng giọng trình duyệt.
    speak(...texts) {
      if (!state.voice) return;
      for (const t of texts) if (t) queue.push(t);
      if (!playing) playNext();
    },
    stopVoice() {
      queue.length = 0;
      if (current) { current.pause(); current = null; }
      playing = false;
      if ('speechSynthesis' in window) speechSynthesis.cancel();
    },

    // Tiếng động cơ: rì nhẹ theo ga và tốc độ.
    engine(kmh, throttle, running) {
      if (!ctx || !state.sound) { if (engine) engine.g.gain.value = 0; return; }
      if (!engine) {
        const o = ctx.createOscillator(), o2 = ctx.createOscillator();
        const f = ctx.createBiquadFilter(), g = ctx.createGain();
        o.type = 'sawtooth'; o2.type = 'triangle';
        f.type = 'lowpass'; f.frequency.value = 380;
        g.gain.value = 0;
        o.connect(f); o2.connect(f); f.connect(g); g.connect(master);
        o.start(); o2.start();
        engine = { o, o2, g };
      }
      const base = 32 + kmh * 1.6 + throttle * 22;
      engine.o.frequency.setTargetAtTime(base, ctx.currentTime, 0.08);
      engine.o2.frequency.setTargetAtTime(base * 0.5, ctx.currentTime, 0.08);
      engine.g.gain.setTargetAtTime(running ? 0.035 + throttle * 0.03 : 0, ctx.currentTime, 0.1);
    },
  };

  SH.Audio = A;
})(window.SH);
