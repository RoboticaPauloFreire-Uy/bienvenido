/**
 * =============================================================
 * GDRIVE_VIEWER.JS — PANEL CENTRADO DE GOOGLE DRIVE
 * Carpetas: Dibujos | Proyectos PDF | Proyecto (Scratch Jr + MakeCode)
 * =============================================================
 */

(function () {
  // Grados con acceso a Scratch Jr (dentro de la carpeta Proyecto)
  var SCRATCH_GRADES = ['sala5', 'grado1'];

  // Mapeo gradeId → subcarpeta de Google Drive (para Proyectos PDF)
  function getGradeFolderKey(gradeId) {
    var map = {
      'sala5': '5años', 'grado1': '1ero', 'grado2': '2do',
      'grado3': '3ero', 'grado4': '4to', 'grado5': '5to', 'grado6': '6to'
    };
    return map[gradeId] || '5años';
  }

  function hasScratchJr(gradeId) {
    return SCRATCH_GRADES.indexOf(gradeId) !== -1;
  }

  // Extensiones por tipo
  var SCRATCH_EXTS  = ['.sb3', '.sjr', '.pjson', '.sb'];
  var MAKECODE_EXTS = ['.hex', '.uf2', '.js', '.json', '.mkcd'];

  function extOf(name) {
    var m = name.match(/(\.[^.]+)$/);
    return m ? m[1].toLowerCase() : '';
  }

  function isScratchFile(name) { return SCRATCH_EXTS.indexOf(extOf(name)) !== -1; }
  function isMakecodeFile(name) { return MAKECODE_EXTS.indexOf(extOf(name)) !== -1; }

  // Estado
  const FOLDER_CONTENTS = {
    dibujos:   { name: '🎨 Dibujos',           icon: 'fa-paint-brush',    items: [] },
    proyectos: { name: '🚀 Proyectos del Grado', icon: 'fa-project-diagram', items: [] },
    proyecto:  { name: '📁 Proyecto',            icon: 'fa-folder-open',    items: [] }
  };

  let activeFolderKey        = 'dibujos';
  let proyectoSubTab         = 'scratch';   // 'scratch' | 'makecode'
  let hasFetchedDriveFiles   = false;
  let hasFetchedProjectFiles = false;
  let hasFetchedProyectoFiles= false;
  let isLoadingDriveFiles    = false;
  let isLoadingProjectFiles  = false;
  let isLoadingProyectoFiles = false;
  let isUploadingFile        = false;
  let currentCarouselIndex   = 0;
  let carouselAutoPlayTimer  = null;

  function formatFileSize(bytes) {
    if (!bytes || bytes <= 0) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  function getDrawingImageUrl(item) {
    if (!item) return '';
    if (item.url && item.url.startsWith('data:')) return item.url;
    if (item.id) return 'https://drive.google.com/thumbnail?id=' + item.id + '&sz=w800';
    return item.url || '';
  }

  function getDownloadUrl(item) {
    if (item.downloadUrl) return item.downloadUrl;
    if (item.id) return 'https://drive.google.com/uc?export=download&id=' + item.id;
    return item.url || '#';
  }

  // ──────────────────────────────────────────────────
  // FETCH: Dibujos (subfolder=dibujo)
  // ──────────────────────────────────────────────────
  function fetchRealDriveFiles(student, containerId) {
    var hook = student.webhookUrl || window.GOOGLE_DRIVE_WEBHOOK_URL;
    if (!hook || isLoadingDriveFiles) return;
    isLoadingDriveFiles = true;
    renderGDriveDashboard(containerId);
    fetch(hook + '?action=list&folderId=' + student.driveFolderId + '&subfolder=dibujo')
      .then(function(r){ return r.json(); })
      .then(function(data){
        isLoadingDriveFiles = false; hasFetchedDriveFiles = true;
        if (data && Array.isArray(data.files)) {
          // Filtrar para que solo entren imágenes / dibujos (excluir proyectos .sjr, .sb3, .hex)
          var drawingFilesOnly = data.files.filter(function(f){
            return !isScratchFile(f.name) && !isMakecodeFile(f.name) && f.type !== 'pdf';
          });
          var remote = drawingFilesOnly.map(function(f){
            return { id:f.id, name:f.name, title:f.title||f.name.replace(/\.[^.]+$/,''),
              type:'image', size:f.size||'—', date:f.date||'—',
              url: f.id ? 'https://drive.google.com/thumbnail?id='+f.id+'&sz=w800' : f.url,
              downloadUrl: f.downloadUrl||'' };
          });
          var pending = (FOLDER_CONTENTS.dibujos.items||[]).filter(function(l){
            return l.isLocalPending && !remote.some(function(r){ return r.name===l.name; });
          });
          var combined = pending.concat(remote);
          var unique = [];
          var seen = {};
          combined.forEach(function(it){
            if (!seen[it.name]) { seen[it.name] = true; unique.push(it); }
          });
          FOLDER_CONTENTS.dibujos.items = unique;
        }
        renderGDriveDashboard(containerId);
      })
      .catch(function(){ isLoadingDriveFiles=false; hasFetchedDriveFiles=true; renderGDriveDashboard(containerId); });
  }

  // ──────────────────────────────────────────────────
  // FETCH: Proyectos PDF (carpeta compartida por grado)
  // ──────────────────────────────────────────────────
  function fetchProjectsDriveFiles(student, containerId) {
    var hook = student.webhookUrl || window.GOOGLE_DRIVE_WEBHOOK_URL;
    var fid  = window.PROJECTS_DRIVE_FOLDER_ID || '1cpI7C-tkjb6Wm1B_GpqZuryPl4SWNVAG';
    if (!hook || isLoadingProjectFiles) return;
    isLoadingProjectFiles = true;
    renderGDriveDashboard(containerId);
    var grade = getGradeFolderKey(student.gradeId);
    fetch(hook + '?action=list&folderId=' + fid + '&subfolder=' + encodeURIComponent(grade))
      .then(function(r){ return r.json(); })
      .then(function(data){
        isLoadingProjectFiles = false; hasFetchedProjectFiles = true;
        if (data && Array.isArray(data.files)) {
          FOLDER_CONTENTS.proyectos.items = data.files.map(function(f){
            return { id:f.id, name:f.name, title:f.title||f.name.replace(/\.[^.]+$/,''),
              type:'pdf', size:f.size||'—', date:f.date||'—',
              url: f.id ? 'https://drive.google.com/file/d/'+f.id+'/preview' : (f.downloadUrl||f.url),
              downloadUrl: f.id ? 'https://drive.google.com/uc?export=download&id='+f.id : f.downloadUrl };
          });
        }
        renderGDriveDashboard(containerId);
      })
      .catch(function(){ isLoadingProjectFiles=false; hasFetchedProjectFiles=true; renderGDriveDashboard(containerId); });
  }

  // ──────────────────────────────────────────────────
  // FETCH: Proyecto del alumno (subfolder=proyecto)
  // Trae y filtra ÚNICAMENTE archivos válidos de proyecto (Scratch Jr o MakeCode)
  // ──────────────────────────────────────────────────
  function fetchProyectoFiles(student, containerId) {
    var hook = student.webhookUrl || window.GOOGLE_DRIVE_WEBHOOK_URL;
    if (!hook || isLoadingProyectoFiles) return;
    isLoadingProyectoFiles = true;
    renderGDriveDashboard(containerId);
    fetch(hook + '?action=list&folderId=' + student.driveFolderId + '&subfolder=proyecto')
      .then(function(r){ return r.json(); })
      .then(function(data){
        isLoadingProyectoFiles = false; hasFetchedProyectoFiles = true;
        if (data && Array.isArray(data.files)) {
          // Filtrar EXCLUSIVAMENTE archivos que sean de Scratch Jr (.sb3, .sjr, .pjson, .sb) o MakeCode (.hex, .uf2, .js, .json, .mkcd)
          var projectFilesOnly = data.files.filter(function(f){
            return isScratchFile(f.name) || isMakecodeFile(f.name) || f.type==='scratch' || f.type==='makecode';
          });
          var remote = projectFilesOnly.map(function(f){
            return { id:f.id, name:f.name, title:f.title||f.name.replace(/\.[^.]+$/,''),
              size:f.size||'—', date:f.date||'—',
              type: isScratchFile(f.name) ? 'scratch' : (isMakecodeFile(f.name) ? 'makecode' : 'file'),
              url: f.downloadUrl||(f.id?'https://drive.google.com/uc?export=download&id='+f.id:''),
              downloadUrl: f.downloadUrl||(f.id?'https://drive.google.com/uc?export=download&id='+f.id:'') };
          });
          var pending = (FOLDER_CONTENTS.proyecto.items||[]).filter(function(l){
            return l.isLocalPending && !remote.some(function(r){ return r.name===l.name; });
          });
          var combined = pending.concat(remote);
          var unique = [];
          var seen = {};
          combined.forEach(function(it){
            if (!seen[it.name]) { seen[it.name] = true; unique.push(it); }
          });
          FOLDER_CONTENTS.proyecto.items = unique;
        }
        renderGDriveDashboard(containerId);
      })
      .catch(function(){ isLoadingProyectoFiles=false; hasFetchedProyectoFiles=true; renderGDriveDashboard(containerId); });
  }

  // ──────────────────────────────────────────────────
  // RENDER PRINCIPAL
  // ──────────────────────────────────────────────────
  function renderGDriveDashboard(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;
    var student = window.getActiveStudent ? window.getActiveStudent() : null;
    if (!student) { container.innerHTML = ''; return; }

    // Disparar fetches
    if (!hasFetchedDriveFiles && !isLoadingDriveFiles) fetchRealDriveFiles(student, containerId);
    if (!hasFetchedProjectFiles && !isLoadingProjectFiles) fetchProjectsDriveFiles(student, containerId);
    if (!hasFetchedProyectoFiles && !isLoadingProyectoFiles) fetchProyectoFiles(student, containerId);

    var gradeFolder  = getGradeFolderKey(student.gradeId);
    var showScratch  = hasScratchJr(student.gradeId);
    var currentFolder = FOLDER_CONTENTS[activeFolderKey] || FOLDER_CONTENTS.dibujos;
    var driveTargetUrl = student.driveUrl || (student.driveFolderId ? 'https://drive.google.com/drive/folders/' + student.driveFolderId : '');

    // Si la pestaña activa es Scratch pero el grado no tiene acceso, cambiar a MakeCode
    if (activeFolderKey === 'proyecto' && proyectoSubTab === 'scratch' && !showScratch) {
      proyectoSubTab = 'makecode';
    }

    // Badges y conteos
    var validProyectoFiles = (FOLDER_CONTENTS.proyecto.items || []).filter(function(f){
      return isScratchFile(f.name) || isMakecodeFile(f.name) || f.type==='scratch' || f.type==='makecode';
    });

    var badgeDibujos   = isLoadingDriveFiles ? '<i class="fas fa-spinner fa-spin"></i>' : FOLDER_CONTENTS.dibujos.items.length;
    var badgeProyectos = isLoadingProjectFiles ? '<i class="fas fa-spinner fa-spin"></i>' : FOLDER_CONTENTS.proyectos.items.length;
    var badgeProyecto  = isLoadingProyectoFiles ? '<i class="fas fa-spinner fa-spin"></i>' : validProyectoFiles.length;

    // ── Filtros por subtab ──
    var scratchItems   = validProyectoFiles.filter(function(f){ return isScratchFile(f.name) || f.type==='scratch'; }).slice(0, 10);
    var makecodeItems  = validProyectoFiles.filter(function(f){ return isMakecodeFile(f.name) || f.type==='makecode'; }).slice(0, 10);

    // countText barra
    var countText = '';
    if (activeFolderKey === 'dibujos')   countText = isLoadingDriveFiles ? '<i class="fas fa-sync-alt fa-spin"></i> Conectando...' : FOLDER_CONTENTS.dibujos.items.length + ' dibujo(s)';
    else if (activeFolderKey === 'proyectos') countText = isLoadingProjectFiles ? '<i class="fas fa-sync-alt fa-spin"></i> Buscando...' : FOLDER_CONTENTS.proyectos.items.length + ' proyecto(s) PDF';
    else if (activeFolderKey === 'proyecto') {
      if (isLoadingProyectoFiles) {
        countText = '<i class="fas fa-sync-alt fa-spin"></i> Cargando...';
      } else {
        countText = (proyectoSubTab === 'scratch' ? scratchItems.length + ' proyecto(s) Scratch Jr' : makecodeItems.length + ' proyecto(s) MakeCode');
      }
    }

    // ──────────────────────────────────────────────────
    // HTML por carpeta
    // ──────────────────────────────────────────────────
    var mainDisplayHtml = '';
    var uploadZoneHtml  = '';
    var displayItems; // solo para dibujos

    // ═══ CARPETA: PROYECTOS PDF ═══
    if (activeFolderKey === 'proyectos') {
      if (isLoadingProjectFiles && FOLDER_CONTENTS.proyectos.items.length === 0) {
        mainDisplayHtml = loadingHtml('Cargando proyectos de Google Drive...', 'Buscando guías PDF para <strong>' + gradeFolder + '</strong>', '#2563EB');
      } else if (!isLoadingProjectFiles && FOLDER_CONTENTS.proyectos.items.length === 0) {
        mainDisplayHtml = emptyHtml('📂', 'Sin proyectos en ' + gradeFolder, 'Los proyectos que suba el docente aparecerán aquí.');
      } else {
        mainDisplayHtml = '<div class="gdb-pdf-grid">' +
          FOLDER_CONTENTS.proyectos.items.slice(0, 10).map(function(item){
            return pdfCard(item, gradeFolder);
          }).join('') + '</div>';
      }

    // ═══ CARPETA: PROYECTO DEL ALUMNO (Scratch Jr + MakeCode) ═══
    } else if (activeFolderKey === 'proyecto') {

      // Pestañas de navegación
      var tabsHtml =
        '<div class="proyecto-tabs">' +
          (showScratch ?
            '<button class="ptab ' + (proyectoSubTab==='scratch' ? 'active' : '') + '" data-subtab="scratch">' +
              '<span class="ptab-icon">🐱</span> Scratch Jr' +
            '</button>' : '') +
          '<button class="ptab ' + (proyectoSubTab==='makecode' ? 'active' : '') + '" data-subtab="makecode">' +
            '<span class="ptab-icon">💻</span> MakeCode' +
          '</button>' +
        '</div>';

      // ── Pestaña SCRATCH JR ──
      if (proyectoSubTab === 'scratch') {
        var isLoading = isLoadingProyectoFiles && scratchItems.length === 0;
        if (isLoading) {
          tabContent = loadingHtml('Cargando proyectos Scratch Jr...', 'Buscando en tu carpeta', '#EA580C');
        } else if (scratchItems.length === 0) {
          tabContent = emptyHtml('🐱', '¡Aún no hay proyectos Scratch Jr!', 'Subí tu archivo <strong>.sb3</strong> o <strong>.sjr</strong> desde abajo.');
        } else {
          tabContent = '<div class="scratch-files-grid">' +
            scratchItems.map(function(item, idx){
              var dlUrl = getDownloadUrl(item);
              return '<div class="scratch-file-card">' +
                '<div class="sfc-icon-wrap"><span class="sfc-icon">🐱</span><span class="sfc-num">#' + (idx+1) + '</span></div>' +
                '<div class="sfc-body">' +
                  '<h4 class="sfc-title">' + (item.title||item.name) + '</h4>' +
                  '<div class="sfc-meta"><span><i class="far fa-clock"></i> ' + item.date + '</span><span><i class="fas fa-hdd"></i> ' + item.size + '</span></div>' +
                '</div>' +
                '<div class="sfc-actions">' +
                  (dlUrl && dlUrl !== '#'
                    ? '<a class="sfc-btn-download" href="' + dlUrl + '" target="_blank" rel="noopener noreferrer"><i class="fas fa-download"></i> Descargar</a>'
                    : '<span class="sfc-btn-disabled"><i class="fas fa-download"></i> Sin link</span>') +
                '</div>' +
              '</div>';
            }).join('') + '</div>';
        }
        // MakeCode y Scratch Jr no tienen caja estática permanente

      // ── Pestaña MAKECODE — Biblioteca de código (solo lectura) ──
      } else {
        var mkLibrary = (window.MAKECODE_LIBRARY && window.MAKECODE_LIBRARY[student.gradeId]) || [];

        if (mkLibrary.length === 0) {
          tabContent = '<div class="gdb-empty-state">' +
            '<div class="ges-icon">💻</div>' +
            '<h4>Biblioteca MakeCode vacía</h4>' +
            '<p>El docente todavía no agregó códigos para <strong>' + student.gradeName + '</strong>.<br>' +
            'Los códigos se configuran en el archivo <code>js/data.js</code> → sección <code>MAKECODE_LIBRARY</code>.</p>' +
          '</div>';
        } else {
          tabContent = '<div class="mklib-grid">' +
            mkLibrary.map(function(entry, idx) {
              var mkInfo = extractMakecodeInfo(entry.shareUrl);
              return '<div class="mklib-card">' +
                '<div class="mklib-card-header">' +
                  '<div class="mklib-icon-wrap"><span class="mklib-num">' + (idx+1) + '</span><i class="fas fa-microchip mklib-chip-icon"></i></div>' +
                  '<div class="mklib-info">' +
                    '<h4 class="mklib-title">' + (entry.title || 'Código MakeCode #' + (idx+1)) + '</h4>' +
                    (entry.description ? '<p class="mklib-desc">' + entry.description + '</p>' : '') +
                  '</div>' +
                  '<span class="mklib-badge"><i class="fas fa-lock"></i> Solo lectura</span>' +
                '</div>' +
                (mkInfo
                  ? '<div class="mklib-split-view">' +
                      '<!-- Panel Izquierdo: Simulador Interactivo Micro:bit -->' +
                      '<div class="mklib-sim-pane">' +
                        '<div class="mklib-pane-header">' +
                          '<span class="mph-title"><i class="fas fa-gamepad"></i> Simulador Micro:bit</span>' +
                          '<span class="mph-badge">🎮 Interactivo</span>' +
                        '</div>' +
                        '<div class="mklib-sim-frame-wrap">' +
                          '<iframe src="' + mkInfo.simUrl + '" class="mklib-sim-iframe" sandbox="allow-scripts allow-same-origin allow-popups" scrolling="no" frameborder="0"></iframe>' +
                        '</div>' +
                      '</div>' +
                      '<!-- Panel Derecho: Bloques de Código de Solo Lectura -->' +
                      '<div class="mklib-code-pane">' +
                        '<div class="mklib-pane-header">' +
                          '<span class="mph-title"><i class="fas fa-cubes"></i> Bloques de Código</span>' +
                          '<span class="mph-badge">🧩 Solo lectura</span>' +
                        '</div>' +
                        '<div class="mklib-code-frame-wrap">' +
                          '<iframe src="' + mkInfo.codeEmbedUrl + '" class="mklib-code-iframe" sandbox="allow-scripts allow-same-origin allow-popups" scrolling="no" frameborder="0" allowfullscreen loading="lazy"></iframe>' +
                        '</div>' +
                      '</div>' +
                    '</div>'
                  : '<div class="mklib-no-embed"><i class="fas fa-exclamation-triangle"></i> Link no válido: ' + (entry.shareUrl || 'vacío') + '</div>') +
                '<div class="mklib-card-footer">' +
                  '<a class="mklib-btn-view" href="' + (entry.shareUrl||'#') + '" target="_blank" rel="noopener noreferrer">' +
                    '<i class="fas fa-external-link-alt"></i> Abrir en MakeCode' +
                  '</a>' +
                  '<span class="mklib-readonly-label"><i class="fas fa-shield-alt"></i> Simulador interactivo + Bloques de código (sin edición)</span>' +
                '</div>' +
              '</div>';
            }).join('') +
          '</div>';
        }
        // MakeCode no tiene zona de subida — es solo lectura
        uploadZoneHtml = '';
      }

      mainDisplayHtml = tabsHtml + tabContent;


    // ═══ CARPETA: DIBUJOS (Carrusel) ═══
    } else {
      displayItems = FOLDER_CONTENTS.dibujos.items.slice(0, 5);
      if (currentCarouselIndex >= displayItems.length) currentCarouselIndex = Math.max(0, displayItems.length - 1);

      if (isLoadingDriveFiles && displayItems.length === 0) {
        mainDisplayHtml = loadingHtml('Cargando tus dibujos de Google Drive...', 'Buscando creaciones guardadas en tu carpeta', '#16A34A');
      } else if (!isLoadingDriveFiles && displayItems.length === 0) {
        mainDisplayHtml = emptyHtml('🎨', 'Aún no hay dibujos', '¡Arrastrá tu primer dibujo abajo para guardarlo!');
      } else {
        mainDisplayHtml = buildCarousel(displayItems);
      }
    }

    // ──────────────────────────────────────────────────
    // SUBIDA INTELIGENTE: Sin caja fija en pantalla
    // Solo aparece la zona activa al arrastrar un archivo o con el botón
    // ──────────────────────────────────────────────────
    var canUpload = (activeFolderKey === 'dibujos') || (activeFolderKey === 'proyecto' && proyectoSubTab === 'scratch' && showScratch);
    var uploadAccept = activeFolderKey === 'dibujos' ? 'image/*' : '.sb3,.sjr,.pjson,.sb';
    var uploadBtnText = activeFolderKey === 'dibujos' ? '<i class="fas fa-plus-circle"></i> Subir dibujo' : '<i class="fas fa-plus-circle"></i> Subir Scratch Jr';
    var uploadBtnClass = activeFolderKey === 'dibujos' ? 'gca-btn-upload' : 'gca-btn-upload scratch';

    if (canUpload) {
      uploadZoneHtml =
        '<input type="file" id="gdz-file-input" class="gdz-input" accept="' + uploadAccept + '" style="display:none;">' +
        '<div class="gdb-drag-overlay" id="gdb-drag-overlay">' +
          '<div class="gdo-card">' +
            '<div class="gdo-icon"><i class="fas fa-cloud-upload-alt"></i></div>' +
            '<h3>¡Soltá tu archivo aquí para cargarlo!</h3>' +
            '<p>' + (activeFolderKey === 'dibujos' ? 'Se guardará en tu subcarpeta <strong>dibujo</strong>' : 'Se guardará en tu subcarpeta <strong>proyecto</strong>') + '</p>' +
          '</div>' +
        '</div>' +
        '<div class="gdb-upload-status-toast hidden" id="gdb-upload-status-toast"></div>';
    } else {
      uploadZoneHtml = '';
    }

    // ──────────────────────────────────────────────────
    // HTML COMPLETO DEL PANEL
    // ──────────────────────────────────────────────────
    container.innerHTML =
      '<section class="gdrive-dashboard-centered" id="student-drive-dashboard">' +
        '<div class="gdb-header">' +
          '<div class="gdb-header-left">' +
            '<span class="gdb-avatar">' + (student.avatar||'👦') + '</span>' +
            '<div>' +
              '<h2 class="gdb-title">' + student.name + '</h2>' +
              '<span class="gdb-grade"><i class="fab fa-google-drive"></i> ' + student.gradeName + ' • Conectado</span>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="gdb-main-layout">' +

          // ÁRBOL
          '<aside class="gdb-tree-sidebar">' +
            '<div class="gts-title"><i class="fas fa-sitemap"></i> Carpetas de ' + student.name.split(' ')[0] + '</div>' +
            '<div class="gts-tree">' +
              treeFolder('dibujos', '🎨 Dibujos', badgeDibujos, activeFolderKey, '#16A34A') +
              treeFolder('proyectos', '🚀 Proyectos (' + gradeFolder + ')', badgeProyectos, activeFolderKey, '#2563EB') +
              treeFolder('proyecto', '📁 Proyecto', badgeProyecto, activeFolderKey, '#7C3AED') +
            '</div>' +
            (driveTargetUrl ?
              '<div class="gts-qr-card">' +
                '<div class="gts-qr-header">' +
                  '<i class="fab fa-google-drive"></i>' +
                  '<span>Abrir en el celular</span>' +
                '</div>' +
                '<a href="' + driveTargetUrl + '" target="_blank" rel="noopener noreferrer" class="gts-qr-link" title="Hacé click o escaneá para abrir en Google Drive">' +
                  '<img src="https://api.qrserver.com/v1/create-qr-code/?size=130x130&margin=3&data=' + encodeURIComponent(driveTargetUrl) + '" alt="QR Google Drive" class="gts-qr-img" loading="lazy">' +
                '</a>' +
                '<span class="gts-qr-caption"><i class="fas fa-qrcode"></i> Escaneá con la cámara de tu celular</span>' +
              '</div>' : '') +
            '<div class="gts-footer-info">' +
              '<i class="fas fa-info-circle"></i> En <strong>📁 Proyecto</strong> podés guardar proyectos Scratch Jr y MakeCode.' +
            '</div>' +
          '</aside>' +

          // CONTENIDO
          '<main class="gdb-content-area">' +
            '<div class="gca-folder-bar">' +
              '<div class="gca-fb-title">' +
                '<i class="fas ' + currentFolder.icon + '"></i>' +
                '<span>Contenido de: <strong>' +
                  (activeFolderKey === 'proyectos' ? 'Proyectos PDF (' + gradeFolder + ')' :
                   activeFolderKey === 'proyecto'  ? 'Proyecto' : currentFolder.name) +
                '</strong></span>' +
              '</div>' +
              '<div class="gca-fb-right">' +
                '<span class="gca-fb-count">' + countText + '</span>' +
                (canUpload ? '<button type="button" class="' + uploadBtnClass + '" id="gca-btn-upload">' + uploadBtnText + '</button>' : '') +
              '</div>' +
            '</div>' +
            mainDisplayHtml +
            uploadZoneHtml +
          '</main>' +
        '</div>' +
      '</section>';

    // ── Eventos del árbol ──
    container.querySelectorAll('.gts-folder').forEach(function(el){
      el.onclick = function(){
        if (window.sounds) window.sounds.playClick();
        activeFolderKey = el.dataset.folder;
        currentCarouselIndex = 0;
        renderGDriveDashboard(containerId);
      };
    });

    // ── Pestañas de Proyecto ──
    container.querySelectorAll('.ptab').forEach(function(btn){
      btn.onclick = function(){
        if (window.sounds) window.sounds.playClick();
        proyectoSubTab = btn.dataset.subtab;
        renderGDriveDashboard(containerId);
      };
    });

    // ── Carrusel (dibujos) ──
    if (activeFolderKey === 'dibujos') {
      initCarouselControls(container, displayItems ? displayItems.length : 0);
      container.querySelectorAll('.gdb-carousel-slide').forEach(function(slide){
        slide.onclick = function(e){
          if (e.target.closest('.gcs-download-btn')) return;
          openImageModal(slide.dataset.imgUrl, slide.dataset.imgTitle);
        };
      });
      initDropzone(container, student, 'dibujo', 'image/*', containerId, false);
    }

    // ── Upload zona proyecto (solo Scratch Jr, MakeCode no tiene upload) ──
    if (activeFolderKey === 'proyecto' && proyectoSubTab === 'scratch' && showScratch) {
      initDropzone(container, student, 'proyecto', '.sb3,.sjr,.pjson,.sb', containerId, true, 'scratch');
    }

    // ── PDFs ──
    container.querySelectorAll('.ppc-btn-view').forEach(function(btn){
      btn.onclick = function(e){ e.stopPropagation(); openPdfModal(btn.dataset.pdfUrl, btn.dataset.pdfTitle); };
    });
  }

  // ──────────────────────────────────────────────────
  // EXTRAE información de MakeCode y genera URLs de Simulador + Bloques
  // Soporta: microbit.org, arcade.makecode.com, makecode.com genérico
  // ──────────────────────────────────────────────────
  function extractMakecodeInfo(shareUrl) {
    if (!shareUrl) return null;
    shareUrl = shareUrl.trim();

    // Extraer base según dominio
    var base = null;
    if (/makecode\.microbit\.org/.test(shareUrl)) {
      base = 'https://makecode.microbit.org';
    } else if (/arcade\.makecode\.com/.test(shareUrl)) {
      base = 'https://arcade.makecode.com';
    } else if (/makecode\.com/.test(shareUrl)) {
      base = 'https://makecode.com';
    } else {
      return null;
    }

    var shareId = null;
    // Formato: #pub:ID
    var m = shareUrl.match(/#pub:([A-Za-z0-9_-]+)/);
    if (m) { shareId = m[1]; }

    // Formato: /---run o /---codeembed
    if (!shareId) {
      m = shareUrl.match(/---(?:run|codeembed)[#?](?:v:|pub:|id=)?([A-Za-z0-9_-]+)/);
      if (m) { shareId = m[1]; }
    }

    // Formato: dominio/ID-ID-ID (share directo)
    if (!shareId) {
      m = shareUrl.match(/makecode[^/]*\.(?:org|com)\/([A-Za-z0-9][-A-Za-z0-9_]{5,})/);
      if (m && !m[1].startsWith('---')) { shareId = m[1]; }
    }

    if (!shareId) return null;

    return {
      base: base,
      shareId: shareId,
      codeEmbedUrl: base + '/---codeembed#pub:' + shareId,
      simUrl: base + '/---run?id=' + shareId + '&nofooter=1'
    };
  }

  // ──────────────────────────────────────────────────
  // HELPERS HTML
  // ──────────────────────────────────────────────────
  function loadingHtml(title, sub, color) {
    return '<div class="gdb-loading-state">' +
      '<div class="gls-spinner" style="color:' + (color||'#16A34A') + ';"><i class="fas fa-circle-notch fa-spin"></i></div>' +
      '<h4>' + title + '</h4><p>' + sub + '</p></div>';
  }
  function emptyHtml(icon, title, sub) {
    return '<div class="gdb-empty-state"><div class="ges-icon">' + icon + '</div><h4>' + title + '</h4><p>' + sub + '</p></div>';
  }
  function treeFolder(key, label, badge, active, color) {
    return '<div class="gts-folder ' + (active===key?'active':'') + '" data-folder="' + key + '">' +
      '<i class="fas fa-folder folder-icon" style="color:' + color + ';"></i>' +
      '<span class="gts-folder-name">' + label + '</span>' +
      '<span class="gts-badge" style="background:' + color + '22;color:' + color + ';">' + badge + '</span>' +
    '</div>';
  }
  function pdfCard(item, gradeFolder) {
    var dlUrl = getDownloadUrl(item);
    return '<div class="pdf-project-card">' +
      '<div class="ppc-header">' +
        '<div class="ppc-icon"><i class="fas fa-file-pdf"></i></div>' +
        '<div><span class="ppc-badge">📂 ' + gradeFolder + '</span>' +
        '<h4 class="ppc-title">' + item.title + '</h4></div>' +
      '</div>' +
      '<p class="ppc-desc">' + (item.desc||'Guía PDF del grado') + '</p>' +
      '<div class="ppc-footer">' +
        '<div class="ppc-meta"><span><i class="far fa-clock"></i> ' + item.date + '</span> • <span>' + item.size + '</span></div>' +
        '<div class="ppc-actions">' +
          '<button class="ppc-btn-view" type="button" data-pdf-url="' + item.url + '" data-pdf-title="' + item.title + '">' +
            '<i class="fas fa-eye"></i> Ver PDF</button>' +
          (dlUrl ? '<a class="ppc-btn-download" href="' + dlUrl + '" target="_blank" rel="noopener noreferrer">' +
            '<i class="fas fa-download"></i> Descargar</a>' : '') +
        '</div>' +
      '</div>' +
    '</div>';
  }
  function buildCarousel(displayItems) {
    return '<div class="gdb-carousel-wrapper">' +
      '<div class="gdb-carousel-container">' +
        (displayItems.length>1 ? '<button class="gdb-car-btn gdb-car-prev" id="gdb-car-prev" type="button"><i class="fas fa-chevron-left"></i></button>' : '') +
        '<div class="gdb-carousel-viewport"><div class="gdb-carousel-track" id="gdb-carousel-track">' +
          displayItems.map(function(item, idx){
            var imgSrc = getDrawingImageUrl(item);
            var title  = item.title || item.name;
            var dlUrl  = getDownloadUrl(item);
            return '<div class="gdb-carousel-slide" data-img-url="' + imgSrc + '" data-img-title="' + title + '">' +
              '<div class="gcs-image-wrap">' +
                '<img src="' + imgSrc + '" alt="' + item.name + '" loading="lazy" referrerpolicy="no-referrer">' +
                '<div class="gcs-overlay"><i class="fas fa-search-plus"></i><span>Ver en grande</span></div>' +
              '</div>' +
              '<div class="gcs-info">' +
                '<span class="gcs-tag">✨ Dibujo #' + (idx+1) + '</span>' +
                '<h4 class="gcs-title">' + title + '</h4>' +
                '<div class="gcs-meta"><span><i class="far fa-clock"></i> ' + item.date + '</span><span><i class="fas fa-hdd"></i> ' + item.size + '</span></div>' +
                (dlUrl && dlUrl!=='#' ? '<a class="gcs-download-btn" href="' + dlUrl + '" target="_blank" rel="noopener noreferrer"><i class="fas fa-download"></i> Descargar</a>' : '') +
              '</div>' +
            '</div>';
          }).join('') +
        '</div></div>' +
        (displayItems.length>1 ? '<button class="gdb-car-btn gdb-car-next" id="gdb-car-next" type="button"><i class="fas fa-chevron-right"></i></button>' : '') +
      '</div>' +
      (displayItems.length>1 ? '<div class="gdb-carousel-dots" id="gdb-carousel-dots">' +
        displayItems.map(function(_,i){ return '<span class="gdb-dot '+(i===currentCarouselIndex?'active':'')+'" data-index="'+i+'"></span>'; }).join('') +
      '</div>' : '') +
    '</div>';
  }

  // ──────────────────────────────────────────────────
  // CARRUSEL AUTO-PLAY
  // ──────────────────────────────────────────────────
  function initCarouselControls(container, totalSlides) {
    if (carouselAutoPlayTimer) { clearInterval(carouselAutoPlayTimer); carouselAutoPlayTimer = null; }
    if (totalSlides <= 1) return;
    var track   = container.querySelector('#gdb-carousel-track');
    var prevBtn = container.querySelector('#gdb-car-prev');
    var nextBtn = container.querySelector('#gdb-car-next');
    var dots    = container.querySelectorAll('.gdb-dot');
    var wrapper = container.querySelector('.gdb-carousel-wrapper');

    function go(){ if (track) track.style.transform='translateX(-'+(currentCarouselIndex*100)+'%)'; dots.forEach(function(d,i){ d.classList.toggle('active',i===currentCarouselIndex); }); }
    function next(){ currentCarouselIndex=(currentCarouselIndex+1)%totalSlides; go(); }
    function prev(){ currentCarouselIndex=(currentCarouselIndex-1+totalSlides)%totalSlides; go(); }
    function start(){ stop(); carouselAutoPlayTimer=setInterval(next,3500); }
    function stop() { if (carouselAutoPlayTimer){ clearInterval(carouselAutoPlayTimer); carouselAutoPlayTimer=null; } }

    if (prevBtn) prevBtn.onclick = function(e){ e.stopPropagation(); prev(); start(); };
    if (nextBtn) nextBtn.onclick = function(e){ e.stopPropagation(); next(); start(); };
    dots.forEach(function(d){ d.onclick=function(e){ e.stopPropagation(); currentCarouselIndex=+d.dataset.index; go(); start(); }; });
    if (wrapper){ wrapper.onmouseenter=stop; wrapper.onmouseleave=start; }
    go(); start();
  }

  // ──────────────────────────────────────────────────
  // VISOR PDF
  // ──────────────────────────────────────────────────
  function openPdfModal(pdfUrl, title) {
    if (window.sounds) window.sounds.playClick();
    var modal = document.getElementById('pdf-viewer-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'pdf-viewer-modal'; modal.className = 'student-login-modal';
      modal.innerHTML = '<div class="slm-content" style="max-width:850px;width:92vw;"><div class="slm-header" style="background:#DC2626;"><div class="slm-title" id="pvm-title" style="color:#FFF;"></div><button class="slm-close" onclick="document.getElementById(\'pdf-viewer-modal\').classList.remove(\'active\')">&times;</button></div><div class="slm-body" style="padding:16px;"><div style="margin-bottom:10px;font-weight:800;color:#1E293B;" id="pvm-subtitle"></div><div style="height:68vh;border-radius:12px;overflow:hidden;border:1.5px solid #CBD5E1;"><iframe id="pvm-iframe" src="" style="width:100%;height:100%;border:none;"></iframe></div></div></div>';
      document.body.appendChild(modal);
      modal.onclick = function(e){ if (e.target===modal) modal.classList.remove('active'); };
    }
    document.getElementById('pvm-title').innerHTML = '<i class="fas fa-file-pdf"></i> ' + title;
    document.getElementById('pvm-subtitle').textContent = title;
    document.getElementById('pvm-iframe').src = pdfUrl;
    modal.classList.add('active');
  }

  // ──────────────────────────────────────────────────
  // LIGHTBOX IMAGEN
  // ──────────────────────────────────────────────────
  function openImageModal(imgUrl, title) {
    if (window.sounds) window.sounds.playClick();
    var modal = document.getElementById('image-lightbox-modal');
    if (!modal) {
      modal = document.createElement('div'); modal.id='image-lightbox-modal'; modal.className='student-login-modal';
      modal.innerHTML = '<div class="slm-content" style="max-width:720px;"><div class="slm-header"><div class="slm-title" id="ilm-title">Visor de Dibujo</div><button class="slm-close" onclick="document.getElementById(\'image-lightbox-modal\').classList.remove(\'active\')">&times;</button></div><div class="slm-body" style="text-align:center;padding:16px;"><img id="ilm-img" src="" alt="Dibujo" style="max-width:100%;max-height:70vh;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.2);" referrerpolicy="no-referrer"></div></div>';
      document.body.appendChild(modal);
      modal.onclick = function(e){ if (e.target===modal) modal.classList.remove('active'); };
    }
    document.getElementById('ilm-title').textContent = title;
    document.getElementById('ilm-img').src = imgUrl;
    modal.classList.add('active');
  }

  // ──────────────────────────────────────────────────
  // DRAG & DROP / SUBIDA
  // subfolder: 'dibujo' | 'proyecto'
  // fileType:  'image' | 'scratch' | 'makecode'
  // ──────────────────────────────────────────────────
  function initDropzone(container, student, subfolder, accept, containerId, isProyecto, fileType) {
    var contentArea = container.querySelector('.gdb-content-area');
    var overlay     = container.querySelector('#gdb-drag-overlay');
    var fileInput   = container.querySelector('#gdz-file-input');
    var uploadBtn   = container.querySelector('#gca-btn-upload');
    var statusToast = container.querySelector('#gdb-upload-status-toast');
    if (!contentArea || !fileInput) return;

    if (uploadBtn) {
      uploadBtn.onclick = function(e) {
        e.stopPropagation();
        fileInput.click();
      };
    }

    fileInput.onchange = function() {
      if (fileInput.files && fileInput.files.length > 0) {
        go(fileInput.files[0]);
      }
    };

    var dragCounter = 0;

    contentArea.addEventListener('dragenter', function(e) {
      e.preventDefault();
      e.stopPropagation();
      dragCounter++;
      if (overlay) overlay.classList.add('drag-over');
    }, false);

    contentArea.addEventListener('dragover', function(e) {
      e.preventDefault();
      e.stopPropagation();
      if (overlay) overlay.classList.add('drag-over');
    }, false);

    contentArea.addEventListener('dragleave', function(e) {
      e.preventDefault();
      e.stopPropagation();
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        if (overlay) overlay.classList.remove('drag-over');
      }
    }, false);

    contentArea.addEventListener('drop', function(e) {
      e.preventDefault();
      e.stopPropagation();
      dragCounter = 0;
      if (overlay) overlay.classList.remove('drag-over');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        go(e.dataTransfer.files[0]);
      }
    }, false);

    function go(file) {
      if (isUploadingFile) return;
      isUploadingFile = true;
      if (window.sounds) window.sounds.playSuccess();
      var sz = formatFileSize(file.size);

      if (statusToast) {
        statusToast.classList.remove('hidden');
        statusToast.innerHTML =
          '<div class="gdz-auto-status">' +
            '<div class="gdz-auto-spinner"><i class="fas fa-sync-alt fa-spin"></i></div>' +
            '<div class="gdz-auto-text">' +
              '<h5>Guardando <strong>' + file.name + '</strong>...</h5>' +
              '<span>' + sz + ' • Subiendo a Google Drive</span>' +
            '</div>' +
          '</div>';
      }

      var reader = new FileReader();
      reader.onload = function(ev){
        var b64 = ev.target.result.split(',')[1];
        var hook = student.webhookUrl || window.GOOGLE_DRIVE_WEBHOOK_URL;
        if (hook) {
          var iframe = document.getElementById('gdrive_silent_upload_iframe');
          if (!iframe){ iframe=document.createElement('iframe'); iframe.name=iframe.id='gdrive_silent_upload_iframe'; iframe.style.display='none'; document.body.appendChild(iframe); }
          var form = document.createElement('form'); form.target='gdrive_silent_upload_iframe'; form.method='POST'; form.action=hook;
          var fields = { filename:file.name, mimeType:file.type||'application/octet-stream', base64:b64, folderId:student.driveFolderId||'', subfolder:subfolder };
          for (var k in fields){ var i=document.createElement('input'); i.type='hidden'; i.name=k; i.value=fields[k]; form.appendChild(i); }
          document.body.appendChild(form); form.submit(); setTimeout(function(){ form.remove(); }, 2500);
        }

        var nowStr = new Date().toLocaleDateString('es-ES');
        var type   = fileType || (isProyecto ? 'scratch' : 'image');
        var icon   = type==='scratch' ? '🐱' : type==='makecode' ? '💻' : '✨';
        var newItem = { name:file.name, title:icon+' '+file.name.replace(/\.[^.]+$/,''), size:sz, date:nowStr,
          url:ev.target.result, downloadUrl:'', isLocalPending:true };

        if (isProyecto) {
          if (!FOLDER_CONTENTS.proyecto.items.some(function(it){ return it.name===file.name; })) {
            FOLDER_CONTENTS.proyecto.items.unshift(newItem);
          }
        } else {
          if (!FOLDER_CONTENTS.dibujos.items.some(function(it){ return it.name===file.name; })) {
            FOLDER_CONTENTS.dibujos.items.unshift(newItem);
          }
          currentCarouselIndex = 0;
        }

        if (statusToast) {
          statusToast.innerHTML =
            '<div class="gdz-auto-status" style="border-color:#16A34A;background:#F0FDF4;">' +
              '<div class="gdz-auto-spinner" style="color:#16A34A;"><i class="fas fa-check-circle"></i></div>' +
              '<div class="gdz-auto-text">' +
                '<h5>¡<strong>' + file.name + '</strong> guardado!</h5>' +
                '<span>' + sz + ' • Guardado en Google Drive</span>' +
              '</div>' +
            '</div>';
        }
        setTimeout(function(){ isUploadingFile=false; renderGDriveDashboard(containerId); }, 1300);
      };
      reader.readAsDataURL(file);
    }
  }

  // Reset al cambiar de alumno
  window.addEventListener('student_session_changed', function(){
    hasFetchedDriveFiles=hasFetchedProjectFiles=hasFetchedProyectoFiles=false;
    isLoadingDriveFiles=isLoadingProjectFiles=isLoadingProyectoFiles=false;
    activeFolderKey='dibujos'; proyectoSubTab='scratch'; currentCarouselIndex=0;
    FOLDER_CONTENTS.dibujos.items=[];
    FOLDER_CONTENTS.proyectos.items=[];
    FOLDER_CONTENTS.proyecto.items=[];
    renderGDriveDashboard('student-drive-dashboard-container');
    renderGDriveDashboard('gdrive-explorer-container');
  });

  window.renderGDriveDashboard = renderGDriveDashboard;
  window.renderGDriveExplorer  = renderGDriveDashboard;
})();

