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
    casa:    { nombre: 'De casa',     icono: 'fas fa-house-user' },
    familia: { nombre: 'En familia',  icono: 'fas fa-heart' },
    taller:  { nombre: 'En el taller', icono: 'fas fa-tools' }
  };

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

  /* ───────────── Actividades ───────────── */
  var filtroTipo = 'todas';
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

  function renderFiltrosActividades() {
    var cont = document.getElementById('hn-act-tabs');
    if (!cont) return;
    var tabs = [{ id: 'todas', nombre: 'Todas', icono: 'fas fa-th-large' }].concat(
      Object.keys(TIPOS).map(function (k) { return { id: k, nombre: TIPOS[k].nombre, icono: TIPOS[k].icono }; })
    );
    cont.innerHTML = tabs.map(function (t) {
      var n = t.id === 'todas' ? (C.actividades || []).length : (C.actividades || []).filter(function (a) { return a.tipo === t.id; }).length;
      return '<button type="button" class="hn-tab' + (t.id === filtroTipo ? ' active' : '') + '" data-tipo="' + t.id + '">' +
        '<i class="' + t.icono + '"></i> ' + esc(t.nombre) + ' <span class="hn-tab-count">' + n + '</span></button>';
    }).join('');
    cont.querySelectorAll('.hn-tab').forEach(function (b) {
      b.addEventListener('click', function () {
        filtroTipo = b.dataset.tipo;
        renderFiltrosActividades();
        renderActividades();
      });
    });

    var sel = document.getElementById('hn-act-grade');
    if (sel && !sel.options.length) {
      sel.innerHTML = '<option value="todos">Todos los grados</option>' +
        GRADOS.map(function (g) { return '<option value="' + esc(g.id) + '">' + esc(g.name) + '</option>'; }).join('');
      sel.addEventListener('change', function () {
        filtroGradoAct = sel.value;
        renderActividades();
      });
    }
  }

  function renderActividades() {
    var grid = document.getElementById('hn-act-grid');
    if (!grid) return;
    var st = alumno();
    var miGrado = st && st.gradeId;

    var lista = (C.actividades || []).filter(function (a) {
      var gr = a.grados || ['todos'];
      var okTipo = filtroTipo === 'todas' || a.tipo === filtroTipo;
      var okGr = filtroGradoAct === 'todos' || gr.indexOf('todos') > -1 || gr.indexOf(filtroGradoAct) > -1;
      return okTipo && okGr;
    }).map(function (a) {
      var gr = a.grados || ['todos'];
      return { a: a, estado: estadoActividad(a), mia: !!(miGrado && gr.indexOf(miGrado) > -1) };
    }).sort(function (x, y) {
      var ex = ORDEN_ESTADO[x.estado.clave] - ORDEN_ESTADO[y.estado.clave];
      if (ex) return ex;
      if (x.mia !== y.mia) return x.mia ? -1 : 1;
      return (parseFecha(y.a.desde) || 0) - (parseFecha(x.a.desde) || 0);
    });

    if (!lista.length) {
      grid.innerHTML = '<div class="hn-empty"><span>🧩</span>No hay actividades con ese filtro.</div>';
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
    if (m) abrirNoticia(decodeURIComponent(m[1]), false);
  }

  /* ───────────── Navegación (menú móvil + link activo) ───────────── */
  function initNav() {
    var mobBtn = document.getElementById('mobile-menu-btn');
    var nav = document.getElementById('topbar-nav');
    if (mobBtn && nav) {
      mobBtn.addEventListener('click', function () { nav.classList.toggle('mobile-open'); });
      nav.querySelectorAll('a').forEach(function (a) {
        a.addEventListener('click', function () { nav.classList.remove('mobile-open'); });
      });
    }

    var links = document.querySelectorAll('.topbar-nav-link[data-section]');
    if (!('IntersectionObserver' in window) || !links.length) return;
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (l) { l.classList.toggle('active', l.dataset.section === en.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    links.forEach(function (l) {
      var sec = document.getElementById(l.dataset.section);
      if (sec) obs.observe(sec);
    });
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
    renderAgenda();
    initReader();
    initNav();

    var more = document.getElementById('hn-news-more');
    if (more) more.addEventListener('click', function () { visibles += POR_PAGINA; renderNoticias(); });

    // Si el alumno inicia/cierra sesión, se reordenan las actividades
    window.addEventListener('student_session_changed', renderActividades);

    if (window.renderGDriveDashboard && alumno()) {
      window.renderGDriveDashboard('student-drive-dashboard-container');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.openNoticia = abrirNoticia;
})();
