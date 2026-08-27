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
     → [Nút "Tiếp tục"] → [Mô phỏng vòng đời: TỰ CHỌN object để xóa — mọi nút
       xóa hiển thị cùng lúc, thử xong tự phục hồi để thử lựa chọn khác]
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
          startMark = '', endMark = '', mark = 18, alpha = 1, labelDy = -16, labelDx = 0 } = o;
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
    const la = alpha * Math.min(1, (progress - .5) * 4);
    ctx.globalAlpha = la;
    ctx.font = F(15, 700); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = color;
    const lx = (x1 + x2) / 2 + labelDx, ly = (y1 + y2) / 2 + labelDy;
    ctx.fillText(label, lx, ly);
    if (window.__captureRects && progress >= .99) {
      const tw = ctx.measureText(label).width;
      window.__captureRects.push({ kind: 'label', id: label, x: lx - tw / 2, y: ly - 14, w: tw, h: 18 });
    }
  }
  ctx.restore();
}

/* Nhãn UML có nền riêng (vd: "nhóm (không sở hữu)").
   Được vẽ SAU cùng (trong drawExtras) nên không bao giờ bị card hay
   đường nối che lại — khác với label trơn của connector(). */
function drawLabelChip(ctx, x, y, text, color, alpha = 1) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = F(14.5, 700);
  const w = ctx.measureText(text).width + 26, h = 30;
  if (window.__captureRects && alpha >= .9)
    window.__captureRects.push({ kind: 'chip', id: text, x: x - w / 2, y: y - h / 2, w, h });
  ctx.shadowColor = PAL.shadow; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
  rr(ctx, x - w / 2, y - h / 2, w, h, 15);
  ctx.fillStyle = PAL.card; ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.strokeStyle = color; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 1);
  ctx.restore();
}

/* Huy hiệu nhỏ nổi trên canvas (vd: "login() ✓") */
function drawBadge(ctx, x, y, text, { color = '#10B981', alpha = 1, scale = 1 } = {}) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.scale(scale, scale);
  ctx.font = F(18, 700);
  const w = ctx.measureText(text).width + 36, h = 40;
  if (window.__captureRects && alpha >= .9)
    window.__captureRects.push({ kind: 'badge', id: text, x: x - w / 2, y: y - h / 2, w, h });
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

/** Card UML — "diễn viên" của mọi scene. Vẽ đúng chuẩn class diagram:
    ┌──────────────────┐
    │   «stereotype»   │   ← tùy chọn (vd «interface»)
    │      TênLớp      │   ← đậm, căn giữa (+ icon nhỏ)
    │     chú thích    │   ← nhỏ, mờ, căn giữa
    ├──────────────────┤
    │ - thuộc tính     │   ← ngăn thuộc tính
    ├──────────────────┤
    │ + phương thức()  │   ← ngăn phương thức
    └──────────────────┘
    Chiều cao tự tính theo nội dung (không bao giờ thấp hơn `h` truyền vào),
    tên/chú thích quá dài tự thu nhỏ hoặc cắt "…" → không bao giờ tràn. */
class Card {
  constructor(o) {
    Object.assign(this, {
      x: 0, y: 0, w: 220, h: 0,
      color: '#3B82F6', ico: ICO.user, title: '', sub: '', stereo: '',
      attrs: [], methods: [],        // mỗi dòng: chuỗi 'teach()' hoặc {t, inh, hl}
      alpha: 1, scale: 1, shake: 0, shakeT: 0, glow: 0, visible: true,
    }, o);
    /* dữ liệu ví dụ có thể thiếu attrs/methods → luôn đảm bảo là mảng */
    this.attrs = this.attrs || [];
    this.methods = this.methods || [];
    this.measure();
  }

  /** Chiều cao các ngăn — tính một lần trong constructor. */
  measure() {
    this.headH = 10 + (this.stereo ? 17 : 0) + 27 + (this.sub ? 17 : 0) + 7;
    this.rowH = 21;
    const pad = 5;
    this.need = this.headH
      + (this.attrs.length   ? pad + this.attrs.length   * this.rowH + pad : 0)
      + (this.methods.length ? pad + this.methods.length * this.rowH + pad : 0)
      + 7;
    this.h = Math.max(this.h || 0, this.need, 64);
  }

