/* ─────────────────────────────── Keylogger
   Una máquina de escribir agarrada de una superficie —suelo o techo— que no
   pelea contra Bit: pelea contra la costumbre de Bit.

   Lo que hace tiene tres tiempos, y son los mismos tres de cualquier enemigo
   del juego (mira, avisa, tira), sólo que acá el "mira" dura de verdad:

     REGISTRA   te ve, frena la ronda y anota lo que hacés. No cuadros: acciones
                —arrancó a la derecha, saltó, disparó—, leídas de la cinta que
                escribe player.js (ver actions.js). Cada tecla que anota es un
                golpe visible sobre el rodillo y un clic de máquina.

     APRENDE    con cada acción nueva hace dos cosas, en este orden: primero se
                pregunta qué habría predicho con lo que sabía hasta recién, y se
                puntúa solo; después anota el par. Por eso el porcentaje no es
                un temporizador disfrazado: es literalmente cuánto viene
                acertando. Repetirse lo sube; cambiar lo baja, y baja más rápido
                de lo que sube.

     PREDICE    cuando cree que sabe lo suficiente elige la acción que espera,
                la convierte en un PUNTO del mapa —donde piensa que vas a estar—
                y lo marca a la vista durante KEYLOG.lock cuadros antes de
                tirar. Después transmite el renglón entero a ese punto fijo.

   Y acá está todo el asunto: dispara a un lugar, no a vos. Si hacés lo de
   siempre, el renglón te encuentra. Si rompés el patrón —girás, no saltás,
   dejás de disparar, te ponés detrás de una pared— el renglón llega a donde ya
   no estás, la máquina se glitchea y pierde confianza. El contrajuego no es
   esquivar el disparo: es no ser predecible, y el marcador en el piso es el que
   lo hace entendible sin una sola línea de texto.

   La Purga es su contra dura: le borra la cinta entera (ver player.js).

   Los estados usan los nombres del resto del bestiario —cadenas en `e.state`—
   y mapean uno a uno con el ciclo clásico:
     patrulla(IDLE) · registro(DETECT+RECORD+LEARN) · prediccion(PREDICT+LOCK)
     · ataque(ATTACK) · enfriado(COOLDOWN) */

import { G, P } from '../state.js';
import { moveActor, rectHitsSolid, lineClear, safeStepX, canLand } from '../world.js';
import { PINK_GAP, KEYLOG, PHYS, DASH } from '../../config.js';
import { spawnEBullet } from '../projectiles.js';
import * as FX from '../fx.js';
import { Sfx } from '../../audio.js';
import { rnd, rndi, clamp } from '../../util.js';
import { spawnEnemy } from './spawn.js';
import { queueShot } from './shared.js';
import { ACT, Cinta, actionsSince } from '../actions.js';

const KEY_CHARS = 'QWERTYUIOPASDFGHJKLZXCVBNM';   // lo que "leyó" del teclado
const BURST_GAP = 7;   // cuadros entre teclas de la misma ráfaga
const ECO_MAX = 2;       // ecos vivos a la vez en toda la pantalla
const ECO_SALTO = 60;    // lo que cubre su salto, para no reproducirlo sobre un pozo

