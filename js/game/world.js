/* Carga del mapa, rejilla de colisión y plataformas móviles.
   La colisión es por tiles (barrido en ejes separados), no por lista de rectángulos. */

import { TS, CHECKPOINT_W, CHECKPOINT_H } from '../config.js';
import { G } from './state.js';
import { THEMES } from '../data/themes.js';
import { spawnEnemy, linkBots } from './enemies.js';
import { rnd, clamp } from '../util.js';

export const SOLID = 1;

/* ─────────────────────────────── carga */

export function buildLevel(level) {
  const rows = level.map;
  const cols = Math.max(...rows.map(r => r.length));

  G.level = level;
  G.theme = THEMES[level.theme];
  G.cols = cols;
  G.rows = rows.length;
  G.mapW = cols * TS;
  G.mapH = rows.length * TS;
  G.grid = new Uint8Array(cols * rows.length);

  G.oneways = []; G.spikes = []; G.hazards = []; G.movers = []; G.locks = [];
  G.enemies = []; G.crates = []; G.pickups = []; G.checkpoints = [];
  G.goal = null;
  G.gravMul = 1;
  G.stats = { shards: 0, shardsTotal: 0, kills: 0, deaths: 0, frames: 0 };

  const at = (r, c) => (rows[r] && rows[r][c]) || ' ';

  /* --- paso 1: rejilla sólida --- */
  for (let r = 0; r < G.rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (at(r, c) === '#') G.grid[r * cols + c] = SOLID;
    }
  }

  /* --- paso 2: tiradas horizontales (plataformas, líquido, púas, rieles) --- */
  for (let r = 0; r < G.rows; r++) {
    let c = 0;
    while (c < cols) {
      const ch = at(r, c);
      if (ch === '=' || ch === '~' || ch === '^' || ch === '-') {
        let end = c;
        while (end + 1 < cols && at(r, end + 1) === ch) end++;
        const x = c * TS, y = r * TS, w = (end - c + 1) * TS;

        if (ch === '=') G.oneways.push({ x, y, w, h: 6 });
        /* el líquido entra con la caja del tile entera; el hundido de la
           superficie se aplica después, una sola vez por charco */
        if (ch === '~') G.hazards.push({ x, y, w, h: TS });
        if (ch === '^') G.spikes.push({ x, y: y + TS - 9, w, h: 9 });
        if (ch === '-') addMover(x, y, w, 'h');

        c = end + 1;
      } else c++;
    }
  }

  G.hazards = poolHazards(G.hazards);

  /* --- paso 3: tiradas verticales (rieles) --- */
  for (let c = 0; c < cols; c++) {
    let r = 0;
    while (r < G.rows) {
      if (at(r, c) === '|') {
        let end = r;
        while (end + 1 < G.rows && at(end + 1, c) === '|') end++;
        addMover(c * TS, r * TS, (end - r + 1) * TS, 'v');
        r = end + 1;
      } else r++;
    }
  }

  /* --- paso 4: entidades (los pies apoyan en la base del tile marcado) --- */
  for (let r = 0; r < G.rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ch = at(r, c);
      const x = c * TS, y = r * TS, foot = y + TS;
      switch (ch) {
        case 'P':
          G.spawn = { x: x + (TS - 13) / 2, y: foot - 26 };
          break;
        case '!':
          /* `on`: acá reaparecés (uno solo a la vez).
             `healed`: este poste ya repuso los corazones (uno por poste). */
          G.checkpoints.push({
            x: x + TS / 2 - CHECKPOINT_W / 2, y: foot - CHECKPOINT_H,
            w: CHECKPOINT_W, h: CHECKPOINT_H, on: false, healed: false, t: rnd(0, 6),
          });
          break;
        case 'G':
          G.goal = { x: x + TS / 2 - 11, y: foot - 46, w: 22, h: 46 };
          break;
        case 'c':
          G.crates.push({ x: x + 1, y: foot - 18, w: 18, h: 18, hp: 4, hit: 0, dead: false });
          break;
        case 'm':
          G.pickups.push(mkPickup('vida', x, foot));
          break;
        case 'w':
          G.pickups.push(mkPickup('arma', x, foot));
          break;
        /* Depósito con la herramienta fijada: carga el Escáner, y sólo si ya
           lo compraste. Un depósito nunca entrega una herramienta. */
        case 'E': {
          const dep = mkPickup('arma', x, foot);
          dep.weapon = 'escaner';
          G.pickups.push(dep);
          break;
        }
        case '*':
          G.pickups.push(mkPickup('fragmento', x, y + TS / 2 + 7));
          G.stats.shardsTotal++;
          break;
        case 's': G.enemies.push(spawnEnemy('spambot',    x, foot)); break;
        case 'h': G.enemies.push(spawnEnemy('troyano',    x, foot)); break;
        /* `d` sortea el disfraz; v/x/r lo eligen a mano */
        case 'd': G.enemies.push(spawnEnemy('phishing',   x, foot)); break;
        case 'v': G.enemies.push(spawnEnemy('phishing',   x, foot, 'corazon')); break;
        case 'x': G.enemies.push(spawnEnemy('phishing',   x, foot, 'caja')); break;
        case 'r': G.enemies.push(spawnEnemy('phishing',   x, foot, 'guardado')); break;
        case 't': G.enemies.push(spawnEnemy('ransomware', x, foot)); break;
        case 'k': G.enemies.push(spawnEnemy('keylogger',  x, foot)); break;
        case 'K': {
          // variante de techo: cuelga del tile sólido que tiene encima
          const kl = spawnEnemy('keylogger', x, foot);
          kl.surface = -1;
          kl.y = y;
          G.enemies.push(kl);
          break;
        }
        case 'g': G.enemies.push(spawnEnemy('gusano',     x, foot)); break;
        case 'n': G.enemies.push(spawnEnemy('botnet',     x, foot)); break;
        case 'i': G.enemies.push(spawnEnemy('mitm',       x, foot)); break;
        case 'e': G.enemies.push(spawnEnemy('exfil',      x, foot)); break;
        case 'R': G.enemies.push(spawnEnemy('rootkit',    x, foot)); break;
        case 'y': G.enemies.push(spawnEnemy('spyware',    x, foot)); break;
        case 'a': G.enemies.push(spawnEnemy('adware',     x, foot)); break;
        case 'B': G.enemies.push(spawnEnemy('monarca',    x, foot)); break;
        case 'I': G.enemies.push(spawnEnemy('implante',   x, foot)); break;
        case 'D': G.enemies.push(spawnEnemy('baron',      x, foot)); break;
      }
    }
  }

  /* --- paso 5: cables de las botnets ---
     Va después de la pasada de entidades porque cada C2 necesita ver a los
     spambots ya puestos para engancharlos, y no puede esperar a su primer
     cuadro de IA: sus bots son invulnerables mientras él viva, y eso tiene que
     valer desde antes de que el servidor entre en cuadro. */
  for (const e of G.enemies) if (e.type === 'botnet') linkBots(e);

  /* --- paso 6: el padrón del sector ---
     Qué tipos plantó el mapa. Se toma acá, con la lista recién hecha y todavía
     sin nada nacido en juego. */
  G.roster = [...new Set(G.enemies.map(e => e.type))];

  if (!G.goal) console.warn('[bit-patrol] el nivel no tiene salida (G)');
}

