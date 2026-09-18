/* Los tres jefes y la regla que sólo ellos tienen: la arena.

   Ningún enemigo del juego se cae del mapa —eso ya lo garantiza world.js para
   todos—, pero al jefe no le alcanza con no dar el paso: si algo igual lo saca
   del piso, vuelve. La puerta del sector no abre mientras el jefe viva, así que
   un jefe perdido es un nivel sin final; a cualquier otro que se caiga se lo
   puede dar por perdido y listo. Por eso acá están el Monarca, el Barón, el
   Implante, y el piso que ninguno de los tres puede dejar. */

import { G, P } from '../state.js';
import { moveActor, safeGroundBelow, rectHitsSolid, hasFooting } from '../world.js';
import { PINK_GAP } from '../../config.js';
import { spawnEBullet } from '../projectiles.js';
import * as FX from '../fx.js';
import { Sfx } from '../../audio.js';
import { rnd, rndi, clamp } from '../../util.js';
import { queueShot, aimAt } from './shared.js';
import { spawnEnemy } from './spawn.js';
import { openWindows } from './intruders.js';

/* ═══════════════════════════════ jefe 01 — THE ROOTKIT MONARCH
   Un rey de código corrupto. Su golpe propio es el "pozo": durante unos
   segundos da vuelta la atracción de la arena y hay que pelear flotando. */

const MONARCH_CYCLE = ['pozo', 'corona', 'pisoton'];

export function monarca(e, dx, dy, dist) {
  e.float += 0.04;
  e.dir = dx > 0 ? 1 : -1;
  const rage = e.hp < e.maxHp * 0.4;

  /* pozo de gravedad activo */
  if (e.wellT > 0) {
    e.wellT--;
    G.gravMul = -0.55;
    if (e.wellT === 0) {
      G.gravMul = 1;
      FX.flash(4, '#c08cff');
    }
    if (G.tick % 4 === 0) {
      FX.spark(rnd(G.cam.x, G.cam.x + G.view.w), rnd(G.cam.y, G.cam.y + G.view.h), '#c08cff', 1, 1.6, [14, 30]);
    }
  }

  if (e.leap > 0) {
    e.leap--;
    e.vy = Math.min(e.vy + 0.55, 12);
    /* el pisotón avanza mientras cae, pero no se tira a un pozo: si adelante
       no hay piso sano, baja en el lugar */
    moveActor(e, bossStepX(e, e.dir * 1.6), e.vy, { oneway: false });
    if (e.onGround && e.vy >= 0 && e.leap < 30) {
      e.leap = 0;
      FX.shake(10); FX.flash(4, '#e0c0ff');
      FX.ring(e.x + e.w / 2, e.y + e.h, 120, '#c08cff', { life: 26, width: 3, squash: 0.22 });
      FX.dust(e.x + e.w / 2, e.y + e.h, G.theme.fog, 18, 3.4);
      Sfx.boom();
      for (const d of [-1, 1]) {
        spawnEBullet(e.x + e.w / 2 + d * 30, e.y + e.h - 8, d * 3.4, 0,
          { size: 13, heavy: true, life: 150, color: '#c08cff' });
      }
    }
    return;
  }

  /* flota: sube y baja despacio manteniendo distancia media */
  const want = Math.abs(dx) > 150 ? e.dir : (Math.abs(dx) < 70 ? -e.dir : 0);
  const mv = bossStepX(e, want * e.speed * (rage ? 1.5 : 1));
  e.vy = Math.sin(e.float) * 0.9;
  moveActor(e, mv, e.vy, { oneway: false });
  e.step += Math.abs(mv) * 0.09;

  if (e.telegraph > 0) {
    if (--e.telegraph === 0) monarchAttack(e, dx, dy, rage);
    return;
  }
  if (--e.cd <= 0) {
    e.attack = MONARCH_CYCLE[(MONARCH_CYCLE.indexOf(e.attack) + 1) % MONARCH_CYCLE.length];
    e.telegraph = e.attack === 'pozo' ? 60 : 38;
    Sfx.telegraph();
  }
}

