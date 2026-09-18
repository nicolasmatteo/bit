/* Arranque: lienzo, bucle de paso fijo y la capa de interfaz en HTML. */

import { G } from './game/state.js';
import { Input, bindTouch } from './input.js';
import { startLevel, updateGame, advanceLevel, formatTime, levelCount } from './game/game.js';
import { render, renderMenu, resizeCanvas } from './render/renderer.js';
import { LEVELS } from './data/levels.js';
import { sectorThreats } from './data/bestiary.js';
import { initAudio, resumeAudio, toggleMute, isMuted, setAmbience, stopAmbience } from './audio.js';
import { buildDossier, stopDossier } from './render/dossier.js';
import { SECTOR_LAYERS } from './data/bestiary.js';
import { loadProgress, markCleared, isUnlocked, furthestUnlocked } from './save.js';

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
const elBoard = document.getElementById('ovBoard');
const elPanel = overlay.querySelector('.panel');

let prevMode = null;
let pausedFrom = 'play';
let audioStarted = false;
/* El menú tiene tres pasos: portada, manual y selector de sector. Los tres son
   el mismo modo 'menu' para el juego — el fondo sigue paneando detrás. */
const PORTADA = 0, MANUAL = 1, SELECTOR = 2;
let menuStep = PORTADA;

/* Qué sectores quedaron saneados, leído del disco al arrancar. Un sector se
   abre cuando el anterior está en esta lista (ver save.js). */
let cleared = loadProgress(levelCount);
/* Los procesos hostiles que el jugador ya se cruzó en esta partida. El parte de
   cada sector presenta sólo lo que estrena: repetir a los conocidos convertiría
   el expediente en un trámite y le sacaría el peso a la ficha nueva. */
const met = new Set();

/* ─────────────────────────────── interfaz */

