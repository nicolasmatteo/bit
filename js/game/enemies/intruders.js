/* Los tres que no pelean de frente: el que se esconde, el que te delata y el
   que te tapa la vista.

   El resto del bestiario te quita vida. Estos te quitan otra cosa —la certeza
   de que la pantalla dice la verdad— y por eso cada uno necesita un verbo del
   jugador que no sea disparar: el Rootkit se responde con el Escáner, el
   Spyware con el dash (que es encriptación) o con romperle la vista, y el
   Adware con leer antes de disparar.

   Como todos, telegrafían antes de atacar y cada uno tira al menos un paquete
   rosado: el parry nunca deja de ser una opción. */

import { G, P } from '../state.js';
import { moveActor, groundAhead, rectHitsSolid } from '../world.js';
import { PINK_GAP, TS } from '../../config.js';
import { spawnEBullet } from '../projectiles.js';
import * as FX from '../fx.js';
import { Sfx } from '../../audio.js';
import { rnd, rndi, clamp } from '../../util.js';
import { spawnEnemy } from './spawn.js';
import { queueShot, aimAt } from './shared.js';

/* ─────────────────────────────── Rootkit · el infiltrado

   Está en el mapa desde el principio, quieto y camuflado contra el fondo. No
   ataca hasta que se lo descubre, y descubrirlo es el juego entero:

     · acercarse de más lo revela solo, pero ya es tarde: salta encima
     · el Escáner lo revela a distancia — es perforante, y lo que perfora acá
       es el camuflaje. Es la única herramienta que sirve para mirar
     · si lo dejás vivo y te alejás, se mete adentro de otro proceso

   Un proceso infiltrado ataca al doble de velocidad y, al morir, escupe al
   Rootkit que traía adentro. De ahí el aviso del color: lo que late en violeta
   tiene algo. */

const REVEAL_NEAR = 64;      // a esta distancia se revela solo
const SCAN_REACH = 46;       // cuánto "ve" un disparo perforante a su alrededor
const HOST_REACH = 130;      // hasta dónde busca un cuerpo donde meterse

function rootkit(e, dx, dy, dist) {
  /* ── adentro de otro proceso: no tiene vida propia ── */
  if (e.mode === 'dentro') {
    const h = e.host;
    if (!h || h.dead) { surface(e); return; }
    e.x = h.x + h.w / 2 - e.w / 2;
    e.y = h.y + h.h / 2 - e.h / 2;
    return;
  }

  /* gravedad siempre: es una cosa que se apoya, no que flota */
  e.vy = Math.min(e.vy + 0.55, 11);

  if (e.mode === 'oculto') {
    moveActor(e, 0, e.vy, { oneway: false });
    e.shimmer++;
    if (dist < REVEAL_NEAR) { reveal(e, true); return; }
    /* el Escáner: cualquier paquete perforante que le pase cerca le rompe el
       camuflaje aunque no lo toque. Mirar es un disparo que no busca dar. */
    for (const b of G.bullets) {
      if (!b.pierce) continue;
      const bx = b.x + b.w / 2, by = b.y + b.h / 2;
      if (Math.hypot(bx - (e.x + e.w / 2), by - (e.y + e.h / 2)) < SCAN_REACH) {
        reveal(e, false);
        return;
      }
    }
    return;
  }

  if (e.mode === 'revela') {
    /* sacudida de aparición: todavía no hace nada, para que se lo vea llegar */
    moveActor(e, 0, e.vy, { oneway: false });
    if (--e.revealT <= 0) e.mode = 'caza';
    return;
  }

  /* ── caza ── */
  if (e.leap > 0) {
    e.leap--;
    moveActor(e, e.dir * 2.6, e.vy, { oneway: false });
    if (e.onGround && e.vy >= 0 && e.leap < 26) {
      e.leap = 0;
      e.cd = rnd(70, 110);
      FX.dust(e.x + e.w / 2, e.y + e.h, G.theme.fog, 6, 1.8);
      /* al aterrizar suelta un fragmento corrupto: el que salta también se para */
      const mx = e.x + e.w / 2, my = e.y + e.h / 2;
      const a = aimAt(mx, my);
      spawnEBullet(mx, my, Math.cos(a) * 3.2, Math.sin(a) * 3.2,
        { size: 5, corrupt: true, glyph: true });
    }
    return;
  }

  e.dir = dx > 0 ? 1 : -1;
  const probeX = e.dir > 0 ? e.x + e.w + 3 : e.x - 3;
  const step = dist > 90 && groundAhead(probeX, e.y + e.h + 3) ? e.dir * e.speed : 0;
  moveActor(e, step, e.vy, { oneway: false });
  e.anim += Math.abs(step) * 0.14;

  if (e.telegraph > 0) {
    if (--e.telegraph === 0) { e.leap = 52; e.vy = -7.2; }
    return;
  }

  /* Lejos y sin apuro: busca un cuerpo donde meterse. Es lo que lo vuelve un
     problema que hay que resolver ahora y no dentro de un rato.
     El umbral es 220 y no más: a un enemigo fuera de cuadro no se le corre la
     IA (`updateEnemies`), así que si esperara a estar más lejos, no se
     escondería nunca donde el jugador pueda verlo hacerlo. */
  if (dist > 220 && --e.hideCd <= 0) {
    const h = findHost(e);
    if (h) { burrow(e, h); return; }
    e.hideCd = rnd(90, 160);
  }

  if (--e.cd <= 0 && dist < 220 && e.onGround) {
    e.telegraph = 30;
    Sfx.telegraph();
  }
}

