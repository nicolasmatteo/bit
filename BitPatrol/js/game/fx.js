/* Efectos: partículas, anillos de choque, humo y sacudida de cámara.
   Sólo visual — el daño vive en combat.js.

   Vocabulario de dibujo animado: casi nada se desvanece sin forma. El humo son
   nubes de lóbulos con contorno, los impactos son estrellas, las explosiones son
   racimos de bocanadas que crecen y se desinflan. */

import { G } from './state.js';
import { rnd, rndi, clamp } from '../util.js';

const MAX_PARTS = 900;

function push(p) {
  if (G.parts.length > MAX_PARTS) G.parts.shift();
  G.parts.push(p);
}

/** Chispa brillante, se dibuja en modo aditivo. */
export function spark(x, y, color, n = 1, speed = 2.4, life = [14, 30]) {
  for (let i = 0; i < n; i++) {
    const a = rnd(0, Math.PI * 2), s = rnd(speed * 0.35, speed);
    push({
      kind: 'spark', x, y,
      vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.4,
      g: 0.14, drag: 0.94, color,
      size: rnd(0.9, 2.1), life: rnd(life[0], life[1]), max: 0,
    });
  }
}

/** Humo blando que crece y se disipa. Sin contorno: es atmósfera, no dibujo. */
export function smoke(x, y, color, n = 1, opts = {}) {
  const { speed = 0.5, rise = -0.35, size = [2.5, 6], life = [40, 80], alpha = 0.34 } = opts;
  for (let i = 0; i < n; i++) {
    push({
      kind: 'smoke', x: x + rnd(-2, 2), y: y + rnd(-2, 2),
      vx: rnd(-speed, speed), vy: rise + rnd(-0.2, 0.2),
      g: -0.004, drag: 0.97, color,
      size: rnd(size[0], size[1]), grow: rnd(0.05, 0.14),
      life: rnd(life[0], life[1]), max: 0, alpha,
    });
  }
}

/**
 * Bocanada dibujada: nube de lóbulos con contorno de tinta, que rota despacio.
 * Es el humo "en primer plano" — pólvora, escape del cohete, polvo de caída.
 */
export function puff(x, y, color, n = 1, opts = {}) {
  const {
    speed = 0.6, rise = -0.4, size = [3, 6], life = [26, 48],
    alpha = 0.9, grow = 0.16, lw = 1.2,
  } = opts;
  for (let i = 0; i < n; i++) {
    push({
      kind: 'puff', x: x + rnd(-1.5, 1.5), y: y + rnd(-1.5, 1.5),
      vx: rnd(-speed, speed), vy: rise + rnd(-0.22, 0.22),
      g: -0.006, drag: 0.94, color,
      size: rnd(size[0], size[1]), grow,
      rot: rnd(0, 6.28), rotV: rnd(-0.05, 0.05),
      seed: rnd(0, 20), lobes: rndi(5, 8), lw,
      life: rnd(life[0], life[1]), max: 0, alpha,
    });
  }
}

/** Polvo de pisada / aterrizaje. */
export function dust(x, y, color, n = 1, spread = 1.2) {
  for (let i = 0; i < n; i++) {
    push({
      kind: 'puff', x, y,
      vx: rnd(-spread, spread), vy: rnd(-0.9, -0.1),
      g: 0.012, drag: 0.93, color,
      size: rnd(1.8, 3.6), grow: 0.1,
      rot: rnd(0, 6.28), rotV: rnd(-0.04, 0.04),
      seed: rnd(0, 20), lobes: rndi(5, 8), lw: 0.9,
      life: rnd(20, 40), max: 0, alpha: 0.55,
    });
  }
}

/** Esquirla sólida con rebote (cajones, escombros). */
export function debris(x, y, color, n = 1, speed = 2.6) {
  for (let i = 0; i < n; i++) {
    push({
      kind: 'debris', x, y,
      vx: rnd(-speed, speed), vy: rnd(-speed * 1.2, -speed * 0.2),
      g: 0.26, drag: 0.99, color,
      size: rnd(1.4, 3), rot: rnd(0, 6.28), rotV: rnd(-0.3, 0.3),
      life: rnd(40, 80), max: 0,
    });
  }
}

/** Vaina servida: salta hacia atrás y arriba, gira y cae. */
export function shell(x, y, dirX, n = 1) {
  for (let i = 0; i < n; i++) {
    push({
      kind: 'shell', x, y,
      vx: -dirX * rnd(0.6, 1.5) + rnd(-0.3, 0.3), vy: rnd(-2.2, -1.2),
      g: 0.3, drag: 0.995, color: '#e6b455',
      size: rnd(1.5, 2.1), rot: rnd(0, 6.28), rotV: rnd(-0.42, 0.42),
      life: rnd(34, 58), max: 0,
    });
  }
}

