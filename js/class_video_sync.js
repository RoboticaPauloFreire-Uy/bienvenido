/**
 * =============================================================
 * CLASS_VIDEO_SYNC.JS — SALA DE VIDEO SINCRONIZADA EN VIVO (CINE DE CLASE)
 * Colegio Paulo Freire · Taller de Robótica, Programación & Cultura Maker
 * =============================================================
 * Permite al docente proyectar y controlar videos (YouTube o MP4) en tiempo real
 * sobre todas las computadoras del salón desde GitHub Pages usando Firebase Firestore,
 * sin requerir que los alumnos inicien sesión.
 */

(function () {
  'use strict';

  var DOC_COLLECTION = 'config';
  var DOC_ID = 'classroom_video_sync';
  var TEACHER_SESSION_KEY = 'pf_class_video_teacher_unlocked';
  var VALID_TEACHER_PINS = ['2026', '1234', 'paulo2026', 'admin123', 'robotica2026'];

  // Estado local del módulo
  var isTeacher = false;
  var hasJoinedAudio = false;
  var activeSubTab = 'expedientes'; // 'expedientes' | 'video'
  var remoteState = null;
  var lastAppliedSyncSeq = -1;
  var lastSeenCallSeq = -1;
  var isApplyingRemoteUpdate = false;
  var suppressLocalEventsUntil = 0;

  // Instancias de reproductores
  var currentMediaType = null; // 'youtube' | 'mp4'
  var currentMediaIdOrUrl = '';
  var ytPlayer = null;
  var ytApiReady = false;
  var ytPlayerReady = false;
  var html5Video = null;

  // Timers
  var teacherHeartbeatTimer = null;
  var uiProgressTimer = null;
  var isDraggingScrubber = false;

  // Estado inicial por defecto si el documento aún no existe en Firestore
  var DEFAULT_STATE = {
    videoUrl: 'https://www.youtube.com/watch?v=7afwV_aJcjk',
    videoType: 'youtube',
    youtubeId: '7afwV_aJcjk',
    title: 'Cine de Clase · Taller de Ciencia y Robótica',
    subtitle: 'Miramos y aprendemos todos juntos en sincronía con el Profesor',
    isPlaying: false,
    baseTime: 0,
    duration: 0,
    playbackRate: 1,
    lockedByTeacher: true,
    muteStudents: false,
    sessionActive: false,
    callStudentsSeq: 0,
    syncSeq: 1,
    updatedAtMs: Date.now(),
    playlist: [
      {
        id: 'vid-imanes-clase',
        title: '🧲 El Magnetismo y los Imanes para Niños',
        subtitle: 'Ciencia en Clase · Experimento El Fantasma Levitante',
        url: 'https://www.youtube.com/watch?v=7afwV_aJcjk',
        type: 'youtube'
      },
      {
        id: 'vid-que-es-robot',
        title: '🤖 ¿Qué es un Robot y cómo funciona?',
        subtitle: 'Introducción al Taller de Robótica Escolar',
        url: 'https://www.youtube.com/watch?v=wA9tO7m3v6U',
        type: 'youtube'
      }
    ]
  };

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatTime(sec) {
    sec = Math.max(0, Math.floor(Number(sec) || 0));
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return (m < 10 ? '0' + m : String(m)) + ':' + (s < 10 ? '0' + s : String(s));
  }

  /**
   * Extrae información de una URL de YouTube, Google Drive o archivo MP4/WebM directo
   */
  function parseVideoUrl(rawUrl) {
    var url = String(rawUrl || '').trim();
    if (!url) return null;

    // 1. Detectar enlaces de YouTube
    var ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
    var ytMatch = url.match(ytRegex);
    if (ytMatch && ytMatch[1]) {
      return {
        type: 'youtube',
        youtubeId: ytMatch[1],
        url: 'https://www.youtube.com/watch?v=' + ytMatch[1]
      };
    }

    // Si pegó directamente los 11 caracteres del ID de YouTube
    if (/^[A-Za-z0-9_-]{11}$/.test(url)) {
      return {
        type: 'youtube',
        youtubeId: url,
        url: 'https://www.youtube.com/watch?v=' + url
      };
    }

    // 2. Detectar enlaces de Google Drive y convertirlos a stream directo si es posible
    var gdriveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (gdriveMatch && gdriveMatch[1]) {
      return {
        type: 'mp4',
        youtubeId: '',
        url: 'https://drive.google.com/uc?export=download&id=' + gdriveMatch[1]
      };
    }

    // 3. Cualquier otra URL o ruta local (.mp4, .webm, .ogg, http...)
    return {
      type: 'mp4',
      youtubeId: '',
      url: url
    };
  }

  /**
   * Inicializa la interfaz dentro de #view-clase
   */
  function initClassVideoRoom() {
    var container = document.getElementById('clase-video-room-container');
    if (!container) return;

    // Restaurar sesión de profesor si ya puso el PIN en esta pestaña
    try {
      if (sessionStorage.getItem(TEACHER_SESSION_KEY) === 'true') {
        isTeacher = true;
        hasJoinedAudio = true;
      }
    } catch (e) {}

    renderRoomSkeleton(container);
    bindStaticEvents();
    loadYouTubeApiIfNeeded();
    connectFirestoreListener();
    startUiTimers();

    // Verificar si el hash de la URL pide ir directo al cine de clase
    checkUrlHashForVideo();
    window.addEventListener('hashchange', checkUrlHashForVideo);
  }

  function checkUrlHashForVideo() {
    var h = (location.hash || '').replace(/^#/, '').trim().toLowerCase();
    if (h === 'clase-video' || h === 'cine' || h === 'video-clase') {
      if (typeof window.switchView === 'function') {
        window.switchView('clase', false);
      }
      switchClaseSubTab('video');
    }
  }

  /**
   * Alterna entre "Expedientes de Aula" y "Sala de Video en Vivo" dentro de Clase
   */
  function switchClaseSubTab(tabName) {
    activeSubTab = tabName === 'video' ? 'video' : 'expedientes';

    var expWrap = document.getElementById('clase-expedientes-wrap');
    var vidWrap = document.getElementById('clase-video-room-container');
    var filterWrap = document.getElementById('hn-clase-filter-wrap');
    var tabExpBtn = document.getElementById('btn-clase-tab-expedientes');
    var tabVidBtn = document.getElementById('btn-clase-tab-video');

    if (expWrap) expWrap.style.display = activeSubTab === 'expedientes' ? '' : 'none';
    if (vidWrap) vidWrap.style.display = activeSubTab === 'video' ? 'block' : 'none';
    if (filterWrap) filterWrap.style.display = activeSubTab === 'expedientes' ? '' : 'none';

    if (tabExpBtn) tabExpBtn.classList.toggle('active', activeSubTab === 'expedientes');
    if (tabVidBtn) tabVidBtn.classList.toggle('active', activeSubTab === 'video');

    // Si entramos a la pestaña de video y hay estado remoto, asegurar que el reproductor esté cargado y sincronizado
    if (activeSubTab === 'video' && remoteState) {
      setTimeout(function () {
        applyRemoteStateToPlayer(remoteState, true);
      }, 150);
    }
  }
  window.switchClaseSubTab = switchClaseSubTab;

  /**
   * Renderiza la estructura HTML completa de la Sala de Video Sincronizada
   */
  function renderRoomSkeleton(container) {
    container.innerHTML =
      '<div class="cvs-wrapper">' +

        /* ── CABECERA DE LA SALA DE PROYECCIÓN ── */
        '<div class="cvs-header-bar">' +
          '<div class="cvs-header-left">' +
            '<span class="cvs-live-pill" id="cvs-live-pill">' +
              '<span class="cvs-live-dot"></span>' +
              '<span id="cvs-live-pill-text">SALA SINCRONIZADA</span>' +
            '</span>' +
            '<div class="cvs-title-group">' +
              '<h3 class="cvs-video-title" id="cvs-video-title">Cargando Sala de Video...</h3>' +
              '<p class="cvs-video-sub" id="cvs-video-sub">Conectando en tiempo real con el Taller...</p>' +
            '</div>' +
          '</div>' +

          '<div class="cvs-header-right">' +
            '<span class="cvs-mode-indicator" id="cvs-mode-indicator">' +
              '<i class="fas fa-lock"></i> <span>Control del Profesor</span>' +
            '</span>' +
            '<button type="button" class="cvs-teacher-toggle-btn" id="cvs-teacher-toggle-btn" title="Activar o cerrar Panel de Control del Profesor">' +
              '<i class="fas fa-key"></i> <span id="cvs-teacher-btn-label">Control Profesor</span>' +
            '</button>' +
          '</div>' +
        '</div>' +

        /* ── ESCENARIO PRINCIPAL DE VIDEO (STAGE) ── */
        '<div class="cvs-stage-outer" id="cvs-stage-outer">' +
          '<div class="cvs-stage-aspect">' +
            /* Contenedor YouTube */
            '<div id="cvs-yt-wrap" class="cvs-media-layer">' +
              '<div id="cvs-yt-player"></div>' +
            '</div>' +

            /* Contenedor Video MP4 / HTML5 */
            '<div id="cvs-mp4-wrap" class="cvs-media-layer" style="display:none;">' +
              '<video id="cvs-html5-video" class="cvs-html5-video" playsinline preload="auto"></video>' +
            '</div>' +

            /* Escudo transparente para bloquear clics de alumnos cuando lockedByTeacher === true */
            '<div class="cvs-student-shield" id="cvs-student-shield" title="Reproducción controlada por el Profesor"></div>' +

            /* Cartel flotante de Pausa del Profesor (para que los alumnos vean claro cuando el profe pausó) */
            '<div class="cvs-paused-badge" id="cvs-paused-badge" style="display:none;">' +
              '<i class="fas fa-pause-circle"></i> <span>VIDEO EN PAUSA POR EL PROFESOR</span>' +
            '</div>' +

            /* Overlay inicial para Alumnos: 1 Clic para habilitar Sonido + Sincronización (Requisito de navegadores) */
            '<div class="cvs-join-overlay" id="cvs-join-overlay">' +
              '<div class="cvs-join-card">' +
                '<div class="cvs-join-icon-ring"><i class="fas fa-volume-up"></i></div>' +
                '<span class="cvs-join-kicker">CINE DE CLASE · SINCRONIZACIÓN EN VIVO</span>' +
                '<h4 class="cvs-join-title">Conectar Pantalla y Sonido</h4>' +
                '<p class="cvs-join-desc">Hacé un clic en el botón de abajo para escuchar el audio en tu máquina y seguir el video junto con el Profesor.</p>' +
                '<button type="button" class="cvs-join-btn" id="cvs-join-btn">' +
                  '<i class="fas fa-play"></i> ¡UNIRME A LA TRANSMISIÓN CON SONIDO!' +
                '</button>' +
              '</div>' +
            '</div>' +
          '</div>' +

          /* ── BARRA INFERIOR DEL REPRODUCTOR (PARA ALUMNOS Y ESTADO GENERAL) ── */
          '<div class="cvs-player-bar" id="cvs-player-bar">' +
            '<div class="cvs-player-bar-left">' +
              /* Controles locales para el alumno (solo activos cuando el profe libera el control) */
              '<div class="cvs-student-free-controls" id="cvs-student-free-controls" style="display:none;">' +
                '<button type="button" class="cvs-bar-btn" id="cvs-stu-playpause" title="Play / Pausa en tu máquina">' +
                  '<i class="fas fa-play"></i>' +
                '</button>' +
                '<button type="button" class="cvs-bar-btn" id="cvs-stu-rew" title="Retroceder 10 segundos">' +
                  '<i class="fas fa-undo"></i> -10s' +
                '</button>' +
                '<button type="button" class="cvs-bar-btn" id="cvs-stu-fwd" title="Adelantar 10 segundos">' +
                  '<i class="fas fa-redo"></i> +10s' +
                '</button>' +
                '<input type="range" class="cvs-stu-scrubber" id="cvs-stu-scrubber" min="0" max="100" step="1" value="0" title="Posición del video">' +
              '</div>' +

              /* Mensaje cuando está bloqueado por el profesor */
              '<div class="cvs-student-locked-msg" id="cvs-student-locked-msg">' +
                '<i class="fas fa-broadcast-tower"></i> ' +
                '<span id="cvs-student-locked-text">Sincronizado con el Profesor (Play y Pausa automáticos)</span>' +
              '</div>' +
            '</div>' +

            '<div class="cvs-player-bar-right">' +
              '<span class="cvs-time-readout" id="cvs-time-readout">00:00 / 00:00</span>' +
              '<button type="button" class="cvs-bar-btn" id="cvs-btn-resync-local" title="Volver al segundo exacto del Profesor">' +
                '<i class="fas fa-sync-alt"></i> <span>Sincronizar</span>' +
              '</button>' +
              '<button type="button" class="cvs-bar-btn" id="cvs-btn-mute-local" title="Silenciar / Activar sonido en esta máquina">' +
                '<i class="fas fa-volume-up" id="cvs-local-vol-icon"></i>' +
              '</button>' +
              '<button type="button" class="cvs-bar-btn" id="cvs-btn-fullscreen" title="Pantalla Completa">' +
                '<i class="fas fa-expand"></i>' +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +

        /* ── MODAL / CAJA DE PIN DOCENTE (OCULTO POR DEFECTO) ── */
        '<div class="cvs-pin-box" id="cvs-pin-box" style="display:none;">' +
          '<form id="cvs-pin-form" class="cvs-pin-form">' +
            '<div class="cvs-pin-head">' +
              '<span><i class="fas fa-user-shield"></i> Desbloquear Consola del Profesor</span>' +
              '<button type="button" class="cvs-pin-close" id="cvs-pin-close" aria-label="Cerrar">&times;</button>' +
            '</div>' +
            '<p class="cvs-pin-help">Ingresá tu PIN o clave docente para tomar el control de todas las máquinas de la clase:</p>' +
            '<div class="cvs-pin-input-row">' +
              '<input type="password" id="cvs-pin-input" class="cvs-pin-input" placeholder="PIN o clave (ej: 2026)" autocomplete="off">' +
              '<button type="submit" class="cvs-pin-submit"><i class="fas fa-unlock-alt"></i> Activar Control</button>' +
            '</div>' +
            '<div class="cvs-pin-error" id="cvs-pin-error"></div>' +
          '</form>' +
        '</div>' +

        /* ── CONSOLA MAESTRA DEL PROFESOR (SOLO VISIBLE CON PIN DOCENTE) ── */
        '<div class="cvs-teacher-console" id="cvs-teacher-console" style="display:none;">' +
          '<div class="cvs-tc-banner">' +
            '<div class="cvs-tc-banner-left">' +
              '<span class="cvs-tc-badge"><i class="fas fa-chalkboard-teacher"></i> MODO PROFESOR ACTIVO</span>' +
              '<span class="cvs-tc-sub">Todo lo que hagas aquí se replica al instante en todas las computadoras de la clase.</span>' +
            '</div>' +
            '<div class="cvs-tc-banner-right">' +
              '<button type="button" class="cvs-tc-call-btn" id="cvs-tc-call-students" title="Hace que todas las máquinas que estén en la sección Clase abran automáticamente la Sala de Video">' +
                '<i class="fas fa-bullhorn"></i> Traer Máquinas a la Sala de Video' +
              '</button>' +
              '<button type="button" class="cvs-tc-logout-btn" id="cvs-tc-logout" title="Cerrar modo profesor en esta máquina">' +
                '<i class="fas fa-lock"></i> Cerrar Control' +
              '</button>' +
            '</div>' +
          '</div>' +

          /* 1. Botonera Principal de Transporte y Línea de Tiempo Maestra */
          '<div class="cvs-tc-transport-card">' +
            '<div class="cvs-tc-main-buttons">' +
              '<button type="button" class="cvs-tc-play-master" id="cvs-tc-playpause-btn">' +
                '<i class="fas fa-play" id="cvs-tc-playpause-icon"></i> ' +
                '<span id="cvs-tc-playpause-label">REPRODUCIR EN TODAS LAS MÁQUINAS</span>' +
              '</button>' +

              '<div class="cvs-tc-quick-jumps">' +
                '<button type="button" class="cvs-tc-jump-btn" id="cvs-tc-restart-btn" title="Reiniciar el video desde 00:00 en todas las máquinas">' +
                  '<i class="fas fa-step-backward"></i> 00:00' +
                '</button>' +
                '<button type="button" class="cvs-tc-jump-btn" id="cvs-tc-rew10-btn" title="Retroceder 10 segundos en todas las máquinas">' +
                  '<i class="fas fa-undo"></i> -10s' +
                '</button>' +
                '<button type="button" class="cvs-tc-jump-btn" id="cvs-tc-fwd10-btn" title="Adelantar 10 segundos en todas las máquinas">' +
                  '<i class="fas fa-redo"></i> +10s' +
                '</button>' +
                '<button type="button" class="cvs-tc-jump-btn cvs-tc-sync-pulse" id="cvs-tc-forcesync-btn" title="Forzar que todas las máquinas salten exactamente a tu segundo actual">' +
                  '<i class="fas fa-bolt"></i> Sincronizar Ya' +
                '</button>' +
              '</div>' +
            '</div>' +

            /* Barra de Progreso Maestra (Scrubber) */
            '<div class="cvs-tc-scrubber-row">' +
              '<span class="cvs-tc-time" id="cvs-tc-cur-time">00:00</span>' +
              '<input type="range" id="cvs-tc-scrubber" class="cvs-tc-scrubber" min="0" max="100" step="1" value="0">' +
              '<span class="cvs-tc-time" id="cvs-tc-dur-time">00:00</span>' +
              '<select id="cvs-tc-speed" class="cvs-tc-speed-select" title="Velocidad de reproducción">' +
                '<option value="0.75">0.75x (Lento)</option>' +
                '<option value="1" selected>1x (Normal)</option>' +
                '<option value="1.25">1.25x</option>' +
                '<option value="1.5">1.5x (Rápido)</option>' +
              '</select>' +
            '</div>' +
          '</div>' +

          /* 2. Interruptores de Control de Clase (Bloqueado vs Libre / Sonido) */
          '<div class="cvs-tc-switches-grid">' +
            '<div class="cvs-tc-switch-card" id="cvs-tc-lock-card">' +
              '<div class="cvs-tc-switch-info">' +
                '<span class="cvs-tc-switch-kicker">PERMISO DE LAS MÁQUINAS</span>' +
                '<h4 id="cvs-tc-lock-title"><i class="fas fa-lock"></i> Control Bloqueado al Profesor</h4>' +
                '<p id="cvs-tc-lock-desc">Los alumnos no pueden pausar ni adelantar. Todas las máquinas siguen tu Play y Pausa.</p>' +
              '</div>' +
              '<button type="button" class="cvs-tc-toggle-pill is-locked" id="cvs-tc-lock-toggle">' +
                '<i class="fas fa-exchange-alt"></i> <span id="cvs-tc-lock-btn-txt">Liberar Control a las Máquinas</span>' +
              '</button>' +
            '</div>' +

            '<div class="cvs-tc-switch-card" id="cvs-tc-audio-card">' +
              '<div class="cvs-tc-switch-info">' +
                '<span class="cvs-tc-switch-kicker">AUDIO EN EL SALÓN</span>' +
                '<h4 id="cvs-tc-audio-title"><i class="fas fa-volume-up"></i> Sonido en Todas las Máquinas</h4>' +
                '<p id="cvs-tc-audio-desc">Todas las computadoras reproducen el video con sonido al mismo tiempo.</p>' +
              '</div>' +
              '<button type="button" class="cvs-tc-toggle-pill" id="cvs-tc-audio-toggle">' +
                '<i class="fas fa-volume-mute"></i> <span id="cvs-tc-audio-btn-txt">Silenciar PCs de Alumnos</span>' +
              '</button>' +
            '</div>' +
          '</div>' +

          /* 3. Cargador de Video (YouTube o MP4) y Biblioteca Rápida */
          '<div class="cvs-tc-loader-card">' +
            '<h4 class="cvs-tc-section-heading"><i class="fas fa-film"></i> Cambiar Video o Agregar a la Lista de Clase</h4>' +
            '<form id="cvs-tc-load-form" class="cvs-tc-load-form">' +
              '<div class="cvs-tc-form-grid">' +
                '<div class="cvs-tc-field">' +
                  '<label for="cvs-tc-url-input">Enlace de YouTube o ruta/URL de video MP4:</label>' +
                  '<input type="text" id="cvs-tc-url-input" placeholder="Ej: https://www.youtube.com/watch?v=... o archivo.mp4" required>' +
                '</div>' +
                '<div class="cvs-tc-field">' +
                  '<label for="cvs-tc-title-input">Título o consigna para los alumnos (opcional):</label>' +
                  '<input type="text" id="cvs-tc-title-input" placeholder="Ej: Atención a cómo se conectan las piezas">' +
                '</div>' +
              '</div>' +
              '<div class="cvs-tc-form-actions">' +
                '<button type="submit" class="cvs-tc-btn-primary">' +
                  '<i class="fas fa-satellite-dish"></i> Cargar y Transmitir en Todas las Máquinas' +
                '</button>' +
                '<button type="button" class="cvs-tc-btn-secondary" id="cvs-tc-save-playlist-btn">' +
                  '<i class="fas fa-bookmark"></i> Guardar en Lista Rápida de Clase' +
                '</button>' +
              '</div>' +
            '</form>' +

            /* Lista de videos guardados para cambiar con 1 clic */
            '<div class="cvs-tc-playlist-wrap">' +
              '<div class="cvs-tc-playlist-head">' +
                '<span><i class="fas fa-list-ul"></i> Lista Rápida de Videos de Clase (1 clic para proyectar):</span>' +
              '</div>' +
              '<div class="cvs-tc-playlist-grid" id="cvs-tc-playlist-grid"></div>' +
            '</div>' +
          '</div>' +

        '</div>' +

      '</div>';

    html5Video = document.getElementById('cvs-html5-video');
    setupHtml5VideoEvents();
    updateTeacherUiVisibility();
  }

  /**
   * Eventos de botones de la interfaz
   */
  function bindStaticEvents() {
    // 1. Botón de Alumno: "¡UNIRME A LA TRANSMISIÓN CON SONIDO!"
    var joinBtn = document.getElementById('cvs-join-btn');
    if (joinBtn) {
      joinBtn.addEventListener('click', function () {
        hasJoinedAudio = true;
        var overlay = document.getElementById('cvs-join-overlay');
        if (overlay) overlay.style.display = 'none';

        // Desbloquear audio inmediatamente en ambos motores
        applyAudioState();

        // Sincronizar con el estado actual del profesor
        if (remoteState) {
          applyRemoteStateToPlayer(remoteState, true);
        } else {
          playMedia();
        }
      });
    }

    // 2. Botón para abrir/cerrar PIN de Profesor
    var teacherToggleBtn = document.getElementById('cvs-teacher-toggle-btn');
    if (teacherToggleBtn) {
      teacherToggleBtn.addEventListener('click', function () {
        if (isTeacher) {
          var consoleEl = document.getElementById('cvs-teacher-console');
          if (consoleEl) {
            consoleEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
          return;
        }
        var pinBox = document.getElementById('cvs-pin-box');
        if (pinBox) {
          var isHidden = pinBox.style.display === 'none';
          pinBox.style.display = isHidden ? 'block' : 'none';
          if (isHidden) {
            var pinInput = document.getElementById('cvs-pin-input');
            if (pinInput) {
              pinInput.value = '';
              pinInput.focus();
            }
          }
        }
      });
    }

    var pinClose = document.getElementById('cvs-pin-close');
    if (pinClose) {
      pinClose.addEventListener('click', function () {
        var pinBox = document.getElementById('cvs-pin-box');
        if (pinBox) pinBox.style.display = 'none';
      });
    }

    // 3. Formulario de PIN Docente
    var pinForm = document.getElementById('cvs-pin-form');
    if (pinForm) {
      pinForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var pinInput = document.getElementById('cvs-pin-input');
        var errEl = document.getElementById('cvs-pin-error');
        var val = pinInput ? pinInput.value.trim().toLowerCase() : '';

        if (VALID_TEACHER_PINS.indexOf(val) !== -1) {
          isTeacher = true;
          hasJoinedAudio = true;
          try { sessionStorage.setItem(TEACHER_SESSION_KEY, 'true'); } catch (ex) {}
          var pinBox = document.getElementById('cvs-pin-box');
          if (pinBox) pinBox.style.display = 'none';
          if (errEl) errEl.textContent = '';

          updateTeacherUiVisibility();
          applyAudioState();
          startTeacherHeartbeat();
          if (window.showToast) window.showToast('¡Modo Profesor activado! Tenés el control de todas las máquinas.', 'success');
        } else {
          if (errEl) {
            errEl.textContent = 'Clave incorrecta. Probá con 2026 o la clave de administrador.';
          }
        }
      });
    }

    // 4. Cerrar Modo Profesor
    var logoutBtn = document.getElementById('cvs-tc-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        isTeacher = false;
        try { sessionStorage.removeItem(TEACHER_SESSION_KEY); } catch (ex) {}
        stopTeacherHeartbeat();
        updateTeacherUiVisibility();
        if (remoteState) applyRemoteStateToPlayer(remoteState, true);
      });
    }

    // 5. Botones Maestros del Profesor (Play/Pausa, Saltos, Scrubber, Bloqueo, Audio)
    var masterPlayPauseBtn = document.getElementById('cvs-tc-playpause-btn');
    if (masterPlayPauseBtn) {
      masterPlayPauseBtn.addEventListener('click', function () {
        if (!isTeacher) return;
        var currentlyPlaying = remoteState ? !!remoteState.isPlaying : isMediaPlaying();
        var nextPlaying = !currentlyPlaying;
        var curSec = getMediaCurrentTime();

        suppressLocalEventsUntil = Date.now() + 1200;
        if (nextPlaying) {
          playMedia();
        } else {
          pauseMedia();
        }

        pushTeacherState({
          isPlaying: nextPlaying,
          baseTime: curSec,
          sessionActive: true
        }, true);
      });
    }

    var restartBtn = document.getElementById('cvs-tc-restart-btn');
    if (restartBtn) {
      restartBtn.addEventListener('click', function () {
        if (!isTeacher) return;
        suppressLocalEventsUntil = Date.now() + 1200;
        seekMediaTo(0);
        pushTeacherState({
          baseTime: 0,
          sessionActive: true
        }, true);
      });
    }

    var rew10Btn = document.getElementById('cvs-tc-rew10-btn');
    if (rew10Btn) {
      rew10Btn.addEventListener('click', function () {
        if (!isTeacher) return;
        var nextSec = Math.max(0, getMediaCurrentTime() - 10);
        suppressLocalEventsUntil = Date.now() + 1200;
        seekMediaTo(nextSec);
        pushTeacherState({
          baseTime: nextSec,
          sessionActive: true
        }, true);
      });
    }

    var fwd10Btn = document.getElementById('cvs-tc-fwd10-btn');
    if (fwd10Btn) {
      fwd10Btn.addEventListener('click', function () {
        if (!isTeacher) return;
        var dur = getMediaDuration() || 99999;
        var nextSec = Math.min(dur, getMediaCurrentTime() + 10);
        suppressLocalEventsUntil = Date.now() + 1200;
        seekMediaTo(nextSec);
        pushTeacherState({
          baseTime: nextSec,
          sessionActive: true
        }, true);
      });
    }

    var forceSyncBtn = document.getElementById('cvs-tc-forcesync-btn');
    if (forceSyncBtn) {
      forceSyncBtn.addEventListener('click', function () {
        if (!isTeacher) return;
        var curSec = getMediaCurrentTime();
        var playing = isMediaPlaying();
        pushTeacherState({
          isPlaying: playing,
          baseTime: curSec,
          sessionActive: true
        }, true);
      });
    }

    // Scrubber Maestro del Profesor
    var tcScrubber = document.getElementById('cvs-tc-scrubber');
    if (tcScrubber) {
      tcScrubber.addEventListener('mousedown', function () { isDraggingScrubber = true; });
      tcScrubber.addEventListener('touchstart', function () { isDraggingScrubber = true; }, { passive: true });
      tcScrubber.addEventListener('input', function () {
        var curLabel = document.getElementById('cvs-tc-cur-time');
        if (curLabel) curLabel.textContent = formatTime(tcScrubber.value);
      });
      tcScrubber.addEventListener('change', function () {
        isDraggingScrubber = false;
        if (!isTeacher) return;
        var targetSec = Number(tcScrubber.value) || 0;
        suppressLocalEventsUntil = Date.now() + 1200;
        seekMediaTo(targetSec);
        pushTeacherState({
          baseTime: targetSec,
          sessionActive: true
        }, true);
      });
    }

    // Selector de Velocidad Maestro
    var speedSelect = document.getElementById('cvs-tc-speed');
    if (speedSelect) {
      speedSelect.addEventListener('change', function () {
        if (!isTeacher) return;
        var rate = Number(speedSelect.value) || 1;
        setMediaPlaybackRate(rate);
        pushTeacherState({
          playbackRate: rate,
          baseTime: getMediaCurrentTime()
        }, true);
      });
    }

    // Interruptor Bloquear / Liberar Control a las Máquinas
    var lockToggle = document.getElementById('cvs-tc-lock-toggle');
    if (lockToggle) {
      lockToggle.addEventListener('click', function () {
        if (!isTeacher) return;
        var currentlyLocked = remoteState ? remoteState.lockedByTeacher !== false : true;
        var nextLocked = !currentlyLocked;
        pushTeacherState({
          lockedByTeacher: nextLocked,
          baseTime: getMediaCurrentTime(),
          isPlaying: isMediaPlaying(),
          sessionActive: true
        }, true);
      });
    }

    // Interruptor Sonido en Todas las Máquinas vs Silenciar Alumnos
    var audioToggle = document.getElementById('cvs-tc-audio-toggle');
    if (audioToggle) {
      audioToggle.addEventListener('click', function () {
        if (!isTeacher) return;
        var currentlyMuted = remoteState ? !!remoteState.muteStudents : false;
        pushTeacherState({
          muteStudents: !currentlyMuted
        }, true);
      });
    }

    // Botón "Traer Máquinas a la Sala de Video"
    var callStudentsBtn = document.getElementById('cvs-tc-call-students');
    if (callStudentsBtn) {
      callStudentsBtn.addEventListener('click', function () {
        if (!isTeacher) return;
        var nextCallSeq = ((remoteState && remoteState.callStudentsSeq) || 0) + 1;
        pushTeacherState({
          sessionActive: true,
          callStudentsSeq: nextCallSeq,
          baseTime: getMediaCurrentTime()
        }, true);
      });
    }

    // Formulario para Cargar nuevo Video (YouTube o MP4)
    var loadForm = document.getElementById('cvs-tc-load-form');
    if (loadForm) {
      loadForm.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!isTeacher) return;
        var urlInput = document.getElementById('cvs-tc-url-input');
        var titleInput = document.getElementById('cvs-tc-title-input');
        var parsed = parseVideoUrl(urlInput ? urlInput.value : '');
        if (!parsed) return;

        var customTitle = (titleInput && titleInput.value.trim()) || 'Video de Clase en Vivo';
        suppressLocalEventsUntil = Date.now() + 1500;

        pushTeacherState({
          videoUrl: parsed.url,
          videoType: parsed.type,
          youtubeId: parsed.youtubeId || '',
          title: customTitle,
          subtitle: 'Proyección controlada por el Profesor en Tiempo Real',
          baseTime: 0,
          isPlaying: true,
          sessionActive: true
        }, true);
      });
    }

    // Guardar en la Playlist de Clase
    var savePlaylistBtn = document.getElementById('cvs-tc-save-playlist-btn');
    if (savePlaylistBtn) {
      savePlaylistBtn.addEventListener('click', function () {
        if (!isTeacher) return;
        var urlInput = document.getElementById('cvs-tc-url-input');
        var titleInput = document.getElementById('cvs-tc-title-input');
        var parsed = parseVideoUrl(urlInput ? urlInput.value : '');
        if (!parsed) {
          alert('Pegá primero un enlace válido de YouTube o archivo MP4.');
          return;
        }
        var customTitle = (titleInput && titleInput.value.trim()) || ('Video de Clase (' + (parsed.type === 'youtube' ? 'YouTube' : 'MP4') + ')');
        var currentList = (remoteState && Array.isArray(remoteState.playlist)) ? remoteState.playlist.slice() : DEFAULT_STATE.playlist.slice();

        currentList.unshift({
          id: 'vid-' + Date.now(),
          title: customTitle,
          subtitle: parsed.type === 'youtube' ? 'YouTube · ' + parsed.youtubeId : 'Archivo MP4 directo',
          url: parsed.url,
          type: parsed.type
        });

        pushTeacherState({
          playlist: currentList
        }, false);

        if (urlInput) urlInput.value = '';
        if (titleInput) titleInput.value = '';
      });
    }

    // 6. Controles para el Alumno (cuando el profesor habilita el Modo Libre)
    var stuPlayPause = document.getElementById('cvs-stu-playpause');
    if (stuPlayPause) {
      stuPlayPause.addEventListener('click', function () {
        if (remoteState && remoteState.lockedByTeacher !== false && !isTeacher) return;
        if (isMediaPlaying()) pauseMedia();
        else playMedia();
        updateTimeUi();
      });
    }

    var stuRew = document.getElementById('cvs-stu-rew');
    if (stuRew) {
      stuRew.addEventListener('click', function () {
        if (remoteState && remoteState.lockedByTeacher !== false && !isTeacher) return;
        seekMediaTo(Math.max(0, getMediaCurrentTime() - 10));
      });
    }

    var stuFwd = document.getElementById('cvs-stu-fwd');
    if (stuFwd) {
      stuFwd.addEventListener('click', function () {
        if (remoteState && remoteState.lockedByTeacher !== false && !isTeacher) return;
        seekMediaTo(getMediaCurrentTime() + 10);
      });
    }

    var stuScrubber = document.getElementById('cvs-stu-scrubber');
    if (stuScrubber) {
      stuScrubber.addEventListener('change', function () {
        if (remoteState && remoteState.lockedByTeacher !== false && !isTeacher) return;
        seekMediaTo(Number(stuScrubber.value) || 0);
      });
    }

    // Botón Re-sincronizar local
    var resyncLocalBtn = document.getElementById('cvs-btn-resync-local');
    if (resyncLocalBtn) {
      resyncLocalBtn.addEventListener('click', function () {
        hasJoinedAudio = true;
        var overlay = document.getElementById('cvs-join-overlay');
        if (overlay) overlay.style.display = 'none';
        applyAudioState();
        if (remoteState) {
          applyRemoteStateToPlayer(remoteState, true);
        }
      });
    }

    // Botón Mute local
    var muteLocalBtn = document.getElementById('cvs-btn-mute-local');
    if (muteLocalBtn) {
      muteLocalBtn.addEventListener('click', function () {
        hasJoinedAudio = !hasJoinedAudio;
        var overlay = document.getElementById('cvs-join-overlay');
        if (hasJoinedAudio && overlay) overlay.style.display = 'none';
        applyAudioState();
      });
    }

    // Botón Pantalla Completa (Fullscreen del Stage completo para mantener el escudo de bloqueo)
    var fsBtn = document.getElementById('cvs-btn-fullscreen');
    if (fsBtn) {
      fsBtn.addEventListener('click', function () {
        var stage = document.getElementById('cvs-stage-outer');
        if (!stage) return;
        if (!document.fullscreenElement) {
          if (stage.requestFullscreen) stage.requestFullscreen();
          else if (stage.webkitRequestFullscreen) stage.webkitRequestFullscreen();
        } else {
          if (document.exitFullscreen) document.exitFullscreen();
        }
      });
    }

    // Bloquear atajos de teclado de pausa (Espacio / K / Flechas) en máquinas de alumnos cuando está bloqueado
    document.addEventListener('keydown', function (e) {
      if (activeSubTab !== 'video') return;
      if (isTeacher) return;
      var locked = !remoteState || remoteState.lockedByTeacher !== false;
      if (!locked) return;
      var tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (e.key === ' ' || e.key === 'k' || e.key === 'K' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);
  }

  /**
   * Configura eventos en el reproductor <video> HTML5 (archivos MP4)
   */
  function setupHtml5VideoEvents() {
    if (!html5Video) return;

    html5Video.addEventListener('play', function () {
      if (currentMediaType !== 'mp4') return;
      if (isTeacher && !isApplyingRemoteUpdate && Date.now() > suppressLocalEventsUntil) {
        pushTeacherState({
          isPlaying: true,
          baseTime: html5Video.currentTime || 0,
          sessionActive: true
        }, true);
      }
      updateTimeUi();
    });

    html5Video.addEventListener('pause', function () {
      if (currentMediaType !== 'mp4') return;
      if (isTeacher && !isApplyingRemoteUpdate && Date.now() > suppressLocalEventsUntil) {
        pushTeacherState({
          isPlaying: false,
          baseTime: html5Video.currentTime || 0,
          sessionActive: true
        }, true);
      }
      updateTimeUi();
    });

    html5Video.addEventListener('seeked', function () {
      if (currentMediaType !== 'mp4') return;
      if (isTeacher && !isApplyingRemoteUpdate && Date.now() > suppressLocalEventsUntil) {
        pushTeacherState({
          baseTime: html5Video.currentTime || 0,
          sessionActive: true
        }, true);
      }
      updateTimeUi();
    });
  }

  /**
   * Carga la API de YouTube IFrame si no está presente
   */
  function loadYouTubeApiIfNeeded() {
    if (window.YT && window.YT.Player) {
      ytApiReady = true;
      initYouTubePlayerInstance();
      return;
    }

    var prevCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () {
      if (typeof prevCallback === 'function') prevCallback();
      ytApiReady = true;
      initYouTubePlayerInstance();
    };

    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      var tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      var firstScript = document.getElementsByTagName('script')[0];
      if (firstScript && firstScript.parentNode) {
        firstScript.parentNode.insertBefore(tag, firstScript);
      } else {
        document.head.appendChild(tag);
      }
    }
  }

  function initYouTubePlayerInstance() {
    if (ytPlayer || !ytApiReady) return;
    var el = document.getElementById('cvs-yt-player');
    if (!el) return;

    var initialYtId = (remoteState && remoteState.youtubeId) || DEFAULT_STATE.youtubeId;

    ytPlayer = new window.YT.Player('cvs-yt-player', {
      width: '100%',
      height: '100%',
      videoId: initialYtId,
      playerVars: {
        autoplay: 0,
        controls: 1,
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
        enablejsapi: 1,
        origin: window.location.origin
      },
      events: {
        onReady: function () {
          ytPlayerReady = true;
          applyAudioState();
          if (remoteState) {
            applyRemoteStateToPlayer(remoteState, true);
          }
        },
        onStateChange: function (event) {
          onYouTubeStateChange(event);
        }
      }
    });
  }

  function onYouTubeStateChange(event) {
    if (currentMediaType !== 'youtube') return;
    var YTState = window.YT ? window.YT.PlayerState : null;
    if (!YTState) return;

    // Si es el profesor y tocó Play/Pausa directamente dentro del reproductor de YouTube,
    // transmitir automáticamente a todas las máquinas
    if (isTeacher && !isApplyingRemoteUpdate && Date.now() > suppressLocalEventsUntil) {
      if (event.data === YTState.PLAYING) {
        pushTeacherState({
          isPlaying: true,
          baseTime: getMediaCurrentTime(),
          sessionActive: true
        }, true);
      } else if (event.data === YTState.PAUSED) {
        pushTeacherState({
          isPlaying: false,
          baseTime: getMediaCurrentTime(),
          sessionActive: true
        }, true);
      }
    }

    // Si es un alumno y el control está bloqueado por el profesor, impedir que quede en pausa si el profe está en Play (o viceversa)
    if (!isTeacher && remoteState && remoteState.lockedByTeacher !== false && hasJoinedAudio) {
      if (remoteState.isPlaying && event.data === YTState.PAUSED) {
        setTimeout(function () {
          if (remoteState && remoteState.isPlaying && remoteState.lockedByTeacher !== false) {
            playMedia();
          }
        }, 200);
      } else if (!remoteState.isPlaying && event.data === YTState.PLAYING) {
        setTimeout(function () {
          if (remoteState && !remoteState.isPlaying && remoteState.lockedByTeacher !== false) {
            pauseMedia();
            seekMediaTo(remoteState.baseTime || 0);
          }
        }, 150);
      }
    }

    updateTimeUi();
  }

  /**
   * ─────────────────────────────────────────────────────────────
   * CAPA UNIFICADA DE CONTROL DE MEDIA (YOUTUBE + MP4)
   * ─────────────────────────────────────────────────────────────
   */
  function loadMediaSource(type, url, youtubeId, targetSeconds, shouldPlay) {
    var ytWrap = document.getElementById('cvs-yt-wrap');
    var mp4Wrap = document.getElementById('cvs-mp4-wrap');

    currentMediaType = type === 'mp4' ? 'mp4' : 'youtube';

    if (currentMediaType === 'youtube') {
      if (mp4Wrap) mp4Wrap.style.display = 'none';
      if (ytWrap) ytWrap.style.display = 'block';
      if (html5Video) {
        try { html5Video.pause(); } catch (e) {}
      }

      var cleanYtId = youtubeId || (parseVideoUrl(url) && parseVideoUrl(url).youtubeId) || DEFAULT_STATE.youtubeId;
      if (currentMediaIdOrUrl !== cleanYtId) {
        currentMediaIdOrUrl = cleanYtId;
        if (ytPlayer && ytPlayerReady && typeof ytPlayer.loadVideoById === 'function') {
          isApplyingRemoteUpdate = true;
          suppressLocalEventsUntil = Date.now() + 1400;
          if (shouldPlay && (hasJoinedAudio || isTeacher)) {
            ytPlayer.loadVideoById({ videoId: cleanYtId, startSeconds: targetSeconds || 0 });
          } else if (typeof ytPlayer.cueVideoById === 'function') {
            ytPlayer.cueVideoById({ videoId: cleanYtId, startSeconds: targetSeconds || 0 });
          }
          setTimeout(function () { isApplyingRemoteUpdate = false; }, 600);
        }
      }
    } else {
      // Archivo MP4 / WebM directo
      if (ytWrap) ytWrap.style.display = 'none';
      if (mp4Wrap) mp4Wrap.style.display = 'block';
      if (ytPlayer && ytPlayerReady && typeof ytPlayer.pauseVideo === 'function') {
        try { ytPlayer.pauseVideo(); } catch (e) {}
      }

      if (html5Video && currentMediaIdOrUrl !== url) {
        currentMediaIdOrUrl = url;
        isApplyingRemoteUpdate = true;
        suppressLocalEventsUntil = Date.now() + 1400;
        html5Video.src = url;
        html5Video.load();
        html5Video.addEventListener('loadedmetadata', function onMeta() {
          html5Video.removeEventListener('loadedmetadata', onMeta);
          if (targetSeconds > 0) {
            try { html5Video.currentTime = targetSeconds; } catch (ex) {}
          }
          if (shouldPlay && (hasJoinedAudio || isTeacher)) {
            html5Video.play().catch(function () {});
          }
          isApplyingRemoteUpdate = false;
        });
      }
    }
  }

  function playMedia() {
    applyAudioState();
    if (currentMediaType === 'mp4') {
      if (html5Video) {
        html5Video.play().catch(function () {
          // Si el navegador bloqueó el inicio con sonido porque el alumno no hizo clic aún, mostrar el botón de unirse
          if (!isTeacher) {
            hasJoinedAudio = false;
            var overlay = document.getElementById('cvs-join-overlay');
            if (overlay) overlay.style.display = 'flex';
          }
        });
      }
    } else {
      if (ytPlayer && ytPlayerReady && typeof ytPlayer.playVideo === 'function') {
        ytPlayer.playVideo();
      }
    }
  }

  function pauseMedia() {
    if (currentMediaType === 'mp4') {
      if (html5Video) {
        try { html5Video.pause(); } catch (e) {}
      }
    } else {
      if (ytPlayer && ytPlayerReady && typeof ytPlayer.pauseVideo === 'function') {
        try { ytPlayer.pauseVideo(); } catch (e) {}
      }
    }
  }

  function seekMediaTo(seconds) {
    seconds = Math.max(0, Number(seconds) || 0);
    if (currentMediaType === 'mp4') {
      if (html5Video) {
        try { html5Video.currentTime = seconds; } catch (e) {}
      }
    } else {
      if (ytPlayer && ytPlayerReady && typeof ytPlayer.seekTo === 'function') {
        try { ytPlayer.seekTo(seconds, true); } catch (e) {}
      }
    }
  }

  function getMediaCurrentTime() {
    if (currentMediaType === 'mp4') {
      return (html5Video && !isNaN(html5Video.currentTime)) ? html5Video.currentTime : 0;
    }
    if (ytPlayer && ytPlayerReady && typeof ytPlayer.getCurrentTime === 'function') {
      return Number(ytPlayer.getCurrentTime()) || 0;
    }
    return 0;
  }

  function getMediaDuration() {
    if (currentMediaType === 'mp4') {
      return (html5Video && !isNaN(html5Video.duration) && isFinite(html5Video.duration)) ? html5Video.duration : 0;
    }
    if (ytPlayer && ytPlayerReady && typeof ytPlayer.getDuration === 'function') {
      return Number(ytPlayer.getDuration()) || 0;
    }
    return 0;
  }

  function isMediaPlaying() {
    if (currentMediaType === 'mp4') {
      return !!(html5Video && !html5Video.paused && !html5Video.ended);
    }
    if (ytPlayer && ytPlayerReady && typeof ytPlayer.getPlayerState === 'function' && window.YT) {
      return ytPlayer.getPlayerState() === window.YT.PlayerState.PLAYING ||
             ytPlayer.getPlayerState() === window.YT.PlayerState.BUFFERING;
    }
    return false;
  }

  function setMediaPlaybackRate(rate) {
    rate = Number(rate) || 1;
    if (currentMediaType === 'mp4') {
      if (html5Video) {
        try { html5Video.playbackRate = rate; } catch (e) {}
      }
    } else {
      if (ytPlayer && ytPlayerReady && typeof ytPlayer.setPlaybackRate === 'function') {
        try { ytPlayer.setPlaybackRate(rate); } catch (e) {}
      }
    }
  }

  function applyAudioState() {
    var shouldMute = false;
    if (!hasJoinedAudio && !isTeacher) {
      shouldMute = true;
    } else if (!isTeacher && remoteState && remoteState.muteStudents) {
      shouldMute = true;
    }

    if (html5Video) {
      html5Video.muted = shouldMute;
      if (!shouldMute) html5Video.volume = 1.0;
    }

    if (ytPlayer && ytPlayerReady) {
      try {
        if (shouldMute) {
          if (typeof ytPlayer.mute === 'function') ytPlayer.mute();
        } else {
          if (typeof ytPlayer.unMute === 'function') ytPlayer.unMute();
          if (typeof ytPlayer.setVolume === 'function') ytPlayer.setVolume(100);
        }
      } catch (e) {}
    }

    var volIcon = document.getElementById('cvs-local-vol-icon');
    if (volIcon) {
      volIcon.className = shouldMute ? 'fas fa-volume-mute' : 'fas fa-volume-up';
    }
  }

  /**
   * ─────────────────────────────────────────────────────────────
   * SINCRONIZACIÓN EN TIEMPO REAL CON FIREBASE FIRESTORE
   * ─────────────────────────────────────────────────────────────
   */
  function connectFirestoreListener() {
    if (!window.db || typeof window.db.collection !== 'function') {
      setTimeout(connectFirestoreListener, 600);
      return;
    }

    var docRef = window.db.collection(DOC_COLLECTION).doc(DOC_ID);

    docRef.onSnapshot(function (doc) {
      if (!doc.exists) {
        // Inicializar documento por primera vez con valores por defecto
        remoteState = Object.assign({}, DEFAULT_STATE);
        docRef.set(remoteState, { merge: true }).catch(function () {});
        renderStateMetadata(remoteState);
        applyRemoteStateToPlayer(remoteState, true);
        return;
      }

      var data = doc.data() || {};
      var merged = Object.assign({}, DEFAULT_STATE, data);
      var prevSeq = lastAppliedSyncSeq;
      var isExplicitTeacherCommand = (merged.syncSeq !== prevSeq);

      // Si el profesor tocó "Traer Máquinas a la Sala de Video", abrir la pestaña automáticamente
      if (lastSeenCallSeq !== -1 && merged.callStudentsSeq && merged.callStudentsSeq > lastSeenCallSeq) {
        if (!isTeacher) {
          switchClaseSubTab('video');
        }
      }
      lastSeenCallSeq = merged.callStudentsSeq || 0;

      remoteState = merged;
      renderStateMetadata(merged);

      // Si esta máquina NO es el profesor (o si cambió de video/estado por otro dispositivo docente), aplicar sincronización
      if (!isTeacher) {
        applyRemoteStateToPlayer(merged, isExplicitTeacherCommand);
      } else {
        // Si es el profesor y aún no tenía cargado el video inicial, cargarlo
        if (!currentMediaIdOrUrl) {
          applyRemoteStateToPlayer(merged, true);
        }
      }

      lastAppliedSyncSeq = merged.syncSeq;
    }, function (err) {
      console.warn('Aviso de sincronización de Sala de Video:', err);
    });
  }

  /**
   * Envía cambios desde la Consola del Profesor a Firestore
   */
  function pushTeacherState(partialUpdate, incrementSeq) {
    if (!window.db || typeof window.db.collection !== 'function') return;

    var base = remoteState ? Object.assign({}, remoteState) : Object.assign({}, DEFAULT_STATE);
    var nextState = Object.assign(base, partialUpdate, {
      updatedAtMs: Date.now()
    });

    if (incrementSeq) {
      nextState.syncSeq = (Number(base.syncSeq) || 0) + 1;
      lastAppliedSyncSeq = nextState.syncSeq;
    }

    remoteState = nextState;
    renderStateMetadata(nextState);

    window.db.collection(DOC_COLLECTION).doc(DOC_ID).set(nextState, { merge: true }).catch(function (err) {
      console.warn('Error al actualizar estado de Sala de Video:', err);
    });
  }

  /**
   * Aplica el estado recibido de Firestore al reproductor de la máquina
   */
  function applyRemoteStateToPlayer(state, isExplicitCommand) {
    if (!state) return;

    isApplyingRemoteUpdate = true;
    suppressLocalEventsUntil = Date.now() + 1000;

    var vType = state.videoType === 'mp4' ? 'mp4' : 'youtube';
    var vUrl = state.videoUrl || DEFAULT_STATE.videoUrl;
    var ytId = state.youtubeId || (parseVideoUrl(vUrl) && parseVideoUrl(vUrl).youtubeId) || DEFAULT_STATE.youtubeId;
    var targetTime = Number(state.baseTime) || 0;

    // 1. Cargar fuente de video si cambió
    var expectedIdOrUrl = vType === 'youtube' ? ytId : vUrl;
    var sourceChanged = (currentMediaType !== vType) || (currentMediaIdOrUrl !== expectedIdOrUrl);

    if (sourceChanged) {
      loadMediaSource(vType, vUrl, ytId, targetTime, state.isPlaying);
    }

    // 2. Determinar si debemos sincronizar posición y Play/Pausa en esta máquina
    // - Si lockedByTeacher es true: SIEMPRE sincroniza y bloquea.
    // - Si lockedByTeacher es false (Modo Libre): sincroniza cuando el profesor presiona Play/Pausa/Seek (isExplicitCommand === true).
    var shouldEnforceSync = (state.lockedByTeacher !== false) || isExplicitCommand || sourceChanged;

    if (shouldEnforceSync) {
      // Ajustar velocidad
      if (state.playbackRate) {
        setMediaPlaybackRate(state.playbackRate);
      }

      // Ajustar posición si la diferencia supera el umbral (0.8s en orden directa, 2.5s en latido continuo)
      var localSec = getMediaCurrentTime();
      var tolerance = isExplicitCommand ? 0.8 : 2.5;
      if (Math.abs(localSec - targetTime) > tolerance) {
        seekMediaTo(targetTime);
      }

      // Ajustar Play / Pausa
      if (state.isPlaying) {
        if (hasJoinedAudio || isTeacher) {
          playMedia();
        }
      } else {
        pauseMedia();
      }
    }

    applyAudioState();

    setTimeout(function () {
      isApplyingRemoteUpdate = false;
    }, 450);
  }

  /**
   * Actualiza textos, indicadores de bloqueo, cartel de pausa y playlist en la interfaz
   */
  function renderStateMetadata(state) {
    if (!state) return;

    // Título y subtítulo del video
    var titleEl = document.getElementById('cvs-video-title');
    var subEl = document.getElementById('cvs-video-sub');
    if (titleEl) titleEl.textContent = state.title || 'Cine de Clase';
    if (subEl) subEl.textContent = state.subtitle || 'Proyección sincronizada del Taller';

    // Píldora EN VIVO / EN PAUSA
    var livePill = document.getElementById('cvs-live-pill');
    var livePillText = document.getElementById('cvs-live-pill-text');
    if (livePill && livePillText) {
      livePill.classList.toggle('is-playing', !!state.isPlaying);
      livePillText.textContent = state.isPlaying ? 'EN VIVO · REPRODUCIENDO' : 'SALA EN PAUSA';
    }

    // Cartel en la pestaña de Clase para avisar cuando hay sesión activa
    var tabVidBadge = document.getElementById('cvs-tab-live-dot');
    if (tabVidBadge) {
      tabVidBadge.style.display = state.isPlaying ? 'inline-block' : 'none';
    }

    var liveBanner = document.getElementById('cvs-live-clase-banner');
    var liveBannerTitle = document.getElementById('cvs-live-banner-title');
    if (liveBanner) {
      liveBanner.style.display = (state.isPlaying && activeSubTab === 'expedientes') ? 'flex' : 'none';
      if (liveBannerTitle) liveBannerTitle.textContent = state.title || 'Video de Clase en Vivo';
    }

    // Indicador de modo de control (Bloqueado al Profesor vs Control Libre)
    var locked = state.lockedByTeacher !== false;
    var modeInd = document.getElementById('cvs-mode-indicator');
    if (modeInd) {
      modeInd.className = 'cvs-mode-indicator ' + (locked ? 'is-locked' : 'is-free');
      modeInd.innerHTML = locked
        ? '<i class="fas fa-lock"></i> <span>Controlado por el Profesor</span>'
        : '<i class="fas fa-unlock"></i> <span>Control Libre en Máquinas</span>';
    }

    // Escudo transparente sobre el video para alumnos
    var shield = document.getElementById('cvs-student-shield');
    if (shield) {
      // Si es el profesor o si el profesor liberó el control, ocultar el escudo
      shield.style.display = (!isTeacher && locked) ? 'block' : 'none';
    }

    // Cartel flotante cuando el profesor pone Pausa
    var pausedBadge = document.getElementById('cvs-paused-badge');
    if (pausedBadge) {
      pausedBadge.style.display = (!state.isPlaying && locked && hasJoinedAudio) ? 'flex' : 'none';
    }

    // Barra inferior de alumno: mostrar controles libres o aviso de bloqueo
    var stuFreeControls = document.getElementById('cvs-student-free-controls');
    var stuLockedMsg = document.getElementById('cvs-student-locked-msg');
    var stuLockedText = document.getElementById('cvs-student-locked-text');
    if (stuFreeControls && stuLockedMsg) {
      if (!locked || isTeacher) {
        stuFreeControls.style.display = 'inline-flex';
        stuLockedMsg.style.display = 'none';
      } else {
        stuFreeControls.style.display = 'none';
        stuLockedMsg.style.display = 'inline-flex';
        if (stuLockedText) {
          stuLockedText.textContent = state.isPlaying
            ? '🔒 Reproduciendo en sincronía con el Profesor'
            : '⏸️ En pausa por el Profesor (esperando orden de Play)';
        }
      }
    }

    // Actualizar controles dentro de la Consola del Profesor
    var playBtn = document.getElementById('cvs-tc-playpause-btn');
    var playIcon = document.getElementById('cvs-tc-playpause-icon');
    var playLbl = document.getElementById('cvs-tc-playpause-label');
    if (playBtn && playIcon && playLbl) {
      playBtn.classList.toggle('is-playing', !!state.isPlaying);
      playIcon.className = state.isPlaying ? 'fas fa-pause' : 'fas fa-play';
      playLbl.textContent = state.isPlaying
        ? 'PAUSAR EN TODAS LAS MÁQUINAS'
        : 'REPRODUCIR EN TODAS LAS MÁQUINAS';
    }

    var lockCard = document.getElementById('cvs-tc-lock-card');
    var lockTitle = document.getElementById('cvs-tc-lock-title');
    var lockDesc = document.getElementById('cvs-tc-lock-desc');
    var lockBtnTxt = document.getElementById('cvs-tc-lock-btn-txt');
    var lockToggle = document.getElementById('cvs-tc-lock-toggle');
    if (lockCard && lockTitle && lockDesc && lockBtnTxt && lockToggle) {
      lockCard.classList.toggle('is-locked-mode', locked);
      lockToggle.classList.toggle('is-locked', locked);
      if (locked) {
        lockTitle.innerHTML = '<i class="fas fa-lock"></i> Bloqueado: El Profesor tiene el control';
        lockDesc.textContent = 'Los alumnos no pueden pausar ni adelantar. Todas las máquinas obedecen tu Play y Pausa.';
        lockBtnTxt.textContent = '🔓 Liberar Control a las Máquinas';
      } else {
        lockTitle.innerHTML = '<i class="fas fa-unlock"></i> Libre: Las máquinas tienen control propio';
        lockDesc.textContent = 'Cada máquina puede pausar o retroceder por su cuenta (hasta que toques Play/Pausa o vuelvas a bloquear).';
        lockBtnTxt.textContent = '🔒 Bloquear con Control del Profesor';
      }
    }

    var audioTitle = document.getElementById('cvs-tc-audio-title');
    var audioDesc = document.getElementById('cvs-tc-audio-desc');
    var audioBtnTxt = document.getElementById('cvs-tc-audio-btn-txt');
    if (audioTitle && audioDesc && audioBtnTxt) {
      if (state.muteStudents) {
        audioTitle.innerHTML = '<i class="fas fa-volume-mute"></i> Alumnos Silenciados (Solo Audio en PC Profe)';
        audioDesc.textContent = 'Las máquinas de los alumnos están en silencio; el sonido sale únicamente por tu equipo.';
        audioBtnTxt.textContent = '🔊 Habilitar Sonido en Todas las Máquinas';
      } else {
        audioTitle.innerHTML = '<i class="fas fa-volume-up"></i> Sonido Activo en Todas las Máquinas';
        audioDesc.textContent = 'Todas las computadoras reproducen el video con sonido al mismo tiempo.';
        audioBtnTxt.textContent = '🔇 Silenciar PCs de Alumnos';
      }
    }

    var speedSel = document.getElementById('cvs-tc-speed');
    if (speedSel && state.playbackRate) {
      speedSel.value = String(state.playbackRate);
    }

    // Renderizar Playlist Rápida en Consola Docente
    renderTeacherPlaylist(state.playlist || DEFAULT_STATE.playlist, state.videoUrl);
  }

  function renderTeacherPlaylist(list, activeUrl) {
    var grid = document.getElementById('cvs-tc-playlist-grid');
    if (!grid) return;

    if (!Array.isArray(list) || !list.length) {
      grid.innerHTML = '<div class="cvs-tc-empty-list">No hay videos guardados en la lista rápida.</div>';
      return;
    }

    grid.innerHTML = list.map(function (item, idx) {
      var isCurrent = (item.url === activeUrl);
      return '<div class="cvs-tc-pl-item' + (isCurrent ? ' active' : '') + '">' +
        '<div class="cvs-tc-pl-info" data-pl-play="' + idx + '">' +
          '<span class="cvs-tc-pl-badge">' + (item.type === 'mp4' ? 'MP4' : 'YouTube') + '</span>' +
          '<div class="cvs-tc-pl-texts">' +
            '<strong>' + esc(item.title) + '</strong>' +
            '<small>' + esc(item.subtitle || item.url) + '</small>' +
          '</div>' +
        '</div>' +
        '<div class="cvs-tc-pl-actions">' +
          '<button type="button" class="cvs-tc-pl-play-btn" data-pl-play="' + idx + '" title="Proyectar este video en todas las máquinas">' +
            '<i class="fas ' + (isCurrent ? 'fa-broadcast-tower' : 'fa-play') + '"></i> ' + (isCurrent ? 'En Pantalla' : 'Proyectar') +
          '</button>' +
          '<button type="button" class="cvs-tc-pl-del-btn" data-pl-del="' + idx + '" title="Quitar de la lista">' +
            '<i class="fas fa-trash-alt"></i>' +
          '</button>' +
        '</div>' +
      '</div>';
    }).join('');

    grid.querySelectorAll('[data-pl-play]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!isTeacher) return;
        var idx = Number(btn.getAttribute('data-pl-play'));
        var chosen = list[idx];
        if (!chosen) return;
        var parsed = parseVideoUrl(chosen.url);
        if (!parsed) return;

        suppressLocalEventsUntil = Date.now() + 1400;
        pushTeacherState({
          videoUrl: parsed.url,
          videoType: parsed.type,
          youtubeId: parsed.youtubeId || '',
          title: chosen.title,
          subtitle: chosen.subtitle || 'Proyección controlada por el Profesor en Tiempo Real',
          baseTime: 0,
          isPlaying: true,
          sessionActive: true
        }, true);
      });
    });

    grid.querySelectorAll('[data-pl-del]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (!isTeacher) return;
        var idx = Number(btn.getAttribute('data-pl-del'));
        var nextList = list.filter(function (_, i) { return i !== idx; });
        pushTeacherState({ playlist: nextList }, false);
      });
    });
  }

  function updateTeacherUiVisibility() {
    var consoleEl = document.getElementById('cvs-teacher-console');
    var btnLabel = document.getElementById('cvs-teacher-btn-label');
    var toggleBtn = document.getElementById('cvs-teacher-toggle-btn');
    var joinOverlay = document.getElementById('cvs-join-overlay');

    if (consoleEl) {
      consoleEl.style.display = isTeacher ? 'block' : 'none';
    }
    if (btnLabel) {
      btnLabel.textContent = isTeacher ? 'Consola Profesor Activa' : 'Control Profesor';
    }
    if (toggleBtn) {
      toggleBtn.classList.toggle('is-active', isTeacher);
    }
    if (isTeacher && joinOverlay) {
      joinOverlay.style.display = 'none';
    }
    if (remoteState) {
      renderStateMetadata(remoteState);
    }
  }

  /**
   * Timers periódicos:
   * 1. Actualización visual de reloj y barra de progreso (cada 500ms)
   * 2. Watchdog de bloqueo en alumnos (cada 1.2s)
   * 3. Latido (Heartbeat) del profesor mientras el video está en Play (cada 4s)
   */
  function startUiTimers() {
    if (uiProgressTimer) clearInterval(uiProgressTimer);
    uiProgressTimer = setInterval(function () {
      updateTimeUi();
      enforceStudentLockWatchdog();
    }, 600);

    if (isTeacher) {
      startTeacherHeartbeat();
    }
  }

  function startTeacherHeartbeat() {
    stopTeacherHeartbeat();
    teacherHeartbeatTimer = setInterval(function () {
      if (!isTeacher) return;
      if (isMediaPlaying()) {
        pushTeacherState({
          isPlaying: true,
          baseTime: getMediaCurrentTime(),
          duration: getMediaDuration()
        }, false);
      }
    }, 4000);
  }

  function stopTeacherHeartbeat() {
    if (teacherHeartbeatTimer) {
      clearInterval(teacherHeartbeatTimer);
      teacherHeartbeatTimer = null;
    }
  }

  function updateTimeUi() {
    var cur = getMediaCurrentTime();
    var dur = getMediaDuration() || (remoteState && remoteState.duration) || 0;

    var readout = document.getElementById('cvs-time-readout');
    if (readout) {
      readout.textContent = formatTime(cur) + ' / ' + formatTime(dur);
    }

    var stuPlayPause = document.getElementById('cvs-stu-playpause');
    if (stuPlayPause) {
      stuPlayPause.innerHTML = isMediaPlaying() ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
    }

    var stuScrubber = document.getElementById('cvs-stu-scrubber');
    if (stuScrubber && dur > 0) {
      stuScrubber.max = Math.floor(dur);
      stuScrubber.value = Math.floor(cur);
    }

    if (isTeacher && !isDraggingScrubber) {
      var tcCur = document.getElementById('cvs-tc-cur-time');
      var tcDur = document.getElementById('cvs-tc-dur-time');
      var tcScrub = document.getElementById('cvs-tc-scrubber');
      if (tcCur) tcCur.textContent = formatTime(cur);
      if (tcDur) tcDur.textContent = formatTime(dur);
      if (tcScrub && dur > 0) {
        tcScrub.max = Math.floor(dur);
        tcScrub.value = Math.floor(cur);
      }
    }
  }

  /**
   * Si el alumno está en modo bloqueado por el profesor, garantiza que la máquina
   * no se desfase ni quede en pausa/reproducción contraria al docente.
   */
  function enforceStudentLockWatchdog() {
    if (isTeacher || !remoteState || !hasJoinedAudio) return;
    if (remoteState.lockedByTeacher === false) return;
    if (isApplyingRemoteUpdate) return;

    var playingLocal = isMediaPlaying();
    if (remoteState.isPlaying && !playingLocal) {
      playMedia();
    } else if (!remoteState.isPlaying && playingLocal) {
      pauseMedia();
      seekMediaTo(remoteState.baseTime || 0);
    }
  }

  // Iniciar al cargar el DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initClassVideoRoom);
  } else {
    initClassVideoRoom();
  }
})();
