/* Bit, el inspector. Todo el peso del juego está en cómo se siente esto:
   aceleración, coyote time, buffer de salto, suspensión en el vértice, un
   segundo impulso que gira sobre sí mismo, el dash de encriptación y el parry
   rosa sobre paquetes corruptos. */

import { PHYS, PLAYER, TS, DASH, PARRY, PURGE } from '../config.js';
import { G, P } from './state.js';
import { Input } from '../input.js';
import { moveActor, rectHitsSolid, breakAllLocks, solidAt, encrypted } from './world.js';
import { WEAPONS, WEAPON_ORDER } from '../data/weapons.js';
import { spawnBullet, throwGrenade } from './projectiles.js';
import { damagePlayer, killPlayer, sinkPlayer, damageEnemy } from './combat.js';
import * as FX from './fx.js';
import { Sfx } from '../audio.js';
import { aabb, clamp, rnd, lerp, springTo } from '../util.js';
import { ACT, logAction, logMove } from './actions.js';
import { purgeKeyloggers } from './enemies.js';

let dropTimer = 0;

/* Ángulo del brazo de disparo (espacio local, antes del espejado por P.face).
   0 = al frente; negativo = arriba; positivo = abajo.

   AIM_REST es la pose relajada, con el cañón algo caído. AIM_FWD es la de
   combate y vale exactamente 0, igual que la dirección real de la bala: antes
   el brazo apuntaba 18° hacia abajo mientras el disparo salía horizontal, y
   arriba/abajo erraban por otros 7°. Ahora el dibujo y la física coinciden. */
const AIM_REST = 0.30, AIM_FWD = 0, AIM_UP = -Math.PI / 2, AIM_DOWN = Math.PI / 2;

/* Geometría del brazo de disparo, compartida por la lógica y el dibujo.
   Con las proporciones de dibujo animado — cabeza enorme, cuerpo mínimo — el
   hombro está mucho más abajo que en un cuerpo realista: queda justo debajo de
   la cabeza, a poco más de la mitad de la altura. */
const SHOULDER_Y = -13.5, ARM_LEN = 9;

