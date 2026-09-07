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
          title: "Scratch Jr 🎨",
          platform: "codejr",
          externalUrl: "https://codejr.org",
          thumbnail: "img/scratchjr.png",
          description: "Iniciación a la programación con bloques visuales de símbolos para crear historias y animaciones.",
          benefits: "Fomenta la creatividad, la expresión artística y la secuencia lógica de instrucciones en edad temprana.",
          tags: ["Scratch Jr", "Bloques", "Iniciación"]
        },
        {
          id: "s5-g2",
          title: "Minecraft: Hora del Código ⛏️",
          platform: "codeorg",
          externalUrl: "https://code.org/es-ES/hour-of-code/minecraft",
          thumbnail: "img/minecraft.png",
          description: "Guiá a los personajes del universo Minecraft resolviendo desafíos con pensamiento computacional.",
          benefits: "Desarrolla el razonamiento lógico, la orientación espacial en 3D y el pensamiento estructurado.",
          tags: ["Code.org", "Minecraft", "Lógica"]
        },
        {
          id: "s5-g3",
          title: "Ana y Elsa (Frozen) ❄️",
          platform: "codeorg",
          externalUrl: "https://studio.code.org/es/courses/frozen/units/1/lessons/1/levels/1",
          thumbnail: "img/frozen.png",
          description: "Acompañá a Ana y Elsa a patinar mientras crean hermosos patrones geométricos y copos de nieve con código.",
          benefits: "Introduce nociones de geometría, ángulos y bucles visuales de manera atractiva.",
          tags: ["Code.org", "Frozen", "Geometría"]
        },
        {
          id: "s5-g4",
          title: "Angry Birds 🐦",
          platform: "codeorg",
          externalUrl: "https://studio.code.org/es/hoc/1",
          thumbnail: "img/angrybirds.png",
          description: "Ayudá a los Angry Birds a recorrer el laberinto programando sus giros y avances paso a paso.",
          benefits: "Refuerza la secuenciación de algoritmos, la lateralidad y el método de prueba y error.",
          tags: ["Code.org", "Angry Birds", "Algoritmos"]
        }
      ],

      /* ---- PROYECTOS REALES (5 AÑOS) ---- */
      projects: [
        {
          id: "s5-p1",
          title: "El Sombrero Luminoso de San Patricio 🍀🎩",
          author: "Taller Maker Sala 5",
          date: "Marzo 2026",
          type: "electronica",
          coverImage: "img/proyectos/sombrero_san_patricio_color.png",
          description: "¡Primer proyecto oficial de la Sala de 5 años! Construimos un auténtico sombrero de San Patricio con vincha que se ilumina mágicamente al calzártelo en la cabeza. Usamos cinta de cobre conductora, un diodo LED verde en el trébol, una pila de botón CR2032 y un interruptor de contacto que se activa con la presión de la cabeza.",
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
          title: "Scratch Jr 🎨",
          platform: "codejr",
          externalUrl: "https://codejr.org",
          thumbnail: "img/scratchjr.png",
          description: "Crea personajes, proyectos interactivos y animaciones combinando bloques con símbolos intuitivos.",
          benefits: "Potencia la lógica de programación, el diseño de historias y la estructuración de ideas.",
          tags: ["Scratch Jr", "Bloques", "Iniciación"]
        },
        {
          id: "g1-g2",
          title: "Minecraft: Hora del Código ⛏️",
          platform: "codeorg",
          externalUrl: "https://code.org/es-ES/hour-of-code/minecraft",
          thumbnail: "img/minecraft.png",
          description: "Resolvé los desafíos de construcciones y recolección de recursos en Minecraft usando código en bloques.",
          benefits: "Fortalece la resolución de problemas complejas y la comprensión de algoritmos secuenciales.",
          tags: ["Code.org", "Minecraft", "Lógica"]
        },
        {
          id: "g1-g3",
          title: "Ana y Elsa (Frozen) ❄️",
          platform: "codeorg",
          externalUrl: "https://studio.code.org/es/courses/frozen/units/1/lessons/1/levels/1",
          thumbnail: "img/frozen.png",
          description: "Programá los trazos de patinaje sobre hielo con Ana y Elsa diseñando figuras y cristales geométricos.",
          benefits: "Enseña bucles de repetición, trazado de líneas y apreciación artística mediante código.",
          tags: ["Code.org", "Frozen", "Geometría"]
        },
        {
          id: "g1-g4",
          title: "Angry Birds 🐦",
          platform: "codeorg",
          externalUrl: "https://studio.code.org/es/hoc/1",
          thumbnail: "img/angrybirds.png",
          description: "Superá los niveles del laberinto ordenando bloques de movimiento para que el pájaro atrape al cerdo.",
          benefits: "Desarrolla el pensamiento algorítmico, la depuración de errores y la anticipación de soluciones.",
          tags: ["Code.org", "Angry Birds", "Algoritmos"]
        }
      ],

      projects: [
        {
          id: "g1-p1",
          title: "El Laberinto del Taller 🗺️",
          author: "Grupo 1° Grado",
          date: "Agosto 2026",
          coverImage: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=600&q=80",
          description: "Resolvimos laberintos en Code.org dando instrucciones paso a paso. Aprendimos que una computadora solo hace exactamente lo que le decimos, ¡ni más ni menos!",
          tags: ["Code.org", "Laberinto", "Lógica"],
          gallery: [
            "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=600&q=80",
            "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=600&q=80"
          ],
          pdfUrl: null,
          makecodeUrl: null,
          scratchId: null,
          materials: [
            {
              title: "Ficha de Actividades: Flechas y Direcciones",
              type: "Ficha Didáctica",
              icon: "fas fa-file-alt",
              description: "Guía impresa que usamos en el aula para trazar recorridos en papel antes de pasar a la computadora."
            }
          ]
        },
        {
          id: "g1-p2",
          title: "El Bicho Robot Saltador (Vibro-Bot) 🐞",
          author: "Taller 1° Grado",
          date: "Septiembre 2026",
          type: "electronica",
          coverImage: "img/microbit.png",
          description: "¡Robótica manual sin pantallas ni programación! Construimos un simpático insecto mecánico usando un pequeño motor vibrador y un cepillo. Al cerrar el circuito con un clip, ¡el bicho sale corriendo y vibrando por la mesa!",
          tags: ["Electrónica", "Sin programación", "Robótica", "Motores"],
          gallery: [
            "img/microbit.png"
          ],
          pdfUrl: null,
          makecodeUrl: null,
          scratchId: null,
          materials: [
            { title: "1 Mini motor vibrador 3V", description: "Genera vibraciones rápidas que impulsan al robot" },
            { title: "1 Pila de botón CR2032 o 2 pilas AAA", description: "Energía segura para activar el motor" },
            { title: "1 Cabezal de cepillo de dientes viejo", description: "Las cerdas actúan como patas que transmiten el movimiento" },
            { title: "Cinta doble faz y gomitas elásticas", description: "Para sujetar el motor y la pila sobre el cepillo" },
            { title: "Limpiapipas y ojitos móviles", description: "Antenas y decoración del bicho robot" }
          ],
          instructions: [
            {
              step: 1,
              title: "Preparar el cabezal del cepillo",
              desc: "Cortamos el mango de un cepillo viejo dejando solo el cabezal con cerdas. Nos aseguramos de que quede plano y firme sobre la mesa.",
              tip: "Las cerdas inclinadas hacia atrás harán que avance más rápido."
            },
            {
              step: 2,
              title: "Fijar la cinta doble faz",
              desc: "Pegamos un trozo de cinta bifaz o silicona fría sobre el lomo del cepillo de dientes.",
              tip: "Debe quedar bien adherido para soportar la vibración."
            },
            {
              step: 3,
              title: "Instalar el mini motor vibrador",
              desc: "Colocamos el motor en la parte delantera con la masa excéntrica girando libremente sin tocar el plástico.",
              tip: "Si el eje roza con el plástico, el motor no podrá girar."
            },
            {
              step: 4,
              title: "Conectar los cables a la pila",
              desc: "Pegamos el cable azul/negro del motor con cinta conductora a la cara rugosa (-) de la pila.",
              tip: "Dejamos el cable rojo suelto para usarlo de interruptor."
            },
            {
              step: 5,
              title: "Fijar la pila y crear el interruptor",
              desc: "Pegamos la pila sobre el lomo del cepillo. Con un clip metálico o cinta, conectamos el cable rojo (+) a la cara lisa (+) para encenderlo.",
              tip: "Al despegar el cable o abrir el clip, el robot se apaga."
            },
            {
              step: 6,
              title: "¡Decoración y carrera de robots!",
              desc: "Pegamos ojitos locos y dos limpiapipas como antenas. ¡Apoyamos el bicho en la mesa y lo vemos bailar y vibrar a toda velocidad!",
              tip: "Probá cambiar el peso en la punta para que cambie de dirección."
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
          title: "Neon Cyber Runner — Proyecto Final ⚡",
          author: "Florencia A. y Agustín B.",
          date: "Agosto 2026",
          coverImage: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80",
          description: "Videojuego arcade de JavaScript con Canvas HTML5, física de salto, sistema de partículas y sintetizador Web Audio API.",
          tags: ["JavaScript", "Canvas API", "Web Audio API", "Proyecto Final"],
          gallery: [
            "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80",
            "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=600&q=80",
            "https://images.unsplash.com/photo-1547658719-da2b51169166?auto=format&fit=crop&w=600&q=80"
          ],
          pdfUrl: null,
          makecodeUrl: null,
          scratchId: null,
          materials: [
            {
              title: "Manual Técnico de Desarrollo",
              type: "Documentación",
              icon: "fas fa-book",
              description: "Estructura del motor del juego: clases Player, Obstacle, ParticleSystem y ScoreManager."
            }
          ]
        },
        {
          id: "g6-p2",
          title: "Mi Primera Página Web Personal 🌐",
          author: "Grupo 6° Grado",
          date: "Agosto 2026",
          coverImage: "https://images.unsplash.com/photo-1547658719-da2b51169166?auto=format&fit=crop&w=600&q=80",
          description: "Cada alumno de 6° diseñó y programó su propia página web con HTML y CSS desde cero.",
          tags: ["HTML5", "CSS3", "Diseño Web"],
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
              icon: "fas fa-file-code",
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
  // Sala de 5 años
  sala5: [
    {
      title: "Carita Feliz y Guiño 😃",
      description: "Al pulsar el botón A la micro:bit sonríe, y con el botón B nos guiña un ojo. ¡Primeros pasos en programación!",
      shareUrl: "https://makecode.microbit.org/S18043-28109-69626-83440"
    }
  ],

  // 1° Grado
  grado1: [
    {
      title: "Proyecto Micro:bit — Ejemplo",
      description: "Código de bloques en MakeCode para Micro:bit (solo lectura)",
      shareUrl: "https://makecode.microbit.org/S18043-28109-69626-83440"
    }
  ],

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
      title: "Proyecto Micro:bit — Ejemplo",
      description: "Código de bloques en MakeCode para Micro:bit (solo lectura)",
      shareUrl: "https://makecode.microbit.org/S18043-28109-69626-83440"
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
        snapshot.forEach((doc) => {
          const gradeId = doc.id;
          if (gradeId === 'sala5') hasSala5 = true;
          const data = doc.data();
          if (Array.isArray(data.items) && data.items.length > 0) {
            MAKECODE_LIBRARY[gradeId] = data.items;
          }
        });
        // Si falta sala5 en la nube, guardarlo
        if (!hasSala5) {
          seedMakecodeLibraryToFirestore();
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
          seedGradeProjectsToFirestore();
          return;
        }
        let hasSala5 = false;
        snapshot.forEach((doc) => {
          const gradeId = doc.id;
          if (gradeId === 'sala5') hasSala5 = true;
          const data = doc.data();
          const targetProjects = data.projects || data.items;
          if (Array.isArray(targetProjects) && targetProjects.length > 0) {
            const gradeObj = window.SCHOOL_DATA.grades.find(g => g.id === gradeId);
            if (gradeObj) {
              gradeObj.projects = targetProjects;
            }
          }
        });
        if (!hasSala5) {
          seedGradeProjectsToFirestore();
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
