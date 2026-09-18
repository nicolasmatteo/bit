/* Daño y muerte. Punto único para que jugador, enemigos y proyectiles
   no tengan que conocerse entre sí. */

import { G, P } from './state.js';
import { aabb, rnd, pick } from '../util.js';
import * as FX from './fx.js';
import { Sfx } from '../audio.js';
import { DROP_POOL } from '../data/weapons.js';
import { spillTrojan, surface, spawnEnemy, splitImplante, endCopias, shieldHit } from './enemies.js';
import { dropLock } from './world.js';

export function damagePlayer(amount, fromX = null) {
  if (P.invuln > 0 || P.dead || G.mode !== 'play') return;
  P.hp -= amount;
  P.invuln = 72;
  P.hurtT = 22;      // dispara el clip de golpe; se apaga solo en updatePlayer
  FX.shake(7);
  FX.flash(5, '#ff5a46');
  FX.spark(P.x + P.w / 2, P.y + P.h / 2, G.theme.hostile, 14, 3.2);
  const away = fromX === null ? -P.face : (P.x + P.w / 2 < fromX ? -1 : 1);
  P.vx = away * 3.1;
  P.vy = -3.2;
  Sfx.hurt();
  if (P.hp <= 0) killPlayer();
}

export function killPlayer() {
  if (P.dead) return;
  P.dead = true;
  P.hp = 0;
  G.mode = 'dying';
  G.stateT = 0;
  G.stats.deaths++;
  G.slowmo = 34;
  FX.fireball(P.x + P.w / 2, P.y + P.h / 2, 26);
  FX.ring(P.x + P.w / 2, P.y + P.h / 2, 60, G.theme.accent, { life: 30, width: 3 });
  FX.shake(12);
  FX.flash(8, '#ffffff');
  Sfx.boom();
}

/**
 * Devuelve si el golpe entró de verdad. Lo único que mira ese dato es la Purga,
 * que se carga disparando: si un escudo contara, un bot intocable sería una
 * fuente infinita de medidor.
 */
export function damageEnemy(e, amount, fromX = null) {
  if (e.dead) return false;

  /* Un bot enganchado a un C2 vivo no recibe daño: el aguante le baja por el
     cable. No es que cueste más, es que no entra — gastarle balas es tiempo
     regalado. El único blanco que sirve está del otro lado del cable. */
  if (e.c2 && !e.c2.dead) { shieldHit(e); return false; }

  // al ransomware con la combinación casi rota se le entra al doble: es la
  // recompensa por haber sostenido el fuego en vez de cambiar de objetivo
  if (e.type === 'ransomware' && e.hp <= e.maxHp * 0.3) amount *= 2;
  // y al Implante, por haber encontrado al de verdad entre las copias
  if (e.type === 'implante' && e.copiaT > 0) amount *= 2;
  e.hp -= amount;
  e.hit = 7;
  e.aggro = 240;
  FX.spark(e.x + e.w / 2, e.y + e.h / 2, '#ffe6a8', 4, 2.4, [8, 18]);
  if (fromX !== null && e.knockback !== false) e.x += (e.x + e.w / 2 < fromX ? -1 : 1) * 0.8;
  if (e.hp <= 0) { killEnemy(e); return true; }

  /* El Implante se copia al cruzar dos tercios y un tercio de integridad. Va
     acá y no en su IA porque el único que sabe cuánta vida le quedó después de
     un golpe es quien se lo dio — desde la IA habría que preguntarlo cada
     cuadro para enterarse tarde. */
  if (e.type === 'implante') {
    if (e.copiaT > 0) endCopias(e);            // lo encontraste: se acabó el acertijo
    const umbral = [0.66, 0.33][e.splits];
    if (umbral !== undefined && e.hp <= e.maxHp * umbral) {
      e.splits++;
      splitImplante(e);
    }
  }
  return true;
}

