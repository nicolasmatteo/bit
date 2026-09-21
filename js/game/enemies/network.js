/* Los tres que no pelean solos: el servidor C2, que sincroniza a los spambots;
   el Man-in-the-Middle, que devuelve lo que le tirás de frente; y el
   exfiltrador, que no va por tu vida sino por tu progreso.

   Están juntos porque los tres atacan a la relación entre las cosas y no a Bit:
   uno coordina, otro intercepta, el otro roba y escapa. */

import { G, P } from '../state.js';
import { moveActor, groundAhead, rectHitsSolid, safeStepX, canLand } from '../world.js';
import { spawnEBullet } from '../projectiles.js';
import { damagePlayer } from '../combat.js';
import * as FX from '../fx.js';
import { Sfx } from '../../audio.js';
import { aabb, rnd, clamp } from '../../util.js';

/* ─────────────────────────────── Botnet (servidor C2)
   No dispara nunca. Lo que hace es sincronizar: cada tanto manda la orden por
   los cables y todos los spambots enganchados telegrafían a la vez. Solos son
   ráfagas que se esquivan de a una; coordinados, son una pared.

   Enseña a elegir blanco, y no a medias: por el cable no baja sólo la orden,
   baja también el aguante. Mientras el C2 esté en pie sus bots no reciben ni un
   punto de daño (ver damageEnemy), y en cuanto cae se apagan todos juntos, en
   el mismo cuadro (ver killEnemy). No hay camino largo: o el servidor, o nada. */

const C2_RANGE = 260;         // radio en el que engancha spambots
const C2_ORDER = 210;         // cuadros entre órdenes
export const C2_WARN = 36;    // el pulso viaja por el cable antes de que disparen
export const C2_SHIELD = 14;  // cuadros que dura el destello del tiro rebotado
export const SHIELD_COLOR = '#6ce8ff';

/**
 * Engancha a los spambots que tenga en rango. Se llama al terminar de armar el
 * nivel y ya no la primera vez que corre la IA: fuera de cuadro la IA no corre,
 * y un bot cuyo cable todavía no existe es un bot que se puede matar a tiros —
 * justo lo que el blindaje viene a impedir.
 */
export function linkBots(e) {
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
  e.links = G.enemies.filter(o => o.type === 'spambot' && !o.dead && !o.c2 &&
    Math.hypot(o.x + o.w / 2 - cx, o.y + o.h / 2 - cy) < C2_RANGE);
  for (const o of e.links) o.c2 = e;
  e.cd = rnd(90, 140);
}

/**
 * Un tiro que pegó en un bot enganchado. No entra. El destello sale del bot,
 * pero lo que se enciende es el cable entero hasta el servidor: lo que hay que
 * leer no es el golpe, es de dónde le viene el aguante.
 */
export function shieldHit(bot) {
  /* el sonido va sólo en el primer impacto de la tanda: con un arma rápida —o
     con la purga, que le pega a todos de una— un rechazo por bala se vuelve un
     ruido continuo que no dice nada. El destello sí va en cada uno. */
  const first = bot.shield === 0;
  bot.shield = C2_SHIELD;
  bot.aggro = Math.max(bot.aggro, 180);
  const bx = bot.x + bot.w / 2, by = bot.y + bot.h / 2;
  FX.ring(bx, by, 17, SHIELD_COLOR, { life: 13, width: 2, alpha: 0.9 });
  FX.spark(bx, by, SHIELD_COLOR, 5, 2.2, [8, 16]);
  if (first) Sfx.shielded();
}

export function botnet(e, dx, dy, dist) {
  if (!e.links) linkBots(e);
  e.links = e.links.filter(o => !o.dead);
  if (e.pulse > 0 && --e.pulse === 0) commandBots(e);

  const sees = dist < 320;
  if (sees) e.aggro = 160;
  if (e.aggro > 0 && e.links.length && e.pulse === 0 && --e.cd <= 0) {
    e.pulse = C2_WARN;
    e.cd = C2_ORDER;
    Sfx.telegraph();
  }
}

/** La orden llegó: todos los bots enganchados arrancan su telegrafía juntos. */
function commandBots(e) {
  for (const o of e.links) {
    if (o.telegraph > 0 || o.burst > 0) continue;
    o.aggro = Math.max(o.aggro, 150);
    o.telegraph = 26;
  }
  FX.ring(e.x + e.w / 2, e.y + 6, 30, G.theme.hostile, { life: 16, width: 2, alpha: 0.8 });
}

