/* Proyectiles: los paquetes de Bit, el fuego hostil y las granadas. */

import { PURGE } from '../config.js';
import { G, P } from './state.js';
import { moveActor, rectHitsSolid } from './world.js';
import { damageEnemy, damageCrate, damagePlayer, explode } from './combat.js';
import { reflectShot } from './enemies.js';
import * as FX from './fx.js';
import { aabb, rnd, rndi } from '../util.js';

/**
 * `ang` es la dirección de salida. Antes no se guardaba y el dibujo asumía que
 * toda bala viajaba en horizontal: al disparar hacia arriba se veía una cápsula
 * acostada subiendo de canto.
 *
 * La caja de colisión ahora también gira con el eje de viaje. Mantiene las
 * mismas dos medidas de siempre (largo y grosor), sólo que asignadas al eje que
 * corresponde, así que el alcance no cambia pero deja de haber balas verticales
 * colisionando de costado.
 */
export function spawnBullet(x, y, vx, vy, w, ang = Math.atan2(vy, vx)) {
  const [len, thick] = w.size;
  const horiz = Math.abs(vx) >= Math.abs(vy);
  const bw = horiz ? len : thick, bh = horiz ? thick : len;
  G.bullets.push({
    x: x - bw / 2, y: y - bh / 2,
    w: bw, h: bh,
    len, rad: thick / 2,
    vx, vy, ang, spin: w.shot === 'pellet' ? rnd(-0.3, 0.3) : 0, rot: 0,
    dmg: w.dmg, color: w.color, core: w.core || '#ffffff', shot: w.shot || 'bolt',
    rocket: !!w.rocket, pierce: !!w.pierce,
    // radio y daño del estallido viajan con el proyectil: así el Blitz del
    // Firewall revienta más fuerte sin que projectiles.js sepa que existe
    blastR: w.radius || 30, blastDmg: Math.max(4, Math.round(w.dmg * 0.9)),
    trailLen: w.trail, trail: [],
    seed: rnd(0, 50), t: 0,
    life: 110, hits: 0,
  });
}

/**
 * `corrupt` marca los paquetes rosados: los únicos que se pueden parar con el
 * parry. Es la regla que hace legible la mecánica — si todo fuera parable, no
 * habría nada que decidir, y si nada lo fuera, el color no significaría nada.
 */
export function spawnEBullet(x, y, vx, vy, opts = {}) {
  const {
    size = 4, color = null, g = 0, bomb = false, heavy = false,
    life = 240, corrupt = false, key = false, popup = false, glyph = false,
  } = opts;
  G.ebullets.push({
    x: x - size / 2, y: y - size / 2, w: size, h: size,
    vx, vy, g, color: corrupt ? '#ff6ec7' : (color || G.theme.hostile),
    bomb, heavy, life, corrupt, key, popup, glyph, t: 0,
    /* semilla fija del paquete. `x` no sirve para sortear nada: cambia todos
       los cuadros porque el paquete vuela. */
    seed: rndi(0, 9973),
  });
}

export function throwGrenade(x, y, vx, vy) {
  G.grenades.push({
    x: x - 3, y: y - 3, w: 6, h: 6, vx, vy,
    t: 0, onGround: false,
    rot: 0, rotV: Math.sign(vx || 1) * 0.26,   // gira mientras vuela, se frena al rodar
  });
}

/**
 * El golpe de una bala. Estrella de tinta del color del arma, una bocanada
 * corta y chispas que salen rebotadas contra la dirección de viaje — no en un
 * círculo parejo, que es lo que hacía antes y se leía como fuego artificial.
 */
function impact(b, x, y, onFlesh) {
  const back = b.ang + Math.PI;
  const r = 5 + b.rad * 1.6 + (b.shot === 'beam' ? 3 : 0);
  FX.pop(x, y, b.color, r, { life: onFlesh ? 10 : 8, points: onFlesh ? 6 : 5, core: b.core });
  FX.spark(x, y, b.core, onFlesh ? 5 : 4, 2.2, [6, 16]);
  FX.puff(x + Math.cos(back) * 2, y + Math.sin(back) * 2, onFlesh ? '#e8c98f' : '#b9a88a', 1,
    { size: [1.2, 2.2], life: [10, 18], alpha: 0.4, rise: -0.2, lw: 0.8 });
}

/**
 * ¿La bala le llega de frente a un enemigo que mira hacia `e.dir`? Tiene que
 * venir mayormente en horizontal: un disparo recto hacia arriba tiene `vx`
 * como 6e-17 por redondeo del coseno, y `Math.sign` de eso da ±1 — o sea, el
 * escudo bloqueaba tiros verticales a cara o cruz.
 */
function headOn(b, e) {
  return Math.abs(b.vx) > Math.abs(b.vy) * 0.5 && Math.sign(b.vx) === -e.dir;
}

/* ------------------------------------------------------------------ */

