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

  // === TEMA POR GRUPO DE GRADOS ===
  function getStudentThemeGroup(student) {
    if (!student) return 'pirate';
    var gId = (student.gradeId || '').toLowerCase();
    var gName = (student.gradeName || '').toLowerCase();
    // Grupo 4: 6.° Grado (Egresados & Anuario Legendario)
    if (gId === 'grado6' || gId === '6to' || /6\s*°|6to|sexto/i.test(gName)) {
      return 'legacy';
    }
    // Grupo 3: 4.° y 5.° Grado (Cyberpunk / Robots & IA)
    if (gId === 'grado4' || gId === '4to' || gId === 'grado5' || gId === '5to' ||
        /4\s*°|4to|cuarto|5\s*°|5to|quinto/i.test(gName)) {
      return 'cyber';
    }
    // Grupo 2: 2.° y 3.° Grado (Astronautas & Espacio)
    if (gId === 'grado2' || gId === '2do' || gId === 'grado3' || gId === '3ero' ||
        /2\s*°|2do|segundo|3\s*°|3ero|tercer/i.test(gName)) {
      return 'space';
    }
    // Grupo 1: Sala de 5 y 1.° Grado (Piratas)
    return 'pirate';
  }
  window.getStudentThemeGroup = getStudentThemeGroup;

  // === MODAL DE LOGIN / CREDENCIAL PIRATA, ESPACIAL & CYBER ===
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
        '<div class="slm-content pirate-modal-frame" id="slm-content-frame">' +
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
    var form = document.getElementById('classic-login-form');
    if (form && typeof form._cleanupVaultKeydown === 'function') {
      form._cleanupVaultKeydown();
    }
  }

  function renderModalContent() {
    var body   = document.getElementById('slm-body');
    var title  = document.getElementById('slm-modal-title');
    var kicker = document.getElementById('slm-modal-kicker');
    var frame  = document.getElementById('slm-content-frame') || (body && body.closest('.slm-content'));
    if (!body) return;

    var student = getActiveStudent();

    if (student) {
      var themeGroup = getStudentThemeGroup(student);
      var isLegacy = (themeGroup === 'legacy');
      var isCyber = (themeGroup === 'cyber');
      var isSpace = (themeGroup === 'space');
      if (frame) {
        frame.classList.toggle('theme-legacy', isLegacy);
        frame.classList.toggle('theme-cyber', isCyber);
        frame.classList.toggle('theme-space', isSpace);
      }

      var firstName = student.name.split(' ')[0];
      var missions = (typeof window.getAdventureMissionsForStudent === 'function')
        ? window.getAdventureMissionsForStudent(student)
        : [];
      var completedCount = missions.filter(function(m) { return m.status === 'completado'; }).length;
      var totalMissions = missions.length || 10;
      var progressPercent = Math.min(100, Math.round((completedCount / totalMissions) * 100));
      var studentLevel = Math.max(1, Math.floor(completedCount / 2) + 1);
      var totalPoints = completedCount * 100;
      var defaultMissionTitle = isLegacy
        ? 'Cápsula del Tiempo & Diploma'
        : (isCyber ? 'Nodo Central Alfa' : (isSpace ? 'Estación Orbital Alfa' : 'Isla del Desembarco'));
      var nextMission = missions.find(function(m) { return m.status !== 'completado'; }) || missions[missions.length - 1] || { level: 1, title: defaultMissionTitle };
      var gId = (student.gradeId || '').toLowerCase();

      if (isLegacy) {
        // ═══ GRUPO 4 (6° GRADO): ANUARIO Y LIBRO DE RECUERDOS LEGENDARIO DE EGRESADOS ═══
        if (kicker) kicker.innerHTML = '🎓 Anuario de Egresados · Generación Maker Paulo Freire';
        if (title) title.innerHTML = '<i class="fas fa-graduation-cap"></i> Libro de Honor de ' + firstName;

        var legacyRank = studentLevel >= 5 ? 'Leyenda Graduada Maker 🎓🏆' : (studentLevel >= 3 ? 'Maestro Egresado de Honor' : 'Pionero de 6.° Grado');
        var legacySpecialty = '🎓 Proyecto Cumbre: Robótica Avanzada, Servomotores & Gemini IA';

        body.innerHTML =
          '<div class="slm-active-profile pirate-crew-card legacy-crew-card">' +
            '<div class="pcc-top-banner">' +
              '<div class="pcc-avatar-medallion">' +
                '<span class="pcc-avatar-emoji">' + (student.avatar || '🎓') + '</span>' +
                '<span class="pcc-level-pill">NVL ' + studentLevel + '</span>' +
              '</div>' +
              '<div class="pcc-identity">' +
                '<span class="pcc-rank-badge">👑 ' + legacyRank + '</span>' +
                '<h3 class="slm-student-name">' + student.name + '</h3>' +
                '<div class="pcc-ship-row">' +
                  '<span class="slm-student-grade">📜 Promoción ' + (student.gradeName || '6.° Grado') + '</span>' +
                  '<span class="pcc-specialty-tag">' + legacySpecialty + '</span>' +
                '</div>' +
              '</div>' +
            '</div>' +

            '<div class="pcc-stats-scroll">' +
              '<div class="pcc-scroll-title"><i class="fas fa-award"></i> Registro Histórico del Egresado</div>' +
              '<div class="pcc-stats-grid">' +
                '<div class="pcc-stat-box">' +
                  '<span class="pcc-stat-icon">👑</span>' +
                  '<div class="pcc-stat-info">' +
                    '<span class="pcc-stat-label">Laureles de Honor</span>' +
                    '<strong class="pcc-stat-value">+' + totalPoints + ' Laureles</strong>' +
                  '</div>' +
                '</div>' +
                '<div class="pcc-stat-box">' +
                  '<span class="pcc-stat-icon">📜</span>' +
                  '<div class="pcc-stat-info">' +
                    '<span class="pcc-stat-label">Hitos de Egreso</span>' +
                    '<strong class="pcc-stat-value">' + completedCount + ' de ' + totalMissions + ' Hitos</strong>' +
                  '</div>' +
                '</div>' +
                '<div class="pcc-stat-box">' +
                  '<span class="pcc-stat-icon">🎓</span>' +
                  '<div class="pcc-stat-info">' +
                    '<span class="pcc-stat-label">Título Maker</span>' +
                    '<strong class="pcc-stat-value">' + legacyRank + '</strong>' +
                  '</div>' +
                '</div>' +
                '<div class="pcc-stat-box">' +
                  '<span class="pcc-stat-icon">🏆</span>' +
                  '<div class="pcc-stat-info">' +
                    '<span class="pcc-stat-label">Proyecto Cumbre</span>' +
                    '<strong class="pcc-stat-value">Hito ' + (nextMission.level || 1) + ': ' + (nextMission.title || 'Graduación') + '</strong>' +
                  '</div>' +
                '</div>' +
              '</div>' +

              '<div class="pcc-progress-section">' +
                '<div class="pcc-progress-header">' +
                  '<span>🎓 Camino a la Graduación y Diploma Maker</span>' +
                  '<strong>' + progressPercent + '% Completado</strong>' +
                '</div>' +
                '<div class="pcc-progress-track">' +
                  '<div class="pcc-progress-fill" style="width:' + progressPercent + '%"></div>' +
                '</div>' +
              '</div>' +
            '</div>' +

            '<div class="slm-actions pcc-actions">' +
              '<button class="pcc-btn-adventure" id="slm-go-adventure" type="button">' +
                '<i class="fas fa-scroll"></i> Abrir mi Anuario de Recuerdos' +
              '</button>' +
              '<button class="slm-btn-logout pcc-btn-logout" id="slm-logout-action" type="button">' +
                '<i class="fas fa-sign-out-alt"></i> Cerrar Sesión' +
              '</button>' +
            '</div>' +
          '</div>';
      } else if (isCyber) {
        // ═══ GRUPO 3 (4° y 5° GRADO): CREDENCIAL CYBERPUNK · MAESTROS DE ROBOTS, CIRCUITOS & IA ═══
        if (kicker) kicker.innerHTML = '🤖 Red Neuronal Maker · División Cyber';
        if (title) title.innerHTML = '<i class="fas fa-microchip"></i> Terminal Cyber de ' + firstName;

        var cyberRank = studentLevel >= 5 ? 'Maestro Cyber & IA' : (studentLevel >= 3 ? 'Arquitecto de Robots' : 'Operador de Circuitos');
        var cyberSpecialty = (gId === 'grado5' || gId === '5to')
          ? '🧠 Ingeniero de IA, Sensores & Servomotores'
          : '⚡ Programador de Micro:bit, Circuitos & Lógica';

        body.innerHTML =
          '<div class="slm-active-profile pirate-crew-card cyber-crew-card">' +
            '<div class="pcc-top-banner">' +
              '<div class="pcc-avatar-medallion">' +
                '<span class="pcc-avatar-emoji">' + (student.avatar || '🤖') + '</span>' +
                '<span class="pcc-level-pill">NVL ' + studentLevel + '</span>' +
              '</div>' +
              '<div class="pcc-identity">' +
                '<span class="pcc-rank-badge">⚡ ' + cyberRank + '</span>' +
                '<h3 class="slm-student-name">' + student.name + '</h3>' +
                '<div class="pcc-ship-row">' +
                  '<span class="slm-student-grade">🔌 Lab ' + (student.gradeName || '') + '</span>' +
                  '<span class="pcc-specialty-tag">' + cyberSpecialty + '</span>' +
                '</div>' +
              '</div>' +
            '</div>' +

            '<div class="pcc-stats-scroll">' +
              '<div class="pcc-scroll-title"><i class="fas fa-network-wired"></i> Registro de Procesamiento y Sistemas</div>' +
              '<div class="pcc-stats-grid">' +
                '<div class="pcc-stat-box">' +
                  '<span class="pcc-stat-icon">⚡</span>' +
                  '<div class="pcc-stat-info">' +
                    '<span class="pcc-stat-label">Energía de Red</span>' +
                    '<strong class="pcc-stat-value">+' + totalPoints + ' TeraWatts</strong>' +
                  '</div>' +
                '</div>' +
                '<div class="pcc-stat-box">' +
                  '<span class="pcc-stat-icon">🔌</span>' +
                  '<div class="pcc-stat-info">' +
                    '<span class="pcc-stat-label">Nodos Compilados</span>' +
                    '<strong class="pcc-stat-value">' + completedCount + ' de ' + totalMissions + ' Nodos</strong>' +
                  '</div>' +
                '</div>' +
                '<div class="pcc-stat-box">' +
                  '<span class="pcc-stat-icon">🤖</span>' +
                  '<div class="pcc-stat-info">' +
                    '<span class="pcc-stat-label">Rango Cyber</span>' +
                    '<strong class="pcc-stat-value">' + cyberRank + '</strong>' +
                  '</div>' +
                '</div>' +
                '<div class="pcc-stat-box">' +
                  '<span class="pcc-stat-icon">📟</span>' +
                  '<div class="pcc-stat-info">' +
                    '<span class="pcc-stat-label">Nodo Activo</span>' +
                    '<strong class="pcc-stat-value">Nodo ' + (nextMission.level || 1) + ': ' + (nextMission.title || 'En línea') + '</strong>' +
                  '</div>' +
                '</div>' +
              '</div>' +

              '<div class="pcc-progress-section">' +
                '<div class="pcc-progress-header">' +
                  '<span>🧠 Sincronización de la Red Maker</span>' +
                  '<strong>' + progressPercent + '% Compilado</strong>' +
                '</div>' +
                '<div class="pcc-progress-track">' +
                  '<div class="pcc-progress-fill" style="width:' + progressPercent + '%"></div>' +
                '</div>' +
              '</div>' +
            '</div>' +

            '<div class="slm-actions pcc-actions">' +
              '<button class="pcc-btn-adventure" id="slm-go-adventure" type="button">' +
                '<i class="fas fa-terminal"></i> Conectar a mi Terminal' +
              '</button>' +
              '<button class="slm-btn-logout pcc-btn-logout" id="slm-logout-action" type="button">' +
                '<i class="fas fa-power-off"></i> Desconectar Sistema' +
              '</button>' +
            '</div>' +
          '</div>';
      } else if (isSpace) {
        // ═══ GRUPO 2 (2° y 3° GRADO): CREDENCIAL DE ASTRONAUTA & EXPLORADOR GALÁCTICO ═══
        if (kicker) kicker.innerHTML = '🚀 Comando Galáctico · Flota Estelar';
        if (title) title.innerHTML = '<i class="fas fa-user-astronaut"></i> Bitácora Espacial de ' + firstName;

        var spaceRank = studentLevel >= 5 ? 'Comandante Estelar' : (studentLevel >= 3 ? 'Piloto Interplanetario' : 'Cadete Espacial');
        var spaceSpecialty = (gId === 'grado3' || gId === '3ero')
          ? '🛸 Ingeniero de Órbita, Bloques & Micro:bit'
          : '🛰️ Explorador de Algoritmos, Scratch & Circuitos';

        body.innerHTML =
          '<div class="slm-active-profile pirate-crew-card space-crew-card">' +
            '<div class="pcc-top-banner">' +
              '<div class="pcc-avatar-medallion">' +
                '<span class="pcc-avatar-emoji">' + (student.avatar || '👨‍🚀') + '</span>' +
                '<span class="pcc-level-pill">NVL ' + studentLevel + '</span>' +
              '</div>' +
              '<div class="pcc-identity">' +
                '<span class="pcc-rank-badge">👨‍🚀 ' + spaceRank + '</span>' +
                '<h3 class="slm-student-name">' + student.name + '</h3>' +
                '<div class="pcc-ship-row">' +
                  '<span class="slm-student-grade">🚀 Nave ' + (student.gradeName || '') + '</span>' +
                  '<span class="pcc-specialty-tag">' + spaceSpecialty + '</span>' +
                '</div>' +
              '</div>' +
            '</div>' +

            '<div class="pcc-stats-scroll">' +
              '<div class="pcc-scroll-title"><i class="fas fa-satellite"></i> Hoja de Vuelo Interplanetario</div>' +
              '<div class="pcc-stats-grid">' +
                '<div class="pcc-stat-box">' +
                  '<span class="pcc-stat-icon">🌟</span>' +
                  '<div class="pcc-stat-info">' +
                    '<span class="pcc-stat-label">Energía Acumulada</span>' +
                    '<strong class="pcc-stat-value">+' + totalPoints + ' Cristales</strong>' +
                  '</div>' +
                '</div>' +
                '<div class="pcc-stat-box">' +
                  '<span class="pcc-stat-icon">🪐</span>' +
                  '<div class="pcc-stat-info">' +
                    '<span class="pcc-stat-label">Planetas Explorados</span>' +
                    '<strong class="pcc-stat-value">' + completedCount + ' de ' + totalMissions + ' Planetas</strong>' +
                  '</div>' +
                '</div>' +
                '<div class="pcc-stat-box">' +
                  '<span class="pcc-stat-icon">🛸</span>' +
                  '<div class="pcc-stat-info">' +
                    '<span class="pcc-stat-label">Rango Galáctico</span>' +
                    '<strong class="pcc-stat-value">' + spaceRank + '</strong>' +
                  '</div>' +
                '</div>' +
                '<div class="pcc-stat-box">' +
                  '<span class="pcc-stat-icon">📡</span>' +
                  '<div class="pcc-stat-info">' +
                    '<span class="pcc-stat-label">Órbita Actual</span>' +
                    '<strong class="pcc-stat-value">Planeta ' + (nextMission.level || 1) + ': ' + (nextMission.title || 'En órbita') + '</strong>' +
                  '</div>' +
                '</div>' +
              '</div>' +

              '<div class="pcc-progress-section">' +
                '<div class="pcc-progress-header">' +
                  '<span>🌌 Travesía del Mapa Estelar</span>' +
                  '<strong>' + progressPercent + '% Explorado</strong>' +
                '</div>' +
                '<div class="pcc-progress-track">' +
                  '<div class="pcc-progress-fill" style="width:' + progressPercent + '%"></div>' +
                '</div>' +
              '</div>' +
            '</div>' +

            '<div class="slm-actions pcc-actions">' +
              '<button class="pcc-btn-adventure" id="slm-go-adventure" type="button">' +
                '<i class="fas fa-user-astronaut"></i> Ir a mi Estación' +
              '</button>' +
              '<button class="slm-btn-logout pcc-btn-logout" id="slm-logout-action" type="button">' +
                '<i class="fas fa-rocket"></i> Regresar a Tierra' +
              '</button>' +
            '</div>' +
          '</div>';
      } else {
        // ═══ GRUPO 1 (SALA 5 y 1° GRADO): CREDENCIAL PIRATA ═══
        if (kicker) kicker.innerHTML = '🏴‍☠️ Credencial Oficial de la Flota';
        if (title) title.innerHTML = '<i class="fas fa-compass"></i> Bitácora de ' + firstName;

        var pirateRank = studentLevel >= 5 ? 'Capitán Corsario' : (studentLevel >= 3 ? 'Timonel Maker' : 'Grumete Explorador');
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
                    '<strong class="pcc-stat-value">+' + totalPoints + ' Doblones</strong>' +
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
      }

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
      if (frame) frame.classList.remove('theme-space', 'theme-cyber', 'theme-legacy');
      if (kicker) kicker.innerHTML = '⚓ Taller STEAM · Cofradía, Flota, Cyber & Egresados';
      if (title) title.innerHTML = '<i class="fas fa-compass"></i> Ingreso al Taller';
      body.innerHTML =
        '<form id="classic-login-form" class="classic-login-form">' +
          '<div class="clf-error-alert hidden" id="clf-error-alert">' +
            '<i class="fas fa-exclamation-circle"></i>' +
            '<span>Usuario o clave de 4 dígitos incorrectos.</span>' +
          '</div>' +

          '<div class="clf-layout-grid">' +
            '<!-- COLUMNA IZQUIERDA: USUARIO Y ACCIONES -->' +
            '<div class="clf-col-left">' +
              '<p class="clf-intro">Ingresá tu usuario y PIN para subir a bordo:</p>' +
              '<div class="clf-field">' +
                '<label for="clf-user"><i class="fas fa-user-astronaut"></i> Tripulante / Usuario:</label>' +
                '<input type="text" id="clf-user" placeholder="Ej: agumor o tu nombre" required autocomplete="username">' +
              '</div>' +
              '<div class="clf-demo-hint">' +
                '<div class="clf-hint-row"><i class="fas fa-info-circle"></i> <span><strong>Usuario:</strong> 3 letras nombre + 3 apellido</span></div>' +
                '<div class="clf-hint-row clf-hint-sub"><i class="fas fa-arrow-right" style="font-size:0.65rem;"></i> (ej: <code>agumor</code>)</div>' +
                '<div class="clf-hint-row"><i class="fas fa-key"></i> <span><strong>Clave:</strong> PIN de 4 dígitos</span></div>' +
              '</div>' +
              '<button type="submit" class="clf-submit-btn">' +
                '<span>Abrir e Iniciar Sesión</span>' +
                '<i class="fas fa-unlock-alt"></i>' +
              '</button>' +
            '</div>' +

            '<!-- COLUMNA DERECHA: CAJA FUERTE Y TECLADO -->' +
            '<div class="clf-col-right">' +
              '<div class="vault-safe-box" id="vault-safe-box">' +
                '<span class="vault-rivet top-left"></span>' +
                '<span class="vault-rivet top-right"></span>' +
                '<span class="vault-rivet bottom-left"></span>' +
                '<span class="vault-rivet bottom-right"></span>' +

                '<div class="vault-safe-header">' +
                  '<div class="vault-brand">' +
                    '<i class="fas fa-shield-alt vault-shield-icon"></i>' +
                    '<span>Caja Fuerte · PIN 4 Dígitos</span>' +
                  '</div>' +
                  '<div class="vault-status-indicator locked" id="vault-status-led" title="Estado de la cerradura">' +
                    '<span class="vault-led-dot"></span>' +
                    '<span class="vault-led-text" id="vault-led-text">BLOQUEADO</span>' +
                  '</div>' +
                '</div>' +

                '<div class="vault-screen" id="vault-screen" tabindex="0" role="region" aria-label="Pantalla de la caja fuerte">' +
                  '<div class="vault-screen-glare"></div>' +
                  '<div class="vault-slots-wrap">' +
                    '<div class="vault-slot" data-slot="0"><span class="vault-slot-char"></span></div>' +
                    '<div class="vault-slot" data-slot="1"><span class="vault-slot-char"></span></div>' +
                    '<div class="vault-slot" data-slot="2"><span class="vault-slot-char"></span></div>' +
                    '<div class="vault-slot" data-slot="3"><span class="vault-slot-char"></span></div>' +
                  '</div>' +
                  '<button type="button" class="vault-eye-btn" id="vault-eye-toggle" title="Mostrar / ocultar dígitos del PIN" aria-label="Mostrar u ocultar PIN">' +
                    '<i class="fas fa-eye"></i>' +
                  '</button>' +
                '</div>' +

                '<input type="password" id="clf-pass" maxlength="4" required autocomplete="current-password" class="vault-hidden-input" tabindex="-1" aria-hidden="true">' +

                '<div class="vault-instruction-bar" id="vault-instruction">' +
                  '<i class="fas fa-key"></i> <span id="vault-subtext">Ingresá los 4 números de tu clave:</span>' +
                '</div>' +

                '<div class="vault-keypad">' +
                  '<button type="button" class="vault-key" data-digit="1"><span class="vk-num">1</span></button>' +
                  '<button type="button" class="vault-key" data-digit="2"><span class="vk-num">2</span><span class="vk-sub">ABC</span></button>' +
                  '<button type="button" class="vault-key" data-digit="3"><span class="vk-num">3</span><span class="vk-sub">DEF</span></button>' +
                  '<button type="button" class="vault-key" data-digit="4"><span class="vk-num">4</span><span class="vk-sub">GHI</span></button>' +
                  '<button type="button" class="vault-key" data-digit="5"><span class="vk-num">5</span><span class="vk-sub">JKL</span></button>' +
                  '<button type="button" class="vault-key" data-digit="6"><span class="vk-num">6</span><span class="vk-sub">MNO</span></button>' +
                  '<button type="button" class="vault-key" data-digit="7"><span class="vk-num">7</span><span class="vk-sub">PQRS</span></button>' +
                  '<button type="button" class="vault-key" data-digit="8"><span class="vk-num">8</span><span class="vk-sub">TUV</span></button>' +
                  '<button type="button" class="vault-key" data-digit="9"><span class="vk-num">9</span><span class="vk-sub">WXYZ</span></button>' +
                  '<button type="button" class="vault-key vault-key-action vault-key-clear" id="vault-key-clear" title="Borrar todo el código">' +
                    '<span class="vk-action-icon"><i class="fas fa-trash-alt"></i></span>' +
                    '<span class="vk-action-label">Borrar</span>' +
                  '</button>' +
                  '<button type="button" class="vault-key" data-digit="0"><span class="vk-num">0</span></button>' +
                  '<button type="button" class="vault-key vault-key-action vault-key-backspace" id="vault-key-backspace" title="Borrar último dígito">' +
                    '<span class="vk-action-icon"><i class="fas fa-backspace"></i></span>' +
                    '<span class="vk-action-label">Atrás</span>' +
                  '</button>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</form>';

      var form  = document.getElementById('classic-login-form');
      var error = document.getElementById('clf-error-alert');

      // Controlador interactivo de la Caja Fuerte
      initVaultSafeKeypad(form);

      function initVaultSafeKeypad(f) {
        if (!f) return;
        var passInput = document.getElementById('clf-pass');
        var screenEl = document.getElementById('vault-screen');
        var slots = f.querySelectorAll('.vault-slot');
        var statusLed = document.getElementById('vault-status-led');
        var ledText = document.getElementById('vault-led-text');
        var subtext = document.getElementById('vault-subtext');
        var eyeBtn = document.getElementById('vault-eye-toggle');
        var keys = f.querySelectorAll('.vault-key[data-digit]');
        var clearBtn = document.getElementById('vault-key-clear');
        var backspaceBtn = document.getElementById('vault-key-backspace');

        var currentPin = '';
        var isRevealed = false;

        function playKeyTone(isAction) {
          try {
            var AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
              if (!window._vaultAudioCtx) window._vaultAudioCtx = new AudioCtx();
              var ctx = window._vaultAudioCtx;
              if (ctx.state === 'suspended') ctx.resume();
              var osc = ctx.createOscillator();
              var gain = ctx.createGain();
              osc.type = isAction ? 'triangle' : 'sine';
              osc.frequency.setValueAtTime(isAction ? 330 : 660, ctx.currentTime);
              gain.gain.setValueAtTime(0.08, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.start();
              osc.stop(ctx.currentTime + 0.08);
            }
          } catch (e) {}
          if (window.sounds && window.sounds.playClick) {
            window.sounds.playClick();
          }
        }

        function updateDisplay() {
          if (passInput) passInput.value = currentPin;

          slots.forEach(function(slot, idx) {
            var charSpan = slot.querySelector('.vault-slot-char');
            var val = currentPin[idx];
            if (val !== undefined) {
              slot.classList.add('filled');
              if (isRevealed) {
                slot.classList.add('revealed');
                if (charSpan) charSpan.textContent = val;
              } else {
                slot.classList.remove('revealed');
                if (charSpan) charSpan.textContent = '●';
              }
            } else {
              slot.classList.remove('filled', 'revealed');
              if (charSpan) charSpan.textContent = '';
            }
          });

          if (currentPin.length === 4) {
            if (statusLed) statusLed.className = 'vault-status-indicator ready';
            if (ledText) ledText.textContent = 'LISTO';
            if (subtext) subtext.innerHTML = '<strong style="color:#16a34a;"><i class="fas fa-check-circle"></i> ¡PIN completo! Presioná Abrir o Enter</strong>';
          } else {
            if (statusLed) statusLed.className = 'vault-status-indicator locked';
            if (ledText) ledText.textContent = 'BLOQUEADO';
            if (subtext) {
              var faltan = 4 - currentPin.length;
              subtext.textContent = 'Ingresá tu PIN (' + currentPin.length + ' de 4 dígitos' + (faltan > 0 ? ', faltan ' + faltan : '') + '):';
            }
          }
        }

        function addDigit(digit) {
          if (currentPin.length >= 4) return;
          currentPin += String(digit);
          playKeyTone(false);
          updateDisplay();
        }

        function removeDigit() {
          if (currentPin.length > 0) {
            currentPin = currentPin.slice(0, -1);
            playKeyTone(true);
            updateDisplay();
          }
        }

        function clearPin() {
          if (currentPin.length > 0) {
            currentPin = '';
            playKeyTone(true);
            updateDisplay();
          }
        }

        keys.forEach(function(k) {
          k.addEventListener('click', function(e) {
            e.preventDefault();
            var d = k.getAttribute('data-digit');
            if (d !== null) addDigit(d);
          });
        });

        if (backspaceBtn) {
          backspaceBtn.addEventListener('click', function(e) {
            e.preventDefault();
            removeDigit();
          });
        }

        if (clearBtn) {
          clearBtn.addEventListener('click', function(e) {
            e.preventDefault();
            clearPin();
          });
        }

        if (eyeBtn) {
          eyeBtn.addEventListener('click', function(e) {
            e.preventDefault();
            isRevealed = !isRevealed;
            eyeBtn.classList.toggle('active', isRevealed);
            eyeBtn.innerHTML = isRevealed ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
            updateDisplay();
          });
        }

        // Event listener de teclado físico
        function onKeydown(e) {
          var modal = document.getElementById('student-login-modal');
          if (!modal || !modal.classList.contains('active')) return;
          var userInput = document.getElementById('clf-user');

          if (document.activeElement === userInput) {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (screenEl) screenEl.focus();
            }
            return;
          }

          if (/^[0-9]$/.test(e.key)) {
            e.preventDefault();
            addDigit(e.key);
            var btn = f.querySelector('.vault-key[data-digit="' + e.key + '"]');
            if (btn) {
              btn.classList.add('keyboard-pressed');
              setTimeout(function() { btn.classList.remove('keyboard-pressed'); }, 140);
            }
          } else if (e.key === 'Backspace') {
            e.preventDefault();
            removeDigit();
            if (backspaceBtn) {
              backspaceBtn.classList.add('keyboard-pressed');
              setTimeout(function() { backspaceBtn.classList.remove('keyboard-pressed'); }, 140);
            }
          } else if (e.key === 'Delete' || e.key === 'Escape') {
            clearPin();
          }
        }

        document.addEventListener('keydown', onKeydown);
        f._cleanupVaultKeydown = function() {
          document.removeEventListener('keydown', onKeydown);
        };

        window._triggerVaultDenied = function() {
          var vault = document.getElementById('vault-safe-box');
          if (vault) {
            vault.classList.remove('vault-shake');
            void vault.offsetWidth;
            vault.classList.add('vault-shake');
            setTimeout(function() { vault.classList.remove('vault-shake'); }, 600);
          }
          if (statusLed) statusLed.className = 'vault-status-indicator error';
          if (ledText) ledText.textContent = 'DENEGADO';
          if (subtext) subtext.innerHTML = '<span style="color:#ef4444; font-weight:900;"><i class="fas fa-exclamation-triangle"></i> Acceso denegado. Verificá tu PIN</span>';
        };

        updateDisplay();
      }

      form.onsubmit = async function(e) {
        e.preventDefault();
        var submitBtn = form.querySelector('.clf-submit-btn');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span>Verificando Bóveda...</span> <i class="fas fa-spinner fa-spin"></i>';
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
            var statusLed = document.getElementById('vault-status-led');
            var ledText = document.getElementById('vault-led-text');
            if (statusLed) statusLed.className = 'vault-status-indicator ready';
            if (ledText) ledText.textContent = 'ABIERTO';
            setActiveStudent(matches[0]);
            setTimeout(function() {
              closeLoginModal();
            }, 300);
            if (window.sounds) window.sounds.playSuccess();
          } else if (matches.length > 1) {
            error.classList.add('hidden');
            showStudentPicker(matches);
          } else {
            error.classList.remove('hidden');
            if (typeof window._triggerVaultDenied === 'function') window._triggerVaultDenied();
            if (window.sounds) window.sounds.playError();
          }
        } catch (err) {
          console.error("Error en login:", err);
          error.classList.remove('hidden');
          if (typeof window._triggerVaultDenied === 'function') window._triggerVaultDenied();
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>Abrir e Iniciar Sesión</span> <i class="fas fa-unlock-alt"></i>';
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
