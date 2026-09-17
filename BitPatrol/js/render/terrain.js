/* Terreno. Se pinta una sola vez por nivel en lienzos por trozos: eso permite
   gastar en sombras, vetas y cornisas sin pagarlo cada cuadro. */

import { TS } from '../config.js';
import { G } from '../game/state.js';
import { noise2, mix, rgba, clamp } from '../util.js';
import { INK } from './ink.js';

const PX = 2;        // píxeles de prerender por unidad de mundo
const CHUNK = 480;   // unidades de mundo por trozo

const CRUST_DETAIL = {
  perimetro: 'hierba', cache: 'arena', puerto: 'oxido',
  kernel: 'cristal', respaldo: 'nieve', raiz: 'ruina',
};

export function buildTerrain() {
  const count = Math.max(1, Math.ceil(G.mapW / CHUNK));
  const chunks = [];
  for (let i = 0; i < count; i++) {
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(CHUNK * PX);
    cv.height = Math.ceil(G.mapH * PX);
    const c = cv.getContext('2d');
    c.scale(PX, PX);
    c.translate(-i * CHUNK, 0);
    paintChunk(c, i * CHUNK - 70, i * CHUNK + CHUNK + 70);
    chunks.push({ x: i * CHUNK, cv });
  }
  G.terrain = chunks;
}

const solid = (c, r) =>
  c >= 0 && c < G.cols && r >= 0 && r < G.rows && G.grid[r * G.cols + c] === 1;

function paintChunk(c, x0, x1) {
  const th = G.theme;
  const c0 = Math.max(0, Math.floor(x0 / TS));
  const c1 = Math.min(G.cols - 1, Math.ceil(x1 / TS));
  const detail = CRUST_DETAIL[th.name] || 'roca';

  /* --- silueta completa --- */
  const mass = new Path2D();
  for (let r = 0; r < G.rows; r++)
    for (let col = c0; col <= c1; col++)
      if (solid(col, r)) mass.rect(col * TS, r * TS, TS, TS);

  /* sombra plana: una copia de la silueta corrida, sin desenfoque. El cel no
     tenía degradés; el volumen lo daba el desplazamiento. */
  c.save();
  c.translate(3, 6);
  c.fillStyle = 'rgba(20,14,10,.34)';
  c.fill(mass);
  c.restore();

  /* contorno de tinta: la silueta rellenada en corona alrededor de sí misma.
     Perfilar el Path2D directamente marcaría cada tile por dentro; dilatarla
     deja sólo el borde exterior, que es lo que dibujaría una pluma. */
  c.fillStyle = INK;
  for (let i = 0; i < 8; i++) {     // ocho direcciones bastan: el hueco que dejan
    const a = (i / 8) * Math.PI * 2; // contra el círculo ideal es de 0,2 px
    c.save();
    c.translate(Math.cos(a) * 2.6, Math.sin(a) * 2.6);
    c.fill(mass);
    c.restore();
  }
  c.fillStyle = th.rock.body;
  c.fill(mass);

  /* --- cuerpo con profundidad --- */
  for (let r = 0; r < G.rows; r++) {
    for (let col = c0; col <= c1; col++) {
      if (!solid(col, r)) continue;
      let depth = 0;
      while (depth < 7 && solid(col, r - depth - 1)) depth++;
      const t = clamp(depth / 6, 0, 1);
      c.fillStyle = mix(th.rock.edge, th.rock.deep, 0.25 + t * 0.75);
      c.fillRect(col * TS, r * TS, TS, TS);
    }
  }

  c.save();
  c.clip(mass);

  /* vetas y grano */
  for (let r = 0; r < G.rows; r++) {
    for (let col = c0; col <= c1; col++) {
      if (!solid(col, r)) continue;
      const x = col * TS, y = r * TS;
      for (let i = 0; i < 4; i++) {
        const n1 = noise2(col * 9.1 + i, r * 5.7 + i);
        const n2 = noise2(col * 3.3 - i, r * 7.1 + i * 2);
        c.fillStyle = n1 > 0.55 ? rgba(th.rock.edge, 0.42) : rgba(th.rock.deep, 0.5);
        c.fillRect(x + n1 * (TS - 5), y + n2 * (TS - 4), 1 + n2 * 4, 1 + n1 * 1.6);
      }
    }
  }

  /* oclusión en los bordes expuestos */
  for (let r = 0; r < G.rows; r++) {
    for (let col = c0; col <= c1; col++) {
      if (!solid(col, r)) continue;
      const x = col * TS, y = r * TS;
      if (!solid(col - 1, r)) shade(c, x, y, 6, TS, 'right');
      if (!solid(col + 1, r)) shade(c, x + TS - 6, y, 6, TS, 'left');
      if (!solid(col, r + 1)) {
        const g = c.createLinearGradient(0, y + TS - 7, 0, y + TS);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, 'rgba(0,0,0,.45)');
        c.fillStyle = g;
        c.fillRect(x, y + TS - 7, TS, 7);
      }
    }
  }
  c.restore();

  /* --- cornisa --- */
  for (let r = 0; r < G.rows; r++) {
    for (let col = c0; col <= c1; col++) {
      if (!solid(col, r) || solid(col, r - 1)) continue;
      crust(c, col, r, th, detail);
    }
  }

  /* --- losas y púas (estáticas) --- */
  for (const o of G.oneways) if (o.x + o.w > x0 && o.x < x1) slab(c, o, th);
  for (const s of G.spikes) if (s.x + s.w > x0 && s.x < x1) spikes(c, s, th);
}

