/* Los procesos hostiles y el despachante: `drawEnemy` es el único que sabe qué
   función dibuja cada tipo. Los tres inquilinos grandes —el mímico, el candado
   y los dos jefes— viven en sus propios archivos y entran por acá.

   Todos siguen la misma regla: color plano, contorno de tinta, y una cara que
   telegrafía antes de atacar. Si algo no tiene ojos, no es de este juego. */

import { G, P } from '../../game/state.js';
import { C2_WARN } from '../../game/enemies.js';
import { rgba, mix, lerp, glow } from '../../util.js';
import {
  INK, boil, inked, hose, disc, pill, shadeHalf, teeth,
  starPath, shine, groundShadow, label, BODY,
} from '../ink.js';
import { STEEL_D, LW, LWD, eye, brows } from './base.js';
import { monarca, baron, implanteChip } from './bosses.js';
import { phishing } from './phishing.js';
import { ransomware } from './ransomware.js';
import { rootkitBug, spywareCam, adwareBlob, popupPanel, infectedAura } from './intruders.js';

/* ══════════════════════════════════ procesos hostiles */

/* Lo que apoya proyecta sombra; lo que flota, no. La lista es de los que
   flotan, y se lee en las dos direcciones:

   · el Rootkit camuflado sí proyecta, a propósito — una sombra donde no hay
     nadie es una de las tres señales que lo delatan;
   · el Implante también, y su copia no. Ésa es la pista que resuelve la fase
     de copias, y por eso acá están nombrados uno a uno en vez de descartar a
     todos los jefes de un saque. */
const SIN_SOMBRA = new Set([
  'phishing', 'ransomware', 'mitm', 'spyware', 'ventana', 'copia', 'monarca', 'baron',
]);

export function drawEnemy(ctx, e) {
  const th = G.theme;
  const hostile = th.hostile;
  const flash = e.hit > 0;

  ctx.save();
  if (!SIN_SOMBRA.has(e.type)) {
    groundShadow(ctx, e.x + e.w / 2, e.y + e.h, e.w * 0.42, 2.4, 0.3);
  }

  switch (e.type) {
    case 'spambot':    spambot(ctx, e, th, hostile, flash);    break;
    case 'troyano':    troyano(ctx, e, th, hostile, flash);    break;
    case 'phishing':   phishing(ctx, e, th, hostile, flash);   break;
    case 'ransomware': ransomware(ctx, e, th, hostile, flash); break;
    case 'keylogger':  keylogger(ctx, e, th, hostile, flash);  break;
    case 'gusano':     gusano(ctx, e, th, hostile, flash);     break;
    case 'bicho':      bicho(ctx, e, th, hostile, flash);      break;
    case 'monarca':    monarca(ctx, e, th, hostile, flash);    break;
    case 'baron':      baron(ctx, e, th, hostile, flash);      break;
    case 'botnet':     botnetNode(ctx, e, hostile, flash);    break;
    case 'mitm':       mitmDrone(ctx, e, flash);              break;
    case 'exfil':      exfilThief(ctx, e, th, hostile, flash); break;
    case 'rootkit':    rootkitBug(ctx, e, th, hostile, flash); break;
    case 'spyware':    spywareCam(ctx, e, th, hostile, flash); break;
    case 'adware':     adwareBlob(ctx, e, th, hostile, flash); break;
    case 'ventana':    popupPanel(ctx, e, th, hostile, flash); break;
    /* el Implante y su copia comparten dibujo: si se distinguieran por la
       silueta, la fase de copias no sería un acertijo */
    case 'implante':
    case 'copia':      implanteChip(ctx, e, th, hostile, flash); break;
  }
  ctx.restore();

  /* el latido violeta del que tiene algo adentro */
  if (e.infected && !e.infected.dead) infectedAura(ctx, e);

  if (e.telegraph > 0 && !e.boss) aimLine(ctx, e, hostile);
}


/* ── Botnet: servidor C2 ──
   Un gabinete de servidor con plato de antena arriba. No tiene cara de
   enemigo de pelea, tiene cara de jefe de oficina: un solo ojo en una
   pantalla chica, que se enoja cuando manda la orden. */
