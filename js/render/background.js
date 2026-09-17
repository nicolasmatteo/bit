/* Fondo: cielo, sol, capas de parallax con perspectiva aérea y partículas de aire.
   Todo es procedural y determinístico — ninguna capa parpadea entre cuadros. */

import { G } from '../game/state.js';
import { noise2, mix, rgba } from '../util.js';
import { INK, boilStep, puffPath } from './ink.js';

export function drawBackground(ctx) {
  const th = G.theme;
  const { w, h } = G.view;

  /* --- cielo --- */
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  for (const [stop, color] of th.sky) sky.addColorStop(stop, color);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  /* --- astro --- */
  if (th.sun) {
    const sx = w * th.sun.x - G.cam.x * 0.02;
    const sy = h * th.sun.y - G.cam.y * 0.04;
    const halo = ctx.createRadialGradient(sx, sy, 0, sx, sy, th.sun.r * 4.5);
    halo.addColorStop(0, rgba(th.sun.color, th.sun.halo));
    halo.addColorStop(0.35, rgba(th.sun.color, th.sun.halo * 0.28));
    halo.addColorStop(1, rgba(th.sun.color, 0));
    ctx.fillStyle = halo;
    ctx.fillRect(sx - th.sun.r * 4.5, sy - th.sun.r * 4.5, th.sun.r * 9, th.sun.r * 9);
    ctx.fillStyle = rgba(th.sun.color, 0.75);
    ctx.beginPath();
    ctx.arc(sx, sy, th.sun.r * 0.42, 0, 6.283);
    ctx.fill();
  }

  /* --- nubes dibujadas, sólo a cielo abierto --- */
  if (th.sun) clouds(ctx, th, w, h);

  /* --- capas --- */
  for (let i = 0; i < th.layers.length; i++) {
    const L = th.layers[i];
    const color = mix(th.rock.body, th.fog, L.tint);
    const offX = -G.cam.x * L.depth;
    const offY = -G.cam.y * L.depth * 0.45;
    const baseY = h * L.base + offY;

    switch (L.kind) {
      case 'ridge':   ridge(ctx, L, color, offX, baseY, w, h); break;
      case 'trees':   trees(ctx, L, color, offX, baseY, w, h, i); break;
      case 'pines':   pines(ctx, L, color, offX, baseY, w, h, i); break;
      case 'columns': columns(ctx, L, color, offX, baseY, w, h, i); break;
      case 'cranes':  cranes(ctx, L, color, offX, baseY, w, h, i); break;
      case 'crates':  crates(ctx, L, color, offX, baseY, w, h, i); break;
      case 'towers':  towers(ctx, L, color, offX, baseY, w, h, i); break;
      case 'cave':    cave(ctx, L, color, offX, w, h, i, offY); break;
      case 'crystal': crystal(ctx, L, color, offX, baseY, w, h, i); break;
      case 'grid':     grid(ctx, L, color, offX, baseY, w, h); break;
      case 'firewall': firewall(ctx, L, color, offX, baseY, w, h, i); break;
      case 'racks':    racks(ctx, L, color, offX, baseY, w, h, i); break;
      case 'antennas': antennas(ctx, L, color, offX, baseY, w, h, i); break;
      case 'circuit':  circuit(ctx, L, color, offX, baseY, w, h, i); break;
    }

    /* velo de niebla entre capas */
    if (L.tint > 0.2) {
      const veil = ctx.createLinearGradient(0, baseY - h * 0.22, 0, baseY + 30);
      veil.addColorStop(0, rgba(th.fog, 0));
      veil.addColorStop(1, rgba(th.fog, 0.1 * L.tint));
      ctx.fillStyle = veil;
      ctx.fillRect(0, baseY - h * 0.22, w, h * 0.22 + 30);
    }
  }

  ambient(ctx, th, w, h);
}

/* ─────────────────────────────── formas */

/**
 * Nubes de lóbulos con su contorno, flotando muy lento. Son la firma más
 * barata del cielo de dibujo animado: cuatro bultos y una línea.
 */
