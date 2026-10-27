// Logic bài thi sa hình hạng B & chấm điểm theo Phụ lục IV Thông tư 12/2025/TT-BCA.
// Thang 100 điểm, đạt từ 80 điểm và không bị đình chỉ.
window.SH = window.SH || {};
(function (SH) {
  'use strict';
  const C = SH.COURSE, L = C.lines;
  const along = C.along, passed = C.passed;
  const TQ = 'tq';

  // Câu thông báo (dùng chung cho chữ trên màn hình và giọng đọc thu sẵn).
  const MSG = {
    belt: 'Không thắt dây an toàn',
    sigLStart: 'Không bật đèn xi nhan trái khi xuất phát',
    sigLOff: 'Không tắt đèn xi nhan trái ở khoảng cách 5 mét sau vạch xuất phát',
    start20: 'Quá 20 giây kể từ khi có lệnh xuất phát không đi qua vạch xuất phát',
    start30: 'Quá 30 giây kể từ khi có lệnh xuất phát không đi qua vạch xuất phát',
    noStop: 'Không dừng xe ở vạch dừng quy định',
    early: 'Dừng xe chưa đến vạch dừng quy định',
    late: 'Dừng xe quá vạch dừng quy định',
    hill30: 'Quá thời gian 30 giây kể từ khi dừng xe không khởi hành xe qua vạch dừng',
    rollback: 'Xe bị tụt dốc quá 500 mi li mét kể từ khi dừng xe',
    vet: 'Bánh xe trước và bánh xe sau bên lái phụ không qua vùng giới hạn của hình vệt bánh xe',
    line: 'Bánh xe đè vào vạch giới hạn hình sát hạch',
    line5: 'Bánh xe đè vào vạch giới hạn hình sát hạch quá 5 giây',
    time2: 'Thời gian thực hiện bài sát hạch quá 2 phút',
    red: 'Vi phạm tín hiệu đèn điều khiển giao thông',
    sigTurnL: 'Không bật đèn xi nhan khi rẽ trái',
    sigTurnR: 'Không bật đèn xi nhan khi rẽ phải',
    green20: 'Quá 20 giây từ khi đèn tín hiệu màu xanh bật sáng không lái xe qua được vạch kết thúc ngã tư',
    green30: 'Quá 30 giây từ khi đèn tín hiệu màu xanh bật sáng không lái xe qua được vạch kết thúc ngã tư',
    parkNoSignal: 'Ghép xe không đúng vị trí quy định',
    parkFail: 'Chưa ghép được xe vào nơi đỗ',
    gearUp: 'Không thay đổi tốc độ theo quy định ở 25 mét đầu',
    gearDown: 'Không thay đổi tốc độ theo quy định ở 25 mét còn lại',
    sigRFinish: 'Không bật đèn xi nhan phải khi qua vạch kết thúc',
    curb: 'Lái xe lên vỉa hè',
    route: 'Không thực hiện đúng trình tự các bài sát hạch',
    speed: 'Lái xe quá tốc độ quy định',
    total: 'Tổng thời gian thực hiện các bài sát hạch quá quy định',
    below80: 'Điểm sát hạch dưới 80 điểm',
    emStop: 'Không phanh dừng xe trong thời gian 3 giây khi có tình huống nguy hiểm',
    emOn: 'Không bật tín hiệu nguy hiểm trong thời gian 5 giây',
    emOff: 'Không tắt tín hiệu nguy hiểm trước khi đi tiếp',
  };

  // ---------------------------------------------------------------- đèn tín hiệu 2 pha
  const PHASES = [
    { ns: 'green', ew: 'red', d: 15 },
    { ns: 'yellow', ew: 'red', d: 3 },
    { ns: 'red', ew: 'red', d: 2 },
    { ns: 'red', ew: 'green', d: 15 },
    { ns: 'red', ew: 'yellow', d: 3 },
    { ns: 'red', ew: 'red', d: 2 },
  ];
  const axisOf = (app) => (app === 'N' || app === 'S') ? 'ns' : 'ew';

  class Signals {
    constructor() { this.phase = Math.floor(Math.random() * 6); this.left = Math.random() * PHASES[this.phase].d; }
    update(dt) {
      this.left -= dt;
      while (this.left <= 0) { this.phase = (this.phase + 1) % PHASES.length; this.left += PHASES[this.phase].d; }
    }
    state(app) { return PHASES[this.phase][axisOf(app)]; }
    // thời gian còn lại của màu hiện tại (cho đồng hồ đếm ngược)
    remaining(app) {
      const ax = axisOf(app), st = PHASES[this.phase][ax];
      let t = this.left;
      for (let i = 1; i < PHASES.length; i++) {
        const p = PHASES[(this.phase + i) % PHASES.length];
        if (p[ax] !== st) break;
        t += p.d;
      }
      return t;
    }
    // Khi xe vào bài ngã tư: ~55 % gặp đèn đỏ, còn lại đèn xanh.
    randomize(app) {
      const ax = axisOf(app);
      const wantRed = Math.random() < 0.55;
      const cand = PHASES.map((p, i) => i).filter(i => (PHASES[i][ax] === 'red') === wantRed && PHASES[i][ax] !== 'yellow');
      this.phase = cand[Math.floor(Math.random() * cand.length)];
      this.left = PHASES[this.phase].d * (0.3 + Math.random() * 0.7);
    }
  }

  function apply(ex, rule) {
    if (!rule) return;
    if (rule[0] === TQ) ex.failNow(rule[1]);
    else ex.penalize(rule[0], rule[1]);
  }

  function fmtDist(dist) {
    return dist >= 0 ? `cách vạch ${(dist * 100).toFixed(0)} cm` : `quá vạch ${(-dist * 100).toFixed(0)} cm`;
  }

  // Dừng xe tại vạch: khoảng cách từ cản trước tới vạch dừng không quá 500 mm.
  class StopCheck {
    constructor(line, o) { this.line = line; this.o = o; this.state = 'approach'; this.stillT = 0; }
    update(dt, car, ex) {
      const a = along(car.front, this.line), dist = -a;
      this.stillT = Math.abs(car.v) < 0.05 ? this.stillT + dt : 0;
      if (this.state === 'approach') {
        if (dist < 10 && dist > -2.5) ex.assist = `Cản trước ${fmtDist(dist)}`;
        if (this.stillT > 0.4 && dist <= 2.5 && dist >= -2.5) {
          this.state = 'stopped';
          this.tStop = ex.t; this.aStop = a; this.aMax = a;
          if (dist > 0.5) apply(ex, [5, MSG.early]);
          else if (dist < 0) apply(ex, this.o.late || [5, MSG.late]);
          else ex.good('Dừng xe đúng vị trí (' + fmtDist(dist) + ')');
          ex.lastStop = dist;
        } else if (dist < -2.5) {
          this.state = 'done';
          apply(ex, this.o.noStop);
        }
      } else if (this.state === 'stopped') {
        this.aMax = Math.max(this.aMax, a);
        if (this.o.rollback && this.aMax - a > 0.5) { this.state = 'done'; ex.failNow(MSG.rollback); return; }
        if (a > this.aStop + 1.0 || a > 0.5) { this.state = 'done'; return; }
        const w = ex.t - this.tStop;
        if (this.o.wait) {
          ex.assist = `Đã dừng ${w.toFixed(0)} giây – qua vạch trước ${this.o.wait} giây`;
          if (!this.waitHit && w > this.o.wait) { this.waitHit = true; ex.failNow(MSG.hill30); }
        }
      }
    }
  }

  function timeLimit(lesson, ex, sec) {
    const n = Math.floor((ex.t - lesson.tEnter) / sec);
    if (n > (lesson.timeHits || 0)) { lesson.timeHits = n; ex.penalize(5, MSG.time2); }
  }

  function bayLesson(num, title, bay, entry, exitLine) {
    return {
      num, title, entry, figure: true, bay: true,
      enter() { this.inT = 0; this.parked = false; this.wasInside = false; },
      update(dt, car, ex) {
        timeLimit(this, ex, 120);
        if (this.parked) { ex.assist = 'Đã ghép xe – tiến ra, đi tiếp'; return; }
        const n = car.corners.filter(p => C.insideRect(p, bay)).length;
        ex.assist = `Thân xe trong nơi đỗ: ${n}/4 góc`;
        if (n === 4) {
          this.wasInside = true;
          if (Math.abs(car.v) < 0.05) {
            this.inT += dt;
            if (this.inT > 1) { this.parked = true; ex.good('Đã ghép xe vào nơi đỗ'); SH.Audio.ting(); }
          } else this.inT = 0;
        } else this.inT = 0;
      },
      exitTest(car) { return passed(car.center, exitLine); },
      onExit(car, ex) {
        if (this.parked) return;
        if (this.wasInside) ex.penalize(5, MSG.parkNoSignal);
        else ex.failNow(MSG.parkFail);
      },
    };
  }

  function crossLesson(key, app, turn) {
    const entry = L[key + 'Entry'], stop = L[key + 'Stop'], box = L[key + 'Box'], end = L[key + 'End'];
    const tTitle = turn === 'L' ? 'rẽ trái' : turn === 'R' ? 'rẽ phải' : 'đi thẳng';
    return {
      num: 5, title: 'Qua ngã tư có tín hiệu điều khiển giao thông', sub: tTitle, entry, light: app, turn, stopLine: stop,
      enter(ex) { ex.signals.randomize(app); this.greenT = 0; this.inBox = false; this.stopEval = false; this.stillT = 0; },
      update(dt, car, ex) {
        const st = ex.signals.state(app);
        const a = along(car.front, stop), dist = -a;
        this.stillT = Math.abs(car.v) < 0.05 ? this.stillT + dt : 0;
        if (!this.stopEval && this.stillT > 0.4 && dist <= 2.5 && dist >= -2.5) {
          this.stopEval = true;
          if (dist > 0.5) ex.penalize(5, MSG.early, fmtDist(dist));
          else if (dist < 0) ex.penalize(5, MSG.late, fmtDist(dist));
          else ex.good('Dừng xe đúng vị trí (' + fmtDist(dist) + ')');
        }
        if (!this.inBox && passed(car.front, box)) {
          this.inBox = true;
          if (st === 'red') ex.penalize(10, MSG.red);
          if (turn === 'L' && !car.sigL) ex.penalize(5, MSG.sigTurnL);
          if (turn === 'R' && !car.sigR) ex.penalize(5, MSG.sigTurnR);
        }
        if (st === 'green') {
          this.greenT += dt;
          if (this.greenT > 20 && !this.g20) { this.g20 = true; ex.penalize(5, MSG.green20); }
          if (this.greenT > 30 && !this.g30) { this.g30 = true; ex.failNow(MSG.green30); }
        } else if (!this.inBox) this.greenT = 0;
        if (!this.inBox) {
          const label = st === 'red' ? 'ĐỎ' : st === 'yellow' ? 'VÀNG' : 'XANH';
          ex.assist = `Đèn ${label} · ${tTitle} · cản trước ${fmtDist(dist)}`;
        }
      },
      exitTest(car) { return passed(car.front, end); },
    };
  }

  function makeLessons() {
    return [
      {
        num: 1, title: 'Xuất phát', entry: null,
        enter() { this.crossed = false; },
        update(dt, car, ex) {
          if (this.crossed) return;
          if (passed(car.front, L.start)) {
            this.crossed = true;
            if (!car.belt) ex.penalize(5, MSG.belt);
            if (!car.sigL) ex.penalize(5, MSG.sigLStart);
            return;
          }
          const w = ex.t - this.tEnter;
          ex.assist = ex.practice
            ? 'Thắt dây (B) · xi nhan trái (Z) · đạp phanh + số D (4) · nhả phanh tay (phím cách)'
            : `Qua vạch xuất phát trong ${Math.max(0, 20 - w).toFixed(0)} giây`;
          if (ex.practice) return;
          if (w > 20 && !this.p20) { this.p20 = true; ex.penalize(5, MSG.start20); }
          if (w > 30 && !this.p30) { this.p30 = true; ex.failNow(MSG.start30); }
        },
        exitTest(car) { return passed(car.front, L.startOff); },
        onExit(car, ex) { if (car.sigL) ex.penalize(5, MSG.sigLOff); },
      },
      {
        num: 2, title: 'Dừng xe nhường đường cho người đi bộ', entry: L.l2Entry,
        enter() { this.sc = new StopCheck(L.l2Stop, { noStop: [5, MSG.noStop] }); },
        update(dt, car, ex) { this.sc.update(dt, car, ex); },
        exitTest(car) { return passed(car.front, L.l2Exit); },
      },
      {
        num: 3, title: 'Dừng và khởi hành xe ngang dốc', entry: L.l3Entry,
        enter() {
          this.sc = new StopCheck(L.l3Stop, { noStop: [TQ, MSG.noStop], late: [TQ, MSG.late], wait: 30, rollback: true });
        },
        update(dt, car, ex) { this.sc.update(dt, car, ex); },
        exitTest(car) { return passed(car.front, L.l3Exit); },
      },
      {
        num: 4, title: 'Qua vệt bánh xe và đường vòng vuông góc', entry: L.l4Entry, figure: true,
        enter() { this.hits = { FR: 0, RR: 0 }; },
        update(dt, car, ex) {
          timeLimit(this, ex, 120);
          const v = C.vet;
          // xe đi hướng Tây: kiểm tra tại đầu, giữa, cuối vệt
          const xs = [v.x1 - 0.3, (v.x0 + v.x1) / 2, v.x0 + 0.3];
          for (const w of [car.wheels[1], car.wheels[3]]) {
            if (Math.abs(w.z - v.zc) > 4) continue;
            const k = this.hits[w.id];
            if (k < xs.length && w.x <= xs[k]) {
              this.hits[w.id] = k + 1;
              if (Math.abs(w.z - v.zc) > v.w / 2 && !this.missed) { this.missed = true; ex.failNow(MSG.vet); }
            }
          }
          const fr = car.wheels[1];
          if (fr.x > v.x0 && car.wheels[3].x > v.x0 - 1 && fr.x < v.x1 + 9) {
            const off = fr.z - v.zc;
            ex.assist = `Bánh phải lệch tâm vệt ${(Math.abs(off) * 100).toFixed(0)} cm ${off < 0 ? '(lệch ra ngoài)' : '(lệch vào trong)'} · cho phép ±${(v.w / 2 * 100).toFixed(0)} cm`;
          }
        },
        exitTest(car) { return passed(car.front, L.l4Exit); },
      },
      crossLesson('x1', 'S', 'S'),
      {
        num: 6, title: 'Qua đường vòng quanh co', entry: L.l6Entry, figure: true,
        update(dt, car, ex) { timeLimit(this, ex, 120); },
        // vạch kết thúc nằm sát nửa vòng thứ nhất → chỉ tính khi đầu xe ở ngay trước vạch
        exitTest(car) { return passed(car.front, L.l6Exit, 3); },
      },
      crossLesson('x2', 'E', 'S'),
      bayLesson(7, 'Ghép xe dọc vào nơi đỗ', C.bays.doc, L.l7Entry, L.l7Exit),
      crossLesson('x3', 'N', 'L'),
      {
        num: 9, title: 'Tạm dừng ở chỗ có đường sắt chạy qua', entry: L.l9Entry,
        enter() { this.sc = new StopCheck(L.l9Stop, { noStop: [5, MSG.noStop] }); },
        update(dt, car, ex) { this.sc.update(dt, car, ex); },
        exitTest(car) { return passed(car.front, L.l9Exit); },
      },
      {
        num: 10, title: 'Thay đổi số trên đường bằng', entry: L.l10Entry, fast: true,
        enter() { this.phase = 'A'; this.vmax = 0; this.slowed = false; },
        update(dt, car, ex) {
          timeLimit(this, ex, 120);
          const kmh = car.kmh;
          if (this.phase === 'A') {
            this.vmax = Math.max(this.vmax, kmh);
            ex.assist = `25 m đầu: tăng tốc trên 24 km/h (đạt ${this.vmax.toFixed(0)} km/h)`;
            if (passed(car.front, L.l10Mid)) {
              this.phase = 'B';
              if (this.vmax <= 24) ex.penalize(5, MSG.gearUp);
            }
          } else {
            if (kmh < 24) this.slowed = true;
            ex.assist = this.slowed ? '25 m còn lại: đã giảm dưới 24 km/h' : '25 m còn lại: giảm tốc độ xuống dưới 24 km/h';
          }
        },
        exitTest(car) { return passed(car.front, L.l10Exit); },
        onExit(car, ex) { if (!this.slowed) ex.penalize(5, MSG.gearDown); },
      },
      bayLesson(8, 'Ghép xe ngang vào nơi đỗ', C.bays.ngang, L.l8Entry, L.l8Exit),
      crossLesson('x4', 'W', 'R'),
      {
        num: 11, title: 'Kết thúc', entry: null,
        update(dt, car, ex) {
          ex.assist = car.sigR ? 'Đã bật xi nhan phải – qua vạch kết thúc' : 'Bật xi nhan phải (X) trước vạch kết thúc';
        },
        exitTest(car) { return passed(car.front, L.finish); },
        onExit(car, ex) { if (!car.sigR) ex.penalize(5, MSG.sigRFinish); },
      },
    ];
  }

  // hooks: onPenalty(e), onInfo(msg, kind), onLessonStart(l), onLessonDone(l), onFinish(r), onEmergency(phase)
  class Exam {
    constructor(mode, hooks) {
      this.mode = mode;
      this.practice = mode === 'practice';
      this.hooks = hooks;
      this.score = 100;
      this.log = [];
      this.failed = false;
      this.failReason = null;
      this.finished = false;
      this.t = 0;
      this.signals = new Signals();
      this.lessons = makeLessons();
      this.idx = 0;
      this.lineOn = false; this.lineT = 0; this.clearT = 0;
      this.overT = 0; this.timeHits = 0;
      this.curbLatched = false; this.offT = 0; this.routeLatched = false;
      this.pathIdx = 0;
      this.em = null;
      this.emPlan = { zone: Math.floor(Math.random() * C.danger.length), frac: 0.2 + Math.random() * 0.6, done: false };
      this.assist = null;
    }

    get current() { return this.lessons[this.idx]; }

    jumpTo(idx, car) {
      this.lessons = makeLessons();
      this.idx = idx;
      this.em = null;
      this.lineOn = false;
      this.curbLatched = false; this.routeLatched = false; this.offT = 0;
      this.pathIdx = C.nearestPath(car.center.x, car.center.z).i;
      this.emPlan.done = true;
    }

    tag() {
      if (this.em) return 'Nguy hiểm';
      const cur = this.current;
      return cur && cur.entered ? 'Bài ' + cur.num : 'Chung';
    }

    penalize(pts, msg, detail) {
      if (this.finished) return;
      const e = { t: this.t, tag: this.tag(), pts, msg, detail };
      this.log.push(e);
      if (!this.practice) this.score -= pts;
      this.hooks.onPenalty(e);
      if (!this.practice && this.score < SH.PASS_SCORE) this.failNow(MSG.below80);
    }

    failNow(msg) {
      if (this.finished) return;
      const e = { t: this.t, tag: this.tag(), pts: 0, fail: true, msg };
      this.log.push(e);
      this.hooks.onPenalty(e);
      if (this.practice) return;
      this.failed = true;
      this.failReason = msg;
      this.finish();
    }

    good(msg) { this.hooks.onInfo(msg, 'good'); }

    finish() {
      if (this.finished) return;
      this.finished = true;
      const passedExam = !this.failed && this.score >= SH.PASS_SCORE;
      this.hooks.onFinish({
        passed: passedExam, score: Math.max(0, this.score), failed: this.failed,
        failReason: this.failReason, duration: this.t, log: this.log.slice(),
        completed: this.lessons.filter(l => l.done).length,
      });
    }

    update(dt, car) {
      if (this.finished) return;
      this.t += dt;
      this.assist = null;
      this.signals.update(dt);

      const cur = this.current;
      if (!cur.entered && (!cur.entry || passed(car.front, cur.entry))) {
        cur.entered = true;
        cur.tEnter = this.t;
        if (cur.enter) cur.enter(this);
        this.hooks.onLessonStart(cur);
      }
      if (cur.entered) {
        cur.update(dt, car, this);
        if (this.finished) return;
        if (cur.exitTest(car, this)) {
          if (cur.onExit) cur.onExit(car, this);
          cur.done = true;
          if (this.finished) return;
          this.hooks.onLessonDone(cur);
          this.idx++;
          if (this.idx >= this.lessons.length) {
            if (this.practice) {
              this.hooks.onInfo('Hoàn thành một vòng sa hình!', 'good');
              this.lessons = makeLessons();
              this.idx = 0;
            } else { this.finish(); return; }
          }
        }
      }
      this.generalChecks(dt, car);
      if (this.finished) return;
      this.updateEmergency(dt, car);
    }

    generalChecks(dt, car) {
      // Bánh xe đè vạch giới hạn / lên vỉa hè
      let onLine = false, onCurb = false;
      for (const p of car.tireEdges) {
        const c = C.classAt(p.x, p.z);
        if (c === 2) onLine = true;
        else if (c === 0) onCurb = true;
      }
      if (onCurb) {
        if (!this.curbLatched) { this.curbLatched = true; this.failNow(MSG.curb); }
      } else this.curbLatched = false;
      if (this.finished) return;
      if (onLine) {
        this.clearT = 0;
        if (!this.lineOn) { this.lineOn = true; this.lineT = 0; this.penalize(5, MSG.line); }
        else {
          this.lineT += dt;
          if (this.lineT >= 5) { this.lineT -= 5; this.penalize(5, MSG.line5); }
        }
      } else {
        this.clearT += dt;
        if (this.clearT > 0.3) this.lineOn = false;
      }
      this.touching = onLine || onCurb;
      if (this.finished) return;

      // Đi sai lộ trình (rẽ nhầm hướng, đi vào đường khác)
      const np = C.nearestPath(car.center.x, car.center.z, this.pathIdx, 30, 60);
      this.pathIdx = np.i;
      const cur = this.current;
      const inBay = cur && cur.bay && cur.entered;
      if (np.d > 4.6 && !inBay) {
        this.offT += dt;
        if (this.offT > 0.8 && !this.routeLatched) { this.routeLatched = true; this.failNow(MSG.route); }
      } else { this.offT = 0; this.routeLatched = false; }
      if (this.finished) return;

      // Tốc độ (trừ bài thay đổi số)
      const fast = cur && cur.fast && cur.entered;
      if (!fast && car.kmh > SH.SPEED_LIMIT + 0.4) {
        this.overT += dt;
        if (this.overT >= 3) { this.overT -= 3; this.penalize(1, MSG.speed); }
      } else this.overT = 0;

      // Tổng thời gian
      if (!this.practice && this.t > SH.EXAM_TIME) {
        const n = Math.floor((this.t - SH.EXAM_TIME) / 3);
        if (n >= this.timeHits) { this.timeHits = n + 1; this.penalize(1, MSG.total); }
      }
    }

    updateEmergency(dt, car) {
      const p = this.emPlan;
      if (!this.em && !p.done) {
        const z = C.danger[p.zone];
        const a = along(car.center, z.a), len = along(z.b.p, z.a);
        const sameDir = car.dir.x * z.a.d.x + car.dir.z * z.a.d.z > 0.7;
        if (sameDir && a > len * p.frac && C.lateral(car.center, z.a) < 2.5 && along(car.center, z.b) < 0 && car.kmh > 3) {
          p.done = true;
          this.em = { phase: 'alarm', t0: this.t, stopT: null, hzT: null, beep: 0 };
          this.hooks.onEmergency('start');
        }
      }
      const em = this.em;
      if (!em) return;
      const el = this.t - em.t0;
      if (em.phase === 'alarm') {
        if (em.stopT == null && car.kmh < 0.5) em.stopT = el;
        if (em.hzT == null && car.hazard) em.hzT = el;
        em.beep -= dt;
        if (em.beep <= 0) { em.beep = 1.5; SH.Audio.alarm(); }
        if (el >= 3 && em.stopT == null && !em.pStop) { em.pStop = true; this.penalize(10, MSG.emStop); }
        if (el >= 5 && em.hzT == null && !em.pHz) { em.pHz = true; this.penalize(10, MSG.emOn); }
        // Hết tín hiệu nguy hiểm sau khi đã dừng + bật đèn (hoặc tối đa 8 giây)
        if ((em.stopT != null && em.hzT != null && el > Math.max(em.stopT, em.hzT) + 2.5) || el > 8) {
          em.phase = 'end'; em.odo = car.odo;
          this.hooks.onEmergency('end');
        }
      } else if (em.phase === 'end') {
        if (!car.hazard) { this.em = null; this.hooks.onEmergency('clear'); }
        else if (car.odo - em.odo > 1.5) {
          this.penalize(10, MSG.emOff);
          this.em = null;
          this.hooks.onEmergency('clear');
        }
      }
    }
  }

  SH.PASS_SCORE = 80;
  SH.SPEED_LIMIT = 24;
  SH.EXAM_TIME = 18 * 60;
  SH.Exam = Exam;
  SH.Signals = Signals;
  SH.EXAM_MSG = MSG;
  SH.makeLessons = makeLessons;
  SH.LESSON_COUNT = 11;

  // Mọi câu có thể đọc (dùng để tạo sẵn file giọng đọc).
  SH.voicePhrases = function () {
    const out = new Set(Object.values(MSG));
    for (const l of makeLessons()) out.add(SH.lessonSpeech(l));
    ['Có tình huống nguy hiểm', 'Hết tình huống nguy hiểm', 'Bắt đầu bài thi sát hạch',
      'Trừ 1 điểm', 'Trừ 5 điểm', 'Trừ 10 điểm', 'Đình chỉ sát hạch',
      'Chúc mừng, bạn đã đạt bài thi sát hạch', 'Bài thi không đạt', 'Đã ghép xe vào nơi đỗ'].forEach(s => out.add(s));
    return [...out];
  };
  SH.lessonSpeech = (l) => `Bài thi số ${l.num}. ${l.title}${l.sub ? ', ' + l.sub : ''}`;
})(window.SH);
