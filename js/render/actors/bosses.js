/* Los tres jefes. Cada uno ocupa lo que ocupan diez enemigos comunes, y por eso
   están fuera de `enemies.js`: son piezas grandes, no tres entradas más de la
   lista. Los dibuja el despachante de ahí, que los importa. */

import { G } from '../../game/state.js';
import { headPoints } from '../../game/enemies.js';
import { rgba, clamp, noise2, glow } from '../../util.js';
import {
  INK, boil, inked, hose, disc, pill, shadeHalf, puffPath, shine, label, BODY,
} from '../ink.js';
import { eye, brows, LW, LWD } from './base.js';

/* ══════════════════ jefe 01 — THE ROOTKIT MONARCH ══════════════════ */

/* Un rootkit no se muestra: se esconde en lo más hondo del sistema con
   permisos totales. Por eso no tiene cara — bajo la capucha hay vacío, dos ojos
   y un cursor que parpadea donde iría la boca. La corona está hecha de llaves
   (tiene todos los accesos), el cetro es una llave maestra y en el pecho lleva
   el prompt de root. Cada tanto el manto parpadea como un proceso que se
   oculta de la lista. */
export function monarca(ctx, e, th, hostile, flash) {
  const robe = flash ? '#ffffff' : '#2b1a3c';
  const robeLo = flash ? '#ffffff' : '#1a0f26';
  const gold = flash ? '#ffffff' : '#e8b84a';
  const code = '#b98cff';
  const x = e.x + e.w / 2, feet = e.y + e.h, f = e.dir;
  const alert = e.telegraph > 0 || e.wellT > 0;
  const rage = e.hp < e.maxHp * 0.4;
  const lift = e.wellT > 0 ? 4 : 0;          // con el pozo abierto el ruedo sube
  /* el camuflaje: cuatro cuadros cada tres segundos, más seguido en furia */
  const cloak = ((e.t % (rage ? 110 : 180)) < 4);

  if (e.wellT > 0) gravityWell(ctx, e);

  ctx.save();
  ctx.translate(x + boil(e.x, 0.4), feet + boil(e.x + 5, 0.4));
  ctx.scale(f, 1);
  if (cloak) ctx.globalAlpha = 0.45;

  /* ── manto: trapecio largo, ruedo ondulado ── */
  const hem = (k) => Math.sin(e.float * 1.3 + k) * 2.2;
  const robePath = () => {
    ctx.beginPath();
    ctx.moveTo(-14, -40);
    ctx.quadraticCurveTo(-24, -20, -27, -1 - lift + hem(0));
    ctx.quadraticCurveTo(-13, -5 - lift + hem(1), 0, -2 - lift + hem(2));
    ctx.quadraticCurveTo(13, -5 - lift + hem(3), 27, -1 - lift + hem(4));
    ctx.quadraticCurveTo(24, -20, 14, -40);
    ctx.closePath();
  };
  robePath();
  ctx.fillStyle = robe;
  ctx.fill();
  /* código bajando por adentro del manto */
  ctx.save();
  ctx.clip();
  ctx.fillStyle = rgba(code, flash ? 0 : 0.22);
  for (let i = 0; i < 9; i++) {
    const yy = -40 + (((e.t * 0.35) + i * 5) % 42);
    const ww = 4 + noise2(i, (G.tick / 12) | 0) * 16;
    ctx.fillRect(-18 + noise2(i, 3) * 10, yy, ww, 1.6);
  }
  ctx.restore();
  robePath();
  shadeHalf(ctx, 0, -20, 26, 0.22);
  ctx.strokeStyle = INK; ctx.lineWidth = 2.8; ctx.lineJoin = 'round';
  ctx.stroke();

  /* ribete de pista de circuito, en dorado */
  ctx.beginPath();
  ctx.moveTo(-23, -6 - lift); ctx.quadraticCurveTo(0, -9 - lift, 23, -6 - lift);
  ctx.moveTo(-3, -38); ctx.lineTo(-3, -30); ctx.lineTo(-8, -25);
  ctx.moveTo(3, -38); ctx.lineTo(3, -30); ctx.lineTo(8, -25);
  ctx.strokeStyle = gold; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
  ctx.stroke();

  /* el prompt de root en el pecho */
  pill(ctx, -6.5, -24, 13, 8, 1.6);
  inked(ctx, '#0b0710', 1.4);
  label(ctx, (G.tick >> 5) % 2 ? '#_' : '#', -4.4, -17.4, 7, '#7dffb0', 'left', '0', 0, BODY);

  /* ── hombreras ── */
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(side * 14, -39, 6.5, 4.6, side * 0.3, 0, 6.283);
    ctx.fillStyle = robeLo;
    ctx.fill();
    shadeHalf(ctx, side * 14, -39, 6.5, 0.2);
    ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.stroke();
    disc(ctx, side * 14, -40, 1.4, gold, 0.9);
  }

  /* ── brazo de atrás, con guantelete ── */
  const swA = Math.sin(e.float + 1.6) * 3;
  hose(ctx, -13, -36, -21, -28 + swA, -22, -18 + swA, 5, robeLo, 2.2);
  pill(ctx, -25.5, -21 + swA, 7, 6, 1.8);
  inked(ctx, gold, 1.8);

  /* ── capucha y vacío ── */
  ctx.beginPath();
  ctx.moveTo(-17, -40);
  ctx.quadraticCurveTo(-21, -62, 0, -67);
  ctx.quadraticCurveTo(21, -62, 17, -40);
  ctx.quadraticCurveTo(0, -35, -17, -40);
  ctx.closePath();
  ctx.fillStyle = robe;
  ctx.fill();
  shadeHalf(ctx, 0, -52, 18, 0.22);
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.lineJoin = 'round';
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(1, -50, 11, 10.5, 0, 0, 6.283);
  ctx.fillStyle = '#07040b';
  ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.stroke();

  /* los ojos en la oscuridad: el mismo ojo de tarta del reparto, con resplandor */
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, 1, -52, 16, alert ? hostile : code, alert ? 0.55 : 0.3);
  ctx.restore();
  eye(ctx, -3.8, -52, 3.4, 1, hostile, alert);
  eye(ctx, 5.4, -52.5, 3.7, 1, hostile, alert);
  if (alert || rage) brows(ctx, 1, -55.5, 3.2, 1.6);

  /* boca: un cursor que parpadea */
  if ((G.tick >> 4) % 2 || alert) {
    ctx.fillStyle = alert ? hostile : '#7dffb0';
    ctx.fillRect(-2, -44, 6, 1.8);
  }

  /* grietas de furia en la capucha */
  if (rage) {
    ctx.beginPath();
    ctx.moveTo(-12, -58); ctx.lineTo(-8, -55); ctx.lineTo(-10, -50);
    ctx.moveTo(13, -56); ctx.lineTo(10, -52); ctx.lineTo(13, -48);
    ctx.strokeStyle = hostile; ctx.lineWidth = 1.3; ctx.stroke();
  }

  /* ── corona de llaves ── */
  ctx.save();
  ctx.translate(0, -64);
  if (rage) ctx.rotate(-0.16);
  pill(ctx, -13, -3, 26, 5, 1.6);
  inked(ctx, gold, 2.2);
  for (let i = 0; i < 5; i++) {
    const kx = -10.5 + i * 5.25, tall = i === 2 ? 11 : (i % 2 ? 7 : 9);
    ctx.beginPath();
    ctx.rect(kx - 1, -3 - tall, 2, tall);
    inked(ctx, gold, 1.4);
    ctx.beginPath();
    ctx.arc(kx, -4 - tall, 2.2, 0, 6.283);
    inked(ctx, gold, 1.4);
    disc(ctx, kx, -4 - tall, 0.8, robeLo, 0);
  }
  disc(ctx, 0, -0.5, 1.8, alert ? hostile : code, 1.1);
  ctx.restore();

  /* ── el brazo de adelante con la llave maestra ── */
  const swB = Math.sin(e.float) * 3;
  const hx = 22, hy = -22 + swB;
  /* la llave: caña larga, anillo arriba, dientes abajo */
  ctx.save();
  ctx.translate(hx + 1, hy);
  ctx.rotate(0.08);
  pill(ctx, -1.6, -34, 3.2, 44, 1.4);
  inked(ctx, gold, 2);
  ctx.beginPath();
  ctx.arc(0, -38, 5.4, 0, 6.283);
  inked(ctx, gold, 2);
  disc(ctx, 0, -38, 2.2, alert ? hostile : code, 1);
  ctx.beginPath();
  ctx.moveTo(1.6, 4); ctx.lineTo(6, 4); ctx.lineTo(6, 7); ctx.lineTo(3.5, 7); ctx.lineTo(3.5, 10); ctx.lineTo(1.6, 10);
  ctx.closePath();
  inked(ctx, gold, 1.6);
  shine(ctx, -0.4, -26, 0.6, 5, 0, 0.55);
  ctx.restore();

  hose(ctx, 13, -36, 21, -30 + swB, hx, hy, 5, robeLo, 2.2);
  pill(ctx, hx - 4, hy - 3.5, 8, 7, 2);
  inked(ctx, gold, 1.8);

  ctx.restore();
}