function clouds(ctx, th, w, h) {
  const off = -G.cam.x * 0.045 - G.tick * 0.06;
  const period = w + 260;
  ctx.save();
  ctx.lineJoin = 'round';
  for (let i = 0; i < 6; i++) {
    const n = noise2(i * 3.7, 21);
    let x = (i * (period / 6) + off) % period;
    if (x < 0) x += period;
    x -= 130;
    const y = h * (0.10 + n * 0.26) - G.cam.y * 0.045;
    const s = 16 + n * 22;

    /* un solo contorno cerrado: dibujar círculos sueltos dejaría las costuras
       internas a la vista y parecería un racimo de burbujas */
    ctx.globalAlpha = 0.5 + n * 0.28;
    puffPath(ctx, x, y, s, i * 2.3, 4 + (i % 3), 0.5);
    ctx.fillStyle = th.light;
    ctx.fill();
    ctx.strokeStyle = rgba(mix(th.fog, '#000000', 0.45), 0.55);
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
  ctx.restore();
}

function ridge(ctx, L, color, off, base, w, h) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-10, h + 10);
  for (let x = -10; x <= w + 10; x += 7) {
    const wx = (x - off) * 0.01;
    const y = base - (Math.sin(wx) * L.amp + Math.sin(wx * 2.7 + 1.3) * L.amp * 0.42 + Math.sin(wx * 0.43) * L.amp * 0.6);
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w + 10, h + 10);
  ctx.closePath();
  ctx.fill();
}

function scatterLoop(count, w, off, fn) {
  const spacing = (w + 220) / count;
  const period = count * spacing;
  for (let i = 0; i < count; i++) {
    let x = (i * spacing + off) % period;
    if (x < 0) x += period;
    fn(i, x - 110);
  }
}

function trees(ctx, L, color, off, base, w, h, seed) {
  ctx.fillStyle = color;
  scatterLoop(L.count, w, off, (i, x) => {
    const n = noise2(i * 3.1, seed);
    const hh = L.height * (0.7 + n * 0.6);
    const trunk = 2 + n * 3;
    ctx.fillRect(x - trunk / 2, base - hh * 0.55, trunk, hh);
    /* copa: tres masas ovaladas */
    for (let k = 0; k < 3; k++) {
      const nk = noise2(i * 7 + k, seed + k);
      ctx.beginPath();
      ctx.ellipse(
        x + (nk - 0.5) * hh * 0.34,
        base - hh * (0.52 + k * 0.17) - nk * 6,
        hh * (0.3 - k * 0.055), hh * (0.2 - k * 0.035),
        (nk - 0.5) * 0.5, 0, 6.283);
      ctx.fill();
    }
  });
}

function pines(ctx, L, color, off, base, w, h, seed) {
  ctx.fillStyle = color;
  scatterLoop(L.count, w, off, (i, x) => {
    const n = noise2(i * 2.7, seed);
    const hh = L.height * (0.65 + n * 0.7);
    const half = hh * 0.2;
    for (let k = 0; k < 3; k++) {
      const ky = base - (hh * 0.3) * k;
      const kw = half * (1 - k * 0.22);
      ctx.beginPath();
      ctx.moveTo(x, ky - hh * (0.52 + k * 0.16));
      ctx.lineTo(x + kw, ky);
      ctx.lineTo(x - kw, ky);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillRect(x - 1.4, base - 2, 2.8, 8);
  });
}

function columns(ctx, L, color, off, base, w, h, seed) {
  ctx.fillStyle = color;
  scatterLoop(L.count, w, off, (i, x) => {
    const n = noise2(i * 5.3, seed);
    const hh = L.height * (0.4 + n * 0.9);
    const cw = 9 + n * 6;
    ctx.fillRect(x, base - hh, cw, hh);
    ctx.fillRect(x - 3, base - hh - 5, cw + 6, 5);
    if (n > 0.55) ctx.fillRect(x - 10, base - hh * 0.3, cw + 20, 4);  // dintel caído
    ctx.fillStyle = rgba('#000000', 0.16);
    ctx.fillRect(x + cw - 3, base - hh, 3, hh);
    ctx.fillStyle = color;
  });
}

function cranes(ctx, L, color, off, base, w, h, seed) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  scatterLoop(L.count, w, off, (i, x) => {
    const n = noise2(i * 4.1, seed);
    const hh = L.height * (0.6 + n * 0.7);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, base);
    ctx.lineTo(x, base - hh);
    ctx.lineTo(x + 46 + n * 24, base - hh);
    ctx.lineTo(x + 36 + n * 20, base - hh + 16);
    ctx.moveTo(x, base - hh * 0.8);
    ctx.lineTo(x - 26, base - hh);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 30 + n * 20, base - hh);
    ctx.lineTo(x + 30 + n * 20, base - hh + 26);
    ctx.stroke();
    ctx.fillRect(x + 26 + n * 20, base - hh + 26, 9, 6);
    ctx.fillRect(x - 7, base - 14, 14, 14);
  });
}

