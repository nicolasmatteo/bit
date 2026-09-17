/* El análisis de un mapa, sin nada alrededor.
 *
 * Vive aparte del verificador de línea de comandos para que lo pueda correr
 * cualquiera que pueda importar un módulo: `validate-levels.mjs` desde Node, y
 * también el navegador, que es lo único que hay a mano en más de una máquina.
 * Acá no se imprime ni se sale con código de error: se devuelve un informe.
 *
 * No simula la física — aproxima el grafo de apoyos con la envolvente real del
 * movimiento: salto simple 3 tiles, doble salto 5 de alto por ~6 de largo.
 */

const SUPPORT = new Set(['#', '=', '-']);
const BLOCK = new Set(['#']);
const DEADLY = new Set(['^', '~']);

/* Jefes, con su ancho en tiles (redondeado para arriba desde el ancho real en
   unidades: 74 y 86 sobre TS=20).

   Un jefe tiene una regla que nadie más tiene: no pisa líquido, púas ni vacío
   (`bossStepX` en js/game/enemies.js). Eso vuelve peligroso un mapa que parece
   sano — si al jefe le tocan bordes malos de los dos lados no se puede mover, y
   como la salida no abre mientras viva, el sector queda sin final. Peor: eso no
   se descubre hasta pelearlo. Por eso se verifica acá. */
const BOSSES = {
  B: { name: 'Rootkit Monarch', w: 4, arena: 10 },
  D: { name: 'Baron Von DDoS',  w: 5, arena: 10 },
  /* El Implante pide más que los otros dos: se copia tres veces y las copias se
     reparten a 260 unidades —13 tiles— para cada lado. Con una arena corta, las
     cuatro siluetas se amontonan y el acertijo deja de serlo. */
  I: { name: 'El Implante',     w: 4, arena: 40 },
};

/** Envolvente de salto: dr>0 sube, dr<0 cae. */
function canReach(dc, dr) {
  const a = Math.abs(dc);
  if (dr > 5) return false;
  if (dr >= 0) return a <= 6 - dr * 0.8;
  return a <= 6 + Math.min(3, -dr * 0.4);
}

export function analyse(level) {
  const map = level.map;
  const rows = map.length;
  const cols = Math.max(...map.map(r => r.length));
  const at = (r, c) => {
    if (r < 0 || r >= rows || c < 0 || c >= cols) return '#';
    return map[r][c] || ' ';
  };

  const problems = [];
  const stand = new Set();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const here = at(r, c);
      if (BLOCK.has(here) || DEADLY.has(here)) continue;
      if (BLOCK.has(at(r - 1, c))) continue;          // sin espacio para la cabeza
      const below = at(r + 1, c);
      if (SUPPORT.has(below) || here === '|' || below === '|') stand.add(`${r},${c}`);
    }
  }

  /* ── la arena de los jefes ─────────────────────────────────────────────
     `footing` es la misma pregunta que se hace el juego cuadro a cuadro: bajando
     desde los pies, ¿aparece piso antes que líquido, púas o el borde del mapa? */
  const footing = (r, c) => {
    for (let rr = r; rr <= r + 9; rr++) {
      if (rr >= rows) return false;                  // se cae del mundo
      const ch = at(rr, c);
      if (DEADLY.has(ch)) return false;
      if (rr > r && SUPPORT.has(ch)) return true;
    }
    return false;
  };
  /** ¿Apoya el cuerpo entero si su costado izquierdo arranca en `c`? */
  const bodyStands = (r, c, w) => {
    for (let i = 0; i < w; i++) if (!footing(r, c + i)) return false;
    return true;
  };

  const bosses = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const spec = BOSSES[at(r, c)];
      if (!spec) continue;
      /* La arena es la tirada CONTIGUA de posiciones a las que el jefe puede
         llegar caminando desde donde nace, no la suma de piso sano del mapa:
         un piso lindo del otro lado del líquido no le sirve de nada. */
      const ok = bodyStands(r, c, spec.w);
      let arena = ok ? 1 : 0;
      if (ok) {
        for (let x = c - 1; x >= 0 && bodyStands(r, x, spec.w); x--) arena++;
        for (let x = c + 1; x + spec.w <= cols && bodyStands(r, x, spec.w); x++) arena++;
      }
      bosses.push({ ch: at(r, c), r, c, spec, arena, ok });
    }
  }
  for (const b of bosses) {
    if (!b.ok) {
      problems.push(
        `${b.spec.name} (${b.ch}) nace en ${b.r},${b.c} sin piso sano bajo sus ` +
        `${b.spec.w} tiles de ancho: no se va a poder mover y la salida nunca abre`);
    } else if (b.arena < b.spec.arena) {
      problems.push(
        `${b.spec.name} (${b.ch}) tiene una arena de ${b.arena} tiles ` +
        `(mínimo ${b.spec.arena}): no le alcanza`);
    }
  }

  let start = null, goal = null;
  const items = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ch = at(r, c);
      if (ch === 'P') start = [r, c];
      else if (ch === 'G') goal = [r, c];
      else if ('!*mwcBD'.includes(ch)) items.push([r, c, ch]);
    }
  }
  if (!start) problems.push('falta el punto de inicio (P)');
  if (!goal) problems.push('falta la salida (G)');
  if (!start || !goal) return { problems, cols, rows, items: items.length };

  const seen = new Set([`${start[0]},${start[1]}`]);
  const queue = [start];
  while (queue.length) {
    const [r, c] = queue.shift();
    for (let dr = -12; dr <= 5; dr++) {
      for (let dc = -8; dc <= 8; dc++) {
        if (!dr && !dc) continue;
        if (!canReach(dc, dr)) continue;
        const key = `${r - dr},${c + dc}`;
        if (stand.has(key) && !seen.has(key)) {
          seen.add(key);
          queue.push([r - dr, c + dc]);
        }
      }
    }
  }

  if (!seen.has(`${goal[0]},${goal[1]}`)) problems.push(`la salida en ${goal} no es alcanzable`);

  for (const [r, c, ch] of items) {
    let near = false;
    for (let dr = -1; dr <= 2 && !near; dr++)
      for (let dc = -2; dc <= 2 && !near; dc++)
        if (seen.has(`${r + dr},${c + dc}`)) near = true;
    if (!near) problems.push(`'${ch}' aislado en ${r},${c}`);
  }

  return { problems, cols, rows, items: items.length, reach: seen.size };
}
