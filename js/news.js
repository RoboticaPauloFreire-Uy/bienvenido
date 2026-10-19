/**
 * =============================================================
 * NEWS.JS — CONTENIDO DE LA PÁGINA PRINCIPAL
 * Colegio Paulo Freire · Taller de Programación
 * =============================================================
 *
 * ✏️  CÓMO PUBLICAR CONTENIDO
 * -------------------------------------------------------------
 * Este es el ÚNICO archivo que hay que editar para actualizar
 * la página de inicio. Copiá un bloque { ... }, pegalo arriba
 * de todo en la lista correspondiente y cambiá los textos.
 *
 *  • avisos       → frases cortas de la barra "Último momento".
 *  • noticias     → notas con foto. La que tenga destacada:true
 *                   aparece grande arriba (si hay varias, la más
 *                   reciente).
 *  • actividades  → se dividen en dos secciones: EN CLASE y
 *                   EN CASA (según el campo 'tipo').
 *  • agenda       → próximas fechas (las fechas pasadas se
 *                   ocultan solas).
 *
 * 📅 Fechas: siempre en formato 'AAAA-MM-DD'  (ej. '2026-10-09')
 *
 * 🏷️ Categorías de noticias:  'taller' | 'proyectos' | 'eventos' | 'familias'
 * 🧩 Tipos de actividades (definen la sección donde aparecen):
 *      'clase'   → sección 🏫 EN CLASE
 *      'casa'    → sección 🏠 EN CASA (para hacer solo)
 *      'familia' → sección 🏠 EN CASA (para hacer en familia)
 * 🎓 Grados:  'todos' | 'sala5' | 'grado1' | 'grado2' | 'grado3'
 *             | 'grado4' | 'grado5' | 'grado6'
 *             (en actividades se puede poner una lista: ['grado3','grado4'])
 *
 * 🖼️ Imágenes: ruta local (img/proyectos/archivo.png) o URL.
 * 📝 cuerpo:   lista de párrafos (cada texto entre comillas es un párrafo).
 * =============================================================
 */

