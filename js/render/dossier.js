/* El parte de amenazas: la grilla de fichas que se pasa al entrar a un sector
   que estrena procesos. Quién entra en la grilla lo decide quien la pide —acá
   sólo se dibuja—, y son siempre pocas: las que ese sector trae de nuevas.
   Cada ilustración es el enemigo de verdad, dibujado por drawEnemy
   sobre un lienzo chico — no una imagen aparte que haya que mantener. Si
   mañana se retoca un enemigo, su ficha cambia sola. */

import { spawnEnemy } from '../game/enemies.js';
import { drawEnemy } from './actors.js';
import { SECTOR_LAYERS } from '../data/bestiary.js';

const THUMB_W = 150, THUMB_H = 104;

let cards = [];
let raf = 0;

/** Arma las fichas de `entries` dentro de `root`. Se puede llamar más de una vez. */
export function buildDossier(root, entries) {
  stopDossier();
  root.innerHTML = '';
  cards = [];

  for (const entry of entries) {
    /* el enemigo de muestra: nace en coordenadas propias, lejos del mapa, y
       se le pisa la pose de la ficha */
    const e = spawnEnemy(entry.type, 0, 100);
    Object.assign(e, entry.pose || {});
    e.dir = 1;

    const card = document.createElement('article');
    card.className = 'threat' + (entry.boss ? ' threat--boss' : '');

    const canvas = document.createElement('canvas');
    canvas.className = 'threat__art';
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = THUMB_W * dpr;
    canvas.height = THUMB_H * dpr;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', entry.name);

    const tag = document.createElement('p');
    tag.className = 'threat__tag';
    /* el número de sector ya lo dice el rótulo del parte: acá sobra */
    tag.textContent = SECTOR_LAYERS[entry.sector - 1] + (entry.boss ? ' · jefe' : '');

    const name = document.createElement('h2');
    name.className = 'threat__name display';
    name.textContent = entry.name;

    const text = document.createElement('p');
    text.className = 'threat__text';
    text.textContent = entry.text;

    card.append(canvas, tag, name, text);
    root.appendChild(card);
    cards.push({ e, ctx: canvas.getContext('2d'), dpr, boss: !!entry.boss });
  }

  const loop = () => {
    raf = requestAnimationFrame(loop);
    for (const c of cards) drawThumb(c);
  };
  loop();
}

/** Corta la animación: las fichas no tienen por qué seguir dibujando en juego. */
export function stopDossier() {
  cancelAnimationFrame(raf);
  raf = 0;
}

function drawThumb({ e, ctx, dpr, boss }) {
  /* sólo el reloj de la animación avanza; ninguna IA corre acá */
  e.t++;
  e.anim += 0.12;
  if (e.seg !== undefined) e.seg += 0.4;
  if (e.float !== undefined) e.float += 0.04;
  if (e.spin !== undefined) e.spin += 0.021;
  if (e.heads) for (const h of e.heads) h.ang += 0.03;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  /* encuadre: el cuerpo centrado, con aire para lo que sobresale (antenas,
     cañas, coronas). Los jefes son varias veces más grandes, así que se achican */
  const fit = boss ? 84 : 58;
  const s = Math.min(2.4, fit / Math.max(e.w, e.h));
  ctx.setTransform(dpr * s, 0, 0, dpr * s,
    dpr * (THUMB_W / 2 - (e.x + e.w / 2) * s),
    dpr * (THUMB_H * 0.56 - (e.y + e.h / 2) * s));
  drawEnemy(ctx, e);
}