  /** Vẽ 1 dòng trong ngăn, tự cắt "…" nếu quá rộng. */
  row(ctx, x, y, maxW, text) {
    let t = text;
    if (ctx.measureText(t).width > maxW) {
      while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
      t += '…';
    }
    ctx.fillText(t, x, y);
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

    const { w, h } = this, x = -w / 2, y = -h / 2, r = 14;

    /* thân card + bóng mềm */
    ctx.save();
    rr(ctx, x, y, w, h, r);
    ctx.shadowColor = PAL.shadow; ctx.shadowBlur = 22; ctx.shadowOffsetY = 8;
    ctx.fillStyle = PAL.card; ctx.fill();
    ctx.restore();

    /* dải màu nhận diện ở đỉnh card + nền nhạt cho ngăn đầu */
    ctx.save();
    rr(ctx, x, y, w, h, r); ctx.clip();
    ctx.fillStyle = hexA(this.color, .10);
    ctx.fillRect(x, y, w, this.headH);
    ctx.fillStyle = this.color;
    ctx.fillRect(x, y, w, 3.5);
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

    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';

    /* «stereotype» — căn giữa phía trên tên */
    let ny = y + (this.stereo ? 44 : 27);
    if (this.stereo) {
      ctx.font = F(12, 700); ctx.fillStyle = PAL.sub; ctx.textAlign = 'center';
      ctx.fillText(this.stereo, 0, y + 24);
      ctx.textAlign = 'left';
    }

    /* tên lớp + icon — căn giữa, tự thu nhỏ font nếu chật */
    let fs = 19;
    ctx.font = F(fs, 800);
    let nw = ctx.measureText(this.title).width;
    if (nw + 30 > w - 16) { fs = 16; ctx.font = F(fs, 800); nw = ctx.measureText(this.title).width; }
    const gx = -(nw + 22) / 2;
    ctx.font = FA(fs - 3); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = this.color;
    ctx.fillText(this.ico, gx + 8, ny - fs * .34);
    ctx.font = F(fs, 800); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = PAL.text;
    ctx.fillText(this.title, gx + 22, ny);

    /* chú thích nhỏ dưới tên — tự cắt "…" */
    if (this.sub) {
      ctx.font = F(12.5, 600); ctx.fillStyle = PAL.sub; ctx.textAlign = 'center';
      this.row(ctx, 0, ny + 17, w - 18, this.sub);
      ctx.textAlign = 'left';
    }

    /* các ngăn thuộc tính / phương thức */
    const sep = yy => {
      ctx.strokeStyle = PAL.line; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + 10, yy); ctx.lineTo(x + w - 10, yy); ctx.stroke();
    };
    let ry = y + this.headH;
    sep(ry);
    const drawRows = (rows, prefix) => {
      for (const r of rows) {
        const o = typeof r === 'string' ? { t: r } : r;
        const cy = ry + 15;
        if (o.hl > 0) {                                    // dòng được highlight (kế thừa)
          ctx.save(); ctx.globalAlpha *= o.hl;
          rr(ctx, x + 8, cy - 14, w - 16, 21, 6);
          ctx.fillStyle = hexA(this.color, .18); ctx.fill();
          ctx.restore();
        }
        /* dòng kế thừa phân biệt bằng MÀU + CHỮ ĐẬM + nền highlight —
           chuẩn UML không dùng ký tự mũi tên ↳ (dễ nhìn nhầm dấu xuống dòng) */
        ctx.font = F(14, o.inh ? 700 : 600);
        ctx.fillStyle = o.inh ? this.color : PAL.text;
        ctx.fillText(prefix + o.t, x + 16, cy);
        ry += this.rowH;
      }
    };
    if (this.attrs.length)   { ry += 5; drawRows(this.attrs, '- ');   ry += 5; sep(ry); }
    if (this.methods.length) { ry += 5; drawRows(this.methods, '+ '); ry += 5; }

    if (window.__captureRects && this.alpha > .85)
      window.__captureRects.push({ kind: 'card', id: this.title,
        x: this.x - w / 2, y: this.y - h / 2, w, h });
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

  /* ---- vòng đời khung ---- */
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