/* ─────────────────────────────── Man-in-the-Middle
   Flota entre vos y el enemigo más cercano, mirándote de frente, y todo lo
   que le tirás de frente te lo devuelve (ver projectiles.js). Por detrás, por
   arriba o por abajo es blando, y las explosiones no se reflejan. Tarda en
   darse vuelta: saltarle por encima o atravesarlo con el dash es la ventana. */

export function mitm(e, dx, dy, dist) {
  const px = P.x + P.w / 2, py = P.y + P.h / 2;
  if (dist < 300) e.aggro = 200;
  if (e.mirror > 0) e.mirror--;

  let tx, ty;
  if (e.aggro > 0) {
    /* el "medio": entre vos y el enemigo más cercano; si no hay, a tu costado */
    let near = null, best = 320;
    for (const o of G.enemies) {
      if (o === e || o.dead || o.boss || o.type === 'mitm') continue;
      const d = Math.hypot(o.x + o.w / 2 - px, o.y + o.h / 2 - py);
      if (d < best) { best = d; near = o; }
    }
    const side = Math.sign(e.x + e.w / 2 - px) || 1;
    if (near) {
      tx = (px + near.x + near.w / 2) / 2;
      if (Math.abs(tx - px) < 56) tx = px + side * 56;
    } else {
      tx = px + side * 96;
    }
    ty = py - 10 + Math.sin(e.t * 0.06) * 4;
  } else {
    tx = e.x + e.w / 2;
    ty = e.homeY + e.h / 2 + Math.sin(e.t * 0.05) * 3;
  }

  /* se mueve eje por eje y no se mete en la roca: si pudiera esconderse
     adentro de una pared, las balas pegarían en la pared y nunca en él */
  const mx = clamp((tx - (e.x + e.w / 2)) * 0.05, -e.speed, e.speed);
  const my = clamp((ty - (e.y + e.h / 2)) * 0.05, -e.speed, e.speed);
  if (!rectHitsSolid(e.x + mx, e.y, e.w, e.h)) e.x = clamp(e.x + mx, 4, G.mapW - e.w - 4);
  if (!rectHitsSolid(e.x, e.y + my, e.w, e.h)) e.y = clamp(e.y + my, 4, G.mapH - e.h - 4);

  /* darse vuelta cuesta: medio segundo largo mirando para el lado equivocado */
  const want = Math.sign(dx) || e.dir;
  if (want !== e.dir) {
    if (++e.turnT > 34) { e.dir = want; e.turnT = 0; }
  } else e.turnT = 0;
}

/**
 * Llamado desde projectiles.js cuando una bala propia le pega de frente. La
 * devuelve rosa — corrupta — así que también se puede parar con el parry: el
 * enemigo que castiga disparar sin pensar es el mismo que premia el parry.
 */
export function reflectShot(e, b) {
  e.mirror = 10;
  const speed = Math.min(5, Math.hypot(b.vx, b.vy) * 0.7);
  const a = Math.atan2(P.y + P.h / 2 - (b.y + b.h / 2), P.x + P.w / 2 - (b.x + b.w / 2));
  spawnEBullet(b.x + b.w / 2, b.y + b.h / 2, Math.cos(a) * speed, Math.sin(a) * speed,
    { size: 5, corrupt: true });
  FX.pop(b.x + b.w / 2, b.y + b.h / 2, '#9fe8ff', 9, { life: 9, points: 5, core: '#ffffff' });
}

/* ─────────────────────────────── Exfiltrador
   El único enemigo que no va por tu vida sino por tu progreso. Acecha, avisa
   con un agazape y se lanza; si te toca se lleva hasta tres fragmentos y
   escapa más rápido de lo que corrés. Se lo alcanza con el dash o se lo baja a
   tiros antes de que salga de pantalla. */

const EXFIL_STEAL = 3;
const EXFIL_FLEE = 3.1;     // más que runSpeed (2.7): corriendo solo no lo alcanzás
const EXFIL_SALTO = 70;     // lo que cruza de un brinco huyendo
const EXFIL_EMBESTIDA = 84; // lo que avanza una embestida entera

