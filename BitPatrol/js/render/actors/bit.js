/* Bit: el bit con gabán y sombrero de inspector, y la herramienta que lleva en
   la mano. Es el único del reparto que se dibuja con pose interpolada —el resto
   son máquinas—, así que también es el único que necesita el aparejo del brazo
   (`gunRig`) y el punto del caño (`muzzlePoint`) que comparte con la lógica. */

import { G, P } from '../../game/state.js';
import { shadowDrop, gunRig, muzzlePoint } from '../../game/player.js';
import { WEAPONS } from '../../data/weapons.js';
import { PURGE } from '../../config.js';
import { rgba, mix, clamp, lerp, glow, smoothstep } from '../../util.js';
import {
  INK, PAPER, BLUSH, boil, inked, hose, disc, pill, shadeHalf,
  puffPath, starPath, shine, groundShadow,
} from '../ink.js';
import {
  HIP_Y, FOOT_Y, TORSO_TOP, HEAD_Y, HEAD_R,
  SHELL, SHIRT, TROUSER, BOOT, GLOVE, FELT, STEEL, STEEL_D, PINK, CYAN, IDENT,
  LW, LWD, pieEye,
} from './base.js';

/* ══════════════════════════════════ Bit */

export function drawPlayer(ctx) {
  if (P.dead) return;
  const th = G.theme;
  const cx = P.x + P.w / 2, feet = P.y + P.h;

  /* sombra proyectada sobre el suelo real */
  const drop = shadowDrop();
  if (drop >= 0) {
    const k = clamp(1 - drop / 150, 0.12, 1);
    groundShadow(ctx, cx, feet + drop, 9 * k + 2, 2.6 * k + 0.8, 0.3 * k);
  }

  /* faldón del gabán, arrastrando detrás */
  if (P.trail.length > 3) ribbon(ctx, P.trail, 5.2, 0.6, th.cloak, 1);

  /* postura de parry: el aro rosa. Sólo aparece cuando de verdad se puede parar
     algo, así que el color es información, no decoración. */
  if (P.parry > 0) parryAura(ctx, cx, P.y + P.h / 2);
  if (P.purge > 0) purgeWave(ctx, cx, P.y + P.h / 2);

  if (P.invuln > 0 && P.dash === 0 && P.purge === 0 && (G.tick >> 2) % 2 === 0) return;

  if (P.aimDir !== 0) aimGuide(ctx);

  /* squash & stretch, bien marcado: se aplasta al caer, se estira al subir */
  const land = Math.max(0, P.land);
  const stretch = P.vy < -2 ? clamp(-P.vy * 0.016, 0, 0.17) : 0;
  const dashK = P.dash > 0 ? 0.22 : 0;              // el dash lo estira a lo largo
  const sy = 1 - land * 0.038 + stretch - dashK * 0.5;
  const sx = 1 + land * 0.046 - stretch * 0.75 + dashK;

  ctx.save();
  ctx.translate(Math.round(cx * 2) / 2 + boil(1, 0.3), Math.round(feet * 2) / 2 + boil(2, 0.3));
  if (P.spin !== 0) {
    // el giro del doble salto pivota cerca de la cabeza, no del centro de la
    // caja: con esta silueta la masa está arriba, y girar desde abajo se ve mal
    ctx.translate(0, -15);
    ctx.rotate(P.spin);
    ctx.translate(0, 15);
  }
  ctx.scale(P.turn * sx, sy);

  bitBody(ctx, th);
  ctx.restore();
}

/** Aro de parry: dos anillos rosados girando en sentidos opuestos. */
function parryAura(ctx, cx, cy) {
  ctx.save();
  ctx.translate(cx, cy);
  for (const [r, dir, lw] of [[15, 1, 2.2], [11, -1, 1.4]]) {
    ctx.save();
    ctx.rotate(G.tick * 0.16 * dir);
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = PINK;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, 6.283);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

/** Onda de la Purga: crece desde Bit y barre la pantalla. */
function purgeWave(ctx, cx, cy) {
  const k = 1 - P.purge / PURGE.frames;
  const r = 30 + k * 300;
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - k * 1.1);
  ctx.strokeStyle = CYAN;
  ctx.lineWidth = 6 * (1 - k);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 6.283);
  ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.4 * (1 - k);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.82, 0, 6.283);
  ctx.stroke();
  ctx.restore();
}