  /** Đổi sang ví dụ khác: quay về màn chờ (lớp phủ mờ + nút bấm) giống như
      khi mới vào chủ đề — không tự động chạy animation nữa. */
  switchExample(i) {
    if (i === this.exIdx && !this.running && !this.finished) return;
    this.exIdx = i;
    this.paintChips();
    this.reset(true);
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
        if (a.disabled) b.disabled = true;
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

  /** MÔ PHỎNG VÒNG ĐỜI "THÔNG MINH": mọi lựa chọn xóa hiển thị CÙNG LÚC —
      người học TỰ CHỌN thứ tự, không còn cảnh "xóa hết cái này mới được
      bấm cái kia". Cái nào đã thử sẽ mờ đi kèm dấu ✓. Mỗi lựa chọn chạy
      hiệu ứng quan sát rồi TỰ PHỤC HỒI sân khấu để lựa chọn kế tiếp luôn
      bắt đầu từ trạng thái nguyên vẹn.
      steps: [{ id, label, run: async () => {} }] */
  async simulate(steps) {
    const done = new Set();
    while (done.size < steps.length) {
      const id = await this.actions(steps.map(s => ({
        id: s.id,
        kind: 'danger',
        label: (done.has(s.id) ? fa('fa-circle-check') + ' ' : fa('fa-trash-can') + ' ') + s.label,
        disabled: done.has(s.id),
      })));
      const step = steps.find(s => s.id === id);
      if (step) { done.add(id); await step.run(); }
    }
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
    this.a = new Card({ x: vw * .26, y: vh * .5, w: 230, h: 120,
      color: e.a.color, ico: e.a.ico, title: e.a.name, sub: e.a.sub,
      attrs: e.a.attrs, methods: e.a.methods });
    this.b = new Card({ x: vw * .74, y: vh * .5, w: 230, h: 120,
      color: e.b.color, ico: e.b.ico, title: e.b.name, sub: e.b.sub,
      attrs: e.b.attrs, methods: e.b.methods });
    this.link = { p: 0 };
  }
  drawLinks(c) {
    connector(c, this.a.x + this.a.w / 2, this.a.y, this.b.x - this.b.w / 2, this.b.y,
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

    /* --- MÔ PHỎNG VÒNG ĐỜI: 2 nút xóa hiện cùng lúc, tự chọn thứ tự --- */
    await this.simulate([
      { id: 'delA', label: `Xóa ${e.a.name}`, run: async () => {
        await this.tw(this.link, { p: 0 }, 400);
        this.destroy(this.a);
        await this.cap(`<b>${e.b.name} vẫn tồn tại.</b>`, 1800);
        /* tự phục hồi để thử lựa chọn còn lại từ trạng thái nguyên vẹn */
        await this.popIn([this.a]);
        await this.tw(this.link, { p: 1 }, 550);
      } },
      { id: 'delB', label: `Xóa ${e.b.name}`, run: async () => {
        await this.tw(this.link, { p: 0 }, 400);
        this.destroy(this.b);
        await this.cap(`<b>${e.a.name} vẫn tồn tại.</b>`, 1800);
        await this.popIn([this.b]);
        await this.tw(this.link, { p: 1 }, 550);
      } },
    ]);
    await this.cap('Một đối tượng mất đi <b>không ảnh hưởng</b> đối tượng còn lại.<br>Đó là <b>Liên kết (Association)</b>.', 2200);
    this.finish();
  }
}

/* ---------- 4.2 DEPENDENCY (Phụ thuộc): chỉ "dùng tạm" ---------- */
class DependencyScene extends Scene {
  setup() {
    const { vw, vh } = this.M, e = this.E;
    const mob = this.M.vw < 700;
    this.tool = new Card({ x: vw * .5, y: vh * (mob ? .44 : .56), w: 250, h: 110,
      color: e.tool.color, ico: e.tool.ico, title: e.tool.name, sub: e.tool.sub,
      methods: e.tool.methods });
    this.item = new Card({ x: -vw * .25, y: vh * (mob ? .44 : .56), w: 210, h: 100,
      color: e.item.color, ico: e.item.ico, title: e.item.name, sub: e.item.sub,
      attrs: e.item.attrs });
    /* vị trí "nghỉ" của item sau khi dùng xong — tránh đè lên tool (đặc biệt trên mobile) */
    this.rest = mob ? { x: vw * .78, y: vh * .66 } : { x: vw * .8, y: vh * .56 };
    this.fly  = mob ? { x: vw * .5,  y: vh * .16 } : { x: vw * .5, y: vh * .18 };
    this.use = { p: 0, a: 1 };
    this.doing = { p: 0 };
  }
  drawLinks(c) {
    const t = this.tool, it = this.item;
    if (!t.visible || !it.visible) return;
    const above = it.y + it.h / 2 < t.y;                 // item đang bay phía trên?
    const s = above ? { x: t.x, y: t.y - t.h / 2 } : { x: t.x + t.w / 2, y: t.y };
    const p = above ? { x: it.x, y: it.y + it.h / 2 } : { x: it.x - it.w / 2, y: it.y };
    connector(c, s.x, s.y, p.x, p.y,
      { progress: this.use.p, color: '#D97706', dash: true, label: '«use»', alpha: this.use.a });
  }
  drawExtras(c) {
    drawBadge(c, this.tool.x, this.tool.y - this.tool.h / 2 - 34, this.E.doing,
      { color: '#D97706', alpha: this.doing.p, scale: lerp(.6, 1, this.doing.p) });
  }
  async script() {
    const e = this.E;
    await this.popIn([this.tool]);
    await this.cap(e.story, 1100);
    await this.all([
      this.tw(this.item, { x: this.fly.x, y: this.fly.y }, 900, 'inOutCubic'),
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
    await this.cap(`Xong việc, ${e.item.name} rời đi — <b>${e.tool.name} không giữ ${e.item.name}.</b>`, 1800);

    await this.continueGate();

    /* --- MÔ PHỎNG VÒNG ĐỜI: 2 nút xóa hiện cùng lúc, tự chọn thứ tự --- */
    await this.simulate([
      { id: 'delItem', label: `Xóa ${e.item.name}`, run: async () => {
        await this.tw(this.use, { p: 0 }, 350);
        this.destroy(this.item);
        await this.flash(this.tool, 1);
        await this.cap(`<b>${e.tool.name} vẫn bình thường</b> — nó chỉ <b>mượn</b> ${e.item.name} lúc làm việc.`, 1900);
        this.item.x = this.rest.x; this.item.y = this.rest.y;
        await this.popIn([this.item]);
        await this.tw(this.use, { p: 1 }, 450);
      } },
      { id: 'delTool', label: `Xóa ${e.tool.name}`, run: async () => {
        await this.tw(this.use, { p: 0 }, 350);
        this.destroy(this.tool);
        await this.cap(`<b>${e.item.name} vẫn tồn tại.</b> Quan hệ chỉ là <b>"dùng tạm"</b>.`, 2000);
        await this.popIn([this.tool]);
        await this.tw(this.use, { p: 1 }, 450);
      } },
    ]);
    await this.cap('Đó là <b>Phụ thuộc (Dependency)</b> — mối quan hệ <b>lỏng lẻo nhất</b>.', 1800);
    this.finish();
  }
}

/* ---------- 4.3 AGGREGATION (Kết tập): nhóm lỏng lẻo, phần tử độc lập ---------- */
class AggregationScene extends Scene {
  setup() {
    const { vw, vh } = this.M, e = this.E;
    /* Bố cục "dàn hàng ngang": tổng thể ở trên, các phần tử xếp thành
      một hàng ngang bên dưới — thoáng, đúng chuẩn vẽ UML, không chồng nhau. */
    const mob = this.M.vw < 700;
    this.owner = new Card({ x: vw * (mob ? .5 : .21), y: vh * (mob ? .17 : .24),
      w: mob ? 240 : 260, h: 108,
      color: e.owner.color, ico: e.owner.ico, title: e.owner.name, sub: e.owner.sub,
      methods: e.owner.methods });
    this.members = [0, 1, 2].map(i => new Card({
      x: vw * (mob ? [.18, .5, .82][i] : [.25, .5, .75][i]),
      y: vh * (mob ? .58 : .645),
      w: mob ? 190 : 210, h: 116, color: e.memberColor,
      ico: e.memberIcos[i], title: e.base + ' ' + 'ABC'[i],
      attrs: e.memberAttrs, methods: e.memberMethods,
    }));
    this.links = [0, 0, 0];
    this.owner2 = null;
  }
  edge(card, side) {
    if (side === 'b') return { x: card.x, y: card.y + card.h / 2 };
    return { x: card.x, y: card.y - card.h / 2 };
  }
  drawLinks(c) {
    const owner = this.owner2 && this.owner2.visible ? this.owner2 : this.owner;
    if (!owner || !owner.visible) return;
    this.members.forEach((t, i) => {
      if (!t.visible || this.links[i] <= 0) return;
      const s = this.edge(owner, 'b'), p = this.edge(t, 't');
      connector(c, s.x, s.y, p.x, p.y, {
        progress: this.links[i], color: this.E.owner.color, width: 2.6,
        startMark: 'dia-h',
      });
    });
  }
  drawExtras(c) {
    /* Nhãn giải thích: vẽ SAU các card, có nền riêng → không bị che nữa.
       Nổi dần khi đường nối giữa hoàn tất. */
    const owner = this.owner2 && this.owner2.visible ? this.owner2 : this.owner;
    const t = this.members[1];
    if (!owner || !owner.visible || !t || !t.visible) return;
    const a = Math.max(0, Math.min(1, (this.links[1] - .8) * 5));
    if (a <= 0) return;
    const s = this.edge(owner, 'b'), p = this.edge(t, 't');
    /* kẹp chip luôn nằm dưới đáy owner (kể cả khi các phần tử nhích gần lại) */
    const chipY = Math.max((s.y + p.y) / 2 - 30, s.y + 23);
    drawLabelChip(c, (s.x + p.x) / 2, chipY,
      'nhóm (không sở hữu)', this.E.owner.color, a);
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

    /* --- MÔ PHỎNG VÒNG ĐỜI: các nút xóa hiện cùng lúc, tự chọn thứ tự --- */
    await this.simulate([
      { id: 'delOwner', label: `Xóa ${e.owner.name}`, run: async () => {
        await this.all(this.links.map((_, i) => this.tw(this.links, { [i]: 0 }, 350)));
        this.destroy(this.owner);
        for (const t of this.members) { t.shake = .7; }
        await this.cap(`${e.owner.name} biến mất… <b>các ${e.base} vẫn ở yên.</b>`, 1900);
        this.owner2 = new Card({ x: this.owner.x, y: this.owner.y, w: this.owner.w, h: this.owner.h,
          color: e.owner2.color, ico: e.owner2.ico, title: e.owner2.name, sub: e.owner2.sub,
          methods: e.owner.methods });
        await this.popIn([this.owner2]);
        await this.all(this.members.map((t, i) => this.all([
          this.tw(t, { y: t.y - 60 }, 800, 'inOutCubic'),
          this.tw(this.links, { [i]: 1 }, 800),
        ])));
        await this.cap(e.moved, 2100);
      } },
      { id: 'delMember', label: `Xóa một ${e.base}`, run: async () => {
        const i = 1;
        await this.tw(this.links, { [i]: 0 }, 350);
        this.destroy(this.members[i]);
        await this.cap(`Chỉ một ${e.base} mất — <b>tổng thể và các ${e.base} khác vẫn bình thường.</b>`, 2000);
        await this.popIn([this.members[i]]);
        await this.tw(this.links, { [i]: 1 }, 500);
      } },
    ]);
    await this.cap('Phần tử <b>sống độc lập</b> với tổng thể → <b>Kết tập (Aggregation)</b>.', 1900);
    this.finish();
  }
}

/* ---------- 4.4 COMPOSITION (Hợp thành): bộ phận chết cùng tổng thể ---------- */
class CompositionScene extends Scene {
  setup() {
    const { vw, vh } = this.M, e = this.E;
    const mob = this.M.vw < 700;
    /* Hai class đặt CẠNH NHAU (không lồng vào nhau) — đúng chuẩn class diagram,
      nối bằng hình thoi đặc ◆ phía tổng thể. */
    this.whole = new Card({ x: vw * (mob ? .5 : .34), y: vh * (mob ? .3 : .5),
      w: mob ? 260 : 280, h: 150,
      color: e.whole.color, ico: e.whole.ico, title: e.whole.name, sub: e.whole.sub,
      attrs: e.whole.attrs, methods: e.whole.methods });
    this.part = new Card({ x: vw * (mob ? .5 : .72), y: vh * (mob ? .56 : .5),
      w: mob ? 230 : 240, h: 110,
      color: e.part.color, ico: e.part.ico, title: e.part.name, sub: e.part.sub,
      attrs: e.part.attrs, methods: e.part.methods });
    this.link = { p: 0 };
  }
  drawLinks(c) {
    if (!this.whole.visible || !this.part.visible) return;
    const mob = this.M.vw < 700;
    const s = mob
      ? { x: this.whole.x, y: this.whole.y + this.whole.h / 2 }
      : { x: this.whole.x + this.whole.w / 2, y: this.whole.y };
    const p = mob
      ? { x: this.part.x, y: this.part.y - this.part.h / 2 }
      : { x: this.part.x - this.part.w / 2, y: this.part.y };
    connector(c, s.x, s.y, p.x, p.y,
      { progress: this.link.p, color: this.E.whole.color, width: 3, startMark: 'dia-f',
        label: 'sở hữu', ...(mob ? { labelDx: 62, labelDy: 0 } : {}) });
  }
  async script() {
    const e = this.E;
    await this.popIn([this.whole]);
    await this.cap(`Một <b>${e.whole.name}</b> xuất hiện.`, 1000);
    await this.popIn([this.part]);
    await this.tw(this.link, { p: 1 }, 500);
    await this.cap(`${e.whole.name} <b>sở hữu</b> ${e.part.name} — ký hiệu hình thoi đặc ◆.`, 1900);
    await this.all([this.flash(this.whole), this.flash(this.part)]);
    await this.cap(`${e.part.name} là <b>một phần không thể tách rời</b> của ${e.whole.name}.`, 1800);

    await this.continueGate();

    /* --- MÔ PHỎNG VÒNG ĐỜI: các nút xóa hiện cùng lúc, tự chọn thứ tự --- */
    await this.simulate([
      { id: 'delWhole', label: `Xóa ${e.whole.name}`, run: async () => {
        await this.tw(this.whole, { alpha: .55 }, 900);
        this.part.shake = 1.4;
        await this.wait(900);
        this.destroy(this.whole);
        this.destroy(this.part);
        await this.cap('<b>Sống cùng — chết cùng.</b>', 1700);
        await this.cap(`<b>${e.part.name} không thể tồn tại nếu ${e.whole.name} không còn.</b>`, 2000);
        /* dựng lại sân khấu nguyên vẹn để thử lựa chọn còn lại */
        this.setup();
        await this.popIn([this.whole, this.part]);
        await this.tw(this.link, { p: 1 }, 500);
      } },
      { id: 'delPart', label: `Xóa ${e.part.name} (thử xem!)`, run: async () => {
        await this.tw(this.link, { p: 0 }, 350);
        this.destroy(this.part);
        await this.flash(this.whole, 1);
        await this.cap(`<b>${e.whole.name} vẫn tồn tại</b> — mất một bộ phận, tổng thể vẫn sống.<br>Chiều ngược lại mới hoàn toàn khác…`, 2300);
        await this.popIn([this.part]);
        await this.tw(this.link, { p: 1 }, 500);
      } },
    ]);
    await this.cap('Đó là <b>Hợp thành (Composition)</b> — "sống cùng, chết cùng".', 1800);
    this.finish();
  }
}

/* ---------- 4.5 INHERITANCE (Kế thừa): cây is-a, thuộc tính chảy xuống ---------- */
class InheritanceScene extends Scene {
  setup() {
    const { vw, vh } = this.M, e = this.E;
    const mob = this.M.vw < 700;
    this.parent = new Card({ w: mob ? 240 : 230, color: e.parent.color,
      ico: e.parent.ico, title: e.parent.name, sub: 'lớp cha',
      attrs: e.parent.attrs, methods: e.parent.methods });
    this.child = new Card({ w: mob ? 250 : 260, color: e.color,
      ico: e.child.ico, title: e.child.name, sub: 'lớp con',
      attrs: [...e.parent.attrs.map(a => ({ t: a, inh: true, hl: 0 })), e.child.newAttr],
      methods: [e.child.method] });
    this.grand = new Card({ w: mob ? 230 : 220, color: e.color2,
      ico: e.grand.ico, title: e.grand.name, sub: 'lớp cháu',
      methods: [{ t: e.child.method, inh: true, hl: 0 }, e.grand.newMethod] });
    if (mob) {
      /* điện thoại: xếp dọc, khoảng cách tính theo chiều cao THẬT của card
         → không bao giờ bị dồn xuống đáy canvas đè lên caption/nút bấm */
      const gap = 52;
      this.parent.x = this.child.x = this.grand.x = vw * .5;
      this.parent.y = 70 + this.parent.h / 2;
      this.child.y  = this.parent.y + this.parent.h / 2 + gap + this.child.h / 2;
      this.grand.y  = this.child.y + this.child.h / 2 + gap + this.grand.h / 2;
    } else {
      /* máy tính: chuỗi KẾ THỪA DÀN HÀNG NGANG cha → con → cháu */
      this.parent.x = vw * .155; this.child.x = vw * .5; this.grand.x = vw * .845;
      this.parent.y = this.child.y = this.grand.y = vh * .5;
    }
    this.a1 = { p: 0 }; this.a2 = { p: 0 };
  }
  drawLinks(c) {
    const mob = this.M.vw < 700;
    if (mob) {
      connector(c, this.child.x, this.child.y - this.child.h / 2,
        this.parent.x, this.parent.y + this.parent.h / 2,
        { progress: this.a1.p, color: this.E.color, width: 3, endMark: 'tri', mark: 22,
          label: 'kế thừa', labelDy: 0, labelDx: -64 });
      connector(c, this.grand.x, this.grand.y - this.grand.h / 2,
        this.child.x, this.child.y + this.child.h / 2,
        { progress: this.a2.p, color: this.E.color, width: 3, endMark: 'tri', mark: 22 });
    } else {
      connector(c, this.child.x - this.child.w / 2, this.child.y,
        this.parent.x + this.parent.w / 2, this.parent.y,
        { progress: this.a1.p, color: this.E.color, width: 3, endMark: 'tri', mark: 22,
          label: 'kế thừa' });
      connector(c, this.grand.x - this.grand.w / 2, this.grand.y,
        this.child.x + this.child.w / 2, this.child.y,
        { progress: this.a2.p, color: this.E.color, width: 3, endMark: 'tri', mark: 22 });
    }
  }
  async script() {
    const e = this.E, [r1, r2] = e.parent.attrs;
    await this.popIn([this.parent]);
    await this.cap(`${e.parent.name} có <b>${r1}</b> và <b>${r2}</b>.`, 1200);
    await this.popIn([this.child]);
    await this.tw(this.a1, { p: 1 }, 600, 'inOutCubic');
    await this.cap(`${e.child.name} <b>kế thừa (extends)</b> ${e.parent.name}.`, 1500);
    for (const row of this.child.attrs.slice(0, 2)) await this.tw(row, { hl: 1 }, 450);
    await this.cap(`${e.child.name} nhận nguyên vẹn <b>${r1}</b>, <b>${r2}</b> — và tự thêm <b>${e.child.newAttr}</b>.`, 1900);
    await this.popIn([this.grand]);
    await this.tw(this.a2, { p: 1 }, 600, 'inOutCubic');
    await this.tw(this.grand.methods[0], { hl: 1 }, 400);
    await this.cap(`${e.grand.name} lại kế thừa ${e.child.name}…`, 1300);
    await this.tw(this, { camT: 1 }, 900, 'inOutCubic');
    await this.cap('Một <b>cây kế thừa</b>: mọi thứ chảy từ trên xuống dưới.', 1800);

    await this.continueGate();

    /* --- MÔ PHỎNG VÒNG ĐỜI: các nút xóa hiện cùng lúc, tự chọn thứ tự --- */
    await this.simulate([
      { id: 'delChild', label: `Xóa ${e.child.name}`, run: async () => {
        await this.all([this.tw(this.a1, { p: 0 }, 350), this.tw(this.a2, { p: 0 }, 350)]);
        this.destroy(this.child);
        await this.cap(`<b>${e.parent.name} vẫn tồn tại.</b> Kế thừa <b>không phải sở hữu.</b>`, 1900);
        await this.popIn([this.child]);
        await this.all([this.tw(this.a1, { p: 1 }, 500), this.tw(this.a2, { p: 1 }, 500)]);
      } },
      { id: 'delParent', label: `Xóa ${e.parent.name} (thử xem!)`, run: async () => {
        this.parent.shake = 2.6;
        await this.tw(this.parent, { glow: 1 }, 300);
        await this.cap(`${fa('fa-triangle-exclamation')} <b>${e.parent.name} là lớp cha</b> — xóa lớp cha <b>không</b> tự động xóa lớp con.<br>Đây chỉ là quan hệ "is-a" trong bản thiết kế.`, 2600, true);
        await this.tw(this.parent, { glow: 0 }, 300);
      } },
    ]);
    await this.cap('<b>Inheritance ≠ Composition.</b> Kế thừa không có nghĩa "sở hữu vòng đời".', 2000);
    this.finish();
  }
}

/* ---------- 4.6 REALIZATION (Hiện thực hóa): cùng contract, khác cách làm ---------- */
class RealizationScene extends Scene {
  setup() {
    const { vw, vh } = this.M, e = this.E;
    const mob = this.M.vw < 700;
    this.iface = new Card({ x: vw * .5, y: vh * (mob ? .17 : .22), w: 270,
      color: e.color, ico: e.iface.ico, title: e.iface.name, sub: 'contract',
      stereo: '«interface»', methods: [e.method] });
    this.i1 = new Card({ x: vw * (mob ? .22 : .26), y: vh * (mob ? .6 : .66), w: 258, h: 100,
      color: e.color1, ico: e.i1.ico, title: e.i1.name, sub: e.i1.sub, methods: [e.method] });
    this.i2 = new Card({ x: vw * (mob ? .78 : .74), y: vh * (mob ? .6 : .66), w: 258, h: 100,
      color: e.color2, ico: e.i2.ico, title: e.i2.name, sub: e.i2.sub, methods: [e.method] });
    this.a1 = { p: 0 }; this.a2 = { p: 0 };
    this.bg1 = { p: 0, text: '', color: '#D97706' };
    this.bg2 = { p: 0, text: '', color: '#D97706' };
  }
  drawLinks(c) {
    const off = this.M.vw < 700 ? 60 : 70;
    connector(c, this.i1.x, this.i1.y - this.i1.h / 2, this.iface.x - off, this.iface.y + this.iface.h / 2,
      { progress: this.a1.p, color: this.E.color, dash: true, endMark: 'tri', mark: 20, label: '«implements»' });
    connector(c, this.i2.x, this.i2.y - this.i2.h / 2, this.iface.x + off, this.iface.y + this.iface.h / 2,
      { progress: this.a2.p, color: this.E.color, dash: true, endMark: 'tri', mark: 20, label: '«implements»' });
  }
  drawExtras(c) {
    drawBadge(c, this.i1.x, this.i1.y - this.i1.h / 2 - 30, this.bg1.text,
      { color: this.bg1.color, alpha: this.bg1.p, scale: lerp(.6, 1, this.bg1.p) });
    drawBadge(c, this.i2.x, this.i2.y - this.i2.h / 2 - 30, this.bg2.text,
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

    /* --- MÔ PHỎNG VÒNG ĐỜI: các nút xóa hiện cùng lúc, tự chọn thứ tự --- */
    await this.simulate([
      { id: 'delI1', label: `Xóa ${e.i1.name}`, run: async () => {
        await this.tw(this.a1, { p: 0 }, 350);
        this.destroy(this.i1);
        await this.runMethod(this.i2, this.bg2, e.i2.via);
        await this.tw(this.bg2, { p: 0 }, 350);
        await this.cap(`<b>${e.i2.name} vẫn ${e.method} bình thường</b> — Interface vẫn tồn tại.`, 1900);
        await this.popIn([this.i1]);
        await this.tw(this.a1, { p: 1 }, 500);
      } },
      { id: 'delIface', label: `Xóa ${e.iface.name}`, run: async () => {
        await this.all([this.tw(this.a1, { p: 0 }, 350), this.tw(this.a2, { p: 0 }, 350)]);
        this.destroy(this.iface);
        await this.cap('Interface chỉ là <b>bản thiết kế (contract)</b> —<br>nó <b>không sở hữu</b> các object hiện thực nó.', 2200);
        await this.popIn([this.iface]);
        await this.all([this.tw(this.a1, { p: 1 }, 500), this.tw(this.a2, { p: 1 }, 500)]);
      } },
    ]);
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
        a: { name: 'Teacher',  sub: 'giảng viên', ico: ICO.teacher,   color: '#3B82F6',
             attrs: ['name'], methods: ['teach()'] },
        b: { name: 'Course',   sub: 'môn học',    ico: ICO.bookOpen,  color: '#2563EB',
             attrs: ['title'], methods: ['enroll()'] } },
      { label: 'Doctor & Patient',
        a: { name: 'Doctor',   sub: 'bác sĩ',     ico: ICO.doctor,    color: '#0EA5E9',
             attrs: ['name'], methods: ['examine()'] },
        b: { name: 'Patient',  sub: 'bệnh nhân',  ico: ICO.patient,   color: '#0284C7',
             attrs: ['record'], methods: ['visit()'] } },
      { label: 'Customer & Order',
        a: { name: 'Customer', sub: 'khách hàng', ico: ICO.customer,  color: '#0891B2',
             attrs: ['name'], methods: ['placeOrder()'] },
        b: { name: 'Order',    sub: 'đơn hàng',   ico: ICO.boxOpen,   color: '#0E7490',
             attrs: ['id'], methods: ['total()'] } },
    ],
    bullets: [
      ['fa-key', 'Keyword', '<b>“biết” (knows)</b> — liên hệ lâu dài giữa hai đối tượng ngang hàng.'],
      ['fa-circle-question', 'Câu hỏi nhận biết', '<b>A có “biết” B như một người quen?</b>'],
      ['fa-lightbulb', 'Khi nào dùng?', 'Teacher dạy Course, Doctor khám Patient, Customer đặt Order… hai bên độc lập nhưng có giao tiếp.'],
      ['fa-triangle-exclamation', 'Sai lầm thường gặp', 'Nghĩ rằng một bên “sở hữu” bên kia — Association <b>không có chủ</b>.'],
      ['fa-pen-ruler', 'Ký hiệu UML', 'Đường liền (solid line), có thể thêm mũi tên chỉ chiều đi.'],
    ],
    tip: 'Hai người <b>quen nhau</b>. Không ai sở hữu ai. Một người đi xa — người kia vẫn sống bình thường.',
  },
  {
    cls: DependencyScene, icon: 'fa-plug', color: '#F59E0B', coupling: 1,
    vi: 'PHỤ THUỘC', en: 'Dependency',
    question: '“Đối tượng này có <b>giữ</b> đối tượng kia mãi mãi không?”',
    qsub: 'Dùng xong rồi sao? Xem câu chuyện rồi bấm <b>Tiếp tục</b> để thử XÓA.',
    examples: [
      { label: 'Printer & Report', doing: 'đang in…', story: 'Printer nhận một yêu cầu in…',
        tool: { name: 'Printer',   sub: 'máy in',     ico: ICO.print,     color: '#F59E0B',
                methods: ['print(r: Report)'] },
        item: { name: 'Report',    sub: 'báo cáo',    ico: ICO.fileLines, color: '#64748B',
                attrs: ['pages'] } },
      { label: 'Compiler & SourceCode', doing: 'đang dịch…', story: 'Compiler nhận mã nguồn để biên dịch…',
        tool: { name: 'Compiler',  sub: 'trình dịch', ico: ICO.gears,     color: '#D97706',
                methods: ['compile(src)'] },
        item: { name: 'SourceCode',sub: 'mã nguồn',   ico: ICO.fileCode,  color: '#64748B',
                attrs: ['lines'] } },
      { label: 'ATM & BankCard', doing: 'đang đọc thẻ…', story: 'ATM nhận thẻ để xác thực…',
        tool: { name: 'ATM',       sub: 'máy rút tiền', ico: ICO.cashReg,    color: '#B45309',
                methods: ['verify(card)'] },
        item: { name: 'BankCard',  sub: 'thẻ ngân hàng', ico: ICO.creditCard, color: '#64748B',
                attrs: ['number'] } },
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
      { label: 'Faculty & Teachers', base: 'Teacher',
        memberColor: '#0D9488', memberAttrs: ['name'], memberMethods: ['teach()'],
        memberIcos: [ICO.teacher, ICO.teacher, ICO.teacherTie],
        owner:  { name: 'Faculty',   sub: 'khoa',        ico: ICO.building, color: '#10B981',
                  methods: ['add(t: Teacher)'] },
        owner2: { name: 'Faculty 2', sub: 'khoa khác',   ico: ICO.school,   color: '#059669' },
        moved: 'Các Teacher sang <b>Khoa khác</b> làm việc bình thường — hoàn toàn độc lập.' },
      { label: 'Team & Players', base: 'Player',
        memberColor: '#0F766E', memberAttrs: ['name'], memberMethods: ['play()'],
        memberIcos: [ICO.user, ICO.user, ICO.user],
        owner:  { name: 'Team',   sub: 'đội bóng',    ico: ICO.users, color: '#14B8A6',
                  methods: ['draft(p: Player)'] },
        owner2: { name: 'Team 2', sub: 'đội khác',    ico: ICO.users, color: '#0D9488' },
        moved: 'Các cầu thủ sang <b>đội khác</b> thi đấu bình thường — đội tan, người còn.' },
      { label: 'Library & Books', base: 'Book',
        memberColor: '#047857', memberAttrs: ['title'], memberMethods: ['open()'],
        memberIcos: [ICO.book, ICO.book, ICO.bookOpen],
        owner:  { name: 'Library',   sub: 'thư viện',      ico: ICO.landmark, color: '#059669',
                  methods: ['lend(b: Book)'] },
        owner2: { name: 'Library 2', sub: 'thư viện mới',  ico: ICO.landmark, color: '#10B981' },
        moved: 'Sách được chuyển sang <b>thư viện mới</b> — vòng đời sách không phụ thuộc thư viện.' },
    ],
    bullets: [
      ['fa-key', 'Keyword', '<b>“có” (has-a) lỏng lẻo</b> — A nhóm các B, nhưng B có <b>vòng đời riêng</b>.'],
      ['fa-circle-question', 'Câu hỏi nhận biết', '<b>B còn tồn tại khi A biến mất không?</b> Có → Aggregation.'],
      ['fa-lightbulb', 'Khi nào dùng?', 'Khoa – Giảng viên, Đội – Cầu thủ, Thư viện – Sách.'],
      ['fa-triangle-exclamation', 'Sai lầm thường gặp', 'Trông rất giống Composition — điểm khác nằm ở <b>vòng đời của phần tử</b>: độc lập hay gắn chết.'],
      ['fa-pen-ruler', 'Ký hiệu UML', 'Hình thoi rỗng (hollow diamond) ◇— đặt ở phía “tổng thể”.'],
    ],
    tip: 'Nếu công ty <b>phá sản</b>, nhân viên vẫn <b>đi xin việc nơi khác</b>. ⇒ Aggregation.',
  },
  {
    cls: CompositionScene, icon: 'fa-cubes', color: '#EF4444', coupling: 5,
    vi: 'HỢP THÀNH', en: 'Composition',
    question: '“Cái này có thực sự <b>sở hữu vòng đời</b> cái kia không?”',
    qsub: '“Sở hữu” ở đây nghĩa là gì? Xem câu chuyện rồi bấm <b>Tiếp tục</b>.',
    examples: [
      { label: 'Course & Syllabus',
        whole: { name: 'Course',   sub: 'môn học',  ico: ICO.bookOpen, color: '#EF4444',
                 attrs: ['title'], methods: ['getSyllabus()'] },
        part:  { name: 'Syllabus', sub: 'đề cương', ico: ICO.fileSign, color: '#B91C1C',
                 methods: ['export()'] } },
      { label: 'House & Room',
        whole: { name: 'House',    sub: 'ngôi nhà', ico: ICO.house,    color: '#DC2626',
                 attrs: ['address'] },
        part:  { name: 'Room',     sub: 'căn phòng', ico: ICO.doorOpen, color: '#991B1B',
                 methods: ['clean()'] } },
      { label: 'Order & OrderLine',
        whole: { name: 'Order',    sub: 'đơn hàng', ico: ICO.invoice,  color: '#E11D48',
                 attrs: ['id'], methods: ['total()'] },
        part:  { name: 'OrderLine',sub: 'dòng chi tiết', ico: ICO.listUl, color: '#9F1239',
                 attrs: ['qty'], methods: ['subtotal()'] } },
    ],
    bullets: [
      ['fa-key', 'Keyword', '<b>“sở hữu” (owns)</b> — phần (part) <b>gắn chết vòng đời</b> với tổng thể (whole).'],
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
        parent: { name: 'Person', ico: ICO.user, color: '#8B5CF6',
                  attrs: ['name', 'age'], methods: ['introduce()'] },
        child:  { name: 'Teacher',    ico: ICO.teacher,    newAttr: 'salary', method: 'teach()' },
        grand:  { name: 'Assistant',  ico: ICO.teacherTie, newMethod: 'assist()' } },
      { label: 'Animal → Dog', color: '#8B5CF6', color2: '#7C3AED',
        parent: { name: 'Animal', ico: ICO.paw, color: '#8B5CF6',
                  attrs: ['name', 'age'], methods: ['speak()'] },
        child:  { name: 'Dog',      ico: ICO.dog, newAttr: 'breed', method: 'bark()' },
        grand:  { name: 'Puppy',    ico: ICO.paw, newMethod: 'nap()' } },
      { label: 'Vehicle → Car', color: '#6D28D9', color2: '#5B21B6',
        parent: { name: 'Vehicle', ico: ICO.truck, color: '#8B5CF6',
                  attrs: ['brand', 'speed'], methods: ['start()'] },
        child:  { name: 'Car',         ico: ICO.car,      newAttr: 'seat', method: 'drive()' },
        grand:  { name: 'ElectricCar', ico: ICO.charging, newMethod: 'charge()' } },
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
        i1: { name: 'Teacher', ico: ICO.teacher,  sub: 'bằng email + mật khẩu', via: 'qua email…' },
        i2: { name: 'Student', ico: ICO.graduate, sub: 'bằng SSO sinh viên',    via: 'qua SSO…' } },
      { label: 'Payable', method: 'pay()', color: '#E11D48', color1: '#BE123C', color2: '#9F1239',
        iface: { name: 'Payable', ico: ICO.wallet },
        i1: { name: 'CreditCard', ico: ICO.creditCard, sub: 'quẹt thẻ POS', via: 'quẹt thẻ…' },
        i2: { name: 'MomoWallet', ico: ICO.qrcode,     sub: 'quét mã QR',   via: 'quét QR…' } },
      { label: 'Flyable', method: 'fly()', color: '#C026D3', color1: '#A21CAF', color2: '#86198F',
        iface: { name: 'Flyable', ico: ICO.feather },
        i1: { name: 'Bird',  ico: ICO.dove,  sub: 'đập cánh',         via: 'đập cánh…' },
        i2: { name: 'Plane', ico: ICO.plane, sub: 'động cơ phản lực', via: 'bật động cơ…' } },
    ],
    bullets: [
      ['fa-key', 'Keyword', '<b>“hiện thực” (implements)</b> — lớp cam kết theo một <b>interface (contract)</b>.'],
      ['fa-circle-question', 'Câu hỏi nhận biết', '<b>A có hiện thực interface B?</b>'],
      ['fa-lightbulb', 'Khi nào dùng?', 'Nhiều lớp “khác loài” cùng cam kết một hành vi: Loginable, Payable, Flyable…'],
      ['fa-triangle-exclamation', 'Sai lầm thường gặp', 'Kỳ vọng nhận sẵn code như kế thừa — interface chỉ cho <b>cam kết</b>, cách làm do từng lớp tự viết.'],
      ['fa-pen-ruler', 'Ký hiệu UML', 'Nét đứt + mũi tên rỗng ⇢▷ kèm «implements».'],
    ],
    tip: 'Giống <b>bằng lái xe</b>. Ai có bằng đều phải biết lái — nhưng mỗi người lái một kiểu.',
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
  dependency:  { i: 1, name: 'PHỤ THUỘC',   en: 'Dependency',   ico: 'fa-plug',           color: '#F59E0B', line: 'Chỉ dùng tạm thời — mượn xong là trả, không giữ lại.' },
  aggregation: { i: 2, name: 'KẾT TẬP',     en: 'Aggregation',  ico: 'fa-people-group',   color: '#10B981', line: 'A nhóm các B nhưng B sống độc lập — nhóm tan, phần tử vẫn ở lại.' },
  composition: { i: 3, name: 'HỢP THÀNH',   en: 'Composition',  ico: 'fa-cubes',          color: '#EF4444', line: 'A sở hữu B theo vòng đời — sống cùng, chết cùng.' },
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
        <small>Trả lời tối đa 5 câu Có/Không — cùng lắm 30 giây là ra đáp án.</small>
      </div>
      <div class="tree-wrap"><div class="tree-intro">
        <div class="lead">${fa('fa-route')}</div>
        <p>Bạn có hai lớp <b>A</b> và <b>B</b>. Hãy trả lời lần lượt các câu hỏi — cây sẽ dẫn bạn đến đúng mối quan hệ.</p>
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
          <p>Đọc kỹ câu hỏi lớn phía trên → xem câu chuyện → bấm <b>Tiếp tục</b> để tự tay <b>XÓA object</b> (mọi lựa chọn hiện ra cùng lúc, thứ tự tùy ý) và quan sát vòng đời.</p>
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