export function updatePlayer() {
  if (P.dead) return;

  const wantLeft = Input.held('left');
  const wantRight = Input.held('right');
  const dir = (wantRight ? 1 : 0) - (wantLeft ? 1 : 0);

  /* La cinta. Bit no sabe que lo están anotando —y ésa es la gracia—, así que
     acá no hay lógica de enemigo: sólo se deja constancia de lo que hizo. Quien
     la lee es el Keylogger (ver enemies/keylogger.js). Son cinco líneas en todo
     el archivo, y ninguna cambia lo que Bit hace. */
  logMove(dir);

  /* ── dash de encriptación ───────────────────── */
  if (P.dashCd > 0) P.dashCd--;
  if (P.parryCd > 0) P.parryCd--;
  if (P.parry > 0) P.parry--;
  if (P.parryHit > 0) P.parryHit--;
  if (P.purge > 0) P.purge--;
  if (Input.pressed('dash')) { Input.consume('dash'); startDash(); }
  if (Input.pressed('parry')) { Input.consume('parry'); startParry(); }
  if (Input.pressed('purge')) { Input.consume('purge'); firePurge(); }

  const dashing = P.dash > 0;
  if (dashing) {
    P.dash--;
    P.vx = P.dashDir * DASH.speed;
    P.vy = 0;                                   // el tramo es plano: se lee mejor
    if (G.tick % 2 === 0) FX.ghost(P.x + P.w / 2, P.y + P.h / 2, P.dashDir);
    if (P.dash === 0) { P.vx = P.dashDir * DASH.endVx; P.dashCd = DASH.cooldown; }
  }

  /* ── horizontal ─────────────────────────────── */
  if (!dashing) {
    const accel = P.onGround ? PHYS.accelGround : PHYS.accelAir;
    if (dir !== 0) {
      P.face = dir;
      // girar en el aire responde un poco más rápido que acelerar recto
      const turning = Math.sign(P.vx) !== 0 && Math.sign(P.vx) !== dir;
      P.vx += dir * accel * (turning ? 1.7 : 1);
      P.vx = clamp(P.vx, -PHYS.runSpeed, PHYS.runSpeed);
    } else {
      const drag = P.onGround ? PHYS.dragGround : PHYS.dragAir;
      P.vx += -Math.sign(P.vx) * Math.min(Math.abs(P.vx), drag);
    }
  }

  /* ── salto ──────────────────────────────────── */
  if (Input.pressed('jump')) { P.buffer = PHYS.buffer; Input.consume('jump'); }
  if (P.buffer > 0) P.buffer--;
  if (P.coyote > 0) P.coyote--;

  const holdingJump = Input.held('jump');

  // atravesar una losa hacia abajo
  if (P.buffer > 0 && Input.held('down') && P.onGround && P.platform === null && standingOnOneway()) {
    dropTimer = 9; P.buffer = 0; P.onGround = false; P.coyote = 0; P.jumps = 1;
    P.vy = 1.4;
    FX.dust(P.x + P.w / 2, P.y + P.h, G.theme.fog, 3, 0.7);
  } else if (P.buffer > 0) {
    if (P.onGround || P.coyote > 0) jump(false);
    else if (P.jumps < 2) jump(true);
  }

  // si se cayó de una cornisa sin saltar, gasta el salto de suelo
  if (!P.onGround && P.coyote <= 0 && P.jumps === 0) P.jumps = 1;

  // recorte de altura al soltar
  if (!holdingJump && P.vy < 0 && P.holding) {
    P.vy *= PHYS.cutMul;
    P.holding = false;
  }
  if (!holdingJump) P.holding = false;

  /* ── gravedad con suspensión en el vértice ───── */
  if (!dashing) {
    let g = P.vy < 0 ? PHYS.gravity : PHYS.fallGravity;
    if (Math.abs(P.vy) < PHYS.apexBand && !P.onGround) g = PHYS.apexGravity;
    // G.gravMul lo da vuelta el pozo del Monarca: con valor negativo la arena
    // tira para arriba y hay que pelear contra el techo
    P.vy = clamp(P.vy + g * G.gravMul, -PHYS.maxFall, PHYS.maxFall);
  }

  /* ── desplazamiento ─────────────────────────── */
  if (dropTimer > 0) dropTimer--;
  if (P.carrier) { P.x += P.carrier.dx; P.y += P.carrier.dy; }

  const wasAir = !P.onGround;
  const fallSpeed = P.vy;
  moveActor(P, P.vx, P.vy, { oneway: true, drop: dropTimer > 0 });
  P.carrier = P.platform || null;

  if (P.onGround) {
    if (wasAir && fallSpeed > 3) {
      P.land = Math.min(10, 3 + fallSpeed * 0.7);
      FX.dust(P.x + P.w / 2, P.y + P.h, G.theme.fog, Math.round(2 + fallSpeed * 0.5), 1 + fallSpeed * 0.1);
      if (fallSpeed > 6) { FX.shake(1.4); FX.ring(P.x + P.w / 2, P.y + P.h, 18, G.theme.fog, { life: 14, width: 1.4, alpha: 0.4, squash: 0.28 }); }
      Sfx.land();
    }
    P.jumps = 0;
    P.coyote = PHYS.coyote;
    P.spinV = 0;
    P.spin *= 0.6;
    P.dashUsed = false;      // el dash se recarga al tocar suelo, como el doble salto
  }

  /* ── animación ──────────────────────────────── */
  P.anim += Math.abs(P.vx) * 0.155;
  if (Math.abs(P.vx) < 0.1) P.anim += (0 - (P.anim % (Math.PI * 2))) * 0.08;
  if (P.land > 0) P.land -= 0.7;
  if (P.spinV !== 0) {
    P.spin += P.spinV;
    if (Math.abs(P.spin) >= Math.PI * 2) { P.spin = 0; P.spinV = 0; }
  }
  updateAnimState();


  /* ── armas ──────────────────────────────────── */
  if (P.cooldown > 0) P.cooldown--;
  if (P.recoil > 0) P.recoil--;
  if (P.muzzle > 0) P.muzzle--;
  if (P.pump > 0) P.pump--;
  if (P.invuln > 0) P.invuln--;
  if (P.hurtT > 0) P.hurtT--;

  /* parpadeo: dos cuadros cerrados cada tanto, como cualquier dibujo animado */
  if (P.blink > 0) P.blink--;
  else if (Math.random() < 0.006) P.blink = 7;

  resolveParry();
  updateAiming();
  updateWeaponSelect();

  updateTrigger();
  if (Input.pressed('grenade')) { Input.consume('grenade'); lobGrenade(); }

  /* ── límites y peligros ─────────────────────── */
  P.x = clamp(P.x, 0, G.mapW - P.w);
  // con el pozo del Monarca abierto la arena tira hacia arriba, y los mapas no
  // tienen techo: sin este tope Bit se va del nivel por el borde superior
  if (P.y < 0) { P.y = 0; if (P.vy < 0) P.vy = 0; }
  /* Caerse del mapa es caerse, igual que el agua: vuelve al poste y no cuesta
     integridad. Antes mataba, y matar ahora significa reiniciar el sector
     entero — un pozo no puede costar tanto como quedarse sin vida. */
  if (P.y > G.mapH + 60) { sinkPlayer(); return; }

  for (const s of G.spikes) if (aabb(P, s)) damagePlayer(1, P.x + P.w / 2 - P.face);
  for (const z of G.hazards) if (aabb(P, z)) { sinkPlayer(); return; }

  checkPickups();
  checkCheckpoints();
}

