// Math & Motion Geometry Utilities

export const MathUtils = {
  clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  },

  lerp(a, b, t) {
    return a + (b - a) * t;
  },

  smoothstep(min, max, value) {
    const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
    return x * x * (3 - 2 * x);
  },

  map(value, inMin, inMax, outMin, outMax) {
    return outMin + (outMax - outMin) * ((value - inMin) / (inMax - inMin));
  },

  distance(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
  },

  // Easing functions
  ease: {
    linear: t => t,
    easeInQuad: t => t * t,
    easeOutQuad: t => t * (2 - t),
    easeInOutQuad: t => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
    easeInOutCubic: t => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),
    easeOutCubic: t => (--t) * t * t + 1,
    easeInCubic: t => t * t * t,
    easeOutExpo: t => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    easeInOutExpo: t => {
      if (t === 0) return 0;
      if (t === 1) return 1;
      if ((t *= 2) < 1) return 0.5 * Math.pow(2, 10 * (t - 1));
      return 0.5 * (-Math.pow(2, -10 * --t) + 2);
    },
    easeOutBack: (t, s = 1.70158) => {
      return (t = t - 1) * t * ((s + 1) * t + s) + 1;
    },
    easeInOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2
  },

  // Quadratic Bezier interpolation
  getQuadBezierPoint(p0, p1, p2, t) {
    const inv = 1 - t;
    return {
      x: inv * inv * p0.x + 2 * inv * t * p1.x + t * t * p2.x,
      y: inv * inv * p0.y + 2 * inv * t * p1.y + t * t * p2.y
    };
  },

  // Cubic Bezier interpolation
  getCubicBezierPoint(p0, p1, p2, p3, t) {
    const inv = 1 - t;
    const inv2 = inv * inv;
    const inv3 = inv2 * inv;
    const t2 = t * t;
    const t3 = t2 * t;
    return {
      x: inv3 * p0.x + 3 * inv2 * t * p1.x + 3 * inv * t2 * p2.x + t3 * p3.x,
      y: inv3 * p0.y + 3 * inv2 * t * p1.y + 3 * inv * t2 * p2.y + t3 * p3.y
    };
  },

  // Color utilities
  hexToRgb(hex) {
    let clean = hex.replace('#', '');
    if (clean.length === 3) {
      clean = clean.split('').map(c => c + c).join('');
    }
    const num = parseInt(clean, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  },

  rgba(hex, alpha = 1) {
    const { r, g, b } = this.hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
};
