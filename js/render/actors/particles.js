/* Partículas y estallidos: lo que queda en el aire después de que algo pasó.
   No tiene cara ni silueta, así que no depende del canon — sólo de la pluma. */

import { G } from '../../game/state.js';
import { rgba, mix, clamp, lerp } from '../../util.js';
import { inked, pill, puffPath, starPath } from '../ink.js';
import { CYAN } from './base.js';

/* ══════════════════════════════════ partículas y estallidos */

export function drawParticles(ctx, layer) {
  for (const p of G.parts) {
    const life = clamp(p.life / Math.max(1, p.max), 0, 1);
    const back = p.kind === 'smoke';
    if (layer === 'back' && !back) continue;
    if (layer === 'front' && back) continue;

    if (p.kind === 'smoke') {
      ctx.fillStyle = rgba(p.color, (p.alpha || 0.3) * life);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, 6.283);
      ctx.fill();
    } else if (p.kind === 'puff') {
      ctx.save();
      ctx.globalAlpha = (p.alpha || 0.8) * life;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      puffPath(ctx, 0, 0, p.size, p.seed, p.lobes);
      inked(ctx, p.color, p.lw * (0.4 + life * 0.6));
      ctx.restore();
    } else if (p.kind === 'ghost') {
      /* silueta del dash: el perfil real de Bit — cabezota arriba, cuerpito
         abajo — para que la estela se lea como él y no como una caja */
      ctx.save();
      ctx.globalAlpha = life * 0.42;
      ctx.translate(p.x, p.y);
      ctx.scale(p.dir, 1);
      ctx.fillStyle = rgba(CYAN, 0.3);
      ctx.strokeStyle = rgba(CYAN, 0.5);
      ctx.lineWidth = 1.4;
      ctx.lineJoin = 'round';
      pill(ctx, -7.4, -15.9, 14.8, 14.8, 4.1);   // cabeza (centro en y=-8.5)
      ctx.fill(); ctx.stroke();
      pill(ctx, -4.6, -3.5, 9.2, 9, 3);          // torso y piernas
      ctx.fill(); ctx.stroke();
      ctx.restore();
    } else if (p.kind === 'shell') {
      ctx.save();
      ctx.globalAlpha = Math.min(1, life * 2.5);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      pill(ctx, -p.size, -p.size * 0.42, p.size * 2, p.size * 0.84, p.size * 0.3);
      inked(ctx, p.color, 0.7);
      ctx.restore();
    } else if (p.kind === 'debris') {
      ctx.save();
      ctx.globalAlpha = Math.min(1, life * 2.5);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.beginPath();
      ctx.rect(-p.size / 2, -p.size / 2, p.size, p.size * 0.75);
      inked(ctx, p.color, 0.7);
      ctx.restore();
    } else {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = rgba(p.color, life);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.4 + life * 0.6), 0, 6.283);
      ctx.fill();
      ctx.restore();
    }
  }
}

export function drawBlasts(ctx) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const r of G.rings) {
    const k = r.t / r.max;
    const rad = lerp(r.r0, r.r1, 1 - Math.pow(1 - k, 2.4));
    ctx.strokeStyle = rgba(r.color, (1 - k) * r.alpha);
    ctx.lineWidth = r.width * (1 - k * 0.6);
    ctx.beginPath();
    ctx.ellipse(r.x, r.y, rad, rad * r.squash, 0, 0, 6.283);
    ctx.stroke();
  }
  for (const bm of G.beams) {
    const a = 1 - bm.t / bm.max;
    ctx.strokeStyle = rgba(bm.color, a * 0.8);
    ctx.lineWidth = bm.width * a;
    ctx.beginPath();
    ctx.moveTo(bm.x1, bm.y1);
    ctx.lineTo(bm.x2, bm.y2);
    ctx.stroke();
  }
  ctx.restore();

  /* explosiones: racimo de bocanadas con contorno, del blanco al rojo */
  for (const b of G.booms) {
    const k = b.t / b.max;
    const grow = 0.45 + (1 - Math.pow(1 - k, 2.2)) * 0.85;
    const fade = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
    ctx.save();
    ctx.globalAlpha = fade;
    for (const bl of b.blobs) {
      const d = b.r * bl.d * grow;
      const rr = b.r * bl.s * grow;
      puffPath(ctx, b.x + Math.cos(bl.a) * d, b.y + Math.sin(bl.a) * d, rr, bl.seed, b.lobes);
      inked(ctx, mix('#e0522a', '#ffb45e', 1 - k), 1.6);
    }
    puffPath(ctx, b.x, b.y, b.r * grow * 0.78, b.seed, b.lobes);
    inked(ctx, mix('#ffb45e', '#fff6e0', 1 - k), 1.6);
    if (k < 0.55) {
      puffPath(ctx, b.x, b.y, b.r * grow * 0.42, b.seed + 3, b.lobes);
      ctx.fillStyle = '#fff9e8';
      ctx.fill();
    }
    ctx.restore();
  }

  /* estrellas de impacto: aparecen grandes y se van en un puñado de cuadros */
  for (const s of G.pops) {
    const k = s.t / s.max;
    const scale = k < 0.3 ? 0.55 + (k / 0.3) * 0.5 : 1.05 - (k - 0.3) * 0.55;
    ctx.save();
    ctx.globalAlpha = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
    starPath(ctx, s.x, s.y, s.r * scale, s.r * scale * 0.4, s.points, s.rot, s.seed);
    inked(ctx, s.color, s.ink ? 1.4 : 0);
    starPath(ctx, s.x, s.y, s.r * scale * 0.5, s.r * scale * 0.2, s.points, s.rot + 0.5, s.seed + 4);
    ctx.fillStyle = s.core;
    ctx.fill();
    ctx.restore();
  }
}