function botnetNode(ctx, e, hostile, flash) {
  const x = e.x + e.w / 2, feet = e.y + e.h;
  const cmd = e.pulse > 0;
  const body = flash ? '#ffffff' : '#3e4a58';
  ctx.save();
  ctx.translate(x + boil(e.x, 0.2), feet + boil(e.x + 2, 0.2));

  /* mástil y plato: de acá salen los cables */
  ctx.beginPath();
  ctx.moveTo(0, -30); ctx.lineTo(0, -37);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -36, 6, Math.PI * 1.1, Math.PI * 1.9);
  ctx.strokeStyle = INK; ctx.lineWidth = 3.4; ctx.stroke();
  ctx.strokeStyle = flash ? '#ffffff' : '#aab4bf'; ctx.lineWidth = 1.8; ctx.stroke();
  disc(ctx, 0, -38, 1.6, cmd ? hostile : '#ffd23d', 1);

  /* gabinete */
  pill(ctx, -9, -30, 18, 30, 2.4);
  ctx.fillStyle = body;
  ctx.fill();
  shadeHalf(ctx, 0, -15, 9, 0.2);
  ctx.strokeStyle = INK; ctx.lineWidth = LW + 0.3; ctx.lineJoin = 'round';
  ctx.stroke();

  /* pantallita con un ojo */
  pill(ctx, -6, -27, 12, 8, 1.4);
  inked(ctx, cmd ? mix(hostile, '#000000', 0.4) : '#16202c', LWD);
  eye(ctx, 0, -23, 2.4, 1, hostile, cmd);
  if (cmd) brows(ctx, 0, -25.5, 1.8, 1.4);

  /* bandejas del rack con sus LEDs: titilan todos juntos al mandar la orden */
  for (let i = 0; i < 4; i++) {
    const ry = -15 + i * 3.6;
    ctx.fillStyle = rgba('#000000', 0.25);
    ctx.fillRect(-6.5, ry, 13, 1.4);
    const on = cmd ? ((G.tick >> 2) % 2 === 0) : ((e.t + i * 11) % 40) < 20;
    disc(ctx, 4.8, ry + 0.7, 0.9, on ? (cmd ? hostile : G.theme.accent) : '#23303a', 0);
  }
  ctx.restore();
}

/**
 * Los cables del C2 a cada bot enganchado. Van en una pasada propia, antes de
 * los enemigos, y no dentro del dibujo del C2: el renderizador no dibuja a los
 * que están fuera de cuadro, y con el servidor recién afuera los cables
 * desaparecían aunque los bots siguieran en pantalla.
 */
export function drawBotnetLinks(ctx) {
  for (const n of G.enemies) {
    if (n.type !== 'botnet' || n.dead || !n.links) continue;
    const ax = n.x + n.w / 2, ay = n.y - 8;
    const cmd = n.pulse > 0;
    const k = cmd ? 1 - n.pulse / C2_WARN : 0;
    for (const bot of n.links) {
      if (bot.dead) continue;
      const bx = bot.x + bot.w / 2, by = bot.y + 4;
      const mx = (ax + bx) / 2, my = Math.max(ay, by) + 22;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.quadraticCurveTo(mx, my, bx, by);
      ctx.strokeStyle = rgba(INK, 0.4); ctx.lineWidth = 2.6; ctx.lineCap = 'round';
      ctx.stroke();
      ctx.strokeStyle = rgba(cmd ? G.theme.hostile : '#6d8a9a', cmd ? 0.9 : 0.55);
      ctx.lineWidth = 1.1;
      ctx.setLineDash([4, 4]);
      ctx.lineDashOffset = -G.tick * 0.6;
      ctx.stroke();
      ctx.setLineDash([]);
      if (cmd) {
        /* la orden viajando por el cable: cuando llega, el bot telegrafía */
        const u = 1 - k;
        const qx = u * u * ax + 2 * u * k * mx + k * k * bx;
        const qy = u * u * ay + 2 * u * k * my + k * k * by;
        ctx.globalCompositeOperation = 'lighter';
        glow(ctx, qx, qy, 9, G.theme.hostile, 0.8);
      }
      ctx.restore();
    }
  }
}

/* ── Man-in-the-Middle ──
   Un dron redondo con un panel de vidrio adelante: el espejo. La sonrisa es de
   intermediario, de los que siempre cobran comisión. Cuando devuelve un tiro el
   vidrio se ilumina entero; mientras se está dando vuelta, se nota que duda. */
function mitmDrone(ctx, e, flash) {
  const x = e.x + e.w / 2, y = e.y + e.h / 2;
  const turning = e.turnT > 0;
  const shell = flash ? '#ffffff' : '#5d6a78';
  ctx.save();
  ctx.translate(x + boil(e.x, 0.25) + (turning ? Math.sin(e.t * 0.9) * 0.8 : 0), y + boil(e.x + 5, 0.25));
  ctx.scale(e.dir, 1);

  /* propulsión: un resplandor chico abajo, nada más */
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, 0, 11, 9, '#9fe8ff', 0.35 + Math.sin(e.t * 0.3) * 0.1);
  ctx.restore();

  /* antenas hacia atrás */
  for (const [ax, ay] of [[-5, -13], [-1, -14]]) {
    ctx.beginPath();
    ctx.moveTo(-2, -6); ctx.lineTo(ax, ay);
    ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
    ctx.stroke();
    disc(ctx, ax, ay, 1.2, '#ffd23d', 0.8);
  }

  /* cuerpo */
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, 6.283);
  ctx.fillStyle = shell;
  ctx.fill();
  shadeHalf(ctx, 0, 0, 8, 0.2);
  ctx.strokeStyle = INK; ctx.lineWidth = LW; ctx.stroke();

  eye(ctx, 1.4, -1.8, 2.8, 1, '#ff6a3c', false);
  ctx.beginPath();
  ctx.arc(1.6, 2.6, 2.6, 0.3, Math.PI - 0.8);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.stroke();

  /* el espejo: panel de vidrio curvo delante de la cara */
  ctx.beginPath();
  ctx.moveTo(8.5, -10);
  ctx.quadraticCurveTo(14.5, 0, 8.5, 10);
  ctx.lineTo(11, 10);
  ctx.quadraticCurveTo(17.5, 0, 11, -10);
  ctx.closePath();
  const lit = e.mirror > 0;
  ctx.fillStyle = flash ? '#ffffff' : rgba('#9fe8ff', lit ? 0.95 : 0.5);
  ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = LWD + 0.3; ctx.stroke();
  shine(ctx, 12.2, -4, 0.9, 3, 0.2, lit ? 1 : 0.6);
  if (lit) {
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, 13, 0, 14, '#9fe8ff', e.mirror / 10);
  }
  ctx.restore();
}

