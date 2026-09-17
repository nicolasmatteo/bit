# BIT PATROL — Protocolo Ceniza

Juego de plataformas y acción en `<canvas>`, sin dependencias ni compilación.
Once sectores de una red comprometida, un bit con sombrero de inspector, y tres
verbos: **el doble salto**, **el dash de encriptación** y **el parry rosa**.

Dibujado como un corto animado de 1936: color plano, contorno de tinta grueso,
la línea temblando a doce cuadros por segundo y la copia virada al sepia.

---

## Publicarlo en GitHub Pages

El sitio es estático y usa rutas relativas, así que funciona tal cual desde la
raíz del repositorio o desde un subdirectorio (`usuario.github.io/bit-patrol/`).

**Opción A — rama (lo más rápido)**

1. Subí el repositorio a GitHub.
2. *Settings → Pages → Build and deployment*.
3. En *Source* elegí **Deploy from a branch**, rama `main`, carpeta `/ (root)`.
4. Guardá. En un minuto la URL queda publicada.

**Opción B — con el flujo de trabajo incluido**

En *Settings → Pages → Source* elegí **GitHub Actions**. El archivo
[`.github/workflows/pages.yml`](.github/workflows/pages.yml) valida los niveles
antes de publicar, así un mapa roto nunca llega a producción.

El archivo `.nojekyll` está incluido para que Jekyll no filtre nada.

### Probarlo en local

Los módulos ES no cargan desde `file://`: hace falta un servidor.

```bash
npx serve .          # o: python -m http.server 8080
```

Después abrí `http://localhost:8080`.

---

## Controles

Una mano camina, la otra pelea, y el pulgar salta. La única decisión es de qué
lado querés cada mano: con el agarre WASD las acciones caen en la fila de
reposo de la derecha (`J` `K` `L`), y con el agarre de flechas se usa el racimo
clásico de la izquierda (`Z` `X` `C` `V`), que sigue siendo el de siempre.

```
  agarre WASD                                agarre flechas
  [Q][W][E]            [U]                   [B]            [↑]
   [A][S][D]         [J][K][L]                [Z][X][C][V]  [←][↓][→]
    [Shift]                                    [Shift]
        [=========== espacio ===========]
```

| Acción | Racimo ZXC | Fila JKL |
|---|---|---|
| Moverse | `←` `→` | `A` `D` |
| Apuntar arriba / abajo | `↑` `↓` | `W` `S` |
| Saltar / **doble salto** | `espacio` | `espacio` |
| **Dash de encriptación** | `Z` · `Shift` | `Shift` |
| Disparar (con el **Firewall**: mantener carga el *Blitz*) | `X` | `J` |
| Granada | `C` | `K` |
| **Parry** (sobre paquetes rosados: vuelven como disparo tuyo) | `V` | `L` |
| **Purga** (con la barra llena) | `B` · `F` | `U` |

Y aparte: `↓`+`espacio` baja de una losa · `Q` `E` o `1`–`5` cambian de
herramienta · `P` pausa · `M` sonido.

En pantallas táctiles aparecen botones en pantalla y el teclado se oculta.

---

## El reparto

**Bit** — un bit defensivo con gabán y sombrero de inspector. Trae un `ping` de
fábrica; el resto del arsenal se recoge de los depósitos.

| Herramienta | Qué hace |
|---|---|
| **Ping** | munición infinita, el don de fábrica |
| **Flood** | automática, cadencia alta |
| **Antivirus** | barrido de corto alcance, seis gotas por disparo |
| **Firewall** | se carga manteniendo el gatillo: suelto a medias es un ladrillo, lleno es el **Blitz** (triple daño y radio) |
| **Escáner** | perforante, atraviesa hasta cuatro procesos |

### Procesos hostiles

