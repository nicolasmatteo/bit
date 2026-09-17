/* Entrada unificada: teclado + táctil.
   Expone estados continuos y "pulsos" de un solo frame (consumidos por el juego). */

const held = new Set();
const pressed = new Set();

/* Dos agarres, el mismo pulgar:

     agarre WASD       izquierda W A S D + Q E   ·  derecha   U / J K L
     agarre flechas    derecha   ← ↑ ↓ →         ·  izquierda Z X C V + B

   A la derecha las acciones caen en la fila de reposo, del índice al anular:
   J dispara, K granada, L parry. A la izquierda se mantiene el racimo clásico
   de siempre — Z dash, X disparo, C granada, V parry — sin tocarlo.
   El espacio salta en los dos, porque el pulgar cae ahí sin moverse.  */
const MAP = {
  /* mover y apuntar — mano de dirección */
  ArrowLeft: 'left',  KeyA: 'left',
  ArrowRight:'right', KeyD: 'right',
  ArrowUp:   'aimUp', KeyW: 'aimUp',   // apuntar arriba; el salto es del pulgar
  ArrowDown: 'down',  KeyS: 'down',    // apuntar abajo / bajar de una losa

  /* pulgar */
  Space: 'jump',

  /* mano de acción. A la derecha, del índice al anular: J K L.
     A la izquierda se conserva el racimo clásico Z X C V, tal cual venía. */
  KeyJ: 'fire',    KeyX: 'fire',
  KeyK: 'grenade', KeyC: 'grenade',
  KeyL: 'parry',   KeyV: 'parry',      // parry rosa sobre paquetes corruptos
  ShiftLeft: 'dash', ShiftRight: 'dash', KeyZ: 'dash',
  KeyU: 'purge',   KeyB: 'purge', KeyF: 'purge',   // barra llena

  /* herramientas: fila de arriba de la mano de dirección, o número directo */
  KeyQ: 'weaponPrev', KeyE: 'weaponNext',
  Digit1: 'weapon1', Digit2: 'weapon2', Digit3: 'weapon3', Digit4: 'weapon4', Digit5: 'weapon5',

  /* sistema */
  KeyP: 'pause', Escape: 'pause',
  KeyM: 'mute',
  Enter: 'confirm',
};

const PREVENT = new Set(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space']);

function down(action) {
  if (!held.has(action)) pressed.add(action);
  held.add(action);
}
function up(action) { held.delete(action); }

addEventListener('keydown', e => {
  if (PREVENT.has(e.code)) e.preventDefault();
  if (e.repeat) return;
  const a = MAP[e.code];
  if (a) down(a);
});
addEventListener('keyup', e => {
  const a = MAP[e.code];
  if (a) up(a);
});
addEventListener('blur', () => { held.clear(); });

/* ---- táctil ---- */

export function bindTouch(root) {
  const coarse = matchMedia('(pointer: coarse)').matches;
  if (!coarse) return false;
  root.hidden = false;
  root.setAttribute('aria-hidden', 'false');

  for (const btn of root.querySelectorAll('[data-key]')) {
    const action = btn.dataset.key;
    const press = e => {
      e.preventDefault();
      btn.classList.add('is-down');
      down(action);
    };
    const release = e => {
      e.preventDefault();
      btn.classList.remove('is-down');
      up(action);
    };
    btn.addEventListener('pointerdown', press);
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('pointerleave', release);
    btn.addEventListener('contextmenu', e => e.preventDefault());
  }
  return true;
}

/* ---- consulta ---- */

export const Input = {
  held:      a => held.has(a),
  pressed:   a => pressed.has(a),
  /** Consume el pulso para que no lo lea nadie más. */
  consume:   a => pressed.delete(a),
  endFrame() { pressed.clear(); },
  releaseAll() { held.clear(); pressed.clear(); },
};
