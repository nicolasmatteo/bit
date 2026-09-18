/* La tropa: spambot, troyano, keylogger, gusano y el bicho que sale del
   troyano. Son los que llenan un sector — patrullan, telegrafían y disparan— y
   están juntos porque comparten la misma silueta de comportamiento: caminan,
   miran, avisan y tiran. Lo que se aprende con uno sirve para los otros. */

import { G } from '../state.js';
import { moveActor, groundAhead, rectHitsSolid } from '../world.js';
import { PINK_GAP } from '../../config.js';
import { spawnEBullet } from '../projectiles.js';
import * as FX from '../fx.js';
import { Sfx } from '../../audio.js';
import { rnd, rndi } from '../../util.js';
import { spawnEnemy } from './spawn.js';
import { queueShot, aimAt } from './shared.js';

const MAX_WORMS = 9;   // techo global: un gusano sin control no puede colgar el nivel

/* ─────────────────────────────── Spambot
   Patrulla y, cuando te ve, vomita una ráfaga de ventanas emergentes. La del
   medio sale corrupta: es el primer parry que aprende cualquiera que juegue. */

export function spambot(e, dx, dy, dist) {
  e.vy = Math.min(e.vy + 0.55, 11);
  const sees = dist < 340 && Math.abs(dy) < 110;
  if (sees) e.aggro = 150;

  if (e.popup > 0) e.popup--;

  if (e.aggro > 0) {
    e.state = 'combate';
    e.dir = dx > 0 ? 1 : -1;

    /* No se queda clavado mirándote: retrocede si lo tenés encima y se acerca
       si estás lejos. Quieto entre ráfaga y ráfaga parecía un decorado. */
    const want = dist < 80 ? -1 : (dist > 190 ? 1 : 0);
    const busy = e.telegraph > 0 || e.burst > 0;
    let step = busy ? 0 : want * e.dir * e.speed * 0.8;
    /* el borde se mira antes de pisar: retrocediendo de espaldas, si no, se
       tira de la plataforma solo */
    if (step !== 0 && e.onGround) {
      const probeX = step > 0 ? e.x + e.w + 3 : e.x - 3;
      if (!groundAhead(probeX, e.y + e.h + 3)) step = 0;
    }
    moveActor(e, step, e.vy, { oneway: false });
    if (step !== 0) e.anim += 0.11;

    if (e.telegraph > 0) {
      if (--e.telegraph === 0) { e.burst = 2; e.burstCd = 0; e.cd = rnd(95, 150); }
    } else if (e.burst > 0) {
      /* La cadencia lleva su propio contador. Antes iba con `e.t % 9`, y como
         `e.t` arranca fraccionario ese resto nunca daba cero: el spambot
         telegrafiaba, cargaba la ráfaga y no llegaba a disparar jamás. */
      if (--e.burstCd <= 0) {
        e.burstCd = 9;
        e.burst--;
        const a = Math.atan2(dy, dx) + rnd(-0.05, 0.05);
        spawnEBullet(e.x + e.w / 2 + e.dir * 9, e.y + 11,
          Math.cos(a) * 3.6, Math.sin(a) * 3.6, { size: 3.6, popup: true });
        e.popup = 10;
        FX.spark(e.x + e.w / 2 + e.dir * 12, e.y + 11, '#ffe07a', 3, 1.6, [4, 10]);
        /* dos ventanas normales, y la rosada sola al final. Antes iba en el
           medio, a 9 cuadros de cada normal: pararla era comerse la otra */
        if (e.burst === 0) queueShot(e, PINK_GAP, () => {
          const mx = e.x + e.w / 2 + e.dir * 9, my = e.y + 11;
          const pa = aimAt(mx, my);
          spawnEBullet(mx, my, Math.cos(pa) * 3.6, Math.sin(pa) * 3.6, { size: 5, corrupt: true, popup: true });
          e.popup = 10;
          FX.spark(mx, my, '#ff6ec7', 4, 1.8, [4, 10]);
        });
      }
    } else if (--e.cd <= 0 && sees) {
      e.telegraph = 26;
      Sfx.telegraph();
    }
  } else {
    e.state = 'patrulla';
    moveActor(e, e.dir * e.speed, e.vy, { oneway: false });
    const probeX = e.dir > 0 ? e.x + e.w + 3 : e.x - 3;
    if (e.hitWall || (e.onGround && !groundAhead(probeX, e.y + e.h + 3))) e.dir *= -1;
    e.anim += 0.11;
  }
}