function crates(ctx, L, color, off, base, w, h, seed) {
  scatterLoop(L.count, w, off, (i, x) => {
    const n = noise2(i * 8.7, seed);
    const stack = 1 + Math.floor(n * 2.5);
    for (let k = 0; k < stack; k++) {
      const cw = 42 + n * 18, ch = 15;
      ctx.fillStyle = mix(color, k % 2 ? '#7a3a30' : '#2f5b56', 0.22);
      ctx.fillRect(x, base - ch * (k + 1), cw, ch);
      ctx.fillStyle = rgba('#000000', 0.22);
      ctx.fillRect(x, base - ch * (k + 1) + ch - 3, cw, 3);
    }
  });
}

function towers(ctx, L, color, off, base, w, h, seed) {
  scatterLoop(L.count, w, off, (i, x) => {
    const n = noise2(i * 6.7, seed);
    const hh = L.height * (0.5 + n * 0.8);
    const tw = 30 + n * 26;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, base);
    ctx.lineTo(x + tw * 0.14, base - hh);
    ctx.lineTo(x + tw * 0.86, base - hh);
    ctx.lineTo(x + tw, base);
    ctx.closePath();
    ctx.fill();
    /* almenas */
    for (let k = 0; k < 4; k++) ctx.fillRect(x + tw * 0.14 + k * (tw * 0.72 / 4), base - hh - 5, tw * 0.1, 5);
    /* ventanas encendidas */
    ctx.fillStyle = rgba(G.theme.hostile, 0.3);
    for (let k = 0; k < 4; k++) {
      const wy = base - hh + 16 + k * (hh / 5);
      if (noise2(i * 3 + k, seed) > 0.42) ctx.fillRect(x + tw * 0.3, wy, 4, 7);
      if (noise2(i * 3 + k, seed + 9) > 0.55) ctx.fillRect(x + tw * 0.6, wy, 4, 7);
    }
  });
}

function cave(ctx, L, color, off, w, h, seed, offY) {
  ctx.fillStyle = color;
  scatterLoop(L.count, w, off, (i, x) => {
    const n = noise2(i * 9.3, seed);
    const len = 26 + n * 62;
    const wd = 10 + n * 16;
    ctx.beginPath();
    ctx.moveTo(x - wd / 2, offY);
    ctx.lineTo(x + wd / 2, offY);
    ctx.lineTo(x + (n - 0.5) * 8, len + offY);
    ctx.closePath();
    ctx.fill();
    /* estalagmita opuesta */
    ctx.beginPath();
    ctx.moveTo(x + 24 - wd / 2, h + offY);
    ctx.lineTo(x + 24 + wd / 2, h + offY);
    ctx.lineTo(x + 24 + (n - 0.5) * 6, h - len * 0.7 + offY);
    ctx.closePath();
    ctx.fill();
  });
}

function crystal(ctx, L, color, off, base, w, h, seed) {
  scatterLoop(L.count, w, off, (i, x) => {
    const n = noise2(i * 11.1, seed);
    const hh = L.height * (0.4 + n);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, base);
    ctx.lineTo(x + 5 + n * 5, base - hh);
    ctx.lineTo(x + 12 + n * 8, base);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rgba(G.theme.accent, 0.16 + n * 0.12);
    ctx.beginPath();
    ctx.moveTo(x + 4, base);
    ctx.lineTo(x + 5 + n * 5, base - hh);
    ctx.lineTo(x + 7 + n * 3, base);
    ctx.closePath();
    ctx.fill();
  });
}

/* ─────────────────────────────── infraestructura

   Las capas de ciberseguridad. Siguen las mismas reglas que las de paisaje:
   una sola tinta por capa (la mezcla de roca y niebla que le toca por
   profundidad), y lo único encendido son las luces chicas — un LED, una punta
   de antena, un pulso por una pista. Si el fondo brillara entero le robaría la
   lectura a los personajes, que son lo único con contorno. */