export function killEnemy(e) {
  e.dead = true;
  /* Ni una ventana, ni una copia, ni un eco son procesos hostiles: son cosas que
     el enemigo puso en la pantalla. Romperlas no cuenta como baja. */
  const fantasma = e.type === 'ventana' || e.type === 'copia' || e.type === 'eco';
  if (!fantasma) G.stats.kills++;
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2;

  /* El eco es una grabación: cortarla la apaga y nada más. No suelta nada, y por
     eso matarlo es sólo sacárselo de encima antes de tiempo, no un premio. */
  if (e.type === 'eco') {
    FX.pop(cx, cy, '#c9a0ff', 20, { life: 14, points: 6, core: '#e9d8ff' });
    FX.spark(cx, cy, '#8a77a6', 9, 2.4);
    Sfx.kill();
    return;
  }

  /* la copia se apaga y ya: equivocarse cuesta tiempo, no vida */
  if (e.type === 'copia') {
    FX.pop(cx, cy, '#9fe8ff', 22, { life: 14, points: 7, core: '#ffffff' });
    FX.spark(cx, cy, '#d8f4ff', 10, 2.4);
    Sfx.kill();
    return;
  }

  /* Un ransomware muerto suelta lo que tenía cifrado. Va acá y no en su IA
     porque a un enemigo muerto ya no se le corre la IA: si el piso volviera
     desde ahí, no volvería nunca. */
  const held = dropLock(e);
  if (held) {
    FX.ring(held.x + held.w / 2, held.y + held.h / 2, 90, '#6ce8ff',
            { life: 30, width: 3, alpha: 0.9 });
    FX.flash(4, '#6ce8ff');
  }

  if (e.boss) {
    if (e.type === 'implante') endCopias(e);   // no quedan copias de algo que ya no está
    G.gravMul = 1;                 // si cayó con el pozo abierto, la arena vuelve a la normalidad
    G.slowmo = 90;
    FX.shake(14); FX.flash(10, '#ffffff');
    for (let i = 0; i < 12; i++) {
      setTimeout(() => FX.fireball(e.x + rnd(6, e.w - 6), e.y + rnd(6, e.h - 6), rnd(20, 34)), i * 110);
    }
    Sfx.boom();
    return;
  }

  /* el troyano no muere: se abre y suelta lo que traía adentro */
  if (e.type === 'troyano') spillTrojan(e);

  /* Lo que tenía un Rootkit adentro lo escupe al caer. Es el premio por haber
     leído el aviso —el latido violeta— y el castigo por no haberlo leído. */
  if (e.infected && !e.infected.dead) {
    FX.ring(cx, cy, 50, '#b98cff', { life: 24, width: 3, alpha: 0.95 });
    surface(e.infected);
  }

  /* Las ventanas del Adware pagan según lo que eran: la del premio deja algo,
     la trampa suelta un bicho. Se decide acá y no en su IA porque a una
     ventana muerta ya no se le corre la IA. */
  if (e.type === 'ventana') {
    FX.debris(cx, cy, '#e8e0cc', 10, 2.6);
    if (e.kind === 'premio') {
      dropPickup(cx, cy, Math.random() < 0.5 ? 'vida' : 'arma');
    } else {
      const b = spawnEnemy('bicho', cx - 5, cy + 7);
      b.vy = -3.2; b.vx = rnd(-1.6, 1.6);
      G.enemies.push(b);
    }
    Sfx.kill();
    return;
  }

  /* El C2 cae y se lleva a su botnet entera en el mismo cuadro. No es un extra:
     es la única forma de matar a esos bots, porque mientras el servidor estaba
     en pie eran intocables. Se apagan de golpe, sin daño de por medio —por eso
     la vida se pone en cero a mano y no restando— y el corte de corriente se
     lee desde lejos: un anillo por cada uno y un temblor corto. */
  if (e.type === 'botnet' && e.links) {
    for (const bot of e.links) {
      if (bot.dead) continue;
      bot.hp = 0;
      bot.shield = 0;
      FX.ring(bot.x + bot.w / 2, bot.y + bot.h / 2, 24, G.theme.hostile, { life: 18, width: 2, alpha: 0.8 });
      killEnemy(bot);
    }
    if (e.links.length) FX.shake(4);
  }

  /* el exfiltrador suelta lo que se llevó, desparramado para que haya que
     juntarlo — perseguirlo tiene que valer la pena, pero no ser gratis */
  if (e.type === 'exfil' && e.stolen > 0) {
    for (let i = 0; i < e.stolen; i++) {
      G.pickups.push({
        kind: 'fragmento', w: 11, h: 11,
        x: cx - 5.5 + (i - (e.stolen - 1) / 2) * 16, y: cy - 14,
        t: rnd(0, 6.28), taken: false, fresh: 20,
      });
    }
  }

  const heavy = e.type === 'troyano' || e.type === 'ransomware';
  const tiny = e.type === 'bicho';
  FX.fireball(cx, cy, heavy ? 22 : tiny ? 9 : 15);
  FX.debris(cx, cy, '#2a3138', heavy ? 10 : tiny ? 3 : 6, 2.8);
  FX.shake(heavy ? 5 : tiny ? 1 : 2.5);
  Sfx.kill();

  if (tiny) return;               // los bichos no sueltan nada: vienen de a montones
  if (Math.random() < (heavy ? 0.7 : 0.16)) dropPickup(cx, cy, Math.random() < 0.6 ? 'vida' : 'arma');
}

