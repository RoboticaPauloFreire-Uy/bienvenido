/**
 * =============================================================
 * BASE DE DATOS — COLEGIO PAULO FREIRE | Taller de Programación
 * =============================================================
 * Estructura por grado:
 *   games[]    → lista de juegos en formato grilla (con info para familias)
 *   projects[] → proyectos de alumnos con materiales dinámicos
 *                (fotos, manual PDF, MakeCode, Scratch, recursos)
 */

const SCHOOL_DATA = {
  school: {
    name: "Colegio Paulo Freire",
    subtitle: "Taller de Programación",
    year: "2026",
    primaryColor: "#2E7D32",
    accentColor: "#FBC02D"
  },

  grades: [
    /* ===================================================
       SALA DE 5 AÑOS
    =================================================== */
    {
      id: "sala5",
      name: "Sala de 5 años",
      shortName: "Sala 5",
      icon: "🌱",
      color: "#E65100",
      colorLight: "#FFF3E0",
      colorBorder: "#FF9800",
      description: "Primeros pasos en robótica y tecnología: texturas, circuitos iniciales, movimiento, colores y sonidos.",

      /* ---- JUEGOS ---- */
      /* ---- JUEGOS PERMITIDOS (SALA DE 5 AÑOS) ---- */
      games: [
        {
          id: "s5-g1",
          level: 9,
          title: "Escenarios CodeJr - Primera Parte: Ambiente y Velocidades 🐱⚡",
          platform: "codejr",
          externalUrl: "https://codejr.org",
          thumbnail: "img/scratchjr.png",
          description: "¡Nivel 9 de la Ruta de Aventuras! Aprendemos a explorar el ambiente de Scratch Jr: creación de escenarios con fondos ilustrados, personajes y cómo programar diferentes velocidades (lenta, media y rápida) con el bloque naranja de velocidad.",
          benefits: "Fomenta la creatividad en historias digitales, el reconocimiento del ambiente y escenarios de Scratch Jr, el control de la velocidad y el movimiento algorítmico, y la experimentación causa-efecto comparando velocidades en carreras de personajes.",
          tags: ["Scratch Jr", "CodeJr", "Escenarios", "Velocidad", "Bloques", "Nivel 9"]
        },
        {
          id: "s5-g4",
          level: 2,
          title: "Angry Birds: Primeros Pasos 🐦",
          platform: "codeorg",
          externalUrl: "https://studio.code.org/es/hoc/1",
          thumbnail: "img/angrybirds.png",
          description: "¡Nivel 2 de la Ruta de Aventuras! Guiá al pájaro por el laberinto para aprender a programar y dar los primeros pasos de razonamiento computacional.",
          benefits: "Aprender a programar y los primeros pasos del razonamiento en programación: secuenciación de algoritmos paso a paso, lateralidad (izquierda/derecha), descomposición de problemas y prueba y error.",
          tags: ["Code.org", "Angry Birds", "Algoritmos", "Hora del Código"]
        },
        {
          id: "s5-g3",
          level: 6,
          title: "Ana y Elsa (Frozen): Geometría en el Hielo ❄️⛸️",
          platform: "codeorg",
          externalUrl: "https://studio.code.org/s/frozen/lessons/1/levels/1",
          thumbnail: "img/frozen.png",
          description: "¡Nivel 6 de la Ruta de Aventuras! Conectamos lo aprendido en Paint con la programación: guiamos a Elsa y Ana a patinar para trazar figuras geométricas, ángulos y copos de nieve con código.",
          benefits: "Conecta el dibujo geométrico manual de Paint con el pensamiento algorítmico, comprensión de ángulos rectos (90°), nociones de bucles (repetición) y orientación espacial sobre el hielo.",
          tags: ["Code.org", "Frozen", "Geometría", "Ángulos", "Nivel 6"]
        },
        {
          id: "s5-g2",
          level: 8,
          title: "Minecraft: Hora del Código (Aprender a Programar) ⛏️🧱",
          platform: "codeorg",
          externalUrl: "https://studio.code.org/s/mc/lessons/1/levels/1",
          thumbnail: "img/minecraft.png",
          description: "¡Nivel 8 de la Ruta de Aventuras! ⚠️ Aclaración: no es el juego tradicional de Minecraft de juego libre, sino una adaptación pedagógica oficial de Code.org para aprender a programar dando órdenes en bloques a Steve y Alex.",
          benefits: "Canaliza el entusiasmo por Minecraft hacia el aprendizaje del pensamiento computacional: secuenciación lógica, orientación en cuadrícula 3D isométrica, descomposición de acciones y bucles de repetición.",
          tags: ["Code.org", "Minecraft", "Steve", "Alex", "Algoritmos", "Hora del Código", "Nivel 8"]
        },
        {
          id: "s5-g5",
          level: 10,
          title: "Escenarios CodeJr - Segunda Parte: Perspectiva y Profundidad 🐱🔍",
          platform: "codejr",
          externalUrl: "https://codejr.org",
          thumbnail: "img/scratchjr.png",
          description: "¡Nivel 10 de la Ruta de Aventuras! Aprendemos a cambiar la perspectiva visual y escala de los personajes en Scratch Jr: usamos los bloques violetas de apariencia (achicar para alejar en el horizonte y agrandar para acercar) combinados con movimientos en el sendero.",
          benefits: "Desarrolla la noción espacial de profundidad tridimensional en un plano 2D, la comprensión de variables visuales y escalas (lejos = pequeño, cerca = grande), y la coordinación de secuencias de apariencia y movimiento en Scratch Jr.",
          tags: ["Scratch Jr", "CodeJr", "Escenarios", "Perspectiva", "Profundidad", "Apariencia", "Bloques Violetas", "Nivel 10"]
        }
      ],

      /* ---- PROYECTOS REALES (5 AÑOS) ---- */
      projects: [
        {
          id: "s5-p1",
          level: 1,
          title: "El Sombrero Luminoso de San Patricio 🍀🎩",
          author: "Taller Maker Sala 5",
          date: "Marzo 2026",
          type: "electronica",
          coverImage: "img/proyectos/sombrero_san_patricio_solo_sombrero.png",
          description: "¡Primer proyecto oficial de la Sala de 5 años! Construimos un auténtico sombrero de San Patricio con vincha que se ilumina mágicamente al calzártelo en la cabeza. Usamos cinta de cobre conductora, un diodo LED verde en el trébol, una pila de botón CR2032 y un interruptor de contacto que se activa con la presión de la cabeza.",
          objective: "Construir un circuito eléctrico básico y seguro con cinta de cobre conductora, pila botón CR2032 y luz LED verde en el trébol del sombrero de San Patricio, logrando que se encienda con la presión de la cabeza.",
          benefits: "Desarrolla la motricidad fina, comprensión de circuito cerrado y polaridad (+ / -), noción de causa-efecto en electricidad sin riesgo y confianza creativa maker.",
          tags: ["San Patricio", "Electrónica", "Circuito de Papel", "LED", "Sin programación", "Maker"],
          gallery: [
            "img/proyectos/sombrero_san_patricio_color.png",
            "img/proyectos/sombrero_san_patricio_circuito.png",
            "img/proyectos/sombrero_san_patricio_colorear.png",
            "img/proyectos/sombrero_san_patricio_tiras.png"
          ],
          pdfUrl: "pdf/sombrero_san_patricio_5anos.pdf",
          downloadPdfUrl: "pdf/sombrero_san_patricio_5anos.pdf",
          makecodeUrl: null,
          scratchId: null,
          materials: [
            { title: "Cinta de cobre conductora", description: "Pistas metálicas autoadhesivas que llevan la electricidad desde la pila hasta el trébol.", icon: "fa-tape" },
            { title: "1 Diodo LED verde (5mm)", description: "Luz mágica en el centro del trébol (patita larga = + ánodo, patita corta = - cátodo).", icon: "fa-lightbulb" },
            { title: "1 Pila botón CR2032 (3V)", description: "Fuente de energía segura que alimenta el circuito al tocar los polos.", icon: "fa-battery-full" },
            { title: "Plantilla del Sombrero de San Patricio", description: "Cartulina con el sombrero ilustrado a color o para colorear y tiras de vincha.", icon: "fa-hat-wizard" },
            { title: "Solapa de vincha (Interruptor casero)", description: "Tira con cinta de cobre que cierra el circuito automáticamente al ponérselo en la cabeza.", icon: "fa-toggle-on" },
            { title: "Tijera escolar y pegamento / cinta", description: "Para recortar el contorno del sombrero y fijar la vincha a medida.", icon: "fa-cut" }
          ],
          instructions: [
            {
              step: 1,
              title: "Recortar y preparar el Sombrero",
              desc: "Recortá por la línea de puntos el contorno del sombrero de San Patricio y las dos tiras de la vincha (podés usar la versión a color o colorear la versión en blanco y negro). Hacé dos pequeños agujeritos en el centro del trébol donde están marcados el (+) y el (-).",
              tip: "Usá la punta de un lápiz sobre un pedacito de cartón para hacer los dos agujeritos sin romper el papel."
            },
            {
              step: 2,
              title: "Instalar el LED verde en el Trébol",
              desc: "Desde el frente del sombrero, pasá las dos patitas metálicas del LED por los agujeros del trébol. Al dar vuelta el sombrero (reverso): doblá la pata larga hacia la izquierda (+) y la pata corta hacia la derecha (-) dejándolas bien apoyadas contra el papel.",
              tip: "¡Regla de oro: La pata más larga siempre es el polo positivo (+) y la más corta es el polo negativo (-)!"
            },
            {
              step: 3,
              title: "Pegar las pistas de Cinta de Cobre",
              desc: "Pegá una tira de cinta de cobre desde la pata (+) del LED hasta el círculo donde irá la pila. Pegá otra tira continua de cinta de cobre desde la pata (-) del LED bajando en línea recta hacia la solapa inferior de la vincha.",
              tip: "La cinta de cobre debe pisar con fuerza el metal de las patitas del LED para que conduzca bien la electricidad."
            },
            {
              step: 4,
              title: "Colocar la Pila Botón CR2032 (3V)",
              desc: "Hacé un pequeño lazo o rollito con un trozo de cinta de cobre (con el pegamento hacia afuera) para fijar la cara negativa (-) de la pila sobre la pista de abajo. La cara lisa con letras y el signo (+) queda mirando hacia arriba.",
              tip: "El rollito de cinta asegura el contacto eléctrico con la base de la pila sin necesidad de soldador."
            },
            {
              step: 5,
              title: "Armar el Interruptor en la Solapa de la Vincha",
              desc: "Envolvé con cinta de cobre la solapa de goma eva o cartulina en la base del sombrero. Esta solapa funcionará como interruptor: al doblar la vincha alrededor de tu cabeza, las dos cintas de cobre se tocan y cierran el circuito.",
              tip: "¡Al calzarte el sombrero, la presión de tu cabeza hace contacto y enciende la luz verde automáticamente!"
            },
            {
              step: 6,
              title: "¡Ajustar la vincha y lucir tu invento!",
              desc: "Uní las tiras de la vincha según el contorno de tu cabeza con cinta o abrochadora con ayuda del profe. ¡Ponételo en la cabeza y mirá cómo brilla el trébol de la suerte!",
              tip: "¿No prende? Apretá bien con la uña sobre las patitas del LED y la cinta de cobre para eliminar falsos contactos."
            }
          ]
        },
        {
          id: "s5-p2",
          level: 2,
          title: "Angry Birds: Primeros Pasos de Programación 🐦🎯",
          author: "Taller de Programación Sala 5",
          date: "Abril 2026",
          type: "codeorg",
          platform: "codeorg",
          badge: "🎮 Programación & Algoritmos",
          icon: "fa-puzzle-piece",
          color: "#E11D48",
          coverImage: "img/angrybirds.png",
          gameUrl: "https://studio.code.org/es/hoc/1",
          externalUrl: "https://studio.code.org/es/hoc/1",
          description: "¡Nivel 2 de nuestra Ruta de Aventuras! Aprendemos a programar y damos los primeros pasos del razonamiento computacional guiando a los Angry Birds a través del laberinto hasta atrapar al cerdito travieso con bloques de flechas en secuencia.",
          objective: "Aprender a programar y dar los primeros pasos de razonamiento en programación guiando al pájaro a través del laberinto hasta el cerdito.",
          benefits: "Desarrolla el pensamiento computacional, la estructuración de algoritmos paso a paso, la lateralidad y orientación espacial (adelante, izquierda, derecha), la descomposición de problemas y el método de prueba y depuración de errores (debugging) de forma divertida.",
          tags: ["Angry Birds", "Code.org", "Lógica", "Algoritmos", "Hora del Código", "Nivel 2"],
          gallery: [
            "img/angrybirds.png"
          ],
          pdfUrl: null,
          downloadPdfUrl: null,
          makecodeUrl: null,
          scratchId: null,
          materials: [
            { title: "Plataforma Code.org (Hora del Código)", description: "Desafío interactivo online con laberintos progresivos (https://studio.code.org/es/hoc/1).", icon: "fa-gamepad" },
            { title: "Bloques de Dirección de Flechas", description: "Comandos secuenciales: avanzar, girar a la izquierda y girar a la derecha.", icon: "fa-arrows-alt" },
            { title: "Computadora o Tablet", description: "Para arrastrar y encastrar los bloques como piezas de rompecabezas.", icon: "fa-laptop" }
          ],
          instructions: [
            {
              step: 1,
              title: "Observar el laberinto y al cerdito",
              desc: "Mirá bien la pantalla: ubicá dónde está el pájaro rojo y hacia dónde debe caminar para llegar hasta el cerdito travieso.",
              tip: "¿Está en línea recta o tiene que doblar? ¡Contá cuántos casilleros debe avanzar!"
            },
            {
              step: 2,
              title: "Arrastrar el bloque 'Avanzar'",
              desc: "Tomá con el dedo o el mouse el bloque anaranjado 'avanzar' y encastralo debajo del bloque amarillo 'cuando se ejecuta'. Cada bloque hace que el pájaro dé un paso.",
              tip: "Escucharás un 'clic' mágico cuando las dos piezas encastren perfectamente."
            },
            {
              step: 3,
              title: "Girar cuando haya una curva",
              desc: "Si el camino dobla, colocá un bloque de 'girar a la derecha' o 'girar a la izquierda'. ¡Fijate hacia dónde mira el pico del pájaro!",
              tip: "Usá tus manos frente a la pantalla para sentir si debe doblar hacia la izquierda o la derecha."
            },
            {
              step: 4,
              title: "Tocar el botón naranja 'Ejecutar'",
              desc: "Tocá 'Ejecutar' para ver cómo el pájaro cobra vida y camina paso a paso siguiendo tu programa.",
              tip: "Si no llega o choca contra una caja, tocá 'Reiniciar', cambiá los bloques y probalo de nuevo. ¡Así piensan los programadores!"
            }
          ]
        },
        {
          id: "s5-p3",
          level: 3,
          title: "La Varita Mágica Luminosa 🪄✨",
          author: "Taller Maker Sala 5",
          date: "Mayo 2026",
          type: "electronica",
          badge: "🪄 Circuito & Varita Mágica",
          icon: "fa-magic",
          color: "#8B5CF6",
          coverImage: "img/proyectos/varita_magica_cover.png",
          description: "¡Nivel 3 de nuestra Ruta de Aventuras! Construimos una varita mágica brillante utilizando un palito tipo algodón de azúcar, cinta conductora, un diodo LED y una pila botón. Al presionar el interruptor táctil con tus dedos, ¡la punta de la varita se ilumina con destellos mágicos!",
          objective: "Construir una varita mágica luminosa montando un circuito eléctrico sobre un palito tipo algodón de azúcar con cinta conductora, pila botón y luz LED, aprendiendo a cerrar el circuito con un interruptor táctil manual.",
          benefits: "Fortalece la coordinación motriz fina y destreza manual, afianza la comprensión de circuito cerrado y polaridad (+ y -), estimula el juego simbólico e imaginación, y enseña cómo la ciencia y la creatividad transforman materiales cotidianos en objetos mágicos.",
          tags: ["Varita Mágica", "Electrónica", "Circuito", "LED", "Sin programación", "Maker", "Nivel 3"],
          gallery: [
            "img/proyectos/varita_magica_cover.png",
            "img/proyectos/varita_magica_circuito.png"
          ],
          pdfUrl: null,
          downloadPdfUrl: null,
          makecodeUrl: null,
          scratchId: null,
          materials: [
            { title: "Palito tipo algodón de azúcar", description: "Cuerpo cilíndrico o cónico liviano donde montamos la estructura de la varita mágica.", icon: "fa-magic" },
            { title: "1 Diodo LED (5mm de alto brillo)", description: "Luz brillante en la punta de la varita (pata larga = + ánodo, pata corta = - cátodo).", icon: "fa-lightbulb" },
            { title: "Cinta conductora / Cinta de cobre", description: "Pistas metálicas que recorren el palito llevando la energía de la pila al LED.", icon: "fa-tape" },
            { title: "1 Pila botón CR2032 (3V)", description: "Fuente de energía segura que se aloja en el mango o base de la varita.", icon: "fa-battery-full" },
            { title: "Interruptor táctil casero", description: "Pulsador en el mango armado con cinta para que encienda la luz al apretar con los dedos.", icon: "fa-hand-pointer" },
            { title: "Cinta decorativa o aisladora", description: "Para sujetar el circuito firmemente al palito y decorar tu varita mágica.", icon: "fa-ribbon" }
          ],
          instructions: [
            {
              step: 1,
              title: "Preparar el palito de algodón de azúcar",
              desc: "Tomá el palito de algodón de azúcar. Ubicá cuál será el extremo superior (donde brillará el LED) y cuál será el mango inferior (donde irá la pila botón y el pulsador).",
              tip: "El palito es liviano y fácil de manipular para manos pequeñas."
            },
            {
              step: 2,
              title: "Colocar el LED en la punta de la varita",
              desc: "Apoyá el bulbo del LED en la punta superior del palito. Abrí las dos patitas metálicas abrazando los laterales del palito: la pata larga (+) por un lado y la pata corta (-) por el lado opuesto.",
              tip: "¡Regla de oro: La pata más larga siempre es el polo positivo (+) y la más corta es el polo negativo (-)!"
            },
            {
              step: 3,
              title: "Pegar las pistas de cinta conductora",
              desc: "Pegá una tira continua de cinta desde la patita larga (+) bajando en línea recta a lo largo del palito hasta el mango. Del lado opuesto, pegá otra tira de cinta desde la patita corta (-) bajando hacia la base.",
              tip: "Las dos cintas deben correr separadas por lados opuestos del palito para que no se toquen entre sí."
            },
            {
              step: 4,
              title: "Fijar la Pila Botón CR2032 en el mango",
              desc: "En el mango del palito, pegá la cara negativa (-) de la pila sobre la pista que viene de la patita corta del LED, asegurándola con un pedacito de cinta.",
              tip: "La cara lisa con el signo (+) y letras queda mirando hacia arriba lista para hacer contacto."
            },
            {
              step: 5,
              title: "Armar el Pulsador Mágico en el mango",
              desc: "Dejá el extremo de la pista positiva (+) como una solapita flexible justo por encima de la cara (+) de la pila sin que la toque en reposo. Al sostener la varita y apretar con el dedo pulgar, la cinta toca la pila y cierra el circuito.",
              tip: "¡Al apretar con tu dedo se enciende la luz, y al soltarlo se apaga como por arte de magia!"
            },
            {
              step: 6,
              title: "¡Decorar y lanzar tus primeros hechizos!",
              desc: "Decorá el cuerpo del palito con cinta de colores o dibujos sin tapar el pulsador ni el LED. ¡Apagá un poco la luz y mirá cómo brilla tu varita!",
              tip: "¿No prende? Apretá bien con la uña sobre las patitas del LED y la cinta para asegurar buen contacto eléctrico."
            }
          ]
        },
        {
          id: "s5-p4",
          level: 4,
          title: "Cancha de Fútbol en Paint: Figuras Geométricas ⚽🎨",
          author: "Taller Digital Sala 5",
          date: "Junio 2026",
          type: "paint",
          badge: "🎨 Arte Digital & Figuras",
          icon: "fa-palette",
          color: "#16A34A",
          coverImage: "img/proyectos/cancha_futbol_paint_cover.png",
          description: "En la clase del taller usamos el programa Paint en la computadora para crear nuestra propia cancha de fútbol combinando figuras geométricas básicas (rectángulos, círculos y líneas). ¡Aquí tenés la explicación paso a paso y el espacio para subir tu dibujo terminado a tu carpeta de Google Drive!",
          objective: "Aprender a utilizar las herramientas básicas de Paint seleccionando figuras geométricas (rectángulo, círculo, línea recta y bote de pintura) para construir y colorear una cancha de fútbol completa.",
          benefits: "Desarrolla la motricidad fina y precisión con el mouse o pantalla táctil, el reconocimiento de figuras geométricas en el entorno cotidiano, nociones de proporción y simetría espacial, y la creatividad digital sin miedo a equivocarse.",
          tags: ["Paint", "Arte Digital", "Figuras Geométricas", "Fútbol", "Creatividad", "Nivel 4"],
          gallery: [
            "img/proyectos/cancha_futbol_paint_cover.png",
            "img/proyectos/cancha_futbol_paint_guia.png"
          ],
          pdfUrl: null,
          downloadPdfUrl: null,
          makecodeUrl: null,
          scratchId: null,
          gameUrl: null,
          externalUrl: null,
          materials: [
            { title: "Programa Paint / App de Dibujo", description: "Lienzo digital para crear arte combinando figuras geométricas.", icon: "fa-paint-brush" },
            { title: "Herramienta Rectángulo", description: "Para el perímetro de la cancha y las áreas grande y chica de los arcos.", icon: "fa-vector-square" },
            { title: "Herramienta Círculo (Elipse)", description: "Para el círculo del medio campo y los puntos de penal.", icon: "fa-circle" },
            { title: "Herramienta Línea Recta", description: "Para trazar la línea divisoria del medio campo.", icon: "fa-slash" },
            { title: "Bote de Pintura (Relleno)", description: "Para pintar el césped de verde brillante y el interior de las líneas.", icon: "fa-fill-drip" },
            { title: "Mouse o Pantalla Táctil", description: "Para hacer clic, arrastrar y soltar las figuras con precisión.", icon: "fa-mouse-pointer" }
          ],
          instructions: [
            {
              step: 1,
              title: "Abrir Paint y preparar el césped verde",
              desc: "Abrí Paint en la computadora. Seleccioná el Bote de Pintura (Relleno), elegí el color verde en la paleta y hacé clic en la hoja en blanco para convertirla en un hermoso pasto de fútbol.",
              tip: "Si querés pasto a rayas, podés alternar dos tonos de verde usando la herramienta Rectángulo."
            },
            {
              step: 2,
              title: "Trazar el rectángulo exterior de la cancha",
              desc: "Seleccioná la herramienta Rectángulo, elegí el color blanco y un grosor de línea medio. Hacé clic cerca de una esquina y arrastrá hasta la esquina opuesta para crear los límites de la cancha.",
              tip: "¡No te preocupes si no queda perfecto a la primera! Podés usar Ctrl + Z para deshacer y volver a intentar."
            },
            {
              step: 3,
              title: "Dividir la cancha con la Línea Central",
              desc: "Seleccioná la herramienta Línea con color blanco. Buscá la mitad exacta arriba y arrastrá en línea recta hacia abajo hasta tocar el borde inferior.",
              tip: "Mantené presionada la tecla Shift mientras arrastrás para que la línea salga perfectamente vertical."
            },
            {
              step: 4,
              title: "Dibujar el Círculo del medio campo",
              desc: "Seleccioná la herramienta Círculo (Elipse) con color blanco. Ubicate en el centro de la cancha, hacé clic y arrastrá para formar el redondel central.",
              tip: "Mantené presionada la tecla Shift para que el círculo sea redondo perfecto y no un óvalo."
            },
            {
              step: 5,
              title: "Construir las Áreas y Arcos con Rectángulos",
              desc: "Volvé a elegir la herramienta Rectángulo. Dibujá un rectángulo mediano pegado al borde izquierdo para el área grande, y repetí lo mismo en el lado derecho para el otro equipo.",
              tip: "Dentro de cada área grande podés agregar otro rectángulo más chiquito para el área chica del arquero."
            },
            {
              step: 6,
              title: "¡Puntos de penal, pelota y guardar tu obra!",
              desc: "Usá el Pincel o el Círculo relleno blanco para marcar el punto de saque central y los puntos de penal. ¡Dibujá una pelota o las redes de los arcos y guardá tu dibujo como imagen (.png)!",
              tip: "Andá a 'Archivo' > 'Guardar como' > 'Imagen PNG' y escribí tu nombre para mostrar tu creación."
            }
          ]
        },
        {
          id: "s5-p5",
          level: 5,
          title: "Tarjeta Pop-Up 3D: Corazón Luminoso para Mamá 💖✨",
          author: "Taller Maker Sala 5",
          date: "Mayo 2026",
          type: "electronica",
          badge: "💖 Tarjeta Pop-Up 3D • Papertronics",
          icon: "fa-heart",
          color: "#E11D48",
          coverImage: "img/proyectos/dia_madre_tarjeta_3d_cover.png",
          description: "¡Regalo especial del Día de la Madre! Diseñamos y construimos una tarjeta tridimensional interactiva (Papertronics). Mediante cortes precisos y pliegues pop-up escalonados, el corazón de píxeles se transforma mágicamente en 3D al abrir la tarjeta, revelando en su centro la foto del niño/a. En la base, al presionar el escudo del Colegio Paulo Freire, ¡se activa un circuito con diodo LED de alto brillo que ilumina con un efecto especial los bordes del corazón!",
          objective: "Construir una tarjeta pop-up tridimensional con circuito eléctrico de papel (Papertronics), integrando plegado geométrico 3D, colocación de foto en el centro del corazón y un circuito cerrado con pila botón CR2032, cinta conductora y LED que se ilumina al pulsar el escudo del colegio Paulo Freire.",
          benefits: "Desarrolla la motricidad fina y precisión de corte con tijera, comprensión de estructuras tridimensionales y relieve a partir de un plano bidimensional, nociones de circuito eléctrico con pulsador de presión oculta y conexión afectiva a través del arte maker.",
          tags: ["Día de la Madre", "Pop-Up 3D", "Papertronics", "Electrónica", "Corazón", "Colegio Paulo Freire", "LED", "Maker", "Nivel 5"],
          gallery: [
            "img/proyectos/dia_madre_tarjeta_3d_cover.png",
            "img/proyectos/dia_madre_circuito_plantilla.png"
          ],
          pdfUrl: "pdf/dia_de_la_madre_tarjeta_3d.pdf",
          downloadPdfUrl: "pdf/dia_de_la_madre_tarjeta_3d.pdf",
          makecodeUrl: null,
          scratchId: null,
          materials: [
            { title: "Plantilla Oficial 'Corazón Pixelado Pop-Up'", description: "Hoja con diseño escalonado 'Para Quien Ilumina Mi Vida' y escudo del Colegio Paulo Freire.", icon: "fa-file-alt" },
            { title: "Plantilla de Circuito Papertronics", description: "Lámina técnica con el trazado de pistas para la cinta de cobre, pila y LED.", icon: "fa-microchip" },
            { title: "Foto del niño o la niña", description: "Fotografía personal recortada para montar en el centro del corazón 3D.", icon: "fa-portrait" },
            { title: "1 Diodo LED de alto brillo", description: "Luz especial orientada para proyectar su brillo por los bordes del corazón 3D.", icon: "fa-lightbulb" },
            { title: "1 Pila botón CR2032 (3V)", description: "Fuente de energía segura que se aloja en la solapa inferior de la tarjeta.", icon: "fa-battery-full" },
            { title: "Cinta de cobre conductora", description: "Pistas metálicas autoadhesivas que conectan la pila, el pulsador y el LED.", icon: "fa-tape" },
            { title: "Pulsador en Escudo Paulo Freire", description: "Interruptor táctil disimulado detrás del escudo del colegio en la base de la tarjeta.", icon: "fa-shield-alt" },
            { title: "Tijera escolar y pegamento en barra", description: "Para realizar los cortes precisos del corazón y ensamblar las capas de cartulina.", icon: "fa-cut" }
          ],
          instructions: [
            {
              step: 1,
              title: "Cortes precisos en el Corazón Pixelado",
              desc: "Tomá la lámina del corazón y cortá con tijera únicamente por las líneas continuas marcadas en los escalones del corazón pixel. ¡Cuidado de no cortar las líneas de puntos!",
              tip: "Las líneas sólidas son para cortar con tijera; las líneas de puntos son para doblar."
            },
            {
              step: 2,
              title: "Plegado Pop-Up 3D hacia adelante",
              desc: "Doblá la tarjeta por la mitad mientras empujás suavemente los escalones del corazón hacia adelante. Al abrir la tarjeta a 90 grados, el corazón se levanta automáticamente en relieve 3D.",
              tip: "Marcá bien los pliegues con la yema del dedo para que el efecto pop-up sea firme y elástico."
            },
            {
              step: 3,
              title: "Pegar la foto del niño en el centro del corazón",
              desc: "Colocá una pizca de pegamento en barra y fijá tu foto en el centro exacto del corazón 3D. Mamá verá tu sonrisa flotando en relieve al abrir la tarjeta.",
              tip: "Recortá la foto siguiendo la silueta de tu rostro para que encaje como una gema en el corazón."
            },
            {
              step: 4,
              title: "Trazar las pistas de Cinta de Cobre",
              desc: "En la lámina de base (circuito), pegá la cinta de cobre siguiendo las líneas marcadas: una pista desde el polo positivo (+) hasta la patita larga del LED, y otra pista desde el polo negativo (-) pasando por el escudo.",
              tip: "Mantené la cinta de cobre lisa y bien presionada para que la corriente fluya sin interrupciones."
            },
            {
              step: 5,
              title: "Instalar el LED y Pila Botón CR2032",
              desc: "Fijá la pata larga (+) y la pata corta (-) del LED sobre sus pistas. Pegá la pila CR2032 en la solapa de la esquina asegurando que haga contacto firme.",
              tip: "Ubicá el LED de modo que su resplandor apunte hacia arriba e ilumine los bordes y relieve del corazón."
            },
            {
              step: 6,
              title: "¡Pulsador en el Escudo Paulo Freire y Efecto Mágico!",
              desc: "Pegá la solapa del escudo del Colegio Paulo Freire sobre los contactos abiertos del circuito. Al presionar el escudo con el dedo, el circuito se cierra y el corazón se ilumina mágicamente.",
              tip: "¡Decile a mamá: 'Apretá el escudo del colegio Paulo Freire' y mirá su cara de emoción cuando se prenda la luz!"
            }
          ]
        },
        {
          id: "s5-p6",
          level: 6,
          title: "Ana y Elsa: Arte Geométrico sobre el Hielo ❄️⛸️",
          author: "Taller Maker Sala 5",
          date: "Julio 2026",
          type: "codeorg",
          platform: "codeorg",
          badge: "❄️ Geometría & Programación",
          icon: "fa-snowflake",
          color: "#0284C7",
          coverImage: "img/frozen.png",
          gameUrl: "https://studio.code.org/s/frozen/lessons/1/levels/1",
          externalUrl: "https://studio.code.org/s/frozen/lessons/1/levels/1",
          description: "¡Nivel 6 de nuestra Ruta de Aventuras! En el Nivel 4 usamos Paint para dibujar figuras geométricas a mano alzada. Ahora con Ana y Elsa damos el gran salto a la programación: le damos órdenes a las patinadoras con bloques de código para trazar líneas rectas, esquinas en ángulo recto (90°), cuadrados y copos de nieve sobre el hielo.",
          objective: "Aprender a programar figuras geométricas en el hielo con Elsa y Ana, conectando los trazos manuales de Paint con algoritmos de código: bloques de avanzar píxeles, giros en ángulo recto de 90° y bucles de repetición.",
          benefits: "Crea un puente directo entre el arte de Paint y la geometría computacional: enseña la descomposición de figuras en trazos y giros, introduce el concepto de ángulo recto (90°), estimula la abstracción con bucles (repetir 4 veces) y fortalece la orientación espacial bidimensional.",
          tags: ["Frozen", "Ana y Elsa", "Code.org", "Geometría", "Ángulos", "Algoritmos", "Nivel 6"],
          gallery: [
            "img/frozen.png"
          ],
          pdfUrl: null,
          downloadPdfUrl: null,
          makecodeUrl: null,
          scratchId: null,
          materials: [
            { title: "Plataforma Code.org (Frozen: Arte en el Hielo)", description: "Desafío interactivo online con las pistas de patinaje de Elsa y Ana (https://studio.code.org/s/frozen/lessons/1/levels/1).", icon: "fa-snowflake" },
            { title: "Bloque 'Avanzar píxeles'", description: "Comando para patinar en línea recta dejando una estela mágica sobre el hielo.", icon: "fa-arrows-alt-v" },
            { title: "Bloque 'Girar 90 grados'", description: "Giro en ángulo recto: la clave para formar las esquinas de cuadrados y rectángulos.", icon: "fa-redo" },
            { title: "Bloque 'Repetir' (Bucles)", description: "Herramienta mágica para dibujar figuras geométricas completas sin escribir código repetido.", icon: "fa-sync-alt" }
          ],
          instructions: [
            {
              step: 1,
              title: "De Paint al Código: Observar el hielo",
              desc: "En Paint dibujabas la cancha arrastrando el mouse. Acá Elsa patina cuando le das órdenes precisas. Mirá el hielo: ubicá hacia dónde mira Elsa y qué línea debe trazar.",
              tip: "¿Cuántos píxeles tiene que avanzar? ¡Arrastrá el bloque 'Avanzar 100 píxeles' debajo de 'Al ejecutar'!"
            },
            {
              step: 2,
              title: "Hacer una esquina perfecta (Giro de 90°)",
              desc: "Para doblar como en las esquinas de los arcos y la cancha de Paint, encastrá un bloque 'Girar a la derecha 90 grados'. Así Elsa cambia de dirección sin moverse de lugar.",
              tip: "El ángulo de 90° es una esquina perfecta, como el borde de una hoja de papel o la esquina de una mesa."
            },
            {
              step: 3,
              title: "Construir un Cuadrado sobre el hielo",
              desc: "Repetí el patrón: avanzar 100 píxeles y girar 90 grados. Al hacerlo 4 veces seguidas, ¡Elsa patina cerrando un cuadrado brillante!",
              tip: "¡El secreto de los programadores! En vez de poner 8 bloques, podés usar el bloque 'Repetir 4 veces' para que la computadora lo haga sola."
            },
            {
              step: 4,
              title: "Tocar 'Ejecutar' y crear copos de nieve",
              desc: "Tocá el botón naranja 'Ejecutar' para ver a Elsa deslizarse patinando con música y magia. Al completar los niveles, ¡desbloquearás a Ana y hermosos copos de nieve!",
              tip: "Si Elsa patina para otro lado, ¡no pasa nada! Tocá 'Reiniciar', cambiá el giro de derecha a izquierda y probá otra vez."
            }
          ]
        },
        {
          id: "s5-p7",
          level: 7,
          title: "Banderas del Mundial en Paint: Geometría y Colores 🇺🇾⚽🎨",
          author: "Taller Digital Sala 5",
          date: "Agosto 2026",
          type: "paint",
          badge: "🎨 Arte Digital & Banderas",
          icon: "fa-flag",
          color: "#2563EB",
          coverImage: "img/proyectos/banderas_mundial_paint_cover.png",
          description: "¡Nivel 7 de nuestra Ruta de Aventuras! En este proyecto usamos Paint para diseñar las banderas de los países del mundial combinando figuras geométricas básicas: rectángulos para el perímetro y las franjas (horizontales o verticales), círculos y estrellas para los soles y emblemas patrios, y el bote de pintura para colorear con los tonos oficiales. ¡Subí tu dibujo para ganar +100 XP!",
          objective: "Aprender a descomponer y dibujar banderas del mundial en Paint utilizando figuras geométricas básicas (rectángulos para franjas, círculos y estrellas para detalles) y rellenar con color respetando los límites de cada figura cerrada.",
          benefits: "Fortalece la coordinación motriz fina con el mouse, introduce nociones de fraccionamiento espacial y proporciones (dividir un lienzo en dos mitades o tres tercios iguales), ejercita la simetría y amplía el conocimiento cultural y geográfico del mundo.",
          tags: ["Paint", "Arte Digital", "Banderas", "Mundial", "Figuras Geométricas", "Colores", "Nivel 7"],
          gallery: [
            "img/proyectos/banderas_mundial_paint_cover.png",
            "img/proyectos/banderas_mundial_paint_guia.png"
          ],
          pdfUrl: null,
          downloadPdfUrl: null,
          makecodeUrl: null,
          scratchId: null,
          gameUrl: null,
          externalUrl: null,
          materials: [
            { title: "Programa Paint / Lienzo Digital", description: "Espacio de trabajo digital para dibujar con herramientas gráficas.", icon: "fa-paint-brush" },
            { title: "Herramienta Rectángulo", description: "Para el marco exterior de la bandera y las franjas de colores.", icon: "fa-vector-square" },
            { title: "Herramienta Línea Recta", description: "Para dividir las banderas en franjas horizontales o verticales.", icon: "fa-slash" },
            { title: "Herramientas Círculo y Formas", description: "Para dibujar el Sol de Mayo (Uruguay/Argentina), rombos (Brasil) y estrellas.", icon: "fa-circle" },
            { title: "Bote de Pintura (Relleno)", description: "Para pintar cada franja con los colores patrios oficiales sin derramar pintura.", icon: "fa-fill-drip" },
            { title: "Mouse o Pantalla Táctil", description: "Para ejercitar precisión y motricidad fina al arrastrar figuras.", icon: "fa-mouse-pointer" }
          ],
          instructions: [
            {
              step: 1,
              title: "Trazar el rectángulo exterior de la bandera",
              desc: "Abrí Paint. Seleccioná la herramienta Rectángulo con color negro o gris oscuro. Hacé clic arriba a la izquierda y arrastrá para armar el lienzo de tu bandera.",
              tip: "Mantené un tamaño amplio en la pantalla para tener espacio cómodo donde colocar las franjas."
            },
            {
              step: 2,
              title: "Dividir en franjas (Horizontales o Verticales)",
              desc: "Elegí la bandera que querés dibujar: si es como Uruguay o Argentina, dividí el rectángulo con franjas horizontales; si es como Francia o Italia, usá franjas verticales.",
              tip: "Usá la herramienta Rectángulo o Línea asegurándote de tocar los dos bordes para que no queden huecos abiertos."
            },
            {
              step: 3,
              title: "Agregar figuras y símbolos centrales",
              desc: "Seleccioná la herramienta Círculo (Elipse) para dibujar el sol (Uruguay / Argentina) o la forma de Rombo para la bandera de Brasil.",
              tip: "Mantené pulsada la tecla Shift mientras arrastrás para que el círculo salga redondito perfecto."
            },
            {
              step: 4,
              title: "Colorear con el Bote de Pintura",
              desc: "Seleccioná el Bote de Pintura, elegí los colores en la paleta (azul, celeste, amarillo, verde, rojo) y hacé clic dentro de cada franja para rellenarla.",
              tip: "Si se pinta toda la pantalla de un solo color, ¡apretá Ctrl + Z de inmediato! Significa que había un pequeño espacio abierto en la línea."
            },
            {
              step: 5,
              title: "Dibujar más banderas de tus países favoritos",
              desc: "Al lado de tu primera bandera podés dibujar otra de tus selecciones favoritas del mundial para armar tu propia colección digital de banderas.",
              tip: "¡Probá una fácil con 2 o 3 franjas y luego desafiate con una que tenga sol o estrellas!"
            },
            {
              step: 6,
              title: "Guardar tu dibujo y subirlo a Drive",
              desc: "Andá a 'Archivo' > 'Guardar como' > 'Imagen PNG' y guardalo con el nombre 'banderas_mundial.png'. ¡Arrastralo a la pestaña 'Mi Entrega' para sumar +100 XP!",
              tip: "¡Tus profesores y compañeros van a poder ver tu lámina de banderas en tu carpeta de Google Drive!"
            }
          ]
        },
        {
          id: "s5-p8",
          level: 8,
          title: "Minecraft: Hora del Código (Aprender a Programar) ⛏️🧱",
          author: "Taller de Programación Sala 5",
          date: "Septiembre 2026",
          type: "codeorg",
          platform: "codeorg",
          badge: "⛏️ Código & Minecraft",
          icon: "fa-cube",
          color: "#059669",
          coverImage: "img/minecraft.png",
          gameUrl: "https://studio.code.org/s/mc/lessons/1/levels/1",
          externalUrl: "https://studio.code.org/s/mc/lessons/1/levels/1",
          description: "¡Nivel 8 de nuestra Ruta de Aventuras! ⚠️ ACLARACIÓN IMPORTANTE: No es el juego tradicional de Minecraft comercial (supervivencia o modo libre con joystick), sino una adaptación pedagógica oficial de Code.org para aprender a programar desde el juego. Steve y Alex no se mueven solos; ¡vos los controlás encastrando bloques de código para que caminen, talen árboles, esquilen ovejas y construyan!",
          objective: "Aprender los fundamentos del pensamiento computacional resolviendo los desafíos de la adaptación oficial de Minecraft en Code.org: programar secuencias algorítmicas, interactuar con el entorno 3D (destruir bloques, esquilar, colocar) y optimizar instrucciones con bucles de repetición.",
          benefits: "Canaliza el gran entusiasmo por Minecraft hacia el aprendizaje activo de las ciencias de la computación: transforma a los niños de jugadores pasivos a creadores de código, desarrolla la orientación espacial isométrica, ejercita la descomposición de problemas y la lógica de bucles tempranos.",
          tags: ["Minecraft", "Code.org", "Steve", "Alex", "Algoritmos", "Hora del Código", "Nivel 8"],
          gallery: [
            "img/minecraft.png"
          ],
          pdfUrl: null,
          downloadPdfUrl: null,
          makecodeUrl: null,
          scratchId: null,
          materials: [
            { title: "Adaptación Educativa Code.org Minecraft", description: "Módulos interactivos oficiales de la Hora del Código (https://studio.code.org/s/mc/lessons/1/levels/1).", icon: "fa-cube" },
            { title: "Bloques de Desplazamiento", description: "Comandos 'avanzar', 'girar a la derecha' y 'girar a la izquierda'.", icon: "fa-arrows-alt" },
            { title: "Bloques de Acción", description: "Comandos 'destruir bloque', 'trasquilar oveja', 'colocar tablones'.", icon: "fa-hammer" },
            { title: "Bloque 'Repetir' (Bucles)", description: "Para que Steve o Alex repitan acciones sin llenar la pantalla de bloques.", icon: "fa-sync-alt" }
          ],
          instructions: [
            {
              step: 1,
              title: "Elegir tu personaje: ¿Steve o Alex?",
              desc: "Al ingresar a la actividad en Code.org podés elegir si querés jugar como Steve o como Alex para iniciar tu aventura de programación.",
              tip: "Recordá: ¡aquí no usamos teclado para movernos! Solo avanzamos cuando colocamos bloques de programación."
            },
            {
              step: 2,
              title: "Contar los bloques de distancia en el mapa",
              desc: "Mirá la cuadrícula isométrica: contá cuántos casilleros de distancia separan a tu personaje de la oveja o del árbol.",
              tip: "Si hay 2 casilleros, necesitás encastrar 2 bloques de 'avanzar' debajo de 'al ejecutar'."
            },
            {
              step: 3,
              title: "Encastrar las acciones: ¡Talar y Construir!",
              desc: "Cuando llegues al árbol o a la oveja, colocá el bloque de acción correspondiente: 'destruir bloque' para conseguir madera o 'trasquilar' para obtener lana.",
              tip: "Pensá el orden exacto: primero caminar hasta el bloque y recién después ejecutar la acción."
            },
            {
              step: 4,
              title: "Tocar 'Ejecutar' y celebrar la misión",
              desc: "Hacé clic en el botón naranja 'Ejecutar'. Mirá cómo tu personaje cobra vida y sigue fielmente cada orden que programaste. ¡Al terminar podés marcar tu entrega para sumar +100 XP!",
              tip: "Si tu personaje choca con agua o lava, ¡tocá 'Reiniciar' y corregí el camino! Así programan los ingenieros."
            }
          ]
        },
        {
          id: "s5-p9",
          level: 9,
          title: "Escenarios CodeJr - Primera Parte (5 años): Ambiente y Velocidades en Scratch Jr 🐱⚡",
          author: "Taller de Programación Sala 5",
          date: "Septiembre 2026",
          type: "scratch",
          platform: "codejr",
          badge: "🐱 Scratch Jr • Escenarios & Velocidad",
          icon: "fa-tachometer-alt",
          color: "#EA580C",
          coverImage: "img/scratchjr.png",
          projectFileUrl: "proyectos/velocidad.sjr",
          downloadUrl: "proyectos/velocidad.sjr",
          externalUrl: "https://codejr.org",
          description: "¡Nivel 9 de nuestra Ruta de Aventuras! En este nivel aprendimos a navegar y explorar el ambiente de trabajo de Scratch Jr: creación de escenarios con fondos ilustrados, agregado de personajes y, fundamentalmente, cómo manejar y programar diferentes velocidades (lenta, media y rápida) utilizando los bloques de movimiento y el bloque naranja de velocidad. Descargá el proyecto de ejemplo velocidad.sjr para abrirlo en Scratch Jr.",
          objective: "Reconocer y explorar el entorno de Scratch Jr (lienzo, personajes, escenarios de fondo y paleta de bloques) y aprender a programar secuencias de movimiento configurando diferentes velocidades con el bloque naranja de velocidad (lenta, media y rápida).",
          benefits: "Desarrolla la orientación espacial digital, la estructuración de secuencias algorítmicas tempranas, la diferenciación conceptual de velocidades (ritmo, aceleración, tiempo), el pensamiento computacional intuitivo y la capacidad de expresar narrativas visuales.",
          tags: ["Scratch Jr", "CodeJr", "Velocidad", "Escenarios", "Ambiente", "Algoritmos", "Nivel 9"],
          gallery: [
            "img/scratchjr.png"
          ],
          pdfUrl: null,
          downloadPdfUrl: null,
          makecodeUrl: null,
          scratchId: null,
          materials: [
            { title: "Aplicación Scratch Jr", description: "Entorno visual de programación en tablets o PC (https://codejr.org).", icon: "fa-cat" },
            { title: "Archivo de Ejemplo 'velocidad.sjr'", description: "Proyecto listo para cargar con la programación de velocidades.", icon: "fa-file-code" },
            { title: "Bloque Amarillo 'Bandera Verde'", description: "Comando de inicio para poner en marcha a los personajes simultáneamente.", icon: "fa-flag" },
            { title: "Bloque Naranja de 'Velocidad'", description: "Permite elegir entre 3 ritmos: Lento (caminar), Medio (trotar) o Rápido (correr).", icon: "fa-tachometer-alt" },
            { title: "Bloques Azules de 'Movimiento'", description: "Comandos de flechas para avanzar casilleros hacia adelante en el escenario.", icon: "fa-arrows-alt-h" }
          ],
          instructions: [
            {
              step: 1,
              title: "Explorar el Ambiente de Scratch Jr",
              desc: "Abrí Scratch Jr tocando la casita. Observá el escenario central, la columna izquierda donde se agregan personajes y la columna derecha con los escenarios/fondos.",
              tip: "Tocá el botón del paisaje arriba para elegir un fondo divertido (parque, luna, cancha o bosque)."
            },
            {
              step: 2,
              title: "Elegir personajes para una carrera",
              desc: "Tocá el botón '+' a la izquierda para sumar otro personaje al escenario. Por ejemplo, al gato Scratch Jr y a un amigo para que compitan a diferentes velocidades.",
              tip: "Arrastrá los personajes con el dedo o mouse al borde izquierdo del escenario listos para la largada."
            },
            {
              step: 3,
              title: "Conectar la Bandera Verde de inicio",
              desc: "Andá a la categoría amarilla (Disparadores) y arrastrá el bloque de la 'Bandera Verde' al área de programación.",
              tip: "Al tocar la bandera verde grande de arriba, ¡todos los personajes arrancarán al mismo tiempo!"
            },
            {
              step: 4,
              title: "Programar la Velocidad con el Bloque Naranja",
              desc: "Andá a la categoría naranja (Control) y arrastrá el bloque de 'Velocidad'. Tocalo para elegir una de las 3 velocidades: 1 (Lento), 2 (Medio) o 3 (Rápido).",
              tip: "El ícono del caracol/hombre caminando es lento; la persona trotando es velocidad media; y la persona corriendo o auto es súper rápido."
            },
            {
              step: 5,
              title: "Agregar bloques de movimiento hacia adelante",
              desc: "Andá a la categoría azul (Movimiento) y encastrá una flecha hacia la derecha con el número de pasos deseado (por ejemplo, 10 pasos).",
              tip: "Poné a un personaje en velocidad 1 y al otro en velocidad 3 para ver claramente la diferencia de velocidad en la carrera."
            },
            {
              step: 6,
              title: "¡Tocar la Bandera Verde y disfrutar!",
              desc: "Tocá la bandera verde arriba a la derecha. Mirá cómo cada personaje recorre el escenario con su propio ritmo programado. ¡Subí tu proyecto o foto para sumar +100 XP!",
              tip: "Podés descargar el archivo velocidad.sjr desde el botón de la misión para ver el ejemplo completo."
            }
          ]
        },
        {
          id: "s5-p10",
          level: 10,
          title: "Escenarios CodeJr - Segunda Parte (5 años): Cambiar la Perspectiva de las Figuras 🐱🔍",
          author: "Taller de Programación Sala 5",
          date: "Septiembre 2026",
          type: "scratch",
          platform: "codejr",
          badge: "🐱 Scratch Jr • Escenarios & Perspectiva",
          icon: "fa-search-plus",
          color: "#7C3AED",
          coverImage: "img/scratchjr.png",
          projectFileUrl: "proyectos/perpestiva.sjr",
          downloadUrl: "proyectos/perpestiva.sjr",
          externalUrl: "https://codejr.org",
          description: "¡Nivel 10 de nuestra Ruta de Aventuras! En esta segunda parte aprendemos a cambiar la perspectiva visual y el tamaño de las figuras en Scratch Jr. Descubrimos cómo crear la ilusión óptica de profundidad 3D en un escenario 2D: enviamos al personaje Teen3 al fondo del camino haciéndolo pequeño con el bloque violeta de achicar (5 veces), y a medida que desciende por el sendero hacia nosotros, lo agrandamos progresivamente para simular que camina hacia el frente. Descargá el proyecto de ejemplo perpestiva.sjr para abrirlo en Scratch Jr.",
          objective: "Comprender y programar la perspectiva visual y profundidad en Scratch Jr utilizando los bloques violetas de apariencia (achicar para alejar, agrandar para acercar y restaurar tamaño estándar) combinados con movimientos en el escenario para simular que un personaje avanza hacia el observador.",
          benefits: "Desarrolla la percepción espacial tridimensional, la diferenciación conceptual de escala y distancia (lejos/pequeño vs. cerca/grande), la estructuración de algoritmos con cambio de apariencia secuencial, la abstracción visual y la creatividad en animación digital.",
          tags: ["Scratch Jr", "CodeJr", "Perspectiva", "Profundidad", "Escenarios", "Apariencia", "Bloques Violetas", "Nivel 10"],
          gallery: [
            "img/scratchjr.png"
          ],
          pdfUrl: null,
          downloadPdfUrl: null,
          makecodeUrl: null,
          scratchId: null,
          materials: [
            { title: "Aplicación Scratch Jr", description: "Entorno visual de programación en tablets o PC (https://codejr.org).", icon: "fa-cat" },
            { title: "Archivo de Ejemplo 'perpestiva.sjr'", description: "Proyecto oficial con Teen3 caminando en perspectiva por el sendero del bosque.", icon: "fa-file-code" },
            { title: "Bloque Amarillo 'Bandera Verde'", description: "Comando de inicio para disparar la animación de perspectiva.", icon: "fa-flag" },
            { title: "Bloque Azul 'Ir al Inicio' (Home)", description: "Devuelve al personaje a su posición inicial en la parte superior del camino.", icon: "fa-home" },
            { title: "Bloque Violeta 'Restaurar Tamaño'", description: "Reinicia la escala del personaje a su tamaño normal estándar (100%).", icon: "fa-sync-alt" },
            { title: "Bloques Violetas 'Achicar' y 'Agrandar'", description: "Permiten simular distancia (achicar 5) y acercamiento hacia la pantalla (agrandar 2).", icon: "fa-expand-arrows-alt" },
            { title: "Bloques Azules 'Bajar' (Movimiento)", description: "Hacen descender al personaje por el camino hacia el primer plano.", icon: "fa-arrow-down" }
          ],
          instructions: [
            {
              step: 1,
              title: "Abrir Scratch Jr y Elegir un Fondo con Camino",
              desc: "Abrí Scratch Jr y tocá el botón del paisaje arriba. Elegí un escenario que tenga profundidad, como un camino, bosque o sendero (por ejemplo el fondo del bosque).",
              tip: "Los fondos con un sendero que va desde el horizonte hacia el frente son ideales para practicar perspectiva."
            },
            {
              step: 2,
              title: "Seleccionar el Personaje y Ubicarlo al Fondo",
              desc: "Seleccioná al personaje (por ejemplo Teen3 o el gato) y arrastralo con el dedo o mouse a la parte superior del camino, donde empieza el sendero.",
              tip: "Ese punto será el inicio de su viaje hacia adelante."
            },
            {
              step: 3,
              title: "Poner Bandera Verde, Volver a Casa y Restaurar Tamaño",
              desc: "Iniciá tu programa con el bloque amarillo de 'Bandera Verde'. Luego encastrá el bloque azul de 'Volver al Inicio' (casa) y el bloque violeta de 'Restaurar Tamaño' (personita con círculo).",
              tip: "Esto asegura que cada vez que toques la bandera verde, el personaje arranque en el lugar exacto y con tamaño normal."
            },
            {
              step: 4,
              title: "Achicar al Personaje para Mandarlo Lejos (Perspectiva)",
              desc: "Encastrá el bloque violeta de 'Achicar' (personita con flechas hacia adentro) y escribí el número 5.",
              tip: "¡Magia visual! El personaje se vuelve chiquito como si estuviera a kilómetros de distancia en el horizonte."
            },
            {
              step: 5,
              title: "Programar la Secuencia de Acercamiento (Bajar y Agrandar)",
              desc: "Encastrá: flecha azul de 'Bajar' (2 pasos) ➔ bloque violeta de 'Agrandar' (2 veces) ➔ 'Bajar' (2 pasos) ➔ 'Agrandar' (2 veces) ➔ 'Bajar' (4 pasos).",
              tip: "A medida que baja por el camino, se agranda simultáneamente. ¡Parece una película en 3D!"
            },
            {
              step: 6,
              title: "¡Tocar la Bandera Verde y Probar!",
              desc: "Tocá la bandera verde arriba a la derecha. Mirá cómo tu personaje aparece a lo lejos y camina hacia vos haciéndose cada vez más grande. ¡Subí tu proyecto o foto para sumar +100 XP!",
              tip: "Podés descargar el archivo perpestiva.sjr desde el botón de la misión para ver el ejemplo completo funcionando."
            }
          ]
        }
      ]
    },

    /* ===================================================
       1° GRADO
    =================================================== */
    {
      id: "grado1",
      name: "1° Grado",
      shortName: "1° Grado",
      icon: "📖",
      color: "#1565C0",
      colorLight: "#E3F2FD",
      colorBorder: "#2196F3",
      description: "Títeres de cartón y personajes interactivos: unimos manualidades recicladas con primeras secuencias en bloques.",

      games: [
        {
          id: "g1-g1",
          level: 9,
          title: "Escenarios CodeJr - Primera Parte: Ambiente y Velocidades 🐱⚡",
          platform: "codejr",
          externalUrl: "https://codejr.org",
          thumbnail: "img/scratchjr.png",
          description: "¡Nivel 9 de la Ruta de Aventuras! Aprendemos a explorar el ambiente de Scratch Jr: creación de escenarios con fondos ilustrados, personajes y cómo programar diferentes velocidades (lenta, media y rápida) con el bloque naranja de velocidad.",
          benefits: "Fomenta la creatividad en historias digitales, el reconocimiento del ambiente y escenarios de Scratch Jr, el control de la velocidad y el movimiento algorítmico, y la experimentación causa-efecto comparando velocidades en carreras de personajes.",
          tags: ["Scratch Jr", "CodeJr", "Escenarios", "Velocidad", "Bloques", "Nivel 9"]
        },
        {
          id: "g1-g4",
          level: 2,
          title: "Angry Birds: Primeros Pasos 🐦",
          platform: "codeorg",
          externalUrl: "https://studio.code.org/es/hoc/1",
          thumbnail: "img/angrybirds.png",
          description: "¡Nivel 2 de la Ruta de Aventuras! Guiá al pájaro por el laberinto para aprender a programar y dar los primeros pasos de razonamiento computacional.",
          benefits: "Aprender a programar y los primeros pasos del razonamiento en programación: secuenciación de algoritmos paso a paso, lateralidad (izquierda/derecha), descomposición de problemas y prueba y error.",
          tags: ["Code.org", "Angry Birds", "Algoritmos", "Hora del Código"]
        },
        {
          id: "g1-g3",
          level: 6,
          title: "Ana y Elsa (Frozen): Geometría en el Hielo ❄️⛸️",
          platform: "codeorg",
          externalUrl: "https://studio.code.org/s/frozen/lessons/1/levels/1",
          thumbnail: "img/frozen.png",
          description: "¡Nivel 6 de la Ruta de Aventuras! Conectamos lo aprendido en Paint con la programación: guiamos a Elsa y Ana a patinar para trazar figuras geométricas, ángulos y copos de nieve con código.",
          benefits: "Conecta el dibujo geométrico manual de Paint con el pensamiento algorítmico, comprensión de ángulos rectos (90°), nociones de bucles (repetición) y orientación espacial sobre el hielo.",
          tags: ["Code.org", "Frozen", "Geometría", "Ángulos", "Nivel 6"]
        },
        {
          id: "g1-g2",
          level: 8,
          title: "Minecraft: Hora del Código (Aprender a Programar) ⛏️🧱",
          platform: "codeorg",
          externalUrl: "https://studio.code.org/s/mc/lessons/1/levels/1",
          thumbnail: "img/minecraft.png",
          description: "¡Nivel 8 de la Ruta de Aventuras! ⚠️ Aclaración: no es el juego tradicional de Minecraft de juego libre, sino una adaptación pedagógica oficial de Code.org para aprender a programar dando órdenes en bloques a Steve y Alex.",
          benefits: "Canaliza el entusiasmo por Minecraft hacia el aprendizaje del pensamiento computacional: secuenciación lógica, orientación en cuadrícula 3D isométrica, descomposición de acciones y bucles de repetición.",
          tags: ["Code.org", "Minecraft", "Steve", "Alex", "Algoritmos", "Hora del Código", "Nivel 8"]
        },
        {
          id: "g1-g5",
          level: 10,
          title: "Escenarios CodeJr - Segunda Parte: Perspectiva y Profundidad 🐱🔍",
          platform: "codejr",
          externalUrl: "https://codejr.org",
          thumbnail: "img/scratchjr.png",
          description: "¡Nivel 10 de la Ruta de Aventuras! Aprendemos a cambiar la perspectiva visual y escala de los personajes en Scratch Jr: usamos los bloques violetas de apariencia (achicar para alejar en el horizonte y agrandar para acercar) combinados con movimientos en el sendero.",
          benefits: "Desarrolla la noción espacial de profundidad tridimensional en un plano 2D, la comprensión de variables visuales y escalas (lejos = pequeño, cerca = grande), y la coordinación de secuencias de apariencia y movimiento en Scratch Jr.",
          tags: ["Scratch Jr", "CodeJr", "Escenarios", "Perspectiva", "Profundidad", "Apariencia", "Bloques Violetas", "Nivel 10"]
        }
      ],

      projects: [
        {
          id: "g1-p1",
          level: 1,
          title: "El Sombrero Luminoso de San Patricio 🍀🎩",
          author: "Taller Maker 1° Grado",
          date: "Marzo 2026",
          type: "electronica",
          badge: "🍀 Circuito & Sombrero Maker",
          icon: "fa-hat-wizard",
          color: "#16A34A",
          coverImage: "img/proyectos/sombrero_san_patricio_solo_sombrero.png",
          description: "¡Nivel 1 de nuestra Ruta de Aventuras! Aprendemos cómo viaja la electricidad construyendo un sombrero festivo de San Patricio con vincha interactiva: usamos cinta de cobre conductora, un diodo LED verde en el trébol y una pila botón CR2032 con interruptor de presión en la vincha.",
          objective: "Construir un circuito eléctrico seguro con cinta de cobre conductora, pila botón CR2032 y luz LED verde en el trébol del sombrero de San Patricio, logrando que se encienda con la presión de la cabeza sobre la vincha.",
          benefits: "Desarrolla la motricidad fina, comprensión vivencial de circuito cerrado y polaridad (+ y -), causa-efecto en electricidad básica y confianza creativa en el taller maker sin pantallas.",
          tags: ["San Patricio", "Electrónica", "Circuito", "LED", "Sin programación", "Maker", "Nivel 1"],
          gallery: [
            "img/proyectos/sombrero_san_patricio_solo_sombrero.png",
            "img/proyectos/sombrero_san_patricio_solo_circuito.png"
          ],
          pdfUrl: "docs/sombrero_san_patricio_guia.pdf",
          downloadPdfUrl: "docs/sombrero_san_patricio_guia.pdf",
          makecodeUrl: null,
          scratchId: null,
          materials: [
            { title: "Plantilla del Sombrero de San Patricio", description: "Cuerpo del sombrero con el trébol troquelado para iluminar.", icon: "fa-hat-cowboy" },
            { title: "1 Diodo LED verde (5mm)", description: "Luz que brilla en el centro del trébol.", icon: "fa-lightbulb" },
            { title: "Cinta de cobre conductora autoadhesiva", description: "Pistas metálicas por donde viaja la electricidad.", icon: "fa-tape" },
            { title: "1 Pila de botón CR2032 (3V)", description: "Fuente de energía segura de bajo voltaje.", icon: "fa-battery-full" },
            { title: "Interruptor en la solapa de la vincha", description: "Cierra el circuito automáticamente al calzarse el sombrero.", icon: "fa-toggle-on" },
            { title: "Tijera, pegamento en barra y colores", description: "Para recortar, ensamblar y decorar tu sombrero maker.", icon: "fa-cut" }
          ],
          instructions: [
            {
              step: 1,
              title: "Colorear y Recortar la Plantilla",
              desc: "Pintá tu sombrero con tonos verdes y dorados. Luego recortá con tijera por la línea exterior del sombrero y las tiras de la vincha.",
              tip: "¡No cortes el trébol por completo! Solo hacé un orificio diminuto en el centro para pasar la cabeza del LED."
            },
            {
              step: 2,
              title: "Pegar las Pistas de Cinta de Cobre",
              desc: "Del lado de atrás del sombrero, pegá una tira de cinta de cobre desde la solapa de la vincha hasta el trébol (pista positiva) y otra tira para el retorno a la pila (pista negativa).",
              tip: "Asegurate de que las dos cintas no se toquen entre sí para evitar cortocircuitos."
            },
            {
              step: 3,
              title: "Instalar el LED Verde en el Trébol",
              desc: "Abrí las patitas del LED. Apoyá la patita larga (positiva +) sobre la pista que va al polo positivo y la patita corta (negativa -) sobre la pista de retorno.",
              tip: "Fijá firmemente cada patita con un pedacito de cinta de cobre encima para asegurar excelente contacto."
            },
            {
              step: 4,
              title: "Fijar la Pila Botón CR2032",
              desc: "Colocá la pila en su base: la cara rugosa (-) contra la pista negativa, y pegala con cinta adhesiva dejando la cara lisa con letras (+) libre hacia arriba.",
              tip: "¡Probá antes de cerrar! Al tocar la cara lisa con la pista positiva, el LED verde debe encender al instante."
            },
            {
              step: 5,
              title: "Armar el Interruptor en la Solapa de la Vincha",
              desc: "Envolvé con cinta de cobre la solapa de la vincha. Al colocar la vincha en la cabeza, las dos cintas de cobre se tocan y cierran el circuito.",
              tip: "¡Al calzarte el sombrero, la presión de tu cabeza hace contacto y enciende la luz verde automáticamente!"
            },
            {
              step: 6,
              title: "¡Ajustar la vincha y lucir tu invento!",
              desc: "Uní las tiras de la vincha según el contorno de tu cabeza con cinta o abrochadora. ¡Mirá cómo brilla el trébol de la suerte!",
              tip: "¿No prende? Apretá bien sobre las patitas del LED y la cinta de cobre para eliminar falsos contactos."
            }
          ]
        },
        {
          id: "g1-p2",
          level: 2,
          title: "Angry Birds: Primeros Pasos de Programación 🐦🎯",
          author: "Taller de Programación 1° Grado",
          date: "Abril 2026",
          type: "codeorg",
          platform: "codeorg",
          badge: "🎮 Programación & Algoritmos",
          icon: "fa-puzzle-piece",
          color: "#E11D48",
          coverImage: "img/angrybirds.png",
          gameUrl: "https://studio.code.org/es/hoc/1",
          externalUrl: "https://studio.code.org/es/hoc/1",
          description: "¡Nivel 2 de nuestra Ruta de Aventuras! Aprendemos a programar y damos los primeros pasos del razonamiento computacional guiando a los Angry Birds a través del laberinto hasta atrapar al cerdito travieso con bloques de flechas en secuencia.",
          objective: "Aprender a programar y dar los primeros pasos de razonamiento en programación guiando al pájaro a través del laberinto hasta el cerdito.",
          benefits: "Desarrolla el pensamiento computacional, la estructuración de algoritmos paso a paso, la lateralidad y orientación espacial (adelante, izquierda, derecha), la descomposición de problemas y el método de prueba y depuración de errores (debugging) de forma divertida.",
          tags: ["Angry Birds", "Code.org", "Lógica", "Algoritmos", "Hora del Código", "Nivel 2"],
          gallery: [
            "img/angrybirds.png"
          ],
          pdfUrl: null,
          downloadPdfUrl: null,
          makecodeUrl: null,
          scratchId: null,
          materials: [
            { title: "Plataforma Code.org (Hora del Código)", description: "Desafío interactivo online con laberintos progresivos (https://studio.code.org/es/hoc/1).", icon: "fa-gamepad" },
            { title: "Bloques de Dirección de Flechas", description: "Comandos secuenciales: avanzar, girar a la izquierda y girar a la derecha.", icon: "fa-arrows-alt" },
            { title: "Computadora o Tablet", description: "Para arrastrar y encastrar los bloques como piezas de rompecabezas.", icon: "fa-laptop" }
          ],
          instructions: [
            {
              step: 1,
              title: "Observar el laberinto y al cerdito",
              desc: "Mirá bien la pantalla: ubicá dónde está el pájaro rojo y hacia dónde debe caminar para llegar hasta el cerdito travieso.",
              tip: "¿Está en línea recta o tiene que doblar? ¡Contá cuántos casilleros debe avanzar!"
            },
            {
              step: 2,
              title: "Arrastrar el bloque 'Avanzar'",
              desc: "Tomá con el dedo o el mouse el bloque anaranjado 'avanzar' y encastralo debajo del bloque amarillo 'cuando se ejecuta'. Cada bloque hace que el pájaro dé un paso.",
              tip: "Escucharás un 'clic' mágico cuando las dos piezas encastren perfectamente."
            },
            {
              step: 3,
              title: "Girar cuando haya una curva",
              desc: "Si el camino dobla, colocá un bloque de 'girar a la derecha' o 'girar a la izquierda'. ¡Fijate hacia dónde mira el pico del pájaro!",
              tip: "Usá tus manos frente a la pantalla para sentir si debe doblar hacia la izquierda o la derecha."
            },
            {
              step: 4,
              title: "Tocar el botón naranja 'Ejecutar'",
              desc: "Tocá 'Ejecutar' para ver cómo el pájaro cobra vida y camina paso a paso siguiendo tu programa.",
              tip: "Si no llega o choca contra una caja, tocá 'Reiniciar', cambiá los bloques y probalo de nuevo. ¡Así piensan los programadores!"
            }
          ]
        },
        {
          id: "g1-p3",
          level: 3,
          title: "El Marca-Libros Origami de Tom Sawyer (Circuito & LED Chato) 📖🎩💡",
          author: "Taller Maker 1° Grado",
          date: "Mayo 2026",
          type: "electronica",
          badge: "📖 Circuito & Marca-Libros Origami",
          icon: "fa-bookmark",
          color: "#D97706",
          coverImage: "img/proyectos/tomsawyer_marcalibro_cover.svg",
          description: "¡Nivel 3 de nuestra Ruta de Aventuras! Construimos un marca-libros esquinero en origami con una hoja de papel glacé doblada para calzar en la esquina de las páginas. Montamos un circuito ultraplano con cinta de cobre, pila botón y un diodo LED chato (SMD) colocado en el centro del gorro de Tom Sawyer. Al marcar la página y presionar con los dedos, ¡el gorro de Tom Sawyer se ilumina con una luz resplandeciente!",
          objective: "Aprender el plegado geométrico de origami de un marca-libros esquinero usando una hoja de papel glacé e integrar un circuito eléctrico delgado con cinta de cobre conductora, pila botón CR2032 y un LED chato en el gorro de Tom Sawyer con un interruptor por presión táctil.",
          benefits: "Desarrolla la destreza motriz fina y precisión espacial mediante el origami, introduce la comprensión de circuitos delgados y componentes electrónicos planos (LED chato SMD), fomenta el hábito de la lectura con una creación propia y refuerza el principio de causa-efecto con interruptores de presión.",
          tags: ["Marca-Libros", "Origami", "Tom Sawyer", "LED Chato", "Papel Glacé", "Electrónica", "Circuito", "Sin programación", "Maker", "Nivel 3"],
          gallery: [
            "img/proyectos/tomsawyer_marcalibro_cover.svg",
            "img/proyectos/marcalibros_origami_guia.png"
          ],
          pdfUrl: null,
          downloadPdfUrl: null,
          makecodeUrl: null,
          scratchId: null,
          materials: [
            { title: "1 Hoja cuadrada de papel glacé", description: "Base para el plegado de origami (10x10 cm o 15x15 cm) que formará la funda esquinera.", icon: "fa-scroll" },
            { title: "1 Diodo LED chato (SMD / plano)", description: "Luz ultraplana montada en el centro del gorro de Tom Sawyer.", icon: "fa-lightbulb" },
            { title: "Cinta de cobre conductora autoadhesiva", description: "Pistas delgadas que transportan la electricidad desde la pila al LED chato.", icon: "fa-tape" },
            { title: "1 Pila botón CR2032 (3V)", description: "Fuente de alimentación compacta alojada en la solapa interior.", icon: "fa-battery-full" },
            { title: "Gorro y rostro de Tom Sawyer", description: "Ilustración de Tom Sawyer con su sombrero de paja para decorar la solapa.", icon: "fa-hat-cowboy" },
            { title: "Marcadores y pegamento en barra", description: "Para personalizar la carita, pecas y fijar el personaje.", icon: "fa-paint-brush" }
          ],
          instructions: [
            {
              step: 1,
              title: "Plegar el papel glacé en triángulo",
              desc: "Colocá la hoja cuadrada de papel glacé sobre la mesa con el color hacia abajo. Doblala por la mitad uniendo dos esquinas opuestas para formar un triángulo grande.",
              tip: "Marcá bien el pliegue central pasando la uña con firmeza sobre la mesa."
            },
            {
              step: 2,
              title: "Doblar las puntas laterales hacia la base",
              desc: "Tomá la punta derecha del triángulo y doblala hacia la punta inferior central. Hacé lo mismo con la punta izquierda para formar un rombo perfecto.",
              tip: "Asegurate de que las dos puntas se unan en el centro sin encimarse."
            },
            {
              step: 3,
              title: "Crear la solapa y el bolsillo interior",
              desc: "Desplegá las puntas laterales hacia arriba. Tomá solo la primera capa de la punta superior y doblala hacia abajo hasta tocar la base, formando un bolsillo triangular.",
              tip: "Este bolsillo será la funda que calza en la esquina de las hojas del libro."
            },
            {
              step: 4,
              title: "Introducir las puntas dentro del bolsillo",
              desc: "Doblá nuevamente las puntas derecha e izquierda y metelas hacia adentro del bolsillo. ¡Tu marca-libros esquinero de origami ya está estructurado!",
              tip: "Probá calzarlo en la esquina de una hoja de tu cuaderno para comprobar que deslice con suavidad."
            },
            {
              step: 5,
              title: "Trazar las pistas de cobre y conectar el LED chato",
              desc: "Pegá una tira de cinta de cobre desde la solapa donde irá la pila hasta la posición del LED chato. Conectá el LED chato asegurando que el polo positivo (+) toque la pista positiva.",
              tip: "El LED chato (SMD) tiene un perfil extraplano ideal para no abultar las páginas del libro."
            },
            {
              step: 6,
              title: "Pegar a Tom Sawyer y probar el interruptor por presión",
              desc: "Pegá la ilustración de Tom Sawyer en el frente, haciendo coincidir el LED chato exactamente en el centro de su gorro. Colocá la pila en la solapa: al apretar con los dedos, ¡el gorro se ilumina!",
              tip: "¡Calzalo en tu libro favorito! Cada vez que marques una página y presiones, la luz del sombrero de Tom Sawyer te indicará la lectura."
            }
          ]
        },
        {
          id: "g1-p4",
          level: 4,
          title: "Cancha de Fútbol con Figuras Geométricas en Paint ⚽🎨",
          author: "Taller de Programación 1° Grado",
          date: "Junio 2026",
          type: "paint",
          badge: "🎨 Arte Digital & Geometría",
          icon: "fa-palette",
          color: "#16A34A",
          coverImage: "img/proyectos/cancha_futbol_paint_cover.png",
          description: "¡Nivel 4 de nuestra Ruta de Aventuras! Aprendemos a usar las herramientas de figuras geométricas en Paint (rectángulos para el césped y los arcos, líneas rectas para dividir el campo y círculos con Shift para el centro) y el bote de pintura para colorear nuestro estadio.",
          objective: "Aprender a descomponer y dibujar una cancha de fútbol completa en Paint utilizando figuras geométricas básicas y rellenar con color respetando los límites de cada figura cerrada.",
          benefits: "Desarrolla la coordinación viso-motora con el mouse, introduce proporciones espaciales, simetría y precisión gráfica en entornos digitales.",
          tags: ["Paint", "Arte Digital", "Geometría", "Cancha de Fútbol", "Rectángulos", "Círculos", "Nivel 4"],
          gallery: [
            "img/proyectos/cancha_futbol_paint_cover.png",
            "img/proyectos/cancha_futbol_paint_guia.png"
          ],
          pdfUrl: null,
          downloadPdfUrl: null,
          makecodeUrl: null,
          scratchId: null,
          materials: [
            { title: "Programa Paint", description: "Lienzo digital de dibujo en Windows.", icon: "fa-paint-brush" },
            { title: "Herramienta Rectángulo", description: "Para el perímetro de la cancha, césped y arcos.", icon: "fa-vector-square" },
            { title: "Herramienta Línea", description: "Para trazar la línea del medio campo.", icon: "fa-slash" },
            { title: "Herramienta Círculo (Elipse)", description: "Para el círculo central y la pelota con Shift.", icon: "fa-circle" },
            { title: "Bote de Pintura", description: "Para rellenar con verde césped y blanco.", icon: "fa-fill-drip" },
            { title: "Mouse de Computadora", description: "Para ejercitar la motricidad fina y precisión.", icon: "fa-mouse-pointer" }
          ],
          instructions: [
            {
              step: 1,
              title: "Abrir Paint y Crear el Lienzo",
              desc: "Abrí Paint. Asegurate de tener una hoja blanca amplia para dibujar tu cancha.",
              tip: "Maximizá la ventana para tener todo el espacio disponible."
            },
            {
              step: 2,
              title: "Trazar el Rectángulo del Césped",
              desc: "Seleccioná la herramienta Rectángulo, elegí color verde oscuro y arrastrá para cubrir la mayor parte de la pantalla.",
              tip: "Usá el Bote de Pintura para rellenar el fondo con verde césped."
            },
            {
              step: 3,
              title: "Dibujar las Líneas de la Cancha y el Medio Campo",
              desc: "Con color blanco y la herramienta Rectángulo trazá el perímetro interior. Luego usá la herramienta Línea para dividir la cancha en dos mitades exactas.",
              tip: "Mantené presionada la tecla Shift mientras arrastrás la línea para que quede perfectamente derecha."
            },
            {
              step: 4,
              title: "Círculo Central con Shift",
              desc: "Seleccioná la herramienta Elipse (círculo) con color blanco. Mantené pulsada la tecla Shift y arrastrá en el centro de la cancha.",
              tip: "¡La tecla Shift es mágica! Hace que el óvalo se convierta en un círculo redondo perfecto."
            },
            {
              step: 5,
              title: "Dibujar los Arcos y la Pelota",
              desc: "Trazá rectángulos pequeños a la izquierda y derecha para las áreas de gol. Agregá un pequeño círculo blanco y negro para la pelota de fútbol.",
              tip: "Si una línea sale torcida, ¡apretá Ctrl + Z para deshacer y volver a intentar!"
            },
            {
              step: 6,
              title: "Guardar tu Dibujo y Subirlo a Drive",
              desc: "Andá a 'Archivo' > 'Guardar como' > 'Imagen PNG' con el nombre 'mi_cancha.png'. ¡Arrastralo a la pestaña 'Mi Entrega' para ganar +100 XP!",
              tip: "¡Tus profesores y compañeros van a poder ver tu cancha en tu carpeta de Google Drive!"
            }
          ]
        },
        {
          id: "g1-p5",
          level: 5,
          title: "Tarjeta Pop-Up 3D: Corazón Luminoso para Mamá 💖✨",
          author: "Taller Maker 1° Grado",
          date: "Mayo 2026",
          type: "electronica",
          badge: "💖 Circuito & Tarjeta Pop-Up 3D",
          icon: "fa-heart",
          color: "#E11D48",
          coverImage: "img/proyectos/dia_madre_tarjeta_3d_cover.png",
          description: "¡Nivel 5 de nuestra Ruta de Aventuras! Creamos un regalo inolvidable en Papertronics: una tarjeta plegable donde al abrirse se despliega un corazón pixel 3D en relieve con la foto del alumno en el centro. Al presionar el escudo del Colegio Paulo Freire, se activa un interruptor secreto con cinta de cobre que enciende una luz LED bañando los bordes del corazón con un resplandor mágico.",
          objective: "Construir una tarjeta interactiva pop-up con relieve tridimensional y circuito eléctrico de cinta de cobre, pila botón CR2032 y diodo LED de alto brillo activado mediante un pulsador oculto detrás del escudo del Colegio Paulo Freire.",
          benefits: "Integra motricidad fina y precisión de corte en papel con conceptos de electrónica básica aplicada, refuerza el sentido de pertenencia y afectividad familiar a través de la tecnología tangible maker.",
          tags: ["Día de la Madre", "Papertronics", "Tarjeta Pop-Up", "Circuito", "LED", "Electrónica", "Maker", "Nivel 5"],
          gallery: [
            "img/proyectos/dia_madre_tarjeta_3d_cover.png",
            "img/proyectos/dia_madre_circuito_plantilla.png"
          ],
          pdfUrl: "docs/dia_de_la_madre_tarjeta_3d.pdf",
          downloadPdfUrl: "docs/dia_de_la_madre_tarjeta_3d.pdf",
          makecodeUrl: null,
          scratchId: null,
          materials: [
            { title: "Plantilla Oficial de la Tarjeta Pop-Up", description: "Lámina prediseñada con el corazón pixel 3D, líneas de corte y plegado.", icon: "fa-file-alt" },
            { title: "Foto del Alumno/a", description: "Fotografía retrato para montar en el centro del corazón.", icon: "fa-portrait" },
            { title: "1 Diodo LED de alto brillo", description: "Emite luz bañando los bordes del corazón 3D.", icon: "fa-lightbulb" },
            { title: "Cinta de cobre conductora", description: "Pistas metálicas que conectan la pila y el LED sin soldadura.", icon: "fa-tape" },
            { title: "1 Pila botón CR2032 (3V)", description: "Fuente de energía segura montada en la solapa interna.", icon: "fa-battery-full" },
            { title: "Pulsador Escudo Paulo Freire", description: "Botón secreto que cierra el circuito al presionar con el dedo.", icon: "fa-shield-alt" },
            { title: "Tijera y pegamento en barra", description: "Para recortar las líneas sólidas y plegar las solapas 3D.", icon: "fa-cut" }
          ],
          instructions: [
            {
              step: 1,
              title: "Recortar las líneas sólidas del corazón pixel",
              desc: "Con tijera, recortá ÚNICAMENTE las líneas continuas de los escalones del corazón. ¡Cuidado! Las líneas de puntos NO se cortan: son para doblar.",
              tip: "Cortá despacio con la punta de la tijera para que los bordes queden prolijos."
            },
            {
              step: 2,
              title: "Plegar el relieve pop-up hacia adelante",
              desc: "Empujá con los dedos el corazón hacia el interior de la tarjeta doblando por las líneas de puntos. Al cerrar y abrir la tarjeta en 90°, el corazón debe saltar hacia el frente.",
              tip: "Marcá bien los pliegues con la uña para que el mecanismo abra con fuerza."
            },
            {
              step: 3,
              title: "Pegar la foto en el centro del corazón",
              desc: "Pegá tu foto centrada dentro del corazón pixel con pegamento en barra.",
              tip: "¡El rostro debe quedar justo en el medio para que mamá lo vea al abrir la tarjeta!"
            },
            {
              step: 4,
              title: "Pegar las pistas de cinta de cobre",
              desc: "Pegá la cinta de cobre desde la solapa de la pila hasta la posición del LED y hacia el botón del escudo del colegio.",
              tip: "Dejá un pequeño espacio abierto en el escudo: ese será nuestro interruptor secreto."
            },
            {
              step: 5,
              title: "Conectar el LED y la pila botón CR2032",
              desc: "Fijá las patitas del LED sobre las pistas de cobre (patita larga = positivo +, patita corta = negativo -). Colocá la pila en su solapa.",
              tip: "Aplastá bien con la uña sobre las patitas del LED para asegurar buen contacto."
            },
            {
              step: 6,
              title: "Montar el pulsador del Escudo Freire",
              desc: "Pegá el escudo del Colegio Paulo Freire sobre la solapa del interruptor. Al presionar con el dedo sobre el escudo, las cintas de cobre se tocan y encienden la luz.",
              tip: "¡Presioná el escudo y mirá cómo resplandece el corazón! Lista para regalar con amor a mamá."
            }
          ]
        },
        {
          id: "g1-p6",
          level: 6,
          title: "Ana y Elsa (Frozen): Geometría en el Hielo ❄️⛸️",
          author: "Taller de Programación 1° Grado",
          date: "Junio 2026",
          type: "codeorg",
          platform: "codeorg",
          badge: "❄️ Código & Geometría",
          icon: "fa-snowflake",
          color: "#0284C7",
          coverImage: "img/frozen.png",
          gameUrl: "https://studio.code.org/s/frozen/lessons/1/levels/1",
          externalUrl: "https://studio.code.org/s/frozen/lessons/1/levels/1",
          description: "¡Nivel 6 de nuestra Ruta de Aventuras! Conectamos el dibujo geométrico de Paint con el pensamiento algorítmico: programamos a Elsa y Ana para patinar sobre el hielo trazando líneas rectas, esquinas con giros en ángulo recto (90°), cuadrados completos y copos de nieve mágicos utilizando bucles de repetición.",
          objective: "Comprender la relación entre figuras geométricas y algoritmos secuenciales guiando a Elsa y Ana en Code.org para trazar figuras con comandos de avanzar y girar en ángulos de 90° y 60°, introduciendo el concepto de bucles para automatizar repeticiones.",
          benefits: "Transfiere la noción gráfica de Paint hacia la programación algorítmica, introduce el razonamiento de ángulos y lateralidad en 360°, desarrolla la comprensión temprana de bucles y refuerza la capacidad de anticipar trazos en el espacio.",
          tags: ["Frozen", "Code.org", "Geometría", "Ángulos", "Bucles", "Algoritmos", "Nivel 6"],
          gallery: [
            "img/frozen.png"
          ],
          pdfUrl: null,
          downloadPdfUrl: null,
          makecodeUrl: null,
          scratchId: null,
          materials: [
            { title: "Desafío Code.org Frozen (Geometría en el Hielo)", description: "Entorno interactivo online (https://studio.code.org/s/frozen/lessons/1/levels/1).", icon: "fa-snowflake" },
            { title: "Bloque 'Avanzar'", description: "Hace patinar a Elsa trazando una línea recta de 100 píxeles.", icon: "fa-arrows-alt-v" },
            { title: "Bloque 'Girar a la Derecha 90°'", description: "Crea una esquina en ángulo recto exacta para figuras cuadradas.", icon: "fa-redo" },
            { title: "Bloque 'Repetir'", description: "Automatiza la repetición de lados sin tener que repetir bloques manualmente.", icon: "fa-sync-alt" }
          ],
          instructions: [
            {
              step: 1,
              title: "Trazar una Línea Recta (El lado de la figura)",
              desc: "Encastrá el bloque azul 'avanzar 100 píxeles' debajo de 'al ejecutar'. Tocá Ejecutar para ver cómo Elsa patina y dibuja una línea sobre el hielo.",
              tip: "Cada línea recta es uno de los lados de la figura geométrica que vas a armar."
            },
            {
              step: 2,
              title: "Girar en Ángulo Recto de 90 Grados",
              desc: "Para doblar la esquina, agregá el bloque 'girar a la derecha 90 grados' y luego otro bloque 'avanzar 100 píxeles'.",
              tip: "90 grados es una esquina perfecta, igual a la esquina de una hoja o de los arcos de fútbol en Paint."
            },
            {
              step: 3,
              title: "Cerrar el Cuadrado con un Bucle",
              desc: "En lugar de encastrar 8 bloques seguidos, colocá el bloque rosa 'repetir 4 veces' y meté adentro un 'avanzar' y un 'girar a la derecha'.",
              tip: "¡Elsa repetirá la orden 4 veces automáticamente hasta cerrar el cuadrado!"
            },
            {
              step: 4,
              title: "Copos de Nieve y Figuras Mágicas",
              desc: "A medida que avanzás de nivel, cambiá los giros a 60 grados para crear hexágonos, cruces y copos de nieve deslumbrantes.",
              tip: "¡Al terminar los niveles tocá '¡Completé el Reto de Frozen en Code.org!' para sumar tus +100 XP!"
            }
          ]
        },
        {
          id: "g1-p7",
          level: 7,
          title: "Banderas del Mundial con Figuras Geométricas en Paint 🇺🇾🎨",
          author: "Taller de Programación 1° Grado",
          date: "Julio 2026",
          type: "paint",
          badge: "🎨 Arte Digital & Banderas",
          icon: "fa-flag",
          color: "#2563EB",
          coverImage: "img/proyectos/banderas_mundial_paint_cover.png",
          description: "¡Nivel 7 de nuestra Ruta de Aventuras! En este proyecto usamos Paint para diseñar las banderas de los países del mundial combinando figuras geométricas básicas: rectángulos para el perímetro y las franjas (horizontales o verticales), círculos y estrellas para los soles y emblemas patrios, y el bote de pintura para colorear con los tonos oficiales. ¡Subí tu dibujo para ganar +100 XP!",
          objective: "Aprender a descomponer y dibujar banderas del mundial en Paint utilizando figuras geométricas básicas (rectángulos para franjas, círculos y estrellas para detalles) y rellenar con color respetando los límites de cada figura cerrada.",
          benefits: "Fortalece la coordinación motriz fina con el mouse, introduce nociones de fraccionamiento espacial y proporciones (dividir un lienzo en dos mitades o tres tercios iguales), ejercita la simetría y amplía el conocimiento cultural y geográfico del mundo.",
          tags: ["Paint", "Arte Digital", "Banderas", "Mundial", "Figuras Geométricas", "Colores", "Nivel 7"],
          gallery: [
            "img/proyectos/banderas_mundial_paint_cover.png",
            "img/proyectos/banderas_mundial_paint_guia.png"
          ],
          pdfUrl: null,
          downloadPdfUrl: null,
          makecodeUrl: null,
          scratchId: null,
          gameUrl: null,
          externalUrl: null,
          materials: [
            { title: "Programa Paint / Lienzo Digital", description: "Espacio de trabajo digital para dibujar con herramientas gráficas.", icon: "fa-paint-brush" },
            { title: "Herramienta Rectángulo", description: "Para el marco exterior de la bandera y las franjas de colores.", icon: "fa-vector-square" },
            { title: "Herramienta Línea Recta", description: "Para dividir las banderas en franjas horizontales o verticales.", icon: "fa-slash" },
            { title: "Herramientas Círculo y Formas", description: "Para dibujar el Sol de Mayo (Uruguay/Argentina), rombos (Brasil) y estrellas.", icon: "fa-circle" },
            { title: "Bote de Pintura (Relleno)", description: "Para pintar cada franja con los colores patrios oficiales sin derramar pintura.", icon: "fa-fill-drip" },
            { title: "Mouse o Pantalla Táctil", description: "Para ejercitar precisión y motricidad fina al arrastrar figuras.", icon: "fa-mouse-pointer" }
          ],
          instructions: [
            {
              step: 1,
              title: "Trazar el rectángulo exterior de la bandera",
              desc: "Abrí Paint. Seleccioná la herramienta Rectángulo con color negro o gris oscuro. Hacé clic arriba a la izquierda y arrastrá para armar el lienzo de tu bandera.",
              tip: "Mantené un tamaño amplio en la pantalla para tener espacio cómodo donde colocar las franjas."
            },
            {
              step: 2,
              title: "Dividir en franjas (Horizontales o Verticales)",
              desc: "Elegí la bandera que querés dibujar: si es como Uruguay o Argentina, dividí el rectángulo con franjas horizontales; si es como Francia o Italia, usá franjas verticales.",
              tip: "Usá la herramienta Rectángulo o Línea asegurándote de tocar los dos bordes para que no queden huecos abiertos."
            },
            {
              step: 3,
              title: "Agregar figuras y símbolos centrales",
              desc: "Seleccioná la herramienta Círculo (Elipse) para dibujar el sol (Uruguay / Argentina) o la forma de Rombo para la bandera de Brasil.",
              tip: "Mantené pulsada la tecla Shift mientras arrastrás para que el círculo salga redondito perfecto."
            },
            {
              step: 4,
              title: "Colorear con el Bote de Pintura",
              desc: "Seleccioná el Bote de Pintura, elegí los colores en la paleta (azul, celeste, amarillo, verde, rojo) y hacé clic dentro de cada franja para rellenarla.",
              tip: "Si se pinta toda la pantalla de un solo color, ¡apretá Ctrl + Z de inmediato! Significa que había un pequeño espacio abierto en la línea."
            },
            {
              step: 5,
              title: "Dibujar más banderas de tus países favoritos",
              desc: "Al lado de tu primera bandera podés dibujar otra de tus selecciones favoritas del mundial para armar tu propia colección digital de banderas.",
              tip: "¡Probá una fácil con 2 o 3 franjas y luego desafiate con una que tenga sol o estrellas!"
            },
            {
              step: 6,
              title: "Guardar tu dibujo y subirlo a Drive",
              desc: "Andá a 'Archivo' > 'Guardar como' > 'Imagen PNG' y guardalo con el nombre 'banderas_mundial.png'. ¡Arrastralo a la pestaña 'Mi Entrega' para sumar +100 XP!",
              tip: "¡Tus profesores y compañeros van a poder ver tu lámina de banderas en tu carpeta de Google Drive!"
            }
          ]
        },
        {
          id: "g1-p8",
          level: 8,
          title: "Minecraft: Hora del Código (Aprender a Programar) ⛏️🧱",
          author: "Taller de Programación 1° Grado",
          date: "Septiembre 2026",
          type: "codeorg",
          platform: "codeorg",
          badge: "⛏️ Código & Minecraft",
          icon: "fa-cube",
          color: "#059669",
          coverImage: "img/minecraft.png",
          gameUrl: "https://studio.code.org/s/mc/lessons/1/levels/1",
          externalUrl: "https://studio.code.org/s/mc/lessons/1/levels/1",
          description: "¡Nivel 8 de nuestra Ruta de Aventuras! ⚠️ ACLARACIÓN IMPORTANTE: No es el juego tradicional de Minecraft comercial (supervivencia o modo libre con joystick), sino una adaptación pedagógica oficial de Code.org para aprender a programar desde el juego. Steve y Alex no se mueven solos; ¡vos los controlás encastrando bloques de código para que caminen, talen árboles, esquilen ovejas y construyan!",
          objective: "Aprender los fundamentos del pensamiento computacional resolviendo los desafíos de la adaptación oficial de Minecraft en Code.org: programar secuencias algorítmicas, interactuar con el entorno 3D (destruir bloques, esquilar, colocar) y optimizar instrucciones con bucles de repetición.",
          benefits: "Canaliza el gran entusiasmo por Minecraft hacia el aprendizaje activo de las ciencias de la computación: transforma a los niños de jugadores pasivos a creadores de código, desarrolla la orientación espacial isométrica, ejercita la descomposición de problemas y la lógica de bucles tempranos.",
          tags: ["Minecraft", "Code.org", "Steve", "Alex", "Algoritmos", "Hora del Código", "Nivel 8"],
          gallery: [
            "img/minecraft.png"
          ],
          pdfUrl: null,
          downloadPdfUrl: null,
          makecodeUrl: null,
          scratchId: null,
          materials: [
            { title: "Adaptación Educativa Code.org Minecraft", description: "Módulos interactivos oficiales de la Hora del Código (https://studio.code.org/s/mc/lessons/1/levels/1).", icon: "fa-cube" },
            { title: "Bloques de Desplazamiento", description: "Comandos 'avanzar', 'girar a la derecha' y 'girar a la izquierda'.", icon: "fa-arrows-alt" },
            { title: "Bloques de Acción", description: "Comandos 'destruir bloque', 'trasquilar oveja', 'colocar tablones'.", icon: "fa-hammer" },
            { title: "Bloque 'Repetir' (Bucles)", description: "Para que Steve o Alex repitan acciones sin llenar la pantalla de bloques.", icon: "fa-sync-alt" }
          ],
          instructions: [
            {
              step: 1,
              title: "Elegir tu personaje: ¿Steve o Alex?",
              desc: "Al ingresar a la actividad en Code.org podés elegir si querés jugar como Steve o como Alex para iniciar tu aventura de programación.",
              tip: "Recordá: ¡aquí no usamos teclado para movernos! Solo avanzamos cuando colocamos bloques de programación."
            },
            {
              step: 2,
              title: "Llegar hasta la oveja",
              desc: "Mirá cuántos pasos faltan para alcanzar la oveja y encastrá los bloques 'avanzar'. Tocá 'Ejecutar' para comprobar que tu personaje llegue a su destino.",
              tip: "Contá los casilleros en la cuadrícula de tierra para saber cuántos bloques colocar."
            },
            {
              step: 3,
              title: "Talar el primer árbol",
              desc: "Colocá bloques de avanzar hasta el tronco del árbol y luego sumá el bloque 'destruir bloque' para recolectar madera.",
              tip: "¡Así se combinan órdenes de movimiento con acciones de trabajo en programación!"
            },
            {
              step: 4,
              title: "Esquilar ovejas y construir",
              desc: "Usá el comando 'trasquilar' para conseguir lana y construir una cama antes de que anochezca en el mundo de bloques.",
              tip: "Revisá que Steve mire exactamente en la dirección de la oveja antes de esquilarla."
            },
            {
              step: 5,
              title: "Optimizar con el bloque 'Repetir'",
              desc: "Cuando tengas que dar muchos pasos o talar varios bloques seguidos, usá el bloque rosa de repetición. ¡Ahorra tiempo y hace que tu código sea más limpio!",
              tip: "¡Los programadores profesionales siempre usan bucles para no repetir código innecesario!"
            },
            {
              step: 6,
              title: "¡Completar los desafíos y sumar tus +100 XP!",
              desc: "Superá los niveles de la Hora del Código y tocá el botón '¡Completé el Reto de Minecraft en Code.org!' en la plataforma para certificar tu entrega.",
              tip: "¡Felicitaciones! Has demostrado que dominás el pensamiento computacional con Minecraft."
            }
          ]
        },
        {
          id: "g1-p9",
          level: 9,
          title: "Escenarios CodeJr - Primera Parte: Ambiente y Velocidades 🐱⚡",
          author: "Taller de Programación 1° Grado",
          date: "Septiembre 2026",
          type: "scratch",
          platform: "codejr",
          badge: "🐱 Scratch Jr • Escenarios & Velocidad",
          icon: "fa-tachometer-alt",
          color: "#EA580C",
          coverImage: "img/scratchjr.png",
          projectFileUrl: "proyectos/velocidad.sjr",
          downloadUrl: "proyectos/velocidad.sjr",
          externalUrl: "https://codejr.org",
          description: "¡Nivel 9 de nuestra Ruta de Aventuras! En esta misión exploramos el ambiente de Scratch Jr: creación y selección de escenarios ilustrados (paisajes), agregado de personajes múltiples y programación de velocidades (lenta, media y rápida) con el bloque naranja de velocidad para armar carreras de personajes. Podés descargar el proyecto de ejemplo velocidad.sjr para abrirlo en Scratch Jr.",
          objective: "Explorar y dominar el ambiente de Scratch Jr: seleccionar escenarios, añadir personajes y programar algoritmos de movimiento con variación de velocidades (bloque naranja de control) para comparar ritmos de desplazamiento.",
          benefits: "Desarrolla la orientación en entornos gráficos de programación temprana, introduce la noción de parámetros y variables visuales (velocidad 1, 2 y 3), estimula la creatividad narrativa y el análisis comparativo de velocidad (tiempo y distancia).",
          tags: ["Scratch Jr", "CodeJr", "Escenarios", "Velocidad", "Carrera", "Bloques Naranjas", "Nivel 9"],
          gallery: [
            "img/scratchjr.png"
          ],
          pdfUrl: null,
          downloadPdfUrl: null,
          makecodeUrl: null,
          scratchId: null,
          materials: [
            { title: "Aplicación Scratch Jr", description: "Entorno visual de bloques en tablet o PC (https://codejr.org).", icon: "fa-cat" },
            { title: "Archivo de Ejemplo 'velocidad.sjr'", description: "Proyecto oficial descargable con carrera a diferentes velocidades.", icon: "fa-file-code" },
            { title: "Bloque Amarillo 'Bandera Verde'", description: "Comando de inicio para poner en marcha a los personajes simultáneamente.", icon: "fa-flag" },
            { title: "Bloque Naranja de 'Velocidad'", description: "Permite elegir entre 3 ritmos: Lento (caminar), Medio (trotar) o Rápido (correr).", icon: "fa-tachometer-alt" },
            { title: "Bloques Azules de 'Movimiento'", description: "Comandos de flechas para avanzar casilleros hacia adelante en el escenario.", icon: "fa-arrows-alt-h" }
          ],
          instructions: [
            {
              step: 1,
              title: "Explorar el Ambiente de Scratch Jr",
              desc: "Abrí Scratch Jr tocando la casita. Observá el escenario central, la columna izquierda donde se agregan personajes y la columna derecha con los escenarios/fondos.",
              tip: "Tocá el botón del paisaje arriba para elegir un fondo divertido (parque, luna, cancha o bosque)."
            },
            {
              step: 2,
              title: "Elegir personajes para una carrera",
              desc: "Tocá el botón '+' a la izquierda para sumar otro personaje al escenario. Por ejemplo, al gato Scratch Jr y a un amigo para que compitan a diferentes velocidades.",
              tip: "Arrastrá los personajes con el dedo o mouse al borde izquierdo del escenario listos para la largada."
            },
            {
              step: 3,
              title: "Conectar la Bandera Verde de inicio",
              desc: "Andá a la categoría amarilla (Disparadores) y arrastrá el bloque de la 'Bandera Verde' al área de programación.",
              tip: "Al tocar la bandera verde grande de arriba, ¡todos los personajes arrancarán al mismo tiempo!"
            },
            {
              step: 4,
              title: "Programar la Velocidad con el Bloque Naranja",
              desc: "Andá a la categoría naranja (Control) y arrastrá el bloque de 'Velocidad'. Tocalo para elegir una de las 3 velocidades: 1 (Lento), 2 (Medio) o 3 (Rápido).",
              tip: "El ícono del caracol/hombre caminando es lento; la persona trotando es velocidad media; y la persona corriendo o auto es súper rápido."
            },
            {
              step: 5,
              title: "Agregar bloques de movimiento hacia adelante",
              desc: "Andá a la categoría azul (Movimiento) y encastrá una flecha hacia la derecha con el número de pasos deseado (por ejemplo, 10 pasos).",
              tip: "Poné a un personaje en velocidad 1 y al otro en velocidad 3 para ver claramente la diferencia de velocidad en la carrera."
            },
            {
              step: 6,
              title: "¡Tocar la Bandera Verde y disfrutar!",
              desc: "Tocá la bandera verde arriba a la derecha. Mirá cómo cada personaje recorre el escenario con su propio ritmo programado. ¡Subí tu proyecto o foto para sumar +100 XP!",
              tip: "Podés descargar el archivo velocidad.sjr desde el botón de la misión para ver el ejemplo completo."
            }
          ]
        },
        {
          id: "g1-p10",
          level: 10,
          title: "Escenarios CodeJr - Segunda Parte: Cambiar la Perspectiva de las Figuras 🐱🔍",
          author: "Taller de Programación 1° Grado",
          date: "Septiembre 2026",
          type: "scratch",
          platform: "codejr",
          badge: "🐱 Scratch Jr • Escenarios & Perspectiva",
          icon: "fa-search-plus",
          color: "#7C3AED",
          coverImage: "img/scratchjr.png",
          projectFileUrl: "proyectos/perpestiva.sjr",
          downloadUrl: "proyectos/perpestiva.sjr",
          externalUrl: "https://codejr.org",
          description: "¡Nivel 10 de nuestra Ruta de Aventuras! En esta segunda parte aprendemos a cambiar la perspectiva visual y el tamaño de las figuras en Scratch Jr. Descubrimos cómo crear la ilusión óptica de profundidad 3D en un escenario 2D: enviamos al personaje Teen3 al fondo del camino haciéndolo pequeño con el bloque violeta de achicar (5 veces), y a medida que desciende por el sendero hacia nosotros, lo agrandamos progresivamente para simular que camina hacia el frente. Descargá el proyecto de ejemplo perpestiva.sjr para abrirlo en Scratch Jr.",
          objective: "Comprender y programar la perspectiva visual y profundidad en Scratch Jr utilizando los bloques violetas de apariencia (achicar para alejar, agrandar para acercar y restaurar tamaño estándar) combinados con movimientos en el escenario para simular que un personaje avanza hacia el observador.",
          benefits: "Desarrolla la percepción espacial tridimensional, la diferenciación conceptual de escala y distancia (lejos/pequeño vs. cerca/grande), la estructuración de algoritmos con cambio de apariencia secuencial, la abstracción visual y la creatividad en animación digital.",
          tags: ["Scratch Jr", "CodeJr", "Perspectiva", "Profundidad", "Escenarios", "Apariencia", "Bloques Violetas", "Nivel 10"],
          gallery: [
            "img/scratchjr.png"
          ],
          pdfUrl: null,
          downloadPdfUrl: null,
          makecodeUrl: null,
          scratchId: null,
          materials: [
            { title: "Aplicación Scratch Jr", description: "Entorno visual de programación en tablets o PC (https://codejr.org).", icon: "fa-cat" },
            { title: "Archivo de Ejemplo 'perpestiva.sjr'", description: "Proyecto oficial con Teen3 caminando en perspectiva por el sendero del bosque.", icon: "fa-file-code" },
            { title: "Bloque Amarillo 'Bandera Verde'", description: "Comando de inicio para disparar la animación de perspectiva.", icon: "fa-flag" },
            { title: "Bloque Azul 'Ir al Inicio' (Home)", description: "Devuelve al personaje a su posición inicial en la parte superior del camino.", icon: "fa-home" },
            { title: "Bloque Violeta 'Restaurar Tamaño'", description: "Reinicia la escala del personaje a su tamaño normal estándar (100%).", icon: "fa-sync-alt" },
            { title: "Bloques Violetas 'Achicar' y 'Agrandar'", description: "Permiten simular distancia (achicar 5) y acercamiento hacia la pantalla (agrandar 2).", icon: "fa-expand-arrows-alt" },
            { title: "Bloques Azules 'Bajar' (Movimiento)", description: "Hacen descender al personaje por el camino hacia el primer plano.", icon: "fa-arrow-down" }
          ],
          instructions: [
            {
              step: 1,
              title: "Abrir Scratch Jr y Elegir un Fondo con Camino",
              desc: "Abrí Scratch Jr y tocá el botón del paisaje arriba. Elegí un escenario que tenga profundidad, como un camino, bosque o sendero (por ejemplo el fondo del bosque).",
              tip: "Los fondos con un sendero que va desde el horizonte hacia el frente son ideales para practicar perspectiva."
            },
            {
              step: 2,
              title: "Seleccionar el Personaje y Ubicarlo al Fondo",
              desc: "Seleccioná al personaje (por ejemplo Teen3 o el gato) y arrastralo con el dedo o mouse a la parte superior del camino, donde empieza el sendero.",
              tip: "Ese punto será el inicio de su viaje hacia adelante."
            },
            {
              step: 3,
              title: "Poner Bandera Verde, Volver a Casa y Restaurar Tamaño",
              desc: "Iniciá tu programa con el bloque amarillo de 'Bandera Verde'. Luego encastrá el bloque azul de 'Volver al Inicio' (casa) y el bloque violeta de 'Restaurar Tamaño' (personita con círculo).",
              tip: "Esto asegura que cada vez que toques la bandera verde, el personaje arranque en el lugar exacto y con tamaño normal."
            },
            {
              step: 4,
              title: "Achicar al Personaje para Mandarlo Lejos (Perspectiva)",
              desc: "Encastrá el bloque violeta de 'Achicar' (personita con flechas hacia adentro) y escribí el número 5.",
              tip: "¡El personaje se volverá diminuto, simulando que está parado en el horizonte lejano!"
            },
            {
              step: 5,
              title: "Combinar 'Bajar' y 'Agrandar' Progresivamente",
              desc: "Encastrá bloques de 'Bajar 2' combinados con 'Agrandar 2'. Repetí la secuencia hasta que el personaje llegue al frente de la pantalla.",
              tip: "A medida que baja por el camino, el bloque violeta lo agranda creando la sensación de que avanza hacia vos."
            },
            {
              step: 6,
              title: "¡Tocar la Bandera Verde y Probar!",
              desc: "Tocá la bandera verde arriba a la derecha. Mirá cómo tu personaje aparece a lo lejos y camina hacia vos haciéndose cada vez más grande. ¡Subí tu proyecto o foto para sumar +100 XP!",
              tip: "Podés descargar el archivo perpestiva.sjr desde el botón de la misión para ver el ejemplo completo funcionando."
            }
          ]
        }
      ]
    },

    /* ===================================================
       2° GRADO
    =================================================== */
    {
      id: "grado2",
      name: "2° Grado",
      shortName: "2° Grado",
      icon: "✏️",
      color: "#6A1B9A",
      colorLight: "#F3E5F5",
      colorBorder: "#9C27B0",
      description: "Maquetas de cartón y cuentos interactivos: exploramos luces LED, circuitos básicos y animación en Scratch.",

      games: [
        {
          id: "g2-g1",
          title: "Gatito Atrapa Peces 🐟",
          platform: "scratch",
          scratchId: "60917032",
          thumbnail: "https://images.unsplash.com/photo-1425082661705-1834bfd09dca?auto=format&fit=crop&w=600&q=80",
          description: "El gatito buzo debe atrapar peces celestes para sumar puntos y esquivar los peces rojos peligrosos.",
          benefits: "Entrena la coordinación mano-ojo, la noción de variables de puntaje y el manejo de recompensas.",
          tags: ["Scratch", "Juego", "Puntos"]
        },
        {
          id: "g2-g2",
          title: "Fiesta de Baile Programada 🕺",
          platform: "codeorg",
          externalUrl: "https://studio.code.org/s/dance-2019/lessons/1/levels/1",
          thumbnail: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80",
          description: "Coreografías completas donde cada bailarín reacciona a los pulsos de la música con pasos diferentes.",
          benefits: "Enseña el concepto de 'Eventos' (hacer X cuando ocurre Y) y sincronización rítmica con la computadora.",
          tags: ["Code.org", "Eventos", "Música"]
        },
        {
          id: "g2-g3",
          title: "El Dragón y el Tesoro 🐉",
          platform: "scratch",
          scratchId: "10014517",
          thumbnail: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=600&q=80",
          description: "Cuento interactivo tipo 'elige tu propia aventura' donde las decisiones del lector cambian el final.",
          benefits: "Desarrolla el pensamiento condicional (Si... Entonces...), la toma de decisiones y la fluidez lectora.",
          tags: ["Scratch", "Cuento", "Condicionales"]
        }
      ],

      projects: [
        {
          id: "g2-p1",
          title: "Nuestros Juegos con Scratch 🎮",
          author: "Estudiantes 2° Grado",
          date: "Agosto 2026",
          coverImage: "https://images.unsplash.com/photo-1425082661705-1834bfd09dca?auto=format&fit=crop&w=600&q=80",
          description: "Cada alumno creó su propio mini-juego en Scratch con puntuaciones, vidas y condicionales para detectar colisiones.",
          tags: ["Scratch", "Juegos", "Variables"],
          gallery: [
            "https://images.unsplash.com/photo-1425082661705-1834bfd09dca?auto=format&fit=crop&w=600&q=80",
            "https://images.unsplash.com/photo-1474511320723-9a56873867b5?auto=format&fit=crop&w=600&q=80",
            "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=600&q=80"
          ],
          pdfUrl: null,
          makecodeUrl: null,
          scratchId: "60917032",
          materials: null
        },
        {
          id: "g2-p2",
          title: "Linterna Casera de Explorador 🔦",
          author: "Taller 2° Grado",
          date: "Octubre 2026",
          type: "electronica",
          coverImage: "img/microbit.png",
          description: "¡Circuito eléctrico portátil sin programación! Reciclamos un tubo de cartón para armar una linterna real con interruptor deslizante de broche mariposa y reflector de papel aluminio.",
          tags: ["Electrónica", "Sin programación", "Maker", "Interruptores"],
          gallery: ["img/microbit.png"],
          pdfUrl: null,
          makecodeUrl: null,
          scratchId: null,
          materials: [
            { title: "1 LED blanco de 10mm o alta luminosidad", description: "Foco principal de la linterna (patita larga = + ánodo)" },
            { title: "2 Pilas AA con portapilas (3V)", description: "Alimentación de larga duración segura para el taller" },
            { title: "1 Tubo de cartón de rollo de cocina", description: "Cuerpo cilíndrico de la linterna" },
            { title: "2 Broches mariposa metálicos y un clip", description: "Mecanismo del interruptor deslizante casero" },
            { title: "Papel de aluminio", description: "Reflector cónico para concentrar el haz de luz" }
          ],
          instructions: [
            {
              step: 1,
              title: "Construir el reflector de aluminio",
              desc: "Forramos el interior de un cono de cartulina con papel aluminio para concentrar la luz del LED hacia adelante.",
              tip: "La parte brillante del aluminio refleja más luz."
            },
            {
              step: 2,
              title: "Instalar el LED en el centro",
              desc: "Perforamos el fondo del cono e insertamos el LED, dejando las dos patitas metálicas largas hacia atrás.",
              tip: "Identificá la patita larga (+) antes de insertarlo."
            },
            {
              step: 3,
              title: "Armar el interruptor con broches",
              desc: "En el costado del tubo, colocamos dos broches mariposa separados por 1 cm. Enganchamos un clip en uno de ellos que pueda rotar para tocar el otro.",
              tip: "Cuando el clip toca ambos broches, se cierra el circuito."
            },
            {
              step: 4,
              title: "Conectar los cables del circuito",
              desc: "Conectamos el cable positivo (+) del portapilas al primer broche, del segundo broche a la patita larga (+) del LED, y el cable negativo (-) directo a la pata corta (-) del LED.",
              tip: "Aislá las uniones con cinta adhesiva para evitar cortos."
            },
            {
              step: 5,
              title: "Montar todo dentro del tubo",
              desc: "Insertamos las pilas y cables dentro del tubo de cartón y fijamos el reflector en la punta con cinta.",
              tip: "Asegurate de que las pilas no se muevan por dentro."
            },
            {
              step: 6,
              title: "¡Prueba en la oscuridad!",
              desc: "Deslizá el clip para tocar el broche: ¡tu linterna casera ilumina toda la habitación! Ideal para leer o explorar.",
              tip: "Podés colocar papel celofán de color adelante para tener luz roja o verde."
            }
          ]
        }
      ]
    },

    /* ===================================================
       3° GRADO
    =================================================== */
    {
      id: "grado3",
      name: "3° Grado",
      shortName: "3° Grado",
      icon: "🔢",
      color: "#2E7D32",
      colorLight: "#E8F5E9",
      colorBorder: "#4CAF50",
      description: "Inventos con BBC micro:bit y cartón: guitarras con cables cocodrilo, botones táctiles y MakeCode.",

      games: [
        {
          id: "g3-g1",
          title: "Super Salto: Plataformas 🎮",
          platform: "scratch",
          scratchId: "60917032",
          thumbnail: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80",
          description: "Juego de plataformas en 2 niveles con obstáculos móviles, recolección de monedas y sistema de 3 vidas.",
          benefits: "Enseña física aplicada básica (gravedad, saltos, rebote), control de variables y diseño estructurado de niveles.",
          tags: ["Scratch", "Plataformas", "Física"]
        },
        {
          id: "g3-g2",
          title: "Minecraft: Aventura con Código ⛏️",
          platform: "codeorg",
          externalUrl: "https://studio.code.org/s/aquatic/lessons/1/levels/1",
          thumbnail: "https://images.unsplash.com/photo-1627856013091-fed6e4e30025?auto=format&fit=crop&w=600&q=80",
          description: "Programá a Steve y Alex para explorar arrecifes, recolectar recursos y construir refugios con bucles.",
          benefits: "Desarrolla el pensamiento algorítmico y la descomposición de problemas en un entorno de juego sumamente motivador.",
          tags: ["Code.org", "Minecraft", "Bucles"]
        },
        {
          id: "g3-g3",
          title: "Make a Flappy Game 🐦",
          platform: "codeorg",
          externalUrl: "https://studio.code.org/flappy/1",
          thumbnail: "https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?auto=format&fit=crop&w=600&q=80",
          description: "Creá tu propia versión de Flappy Bird personalizando la gravedad, los obstáculos y las reglas del juego.",
          benefits: "Fomenta la creatividad al personalizar reglas de juego, la comprensión de gravedad simulada y la perseverancia.",
          tags: ["Code.org", "Flappy", "Reglas"]
        },
        {
          id: "g3-g4",
          title: "¿Sabés Programar? Trivia 🧠",
          platform: "native",
          gameEngine: "devQuiz",
          thumbnail: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80",
          description: "Desafío de preguntas sobre lógica, programación y Scratch con cronómetro y puntuación al instante.",
          benefits: "Consolida vocabulario técnico, refuerza la memoria de trabajo y ejercita el pensamiento crítico bajo tiempo.",
          tags: ["Trivia", "Lógica", "JavaScript"]
        }
      ],

      projects: [
        {
          id: "g3-p1",
          title: "Videojuego de Plataformas 🕹️",
          author: "Ignacio B. y Rodrigo M.",
          date: "Agosto 2026",
          coverImage: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80",
          description: "Videojuego completo de 2 niveles con animaciones, enemigos con movimiento autónomo, sistema de puntaje y vidas. Incluye el código reproducible de Scratch y galería fotográfica.",
          tags: ["Scratch", "Videojuego", "Trabajo en equipo"],
          gallery: [
            "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80",
            "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=600&q=80",
            "https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?auto=format&fit=crop&w=600&q=80"
          ],
          pdfUrl: null,
          makecodeUrl: null,
          scratchId: "60917032",
          materials: [
            {
              title: "Guía de Niveles y Diseño de Personajes",
              type: "Documento de Diseño",
              icon: "fas fa-pencil-ruler",
              description: "Bocetos y esquemas de los obstáculos y plataformas dibujados por los alumnos."
            }
          ]
        },
        {
          id: "g3-p2",
          title: "Pong Reinventado 🏓",
          author: "Lucas F.",
          date: "Agosto 2026",
          coverImage: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=600&q=80",
          description: "Recreación del clásico Pong con física de rebote en Scratch, velocidad progresiva y efectos sonoros.",
          tags: ["Scratch", "2 Jugadores", "Física"],
          gallery: [
            "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=600&q=80"
          ],
          pdfUrl: null,
          makecodeUrl: null,
          scratchId: "10128407",
          materials: null
        },
        {
          id: "g3-p3",
          title: "Esculturas con Plastilina Conductora (Squishy Circuits) ⚡",
          author: "Taller 3° Grado",
          date: "Septiembre 2026",
          type: "electronica",
          coverImage: "img/microbit.png",
          description: "¡Electrónica creativa sin pantallas ni programación! Modelamos figuras y criaturas usando plastilina casera de sal (conductora) y plastilina común (aislante). La masa hace de cable para encender ojos LED y hacer sonar zumbadores sin tocar un solo cable.",
          tags: ["Electrónica", "Sin programación", "Masa Conductora", "Creatividad"],
          gallery: ["img/microbit.png"],
          pdfUrl: null,
          makecodeUrl: null,
          scratchId: null,
          materials: [
            { title: "Plastilina conductora de sal (casera)", description: "Permite el paso de la corriente eléctrica a través de la masa" },
            { title: "Plastilina aislante (de modelar o con azúcar)", description: "Impide que los dos polos se toquen y hagan cortocircuito" },
            { title: "Portapilas 4xAA (6V) o pila 9V con broche", description: "Fuente de alimentación para el circuito" },
            { title: "LEDs gigantes de colores (10mm)", description: "Se clavan directo en la masa para iluminar la escultura" },
            { title: "Buzzer piezoeléctrico (opcional)", description: "Emite sonido al conectar a la masa conductora" }
          ],
          instructions: [
            {
              step: 1,
              title: "Preparar las dos masas",
              desc: "Amasamos dos rollos de masa conductora (sal) y un rollo de masa aislante (azúcar o plastilina común).",
              tip: "La masa conductora lleva sal y agua; la aislante no lleva sal."
            },
            {
              step: 2,
              title: "Crear la barrera aislante",
              desc: "Colocamos una capa de masa aislante entre los dos bloques de masa conductora para que no se toquen.",
              tip: "Si las dos masas conductoras se tocan, el LED no prenderá (cortocircuito)."
            },
            {
              step: 3,
              title: "Conectar los cables de la batería",
              desc: "Clavamos el cable rojo (+) en el bloque de masa izquierdo y el cable negro (-) en el bloque derecho.",
              tip: "Ahora cada bloque de masa tiene una polaridad diferente."
            },
            {
              step: 4,
              title: "Clavar el LED haciendo de puente",
              desc: "Abrimos las patitas del LED e insertamos la pata larga (+) en el bloque izquierdo y la corta (-) en el derecho.",
              tip: "El LED hace de puente físico cruzando la barrera aislante."
            },
            {
              step: 5,
              title: "¡Encendido de la escultura!",
              desc: "¡El LED se enciende inmediatamente a través de la masa! Podés agregar más LEDs y darle forma de dragón, nave espacial o criatura fantástica.",
              tip: "Podés clavar hasta 4 o 5 LEDs en paralelo a lo largo de las masas."
            },
            {
              step: 6,
              title: "Agregar sonido con el zumbador",
              desc: "Clavá un buzzer piezoeléctrico con su cable rojo en el polo positivo y negro en el negativo para que tu escultura también emita sonido.",
              tip: "Sentí cómo la masa vibra ligeramente al sonar."
            }
          ]
        }
      ]
    },

    /* ===================================================
       4° GRADO
    =================================================== */
    {
      id: "grado4",
      name: "4° Grado",
      shortName: "4° Grado",
      icon: "💡",
      color: "#C62828",
      colorLight: "#FFEBEE",
      colorBorder: "#F44336",
      description: "Consolas arcade caseras y robótica: mandos de cartón, pulsadores físicos y juegos en MakeCode Arcade.",

      games: [
        {
          id: "g4-g1",
          title: "Aventura RPG: El Bosque Encantado 🌲",
          platform: "scratch",
          scratchId: "60917032",
          thumbnail: "https://images.unsplash.com/photo-1518364538800-6bae3c2ea0f2?auto=format&fit=crop&w=600&q=80",
          description: "Juego de rol con inventario, diálogos ramificados y enemigos con inteligencia artificial básica.",
          benefits: "Fomenta el pensamiento sistémico, la gestión de inventarios y la resolución no lineal de problemas.",
          tags: ["Scratch", "RPG", "Inventario"]
        },
        {
          id: "g4-g2",
          title: "Pixel Knight: Dungeon Crawler 🏰",
          platform: "makecode",
          externalUrl: "https://arcade.makecode.com",
          thumbnail: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80",
          description: "Dungeon crawler retro creado en MakeCode Arcade con sprites pixel-art propios y combate por turnos.",
          benefits: "Introduce la arquitectura clásica de videojuegos 8-bit, la modularización de código y la estética retro.",
          tags: ["MakeCode", "Pixel Art", "Dungeon"]
        },
        {
          id: "g4-g3",
          title: "Cyber Lock: Descifra el Código 🔐",
          platform: "native",
          gameEngine: "codeBreaker",
          thumbnail: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=600&q=80",
          description: "Memorizá la secuencia de colores y sonidos para descifrar el código de seguridad nivel tras nivel.",
          benefits: "Ejercita la memoria de trabajo secuencial, la retención auditiva-visual y la concentración profunda.",
          tags: ["JavaScript", "Memoria", "Patrones"]
        }
      ],

      projects: [
        {
          id: "g4-p1",
          title: "Pixel Knight — Juego MakeCode 🏰",
          author: "Tomás H.",
          date: "Agosto 2026",
          coverImage: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80",
          description: "Tomás diseñó sprites pixel-art y programó el sistema de combate en MakeCode Arcade. Cuenta con simulador interactivo y galería de personajes.",
          tags: ["MakeCode", "Pixel Art", "Diseño de juego"],
          gallery: [
            "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80",
            "https://images.unsplash.com/photo-1551103782-8ab07afd45c1?auto=format&fit=crop&w=600&q=80"
          ],
          pdfUrl: null,
          makecodeUrl: "https://arcade.makecode.com",
          scratchId: null,
          materials: [
            {
              title: "Hoja de Sprites Pixel-Art",
              type: "Recurso Gráfico",
              icon: "fas fa-image",
              description: "Grilla con los personajes, pociones y armas dibujados píxel por píxel."
            }
          ]
        }
      ]
    },

    /* ===================================================
       5° GRADO
    =================================================== */
    {
      id: "grado5",
      name: "5° Grado",
      shortName: "5° Grado",
      icon: "⚙️",
      color: "#00695C",
      colorLight: "#E0F2F1",
      colorBorder: "#00897B",
      description: "Robots con servomotores y sensores: vehículos y mecanismos de cartón automatizados con micro:bit.",

      /* ---- JUEGOS ---- */
      games: [
        {
          id: "g5-g1",
          title: "Neon Runner JS ⚡",
          platform: "native",
          gameEngine: "neon_runner",
          thumbnail: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80",
          description: "Juego de plataformas arcade en JavaScript nativo con estética synthwave y físicas personalizadas.",
          benefits: "Enseña bucle de juego (game loop), detección de colisiones mediante AABB y renderizado en Canvas 2D.",
          tags: ["JavaScript", "Canvas", "Arcade"]
        },
        {
          id: "g5-g2",
          title: "Carrera de Velocidad Pixel 🏎️",
          platform: "makecode",
          externalUrl: "https://arcade.makecode.com",
          thumbnail: "https://images.unsplash.com/photo-1568386453619-84c3ff4b43c5?auto=format&fit=crop&w=600&q=80",
          description: "Juego de carreras pixel-art con pistas generadas automáticamente y control de aceleración por código.",
          benefits: "Trabaja la coordinación de reflejos rápidos, el ajuste matemático de velocidades y el análisis de rendimiento.",
          tags: ["MakeCode", "Racing", "Velocidad"]
        },
        {
          id: "g5-g3",
          title: "Pixel Art Studio 🖼️",
          platform: "native",
          gameEngine: "pixelMaker",
          thumbnail: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=600&q=80",
          description: "Herramienta interactiva para dibujar sprites de videojuegos en cuadrícula y exportarlos como archivo de imagen.",
          benefits: "Desarrolla la creatividad digital, la descomposición matricial de imágenes y la proporción geométrica.",
          tags: ["Herramienta", "Pixel Art", "Diseño"]
        }
      ],

      projects: [
        {
          id: "g5-p1",
          title: "Nuestro Primer Juego en JavaScript 🐍",
          author: "Grupo JavaScript 5°",
          date: "Agosto 2026",
          coverImage: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80",
          description: "Creamos la serpiente 'Bug Hunter' con JavaScript real y Canvas HTML5. Los chicos aprendieron a manejar el bucle del juego, colisiones en matriz y puntajes en memoria.",
          tags: ["JavaScript", "HTML5", "Canvas", "Snake"],
          gallery: [
            "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80",
            "https://images.unsplash.com/photo-1568386453619-84c3ff4b43c5?auto=format&fit=crop&w=600&q=80",
            "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80"
          ],
          pdfUrl: null,
          makecodeUrl: null,
          scratchId: null,
          materials: [
            {
              title: "Código Fuente Explicado",
              type: "Guía de Código",
              icon: "fas fa-code",
              description: "Explicación paso a paso de las funciones de movimiento y colisión de la serpiente."
            }
          ]
        }
      ]
    },

    /* ===================================================
       6° GRADO
    =================================================== */
    {
      id: "grado6",
      name: "6° Grado",
      shortName: "6° Grado",
      icon: "🚀",
      color: "#37474F",
      colorLight: "#ECEFF1",
      colorBorder: "#607D8B",
      description: "Domótica y automatización: maquetas inteligentes de cartón, sensores de luz/temperatura y JavaScript.",

      games: [
        {
          id: "g6-g1",
          title: "Neon Cyber Runner 2099 ⚡",
          platform: "native",
          gameEngine: "neonRunner",
          thumbnail: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80",
          description: "Arcade infinito con física de doble salto, sistema de partículas y récord guardado en el navegador.",
          benefits: "Enseña el funcionamiento del ciclo de juego (Game Loop), la física computacional y la optimización de código profesional.",
          tags: ["JavaScript", "Canvas API", "Partículas"]
        },
        {
          id: "g6-g2",
          title: "Cyber Lock: Hackeá el Sistema 🔐",
          platform: "native",
          gameEngine: "codeBreaker",
          thumbnail: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=600&q=80",
          description: "Descifrá secuencias de seguridad memorizando patrones de sonido sintetizado con Web Audio API.",
          benefits: "Introduce nociones de ciberseguridad, síntesis de audio por código y retención de patrones complejos.",
          tags: ["JavaScript", "Audio API", "Seguridad"]
        },
        {
          id: "g6-g3",
          title: "Quiz Final del Taller 2026 🏆",
          platform: "native",
          gameEngine: "devQuiz",
          thumbnail: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80",
          description: "El gran desafío anual que reúne preguntas de lógica, Scratch, Code.org, JavaScript y conceptos web.",
          benefits: "Evalúa integralmente los aprendizajes del ciclo lectivo con retroalimentación instantánea y refuerzo positivo.",
          tags: ["Trivia", "Evaluación", "Lógica"]
        },
        {
          id: "g6-g4",
          title: "Traductor Binario: Código PC 💻",
          platform: "native",
          gameEngine: "binaryTranslator",
          thumbnail: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80",
          description: "¿Cómo 'piensa' una computadora? Escribí cualquier palabra y mirá cómo se traduce a 1s y 0s en tiempo real.",
          benefits: "Desmitifica el sistema binario y enseña cómo las máquinas codifican texto, imágenes y datos numéricos.",
          tags: ["Herramienta", "Binario", "Sistemas"]
        }
      ],

      projects: [
        {
          id: "g6-p1",
          level: 1,
          title: "El Arquero con Inteligencia Artificial en Canva ⚽🧤🤖",
          author: "Taller de Robótica y Tecnología 6° Grado",
          date: "Marzo 2026",
          type: "canva",
          platform: "canva",
          badge: "🤖 Canva & Animación con IA",
          icon: "fa-wand-magic-sparkles",
          color: "#0284C7",
          coverImage: "img/proyectos/canva_arquero_ia_cover.svg",
          gameUrl: "https://www.canva.com",
          externalUrl: "https://www.canva.com",
          description: "¡Nivel 1 de nuestra Ruta de Aventuras! Aprendemos edición digital y animación con Inteligencia Artificial en Canva: nos sacamos una foto en el aula, la subimos a Canva y usamos la IA para aislar la cabeza. Luego buscamos la imagen de un arquero atajando la pelota, reemplazamos su cabeza original con la nuestra y con Magic Animate transformamos el fotomontaje en una espectacular animación de video MP4 o GIF.",
          objective: "Aprender la técnica de fotomontaje digital y animación con Inteligencia Artificial en Canva: tomar una fotografía en el aula, aislar la cabeza con el Quitafondos IA, reemplazar la cabeza de un arquero en una imagen de fútbol, y aplicar la IA de animación (Magic Animate) para convertir el diseño en una animación de atajada en video MP4 o GIF.",
          benefits: "Desarrolla habilidades en Inteligencia Artificial generativa, la técnica de fotomontaje y reemplazo de rostros por capas en Canva, el ajuste de proporciones y perspectiva visual, y el entusiasmo creativo al verse a sí mismos como los arqueros protagonistas de la animación.",
          tags: ["Canva", "Inteligencia Artificial", "IA Generativa", "Animación", "Arquero", "Fútbol", "Quitafondos", "Magic Animate", "Nivel 1"],
          gallery: [
            "img/proyectos/canva_arquero_ia_cover.svg"
          ],
          pdfUrl: null,
          downloadPdfUrl: null,
          makecodeUrl: null,
          scratchId: null,
          materials: [
            { title: "Foto del Estudiante (Aula)", description: "Primer plano del rostro y cabeza con buena luz en el taller.", icon: "fa-camera" },
            { title: "Plataforma Canva (Educación)", description: "Lienzo de diseño y acceso a Magic Studio con herramientas de IA.", icon: "fa-palette" },
            { title: "Imagen de Arquero en el Arco", description: "Foto o diseño base de un arquero volando para atajar la pelota.", icon: "fa-futbol" },
            { title: "Quitafondos con IA de Canva", description: "Herramienta inteligente que recorta y aísla la cabeza automáticamente.", icon: "fa-wand-magic-sparkles" },
            { title: "Reemplazo de Cabeza (Fotomontaje)", description: "Ajuste de tamaño, inclinación y cuello sobre el cuerpo del arquero.", icon: "fa-user-astronaut" },
            { title: "Magic Animate / Animación con IA", description: "Transforma el fotomontaje estático en una animación de video MP4 o GIF.", icon: "fa-film" }
          ],
          instructions: [
            {
              step: 1,
              title: "Toma de Fotografía en el Aula",
              desc: "Con la tablet o cámara del taller, tomate una foto en primer plano de tu rostro y cabeza con buena iluminación y gesto concentrado de arquero listo para atajar.",
              tip: "Mantené un fondo liso para que la IA reconozca el contorno de tu cabeza con máxima precisión."
            },
            {
              step: 2,
              title: "Buscar la Imagen del Arquero en Canva",
              desc: "Ingresá a Canva con la cuenta del colegio. En 'Elementos' o 'Fotos', buscá 'arquero atajando' o 'goalkeeper save' y seleccioná una imagen donde el arquero esté volando hacia la pelota.",
              tip: "Elegí una imagen donde el cuerpo tenga buena visibilidad del cuello y los guantes de arquero."
            },
            {
              step: 3,
              title: "Subir tu Foto y Aislar la Cabeza con Quitafondos IA",
              desc: "Andá a la pestaña 'Subidos' y cargá tu foto. Colocala en el diseño, tocá 'Editar la foto' y hacé clic en 'Quitafondos' (Efecto de IA) para eliminar el fondo del aula y dejar únicamente tu cabeza limpia.",
              tip: "Podés usar la herramienta de borrado manual para eliminar cualquier detalle sobrante alrededor del cuello."
            },
            {
              step: 4,
              title: "Reemplazar la Cabeza del Arquero con tu Foto",
              desc: "Arrastrá tu cabeza recortada y colócala exactamente sobre la cabeza del arquero de la imagen original. Ajustá el tamaño, la inclinación y la posición para que encaje de manera natural sobre el buzo de arquero.",
              tip: "Usá los controles de rotación de Canva para inclinar tu cabeza con el mismo ángulo de vuelo del cuerpo."
            },
            {
              step: 5,
              title: "Transformar en Animación con la IA de Canva",
              desc: "Hacé clic en 'Animar' en la barra superior y seleccioná 'Magic Animate' (Animación Mágica con IA). La Inteligencia Artificial analizará el arquero, el fondo y la pelota para generar un movimiento dinámico y cinematográfico.",
              tip: "Probá los estilos 'Enérgico' o 'Épico' para que la atajada parezca una repetición de fútbol real."
            },
            {
              step: 6,
              title: "Descargar en Video MP4 o GIF y Entregar",
              desc: "Tocá 'Compartir' > 'Descargar', seleccioná formato 'Video MP4' o 'GIF animado' y guardalo. Subilo a la pestaña 'Mi Entrega' de tu panel o pegá tu enlace público de Canva para sumar tus +100 XP.",
              tip: "¡Tus compañeros y el profe van a poder reproducir tu video atajando en el aula virtual!"
            }
          ]
        },
        {
          id: "g6-p2",
          level: 2,
          title: "El Arquero Mecánico: Control de Servo y Joystick con Mapeo Matemático 🧤🕹️⚙️",
          author: "Taller de Robótica y Tecnología 6° Grado",
          date: "Abril 2026",
          type: "makecode",
          platform: "makecode",
          badge: "🧤 Arquero, Joystick Chico Negro & Servo SG90",
          icon: "fa-gamepad",
          color: "#0D9488",
          coverImage: "img/proyectos/servo_joystick_makecode_cover.svg",
          gameUrl: "https://makecode.microbit.org/S17294-82339-82111-72476",
          externalUrl: "https://makecode.microbit.org/S17294-82339-82111-72476",
          makecodeUrl: "https://makecode.microbit.org/S17294-82339-82111-72476",
          codeSnippet: `let x = 0\nlet angulo = 90\npins.servoWritePin(AnalogPin.P0, angulo)\n// Joystick principal\nbasic.forever(function () {\n    x = pins.analogReadPin(AnalogPin.P1)\n    angulo = Math.map(x, 0, 1023, 0, 180)\n    if (angulo < 0) {\n        angulo = 0\n    }\n    if (angulo > 180) {\n        angulo = 180\n    }\n    pins.servoWritePin(AnalogPin.P0, angulo)\n    basic.pause(20)\n})`,
          description: "¡Nivel 2 de nuestra Ruta de Aventuras! Conectamos el joystick micro:bit chico negro (palanca en Pin P1) y un servomotor SG90 (Pin P0) para mover físicamente al arquero de poste a poste en el arco de fútbol. Usamos el ajuste de intervalo matemático (Math.map de 0..1023 a 0..180°) y límites de seguridad para que el arquero ataje con precisión y fluidez.",
          objective: "Construir y programar el mecanismo del arquero atajador en el arco de fútbol: leer la palanca del joystick chico negro en el Pin P1 (0 a 1023), aplicar el ajuste de intervalo proporcional (Math.map) para convertirlo en el rango angular del servomotor SG90 en el Pin P0 (0° a 180°) y programar las condiciones de seguridad en un bucle continuo de 20 ms.",
          benefits: "Conecta la animación digital del Nivel 1 con la robótica física y la cinemática en el mundo real. Fortalece la comprensión de funciones lineales y proporcionalidad matemática (ajuste de intervalo) al controlar un actuador mecánico angular con un joystick analógico continuo.",
          tags: ["MakeCode", "BBC micro:bit", "El Arquero Mecánico", "Joystick Chico Negro", "Servomotor SG90", "Mapeo Matemático", "Ajuste de Intervalo", "Robótica", "Nivel 2"],
          gallery: [
            "img/proyectos/servo_joystick_makecode_cover.svg"
          ],
          pdfUrl: null,
          downloadPdfUrl: null,
          scratchId: null,
          materials: [
            { title: "Joystick micro:bit chico negro", description: "Módulo con palanca analógica para micro:bit; eje X conectado al Pin P1 (lecturas continuas de 0 a 1023).", icon: "fa-gamepad" },
            { title: "Micro Servomotor SG90 (Pin P0)", description: "Servomotor angular en el Pin P0 que sostiene al arquero y lo mueve de poste a poste (0° a 180°).", icon: "fa-cogs" },
            { title: "Placa BBC micro:bit v2", description: "Microcontrolador central que ejecuta el código MakeCode, calcula el mapeo matemático y controla el servo.", icon: "fa-microchip" },
            { title: "Arco y Figura del Arquero", description: "Estructura del arco de fútbol con el arquero atajador montado sobre el aspa mecánica del servomotor.", icon: "fa-futbol" },
            { title: "Cables Dupont de Conexión", description: "Conexiones de alimentación (3V/VCC y GND) y pines de señal P0 (servo) y P1 (joystick).", icon: "fa-bezier-curve" },
            { title: "Editor MakeCode micro:bit", description: "Entorno de bloques con la función matemática Math.map y escritura analógica de servo.", icon: "fa-laptop-code" }
          ],
          instructions: [
            {
              step: 1,
              title: "Conexión del Joystick Chico Negro (Pin P1)",
              desc: "Conectá los pines de alimentación VCC a 3V y GND a tierra en el shield. Llevá la señal de la palanca (eje horizontal X) al Pin P1 de la micro:bit.",
              tip: "El joystick chico negro permite mover al arquero con gran precisión usando el pulgar."
            },
            {
              step: 2,
              title: "Conexión del Servomotor del Arquero (Pin P0)",
              desc: "Conectá el servomotor SG90 en el Pin P0 (cable marrón a GND, rojo a 3V y naranja a Pin P0). Acoplá firmemente la figura del arquero sobre el aspa del servo.",
              tip: "Asegurate de que el cable naranja quede en el Pin P0 de la micro:bit."
            },
            {
              step: 3,
              title: "Inicializar el Arquero al Centro (90°)",
              desc: "Al encender la micro:bit, fijá la variable 'angulo' en 90° y escribí en el Pin P0 para que el arquero empiece ubicado en el centro exacto del arco.",
              tip: "Código MakeCode inicial: let x = 0; let angulo = 90; pins.servoWritePin(AnalogPin.P0, angulo)."
            },
            {
              step: 4,
              title: "Lectura Analógica y Mapeo Matemático",
              desc: "En el bucle 'para siempre', leé la posición de la palanca: x = pins.analogReadPin(AnalogPin.P1). Luego calculá el ángulo proporcional con el bloque matemático: angulo = Math.map(x, 0, 1023, 0, 180).",
              tip: "La fórmula matemática es: Ángulo = (x * 180) / 1023."
            },
            {
              step: 5,
              title: "Límites de Seguridad y Giro del Servo (Pin P0)",
              desc: "Evitá que el arquero golpee los postes con dos condiciones: si angulo < 0 entonces angulo = 0, y si angulo > 180 entonces angulo = 180. Escribí el ángulo con pins.servoWritePin(AnalogPin.P0, angulo) y pausá 20 ms.",
              tip: "La pausa de 20 milisegundos suaviza el movimiento del servomotor."
            },
            {
              step: 6,
              title: "¡Atajar Penales y Compartir Proyecto!",
              desc: "Probá tu mecanismo moviendo la palanca: a la izquierda (x=0) el arquero vuela al palo izquierdo (0°), al soltarlo vuelve al centro (90°) y a la derecha (x=1023) ataja en el palo derecho (180°).",
              tip: "Proyecto oficial MakeCode: https://makecode.microbit.org/S17294-82339-82111-72476"
            }
          ]
        },
        {
          id: "g6-p3",
          level: 3,
          title: "IA con Gemini & NotebookLM: Creación de Materiales de Estudio 🧠🎙️📽️📊",
          author: "Taller de Robótica, IA y Tecnología 6° Grado",
          date: "Abril 2026",
          type: "gemini_notebooks",
          platform: "notebooklm",
          badge: "🧠 Gemini & NotebookLM • IA Educativa",
          icon: "fa-brain",
          color: "#4F46E5",
          coverImage: "img/proyectos/gemini_notebooks_cover.svg",
          gameUrl: null,
          externalUrl: "https://notebooklm.google.com",
          pdfUrl: "docs/guia_ia_gemini_notebooks.pdf",
          downloadPdfUrl: "docs/guia_ia_gemini_notebooks.pdf",
          makecodeUrl: null,
          scratchId: null,
          description: "¡Nivel 3 de nuestra Ruta de Aventuras! Aprendemos a usar Google Gemini y NotebookLM para convertir fuentes confiables (PDFs escolares, libros de texto y apuntes) en materiales de estudio interactivos: podcasts de audio con dos locutores sintetizados (Audio Overview), guiones audiovisuales para videos educativos, esquemas para presentaciones en Canva y guías de estudio con cuestionarios tipo FAQ y flashcards para autoevaluación con cero alucinaciones.",
          objective: "Dominar el uso educativo de la IA generativa basada en fuentes verificables (Grounding): cargar libros y apuntes en Google NotebookLM, generar un podcast explicativo con dos voces sintéticas, diseñar un guión audiovisual para video con gancho y escenas, estructurar diapositivas para Canva/Slides y formular cuestionarios de autoevaluación con active recall y citas exactas a los textos originales.",
          benefits: "Desarrolla el pensamiento crítico, la alfabetización en inteligencia artificial y la autonomía en el estudio. Enseña a distinguir entre chatbots convencionales propensos a alucinaciones y modelos anclados en fuentes comprobables, transformando a los alumnos de 6° grado en creadores de contenidos educativos multimedia de vanguardia.",
          tags: ["Google Gemini", "NotebookLM", "Inteligencia Artificial", "Podcasts Educativos", "Guiones de Video", "Materiales de Estudio", "Grounding", "Flashcards", "Nivel 3"],
          gallery: [
            "img/proyectos/gemini_notebooks_cover.svg"
          ],
          materials: [
            { title: "Google NotebookLM (Gemini 1.5 Pro)", description: "Cuaderno inteligente de Google con IA anclada a fuentes para generar podcasts, resúmenes y preguntas.", icon: "fa-brain" },
            { title: "Fuentes en PDF, Libros y Apuntes", description: "Capítulos escolares, notas tomadas en clase y artículos educativos que alimentan el cuaderno sin alucinaciones.", icon: "fa-file-pdf" },
            { title: "Generador de Audio Overview (Podcast)", description: "Herramienta que crea una conversación de audio entre 2 locutores virtuales analizando los temas clave.", icon: "fa-microphone" },
            { title: "Editor Canva o Google Slides", description: "Plataforma de diseño visual para maquetar las diapositivas y esquemas generados por la IA.", icon: "fa-tv" },
            { title: "Guía Oficial de Estudio en PDF", description: "Documento técnico y pedagógico descargable con instrucciones paso a paso, prompts y decálogo de ética.", icon: "fa-file-alt" },
            { title: "Fichas Flashcards y Quizzes FAQ", description: "Tarjetas de autoevaluación con active recall y preguntas de opción múltiple con citas verificadas.", icon: "fa-question-circle" }
          ],
          instructions: [
            {
              step: 1,
              title: "Crear tu Cuaderno en NotebookLM",
              desc: "Ingresá a notebooklm.google.com con tu cuenta educativa y hacé clic en 'Nuevo cuaderno'. Escribí un título claro según el tema de ciencias, historia o robótica que estés investigando.",
              tip: "NotebookLM es 100% gratuito y seguro, no comparte tus apuntes para entrenar modelos públicos."
            },
            {
              step: 2,
              title: "Cargar tus Fuentes Confiables (Grounding)",
              desc: "Subí el archivo PDF de tu libro de texto, enlaces a artículos web de consulta o pegá tus propios apuntes de clase. NotebookLM leerá y organizará todos los textos en pocos segundos.",
              tip: "Podés subir hasta 50 fuentes por cuaderno. Cuanto más ricas sean tus fuentes, mejores serán las respuestas."
            },
            {
              step: 3,
              title: "Generar el Podcast de Audio (Audio Overview)",
              desc: "En el panel lateral derecho ('Notebook Guide'), pulsá el botón 'Generar' en la sección Audio Overview. Dos locutores de IA conversarán y debatirán los conceptos principales como en un programa de radio profesional.",
              tip: "Podés pausar, retroceder y descargar el audio para escucharlo en casa o camino a la escuela."
            },
            {
              step: 4,
              title: "Crear Guión Audiovisual para Video",
              desc: "Escribí en el chat: 'Genera un guión para un video de 2 minutos explicando este tema para mis compañeros de 6° grado, con Gancho inicial, Desarrollo con analogías simples y Cierre con llamado a la acción'.",
              tip: "Pedile que incluya descripciones de qué imágenes mostrar en pantalla en cada escena."
            },
            {
              step: 5,
              title: "Estructurar Diapositivas para Canva o Slides",
              desc: "Solicitá un esquema de 6 diapositivas con título, 3 puntos clave por diapositiva y recomendaciones de imágenes. Luego abrilo en Canva para darle formato gráfico atractivo.",
              tip: "Recordá la regla del 6x6: pocas palabras por viñeta para que tus diapositivas no se sobrecarguen de texto."
            },
            {
              step: 6,
              title: "Autoevaluación con Flashcards y Descargar Guía PDF",
              desc: "Pedile a NotebookLM que cree 5 preguntas frecuentes (FAQ) con trampa y respuestas citadas. Al finalizar, descargá la Guía PDF integral para repasar todos los prompts y el decálogo ético.",
              tip: "¡Hacé clic en los números de cita [1], [2] para comprobar que la IA no haya inventado ningún dato!"
            }
          ]
        },
        {
          id: "g6-p4",
          level: 4,
          title: "Mi Primera Página Web Personal 🌐",
          author: "Grupo 6° Grado",
          date: "Agosto 2026",
          badge: "🌐 Desarrollo Web & HTML/CSS",
          icon: "fa-code",
          color: "#2563EB",
          coverImage: "https://images.unsplash.com/photo-1547658719-da2b51169166?auto=format&fit=crop&w=600&q=80",
          description: "Cada alumno de 6° diseñó y programó su propia página web con HTML y CSS desde cero.",
          tags: ["HTML5", "CSS3", "Diseño Web", "Nivel 4"],
          gallery: [
            "https://images.unsplash.com/photo-1547658719-da2b51169166?auto=format&fit=crop&w=600&q=80",
            "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80"
          ],
          pdfUrl: null,
          makecodeUrl: null,
          scratchId: null,
          materials: [
            {
              title: "Plantilla Base HTML5 & CSS3",
              type: "Plantilla Web",
              icon: "fa-file-code",
              description: "Estructura semántica inicial con header, main, section y footer utilizada por los alumnos."
            }
          ]
        }
      ]
    }
  ]
};

