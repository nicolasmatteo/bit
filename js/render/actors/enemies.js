/* Los procesos hostiles y el despachante: `drawEnemy` es el único que sabe qué
   función dibuja cada tipo. Los tres inquilinos grandes —el mímico, el candado
   y los dos jefes— viven en sus propios archivos y entran por acá.

   Todos siguen la misma regla: color plano, contorno de tinta, y una cara que
   telegrafía antes de atacar. Si algo no tiene ojos, no es de este juego. */

import { G, P } from '../../game/state.js';
import { C2_WARN, C2_SHIELD, SHIELD_COLOR, troyanoMuzzle } from '../../game/enemies.js';
import { KEYLOG } from '../../config.js';
import { rgba, mix, lerp, glow, rnd, clamp } from '../../util.js';
import {
  INK, PAPER, PAPER_LO, boil, inked, hose, disc, pill, shadeHalf, teeth,
  starPath, shine, groundShadow,
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
  /* el eco camina por el piso pero no lo toca: es una grabación, y en este juego
     lo que no es de verdad no proyecta. La misma pista que da la copia. */
  'eco',
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
    case 'eco':        ecoShade(ctx, e, flash);                break;
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

  /* y la burbuja del que está colgado de un C2 vivo */
  if (e.c2 && !e.c2.dead) shieldBubble(ctx, e);

  if (e.telegraph > 0 && !e.boss) aimLine(ctx, e, hostile);
}


/**
 * La burbuja del bot enganchado. Está siempre, muy tenue: tiene que alcanzar
 * para que se lea "esto no se puede romper" antes de gastarle el primer tiro, y
 * no tanto como para tapar al bicho. Cuando algo le rebota se enciende de golpe
 * y muestra las costuras del hexágono, que es lo que la vuelve una pared y no
 * un aura más.
 */
function shieldBubble(ctx, e) {
  const k = e.shield > 0 ? e.shield / C2_SHIELD : 0;
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
  const r = Math.max(e.w, e.h) * 0.62 + 3 + k * 2.5;
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r * 1.06;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = rgba(SHIELD_COLOR, 0.05 + k * 0.22);
  ctx.fill();
  ctx.strokeStyle = rgba(SHIELD_COLOR, 0.22 + k * 0.68);
  ctx.lineWidth = 1 + k * 1.4;
  ctx.lineJoin = 'round';
  ctx.stroke();
  /* las costuras: sólo mientras dura el rebote */
  if (k > 0) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 1.06);
    }
    ctx.strokeStyle = rgba(SHIELD_COLOR, k * 0.3);
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
  ctx.restore();
}

/* ── Botnet: servidor C2 ──
   Un gabinete de servidor con plato de antena arriba. No tiene cara de
   enemigo de pelea, tiene cara de jefe de oficina: un solo ojo en una
   pantalla chica, que se enoja cuando manda la orden. */
