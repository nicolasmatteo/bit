/* El mímico y su tabla de disfraces. La tabla vive acá y no en la fábrica
   aunque sea la fábrica quien la lee: de qué se disfraza este bicho es asunto
   del bicho, no del que lo crea.

   Es el único enemigo cuyo ataque queda atado a él —el anzuelo es una tanza,
   no un proyectil—, así que la punta (`hookTip`) la comparten la lógica y el
   dibujo: si se calcularan por separado, el anzuelo pincharía donde no se ve. */

import { G, P } from '../state.js';
import { rectHitsSolid } from '../world.js';
import { damagePlayer, damageEnemy } from '../combat.js';
import * as FX from '../fx.js';
import { Sfx } from '../../audio.js';
import { aabb, rnd, clamp } from '../../util.js';

/* De qué se disfraza el phishing, y qué promete cada disfraz.

   Los tres mienten distinto, y esa es la curva de dificultad del enemigo:

   · la caja es la única con cartel, y promete de más: se la ve venir. Es la que
     te enseña que estas cosas existen.
   · el corazón no dice nada, pero la vida de verdad en este juego es un parche
     verde con una cruz, no un corazón rojo. La pista es saber cómo se ve lo
     legítimo.
   · el punto de restauración tampoco habla, y encima imita algo que buscás. Lo
     único que lo delata son las bandas del color equivocado. Es el de arriba
     de todo.

   Lo que dibuje cada cebo tiene que caer dentro de la caja de golpe del bicho,
   que son 24×14 apoyados en el piso. Un cebo que se ve pero no se puede tocar
   no es una trampa: es un adorno. */
export const BAITS = {
  caja:     { sign: 'COMBO DE ARMAS Y VIDA' },
  corazon:  { sign: null },
  guardado: { sign: null },
};
export const BAIT_KINDS = Object.keys(BAITS);


/* ─────────────────────────────── Phishing
   Trampa y distracción. Arranca haciéndose pasar por algo que querés —un parche
   de vida, un depósito de herramientas, una plataforma— y sólo se destapa
   cuando te le acercás. En su forma real es un pez hecho de correos, y pesca
   con un anzuelo atado a una tanza: no es un proyectil, sigue atado al bicho,
   así que no se esquiva como una bala. Hay que salirse del largo, o pararlo.

   El cartel que le flota encima es el trato: lo que es de verdad nunca viene
   con uno. Es información, no decoración. */

/** Largo de la tanza. Lo comparten la IA y el dibujo. */
export const HOOK_REACH = 82;

export function phishing(e, dx, dy, dist) {
  if (e.link) updateLink(e);

  if (e.mode === 'cebo') {
    /* Clavado donde lo puso el mapa. El cabeceo lo pone cada disfraz en su
       propio dibujo y no acá: un corazón flota, pero un cajón apoyado y un
       poste plantado en el piso tienen que quedarse quietos, y meciendo el
       `y` del bicho se mecían los tres por igual. */
    e.x = e.homeX;
    e.y = e.homeY;

    /* Se destapa al tocarlo, y nada más. El cartel es el único aviso que hubo,
       que es justamente el punto: la trampa castiga la avidez.

       Los tres cebos viven a ras del piso a propósito — un mímico alto, al que
       llegás saltando, te mataría de caída antes de que puedas reaccionar, y
       ahí el cartel llegaría tarde. Abajo, lo peor que pasa es que te muerdan.

       Un tiro también le arruina el disfraz: es el premio por haber leído el
       cartel en vez de caminar hasta el objeto. */
    if (aabb(P, e) || e.hp < e.maxHp) revealMimic(e);
    return;
  }

  if (e.mode === 'revela') {
    /* se sacude mientras se le cae el disfraz, y todavía no ataca. El contador
       es propio y no `telegraph`: ese significa "estoy por atacar" en todo el
       juego, y acá dibujaría la línea de puntería antes de que haya puntería */
    e.y = e.homeY + Math.sin(e.t * 0.6) * 2.2;
    if (--e.revealT <= 0) e.mode = 'caza';
    return;
  }

  const drift = clamp(dx * 0.012, -0.95, 0.95);
  e.homeX += drift * (dist < 280 ? 1 : 0.25);
  e.homeX = clamp(e.homeX, 40, G.mapW - 60);
  /* zigzag: dos senos desfasados, uno rápido y chico sobre otro lento y ancho */
  e.x = e.homeX + Math.sin(e.t * 0.017) * 26 + Math.sin(e.t * 0.09) * 5;
  e.y = e.homeY + Math.sin(e.t * 0.031) * 11 + Math.sin(e.t * 0.11) * 3;
  e.dir = dx > 0 ? 1 : -1;

  if (e.hookPhase > 0) { castHook(e); return; }

  if (e.telegraph > 0) {
    if (--e.telegraph === 0) {
      /* la dirección se clava al soltar y no corrige más: un anzuelo que te
         persigue no se puede esquivar, y entonces el aviso previo no sirve */
      e.hookAng = Math.atan2(dy, dx);
      e.hookPhase = 1;
      e.hookLen = 0;
      e.hookHit = false;
      e.cd = rnd(120, 190);
    }
  } else if (--e.cd <= 0 && dist < HOOK_REACH + 26) {
    e.telegraph = 30;
    Sfx.telegraph();
  }
}

