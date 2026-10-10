/**
 * =============================================================
 * HOME.JS — PORTAL DE NOTICIAS Y ACTIVIDADES (index.html)
 * Colegio Paulo Freire · Taller de Programación
 * -------------------------------------------------------------
 * Lee el contenido de window.HOME_CONTENT (js/news.js) y arma:
 *   cabecera tipo diario · avisos · noticia destacada ·
 *   grilla de noticias · actividades · agenda · lector de notas
 * =============================================================
 */
(function () {
  'use strict';

  var C = window.HOME_CONTENT || { avisos: [], noticias: [], actividades: [], agenda: [] };

  /* ───────────── Utilidades ───────────── */
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var MESES_CORTOS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

  var CATEGORIAS = {
    taller:    { nombre: 'Taller',    icono: '🛠️', color: '#2E7D32' },
    proyectos: { nombre: 'Proyectos', icono: '🏆', color: '#C2185B' },
    eventos:   { nombre: 'Eventos',   icono: '🎉', color: '#EF6C00' },
    familias:  { nombre: 'Familias',  icono: '👨‍👩‍👧', color: '#3949AB' }
  };

  var TIPOS = {
    clase:   { nombre: 'En clase',   icono: 'fas fa-chalkboard-teacher' },
    taller:  { nombre: 'En clase',   icono: 'fas fa-chalkboard-teacher' }, // alias antiguo de 'clase'
    casa:    { nombre: 'En casa',    icono: 'fas fa-house-user' },
    familia: { nombre: 'En familia', icono: 'fas fa-heart' }
  };

  // Cada tipo de actividad pertenece a una de las dos secciones
  var SECCION_DE_TIPO = { clase: 'clase', taller: 'clase', casa: 'casa', familia: 'casa' };
  function seccionDe(a) { return SECCION_DE_TIPO[a.tipo] || 'clase'; }

  var GRADOS_FALLBACK = [
    { id: 'sala5', name: 'Sala de 5 años' }, { id: 'grado1', name: '1° Grado' },
    { id: 'grado2', name: '2° Grado' }, { id: 'grado3', name: '3° Grado' },
    { id: 'grado4', name: '4° Grado' }, { id: 'grado5', name: '5° Grado' },
    { id: 'grado6', name: '6° Grado' }
  ];
  var GRADOS = (window.SCHOOL_DATA && window.SCHOOL_DATA.grades && window.SCHOOL_DATA.grades.length)
    ? window.SCHOOL_DATA.grades.map(function (g) { return { id: g.id, name: g.name }; })
    : GRADOS_FALLBACK;

  function nombreGrado(id) {
    if (!id || id === 'todos') return 'Todos los grados';
    for (var i = 0; i < GRADOS.length; i++) if (GRADOS[i].id === id) return GRADOS[i].name;
    return id;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function parseFecha(s) {
    if (!s) return null;
    var p = String(s).split('-');
    return new Date(+p[0], (+p[1] || 1) - 1, +p[2] || 1);
  }

  function hoy() {
    var d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function diasEntre(a, b) { return Math.round((b - a) / 86400000); }

  function fechaLarga(s) {
    var d = parseFecha(s);
    return d ? d.getDate() + ' de ' + MESES[d.getMonth()] + ' de ' + d.getFullYear() : '';
  }

  function fechaRelativa(s) {
    var d = parseFecha(s);
    if (!d) return '';
    var n = diasEntre(d, hoy());
    if (n === 0) return 'Hoy';
    if (n === 1) return 'Ayer';
    if (n > 1 && n < 7) return 'Hace ' + n + ' días';
    return d.getDate() + ' ' + MESES[d.getMonth()].slice(0, 3) + ' ' + d.getFullYear();
  }

  function alumno() {
    try { return window.getActiveStudent ? window.getActiveStudent() : null; } catch (e) { return null; }
  }

  function catBadge(cat) {
    var c = CATEGORIAS[cat] || { nombre: cat, icono: '📰', color: '#455A64' };
    return '<span class="hn-cat" style="--cat:' + c.color + '">' + c.icono + ' ' + esc(c.nombre) + '</span>';
  }

  var noticias = (C.noticias || []).slice().sort(function (a, b) { return parseFecha(b.fecha) - parseFecha(a.fecha); });

  /* ───────────── Cabecera tipo diario ───────────── */
  function renderMasthead() {
    var el = document.getElementById('hn-masthead-date');
    if (!el) return;
    var d = new Date();
    var txt = DIAS[d.getDay()] + ' ' + d.getDate() + ' de ' + MESES[d.getMonth()] + ' de ' + d.getFullYear();
    el.textContent = txt.charAt(0).toUpperCase() + txt.slice(1);

    var stats = document.getElementById('hn-masthead-stats');
    if (stats) {
      var activas = (C.actividades || []).filter(function (a) { var s = estadoActividad(a).clave; return s === 'nueva' || s === 'curso'; }).length;
      stats.innerHTML =
        '<span><strong>' + noticias.length + '</strong> noticias</span>' +
        '<span><strong>' + activas + '</strong> actividades activas</span>';
    }
  }

  /* ───────────── Avisos (ticker) ───────────── */
  function renderTicker() {
    var wrap = document.getElementById('hn-ticker');
    var track = document.getElementById('hn-ticker-track');
    if (!wrap || !track) return;
    var avisos = C.avisos || [];
    if (!avisos.length) { wrap.style.display = 'none'; return; }
    var items = avisos.map(function (a) { return '<span class="hn-ticker-item">' + esc(a) + '</span>'; }).join('');
    // Se duplica para un desplazamiento continuo
    track.innerHTML = items + items;
    track.style.animationDuration = Math.max(20, avisos.length * 9) + 's';
  }

  /* ───────────── Destacada + secundarias ───────────── */
  function renderDestacada() {
    var main = document.getElementById('hn-featured-main');
    var side = document.getElementById('hn-featured-side');
    if (!main || !side) return;
    if (!noticias.length) {
      main.innerHTML = '<div class="hn-empty">Todavía no hay noticias publicadas.</div>';
      side.innerHTML = '';
      return;
    }
    var dest = noticias.filter(function (n) { return n.destacada; })[0] || noticias[0];

    main.innerHTML =
      '<article class="hn-hero" data-noticia="' + esc(dest.id) + '" tabindex="0" role="button" aria-label="Leer: ' + esc(dest.titulo) + '">' +
        '<img class="hn-hero-img" src="' + esc(dest.imagen) + '" alt="" loading="eager">' +
        '<div class="hn-hero-shade"></div>' +
        '<div class="hn-hero-body">' +
          '<div class="hn-hero-meta">' + catBadge(dest.categoria) +
            '<span class="hn-hero-grade">' + esc(nombreGrado(dest.grado)) + '</span>' +
            '<span class="hn-hero-date"><i class="far fa-clock"></i> ' + esc(fechaRelativa(dest.fecha)) + '</span>' +
          '</div>' +
          '<h2 class="hn-hero-title">' + esc(dest.titulo) + '</h2>' +
          '<p class="hn-hero-sub">' + esc(dest.bajada) + '</p>' +
          '<span class="hn-hero-cta">Leer nota <i class="fas fa-arrow-right"></i></span>' +
        '</div>' +
      '</article>';

    var otras = noticias.filter(function (n) { return n !== dest; }).slice(0, 3);
    side.innerHTML =
      '<div class="hn-side-title"><i class="fas fa-bolt"></i> Lo último</div>' +
      otras.map(function (n) {
        return '<article class="hn-side-item" data-noticia="' + esc(n.id) + '" tabindex="0" role="button">' +
          '<img src="' + esc(n.imagen) + '" alt="" loading="lazy">' +
          '<div class="hn-side-body">' +
            catBadge(n.categoria) +
            '<h3>' + esc(n.titulo) + '</h3>' +
            '<span class="hn-side-date">' + esc(fechaRelativa(n.fecha)) + ' · ' + esc(nombreGrado(n.grado)) + '</span>' +
          '</div>' +
        '</article>';
      }).join('');
  }

  /* ───────────── Grilla de noticias ───────────── */
  var filtroCat = 'todas';
  var filtroGradoNews = 'todos';
  var POR_PAGINA = 6;
  var visibles = POR_PAGINA;

  function renderFiltrosNoticias() {
    var cont = document.getElementById('hn-news-filters');
    if (!cont) return;
    var chips = [{ id: 'todas', nombre: 'Todas', icono: '📰' }].concat(
      Object.keys(CATEGORIAS).map(function (k) { return { id: k, nombre: CATEGORIAS[k].nombre, icono: CATEGORIAS[k].icono }; })
    );
    cont.innerHTML = chips.map(function (c) {
      return '<button type="button" class="hn-chip' + (c.id === filtroCat ? ' active' : '') + '" data-cat="' + c.id + '">' + c.icono + ' ' + esc(c.nombre) + '</button>';
    }).join('');
    cont.querySelectorAll('.hn-chip').forEach(function (b) {
      b.addEventListener('click', function () {
        filtroCat = b.dataset.cat;
        visibles = POR_PAGINA;
        renderFiltrosNoticias();
        renderNoticias();
      });
    });

    var sel = document.getElementById('hn-news-grade');
    if (sel && !sel.options.length) {
      sel.innerHTML = '<option value="todos">Todos los grados</option>' +
        GRADOS.map(function (g) { return '<option value="' + esc(g.id) + '">' + esc(g.name) + '</option>'; }).join('');
      sel.addEventListener('change', function () {
        filtroGradoNews = sel.value;
        visibles = POR_PAGINA;
        renderNoticias();
      });
    }
  }

  function renderNoticias() {
    var grid = document.getElementById('hn-news-grid');
    var more = document.getElementById('hn-news-more');
    if (!grid) return;
    var lista = noticias.filter(function (n) {
      var okCat = filtroCat === 'todas' || n.categoria === filtroCat;
      var okGr = filtroGradoNews === 'todos' || n.grado === filtroGradoNews || n.grado === 'todos';
      return okCat && okGr;
    });

    if (!lista.length) {
      grid.innerHTML = '<div class="hn-empty"><span>🔎</span>No hay noticias con ese filtro todavía.</div>';
      if (more) more.style.display = 'none';
      return;
    }

    grid.innerHTML = lista.slice(0, visibles).map(function (n) {
      return '<article class="hn-card" data-noticia="' + esc(n.id) + '" tabindex="0" role="button">' +
        '<div class="hn-card-img"><img src="' + esc(n.imagen) + '" alt="" loading="lazy"></div>' +
        '<div class="hn-card-body">' +
          '<div class="hn-card-meta">' + catBadge(n.categoria) + '<span class="hn-card-grade">' + esc(nombreGrado(n.grado)) + '</span></div>' +
          '<h3 class="hn-card-title">' + esc(n.titulo) + '</h3>' +
          '<p class="hn-card-sub">' + esc(n.bajada) + '</p>' +
          '<div class="hn-card-foot"><span><i class="far fa-calendar"></i> ' + esc(fechaRelativa(n.fecha)) + '</span>' +
          '<span class="hn-card-read">Leer <i class="fas fa-arrow-right"></i></span></div>' +
        '</div>' +
      '</article>';
    }).join('');

    if (more) {
      more.style.display = lista.length > visibles ? 'inline-flex' : 'none';
    }
  }

  /* ───────────── Actividades (dos secciones: En clase / En casa) ───────────── */
  var seccionAct = 'clase';      // sección visible
  var filtroCasa = 'todas';      // dentro de "En casa": todas | casa | familia
  var filtroGradoAct = 'todos';

  function estadoActividad(a) {
    var h = hoy();
    var desde = parseFecha(a.desde);
    var hasta = parseFecha(a.hasta);
    if (desde && desde > h) return { clave: 'proxima', texto: 'Próximamente' };
    if (hasta && hasta < h) return { clave: 'finalizada', texto: 'Finalizada' };
    if (desde && diasEntre(desde, h) <= 10) return { clave: 'nueva', texto: 'Nueva' };
    return { clave: 'curso', texto: 'En curso' };
  }

  var ORDEN_ESTADO = { nueva: 0, curso: 1, proxima: 2, finalizada: 3 };

  function pasaGrado(a) {
    var gr = a.grados || ['todos'];
    return filtroGradoAct === 'todos' || gr.indexOf('todos') > -1 || gr.indexOf(filtroGradoAct) > -1;
  }

  function renderFiltrosActividades() {
    // Filtro interno de "En casa" (Todas / Individual / En familia)
    var cont = document.getElementById('hn-casa-filters');
    if (cont) {
      var opciones = [
        { id: 'todas', nombre: 'Todas las de casa', icono: 'fas fa-th-large' },
        { id: 'casa', nombre: 'Solo alumno', icono: 'fas fa-user' },
        { id: 'familia', nombre: 'En familia', icono: 'fas fa-heart' }
      ];
      cont.innerHTML = opciones.map(function (o) {
        return '<button type="button" class="hn-tab' + (o.id === filtroCasa ? ' active' : '') + '" data-casa="' + o.id + '">' +
          '<i class="' + o.icono + '"></i> ' + esc(o.nombre) + '</button>';
      }).join('');
      cont.querySelectorAll('.hn-tab').forEach(function (b) {
        b.addEventListener('click', function () {
          filtroCasa = b.dataset.casa;
          renderFiltrosActividades();
          renderActividades();
        });
      });
    }

    // Selectores de grado sincronizados en ambas vistas (Clase y Casa)
    ['hn-clase-grade', 'hn-casa-grade'].forEach(function (id) {
      var sel = document.getElementById(id);
      if (sel && !sel.options.length) {
        sel.innerHTML = '<option value="todos">Todos los grados</option>' +
          GRADOS.map(function (g) { return '<option value="' + esc(g.id) + '">' + esc(g.name) + '</option>'; }).join('');
        sel.value = filtroGradoAct;
        sel.addEventListener('change', function () {
          filtroGradoAct = sel.value;
          ['hn-clase-grade', 'hn-casa-grade'].forEach(function (otherId) {
            var other = document.getElementById(otherId);
            if (other) other.value = filtroGradoAct;
          });
          renderActividades();
        });
      }
    });
  }

  function renderActividades() {
    var todas = C.actividades || [];
    var clase = todas.filter(function (a) { return seccionDe(a) === 'clase' && pasaGrado(a); });
    var casa = todas.filter(function (a) {
      return seccionDe(a) === 'casa' && pasaGrado(a) && (filtroCasa === 'todas' || a.tipo === filtroCasa);
    });

    renderGridActividades('hn-act-grid-clase', clase, '🏫', 'No hay actividades de clase para este grado.');
    renderGridActividades('hn-act-grid-casa', casa, '🏠', 'No hay actividades para hacer en casa con ese filtro.');
  }

  function renderGridActividades(gridId, actividades, emoji, vacio) {
    var grid = document.getElementById(gridId);
    if (!grid) return;
    var st = alumno();
    var miGrado = st && st.gradeId;

    var lista = actividades.map(function (a) {
      var gr = a.grados || ['todos'];
      return { a: a, estado: estadoActividad(a), mia: !!(miGrado && gr.indexOf(miGrado) > -1) };
    }).sort(function (x, y) {
      var ex = ORDEN_ESTADO[x.estado.clave] - ORDEN_ESTADO[y.estado.clave];
      if (ex) return ex;
      if (x.mia !== y.mia) return x.mia ? -1 : 1;
      return (parseFecha(y.a.desde) || 0) - (parseFecha(x.a.desde) || 0);
    });

    if (!lista.length) {
      grid.innerHTML = '<div class="hn-empty"><span>' + emoji + '</span>' + esc(vacio) + '</div>';
      return;
    }

    grid.innerHTML = lista.map(function (it, idx) {
      var a = it.a;
      var tipo = TIPOS[a.tipo] || { nombre: a.tipo, icono: 'fas fa-star' };
      var gr = a.grados || ['todos'];
      var grTxt = gr.indexOf('todos') > -1 ? 'Todos los grados' : gr.map(nombreGrado).join(' · ');
      var hasta = a.hasta && it.estado.clave !== 'finalizada'
        ? '<span class="hn-act-deadline"><i class="far fa-calendar-check"></i> Hasta el ' + esc(fechaLarga(a.hasta).replace(/ de \d{4}$/, '')) + '</span>' : '';
      var desdeProx = it.estado.clave === 'proxima'
        ? '<span class="hn-act-deadline"><i class="far fa-calendar"></i> Empieza el ' + esc(fechaLarga(a.desde).replace(/ de \d{4}$/, '')) + '</span>' : '';

      var thumb = a.imagen
        ? '<div class="hn-act-thumb has-img"><img src="' + esc(a.imagen) + '" alt="" loading="lazy" onerror="this.parentNode.classList.remove(\'has-img\');this.remove();"><span class="hn-act-emoji">' + esc(a.icono || '⭐') + '</span></div>'
        : '<div class="hn-act-thumb"><span class="hn-act-emoji">' + esc(a.icono || '⭐') + '</span></div>';

      var chips = (a.chips || []).length
        ? '<div class="hn-act-chips">' + a.chips.map(function (c) { return '<span>' + esc(c) + '</span>'; }).join('') + '</div>' : '';

      var botones = (a.botones || []).map(function (b, bi) {
        var cls = 'hn-act-btn' + (b.principal ? ' primary' : '');
        var icon = b.icono ? '<i class="' + esc(b.icono) + '"></i> ' : '';
        if (b.imagenModal) {
          return '<button type="button" class="' + cls + '" data-act="' + idx + '" data-btn="' + bi + '">' + icon + esc(b.texto) + '</button>';
        }
        var ext = /^https?:/i.test(b.url || '');
        return '<a class="' + cls + '" href="' + esc(b.url || '#') + '"' + (ext ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' + icon + esc(b.texto) + '</a>';
      }).join('');

      return '<article class="hn-act-card estado-' + it.estado.clave + (it.mia ? ' es-mia' : '') + '" style="--act:' + esc(a.color || '#2E7D32') + '">' +
        thumb +
        '<div class="hn-act-body">' +
          '<div class="hn-act-top">' +
            '<span class="hn-act-type"><i class="' + tipo.icono + '"></i> ' + esc(tipo.nombre) + '</span>' +
            '<span class="hn-act-state">' + esc(it.estado.texto) + '</span>' +
          '</div>' +
          (it.mia ? '<span class="hn-act-mine"><i class="fas fa-star"></i> Para tu grado</span>' : '') +
          '<h3 class="hn-act-title">' + esc(a.titulo) + '</h3>' +
          '<p class="hn-act-desc">' + esc(a.descripcion) + '</p>' +
          chips +
          '<div class="hn-act-info"><span><i class="fas fa-user-graduate"></i> ' + esc(grTxt) + '</span>' + hasta + desdeProx + '</div>' +
          (botones ? '<div class="hn-act-actions">' + botones + '</div>' : '') +
        '</div>' +
      '</article>';
    }).join('');

    // Botones que abren la ficha en el visor de imágenes
    grid.querySelectorAll('button.hn-act-btn[data-act]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var it = lista[+btn.dataset.act];
        var b = it && it.a.botones[+btn.dataset.btn];
        if (!b) return;
        if (window.openImageModal) window.openImageModal(b.imagenModal, it.a.titulo, b.descarga);
        else window.open(b.imagenModal, '_blank', 'noopener');
      });
    });
  }

  /* ───────────── Juegos por Grupo ───────────── */
  var filtroGrupoJuegos = 'todos';

  function getGradesConJuegos() {
    var d = window.SCHOOL_DATA;
    if (!d || !d.grades) return [];
    return d.grades;
  }

  function seleccionarGrupoJuegos(gradeId, actualizarHash) {
    filtroGrupoJuegos = gradeId || 'todos';

    // Sincronizar pestañas
    document.querySelectorAll('.hn-grade-tab').forEach(function (t) {
      t.classList.toggle('active', t.dataset.gradeId === filtroGrupoJuegos);
    });

    renderJuegos();

    if (actualizarHash !== false && history.replaceState) {
      var h = filtroGrupoJuegos === 'todos' ? '#juegos' : '#juegos-' + filtroGrupoJuegos;
      history.replaceState(null, '', h);
    }
  }

  function renderFiltrosJuegos() {
    var grades = getGradesConJuegos();
    var tabsCont = document.getElementById('hn-juegos-grade-tabs');
    if (!tabsCont || !grades.length) return;

    var totalJuegos = grades.reduce(function (acc, g) { return acc + (g.games ? g.games.length : 0); }, 0);

    // Si el alumno está logueado y aún no se seleccionó grupo, sugerir su grado
    var st = alumno();
    if (st && st.gradeId && filtroGrupoJuegos === 'todos') {
      filtroGrupoJuegos = st.gradeId;
    }

    // Pestañas visuales
    var tabsHtml = '<button type="button" class="hn-grade-tab' + (filtroGrupoJuegos === 'todos' ? ' active' : '') + '" data-grade-id="todos">' +
      '<span class="tab-icon">⭐</span>' +
      '<span class="tab-name">Todos</span>' +
      '<span class="tab-count">' + totalJuegos + '</span>' +
    '</button>' +
    grades.map(function (g) {
      var count = (g.games || []).length;
      var on = g.id === filtroGrupoJuegos;
      return '<button type="button" class="hn-grade-tab' + (on ? ' active' : '') + '" data-grade-id="' + esc(g.id) + '" ' +
        'style="--tab-color:' + esc(g.color) + ';--tab-bg:' + esc(g.colorLight) + ';">' +
        '<span class="tab-icon">' + esc(g.icon || '🎮') + '</span>' +
        '<span class="tab-name">' + esc(g.shortName || g.name) + '</span>' +
        '<span class="tab-count">' + count + '</span>' +
      '</button>';
    }).join('');

    tabsCont.innerHTML = tabsHtml;

    tabsCont.querySelectorAll('.hn-grade-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        seleccionarGrupoJuegos(btn.dataset.gradeId);
      });
    });
  }

  function renderJuegos() {
    var grid = document.getElementById('hn-juegos-grid');
    var banner = document.getElementById('hn-juegos-banner');
    if (!grid) return;

    var grades = getGradesConJuegos();
    var st = alumno();
    var miGrado = st && st.gradeId;

    // 1. Renderizar banner dinámico de grupo
    if (banner) {
      if (filtroGrupoJuegos === 'todos') {
        banner.style.setProperty('--banner-accent', '#6A1B9A');
        banner.style.setProperty('--banner-bg', '#F3E5F5');
        banner.innerHTML =
          '<div class="hn-juegos-banner-left">' +
            '<div class="hn-juegos-banner-icon">🎮</div>' +
            '<div class="hn-juegos-banner-info">' +
              '<h3>Todos los Juegos del Taller</h3>' +
              '<p>Elegí arriba tu grupo para ver los juegos preparados y recomendados para tu edad y nivel.</p>' +
            '</div>' +
          '</div>' +
          (st ? '<div class="hn-juegos-banner-badge" style="background:' + (st.avatarBg || '#2E7D32') + '"><i class="fas fa-user-check"></i> Hola, ' + esc(st.name.split(' ')[0]) + ' (' + esc(st.gradeName) + ')</div>' : '');
      } else {
        var grSel = grades.find(function (g) { return g.id === filtroGrupoJuegos; });
        if (grSel) {
          banner.style.setProperty('--banner-accent', grSel.color);
          banner.style.setProperty('--banner-bg', grSel.colorLight);
          var esMiGrado = miGrado === grSel.id;
          banner.innerHTML =
            '<div class="hn-juegos-banner-left">' +
              '<div class="hn-juegos-banner-icon">' + esc(grSel.icon || '🎮') + '</div>' +
              '<div class="hn-juegos-banner-info">' +
                '<h3>' + esc(grSel.name) + (esMiGrado ? ' · ¡Tu grupo escolar!' : '') + '</h3>' +
                '<p>' + esc(grSel.description || 'Juegos y desafíos interactivos preparados para esta etapa.') + '</p>' +
              '</div>' +
            '</div>' +
            '<div class="hn-juegos-banner-badge" style="background:' + esc(grSel.color) + '"><i class="fas fa-gamepad"></i> ' + (grSel.games || []).length + ' juegos listos</div>';
        }
      }
    }

    // 2. Filtrar lista de juegos
    var listaGrados = (filtroGrupoJuegos === 'todos')
      ? grades
      : grades.filter(function (g) { return g.id === filtroGrupoJuegos; });

    var items = [];
    listaGrados.forEach(function (g) {
      (g.games || []).forEach(function (gm) {
        items.push({ game: gm, grade: g });
      });
    });

    if (!items.length) {
      grid.innerHTML = '<div class="hn-empty" style="grid-column:1/-1;"><span>⏳</span>Los juegos para este grupo se están preparando para la próxima clase.</div>';
      return;
    }

    grid.innerHTML = items.map(function (it) {
      var gm = it.game;
      var gr = it.grade;
      var pm = (window.platformMeta && window.platformMeta(gm.platform)) || { label: 'Juego', icon: '🎮', cls: 'pb-default' };
      var url = (window.getGameUrl && window.getGameUrl(gm)) || gm.externalUrl || '#';
      var ext = /^https?:/i.test(url);
      var thumb = gm.thumbnail || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80';

      var benefitsHtml = gm.benefits
        ? '<div class="game-card-benefits">' +
            '<div class="benefits-label"><i class="fas fa-lightbulb"></i> ¿Qué aprendemos?</div>' +
            '<p class="benefits-text">' + esc(gm.benefits) + '</p>' +
          '</div>'
        : '';

      var tagsHtml = (gm.tags && gm.tags.length)
        ? '<div class="game-card-tags">' +
            gm.tags.map(function (t) { return '<span class="post-tag">#' + esc(t) + '</span>'; }).join('') +
          '</div>'
        : '';

      return '<article class="game-grid-card">' +
        '<div class="game-card-thumb-wrap">' +
          '<img src="' + esc(thumb) + '" alt="' + esc(gm.title) + '" class="game-card-thumb" loading="lazy" onerror="this.src=\'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80\'">' +
          '<span class="game-card-badge ' + esc(pm.cls) + '">' + pm.icon + ' ' + esc(pm.label) + '</span>' +
          '<span class="hn-game-grade-pill" style="background:' + esc(gr.color) + '">' + esc(gr.icon + ' ' + (gr.shortName || gr.name)) + '</span>' +
        '</div>' +
        '<div class="game-card-body">' +
          '<h3 class="game-card-title">' + esc(gm.title) + '</h3>' +
          '<p class="game-card-desc">' + esc(gm.description || '') + '</p>' +
          benefitsHtml +
          tagsHtml +
        '</div>' +
        '<div class="game-card-footer">' +
          '<a href="' + esc(url) + '"' + (ext ? ' target="_blank" rel="noopener noreferrer"' : '') + ' class="btn-start-game" style="background:' + esc(gr.color) + ';" title="Jugar a ' + esc(gm.title) + '">' +
            '<span>Jugar ahora</span> <i class="fas fa-play"></i>' +
          '</a>' +
        '</div>' +
      '</article>';
    }).join('');
  }

  /* ───────────── Agenda ───────────── */
  function renderAgenda() {
    var cont = document.getElementById('hn-agenda-list');
    if (!cont) return;
    var h = hoy();
    var prox = (C.agenda || []).filter(function (e) { var d = parseFecha(e.fecha); return d && d >= h; })
      .sort(function (a, b) { return parseFecha(a.fecha) - parseFecha(b.fecha); })
      .slice(0, 6);

    if (!prox.length) {
      cont.innerHTML = '<div class="hn-empty small"><span>📅</span>No hay fechas próximas cargadas.</div>';
      return;
    }

    cont.innerHTML = prox.map(function (e) {
      var d = parseFecha(e.fecha);
      var n = diasEntre(h, d);
      var falta = n === 0 ? '¡Hoy!' : n === 1 ? 'Mañana' : 'En ' + n + ' días';
      return '<li class="hn-ag-item' + (n <= 7 ? ' soon' : '') + '">' +
        '<div class="hn-ag-date"><span class="d">' + d.getDate() + '</span><span class="m">' + MESES_CORTOS[d.getMonth()] + '</span></div>' +
        '<div class="hn-ag-body">' +
          '<strong>' + (e.icono ? esc(e.icono) + ' ' : '') + esc(e.titulo) + '</strong>' +
          (e.detalle ? '<span>' + esc(e.detalle) + '</span>' : '') +
        '</div>' +
        '<span class="hn-ag-left">' + falta + '</span>' +
      '</li>';
    }).join('');
  }

  /* ───────────── Muro de Actividades (Estilo Red Social / Feed) ───────────── */
  var filtroMediaMuro = 'todos';
  var filtroGradoMuro = 'todos';

  function getPostUrl(id) {
    var base = location.origin ? (location.origin + location.pathname) : location.href.split('#')[0];
    return base + '#post-' + id;
  }

  function showToast(msg) {
    var t = document.getElementById('hn-toast');
    if (!t) return;
    t.innerHTML = '<i class="fas fa-check-circle"></i> <span>' + esc(msg) + '</span>';
    t.classList.add('show');
    clearTimeout(t._hideTimer);
    t._hideTimer = setTimeout(function () {
      t.classList.remove('show');
    }, 3200);
  }

  function copiarEnlacePost(id) {
    var url = getPostUrl(id);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () {
        showToast('Enlace de la publicación copiado al portapapeles');
      }).catch(function () {
        window.prompt('Copia este enlace directo al post:', url);
      });
    } else {
      window.prompt('Copia este enlace directo al post:', url);
    }
  }

  function compartirPost(id) {
    var post = (C.muro || []).filter(function (p) { return p.id === id; })[0];
    if (!post) return;
    var url = getPostUrl(id);
    var previewText = (post.texto || '').length > 95 ? post.texto.substring(0, 95) + '...' : post.texto;
    if (navigator.share) {
      navigator.share({
        title: (post.autor || 'Muro del Taller') + ' · Colegio Paulo Freire',
        text: previewText,
        url: url
      }).catch(function (err) {
        if (err && err.name !== 'AbortError') {
          copiarEnlacePost(id);
        }
      });
    } else {
      copiarEnlacePost(id);
    }
  }

  function toYouTubeEmbed(url) {
    if (!url) return '';
    if (url.indexOf('youtube.com/embed/') !== -1) return url;
    var m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([\w-]{11})/);
    if (m && m[1]) {
      return 'https://www.youtube.com/embed/' + m[1];
    }
    return url;
  }

  function renderFiltrosMuro() {
    var sel = document.getElementById('hn-muro-grade-select');
    if (sel) {
      var html = '<option value="todos">Todos los grupos</option>';
      GRADOS.forEach(function (g) {
        html += '<option value="' + esc(g.id) + '">' + esc(g.name) + '</option>';
      });
      sel.innerHTML = html;
      sel.value = filtroGradoMuro;
      sel.onchange = function () {
        filtroGradoMuro = sel.value;
        renderMuro();
      };
    }

    var tabs = document.querySelectorAll('#hn-muro-media-filters button[data-muro-media]');
    tabs.forEach(function (btn) {
      btn.onclick = function () {
        filtroMediaMuro = btn.dataset.muroMedia;
        tabs.forEach(function (b) { b.classList.toggle('active', b === btn); });
        renderMuro();
      };
    });
  }

  function renderMuro() {
    var cont = document.getElementById('hn-muro-feed');
    if (!cont) return;

    var allPosts = (C.muro || []).slice().sort(function (a, b) {
      return parseFecha(b.fecha) - parseFecha(a.fecha);
    });

    // Conteo en pestañas
    var countTodos = allPosts.length;
    var countVideos = allPosts.filter(function (p) { return p.tipoMedia === 'video'; }).length;
    var countFotos = allPosts.filter(function (p) { return p.tipoMedia === 'galeria' || p.tipoMedia === 'foto'; }).length;

    var elTodos = document.getElementById('hn-muro-count-todos');
    if (elTodos) elTodos.textContent = countTodos;
    var elVideos = document.getElementById('hn-muro-count-videos');
    if (elVideos) elVideos.textContent = countVideos;
    var elFotos = document.getElementById('hn-muro-count-fotos');
    if (elFotos) elFotos.textContent = countFotos;

    // Filtros
    var filtered = allPosts.filter(function (p) {
      if (filtroGradoMuro !== 'todos' && p.grado !== filtroGradoMuro && p.grado !== 'todos') return false;
      if (filtroMediaMuro === 'video' && p.tipoMedia !== 'video') return false;
      if (filtroMediaMuro === 'galeria' && p.tipoMedia !== 'galeria' && p.tipoMedia !== 'foto') return false;
      return true;
    });

    if (!filtered.length) {
      cont.innerHTML =
        '<div class="hn-empty">' +
          '<i class="fas fa-filter" style="font-size:2rem;margin-bottom:10px;opacity:0.6;"></i>' +
          '<p>No hay publicaciones con los filtros seleccionados.</p>' +
          '<button type="button" class="hn-act-btn primary" onclick="window.resetMuroFilters()" style="margin-top:10px;">' +
            '<i class="fas fa-redo"></i> Restablecer filtros' +
          '</button>' +
        '</div>';
      return;
    }

    cont.innerHTML = filtered.map(function (p) {
      var postUrl = getPostUrl(p.id);
      var shareText = p.autor + ': ' + (p.texto || '').substring(0, 110) + '...\n' + postUrl;
      var avatarSrc = p.avatar || 'img/escudo_paulo_freire.png';

      // Multimedia
      var mediaHtml = '';
      if (p.tipoMedia === 'video' && p.video) {
        if (p.video.tipo === 'youtube') {
          var embedSrc = toYouTubeEmbed(p.video.url);
          mediaHtml =
            '<div class="hn-post-media">' +
              '<div class="hn-video-responsive">' +
                '<iframe src="' + esc(embedSrc) + '" title="' + esc((p.texto || '').slice(0, 50)) + '" ' +
                'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" ' +
                'allowfullscreen loading="lazy"></iframe>' +
              '</div>' +
            '</div>';
        } else if (p.video.url) {
          mediaHtml =
            '<div class="hn-post-media">' +
              '<video class="hn-video-player" controls preload="metadata"' + (p.video.poster ? ' poster="' + esc(p.video.poster) + '"' : '') + '>' +
                '<source src="' + esc(p.video.url) + '" type="video/mp4">' +
                'Tu navegador no soporta reproducción de video.' +
              '</video>' +
            '</div>';
        }
      } else if (p.fotos && p.fotos.length > 1) {
        var numCols = Math.min(p.fotos.length, 3);
        mediaHtml =
          '<div class="hn-post-media">' +
            '<div class="hn-post-gallery cols-' + numCols + '">' +
              p.fotos.map(function (f, idx) {
                return '<div class="gallery-item" data-photo="' + esc(f) + '" data-post-title="' + esc(p.autor) + '" role="button" tabindex="0" title="Ver foto en tamaño completo">' +
                  '<img src="' + esc(f) + '" alt="Foto ' + (idx + 1) + ' de ' + esc(p.autor) + '" loading="lazy">' +
                '</div>';
              }).join('') +
            '</div>' +
          '</div>';
      } else if ((p.fotos && p.fotos.length === 1) || p.imagen) {
        var singleImg = (p.fotos && p.fotos[0]) || p.imagen;
        mediaHtml =
          '<div class="hn-post-media">' +
            '<div class="hn-post-photo-single" data-photo="' + esc(singleImg) + '" data-post-title="' + esc(p.autor) + '" role="button" tabindex="0" title="Ver foto en tamaño completo">' +
              '<img src="' + esc(singleImg) + '" alt="' + esc(p.autor) + '" loading="lazy">' +
            '</div>' +
          '</div>';
      }

      var tagsHtml = (p.tags && p.tags.length)
        ? '<div class="hn-post-tags">' + p.tags.map(function (t) { return '<span>#' + esc(t) + '</span>'; }).join('') + '</div>'
        : '';

      return '<article class="hn-post-card" id="post-' + esc(p.id) + '">' +
        '<header class="hn-post-header">' +
          '<div class="hn-post-avatar-wrap">' +
            '<img class="hn-post-avatar" src="' + esc(avatarSrc) + '" alt="' + esc(p.autor) + '">' +
          '</div>' +
          '<div class="hn-post-meta">' +
            '<div class="hn-post-author-row">' +
              '<span class="hn-post-author">' + esc(p.autor) + '</span>' +
              '<span class="hn-post-verified" title="Publicación verificada del taller"><i class="fas fa-check-circle"></i></span>' +
              (p.etiqueta ? '<span class="hn-post-tag-badge">' + esc(p.etiqueta) + '</span>' : '') +
            '</div>' +
            '<div class="hn-post-sub-row">' +
              '<span class="hn-post-date"><i class="far fa-clock"></i> ' + esc(fechaRelativa(p.fecha)) + '</span>' +
              '<span class="hn-post-dot">·</span>' +
              '<span class="hn-post-grade">' + esc(nombreGrado(p.grado)) + '</span>' +
              '<span class="hn-post-dot">·</span>' +
              '<span class="hn-post-privacy" title="Público para toda la comunidad"><i class="fas fa-globe-americas"></i></span>' +
            '</div>' +
          '</div>' +
          '<div class="hn-post-top-action">' +
            '<button type="button" class="hn-post-opt-btn" onclick="window.copiarEnlacePost(\'' + esc(p.id) + '\')" title="Copiar enlace de esta publicación">' +
              '<i class="fas fa-link"></i>' +
            '</button>' +
          '</div>' +
        '</header>' +
        '<div class="hn-post-body">' +
          '<p class="hn-post-text">' + esc(p.texto) + '</p>' +
          tagsHtml +
        '</div>' +
        mediaHtml +
        '<footer class="hn-post-footer">' +
          '<div class="hn-post-actions-bar">' +
            '<button type="button" class="hn-post-action-btn hn-post-share-btn" onclick="window.compartirPost(\'' + esc(p.id) + '\')" title="Compartir actividad">' +
              '<i class="fas fa-share-alt"></i> <span>Compartir</span>' +
            '</button>' +
            '<button type="button" class="hn-post-action-btn hn-post-copy-btn" onclick="window.copiarEnlacePost(\'' + esc(p.id) + '\')" title="Copiar enlace al portapapeles">' +
              '<i class="fas fa-link"></i> <span>Copiar enlace</span>' +
            '</button>' +
            '<a class="hn-post-action-btn hn-post-wsp-btn" target="_blank" rel="noopener noreferrer" href="https://api.whatsapp.com/send?text=' + encodeURIComponent(shareText) + '" title="Compartir por WhatsApp">' +
              '<i class="fab fa-whatsapp"></i> <span>WhatsApp</span>' +
            '</a>' +
          '</div>' +
        '</footer>' +
      '</article>';
    }).join('');

    // Listener para abrir fotos en el lightbox si se tocan
    cont.querySelectorAll('[data-photo]').forEach(function (el) {
      var openPhoto = function () {
        var src = el.dataset.photo;
        var title = el.dataset.postTitle || 'Actividad en clase';
        if (window.openImageModal) {
          window.openImageModal(src, title);
        } else {
          window.open(src, '_blank');
        }
      };
      el.addEventListener('click', openPhoto);
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openPhoto();
        }
      });
    });
  }

  /* ───────────── Lector de noticias (modal) ───────────── */
  var reader, readerBody, lastFocus;

  function abrirNoticia(id, actualizarHash) {
    var n = noticias.filter(function (x) { return x.id === id; })[0];
    if (!n || !reader) return;
    lastFocus = document.activeElement;

    var galeria = (n.galeria || []).length
      ? '<div class="hn-reader-gallery">' + n.galeria.map(function (src) {
          return '<button type="button" class="hn-reader-thumb" data-src="' + esc(src) + '"><img src="' + esc(src) + '" alt="" loading="lazy"></button>';
        }).join('') + '</div>' : '';

    var links = (n.links || []).length
      ? '<div class="hn-reader-links">' + n.links.map(function (l) {
          var ext = /^https?:/i.test(l.url || '');
          return '<a class="hn-act-btn primary" href="' + esc(l.url) + '"' + (ext ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' +
            (l.icono ? '<i class="' + esc(l.icono) + '"></i> ' : '') + esc(l.texto) + '</a>';
        }).join('') + '</div>' : '';

    readerBody.innerHTML =
      '<div class="hn-reader-cover"><img src="' + esc(n.imagen) + '" alt=""></div>' +
      '<div class="hn-reader-content">' +
        '<div class="hn-card-meta">' + catBadge(n.categoria) + '<span class="hn-card-grade">' + esc(nombreGrado(n.grado)) + '</span></div>' +
        '<h2 id="hn-reader-title">' + esc(n.titulo) + '</h2>' +
        '<p class="hn-reader-lead">' + esc(n.bajada) + '</p>' +
        '<div class="hn-reader-date"><i class="far fa-calendar"></i> ' + esc(fechaLarga(n.fecha)) + '</div>' +
        (n.cuerpo || []).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') +
        galeria + links +
        '<div class="hn-reader-share">' +
          '<button type="button" class="hn-share-btn" id="hn-share-btn"><i class="fas fa-link"></i> Copiar enlace</button>' +
          '<a class="hn-share-btn wa" target="_blank" rel="noopener noreferrer" href="https://wa.me/?text=' +
            encodeURIComponent(n.titulo + ' — ' + location.href.split('#')[0] + '#noticia-' + n.id) + '"><i class="fab fa-whatsapp"></i> Compartir</a>' +
        '</div>' +
      '</div>';

    readerBody.querySelectorAll('.hn-reader-thumb').forEach(function (t) {
      t.addEventListener('click', function () {
        if (window.openImageModal) window.openImageModal(t.dataset.src, n.titulo);
        else window.open(t.dataset.src, '_blank', 'noopener');
      });
    });
    var share = document.getElementById('hn-share-btn');
    if (share) share.addEventListener('click', function () {
      var url = location.href.split('#')[0] + '#noticia-' + n.id;
      var done = function () { share.innerHTML = '<i class="fas fa-check"></i> ¡Copiado!'; };
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, done); else done();
    });

    reader.classList.add('open');
    reader.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    reader.querySelector('.hn-reader-dialog').scrollTop = 0;
    var close = document.getElementById('hn-reader-close');
    if (close) close.focus();
    if (actualizarHash !== false && history.replaceState) history.replaceState(null, '', '#noticia-' + n.id);
  }

  function cerrarNoticia() {
    if (!reader || !reader.classList.contains('open')) return;
    reader.classList.remove('open');
    reader.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (/^#noticia-/.test(location.hash) && history.replaceState) history.replaceState(null, '', location.pathname + location.search);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function initReader() {
    reader = document.getElementById('hn-reader');
    readerBody = document.getElementById('hn-reader-body');
    if (!reader) return;
    document.getElementById('hn-reader-close').addEventListener('click', cerrarNoticia);
    reader.addEventListener('click', function (e) { if (e.target === reader) cerrarNoticia(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !document.querySelector('#image-lightbox-modal.active')) cerrarNoticia();
    });

    // Delegación: cualquier elemento con data-noticia abre la nota
    document.addEventListener('click', function (e) {
      var el = e.target.closest('[data-noticia]');
      if (el) abrirNoticia(el.dataset.noticia);
    });
    document.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-noticia]')) {
        e.preventDefault();
        abrirNoticia(e.target.dataset.noticia);
      }
    });

    var m = location.hash.match(/^#noticia-(.+)$/);
    if (m) {
      switchView('noticias', false);
      abrirNoticia(decodeURIComponent(m[1]), false);
    }
  }

  /* ───────────── Vistas por Pestañas (Diferentes DIVs) ───────────── */
  var VALID_VIEWS = ['inicio', 'noticias', 'clase', 'casa', 'juegos', 'muro', 'agenda'];

  function switchView(viewName, updateHash) {
    // Si el alumno está logueado, mantener foco exclusivo en el panel de Drive
    if (document.body.classList.contains('student-logged-in')) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Compatibilidad si se solicita "actividades"
    if (viewName === 'actividades') viewName = 'clase';
    if (VALID_VIEWS.indexOf(viewName) === -1) viewName = 'inicio';

    // 1. Mostrar únicamente el DIV correspondiente
    var views = document.querySelectorAll('.hn-view');
    views.forEach(function (v) {
      v.classList.toggle('active', v.id === 'view-' + viewName);
    });

    // 2. Marcar como activo el link del menú
    var links = document.querySelectorAll('.topbar-nav-link[data-view]');
    links.forEach(function (l) {
      l.classList.toggle('active', l.dataset.view === viewName);
    });

    // 3. Cerrar menú móvil
    var nav = document.getElementById('topbar-nav');
    if (nav) nav.classList.remove('mobile-open');

    // 4. Actualizar hash en la URL
    if (updateHash !== false) {
      if (history.replaceState) {
        history.replaceState(null, '', '#' + viewName);
      } else {
        location.hash = '#' + viewName;
      }
    }

    // 5. Posicionar arriba
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleHash() {
    if (document.body.classList.contains('student-logged-in')) return;
    var raw = location.hash.replace(/^#/, '');
    if (!raw) return;
    if (/^noticia-/.test(raw)) {
      switchView('noticias', false);
      abrirNoticia(raw.replace(/^noticia-/, ''), false);
    } else if (/^post-(.+)$/.test(raw)) {
      var pid = raw.replace(/^post-/, '');
      switchView('muro', false);
      setTimeout(function () {
        var target = document.getElementById('post-' + pid);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          target.classList.add('hn-post-highlight');
          setTimeout(function () { target.classList.remove('hn-post-highlight'); }, 2500);
        }
      }, 200);
    } else if (raw === 'clase' || raw === 'actividades-clase' || raw === 'actividades') {
      switchView('clase', false);
    } else if (raw === 'casa' || raw === 'actividades-casa') {
      switchView('casa', false);
    } else if (raw === 'muro') {
      switchView('muro', false);
    } else if (/^juegos(?:-(.+))?$/.test(raw)) {
      var m = raw.match(/^juegos(?:-(.+))?$/);
      switchView('juegos', false);
      if (m && m[1]) seleccionarGrupoJuegos(m[1], false);
    } else if (VALID_VIEWS.indexOf(raw) !== -1) {
      switchView(raw, false);
    }
  }

  /* ───────────── Navegación ───────────── */
  function initNav() {
    var mobBtn = document.getElementById('mobile-menu-btn');
    var nav = document.getElementById('topbar-nav');
    if (mobBtn && nav) {
      mobBtn.addEventListener('click', function () { nav.classList.toggle('mobile-open'); });
    }

    // Click en cualquier enlace con data-view
    document.querySelectorAll('[data-view]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        switchView(el.dataset.view);
      });
    });

    // Sincronizar con el historial del navegador (atrás / adelante)
    window.addEventListener('hashchange', handleHash);

    // Si al iniciar hay un hash en la URL, activar esa vista
    if (location.hash) {
      handleHash();
    }
  }

  /* ───────────── Arranque ───────────── */
  function init() {
    renderMasthead();
    renderTicker();
    renderDestacada();
    renderFiltrosNoticias();
    renderNoticias();
    renderFiltrosActividades();
    renderActividades();
    renderFiltrosJuegos();
    renderJuegos();
    renderFiltrosMuro();
    renderMuro();
    renderAgenda();
    initReader();
    initNav();

    var more = document.getElementById('hn-news-more');
    if (more) more.addEventListener('click', function () { visibles += POR_PAGINA; renderNoticias(); });

    // Si el alumno inicia/cierra sesión, se reordenan las actividades y sincronizan selects
    window.addEventListener('student_session_changed', function () {
      var st = alumno();
      if (st && st.gradeId) {
        filtroGradoAct = st.gradeId;
        ['hn-clase-grade', 'hn-casa-grade'].forEach(function (id) {
          var sel = document.getElementById(id);
          if (sel) sel.value = st.gradeId;
        });
        seleccionarGrupoJuegos(st.gradeId, false);
      }
      renderActividades();
      renderJuegos();
    });

    if (window.renderGDriveDashboard && alumno()) {
      window.renderGDriveDashboard('student-drive-dashboard-container');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.openNoticia = abrirNoticia;
  window.switchView = switchView;
  window.showActividades = function (sec) { switchView(sec === 'casa' ? 'casa' : 'clase'); };
  window.showJuegos = function (gradeId) { switchView('juegos'); if (gradeId) seleccionarGrupoJuegos(gradeId); };
  window.seleccionarGrupoJuegos = seleccionarGrupoJuegos;
  window.compartirPost = compartirPost;
  window.copiarEnlacePost = copiarEnlacePost;
  window.resetMuroFilters = function () {
    filtroMediaMuro = 'todos';
    filtroGradoMuro = 'todos';
    var sel = document.getElementById('hn-muro-grade-select');
    if (sel) sel.value = 'todos';
    document.querySelectorAll('#hn-muro-media-filters button[data-muro-media]').forEach(function (b) {
      b.classList.toggle('active', b.dataset.muroMedia === 'todos');
    });
    renderMuro();
  };
})();
