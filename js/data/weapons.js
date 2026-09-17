/* Herramientas de Bit. El 'ping' es lo único que trae de fábrica: munición
   infinita, el resto se recoge de los depósitos. dmg está calibrado contra
   procesos hostiles de 4–18 de integridad.

   Además de los números de daño, cada herramienta trae su *sensación*: cuánto
   patea el brazo, cuánto dura y cuánto mide el fogonazo, qué forma tiene el
   paquete que sale y si escupe cápsulas usadas. Antes todo esto era idéntico
   para las cinco — un barrido de antivirus y un ping pateaban igual. */

export const WEAPONS = {
  ping: {
    name: 'Ping', tag: 'nativo',
    cd: 10, dmg: 2, speed: 7.4, ammo: Infinity,
    pellets: 1, spread: 0, size: [8, 3], color: '#4fd8e8', core: '#e8ffff', trail: 6,
    /* sensación */
    shot: 'packet', barrel: 13, kick: 5, flash: 6, flashScale: 1, flashPts: 5,
    shells: 0, push: 0.16, shake: 1.2,
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
     escudo del troyano. Es el arma para el Kernel. */
  escaner: {
    name: 'Escáner', tag: 'perforante',
    cd: 9, dmg: 3, speed: 10.5, ammo: 80,
    pellets: 1, spread: 0, size: [14, 3], color: '#c08cff', core: '#f2e8ff', trail: 9, pierce: true,
    shot: 'beam', barrel: 13, kick: 4, flash: 7, flashScale: 1.1, flashPts: 4,
    shells: 0, push: 0.1, shake: 1,
  },
};

/* Lo que puede salir de un depósito de herramientas. */
export const DROP_POOL = ['flood', 'antivirus', 'firewall', 'escaner'];

/** Orden fijo del arsenal: define los slots 1–5 y el ciclo Q/E. */
export const WEAPON_ORDER = Object.keys(WEAPONS);