function standingOnOneway() {
  for (const o of G.oneways) {
    if (P.x + P.w > o.x + 1 && P.x < o.x + o.w - 1 && Math.abs(P.y + P.h - o.y) < 2.5) return true;
  }
  return false;
}

function jump(isDouble) {
  // saltar cancela el dash. Si no, el tramo plano vuelve a poner vy en cero al
  // cuadro siguiente y el salto se come sin que se entienda por qué.
  if (P.dash > 0) { P.dash = 0; P.dashCd = DASH.cooldown; }

  P.vy = -(isDouble ? PHYS.doubleV : PHYS.jumpV);
  P.jumps = isDouble ? 2 : 1;
  P.buffer = 0;
  P.coyote = 0;
  P.holding = true;
  P.onGround = false;
  P.carrier = null;

  const cx = P.x + P.w / 2, cy = P.y + P.h;
  if (isDouble) {
    /* la bocanada del segundo salto: el gesto más reconocible del género.
       Un anillo de nubes dibujadas bajo los pies, no una nube difusa. */
    P.spinV = P.face * 0.34;
    FX.ring(cx, cy - 6, 26, G.theme.accent, { life: 20, width: 2, alpha: 0.85, squash: 0.55 });
    FX.spark(cx, cy - 4, G.theme.accent, 12, 2.4, [10, 24]);
    FX.flash(2, G.theme.accent);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      FX.puff(cx + Math.cos(a) * 5, cy - 3 + Math.sin(a) * 2, '#f2e6c4', 1, {
        speed: 0.2, rise: Math.sin(a) * 0.5 - 0.1, size: [2.4, 4], life: [16, 26], alpha: 0.85, grow: 0.22,
      });
    }
  } else {
    FX.dust(cx, cy, G.theme.fog, 4, 0.9);
  }
  Sfx.jump(isDouble);
  logAction(ACT.SALTO);
}

/* ═══════════════════════════ dash, parry y purga ═══════════════════════════ */

/**
 * Dash de encriptación: un tramo plano y corto con invulnerabilidad. Se gasta
 * una sola vez por estadía en el aire, igual que el segundo salto, así que
 * sigue siendo una decisión y no una forma de recorrer el mapa más rápido.
 */
function startDash() {
  if (P.dash > 0 || P.dashCd > 0 || P.dashUsed) return;
  P.dash = DASH.frames;
  P.dashDir = P.face;
  P.dashUsed = true;
  P.invuln = Math.max(P.invuln, DASH.invuln);
  P.spinV = 0; P.spin = 0;
  FX.ring(P.x + P.w / 2, P.y + P.h / 2, 26, '#6ce8ff', { life: 16, width: 2, alpha: 0.8, squash: 0.7 });
  FX.spark(P.x + P.w / 2, P.y + P.h / 2, '#a8f4ff', 9, 2.4, [8, 18]);
  Sfx.dash();
  logAction(ACT.DASH);
}

/**
 * Postura de parry, contra paquetes corruptos y nada más.
 *
 * Antes era sólo en el aire, y eso la volvía casi imposible de usar: el rosado
 * te llega caminando, y apretar el botón con los pies en el piso no hacía
 * literalmente nada — ni siquiera un destello que dijera "acá no". Lo que la
 * mantiene como decisión es el enfriamiento: si errás, quedás vendido 8 cuadros.
 */
function startParry() {
  if (P.parry > 0 || P.parryCd > 0) return;
  P.parry = PARRY.window;
  P.parryCd = PARRY.cooldown + PARRY.window;
  FX.ring(P.x + P.w / 2, P.y + P.h / 2, 18, '#ff6ec7', { life: 10, width: 1.6, alpha: 0.7 });
}

/**
 * Busca un paquete corrupto dentro de la postura de parry. Se resuelve acá y no
 * en projectiles.js a propósito: si los proyectiles tuvieran que conocer al
 * jugador, player y projectiles quedarían importándose en círculo.
 */