/** El pozo de gravedad: rayas ascendentes y un velo violeta sobre la arena. */
function gravityWell(ctx, e) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = rgba('#c08cff', 0.28);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let i = 0; i < 26; i++) {
    const x = G.cam.x + ((i * 61 + noise2(i, 2) * 40) % G.view.w);
    const y = G.cam.y + ((G.view.h - (G.tick * 2.4 + i * 37) % (G.view.h + 60)));
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - 14);
  }
  ctx.stroke();
  ctx.restore();
}

/* ══════════════════ jefe 02 — BARON VON DDoS ══════════════════ */

export function baron(ctx, e, th, hostile, flash) {
  const body = flash ? '#ffffff' : '#4d5a6e';
  const dark = flash ? '#ffffff' : '#2a323f';
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
  const alert = e.telegraph > 0;

  ctx.save();
  ctx.translate(boil(e.x, 0.45), boil(e.x + 8, 0.45));

  /* la nube de la botnet */
  puffPath(ctx, cx, cy, e.w * 0.46, e.spin, 7, 0.62);
  ctx.fillStyle = body;
  ctx.fill();
  shadeHalf(ctx, cx, cy, e.w * 0.46, 0.17);
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.lineJoin = 'round';
  ctx.stroke();

  /* nodos encendidos adentro: la flota de equipos tomados */
  ctx.save();
  puffPath(ctx, cx, cy, e.w * 0.46, e.spin, 7, 0.62);
  ctx.clip();
  for (let i = 0; i < 14; i++) {
    const a = i * 1.7 + e.spin * 2;
    const r = (i % 4) * 9 + 6;
    const bx = cx + Math.cos(a) * r * 1.5, by = cy + Math.sin(a) * r * 0.7;
    const on = noise2(i, (G.tick / 7) | 0) > 0.45;
    disc(ctx, bx, by, 2, on ? '#ffd23d' : dark, 0.8);
  }
  ctx.restore();

  /* ── tres cabezas ── la del medio es el Barón; las otras dos, secuaces */
  const hs = headPoints(e);
  for (const [i, h] of hs.entries()) {
    const hy = h.y + Math.sin(e.float + i) * 2;
    const main = i === 1;
    const r = main ? 13 : 10;

    /* cuello de manguera */
    hose(ctx, cx, cy, (cx + h.x) / 2, (cy + hy) / 2 + 4, h.x, hy, main ? 8 : 6.5, dark, 2.2);

    ctx.beginPath();
    ctx.arc(h.x, hy, r, 0, 6.283);
    ctx.fillStyle = body;
    ctx.fill();
    shadeHalf(ctx, h.x, hy, r, 0.15);
    ctx.strokeStyle = INK; ctx.lineWidth = 2.6;
    ctx.stroke();

    eye(ctx, h.x - r * 0.32, hy - r * 0.12, r * 0.36, 1, hostile, alert);
    eye(ctx, h.x + r * 0.34, hy - r * 0.16, r * 0.4, 1, hostile, alert);
    brows(ctx, h.x, hy - r * 0.42, r * 0.38, alert ? 1.5 : 0.9);

    if (main) {
      /* monóculo y bigote: el chiste que lo vuelve un barón y no una nube */
      ctx.beginPath();
      ctx.arc(h.x + r * 0.34, hy - r * 0.16, r * 0.55, 0, 6.283);
      ctx.strokeStyle = '#f0c94e'; ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(h.x + r * 0.75, hy + r * 0.25);
      ctx.lineTo(h.x + r * 1.05, hy + r * 0.95);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
      ctx.stroke();

      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(h.x, hy + r * 0.45);
        ctx.quadraticCurveTo(h.x + side * r * 0.7, hy + r * 0.3,
                             h.x + side * r * 0.85, hy + r * 0.72);
        ctx.strokeStyle = INK; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
        ctx.stroke();
      }
    } else {
      ctx.beginPath();
      ctx.arc(h.x, hy + r * 0.32, r * 0.42, 0.2, Math.PI - 0.2);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
      ctx.stroke();
    }

    /* antena */
    ctx.beginPath();
    ctx.moveTo(h.x, hy - r);
    ctx.lineTo(h.x + Math.cos(h.ang) * 4, hy - r - 7);
    ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    ctx.stroke();
    disc(ctx, h.x + Math.cos(h.ang) * 4, hy - r - 7, 1.9, alert ? hostile : '#ffd23d', 1);
  }

  /* moño de barón, abajo del todo */
  ctx.save();
  ctx.translate(cx, cy + e.h * 0.34);
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(side * 12, -5.5);
    ctx.lineTo(side * 12, 5.5);
    ctx.closePath();
    inked(ctx, '#c9382f', 2);
  }
  disc(ctx, 0, 0, 2.8, '#a02a22', 1.6);
  ctx.restore();
  ctx.restore();
}