/**
 * Línea punteada de puntería. Nace en el caño real y no en el centro del
 * cuerpo: con el brazo corrido hacia adelante, dibujarla en el eje mentiría
 * sobre por dónde va a salir el paquete.
 */
function aimGuide(ctx) {
  const m = muzzlePoint();
  const up = P.aimDir === -1;
  ctx.save();
  ctx.strokeStyle = rgba(WEAPONS[P.weapon].color, 0.45);
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  ctx.setLineDash([2, 6]);
  ctx.lineDashOffset = -G.tick * 1.2;
  ctx.beginPath();
  ctx.moveTo(m.x, m.y + (up ? -3 : 3));
  ctx.lineTo(m.x, m.y + (up ? -46 : 46));
  ctx.stroke();
  ctx.restore();
}

/** Cinta que se afina: faldón, estela. Se dibuja con borde como todo lo demás. */
function ribbon(ctx, pts, w0, w1, fill, lw) {
  const n = pts.length;
  if (n < 3) return;
  const left = [], right = [];
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const q = pts[Math.min(i + 1, n - 1)];
    const r = pts[Math.max(i - 1, 0)];
    let dx = q.x - r.x, dy = q.y - r.y;
    const l = Math.hypot(dx, dy) || 1;
    dx /= l; dy /= l;
    const hw = lerp(w0, w1, i / (n - 1)) / 2;
    left.push({ x: p.x - dy * hw, y: p.y + dx * hw });
    right.push({ x: p.x + dy * hw, y: p.y - dx * hw });
  }
  ctx.beginPath();
  ctx.moveTo(left[0].x, left[0].y);
  for (let i = 1; i < n; i++) ctx.lineTo(left[i].x, left[i].y);
  for (let i = n - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
  ctx.closePath();
  inked(ctx, fill, lw);
}