function resolveParry() {
  if (P.parry <= 0 || P.dead) return;
  /* la caja del parry es un poco más generosa que el cuerpo: un paquete que
     roza el borde en el cuadro justo tiene que contar */
  const reach = { x: P.x - 6, y: P.y - 6, w: P.w + 12, h: P.h + 12 };
  for (let i = G.ebullets.length - 1; i >= 0; i--) {
    const b = G.ebullets[i];
    if (!b.corrupt || !aabb(reach, b)) continue;
    G.ebullets.splice(i, 1);
    landParry(b);
    return;
  }
}

function landParry(b) {
  P.parry = 0;
  P.parryHit = 14;
  /* el rebote es para no caerte mientras parás en el aire; parado en el piso
     no tiene sentido salir disparado hacia arriba */
  if (!P.onGround) {
    P.vy = -PARRY.bounce;
    P.holding = true;
  }
  P.jumps = Math.min(P.jumps, 1);    // devuelve el segundo salto
  P.dashUsed = false;                // y el dash
  P.meter = Math.min(PURGE.max, P.meter + PARRY.reward);
  G.slowmo = Math.max(G.slowmo, PARRY.freeze * 2);
  /* un parry acertado no puede terminar en golpe: si otra bala venía cerca,
     acertar tiene que haber valido la pena */
  P.invuln = Math.max(P.invuln, PARRY.grace);

  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  returnPacket(b, cx, cy);
  FX.pop(cx, cy, '#ff6ec7', 16, { life: 14, points: 6, core: '#ffffff' });
  FX.ring(cx, cy, 40, '#ff6ec7', { life: 20, width: 2.6, alpha: 0.9 });
  FX.spark(cx, cy, '#ffb3e2', 16, 3.2, [10, 26]);
  FX.flash(4, '#ff6ec7');
  FX.shake(3);
  Sfx.parry();
}

/* El paquete devuelto. No es un arma del arsenal —no gasta munición, no
   aparece en la placa— así que la "herramienta" es esta, acá, y existe para un
   solo disparo: perfora, porque devolver un paquete a través de una fila de
   procesos es exactamente la fantasía que promete el color. */
const RETURNED = {
  size: [11, 5], dmg: PARRY.dmg, color: '#ff6ec7', core: '#ffffff',
  shot: 'packet', trail: 8, pierce: true,
};

/**
 * Parar no borra el paquete: se lo devuelve al que lo tiró. Si hay un proceso
 * hostil a la vista sale derecho hacia él —parar es también apuntar, y es lo
 * que hace que el parry valga por sí solo y no sólo como carga de la Purga—; si
 * no hay nadie, se va por donde vino.
 */
function returnPacket(b, cx, cy) {
  const target = nearestEnemy(cx, cy);
  const ang = target
    ? Math.atan2(target.y + target.h / 2 - cy, target.x + target.w / 2 - cx)
    : Math.atan2(-b.vy, -b.vx);
  spawnBullet(cx, cy, Math.cos(ang) * PARRY.speed, Math.sin(ang) * PARRY.speed, RETURNED, ang);
}

/** El proceso hostil vivo más cercano dentro del alcance del rebote. */
function nearestEnemy(x, y) {
  let best = null, bestD = 300;
  for (const e of G.enemies) {
    if (e.dead) continue;
    const d = Math.hypot(e.x + e.w / 2 - x, e.y + e.h / 2 - y);
    if (d < bestD) { bestD = d; best = e; }
  }
  return best;
}

/** Purga: limpia la pantalla. Cuesta la barra entera. */
function firePurge() {
  if (P.meter < PURGE.max || P.purge > 0 || P.dead) return;
  P.meter = 0;
  P.purge = PURGE.frames;
  P.invuln = Math.max(P.invuln, PURGE.frames);

  const L = G.cam.x - 20, R = G.cam.x + G.view.w + 20;
  const T = G.cam.y - 20, B = G.cam.y + G.view.h + 20;
  for (const e of G.enemies) {
    if (e.dead || e.x + e.w < L || e.x > R || e.y + e.h < T || e.y > B) continue;
    damageEnemy(e, PURGE.damage, e.x + e.w / 2 + (e.x < P.x ? 40 : -40));
  }
  G.ebullets.length = 0;     // todo el fuego hostil en pantalla se desinfecta

  /* La Purga también descifra: es la clave de recuperación del jugador. Si no
     llegás a matar al ransomware, podés pagar la barra entera y recuperar el
     piso — cara, pero nunca te deja sin salida. */
  for (const L of breakAllLocks()) {
    FX.ring(L.x + L.w / 2, L.y + L.h / 2, 80, '#6ce8ff', { life: 26, width: 3, alpha: 0.9 });
  }

  /* Y limpia la caché: lo que los Keyloggers de la pantalla creían saber de vos
     vuelve a cero. Contra el único enemigo que se hace fuerte con el tiempo, la
     barra compra lo que ninguna otra cosa compra — empezar de nuevo. */
  purgeKeyloggers();

  FX.flash(14, '#6ce8ff');
  FX.shake(9);
  FX.ring(P.x + P.w / 2, P.y + P.h / 2, 260, '#6ce8ff', { life: 40, width: 5, alpha: 0.9 });
  FX.ring(P.x + P.w / 2, P.y + P.h / 2, 190, '#ffffff', { life: 30, width: 3, alpha: 0.8 });
  G.slowmo = Math.max(G.slowmo, 26);
  Sfx.purge();
}

