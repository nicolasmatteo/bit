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
   Un proyector de cine que flota.

   Es el enemigo que no dispara: mira, enrolla lo que ve y después PROYECTA un
   proceso nuevo en el piso. El dibujo entero está hecho para contar eso sin una
   palabra, y para que cada pieza sea una lectura y no un adorno:

     el lente     ¿me está viendo? Es lo más grande y lo único rojo. El iris se
                  cierra a medida que enfoca: cuanto más chico, menos falta.
     las bobinas  cuánto lleva leído. Una se vacía y la otra se llena — el
                  medidor no es una barra pegada encima, es la película misma.
     el cono      dónde va a caer lo que viene, medio segundo antes de que
                  aparezca. Es todo el contrajuego: se ve y se puede no estar ahí.

   El proyector no es un capricho de tema: este juego ya está virado a celuloide
   —el papel de la casa se llama "crema de celuloide", morir es el fundido de un
   corto— así que la cosa que trae procesos a la pantalla es, literalmente, la
   que los proyecta. */

export function spywareCam(ctx, e, th, hostile, flash) {
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
  const laton = flash ? '#ffffff' : '#7a6a4e';
  const oscuro = flash ? '#ffffff' : '#39332a';
  const mirando = e.beam && !P.dead;
  const k = clamp(e.watch / 300, 0, 1);       // cuánto lleva enrollado
  const proyectando = e.cast > 0 && e.castAt;

  /* ── el cono de luz: de la lente al sitio elegido ──
     Va antes que el cuerpo y en coordenadas del mundo. Titila como un proyector
     de verdad —la lámpara nunca está quieta— y adentro, al fondo, crece el
     recuadro de lo que viene: su tamaño real, para que se entienda si lo que
     llega es un bicho o una mole. */
  if (proyectando) {
    const s = e.castAt;
    const t = 1 - e.cast / 52;                 // 0 recién abierto, 1 a punto
    const bx = s.x + s.w / 2, by = s.y - s.h / 2;
    const flicker = 0.76 + Math.sin(G.tick * 0.9) * 0.1 + Math.sin(G.tick * 2.3) * 0.06;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = (0.13 + t * 0.2) * flicker;
    /* el haz: un trapecio que se abre desde la lente hasta el ancho del que viene */
    const ancho = Math.max(s.w, 16) / 2 + 4;
    ctx.beginPath();
    ctx.moveTo(cx - 3, cy);
    ctx.lineTo(cx + 3, cy);
    ctx.lineTo(bx + ancho, s.y);
    ctx.lineTo(bx - ancho, s.y);
    ctx.closePath();
    ctx.fillStyle = '#ffd28a';
    ctx.fill();
    ctx.restore();

    /* el charco de luz en el piso */
    ctx.save();
    ctx.globalAlpha = 0.3 + t * 0.4;
    ctx.beginPath();
    ctx.ellipse(bx, s.y, ancho, ancho * 0.26, 0, 0, 6.283);
    ctx.strokeStyle = '#ffd28a';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();

    /* el recuadro de lo que viene, con esquinas de fotograma */
    ctx.save();
    ctx.globalAlpha = 0.35 + t * 0.55;
    ctx.strokeStyle = t > 0.75 ? hostile : '#ffd28a';
    ctx.lineWidth = 1.4;
    const hw = s.w / 2 * (0.5 + t * 0.5), hh = s.h / 2 * (0.5 + t * 0.5);
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      ctx.beginPath();
      ctx.moveTo(bx + sx * hw, by + sy * hh - sy * hh * 0.45);
      ctx.lineTo(bx + sx * hw, by + sy * hh);
      ctx.lineTo(bx + sx * hw - sx * hw * 0.45, by + sy * hh);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ── el haz de lectura: de la lente a Bit ──
     Es información, no adorno: mientras esté, tu posición la sabe todo el sector. */
  if (mirando) {
    const px = P.x + P.w / 2, py = P.y + P.h / 2;
    const casi = k > 0.6;
    ctx.save();
    ctx.globalAlpha = 0.28 + Math.sin(G.tick * 0.3) * 0.08 + (casi ? 0.2 : 0);
    ctx.strokeStyle = casi ? '#ff2f4f' : '#ff6a6a';
    ctx.lineWidth = casi ? 2.2 : 1.2;
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

  /* ── las dos bobinas: la de arriba se vacía, la de abajo se llena ──
     Giran sólo mientras lee, y al proyectar se van a fondo. */
  const giro = e.float * (proyectando ? 5 : mirando ? 2.2 : 0.35);
  for (const [i, [rx, ry]] of [[-5, -11], [4.5, -10]].entries()) {
    const lleno = i === 0 ? 1 - k : k;         // radio de la película enrollada
    const r = 2.6 + lleno * 3.2;
    ctx.save();
    ctx.translate(rx, ry);
    /* la película enrollada: un disco que crece o mengua */
    disc(ctx, 0, 0, r, flash ? '#ffffff' : '#241f18', 0);
    /* el plato de la bobina, con sus tres brazos girando */
    ctx.rotate(giro + i * 1.1);
    ctx.beginPath();
    for (let a = 0; a < 3; a++) {
      const ang = (a / 3) * Math.PI * 2;
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(ang) * 5.4, Math.sin(ang) * 5.4);
    }
    ctx.strokeStyle = INK; ctx.lineWidth = 1.3; ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
    disc(ctx, rx, ry, 5.6, null, 0);           // aro exterior
    ctx.beginPath();
    ctx.arc(rx, ry, 5.6, 0, 6.283);
    ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
    ctx.stroke();
    disc(ctx, rx, ry, 1.1, laton, 0.9);
  }

  /* la tira de película entre las dos bobinas, con sus perforaciones */
  ctx.beginPath();
  ctx.moveTo(-5, -5.6);
  ctx.quadraticCurveTo(0, -3.4, 4.5, -4.6);
  ctx.strokeStyle = INK; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
  ctx.stroke();
  ctx.strokeStyle = flash ? '#ffffff' : '#241f18'; ctx.lineWidth = 1.4;
  ctx.stroke();

  /* ── el cuerpo: la cabeza del proyector ── */
  pill(ctx, -8, -5, 15, 11, 2.2);
  ctx.fillStyle = laton;
  ctx.fill();
  shadeHalf(ctx, 0, 0, 8, 0.24);
  ctx.strokeStyle = INK; ctx.lineWidth = LW; ctx.lineJoin = 'round';
  ctx.stroke();
  /* rejilla de ventilación: la lámpara calienta */
  ctx.strokeStyle = rgba(INK, 0.4); ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath(); ctx.moveTo(-6, -2.4 + i * 2.4); ctx.lineTo(-2.4, -2.4 + i * 2.4); ctx.stroke();
  }

  /* la manivela de atrás, que gira con las bobinas */
  ctx.save();
  ctx.translate(-9.5, 0);
  ctx.rotate(giro);
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(0, -3.4); ctx.lineTo(2, -3.4);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();

  /* ── la lente: el ojo. Lo más grande y lo único rojo ── */
  pill(ctx, 6, -4.6, 7, 9.2, 1.8);
  inked(ctx, oscuro, LWD);
  if (mirando || proyectando) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, 13.5, 0, 15, proyectando ? '#ffd28a' : '#ff3d5a', 0.45);
    ctx.restore();
  }
  const vidrio = proyectando ? '#ffd28a'
               : mirando ? (G.tick % 10 < 5 ? '#ff2f4f' : '#ff7a86') : '#7a3a44';
  disc(ctx, 13, 0, 3.8, vidrio, LW);
  /* el iris: se cierra sobre la pupila a medida que enfoca. Chico = ya casi */
  const iris = 2.6 - k * 1.7;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + k * 0.5;
    const px2 = 13 + Math.cos(a) * iris, py2 = Math.sin(a) * iris;
    if (i === 0) ctx.moveTo(px2, py2); else ctx.lineTo(px2, py2);
  }
  ctx.closePath();
  ctx.fillStyle = '#2b0d12';
  ctx.fill();
  ctx.strokeStyle = rgba(INK, 0.6); ctx.lineWidth = 0.9;
  ctx.stroke();
  shine(ctx, 11.6, -1.8, 1.1, 0.8, -0.5, 0.9);

  /* dos cables colgando: lo único que le queda de bicho, y lo que dice que
     esto cuelga de algún lado y no se apoya en ninguno */
  for (const side of [-1, 1]) {
    const sw = Math.sin(e.float * 1.4 + (side > 0 ? 0.8 : 0)) * 1.8;
    hose(ctx, side * 4, 5, side * 5, 9 + sw, side * (3 + side * 1.5), 13 + sw, 1.4, '#2a3038', LWD);
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
