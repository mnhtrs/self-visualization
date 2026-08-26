// Particle and Visual Energy FX System
import { MathUtils } from './math.js';

export class ParticleSystem {
  constructor() {
    this.ambientParticles = [];
    this.sparks = [];
    this.shockwaves = [];
    this.initAmbient();
  }

  initAmbient(count = 90) {
    this.ambientParticles = [];
    for (let i = 0; i < count; i++) {
      this.ambientParticles.push({
        x: (Math.random() - 0.5) * 3200,
        y: (Math.random() - 0.5) * 2200,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        radius: 0.8 + Math.random() * 1.6,
        alpha: 0.15 + Math.random() * 0.4,
        baseAlpha: 0.15 + Math.random() * 0.4,
        pulseSpeed: 0.5 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  emitSparks(x, y, color = '#06b6d4', count = 18, speed = 140, life = 0.8) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const v = (0.3 + 0.7 * Math.random()) * speed;
      this.sparks.push({
        x,
        y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v,
        color,
        radius: 1.5 + Math.random() * 2.5,
        life,
        maxLife: life,
        drag: 0.94
      });
    }
  }

  emitShockwave(x, y, color = '#06b6d4', maxRadius = 90, duration = 0.7) {
    this.shockwaves.push({
      x,
      y,
      color,
      radius: 5,
      maxRadius,
      duration,
      age: 0
    });
  }

  update(dt, time) {
    // Update ambient
    for (const p of this.ambientParticles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha = p.baseAlpha * (0.6 + 0.4 * Math.sin(time * p.pulseSpeed + p.phase));

      if (p.x < -1600) p.x = 1600;
      if (p.x > 1600) p.x = -1600;
      if (p.y < -1100) p.y = 1100;
      if (p.y > 1100) p.y = -1100;
    }

    // Update sparks
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vx *= s.drag;
      s.vy *= s.drag;
      s.life -= dt;
      if (s.life <= 0) {
        this.sparks.splice(i, 1);
      }
    }

    // Update shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.age += dt;
      const progress = sw.age / sw.duration;
      if (progress >= 1) {
        this.shockwaves.splice(i, 1);
      } else {
        sw.radius = 5 + (sw.maxRadius - 5) * MathUtils.ease.easeOutCubic(progress);
        sw.alpha = 1 - progress;
      }
    }
  }

  drawAmbient(ctx) {
    for (const p of this.ambientParticles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(148, 163, 184, ${p.alpha})`;
      ctx.fill();
    }
  }

  drawSparks(ctx) {
    for (const s of this.sparks) {
      const alpha = Math.max(0, s.life / s.maxLife);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius * alpha, 0, Math.PI * 2);
      ctx.fillStyle = s.color;
      ctx.globalAlpha = alpha;
      ctx.shadowBlur = 10;
      ctx.shadowColor = s.color;
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 0;
  }

  drawShockwaves(ctx) {
    for (const sw of this.shockwaves) {
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = 2.5 * sw.alpha;
      ctx.globalAlpha = sw.alpha * 0.8;
      ctx.shadowBlur = 16;
      ctx.shadowColor = sw.color;
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 0;
  }
}