export function keylogger(e, dx, dy, dist) {
  const s = e.surface;                       // 1 = suelo, -1 = techo
  e.seg += e.speed * 0.42;
  if (e.strike > 0) e.strike--;
  if (e.ring > 0) e.ring--;
  if (e.fail > 0) e.fail--;
  if (e.ghostCd > 0) e.ghostCd--;

  /* La cuenta hasta el juicio corre acá arriba y no dentro de un estado: el tiro
     apuntado sale en 'ataque' y llega, muchas veces, todavía en 'ataque'. Atada a
     'enfriado' —donde estaba— no empezaba a contar hasta después del rosado. */
  if (e.judgeT > 0 && --e.judgeT === 0) judge(e);

  /* la cinta se borró (moriste, o empezó otro nivel): lo aprendido no vale */
  if (e.gen !== Cinta.gen) wipe(e);

  const sees = dist < KEYLOG.detect && Math.abs(dy) < 170;
  if (sees) e.aggro = 120; else if (e.aggro > 0) e.aggro--;

  /* ── el cuerpo: ronda, se despega si le sacan el piso ───────────────── */
  const busy = e.state === 'prediccion' || e.state === 'ataque' || e.burst > 0;
  if (!busy) {
    /* mientras registra camina a media máquina: sigue siendo una ronda, pero se
       nota que está mirando y no yendo a ningún lado */
    const slow = e.state === 'registro' ? 0.45 : 1;

    /* Mira antes de pisar, y el paso directamente no se da — no alcanza con
       darse vuelta. Mientras registra se acomoda para mirarte todos los cuadros
       (`e.dir = dx > 0 ...` más abajo), así que el giro del borde se le pisaba
       al cuadro siguiente: con Bit del otro lado de un pozo, esta máquina se
       caminaba al vacío mirándolo a los ojos.
       Es el único que no puede usar el `safeStepX` de la casa: se agarra de una
       superficie que puede ser el techo, y ahí "piso firme" está arriba. */
    const aheadX = e.dir > 0 ? e.x + e.w + 3 : e.x - 3;
    const probeY = s > 0 ? e.y + e.h + 4 : e.y - 4;
    const agarre = rectHitsSolid(aheadX - 1, probeY - 1, 2, 2);
    moveActor(e, agarre ? e.dir * e.speed * slow : 0, 0, { oneway: false });
    if (e.hitWall || !agarre) e.dir *= -1;
  }

  const under = rectHitsSolid(e.x + 2, s > 0 ? e.y + e.h + 1 : e.y - 3, e.w - 4, 2);
  if (!under) {
    e.vy = Math.min(e.vy + 0.55 * s, 11);
    moveActor(e, 0, e.vy, { oneway: false });
    if (e.onGround) e.vy = 0;
  } else e.vy = 0;

  /* ── la ráfaga en curso manda sobre todo lo demás ───────────────────── */
  if (e.burst > 0) { runBurst(e); return; }

  switch (e.state) {

    /* ── IDLE: la ronda de siempre, sin cinta y sin panel ── */
    case 'patrulla':
      if (sees) {
        e.state = 'registro';
        e.cursor = Cinta.seq;      // entra en rango: empieza a leer desde acá
        e.idleT = 0;
        /* y se toma su tiempo antes de la primera predicción, aunque venga de
           otro encuentro con la tabla llena: entrar en rango no es tener a
           alguien apuntado. A la mitad de lo que era (60-110), como el resto de
           sus tiempos — pero no a cero: sin esta pausa, cruzar el borde de su
           rango sería comerse un renglón antes de verlo. */
        e.cd = rndi(30, 55);
        Sfx.telegraph();
      }
      return;

    /* ── DETECT + RECORD + LEARN ── */
    case 'registro': {
      if (!sees) { e.state = 'patrulla'; e.idleT = 0; return; }
      e.dir = dx > 0 ? 1 : -1;                      // no deja de mirarte
      record(e);
      maybeGhost(e);

      /* Se anima cuando cree que sabe… o cuando lleva demasiado mirando sin
         sacar nada en limpio. Ese segundo caso es importante: contra alguien que
         no repite nunca, un Keylogger que sólo dispara con la barra llena no
         dispara jamás y deja de ser un enemigo. Así tira igual, pero con el
         error máximo: sigue siendo un tiro perdido, y se nota que lo es. */
      const harto = ++e.watch > KEYLOG.blind;
      if ((e.learn >= KEYLOG.ready || harto) && --e.cd <= 0 && canSee(e)) beginLock(e);
      return;
    }

    /* ── PREDICT: el punto ya está elegido y marcado; es la ventana de reacción ── */
    case 'prediccion':
      e.dir = dx > 0 ? 1 : -1;
      record(e);                                    // sigue anotando mientras apunta
      if (--e.lockT <= 0) {
        e.state = 'ataque';
        e.burst = KEYLOG.shots - 1;
        e.burstCd = 0;
        e.typeT = 0;
        e.ring = 18;
        Sfx.bell();
      }
      return;

    /* ── ATTACK: la ráfaga la corre runBurst y el rosado sale de la cola
       PINK_GAP cuadros después. Acá sólo se espera ese último tiro, con tope: la
       cola no corre fuera de cuadro, y sin el tope un Keylogger al que se le
       pierde el disparo encolado se queda apuntando para siempre. ── */
    case 'ataque':
      if (++e.typeT > 120) { e.state = 'enfriado'; e.cd = rndi(KEYLOG.cdMin, KEYLOG.cdMax); }
      return;

    /* ── COOLDOWN ── */
    case 'enfriado':
      record(e);
      if (--e.cd <= 0) {
        e.state = sees ? 'registro' : 'patrulla';
        e.cd = rndi(40, 80);
      }
      return;
  }
}