window.HOME_CONTENT = {

  /* ───────────── AVISOS (barra superior) ───────────── */
  avisos: [
    '🆕 Nueva actividad en familia: Escape Rooms Nostálgico',
    '📦 Seguimos juntando cartón, tapitas y tubos para los proyectos maker',
    '💻 ¿Sin micro:bit en casa? Usá el simulador gratuito de MakeCode',
    '📸 Ya están en las carpetas de Drive las fotos de los últimos proyectos'
  ],

  /* ───────────── NOTICIAS ───────────── */
  noticias: [
    {
      id: 'arquero-ia-canva',
      titulo: '6° Grado se convirtió en arquero gracias a la Inteligencia Artificial',
      bajada: 'Con Canva y herramientas de IA, cada alumno armó un fotomontaje animado atajando un penal.',
      cuerpo: [
        'Los alumnos de 6° se sacaron una foto en el aula, la subieron a Canva y usaron el Quitafondos con IA para aislar su cabeza.',
        'Después la montaron sobre la imagen de un arquero y, con la función Magic Animate, transformaron el fotomontaje en una animación de atajada que exportaron como video MP4 o GIF.',
        'Además de divertirse, conversamos sobre cómo funcionan estas herramientas y la importancia de usar la IA de forma responsable, pidiendo permiso antes de usar la imagen de otra persona.'
      ],
      fecha: '2026-10-06',
      categoria: 'proyectos',
      grado: 'grado6',
      imagen: 'img/proyectos/canva_arquero_ia_cover.svg',
      destacada: true,
      links: [
        { texto: 'Ir al aula de 6° Grado', url: 'aula.html?grado=grado6', icono: 'fas fa-chalkboard' }
      ]
    },
    {
      id: 'escape-room-nostalgico',
      titulo: 'Llegó el Escape Rooms Nostálgico para jugar en familia',
      bajada: 'Una emocionante aventura de enigmas, códigos secretos y cultura retro diseñada para compartir y jugar en familia.',
      datos: [
        { icono: 'fas fa-users', etiqueta: 'Equipo recomendado', valor: 'Chicos con padres y abuelos' },
        { icono: 'fas fa-clock', etiqueta: 'Duración estimada', valor: '30 a 45 min (sin límite de tiempo)' },
        { icono: 'fas fa-laptop-house', etiqueta: 'Dispositivos', valor: '100% Online (PC, Tablet o Celular)' },
        { icono: 'fas fa-puzzle-piece', etiqueta: 'Habilidades', valor: 'Lógica, memoria e ingenio' }
      ],
      cuerpo: [
        '¡Te damos la bienvenida al **Escape Rooms Nostálgico**! Una experiencia digital interactiva creada por el Taller de Robótica y Programación para unir a distintas generaciones en torno a un gran misterio.',
        'El juego recorre salas temáticas repletas de recuerdos: arcades de fichines, cassettes de audio, consolas clásicas, juguetes retro y tecnología de décadas pasadas.',
        '🧩 **El valor del trabajo cooperativo:**\nPara superar cada habitación se necesita verdadero trabajo en equipo: los chicos aportan su agilidad visual y destreza digital, mientras que los adultos y abuelos tienen la clave para reconocer aparatos, música y referencias de su época que no se encuentran fácilmente en Google.',
        '🚀 **¿Cómo jugar paso a paso?**\n1. Hacé clic en el botón de abajo para ingresar a la sala virtual.\n2. Lean atentamente la historia y exploren cada rincón de la pantalla.\n3. Descifren las pistas y prueben las combinaciones secretas.\n4. ¡Completen el recorrido y desbloqueen el cofre final del tiempo!'
      ],
      fecha: '2026-10-02',
      categoria: 'familias',
      grado: 'todos',
      imagen: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
      links: [
        { texto: 'Jugar al Escape Room ahora', url: 'https://roboticapaulofreire-uy.github.io/escape-rooms-nostalgico/index.html', icono: 'fas fa-gamepad' }
      ]
    },
    {
      id: 'servo-joystick',
      titulo: 'Servomotores y joystick: 5° Grado le da movimiento a sus robots',
      bajada: 'Programamos en MakeCode un servomotor controlado con joystick y la placa micro:bit.',
      cuerpo: [
        'En 5° Grado dimos un paso más en robótica: aprendimos qué es un servomotor y cómo controlar su ángulo desde la micro:bit.',
        'Conectamos un joystick para mover el servo en tiempo real y pensamos usos posibles: barreras, brazos robóticos, timones y hasta un limpiaparabrisas de cartón.'
      ],
      fecha: '2026-09-29',
      categoria: 'taller',
      grado: 'grado5',
      imagen: 'img/proyectos/servo_joystick_makecode_cover.svg',
      links: [
        { texto: 'Abrir MakeCode', url: 'https://makecode.microbit.org/', icono: 'fas fa-laptop-code' }
      ]
    },
    {
      id: 'banderas-mundial',
      titulo: 'Banderas del Mundial pintadas en Paint',
      bajada: 'Practicamos herramientas de dibujo digital recreando banderas de los países del Mundial.',
      cuerpo: [
        'Usando Paint, los chicos trabajaron formas, rellenos y colores para recrear banderas de distintos países.',
        'También armamos una cancha de fútbol digital donde ubicaron a los equipos. ¡Un trabajo que unió geografía, deporte y tecnología!'
      ],
      fecha: '2026-09-22',
      categoria: 'proyectos',
      grado: 'grado2',
      imagen: 'img/proyectos/banderas_mundial_paint_cover.png',
      galeria: [
        'img/proyectos/banderas_mundial_paint_cover.png',
        'img/proyectos/cancha_futbol_paint_cover.png'
      ]
    },
    {
      id: 'varita-magica',
      titulo: 'Varitas mágicas que se encienden con un circuito de papel',
      bajada: 'Cinta de cobre, una pila botón y un LED: la magia también se programa (y se construye).',
      cuerpo: [
        'Armamos varitas con materiales reciclados y un circuito simple con cinta conductora, pila CR2032 y un LED.',
        'Aprendimos qué es un circuito cerrado y por qué la luz se enciende sólo cuando lo cerramos.'
      ],
      fecha: '2026-09-15',
      categoria: 'taller',
      grado: 'grado3',
      imagen: 'img/proyectos/varita_magica_cover.png',
      galeria: [
        'img/proyectos/varita_magica_cover.png',
        'img/proyectos/varita_magica_circuito.png'
      ]
    },
    {
      id: 'marcalibros-tom-sawyer',
      titulo: 'El marca-libros origami de Tom Sawyer se ilumina',
      bajada: '1° Grado combinó lectura, origami y electrónica en un solo proyecto.',
      cuerpo: [
        'Doblamos una hoja de papel glacé en origami para calzarla en la esquina del libro y montamos un circuito con un LED chato en el gorro de Tom Sawyer.',
        'Un proyecto ideal para seguir leyendo en casa… ¡con luz propia!'
      ],
      fecha: '2026-09-08',
      categoria: 'proyectos',
      grado: 'grado1',
      imagen: 'img/proyectos/tomsawyer_marcalibro_cover.svg',
      galeria: [
        'img/proyectos/marcalibros_origami_guia.png'
      ]
    },
    {
      id: 'sombrero-san-patricio',
      titulo: 'Sala de 5 creó el sombrero luminoso de San Patricio',
      bajada: 'Un trébol que se enciende con un interruptor que se activa con la cabeza.',
      cuerpo: [
        'Los más chiquitos construyeron un sombrero con vincha que enciende un LED verde en el trébol, usando cinta de cobre conductora y una pila botón.',
        'Pintaron, recortaron y armaron cada pieza. ¡Quedaron hermosos!'
      ],
      fecha: '2026-08-25',
      categoria: 'proyectos',
      grado: 'sala5',
      imagen: 'img/proyectos/sombrero_san_patricio_banner.png',
      galeria: [
        'img/proyectos/sombrero_san_patricio_color.png',
        'img/proyectos/sombrero_san_patricio_circuito.png',
        'img/proyectos/sombrero_san_patricio_solo_sombrero.png'
      ]
    },
    {
      id: 'dia-madre-tarjeta',
      titulo: 'Tarjetas 3D con luz para el Día de la Madre',
      bajada: 'Un regalo hecho a mano con un circuito escondido que enciende un corazón.',
      cuerpo: [
        'Cada alumno diseñó su tarjeta pop-up y le sumó un pequeño circuito de papel para iluminar el mensaje.',
        'En la carpeta de Drive del grado está la plantilla para repetirla en casa.'
      ],
      fecha: '2026-08-10',
      categoria: 'eventos',
      grado: 'grado4',
      imagen: 'img/proyectos/dia_madre_tarjeta_3d_cover.png',
      galeria: [
        'img/proyectos/dia_madre_tarjeta_3d_cover.png',
        'img/proyectos/dia_madre_circuito_plantilla.png'
      ]
    }
  ],

  /* ───────────── ACTIVIDADES ───────────── */
  actividades: [
    {
      id: 'act-escape-room',
      titulo: 'Escape Rooms Nostálgico',
      descripcion: 'Resolvé enigmas y pistas nostálgicas en familia. Una experiencia interactiva cooperativa y divertida para todas las edades.',
      tipo: 'familia',
      modalidad: 'juego',
      materiales: 'Celular, tablet o computadora (100% online, sin instalar nada)',
      grados: ['todos'],
      icono: '🗝️',
      color: '#4F46E5',
      desde: '2026-10-01',
      hasta: '2026-11-30',
      botones: [
        { texto: '¡Jugar Ahora!', url: 'https://roboticapaulofreire-uy.github.io/escape-rooms-nostalgico/index.html', icono: 'fas fa-gamepad', principal: true }
      ]
    },


    {
      id: 'act-libro-hechizos',
      titulo: 'Libro de Hechizos — Grimorio Mágico',
      descripcion: 'Grimorio digital interactivo en 3D. Pasá las páginas con sonido real, forjá tus propios hechizos mágicos con inteligencia artificial y explorá las creaciones del taller de robótica y arte digital.',
      tipo: 'casa',
      modalidad: 'maker',
      materiales: 'Celular, tablet o computadora (100% online, sin instalar nada)',
      grados: ['todos'],
      icono: '📖',
      color: '#7C3AED',
      desde: '2026-10-19',
      hasta: '2026-12-15',
      chips: ['✨ Magia e IA', '📖 Grimorio 3D', '🧙 Hechizos', '🎨 Arte Digital'],
      botones: [
        { texto: '¡Abrir Grimorio!', url: 'https://roboticapaulofreire-uy.github.io/libro_hechizos/', icono: 'fas fa-book-open', principal: true },
        { texto: 'Descargar PDF', url: 'https://roboticapaulofreire-uy.github.io/libro_hechizos/libro_de_hechizos.pdf', icono: 'fas fa-file-pdf' }
      ]
    },

    {
      id: 'act-inventario',
      titulo: 'Inventario de Materiales Maker',
      descripcion: '¿Qué herramientas, sensores y componentes usamos en el taller? Observá, clasificá y reconocé los materiales de robótica en casa.',
      tipo: 'casa',
      modalidad: 'maker',
      materiales: 'Lápiz, colores y ficha descargable (impresa o en pantalla)',
      grados: ['todos'],
      icono: '🧰',
      color: '#2E7D32',
      imagen: 'https://lh3.googleusercontent.com/d/10EGSDHn36iWy5n5XxX1utxxmyxdKkEwo',
      desde: '2026-09-01',
      botones: [
        { texto: 'Ver Ficha Maker', imagenModal: 'https://lh3.googleusercontent.com/d/10EGSDHn36iWy5n5XxX1utxxmyxdKkEwo', descarga: 'https://drive.google.com/uc?export=download&id=10EGSDHn36iWy5n5XxX1utxxmyxdKkEwo', icono: 'fas fa-eye', principal: true },
        { texto: 'Descargar PDF', url: 'https://drive.google.com/uc?export=download&id=10EGSDHn36iWy5n5XxX1utxxmyxdKkEwo', icono: 'fas fa-download' }
      ]
    },

    {
      id: 'act-guitarra',
      titulo: 'Guitarra musical de cartón',
      subtitulo: 'Los alumnos construyen su propio instrumento electroacústico y programan acordes interactivos con micro:bit.',
      descripcion: 'Diseñamos el cuerpo en cartón corrugado, sumamos cinta conductora y programamos notas musicales en la micro:bit.\n\nEn este proyecto de clase, los chicos experimentan con la conductividad eléctrica y los sintetizadores sonoros, aprendiendo nociones fundamentales de acústica y lógica computacional.',
      tipo: 'clase',
      grados: ['grado3'],
      icono: '🎸',
      color: '#00838F',
      imagen: 'img/proyectos/varita_magica_cover.png',
      galeria: [
        'img/proyectos/varita_magica_cover.png',
        'img/proyectos/varita_magica_circuito.png'
      ],
      desde: '2026-10-30'
    },
    {
      id: 'act-cuento-scratch',
      titulo: 'Cuento interactivo en Scratch',
      subtitulo: 'Narrativa digital ramificada y animación de personajes con programación por bloques.',
      descripcion: 'Escribimos el guion, diseñamos escenarios y programamos personajes que reaccionan al hacer click.\n\nCada estudiante crea decisiones interactivas para que el lector pueda elegir su propio camino en la historia.',
      tipo: 'clase',
      grados: ['grado2'],
      icono: '📖',
      color: '#6A1B9A',
      desde: '2026-11-13',
      botones: [
        { texto: 'Abrir Scratch', url: 'https://scratch.mit.edu/projects/editor/', icono: 'fas fa-external-link-alt', principal: true }
      ]
    },
    {
      id: 'act-semaforo',
      titulo: 'Semáforo inteligente',
      subtitulo: 'Modelado urbano, ingeniería de circuitos viales y temporización con microcontroladores.',
      descripcion: 'Estructura de cartón, LEDs de colores y micro:bit para programar la secuencia rojo-amarillo-verde con temporizadores.\n\nLos estudiantes aplican conceptos de seguridad vial, diagramas de flujo y bucles condicionales para simular una esquina transitada.',
      tipo: 'clase',
      grados: ['grado4'],
      icono: '🚦',
      color: '#EF6C00',
      imagen: 'img/proyectos/dia_madre_tarjeta_3d_cover.png',
      galeria: [
        'img/proyectos/dia_madre_tarjeta_3d_cover.png',
        'img/proyectos/dia_madre_circuito_plantilla.png'
      ],
      desde: '2026-10-03'
    },
    {
      id: 'act-servo-joystick',
      titulo: 'Servomotor con joystick',
      subtitulo: 'Programación en MakeCode de potenciómetros analógicos y servomotores de precisión.',
      descripcion: 'Conectamos un servomotor y un joystick a la micro:bit y programamos en MakeCode el movimiento del brazo robótico.\n\nLos chicos exploran la conversión analógica-digital y el mapeo angular de 0° a 180° para controlar el arquero mecánico en el taller.',
      tipo: 'clase',
      grados: ['grado5'],
      icono: '🕹️',
      color: '#2E7D32',
      imagen: 'img/proyectos/servo_joystick_makecode_cover.svg',
      galeria: [
        'img/proyectos/servo_joystick_makecode_cover.svg',
        'img/proyectos/canva_arquero_ia_cover.svg'
      ],
      desde: '2026-10-24'
    },
    {
      id: 'act-arquero-ia',
      titulo: 'El arquero con IA en Canva',
      subtitulo: 'Composición gráfica, segmentación neuronal de siluetas y animación Magic Animate.',
      descripcion: 'Foto en el aula, quitafondos con IA y Magic Animate para convertirnos en arqueros animados.\n\nLos estudiantes aprenden sobre modelos de visión artificial y sintetizan animaciones dinámicas para sus proyectos digitales.',
      tipo: 'clase',
      grados: ['grado6'],
      icono: '🧤',
      color: '#C2185B',
      imagen: 'img/proyectos/canva_arquero_ia_cover.svg',
      galeria: [
        'img/proyectos/canva_arquero_ia_cover.svg',
        'img/proyectos/servo_joystick_makecode_cover.svg'
      ],
      desde: '2026-10-17',
      botones: [
        { texto: 'Abrir Canva', url: 'https://www.canva.com/', icono: 'fas fa-external-link-alt', principal: true }
      ]
    },
    {
      id: 'act-banderas-paint',
      titulo: 'Banderas del Mundial en Paint',
      subtitulo: 'Geometría computacional, paletas RGB y diseño vectorial en Microsoft Paint.',
      descripcion: 'Usamos formas, rellenos y colores en Paint para recrear banderas y armar una cancha de fútbol digital.\n\nUna propuesta donde los alumnos ejercitan la motricidad fina, simetrías de polígonos y coordenadas en el plano digital.',
      tipo: 'clase',
      grados: ['grado2'],
      icono: '🎨',
      color: '#6A1B9A',
      imagen: 'img/proyectos/banderas_mundial_paint_cover.png',
      galeria: [
        'img/proyectos/banderas_mundial_paint_cover.png',
        'img/proyectos/banderas_mundial_paint_guia.png',
        'img/proyectos/cancha_futbol_paint_cover.png'
      ],
      desde: '2026-10-10'
    },
    {
      id: 'act-minecraft',
      titulo: 'Hora del Código: Minecraft',
      descripcion: 'Seguimos practicando secuencias y bucles con los desafíos de Minecraft en Code.org. ¡Se puede seguir desde casa!',
      tipo: 'casa',
      grados: ['grado1', 'grado2'],
      icono: '⛏️',
      color: '#1565C0',
      imagen: 'img/minecraft.png',
      desde: '2026-09-01',
      botones: [
        { texto: 'Jugar en Code.org', url: 'https://code.org/minecraft', icono: 'fas fa-external-link-alt', principal: true }
      ]
    }
  ],

  /* ───────────── MURO (estilo Facebook para videos e imágenes) ───────────── */
  muro: [
    {
      id: 'muro-semaforo-video',
      autor: 'Taller de Robótica',
      avatar: 'img/escudo_paulo_freire.png',
      fecha: '2026-10-09',
      grado: 'grado4',
      etiqueta: '🏫 Actividad en clase',
      texto: '¡Así probamos hoy en el aula los semáforos inteligentes! 🚦🤖 Los chicos de 4° Grado conectaron los LEDs a la placa micro:bit, montaron la maqueta de cartón y programaron la secuencia de tránsito en MicroPython:\n\n```python\nfrom microbit import *\nimport time\n\n# Pines conectados a la maqueta de semáforo\nLED_ROJO = pin0\nLED_AMARILLO = pin1\nLED_VERDE = pin2\n\nwhile True:\n    # Fase 1: Paso vehicular habilitado\n    LED_VERDE.write_digital(1)\n    time.sleep(4)\n    LED_VERDE.write_digital(0)\n    \n    # Fase 2: Precaución / cambio de luz\n    LED_AMARILLO.write_digital(1)\n    time.sleep(1.5)\n    LED_AMARILLO.write_digital(0)\n    \n    # Fase 3: Detención y cruce peatonal seguro\n    LED_ROJO.write_digital(1)\n    display.show(Image.NO)\n    time.sleep(4)\n    LED_ROJO.write_digital(0)\n```\n\nEn este video pueden ver cómo reacciona el semáforo en tiempo real ante el paso de los autos. ¡Gran trabajo en equipo y lógica de programación!',
      tipoMedia: 'video',
      video: {
        tipo: 'youtube',
        url: 'https://www.youtube.com/embed/9Gz4n_N9g6E',
        poster: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=80',
        duracion: '1:15'
      },
      tags: ['Robótica', 'Microbit', 'EnElAula', '4toGrado']
    },
    {
      id: 'muro-servo-video',
      autor: 'Taller de Robótica & Programación',
      avatar: 'img/escudo_paulo_freire.png',
      fecha: '2026-10-07',
      grado: 'grado5',
      etiqueta: '🦾 Manos en la masa',
      texto: '¡Controlando servomotores con Joystick analógico! 🎮🕹️ Los alumnos de 5° Grado construyeron pinzas mecánicas con cartón reciclado y las articularon con servomotores SG90 y placa de expansión:\n\n```python\nfrom microbit import *\n\ndef mapear_angulo(val_analogico):\n    # Convierte rango del joystick 0-1023 a 0-180 grados\n    return int((val_analogico / 1023.0) * 180)\n\nwhile True:\n    eje_x = pin1.read_analog()\n    angulo = mapear_angulo(eje_x)\n    \n    # Configuración de pulso PWM a 50Hz para servo SG90\n    pin2.set_analog_period(20)\n    pulso_us = 500 + int((angulo / 180.0) * 1900)\n    pin2.write_analog(int(pulso_us * 1023 / 20000))\n    sleep(20)\n```\n\nMiren cómo responden con precisión milimétrica a cada movimiento de la palanca. ¡Cada clase son más autónomos y creativos!',
      tipoMedia: 'video',
      video: {
        tipo: 'youtube',
        url: 'https://www.youtube.com/embed/fJ9rUzIMcZQ',
        poster: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80',
        duracion: '0:50'
      },
      tags: ['Servomotores', 'Makers', 'CartonRobotics', '5toGrado']
    },
    {
      id: 'muro-circuitos-fotos',
      autor: 'Taller Inicial de Ciencias',
      avatar: 'img/escudo_paulo_freire.png',
      fecha: '2026-10-04',
      grado: 'sala5',
      grados: ['sala5', 'grado1'],
      etiquetaGrado: 'Sala de 5 · 1° Grado',
      etiqueta: '🎨 Creatividad digital',
      texto: '¡Luces que encienden historias! ⚡️🦖 Con Sala de 5 y 1° Grado experimentamos con masa conductora casera, pilas de botón y LEDs de colores. Descubrieron cómo cerrar un circuito y le dieron vida a sus propios dibujos de monstruos y naves espaciales. ¡Miren el brillo en sus caras al ver encender la luz!',
      tipoMedia: 'galeria',
      fotos: [
        'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1000&q=80'
      ],
      tags: ['CircuitosBlandos', 'SalaDe5', 'PrimerosPasos', 'ColegioPauloFreire']
    },
    {
      id: 'muro-scratch-ia-video',
      autor: 'Taller de Programación Avanzada',
      avatar: 'img/escudo_paulo_freire.png',
      fecha: '2026-10-01',
      grado: 'grado6',
      etiqueta: '⚽ Videojuegos & IA',
      texto: '¡Penales con Inteligencia Artificial! 🥅🧤 En 6° Grado conectaron la cámara web a Scratch usando reconocimiento de posturas. Cuando el alumno mueve sus manos hacia los costados, el arquero digital en la pantalla se lanza a tapar la pelota. ¡Un juegazo programado completamente por los chicos!',
      tipoMedia: 'video',
      video: {
        tipo: 'youtube',
        url: 'https://www.youtube.com/embed/bNpx7gpSqeI',
        poster: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80',
        duracion: '1:30'
      },
      tags: ['Scratch', 'InteligenciaArtificial', 'Videojuegos', '6toGrado']
    }
  ],

  /* ───────────── AGENDA ───────────── */
  agenda: [
    { fecha: '2026-10-16', titulo: 'Entrega: Semáforo inteligente (recuperación)', detalle: '4° Grado', icono: '🚦' },
    { fecha: '2026-10-23', titulo: 'Muestra de cuentos interactivos', detalle: '2° Grado · En el aula', icono: '📖' },
    { fecha: '2026-10-30', titulo: 'Cierre del proyecto Guitarra musical', detalle: '3° Grado', icono: '🎸' },
    { fecha: '2026-11-13', titulo: 'Semana de la Robótica', detalle: 'Todos los grados', icono: '🤖' },
    { fecha: '2026-11-27', titulo: 'Feria Maker abierta a las familias', detalle: 'Patio del colegio · 9:00 a 12:00', icono: '🎉' },
    { fecha: '2026-12-05', titulo: 'Último día para traer materiales reciclables', detalle: 'Todos los grados', icono: '📦' }
  ]
};
