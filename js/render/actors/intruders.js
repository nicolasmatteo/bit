/* Los tres que no pelean de frente, dibujados.

   El Rootkit es el caso raro del reparto: la mitad del tiempo su dibujo es
   *casi nada*. Esa casi-nada es su mecánica, así que está calibrada — cuanto
   más cerca estás, más se nota, y nunca llega a ser invisible del todo. Un
   enemigo que no se puede ver con cuidado no es difícil, es tramposo. */

import { G, P } from '../../game/state.js';
import { rgba, clamp, mix, noise2, glow } from '../../util.js';
import {
  INK, boil, inked, hose, disc, pill, shadeHalf, shine, label, BODY,
} from '../ink.js';
import { PINK, LW, LWD, eye, brows } from './base.js';

/* ── Rootkit ──────────────────────────────────────────────────────────────
   Una mancha oscura con dos ojos y fragmentos de código que aparecen y se
   apagan. No tiene silueta fija: el borde le hierve más que al resto. */

const GLYPHS = ['0', '1', '/', '#', '$', 'x', '?'];

export function rootkitBug(ctx, e, th, hostile, flash) {
  if (e.mode === 'dentro') return;              // lo dibuja su anfitrión
  if (e.mode === 'oculto') { rootkitGhost(ctx, e); return; }

  const x = e.x + e.w / 2, feet = e.y + e.h;
  const body = flash ? '#ffffff' : '#241a33';
  const code = flash ? '#ffffff' : '#b98cff';
  const asustado = e.mode === 'revela';

  ctx.save();
  ctx.translate(x + boil(e.x, 0.6), feet + boil(e.x + 3, 0.6));
  /* al revelarse tiembla; cazando, se agazapa */
  if (asustado) ctx.translate(Math.sin(e.t * 0.9) * 1.4, 0);
  const squash = e.leap > 0 ? 0.88 : 1;
  ctx.scale(1 / squash, squash);

  /* cuerpo: media gota con el ruedo dentado, como una sombra mal recortada */
  ctx.beginPath();
  ctx.moveTo(-11, 0);
  ctx.quadraticCurveTo(-12, -14, 0, -15.5);
  ctx.quadraticCurveTo(12, -14, 11, 0);
  for (let i = 0; i < 5; i++) {
    const sx = 11 - i * 4.4;
    ctx.lineTo(sx - 2.2, -2.4 - noise2(i, (e.t / 9) | 0) * 1.6);
    ctx.lineTo(sx - 4.4, 0);
  }
  ctx.closePath();
  ctx.fillStyle = body;
  ctx.fill();
  shadeHalf(ctx, 0, -7, 11, 0.26);
  ctx.strokeStyle = INK; ctx.lineWidth = LW + 0.4; ctx.lineJoin = 'round';
  ctx.stroke();

  /* fragmentos de código flotando: lo único que tiene color */
  ctx.save();
  ctx.globalAlpha = 0.85;
  for (let i = 0; i < 3; i++) {
    const t = (e.t * 0.04 + i * 2.1);
    const gx = Math.cos(t) * 13, gy = -8 + Math.sin(t * 1.3) * 7;
    if (((e.t / 7 | 0) + i) % 4 === 0) continue;     // parpadean
    label(ctx, GLYPHS[(i + (e.t / 23 | 0)) % GLYPHS.length], gx, gy, 6, code, 'center', '0', 0, BODY);
  }
  ctx.restore();

  /* la cara: dos ojos de tarta bien juntos, y ceño cuando está por saltar */
  const look = e.dir;
  eye(ctx, -3.6 + look, -9.5, 2.6, look, hostile, e.telegraph > 0 || e.leap > 0);
  eye(ctx, 3.8 + look, -9.8, 2.8, look, hostile, e.telegraph > 0 || e.leap > 0);
  if (e.telegraph > 0 || e.leap > 0) brows(ctx, 0.2 + look, -12.6, 2.4, 1.5);

  /* patitas: dos ganchos cortos, sólo apoyado */
  if (e.leap === 0) {
    for (const side of [-1, 1]) {
      hose(ctx, side * 5, -1.5, side * 7, -0.5, side * 8.5, 0.5, 2.2, mix(body, '#000000', 0.3), LWD);
    }
  }
  ctx.restore();
}

