/* Paletas y recetas de fondo. Cada tema describe el aire de un tramo de la red:
   cielo, niebla, capas de parallax, partículas ambientales y viraje final.
   El renderizador no inventa colores: todos salen de acá.

   Los sectores siguen la defensa en profundidad: cada uno es una capa, de
   afuera hacia adentro, en el mismo orden en que un atacante las tendría que
   ir rompiendo. La dificultad sube en ese mismo orden, así que avanzar en el
   juego y meterse más hondo en el sistema son la misma cosa.

     01 Perímetro   perímetro     el cortafuegos, donde llega el spam
     02 Puerto 443  red           el tráfico, donde se cuelan keyloggers y gusanos
     03 Caché       aplicación    el servidor de correo, donde se esconde el phishing
     04 Pestaña     sesión        la sesión del usuario: adware y spyware
     05 Kernel      sistema       el núcleo del SO, donde el troyano abre su carga
     06 Modo Oscuro sombra        lo que el sistema no lista: el rootkit
     07 Respaldo    datos         las copias de seguridad, lo que el ransomware busca
     08 Raíz        control total permisos totales: el Monarca
     09 Arranque    firmware      debajo del sistema: lo que sobrevive al apagón
     10 Microcódigo microcódigo   adentro de la pieza, donde ya no hay cielo
     11 Silicio     silicio       la pieza misma, y el Implante soldado a ella

   Ganarle a la raíz no era el final: un implante de firmware vive más abajo
   que el sistema operativo, así que sobrevive a que le ganes el root y a que
   apagues la máquina. Las tres capas nuevas siguen el mismo orden de siempre —
   más adentro, más hondo — hasta llegar al silicio, donde ya no hay software
   que limpiar.

   La aplicación va antes que el kernel porque corre encima de él: comprometer
   un programa no es tener el sistema, y llegar al kernel es ir más hondo. Las
   claves de abajo no siguen este orden — las usa levels.js por nombre.

   Sigue siendo un corto de los treinta, así que el neón no gana nunca: el
   cielo es de acuarela y la tecnología aparece como silueta en el fondo. Las
   únicas luces son chicas — LEDs, balizas, pulsos por una pista. */