/* ══════════════════ jefe 03 — EL IMPLANTE ══════════════════

   Un chip soldado al piso: cuerpo negro de encapsulado, patas de integrado a
   los costados y una ventana de silicio en el medio por donde se le ve el ojo.
   No tiene cuerpo de bicho porque no es un programa — es una pieza.

   El dibujo es el mismo para el original y para las copias, y tiene que serlo:
   la fase de copias no sería un acertijo si se distinguieran por la silueta.
   Lo único que cambia son las dos pistas — la sombra (la pone `drawEnemy`, que
   no se la da a nada que flote) y el parpadeo del Escáner. */

export function implanteChip(ctx, e, th, hostile, flash) {
  const cx = e.x + e.w / 2, feet = e.y + e.h;
  const copia = e.type === 'copia';
  const alerta = e.telegraph > 0;
  const marcado = e.marcado > 0;
  const body = flash ? '#ffffff' : '#171b22';
  const bodyLo = flash ? '#ffffff' : '#0d1015';
  const pin = flash ? '#ffffff' : '#c2cbd6';
  const chapa = marcado ? '#ff6ec7' : (alerta ? hostile : '#9fe8ff');

  ctx.save();
  ctx.translate(cx + boil(e.x, 0.3), feet + boil(e.x + 7, 0.3));
  /* la copia late apenas: una imagen que se refresca, no una cosa apoyada */
  if (copia) ctx.globalAlpha = 0.9 + Math.sin(e.float * 2) * 0.1;

  /* ── patas del encapsulado: siete por lado, clavadas en el piso ── */
  for (const side of [-1, 1]) {
    for (let i = 0; i < 7; i++) {
      const px = side * (12 + i * 5.2);
      ctx.beginPath();
      ctx.moveTo(px, -6);
      ctx.lineTo(px, 1.5);
      ctx.strokeStyle = INK; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
      ctx.stroke();
      ctx.strokeStyle = pin; ctx.lineWidth = 1.6;
      ctx.stroke();
    }
  }

  /* ── el encapsulado ── */
  pill(ctx, -38, -40, 76, 36, 3);
  ctx.fillStyle = body;
  ctx.fill();
  shadeHalf(ctx, 0, -22, 38, 0.24);
  ctx.strokeStyle = INK; ctx.lineWidth = LW + 1.2; ctx.lineJoin = 'round';
  ctx.stroke();

  /* la muesca de orientación, arriba a la izquierda: todo integrado tiene una */
  ctx.beginPath();
  ctx.arc(-30, -40, 4, 0, Math.PI);
  ctx.fillStyle = bodyLo;
  ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.4;
  ctx.stroke();

  /* serigrafía: el número de pieza, que es el chiste */
  label(ctx, copia ? 'FW-000' : 'FW-000', 22, -33, 6, rgba('#8f9aa8', 0.9), 'center', '0.1em', 0, BODY);

  /* ── la ventana de silicio, con la pista adentro ── */
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, 0, -22, marcado ? 46 : 30, chapa, marcado ? 0.6 : (alerta ? 0.45 : 0.28));
  ctx.restore();

  pill(ctx, -21, -33, 42, 22, 2.4);
  inked(ctx, '#0a1218', LWD + 0.4);

  /* pistas de circuito dentro de la ventana: se mueven despacio */
  ctx.save();
  pill(ctx, -21, -33, 42, 22, 2.4);
  ctx.clip();
  ctx.strokeStyle = rgba(chapa, 0.34);
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const yy = -31 + i * 4.4;
    const off = ((G.tick * 0.35 + i * 13) % 44) - 22;
    ctx.beginPath();
    ctx.moveTo(-21, yy);
    ctx.lineTo(off, yy);
    ctx.lineTo(off + 4, yy + 2.2);
    ctx.lineTo(21, yy + 2.2);
    ctx.stroke();
  }
  ctx.restore();

  /* el ojo: uno solo, grande, en el centro de la pastilla */
  eye(ctx, 0, -22, 6.2, e.dir, hostile, alerta || marcado);
  if (alerta || e.hp < e.maxHp * 0.34) brows(ctx, 0, -29, 5, 1.3);

  /* en fase de copias, el original y las copias muestran el mismo cartel */
  if (e.copiaT > 0 || copia) {
    label(ctx, '¿ ?', 0, -46, 9, rgba(chapa, 0.85), 'center', '0.2em', 2, BODY);
  }
  ctx.restore();
}
