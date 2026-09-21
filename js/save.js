/* Lo que el juego se acuerda entre una sesión y la siguiente. Tres cosas, y
   nada más: qué sectores terminaste, cuántos fragmentos de clave sacaste de
   cada uno, y qué herramientas compraste con ellos.

   Todo lo que toca `localStorage` va envuelto en try/catch, y no por prolijidad:
   en una ventana privada, con las cookies de sitio bloqueadas, con la cuota
   llena o abriendo el index.html con doble clic desde el disco, tanto leer como
   escribir TIRAN. Un juego que no arranca porque no pudo leer un permiso sería
   bastante peor que uno que no se acuerda de nada, así que cuando falla se
   juega desde el principio y listo.

   Los fragmentos se guardan por sector y no como un total suelto. Eso es lo que
   impide la granja: rejugar un sector del que ya sacaste todo no da nada, y
   rejugar uno donde dejaste fragmentos sólo paga la diferencia. Un total suelto
   convertiría el primer sector en una máquina de monedas. */

const CLAVE = 'bit-patrol:progreso';
const VERSION = 2;

const vacio = total => ({
  cleared: new Array(total).fill(false),
  claves: new Array(total).fill(0),
  tools: [],
});

/** Lee el progreso guardado. Nunca tira: si no se puede leer, no hay progreso. */
export function loadProgress(total) {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (!crudo) return vacio(total);
    const dato = JSON.parse(crudo);
    if (!dato || dato.v !== VERSION) return vacio(total);
    /* Se recorta y se rellena contra el total de HOY: un guardado viejo puede
       tener menos sectores de los que hay ahora, o más si alguno se sacó. */
    const base = vacio(total);
    if (Array.isArray(dato.cleared)) base.cleared = base.cleared.map((_, i) => dato.cleared[i] === true);
    if (Array.isArray(dato.claves)) {
      base.claves = base.claves.map((_, i) => {
        const n = Number(dato.claves[i]);
        return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
      });
    }
    if (Array.isArray(dato.tools)) base.tools = dato.tools.filter(t => typeof t === 'string');
    return base;
  } catch {
    return vacio(total);
  }
}

function guardar(save) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify({ v: VERSION, ...save }));
  } catch { /* sin dónde guardar: el progreso vale para esta sesión y nada más */ }
  return save;
}

/** Deja constancia de que un sector quedó saneado. */
export function markCleared(save, i) {
  if (i < 0 || i >= save.cleared.length || save.cleared[i]) return save;
  save.cleared[i] = true;
  return guardar(save);
}

/**
 * Anota los fragmentos sacados de un sector. Se queda con el mejor intento, no
 * con el último: volver a entrar y salir con menos no te saca lo que ya tenías,
 * y volver a entrar y juntar más paga sólo la diferencia.
 *
 * Devuelve cuántos fragmentos NUEVOS entraron a la billetera, que es lo que el
 * cartel de fin de sector tiene para mostrar.
 */
export function recordClaves(save, i, n) {
  if (i < 0 || i >= save.claves.length) return 0;
  const antes = save.claves[i];
  if (n <= antes) return 0;
  save.claves[i] = n;
  guardar(save);
  return n - antes;
}

/** Lo que hay en la billetera: todo lo juntado menos todo lo gastado. */
export function wallet(save, precios) {
  const juntado = save.claves.reduce((s, n) => s + n, 0);
  const gastado = save.tools.reduce((s, t) => s + (precios[t] ?? 0), 0);
  return juntado - gastado;
}

/** Compra una herramienta si alcanza y si no la tenías. Devuelve si se compró. */
export function buyTool(save, tool, precios) {
  if (save.tools.includes(tool)) return false;
  if (wallet(save, precios) < (precios[tool] ?? Infinity)) return false;
  save.tools.push(tool);
  guardar(save);
  return true;
}

/** Borra el progreso. Nunca tira. */
export function resetProgress(total) {
  try { localStorage.removeItem(CLAVE); } catch { /* ídem */ }
  return vacio(total);
}

/**
 * Un sector está abierto si es el primero o si el anterior ya se saneó.
 * La regla vive acá, en una línea, y no repartida por la interfaz: si mañana se
 * quiere abrir todo de una para probar, se cambia este `return` y nada más.
 */
export function isUnlocked(save, i) {
  return i === 0 || save.cleared[i - 1] === true;
}

/** El sector más hondo al que se puede entrar: por donde conviene seguir. */
export function furthestUnlocked(save) {
  let n = 0;
  while (n + 1 < save.cleared.length && save.cleared[n]) n++;
  return n;
}
