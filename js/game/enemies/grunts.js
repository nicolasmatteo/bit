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
   Ciempiés que camina pegado a una superficie — suelo o techo — y va dejando
   las teclas que registra flotando detrás suyo. Las teclas duelen y duran poco:
   lo que hacen es cerrarte el camino por donde acaba de pasar. */

export function keylogger(e, dx, dy, dist) {
  const s = e.surface;                       // 1 = suelo, -1 = techo
  e.seg += e.speed * 0.42;

  /* pegado a la superficie: no cae, se desliza */
  const step = e.dir * e.speed;
  moveActor(e, step, 0, { oneway: false });

  /* ¿sigue habiendo superficie adelante? si no, o si choca, da la vuelta */
  const aheadX = e.dir > 0 ? e.x + e.w + 3 : e.x - 3;
  const probeY = s > 0 ? e.y + e.h + 4 : e.y - 4;
  const supported = rectHitsSolid(aheadX - 1, probeY - 1, 2, 2);
  if (e.hitWall || !supported) e.dir *= -1;

  /* se despega si le sacaron el piso de abajo (o el techo de arriba) */
  const under = rectHitsSolid(e.x + 2, s > 0 ? e.y + e.h + 1 : e.y - 3, e.w - 4, 2);
  if (!under) {
    e.vy = Math.min(e.vy + 0.55 * s, 11);
    moveActor(e, 0, e.vy, { oneway: false });
    if (e.onGround) e.vy = 0;
  } else e.vy = 0;

  /* rastro de teclas: quietas, breves, y sólo cuando hay alguien cerca */
  if (dist < 260 && e.t % 16 === 0) {
    spawnEBullet(e.x + e.w / 2, e.y + e.h / 2, 0, 0,
      { size: 8, life: 130, key: true, color: '#c9a0ff' });
  }
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