function shade(c, x, y, w, h, from) {
  const g = c.createLinearGradient(from === 'right' ? x : x + w, 0, from === 'right' ? x + w : x, 0);
  g.addColorStop(0, 'rgba(0,0,0,.4)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g;
  c.fillRect(x, y, w, h);
}

function crust(c, col, r, th, detail) {
  const x = col * TS, y = r * TS;
  const n = (i) => noise2(col * 13.7 + i, r * 4.3);

  /* banda superior con borde inferior irregular */
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(x + TS, y);
  const h = 4 + n(1) * 2.5;
  c.lineTo(x + TS, y + h);
  for (let i = 4; i >= 0; i--) {
    const px = x + (TS / 4) * i;
    c.lineTo(px, y + h - 1.4 + noise2(col * 7 + i, r) * 3.2);
  }
  c.closePath();
  c.fillStyle = th.rock.crust;
  c.fill();

  /* filo iluminado */
  c.fillStyle = rgba(th.rock.crustLit, 0.9);
  c.fillRect(x, y, TS, 1.5);

  /* borde mordido hacia arriba */
  for (let i = 0; i < TS; i += 2.5) {
    if (noise2(col * 5 + i, r * 3) > 0.62) {
      c.fillStyle = rgba(th.rock.crustLit, 0.55);
      c.fillRect(x + i, y - 1, 2.5, 1.2);
    }
  }

  detailPass(c, x, y, th, detail, col, r);
}

function detailPass(c, x, y, th, detail, col, r) {
  const n = noise2(col * 2.1, r * 6.3);
  if (detail === 'hierba') {
    c.strokeStyle = rgba(th.rock.crustLit, 0.5);
    c.lineWidth = 0.9;
    for (let i = 0; i < 3; i++) {
      const gx = x + noise2(col + i * 3, r) * TS;
      const gh = 3 + noise2(col * 4 + i, r + i) * 5;
      c.beginPath();
      c.moveTo(gx, y + 0.5);
      c.quadraticCurveTo(gx + (i % 2 ? 2 : -2), y - gh * 0.6, gx + (i % 2 ? 3.4 : -3.4), y - gh);
      c.stroke();
    }
  } else if (detail === 'nieve') {
    c.fillStyle = rgba('#ffffff', 0.85);
    c.beginPath();
    c.moveTo(x, y + 1);
    c.quadraticCurveTo(x + TS / 2, y - 2.4 - n * 1.8, x + TS, y + 1);
    c.lineTo(x + TS, y + 3.4);
    c.lineTo(x, y + 3.4);
    c.closePath();
    c.fill();
    if (n > 0.7) {
      c.fillStyle = rgba('#ffffff', 0.5);
      c.fillRect(x + n * 10, y + 5, 1.2, 4 + n * 4);   // carámbano
    }
  } else if (detail === 'cristal' && n > 0.62) {
    c.fillStyle = rgba(th.accent, 0.5);
    c.beginPath();
    c.moveTo(x + n * 12, y);
    c.lineTo(x + n * 12 + 2.6, y - 5 - n * 4);
    c.lineTo(x + n * 12 + 5, y);
    c.closePath();
    c.fill();
  } else if (detail === 'oxido' && n > 0.55) {
    c.fillStyle = rgba('#8a5a3a', 0.35);
    c.fillRect(x + n * 8, y + 2, 4 + n * 6, 1.4);
  } else if (detail === 'ruina' && n > 0.68) {
    c.fillStyle = rgba(th.light, 0.16);
    c.fillRect(x + n * 11, y + 1.5, 2.2, 2.2);
  } else if (detail === 'arena') {
    c.fillStyle = rgba(th.rock.crustLit, 0.22);
    c.fillRect(x, y + 4.5, TS, 1.2);
  }
}

/* ─────────────────────────────── losas */

function slab(c, o, th) {
  const { x, y, w } = o;
  const h = 8;

  /* sombra plana */
  c.fillStyle = 'rgba(20,14,10,.3)';
  roundRect(c, x + 2, y + 5, w, h, 3);
  c.fill();

  /* soportes, por detrás de la tabla */
  c.fillStyle = mix(th.rock.deep, '#000000', 0.2);
  c.strokeStyle = INK;
  c.lineWidth = 2;
  c.lineJoin = 'round';
  for (let i = 6; i < w - 4; i += 16) {
    roundRect(c, x + i, y + h - 2, 3, 5, 1);
    c.fill();
    c.stroke();
  }

  /* tabla: color plano, banda clara arriba y contorno */
  roundRect(c, x, y, w, h, 3);
  c.fillStyle = th.plat.body;
  c.fill();
  c.save();
  c.clip();
  c.fillStyle = th.plat.lit;
  c.fillRect(x, y, w, 2.6);
  c.restore();
  roundRect(c, x, y, w, h, 3);
  c.strokeStyle = INK;
  c.lineWidth = 2.2;
  c.stroke();
}

/* ─────────────────────────────── púas */

function spikes(c, s, th) {
  const n = Math.max(1, Math.round(s.w / 7));
  const step = s.w / n;
  for (let i = 0; i < n; i++) {
    const bx = s.x + i * step;
    const jag = noise2(bx, s.y) * 2;
    c.beginPath();
    c.moveTo(bx, s.y + s.h);
    c.lineTo(bx + step / 2, s.y - jag);
    c.lineTo(bx + step, s.y + s.h);
    c.closePath();
    c.fillStyle = '#d8d2c2';
    c.fill();
    c.strokeStyle = INK;
    c.lineWidth = 2;
    c.lineJoin = 'round';
    c.stroke();
    /* cara en sombra: media púa en tono plano, como una carta recortada */
    c.beginPath();
    c.moveTo(bx + step / 2, s.y - jag);
    c.lineTo(bx + step * 0.72, s.y + s.h);
    c.lineTo(bx + step / 2, s.y + s.h);
    c.closePath();
    c.fillStyle = mix('#d8d2c2', INK, 0.42);
    c.fill();
  }
}

export function roundRect(c, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + rr, y);
  c.arcTo(x + w, y, x + w, y + h, rr);
  c.arcTo(x + w, y + h, x, y + h, rr);
  c.arcTo(x, y + h, x, y, rr);
  c.arcTo(x, y, x + w, y, rr);
  c.closePath();
}

