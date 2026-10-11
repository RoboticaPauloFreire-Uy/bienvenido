/**
 * =============================================================
 * THEME.JS — MOTOR DE TEMAS FESTIVOS (HALLOWEEN, DÍA DEL NIÑO, ETC.)
 * Colegio Paulo Freire · Taller de Robótica & Programación
 * =============================================================
 * 
 * 🎃 ¿CÓMO CAMBIAR EL TEMA DEL COLEGIO?
 * -------------------------------------------------------------
 * Simplemente cambiá el valor de CURRENT_THEME abajo:
 * 
 *   'halloween'    → Especial Noche de Brujas (Activo en Octubre)
 *   'default'      → Tema Normal / Institucional (Para usar desde Noviembre)
 *   'diadelnino'   → Especial Día de la Niñez / Día del Niño
 *   'diadelamadre' → Especial Día de la Madre / Mes de la Familia
 *   'navidad'      → Especial Navidad y Cierre de Año
 * =============================================================
 */

(function () {
  'use strict';

  // ⚙️ TEMA ACTIVO POR DEFECTO PARA EL COLEGIO
  // (El usuario solicitó 'halloween' para este mes, y 'default' para noviembre en adelante)
  window.CURRENT_THEME = 'halloween';

  var THEMES = [
    {
      id: 'halloween',
      name: 'Halloween Maker',
      emoji: '🎃',
      label: 'Halloween',
      badge: '🎃 Activo este mes',
      badgeColor: '#EA580C',
      desc: 'Calabazas, murciélagos, noche mágica y desafíos de robótica y programación de terror.',
      iconBg: 'linear-gradient(135deg, #EA580C 0%, #7E22CE 100%)'
    },
    {
      id: 'default',
      name: 'Normal / Institucional',
      emoji: '🌱',
      label: 'Normal',
      badge: '🏫 Desde Noviembre',
      badgeColor: '#16A34A',
      desc: 'Diseño institucional verde y amarillo del Colegio Paulo Freire. Limpio, clásico y maker.',
      iconBg: 'linear-gradient(135deg, #15803D 0%, #F59E0B 100%)'
    },
    {
      id: 'diadelnino',
      name: 'Día de la Niñez',
      emoji: '🎈',
      label: 'Día del Niño',
      badge: '🎉 Especial',
      badgeColor: '#0284C7',
      desc: 'Globos, confeti, colores vibrantes y juegos dedicados a la diversión y creatividad infantil.',
      iconBg: 'linear-gradient(135deg, #0284C7 0%, #EC4899 100%)'
    },
    {
      id: 'diadelamadre',
      name: 'Día de la Madre',
      emoji: '🌸',
      label: 'Día de la Madre',
      badge: '💖 En Familia',
      badgeColor: '#BE185D',
      desc: 'Flores, tarjetas interactivas pop-up y regalos tecnológicos hechos con amor en el taller.',
      iconBg: 'linear-gradient(135deg, #BE185D 0%, #FB7185 100%)'
    },
    {
      id: 'navidad',
      name: 'Navidad & Fin de Año',
      emoji: '🎄',
      label: 'Navidad',
      badge: '❄️ Diciembre',
      badgeColor: '#DC2626',
      desc: 'Luces LED festivas, nieve mágica y proyectos de cierre de ciclo lectivo.',
      iconBg: 'linear-gradient(135deg, #15803D 0%, #DC2626 100%)'
    }
  ];

  var activeThemeId = 'halloween';

  function getStoredTheme() {
    try {
      return localStorage.getItem('pf_selected_theme');
    } catch (e) {
      return null;
    }
  }

  function saveStoredTheme(id) {
    try {
      if (!id || id === window.CURRENT_THEME) {
        localStorage.removeItem('pf_selected_theme');
      } else {
        localStorage.setItem('pf_selected_theme', id);
      }
    } catch (e) {}
  }

  function getThemeObj(id) {
    for (var i = 0; i < THEMES.length; i++) {
      if (THEMES[i].id === id) return THEMES[i];
    }
    return THEMES[0];
  }

  function applyTheme(id, persist) {
    var theme = getThemeObj(id);
    activeThemeId = theme.id;

    // Aplicar atributo a html y clase a body
    document.documentElement.setAttribute('data-theme', theme.id);
    document.body.setAttribute('data-theme', theme.id);

    // Actualizar píldora en la barra superior
    var pillIcon = document.querySelector('.topbar-theme-pill .ttp-icon');
    var pillLabel = document.querySelector('.topbar-theme-pill .ttp-label');
    if (pillIcon) pillIcon.textContent = theme.emoji;
    if (pillLabel) pillLabel.textContent = theme.label;

    if (persist) {
      saveStoredTheme(theme.id);
    }

    // Actualizar selección activa dentro del modal si está abierto
    document.querySelectorAll('.theme-option-card').forEach(function (card) {
      card.classList.toggle('active', card.dataset.themeId === theme.id);
    });

    // Disparar evento para que otros módulos puedan reaccionar si lo desean
    window.dispatchEvent(new CustomEvent('theme_changed', { detail: theme }));
  }

  // ─────────────────────────────────────────────────────────────
  // MODAL VISUAL SELECTOR DE TEMAS
  // ─────────────────────────────────────────────────────────────
  function openThemeModal() {
    if (window.sounds && window.sounds.playClick) window.sounds.playClick();
    var modal = document.getElementById('theme-modal-overlay');
    if (!modal) {
      renderModalDOM();
      modal = document.getElementById('theme-modal-overlay');
    }
    if (modal) {
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeThemeModal() {
    var modal = document.getElementById('theme-modal-overlay');
    if (modal) {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  function renderModalDOM() {
    var existing = document.getElementById('theme-modal-overlay');
    if (existing) existing.remove();

    var div = document.createElement('div');
    div.id = 'theme-modal-overlay';
    div.className = 'theme-modal-overlay';
    div.innerHTML =
      '<div class="theme-modal-card" role="dialog" aria-modal="true" aria-labelledby="tm-title">' +
        '<div class="theme-modal-header">' +
          '<h3 class="theme-modal-title" id="tm-title">🎨 Selector de Temas Festivos</h3>' +
          '<button type="button" class="theme-modal-close" id="tm-close-btn" aria-label="Cerrar">&times;</button>' +
        '</div>' +
        '<div class="theme-modal-body">' +
          '<p class="theme-modal-desc">Elegí la temática visual del portal escolar con un solo clic. Cambia colores, animaciones y ambiente de todo el taller.</p>' +
          '<div class="theme-options-grid">' +
            THEMES.map(function (t) {
              var isActive = t.id === activeThemeId;
              return '<button type="button" class="theme-option-card ' + (isActive ? 'active' : '') + '" data-theme-id="' + t.id + '">' +
                '<div class="toc-icon-wrap" style="background:' + t.iconBg + ';">' + t.emoji + '</div>' +
                '<div class="toc-content">' +
                  '<div class="toc-name-row">' +
                    '<span class="toc-name">' + t.name + '</span>' +
                    '<span class="toc-badge-tag" style="background:' + t.badgeColor + '22;color:' + t.badgeColor + ';">' + t.badge + '</span>' +
                  '</div>' +
                  '<p class="toc-desc">' + t.desc + '</p>' +
                '</div>' +
                '<div class="toc-check"><i class="fas fa-check-circle"></i></div>' +
              '</button>';
            }).join('') +
          '</div>' +
        '</div>' +
        '<div class="theme-modal-footer">' +
          '<span>💡 Podés cambiarlo libremente en cualquier momento.</span>' +
          '<button type="button" id="tm-reset-btn"><i class="fas fa-undo"></i> Restablecer predeterminado</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(div);

    div.addEventListener('click', function (e) {
      if (e.target === div) closeThemeModal();
    });

    var closeBtn = div.querySelector('#tm-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeThemeModal);

    var resetBtn = div.querySelector('#tm-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        if (window.sounds && window.sounds.playClick) window.sounds.playClick();
        applyTheme(window.CURRENT_THEME || 'halloween', true);
        closeThemeModal();
      });
    }

    div.querySelectorAll('.theme-option-card').forEach(function (card) {
      card.addEventListener('click', function () {
        var tid = card.dataset.themeId;
        if (window.sounds && window.sounds.playSuccess) window.sounds.playSuccess();
        applyTheme(tid, true);
        setTimeout(closeThemeModal, 250);
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeThemeModal();
      // Atajo para el administrador (Ctrl + Alt + T): abre el selector sin botón público
      if (e.ctrlKey && e.altKey && (e.key === 't' || e.key === 'T')) {
        openThemeModal();
      }
    });
  }

  // ─────────────────────────────────────────────────────────────
  // INICIALIZACIÓN
  // ─────────────────────────────────────────────────────────────
  function init() {
    var stored = getStoredTheme();
    var initialTheme = stored || window.CURRENT_THEME || 'halloween';
    applyTheme(initialTheme, false);

    // Preparar eventos si el botón ya está en el DOM
    var btn = document.getElementById('theme-switcher-btn');
    if (btn) {
      btn.onclick = openThemeModal;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Exportar al objeto window para acceso global
  window.THEMES = THEMES;
  window.setTheme = function (id) { applyTheme(id, true); };
  window.getTheme = function () { return activeThemeId; };
  window.openThemeModal = openThemeModal;
  window.closeThemeModal = closeThemeModal;
})();
