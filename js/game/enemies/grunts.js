/* La tropa: spambot, troyano, gusano y el bicho que sale del troyano. Son los
   que llenan un sector — patrullan, telegrafían y disparan— y están juntos
   porque comparten la misma silueta de comportamiento: caminan, miran, avisan y
   tiran. Lo que se aprende con uno sirve para los otros.

   El Keylogger vivía acá y se mudó a enemies/keylogger.js: dejó de compartir esa
   silueta el día que lo suyo pasó a ser leer al jugador en vez de apuntarle. */

import { G } from '../state.js';
import { moveActor, groundAhead, rectHitsSolid, safeStepX, canLand } from '../world.js';
import { PINK_GAP } from '../../config.js';
import { spawnEBullet } from '../projectiles.js';
import * as FX from '../fx.js';
import { Sfx } from '../../audio.js';
import { rnd } from '../../util.js';
import { spawnEnemy } from './spawn.js';
import { queueShot, aimAt } from './shared.js';

const MAX_WORMS = 9;   // techo global: un gusano sin control no puede colgar el nivel
const BICHO_SALTO = 26;  // hasta dónde llega su brinco: poco más de un tile

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

/**
 * La boca del cañón, en coordenadas del mundo. La comparten la IA y el dibujo a
 * propósito: si el disparo saliera de un lugar y el caño se viera en otro, el
 * escudo dejaría de explicar por qué hay que rodearlo. Es la misma razón por la
 * que Bit tiene su `muzzlePoint` compartido con el aparejo del brazo.
 */
export const troyanoMuzzle = e => ({
  x: e.x + e.w / 2 + e.dir * 24,
  y: e.y + e.h - 30,
});