/** Piso de malla en perspectiva hacia el horizonte: el "ciberespacio" de siempre. */
function grid(ctx, L, color, off, base, w, h) {
  /* `color` ya viene mezclado como "rgb(...)", y rgba()/mix() sólo aceptan hex:
     pasarle ese valor da "rgba(NaN,…)" y el canvas lo ignora sin avisar. Las
     transparencias van por globalAlpha y el oscurecido, por una segunda pasada. */
  ctx.save();
  ctx.fillStyle = color;
  ctx.fillRect(0, base, w, h - base);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(0, base, w, h - base);
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let k = 0; k < 9; k++) {
    const y = base + Math.pow(k / 8, 2) * (h - base);
    ctx.moveTo(0, y); ctx.lineTo(w, y);
  }
  const vx = w / 2, step = 46, shift = ((off % step) + step) % step;
  for (let k = -12; k <= 12; k++) {
    const bx = vx + k * step + shift - step / 2;
    ctx.moveTo(vx + (bx - vx) * 0.08, base);
    ctx.lineTo(bx + (bx - vx) * 1.4, h);
  }
  ctx.stroke();
  ctx.restore();
}

/**
 * El cortafuegos, literal: una muralla de ladrillos con lenguas de fuego
 * encima. Las llamas van en el acento hostil y apenas encendidas — es el
 * resplandor que tiñe el horizonte del primer nivel.
 */
function firewall(ctx, L, color, off, base, w, h, seed) {
  const bh = L.height || 60;
  const top = base - bh;
  ctx.fillStyle = color;
  ctx.fillRect(0, top, w, h - top);

  ctx.strokeStyle = rgba('#000000', 0.2);
  ctx.lineWidth = 1;
  ctx.beginPath();
  const bw = 26, rh = 11;
  for (let r = 0; r * rh < bh; r++) {
    const y = top + r * rh;
    ctx.moveTo(0, y); ctx.lineTo(w, y);
    const o = ((off + (r % 2) * bw / 2) % bw + bw) % bw;
    for (let x = o; x < w; x += bw) { ctx.moveTo(x, y); ctx.lineTo(x, y + rh); }
  }
  ctx.stroke();

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  scatterLoop(L.count || 22, w, off, (i, x) => {
    const n = noise2(i * 4.3, seed);
    const fl = 10 + n * 22 + Math.sin(G.tick * 0.09 + i * 1.7) * 5;
    ctx.fillStyle = rgba(G.theme.hostile, 0.16 + n * 0.14);
    ctx.beginPath();
    ctx.moveTo(x - 9, top);
    ctx.quadraticCurveTo(x - 3, top - fl * 0.5, x + (n - 0.5) * 6, top - fl);
    ctx.quadraticCurveTo(x + 4, top - fl * 0.45, x + 9, top);
    ctx.closePath();
    ctx.fill();
  });
  ctx.restore();
}

/** Racks de servidores: gabinetes altos con filas de LEDs que titilan. */
function racks(ctx, L, color, off, base, w, h, seed) {
  scatterLoop(L.count, w, off, (i, x) => {
    const n = noise2(i * 3.9, seed);
    const hh = L.height * (0.6 + n * 0.5);
    const rw = 26 + n * 10;
    ctx.fillStyle = color;
    ctx.fillRect(x, base - hh, rw, hh);
    ctx.fillStyle = rgba('#000000', 0.18);
    for (let u = base - hh + 6; u < base - 4; u += 8) ctx.fillRect(x + 3, u, rw - 6, 1.4);

    for (let u = base - hh + 9, k = 0; u < base - 6; u += 8, k++) {
      const on = noise2(i * 7 + k, ((G.tick / 22) | 0) + seed) > 0.5;
      if (!on) continue;
      ctx.fillStyle = rgba(noise2(i + k, seed) > 0.8 ? G.theme.hostile : G.theme.accent, 0.55);
      ctx.fillRect(x + rw - 7, u - 1, 2.2, 2.2);
    }
  });
}

/** Mástiles de red en celosía, con la luz de balizamiento parpadeando arriba. */
function antennas(ctx, L, color, off, base, w, h, seed) {
  ctx.strokeStyle = color;
  scatterLoop(L.count, w, off, (i, x) => {
    const n = noise2(i * 5.1, seed);
    const hh = L.height * (0.6 + n * 0.6);
    const bw = 10 + n * 8;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - bw, base); ctx.lineTo(x, base - hh); ctx.lineTo(x + bw, base);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = 1; k < 6; k++) {
      const t = k / 6, y = base - hh * t, half = bw * (1 - t);
      ctx.moveTo(x - half, y); ctx.lineTo(x + half * 0.7, y - hh / 6);
    }
    ctx.moveTo(x - bw * 0.5, base - hh * 0.62); ctx.lineTo(x + bw * 0.5, base - hh * 0.62);
    ctx.stroke();
    if (((G.tick + i * 23) % 70) < 34) {
      ctx.fillStyle = rgba(G.theme.hostile, 0.7);
      ctx.beginPath();
      ctx.arc(x, base - hh - 2, 1.8, 0, 6.283);
      ctx.fill();
    }
  });
}