/** Se le cae el camuflaje. `sorpresa` es cuando lo descubriste con el cuerpo. */
function reveal(e, sorpresa) {
  e.mode = 'revela';
  e.noTouch = false;                 // descubierto, ya cobra por chocarlo
  e.revealT = sorpresa ? 16 : 30;    // descubierto de lejos, tenés más tiempo
  e.cd = sorpresa ? 24 : rnd(50, 90);
  e.aggro = 300;
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
  FX.pop(cx, cy, '#b98cff', 18, { life: 14, points: 7, core: '#ffffff' });
  FX.spark(cx, cy, '#e0c0ff', 12, 2.6, [10, 22]);
  FX.shake(sorpresa ? 3.2 : 1.6);
  Sfx.telegraph();
}

/** El proceso vivo más cercano donde meterse. Nunca un jefe ni otro Rootkit. */
function findHost(e) {
  let best = null, bestD = HOST_REACH;
  for (const o of G.enemies) {
    if (o === e || o.dead || o.boss || o.infected) continue;
    if (o.type === 'rootkit' || o.type === 'ventana') continue;
    const d = Math.hypot(o.x - e.x, o.y - e.y);
    if (d < bestD) { bestD = d; best = o; }
  }
  return best;
}

function burrow(e, h) {
  e.mode = 'dentro';
  e.host = h;
  h.infected = e;
  const cx = h.x + h.w / 2, cy = h.y + h.h / 2;
  FX.ring(cx, cy, 34, '#b98cff', { life: 22, width: 2.4, alpha: 0.9 });
  FX.spark(cx, cy, '#c9a0ff', 12, 2.4, [10, 22]);
  Sfx.telegraph();
}

/** Sale del cuerpo que lo tapaba, ya descubierto. Lo llama combat.js al matar
 *  al anfitrión, y también la propia IA si el anfitrión desapareció. */
export function surface(e) {
  const h = e.host;
  if (h) { e.x = h.x + h.w / 2 - e.w / 2; e.y = h.y + h.h / 2 - e.h / 2; h.infected = null; }
  e.host = null;
  e.vy = -3.4;
  reveal(e, true);
}

/* ─────────────────────────────── Spyware · el perseguidor

   No pelea: mira. Mientras te tenga a la vista le pasa tu posición a todo el
   que esté cerca, y si lo dejás mirar demasiado tiempo hace sonar la alarma y
   el sector entero te ataca a la vez.

   Tres respuestas, y ninguna es "quedarse quieto disparando":
     · romperle la línea de vista (una pared cuenta, la distancia también)
     · el dash — es el dash de ENCRIPTACIÓN: mientras dura, no hay qué leer
     · matarlo, que es fácil si lo dejás acercarse: tiene 5 de integridad  */

const SPY_RANGE = 250;       // hasta dónde lee
const SPY_SHARE = 380;       // a qué distancia reparte lo que leyó
const SPY_ALARM = 300;       // cuadros de lectura sostenida antes de la alarma

