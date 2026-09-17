/* Todo lo que vuela: los paquetes propios, el fuego hostil y las granadas.

   El rosa de `corrupt` se dibuja acá y en ningún otro lado del reparto: es la
   promesa de que eso se puede parar, y por eso el color viene de `base.js` en
   vez de escribirse suelto. La ventana emergente la presta el spambot — un
   popup volando es literalmente el popup del spambot. */

import { G } from '../../game/state.js';
import { rgba, glow } from '../../util.js';
import {
  INK, boil, inked, disc, pill, starPath, capsulePath, shine, label, BODY,
} from '../ink.js';
import { PINK } from './base.js';
import { popupWindow } from './enemies.js';

/* ══════════════════════════════════ proyectiles */

export function drawProjectiles(ctx) {
  /* 1) estelas y halos, en aditivo */
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const b of G.bullets) {
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    if (b.trail.length > 1) {
      ctx.strokeStyle = rgba(b.color, 0.26);
      ctx.lineWidth = b.rad * 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(b.trail[b.trail.length - 1].x, b.trail[b.trail.length - 1].y);
      for (let i = b.trail.length - 2; i >= 0; i--) ctx.lineTo(b.trail[i].x, b.trail[i].y);
      ctx.lineTo(cx, cy);
      ctx.stroke();
    }
    glow(ctx, cx, cy, b.len * 1.1, b.color, 0.5);
  }
  for (const b of G.ebullets) {
    glow(ctx, b.x + b.w / 2, b.y + b.h / 2, b.w * 2.2, b.color, b.corrupt ? 0.75 : 0.55);
  }
  ctx.restore();

  /* 2) los cuerpos, con tinta, en modo normal */
  for (const b of G.bullets) bulletBody(ctx, b);
  for (const b of G.ebullets) enemyBullet(ctx, b);
  for (const g of G.grenades) grenade(ctx, g);
}

function bulletBody(ctx, b) {
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  const ang = Math.atan2(b.vy, b.vx);
  const wob = boil(b.seed, 0.22);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(ang + b.rot);

  if (b.shot === 'brick') {
    /* Firewall: un ladrillo de muro que vuela y estalla */
    const fl = 5 + Math.abs(boil(b.seed + 7, 2.4));
    starPath(ctx, -b.len / 2 - fl * 0.5, 0, fl, fl * 0.42, 5, b.t * 0.5, b.seed);
    inked(ctx, '#ffb347', 1);
    pill(ctx, -b.len / 2, -b.rad - 1, b.len, b.rad * 2 + 2, 1);
    inked(ctx, b.color, 1.4);
    ctx.strokeStyle = rgba(INK, 0.55);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-1, -b.rad - 1); ctx.lineTo(-1, b.rad + 1);
    ctx.moveTo(-b.len / 2, 0); ctx.lineTo(b.len / 2, 0);
    ctx.stroke();
  } else if (b.shot === 'spray') {
    /* Antivirus: gotas de desinfectante */
    disc(ctx, 0, 0, b.rad + 0.5 + wob, b.color, 1.2);
    shine(ctx, -b.rad * 0.3, -b.rad * 0.35, b.rad * 0.34, b.rad * 0.34, 0, 0.9);
  } else if (b.shot === 'beam') {
    /* Escáner: una lanza de inspección que atraviesa */
    const L = b.len / 2, R = b.rad + wob;
    ctx.beginPath();
    ctx.moveTo(L + 2, 0);
    ctx.quadraticCurveTo(L * 0.2, -R, -L, -R * 0.55);
    ctx.quadraticCurveTo(-L - 2, 0, -L, R * 0.55);
    ctx.quadraticCurveTo(L * 0.2, R, L + 2, 0);
    ctx.closePath();
    inked(ctx, b.color, 1.3);
    ctx.beginPath();
    ctx.moveTo(L * 0.6, 0); ctx.lineTo(-L * 0.5, 0);
    ctx.strokeStyle = b.core; ctx.lineWidth = R * 0.7; ctx.lineCap = 'round';
    ctx.stroke();
  } else {
    /* Ping / Flood: un paquete con cabecera y cola */
    capsulePath(ctx, b.len, b.rad + wob);
    inked(ctx, b.color, 1.3);
    ctx.beginPath();
    ctx.moveTo(b.len * 0.18, 0); ctx.lineTo(-b.len * 0.2, 0);
    ctx.strokeStyle = b.core; ctx.lineWidth = b.rad * 0.9; ctx.lineCap = 'round';
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-b.len / 2, -b.rad * 0.7);
    ctx.lineTo(-b.len / 2 - 3.5 - b.rad, 0);
    ctx.lineTo(-b.len / 2, b.rad * 0.7);
    ctx.closePath();
    inked(ctx, b.color, 0.9);
  }
  ctx.restore();
}

/**
 * Fuego hostil. Las teclas del keylogger se quedan quietas; los paquetes
 * corruptos son rosados y giran más rápido — el rosa es la única promesa que
 * hace el juego: eso se puede devolver.
 */
