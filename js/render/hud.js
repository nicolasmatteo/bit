/* Interfaz en pantalla: placas de cartón crema con borde de tinta y letras
   gordas, como los rótulos pintados de un corto de los treinta. Nada flota en
   el aire — todo está apoyado sobre algo que se puede ver. */

import { TIMING, PURGE } from '../config.js';
import { G, P } from '../game/state.js';
import { WEAPONS } from '../data/weapons.js';
import { activeBoss } from '../game/enemies.js';
import { rgba, clamp, easeOut } from '../util.js';
import {
  INK, PAPER, PAPER_LO, pill, inked, disc, starPath, boil,
  label, DISPLAY, BODY,
} from './ink.js';

/** Placa de cartón: el soporte de casi todo el HUD. */
function plaque(ctx, x, y, w, h, tone = PAPER) {
  ctx.fillStyle = 'rgba(20,14,10,.3)';
  pill(ctx, x + 2, y + 3, w, h, 4);
  ctx.fill();
  pill(ctx, x, y, w, h, 4);
  inked(ctx, tone, 2.4);
}

/** Corazón de dibujo animado. */
function heart(ctx, x, y, r, full) {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.95);
  ctx.bezierCurveTo(x - r * 1.35, y - r * 0.15, x - r * 0.5, y - r * 1.1, x, y - r * 0.32);
  ctx.bezierCurveTo(x + r * 0.5, y - r * 1.1, x + r * 1.35, y - r * 0.15, x, y + r * 0.95);
  ctx.closePath();
  inked(ctx, full ? '#e0392c' : PAPER_LO, 1.8);
  if (full) {
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#ff9f96';
    ctx.beginPath();
    ctx.ellipse(x - r * 0.42, y - r * 0.32, r * 0.2, r * 0.3, -0.5, 0, 6.283);
    ctx.fill();
    ctx.restore();
  }
}

/**
 * Barra de Purga. Se carga disparando y, sobre todo, parando paquetes: un parry
 * vale como veinte impactos. Cuando se llena late en cian y avisa la tecla —
 * un superataque que no se anuncia es un superataque que nadie usa.
 */
function purgeGauge(ctx, x, y) {
  const w = 92, h = 7;
  const k = clamp(P.meter / PURGE.max, 0, 1);
  const full = k >= 1;

  pill(ctx, x, y, w, h, 3.5);
  inked(ctx, PAPER_LO, 2);
  if (k > 0.01) {
    ctx.save();
    pill(ctx, x, y, w, h, 3.5);
    ctx.clip();
    ctx.fillStyle = full ? (G.tick % 12 < 6 ? '#ffffff' : '#6ce8ff') : '#2f8fa8';
    ctx.fillRect(x, y, w * k, h);
    ctx.restore();
  }
  label(ctx, full ? 'PURGA · U' : 'PURGA', x + w + 6, y + h - 0.5, 8,
    full ? '#6ce8ff' : rgba(INK, 0.65), 'left', '0.14em', full ? 2.4 : 0, BODY);
}

