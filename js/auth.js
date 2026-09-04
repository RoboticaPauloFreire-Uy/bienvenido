/**
 * =============================================================
 * AUTH.JS — LOGIN CLÁSICO, TOGGLE DE MENÚ Y SESIÓN DE ALUMNO
 * =============================================================
 */

(function () {
  var STORAGE_KEY = 'pf_active_student_id';

  function getActiveStudent() {
    try {
      var id = localStorage.getItem(STORAGE_KEY);
      if (!id) return null;
      if (window.getStudentById) return window.getStudentById(id);
      return null;
    } catch(e) {
      return null;
    }
  }

  function setActiveStudent(studentId) {
    if (studentId) {
      localStorage.setItem(STORAGE_KEY, studentId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    updateUI();
    window.dispatchEvent(new CustomEvent('student_session_changed', { detail: getActiveStudent() }));
  }

  function logoutStudent() {
    if (window.sounds) window.sounds.playClick();
    localStorage.removeItem(STORAGE_KEY);
    closeLoginModal();
    window.location.reload();
  }

  function updateUI() {
    var student = getActiveStudent();
    var btn = document.getElementById('student-login-btn');
    var aulasEl = document.getElementById('nav-dropdown-aulas');
    var driveLinks = document.querySelectorAll('.nav-drive-link');

    if (student) {
      // === LOGUEADO ===
      document.body.classList.add('student-logged-in');

      // Ocultar Aulas
      if (aulasEl) aulasEl.style.display = 'none';

      // Mostrar Mi Carpeta Drive
      driveLinks.forEach(function(el) { el.style.display = 'inline-flex'; });

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
      }

    } else {
      // === NO LOGUEADO ===
      document.body.classList.remove('student-logged-in');

      // Mostrar Aulas
      if (aulasEl) aulasEl.style.display = '';

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
    }
  }

  // === MODAL DE LOGIN ===
  function openLoginModal() {
    if (window.sounds) window.sounds.playClick();
    var modal = document.getElementById('student-login-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'student-login-modal';
      modal.className = 'student-login-modal';
      modal.innerHTML =
        '<div class="slm-content">' +
          '<div class="slm-header">' +
            '<div class="slm-title" id="slm-modal-title"><i class="fas fa-user-lock"></i> Ingreso de Alumnos</div>' +
            '<button class="slm-close" id="slm-close-btn" type="button">&times;</button>' +
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
    var body  = document.getElementById('slm-body');
    var title = document.getElementById('slm-modal-title');
    if (!body) return;

    var student = getActiveStudent();

    if (student) {
      // PERFIL DEL ALUMNO ACTIVO
      if (title) title.innerHTML = '<i class="fas fa-id-card"></i> Perfil de ' + student.name.split(' ')[0];
      body.innerHTML =
        '<div class="slm-active-profile">' +
          '<div class="slm-big-avatar">' + (student.avatar || '👦') + '</div>' +
          '<h3 class="slm-student-name">' + student.name + '</h3>' +
          '<span class="slm-student-grade">' + student.gradeName + '</span>' +
          '<div class="slm-drive-preview-card">' +
            '<i class="fab fa-google-drive"></i>' +
            '<div>' +
              '<strong>Carpeta de Google Drive Conectada</strong>' +
              '<span>Subcarpeta <strong>dibujo</strong> vinculada</span>' +
            '</div>' +
          '</div>' +
          '<div class="slm-actions">' +
            '<button class="slm-btn-logout" id="slm-logout-action" type="button">' +
              '<i class="fas fa-sign-out-alt"></i> Cerrar Sesión' +
            '</button>' +
          '</div>' +
        '</div>';
      document.getElementById('slm-logout-action').onclick = logoutStudent;

    } else {
      // FORMULARIO DE LOGIN
      if (title) title.innerHTML = '<i class="fas fa-user-lock"></i> Ingreso de Alumnos';
      body.innerHTML =
        '<form id="classic-login-form" class="classic-login-form">' +
          '<p class="clf-intro">Ingresá con tu usuario y contraseña del Taller:</p>' +
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

      form.onsubmit = function(e) {
        e.preventDefault();
        var u = document.getElementById('clf-user').value;
        var p = document.getElementById('clf-pass').value;
        var matches = window.findMatchingStudents ? window.findMatchingStudents(u, p) : [];
        if (matches.length === 0 && window.authenticateStudent) {
          var single = window.authenticateStudent(u, p);
          if (single) matches = [single];
        }

        if (matches.length === 1) {
          error.classList.add('hidden');
          setActiveStudent(matches[0].id);
          closeLoginModal();
          if (window.sounds) window.sounds.playSuccess();
        } else if (matches.length > 1) {
          error.classList.add('hidden');
          showStudentPicker(matches);
        } else {
          error.classList.remove('hidden');
          if (window.sounds) window.sounds.playError();
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
            setActiveStudent(stId);
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