/**
 * Junta las tiradas de líquido en charcos.
 *
 * La pasada de arriba busca tiradas horizontales, una por fila, así que un
 * charco de cuatro filas salía partido en cuatro rectángulos apilados. Eso no
 * se notaba en la colisión —el área es la misma— pero sí en el dibujo: cada
 * rectángulo se pintaba como un charco independiente, con su gradiente y, sobre
 * todo, con su propia superficie ondulada y su línea de tinta. Cuatro líneas de
 * tinta atravesando el líquido es exactamente lo que lo hacía ver como franjas
 * apiladas en vez de como un cuerpo. En todo el juego eran 184 superficies
 * dibujadas donde correspondían 46.
 *
 * Se pegan las que comparten columna y ancho, que en estos mapas son todas.
 * Dos beneficios de yapa: la colisión mira cuatro veces menos cajas, y
 * desaparece el hueco de 3px que quedaba entre fila y fila —el hundido de la
 * superficie se aplicaba a cada tirada, así que adentro del charco había
 * rendijas sin líquido.
 */
function poolHazards(runs) {
  runs.sort((a, b) => a.x - b.x || a.w - b.w || a.y - b.y);
  const pools = [];
  for (const z of runs) {
    const prev = pools[pools.length - 1];
    if (prev && prev.x === z.x && prev.w === z.w && prev.y + prev.h === z.y) prev.h += z.h;
    else pools.push(z);
  }
  /* El hundido de la superficie, ahora una sola vez y sólo arriba: el líquido
     no mata en los primeros 3px, que es el margen que hace que rozar el borde
     de un salto no sea muerte instantánea. */
  for (const p of pools) { p.y += 3; p.h -= 3; }
  return pools;
}