/* ── Exfiltrador ──
   Un ladrón encapuchado con un visor, corriendo agachado con una bolsa al
   hombro. La bolsa crece con lo que se lleva y se le ven brillar los
   fragmentos adentro: es la forma de leer, de lejos, cuánto te está costando
   dejarlo ir. */
function exfilThief(ctx, e, th, hostile, flash) {
  const x = e.x + e.w / 2, feet = e.y + e.h;
  const fleeing = e.state === 'huida';
  const crouch = e.telegraph > 0 ? 0.82 : 1;
  const run = Math.sin(e.anim);
  const cloth = flash ? '#ffffff' : '#2c2438';

  ctx.save();
  ctx.translate(x + boil(e.x, 0.25), feet + boil(e.x + 3, 0.25));
  ctx.scale(e.dir, crouch);
  if (fleeing) ctx.rotate(0.28);

  /* piernas */
  for (const s of [-1, 1]) {
    const fx = s * run * 3.2;
    hose(ctx, s * 1.2, -6, fx * 0.7, -3, fx, -0.8, 2.2, s < 0 ? mix(cloth, '#000000', 0.3) : cloth, LW);
  }

  /* la bolsa, atrás: crece con el botín */
  const bag = 3 + e.stolen * 1.6;
  ctx.beginPath();
  ctx.arc(-5, -12, bag, 0, 6.283);
  ctx.fillStyle = flash ? '#ffffff' : '#8a6a44';
  ctx.fill();
  shadeHalf(ctx, -5, -12, bag, 0.2);
  ctx.strokeStyle = INK; ctx.lineWidth = LWD + 0.3; ctx.stroke();
  for (let i = 0; i < e.stolen; i++) {
    if (((G.tick >> 3) + i) % 3 !== 0) continue;
    starPath(ctx, -5 + (i - 1) * 2.2, -12 - 1.5, 1.8, 0.7, 4, G.tick * 0.1, i);
    inked(ctx, th.accent, 0);
  }

  /* capucha */
  ctx.beginPath();
  ctx.moveTo(-5, -5);
  ctx.quadraticCurveTo(-6, -17, 1, -19);
  ctx.quadraticCurveTo(7, -17, 6, -5);
  ctx.closePath();
  ctx.fillStyle = cloth;
  ctx.fill();
  shadeHalf(ctx, 0, -12, 7, 0.18);
  ctx.strokeStyle = INK; ctx.lineWidth = LW; ctx.stroke();

  /* visor: una ranura encendida; destella antes de lanzarse */
  pill(ctx, 0.5, -14, 5.5, 2.4, 1);
  inked(ctx, e.telegraph > 0 ? hostile : '#4fe8b0', 0.9);
  if (e.telegraph > 0) {
    starPath(ctx, 5, -13, 4, 1.2, 4, G.tick * 0.2, e.x);
    inked(ctx, '#ffffff', 0);
  }
  ctx.restore();
}

function aimLine(ctx, e, hostile) {
  const from = muzzleOf(e);
  const tx = P.x + P.w / 2, ty = P.y + P.h / 2;
  const k = 1 - e.telegraph / 34;
  ctx.save();
  ctx.strokeStyle = rgba(hostile, 0.25 + k * 0.5);
  ctx.lineWidth = 1 + k * 0.8;
  ctx.lineCap = 'round';
  ctx.setLineDash([2.5, 5.5]);
  ctx.lineDashOffset = -G.tick * 1.6;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  ctx.restore();
}

function muzzleOf(e) {
  if (e.type === 'ransomware') {
    return { x: e.x + e.w / 2 + Math.cos(e.ang) * 13, y: e.y + e.h / 2 + Math.sin(e.ang) * 13 };
  }
  // el spambot apunta con el embudo, que le asoma bastante más que la caja
  if (e.type === 'spambot') return { x: e.x + e.w / 2 + e.dir * 13, y: e.y + 11 };
  // el phishing tira desde el nudo de la tanza, abajo del tórax
  if (e.type === 'phishing') return { x: e.x + e.w / 2, y: e.y + e.h / 2 + 3 };
  return { x: e.x + e.w / 2 + e.dir * (e.w / 2), y: e.y + (e.type === 'troyano' ? 13 : 11) };
}

