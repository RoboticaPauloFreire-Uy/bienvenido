/**
 * =============================================================
 * PROFESOR_VIDEOS.JS — MANDO REMOTO MÓVIL Y BIBLIOTECA DOCENTE
 * Colegio Paulo Freire · Taller de Robótica, Programación & Cultura Maker
 * =============================================================
 * Incluye las 4 funciones avanzadas de aula:
 *  1. 👀 Modo "¡Atención al Profesor!" (Oscurecer pantallas de alumnos)
 *  2. 💬 Cartel de Consigna / Pregunta en vivo sobre el video
 *  3. 📍 Marcadores de Pasos del Video + Auto-pausa automática en cada paso
 *  4. 💻 Contador en tiempo real de máquinas conectadas y con sonido activo
 */

(function () {
  'use strict';

  var DOC_COLLECTION = 'config';
  var DOC_ID = 'classroom_video_sync';
  var PRESENCE_COLLECTION = 'classroom_video_presence';
  var SESSION_KEY = 'pf_teacher_video_cabin_auth';
  var VALID_PASSWORDS = ['2026', '1234', 'paulo2026', 'admin123', 'robotica2026'];

  var GRADE_LABELS = {
    todos: 'Todos',
    sala5: 'Sala 5',
    grado1: '1° Grado',
    grado2: '2° Grado',
    grado3: '3° Grado',
    grado4: '4° Grado',
    grado5: '5° Grado',
    grado6: '6° Grado'
  };

  var DEFAULT_LIBRARY = [
    {
      id: 'vid-fantasma-imanes',
      title: 'El Magnetismo y los Imanes — El Fantasma Levitante',
      subtitle: '¿Por qué flota nuestro fantasma sin tocar el palito superior?',
      project: 'El Fantasma Levitante',
      grades: ['sala5', 'grado1'],
      url: 'https://www.youtube.com/watch?v=7afwV_aJcjk',
      type: 'youtube',
      youtubeId: '7afwV_aJcjk',
      duration: 240,
      markers: [
        { label: 'Paso 1: Materiales', time: 15 },
        { label: 'Paso 2: Polos del Imán', time: 65 },
        { label: 'Paso 3: Armado y Levitación', time: 130 }
      ]
    },
    {
      id: 'vid-guitarra-carton',
      title: 'Conductividad y Sonido con Micro:bit',
      subtitle: 'Cómo funcionan los circuitos musicales de nuestra guitarra de cartón',
      project: 'Guitarra musical de cartón',
      grades: ['grado3'],
      url: 'https://www.youtube.com/watch?v=TdNU26840_8',
      type: 'youtube',
      youtubeId: 'TdNU26840_8',
      duration: 240,
      markers: [
        { label: 'Paso 1: Cuerpo de Cartón', time: 20 },
        { label: 'Paso 2: Cinta Conductora', time: 80 },
        { label: 'Paso 3: Código Musical', time: 150 }
      ]
    },
    {
      id: 'vid-intro-robotica',
      title: '¿Qué es un Robot y cómo piensa?',
      subtitle: 'Sensores, procesadores y motores en el Taller de Robótica',
      project: 'Introducción a la Robótica',
      grades: ['todos'],
      url: 'https://www.youtube.com/watch?v=wA9tO7m3v6U',
      type: 'youtube',
      youtubeId: 'wA9tO7m3v6U',
      duration: 240,
      markers: [
        { label: '1. ¿Qué es un Robot?', time: 10 },
        { label: '2. Sensores y Cerebro', time: 75 }
      ]
    }
  ];

  var PRESET_QUIZZES = {
    'fantasma-flota': {
      question: '¿Por qué flota nuestro Fantasma Levitante sin caerse?',
      options: [
        'Por la atracción entre los dos imanes y el hilo tenso',
        'Porque está inflado con gas helio por dentro',
        'Porque tiene una hélice oculta en la base'
      ],
      correctIndex: 0
    },
    'polos-imanes': {
      question: '¿Qué ocurre cuando acercamos dos polos iguales de un imán (Norte con Norte)?',
      options: [
        'Se pegan con mucha más fuerza',
        'Se repelen (se empujan sin tocarse)',
        'Pierden su energía magnética'
      ],
      correctIndex: 1
    },
    'hilo-tensegridad': {
      question: '¿Qué pasaría si cortamos o soltamos el hilo que sostiene al fantasma desde la base?',
      options: [
        'El fantasma quedaría flotando igual en el medio',
        'El imán del fantasma saltaría a pegarse al imán de arriba',
        'Los imanes dejarían de funcionar'
      ],
      correctIndex: 1
    },
    'sensor-robot': {
      question: '¿Para qué sirven los sensores en un robot del taller?',
      options: [
        'Solo para decorar el chasis con luces',
        'Para detectar lo que pasa alrededor (luz, distancia, sonido)',
        'Para cargar la batería más rápido'
      ],
      correctIndex: 1
    }
  };

  var DEFAULT_STATE = {
    videoUrl: 'https://www.youtube.com/watch?v=7afwV_aJcjk',
    videoType: 'youtube',
    youtubeId: '7afwV_aJcjk',
    title: 'El Magnetismo y los Imanes — El Fantasma Levitante',
    subtitle: '¿Por qué flota nuestro fantasma sin tocar el palito superior?',
    project: 'El Fantasma Levitante',
    grades: ['sala5', 'grado1'],
    isPlaying: false,
    baseTime: 0,
    duration: 240,
    playbackRate: 1,
    lockedByTeacher: true,
    muteStudents: false,
    attentionMode: false,
    livePromptText: '',
    referenceSchema: null,
    activeQuiz: null,
    markers: DEFAULT_LIBRARY[0].markers,
    autoPauseAtMarkers: false,
    sessionActive: false,
    callStudentsSeq: 0,
    syncSeq: 1,
    updatedAtMs: Date.now(),
    playlist: DEFAULT_LIBRARY
  };

  // Estado local del mando
  var remoteState = null;
  var quickGradeFilter = 'todos';
  var filterGrade = 'todos';
  var filterProject = 'todos';
  var filterSearch = '';
  var monitorVisible = false;
  var isApplyingRemote = false;
  var suppressLocalEventsUntil = 0;
  var isDraggingScrubber = false;

  // Reloj virtual + control de auto-pausa en marcadores
  var virtualBaseSec = 0;
  var virtualLastTickMs = Date.now();
  var virtualIsPlaying = false;
  var lastTriggeredMarkerSec = -1;

  // Presencia de máquinas
  var presenceDocs = [];

  // Reproductor monitor opcional
  var currentMediaType = null;
  var currentMediaIdOrUrl = '';
  var ytPlayer = null;
  var ytApiReady = false;
  var ytPlayerReady = false;
  var html5Video = null;
  var uiTimer = null;
  var heartbeatTimer = null;

  function vibrateTap(ms) {
    try {
      if (navigator.vibrate) navigator.vibrate(ms || 30);
    } catch (e) {}
  }

  function requestWakeLock() {
    try {
      if ('wakeLock' in navigator && navigator.wakeLock.request) {
        navigator.wakeLock.request('screen').catch(function () {});
      }
    } catch (e) {}
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

  function showToast(msg) {
    var t = document.getElementById('pv-toast');
    if (!t) return;
    t.textContent = msg;
    t.style.display = 'block';
    clearTimeout(t._timer);
    t._timer = setTimeout(function () {
      t.style.display = 'none';
    }, 2600);
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

  function init() {
    html5Video = document.getElementById('pv-html5-video');

    if (window.innerWidth >= 960) {
      toggleMonitor(true);
    }

    setupLogin();
    setupMobileTabs();
    bindControlEvents();
    bindClassroomExtrasEvents();
    bindLibraryEvents();
    setupHtml5MonitorEvents();
    loadYouTubeApi();
    connectFirestore();
    connectPresenceListener();
    startTimers();
  }

  function setupMobileTabs() {
    document.querySelectorAll('.pv-bnav-btn[data-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        vibrateTap(20);
        switchMobileTab(btn.getAttribute('data-tab'));
      });
    });
  }

  function switchMobileTab(tabId) {
    document.querySelectorAll('.pv-bnav-btn[data-tab]').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });

    var pRemote = document.getElementById('pv-panel-remote');
    var pLib = document.getElementById('pv-panel-library');
    var pUp = document.getElementById('pv-panel-upload');

    if (pRemote) pRemote.classList.toggle('active', tabId === 'remote');
    if (pLib) pLib.classList.toggle('active', tabId === 'library');
    if (pUp) pUp.classList.toggle('active', tabId === 'upload');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function toggleMonitor(forceState) {
    monitorVisible = typeof forceState === 'boolean' ? forceState : !monitorVisible;
    var wrap = document.getElementById('pv-monitor-wrap');
    var txt = document.getElementById('pv-monitor-btn-txt');
    if (wrap) wrap.classList.toggle('open', monitorVisible);
    if (txt) txt.textContent = monitorVisible ? 'Ocultar Video' : 'Ver Video';

    if (monitorVisible && remoteState) {
      loadMediaSource(remoteState.videoType, remoteState.videoUrl, remoteState.youtubeId, getEffectiveCurrentTime(), false);
    } else if (!monitorVisible) {
      pauseMedia();
    }
  }

  function setupLogin() {
    var overlay = document.getElementById('pv-login-overlay');
    var form = document.getElementById('pv-login-form');
    var passInput = document.getElementById('pv-login-pass');
    var rememberCheck = document.getElementById('pv-login-remember');
    var errEl = document.getElementById('pv-login-error');
    var logoutBtn = document.getElementById('pv-btn-logout');

    try {
      if (localStorage.getItem(SESSION_KEY) === 'true' || sessionStorage.getItem(SESSION_KEY) === 'true') {
        if (overlay) overlay.style.display = 'none';
        requestWakeLock();
      }
    } catch (e) {}

    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var val = passInput ? passInput.value.trim().toLowerCase() : '';
        if (VALID_PASSWORDS.indexOf(val) !== -1) {
          vibrateTap(40);
          try {
            sessionStorage.setItem(SESSION_KEY, 'true');
            if (rememberCheck && rememberCheck.checked) {
              localStorage.setItem(SESSION_KEY, 'true');
            }
          } catch (ex) {}
          if (overlay) overlay.style.display = 'none';
          if (errEl) errEl.textContent = '';
          requestWakeLock();
          showToast('📱 Control Remoto Activado');
        } else {
          vibrateTap([60, 40, 60]);
          if (errEl) errEl.textContent = 'PIN incorrecto. Probá con 2026.';
        }
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        try {
          sessionStorage.removeItem(SESSION_KEY);
          localStorage.removeItem(SESSION_KEY);
        } catch (ex) {}
        if (overlay) overlay.style.display = 'flex';
        if (passInput) {
          passInput.value = '';
          passInput.focus();
        }
      });
    }
  }

  /**
   * ─────────────────────────────────────────────────────────────
   * EVENTOS DEL CONTROL REMOTO EN VIVO
   * ─────────────────────────────────────────────────────────────
   */
  function bindControlEvents() {
    var monBtn = document.getElementById('pv-btn-toggle-monitor');
    if (monBtn) {
      monBtn.addEventListener('click', function () {
        vibrateTap(20);
        toggleMonitor();
      });
    }

    // Play / Pausa en todas las máquinas
    var playPauseBtn = document.getElementById('pv-btn-playpause');
    if (playPauseBtn) {
      playPauseBtn.addEventListener('click', function () {
        vibrateTap(45);
        var curPlaying = remoteState ? !!remoteState.isPlaying : virtualIsPlaying;
        var nextPlaying = !curPlaying;
        var curSec = getEffectiveCurrentTime();

        virtualBaseSec = curSec;
        virtualLastTickMs = Date.now();
        virtualIsPlaying = nextPlaying;

        suppressLocalEventsUntil = Date.now() + 1200;
        if (monitorVisible) {
          if (nextPlaying) playMedia();
          else pauseMedia();
        }

        // Si le damos Play, desactivamos automáticamente el modo pantalla oscurecida, láminas o preguntas
        var patch = {
          isPlaying: nextPlaying,
          baseTime: curSec,
          sessionActive: true
        };
        if (nextPlaying) {
          patch.attentionMode = false;
          patch.referenceSchema = null;
          patch.activeQuiz = null;
        }

        pushState(patch, true);
        showToast(nextPlaying ? '▶️ PLAY en todas las máquinas' : '⏸️ PAUSA en todas las máquinas');
      });
    }

    var restartBtn = document.getElementById('pv-btn-restart');
    if (restartBtn) {
      restartBtn.addEventListener('click', function () {
        vibrateTap(30);
        virtualBaseSec = 0;
        virtualLastTickMs = Date.now();
        lastTriggeredMarkerSec = -1;
        suppressLocalEventsUntil = Date.now() + 1200;
        if (monitorVisible) seekMediaTo(0);
        pushState({ baseTime: 0, sessionActive: true }, true);
        showToast('⏮️ Reiniciado a 00:00');
      });
    }

    var rew10Btn = document.getElementById('pv-btn-rew10');
    if (rew10Btn) {
      rew10Btn.addEventListener('click', function () {
        vibrateTap(25);
        var nextSec = Math.max(0, getEffectiveCurrentTime() - 10);
        virtualBaseSec = nextSec;
        virtualLastTickMs = Date.now();
        lastTriggeredMarkerSec = -1;
        suppressLocalEventsUntil = Date.now() + 1200;
        if (monitorVisible) seekMediaTo(nextSec);
        pushState({ baseTime: nextSec, sessionActive: true }, true);
        showToast('⏪ -10s (' + formatTime(nextSec) + ')');
      });
    }

    var fwd10Btn = document.getElementById('pv-btn-fwd10');
    if (fwd10Btn) {
      fwd10Btn.addEventListener('click', function () {
        vibrateTap(25);
        var dur = getEffectiveDuration();
        var nextSec = Math.min(dur, getEffectiveCurrentTime() + 10);
        virtualBaseSec = nextSec;
        virtualLastTickMs = Date.now();
        lastTriggeredMarkerSec = -1;
        suppressLocalEventsUntil = Date.now() + 1200;
        if (monitorVisible) seekMediaTo(nextSec);
        pushState({ baseTime: nextSec, sessionActive: true }, true);
        showToast('⏩ +10s (' + formatTime(nextSec) + ')');
      });
    }

    var forceSyncBtn = document.getElementById('pv-btn-forcesync');
    if (forceSyncBtn) {
      forceSyncBtn.addEventListener('click', function () {
        vibrateTap(35);
        var curSec = getEffectiveCurrentTime();
        pushState({
          isPlaying: virtualIsPlaying,
          baseTime: curSec,
          sessionActive: true
        }, true);
        showToast('⚡ Máquinas igualadas a ' + formatTime(curSec));
      });
    }

    var scrubber = document.getElementById('pv-scrubber');
    if (scrubber) {
      scrubber.addEventListener('mousedown', function () { isDraggingScrubber = true; });
      scrubber.addEventListener('touchstart', function () { isDraggingScrubber = true; }, { passive: true });
      scrubber.addEventListener('input', function () {
        var curEl = document.getElementById('pv-cur-time');
        if (curEl) curEl.textContent = formatTime(scrubber.value);
      });
      scrubber.addEventListener('change', function () {
        isDraggingScrubber = false;
        vibrateTap(25);
        var sec = Number(scrubber.value) || 0;
        virtualBaseSec = sec;
        virtualLastTickMs = Date.now();
        lastTriggeredMarkerSec = -1;
        suppressLocalEventsUntil = Date.now() + 1200;
        if (monitorVisible) seekMediaTo(sec);
        pushState({ baseTime: sec, sessionActive: true }, true);
        showToast('⏱️ Salto a ' + formatTime(sec));
      });
    }

    var speedSel = document.getElementById('pv-speed-select');
    if (speedSel) {
      speedSel.addEventListener('change', function () {
        var rate = Number(speedSel.value) || 1;
        if (monitorVisible) setMediaPlaybackRate(rate);
        pushState({ playbackRate: rate, baseTime: getEffectiveCurrentTime() }, true);
        showToast('⚡ Velocidad ' + rate + 'x');
      });
    }

    var lockBtn = document.getElementById('pv-btn-toggle-lock');
    if (lockBtn) {
      lockBtn.addEventListener('click', function () {
        vibrateTap(40);
        var curLocked = remoteState ? remoteState.lockedByTeacher !== false : true;
        var nextLocked = !curLocked;
        pushState({
          lockedByTeacher: nextLocked,
          baseTime: getEffectiveCurrentTime(),
          isPlaying: virtualIsPlaying,
          sessionActive: true
        }, true);
        showToast(nextLocked
          ? '🔒 Máquinas Bloqueadas (Solo Profesor)'
          : '🔓 Control Libre en Máquinas');
      });
    }

    var audioBtn = document.getElementById('pv-btn-toggle-audio');
    if (audioBtn) {
      audioBtn.addEventListener('click', function () {
        vibrateTap(35);
        var curMuted = remoteState ? !!remoteState.muteStudents : false;
        var nextMuted = !curMuted;
        pushState({ muteStudents: nextMuted }, true);
        showToast(nextMuted
          ? '🔇 PCs de Alumnos Silenciadas'
          : '🔊 Sonido en Todas las PCs');
      });
    }

    var callBtn = document.getElementById('pv-btn-call-students');
    if (callBtn) {
      callBtn.addEventListener('click', function () {
        vibrateTap(45);
        var nextCall = ((remoteState && remoteState.callStudentsSeq) || 0) + 1;
        pushState({
          sessionActive: true,
          callStudentsSeq: nextCall,
          baseTime: getEffectiveCurrentTime()
        }, true);
        showToast('📢 Abriendo Sala de Video en las PCs');
      });
    }

    var qTabs = document.getElementById('pv-quick-grade-tabs');
    if (qTabs) {
      qTabs.querySelectorAll('[data-qgrade]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          vibrateTap(15);
          quickGradeFilter = btn.getAttribute('data-qgrade') || 'todos';
          qTabs.querySelectorAll('[data-qgrade]').forEach(function (b) {
            b.classList.toggle('active', b === btn);
          });
          renderQuickDeck();
        });
      });
    }
  }

  /**
   * ─────────────────────────────────────────────────────────────
   * EVENTOS DE LAS 4 FUNCIONES EXTRA DE AULA
   * (Atención al Profe, Cartel de Consigna, Marcadores, Presencia)
   * ─────────────────────────────────────────────────────────────
   */
  function bindClassroomExtrasEvents() {
    // 1. Botón "¡Atención al Profesor!" (Oscurecer Pantallas)
    var attBtn = document.getElementById('pv-btn-attention');
    if (attBtn) {
      attBtn.addEventListener('click', function () {
        vibrateTap(45);
        var curAtt = remoteState ? !!remoteState.attentionMode : false;
        var nextAtt = !curAtt;

        if (nextAtt) {
          // Pausar el video automáticamente cuando oscurecemos las pantallas
          virtualBaseSec = getEffectiveCurrentTime();
          virtualLastTickMs = Date.now();
          virtualIsPlaying = false;
          if (monitorVisible) pauseMedia();
        }

        pushState({
          attentionMode: nextAtt,
          isPlaying: nextAtt ? false : virtualIsPlaying,
          baseTime: virtualBaseSec
        }, true);

        showToast(nextAtt
          ? '👀 Pantallas oscurecidas: ¡Atención al Profesor!'
          : '🎬 Pantallas restauradas al video');
      });
    }

    // 2. Cartel de Consigna / Pregunta en Pantalla
    var sendPromptBtn = document.getElementById('pv-btn-send-prompt');
    var promptInput = document.getElementById('pv-prompt-input');
    var clearPromptBtn = document.getElementById('pv-btn-clear-prompt');

    if (sendPromptBtn && promptInput) {
      sendPromptBtn.addEventListener('click', function () {
        var txt = promptInput.value.trim();
        if (!txt) return;
        vibrateTap(35);
        pushState({ livePromptText: txt }, false);
        promptInput.value = '';
        showToast('💬 Cartel mostrado en todas las pantallas');
      });
      promptInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          sendPromptBtn.click();
        }
      });
    }

    if (clearPromptBtn) {
      clearPromptBtn.addEventListener('click', function () {
        vibrateTap(25);
        pushState({ livePromptText: '' }, false);
        showToast('❌ Cartel quitado de las pantallas');
      });
    }

    document.querySelectorAll('[data-qprompt]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        vibrateTap(30);
        var txt = btn.getAttribute('data-qprompt') || '';
        // Pausar y mostrar cartel rápido
        virtualBaseSec = getEffectiveCurrentTime();
        virtualLastTickMs = Date.now();
        virtualIsPlaying = false;
        if (monitorVisible) pauseMedia();

        pushState({
          isPlaying: false,
          baseTime: virtualBaseSec,
          livePromptText: txt
        }, true);

        showToast('⏸️ Pausa + Cartel enviado a las PCs');
      });
    });

    // 3. Marcadores de Pasos + Auto-pausa
    var addMarkerBtn = document.getElementById('pv-btn-add-marker');
    var markerLabelInput = document.getElementById('pv-marker-label-input');
    var autoPauseCheck = document.getElementById('pv-autopause-check');

    if (addMarkerBtn) {
      addMarkerBtn.addEventListener('click', function () {
        vibrateTap(35);
        var curSec = Math.floor(getEffectiveCurrentTime());
        var curMarkers = (remoteState && Array.isArray(remoteState.markers)) ? remoteState.markers.slice() : [];
        var lbl = (markerLabelInput && markerLabelInput.value.trim()) || ('Paso ' + (curMarkers.length + 1));

        curMarkers.push({ label: lbl, time: curSec });
        curMarkers.sort(function (a, b) { return (a.time || 0) - (b.time || 0); });

        // También actualizar los marcadores en el video correspondiente de la biblioteca
        var list = (remoteState && Array.isArray(remoteState.playlist)) ? remoteState.playlist.slice() : DEFAULT_LIBRARY.slice();
        var activeUrl = remoteState ? remoteState.videoUrl : '';
        list.forEach(function (v) {
          if (v.url === activeUrl) {
            v.markers = curMarkers;
          }
        });

        if (markerLabelInput) markerLabelInput.value = '';
        pushState({ markers: curMarkers, playlist: list }, false);
        showToast('📍 Marcado «' + lbl + '» en ' + formatTime(curSec));
      });
    }

    if (autoPauseCheck) {
      autoPauseCheck.addEventListener('change', function () {
        vibrateTap(25);
        pushState({ autoPauseAtMarkers: !!autoPauseCheck.checked }, false);
        showToast(autoPauseCheck.checked
          ? '⏸️ Auto-pausa en cada Paso ACTIVADA'
          : '▶️ Auto-pausa en pasos desactivada');
      });
    }

    // 4. Toque en el contador de máquinas conectadas
    var presPill = document.getElementById('pv-presence-pill');
    if (presPill) {
      presPill.addEventListener('click', function () {
        vibrateTap(20);
        var stats = getPresenceStats();
        showToast('💻 ' + stats.inRoom + ' PCs en Sala de Video (' + stats.withAudio + ' con 🔊 sonido listo)');
      });
    }

    // 5. Proyectar Lámina / Esquema del Proyecto sobre el video en Pausa
    document.querySelectorAll('[data-schema-url]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        vibrateTap(35);
        var url = btn.getAttribute('data-schema-url') || '';
        var title = btn.getAttribute('data-schema-title') || 'Esquema del Proyecto';
        if (!url) return;

        virtualBaseSec = getEffectiveCurrentTime();
        virtualLastTickMs = Date.now();
        virtualIsPlaying = false;
        if (monitorVisible) pauseMedia();

        pushState({
          isPlaying: false,
          baseTime: virtualBaseSec,
          attentionMode: false,
          activeQuiz: null,
          referenceSchema: { url: url, title: title }
        }, true);

        showToast('🖼️ Lámina proyectada en todas las PCs');
      });
    });

    var sendSchemaBtn = document.getElementById('pv-btn-send-schema');
    var schemaUrlInput = document.getElementById('pv-schema-url-input');
    var clearSchemaBtn = document.getElementById('pv-btn-clear-schema');

    if (sendSchemaBtn && schemaUrlInput) {
      sendSchemaBtn.addEventListener('click', function () {
        var url = schemaUrlInput.value.trim();
        if (!url) return;
        vibrateTap(35);

        virtualBaseSec = getEffectiveCurrentTime();
        virtualLastTickMs = Date.now();
        virtualIsPlaying = false;
        if (monitorVisible) pauseMedia();

        pushState({
          isPlaying: false,
          baseTime: virtualBaseSec,
          attentionMode: false,
          activeQuiz: null,
          referenceSchema: {
            url: url,
            title: (remoteState && remoteState.project) ? ('Esquema: ' + remoteState.project) : 'Lámina del Proyecto'
          }
        }, true);

        schemaUrlInput.value = '';
        showToast('🖼️ Lámina proyectada en las PCs');
      });
    }

    if (clearSchemaBtn) {
      clearSchemaBtn.addEventListener('click', function () {
        vibrateTap(25);
        pushState({ referenceSchema: null }, false);
        showToast('🎬 Lámina cerrada en las PCs');
      });
    }

    // 6. Mini-Pregunta Interactiva (Votación Rápida A / B / C)
    document.querySelectorAll('[data-preset-quiz]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-preset-quiz');
        var qPreset = PRESET_QUIZZES[key];
        if (!qPreset) return;
        vibrateTap(40);
        launchQuizToClassroom(qPreset.question, qPreset.options, qPreset.correctIndex);
      });
    });

    var launchCustomQuizBtn = document.getElementById('pv-btn-launch-custom-quiz');
    if (launchCustomQuizBtn) {
      launchCustomQuizBtn.addEventListener('click', function () {
        var qTextEl = document.getElementById('pv-custom-q-text');
        var opt0El = document.getElementById('pv-custom-q-opt0');
        var opt1El = document.getElementById('pv-custom-q-opt1');
        var opt2El = document.getElementById('pv-custom-q-opt2');
        var corrEl = document.getElementById('pv-custom-q-correct');

        var qText = qTextEl ? qTextEl.value.trim() : '';
        var opt0 = opt0El ? opt0El.value.trim() : '';
        var opt1 = opt1El ? opt1El.value.trim() : '';
        var opt2 = opt2El ? opt2El.value.trim() : '';
        var corrIdx = corrEl ? Number(corrEl.value) || 0 : 0;

        if (!qText || !opt0 || !opt1) {
          alert('Escribí la pregunta y al menos las opciones A y B.');
          return;
        }
        var opts = [opt0, opt1];
        if (opt2) opts.push(opt2);
        if (corrIdx >= opts.length) corrIdx = 0;

        vibrateTap(40);
        launchQuizToClassroom(qText, opts, corrIdx);
      });
    }

    var revealQuizBtn = document.getElementById('pv-btn-reveal-quiz');
    if (revealQuizBtn) {
      revealQuizBtn.addEventListener('click', function () {
        if (!remoteState || !remoteState.activeQuiz) return;
        vibrateTap([40, 30, 50]);
        var updatedQuiz = Object.assign({}, remoteState.activeQuiz, {
          revealed: !remoteState.activeQuiz.revealed
        });
        pushState({ activeQuiz: updatedQuiz }, false);
        showToast(updatedQuiz.revealed
          ? '🏆 ¡Respuesta correcta revelada en todas las PCs!'
          : '🔄 Respuesta ocultada nuevamente');
      });
    }

    var clearQuizBtn = document.getElementById('pv-btn-clear-quiz');
    if (clearQuizBtn) {
      clearQuizBtn.addEventListener('click', function () {
        vibrateTap(25);
        pushState({ activeQuiz: null }, false);
        showToast('❌ Pregunta cerrada en las PCs');
      });
    }
  }

  function launchQuizToClassroom(question, options, correctIndex) {
    virtualBaseSec = getEffectiveCurrentTime();
    virtualLastTickMs = Date.now();
    virtualIsPlaying = false;
    if (monitorVisible) pauseMedia();

    var quizObj = {
      id: 'quiz-' + Date.now(),
      question: question,
      options: options,
      correctIndex: Number(correctIndex) || 0,
      revealed: false
    };

    pushState({
      isPlaying: false,
      baseTime: virtualBaseSec,
      attentionMode: false,
      referenceSchema: null,
      activeQuiz: quizObj
    }, true);

    showToast('🎯 Pregunta lanzada a todas las PCs');
  }

  function renderMarkersControls(markers) {
    var wrap = document.getElementById('pv-markers-chips');
    if (!wrap) return;

    if (!Array.isArray(markers) || !markers.length) {
      wrap.innerHTML = '<div style="font-size:0.78rem;color:#94A3B8;">Aún no marcaste pasos en este video. Podés agregarlos abajo mientras corre el video.</div>';
      return;
    }

    wrap.innerHTML = markers.map(function (m, idx) {
      return '<div class="pv-marker-pill" data-jump-marker="' + idx + '">' +
        '<time>' + formatTime(m.time || 0) + '</time>' +
        '<span>' + esc(m.label || ('Paso ' + (idx + 1))) + '</span>' +
        '<button type="button" class="pv-marker-del" data-del-marker="' + idx + '" title="Borrar paso">&times;</button>' +
      '</div>';
    }).join('');

    wrap.querySelectorAll('[data-jump-marker]').forEach(function (pill) {
      pill.addEventListener('click', function (e) {
        if (e.target && e.target.hasAttribute('data-del-marker')) return;
        vibrateTap(30);
        var idx = Number(pill.getAttribute('data-jump-marker'));
        var m = markers[idx];
        if (!m) return;
        var targetSec = Number(m.time) || 0;
        virtualBaseSec = targetSec;
        virtualLastTickMs = Date.now();
        lastTriggeredMarkerSec = targetSec;
        suppressLocalEventsUntil = Date.now() + 1200;
        if (monitorVisible) seekMediaTo(targetSec);

        pushState({
          baseTime: targetSec,
          sessionActive: true
        }, true);
        showToast('📍 Saltando a «' + m.label + '» (' + formatTime(targetSec) + ')');
      });
    });

    wrap.querySelectorAll('[data-del-marker]').forEach(function (delBtn) {
      delBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        vibrateTap(25);
        var idx = Number(delBtn.getAttribute('data-del-marker'));
        var nextMarkers = markers.filter(function (_, i) { return i !== idx; });
        var list = (remoteState && Array.isArray(remoteState.playlist)) ? remoteState.playlist.slice() : DEFAULT_LIBRARY.slice();
        var activeUrl = remoteState ? remoteState.videoUrl : '';
        list.forEach(function (v) {
          if (v.url === activeUrl) v.markers = nextMarkers;
        });
        pushState({ markers: nextMarkers, playlist: list }, false);
      });
    });
  }

  /**
   * ─────────────────────────────────────────────────────────────
   * PRESENCIA EN TIEMPO REAL DE LAS MÁQUINAS DEL SALÓN
   * ─────────────────────────────────────────────────────────────
   */
  function connectPresenceListener() {
    if (!window.db || typeof window.db.collection !== 'function') {
      setTimeout(connectPresenceListener, 700);
      return;
    }

    window.db.collection(PRESENCE_COLLECTION).onSnapshot(function (snapshot) {
      if (!snapshot) return;
      var docs = [];
      snapshot.forEach(function (doc) {
        docs.push(doc.data() || {});
      });
      presenceDocs = docs;
      updatePresenceBadgeUi();
      if (remoteState) {
        renderQuizLiveDashboard(remoteState);
      }
    }, function () {});
  }

  function getPresenceStats() {
    var cutoff = Date.now() - 45000; // Activas en los últimos 45s
    var active = presenceDocs.filter(function (d) {
      return d.lastSeenMs && d.lastSeenMs > cutoff;
    });
    var inRoom = active.filter(function (d) { return d.inVideoRoom || d.inClase; }).length || active.length;
    var withAudio = active.filter(function (d) { return !!d.audioJoined; }).length;
    return {
      total: active.length,
      inRoom: inRoom,
      withAudio: withAudio
    };
  }

  function updatePresenceBadgeUi() {
    var txtEl = document.getElementById('pv-presence-txt');
    if (!txtEl) return;
    var stats = getPresenceStats();
    if (stats.inRoom === 0) {
      txtEl.textContent = '0 PCs';
    } else {
      txtEl.textContent = stats.inRoom + (stats.inRoom === 1 ? ' PC' : ' PCs') + ' (' + stats.withAudio + ' 🔊)';
    }
  }

  /**
   * ─────────────────────────────────────────────────────────────
   * EVENTOS DE LA BIBLIOTECA Y ALTA DE VIDEOS
   * ─────────────────────────────────────────────────────────────
   */
  function bindLibraryEvents() {
    var projSel = document.getElementById('pv-select-project');
    var customProjInput = document.getElementById('pv-input-custom-project');
    if (projSel && customProjInput) {
      projSel.addEventListener('change', function () {
        var isCustom = projSel.value === '__custom__';
        customProjInput.style.display = isCustom ? 'block' : 'none';
        if (isCustom) customProjInput.focus();
      });
    }

    var gradePillsWrap = document.getElementById('pv-form-grade-pills');
    if (gradePillsWrap) {
      gradePillsWrap.querySelectorAll('.pv-grade-check').forEach(function (pill) {
        pill.addEventListener('click', function () {
          vibrateTap(15);
          var g = pill.getAttribute('data-grade');
          if (g === 'todos') {
            gradePillsWrap.querySelectorAll('.pv-grade-check').forEach(function (p) {
              p.classList.toggle('selected', p.getAttribute('data-grade') === 'todos');
            });
          } else {
            var todosPill = gradePillsWrap.querySelector('[data-grade="todos"]');
            if (todosPill) todosPill.classList.remove('selected');
            pill.classList.toggle('selected');
            if (!gradePillsWrap.querySelectorAll('.pv-grade-check.selected').length && todosPill) {
              todosPill.classList.add('selected');
            }
          }
        });
      });
    }

    var form = document.getElementById('pv-video-form');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        saveVideoFromForm(false);
      });
    }

    var saveAndProjectBtn = document.getElementById('pv-btn-save-and-project');
    if (saveAndProjectBtn) {
      saveAndProjectBtn.addEventListener('click', function () {
        saveVideoFromForm(true);
      });
    }

    var cancelEditBtn = document.getElementById('pv-btn-cancel-edit');
    if (cancelEditBtn) {
      cancelEditBtn.addEventListener('click', function () {
        resetVideoForm();
        switchMobileTab('library');
      });
    }

    var filterGradesWrap = document.getElementById('pv-filter-grades');
    if (filterGradesWrap) {
      filterGradesWrap.querySelectorAll('[data-filter-grade]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          vibrateTap(15);
          filterGrade = btn.getAttribute('data-filter-grade') || 'todos';
          filterGradesWrap.querySelectorAll('[data-filter-grade]').forEach(function (b) {
            b.classList.toggle('active', b === btn);
          });
          renderLibraryGrid();
        });
      });
    }

    var filterProjSel = document.getElementById('pv-filter-project');
    if (filterProjSel) {
      filterProjSel.addEventListener('change', function () {
        filterProject = filterProjSel.value || 'todos';
        renderLibraryGrid();
      });
    }

    var searchInput = document.getElementById('pv-filter-search');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        filterSearch = (searchInput.value || '').trim().toLowerCase();
        renderLibraryGrid();
      });
    }
  }

  function getSelectedFormGrades() {
    var wrap = document.getElementById('pv-form-grade-pills');
    if (!wrap) return ['todos'];
    var selected = [];
    wrap.querySelectorAll('.pv-grade-check.selected').forEach(function (el) {
      selected.push(el.getAttribute('data-grade'));
    });
    return selected.length ? selected : ['todos'];
  }

  function setSelectedFormGrades(grades) {
    var wrap = document.getElementById('pv-form-grade-pills');
    if (!wrap) return;
    var list = (Array.isArray(grades) && grades.length) ? grades : ['todos'];
    wrap.querySelectorAll('.pv-grade-check').forEach(function (el) {
      el.classList.toggle('selected', list.indexOf(el.getAttribute('data-grade')) !== -1);
    });
  }

  function projectVideoItem(item) {
    if (!item) return;
    var parsed = parseVideoUrl(item.url);
    if (!parsed) return;

    vibrateTap(45);
    virtualBaseSec = 0;
    virtualLastTickMs = Date.now();
    virtualIsPlaying = true;
    lastTriggeredMarkerSec = -1;
    suppressLocalEventsUntil = Date.now() + 1400;

    if (monitorVisible) {
      loadMediaSource(parsed.type, parsed.url, parsed.youtubeId, 0, true);
    }

    pushState({
      videoUrl: parsed.url,
      videoType: parsed.type,
      youtubeId: parsed.youtubeId || '',
      title: item.title,
      subtitle: item.subtitle || ('Proyecto: ' + (item.project || 'Clase')),
      project: item.project || '',
      grades: item.grades || ['todos'],
      markers: Array.isArray(item.markers) ? item.markers : [],
      attentionMode: false,
      livePromptText: '',
      baseTime: 0,
      isPlaying: true,
      sessionActive: true
    }, true);

    switchMobileTab('remote');
    showToast('📡 En Pantalla: ' + item.title);
  }

  function saveVideoFromForm(projectImmediately) {
    var titleInput = document.getElementById('pv-input-title');
    var urlInput = document.getElementById('pv-input-url');
    var subInput = document.getElementById('pv-input-subtitle');
    var projSel = document.getElementById('pv-select-project');
    var customProjInput = document.getElementById('pv-input-custom-project');
    var editIdInput = document.getElementById('pv-edit-id');

    var title = titleInput ? titleInput.value.trim() : '';
    var rawUrl = urlInput ? urlInput.value.trim() : '';
    if (!title || !rawUrl) {
      alert('Completá el título y el link del video.');
      return;
    }

    var parsed = parseVideoUrl(rawUrl);
    if (!parsed) {
      alert('El enlace del video no es válido.');
      return;
    }

    var project = projSel ? projSel.value : 'Proyecto General';
    if (project === '__custom__') {
      project = (customProjInput && customProjInput.value.trim()) || 'Proyecto de Clase';
    }

    var subtitle = (subInput && subInput.value.trim()) || ('Proyecto: ' + project);
    var grades = getSelectedFormGrades();
    var editId = editIdInput ? editIdInput.value.trim() : '';

    var list = (remoteState && Array.isArray(remoteState.playlist))
      ? remoteState.playlist.slice()
      : DEFAULT_LIBRARY.slice();

    var existingItem = editId ? list.find(function (x) { return x.id === editId; }) : null;

    var videoItem = {
      id: editId || ('vid-' + Date.now()),
      title: title,
      subtitle: subtitle,
      project: project,
      grades: grades,
      url: parsed.url,
      type: parsed.type,
      youtubeId: parsed.youtubeId || '',
      markers: (existingItem && Array.isArray(existingItem.markers)) ? existingItem.markers : [],
      updatedAt: Date.now()
    };

    if (editId) {
      var idx = list.findIndex(function (x) { return x.id === editId; });
      if (idx !== -1) list[idx] = videoItem;
      else list.unshift(videoItem);
    } else {
      list.unshift(videoItem);
    }

    var statePatch = {
      playlist: list
    };

    if (projectImmediately) {
      virtualBaseSec = 0;
      virtualLastTickMs = Date.now();
      virtualIsPlaying = true;
      lastTriggeredMarkerSec = -1;
      suppressLocalEventsUntil = Date.now() + 1400;
      statePatch.videoUrl = videoItem.url;
      statePatch.videoType = videoItem.type;
      statePatch.youtubeId = videoItem.youtubeId;
      statePatch.title = videoItem.title;
      statePatch.subtitle = videoItem.subtitle;
      statePatch.project = videoItem.project;
      statePatch.grades = videoItem.grades;
      statePatch.markers = videoItem.markers;
      statePatch.attentionMode = false;
      statePatch.livePromptText = '';
      statePatch.baseTime = 0;
      statePatch.isPlaying = true;
      statePatch.sessionActive = true;
      if (monitorVisible) {
        loadMediaSource(videoItem.type, videoItem.url, videoItem.youtubeId, 0, true);
      }
    }

    vibrateTap(40);
    pushState(statePatch, projectImmediately);
    resetVideoForm();
    switchMobileTab(projectImmediately ? 'remote' : 'library');
    showToast(projectImmediately
      ? '📡 Guardado y Proyectando en Clase'
      : '💾 Video Guardado en Biblioteca');
  }

  function resetVideoForm() {
    var titleInput = document.getElementById('pv-input-title');
    var urlInput = document.getElementById('pv-input-url');
    var subInput = document.getElementById('pv-input-subtitle');
    var editIdInput = document.getElementById('pv-edit-id');
    var heading = document.getElementById('pv-form-heading');
    var cancelBtn = document.getElementById('pv-btn-cancel-edit');
    var saveBtn = document.getElementById('pv-btn-save-only');

    if (titleInput) titleInput.value = '';
    if (urlInput) urlInput.value = '';
    if (subInput) subInput.value = '';
    if (editIdInput) editIdInput.value = '';
    if (heading) heading.innerHTML = '<i class="fas fa-plus-circle" style="color:#4ADE80;"></i> Dar de Alta Nuevo Video';
    if (cancelBtn) cancelBtn.style.display = 'none';
    if (saveBtn) saveBtn.innerHTML = '<i class="fas fa-save"></i> Solo Guardar en mi Biblioteca';
  }

  function loadVideoIntoFormForEdit(item) {
    if (!item) return;
    var titleInput = document.getElementById('pv-input-title');
    var urlInput = document.getElementById('pv-input-url');
    var subInput = document.getElementById('pv-input-subtitle');
    var projSel = document.getElementById('pv-select-project');
    var customProjInput = document.getElementById('pv-input-custom-project');
    var editIdInput = document.getElementById('pv-edit-id');
    var heading = document.getElementById('pv-form-heading');
    var cancelBtn = document.getElementById('pv-btn-cancel-edit');
    var saveBtn = document.getElementById('pv-btn-save-only');

    if (editIdInput) editIdInput.value = item.id || '';
    if (titleInput) titleInput.value = item.title || '';
    if (urlInput) urlInput.value = item.url || '';
    if (subInput) subInput.value = item.subtitle || '';

    if (projSel && customProjInput) {
      var existsInSelect = Array.from(projSel.options).some(function (opt) {
        return opt.value === item.project;
      });
      if (existsInSelect) {
        projSel.value = item.project;
        customProjInput.style.display = 'none';
      } else {
        projSel.value = '__custom__';
        customProjInput.style.display = 'block';
        customProjInput.value = item.project || '';
      }
    }

    setSelectedFormGrades(item.grades || ['todos']);

    if (heading) heading.innerHTML = '<i class="fas fa-pen" style="color:#FBBF24;"></i> Editando Video';
    if (cancelBtn) cancelBtn.style.display = 'block';
    if (saveBtn) saveBtn.innerHTML = '<i class="fas fa-save"></i> Guardar Cambios';

    switchMobileTab('upload');
  }

  function renderQuickDeck() {
    var container = document.getElementById('pv-quick-list');
    if (!container) return;

    var list = (remoteState && Array.isArray(remoteState.playlist))
      ? remoteState.playlist
      : DEFAULT_LIBRARY;

    var filtered = list.filter(function (v) {
      var vGrades = Array.isArray(v.grades) && v.grades.length ? v.grades : ['todos'];
      return (quickGradeFilter === 'todos') || (vGrades.indexOf('todos') !== -1) || (vGrades.indexOf(quickGradeFilter) !== -1);
    });

    if (!filtered.length) {
      container.innerHTML = '<div style="text-align:center;padding:16px;color:#94A3B8;font-size:0.84rem;">No hay videos cargados para este grado.</div>';
      return;
    }

    var activeUrl = remoteState ? remoteState.videoUrl : '';

    container.innerHTML = filtered.map(function (item) {
      var isOnAir = (activeUrl && item.url === activeUrl);
      return '<div class="pv-quick-item' + (isOnAir ? ' is-on-air' : '') + '" data-qplay="' + esc(item.id) + '">' +
        '<div class="pv-qi-info">' +
          '<span class="pv-qi-meta">' + esc(formatGradesText(item.grades)) + (item.project ? ' · 🚀 ' + esc(item.project) : '') + '</span>' +
          '<p class="pv-qi-title">' + esc(item.title) + '</p>' +
        '</div>' +
        '<button type="button" class="pv-qi-play-btn">' +
          '<i class="fas ' + (isOnAir ? 'fa-broadcast-tower' : 'fa-play') + '"></i> ' +
          (isOnAir ? 'Activo' : 'Poner') +
        '</button>' +
      '</div>';
    }).join('');

    container.querySelectorAll('[data-qplay]').forEach(function (row) {
      row.addEventListener('click', function () {
        var id = row.getAttribute('data-qplay');
        var chosen = list.find(function (x) { return x.id === id; });
        if (chosen) projectVideoItem(chosen);
      });
    });
  }

  function renderLibraryGrid() {
    var grid = document.getElementById('pv-library-grid');
    var countEl = document.getElementById('pv-library-count');
    var projFilterSel = document.getElementById('pv-filter-project');
    if (!grid) return;

    var list = (remoteState && Array.isArray(remoteState.playlist))
      ? remoteState.playlist
      : DEFAULT_LIBRARY;

    if (projFilterSel) {
      var projectsSet = {};
      list.forEach(function (v) {
        if (v.project && v.project.trim()) projectsSet[v.project.trim()] = true;
      });
      var projectNames = Object.keys(projectsSet).sort();
      var currentVal = projFilterSel.value || 'todos';
      projFilterSel.innerHTML = '<option value="todos">📂 Todos los Proyectos (' + list.length + ')</option>' +
        projectNames.map(function (p) {
          return '<option value="' + esc(p) + '"' + (p === currentVal ? ' selected' : '') + '>🚀 ' + esc(p) + '</option>';
        }).join('');
    }

    var filtered = list.filter(function (v) {
      var vGrades = Array.isArray(v.grades) && v.grades.length ? v.grades : ['todos'];
      var matchGrade = (filterGrade === 'todos') || (vGrades.indexOf('todos') !== -1) || (vGrades.indexOf(filterGrade) !== -1);
      var matchProj = (filterProject === 'todos') || ((v.project || '') === filterProject);
      var matchSearch = !filterSearch ||
        (String(v.title || '').toLowerCase().indexOf(filterSearch) !== -1) ||
        (String(v.project || '').toLowerCase().indexOf(filterSearch) !== -1) ||
        (String(v.subtitle || '').toLowerCase().indexOf(filterSearch) !== -1);
      return matchGrade && matchProj && matchSearch;
    });

    if (countEl) {
      countEl.textContent = filtered.length + (filtered.length === 1 ? ' video' : ' videos');
    }

    if (!filtered.length) {
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:28px;color:#94A3B8;border:1px dashed #334155;border-radius:14px;">' +
        'No hay videos para este filtro.' +
      '</div>';
      return;
    }

    var activeUrl = remoteState ? remoteState.videoUrl : '';

    grid.innerHTML = filtered.map(function (item) {
      var parsed = parseVideoUrl(item.url) || { type: item.type || 'youtube', youtubeId: item.youtubeId || '' };
      var ytId = item.youtubeId || parsed.youtubeId;
      var thumbHtml = ytId
        ? '<img src="https://img.youtube.com/vi/' + esc(ytId) + '/hqdefault.jpg" alt="' + esc(item.title) + '" loading="lazy">'
        : '<span class="pv-vc-thumb-icon"><i class="fas fa-film"></i></span>';

      var isOnAir = (activeUrl && item.url === activeUrl);

      return '<article class="pv-video-card' + (isOnAir ? ' is-on-air' : '') + '">' +
        '<div class="pv-vc-thumb">' +
          thumbHtml +
          '<span class="pv-vc-type-tag">' + (parsed.type === 'mp4' ? 'MP4' : 'YOUTUBE') + '</span>' +
          (isOnAir ? '<span class="pv-vc-onair-tag">● EN PANTALLA</span>' : '') +
        '</div>' +
        '<div class="pv-vc-body">' +
          '<div>' +
            '<div class="pv-vc-chips">' +
              '<span class="pv-chip grade"><i class="fas fa-graduation-cap"></i> ' + esc(formatGradesText(item.grades)) + '</span>' +
              (item.project ? '<span class="pv-chip project"><i class="fas fa-rocket"></i> ' + esc(item.project) + '</span>' : '') +
            '</div>' +
            '<h3 class="pv-vc-title">' + esc(item.title) + '</h3>' +
            '<p class="pv-vc-sub">' + esc(item.subtitle || '') + '</p>' +
          '</div>' +
          '<div class="pv-vc-actions">' +
            '<button type="button" class="pv-vc-btn-project" data-action="project" data-id="' + esc(item.id) + '">' +
              '<i class="fas ' + (isOnAir ? 'fa-broadcast-tower' : 'fa-play') + '"></i> ' +
              (isOnAir ? 'Reiniciar en PCs' : 'Proyectar en Clase') +
            '</button>' +
            '<button type="button" class="pv-vc-btn-icon" data-action="edit" data-id="' + esc(item.id) + '" title="Editar">' +
              '<i class="fas fa-pen"></i>' +
            '</button>' +
            '<button type="button" class="pv-vc-btn-icon del" data-action="delete" data-id="' + esc(item.id) + '" title="Dar de baja">' +
              '<i class="fas fa-trash-alt"></i>' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</article>';
    }).join('');

    grid.querySelectorAll('[data-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var action = btn.getAttribute('data-action');
        var id = btn.getAttribute('data-id');
        var fullList = (remoteState && Array.isArray(remoteState.playlist)) ? remoteState.playlist.slice() : DEFAULT_LIBRARY.slice();
        var item = fullList.find(function (x) { return x.id === id; });
        if (!item) return;

        if (action === 'project') {
          projectVideoItem(item);
        } else if (action === 'edit') {
          loadVideoIntoFormForEdit(item);
        } else if (action === 'delete') {
          if (confirm('¿Dar de baja «' + item.title + '» de la biblioteca?')) {
            var nextList = fullList.filter(function (x) { return x.id !== id; });
            pushState({ playlist: nextList }, false);
            showToast('🗑️ Video eliminado');
          }
        }
      });
    });
  }

  /**
   * ─────────────────────────────────────────────────────────────
   * RELOJ HÍBRIDO (VIRTUAL + MONITOR REAL) + AUTO-PAUSA EN MARCADORES
   * ─────────────────────────────────────────────────────────────
   */
  function getEffectiveCurrentTime() {
    if (monitorVisible) {
      var realT = getMediaCurrentTime();
      if (realT > 0) return realT;
    }
    var rate = (remoteState && Number(remoteState.playbackRate)) || 1;
    var dur = getEffectiveDuration();
    if (virtualIsPlaying) {
      var elapsed = ((Date.now() - virtualLastTickMs) / 1000) * rate;
      return Math.min(dur, Math.max(0, virtualBaseSec + elapsed));
    }
    return Math.max(0, virtualBaseSec);
  }

  function getEffectiveDuration() {
    if (monitorVisible) {
      var realD = getMediaDuration();
      if (realD > 0) return realD;
    }
    return (remoteState && Number(remoteState.duration) > 0) ? Number(remoteState.duration) : 300;
  }

  function checkAutoPauseAtMarkers(curSec) {
    if (!virtualIsPlaying || !remoteState || !remoteState.autoPauseAtMarkers) return;
    var markers = remoteState.markers || [];
    if (!Array.isArray(markers) || !markers.length) return;

    var floorSec = Math.floor(curSec);
    for (var i = 0; i < markers.length; i++) {
      var m = markers[i];
      var mTime = Math.floor(Number(m.time) || 0);
      if (mTime > 0 && Math.abs(floorSec - mTime) <= 1 && lastTriggeredMarkerSec !== mTime) {
        lastTriggeredMarkerSec = mTime;
        virtualBaseSec = mTime;
        virtualLastTickMs = Date.now();
        virtualIsPlaying = false;
        if (monitorVisible) pauseMedia();

        vibrateTap([50, 40, 50]);
        pushState({
          isPlaying: false,
          baseTime: mTime,
          livePromptText: '📍 ' + (m.label || 'Paso del Proyecto')
        }, true);
        showToast('⏸️ Auto-pausa en: ' + m.label);
        break;
      }
    }
  }

  function setupHtml5MonitorEvents() {
    if (!html5Video) return;

    html5Video.addEventListener('play', function () {
      if (!monitorVisible || currentMediaType !== 'mp4') return;
      if (!isApplyingRemote && Date.now() > suppressLocalEventsUntil) {
        virtualBaseSec = html5Video.currentTime || 0;
        virtualLastTickMs = Date.now();
        virtualIsPlaying = true;
        pushState({
          isPlaying: true,
          attentionMode: false,
          baseTime: virtualBaseSec,
          sessionActive: true
        }, true);
      }
    });

    html5Video.addEventListener('pause', function () {
      if (!monitorVisible || currentMediaType !== 'mp4') return;
      if (!isApplyingRemote && Date.now() > suppressLocalEventsUntil) {
        virtualBaseSec = html5Video.currentTime || 0;
        virtualLastTickMs = Date.now();
        virtualIsPlaying = false;
        pushState({
          isPlaying: false,
          baseTime: virtualBaseSec,
          sessionActive: true
        }, true);
      }
    });
  }

  function loadYouTubeApi() {
    if (window.YT && window.YT.Player) {
      ytApiReady = true;
      initYtMonitor();
      return;
    }
    var prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () {
      if (typeof prev === 'function') prev();
      ytApiReady = true;
      initYtMonitor();
    };
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      var tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
  }

  function initYtMonitor() {
    if (ytPlayer || !ytApiReady) return;
    var initialId = (remoteState && remoteState.youtubeId) || DEFAULT_STATE.youtubeId;
    ytPlayer = new window.YT.Player('pv-yt-player', {
      width: '100%',
      height: '100%',
      videoId: initialId,
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
          if (monitorVisible && remoteState) {
            loadMediaSource(remoteState.videoType, remoteState.videoUrl, remoteState.youtubeId, remoteState.baseTime, false);
          }
        },
        onStateChange: function (event) {
          if (!monitorVisible || currentMediaType !== 'youtube' || !window.YT) return;
          var YTState = window.YT.PlayerState;
          if (!isApplyingRemote && Date.now() > suppressLocalEventsUntil) {
            if (event.data === YTState.PLAYING) {
              virtualBaseSec = getMediaCurrentTime();
              virtualLastTickMs = Date.now();
              virtualIsPlaying = true;
              pushState({
                isPlaying: true,
                attentionMode: false,
                baseTime: virtualBaseSec,
                duration: getMediaDuration() || 300,
                sessionActive: true
              }, true);
            } else if (event.data === YTState.PAUSED) {
              virtualBaseSec = getMediaCurrentTime();
              virtualLastTickMs = Date.now();
              virtualIsPlaying = false;
              pushState({
                isPlaying: false,
                baseTime: virtualBaseSec,
                sessionActive: true
              }, true);
            }
          }
        }
      }
    });
  }

  function loadMediaSource(type, url, youtubeId, targetSeconds, shouldPlay) {
    var ytWrap = document.getElementById('pv-yt-wrap');
    var mp4Wrap = document.getElementById('pv-mp4-wrap');

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
          isApplyingRemote = true;
          suppressLocalEventsUntil = Date.now() + 1400;
          if (shouldPlay && monitorVisible) {
            ytPlayer.loadVideoById({ videoId: cleanYtId, startSeconds: targetSeconds || 0 });
          } else if (typeof ytPlayer.cueVideoById === 'function') {
            ytPlayer.cueVideoById({ videoId: cleanYtId, startSeconds: targetSeconds || 0 });
          }
          setTimeout(function () { isApplyingRemote = false; }, 600);
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
        isApplyingRemote = true;
        suppressLocalEventsUntil = Date.now() + 1400;
        html5Video.src = url;
        html5Video.load();
        html5Video.addEventListener('loadedmetadata', function onMeta() {
          html5Video.removeEventListener('loadedmetadata', onMeta);
          if (targetSeconds > 0) {
            try { html5Video.currentTime = targetSeconds; } catch (ex) {}
          }
          if (shouldPlay && monitorVisible) {
            html5Video.play().catch(function () {});
          }
          isApplyingRemote = false;
        });
      }
    }
  }

  function playMedia() {
    if (currentMediaType === 'mp4') {
      if (html5Video) html5Video.play().catch(function () {});
    } else if (ytPlayer && ytPlayerReady && typeof ytPlayer.playVideo === 'function') {
      ytPlayer.playVideo();
    }
  }

  function pauseMedia() {
    if (currentMediaType === 'mp4') {
      if (html5Video) {
        try { html5Video.pause(); } catch (e) {}
      }
    } else if (ytPlayer && ytPlayerReady && typeof ytPlayer.pauseVideo === 'function') {
      ytPlayer.pauseVideo();
    }
  }

  function seekMediaTo(seconds) {
    seconds = Math.max(0, Number(seconds) || 0);
    if (currentMediaType === 'mp4') {
      if (html5Video) {
        try { html5Video.currentTime = seconds; } catch (e) {}
      }
    } else if (ytPlayer && ytPlayerReady && typeof ytPlayer.seekTo === 'function') {
      ytPlayer.seekTo(seconds, true);
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

  function setMediaPlaybackRate(rate) {
    rate = Number(rate) || 1;
    if (currentMediaType === 'mp4') {
      if (html5Video) {
        try { html5Video.playbackRate = rate; } catch (e) {}
      }
    } else if (ytPlayer && ytPlayerReady && typeof ytPlayer.setPlaybackRate === 'function') {
      try { ytPlayer.setPlaybackRate(rate); } catch (e) {}
    }
  }

  function connectFirestore() {
    if (!window.db || typeof window.db.collection !== 'function') {
      setTimeout(connectFirestore, 600);
      return;
    }

    var docRef = window.db.collection(DOC_COLLECTION).doc(DOC_ID);
    docRef.onSnapshot(function (doc) {
      if (!doc.exists) {
        remoteState = Object.assign({}, DEFAULT_STATE);
        docRef.set(remoteState, { merge: true }).catch(function () {});
        syncVirtualClockFromState(remoteState);
        renderConsoleStatus(remoteState);
        renderQuickDeck();
        renderLibraryGrid();
        return;
      }

      var data = doc.data() || {};
      if (!Array.isArray(data.playlist) || !data.playlist.length) {
        data.playlist = DEFAULT_LIBRARY;
      }
      var merged = Object.assign({}, DEFAULT_STATE, data);
      var firstLoad = !remoteState;
      remoteState = merged;

      if (firstLoad) {
        syncVirtualClockFromState(merged);
        if (monitorVisible) {
          loadMediaSource(merged.videoType, merged.videoUrl, merged.youtubeId, merged.baseTime || 0, false);
        }
      }

      renderConsoleStatus(merged);
      renderQuickDeck();
      renderLibraryGrid();
    });
  }

  function syncVirtualClockFromState(state) {
    virtualBaseSec = Number(state.baseTime) || 0;
    virtualLastTickMs = Date.now();
    virtualIsPlaying = !!state.isPlaying;
  }

  function pushState(partial, incrementSeq) {
    if (!window.db || typeof window.db.collection !== 'function') return;

    var base = remoteState ? Object.assign({}, remoteState) : Object.assign({}, DEFAULT_STATE);
    var next = Object.assign(base, partial, {
      updatedAtMs: Date.now()
    });

    if (incrementSeq) {
      next.syncSeq = (Number(base.syncSeq) || 0) + 1;
    }

    remoteState = next;
    renderConsoleStatus(next);
    renderQuickDeck();
    renderLibraryGrid();

    window.db.collection(DOC_COLLECTION).doc(DOC_ID).set(next, { merge: true }).catch(function (err) {
      console.warn('Error al guardar en Firestore:', err);
    });
  }

  function renderConsoleStatus(state) {
    if (!state) return;

    var livePill = document.getElementById('pv-live-pill');
    var liveTxt = document.getElementById('pv-live-pill-txt');
    if (livePill && liveTxt) {
      livePill.className = 'pv-live-badge' +
        (state.attentionMode ? ' is-attention' : (state.isPlaying ? ' is-playing' : ''));
      liveTxt.textContent = state.attentionMode
        ? 'ATENCIÓN'
        : (state.isPlaying ? 'EN VIVO' : 'EN PAUSA');
    }

    var npGrade = document.getElementById('pv-np-grade');
    var npProject = document.getElementById('pv-np-project');
    var npTitle = document.getElementById('pv-np-title');
    var npSub = document.getElementById('pv-np-sub');

    if (npGrade) npGrade.innerHTML = '<i class="fas fa-graduation-cap"></i> ' + esc(formatGradesText(state.grades));
    if (npProject) npProject.innerHTML = '<i class="fas fa-rocket"></i> ' + esc(state.project || 'Proyecto General');
    if (npTitle) npTitle.textContent = state.title || 'Sin título';
    if (npSub) npSub.textContent = state.subtitle || '';

    var playBtn = document.getElementById('pv-btn-playpause');
    var playIcon = document.getElementById('pv-playpause-icon');
    var playTxt = document.getElementById('pv-playpause-txt');
    if (playBtn && playIcon && playTxt) {
      playBtn.classList.toggle('is-playing', !!state.isPlaying);
      playIcon.className = state.isPlaying ? 'fas fa-pause' : 'fas fa-play';
      playTxt.textContent = state.isPlaying
        ? 'PAUSAR TODAS LAS MÁQUINAS'
        : 'REPRODUCIR EN CLASE';
    }

    // Estado del Botón "¡Atención al Profesor!"
    var attBtn = document.getElementById('pv-btn-attention');
    var attTxt = document.getElementById('pv-attention-txt');
    if (attBtn && attTxt) {
      attBtn.classList.toggle('is-active', !!state.attentionMode);
      attTxt.textContent = state.attentionMode
        ? '👀 PANTALLAS OSCURECIDAS (Tocar para volver al video)'
        : '👀 Atención al Profesor (Oscurecer PCs)';
    }

    // Estado del Cartel / Pregunta activa
    var promptBar = document.getElementById('pv-prompt-active-bar');
    var promptActiveTxt = document.getElementById('pv-prompt-active-txt');
    if (promptBar && promptActiveTxt) {
      var hasPrompt = !!(state.livePromptText && state.livePromptText.trim());
      promptBar.style.display = hasPrompt ? 'flex' : 'none';
      if (hasPrompt) {
        promptActiveTxt.textContent = 'En pantalla: «' + state.livePromptText.trim() + '»';
      }
    }

    // Estado de la Lámina / Esquema proyectado
    var schemaBar = document.getElementById('pv-schema-active-bar');
    var schemaActiveTxt = document.getElementById('pv-schema-active-txt');
    if (schemaBar && schemaActiveTxt) {
      var hasSchema = !!(state.referenceSchema && state.referenceSchema.url);
      schemaBar.style.display = hasSchema ? 'flex' : 'none';
      if (hasSchema) {
        schemaActiveTxt.textContent = '🖼️ En pantalla: ' + (state.referenceSchema.title || 'Esquema del Proyecto');
      }
    }

    // Estado de Mini-Pregunta Interactiva A/B/C
    renderQuizLiveDashboard(state);

    // Estado de Auto-pausa y Marcadores
    var autoPauseCheck = document.getElementById('pv-autopause-check');
    if (autoPauseCheck) {
      autoPauseCheck.checked = !!state.autoPauseAtMarkers;
    }
    renderMarkersControls(state.markers || []);

    var locked = state.lockedByTeacher !== false;
    var lockBox = document.getElementById('pv-lock-box');
    var lockTitle = document.getElementById('pv-lock-title');
    var lockDesc = document.getElementById('pv-lock-desc');
    var lockBtn = document.getElementById('pv-btn-toggle-lock');
    if (lockBox && lockTitle && lockDesc && lockBtn) {
      lockBox.className = 'pv-switch-tile ' + (locked ? 'is-locked' : 'is-free');
      if (locked) {
        lockTitle.innerHTML = '<i class="fas fa-lock"></i> Bloqueado';
        lockDesc.textContent = 'Alumnos no pueden pausar ni adelantar.';
        lockBtn.textContent = '🔓 Liberar Control';
      } else {
        lockTitle.innerHTML = '<i class="fas fa-unlock"></i> Control Libre';
        lockDesc.textContent = 'Alumnos pueden manejar su video.';
        lockBtn.textContent = '🔒 Bloquear PCs';
      }
    }

    var audioTitle = document.getElementById('pv-audio-title');
    var audioDesc = document.getElementById('pv-audio-desc');
    var audioBtn = document.getElementById('pv-btn-toggle-audio');
    if (audioTitle && audioDesc && audioBtn) {
      if (state.muteStudents) {
        audioTitle.innerHTML = '<i class="fas fa-volume-mute"></i> Silenciados';
        audioDesc.textContent = 'PCs de alumnos en silencio.';
        audioBtn.textContent = '🔊 Activar Sonido';
      } else {
        audioTitle.innerHTML = '<i class="fas fa-volume-up"></i> Sonido en Todas';
        audioDesc.textContent = 'Todas las PCs reproducen con audio.';
        audioBtn.textContent = '🔇 Silenciar Alumnos';
      }
    }
  }

  function renderQuizLiveDashboard(state) {
    var box = document.getElementById('pv-quiz-live-box');
    var qEl = document.getElementById('pv-quiz-live-q');
    var barsEl = document.getElementById('pv-quiz-bars');
    var revealBtn = document.getElementById('pv-btn-reveal-quiz');
    if (!box || !qEl || !barsEl) return;

    var quiz = state && state.activeQuiz;
    if (!quiz || !quiz.question || !Array.isArray(quiz.options) || !quiz.options.length) {
      box.style.display = 'none';
      return;
    }

    box.style.display = 'block';
    qEl.textContent = '🎯 ' + quiz.question;

    if (revealBtn) {
      revealBtn.textContent = quiz.revealed
        ? '✅ Respuesta Revelada en PCs (Tocar para ocultar)'
        : '🏆 Revelar Respuesta Correcta en PCs';
    }

    // Contar votos de las máquinas conectadas para este quiz.id
    var cutoff = Date.now() - 120000;
    var counts = quiz.options.map(function () { return 0; });
    var totalVotes = 0;

    presenceDocs.forEach(function (d) {
      if (d.lastSeenMs && d.lastSeenMs > cutoff && d.quizId === quiz.id && typeof d.quizAnswer === 'number') {
        if (d.quizAnswer >= 0 && d.quizAnswer < counts.length) {
          counts[d.quizAnswer]++;
          totalVotes++;
        }
      }
    });

    var letters = ['A', 'B', 'C', 'D'];
    barsEl.innerHTML = quiz.options.map(function (optText, idx) {
      var c = counts[idx] || 0;
      var pct = totalVotes > 0 ? Math.round((c / totalVotes) * 100) : 0;
      var isCorr = Number(quiz.correctIndex) === idx;
      return '<div class="pv-qbar-row' + (isCorr ? ' is-correct-opt' : '') + '">' +
        '<div class="pv-qbar-top">' +
          '<span>' + letters[idx] + ') ' + esc(optText) + (isCorr ? ' ✅' : '') + '</span>' +
          '<span>' + c + (c === 1 ? ' máquina' : ' máquinas') + ' (' + pct + '%)</span>' +
        '</div>' +
        '<div class="pv-qbar-track">' +
          '<div class="pv-qbar-fill" style="width:' + pct + '%;"></div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function startTimers() {
    if (uiTimer) clearInterval(uiTimer);
    uiTimer = setInterval(function () {
      updateMonitorTimeUi();
      updatePresenceBadgeUi();
    }, 500);

    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = setInterval(function () {
      if (virtualIsPlaying) {
        var cur = getEffectiveCurrentTime();
        var dur = getEffectiveDuration();
        pushState({
          isPlaying: true,
          baseTime: cur,
          duration: dur
        }, false);
      }
    }, 4000);
  }

  function updateMonitorTimeUi() {
    var cur = getEffectiveCurrentTime();
    var dur = getEffectiveDuration();

    checkAutoPauseAtMarkers(cur);

    var markerCurSec = document.getElementById('pv-marker-cur-sec');
    if (markerCurSec) markerCurSec.textContent = formatTime(cur);

    if (!isDraggingScrubber) {
      var curEl = document.getElementById('pv-cur-time');
      var durEl = document.getElementById('pv-dur-time');
      var scrub = document.getElementById('pv-scrubber');
      if (curEl) curEl.textContent = formatTime(cur);
      if (durEl) durEl.textContent = formatTime(dur);
      if (scrub && dur > 0) {
        scrub.max = Math.floor(dur);
        scrub.value = Math.floor(cur);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
