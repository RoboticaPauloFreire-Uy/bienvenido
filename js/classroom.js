/**
 * =============================================================
 * CLASSROOM.JS — Vista de Aula (aula.html)
 * Colegio Paulo Freire · Taller de Programación
 * 
 * - Secciones: 📁 Proyectos vs 🎮 Zona de Juegos
 * - Publicaciones limpias con botón "Ver Proyecto"
 * - Modal dinámico que muestra SOLO los materiales existentes:
 *   (Galería de fotos, Manual PDF, MakeCode, Scratch, Recursos)
 * - Índice de Proyectos en las barras laterales
 * =============================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  const data    = window.SCHOOL_DATA;
  if (!data) return;

  const params  = new URLSearchParams(window.location.search);
  const gradeId = params.get('grado');
  const grade   = window.getGradeById(gradeId);
  const main    = document.getElementById('classroom-main');

  // Sección inicial desde URL (o 'proyectos' por defecto)
  const initialSection = params.get('seccion') === 'juegos' ? 'juegos' : 'proyectos';

  // Marcar sidebar activa
  document.querySelectorAll('.sidebar-link[data-grade]').forEach(l => {
    l.classList.toggle('active', l.getAttribute('data-grade') === gradeId);
  });

  if (!grade) {
    main.innerHTML = `
      <div class="empty-state" style="margin-top:40px;">
        <div class="empty-icon">🔍</div>
        <h2 class="empty-title">Aula no encontrada</h2>
        <p class="empty-sub"><a href="index.html" style="color:var(--green-700);font-weight:800;">← Volver al inicio</a></p>
      </div>`;
    return;
  }

  document.title = `${grade.name} — Colegio Paulo Freire`;

  // Poblar lista de proyectos en la sidebar izquierda
  populateSidebarProjects(grade);

  main.innerHTML = `
    <!-- Cabecera del Aula -->
    <div class="classroom-page-header" style="border-top:4px solid ${grade.color};">
      <div class="cph-icon" style="background:${grade.colorLight};color:${grade.color};">${grade.icon}</div>
      <div class="cph-info">
        <h1 class="cph-title">${grade.name}</h1>
        <p class="cph-sub">${grade.description}</p>
        <div class="cph-badges">
          <span class="badge badge-green"><i class="fas fa-laptop-code"></i> Taller de Programación</span>
          <button class="badge badge-clickable badge-yellow" data-switch-to="juegos" title="Ver zona de juegos">
            <i class="fas fa-gamepad"></i> ${grade.games.length} juego${grade.games.length !== 1 ? 's' : ''}
          </button>
          <button class="badge badge-clickable" data-switch-to="proyectos" style="background:${grade.colorLight};color:${grade.color};" title="Ver proyectos">
            <i class="fas fa-folder-open"></i> ${grade.projects.length} proyecto${grade.projects.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>

    <!-- Barra de Navegación de Secciones del Aula -->
    <div class="classroom-nav-container">
      <div class="classroom-nav-tabs">
        <button class="c-tab-btn ${initialSection === 'proyectos' ? 'active' : ''}" data-target-section="proyectos">
          <i class="fas fa-folder-open"></i>
          <span>Proyectos de los Alumnos</span>
          <span class="c-tab-count">${grade.projects.length}</span>
        </button>
        <button class="c-tab-btn ${initialSection === 'juegos' ? 'active' : ''}" data-target-section="juegos">
          <i class="fas fa-gamepad"></i>
          <span>Zona de Juegos</span>
          <span class="c-tab-count">${grade.games.length}</span>
        </button>
        <button class="c-tab-btn ${initialSection === 'drive' ? 'active' : ''}" data-target-section="drive">
          <i class="fab fa-google-drive"></i>
          <span>Mi Carpeta Google Drive</span>
        </button>
      </div>
    </div>

    <!-- Layout Feed + Sidebar -->
    <div class="feed-layout">
      <div class="feed-column">
        <!-- SECCIÓN 1: PROYECTOS -->
        <div id="section-proyectos" class="classroom-section" style="${initialSection === 'proyectos' ? '' : 'display:none;'}">
          ${renderProjectsSectionHtml(grade)}
        </div>

        <!-- SECCIÓN 2: JUEGOS (GRILLA) -->
        <div id="section-juegos" class="classroom-section" style="${initialSection === 'juegos' ? '' : 'display:none;'}">
          ${renderGamesSectionHtml(grade)}
        </div>

        <!-- SECCIÓN 3: GOOGLE DRIVE -->
        <div id="section-drive" class="classroom-section" style="${initialSection === 'drive' ? '' : 'display:none;'}">
          <div id="gdrive-explorer-container"></div>
        </div>
      </div>

      <!-- SIDEBAR DERECHA -->
      <div class="sidebar-right" id="sidebar-right"></div>
    </div>
  `;

  // ─── LÓGICA DE CAMBIO DE SECCIONES (TABS) ──────
  function switchSection(sectionName) {
    document.querySelectorAll('.c-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-target-section') === sectionName);
    });

    const secProyectos = document.getElementById('section-proyectos');
    const secJuegos    = document.getElementById('section-juegos');
    const secDrive     = document.getElementById('section-drive');

    if (secProyectos) secProyectos.style.display = sectionName === 'proyectos' ? '' : 'none';
    if (secJuegos)    secJuegos.style.display    = sectionName === 'juegos'    ? '' : 'none';
    if (secDrive)     secDrive.style.display     = sectionName === 'drive'     ? '' : 'none';

    if (sectionName === 'drive' && window.renderGDriveExplorer) {
      window.renderGDriveExplorer('gdrive-explorer-container');
    }

    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('seccion', sectionName);
    window.history.replaceState({}, '', newUrl);
  }

  // Eventos de botones de navegación de sección
  document.querySelectorAll('.c-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchSection(btn.getAttribute('data-target-section'));
    });
  });

  // Eventos de badges clickeables
  document.querySelectorAll('[data-switch-to]').forEach(badge => {
    badge.addEventListener('click', () => {
      switchSection(badge.getAttribute('data-switch-to'));
    });
  });

  // Eventos de botones "Ver Proyecto" para abrir el modal de detalles
  document.querySelectorAll('.btn-open-project-modal').forEach(btn => {
    btn.addEventListener('click', () => {
      const projId = btn.getAttribute('data-project-id');
      const proj   = grade.projects.find(p => p.id === projId);
      if (proj) openProjectModal(proj, grade);
    });
  });

  // ─── SIDEBAR DERECHA (ÍNDICE DE PROYECTOS) ──────
  document.getElementById('sidebar-right').innerHTML = `
    <div class="widget-card">
      <div class="widget-title"><i class="fas fa-info-circle"></i> Sobre esta aula</div>
      <div class="widget-info-list">
        <div class="wil-row wil-clickable" data-switch-to="juegos">
          <i class="fas fa-gamepad"></i>
          <span><strong>${grade.games.length}</strong> juego${grade.games.length !== 1 ? 's' : ''} disponibles</span>
        </div>
        <div class="wil-row wil-clickable" data-switch-to="proyectos">
          <i class="fas fa-folder-open"></i>
          <span><strong>${grade.projects.length}</strong> proyecto${grade.projects.length !== 1 ? 's' : ''} publicados</span>
        </div>
      </div>
    </div>

    <!-- ÍNDICE DE PROYECTOS DEL AULA -->
    <div class="widget-card">
      <div class="widget-title"><i class="fas fa-folder-open"></i> Índice de Proyectos</div>
      <div class="widget-projects-list">
        ${grade.projects.length === 0
          ? `<div style="font-size:.84rem;color:var(--text-muted);padding:6px 0;">Sin proyectos aún</div>`
          : grade.projects.map((p, idx) => `
              <div class="widget-project-item" data-open-project-id="${p.id}">
                <span class="wpi-num">${idx + 1}</span>
                <div class="wpi-info">
                  <div class="wpi-title">${p.title}</div>
                  <div class="wpi-author"><i class="fas fa-calendar-alt"></i> ${p.date}</div>
                </div>
                <i class="fas fa-chevron-right wpi-arrow"></i>
              </div>
            `).join('')
        }
      </div>
    </div>

    <div class="widget-card">
      <div class="widget-title"><i class="fas fa-school"></i> Otras aulas</div>
      ${data.grades.map(g => `
        <a href="aula.html?grado=${g.id}" class="grade-nav-item ${g.id === gradeId ? 'current' : ''}">
          <span>${g.icon}</span><span>${g.name}</span>
          ${g.id === gradeId ? '<i class="fas fa-check-circle" style="margin-left:auto;color:var(--green-600);font-size:.82rem;"></i>' : ''}
        </a>`).join('')}
    </div>
  `;

  // Eventos para abrir proyectos desde el widget índice derecho
  document.querySelectorAll('[data-open-project-id]').forEach(item => {
    item.addEventListener('click', () => {
      const projId = item.getAttribute('data-open-project-id');
      const proj   = grade.projects.find(p => p.id === projId);
      if (proj) openProjectModal(proj, grade);
    });
  });

  // Re-adjuntar eventos para items clickeables del widget
  document.querySelectorAll('.wil-clickable').forEach(item => {
    item.addEventListener('click', () => {
      switchSection(item.getAttribute('data-switch-to'));
    });
  });

  // Inicializar visor de Google Drive si está presente
  if (window.renderGDriveExplorer) {
    window.renderGDriveExplorer('gdrive-explorer-container');
  }

  // ─── Lightbox de Fotos ────────────────────────
  initLightbox();

  // Inicializar listeners del modal de proyectos
  initProjectModalListeners();
});

/* =============================================================
   POBLAR PROYECTOS EN SIDEBAR IZQUIERDA
============================================================= */
function populateSidebarProjects(grade) {
  const container = document.getElementById('sidebar-projects-list');
  if (!container) return;

  if (grade.projects.length === 0) {
    container.innerHTML = `
      <span style="font-size:.82rem;color:var(--sidebar-muted);padding:6px 12px;">
        Próximamente...
      </span>`;
    return;
  }

  container.innerHTML = grade.projects.map(p => `
    <a href="javascript:void(0)" class="sidebar-platform-chip sidebar-proj-link" data-sidebar-proj-id="${p.id}" title="${p.title}">
      <span class="platform-icon">📁</span>
      <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${p.title}</span>
    </a>
  `).join('');

  container.querySelectorAll('[data-sidebar-proj-id]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const projId = link.getAttribute('data-sidebar-proj-id');
      const proj   = grade.projects.find(p => p.id === projId);
      if (proj) openProjectModal(proj, grade);
    });
  });
}