/* ── Spambot ──
   Un robot de chapa: caja sobre caja, remaches a la vista, antena que se
   enciende cuando te apunta, y un embudo en el brazo de adelante por el que
   salen escupidas las ventanas. Todo ángulo recto — es lo contrario de Bit,
   que es todo curva, y esa oposición es la que hace legible quién es quién. */
function spambot(ctx, e, th, hostile, flash) {
  const body = flash ? '#ffffff' : '#828f88';
  const dark = flash ? '#ffffff' : '#4b585b';
  const trim = flash ? '#ffffff' : '#333d42';
  const x = e.x + e.w / 2, feet = e.y + e.h, f = e.dir;
  /* `e.anim` sólo avanza cuando el robot da pasos — también en combate, que
     ahora se reposiciona. Al frenar la pierna queda a mitad de tranco, que es
     exactamente lo que hace una máquina cuando se detiene. */
  const walk = Math.sin(e.anim);
  const alert = e.telegraph > 0;
  const ready = e.state === 'combate' ? 1 : 0;
  const kick = e.popup > 0 ? e.popup / 10 : 0;   // retroceso del último disparo

  /* el brazo baja en patrulla y se endereza en combate; el embudo termina
     justo donde game/enemies.js hace nacer la ventana */
  const ax = lerp(6.6, 8.4, ready) - kick * 2;
  const ay = lerp(-12.4, -15.4, ready);

  /* la ráfaga de ventanas saliendo de la boca del embudo */
  if (e.popup > 0) {
    const k = e.popup / 10;
    const mx = x + f * 13, my = feet - 15.4;
    for (let i = 0; i < 3; i++) {
      const a = (i - 1) * 0.55;
      const d = (1 - k) * 15 + 5;
      ctx.save();
      ctx.globalAlpha = k * 0.85;
      popupWindow(ctx, mx + f * Math.cos(a) * d, my + Math.sin(a) * d, 11, 8, i + e.x);
      ctx.restore();
    }
  }

  ctx.save();
  ctx.translate(x + boil(e.x, 0.25), feet + boil(e.x + 1, 0.25));
  ctx.scale(f, 1);

  /* ── patas: dos cajas cortas con el pie plano mirando adelante ── */
  for (const [side, col] of [[-1, dark], [1, body]]) {
    const sw = side * walk * 2.4;
    const lift = Math.max(0, side * walk) * 1.5;
    ctx.save();
    ctx.translate(sw + side * 2.2, -lift);
    pill(ctx, -1.9, -9.5, 3.8, 7.2, 1.1);
    inked(ctx, col, LW);
    pill(ctx, -2.6, -3.2, 7, 3.4, 1);
    inked(ctx, mix(col, '#000000', 0.25), LW);
    ctx.restore();
  }

  /* ── brazo de atrás: cuelga y acompaña el paso ── */
  const swing = walk * 1.8;
  armSeg(ctx, -5.4, -18, -7.4, -12.4 + swing, 3.4, dark);
  disc(ctx, -7.4, -12.4 + swing, 2, mix(dark, '#000000', 0.2), LWD);

  /* ── torso: la caja principal ── */
  pill(ctx, -7, -19.5, 14, 11.4, 2);
  ctx.fillStyle = body;
  ctx.fill();
  shadeHalf(ctx, 0, -14, 7.5, 0.18);
  ctx.strokeStyle = INK; ctx.lineWidth = LW + 0.3; ctx.lineJoin = 'round';
  ctx.stroke();

  /* chapa atornillada, rejilla de ventilación y remaches */
  ctx.save();
  ctx.strokeStyle = rgba(INK, 0.4); ctx.lineWidth = 0.9; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-6.2, -13.4); ctx.lineTo(6.2, -13.4);
  ctx.stroke();
  ctx.strokeStyle = rgba(INK, 0.45); ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-3.4, -11.9 + i * 1.4); ctx.lineTo(3.4, -11.9 + i * 1.4);
    ctx.stroke();
  }
  ctx.restore();
  for (const [rx, ry] of [[-5.3, -17.9], [5.3, -17.9], [-5.3, -9.6], [5.3, -9.6]]) {
    disc(ctx, rx, ry, 0.75, trim, 0);
  }

  /* piloto de spam en el pecho: se enciende cuando te tiene apuntado */
  disc(ctx, 0, -16.6, 2, alert ? hostile : '#ffb23d', LWD);
  shine(ctx, -0.6, -17.3, 0.7, 0.4, -0.4, 0.7);

  /* ── cuello y cabeza ── */
  pill(ctx, -2.6, -21.4, 5.2, 2.9, 0.8);
  inked(ctx, trim, LWD);

  pill(ctx, -6.5, -30, 13, 9.5, 2);
  ctx.fillStyle = body;
  ctx.fill();
  shadeHalf(ctx, 0, -25, 7, 0.18);
  ctx.strokeStyle = INK; ctx.lineWidth = LW + 0.3; ctx.lineJoin = 'round';
  ctx.stroke();

  /* pernos a los costados, en lugar de orejas */
  for (const bx of [-6.4, 6.4]) disc(ctx, bx, -24.8, 1.4, trim, LWD);

  eye(ctx, -2.5, -25.9, 2.1, 1, hostile, alert);
  eye(ctx, 2.7, -26.1, 2.3, 1, hostile, alert);
  brows(ctx, 0.1, -28.2, 2.1, alert ? 1.5 : 0.8);

  /* boca de rejilla: barrotes de chapa, y dientes cuando está por escupir */
  pill(ctx, -4, -23.2, 8, 2.4, 0.7);
  inked(ctx, alert ? mix(hostile, '#000000', 0.4) : trim, LWD);
  if (alert) {
    teeth(ctx, -3.6, -23, 7.2, 2, 5);
  } else {
    ctx.save();
    ctx.strokeStyle = rgba('#cfe0d8', 0.5); ctx.lineWidth = 0.8;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 1.5, -22.9); ctx.lineTo(i * 1.5, -21.1);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* antena: el bulbo late en rojo mientras te apunta */
  ctx.beginPath();
  ctx.moveTo(1.8, -30);
  ctx.quadraticCurveTo(4.4, -32.4, 3.2, -34);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
  ctx.stroke();
  if (alert) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, 3.1, -34.9, 8, hostile, 0.45);
    ctx.restore();
  }
  disc(ctx, 3.1, -34.9, 1.8, alert ? hostile : '#ffd23d', 1.2);

  /* ── brazo de adelante: el emisor, con el embudo en la punta ── */
  armSeg(ctx, 5, -18, ax, ay, 3.8, body);
  disc(ctx, ax, ay, 2.2, mix(body, '#000000', 0.15), LWD);
  ctx.save();
  ctx.translate(ax, ay);
  ctx.rotate(lerp(0.45, 0, ready));
  ctx.beginPath();
  ctx.moveTo(0.6, -2.3);
  ctx.lineTo(4.4, -3.9);
  ctx.lineTo(4.4, 3.9);
  ctx.lineTo(0.6, 2.3);
  ctx.closePath();
  inked(ctx, trim, LW);
  pill(ctx, 3.9, -3.5, 1.6, 7, 0.6);
  inked(ctx, alert ? hostile : dark, LWD);
  /* fogonazo: la ventana saliendo a presión */
  if (e.popup > 6) {
    const fk = (e.popup - 6) / 4;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, 6, 0, 10 * fk, '#ffd27a', 0.5 * fk);
    ctx.restore();
    starPath(ctx, 6.4, 0, 5.4 * fk, 2.2 * fk, 5, e.t * 0.3, e.x);
    inked(ctx, '#ffc24a', 1);
  }
  ctx.restore();
  ctx.restore();
}

