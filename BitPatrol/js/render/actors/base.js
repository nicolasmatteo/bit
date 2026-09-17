/* El vocabulario del reparto: las proporciones del canon, la paleta fija de Bit
   y las piezas de cara que comparte todo el mundo.

   Vive aparte porque lo usan todos los módulos de `actors/`, y porque son las
   constantes que mueven a todo el elenco de una sola vez: tocar HEAD_R corre la
   silueta de Bit, y tocar LW cambia el peso de la línea de todo el juego.

   El ojo está acá por la misma razón: que Bit y los procesos hostiles compartan
   una única forma de ojo es la mitad de lo que hace que parezcan salidos del
   mismo estudio. Si algo tiene cara, la saca de este archivo. */

import { INK, shine } from '../ink.js';

/* ────────────────────────────────────────────────────────────────────────────
   PROPORCIONES

   Nada de anatomía. El canon del dibujo animado de los treinta es otro:

     · la cabeza ocupa la mitad de la figura, el cuerpo es un apéndice
     · los miembros son mangueras de grosor constante, sin codo ni rodilla
     · las manos son manoplas blancas y flotan separadas del brazo
     · los pies son bulbos enormes
     · los ojos son dos tartas blancas con una pupila gigante

   Bit mide 26 unidades de caja, pero el dibujo llega a ~32: la cabeza y el
   sombrero se salen por arriba, igual que en cualquier personaje del género.
   ──────────────────────────────────────────────────────────────────────────── */

export const HIP_Y    = -9.5;    // la cadera está muy abajo: las piernas son cortas
export const FOOT_Y   = -5.5;    // tobillo en reposo; el zapato cuelga hasta el suelo
export const TORSO_TOP = -14.5;
export const HEAD_Y   = -21.5;   // centro de la cabeza
export const HEAD_R   = 7.4;

/* Paleta fija de Bit: se lee igual en los seis sectores. Es "blue team" a
   propósito — mientras el entorno cambia de sector en sector, Bit se queda en
   sus azules y aceros; ese es el chiste visual del uniforme. */
export const SHELL   = '#e4ecf6';   // la carcasa del bit: cromo frío, no piel
export const SHIRT   = '#eef4fa';
export const TROUSER = '#222a3a';
export const BOOT    = '#1a212c';
export const GLOVE   = '#f5f9fd';
export const FELT    = '#1c3556';   // el fieltro del sombrero: azul marino
export const STEEL   = '#6d747c';
export const STEEL_D = '#3c434b';
export const PINK    = '#ff6ec7';   // el rosa del parry: no se usa para nada más
export const CYAN    = '#6ce8ff';   // encriptación
export const IDENT   = '#4fd2ff';   // el azul de identidad: chapa y cinta del sombrero,
                              // fijo en todos los temas — la marca del equipo azul

/* La pluma tiene dos pesos: gordo para la silueta exterior, fino para lo de
   adentro. Esa diferencia es la mitad de lo que hace que algo parezca dibujado
   y no vectorizado. */
export const LW = 2.2;
export const LWD = 1.1;

/**
 * Ojo de tarta: la esclerótica blanca con un mordisco arriba (el párpado) y una
 * pupila grande y ovalada. Es la pieza que más dice "1936" de todo el dibujo.
 */
export function pieEye(ctx, x, y, r, look, pupil = INK) {
  ctx.save();
  ctx.translate(x, y);
  /* blanco con el párpado comido arriba */
  ctx.beginPath();
  ctx.arc(0, 0, r, -Math.PI * 0.78, Math.PI * 1.06);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.lineJoin = 'round';
  ctx.stroke();
  /* pupila, corrida hacia donde mira */
  ctx.fillStyle = pupil;
  ctx.beginPath();
  ctx.ellipse(look * r * 0.3, r * 0.14, r * 0.5, r * 0.62, 0, 0, 6.283);
  ctx.fill();
  shine(ctx, look * r * 0.12, -r * 0.34, r * 0.16, r * 0.2, 0, 0.95);
  ctx.restore();
}

/**
 * Ojo hostil. Es el mismo ojo de tarta de Bit — que todo el reparto comparta
 * una sola forma de ojo es la mitad de lo que hace que parezcan salidos del
 * mismo estudio. Lo único que cambia es que la pupila se enciende al telegrafiar.
 */
export function eye(ctx, x, y, r, look, hostile, alert) {
  pieEye(ctx, x, y, r, look, alert ? hostile : INK);
}

/** Cejas: dos trazos en ángulo. Con esto solo, cualquier cosa se ve furiosa. */
export function brows(ctx, x, y, r, angry = 1) {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = r * 0.42;
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + side * r * 2.1, y - r * 0.5);
    ctx.lineTo(x + side * r * 0.6, y - r * 0.5 + side * -angry * r * 0.55);
    ctx.stroke();
  }
  ctx.restore();
}

/** El poste del punto de restauración. Lo comparten el real y el impostor. */
export function postPath(ctx, cx, base, top) {
  ctx.beginPath();
  ctx.moveTo(cx - 4.4, base);
  ctx.lineTo(cx - 2.6, top + 4);
  ctx.lineTo(cx + 2.6, top + 4);
  ctx.lineTo(cx + 4.4, base);
  ctx.closePath();
}
