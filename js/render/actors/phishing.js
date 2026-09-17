/* El mímico, que es el único del reparto con tres dibujos en vez de uno: el
   disfraz, el momento en que se le cae y la forma verdadera.

   Tiene archivo propio porque es el más largo de los procesos hostiles y porque
   lo que dibuja no es suyo: imita objetos buenos del juego. El poste falso sale
   del mismo `postPath` que el de verdad (`base.js`), y por eso lo único que lo
   delata es el color — que es exactamente la pista que tiene que ser. */

import { hookTip, hookAnchor, HOOK_REACH } from '../../game/enemies.js';
import { CHECKPOINT_H } from '../../config.js';
import { rgba, clamp, noise2, glow } from '../../util.js';
import {
  INK, boil, inked, disc, pill, shadeHalf, teeth,
  starPath, shine, groundShadow, label, BODY,
} from '../ink.js';
import { PINK, LW, eye, postPath } from './base.js';

/* ── Phishing ──
   Tres dibujos en uno, según en qué está: el disfraz (que es el dibujo real del
   objeto que imita, no una copia), el momento en que se le cae, y la forma
   verdadera — un pez hecho de sobres, con una sonrisa demasiado amable. */
export function phishing(ctx, e, th, hostile, flash) {
  if (e.mode === 'cebo') { phishBait(ctx, e); return; }
  if (e.link) phishLink(ctx, e);
  phishFish(ctx, e, th, hostile, flash);
}

/** El disfraz, según de qué se esté haciendo pasar. */
function phishBait(ctx, e) {
  const cx = e.x + e.w / 2;
  const t = e.t * 0.05;
  let signY;

  if (e.bait === 'guardado') signY = phishSavepoint(ctx, e, cx);
  else if (e.bait === 'corazon') signY = phishHeart(ctx, e, cx);
  else signY = phishCrate(ctx, e, cx, t);

  if (e.sign) phishSign(ctx, e, cx, signY);
}

/**
 * Corazón flotante, sin una palabra encima. La pista es saber que la vida de
 * verdad en este juego es un parche verde con una cruz: un corazón rojo no
 * pertenece a ningún lado. Cabe entero en la caja de golpe: se toca donde se ve.
 */
function phishHeart(ctx, e, cx) {
  const cy = e.y + 7 + Math.sin(e.t * 0.06) * 1.8;
  const r = 6.4 + Math.sin(e.t * 0.11) * 0.35;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, cx, cy, 15, '#ff8fa0', 0.3);
  ctx.restore();

  ctx.beginPath();
  ctx.moveTo(cx, cy + r * 0.88);
  ctx.bezierCurveTo(cx - r * 1.55, cy - r * 0.25, cx - r * 0.55, cy - r * 1.2, cx, cy - r * 0.42);
  ctx.bezierCurveTo(cx + r * 0.55, cy - r * 1.2, cx + r * 1.55, cy - r * 0.25, cx, cy + r * 0.88);
  ctx.closePath();
  ctx.fillStyle = '#e0485c';
  ctx.fill();
  shadeHalf(ctx, cx, cy, r, 0.18);
  ctx.strokeStyle = INK; ctx.lineWidth = LW; ctx.lineJoin = 'round';
  ctx.stroke();
  shine(ctx, cx - r * 0.45, cy - r * 0.4, r * 0.28, r * 0.2, -0.5, 0.8);

  return cy - r * 1.5;
}


/**
 * Punto de restauración falso: el mímico más cruel del reparto, porque imita
 * justo lo que buscás para estar a salvo.
 *
 * Éste no trae cartel. Lo único que lo delata son las bandas del color
 * equivocado, que están siempre — no hay que cazar un parpadeo de dos cuadros,
 * hay que conocer de qué color es un poste sano. El glitch que se le corre cada
 * tanto es de yapa, para el que ya sospechaba.
 */