/** Segmento de brazo robótico: una caja con la junta redonda en cada punta. */
function armSeg(ctx, x1, y1, x2, y2, w, col) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  ctx.save();
  ctx.translate(x1, y1);
  ctx.rotate(Math.atan2(y2 - y1, x2 - x1));
  pill(ctx, -w * 0.4, -w / 2, len + w * 0.8, w, w * 0.32);
  ctx.fillStyle = col;
  ctx.fill();
  shadeHalf(ctx, len / 2, 0, w, 0.2);
  ctx.strokeStyle = INK; ctx.lineWidth = LW; ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
}

/** Ventanita emergente: barra de título, cruz de cerrar y un renglón. */
export function popupWindow(ctx, x, y, w, h, seed, accent = '#3d6ea8') {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(boil(seed * 3 + x, 0.14));
  pill(ctx, -w / 2, -h / 2, w, h, 1);
  inked(ctx, '#f3ead4', 1.2);
  ctx.fillStyle = accent;
  ctx.fillRect(-w / 2 + 0.8, -h / 2 + 0.8, w - 1.6, 2.4);
  ctx.strokeStyle = '#f3ead4';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(w / 2 - 3, -h / 2 + 1.4); ctx.lineTo(w / 2 - 1.8, -h / 2 + 2.6);
  ctx.moveTo(w / 2 - 1.8, -h / 2 + 1.4); ctx.lineTo(w / 2 - 3, -h / 2 + 2.6);
  ctx.stroke();
  ctx.strokeStyle = rgba(INK, 0.5);
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-w / 2 + 2, 1); ctx.lineTo(w / 2 - 2, 1);
  ctx.moveTo(-w / 2 + 2, 3); ctx.lineTo(w / 2 - 4, 3);
  ctx.stroke();
  ctx.restore();
}

/* ── Troyano ──
   Un caballo de madera con cabezota, sonrisa de tablones y ruedas chiquitas.
   Toda la expresión está en la cabeza: el cuerpo es un barril con carga. */