/* ═══════════════════════════════ el aprendizaje ═══════════════════════════ */

/**
 * Lee de la cinta lo que pasó desde su último cursor y lo procesa acción por
 * acción. Es todo el "aprendizaje": una tabla de pares y un puntaje. Nada de
 * esto es aleatorio, así que dos partidas iguales dan el mismo Keylogger.
 */
function record(e) {
  const nuevas = actionsSince(e.cursor);
  if (!nuevas) {
    /* Nada nuevo. Quedarse quieto, dejar de disparar o moverse de forma que no
       genere eventos es una forma legítima de romperle la confianza, así que el
       olvido es parte del contrajuego y no un detalle de implementación. */
    if (++e.idleT > KEYLOG.forget) e.learn = Math.max(0, e.learn - KEYLOG.decay);
    return;
  }
  e.idleT = 0;

  for (const entrada of nuevas) {
    const a = entrada.kind;
    e.cursor = entrada.seq;             // avanza acción por acción, no de un salto
    const prev = e.log[e.log.length - 1];

    /* 1. se puntúa ANTES de anotar el par nuevo: la pregunta es qué habría
          predicho con lo que sabía hasta recién, no con la respuesta ya puesta */
    if (prev !== undefined) {
      const guess = nextAfter(e, prev);
      if (guess !== null) {
        e.learn = clamp(e.learn + (guess === a ? KEYLOG.hit : -KEYLOG.miss), 0, 100);
        if (guess !== a) e.fail = Math.max(e.fail, 10);   // glitch chico: se equivocó
      }
      e.pairs[prev + a] = (e.pairs[prev + a] || 0) + 1;
    }

    /* 2. y recién ahí entra al renglón visible */
    e.log.push(a);
    if (e.log.length > KEYLOG.hist) e.log.shift();
    e.strike = 8;
    Sfx.keystroke();
    FX.spark(e.x + e.w / 2 + e.dir * 9, e.y + e.h / 2 + e.surface * 2,
             '#c9a0ff', 2, 1.2, [4, 9]);
  }
}

/** Lo más frecuente que vio venir después de `a`. null si nunca vio nada. */
function nextAfter(e, a) {
  let best = null, bestN = 0;
  for (const k in e.pairs) {
    if (k[0] !== a) continue;
    if (e.pairs[k] > bestN) { bestN = e.pairs[k]; best = k[1]; }
  }
  return best;
}

/** Olvido total: la cinta se borró o lo purgaron. */
export function wipe(e) {
  e.pairs = {};
  e.log.length = 0;
  e.learn = 0;
  e.idleT = 0;
  e.cursor = Cinta.seq;
  e.gen = Cinta.gen;
  if (e.state === 'prediccion') { e.state = 'enfriado'; e.cd = 60; e.lockT = 0; }
}

/**
 * La Purga es la "clear cache" del juego: borra de un saque lo que todos los
 * Keyloggers de la pantalla creían saber. Vive acá y no en player.js porque el
 * que sabe qué hay que borrar es el que lo escribió.
 */
export function purgeKeyloggers() {
  let n = 0;
  for (const e of G.enemies) {
    if (e.dead || e.type !== 'keylogger' || e.learn === 0) continue;
    wipe(e);
    e.fail = 22;
    FX.ring(e.x + e.w / 2, e.y + e.h / 2, 30, '#6ce8ff', { life: 20, width: 2, alpha: 0.9 });
    n++;
  }
  return n;
}

/* ═══════════════════════════════ la predicción ════════════════════════════ */

/** ¿Hay línea limpia hasta Bit? Una pared basta para que no pueda fijar nada. */
function canSee(e) {
  return lineClear(e.x + e.w / 2, e.y + e.h / 2, P.x + P.w / 2, P.y + P.h / 2);
}

/**
 * Dónde estaría Bit dentro de `lead` cuadros si hiciera `guess`. Es una
 * apuesta, no una solución: ninguno de estos casos sabe lo que Bit va a decidir
 * a mitad de camino, y ahí está la parte engañable.
 */
