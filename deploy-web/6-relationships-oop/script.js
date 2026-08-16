'use strict';
/* ==========================================================================
   OOP RELATIONSHIPS — Interactive Learning Page
   --------------------------------------------------------------------------
   Kiến trúc:
     0. Tiện ích + bảng màu theo theme + bộ icon FontAwesome (unicode glyph)
     1. Engine animation (tween + timer + hạt) hỗ trợ đổi tốc độ & hủy
     2. Các hàm vẽ Canvas (card UML + icon FA, đường nối, mũi tên, hình thoi)
     3. Lớp Scene (khung chung cho mọi scene)
     4. Sáu scene tương ứng sáu mối quan hệ — mỗi scene 3 VÍ DỤ chuyển đổi được
     5. Cây quyết định tương tác
     6. Khung ứng dụng: điều hướng, tiến trình, dark mode, tốc độ…

   Luồng sư phạm của mỗi scene:
     [CÂU HỎI LỚN] → [▶ Xem câu chuyện animation]
     → [Nút "Tiếp tục"] → [Mô phỏng vòng đờii: tự tay XÓA object & quan sát]
     → [Giải thích từng bullet + mẹo ghi nhớ]
   ========================================================================== */


/* ================== 0. TIỆN ÍCH & BẢNG MÀU & ICON ================== */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const lerp = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2;

/* Các hàm easing giúp chuyển động "mượt" */
const EASE = {
  linear:    t => t,
  outCubic:  t => 1 - Math.pow(1 - t, 3),
  inOutCubic:t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack:   t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
};

/* Font chữ dùng chung trên canvas */
const F = (size, weight = 600) =>
  `${weight} ${size}px "Be Vietnam Pro", "Segoe UI", system-ui, sans-serif`;
/* Font icon: FontAwesome 6 Free (solid) — vẽ glyph trực tiếp lên canvas */
const FA = size => `900 ${size}px "Font Awesome 6 Free"`;
const fa = cls => `<i class="fa-solid ${cls}"></i>`;          // tiện ích icon trong DOM

/* "#RRGGBB" + alpha → "rgba(...)" */
function hexA(hex, a) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/* Bảng màu đọc từ CSS variable → canvas tự đổi theo Dark Mode */
const PAL = {};
function refreshPalette() {
  const cs = getComputedStyle(document.documentElement);
  const v = n => cs.getPropertyValue(n).trim();
  PAL.stage  = v('--stage-bg');
  PAL.card   = v('--surface');
  PAL.text   = v('--text');
  PAL.sub    = v('--text-sub');
  PAL.line   = v('--line');
  PAL.shadow = v('--shadow-canvas');
}

/* Unicode glyph của các icon FontAwesome solid dùng trong CANVAS */
const ICO = {
  teacher:   '\uf51c',   // fa-chalkboard-user
  teacherTie:'\uf508',   // fa-user-tie
  bookOpen:  '\uf518',   // fa-book-open
  doctor:    '\uf0f0',   // fa-user-doctor
  patient:   '\uf80d',   // fa-hospital-user
  customer:  '\uf507',   // fa-user-tag
  boxOpen:   '\uf49e',   // fa-box-open
  print:     '\uf02f',   // fa-print
  fileLines: '\uf15c',   // fa-file-lines
  gears:     '\uf085',   // fa-gears
  fileCode:  '\uf1c9',   // fa-file-code
  cashReg:   '\uf788',   // fa-cash-register
  creditCard:'\uf09d',   // fa-credit-card
  building:  '\uf19c',   // fa-building-columns
  school:    '\uf549',   // fa-school
  users:     '\uf0c0',   // fa-users
  user:      '\uf007',   // fa-user
  landmark:  '\uf66f',   // fa-landmark
  book:      '\uf02d',   // fa-book
  fileSign:  '\uf573',   // fa-file-signature
  house:     '\uf015',   // fa-house
  doorOpen:  '\uf52b',   // fa-door-open
  invoice:   '\uf570',   // fa-file-invoice
  listUl:    '\uf0ca',   // fa-list-ul
  paw:       '\uf1b0',   // fa-paw
  dog:       '\uf6d3',   // fa-dog
  truck:     '\uf0d1',   // fa-truck
  car:       '\uf1b9',   // fa-car
  charging:  '\uf5e7',   // fa-charging-station
  key:       '\uf084',   // fa-key
  graduate:  '\uf501',   // fa-user-graduate
  wallet:    '\uf555',   // fa-wallet
  qrcode:    '\uf029',   // fa-qrcode
  feather:   '\uf52d',   // fa-feather
  dove:      '\uf4ba',   // fa-dove
  plane:     '\uf072',   // fa-plane
};


/* ================== 1. ENGINE ANIMATION ================== */
/* Engine gồm 3 thứ:
   - tween  : đổi dần thuộc tính số của một object (x, y, alpha, scale…)
   - timer  : "wait(ms)" kiểu async/await
   - particle: mảnh vỡ khi object bị xóa
   Mọi thứ chạy theo dt đã nhân SPEED → nút tốc độ tăng tốc toàn bộ.
*/

let SPEED = 1;
const abortErr = () => Object.assign(new Error('aborted'), { aborted: true });

class Engine {
  constructor() { this.tweens = []; this.timers = []; this.particles = []; }

  /** Tween các thuộc tính số của `target`. Trả về Promise. */
  tween(target, props, dur, ease = 'outCubic') {
    const from = {};
    for (const k in props) from[k] = target[k];
    const tw = { target, from, to: props, left: dur / 1000, dur: dur / 1000, ease: EASE[ease], dead: false };
    this.tweens.push(tw);
    return new Promise((res, rej) => { tw.res = res; tw.rej = rej; });
  }

  /** Chờ ms mili-giây (tôn trọng SPEED). */
  wait(ms) {
    const tm = { left: ms / 1000, dead: false };
    this.timers.push(tm);
    return new Promise((res, rej) => { tm.res = res; tm.rej = rej; });
  }

  /** Sinh đám hạt vỡ ra từ vùng hình chữ nhật (object bị xóa). */
  burst(x, y, w, h, color, n = 30) {
    for (let i = 0; i < n; i++) {
      this.particles.push({
        x: x + (Math.random() - .5) * w, y: y + (Math.random() - .5) * h,
        vx: (Math.random() - .5) * 360, vy: -Math.random() * 260 - 40,
        g: 560, s: 4 + Math.random() * 9,
        r: Math.random() * TAU, vr: (Math.random() - .5) * 9,
        life: 1, decay: .45 + Math.random() * .55,
        c: Math.random() < .72 ? color : '#94A3B8',
      });
    }
  }

  update(dt) {
    for (const tw of this.tweens) {
      if (tw.dead) continue;
      tw.left -= dt;
      const p = Math.min(1, 1 - tw.left / tw.dur), e = tw.ease(p);
      for (const k in tw.to) tw.target[k] = lerp(tw.from[k], tw.to[k], e);
      if (p >= 1) { tw.dead = true; tw.res(); }
    }
    this.tweens = this.tweens.filter(t => !t.dead);

    for (const tm of this.timers) {
      if (tm.dead) continue;
      tm.left -= dt;
      if (tm.left <= 0) { tm.dead = true; tm.res(); }
    }
    this.timers = this.timers.filter(t => !t.dead);

    for (const p of this.particles) {
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      p.r += p.vr * dt; p.life -= p.decay * dt;
    }
    this.particles = this.particles.filter(p => p.life > 0);
  }

  drawParticles(ctx) {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s);
      ctx.restore();
    }
  }

  /** Hủy mọi thứ đang chạy (khi chuyển scene / replay / đổi ví dụ). */
  abort() {
    this.tweens.forEach(t => { t.dead = true; t.rej(abortErr()); });
    this.timers.forEach(t => { t.dead = true; t.rej(abortErr()); });
    this.tweens = []; this.timers = []; this.particles = [];
  }
}


/* ================== 2. HÀM VẼ CANVAS ================== */

/* Đường bo góc thủ công */
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* Mũi tên tam giác rỗng — kế thừa / hiện thực hóa UML */
function drawTri(ctx, x, y, ang, m, color) {
  const bx = x - m * Math.cos(ang), by = y - m * Math.sin(ang);
  const px = -Math.sin(ang), py = Math.cos(ang);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(bx + px * m * .55, by + py * m * .55);
  ctx.lineTo(bx - px * m * .55, by - py * m * .55);
  ctx.closePath();
  ctx.fillStyle = PAL.card; ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = 2.4; ctx.stroke();
}

/* Hình thoi phía "tổng thể" — composition (đặc) / aggregation (rỗng) */
function drawDiamond(ctx, x, y, ang, m, color, filled) {
  const c = Math.cos(ang), s = Math.sin(ang), px = -s, py = c;
  const cx = x + c * m * .62, cy = y + s * m * .62;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(cx + px * m * .44, cy + py * m * .44);
  ctx.lineTo(x + c * m * 1.24, y + s * m * 1.24);
  ctx.lineTo(cx - px * m * .44, cy - py * m * .44);
  ctx.closePath();
  ctx.fillStyle = filled ? color : PAL.card; ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = 2.4; ctx.stroke();
}

