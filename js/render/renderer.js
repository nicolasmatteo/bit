/* Composición del cuadro: escala al viewport, dibuja el mundo y aplica el
   procesado final (viñeta, grano, destello). */

import { VIEW_H, VIEW_W_MIN, VIEW_W_MAX } from '../config.js';
import { G } from '../game/state.js';
import { drawBackground, drawGrade } from './background.js';
import { drawTerrain, drawHazards, drawMovers } from './terrain.js';
import {
  drawPlayer, drawEnemy, drawCrates, drawPickups, drawCheckpoints,
  drawGoal, drawProjectiles, drawParticles, drawBlasts, drawLocks, drawBotnetLinks,
} from './actors.js';
import { drawHud } from './hud.js';
import { activeBoss } from '../game/enemies.js';
import { clamp, rgba } from '../util.js';
import { boil } from './ink.js';

const BACKDROP = '#1c0f0c';   // el negro del telón, no el del vacío

let dpr = 1, offX = 0, offY = 0;

export function resizeCanvas(canvas) {
  const cssW = canvas.clientWidth || window.innerWidth;
  const cssH = canvas.clientHeight || window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 2);

  G.view.h = VIEW_H;
  G.view.w = clamp(Math.round(VIEW_H * (cssW / cssH)), VIEW_W_MIN, VIEW_W_MAX);
  G.view.scale = Math.min(cssW / G.view.w, cssH / G.view.h);

  offX = (cssW - G.view.w * G.view.scale) / 2;
  offY = (cssH - G.view.h * G.view.scale) / 2;

  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
}

export function render(ctx) {
  const { w, h, scale } = G.view;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = BACKDROP;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, offX * dpr, offY * dpr);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();

  drawBackground(ctx);

  /* ── mundo ── */
  // sacudida + "baile de ventanilla": el cuadro nunca está del todo quieto en
  // una copia de 35 mm, pero se mueve a doce pasos por segundo, no a sesenta
  const sx = (Math.random() - 0.5) * G.cam.shake + boil(31, 0.3);
  const sy = (Math.random() - 0.5) * G.cam.shake + boil(37, 0.3);
  ctx.save();
  ctx.translate(-Math.round((G.cam.x + sx) * 2) / 2, -Math.round((G.cam.y + sy) * 2) / 2);

  drawTerrain(ctx);
  drawHazards(ctx);
  drawMovers(ctx);
  drawLocks(ctx);          // encima del piso que anulan, debajo de todo lo vivo
  drawCheckpoints(ctx);
  drawGoal(ctx, !!activeBoss(), G.stats.shardsTotal - G.stats.shards);
  drawCrates(ctx);
  drawPickups(ctx);
  drawParticles(ctx, 'back');
  drawBotnetLinks(ctx);    // antes que los enemigos: los cables pasan por detrás

  for (const e of G.enemies) {
    if (e.dead) continue;
    if (e.x + e.w < G.cam.x - 110 || e.x > G.cam.x + w + 110) continue;
    drawEnemy(ctx, e);
  }

  drawPlayer(ctx);
  drawProjectiles(ctx);
  drawParticles(ctx, 'front');
  drawBlasts(ctx);
  ctx.restore();

  /* ── procesado ── */
  drawGrade(ctx, w, h);

  if (G.cam.flash > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = rgba(G.cam.tint || '#ffffff', Math.min(0.5, G.cam.flash / 26));
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  drawHud(ctx);
  ctx.restore();
}

/** Fondo del menú: la escena corre detrás pero sin jugador ni interfaz. */
export function renderMenu(ctx) {
  const { w, h, scale } = G.view;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = BACKDROP;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, offX * dpr, offY * dpr);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();
  drawBackground(ctx);
  ctx.save();
  ctx.translate(-Math.round(G.cam.x), -Math.round(G.cam.y));
  drawTerrain(ctx);
  drawHazards(ctx);
  drawMovers(ctx);
  ctx.restore();
  drawGrade(ctx, w, h);
  ctx.restore();
}