function spyware(e, dx, dy, dist) {
  e.float += 0.05;
  e.dir = dx > 0 ? 1 : -1;
  if (e.alarm > 0) e.alarm--;

  /* deriva lenta hacia Bit, manteniendo distancia de cámara: no viene a chocar */
  const want = dist > 120 ? 1 : (dist < 70 ? -1 : 0);
  const mx = clamp(dx * 0.02, -e.speed, e.speed) * want;
  const my = clamp(dy * 0.02, -e.speed, e.speed) * want + Math.sin(e.float) * 0.35;
  if (!rectHitsSolid(e.x + mx, e.y, e.w, e.h)) e.x += mx;
  if (!rectHitsSolid(e.x, e.y + my, e.w, e.h)) e.y = clamp(e.y + my, 4, G.mapH - e.h - 4);

  /* ── la lectura ── */
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
  const px = P.x + P.w / 2, py = P.y + P.h / 2;
  const encriptado = P.dash > 0;          // el dash es lo que rompe la señal
  const ve = !P.dead && !encriptado && dist < SPY_RANGE && lineOfSight(cx, cy, px, py);

  /* `watch` y no `lock`: `e.lock` ya significa "zona cifrada" en el ransomware,
     y `dropLock()` lo lee al morir cualquier enemigo. Un número ahí dentro
     rompía la muerte del Spyware. */
  if (ve) e.watch++;
  else e.watch = Math.max(0, e.watch - 3);  // perder el rastro es más rápido que tomarlo

  e.beam = ve;
  if (e.watch > 30) {
    /* te delata: todo lo que esté cerca sabe dónde estás */
    for (const o of G.enemies) {
      if (o.dead || o === e || o.type === 'ventana') continue;
      if (Math.hypot(o.x - cx, o.y - cy) < SPY_SHARE) o.aggro = Math.max(o.aggro, 120);
    }
  }

  if (e.watch >= SPY_ALARM) { raiseAlarm(e); return; }

  /* el ping de posición: un paquete rosado por el mismo haz. Pararlo le corta
     la lectura, así que el parry también sirve para esconderse. */
  if (e.telegraph > 0) {
    if (--e.telegraph === 0) {
      const a = aimAt(cx, cy);
      queueShot(e, PINK_GAP, () => {
        spawnEBullet(cx, cy, Math.cos(a) * 3.4, Math.sin(a) * 3.4,
          { size: 5, corrupt: true });
      });
      spawnEBullet(cx, cy, Math.cos(a) * 3.4, Math.sin(a) * 3.4, { size: 3.4 });
      e.cd = rnd(150, 220);
    }
  } else if (--e.cd <= 0 && e.watch > 60) {
    e.telegraph = 26;
    Sfx.telegraph();
  }
}

/** ¿Hay pared entre los dos puntos? Se muestrea de a medio tile. */
function lineOfSight(x0, y0, x1, y1) {
  const d = Math.hypot(x1 - x0, y1 - y0);
  const pasos = Math.ceil(d / (TS / 2));
  for (let i = 1; i < pasos; i++) {
    const t = i / pasos;
    if (rectHitsSolid(x0 + (x1 - x0) * t - 1, y0 + (y1 - y0) * t - 1, 2, 2)) return false;
  }
  return true;
}

/**
 * La alarma: todo el sector a la vez. No agrega enemigos —eso sería castigar
 * con trabajo— sino que sincroniza los que ya estaban, que es justo lo que
 * hace peligrosa a una red que sabe dónde estás.
 */
function raiseAlarm(e) {
  e.watch = 0;
  e.alarm = 90;
  e.cd = 120;
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
  for (const o of G.enemies) {
    if (o.dead || o === e || o.type === 'ventana') continue;
    if (Math.hypot(o.x - cx, o.y - cy) > 520) continue;
    o.aggro = 300;
    if (o.telegraph === 0 && o.cd > 20) o.cd = 20;
  }
  FX.ring(cx, cy, 200, '#ff3d5a', { life: 34, width: 3, alpha: 0.9 });
  FX.flash(6, '#ff3d5a');
  FX.shake(5);
  Sfx.telegraph();
}