function bitBody(ctx, th) {
  const ph = P.anim;
  const aim = P.aimAngle;
  const air = P.airBlend;
  const strideK = smoothstep(clamp(P.stride * 1.5, 0, 1));
  const lean = clamp(P.vx * 0.055, -0.3, 0.3) + clamp(P.vy * 0.018, -0.16, 0.2);

  const idleBob = (1 - air) * (1 - strideK) * Math.sin(G.tick * 0.05) * 0.5;
  const stepBob = Math.abs(Math.sin(ph)) * strideK * (1 - air) * 0.8;
  ctx.save();
  ctx.translate(0, idleBob - stepBob);

  /* ── piernas: mangueras cortas, sin rodilla, terminadas en un bulbo ── */
  const runAmp = 5.4;
  const cycA = { x: Math.sin(ph) * runAmp, y: FOOT_Y - Math.max(0, Math.sin(ph)) * 4.2 };
  const cycB = { x: Math.sin(ph + Math.PI) * runAmp, y: FOOT_Y - Math.max(0, Math.sin(ph + Math.PI)) * 4.2 };
  const groundA = { x: lerp(2.2, cycA.x, strideK), y: lerp(FOOT_Y, cycA.y, strideK) };
  const groundB = { x: lerp(-2.4, cycB.x, strideK), y: lerp(FOOT_Y, cycB.y, strideK) };
  const tuck = P.vy < 0 ? 1 : 0.45;
  const airA = { x: 4.4 * tuck, y: FOOT_Y - 5.4 * tuck };
  const airB = { x: -4.6, y: FOOT_Y - 1.8 * tuck };
  const fA = { x: lerp(groundA.x, airA.x, air), y: lerp(groundA.y, airA.y, air) };
  const fB = { x: lerp(groundB.x, airB.x, air), y: lerp(groundB.y, airB.y, air) };

  for (const [f, rear] of [[fB, true], [fA, false]]) {
    const col = rear ? mix(TROUSER, '#000000', 0.3) : TROUSER;
    // la manguera se arquea hacia afuera: la curva es la articulación
    hose(ctx, 0, HIP_Y, f.x * 0.75 + 1.4, (HIP_Y + f.y) / 2, f.x, f.y, 3.4, col, LW);
    shoe(ctx, f.x, f.y, rear);
  }

  /* ── faldón del gabán, arrastrando por detrás ── */
  const flap = P.coat.x;
  ctx.beginPath();
  ctx.moveTo(-3.6, TORSO_TOP + 1);
  ctx.quadraticCurveTo(-8.5 - flap, -11, -7 - flap * 1.4, -3.4 - air * 2);
  ctx.quadraticCurveTo(-4, -6.2, -1.4, -7.6);
  ctx.lineTo(1.4, TORSO_TOP + 2);
  ctx.closePath();
  inked(ctx, mix(th.cloak, '#000000', 0.26), LW);

  /* ── torso: chiquito, casi un pedestal para la cabeza ── */
  ctx.save();
  ctx.rotate(lean * 0.35);
  /* el torso es más ancho arriba que abajo: sin esa línea de hombro no hay de
     dónde colgar los brazos y terminan pareciendo salidos del pecho */
  ctx.beginPath();
  ctx.moveTo(-4.2, -8.4);
  ctx.quadraticCurveTo(-5.6, -11.4, -5.3, TORSO_TOP);
  ctx.lineTo(5.5, TORSO_TOP);
  ctx.quadraticCurveTo(5.8, -11.4, 4.4, -8.4);
  ctx.closePath();
  ctx.fillStyle = th.cloak;
  ctx.fill();
  shadeHalf(ctx, 0, -11, 6);
  ctx.strokeStyle = INK; ctx.lineWidth = LW; ctx.lineJoin = 'round';
  ctx.stroke();

  /* pechera de la camisa, corbata angosta y la chapa de escudo */
  ctx.beginPath();
  ctx.moveTo(-2, TORSO_TOP + 0.4);
  ctx.lineTo(2.4, TORSO_TOP + 0.4);
  ctx.lineTo(1.6, -9.6);
  ctx.lineTo(-1.4, -9.6);
  ctx.closePath();
  inked(ctx, SHIRT, LWD);

  ctx.beginPath();
  ctx.moveTo(0.1, TORSO_TOP + 1.2);
  ctx.lineTo(0.9, -10.6);
  ctx.lineTo(0, -9.2);
  ctx.lineTo(-0.7, -10.6);
  ctx.closePath();
  inked(ctx, IDENT, 0.5);

  shieldBadge(ctx, 3.1, -11.6, 1.9, IDENT);
  ctx.restore();

  /* El rig del brazo de disparo lo define game/player.js, no el dibujo: así el
     caño y el punto del que sale el paquete no se pueden desincronizar. */
  const rig = gunRig();
  const sy = rig.shoulderY;

  /* Los hombros van en el borde de la sisa, no en el eje del cuerpo, y giran
     con la inclinación del torso: anclados al centro, el brazo parecía salir
     del pecho, y sin el giro se despegaba del gabán al frenar. */
  const lr = lean * 0.35, lc = Math.cos(lr), lsn = Math.sin(lr);
  const jointX = x => x * lc - sy * lsn;
  const jointY = x => x * lsn + sy * lc;
  const gunSx = jointX(4.1), gunSy = jointY(4.1);
  const supSx = jointX(-4), supSy = jointY(-4);

  /* ── brazo de apoyo: una manguera que cuelga y una manopla suelta ── */
  const runSwing = Math.sin(ph + Math.PI) * 3.4;
  const groundSwing = lerp(-1.4, runSwing, strideK);
  const backSwing = lerp(groundSwing, -4, air);
  const supX = -5.4 + backSwing, supY = -9.6 + Math.abs(backSwing) * 0.2;
  hose(ctx, supSx, supSy, -5.6 + backSwing * 0.6, supSy + 2.1, supX, supY, 2.8, SHIRT, LW);
  shoulderCap(ctx, supSx, supSy, 2.9);
  mitt(ctx, supX, supY, 2.7, P.parry > 0 ? PINK : GLOVE);

  /* ── cabeza: la mitad del personaje ── */
  bitHead(ctx, aim, lean);

  /* ── brazo de disparo: el codo sigue el mismo corrimiento lateral que la mano,
     así el brazo se arquea por delante de la cara en vez de atravesarla ── */
  hose(ctx, gunSx, gunSy,
       2.6 + rig.side * 0.75 + Math.cos(aim) * 4.5 + Math.sin(aim) * 1.6,
       gunSy + 1.5 + Math.sin(aim) * 4.5,
       rig.hx, rig.hy, 2.9, SHIRT, LW);
  shoulderCap(ctx, gunSx, gunSy, 3.1);
  weapon(ctx, rig);
  /* sombra de contacto detrás del puño: sin esto el metal y el guante quedan
     como dos calcomanías superpuestas en vez de una sola cosa sostenida */
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.ellipse(rig.hx - Math.cos(aim) * 1.3, rig.hy - Math.sin(aim) * 1.3, 3, 2.3, aim, 0, 6.283);
  ctx.fill();
  ctx.restore();
  fist(ctx, rig.hx, rig.hy, 2.8, GLOVE, aim - rig.kick * 0.34);

  ctx.restore();
}

