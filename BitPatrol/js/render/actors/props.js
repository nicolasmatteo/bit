/* El mobiliario: cajones, recogidas, el poste de restauración y la puerta de
   salida. Todo lo que está en el mapa y no pelea.

   El poste sale de `base.js` y no de acá, porque el phishing lo imita: si el
   real y el impostor no dibujaran exactamente la misma silueta, el mímico se
   delataría por la forma en vez de por el color, que es su única pista. */

import { G } from '../../game/state.js';
import { rgba, noise2, glow } from '../../util.js';
import { INK, inked, disc, pill, starPath, shine, groundShadow } from '../ink.js';
import { LW, LWD, postPath } from './base.js';

/* ══════════════════════════════════ objetos */

export function drawCrates(ctx) {
  for (const b of G.crates) {
    if (b.dead) continue;
    groundShadow(ctx, b.x + b.w / 2, b.y + b.h, b.w * 0.45, 2.2, 0.3);

    const base = b.hit > 0 ? '#ffffff' : '#a9712f';
    pill(ctx, b.x, b.y, b.w, b.h, 2);
    inked(ctx, base, LW);
    /* un paquete de red: etiqueta y franja de datos */
    ctx.fillStyle = rgba('#ffe9c0', 0.5);
    ctx.fillRect(b.x + 2, b.y + 2.4, b.w - 4, 3.4);
    ctx.fillStyle = rgba(INK, 0.55);
    for (let i = 0; i < 4; i++) ctx.fillRect(b.x + 3 + i * 3.4, b.y + b.h - 6, 1.6, 3.4);
  }
}

export function drawPickups(ctx) {
  for (const p of G.pickups) pickupArt(ctx, p.kind, p.x, p.y, p.w, p.h, p.t);
}

/** El dibujo de un recogible, separado de la lista de recogibles. */
function pickupArt(ctx, kind, x, y, w, h, t) {
  const th = G.theme;
  const fy = Math.sin(t) * 2;
  const cx = x + w / 2, cy = y + h / 2 + fy;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  if (kind === 'fragmento') glow(ctx, cx, cy, 16, th.accent, 0.5);
  else if (kind === 'vida') glow(ctx, cx, cy, 15, '#8fe6a0', 0.35);
  else glow(ctx, cx, cy, 16, '#ffd08a', 0.35);
  ctx.restore();

  if (kind === 'fragmento') {
    /* fragmento de clave: una llavecita romboidal que gira */
    const r = 5.6 + Math.sin(t * 1.6) * 0.6;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t * 0.5);
    ctx.beginPath();
    ctx.moveTo(0, -r); ctx.lineTo(r * 0.62, 0); ctx.lineTo(0, r); ctx.lineTo(-r * 0.62, 0);
    ctx.closePath();
    inked(ctx, th.accent, LWD);
    shine(ctx, -r * 0.16, -r * 0.34, r * 0.16, r * 0.3, 0, 0.85);
    ctx.restore();
  } else if (kind === 'vida') {
    /* parche de integridad */
    pill(ctx, x, y + fy, w, h, 2.6);
    inked(ctx, '#f7efe0', LW);
    ctx.fillStyle = '#3aa85c';
    ctx.fillRect(cx - 1.8, cy - 4.4, 3.6, 8.8);
    ctx.fillRect(cx - 4.4, cy - 1.8, 8.8, 3.6);
  } else {
    /* depósito de herramientas */
    pill(ctx, x, y + fy, w, h, 2.6);
    inked(ctx, '#4a545e', LW);
    ctx.fillStyle = rgba('#ffd08a', 0.8 + Math.sin(G.tick * 0.12) * 0.2);
    ctx.fillRect(x + 3.4, cy - 1.4, w - 6.8, 2.8);
    shine(ctx, x + w * 0.3, y + fy + 2.6, w * 0.2, 0.8, 0, 0.5);
  }
}

export function drawCheckpoints(ctx) {
  const th = G.theme;
  for (const cp of G.checkpoints) {
    const cx = cp.x + cp.w / 2, base = cp.y + cp.h;

    postPath(ctx, cx, base, cp.y);
    inked(ctx, '#3b444e', LW);

    if (cp.on) {
      const pulse = 0.55 + Math.sin(cp.t * 3) * 0.2;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, cx, cp.y + 2, 26, th.accent, pulse);
      const col = ctx.createLinearGradient(0, cp.y - 40, 0, cp.y + 6);
      col.addColorStop(0, rgba(th.accent, 0));
      col.addColorStop(1, rgba(th.accent, 0.22 * pulse));
      ctx.fillStyle = col;
      ctx.fillRect(cx - 6, cp.y - 40, 12, 46);
      ctx.restore();
      starPath(ctx, cx, cp.y + 2, 4.6, 1.8, 5, cp.t, cp.x);
      inked(ctx, th.accent, 1);
    } else {
      disc(ctx, cx, cp.y + 2, 2.4, '#5b6570', 1);
    }
  }
}

export function drawGoal(ctx, bossAlive) {
  const g = G.goal;
  if (!g) return;
  const th = G.theme;
  const cx = g.x + g.w / 2;
  const open = !bossAlive;
  const pulse = open ? 0.5 + Math.sin(G.tick * 0.05) * 0.22 : 0.08;

  pill(ctx, g.x - 4, g.y - 6, 5.5, g.h + 6, 1.8);
  inked(ctx, '#3b444e', LW);
  pill(ctx, g.x + g.w - 1.5, g.y - 6, 5.5, g.h + 6, 1.8);
  inked(ctx, '#3b444e', LW);
  pill(ctx, g.x - 6, g.y - 11, g.w + 12, 7, 2.4);
  inked(ctx, '#4b555f', LW);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const col = ctx.createLinearGradient(0, g.y + g.h, 0, g.y - 70);
  col.addColorStop(0, rgba(th.accent, 0.34 * pulse * 2));
  col.addColorStop(1, rgba(th.accent, 0));
  ctx.fillStyle = col;
  ctx.fillRect(g.x, g.y - 70, g.w, g.h + 70);

  if (open) {
    for (let i = 0; i < 7; i++) {
      const t = (G.tick * 0.9 + i * 42) % 120;
      const yy = g.y + g.h - (t / 120) * (g.h + 40);
      ctx.fillStyle = rgba(th.accent, 0.5 * (1 - t / 120));
      ctx.fillRect(cx - 6 + noise2(i, 1) * 12, yy, 1.6, 4);
    }
    glow(ctx, cx, g.y + g.h - 6, 30, th.accent, 0.4);
  }
  ctx.restore();
}