function botnetNode(ctx, e, hostile, flash) {
  const x = e.x + e.w / 2, feet = e.y + e.h;
  const cmd = e.pulse > 0;
  /* si alguno de los suyos está aguantando un tiro, el plato lo acusa: el
     servidor es el que está pagando ese escudo */
  const guard = !!e.links && e.links.some(b => !b.dead && b.shield > 0);
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
  disc(ctx, 0, -38, 1.6, cmd ? hostile : guard ? SHIELD_COLOR : '#ffd23d', 1);
  if (guard) glow(ctx, 0, -37, 9, SHIELD_COLOR, 0.5);

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
      /* al rebotar un tiro el cable se enciende entero, del bot al servidor: es
         el que contesta por qué ese disparo no entró */
      const guard = bot.shield > 0 ? bot.shield / C2_SHIELD : 0;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.quadraticCurveTo(mx, my, bx, by);
      ctx.strokeStyle = rgba(INK, 0.4); ctx.lineWidth = 2.6 + guard * 1.4; ctx.lineCap = 'round';
      ctx.stroke();
      ctx.strokeStyle = guard ? rgba(SHIELD_COLOR, 0.5 + guard * 0.5)
                              : rgba(cmd ? G.theme.hostile : '#6d8a9a', cmd ? 0.9 : 0.55);
      ctx.lineWidth = 1.1 + guard * 1.2;
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
  // el troyano tiene el cañón a media altura del cajón, y su punto es el mismo
  // que usa la IA para tirar: no hay dos versiones de dónde está la boca
  if (e.type === 'troyano') return troyanoMuzzle(e);
  return { x: e.x + e.w / 2 + e.dir * (e.w / 2), y: e.y + 11 };
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
   El caballo de Troya, que acá es literal: un caballo de madera montado sobre
   una cureña, del tamaño de una máquina de asedio. No es un bicho, es un
   transporte — por eso lleva arnés, bridas y bulones, cosas que alguien le puso.

   Lo que manda el diseño es que se pueda leer QUÉ trae adentro antes de
   abrirlo. Tiene tres ventanillas en el costado y en cada una se ve la silueta
   de un pasajero: la tecla del Keylogger, el ojo del Gusano, la cerradura del
   Ransomware. Van apagadas mientras el caballo está entero y se encienden —y
   golpean el vidrio— a medida que se le cae la vida. Cuando revienta no hay
   sorpresa: sale exactamente lo que estabas mirando hace rato (ver spillTrojan).

   Toda la expresión sigue estando en la cabeza. El cuerpo es carga. */

const VENTANILLAS = [
  { x: -13, glifo: 'tecla' },      // Keylogger
  { x: -1,  glifo: 'ojo' },        // Gusano
  { x: 11,  glifo: 'cerradura' },  // Ransomware
];

function troyano(ctx, e, th, hostile, flash) {
  const wood = flash ? '#ffffff' : '#b0763a';
  const dark = flash ? '#ffffff' : '#7a4f27';
  const grano = flash ? '#ffffff' : '#c98d4e';
  const x = e.x + e.w / 2, feet = e.y + e.h, f = e.dir;
  const roll = e.anim * 1.5;
  const alert = e.telegraph > 0;
  /* cuánto "despertó" la carga: 0 entero, 1 a punto de reventar */
  const carga = clamp(1 - e.hp / (e.maxHp * 0.75), 0, 1);
  const open = carga > 0.4 ? 1.6 + Math.sin(G.tick * 0.2) * 0.8 : 0;

  ctx.save();
  ctx.translate(x + boil(e.x, 0.3), feet + boil(e.x + 2, 0.3));
  ctx.scale(f, 1);

  /* ── cureña: tres ruedas de carro, la del medio más chica ── */
  for (const [wx, wr] of [[-15, 7], [0, 5.5], [15, 7]]) {
    ctx.save();
    ctx.translate(wx, -wr - 0.5);
    ctx.rotate(roll);
    ctx.beginPath();
    ctx.arc(0, 0, wr, 0, 6.283);
    ctx.fillStyle = dark;
    ctx.fill();
    shadeHalf(ctx, 0, 0, wr, 0.22);
    ctx.strokeStyle = INK; ctx.lineWidth = LW;
    ctx.stroke();
    /* rayos: cuatro, para que se vea girar */
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI;
      ctx.moveTo(Math.cos(a) * (wr - 1.2), Math.sin(a) * (wr - 1.2));
      ctx.lineTo(-Math.cos(a) * (wr - 1.2), -Math.sin(a) * (wr - 1.2));
    }
    ctx.lineWidth = 1.1;
    ctx.stroke();
    disc(ctx, 0, 0, 1.4, grano, 0.9);
    ctx.restore();
  }

  /* viga del eje, de rueda a rueda */
  pill(ctx, -20, -16, 40, 5, 1.6);
  inked(ctx, dark, LWD);

  /* ── el cajón: tablones verticales, panza leve, zunchos de hierro ── */
  ctx.beginPath();
  ctx.moveTo(-20, -15);
  ctx.quadraticCurveTo(-24, -32, -20, -47);
  ctx.lineTo(15, -47);
  ctx.quadraticCurveTo(19, -32, 15, -15);
  ctx.closePath();
  ctx.fillStyle = wood;
  ctx.fill();
  shadeHalf(ctx, -2, -31, 22, 0.18);
  ctx.strokeStyle = INK; ctx.lineWidth = LW + 0.4; ctx.lineJoin = 'round';
  ctx.stroke();

  ctx.save();
  ctx.clip();
  /* veta de los tablones */
  ctx.strokeStyle = rgba(INK, 0.28);
  ctx.lineWidth = 1;
  for (let i = -17; i <= 13; i += 5) {
    ctx.beginPath(); ctx.moveTo(i, -49); ctx.lineTo(i, -13); ctx.stroke();
  }
  /* zunchos con bulones */
  for (const yy of [-42, -20]) {
    ctx.fillStyle = rgba(INK, 0.5);
    ctx.fillRect(-26, yy - 1.6, 48, 3.2);
    ctx.fillStyle = rgba(grano, 0.5);
    for (let i = -16; i <= 12; i += 7) {
      ctx.beginPath(); ctx.arc(i, yy, 0.9, 0, 6.283); ctx.fill();
    }
  }
  ctx.restore();

  /* ── las tres ventanillas: acá se ve quién viene ── */
  for (const [i, v] of VENTANILLAS.entries()) {
    /* cada pasajero se despierta en su turno y golpea el vidrio a su ritmo */
    const desperto = clamp(carga * 3 - i, 0, 1);
    const tiembla = desperto > 0.3 ? Math.sin(G.tick * (0.24 + i * 0.05) + i * 2) * desperto : 0;
    portilla(ctx, v.x, -31 + tiembla * 0.9, v.glifo, desperto, flash, dark);
  }

  /* ── escotilla de carga arriba: los bulones saltan antes de reventar ── */
  pill(ctx, -12, -51 - open, 22, 5.5, 1.8);
  inked(ctx, dark, LWD);
  for (let i = 0; i < 3; i++) {
    const bx = -7 + i * 7;
    const salta = open > 0 && (G.tick + i * 9) % 40 < 20 ? -1.4 : 0;
    disc(ctx, bx, -48.5 - open + salta, 1.1, grano, 0.9);
  }
  if (open > 0) {
    /* la rendija: adentro está oscuro y hay cosas moviéndose */
    ctx.fillStyle = '#16190f';
    ctx.fillRect(-10, -50 - open, 18, 2.4 + open * 0.5);
  }

  /* ── arnés: la correa que ata la cabeza al cajón ── */
  ctx.beginPath();
  ctx.moveTo(-4, -47);
  ctx.quadraticCurveTo(12, -50, 17, -56);
  ctx.strokeStyle = INK; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
  ctx.stroke();
  ctx.strokeStyle = flash ? '#ffffff' : '#5c3a1c'; ctx.lineWidth = 1.4;
  ctx.stroke();

  /* ── cabeza ── */
  ctx.save();
  ctx.translate(17, -56);

  /* cuello: una pieza gruesa que sale del cajón */
  ctx.beginPath();
  ctx.moveTo(-8, 13);
  ctx.quadraticCurveTo(-5, 4, -3, -2);
  ctx.lineTo(6, -2);
  ctx.quadraticCurveTo(6, 7, 3, 13);
  ctx.closePath();
  ctx.fillStyle = wood;
  ctx.fill();
  shadeHalf(ctx, -2, 6, 8, 0.2);
  ctx.strokeStyle = INK; ctx.lineWidth = LW + 0.2;
  ctx.stroke();
  /* crin: tres mechones tallados sobre el cuello */
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-6 + i * 1.2, 9 - i * 4);
    ctx.quadraticCurveTo(-11 - i, 6 - i * 4, -9 - i * 1.5, 1 - i * 4);
    ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    ctx.stroke();
    ctx.strokeStyle = dark; ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  /* cráneo y hocico, de una pieza */
  ctx.beginPath();
  ctx.moveTo(-7, -1);
  ctx.quadraticCurveTo(-9, -13, -1.5, -15);
  ctx.quadraticCurveTo(8, -16.5, 12.5, -11);
  ctx.quadraticCurveTo(19, -9, 17.5, -2.5);
  ctx.quadraticCurveTo(16, 3.5, 8, 3.5);
  ctx.quadraticCurveTo(0, 5, -7, -1);
  ctx.closePath();
  ctx.fillStyle = wood;
  ctx.fill();
  shadeHalf(ctx, 3, -5, 13, 0.18);
  ctx.strokeStyle = INK; ctx.lineWidth = LW + 0.4;
  ctx.stroke();

  /* orejas de madera */
  for (const [ox, oy] of [[-3.5, -14], [2, -15.2]]) {
    ctx.beginPath();
    ctx.moveTo(ox - 2.2, oy + 1.4);
    ctx.lineTo(ox, oy - 6);
    ctx.lineTo(ox + 2.6, oy + 0.8);
    ctx.closePath();
    inked(ctx, dark, LWD);
  }

  /* ojo grande y ceja pesada: el caballo está de muy mal humor */
  eye(ctx, 2, -8, 4.2, 1, hostile, alert);
  brows(ctx, 2, -11, 4.2, alert ? 2.1 : 1.3);

  /* brida: la correa que le cruza el hocico. Es lo que dice "esto lo armaron" */
  ctx.beginPath();
  ctx.moveTo(6, -9.5); ctx.lineTo(9.5, 1.5);
  ctx.moveTo(4.5, -2.5); ctx.quadraticCurveTo(11, -1, 15.5, -3.5);
  ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
  ctx.stroke();
  ctx.strokeStyle = flash ? '#ffffff' : '#5c3a1c'; ctx.lineWidth = 1.1;
  ctx.stroke();
  disc(ctx, 9.5, -2.2, 1.3, grano, 0.9);

  /* ollar y boca de tablones */
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.arc(14.5, -5, 1.3, 0, 6.283); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(6, 1.4);
  ctx.quadraticCurveTo(10.5, 3.8, 15, 0.6);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
  ctx.stroke();
  if (alert) teeth(ctx, 7, 1.4, 8, 2.2, 5);
  ctx.restore();

  /* ── escudo frontal atornillado al cajón: lo que obliga a rodearlo ── */
  pill(ctx, 11, -46, 9, 31, 2.8);
  ctx.fillStyle = flash ? '#ffffff' : mix(th.rock.edge, '#ffffff', 0.25);
  ctx.fill();
  shadeHalf(ctx, 15.5, -30, 11, 0.2);
  ctx.strokeStyle = INK; ctx.lineWidth = LW + 0.2;
  ctx.stroke();
  for (let i = 0; i < 5; i++) disc(ctx, 15.5, -42 + i * 6, 1.1, INK, 0);

  /* ── cañón, asomando por el costado del escudo. Sale de troyanoMuzzle: la
     lógica y el dibujo comparten el punto, así que el caño apunta a donde de
     verdad nace la bala ── */
  pill(ctx, 16, -32.6, 12, 5.6, 2.4);
  inked(ctx, flash ? '#ffffff' : STEEL_D, LWD);
  pill(ctx, 25, -33.6, 4, 7.6, 1.6);
  inked(ctx, flash ? '#ffffff' : STEEL_D, LWD);

  ctx.restore();

  if (e.charge > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, x, feet - 30, 34, hostile, 0.35);
    ctx.restore();
  }
}