| Marca | Proceso | Cómo se comporta |
|---|---|---|
| `s` | **Spambot** | patrulla y vomita ventanas emergentes en ráfagas de tres |
| `h` | **Troyano** | acorazado y lento; el escudo frontal bloquea de frente, y al reventar libera una camada de bichos |
| `d` | **Phishing Bug** | sobre con alas; vuela en zigzag y suelta un anzuelo |
| `t` | **Ransomware Lock** | fijo; tira cadenas hasta que se le rompe la combinación, y ahí recibe el doble |
| `k` `K` | **Keylogger** | ciempiés pegado al suelo (`k`) o al techo (`K`); deja teclas flotando que duelen |
| `g` | **Worm** | si toca el suelo y sobrevive un rato, se parte en dos |
| `a` | **Adware** | abre ventanas alrededor tuyo: las rosadas muerden y las verdes regalan. Romper una trampa suelta un bicho |
| `y` | **Spyware** | te lee en línea recta y le pasa tu posición a todo el sector; si te lee demasiado tiempo, suena la alarma |
| `R` | **Rootkit** | nace camuflado y quieto. Si lo dejás vivo se mete adentro de otro proceso, y ese ataca al doble |
| `B` | **The Rootkit Monarch** | da vuelta la gravedad de la arena, tira coronas de sellos y pisa fuerte |
| `D` | **Baron Von DDoS** | botnet de tres cabezas; abanicos, espirales e inundaciones desde arriba |
| `I` | **El Implante** | soldado al piso; barre, tapa y satura — y dos veces por pelea se copia y hay que encontrar cuál es |

---

## Cómo está armado

```
index.html            estructura y capa de interfaz (HTML, no canvas)
css/style.css         rótulos de cartón, tipografía, controles táctiles
js/
  config.js           constantes de mundo, física, dash, parry y purga
  util.js             matemática, color y ruido determinístico
  input.js            teclado + táctil, con pulsos de un solo cuadro
  audio.js            síntesis WebAudio (efectos y fondo atmosférico)
  main.js             arranque, bucle de paso fijo, máquina de interfaz
  data/
    themes.js         paleta y receta de fondo de cada sector
    weapons.js        herramientas: daño, y también patada, fogonazo y vainas
    levels.js         los once mapas (texto plano)
  game/
    state.js          estado compartido: mundo (G) y Bit (P)
    world.js          carga del mapa, rejilla de colisión, plataformas móviles
    player.js         movimiento, salto, dash, parry, purga, disparo, recogidas
    enemies.js        el bucle de enemigos y el despachante por tipo
    enemies/
      spawn.js        la fábrica: un `case` por tipo
      shared.js       cola de disparos diferidos y puntería al vuelo
      grunts.js       spambot, troyano, keylogger, gusano y bicho
      phishing.js     el mímico, sus disfraces y el anzuelo
      ransomware.js   el que te saca el piso
      network.js      botnet (C2), Man-in-the-Middle y exfiltrador
      intruders.js    rootkit, spyware, adware y sus ventanas
      bosses.js       los tres jefes, sus copias y la arena que no pueden dejar
    projectiles.js    paquetes propios, fuego hostil, granadas
    combat.js         daño, muerte y explosiones (punto único)
    fx.js             partículas, anillos, estrellas, sacudida de cámara
    game.js           nivel, cámara, estados, condición de salida
  render/
    ink.js            vocabulario de dibujo: contorno, boil, nubes, estrellas
    background.js     cielo, nubes, parallax, aire, viraje y pátina de película
    terrain.js        terreno pre-renderizado por trozos, líquidos, losas
    actors.js         la puerta al reparto: re-exporta lo dibujable
    actors/
      base.js         proporciones, paleta y las piezas de cara comunes
      bit.js          Bit y la herramienta que lleva en la mano
      enemies.js      los procesos hostiles y el despachante por tipo
      phishing.js     el mímico, que dibuja lo que imita
      ransomware.js   el candado y las zonas cifradas que sostiene
      intruders.js    rootkit (y su camuflaje), spyware y adware
      bosses.js       el Monarca, el Barón y el Implante
      props.js        cajones, recogidas, postes y la puerta de salida
      projectiles.js  todo lo que vuela
      particles.js    lo que queda en el aire después
    hud.js            interfaz en pantalla, barra de Purga y cartel de sector
    renderer.js       composición del cuadro y escalado al viewport
tools/
  level-check.mjs       el análisis de un mapa, sin consola (lo corre Node y el navegador)
  validate-levels.mjs   el verificador de línea de comandos
```

