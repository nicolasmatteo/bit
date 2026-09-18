/* Estado compartido. Un único objeto mutable para el mundo y otro para Bit.
   Todos los sistemas leen de acá; nadie guarda copias. */

import { PLAYER } from '../config.js';
import { clearActions } from './actions.js';

export const G = {
  /* menu | brief | play | pause | dying | clear | over | win */
  mode: 'menu',

  levelIndex: 0,
  level: null,
  theme: null,

  /* geometría */
  grid: null,          // Uint8Array plano: 1 = sólido
  cols: 0, rows: 0,
  mapW: 0, mapH: 0,
  oneways: [],         // losas agrupadas {x,y,w,h}
  spikes: [],
  hazards: [],         // charcos agrupados {x,y,w,h}
  movers: [],
  locks: [],           // zonas cifradas por los ransomware: anulan el piso que tapan
  decals: [],          // detalles estáticos calculados al cargar

  /* entidades */
  enemies: [], crates: [], pickups: [],
  /* Los tipos de proceso hostil que el mapa plantó en este sector, tomados una
     sola vez al construirlo. Lo usa el Spyware para saber a quién llamar: pide
     refuerzos de lo que el sector ya tiene, así escala solo de la capa 1 a la 11
     sin que nadie mantenga una tabla aparte. Se toma al construir y no sobre
     G.enemies en vivo porque a mitad de partida esa lista ya tiene cosas que el
     mapa nunca puso —bichos, ventanas, ecos— y el padrón derivaría. */
  roster: [],
  bullets: [], ebullets: [], grenades: [],
  parts: [], booms: [], rings: [], beams: [], pops: [],

  goal: null,
  checkpoints: [],
  spawn: { x: 0, y: 0 },

  /* cámara y cuadro */
  cam: { x: 0, y: 0, tx: 0, ty: 0, shake: 0, flash: 0, tint: null },
  view: { w: 640, h: 360, scale: 1 },

  tick: 0,
  slowmo: 0,
  /* multiplicador de gravedad de la arena. Lo da vuelta el pozo del Monarca;
     vuelve a 1 al cargar nivel, al reaparecer y cuando el jefe cae. */
  gravMul: 1,
  stateT: 0,           // frames dentro del modo actual

  /* Lo que el juego ya enseñó en esta partida. Se limpia al empezar de nuevo y
     no al cambiar de sector: una lección se da una sola vez. */
  taught: { parry: false },
  lesson: 0,           // frames que le quedan al cartel de la lección

  stats: { shards: 0, shardsTotal: 0, kills: 0, deaths: 0, frames: 0 },
  run:   { deaths: 0, shards: 0, frames: 0 },

  terrain: null,       // trozos pre-renderizados
};

export const P = {
  x: 0, y: 0, w: PLAYER.w, h: PLAYER.h,
  vx: 0, vy: 0,
  face: 1,
  onGround: false, hitWall: false, carrier: null, platform: null,
  jumps: 0, coyote: 0, buffer: 0, holding: false,
  hp: PLAYER.maxHp, maxHp: PLAYER.maxHp,
  invuln: 0, cooldown: 0,
  weapon: 'ping', weapons: { ping: Infinity }, ammo: Infinity, grenades: PLAYER.startGrenades,

  /* dash de encriptación, parry rosa y barra de Purga */
  dash: 0, dashCd: 0, dashDir: 1, dashUsed: false,
  parry: 0, parryCd: 0, parryHit: 0,
  meter: 0, purge: 0,
  aimDir: 0, aimAngle: 0.30,     // -1 arriba, 0 al frente, 1 abajo (en el aire)
  anim: 0, land: 0, spin: 0, spinV: 0,

  /* retroceso y fogonazo: cuadros restantes + el total con que arrancaron, para
     poder normalizar la curva sin que cada arma tenga que durar lo mismo */
  recoil: 0, recoilMax: 1,
  muzzle: 0, muzzleMax: 1, muzzleSeed: 0,
  pump: 0, pumpMax: 1,           // corredera del Antivirus, tras el barrido
  charge: 0,                     // carga del Firewall: cuadros con el gatillo apretado
  blink: 0,                      // parpadeo de dibujo animado
  hurtT: 0,                      // cuadros de reacción al golpe (animación)
  trail: [],           // estela del faldón del gabán

  /* movimiento secundario e interpolación de la pose: todo continuo,
     nada de saltos entre "estados" de animación */
  turn: 1,                       // signo visual del giro, se desliza hacia P.face
  airBlend: 0,                   // 0 en el suelo, 1 en el aire (con inercia)
  stride: 0,                     // 0..1: qué tanto de la zancada completa se usa
  coat: { x: 0, v: 0 },          // resorte del faldón del gabán
  hair: { x: 0, v: 0 },          // resorte de la inclinación del sombrero

  dead: false,
};

export function resetPlayer(x, y) {
  P.x = x; P.y = y;
  P.vx = 0; P.vy = 0;
  P.onGround = false; P.carrier = null;
  P.jumps = 0; P.coyote = 0; P.buffer = 0; P.holding = false;
  P.hp = P.maxHp;
  P.invuln = 80; P.cooldown = 0;
  P.recoil = 0; P.recoilMax = 1;
  P.muzzle = 0; P.muzzleMax = 1; P.muzzleSeed = 0;
  P.pump = 0; P.pumpMax = 1; P.charge = 0; P.blink = 0; P.hurtT = 0;
  P.dash = 0; P.dashCd = 0; P.dashUsed = false;
  P.parry = 0; P.parryCd = 0; P.parryHit = 0;
  P.purge = 0;   // la barra (P.meter) sobrevive a la muerte: es progreso, no estado
  P.anim = 0; P.land = 0; P.spin = 0; P.spinV = 0;
  P.aimDir = 0; P.aimAngle = 0.30;
  P.turn = P.face; P.airBlend = 0; P.stride = 0;
  P.coat.x = 0; P.coat.v = 0; P.hair.x = 0; P.hair.v = 0;
  P.dead = false;
  P.trail.length = 0;
  /* La cinta se corta acá: morir o empezar un nivel invalida lo que cualquier
     Keylogger creía saber de vos. Va en resetPlayer porque es el único punto por
     el que pasan las dos cosas. */
  clearActions();
}
