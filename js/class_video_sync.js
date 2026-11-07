/**
 * =============================================================
 * CLASS_VIDEO_SYNC.JS — SALA DE VIDEO SINCRONIZADA EN VIVO (VISTA ALUMNOS)
 * Colegio Paulo Freire · Taller de Robótica, Programación & Cultura Maker
 * =============================================================
 * Reproductor sincronizado en tiempo real para las computadoras del salón.
 * Recibe las órdenes de reproducción, pausa, tiempo, bloqueo/control libre,
 * proyecto y grado desde la consola oculta del profesor (profesor-videos.html)
 * a través de Firebase Firestore, sin mostrar controles de administración a los alumnos.
 */

(function () {
  'use strict';

  var DOC_COLLECTION = 'config';
  var DOC_ID = 'classroom_video_sync';

  // Estado local del alumno
  var hasJoinedAudio = false;
  var activeSubTab = 'expedientes'; // 'expedientes' | 'video'
  var remoteState = null;
  var lastAppliedSyncSeq = -1;
  var lastSeenCallSeq = -1;
  var isApplyingRemoteUpdate = false;

  // Instancias de reproductores
  var currentMediaType = null; // 'youtube' | 'mp4'
  var currentMediaIdOrUrl = '';
  var ytPlayer = null;
  var ytApiReady = false;
  var ytPlayerReady = false;
  var html5Video = null;
  var uiProgressTimer = null;

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
    sessionActive: false,
    callStudentsSeq: 0,
    syncSeq: 1,
    updatedAtMs: Date.now()
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

  function initClassVideoRoom() {
    var container = document.getElementById('clase-video-room-container');
    if (!container) return;

    renderStudentRoomSkeleton(container);
    bindStudentEvents();
    loadYouTubeApiIfNeeded();
    connectFirestoreListener();
    startUiTimers();

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

    if (activeSubTab === 'video' && remoteState) {
      setTimeout(function () {
        applyRemoteStateToPlayer(remoteState, true);
      }, 150);
    }
  }
  window.switchClaseSubTab = switchClaseSubTab;

  /**
   * Renderiza la Sala de Video limpia para los alumnos (sin botones ni enlaces de administrador)
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

            /* Cartel flotante de Pausa del Profesor */
            '<div class="cvs-paused-badge" id="cvs-paused-badge" style="display:none;">' +
              '<i class="fas fa-pause-circle"></i> <span>VIDEO EN PAUSA POR EL PROFESOR</span>' +
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
              /* Controles locales para el alumno (solo visibles cuando el profe libera el control) */
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

    // Bloquear barra espaciadora / flechas cuando el control lo tiene el profesor
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
    } else if (remoteState && remoteState.muteStudents) {
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
        return;
      }

      var data = doc.data() || {};
      var merged = Object.assign({}, DEFAULT_STATE, data);
      var prevSeq = lastAppliedSyncSeq;
      var isExplicitTeacherCommand = (merged.syncSeq !== prevSeq);

      // Si el profesor tocó "Traer Máquinas a la Sala de Video", abrir la pestaña automáticamente
      if (lastSeenCallSeq !== -1 && merged.callStudentsSeq && merged.callStudentsSeq > lastSeenCallSeq) {
        switchClaseSubTab('video');
      }
      lastSeenCallSeq = merged.callStudentsSeq || 0;

      remoteState = merged;
      renderStateMetadata(merged);
      applyRemoteStateToPlayer(merged, isExplicitTeacherCommand);

      lastAppliedSyncSeq = merged.syncSeq;
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

    if (sourceChanged) {
      loadMediaSource(vType, vUrl, ytId, targetTime, state.isPlaying);
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

      if (state.isPlaying) {
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

    // Etiquetas de Grado y Proyecto
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
      livePill.classList.toggle('is-playing', !!state.isPlaying);
      livePillText.textContent = state.isPlaying ? 'EN VIVO · REPRODUCIENDO' : 'SALA EN PAUSA';
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
      pausedBadge.style.display = (!state.isPlaying && locked && hasJoinedAudio) ? 'flex' : 'none';
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
          stuLockedText.textContent = state.isPlaying
            ? '🔒 Reproduciendo en sincronía con el Profesor'
            : '⏸️ En pausa por el Profesor (esperando orden de Play)';
        }
      }
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
    if (remoteState.isPlaying && !playingLocal) {
      playMedia();
    } else if (!remoteState.isPlaying && playingLocal) {
      pauseMedia();
      seekMediaTo(remoteState.baseTime || 0);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initClassVideoRoom);
  } else {
    initClassVideoRoom();
  }
})();