/**
 * Una ventanilla del costado, con su pasajero adentro. `desperto` va de 0 a 1:
 * apagado es una silueta hundida en la sombra, encendido es alguien mirando
 * para afuera. El color de cada uno es el suyo —el violeta del Keylogger, el
 * verde del Gusano, el cian del Ransomware— así que el aviso no hay que
 * aprenderlo: ya lo sabés de haberlos peleado.
 */
function portilla(ctx, px, py, glifo, desperto, flash, dark) {
  const luz = { tecla: '#c9a0ff', ojo: '#9fe86a', cerradura: '#6ce8ff' }[glifo];
  ctx.save();
  ctx.translate(px, py);

  /* el marco de hierro y el vidrio */
  disc(ctx, 0, 0, 5.2, flash ? '#ffffff' : dark, LWD);
  ctx.beginPath();
  ctx.arc(0, 0, 3.8, 0, 6.283);
  ctx.fillStyle = flash ? '#ffffff' : mix('#16190f', luz, 0.1 + desperto * 0.35);
  ctx.fill();

  /* el pasajero */
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, 3.8, 0, 6.283);
  ctx.clip();
  const tinta = flash ? '#ffffff' : mix(INK, luz, 0.25 + desperto * 0.6);
  ctx.fillStyle = tinta;
  ctx.strokeStyle = tinta;
  ctx.lineWidth = 1.2;
  ctx.lineJoin = 'round';
  if (glifo === 'tecla') {
    /* una tecla de máquina con su vástago */
    ctx.beginPath();
    ctx.moveTo(-2, 1.6); ctx.lineTo(2, 1.6);
    ctx.stroke();
    pill(ctx, -2.2, -2.4, 4.4, 3.4, 1);
    ctx.fill();
  } else if (glifo === 'ojo') {
    /* la cabezota del gusano: un círculo y un ojo que mira */
    ctx.beginPath(); ctx.arc(0, 0.4, 3, 0, 6.283); ctx.fill();
    ctx.fillStyle = flash ? '#b0763a' : '#16190f';
    ctx.beginPath(); ctx.arc(0.9, -0.4, 1.1, 0, 6.283); ctx.fill();
  } else {
    /* la cerradura del ransomware */
    ctx.beginPath(); ctx.arc(0, -0.8, 1.5, 0, 6.283); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-1.5, 2.6); ctx.lineTo(-0.7, -0.2);
    ctx.lineTo(0.7, -0.2); ctx.lineTo(1.5, 2.6);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  /* reflejo del vidrio, y un halo cuando el de adentro ya está despierto */
  shine(ctx, -1.4, -1.8, 1.8, 1, -0.5, 0.4);
  if (desperto > 0.3) {
    ctx.strokeStyle = rgba(luz, (desperto - 0.3) * 0.9);
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(0, 0, 5.2, 0, 6.283); ctx.stroke();
  }
  ctx.restore();
}