function project(guess, lead) {
  const px = P.x + P.w / 2, py = P.y + P.h / 2;
  switch (guess) {
    case ACT.SALTO: {
      /* La parábola del salto, con la física de verdad: sube jumpV y la gravedad
         lo frena. Apunta al arco, no al vértice exacto (de ahí el 0.8): el
         vértice se ocupa tres cuadros y el aviso dura treinta, así que afinarlo
         más no lo haría más certero, lo haría más raro. */
      const t = Math.min(lead, PHYS.jumpV / PHYS.gravity);
      return { x: px + P.vx * lead * 0.7,
               y: py - (PHYS.jumpV * t - 0.5 * PHYS.gravity * t * t) * 0.8 };
    }
    case ACT.DER:
    case ACT.IZQ: {
      const d = guess === ACT.DER ? 1 : -1;
      return { x: px + d * PHYS.runSpeed * lead * 0.8,
               y: py + (P.onGround ? 0 : P.vy * lead * 0.4) };
    }
    case ACT.DASH:
      return { x: px + P.face * DASH.speed * DASH.frames * 0.7, y: py };
    default:
      /* disparar es quedarse quieto: le apunta a donde ya está */
      return { x: px + P.vx * lead * 0.3, y: py };
  }
}

/**
 * Elige la acción que espera y resuelve el punto al que va a tirar.
 *
 * Tiene una vuelta que no es obvia: el punto depende de cuánto tarda el renglón
 * en llegar, y cuánto tarda depende de dónde esté el punto. Calcularlo una sola
 * vez con la distancia a donde Bit está AHORA es lo que hace un enemigo que
 * "predice bien y llega tarde" — contra alguien que se aleja corriendo, el
 * paquete le gana apenas un píxel por cuadro y aterriza cuando ya pasó todo. Se
 * resuelve como cualquier intercepción: dos pasadas de punto fijo, que para esta
 * geometría convergen de sobra.
 *
 * Y tiene un techo. Sin `horizon`, contra alguien que corre en línea recta la
 * solución se va a dos segundos y medio de distancia: la mira aparecería a media
 * pantalla de Bit, ilegible, y apostando a algo que nadie puede sostener tanto
 * tiempo. Con el techo, a quien se le escapa corriendo simplemente le erra — que
 * es lo correcto: lo ganaste corriendo.
 */
function beginLock(e) {
  const guess = nextAfter(e, e.log[e.log.length - 1]) || predominant(e);
  const px = P.x + P.w / 2, py = P.y + P.h / 2;
  const mx = e.x + e.w / 2 + e.dir * 9, my = e.y + e.h / 2 + e.surface * 2;

  let lead = KEYLOG.lock + Math.hypot(px - mx, py - my) / KEYLOG.speed;
  let pt = project(guess, lead);
  for (let i = 0; i < 4; i++) {
    lead = clamp(KEYLOG.lock + Math.hypot(pt.x - mx, pt.y - my) / KEYLOG.speed,
                 KEYLOG.lock, KEYLOG.horizon);
    pt = project(guess, lead);
  }

  /* el error que le queda aunque haya acertado la intención */
  const err = KEYLOG.spread * (1 - e.learn / 100);
  const tx = pt.x + rnd(-err, err);
  const ty = pt.y + rnd(-err, err) * 0.6;

  e.aim = { x: tx, y: ty };
  /* el adelanto que resolvió: a cuántos cuadros vista está apostando. Queda
     guardado porque es la intención de la jugada, y sin él no hay forma de
     comprobar desde afuera si el renglón llega cuando dijo que iba a llegar. */
  e.lead = lead;
  e.guess = guess;
  e.state = 'prediccion';
  e.watch = 0;
  e.lockT = KEYLOG.lock;
  e.judgeT = 0;
  Sfx.lockon();
  FX.ring(tx, ty, 26, G.theme.hostile, { life: 16, width: 1.6, alpha: 0.55 });
}

/** Si nunca vio un par, se conforma con la manía más repetida del renglón. */
function predominant(e) {
  const n = {};
  let best = ACT.TIRO, bestN = 0;
  for (const a of e.log) {
    n[a] = (n[a] || 0) + 1;
    if (n[a] > bestN) { bestN = n[a]; best = a; }
  }
  return best;
}

/* ═══════════════════════════════ el ataque ════════════════════════════════ */