function showOverlay({ eyebrow, title, text, button, hint = '', stats = null,
                      dossier = false, board = '' }) {
  elDossier.hidden = !dossier;
  elPanel.classList.toggle('is-wide', dossier);
  elBoard.innerHTML = board;
  elBoard.hidden = !board;
  elPanel.classList.toggle('is-board', !!board);
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

function hideOverlay() {
  overlay.classList.add('is-hidden');
  stopDossier();   // las fichas no tienen por qué seguir dibujando en juego
}

/* El tablero de "cómo se juega". Primero los tres golpes que definen a Bit
   —parar, saltar dos veces, cruzar encriptado—, en cartelitos con su cinta de
   color. Abajo la consola: las teclas caen donde caen los dedos, con el
   escalón de cada fila, y las de pelear van pintadas del color de lo que
   hacen. El rosa sigue queriendo decir parry en todas las capas. */
const CONTROLS = `
<ul class="moves">
  <li class="move move--pink move--star">
    <span class="move__tag">Parry</span>
    <span class="move__glyph" aria-hidden="true">✹</span>
    <kbd class="move__key">L</kbd>
    <span class="move__txt">Lo <b>rosa</b> se para y vuelve como disparo tuyo.
      Devuelve salto, dash y carga la Purga.</span>
  </li>
  <li class="move move--gold">
    <span class="move__tag">Doble salto</span>
    <span class="move__glyph" aria-hidden="true">▲</span>
    <kbd class="move__key">espacio</kbd>
    <span class="move__txt">Otra vez en el aire y Bit gira para subir de nuevo.
      Se recarga al tocar suelo.</span>
  </li>
  <li class="move move--cyan">
    <span class="move__tag">Dash</span>
    <span class="move__glyph" aria-hidden="true">»</span>
    <kbd class="move__key">Shift</kbd>
    <span class="move__txt">Corto y encriptado: cruza el fuego sin comérselo.
      Uno por estadía en el aire.</span>
  </li>
</ul>

<div class="keys">
  <div class="keys__hands">

    <div class="hand">
      <span class="hand__t">Izquierda · moverse</span>
      <div class="krow">
        <kbd class="key"><b>Q</b><i>arma −</i></kbd>
        <kbd class="key"><b>W</b><i>apuntar ↑</i></kbd>
        <kbd class="key"><b>E</b><i>arma +</i></kbd>
      </div>
      <div class="krow krow--home">
        <kbd class="key"><b>A</b><i>◀ caminar</i></kbd>
        <kbd class="key"><b>S</b><i>apuntar ↓</i></kbd>
        <kbd class="key"><b>D</b><i>caminar ▶</i></kbd>
      </div>
      <div class="krow krow--low">
        <kbd class="key key--wide key--cyan"><b>Shift</b><i>» dash</i></kbd>
      </div>
    </div>

    <div class="hand">
      <span class="hand__t">Derecha · pelear</span>
      <div class="krow krow--u">
        <kbd class="key key--teal"><b>U</b><i>◍ purga</i></kbd>
      </div>
      <div class="krow krow--home">
        <kbd class="key key--red"><b>J</b><i>◉ disparar</i></kbd>
        <kbd class="key key--gold"><b>K</b><i>✦ granada</i></kbd>
        <kbd class="key key--pink"><b>L</b><i>✹ parry</i></kbd>
      </div>
    </div>

  </div>

  <div class="krow krow--bar">
    <kbd class="key key--bar key--gold"><b>espacio</b><i>▲ saltar · otra vez en el aire, doble salto</i></kbd>
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

<p class="keys__touch">Botones en pantalla: la mano <b>izquierda</b> camina,
  la <b>derecha</b> pelea. Cada chapa de acá arriba es el botón que le toca.</p>`;

function menuScreen() {
  showOverlay({
    eyebrow: 'Protocolo Ceniza',
    title: 'Bit Patrol<em>once sectores comprometidos</em>',
    text: `Algo entró por el perímetro y bajó hasta la raíz. Bit sale a buscarlo
           con lo único que trae de fábrica: un <i>ping</i>, dos saltos y el
           descaro de devolver lo que le tiran.
           <span class="sep"></span>
           Ocho corazones. Los postes de restauración los reponen y marcan
           dónde volvés si se terminan.`,
    button: 'Cómo se juega',
  });
}

/** El manual de campo, en su propia página: los tres golpes y la consola. */
function controlsScreen() {
  showOverlay({
    eyebrow: 'Manual de campo',
    title: 'Cómo se juega',
    /* sin bajada: las dos chapas de la consola ya dicen qué hace cada mano */
    text: '',
    button: 'Elegir sector',
    board: CONTROLS,
  });
  overlay.scrollTop = 0;
}

/* ─────────────────────────────── el selector de sector

   Once fichas de archivo, una por capa, en el orden en que se rompen. La que
   todavía no se abrió se ve —el jugador tiene que saber cuánto le falta— pero
   se ve CERRADA: sin nombre y con el sello de bloqueo, porque el nombre de un
   sector es medio spoiler y porque lo que se promete es la profundidad, no el
   contenido.

   Un sector se abre al sanear el anterior, así que la primera partida muestra
   una sola ficha abierta y diez cerradas. Eso también es información: dice de
   entrada que el juego tiene once capas y que se bajan en orden. */

function sectorCard(i) {
  const abierto = isUnlocked(cleared, i);
  const hecho = cleared[i];
  const num = String(i + 1).padStart(2, '0');
  const clases = ['sector', abierto ? 'is-open' : 'is-locked', hecho ? 'is-done' : ''].join(' ');
  /* `button` y no `div`: navegable con tabulador y con Enter, sin escribir una
     línea de accesibilidad. El bloqueado va deshabilitado de verdad. */
  return `<button class="${clases}" data-sector="${i}" ${abierto ? '' : 'disabled'}
            aria-label="Sector ${num}${abierto ? `: ${LEVELS[i].name}` : ' (bloqueado)'}">
    <span class="sector__num">${num}</span>
    <span class="sector__name">${abierto ? LEVELS[i].name : '— — —'}</span>
    <span class="sector__layer">${abierto ? SECTOR_LAYERS[i] : 'sin acceso'}</span>
    <span class="sector__mark">${hecho ? 'saneado' : abierto ? 'abierto' : 'cerrado'}</span>
  </button>`;
}

function selectScreen() {
  const siguiente = furthestUnlocked(cleared);
  const saneados = cleared.filter(Boolean).length;
  showOverlay({
    eyebrow: 'Mapa de la intrusión',
    title: 'Elegí el sector',
    text: saneados
      ? `Saneados <b>${saneados}</b> de ${levelCount}. Cada capa se abre cuando cae la anterior.`
      : 'La intrusión bajó once capas. Se rompen de afuera hacia adentro: cada una se abre cuando cae la anterior.',
    button: saneados ? `Seguir en ${LEVELS[siguiente].name}` : 'Iniciar barrido',
    board: `<div class="sectors">${LEVELS.map((_, i) => sectorCard(i)).join('')}</div>`,
  });
  overlay.scrollTop = 0;
}

/* Un clic en una ficha abierta entra directo a ese sector. Va por delegación en
   el tablero y no ficha por ficha: el tablero se vuelve a escribir entero cada
   vez que se abre el selector, y los oyentes puestos uno por uno se perderían
   con él. */
elBoard.addEventListener('click', ev => {
  const ficha = ev.target.closest('.sector');
  if (!ficha || ficha.disabled) return;
  startAudio();
  enterSector(Number(ficha.dataset.sector));
});

/**
 * El parte del sector: qué procesos estrena este tramo. Cuenta qué es cada uno
 * y nunca cómo pelea — eso se descubre jugando. Los que ya se cruzaron no
 * vuelven a la grilla: el parte es para lo que todavía no vio.
 */
function briefingScreen(threats) {
  const one = threats.length === 1;
  showOverlay({
    eyebrow: `Sector ${String(G.levelIndex + 1).padStart(2, '0')} · ${G.level.name}`,
    title: one ? 'Proceso nuevo' : 'Procesos nuevos',
    text: one
      ? 'Esto no estaba en los sectores anteriores. Miralo antes de cruzártelo.'
      : 'Esto no estaba en los sectores anteriores. Miralos antes de cruzártelos.',
    button: 'Entrar al sector',
    dossier: true,
  });
  /* el cartel se ensancha con la cantidad de fichas: ningún sector estrena más
     de cuatro, así que siempre entran en una fila */
  elPanel.style.setProperty('--sheets', Math.min(threats.length, 4));
  buildDossier(elDossier, threats);
  overlay.scrollTop = 0;
}

/**
 * Arranca la partida de cero: el expediente se olvida de todo, así que la
 * primera vuelta y la segunda presentan lo mismo.
 */
function startRun() {
  met.clear();
  startLevel(0, false);
}

/**
 * Entrar directo a un sector elegido en el selector.
 *
 * Lo que no es obvio acá es la línea del expediente. Quien salta al sector 7 no
 * se cruzó nunca lo de los seis anteriores, así que el parte le presentaría de
 * golpe las ocho fichas de todo lo que hay en ese mapa — un examen, no un
 * aviso. Se da por visto lo de las capas previas: el parte vuelve a decir sólo
 * lo que ESE sector estrena, que es para lo que está.
 */
function enterSector(i) {
  met.clear();
  for (let previo = 0; previo < i; previo++)
    for (const entry of sectorThreats(previo)) met.add(entry.type);
  startLevel(i, false);
  menuStep = PORTADA;
  if (!enterLevel()) hideOverlay();
  prevMode = G.mode;
  Input.releaseAll();
  elBtn.blur();
}

/**
 * El paso entre cargar un sector y jugarlo. Si trae procesos que el jugador no
 * vio, primero pasa el parte —el mundo queda congelado detrás, con la misma
 * llave que la pausa— y devuelve `true` para que la capa no se cierre.
 */
function enterLevel() {
  if (G.mode !== 'brief') return false;      // el último sector limpio va a 'win'
  const fresh = sectorThreats(G.levelIndex).filter(entry => !met.has(entry.type));
  if (!fresh.length) return false;
  for (const entry of fresh) met.add(entry.type);
  pausedFrom = 'brief';
  G.mode = 'pause';
  briefingScreen(fresh);
  return true;
}

function pauseScreen() {
  showOverlay({
    eyebrow: G.level.name,
    title: 'En pausa',
    text: 'El proceso sigue cuando vos digas.',
    button: 'Retomar',
    board: CONTROLS,
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
  /* los dos pasos previos del menú no arrancan nada: pasan de página */
  if (G.mode === 'menu' && menuStep === PORTADA) {
    menuStep = MANUAL;
    controlsScreen();
    Input.releaseAll();
    return;
  }
  if (G.mode === 'menu' && menuStep === MANUAL) {
    menuStep = SELECTOR;
    selectScreen();
    Input.releaseAll();
    return;
  }

  let briefed = false;
  switch (G.mode) {
    /* desde el selector, el botón entra por donde quedó la partida anterior;
       para cualquier otro sector están las fichas */
    case 'menu':  menuStep = PORTADA; enterSector(furthestUnlocked(cleared)); return;
    case 'pause': G.mode = pausedFrom; break;
    case 'clear': advanceLevel(); briefed = enterLevel(); break;
    /* terminado el juego, el botón vuelve al selector en vez de reiniciar a la
       fuerza: con los once sectores abiertos, mandar de prepo al perímetro es
       tirarle abajo el progreso al que lo quiere rejugar salteado */
    case 'win':   menuStep = SELECTOR; G.mode = 'menu'; selectScreen(); Input.releaseAll(); return;
    default:      startLevel(G.levelIndex); briefed = enterLevel(); break;
  }
  /* si el sector estrena procesos, la capa se queda con el parte en pantalla */
  if (!briefed) hideOverlay();
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
    /* El sector queda saneado acá y en ningún otro lado: 'clear' y 'win' son
       los dos únicos estados a los que se llega cruzando la salida, así que es
       el punto exacto donde se gana el permiso para el siguiente. Se guarda en
       el momento y no al salir del juego — nadie cierra una pestaña con ganas
       de perder lo que acaba de terminar. */
    if (G.mode === 'clear') { cleared = markCleared(cleared, G.levelIndex); clearScreen(); stopAmbience(); }
    else if (G.mode === 'win') { cleared = markCleared(cleared, G.levelIndex); winScreen(); stopAmbience(); }
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