/**
 * Todo lo que alimenta a la animación, calculado una vez por cuadro y en un
 * solo lugar: cuánto de la zancada se usa, qué tan "en el aire" se ve el
 * cuerpo, hacia dónde mira visualmente, y cómo cuelga la tela. El dibujo en
 * render/actors.js sólo interpola estos valores — nunca decide poses nuevas.
 */
function updateAnimState() {
  const spd = clamp(Math.abs(P.vx) / PHYS.runSpeed, 0, 1);
  P.stride = lerp(P.stride, P.onGround ? spd : 0, 0.22);
  P.airBlend = lerp(P.airBlend, P.onGround ? 0 : 1, 0.3);

  // el giro pasa por cero en vez de espejarse de golpe: un "flip" de papel
  P.turn = lerp(P.turn, P.face, 0.4);

  const coatTarget = clamp(-P.vx * 1.5, -6, 6) + P.airBlend * 4.5;
  const hatTarget = clamp(-P.vx * 1.1, -5, 5) + P.airBlend * 2.6 - P.vy * 0.22;
  springTo(P.coat, coatTarget, 0.16, 0.82);     // faldón del gabán
  springTo(P.hair, hatTarget, 0.22, 0.78);      // inclinación del sombrero
}

/** Lee ↑ (apuntar arriba) y ↓ en el aire (apuntar abajo); suaviza el ángulo visual del brazo. */
function updateAiming() {
  const wantUp = Input.held('aimUp');
  const wantDown = Input.held('down') && !P.onGround;
  P.aimDir = wantUp ? -1 : (wantDown ? 1 : 0);

  // con el dedo en el gatillo levanta el cañón; en reposo lo deja caer
  const ready = Input.held('fire') || P.cooldown > 0 || P.muzzle > 0;
  const target = aimAngleFor(P.aimDir, ready);
  P.aimAngle = lerp(P.aimAngle, target, 0.32);
}

/** El ángulo local que le corresponde a una dirección de puntería. */
function aimAngleFor(dir, ready) {
  if (dir === -1) return AIM_UP;
  if (dir === 1) return AIM_DOWN;
  return ready ? AIM_FWD : AIM_REST;
}

/**
 * Dónde está la mano que sostiene el arma, en el espacio local del dibujo
 * (origen en los pies, x positivo hacia adelante). Lo usan por igual el
 * renderizador y `fire()`, así que el cañón dibujado y el caño del que sale la
 * bala son literalmente el mismo punto.
 */
export function gunRig() {
  const aim = P.aimAngle;
  const kick = P.recoilMax > 0 ? P.recoil / P.recoilMax : 0;   // 1 al disparar → 0
  const len = ARM_LEN - kick * 2.6;
  /* Con una cabeza que ocupa media figura, apuntar en vertical con el brazo
     pegado al eje del cuerpo le metería el arma dentro de la cara. El brazo se
     corre hacia adelante a medida que la puntería se endereza, y como el
     disparo sale de este mismo rig, la bala se corre con él. */
  const side = Math.abs(Math.sin(aim)) * 6.5;
  return {
    aim, kick, side,
    shoulderY: SHOULDER_Y,
    hx: 1 + side + Math.cos(aim) * len,
    hy: SHOULDER_Y + 1 + Math.sin(aim) * len,
  };
}

/**
 * El caño real queda más adelante que el punto que se usaba antes (que estaba
 * metido dentro del arma), así que pegada a una pared la bala podría nacer del
 * otro lado. Si eso pasa, se la trae hacia el cuerpo hasta encontrar aire.
 */