export const THEMES = {

  /* ─────────────────── 01 · El Perímetro (el cortafuegos arde en el horizonte) */
  edge: {
    name: 'perimetro',
    sky: [[0, '#0d2233'], [0.42, '#1f4a55'], [0.76, '#8a5a3c'], [1, '#e89a52']],
    fog: '#6f7c74',
    light: '#e8f6ef',
    accent: '#4fe8b0',
    hostile: '#ff6a3c',
    cloak: '#2f9fd4',
    rock: { deep: '#141f26', body: '#26383f', edge: '#3a5058', crust: '#2f6b5c', crustLit: '#4fe8b0' },
    plat: { body: '#2a4048', lit: '#5fb0a0' },
    liquid: ['#0b2a30', '#127a70', '#5ff0cd'],
    sun: null,
    layers: [
      { kind: 'grid',     depth: 0.04, base: 0.64, tint: 0.86 },
      { kind: 'antennas', depth: 0.16, base: 0.66, tint: 0.62, count: 8, height: 120 },
      { kind: 'firewall', depth: 0.34, base: 0.86, tint: 0.40, count: 24, height: 58 },
      { kind: 'ridge',    depth: 0.70, amp: 10, base: 1.04, tint: 0.08 },
    ],
    ambient: { kind: 'binary', color: '#8dffc9', count: 40, speed: 0.55 },
    grade: 'rgba(90,150,130,0.08)',
    vignette: 0.44,
    drone: 52,
  },

  /* ─────────────────── 03 · La Caché — aplicación (el servidor de correo, ámbar recalentado) */
  cache: {
    name: 'cache',
    sky: [[0, '#2a1630'], [0.40, '#6b2f3a'], [0.72, '#c2703c'], [1, '#f0c27a']],
    fog: '#b8845a',
    light: '#fff3d4',
    accent: '#46c8f0',
    hostile: '#e8412e',
    cloak: '#2f9fd4',
    rock: { deep: '#2a1a14', body: '#523524', edge: '#734a30', crust: '#8a5a2c', crustLit: '#f0c766' },
    plat: { body: '#5a3a24', lit: '#c08a4a' },
    liquid: ['#4a1606', '#b84a14', '#ffb45e'],
    sun: null,
    layers: [
      { kind: 'circuit', depth: 0.06, base: 0.70, tint: 0.84, count: 14, height: 110 },
      { kind: 'racks',   depth: 0.22, base: 0.84, tint: 0.58, count: 11, height: 150 },
      { kind: 'racks',   depth: 0.48, base: 1.00, tint: 0.28, count: 7,  height: 190 },
      { kind: 'ridge',   depth: 0.72, amp: 8, base: 1.08, tint: 0.08 },
    ],
    ambient: { kind: 'dust', color: '#ffe6b4', count: 44, speed: 0.45 },
    grade: 'rgba(210,140,60,0.10)',
    vignette: 0.40,
    drone: 44,
  },

  /* ─────────────────── 02 · Puerto 443 — red (la lluvia del tráfico cifrado) */
  port: {
    name: 'puerto',
    sky: [[0, '#0c1a2c'], [0.40, '#1d3b58'], [0.74, '#4f7a94'], [1, '#aac4c8']],
    fog: '#7c98a8',
    light: '#f0f4e8',
    accent: '#3fd0c4',
    hostile: '#f0563c',
    cloak: '#2f7fd4',
    rock: { deep: '#0f1c28', body: '#253c4c', edge: '#3f5a6a', crust: '#35606a', crustLit: '#7fe0e0' },
    plat: { body: '#2a4454', lit: '#6d9fb0' },
    liquid: ['#0a2a30', '#166069', '#5fd6e2'],
    sun: null,
    layers: [
      { kind: 'grid',     depth: 0.05, base: 0.62, tint: 0.86 },
      { kind: 'antennas', depth: 0.20, base: 0.82, tint: 0.56, count: 10, height: 150 },
      { kind: 'circuit',  depth: 0.44, base: 0.98, tint: 0.28, count: 16, height: 90 },
      { kind: 'ridge',    depth: 0.74, amp: 8, base: 1.08, tint: 0.06 },
    ],
    ambient: { kind: 'binary', color: '#9fe4ff', count: 70, speed: 1.6 },
    grade: 'rgba(110,140,160,0.10)',
    vignette: 0.48,
    drone: 48,
  },

  /* ─────────────────── 04 · El Kernel (abajo del todo, donde duele) */
  kernel: {
    name: 'kernel',
    sky: [[0, '#130a1c'], [0.42, '#2e1240'], [0.76, '#5a2150'], [1, '#9a4058']],
    fog: '#6e3050',
    light: '#ffd79a',
    accent: '#b98cff',
    hostile: '#ff4f66',
    cloak: '#2f9fd4',
    rock: { deep: '#150a1c', body: '#321e44', edge: '#4f2f62', crust: '#5a3470', crustLit: '#c08cff' },
    plat: { body: '#38214c', lit: '#7c4f90' },
    liquid: ['#32061f', '#8e1338', '#ff6b7a'],
    sun: null,
    layers: [
      { kind: 'cave',    depth: 0.12, base: 0.0,  tint: 0.72, count: 22 },
      { kind: 'circuit', depth: 0.30, base: 0.90, tint: 0.46, count: 18, height: 130 },
      { kind: 'crystal', depth: 0.52, base: 1.00, tint: 0.24, count: 14, height: 60 },
    ],
    ambient: { kind: 'embers', color: '#ffb469', count: 36, speed: -0.35 },
    grade: 'rgba(150,70,150,0.10)',
    vignette: 0.58,
    drone: 38,
  },

  /* ─────────────────── 04 · La Pestaña — sesión (la capa del usuario: ruido,
     carteles y cosas que parpadean. Es el único sector donde el color grita —
     el resto del juego está virado al sepia, así que acá el mal gusto es la
     amenaza) */
  tab: {
    name: 'pestana',
    sky: [[0, '#2b1040'], [0.38, '#7a2560'], [0.72, '#d4525f'], [1, '#f3b06a']],
    fog: '#b4738f',
    light: '#fff0e0',
    accent: '#ffd23d',
    hostile: '#ff3d7a',
    cloak: '#2f9fd4',
    rock: { deep: '#1d1024', body: '#33203f', edge: '#513460', crust: '#b83d7a', crustLit: '#ff8ec4' },
    plat: { body: '#3a2547', lit: '#d46a9e' },
    liquid: ['#2a0e2e', '#8e2a6b', '#ff77c4'],
    sun: null,
    layers: [
      { kind: 'grid',    depth: 0.05, base: 0.62, tint: 0.84 },
      { kind: 'towers',  depth: 0.20, base: 0.90, tint: 0.54, count: 11, height: 150 },
      { kind: 'circuit', depth: 0.38, base: 0.94, tint: 0.34, count: 16, height: 110 },
      { kind: 'ridge',   depth: 0.72, amp: 8, base: 1.04, tint: 0.10 },
    ],
    ambient: { kind: 'dust', color: '#ffd9f2', count: 54, speed: 0.5 },
    grade: 'rgba(160,60,120,0.10)',
    vignette: 0.40,
    drone: 62,
  },

  /* ─────────────────── 06 · Modo Oscuro — sombra (lo que el sistema no lista.
     Casi todo el sector es silueta contra un cielo apagado: acá ver es la
     mecánica, y por eso es el único tema que baja la luz en vez de subirla) */
  shade: {
    name: 'sombra',
    sky: [[0, '#05060a'], [0.44, '#0d1220'], [0.78, '#1b2338'], [1, '#2f3a52']],
    fog: '#2a3346',
    light: '#9fb4d0',
    accent: '#b98cff',
    hostile: '#7a5cff',
    cloak: '#2f9fd4',
    rock: { deep: '#06070c', body: '#141a26', edge: '#232c3e', crust: '#2b2140', crustLit: '#7a5cff' },
    plat: { body: '#18202e', lit: '#3d4a66' },
    liquid: ['#05060e', '#1a1040', '#6a4cff'],
    sun: null,
    layers: [
      { kind: 'cave',    depth: 0.10, base: 0.0,  tint: 0.80, count: 24 },
      { kind: 'columns', depth: 0.28, base: 0.96, tint: 0.52, count: 12, height: 190 },
      { kind: 'crystal', depth: 0.50, base: 1.02, tint: 0.26, count: 12, height: 56 },
    ],
    ambient: { kind: 'binary', color: '#7a5cff', count: 26, speed: 0.35 },
    grade: 'rgba(40,40,110,0.12)',
    vignette: 0.66,
    drone: 34,
  },

  /* ─────────────────── 07 · El Respaldo (almacenamiento en frío, literal) */
  backup: {
    name: 'respaldo',
    sky: [[0, '#1a2c48'], [0.38, '#3e6088'], [0.72, '#86aac2'], [1, '#e2ecef']],
    fog: '#c8dce6',
    light: '#ffffff',
    accent: '#4fd6f2',
    hostile: '#b98cff',
    cloak: '#2f7fd4',
    rock: { deep: '#1e3044', body: '#38526a', edge: '#56768e', crust: '#cfe2ec', crustLit: '#ffffff' },
    plat: { body: '#405a74', lit: '#a3c2d4' },
    liquid: ['#123a4e', '#2a7f96', '#a8ecff'],
    sun: null,
    layers: [
      { kind: 'racks', depth: 0.08, base: 0.70, tint: 0.86, count: 14, height: 120 },
      { kind: 'racks', depth: 0.24, base: 0.86, tint: 0.62, count: 10, height: 170 },
      { kind: 'racks', depth: 0.46, base: 1.02, tint: 0.32, count: 6,  height: 220 },
    ],
    ambient: { kind: 'snow', color: '#ffffff', count: 90, speed: 0.9 },
    grade: 'rgba(170,200,220,0.08)',
    vignette: 0.36,
    drone: 58,
  },

  /* ─────────────────── 06 · Núcleo Raíz (permisos totales, todo en llamas) */
  root: {
    name: 'raiz',
    sky: [[0, '#1f080c'], [0.36, '#5a1614'], [0.70, '#a83c1c'], [1, '#e89048']],
    fog: '#b04c1e',
    light: '#ffdcac',
    accent: '#4fe8b0',
    hostile: '#ff9036',
    cloak: '#2f9fd4',
    rock: { deep: '#180e0c', body: '#36221c', edge: '#523428', crust: '#6a4230', crustLit: '#ff9a4e' },
    plat: { body: '#3e2820', lit: '#7d5237' },
    liquid: ['#480c00', '#b52c06', '#ff9a3e'],
    sun: null,
    layers: [
      { kind: 'circuit', depth: 0.06, base: 0.66, tint: 0.82, count: 12, height: 120 },
      { kind: 'towers',  depth: 0.22, base: 0.92, tint: 0.52, count: 9, height: 160 },
      { kind: 'towers',  depth: 0.46, base: 1.02, tint: 0.24, count: 6, height: 210 },
    ],
    ambient: { kind: 'embers', color: '#ffb05e', count: 64, speed: -0.9 },
    grade: 'rgba(200,90,30,0.11)',
    vignette: 0.52,
    drone: 41,
  },
  /* ─────────────────── 09 · El Arranque — firmware (debajo del sistema
     operativo, donde las cosas siguen existiendo después de apagar. Todavía no
     amaneció: el cielo es el azul de antes del POST, y lo único caliente en el
     cuadro es la línea del horizonte) */
  boot: {
    name: 'arranque',
    sky: [[0, '#03060d'], [0.40, '#0a1830'], [0.74, '#1c3a5e'], [1, '#9fc4d8']],
    fog: '#3c5a74',
    light: '#dff0ff',
    accent: '#7ddfff',
    hostile: '#ff8a4c',
    cloak: '#2f9fd4',
    rock: { deep: '#050a12', body: '#16222f', edge: '#27394b', crust: '#2e4e64', crustLit: '#7ddfff' },
    plat: { body: '#1b2a39', lit: '#4a7a94' },
    liquid: ['#04121c', '#0f4a66', '#5fd8ff'],
    sun: null,
    layers: [
      { kind: 'grid',    depth: 0.04, base: 0.60, tint: 0.88 },
      { kind: 'racks',   depth: 0.18, base: 0.88, tint: 0.58, count: 12, height: 150 },
      { kind: 'columns', depth: 0.40, base: 1.00, tint: 0.30, count: 10, height: 210 },
    ],
    ambient: { kind: 'binary', color: '#7ddfff', count: 44, speed: 0.6 },
    grade: 'rgba(60,120,170,0.09)',
    vignette: 0.50,
    drone: 44,
  },

  /* ─────────────────── 10 · Microcódigo (adentro de la pieza: cobre grabado y
     verde de osciloscopio. Es el sector más cerrado del juego, y el color lo
     dice — acá ya no hay cielo, hay sustrato) */
  micro: {
    name: 'microcodigo',
    sky: [[0, '#02110a'], [0.42, '#06301c'], [0.76, '#0d5a33'], [1, '#3f9d63']],
    fog: '#2b6b47',
    light: '#d8ffe8',
    accent: '#7dff9f',
    hostile: '#ff5a46',
    cloak: '#2f9fd4',
    rock: { deep: '#02100a', body: '#123322', edge: '#1e4c33', crust: '#8a6a2e', crustLit: '#e8b84a' },
    plat: { body: '#163c28', lit: '#4f8f63' },
    liquid: ['#04200f', '#0f7a3a', '#6dffa0'],
    sun: null,
    layers: [
      { kind: 'circuit', depth: 0.06, base: 0.64, tint: 0.86, count: 20, height: 130 },
      { kind: 'circuit', depth: 0.26, base: 0.92, tint: 0.52, count: 14, height: 180 },
      { kind: 'crystal', depth: 0.48, base: 1.02, tint: 0.26, count: 14, height: 64 },
    ],
    ambient: { kind: 'dust', color: '#9fffc4', count: 50, speed: 0.4 },
    grade: 'rgba(40,150,90,0.10)',
    vignette: 0.60,
    drone: 36,
  },

  /* ─────────────────── 11 · Silicio (la última capa: la pieza misma, vista de
     tan cerca que la geometría se vuelve paisaje. Blanco y violeta de foto de
     microscopio — el único sector que no tiene sombra de máquina, porque acá
     la máquina es el suelo) */
  silicio: {
    name: 'silicio',
    sky: [[0, '#0a0614'], [0.38, '#241443'], [0.72, '#5b3a94'], [1, '#c9b6ea']],
    fog: '#7a63a8',
    light: '#ffffff',
    accent: '#c9a0ff',
    hostile: '#ff4f9a',
    cloak: '#2f9fd4',
    rock: { deep: '#080510', body: '#1e1633', edge: '#332552', crust: '#6a4ea8', crustLit: '#e0ccff' },
    plat: { body: '#261b40', lit: '#7d63b8' },
    liquid: ['#12042a', '#4a1a8e', '#c48cff'],
    sun: null,
    layers: [
      { kind: 'crystal', depth: 0.08, base: 0.72, tint: 0.84, count: 18, height: 90 },
      { kind: 'towers',  depth: 0.24, base: 0.94, tint: 0.54, count: 10, height: 170 },
      { kind: 'cave',    depth: 0.46, base: 0.0,  tint: 0.28, count: 20 },
    ],
    ambient: { kind: 'embers', color: '#e0ccff', count: 40, speed: -0.5 },
    grade: 'rgba(130,90,200,0.10)',
    vignette: 0.56,
    drone: 30,
  },
};
