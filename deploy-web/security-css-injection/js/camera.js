// Camera System with cinematic damping and dynamic focal framing
import { MathUtils } from './math.js';

export class Camera {
  constructor(viewportWidth, viewportHeight) {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;

    // Current position and zoom
    this.x = 0;
    this.y = 0;
    this.zoom = 1;

    // Target position and zoom
    this.targetX = 0;
    this.targetY = 0;
    this.targetZoom = 1;

    // Damping factor
    this.damping = 4.5; // smooth cinematic transition
  }

  resize(w, h) {
    this.viewportWidth = w;
    this.viewportHeight = h;
  }

  setTarget(x, y, zoom, immediate = false) {
    this.targetX = x;
    this.targetY = y;
    this.targetZoom = zoom;

    if (immediate) {
      this.x = x;
      this.y = y;
      this.zoom = zoom;
    }
  }

  update(dt) {
    // Frame-rate independent exponential smoothing
    const t = 1 - Math.exp(-this.damping * dt);
    this.x = MathUtils.lerp(this.x, this.targetX, t);
    this.y = MathUtils.lerp(this.y, this.targetY, t);
    this.zoom = MathUtils.lerp(this.zoom, this.targetZoom, t);
  }

  apply(ctx) {
    ctx.save();
    // Center of screen
    ctx.translate(this.viewportWidth / 2, this.viewportHeight / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x, -this.y);
  }

  restore(ctx) {
    ctx.restore();
  }

  worldToScreen(wx, wy) {
    return {
      x: (wx - this.x) * this.zoom + this.viewportWidth / 2,
      y: (wy - this.y) * this.zoom + this.viewportHeight / 2
    };
  }

  screenToWorld(sx, sy) {
    return {
      x: (sx - this.viewportWidth / 2) / this.zoom + this.x,
      y: (sy - this.viewportHeight / 2) / this.zoom + this.y
    };
  }
}