function troyano(ctx, e, th, hostile, flash) {
  const wood = flash ? '#ffffff' : '#b0763a';
  const dark = flash ? '#ffffff' : '#7a4f27';
  const x = e.x + e.w / 2, feet = e.y + e.h, f = e.dir;
  const roll = e.anim * 2;
  const alert = e.telegraph > 0;
  const open = e.hp < e.maxHp * 0.45 ? 1.4 + Math.sin(G.tick * 0.2) * 0.6 : 0;

  ctx.save();
  ctx.translate(x + boil(e.x, 0.3), feet + boil(e.x + 2, 0.3));
  ctx.scale(f, 1);

  /* ruedas: chicas a propósito, para que el cuerpo se vea pesado */
  for (const wx of [-6.5, 5.5]) {
    ctx.save();
    ctx.translate(wx, -3.2);
    ctx.rotate(roll);
    ctx.beginPath();
    ctx.arc(0, 0, 3.2, 0, 6.283);
    ctx.fillStyle = dark;
    ctx.fill();
    shadeHalf(ctx, 0, 0, 3.2, 0.2);
    ctx.strokeStyle = INK; ctx.lineWidth = LW;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-2.6, 0); ctx.lineTo(2.6, 0);
    ctx.moveTo(0, -2.6); ctx.lineTo(0, 2.6);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  /* barril: cuerpo de tablones con las duelas marcadas */
  ctx.beginPath();
  ctx.moveTo(-9.5, -7);
  ctx.quadraticCurveTo(-12, -14, -9.5, -21);
  ctx.lineTo(8.5, -21);
  ctx.quadraticCurveTo(11, -14, 8.5, -7);
  ctx.closePath();
  ctx.fillStyle = wood;
  ctx.fill();
  shadeHalf(ctx, 0, -14, 11, 0.16);
  ctx.strokeStyle = INK; ctx.lineWidth = LW + 0.3; ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = rgba(INK, 0.35);
  ctx.lineWidth = 1;
  for (let i = -6; i <= 6; i += 4) {
    ctx.beginPath(); ctx.moveTo(i, -22); ctx.lineTo(i, -6); ctx.stroke();
  }
  /* zunchos de hierro */
  ctx.strokeStyle = rgba(INK, 0.55);
  ctx.lineWidth = 1.8;
  for (const yy of [-18, -10]) {
    ctx.beginPath(); ctx.moveTo(-12, yy); ctx.lineTo(12, yy); ctx.stroke();
  }
  ctx.restore();

  /* escotilla: se entreabre y asoman los bichos cuando está por reventar */
  pill(ctx, -4.5, -15 - open, 9, 6.5, 1.5);
  inked(ctx, dark, LWD);
  if (open > 0) {
    ctx.fillStyle = '#16190f';
    ctx.fillRect(-3.6, -14.4 - open, 7.2, 2.6);
    disc(ctx, -1.6, -13.2 - open, 1, '#9fe86a', 0);
    disc(ctx, 1.8, -13.6 - open, 1, '#9fe86a', 0);
  }

  /* ── cabeza: grande, con hocico y sonrisa ── */
  ctx.save();
  ctx.translate(9, -25);
  /* cuello corto */
  ctx.beginPath();
  ctx.moveTo(-4.5, 8);
  ctx.quadraticCurveTo(-2, 2, -1, -2);
  ctx.lineTo(4, -2);
  ctx.quadraticCurveTo(4, 4, 2, 8);
  ctx.closePath();
  inked(ctx, dark, LW);

  /* cráneo + hocico, de una sola pieza */
  ctx.beginPath();
  ctx.moveTo(-5, -1);
  ctx.quadraticCurveTo(-6.5, -9, -1, -10.5);
  ctx.quadraticCurveTo(6, -11.5, 9, -8);
  ctx.quadraticCurveTo(13.5, -6.5, 12.5, -2);
  ctx.quadraticCurveTo(11.5, 2.5, 6, 2.5);
  ctx.quadraticCurveTo(0, 3.5, -5, -1);
  ctx.closePath();
  ctx.fillStyle = wood;
  ctx.fill();
  shadeHalf(ctx, 2, -4, 9, 0.16);
  ctx.strokeStyle = INK; ctx.lineWidth = LW + 0.3;
  ctx.stroke();

  /* orejas */
  for (const [ox, oy] of [[-2.5, -10], [1.5, -10.8]]) {
    ctx.beginPath();
    ctx.moveTo(ox - 1.6, oy + 1);
    ctx.lineTo(ox, oy - 4.2);
    ctx.lineTo(ox + 1.8, oy + 0.6);
    ctx.closePath();
    inked(ctx, dark, LWD);
  }

  /* ojo grande y ceja: el caballo está de mal humor */
  eye(ctx, 1.4, -5.6, 3.1, 1, hostile, alert);
  brows(ctx, 1.4, -7.6, 3, alert ? 1.5 : 0.9);

  /* ollar y sonrisa de dientes cuadrados */
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.arc(10.4, -3.6, 1, 0, 6.283); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(4, 0.6);
  ctx.quadraticCurveTo(7.5, 2.6, 11, 0.2);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.3; ctx.lineCap = 'round';
  ctx.stroke();
  if (alert) teeth(ctx, 4.6, 0.6, 6, 1.6, 4);
  ctx.restore();

  /* escudo frontal atornillado al barril */
  pill(ctx, 5.5, -21, 5.6, 14.5, 2.2);
  ctx.fillStyle = flash ? '#ffffff' : mix(th.rock.edge, '#ffffff', 0.25);
  ctx.fill();
  shadeHalf(ctx, 8, -14, 7, 0.18);
  ctx.strokeStyle = INK; ctx.lineWidth = LW;
  ctx.stroke();
  for (let i = 0; i < 3; i++) disc(ctx, 8.3, -18.5 + i * 5, 0.9, INK, 0);

  /* cañón, asomando por el costado del escudo */
  pill(ctx, 8, -16.4, 13.5, 4.6, 2);
  inked(ctx, flash ? '#ffffff' : STEEL_D, LWD);
  ctx.restore();

  if (e.charge > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, x, feet - 14, 22, hostile, 0.35);
    ctx.restore();
  }
}

