/* ═══════════════════════════════════════════════════════════════════════
   NIVELES

   Leyenda
     #  bloque sólido        =  losa (se atraviesa desde abajo)
     -  riel horizontal      |  riel vertical     → plataforma móvil
     ^  púas                 ~  fuga de datos (mortal)
     P  inicio               !  poste de restauración    G  salida
        Fija la reaparición y repone los corazones (una cura por poste).
        Poné uno antes de cada tramo largo: es el respiro del nivel.

   Procesos hostiles
     s  Spambot      t  Ransomware
     h  Troyano: el más grande de la tropa —44x62, más de dos tiles de ancho y
        tres de alto— y el único que se planta centrado en su tile. Necesita
        cuatro filas libres encima; puesto bajo un techo bajo, no entra.
        No es un enemigo, es un transporte: al reventar desembarca un Keylogger,
        un Gusano y un Ransomware, y las tres ventanillas del costado muestran
        quién viene desde antes de abrirlo. Por eso importa MUCHO dónde se lo
        pone: matarlo en un pasillo angosto deja tres procesos encima del
        jugador a la vez. Dale espacio, y pensá el after: un Ransomware suelto
        cerca de un salto obligatorio le saca el piso justo ahí.
     k  Keylogger (suelo)             K  Keylogger (techo)
        Máquina de escribir: te mira, anota lo que hacés y con eso apunta a
        donde CREE que vas a estar, no a donde estás. Marca el punto medio
        segundo antes de tirar, así que siempre se puede leer y siempre se
        puede desmentir cambiando de idea.
        Dos cosas para tenerle en cuenta al armar el mapa. Necesita espacio
        para que valga la pena predecir: en un pasillo de un tile de alto no
        hay nada que adivinar y el enemigo se vuelve un francotirador común;
        dale altura para saltar y ancho para girar. Y las teclas mueren contra
        el terreno, así que un bloque suelto de un tile alcanza como parapeto —
        además de cortarle la línea de visión, que es lo único que le impide
        fijar el punto. Poné uno antes de cada pareja.
     g  Worm         B  Rootkit Monarch     D  Baron Von DDoS
     I  El Implante: el jefe del final. Necesita arena ancha y sin líquido —
        se copia tres veces y las cuatro siluetas tienen que caber separadas.
     n  Botnet (servidor C2): engancha a los spambots a menos de 13 tiles, los
        hace disparar juntos y los blinda —enganchados no reciben daño—; al
        morir se los lleva a todos. Ponelo cerca de 's', y a la vista: si los
        bots aparecen mucho antes que el servidor, el jugador gasta el cargador
        contra un escudo sin saber todavía de dónde viene.
     i  Man-in-the-Middle: flota y refleja los tiros de frente. Se marca en
        el aire, a la altura donde querés que empiece.
     e  Exfiltrador: roba fragmentos y huye. Tiene sentido donde el jugador
        ya juntó algunos.
     R  Rootkit: nace camuflado y quieto, y no se ve hasta que lo revelan.
        Ponelo donde el jugador vaya a pasar caminando sin mirar — y dale un
        `h` o un `s` cerca, que es donde se va a meter si lo dejás vivo.
     y  Spyware: flota, te lee y llama refuerzos. No dispara nunca — el daño lo
        hace lo que trae, y lo que trae sale del padrón del propio sector, así
        que se vuelve más duro solo a medida que avanzan las capas. Trae hasta
        tres cada uno, y cuando se queda sin cupo hace sonar la alarma.
        Mide en línea recta, así que un bloque macizo entre él y el camino sigue
        siendo la contra: ponelos de a pares. Y dejale espacio abierto cerca: si
        no encuentra piso sano donde proyectar, no invoca nada.
     a  Adware: escupe ventanas alrededor del jugador. Va donde haga falta
        puntería (bordes, huecos), que es donde tapar molesta de verdad.

   Phishing — arranca disfrazado; el carácter elige de qué:
     v  corazón de vida falsa    flota, sirve en cualquier lado
     x  caja de combo            con cartel; pensada para apoyar en el piso
     r  punto de restauración falso                pensada para apoyar
     d  al azar entre los tres — pero si no hay piso abajo sale corazón,
        porque la caja y el poste colgados del aire se delatan solos

   Objetos
     c  paquete      m  parche de integridad   w  depósito de herramientas
     *  fragmento de clave
     E  depósito de Escáner: el mismo depósito, pero con la herramienta fijada
        en vez de sorteada. Existe para un solo caso — un sector cuya solución
        es el Escáner no puede depender de la suerte del sorteo.

   Regla de diseño — todo está medido contra el salto:
     · salto simple  →  3 tiles de alto,  ~4 de largo
     · doble salto   →  5 tiles de alto,  ~6 de largo
   Los huecos largos son de 4 a 6 tiles y los escalones altos de 4 ó 5:
   ninguno se cruza sin usar el segundo impulso.

   Regla de reparto — quién aparece en cada capa, y cuánto:

   1. Cada capa ESTRENA lo suyo y nada más. Un sector presenta uno o dos
      procesos nuevos, nunca cinco de golpe, y el que estrena es el que le da
      nombre a la capa: el phishing vive en el correo, el rootkit en la sombra,
      el ransomware sobre las copias. Lo estrenado se queda y vuelve después,
      cada vez en peor compañía — así lo que se aprendió sigue valiendo.

   2. La carga sube y no baja. Medida en peso de amenaza, la curva del juego es
      14 · 25 · 29 · 35 · 44 · 54 · 58 · 63 · 65 · 68 · 79, y ese orden no es
      decorativo: si un sector pesa menos que el anterior, el jugador siente que
      el juego se ablandó justo cuando debía apretar. Los jefes van aparte de
      esa cuenta — rematan el tramo, no lo forman.

      El peso no es el número de enemigos. Un troyano vale por cuatro (él y los
      tres que desembarca) y un spyware por tres (llama hasta tres refuerzos),
      así que dos de ésos pesan más que diez spambots y ocupan la mitad del
      mapa. Al agregar enemigos nuevos, pesalos por lo que TRAEN.

   3. Lo que cada uno necesita del terreno manda sobre dónde queda. El troyano
      pide cuatro filas; el keylogger, aire para que predecir signifique algo;
      el spyware, piso sano cerca donde proyectar; el C2, spambots a menos de
      13 tiles o es una piñata. Ver cada entrada de la leyenda.

   Las entidades se marcan en el tile cuya BASE pisan.
   Al editar, verificá con:  node tools/validate-levels.mjs
   ═══════════════════════════════════════════════════════════════════════ */