function monarchAttack(e, dx, dy, rage) {
  e.cd = rage ? 70 : 108;
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2;

  if (e.attack === 'pozo') {
    e.wellT = rage ? 200 : 150;
    FX.flash(8, '#c08cff');
    FX.ring(cx, cy, 300, '#c08cff', { life: 44, width: 5, alpha: 0.9 });
    FX.shake(8);
    Sfx.boom();
  } else if (e.attack === 'corona') {
    /* Dos anillos: primero uno de permisos denegados, y cuando ya se abrió, uno
       más chico de rosados, girado medio paso para que salgan por los huecos del
       primero. Antes iban intercalados en el mismo anillo, y el rosado tenía
       una bala normal pegada a cada lado. */
    const n = rage ? 14 : 10;
    const start = e.float;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + start;
      spawnEBullet(cx, cy, Math.cos(a) * 2.9, Math.sin(a) * 2.9, { size: 6, life: 260, color: '#c08cff' });
    }
    queueShot(e, PINK_GAP, () => {
      const px = e.x + e.w / 2, py = e.y + e.h / 2;
      const m = Math.round(n / 3);
      for (let i = 0; i < m; i++) {
        const a = ((i + 0.5) / m) * Math.PI * 2 + start;
        spawnEBullet(px, py, Math.cos(a) * 2.6, Math.sin(a) * 2.6, { size: 6, life: 260, corrupt: true });
      }
      FX.ring(px, py, 30, '#ff6ec7', { life: 14, width: 2, alpha: 0.8 });
    });
    FX.pop(cx, cy, '#c08cff', 26, { life: 14, points: 8 });
    FX.shake(3);
  } else {
    e.leap = 70;
    e.vy = -8.4;
    FX.dust(cx, e.y + e.h, G.theme.fog, 10, 2.4);
  }
}

/* ═══════════════════════════════ jefe 02 — BARON VON DDoS
   Botnet con tres cabezas. No se mueve mucho: satura. En fase de furia las
   tres disparan a la vez y la pantalla se llena — la mitad de eso es parable,
   que es exactamente el punto. */

const BARON_CYCLE = ['abanico', 'espiral', 'inundacion'];

export function baron(e, dx, dy, dist) {
  e.float += 0.032;
  e.spin += 0.021;
  e.dir = dx > 0 ? 1 : -1;
  const rage = e.hp < e.maxHp * 0.45;

  /* deriva lenta a media altura: es una nube, no un caminante. Aunque flote,
     la nube tampoco cruza el líquido: del otro lado no habría dónde pelearla. */
  const wantX = P.x + P.w / 2 - e.w / 2 + Math.sin(e.float * 0.7) * 90;
  e.x += bossStepX(e, clamp((wantX - e.x) * 0.006, -e.speed, e.speed));
  e.x = clamp(e.x, 10, G.mapW - e.w - 10);
  // la altura se fija contra baseY en vez de acumularse: integrar un seno cuadro
  // a cuadro deriva de a poco, y en una pelea larga la nube terminaba en el piso
  e.y = e.baseY + Math.sin(e.float) * 14;

  for (const h of e.heads) h.ang += 0.03;

  if (e.telegraph > 0) {
    if (--e.telegraph === 0) baronAttack(e, dx, dy, rage);
    return;
  }
  if (--e.cd <= 0) {
    e.attack = BARON_CYCLE[(BARON_CYCLE.indexOf(e.attack) + 1) % BARON_CYCLE.length];
    e.telegraph = 34;
    Sfx.telegraph();
  }
}

