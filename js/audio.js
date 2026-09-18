/* Síntesis con WebAudio, pensada como el sonido de un sistema y no de una
   pelea: pitidos de error, apretones de mano de módem, ráfagas de paquetes,
   el zumbido de una sala de servidores. Cada evento del juego suena como lo
   que representa en una red — un golpe es un error, matar es terminar un
   proceso, el checkpoint es un respaldo guardado.

   La textura digital sale de un solo lugar: un reductor de bits (WaveShaper
   con la curva escalonada) por el que pasan los sonidos "sucios". Los limpios
   —parry, fragmentos, checkpoint— van directo, así se distinguen de oído lo
   bueno de lo hostil.

   Se inicializa con el primer gesto del usuario (requisito de los navegadores).
   La API es la misma de siempre: nadie afuera de este archivo tuvo que cambiar. */

let ac = null, master = null, crush = null, padGain = null;
let padNodes = [], chatterTimer = 0;
let ready = false, muted = false;
let NOISE = null;

const VOLUME = 0.5;

function noiseBuf(ctx) {
  const len = ctx.sampleRate * 1.2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

/** Curva de reductor de bits: la señal sólo puede tomar `steps` valores. */
function crushCurve(steps) {
  const n = 2048, c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    c[i] = Math.round(x * steps) / steps;
  }
  return c;
}

export function initAudio() {
  if (ready) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ac = new AC();
  NOISE = noiseBuf(ac);

  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -18; comp.ratio.value = 6; comp.attack.value = 0.004;

  master = ac.createGain();
  master.gain.value = muted ? 0 : VOLUME;
  master.connect(comp).connect(ac.destination);

  /* El bus digital: todo lo que entra acá sale escalonado. Se amplifica ANTES
     del reductor y se compensa después — con 7 escalones, cualquier cosa por
     debajo de ~0.07 de amplitud se redondea a cero, y la mayoría de los
     efectos pican entre 0.06 y 0.1: sin la ganancia previa quedaban mudos. */
  const shaper = ac.createWaveShaper();
  shaper.curve = crushCurve(7);
  shaper.oversample = 'none';
  crush = ac.createGain();
  crush.gain.value = 4;
  const crushOut = ac.createGain();
  crushOut.gain.value = 0.8 / 4;
  crush.connect(shaper).connect(crushOut).connect(master);

  padGain = ac.createGain();
  padGain.gain.value = 0;
  padGain.connect(master);

  ready = true;
}

export function resumeAudio() {
  if (ac && ac.state === 'suspended') ac.resume();
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.setTargetAtTime(muted ? 0 : VOLUME, ac.currentTime, 0.05);
  return muted;
}
export const isMuted = () => muted;

/* ─────────────────────────────── ladrillos */

function env(node, t0, peak, attack, decay) {
  node.gain.setValueAtTime(0.0001, t0);
  node.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), t0 + attack);
  node.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
}

/** Ruido filtrado. `dirty` lo manda por el reductor de bits. */
function noiseHit({ freq = 900, q = 1.4, peak = 0.3, attack = 0.004, decay = 0.14,
                    type = 'bandpass', dirty = false, at = 0 }) {
  if (!ready) return;
  const t0 = ac.currentTime + at;
  const src = ac.createBufferSource();
  src.buffer = NOISE;
  src.playbackRate.value = 0.7 + Math.random() * 0.6;
  const f = ac.createBiquadFilter();
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ac.createGain();
  env(g, t0, peak, attack, decay);
  src.connect(f).connect(g).connect(dirty ? crush : master);
  src.start(t0); src.stop(t0 + attack + decay + 0.05);
}

/** Tono con barrido opcional. `at` lo agenda, `dirty` lo ensucia. */
function tone({ freq = 440, to = null, peak = 0.2, attack = 0.005, decay = 0.2,
                type = 'sine', dirty = false, at = 0 }) {
  if (!ready) return;
  const t0 = ac.currentTime + at;
  const o = ac.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + attack + decay);
  const g = ac.createGain();
  env(g, t0, peak, attack, decay);
  o.connect(g).connect(dirty ? crush : master);
  o.start(t0); o.stop(t0 + attack + decay + 0.05);
}

