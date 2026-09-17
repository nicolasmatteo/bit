/* El candado y lo que sostiene: la criatura y las zonas cifradas que cuelgan de
   ella. Van juntos a propósito — las cadenas que le salen del cuerpo son las
   mismas que marcan el tramo de piso bloqueado, y es lo que deja ver de un
   vistazo cuál de los bichos está sosteniendo qué. */

import { G } from '../../game/state.js';
import { rgba, mix, glow } from '../../util.js';
import { INK, boil, inked, disc, pill, shadeHalf, label, BODY } from '../ink.js';
import { PINK, LW, LWD, eye } from './base.js';

/* ── Ransomware Lock ──
   Una criatura-candado: cuerpo macizo de caja fuerte, arco de acero arriba, y
   en el pecho una pantalla que muestra el candado cerrado. De los costados le
   cuelgan cadenas digitales, y mientras tiene un tramo cifrado esas cadenas
   se estiran hasta las esquinas de la zona — así se ve de un vistazo cuál de
   los bichos está sosteniendo el bloqueo. */
export function ransomware(ctx, e, th, hostile, flash) {
  const body = flash ? '#ffffff' : '#9a8ab4';
  const bodyLo = flash ? '#ffffff' : '#6d5d8c';
  const dark = flash ? '#ffffff' : '#4b3f63';
  const steel = flash ? '#ffffff' : '#aab4bf';
  const x = e.x + e.w / 2, y = e.y + e.h / 2;
  const cracked = e.hp <= e.maxHp * 0.3;
  const alert = e.telegraph > 0;
  const holding = !!e.lock;
  const look = Math.sign(Math.cos(e.ang)) || 1;

  /* las cadenas al territorio van primero y en coordenadas de mundo: pasan por
     debajo del cuerpo y salen del dibujo del bicho */
  if (holding) lockTethers(ctx, e);

  ctx.save();
  ctx.translate(x + boil(e.x, 0.22), y + boil(e.x + 4, 0.22));

  /* ── cadenas colgando de los flancos ──
     Eslabones anillados y alternando de canto: dos óvalos rellenos uno abajo
     del otro no se leen como cadena, se leen como bolitas. */
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side * 10, 0);
    ctx.rotate(side * (0.18 + Math.sin(e.t * 0.05 + side) * 0.13));
    for (let i = 0; i < 4; i++) {
      const flat = i % 2 === 1;
      ctx.beginPath();
      ctx.ellipse(0, 3.4 + i * 2.9, flat ? 2.3 : 1.5, flat ? 1.5 : 2.4, 0, 0, 6.283);
      ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.strokeStyle = flat ? mix(steel, '#000000', 0.28) : steel; ctx.lineWidth = 1.1;
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ── el arco de acero: entero arriba, colgando cuando la cerradura cede ── */
  ctx.save();
  ctx.translate(0, -9.5);
  if (cracked) { ctx.translate(-2.4, 1.8); ctx.rotate(-0.58); }
  ctx.beginPath();
  ctx.arc(0, 0, 7, Math.PI, cracked ? 0.35 : 0);
  ctx.strokeStyle = INK; ctx.lineWidth = 6.8; ctx.lineCap = 'round';
  ctx.stroke();
  ctx.strokeStyle = steel; ctx.lineWidth = 3.8;
  ctx.stroke();
  /* el brillo del metal, sobre el hombro izquierdo del arco */
  ctx.beginPath();
  ctx.arc(0, 0, 7, Math.PI * 1.08, Math.PI * 1.34);
  ctx.strokeStyle = rgba('#ffffff', 0.55); ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();

  /* ── cañón de cadenas ──
     Sale de una rótula apoyada en el borde del cuerpo, no del aire: sin esa
     junta el caño parecía una calcomanía pegada encima. */
  ctx.save();
  ctx.rotate(e.ang);
  pill(ctx, 8, -3, 10, 6, 2.6);
  ctx.fillStyle = dark;
  ctx.fill();
  shadeHalf(ctx, 13, 0, 6, 0.22);
  ctx.strokeStyle = INK; ctx.lineWidth = LW; ctx.lineJoin = 'round';
  ctx.stroke();
  /* aro de boca */
  pill(ctx, 15.6, -3.4, 2.6, 6.8, 1);
  inked(ctx, mix(steel, '#000000', 0.25), LWD);
  if (alert) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, 18, 0, 9, hostile, 0.5);
    ctx.restore();
  }
  /* La rótula va en el borde del cuerpo (que llega a x=11) y no adentro: más
     al centro queda tapada por el cuerpo, que se dibuja después, y el caño
     vuelve a parecer pegado al aire. */
  disc(ctx, 10.5, 0, 3.5, mix(steel, '#000000', 0.15), LW);
  disc(ctx, 10.5, 0, 1.3, dark, 0.8);
  ctx.restore();

  /* ── el cuerpo: caja maciza de cerradura ── */
  pill(ctx, -11, -6, 22, 18, 3.4);
  ctx.fillStyle = body;
  ctx.fill();
  shadeHalf(ctx, 0, 3, 11, 0.2);
  ctx.strokeStyle = INK; ctx.lineWidth = LW + 0.4; ctx.lineJoin = 'round';
  ctx.stroke();

  /* chapa frontal atornillada: le da el espesor de caja fuerte */
  pill(ctx, -9.2, -4.2, 18.4, 14.4, 2.4);
  ctx.strokeStyle = rgba(INK, 0.3); ctx.lineWidth = 0.9;
  ctx.stroke();
  for (const [rx, ry] of [[-9.6, -4.4], [9.6, -4.4], [-9.6, 10.2], [9.6, 10.2]]) {
    disc(ctx, rx, ry, 0.85, bodyLo, 0.6);
  }

  /* dos ojos sobre la pantalla: sigue siendo una criatura, no un mueble */
  eye(ctx, -4.1, -2.4, 2.3, look, hostile, alert);
  eye(ctx, 4.2, -2.6, 2.4, look, hostile, alert);

  /* ── la pantalla: candado cerrado mientras cifra, abierto cuando cede ── */
  const scr = [-7.8, 1.4, 15.6, 7, 1.6];
  if (holding) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, 0, 4.9, 15, hostile, 0.28);
    ctx.restore();
  }
  pill(ctx, ...scr);
  const lit = holding ? mix(hostile, '#000000', 0.4) : '#16202c';
  inked(ctx, flash ? '#ffffff' : lit, LWD);
  lockGlyph(ctx, 0, 4.9, holding && !cracked,
            flash ? '#ffffff' : (holding ? '#ffd9a8' : '#7fe0d0'), lit);

  /* barrido de tubo sobre la pantalla */
  ctx.save();
  pill(ctx, ...scr);
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,.10)';
  ctx.fillRect(-7.8, 1.4 + ((e.t * 0.5) % 7), 15.6, 1.4);
  ctx.restore();

  /* ── los tambores, en fila sobre el borde de abajo ──
     Es el único medidor de daño que tiene el bicho, así que va adentro del
     cuerpo y bien separado: antes caía en y=12.4 con el cuerpo terminando en
     11.5, o sea colgando en el aire. */
  const tw = 16 / e.combo;
  for (let i = 0; i < e.combo; i++) {
    const tx = -8 + i * tw + tw / 2;
    const open = i < e.tumbler;
    disc(ctx, tx, 10, 1.6, open ? '#241b30' : steel, 1);
    if (open) continue;
    const a = e.t * 0.05 + i * 1.7;
    ctx.beginPath();
    ctx.moveTo(tx, 10);
    ctx.lineTo(tx + Math.cos(a) * 1.15, 10 + Math.sin(a) * 1.15);
    ctx.strokeStyle = rgba(INK, 0.6); ctx.lineWidth = 0.8; ctx.lineCap = 'round';
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * El candado de la pantalla: arco arriba, cuerpo abajo y el ojo de la cerradura
 * recortado en el medio. El ojo se recorta pintando con el color de la pantalla
 * encima del cuerpo — es lo más reconocible de un candado y sin él el glifo era
 * una pastilla con un rulo.
 */
function lockGlyph(ctx, x, y, closed, color, screen) {
  ctx.save();
  ctx.translate(x, y);

  ctx.beginPath();
  if (closed) ctx.arc(0, -2.5, 2.1, Math.PI, 0);
  else ctx.arc(2, -2.9, 2.1, Math.PI, 0.5);   // abierto: el arco queda colgando
  ctx.strokeStyle = color; ctx.lineWidth = 1.3; ctx.lineCap = 'round';
  ctx.stroke();

  pill(ctx, -3, -1.4, 6, 4.8, 0.8);
  ctx.fillStyle = color;
  ctx.fill();

  ctx.fillStyle = screen;
  ctx.beginPath();
  ctx.arc(0, 0.5, 0.95, 0, 6.283);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-0.55, 0.9); ctx.lineTo(0.55, 0.9);
  ctx.lineTo(0.35, 2.7); ctx.lineTo(-0.35, 2.7);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * Cadenas del bicho a las esquinas de su zona. Son la única pista de qué
 * criatura sostiene qué bloqueo, así que se dibujan siempre por encima del
 * terreno y por debajo del cuerpo.
 */
function lockTethers(ctx, e) {
  const L = e.lock;
  const ax = e.x + e.w / 2, ay = e.y + e.h / 2;
  const fade = Math.min(1, L.life / 60);
  ctx.save();
  ctx.globalAlpha = 0.5 + Math.sin(e.t * 0.12) * 0.12;
  for (const cx of [L.x + 3, L.x + L.w - 3]) {
    const cy = L.y + 3;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.quadraticCurveTo((ax + cx) / 2, (ay + cy) / 2 + 7, cx, cy);
    ctx.strokeStyle = rgba(INK, 0.55 * fade); ctx.lineWidth = 3.4; ctx.lineCap = 'round';
    ctx.stroke();
    ctx.strokeStyle = rgba('#c9a8ff', 0.9 * fade); ctx.lineWidth = 1.6;
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * La zona cifrada. El terreno de abajo se sigue dibujando entero — lo que se
 * pinta acá es la capa que dice "esto ya no te sostiene": una reja de glifos
 * que baja, el borde de cadena, y un parpadeo cuando está por caducar.
 */
/**
 * El aviso antes de cifrar: el piso todavía sostiene. Tiene que leerse distinto
 * de una zona ya cifrada — sin reja de glifos, sólo un marco que titila cada
 * vez más rápido y un relleno que sube a medida que se acaba el tiempo. Si se
 * pareciera a la zona armada, el jugador creería que ya perdió el piso y no
 * aprovecharía el segundo que tiene.
 */
function lockWarning(ctx, L) {
  const k = 1 - L.arm / L.armMax;                  // 0 recién marcada → 1 por cifrar
  const rate = 7 - Math.floor(k * 5);              // titila más rápido al final
  const on = ((G.tick / rate) | 0) % 2 === 0;
  ctx.save();
  pill(ctx, L.x, L.y, L.w, L.h, 3);
  ctx.fillStyle = `rgba(185,140,255,${0.08 + k * 0.22})`;
  ctx.fill();
  ctx.globalAlpha = on ? 1 : 0.35;
  ctx.strokeStyle = PINK;
  ctx.lineWidth = 2.4;
  ctx.setLineDash([3, 3]);
  ctx.stroke();
  ctx.setLineDash([]);
  label(ctx, '!', L.x + L.w / 2, L.y + L.h / 2 + 6, 16, '#ffffff', 'center', '0', 3, BODY);
  ctx.restore();
}

export function drawLocks(ctx) {
  /* La animación va con G.tick y no con un contador de la zona: un enemigo
     fuera de pantalla no corre su IA, y con un contador propio los glifos se
     congelaban al alejarte. */
  for (const L of G.locks) {
    if (L.arm > 0) { lockWarning(ctx, L); continue; }
    const dying = L.life < 80 && (G.tick >> 2) % 2 === 0;
    ctx.save();
    ctx.globalAlpha = dying ? 0.34 : 0.62;

    pill(ctx, L.x, L.y, L.w, L.h, 3);
    ctx.fillStyle = 'rgba(24,12,40,0.72)';
    ctx.fill();

    /* glifos cayendo: el cifrado, literal */
    ctx.save();
    ctx.clip();
    for (let c = 0; c < L.w / 9; c++) {
      const speed = 0.5 + ((c * 37) % 7) * 0.16;
      for (let r = -1; r < L.h / 11 + 1; r++) {
        const gy = L.y + ((r * 11 + G.tick * speed) % (L.h + 11));
        ctx.globalAlpha = (dying ? 0.3 : 0.6) * (0.35 + ((c + r) % 3) * 0.3);
        ctx.fillStyle = 'rgba(201,168,255,0.85)';
        ctx.fillRect(L.x + 3 + c * 9, gy, 3.4, ((c + r) % 2 ? 5 : 2.6));
      }
    }
    ctx.restore();

    /* borde: cadena de eslabones corriendo por el perímetro */
    ctx.globalAlpha = dying ? 0.5 : 0.95;
    pill(ctx, L.x, L.y, L.w, L.h, 3);
    ctx.strokeStyle = '#c9a8ff'; ctx.lineWidth = 2.2;
    ctx.setLineDash([5, 4]);
    ctx.lineDashOffset = -G.tick * 0.5;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
}

/* ── Keylogger ──
   Ciempiés hecho de teclas, con una cabeza desproporcionada al frente. Los
   segmentos suben y bajan en oleada; la cabeza tiene dos ojos y una sonrisa
   demasiado ancha para el cuerpo que arrastra. */