/**
 * Puño cerrado alrededor del arma: nudillos marcados y el mismo giro que el
 * cañón, en vez de una bocha fija — así se ve que sostiene algo y no que está
 * pegado encima.
 */
function fist(ctx, x, y, r, color, angle = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.88, 0, 0, 6.283);
  ctx.fillStyle = color;
  ctx.fill();
  shadeHalf(ctx, 0, 0, r, 0.14);
  ctx.strokeStyle = INK; ctx.lineWidth = LWD + 0.3;
  ctx.stroke();
  /* nudillos: dos arcos cortos sobre el frente del puño */
  ctx.strokeStyle = INK; ctx.lineWidth = 0.6; ctx.lineCap = 'round';
  for (const oy of [-r * 0.32, r * 0.3]) {
    ctx.beginPath();
    ctx.arc(r * 0.15, oy, r * 0.46, Math.PI * 0.2, Math.PI * 0.85);
    ctx.stroke();
  }
  /* pulgar, cruzado por encima como quien de verdad sostiene un arma */
  ctx.beginPath();
  ctx.arc(-r * 0.1, -r * 0.15, r * 0.6, -Math.PI * 0.75, -Math.PI * 0.1);
  ctx.strokeStyle = INK; ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.restore();
}

/**
 * Hombro: la manga asomando por la sisa del gabán. Va encima de la raíz de la
 * manguera, así el brazo queda enchufado a un hombro en vez de brotar del
 * torso.
 */
function shoulderCap(ctx, x, y, r) {
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.8, 0, 0, 6.283);
  ctx.fillStyle = SHIRT;
  ctx.fill();
  shadeHalf(ctx, x, y, r, 0.15);
  ctx.strokeStyle = INK; ctx.lineWidth = LW; ctx.lineJoin = 'round';
  ctx.stroke();
}

/** Manopla blanca: un bulbo con el pulgar marcado, flotando suelta del brazo. */
function mitt(ctx, x, y, r, color = GLOVE) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.92, 0, 0, 6.283);
  ctx.fillStyle = color;
  ctx.fill();
  shadeHalf(ctx, 0, 0, r, 0.12);
  ctx.strokeStyle = INK; ctx.lineWidth = LWD + 0.3;
  ctx.stroke();
  /* el pulgar: un arco corto, nada más */
  ctx.beginPath();
  ctx.arc(-r * 0.15, r * 0.1, r * 0.55, -Math.PI * 0.85, -Math.PI * 0.25);
  ctx.strokeStyle = INK; ctx.lineWidth = 0.7;
  ctx.stroke();
  ctx.restore();
}

/**
 * Chapa de escudo: la insignia de Bit. A diferencia del resto de la paleta,
 * que cambia con el tema del nivel, este azul es fijo — es la marca del
 * equipo azul, y no se mezcla con el color de sector.
 */
function shieldBadge(ctx, x, y, s, fill) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(-s, -s * 0.55);
  ctx.quadraticCurveTo(-s, -s * 0.9, -s * 0.45, -s * 0.85);
  ctx.quadraticCurveTo(0, -s * 0.95, s * 0.45, -s * 0.85);
  ctx.quadraticCurveTo(s, -s * 0.9, s, -s * 0.55);
  ctx.lineTo(s, s * 0.15);
  ctx.quadraticCurveTo(s, s * 0.75, 0, s);
  ctx.quadraticCurveTo(-s, s * 0.75, -s, s * 0.15);
  ctx.closePath();
  inked(ctx, fill, 0.9);
  /* galón: un ángulo simple adentro, la marca de rango */
  ctx.beginPath();
  ctx.moveTo(-s * 0.5, -s * 0.05);
  ctx.lineTo(0, s * 0.35);
  ctx.lineTo(s * 0.5, -s * 0.05);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.55;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
}

/**
 * La cabeza de Bit: un óvalo que ocupa la mitad de la figura, con dos ojos de
 * tarta, cejas y el sombrero de inspector encima. Todo el carácter vive acá —
 * abajo sólo hay soportes.
 */