export function updateProjectiles() {
  const camL = G.cam.x - 120, camR = G.cam.x + G.view.w + 120;

  /* --- paquetes de Bit --- */
  for (let i = G.bullets.length - 1; i >= 0; i--) {
    const b = G.bullets[i];
    if (b.trailLen) {
      b.trail.unshift({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
      if (b.trail.length > b.trailLen) b.trail.pop();
    }
    b.x += b.vx; b.y += b.vy;
    b.life--;
    b.t++;
    if (b.spin) b.rot += b.spin;

    // el cohete deja una estela de bocanadas dibujadas, saliendo por la cola
    if (b.rocket && G.tick % 2 === 0) {
      FX.puff(b.x + b.w / 2 - Math.cos(b.ang) * 6, b.y + b.h / 2 - Math.sin(b.ang) * 6, '#6a6152', 1,
        { size: [1.6, 3], life: [22, 40], alpha: 0.5, rise: -0.1, speed: 0.25, lw: 0.8 });
    }

    let gone = b.life <= 0 || b.x < camL || b.x > camR || b.y < -200 || b.y > G.mapH + 200;

    if (!gone && rectHitsSolid(b.x, b.y, b.w, b.h)) {
      gone = true;
      if (b.rocket) explode(b.x + b.w / 2, b.y + b.h / 2, b.blastR, b.blastDmg, 'player');
      else impact(b, b.x + b.w / 2, b.y + b.h / 2, false);
    }

    if (!gone) {
      for (const c of G.crates) {
        if (c.dead || !aabb(b, c)) continue;
        damageCrate(c, b.dmg);
        if (b.rocket) { explode(b.x, b.y, b.blastR, b.blastDmg, 'player'); gone = true; }
        else if (!b.pierce) gone = true;
        break;
      }
    }

    if (!gone) {
      for (const e of G.enemies) {
        if (e.dead || !aabb(b, e)) continue;
        /* Man-in-the-Middle: lo que le llega de frente vuelve. Las explosiones
           no — el cohete revienta igual — así que el Firewall es su respuesta */
        if (e.type === 'mitm' && !b.rocket && headOn(b, e)) {
          reflectShot(e, b);
          gone = true;
          break;
        }
        /* el troyano bloquea de frente con la plancha del escudo, salvo al
           Escáner: lo perfora, que es justamente lo que lo hace valer algo */
        const blocked = e.type === 'troyano' && !b.pierce && headOn(b, e);
        if (blocked) {
          // el escudo devuelve una estrella fría y blanca: se lee el rebote
          FX.pop(b.x + b.w / 2, b.y + b.h / 2, '#dfe7ee', 8, { life: 9, points: 4, core: '#ffffff' });
          FX.spark(b.x, b.y + b.h / 2, '#dfe7ee', 6, 2.6, [6, 14]);
          damageEnemy(e, Math.max(1, Math.round(b.dmg * 0.25)), b.x);
        } else {
          damageEnemy(e, b.dmg, b.x);
          P.meter = Math.min(PURGE.max, P.meter + PURGE.perHit);   // la Purga se gana disparando
          if (!b.rocket) impact(b, b.x + b.w / 2, b.y + b.h / 2, true);
        }
        if (b.rocket) { explode(b.x, b.y, b.blastR + 2, b.blastDmg + 1, 'player'); gone = true; }
        else if (!b.pierce || ++b.hits > 3) gone = true;
        break;
      }
    }

    if (gone) G.bullets.splice(i, 1);
  }

  /* --- fuego hostil --- */
  for (let i = G.ebullets.length - 1; i >= 0; i--) {
    const b = G.ebullets[i];
    b.t++;
    if (b.g) b.vy += b.g;
    b.x += b.vx; b.y += b.vy;
    b.life--;

    let gone = b.life <= 0 || b.x < camL - 60 || b.x > camR + 60 || b.y > G.mapH + 120;

    // las teclas del keylogger flotan pegadas a la superficie: no chocan contra
    // el terreno, se quedan donde cayeron hasta que se agotan
    if (!gone && !b.key && rectHitsSolid(b.x, b.y, b.w, b.h)) {
      gone = true;
      if (b.bomb) explode(b.x + b.w / 2, b.y + b.h / 2, 26, 0, 'enemy');
      else {
        FX.pop(b.x + b.w / 2, b.y + b.h / 2, b.color, 7, { life: 8, points: 5 });
        FX.spark(b.x + b.w / 2, b.y + b.h / 2, b.color, 4, 2, [5, 12]);
      }
    }

    /* Un rosado que te llega en postura de parry no daña: se queda donde está
       y el parry lo atrapa en el próximo updatePlayer. Sin esto el orden del
       bucle lo hacía imposible — el jugador se actualiza antes que las balas,
       así que la bala se movía, te pegaba y desaparecía antes de que el parry
       llegara a verla, por perfecto que fuera el timing. */
    const parrying = b.corrupt && P.parry > 0;
    if (!gone && !P.dead && !parrying && aabb(b, P)) {
      damagePlayer(b.heavy ? 2 : 1, b.x);
      gone = true;
      if (b.bomb) FX.fireball(b.x, b.y, 18);
    }

    if (gone) G.ebullets.splice(i, 1);
  }

  /* --- granadas --- */
  for (let i = G.grenades.length - 1; i >= 0; i--) {
    const g = G.grenades[i];
    g.t++;
    g.vy = Math.min(g.vy + 0.26, 9);
    moveActor(g, g.vx, g.vy, { oneway: false });
    if (g.onGround) { g.vx *= 0.62; g.vy = -Math.abs(g.vy) * 0.34; if (Math.abs(g.vy) < 0.6) g.vy = 0; }
    if (g.hitWall) { g.vx *= -0.5; g.rotV *= -0.6; }
    g.rot += g.rotV;
    if (g.onGround) g.rotV = g.vx * 0.09;      // rueda: el giro sigue al avance
    if (g.t % 4 === 0) FX.smoke(g.x + 3, g.y + 3, '#6a6558', 1, { size: [1, 2], life: [14, 26], alpha: 0.22 });

    let touched = false;
    for (const e of G.enemies) if (!e.dead && aabb(g, e)) { touched = true; break; }

    if (g.t > 74 || touched) {
      explode(g.x + 3, g.y + 3, 36, 9, 'both');
      G.grenades.splice(i, 1);
    }
  }
}

/** Lluvia de esquirlas decorativa tras un impacto grande. */
export function scatter(x, y, color) {
  FX.spark(x, y, color, 8, 3, [10, 22]);
  FX.debris(x, y, '#2b3138', 4, rnd(1.6, 2.6));
}