function mkPickup(kind, x, foot) {
  const size = kind === 'fragmento' ? [11, 11] : kind === 'vida' ? [15, 13] : [17, 15];
  return {
    kind, w: size[0], h: size[1],
    x: x + (TS - size[0]) / 2,
    y: foot - size[1] - (kind === 'fragmento' ? 0 : 1),
    t: rnd(0, 6.28), taken: false,
  };
}

function addMover(x, y, len, axis) {
  const span = Math.max(2, Math.min(3, Math.floor(len / TS) - 1));
  const w = axis === 'h' ? span * TS : 3 * TS;
  const h = 7;
  const mover = {
    axis, w, h,
    x: axis === 'h' ? x : x + TS / 2 - w / 2,
    y: axis === 'h' ? y + TS - h : y,
    a: axis === 'h' ? x : y,
    b: axis === 'h' ? x + len - w : y + len - h,
    dir: 1, speed: axis === 'h' ? 0.62 : 0.52,
    dx: 0, dy: 0, wait: 0,
  };
  G.movers.push(mover);
}

export function updateMovers() {
  for (const m of G.movers) {
    if (m.wait > 0) { m.wait--; m.dx = 0; m.dy = 0; continue; }
    const prev = m.axis === 'h' ? m.x : m.y;
    let v = (m.axis === 'h' ? m.x : m.y) + m.dir * m.speed;
    if (v <= m.a) { v = m.a; m.dir = 1; m.wait = 26; }
    if (v >= m.b) { v = m.b; m.dir = -1; m.wait = 26; }
    if (m.axis === 'h') { m.x = v; m.dx = v - prev; m.dy = 0; }
    else { m.y = v; m.dy = v - prev; m.dx = 0; }
  }
}

/* ─────────────────────────────── zonas cifradas

   Un ransomware activo le saca solidez a un tramo del mapa: el puente se sigue
   viendo, pero como fantasma, y se atraviesa. Todo el juego pregunta por
   `solidAt`, que es el único lugar que decide si un tile frena o no — por eso
   alcanza con interceptar acá en vez de andar tocando la rejilla, que además
   habría que acordarse de restaurar. La rejilla nunca se modifica. */

/**
 * ¿Este punto del mundo cae dentro de una zona cifrada? Una zona que todavía
 * se está armando (`arm > 0`) se ve pero sigue sosteniendo: es el aviso. Sin
 * ese margen, si el ransomware cifraba con el jugador parado encima del
 * puente, el piso desaparecía sin nada que hacer.
 */
export function encrypted(x, y) {
  for (let i = 0; i < G.locks.length; i++) {
    const L = G.locks[i];
    if (L.arm > 0) continue;
    if (x >= L.x && x < L.x + L.w && y >= L.y && y < L.y + L.h) return true;
  }
  return false;
}

/** Cifra un tramo. El dueño es el enemigo que lo sostiene. */
export function addLock(owner, x, y, w, h, life, arm = 0) {
  const L = { x, y, w, h, life, max: life, arm, armMax: arm, owner };
  G.locks.push(L);
  owner.lock = L;
  return L;
}

/** Descifra lo que sostenía este enemigo. Sirve para caducidad y para su muerte. */
export function dropLock(owner) {
  if (!owner.lock) return null;
  const L = owner.lock;
  const i = G.locks.indexOf(L);
  if (i >= 0) G.locks.splice(i, 1);
  owner.lock = null;
  return L;
}

/** La Purga rompe todo cifrado en pie: es la clave de recuperación del jugador. */
export function breakAllLocks() {
  const broken = G.locks.slice();
  for (const L of broken) if (L.owner) L.owner.lock = null;
  G.locks.length = 0;
  return broken;
}

/* ─────────────────────────────── consultas */

export function solidAt(col, row) {
  if (col < 0 || col >= G.cols) return true;         // los bordes del mapa son muro
  if (row < 0 || row >= G.rows) return false;
  if (G.grid[row * G.cols + col] !== SOLID) return false;
  if (G.locks.length === 0) return true;
  return !encrypted(col * TS + TS / 2, row * TS + TS / 2);
}