function baronAttack(e, dx, dy, rage) {
  e.cd = rage ? 58 : 96;
  const heads = headPoints(e);

  if (e.attack === 'abanico') {
    /* cada cabeza abre dos normales a los costados de la línea hacia vos, y
       por el medio, un rato después, el rosado */
    for (const [hi, h] of heads.entries()) {
      const base = Math.atan2(P.y + P.h / 2 - h.y, P.x + P.w / 2 - h.x);
      for (const i of [-1, 1]) {
        const a = base + i * 0.26;
        spawnEBullet(h.x, h.y, Math.cos(a) * 3.4, Math.sin(a) * 3.4, { size: 5, life: 280 });
      }
      FX.spark(h.x, h.y, '#ffd23d', 5, 2.2);
      queueShot(e, PINK_GAP + hi * 8, () => {
        const hp = headPoints(e)[hi];
        const pa = aimAt(hp.x, hp.y);
        spawnEBullet(hp.x, hp.y, Math.cos(pa) * 3.4, Math.sin(pa) * 3.4, { size: 5.5, life: 280, corrupt: true });
        FX.spark(hp.x, hp.y, '#ff6ec7', 4, 2);
      });
    }
  } else if (e.attack === 'espiral') {
    const arms = rage ? 3 : 2;
    for (let k = 0; k < arms; k++) {
      for (const [hi, h] of heads.entries()) {
        const a = e.spin + k * (Math.PI * 2 / arms) + hi * 0.7;
        spawnEBullet(h.x, h.y, Math.cos(a) * 3.1, Math.sin(a) * 3.1,
          { size: 5.5, life: 300, corrupt: k === 0 });
      }
    }
    FX.shake(2);
  } else {
    /* inundación: cortina desde arriba, con huecos por donde pasar */
    const cols = rage ? 12 : 8;
    const gap = rndi(0, cols - 2);
    for (let i = 0; i < cols; i++) {
      if (i === gap || i === gap + 1) continue;      // siempre hay por dónde
      const x = G.cam.x + (i + 0.5) * (G.view.w / cols);
      spawnEBullet(x, G.cam.y - 10, 0, 2.6,
        { size: 6, life: 320, corrupt: i % 4 === 0 });
    }
    FX.shake(4);
    Sfx.boom();
  }
}

/** Las tres cabezas, en coordenadas de mundo. Las usa la IA y el dibujo. */
export function headPoints(e) {
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
  return e.heads.map((h, i) => ({
    x: cx + Math.cos(h.ang + i * 2.09) * (e.w * 0.33),
    y: cy + Math.sin(h.ang + i * 2.09) * (e.h * 0.28) - 6,
    ang: h.ang,
  }));
}

/* ═══════════════════════════════ jefe 03 — EL IMPLANTE

   Está debajo del sistema operativo, así que sobrevivió a que le ganaras el
   root: no se instaló en la raíz, se instaló en el arranque. No se mueve casi
   —está soldado— y pelea con lo que aprendió de todo lo que vive más arriba:
   barre el piso, abre ventanas y satura.

   Su golpe propio es el que le da nombre: se copia. Al bajar de dos tercios y
   de un tercio de integridad se apaga, aparecen tres copias idénticas y hay que
   encontrar cuál es el de verdad. Dos cosas lo delatan, y las dos son cosas que
   el jugador ya aprendió antes:

     · proyecta sombra. Las copias no tocan el piso, y en este juego lo que no
       apoya no tiene sombra — es la misma pista que da el Rootkit camuflado.
     · el Escáner. Un disparo perforante que le pase cerca lo hace parpadear,
       igual que le rompe el camuflaje al Rootkit.

   Mientras dura la copia no ataca y recibe el doble: la fase es un acertijo,
   no una carrera de daño. Pegarle al de verdad la termina; pegarle a una copia
   la revienta y no pasa nada más — equivocarse cuesta tiempo, no vida. */

const IMPLANTE_CYCLE = ['barrido', 'ventanas', 'enjambre'];
const COPIAS = 3;
const COPIA_T = 260;         // cuánto dura la fase antes de rendirse sola

export function implante(e, dx, dy, dist) {
  e.float += 0.03;
  e.dir = dx > 0 ? 1 : -1;
  const rage = e.hp < e.maxHp * 0.34;

  /* ── fase de copias: quieto, apagado y esperando que lo encuentren ── */
  if (e.copiaT > 0) {
    e.copiaT--;
    e.vy = 0;
    /* el Escáner lo delata: cualquier perforante cerca lo hace parpadear */
    for (const b of G.bullets) {
      if (!b.pierce) continue;
      const bx = b.x + b.w / 2, by = b.y + b.h / 2;
      if (Math.hypot(bx - (e.x + e.w / 2), by - (e.y + e.h / 2)) < 70) { e.marcado = 20; break; }
    }
    if (e.marcado > 0) e.marcado--;
    if (e.copiaT === 0) endCopias(e);
    return;
  }

  /* ── deriva: está soldado, así que se corre poco y nunca sale de la arena ── */
  const wantX = P.x + P.w / 2 - e.w / 2;
  const paso = clamp((wantX - e.x) * 0.004, -e.speed, e.speed);
  e.vy = Math.min(e.vy + 0.55, 11);
  moveActor(e, bossStepX(e, paso), e.vy, { oneway: false });

  if (e.telegraph > 0) {
    if (--e.telegraph === 0) implanteAttack(e, dx, dy, rage);
    return;
  }
  if (--e.cd <= 0) {
    e.attack = IMPLANTE_CYCLE[(IMPLANTE_CYCLE.indexOf(e.attack) + 1) % IMPLANTE_CYCLE.length];
    e.telegraph = 36;
    Sfx.telegraph();
  }
}