/* ─────────────────────────────── Adware · el distractor

   Aparece donde hace falta puntería y llena el aire de ventanas. Las ventanas
   son enemigos de verdad —se les dispara, estorban, tienen cara— y vienen de
   dos clases:

     · trampa: molesta al tocarla, y al reventarla sale un bicho
     · premio: no toca a nadie, y al reventarla deja algo

   La diferencia se ve, no se adivina: la trampa es chillona y tiene ceño; el
   premio es verde y está quieto. Leer antes de disparar es toda la mecánica. */

const MAX_VENTANAS = 6;      // techo global: la pantalla tiene que seguir jugable

function adware(e, dx, dy, dist) {
  e.vy = Math.min(e.vy + 0.55, 11);
  e.float += 0.06;
  e.dir = dx > 0 ? 1 : -1;

  /* se mueve poco y con saltitos: es un cartel, no un cazador */
  const probeX = e.dir > 0 ? e.x + e.w + 3 : e.x - 3;
  const step = dist > 150 && groundAhead(probeX, e.y + e.h + 3) ? e.dir * e.speed : 0;
  moveActor(e, step, e.vy, { oneway: false });
  if (e.onGround && e.t % 46 === 0) e.vy = -3.2;

  if (e.telegraph > 0) {
    if (--e.telegraph === 0) {
      popWindows(e);
      /* el banner rosado sale aparte, como en toda la fauna */
      const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
      queueShot(e, PINK_GAP, () => {
        const a = aimAt(cx, cy);
        spawnEBullet(cx, cy, Math.cos(a) * 3.2, Math.sin(a) * 3.2,
          { size: 6, corrupt: true, popup: true });
      });
      e.cd = rnd(150, 230);
    }
    return;
  }
  if (--e.cd <= 0 && dist < 320) {
    e.telegraph = 34;
    Sfx.telegraph();
  }
}

/** Dos o tres ventanas alrededor de Bit, donde más estorban. */
function popWindows(e) {
  openWindows(P.x, P.y, rndi(2, 3));
}

/**
 * Abre hasta `n` ventanas alrededor de un punto, respetando el techo global.
 * La usan el Adware —que es de quien son— y el Implante, que en la capa del
 * firmware ya se apropió de todo lo que encontró más arriba.
 */
export function openWindows(px, py, n) {
  const vivas = G.enemies.filter(o => !o.dead && o.type === 'ventana').length;
  const cuantas = Math.min(n, MAX_VENTANAS - vivas);
  for (let i = 0; i < cuantas; i++) {
    /* alrededor del jugador y no del Adware: la gracia es taparte a vos. Se
       prueban varios lugares antes de rendirse — pegado a una pared, el primer
       sorteo cae adentro de la roca casi siempre, y el Adware terminaba
       abriendo una sola ventana justo donde más molestaría abrir tres. */
    let x = 0, y = 0, sitio = false;
    for (let intento = 0; intento < 8 && !sitio; intento++) {
      x = px + rnd(-110, 110);
      y = py + rnd(-70, 20);
      sitio = !rectHitsSolid(x, y, 34, 26);
    }
    if (!sitio) continue;
    const w = spawnEnemy('ventana', x, y + 26);
    w.kind = Math.random() < 0.34 ? 'premio' : 'trampa';
    w.noTouch = w.kind === 'premio';
    G.enemies.push(w);
    FX.pop(x + 17, y + 13, w.kind === 'premio' ? '#7de86a' : '#ff4f9a', 14,
      { life: 12, points: 6, core: '#ffffff' });
  }
  Sfx.telegraph();
}

/** La ventana: flota donde apareció, cabecea y no persigue a nadie. */
function ventana(e, dx, dy, dist) {
  e.float += 0.045;
  e.y = e.homeY + Math.sin(e.float) * 4;
  e.x = e.homeX + Math.sin(e.float * 0.6) * 3;
  /* se cierra sola: una ventana eterna dejaría el sector tapado para siempre */
  if (--e.life <= 0) closeWindow(e);
}

/** Se cierra por tiempo, sin premio ni castigo: no la mataste, se aburrió. */
function closeWindow(e) {
  e.dead = true;
  FX.pop(e.x + e.w / 2, e.y + e.h / 2, '#d9c299', 12, { life: 10, points: 5 });
}

export { rootkit, spyware, adware, ventana };
