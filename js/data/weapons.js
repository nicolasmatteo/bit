/* Herramientas de Bit. El 'ping' es lo único que trae de fábrica: munición
   infinita, el resto se recoge de los depósitos. dmg está calibrado contra
   procesos hostiles de 4–18 de integridad.

   Además de los números de daño, cada herramienta trae su *sensación*: cuánto
   patea el brazo, cuánto dura y cuánto mide el fogonazo, qué forma tiene el
   paquete que sale y si escupe cápsulas usadas. Antes todo esto era idéntico
   para las cinco — un barrido de antivirus y un ping pateaban igual. */

export const WEAPONS = {
  /* El Ping tira a la cadencia del ping de verdad: UNA por segundo.
     `ping` en una consola —Windows, Linux o macOS, da igual— manda un eco por
     segundo y por eso las respuestas salen a razón de una por segundo. El bucle
     del juego corre a paso fijo de 1000/60 ms (ver main.js), así que `cd: 60`
     son exactamente esos 1000 ms. No es una aproximación: es el número.

     Eso lo convierte en otra arma. Antes era un goteo de 6 tiros por segundo a
     2 de daño; ahora es un golpe solo que hay que querer dar, y por eso el daño
     sube a 8 — un tiro se lleva de una a la mitad liviana del bestiario.
     Ocho y no doce, que sería el daño por segundo de antes: doce es lo que pega
     un paquete devuelto con el parry, y el parry tiene que seguir siendo lo que
     mata de una a casi todo. El arma de fábrica no puede empatarle al premio.

     La sensación acompaña al número: un tiro por segundo con la patada de un
     goteo se siente roto, así que patea, destella y sacude como lo que es. Eso
     es todo lo que se tocó además de `cd` y `dmg` — y es todo dibujo. El tamaño
     del paquete y el empujón del retroceso quedaron como estaban a propósito:
     uno decide si un tiro roza o no, el otro mueve a Bit, y cambiar el arma de
     fábrica no tenía por qué cambiar en silencio dónde pega ni dónde quedás. */
  ping: {
    name: 'Ping', tag: 'nativo',
    cd: 60, dmg: 8, speed: 7.4, ammo: Infinity,
    pellets: 1, spread: 0, size: [8, 3], color: '#4fd8e8', core: '#e8ffff', trail: 8,
    /* sensación */
    shot: 'packet', barrel: 13, kick: 11, flash: 10, flashScale: 1.5, flashPts: 6,
    shells: 0, push: 0.16, shake: 3,
  },
  /* Balance: el Flood hacía 30 de daño por segundo a cualquier distancia, sin
     contra, con 190 balas — le ganaba a todo. Ahora hace 24, abre más a
     distancia y trae 150. Sigue siendo la mejor para sostener fuego; ya no es
     la mejor para todo. */
  flood: {
    name: 'Flood', tag: 'automática',
    cd: 5, dmg: 2, speed: 8.6, ammo: 150,
    pellets: 1, spread: 0.085, size: [8, 2.6], color: '#ffd23d', core: '#fff6c6', trail: 5,
    shot: 'packet', barrel: 14, kick: 3, flash: 4, flashScale: 0.8, flashPts: 4,
    shells: 1, push: 0.12, shake: 0.9,
  },
  antivirus: {
    name: 'Antivirus', tag: 'barrido',
    cd: 27, dmg: 3, speed: 7.2, ammo: 28,
    pellets: 6, spread: 0.2, size: [4.5, 4.5], color: '#7de86a', core: '#e6ffd8', trail: 3,
    shot: 'spray', barrel: 12, kick: 11, flash: 9, flashScale: 1.6, flashPts: 6,
    shells: 2, push: 0.5, shake: 3.2, pump: 16,
  },
  /* La única que se carga: mantené el gatillo y soltá. A media carga es un
     ladrillo común; llena, sale el Blitz — más daño, más radio y un empujón que
     alcanza para cruzar un hueco de espaldas. `charge` son los cuadros hasta
     el tope; `blitz` es lo que cambia cuando llega. */
  firewall: {
    name: 'Firewall', tag: 'carga',
    cd: 30, dmg: 7, speed: 5.4, ammo: 12,
    pellets: 1, spread: 0, size: [11, 5], color: '#ff5a3c', core: '#ffd9a0', trail: 0, rocket: true,
    shot: 'brick', barrel: 15, kick: 15, flash: 12, flashScale: 2, flashPts: 6,
    shells: 0, push: 1.1, shake: 5,
    charge: 42,
    blitz: { dmg: 20, speed: 7.2, size: [17, 8], radius: 46, kick: 22, flash: 18, flashScale: 3, push: 2.4, shake: 11 },
  },
  /* Balance: con 4 de daño empataba al Flood en daño por segundo y encima
     perforaba. Baja a 3 por impacto, pero gana un nicho propio: atraviesa el
     escudo del troyano. Es el arma para el Kernel.

     Segunda pasada: a 9 cuadros de cadencia el nicho se le había ido de las
     manos. Veinte de daño por segundo, a cualquier distancia, atravesando lo
     que sea y por cuatro procesos a la vez — el troyano, que es el tanque del
     juego, se caía en menos de un segundo y de frente, que es justo lo que el
     escudo existía para impedir. La cadencia baja a 14 (13 de daño por segundo,
     por debajo del Flood) y el cargador a 60. No pierde el nicho: sigue siendo
     la única que perfora, y contra una fila sigue siendo la mejor del arsenal.
     Deja de ser también la mejor de a uno. */
  escaner: {
    name: 'Escáner', tag: 'perforante',
    cd: 14, dmg: 3, speed: 10.5, ammo: 60,
    pellets: 1, spread: 0, size: [14, 3], color: '#c08cff', core: '#f2e8ff', trail: 9, pierce: true,
    shot: 'beam', barrel: 13, kick: 4, flash: 7, flashScale: 1.1, flashPts: 4,
    shells: 0, push: 0.1, shake: 1,
  },
};

/* Lo que cuesta cada herramienta, en fragmentos de clave.
   Hay 55 fragmentos en todo el juego y las cuatro suman 47: una vuelta completa
   alcanza para todas, con poco margen. El orden de los precios es el orden en
   que conviene comprarlas, y el Flood vale exactamente lo que da el primer
   sector — juntar los cinco de El Perímetro se paga con un arma de verdad
   inmediatamente, que es la lección que la economía tiene que enseñar primero. */
export const TOOL_PRICE = {
  flood:     5,
  antivirus: 10,
  escaner:   14,
  firewall:  18,
};

/** Orden fijo del arsenal: define los slots 1–5 y el ciclo Q/E. */
export const WEAPON_ORDER = Object.keys(WEAPONS);