/**
 * Modulación de frecuencia rápida: el chirrido de un módem negociando. Un
 * oscilador mueve la frecuencia del otro, y el índice barre para que "busque".
 */
function modem({ carrier = 900, to = 2200, mod = 240, index = 400, peak = 0.12,
                 decay = 0.2, at = 0, dirty = true }) {
  if (!ready) return;
  const t0 = ac.currentTime + at;
  const c = ac.createOscillator(), m = ac.createOscillator();
  const mg = ac.createGain(), g = ac.createGain();
  c.type = 'square'; m.type = 'sine';
  c.frequency.setValueAtTime(carrier, t0);
  c.frequency.exponentialRampToValueAtTime(to, t0 + decay);
  m.frequency.setValueAtTime(mod, t0);
  mg.gain.setValueAtTime(index, t0);
  mg.gain.linearRampToValueAtTime(index * 0.2, t0 + decay);
  m.connect(mg).connect(c.frequency);
  env(g, t0, peak, 0.004, decay);
  c.connect(g).connect(dirty ? crush : master);
  c.start(t0); m.start(t0);
  c.stop(t0 + decay + 0.05); m.stop(t0 + decay + 0.05);
}

/** Secuencia de pitidos cortos: una ráfaga de datos, un arpegio de sistema. */
function blips(freqs, { step = 0.05, len = 0.04, peak = 0.08, type = 'square', dirty = false, at = 0 } = {}) {
  freqs.forEach((f, i) => tone({ freq: f, peak, attack: 0.002, decay: len, type, dirty, at: at + i * step }));
}

/** Tartamudeo digital: el mismo golpe de ruido repetido muy rápido, cada vez más bajo. */
function glitch({ freq = 2400, count = 4, gap = 0.025, peak = 0.14, at = 0 } = {}) {
  for (let i = 0; i < count; i++) {
    noiseHit({ freq, q: 2, peak: peak * (1 - i / count), attack: 0.001, decay: 0.018, dirty: true, at: at + i * gap });
  }
}

/* ─────────────────────────────── eventos del juego */