/* Keylogger: una máquina de escribir, y a propósito la única cosa del reparto
   que no tiene cara de bicho. Todo lo demás son criaturas redondas con dos ojos
   y dientes; ésta es un aparato — chasis rectangular, rodillo, carro y teclado—
   con un solo ojo de vidrio arriba del carro, que es lo que la deja adentro de
   la regla de la casa. Se la reconoce de lejos por la silueta: donde los otros
   son panza, ésta es máquina.

   Nada de lo que muestra es adorno. El renglón de la hoja es lo que ya registró,
   el panel de arriba es lo que cree saber, y el ojo dice a quién está mirando.
   Los tres se dibujan de lo mismo que lee su IA, así que no pueden mentir: si el
   panel está lleno, la próxima predicción va en serio. */
function keylogger(ctx, e, th, hostile, flash) {
  const body = flash ? '#ffffff' : '#8a77a6';
  const cap  = flash ? '#ffffff' : '#e2dccc';
  const x = e.x + e.w / 2, y = e.y + e.h / 2, s = e.surface;
  const typing = e.state === 'registro' || e.state === 'prediccion';
  const hit = e.strike > 0 ? Math.sin((8 - e.strike) / 8 * Math.PI) : 0;

  ctx.save();
  /* temblor: crece con lo que cree saber y se dispara cuando se equivoca. Es la
     única parte del dibujo que no es limpia, y por eso se lee de lejos. */
  const jit = e.fail > 0 ? 1.6 : Math.max(0, e.learn - 60) / 40 * 0.7;
  if (jit > 0) ctx.translate(rnd(-jit, jit), rnd(-jit, jit));
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
     antes que el carro para que el renglón se apoye sobre ella */
  if (e.log.length) {
    const alto = 13 + Math.min(e.log.length, 7) * 0.9;
    ctx.beginPath();
    ctx.moveTo(-3, -7.2);
    ctx.lineTo(-3.6, -alto);
    ctx.lineTo(4.4, -alto);
    ctx.lineTo(3.8, -7.2);
    ctx.closePath();
    inked(ctx, flash ? '#ffffff' : '#f6e7c4', 1.2);

    /* lo escrito, en abstracto: las marcas del renglón. Lo que dicen se lee en
       el panel de arriba, no acá — dos veces la misma información sería ruido */
    ctx.strokeStyle = rgba(INK, 0.45); ctx.lineWidth = 0.9;
    for (let i = 0; i < Math.min(e.log.length, 6); i++) {
      const ly = -9.5 - i * 1.5;
      ctx.beginPath();
      ctx.moveTo(-2.4, ly); ctx.lineTo(1.4 + (i % 3), ly);
      ctx.stroke();
    }
  }

  /* rodillo y carro, atravesados arriba; el carro corre con el renglón */
  const run = e.log.length / KEYLOG.hist;
  ctx.save();
  ctx.translate(-2.5 + run * 5, -5.6);
  ctx.beginPath();
  ctx.moveTo(-8, 0); ctx.lineTo(8, 0);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
  ctx.stroke();
  pill(ctx, -7.5, -3.4, 15, 3.6, 1.8);
  inked(ctx, flash ? '#ffffff' : '#4a3d5c', 1.4);
  shine(ctx, -3.5, -2.6, 3.4, 0.7, 0, 0.35);
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

  /* lo que piensa, encima de la máquina y ya fuera de su transformación: el
     panel no se espeja ni se da vuelta en el techo, porque es información y la
     información se lee siempre igual */
  keyPanel(ctx, e);
  predictionMark(ctx, e);
}