/* ─────────────────────────────── Troyano
   Acorazado y lento. El escudo frontal aguanta casi todo, así que hay que
   rodearlo. Al reventar libera la carga que traía adentro. */

export function troyano(e, dx, dy, dist) {
  e.vy = Math.min(e.vy + 0.55, 11);
  const sees = dist < 240 && Math.abs(dy) < 80;
  if (sees) e.aggro = 220;
  e.dir = e.aggro > 0 ? (dx > 0 ? 1 : -1) : e.dir;

  const wounded = e.hp < e.maxHp * 0.45;
  if (e.charge > 0) {
    e.charge--;
    moveActor(e, e.dir * e.speed * 3.4, e.vy, { oneway: false });
    if (e.t % 4 === 0) FX.dust(e.x + e.w / 2, e.y + e.h, G.theme.fog, 1, 1.1);
    if (e.hitWall) e.charge = 0;
    return;
  }

  if (e.aggro > 0) {
    const approach = Math.abs(dx) > 90 ? e.dir * e.speed : 0;
    moveActor(e, approach, e.vy, { oneway: false });

    if (e.telegraph > 0) {
      if (--e.telegraph === 0) {
        if (wounded && Math.abs(dx) > 70) { e.charge = 42; }
        else {
          /* abanico de cuatro con un hueco en el medio, y por ese hueco, un
             rato después, el rosado. Antes el rosado iba en el centro del
             abanico, en el mismo cuadro que dos normales a 8 grados: imposible */
          for (const i of [-2, -1, 1, 2]) {
            const a = Math.atan2(dy, dx) + i * 0.2;
            spawnEBullet(e.x + e.w / 2 + e.dir * 10, e.y + 13,
              Math.cos(a) * 3.1, Math.sin(a) * 3.1, { size: 4.4, heavy: true });
          }
          queueShot(e, PINK_GAP, () => {
            const mx = e.x + e.w / 2 + e.dir * 10, my = e.y + 13;
            const pa = aimAt(mx, my);
            spawnEBullet(mx, my, Math.cos(pa) * 3.1, Math.sin(pa) * 3.1, { size: 5, corrupt: true });
            FX.spark(mx, my, '#ff6ec7', 5, 2);
          });
          FX.spark(e.x + e.w / 2 + e.dir * 14, e.y + 13, '#ffc27a', 7, 2.4);
          FX.shake(1.6);
        }
        e.cd = rnd(105, 150);
      }
    } else if (--e.cd <= 0) {
      e.telegraph = 34;
      Sfx.telegraph();
    }
  } else {
    moveActor(e, e.dir * e.speed * 0.7, e.vy, { oneway: false });
    const probeX = e.dir > 0 ? e.x + e.w + 3 : e.x - 3;
    if (e.hitWall || (e.onGround && !groundAhead(probeX, e.y + e.h + 3))) e.dir *= -1;
  }
  e.anim += Math.abs(e.vx) * 0.1 + 0.02;
}

/** La carga del troyano: lo llama combat.js al matarlo. */
export function spillTrojan(e) {
  const n = rndi(3, 5);
  for (let i = 0; i < n; i++) {
    const b = spawnEnemy('bicho', e.x + e.w / 2 - 4 + rnd(-8, 8), e.y + e.h);
    b.vy = rnd(-4.2, -2);
    b.vx = rnd(-1.8, 1.8);
    b.dir = b.vx > 0 ? 1 : -1;
    G.enemies.push(b);
  }
  FX.pop(e.x + e.w / 2, e.y + e.h / 2, '#9fe86a', 22, { life: 14, points: 8 });
}