export const Sfx = {
  shot(kind) {
    if (kind === 'firewall') {
      /* un bloque de muro: golpe grave y escalonado */
      tone({ freq: 150, to: 45, peak: .3, decay: .3, type: 'square', dirty: true });
      noiseHit({ freq: 320, q: .7, peak: .3, decay: .28, type: 'lowpass', dirty: true });
    } else if (kind === 'antivirus') {
      /* barrido de escaneo: ráfaga de ruido que cae */
      noiseHit({ freq: 2200, q: .6, peak: .26, decay: .18, dirty: true });
      tone({ freq: 700, to: 180, peak: .12, decay: .15, type: 'square', dirty: true });
    } else if (kind === 'escaner') {
      /* un láser que lee: barrido limpio hacia arriba con un temblor de FM */
      modem({ carrier: 620, to: 2600, mod: 60, index: 90, peak: .09, decay: .14, dirty: false });
    } else if (kind === 'flood') {
      /* un paquete más en la avalancha: tic seco y corto */
      tone({ freq: 1900, to: 1100, peak: .07, attack: .001, decay: .035, type: 'square', dirty: true });
    } else {
      /* ping: el pulso de sonar de un ping de red */
      tone({ freq: 1320, to: 1180, peak: .12, attack: .002, decay: .12, type: 'sine' });
      tone({ freq: 2640, peak: .03, attack: .001, decay: .03, type: 'square', dirty: true });
    }
  },

  /* apretón de mano de módem: el cifrado se establece en un chirrido */
  dash() {
    modem({ carrier: 700, to: 2400, mod: 310, index: 520, peak: .1, decay: .16 });
    noiseHit({ freq: 3200, q: .6, peak: .07, decay: .12, type: 'highpass' });
  },

  /* acceso concedido: lo más limpio y agudo del juego, corta por encima de todo */
  parry() {
    blips([1568, 2093, 3136], { step: .045, len: .09, peak: .13, type: 'triangle' });
    tone({ freq: 3136, to: 4186, peak: .06, attack: .002, decay: .3, type: 'sine', at: .1 });
  },

  /* purga del sistema: sube el barrido y cae el borrado en cascada */
  purge() {
    tone({ freq: 110, to: 1760, peak: .22, attack: .01, decay: .45, type: 'sawtooth', dirty: true });
    blips([2637, 2349, 1976, 1568, 1319, 1047, 880, 659], { step: .045, len: .05, peak: .07, dirty: true, at: .35 });
    noiseHit({ freq: 1200, q: .3, peak: .3, decay: .8, type: 'lowpass' });
  },

  jump(double) {
    tone({ freq: double ? 660 : 440, to: double ? 1320 : 880, peak: .07, attack: .004, decay: .1, type: 'square', dirty: true });
    if (double) tone({ freq: 1760, peak: .04, attack: .002, decay: .06, type: 'sine', at: .05 });
  },

  land() { noiseHit({ freq: 240, q: .8, peak: .1, decay: .08, dirty: true }); },

  /* el pitido de error: dos notas que bajan y no cierran */
  hurt() {
    tone({ freq: 440, peak: .16, attack: .002, decay: .09, type: 'square', dirty: true });
    tone({ freq: 311, peak: .16, attack: .002, decay: .18, type: 'square', dirty: true, at: .1 });
    glitch({ freq: 1800, count: 3, peak: .1, at: .02 });
  },

  boom() {
    noiseHit({ freq: 200, q: .4, peak: .5, decay: .55, type: 'lowpass', dirty: true });
    tone({ freq: 80, to: 28, peak: .34, decay: .5, type: 'sine' });
    glitch({ freq: 900, count: 5, gap: .03, peak: .12, at: .05 });
  },

  /* proceso terminado */
  kill() {
    blips([988, 740, 494], { step: .045, len: .05, peak: .09, dirty: true });
    glitch({ freq: 2600, count: 3, peak: .08, at: .12 });
  },

  /* fragmento de clave: tres notas limpias que suben */
  shard() { blips([1319, 1760, 2637], { step: .06, len: .12, peak: .08, type: 'sine' }); },

  /* el gusano se duplica: la misma nota dos veces, apenas corrida */
  split() {
    tone({ freq: 520, peak: .1, attack: .002, decay: .08, type: 'square', dirty: true });
    tone({ freq: 548, peak: .1, attack: .002, decay: .08, type: 'square', dirty: true, at: .06 });
  },

  /* descarga completa */
  pickup() { blips([880, 1320], { step: .07, len: .12, peak: .1, type: 'triangle' }); },

  /* relé: dos clics */
  swap() {
    noiseHit({ freq: 3000, q: 3, peak: .08, attack: .001, decay: .02, dirty: true });
    noiseHit({ freq: 2200, q: 3, peak: .06, attack: .001, decay: .02, dirty: true, at: .05 });
  },

  /* respaldo guardado */
  checkpoint() { blips([523, 659, 784, 1047], { step: .08, len: .22, peak: .08, type: 'sine' }); },

  /* sector saneado: acorde que sube y una ráfaga de confirmación */
  gate() {
    tone({ freq: 131, to: 523, peak: .16, decay: .9, type: 'sine' });
    tone({ freq: 196, to: 784, peak: .09, decay: .9, type: 'sine' });
    blips([1047, 1319, 1568, 2093], { step: .07, len: .1, peak: .06, type: 'triangle', at: .7 });
  },

  /* golpe de tipo: la barra contra el rodillo. Seco, de madera y metal */
  keystroke() {
    noiseHit({ freq: 2600, q: 2.2, peak: .09, attack: .001, decay: .025, dirty: true });
    tone({ freq: 420, to: 260, peak: .05, attack: .001, decay: .04, type: 'square', dirty: true });
  },

  /* campanilla de fin de renglón: lo que avisa que el registro sale entero */
  bell() {
    tone({ freq: 2093, peak: .1, attack: .002, decay: .38, type: 'sine' });
    tone({ freq: 3136, peak: .05, attack: .002, decay: .26, type: 'sine', at: .01 });
    noiseHit({ freq: 5200, q: 1.4, peak: .05, decay: .1, type: 'highpass' });
  },

  /* alerta: dos tonos alternados, como una alarma de sistema */
  telegraph() {
    tone({ freq: 988, peak: .06, attack: .002, decay: .07, type: 'square', dirty: true });
    tone({ freq: 740, peak: .06, attack: .002, decay: .07, type: 'square', dirty: true, at: .09 });
  },
};