/* Keylogger: una máquina de escribir, y a propósito la única cosa del reparto
   que no tiene cara de bicho. Todo lo demás son criaturas redondas con dos ojos
   y dientes; ésta es un aparato — chasis rectangular, rodillo, carro y teclado—
   con un solo ojo de vidrio arriba del carro, que es lo que la deja adentro de
   la regla de la casa. Se la reconoce de lejos por la silueta: donde los otros
   son panza, ésta es máquina.

   El renglón que escribió no es adorno: `e.log` son las teclas que ya registró
   y todavía no transmitió, y se dibujan sobre el rodillo. Eso es el aviso. */
function keylogger(ctx, e, th, hostile, flash) {
  const body = flash ? '#ffffff' : '#8a77a6';
  const cap  = flash ? '#ffffff' : '#e2dccc';
  const x = e.x + e.w / 2, y = e.y + e.h / 2, s = e.surface;
  const typing = e.state === 'registro';
  const hit = e.strike > 0 ? Math.sin((8 - e.strike) / 8 * Math.PI) : 0;

  ctx.save();
  ctx.translate(x + boil(e.x, 0.22), y + boil(e.x + 6, 0.22));
  ctx.scale(e.dir, s);      // el eje vertical se invierte si va por el techo

  /* patitas de barra de tipos: cuatro, en oleada */
  for (let i = -1; i <= 2; i++) {
    const lx = i * 5 - 3.5;
    const ph = e.seg + i * 0.9;
    ctx.beginPath();
    ctx.moveTo(lx, 5.2);
    ctx.quadraticCurveTo(lx + Math.sin(ph) * 1.4, 7.4, lx + Math.sin(ph) * 2.4, 8.6);
    ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    ctx.stroke();
  }

  /* chasis: cuña de máquina, más alta atrás que adelante */
  ctx.beginPath();
  ctx.moveTo(-11, 5.4);
  ctx.lineTo(-11.5, -1.6);
  ctx.lineTo(-6, -4.4);
  ctx.lineTo(9.5, -4.4);
  ctx.lineTo(11.5, 0.6);
  ctx.lineTo(10.5, 5.4);
  ctx.closePath();
  inked(ctx, body, LW);
  shadeHalf(ctx, 0, 1.5, 11, 0.18);

  /* teclado: dos filas de teclitas escalonadas. La que está golpeando se hunde */
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 4; i++) {
      const kx = -8 + i * 4.2 + row * 1.5;
      const ky = 3.2 - row * 2.4;
      const down = typing && hit > 0 && i === (e.log.length + row) % 4 ? hit * 1.1 : 0;
      pill(ctx, kx - 1.5, ky - 1.3 + down, 3, 2.6, 0.9);
      ctx.fillStyle = cap; ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.stroke();
    }
  }

  /* la hoja: sale del rodillo mientras escribe, y se corta al transmitir. Va
     antes que el carro para que las teclas registradas se apoyen sobre ella */
  if (typing || e.log.length) {
    ctx.beginPath();
    ctx.moveTo(-3, -7.2);
    ctx.lineTo(-3.6, -13 - e.log.length * 0.9);
    ctx.lineTo(4.4, -13 - e.log.length * 0.9);
    ctx.lineTo(3.8, -7.2);
    ctx.closePath();
    inked(ctx, flash ? '#ffffff' : '#f6e7c4', 1.2);
  }

  /* rodillo y carro, atravesados arriba; el carro corre con el renglón */
  const run = e.log.length / 3;
  ctx.save();
  ctx.translate(-2.5 + run * 5, -5.6);
  ctx.beginPath();
  ctx.moveTo(-8, 0); ctx.lineTo(8, 0);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
  ctx.stroke();
  pill(ctx, -7.5, -3.4, 15, 3.6, 1.8);
  inked(ctx, flash ? '#ffffff' : '#4a3d5c', 1.4);
  shine(ctx, -3.5, -2.6, 3.4, 0.7, 0, 0.35);

  /* el renglón registrado: una tecla por golpe, a la vista sobre el rodillo */
  for (let i = 0; i < e.log.length; i++) {
    const kx = -5 + i * 5;
    const pop = i === e.log.length - 1 ? hit * 1.6 : 0;
    pill(ctx, kx - 2, -7.6 - pop, 4, 4, 1.1);
    inked(ctx, cap, 1.2);
    ctx.save();
    ctx.scale(e.dir, s);      // la letra se lee derecha, mire para donde mire
    label(ctx, e.log[i], e.dir * kx, s * (-5.6 - pop) + 1.5, 4.4, INK, 'center', '0', 0, BODY);
    ctx.restore();
  }
  ctx.restore();

  /* ojo de vidrio sobre el carro: lo único vivo de la máquina */
  const ex = 5.5, ey = -1.4;
  disc(ctx, ex, ey, 3.4, flash ? '#ffffff' : '#241d33', LW);
  ctx.save();
  ctx.scale(e.dir, s);
  eye(ctx, e.dir * ex, s * ey, 2.2, 1, hostile, typing || e.aggro > 0);
  ctx.restore();

  /* campanilla: cuelga del chasis y tiembla cuando el renglón se fue */
  const ring = e.ring > 0 ? Math.sin(e.ring * 0.9) * 1.3 : 0;
  disc(ctx, -8.6 + ring, -2.6, 2.1, flash ? '#ffffff' : '#e8a63d', 1.4);
  if (e.ring > 0) {
    ctx.strokeStyle = rgba('#ffe7bd', 0.5);
    ctx.lineWidth = 1;
    for (const r of [4, 6.5]) {
      ctx.beginPath();
      ctx.arc(-8.6, -2.6, r + (18 - e.ring) * 0.3, -2.4, -0.4);
      ctx.stroke();
    }
  }

  ctx.restore();
}