export function damageCrate(box, amount) {
  if (box.dead) return;
  box.hp -= amount;
  box.hit = 6;
  FX.debris(box.x + box.w / 2, box.y + 4, '#6b5334', 3, 1.8);
  if (box.hp > 0) return;

  box.dead = true;
  FX.debris(box.x + box.w / 2, box.y + box.h / 2, '#7d5f38', 14, 3.2);
  FX.smoke(box.x + box.w / 2, box.y + box.h / 2, '#4a3a28', 4, { alpha: 0.3 });
  FX.shake(2);
  Sfx.kill();
  const roll = Math.random();
  if (roll < 0.34) dropPickup(box.x + box.w / 2, box.y + box.h / 2, 'vida');
  else if (roll < 0.58) dropPickup(box.x + box.w / 2, box.y + box.h / 2, 'arma');
}

function dropPickup(cx, cy, kind) {
  const size = kind === 'vida' ? [15, 13] : [17, 15];
  G.pickups.push({
    kind, w: size[0], h: size[1],
    x: cx - size[0] / 2, y: cy - size[1] / 2,
    t: 0, taken: false, fresh: 30,
  });
}

/**
 * Explosión con radio. hits: 'player' daña enemigos, 'enemy' daña a Bit,
 * 'both' a todos (granadas cerca de uno mismo no hacen amigos).
 */
export function explode(x, y, radius, damage, hits = 'player') {
  FX.fireball(x, y, radius);
  FX.shake(radius * 0.2);
  FX.flash(4, '#ffc07a');
  Sfx.boom();

  const box = { x: x - radius, y: y - radius, w: radius * 2, h: radius * 2 };
  if (hits === 'player' || hits === 'both') {
    for (const e of G.enemies) if (!e.dead && aabb(box, e)) damageEnemy(e, damage, x);
    for (const b of G.crates) if (!b.dead && aabb(box, b)) damageCrate(b, damage);
  }
  /* A Bit una explosión le saca 2, sea propia o ajena. Antes la propia se
     calculaba como daño-6, y la granada (9) terminaba sacando 3 de 6 de vida:
     media barra por un error de puntería, más castigo que cualquier enemigo. */
  if ((hits === 'enemy' || hits === 'both') && !P.dead && aabb(box, P)) {
    damagePlayer(2, x);
  }
}

export function randomWeapon() { return pick(DROP_POOL); }
