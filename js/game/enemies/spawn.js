/* La fábrica: un `case` por tipo, con la caja, la vida y los campos propios de
   cada bicho. Está sola en su archivo porque la llama medio juego —el mapa al
   cargar, el troyano al reventar, el gusano al partirse— y si viviera junto a
   alguna familia esa familia se volvería el centro de todo por accidente. */

import { groundAhead } from '../world.js';
import { TS } from '../../config.js';
import { rnd, rndi, pick } from '../../util.js';
import { BAITS, BAIT_KINDS } from './phishing.js';

/**
 * `bait` sólo lo usa el phishing, y sólo si el mapa lo pidió explícitamente con
 * su carácter propio. Con la `d` genérica queda en null y el disfraz se sortea.
 */
export function spawnEnemy(type, x, footY, bait = null) {
  const base = {
    type, x, vx: 0, vy: 0,
    dir: Math.random() < 0.5 ? -1 : 1,
    /* `t` tiene que ser entero: hay lógica que dispara con `e.t % n === 0`, y
       con un arranque fraccionario ese resto no da cero nunca. */
    t: rndi(0, 200), cd: rnd(50, 130),
    hit: 0, dead: false, aggro: 0, anim: 0,
    telegraph: 0, burst: 0, state: 'patrulla',
    boss: false,
  };
  switch (type) {
    /* `c2` lo llena la botnet que lo enganche al armar el nivel. Mientras
       apunte a un servidor vivo este bot es intocable, y `shield` es lo que
       dura el destello del tiro que le rebotó. */
    case 'spambot':
      return { ...base, w: 14, h: 26, y: footY - 26, hp: 5, maxHp: 5, speed: 0.62,
               popup: 0, burstCd: 0, c2: null, shield: 0 };

    /* Troyano. El más grande de la tropa y el único que no pelea por sí mismo:
       lo que trae adentro vale más que él. Es el doble de todo —cuerpo, vida y
       consecuencias— porque lo que suelta al abrirse ya no es una nube de
       bichos sino tres procesos hechos y derechos (ver spillTrojan).

       Va centrado en el tile que lo puso, y es el único que lo hace: con 44 de
       ancho, plantarlo por la esquina izquierda como a todos lo correría media
       máquina a la derecha del lugar donde el mapa lo pidió. */
    case 'troyano':
      return { ...base, w: 44, h: 62, x: x + TS / 2 - 22, y: footY - 62,
               hp: 36, maxHp: 36, speed: 0.36, charge: 0 };

    /* Arranca disfrazado y quieto. El cartel se resuelve acá y se guarda ya
       elegido: el dibujo no tiene por qué saber de la tabla de cebos.

       `lure` decide si además deja el enlace falso. Que no lo hagan todos es a
       propósito: si el enlace fuera siempre, dejaría de ser una sorpresa y
       pasaría a ser una rutina. */
    case 'phishing': {
      const grounded = groundAhead(x + TS / 2, footY + 3);
      /* Si el mapa pidió un disfraz concreto, manda el mapa. Con la `d` genérica
         se sortea, pero respetando el apoyo: el cajón y el poste de restauración
         son cosas que se apoyan, y colgadas del aire delatan al mímico antes de
         que abra la boca. El corazón flota, así que es el que sale al vuelo. */
      const kind = bait || (grounded ? pick(BAIT_KINDS) : 'corazon');
      return { ...base, w: 24, h: 14, y: footY - 14, hp: 6, maxHp: 6,
               homeX: x, homeY: footY - 14, speed: 0.9,
               mode: 'cebo', revealT: 0, grounded,
               bait: kind, sign: BAITS[kind].sign,
               lure: Math.random() < 0.5, link: null,
               hookPhase: 0, hookLen: 0, hookAng: 0, hookHold: 0, hookHit: false };
    }

    /* Flota: el piso que cifra es el que tiene abajo, así que no puede estar
       parado en él. Por eso nace 14px más arriba de donde lo pone el mapa. */
    case 'ransomware':
      return { ...base, w: 20, h: 22, y: footY - 36, hp: 14, maxHp: 14,
               homeX: x, homeY: footY - 36, speed: 0.22,
               ang: 0, knockback: false, tumbler: 0, combo: rndi(3, 5),
               lock: null, lockCd: rnd(40, 90) };

    /* Keylogger: máquina de escribir agarrada de una superficie —suelo o techo—
       que patrulla hasta tenerte a tiro y ahí te lee.

       Los 16 de alto no son decorativos: con el arma a la altura del pecho de
       Bit, un bicho más bajo que eso le pasa por debajo a todos los disparos
       rectos y se vuelve imposible de matar de frente.

       Vida baja a propósito: lo que lo hace peligroso es lo que sabe, no lo que
       aguanta, así que acercársele tiene que seguir siendo la respuesta rápida.
       Todo lo demás vive en KEYLOG (config.js).

         log     últimas acciones leídas de la cinta, en orden
         pairs   la tabla de pares: 'acción>acción' → cuántas veces la vio
         learn   0..100, su confianza; es su tasa de acierto, no un reloj
         cursor  hasta dónde leyó la cinta; gen, para saber si se borró
         aim     el punto al que va a disparar, una vez elegido
         eco     la copia fantasma que soltó, si tiene una viva */
    case 'keylogger':
      return { ...base, w: 24, h: 16, y: footY - 16, hp: 8, maxHp: 8, speed: 1.0,
               surface: 1, seg: 0,          // surface: 1 suelo, -1 techo
               log: [], pairs: {}, learn: 0, cursor: 0, gen: -1, idleT: 0, watch: 0,
               aim: null, lead: 0, guess: null, lockT: 0, judgeT: 0, fail: 0,
               eco: null, ghostCd: 0,
               typeT: 0, strike: 0, ring: 0, burstCd: 0 };

    /* Eco: la entrada fantasma que reproduce el Keylogger. No es un proceso
       hostil sino una grabación, así que no cuenta como baja ni suelta nada
       (ver killEnemy). `script` es el renglón que repite; `life` lo apaga sí o
       sí, para que una grabación no se vuelva un enemigo permanente. */
    case 'eco':
      return { ...base, w: 13, h: 26, y: footY - 26, hp: 3, maxHp: 3, speed: 1.4,
               script: [], step: 0, stepT: 0, life: 240, onGround: false };

    /* Gusano: si toca el suelo y sobrevive, se duplica. */
    case 'gusano':
      return { ...base, w: 13, h: 13, y: footY - 13, hp: 4, maxHp: 4, speed: 0.8,
               split: 150, gen: 0 };

    /* Bicho: lo sueltan los troyanos al reventar. Rápido, frágil, molesto —
       pero no tan bajo como para meterse debajo de la línea de tiro. */
    case 'bicho':
      return { ...base, w: 11, h: 13, y: footY - 13, hp: 1, maxHp: 1, speed: 1.35 };

    /* ── jefes ── */
    /* Servidor C2 de una botnet: no dispara, ordena. Se engancha a los spambots
       cercanos al armarse el nivel, los vuelve invulnerables mientras aguante, y
       al morir se los lleva a todos con él. */
    case 'botnet':
      return { ...base, w: 18, h: 30, y: footY - 30, hp: 16, maxHp: 16,
               knockback: false, links: null, pulse: 0 };

    /* Man-in-the-Middle: flota, se mete entre vos y tu objetivo, y devuelve lo
       que le tirás de frente. `turnT` es la demora para darse vuelta: es la
       ventana para ponerse detrás. */
    case 'mitm':
      return { ...base, w: 16, h: 18, y: footY - 40, homeY: footY - 40, speed: 1.3,
               hp: 9, maxHp: 9, turnT: 0, mirror: 0 };

    /* Exfiltrador: te roba fragmentos y huye. Si sale de pantalla con el botín,
       se pierde para siempre; si lo matás, lo suelta. */
    case 'exfil':
      return { ...base, w: 12, h: 16, y: footY - 16, hp: 6, maxHp: 6, speed: 0.6,
               stolen: 0, lunge: 0, fleeDir: 1 };

    /* Rootkit: nace camuflado y quieto. `mode` es todo su estado —oculto,
       revela, caza, dentro— y `noTouch` arranca en true porque algo que no se
       ve no puede cobrarte por chocarlo. */
    case 'rootkit':
      return { ...base, w: 20, h: 18, y: footY - 18, hp: 9, maxHp: 9, speed: 1.55,
               mode: 'oculto', noTouch: true, revealT: 0, leap: 0,
               hideCd: rnd(120, 240), host: null, shimmer: rndi(0, 300) };

    /* Spyware: flota y mira. `watch` son los cuadros seguidos que lleva
       leyéndote; a 300 suena la alarma. */
    /* Spyware: flota, mira y llama. No dispara nunca.
         watch    cuadros seguidos que lleva leyéndote; a 300 proyecta
         cast     cuadros que le quedan al cono de luz antes de traer al invitado
         castAt   dónde va a caer, ya elegido y a la vista
         called   cuántos refuerzos trajo: tiene cupo (ver SPY_MAX) */
    case 'spyware':
      return { ...base, w: 16, h: 14, y: footY - 40, hp: 5, maxHp: 5, speed: 0.95,
               knockback: false, float: rnd(0, 6.28), watch: 0, beam: false, alarm: 0,
               cast: 0, castType: null, castAt: null, called: 0 };

    /* Adware: no persigue, tapa. Las ventanas las crea en pleno juego. */
    case 'adware':
      return { ...base, w: 26, h: 24, y: footY - 24, hp: 12, maxHp: 12, speed: 0.5,
               float: rnd(0, 6.28) };

    /* Ventana emergente: la escupe el Adware, nunca el mapa. Se queda donde
       apareció y se cierra sola a los 8 segundos. */
    case 'ventana':
      return { ...base, w: 34, h: 26, y: footY - 26, hp: 2, maxHp: 2, speed: 0,
               homeX: x, homeY: footY - 26, knockback: false,
               kind: 'trampa', noTouch: false, float: rnd(0, 6.28), life: 480 };

    case 'monarca':
      return { ...base, w: 74, h: 62, y: footY - 62, hp: 320, maxHp: 320, speed: 0.55,
               boss: true, name: 'THE ROOTKIT MONARCH',
               attack: null, step: 0, knockback: false, wellT: 0, float: 0, leap: 0 };

    /* El Implante: soldado al piso, ancho y bajo. `splits` cuenta las veces que
       ya se copió (dos), y `copiaT` es lo que le queda de acertijo. */
    case 'implante':
      return { ...base, w: 80, h: 48, y: footY - 48, hp: 360, maxHp: 360, speed: 0.5,
               boss: true, name: 'EL IMPLANTE',
               attack: null, knockback: false, float: 0,
               copiaT: 0, splits: 0, marcado: 0 };

    /* Copia del Implante: misma silueta, un punto de integridad y nada adentro.
       Flota —por eso no proyecta sombra, que es la pista— y no toca a nadie. */
    case 'copia':
      return { ...base, w: 80, h: 48, y: footY - 48, hp: 1, maxHp: 1, speed: 0,
               homeY: footY - 48, knockback: false, noTouch: true, float: rnd(0, 6.28) };

    case 'baron':
      return { ...base, w: 86, h: 54, y: footY - 54, baseY: footY - 54,
               hp: 280, maxHp: 280, speed: 0.42,
               boss: true, name: 'BARON VON DDoS',
               attack: null, knockback: false, float: 0, spin: 0,
               heads: [0, 1, 2].map(i => ({ ang: i * 2.1, hp: 1 })) };

    default:
      return base;
  }
}
