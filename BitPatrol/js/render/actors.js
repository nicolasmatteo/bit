/* Figuras, al modo de un corto de 1936: color plano, contorno de tinta grueso,
   miembros de manguera y guantes blancos. Nada de luz de contorno ni degradés
   sobre los cuerpos — el volumen lo dan el borde y una única lágrima de brillo.

   El reparto es de ciberseguridad, pero dibujado como dibujo animado viejo: un
   bit con sombrero de inspector contra un zoológico de procesos hostiles.

   Este archivo es sólo la puerta: el reparto vive en `actors/`, un archivo por
   familia, y acá se junta lo que el resto del juego tiene derecho a pedir.
   Quien dibuja no necesita saber en qué archivo quedó cada bicho.

     actors/base.js         proporciones, paleta y las piezas de cara comunes
     actors/bit.js          Bit y la herramienta que lleva en la mano
     actors/enemies.js      los procesos hostiles y el despachante por tipo
     actors/phishing.js     el mímico, que dibuja lo que imita
     actors/ransomware.js   el candado y las zonas cifradas que sostiene
     actors/bosses.js       el Monarca y el Barón, que ocupan por diez
     actors/props.js        cajones, recogidas, postes y la puerta de salida
     actors/projectiles.js  todo lo que vuela
     actors/particles.js    lo que queda en el aire después                    */

export { drawPlayer } from './actors/bit.js';
export { drawEnemy, drawBotnetLinks } from './actors/enemies.js';
export { drawLocks } from './actors/ransomware.js';
export { drawCrates, drawPickups, drawCheckpoints, drawGoal } from './actors/props.js';
export { drawProjectiles } from './actors/projectiles.js';
export { drawParticles, drawBlasts } from './actors/particles.js';