export function troyano(e, dx, dy, dist) {
  e.vy = Math.min(e.vy + 0.55, 11);
  const sees = dist < 240 && Math.abs(dy) < 80;
  if (sees) e.aggro = 220;
  e.dir = e.aggro > 0 ? (dx > 0 ? 1 : -1) : e.dir;

  const wounded = e.hp < e.maxHp * 0.45;
  if (e.charge > 0) {
    e.charge--;
    /* la embestida frena en el borde igual que contra una pared: una tonelada
       de chapa lanzada a un pozo es una tonelada de chapa que ya no está */
    const embiste = safeStepX(e, e.dir * e.speed * 3.4);
    moveActor(e, embiste, e.vy, { oneway: false });
    if (e.t % 4 === 0) FX.dust(e.x + e.w / 2, e.y + e.h, G.theme.fog, 1, 1.1);
    if (e.hitWall || embiste === 0) e.charge = 0;
    return;
  }

  if (e.aggro > 0) {
    const approach = Math.abs(dx) > 90 ? e.dir * e.speed : 0;
    moveActor(e, safeStepX(e, approach), e.vy, { oneway: false });

    if (e.telegraph > 0) {
      if (--e.telegraph === 0) {
        if (wounded && Math.abs(dx) > 70) { e.charge = 42; }
        else {
          /* abanico de cuatro con un hueco en el medio, y por ese hueco, un
             rato después, el rosado. Antes el rosado iba en el centro del
             abanico, en el mismo cuadro que dos normales a 8 grados: imposible */
          const boca = troyanoMuzzle(e);
          for (const i of [-2, -1, 1, 2]) {
            const a = Math.atan2(dy, dx) + i * 0.2;
            spawnEBullet(boca.x, boca.y,
              Math.cos(a) * 3.1, Math.sin(a) * 3.1, { size: 4.4, heavy: true });
          }
          queueShot(e, PINK_GAP, () => {
            const b = troyanoMuzzle(e);
            const pa = aimAt(b.x, b.y);
            spawnEBullet(b.x, b.y, Math.cos(pa) * 3.1, Math.sin(pa) * 3.1, { size: 5, corrupt: true });
            FX.spark(b.x, b.y, '#ff6ec7', 5, 2);
          });
          FX.spark(boca.x + e.dir * 5, boca.y, '#ffc27a', 7, 2.4);
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

/* Lo que el caballo trae adentro, en el orden en que desembarca: de atrás hacia
   adelante, así el último en salir es el que queda más cerca de Bit.

   Son tres procesos enteros y no una nube de bichos porque el troyano nunca fue
   un enemigo: es un transporte. Lo que importa de él no es pelearlo, es dónde lo
   abrís — y por eso ahora se lo ve venir de lejos y se lo ve por dentro: las
   tres ventanillas del costado muestran quién viene (ver el dibujo).

   Tocar esta lista es toda la perilla de dificultad que tiene. */
const CARGA = ['keylogger', 'gusano', 'ransomware'];
const CARGA_COLOR = { keylogger: '#c9a0ff', gusano: '#9fe86a', ransomware: '#6ce8ff' };

/** La carga del troyano: lo llama combat.js al matarlo. */
export function spillTrojan(e) {
  const cx = e.x + e.w / 2, feet = e.y + e.h;

  for (const [i, tipo] of CARGA.entries()) {
    const off = (i - (CARGA.length - 1) / 2) * 17;
    const o = spawnEnemy(tipo, cx + off, feet);

    /* spawnEnemy planta por el borde izquierdo; acá lo que se quiere es que cada
       pasajero quede centrado en su hueco. El `homeX` va con él: el ransomware
       flota alrededor de ese punto, y si se corre uno sin el otro queda derivando
       hacia donde nunca estuvo. */
    const shift = -o.w / 2;
    o.x += shift;
    if (o.homeX !== undefined) o.homeX += shift;

    /* Si el hueco está tapado, sale por el centro del propio caballo: ese lugar
       estaba libre hace un cuadro —lo ocupaba él— así que siempre hay sitio. */
    if (rectHitsSolid(o.x, o.y, o.w, o.h)) {
      const dx2 = cx - o.w / 2 - o.x;
      o.x += dx2;
      if (o.homeX !== undefined) o.homeX += dx2;
      if (rectHitsSolid(o.x, o.y, o.w, o.h)) continue;   // ni así: se queda adentro
    }

    /* un empujón hacia afuera, para que se lea el desembarco y no una aparición */
    o.vy = rnd(-3.6, -2);
    o.dir = off >= 0 ? 1 : -1;
    G.enemies.push(o);

    const ox = o.x + o.w / 2, oy = o.y + o.h / 2;
    FX.ring(ox, oy, 30, CARGA_COLOR[tipo] || '#e8e0cc', { life: 20, width: 2.2, alpha: 0.9 });
    FX.spark(ox, oy, CARGA_COLOR[tipo] || '#e8e0cc', 10, 2.6, [10, 22]);
  }

  /* el caballo se abre: astillas, polvo y un golpe que se siente */
  FX.debris(cx, feet - 26, '#b0763a', 16, 3.4);
  FX.pop(cx, feet - 26, '#e8c08a', 30, { life: 16, points: 9 });
  FX.shake(6);
}

/* ─────────────────────────────── Worm
   Cae, y si lo dejás tocar el suelo y quedarse un rato, se parte en dos.
   Es un reloj: o lo matás rápido o el problema se multiplica. */

export function gusano(e, dx, dy, dist) {
  e.vy = Math.min(e.vy + 0.5, 10);
  const toward = Math.sign(dx) || e.dir;
  e.dir = toward;
  /* Va derecho a vos y no mira por dónde pisa —es un gusano—, pero frena en el
     borde. Sin esto era el que más se perdía: como sigue a Bit sin importarle el
     terreno, alcanzaba con pararse del otro lado de un pozo para que se tirara
     solo, y cada uno perdido se quedaba con un lugar del cupo de MAX_WORMS. */
  moveActor(e, safeStepX(e, toward * e.speed), e.vy, { oneway: false });
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
  moveActor(e, safeStepX(e, run), e.vy, { oneway: false });
  e.anim += 0.34;

  const probeX = e.dir > 0 ? e.x + e.w + 2 : e.x - 2;
  if (e.hitWall) e.dir *= -1;
  /* Salta los pozos chicos en vez de tirarse. Pero sólo los que puede cruzar: el
     impulso da para poco más de un tile, y antes saltaba cualquier hueco — los
     anchos se lo tragaban igual, sólo que en el aire. Si del otro lado no hay
     dónde caer se queda en el borde, que es lo que hace cualquier bicho. */
  if (e.onGround && !groundAhead(probeX, e.y + e.h + 3) && canLand(e, e.dir, BICHO_SALTO)) {
    e.vy = -5.2;
  }
}

