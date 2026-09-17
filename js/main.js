/* Arranque: lienzo, bucle de paso fijo y la capa de interfaz en HTML. */

import { G } from './game/state.js';
import { Input, bindTouch } from './input.js';
import { startLevel, updateGame, advanceLevel, formatTime, levelCount } from './game/game.js';
import { render, renderMenu, resizeCanvas } from './render/renderer.js';
import { LEVELS } from './data/levels.js';
import { initAudio, resumeAudio, toggleMute, isMuted, setAmbience, stopAmbience } from './audio.js';
import { buildDossier, stopDossier } from './render/dossier.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });

const overlay = document.getElementById('overlay');
const elEyebrow = document.getElementById('ovEyebrow');
const elTitle = document.getElementById('ovTitle');
const elText = document.getElementById('ovText');
const elStats = document.getElementById('ovStats');
const elBtn = document.getElementById('ovBtn');
const elHint = document.getElementById('ovHint');
const elSound = document.getElementById('soundToggle');
const elDossier = document.getElementById('ovDossier');
const elPanel = overlay.querySelector('.panel');

let prevMode = null;
let pausedFrom = 'play';
let audioStarted = false;
/* el menú tiene dos pasos: portada y expediente. Sigue siendo el mismo modo
   'menu' para el juego — el fondo sigue paneando detrás de las dos */
let dossierOpen = false;

/* ─────────────────────────────── interfaz */

function showOverlay({ eyebrow, title, text, button, hint = '', stats = null, dossier = false }) {
  elDossier.hidden = !dossier;
  elPanel.classList.toggle('is-wide', dossier);
  if (!dossier) stopDossier();
  elEyebrow.textContent = eyebrow;
  elTitle.innerHTML = title;
  elText.innerHTML = text;
  elBtn.textContent = button;
  elHint.innerHTML = hint;

  elStats.innerHTML = '';
  if (stats) {
    for (const [k, v, good] of stats) {
      const row = document.createElement('div');
      row.innerHTML = `<dt>${k}</dt><span class="lead"></span><dd class="${good ? 'good' : ''}">${v}</dd>`;
      elStats.appendChild(row);
    }
    elStats.hidden = false;
  } else elStats.hidden = true;

  overlay.classList.remove('is-hidden');
}

const hideOverlay = () => overlay.classList.add('is-hidden');

/* El tablero de controles se dibuja como el teclado real: las teclas caen donde
   caen los dedos, con el escalón de cada fila. Izquierda camina, derecha pelea,
   el pulgar salta. */
const CONTROLS = `
<div class="keys">
  <div class="keys__hands">

    <div class="hand">
      <span class="hand__t">Izquierda · caminar</span>
      <div class="krow">
        <kbd class="key"><b>Q</b><i>arma −</i></kbd>
        <kbd class="key"><b>W</b><i>apuntar ↑</i></kbd>
        <kbd class="key"><b>E</b><i>arma +</i></kbd>
      </div>
      <div class="krow krow--home">
        <kbd class="key"><b>A</b><i>izquierda</i></kbd>
        <kbd class="key"><b>S</b><i>apuntar ↓</i></kbd>
        <kbd class="key"><b>D</b><i>derecha</i></kbd>
      </div>
      <div class="krow krow--low">
        <kbd class="key key--wide"><b>Shift</b><i>dash</i></kbd>
      </div>
    </div>

    <div class="hand">
      <span class="hand__t">Derecha · pelear</span>
      <div class="krow krow--u">
        <kbd class="key"><b>U</b><i>purga</i></kbd>
      </div>
      <div class="krow krow--home">
        <kbd class="key"><b>J</b><i>disparar</i></kbd>
        <kbd class="key"><b>K</b><i>granada</i></kbd>
        <kbd class="key key--pink"><b>L</b><i>parry</i></kbd>
      </div>
    </div>

  </div>

  <div class="krow">
    <kbd class="key key--bar"><b>espacio</b><i>saltar · otra vez en el aire, doble salto</i></kbd>
  </div>

  <p class="keys__alt">
    Mano cambiada: <kbd>←</kbd><kbd>→</kbd><kbd>↑</kbd><kbd>↓</kbd> caminan y apuntan,
    y el racimo de siempre <kbd>Z</kbd> dash · <kbd>X</kbd> disparar ·
    <kbd>C</kbd> granada · <kbd>V</kbd> parry · <kbd>B</kbd> purga.
    <span class="sep"></span>
    Mantener <kbd>J</kbd> con el Firewall carga el Blitz ·
    <kbd>↓</kbd>+<kbd>espacio</kbd> baja de una losa ·
    <kbd>1</kbd>–<kbd>5</kbd> herramienta directa ·
    <kbd>P</kbd> pausa · <kbd>M</kbd> sonido
  </p>
</div>
<p class="keys__touch">Botones en pantalla: izquierda camina, derecha pelea.</p>`;

