/* Lo único que el juego se acuerda entre una sesión y la siguiente: hasta dónde
   llegaste. No guarda partidas, ni tiempos, ni claves — guarda permiso.

   Todo lo que toca `localStorage` va envuelto en try/catch, y no por prolijidad:
   en una ventana privada, con las cookies de sitio bloqueadas, con la cuota
   llena o abriendo el index.html con doble clic desde el disco, tanto leer como
   escribir TIRAN. Un juego que no arranca porque no pudo leer un permiso sería
   bastante peor que uno que no se acuerda de nada, así que cuando falla se
   juega desde el principio y listo.

   Lo que se guarda es un booleano por sector —si lo terminaste— y no un solo
   número con el máximo alcanzado. Cuesta lo mismo y permite dos cosas que el
   número no: marcar los sectores ya saneados en el selector, y que agregar un
   sector en el medio no invalide el progreso de nadie. */

const CLAVE = 'bit-patrol:progreso';
const VERSION = 1;

/** Lee el progreso guardado. Nunca tira: si no se puede leer, no hay progreso. */
export function loadProgress(total) {
  const vacio = () => new Array(total).fill(false);
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (!crudo) return vacio();
    const dato = JSON.parse(crudo);
    if (!dato || dato.v !== VERSION || !Array.isArray(dato.cleared)) return vacio();
    /* Se recorta y se rellena contra el total de HOY: un guardado viejo puede
       tener menos sectores de los que hay ahora, o más si alguno se sacó. */
    return vacio().map((_, i) => dato.cleared[i] === true);
  } catch {
    return vacio();
  }
}

/** Deja constancia de que un sector quedó saneado. Nunca tira. */
export function markCleared(cleared, i) {
  if (i < 0 || i >= cleared.length || cleared[i]) return cleared;
  cleared[i] = true;
  try {
    localStorage.setItem(CLAVE, JSON.stringify({ v: VERSION, cleared }));
  } catch { /* sin dónde guardar: el progreso vale para esta sesión y nada más */ }
  return cleared;
}

/** Borra el progreso. Nunca tira. */
export function resetProgress(total) {
  try { localStorage.removeItem(CLAVE); } catch { /* ídem */ }
  return new Array(total).fill(false);
}

/**
 * Un sector está abierto si es el primero o si el anterior ya se saneó.
 * La regla vive acá, en una línea, y no repartida por la interfaz: si mañana se
 * quiere abrir todo de una para probar, se cambia este `return` y nada más.
 */
export function isUnlocked(cleared, i) {
  return i === 0 || cleared[i - 1] === true;
}

/** El sector más hondo al que se puede entrar: por donde conviene seguir. */
export function furthestUnlocked(cleared) {
  let n = 0;
  while (n + 1 < cleared.length && cleared[n]) n++;
  return n;
}