/**
 * Camuflado. Tres señales, todas chiquitas y todas honestas:
 * una silueta que apenas se adivina, un píxel que parpadea y una banda de
 * interferencia que corta lo que tiene detrás. La intensidad sube con la
 * cercanía, así que mirar de cerca siempre alcanza — y el Escáner lo revela
 * de lejos, que es para lo que está.
 */
function rootkitGhost(ctx, e) {
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
  const d = Math.hypot(P.x + P.w / 2 - cx, P.y + P.h / 2 - cy);
  const k = clamp(1 - d / 300, 0, 1);
  const a = 0.06 + k * 0.20;

  ctx.save();
  ctx.translate(cx, e.y + e.h);

  /* la silueta, apenas más oscura que el fondo */
  ctx.globalAlpha = a;
  ctx.beginPath();
  ctx.moveTo(-10, 0);
  ctx.quadraticCurveTo(-11, -13, 0, -14.5);
  ctx.quadraticCurveTo(11, -13, 10, 0);
  ctx.closePath();
  ctx.fillStyle = '#0b0714';
  ctx.fill();

  /* banda de interferencia: se corre por el cuerpo cada tanto */
  const band = (e.shimmer * 1.7) % 90;
  if (band < 16) {
    ctx.globalAlpha = a + 0.14;
    ctx.fillStyle = '#b98cff';
    ctx.fillRect(-11, -14 + band * 0.9, 22, 1.4);
  }

  /* el píxel que parpadea: la señal que se puede cazar mirando */
  if ((e.shimmer >> 3) % 9 === 0) {
    ctx.globalAlpha = 0.5 + k * 0.5;
    ctx.fillStyle = '#c9a0ff';
    ctx.fillRect(-1.2 + Math.sin(e.shimmer * 0.11) * 5, -9, 2.4, 2.4);
  }
  ctx.restore();
}

/** El halo del proceso infiltrado. Lo dibuja el anfitrión, no el Rootkit. */
export function infectedAura(ctx, e) {
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
  const pulse = 0.4 + Math.sin(G.tick * 0.14) * 0.25;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, cx, cy, e.w * 0.9, '#b98cff', pulse * 0.5);
  ctx.restore();
  /* dos glifos orbitando: el mismo código que suelta el Rootkit suelto */
  ctx.save();
  ctx.globalAlpha = 0.75;
  for (let i = 0; i < 2; i++) {
    const t = G.tick * 0.05 + i * Math.PI;
    label(ctx, i ? '1' : '0', cx + Math.cos(t) * (e.w * 0.6), cy + Math.sin(t) * (e.h * 0.45),
      6, '#c9a0ff', 'center', '0', 0, BODY);
  }
  ctx.restore();
}

/* ── Spyware ──────────────────────────────────────────────────────────────
   Una camarita con patas de insecto. Todo el dibujo está al servicio de una
   sola pregunta que el jugador tiene que poder contestar de un vistazo: ¿me
   está viendo? Por eso el lente es lo más grande y lo único rojo. */