function runBurst(e) {
  if (--e.burstCd > 0) return;
  e.burstCd = BURST_GAP;
  e.burst--;
  const primero = e.judgeT === 0;
  fireKey(e, false);

  /* El juicio se ata al PRIMER tiro, que es el que salió resuelto para llegar
     en el instante predicho. Antes colgaba del rosado, que sale PINK_GAP después
     y llega más de un segundo tarde: la máquina se preguntaba "¿estaba ahí?"
     cuando el momento ya había pasado y se contestaba que no casi siempre,
     aunque hubiera adivinado bien. */
  if (primero) e.judgeT = Math.max(1, Math.round(Math.hypot(e.aim.x - (e.x + e.w / 2), e.aim.y - (e.y + e.h / 2)) / KEYLOG.speed));

  if (e.burst === 0) queueShot(e, PINK_GAP, () => {
    /* el rosado sale aparte, como en todo el bestiario: es el que se puede
       parar, y contra el que predice, pararlo es la respuesta más justa. Llega
       después a propósito — es un segundo tiempo, no parte de la ráfaga. */
    fireKey(e, true);
    e.state = 'enfriado';
    e.cd = rndi(KEYLOG.cdMin, KEYLOG.cdMax);
  });
}

/**
 * Una tecla del renglón, al PUNTO PREDICHO. No a Bit: ésta es la línea donde
 * vive todo el enemigo. Si el punto estaba mal, la bala se va a donde no hay
 * nadie y se ve perfectamente por qué.
 */
function fireKey(e, corrupt) {
  const s = e.surface;
  const x = e.x + e.w / 2 + e.dir * 9, y = e.y + e.h / 2 + s * 2;
  const a = Math.atan2(e.aim.y - y, e.aim.x - x) + rnd(-0.03, 0.03);
  const sp = corrupt ? KEYLOG.speed * 0.85 : KEYLOG.speed;
  const ch = e.log.length ? glyphChar(e.log[rndi(0, e.log.length)]) : KEY_CHARS[0];
  spawnEBullet(x, y, Math.cos(a) * sp, Math.sin(a) * sp,
    { size: 6, life: 220, key: true, letter: ch, corrupt, color: '#c9a0ff' });
  FX.spark(x, y, corrupt ? '#ff6ec7' : '#c9a0ff', 4, 1.8, [4, 11]);
}

/* La bala lleva una letra de teclado, no la flecha del panel: lo que vuela es
   lo que la máquina "leyó", y el panel es su lectura de eso. */
function glyphChar(act) {
  const i = (act.charCodeAt(0) * 7) % KEY_CHARS.length;
  return KEY_CHARS[i];
}

/**
 * ¿El renglón estuvo bien puesto? Se mide contra dónde está Bit cuando el tiro
 * debería estar llegando.
 *
 * Ajusta poco a propósito —la mitad de lo que ajusta una acción— porque el que
 * puntúa de verdad es `record`, acción por acción: si acá cobrara el precio
 * entero, el mismo error se pagaría dos veces y la barra viviría en el piso. Lo
 * que sí aporta es el glitch, que es el premio visible de haber roto el patrón.
 */
function judge(e) {
  const d = Math.hypot(P.x + P.w / 2 - e.aim.x, P.y + P.h / 2 - e.aim.y);
  if (d < KEYLOG.judgeR) {
    e.learn = clamp(e.learn + KEYLOG.hit * 0.5, 0, 100);
    return;
  }
  e.learn = clamp(e.learn - KEYLOG.miss * 0.5, 0, 100);
  e.fail = 26;
  FX.pop(e.x + e.w / 2, e.y + e.h / 2, '#c9a0ff', 14, { life: 12, points: 5 });
  FX.spark(e.aim.x, e.aim.y, '#8a77a6', 6, 2, [8, 16]);
  Sfx.misfire();
}

/* ═══════════════════════════════ el eco ═══════════════════════════════════ */

/**
 * Entrada fantasma. Con la confianza muy alta la máquina no se conforma con
 * predecir: reproduce. Sale una sombra digital de Bit que repite el renglón
 * guardado y después se apaga sola.
 *
 * Tiene tres candados para que no se vuelva una fábrica de enemigos: uno solo
 * por Keylogger a la vez, una espera entre ecos, y una vida corta atada al
 * largo del renglón. Y no cuenta como baja ni suelta nada (ver killEnemy): es
 * una grabación, no un proceso.
 */