/** Đường nối UML (progress 0→1 để vẽ dần) */
function connector(ctx, x1, y1, x2, y2, o = {}) {
  const { progress = 1, color = PAL.sub, width = 2.4, dash = false, label = '',
          startMark = '', endMark = '', mark = 18, alpha = 1, labelDy = -16 } = o;
  if (progress <= 0 || alpha <= 0) return;
  const ex = lerp(x1, x2, progress), ey = lerp(y1, y2, progress);
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round';
  if (dash) ctx.setLineDash([11, 9]);
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(ex, ey); ctx.stroke();
  ctx.setLineDash([]);
  const ang = Math.atan2(y2 - y1, x2 - x1);
  if (progress >= .995) {
    if (endMark === 'tri')     drawTri(ctx, x2, y2, ang, mark, color);
    if (startMark === 'dia-h') drawDiamond(ctx, x1, y1, ang, mark + 4, color, false);
    if (startMark === 'dia-f') drawDiamond(ctx, x1, y1, ang, mark + 4, color, true);
  }
  if (label && progress > .5) {
    ctx.globalAlpha = alpha * Math.min(1, (progress - .5) * 4);
    ctx.font = F(15, 700); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = color;
    ctx.fillText(label, (x1 + x2) / 2, (y1 + y2) / 2 + labelDy);
  }
  ctx.restore();
}

/* Huy hiệu nhỏ nổi trên canvas (vd: "login() ✓") */
function drawBadge(ctx, x, y, text, { color = '#10B981', alpha = 1, scale = 1 } = {}) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.scale(scale, scale);
  ctx.font = F(18, 700);
  const w = ctx.measureText(text).width + 36, h = 40;
  ctx.save();
  rr(ctx, -w / 2, -h / 2, w, h, 20);
  ctx.shadowColor = PAL.shadow; ctx.shadowBlur = 16; ctx.shadowOffsetY = 5;
  ctx.fillStyle = PAL.card; ctx.fill();
  ctx.restore();
  rr(ctx, -w / 2, -h / 2, w, h, 20);
  ctx.strokeStyle = color; ctx.lineWidth = 1.8; ctx.stroke();
  ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 2);
  ctx.restore();
}

/** Card UML — "diễn viên" của mọi scene. Icon là glyph FontAwesome. */
class Card {
  constructor(o) {
    Object.assign(this, {
      x: 0, y: 0, w: 220, h: 120,
      color: '#3B82F6', ico: ICO.user, title: '', sub: '', tag: '',
      rows: null,                       // [{t:'name', inh:true, hl:0}]
      alpha: 1, scale: 1, shake: 0, shakeT: 0, glow: 0, visible: true,
    }, o);
  }

  draw(ctx) {
    if (!this.visible || this.alpha <= 0 || this.scale <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, this.alpha));
    /* hiệu ứng rung (cảnh báo / sắp bị phá hủy) */
    const damp = Math.min(1, this.shake);
    const sx = this.shake > 0 ? Math.sin(this.shakeT * 42) * 8 * damp : 0;
    const sy = this.shake > 0 ? Math.cos(this.shakeT * 35) * 5 * damp : 0;
    ctx.translate(this.x + sx, this.y + sy);
    ctx.scale(this.scale, this.scale);

    const { w, h } = this, x = -w / 2, y = -h / 2, r = 16;

    /* thân card + bóng mềm */
    ctx.save();
    rr(ctx, x, y, w, h, r);
    ctx.shadowColor = PAL.shadow; ctx.shadowBlur = 22; ctx.shadowOffsetY = 8;
    ctx.fillStyle = PAL.card; ctx.fill();
    ctx.restore();

    /* viền — sáng lên khi highlight (glow) */
    rr(ctx, x, y, w, h, r);
    if (this.glow > 0) {
      ctx.save();
      ctx.strokeStyle = hexA(this.color, .95); ctx.lineWidth = 3;
      ctx.shadowColor = hexA(this.color, .55); ctx.shadowBlur = 18;
      ctx.globalAlpha *= this.glow; ctx.stroke();
      ctx.restore();
    }
    ctx.strokeStyle = PAL.line; ctx.lineWidth = 1.5; ctx.stroke();

    /* icon FA trong đĩa tròn nhạt màu */
    const ix = x + 40, iy = y + 42;
    ctx.beginPath(); ctx.arc(ix, iy, 24, 0, TAU);
    ctx.fillStyle = hexA(this.color, .14); ctx.fill();
    ctx.fillStyle = this.color;
    ctx.font = FA(23);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(this.ico, ix, iy + 1);

    /* tên lớp + chú thích */
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = PAL.text; ctx.font = F(24, 800);
    ctx.fillText(this.title, x + 76, y + 42);
    ctx.fillStyle = PAL.sub; ctx.font = F(15, 600);
    ctx.fillText(this.sub, x + 76, y + 65);

    /* nhãn «interface» ở góc */
    if (this.tag) {
      ctx.font = F(14, 700);
      const tw = ctx.measureText(this.tag).width + 20;
      rr(ctx, x + w - tw - 10, y + 10, tw, 24, 12);
      ctx.fillStyle = hexA(this.color, .15); ctx.fill();
      ctx.fillStyle = this.color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(this.tag, x + w - tw / 2 - 10, y + 23);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    }

    /* danh sách thuộc tính / phương thức */
    if (this.rows && this.rows.length) {
      ctx.strokeStyle = PAL.line; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + 14, y + 80); ctx.lineTo(x + w - 14, y + 80); ctx.stroke();
      let ry = y + 100;
      for (const row of this.rows) {
        if (row.hl > 0) {                                   // dòng được highlight (đã kế thừa)
          ctx.save(); ctx.globalAlpha *= row.hl;
          rr(ctx, x + 10, ry - 16, w - 20, 26, 8);
          ctx.fillStyle = hexA(this.color, .18); ctx.fill();
          ctx.restore();
        }
        ctx.fillStyle = row.inh ? this.color : PAL.text;
        ctx.font = F(16, row.inh ? 700 : 600);
        ctx.fillText((row.inh ? '↳ ' : '+ ') + row.t, x + 22, ry + 3);
        ry += 29;
      }
    }
    ctx.restore();
  }
}


/* ================== 3. LỚP SCENE (KHUNG CHUNG) ================== */

class Scene {
  constructor(def) { this.def = def; this.engine = new Engine(); this.camT = 0; this.exIdx = 0; }

  get E() { return this.def.examples[this.exIdx]; }   // ví dụ đang chọn

  attach(panel) {
    this.panel   = panel;
    this.canvas  = $('canvas', panel);
    this.ctx     = this.canvas.getContext('2d');
    this.captionEl = $('.caption', panel);
    this.actionsEl = $('.stage-actions', panel);
    this.startEl   = $('.stage-start', panel);
    this.hintEl    = $('.stage-hint', panel);
    $('.btn-start', panel).addEventListener('click', () => this.start());
    /* chip chuyển ví dụ */
    $$('.example-chip', panel).forEach(ch =>
      ch.addEventListener('click', () => this.switchExample(+ch.dataset.ex)));
  }

  /* ---- vòng đờii khung ---- */
  enter() { this.resize(); this.paintChips(); this.reset(true); }
  exit()  { this.engine.abort(); this.rejectPending(); }

  reset(showStart = false) {
    this.engine.abort(); this.rejectPending();
    this.engine = new Engine();
    this.running = false; this.camT = 0; this.finished = false;
    this.hideCaption();
    this.actionsEl.innerHTML = ''; this.hintEl.classList.add('hidden');
    this.startEl.classList.toggle('hidden', !showStart);
    this.setup();                       // dựng lại "diễn viên" của ví dụ hiện tại
  }

  replay() { this.reset(false); this.start(); }

  /** Đổi sang ví dụ khác rồi tự chạy luôn animation. */
  switchExample(i) {
    this.exIdx = i;
    this.paintChips();
    this.reset(false);
    this.start();
    this.canvas.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  paintChips() {
    $$('.example-chip', this.panel).forEach(ch =>
      ch.classList.toggle('active', +ch.dataset.ex === this.exIdx));
  }

  /* ---- kích thước & hệ tọa độ ảo ---- */
  resize() {
    const cssW = this.canvas.parentElement.clientWidth;
    /* Máy tính: không gian ảo 1000x620. Điện thoại: 680x860 (dọc). */
    this.M = cssW < 680 ? { vw: 680, vh: 860 } : { vw: 1000, vh: 620 };
    const cssH = cssW * this.M.vh / this.M.vw;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.dpr = dpr; this.cssW = cssW; this.cssH = cssH;
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
  }

  /* ---- vòng lặp ---- */
  update(dt) {
    this.engine.update(dt);
    for (const a of this.cards()) if (a.shake > 0) { a.shake -= dt; a.shakeT += dt; if (a.shake <= 0) a.shake = 0; }
  }

  /** Mọi Card của scene — kể cả nằm trong mảng (vd: this.members). */
  cards() {
    const out = [];
    for (const v of Object.values(this)) {
      if (v instanceof Card) out.push(v);
      else if (Array.isArray(v)) for (const c of v) if (c instanceof Card) out.push(c);
    }
    return out;
  }

  drawFrame() {
    const c = this.ctx;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, this.cssW, this.cssH);
    c.save();
    const k = this.cssW / this.M.vw;
    c.scale(k, k);
    if (this.camT > 0) {                // camera "zoom out" (scene kế thừa)
      const s = lerp(1, .84, this.camT);
      c.translate(this.M.vw / 2, this.M.vh / 2);
      c.scale(s, s);
      c.translate(-this.M.vw / 2, -this.M.vh / 2);
    }
    this.drawLinks(c);
    for (const a of this.cards()) a.draw(c);
    this.drawExtras(c);
    this.engine.drawParticles(c);
    c.restore();
  }
  drawLinks() {}
  drawExtras() {}