function safeMuzzle(m) {
  if (!rectHitsSolid(m.x - 2, m.y - 2, 4, 4)) return m;
  const cx = P.x + P.w / 2, cy = P.y + P.h / 2;
  for (let t = 0.7; t > 0; t -= 0.25) {
    const x = lerp(cx, m.x, t), y = lerp(cy, m.y, t);
    if (!rectHitsSolid(x - 2, y - 2, 4, 4)) return { x, y, ang: m.ang };
  }
  return { x: cx, y: cy, ang: m.ang };
}

/** La punta del cañón, en coordenadas de mundo, más el ángulo real de salida. */
export function muzzlePoint(weaponKey = P.weapon) {
  const r = gunRig();
  const reach = (WEAPONS[weaponKey].barrel || 13) - r.kick * 3.5;
  // r.hx ya trae el corrimiento lateral del brazo en vertical
  const lx = r.hx + Math.cos(r.aim) * reach;
  const ly = r.hy + Math.sin(r.aim) * reach;
  return {
    x: P.x + P.w / 2 + P.face * lx,
    y: P.y + P.h + ly,
    ang: P.face > 0 ? r.aim : Math.PI - r.aim,
  };
}

/** Ciclo (Q/E) y selección directa (1–5) del arsenal ya recolectado. */
function updateWeaponSelect() {
  for (let i = 0; i < WEAPON_ORDER.length; i++) {
    const action = 'weapon' + (i + 1);
    if (!Input.pressed(action)) continue;
    Input.consume(action);
    const key = WEAPON_ORDER[i];
    if (P.weapons[key] !== undefined) switchWeapon(key);
  }
  if (Input.pressed('weaponNext')) { Input.consume('weaponNext'); cycleWeapon(1); }
  if (Input.pressed('weaponPrev')) { Input.consume('weaponPrev'); cycleWeapon(-1); }
}

function switchWeapon(key) {
  if (key === P.weapon || P.weapons[key] === undefined) return;
  P.weapon = key;
  P.ammo = P.weapons[key];
  P.cooldown = Math.min(P.cooldown, 6);
  P.charge = 0;      // la carga no se lleva de una herramienta a otra
  Sfx.swap();
}

function cycleWeapon(dir) {
  const owned = WEAPON_ORDER.filter(k => P.weapons[k] !== undefined);
  if (owned.length <= 1) return;
  const idx = owned.indexOf(P.weapon);
  switchWeapon(owned[(idx + dir + owned.length) % owned.length]);
}

/**
 * El gatillo. Las herramientas normales disparan mientras se lo mantenga; el
 * Firewall en cambio acumula mientras está apretado y suelta al soltarlo. Que
 * la diferencia viva acá y no dentro de `fire()` mantiene a `fire()` con una
 * sola responsabilidad: poner un paquete en el mundo.
 */
function updateTrigger() {
  const w = WEAPONS[P.weapon];
  const holding = Input.held('fire');

  if (!w.charge) {
    P.charge = 0;
    if (holding) fire(false);
    return;
  }

  if (holding) {
    if (P.cooldown <= 0 && P.charge < w.charge) {
      P.charge++;
      if (P.charge === w.charge) {           // avisa cuando llegó al tope
        FX.ring(P.x + P.w / 2, P.y + 11, 22, w.color, { life: 14, width: 2, alpha: 0.9 });
        Sfx.swap();
      }
    }
    /* chispas girando alrededor del caño mientras junta */
    if (P.charge > 6 && G.tick % 3 === 0) {
      const m = muzzlePoint();
      const a = G.tick * 0.3;
      const r = 9 * (1 - P.charge / w.charge) + 3;
      FX.spark(m.x + Math.cos(a) * r, m.y + Math.sin(a) * r, w.core, 1, 0.6, [4, 9]);
    }
  } else if (P.charge > 0) {
    const full = P.charge >= w.charge;
    P.charge = 0;
    fire(full);
  }
}