function phishSavepoint(ctx, e, cx) {
  /* Mismas medidas que uno de verdad —misma constante, no un número copiado—
     apoyado en el piso. Un poste más bajo que el resto se delataría por la
     silueta antes que por el color, y el color es todo lo que tiene. */
  const base = e.y + e.h, top = base - CHECKPOINT_H;
  const cycle = e.t % 120;
  const glitch = cycle < 5 || (cycle > 12 && cycle < 16);

  postPath(ctx, cx, base, top);
  inked(ctx, '#3b444e', LW);

  /* las bandas mal teñidas, recortadas contra el poste: el dato permanente */
  ctx.save();
  postPath(ctx, cx, base, top);
  ctx.clip();
  ctx.fillStyle = '#6b4a6e';
  ctx.fillRect(cx - 9, top + 9, 18, 4);
  ctx.fillStyle = '#7a5a4a';
  ctx.fillRect(cx - 9, top + 20, 18, 2.6);
  ctx.restore();

  if (glitch) {
    /* y encima se corre de lugar: el artefacto de imagen rota de toda la vida */
    const slip = (noise2(e.x, (e.t / 3) | 0) - 0.5) * 6;
    ctx.save();
    ctx.beginPath();
    ctx.rect(cx - 9, top + 8.5, 18, 5);
    ctx.clip();
    ctx.translate(slip, 0);
    postPath(ctx, cx, base, top);
    inked(ctx, '#6b4a6e', LW);
    ctx.restore();
  }

  /* la bombita: apagada como cualquiera sin activar, pero con el tinte corrido
     hacia el rosa de lo corrupto en vez del gris limpio */
  disc(ctx, cx, top + 2, 2.4, glitch ? PINK : '#7a5566', 1);
  return top - 6;
}

/**
 * La caja de recompensa: moño, destello y los dos íconos del combo pintados en
 * la tapa. Promete de más, que es exactamente lo que la delata — ningún premio
 * del juego viene envuelto para regalo.
 */
function phishCrate(ctx, e, cx, t) {
  const base = e.y + e.h;
  /* mide 17 y apoya en el piso, así que ocupa casi entera la caja de golpe
     (base-14 a base): se la toca donde se la ve */
  const y = base - 17;
  const pulse = 0.6 + Math.sin(e.t * 0.1) * 0.4;

  // sin piso abajo no hay sombra que proyectar: la `x` se puede poner al vuelo
  if (e.grounded) groundShadow(ctx, cx, base, 11, 2.2, 0.3);

  /* destello detrás: el "¡mirame!" */
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, cx, y + 8, 20, '#ffd08a', 0.3 * pulse);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = 0.28 * pulse;
  starPath(ctx, cx, y + 8, 19, 8, 8, t * 0.4, e.x);
  ctx.fillStyle = '#ffe9b0';
  ctx.fill();
  ctx.restore();

  /* el cajón */
  pill(ctx, cx - 11, y, 22, 17, 2);
  inked(ctx, '#a9712f', LW);
  shadeHalf(ctx, cx, y + 8, 11, 0.16);

  /* cinta del envoltorio, cruzada */
  ctx.fillStyle = '#c14a3a';
  ctx.fillRect(cx - 2, y + 1, 4, 15);
  ctx.fillRect(cx - 10, y + 6, 20, 4);

  /* los dos íconos del combo: cruz de vida y un caño de arma */
  ctx.fillStyle = '#3aa85c';
  ctx.fillRect(cx - 7.6, y + 12, 4.4, 1.6);
  ctx.fillRect(cx - 6.8, y + 10.6, 1.6 + 1.2, 4.4);
  ctx.fillStyle = '#4a545e';
  ctx.fillRect(cx + 2.6, y + 12, 6, 2.4);
  ctx.fillRect(cx + 2.6, y + 14, 2, 2);

  /* moño arriba */
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + side * 3.2, y - 1.4, 3, 2.2, side * 0.5, 0, 6.283);
    inked(ctx, '#e0614c', 1.1);
  }
  disc(ctx, cx, y - 1.2, 1.5, '#c14a3a', 1);
  return y - 8;
}

/**
 * El cartel de la caja — el único que queda. Va en la tipografía de máquina de
 * escribir y con barra de título roja para que se lea como una ventana de
 * estafa y no como un rótulo del juego.
 */
function phishSign(ctx, e, cx, cy) {
  const text = e.sign;
  ctx.save();
  ctx.translate(cx, cy + Math.sin(e.t * 0.05) * 1.2);
  ctx.rotate(Math.sin(e.t * 0.06) * 0.06);

  ctx.font = `6px ${BODY}`;
  const w = ctx.measureText(text).width + 9;

  /* el palito que lo sostiene: nada flota en el aire en este juego */
  ctx.beginPath();
  ctx.moveTo(0, 4.5); ctx.lineTo(0, 11);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
  ctx.stroke();

  pill(ctx, -w / 2, -5.5, w, 11, 1.6);
  inked(ctx, '#f6edd6', 1.4);
  ctx.fillStyle = '#c14a3a';
  ctx.fillRect(-w / 2 + 1.2, -4.4, w - 2.4, 2.4);
  label(ctx, text, 0, 2.6, 6, '#3a2a1c', 'center', '0', 0, BODY);
  ctx.restore();
}

