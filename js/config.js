/* Constantes de mundo y ajuste fino de sensación.
   Todo está en "unidades de mundo": 1 tile = TS unidades, 60 pasos lógicos/seg. */

export const TS = 20;

/* Medidas del poste de restauración. Viven acá porque las comparten el que lo
   crea (world.js), el que lo dibuja y el phishing que lo imita: si el impostor
   midiera distinto, se delataría por la silueta antes que por el color. */
export const CHECKPOINT_W = 10;
export const CHECKPOINT_H = 30;

/* Altura visible fija; el ancho se adapta al formato de la ventana. */
export const VIEW_H = 360;
export const VIEW_W_MIN = 520;
export const VIEW_W_MAX = 960;

/* Física del personaje. Pensada para que el doble salto sea el verbo central:
   salto simple ≈ 3 tiles de altura, doble ≈ 5,5 tiles, alcance horizontal ≈ 6 tiles. */
export const PHYS = {
  runSpeed:    2.70,
  accelGround: 0.62,
  accelAir:    0.34,
  dragGround:  0.70,
  dragAir:     0.13,

  gravity:     0.55,   // subiendo
  fallGravity: 0.80,   // cayendo: más peso = aterrizajes legibles
  apexGravity: 0.33,   // suspensión en el vértice
  apexBand:    1.50,   // |vy| por debajo del cual aplica la suspensión
  maxFall:     11.0,

  jumpV:       8.30,   // primer impulso
  doubleV:     7.60,   // segundo impulso (se aplica absoluto, no acumulativo)
  cutMul:      0.42,   // soltar el botón recorta la subida

  coyote:      7,      // frames de gracia tras dejar el suelo
  buffer:      9,      // frames de gracia al pulsar antes de aterrizar
};

export const PLAYER = {
  w: 13, h: 26,
  maxHp: 8,
  invuln: 72,
  startGrenades: 3,
  maxGrenades: 6,
};

/* Dash de encriptación. Dura poco y da invulnerabilidad casi todo el tramo:
   sirve para atravesar una andanada, no para recorrer el mapa. Se recupera al
   tocar suelo, así que en el aire hay uno solo — igual que el doble salto. */
export const DASH = {
  frames:   11,     // duración del impulso
  speed:    6.6,    // velocidad horizontal mientras dura
  invuln:   13,     // cuadros de invulnerabilidad desde el arranque
  cooldown: 26,     // espera antes del siguiente, ya en el suelo
  endVx:    2.2,    // con cuánto se sale, para que no frene en seco
};

/* Parry rosa y barra de Purga. Sólo los paquetes corruptos (rosados) se pueden
   parar — ése es el contrato del color — pero se puede parar en cualquier lado:
   en el aire y también con los pies en el piso. Lo que lo mantiene como una
   decisión y no como un botón de pánico es el enfriamiento, no la postura.

   Parar no borra el paquete: lo devuelve convertido en disparo propio. Con
   `dmg` 12 mata de una a casi todo el bestiario (4–18 de integridad), que es lo
   que tiene que valer acertarle a algo que viene a matarte. */
export const PARRY = {
  window:  18,      // cuadros que dura la postura
  cooldown: 8,      // espera tras la postura, acierte o no
  bounce:  7.4,     // rebote vertical al acertar en el aire
  reward:  22,      // cuánto carga la barra un parry acertado
  freeze:  5,       // congelamiento del cuadro al acertar
  grace:   30,      // invulnerabilidad después de acertar
  dmg:     12,      // daño del paquete devuelto
  speed:   9.5,     // vuelve más rápido de lo que vino
};

/* Separación del rosado en cada ráfaga. El rosado sale siempre aparte, un
   rato después del resto: si sale pegado a balas normales, pararlo obliga a
   comerse la de al lado, y el parry deja de ser una decisión para ser un castigo. */
export const PINK_GAP = 26;         // cuadros entre la ráfaga normal y el rosado

export const PURGE = {
  max:     100,     // barra llena
  perHit:  1.1,     // lo que carga cada impacto de disparo propio
  damage:  14,      // daño a todo lo que esté en pantalla
  frames:  70,      // duración de la animación
};

