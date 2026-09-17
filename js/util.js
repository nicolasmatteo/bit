/* Utilidades puras: matemática, color y ruido determinístico. */

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp  = (a, b, t) => a + (b - a) * t;
export const sign  = v => (v < 0 ? -1 : v > 0 ? 1 : 0);

export const rnd  = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
export const rndi = (a, b) => Math.floor(rnd(a, b));
export const pick = arr => arr[(Math.random() * arr.length) | 0];

export const aabb = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export const approach = (v, t, d) => (v < t ? Math.min(v + d, t) : Math.max(v - d, t));
export const smoothstep = t => t * t * (3 - 2 * t);
export const easeOut = t => 1 - Math.pow(1 - t, 3);

/**
 * Integra un resorte amortiguado in-place sobre state={x,v}, un paso por llamada.
 * k = rigidez (más alto = alcanza el objetivo más rápido), d = amortiguación
 * (más bajo = más rebote). Pensado para movimiento secundario: tela, pelo, cámara.
 */
export function springTo(state, target, k = 0.18, d = 0.8) {
  state.v = (state.v + (target - state.x) * k) * d;
  state.x += state.v;
}

/* Ruido determinístico 2D, barato y estable entre sesiones. */
export function noise2(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/* Ruido con interpolación suave, para perfiles orgánicos. */
export function fbm(x, seed = 0) {
  let v = 0, amp = 1, freq = 1, norm = 0;
  for (let i = 0; i < 3; i++) {
    const xi = Math.floor(x * freq), t = x * freq - xi;
    const a = noise2(xi, seed + i), b = noise2(xi + 1, seed + i);
    v += lerp(a, b, smoothstep(t)) * amp;
    norm += amp;
    amp *= 0.5; freq *= 2.3;
  }
  return v / norm;
}

/* ---- color ---- */

export function hexRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Mezcla dos colores hex. t=0 → a, t=1 → b. */
export function mix(a, b, t) {
  const A = hexRgb(a), B = hexRgb(b);
  return `rgb(${Math.round(lerp(A[0], B[0], t))},${Math.round(lerp(A[1], B[1], t))},${Math.round(lerp(A[2], B[2], t))})`;
}

/** Color hex con alfa. */
export function rgba(hex, a) {
  const [r, g, b] = hexRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/** Gradiente radial suave reutilizable (halo / bloom falso). */
export function glow(ctx, x, y, r, color, alpha = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, 0.85 * alpha));
  g.addColorStop(0.42, rgba(color, 0.26 * alpha));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}