/**
 * Estela del dash: una silueta que se queda atrás y se borra. Es lo que hace
 * que un tramo de once cuadros se lea como velocidad y no como un teletransporte.
 */
export function ghost(x, y, dir) {
  push({
    kind: 'ghost', x, y,
    vx: -dir * 0.4, vy: 0, g: 0, drag: 1, color: '#6ce8ff',
    size: 1, life: 13, max: 0, dir,
  });
}

/** Anillo de expansión: saltos, impactos, explosiones. */
export function ring(x, y, r1, color, opts = {}) {
  const { life = 22, width = 2, r0 = 2, alpha = 0.8, squash = 1 } = opts;
  G.rings.push({ x, y, r0, r1, t: 0, max: life, color, width, alpha, squash });
}

/**
 * Estrella de golpe. El vocabulario de impacto del dibujo animado: aparece
 * grande, gira un poco y se va en seis cuadros. Se usa en cada bala que pega.
 */
export function pop(x, y, color, r = 9, opts = {}) {
  const { life = 11, points = rndi(4, 7), ink = true, core = '#fff6d8' } = opts;
  G.pops.push({
    x, y, r, t: 0, max: life, color, core, points,
    rot: rnd(0, 6.28), rotV: rnd(-0.12, 0.12), seed: rnd(0, 30), ink,
  });
}

/** Bola de fuego: racimo de bocanadas + destello + estrella. Sólo estética. */
export function fireball(x, y, r) {
  G.booms.push({
    x, y, r, t: 0, max: 30,
    seed: rnd(0, 30), lobes: rndi(6, 9),
    blobs: Array.from({ length: 4 }, () => ({
      a: rnd(0, 6.28), d: rnd(0.15, 0.6), s: rnd(0.4, 0.75), seed: rnd(0, 30),
    })),
  });
  pop(x, y, '#ffd06a', r * 1.25, { life: 13, points: 7 });
  /* el humo que queda va detrás y sin contorno: es atmósfera. Sólo tres
     bocanadas dibujadas al frente, o una cadena de explosiones tapa la pantalla */
  puff(x, y, '#6b6152', 3, { speed: 1.2, rise: -0.45, size: [r * 0.2, r * 0.34], life: [26, 44], alpha: 0.7, grow: 0.2 });
  smoke(x, y, '#4a4238', 7, { speed: 1.5, rise: -0.5, size: [r * 0.22, r * 0.4], life: [50, 96], alpha: 0.32 });
  spark(x, y, '#ffd08a', 14, 4.2, [16, 40]);
  ring(x, y, r * 1.9, '#ffb15e', { life: 18, width: 2.4 });
}

/** Rayo persistente (telegrafía o disparo del jefe). */
export function beam(x1, y1, x2, y2, color, life, width) {
  G.beams.push({ x1, y1, x2, y2, t: 0, max: life, color, width });
}

export function shake(amount) { G.cam.shake = Math.max(G.cam.shake, amount); }
export function flash(amount, tint = null) {
  G.cam.flash = Math.max(G.cam.flash, amount);
  if (tint) G.cam.tint = tint;
}

/* ------------------------------------------------------------------ */

export function updateFx() {
  const parts = G.parts;
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.max = Math.max(p.max, p.life);
    p.x += p.vx; p.y += p.vy;
    p.vy += p.g;
    p.vx *= p.drag; p.vy *= p.drag;
    if (p.grow) p.size += p.grow;
    if (p.rotV) p.rot += p.rotV;
    if (--p.life <= 0) parts.splice(i, 1);
  }
  for (let i = G.rings.length - 1; i >= 0; i--) if (++G.rings[i].t > G.rings[i].max) G.rings.splice(i, 1);
  for (let i = G.booms.length - 1; i >= 0; i--) if (++G.booms[i].t > G.booms[i].max) G.booms.splice(i, 1);
  for (let i = G.beams.length - 1; i >= 0; i--) if (++G.beams[i].t > G.beams[i].max) G.beams.splice(i, 1);
  for (let i = G.pops.length - 1; i >= 0; i--) {
    const s = G.pops[i];
    s.rot += s.rotV;
    if (++s.t > s.max) G.pops.splice(i, 1);
  }

  G.cam.shake *= 0.86;
  if (G.cam.shake < 0.05) G.cam.shake = 0;
  G.cam.flash = Math.max(0, G.cam.flash - 1);
  if (G.cam.flash === 0) G.cam.tint = null;
}

export function clearFx() {
  G.parts.length = 0; G.rings.length = 0; G.booms.length = 0;
  G.beams.length = 0; G.pops.length = 0;
  G.cam.shake = 0; G.cam.flash = 0; G.cam.tint = null;
}

export const fade = (life, max) => clamp(life / Math.max(1, max), 0, 1);