/* ── Worm ──
   Casi todo cabeza, con dos dientes de conejo y cara de estar tramando algo.
   Cuando está por partirse se hincha y late: el aviso es el diseño. */
function gusano(ctx, e, th, hostile, flash) {
  const skin = flash ? '#ffffff' : '#93d45f';
  const x = e.x + e.w / 2, y = e.y + e.h / 2;
  const near = e.onGround && e.split < 45;
  const pulse = near ? 1 + Math.sin(G.tick * 0.45) * 0.16 : 1;

  ctx.save();
  ctx.translate(x + boil(e.x, 0.3), y + boil(e.x + 7, 0.3));
  ctx.scale(e.dir * pulse, pulse);

  /* cola segmentada, que sale por detrás */
  for (let i = 3; i >= 1; i--) {
    const off = -i * 3 - 1;
    const wob = Math.sin(e.anim - i * 0.7) * 1.5;
    ctx.beginPath();
    ctx.arc(off, wob, 3.6 - i * 0.55, 0, 6.283);
    ctx.fillStyle = mix(skin, INK, 0.1 * i);
    ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.4;
    ctx.stroke();
  }

  /* cabezota */
  ctx.beginPath();
  ctx.ellipse(1.4, -0.4, 5.6, 5.2, 0, 0, 6.283);
  ctx.fillStyle = skin;
  ctx.fill();
  shadeHalf(ctx, 1.4, -0.4, 5.6, 0.16);
  ctx.strokeStyle = INK; ctx.lineWidth = LW + 0.2;
  ctx.stroke();

  eye(ctx, -0.6, -1.6, 2.3, 1, hostile, near);
  eye(ctx, 3.6, -1.8, 2.5, 1, hostile, near);
  brows(ctx, 1.5, -3.6, 2.4, near ? 1.4 : 0.6);

  /* sonrisa con dos dientes de conejo */
  ctx.beginPath();
  ctx.arc(1.6, 1.4, 2.6, 0.2, Math.PI - 0.2);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
  ctx.stroke();
  teeth(ctx, 0.2, 1.6, 2.8, 2, 2);

  if (near) {
    /* línea de fisura: por dónde se va a abrir */
    ctx.strokeStyle = rgba('#f2ffe0', 0.5 + Math.sin(G.tick * 0.45) * 0.4);
    ctx.lineWidth = 1.3;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(1.4, -5.6); ctx.lineTo(1.4, 4.8);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

/* ── Bicho ──
   La carga del troyano. A este tamaño lo único que se lee son los ojos, así que
   es casi todo ojos: dos platos blancos sobre un cuerpo minúsculo. */
function bicho(ctx, e, th, hostile, flash) {
  const skin = flash ? '#ffffff' : '#9fe86a';
  const x = e.x + e.w / 2, y = e.y + e.h / 2;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(e.dir, 1);
  for (let i = -1; i <= 1; i++) {
    const ph = e.anim + i * 1.1;
    ctx.beginPath();
    ctx.moveTo(i * 2.6, 2.6);
    ctx.lineTo(i * 2.6 + Math.sin(ph) * 2.4, 6.4);
    ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.ellipse(0, 0.6, 5.2, 4.4, 0, 0, 6.283);
  ctx.fillStyle = skin;
  ctx.fill();
  shadeHalf(ctx, 0, 0.6, 5.2, 0.16);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.6;
  ctx.stroke();
  eye(ctx, -1.8, -1.4, 2.3, 1, hostile, false);
  eye(ctx, 2.4, -1.6, 2.5, 1, hostile, false);
  ctx.restore();
}