/* ─────────────────────────────── dibujo por cuadro */

export function drawTerrain(ctx) {
  if (!G.terrain) return;
  const left = G.cam.x - 40, right = G.cam.x + G.view.w + 40;
  for (const ch of G.terrain) {
    if (ch.x + CHUNK < left || ch.x > right) continue;
    ctx.drawImage(ch.cv, ch.x, 0, CHUNK, G.mapH);
  }
}

/** Líquido: se anima, así que va fuera del prerender. */
export function drawHazards(ctx) {
  const th = G.theme, t = G.tick;
  for (const z of G.hazards) {
    if (z.x + z.w < G.cam.x - 40 || z.x > G.cam.x + G.view.w + 40) continue;
    const top = z.y + Math.sin(z.x * 0.09 + t * 0.045) * 1.4;

    const g = ctx.createLinearGradient(0, top, 0, z.y + z.h);
    g.addColorStop(0, th.liquid[1]);
    g.addColorStop(1, th.liquid[0]);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(z.x, top);
    for (let x = 0; x <= z.w; x += 5) {
      ctx.lineTo(z.x + x, z.y + Math.sin((z.x + x) * 0.09 + t * 0.045) * 1.4);
    }
    ctx.lineTo(z.x + z.w, z.y + z.h);
    ctx.lineTo(z.x, z.y + z.h);
    ctx.closePath();
    ctx.fill();

    /* la superficie va dibujada: primero tinta, después la cresta de color */
    ctx.beginPath();
    for (let x = 0; x <= z.w; x += 5) {
      const yy = z.y + Math.sin((z.x + x) * 0.09 + t * 0.045) * 1.4;
      x === 0 ? ctx.moveTo(z.x, yy) : ctx.lineTo(z.x + x, yy);
    }
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.strokeStyle = th.liquid[2];
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    /* halo del líquido */
    const gg = ctx.createLinearGradient(0, top - 16, 0, top + 6);
    gg.addColorStop(0, rgba(th.liquid[2], 0));
    gg.addColorStop(1, rgba(th.liquid[2], 0.16));
    ctx.fillStyle = gg;
    ctx.fillRect(z.x, top - 16, z.w, 22);
    ctx.restore();

    /* burbujas */
    for (let i = 0; i < z.w / 26; i++) {
      const seed = noise2(z.x + i * 31, i);
      const life = (t * (0.4 + seed * 0.5) + seed * 200) % 90;
      if (life > 70) continue;
      const bx = z.x + seed * z.w;
      const by = z.y + z.h - (life / 70) * z.h;
      ctx.fillStyle = rgba(th.liquid[2], 0.3 * (1 - life / 70));
      ctx.beginPath();
      ctx.arc(bx, by, 0.8 + seed, 0, 6.283);
      ctx.fill();
    }
  }
}