function maybeGhost(e) {
  if (e.learn < KEYLOG.ghost || e.ghostCd > 0) return;
  if (e.eco && !e.eco.dead) return;
  if (e.log.length < 4) return;

  const x = e.x + e.w / 2 - 6, foot = e.surface > 0 ? e.y + e.h : e.y + 26;
  if (rectHitsSolid(x, foot - 26, 13, 26)) return;   // no lo escupe adentro de la roca

  /* Techo global, y no sólo uno por máquina: un sector con cuatro Keyloggers y
     un jugador muy repetitivo llegaría a cuatro ecos a la vez, que es más de lo
     que este enemigo tiene que pedir. Con dos ya se entiende el truco. */
  let vivos = 0, reciclable = null;
  for (const o of G.enemies) {
    if (o.type !== 'eco') continue;
    if (o.dead) reciclable = o; else vivos++;
  }
  if (vivos >= ECO_MAX) return;

  const fresco = spawnEnemy('eco', x, foot);
  fresco.script = e.log.slice();
  fresco.dir = P.x > e.x ? 1 : -1;
  fresco.life = fresco.script.length * KEYLOG.ghostStep + 40;

  /* Un eco muerto se reusa en vez de dejarlo en la lista y empujar otro: los
     muertos no se sacan de G.enemies en ningún lado —se saltean— y éste es el
     único enemigo que puede aparecer una y otra vez durante todo un nivel. Sin
     esto, la lista crece para siempre. */
  let sombra = fresco;
  if (reciclable) { Object.assign(reciclable, fresco); sombra = reciclable; }
  else G.enemies.push(fresco);

  e.eco = sombra;
  e.ghostCd = KEYLOG.ghostCd;

  FX.ring(x + 6, foot - 13, 34, '#c9a0ff', { life: 22, width: 2.2, alpha: 0.9 });
  FX.spark(x + 6, foot - 13, '#c9a0ff', 12, 2.6, [10, 22]);
  Sfx.misfire();
}

/**
 * El eco reproduce el renglón acción por acción, con la física de todos: camina,
 * cae, choca. No decide nada —no te persigue, no corrige— y por eso se le puede
 * ver el guión: es una repetición de lo que hiciste, con lo bueno y lo malo.
 */
export function eco(e, dx, dy, dist) {
  e.vy = Math.min(e.vy + PHYS.fallGravity * 0.8, 11);
  e.anim += Math.abs(e.vx) * 0.16;

  if (--e.life <= 0 || e.y > G.mapH + 40) { fade(e); return; }

  const act = e.script[e.step];
  if (act === undefined) { fade(e); return; }

  switch (act) {
    case ACT.IZQ: e.vx = -PHYS.runSpeed * 0.8; e.dir = -1; break;
    case ACT.DER: e.vx = PHYS.runSpeed * 0.8; e.dir = 1; break;
    case ACT.SALTO:
      /* salta sólo si del otro lado hay dónde caer: el guión dice "acá saltó",
         no "acá se tiró al pozo". Bit saltaba desde otro lugar del mapa. */
      if (e.stepT === 0 && e.onGround && canLand(e, e.dir, ECO_SALTO)) e.vy = -PHYS.jumpV;
      break;
    case ACT.DASH:
      e.vx = e.dir * DASH.speed * 0.7;
      if (e.stepT % 3 === 0) FX.ghost(e.x + e.w / 2, e.y + e.h / 2, e.dir);
      break;
    case ACT.TIRO:
      if (e.stepT === 4) {
        const x = e.x + e.w / 2 + e.dir * 8, y = e.y + 11;
        spawnEBullet(x, y, e.dir * 4.2, 0, { size: 5, life: 150, color: '#c9a0ff' });
        FX.spark(x, y, '#c9a0ff', 4, 2, [5, 12]);
        Sfx.shot('ping');
      }
      e.vx *= 0.8;
      break;
  }

  /* El guión se reproduce tal cual, pero no hasta el punto de tirarse a un
     pozo: el eco repite lo que hiciste, no dónde lo hiciste, y una grabación
     que se suicida a los dos pasos no repite nada. */
  moveActor(e, safeStepX(e, e.vx), e.vy, { oneway: true });
  if (e.onGround) e.vy = 0;
  if (e.hitWall) e.vx = 0;

  if (++e.stepT >= KEYLOG.ghostStep) { e.stepT = 0; e.step++; }
}

function fade(e) {
  e.dead = true;
  FX.pop(e.x + e.w / 2, e.y + e.h / 2, '#c9a0ff', 18, { life: 14, points: 6, core: '#e9d8ff' });
  FX.spark(e.x + e.w / 2, e.y + e.h / 2, '#8a77a6', 8, 2.2, [8, 18]);
}
