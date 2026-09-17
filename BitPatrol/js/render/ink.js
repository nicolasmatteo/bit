/* Tinta — el lenguaje de dibujo de 1936.
   Color plano, contorno negro grueso, y una línea que "hierve": se recalcula
   doce veces por segundo en vez de sesenta, como una animación dibujada a mano.
   Todo lo que se pinta en el mundo pasa por acá; así nada queda sin borde. */

import { G } from '../game/state.js';
import { noise2 } from '../util.js';

export const INK      = '#191310';   // el negro de la pluma, nunca #000 puro
export const PAPER    = '#f6e7c4';   // crema de celuloide
export const PAPER_LO = '#d9c299';
export const BLUSH    = '#e8776b';

/** Un paso de línea cada 5 cuadros ≈ 12 dibujos por segundo. */
export const BOIL_FPS = 5;
export const boilStep = () => (G.tick / BOIL_FPS) | 0;

/** Temblor estable dentro de un mismo paso de boil: la mano del dibujante. */
export function boil(seed, amp = 0.6, step) {
  const s = step === undefined ? boilStep() : step;
  return (noise2(seed * 1.37 + 0.13, s * 3.71 + 0.7) - 0.5) * 2 * amp;
}

/** Rellena el trazo actual y lo perfila. Punto único del look de tinta. */
export function inked(ctx, fill, lw = 2, stroke = INK) {
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (lw > 0) {
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

/** Miembro de manguera: negro grueso por debajo, color por encima. */
export function hose(ctx, x1, y1, cx, cy, x2, y2, w, color, lw = 2) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo(cx, cy, x2, y2);
  ctx.strokeStyle = INK;
  ctx.lineWidth = w + lw * 2;
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.stroke();
}

/** Disco perfilado: guantes, remaches, ojos, botones. */
export function disc(ctx, x, y, r, fill, lw = 2) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 6.283);
  inked(ctx, fill, lw);
}

/** Rectángulo redondeado como trazo (no dibuja: sólo arma el path). */
export function pill(ctx, x, y, w, h, r) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Nube de lóbulos: humo, explosiones, polvo. Cerrada y suave, se puede perfilar. */
export function puffPath(ctx, x, y, r, seed = 0, lobes = 6, squash = 1) {
  const steps = Math.max(18, Math.min(48, Math.round(r * 1.6)));
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const rr = r * (1 + 0.2 * Math.sin(a * lobes + seed) + 0.09 * Math.sin(a * lobes * 2 - seed * 1.7));
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr * squash;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
}

/** Estrella de fogonazo / impacto. Puntas desparejas para que no parezca vectorial. */
export function starPath(ctx, x, y, rOut, rIn, points = 5, rot = 0, seed = 0) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = rot + (i / (points * 2)) * Math.PI * 2;
    const base = i % 2 ? rIn : rOut;
    const rr = base * (1 + boil(seed + i * 2.3, 0.16));
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
}

/** Cápsula orientada: el cuerpo de casi todos los proyectiles. */
export function capsulePath(ctx, len, rad) {
  const half = Math.max(rad, len / 2);
  ctx.beginPath();
  ctx.moveTo(-half + rad, -rad);
  ctx.lineTo(half - rad, -rad);
  ctx.arc(half - rad, 0, rad, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(-half + rad, rad);
  ctx.arc(-half + rad, 0, rad, Math.PI / 2, -Math.PI / 2);
  ctx.closePath();
}

/**
 * Sombra de cel: media forma en tono oscuro con el borde recto y duro, cortada
 * en diagonal. Es lo único que da volumen cuando el color es plano — la luz
 * viene siempre de arriba a la izquierda, así que la sombra cae abajo a la
 * derecha, igual en todos los personajes.
 *
 * Se llama con la forma ya armada en el path actual: recorta contra ella y
 * pinta un semiplano. `ctx.clip()` no consume el path, así que después todavía
 * se puede perfilar con `stroke()`.
 */
export function shadeHalf(ctx, cx, cy, r, alpha = 0.16) {
  ctx.save();
  ctx.clip();
  ctx.translate(cx, cy);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = `rgba(24,17,13,${alpha})`;
  ctx.fillRect(0, -r * 4, r * 8, r * 8);
  ctx.restore();
}

/** Dientes cuadrados: la sonrisa de casi todo lo hostil. */
export function teeth(ctx, x, y, w, h, n = 4) {
  ctx.save();
  ctx.fillStyle = '#fbf6e6';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.8;
  const tw = w / n;
  for (let i = 0; i < n; i++) {
    ctx.beginPath();
    ctx.rect(x + i * tw, y, tw, h);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

export const DISPLAY = '"Bowlby One SC", "Rye", Georgia, serif';
export const BODY = '"Special Elite", "Courier New", monospace';

/**
 * Letra con contorno de tinta: la única forma de que un rótulo se lea sobre
 * cualquier fondo. Vive acá y no en el HUD porque también hay carteles dentro
 * del mundo — los del phishing, sin ir más lejos.
 */
export function label(ctx, text, x, y, size, color, align = 'left', spacing = '0.06em', lw = 3.2, font = DISPLAY) {
  ctx.save();
  ctx.font = `${size}px ${font}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = spacing;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  if (lw > 0) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw;
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

/** Brillo especular: la lágrima blanca que le da volumen al color plano. */
export function shine(ctx, x, y, rx, ry, rot = 0, alpha = 0.85) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, 6.283);
  ctx.fill();
  ctx.restore();
}

/** Sombra de suelo: elipse de tinta plana, sin desenfoque (no existía en cel). */
export function groundShadow(ctx, x, y, rx, ry, alpha = 0.26) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, 6.283);
  ctx.fill();
  ctx.restore();
}