  /* ---- trợ giúp kịch bản (async) ---- */
  wait(ms) { return this.engine.wait(ms); }
  tw(t, p, d, e) { return this.engine.tween(t, p, d, e); }
  all(p) { return Promise.all(p); }

  showCaption(html, warn = false) {
    this.captionEl.innerHTML = html;
    this.captionEl.classList.add('show');
    this.captionEl.classList.toggle('warn', warn);
  }
  hideCaption() { this.captionEl.classList.remove('show', 'warn'); }

  async cap(html, hold = 1500, warn = false) {
    this.showCaption(html, warn);
    await this.wait(hold);
    this.hideCaption();
  }

  /** Chuỗi card xuất hiện kiểu "nảy" (pop-in). */
  popIn(cards, dur = 480) {
    for (const c of cards) { c.visible = true; c.alpha = 0; c.scale = 0; }
    return this.all(cards.map((c, i) =>
      this.wait(i * 130).then(() =>
        this.all([ this.tw(c, { alpha: 1 }, dur), this.tw(c, { scale: 1 }, dur + 120, 'outBack') ]))
    ));
  }

  /** Xóa một card: nổ thành hạt. */
  destroy(card) {
    this.engine.burst(card.x, card.y, card.w, card.h, card.color, 32);
    card.visible = false;
  }

  /** Hai pha glow để nhấn mạnh card. */
  async flash(card, times = 2) {
    for (let i = 0; i < times; i++) {
      await this.tw(card, { glow: 1 }, 320);
      await this.tw(card, { glow: 0 }, 320);
    }
  }

  /* ---- Dãy nút hành động trên sân khấu ---- */
  actions(list) {
    return new Promise((resolve, reject) => {
      this.actionsEl.innerHTML = '';
      this._pendingAction = reject;
      for (const a of list) {
        const b = document.createElement('button');
        b.className = 'btn '
          + (a.kind === 'danger' ? 'btn-danger ' : a.kind === 'primary' ? 'btn-primary ' : '')
          + (a.pulse ? 'pulse' : '');
        b.innerHTML = a.label;
        b.addEventListener('click', () => {
          this.actionsEl.innerHTML = '';
          this._pendingAction = null;
          resolve(a.id);
        });
        this.actionsEl.appendChild(b);
      }
    });
  }

  /** Cổng "Tiếp tục" ngăn giữa câu chuyện và phần mô phỏng xóa object. */
  continueGate() {
    return this.actions([{
      id: 'go', kind: 'primary', pulse: true,
      label: 'Tiếp tục: thử XÓA object ' + fa('fa-arrow-right'),
    }]);
  }

  rejectPending() {
    if (this._pendingAction) { this._pendingAction(abortErr()); this._pendingAction = null; }
  }