/* ─────────────────────────────── Keylogger
   Una máquina de escribir agarrada de una superficie —suelo o techo— que
   patrulla hasta tenerte a tiro.

   Antes dejaba teclas quietas por donde pasaba: como iba y venía por la misma
   línea, el rastro terminaba siendo un charco que se saltaba de una y el bicho
   no pedía nada a cambio. Ahora hace lo que dice el expediente. Te ve, frena y
   TECLEA: cada golpe deja una tecla a la vista sobre el rodillo, y ése es el
   aviso —tres golpes, medio segundo, tiempo de sobra para cortarle la línea o
   matarlo—. Cuando el renglón se llena suena la campanilla y lo TRANSMITE
   entero, apuntado, con el rosado al final como todos.

   Lo que registra es lo que te manda: por eso las teclas que vuelan llevan una
   letra, y por eso no puede seguir caminando mientras escribe. */

const LOG_KEYS = 3;                              // cuántas teclas anota por renglón
const KEY_CHARS = 'QWERTYUIOPASDFGHJKLZXCVBNM';  // lo que "leyó" del teclado

export function keylogger(e, dx, dy, dist) {
  const s = e.surface;                       // 1 = suelo, -1 = techo
  e.seg += e.speed * 0.42;
  if (e.strike > 0) e.strike--;
  if (e.ring > 0) e.ring--;

  const sees = dist < 300 && Math.abs(dy) < 150;
  if (sees) e.aggro = 120; else if (e.aggro > 0) e.aggro--;

  /* mientras escribe o transmite no se mueve: el renglón es un compromiso */
  const busy = e.state === 'registro' || e.burst > 0;

  if (!busy) {
    const step = e.dir * e.speed;
    moveActor(e, step, 0, { oneway: false });

    /* ¿sigue habiendo superficie adelante? si no, o si choca, da la vuelta */
    const aheadX = e.dir > 0 ? e.x + e.w + 3 : e.x - 3;
    const probeY = s > 0 ? e.y + e.h + 4 : e.y - 4;
    if (e.hitWall || !rectHitsSolid(aheadX - 1, probeY - 1, 2, 2)) e.dir *= -1;
  }

  /* se despega si le sacaron el piso de abajo (o el techo de arriba) */
  const under = rectHitsSolid(e.x + 2, s > 0 ? e.y + e.h + 1 : e.y - 3, e.w - 4, 2);
  if (!under) {
    e.vy = Math.min(e.vy + 0.55 * s, 11);
    moveActor(e, 0, e.vy, { oneway: false });
    if (e.onGround) e.vy = 0;
  } else e.vy = 0;

  /* la boca del carro: por donde sale el renglón, del lado que mira */
  const mx = () => e.x + e.w / 2 + e.dir * 9;
  const my = () => e.y + e.h / 2 + s * 2;

  if (e.state === 'registro') {
    e.dir = dx > 0 ? 1 : -1;                 // se acomoda mientras escribe
    if (--e.typeT <= 0) {
      e.typeT = 13;
      e.strike = 8;
      e.log.push(KEY_CHARS[rndi(0, KEY_CHARS.length - 1)]);
      Sfx.keystroke();
      FX.spark(mx(), my(), '#c9a0ff', 2, 1.2, [4, 9]);

      if (e.log.length >= LOG_KEYS) {
        /* campanilla: el renglón está lleno y se va entero */
        e.state = 'transmite';
        e.burst = LOG_KEYS - 1;              // el último sale rosado, aparte
        e.burstCd = 0;
        e.typeT = 0;                         // pasa a contar la espera del rosado
        e.ring = 18;
        Sfx.bell();
      }
    }
    return;
  }

  if (e.burst > 0) {
    if (--e.burstCd <= 0) {
      e.burstCd = 10;
      e.burst--;
      fireKey(e, e.log.shift(), false);

      /* el rosado sale aparte, PINK_GAP después del último normal */
      if (e.burst === 0) queueShot(e, PINK_GAP, () => {
        fireKey(e, e.log.shift() || KEY_CHARS[0], true);
        e.state = 'patrulla';
        e.cd = rnd(120, 190);
      });
    }
    return;
  }

  /* esperando el rosado, que sale de la cola PINK_GAP cuadros después. La
     cola no corre fuera de cuadro, así que acá hay un tope: sin él, un
     keylogger al que se le pierde el disparo encolado se queda escribiendo
     para siempre y deja de ser un enemigo. */
  if (e.state === 'transmite') {
    if (++e.typeT > 120) { e.state = 'patrulla'; e.cd = rnd(90, 150); e.log.length = 0; }
    return;
  }

  if (--e.cd <= 0 && sees) {
    e.state = 'registro';
    e.log.length = 0;
    e.typeT = 12;
    Sfx.telegraph();
  }
}