export function solidAtPoint(x, y) {
  return solidAt(Math.floor(x / TS), Math.floor(y / TS));
}

/**
 * ¿Hay línea limpia entre dos puntos? Muestrea la recta cada medio tile: alcanza
 * para lo que la usa —saber si un enemigo te tiene a la vista— y no paga el
 * precio de un trazado exacto. Las losas no cuentan: se ve a través de ellas.
 *
 * Existe para que esconderse detrás de algo sea una respuesta de verdad y no una
 * casualidad. Usado por la IA.
 */
export function lineClear(x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const pasos = Math.ceil(Math.hypot(dx, dy) / (TS / 2));
  for (let i = 1; i < pasos; i++) {
    const t = i / pasos;
    if (solidAtPoint(x1 + dx * t, y1 + dy * t)) return false;
  }
  return true;
}

/** ¿Hay suelo (sólido o losa) justo debajo de este punto? Usado por la IA. */
export function groundAhead(x, y) {
  if (solidAtPoint(x, y)) return true;
  for (const o of G.oneways) {
    if (x >= o.x && x <= o.x + o.w && y >= o.y - 2 && y <= o.y + 10 &&
        !encrypted(x, o.y + 2)) return true;
  }
  return false;
}

/** ¿Este punto cae dentro de líquido (`~`) o de púas (`^`)? */
export function hazardAtPoint(x, y) {
  for (const z of G.hazards)
    if (x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h) return true;
  for (const s of G.spikes)
    if (x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.h) return true;
  return false;
}

/**
 * ¿Debajo de este punto hay dónde pararse sin quemarse? Baja de a medio tile
 * y contesta que no si antes de encontrar piso aparece líquido o púas, o si en
 * todo el barrido no aparece piso ninguno — o sea, si eso es un pozo.
 *
 * `groundAhead` sólo mira el escalón siguiente, que es lo que necesita un
 * caminante. Esto mira la caída entera, que es lo que necesita algo que flota.
 */
export function safeGroundBelow(x, y, depth = 9 * TS) {
  for (let d = 0; d <= depth; d += TS / 2) {
    const yy = y + d;
    if (yy >= G.mapH) return false;
    if (hazardAtPoint(x, yy)) return false;
    if (groundAhead(x, yy)) return true;
  }
  return false;
}

/* ─────────────────────────────── piso firme

   Ningún proceso hostil se ahoga ni se pincha: el líquido y las púas sólo
   lastiman a Bit. Lo que le pasa a un enemigo que se mete ahí es otra cosa, y
   es peor: sigue el pozo para abajo, se va del mapa y queda cayendo para
   siempre — vivo, invisible y fuera de alcance. Un gusano así se lleva para
   siempre un lugar del cupo; un exfiltrador así se lleva tus fragmentos sin que
   puedas alcanzarlo nunca.

   La regla, entonces: ningún caminante da el paso que lo dejaría sin piso.
   Es la misma que ya tenía la arena de los jefes (ver bossKeepArena), sacada de
   ahí y puesta donde puede usarla cualquiera: allá nació porque la puerta no
   abre mientras el jefe viva, pero el problema nunca fue de los jefes. */

/** ¿Los dos costados de esta caja tienen piso sano debajo, parada en `x`? */
export function hasFooting(e, x = e.x, inset = 0) {
  /* El margen se mide hacia adentro de cada costado, y se achica con el bicho:
     con un margen fijo, algo más angosto que el doble del margen mediría dos
     veces el mismo punto y algo más ancho que un tile no tendría "piso" nunca
     parado sobre una columna de un tile. */
  const m = inset || clamp(e.w * 0.25, 2, 6);
  const y = e.y + e.h - 2;
  return safeGroundBelow(x + m, y) && safeGroundBelow(x + e.w - m, y);
}

/**
 * Recorta un paso horizontal para que nunca deje al que lo da sobre el vacío.
 * Devuelve 0 si ese paso no se puede dar, así quien llama puede además decidir
 * algo —darse vuelta, cortar la embestida— en vez de sólo quedarse quieto.
 *
 * En el aire no recorta nada: lo que ya está volando sigue su arco, y frenarlo
 * en seco a mitad de un salto sobre un pozo sería justamente tirarlo adentro.
 * Quien salta tiene que mirar ANTES de saltar, con `canLand`.
 */