/* =============================================================
   SECCIÓN 1: PROYECTOS DE LOS ALUMNOS (CARDS EN FEED)
============================================================= */
function renderProjectsSectionHtml(grade) {
  if (grade.projects.length === 0) {
    return renderComingSoonHtml(grade, 'proyectos');
  }

  return grade.projects.map(proj => renderProjectPostHtml(proj, grade)).join('');
}

function renderProjectPostHtml(proj, grade) {
  const coverImg = proj.coverImage || (proj.gallery && proj.gallery[0]) || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80';

  // Badges de materiales disponibles
  const availableBadges = [];
  if (proj.gallery && proj.gallery.length > 0) {
    availableBadges.push(`<span class="mat-badge mat-badge-gallery"><i class="fas fa-camera"></i> ${proj.gallery.length} fotos</span>`);
  }
  if (proj.pdfUrl) {
    availableBadges.push(`<span class="mat-badge mat-badge-pdf"><i class="fas fa-file-pdf"></i> Manual PDF</span>`);
  }
  if (proj.makecodeUrl) {
    availableBadges.push(`<span class="mat-badge mat-badge-makecode"><i class="fas fa-gamepad"></i> MakeCode Arcade</span>`);
  }
  if (proj.scratchId) {
    availableBadges.push(`<span class="mat-badge mat-badge-scratch"><i class="fas fa-cat"></i> Scratch 3.0</span>`);
  }
  if (proj.materials && proj.materials.length > 0) {
    availableBadges.push(`<span class="mat-badge mat-badge-recursos"><i class="fas fa-box-open"></i> ${proj.materials.length} recursos</span>`);
  }

  return `
    <article class="post-card project-feed-card" id="proj-${proj.id}">
      <div class="project-feed-cover-wrap">
        <img
          src="${coverImg}"
          alt="${proj.title}"
          class="project-feed-cover"
          loading="lazy"
          onerror="this.src='https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80'"
        >
        <span class="project-grade-pill" style="background:${grade.color};">
          ${grade.icon} ${grade.shortName}
        </span>
      </div>

      <div class="post-body">
        <div class="post-meta-row">
          <span class="post-date"><i class="fas fa-calendar-alt"></i> ${proj.date}</span>
          <span class="post-tag-inline" style="color:${grade.color};font-weight:800;font-size:.82rem;">
            ${grade.icon} ${grade.name}
          </span>
        </div>

        <h2 class="post-title" style="margin-top:8px;">${proj.title}</h2>

        <p class="post-desc">${proj.description}</p>

        <!-- Materiales Disponibles -->
        <div class="project-materials-badges">
          ${availableBadges.join('')}
        </div>

        <!-- Tags -->
        <div class="post-tags" style="margin-bottom:16px;">
          ${proj.tags.map(t => `<span class="post-tag">#${t}</span>`).join('')}
        </div>

        <!-- Botón de apertura de modal -->
        <div class="post-actions">
          <button
            class="btn btn-primary btn-open-project-modal"
            data-project-id="${proj.id}"
            style="background:${grade.color};"
          >
            <i class="fas fa-folder-open"></i> Ver Proyecto y Materiales
          </button>
        </div>
      </div>
    </article>
  `;
}

/* =============================================================
   MODAL DE PROYECTO DINÁMICO (SOLO MUESTRA LO DISPONIBLE)
============================================================= */
function openProjectModal(proj, grade) {
  if (window.sounds) window.sounds.playClick();

  const modal     = document.getElementById('project-modal');
  const titleEl   = document.getElementById('pm-title');
  const badgeEl   = document.getElementById('pm-grade-badge') || document.getElementById('pm-author-badge');
  const bodyEl    = document.getElementById('pm-body');

  titleEl.textContent = proj.title;
  if (badgeEl) {
    badgeEl.textContent = `${grade.icon} ${grade.name}`;
    badgeEl.style.background = grade.colorLight;
    badgeEl.style.color = grade.color;
  }

  // Determinar pestañas disponibles
  const tabs = [];
  if (proj.gallery && proj.gallery.length > 0) {
    tabs.push({ id: 'gallery', icon: '📸', label: `Fotos (${proj.gallery.length})` });
  }
  if (proj.pdfUrl) {
    tabs.push({ id: 'pdf', icon: '📄', label: 'Manual PDF' });
  }
  if (proj.makecodeUrl) {
    tabs.push({ id: 'makecode', icon: '🕹️', label: 'MakeCode Arcade' });
  }
  if (proj.scratchId) {
    tabs.push({ id: 'scratch', icon: '🐱', label: 'Scratch 3.0' });
  }
  if (proj.materials && proj.materials.length > 0) {
    tabs.push({ id: 'materials', icon: '📦', label: `Recursos (${proj.materials.length})` });
  }

  const activeTabId = tabs.length > 0 ? tabs[0].id : null;

  // Generar HTML de cada pestaña
  let tabsNavHtml = '';
  if (tabs.length > 1) {
    tabsNavHtml = `
      <div class="pm-tabs-nav">
        ${tabs.map((t, idx) => `
          <button class="pm-tab-btn ${idx === 0 ? 'active' : ''}" data-pm-tab="${t.id}" style="${idx === 0 ? `border-color:${grade.color}; color:${grade.color};` : ''}">
            ${t.icon} <span>${t.label}</span>
          </button>
        `).join('')}
      </div>
    `;
  }

  // Generar contenido de cada panel
  let panelsHtml = '';

  // 1. Galería
  if (proj.gallery && proj.gallery.length > 0) {
    panelsHtml += `
      <div class="pm-panel" id="pm-panel-gallery" style="${activeTabId === 'gallery' ? '' : 'display:none;'}">
        <div class="pm-gallery-grid">
          ${proj.gallery.map((url, i) => `
            <div class="pm-gallery-thumb-wrap" data-lightbox="${proj.id}" data-index="${i}">
              <img src="${url}" alt="Foto ${i+1}" class="pm-gallery-thumb" loading="lazy">
              <div class="pm-gallery-thumb-overlay"><i class="fas fa-search-plus"></i> Ampliar</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // 2. Manual PDF
  if (proj.pdfUrl) {
    panelsHtml += `
      <div class="pm-panel" id="pm-panel-pdf" style="${activeTabId === 'pdf' ? '' : 'display:none;'}">
        <div class="pdf-preview-header">
          <i class="fas fa-file-pdf" style="color:#E53935;font-size:1.6rem;"></i>
          <div>
            <div style="font-weight:800;font-size:.95rem;">Manual del Proyecto</div>
            <div style="font-size:.8rem;color:var(--text-muted);">Documento descargable en formato PDF</div>
          </div>
          <a href="${proj.pdfUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm" style="margin-left:auto;background:${grade.color};">
            <i class="fas fa-download"></i> Descargar PDF
          </a>
        </div>
        <iframe src="${proj.pdfUrl}#toolbar=0" class="pdf-embed-frame" title="Manual PDF"></iframe>
      </div>
    `;
  }

  // 3. MakeCode
  if (proj.makecodeUrl) {
    panelsHtml += `
      <div class="pm-panel" id="pm-panel-makecode" style="${activeTabId === 'makecode' ? '' : 'display:none;'}">
        <div class="makecode-embed-header">
          <span style="font-size:1.3rem;">🕹️</span>
          <div>
            <div style="font-weight:800;">Simulador MakeCode Arcade</div>
            <div style="font-size:.8rem;color:var(--text-muted);">Jugá directamente o abrí el editor de bloques</div>
          </div>
          <a href="${proj.makecodeUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" style="margin-left:auto;">
            <i class="fas fa-external-link-alt"></i> Abrir editor
          </a>
        </div>
        <div style="position:relative;padding-bottom:60%;height:0;overflow:hidden;border-radius:12px;margin-top:14px;background:#000;">
          <iframe
            style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;"
            src="${proj.makecodeUrl.includes('---run') ? proj.makecodeUrl : proj.makecodeUrl + '---run'}"
            sandbox="allow-popups allow-forms allow-scripts allow-same-origin"
            loading="lazy">
          </iframe>
        </div>
      </div>
    `;
  }

  // 4. Scratch
  if (proj.scratchId) {
    panelsHtml += `
      <div class="pm-panel" id="pm-panel-scratch" style="${activeTabId === 'scratch' ? '' : 'display:none;'}">
        <div class="makecode-embed-header">
          <span style="font-size:1.3rem;">🐱</span>
          <div>
            <div style="font-weight:800;">Proyecto Scratch 3.0</div>
            <div style="font-size:.8rem;color:var(--text-muted);">Reproductor interactivo oficial del MIT</div>
          </div>
          <a href="https://scratch.mit.edu/projects/${proj.scratchId}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" style="margin-left:auto;">
            <i class="fas fa-external-link-alt"></i> Ver en Scratch
          </a>
        </div>
        <div style="display:flex;justify-content:center;margin-top:14px;border-radius:12px;overflow:hidden;background:#000;padding:12px 0;">
          <iframe
            src="https://scratch.mit.edu/projects/${proj.scratchId}/embed"
            width="485" height="402"
            allowtransparency="true" frameborder="0"
            scrolling="no" allowfullscreen loading="lazy">
          </iframe>
        </div>
      </div>
    `;
  }

  // 5. Recursos Adicionales
  if (proj.materials && proj.materials.length > 0) {
    panelsHtml += `
      <div class="pm-panel" id="pm-panel-materials" style="${activeTabId === 'materials' ? '' : 'display:none;'}">
        <div class="pm-materials-list">
          ${proj.materials.map(mat => `
            <div class="pm-material-card">
              <div class="pm-mat-icon"><i class="${mat.icon || 'fas fa-file'}"></i></div>
              <div class="pm-mat-info">
                <div class="pm-mat-title">${mat.title}</div>
                <div class="pm-mat-type">${mat.type}</div>
                <div class="pm-mat-desc">${mat.description}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Renderizar modal body completo
  bodyEl.innerHTML = `
    <!-- Barra Superior con Descripción del Proyecto -->
    <div class="pm-header-summary">
      <p class="pm-desc">${proj.description}</p>
      <div class="pm-meta-chips">
        <span class="pm-chip"><i class="fas fa-calendar-alt"></i> ${proj.date}</span>
        ${proj.tags.map(t => `<span class="post-tag">#${t}</span>`).join('')}
      </div>
    </div>

    <!-- Navegación de Pestañas de Materiales (solo las que existen) -->
    ${tabsNavHtml}

    <!-- Contenido Dinámico -->
    <div class="pm-panels-container">
      ${panelsHtml || `
        <div class="placeholder-section" style="margin:20px 0;">
          <span class="placeholder-icon">📁</span>
          <span>Este proyecto contiene únicamente la información descriptiva.</span>
        </div>
      `}
    </div>
  `;

  // Listeners para las pestañas del modal
  bodyEl.querySelectorAll('.pm-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-pm-tab');

      // Actualizar botones
      bodyEl.querySelectorAll('.pm-tab-btn').forEach(b => {
        b.classList.remove('active');
        b.style.borderColor = 'transparent';
        b.style.color = 'var(--text-secondary)';
      });
      btn.classList.add('active');
      btn.style.borderColor = grade.color;
      btn.style.color = grade.color;

      // Actualizar paneles
      bodyEl.querySelectorAll('.pm-panel').forEach(p => p.style.display = 'none');
      const targetPanel = document.getElementById(`pm-panel-${tabId}`);
      if (targetPanel) targetPanel.style.display = '';
    });
  });

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function initProjectModalListeners() {
  const modal = document.getElementById('project-modal');
  const closeBtn = document.getElementById('pm-close-btn');
  const fullBtn  = document.getElementById('pm-fullscreen-btn');

  function closeProjectModal() {
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  closeBtn?.addEventListener('click', closeProjectModal);

  modal?.addEventListener('click', e => {
    if (e.target === modal) closeProjectModal();
  });

  fullBtn?.addEventListener('click', () => {
    const dialog = modal?.querySelector('.modal-dialog');
    if (!document.fullscreenElement) {
      dialog?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  });

  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal?.classList.contains('active')) {
      closeProjectModal();
    }
  });
}

/* =============================================================
   SECCIÓN 2: ZONA DE JUEGOS (GRILLA ESTILO CODE.ORG)
============================================================= */
function renderGamesSectionHtml(grade) {
  const cards = grade.games.map(game => {
    const pm  = window.platformMeta(game.platform);
    const url = window.getGameUrl(game);

    return `
      <article class="game-grid-card">
        <div class="game-card-thumb-wrap">
          <img
            src="${game.thumbnail || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80'}"
            alt="${game.title}"
            class="game-card-thumb"
            loading="lazy"
            onerror="this.src='https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80'"
          >
          <span class="game-card-badge ${pm.cls}">${pm.icon} ${pm.label}</span>
        </div>
        <div class="game-card-body">
          <h3 class="game-card-title">${game.title}</h3>
          <p class="game-card-desc">${game.description}</p>
          
          ${game.benefits ? `
            <div class="game-card-benefits">
              <div class="benefits-label"><i class="fas fa-lightbulb"></i> ¿Qué aprende tu hijo/a?</div>
              <p class="benefits-text">${game.benefits}</p>
            </div>
          ` : ''}

          <div class="game-card-tags">
            ${game.tags.map(t => `<span class="post-tag">#${t}</span>`).join('')}
          </div>
        </div>
        <div class="game-card-footer">
          ${url
            ? `<a href="${url}" target="_blank" rel="noopener noreferrer"
                  class="btn-start-game" style="background:${grade.color};"
                  title="Abrir ${game.title} en nueva pestaña">
                 <span>Empezar</span> <i class="fas fa-external-link-alt"></i>
               </a>`
            : `<span class="btn-start-game disabled"><i class="fas fa-lock"></i> Próximamente</span>`
          }
        </div>
      </article>`;
  }).join('');

  return `
    <div class="post-card games-list-post">
      <div class="post-section-header" style="background:${grade.color};">
        <div class="psh-left">
          <span class="psh-icon">🎮</span>
          <div>
            <div class="psh-title">Zona de Juegos y Actividades</div>
            <div class="psh-sub">${grade.games.length} juego${grade.games.length !== 1 ? 's' : ''} disponibles · Hacé clic en "Empezar" para jugar en una nueva pestaña</div>
          </div>
        </div>
      </div>
      <div class="games-grid-container">
        ${grade.games.length === 0
          ? `<div class="empty-row"><i class="fas fa-hourglass-half"></i> Próximamente...</div>`
          : `<div class="games-grid">${cards}</div>`
        }
      </div>
    </div>
  `;
}

/* =============================================================
   RENDERIZAR SECCIÓN VACÍA
============================================================= */
function renderComingSoonHtml(grade, type) {
  return `
    <div class="post-card">
      <div class="post-section-header" style="background:${grade.color};">
        <div class="psh-left">
          <span class="psh-icon">📁</span>
          <div>
            <div class="psh-title">Proyectos del Taller</div>
            <div class="psh-sub">Las publicaciones de proyectos aparecerán acá pronto</div>
          </div>
        </div>
      </div>
      <div class="post-body">
        <div class="placeholder-section" style="padding:36px 20px;">
          <span class="placeholder-icon">🚧</span>
          <span style="font-size:1rem;font-weight:700;color:var(--text-primary);">Próximamente</span>
          <span style="color:var(--text-secondary);">Los proyectos de ${grade.name} se publicarán durante el año.</span>
        </div>
      </div>
    </div>`;
}

/* =============================================================
   LIGHTBOX DE FOTOS
============================================================= */
function initLightbox() {
  if (document.getElementById('lightbox')) return;

  const lb = document.createElement('div');
  lb.id = 'lightbox';
  lb.innerHTML = `
    <div id="lb-overlay">
      <button id="lb-close" title="Cerrar"><i class="fas fa-times"></i></button>
      <button id="lb-prev" title="Anterior"><i class="fas fa-chevron-left"></i></button>
      <img id="lb-img" src="" alt="Foto del proyecto">
      <button id="lb-next" title="Siguiente"><i class="fas fa-chevron-right"></i></button>
      <div id="lb-caption"></div>
    </div>
  `;
  document.body.appendChild(lb);

  let currentImages = [];
  let currentIndex  = 0;

  function showLightbox(images, index) {
    currentImages = images;
    currentIndex  = index;
    const img = document.getElementById('lb-img');
    img.src = images[index];
    document.getElementById('lb-caption').textContent = `${index + 1} / ${images.length}`;
    document.getElementById('lb-prev').style.display = images.length > 1 ? '' : 'none';
    document.getElementById('lb-next').style.display = images.length > 1 ? '' : 'none';
    lb.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lb.style.display = 'none';
    document.body.style.overflow = '';
  }

  function navigate(dir) {
    currentIndex = (currentIndex + dir + currentImages.length) % currentImages.length;
    document.getElementById('lb-img').src = currentImages[currentIndex];
    document.getElementById('lb-caption').textContent = `${currentIndex + 1} / ${currentImages.length}`;
  }

  document.getElementById('lb-close').addEventListener('click', closeLightbox);
  document.getElementById('lb-prev').addEventListener('click', () => navigate(-1));
  document.getElementById('lb-next').addEventListener('click', () => navigate(1));
  document.getElementById('lb-overlay').addEventListener('click', e => {
    if (e.target.id === 'lb-overlay') closeLightbox();
  });
  window.addEventListener('keydown', e => {
    if (lb.style.display === 'flex') {
      if (e.key === 'Escape')      closeLightbox();
      if (e.key === 'ArrowLeft')   navigate(-1);
      if (e.key === 'ArrowRight')  navigate(1);
    }
  });

  document.addEventListener('click', e => {
    const thumb = e.target.closest('[data-lightbox]');
    if (!thumb) return;
    const projId = thumb.getAttribute('data-lightbox');
    const index  = parseInt(thumb.getAttribute('data-index'), 10);
    const allThumbs = [...document.querySelectorAll(`[data-lightbox="${projId}"]`)];
    const images = allThumbs.map(el => el.querySelector('img')?.src || el.src || '');
    showLightbox(images.filter(Boolean), index);
  });
}