export function spywareCam(ctx, e, th, hostile, flash) {
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
  const body = flash ? '#ffffff' : '#4a5260';
  const mirando = e.beam && !P.dead;

  /* el haz: del lente a Bit. Es información, no adorno — mientras esté, tu
     posición la sabe todo el sector. */
  if (mirando) {
    const px = P.x + P.w / 2, py = P.y + P.h / 2;
    const alarma = e.watch > 180;
    ctx.save();
    ctx.globalAlpha = 0.28 + Math.sin(G.tick * 0.3) * 0.08 + (alarma ? 0.2 : 0);
    ctx.strokeStyle = alarma ? '#ff2f4f' : '#ff6a6a';
    ctx.lineWidth = alarma ? 2.2 : 1.2;
    ctx.setLineDash([5, 4]);
    ctx.lineDashOffset = -G.tick * 1.6;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(px, py);
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(cx + boil(e.x, 0.3), cy + boil(e.x + 5, 0.3));
  ctx.scale(e.dir, 1);

  /* patas de insecto, tres por lado, colgando y cabeceando */
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const sw = Math.sin(e.float * 1.6 + i * 1.2 + (side > 0 ? 0.6 : 0)) * 1.6;
      hose(ctx, side * 4, 3, side * (7 + i), 7 + sw, side * (6 + i * 1.6), 11 + sw, 1.5, '#2a3038', LWD);
    }
  }

  /* cuerpo: cajita de cámara con la tapa superior más clara */
  pill(ctx, -8, -7, 16, 12, 2.4);
  ctx.fillStyle = body;
  ctx.fill();
  shadeHalf(ctx, 0, -1, 8, 0.22);
  ctx.strokeStyle = INK; ctx.lineWidth = LW; ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.fillStyle = rgba('#ffffff', 0.14);
  ctx.fillRect(-7, -6.4, 14, 2.2);

  /* antenita: se para cuando está leyendo */
  ctx.beginPath();
  ctx.moveTo(-3, -7);
  ctx.lineTo(-4.5, mirando ? -13 : -10.5);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
  ctx.stroke();
  disc(ctx, -4.5, mirando ? -13 : -10.5, 1.4, mirando ? '#ff4f5f' : '#8b939c', 0.9);

  /* el lente: cañón corto y el ojo rojo adentro. Late cuando lee. */
  pill(ctx, 7, -4.4, 6, 8.8, 1.6);
  inked(ctx, '#39404a', LWD);
  const lente = mirando ? (G.tick % 10 < 5 ? '#ff2f4f' : '#ff7a86') : '#7a3a44';
  if (mirando) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, 13, 0, 14, '#ff3d5a', 0.45);
    ctx.restore();
  }
  disc(ctx, 12.6, 0, 3.4, lente, LW);
  disc(ctx, 12.6, 0, 1.4, '#2b0d12', 0);
  shine(ctx, 11.4, -1.6, 1, 0.7, -0.5, 0.9);

  /* la barra de lo que lleva leído: sólo aparece cuando ya es un problema */
  if (e.watch > 60) {
    const k = clamp(e.watch / 300, 0, 1);
    ctx.save();
    ctx.scale(e.dir, 1);           // que no se escriba al revés si mira a la izquierda
    pill(ctx, -8, -12.5, 16, 3, 1.5);
    inked(ctx, '#2a3038', 1);
    ctx.fillStyle = k > 0.8 ? '#ff2f4f' : '#ffb04f';
    ctx.fillRect(-7.2, -11.8, 14.4 * k, 1.6);
    ctx.restore();
  }
  ctx.restore();
}

/* ── Adware ───────────────────────────────────────────────────────────────
   Una pila de ventanitas con cara. Es el único del reparto que se dibuja con
   colores de saldo: rosa chillón, amarillo de oferta y verde de botón. Esa
   fealdad es a propósito — el resto del juego está virado al sepia. */

export function adwareBlob(ctx, e, th, hostile, flash) {
  const x = e.x + e.w / 2, feet = e.y + e.h;
  const body = flash ? '#ffffff' : '#ff4f9a';
  const alt = flash ? '#ffffff' : '#ffd23d';

  ctx.save();
  ctx.translate(x + boil(e.x, 0.35), feet + boil(e.x + 6, 0.35));

  /* tres banners apilados, cada uno girado un poco: la pila de anuncios */
  const banners = [
    [-13, -9, 26, 9, body],
    [-11, -16, 22, 7.5, alt],
    [-8, -22, 16, 6.5, flash ? '#ffffff' : '#4fd2ff'],
  ];
  for (let i = banners.length - 1; i >= 0; i--) {
    const [bx, by, bw, bh, col] = banners[i];
    ctx.save();
    ctx.translate(bx + bw / 2, by + bh / 2);
    ctx.rotate(Math.sin(e.float + i) * 0.06);
    pill(ctx, -bw / 2, -bh / 2, bw, bh, 1.8);
    ctx.fillStyle = col;
    ctx.fill();
    shadeHalf(ctx, 0, 0, bw / 2, 0.16);
    ctx.strokeStyle = INK; ctx.lineWidth = LW; ctx.lineJoin = 'round';
    ctx.stroke();
    /* renglones de texto falso, que titilan */
    ctx.fillStyle = rgba(INK, 0.45);
    for (let r = 0; r < 2; r++) {
      const ww = (bw - 8) * (0.4 + noise2(i * 3 + r, (e.t / 14) | 0) * 0.5);
      ctx.fillRect(-bw / 2 + 3, -bh / 2 + 2.2 + r * 2.6, ww, 1.1);
    }
    ctx.restore();
  }

  /* la cara, en el banner de abajo: sonrisa de vendedor */
  const alerta = e.telegraph > 0;
  eye(ctx, -4.4, -5.6, 2.6, 1, hostile, alerta);
  eye(ctx, 4.2, -5.8, 2.8, 1, hostile, alerta);
  ctx.beginPath();
  ctx.arc(0, -2.6, 4.2, 0.15, Math.PI - 0.15);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
  ctx.stroke();

  /* la cruz de cerrar que nunca cierra nada, arriba a la derecha */
  ctx.save();
  ctx.translate(9.5, -22.5);
  disc(ctx, 0, 0, 2.6, alerta ? hostile : '#f6e7c4', 1.2);
  ctx.beginPath();
  ctx.moveTo(-1.1, -1.1); ctx.lineTo(1.1, 1.1);
  ctx.moveTo(1.1, -1.1); ctx.lineTo(-1.1, 1.1);
  ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();
  ctx.restore();
}