export function safeStepX(e, dx, inset = 0) {
  if (dx === 0 || !e.onGround) return dx;
  return hasFooting(e, e.x + dx, inset) ? dx : 0;
}

/** ¿Hay dónde caer si salto `reach` píxeles hacia `dir`? Se mira antes de saltar. */
export function canLand(e, dir, reach) {
  return hasFooting(e, e.x + dir * reach);
}

/**
 * ¿Se fue del mundo? Es la última red: lo que ya está cayendo fuera del mapa no
 * vuelve, no se puede pelear y no se puede ver. Lo usa updateEnemies para
 * apagarlo en vez de dejarlo cayendo para siempre.
 */
export function outOfWorld(e) {
  return e.y > G.mapH + 40;
}

/* ─────────────────────────────── movimiento */

const EPS = 0.001;

/**
 * Mueve una entidad resolviendo colisión contra tiles.
 * opts.oneway  → aterriza sobre losas y plataformas móviles
 * opts.drop    → ignora las losas este frame (caer a través)
 */
export function moveActor(e, dx, dy, opts = {}) {
  e.hitWall = false;
  e.bumpedHead = false;

  /* eje X */
  if (dx !== 0) {
    e.x += dx;
    const dir = dx > 0 ? 1 : -1;
    const col = dir > 0 ? Math.floor((e.x + e.w - EPS) / TS) : Math.floor(e.x / TS);
    const r0 = Math.floor((e.y + 1) / TS), r1 = Math.floor((e.y + e.h - EPS) / TS);
    for (let r = r0; r <= r1; r++) {
      if (solidAt(col, r)) {
        e.x = dir > 0 ? col * TS - e.w : (col + 1) * TS;
        e.vx = 0; e.hitWall = true;
        break;
      }
    }
  }

  /* eje Y */
  const prevBottom = e.y + e.h;
  e.onGround = false;
  e.platform = null;
  if (dy !== 0) {
    e.y += dy;
    const dir = dy > 0 ? 1 : -1;
    const row = dir > 0 ? Math.floor((e.y + e.h - EPS) / TS) : Math.floor(e.y / TS);
    const c0 = Math.floor((e.x + 1) / TS), c1 = Math.floor((e.x + e.w - EPS) / TS);
    for (let c = c0; c <= c1; c++) {
      if (solidAt(c, row)) {
        if (dir > 0) { e.y = row * TS - e.h; e.onGround = true; }
        else { e.y = (row + 1) * TS; e.bumpedHead = true; }
        e.vy = 0;
        break;
      }
    }
  }

  /* Losas y plataformas móviles: sólo desde arriba, y sólo si el pie no cae
     dentro de un cifrado. Se mira el punto de apoyo y no la losa entera: un
     puente largo cifrado por la mitad tiene que seguir sosteniendo en las
     puntas, que es justamente lo que lo vuelve un problema de posición. */
  if (opts.oneway && dy > 0 && !opts.drop) {
    const foot = e.x + e.w / 2;
    for (const o of G.oneways) {
      if (landsOn(e, o, prevBottom) && !encrypted(foot, o.y + 2)) {
        e.y = o.y - e.h; e.vy = 0; e.onGround = true;
      }
    }
    for (const m of G.movers) {
      if (landsOn(e, m, prevBottom + Math.max(0, m.dy)) && !encrypted(foot, m.y + 2)) {
        e.y = m.y - e.h; e.vy = 0; e.onGround = true; e.platform = m;
      }
    }
  }
  return e;
}

function landsOn(e, o, prevBottom) {
  return e.x + e.w > o.x + 1 && e.x < o.x + o.w - 1 &&
         e.y + e.h > o.y && e.y + e.h < o.y + o.h + 8 &&
         prevBottom <= o.y + 2.5;
}

/** Rectángulo contra la rejilla (proyectiles). */
export function rectHitsSolid(x, y, w, h) {
  const c0 = Math.floor(x / TS), c1 = Math.floor((x + w - EPS) / TS);
  const r0 = Math.floor(y / TS), r1 = Math.floor((y + h - EPS) / TS);
  for (let r = r0; r <= r1; r++)
    for (let c = c0; c <= c1; c++)
      if (solidAt(c, r)) return true;
  return false;
}