function implanteAttack(e, dx, dy, rage) {
  e.cd = rage ? 78 : 116;
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
  const pie = e.y + e.h - 6;

  if (e.attack === 'barrido') {
    /* Línea de barrido: paquetes rasantes que hay que saltar. Salen del piso y
       van parejos, así que se leen como una sola línea y no como una ráfaga. */
    const dir = e.dir;
    for (let i = 0; i < 5; i++) {
      queueShot(e, i * 5, () => {
        spawnEBullet(cx + dir * 30, pie, dir * 4.4, 0, { size: 7, heavy: true, life: 200 });
      });
    }
    queueShot(e, 25 + PINK_GAP, () => {
      spawnEBullet(cx + dir * 30, pie, dir * 4.0, 0, { size: 7, corrupt: true, life: 200 });
    });
    FX.dust(cx + dir * 30, e.y + e.h, G.theme.fog, 10, 2.2);
    FX.shake(3);

  } else if (e.attack === 'ventanas') {
    /* te tapa la vista y dispara por los huecos */
    openWindows(P.x, P.y, rage ? 4 : 3);
    for (let i = 0; i < 2; i++) {
      queueShot(e, 30 + i * 22, () => {
        const a = aimAt(cx, cy);
        spawnEBullet(cx, cy, Math.cos(a) * 4.2, Math.sin(a) * 4.2, { size: 6 });
      });
    }
    queueShot(e, 30 + PINK_GAP * 2, () => {
      const a = aimAt(cx, cy);
      spawnEBullet(cx, cy, Math.cos(a) * 3.8, Math.sin(a) * 3.8, { size: 6, corrupt: true });
    });
    Sfx.telegraph();

  } else {
    /* enjambre: abanico ancho y, aparte, tres rosados por los huecos */
    const n = rage ? 9 : 7;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI + (i / (n - 1)) * Math.PI;   // medio círculo hacia arriba
      spawnEBullet(cx, cy, Math.cos(a) * 3.2, Math.sin(a) * 3.2, { size: 5, life: 240 });
    }
    queueShot(e, PINK_GAP, () => {
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI + ((i + 0.5) / 3) * Math.PI;
        spawnEBullet(cx, cy, Math.cos(a) * 3.0, Math.sin(a) * 3.0, { size: 6, corrupt: true });
      }
    });
    FX.pop(cx, cy, '#9fe8ff', 24, { life: 14, points: 8 });
    FX.shake(3);
  }
}

/**
 * Se copia. Lo llama combat.js cuando el daño le cruza un umbral, porque el
 * único que sabe cuánta vida le queda después de un golpe es quien lo golpea.
 */
export function splitImplante(e) {
  e.copiaT = COPIA_T;
  e.telegraph = 0;
  e.marcado = 0;
  e.queue = null;                       // lo que tenía encolado no sale: se apagó
  const cy = e.y;
  for (let i = 0; i < COPIAS; i++) {
    /* las copias se reparten a lo ancho de la arena, a la altura del original y
       siempre sobre piso sano: una copia adentro de la roca se delataría sola */
    let x = 0, sitio = false;
    for (let intento = 0; intento < 12 && !sitio; intento++) {
      x = e.x + rnd(-260, 260);
      sitio = !rectHitsSolid(x, cy, e.w, e.h) && safeGroundBelow(x + 10, cy + e.h) &&
              safeGroundBelow(x + e.w - 10, cy + e.h) && Math.abs(x - e.x) > 70;
    }
    if (!sitio) continue;
    const c = spawnEnemy('copia', x, cy + e.h);
    c.dir = e.dir;
    G.enemies.push(c);
    FX.ring(x + e.w / 2, cy + e.h / 2, 60, '#9fe8ff', { life: 24, width: 2.4, alpha: 0.9 });
  }
  FX.flash(7, '#9fe8ff');
  FX.shake(7);
  Sfx.boom();
}