function fire(blitz = false) {
  if (P.cooldown > 0) return;
  const base = WEAPONS[P.weapon];
  // el Blitz es la misma herramienta con otros números: se compone en el
  // momento en vez de duplicar una entrada entera en data/weapons.js
  const w = blitz && base.blitz ? { ...base, ...base.blitz } : base;
  const ammo = P.weapons[P.weapon];
  if (ammo !== undefined && ammo <= 0) { P.cooldown = 8; return; }   // sin munición: silencio

  P.cooldown = w.cd;
  if (ammo !== Infinity) { P.weapons[P.weapon]--; P.ammo = P.weapons[P.weapon]; }
  logAction(ACT.TIRO);      // un disparo de verdad: ya pasó munición y enfriamiento

  /* La pose se clava en el cuadro del disparo en vez de seguir interpolando:
     es lo que hace el dibujo animado, y de paso garantiza que el cañón esté
     exactamente donde va a nacer la bala. */
  const dir = P.aimDir;
  P.aimAngle = aimAngleFor(dir, true);

  /* El caño se mide ANTES de aplicar la patada: la bala nace donde estaba el
     arma al apretar el gatillo, no donde termina después de saltar hacia atrás.
     Invertir estas dos líneas hace que el disparo salga corrido unos píxeles. */
  const m = safeMuzzle(muzzlePoint());
  const baseAngle = m.ang;

  P.recoil = P.recoilMax = w.kick;
  P.muzzle = P.muzzleMax = w.flash;
  P.muzzleSeed = rnd(0, 100);
  if (w.pump) { P.pump = P.pumpMax = w.pump; }

  // retroceso: horizontal al frente, un empujón vertical si es el ariete apuntando en vertical
  if (w.rocket && dir === -1) P.vy += 2.2;
  else if (w.rocket && dir === 1) P.vy -= 2.6;       // impulso hacia arriba: mini salto de cohete
  else if (dir === 0) P.vx -= P.face * w.push;

  for (let i = 0; i < w.pellets; i++) {
    const a = baseAngle + rnd(-w.spread, w.spread);
    spawnBullet(m.x, m.y, Math.cos(a) * w.speed, Math.sin(a) * w.speed, w, a);
  }

  /* pólvora: la bocanada sale del caño y se va hacia adelante, no hacia arriba */
  const back = baseAngle + Math.PI;
  FX.puff(m.x, m.y, '#cdbb95', w.rocket ? 4 : 2, {
    speed: 0.5, rise: -0.25, size: [1.6 * w.flashScale, 3.2 * w.flashScale],
    life: [16, 30], alpha: 0.55, grow: 0.2, lw: 0.9,
  });
  FX.spark(m.x, m.y, w.core, 3, 1.4, [5, 12]);
  if (w.shells) FX.shell(m.x + Math.cos(back) * 5, m.y + Math.sin(back) * 5, Math.cos(baseAngle), w.shells);
  FX.shake(w.shake);
  Sfx.shot(P.weapon);
}

function lobGrenade() {
  if (P.grenades <= 0) return;
  P.grenades--;
  // sale de la mano de apoyo, a la altura del pecho: el arco no depende de hacia
  // dónde esté apuntando el cañón
  const fx = P.x + P.w / 2 + P.face * 6, fy = P.y + 8;
  throwGrenade(fx, fy, P.face * 3.4 + P.vx * 0.4, -3.6);
  FX.puff(fx, fy, '#cdbb95', 1, { size: [1.4, 2.4], life: [12, 22], alpha: 0.45 });
  Sfx.shot('ping');
  logAction(ACT.TIRO);      // para la cinta, una granada es un ataque como cualquier otro
}

/* Cuánto carga un depósito, como fracción del cargador de esa herramienta. */
const DEPOSIT_REFILL = 0.4;

/** ¿Es tuya y se le puede cargar munición? El Ping no cuenta: es infinito. */
function propia(key) {
  return key !== 'ping' && !!WEAPONS[key] && P.weapons[key] !== undefined;
}

/**
 * A quién le toca la munición de este depósito.
 *
 * Un depósito no entrega herramientas: sólo carga las que ya llevás. Las
 * herramientas se compran con fragmentos de clave al cerrar un sector, y ése
 * es el único lugar donde se consiguen. Si el depósito prestara, comprar sería
 * optativo y el sector pagaría lo mismo que la billetera.
 *
 *   1. si el mapa lo marcó (la `E` del Escáner) y esa herramienta ya es tuya;
 *      si el Escáner no lo compraste, el depósito no se desperdicia: sigue la
 *      cadena y carga otra cosa tuya
 *   2. si no, a la que llevás en la mano
 *   3. si llevás el Ping —munición infinita, nada que cargarle— a la tuya más
 *      vacía, medida en fracción de cargador
 *   4. si no tenés ninguna, `null`: el depósito sólo da la granada
 */
function depositTool(p) {
  if (p.weapon && propia(p.weapon)) return p.weapon;
  if (propia(P.weapon)) return P.weapon;

  let peor = null, menos = Infinity;
  for (const key of Object.keys(P.weapons)) {
    if (!propia(key)) continue;
    const frac = P.weapons[key] / WEAPONS[key].ammo;
    if (frac < menos) { menos = frac; peor = key; }
  }
  return peor;
}