### Decisiones que conviene conocer antes de tocar nada

- **La física manda sobre el diseño.** Los valores de `PHYS` en
  [`js/config.js`](js/config.js) definen un salto simple de 3 tiles de alto y un
  doble salto de 5 de alto por ~6 de largo. Todos los mapas están medidos contra
  eso. Si cambiás `jumpV`, `gravity` o `runSpeed`, volvé a correr el verificador.
  El dash **no** ensancha esa envolvente a propósito: es plano, corto y se gasta
  una sola vez por estadía en el aire, igual que el segundo salto.
- **El rosa es una promesa.** Un proyectil rosado (`corrupt`) siempre se puede
  parar; uno que no lo es, nunca. Ese contrato vale en todo el juego, y por eso
  el rosa no se usa de adorno en ningún otro lado. Cada familia de enemigos tira
  al menos un paquete corrupto, así que el parry nunca deja de ser una opción.
- **Parar es devolver.** El paquete parado no se borra: sale como disparo propio
  —12 de daño y perforante— hacia el proceso hostil más cercano, o de vuelta por
  donde vino si no hay ninguno. Por eso el parry se paga solo y no depende de la
  Purga para valer la pena. Se puede parar en el aire y en el piso; lo que lo
  mantiene como decisión es el enfriamiento de `PARRY.cooldown`, no la postura.
- **El terreno se dibuja una sola vez por nivel**, en lienzos de 512 unidades de
  ancho (`render/terrain.js`). Por eso puede permitirse el contorno de tinta,
  vetas y cornisas irregulares sin costo por cuadro.
- **El bucle es de paso fijo a 60 Hz** con acumulador; el dibujo va a la tasa de
  refresco. Toda la lógica está en unidades por cuadro, no por segundo.
- **Ganar la raíz no era el final.** Un implante de firmware vive más abajo que
  el sistema operativo: sobrevive a que le ganes el root y a que apagues la
  máquina. Por eso el juego sigue tres capas más allá del Monarca —firmware,
  microcódigo y silicio— en el mismo orden de siempre, hacia adentro.
- **El Implante se copia, y las dos pistas ya las sabés.** Al cruzar dos tercios
  y un tercio de integridad se apaga y aparecen tres copias idénticas: mismo
  dibujo, misma silueta. Lo delatan dos cosas que el juego enseñó antes —
  **proyecta sombra** (las copias flotan, y lo que flota no tiene sombra; es la
  misma pista del Rootkit camuflado) y **el Escáner**, cuyo disparo perforante
  lo hace parpadear igual que le rompe el camuflaje al Rootkit. Mientras dura la
  fase no ataca y recibe el doble: es un acertijo, no una carrera. Romper una
  copia no cuesta vida, cuesta tiempo.
- **Un jefe no se cae de su arena.** El líquido y las púas sólo lastiman a Bit,
  así que un jefe metido en un pozo no se muere: se va del mapa y deja el sector
  sin terminar, porque la puerta no abre mientras viva. Por eso los jefes sólo
  pisan piso sano (`safeGroundBelow()` en [`js/game/world.js`](js/game/world.js))
  y, si algo igual los corrió de ahí, vuelven flotando al último lugar bueno.
  Al diseñar una arena eso también es el límite: el jefe no cruza el líquido, y
  el verificador de mapas avisa si un jefe nace sin piso sano bajo su ancho o con
  menos de diez tiles para moverse — un jefe clavado deja el sector sin final.
- **El parry se enseña una sola vez.** La primera vez en la partida que entra en
  cuadro un paquete rosado, el tiempo se espesa y sale un cartel
  (`teachParry()` en [`js/game/game.js`](js/game/game.js)). Se dispara con lo que
  se ve y no con el número de sector: si algún día el primer rosado aparece
  antes, la lección lo sigue sola.
- **Los enemigos telegrafían.** Cada ataque tiene un aviso visible (línea de
  puntería, ojo que late, fisura en el gusano) antes de salir.