/* ── Eco: la entrada fantasma ──
   La silueta de Bit —sombrero, gabán, la misma altura— vaciada y pasada a
   violeta de máquina. Tiene que reconocerse como "vos" en el primer cuadro y no
   confundirse con vos en ninguno: por eso no tiene cara, sólo una ranura de luz
   donde iría el ojo, y el contorno se le corre en dos canales como una cinta mal
   leída. Es una grabación, y se ve que es una grabación. */
function ecoShade(ctx, e, flash) {
  const x = e.x + e.w / 2, feet = e.y + e.h;
  const fade = Math.min(1, e.life / 30);         // se apaga al final del renglón
  const violeta = flash ? '#ffffff' : '#c9a0ff';
  const paso = Math.sin(e.anim) * 2.2;

  ctx.save();
  ctx.globalAlpha = 0.55 + Math.sin(G.tick * 0.3) * 0.08 * fade;
  ctx.translate(x + boil(e.x, 0.4), feet);
  ctx.scale(e.dir, 1);

  /* el desdoble de canal: la misma silueta corrida, detrás, en cian */
  for (const [off, col, a] of [[-1.6, '#6ce8ff', 0.5], [0, violeta, 1]]) {
    ctx.save();
    ctx.translate(off + (off ? rnd(-0.5, 0.5) : 0), 0);
    ctx.globalAlpha *= a;

    /* piernas: dos trazos que se abren con el paso */
    ctx.beginPath();
    ctx.moveTo(-1.5, -11); ctx.lineTo(-1.5 - paso, -0.5);
    ctx.moveTo(1.5, -11);  ctx.lineTo(1.5 + paso, -0.5);
    ctx.strokeStyle = col; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.stroke();

    /* gabán: una campana simple, el rasgo que lo hace inconfundible */
    ctx.beginPath();
    ctx.moveTo(-5, -10);
    ctx.quadraticCurveTo(-6.5, -17, -4, -19);
    ctx.lineTo(4, -19);
    ctx.quadraticCurveTo(6.5, -17, 5, -10);
    ctx.closePath();
    ctx.fillStyle = rgba(col, 0.22); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.lineJoin = 'round';
    ctx.stroke();

    /* cabeza y ala del sombrero */
    ctx.beginPath();
    ctx.arc(0, -22.5, 4.6, 0, 6.283);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-7, -25.5); ctx.lineTo(7, -25.5);
    ctx.moveTo(-4.4, -25.5); ctx.lineTo(-3.8, -29.5);
    ctx.lineTo(3.8, -29.5); ctx.lineTo(4.4, -25.5);
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.restore();
  }

  /* la ranura de luz donde iría el ojo: lo único lleno de toda la figura */
  ctx.globalAlpha = 1;
  ctx.fillStyle = flash ? '#ffffff' : '#e9d8ff';
  ctx.fillRect(0.4, -23.6, 3.6, 1.6);

  /* barrido de cinta: una banda clara que sube por el cuerpo */
  const scan = -((G.tick * 0.7 + e.x) % 30);
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = rgba('#ffffff', 0.35);
  ctx.fillRect(-7, scan, 14, 1.2);

  ctx.restore();
}