/* ── La ventana emergente ────────────────────────────────────────────────
   Tapa, estorba y hay que leerla rápido. Todo el diseño es una sola pregunta:
   ¿esta cuál es? La trampa es rosa, tiene ceño y dice cosas urgentes; el
   premio es verde, está tranquilo y muestra lo que da. */

export function popupPanel(ctx, e, th, hostile, flash) {
  const premio = e.kind === 'premio';
  const barra = flash ? '#ffffff' : (premio ? '#3aa85c' : '#e0384f');
  const papel = flash ? '#ffffff' : '#f6edd6';

  ctx.save();
  ctx.translate(e.x + boil(e.x, 0.25), e.y + boil(e.x + 4, 0.25));

  /* sombra dura: la ventana está POR ENCIMA de todo, y tiene que verse */
  ctx.fillStyle = 'rgba(20,14,10,.3)';
  pill(ctx, 2.5, 3.5, e.w, e.h, 2);
  ctx.fill();

  pill(ctx, 0, 0, e.w, e.h, 2);
  inked(ctx, papel, LW + 0.4);

  /* barra de título con su cruz */
  ctx.save();
  pill(ctx, 0, 0, e.w, e.h, 2);
  ctx.clip();
  ctx.fillStyle = barra;
  ctx.fillRect(0, 0, e.w, 7.5);
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(e.w - 6, 2.4); ctx.lineTo(e.w - 2.4, 5.6);
  ctx.moveTo(e.w - 2.4, 2.4); ctx.lineTo(e.w - 6, 5.6);
  ctx.strokeStyle = '#f6edd6'; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, 7.5); ctx.lineTo(e.w, 7.5);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.2;
  ctx.stroke();

  if (premio) {
    /* un regalo dibujado: lo que promete, lo cumple */
    ctx.fillStyle = '#3aa85c';
    ctx.fillRect(e.w / 2 - 6, e.h - 13, 12, 8);
    ctx.fillStyle = '#e0614c';
    ctx.fillRect(e.w / 2 - 1.2, e.h - 13, 2.4, 8);
    ctx.fillRect(e.w / 2 - 6, e.h - 10.4, 12, 2.2);
    ctx.strokeStyle = INK; ctx.lineWidth = 1;
    ctx.strokeRect(e.w / 2 - 6, e.h - 13, 12, 8);
  } else {
    /* renglones urgentes y un botón que late */
    ctx.fillStyle = rgba(INK, 0.5);
    for (let r = 0; r < 2; r++) {
      ctx.fillRect(3, 11 + r * 3.4, (e.w - 10) * (r ? 0.55 : 0.85), 1.4);
    }
    const late = G.tick % 20 < 10;
    pill(ctx, e.w / 2 - 7, e.h - 9.5, 14, 6, 1.4);
    inked(ctx, late ? '#ffd23d' : '#e0a93d', 1);
  }

  /* ojos: en este juego, si algo no tiene ojos no pertenece al reparto */
  const alerta = !premio;
  eye(ctx, 8, 15, 2.4, 1, hostile, alerta && G.tick % 40 < 20);
  eye(ctx, 15.5, 15, 2.4, 1, hostile, alerta && G.tick % 40 < 20);
  if (alerta) brows(ctx, 11.7, 12.4, 2.2, 1.4);

  /* la del premio se despide con una manito rosa cuando le queda poco */
  if (e.life < 90 && e.life % 20 < 10) {
    ctx.globalAlpha = 0.8;
    disc(ctx, e.w - 4, e.h - 4, 1.8, PINK, 1);
  }
  ctx.restore();
}
