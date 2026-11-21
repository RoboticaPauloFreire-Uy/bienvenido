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

  function normalizarGrado(g) {
    if (!g) return 'todos';
    var s = String(g).toLowerCase().trim();
    if (s === 'todos' || s.indexOf('todo') !== -1) return 'todos';
    if (s === 'sala5' || s.indexOf('sala') !== -1) return 'sala5';
    if (s === 'grado1' || s === '1ro' || s.indexOf('1') !== -1) return 'grado1';
    if (s === 'grado2' || s === '2do' || s.indexOf('2') !== -1) return 'grado2';
    if (s === 'grado3' || s === '3ro' || s.indexOf('3') !== -1) return 'grado3';
    if (s === 'grado4' || s === '4to' || s.indexOf('4') !== -1) return 'grado4';
    if (s === 'grado5' || s === '5to' || s.indexOf('5') !== -1) return 'grado5';
    if (s === 'grado6' || s === '6to' || s.indexOf('6') !== -1) return 'grado6';
    return s;
  }

  function parseGradesFromText(text) {
    if (!text) return ['todos'];
    var t = String(text).toLowerCase();
    if (t.indexOf('todo') !== -1 || t.indexOf('colegio') !== -1) return ['todos'];
    var found = [];
    if (t.indexOf('sala') !== -1) found.push('sala5');
    if (t.indexOf('1') !== -1) found.push('grado1');
    if (t.indexOf('2') !== -1) found.push('grado2');
    if (t.indexOf('3') !== -1) found.push('grado3');
    if (t.indexOf('4') !== -1) found.push('grado4');
    if (t.indexOf('5') !== -1) found.push('grado5');
    if (t.indexOf('6') !== -1) found.push('grado6');
    return found.length ? found : ['todos'];
  }

  /* ───────────── Sanitización de Textos (Evitar caracteres corruptos / ? / mojibake) ───────────── */
  function sanearTexto(str) {
    if (!str || typeof str !== 'string') return str;
    var s = str;
    // 1. Corregir patrones conocidos con signos de interrogación erróneos
    s = s.replace(/C\?mara/g, 'Cámara')
         .replace(/c\?mara/g, 'cámara')
         .replace(/ingres\?/g, 'ingresá')
         .replace(/pel\?cula/g, 'película')
         .replace(/pel\?culas/g, 'películas')
         .replace(/orbita/gi, 'órbita')
         .replace(/360\?/g, '360°')
         .replace(/sat[áa\?]lite/gi, 'satélite')
         .replace(/arm[óo\?]\s+paso/gi, 'armá paso')
         .replace(/Dise[ñn]o\s+tus\s+propios/gi, 'Diseñá tus propios')
         .replace(/explorar\s+movimientos/gi, 'explorá movimientos')
         .replace(/\s+\?\s+/g, ' — ')
         .replace(/\?\?\s*Cine/g, '🎬 Cine')
         .replace(/\?\?\s*Movimientos/g, '🎥 Movimientos')
         .replace(/\?\?\s*Estilos/g, '💡 Estilos')
         .replace(/\?\?\?\s*Guard/g, '💾 Guard')
         .replace(/^!Entrar/g, '¡Entrar')
         .replace(/\bqu\?\b/gi, 'qué')
         .replace(/\bc\?mo\b/gi, 'cómo')
         .replace(/\bcu\?l\b/gi, 'cuál')
         .replace(/\bm\?s\b/gi, 'más')
         .replace(/\btambi\?n\b/gi, 'también');

    // 2. Corregir mojibake UTF-8 decodificado como Windows-1252 / ISO-8859-1
    s = s.replace(/Ã¡/g, 'á')
         .replace(/Ã©/g, 'é')
         .replace(/Ã­/g, 'í')
         .replace(/Ã³/g, 'ó')
         .replace(/Ãº/g, 'ú')
         .replace(/Ã±/g, 'ñ')
         .replace(/Ã /g, 'Á')
         .replace(/Ã‰/g, 'É')
         .replace(/Ã /g, 'Í')
         .replace(/Ã“/g, 'Ó')
         .replace(/Ãš/g, 'Ú')
         .replace(/Ã‘/g, 'Ñ')
         .replace(/â€”/g, '—')
         .replace(/â€“/g, '–')
         .replace(/â€œ/g, '“')
         .replace(/â€/g, '”')
         .replace(/â€˜/g, '‘')
         .replace(/â€™/g, '’');
    return s;
  }

  function sanearObjetoActividad(act) {
    if (!act) return act;
    if (act.titulo) act.titulo = sanearTexto(act.titulo);
    if (act.subtitulo) act.subtitulo = sanearTexto(act.subtitulo);
    if (act.descripcion) act.descripcion = sanearTexto(act.descripcion);
    if (act.materiales) act.materiales = sanearTexto(act.materiales);
    if (Array.isArray(act.chips)) {
      act.chips = act.chips.map(sanearTexto);
    }
    if (Array.isArray(act.botones)) {
      act.botones.forEach(function (b) {
        if (b && b.texto) b.texto = sanearTexto(b.texto);
      });
    }
    return act;
  }

  function esc(s) {
    s = sanearTexto(s);
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function formatMarkdown(raw) {
    if (!raw) return '';
    var s = String(raw).trim();
    if (!s) return '';

    // Si marked.js está cargado, usarlo
    if (typeof window.marked !== 'undefined' && typeof window.marked.parse === 'function') {
      try {
        return window.marked.parse(s, { breaks: true, gfm: true });
      } catch (e) {}
    }

    // Separación inteligente de secciones y pasos si el texto viene sin saltos de línea
    if ((s.match(/\n/g) || []).length < 2) {
      s = s.replace(/([^\n])\s+([📌🛠️💡🚀⚡🎯📦🎨🎮]\s*)/g, '$1\n\n$2');
      s = s.replace(/([^\n])\s+(\d+[\.\)]\s+)/g, '$1\n$2');
    }

    // Escapar caracteres peligrosos
    var safe = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Bloques de código multilínea ```lenguaje ... ```
    var codeBlocks = [];
    safe = safe.replace(/```([a-zA-Z0-9_\-\.]*)\r?\n([\s\S]*?)```/g, function (match, lang, code) {
      var ph = '___CODEBLOCK_' + codeBlocks.length + '___';
      codeBlocks.push('<pre class="hn-code-block"><code' + (lang ? ' class="language-' + lang + '"' : '') + '>' + code.trim() + '</code></pre>');
      return '\n\n' + ph + '\n\n';
    });

    // Títulos Markdown
    safe = safe.replace(/^### (.*$)/gim, '<h4>$1</h4>');
    safe = safe.replace(/^## (.*$)/gim, '<h3>$1</h3>');
    safe = safe.replace(/^# (.*$)/gim, '<h3>$1</h3>');

    // Negrita y cursiva
    safe = safe.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    safe = safe.replace(/__(.*?)__/g, '<strong>$1</strong>');
    safe = safe.replace(/\*(.*?)\*/g, '<em>$1</em>');
    safe = safe.replace(/_([^_]+)_/g, '<em>$1</em>');

    // Código en línea
    safe = safe.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Enlaces Markdown [texto](url)
    safe = safe.replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // Enlaces directos http(s):// que no estén ya dentro de un atributo href
    safe = safe.replace(/(^|[^"'])(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>');

    // Procesar líneas, listas y párrafos
    var lines = safe.split(/\r?\n/);
    var inUl = false, inOl = false, html = [];

    for (var i = 0; i < lines.length; i++) {
      var l = lines[i].trim();
      if (!l) {
        if (inUl) { html.push('</ul>'); inUl = false; }
        if (inOl) { html.push('</ol>'); inOl = false; }
        continue;
      }

      // Restaurar bloques de código
      if (l.indexOf('___CODEBLOCK_') === 0) {
        if (inUl) { html.push('</ul>'); inUl = false; }
        if (inOl) { html.push('</ol>'); inOl = false; }
        var cbIdx = parseInt(l.replace('___CODEBLOCK_', '').replace('___', ''), 10);
        if (!isNaN(cbIdx) && codeBlocks[cbIdx]) {
          html.push(codeBlocks[cbIdx]);
          continue;
        }
      }

      // Viñetas: - item o * item o • item
      var ulM = l.match(/^[-*•]\s+(.*)/);
      if (ulM) {
        if (inOl) { html.push('</ol>'); inOl = false; }
        if (!inUl) { html.push('<ul>'); inUl = true; }
        var itemContent = ulM[1].replace(/^([^:]+):/g, '<strong>$1:</strong>');
        html.push('<li>' + itemContent + '</li>');
        continue;
      }

      // Listas numeradas: 1. item o 1) item
      var olM = l.match(/^(\d+)[\.\)]\s+(.*)/);
      if (olM) {
        if (inUl) { html.push('</ul>'); inUl = false; }
        if (!inOl) { html.push('<ol>'); inOl = true; }
        var stepContent = olM[2].replace(/^([^:]+):/g, '<strong>$1:</strong>');
        html.push('<li>' + stepContent + '</li>');
        continue;
      }

      if (inUl) { html.push('</ul>'); inUl = false; }
      if (inOl) { html.push('</ol>'); inOl = false; }

      if (/^<h[1-6]>/.test(l)) {
        html.push(l);
      } else if (l.indexOf('&gt; ') === 0) {
        html.push('<blockquote>' + l.substring(5) + '</blockquote>');
      } else {
        html.push('<p>' + l + '</p>');
      }
    }

    if (inUl) html.push('</ul>');
    if (inOl) html.push('</ol>');

    return html.join('');
  }

  function stripMarkdown(raw) {
    if (!raw) return '';
    var s = String(raw).trim();
    if (!s) return '';
    return s
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/#{1,6}\s+/g, '')
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      .replace(/(\*|_)(.*?)\1/g, '$2')
      .replace(/~~(.*?)~~/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/^\s*[-*•+]\s+/gm, '')
      .replace(/^\s*\d+[\.\)]\s+/gm, '')
      .replace(/^\s*>\s+/gm, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function parseFecha(s) {
    if (!s) return null;
    if (s instanceof Date) return isNaN(s.getTime()) ? null : s;
    if (typeof s === 'number') {
      var d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    }
    var str = String(s).trim();
    if (!str) return null;
    if (/^\d{4}-\d{1,2}-\d{1,2}/.test(str)) {
      var p = str.split('T')[0].split('-');
      var d = new Date(+p[0], (+p[1] || 1) - 1, +p[2] || 1);
      return isNaN(d.getTime()) ? null : d;
    }
    var d2 = new Date(str);
    if (!isNaN(d2.getTime())) return d2;
    return null;
  }

  function hoy() {
    var d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function diasEntre(a, b) { return Math.round((b - a) / 86400000); }

  function fechaLarga(s) {
    var d = parseFecha(s);
    if (!d || isNaN(d.getTime())) return String(s || '');
    var m = MESES[d.getMonth()];
    return d.getDate() + ' de ' + (m || '') + ' de ' + d.getFullYear();
  }

  function fechaRelativa(s) {
    var d = parseFecha(s);
    if (!d || isNaN(d.getTime())) return String(s || 'Reciente');
    var n = diasEntre(d, hoy());
    if (n === 0) return 'Hoy';
    if (n === 1) return 'Ayer';
    if (n > 1 && n < 7) return 'Hace ' + n + ' días';
    var m = MESES[d.getMonth()];
    return d.getDate() + ' ' + (m ? m.slice(0, 3) : '') + ' ' + d.getFullYear();
  }

  function alumno() {
    try { return window.getActiveStudent ? window.getActiveStudent() : null; } catch (e) { return null; }
  }

  function catBadge(cat) {
    var c = CATEGORIAS[cat] || { nombre: cat, icono: '📰', color: '#455A64' };
    return '<span class="hn-cat" style="--cat:' + c.color + '">' + c.icono + ' ' + esc(c.nombre) + '</span>';
  }

  var noticias = [];
  function refrescarNoticias() {
    noticias = (C.noticias || []).slice().sort(function (a, b) {
      var fa = parseFecha(a.fecha);
      var fb = parseFecha(b.fecha);
      var ta = fa ? fa.getTime() : (a._time || 0);
      var tb = fb ? fb.getTime() : (b._time || 0);
      return tb - ta;
    });
  }
  refrescarNoticias();

  /* ───────────── Cabecera Estación de Mando ───────────── */
  function renderMasthead() {
    var el = document.getElementById('hn-masthead-date');
    if (el) {
      var d = new Date();
      var txt = DIAS[d.getDay()] + ', ' + d.getDate() + ' de ' + MESES[d.getMonth()] + ' de ' + d.getFullYear();
      el.textContent = txt.charAt(0).toUpperCase() + txt.slice(1);
    }

    var stats = document.getElementById('hn-masthead-stats');
    if (stats) {
      var activas = (C.actividades || []).filter(function (a) { var s = estadoActividad(a).clave; return s === 'nueva' || s === 'curso'; }).length;
      stats.innerHTML =
        '<span class="fb-stat-pill">📰 <strong>' + noticias.length + '</strong> Historias</span>' +
        '<span class="np-stat-sep">·</span>' +
        '<span class="fb-stat-pill">⚡ <strong>' + activas + '</strong> Misiones Activas</span>';
    }
  }

  /* ───────────── Radar FreireBot (ticker con noticias y avisos) ───────────── */
  function renderTicker() {
    var wrap = document.getElementById('hn-ticker');
    var track = document.getElementById('hn-ticker-track');
    if (!wrap || !track) return;
    var avisos = C.avisos || [];
    if (!avisos.length && !noticias.length) { wrap.style.display = 'none'; return; }

    var itemsHtml = [];

    // 1. Titulares de las últimas noticias (haciendo clic se abre en la micro:bit)
    noticias.slice(0, 6).forEach(function (n) {
      itemsHtml.push(
        '<span class="hn-ticker-item np-ticker-news fb-radar-item" data-noticia="' + esc(n.id) + '" role="button" tabindex="0" title="Leer: ' + esc(n.titulo) + '">' +
          '🤖 ' +
          '<strong>[' + esc(nombreGrado(n.grado)).toUpperCase() + ']</strong> ' +
          esc(n.titulo) +
        '</span>'
      );
    });

    // 2. Avisos del taller
    avisos.forEach(function (a) {
      itemsHtml.push(
        '<span class="hn-ticker-item np-ticker-aviso fb-radar-item">' +
          '⚡ ' +
          esc(a) +
        '</span>'
      );
    });

    var htmlString = itemsHtml.join('');
    // Se duplica para desplazamiento continuo infinito
    track.innerHTML = htmlString + htmlString;
    var duracion = Math.max(26, itemsHtml.length * 8.5);
    track.style.animationDuration = duracion + 's';
  }

  /* ───────────── Destacada + más aventuras (Estación FreireBot) ───────────── */
  function renderDestacada() {
    var main = document.getElementById('hn-featured-main');
    var side = document.getElementById('hn-featured-side');
    if (!main || !side) return;
    if (!noticias.length) {
      main.innerHTML = '<div class="hn-empty"><span>🤖</span>Todavía no hay historias publicadas en la estación.</div>';
      side.innerHTML = '';
      return;
    }
    // 1. Historia Estrella: la más reciente marcada como destacada o la primera
    var dest = noticias.filter(function (n) { return n.destacada; })[0] || noticias[0];
    var cat = CATEGORIAS[dest.categoria] || { nombre: dest.categoria || 'Taller', icono: '📰', color: '#2563EB' };

    var primerTexto = '';
    if (dest.bajada) {
      primerTexto = dest.bajada;
    } else if (Array.isArray(dest.cuerpo) && dest.cuerpo.length > 0) {
      primerTexto = dest.cuerpo[0];
    } else if (typeof dest.cuerpo === 'string') {
      primerTexto = dest.cuerpo;
    }
    var textoLimpio = stripMarkdown(String(primerTexto).replace(/<[^>]*>?/gm, '')).trim();
    if (textoLimpio.length > 185) {
      textoLimpio = textoLimpio.substring(0, 185).trim() + '...';
    }

    main.innerHTML =
      '<article class="fb-hero-card" data-noticia="' + esc(dest.id) + '" tabindex="0" role="button" aria-label="Leer: ' + esc(dest.titulo) + '">' +
        '<div class="fb-hero-top">' +
          '<span class="fb-hero-badge">🌟 ¡HISTORIA ESTRELLA!</span>' +
          '<span class="fb-hero-cat">' + cat.icono + ' ' + esc(cat.nombre) + '</span>' +
          '<span class="fb-hero-grade">🎓 ' + esc(nombreGrado(dest.grado)) + '</span>' +
        '</div>' +
        '<div class="fb-hero-media">' +
          '<img class="fb-hero-img" src="' + esc(dest.imagen || 'img/bienvenida_taller.jpg') + '" alt="' + esc(dest.titulo) + '" loading="eager" onerror="this.src=\'img/bienvenida_taller.jpg\'">' +
          '<span class="fb-hero-sticker">🤖 ¡Tocá para abrir en la micro:bit!</span>' +
        '</div>' +
        '<div class="fb-hero-body">' +
          '<h2 class="fb-hero-title">' + esc(dest.titulo) + '</h2>' +
          '<div class="fb-hero-bubble">' +
            '<div class="fb-hero-bot-avatar" aria-hidden="true">🤖</div>' +
            '<div class="fb-hero-speech"><p>' + esc(textoLimpio || '¡Descubrí esta aventura del taller!') + '</p></div>' +
          '</div>' +
          '<div class="fb-hero-foot">' +
            '<span class="fb-hero-date">🕒 ' + esc(fechaLarga(dest.fecha) || fechaRelativa(dest.fecha)) + '</span>' +
            '<span class="fb-hero-cta">🚀 ¡Leer Historia Completa!</span>' +
          '</div>' +
        '</div>' +
      '</article>';

    // 2. Columna lateral: más aventuras del taller
    var otras = noticias.filter(function (n) { return n !== dest; }).slice(0, 3);

    side.innerHTML =
      '<div class="fb-side-head">' +
        '<h3 class="fb-side-title">⚡ ¡MÁS AVENTURAS DEL TALLER!</h3>' +
        '<p class="fb-side-sub">Tocá cualquier tarjeta para abrirla en la placa micro:bit</p>' +
      '</div>' +
      '<div class="fb-side-list">' +
        otras.map(function (n) {
          return '<article class="fb-side-card" data-noticia="' + esc(n.id) + '" tabindex="0" role="button" aria-label="Leer: ' + esc(n.titulo) + '">' +
            '<div class="fb-side-thumb">' +
              '<img src="' + esc(n.imagen || 'img/bienvenida_taller.jpg') + '" alt="" loading="lazy" onerror="this.src=\'img/bienvenida_taller.jpg\'">' +
            '</div>' +
            '<div class="fb-side-info">' +
              '<div class="fb-side-meta">' +
                '<span class="fb-side-grade">🎓 ' + esc(nombreGrado(n.grado)) + '</span>' +
                '<span class="fb-side-date">🕒 ' + esc(fechaRelativa(n.fecha)) + '</span>' +
              '</div>' +
              '<h4 class="fb-side-card-title">' + esc(n.titulo) + '</h4>' +
              '<div class="fb-side-foot">' +
                '<span class="fb-side-btn">¡Ver! ➔</span>' +
              '</div>' +
            '</div>' +
          '</article>';
        }).join('') +
      '</div>';
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
    grid.classList.add('comic-page-grid');

    var lista = noticias.filter(function (n) {
      var okCat = filtroCat === 'todas' || n.categoria === filtroCat;
      var okGr = filtroGradoNews === 'todos' || n.grado === filtroGradoNews || n.grado === 'todos';
      return okCat && okGr;
    });

    if (!lista.length) {
      grid.innerHTML = '<div class="hn-empty" style="grid-column:1/-1;"><span>🔎</span>No hay noticias con ese filtro todavía.</div>';
      if (more) more.style.display = 'none';
      return;
    }

    var comicThemes = ['comic-theme-yellow', 'comic-theme-cyan', 'comic-theme-magenta', 'comic-theme-emerald'];
    var comicBursts = ['💥 ¡ESTRENO!', '⚡ ¡MIRÁ!', '🚀 ¡GENIAL!', '🏆 ¡ÉPICO!', '🤖 ¡WOW!', '🎉 ¡NUEVO!'];

    grid.innerHTML = lista.slice(0, visibles).map(function (n, idx) {
      var cat = CATEGORIAS[n.categoria] || { nombre: n.categoria, icono: '📰', color: '#991B1B' };
      var numFormateado = (idx + 1 < 10 ? '0' : '') + (idx + 1);
      var isSplash = (idx === 0);
      var themeCls = comicThemes[idx % comicThemes.length];
      var burstTxt = comicBursts[idx % comicBursts.length];
      var resumenTxt = n.bajada || (Array.isArray(n.cuerpo) ? n.cuerpo[0] : (n.cuerpo || '¡Descubrí esta historia del taller!'));

      return '<article class="comic-panel ' + themeCls + (isSplash ? ' is-splash' : '') + '" data-noticia="' + esc(n.id) + '" tabindex="0" role="button">' +
        '<div class="comic-caption-bar">' +
          '<span class="comic-panel-num">' + cat.icono + ' ¡' + esc((cat.nombre || 'TALLER').toUpperCase()) + '!</span>' +
          '<span class="comic-panel-grade"><i class="fas fa-graduation-cap"></i> ' + esc(nombreGrado(n.grado)) + '</span>' +
        '</div>' +
        '<div class="comic-art-wrap">' +
          '<img src="' + esc(n.imagen || 'img/bienvenida_taller.jpg') + '" alt="' + esc(n.titulo) + '" loading="lazy" onerror="this.src=\'img/bienvenida_taller.jpg\'">' +
          '<div class="comic-halftone-overlay" aria-hidden="true"></div>' +
          '<span class="comic-burst-sticker">' + burstTxt + '</span>' +
        '</div>' +
        '<div class="comic-panel-body">' +
          '<h3 class="comic-headline" title="' + esc(n.titulo) + '">' + esc(n.titulo) + '</h3>' +
          '<div class="comic-speech-wrap">' +
            '<div class="comic-bot-avatar" title="FreireBot te cuenta">🤖</div>' +
            '<div class="comic-speech-bubble">' +
              '<p>' + esc(resumenTxt) + '</p>' +
            '</div>' +
          '</div>' +
          '<div class="comic-panel-foot">' +
            '<span class="comic-date"><i class="far fa-clock"></i> ' + esc(fechaRelativa(n.fecha)) + '</span>' +
            '<span class="comic-read-btn">¡LEER HISTORIA! 💥</span>' +
          '</div>' +
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
  var POR_PAGINA_ACT = 6;
  var paginasAct = {
    'hn-act-grid-clase': 1,
    'hn-act-grid-casa': 1
  };

  function obtenerFechaActividad(act) {
    if (!act) return 0;
    var d = parseFecha(act.desde) || parseFecha(act.hasta) || parseFecha(act.fecha) || parseFecha(act.creado);
    return d ? d.getTime() : 0;
  }

  function renderControlesPaginacionActividades(pagEl, gridId, totalItems, porPagina, curPage, totalPaginas) {
    if (!pagEl) return;
    if (totalItems === 0) {
      pagEl.style.display = 'none';
      pagEl.innerHTML = '';
      return;
    }

    pagEl.style.display = 'flex';
    var startNum = (curPage - 1) * porPagina + 1;
    var endNum = Math.min(curPage * porPagina, totalItems);

    var html = [];
    html.push('<div class="np-pag-info">');
    html.push('<span><i class="far fa-newspaper"></i> Mostrando <strong>' + startNum + '–' + endNum + '</strong> de <strong>' + totalItems + '</strong> expedientes</span>');
    html.push('<span class="np-pag-order-tag"><i class="fas fa-sort-amount-down"></i> Más nuevo a más viejo</span>');
    html.push('</div>');

    if (totalPaginas <= 1) {
      html.push('<div class="np-pag-page-indicator"><i class="fas fa-check-circle"></i> PÁGINA 1 DE 1 · HASTA 6 POR PÁGINA</div>');
      pagEl.innerHTML = html.join('');
      return;
    }

    html.push('<div class="np-pag-controls">');

    // Botón Anterior
    var prevDisabled = curPage <= 1 ? ' disabled aria-disabled="true"' : '';
    html.push('<button type="button" class="np-pag-btn np-pag-arrow"' + prevDisabled + ' data-grid="' + gridId + '" data-page="' + (curPage - 1) + '" title="Página anterior">');
    html.push('<i class="fas fa-arrow-left"></i> Anterior');
    html.push('</button>');

    // Botones numéricos
    html.push('<div class="np-pag-numbers">');
    for (var p = 1; p <= totalPaginas; p++) {
      var isAct = p === curPage;
      html.push('<button type="button" class="np-pag-num' + (isAct ? ' active' : '') + '" data-grid="' + gridId + '" data-page="' + p + '"' + (isAct ? ' aria-current="page"' : '') + '>');
      html.push(p);
      html.push('</button>');
    }
    html.push('</div>');

    // Botón Siguiente
    var nextDisabled = curPage >= totalPaginas ? ' disabled aria-disabled="true"' : '';
    html.push('<button type="button" class="np-pag-btn np-pag-arrow"' + nextDisabled + ' data-grid="' + gridId + '" data-page="' + (curPage + 1) + '" title="Página siguiente">');
    html.push('Siguiente <i class="fas fa-arrow-right"></i>');
    html.push('</button>');

    html.push('</div>');

    pagEl.innerHTML = html.join('');

    pagEl.querySelectorAll('button[data-page]:not([disabled])').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        var targetPage = parseInt(btn.dataset.page, 10);
        if (targetPage && targetPage !== curPage) {
          paginasAct[gridId] = targetPage;
          renderActividades();
          var targetGrid = document.getElementById(gridId);
          if (targetGrid) {
            targetGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      });
    });
  }

  function estadoActividad(a) {
    var h = hoy();
    var desde = parseFecha(a.desde);
    var hasta = parseFecha(a.hasta);
    if (a.tipo === 'clase') {
      if (!desde) return { clave: 'curso', texto: 'En clase' };
      var diff = Math.round((desde.getTime() - h.getTime()) / (1000 * 60 * 60 * 24));
      if (diff > 0) return { clave: 'proxima', texto: 'Próxima presentación' };
      if (diff === 0) return { clave: 'nueva', texto: '¡Presentación hoy!' };
      return { clave: 'finalizada', texto: 'Presentado' };
    }
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
    // Filtro interno de "En casa" (Todas / Misiones Maker / Juegos en Familia)
    var cont = document.getElementById('hn-casa-filters');
    if (cont) {
      var opciones = [
        { id: 'todas', nombre: 'Todos los desafíos', icono: 'fas fa-th-large' },
        { id: 'maker', nombre: 'Misiones Maker (Manos a la obra)', icono: 'fas fa-tools' },
        { id: 'familia', nombre: 'Juegos en Familia (Online)', icono: 'fas fa-dice' }
      ];
      cont.innerHTML = opciones.map(function (o) {
        return '<button type="button" class="hn-tab' + (o.id === filtroCasa ? ' active' : '') + '" data-casa="' + o.id + '">' +
          '<i class="' + o.icono + '"></i> ' + esc(o.nombre) + '</button>';
      }).join('');
      cont.querySelectorAll('.hn-tab').forEach(function (b) {
        b.addEventListener('click', function () {
          filtroCasa = b.dataset.casa;
          paginasAct['hn-act-grid-casa'] = 1;
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
          paginasAct['hn-act-grid-clase'] = 1;
          paginasAct['hn-act-grid-casa'] = 1;
          renderActividades();
        });
      }
    });
  }

  function renderActividades() {
    var todas = C.actividades || [];
    var clase = todas.filter(function (a) { return seccionDe(a) === 'clase' && pasaGrado(a); });
    var casaPorGrado = todas.filter(function (a) { return seccionDe(a) === 'casa' && pasaGrado(a); });
    var st = alumno();
    var miGrado = st && st.gradeId;

    // Ordenar casaPorGrado para elegir la Misión Estrella de la Semana (#1)
    var casaOrdenada = casaPorGrado.map(function (a) {
      var gr = a.grados || ['todos'];
      return { a: a, estado: estadoActividad(a), mia: !!(miGrado && gr.indexOf(miGrado) > -1) };
    }).sort(function (x, y) {
      var fX = obtenerFechaActividad(x.a);
      var fY = obtenerFechaActividad(y.a);
      if (fY !== fX) return fY - fX;
      if (x.mia !== y.mia) return x.mia ? -1 : 1;
      var ex = ORDEN_ESTADO[x.estado.clave] - ORDEN_ESTADO[y.estado.clave];
      if (ex) return ex;
      return String(y.a.id || '').localeCompare(String(x.a.id || ''));
    });

    var estrellaCustom = casaOrdenada.find(function (x) { return !!x.a.destacada; });
    var estrellaItem = (casaOrdenada.length > 1) ? (estrellaCustom || casaOrdenada[0]) : null;
    renderCasaFeaturedHero(estrellaItem);

    var casa = casaPorGrado.filter(function (a) {
      if (estrellaItem && filtroCasa === 'todas' && a.id === estrellaItem.a.id) return false;
      if (filtroCasa === 'todas') return true;
      var isJuego = a.modalidad === 'juego' || a.tipo === 'familia' || /escape|juego|trivia/i.test(a.id || '') || /escape|juego|trivia/i.test(a.titulo || '');
      if (filtroCasa === 'maker') return !isJuego;
      if (filtroCasa === 'familia') return isJuego;
      return true;
    });

    renderGridActividades('hn-act-grid-clase', clase, '🏫', 'No hay actividades de clase para este grado.');
    renderGridActividades('hn-act-grid-casa', casa, '🏠', 'No hay desafíos en casa para este filtro.');
  }

  function renderCasaFeaturedHero(it) {
    var cont = document.getElementById('hn-casa-featured');
    if (!cont) return;
    if (!it || !it.a) {
      cont.innerHTML = '';
      cont.style.display = 'none';
      return;
    }
    cont.style.display = 'block';
    var a = it.a;
    var gr = a.grados || ['todos'];
    var grTxt = gr.indexOf('todos') > -1 ? 'Todos los grados' : gr.map(nombreGrado).join(' · ');
    var isJuego = a.modalidad === 'juego' || a.tipo === 'familia' || /escape|juego|trivia/i.test(a.id || '') || /escape|juego|trivia/i.test(a.titulo || '');
    var isIA = a.modalidad === 'ia' || /ia|gemini|cine|hechizo|libro|album|álbum/i.test((a.titulo || '') + ' ' + (a.id || ''));
    var isMaker = !isJuego;
    var catBadge = isJuego ? '🎲 Juego en Familia' : (isIA ? '🔮 IA & Creatividad' : '🛠️ Misión Maker');
    var matIcon = isMaker ? '🧰' : '📱';
    var matText = a.materiales || (isMaker ? 'Cartón, tijera, plasticola o elementos de casa' : 'Celular, tablet o compu (100% online)');
    var cardTypeCls = isMaker ? 'is-maker' : 'is-juego';
    var heroImg = a.imagen
      ? '<img src="' + esc(a.imagen) + '" alt="' + esc(a.titulo) + '" class="casa-hero-img" loading="lazy" onerror="this.style.display=\'none\'">'
      : '<div class="casa-hero-emoji">' + esc(a.icono || '⭐') + '</div>';

    var botones = (a.botones || []).map(function (b, bi) {
      var cls = 'hn-act-btn' + (b.principal ? ' primary' : '');
      var icon = b.icono ? '<i class="' + esc(b.icono) + '"></i> ' : '';
      if (b.imagenModal) {
        return '<button type="button" class="' + cls + '" data-featured-btn="' + bi + '">' + icon + esc(b.texto) + '</button>';
      }
      var ext = /^https?:/i.test(b.url || '');
      return '<a class="' + cls + '" href="' + esc(b.url || '#') + '"' + (ext ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' + icon + esc(b.texto) + '</a>';
    }).join('');

    cont.innerHTML =
      '<article class="casa-featured-hero ' + cardTypeCls + '">' +
        '<div class="casa-hero-media">' +
          heroImg +
          '<span class="casa-hero-star"><i class="fas fa-star"></i> MISIÓN ESTRELLA DEL MES</span>' +
        '</div>' +
        '<div class="casa-hero-body">' +
          '<div class="casa-hero-pills">' +
            '<span class="casa-pill-cat">' + catBadge + '</span>' +
            '<span class="casa-pill-grade"><i class="fas fa-graduation-cap"></i> ' + esc(grTxt) + '</span>' +
            (it.mia ? '<span class="casa-pill-mine"><i class="fas fa-star"></i> Para tu grado</span>' : '') +
          '</div>' +
          '<h3 class="casa-hero-title">' + esc(a.titulo) + '</h3>' +
          '<p class="casa-hero-desc">' + esc(stripMarkdown(a.descripcion || '')) + '</p>' +
          '<div class="casa-mat-pill"><span>' + matIcon + '</span> <strong>Necesitás:</strong> ' + esc(matText) + '</div>' +
          '<div class="casa-hero-actions">' +
            botones +
            '<button type="button" class="casa-btn-detail" id="casa-featured-detail-btn"><i class="fas fa-info-circle"></i> Ver detalle</button>' +
          '</div>' +
        '</div>' +
      '</article>';

    cont.querySelectorAll('button[data-featured-btn]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var b = a.botones[+btn.dataset.featuredBtn];
        if (!b) return;
        if (window.openImageModal) window.openImageModal(b.imagenModal, a.titulo, b.descarga);
        else window.open(b.imagenModal, '_blank', 'noopener');
      });
    });

    var detBtn = document.getElementById('casa-featured-detail-btn');
    if (detBtn) {
      detBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        openCasaDetailModal(a);
      });
    }
  }

  function openCasaDetailModal(a) {
    if (!a) return;
    var isJ = a.modalidad === 'juego' || a.tipo === 'familia' || /escape|juego|trivia/i.test(a.id || '') || /escape|juego|trivia/i.test(a.titulo || '');
    var matT = a.materiales || (!isJ ? 'Cartón, tijera, plasticola o elementos de casa' : 'Celular, tablet o compu (100% online)');
    var grL = (a.grados && a.grados.indexOf('todos') === -1) ? a.grados.map(nombreGrado).join(' · ') : 'Todos los grados';
    var modal = document.getElementById('arcade-parent-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'arcade-parent-modal';
      modal.className = 'arcade-parent-modal-backdrop';
      document.body.appendChild(modal);
    }
    var btnsHtml = (a.botones || []).map(function (b) {
      if (b.imagenModal) return '';
      var ext = /^https?:/i.test(b.url || '');
      return '<a href="' + esc(b.url || '#') + '"' + (ext ? ' target="_blank" rel="noopener noreferrer"' : '') + ' class="apm-modal-btn-play">' + (b.icono ? '<i class="' + esc(b.icono) + '"></i> ' : '') + esc(b.texto) + '</a>';
    }).join('');
    modal.innerHTML =
      '<div class="arcade-parent-modal-card" role="dialog" aria-modal="true">' +
        '<div class="apm-modal-head">' +
          '<div class="apm-modal-head-left">' +
            '<span class="apm-modal-badge">' + (isJ ? '🎲 Juego en Familia' : '🛠️ Misión Maker en Casa') + ' · ' + esc(grL) + '</span>' +
            '<h3>' + esc(a.titulo) + '</h3>' +
          '</div>' +
          '<button type="button" class="apm-modal-close" aria-label="Cerrar">&times;</button>' +
        '</div>' +
        '<div class="apm-modal-body">' +
          (a.imagen ? '<img src="' + esc(a.imagen) + '" alt="" style="width:100%;max-height:220px;object-fit:cover;border-radius:14px;border:2px solid #E2E8F0;" onerror="this.style.display=\'none\'">' : '') +
          '<div class="apm-info-box"><h4><i class="fas fa-rocket"></i> ¿Qué hay que hacer?</h4><p>' + esc(stripMarkdown(a.descripcion || '')) + '</p></div>' +
          '<div class="apm-info-box is-benefits"><h4><i class="fas fa-toolbox"></i> ¿Qué necesitás?</h4><p>' + esc(matT) + '</p></div>' +
        '</div>' +
        '<div class="apm-modal-foot">' +
          '<button type="button" class="apm-modal-btn-sec">Cerrar</button>' +
          btnsHtml +
        '</div>' +
      '</div>';
    modal.style.display = 'flex';
    var closeFn = function () { modal.style.display = 'none'; };
    modal.querySelector('.apm-modal-close').onclick = closeFn;
    modal.querySelector('.apm-modal-btn-sec').onclick = closeFn;
    modal.onclick = function (ev) { if (ev.target === modal) closeFn(); };
  }

  /* ───────────── Modal Estilo Periódico (Actividades de Clase) ───────────── */
  function formatearGradosActividad(grados) {
    if (!grados) return 'Todos los grados';
    var gr = Array.isArray(grados) ? grados : [grados];
    if (!gr.length || gr.indexOf('todos') > -1) return 'Todos los grados';
    return gr.map(nombreGrado).join(' · ');
  }

  function abrirModalClasePeriodico(act, meta) {
    if (!act) return;
    var modalEl = document.getElementById('clase-periodico-modal');
    if (!modalEl) return;

    var dwgId = (act.id || 'EXP').replace(/^act-/, '').toUpperCase();
    var issueIdEl = document.getElementById('cpm-issue-id');
    if (issueIdEl) issueIdEl.textContent = dwgId;

    var headlineEl = document.getElementById('cpm-headline');
    if (headlineEl) headlineEl.textContent = act.titulo || 'Expediente de Clase';

    var subheadlineEl = document.getElementById('cpm-subheadline');
    if (subheadlineEl) {
      if (act.subtitulo) {
        subheadlineEl.textContent = act.subtitulo;
        subheadlineEl.style.display = 'block';
      } else {
        subheadlineEl.textContent = 'Expediente pedagógico y crónica del taller tecnológico y experimental.';
        subheadlineEl.style.display = 'block';
      }
    }

    var stampEl = document.getElementById('cpm-stamp');
    if (stampEl) {
      stampEl.textContent = (meta && meta.estado && meta.estado.texto) ? meta.estado.texto : 'EXPEDIENTE DE AULA';
    }

    var datelineEl = document.getElementById('cpm-dateline');
    if (datelineEl) {
      var fTxt = act.desde ? act.desde : 'TALLER ACTIVO';
      datelineEl.innerHTML = '<i class="far fa-calendar-alt"></i> ' + esc(fTxt) + ' // COLEGIO PAULO FREIRE';
    }

    var grTxt = formatearGradosActividad(act.grados || act.grado);
    var gradePillEl = document.getElementById('cpm-grade-pill');
    if (gradePillEl) {
      gradePillEl.innerHTML = '<i class="fas fa-graduation-cap"></i> ' + esc(grTxt);
    }

    var stateBadgeEl = document.getElementById('cpm-state-badge');
    if (stateBadgeEl) {
      var stClave = (meta && meta.estado && meta.estado.clave) || 'curso';
      var stTexto = (meta && meta.estado && meta.estado.texto) || 'EN CURSO';
      stateBadgeEl.className = 'cpm-state-badge state-' + stClave;
      stateBadgeEl.textContent = stTexto;
    }

    // Ficha técnica en recuadro lateral
    var boxGrades = document.getElementById('cpm-box-grades');
    if (boxGrades) boxGrades.textContent = grTxt;
    var boxDate = document.getElementById('cpm-box-date');
    if (boxDate) boxDate.textContent = act.desde || 'En desarrollo';
    var boxStatus = document.getElementById('cpm-box-status');
    if (boxStatus) boxStatus.textContent = (meta && meta.estado && meta.estado.texto) || 'En curso';

    // Imagen principal de portada
    var mainFrame = document.getElementById('cpm-main-photo-frame');
    var mainImg = document.getElementById('cpm-main-img');
    var captionText = document.getElementById('cpm-photo-caption-text');
    if (act.imagen) {
      if (mainImg) {
        mainImg.src = act.imagen;
        mainImg.alt = act.titulo || 'Proyecto de clase';
        mainImg.onerror = function() {
          this.onerror = null;
          this.src = 'img/escudo_paulo_freire.png';
        };
      }
      if (captionText) {
        captionText.textContent = 'Fotografía principal del proyecto «' + (act.titulo || '') + '». Clic para ampliar en pantalla completa.';
      }
      if (mainFrame) {
        mainFrame.style.display = 'block';
        mainFrame.onclick = function() {
          if (window.openImageModal) window.openImageModal(act.imagen, act.titulo);
          else window.open(act.imagen, '_blank');
        };
      }
    } else {
      if (mainFrame) mainFrame.style.display = 'none';
    }

    // Galería adicional de fotos
    var galeriaWrapper = document.getElementById('cpm-gallery-wrapper');
    var galleryGrid = document.getElementById('cpm-gallery-grid');
    var galleryCount = document.getElementById('cpm-gallery-count');
    var galeriaList = Array.isArray(act.galeria) ? act.galeria.filter(Boolean) : [];

    if (galeriaList.length > 0) {
      if (galleryCount) galleryCount.textContent = galeriaList.length;
      if (galleryGrid) {
        galleryGrid.innerHTML = galeriaList.map(function(url, pIdx) {
          return '<div class="cpm-thumb-item" data-photo-url="' + esc(url) + '" data-photo-idx="' + (pIdx + 1) + '" role="button" tabindex="0" title="Foto ' + (pIdx + 1) + ' - Clic para ampliar">' +
            '<img src="' + esc(url) + '" alt="Foto ' + (pIdx + 1) + '" class="cpm-thumb-img" loading="lazy" onerror="this.onerror=null; this.src=\'img/escudo_paulo_freire.png\';">' +
            '<span class="cpm-thumb-badge"><i class="fas fa-camera"></i> ' + (pIdx + 1) + '</span>' +
          '</div>';
        }).join('');

        galleryGrid.querySelectorAll('.cpm-thumb-item').forEach(function(item) {
          item.addEventListener('click', function(e) {
            e.stopPropagation();
            var pUrl = item.dataset.photoUrl;
            var pNum = item.dataset.photoIdx;
            var tDesc = (act.titulo || 'Proyecto') + ' (Foto ' + pNum + ' de ' + galeriaList.length + ')';
            if (window.openImageModal) window.openImageModal(pUrl, tDesc);
            else window.open(pUrl, '_blank');
          });
        });
      }
      if (galeriaWrapper) galeriaWrapper.style.display = 'block';
    } else {
      if (galeriaWrapper) galeriaWrapper.style.display = 'none';
      if (galleryGrid) galleryGrid.innerHTML = '';
    }

    // Cuerpo de texto periodístico con letra capital y soporte Markdown completo
    var bodyContent = document.getElementById('cpm-body-content');
    if (bodyContent) {
      var rawDesc = (act.descripcion || '').trim();
      if (!rawDesc) {
        bodyContent.innerHTML = '<p class="cpm-empty-text">Sin descripción detallada registrada para esta actividad.</p>';
      } else {
        bodyContent.innerHTML = formatMarkdown(rawDesc);
      }
    }

    // Botones de acción / enlaces adicionales
    var actionButtons = document.getElementById('cpm-action-buttons');
    if (actionButtons) {
      if (act.botones && act.botones.length > 0) {
        actionButtons.style.display = 'flex';
        actionButtons.innerHTML = act.botones.map(function(b) {
          var icon = b.icono ? '<i class="' + esc(b.icono) + '"></i> ' : '<i class="fas fa-external-link-alt"></i> ';
          var url = b.url || '#';
          var isExt = /^https?:/i.test(url);
          return '<a href="' + esc(url) + '"' + (isExt ? ' target="_blank" rel="noopener noreferrer"' : '') + ' class="cpm-action-btn primary">' + icon + esc(b.texto) + '</a>';
        }).join('');
      } else {
        actionButtons.style.display = 'none';
        actionButtons.innerHTML = '';
      }
    }

    // Desplegar modal
    modalEl.style.display = 'flex';
    requestAnimationFrame(function() {
      modalEl.classList.add('open');
    });
    modalEl.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    var scrollBody = modalEl.querySelector('.cpm-scroll-body');
    if (scrollBody) scrollBody.scrollTop = 0;

    var closeBtn = document.getElementById('cpm-close-btn');
    if (closeBtn) closeBtn.focus();
  }

  function cerrarModalClasePeriodico() {
    var modalEl = document.getElementById('clase-periodico-modal');
    if (!modalEl) return;
    modalEl.classList.remove('open');
    modalEl.style.display = 'none';
    modalEl.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function initClasePeriodicoModal() {
    var closeTop = document.getElementById('cpm-close-btn');
    if (closeTop) closeTop.addEventListener('click', cerrarModalClasePeriodico);

    var closeFoot = document.getElementById('cpm-foot-close-btn');
    if (closeFoot) closeFoot.addEventListener('click', cerrarModalClasePeriodico);

    var overlay = document.getElementById('clase-periodico-modal');
    if (overlay) {
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) cerrarModalClasePeriodico();
      });
    }

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        var cpm = document.getElementById('clase-periodico-modal');
        if (cpm && cpm.classList.contains('open') && !document.querySelector('#image-lightbox-modal.active')) {
          cerrarModalClasePeriodico();
        }
      }
    });
  }

  window.abrirModalClasePeriodico = abrirModalClasePeriodico;
  window.cerrarModalClasePeriodico = cerrarModalClasePeriodico;
  window.abrirModalClasePorIndice = function(idx) {
    var list = window._ULTIMA_LISTA_CLASE || [];
    var item = list[+idx];
    if (item && item.a) {
      abrirModalClasePeriodico(item.a, item);
    } else {
      var todas = (window.HOME_CONTENT && window.HOME_CONTENT.actividades) || [];
      var deClase = todas.filter(function(x) { return (x.tipo === 'clase' || !x.tipo); });
      var act = deClase[+idx] || todas[+idx];
      if (act) abrirModalClasePeriodico(act, { a: act, estado: estadoActividad(act) });
    }
  };
  window.abrirModalClasePeriodicoPorIndice = window.abrirModalClasePorIndice;

  function renderGridActividades(gridId, actividades, emoji, vacio) {
    var grid = document.getElementById(gridId);
    if (!grid) return;
    var st = alumno();
    var miGrado = st && st.gradeId;
    var isCasa = gridId === 'hn-act-grid-casa';
    var pagContainerId = isCasa ? 'hn-act-pag-casa' : 'hn-act-pag-clase';
    var pagEl = document.getElementById(pagContainerId);

    // ── ORDENAMIENTO ESTRICTO: FECHA MÁS NUEVO A MÁS VIEJO ──
    var lista = actividades.map(function (a) {
      var gr = a.grados || ['todos'];
      return { a: a, estado: estadoActividad(a), mia: !!(miGrado && gr.indexOf(miGrado) > -1) };
    }).sort(function (x, y) {
      // 1. Cronológico descendente (más nuevo a más viejo)
      var fX = obtenerFechaActividad(x.a);
      var fY = obtenerFechaActividad(y.a);
      if (fY !== fX) return fY - fX;

      // 2. Si tienen la misma fecha: priorizar actividades del propio grado
      if (x.mia !== y.mia) return x.mia ? -1 : 1;

      // 3. Desempate secundario por estado o ID
      var ex = ORDEN_ESTADO[x.estado.clave] - ORDEN_ESTADO[y.estado.clave];
      if (ex) return ex;
      return String(y.a.id || '').localeCompare(String(x.a.id || ''));
    });

    if (gridId === 'hn-act-grid-clase') {
      window._ULTIMA_LISTA_CLASE = lista;
    }

    if (!lista.length) {
      grid.classList.add('comic-page-grid');
      grid.innerHTML = '<div class="hn-empty" style="grid-column:1/-1;"><span>' + emoji + '</span>' + esc(vacio) + '</div>';
      if (pagEl) {
        pagEl.style.display = 'none';
        pagEl.innerHTML = '';
      }
      return;
    }

    grid.classList.add('comic-page-grid');

    // ── PAGINACIÓN: HASTA 6 ELEMENTOS POR PÁGINA ──
    var totalItems = lista.length;
    var totalPaginas = Math.ceil(totalItems / POR_PAGINA_ACT) || 1;
    if (!paginasAct[gridId] || paginasAct[gridId] < 1) paginasAct[gridId] = 1;
    if (paginasAct[gridId] > totalPaginas) paginasAct[gridId] = totalPaginas;

    var curPage = paginasAct[gridId];
    var startIdx = (curPage - 1) * POR_PAGINA_ACT;
    var endIdx = Math.min(startIdx + POR_PAGINA_ACT, totalItems);
    var itemsPagina = lista.slice(startIdx, endIdx);

    var comicThemes = ['comic-theme-yellow', 'comic-theme-cyan', 'comic-theme-magenta', 'comic-theme-emerald'];

    grid.innerHTML = itemsPagina.map(function (it, pageIdx) {
      var idx = startIdx + pageIdx;
      var a = it.a;
      var gr = a.grados || ['todos'];
      var grTxt = gr.indexOf('todos') > -1 ? 'Todos los grados' : gr.map(nombreGrado).join(' · ');
      var fechaPresentacion = (a.tipo === 'clase' && a.desde)
        ? '<span class="hn-act-deadline"><i class="far fa-calendar-alt"></i> Presentación: ' + esc(fechaLarga(a.desde).replace(/ de \d{4}$/, '')) + '</span>' : '';
      var hasta = (a.tipo !== 'clase' && a.hasta && it.estado.clave !== 'finalizada')
        ? '<span class="hn-act-deadline"><i class="far fa-calendar-check"></i> Hasta el ' + esc(fechaLarga(a.hasta).replace(/ de \d{4}$/, '')) + '</span>' : '';
      var desdeProx = (a.tipo !== 'clase' && it.estado.clave === 'proxima')
        ? '<span class="hn-act-deadline"><i class="far fa-calendar"></i> Empieza el ' + esc(fechaLarga(a.desde).replace(/ de \d{4}$/, '')) + '</span>' : '';

      var botones = (a.botones || []).map(function (b, bi) {
        var cls = 'hn-act-btn comic-action-btn' + (b.principal ? ' primary' : '');
        var icon = b.icono ? '<i class="' + esc(b.icono) + '"></i> ' : '';
        if (b.imagenModal) {
          return '<button type="button" class="' + cls + '" data-act="' + idx + '" data-btn="' + bi + '">' + icon + esc(b.texto) + '</button>';
        }
        var ext = /^https?:/i.test(b.url || '');
        return '<a class="' + cls + '" href="' + esc(b.url || '#') + '"' + (ext ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' + icon + esc(b.texto) + '</a>';
      }).join('');

      var numStr = (idx + 1) < 10 ? '0' + (idx + 1) : String(idx + 1);

      // ── CASO CASA: VIÑETAS ESTILO PÁGINA DE CÓMIC ──
      if (isCasa) {
        var isJuego = a.modalidad === 'juego' || a.tipo === 'familia' || /escape|juego|trivia/i.test(a.id || '') || /escape|juego|trivia/i.test(a.titulo || '');
        var isIA = a.modalidad === 'ia' || /ia|gemini|cine|hechizo|libro|album|álbum/i.test((a.titulo || '') + ' ' + (a.id || ''));
        var themeCls = isJuego ? 'comic-theme-cyan' : (isIA ? 'comic-theme-magenta' : comicThemes[idx % 2 === 0 ? 0 : 3]);
        var burstTxt = isJuego ? '🎲 ¡FAMILIA!' : (isIA ? '🔮 ¡IA & CINE!' : '⚡ ¡MAKER!');
        var catLabel = isJuego ? '🎲 Juego en Familia' : (isIA ? '🔮 IA & Creatividad' : '🛠️ Misión Maker');
        var matText = a.materiales || (!isJuego ? 'Cartón, tijera, plasticola o elementos de casa' : 'Celular, tablet o compu (100% online)');
        var artHtml = a.imagen
          ? '<img src="' + esc(a.imagen) + '" alt="' + esc(a.titulo) + '" loading="lazy" onerror="this.style.display=\'none\';if(this.nextElementSibling)this.nextElementSibling.style.display=\'flex\';"><div class="comic-emoji-stage" style="display:none;">' + esc(a.icono || '🏠') + '</div>'
          : '<div class="comic-emoji-stage">' + esc(a.icono || '🏠') + '</div>';

        var casaCaptionTxt = isJuego ? '🎲 ¡EN FAMILIA!' : (isIA ? '🔮 ¡IA EN CASA!' : '🏠 ¡MISIÓN EN CASA!');

        return '<article class="comic-panel ' + themeCls + (it.mia ? ' es-mia' : '') + '">' +
          '<div class="comic-caption-bar">' +
            '<span class="comic-panel-num">' + casaCaptionTxt + '</span>' +
            '<span class="comic-panel-grade"><i class="fas fa-graduation-cap"></i> ' + esc(grTxt) + '</span>' +
          '</div>' +
          '<div class="comic-art-wrap">' +
            artHtml +
            '<div class="comic-halftone-overlay" aria-hidden="true"></div>' +
            '<span class="comic-burst-sticker">' + burstTxt + '</span>' +
            (it.mia ? '<span class="comic-mine-sticker">⭐ ¡Tu grado!</span>' : '') +
          '</div>' +
          '<div class="comic-panel-body">' +
            '<h3 class="comic-headline" title="' + esc(a.titulo) + '">' + esc(a.titulo) + '</h3>' +
            '<div class="comic-speech-wrap">' +
              '<div class="comic-bot-avatar" title="FreireBot te cuenta">🤖</div>' +
              '<div class="comic-speech-bubble">' +
                '<p>' + esc(stripMarkdown(a.descripcion || '')) + '</p>' +
              '</div>' +
            '</div>' +
            '<div class="comic-equip-bar" title="' + esc(matText) + '">' +
              '<span>🧰 <strong>Necesitás:</strong> ' + esc(matText) + '</span>' +
            '</div>' +
            '<div class="comic-panel-foot">' +
              (botones ? '<div class="comic-actions-row">' + botones + '</div>' : '') +
              '<button type="button" class="comic-detail-btn casa-btn-detail" data-casa-detail="' + idx + '" title="Ver información completa"><i class="fas fa-info-circle"></i> Detalle</button>' +
            '</div>' +
          '</div>' +
        '</article>';
      }

      // ── CASO CLASE: VIÑETAS ESTILO PÁGINA DE CÓMIC ──
      var isIA = /ia|gemini|cine|hechizo|libro|robot|sensor|circuit/i.test((a.titulo || '') + ' ' + (a.id || ''));
      var isArte = /paint|bandera|dibujo|guitarra|arte/i.test((a.titulo || '') + ' ' + (a.id || ''));
      var themeCls = isIA ? 'comic-theme-magenta' : (isArte ? 'comic-theme-cyan' : comicThemes[idx % 2 === 0 ? 0 : 3]);
      var burstTxt = isIA ? '🤖 ¡TALLER!' : (isArte ? '🎨 ¡ARTE!' : '⚡ ¡CLASE!');
      var subTxt = a.subtitulo || ((a.chips && a.chips.length) ? a.chips.slice(0, 2).join(' · ') : 'Actividad práctica del taller');
      var claseArtHtml = a.imagen
        ? '<img src="' + esc(a.imagen) + '" alt="' + esc(a.titulo) + '" loading="lazy" onerror="this.style.display=\'none\';if(this.nextElementSibling)this.nextElementSibling.style.display=\'flex\';"><div class="comic-emoji-stage" style="display:none;">' + esc(a.icono || '🤖') + '</div>'
        : '<div class="comic-emoji-stage">' + esc(a.icono || '🤖') + '</div>';

      var claseCaptionTxt = it.estado.clave === 'curso' ? '⚡ ¡EN CURSO!' : (it.estado.clave === 'proxima' ? '🚀 ¡PRÓXIMA!' : '✅ ¡PRESENTADO!');

      return '<article class="comic-panel ' + themeCls + (it.mia ? ' es-mia' : '') + '" data-act-idx="' + idx + '" role="button" tabindex="0" onclick="window.abrirModalClasePorIndice(' + idx + ');" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();window.abrirModalClasePorIndice(' + idx + ');}" title="Clic para abrir el proyecto completo">' +
        '<div class="comic-caption-bar">' +
          '<span class="comic-panel-num">' + claseCaptionTxt + '</span>' +
          '<span class="comic-panel-grade"><i class="fas fa-graduation-cap"></i> ' + esc(grTxt) + '</span>' +
        '</div>' +
        '<div class="comic-art-wrap">' +
          claseArtHtml +
          '<div class="comic-halftone-overlay" aria-hidden="true"></div>' +
          '<span class="comic-burst-sticker">' + burstTxt + '</span>' +
          (it.mia ? '<span class="comic-mine-sticker">⭐ ¡Tu grado!</span>' : '') +
        '</div>' +
        '<div class="comic-panel-body">' +
          '<h3 class="comic-headline" title="' + esc(a.titulo) + '">' + esc(a.titulo) + '</h3>' +
          '<div class="comic-speech-wrap">' +
            '<div class="comic-bot-avatar" title="FreireBot te cuenta">🤖</div>' +
            '<div class="comic-speech-bubble">' +
              '<p>' + esc(stripMarkdown(a.descripcion || '')) + '</p>' +
            '</div>' +
          '</div>' +
          '<div class="comic-equip-bar" title="' + esc(subTxt) + '">' +
            '<span>🛠️ ' + esc(subTxt) + '</span>' +
          '</div>' +
          '<div class="comic-panel-foot" onclick="event.stopPropagation();">' +
            (botones ? '<div class="comic-actions-row">' + botones + '</div>' : '') +
            '<button type="button" class="comic-read-btn" onclick="event.stopPropagation(); window.abrirModalClasePorIndice(' + idx + ');" title="Ver proyecto completo">' +
              '¡VER PROYECTO! 💥' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</article>';
    }).join('');

    // Botones que abren la ficha en el visor de imágenes (para botones con imagenModal)
    grid.querySelectorAll('button.hn-act-btn[data-act]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var it = lista[+btn.dataset.act];
        var b = it && it.a.botones[+btn.dataset.btn];
        if (!b) return;
        if (window.openImageModal) window.openImageModal(b.imagenModal, it.a.titulo, b.descarga);
        else window.open(b.imagenModal, '_blank', 'noopener');
      });
    });

    // Botones "Ver detalle" en tarjetas modernas de Actividades en Casa
    if (isCasa) {
      grid.querySelectorAll('button.casa-btn-detail[data-casa-detail]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var it = lista[+btn.dataset.casaDetail];
          if (it && it.a) openCasaDetailModal(it.a);
        });
      });
    }

    // Accesibilidad por teclado (Enter / Espacio)
    grid.querySelectorAll('.np-clase-card').forEach(function (card) {
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          if (e.target.closest('a') || e.target.closest('button')) return;
          e.preventDefault();
          var actIdx = +card.dataset.actIdx;
          if (window.abrirModalClasePorIndice) window.abrirModalClasePorIndice(actIdx);
        }
      });
    });

    // Renderizar controles de paginación
    renderControlesPaginacionActividades(pagEl, gridId, totalItems, POR_PAGINA_ACT, curPage, totalPaginas);
  }

  /* ───────────── Juegos por Grupo ───────────── */
  var filtroGrupoJuegos = 'todos';
  window._customRemoteGames = [];
  window._deletedRemoteGameIds = {};

  function applyLocalGameOverrides(gamesList, delMap) {
    try {
      var raw = localStorage.getItem('pf_admin_games_overrides');
      if (!raw) return gamesList;
      var map = JSON.parse(raw);
      var result = gamesList.slice();
      Object.keys(map).forEach(function (id) {
        var item = map[id];
        if (!item) return;
        if (item.deleted === true) {
          if (delMap) delMap[id] = true;
          result = result.filter(function (g) { return g.id !== id; });
        } else {
          var idx = result.findIndex(function (g) { return g.id === id; });
          var gObj = {
            id: id,
            title: item.title || '',
            grade: item.grade || item.gradeId || 'todos',
            gradeId: item.grade || item.gradeId || 'todos',
            grades: item.grades || [item.grade || 'todos'],
            platform: item.platform || 'web',
            scratchId: item.scratchId || null,
            externalUrl: item.externalUrl || '',
            thumbnail: item.thumbnail || '',
            description: item.description || '',
            benefits: item.benefits || '',
            tags: item.tags || []
          };
          if (idx >= 0) result[idx] = gObj;
          else result.push(gObj);
        }
      });
      return result;
    } catch (e) {
      console.warn('Error en applyLocalGameOverrides:', e);
      return gamesList;
    }
  }

  window._customRemoteGames = applyLocalGameOverrides([], window._deletedRemoteGameIds);

  function getGradesConJuegos() {
    var d = window.SCHOOL_DATA;
    if (!d || !d.grades) return [];
    var baseGrades = d.grades;
    var remote = window._customRemoteGames || [];

    // Juegos base marcados para 'todos' los grados
    var sharedBase = [];
    var seenShared = {};
    baseGrades.forEach(function (bgGrade) {
      (bgGrade.games || []).forEach(function (gm) {
        if (gm && Array.isArray(gm.grades) && gm.grades.indexOf('todos') !== -1) {
          if (gm.id && seenShared[gm.id]) return;
          if (gm.id) seenShared[gm.id] = true;
          sharedBase.push(gm);
        }
      });
    });

    return baseGrades.map(function (g) {
      var cloned = Object.assign({}, g);
      var gradeBaseGames = (g.games || []).slice();
      var normG = normalizarGrado(g.id);

      sharedBase.forEach(function (sg) {
        if (!gradeBaseGames.some(function (x) { return x && x.id === sg.id; })) {
          gradeBaseGames.push(sg);
        }
      });

      // Filtrar los juegos remotos que correspondan a este grado o a todos
      var matchingRemote = remote.filter(function (rg) {
        var rgGrades = rg.grades || [rg.grade || rg.gradeId || 'todos'];
        var norm = rgGrades.map(normalizarGrado);
        return norm.indexOf('todos') !== -1 || norm.indexOf(normG) !== -1;
      });

      // Poner primero los juegos remotos, evitando duplicados por id y excluyendo los eliminados
      var delMap = window._deletedRemoteGameIds || {};
      var merged = matchingRemote.concat(gradeBaseGames.filter(function (bg) {
        if (delMap[bg.id]) return false;
        return !matchingRemote.some(function (rg) { return rg.id === bg.id; });
      }));

      // Destacar primero Surf Edge y Dino de Google en la sección Juegos
      var featuredIds = { 'g-edge-surf-online': 1, 'g-chrome-dino-online': 2 };
      merged.sort(function (a, b) {
        var pa = featuredIds[a && a.id] || 99;
        var pb = featuredIds[b && b.id] || 99;
        return pa - pb;
      });

      cloned.games = merged;
      return cloned;
    });
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

  function getGameUniqueKey(gm) {
    if (!gm) return '';
    var titleKey = (gm.title || '').toLowerCase().replace(/\s+/g, ' ').trim();
    var urlKey = (gm.externalUrl || gm.scratchId || '').toString().toLowerCase().trim();
    if (titleKey) return 't:' + titleKey + '|' + urlKey;
    return gm.id ? 'id:' + gm.id : '';
  }

  function renderFiltrosJuegos() {
    var grades = getGradesConJuegos();
    var tabsCont = document.getElementById('hn-juegos-grade-tabs');
    if (!tabsCont || !grades.length) return;

    var seenTotalIds = {};
    var seenTotalKeys = {};
    var totalJuegos = 0;
    grades.forEach(function (g) {
      (g.games || []).forEach(function (gm) {
        if (gm.id) {
          if (seenTotalIds[gm.id]) return;
          seenTotalIds[gm.id] = true;
        }
        var uKey = getGameUniqueKey(gm);
        if (uKey) {
          if (seenTotalKeys[uKey]) return;
          seenTotalKeys[uKey] = true;
        }
        totalJuegos++;
      });
    });

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
    var seenGameIds = {};
    var seenGameKeys = {};
    listaGrados.forEach(function (g) {
      (g.games || []).forEach(function (gm) {
        if (filtroGrupoJuegos === 'todos') {
          if (gm.id) {
            if (seenGameIds[gm.id]) return;
            seenGameIds[gm.id] = true;
          }
          var uKey = getGameUniqueKey(gm);
          if (uKey) {
            if (seenGameKeys[uKey]) return;
            seenGameKeys[uKey] = true;
          }
        }
        items.push({ game: gm, grade: g });
      });
    });

    if (!items.length) {
      grid.classList.add('is-arcade-wheel');
      grid.innerHTML = '<div class="hn-empty" style="grid-column:1/-1;"><span>⏳</span>Los juegos para este grupo se están preparando para la próxima clase.</div>';
      return;
    }

    grid.classList.add('is-arcade-wheel');

    var activeIdx = 0;
    var isSpinningRandom = false;

    function getItemMeta(it) {
      var gm = it.game;
      var gr = it.grade;
      var pm = (window.platformMeta && window.platformMeta(gm.platform)) || { label: 'Juego', icon: '🎮', cls: 'pb-default' };
      var url = (window.getGameUrl && window.getGameUrl(gm)) || gm.externalUrl || '#';
      var ext = /^https?:/i.test(url);
      var thumb = gm.thumbnail || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80';
      var gradePillText = (gr.icon || '🎮') + ' ' + (gr.shortName || gr.name);
      var gradePillBg = gr.color || '#4F46E5';
      if (gm.grades && (gm.grades.indexOf('todos') !== -1 || gm.grades.length >= 7)) {
        gradePillText = '🌟 Todo el Colegio';
        gradePillBg = '#7C3AED';
      } else if (gm.grades && gm.grades.length > 1 && filtroGrupoJuegos === 'todos') {
        gradePillText = '👥 ' + gm.grades.length + ' Grados';
        gradePillBg = '#2563EB';
      }
      return {
        gm: gm,
        gr: gr,
        pm: pm,
        url: url,
        ext: ext,
        thumb: thumb,
        gradePillText: gradePillText,
        gradePillBg: gradePillBg
      };
    }

    grid.innerHTML =
      '<div class="arcade-cabinet" tabindex="0" aria-label="Ruleta Arcade de Juegos">' +
        '<div class="arcade-stage">' +
          '<div class="arcade-monitor-col">' +
            '<div class="arcade-monitor-bezel">' +
              '<div class="arcade-monitor-topbar">' +
                '<span class="arcade-marquee"><i class="fas fa-gamepad"></i> ARCADE DEL TALLER</span>' +
                '<div class="arcade-topbar-btns">' +
                  '<button type="button" id="arcade-btn-game-info" class="arcade-btn-game-info" title="Ver título y descripción completa del juego">' +
                    '<i class="fas fa-info-circle"></i> <span>Info Juego</span>' +
                  '</button>' +
                  '<button type="button" id="arcade-btn-parent-info" class="arcade-btn-parent-info" title="Ver por qué elegimos este juego y qué habilidades mejora">' +
                    '<i class="fas fa-users"></i> <span>Info Padres</span>' +
                  '</button>' +
                '</div>' +
                '<span class="arcade-counter" id="arcade-counter">1 / ' + items.length + '</span>' +
              '</div>' +
              '<div class="arcade-screen-img-wrap" id="arcade-screen-img-wrap">' +
                '<img id="arcade-screen-img" src="" alt="" class="arcade-screen-img">' +
                '<span id="arcade-screen-platform" class="game-card-badge"></span>' +
                '<span id="arcade-screen-grade" class="hn-game-grade-pill"></span>' +
              '</div>' +
              '<div class="arcade-screen-info">' +
                '<h3 class="arcade-screen-title" id="arcade-screen-title"></h3>' +
                '<p class="arcade-screen-desc" id="arcade-screen-desc"></p>' +
              '</div>' +
              '<div class="arcade-screen-actions">' +
                '<a id="arcade-btn-play" href="#" class="arcade-btn-play">' +
                  '<i class="fas fa-play"></i> <span>¡JUGAR AHORA!</span>' +
                '</a>' +
                '<button type="button" id="arcade-btn-random" class="arcade-btn-random" title="Elegir un juego al azar">' +
                  '<i class="fas fa-dice"></i> <span>¡Sorpresa!</span>' +
                '</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="arcade-wheel-col" id="arcade-wheel-col">' +
            '<div class="arcade-wheel-controls">' +
              '<button type="button" class="arcade-nav-btn" id="arcade-btn-prev" aria-label="Juego anterior"><i class="fas fa-chevron-up"></i> Subir</button>' +
              '<span class="arcade-wheel-hint">🎡 Girá la ruleta o usá ↑ ↓</span>' +
              '<button type="button" class="arcade-nav-btn" id="arcade-btn-next" aria-label="Siguiente juego">Bajar <i class="fas fa-chevron-down"></i></button>' +
            '</div>' +
            '<div class="arcade-wheel-viewport" id="arcade-wheel-viewport">' +
              '<div class="arcade-wheel-disc"></div>' +
              '<div class="arcade-wheel-pointer">◀</div>' +
              '<div class="arcade-wheel-slots" id="arcade-wheel-slots"></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    var elImg = document.getElementById('arcade-screen-img');
    var elPlat = document.getElementById('arcade-screen-platform');
    var elGrade = document.getElementById('arcade-screen-grade');
    var elTitle = document.getElementById('arcade-screen-title');
    var elDesc = document.getElementById('arcade-screen-desc');
    var elPlay = document.getElementById('arcade-btn-play');
    var elCounter = document.getElementById('arcade-counter');
    var elSlots = document.getElementById('arcade-wheel-slots');
    var elViewport = document.getElementById('arcade-wheel-viewport');
    var elBtnPrev = document.getElementById('arcade-btn-prev');
    var elBtnNext = document.getElementById('arcade-btn-next');
    var elBtnRand = document.getElementById('arcade-btn-random');
    var elBtnGameInfo = document.getElementById('arcade-btn-game-info');
    var elBtnParentInfo = document.getElementById('arcade-btn-parent-info');

    function openBrowserProtocolModal(url, title) {
      var isEdge = /^edge:\/\//i.test(url);
      var browserName = isEdge ? 'Microsoft Edge' : 'Google Chrome';
      var browserIcon = isEdge ? '🌊' : '🦖';
      var modal = document.getElementById('arcade-protocol-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'arcade-protocol-modal';
        modal.className = 'arcade-parent-modal-backdrop';
        document.body.appendChild(modal);
      }

      modal.innerHTML =
        '<div class="arcade-parent-modal-card" role="dialog" aria-modal="true" style="max-width:480px;">' +
          '<div class="apm-modal-head">' +
            '<div class="apm-modal-head-left">' +
              '<span class="apm-modal-badge" style="background:#FEF3C7;color:#B45309;border-color:#FCD34D;"><i class="fas fa-exclamation-triangle"></i> Advertencia de Navegador</span>' +
              '<h3>' + browserIcon + ' ' + esc(title || 'Juego del Navegador') + '</h3>' +
            '</div>' +
            '<button type="button" class="apm-modal-close" aria-label="Cerrar">&times;</button>' +
          '</div>' +
          '<div class="apm-modal-body">' +
            '<div class="apm-info-box" style="background:#FFFBEB;border:2px solid #F59E0B;">' +
              '<h4 style="color:#B45309;"><i class="fas fa-info-circle"></i> Este juego se ejecuta únicamente en ' + esc(browserName) + '</h4>' +
              '<p>Por seguridad de los navegadores, los enlaces internos como <code>' + esc(url) + '</code> no se pueden abrir directo con un clic desde una página web.</p>' +
              '<p style="margin-top:8px;"><strong>¿Cómo jugarlo?</strong> Abrí <strong>' + esc(browserName) + '</strong>, pegá <code>' + esc(url) + '</code> en la barra de direcciones arriba y presioná <strong>Enter</strong>.</p>' +
            '</div>' +
            '<p id="apm-proto-copied-msg" style="display:none;margin-top:10px;color:#059669;font-weight:800;text-align:center;">✅ ¡Dirección copiada! Pegala en ' + esc(browserName) + '.</p>' +
          '</div>' +
          '<div class="apm-modal-foot">' +
            '<button type="button" class="apm-modal-btn-sec">Cerrar</button>' +
            '<button type="button" id="apm-proto-copy-btn" class="apm-modal-btn-play" style="border:none;cursor:pointer;">' +
              '<i class="fas fa-copy"></i> Copiar ' + esc(url) +
            '</button>' +
          '</div>' +
        '</div>';

      modal.style.display = 'flex';
      var closeFn = function () { modal.style.display = 'none'; };
      modal.querySelector('.apm-modal-close').onclick = closeFn;
      modal.querySelector('.apm-modal-btn-sec').onclick = closeFn;
      modal.onclick = function (e) { if (e.target === modal) closeFn(); };
      var copyBtn = document.getElementById('apm-proto-copy-btn');
      var copiedMsg = document.getElementById('apm-proto-copied-msg');
      if (copyBtn) {
        copyBtn.onclick = function () {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(function () {
              if (copiedMsg) copiedMsg.style.display = 'block';
            }).catch(function () {
              if (copiedMsg) copiedMsg.style.display = 'block';
            });
          } else {
            if (copiedMsg) copiedMsg.style.display = 'block';
          }
        };
      }
    }

    function openArcadeInfoModal(m, mode) {
      if (!m || !m.gm) return;
      var gm = m.gm;
      var isParents = (mode === 'parents');
      var modal = document.getElementById('arcade-parent-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'arcade-parent-modal';
        modal.className = 'arcade-parent-modal-backdrop';
        document.body.appendChild(modal);
      }

      var badgeHtml = isParents
        ? '<span class="apm-modal-badge"><i class="fas fa-users"></i> Información para Familias y Docentes</span>'
        : '<span class="apm-modal-badge"><i class="fas fa-gamepad"></i> Ficha Completa del Juego</span>';

      var extraHtml = '';
      if (isParents) {
        extraHtml =
          '<div class="apm-info-box is-benefits">' +
            '<h4><i class="fas fa-lightbulb"></i> ¿Por qué este juego y qué habilidades mejora?</h4>' +
            '<p>' + esc(gm.benefits || 'Fomenta el pensamiento lógico, la atención, la coordinación y la resolución de problemas de forma lúdica acorde a la edad escolar.') + '</p>' +
          '</div>';
      } else if (gm.controls || gm.instructions) {
        extraHtml =
          '<div class="apm-info-box is-benefits">' +
            '<h4><i class="fas fa-keyboard"></i> ¿Cómo se juega?</h4>' +
            '<p>' + esc(gm.controls || gm.instructions) + '</p>' +
          '</div>';
      }

      var tagsBlock = (gm.tags && gm.tags.length)
        ? '<div class="apm-info-tags">' +
            gm.tags.map(function (t) { return '<span class="post-tag">#' + esc(t) + '</span>'; }).join('') +
          '</div>'
        : '';

      modal.innerHTML =
        '<div class="arcade-parent-modal-card" role="dialog" aria-modal="true" aria-labelledby="apm-modal-title">' +
          '<div class="apm-modal-head">' +
            '<div class="apm-modal-head-left">' +
              badgeHtml +
              '<h3 id="apm-modal-title">' + esc(gm.title || 'Juego del Taller') + '</h3>' +
            '</div>' +
            '<button type="button" class="apm-modal-close" aria-label="Cerrar">&times;</button>' +
          '</div>' +
          '<div class="apm-modal-body">' +
            '<div class="apm-modal-hero">' +
              '<img src="' + esc(m.thumb) + '" alt="' + esc(gm.title) + '" class="apm-modal-thumb" onerror="this.src=\'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80\'">' +
              '<div class="apm-modal-pills">' +
                '<span class="game-card-badge ' + esc(m.pm.cls) + '" style="position:static;">' + m.pm.icon + ' ' + esc(m.pm.label) + '</span>' +
                '<span class="hn-game-grade-pill" style="position:static;background:' + esc(m.gradePillBg) + ';">' + esc(m.gradePillText) + '</span>' +
              '</div>' +
            '</div>' +
            '<div class="apm-info-box">' +
              '<h4><i class="fas fa-book-open"></i> ¿De qué trata este juego?</h4>' +
              '<p>' + esc(gm.description || 'Actividad interactiva seleccionada para el taller.') + '</p>' +
            '</div>' +
            extraHtml +
            tagsBlock +
          '</div>' +
          '<div class="apm-modal-foot">' +
            '<button type="button" class="apm-modal-btn-sec">Cerrar</button>' +
            '<a href="' + esc(m.url) + '"' + (m.ext ? ' target="_blank" rel="noopener noreferrer"' : '') + ' class="apm-modal-btn-play">' +
              '<i class="fas fa-play"></i> ¡Jugar ahora!' +
            '</a>' +
          '</div>' +
        '</div>';

      modal.style.display = 'flex';
      var closeFn = function () { modal.style.display = 'none'; };
      modal.querySelector('.apm-modal-close').onclick = closeFn;
      modal.querySelector('.apm-modal-btn-sec').onclick = closeFn;
      modal.onclick = function (e) { if (e.target === modal) closeFn(); };
      var modalPlayBtn = modal.querySelector('.apm-modal-btn-play');
      if (modalPlayBtn) {
        modalPlayBtn.onclick = function (e) {
          if (/^(chrome|edge):\/\//i.test(m.url || '')) {
            e.preventDefault();
            closeFn();
            openBrowserProtocolModal(m.url, gm.title);
          }
        };
      }
    }

    if (elPlay) {
      elPlay.addEventListener('click', function (e) {
        var cur = items[activeIdx];
        if (!cur) return;
        var m = getItemMeta(cur);
        if (/^(chrome|edge):\/\//i.test(m.url || '')) {
          e.preventDefault();
          openBrowserProtocolModal(m.url, m.gm && m.gm.title);
        }
      });
    }

    if (elBtnGameInfo) {
      elBtnGameInfo.addEventListener('click', function () {
        if (window.sounds && window.sounds.playClick) window.sounds.playClick();
        openArcadeInfoModal(getItemMeta(items[activeIdx]), 'game');
      });
    }

    if (elBtnParentInfo) {
      elBtnParentInfo.addEventListener('click', function () {
        if (window.sounds && window.sounds.playClick) window.sounds.playClick();
        openArcadeInfoModal(getItemMeta(items[activeIdx]), 'parents');
      });
    }

    function updateArcadeView(playSound) {
      if (!items.length) return;
      var total = items.length;
      activeIdx = ((activeIdx % total) + total) % total;
      var m = getItemMeta(items[activeIdx]);

      if (playSound && window.sounds && window.sounds.playClick) {
        window.sounds.playClick();
      }

      // Actualizar Monitor
      elCounter.textContent = (activeIdx + 1) + ' / ' + total;
      elImg.src = m.thumb;
      elImg.alt = m.gm.title || 'Juego';
      elImg.onerror = function () {
        this.src = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80';
      };
      elPlat.className = 'game-card-badge ' + m.pm.cls;
      elPlat.textContent = m.pm.icon + ' ' + m.pm.label;
      elGrade.style.background = m.gradePillBg;
      elGrade.textContent = m.gradePillText;
      elTitle.textContent = m.gm.title || 'Juego';
      elTitle.title = m.gm.title || 'Juego';
      elDesc.textContent = m.gm.description || '¡Divertite jugando y aprendiendo en el taller!';
      elPlay.href = m.url;
      if (m.ext) {
        elPlay.target = '_blank';
        elPlay.rel = 'noopener noreferrer';
      } else {
        elPlay.removeAttribute('target');
        elPlay.removeAttribute('rel');
      }

      // Renderizar hasta 9 ranuras curvas (-4 a +4) en la rueda
      var maxOffset = Math.min(4, Math.floor((total - 1) / 2));
      var slotsHtml = '';
      for (var d = -maxOffset; d <= maxOffset; d++) {
        var idx = ((activeIdx + d) % total + total) % total;
        var itemMeta = getItemMeta(items[idx]);
        var absD = Math.abs(d);
        var xShift = absD * absD * 14 + absD * 12; // Curva parabólica hacia la derecha
        var yShift = d * 64;
        var scale = d === 0 ? 1.06 : Math.max(0.64, 1 - absD * 0.1);
        var opacity = d === 0 ? 1 : Math.max(0.24, 1 - absD * 0.2);
        var rot = d * 4.5;
        var z = 20 - absD;

        slotsHtml +=
          '<button type="button" class="arcade-wheel-item' + (d === 0 ? ' is-center' : '') + '" ' +
            'data-idx="' + idx + '" data-offset="' + d + '" ' +
            'style="transform:translate3d(' + xShift + 'px, ' + yShift + 'px, 0) scale(' + scale + ') rotate(' + rot + 'deg);opacity:' + opacity + ';z-index:' + z + ';" ' +
            'title="' + esc(itemMeta.gm.title) + '">' +
            '<img src="' + esc(itemMeta.thumb) + '" alt="" class="awi-thumb" loading="lazy" onerror="this.src=\'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=200&q=60\'">' +
            '<div class="awi-text">' +
              '<span class="awi-title">' + esc(itemMeta.gm.title) + '</span>' +
              '<span class="awi-sub">' + esc(itemMeta.pm.icon + ' ' + itemMeta.pm.label) + '</span>' +
            '</div>' +
          '</button>';
      }
      elSlots.innerHTML = slotsHtml;

      elSlots.querySelectorAll('.arcade-wheel-item').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var clickedIdx = parseInt(btn.dataset.idx, 10);
          if (isNaN(clickedIdx)) return;
          if (clickedIdx === activeIdx) {
            elPlay.click();
          } else {
            activeIdx = clickedIdx;
            updateArcadeView(true);
          }
        });
      });
    }

    elBtnPrev.addEventListener('click', function () {
      activeIdx--;
      updateArcadeView(true);
    });
    elBtnNext.addEventListener('click', function () {
      activeIdx++;
      updateArcadeView(true);
    });

    elBtnRand.addEventListener('click', function () {
      if (isSpinningRandom || items.length < 2) return;
      isSpinningRandom = true;
      elBtnRand.disabled = true;
      var steps = 10 + Math.floor(Math.random() * 8);
      var currentStep = 0;
      function tick() {
        activeIdx++;
        updateArcadeView(true);
        currentStep++;
        if (currentStep < steps) {
          var delay = 55 + Math.floor((currentStep / steps) * 140);
          setTimeout(tick, delay);
        } else {
          isSpinningRandom = false;
          elBtnRand.disabled = false;
        }
      }
      tick();
    });

    // Rueda del mouse sobre la ruleta
    var wheelLock = false;
    elViewport.addEventListener('wheel', function (e) {
      e.preventDefault();
      if (wheelLock) return;
      wheelLock = true;
      if (e.deltaY > 0) activeIdx++;
      else activeIdx--;
      updateArcadeView(true);
      setTimeout(function () { wheelLock = false; }, 85);
    }, { passive: false });

    // Deslizar con el dedo en tablet / celular
    var touchStartY = null;
    elViewport.addEventListener('touchstart', function (e) {
      if (e.touches && e.touches[0]) touchStartY = e.touches[0].clientY;
    }, { passive: true });
    elViewport.addEventListener('touchend', function (e) {
      if (touchStartY === null || !e.changedTouches || !e.changedTouches[0]) return;
      var dy = e.changedTouches[0].clientY - touchStartY;
      touchStartY = null;
      if (Math.abs(dy) > 24) {
        if (dy < 0) activeIdx++;
        else activeIdx--;
        updateArcadeView(true);
      }
    }, { passive: true });

    // Teclado arriba / abajo cuando el foco está en el gabinete
    var cabinet = grid.querySelector('.arcade-cabinet');
    if (cabinet) {
      cabinet.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          e.preventDefault();
          activeIdx++;
          updateArcadeView(true);
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          e.preventDefault();
          activeIdx--;
          updateArcadeView(true);
        } else if (e.key === 'Enter') {
          elPlay.click();
        }
      });
    }

    updateArcadeView(false);
  }

  function checkCollapsibleGameDescs(container) {
    container = container || document.getElementById('hn-juegos-grid');
    if (!container) return;
    var runCheck = function () {
      var isHidden = !container.offsetParent && (container.offsetWidth === 0 && container.offsetHeight === 0);
      if (isHidden) return;

      var wraps = container.querySelectorAll('.game-card-desc-wrap');
      wraps.forEach(function (wrap) {
        if (wrap.classList.contains('is-expanded')) return;
        var textEl = wrap.querySelector('.game-card-desc');
        var btn = wrap.querySelector('.btn-game-desc-toggle');
        if (!textEl || !btn) return;
        // Si el contenido supera 10 líneas de texto (~205px), colapsar con botón "Ver más"
        if (textEl.scrollHeight > 208) {
          wrap.classList.add('is-collapsed');
          btn.style.display = 'inline-flex';
          btn.innerHTML = '<span><i class="fas fa-chevron-down"></i> Ver más</span>';
        } else {
          wrap.classList.remove('is-collapsed');
          btn.style.display = 'none';
        }
      });
    };
    requestAnimationFrame(runCheck);
    setTimeout(runCheck, 60);
    setTimeout(runCheck, 220);
  }
  window.checkCollapsibleGameDescs = checkCollapsibleGameDescs;

  window.toggleGameDesc = function (btn) {
    var wrap = btn.closest('.game-card-desc-wrap');
    if (!wrap) return;
    var isCollapsed = wrap.classList.contains('is-collapsed');
    if (isCollapsed) {
      wrap.classList.remove('is-collapsed');
      wrap.classList.add('is-expanded');
      btn.innerHTML = '<span><i class="fas fa-chevron-up"></i> Ver menos</span>';
    } else {
      wrap.classList.add('is-collapsed');
      wrap.classList.remove('is-expanded');
      btn.innerHTML = '<span><i class="fas fa-chevron-down"></i> Ver más</span>';
      wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  /* ───────────── Agenda: Mapa de Ideas y Presentaciones del Taller ───────────── */
  var filtroGradoAgenda = 'todos';

  function initAgendaGradeTabs() {
    var tabsEl = document.getElementById('hn-agenda-grade-tabs');
    if (!tabsEl || tabsEl.dataset.initialized) return;
    var st = alumno();
    if (st && st.gradeId) {
      filtroGradoAgenda = normalizarGrado(st.gradeId);
    }
    var tabsList = [
      { id: 'todos', label: '🌟 Todos' },
      { id: 'sala5', label: '🎨 Sala 5' },
      { id: 'grado1', label: '1.°' },
      { id: 'grado2', label: '2.°' },
      { id: 'grado3', label: '3.°' },
      { id: 'grado4', label: '4.°' },
      { id: 'grado5', label: '5.°' },
      { id: 'grado6', label: '6.°' }
    ];
    tabsEl.innerHTML = tabsList.map(function (t) {
      var act = (filtroGradoAgenda === t.id);
      return '<button type="button" class="fb-mochila-tab' + (act ? ' active' : '') + '" role="tab" data-agenda-grade="' + esc(t.id) + '" aria-selected="' + (act ? 'true' : 'false') + '">' + esc(t.label) + '</button>';
    }).join('');
    tabsEl.querySelectorAll('.fb-mochila-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        filtroGradoAgenda = btn.getAttribute('data-agenda-grade') || 'todos';
        renderAgenda(filtroGradoAgenda);
      });
    });
    tabsEl.dataset.initialized = 'true';
  }

  window.openAgendaProject = function (id) {
    if (!id) return;
    var list = (C.actividades || []);
    var proj = list.filter(function (a) { return String(a.id) === String(id); })[0];
    if (proj && typeof abrirModalClasePeriodico === 'function') {
      abrirModalClasePeriodico(proj, { a: proj, estado: estadoActividad(proj) });
    }
  };

  function renderAgenda(gradoFiltro) {
    var cont = document.getElementById('hn-agenda-list');
    if (!cont) return;
    initAgendaGradeTabs();

    if (gradoFiltro) {
      filtroGradoAgenda = normalizarGrado(gradoFiltro);
    }

    document.querySelectorAll('#hn-agenda-grade-tabs .fb-mochila-tab').forEach(function (btn) {
      var act = btn.getAttribute('data-agenda-grade') === filtroGradoAgenda;
      btn.classList.toggle('active', act);
      btn.setAttribute('aria-selected', act ? 'true' : 'false');
    });

    var h = hoy();
    var normFiltro = normalizarGrado(filtroGradoAgenda);

    var proyectosClase = (C.actividades || []).filter(function (a) {
      if (!(a.tipo === 'clase' || seccionDe(a) === 'clase')) return false;
      if (!(a.desde || a.fecha)) return false;
      if (normFiltro === 'todos') return true;
      var grs = (a.grados || [a.grado || 'todos']).map(normalizarGrado);
      return grs.indexOf('todos') !== -1 || grs.indexOf(normFiltro) !== -1;
    });

    var sumEl = document.getElementById('hn-agenda-summary');
    if (sumEl) {
      sumEl.textContent = proyectosClase.length === 1
        ? '🌟 1 presentación e idea en el taller'
        : '🌟 ' + proyectosClase.length + ' presentaciones e ideas en el taller';
    }

    if (!proyectosClase.length) {
      cont.innerHTML = '<div class="hn-empty" style="padding:28px;"><span>💡</span>Todavía no hay presentaciones cargadas para este grupo.</div>';
      return;
    }

    // Ordenar del más reciente al más antiguo
    proyectosClase.sort(function (a, b) {
      var da = parseFecha(a.desde || a.fecha);
      var db = parseFecha(b.desde || b.fecha);
      return (db ? db.getTime() : 0) - (da ? da.getTime() : 0);
    });

    // Agrupar por Mes y Año
    var gruposMap = {};
    var gruposOrden = [];
    proyectosClase.forEach(function (p) {
      var d = parseFecha(p.desde || p.fecha);
      var key = d ? (d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2)) : 'sin-fecha';
      var label = d ? (MESES[d.getMonth()].charAt(0).toUpperCase() + MESES[d.getMonth()].slice(1) + ' ' + d.getFullYear()) : 'Otras Ideas';
      if (!gruposMap[key]) {
        gruposMap[key] = { label: label, items: [] };
        gruposOrden.push(gruposMap[key]);
      }
      gruposMap[key].items.push(p);
    });

    cont.innerHTML = gruposOrden.map(function (grupo) {
      var cardsHtml = grupo.items.map(function (p) {
        var fechaStr = p.desde || p.fecha;
        var d = parseFecha(fechaStr);
        var diaNum = d ? d.getDate() : '--';
        var mesTxt = d ? MESES_CORTOS[d.getMonth()] : '';

        var n = d ? diasEntre(h, d) : null;
        var estadoTiempo = '🌟 ¡Presentado en el Taller!';
        var statusCls = 'st-done';
        if (n !== null) {
          if (n === 0) {
            estadoTiempo = '🎉 ¡Presentamos Hoy!';
            statusCls = 'st-today';
          } else if (n === 1 || (n > 1 && n <= 7)) {
            estadoTiempo = '⚡ ¡Creando Ahora!';
            statusCls = 'st-soon';
          } else if (n > 7) {
            estadoTiempo = '💡 ¡Próxima Idea!';
            statusCls = 'st-upcoming';
          }
        }

        var gr = p.grados || [p.grado || 'todos'];
        var grTxt = gr.indexOf('todos') > -1 ? 'Todos los grados' : gr.map(nombreGrado).join(' · ');

        var thumbHtml = p.imagen
          ? '<img src="' + esc(p.imagen) + '" alt="' + esc(p.titulo) + '" loading="lazy" onerror="this.style.display=\'none\';if(this.nextElementSibling)this.nextElementSibling.style.display=\'flex\';"><div class="fb-ag-thumb-emoji" style="display:none;">' + esc(p.icono || '🤖') + '</div>'
          : '<div class="fb-ag-thumb-emoji">' + esc(p.icono || '🤖') + '</div>';

        var chipsArr = (p.chips && p.chips.length) ? p.chips.slice(0, 3) : (p.subtitulo ? [p.subtitulo] : ['Proyecto Maker']);
        var chipsHtml = chipsArr.map(function (c) {
          return '<span class="fb-ag-chip">' + esc(c) + '</span>';
        }).join('');

        return '<article class="fb-ag-card ' + statusCls + '" onclick="window.openAgendaProject(\'' + esc(p.id) + '\')" tabindex="0" role="button" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();window.openAgendaProject(\'' + esc(p.id) + '\');}" aria-label="Ver proyecto: ' + esc(p.titulo) + '">' +
          '<div class="fb-ag-card-left">' +
            '<div class="fb-ag-date"><span class="d">' + diaNum + '</span><span class="m">' + mesTxt + '</span></div>' +
            '<div class="fb-ag-thumb">' + thumbHtml + '</div>' +
          '</div>' +
          '<div class="fb-ag-info">' +
            '<div class="fb-ag-meta">' +
              '<span class="fb-ag-grade">🎓 ' + esc(grTxt) + '</span>' +
              '<span class="fb-ag-badge ' + statusCls + '">' + estadoTiempo + '</span>' +
            '</div>' +
            '<h3 class="fb-ag-title">' + esc(p.titulo) + '</h3>' +
            '<div class="fb-ag-chips">' + chipsHtml + '</div>' +
            '<div class="fb-ag-foot"><span class="fb-ag-cta">👀 ¡Ver proyecto e ideas! ➔</span></div>' +
          '</div>' +
        '</article>';
      }).join('');

      return '<div class="fb-ag-month-block">' +
        '<div class="fb-ag-month-head">' +
          '<span class="fb-ag-month-title">🗓️ ' + esc(grupo.label) + '</span>' +
          '<span class="fb-ag-month-count">' + grupo.items.length + (grupo.items.length === 1 ? ' proyecto' : ' proyectos') + '</span>' +
        '</div>' +
        '<div class="fb-ag-cards-grid">' + cardsHtml + '</div>' +
      '</div>';
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
    var videoId = '';
    var m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([\w-]{11})/);
    if (m && m[1]) {
      videoId = m[1];
    } else {
      var m2 = url.match(/embed\/([\w-]{11})/);
      if (m2 && m2[1]) videoId = m2[1];
    }
    if (videoId) {
      return 'https://www.youtube-nocookie.com/embed/' + videoId + '?rel=0';
    }
    return url;
  }

  function getYouTubeWatchUrl(url) {
    if (!url) return '';
    var m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([\w-]{11})/);
    if (m && m[1]) return 'https://www.youtube.com/watch?v=' + m[1];
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

  function extractPostThumbnail(p) {
    if (!p) return { url: 'img/escudo_paulo_freire.png', badge: '🤖' };

    // 1. Si es video (YouTube o directo)
    var vidUrl = (p.video && p.video.url) || (p.tipoMedia === 'video' && p.mediaUrl) || (p.mediaUrl && p.mediaUrl.indexOf('youtu') !== -1 ? p.mediaUrl : '');
    if (vidUrl) {
      var ytMatch = vidUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
      if (ytMatch) {
        return {
          url: 'https://img.youtube.com/vi/' + ytMatch[1] + '/mqdefault.jpg',
          badge: '🎬'
        };
      }
      if (p.video && p.video.poster) {
        return { url: p.video.poster, badge: '🎬' };
      }
    }

    // 2. Si tiene galería de fotos
    if (p.fotos && p.fotos.length) {
      var first = p.fotos[0];
      var fUrl = typeof first === 'string' ? first : (first && (first.url || first.src));
      if (fUrl) return { url: fUrl, badge: p.fotos.length > 1 ? '📷 ' + p.fotos.length : '🖼️' };
    }

    // 3. Si tiene foto o imagen individual
    if (p.imagen) {
      return { url: p.imagen, badge: '🖼️' };
    }
    if (p.mediaUrl && p.tipoMedia !== 'video') {
      return { url: p.mediaUrl, badge: '🖼️' };
    }

    // 4. Fallback: escudo del colegio
    return { url: 'img/escudo_paulo_freire.png', badge: '🤖' };
  }

  function getPostDisplayTitle(p) {
    if (p.titulo && String(p.titulo).trim()) return String(p.titulo).trim();
    if (p.title && String(p.title).trim()) return String(p.title).trim();
    if (p.video && p.video.titulo && String(p.video.titulo).trim()) return String(p.video.titulo).trim();
    var txt = String(p.texto || '').replace(/[#*`_>]/g, '').trim();
    if (txt) {
      var lines = txt.split(/\r?\n/);
      var first = (lines[0] || '').trim();
      var punctMatch = first.match(/^[^\.!\?]+[\.!\?]/);
      if (punctMatch && punctMatch[0].length >= 10 && punctMatch[0].length <= 65) {
        return punctMatch[0].trim();
      }
      return first.length > 55 ? first.substring(0, 52) + '...' : first;
    }
    return 'Actividad en clase';
  }

  function getPostGradeDisplay(p) {
    if (p.etiquetaGrado && p.etiquetaGrado !== 'todos') {
      return p.etiquetaGrado;
    } else if (p.grados && p.grados.length) {
      if (p.grados.indexOf('todos') !== -1) return 'Todo el Colegio';
      return p.grados.map(nombreGrado).join(' · ');
    } else if (p.grado) {
      return nombreGrado(p.grado);
    }
    return 'Todo el Colegio';
  }

  var muroIdxSelectedYear = null;
  var muroIdxSelectedMonth = 'all';

  function renderMuroIndex(posts) {
    var listEl = document.getElementById('hn-muro-index-list');
    var countEl = document.getElementById('hn-muro-index-count');
    if (!listEl) return;

    if (countEl) countEl.textContent = posts ? posts.length : 0;

    if (!posts || !posts.length) {
      listEl.innerHTML = '<div class="hn-muro-index-empty"><i class="fas fa-search" style="font-size:1.1rem; margin-bottom:4px; display:block;"></i>No hay actividades</div>';
      return;
    }

    var MESES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    var byYear = {};
    var yearsOrder = [];

    posts.forEach(function (p) {
      var fObj = parseFecha(p.fecha) || (p._time ? new Date(p._time) : null);
      var y = fObj ? String(fObj.getFullYear()) : 'Varios';
      var m = fObj ? fObj.getMonth() : -1;
      if (!byYear[y]) {
        byYear[y] = { total: 0, months: {}, monthsOrder: [], posts: [] };
        yearsOrder.push(y);
      }
      byYear[y].total++;
      byYear[y].posts.push({ post: p, month: m });
      if (m >= 0) {
        if (!byYear[y].months[m]) {
          byYear[y].months[m] = 0;
          byYear[y].monthsOrder.push(m);
        }
        byYear[y].months[m]++;
      }
    });

    if (!muroIdxSelectedYear || !byYear[muroIdxSelectedYear]) {
      muroIdxSelectedYear = yearsOrder[0];
      muroIdxSelectedMonth = 'all';
    }

    var yearData = byYear[muroIdxSelectedYear];
    if (muroIdxSelectedMonth !== 'all' && !yearData.months[muroIdxSelectedMonth]) {
      muroIdxSelectedMonth = 'all';
    }

    var yearsHtml =
      '<div class="muro-idx-years">' +
        yearsOrder.map(function (y) {
          var activeCls = (y === muroIdxSelectedYear) ? ' active' : '';
          return '<button type="button" class="muro-idx-year-btn' + activeCls + '" data-idx-year="' + esc(y) + '">' +
            '<i class="far fa-calendar"></i> ' + esc(y) + ' <span>' + byYear[y].total + '</span>' +
          '</button>';
        }).join('') +
      '</div>';

    var monthsHtml =
      '<div class="muro-idx-months">' +
        '<button type="button" class="muro-idx-month-btn' + (muroIdxSelectedMonth === 'all' ? ' active' : '') + '" data-idx-month="all">' +
          '🎞️ Todos <span>' + yearData.total + '</span>' +
        '</button>' +
        yearData.monthsOrder.map(function (m) {
          var isAct = String(muroIdxSelectedMonth) === String(m);
          return '<button type="button" class="muro-idx-month-btn' + (isAct ? ' active' : '') + '" data-idx-month="' + m + '">' +
            MESES_CORTO[m] + ' <span>' + yearData.months[m] + '</span>' +
          '</button>';
        }).join('') +
      '</div>';

    var visiblePosts = yearData.posts.filter(function (entry) {
      return muroIdxSelectedMonth === 'all' || String(entry.month) === String(muroIdxSelectedMonth);
    }).map(function (entry) { return entry.post; });

    var itemsHtml = visiblePosts.map(function (p) {
      var thumb = extractPostThumbnail(p);
      var title = getPostDisplayTitle(p);
      var grade = getPostGradeDisplay(p);

      return (
        '<div class="hn-muro-index-item" data-post-id="' + esc(p.id) + '" onclick="window.jumpToPost(\'' + esc(p.id) + '\')" role="button" tabindex="0" title="Ir a: ' + esc(title) + '">' +
          '<div class="hn-muro-index-thumb">' +
            '<img src="' + esc(thumb.url) + '" alt="' + esc(title) + '" onerror="this.onerror=null; this.src=\'img/escudo_paulo_freire.png\';">' +
            (thumb.badge ? '<span class="thumb-badge">' + thumb.badge + '</span>' : '') +
          '</div>' +
          '<div class="hn-muro-index-info">' +
            '<span class="hn-muro-index-item-title">' + esc(title) + '</span>' +
            '<span class="hn-muro-index-item-sub"><i class="fas fa-users"></i> ' + esc(grade) + '</span>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    listEl.innerHTML = yearsHtml + monthsHtml + '<div class="muro-idx-items-wrap">' + itemsHtml + '</div>';

    listEl.querySelectorAll('.muro-idx-year-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        muroIdxSelectedYear = btn.dataset.idxYear;
        muroIdxSelectedMonth = 'all';
        renderMuroIndex(posts);
      });
    });

    listEl.querySelectorAll('.muro-idx-month-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        muroIdxSelectedMonth = btn.dataset.idxMonth;
        renderMuroIndex(posts);
        if (muroIdxSelectedMonth !== 'all') {
          var markerEl = document.getElementById('tl-month-' + muroIdxSelectedYear + '-' + muroIdxSelectedMonth);
          if (markerEl) {
            var rect = markerEl.getBoundingClientRect();
            window.scrollTo({ top: window.pageYOffset + rect.top - 84, behavior: 'smooth' });
          }
        }
      });
    });
  }

  window.jumpToPost = function (postId) {
    var card = document.getElementById('post-' + postId);
    if (!card) return;

    var indexItems = document.querySelectorAll('.hn-muro-index-item');
    indexItems.forEach(function (it) {
      if (it.getAttribute('data-post-id') === postId) it.classList.add('active');
      else it.classList.remove('active');
    });

    var topbarH = 80;
    var rect = card.getBoundingClientRect();
    var targetY = window.pageYOffset + rect.top - topbarH;
    window.scrollTo({ top: targetY, behavior: 'smooth' });

    card.classList.remove('highlight-jump');
    void card.offsetWidth;
    card.classList.add('highlight-jump');
    setTimeout(function () {
      card.classList.remove('highlight-jump');
    }, 2200);
  };

  function renderPostMediaHtml(p) {
    if (!p) return '';
    if (p.tipoMedia === 'video' && p.video) {
      var isYt = (p.video.tipo === 'youtube') || (p.video.url && p.video.url.indexOf('youtu') !== -1);
      if (isYt) {
        var embedSrc = toYouTubeEmbed(p.video.url);
        var watchUrl = getYouTubeWatchUrl(p.video.url);
        return '<div class="hn-post-media">' +
          '<div class="hn-video-responsive">' +
            '<iframe src="' + esc(embedSrc) + '" title="' + esc((p.texto || '').slice(0, 50)) + '" ' +
            'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" ' +
            'referrerpolicy="strict-origin-when-cross-origin" ' +
            'allowfullscreen></iframe>' +
          '</div>' +
          (watchUrl ? '<div style="padding:8px 12px; background:#F8FAFC; border-top:1px solid #E2E8F0; display:flex; justify-content:flex-end;">' +
            '<a href="' + esc(watchUrl) + '" target="_blank" rel="noopener noreferrer" style="font-size:0.8rem; font-weight:700; color:#DC2626; text-decoration:none; display:inline-flex; align-items:center; gap:6px;">' +
              '<i class="fab fa-youtube"></i> Ver en YouTube <i class="fas fa-external-link-alt" style="font-size:0.7rem;"></i>' +
            '</a>' +
          '</div>' : '') +
        '</div>';
      } else if (p.video.url) {
        return '<div class="hn-post-media">' +
          '<video class="hn-video-player" controls preload="metadata"' + (p.video.poster ? ' poster="' + esc(p.video.poster) + '"' : '') + '>' +
            '<source src="' + esc(p.video.url) + '" type="video/mp4">' +
            'Tu navegador no soporta reproducción de video.' +
          '</video>' +
        '</div>';
      }
    } else if (p.fotos && p.fotos.length > 1) {
      var numCols = Math.min(p.fotos.length, 3);
      return '<div class="hn-post-media">' +
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
      return '<div class="hn-post-media">' +
        '<div class="hn-post-photo-single" data-photo="' + esc(singleImg) + '" data-post-title="' + esc(p.autor) + '" role="button" tabindex="0" title="Ver foto en tamaño completo">' +
          '<img src="' + esc(singleImg) + '" alt="' + esc(p.autor) + '" loading="lazy">' +
        '</div>' +
      '</div>';
    }
    return '';
  }

  function renderMuro() {
    var cont = document.getElementById('hn-muro-feed');
    if (!cont) return;

    var allPosts = (C.muro || []).slice().sort(function (a, b) {
      var ta = a._time || (parseFecha(a.fecha) ? parseFecha(a.fecha).getTime() : 0);
      var tb = b._time || (parseFecha(b.fecha) ? parseFecha(b.fecha).getTime() : 0);
      return tb - ta;
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
      if (filtroGradoMuro !== 'todos') {
        var postGrades = p.grados || [p.grado || 'todos'];
        var normalizedPostGrades = postGrades.map(normalizarGrado);
        var normFiltro = normalizarGrado(filtroGradoMuro);
        var match = normalizedPostGrades.indexOf('todos') !== -1 || normalizedPostGrades.indexOf(normFiltro) !== -1;
        if (!match) return false;
      }
      if (filtroMediaMuro === 'video' && p.tipoMedia !== 'video') return false;
      if (filtroMediaMuro === 'galeria' && p.tipoMedia !== 'galeria' && p.tipoMedia !== 'foto') return false;
      return true;
    });

    if (!filtered.length) {
      cont.classList.add('muro-timeline-feed');
      renderMuroIndex([]);
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

    cont.classList.add('muro-timeline-feed');

    var MESES_TL = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    var lastMonthKey = '';

    cont.innerHTML = filtered.map(function (p, idx) {
      var isPotentiallyLong = !!(p.texto && (p.texto.length > 220 || p.texto.split('\n').length > 4));
      var initialWrapClass = 'hn-post-text-wrap' + (isPotentiallyLong ? ' is-collapsed' : '');
      var initialBtnStyle = isPotentiallyLong ? 'display:inline-flex;' : 'display:none;';
      var postUrl = getPostUrl(p.id);
      var shareText = p.autor + ': ' + (p.texto || '').substring(0, 110) + '...\n' + postUrl;

      // Etiqueta de grupos
      var grDisplay = '';
      if (p.etiquetaGrado && p.etiquetaGrado !== 'todos') {
        grDisplay = p.etiquetaGrado;
      } else if (p.grados && p.grados.length) {
        if (p.grados.indexOf('todos') !== -1) grDisplay = 'Todo el Colegio';
        else grDisplay = p.grados.map(nombreGrado).join(' · ');
      } else {
        grDisplay = nombreGrado(p.grado);
      }

      // Separador de Mes/Año en la Línea de Tiempo
      var fObj = parseFecha(p.fecha) || (p._time ? new Date(p._time) : null);
      var monthKey = fObj ? (MESES_TL[fObj.getMonth()] + ' ' + fObj.getFullYear()) : 'Recuerdos del Taller';
      var monthMarkerId = fObj ? ('tl-month-' + fObj.getFullYear() + '-' + fObj.getMonth()) : '';
      var monthMarkerHtml = '';
      if (monthKey !== lastMonthKey) {
        lastMonthKey = monthKey;
        monthMarkerHtml =
          '<div class="tl-month-marker"' + (monthMarkerId ? ' id="' + monthMarkerId + '"' : '') + '>' +
            '<span class="tl-month-pill"><i class="far fa-calendar-alt"></i> ' + esc(monthKey) + '</span>' +
          '</div>';
      }

      var isVideoPost = (p.tipoMedia === 'video');
      var nodeIcon = isVideoPost ? '🎬' : '📸';
      var sceneNum = (idx + 1 < 10 ? '0' : '') + (idx + 1);
      var sceneLabel = (isVideoPost ? 'ESCENA #' : 'TOMA #') + sceneNum;
      var mediaHtml = renderPostMediaHtml(p);

      var tagsHtml = (p.tags && p.tags.length)
        ? '<div class="hn-post-tags tl-film-tags">' + p.tags.map(function (t) { return '<span>#' + esc(t) + '</span>'; }).join('') + '</div>'
        : '';

      return monthMarkerHtml +
        '<div class="tl-entry' + (idx % 2 === 1 ? ' is-alt' : '') + '" id="post-' + esc(p.id) + '">' +
          '<div class="tl-node" title="' + (isVideoPost ? 'Video' : 'Fotografía') + '">' + nodeIcon + '</div>' +
          '<article class="tl-film-frame">' +
            '<div class="tl-film-sprockets" aria-hidden="true"></div>' +
            '<div class="tl-film-inner">' +
              '<header class="tl-film-header">' +
                '<div class="tl-card-chips">' +
                  '<span class="tl-film-scene">' + nodeIcon + ' ' + sceneLabel + '</span>' +
                  '<span class="tl-film-date"><i class="far fa-clock"></i> ' + esc(fechaRelativa(p.fecha)) + '</span>' +
                  '<span class="tl-film-grade"><i class="fas fa-graduation-cap"></i> ' + esc(grDisplay) + '</span>' +
                '</div>' +
                '<div class="hn-post-top-action">' +
                  '<button type="button" class="tl-film-icon-btn" onclick="window.abrirModalPostMuro(\'' + esc(p.id) + '\')" title="Ver en grande">' +
                    '<i class="fas fa-expand-alt"></i>' +
                  '</button>' +
                  '<button type="button" class="tl-film-icon-btn" onclick="window.copiarEnlacePost(\'' + esc(p.id) + '\')" title="Copiar enlace">' +
                    '<i class="fas fa-link"></i>' +
                  '</button>' +
                '</div>' +
              '</header>' +
              '<div class="tl-film-body-row">' +
                '<div class="tl-film-viewport">' +
                  mediaHtml +
                '</div>' +
                '<div class="tl-film-right-col">' +
                  '<div class="tl-film-caption">' +
                    (p.titulo ? '<h3 class="tl-film-title">' + esc(p.titulo) + '</h3>' : '') +
                    '<div class="' + initialWrapClass + ' tl-film-text-wrap">' +
                      '<div class="hn-post-text tl-film-text">' + formatMarkdown(p.texto) + '</div>' +
                      '<button type="button" class="hn-post-readmore tl-film-readmore" onclick="window.togglePostText(this)" style="' + initialBtnStyle + '" title="Ampliar texto">' +
                        '<span><i class="fas fa-book-open"></i> Ver más</span> <i class="fas fa-chevron-down"></i>' +
                      '</button>' +
                    '</div>' +
                    tagsHtml +
                  '</div>' +
                  '<footer class="tl-film-footer">' +
                    '<button type="button" class="tl-film-btn is-primary" onclick="window.abrirModalPostMuro(\'' + esc(p.id) + '\')">' +
                      '<i class="fas fa-expand"></i> <span>Ver en Grande</span>' +
                    '</button>' +
                    '<button type="button" class="tl-film-btn" onclick="window.compartirPost(\'' + esc(p.id) + '\')">' +
                      '<i class="fas fa-share-alt"></i> <span>Compartir</span>' +
                    '</button>' +
                    '<a class="tl-film-btn is-wsp" target="_blank" rel="noopener noreferrer" href="https://api.whatsapp.com/send?text=' + encodeURIComponent(shareText) + '">' +
                      '<i class="fab fa-whatsapp"></i> <span>WhatsApp</span>' +
                    '</a>' +
                  '</footer>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="tl-film-sprockets" aria-hidden="true"></div>' +
          '</article>' +
        '</div>';
    }).join('');

    // Detectar posts largos (más de 10 líneas de código/texto) y activar el botón "Ver más"
    checkCollapsiblePosts(cont);

    // Renderizar el índice lateral de actividades
    renderMuroIndex(filtered);

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

  function checkCollapsiblePosts(container) {
    container = container || document.getElementById('hn-muro-feed');
    if (!container) return;

    var runCheck = function () {
      // Si el contenedor está dentro de una vista oculta (display: none),
      // offsetWidth / offsetHeight son 0. En ese caso NO alteramos ni removemos
      // las clases colapsadas porque scrollHeight no es medible con precisión.
      var isHidden = !container.offsetParent && (container.offsetWidth === 0 && container.offsetHeight === 0);
      if (isHidden) return;

      var wraps = container.querySelectorAll('.hn-post-text-wrap');
      wraps.forEach(function (wrap) {
        if (wrap.classList.contains('is-expanded')) return;
        var textEl = wrap.querySelector('.hn-post-text');
        var btn = wrap.querySelector('.hn-post-readmore');
        if (!textEl || !btn) return;

        // Si el contenido supera 10 líneas de texto/código (~255px), colapsar con botón "Ver más"
        if (textEl.scrollHeight > 255) {
          wrap.classList.add('is-collapsed');
          btn.style.display = 'inline-flex';
          btn.innerHTML = '<span><i class="fas fa-book-open"></i> Ver más (ampliar crónica)</span> <i class="fas fa-chevron-down"></i>';
        } else {
          wrap.classList.remove('is-collapsed');
          btn.style.display = 'none';
        }
      });
    };

    requestAnimationFrame(runCheck);
    setTimeout(runCheck, 60);
    setTimeout(runCheck, 220);
  }
  window.checkCollapsiblePosts = checkCollapsiblePosts;

  window.togglePostText = function (btn) {
    var wrap = btn.closest('.hn-post-text-wrap');
    if (!wrap) return;
    var isCollapsed = wrap.classList.contains('is-collapsed');
    if (isCollapsed) {
      wrap.classList.remove('is-collapsed');
      wrap.classList.add('is-expanded');
      btn.innerHTML = '<span><i class="fas fa-chevron-up"></i> Ver menos (plegar crónica)</span>';
    } else {
      wrap.classList.add('is-collapsed');
      wrap.classList.remove('is-expanded');
      btn.innerHTML = '<span><i class="fas fa-book-open"></i> Ver más (ampliar crónica)</span> <i class="fas fa-chevron-down"></i>';
      wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  /* ───────────── Modal Publicación Muro en Vista Ampliada ───────────── */
  window.abrirModalPostMuro = function(id) {
    var allPosts = (C.muro || []);
    var p = allPosts.filter(function (x) { return x.id === id; })[0];
    if (!p) return;
    var modal = document.getElementById('muro-ampliado-modal');
    if (!modal) return;

    var avatarEl = document.getElementById('mam-avatar');
    var authorEl = document.getElementById('mam-author');
    var titleEl = document.getElementById('mam-title');
    var badgeEl = document.getElementById('mam-badge');
    var dateEl = document.getElementById('mam-date');
    var gradeEl = document.getElementById('mam-grade');
    var mediaEl = document.getElementById('mam-media');
    var textEl = document.getElementById('mam-text');
    var tagsEl = document.getElementById('mam-tags');
    var actionsEl = document.getElementById('mam-actions');

    if (avatarEl) {
      avatarEl.src = esc(p.avatar || 'img/escudo_paulo_freire.png');
      avatarEl.alt = esc(p.autor || '');
    }
    if (authorEl) authorEl.textContent = p.autor || 'Taller de Robótica';
    if (titleEl) {
      var mTitle = p.titulo || getPostDisplayTitle(p);
      titleEl.textContent = mTitle;
      titleEl.style.display = mTitle ? 'block' : 'none';
    }
    if (badgeEl) {
      badgeEl.textContent = p.etiqueta || '';
      badgeEl.style.display = p.etiqueta ? 'inline-block' : 'none';
    }
    if (dateEl) dateEl.innerHTML = '<i class="far fa-clock"></i> ' + esc(fechaRelativa(p.fecha));
    if (gradeEl) {
      var grDisplay = '';
      if (p.etiquetaGrado && p.etiquetaGrado !== 'todos') {
        grDisplay = p.etiquetaGrado;
      } else if (p.grados && p.grados.length) {
        if (p.grados.indexOf('todos') !== -1) grDisplay = 'Todo el Colegio';
        else grDisplay = p.grados.map(nombreGrado).join(' · ');
      } else {
        grDisplay = nombreGrado(p.grado);
      }
      gradeEl.textContent = grDisplay;
    }

    if (mediaEl) {
      var mediaHtml = renderPostMediaHtml(p);
      mediaEl.innerHTML = mediaHtml;
      mediaEl.style.display = mediaHtml ? 'block' : 'none';

      // Event listener para fotos en modal
      mediaEl.querySelectorAll('[data-photo]').forEach(function (el) {
        el.addEventListener('click', function () {
          var src = el.dataset.photo;
          var title = el.dataset.postTitle || 'Actividad en clase';
          if (window.openImageModal) window.openImageModal(src, title);
        });
      });
    }

    if (textEl) {
      var rawStory = String(p.texto || '').trim();
      var lines = rawStory.split(/\r?\n/);
      var sections = [];
      var curSec = { title: '📖 Resumen', lines: [] };

      lines.forEach(function (ln) {
        var trimmed = ln.trim();
        var headingMatch = trimmed.match(/^(?:#{1,3}\s+|[📌🛠️💡🚀🎯🎬📸✅🏆🎨🤖]\s*\*?\*?)(.+)$/);
        var isExplicitHeading = /^#{1,3}\s+/.test(trimmed) || (/^[📌🛠️💡🚀🎯🎬📸✅🏆🎨🤖]/.test(trimmed) && trimmed.length < 70 && curSec.lines.length > 0);
        if (isExplicitHeading && headingMatch) {
          if (curSec.lines.join('').trim()) sections.push(curSec);
          var cleanTitle = trimmed.replace(/^#{1,3}\s+/, '').replace(/\*\*/g, '').replace(/:$/, '').trim();
          if (cleanTitle.length > 26) cleanTitle = cleanTitle.substring(0, 24).trim() + '…';
          curSec = { title: cleanTitle, lines: [] };
        } else {
          curSec.lines.push(ln);
        }
      });
      if (curSec.lines.join('').trim()) sections.push(curSec);

      // Si quedó en 1 sola sección larga, dividir en partes de ~320 caracteres para evitar scroll
      if (sections.length === 1 && rawStory.length > 340) {
        var paras = rawStory.split(/\n\s*\n/).filter(Boolean);
        if (paras.length >= 2) {
          sections = [];
          var buf = [];
          var bufLen = 0;
          paras.forEach(function (para) {
            if (buf.length && bufLen + para.length > 320) {
              sections.push({ title: '📖 Parte ' + (sections.length + 1), lines: [buf.join('\n\n')] });
              buf = [para];
              bufLen = para.length;
            } else {
              buf.push(para);
              bufLen += para.length;
            }
          });
          if (buf.length) sections.push({ title: '📖 Parte ' + (sections.length + 1), lines: [buf.join('\n\n')] });
        }
      }

      if (sections.length > 1) {
        var tabsNavHtml =
          '<div class="mam-story-tabs" role="tablist">' +
            sections.map(function (sec, sIdx) {
              return '<button type="button" class="mam-story-tab-btn' + (sIdx === 0 ? ' active' : '') + '" data-mam-tab="' + sIdx + '">' + esc(sec.title) + '</button>';
            }).join('') +
          '</div>';
        var tabsBodyHtml =
          '<div class="mam-story-panes">' +
            sections.map(function (sec, sIdx) {
              return '<div class="mam-story-pane' + (sIdx === 0 ? ' active' : '') + '" data-mam-pane="' + sIdx + '">' +
                formatMarkdown(sec.lines.join('\n')) +
              '</div>';
            }).join('') +
          '</div>';
        textEl.innerHTML = tabsNavHtml + tabsBodyHtml;

        textEl.querySelectorAll('.mam-story-tab-btn').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var target = btn.getAttribute('data-mam-tab');
            textEl.querySelectorAll('.mam-story-tab-btn').forEach(function (b) {
              b.classList.toggle('active', b.getAttribute('data-mam-tab') === target);
            });
            textEl.querySelectorAll('.mam-story-pane').forEach(function (pane) {
              pane.classList.toggle('active', pane.getAttribute('data-mam-pane') === target);
            });
          });
        });
      } else {
        textEl.innerHTML = formatMarkdown(rawStory);
      }
    }

    if (tagsEl) {
      tagsEl.innerHTML = (p.tags && p.tags.length > 0)
        ? p.tags.map(function(t) { return '<span class="hn-tag">#' + esc(t) + '</span>'; }).join('')
        : '';
    }

    if (actionsEl) {
      var postUrl = getPostUrl(p.id);
      var shareText = p.autor + ': ' + (p.texto || '').substring(0, 110) + '...\n' + postUrl;
      actionsEl.innerHTML =
        '<button type="button" class="tl-film-btn is-primary" onclick="window.compartirPost(\'' + esc(p.id) + '\')" title="Compartir actividad">' +
          '<i class="fas fa-share-alt"></i> <span>Compartir</span>' +
        '</button>' +
        '<button type="button" class="tl-film-btn" onclick="window.copiarEnlacePost(\'' + esc(p.id) + '\')" title="Copiar enlace al portapapeles">' +
          '<i class="fas fa-link"></i> <span>Copiar enlace</span>' +
        '</button>' +
        '<a class="tl-film-btn is-wsp" target="_blank" rel="noopener noreferrer" href="https://api.whatsapp.com/send?text=' + encodeURIComponent(shareText) + '" title="Compartir por WhatsApp">' +
          '<i class="fab fa-whatsapp"></i> <span>WhatsApp</span>' +
        '</a>';
    }

    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  window.cerrarModalPostMuro = function() {
    var modal = document.getElementById('muro-ampliado-modal');
    if (!modal) return;
    // Detener videos o audios
    var vids = modal.querySelectorAll('video, audio');
    vids.forEach(function(v) { try { v.pause(); } catch(e){} });
    // Detener iframes de YouTube recargando src
    var iframes = modal.querySelectorAll('iframe');
    iframes.forEach(function(f) { try { var s = f.src; f.src = s; } catch(e){} });

    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  function initMuroAmpliadoModal() {
    var closeBtn = document.getElementById('mam-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', window.cerrarModalPostMuro);

    var overlay = document.getElementById('muro-ampliado-modal');
    if (overlay) {
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) window.cerrarModalPostMuro();
      });
    }

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        var mam = document.getElementById('muro-ampliado-modal');
        if (mam && mam.classList.contains('open') && !document.querySelector('#image-lightbox-modal.active')) {
          window.cerrarModalPostMuro();
        }
      }
    });
  }

  /* ───────────── Lector de noticias (modal) ───────────── */
  var reader, readerBody, lastFocus;

  function abrirNoticia(id, actualizarHash) {
    var n = noticias.filter(function (x) { return x.id === id; })[0];
    if (!n || !reader) return;
    lastFocus = document.activeElement;

    var cat = CATEGORIAS[n.categoria] || { nombre: n.categoria, icono: '📰', color: '#3B82F6' };

    var coverHtml = n.imagen
      ? '<div class="hn-reader-cover">' +
          '<img src="' + esc(n.imagen) + '" alt="' + esc(n.titulo) + '" loading="eager">' +
          '<div class="hn-reader-cover-scrim"></div>' +
        '</div>'
      : '';

    var chipsHtml =
      '<div class="hn-reader-chips-bar">' +
        '<span class="hn-reader-chip hn-chip-cat" style="--chip-color:' + (cat.color || '#3B82F6') + '">' +
          (cat.icono ? '<span class="hn-chip-icon">' + cat.icono + '</span> ' : '') + esc(cat.nombre) +
        '</span>' +
        '<span class="hn-reader-chip hn-chip-grade">' +
          '<i class="fas fa-graduation-cap"></i> ' + esc(nombreGrado(n.grado)) +
        '</span>' +
        '<span class="hn-reader-chip hn-chip-date">' +
          '<i class="far fa-calendar-alt"></i> ' + esc(fechaLarga(n.fecha)) +
        '</span>' +
      '</div>';

    var specsHtml = '';
    if (Array.isArray(n.datos) && n.datos.length > 0) {
      specsHtml =
        '<div class="hn-reader-specs-card">' +
          '<div class="hn-specs-title"><i class="fas fa-bolt"></i> Datos clave de la actividad</div>' +
          '<div class="hn-specs-grid">' +
            n.datos.map(function(d) {
              return '<div class="hn-spec-item">' +
                '<div class="hn-spec-icon"><i class="' + esc(d.icono || 'fas fa-info') + '"></i></div>' +
                '<div class="hn-spec-info">' +
                  '<span class="hn-spec-label">' + esc(d.etiqueta) + '</span>' +
                  '<span class="hn-spec-val">' + esc(d.valor) + '</span>' +
                '</div>' +
              '</div>';
            }).join('') +
          '</div>' +
        '</div>';
    }

    var galeria = (n.galeria || []).length
      ? '<div class="hn-reader-gallery">' + n.galeria.map(function (src) {
          return '<button type="button" class="hn-reader-thumb" data-src="' + esc(src) + '"><img src="' + esc(src) + '" alt="" loading="lazy"></button>';
        }).join('') + '</div>' : '';

    var links = (n.links || []).length
      ? '<div class="hn-reader-cta-box">' + n.links.map(function (l) {
          var ext = /^https?:/i.test(l.url || '');
          return '<a class="hn-reader-cta-btn" href="' + esc(l.url) + '"' + (ext ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' +
            '<div class="hn-reader-cta-icon"><i class="' + esc(l.icono || 'fas fa-arrow-right') + '"></i></div>' +
            '<div class="hn-reader-cta-content">' +
              '<span class="hn-reader-cta-kicker">Acceso directo</span>' +
              '<span class="hn-reader-cta-title">' + esc(l.texto) + '</span>' +
            '</div>' +
            '<i class="fas fa-chevron-right hn-reader-cta-arrow"></i>' +
          '</a>';
        }).join('') + '</div>' : '';

    // Construir páginas sin scroll para el lector micro:bit
    var readerTabs = [];
    var paras = Array.isArray(n.cuerpo) ? n.cuerpo.slice() : (n.cuerpo ? [n.cuerpo] : []);
    if (n.bajada && (!paras.length || paras[0] !== n.bajada)) {
      paras.unshift(n.bajada);
    }

    var chunk = [];
    var chunkLen = 0;
    var pageNum = 1;
    paras.forEach(function (pr) {
      var s = String(pr || '').trim();
      if (!s) return;
      if (chunk.length && chunkLen + s.length > 320) {
        readerTabs.push({
          label: '📄 Página ' + pageNum,
          html: '<div class="hn-reader-body-text">' + formatMarkdown(chunk.join('\n\n')) + '</div>'
        });
        pageNum++;
        chunk = [s];
        chunkLen = s.length;
      } else {
        chunk.push(s);
        chunkLen += s.length;
      }
    });
    if (chunk.length) {
      readerTabs.push({
        label: '📄 Página ' + pageNum,
        html: '<div class="hn-reader-body-text">' + formatMarkdown(chunk.join('\n\n')) + '</div>'
      });
    }
    if (specsHtml) {
      readerTabs.push({ label: '⚡ Datos', html: specsHtml });
    }
    if (galeria) {
      readerTabs.push({ label: '🖼️ Fotos', html: galeria });
    }
    if (links) {
      readerTabs.push({ label: '🔗 Enlaces', html: links });
    }
    if (!readerTabs.length) {
      readerTabs.push({ label: '📄 Página 1', html: '<p>Sin contenido adicional.</p>' });
    }

    var mbTabsNav = readerTabs.length > 1
      ? '<div class="mb-reader-tabs" role="tablist">' +
          readerTabs.map(function (t, ti) {
            return '<button type="button" class="mb-reader-tab-btn' + (ti === 0 ? ' active' : '') + '" data-mb-tab="' + ti + '">' + t.label + '</button>';
          }).join('') +
        '</div>'
      : '';

    var mbTabsPanes =
      '<div class="mb-reader-panes">' +
        readerTabs.map(function (t, ti) {
          return '<div class="mb-reader-pane' + (ti === 0 ? ' active' : '') + '" data-mb-pane="' + ti + '">' + t.html + '</div>';
        }).join('') +
      '</div>';

    readerBody.innerHTML =
      '<div class="mb-reader-top-header">' +
        chipsHtml +
        '<h2 id="hn-reader-title" class="hn-reader-headline">' + esc(n.titulo) + '</h2>' +
      '</div>' +
      '<div class="mb-reader-grid">' +
        '<div class="mb-reader-left">' +
          coverHtml +
        '</div>' +
        '<div class="mb-reader-right">' +
          mbTabsNav +
          mbTabsPanes +
          '<div class="hn-reader-footer-bar">' +
            '<div class="hn-reader-share-group">' +
              '<button type="button" class="hn-share-btn" id="hn-share-btn"><i class="fas fa-link"></i> Copiar enlace</button>' +
              '<a class="hn-share-btn wa" target="_blank" rel="noopener noreferrer" href="https://wa.me/?text=' +
                encodeURIComponent(n.titulo + ' — ' + location.href.split('#')[0] + '#noticia-' + n.id) + '"><i class="fab fa-whatsapp"></i> Compartir</a>' +
            '</div>' +
            '<button type="button" class="hn-reader-bottom-close-btn" id="hn-reader-bottom-close"><i class="fas fa-times"></i> Cerrar</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    readerBody.querySelectorAll('.mb-reader-tab-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = btn.getAttribute('data-mb-tab');
        readerBody.querySelectorAll('.mb-reader-tab-btn').forEach(function (b) {
          b.classList.toggle('active', b.getAttribute('data-mb-tab') === target);
        });
        readerBody.querySelectorAll('.mb-reader-pane').forEach(function (p) {
          p.classList.toggle('active', p.getAttribute('data-mb-pane') === target);
        });
      });
    });

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

    var bottomClose = document.getElementById('hn-reader-bottom-close');
    if (bottomClose) bottomClose.addEventListener('click', cerrarNoticia);

    reader.classList.add('open');
    reader.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    var scrollContainer = reader.querySelector('.mb-screen-bezel') || reader.querySelector('.hn-reader-dialog');
    if (scrollContainer) scrollContainer.scrollTop = 0;
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
  var VALID_VIEWS = ['inicio', 'noticias', 'clase', 'casa', 'herramientas', 'juegos', 'muro', 'agenda'];

  
  /* ───────────── Herramientas de los Proyectos (Pág. 08) ───────────── */
  var WORKSHOP_TOOLS = [
    {
      id: 'animated-drawings',
      name: 'Animated Drawings',
      subtitle: 'Animación de Dibujos con IA',
      category: 'animacion',
      tag: 'Meta AI · Animación 2D',
      tagColor: '#1D4ED8',
      tagBg: '#DBEAFE',
      icon: '🎨',
      faIcon: 'fas fa-child',
      author: 'Meta Fundamental AI Research Lab',
      url: 'https://sketch.metademolab.com/canvas',
      description: 'Plataforma interactiva de Inteligencia Artificial que detecta automáticamente el cuerpo y las articulaciones de los personajes dibujados por los alumnos (en papel o digital) y los transforma en animaciones 2D que caminan, bailan, saltan y se mueven en tiempo real.',
      projectUsage: 'Dar vida a personajes y robots dibujados en el aula, avatares de proyectos y creación de animaciones interactivas.',
      features: ['Detección de articulaciones', 'Animaciones de caminata y baile', 'Exportación de video o GIF'],
      badge: 'Meta AI'
    },
    {
      id: 'flow-gemini',
      name: 'Flow de Gemini',
      subtitle: 'Estudio de Cine & Video con IA',
      category: 'animacion',
      tag: 'Google AI · Video Cinemático',
      tagColor: '#6D28D9',
      tagBg: '#EDE9FE',
      icon: '🎬',
      faIcon: 'fas fa-film',
      author: 'Google AI & Estudio Escolar CPF',
      url: 'https://roboticapaulofreire-uy.github.io/Luces-Camara-IA/',
      secondaryUrl: 'https://gemini.google.com',
      secondaryText: 'Abrir Gemini',
      description: 'Motor de generación y animación audiovisual con Inteligencia Artificial. Los estudiantes definen planos cinemáticos, movimientos de cámara profesionales (dolly, paneo, órbita 360°, dron cenital) e iluminación para transformar imágenes fijas en cortometrajes animados.',
      projectUsage: 'Proyecto «Luces, Cámara, IA (Estudio de Cine)» y «Especial Halloween»: animación de criaturas fantásticas con prompts de cámara.',
      features: ['Movimientos de cámara cinemáticos', 'Animación generativa de imágenes', 'Guardado en Google Drive'],
      badge: 'Video & Cine'
    },
    {
      id: 'gemini',
      name: 'Google Gemini',
      subtitle: 'Inteligencia Artificial Multimodal & Lógica',
      category: 'ia',
      tag: 'Google DeepMind · IA Multimodal',
      tagColor: '#047857',
      tagBg: '#D1FAE5',
      icon: '🧠',
      faIcon: 'fas fa-brain',
      author: 'Google DeepMind',
      url: 'https://gemini.google.com',
      description: 'Modelo avanzado de Inteligencia Artificial para razonamiento, redacción de prompts estructurados, análisis de imágenes y resolución de problemas. Los alumnos aprenden la técnica de las 5 Capas para guiar a la IA con precisión pedagógica y ética.',
      projectUsage: 'Elaboración de hechizos en «El Libro de los Hechizos de IA», asistencia en lógica de código, diseño conceptual y narrativa de proyectos.',
      features: ['Técnica de prompts de 5 Capas', 'Comprensión multimodal de fotos y bocetos', 'Generación de ideas y lógica'],
      badge: 'IA Generativa'
    },
    {
      id: 'notebooklm',
      name: 'NotebookLM (Notebook de Gemini)',
      subtitle: 'Cuaderno Inteligente de Estudio & Podcast con IA',
      category: 'ia',
      tag: 'Google Labs · Cuaderno de Estudio',
      tagColor: '#B45309',
      tagBg: '#FEF3C7',
      icon: '📓',
      faIcon: 'fas fa-book-reader',
      author: 'Google Labs & Gemini 1.5 Pro',
      url: 'https://notebooklm.google.com',
      description: 'Cuaderno interactivo de notas y estudio impulsado por Gemini 1.5 Pro. Los estudiantes suben sus apuntes, textos escolares o manuales de robótica, y la IA crea resúmenes exactos, guías de estudio, preguntas de repaso y resúmenes de audio en formato podcast con dos presentadores que debaten el tema.',
      projectUsage: 'Proyecto cumbre de 6° Grado «Creación de Materiales de Estudio con IA» y repaso colaborativo de conceptos científicos sin alucinaciones.',
      features: ['Resumen en audio tipo programa de radio', 'Guías de estudio y cuestionarios interactivos', 'Respuestas 100% basadas en fuentes propias'],
      badge: 'Cuaderno con IA'
    },
    {
      id: 'paperme',
      name: 'PaperMe',
      subtitle: 'Generador de Personajes & Robots en Papercraft 3D',
      category: 'diseno',
      tag: 'Papercraft 3D · Modelado & Plegado',
      tagColor: '#C2410C',
      tagBg: '#FFEDD5',
      icon: '✂️',
      faIcon: 'fas fa-cube',
      author: 'PaperMe Online (paperme.de)',
      url: 'https://www.paperme.de/paperme/default/',
      description: 'Herramienta interactiva para diseñar personajes tridimensionales y robots en papel (Papercraft). Permite personalizar caras, expresiones, vestimenta, colores y texturas sobre un modelo 3D en tiempo real, generando automáticamente la plantilla desplegada con solapas lista para imprimir, recortar, doblar y pegar.',
      projectUsage: 'Construcción física de robots de papel, maquetas de cartón, personajes articulados y prototipado táctil en el taller de robótica y bricolaje escolar.',
      features: ['Editor 3D interactivo en navegador', 'Generación instantánea de plantilla desplegada con solapas', 'Plantilla descargable lista para imprimir y recortar'],
      badge: 'Papercraft 3D'
    },
    {
      id: 'canva',
      name: 'Canva',
      subtitle: 'Diseño Gráfico, Láminas & Composición Visual',
      category: 'diseno',
      tag: 'Canva Suite · Diseño Gráfico',
      tagColor: '#0369A1',
      tagBg: '#E0F2FE',
      icon: '✨',
      faIcon: 'fas fa-palette',
      author: 'Canva Visual Suite',
      url: 'https://www.canva.com',
      description: 'Suite de diseño gráfico y composición visual donde los alumnos arman láminas técnicas, esquemas de montaje, portadas de expedientes, marcos instantáneos para fotos Polaroid y piezas visuales listas para imprimir físicamente o compartir.',
      projectUsage: 'Diseño de la Postal Polaroid física impresa en papel fotográfico para llevar a casa (Halloween), esquemas de circuitos y portadas de proyectos.',
      features: ['Plantillas y marcos oficiales del taller', 'Composición visual y tipografía', 'Exportación lista para impresión'],
      badge: 'Diseño Gráfico'
    }
  ];

  window.BASE_WORKSHOP_TOOLS = WORKSHOP_TOOLS.slice();
  var _remoteToolsMap = {};

  function getActiveWorkshopTools() {
    var map = {};
    WORKSHOP_TOOLS.forEach(function (t) { map[t.id] = Object.assign({}, t); });
    Object.keys(_remoteToolsMap).forEach(function (id) {
      var rt = _remoteToolsMap[id];
      if (!rt) return;
      if (rt.deleted) delete map[id];
      else map[id] = Object.assign(map[id] || {}, rt);
    });
    try {
      var rawOv = localStorage.getItem('pf_admin_tools_overrides');
      if (rawOv) {
        var ov = JSON.parse(rawOv);
        Object.keys(ov).forEach(function (id) {
          var item = ov[id];
          if (!item) return;
          if (item.deleted) delete map[id];
          else map[id] = Object.assign(map[id] || {}, item, { id: id });
        });
      }
    } catch (e) {}
    return Object.keys(map).map(function (k) { return map[k]; });
  }

  function syncRemoteTools() {
    try {
      if (typeof window.db !== 'undefined' && window.db && typeof window.db.collection === 'function') {
        window.db.collection('workshop_tools').onSnapshot(function (snapshot) {
          if (!snapshot) return;
          _remoteToolsMap = {};
          snapshot.forEach(function (doc) {
            var d = doc.data();
            d.id = doc.id;
            _remoteToolsMap[doc.id] = d;
          });
          if (document.getElementById('hn-tools-grid')) {
            renderHerramientas();
          }
        }, function (err) {
          console.warn('Sync tools notice:', err);
        });
      } else {
        setTimeout(syncRemoteTools, 800);
      }
    } catch (e) {}
  }

  var filtroCategoriaHerramientas = 'todas';

  function renderHerramientas(filtro) {
    if (filtro) filtroCategoriaHerramientas = filtro;
    var grid = document.getElementById('hn-tools-grid');
    if (!grid) return;

    var activeTools = getActiveWorkshopTools();
    var filtered = activeTools.filter(function (t) {
      if (filtroCategoriaHerramientas === 'todas') return true;
      return t.category === filtroCategoriaHerramientas;
    });

    // Actualizar botones de tabs
    var filterBtns = document.querySelectorAll('#hn-tools-filters [data-tool-category]');
    filterBtns.forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-tool-category') === filtroCategoriaHerramientas);
    });

    if (!filtered.length) {
      grid.classList.add('is-arcade-wheel');
      grid.innerHTML = '<div style="text-align:center;padding:40px 20px;color:#64748B;">No hay herramientas en esta categoría.</div>';
      return;
    }

    grid.classList.add('is-arcade-wheel');

    var activeToolIdx = 0;

    grid.innerHTML =
      '<div class="arcade-cabinet arcade-tools-cabinet" tabindex="0" aria-label="Ruleta de Herramientas del Taller">' +
        '<div class="arcade-stage">' +
          '<div class="arcade-monitor-col">' +
            '<div class="arcade-monitor-bezel">' +
              '<div class="arcade-monitor-topbar">' +
                '<span class="arcade-marquee"><i class="fas fa-toolbox"></i> HERRAMIENTAS DEL TALLER</span>' +
                '<div class="arcade-topbar-btns">' +
                  '<button type="button" id="arcade-tool-btn-info" class="arcade-btn-game-info" title="Ver cómo la usamos en el taller y sus funciones">' +
                    '<i class="fas fa-info-circle"></i> <span>Ver Info</span>' +
                  '</button>' +
                '</div>' +
                '<span class="arcade-counter" id="arcade-tool-counter">1 / ' + filtered.length + '</span>' +
              '</div>' +
              '<div class="arcade-tool-stage" id="arcade-tool-stage">' +
                '<div class="arcade-tool-orb" id="arcade-tool-orb">🧰</div>' +
                '<span class="arcade-tool-tag" id="arcade-tool-tag"></span>' +
                '<span class="arcade-tool-author" id="arcade-tool-author"></span>' +
              '</div>' +
              '<div class="arcade-screen-info">' +
                '<h3 class="arcade-screen-title" id="arcade-tool-title"></h3>' +
                '<p class="arcade-screen-desc" id="arcade-tool-desc"></p>' +
              '</div>' +
              '<div class="arcade-screen-actions">' +
                '<a id="arcade-tool-btn-open" href="#" target="_blank" rel="noopener noreferrer" class="arcade-btn-play">' +
                  '<i class="fas fa-external-link-alt"></i> <span>¡ABRIR HERRAMIENTA!</span>' +
                '</a>' +
                '<a id="arcade-tool-btn-sec" href="#" target="_blank" rel="noopener noreferrer" class="arcade-btn-tool-sec" style="display:none;"></a>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="arcade-wheel-col">' +
            '<div class="arcade-wheel-controls">' +
              '<button type="button" class="arcade-nav-btn" id="arcade-tool-prev" aria-label="Herramienta anterior"><i class="fas fa-chevron-up"></i> Subir</button>' +
              '<span class="arcade-wheel-hint">🎡 Girá la ruleta o usá ↑ ↓</span>' +
              '<button type="button" class="arcade-nav-btn" id="arcade-tool-next" aria-label="Siguiente herramienta">Bajar <i class="fas fa-chevron-down"></i></button>' +
            '</div>' +
            '<div class="arcade-wheel-viewport" id="arcade-tool-viewport">' +
              '<div class="arcade-wheel-disc"></div>' +
              '<div class="arcade-wheel-pointer">◀</div>' +
              '<div class="arcade-wheel-slots" id="arcade-tool-slots"></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    var elOrb = document.getElementById('arcade-tool-orb');
    var elTag = document.getElementById('arcade-tool-tag');
    var elAuthor = document.getElementById('arcade-tool-author');
    var elTitle = document.getElementById('arcade-tool-title');
    var elDesc = document.getElementById('arcade-tool-desc');
    var elOpen = document.getElementById('arcade-tool-btn-open');
    var elSec = document.getElementById('arcade-tool-btn-sec');
    var elCounter = document.getElementById('arcade-tool-counter');
    var elSlots = document.getElementById('arcade-tool-slots');
    var elViewport = document.getElementById('arcade-tool-viewport');
    var elPrev = document.getElementById('arcade-tool-prev');
    var elNext = document.getElementById('arcade-tool-next');
    var elInfoBtn = document.getElementById('arcade-tool-btn-info');

    function openToolInfoModal(t) {
      if (!t) return;
      var modal = document.getElementById('arcade-parent-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'arcade-parent-modal';
        modal.className = 'arcade-parent-modal-backdrop';
        document.body.appendChild(modal);
      }
      var featHtml = (t.features && t.features.length)
        ? '<div class="apm-info-tags">' + t.features.map(function (f) {
            return '<span class="post-tag"><i class="fas fa-check" style="color:#10B981;"></i> ' + esc(f) + '</span>';
          }).join('') + '</div>'
        : '';

      modal.innerHTML =
        '<div class="arcade-parent-modal-card" role="dialog" aria-modal="true">' +
          '<div class="apm-modal-head">' +
            '<div class="apm-modal-head-left">' +
              '<span class="apm-modal-badge">' + esc(t.icon + ' ' + t.tag) + ' · ' + esc(t.author) + '</span>' +
              '<h3>' + esc(t.name) + '</h3>' +
            '</div>' +
            '<button type="button" class="apm-modal-close" aria-label="Cerrar">&times;</button>' +
          '</div>' +
          '<div class="apm-modal-body">' +
            '<div class="apm-info-box"><h4><i class="fas fa-toolbox"></i> ¿Para qué sirve?</h4><p>' + esc(t.description) + '</p></div>' +
            '<div class="apm-info-box is-benefits"><h4><i class="fas fa-project-diagram"></i> ¿Cómo la usamos en el taller?</h4><p>' + esc(t.projectUsage) + '</p></div>' +
            featHtml +
          '</div>' +
          '<div class="apm-modal-foot">' +
            '<button type="button" class="apm-modal-btn-sec">Cerrar</button>' +
            '<a href="' + esc(t.url) + '" target="_blank" rel="noopener noreferrer" class="apm-modal-btn-play"><i class="fas fa-external-link-alt"></i> Abrir Herramienta</a>' +
          '</div>' +
        '</div>';
      modal.style.display = 'flex';
      var closeFn = function () { modal.style.display = 'none'; };
      modal.querySelector('.apm-modal-close').onclick = closeFn;
      modal.querySelector('.apm-modal-btn-sec').onclick = closeFn;
      modal.onclick = function (e) { if (e.target === modal) closeFn(); };
    }

    function updateToolWheel(playSound) {
      var total = filtered.length;
      if (!total) return;
      activeToolIdx = ((activeToolIdx % total) + total) % total;
      var t = filtered[activeToolIdx];

      if (playSound && window.sounds && window.sounds.playClick) {
        window.sounds.playClick();
      }

      elCounter.textContent = (activeToolIdx + 1) + ' / ' + total;
      elOrb.textContent = t.icon || '🧰';
      elOrb.style.background = t.tagBg || '#1E293B';
      elOrb.style.color = t.tagColor || '#FFFFFF';
      elTag.textContent = t.tag || t.badge || 'Herramienta';
      elTag.style.background = t.tagBg || '#E0E7FF';
      elTag.style.color = t.tagColor || '#1E293B';
      elAuthor.textContent = t.author || 'Taller Maker';
      elTitle.textContent = t.name || 'Herramienta';
      elTitle.title = t.name || 'Herramienta';
      elDesc.textContent = t.description || '';
      elOpen.href = t.url || '#';

      if (t.secondaryUrl) {
        elSec.style.display = 'inline-flex';
        elSec.href = t.secondaryUrl;
        elSec.innerHTML = '<span>' + esc(t.secondaryText || 'Explorar') + '</span> <i class="fas fa-arrow-right"></i>';
      } else {
        elSec.style.display = 'none';
      }

      var maxOffset = Math.min(4, Math.floor((total - 1) / 2));
      var slotsHtml = '';
      for (var d = -maxOffset; d <= maxOffset; d++) {
        var idx = ((activeToolIdx + d) % total + total) % total;
        var item = filtered[idx];
        var absD = Math.abs(d);
        var xShift = absD * absD * 14 + absD * 12;
        var yShift = d * 64;
        var scale = d === 0 ? 1.06 : Math.max(0.64, 1 - absD * 0.1);
        var opacity = d === 0 ? 1 : Math.max(0.24, 1 - absD * 0.2);
        var rot = d * 4.5;
        var z = 20 - absD;

        slotsHtml +=
          '<button type="button" class="arcade-wheel-item' + (d === 0 ? ' is-center' : '') + '" ' +
            'data-idx="' + idx + '" ' +
            'style="transform:translate3d(' + xShift + 'px, ' + yShift + 'px, 0) scale(' + scale + ') rotate(' + rot + 'deg);opacity:' + opacity + ';z-index:' + z + ';" ' +
            'title="' + esc(item.name) + '">' +
            '<span class="awi-emoji-box" style="background:' + esc(item.tagBg || '#334155') + ';color:' + esc(item.tagColor || '#FFF') + ';">' + esc(item.icon || '🧰') + '</span>' +
            '<div class="awi-text">' +
              '<span class="awi-title">' + esc(item.name) + '</span>' +
              '<span class="awi-sub">' + esc(item.tag || item.author) + '</span>' +
            '</div>' +
          '</button>';
      }
      elSlots.innerHTML = slotsHtml;

      elSlots.querySelectorAll('.arcade-wheel-item').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var clickedIdx = parseInt(btn.dataset.idx, 10);
          if (isNaN(clickedIdx)) return;
          if (clickedIdx === activeToolIdx) {
            elOpen.click();
          } else {
            activeToolIdx = clickedIdx;
            updateToolWheel(true);
          }
        });
      });
    }

    if (elInfoBtn) {
      elInfoBtn.addEventListener('click', function () {
        if (window.sounds && window.sounds.playClick) window.sounds.playClick();
        openToolInfoModal(filtered[activeToolIdx]);
      });
    }
    elPrev.addEventListener('click', function () { activeToolIdx--; updateToolWheel(true); });
    elNext.addEventListener('click', function () { activeToolIdx++; updateToolWheel(true); });

    var wheelLock = false;
    elViewport.addEventListener('wheel', function (e) {
      e.preventDefault();
      if (wheelLock) return;
      wheelLock = true;
      if (e.deltaY > 0) activeToolIdx++;
      else activeToolIdx--;
      updateToolWheel(true);
      setTimeout(function () { wheelLock = false; }, 85);
    }, { passive: false });

    var touchStartY = null;
    elViewport.addEventListener('touchstart', function (e) {
      if (e.touches && e.touches[0]) touchStartY = e.touches[0].clientY;
    }, { passive: true });
    elViewport.addEventListener('touchend', function (e) {
      if (touchStartY === null || !e.changedTouches || !e.changedTouches[0]) return;
      var dy = e.changedTouches[0].clientY - touchStartY;
      touchStartY = null;
      if (Math.abs(dy) > 24) {
        if (dy < 0) activeToolIdx++;
        else activeToolIdx--;
        updateToolWheel(true);
      }
    }, { passive: true });

    var cabinet = grid.querySelector('.arcade-cabinet');
    if (cabinet) {
      cabinet.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          e.preventDefault();
          activeToolIdx++;
          updateToolWheel(true);
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          e.preventDefault();
          activeToolIdx--;
          updateToolWheel(true);
        } else if (e.key === 'Enter') {
          elOpen.click();
        }
      });
    }

    updateToolWheel(false);
  }
  window.renderHerramientas = renderHerramientas;

  function switchView(viewName, updateHash) {
    // Si el alumno está logueado, permitir ingresar a la sección de clase/video
    if (document.body.classList.contains('student-logged-in')) {
      if (viewName === 'clase') {
        document.body.classList.add('in-class-video');
      } else {
        document.body.classList.remove('in-class-video');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    } else {
      document.body.classList.remove('in-class-video');
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

    // Renderizar herramientas si corresponde
    if (viewName === 'herramientas') {
      renderHerramientas();
    }

    // Si la vista seleccionada es Muro o Juegos, recalcular colapsables ahora que son visibles
    if (viewName === 'muro') {
      setTimeout(function () {
        checkCollapsiblePosts(document.getElementById('hn-muro-feed'));
      }, 50);
      setTimeout(function () {
        checkCollapsiblePosts(document.getElementById('hn-muro-feed'));
      }, 250);
    } else if (viewName === 'juegos') {
      setTimeout(function () {
        checkCollapsibleGameDescs(document.getElementById('hn-juegos-grid'));
      }, 50);
      setTimeout(function () {
        checkCollapsibleGameDescs(document.getElementById('hn-juegos-grid'));
      }, 250);
    }

    // Notificar al cartel flotante de EN VIVO
    if (typeof window.updateGlobalLiveBadge === 'function') {
      window.updateGlobalLiveBadge();
    }
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
    } else if (raw === 'clase-video' || raw === 'cine' || raw === 'video-clase') {
      switchView('clase', false);
      if (window.switchClaseSubTab) window.switchClaseSubTab('video');
    } else if (raw === 'herramientas' || raw === 'tools') {
      switchView('clase', false);
      if (window.switchClaseSubTab) window.switchClaseSubTab('herramientas');
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

    function initHerramientas() {
    var toolFiltersWrap = document.getElementById('hn-tools-filters');
    if (toolFiltersWrap) {
      toolFiltersWrap.querySelectorAll('[data-tool-category]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var cat = btn.getAttribute('data-tool-category');
          renderHerramientas(cat);
        });
      });
    }
    renderHerramientas();
  }

  
  /* ───────────── La Valija Maker (Materiales para la Próxima Clase) ───────────── */
  var filtroGradoValija = 'todos';

  function initValijaGradeSelect() {
    var st = alumno();
    var sel = document.getElementById('valija-grade-filter');
    if (sel && !sel.dataset.initialized) {
      var html = '<option value="todos">★ Todos los grupos (Vista General)</option>';
      GRADOS.forEach(function (g) {
        html += '<option value="' + esc(g.id) + '">' + esc(g.name) + '</option>';
      });
      sel.innerHTML = html;
      if (st && st.gradeId) {
        filtroGradoValija = st.gradeId;
      }
      sel.value = filtroGradoValija;
      sel.onchange = function () {
        filtroGradoValija = sel.value;
        renderValijaMaker(filtroGradoValija);
      };
      sel.dataset.initialized = 'true';
    }

    var tabsEl = document.getElementById('hn-valija-grade-tabs');
    if (tabsEl && !tabsEl.dataset.initialized) {
      if (st && st.gradeId) {
        filtroGradoValija = st.gradeId;
      }
      var tabsList = [
        { id: 'todos', label: '🌟 Todos' },
        { id: 'sala5', label: '🎨 Sala 5' },
        { id: 'grado1', label: '1.°' },
        { id: 'grado2', label: '2.°' },
        { id: 'grado3', label: '3.°' },
        { id: 'grado4', label: '4.°' },
        { id: 'grado5', label: '5.°' },
        { id: 'grado6', label: '6.°' }
      ];
      var curNorm = normalizarGrado(filtroGradoValija);
      tabsEl.innerHTML = tabsList.map(function (t) {
        var act = (curNorm === t.id);
        return '<button type="button" class="fb-mochila-tab' + (act ? ' active' : '') + '" role="tab" data-valija-grade="' + esc(t.id) + '" aria-selected="' + (act ? 'true' : 'false') + '">' + esc(t.label) + '</button>';
      }).join('');
      tabsEl.querySelectorAll('.fb-mochila-tab').forEach(function (btn) {
        btn.addEventListener('click', function () {
          filtroGradoValija = btn.getAttribute('data-valija-grade') || 'todos';
          renderValijaMaker(filtroGradoValija);
        });
      });
      tabsEl.dataset.initialized = 'true';
    }
  }

  function renderValijaMaker(gradoFiltro) {
    var grid = document.getElementById('hn-valija-grid');
    if (!grid) return;
    initValijaGradeSelect();

    if (gradoFiltro) {
      filtroGradoValija = gradoFiltro;
      var sel = document.getElementById('valija-grade-filter');
      if (sel) sel.value = gradoFiltro;
    }

    var normTab = normalizarGrado(filtroGradoValija);
    document.querySelectorAll('#hn-valija-grade-tabs .fb-mochila-tab').forEach(function (btn) {
      var act = btn.getAttribute('data-valija-grade') === normTab;
      btn.classList.toggle('active', act);
      btn.setAttribute('aria-selected', act ? 'true' : 'false');
    });

    var fillEl = document.getElementById('hn-valija-meter-fill');

    var items = (C.valijaMaker || (window.HOME_CONTENT && window.HOME_CONTENT.valijaMaker) || []);
    if (!items.length) {
      grid.innerHTML = '<p style="color:#475569;font-size:0.95rem;grid-column:1/-1;font-weight:600;">🎒 No hay materiales programados para esta semana.</p>';
      if (fillEl) { fillEl.style.width = '0%'; fillEl.classList.remove('is-complete'); }
      return;
    }

    var normFiltro = normalizarGrado(filtroGradoValija);
    var filtrados = items.filter(function (it) {
      if (filtroGradoValija === 'todos') return true;
      var grs = (it.grados || ['todos']).map(normalizarGrado);
      return grs.indexOf('todos') !== -1 || grs.indexOf(normFiltro) !== -1;
    });

    if (!filtrados.length) {
      grid.innerHTML = '<div style="grid-column:1/-1;padding:18px;text-align:center;color:#15803D;background:#F0FDF4;border-radius:18px;border:2px dashed #86EFAC;">' +
        '<span style="font-size:1.6rem;display:block;margin-bottom:6px;">🎉</span>' +
        '<strong>¡Todo listo para este grupo!</strong> No necesitás traer materiales extra de casa para la próxima clase.' +
      '</div>';
      var elProg0 = document.getElementById('hn-valija-progress-info');
      if (elProg0) elProg0.innerHTML = '<span>✅ ¡Sin pedidos para este grado! ⭐</span>';
      if (fillEl) { fillEl.style.width = '100%'; fillEl.classList.add('is-complete'); }
      return;
    }

    var total = filtrados.length;
    var listos = 0;

    var html = filtrados.map(function (m) {
      var isChecked = localStorage.getItem('pf_valija_chk_' + m.id) === '1';
      if (isChecked) listos++;

      var catClass = m.categoria === 'cartuchera' ? 'cat-cartuchera' : 'cat-reciclable';
      var badgeTxt = isChecked ? '✅ ¡EN LA MOCHILA!' : (m.categoria === 'cartuchera' ? '🎒 CARTUCHERA' : '♻️ RECICLABLE');
      var descTxt = (m.detalle || '') + (m.uso ? ' · 🛠️ ' + m.uso : '');

      return '<div class="fb-mochila-card ' + catClass + (isChecked ? ' is-checked' : '') + '" data-valija-id="' + esc(m.id) + '" onclick="window.toggleValijaItem(\'' + esc(m.id) + '\')" role="button" tabindex="0" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();window.toggleValijaItem(\'' + esc(m.id) + '\');}" title="Tocar para marcar o desmarcar">' +
        '<span class="fb-portal-badge">' + badgeTxt + '</span>' +
        '<div class="fb-portal-icon">' + esc(m.icono || '📦') + '</div>' +
        '<div class="fb-portal-text">' +
          '<span class="fb-portal-title">' + esc(m.nombre) + '</span>' +
          '<span class="fb-portal-desc">' + esc(descTxt) + '</span>' +
        '</div>' +
        '<span class="fb-mochila-check" aria-hidden="true"><i class="fas fa-check"></i></span>' +
      '</div>';
    }).join('');

    grid.innerHTML = html;

    var pct = total > 0 ? Math.round((listos / total) * 100) : 0;
    var completa = total > 0 && listos === total;
    if (fillEl) {
      fillEl.style.width = pct + '%';
      if (completa) {
        fillEl.classList.add('is-complete');
      } else {
        fillEl.classList.remove('is-complete');
      }
    }

    var elProgress = document.getElementById('hn-valija-progress-info');
    if (elProgress) {
      if (completa) {
        elProgress.innerHTML = '<strong style="color:#15803D;">🎉 ¡Mochila completa! (' + pct + '%) ⭐</strong>';
      } else {
        elProgress.innerHTML = '<span>🎒 ' + listos + ' de ' + total + ' listos (' + pct + '%)</span>';
      }
    }
  }
  window.renderValijaMaker = renderValijaMaker;

  window.toggleValijaItem = function (id) {
    if (!id) return;
    var key = 'pf_valija_chk_' + id;
    if (localStorage.getItem(key) === '1') {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, '1');
    }
    renderValijaMaker(filtroGradoValija);
  };

  window.imprimirValijaMaker = function () {
    var items = (C.valijaMaker || (window.HOME_CONTENT && window.HOME_CONTENT.valijaMaker) || []);
    var normFiltro = normalizarGrado(filtroGradoValija);
    var filtrados = items.filter(function (it) {
      if (filtroGradoValija === 'todos') return true;
      var grs = (it.grados || ['todos']).map(normalizarGrado);
      return grs.indexOf('todos') !== -1 || grs.indexOf(normFiltro) !== -1;
    });

    var grLabel = filtroGradoValija === 'todos' ? 'Todos los grupos del Taller' : nombreGrado(filtroGradoValija);
    var fechaHoy = new Date().toLocaleDateString('es-UY', { day: '2-digit', month: 'long', year: 'numeric' });

    var itemsRows = filtrados.map(function (m) {
      var isChecked = localStorage.getItem('pf_valija_chk_' + m.id) === '1';
      var cat = m.categoria === 'cartuchera' ? 'De la cartuchera' : 'Reciclable de casa';
      return '<div style="display:flex;align-items:flex-start;gap:14px;padding:12px 0;border-bottom:1px solid #DDD;">' +
        '<div style="width:22px;height:22px;border:2px solid #2B2520;border-radius:4px;flex-shrink:0;margin-top:2px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:14px;">' + (isChecked ? '✓' : '') + '</div>' +
        '<div style="flex-grow:1;">' +
          '<div style="font-size:15px;font-weight:bold;color:#1A1612;">' + (m.icono || '📦') + ' ' + m.nombre + ' <span style="font-size:12px;font-weight:normal;color:#666;">(' + cat + ')</span></div>' +
          '<div style="font-size:13px;color:#444;margin-top:2px;">' + m.detalle + '</div>' +
          (m.uso ? '<div style="font-size:12px;color:#786C5E;margin-top:2px;font-style:italic;">Proyecto: ' + m.uso + '</div>' : '') +
        '</div>' +
      '</div>';
    }).join('');

    var printHtml = '<!DOCTYPE html>' +
'<html lang="es">' +
'<head>' +
'  <meta charset="utf-8">' +
'  <title>La Valija Maker - Lista para la Heladera</title>' +
'  <style>' +
'    @page { margin: 15mm; size: auto; }' +
'    body { font-family: \'Segoe UI\', Arial, sans-serif; margin: 20px; color: #1A1612; }' +
'    .header { text-align: center; border-bottom: 2.5px solid #2B2520; padding-bottom: 12px; margin-bottom: 16px; }' +
'    .header h1 { margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 0.05em; }' +
'    .header h2 { margin: 4px 0 0; font-size: 15px; font-weight: normal; color: #5A4E44; }' +
'    .meta { display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; margin-bottom: 14px; border-bottom: 1px dashed #888; padding-bottom: 8px; }' +
'    .notice { margin-top: 20px; padding: 10px 14px; background: #F0F7FF; border: 1px solid #BFDBFE; border-left: 4px solid #2563EB; font-size: 12px; color: #1E3A8A; line-height: 1.4; }' +
'    .tip { margin-top: 10px; font-size: 11px; color: #555; font-style: italic; text-align: center; }' +
'    .footer { margin-top: 24px; text-align: center; font-size: 11px; color: #777; border-top: 1px solid #EEE; padding-top: 10px; }' +
'  </style>' +
'</head>' +
'<body>' +
'  <div class="header">' +
'    <h1>Colegio Paulo Freire · Taller de Robótica</h1>' +
'    <h2>🧰 La Valija Maker — Materiales para la Próxima Clase</h2>' +
'  </div>' +
'  <div class="meta">' +
'    <span>GRUPO: ' + grLabel + '</span>' +
'    <span>FECHA: ' + fechaHoy + '</span>' +
'  </div>' +
'  <div>' + itemsRows + '</div>' +
'  <div class="notice">' +
'    <strong>Recordatorio a las familias:</strong> Los componentes electrónicos (motores, LEDs, micro:bit, pilas y sensores) son provistos 100% por el taller escolar.' +
'  </div>' +
'  <div class="tip">' +
'    💡 Consejo: Pegar esta lista con un imán en la heladera para ir guardando los materiales durante la semana.' +
'  </div>' +
'  <div class="footer">' +
'    Colegio Paulo Freire · Laboratorio Maker y Robótica Educativa' +
'  </div>' +
'  <script>' +
'    window.onload = function() { setTimeout(function() { window.print(); }, 250); };' +
'  </script>' +
'</body>' +
'</html>';

    var w = window.open('', '_blank', 'width=750,height=850');
    if (w) {
      w.document.open();
      w.document.write(printHtml);
      w.document.close();
    } else {
      window.print();
    }
  };

  function syncRemoteValijaMaker() {
    try {
      if (typeof window.db !== 'undefined' && window.db && typeof window.db.collection === 'function') {
        window.db.collection('valija_materials').onSnapshot(function (snapshot) {
          if (!snapshot || snapshot.empty) return;
          var remote = [];
          snapshot.forEach(function (doc) {
            var d = doc.data();
            if (d.deleted) return;
            remote.push(Object.assign({ id: doc.id }, d));
          });
          if (remote.length > 0) {
            C.valijaMaker = remote;
            renderValijaMaker(filtroGradoValija);
          }
        }, function (err) {
          console.warn('Sync valija notice:', err);
        });
      }
    } catch (e) {
      console.warn('Error en syncRemoteValijaMaker:', e);
    }
  }

  /* ───────────── Vitrina Visual Superior (4 Tarjetas con Foto) ───────────── */
  var vitrinaClaseItem = null;
  var vitrinaCasaItem = null;

  function renderVitrinaTop() {
    var grid = document.getElementById('hn-vitrina-grid');
    if (!grid) return;

    function formatGrados(item) {
      if (!item) return 'Todo el colegio';
      if (item.grados && item.grados.length && item.grados.indexOf('todos') === -1) {
        return item.grados.map(nombreGrado).join(' · ');
      }
      if (item.grado && item.grado !== 'todos') {
        return nombreGrado(item.grado);
      }
      return 'Todos los grados';
    }

    var cardsHtml = [];

    // 1. Última Noticia (Destacada o más reciente)
    var notDest = noticias.filter(function (n) { return n.destacada; })[0] || noticias[0];
    if (notDest) {
      cardsHtml.push(
        '<article class="fb-vitrina-card vitrina-news" data-noticia="' + esc(notDest.id) + '" tabindex="0" role="button" aria-label="Leer noticia: ' + esc(notDest.titulo) + '">' +
          '<div class="fb-vitrina-media">' +
            '<img src="' + esc(notDest.imagen || 'img/bienvenida_taller.jpg') + '" alt="' + esc(notDest.titulo) + '" loading="eager" onerror="this.src=\'img/bienvenida_taller.jpg\'">' +
            '<span class="fb-vitrina-badge">📰 ¡NOTICIA!</span>' +
          '</div>' +
          '<div class="fb-vitrina-body">' +
            '<span class="fb-vitrina-grade">🎓 ' + esc(nombreGrado(notDest.grado)) + '</span>' +
            '<h3 class="fb-vitrina-card-title">' + esc(notDest.titulo) + '</h3>' +
            '<span class="fb-vitrina-cta">🤖 ¡Leer en micro:bit!</span>' +
          '</div>' +
        '</article>'
      );
    }

    // 2. Proyecto actual en Clase
    var claseLista = (window._ULTIMA_LISTA_CLASE && window._ULTIMA_LISTA_CLASE.length)
      ? window._ULTIMA_LISTA_CLASE.map(function (it) { return it.a; })
      : (C.actividades || []).filter(function (a) { return seccionDe(a) === 'clase'; }).sort(function (x, y) {
          return obtenerFechaActividad(y) - obtenerFechaActividad(x);
        });
    vitrinaClaseItem = claseLista[0] || null;
    if (vitrinaClaseItem) {
      cardsHtml.push(
        '<article class="fb-vitrina-card vitrina-clase" onclick="window.openVitrinaClase()" tabindex="0" role="button" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();window.openVitrinaClase();}" aria-label="Ver proyecto en clase: ' + esc(vitrinaClaseItem.titulo) + '">' +
          '<div class="fb-vitrina-media">' +
            '<img src="' + esc(vitrinaClaseItem.imagen || 'img/proyectos/halloween_ia_cover.jpg') + '" alt="' + esc(vitrinaClaseItem.titulo) + '" loading="eager" onerror="this.src=\'img/bienvenida_taller.jpg\'">' +
            '<span class="fb-vitrina-badge">🔬 ¡EN CLASE!</span>' +
          '</div>' +
          '<div class="fb-vitrina-body">' +
            '<span class="fb-vitrina-grade">🎓 ' + esc(formatGrados(vitrinaClaseItem)) + '</span>' +
            '<h3 class="fb-vitrina-card-title">' + esc(vitrinaClaseItem.titulo) + '</h3>' +
            '<span class="fb-vitrina-cta">⚡ ¡Ver Proyecto!</span>' +
          '</div>' +
        '</article>'
      );
    }

    // 3. Misión Estrella en Casa
    var casaOrden = (C.actividades || []).filter(function (a) { return seccionDe(a) === 'casa'; }).sort(function (x, y) {
      return obtenerFechaActividad(y) - obtenerFechaActividad(x);
    });
    vitrinaCasaItem = casaOrden.filter(function (a) { return !!a.destacada; })[0] || casaOrden[0] || null;
    if (vitrinaCasaItem) {
      cardsHtml.push(
        '<article class="fb-vitrina-card vitrina-casa" onclick="window.openVitrinaCasa()" tabindex="0" role="button" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();window.openVitrinaCasa();}" aria-label="Abrir misión en casa: ' + esc(vitrinaCasaItem.titulo) + '">' +
          '<div class="fb-vitrina-media">' +
            '<img src="' + esc(vitrinaCasaItem.imagen || 'img/bienvenida_taller.jpg') + '" alt="' + esc(vitrinaCasaItem.titulo) + '" loading="eager" onerror="this.src=\'img/bienvenida_taller.jpg\'">' +
            '<span class="fb-vitrina-badge">🏠 ¡EN CASA!</span>' +
          '</div>' +
          '<div class="fb-vitrina-body">' +
            '<span class="fb-vitrina-grade">🎓 ' + esc(formatGrados(vitrinaCasaItem)) + '</span>' +
            '<h3 class="fb-vitrina-card-title">' + esc(vitrinaCasaItem.titulo) + '</h3>' +
            '<span class="fb-vitrina-cta">🌟 ¡Abrir Misión!</span>' +
          '</div>' +
        '</article>'
      );
    }

    // 4. Último Video de El Muro (o publicación más reciente)
    var muroOrden = (C.muro || []).slice().sort(function (a, b) {
      var ta = a._time || (parseFecha(a.fecha) ? parseFecha(a.fecha).getTime() : 0);
      var tb = b._time || (parseFecha(b.fecha) ? parseFecha(b.fecha).getTime() : 0);
      return tb - ta;
    });
    var muroVideo = muroOrden.filter(function (p) {
      return (p.video && p.video.url) || (p.tipoMedia === 'video' && p.mediaUrl) || (p.mediaUrl && p.mediaUrl.indexOf('youtu') !== -1);
    })[0] || muroOrden[0];
    if (muroVideo) {
      var thumbInfo = extractPostThumbnail(muroVideo);
      var muroTitulo = getPostDisplayTitle(muroVideo);
      var muroGrado = getPostGradeDisplay(muroVideo);
      var hasVid = (thumbInfo.badge === '🎬');
      cardsHtml.push(
        '<article class="fb-vitrina-card vitrina-muro" onclick="window.abrirModalPostMuro(\'' + esc(muroVideo.id) + '\')" tabindex="0" role="button" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();window.abrirModalPostMuro(\'' + esc(muroVideo.id) + '\');}" aria-label="Ver en El Muro: ' + esc(muroTitulo) + '">' +
          '<div class="fb-vitrina-media">' +
            '<img src="' + esc(thumbInfo.url) + '" alt="' + esc(muroTitulo) + '" loading="eager" onerror="this.src=\'img/escudo_paulo_freire.png\'">' +
            (hasVid ? '<span class="fb-vitrina-play" aria-hidden="true">▶</span>' : '') +
            '<span class="fb-vitrina-badge">🎬 ¡EL MURO!</span>' +
          '</div>' +
          '<div class="fb-vitrina-body">' +
            '<span class="fb-vitrina-grade">🎓 ' + esc(muroGrado) + '</span>' +
            '<h3 class="fb-vitrina-card-title">' + esc(muroTitulo) + '</h3>' +
            '<span class="fb-vitrina-cta">' + (hasVid ? '🍿 ¡Mirar Video!' : '📸 ¡Ver en El Muro!') + '</span>' +
          '</div>' +
        '</article>'
      );
    }

    grid.innerHTML = cardsHtml.join('');
  }

  window.openVitrinaClase = function () {
    if (vitrinaClaseItem && typeof abrirModalClasePeriodico === 'function') {
      abrirModalClasePeriodico(vitrinaClaseItem, { a: vitrinaClaseItem, estado: estadoActividad(vitrinaClaseItem) });
    } else {
      switchView('clase');
    }
  };

  window.openVitrinaCasa = function () {
    if (vitrinaCasaItem && typeof openCasaDetailModal === 'function') {
      openCasaDetailModal(vitrinaCasaItem);
    } else {
      switchView('casa');
    }
  };

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
    renderValijaMaker();
    renderVitrinaTop();
    initHerramientas();
    initReader();
    initClasePeriodicoModal();
    initMuroAmpliadoModal();
    initNav();

    var more = document.getElementById('hn-news-more');
    if (more) more.addEventListener('click', function () { visibles += POR_PAGINA; renderNoticias(); });

    // Si el alumno inicia/cierra sesión, se reordenan las actividades y sincronizan selects
    window.addEventListener('student_session_changed', function () {
      var st = alumno();
      if (st && st.gradeId) {
        filtroGradoAct = st.gradeId;
        ['hn-clase-grade', 'hn-casa-grade', 'valija-grade-filter'].forEach(function (id) {
          var sel = document.getElementById(id);
          if (sel) sel.value = st.gradeId;
        });
        seleccionarGrupoJuegos(st.gradeId, false);
      }
      renderActividades();
      renderJuegos();
      renderVitrinaTop();
      if (st && st.gradeId) { filtroGradoValija = st.gradeId; renderValijaMaker(st.gradeId); renderAgenda(st.gradeId); }
      if (window.renderGDriveDashboard && st && document.getElementById('student-drive-dashboard-container')) {
        window.renderGDriveDashboard('student-drive-dashboard-container');
      }
    });

    if (window.renderGDriveDashboard && alumno()) {
      window.renderGDriveDashboard('student-drive-dashboard-container');
    }

    // Sincronizar en tiempo real las publicaciones creadas desde el panel de administración
    syncRemotePosts();
    syncRemoteNews();
    syncRemoteClaseActivities();
    syncRemoteCasaActivities();
    syncRemoteGames();
    syncRemoteTools();
    syncRemoteValijaMaker();

    // Observar visibilidad de pestañas para activar 'Ver más' apenas se muestren sin necesidad de refrescar
    if (typeof window.IntersectionObserver !== 'undefined') {
      var muroView = document.getElementById('view-muro');
      if (muroView) {
        var muroObs = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              checkCollapsiblePosts(document.getElementById('hn-muro-feed'));
            }
          });
        }, { threshold: [0, 0.05, 0.1] });
        muroObs.observe(muroView);
      }
      var juegosView = document.getElementById('view-juegos');
      if (juegosView) {
        var juegosObs = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              checkCollapsibleGameDescs(document.getElementById('hn-juegos-grid'));
            }
          });
        }, { threshold: [0, 0.05, 0.1] });
        juegosObs.observe(juegosView);
      }
    }

    if (typeof window.MutationObserver !== 'undefined') {
      var muroViewEl = document.getElementById('view-muro');
      if (muroViewEl) {
        var mutObs = new MutationObserver(function (mutations) {
          mutations.forEach(function (m) {
            if (m.type === 'attributes' && m.attributeName === 'class' && muroViewEl.classList.contains('active')) {
              checkCollapsiblePosts(document.getElementById('hn-muro-feed'));
            }
          });
        });
        mutObs.observe(muroViewEl, { attributes: true, attributeFilter: ['class', 'style'] });
      }
    }

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        checkCollapsiblePosts(document.getElementById('hn-muro-feed'));
        checkCollapsibleGameDescs(document.getElementById('hn-juegos-grid'));
      });
    }

    window.addEventListener('resize', function () {
      clearTimeout(window._resizeCollapsibleTimer);
      window._resizeCollapsibleTimer = setTimeout(function () {
        checkCollapsiblePosts(document.getElementById('hn-muro-feed'));
        checkCollapsibleGameDescs(document.getElementById('hn-juegos-grid'));
      }, 180);
    });
  }

  function syncRemoteClaseActivities() {
    function applyClaseMerge(remoteClaseList, deletedIdsList) {
      remoteClaseList = remoteClaseList || [];
      deletedIdsList = deletedIdsList || [];

      try {
        var rawOv = localStorage.getItem('pf_admin_clase_overrides');
        if (rawOv) {
          var ovMap = JSON.parse(rawOv);
          Object.keys(ovMap).forEach(function (k) {
            var ov = ovMap[k];
            if (!ov) return;
            if (ov.deleted) {
              if (deletedIdsList.indexOf(k) === -1) deletedIdsList.push(k);
              remoteClaseList = remoteClaseList.filter(function (it) { return it.id !== k; });
            } else {
              var eIdx = remoteClaseList.findIndex(function (it) { return it.id === k; });
              if (eIdx !== -1) {
                remoteClaseList[eIdx] = Object.assign(remoteClaseList[eIdx], ov);
              } else {
                remoteClaseList.push(ov);
              }
            }
          });
        }
      } catch (eOv) {
        console.warn('Error fusionando overrides locales de clase:', eOv);
      }

      var baseActivities = (window.HOME_CONTENT && window.HOME_CONTENT.actividades) || [];
      var currentOtras = (C.actividades || []).filter(function (a) { return a.tipo !== 'clase'; });
      if (!currentOtras.length) {
        currentOtras = baseActivities.filter(function (a) { return a.tipo !== 'clase'; });
      }
      var baseClase = baseActivities.filter(function (a) { return a.tipo === 'clase'; });

      var mergedClase = remoteClaseList.concat(baseClase.filter(function (ba) {
        return !remoteClaseList.some(function (rc) {
          return rc.id === ba.id || (rc.titulo && ba.titulo && rc.titulo.trim().toLowerCase() === ba.titulo.trim().toLowerCase());
        }) && deletedIdsList.indexOf(ba.id) === -1;
      }));

      C.actividades = currentOtras.concat(mergedClase);
      window.CLASE_ACTIVITIES_CACHE = mergedClase;
      if (window.HOME_CONTENT) {
        window.HOME_CONTENT.actividades = C.actividades;
      }

      renderFiltrosActividades();
      renderActividades();
      renderMasthead();
      renderAgenda();
      renderVitrinaTop();

      if (typeof window.renderGDriveDashboard === 'function' && document.getElementById('student-drive-dashboard-container')) {
        window.renderGDriveDashboard('student-drive-dashboard-container');
      }
    }

    applyClaseMerge([], []);

    try {
      if (typeof window.db !== 'undefined' && window.db && typeof window.db.collection === 'function') {
        window.db.collection('clase_activities').onSnapshot(function (snapshot) {
          if (!snapshot) return;
          var remoteClase = [];
          var deletedIds = [];
          snapshot.forEach(function (doc) {
            var d = doc.data();
            if (d.deleted) {
              deletedIds.push(doc.id);
              return;
            }
            var cleanD = sanearObjetoActividad(Object.assign({}, d));
            remoteClase.push({
              id: doc.id,
              titulo: cleanD.titulo || '',
              subtitulo: cleanD.subtitulo || '',
              tipo: 'clase',
              grados: cleanD.grados || [cleanD.grado || 'todos'],
              grado: cleanD.grado || 'todos',
              descripcion: cleanD.descripcion || '',
              icono: cleanD.icono || '🤖',
              color: cleanD.color || '#2E7D32',
              imagen: cleanD.imagen || '',
              galeria: cleanD.galeria || [],
              chips: cleanD.chips || [],
              desde: cleanD.desde || '',
              hasta: cleanD.hasta || '',
              botones: cleanD.botones || []
            });
          });

          applyClaseMerge(remoteClase, deletedIds);
        }, function (err) {
          console.warn('Sync clase activities notice:', err);
        });
      } else {
        setTimeout(syncRemoteClaseActivities, 800);
      }
    } catch (e) {
      console.warn('Error en syncRemoteClaseActivities:', e);
    }
  }

  function syncRemoteCasaActivities() {
    function applyCasaMerge(remoteCasaList, deletedIdsList) {
      remoteCasaList = remoteCasaList || [];
      deletedIdsList = deletedIdsList || [];

      // Fusionar con overrides locales de admin si existen
      try {
        var rawOv = localStorage.getItem('pf_admin_casa_overrides');
        if (rawOv) {
          var ovMap = JSON.parse(rawOv);
          Object.keys(ovMap).forEach(function (k) {
            var ov = ovMap[k];
            if (!ov) return;
            if (ov.deleted) {
              if (deletedIdsList.indexOf(k) === -1) deletedIdsList.push(k);
              remoteCasaList = remoteCasaList.filter(function (it) { return it.id !== k; });
            } else {
              var eIdx = remoteCasaList.findIndex(function (it) { return it.id === k; });
              if (eIdx !== -1) {
                remoteCasaList[eIdx] = Object.assign(remoteCasaList[eIdx], ov);
              } else {
                remoteCasaList.push(ov);
              }
            }
          });
        }
      } catch (eOv) {
        console.warn('Error fusionando overrides locales de casa:', eOv);
      }

      // Obtener actividades iniciales de news.js
      var baseActivities = (window.HOME_CONTENT && window.HOME_CONTENT.actividades) || [];
      var currentClase = (C.actividades || []).filter(function (a) { return a.tipo === 'clase'; });
      if (!currentClase.length) {
        currentClase = baseActivities.filter(function (a) { return a.tipo === 'clase'; });
      }
      var baseCasa = baseActivities.filter(function (a) { return a.tipo === 'casa' || a.tipo === 'familia'; });

      // Unir las de casa: Firestore y overrides prevalecen sobre base, descartando eliminadas
      var mergedCasa = remoteCasaList.concat(baseCasa.filter(function (ba) {
        return !remoteCasaList.some(function (rc) {
          return rc.id === ba.id || (rc.titulo && ba.titulo && rc.titulo.trim().toLowerCase() === ba.titulo.trim().toLowerCase());
        }) && deletedIdsList.indexOf(ba.id) === -1;
      }));

      // Eliminar duplicados del Álbum del Mundial (conservar la versión oficial con portada)
      var hasOfficialAlbum = mergedCasa.some(function (it) {
        return it.id === 'act-album-mundial-cpf' || /álbum digital cpf/i.test(it.titulo || '');
      });
      if (hasOfficialAlbum) {
        mergedCasa = mergedCasa.filter(function (it) {
          var isOfficial = (it.id === 'act-album-mundial-cpf' || /álbum digital cpf/i.test(it.titulo || ''));
          if (isOfficial) return true;
          var urlStr = (it.botones || []).map(function (b) { return b.url || ''; }).join(' ');
          var isDupAlbum = /mundial de fútbol/i.test(it.titulo || '') || /roboticapaulofreire-uy\.github\.io\/mundial/i.test(urlStr);
          return !isDupAlbum;
        });
      }

      C.actividades = currentClase.concat(mergedCasa);

      renderFiltrosActividades();
      renderActividades();
      renderMasthead();
      renderAgenda();
      renderVitrinaTop();
    }

    // Aplicar inmediatamente con base + overrides locales si existen
    applyCasaMerge([], []);

    try {
      if (typeof window.db !== 'undefined' && window.db && typeof window.db.collection === 'function') {
        window.db.collection('casa_activities').onSnapshot(function (snapshot) {
          if (!snapshot) return;
          var remoteCasa = [];
          var deletedIds = [];
          snapshot.forEach(function (doc) {
            var d = doc.data();
            if (d.deleted) {
              deletedIds.push(doc.id);
              return;
            }
            var cleanD = sanearObjetoActividad(Object.assign({}, d));
            remoteCasa.push({
              id: doc.id,
              titulo: cleanD.titulo || '',
              tipo: cleanD.tipo || 'casa',
              modalidad: cleanD.modalidad || 'maker',
              materiales: cleanD.materiales || '',
              grados: cleanD.grados || [cleanD.grado || 'todos'],
              grado: cleanD.grado || 'todos',
              descripcion: cleanD.descripcion || '',
              icono: cleanD.icono || (cleanD.tipo === 'familia' ? '👨‍👩‍👧‍👦' : '🏠'),
              color: cleanD.color || '#1D4ED8',
              imagen: cleanD.imagen || '',
              destacada: !!cleanD.destacada,
              desde: cleanD.desde || '',
              hasta: cleanD.hasta || '',
              chips: cleanD.chips || [],
              botones: cleanD.botones || []
            });
          });

          applyCasaMerge(remoteCasa, deletedIds);
        }, function (err) {
          console.warn('Sync casa activities notice:', err);
        });
      } else {
        setTimeout(syncRemoteCasaActivities, 800);
      }
    } catch (e) {
      console.warn('Error en syncRemoteCasaActivities:', e);
    }
  }

  function syncRemoteNews() {
    function applyNewsMerge(remoteNewsList, deletedIdsList) {
      remoteNewsList = remoteNewsList || [];
      deletedIdsList = deletedIdsList || [];

      try {
        var rawOv = localStorage.getItem('pf_admin_news_overrides');
        if (rawOv) {
          var ovMap = JSON.parse(rawOv);
          Object.keys(ovMap).forEach(function (k) {
            var ov = ovMap[k];
            if (!ov) return;
            if (ov.deleted) {
              if (deletedIdsList.indexOf(k) === -1) deletedIdsList.push(k);
              remoteNewsList = remoteNewsList.filter(function (it) { return it.id !== k; });
            } else {
              var eIdx = remoteNewsList.findIndex(function (it) { return it.id === k; });
              if (eIdx !== -1) {
                remoteNewsList[eIdx] = Object.assign(remoteNewsList[eIdx], ov);
              } else {
                remoteNewsList.push(ov);
              }
            }
          });
        }
      } catch (eOv) {
        console.warn('Error fusionando overrides locales de news:', eOv);
      }

      var baseNews = (window.HOMEPAGE_NEWS && window.HOMEPAGE_NEWS.noticias) || (window.HOME_CONTENT && window.HOME_CONTENT.noticias) || [];
      var mergedNews = remoteNewsList.concat(baseNews.filter(function (bn) {
        return !remoteNewsList.some(function (rn) {
          return rn.id === bn.id || (rn.titulo && bn.titulo && rn.titulo.trim().toLowerCase() === bn.titulo.trim().toLowerCase());
        }) && deletedIdsList.indexOf(bn.id) === -1;
      }));

      // Adaptar bienvenida del portal a lenguaje amigable para niños con emoticones
      mergedNews.forEach(function (item) {
        if (/bienvenidos al nuevo portal digital del taller/i.test(item.titulo || '')) {
          item.bajada = '🤖✨ ¡Hola chicos! Estrenamos nuestra nueva página del Taller de Robótica y Programación para jugar, crear y compartir tus inventos.';
          item.cuerpo = [
            '🎉 **¡Qué alegría tenerte acá!** Este espacio es tuyo para que explores todo lo que hacemos en el cole: robots, videojuegos, inteligencia artificial y proyectos súper divertidos. 🚀',
            '🕹️ **¿Qué podés hacer en el portal?**\n- **Juegos:** Girá la Ruleta Arcade y probá desafíos de programación.\n- **En Clase y En Casa:** Descubrí misiones nuevas con viñetas de historieta.\n- **El Muro:** Mirá las fotos y videos de tus amigos en el taller. 📸🎬',
            '💡 **¡Manos a la obra!** Entrá con tu usuario y PIN para ver tus archivos, subir tus creaciones y mostrarle a tu familia todo lo que sabés hacer. 🌟'
          ];
        }
      });

      C.noticias = mergedNews;

      refrescarNoticias();
      renderMasthead();
      renderDestacada();
      renderFiltrosNoticias();
      renderNoticias();
      renderVitrinaTop();
    }

    applyNewsMerge([], []);

    try {
      if (typeof window.db !== 'undefined' && window.db && typeof window.db.collection === 'function') {
        window.db.collection('news').onSnapshot(function (snapshot) {
          if (!snapshot) return;
          var remoteNews = [];
          var deletedIds = [];
          snapshot.forEach(function (doc) {
            var d = doc.data();
            if (d.deleted) {
              deletedIds.push(doc.id);
              return;
            }
            var docDate = d.fecha || (d.createdAt ? new Date(d.createdAt.toDate ? d.createdAt.toDate() : d.createdAt).toISOString().split('T')[0] : '2026-10-11');
            var rawTime = d.createdAt ? (d.createdAt.toMillis ? d.createdAt.toMillis() : (d.createdAt.toDate ? d.createdAt.toDate().getTime() : 0)) : 0;
            remoteNews.push({
              id: doc.id,
              titulo: d.titulo || '',
              bajada: d.bajada || '',
              cuerpo: Array.isArray(d.cuerpo) ? d.cuerpo : [d.cuerpo || ''],
              fecha: docDate,
              _time: rawTime,
              categoria: d.categoria || 'taller',
              grado: d.grado || 'todos',
              imagen: d.imagen || 'img/bienvenida_taller.jpg',
              destacada: !!d.destacada,
              links: d.links || []
            });
          });

          applyNewsMerge(remoteNews, deletedIds);
        }, function (err) {
          console.warn('Sync news notice:', err);
        });
      } else {
        setTimeout(syncRemoteNews, 800);
      }
    } catch (e) {
      console.warn('Error en syncRemoteNews:', e);
    }
  }

  function syncRemotePosts() {
    try {
      if (typeof window.db !== 'undefined' && window.db && typeof window.db.collection === 'function') {
        window.db.collection('posts').onSnapshot(function (snapshot) {
          if (!snapshot) return;
          var remote = [];
          snapshot.forEach(function (doc) {
            var d = doc.data();
            // Extraer lista de grados (soporta arrays y strings legacy)
            var postGrades = [];
            if (Array.isArray(d.grades) && d.grades.length) {
              postGrades = d.grades.map(normalizarGrado);
            } else if (Array.isArray(d.grados) && d.grados.length) {
              postGrades = d.grados.map(normalizarGrado);
            } else if (Array.isArray(d.targetGrades) && d.targetGrades.length) {
              postGrades = d.targetGrades.map(normalizarGrado);
            } else if (d.targetGrade) {
              postGrades = parseGradesFromText(d.targetGrade);
            } else {
              postGrades = ['todos'];
            }

            var labelGrado = '';
            if (Array.isArray(d.targetGrades) && d.targetGrades.length) {
              labelGrado = d.targetGrades.join(' · ');
            } else if (d.targetGrade) {
              labelGrado = d.targetGrade;
            } else {
              labelGrado = postGrades.indexOf('todos') !== -1 ? 'Todo el Colegio' : postGrades.map(nombreGrado).join(' · ');
            }

            var rawTime = d.createdAt ? (d.createdAt.toMillis ? d.createdAt.toMillis() : (d.createdAt.toDate ? d.createdAt.toDate().getTime() : 0)) : (d.updatedAt ? (d.updatedAt.toMillis ? d.updatedAt.toMillis() : 0) : Date.now());
            var docDate = d.fecha || (d.createdAt ? new Date(d.createdAt.toDate ? d.createdAt.toDate() : d.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
            var isVideo = (d.mediaType === 'video') || (d.mediaUrl && (d.mediaUrl.indexOf('youtu') !== -1 || d.mediaUrl.indexOf('.mp4') !== -1));
            var isYt = isVideo && d.mediaUrl && (d.mediaUrl.indexOf('youtu') !== -1);

            remote.push({
              id: doc.id,
              tipoMedia: isVideo ? 'video' : (d.mediaType || 'foto'),
              autor: d.author || 'Taller de Robótica & Programación',
              rolAutor: 'Docente Paulo Freire',
              avatarAutor: 'img/escudo_paulo_freire.png',
              fecha: docDate,
              _time: rawTime,
              grado: postGrades[0] || 'todos',
              grados: postGrades,
              etiquetaGrado: labelGrado,
              texto: d.description || '',
              titulo: d.title || d.titulo || '',
              mediaUrl: d.mediaUrl || '',
              mediaType: d.mediaType || (isVideo ? 'video' : 'foto'),
              categoria: d.category || 'Actividad',
              video: isVideo ? {
                tipo: isYt ? 'youtube' : 'video',
                titulo: d.title || 'Video de la actividad',
                url: d.mediaUrl || '',
                subtitulo: 'Actividad realizada en clase'
              } : null,
              fotos: !isVideo && d.mediaUrl ? [{
                url: d.mediaUrl,
                alt: d.title || 'Foto de actividad',
                caption: d.title || ''
              }] : []
            });
          });

          // Si hay publicaciones en Firestore, Firestore es la fuente de verdad (igual que en el panel administrativo).
          // Solo si no hay publicaciones en Firestore se usan las de demostración iniciales.
          var basePosts = (window.HOMEPAGE_NEWS && window.HOMEPAGE_NEWS.muro) || (window.HOME_CONTENT && window.HOME_CONTENT.muro) || [];
          if (remote.length > 0) {
            C.muro = remote;
          } else {
            C.muro = basePosts;
          }
          renderFiltrosMuro();
          renderMuro();
          renderVitrinaTop();
        }, function (err) {
          console.warn('Sync posts notice:', err);
        });
      } else {
        setTimeout(syncRemotePosts, 800);
      }
    } catch (e) {
      console.warn('Error en syncRemotePosts:', e);
    }
  }

  function syncRemoteGames() {
    try {
      if (typeof window.db !== 'undefined' && window.db && typeof window.db.collection === 'function') {
        window.db.collection('games').onSnapshot(function (snapshot) {
          if (!snapshot) return;
          var remoteGames = [];
          var deletedMap = {};
          snapshot.forEach(function (doc) {
            var d = doc.data();
            if (d.deleted) {
              deletedMap[doc.id] = true;
              return;
            }
            if (/coding town:\s*¡?constru[ií] tu propia ciudad/i.test(d.title || '')) {
              deletedMap[doc.id] = true;
              return;
            }
            remoteGames.push({
              id: doc.id,
              title: d.title || '',
              grade: d.grade || d.gradeId || 'todos',
              gradeId: d.grade || d.gradeId || 'todos',
              grades: d.grades || [d.grade || 'todos'],
              platform: d.platform || 'web',
              scratchId: d.scratchId || null,
              externalUrl: d.externalUrl || '',
              thumbnail: d.thumbnail || '',
              description: d.description || '',
              benefits: d.benefits || '',
              tags: d.tags || []
            });
          });

          remoteGames = applyLocalGameOverrides(remoteGames, deletedMap);
          window._deletedRemoteGameIds = deletedMap;
          window._customRemoteGames = remoteGames;
          renderFiltrosJuegos();
          renderJuegos();
        }, function (err) {
          console.warn('Sync games notice:', err);
        });
      } else {
        setTimeout(syncRemoteGames, 800);
      }
    } catch (e) {
      console.warn('Error en syncRemoteGames:', e);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.openNoticia = abrirNoticia;
  window.switchView = switchView;
  window.showActividades = function (sec) { switchView(sec === 'casa' ? 'casa' : 'clase'); };
  window.showJuegos = function (gradeId) { switchView('juegos'); if (gradeId) seleccionarGrupoJuegos(gradeId); };
  window.seleccionarGrupoJuegos = seleccionarGrupoJuegos;
  window.getGradesConJuegos = getGradesConJuegos;
  window.normalizarGrado = normalizarGrado;
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

  /* ───────────── Festejo 30 Años: Lluvia de Confeti Interactiva ───────────── */
  var aniv30CheerIdx = 0;
  var aniv30Cheers = [
    '🥳 ¡Feliz cumple Nº 30, Colegio Paulo Freire!',
    '🎂 ¡30 años soñando, jugando y creando inventos!',
    '🤖 ¡Viva el Taller de Robótica y nuestros inventores!',
    '🎈 ¡1996 – 2026! ¡Que sigan las aventuras maker!'
  ];

  window.lanzarFestejo30Anios = function () {
    var emojis = ['🎉', '🎂', '🎈', '⭐', '👑', '🤖', '✨'];
    var colors = ['#F59E0B', '#10B981', '#2563EB', '#EC4899', '#FACC15', '#8B5CF6'];
    var layer = document.createElement('div');
    layer.className = 'fb-confetti-layer';
    layer.setAttribute('aria-hidden', 'true');

    for (var i = 0; i < 36; i++) {
      var piece = document.createElement('span');
      var isEmoji = (i % 2 === 0);
      piece.className = 'fb-confetti-piece ' + (isEmoji ? 'is-emoji' : 'is-ribbon');
      if (isEmoji) {
        piece.textContent = emojis[i % emojis.length];
      } else {
        piece.style.background = colors[i % colors.length];
      }
      piece.style.left = Math.round(Math.random() * 98) + 'vw';
      piece.style.animationDuration = (2.1 + Math.random() * 1.1).toFixed(2) + 's';
      piece.style.animationDelay = (Math.random() * 0.45).toFixed(2) + 's';
      piece.style.setProperty('--fb-drift', Math.round((Math.random() - 0.5) * 140) + 'px');
      piece.style.setProperty('--fb-spin', Math.round((Math.random() - 0.5) * 720) + 'deg');
      layer.appendChild(piece);
    }

    document.body.appendChild(layer);
    setTimeout(function () {
      if (layer && layer.parentNode) layer.parentNode.removeChild(layer);
    }, 3600);

    var cheerEl = document.getElementById('fb-aniv30-cheer');
    if (cheerEl) {
      cheerEl.textContent = aniv30Cheers[aniv30CheerIdx % aniv30Cheers.length];
      aniv30CheerIdx++;
    }
    if (window.sounds && typeof window.sounds.playSuccess === 'function') {
      try { window.sounds.playSuccess(); } catch (e) {}
    }
  };
})();
