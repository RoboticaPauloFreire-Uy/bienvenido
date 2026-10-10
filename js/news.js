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
      bajada: 'Una aventura de enigmas, códigos secretos y acertijos pensada para todas las edades.',
      cuerpo: [
        'Lanzamos una nueva propuesta para compartir en casa: un escape room digital lleno de pistas nostálgicas.',
        'La idea es que chicos y grandes trabajen en equipo para descifrar códigos y resolver acertijos. ¡Los abuelos tienen ventaja en algunas pistas!',
        'Se juega desde cualquier navegador, en computadora, tablet o celular.'
      ],
      fecha: '2026-10-02',
      categoria: 'familias',
      grado: 'todos',
      imagen: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
      links: [
        { texto: 'Entrar al Escape Room', url: 'https://roboticapaulofreire-uy.github.io/escape-rooms-nostalgico/index.html', icono: 'fas fa-key' }
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
      descripcion: 'Resolvé enigmas y pistas nostálgicas en familia. Una experiencia colaborativa y divertida para todas las edades.',
      tipo: 'familia',
      grados: ['todos'],
      icono: '🗝️',
      color: '#3949AB',
      desde: '2026-10-01',
      hasta: '2026-11-30',
      botones: [
        { texto: 'Jugar', url: 'https://roboticapaulofreire-uy.github.io/escape-rooms-nostalgico/index.html', icono: 'fas fa-external-link-alt', principal: true }
      ]
    },
    {
      id: 'act-inventario',
      titulo: 'Inventario de Material del Taller Maker',
      descripcion: '¿Qué herramientas, sensores y componentes usamos? Observá, clasificá, contá y relacioná los materiales de robótica y circuitos.',
      tipo: 'casa',
      grados: ['todos'],
      icono: '🧰',
      color: '#2E7D32',
      imagen: 'https://lh3.googleusercontent.com/d/10EGSDHn36iWy5n5XxX1utxxmyxdKkEwo',
      desde: '2026-09-01',
      botones: [
        { texto: 'Ver ficha', imagenModal: 'https://lh3.googleusercontent.com/d/10EGSDHn36iWy5n5XxX1utxxmyxdKkEwo', descarga: 'https://drive.google.com/uc?export=download&id=10EGSDHn36iWy5n5XxX1utxxmyxdKkEwo', icono: 'fas fa-eye', principal: true },
        { texto: 'Descargar', url: 'https://drive.google.com/uc?export=download&id=10EGSDHn36iWy5n5XxX1utxxmyxdKkEwo', icono: 'fas fa-download' },
        { texto: 'Drive', url: 'https://drive.google.com/drive/folders/1axzC6xBTXxhvAi8VM2P4j3ywKsNonovK?usp=sharing', icono: 'fab fa-google-drive' }
      ]
    },
    {
      id: 'act-simulador',
      titulo: 'Programá la micro:bit desde casa',
      descripcion: 'Con el simulador oficial y gratuito de MakeCode podés probar luces, botones, brújula y sonidos en la pantalla, sin tener la placa.',
      tipo: 'casa',
      grados: ['grado3', 'grado4', 'grado5', 'grado6'],
      icono: '💻',
      color: '#1D4ED8',
      desde: '2026-09-01',
      botones: [
        { texto: 'Abrir MakeCode', url: 'https://makecode.microbit.org/', icono: 'fas fa-external-link-alt', principal: true }
      ]
    },
    {
      id: 'act-reciclaje',
      titulo: 'Juntamos materiales para el taller',
      descripcion: '¡En casa no tiramos nada! Guardamos cajas de cartón fino, tubos, tapitas, clips y papel de aluminio. Traelos los días de taller.',
      tipo: 'familia',
      grados: ['todos'],
      icono: '📦',
      color: '#C2410C',
      desde: '2026-09-01',
      hasta: '2026-12-05',
      chips: ['📦 Cajas', '🧻 Tubos', '🔴 Tapitas', '📎 Clips', '🥫 Aluminio']
    },
    {
      id: 'act-guitarra',
      titulo: 'Guitarra musical de cartón',
      descripcion: 'Diseñamos el cuerpo en cartón corrugado, sumamos cinta conductora y programamos notas musicales en la micro:bit.',
      tipo: 'clase',
      grados: ['grado3'],
      icono: '🎸',
      color: '#00838F',
      desde: '2026-10-05',
      hasta: '2026-10-30'
    },
    {
      id: 'act-cuento-scratch',
      titulo: 'Cuento interactivo en Scratch',
      descripcion: 'Escribimos el guion, diseñamos escenarios y programamos personajes que reaccionan al hacer click.',
      tipo: 'clase',
      grados: ['grado2'],
      icono: '📖',
      color: '#6A1B9A',
      desde: '2026-10-05',
      hasta: '2026-11-13',
      botones: [
        { texto: 'Abrir Scratch', url: 'https://scratch.mit.edu/projects/editor/', icono: 'fas fa-external-link-alt', principal: true }
      ]
    },
    {
      id: 'act-semaforo',
      titulo: 'Semáforo inteligente',
      descripcion: 'Estructura de cartón, LEDs de colores y micro:bit para programar la secuencia rojo-amarillo-verde con temporizadores.',
      tipo: 'clase',
      grados: ['grado4'],
      icono: '🚦',
      color: '#EF6C00',
      desde: '2026-09-14',
      hasta: '2026-10-03'
    },
    {
      id: 'act-servo-joystick',
      titulo: 'Servomotor con joystick',
      descripcion: 'Conectamos un servomotor y un joystick a la micro:bit y programamos en MakeCode el movimiento del brazo robótico.',
      tipo: 'clase',
      grados: ['grado5'],
      icono: '🕹️',
      color: '#2E7D32',
      imagen: 'img/proyectos/servo_joystick_makecode_cover.svg',
      desde: '2026-09-28',
      hasta: '2026-10-24'
    },
    {
      id: 'act-arquero-ia',
      titulo: 'El arquero con IA en Canva',
      descripcion: 'Foto en el aula, quitafondos con IA y Magic Animate para convertirnos en arqueros animados.',
      tipo: 'clase',
      grados: ['grado6'],
      icono: '🧤',
      color: '#C2185B',
      imagen: 'img/proyectos/canva_arquero_ia_cover.svg',
      desde: '2026-10-01',
      hasta: '2026-10-17',
      botones: [
        { texto: 'Abrir Canva', url: 'https://www.canva.com/', icono: 'fas fa-external-link-alt', principal: true }
      ]
    },
    {
      id: 'act-banderas-paint',
      titulo: 'Banderas del Mundial en Paint',
      descripcion: 'Usamos formas, rellenos y colores en Paint para recrear banderas y armar una cancha de fútbol digital.',
      tipo: 'clase',
      grados: ['grado2'],
      icono: '🎨',
      color: '#6A1B9A',
      imagen: 'img/proyectos/banderas_mundial_paint_cover.png',
      desde: '2026-09-15',
      hasta: '2026-10-10'
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
