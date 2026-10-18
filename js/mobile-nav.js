/**
 * MOBILE-NAV.JS — Barra de navegación inferior para celulares (index.html)
 * Reutiliza window.switchView para que el menú siempre esté a mano.
 */
(function () {
  if (typeof window.switchView !== 'function' && !document.getElementById('topbar-nav')) return;

  var ITEMS = [
    { view: 'inicio',   icon: 'fa-home',          label: 'Inicio' },
    { view: 'noticias', icon: 'fa-newspaper',     label: 'Noticias' },
    { view: 'clase',    icon: 'fa-chalkboard',    label: 'Clase' },
    { view: 'juegos',   icon: 'fa-gamepad',       label: 'Juegos' },
    { view: 'agenda',   icon: 'fa-calendar-alt',  label: 'Agenda' }
  ];

  function build() {
    if (document.getElementById('mobile-bottom-nav')) return;
    var nav = document.createElement('nav');
    nav.id = 'mobile-bottom-nav';
    nav.setAttribute('aria-label', 'Navegación principal');
    nav.innerHTML = ITEMS.map(function (it) {
      return '<a href="#' + it.view + '" data-mview="' + it.view + '"><i class="fas ' + it.icon + '"></i><span>' + it.label + '</span></a>';
    }).join('') +
      '<a href="#" data-more="1"><i class="fas fa-bars"></i><span>Más</span></a>';
    document.body.appendChild(nav);

    nav.addEventListener('click', function (e) {
      var a = e.target.closest('a');
      if (!a) return;
      e.preventDefault();
      if (a.getAttribute('data-more')) {
        var top = document.getElementById('topbar-nav');
        if (top) top.classList.toggle('mobile-open');
        return;
      }
      var v = a.getAttribute('data-mview');
      if (typeof window.switchView === 'function') window.switchView(v);
      var topNav = document.getElementById('topbar-nav');
      if (topNav) topNav.classList.remove('mobile-open');
      mark(v);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  function mark(v) {
    document.querySelectorAll('#mobile-bottom-nav a[data-mview]').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-mview') === v);
    });
  }

  function current() {
    var act = document.querySelector('.topbar-nav-link.active[data-view]');
    mark(act ? act.getAttribute('data-view') : 'inicio');
  }

  document.addEventListener('DOMContentLoaded', function () {
    build();
    current();
    // Mantener resaltado al cambiar de sección desde cualquier lado
    document.addEventListener('click', function () { setTimeout(current, 150); });
  });
})();
