/* Procesos hostiles. Todos telegrafían antes de atacar: la lectura previa es lo
   que convierte el combate en algo legible en vez de un tiroteo de arcade.

   Los paquetes rosados (`corrupt`) son los que se pueden devolver con el parry.
   Cada familia tira al menos uno, así que el parry siempre es una opción viva.

   Acá queda sólo la orquestación —el bucle que corre a todos, cuadro a cuadro, y
   el despachante que decide qué IA le toca a cada tipo—, más la puerta de salida
   hacia el resto del juego. Cada familia vive en su propio archivo:

     enemies/spawn.js       la fábrica: un `case` por tipo
     enemies/shared.js      la cola de disparos diferidos y la puntería al vuelo
     enemies/grunts.js      spambot, troyano, gusano y bicho
     enemies/keylogger.js   el que te lee: registro, predicción y su eco
     enemies/phishing.js    el mímico, sus disfraces y el anzuelo
     enemies/ransomware.js  el que te saca el piso
     enemies/network.js     botnet, Man-in-the-Middle y exfiltrador
     enemies/intruders.js   rootkit, spyware, adware y sus ventanas
     enemies/bosses.js      los dos jefes y la arena de la que no se caen      */

import { G, P } from './state.js';
import { damagePlayer } from './combat.js';
import { aabb } from '../util.js';
import { outOfWorld } from './world.js';
import { runQueue } from './enemies/shared.js';
import { spambot, troyano, gusano, bicho } from './enemies/grunts.js';
import { keylogger, eco } from './enemies/keylogger.js';
import { phishing } from './enemies/phishing.js';
import { ransomware } from './enemies/ransomware.js';
import { botnet, mitm, exfil } from './enemies/network.js';
import { rootkit, spyware, adware, ventana } from './enemies/intruders.js';
import { monarca, baron, implante, copia, wakeBoss, bossKeepArena } from './enemies/bosses.js';

/* Lo que el resto del juego le pide a este módulo. Quien dibuja o quien golpea
   no tiene por qué saber en qué archivo terminó cada bicho. */
export { spawnEnemy } from './enemies/spawn.js';
export { spillTrojan, troyanoMuzzle } from './enemies/grunts.js';
export { surface } from './enemies/intruders.js';
export { HOOK_REACH, hookAnchor, hookTip } from './enemies/phishing.js';
export { C2_WARN, C2_SHIELD, SHIELD_COLOR, linkBots, shieldHit, reflectShot } from './enemies/network.js';
export { purgeKeyloggers } from './enemies/keylogger.js';
export { headPoints, activeBoss, splitImplante, endCopias } from './enemies/bosses.js';

export function updateEnemies() {
  const px = P.x + P.w / 2, py = P.y + P.h / 2;

  for (const e of G.enemies) {
    if (e.dead) continue;
    e.t++;
    if (e.hit > 0) e.hit--;
    /* el destello del escudo baja acá arriba, antes del corte por pantalla: un
       bot al que le rebotó el último tiro justo al salir de cuadro tiene que
       poder apagar el brillo igual */
    if (e.shield > 0) e.shield--;
    if (e.aggro > 0) e.aggro--;

    /* La red de seguridad de todos los que no son jefes. Ninguno se tira solo a
       un pozo —eso ya lo impide `safeStepX` en cada familia—, pero quedan los
       que llegaron ahí sin caminar: el bicho que el troyano escupió sobre el
       hueco, el gusano que se partió al borde, el keylogger al que un ransomware
       le cifró el piso, o un mapa que puso a alguien colgado del vacío.

       A ésos no se los rescata —fuera del mapa no se los ve, no se los alcanza
       y no vuelven—: se apagan y ya. Lo que no puede seguir pasando es lo de
       antes, caer para siempre y seguir vivos: un gusano así se quedaba con un
       lugar del cupo, y un exfiltrador así se llevaba tus fragmentos a ninguna
       parte. Va antes del corte por pantalla porque el que se cayó justo en el
       borde de la cámara también tiene que apagarse. */
    if (!e.boss && outOfWorld(e)) { e.dead = true; continue; }

    const onScreen = e.x + e.w > G.cam.x - 90 && e.x < G.cam.x + G.view.w + 90;
    if (!onScreen && !e.boss) continue;

    /* Los jefes duermen hasta que entran en cuadro. Antes corrían desde el
       primer cuadro del nivel: el Barón salía a buscarte desde la otra punta
       del mapa y disparaba sin que lo pudieras ver. Una vez despiertos siguen
       corriendo aunque te alejes, que es lo que hace que la arena se sienta
       como una pelea y no como algo que se apaga al dar un paso atrás. */
    if (e.boss && !e.awake) {
      const inView = e.x + e.w > G.cam.x && e.x < G.cam.x + G.view.w;
      if (!inView) continue;
      wakeBoss(e);
    }

    const dx = px - (e.x + e.w / 2);
    const dy = py - (e.y + e.h / 2);
    const dist = Math.hypot(dx, dy);

    runQueue(e);

    /* Un proceso con un Rootkit adentro ataca al doble de velocidad. El truco
       es que la habilidad extra no la implementa cada familia: todas cuentan
       hacia el ataque con `--e.cd`, así que restar de más acá se la agrega a
       todas de una sola vez, y a ninguna le hace falta saber que existe. */
    if (e.infected && !e.infected.dead && e.cd > 0) e.cd--;

    switch (e.type) {
      case 'spambot':    spambot(e, dx, dy, dist);    break;
      case 'troyano':    troyano(e, dx, dy, dist);    break;
      case 'phishing':   phishing(e, dx, dy, dist);   break;
      case 'ransomware': ransomware(e, dx, dy, dist); break;
      case 'keylogger':  keylogger(e, dx, dy, dist);  break;
      case 'eco':        eco(e, dx, dy, dist);        break;
      case 'gusano':     gusano(e, dx, dy, dist);     break;
      case 'bicho':      bicho(e, dx, dy, dist);      break;
      case 'monarca':    monarca(e, dx, dy, dist);    break;
      case 'baron':      baron(e, dx, dy, dist);      break;
      case 'botnet':     botnet(e, dx, dy, dist);     break;
      case 'mitm':       mitm(e, dx, dy, dist);       break;
      case 'exfil':      exfil(e, dx, dy, dist);      break;
      case 'rootkit':    rootkit(e, dx, dy, dist);    break;
      case 'spyware':    spyware(e, dx, dy, dist);    break;
      case 'adware':     adware(e, dx, dy, dist);     break;
      case 'ventana':    ventana(e, dx, dy, dist);    break;
      case 'implante':   implante(e, dx, dy, dist);   break;
      case 'copia':      copia(e, dx, dy, dist);      break;
    }

    /* Red de seguridad de la arena: un jefe nunca termina el cuadro sobre
       líquido, púas o vacío, haga lo que haga su ataque. */
    if (e.boss) bossKeepArena(e);

    /* Sin daño por contacto: el ransomware no pelea cuerpo a cuerpo, y el
       exfiltrador ya cobra al tocarte con lo que te roba — pegarte además
       sería cobrar dos veces el mismo error. */
    if (!P.dead && !e.noTouch && e.type !== 'ransomware' && e.type !== 'exfil' && aabb(P, e)) {
      damagePlayer(e.boss ? 2 : 1, e.x + e.w / 2);
    }
  }
}
