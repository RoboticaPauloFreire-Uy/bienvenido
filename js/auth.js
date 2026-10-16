/**
 * =============================================================
 * AUTH.JS — LOGIN CLÁSICO, TOGGLE DE MENÚ Y SESIÓN DE ALUMNO
 * =============================================================
 */

(function () {
  var STORAGE_KEY = 'pf_active_student_id';

  function getActiveStudent() {
    try {
      var cached = localStorage.getItem('pf_active_student_data');
      if (cached) {
        var parsed = JSON.parse(cached);
        if (parsed && parsed.id) return parsed;
      }
      var id = localStorage.getItem(STORAGE_KEY);
      if (!id) return null;
      if (window.getStudentById) return window.getStudentById(id);
      return null;
    } catch(e) {
      return null;
    }
  }

  function setActiveStudent(studentDataOrId) {
    if (studentDataOrId) {
      if (typeof studentDataOrId === 'object' && studentDataOrId.id) {
        localStorage.setItem(STORAGE_KEY, studentDataOrId.id);
        localStorage.setItem('pf_active_student_data', JSON.stringify(studentDataOrId));
      } else {
        localStorage.setItem(STORAGE_KEY, studentDataOrId);
      }
    } else {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('pf_active_student_data');
    }
    updateUI();
    window.dispatchEvent(new CustomEvent('student_session_changed', { detail: getActiveStudent() }));
  }

  function logoutStudent() {
    if (window.sounds) window.sounds.playClick();
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('pf_active_student_data');
    closeLoginModal();
    window.location.reload();
  }

  function updateUI() {
    var student = getActiveStudent();
    var btn = document.getElementById('student-login-btn');
    var aulasEl = document.getElementById('nav-dropdown-aulas');
    var driveLinks = document.querySelectorAll('.nav-drive-link');
    var storiesSec = document.querySelector('.stories-section');
    var classroomsHdr = document.querySelector('.home-section-header');
    var classroomsGrid = document.getElementById('classrooms-grid');

    if (student) {
      // === LOGUEADO ===
      document.body.classList.add('student-logged-in');

      // Ocultar Aulas
      if (aulasEl) aulasEl.style.display = 'none';
      if (storiesSec) storiesSec.style.display = 'none';
      if (classroomsHdr) classroomsHdr.style.display = 'none';
      if (classroomsGrid) classroomsGrid.style.display = 'none';

      // Ocultar Mi Carpeta Drive en la barra superior
      driveLinks.forEach(function(el) { el.style.display = 'none'; });

      // Botón muestra avatar + nombre
      if (btn) {
        btn.className = 'topbar-student-pill logged-in';
        btn.innerHTML =
          '<span class="sp-avatar">' + (student.avatar || '👦') + '</span>' +
          '<div class="sp-info">' +
            '<span class="sp-name">' + student.name + '</span>' +
            '<span class="sp-grade">' + student.gradeName + '</span>' +
          '</div>' +
          '<i class="fas fa-chevron-down sp-chevron"></i>';
      }

      // Renderizar panel Drive
      if (window.renderGDriveDashboard) {
        window.renderGDriveDashboard('student-drive-dashboard-container');
        window.renderGDriveDashboard('gdrive-explorer-container');
      }

      // Sincronizar pestaña de grado en Actividades
      if (typeof window.selectActividadGrade === 'function' && student.gradeId) {
        window.selectActividadGrade(student.gradeId);
      }

    } else {
      // === NO LOGUEADO ===
      document.body.classList.remove('student-logged-in');

      // Ocultar toda relación con Aulas cuando no está logueado
      if (aulasEl) aulasEl.style.display = 'none';
      if (storiesSec) storiesSec.style.display = 'none';
      if (classroomsHdr) classroomsHdr.style.display = 'none';
      if (classroomsGrid) classroomsGrid.style.display = 'none';

      // Ocultar Mi Carpeta Drive
      driveLinks.forEach(function(el) { el.style.display = 'none'; });

      // Botón muestra Ingreso Alumnos
      if (btn) {
        btn.className = 'topbar-student-pill logged-out';
        btn.innerHTML =
          '<i class="fas fa-user-circle"></i>' +
          '<span>Ingreso Alumnos</span>';
      }

      // Limpiar contenedor Drive
      var dc = document.getElementById('student-drive-dashboard-container');
      if (dc) dc.innerHTML = '';

      // Resetear indicador de grado en Actividades
      if (typeof window.selectActividadGrade === 'function') {
        window.selectActividadGrade('sala5');
      }
    }
  }

  // === MODAL DE LOGIN / CREDENCIAL PIRATA ===
  function getPirateBrassCornerSvg(pos) {
    return '<div class="pmf-brass-corner ' + pos + '" aria-hidden="true">' +
      '<svg viewBox="0 0 64 64" fill="none">' +
        '<path d="M2 2 H58 L46 14 H18 V46 L6 58 V2 Z" fill="url(#pmfGoldGrad)" stroke="#3e2005" stroke-width="2"/>' +
        '<path d="M14 14 H36 L28 22 H22 V28 L14 36 V14 Z" fill="#5c3109" opacity="0.65"/>' +
        '<circle cx="10" cy="10" r="3.5" fill="#fff3b0" stroke="#4a2605" stroke-width="1.5"/>' +
        '<circle cx="38" cy="8" r="2.8" fill="#d97706" stroke="#4a2605" stroke-width="1.2"/>' +
        '<circle cx="8" cy="38" r="2.8" fill="#d97706" stroke="#4a2605" stroke-width="1.2"/>' +
        '<defs>' +
          '<linearGradient id="pmfGoldGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">' +
            '<stop offset="0%" stop-color="#fef08a"/>' +
            '<stop offset="35%" stop-color="#f59e0b"/>' +
            '<stop offset="70%" stop-color="#b45309"/>' +
            '<stop offset="100%" stop-color="#fde047"/>' +
          '</linearGradient>' +
        '</defs>' +
      '</svg>' +
    '</div>';
  }

  function openLoginModal() {
    if (window.sounds) window.sounds.playClick();
    var modal = document.getElementById('student-login-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'student-login-modal';
      modal.className = 'student-login-modal';
      modal.innerHTML =
        '<div class="slm-content pirate-modal-frame">' +
          getPirateBrassCornerSvg('top-left') +
          getPirateBrassCornerSvg('top-right') +
          getPirateBrassCornerSvg('bottom-left') +
          getPirateBrassCornerSvg('bottom-right') +
          '<div class="slm-header">' +
            '<div class="slm-header-left">' +
              '<span class="slm-pirate-kicker" id="slm-modal-kicker">⚓ Cofradía Pirata · Taller STEAM</span>' +
              '<div class="slm-title" id="slm-modal-title"><i class="fas fa-skull-crossbones"></i> Registro de Tripulantes</div>' +
            '</div>' +
            '<button class="slm-close" id="slm-close-btn" type="button" title="Cerrar">&times;</button>' +
          '</div>' +
          '<div class="slm-body" id="slm-body"></div>' +
        '</div>';
      document.body.appendChild(modal);
      document.getElementById('slm-close-btn').onclick = closeLoginModal;
      modal.onclick = function(e) { if (e.target === modal) closeLoginModal(); };
    }
    renderModalContent();
    modal.classList.add('active');
    setTimeout(function() {
      var inp = document.getElementById('clf-user');
      if (inp) inp.focus();
    }, 120);
  }

  function closeLoginModal() {
    var modal = document.getElementById('student-login-modal');
    if (modal) modal.classList.remove('active');
  }

  function renderModalContent() {
    var body   = document.getElementById('slm-body');
    var title  = document.getElementById('slm-modal-title');
    var kicker = document.getElementById('slm-modal-kicker');
    if (!body) return;

    var student = getActiveStudent();

    if (student) {
      // CREDENCIAL PIRATA DEL ALUMNO ACTIVO
      var firstName = student.name.split(' ')[0];
      if (kicker) kicker.innerHTML = '🏴‍☠️ Credencial Oficial de la Flota';
      if (title) title.innerHTML = '<i class="fas fa-compass"></i> Bitácora de ' + firstName;

      var missions = (typeof window.getAdventureMissionsForStudent === 'function')
        ? window.getAdventureMissionsForStudent(student)
        : [];
      var completedCount = missions.filter(function(m) { return m.status === 'completado'; }).length;
      var totalMissions = missions.length || 10;
      var progressPercent = Math.min(100, Math.round((completedCount / totalMissions) * 100));
      var studentLevel = Math.max(1, Math.floor(completedCount / 2) + 1);
      var pirateRank = studentLevel >= 5 ? 'Capitán Corsario' : (studentLevel >= 3 ? 'Timonel Maker' : 'Grumete Explorador');
      var totalDoblones = completedCount * 100;
      var nextMission = missions.find(function(m) { return m.status !== 'completado'; }) || missions[missions.length - 1] || { level: 1, title: 'Isla del Desembarco' };

      var gId = (student.gradeId || '').toLowerCase();
      var specialty = '🧭 Explorador de Algoritmos & Scratch Jr';
      if (gId === 'grado3' || gId === 'grado4') {
        specialty = '⚡ Artillero de Bloques & Micro:bit';
      } else if (gId === 'grado5' || gId === 'grado6') {
        specialty = '⚙️ Ingeniero Corsario de Robótica & IA';
      }

      body.innerHTML =
        '<div class="slm-active-profile pirate-crew-card">' +
          '<div class="pcc-top-banner">' +
            '<div class="pcc-avatar-medallion">' +
              '<span class="pcc-avatar-emoji">' + (student.avatar || '🏴‍☠️') + '</span>' +
              '<span class="pcc-level-pill">NVL ' + studentLevel + '</span>' +
            '</div>' +
            '<div class="pcc-identity">' +
              '<span class="pcc-rank-badge">☠️ ' + pirateRank + '</span>' +
              '<h3 class="slm-student-name">' + student.name + '</h3>' +
              '<div class="pcc-ship-row">' +
                '<span class="slm-student-grade">⚓ Navío ' + (student.gradeName || '') + '</span>' +
                '<span class="pcc-specialty-tag">' + specialty + '</span>' +
              '</div>' +
            '</div>' +
          '</div>' +

          '<div class="pcc-stats-scroll">' +
            '<div class="pcc-scroll-title"><i class="fas fa-scroll"></i> Hoja de Servicio en Alta Mar</div>' +
            '<div class="pcc-stats-grid">' +
              '<div class="pcc-stat-box">' +
                '<span class="pcc-stat-icon">🪙</span>' +
                '<div class="pcc-stat-info">' +
                  '<span class="pcc-stat-label">Botín Acumulado</span>' +
                  '<strong class="pcc-stat-value">+' + totalDoblones + ' Doblones</strong>' +
                '</div>' +
              '</div>' +
              '<div class="pcc-stat-box">' +
                '<span class="pcc-stat-icon">🏝️</span>' +
                '<div class="pcc-stat-info">' +
                  '<span class="pcc-stat-label">Islas Conquistadas</span>' +
                  '<strong class="pcc-stat-value">' + completedCount + ' de ' + totalMissions + ' Islas</strong>' +
                '</div>' +
              '</div>' +
              '<div class="pcc-stat-box">' +
                '<span class="pcc-stat-icon">⚔️</span>' +
                '<div class="pcc-stat-info">' +
                  '<span class="pcc-stat-label">Rango en la Flota</span>' +
                  '<strong class="pcc-stat-value">' + pirateRank + '</strong>' +
                '</div>' +
              '</div>' +
              '<div class="pcc-stat-box">' +
                '<span class="pcc-stat-icon">🧭</span>' +
                '<div class="pcc-stat-info">' +
                  '<span class="pcc-stat-label">Rumbo Actual</span>' +
                  '<strong class="pcc-stat-value">Isla ' + (nextMission.level || 1) + ': ' + (nextMission.title || 'En altamar') + '</strong>' +
                '</div>' +
              '</div>' +
            '</div>' +

            '<div class="pcc-progress-section">' +
              '<div class="pcc-progress-header">' +
                '<span>🗺️ Travesía del Mapa Pirata</span>' +
                '<strong>' + progressPercent + '% Completado</strong>' +
              '</div>' +
              '<div class="pcc-progress-track">' +
                '<div class="pcc-progress-fill" style="width:' + progressPercent + '%"></div>' +
              '</div>' +
            '</div>' +
          '</div>' +

          '<div class="slm-actions pcc-actions">' +
            '<button class="pcc-btn-adventure" id="slm-go-adventure" type="button">' +
              '<i class="fas fa-map-marked-alt"></i> Ir a mi Bitácora' +
            '</button>' +
            '<button class="slm-btn-logout pcc-btn-logout" id="slm-logout-action" type="button">' +
              '<i class="fas fa-anchor"></i> Abandonar el Barco' +
            '</button>' +
          '</div>' +
        '</div>';

      document.getElementById('slm-logout-action').onclick = logoutStudent;
      var goAdvBtn = document.getElementById('slm-go-adventure');
      if (goAdvBtn) {
        goAdvBtn.onclick = function() {
          closeLoginModal();
          var dash = document.getElementById('student-drive-dashboard-container') || document.getElementById('actividades');
          if (dash) dash.scrollIntoView({ behavior: 'smooth', block: 'start' });
        };
      }

    } else {
      // FORMULARIO DE LOGIN
      if (kicker) kicker.innerHTML = '⚓ Cofradía Pirata · Taller STEAM';
      if (title) title.innerHTML = '<i class="fas fa-skull-crossbones"></i> Abordaje de Tripulantes';
      body.innerHTML =
        '<form id="classic-login-form" class="classic-login-form">' +
          '<p class="clf-intro">Ingresá tu nombre de tripulante y clave secreta para subir a bordo:</p>' +
          '<div class="clf-error-alert hidden" id="clf-error-alert">' +
            '<i class="fas fa-exclamation-circle"></i>' +
            '<span>Usuario o contraseña incorrectos.</span>' +
          '</div>' +
          '<div class="clf-field">' +
            '<label for="clf-user"><i class="fas fa-user"></i> Usuario:</label>' +
            '<input type="text" id="clf-user" placeholder="Ej: agustin" required autocomplete="username">' +
          '</div>' +
          '<div class="clf-field">' +
            '<label for="clf-pass"><i class="fas fa-lock"></i> Contraseña:</label>' +
            '<input type="password" id="clf-pass" placeholder="Tu contraseña" required autocomplete="current-password">' +
          '</div>' +
          '<div class="clf-demo-hint">' +
            '<i class="fas fa-key"></i> <strong>Usuario:</strong> <code>agustin</code> | <strong>Clave:</strong> <code>5anos</code>' +
          '</div>' +
          '<button type="submit" class="clf-submit-btn">' +
            '<span>Iniciar Sesión</span>' +
            '<i class="fas fa-sign-in-alt"></i>' +
          '</button>' +
        '</form>';

      var form  = document.getElementById('classic-login-form');
      var error = document.getElementById('clf-error-alert');

      form.onsubmit = async function(e) {
        e.preventDefault();
        var submitBtn = form.querySelector('.clf-submit-btn');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span>Verificando...</span> <i class="fas fa-spinner fa-spin"></i>';
        }
        var u = document.getElementById('clf-user').value;
        var p = document.getElementById('clf-pass').value;

        try {
          var matches = [];
          if (typeof window.authenticateStudentAsync === 'function') {
            matches = await window.authenticateStudentAsync(u, p);
          } else if (window.findMatchingStudents) {
            matches = window.findMatchingStudents(u, p);
          }
          if (matches.length === 0 && window.authenticateStudent) {
            var single = window.authenticateStudent(u, p);
            if (single) matches = [single];
          }

          if (matches.length === 1) {
            error.classList.add('hidden');
            setActiveStudent(matches[0]);
            closeLoginModal();
            if (window.sounds) window.sounds.playSuccess();
          } else if (matches.length > 1) {
            error.classList.add('hidden');
            showStudentPicker(matches);
          } else {
            error.classList.remove('hidden');
            if (window.sounds) window.sounds.playError();
          }
        } catch (err) {
          console.error("Error en login:", err);
          error.classList.remove('hidden');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>Iniciar Sesión</span> <i class="fas fa-sign-in-alt"></i>';
          }
        }
      };

      function showStudentPicker(studentList) {
        if (title) title.innerHTML = '<i class="fas fa-users"></i> ¿Cuál de ellos sos vos?';
        body.innerHTML =
          '<div class="slm-picker-container">' +
            '<p class="clf-intro">Encontramos varios alumnos con ese nombre en tu grado. Hacé click en tu nombre:</p>' +
            '<div class="slm-picker-list">' +
              studentList.map(function(st) {
                return '<button type="button" class="slm-picker-card" data-student-id="' + st.id + '">' +
                  '<span class="spc-avatar">' + (st.avatar || '👦') + '</span>' +
                  '<div class="spc-info">' +
                    '<strong class="spc-name">' + st.name + '</strong>' +
                    '<span class="spc-grade">' + st.gradeName + '</span>' +
                  '</div>' +
                  '<i class="fas fa-arrow-right spc-arrow"></i>' +
                '</button>';
              }).join('') +
            '</div>' +
            '<button type="button" class="slm-picker-back-btn" id="slm-picker-back">' +
              '<i class="fas fa-arrow-left"></i> Volver a escribir' +
            '</button>' +
          '</div>';

        body.querySelectorAll('.slm-picker-card').forEach(function(cardBtn) {
          cardBtn.onclick = function() {
            var stId = cardBtn.getAttribute('data-student-id');
            var selectedStudent = studentList.find(function(s) { return s.id === stId; });
            setActiveStudent(selectedStudent || stId);
            closeLoginModal();
            if (window.sounds) window.sounds.playSuccess();
          };
        });

        var backBtn = document.getElementById('slm-picker-back');
        if (backBtn) {
          backBtn.onclick = renderModalContent;
        }
      }
    }
  }

  // === INICIALIZACIÓN ===
  function initAuth() {
    updateUI();
    var btn = document.getElementById('student-login-btn');
    if (btn) btn.onclick = openLoginModal;

    // Si la URL contenía parámetros de login residuales, limpiarlos sin recargar para no dejar la URL sucia
    try {
      var params = new URLSearchParams(window.location.search);
      if (params.has('login')) {
        params.delete('login');
        var cleanSearch = params.toString() ? '?' + params.toString() : '';
        var cleanUrl = window.location.pathname + cleanSearch + window.location.hash;
        if (window.history && window.history.replaceState) {
          window.history.replaceState(null, '', cleanUrl);
        }
      }
    } catch (e) {}
  }

  // Ejecutar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth);
  } else {
    initAuth();
  }

  // Exportar a window
  window.getActiveStudent = getActiveStudent;
  window.setActiveStudent = setActiveStudent;
  window.logoutStudent    = logoutStudent;
  window.openLoginModal   = openLoginModal;
  window.updateAuthUI     = updateUI;
})();