/**
 * Pistas de circuito impreso: tramos en L que terminan en un nodo, y cada tanto
 * un pulso de luz que las recorre. Es la capa que dice "estás adentro de la
 * máquina" sin tener que dibujar una sola pared.
 */
function circuit(ctx, L, color, off, base, w, h, seed) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  scatterLoop(L.count, w, off, (i, x) => {
    const n = noise2(i * 6.3, seed);
    const up = L.height * (0.4 + n * 0.8);
    const run = (n > 0.5 ? 1 : -1) * (18 + n * 40);
    const y0 = base, y1 = base - up;
    ctx.beginPath();
    ctx.moveTo(x, y0 + 40);
    ctx.lineTo(x, y1);
    ctx.lineTo(x + run, y1);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + run, y1, 3.2, 0, 6.283);
    ctx.fill();

    const p = ((G.tick * 0.012 + n * 5) % 1);
    if (p < 0.6) {
      const k = p / 0.6, seg = up + Math.abs(run);
      const d = k * seg;
      const px = d < up ? x : x + Math.sign(run) * (d - up);
      const py = d < up ? y0 - d : y1;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = rgba(G.theme.accent, 0.45);
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, 6.283);
      ctx.fill();
      ctx.restore();
    }
  });
  ctx.restore();
}

/* ─────────────────────────────── aire */

function ambient(ctx, th, w, h) {
  const A = th.ambient;
  if (!A) return;
  const t = G.tick;

  ctx.save();
  if (A.kind === 'rain') {
    ctx.strokeStyle = rgba(A.color, 0.24);
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    for (let i = 0; i < A.count; i++) {
      const n = noise2(i, 3);
      const x = ((i * 53 + n * 40 - G.cam.x * 0.4 - t * 1.4) % (w + 40) + w + 40) % (w + 40) - 20;
      const y = ((i * 37 + t * A.speed * (0.7 + n * 0.6)) % (h + 40)) - 20;
      ctx.moveTo(x, y);
      ctx.lineTo(x - 2.2, y + 9 + n * 5);
    }
    ctx.stroke();
  } else if (A.kind === 'snow') {
    for (let i = 0; i < A.count; i++) {
      const n = noise2(i, 7);
      const sway = Math.sin(t * 0.017 + i) * 12;
      const x = ((i * 47 + sway - G.cam.x * 0.28) % (w + 30) + w + 30) % (w + 30) - 15;
      const y = ((i * 31 + t * A.speed * (0.5 + n)) % (h + 30)) - 15;
      ctx.fillStyle = rgba(A.color, 0.2 + n * 0.5);
      ctx.beginPath();
      ctx.arc(x, y, 0.6 + n * 1.5, 0, 6.283);
      ctx.fill();
    }
  } else if (A.kind === 'binary') {
    /* lluvia de unos y ceros: cada columna cae a su ritmo y cambia de dígito
       al paso del boil, no cada cuadro, así no se vuelve estática de TV */
    ctx.font = '8px "Special Elite", "Courier New", monospace';
    ctx.textAlign = 'center';
    const step = boilStep();
    for (let i = 0; i < A.count; i++) {
      const n = noise2(i, 13);
      const x = ((i * 67 + n * 30 - G.cam.x * 0.3) % (w + 30) + w + 30) % (w + 30) - 15;
      const y = ((i * 29 + t * A.speed * (0.5 + n)) % (h + 30)) - 15;
      ctx.fillStyle = rgba(A.color, 0.1 + n * 0.28);
      ctx.fillText(noise2(i, step) > 0.5 ? '1' : '0', x, y);
    }
  } else if (A.kind === 'embers') {
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < A.count; i++) {
      const n = noise2(i, 11);
      const x = ((i * 61 + Math.sin(t * 0.01 + i) * 20 - G.cam.x * 0.3) % (w + 40) + w + 40) % (w + 40) - 20;
      const y = ((i * 43 + t * A.speed * (0.6 + n)) % (h + 40) + h + 40) % (h + 40) - 20;
      const a = 0.25 + Math.sin(t * 0.05 + i) * 0.22;
      ctx.fillStyle = rgba(A.color, Math.max(0, a));
      ctx.fillRect(x, y, 1.2 + n, 1.2 + n * 2);
    }
  } else { /* motes / dust */
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < A.count; i++) {
      const n = noise2(i, 5);
      const x = ((i * 59 + Math.sin(t * 0.008 + i * 2) * 26 - G.cam.x * 0.34 - t * A.speed) % (w + 50) + w + 50) % (w + 50) - 25;
      const y = ((i * 41 + Math.sin(t * 0.012 + i) * 18 - G.cam.y * 0.34) % (h + 50) + h + 50) % (h + 50) - 25;
      ctx.fillStyle = rgba(A.color, (0.08 + n * 0.22) * (0.6 + Math.sin(t * 0.04 + i) * 0.4));
      ctx.beginPath();
      ctx.arc(x, y, 0.5 + n * 1.2, 0, 6.283);
      ctx.fill();
    }
  }
  ctx.restore();
}