/** Se le cae el disfraz. Queda un momento expuesto antes de empezar a cazar. */
function revealMimic(e) {
  e.mode = 'revela';
  e.revealT = 26;
  e.aggro = 240;
  e.cd = rnd(40, 80);
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
  FX.pop(cx, cy, '#f4e8ca', 20, { life: 16, points: 7, core: '#ffffff' });
  FX.spark(cx, cy, '#ffd08a', 14, 2.8, [10, 24]);
  FX.shake(2.8);
  Sfx.telegraph();
  if (e.lure) e.link = { x: cx, y: cy - 4, t: 0, life: 320 };
}

/**
 * El enlace falso. Si lo tocás te escupe al lado del bicho que lo dejó — que es
 * el peor lugar posible y, a la vez, el único destino que se sabe transitable:
 * es donde el mímico nació, o sea un punto que el mapa ya validó. Teletransportar
 * a cualquier otro lado corre el riesgo de incrustar al jugador en la roca.
 */
function updateLink(e) {
  const L = e.link;
  L.t++;
  if (--L.life <= 0) { e.link = null; return; }
  if (P.dead || !aabb(P, { x: L.x - 8, y: L.y - 6, w: 16, h: 12 })) return;

  e.link = null;
  const tx = e.homeX + e.w / 2 - P.w / 2;
  const ty = e.homeY + e.h - P.h;
  FX.ring(P.x + P.w / 2, P.y + P.h / 2, 34, '#b98cff', { life: 18, width: 2, alpha: 0.8 });

  if (!rectHitsSolid(tx, ty, P.w, P.h)) {
    P.x = tx; P.y = ty; P.vx = 0; P.vy = 0;
    FX.ring(tx + P.w / 2, ty + P.h / 2, 44, '#b98cff', { life: 22, width: 2.6, alpha: 0.95 });
  }
  FX.flash(4, '#b98cff');
  FX.shake(3);
  damagePlayer(1, e.x + e.w / 2);
}

/**
 * La punta de la caña, de donde sale la tanza. La comparten IA y dibujo, así
 * que la cuerda que se ve y la que golpea nacen del mismo punto.
 */
export function hookAnchor(e) {
  return { x: e.x + e.w / 2 + e.dir * 16.5, y: e.y + e.h / 2 - 8.6 };
}

/** La punta del anzuelo, en coordenadas de mundo. La comparten IA y dibujo. */
export function hookTip(e) {
  const a = hookAnchor(e);
  const cast = e.hookPhase > 0;
  const ang = cast ? e.hookAng : Math.PI / 2;
  const len = cast ? e.hookLen : 13 + Math.sin(e.t * 0.07) * 1.5;
  return { x: a.x + Math.cos(ang) * len, y: a.y + Math.sin(ang) * len, ang };
}

/** Tira, aguanta un momento con la tanza tensa, y recoge. */
function castHook(e) {
  if (e.hookPhase === 1) {
    e.hookLen += 5.4;
    if (e.hookLen >= HOOK_REACH) { e.hookLen = HOOK_REACH; e.hookPhase = 2; e.hookHold = 8; }
  } else if (e.hookPhase === 2) {
    if (--e.hookHold <= 0) e.hookPhase = 3;
  } else {
    e.hookLen -= 3.1;                        // recoge más lento de lo que tira
    if (e.hookLen <= 0) { e.hookLen = 0; e.hookPhase = 0; }
  }

  if (e.hookHit || P.dead) return;
  const t = hookTip(e);
  if (!aabb(P, { x: t.x - 4, y: t.y - 4, w: 8, h: 8 })) return;
  e.hookHit = true;
  e.hookPhase = 3;                           // enganche o rebote: siempre recoge

  if (P.parry > 0) {
    /* El anzuelo parado se le vuelve encima. El parry tiene que seguir siendo
       respuesta válida contra toda la fauna, y este bicho ya no tira paquetes
       rosas que parar. */
    damageEnemy(e, 3, e.x + e.w / 2);
    FX.pop(t.x, t.y, '#ff6ec7', 14, { life: 12, points: 6, core: '#ffffff' });
    FX.shake(2.4);
    Sfx.parry();
  } else {
    damagePlayer(1, e.x + e.w / 2);
  }
}

