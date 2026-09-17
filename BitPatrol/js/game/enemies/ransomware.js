/* Control de territorio: el único enemigo que no te ataca a vos sino al piso.
   Mientras sostiene una zona cifrada, ese tramo deja de sostener.

   El cifrado en sí vive en `world.js` (`addLock`/`dropLock`), que es quien
   decide qué es sólido; acá está sólo quién lo pide y cuándo lo suelta. */

import { G } from '../state.js';
import { addLock, dropLock } from '../world.js';
import { TS, PINK_GAP } from '../../config.js';
import { spawnEBullet } from '../projectiles.js';
import * as FX from '../fx.js';
import { Sfx } from '../../audio.js';
import { rnd, clamp } from '../../util.js';
import { queueShot } from './shared.js';

/* ─────────────────────────────── Ransomware Lock
   Control de territorio. Flota despacio sobre el tramo que custodia, y cuando
   te ve lo cifra: ese pedazo de piso deja de sostener mientras él lo sostenga a
   él. No es un enemigo que te mate de frente — es uno que te saca el suelo y te
   obliga a resolverlo antes de seguir.

   Dos válvulas de seguridad, porque un cifrado eterno tranca el nivel: caduca
   solo pasado un rato, y la Purga lo rompe. La tercera salida es matarlo, que
   es la que el diseño quiere que elijas. */

const LOCK_LIFE = 460;            // ~7,5 s de cifrado antes de caducar solo
const LOCK_ARM = 60;              // 1 s de aviso: la zona se ve pero todavía sostiene
const LOCK_COLS = 5, LOCK_ROWS = 4;

export function ransomware(e, dx, dy, dist) {
  const inRange = dist < 300;
  const cracked = e.hp <= e.maxHp * 0.3;

  /* Deriva: vuelve a su punto de guardia y se corre un poco hacia vos, pero
     tan lento que nunca te persigue de verdad. Flota — el piso que cifra es el
     suyo, y si se apoyara ahí se caería con él. */
  const toHome = clamp((e.homeX - e.x) * 0.012, -e.speed, e.speed);
  const toYou = inRange ? clamp(dx * 0.006, -e.speed, e.speed) : 0;
  e.x = clamp(e.x + toHome + toYou, 8, G.mapW - e.w - 8);
  e.y = e.homeY + Math.sin(e.t * 0.035) * 5;

  if (inRange) {
    const diff = ((Math.atan2(dy, dx) - e.ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    e.ang += clamp(diff, -0.05, 0.05);
  }

  /* los tambores se van abriendo con el daño acumulado; con la cerradura casi
     rota ya no puede sostener el cifrado ni disparar */
  e.tumbler = Math.floor((1 - e.hp / e.maxHp) * e.combo);

  /* ── el cifrado ── */
  if (e.lock) {
    if (cracked) releaseLock(e);
    else if (e.lock.arm > 0) { if (--e.lock.arm === 0) armLock(e); }
    else if (--e.lock.life <= 0) releaseLock(e);
  } else if (!cracked && inRange && --e.lockCd <= 0) {
    castLock(e);
  }

  /* las cadenas siguen, pero ahora son la amenaza secundaria: lo que te frena
     es la zona, no el proyectil */
  if (e.telegraph > 0) {
    if (--e.telegraph === 0) {
      /* dos glifos verdes en fila, y el rosado aparte. Antes era el tercero
         de la misma fila, más lento y a 7px del de adelante */
      for (let i = 0; i < 2; i++) {
        const sp = 4.6 - i * 0.5;
        spawnEBullet(
          e.x + e.w / 2 + Math.cos(e.ang) * (14 + i * 7),
          e.y + e.h / 2 + Math.sin(e.ang) * (14 + i * 7),
          Math.cos(e.ang) * sp, Math.sin(e.ang) * sp,
          { size: 5, heavy: true, glyph: true, color: '#44ff6e' });
      }
      queueShot(e, PINK_GAP, () => {
        const mx = e.x + e.w / 2 + Math.cos(e.ang) * 14, my = e.y + e.h / 2 + Math.sin(e.ang) * 14;
        spawnEBullet(mx, my, Math.cos(e.ang) * 3.8, Math.sin(e.ang) * 3.8,
          { size: 5, corrupt: true, glyph: true });
        FX.spark(mx, my, '#ff6ec7', 5, 2);
      });
      FX.spark(e.x + e.w / 2 + Math.cos(e.ang) * 16, e.y + e.h / 2 + Math.sin(e.ang) * 16, '#ffb47a', 6, 2.4);
      e.cd = rnd(110, 160);
    }
  } else if (--e.cd <= 0 && inRange && !cracked) {
    e.telegraph = 32;
    Sfx.telegraph();
  }
}

/**
 * Marca el tramo que tiene debajo. Todavía no lo cifra: durante LOCK_ARM
 * cuadros la zona parpadea y el piso sigue firme, que es el tiempo de salir de
 * encima o de pegarle. El golpe fuerte (sacudida, destello) va recién al
 * armarse, así el aviso y el efecto no se confunden.
 */
function castLock(e) {
  const cx = e.x + e.w / 2;
  const col = Math.floor(cx / TS) - (LOCK_COLS >> 1);
  const row = Math.floor((e.y + e.h + 6) / TS);
  addLock(e, col * TS, row * TS, LOCK_COLS * TS, LOCK_ROWS * TS, LOCK_LIFE, LOCK_ARM);
  FX.ring(cx, row * TS + TS, 70, '#b98cff', { life: 28, width: 2, alpha: 0.6 });
  Sfx.telegraph();
}

/** Se cumplió el aviso: ahora sí el piso deja de sostener. */
function armLock(e) {
  const L = e.lock;
  FX.ring(L.x + L.w / 2, L.y + TS, 80, '#b98cff', { life: 26, width: 3, alpha: 0.9 });
  FX.flash(3, '#b98cff');
  FX.shake(3.4);
}

/** Devuelve el piso y se toma un descanso antes de volver a cifrar. */
function releaseLock(e) {
  const L = dropLock(e);
  if (!L) return;
  e.lockCd = rnd(170, 260);
  FX.ring(L.x + L.w / 2, L.y + L.h / 2, 76, '#6ce8ff', { life: 24, width: 2.4, alpha: 0.8 });
  FX.spark(L.x + L.w / 2, L.y + L.h / 2, '#a8f4ff', 14, 2.6, [12, 28]);
}