function menuScreen() {
  showOverlay({
    eyebrow: 'Protocolo Ceniza',
    title: 'Bit Patrol<em>once sectores comprometidos</em>',
    text: `Algo entró por el perímetro y bajó hasta la raíz. Bit sale a buscarlo
           con lo único que trae de fábrica: un <i>ping</i>, dos saltos y el
           descaro de devolver lo que le tiran.
           <span class="sep"></span>
           Lo que viene en <i>rosa</i> se puede parar, y lo que parás vuelve
           convertido en disparo tuyo. Además carga la Purga.
           <span class="sep"></span>
           Ocho corazones. Los postes de restauración los reponen y marcan
           dónde volvés si se terminan.`,
    button: 'Iniciar barrido',
    hint: CONTROLS,
  });
}

/**
 * El expediente: quiénes están adentro del sistema, antes de entrar. Cuenta qué
 * es cada amenaza y nunca cómo pelea — eso se descubre jugando.
 */
function dossierScreen() {
  showOverlay({
    eyebrow: 'Expediente de amenazas',
    title: 'Lo que ya está adentro',
    text: `Todo esto se coló en el sistema. Algunos se ven venir y otros no.
           Conocelos antes de cruzártelos.`,
    button: 'Entrar al perímetro',
    dossier: true,
  });
  buildDossier(elDossier);
  overlay.scrollTop = 0;
}

function pauseScreen() {
  showOverlay({
    eyebrow: G.level.name,
    title: 'En pausa',
    text: 'El proceso sigue cuando vos digas.',
    button: 'Retomar',
    hint: CONTROLS,
  });
}

function clearScreen() {
  const next = LEVELS[G.levelIndex + 1];
  showOverlay({
    eyebrow: `Sector ${String(G.levelIndex + 1).padStart(2, '0')} · saneado`,
    title: G.level.name,
    text: `Siguiente salto: <b>${next.name}</b>`,
    button: 'Avanzar',
    stats: [
      ['Tiempo', formatTime(G.stats.frames)],
      ['Claves', `${G.stats.shards} / ${G.stats.shardsTotal}`, G.stats.shards === G.stats.shardsTotal],
      ['Procesos terminados', G.stats.kills],
      ['Caídas', G.stats.deaths, G.stats.deaths === 0],
    ],
  });
}

function winScreen() {
  showOverlay({
    eyebrow: 'Sistema limpio',
    title: 'Bit Patrol',
    text: 'Del perímetro a la raíz, sin un proceso hostil en pie. Bit vuelve a su turno.',
    button: 'Volver a empezar',
    stats: [
      ['Tiempo total', formatTime(G.run.frames)],
      ['Claves', `${G.run.shards}`, true],
      ['Caídas', G.run.deaths, G.run.deaths === 0],
      ['Sectores', `${levelCount} / ${levelCount}`, true],
    ],
  });
}