export function exfil(e, dx, dy, dist) {
  e.vy = Math.min(e.vy + 0.55, 11);

  if (e.state === 'huida') {
    moveActor(e, safeStepX(e, e.fleeDir * EXFIL_FLEE), e.vy, { oneway: false });
    e.anim += 0.4;
    const probeX = e.fleeDir > 0 ? e.x + e.w + 2 : e.x - 2;
    if (e.onGround && !groundAhead(probeX, e.y + e.h + 3)) {
      /* Pozo en la ruta de escape: lo salta si del otro lado hay dónde caer, y
         si no se da vuelta y escapa para el otro lado. Tirarse igual sería lo
         peor de los dos mundos — con tus fragmentos adentro, y a un lugar donde
         ya no se lo puede alcanzar ni matar para recuperarlos. */
      if (canLand(e, e.fleeDir, EXFIL_SALTO)) e.vy = -6.2;
      else e.fleeDir = -e.fleeDir;
    }
    if (e.hitWall && e.onGround) e.vy = -7;                              // y paredes bajas
    /* se escapa apenas cruza el borde de la cámara. El margen tiene que ser
       menor que los 90px con los que updateEnemies deja de correr a los que
       están fuera de cuadro: si no, se congelaría justo afuera y nunca huiría */
    const out = e.x + e.w < G.cam.x - 50 || e.x > G.cam.x + G.view.w + 50;
    if (out) {
      e.dead = true;
      e.escaped = true;
      /* Lo que se lleva sale del mundo, así que la cerradura de la salida deja
         de pedirlo: si siguiera pidiendo el total original, un robo consumado
         dejaría el sector sin salida y sin forma de arreglarlo. El robo se paga
         en billetera —esos fragmentos no se cobran nunca— pero jamás en paso.
         Matarlo antes de que cruce el borde los devuelve, y con ellos el
         requisito vuelve a subir. */
      G.stats.shardsTotal = Math.max(G.stats.shards, G.stats.shardsTotal - e.stolen);
    }
    return;
  }

  if (e.lunge > 0) {
    e.lunge--;
    moveActor(e, safeStepX(e, e.dir * 4.2), e.vy, { oneway: false });
    if (!P.dead && P.invuln <= 0 && aabb(P, e)) steal(e, dx);
    else if (e.lunge === 0) e.cd = rnd(70, 110);
    return;
  }

  if (e.telegraph > 0) {
    moveActor(e, 0, e.vy, { oneway: false });
    /* El agazape ya está hecho, pero el salto se decide recién acá: si donde iba
       a caer no hay piso, se lo traga y espera otra. Un ladrón que se tira al
       vacío detrás tuyo no es una amenaza, es un regalo que nunca cobrás. */
    if (--e.telegraph === 0) {
      if (canLand(e, e.dir, EXFIL_EMBESTIDA)) { e.lunge = 20; e.vy = -3.2; }
      else e.cd = rnd(50, 80);
    }
    return;
  }

  const sees = dist < 220 && Math.abs(dy) < 60;
  if (sees) {
    e.state = 'acecho';
    e.dir = Math.sign(dx) || e.dir;
    const creep = Math.abs(dx) > 70 ? e.dir * e.speed : 0;
    moveActor(e, safeStepX(e, creep), e.vy, { oneway: false });
    if (creep) e.anim += 0.14;
    if (--e.cd <= 0 && Math.abs(dx) < 120) { e.telegraph = 24; Sfx.telegraph(); }
  } else {
    e.state = 'patrulla';
    moveActor(e, e.dir * e.speed * 0.6, e.vy, { oneway: false });
    const probeX = e.dir > 0 ? e.x + e.w + 3 : e.x - 3;
    if (e.hitWall || (e.onGround && !groundAhead(probeX, e.y + e.h + 3))) e.dir *= -1;
    e.anim += 0.09;
  }
}

function steal(e, dx) {
  const n = Math.min(EXFIL_STEAL, G.stats.shards);
  e.lunge = 0;
  e.state = 'huida';
  e.fleeDir = -(Math.sign(dx) || e.dir);
  e.dir = e.fleeDir;
  const px = P.x + P.w / 2, py = P.y + P.h / 2;
  if (n === 0) {
    /* no había nada que llevarse: pega igual, pero escapa con las manos vacías */
    damagePlayer(1, e.x + e.w / 2);
    return;
  }
  G.stats.shards -= n;
  e.stolen += n;
  P.invuln = Math.max(P.invuln, 40);
  FX.spark(px, py, G.theme.accent, 10, 2.6, [10, 24]);
  FX.ring(px, py, 26, G.theme.accent, { life: 16, width: 2, alpha: 0.8 });
  Sfx.hurt();
}