/** Se acabó el acertijo: las copias se apagan y el original vuelve a pelear. */
export function endCopias(e) {
  e.copiaT = 0;
  e.marcado = 0;
  e.cd = 40;
  for (const o of G.enemies) {
    if (o.dead || o.type !== 'copia') continue;
    o.dead = true;
    FX.pop(o.x + o.w / 2, o.y + o.h / 2, '#9fe8ff', 18, { life: 12, points: 6 });
  }
  FX.flash(4, '#9fe8ff');
}

/** La copia no hace nada: parpadea y espera que le disparen. */
export function copia(e, dx, dy, dist) {
  e.float += 0.05;
  e.y = e.homeY + Math.sin(e.float) * 2.5;    // flota: no toca el piso, no da sombra
}

/* ═══════════════════════════════ la arena de un jefe

   Que ningún enemigo se caiga del mapa es regla de la casa y vive en world.js
   (ver hasFooting). El jefe además tiene esto, que es más terco: no sólo no da
   el paso que lo dejaría en el aire, sino que si algo igual lo corrió de ahí
   —el pisotón, un empujón, un mapa que lo puso al borde— vuelve flotando al
   último lugar donde estuvo bien parado, en vez de caer y apagarse.

   La diferencia no es capricho: a cualquier otro que se caiga se lo puede dar
   por perdido, pero la puerta del sector no abre mientras el jefe viva. Un jefe
   perdido en el vacío es un nivel que no se puede terminar. */

const BOSS_EDGE = 12;        // cuánto se mide hacia adentro de cada costado
const BOSS_RETURN = 3.2;     // velocidad del regreso, en unidades por cuadro

/** ¿Los dos costados del jefe tienen piso sano debajo? El margen es más ancho
    que el de cualquier otro porque el jefe también lo es. */
const bossFooting = (e, x = e.x) => hasFooting(e, x, BOSS_EDGE);

/** Recorta un paso horizontal para que nunca lo saque del piso sano. */
function bossStepX(e, dx) {
  if (dx === 0) return 0;
  return bossFooting(e, e.x + dx) ? dx : 0;
}

/**
 * Ancla: mientras pise bien, guarda dónde está. Si terminó sobre el vacío,
 * cancela lo que estuviera haciendo en el aire y lo trae de vuelta.
 */
export function bossKeepArena(e) {
  if (bossFooting(e)) {
    e.safeX = e.x;
    e.safeY = e.y;
    return;
  }
  if (e.safeX === undefined) { e.safeX = e.x; e.safeY = e.y; return; }

  e.x += clamp(e.safeX - e.x, -BOSS_RETURN, BOSS_RETURN);
  e.y += clamp(e.safeY - e.y, -BOSS_RETURN, BOSS_RETURN);
  e.vy = 0;
  if (e.leap) e.leap = 0;   // no hay dónde pisar: el pisotón se cae solo
}

/** El jefe entra en cuadro: un respiro antes del primer ataque, para que se lo vea. */
export function wakeBoss(e) {
  e.awake = true;
  e.safeX = e.x;
  e.safeY = e.y;
  e.cd = Math.max(e.cd, 90);
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
  FX.ring(cx, cy, 120, G.theme.hostile, { life: 34, width: 3, alpha: 0.9 });
  FX.flash(5, G.theme.hostile);
  FX.shake(6);
  Sfx.telegraph();
}

/**
 * El jefe vivo, si lo hay. Lo usa la puerta, que queda cerrada mientras viva
 * aunque todavía duerma. La barra de vida pregunta además por `awake`.
 */
export function activeBoss() {
  return G.enemies.find(e => e.boss && !e.dead) || null;
}