function checkPickups() {
  for (let i = G.pickups.length - 1; i >= 0; i--) {
    const p = G.pickups[i];
    p.t += 0.062;
    if (p.fresh > 0) p.fresh--;
    if (!aabb(P, p)) continue;

    if (p.kind === 'vida') {
      P.hp = Math.min(P.maxHp, P.hp + 3);
      FX.spark(p.x + p.w / 2, p.y + p.h / 2, '#8fe6a0', 12, 2.2);
      Sfx.pickup();
    } else if (p.kind === 'arma') {
      /* Sin herramienta que cargar el depósito no queda muerto: siempre da la
         granada, que la tiene cualquiera. Lo que no hace nunca es regalar una
         herramienta — eso se paga con claves. */
      const picked = depositTool(p);
      if (picked) {
        const tope = WEAPONS[picked].ammo;
        P.weapons[picked] = Math.min(tope, P.weapons[picked] + Math.ceil(tope * DEPOSIT_REFILL));
        P.weapon = picked;
        P.ammo = P.weapons[picked];
        FX.spark(p.x + p.w / 2, p.y + p.h / 2, WEAPONS[picked].color, 16, 2.8);
        FX.ring(p.x + p.w / 2, p.y + p.h / 2, 26, WEAPONS[picked].color, { life: 18, width: 1.6 });
        FX.flash(3, WEAPONS[picked].color);
      } else {
        FX.spark(p.x + p.w / 2, p.y + p.h / 2, G.theme.accent, 10, 2);
      }
      P.grenades = Math.min(PLAYER.maxGrenades, P.grenades + 1);
      Sfx.pickup();
    } else {
      G.stats.shards++;
      FX.spark(p.x + p.w / 2, p.y + p.h / 2, G.theme.accent, 10, 2);
      FX.ring(p.x + p.w / 2, p.y + p.h / 2, 20, G.theme.accent, { life: 22, width: 1.2, alpha: 0.6 });
      Sfx.shard();
    }
    G.pickups.splice(i, 1);
  }
}

/**
 * El poste de restauración hace las dos cosas que promete su nombre: fija dónde
 * reaparecés y te repone los corazones.
 *
 * Son dos estados distintos y por eso son dos banderas. `on` es "acá reaparecés"
 * y es exclusivo: encender uno apaga al anterior, porque el punto de retorno es
 * uno solo. `healed` es "este poste ya te curó" y es de cada uno, para siempre:
 * si fuera `on` el que decidiera la cura, ir y volver entre dos postes se
 * apagarían el uno al otro y curarían sin fin.
 *
 * La cura no se gasta si llegás entero: el poste queda ahí para cuando vuelvas
 * golpeado. El impostor (`r`) promete exactamente esto.
 */
function checkCheckpoints() {
  for (const cp of G.checkpoints) {
    cp.t += 0.04;
    if (!aabb(P, cp)) continue;

    const activa = !cp.on;
    const cura = !cp.healed && P.hp < P.maxHp;
    if (!activa && !cura) continue;

    if (activa) {
      cp.on = true;
      for (const other of G.checkpoints) if (other !== cp) other.on = false;
      G.spawn = { x: cp.x + cp.w / 2 - P.w / 2, y: cp.y + cp.h - P.h };
    }
    if (cura) {
      cp.healed = true;
      P.hp = P.maxHp;
      FX.spark(P.x + P.w / 2, P.y + P.h / 2, '#8fe6a0', 14, 2.4);
    }
    FX.ring(cp.x + cp.w / 2, cp.y + cp.h - 4, 44, G.theme.accent, { life: 34, width: 2, alpha: 0.7 });
    FX.spark(cp.x + cp.w / 2, cp.y + cp.h / 2, G.theme.accent, 18, 2.2, [20, 44]);
    Sfx.checkpoint();
  }
}

/** Distancia (en tiles) hasta el suelo, para la sombra proyectada. */
export function shadowDrop() {
  let y = P.y + P.h;
  const step = 4;
  for (let d = 0; d < TS * 9; d += step) {
    const yy = y + d;
    const c0 = Math.floor((P.x + 2) / TS), c1 = Math.floor((P.x + P.w - 2) / TS);
    const r = Math.floor(yy / TS);
    // vía solidAt y no leyendo la rejilla: el piso cifrado no proyecta sombra
    for (let c = c0; c <= c1; c++) {
      if (r >= 0 && r < G.rows && c >= 0 && c < G.cols && solidAt(c, r)) return d;
    }
    for (const o of G.oneways) {
      if (P.x + P.w > o.x && P.x < o.x + o.w && yy >= o.y && yy <= o.y + 8 &&
          !encrypted(P.x + P.w / 2, o.y + 2)) return d;
    }
  }
  return -1;
}