/** El enlace falso: subrayado, parpadeante, con el cursorcito al lado. */
function phishLink(ctx, e) {
  const L = e.link;
  const y = L.y + Math.sin(L.t * 0.07) * 2;
  const fade = Math.min(1, L.life / 50);
  ctx.save();
  ctx.globalAlpha = fade * (0.7 + Math.sin(L.t * 0.2) * 0.3);
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, L.x, y, 14, '#b98cff', 0.5);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = fade;

  label(ctx, 'CLIC AQUI', L.x, y + 2, 6, '#9fd4ff', 'center', '0', 2.4, BODY);
  ctx.beginPath();
  ctx.moveTo(L.x - 13, y + 3.6); ctx.lineTo(L.x + 13, y + 3.6);
  ctx.strokeStyle = '#9fd4ff'; ctx.lineWidth = 0.9;
  ctx.stroke();

  /* el puntero de flecha, que es lo que lo vuelve un enlace y no un cartel */
  ctx.beginPath();
  ctx.moveTo(L.x + 9, y + 4.5);
  ctx.lineTo(L.x + 9, y + 11);
  ctx.lineTo(L.x + 11.4, y + 8.8);
  ctx.lineTo(L.x + 14, y + 8.4);
  ctx.closePath();
  inked(ctx, '#ffffff', 1);
  ctx.restore();
}

function phishFish(ctx, e, th, hostile, flash) {
  const paper = flash ? '#ffffff' : '#f2e6c8';   // el papel de los sobres
  const fold  = flash ? '#ffffff' : '#cbb389';   // las solapas, medio tono abajo
  const fin   = flash ? '#ffffff' : '#7fb8cc';
  const x = e.x + e.w / 2, y = e.y + e.h / 2;
  const bob = Math.sin(e.t * 0.09) * 0.8;
  const alert = e.telegraph > 0;
  /* recién destapado se sacude; al tirar el anzuelo se va para atrás */
  const tear = e.mode === 'revela' ? 1 : 0;
  const cast = e.hookPhase === 1 ? 1 : 0;
  const swim = Math.sin(e.t * 0.16);

  ctx.save();
  ctx.translate(x + boil(e.x, 0.3), y + bob + boil(e.x + 3, 0.3));
  ctx.rotate(clamp(e.dir * 0.1, -0.2, 0.2) - cast * 0.2 * e.dir + tear * swim * 0.3);
  ctx.scale(e.dir, 1);

  /* ── cola: tres sobres abiertos en abanico, batiendo ── */
  for (const [i, len] of [[-1, 9], [0, 11], [1, 9]]) {
    ctx.save();
    ctx.translate(-10, 0);
    ctx.rotate(i * 0.52 + swim * 0.26);
    ctx.beginPath();
    ctx.moveTo(0, -2.4);
    ctx.lineTo(-len, -4.4);
    ctx.lineTo(-len, 4.4);
    ctx.lineTo(0, 2.4);
    ctx.closePath();
    inked(ctx, i === 0 ? paper : fold, 1.3);
    /* la solapa, que es lo que lo vuelve sobre y no aleta */
    ctx.beginPath();
    ctx.moveTo(-len, -4.4); ctx.lineTo(-len * 0.45, 0); ctx.lineTo(-len, 4.4);
    ctx.strokeStyle = rgba(INK, 0.5); ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.restore();
  }

  /* ── aleta dorsal: un clip de enlaces ── */
  ctx.beginPath();
  ctx.moveTo(-4, -4);
  ctx.quadraticCurveTo(-1, -10.5 - swim, 4, -4.6);
  ctx.closePath();
  inked(ctx, fin, 1.3);

  /* ── cuerpo: sobre alargado con la panza redonda ── */
  ctx.beginPath();
  ctx.moveTo(-10.5, -3.6);
  ctx.quadraticCurveTo(-2, -6.6, 7.5, -4.6);
  ctx.quadraticCurveTo(13.5, -3.2, 13.6, 0);
  ctx.quadraticCurveTo(13.5, 3.4, 7.5, 5);
  ctx.quadraticCurveTo(-2, 7, -10.5, 3.8);
  ctx.closePath();
  ctx.fillStyle = paper;
  ctx.fill();

  /* escamas: solapas de sobre en filas, recortadas dentro del cuerpo */
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = rgba(INK, 0.32); ctx.lineWidth = 0.8;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 5; c++) {
      const sx = -9 + c * 4.6 + (r % 2) * 2.3, sy = -4 + r * 3.4;
      ctx.beginPath();
      ctx.moveTo(sx, sy); ctx.lineTo(sx + 2.1, sy + 2); ctx.lineTo(sx + 4.2, sy);
      ctx.stroke();
    }
  }
  ctx.restore();
  shadeHalf(ctx, 0, 0, 9, 0.15);
  ctx.strokeStyle = INK; ctx.lineWidth = LW; ctx.lineJoin = 'round';
  ctx.stroke();

  /* aleta pectoral, delante de la panza */
  ctx.beginPath();
  ctx.moveTo(3, 3.4);
  ctx.quadraticCurveTo(2, 8.6 + swim, 8, 5.4);
  ctx.closePath();
  inked(ctx, fin, 1.2);

  /* ── la sonrisa amable: es el chiste del personaje, así que va grande ── */
  ctx.beginPath();
  ctx.arc(8.4, 0.6, 4.2, 0.12, Math.PI - 0.5);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
  ctx.stroke();
  /* con los dientes a la vista cuando ya no disimula */
  if (alert || e.hookPhase > 0) teeth(ctx, 5.4, 2.8, 6, 1.6, 4);

  eye(ctx, 8.6, -2.2, 2.3, 1, hostile, alert);

  /* ── la caña: el anzuelo cuelga de acá, como pez abisal ── */
  ctx.beginPath();
  ctx.moveTo(6, -4.6);
  ctx.quadraticCurveTo(12, -11, 16.5, -8.6);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
  ctx.stroke();

  /* el sello de lacre, en el lomo */
  disc(ctx, -3.4, -1.4, 1.8, alert ? PINK : '#c9382f', 0.9);

  ctx.restore();

  /* La tanza va en coordenadas de mundo: el ángulo del tiro es absoluto y no
     se tiene que espejar con el pez. */
  phishHook(ctx, e, alert, flash);
}

