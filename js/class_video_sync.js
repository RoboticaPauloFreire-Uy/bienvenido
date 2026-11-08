/**
 * =============================================================
 * CLASS_VIDEO_SYNC.JS — SALA DE VIDEO SINCRONIZADA EN VIVO (VISTA ALUMNOS)
 * Colegio Paulo Freire · Taller de Robótica, Programación & Cultura Maker
 * =============================================================
 * Reproductor sincronizado en tiempo real para las computadoras del salón.
 * Incluye:
 *  - Sincronización Play/Pausa/Tiempo y Bloqueo/Control Libre
 *  - Modo "¡Atención al Profesor!" (oscurecer pantalla para escuchar al docente)
 *  - Cartel de Consigna / Pregunta en vivo sobre el video
 *  - Lámina / Esquema del Proyecto en pantalla fija durante la pausa
 *  - Mini-Pregunta Interactiva (Votación A/B/C en tiempo real con revelación de respuesta)
 *  - Indicador de Pasos / Capítulos del proyecto y presencia en vivo
 */

(function () {
  'use strict';

  var DOC_COLLECTION = 'config';
  var DOC_ID = 'classroom_video_sync';
  var PRESENCE_COLLECTION = 'classroom_video_presence';
  var MACHINE_ID_KEY = 'pf_classroom_machine_id';

  // Estado local del alumno
  var machineId = '';
  var hasJoinedAudio = false;
  var activeSubTab = 'expedientes'; // 'expedientes' | 'video'
  var remoteState = null;
  var lastAppliedSyncSeq = -1;
  var lastSeenCallSeq = -1;
  var isApplyingRemoteUpdate = false;

  // Estado local de votación de Mini-Pregunta
  var votedQuizId = null;
  var votedOptionIndex = -1;

  // Instancias de reproductores
  var currentMediaType = null; // 'youtube' | 'mp4'
  var currentMediaIdOrUrl = '';
  var ytPlayer = null;
  var ytApiReady = false;
  var ytPlayerReady = false;
  var html5Video = null;
  var uiProgressTimer = null;
  var presenceTimer = null;

  var GRADE_LABELS = {
    todos: 'Todos los Grados',
    sala5: 'Sala de 5',
    grado1: '1° Grado',
    grado2: '2° Grado',
    grado3: '3° Grado',
    grado4: '4° Grado',
    grado5: '5° Grado',
    grado6: '6° Grado'
  };

  var DEFAULT_STATE = {
    videoUrl: 'https://www.youtube.com/watch?v=7afwV_aJcjk',
    videoType: 'youtube',
    youtubeId: '7afwV_aJcjk',
    title: 'Cine de Clase · Taller de Ciencia y Robótica',
    subtitle: 'Miramos y aprendemos todos juntos en sincronía con el Profesor',
    project: 'El Fantasma Levitante',
    grades: ['sala5', 'grado1'],
    isPlaying: false,
    baseTime: 0,
    duration: 0,
    playbackRate: 1,
    lockedByTeacher: true,
    muteStudents: false,
    attentionMode: false,
    livePromptText: '',
    referenceSchema: null, // { url, title }
    activeQuiz: null,      // { id, question, options: [], correctIndex: 0, revealed: false }
    markers: [],
    sessionActive: false,
    callStudentsSeq: 0,
    syncSeq: 1,
    updatedAtMs: Date.now()
  };

  function getOrCreateMachineId() {
    try {
      var existing = sessionStorage.getItem(MACHINE_ID_KEY);
      if (existing) return existing;
      var created = 'pc-' + Math.random().toString(36).substring(2, 9) + '-' + (Date.now() % 100000);
      sessionStorage.setItem(MACHINE_ID_KEY, created);
      return created;
    } catch (e) {
      return 'pc-' + Math.floor(Math.random() * 999999);
    }
  }

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

  function formatGradesText(grades) {
    if (!Array.isArray(grades) || !grades.length || grades.indexOf('todos') !== -1) {
      return 'Todos los Grados';
    }
    return grades.map(function (g) { return GRADE_LABELS[g] || g; }).join(' · ');
  }

  function parseVideoUrl(rawUrl) {
    var url = String(rawUrl || '').trim();
    if (!url) return null;

    var ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
    var ytMatch = url.match(ytRegex);
    if (ytMatch && ytMatch[1]) {
      return {
        type: 'youtube',
        youtubeId: ytMatch[1],
        url: 'https://www.youtube.com/watch?v=' + ytMatch[1]
      };
    }

    if (/^[A-Za-z0-9_-]{11}$/.test(url)) {
      return {
        type: 'youtube',
        youtubeId: url,
        url: 'https://www.youtube.com/watch?v=' + url
      };
    }

    var gdriveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (gdriveMatch && gdriveMatch[1]) {
      return {
        type: 'mp4',
        youtubeId: '',
        url: 'https://drive.google.com/uc?export=download&id=' + gdriveMatch[1]
      };
    }

    return {
      type: 'mp4',
      youtubeId: '',
      url: url
    };
  }

  
  /**
   * Determina si la sesión de video en vivo está actualmente activa
   */
  function isLiveSessionActive(state) {
    if (!state) return false;
    var hasActiveFlag = !!(
      state.sessionActive ||
      state.isPlaying ||
      state.attentionMode ||
      state.referenceSchema ||
      state.activeQuiz
    );
    if (!hasActiveFlag) return false;

    // Verificar si el estado no es viejo/abandonado (más de 6 horas)
    if (state.updatedAtMs && typeof state.updatedAtMs === 'number') {
      var age = Date.now() - state.updatedAtMs;
      if (age > 6 * 60 * 60 * 1000) {
        return false;
      }
    }
    return true;
  }

  /**
   * Crea dinámicamente el cartel flotante en la esquina superior izquierda si no existiera en el HTML
   */
  function ensureGlobalLiveBadgeElement() {
    var existing = document.getElementById('pf-global-live-badge');
    if (existing) return existing;

    var el = document.createElement('div');
    el.id = 'pf-global-live-badge';
    el.className = 'pf-global-live-badge';
    el.style.display = 'none';
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('title', '¡Hay una clase en vivo! Tocá para unirte automáticamente');
    el.innerHTML =
      '<div class="pf-glb-left">' +
        '<span class="pf-glb-radar">' +
          '<span class="pf-glb-ring"></span>' +
          '<span class="pf-glb-dot"></span>' +
        '</span>' +
        '<span class="pf-glb-tag">EN VIVO</span>' +
      '</div>' +
      '<div class="pf-glb-divider"></div>' +
      '<div class="pf-glb-center">' +
        '<span class="pf-glb-title" id="pf-glb-title">Cine de Clase</span>' +
        '<span class="pf-glb-sub" id="pf-glb-sub"><i class="fas fa-play" style="color:#4ADE80;font-size:0.6rem;"></i> Tocá para unirte</span>' +
      '</div>' +
      '<div class="pf-glb-action">' +
        '<i class="fas fa-play"></i>' +
      '</div>';

    el.addEventListener('click', handleGlobalLiveBadgeClick);
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        handleGlobalLiveBadgeClick(e);
      }
    });

    document.body.appendChild(el);
    return el;
  }

  /**
   * Actualiza la visibilidad y textos del cartel flotante 'EN VIVO'
   */
  function updateGlobalLiveBadge() {
    var badge = document.getElementById('pf-global-live-badge');
    if (!badge) {
      badge = ensureGlobalLiveBadgeElement();
    }
    if (!badge) return;

    var isLive = isLiveSessionActive(remoteState);
    if (!isLive) {
      badge.style.display = 'none';
      return;
    }

    // Si el usuario ya está viendo la Sala de Video en index.html, ocultar para no tapar controles
    var isWatchingVideoNow = false;
    var container = document.getElementById('clase-video-room-container');
    if (container) {
      var viewClase = document.getElementById('view-clase');
      var isClaseActive = viewClase && (viewClase.classList.contains('active') || viewClase.style.display !== 'none');
      if (isClaseActive && activeSubTab === 'video') {
        isWatchingVideoNow = true;
      }
    }

    if (isWatchingVideoNow) {
      badge.style.display = 'none';
      return;
    }

    var titleEl = document.getElementById('pf-glb-title');
    var subEl = document.getElementById('pf-glb-sub');
    if (titleEl) {
      var t = (remoteState && (remoteState.project || remoteState.title))
        ? (remoteState.project || remoteState.title)
        : 'Cine de Clase';
      titleEl.textContent = t;
      titleEl.title = t;
    }
    if (subEl) {
      if (remoteState && remoteState.attentionMode) {
        subEl.innerHTML = '<i class="fas fa-eye" style="color:#FBBF24;"></i> ¡Atención al Profesor!';
      } else if (remoteState && remoteState.activeQuiz) {
        subEl.innerHTML = '<i class="fas fa-poll" style="color:#F43F5E;"></i> ¡Pregunta en Vivo!';
      } else if (remoteState && remoteState.referenceSchema) {
        subEl.innerHTML = '<i class="fas fa-drafting-compass" style="color:#38BDF8;"></i> Lámina del Proyecto';
      } else {
        subEl.innerHTML = '<i class="fas fa-play" style="color:#4ADE80;font-size:0.6rem;"></i> Tocá para unirte';
      }
    }

    badge.style.display = 'inline-flex';
  }
  window.updateGlobalLiveBadge = updateGlobalLiveBadge;

  /**
   * Conecta y une automáticamente al alumno a la Sala de Video en vivo
   */
  function joinLiveVideoAutomatically() {
    hasJoinedAudio = true;

    // Permitir visualización si el alumno está logueado en su cuenta de Google Drive
    if (document.body.classList.contains('student-logged-in')) {
      document.body.classList.add('in-class-video');
    }

    if (typeof window.switchView === 'function') {
      window.switchView('clase', false);
    }
    switchClaseSubTab('video');

    var overlay = document.getElementById('cvs-join-overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }

    applyAudioState();

    if (remoteState) {
      applyRemoteStateToPlayer(remoteState, true);
      if (remoteState.isPlaying && !remoteState.attentionMode && !remoteState.referenceSchema && !remoteState.activeQuiz) {
        playMedia();
      }
    }

    sendPresencePing();

    setTimeout(function () {
      var vidStage = document.getElementById('cvs-player-stage') || document.getElementById('clase-video-room-container');
      if (vidStage) {
        vidStage.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 120);

    updateGlobalLiveBadge();
  }
  window.joinLiveVideoAutomatically = joinLiveVideoAutomatically;

  /**
   * Manejador de clic en el cartel flotante
   */
  function handleGlobalLiveBadgeClick(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    var container = document.getElementById('clase-video-room-container');
    if (container) {
      // Estamos en index.html: unirse directamente en la misma página
      joinLiveVideoAutomatically();
    } else {
      // Estamos en otra página (ej: aula.html): guardar flag y navegar a index.html#clase-video
      try {
        sessionStorage.setItem('pf_autojoin_video', '1');
      } catch (err) {}
      window.location.href = 'index.html#clase-video';
    }
  }

  /**
   * Chequea si venimos redirigidos para unirnos automáticamente
   */
  function checkAutoJoinVideoFlag() {
    try {
      var flag = sessionStorage.getItem('pf_autojoin_video');
      if (flag === '1') {
        sessionStorage.removeItem('pf_autojoin_video');
        setTimeout(function () {
          joinLiveVideoAutomatically();
        }, 300);
      }
    } catch (e) {}
  }

  /**
   * Inicializa la sincronización global (badge + Firestore listener en toda página pública)
   */
  function initGlobalLiveSync() {
    ensureGlobalLiveBadgeElement();

    var staticBadge = document.getElementById('pf-global-live-badge');
    if (staticBadge) {
      staticBadge.removeEventListener('click', handleGlobalLiveBadgeClick);
      staticBadge.addEventListener('click', handleGlobalLiveBadgeClick);
      staticBadge.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          handleGlobalLiveBadgeClick(e);
        }
      });
    }

    connectFirestoreListener();
    checkAutoJoinVideoFlag();

    window.addEventListener('hashchange', function () {
      setTimeout(updateGlobalLiveBadge, 60);
    });
    window.addEventListener('popstate', function () {
      setTimeout(updateGlobalLiveBadge, 60);
    });
  }

  function initClassVideoRoom() {
    var container = document.getElementById('clase-video-room-container');
    if (!container) return;

    machineId = getOrCreateMachineId();

    renderStudentRoomSkeleton(container);
    bindStudentEvents();
    loadYouTubeApiIfNeeded();
    connectFirestoreListener();
    startUiTimers();
    startPresenceHeartbeat();

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
    } else if (h === 'herramientas' || h === 'clase-herramientas') {
      if (typeof window.switchView === 'function') {
        window.switchView('clase', false);
      }
      switchClaseSubTab('herramientas');
    }
  }

  function switchClaseSubTab(tabName) {
    if (tabName === 'video') activeSubTab = 'video';
    else if (tabName === 'herramientas') activeSubTab = 'herramientas';
    else activeSubTab = 'expedientes';

    if (activeSubTab !== 'video' && document.body.classList.contains('student-logged-in')) {
      document.body.classList.remove('in-class-video');
    }

    var expWrap = document.getElementById('clase-expedientes-wrap');
    var toolsWrap = document.getElementById('clase-herramientas-wrap');
    var vidWrap = document.getElementById('clase-video-room-container');
    var filterWrap = document.getElementById('hn-clase-filter-wrap');
    var tabExpBtn = document.getElementById('btn-clase-tab-expedientes');
    var tabToolsBtn = document.getElementById('btn-clase-tab-herramientas');
    var tabVidBtn = document.getElementById('btn-clase-tab-video');

    if (expWrap) expWrap.style.display = activeSubTab === 'expedientes' ? '' : 'none';
    if (toolsWrap) toolsWrap.style.display = activeSubTab === 'herramientas' ? 'block' : 'none';
    if (vidWrap) vidWrap.style.display = activeSubTab === 'video' ? 'block' : 'none';
    if (filterWrap) filterWrap.style.display = activeSubTab === 'expedientes' ? '' : 'none';

    if (tabExpBtn) tabExpBtn.classList.toggle('active', activeSubTab === 'expedientes');
    if (tabToolsBtn) tabToolsBtn.classList.toggle('active', activeSubTab === 'herramientas');
    if (tabVidBtn) tabVidBtn.classList.toggle('active', activeSubTab === 'video');

    var liveBanner = document.getElementById('cvs-live-clase-banner');
    if (liveBanner && remoteState) {
      liveBanner.style.display = (remoteState.isPlaying && activeSubTab !== 'video') ? 'flex' : 'none';
    }

    if (activeSubTab === 'herramientas' && typeof window.renderHerramientas === 'function') {
      window.renderHerramientas();
    }

    sendPresencePing();

    if (activeSubTab === 'video' && remoteState) {
      setTimeout(function () {
        applyRemoteStateToPlayer(remoteState, true);
      }, 150);
    }

    updateGlobalLiveBadge();
  }
  window.switchClaseSubTab = switchClaseSubTab;

  /**
   * Presencia en vivo + envío de respuesta de Mini-Pregunta
   */
  function startPresenceHeartbeat() {
    sendPresencePing();
    if (presenceTimer) clearInterval(presenceTimer);
    presenceTimer = setInterval(sendPresencePing, 20000);

    window.addEventListener('beforeunload', function () {
      if (window.db && typeof window.db.collection === 'function' && machineId) {
        try {
          window.db.collection(PRESENCE_COLLECTION).doc(machineId).delete();
        } catch (e) {}
      }
    });
  }

  function sendPresencePing() {
    if (!window.db || typeof window.db.collection !== 'function' || !machineId) return;
    var isClaseViewActive = false;
    var viewClase = document.getElementById('view-clase');
    if (viewClase && viewClase.classList.contains('active')) {
      isClaseViewActive = true;
    }

    window.db.collection(PRESENCE_COLLECTION).doc(machineId).set({
      machineId: machineId,
      inClase: isClaseViewActive,
      inVideoRoom: isClaseViewActive && activeSubTab === 'video',
      audioJoined: !!hasJoinedAudio,
      quizId: votedQuizId || '',
      quizAnswer: votedOptionIndex,
      lastSeenMs: Date.now()
    }, { merge: true }).catch(function () {});
  }

  /**
   * Renderiza la Sala de Video limpia para los alumnos
   */
  function renderStudentRoomSkeleton(container) {
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
              '<div class="cvs-meta-chips-row">' +
                '<span class="cvs-meta-chip cvs-chip-grade" id="cvs-grade-badge"><i class="fas fa-graduation-cap"></i> Todos los Grados</span>' +
                '<span class="cvs-meta-chip cvs-chip-project" id="cvs-project-badge" style="display:none;"><i class="fas fa-rocket"></i> Proyecto</span>' +
              '</div>' +
              '<h3 class="cvs-video-title" id="cvs-video-title">Cargando Sala de Video...</h3>' +
              '<p class="cvs-video-sub" id="cvs-video-sub">Conectando en tiempo real con el Taller...</p>' +
            '</div>' +
          '</div>' +

          '<div class="cvs-header-right">' +
            '<span class="cvs-mode-indicator is-locked" id="cvs-mode-indicator">' +
              '<i class="fas fa-lock"></i> <span>Controlado por el Profesor</span>' +
            '</span>' +
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

            /* Cartel de Consigna / Pregunta en vivo enviado por el Profesor */
            '<div class="cvs-prompt-banner" id="cvs-prompt-banner" style="display:none;">' +
              '<div class="cvs-prompt-icon"><i class="fas fa-bullhorn"></i></div>' +
              '<div class="cvs-prompt-content">' +
                '<span class="cvs-prompt-kicker">CONSIGNA DEL PROFESOR EN CLASE</span>' +
                '<p class="cvs-prompt-text" id="cvs-prompt-text"></p>' +
              '</div>' +
            '</div>' +

            /* Cartel flotante de Pausa del Profesor */
            '<div class="cvs-paused-badge" id="cvs-paused-badge" style="display:none;">' +
              '<i class="fas fa-pause-circle"></i> <span>VIDEO EN PAUSA POR EL PROFESOR</span>' +
            '</div>' +

            /* Overlay 1: Lámina / Esquema del Proyecto proyectado por el Profesor */
            '<div class="cvs-schema-overlay" id="cvs-schema-overlay" style="display:none;">' +
              '<div class="cvs-schema-top">' +
                '<span class="cvs-schema-badge"><i class="fas fa-drafting-compass"></i> LÁMINA Y ESQUEMA EN PANTALLA</span>' +
                '<strong class="cvs-schema-title" id="cvs-schema-title">Esquema del Proyecto</strong>' +
              '</div>' +
              '<div class="cvs-schema-img-wrap">' +
                '<img id="cvs-schema-img" src="" alt="Esquema del Proyecto">' +
              '</div>' +
            '</div>' +

            /* Overlay 2: Mini-Pregunta Interactiva (Votación A / B / C en Clase) */
            '<div class="cvs-quiz-overlay" id="cvs-quiz-overlay" style="display:none;">' +
              '<div class="cvs-quiz-card">' +
                '<span class="cvs-quiz-kicker"><i class="fas fa-bolt"></i> DESAFÍO INTERACTIVO EN VIVO</span>' +
                '<h3 class="cvs-quiz-question" id="cvs-quiz-question">¿Pregunta de la clase?</h3>' +
                '<div class="cvs-quiz-options" id="cvs-quiz-options"></div>' +
                '<div class="cvs-quiz-feedback" id="cvs-quiz-feedback" style="display:none;"></div>' +
              '</div>' +
            '</div>' +

            /* Overlay 3: Modo "¡Atención al Profesor!" (Oscurece toda la pantalla) */
            '<div class="cvs-attention-overlay" id="cvs-attention-overlay" style="display:none;">' +
              '<div class="cvs-attention-box">' +
                '<div class="cvs-attention-icon">👀</div>' +
                '<span class="cvs-attention-kicker">PAUSA DE EXPLICACIÓN EN EL AULA</span>' +
                '<h3 class="cvs-attention-title">¡Miramos y Escuchamos al Profesor!</h3>' +
                '<p class="cvs-attention-sub" id="cvs-attention-custom-msg">Dejamos el mouse y el teclado un momento y prestamos atención al frente.</p>' +
              '</div>' +
            '</div>' +

            /* Overlay inicial para Alumnos: 1 Clic para habilitar Sonido + Sincronización */
            '<div class="cvs-join-overlay" id="cvs-join-overlay">' +
              '<div class="cvs-join-card">' +
                '<div class="cvs-join-icon-ring"><i class="fas fa-volume-up"></i></div>' +
                '<span class="cvs-join-kicker">CINE DE CLASE · SINCRONIZACIÓN EN VIVO</span>' +
                '<h4 class="cvs-join-title">Conectar Pantalla y Sonido</h4>' +
                '<p class="cvs-join-desc">Hacé un clic en el botón verde para escuchar el audio en tu máquina y seguir el video junto con el Profesor.</p>' +
                '<button type="button" class="cvs-join-btn" id="cvs-join-btn">' +
                  '<i class="fas fa-play"></i> ¡UNIRME A LA TRANSMISIÓN CON SONIDO!' +
                '</button>' +
              '</div>' +
            '</div>' +
          '</div>' +

          /* ── BARRA INFERIOR DEL REPRODUCTOR ── */
          '<div class="cvs-player-bar" id="cvs-player-bar">' +
            '<div class="cvs-player-bar-left">' +
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

              '<div class="cvs-student-locked-msg" id="cvs-student-locked-msg">' +
                '<i class="fas fa-broadcast-tower"></i> ' +
                '<span id="cvs-student-locked-text">Sincronizado con el Profesor (Play y Pausa automáticos)</span>' +
              '</div>' +
            '</div>' +

            '<div class="cvs-player-bar-right">' +
              '<span class="cvs-time-readout" id="cvs-time-readout">00:00 / 00:00</span>' +
              '<button type="button" class="cvs-bar-btn" id="cvs-btn-resync-local" title="Sincronizar con el segundo exacto del Profesor">' +
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

        /* ── TIRA DE PASOS / MARCADORES DEL PROYECTO ── */
        '<div class="cvs-markers-strip" id="cvs-markers-strip" style="display:none;">' +
          '<span class="cvs-markers-lbl"><i class="fas fa-list-ol"></i> Pasos del Video:</span>' +
          '<div class="cvs-markers-list" id="cvs-markers-list"></div>' +
        '</div>' +

      '</div>';

    html5Video = document.getElementById('cvs-html5-video');
  }

  function bindStudentEvents() {
    var joinBtn = document.getElementById('cvs-join-btn');
    if (joinBtn) {
      joinBtn.addEventListener('click', function () {
        hasJoinedAudio = true;
        var overlay = document.getElementById('cvs-join-overlay');
        if (overlay) overlay.style.display = 'none';

        applyAudioState();
        sendPresencePing();

        if (remoteState) {
          applyRemoteStateToPlayer(remoteState, true);
        } else {
          playMedia();
        }
      });
    }

    var stuPlayPause = document.getElementById('cvs-stu-playpause');
    if (stuPlayPause) {
      stuPlayPause.addEventListener('click', function () {
        if (remoteState && remoteState.lockedByTeacher !== false) return;
        if (isMediaPlaying()) pauseMedia();
        else playMedia();
        updateTimeUi();
      });
    }

    var stuRew = document.getElementById('cvs-stu-rew');
    if (stuRew) {
      stuRew.addEventListener('click', function () {
        if (remoteState && remoteState.lockedByTeacher !== false) return;
        seekMediaTo(Math.max(0, getMediaCurrentTime() - 10));
      });
    }

    var stuFwd = document.getElementById('cvs-stu-fwd');
    if (stuFwd) {
      stuFwd.addEventListener('click', function () {
        if (remoteState && remoteState.lockedByTeacher !== false) return;
        seekMediaTo(getMediaCurrentTime() + 10);
      });
    }

    var stuScrubber = document.getElementById('cvs-stu-scrubber');
    if (stuScrubber) {
      stuScrubber.addEventListener('change', function () {
        if (remoteState && remoteState.lockedByTeacher !== false) return;
        seekMediaTo(Number(stuScrubber.value) || 0);
      });
    }

    var resyncLocalBtn = document.getElementById('cvs-btn-resync-local');
    if (resyncLocalBtn) {
      resyncLocalBtn.addEventListener('click', function () {
        hasJoinedAudio = true;
        var overlay = document.getElementById('cvs-join-overlay');
        if (overlay) overlay.style.display = 'none';
        applyAudioState();
        sendPresencePing();
        if (remoteState) {
          applyRemoteStateToPlayer(remoteState, true);
        }
      });
    }

    var muteLocalBtn = document.getElementById('cvs-btn-mute-local');
    if (muteLocalBtn) {
      muteLocalBtn.addEventListener('click', function () {
        hasJoinedAudio = !hasJoinedAudio;
        var overlay = document.getElementById('cvs-join-overlay');
        if (hasJoinedAudio && overlay) overlay.style.display = 'none';
        applyAudioState();
        sendPresencePing();
      });
    }

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

    document.addEventListener('keydown', function (e) {
      if (activeSubTab !== 'video') return;
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

    if (remoteState && remoteState.lockedByTeacher !== false && hasJoinedAudio) {
      var shouldBePlaying = remoteState.isPlaying && !remoteState.attentionMode && !remoteState.referenceSchema && !remoteState.activeQuiz;
      if (shouldBePlaying && event.data === YTState.PAUSED) {
        setTimeout(function () {
          if (remoteState && remoteState.isPlaying && !remoteState.attentionMode && !remoteState.referenceSchema && !remoteState.activeQuiz && remoteState.lockedByTeacher !== false) {
            playMedia();
          }
        }, 200);
      } else if (!shouldBePlaying && event.data === YTState.PLAYING) {
        setTimeout(function () {
          if (remoteState && (!remoteState.isPlaying || remoteState.attentionMode || remoteState.referenceSchema || remoteState.activeQuiz) && remoteState.lockedByTeacher !== false) {
            pauseMedia();
            seekMediaTo(remoteState.baseTime || 0);
          }
        }, 150);
      }
    }

    updateTimeUi();
  }

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
          if (shouldPlay && hasJoinedAudio) {
            ytPlayer.loadVideoById({ videoId: cleanYtId, startSeconds: targetSeconds || 0 });
          } else if (typeof ytPlayer.cueVideoById === 'function') {
            ytPlayer.cueVideoById({ videoId: cleanYtId, startSeconds: targetSeconds || 0 });
          }
          setTimeout(function () { isApplyingRemoteUpdate = false; }, 600);
        }
      }
    } else {
      if (ytWrap) ytWrap.style.display = 'none';
      if (mp4Wrap) mp4Wrap.style.display = 'block';
      if (ytPlayer && ytPlayerReady && typeof ytPlayer.pauseVideo === 'function') {
        try { ytPlayer.pauseVideo(); } catch (e) {}
      }

      if (html5Video && currentMediaIdOrUrl !== url) {
        currentMediaIdOrUrl = url;
        isApplyingRemoteUpdate = true;
        html5Video.src = url;
        html5Video.load();
        html5Video.addEventListener('loadedmetadata', function onMeta() {
          html5Video.removeEventListener('loadedmetadata', onMeta);
          if (targetSeconds > 0) {
            try { html5Video.currentTime = targetSeconds; } catch (ex) {}
          }
          if (shouldPlay && hasJoinedAudio) {
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
          hasJoinedAudio = false;
          var overlay = document.getElementById('cvs-join-overlay');
          if (overlay) overlay.style.display = 'flex';
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
    if (!hasJoinedAudio) {
      shouldMute = true;
    } else if (remoteState && (remoteState.muteStudents || remoteState.attentionMode)) {
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

  function connectFirestoreListener() {
    if (!window.db || typeof window.db.collection !== 'function') {
      setTimeout(connectFirestoreListener, 600);
      return;
    }

    var docRef = window.db.collection(DOC_COLLECTION).doc(DOC_ID);

    docRef.onSnapshot(function (doc) {
      if (!doc.exists) {
        remoteState = Object.assign({}, DEFAULT_STATE);
        renderStateMetadata(remoteState);
        applyRemoteStateToPlayer(remoteState, true);
        updateGlobalLiveBadge();
        return;
      }

      var data = doc.data() || {};
      var merged = Object.assign({}, DEFAULT_STATE, data);
      var prevSeq = lastAppliedSyncSeq;
      var isExplicitTeacherCommand = (merged.syncSeq !== prevSeq);

      if (lastSeenCallSeq !== -1 && merged.callStudentsSeq && merged.callStudentsSeq > lastSeenCallSeq) {
        joinLiveVideoAutomatically();
      }
      lastSeenCallSeq = merged.callStudentsSeq || 0;

      remoteState = merged;
      renderStateMetadata(merged);
      applyRemoteStateToPlayer(merged, isExplicitTeacherCommand);

      lastAppliedSyncSeq = merged.syncSeq;
      updateGlobalLiveBadge();
    }, function (err) {
      console.warn('Aviso de sincronización de Sala de Video:', err);
    });
  }

  function applyRemoteStateToPlayer(state, isExplicitCommand) {
    if (!state) return;

    isApplyingRemoteUpdate = true;

    var vType = state.videoType === 'mp4' ? 'mp4' : 'youtube';
    var vUrl = state.videoUrl || DEFAULT_STATE.videoUrl;
    var ytId = state.youtubeId || (parseVideoUrl(vUrl) && parseVideoUrl(vUrl).youtubeId) || DEFAULT_STATE.youtubeId;
    var targetTime = Number(state.baseTime) || 0;

    var expectedIdOrUrl = vType === 'youtube' ? ytId : vUrl;
    var sourceChanged = (currentMediaType !== vType) || (currentMediaIdOrUrl !== expectedIdOrUrl);

    var canPlayNow = state.isPlaying && !state.attentionMode && !state.referenceSchema && !state.activeQuiz;

    if (sourceChanged) {
      loadMediaSource(vType, vUrl, ytId, targetTime, canPlayNow);
    }

    if (state.attentionMode || state.referenceSchema || state.activeQuiz) {
      pauseMedia();
      applyAudioState();
      setTimeout(function () { isApplyingRemoteUpdate = false; }, 350);
      return;
    }

    var shouldEnforceSync = (state.lockedByTeacher !== false) || isExplicitCommand || sourceChanged;

    if (shouldEnforceSync) {
      if (state.playbackRate) {
        setMediaPlaybackRate(state.playbackRate);
      }

      var localSec = getMediaCurrentTime();
      var tolerance = isExplicitCommand ? 0.8 : 2.5;
      if (Math.abs(localSec - targetTime) > tolerance) {
        seekMediaTo(targetTime);
      }

      if (canPlayNow) {
        if (hasJoinedAudio) {
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

  function renderStateMetadata(state) {
    if (!state) return;

    var titleEl = document.getElementById('cvs-video-title');
    var subEl = document.getElementById('cvs-video-sub');
    if (titleEl) titleEl.textContent = state.title || 'Cine de Clase';
    if (subEl) subEl.textContent = state.subtitle || 'Proyección sincronizada del Taller';

    var gradeBadge = document.getElementById('cvs-grade-badge');
    if (gradeBadge) {
      var gList = Array.isArray(state.grades) ? state.grades : (state.grade ? [state.grade] : ['todos']);
      gradeBadge.innerHTML = '<i class="fas fa-graduation-cap"></i> ' + esc(formatGradesText(gList));
    }

    var projBadge = document.getElementById('cvs-project-badge');
    if (projBadge) {
      if (state.project && String(state.project).trim()) {
        projBadge.style.display = 'inline-flex';
        projBadge.innerHTML = '<i class="fas fa-rocket"></i> Proyecto: ' + esc(state.project);
      } else {
        projBadge.style.display = 'none';
      }
    }

    var livePill = document.getElementById('cvs-live-pill');
    var livePillText = document.getElementById('cvs-live-pill-text');
    if (livePill && livePillText) {
      livePill.classList.toggle('is-playing', !!(state.isPlaying && !state.attentionMode));
      livePillText.textContent = state.attentionMode
        ? 'ATENCIÓN AL FRENTE'
        : (state.activeQuiz ? 'PREGUNTA EN VIVO' : (state.referenceSchema ? 'LÁMINA EN PANTALLA' : (state.isPlaying ? 'EN VIVO · REPRODUCIENDO' : 'SALA EN PAUSA')));
    }

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

    // 1. Modo "¡Atención al Profesor!"
    var attentionOverlay = document.getElementById('cvs-attention-overlay');
    var attentionCustomMsg = document.getElementById('cvs-attention-custom-msg');
    if (attentionOverlay) {
      attentionOverlay.style.display = state.attentionMode ? 'flex' : 'none';
      if (attentionCustomMsg) {
        attentionCustomMsg.textContent = (state.livePromptText && state.livePromptText.trim())
          ? state.livePromptText.trim()
          : 'Dejamos el mouse y el teclado un momento y prestamos atención al Profesor.';
      }
    }

    // 2. Lámina / Esquema del Proyecto en Pausa (#3)
    var schemaOverlay = document.getElementById('cvs-schema-overlay');
    var schemaImg = document.getElementById('cvs-schema-img');
    var schemaTitle = document.getElementById('cvs-schema-title');
    if (schemaOverlay && schemaImg) {
      var hasSchema = !!(state.referenceSchema && state.referenceSchema.url) && !state.attentionMode && !state.activeQuiz;
      schemaOverlay.style.display = hasSchema ? 'flex' : 'none';
      if (hasSchema) {
        if (schemaImg.getAttribute('src') !== state.referenceSchema.url) {
          schemaImg.setAttribute('src', state.referenceSchema.url);
        }
        if (schemaTitle) {
          schemaTitle.textContent = state.referenceSchema.title || 'Lámina del Proyecto';
        }
      }
    }

    // 3. Mini-Pregunta Interactiva A/B/C (#4)
    renderStudentQuizOverlay(state.activeQuiz, state.attentionMode);

    // 4. Cartel de Consigna / Pregunta en Vivo
    var promptBanner = document.getElementById('cvs-prompt-banner');
    var promptText = document.getElementById('cvs-prompt-text');
    if (promptBanner && promptText) {
      var hasPrompt = !!(state.livePromptText && state.livePromptText.trim()) && !state.attentionMode && !state.activeQuiz;
      promptBanner.style.display = hasPrompt ? 'flex' : 'none';
      if (hasPrompt) {
        promptText.textContent = state.livePromptText.trim();
      }
    }

    var locked = state.lockedByTeacher !== false;
    var modeInd = document.getElementById('cvs-mode-indicator');
    if (modeInd) {
      modeInd.className = 'cvs-mode-indicator ' + (locked ? 'is-locked' : 'is-free');
      modeInd.innerHTML = locked
        ? '<i class="fas fa-lock"></i> <span>Controlado por el Profesor</span>'
        : '<i class="fas fa-unlock"></i> <span>Control Libre en tu Máquina</span>';
    }

    var shield = document.getElementById('cvs-student-shield');
    if (shield) {
      shield.style.display = locked ? 'block' : 'none';
    }

    var pausedBadge = document.getElementById('cvs-paused-badge');
    if (pausedBadge) {
      var showPaused = !state.isPlaying && !state.attentionMode && !state.referenceSchema && !state.activeQuiz && !state.livePromptText && locked && hasJoinedAudio;
      pausedBadge.style.display = showPaused ? 'flex' : 'none';
    }

    var stuFreeControls = document.getElementById('cvs-student-free-controls');
    var stuLockedMsg = document.getElementById('cvs-student-locked-msg');
    var stuLockedText = document.getElementById('cvs-student-locked-text');
    if (stuFreeControls && stuLockedMsg) {
      if (!locked) {
        stuFreeControls.style.display = 'inline-flex';
        stuLockedMsg.style.display = 'none';
      } else {
        stuFreeControls.style.display = 'none';
        stuLockedMsg.style.display = 'inline-flex';
        if (stuLockedText) {
          stuLockedText.textContent = state.attentionMode
            ? '👀 Escuchamos la explicación del Profesor'
            : (state.activeQuiz
                ? '🎯 Respondé la pregunta interactiva en pantalla'
                : (state.referenceSchema
                    ? '📐 Observando lámina del proyecto'
                    : (state.isPlaying
                        ? '🔒 Reproduciendo en sincronía con el Profesor'
                        : '⏸️ En pausa por el Profesor (esperando orden de Play)')));
        }
      }
    }

    renderStudentMarkers(state.markers || [], locked);
  }

  /**
   * Renderiza la Mini-Pregunta Interactiva en la máquina del alumno
   */
  function renderStudentQuizOverlay(quiz, isAttention) {
    var overlay = document.getElementById('cvs-quiz-overlay');
    var qEl = document.getElementById('cvs-quiz-question');
    var optsEl = document.getElementById('cvs-quiz-options');
    var fbEl = document.getElementById('cvs-quiz-feedback');
    if (!overlay || !qEl || !optsEl || !fbEl) return;

    if (!quiz || !quiz.id || !quiz.question || isAttention) {
      overlay.style.display = 'none';
      return;
    }

    // Si es una pregunta nueva distinta a la anterior, limpiar voto local
    if (votedQuizId !== quiz.id) {
      votedQuizId = null;
      votedOptionIndex = -1;
    }

    overlay.style.display = 'flex';
    qEl.textContent = quiz.question;

    var letters = ['A', 'B', 'C', 'D'];
    var options = Array.isArray(quiz.options) ? quiz.options : [];
    var hasVoted = (votedQuizId === quiz.id && votedOptionIndex >= 0);
    var isRevealed = !!quiz.revealed;
    var correctIdx = Number(quiz.correctIndex || 0);

    optsEl.innerHTML = options.map(function (optText, idx) {
      var cls = 'cvs-quiz-opt-btn';
      if (hasVoted && votedOptionIndex === idx) cls += ' is-selected';
      if (isRevealed) {
        if (idx === correctIdx) cls += ' is-correct';
        else if (hasVoted && votedOptionIndex === idx) cls += ' is-wrong';
      }

      return '<button type="button" class="' + cls + '" data-quiz-opt="' + idx + '"' + ((hasVoted || isRevealed) ? ' disabled' : '') + '>' +
        '<span class="cvs-quiz-letter">' + (letters[idx] || (idx + 1)) + '</span>' +
        '<span class="cvs-quiz-opt-txt">' + esc(optText) + '</span>' +
        (isRevealed && idx === correctIdx ? '<i class="fas fa-check-circle cvs-quiz-status-icon"></i>' : '') +
      '</button>';
    }).join('');

    if (isRevealed) {
      fbEl.style.display = 'block';
      if (hasVoted && votedOptionIndex === correctIdx) {
        fbEl.className = 'cvs-quiz-feedback is-win';
        fbEl.innerHTML = '🎉 <strong>¡Excelente! ¡Acertaron la respuesta correcta!</strong>';
      } else {
        fbEl.className = 'cvs-quiz-feedback is-info';
        fbEl.innerHTML = '💡 <strong>Respuesta correcta: Opción ' + (letters[correctIdx] || 'A') + '</strong> — ' + esc(options[correctIdx] || '');
      }
    } else if (hasVoted) {
      fbEl.style.display = 'block';
      fbEl.className = 'cvs-quiz-feedback is-waiting';
      fbEl.innerHTML = '✅ <strong>¡Respuesta enviada!</strong> Esperando a que el Profesor revele el resultado...';
    } else {
      fbEl.style.display = 'none';
    }

    if (!hasVoted && !isRevealed) {
      optsEl.querySelectorAll('[data-quiz-opt]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          votedQuizId = quiz.id;
          votedOptionIndex = Number(btn.getAttribute('data-quiz-opt'));
          sendPresencePing();
          renderStudentQuizOverlay(quiz, false);
        });
      });
    }
  }

  function renderStudentMarkers(markers, locked) {
    var strip = document.getElementById('cvs-markers-strip');
    var listEl = document.getElementById('cvs-markers-list');
    if (!strip || !listEl) return;

    if (!Array.isArray(markers) || !markers.length) {
      strip.style.display = 'none';
      return;
    }

    strip.style.display = 'flex';
    listEl.innerHTML = markers.map(function (m, idx) {
      return '<button type="button" class="cvs-marker-chip"' +
        (locked ? ' disabled title="Controlado por el Profesor"' : ' data-marker-sec="' + Number(m.time || 0) + '"') + '>' +
        '<span class="cvs-marker-time">' + formatTime(m.time || 0) + '</span> ' +
        '<span>' + esc(m.label || ('Paso ' + (idx + 1))) + '</span>' +
      '</button>';
    }).join('');

    if (!locked) {
      listEl.querySelectorAll('[data-marker-sec]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var sec = Number(btn.getAttribute('data-marker-sec')) || 0;
          seekMediaTo(sec);
        });
      });
    }
  }

  function startUiTimers() {
    if (uiProgressTimer) clearInterval(uiProgressTimer);
    uiProgressTimer = setInterval(function () {
      updateTimeUi();
      enforceStudentLockWatchdog();
    }, 600);
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
  }

  function enforceStudentLockWatchdog() {
    if (!remoteState || !hasJoinedAudio) return;
    if (remoteState.lockedByTeacher === false) return;
    if (isApplyingRemoteUpdate) return;

    var playingLocal = isMediaPlaying();
    if (remoteState.attentionMode || remoteState.referenceSchema || remoteState.activeQuiz) {
      if (playingLocal) pauseMedia();
      return;
    }

    if (remoteState.isPlaying && !playingLocal) {
      playMedia();
    } else if (!remoteState.isPlaying && playingLocal) {
      pauseMedia();
      seekMediaTo(remoteState.baseTime || 0);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initGlobalLiveSync();
      initClassVideoRoom();
    });
  } else {
    initGlobalLiveSync();
    initClassVideoRoom();
  }
})();
