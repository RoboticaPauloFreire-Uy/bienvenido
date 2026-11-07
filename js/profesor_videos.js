/**
 * =============================================================
 * PROFESOR_VIDEOS.JS — CABINA EXCLUSIVA DOCENTE (BIBLIOTECA Y PROYECCIÓN)
 * Colegio Paulo Freire · Taller de Robótica, Programación & Cultura Maker
 * =============================================================
 * Permite al profesor:
 *  1. Dar de alta, editar y dar de baja videos organizados por Grado y por Proyecto.
 *  2. Filtrar su biblioteca por grado o proyecto que va a presentar en clase.
 *  3. Proyectar cualquier video con 1 clic en todas las máquinas de los alumnos
 *     y controlar Play, Pausa, línea de tiempo, bloqueo de control y sonido en vivo.
 */

(function () {
  'use strict';

  var DOC_COLLECTION = 'config';
  var DOC_ID = 'classroom_video_sync';
  var SESSION_KEY = 'pf_teacher_video_cabin_auth';
  var VALID_PASSWORDS = ['2026', '1234', 'paulo2026', 'admin123', 'robotica2026'];

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

  var DEFAULT_LIBRARY = [
    {
      id: 'vid-fantasma-imanes',
      title: 'El Magnetismo y los Imanes — El Fantasma Levitante',
      subtitle: '¿Por qué flota nuestro fantasma sin tocar el palito superior?',
      project: 'El Fantasma Levitante',
      grades: ['sala5', 'grado1'],
      url: 'https://www.youtube.com/watch?v=7afwV_aJcjk',
      type: 'youtube',
      youtubeId: '7afwV_aJcjk'
    },
    {
      id: 'vid-guitarra-carton',
      title: 'Conductividad y Sonido con Micro:bit',
      subtitle: 'Cómo funcionan los circuitos musicales de nuestra guitarra de cartón',
      project: 'Guitarra musical de cartón',
      grades: ['grado3'],
      url: 'https://www.youtube.com/watch?v=TdNU26840_8',
      type: 'youtube',
      youtubeId: 'TdNU26840_8'
    },
    {
      id: 'vid-intro-robotica',
      title: '¿Qué es un Robot y cómo piensa?',
      subtitle: 'Sensores, procesadores y motores en el Taller de Robótica',
      project: 'Introducción a la Robótica',
      grades: ['todos'],
      url: 'https://www.youtube.com/watch?v=wA9tO7m3v6U',
      type: 'youtube',
      youtubeId: 'wA9tO7m3v6U'
    }
  ];

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
    duration: 0,
    playbackRate: 1,
    lockedByTeacher: true,
    muteStudents: false,
    sessionActive: false,
    callStudentsSeq: 0,
    syncSeq: 1,
    updatedAtMs: Date.now(),
    playlist: DEFAULT_LIBRARY
  };

  // Estado local del panel docente
  var remoteState = null;
  var filterGrade = 'todos';
  var filterProject = 'todos';
  var filterSearch = '';
  var isApplyingRemote = false;
  var suppressLocalEventsUntil = 0;
  var isDraggingScrubber = false;

  // Reproductor monitor del profesor
  var currentMediaType = null;
  var currentMediaIdOrUrl = '';
  var ytPlayer = null;
  var ytApiReady = false;
  var ytPlayerReady = false;
  var html5Video = null;
  var uiTimer = null;
  var heartbeatTimer = null;

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
    }, 3200);
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
    setupLogin();
    bindControlEvents();
    bindLibraryEvents();
    setupHtml5MonitorEvents();
    loadYouTubeApi();
    connectFirestore();
    startTimers();
  }

  function setupLogin() {
    var overlay = document.getElementById('pv-login-overlay');
    var form = document.getElementById('pv-login-form');
    var passInput = document.getElementById('pv-login-pass');
    var errEl = document.getElementById('pv-login-error');
    var logoutBtn = document.getElementById('pv-btn-logout');

    try {
      if (sessionStorage.getItem(SESSION_KEY) === 'true') {
        if (overlay) overlay.style.display = 'none';
      }
    } catch (e) {}

    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var val = passInput ? passInput.value.trim().toLowerCase() : '';
        if (VALID_PASSWORDS.indexOf(val) !== -1) {
          try { sessionStorage.setItem(SESSION_KEY, 'true'); } catch (ex) {}
          if (overlay) overlay.style.display = 'none';
          if (errEl) errEl.textContent = '';
          showToast('¡Bienvenido a la Cabina de Videos del Profesor!');
        } else {
          if (errEl) errEl.textContent = 'Clave incorrecta. Ingresá tu PIN docente (ej: 2026).';
        }
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        try { sessionStorage.removeItem(SESSION_KEY); } catch (ex) {}
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
   * EVENTOS DE LA CABINA DE CONTROL EN VIVO
   * ─────────────────────────────────────────────────────────────
   */
  function bindControlEvents() {
    // Play / Pausa en todas las máquinas
    var playPauseBtn = document.getElementById('pv-btn-playpause');
    if (playPauseBtn) {
      playPauseBtn.addEventListener('click', function () {
        var curPlaying = remoteState ? !!remoteState.isPlaying : isMediaPlaying();
        var nextPlaying = !curPlaying;
        var curSec = getMediaCurrentTime();

        suppressLocalEventsUntil = Date.now() + 1200;
        if (nextPlaying) playMedia();
        else pauseMedia();

        pushState({
          isPlaying: nextPlaying,
          baseTime: curSec,
          sessionActive: true
        }, true);

        showToast(nextPlaying ? '▶️ Reproduciendo en todas las máquinas' : '⏸️ Pausado en todas las máquinas');
      });
    }

    var restartBtn = document.getElementById('pv-btn-restart');
    if (restartBtn) {
      restartBtn.addEventListener('click', function () {
        suppressLocalEventsUntil = Date.now() + 1200;
        seekMediaTo(0);
        pushState({ baseTime: 0, sessionActive: true }, true);
        showToast('⏮️ Video reiniciado a 00:00 en todas las máquinas');
      });
    }

    var rew10Btn = document.getElementById('pv-btn-rew10');
    if (rew10Btn) {
      rew10Btn.addEventListener('click', function () {
        var nextSec = Math.max(0, getMediaCurrentTime() - 10);
        suppressLocalEventsUntil = Date.now() + 1200;
        seekMediaTo(nextSec);
        pushState({ baseTime: nextSec, sessionActive: true }, true);
      });
    }

    var fwd10Btn = document.getElementById('pv-btn-fwd10');
    if (fwd10Btn) {
      fwd10Btn.addEventListener('click', function () {
        var dur = getMediaDuration() || 99999;
        var nextSec = Math.min(dur, getMediaCurrentTime() + 10);
        suppressLocalEventsUntil = Date.now() + 1200;
        seekMediaTo(nextSec);
        pushState({ baseTime: nextSec, sessionActive: true }, true);
      });
    }

    var forceSyncBtn = document.getElementById('pv-btn-forcesync');
    if (forceSyncBtn) {
      forceSyncBtn.addEventListener('click', function () {
        pushState({
          isPlaying: isMediaPlaying(),
          baseTime: getMediaCurrentTime(),
          sessionActive: true
        }, true);
        showToast('⚡ Todas las máquinas sincronizadas a tu posición actual');
      });
    }

    // Scrubber
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
        var sec = Number(scrubber.value) || 0;
        suppressLocalEventsUntil = Date.now() + 1200;
        seekMediaTo(sec);
        pushState({ baseTime: sec, sessionActive: true }, true);
      });
    }

    // Velocidad
    var speedSel = document.getElementById('pv-speed-select');
    if (speedSel) {
      speedSel.addEventListener('change', function () {
        var rate = Number(speedSel.value) || 1;
        setMediaPlaybackRate(rate);
        pushState({ playbackRate: rate, baseTime: getMediaCurrentTime() }, true);
      });
    }

    // Interruptor Bloquear / Liberar Control
    var lockBtn = document.getElementById('pv-btn-toggle-lock');
    if (lockBtn) {
      lockBtn.addEventListener('click', function () {
        var curLocked = remoteState ? remoteState.lockedByTeacher !== false : true;
        var nextLocked = !curLocked;
        pushState({
          lockedByTeacher: nextLocked,
          baseTime: getMediaCurrentTime(),
          isPlaying: isMediaPlaying(),
          sessionActive: true
        }, true);
        showToast(nextLocked
          ? '🔒 Máquinas bloqueadas: solo vos controlás Play y Pausa'
          : '🔓 Control liberado: los alumnos pueden pausar o adelantar');
      });
    }

    // Interruptor Sonido
    var audioBtn = document.getElementById('pv-btn-toggle-audio');
    if (audioBtn) {
      audioBtn.addEventListener('click', function () {
        var curMuted = remoteState ? !!remoteState.muteStudents : false;
        var nextMuted = !curMuted;
        pushState({ muteStudents: nextMuted }, true);
        showToast(nextMuted
          ? '🔇 Máquinas de alumnos silenciadas'
          : '🔊 Sonido habilitado en todas las máquinas');
      });
    }

    // Botón Traer Máquinas a la Sala de Video
    var callBtn = document.getElementById('pv-btn-call-students');
    if (callBtn) {
      callBtn.addEventListener('click', function () {
        var nextCall = ((remoteState && remoteState.callStudentsSeq) || 0) + 1;
        pushState({
          sessionActive: true,
          callStudentsSeq: nextCall,
          baseTime: getMediaCurrentTime()
        }, true);
        showToast('📢 Señal enviada: abriendo Sala de Video en las máquinas de la clase');
      });
    }
  }

  /**
   * ─────────────────────────────────────────────────────────────
   * EVENTOS DE LA BIBLIOTECA DE VIDEOS (ALTA, BAJA, EDICIÓN Y FILTROS)
   * ─────────────────────────────────────────────────────────────
   */
  function bindLibraryEvents() {
    // Selector de proyecto con opción de escribir proyecto personalizado
    var projSel = document.getElementById('pv-select-project');
    var customProjInput = document.getElementById('pv-input-custom-project');
    if (projSel && customProjInput) {
      projSel.addEventListener('change', function () {
        var isCustom = projSel.value === '__custom__';
        customProjInput.style.display = isCustom ? 'block' : 'none';
        if (isCustom) customProjInput.focus();
      });
    }

    // Selección de píldoras de Grado en el formulario
    var gradePillsWrap = document.getElementById('pv-form-grade-pills');
    if (gradePillsWrap) {
      gradePillsWrap.querySelectorAll('.pv-grade-check').forEach(function (pill) {
        pill.addEventListener('click', function () {
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

    // Guardar en Biblioteca (sin cambiar la transmisión actual)
    var form = document.getElementById('pv-video-form');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        saveVideoFromForm(false);
      });
    }

    // Guardar y Proyectar Ahora en Clase
    var saveAndProjectBtn = document.getElementById('pv-btn-save-and-project');
    if (saveAndProjectBtn) {
      saveAndProjectBtn.addEventListener('click', function () {
        saveVideoFromForm(true);
      });
    }

    // Cancelar edición
    var cancelEditBtn = document.getElementById('pv-btn-cancel-edit');
    if (cancelEditBtn) {
      cancelEditBtn.addEventListener('click', function () {
        resetVideoForm();
      });
    }

    // Filtros por Grado
    var filterGradesWrap = document.getElementById('pv-filter-grades');
    if (filterGradesWrap) {
      filterGradesWrap.querySelectorAll('[data-filter-grade]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          filterGrade = btn.getAttribute('data-filter-grade') || 'todos';
          filterGradesWrap.querySelectorAll('[data-filter-grade]').forEach(function (b) {
            b.classList.toggle('active', b === btn);
          });
          renderLibraryGrid();
        });
      });
    }

    // Filtro por Proyecto
    var filterProjSel = document.getElementById('pv-filter-project');
    if (filterProjSel) {
      filterProjSel.addEventListener('change', function () {
        filterProject = filterProjSel.value || 'todos';
        renderLibraryGrid();
      });
    }

    // Buscador por texto
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
      alert('Completá el título y el enlace del video (YouTube o MP4).');
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

    var videoItem = {
      id: editId || ('vid-' + Date.now()),
      title: title,
      subtitle: subtitle,
      project: project,
      grades: grades,
      url: parsed.url,
      type: parsed.type,
      youtubeId: parsed.youtubeId || '',
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
      suppressLocalEventsUntil = Date.now() + 1400;
      statePatch.videoUrl = videoItem.url;
      statePatch.videoType = videoItem.type;
      statePatch.youtubeId = videoItem.youtubeId;
      statePatch.title = videoItem.title;
      statePatch.subtitle = videoItem.subtitle;
      statePatch.project = videoItem.project;
      statePatch.grades = videoItem.grades;
      statePatch.baseTime = 0;
      statePatch.isPlaying = true;
      statePatch.sessionActive = true;
      loadMediaSource(videoItem.type, videoItem.url, videoItem.youtubeId, 0, true);
    }

    pushState(statePatch, projectImmediately);
    resetVideoForm();
    showToast(projectImmediately
      ? '📡 Video guardado y proyectándose en todas las máquinas'
      : '💾 Video guardado en la Biblioteca del Profesor');
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
    if (heading) heading.innerHTML = '<i class="fas fa-plus-circle"></i> Dar de Alta Nuevo Video en la Biblioteca';
    if (cancelBtn) cancelBtn.style.display = 'none';
    if (saveBtn) saveBtn.innerHTML = '<i class="fas fa-save"></i> Guardar en Biblioteca';
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

    if (heading) heading.innerHTML = '<i class="fas fa-edit"></i> Editando Video: ' + esc(item.title);
    if (cancelBtn) cancelBtn.style.display = 'inline-block';
    if (saveBtn) saveBtn.innerHTML = '<i class="fas fa-save"></i> Guardar Cambios';

    var formEl = document.getElementById('pv-video-form');
    if (formEl) formEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /**
   * Renderiza el selector de filtro de proyectos y las tarjetas de la Biblioteca
   */
  function renderLibraryGrid() {
    var grid = document.getElementById('pv-library-grid');
    var countEl = document.getElementById('pv-library-count');
    var projFilterSel = document.getElementById('pv-filter-project');
    if (!grid) return;

    var list = (remoteState && Array.isArray(remoteState.playlist))
      ? remoteState.playlist
      : DEFAULT_LIBRARY;

    // Poblar dinámicamente el filtro de Proyectos según los videos cargados
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

    // Filtrar videos por Grado, Proyecto y Búsqueda
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
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:32px;background:#FAF6EC;border:1.5px dashed #2B2520;color:#57534E;">' +
        '<i class="fas fa-video-slash" style="font-size:2rem;margin-bottom:8px;display:block;"></i>' +
        'No hay videos en la biblioteca para este filtro. Podés dar de alta uno arriba.' +
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
          '<span class="pv-vc-type-tag">' + (parsed.type === 'mp4' ? 'MP4 / DIRECTO' : 'YOUTUBE') + '</span>' +
          (isOnAir ? '<span class="pv-vc-onair-tag">● EN PANTALLA AHORA</span>' : '') +
        '</div>' +
        '<div class="pv-vc-body">' +
          '<div>' +
            '<div class="pv-vc-chips">' +
              '<span class="pv-badge grade"><i class="fas fa-graduation-cap"></i> ' + esc(formatGradesText(item.grades)) + '</span>' +
              (item.project ? '<span class="pv-badge project"><i class="fas fa-rocket"></i> ' + esc(item.project) + '</span>' : '') +
            '</div>' +
            '<h3 class="pv-vc-title">' + esc(item.title) + '</h3>' +
            '<p class="pv-vc-sub">' + esc(item.subtitle || '') + '</p>' +
          '</div>' +
          '<div class="pv-vc-actions">' +
            '<button type="button" class="pv-vc-btn-project" data-action="project" data-id="' + esc(item.id) + '">' +
              '<i class="fas ' + (isOnAir ? 'fa-broadcast-tower' : 'fa-play') + '"></i> ' +
              (isOnAir ? 'En Pantalla (Reiniciar)' : 'Proyectar en Clase') +
            '</button>' +
            '<button type="button" class="pv-vc-btn-icon" data-action="edit" data-id="' + esc(item.id) + '" title="Editar grado, proyecto o título">' +
              '<i class="fas fa-pen"></i>' +
            '</button>' +
            '<button type="button" class="pv-vc-btn-icon del" data-action="delete" data-id="' + esc(item.id) + '" title="Dar de baja / Eliminar de la biblioteca">' +
              '<i class="fas fa-trash-alt"></i>' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</article>';
    }).join('');

    // Eventos de cada tarjeta
    grid.querySelectorAll('[data-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var action = btn.getAttribute('data-action');
        var id = btn.getAttribute('data-id');
        var fullList = (remoteState && Array.isArray(remoteState.playlist)) ? remoteState.playlist.slice() : DEFAULT_LIBRARY.slice();
        var item = fullList.find(function (x) { return x.id === id; });
        if (!item) return;

        if (action === 'project') {
          var parsed = parseVideoUrl(item.url);
          if (!parsed) return;
          suppressLocalEventsUntil = Date.now() + 1400;
          loadMediaSource(parsed.type, parsed.url, parsed.youtubeId, 0, true);
          pushState({
            videoUrl: parsed.url,
            videoType: parsed.type,
            youtubeId: parsed.youtubeId || '',
            title: item.title,
            subtitle: item.subtitle || ('Proyecto: ' + (item.project || 'Clase')),
            project: item.project || '',
            grades: item.grades || ['todos'],
            baseTime: 0,
            isPlaying: true,
            sessionActive: true
          }, true);
          showToast('📡 Proyectando «' + item.title + '» en todas las máquinas');
        } else if (action === 'edit') {
          loadVideoIntoFormForEdit(item);
        } else if (action === 'delete') {
          if (confirm('¿Querés dar de baja el video «' + item.title + '» de tu biblioteca?')) {
            var nextList = fullList.filter(function (x) { return x.id !== id; });
            pushState({ playlist: nextList }, false);
            showToast('🗑️ Video dado de baja de la biblioteca');
          }
        }
      });
    });
  }

  /**
   * ─────────────────────────────────────────────────────────────
   * REPRODUCTOR MONITOR DEL PROFESOR (YOUTUBE + MP4)
   * ─────────────────────────────────────────────────────────────
   */
  function setupHtml5MonitorEvents() {
    if (!html5Video) return;

    html5Video.addEventListener('play', function () {
      if (currentMediaType !== 'mp4') return;
      if (!isApplyingRemote && Date.now() > suppressLocalEventsUntil) {
        pushState({
          isPlaying: true,
          baseTime: html5Video.currentTime || 0,
          sessionActive: true
        }, true);
      }
      updateMonitorTimeUi();
    });

    html5Video.addEventListener('pause', function () {
      if (currentMediaType !== 'mp4') return;
      if (!isApplyingRemote && Date.now() > suppressLocalEventsUntil) {
        pushState({
          isPlaying: false,
          baseTime: html5Video.currentTime || 0,
          sessionActive: true
        }, true);
      }
      updateMonitorTimeUi();
    });

    html5Video.addEventListener('seeked', function () {
      if (currentMediaType !== 'mp4') return;
      if (!isApplyingRemote && Date.now() > suppressLocalEventsUntil) {
        pushState({
          baseTime: html5Video.currentTime || 0,
          sessionActive: true
        }, true);
      }
      updateMonitorTimeUi();
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
          if (remoteState) {
            loadMediaSource(remoteState.videoType, remoteState.videoUrl, remoteState.youtubeId, remoteState.baseTime, false);
          }
        },
        onStateChange: function (event) {
          if (currentMediaType !== 'youtube' || !window.YT) return;
          var YTState = window.YT.PlayerState;
          if (!isApplyingRemote && Date.now() > suppressLocalEventsUntil) {
            if (event.data === YTState.PLAYING) {
              pushState({
                isPlaying: true,
                baseTime: getMediaCurrentTime(),
                sessionActive: true
              }, true);
            } else if (event.data === YTState.PAUSED) {
              pushState({
                isPlaying: false,
                baseTime: getMediaCurrentTime(),
                sessionActive: true
              }, true);
            }
          }
          updateMonitorTimeUi();
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
          if (shouldPlay) {
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
          if (shouldPlay) {
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
    } else if (ytPlayer && ytPlayerReady && typeof ytPlayer.setPlaybackRate === 'function') {
      try { ytPlayer.setPlaybackRate(rate); } catch (e) {}
    }
  }

  /**
   * ─────────────────────────────────────────────────────────────
   * FIREBASE FIRESTORE CONEXIÓN Y ENVÍO DE ESTADO
   * ─────────────────────────────────────────────────────────────
   */
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
        renderConsoleStatus(remoteState);
        renderLibraryGrid();
        loadMediaSource(remoteState.videoType, remoteState.videoUrl, remoteState.youtubeId, 0, false);
        return;
      }

      var data = doc.data() || {};
      if (!Array.isArray(data.playlist) || !data.playlist.length) {
        data.playlist = DEFAULT_LIBRARY;
      }
      var merged = Object.assign({}, DEFAULT_STATE, data);
      var firstLoad = !remoteState;
      remoteState = merged;

      renderConsoleStatus(merged);
      renderLibraryGrid();

      if (firstLoad) {
        loadMediaSource(merged.videoType, merged.videoUrl, merged.youtubeId, merged.baseTime || 0, false);
      }
    });
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
      livePill.classList.toggle('is-playing', !!state.isPlaying);
      liveTxt.textContent = state.isPlaying ? 'EN VIVO · REPRODUCIENDO' : 'EN PAUSA';
    }

    var npGrade = document.getElementById('pv-np-grade');
    var npProject = document.getElementById('pv-np-project');
    var npTitle = document.getElementById('pv-np-title');
    var npSub = document.getElementById('pv-np-sub');

    if (npGrade) npGrade.innerHTML = '<i class="fas fa-graduation-cap"></i> ' + esc(formatGradesText(state.grades));
    if (npProject) npProject.innerHTML = '<i class="fas fa-rocket"></i> ' + esc(state.project || 'Proyecto de Clase');
    if (npTitle) npTitle.textContent = state.title || 'Sin título';
    if (npSub) npSub.textContent = state.subtitle || '';

    var playBtn = document.getElementById('pv-btn-playpause');
    var playIcon = document.getElementById('pv-playpause-icon');
    var playTxt = document.getElementById('pv-playpause-txt');
    if (playBtn && playIcon && playTxt) {
      playBtn.classList.toggle('is-playing', !!state.isPlaying);
      playIcon.className = state.isPlaying ? 'fas fa-pause' : 'fas fa-play';
      playTxt.textContent = state.isPlaying
        ? 'PAUSAR EN TODAS LAS MÁQUINAS'
        : 'REPRODUCIR EN TODAS LAS MÁQUINAS';
    }

    var locked = state.lockedByTeacher !== false;
    var lockBox = document.getElementById('pv-lock-box');
    var lockTitle = document.getElementById('pv-lock-title');
    var lockDesc = document.getElementById('pv-lock-desc');
    var lockBtn = document.getElementById('pv-btn-toggle-lock');
    if (lockBox && lockTitle && lockDesc && lockBtn) {
      lockBox.classList.toggle('locked', locked);
      lockBtn.classList.toggle('is-locked', locked);
      if (locked) {
        lockTitle.innerHTML = '<i class="fas fa-lock"></i> Bloqueado: El Profesor tiene el control';
        lockDesc.textContent = 'Los alumnos no pueden pausar ni adelantar. Todas las máquinas siguen tu Play y Pausa.';
        lockBtn.textContent = '🔓 Liberar Control a las Máquinas';
      } else {
        lockTitle.innerHTML = '<i class="fas fa-unlock"></i> Libre: Las máquinas tienen control propio';
        lockDesc.textContent = 'Cada alumno puede pausar o retroceder en su máquina hasta que vuelvas a bloquear o toques Play/Pausa.';
        lockBtn.textContent = '🔒 Bloquear con Control del Profesor';
      }
    }

    var audioTitle = document.getElementById('pv-audio-title');
    var audioDesc = document.getElementById('pv-audio-desc');
    var audioBtn = document.getElementById('pv-btn-toggle-audio');
    if (audioTitle && audioDesc && audioBtn) {
      if (state.muteStudents) {
        audioTitle.innerHTML = '<i class="fas fa-volume-mute"></i> Alumnos Silenciados (Solo Audio en tu PC)';
        audioDesc.textContent = 'Las máquinas de los alumnos están en silencio.';
        audioBtn.textContent = '🔊 Habilitar Sonido en Todas las Máquinas';
      } else {
        audioTitle.innerHTML = '<i class="fas fa-volume-up"></i> Sonido Activo en Todas las Máquinas';
        audioDesc.textContent = 'Todas las computadoras reproducen con sonido al mismo tiempo.';
        audioBtn.textContent = '🔇 Silenciar PCs de Alumnos';
      }
    }
  }

  function startTimers() {
    if (uiTimer) clearInterval(uiTimer);
    uiTimer = setInterval(updateMonitorTimeUi, 500);

    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = setInterval(function () {
      if (isMediaPlaying()) {
        pushState({
          isPlaying: true,
          baseTime: getMediaCurrentTime(),
          duration: getMediaDuration()
        }, false);
      }
    }, 4000);
  }

  function updateMonitorTimeUi() {
    var cur = getMediaCurrentTime();
    var dur = getMediaDuration() || (remoteState && remoteState.duration) || 0;

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
