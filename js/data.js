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

      /* ---- PROYECTOS ---- */
      projects: [
        {
          id: "s5-p1",
          title: "Nuestros Personajes Animados 🎨",
          author: "Estudiantes Sala 5",
          date: "Agosto 2026",
          coverImage: "img/scratchjr.png",
          description: "Cada nene de la Sala de 5 años creó y animó su propio personaje en Scratch Jr. Eligieron colores, movimientos y sonidos en su primera experiencia de programación conjunta.",
          tags: ["Scratch Jr", "Animación", "Primera vez"],
          gallery: [
            "img/scratchjr.png",
            "img/minecraft.png",
            "img/frozen.png"
          ],
          pdfUrl: null,
          makecodeUrl: null,
          scratchId: null,
          materials: null
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
      title: "Proyecto Micro:bit — Ejemplo",
      description: "Código de bloques en MakeCode para Micro:bit (solo lectura)",
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
}