export function drawHud(ctx) {
  const { w, h } = G.view;
  const th = G.theme;
  const pad = 14;

  /* ── vitalidad: corazones, el último latiendo cuando queda poco ── */
  const low = P.hp <= 2;
  for (let i = 0; i < P.maxHp; i++) {
    const beat = low && i === P.hp - 1 ? 1 + Math.sin(G.tick * 0.3) * 0.12 : 1;
    heart(ctx, pad + 8 + i * 15, pad + 9, 5.4 * beat, i < P.hp);
  }

  /* ── arma: placa con nombre, munición y granadas ── */
  const wp = WEAPONS[P.weapon];
  const ammo = P.ammo === Infinity ? '∞' : String(P.ammo);
  plaque(ctx, pad, pad + 18, 96, 30);
  label(ctx, wp.name.toUpperCase(), pad + 7, pad + 34, 12, wp.color, 'left', '0.04em', 3);
  label(ctx, ammo, pad + 7, pad + 45, 10, INK, 'left', '0.06em', 0, BODY);

  for (let i = 0; i < P.grenades; i++) disc(ctx, pad + 52 + i * 8, pad + 41, 2.6, '#2f3a2b', 1.2);

  /* carga del Firewall: sólo aparece mientras se está juntando */
  if (wp.charge && P.charge > 0) {
    const k = clamp(P.charge / wp.charge, 0, 1);
    const cw = 34;
    pill(ctx, pad + 56, pad + 25, cw, 4, 2);
    inked(ctx, PAPER_LO, 1.4);
    ctx.save();
    pill(ctx, pad + 56, pad + 25, cw, 4, 2);
    ctx.clip();
    ctx.fillStyle = k >= 1 ? (G.tick % 8 < 4 ? '#ffffff' : wp.color) : wp.color;
    ctx.fillRect(pad + 56, pad + 25, cw * k, 4);
    ctx.restore();
  }

  /* ── arsenal: lo que llevás encima, resaltada la que está activa ── */
  let wx = pad + 2;
  for (const key of Object.keys(WEAPONS)) {
    if (P.weapons[key] === undefined) continue;
    const active = key === P.weapon;
    const ww = active ? 20 : 10;
    pill(ctx, wx, pad + 52, ww, 5, 2.5);
    inked(ctx, active ? WEAPONS[key].color : PAPER_LO, 1.6);
    wx += ww + 4;
  }

  /* ── barra de Purga ── */
  purgeGauge(ctx, pad, pad + 62);

  /* ── fragmentos de clave ── */
  const shards = `${G.stats.shards}/${G.stats.shardsTotal}`;
  plaque(ctx, w - pad - 92, pad, 92, 34);
  label(ctx, 'CLAVES', w - pad - 8, pad + 13, 8, INK, 'right', '0.16em', 0, BODY);
  label(ctx, shards, w - pad - 8, pad + 29, 15, th.accent, 'right', '0.04em', 3);

  /* ── jefe ── */
  const boss = activeBoss();
  if (boss && boss.awake && G.mode === 'play') {
    const bw = Math.min(280, w * 0.46), bx = (w - bw) / 2, by = h - 38;
    label(ctx, boss.name || 'PROCESO RAÍZ', w / 2, by - 7, 13, PAPER, 'center', '0.18em', 3.4);
    pill(ctx, bx, by, bw, 8, 4);
    inked(ctx, PAPER_LO, 2.2);
    const k = clamp(boss.hp / boss.maxHp, 0, 1);
    if (k > 0.01) {
      ctx.save();
      pill(ctx, bx, by, bw, 8, 4);
      ctx.clip();
      ctx.fillStyle = th.hostile;
      ctx.fillRect(bx, by, bw * k, 8);
      ctx.fillStyle = rgba('#ffffff', 0.3);
      ctx.fillRect(bx, by + 1, bw * k, 2);
      ctx.restore();
    }
  }

  /* ── cartel de misión ── */
  if (G.mode === 'brief') drawBrief(ctx, w, h);

  /* ── velo de muerte ── */
  if (G.mode === 'dying') {
    const k = clamp(G.stateT / TIMING.death, 0, 1);
    /* iris de cierre, como el fundido de un corto */
    ctx.save();
    ctx.fillStyle = 'rgba(24,16,10,.92)';
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    const r = Math.max(0, (1 - easeOut(k)) * Math.hypot(w, h) * 0.55);
    ctx.arc(P.x + P.w / 2 - G.cam.x, P.y + P.h / 2 - G.cam.y, r, 0, 6.283, true);
    ctx.fill('evenodd');
    ctx.restore();
    if (k > 0.55) {
      label(ctx, 'RESTAURANDO', w / 2, h / 2 + 4, 18, PAPER, 'center', '0.14em', 4);
    }
  }

  if (G.mode === 'pause') {
    ctx.fillStyle = 'rgba(24,16,10,.4)';
    ctx.fillRect(0, 0, w, h);
  }
}

/** Cartel de sector: banderola de cartón con el nombre y su epígrafe. */
function drawBrief(ctx, w, h) {
  const t = G.stateT, dur = TIMING.brief;
  const fadeIn = clamp(t / 34, 0, 1);
  const fadeOut = clamp((dur - t) / 38, 0, 1);
  const a = Math.min(fadeIn, fadeOut);
  const slide = (1 - easeOut(fadeIn)) * 18;

  ctx.save();
  ctx.globalAlpha = a;

  const veil = ctx.createLinearGradient(0, h * 0.24, 0, h * 0.76);
  veil.addColorStop(0, 'rgba(24,16,10,0)');
  veil.addColorStop(0.5, 'rgba(24,16,10,.58)');
  veil.addColorStop(1, 'rgba(24,16,10,0)');
  ctx.fillStyle = veil;
  ctx.fillRect(0, h * 0.24, w, h * 0.52);

  const cy = h * 0.46 + slide;
  const cardW = Math.min(360, w * 0.72);

  /* banderola con los extremos mordidos */
  ctx.save();
  ctx.translate(w / 2, cy - 30 + boil(7, 0.4));
  ctx.beginPath();
  ctx.moveTo(-cardW / 2, -11);
  ctx.lineTo(cardW / 2, -11);
  ctx.lineTo(cardW / 2 - 9, 0);
  ctx.lineTo(cardW / 2, 11);
  ctx.lineTo(-cardW / 2, 11);
  ctx.lineTo(-cardW / 2 + 9, 0);
  ctx.closePath();
  inked(ctx, '#c9382f', 2.6);
  label(ctx, `SECTOR ${String(G.levelIndex + 1).padStart(2, '0')}`, 0, 5, 13, PAPER, 'center', '0.24em', 3);
  ctx.restore();

  /* nombre del sector, grande y entintado */
  label(ctx, G.level.name.toUpperCase(), w / 2, cy + 14, 38, PAPER, 'center', '0.05em', 6);

  /* dos estrellitas flanqueando, y el epígrafe debajo */
  for (const s of [-1, 1]) {
    starPath(ctx, w / 2 + s * (cardW / 2 - 4), cy + 4, 5, 2, 5, G.tick * 0.02 * s, s * 3);
    inked(ctx, G.theme.accent, 1.6);
  }
  label(ctx, G.level.epigraph || '', w / 2, cy + 36, 11, PAPER_LO, 'center', '0.06em', 0, BODY);

  ctx.restore();
}