function enemyBullet(ctx, b) {
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;

  if (b.popup) { popupBullet(ctx, b, cx, cy); return; }
  if (b.glyph) { glyphBullet(ctx, b, cx, cy); return; }

  if (b.key) {
    const fade = Math.min(1, b.life / 30);
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.translate(cx, cy + Math.sin(b.t * 0.08) * 1.4);
    ctx.rotate(Math.sin(b.t * 0.05) * 0.16);
    pill(ctx, -b.w / 2, -b.w / 2, b.w, b.w, 1.6);
    inked(ctx, b.color, 1.4);
    ctx.fillStyle = INK;
    ctx.fillRect(-b.w * 0.2, -b.w * 0.2, b.w * 0.4, b.w * 0.4);
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(b.t * (b.corrupt ? 0.22 : 0.14));

  if (b.corrupt) {
    /* estrella rosa: se lee de un vistazo incluso con la pantalla llena */
    starPath(ctx, 0, 0, b.w * 0.85, b.w * 0.38, 6, 0, b.x);
    inked(ctx, PINK, 1.4);
    disc(ctx, 0, 0, b.w * 0.26, '#ffffff', 0);
  } else {
    disc(ctx, 0, 0, b.w * 0.5 + boil(b.x, 0.2), b.color, 1.2);
    ctx.fillStyle = '#fff0d8';
    ctx.beginPath();
    ctx.arc(0, 0, b.w * 0.24, 0, 6.283);
    ctx.fill();
  }

  if (b.bomb) {
    ctx.strokeStyle = rgba('#ffe7bd', 0.5 + Math.sin(b.t * 0.4) * 0.4);
    ctx.lineWidth = 1.2;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.arc(0, 0, b.w * 0.85, 0, 6.283);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

/**
 * Lo que escupe el Spambot es literalmente una ventana emergente. Se dibuja más
 * grande que su caja de golpe: una ventana del tamaño real sería un borrón, y
 * errar por poco a favor del jugador no le molesta a nadie.
 *
 * La corrupta —la única parable— conserva la púa rosa, pero detrás en vez de en
 * lugar de la ventana: la forma dice "spam" y el color sigue diciendo "parry".
 */
const CIPHER = 'ABCDEF0123456789#$%&@?!*/<>[]{}+=~';

/**
 * Lo que escupe el Ransomware: basura cifrada. Cada paquete es un carácter en
 * verde de fósforo que se revuelve mientras vuela — cambia cada cinco cuadros,
 * al ritmo del boil, así se lee como cifrado y no como ruido. Igual que la
 * ventana del spambot, se dibuja más grande que su caja de golpe.
 *
 * El corrupto conserva la púa rosa detrás: el color manda sobre la forma.
 */
function glyphBullet(ctx, b, cx, cy) {
  const size = b.w * 2.6;
  const ch = CIPHER[(b.seed + ((b.t / 5) | 0)) % CIPHER.length];
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.sin(b.t * 0.1 + b.seed) * 0.15);
  if (b.corrupt) {
    starPath(ctx, 0, 0, size * 0.75, size * 0.42, 7, b.t * 0.05, b.seed);
    inked(ctx, PINK, 1.2);
  }
  label(ctx, ch, 0, size * 0.36, size, b.corrupt ? '#ffffff' : b.color, 'center', '0', 2.4, BODY);
  ctx.restore();
}

function popupBullet(ctx, b, cx, cy) {
  const w = b.w * 2.4, h = b.w * 1.8;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.sin(b.t * 0.09) * 0.2);
  if (b.corrupt) {
    starPath(ctx, 0, 0, w * 0.8, w * 0.46, 7, b.t * 0.05, b.x);
    inked(ctx, PINK, 1.2);
  }
  popupWindow(ctx, 0, 0, w, h, b.x, b.corrupt ? PINK : '#3d6ea8');
  ctx.restore();
}

function grenade(ctx, g) {
  const cx = g.x + g.w / 2, cy = g.y + g.h / 2;
  const armed = g.t > 56 && (G.tick >> 2) % 2 === 0;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(g.rot);
  disc(ctx, 0, 0, 4.2, armed ? '#ff8c5a' : '#2f3a2b', 1.4);
  shine(ctx, -1.4, -1.6, 1, 0.8, -0.6, 0.55);
  ctx.beginPath();
  ctx.moveTo(1.6, -3.6);
  ctx.quadraticCurveTo(4.4, -5.6, 3.4, -7.6);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();

  const sx = cx + Math.cos(g.rot - 1.1) * 7.2, sy = cy + Math.sin(g.rot - 1.1) * 7.2;
  starPath(ctx, sx, sy, 3 + Math.sin(G.tick * 0.7), 1.1, 4, G.tick * 0.3, g.t);
  inked(ctx, '#ffd36a', 0.8);
}