/* ─────────────────────────────── fondo: sala de servidores

   Tres capas. El zumbido eléctrico (la base del tema, doblada, con su tercer
   armónico), el ventilador (ruido filtrado en loop) y la charla de datos:
   pitidos agudos sueltos, muy bajos, a intervalos irregulares. Lo último es
   lo que hace que suene "a sistema vivo" y no a pad de sintetizador. */

/* Qué tema está sonando. Volver a armar el pad se escucha —el zumbido se corta
   y arranca de nuevo—, así que si ya suena ese mismo fondo no se toca. Sirve
   para cualquier recarga del mismo nivel: `restartLevel()`, o volver a entrar
   a un sector del mismo tema. */
let ambience = null;

export function setAmbience(theme) {
  if (!ready) return;
  if (theme === ambience && padNodes.length) return;
  stopAmbience();
  ambience = theme;
  const t0 = ac.currentTime;
  const base = theme.drone || 55;

  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = 0.5;
  lp.connect(padGain);

  /* zumbido de la instalación */
  for (const [mult, gain, type] of [[2, .5, 'sine'], [3, .14, 'sine'], [1, .22, 'triangle'], [4.01, .05, 'sawtooth']]) {
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.value = base * mult;
    const g = ac.createGain();
    g.gain.value = gain;
    o.connect(g).connect(lp);
    o.start(t0);
    padNodes.push(o);
  }

  /* el filtro respira muy despacio: la carga del sistema sube y baja */
  const lfo = ac.createOscillator();
  lfo.frequency.value = 0.04;
  const lfoGain = ac.createGain();
  lfoGain.gain.value = 220;
  lfo.connect(lfoGain).connect(lp.frequency);
  lfo.start(t0);
  padNodes.push(lfo);

  /* ventiladores */
  const fan = ac.createBufferSource();
  fan.buffer = NOISE;
  fan.loop = true;
  const fanF = ac.createBiquadFilter();
  fanF.type = 'bandpass'; fanF.frequency.value = 420; fanF.Q.value = 0.7;
  const fanG = ac.createGain();
  fanG.gain.value = 0.35;
  fan.connect(fanF).connect(fanG).connect(padGain);
  fan.start(t0);
  padNodes.push(fan);

  padGain.gain.setTargetAtTime(0.09, t0, 2.5);
  scheduleChatter();
}

/** La charla de datos: se reagenda sola a intervalos irregulares. */
function scheduleChatter() {
  chatterTimer = setTimeout(() => {
    if (!ready) return;
    const n = 1 + Math.floor(Math.random() * 4);
    const hi = 2400 + Math.random() * 3200;
    const freqs = Array.from({ length: n }, () => hi * (0.8 + Math.random() * 0.4));
    /* por el camino limpio: a este volumen el reductor lo borraría entero */
    blips(freqs, { step: .035 + Math.random() * .03, len: .02, peak: .012 });
    scheduleChatter();
  }, 400 + Math.random() * 1600);
}

export function stopAmbience() {
  ambience = null;
  if (!ready) return;
  clearTimeout(chatterTimer);
  chatterTimer = 0;
  padGain.gain.setTargetAtTime(0.0001, ac.currentTime, 0.4);
  const dying = padNodes; padNodes = [];
  setTimeout(() => dying.forEach(n => { try { n.stop(); } catch { /* ya detenido */ } }), 1400);
}
