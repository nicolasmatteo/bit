/* La cinta: lo que Bit hizo, en orden.

   No es un historial de partida ni una estadística. Es la cinta que el
   Keylogger lee por encima del hombro, y por eso guarda EVENTOS y no cuadros:
   "arrancó a la derecha", "saltó", "disparó". Un registro por cuadro no sería
   un patrón, sería una película, y de una película no se predice nada.

   Vive en su propio archivo y no depende de nadie —ni siquiera del estado del
   juego— porque son dos cosas que no tienen por qué conocerse: el que escribe
   (player.js, en cinco lugares) y el que lee (el Keylogger). Si mañana algo más
   quiere leer lo que hace el jugador, lee de acá y no le toca una línea a Bit.

   Las acciones son caracteres sueltos a propósito: así un par de acciones
   seguidas es una cadena de dos letras, y la tabla de pares del Keylogger es un
   objeto común con claves de texto en vez de una estructura con nombre. */

/* izquierda, derecha, salto, ataque, dash. Nada más: el resto de lo que Bit
   sabe hacer —parry, purga, cambiar de arma— no es movimiento, es respuesta, y
   anotarlo sólo ensuciaría el patrón. */
export const ACT = { IZQ: '<', DER: '>', SALTO: '^', TIRO: '*', DASH: '~' };

const CINTA_MAX = 24;   // lo que guarda la cinta entera; cada lector recorta lo suyo
const REPEAT = 20;      // cuadros de carrera sostenida que valen una marca más

/**
 * `seq` es un contador que nunca vuelve atrás: cada lector se acuerda de hasta
 * dónde leyó y pide lo que vino después. `gen` cambia cuando la cinta se borra
 * (muerte o nivel nuevo) y es la señal de "lo que aprendiste ya no vale".
 */
export const Cinta = { list: [], seq: 0, gen: 0 };

let moveDir = 0, moveT = 0;

export function logAction(kind) {
  Cinta.list.push({ kind, seq: ++Cinta.seq });
  if (Cinta.list.length > CINTA_MAX) Cinta.list.shift();
}

/**
 * El movimiento se anota distinto que el resto: correr no es un evento, es un
 * estado. Se marca al cambiar de dirección —ahí hay una decisión— y después
 * cada REPEAT cuadros mientras se sostenga, que es lo que convierte una corrida
 * en "> > >" y le da al patrón algo con qué contar los pasos.
 *
 * Se llama todos los cuadros con la dirección pedida; la cadencia la lleva acá
 * adentro para que player.js no tenga que acordarse de nada.
 */
export function logMove(dir) {
  if (dir === 0) { moveDir = 0; moveT = 0; return; }
  if (dir !== moveDir) {
    moveDir = dir; moveT = 0;
    logAction(dir > 0 ? ACT.DER : ACT.IZQ);
    return;
  }
  if (++moveT >= REPEAT) { moveT = 0; logAction(dir > 0 ? ACT.DER : ACT.IZQ); }
}

/**
 * Lo que pasó después de `cursor`, a lo sumo `max` de una vez, con su `seq` para
 * que el lector avance exactamente hasta donde leyó.
 *
 * El tope importa: un lector que estuvo fuera de cuadro vuelve con la cinta
 * entera esperándolo, y sin tope se comería veinte acciones en un cuadro —
 * veinte clics de máquina juntos y un aprendizaje que sale de la nada.
 */
export function actionsSince(cursor, max = 2) {
  if (cursor >= Cinta.seq) return null;
  const out = [];
  for (const a of Cinta.list) {
    if (a.seq <= cursor) continue;
    out.push(a);
    if (out.length >= max) break;
  }
  return out.length ? out : null;
}

/**
 * Se borra al morir y al empezar un nivel. `seq` NO vuelve a cero: los lectores
 * guardan cursores y reaparecer no vuelve a cargar el nivel, así que un contador
 * que se reinicia dejaría a los Keyloggers de la pantalla esperando un número
 * que ya pasó. Lo que avisa que hay que olvidar es `gen`.
 */
export function clearActions() {
  Cinta.list.length = 0;
  Cinta.gen++;
  moveDir = 0; moveT = 0;
}