function bitHead(ctx, aim, lean) {
  const lift = -Math.sin(aim) * 1.4;
  const R = HEAD_R;
  ctx.save();
  ctx.translate(lean * 2.4, HEAD_Y + lift * 0.5);

  /* cráneo: óvalo con la mandíbula apenas más angosta. Redondo a propósito —
     todo lo hostil de este juego es caja y ángulo, así que la única silueta
     curva de la pantalla tiene que ser la de Bit. */
  ctx.beginPath();
  ctx.moveTo(0, -R * 1.05);
  ctx.bezierCurveTo(R * 0.80, -R * 1.05, R * 1.10, -R * 0.50, R * 1.00, R * 0.12);
  ctx.bezierCurveTo(R * 0.92, R * 0.72, R * 0.50, R * 1.02, 0, R * 1.00);
  ctx.bezierCurveTo(-R * 0.50, R * 1.02, -R * 0.92, R * 0.72, -R * 1.00, R * 0.12);
  ctx.bezierCurveTo(-R * 1.10, -R * 0.50, -R * 0.80, -R * 1.05, 0, -R * 1.05);
  ctx.closePath();
  ctx.fillStyle = SHELL;
  ctx.fill();
  shadeHalf(ctx, 0, 0, R, 0.13);
  ctx.strokeStyle = INK; ctx.lineWidth = LW + 0.4; ctx.lineJoin = 'round';
  ctx.stroke();

  /* Los ojos, sin nariz que los separe: se tocan en el medio y quedan ellos
     solos como centro de la cara. */
  const look = 1;
  if (P.blink > 3) {
    ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    for (const [ex, ey, ew] of [[-2.8, -0.2, 2], [3, -0.4, 2.2]]) {
      ctx.beginPath();
      ctx.moveTo(ex - ew, ey); ctx.lineTo(ex + ew, ey);
      ctx.stroke();
    }
  } else {
    pieEye(ctx, -2.8, -0.2, 2.8, look, P.parry > 0 ? PINK : INK);
    pieEye(ctx, 3, -0.4, 3.1, look, P.parry > 0 ? PINK : INK);
  }

  /* cejas: dos arcos finos por encima. Con la nariz afuera, son lo único que
     le cambia el ánimo a la cara */
  ctx.strokeStyle = INK; ctx.lineWidth = 1.1; ctx.lineCap = 'round';
  for (const [bx, by, bw] of [[-2.9, -4.2, 2], [3.1, -4.5, 2.2]]) {
    ctx.beginPath();
    ctx.moveTo(bx - bw, by + 0.7);
    ctx.quadraticCurveTo(bx, by - 0.9, bx + bw, by + 0.5);
    ctx.stroke();
  }

  /* boca: una sola curva, y nada más abajo */
  ctx.beginPath();
  ctx.arc(0.8, 3.2, 2.5, 0.28, Math.PI - 0.5);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.3; ctx.lineCap = 'round';
  ctx.stroke();

  /* rubor en la mejilla libre */
  ctx.save();
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = BLUSH;
  ctx.beginPath();
  ctx.ellipse(-5, 2.8, 1.9, 1.2, 0, 0, 6.283);
  ctx.fill();
  ctx.restore();

  /* sombrero: cuelga del resorte P.hair, así que se inclina solo al frenar,
     saltar o caer — nunca queda clavado a la cabeza */
  ctx.save();
  ctx.translate(0.4, -R * 1.05 + 0.2);
  ctx.rotate(-0.12 + clamp(P.hair.x * 0.035, -0.4, 0.4));
  /* ala: una elipse ancha, que es lo que lo vuelve un sombrero y no un gorro */
  ctx.beginPath();
  ctx.ellipse(0, 0, 9.6, 2.1, 0, 0, 6.283);
  ctx.fillStyle = FELT;
  ctx.fill();
  shadeHalf(ctx, 0, 0, 9.6, 0.18);
  ctx.strokeStyle = INK; ctx.lineWidth = LW;
  ctx.stroke();
  /* copa con la hendidura de arriba */
  ctx.beginPath();
  ctx.moveTo(-4.6, 0.4);
  ctx.quadraticCurveTo(-5, -5.4, -3.4, -5.6);
  ctx.quadraticCurveTo(-1.6, -4.2, 0, -5.4);
  ctx.quadraticCurveTo(1.8, -4.2, 3.6, -5.6);
  ctx.quadraticCurveTo(5.2, -5.4, 4.8, 0.4);
  ctx.closePath();
  ctx.fillStyle = FELT;
  ctx.fill();
  shadeHalf(ctx, 0, -2.6, 5, 0.18);
  ctx.strokeStyle = INK; ctx.lineWidth = LW;
  ctx.stroke();
  /* cinta: azul de identidad fijo, no el acento del sector */
  pill(ctx, -4.8, -1.6, 9.8, 1.8, 0.7);
  inked(ctx, IDENT, 0.8);
  ctx.restore();

  ctx.restore();
}