/**
 * Viraje, viñeta y pátina de proyector. El cuadro tiene que parecer una copia
 * de 35 mm gastada: virada al sepia, con el brillo latiendo, polvo pegado a la
 * emulsión y alguna rayadura que baja por la ventanilla.
 */
export function drawGrade(ctx, w, h) {
  const th = G.theme;
  ctx.fillStyle = th.grade;
  ctx.fillRect(0, 0, w, h);

  /* viraje sepia: lo que unifica los seis sectores bajo una misma copia.
     Un velo cálido plano en vez de un modo de fusión — cuesta un fillRect y no
     obliga al navegador a salir de la ruta rápida de composición. */
  ctx.fillStyle = 'rgba(198,152,88,0.11)';
  ctx.fillRect(0, 0, w, h);

  /* viñeta cálida, no negra: el borde de la lente tiñe, no apaga */
  const v = ctx.createRadialGradient(w / 2, h * 0.52, h * 0.30, w / 2, h * 0.52, h * 0.98);
  v.addColorStop(0, 'rgba(60,34,14,0)');
  v.addColorStop(1, rgba('#3c220e', th.vignette));
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);

  filmPass(ctx, w, h);
}

/** Parpadeo de lámpara, grano, pelusa y rayaduras. Todo a la cadencia del boil. */
function filmPass(ctx, w, h) {
  const step = boilStep();

  /* latido de la lámpara: sube y baja un pelo la exposición */
  const flick = (noise2(step, 3.3) - 0.5) * 0.05;
  if (flick > 0) {
    ctx.fillStyle = `rgba(255,244,214,${flick})`;
    ctx.fillRect(0, 0, w, h);
  } else {
    ctx.fillStyle = `rgba(30,20,12,${-flick})`;
    ctx.fillRect(0, 0, w, h);
  }

  /* grano: cambia todos los cuadros, si no no se lee como grano */
  ctx.save();
  ctx.globalAlpha = 0.05;
  for (let i = 0; i < 220; i++) {
    const x = (noise2(i, G.tick % 17) * w) | 0;
    const y = (noise2(i + 31, (G.tick + 7) % 19) * h) | 0;
    ctx.fillStyle = i % 2 ? '#fff4d6' : INK;
    ctx.fillRect(x, y, 1, 1);
  }

  /* pelusa y motas pegadas a la emulsión: sólo doce veces por segundo */
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = INK;
  const specks = 3 + ((noise2(step, 8.1) * 4) | 0);
  for (let i = 0; i < specks; i++) {
    const x = noise2(step * 2 + i, 1.7) * w;
    const y = noise2(step * 2 + i, 5.9) * h;
    const long = noise2(step + i, 9.4) > 0.7;
    ctx.fillRect(x, y, long ? 0.8 : 1.4, long ? 4 + noise2(i, step) * 5 : 1.4);
  }

  /* rayadura vertical: aparece un instante y se va */
  if (noise2(step, 12.7) > 0.86) {
    const x = Math.round(noise2(step, 4.2) * w);
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = '#fff6dc';
    ctx.fillRect(x, 0, 0.8, h);
    ctx.fillStyle = INK;
    ctx.fillRect(x + 0.9, 0, 0.5, h);
  }
  ctx.restore();
}