const PANEL_KEYS = 5;

/**
 * Los glifos del panel: las acciones de la cinta (actions.js) traducidas a algo
 * que se entienda de un vistazo. Van dibujados a mano y no como texto, por dos
 * razones: la tipografía de máquina de escribir del juego no tiene flechas —
 * saldrían cuadraditos— y porque acá todo se dibuja. A 6px de lado, un trazo
 * limpio se lee mejor que cualquier fuente.
 *
 * El panel no tiene una sola letra: lo que hay que entender es qué anotó y
 * cuánto cree saber, y eso se dice con cinco símbolos y una barra.
 */
function glifo(ctx, act, x, y, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.1;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  switch (act) {
    case '<':   // izquierda
      ctx.moveTo(1.6, 0); ctx.lineTo(-1.6, 0);
      ctx.moveTo(-0.3, -1.4); ctx.lineTo(-1.7, 0); ctx.lineTo(-0.3, 1.4);
      break;
    case '>':   // derecha
      ctx.moveTo(-1.6, 0); ctx.lineTo(1.6, 0);
      ctx.moveTo(0.3, -1.4); ctx.lineTo(1.7, 0); ctx.lineTo(0.3, 1.4);
      break;
    case '^':   // salto
      ctx.moveTo(0, 1.7); ctx.lineTo(0, -1.6);
      ctx.moveTo(-1.4, -0.3); ctx.lineTo(0, -1.7); ctx.lineTo(1.4, -0.3);
      break;
    case '*':   // ataque: la cruz de una mira
      ctx.moveTo(-1.5, -1.5); ctx.lineTo(1.5, 1.5);
      ctx.moveTo(1.5, -1.5); ctx.lineTo(-1.5, 1.5);
      break;
    case '~':   // dash: dos cuñas de velocidad
      ctx.moveTo(-1.8, -1.4); ctx.lineTo(-0.2, 0); ctx.lineTo(-1.8, 1.4);
      ctx.moveTo(0.4, -1.4); ctx.lineTo(2, 0); ctx.lineTo(0.4, 1.4);
      break;
  }
  ctx.stroke();
  ctx.restore();
}