export const LEVELS = [
/* ───────────────────────────────────────── 01
   Capa 1 · perímetro — un solo proceso hostil en toda la capa: el spambot. Púas
   entre pozos, y la mitad tira desde arriba.

   Cierra con un mini-jefe: un servidor C2 con tres bots enganchados. Es el
   primer "elegí bien el blanco" del juego y se enseña con el único enemigo que
   el jugador ya conoce — los bots no reciben daño mientras el C2 viva, así que
   el cargador entero contra ellos no hace nada y matar al servidor los apaga a
   los tres de una. Aprender eso acá, con spambots, sale barato. */
{
  name: 'El Perímetro',
  epigraph: 'Todo lo que entra pasa por el cortafuegos. Hoy entró spam.',
  theme: 'edge',
  map: [
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '                                                                                                                                    * m',
    '                                                                                                                                   =====',
    '',
    '                                                                                                     *                       s',
    '                                *                                                        s         =====                  #######',
    '                 * *          =====                s                                  #######                             #######',
    '                                                #######                               #######                             #######',
    '   P      c               ^^        s           #######  ^^^          s     s   ! w   #######            s   ^^^          #######     s    n  ^^s  s       G',
    '################     ###################     #################     ##########################     ################     ##########     ##########################',
    '################~~~~~###################~~~~~#################~~~~~##########################~~~~~################~~~~~##########~~~~~##########################',
    '################~~~~~###################~~~~~#################~~~~~##########################~~~~~################~~~~~##########~~~~~##########################',
    '################~~~~~###################~~~~~#################~~~~~##########################~~~~~################~~~~~##########~~~~~##########################',
    '################~~~~~###################~~~~~#################~~~~~##########################~~~~~################~~~~~##########~~~~~##########################',
  ],
},

/* ───────────────────────────────────────── 02
   Capa 2 · red — el tráfico, y lo que se cuela en él: gusanos y keyloggers.
   Los dos túneles llevan una pareja cada uno (uno de techo, uno de piso) con su
   parapeto delante; el keylogger que de verdad enseña la mecánica es el de la
   plataforma alta del final, en campo abierto, porque predecir necesita espacio
   —en un pasillo de un tile no hay nada que adivinar—. Un Man-in-the-Middle se
   mete delante del gusano del medio. El C2 se mudó a la capa 1: acá los
   spambots vienen solos otra vez. */
{
  name: 'Puerto 443',
  epigraph: 'Todo viene cifrado. Alguien anota cada tecla.',
  theme: 'port',
  map: [
    '',
    '',
    '',
    '',
    '',
    '',
    ' ',
    '                                                                                                                                                                   *            ',
    '                                                                                                                                                             =======            ',
    '                                                                                                                                                                              ',
    '                                  ',
    '  *                                                                                                                                                              ',
    '################## =====                                *     *                                                                                 ========                        ',
    '##################                #############################',
    '                                  #############################                  * m                              ###################                                k',
    '                             ==== #############################                 =====                             ###################                              =====',
    '                 * *                    K                                             i                               K                              g',
    '                                                                                                                                                  #######',
    '   P                      s                  k         s              ! w     g     ^^               -------              k                       #######       s s s  g  G',
    '################     ##########################################     #################################       ###############################     #########     ##################',
    '################~~~~~##########################################~~~~~#################################~~~~~~~###############################~~~~~#########~~~~~##################',
    '################~~~~~##########################################~~~~~#################################~~~~~~~###############################~~~~~#########~~~~~##################',
    '################~~~~~##########################################~~~~~#################################~~~~~~~###############################~~~~~#########~~~~~##################',
    '################~~~~~##########################################~~~~~#################################~~~~~~~###############################~~~~~#########~~~~~##################',
  ],
},

/* ───────────────────────────────────────── 03
   Capa 3 · aplicación — phishing en el servidor de correo. El primer poste que aparece es falso, y la segunda caja está pegada a lo legítimo. */
{
  name: 'El caché',
  epigraph: 'Lo que parece un regalo casi nunca lo es.',
  theme: 'cache',
  map: [
    '',
    '',
    '',
    '',
    '                                                                                                                           *',
    '                                                                                                                   ==============',
    '',
    '',
    '',
    '                                                                                     --------------------------',
    '',
    '',
    '',
    '                                                 m                      ===========                                                             *   *',
    '                                               ####                                                                  r                      v  =======',
    '                 * *                    v     ######                                                              #######',
    '                                             ########                                                             #######',
    '   P                     s    x  ^^         ##########         r   ^^^   s                 !  w    x  s k         #######       s d   ^^^               s  d  g         G',
    '################     #################     ############     #######################     ########################  #######     ###################################    #######',
    '################~~~~~#################~~~~~############~~~~~#######################~~~~~########################  #######~~~~~###################################~~~~#######',
    '################~~~~~#################~~~~~############~~~~~#######################~~~~~########################  #######~~~~~###################################~~~~#######',
    '################~~~~~#################~~~~~############~~~~~#######################~~~~~########################^^#######~~~~~###################################~~~~#######',
    '################~~~~~#################~~~~~############~~~~~#######################~~~~~#################################~~~~~###################################~~~~#######',
  ],
},

/* ───────────────────────────────────────── 04
   Capa 4 · sesión — la capa del usuario, que es la más ruidosa de todas. Adware
   que tapa la pantalla justo donde hace falta puntería, y spyware que le pasa tu
   posición a todo el sector: los dos primeros que no vienen a matarte. Los
   bloques flotantes están puestos para cortarle la vista al spyware — pelear
   detrás de algo es una decisión de posición, no de puntería. */
{
  name: 'La Pestaña',
  epigraph: 'Nadie pidió esto. Igual está acá, y ya sabe dónde estás.',
  theme: 'tab',
  map: [
    '',
    '',
    '',
    '',
    '',
    '                                                                                                                                                 *m',
    '                                                                                                                                               ======',
    '                                                                               #~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~#                           ',
    '                                                                              ###################################        ---------------------                                     ',
    '                                                                             #####################################                                                    ',
    '                                                                                            ###############                                                        ',
    '                                                                                             #############                                                                        ',
    '                                                                                              ###########                                   ',
    '                           *                                                                  ##########       ##########                       *                     g',
    '                         =====                                     #####################      #########       ###########                   =======                #######',
    '                                                                   #######                    ########       ############                                          #######',
    '                                                                   ######                    ########       #############                                          #######',
    '   P      c             s     a      y     ^^          a      !   w#####                    ########       ##############          s      y       a      ^^^     s #######  G',
    '################     #########################     #####################     ######################       ###############     ######################################################',
    '################~~~~~#########################~~~~~#####################                                 ################~~~~~######################################################',
    '################~~~~~#########################~~~~~######################                          a    #################~~~~~######################################################',
    '################~~~~~#########################~~~~~#######################            a                ##################~~~~~######################################################',
    '################~~~~~#########################~~~~~######################################################################~~~~~######################################################',
  ],
},

/* ───────────────────────────────────────── 05
   Capa 5 · sistema operativo — donde el troyano abre su carga.

   Tres troyanos, no siete. Cada uno es cuatro enemigos ahora —él más el
   Keylogger, el Gusano y el Ransomware que desembarca— así que siete eran
   veintiocho, y el sector era una avalancha. Los tres van en campo abierto, que
   es lo que necesitan: por tamaño (44x62, cuatro filas) y porque lo que sale
   tiene que tener dónde caer. El túnel de keyloggers sigue ahí, con parapeto. */
{
  name: 'El Kernel',
  epigraph: 'Lo que entró como regalo trae algo adentro.',
  theme: 'kernel',
  map: [
    '################################################################################################################################################################################',
    '################################################################################################################################################################################',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '                                                                                 m *        ###################',
    '                          *            *                                      =======       ###################                                  * *',
    '                        ======       ======               s                                 ###################                 g              ======',
    '                 * *                                  #########                                  K                           #######',
    '                                                      #########                                                              #######',
    '   P      c                 s    ^^^    k             #########       !     h       s   ^^            s                  h   #######        s         h    ^^     i        G',
    '################     #########################     ############     ############################################     ###############     #######################################',
    '################~~~~~#########################~~~~~############~~~~~############################################~~~~~###############~~~~~#######################################',
    '################~~~~~#########################~~~~~############~~~~~############################################~~~~~###############~~~~~#######################################',
    '################~~~~~#########################~~~~~############~~~~~############################################~~~~~###############~~~~~#######################################',
    '################~~~~~#########################~~~~~############~~~~~############################################~~~~~###############~~~~~#######################################',
  ],
},

/* ───────────────────────────────────────── 06
   Capa 6 · sombra — lo que el sistema no lista. Rootkits camuflados en el piso,
   con spyware acompañando: acá el Escáner deja de ser un arma y pasa a ser una
   linterna, y por eso el depósito del principio (`E`) lo regala. El troyano del
   medio está para que el Rootkit tenga dónde meterse — lo que late en violeta
   tiene algo adentro. */
{
  name: 'Modo Oscuro',
  epigraph: 'Lo que no aparece en la lista es lo que ya estaba adentro.',
  theme: 'shade',
  map: [
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '                                *                                R                      *                               k                 *',
    '                             =======                           #######               =======                         #######           =======     #######',
    '                                                               #######                                               #######                       #######',
    '                                                               #######                                               #######                       #######',
    '   P     E      R          s     R      y      !    ^^      h  #######R       y     m     R    ^^^            s     R#######y     w         s   ^^ ####### a       G',
    '####################     ##############################     ########################################     #################################################################',
    '####################~~~~~##############################~~~~~########################################~~~~~#################################################################',
    '####################~~~~~##############################~~~~~########################################~~~~~#################################################################',
    '####################~~~~~##############################~~~~~########################################~~~~~#################################################################',
    '####################~~~~~##############################~~~~~########################################~~~~~#################################################################',
  ],
},

/* ───────────────────────────────────────── 07
   Capa 7 · datos — ransomware sobre las copias de seguridad y dos exfiltradores que vienen por los fragmentos. Puente mortal, pasarela con troyanos abajo, y el Barón. */
{
  name: 'El Respaldo',
  epigraph: 'Lo último que te queda. Lo primero que buscan.',
  theme: 'backup',
  map: [
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '                                                                                                   t',
    '',
    '                                                                                            *             *',
    '                                                                                           =================                                       *              *',
    '                                                 *                                                                                               ======         ======',
    '                                               =====',
    '                 * *            t                                  t     t            #####                 #####',
    '                                                                                      #####                 #####',
    '   P      c             s               g   ^^        s   !                     w   e #####   h         R   #####     R  x    r t ^^   y   e e     s       D                         G',
    '################     #######=========###########################=============####################################     ####################################################################',
    '################~~~~~#######         ###########################~~~~~~~~~~~~~####################################~~~~~####################################################################',
    '################~~~~~#######         ###########################~~~~~~~~~~~~~####################################~~~~~####################################################################',
    '################~~~~~###########################################~~~~~~~~~~~~~####################################~~~~~####################################################################',
    '################~~~~~###########################################~~~~~~~~~~~~~####################################~~~~~####################################################################',
  ],
},

/* ───────────────────────────────────────── 08
   Capa 8 · control total — todas las capas anteriores ya cayeron, así que vuelve un poco de cada una (con exfiltrador y Man-in-the-Middle) antes del Rootkit Monarch. */
{
  name: 'Núcleo Raíz',
  epigraph: 'El Monarca reescribe la gravedad. Vos saltás igual.',
  theme: 'root',
  map: [
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '                                                                                                                                   t',
    '',
    '                                                                                                                             *           *                                w',
    '                                                                ###################                                         ===============                             =====',
    '                                *                               ###################               *                                                               *                   *',
    '                        v     =====                             ###################             ======                                                          ======              ======',
    '                                         t     t                    K                                   i              #####               #####',
    '                                                                                                                       #####               #####',
    '   P                s      ^^                          g  e ^^           k                R! m     R     a     h y ^^  #####    y    e  t  #####      ^^                       B                        G',
    '############     #####################=============#################################     #######################################################     #########################################################',
    '############~~~~~#####################~~~~~~~~~~~~~#################################~~~~~#######################################################~~~~~#########################################################',
    '############~~~~~#####################~~~~~~~~~~~~~#################################~~~~~#######################################################~~~~~#########################################################',
    '############~~~~~#####################~~~~~~~~~~~~~#################################~~~~~#######################################################~~~~~#########################################################',
    '############~~~~~#####################~~~~~~~~~~~~~#################################~~~~~#######################################################~~~~~#########################################################',
  ],
},

/* ───────────────────────────────────────── 09
   Capa 9 · firmware — ganarle la raíz no alcanzó. Un implante de firmware vive
   más abajo que el sistema operativo: sobrevive al apagón, así que el sector
   arranca con la máquina recién encendida y todo de vuelta en su lugar. Es la
   primera pasada donde el reparto entero juega junto, con el Rootkit de local. */
{
  name: 'El Arranque',
  epigraph: 'Apagaste la máquina. Lo que vive acá abajo ni se enteró.',
  theme: 'boot',
  map: [
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '                                                            * m',
    '                              *                           =======          R                                    *                                     s                 *',
    '                            =====                                        #######                              =====                                 #######           =====',
    '                                                                         #######                                                                    #######',
    '                                                                         #######                                                                    #######',
    '   P     c     s          R       y      h      ^^          !     w      ####### R   k            a      R      s^^^    n    s          y    h      #######  R     ^^       t      G',
    '##################     #############################     ###############################     #################################     #####################################################',
    '##################~~~~~#############################~~~~~###############################~~~~~#################################~~~~~#####################################################',
    '##################~~~~~#############################~~~~~###############################~~~~~#################################~~~~~#####################################################',
    '##################~~~~~#############################~~~~~###############################~~~~~#################################~~~~~#####################################################',
    '##################~~~~~#############################~~~~~###############################~~~~~#################################~~~~~#####################################################',
  ],
},

/* ───────────────────────────────────────── 10
   Capa 10 · microcódigo — adentro de la pieza. Cerrado, vertical y con poco
   piso corrido: acá el Spyware manda, porque casi no hay lugar donde no te vea,
   y los dos exfiltradores vienen por lo que juntaste en el camino. */
{
  name: 'Microcódigo',
  epigraph: 'Ya no hay programas que culpar. Esto está grabado.',
  theme: 'micro',
  map: [
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '                                      *                                                                   *',
    '                                    =====                             y               *                 =====             R                                     *',
    '                                                                    #######         =====                               #######                               =====',
    '                                                                    #######                                             #######',
    '                                                                    #######                                             #######',
    '   P    E     R     y           y     h      ^^     e    !          ####### a     R       ^^            w     y     k   ####### R               e     ^^^    h        t      G',
    '########################     ###############################     ###############################     #################################     #######################################',
    '########################~~~~~###############################~~~~~###############################~~~~~#################################~~~~~#######################################',
    '########################~~~~~###############################~~~~~###############################~~~~~#################################~~~~~#######################################',
    '########################~~~~~###############################~~~~~###############################~~~~~#################################~~~~~#######################################',
    '########################~~~~~###############################~~~~~###############################~~~~~#################################~~~~~#######################################',
  ],
},

/* ───────────────────────────────────────── 11
   Capa 11 · silicio — el final. Un camino corto para llegar entero y después la
   arena: setenta tiles de piso corrido, sin líquido ni púas. Tiene que ser así
   de ancha porque el Implante se copia tres veces y las cuatro siluetas tienen
   que caber separadas — un acertijo amontonado no es un acertijo. El depósito
   de Escáner está justo antes de la puerta a propósito: es la herramienta que
   resuelve la pelea, y el sector la regala en vez de sortearla. */
{
  name: 'Silicio',
  epigraph: 'Abajo del software no hay nada. Abajo de esto, tampoco.',
  theme: 'silicio',
  map: [
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '                                  *                                       *                         m',
    '                                =====                                   =====                     =====',
    '',
    '',
    '   P      R     y             h      a      ^^    R    R     y    ! R e w    k  t       h    y  Ee      *k  h   R      !             y  w w h      R                             I                 G',
    '####################     ###############################     #######################################################################################################################################',
    '####################~~~~~###############################~~~~~#######################################################################################################################################',
    '####################~~~~~###############################~~~~~#######################################################################################################################################',
    '####################~~~~~###############################~~~~~#######################################################################################################################################',
    '####################~~~~~###############################~~~~~#######################################################################################################################################',
  ],
},

];