/* Keylogger. Todo su ajuste vive acá porque es el único enemigo cuyo peligro no
   se mide en vida ni en daño sino en cuánto acierta, y eso hay que poder moverlo
   sin abrir su IA.

   Las dos perillas que de verdad cambian cómo se siente son `ready` —cuánto
   tiene que creer que sabe antes de animarse— y `spread`, el error que le queda
   incluso acertando la intención. Con `spread` en 0 y `ready` en 0 se vuelve un
   francotirador injusto; los valores de acá lo dejan peligroso pero engañable.

   `miss` es más grande que `hit` a propósito: aprender cuesta y desaprender es
   barato, así que romper el patrón se paga solo en dos o tres acciones. */
export const KEYLOG = {
  detect:    270,      // rango en el que empieza a registrar
  hist:      7,        // acciones que recuerda (5-8 es el rango sano)
  hit:       9,        // % que sube cuando su predicción acierta
  miss:      17,       // % que baja cuando falla
  forget:    70,       // cuadros sin acciones antes de empezar a olvidar
  decay:     0.5,      // % por cuadro que pierde mientras no pasa nada
  /* Los tres que marcan cuánto tarda en atacar, todos a la mitad de lo que eran
     (45, 300 y 110/175). Junta confianza con la mitad de aciertos, se cansa de
     mirar en la mitad del tiempo y vuelve a tirar al doble de seguido.

     Tiene un efecto de rebote que conviene conocer: animarse antes es animarse
     con menos confianza, y el error del punto predicho se achica con la
     confianza (ver `spread`). Así que ahora ataca el doble de seguido pero
     apunta peor — se paga solo, y en la dirección correcta. */
  ready:     23,       // % mínimo para animarse a predecir
  blind:     150,      // cuadros mirando sin poder predecir antes de tirar igual

  /* Éste NO se tocó, y es a propósito. El aviso es la ventana de reacción: todo
     este enemigo se sostiene en que el punto se ve medio segundo antes y se
     puede desmentir. Atacar más seguido es subir la presión; acortar el aviso
     sería sacarle el contrajuego y volverlo un francotirador. Si igual se
     quiere, es este número — pero ojo, también encoge la extrapolación. */
  lock:      34,       // cuadros de aviso con el punto marcado antes de tirar
  /* Velocidad del renglón. Manda más de lo que parece: es lo que decide si el
     paquete llega al punto en el instante predicho o cuando ya pasó todo.
     Contra alguien que corre alejándose a 2.7, un renglón lento no le gana
     nunca — bajarla de 4 lo convierte en un enemigo que adivina bien y llega
     tarde, que es la peor versión posible de este bicho. */
  speed:     4.4,
  /* Techo de la extrapolación, en cuadros. Es hasta dónde se anima a apostar.
     Contra alguien que corre alejándose, la intercepción honesta se resuelve
     cerca de los dos segundos: la mira aparece bastante adelante, y está bien
     que así sea — es "vas a seguir corriendo hasta ahí", que es justamente la
     apuesta que se le puede desmentir frenando. Bajarlo mucho no lo hace más
     justo, lo hace tirar corto: el punto queda calculado para un instante al que
     el paquete no llega, y vuelve el enemigo que adivina bien y llega tarde. */
  horizon:   130,
  cdMin:     55,       // espera tras atacar
  cdMax:     88,
  spread:    52,       // error máximo del punto predicho, en píxeles, con 0%
  judgeR:    34,       // radio con el que se juzga si el tiro estuvo bien puesto
  shots:     3,        // teclas por transmisión (la última sale rosada)
  ghost:     86,       // % desde el que puede soltar un eco
  ghostCd:   420,      // espera entre ecos
  ghostStep: 20,       // cuadros que dura cada acción reproducida por el eco
};

/* Duraciones de la máquina de estados (frames). */
export const TIMING = {
  brief:   150,
  death:   64,   // sin integridad: el velo se cierra y el sector arranca de nuevo
  sink:    30,   // caída al agua o a un pozo: vuelta al poste, y más corta
  respawn: 26,
};