/**
 * Tanza y anzuelo. En reposo cuelga y se hamaca; al atacar se estira en línea
 * recta hasta el largo de la tanza y vuelve más lento. La cuerda se comba
 * cuando está floja y se tensa en el tirón — es lo que hace legible en qué
 * mitad del ataque está.
 */
function phishHook(ctx, e, alert, flash) {
  const a = hookAnchor(e);
  const ax = a.x, ay = a.y;
  const t = hookTip(e);
  const taut = e.hookPhase > 0 ? e.hookLen / HOOK_REACH : 0;
  const sag = 6 - taut * 5;
  const live = e.hookPhase > 0 || alert;

  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.quadraticCurveTo((ax + t.x) / 2, (ay + t.y) / 2 + sag, t.x, t.y);
  ctx.strokeStyle = rgba(INK, 0.5); ctx.lineWidth = 1.6; ctx.lineCap = 'round';
  ctx.stroke();
  ctx.strokeStyle = flash ? '#ffffff' : '#e8eff4'; ctx.lineWidth = 0.7;
  ctx.stroke();

  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.rotate(t.ang - Math.PI / 2);
  ctx.beginPath();
  ctx.moveTo(0, -3.4);
  ctx.lineTo(0, 1.6);
  ctx.quadraticCurveTo(0, 5.2, -2.9, 4.8);
  ctx.quadraticCurveTo(-4.8, 4.2, -4.1, 1.6);
  ctx.strokeStyle = INK; ctx.lineWidth = 2.8; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.strokeStyle = flash ? '#ffffff' : (live ? PINK : '#cfd8de');
  ctx.lineWidth = 1.2;
  ctx.stroke();
  /* la púa */
  ctx.beginPath();
  ctx.moveTo(-4.1, 1.6); ctx.lineTo(-2.5, 3);
  ctx.strokeStyle = INK; ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

