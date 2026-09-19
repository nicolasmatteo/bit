/* Orquestación: carga de nivel, cámara, máquina de estados y condición de salida. */

import { TIMING, PLAYER } from '../config.js';
import { G, P, resetPlayer } from './state.js';
import { LEVELS } from '../data/levels.js';
import { buildLevel, updateMovers, breakAllLocks } from './world.js';
import { updatePlayer } from './player.js';
import { updateEnemies, activeBoss } from './enemies.js';
import { updateProjectiles } from './projectiles.js';
import { updateFx, clearFx, ring, flash } from './fx.js';
import { buildTerrain } from '../render/terrain.js';
import { setAmbience } from '../audio.js';
import { Sfx } from '../audio.js';
import { clamp, aabb, lerp } from '../util.js';

export const levelCount = LEVELS.length;

export function startLevel(index, keepRun = true) {
  G.levelIndex = clamp(index, 0, LEVELS.length - 1);
  if (!keepRun) G.run = { deaths: 0, shards: 0, frames: 0 };

  buildLevel(LEVELS[G.levelIndex]);
  buildTerrain();
  clearFx();

  G.bullets.length = 0; G.ebullets.length = 0; G.grenades.length = 0;

  resetPlayer(G.spawn.x, G.spawn.y);
  P.weapon = 'ping';
  P.weapons = { ping: Infinity };
  P.ammo = Infinity;
  P.grenades = PLAYER.startGrenades;
  P.meter = 0;

  snapCamera();
  G.mode = 'brief';
  G.stateT = 0;
  setAmbience(G.theme);
}

export function restartLevel() { startLevel(G.levelIndex); }

export function advanceLevel() {
  if (G.levelIndex + 1 < LEVELS.length) startLevel(G.levelIndex + 1);
  else G.mode = 'win';
}

/* ─────────────────────────────── bucle lógico */

export function updateGame() {
  G.tick++;

  switch (G.mode) {
    case 'brief':
      G.stateT++;
      updateFx();
      trackCamera(0.14);
      if (G.stateT >= TIMING.brief) { G.mode = 'play'; G.stateT = 0; }
      break;

    case 'play':
      step();
      break;

    case 'dying':
      G.stateT++;
      updateMovers();
      updateProjectiles();
      updateFx();
      trackCamera(0.05);
      if (G.stateT >= TIMING.death) respawn();
      break;

    case 'menu':
      /* paneo lento del primer sector detrás del título */
      updateMovers();
      G.cam.x += 0.22;
      if (G.cam.x > Math.max(1, G.mapW - G.view.w)) G.cam.x = 0;
      updateFx();
      break;

    default:
      updateFx();
      break;
  }
}

function step() {
  G.stateT++;
  G.stats.frames++;
  updateMovers();
  updatePlayer();
  updateEnemies();
  updateProjectiles();
  updateFx();
  trackCamera(0.1);
  checkExit();
}

/**
 * Caerse devuelve al último poste de restauración, no al principio del sector.
 * El mapa no se rearma: lo que mataste sigue muerto y lo que juntaste sigue
 * juntado. Sólo se limpia lo que quedó en vuelo y lo que te dejaría reaparecer
 * en una trampa — el pozo del Monarca y los pisos cifrados.
 *
 * Esto es a propósito barato: reaparecer no vuelve a cargar el nivel ni a
 * repintar el terreno, así que la espera después de morir es la animación y
 * nada más.
 */
function respawn() {
  resetPlayer(G.spawn.x, G.spawn.y);
  G.ebullets.length = 0;
  G.bullets.length = 0;
  G.grenades.length = 0;
  G.gravMul = 1;                 // si moriste dentro del pozo, no reaparecés en él
  breakAllLocks();               // ni sobre un piso que sigue cifrado
  for (const e of G.enemies) if (e.boss) e.wellT = 0;
  clearFx();
  snapCamera();
  ring(P.x + P.w / 2, P.y + P.h / 2, 40, G.theme.accent, { life: 26, width: 2, alpha: 0.7 });
  flash(4, G.theme.accent);
  G.mode = 'play';
  G.stateT = 0;
}

function checkExit() {
  if (!G.goal || P.dead) return;
  if (activeBoss()) return;
  if (!aabb(P, G.goal)) return;

  G.run.deaths += G.stats.deaths;
  G.run.shards += G.stats.shards;
  G.run.frames += G.stats.frames;
  Sfx.gate();
  flash(6, G.theme.accent);
  G.mode = G.levelIndex + 1 < LEVELS.length ? 'clear' : 'win';
  G.stateT = 0;
}

/* ─────────────────────────────── cámara */

function targetCamera() {
  const lookX = P.face * 34 + P.vx * 10;
  const lookY = P.vy > 6 ? 34 : (P.vy < -4 ? -18 : 0);
  const tx = P.x + P.w / 2 - G.view.w / 2 + lookX;
  const ty = P.y + P.h / 2 - G.view.h / 2 + 14 + lookY;
  return {
    x: clamp(tx, 0, Math.max(0, G.mapW - G.view.w)),
    y: clamp(ty, 0, Math.max(0, G.mapH - G.view.h)),
  };
}

function trackCamera(ease) {
  const t = targetCamera();
  G.cam.x = lerp(G.cam.x, t.x, ease);
  G.cam.y = lerp(G.cam.y, t.y, ease * 0.8);
}

export function snapCamera() {
  const t = targetCamera();
  G.cam.x = t.x; G.cam.y = t.y;
}

/* ─────────────────────────────── utilidades de interfaz */

export function levelTitle() { return G.level ? G.level.name : ''; }

export function formatTime(frames) {
  const total = Math.floor(frames / 60);
  const m = String(Math.floor(total / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
}