- **Hay tres que no atacan a tu vida sino a lo que sabés.** Viven juntos en
  [`js/game/enemies/intruders.js`](js/game/enemies/intruders.js) y cada uno pide
  un verbo distinto del jugador:
  - el **Rootkit** está camuflado hasta que lo revelan. Se revela solo si te le
    acercás —y ahí ya te saltó encima— o a distancia, con el **Escáner**: ese
    disparo perforante le rompe el camuflaje aunque no lo toque, que es la única
    vez en el juego en que disparar sirve para *ver*. Camuflado igual proyecta
    sombra y deja un píxel parpadeando: mirar con cuidado siempre alcanza.
  - el **Spyware** no pega, delata. Mientras te vea en línea recta, todo lo que
    esté cerca sabe dónde estás, y a los 300 cuadros de lectura suena la alarma.
    Se responde con una pared en el medio o con el **dash**, que es el dash *de
    encriptación*: mientras dura no hay nada que leer.
  - el **Adware** tapa la pantalla con ventanas. Distinguir la que muerde de la
    que regala es toda la mecánica, y por eso se ven distinto de lejos.
- **Un proceso infiltrado ataca al doble.** El Rootkit metido adentro de otro
  enemigo no le agrega código a nadie: `updateEnemies` le resta `e.cd` una vez
  más por cuadro, y como *todas* las familias cuentan su ataque con `--e.cd`, la
  habilidad extra funciona en todas sin que ninguna sepa que existe. Al morir el
  anfitrión, el Rootkit sale vivo y ya descubierto.
- **Todo lo que se dibuja pasa por [`render/ink.js`](js/render/ink.js).** Color
  plano y contorno negro: nada de degradés sobre los cuerpos. La línea "hierve"
  (`boil()`) cada 5 cuadros, o sea 12 veces por segundo, aunque el juego corra a
  60 — es lo que hace que parezca redibujada a mano y no interpolada. El volumen
  lo da `shadeHalf()`: media forma en tono oscuro con el borde recto, siempre
  abajo a la derecha, igual en todo el reparto.
- **El canon de los personajes no es anatómico.** La cabeza ocupa la mitad de la
  figura; el cuerpo es un pedestal. Los miembros son mangueras de grosor
  constante, sin codo ni rodilla — la curva hace de articulación. Las manos son
  manoplas blancas que flotan sueltas del brazo, los pies son bulbos, y los ojos
  son tartas blancas con una pupila enorme (`pieEye()`). Hasta el mobiliario
  hostil tiene cara: si algo no tiene ojos, no pertenece a este juego.
  Las constantes de proporción están arriba de
  [`render/actors.js`](js/render/actors.js); tocarlas mueve a todo el reparto.
- **El caño dibujado y el punto del que sale el paquete son el mismo.**
  `gunRig()` y `muzzlePoint()` viven en [`game/player.js`](js/game/player.js) y
  los usan por igual la lógica de disparo y el renderizador. Si tocás la pose
  del brazo, el disparo la sigue solo.
- **Sin vidas ni puntaje.** Bit aguanta ocho corazones; cuando se le acaban
  vuelve al último poste de restauración (`!`) y el mapa sigue como estaba: lo
  que mataste sigue muerto, lo que juntaste sigue juntado. Reaparecer no vuelve
  a cargar el nivel ni a repintar el terreno — la espera después de morir es la
  animación y nada más.
- **El poste (`!`) hace dos cosas y por eso lleva dos banderas.** `on` es dónde
  reaparecés, y es exclusivo: encender uno apaga al anterior. `healed` es que
  ese poste ya repuso los corazones, y es de cada uno para siempre — con una
  sola bandera, ir y volver entre dos postes curaría sin fin. La cura no se
  gasta si llegás entero. De eso vive el mímico `r`, que imita justo esto.

---

## Editar o agregar niveles

Los mapas son arrays de strings en [`js/data/levels.js`](js/data/levels.js);
la leyenda completa está en la cabecera de ese archivo.

Las entidades se marcan en el tile cuya **base** pisan. Las filas se rellenan
solas a la derecha, así que no hace falta que midan lo mismo.

Después de cualquier cambio:

```bash
node tools/validate-levels.mjs
```

Recorre el grafo de apoyos con la envolvente real del salto y avisa si la salida
quedó inalcanzable o si alguna clave quedó en una isla.

---

## Licencia

MIT.