/**
 * El panel del Keylogger: las últimas teclas anotadas y la barra de aprendizaje.
 * Aparece sólo cuando está mirando a alguien, así que verlo encendido ya es la
 * primera información — y se apaga solo cuando lo perdés de vista.
 */
function keyPanel(ctx, e) {
  const on = e.state !== 'patrulla' && (e.log.length > 0 || e.learn > 0);
  if (!on) return;

  const k = clamp(e.learn / 100, 0, 1);
  const locked = e.state === 'prediccion' || e.state === 'ataque';
  /* violeta mientras junta, hostil cuando ya fijó el punto: el color dice en
     cuál de las dos etapas está sin que haya que contar nada */
  const tinta = locked ? G.theme.hostile : '#c9a0ff';

  const w = 40, h = 17;
  const cx = e.x + e.w / 2;
  /* siempre por encima de la máquina, vaya por el piso o por el techo */
  const top = (e.surface > 0 ? e.y : e.y + e.h) - 25;

  ctx.save();
  if (e.fail > 0) ctx.translate(rnd(-1.4, 1.4), rnd(-1.4, 1.4));
  ctx.translate(cx - w / 2, top);

  /* la chapita: papel con contorno de tinta, como las placas del HUD */
  pill(ctx, 0, 0, w, h, 2.4);
  inked(ctx, rgba(PAPER, 0.92), 1.4);

  /* fila de teclas: las últimas PANEL_KEYS, la más nueva a la derecha */
  const vistas = e.log.slice(-PANEL_KEYS);
  for (let i = 0; i < PANEL_KEYS; i++) {
    const kx = 3 + i * 7, ky = 2.4;
    const act = vistas[i - (PANEL_KEYS - vistas.length)];
    const nueva = act !== undefined && i === PANEL_KEYS - 1 && e.strike > 0;
    pill(ctx, kx, ky, 6, 6, 1.2);
    ctx.fillStyle = act === undefined ? rgba(PAPER_LO, 0.5)
                  : nueva ? tinta : rgba('#e2dccc', 1);
    ctx.fill();
    ctx.strokeStyle = rgba(INK, act === undefined ? 0.3 : 0.75);
    ctx.lineWidth = 0.9;
    ctx.stroke();
    if (act !== undefined) glifo(ctx, act, kx + 3, ky + 3, nueva ? PAPER : INK);
  }

  /* la barra: es el porcentaje de acierto, no un reloj. Si sube es porque le
     estás dando la razón; si baja es porque lo sorprendiste. */
  const bw = w - 6;
  pill(ctx, 3, h - 4.6, bw, 3, 1.5);
  ctx.fillStyle = rgba(INK, 0.18); ctx.fill();
  if (k > 0.02) {
    ctx.save();
    pill(ctx, 3, h - 4.6, bw, 3, 1.5);
    ctx.clip();
    ctx.fillStyle = tinta;
    ctx.fillRect(3, h - 4.6, bw * k, 3);
    ctx.restore();
  }
  /* la marca del umbral: pasado ese punto se anima a predecir */
  const marca = 3 + bw * (KEYLOG.ready / 100);
  ctx.beginPath();
  ctx.moveTo(marca, h - 5.4); ctx.lineTo(marca, h - 0.8);
  ctx.strokeStyle = rgba(INK, 0.55); ctx.lineWidth = 0.8;
  ctx.stroke();

  ctx.restore();
}