/**
 * Zapato: un bulbo enorme, más grande que la pierna que lo sostiene. La punta
 * mira siempre a +x — el cuerpo entero ya vive dentro de un `scale(P.turn, …)`,
 * así que +x es "adelante" en los dos sentidos de marcha.
 */
function shoe(ctx, fx, fy, rear) {
  ctx.save();
  ctx.translate(fx, fy + 2.6);
  ctx.beginPath();
  ctx.moveTo(-3.2, -2.6);
  ctx.quadraticCurveTo(-4.4, 2.6, -2.6, 3);
  ctx.lineTo(4, 3);
  ctx.quadraticCurveTo(6.4, 2.4, 5.4, -0.6);
  ctx.quadraticCurveTo(3.6, -3.4, -3.2, -2.6);
  ctx.closePath();
  ctx.fillStyle = rear ? mix(BOOT, '#000000', 0.35) : BOOT;
  ctx.fill();
  shadeHalf(ctx, 0, 0, 5, 0.2);
  ctx.strokeStyle = INK; ctx.lineWidth = LW; ctx.lineJoin = 'round';
  ctx.stroke();
  /* suela clara: el único detalle que necesita */
  ctx.beginPath();
  ctx.moveTo(-2.8, 2.4);
  ctx.lineTo(4.2, 2.4);
  ctx.strokeStyle = PAPER; ctx.lineWidth = 1.1; ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();
}

/* ══════════════════════════════════ la herramienta en la mano */

/**
 * Cada herramienta tiene silueta propia y su propio golpe de retroceso: el caño
 * se hunde hacia atrás y se levanta con la patada, y el Antivirus corre la
 * corredera después de cada barrido. El fogonazo nace en la punta — el mismo
 * punto exacto del que sale el paquete.
 */