/** Plataformas móviles: geometría viva. */
export function drawMovers(ctx) {
  const th = G.theme;
  for (const m of G.movers) {
    if (m.x + m.w < G.cam.x - 40 || m.x > G.cam.x + G.view.w + 40) continue;

    /* riel */
    ctx.strokeStyle = rgba(th.rock.edge, 0.45);
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    if (m.axis === 'h') {
      ctx.moveTo(m.a + m.w / 2, m.y + m.h / 2);
      ctx.lineTo(m.b + m.w / 2, m.y + m.h / 2);
    } else {
      ctx.moveTo(m.x + m.w / 2, m.a + m.h / 2);
      ctx.lineTo(m.x + m.w / 2, m.b + m.h / 2);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    /* sombra plana + color plano + contorno, igual que las losas fijas */
    ctx.fillStyle = 'rgba(20,14,10,.3)';
    roundRect(ctx, m.x + 2, m.y + 5, m.w, m.h, 3);
    ctx.fill();

    roundRect(ctx, m.x, m.y, m.w, m.h, 3);
    ctx.fillStyle = th.plat.body;
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = th.accent;
    ctx.fillRect(m.x, m.y, m.w, 2.6);
    ctx.restore();
    roundRect(ctx, m.x, m.y, m.w, m.h, 3);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.2;
    ctx.lineJoin = 'round';
    ctx.stroke();

    /* remaches: dicen que esto es una máquina y no un pedazo de suelo */
    ctx.fillStyle = INK;
    for (let i = 5; i < m.w - 3; i += 12) {
      ctx.beginPath();
      ctx.arc(m.x + i, m.y + m.h - 2.6, 0.9, 0, 6.283);
      ctx.fill();
    }

    const pulse = 0.4 + Math.sin(G.tick * 0.08) * 0.16;
    ctx.fillStyle = rgba(th.accent, pulse);
    ctx.fillRect(m.x + m.w / 2 - 4, m.y + m.h, 8, 1.6);
  }
}