/**
 * Dónde cree que vas a estar. Se dibuja durante todo el aviso y es el contrato
 * del enemigo con el jugador: si la silueta no está sobre vos, el renglón no te
 * va a tocar. Que se pueda leer es lo que lo hace justo.
 */
function predictionMark(ctx, e) {
  if (!e.aim || (e.state !== 'prediccion' && e.state !== 'ataque')) return;
  const k = e.state === 'prediccion' ? 1 - e.lockT / KEYLOG.lock : 1;
  const { x, y } = e.aim;
  const c = G.theme.hostile;

  ctx.save();

  /* la línea desde la boca del carro: de dónde va a salir el renglón */
  const mx = e.x + e.w / 2 + e.dir * 9, my = e.y + e.h / 2 + e.surface * 2;
  ctx.strokeStyle = rgba(c, 0.2 + k * 0.35);
  ctx.lineWidth = 1;
  ctx.setLineDash([2.5, 5]);
  ctx.lineDashOffset = -G.tick * 1.6;
  ctx.beginPath();
  ctx.moveTo(mx, my); ctx.lineTo(x, y);
  ctx.stroke();
  ctx.setLineDash([]);

  /* la silueta de Bit donde lo espera: del tamaño real, hueca y temblando */
  ctx.translate(rnd(-0.6, 0.6), rnd(-0.6, 0.6));
  ctx.strokeStyle = rgba(c, 0.35 + k * 0.4);
  ctx.lineWidth = 1.2;
  ctx.setLineDash([3, 3]);
  ctx.strokeRect(x - P.w / 2, y - P.h / 2, P.w, P.h);
  ctx.setLineDash([]);

  /* y la mira: se cierra a medida que se acaba el aviso */
  const r = 13 - k * 5;
  ctx.strokeStyle = rgba(c, 0.5 + k * 0.5);
  ctx.lineWidth = 1.4;
  for (const a of [0, 1, 2, 3]) {
    const ang = a * Math.PI / 2 + Math.PI / 4;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(ang) * r, y + Math.sin(ang) * r);
    ctx.lineTo(x + Math.cos(ang) * (r + 4), y + Math.sin(ang) * (r + 4));
    ctx.stroke();
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