/** Una tecla transmitida: apunta al salir, no al escribirse. */
function fireKey(e, ch, corrupt) {
  const s = e.surface;
  const x = e.x + e.w / 2 + e.dir * 9, y = e.y + e.h / 2 + s * 2;
  const a = aimAt(x, y) + rnd(-0.045, 0.045);
  const sp = corrupt ? 3.1 : 3.4;
  spawnEBullet(x, y, Math.cos(a) * sp, Math.sin(a) * sp,
    { size: 6, life: 220, key: true, letter: ch, corrupt, color: '#c9a0ff' });
  FX.spark(x, y, corrupt ? '#ff6ec7' : '#c9a0ff', 4, 1.8, [4, 11]);
}

/* ─────────────────────────────── Worm
   Cae, y si lo dejás tocar el suelo y quedarse un rato, se parte en dos.
   Es un reloj: o lo matás rápido o el problema se multiplica. */

export function gusano(e, dx, dy, dist) {
  e.vy = Math.min(e.vy + 0.5, 10);
  const toward = Math.sign(dx) || e.dir;
  e.dir = toward;
  moveActor(e, toward * e.speed, e.vy, { oneway: false });
  e.anim += 0.2;

  if (!e.onGround) { e.split = Math.max(e.split, 90); return; }

  if (--e.split <= 0) {
    const alive = G.enemies.reduce((n, o) => n + (!o.dead && o.type === 'gusano' ? 1 : 0), 0);
    if (alive < MAX_WORMS && e.gen < 3) {
      const child = spawnEnemy('gusano', e.x, e.y + e.h);
      child.gen = e.gen + 1;
      child.hp = child.maxHp = Math.max(2, e.maxHp - 1);
      child.vy = -4.4;
      child.vx = -e.dir * 1.6;
      child.split = 170;
      G.enemies.push(child);
      FX.pop(e.x + e.w / 2, e.y + e.h / 2, '#9fe86a', 16, { life: 12, points: 6 });
      FX.puff(e.x + e.w / 2, e.y + e.h / 2, '#6fae52', 3, { size: [2, 4], life: [14, 24], alpha: 0.7 });
      Sfx.split();
    }
    e.split = 170;
  }
}

/* ─────────────────────────────── Bicho (carga del troyano) */

export function bicho(e, dx, dy, dist) {
  e.vy = Math.min(e.vy + 0.55, 11);
  e.dir = Math.sign(dx) || e.dir;
  const run = dist < 200 ? e.dir * e.speed : e.dir * e.speed * 0.5;
  moveActor(e, run, e.vy, { oneway: false });
  e.anim += 0.34;

  const probeX = e.dir > 0 ? e.x + e.w + 2 : e.x - 2;
  if (e.hitWall) e.dir *= -1;
  /* salta los pozos chicos en vez de tirarse: si no, se suicidan todos solos */
  if (e.onGround && !groundAhead(probeX, e.y + e.h + 3)) e.vy = -5.2;
}

