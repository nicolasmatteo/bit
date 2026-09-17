/* Lo que usan varias familias de enemigos: la cola de disparos diferidos y la
   puntería al vuelo. Son tres funciones, pero son las que sostienen el contrato
   del rosado —sale aparte, PINK_GAP cuadros después— así que viven donde todos
   las pueden ver y nadie las puede cambiar por su cuenta. */

import { P } from '../state.js';

/* ─────────────────────────────── disparos diferidos

   El rosado nunca sale junto con balas normales: se encola y sale aparte,
   PINK_GAP cuadros después. Apunta recién al salir, no al encolarse — así
   sigue la línea que el jugador tiene delante y no una posición vieja.
   Si el enemigo muere o sale de cuadro antes, el disparo simplemente no sale. */

export function queueShot(e, delay, fire) {
  (e.queue || (e.queue = [])).push({ t: delay, fire });
}

export function runQueue(e) {
  if (!e.queue || !e.queue.length) return;
  for (const q of e.queue) if (--q.t === 0) q.fire();
  e.queue = e.queue.filter(q => q.t > 0);
}

/** Ángulo de un punto hacia el centro de Bit, calculado en el momento. */
export function aimAt(x, y) {
  return Math.atan2(P.y + P.h / 2 - y, P.x + P.w / 2 - x);
}