/* ── Helpers ─────────────────────────────────── */
function getGradeById(id) {
  return SCHOOL_DATA.grades.find(g => g.id === id) || null;
}

function getGameUrl(game) {
  if (game.platform === 'scratch' && game.scratchId)
    return `https://scratch.mit.edu/projects/${game.scratchId}`;
  if (game.externalUrl)
    return game.externalUrl;
  if (game.platform === 'native')
    return `juego.html?game=${game.gameEngine}`;
  return null;
}

if (typeof window !== 'undefined') {
  window.SCHOOL_DATA  = SCHOOL_DATA;
  window.getGradeById = getGradeById;
  window.getGameUrl   = getGameUrl;
}

/* ══════════════════════════════════════════════════════════════
   BIBLIOTECA DE MAKECODE — Editar aquí para agregar / cambiar códigos
   
   Para obtener el link de un proyecto:
   1. Abrí tu proyecto en MakeCode (microbit, arcade, etc.)
   2. Hacé click en "Compartir" → copiá el link
   3. Pegalo en el campo "shareUrl" abajo
   
   La plataforma se detecta automáticamente del link:
   - makecode.microbit.org → Micro:bit
   - arcade.makecode.com  → Arcade
   - makecode.com         → Genérico
══════════════════════════════════════════════════════════════ */
const MAKECODE_LIBRARY = {
  // Sala de 5 años (Electrónica y Circuitos en Papel sin MakeCode)
  sala5: [],

  // 1° Grado (Electrónica, Paint, Code.org y Scratch Jr sin MakeCode)
  grado1: [],

  // 2° Grado
  grado2: [
    {
      title: "Proyecto Micro:bit — Ejemplo",
      description: "Código de bloques en MakeCode para Micro:bit (solo lectura)",
      shareUrl: "https://makecode.microbit.org/S18043-28109-69626-83440"
    }
  ],

  // 3° Grado
  grado3: [
    {
      title: "Proyecto Micro:bit — Ejemplo",
      description: "Código de bloques en MakeCode para Micro:bit (solo lectura)",
      shareUrl: "https://makecode.microbit.org/S18043-28109-69626-83440"
    }
  ],

  // 4° Grado
  grado4: [
    {
      title: "Proyecto Micro:bit — Ejemplo",
      description: "Código de bloques en MakeCode para Micro:bit (solo lectura)",
      shareUrl: "https://makecode.microbit.org/S18043-28109-69626-83440"
    }
  ],

  // 5° Grado
  grado5: [
    {
      title: "Proyecto Micro:bit — Ejemplo",
      description: "Código de bloques en MakeCode para Micro:bit (solo lectura)",
      shareUrl: "https://makecode.microbit.org/S18043-28109-69626-83440"
    }
  ],

  // 6° Grado
  grado6: [
    {
      id: "g6-p2",
      level: 2,
      title: "El Arquero Mecánico: Control de Servo y Joystick con Mapeo Matemático 🧤🕹️⚙️",
      subtitle: "Lectura de Joystick Chico Negro (P1), Ajuste de Intervalo (Math.map) y Servomotor SG90 (P0)",
      description: "Lectura de la palanca del joystick chico negro en Pin P1, bloque matemático 'mapear' de 0-1023 a 0-180°, límites de seguridad y control del servomotor del arquero en Pin P0.",
      shareUrl: "https://makecode.microbit.org/S17294-82339-82111-72476",
      coverImage: "img/proyectos/servo_joystick_makecode_cover.svg",
      badge: "🧤 Arquero, Joystick Chico Negro & Servo SG90",
      icon: "fa-gamepad",
      color: "#0D9488",
      codeSnippet: `let x = 0\nlet angulo = 90\npins.servoWritePin(AnalogPin.P0, angulo)\n// Joystick principal\nbasic.forever(function () {\n    x = pins.analogReadPin(AnalogPin.P1)\n    angulo = Math.map(x, 0, 1023, 0, 180)\n    if (angulo < 0) {\n        angulo = 0\n    }\n    if (angulo > 180) {\n        angulo = 180\n    }\n    pins.servoWritePin(AnalogPin.P0, angulo)\n    basic.pause(20)\n})`
    }
  ]
};