  showHint(html) {
    this.hintEl.innerHTML = html;
    this.hintEl.classList.remove('hidden');
    this.hintEl.onclick = () => $('.explain', this.panel).scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /** Nút replay nhỏ xuất hiện sau khi xong (không chặn luồng). */
  showReplayChip() {
    this.actionsEl.innerHTML = '';
    const b = document.createElement('button');
    b.className = 'btn';
    b.innerHTML = fa('fa-rotate-left') + ' Xem lại ví dụ này';
    b.addEventListener('click', () => this.replay());
    this.actionsEl.appendChild(b);
  }

  /* ---- chạy kịch bản ---- */
  async start() {
    if (this.running || this.finished) return;
    this.running = true;
    this.startEl.classList.add('hidden');
    try { await this.script(); }
    catch (e) { if (!e.aborted) console.error(e); }
    this.running = false;
  }

  finish() {
    this.finished = true;
    UI.markDone(this.def.index);
    this.revealExplain();
    this.showHint(fa('fa-arrow-down') + ' Giải thích + mẹo ghi nhớ ở bên dưới');
    this.showReplayChip();
  }

  revealExplain() {
    if (this.explained) return;
    this.explained = true;
    const items = [...$$('.bullets li', this.panel), $('.tip-card', this.panel)];
    items.forEach((el, i) => setTimeout(() => el.classList.add('show'), 260 * i + 150));
  }

  setup() {}
  async script() {}
}


/* ================== 4. SÁU SCENE (mỗi scene nhiều ví dụ) ================== */

/* ---------- 4.1 ASSOCIATION (Liên kết): hai bên "biết nhau", độc lập ---------- */
class AssociationScene extends Scene {
  setup() {
    const { vw, vh } = this.M, e = this.E;
    this.a = new Card({ x: vw * .26, y: vh * .52, w: 230, h: 126,
      color: e.a.color, ico: e.a.ico, title: e.a.name, sub: e.a.sub });
    this.b = new Card({ x: vw * .74, y: vh * .52, w: 230, h: 126,
      color: e.b.color, ico: e.b.ico, title: e.b.name, sub: e.b.sub });
    this.link = { p: 0 };
  }
  drawLinks(c) {
    connector(c, this.a.x + 118, this.a.y, this.b.x - 118, this.b.y,
      { progress: this.link.p, color: this.E.a.color, width: 3, label: 'biết nhau' });
  }
  async script() {
    const e = this.E;
    await this.popIn([this.a, this.b]);
    await this.cap(`Hai đối tượng độc lập xuất hiện: <b>${e.a.name}</b> và <b>${e.b.name}</b>.`, 1400);
    await this.tw(this.link, { p: 1 }, 650, 'inOutCubic');
    await this.cap('Một đường nối xuất hiện.', 1000);
    await this.all([this.flash(this.a), this.flash(this.b)]);
    await this.cap(`<b>${e.a.name}</b> biết <b>${e.b.name}</b> — và ${e.b.name} cũng biết ${e.a.name}.`, 1800);
    await this.cap('Không ai sở hữu ai. Cả hai sống hoàn toàn độc lập.', 1600);

    await this.continueGate();

    /* --- MÔ PHỎNG VÒNG ĐỜI: xóa từng phía và quan sát --- */
    await this.actions([{ id: 'del', kind: 'danger', label: fa('fa-trash-can') + ` Xóa ${e.a.name}` }]);
    await this.tw(this.link, { p: 0 }, 400);
    this.destroy(this.a);
    await this.cap(`<b>${e.b.name} vẫn tồn tại.</b>`, 1800);
    await this.actions([{ id: 'reset', kind: 'primary', label: fa('fa-rotate-left') + ' Đặt lại' }]);
    await this.popIn([this.a]);
    await this.tw(this.link, { p: 1 }, 550);

    await this.actions([{ id: 'del2', kind: 'danger', label: fa('fa-trash-can') + ` Xóa ${e.b.name}` }]);
    await this.tw(this.link, { p: 0 }, 400);
    this.destroy(this.b);
    await this.cap(`<b>${e.a.name} vẫn tồn tại.</b>`, 1700);
    await this.cap('Một đối tượng mất đi <b>không ảnh hưởng</b> đối tượng còn lại.<br>Đó là <b>Liên kết (Association)</b>.', 2200);
    this.finish();
  }
}

/* ---------- 4.2 DEPENDENCY (Phụ thuộc): chỉ "dùng tạm" ---------- */
class DependencyScene extends Scene {
  setup() {
    const { vw, vh } = this.M, e = this.E;
    this.tool = new Card({ x: vw * .5, y: vh * .6, w: 250, h: 145,
      color: e.tool.color, ico: e.tool.ico, title: e.tool.name, sub: e.tool.sub });
    this.item = new Card({ x: -vw * .25, y: vh * .6, w: 210, h: 118,
      color: e.item.color, ico: e.item.ico, title: e.item.name, sub: e.item.sub });
    this.rest = { x: vw * .8, y: vh * .6 };
    this.use = { p: 0, a: 1 };
    this.doing = { p: 0 };
  }
  drawLinks(c) {
    connector(c, this.tool.x, this.tool.y - 74, this.item.x, this.item.y + 60,
      { progress: this.use.p, color: '#D97706', dash: true, label: '«use»', alpha: this.use.a });
  }
  drawExtras(c) {
    drawBadge(c, this.tool.x, this.tool.y - 118, this.E.doing,
      { color: '#D97706', alpha: this.doing.p, scale: lerp(.6, 1, this.doing.p) });
  }
  async script() {
    const e = this.E;
    await this.popIn([this.tool]);
    await this.cap(e.story, 1100);
    await this.all([
      this.tw(this.item, { x: this.tool.x, y: this.M.vh * .2 }, 900, 'inOutCubic'),
      this.tw(this.item, { alpha: 1, scale: 1 }, 500),
    ]);
    await this.tw(this.use, { p: 1 }, 500);
    await this.tw(this.doing, { p: 1 }, 300);
    await this.flash(this.tool, 2);
    await this.cap(`<b>${e.tool.name}</b> sử dụng <b>${e.item.name}</b> trong chốc lát.`, 1700);
    await this.tw(this.doing, { p: 0 }, 300);
    await this.all([
      this.tw(this.use, { p: 0 }, 450),
      this.tw(this.item, { x: this.rest.x, y: this.rest.y }, 900, 'inOutCubic'),
    ]);
    await this.cap(`Xong việc, ${e.item.name} rờii đi — <b>${e.tool.name} không giữ ${e.item.name}.</b>`, 1800);

    await this.continueGate();

    /* --- MÔ PHỎNG VÒNG ĐỜI --- */
    await this.actions([{ id: 'del', kind: 'danger', label: fa('fa-trash-can') + ` Xóa ${e.item.name}` }]);
    this.destroy(this.item);
    await this.flash(this.tool, 1);
    await this.cap(`<b>${e.tool.name} vẫn bình thường</b> — nó chỉ <b>mượn</b> ${e.item.name} lúc làm việc.`, 1900);
    await this.actions([{ id: 'reset', kind: 'primary', label: fa('fa-rotate-left') + ' Đặt lại' }]);
    this.item.x = this.rest.x; this.item.y = this.rest.y;
    await this.popIn([this.item]);
    await this.actions([{ id: 'del2', kind: 'danger', label: fa('fa-trash-can') + ` Xóa ${e.tool.name}` }]);
    this.destroy(this.tool);
    await this.cap(`<b>${e.item.name} vẫn tồn tại.</b> Quan hệ chỉ là <b>"dùng tạm"</b>.`, 2000);
    await this.cap('Đó là <b>Phụ thuộc (Dependency)</b> — mối quan hệ <b>lỏng lẻo nhất</b>.', 1800);
    this.finish();
  }
}

/* ---------- 4.3 AGGREGATION (Kết tập): nhóm lỏng lẻo, phần tử độc lập ---------- */
class AggregationScene extends Scene {
  setup() {
    const { vw, vh } = this.M, e = this.E;
    this.owner = new Card({ x: vw * .3, y: vh * .5, w: 260, h: 210,
      color: e.owner.color, ico: e.owner.ico, title: e.owner.name, sub: e.owner.sub });
    this.members = [0, 1, 2].map(i => new Card({
      x: vw * .72, y: vh * (.24 + i * .26), w: 210, h: 104, color: e.memberColor,
      ico: e.memberIcos[i], title: e.base + ' ' + 'ABC'[i], sub: e.memberSub,
    }));
    this.links = [0, 0, 0];
    this.owner2 = null;
  }
  edge(card, side) {
    return side === 'r' ? { x: card.x + card.w / 2, y: card.y } : { x: card.x - card.w / 2, y: card.y };
  }
  drawLinks(c) {
    const owner = this.owner2 && this.owner2.visible ? this.owner2 : this.owner;
    if (!owner || !owner.visible) return;
    this.members.forEach((t, i) => {
      if (!t.visible || this.links[i] <= 0) return;
      const s = this.edge(owner, 'r'), p = this.edge(t, 'l');
      connector(c, s.x, s.y, p.x, p.y, {
        progress: this.links[i], color: this.E.owner.color, width: 2.6,
        startMark: 'dia-h', label: this.links[i] >= 1 && i === 1 ? 'nhóm (không sở hữu)' : '',
      });
    });
  }
  async script() {
    const e = this.E;
    await this.popIn([this.owner]);
    await this.popIn(this.members);
    await this.cap(`Xuất hiện <b>${e.owner.name}</b> và ba <b>${e.base}</b>.`, 1300);
    for (let i = 0; i < 3; i++) await this.tw(this.links, { [i]: 1 }, 500);
    await this.cap(`${e.owner.name} <b>nhóm</b> các ${e.base} lại — ký hiệu hình thoi rỗng ◇.`, 1800);
    await this.cap(`Nhưng ${e.owner.name} <b>không quyết định "sống–chết"</b> của chúng.`, 1600);

    await this.continueGate();

    /* --- MÔ PHỎNG VÒNG ĐỜI --- */
    await this.actions([{ id: 'del', kind: 'danger', label: fa('fa-trash-can') + ` Xóa ${e.owner.name}` }]);
    await this.all(this.links.map((_, i) => this.tw(this.links, { [i]: 0 }, 350)));
    this.destroy(this.owner);
    for (const t of this.members) { t.shake = .7; }
    await this.cap(`${e.owner.name} biến mất… <b>các ${e.base} vẫn ở yên.</b>`, 1900);
    this.owner2 = new Card({ x: this.owner.x, y: this.owner.y, w: 260, h: 210,
      color: e.owner2.color, ico: e.owner2.ico, title: e.owner2.name, sub: e.owner2.sub });
    await this.popIn([this.owner2]);
    await this.all(this.members.map((t, i) => this.all([
      this.tw(t, { x: t.x - this.M.vw * .1 }, 800, 'inOutCubic'),
      this.tw(this.links, { [i]: 1 }, 800),
    ])));
    await this.cap(e.moved, 2100);
    await this.cap('Phần tử <b>sống độc lập</b> với tổng thể → <b>Kết tập (Aggregation)</b>.', 1900);
    this.finish();
  }
}

/* ---------- 4.4 COMPOSITION (Hợp thành): bộ phận chết cùng tổng thể ---------- */
class CompositionScene extends Scene {
  setup() {
    const { vw, vh } = this.M, e = this.E;
    this.whole = new Card({ x: vw * .5, y: vh * .52, w: 330, h: 260,
      color: e.whole.color, ico: e.whole.ico, title: e.whole.name, sub: e.whole.sub });
    this.part = new Card({ x: vw * .5, y: vh * .52 + 66, w: 240, h: 96,
      color: e.part.color, ico: e.part.ico, title: e.part.name, sub: e.part.sub });
    this.link = { p: 0 };
  }
  drawLinks(c) {
    if (!this.whole.visible || !this.part.visible) return;
    const y1 = this.whole.y - this.whole.h / 2 + 74;
    const y2 = this.part.y - this.part.h / 2;
    connector(c, this.whole.x, y1, this.whole.x, y2,
      { progress: this.link.p, color: this.E.whole.color, width: 3, startMark: 'dia-f', label: 'sở hữu' });
  }
  async script() {
    const e = this.E;
    await this.popIn([this.whole]);
    await this.cap(`Một <b>${e.whole.name}</b> xuất hiện.`, 1000);
    await this.popIn([this.part]);
    await this.tw(this.link, { p: 1 }, 500);
    await this.cap(`${e.whole.name} <b>sở hữu</b> ${e.part.name} — ký hiệu hình thoi đặc ◆.`, 1900);
    await this.all([this.flash(this.whole), this.flash(this.part)]);
    await this.cap(`${e.part.name} là <b>một phần không thể tách rờii</b> của ${e.whole.name}.`, 1800);

    await this.continueGate();

    /* --- MÔ PHỎNG VÒNG ĐỜI: chết cùng nhau, chạy chậm --- */
    await this.actions([{ id: 'del', kind: 'danger', label: fa('fa-trash-can') + ` Xóa ${e.whole.name}` }]);
    await this.tw(this.whole, { alpha: .55 }, 900);
    this.part.shake = 1.4;
    await this.wait(900);
    this.destroy(this.whole);
    this.destroy(this.part);
    await this.cap('<b>Sống cùng — chết cùng.</b>', 1700);
    await this.cap(`<b>${e.part.name} không thể tồn tại nếu ${e.whole.name} không còn.</b><br>Đó là <b>Hợp thành (Composition)</b>.`, 2200);
    await this.actions([{ id: 'reset', kind: 'primary', label: fa('fa-rotate-left') + ' Đặt lại' }]);
    this.setup(); this.link.p = 1;
    this.finish();
  }
}

/* ---------- 4.5 INHERITANCE (Kế thừa): cây is-a, thuộc tính chảy xuống ---------- */
class InheritanceScene extends Scene {
  setup() {
    const { vw, vh } = this.M, e = this.E;
    const [r1, r2] = e.parent.rows;
    this.parent = new Card({ x: vw * .5, y: vh * .16, w: 250, h: 138, color: e.parent.color,
      ico: e.parent.ico, title: e.parent.name, sub: 'lớp cha',
      rows: [{ t: r1, hl: 0 }, { t: r2, hl: 0 }] });
    this.child = new Card({ x: vw * .5, y: vh * .55, w: 280, h: 192, color: e.color,
      ico: e.child.ico, title: e.child.name, sub: 'lớp con',
      rows: [{ t: r1, inh: true, hl: 0 }, { t: r2, inh: true, hl: 0 }, { t: e.child.new, hl: 0 }] });
    this.grand = new Card({ x: vw * .5, y: vh * .89, w: 250, h: 108, color: e.color2,
      ico: e.grand.ico, title: e.grand.name, sub: 'lớp cháu',
      rows: [{ t: e.grand.new, inh: true, hl: 0 }] });
    this.a1 = { p: 0 }; this.a2 = { p: 0 };
  }
  drawLinks(c) {
    connector(c, this.child.x, this.child.y - this.child.h / 2,
      this.parent.x, this.parent.y + this.parent.h / 2,
      { progress: this.a1.p, color: this.E.color, width: 3, endMark: 'tri', mark: 22, label: 'kế thừa', labelDy: 26 });
    connector(c, this.grand.x, this.grand.y - this.grand.h / 2,
      this.child.x, this.child.y + this.child.h / 2,
      { progress: this.a2.p, color: this.E.color, width: 3, endMark: 'tri', mark: 22 });
  }
  async script() {
    const e = this.E, [r1, r2] = e.parent.rows;
    await this.popIn([this.parent]);
    await this.cap(`${e.parent.name} có <b>${r1}</b> và <b>${r2}</b>.`, 1200);
    await this.popIn([this.child]);
    await this.tw(this.a1, { p: 1 }, 600, 'inOutCubic');
    await this.cap(`${e.child.name} <b>kế thừa (extends)</b> ${e.parent.name}.`, 1500);
    for (const row of this.child.rows.slice(0, 2)) await this.tw(row, { hl: 1 }, 450);
    await this.cap(`${e.child.name} nhận nguyên vẹn <b>${r1}</b>, <b>${r2}</b> — và tự thêm <b>${e.child.new}</b>.`, 1900);
    await this.popIn([this.grand]);
    await this.tw(this.a2, { p: 1 }, 600, 'inOutCubic');
    await this.tw(this.grand.rows[0], { hl: 1 }, 400);
    await this.cap(`${e.grand.name} lại kế thừa ${e.child.name}…`, 1300);
    await this.tw(this, { camT: 1 }, 900, 'inOutCubic');
    await this.cap('Một <b>cây kế thừa</b>: mọi thứ chảy từ trên xuống dưới.', 1800);

    await this.continueGate();

    /* --- MÔ PHỎNG VÒNG ĐỜI --- */
    await this.actions([{ id: 'del', kind: 'danger', label: fa('fa-trash-can') + ` Xóa ${e.child.name}` }]);
    await this.all([this.tw(this.a1, { p: 0 }, 350), this.tw(this.a2, { p: 0 }, 350)]);
    this.destroy(this.child);
    await this.cap(`<b>${e.parent.name} vẫn tồn tại.</b> Kế thừa <b>không phải sở hữu.</b>`, 1900);
    await this.actions([{ id: 'reset', kind: 'primary', label: fa('fa-rotate-left') + ' Đặt lại' }]);
    this.child.visible = true; this.child.alpha = 0; this.child.scale = 0;
    await this.popIn([this.child]);
    await this.all([this.tw(this.a1, { p: 1 }, 500), this.tw(this.a2, { p: 1 }, 500)]);
    await this.actions([{ id: 'delP', kind: 'danger', label: fa('fa-trash-can') + ` Xóa ${e.parent.name} (thử xem!)` }]);
    this.parent.shake = 2.6; await this.tw(this.parent, { glow: 1 }, 300);
    await this.cap(`${fa('fa-triangle-exclamation')} <b>${e.parent.name} là lớp cha</b> — xóa lớp cha <b>không</b> tự động xóa lớp con.<br>Đây chỉ là quan hệ "is-a" trong bản thiết kế.`, 2600, true);
    await this.tw(this.parent, { glow: 0 }, 300);
    await this.cap('<b>Inheritance ≠ Composition.</b> Kế thừa không có nghĩa "sở hữu vòng đờii".', 2000);
    this.finish();
  }
}

/* ---------- 4.6 REALIZATION (Hiện thực hóa): cùng contract, khác cách làm ---------- */
class RealizationScene extends Scene {
  setup() {
    const { vw, vh } = this.M, e = this.E;
    this.iface = new Card({ x: vw * .5, y: vh * .17, w: 270, h: 122, color: e.color,
      ico: e.iface.ico, title: e.iface.name, sub: 'giao diện · contract', tag: '«interface»',
      rows: [{ t: e.method, hl: 0 }] });
    this.i1 = new Card({ x: vw * .26, y: vh * .64, w: 258, h: 132, color: e.color1,
      ico: e.i1.ico, title: e.i1.name, sub: e.method + ': ' + e.i1.how });
    this.i2 = new Card({ x: vw * .74, y: vh * .64, w: 258, h: 132, color: e.color2,
      ico: e.i2.ico, title: e.i2.name, sub: e.method + ': ' + e.i2.how });
    this.a1 = { p: 0 }; this.a2 = { p: 0 };
    this.bg1 = { p: 0, text: '', color: '#D97706' };
    this.bg2 = { p: 0, text: '', color: '#D97706' };
  }
  drawLinks(c) {
    connector(c, this.i1.x, this.i1.y - this.i1.h / 2, this.iface.x - 70, this.iface.y + this.iface.h / 2,
      { progress: this.a1.p, color: this.E.color, dash: true, endMark: 'tri', mark: 20, label: '«implements»' });
    connector(c, this.i2.x, this.i2.y - this.i2.h / 2, this.iface.x + 70, this.iface.y + this.iface.h / 2,
      { progress: this.a2.p, color: this.E.color, dash: true, endMark: 'tri', mark: 20, label: '«implements»' });
  }
  drawExtras(c) {
    drawBadge(c, this.i1.x, this.i1.y - 112, this.bg1.text,
      { color: this.bg1.color, alpha: this.bg1.p, scale: lerp(.6, 1, this.bg1.p) });
    drawBadge(c, this.i2.x, this.i2.y - 112, this.bg2.text,
      { color: this.bg2.color, alpha: this.bg2.p, scale: lerp(.6, 1, this.bg2.p) });
  }
  /** Chạy animation thực thi method: ⏳ theo cách riêng → ✓ */
  async runMethod(card, badge, via) {
    badge.text = this.E.method + ' ' + via; badge.color = '#D97706';
    await this.tw(badge, { p: 1 }, 320, 'outBack');
    await this.flash(card, 1);
    badge.text = this.E.method + ' ✓'; badge.color = '#16A34A';
    await this.wait(650);
  }
  async script() {
    const e = this.E;
    await this.popIn([this.iface]);
    await this.cap(`Một interface: <b>${e.iface.name}</b> — chỉ ghi cam kết <b>${e.method}</b>.`, 1800);
    await this.popIn([this.i1, this.i2]);
    await this.tw(this.a1, { p: 1 }, 600, 'inOutCubic');
    await this.tw(this.a2, { p: 1 }, 600, 'inOutCubic');
    await this.cap(`${e.i1.name} và ${e.i2.name} cùng <b>hiện thực (implements)</b> ${e.iface.name}.`, 1900);
    await this.runMethod(this.i1, this.bg1, e.i1.via);
    await this.tw(this.bg1, { p: 0 }, 300);
    await this.runMethod(this.i2, this.bg2, e.i2.via);
    await this.tw(this.bg2, { p: 0 }, 300);
    await this.cap('Cùng thực hiện một giao diện — <b>nhưng cách làm có thể khác nhau</b>.', 2000);

    await this.continueGate();

    /* --- MÔ PHỎNG VÒNG ĐỜI --- */
    await this.actions([{ id: 'del', kind: 'danger', label: fa('fa-trash-can') + ` Xóa ${e.i1.name}` }]);
    await this.tw(this.a1, { p: 0 }, 350);
    this.destroy(this.i1);
    await this.runMethod(this.i2, this.bg2, e.i2.via);
    await this.tw(this.bg2, { p: 0 }, 350);
    await this.cap(`<b>${e.i2.name} vẫn ${e.method} bình thường</b> — Interface vẫn tồn tại.`, 1900);
    await this.actions([{ id: 'reset', kind: 'primary', label: fa('fa-rotate-left') + ' Đặt lại' }]);
    this.i1.visible = true; this.i1.alpha = 0; this.i1.scale = 0;
    await this.popIn([this.i1]);
    await this.tw(this.a1, { p: 1 }, 500);
    await this.actions([{ id: 'delI', kind: 'danger', label: fa('fa-trash-can') + ` Xóa ${e.iface.name}` }]);
    await this.all([this.tw(this.a1, { p: 0 }, 350), this.tw(this.a2, { p: 0 }, 350)]);
    this.destroy(this.iface);
    await this.cap('Interface chỉ là <b>bản thiết kế (contract)</b> —<br>nó <b>không sở hữu</b> các object hiện thực nó.', 2200);
    this.finish();
  }
}


/* ================== 5. METADATA NỘI DUNG SƯ PHẠM ================== */
/* Mỗi scene: tiêu đề, câu hỏi lớn, NHIỀU VÍ DỤ, bullets, mẹo nhớ, màu chủ đạo.
   Icon trên canvas dùng glyph ICO.* ; icon trong DOM dùng class fa-*.        */
const SCENE_DEFS = [
  {
    cls: AssociationScene, icon: 'fa-handshake', color: '#3B82F6', coupling: 2,
    vi: 'LIÊN KẾT', en: 'Association',
    question: '“Hai đối tượng <b>biết nhau</b> — có ai sở hữu ai không?”',
    qsub: 'Xem câu chuyện, rồi bấm <b>Tiếp tục</b> để tự tay XÓA object và quan sát.',
    examples: [
      { label: 'Teacher & Course',
        a: { name: 'Teacher',  sub: 'class · giảng viên', ico: ICO.teacher,   color: '#3B82F6' },
        b: { name: 'Course',   sub: 'class · môn học',    ico: ICO.bookOpen,  color: '#2563EB' } },
      { label: 'Doctor & Patient',
        a: { name: 'Doctor',   sub: 'class · bác sĩ',     ico: ICO.doctor,    color: '#0EA5E9' },
        b: { name: 'Patient',  sub: 'class · bệnh nhân',  ico: ICO.patient,   color: '#0284C7' } },
      { label: 'Customer & Order',
        a: { name: 'Customer', sub: 'class · khách hàng', ico: ICO.customer,  color: '#0891B2' },
        b: { name: 'Order',    sub: 'class · đơn hàng',   ico: ICO.boxOpen,   color: '#0E7490' } },
    ],
    bullets: [
      ['fa-key', 'Keyword', '<b>“biết” (knows)</b> — liên hệ lâu dài giữa hai đối tượng ngang hàng.'],
      ['fa-circle-question', 'Câu hỏi nhận biết', '<b>A có “biết” B như một ngườii quen?</b>'],
      ['fa-lightbulb', 'Khi nào dùng?', 'Teacher dạy Course, Doctor khám Patient, Customer đặt Order… hai bên độc lập nhưng có giao tiếp.'],
      ['fa-triangle-exclamation', 'Sai lầm thường gặp', 'Nghĩ rằng một bên “sở hữu” bên kia — Association <b>không có chủ</b>.'],
      ['fa-pen-ruler', 'Ký hiệu UML', 'Đường liền (solid line), có thể thêm mũi tên chỉ chiều đi.'],
    ],
    tip: 'Hai ngườii <b>quen nhau</b>. Không ai sở hữu ai. Một ngườii đi xa — ngườii kia vẫn sống bình thường.',
  },
  {
    cls: DependencyScene, icon: 'fa-plug', color: '#F59E0B', coupling: 1,
    vi: 'PHỤ THUỘC', en: 'Dependency',
    question: '“Đối tượng này có <b>giữ</b> đối tượng kia mãi mãi không?”',
    qsub: 'Dùng xong rồi sao? Xem câu chuyện rồi bấm <b>Tiếp tục</b> để thử XÓA.',
    examples: [
      { label: 'Printer & Report', doing: 'đang in…', story: 'Printer nhận một yêu cầu in…',
        tool: { name: 'Printer',   sub: 'class · máy in',     ico: ICO.print,     color: '#F59E0B' },
        item: { name: 'Report',    sub: 'class · báo cáo',    ico: ICO.fileLines, color: '#64748B' } },
      { label: 'Compiler & SourceCode', doing: 'đang dịch…', story: 'Compiler nhận mã nguồn để biên dịch…',
        tool: { name: 'Compiler',  sub: 'class · trình dịch', ico: ICO.gears,     color: '#D97706' },
        item: { name: 'SourceCode',sub: 'class · mã nguồn',   ico: ICO.fileCode,  color: '#64748B' } },
      { label: 'ATM & BankCard', doing: 'đang đọc thẻ…', story: 'ATM nhận thẻ để xác thực…',
        tool: { name: 'ATM',       sub: 'class · máy rút tiền', ico: ICO.cashReg,    color: '#B45309' },
        item: { name: 'BankCard',  sub: 'class · thẻ ngân hàng', ico: ICO.creditCard, color: '#64748B' } },
    ],
    bullets: [
      ['fa-key', 'Keyword', '<b>“dùng tạm” (uses)</b> — B chỉ xuất hiện như <b>tham số (parameter)</b> hoặc biến cục bộ của A.'],
      ['fa-circle-question', 'Câu hỏi nhận biết', '<b>A chỉ cần B trong một hành động rồi thôi?</b>'],
      ['fa-lightbulb', 'Khi nào dùng?', '<code>printer.print(report)</code>, <code>compiler.compile(source)</code>, <code>atm.verify(card)</code> — xong việc là hết.'],
      ['fa-triangle-exclamation', 'Sai lầm thường gặp', 'Lưu B thành <b>thuộc tính (attribute)</b> của A — khi đó là Association, không còn là Dependency.'],
      ['fa-pen-ruler', 'Ký hiệu UML', 'Mũi tên nét đứt (dashed arrow) kèm chữ «use».'],
    ],
    tip: 'Giống <b>mượn bút</b>. Dùng xong trả. Không giữ.',
  },
  {
    cls: AggregationScene, icon: 'fa-people-group', color: '#10B981', coupling: 3,
    vi: 'KẾT TẬP', en: 'Aggregation',
    question: '“Nếu <b>xóa tổng thể</b>, các phần tử có biến mất không?”',
    qsub: 'Xem câu chuyện rồi bấm <b>Tiếp tục</b> để tự tay xóa và kiểm chứng.',
    examples: [
      { label: 'Faculty & Teachers', base: 'Teacher', memberSub: 'giảng viên', memberColor: '#0D9488',
        memberIcos: [ICO.teacher, ICO.teacher, ICO.teacherTie],
        owner:  { name: 'Faculty',   sub: 'khoa',        ico: ICO.building, color: '#10B981' },
        owner2: { name: 'Faculty 2', sub: 'khoa khác',   ico: ICO.school,   color: '#059669' },
        moved: 'Các Teacher sang <b>Khoa khác</b> làm việc bình thường — hoàn toàn độc lập.' },
      { label: 'Team & Players', base: 'Player', memberSub: 'cầu thủ', memberColor: '#0F766E',
        memberIcos: [ICO.user, ICO.user, ICO.user],
        owner:  { name: 'Team',   sub: 'đội bóng',    ico: ICO.users, color: '#14B8A6' },
        owner2: { name: 'Team 2', sub: 'đội khác',    ico: ICO.users, color: '#0D9488' },
        moved: 'Các cầu thủ sang <b>đội khác</b> thi đấu bình thường — đội tan, ngườii còn.' },
      { label: 'Library & Books', base: 'Book', memberSub: 'sách', memberColor: '#047857',
        memberIcos: [ICO.book, ICO.book, ICO.bookOpen],
        owner:  { name: 'Library',   sub: 'thư viện',      ico: ICO.landmark, color: '#059669' },
        owner2: { name: 'Library 2', sub: 'thư viện mới',  ico: ICO.landmark, color: '#10B981' },
        moved: 'Sách được chuyển sang <b>thư viện mới</b> — vòng đờii sách không phụ thuộc thư viện.' },
    ],
    bullets: [
      ['fa-key', 'Keyword', '<b>“có” (has-a) lỏng lẻo</b> — A nhóm các B, nhưng B có <b>vòng đờii riêng</b>.'],
      ['fa-circle-question', 'Câu hỏi nhận biết', '<b>B còn tồn tại khi A biến mất không?</b> Có → Aggregation.'],
      ['fa-lightbulb', 'Khi nào dùng?', 'Khoa – Giảng viên, Đội – Cầu thủ, Thư viện – Sách.'],
      ['fa-triangle-exclamation', 'Sai lầm thường gặp', 'Trông rất giống Composition — điểm khác nằm ở <b>vòng đờii của phần tử</b>: độc lập hay gắn chết.'],
      ['fa-pen-ruler', 'Ký hiệu UML', 'Hình thoi rỗng (hollow diamond) ◇— đặt ở phía “tổng thể”.'],
    ],
    tip: 'Nếu công ty <b>phá sản</b>, nhân viên vẫn <b>đi xin việc nơi khác</b>. ⇒ Aggregation.',
  },
  {
    cls: CompositionScene, icon: 'fa-cubes', color: '#EF4444', coupling: 5,
    vi: 'HỢP THÀNH', en: 'Composition',
    question: '“Cái này có thực sự <b>sở hữu vòng đờii</b> cái kia không?”',
    qsub: '“Sở hữu” ở đây nghĩa là gì? Xem câu chuyện rồi bấm <b>Tiếp tục</b>.',
    examples: [
      { label: 'Course & Syllabus',
        whole: { name: 'Course',   sub: 'môn học · tổng thể',   ico: ICO.bookOpen, color: '#EF4444' },
        part:  { name: 'Syllabus', sub: 'đề cương · bộ phận',   ico: ICO.fileSign, color: '#B91C1C' } },
      { label: 'House & Room',
        whole: { name: 'House',    sub: 'ngôi nhà · tổng thể',  ico: ICO.house,    color: '#DC2626' },
        part:  { name: 'Room',     sub: 'căn phòng · bộ phận',  ico: ICO.doorOpen, color: '#991B1B' } },
      { label: 'Order & OrderLine',
        whole: { name: 'Order',    sub: 'đơn hàng · tổng thể',  ico: ICO.invoice,  color: '#E11D48' },
        part:  { name: 'OrderLine',sub: 'dòng chi tiết · bộ phận', ico: ICO.listUl, color: '#9F1239' } },
    ],
    bullets: [
      ['fa-key', 'Keyword', '<b>“sở hữu” (owns)</b> — phần (part) <b>gắn chết vòng đờii</b> với tổng thể (whole).'],
      ['fa-circle-question', 'Câu hỏi nhận biết', '<b>B có mất ý nghĩa khi A biến mất?</b> Có → Composition.'],
      ['fa-lightbulb', 'Khi nào dùng?', 'Course – Syllabus, Nhà – Phòng, Đơn hàng – Dòng chi tiết hóa đơn.'],
      ['fa-triangle-exclamation', 'Sai lầm thường gặp', 'Xem mọi “has-a” đều là Composition — hãy kiểm tra: phần đó <b>tồn tại riêng được không</b>?'],
      ['fa-pen-ruler', 'Ký hiệu UML', 'Hình thoi đặc (filled diamond) ◆— đặt ở phía “tổng thể”.'],
    ],
    tip: 'Nếu <b>phá nhà</b> thì <b>phòng</b> còn không? <b>Không.</b> ⇒ Composition (“sống cùng – chết cùng”).',
  },
  {
    cls: InheritanceScene, icon: 'fa-dna', color: '#8B5CF6', coupling: 4,
    vi: 'KẾ THỪA', en: 'Inheritance',
    question: '“Đối tượng này có <b>phải là một</b> đối tượng kia không?”',
    qsub: 'Đọc thành câu “A LÀ B” trong đầu — rồi xem câu chuyện.',
    examples: [
      { label: 'Person → Teacher', color: '#7C3AED', color2: '#6D28D9',
        parent: { name: 'Person', ico: ICO.user, rows: ['name', 'age'], color: '#8B5CF6' },
        child:  { name: 'Teacher',    ico: ICO.teacher,    new: 'salary' },
        grand:  { name: 'Assistant',  ico: ICO.teacherTie, new: 'hỗ trợ giờ thực hành' } },
      { label: 'Animal → Dog', color: '#8B5CF6', color2: '#7C3AED',
        parent: { name: 'Animal', ico: ICO.paw, rows: ['name', 'age'], color: '#8B5CF6' },
        child:  { name: 'Dog',      ico: ICO.dog, new: 'breed' },
        grand:  { name: 'Puppy',    ico: ICO.paw, new: 'cần bú mẹ' } },
      { label: 'Vehicle → Car', color: '#6D28D9', color2: '#5B21B6',
        parent: { name: 'Vehicle', ico: ICO.truck, rows: ['brand', 'speed'], color: '#8B5CF6' },
        child:  { name: 'Car',         ico: ICO.car,      new: 'seat' },
        grand:  { name: 'ElectricCar', ico: ICO.charging, new: 'sạc pin' } },
    ],
    bullets: [
      ['fa-key', 'Keyword', '<b>“là một” (is-a)</b> — lớp con (subclass) thừa hưởng lớp cha (superclass).'],
      ['fa-circle-question', 'Câu hỏi nhận biết', '<b>A có phải là một B?</b> Đọc xuôi tai → rất có thể là kế thừa.'],
      ['fa-lightbulb', 'Khi nào dùng?', 'Có phân cấp tự nhiên và muốn <b>tái sử dụng</b> thuộc tính/hành vi chung: Person→Teacher, Animal→Dog, Vehicle→Car.'],
      ['fa-triangle-exclamation', 'Sai lầm thường gặp', 'Nhầm <b>is-a</b> với <b>has-a</b>; hoặc kế thừa chỉ để “xin lại code” (khi đó hãy cân nhắc Composition).'],
      ['fa-pen-ruler', 'Ký hiệu UML', 'Mũi tên rỗng (hollow triangle) ▷ chỉ về phía lớp cha.'],
    ],
    tip: 'Đọc thành câu: <b>Teacher LÀ Person.</b> Câu đọc xuôi tai → thường là kế thừa.',
  },
  {
    cls: RealizationScene, icon: 'fa-file-contract', color: '#DB2777', coupling: 2,
    vi: 'HIỆN THỰC HÓA', en: 'Realization',
    question: '“Nhiều lớp khác nhau — làm sao <b>cùng thực hiện</b> một cam kết?”',
    qsub: 'Cùng một cam kết, khác cách làm? Xem câu chuyện sẽ rõ.',
    examples: [
      { label: 'Loginable', method: 'login()', color: '#DB2777', color1: '#BE185D', color2: '#9D174D',
        iface: { name: 'Loginable', ico: ICO.key },
        i1: { name: 'Teacher', ico: ICO.teacher,  how: 'email + mật khẩu', via: 'qua email…' },
        i2: { name: 'Student', ico: ICO.graduate, how: 'SSO sinh viên',    via: 'qua SSO…' } },
      { label: 'Payable', method: 'pay()', color: '#E11D48', color1: '#BE123C', color2: '#9F1239',
        iface: { name: 'Payable', ico: ICO.wallet },
        i1: { name: 'CreditCard', ico: ICO.creditCard, how: 'quẹt thẻ POS', via: 'quẹt thẻ…' },
        i2: { name: 'MomoWallet', ico: ICO.qrcode,     how: 'quét mã QR',   via: 'quét QR…' } },
      { label: 'Flyable', method: 'fly()', color: '#C026D3', color1: '#A21CAF', color2: '#86198F',
        iface: { name: 'Flyable', ico: ICO.feather },
        i1: { name: 'Bird',  ico: ICO.dove,  how: 'đập cánh',         via: 'đập cánh…' },
        i2: { name: 'Plane', ico: ICO.plane, how: 'động cơ phản lực', via: 'bật động cơ…' } },
    ],
    bullets: [
      ['fa-key', 'Keyword', '<b>“hiện thực” (implements)</b> — lớp cam kết theo một <b>interface (contract)</b>.'],
      ['fa-circle-question', 'Câu hỏi nhận biết', '<b>A có hiện thực interface B?</b>'],
      ['fa-lightbulb', 'Khi nào dùng?', 'Nhiều lớp “khác loài” cùng cam kết một hành vi: Loginable, Payable, Flyable…'],
      ['fa-triangle-exclamation', 'Sai lầm thường gặp', 'Kỳ vọng nhận sẵn code như kế thừa — interface chỉ cho <b>cam kết</b>, cách làm do từng lớp tự viết.'],
      ['fa-pen-ruler', 'Ký hiệu UML', 'Nét đứt + mũi tên rỗng ⇢▷ kèm «implements».'],
    ],
    tip: 'Giống <b>bằng lái xe</b>. Ai có bằng đều phải biết lái — nhưng mỗi ngườii lái một kiểu.',
  },
];

/* ================== 6. CÂY QUYẾT ĐỊNH ================== */

const TREE = {
  q1: { text: 'A có phải là một B?', hint: 'đọc thành câu “A LÀ B” có xuôi tai không?', yes: { result: 'inheritance' }, no: 'q2' },
  q2: { text: 'A có hiện thực một interface B?', hint: 'A cam kết làm theo “bản thiết kế” B?', yes: { result: 'realization' }, no: 'q3' },
  q3: { text: 'B không thể tồn tại nếu thiếu A?', hint: 'phá A thì B có “chết” theo không?', yes: { result: 'composition' }, no: 'q4' },
  q4: { text: 'A chỉ dùng B trong chốc lát?', hint: 'B là tham số / biến tạm của A?', yes: { result: 'dependency' }, no: 'q5' },
  q5: { text: 'A nhóm nhiều B, nhưng B sống độc lập?', hint: 'A mất thì B vẫn sống bình thường?', yes: { result: 'aggregation' }, no: { result: 'association' } },
};
const RESULTS = {
  association: { i: 0, name: 'LIÊN KẾT',    en: 'Association',  ico: 'fa-handshake',      color: '#3B82F6', line: 'Hai đối tượng quen nhau, sống độc lập — không ai sở hữu ai.' },
  dependency:  { i: 1, name: 'PHỤ THUỘC',   en: 'Dependency',   ico: 'fa-plug',           color: '#F59E0B', line: 'Chỉ dùng tạm thờii — mượn xong là trả, không giữ lại.' },
  aggregation: { i: 2, name: 'KẾT TẬP',     en: 'Aggregation',  ico: 'fa-people-group',   color: '#10B981', line: 'A nhóm các B nhưng B sống độc lập — nhóm tan, phần tử vẫn ở lại.' },
  composition: { i: 3, name: 'HỢP THÀNH',   en: 'Composition',  ico: 'fa-cubes',          color: '#EF4444', line: 'A sở hữu B theo vòng đờii — sống cùng, chết cùng.' },
  inheritance: { i: 4, name: 'KẾ THỪA',     en: 'Inheritance',  ico: 'fa-dna',            color: '#8B5CF6', line: 'A là một B — thừa hưởng toàn bộ từ lớp cha.' },
  realization: { i: 5, name: 'HIỆN THỰC HÓA', en: 'Realization', ico: 'fa-file-contract',  color: '#DB2777', line: 'A cam kết theo một interface — cùng cam kết, khác cách làm.' },
};

class DecisionTree {
  constructor(root) {
    this.root = root;
    this.renderIntro();
  }
  renderIntro() {
    this.flow = null;
    this.root.innerHTML = `
      <div class="kicker"><span class="dot" style="background:#0EA5E9;box-shadow:0 0 0 4px rgba(14,165,233,.18)"></span> TỔNG KẾT · CHỌN ĐÚNG QUAN HỆ</div>
      <h1 style="font-size:clamp(1.9rem,4.4vw,3rem);font-weight:800">CÂY QUYẾT ĐỊNH <span style="color:var(--text-sub);font-size:.55em">(Decision Tree)</span></h1>
      <div class="big-question" style="border-left-color:#0EA5E9">“Quan hệ giữa A và B là loại nào trong 6 loại?”
        <small>Trả lờii tối đa 5 câu Có/Không — cùng lắm 30 giây là ra đáp án.</small>
      </div>
      <div class="tree-wrap"><div class="tree-intro">
        <div class="lead">${fa('fa-route')}</div>
        <p>Bạn có hai lớp <b>A</b> và <b>B</b>. Hãy trả lờii lần lượt các câu hỏi — cây sẽ dẫn bạn đến đúng mối quan hệ.</p>
        <button class="btn btn-primary" style="--accent:#0EA5E9">${fa('fa-play')} Bắt đầu</button>
      </div></div>`;
    $('.btn', this.root).addEventListener('click', () => {
      this.root.querySelector('.tree-intro').remove();
      this.path = 0;
      this.ask('q1');
    });
  }
  ask(nodeId) {
    const node = TREE[nodeId];
    this.path++;
    const flow = this.flow || (this.flow = Object.assign(document.createElement('div'), { className: 'tree-flow' }));
    $('.tree-wrap', this.root).appendChild(flow);
    const nodeEl = document.createElement('div');
    nodeEl.className = 'tree-node';
    nodeEl.innerHTML = `
      <div class="tree-q">
        <div class="tq-step">CÂU HỎI ${this.path}/5</div>
        <div class="tq-text">${node.text}</div>
        <div class="tq-hint">${node.hint}</div>
        <div class="tree-a">
          <button class="btn btn-yes" data-a="yes">${fa('fa-check')} Có</button>
          <button class="btn btn-no" data-a="no">${fa('fa-xmark')} Không</button>
        </div>
      </div>`;
    flow.appendChild(nodeEl);
    nodeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    $$('.btn', nodeEl).forEach(b => b.addEventListener('click', () => this.answer(node, b.dataset.a === 'yes', nodeEl)));
  }
  answer(node, saidYes, nodeEl) {
    /* khóa câu hỏi, biến thành chip tóm tắt */
    const q = $('.tree-q', nodeEl);
    const chip = document.createElement('div');
    chip.className = 'tree-chip';
    chip.innerHTML = `<span>${q.querySelector('.tq-text').textContent}</span>
      <span class="${saidYes ? 'yes' : 'no'}">${fa(saidYes ? 'fa-check' : 'fa-xmark')} ${saidYes ? 'Có' : 'Không'}</span>`;
    q.replaceWith(chip);
    const link = document.createElement('div');
    link.className = 'tree-link';
    nodeEl.appendChild(link);

    const next = saidYes ? node.yes : node.no;
    setTimeout(() => {
      if (typeof next === 'string') { this.ask(next); }
      else { this.showResult(next.result); }
    }, 650);
  }
  showResult(key) {
    const r = RESULTS[key];
    const el = document.createElement('div');
    el.className = 'tree-node';
    el.innerHTML = `
      <div class="tree-result" style="--rcolor:${r.color}">
        <div class="tr-ico">${fa(r.ico)}</div>
        <div class="tr-name" style="color:${r.color}">${r.name} <span>(${r.en})</span></div>
        <div class="tr-line">${r.line}</div>
        <div class="tr-actions">
          <button class="btn btn-primary" data-goto="${r.i}" style="--accent:${r.color}">${fa('fa-play')} Ôn lại scene này</button>
          <button class="btn" data-rebuild>${fa('fa-rotate-left')} Làm lại cây</button>
        </div>
      </div>`;
    this.flow.appendChild(el);
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    $('[data-goto]', el).addEventListener('click', e => UI.goto(+e.currentTarget.dataset.goto));
    $('[data-rebuild]', el).addEventListener('click', () => this.renderIntro());
    UI.markDone(6);
  }
}


/* ================== 7. KHUNG ỨNG DỤNG (UI) ================== */

const UI = {
  scenes: [], current: -1, doneSet: new Set(),

  /* ---- dựng DOM: nav + panel từng scene ---- */
  build() {
    const main = $('#main'), nav = $('#navList');
    SCENE_DEFS.forEach((d, i) => {
      nav.appendChild(this.navItem(i, d));
      main.appendChild(this.scenePanel(i, d));
    });
    /* panel thứ 7: cây quyết định */
    nav.appendChild(this.navItem(6, { vi: 'CÂY QUYẾT ĐỊNH', en: 'Decision Tree', icon: 'fa-diagram-project', color: '#0EA5E9' }));
    const treePanel = document.createElement('section');
    treePanel.className = 'panel'; treePanel.dataset.i = 6;
    main.appendChild(treePanel);
    this.tree = new DecisionTree(treePanel);

    /* khởi tạo scene */
    SCENE_DEFS.forEach((d, i) => {
      const s = new d.cls({ index: i, examples: d.examples });
      s.attach($$('.panel')[i]);
      this.scenes.push(s);
    });

    /* khôi phục tiến trình đã lưu */
    try {
      (JSON.parse(localStorage.getItem('oop-done') || '[]')).forEach(i => this.markDone(i, true));
    } catch (e) {}
  },

  navItem(i, d) {
    const b = document.createElement('button');
    b.className = 'nav-item';
    b.style.setProperty('--item-color', d.color);
    b.innerHTML = `
      <span class="nav-ico">${fa(d.icon)}</span>
      <span class="nav-text"><b>${i + 1}. ${d.vi}</b><span>${d.en}</span></span>
      <span class="nav-check">${fa('fa-check')}</span>`;
    b.addEventListener('click', () => this.goto(i));
    return b;
  },

  scenePanel(i, d) {
    const p = document.createElement('section');
    p.className = 'panel'; p.dataset.i = i;
    p.style.setProperty('--accent', d.color);
    p.innerHTML = `
      <div class="scene-head">
        <div class="kicker">
          <span class="dot"></span> QUAN HỆ ${i + 1}/6
          <span>·</span> Mức gắn kết <span class="coupling">${'●'.repeat(d.coupling)}${'○'.repeat(5 - d.coupling)}</span>
        </div>
        <h1>${d.vi} <span class="en">(${d.en})</span></h1>
        <p class="big-question">${d.question}<small>${d.qsub}</small></p>
      </div>
      <div class="example-bar">
        <span class="ex-label">${fa('fa-layer-group')} ${d.examples.length} ví dụ:</span>
        ${d.examples.map((e, j) => `
          <button class="example-chip${j === 0 ? ' active' : ''}" data-ex="${j}">${e.label}</button>`).join('')}
      </div>
      <div class="stage">
        <canvas></canvas>
        <div class="caption"></div>
        <div class="stage-actions"></div>
        <button class="stage-hint hidden"></button>
        <div class="stage-start hidden">
          <div class="lead">${fa('fa-brain')}</div>
          <p>Đọc kỹ câu hỏi lớn phía trên → xem câu chuyện → bấm <b>Tiếp tục</b> để tự tay <b>XÓA object</b> và quan sát vòng đờii.</p>
          <button class="btn btn-primary btn-big btn-start" style="--accent:${d.color}">${fa('fa-play')} Xem animation</button>
        </div>
      </div>
      <div class="explain">
        <h2>${fa('fa-book-open')} Hiểu nhanh ${d.en}</h2>
        <ul class="bullets">
          ${d.bullets.map(b => `<li><span class="b-ico">${fa(b[0])}</span><div><b>${b[1]}</b><p>${b[2]}</p></div></li>`).join('')}
        </ul>
        <div class="tip-card">
          <div class="tip-emoji">${fa('fa-brain')}</div>
          <div><b>MẸO GHI NHỚ</b><p>${d.tip}</p></div>
        </div>
      </div>`;
    return p;
  },

  /* ---- điều hướng ---- */
  goto(i) {
    if (i === this.current) return;
    if (this.current >= 0 && this.current < this.scenes.length) this.scenes[this.current].exit();
    this.current = i;
    $$('.panel').forEach(p => p.classList.toggle('active', +p.dataset.i === i));
    $$('.nav-item').forEach((n, j) => n.classList.toggle('active', j === i));
    if (i < this.scenes.length) this.scenes[i].enter();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try { localStorage.setItem('oop-last', i); } catch (e) {}
    this.refreshProgress();
  },

  markDone(i, silent = false) {
    this.doneSet.add(i);
    const item = $$('.nav-item')[i];
    if (item) item.classList.add('done');
    if (!silent) try { localStorage.setItem('oop-done', JSON.stringify([...this.doneSet])); } catch (e) {}
    this.refreshProgress();
  },

  refreshProgress() {
    const n = this.doneSet.size;
    $('#progressFill').style.width = (n / 7 * 100) + '%';
    $('#progressLabel').textContent = `Hoàn thành ${n}/7`;
  },
};


/* ================== 8. VÒNG LẶP CHÍNH + KHỞI ĐỘNG ================== */

let lastTs = 0;
function frame(ts) {
  const dt = Math.min((ts - lastTs) / 1000 || 0, .05) * SPEED;   // dt đã nhân tốc độ
  lastTs = ts;
  const s = UI.current >= 0 && UI.current < UI.scenes.length ? UI.scenes[UI.current] : null;
  if (s) { s.update(dt); s.drawFrame(); }
  requestAnimationFrame(frame);
}

function boot() {
  /* theme */
  const savedTheme = localStorage.getItem('oop-theme');
  if (savedTheme) document.documentElement.dataset.theme = savedTheme;
  const themeBtn = $('#themeBtn');
  const paintTheme = () => themeBtn.innerHTML =
    document.documentElement.dataset.theme === 'dark' ? fa('fa-sun') : fa('fa-moon');
  paintTheme();
  refreshPalette();
  themeBtn.addEventListener('click', () => {
    const dark = document.documentElement.dataset.theme !== 'dark';
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    paintTheme();
    try { localStorage.setItem('oop-theme', dark ? 'dark' : 'light'); } catch (e) {}
    refreshPalette();
  });

  /* tốc độ animation: Bật/Tắt (x1 ↔ x2) */
  const savedSpeed = +(localStorage.getItem('oop-speed') || 1);
  SPEED = savedSpeed === 2 ? 2 : 1;
  const speedBtn = $('#speedBtn');
  const paintSpeed = () => speedBtn.innerHTML = `${fa('fa-bolt')} x${SPEED}`;
  paintSpeed();
  speedBtn.addEventListener('click', () => {
    SPEED = SPEED === 1 ? 2 : 1;
    paintSpeed();
    try { localStorage.setItem('oop-speed', SPEED); } catch (e) {}
  });

  /* điều hướng */
  UI.build();
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft')  UI.goto(Math.max(0, UI.current - 1));
    if (e.key === 'ArrowRight') UI.goto(Math.min(6, UI.current + 1));
  });

  /* resize: dựng lại scene hiện tại cho khớp khung mới */
  let rsT;
  window.addEventListener('resize', () => {
    clearTimeout(rsT);
    rsT = setTimeout(() => {
      if (UI.current < UI.scenes.length) { UI.scenes[UI.current].resize(); UI.scenes[UI.current].reset(true); }
    }, 250);
  });

  const startAt = Math.min(6, +(localStorage.getItem('oop-last') || 0));
  UI.goto(startAt);
  requestAnimationFrame(frame);
}

document.addEventListener('DOMContentLoaded', boot);
