/* Expediente de amenazas: lo que se muestra antes del primer sector.

   Cada ficha dice QUÉ es la amenaza, nunca CÓMO pelea. Los movimientos y los
   avisos se aprenden jugando — si la ficha los contara, el primer encuentro
   dejaría de ser un descubrimiento y pasaría a ser un examen.

   Van en el orden en que aparecen, sector por sector.

   `pose` son campos que se le pisan al enemigo de muestra para que se lo vea
   como corresponde: el phishing en su forma real y no disfrazado, el
   exfiltrador con algo en la bolsa. */

export const BESTIARY = [
  { type: 'spambot', name: 'Spambot', sector: 1,
    text: 'Inunda la red con mensajes que nadie pidió. Donde hay uno, el tráfico se vuelve ruido.' },

  { type: 'keylogger', name: 'Keylogger', sector: 2,
    text: 'Anota en silencio cada tecla que se toca. Lo que escribiste deja de ser tuyo.' },

  { type: 'gusano', name: 'Gusano', sector: 2,
    text: 'No necesita que nadie lo abra: se copia solo. Dejarlo tranquilo nunca termina bien.' },

  { type: 'mitm', name: 'Man-in-the-Middle', sector: 2,
    text: 'Se mete en medio de cada conversación. Lo que le mandás no llega igual a destino.' },

  { type: 'botnet', name: 'Botnet · servidor C2', sector: 2,
    text: 'Una máquina que no pelea: da órdenes. Muchas otras le obedecen sin preguntar.' },

  { type: 'phishing', name: 'Phishing', sector: 3, pose: { mode: 'caza' },
    text: 'Se disfraza de lo que estás buscando. Lo que parece un regalo casi nunca lo es.' },

  { type: 'adware', name: 'Adware', sector: 4,
    text: 'No te quiere muerto: te quiere mirando otra cosa. Llena la pantalla de lo que nadie pidió.' },

  { type: 'spyware', name: 'Spyware', sector: 4,
    text: 'Anota dónde estás y a quién le sirve saberlo. Solo no hace daño; lo hace lo que llama.' },

  { type: 'troyano', name: 'Troyano', sector: 5,
    text: 'Por fuera, algo inofensivo. Lo peligroso no es lo que se ve: es lo que trae adentro.' },

  { type: 'rootkit', name: 'Rootkit', sector: 6, pose: { mode: 'caza' },
    text: 'Ya estaba adentro cuando llegaste. No se defiende de que lo busquen: se defiende de que lo miren.' },

  { type: 'ransomware', name: 'Ransomware', sector: 7,
    text: 'Cifra lo que encuentra y lo tiene de rehén. Lo que era tuyo pasa a tener dueño.' },

  { type: 'exfil', name: 'Exfiltrador', sector: 7, pose: { stolen: 2 },
    text: 'No le interesa pelear. Viene por lo que juntaste, y quiere irse con eso.' },

  { type: 'baron', name: 'Baron Von DDoS', sector: 7, boss: true,
    text: 'Satura hasta que nada responde. No entra al sistema: lo ahoga desde afuera.' },

  { type: 'monarca', name: 'The Rootkit Monarch', sector: 8, boss: true,
    text: 'Vive en lo más hondo, donde nadie mira. Desde ahí reescribe las reglas del sistema.' },

  { type: 'implante', name: 'El Implante', sector: 11, boss: true,
    text: 'No está en el sistema: está debajo. Apagar la máquina no lo borra, y formatear tampoco.' },
];

/** Nombre de la capa de cada sector, para la etiqueta de la ficha. */
export const SECTOR_LAYERS = [
  'perímetro', 'red', 'aplicación', 'sesión', 'sistema', 'sombra', 'datos',
  'control total', 'firmware', 'microcódigo', 'silicio',
];