if (typeof window !== 'undefined') {
  window.MAKECODE_LIBRARY = MAKECODE_LIBRARY;

  // ── Sincronización y Subida de MakeCode a Firestore ──
  async function seedMakecodeLibraryToFirestore(force) {
    if (!window.db) return false;
    try {
      const batch = window.db.batch();
      Object.keys(MAKECODE_LIBRARY).forEach(gradeId => {
        const ref = window.db.collection('makecode_library').doc(gradeId);
        batch.set(ref, {
          gradeId: gradeId,
          items: MAKECODE_LIBRARY[gradeId] || [],
          updatedAt: new Date().toISOString()
        }, { merge: !force });
      });
      await batch.commit();
      console.log("✅ Biblioteca MakeCode de todos los grados guardada en Firestore.");
      return true;
    } catch (e) {
      console.warn("Aviso al sembrar MakeCode en Firestore:", e);
      return false;
    }
  }

  // ── Sincronización y Subida de Proyectos a Firestore ──
  async function seedGradeProjectsToFirestore(force) {
    if (!window.db || !window.SCHOOL_DATA || !Array.isArray(window.SCHOOL_DATA.grades)) return false;
    try {
      const batch = window.db.batch();
      window.SCHOOL_DATA.grades.forEach(grade => {
        const ref = window.db.collection('grade_projects').doc(grade.id);
        batch.set(ref, {
          gradeId: grade.id,
          gradeName: grade.name,
          projects: grade.projects || [],
          updatedAt: new Date().toISOString()
        }, { merge: !force });
      });
      await batch.commit();
      console.log("✅ Proyectos de grado (Sala 5 a 6°) guardados en Firestore.");
      return true;
    } catch (e) {
      console.warn("Aviso al sembrar proyectos en Firestore:", e);
      return false;
    }
  }

  // ── Función Maestra: Sube TODO a Cloud Firestore ──
  async function syncAllToFirestore(force) {
    if (!window.db) {
      console.warn("⚠️ Base de datos Firestore no inicializada aún.");
      return false;
    }
    console.log("🔥 Sincronizando todo a Cloud Firestore (paulofreiredb)...");
    const resMk   = await seedMakecodeLibraryToFirestore(force);
    const resProj = await seedGradeProjectsToFirestore(force);
    let resStud   = false;
    if (window.seedInitialStudents) {
      await window.seedInitialStudents();
      resStud = true;
    }
    console.log("🎉 Sincronización completada en la nube: MakeCode (" + resMk + "), Proyectos (" + resProj + "), Alumnos (" + resStud + ")");
    return true;
  }

  // Listener en tiempo real de MakeCode
  function initMakecodeFirestoreSync() {
    if (!window.db) {
      setTimeout(initMakecodeFirestoreSync, 400);
      return;
    }
    try {
      window.db.collection('makecode_library').onSnapshot((snapshot) => {
        if (snapshot.empty) {
          console.log("🌱 Firestore vacío en makecode_library: subiendo a la nube...");
          seedMakecodeLibraryToFirestore();
          return;
        }
        let hasSala5 = false;
        let hasGrado1 = false;
        let hasGrado6 = false;
        let needsReseed = false;

        snapshot.forEach((doc) => {
          const gradeId = doc.id;
          if (gradeId === 'sala5') hasSala5 = true;
          if (gradeId === 'grado1') hasGrado1 = true;
          if (gradeId === 'grado6') hasGrado6 = true;
          const data = doc.data();
          if (gradeId === 'sala5' || gradeId === 'grado1' || gradeId === '1ero') {
            MAKECODE_LIBRARY[gradeId] = [];
            return;
          }
          if (gradeId === 'grado6' || gradeId === '6to') {
            const items = data.items || [];
            const isStaleGrado6 = items.length === 0 ||
              !items.some(it => (it.shareUrl || '').includes('S17294') && it.coverImage && it.coverImage.includes('servo_joystick_makecode_cover') && it.codeSnippet);
            if (isStaleGrado6) {
              console.log("🔄 MakeCode desactualizado en Firestore para grado6. Conservando definición oficial y re-sembrando...");
              needsReseed = true;
              return;
            }
          }
          if (Array.isArray(data.items) && data.items.length > 0) {
            MAKECODE_LIBRARY[gradeId] = data.items;
          }
        });
        // Si falta sala5, grado1 o grado6 en la nube o está desactualizado, guardarlo
        if (!hasSala5 || !hasGrado1 || !hasGrado6 || needsReseed) {
          seedMakecodeLibraryToFirestore(true);
        }
        console.log("☁️ MakeCode sincronizado desde Firestore.");
      }, (err) => {
        console.warn("Aviso Firestore makecode_library:", err.message);
      });
    } catch(e) {}
  }

  // Listener en tiempo real de Proyectos del Grado
  function initGradeProjectsFirestoreSync() {
    if (!window.db) {
      setTimeout(initGradeProjectsFirestoreSync, 400);
      return;
    }
    try {
      window.db.collection('grade_projects').onSnapshot((snapshot) => {
        if (snapshot.empty) {
          console.log("🌱 Firestore vacío en grade_projects: subiendo proyectos a la nube...");
          seedGradeProjectsToFirestore(true);
          return;
        }
        let hasSala5 = false;
        let hasGrado1 = false;
        let hasGrado6 = false;
        let needsReseed = false;

        snapshot.forEach((doc) => {
          const gradeId = doc.id;
          if (gradeId === 'sala5') hasSala5 = true;
          if (gradeId === 'grado1') hasGrado1 = true;
          if (gradeId === 'grado6') hasGrado6 = true;
          const data = doc.data();
          const targetProjects = data.projects || data.items;
          if (Array.isArray(targetProjects) && targetProjects.length > 0) {
            const gradeObj = window.SCHOOL_DATA.grades.find(g => g.id === gradeId);
            if (gradeObj) {
              // Si es sala5 y los proyectos en Firestore no tienen San Patricio, Angry Birds, Varita Mágica, Cancha de Fútbol, Día de la Madre, Ana y Elsa, Banderas, Minecraft, CodeJr/Velocidades, les falta objective, o Paint tiene gameUrl residual, actualizar Firestore
              const isStaleSala5 = gradeId === 'sala5' && (
                targetProjects.length < 10 ||
                !targetProjects.some(p => (p.title || '').includes('San Patricio')) ||
                !targetProjects.some(p => (p.title || '').includes('Angry Birds')) ||
                !targetProjects.some(p => (p.title || '').includes('Varita') || (p.title || '').includes('varita')) ||
                !targetProjects.some(p => (p.title || '').includes('Cancha') || (p.title || '').includes('cancha')) ||
                !targetProjects.some(p => (p.title || '').includes('Madre') || (p.title || '').includes('madre') || p.id === 's5-p5') ||
                !targetProjects.some(p => (p.title || '').includes('Elsa') || (p.title || '').includes('Frozen') || (p.title || '').includes('Ana') || p.id === 's5-p6') ||
                !targetProjects.some(p => (p.title || '').includes('Bandera') || (p.title || '').includes('bandera') || p.id === 's5-p7') ||
                !targetProjects.some(p => (p.title || '').includes('Minecraft') || (p.title || '').includes('minecraft') || p.id === 's5-p8') ||
                !targetProjects.some(p => (p.title || '').includes('CodeJr') || (p.title || '').includes('Velocidad') || (p.title || '').includes('velocidad') || p.id === 's5-p9') ||
                !targetProjects.some(p => (p.title || '').includes('Perspectiva') || (p.title || '').includes('perpestiva') || (p.title || '').includes('perspectiva') || p.id === 's5-p10') ||
                !targetProjects.some(p => (p.id === 's5-p1' && p.objective)) ||
                targetProjects.some(p => ((p.id === 's5-p4' || p.id === 's5-p7') || /cancha|bandera/i.test(p.title || '')) && (p.gameUrl || p.externalUrl))
              );

              // Para 1° Grado: verificar que tenga exactamente los 10 proyectos con Marca-Libros de Tom Sawyer
              const isStaleGrado1 = (gradeId === 'grado1' || gradeId === '1ero') && (
                targetProjects.length < 10 ||
                !targetProjects.some(p => (p.title || '').includes('San Patricio') || p.id === 'g1-p1') ||
                !targetProjects.some(p => (p.title || '').includes('Angry Birds') || p.id === 'g1-p2') ||
                !targetProjects.some(p => (p.title || '').includes('Tom Sawyer') || (p.title || '').includes('Marca-Libro') || (p.title || '').includes('marcalibro') || p.id === 'g1-p3') ||
                !targetProjects.some(p => (p.title || '').includes('Cancha') || p.id === 'g1-p4') ||
                !targetProjects.some(p => (p.title || '').includes('Madre') || (p.title || '').includes('Pop-Up') || p.id === 'g1-p5') ||
                !targetProjects.some(p => (p.title || '').includes('Frozen') || (p.title || '').includes('Elsa') || p.id === 'g1-p6') ||
                !targetProjects.some(p => (p.title || '').includes('Bandera') || p.id === 'g1-p7') ||
                !targetProjects.some(p => (p.title || '').includes('Minecraft') || p.id === 'g1-p8') ||
                !targetProjects.some(p => (p.title || '').includes('Velocidad') || p.id === 'g1-p9') ||
                !targetProjects.some(p => (p.title || '').includes('Perspectiva') || p.id === 'g1-p10') ||
                !targetProjects.some(p => (p.id === 'g1-p3' && p.objective)) ||
                targetProjects.some(p => ((p.id === 'g1-p4' || p.id === 'g1-p7') || /cancha|bandera/i.test(p.title || '')) && (p.gameUrl || p.externalUrl))
              );

              // Para 6° Grado: verificar que tenga el proyecto oficial de Canva con IA, el Arquero Mecánico con imagen y Gemini & NotebookLM
              const isStaleGrado6 = (gradeId === 'grado6' || gradeId === '6to') && (
                targetProjects.length < 3 ||
                !targetProjects.some(p => (p.title || '').includes('Canva') || (p.title || '').includes('Arquero') || p.id === 'g6-p1') ||
                !targetProjects.some(p => (p.title || '').includes('Servo') || (p.title || '').includes('Joystick') || p.id === 'g6-p2') ||
                !targetProjects.some(p => (p.id === 'g6-p2' && (p.makecodeUrl || '').includes('S17294') && p.coverImage && p.coverImage.includes('servo_joystick_makecode_cover'))) ||
                !targetProjects.some(p => (p.title || '').includes('Gemini') || (p.title || '').includes('NotebookLM') || p.id === 'g6-p3')
              );

              if (isStaleSala5 || isStaleGrado1 || isStaleGrado6) {
                console.log("🔄 Proyectos desactualizados en Firestore para " + gradeId + ". Conservando definición oficial y re-sembrando en Firestore...");
                needsReseed = true;
                // NO sobrescribir gradeObj.projects con datos viejos de Firestore! Mantener definición oficial de SCHOOL_DATA
              } else {
                targetProjects.forEach(function(p) {
                  if (p.id === 's5-p4' || p.id === 's5-p7' || p.id === 'g1-p4' || p.id === 'g1-p7' || /cancha|paint|bandera/i.test(p.title || '') || p.type === 'paint') {
                    p.gameUrl = null;
                    p.externalUrl = null;
                    p.type = 'paint';
                  }
                  if (p.id === 'g6-p2' || (/servo.*joystick|joystick.*servo/i.test(p.title || ''))) {
                    p.coverImage = 'img/proyectos/servo_joystick_makecode_cover.svg';
                    p.makecodeUrl = 'https://makecode.microbit.org/S17294-82339-82111-72476';
                  }
                  if (p.id === 'g6-p3' || (/gemini|notebooklm|materiales.*estudio/i.test(p.title || ''))) {
                    p.coverImage = 'img/proyectos/gemini_notebooks_cover.svg';
                    p.pdfUrl = 'docs/guia_ia_gemini_notebooks.pdf';
                    p.downloadPdfUrl = 'docs/guia_ia_gemini_notebooks.pdf';
                    p.externalUrl = 'https://notebooklm.google.com';
                  }
                });
                gradeObj.projects = targetProjects;
              }
            }
          }
        });
        if (!hasSala5 || !hasGrado1 || !hasGrado6 || needsReseed) {
          seedGradeProjectsToFirestore(true);
        }
        console.log("☁️ Proyectos de grado sincronizados desde Firestore.");

        // Refrescar panel si el alumno está conectado
        if (typeof window.renderGDriveDashboard === 'function' && document.getElementById('student-drive-dashboard-container')) {
          window.renderGDriveDashboard('student-drive-dashboard-container');
        }
      }, (err) => {
        console.warn("Aviso Firestore grade_projects:", err.message);
      });
    } catch(e) {}
  }

  window.seedMakecodeLibraryToFirestore = seedMakecodeLibraryToFirestore;
  window.seedGradeProjectsToFirestore   = seedGradeProjectsToFirestore;
  window.syncAllToFirestore             = syncAllToFirestore;

  function initAllFirestoreDataSync() {
    initMakecodeFirestoreSync();
    initGradeProjectsFirestoreSync();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAllFirestoreDataSync);
  } else {
    initAllFirestoreDataSync();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SCHOOL_DATA, MAKECODE_LIBRARY, getGradeById };
}
