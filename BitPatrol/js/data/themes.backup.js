/* Paletas y recetas de fondo. Cada tema describe el aire de un tramo de la red:
   cielo, niebla, capas de parallax, partículas ambientales y viraje final.
   El renderizador no inventa colores: todos salen de acá.

   Pintadas al modo de un corto de los años treinta — acuarela saturada, medios
   tonos claros, horizonte crema — pero con la topología de una intrusión: del
   perímetro exterior hasta la raíz. Los grises apagados de antes se comían el
   contorno de tinta de las figuras; estos lo dejan respirar. */

export const THEMES = {

  /* ─────────────────── 01 · El Perímetro (fósforo verde, la orilla de la red) */
  edge: {
    name: 'perimetro',
    sky: [[0, '#0f4a44'], [0.40, '#2c7a63'], [0.74, '#7fb277'], [1, '#e2d9a0']],
    fog: '#a8c485',
    light: '#e8ffd6',
    accent: '#4fe8b0',
    hostile: '#ef4f3c',
    cloak: '#2f9fd4',
    rock: { deep: '#122a22', body: '#255140', edge: '#367055', crust: '#4f9450', crustLit: '#8ad35e' },
    plat: { body: '#2c5a4a', lit: '#6fb48d' },
    liquid: ['#0b3330', '#12776a', '#5ff0cd'],
    sun: { x: 0.68, y: 0.30, r: 54, color: '#f2ffd4', halo: 0.40 },
    layers: [
      { kind: 'ridge',  depth: 0.10, amp: 30, base: 0.60, tint: 0.80 },
      { kind: 'ridge',  depth: 0.22, amp: 22, base: 0.74, tint: 0.55 },
      { kind: 'trees',  depth: 0.42, base: 0.88, tint: 0.28, count: 26, height: 96 },
      { kind: 'trees',  depth: 0.72, base: 1.02, tint: 0.06, count: 16, height: 150 },
    ],
    ambient: { kind: 'motes', color: '#d8ffae', count: 46, speed: 0.18 },
    grade: 'rgba(160,190,90,0.08)',
    vignette: 0.40,
    drone: 52,
  },

  /* ─────────────────── 02 · La Caché (ámbar recalentado, datos rancios) */
  cache: {
    name: 'cache',
    sky: [[0, '#5e2f62'], [0.34, '#bd5236'], [0.68, '#e79a4e'], [1, '#f8e0a6']],
    fog: '#eab878',
    light: '#fff3d4',
    accent: '#46c8f0',
    hostile: '#e8412e',
    cloak: '#2f9fd4',
    rock: { deep: '#4a2a18', body: '#8a5228', edge: '#a96a33', crust: '#c9913d', crustLit: '#f0c766' },
    plat: { body: '#6d3f20', lit: '#c08a4a' },
    liquid: ['#5a1c06', '#b84a14', '#ffb45e'],
    sun: { x: 0.74, y: 0.42, r: 76, color: '#ffeab4', halo: 0.66 },
    layers: [
      { kind: 'ridge',   depth: 0.08, amp: 26, base: 0.66, tint: 0.82 },
      { kind: 'ridge',   depth: 0.20, amp: 20, base: 0.80, tint: 0.58 },
      { kind: 'columns', depth: 0.44, base: 0.94, tint: 0.30, count: 12, height: 86 },
      { kind: 'ridge',   depth: 0.70, amp: 12, base: 1.06, tint: 0.10 },
    ],
    ambient: { kind: 'dust', color: '#ffe6b4', count: 54, speed: 0.5 },
    grade: 'rgba(210,140,60,0.10)',
    vignette: 0.36,
    drone: 44,
  },

  /* ─────────────────── 03 · Puerto 443 (la lluvia del tráfico cifrado) */
  port: {
    name: 'puerto',
    sky: [[0, '#16293f'], [0.38, '#2f5470'], [0.72, '#6a8ea3'], [1, '#c2cfc8']],
    fog: '#8ea7b6',
    light: '#f0f4e8',
    accent: '#3fd0c4',
    hostile: '#f0563c',
    cloak: '#2f7fd4',
    rock: { deep: '#111f2b', body: '#2a4252', edge: '#456070', crust: '#5c7a85', crustLit: '#9ab4b8' },
    plat: { body: '#2d4554', lit: '#6d93a5' },
    liquid: ['#0a2a30', '#166069', '#5fd6e2'],
    sun: null,
    layers: [
      { kind: 'ridge',   depth: 0.08, amp: 14, base: 0.62, tint: 0.84 },
      { kind: 'cranes',  depth: 0.24, base: 0.86, tint: 0.52, count: 7, height: 130 },
      { kind: 'crates',  depth: 0.48, base: 0.98, tint: 0.26, count: 24 },
      { kind: 'ridge',   depth: 0.74, amp: 9, base: 1.08, tint: 0.06 },
    ],
    ambient: { kind: 'rain', color: '#cfe4ee', count: 130, speed: 6.5 },
    grade: 'rgba(120,140,140,0.10)',
    vignette: 0.46,
    drone: 48,
  },

  /* ─────────────────── 04 · El Kernel (abajo del todo, donde duele) */
  kernel: {
    name: 'kernel',
    sky: [[0, '#180b22'], [0.42, '#3a1340'], [0.76, '#6d2350'], [1, '#b04a58']],
    fog: '#7e3050',
    light: '#ffd79a',
    accent: '#b98cff',
    hostile: '#ff4f66',
    cloak: '#2f9fd4',
    rock: { deep: '#170a1d', body: '#38204a', edge: '#573168', crust: '#77427f', crustLit: '#b073bb' },
    plat: { body: '#3b2350', lit: '#7c4f90' },
    liquid: ['#32061f', '#8e1338', '#ff6b7a'],
    sun: null,
    layers: [
      { kind: 'cave',    depth: 0.14, base: 0.0, tint: 0.70, count: 22 },
      { kind: 'crystal', depth: 0.34, base: 0.95, tint: 0.40, count: 16, height: 70 },
      { kind: 'cave',    depth: 0.62, base: 0.0, tint: 0.12, count: 14 },
    ],
    ambient: { kind: 'embers', color: '#ffb469', count: 40, speed: -0.35 },
    grade: 'rgba(150,70,150,0.10)',
    vignette: 0.58,
    drone: 38,
  },

  /* ─────────────────── 05 · El Respaldo (almacenamiento en frío, literal) */
  backup: {
    name: 'respaldo',
    sky: [[0, '#2f4a76'], [0.36, '#5e83a8'], [0.70, '#9fc0d0'], [1, '#eef3e6']],
    fog: '#dceaef',
    light: '#ffffff',
    accent: '#4fd6f2',
    hostile: '#f0603c',
    cloak: '#2f7fd4',
    rock: { deep: '#23364a', body: '#3d5872', edge: '#5c7d97', crust: '#dbebf2', crustLit: '#ffffff' },
    plat: { body: '#425c76', lit: '#a3c2d4' },
    liquid: ['#123a4e', '#2a7f96', '#a8ecff'],
    sun: { x: 0.30, y: 0.22, r: 40, color: '#ffffff', halo: 0.32 },
    layers: [
      { kind: 'ridge', depth: 0.07, amp: 34, base: 0.52, tint: 0.88 },
      { kind: 'ridge', depth: 0.18, amp: 24, base: 0.70, tint: 0.66 },
      { kind: 'pines', depth: 0.40, base: 0.90, tint: 0.34, count: 22, height: 74 },
      { kind: 'pines', depth: 0.68, base: 1.04, tint: 0.10, count: 14, height: 110 },
    ],
    ambient: { kind: 'snow', color: '#ffffff', count: 120, speed: 1.1 },
    grade: 'rgba(170,200,220,0.08)',
    vignette: 0.34,
    drone: 58,
  },

  /* ─────────────────── 06 · Núcleo Raíz (permisos totales, todo en llamas) */
  root: {
    name: 'raiz',
    sky: [[0, '#2a0a10'], [0.36, '#6e1a16'], [0.70, '#bc4a1e'], [1, '#f2a04a']],
    fog: '#c4571f',
    light: '#ffdcac',
    accent: '#4fe8b0',
    hostile: '#ff9036',
    cloak: '#2f9fd4',
    rock: { deep: '#1a0f0c', body: '#3a241c', edge: '#573528', crust: '#6f4530', crustLit: '#a76c45' },
    plat: { body: '#402820', lit: '#7d5237' },
    liquid: ['#480c00', '#b52c06', '#ff9a3e'],
    sun: { x: 0.5, y: 0.52, r: 96, color: '#ff9a4e', halo: 0.56 },
    layers: [
      { kind: 'ridge',   depth: 0.08, amp: 18, base: 0.58, tint: 0.80 },
      { kind: 'towers',  depth: 0.22, base: 0.92, tint: 0.52, count: 9, height: 160 },
      { kind: 'towers',  depth: 0.46, base: 1.02, tint: 0.24, count: 6, height: 210 },
    ],
    ambient: { kind: 'embers', color: '#ffb05e', count: 70, speed: -0.9 },
    grade: 'rgba(200,90,30,0.11)',
    vignette: 0.52,
    drone: 41,
  },
};