/* ─────────────────────────────── acciones */

elBtn.addEventListener('click', () => {
  startAudio();
  if (G.mode === 'menu' && !dossierOpen) {
    dossierOpen = true;
    dossierScreen();
    Input.releaseAll();
    return;
  }
  switch (G.mode) {
    case 'menu':  dossierOpen = false; stopDossier(); startLevel(0, false); break;
    case 'pause': G.mode = pausedFrom; break;
    case 'clear': advanceLevel(); break;
    case 'win':   startLevel(0, false); break;
    default:      startLevel(G.levelIndex); break;
  }
  hideOverlay();
  prevMode = G.mode;
  Input.releaseAll();
  /* el botón no se queda con el foco: si no, el espacio de saltar lo volvería
     a activar en pleno juego. Con la capa abierta el teclado igual lo dispara
     desde el bucle (espacio, enter o J). */
  elBtn.blur();
});

function togglePause() {
  if (G.mode === 'play' || G.mode === 'brief') {
    pausedFrom = G.mode;
    G.mode = 'pause';
    pauseScreen();
  } else if (G.mode === 'pause') {
    G.mode = pausedFrom;
    hideOverlay();
  }
}

elSound.addEventListener('click', () => { startAudio(); applyMute(toggleMute()); });
function applyMute(muted) {
  elSound.classList.toggle('is-off', muted);
  elSound.textContent = muted ? 'Silencio' : 'Sonido';
}

function startAudio() {
  if (audioStarted) return;
  audioStarted = true;
  initAudio();
  resumeAudio();
  if (G.theme) setAmbience(G.theme);
}
addEventListener('pointerdown', startAudio, { once: true });
addEventListener('keydown', startAudio, { once: true });

/* ─────────────────────────────── bucle */

const STEP = 1000 / 60;
let acc = 0, last = performance.now();

function tickLogic() {
  if (G.slowmo > 0) {
    G.slowmo--;
    if (G.slowmo % 2 === 0) updateGame();
    else G.tick++;
  } else {
    updateGame();
  }
}

function frame(now) {
  requestAnimationFrame(frame);

  const overlayUp = !overlay.classList.contains('is-hidden');
  if (Input.pressed('mute')) { Input.consume('mute'); startAudio(); applyMute(toggleMute()); }
  if (Input.pressed('pause')) { Input.consume('pause'); togglePause(); }
  if (overlayUp && (Input.pressed('confirm') || Input.pressed('jump') || Input.pressed('fire'))) {
    Input.consume('confirm'); Input.consume('jump'); Input.consume('fire');
    elBtn.click();
  }

  acc += Math.min(now - last, 120);
  last = now;
  let steps = 0;
  while (acc >= STEP && steps < 5) {
    tickLogic();
    Input.endFrame();
    acc -= STEP;
    steps++;
  }

  if (G.mode === 'menu') renderMenu(ctx);
  else render(ctx);

  /* reacción a los cambios de estado */
  if (G.mode !== prevMode) {
    if (G.mode === 'clear') { clearScreen(); stopAmbience(); }
    else if (G.mode === 'win') { winScreen(); stopAmbience(); }
    prevMode = G.mode;
  }
}

/* ─────────────────────────────── arranque */

addEventListener('resize', () => resizeCanvas(canvas));
addEventListener('orientationchange', () => setTimeout(() => resizeCanvas(canvas), 200));

async function boot() {
  resizeCanvas(canvas);
  bindTouch(document.getElementById('touch'));

  try {
    await Promise.race([
      document.fonts.ready,
      new Promise(r => setTimeout(r, 1800)),
    ]);
  } catch { /* sin fuentes web, seguimos con las del sistema */ }

  startLevel(0, false);
  G.mode = 'menu';
  prevMode = 'menu';
  menuScreen();
  applyMute(isMuted());

  last = performance.now();
  requestAnimationFrame(frame);
}

boot();