function weapon(ctx, rig) {
  const key = P.weapon;
  const w = WEAPONS[key];
  const kick = rig.kick;

  ctx.save();
  ctx.translate(rig.hx, rig.hy);
  ctx.rotate(rig.aim - kick * 0.34);
  ctx.translate(-kick * 2.2, 0);

  if (key === 'firewall') {
    /* lanzaladrillos: escupe bloques de muro */
    pill(ctx, -4, -3.4, 17, 6.8, 3.1);
    inked(ctx, STEEL_D, LW);
    shadeHalf(ctx, 4.5, 0, 8.5, 0.22);
    pill(ctx, -6, -2.2, 4, 4.4, 1.8);
    inked(ctx, mix(STEEL_D, '#000', 0.3), LWD);
    pill(ctx, 11, -3.6, 4, 7.2, 1.9);
    inked(ctx, w.color, LWD);
    shadeHalf(ctx, 13, 0, 3.6, 0.22);
    disc(ctx, 3.4, -4.4, 2.2, w.core, LWD);
    shine(ctx, 2.7, -5.1, 0.8, 0.45, -0.3, 0.65);
  } else if (key === 'antivirus') {
    /* pulverizador con tanque: es un aerosol, y se nota */
    const pumpK = P.pumpMax > 0 ? P.pump / P.pumpMax : 0;
    pill(ctx, -4, -2.6, 16, 5.2, 2.4);
    inked(ctx, mix('#2f7a44', '#000', 0.1), LW);
    shadeHalf(ctx, 4, 0, 8, 0.22);
    pill(ctx, -1 - Math.sin(pumpK * Math.PI) * 3.4, -3.6, 6, 2.6, 1.3);
    inked(ctx, STEEL, LWD);
    disc(ctx, -6, 1.4, 3.4, w.color, LWD);       // tanque
    shine(ctx, -6.8, 0, 1, 1.6, -0.5, 0.5);
  } else if (key === 'escaner') {
    pill(ctx, -3, -2.8, 14, 5.6, 2.7);
    inked(ctx, STEEL, LW);
    shadeHalf(ctx, 4, 0, 7, 0.22);
    ctx.beginPath();
    ctx.moveTo(5, -2.2); ctx.lineTo(11.5, -2.2); ctx.lineTo(10, 2.2); ctx.lineTo(5, 2.2);
    ctx.closePath();
    inked(ctx, w.color, LWD);
    shine(ctx, 7.4, -1, 1.6, 0.5, 0, 0.55);
  } else if (key === 'flood') {
    pill(ctx, -4, -2.4, 16, 4.8, 2.1);
    inked(ctx, STEEL_D, LW);
    shadeHalf(ctx, 4, 0, 8, 0.22);
    pill(ctx, 0.5, 1.8, 3.4, 4.6, 1.4);
    inked(ctx, STEEL, LWD);
    pill(ctx, 9, -1.6, 4.5, 3.2, 1.4);
    inked(ctx, mix(STEEL, '#000', 0.3), LWD);
    shine(ctx, 9.8, -2.1, 1.2, 0.4, 0, 0.5);
  } else {
    /* ping: linterna de datos, el don de fábrica */
    pill(ctx, -3, -2.4, 12, 4.8, 2.2);
    inked(ctx, STEEL, LW);
    shadeHalf(ctx, 3, 0, 6, 0.22);
    ctx.beginPath();
    ctx.moveTo(8, -3.4); ctx.lineTo(13, -4.6); ctx.lineTo(13, 4.6); ctx.lineTo(8, 3.4);
    ctx.closePath();
    inked(ctx, mix(STEEL, '#ffffff', 0.18), LWD);
    pill(ctx, 11.4, -3.2, 1.8, 6.4, 0.9);
    inked(ctx, w.color, 0.8);
  }

  /* empuñadura, común a todas: una sombra de contacto por debajo, y el trazo
     grueso de siempre encima — así el puño no queda flotando sobre el metal */
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = INK; ctx.lineWidth = 3.6; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-2.2, 1.9);
  ctx.quadraticCurveTo(-4.4, 4.9, -1.4, 5.7);
  ctx.stroke();
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(-2.2, 1.6);
  ctx.quadraticCurveTo(-4.4, 4.6, -1.4, 5.4);
  ctx.strokeStyle = INK; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
  ctx.stroke();

  /* carga del Firewall: un núcleo que crece en la boca y late al llegar al tope */
  if (w.charge && P.charge > 0) {
    const k = clamp(P.charge / w.charge, 0, 1);
    const full = k >= 1;
    const r = 1.5 + k * 4.5 + (full ? Math.sin(G.tick * 0.5) * 0.9 : 0);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, w.barrel, 0, 10 + k * 14, w.color, 0.35 + k * 0.5);
    ctx.globalCompositeOperation = 'source-over';
    if (full) {
      starPath(ctx, w.barrel, 0, r * 1.9, r * 0.8, 6, G.tick * 0.12, 3);
      inked(ctx, w.color, 1.2);
    }
    disc(ctx, w.barrel, 0, r, full ? '#ffffff' : w.core, 1.1);
    ctx.restore();
  }

  if (P.muzzle > 0) muzzleFlash(ctx, w);
  ctx.restore();
}

/** Fogonazo: estrella de tinta que se desinfla en unos pocos cuadros. */
function muzzleFlash(ctx, w) {
  const k = P.muzzleMax > 0 ? P.muzzle / P.muzzleMax : 0;
  const s = w.flashScale * (0.55 + k * 0.75);
  const x = w.barrel - 1;
  const rot = P.muzzleSeed;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, x + 2, 0, 15 * s, w.color, 0.55 * k);
  ctx.globalCompositeOperation = 'source-over';

  starPath(ctx, x + 3 * s, 0, 9 * s, 3.4 * s, w.flashPts, rot, P.muzzleSeed);
  inked(ctx, w.color, 1.2);
  starPath(ctx, x + 3 * s, 0, 5.2 * s, 1.8 * s, w.flashPts, rot + 0.4, P.muzzleSeed + 5);
  ctx.fillStyle = w.core;
  ctx.fill();

  for (let i = 0; i < 2; i++) {
    const side = i ? 1 : -1;
    puffPath(ctx, x + 2 * s, side * 3.2 * s, 2.4 * s, P.muzzleSeed + i * 3, 6);
    ctx.globalAlpha = 0.5 * k;
    inked(ctx, '#e6d5ae', 0.8);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

