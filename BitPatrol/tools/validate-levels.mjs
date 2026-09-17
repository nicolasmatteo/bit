/* Verificador de niveles.
 *
 *   node tools/validate-levels.mjs
 *
 * Comprueba que cada mapa sea jugable con la envolvente real del movimiento:
 * salto simple 3 tiles, doble salto 5 tiles de alto y ~6 de largo. No simula
 * la física — aproxima el grafo de apoyos y avisa de islas inalcanzables.
 *
 * El análisis vive en `level-check.mjs`, que no sabe nada de la consola: así
 * el mismo control se puede correr desde el navegador cuando no hay Node.
 */

import { LEVELS } from '../js/data/levels.js';
import { analyse } from './level-check.mjs';

let bad = 0;
LEVELS.forEach((level, i) => {
  const shards = level.map.join('').split('*').length - 1;
  const { problems, cols, rows, reach } = analyse(level);
  const tag = problems.length ? 'REVISAR' : 'ok';
  console.log(
    `${String(i + 1).padStart(2, '0')}  ${level.name.padEnd(20)} ${cols}x${rows}` +
    `  fragmentos:${String(shards).padStart(2)}  apoyos:${String(reach ?? 0).padStart(4)}  ${tag}`
  );
  for (const p of problems) { console.log(`      · ${p}`); bad++; }
});

if (bad) {
  console.error(`\n${bad} problema(s).`);
  process.exit(1);
}
console.log('\nTodos los niveles son jugables.');
