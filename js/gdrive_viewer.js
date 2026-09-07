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
  var DIBUJO_EXTS   = ['.png', '.jpg', '.jpeg', '.bmp'];
  var SCRATCH_EXTS  = ['.sb3', '.sjr', '.pjson', '.sb'];
  var MAKECODE_EXTS = ['.hex', '.uf2', '.js', '.json', '.mkcd'];

  function extOf(name) {
    var m = (name || '').match(/(\.[^.]+)$/);
    return m ? m[1].toLowerCase() : '';
  }

  function isDibujoFile(name) { return DIBUJO_EXTS.indexOf(extOf(name)) !== -1; }
  function isScratchFile(name) { return SCRATCH_EXTS.indexOf(extOf(name)) !== -1; }
  function isMakecodeFile(name) { return MAKECODE_EXTS.indexOf(extOf(name)) !== -1; }

  // Estado
  const FOLDER_CONTENTS = {
    dibujos:     { name: '🎨 Dibujos',             icon: 'fa-paint-brush',    items: [] },
    proyectos:   { name: '🚀 Proyectos del Grado', icon: 'fa-project-diagram', items: [] },
    proyecto:    { name: '📁 Proyecto',            icon: 'fa-folder-open',    items: [] },
    actividades: { name: '🏠 Actividades de casa', icon: 'fa-house-user',     items: [], generalItems: [] },
    familiar:    { name: '👨‍👩‍👧 Actividad familiar',   icon: 'fa-heart',          items: [] }
  };

  let activeFolderKey            = 'dibujos';
  let proyectoSubTab             = 'scratch';   // 'scratch' | 'makecode'
  let hasFetchedDriveFiles       = false;
  let hasFetchedProjectFiles     = false;
  let hasFetchedProyectoFiles    = false;
  let hasFetchedActividadesFiles = false;
  let isLoadingDriveFiles        = false;
  let isLoadingProjectFiles      = false;
  let isLoadingProyectoFiles     = false;
  let isLoadingActividadesFiles  = false;
  let isUploadingFile            = false;
  let currentCarouselIndex       = 0;
  let carouselAutoPlayTimer      = null;
  let isRoadmapGridMode          = false;

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
  // GUÍAS PEDAGÓGICAS DE ACTIVIDAD POR GRADO (RELACIONAR)
  // ──────────────────────────────────────────────────
  var GRADE_ACTIVITIES_INFO = {
    sala5: {
      tag: '🌱 Sala de 5 años',
      title: 'Actividad de Relacionar: Formas, Bloques & Robótica',
      desc: 'Ficha para unir con flechas y asociar personajes de Scratch Jr, iconos de movimiento y piezas de robótica inicial. Estimula la motricidad fina y la orientación espacial en familia.',
      icon: '🌱',
      themeColor: '#E65100'
    },
    grado1: {
      tag: '📖 1° Grado',
      title: 'Actividad de Relacionar: Secuencias & Bloques Visuales',
      desc: 'Reto didáctico para relacionar instrucciones paso a paso con los movimientos de los personajes. Ayuda a afianzar el pensamiento secuencial y la lateralidad.',
      icon: '📖',
      themeColor: '#1565C0'
    },
    grado2: {
      tag: '✏️ 2° Grado',
      title: 'Actividad de Relacionar: Personajes, Escenarios & Historias',
      desc: 'Asociá las acciones de los personajes con los eventos de código y bucles narrativos. Conecta la animación digital con la comprensión lectora.',
      icon: '✏️',
      themeColor: '#6A1B9A'
    },
    grado3: {
      tag: '🔢 3° Grado',
      title: 'Actividad de Relacionar: Scratch 3.0, Operadores & Lógica',
      desc: 'Relacioná bloques verdes de operadores matemáticos, sensores de colores y condiciones lógicas estructuradas.',
      icon: '🔢',
      themeColor: '#00838F'
    },
    grado4: {
      tag: '🎮 4° Grado',
      title: 'Actividad de Relacionar: MakeCode Arcade & Pixel Art',
      desc: 'Asociá sprites, coordenadas de pantalla X/Y, controles del joystick y mecánicas de videojuegos retro.',
      icon: '🎮',
      themeColor: '#E64A19'
    },
    grado5: {
      tag: '⚙️ 5° Grado',
      title: 'Actividad de Relacionar: Circuitos, Pines & Sensores micro:bit',
      desc: 'Conectá sensores analógicos, pines 0-1-2, LEDs y servomotores con su lectura lógica en código y computación física.',
      icon: '⚙️',
      themeColor: '#2E7D32'
    },
    grado6: {
      tag: '🚀 6° Grado',
      title: 'Actividad de Relacionar: Javascript, Variables & Robótica Conectada',
      desc: 'Asociá estructuras condicionales, funciones y comunicación inalámbrica por radio. Prepara la transición al código textual.',
      icon: '🚀',
      themeColor: '#C2185B'
    }
  };

  // ──────────────────────────────────────────────────
  // FETCH: Actividades Familiares (Tu Grado + General)
  // Carpeta Drive raíz: 1axzC6xBTXxhvAi8VM2P4j3ywKsNonovK
  // Subcarpetas: grado (5años, 1ero, etc.) y general
  // ──────────────────────────────────────────────────
  function fetchActividadesDriveFiles(student, containerId) {
    var hook = student.webhookUrl || window.GOOGLE_DRIVE_WEBHOOK_URL;
    var fid  = window.ACTIVITIES_DRIVE_FOLDER_ID || '1axzC6xBTXxhvAi8VM2P4j3ywKsNonovK';
    if (!hook || isLoadingActividadesFiles) return;
    isLoadingActividadesFiles = true;
    renderGDriveDashboard(containerId);

    var grade = getGradeFolderKey(student.gradeId);

    var fetchGrade = fetch(hook + '?action=list&folderId=' + fid + '&subfolder=' + encodeURIComponent(grade))
      .then(function(r){ return r.json(); })
      .catch(function(){ return { files: [] }; });

    var fetchGeneral = fetch(hook + '?action=list&folderId=' + fid + '&subfolder=general')
      .then(function(r){ return r.json(); })
      .catch(function(){ return { files: [] }; });

    Promise.all([fetchGrade, fetchGeneral])
      .then(function(results){
        isLoadingActividadesFiles = false;
        hasFetchedActividadesFiles = true;

        var gradeData = results[0];
        var generalData = results[1];

        if (gradeData && Array.isArray(gradeData.files)) {
          FOLDER_CONTENTS.actividades.items = gradeData.files.map(function(f){
            return {
              id: f.id,
              name: f.name,
              title: f.title || f.name.replace(/\.[^.]+$/, ''),
              type: f.type || 'file',
              size: f.size || '—',
              date: f.date || '—',
              url: f.url || (f.id ? 'https://drive.google.com/file/d/' + f.id + '/view' : ''),
              downloadUrl: f.downloadUrl || (f.id ? 'https://drive.google.com/uc?export=download&id=' + f.id : '')
            };
          });
        }

        if (generalData && Array.isArray(generalData.files) && generalData.files.length > 0) {
          FOLDER_CONTENTS.actividades.generalItems = generalData.files.map(function(f){
            return {
              id: f.id,
              name: f.name,
              title: f.title || f.name.replace(/\.[^.]+$/, ''),
              type: f.type || 'image',
              size: f.size || '—',
              date: f.date || '—',
              url: f.url || (f.id ? 'https://lh3.googleusercontent.com/d/' + f.id : ''),
              downloadUrl: f.downloadUrl || (f.id ? 'https://drive.google.com/uc?export=download&id=' + f.id : '')
            };
          });
        } else {
          // Fallback garantizado para Inventario del taller
          FOLDER_CONTENTS.actividades.generalItems = [{
            id: '10EGSDHn36iWy5n5XxX1utxxmyxdKkEwo',
            name: 'Inventario del taller',
            title: 'Inventario del Taller Maker',
            type: 'image',
            size: '1.6 MB',
            date: 'Reciente',
            url: 'https://lh3.googleusercontent.com/d/10EGSDHn36iWy5n5XxX1utxxmyxdKkEwo',
            downloadUrl: 'https://drive.google.com/uc?export=download&id=10EGSDHn36iWy5n5XxX1utxxmyxdKkEwo'
          }];
        }

        renderGDriveDashboard(containerId);
      })
      .catch(function(){
        isLoadingActividadesFiles = false;
        hasFetchedActividadesFiles = true;
        renderGDriveDashboard(containerId);
      });
  }

  // ──────────────────────────────────────────────────
  // GESTIÓN DE MISIONES COMPLETADAS Y PROGRESO DEL TALLER
  // ──────────────────────────────────────────────────
  function isMissionCompleted(student, missionId) {
    if (!missionId) return false;
    var sId = (student && student.id) ? student.id : 'anon';
    var subKey = 'entrega_' + sId + '_' + missionId;
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(subKey)); } catch(e){}
    if (saved && (saved.completed || saved.makecodeUrl || saved.fileName)) return true;

    var compListKey = 'completed_missions_' + sId;
    var compList = [];
    try { compList = JSON.parse(localStorage.getItem(compListKey)) || []; } catch(e){}
    if (compList.indexOf(missionId) !== -1) return true;

    if (student && student.completedMissions && Array.isArray(student.completedMissions) && student.completedMissions.indexOf(missionId) !== -1) {
      return true;
    }
    return false;
  }

  function markMissionCompleted(student, missionId, deliveryData) {
    if (!missionId) return;
    var sId = (student && student.id) ? student.id : 'anon';
    var subKey = 'entrega_' + sId + '_' + missionId;
    var existing = null;
    try { existing = JSON.parse(localStorage.getItem(subKey)); } catch(e){}
    var payload = Object.assign({}, existing || {}, deliveryData || {}, {
      completed: true,
      completedAt: new Date().toISOString()
    });
    try {
      localStorage.setItem(subKey, JSON.stringify(payload));
    } catch(e){}

    var compListKey = 'completed_missions_' + sId;
    var compList = [];
    try { compList = JSON.parse(localStorage.getItem(compListKey)) || []; } catch(e){}
    if (compList.indexOf(missionId) === -1) {
      compList.push(missionId);
      try { localStorage.setItem(compListKey, JSON.stringify(compList)); } catch(e){}
    }

    // Sincronizar en Firestore
    if (window.db && student && student.id) {
      try {
        var subDocId = student.id + '_' + missionId;
        window.db.collection('student_submissions').doc(subDocId).set(Object.assign({
          studentId: student.id,
          studentName: student.name || '',
          gradeId: student.gradeId || '',
          missionId: missionId,
          completed: true,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, deliveryData || {}), { merge: true }).catch(function(err){ console.warn('Firestore err:', err); });

        // Actualizar array completedMissions en el documento del estudiante si existe
        window.db.collection('students').doc(student.id).set({
          completedMissions: firebase.firestore.FieldValue.arrayUnion(missionId)
        }, { merge: true }).catch(function(){});
      } catch(e){}
    }
  }

  function refreshDashboard() {
    renderGDriveDashboard('student-drive-dashboard-container');
    renderGDriveDashboard('gdrive-explorer-container');
  }

  // ──────────────────────────────────────────────────
  // AGREGADOR DE MISIONES / RUTA DE AVENTURAS (MODO 3)
  // Combina proyectos del currículo, MakeCode y guías de Drive
  // ──────────────────────────────────────────────────
  function getAdventureMissionsForStudent(student) {
    if (!student) return [];
    var gradeId = student.gradeId || 'sala5';
    var gradeObj = null;
    if (window.SCHOOL_DATA && Array.isArray(window.SCHOOL_DATA.grades)) {
      gradeObj = window.SCHOOL_DATA.grades.find(function(g){ return g.id === gradeId; });
    }

    var missions = [];
    var levelCount = 1;

    // 1. Proyectos definidos en SCHOOL_DATA para el grado
    if (gradeObj && Array.isArray(gradeObj.projects)) {
      gradeObj.projects.forEach(function(p, idx) {
        var isMakecode = !!p.makecodeUrl;
        var isScratch  = !!p.scratchId || (p.tags && p.tags.indexOf('Scratch Jr') !== -1);
        var type  = isMakecode ? 'makecode' : (isScratch ? 'scratch' : 'robotica');
        var badge = isMakecode ? '🕹️ MakeCode Arcade' : (isScratch ? '🐱 Scratch' : '🚀 Proyecto Maker');
        var icon  = isMakecode ? 'fa-gamepad' : (isScratch ? 'fa-cat' : 'fa-rocket');

        missions.push({
          id: p.id || ('proj-' + idx),
          level: levelCount++,
          title: p.title,
          subtitle: p.author ? ('Por ' + p.author) : (gradeObj.name),
          description: p.description || 'Desafío y proyecto de programación del grado.',
          type: type,
          badge: badge,
          icon: icon,
          color: gradeObj.color || '#2563EB',
          stars: 3,
          status: 'desafio',
          coverImage: p.coverImage || (p.gallery && p.gallery[0]) || 'img/scratchjr.png',
          gallery: p.gallery || [],
          pdfUrl: p.pdfUrl || null,
          downloadPdfUrl: p.pdfUrl || null,
          makecodeUrl: p.makecodeUrl || null,
          scratchId: p.scratchId || null,
          materials: p.materials || [
            { title: 'Computadora o Tablet', description: 'Para programar y probar el proyecto' },
            { title: 'Materiales del Taller', description: 'Papel, colores y tarjetas para bocetos' }
          ],
          gradeName: gradeObj.name
        });
      });
    }

    // 2. Proyectos de MAKECODE_LIBRARY para el grado
    var mkLib = (window.MAKECODE_LIBRARY && window.MAKECODE_LIBRARY[gradeId]) || [];
    mkLib.forEach(function(m, idx) {
      if (!missions.some(function(it){ return it.title === m.title; })) {
        missions.push({
          id: 'mk-' + idx,
          level: levelCount++,
          title: m.title || ('Misión MakeCode #' + (idx + 1)),
          subtitle: 'Simulador y Bloques Micro:bit',
          description: m.description || 'Programá y simulá sensores, animaciones e inventos con Micro:bit.',
          type: 'makecode',
          badge: '💻 MakeCode Micro:bit',
          icon: 'fa-microchip',
          color: '#7C3AED',
          stars: 3,
          status: 'desafio',
          coverImage: 'img/microbit.png',
          gallery: [],
          pdfUrl: null,
          downloadPdfUrl: null,
          makecodeUrl: m.shareUrl,
          scratchId: null,
          materials: [
            { title: 'Placa BBC micro:bit v2', description: 'Microcontrolador con matriz LED 5x5 y sensores' },
            { title: 'Cable Micro-USB', description: 'Para transferir el código y dar energía' },
            { title: 'Portapilas o Batería', description: 'Para probar tu robot o invento en movimiento' }
          ],
          gradeName: student.gradeName
        });
      }
    });

    // 3. Guías PDF de Google Drive (FOLDER_CONTENTS.proyectos.items)
    var drivePdfs = (FOLDER_CONTENTS.proyectos && FOLDER_CONTENTS.proyectos.items) || [];
    drivePdfs.forEach(function(pdf, idx) {
      missions.push({
        id: 'pdf-' + (pdf.id || idx),
        level: levelCount++,
        title: pdf.title || pdf.name.replace(/\.pdf$/i, ''),
        subtitle: 'Guía de Construcción y Ficha de Trabajo',
        description: pdf.desc || 'Ficha práctica descargable con los pasos del proyecto para el aula.',
        type: 'pdf',
        badge: '📄 Ficha Didáctica PDF',
        icon: 'fa-file-pdf',
        color: '#DC2626',
        stars: 3,
        status: 'desafio',
        coverImage: 'img/pdf_preview_placeholder.png',
        gallery: [],
        pdfUrl: pdf.url,
        downloadPdfUrl: pdf.downloadUrl || pdf.url,
        makecodeUrl: null,
        scratchId: null,
        materials: [
          { title: 'Guía Impresa / Digital', description: 'Manual ilustrado paso a paso' },
          { title: 'Herramientas del Taller', description: 'Tijeras, cinta y componentes' }
        ],
        gradeName: student.gradeName
      });
    });

    // ── Determinar estado dinámico de cada misión según entregas del alumno ──
    var explicitlyCompletedIds = {};
    var explicitlyCompletedCount = 0;
    missions.forEach(function(m) {
      if (isMissionCompleted(student, m.id)) {
        m.status = 'completado';
        explicitlyCompletedIds[m.id] = true;
        explicitlyCompletedCount++;
      }
    });

    // Proyectos válidos subidos por el alumno en su carpeta de proyectos (Drive o local)
    var validProyectoFiles = (FOLDER_CONTENTS.proyecto && FOLDER_CONTENTS.proyecto.items || []).filter(function(f){
      return isScratchFile(f.name) || isMakecodeFile(f.name) || f.type==='scratch' || f.type==='makecode';
    });

    // Si el alumno tiene más archivos de proyectos subidos que misiones con entrega individual,
    // completar automáticamente las siguientes misiones pendientes
    var totalProjectsCount = Math.max(explicitlyCompletedCount, validProyectoFiles.length);
    var targetCompletedTotal = Math.min(missions.length, totalProjectsCount);

    if (explicitlyCompletedCount < targetCompletedTotal) {
      var needed = targetCompletedTotal - explicitlyCompletedCount;
      var assigned = 0;
      missions.forEach(function(m) {
        if (!explicitlyCompletedIds[m.id] && assigned < needed) {
          m.status = 'completado';
          explicitlyCompletedIds[m.id] = true;
          assigned++;
          var pf = validProyectoFiles[explicitlyCompletedCount + assigned - 1] || validProyectoFiles[assigned - 1];
          markMissionCompleted(student, m.id, {
            fileName: pf ? pf.name : 'proyecto_entregado.sjr',
            fileSize: pf ? pf.size : '1 MB',
            date: (pf && pf.date) || new Date().toLocaleDateString('es-ES'),
            type: pf ? pf.type : 'scratch',
            missionId: m.id,
            missionTitle: m.title
          });
        }
      });
    }

    // Determinar la primera misión pendiente como 'activo' y el resto como 'desafio'
    var firstPendingFound = false;
    missions.forEach(function(m) {
      if (m.status !== 'completado') {
        if (!firstPendingFound) {
          m.status = 'activo';
          firstPendingFound = true;
        } else {
          m.status = 'desafio';
        }
      }
    });

    return missions;
  }

  // ──────────────────────────────────────────────────
  // RENDER HTML DE RUTA DE AVENTURAS (MODO 3)
  // ──────────────────────────────────────────────────
  function renderAdventureRoadmapHtml(student, missions, isGrid) {
    if (!missions || missions.length === 0) {
      return '<div class="gdb-empty-state"><div class="ges-icon">🗺️</div><h4>Sin misiones aún</h4><p>Pronto se publicarán los desafíos para ' + student.gradeName + '.</p></div>';
    }

    // Progreso del Taller: cuenta exactamente las misiones completadas
    var completedCount = missions.filter(function(m){ return m.status === 'completado'; }).length;
    var progressPercent = missions.length > 0 ? Math.min(100, Math.round((completedCount / missions.length) * 100)) : 0;

    var headerHtml =
      '<div class="arm-header-banner">' +
        '<div class="arm-hb-left">' +
          '<div class="arm-hb-badge"><i class="fas fa-compass"></i> RUTA MAKER 2026</div>' +
          '<h3 class="arm-hb-title">Camino de Aventuras — ' + student.gradeName + '</h3>' +
          '<p class="arm-hb-sub">¡Superá cada estación, programá inventos y descubrí nuevos desafíos tecnológicos!</p>' +
        '</div>' +
        '<div class="arm-hb-right">' +
          '<div class="arm-progress-box">' +
            '<div class="arm-pb-top">' +
              '<span><i class="fas fa-trophy"></i> Progreso del Taller</span>' +
              '<strong>' + completedCount + ' / ' + missions.length + ' Misiones</strong>' +
            '</div>' +
            '<div class="arm-pb-bar">' +
              '<div class="arm-pb-fill" style="width:' + progressPercent + '%;"></div>' +
            '</div>' +
            '<div class="arm-pb-stars">' +
              '<span>⭐ Explorador Maker</span>' +
              '<span class="arm-pb-xp">⚡ +' + (completedCount * 100) + ' XP</span>' +
            '</div>' +
          '</div>' +
          '<div class="arm-view-toggle">' +
            '<button type="button" class="arm-vt-btn ' + (!isGrid ? 'active' : '') + '" data-arm-mode="trail" title="Ver como Sendero de Niveles">' +
              '<i class="fas fa-route"></i> Mapa' +
            '</button>' +
            '<button type="button" class="arm-vt-btn ' + (isGrid ? 'active' : '') + '" data-arm-mode="grid" title="Ver como Cuadrícula">' +
              '<i class="fas fa-th-large"></i> Cuadrícula' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    var bodyHtml = '';

    if (!isGrid) {
      // ── Sendero de Niveles (Trail Mode) ──
      bodyHtml = '<div class="arm-trail-path">' +
        missions.map(function(m, idx) {
          var sideClass = (idx % 2 === 0) ? 'station-left' : 'station-right';
          var statusText = m.status === 'completado' ? '⭐ Completado' : (m.status === 'activo' ? '⚡ En Curso' : '🎯 Reto');

          return '<div class="arm-station ' + sideClass + '" data-mission-idx="' + idx + '">' +
            '<div class="arm-node-column">' +
              '<div class="arm-node-bubble ' + m.status + '" title="Nivel ' + m.level + ': ' + m.title.replace(/"/g, '&quot;') + '">' +
                '<span class="arm-node-level">NIVEL</span>' +
                '<span class="arm-node-num">' + m.level + '</span>' +
                '<div class="arm-node-icon"><i class="fas ' + m.icon + '"></i></div>' +
              '</div>' +
            '</div>' +
            '<div class="arm-mission-card ' + m.status + '" data-mission-idx="' + idx + '">' +
              '<div class="arm-mc-header">' +
                '<span class="arm-mc-badge" style="background:' + m.color + '22;color:' + m.color + ';">' +
                  m.badge +
                '</span>' +
                '<span class="arm-mc-status ' + m.status + '">' + statusText + '</span>' +
              '</div>' +
              '<div class="arm-mc-body">' +
                '<h4 class="arm-mc-title">' + m.title + '</h4>' +
                '<p class="arm-mc-desc">' + m.description + '</p>' +
              '</div>' +
              '<div class="arm-mc-footer">' +
                '<button type="button" class="arm-btn-primary arm-btn-open-modal" data-mission-idx="' + idx + '">' +
                  '<i class="fas fa-play"></i> Iniciar Misión' +
                '</button>' +
                '<button type="button" class="arm-btn-secondary arm-btn-open-presentation" data-mission-idx="' + idx + '" title="Abrir Modo Presentación">' +
                  '<i class="fas fa-chalkboard-teacher"></i> Presentación' +
                '</button>' +
                '<button type="button" class="arm-btn-ghost arm-btn-open-pdf" data-mission-idx="' + idx + '" title="Ver Guía PDF">' +
                  '<i class="fas fa-file-pdf"></i> Guía PDF' +
                '</button>' +
              '</div>' +
            '</div>' +
          '</div>';
        }).join('') +
      '</div>';
    } else {
      // ── Cuadrícula (Grid Mode) ──
      bodyHtml = '<div class="arm-grid-view">' +
        missions.map(function(m, idx) {
          var statusText = m.status === 'completado' ? '⭐ Completado' : (m.status === 'activo' ? '⚡ En Curso' : '🎯 Reto');
          return '<div class="arm-grid-card ' + m.status + '" data-mission-idx="' + idx + '">' +
            '<div class="arm-mc-header">' +
              '<span class="arm-mc-badge" style="background:' + m.color + '22;color:' + m.color + ';">' +
                '<span style="background:' + m.color + ';color:#FFF;padding:1px 6px;border-radius:4px;margin-right:4px;">L' + m.level + '</span> ' + m.badge +
              '</span>' +
              '<span class="arm-mc-status ' + m.status + '">' + statusText + '</span>' +
            '</div>' +
            '<div class="arm-mc-body">' +
              '<h4 class="arm-mc-title">' + m.title + '</h4>' +
              '<p class="arm-mc-desc">' + m.description + '</p>' +
            '</div>' +
            '<div class="arm-mc-footer">' +
              '<button type="button" class="arm-btn-primary arm-btn-open-modal" data-mission-idx="' + idx + '">' +
                '<i class="fas fa-play"></i> Iniciar' +
              '</button>' +
              '<button type="button" class="arm-btn-secondary arm-btn-open-presentation" data-mission-idx="' + idx + '">' +
                '<i class="fas fa-chalkboard-teacher"></i> Presentación' +
              '</button>' +
              '<button type="button" class="arm-btn-ghost arm-btn-open-pdf" data-mission-idx="' + idx + '">' +
                '<i class="fas fa-file-pdf"></i> PDF' +
              '</button>' +
            '</div>' +
          '</div>';
        }).join('') +
      '</div>';
    }

    return '<div class="adventure-roadmap-wrapper">' + headerHtml + bodyHtml + '</div>';
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
    if (!hasFetchedActividadesFiles && !isLoadingActividadesFiles) fetchActividadesDriveFiles(student, containerId);

    var gradeFolder  = getGradeFolderKey(student.gradeId);
    var showScratch  = hasScratchJr(student.gradeId);
    var currentFolder = FOLDER_CONTENTS[activeFolderKey] || FOLDER_CONTENTS.dibujos;
    var driveTargetUrl = student.driveUrl || (student.driveFolderId ? 'https://drive.google.com/drive/folders/' + student.driveFolderId : '');

    // Si la pestaña activa es Scratch pero el grado no tiene acceso, cambiar a MakeCode
    if (activeFolderKey === 'proyecto' && proyectoSubTab === 'scratch' && !showScratch) {
      proyectoSubTab = 'makecode';
    }

    // Misiones de la Ruta de Aventuras (Modo 3)
    var adventureMissions = getAdventureMissionsForStudent(student);

    // Badges y conteos
    var validProyectoFiles = (FOLDER_CONTENTS.proyecto.items || []).filter(function(f){
      return isScratchFile(f.name) || isMakecodeFile(f.name) || f.type==='scratch' || f.type==='makecode';
    });

    var badgeDibujos     = isLoadingDriveFiles ? '<i class="fas fa-spinner fa-spin"></i>' : FOLDER_CONTENTS.dibujos.items.length;
    var badgeProyectos   = adventureMissions.length;
    var badgeProyecto    = isLoadingProyectoFiles ? '<i class="fas fa-spinner fa-spin"></i>' : validProyectoFiles.length;
    var totalActividades = FOLDER_CONTENTS.actividades.items.length + (FOLDER_CONTENTS.actividades.generalItems.length > 0 ? FOLDER_CONTENTS.actividades.generalItems.length : 1);
    var badgeActividades = isLoadingActividadesFiles ? '<i class="fas fa-spinner fa-spin"></i>' : totalActividades;
    var badgeFamiliar    = 1;

    // ── Filtros por subtab ──
    var scratchItems   = validProyectoFiles.filter(function(f){ return isScratchFile(f.name) || f.type==='scratch'; }).slice(0, 10);
    var makecodeItems  = validProyectoFiles.filter(function(f){ return isMakecodeFile(f.name) || f.type==='makecode'; }).slice(0, 10);

    // countText barra
    var countText = '';
    if (activeFolderKey === 'dibujos')   countText = isLoadingDriveFiles ? '<i class="fas fa-sync-alt fa-spin"></i> Conectando...' : FOLDER_CONTENTS.dibujos.items.length + ' dibujo(s)';
    else if (activeFolderKey === 'proyectos') countText = adventureMissions.length + ' misiones de aventura (' + student.gradeName + ')';
    else if (activeFolderKey === 'proyecto') {
      if (isLoadingProyectoFiles) {
        countText = '<i class="fas fa-sync-alt fa-spin"></i> Cargando...';
      } else {
        countText = (proyectoSubTab === 'scratch' ? scratchItems.length + ' proyecto(s) Scratch Jr' : makecodeItems.length + ' proyecto(s) MakeCode');
      }
    } else if (activeFolderKey === 'actividades') {
      if (isLoadingActividadesFiles) {
        countText = '<i class="fas fa-sync-alt fa-spin"></i> Buscando actividades...';
      } else {
        countText = FOLDER_CONTENTS.actividades.items.length > 0
          ? (FOLDER_CONTENTS.actividades.items.length + ' reto(s) de ' + student.gradeName + ' + Inventario')
          : '1 actividad (Inventario de material)';
      }
    } else if (activeFolderKey === 'familiar') {
      countText = '1 experiencia familiar (Escape Rooms Nostálgico)';
    }

    // ──────────────────────────────────────────────────
    // HTML por carpeta
    // ──────────────────────────────────────────────────
    var mainDisplayHtml = '';
    var uploadZoneHtml  = '';
    var displayItems; // solo para dibujos

    // ═══ CARPETA: RUTA DE AVENTURAS / PROYECTOS (MODO 3) ═══
    if (activeFolderKey === 'proyectos') {
      mainDisplayHtml = renderAdventureRoadmapHtml(student, adventureMissions, isRoadmapGridMode);

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
          tabContent = '<div class="mklib-cards-grid">' +
            mkLibrary.map(function(entry, idx) {
              return '<div class="mklib-card-item" data-entry-idx="' + idx + '">' +
                '<div class="mklib-ci-header">' +
                  '<div class="mklib-icon-wrap">' +
                    '<span class="mklib-num">' + (idx + 1) + '</span>' +
                    '<i class="fas fa-microchip mklib-chip-icon"></i>' +
                  '</div>' +
                  '<div class="mklib-ci-badges">' +
                    '<span class="mklib-badge"><i class="fas fa-shield-alt"></i> Solo lectura</span>' +
                  '</div>' +
                '</div>' +
                '<div class="mklib-ci-body">' +
                  '<h4 class="mklib-ci-title">' + (entry.title || ('Código MakeCode #' + (idx + 1))) + '</h4>' +
                  '<p class="mklib-ci-desc">' + (entry.description || 'Proyecto interactivo de programación en MakeCode para Micro:bit.') + '</p>' +
                  '<div class="mklib-ci-pills">' +
                    '<span class="mklib-pill"><i class="fas fa-puzzle-piece"></i> Código</span>' +
                    '<span class="mklib-pill"><i class="fas fa-gamepad"></i> Simulador</span>' +
                  '</div>' +
                '</div>' +
                '<div class="mklib-ci-footer">' +
                  '<button type="button" class="mklib-btn-modal-trigger">' +
                    '<i class="fas fa-expand-alt"></i> Ver Proyecto' +
                  '</button>' +
                  '<a class="mklib-btn-entrar-link" href="' + (entry.shareUrl || '#') + '" target="_blank" rel="noopener noreferrer">' +
                    '<i class="fas fa-external-link-alt"></i> Entrar' +
                  '</a>' +
                '</div>' +
              '</div>';
            }).join('') +
          '</div>';
        }
        // MakeCode no tiene zona de subida — es solo lectura
        uploadZoneHtml = '';
      }

      mainDisplayHtml = tabsHtml + tabContent;

    // ═══ CARPETA: ACTIVIDADES (Tu Grado + General) ═══
    } else if (activeFolderKey === 'actividades') {
      var gradeInfo = GRADE_ACTIVITIES_INFO[student.gradeId] || GRADE_ACTIVITIES_INFO['sala5'];
      var gradeFiles = FOLDER_CONTENTS.actividades.items || [];
      var generalFiles = FOLDER_CONTENTS.actividades.generalItems || [];
      var activitiesDriveUrl = 'https://drive.google.com/drive/folders/1axzC6xBTXxhvAi8VM2P4j3ywKsNonovK?usp=sharing';

      // 1. Actividad de su grado (Relacionar): Solo aparece si HAY archivos subidos para su grado
      var gradeCardsHtml = '';
      if (gradeFiles.length > 0) {
        gradeCardsHtml = gradeFiles.map(function(item){
          var isPdf = item.type === 'pdf' || (item.name && item.name.toLowerCase().endsWith('.pdf'));
          var dlUrl = item.downloadUrl || ('https://drive.google.com/uc?export=download&id=' + item.id);
          var viewUrl = item.id ? ('https://drive.google.com/file/d/' + item.id + '/view') : dlUrl;
          var imgThumb = (item.type === 'image' || !isPdf)
            ? ('https://lh3.googleusercontent.com/d/' + item.id)
            : 'img/pdf_preview_placeholder.png';

          var isImg = (item.type === 'image' || !isPdf);
          var clickAction = isImg
            ? 'if(window.openImageModal) window.openImageModal(\'' + imgThumb + '\', \'' + item.title.replace(/'/g, "\\'") + '\', \'' + dlUrl + '\');'
            : 'window.open(\'' + viewUrl + '\', \'_blank\');';

          return '<div class="actividad-grid-card">' +
            '<div class="agc-thumb-container" onclick="' + clickAction + '" title="Hacé click para ver">' +
              (isImg
                ? '<img src="' + imgThumb + '" alt="' + item.title + '" class="agc-thumb-img" onerror="this.src=\'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80\'">' +
                  '<span class="agc-zoom-badge"><i class="fas fa-search-plus"></i> Ver Ficha</span>'
                : '<span class="agc-icon-giant">📄</span><span class="agc-zoom-badge"><i class="fas fa-eye"></i> Abrir PDF</span>') +
            '</div>' +
            '<div class="agc-card-content">' +
              '<div class="agc-card-badge-row">' +
                '<span class="agc-card-badge" style="background:' + (gradeInfo.themeColor || '#EA580C') + ';color:#ffffff;"><i class="fas fa-star"></i> ' + student.gradeName + '</span>' +
                '<span class="agc-card-tag">' + (isPdf ? '📄 PDF' : '🖼️ Imagen') + '</span>' +
              '</div>' +
              '<h3 class="agc-card-title">' + item.title + '</h3>' +
              '<p class="agc-card-desc">Reto y actividad de relación de conceptos creada para tu grado (' + student.gradeName + ').</p>' +
              '<div class="agc-card-actions">' +
                (isImg
                  ? '<button type="button" class="btn-agc-primary" style="background:' + (gradeInfo.themeColor || '#EA580C') + ';" onclick="' + clickAction + '"><i class="fas fa-eye"></i> <span>Ver Ficha</span></button>'
                  : '<a href="' + viewUrl + '" target="_blank" rel="noopener noreferrer" class="btn-agc-primary" style="background:' + (gradeInfo.themeColor || '#EA580C') + ';"><i class="fas fa-eye"></i> <span>Abrir PDF</span></a>') +
                '<a href="' + dlUrl + '" target="_blank" rel="noopener noreferrer" class="btn-agc-secondary"><i class="fas fa-download"></i> <span>Descargar</span></a>' +
              '</div>' +
            '</div>' +
          '</div>';
        }).join('');
      }

      // 2. Actividad General (Inventario del taller)
      var generalItem = (generalFiles && generalFiles[0]) || {
        id: '10EGSDHn36iWy5n5XxX1utxxmyxdKkEwo',
        title: 'Inventario del Taller Maker',
        url: 'https://lh3.googleusercontent.com/d/10EGSDHn36iWy5n5XxX1utxxmyxdKkEwo'
      };
      var generalDlUrl = 'https://drive.google.com/uc?export=download&id=' + generalItem.id;
      var generalImgUrl = 'https://lh3.googleusercontent.com/d/' + generalItem.id;

      var generalCardHtml =
        '<div class="actividad-grid-card">' +
          '<div class="agc-thumb-container" onclick="if(window.openImageModal) window.openImageModal(\'' + generalImgUrl + '\', \'' + generalItem.title.replace(/'/g, "\\'") + '\', \'' + generalDlUrl + '\');" title="Hacé click para ver la ficha completa">' +
            '<img src="' + generalImgUrl + '" alt="' + generalItem.title + '" class="agc-thumb-img" onerror="this.src=\'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80\'">' +
            '<span class="agc-zoom-badge"><i class="fas fa-search-plus"></i> Ver Ficha</span>' +
          '</div>' +
          '<div class="agc-card-content">' +
            '<div class="agc-card-badge-row">' +
              '<span class="agc-card-badge"><i class="fas fa-boxes"></i> General • Todas las edades</span>' +
            '</div>' +
            '<h3 class="agc-card-title">' + generalItem.title + '</h3>' +
            '<p class="agc-card-desc">Observar, clasificar, contar y relacionar las piezas, sensores, motores y herramientas del taller de robótica desde casa.</p>' +
            '<div class="agc-card-actions">' +
              '<button type="button" class="btn-agc-primary" onclick="if(window.openImageModal) window.openImageModal(\'' + generalImgUrl + '\', \'' + generalItem.title.replace(/'/g, "\\'") + '\', \'' + generalDlUrl + '\');">' +
                '<i class="fas fa-eye"></i> <span>Ver Ficha</span>' +
              '</button>' +
              '<a href="' + generalDlUrl + '" target="_blank" rel="noopener noreferrer" class="btn-agc-secondary">' +
                '<i class="fas fa-download"></i> <span>Descargar</span>' +
              '</a>' +
              '<a href="' + activitiesDriveUrl + '" target="_blank" rel="noopener noreferrer" class="btn-agc-secondary" style="color:#2563EB;">' +
                '<i class="fab fa-google-drive"></i>' +
              '</a>' +
            '</div>' +
          '</div>' +
        '</div>';

      mainDisplayHtml =
        '<div class="gdb-actividades-container">' +
          '<div class="gac-section-block">' +
            '<div class="gac-block-header">' +
              '<h4><span class="gac-icon">🏠</span> Actividades para Resolver en Casa</h4>' +
            '</div>' +
            '<div class="actividades-grid">' +
              gradeCardsHtml +
              generalCardHtml +
            '</div>' +
          '</div>' +
        '</div>';

      uploadZoneHtml = '';

    // ═══ CARPETA: ACTIVIDAD FAMILIAR (Escape Rooms Nostálgico) ═══
    } else if (activeFolderKey === 'familiar') {
      var escapeRoomUrl = 'https://roboticapaulofreire-uy.github.io/escape-rooms-nostalgico/index.html';

      var escapeRoomCardHtml =
        '<div class="actividad-grid-card">' +
          '<div class="agc-thumb-container escape-bg" onclick="window.open(\'' + escapeRoomUrl + '\', \'_blank\');" title="Hacé click para entrar al Escape Room">' +
            '<span class="agc-icon-giant">🗝️</span>' +
            '<span class="agc-zoom-badge" style="background:#BE185D;"><i class="fas fa-external-link-alt"></i> Entrar al Juego</span>' +
          '</div>' +
          '<div class="agc-card-content">' +
            '<div class="agc-card-badge-row">' +
              '<span class="agc-card-badge" style="background:#FCE7F3;color:#BE185D;"><i class="fas fa-heart"></i> Familiar • Todas las edades</span>' +
              '<span class="agc-card-tag">🗝️ Juego Interactivo</span>' +
            '</div>' +
            '<h3 class="agc-card-title">Escape Rooms Nostálgico</h3>' +
            '<p class="agc-card-desc">Resolvé enigmas y pistas nostálgicas en familia. Una experiencia colaborativa y divertida para todas las edades con acertijos, desafíos y mucha creatividad.</p>' +
            '<div class="agc-card-actions">' +
              '<a href="' + escapeRoomUrl + '" target="_blank" rel="noopener noreferrer" class="btn-agc-primary" style="background:#DB2777;">' +
                '<i class="fas fa-play"></i> <span>Entrar al Escape Room</span>' +
              '</a>' +
            '</div>' +
          '</div>' +
        '</div>';

      mainDisplayHtml =
        '<div class="gdb-actividades-container">' +
          '<div class="gac-section-block">' +
            '<div class="gac-block-header">' +
              '<h4><span class="gac-icon">👨‍👩‍👧</span> Actividades para Compartir en Familia</h4>' +
            '</div>' +
            '<div class="actividades-grid">' +
              escapeRoomCardHtml +
            '</div>' +
          '</div>' +
        '</div>';

      uploadZoneHtml = '';

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
    var uploadAccept = activeFolderKey === 'dibujos' ? '.bmp,.png,.jpg,.jpeg,image/bmp,image/png,image/jpeg' : '.sb3,.sjr,.pjson,.sb';
    var uploadBtnText = activeFolderKey === 'dibujos' ? '<i class="fas fa-plus-circle"></i> Subir dibujo' : '<i class="fas fa-plus-circle"></i> Subir Scratch Jr';
    var uploadBtnClass = activeFolderKey === 'dibujos' ? 'gca-btn-upload' : 'gca-btn-upload scratch';

    if (canUpload) {
      var dragTitle = activeFolderKey === 'dibujos' ? '¡Soltá tu dibujo aquí para guardarlo!' : '¡Soltá tu proyecto Scratch Jr aquí!';
      var dragHint = activeFolderKey === 'dibujos'
        ? 'Formatos de dibujo permitidos: <strong>.png, .jpg, .bmp</strong>'
        : 'Formatos permitidos: <strong>.sb3, .sjr, .pjson, .sb</strong>';

      uploadZoneHtml =
        '<input type="file" id="gdz-file-input" class="gdz-input" accept="' + uploadAccept + '" style="display:none;">' +
        '<div class="gdb-drag-overlay" id="gdb-drag-overlay">' +
          '<div class="gdo-card">' +
            '<div class="gdo-icon"><i class="fas fa-cloud-upload-alt"></i></div>' +
            '<h3>' + dragTitle + '</h3>' +
            '<p>' + dragHint + '</p>' +
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
              treeFolder('proyectos', '🗺️ Ruta de Aventuras', badgeProyectos, activeFolderKey, '#2563EB') +
              treeFolder('proyecto', '📁 Proyecto', badgeProyecto, activeFolderKey, '#7C3AED') +
              treeFolder('actividades', '🏠 Actividad de casa', badgeActividades, activeFolderKey, '#EA580C') +
              treeFolder('familiar', '👨‍👩‍👧 Actividad familiar', badgeFamiliar, activeFolderKey, '#DB2777') +
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
                  (activeFolderKey === 'proyectos' ? 'Ruta de Aventuras (' + student.gradeName + ')' :
                   activeFolderKey === 'proyecto'  ? 'Proyecto' :
                   activeFolderKey === 'actividades' ? (FOLDER_CONTENTS.actividades.items.length > 0 ? 'Actividad de casa (' + student.gradeName + ' + Inventario de material)' : 'Actividad de casa (Inventario de material)') :
                   activeFolderKey === 'familiar' ? 'Actividad familiar (Escape Rooms Nostálgico)' : currentFolder.name) +
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
      initDropzone(container, student, 'dibujo', '.bmp,.png,.jpg,.jpeg', containerId, false);
    }

    // ── Upload zona proyecto (solo Scratch Jr, MakeCode no tiene upload) ──
    if (activeFolderKey === 'proyecto' && proyectoSubTab === 'scratch' && showScratch) {
      initDropzone(container, student, 'proyecto', '.sb3,.sjr,.pjson,.sb', containerId, true, 'scratch');
    }

    // ── Eventos de la Ruta de Aventuras (Modo 3) ──
    if (activeFolderKey === 'proyectos') {
      // Toggle de vista: Mapa vs Cuadrícula
      container.querySelectorAll('.arm-vt-btn').forEach(function(btn){
        btn.onclick = function(e){
          e.stopPropagation();
          if (window.sounds) window.sounds.playClick();
          isRoadmapGridMode = (btn.dataset.armMode === 'grid');
          renderGDriveDashboard(containerId);
        };
      });

      // Clic en estación o tarjeta
      container.querySelectorAll('.arm-station, .arm-mission-card, .arm-grid-card').forEach(function(card){
        card.onclick = function(e){
          if (e.target.closest('button') || e.target.closest('a')) return;
          var idx = parseInt(card.dataset.missionIdx, 10);
          var mission = adventureMissions[idx];
          if (mission) openAdventureProjectModal(mission, 'presentacion');
        };
      });

      // Botón Iniciar Misión
      container.querySelectorAll('.arm-btn-open-modal').forEach(function(btn){
        btn.onclick = function(e){
          e.stopPropagation();
          var idx = parseInt(btn.dataset.missionIdx, 10);
          var mission = adventureMissions[idx];
          if (mission) openAdventureProjectModal(mission, 'presentacion');
        };
      });

      // Botón Modo Presentación
      container.querySelectorAll('.arm-btn-open-presentation').forEach(function(btn){
        btn.onclick = function(e){
          e.stopPropagation();
          var idx = parseInt(btn.dataset.missionIdx, 10);
          var mission = adventureMissions[idx];
          if (mission) openAdventureProjectModal(mission, 'presentacion');
        };
      });

      // Botón Guía PDF
      container.querySelectorAll('.arm-btn-open-pdf').forEach(function(btn){
        btn.onclick = function(e){
          e.stopPropagation();
          var idx = parseInt(btn.dataset.missionIdx, 10);
          var mission = adventureMissions[idx];
          if (mission) openAdventureProjectModal(mission, 'pdf');
        };
      });
    }

    // ── Click en tarjeta MakeCode para abrir Modal de Aventura (Presentación, Simulador y PDF) ──
    if (activeFolderKey === 'proyecto' && proyectoSubTab === 'makecode') {
      var mkLibrary = (window.MAKECODE_LIBRARY && window.MAKECODE_LIBRARY[student.gradeId]) || [];
      container.querySelectorAll('.mklib-card-item').forEach(function(card) {
        card.onclick = function(e) {
          if (e.target.closest('.mklib-btn-entrar-link')) return; // Permite abrir en MakeCode sin abrir modal
          var idx = parseInt(card.dataset.entryIdx, 10);
          var entry = mkLibrary[idx];
          if (entry) {
            var mission = {
              id: 'mk-' + idx,
              level: idx + 1,
              title: entry.title || ('Código MakeCode #' + (idx + 1)),
              subtitle: 'Simulador y Bloques Micro:bit',
              description: entry.description || 'Proyecto interactivo de programación en MakeCode.',
              type: 'makecode',
              badge: '💻 MakeCode Micro:bit',
              icon: 'fa-microchip',
              color: '#7C3AED',
              coverImage: 'img/microbit.png',
              makecodeUrl: entry.shareUrl,
              gradeName: student.gradeName,
              materials: [
                { title: 'Placa BBC micro:bit v2', description: 'Controlador con matriz LED 5x5 y sensores' },
                { title: 'Cable Micro-USB', description: 'Para transferir el código y alimentar la placa' },
                { title: 'Batería externa', description: 'Para probar tu proyecto en movimiento' }
              ]
            };
            openAdventureProjectModal(mission, 'presentacion');
          }
        };
      });
    }

    // ── PDFs ──
    container.querySelectorAll('.ppc-btn-view').forEach(function(btn){
      btn.onclick = function(e){ e.stopPropagation(); openPdfModal(btn.dataset.pdfUrl, btn.dataset.pdfTitle); };
    });

    // ── Actividades (zoom imagen y lightbox) ──
    if (activeFolderKey === 'actividades') {
      container.querySelectorAll('.agtc-thumb-wrap, .agtc-btn-view').forEach(function(btn){
        btn.onclick = function(e){
          e.stopPropagation();
          var imgUrl = btn.dataset.imgUrl || 'https://lh3.googleusercontent.com/d/10EGSDHn36iWy5n5XxX1utxxmyxdKkEwo';
          var title  = btn.dataset.imgTitle || 'Inventario del Taller Maker';
          openImageModal(imgUrl, title);
        };
      });
    }
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
      simUrl: base + '/---run?id=' + shareId + '&nofooter=1&fullscreen=1'
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
  // LIGHTBOX IMAGEN / FICHA DIDÁCTICA
  // ──────────────────────────────────────────────────
  function openImageModal(imgUrl, title, downloadUrl) {
    if (window.sounds) window.sounds.playClick();
    var modal = document.getElementById('image-lightbox-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'image-lightbox-modal';
      modal.className = 'student-login-modal';
      modal.innerHTML =
        '<div class="slm-content ilm-content">' +
          '<div class="slm-header ilm-header">' +
            '<div class="slm-title" id="ilm-title"><i class="fas fa-clipboard-list"></i> Visor de Ficha</div>' +
            '<div class="ilm-header-actions">' +
              '<a id="ilm-dl-btn" href="#" target="_blank" rel="noopener noreferrer" class="ilm-btn-action" title="Descargar"><i class="fas fa-download"></i> <span>Descargar</span></a>' +
              '<button type="button" class="slm-close" id="ilm-close-btn" aria-label="Cerrar">&times;</button>' +
            '</div>' +
          '</div>' +
          '<div class="slm-body ilm-body">' +
            '<img id="ilm-img" src="" alt="Ficha" referrerpolicy="no-referrer">' +
          '</div>' +
        '</div>';
      document.body.appendChild(modal);

      modal.querySelector('#ilm-close-btn').onclick = function() {
        modal.classList.remove('active');
      };
      modal.onclick = function(e) {
        if (e.target === modal) modal.classList.remove('active');
      };
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
          modal.classList.remove('active');
        }
      });
    }

    var titleEl = document.getElementById('ilm-title');
    if (titleEl) {
      titleEl.innerHTML = '<i class="fas fa-clipboard-list"></i> ' + (title || 'Visor de Ficha');
    }

    var imgEl = document.getElementById('ilm-img');
    if (imgEl) {
      imgEl.src = imgUrl;
      imgEl.alt = title || 'Ficha';
    }

    var dlBtn = document.getElementById('ilm-dl-btn');
    if (dlBtn) {
      var dl = downloadUrl || (imgUrl.includes('10EGSDHn36iWy5n5XxX1utxxmyxdKkEwo') ? 'https://drive.google.com/uc?export=download&id=10EGSDHn36iWy5n5XxX1utxxmyxdKkEwo' : imgUrl);
      dlBtn.href = dl;
      dlBtn.style.display = 'inline-flex';
    }

    modal.classList.add('active');
  }

  // Exponer a window para uso universal en index.html y aula.html
  window.openImageModal = openImageModal;

  // ──────────────────────────────────────────────────
  // MODAL DE MAKECODE (CÓDIGO EN BLOQUES + SIMULADOR)
  // ──────────────────────────────────────────────────
  function openMakecodeModal(entry, idx) {
    if (window.sounds) window.sounds.playClick();
    if (!entry) return;
    var mkInfo = extractMakecodeInfo(entry.shareUrl);
    if (!mkInfo) {
      alert('Link de MakeCode no válido: ' + (entry.shareUrl || 'vacío'));
      return;
    }

    var modal = document.getElementById('makecode-viewer-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'makecode-viewer-modal';
      modal.className = 'makecode-modal-overlay';
      document.body.appendChild(modal);

      modal.onclick = function(e) {
        if (e.target === modal) {
          closeMakecodeModal();
        }
      };
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
          closeMakecodeModal();
        }
      });
    }

    function closeMakecodeModal() {
      if (window.sounds) window.sounds.playClick();
      modal.classList.remove('active');
      modal.innerHTML = ''; // Detiene ejecución y audio
    }

    var numText = (typeof idx === 'number') ? ('#' + (idx + 1) + ' — ') : '';

    modal.innerHTML =
      '<div class="makecode-modal-content">' +
        '<div class="mkm-header">' +
          '<div class="mkm-header-info">' +
            '<div class="mkm-icon"><i class="fas fa-microchip"></i></div>' +
            '<div>' +
              '<h3 class="mkm-title">' + numText + (entry.title || 'Proyecto MakeCode') + '</h3>' +
              '<span class="mkm-badge"><i class="fas fa-shield-alt"></i> Solo lectura</span>' +
            '</div>' +
          '</div>' +
          '<div class="mkm-header-actions">' +
            '<a class="mkm-btn-entrar" href="' + (entry.shareUrl || '#') + '" target="_blank" rel="noopener noreferrer">' +
              '<i class="fas fa-external-link-alt"></i> Entrar a MakeCode' +
            '</a>' +
            '<button type="button" class="mkm-close-btn" aria-label="Cerrar modal">&times;</button>' +
          '</div>' +
        '</div>' +

        (entry.description
          ? '<div class="mkm-desc-bar"><p><i class="fas fa-info-circle"></i> ' + entry.description + '</p></div>'
          : '') +

        '<div class="mkm-tabs-bar">' +
          '<button type="button" class="mkm-tab-btn active" data-tab="codigo">' +
            '<i class="fas fa-puzzle-piece"></i> Código MakeCode' +
          '</button>' +
          '<button type="button" class="mkm-tab-btn" data-tab="simulador">' +
            '<i class="fas fa-gamepad"></i> Simulador' +
          '</button>' +
        '</div>' +

        '<div class="mkm-panes-body">' +
          '<div class="mkm-tab-pane pane-codigo active">' +
            '<div class="mkm-code-toolbar">' +
              '<span class="mkm-ct-label"><i class="fas fa-cubes"></i> Bloques de Código MakeCode</span>' +
              '<div class="mkm-code-zoom-controls">' +
                '<button type="button" class="mkm-zoom-btn" id="mkm-zoom-out" title="Reducir tamaño"><i class="fas fa-search-minus"></i></button>' +
                '<span class="mkm-zoom-val" id="mkm-zoom-label">125%</span>' +
                '<button type="button" class="mkm-zoom-btn" id="mkm-zoom-in" title="Aumentar tamaño"><i class="fas fa-search-plus"></i></button>' +
                '<button type="button" class="mkm-zoom-btn" id="mkm-zoom-reset" title="Restablecer (125%)"><i class="fas fa-undo"></i></button>' +
              '</div>' +
            '</div>' +
            '<div class="mkm-code-frame-wrap">' +
              '<iframe src="' + mkInfo.codeEmbedUrl + '" class="mkm-code-iframe" sandbox="allow-scripts allow-same-origin allow-popups" scrolling="yes" frameborder="0" allowfullscreen loading="lazy"></iframe>' +
            '</div>' +
          '</div>' +
          '<div class="mkm-tab-pane pane-simulador">' +
            '<div class="mkm-sim-toolbar">' +
              '<span class="mkm-st-label"><i class="fas fa-gamepad"></i> Simulador Micro:bit Interactivo</span>' +
              '<button type="button" class="mkm-sim-reload-btn" id="mkm-sim-reload" title="Reiniciar simulador">' +
                '<i class="fas fa-redo"></i> Reiniciar' +
              '</button>' +
            '</div>' +
            '<div class="mkm-sim-wrap">' +
              '<iframe data-src="' + mkInfo.simUrl + '" src="about:blank" class="mkm-sim-iframe" sandbox="allow-scripts allow-same-origin allow-popups" scrolling="no" frameborder="0"></iframe>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    modal.querySelector('.mkm-close-btn').onclick = closeMakecodeModal;

    modal.querySelectorAll('.mkm-tab-btn').forEach(function(btn) {
      btn.onclick = function() {
        if (window.sounds) window.sounds.playClick();
        var targetTab = btn.dataset.tab;
        modal.querySelectorAll('.mkm-tab-btn').forEach(function(b) {
          b.classList.toggle('active', b === btn);
        });
        modal.querySelectorAll('.mkm-tab-pane').forEach(function(p) {
          p.classList.toggle('active', p.classList.contains('pane-' + targetTab));
        });

        // Cargar simulador solo cuando se activa su pestaña
        if (targetTab === 'simulador') {
          var simIframe = modal.querySelector('.mkm-sim-iframe');
          if (simIframe) {
            var targetSrc = simIframe.dataset.src || mkInfo.simUrl;
            if (!simIframe.src || simIframe.src.indexOf('about:blank') !== -1) {
              simIframe.src = targetSrc;
            }
          }
        }

        setTimeout(function() {
          window.dispatchEvent(new Event('resize'));
        }, 60);
      };
    });

    var simReload = modal.querySelector('#mkm-sim-reload');
    if (simReload) {
      simReload.onclick = function() {
        if (window.sounds) window.sounds.playClick();
        var simIframe = modal.querySelector('.mkm-sim-iframe');
        if (simIframe) {
          simIframe.src = simIframe.dataset.src || mkInfo.simUrl;
        }
      };
    }

    // Controles de Zoom para los bloques de código
    var currentZoom = 1.25;
    var codeIframe = modal.querySelector('.mkm-code-iframe');
    var zoomLabel  = modal.querySelector('#mkm-zoom-label');
    var zoomIn     = modal.querySelector('#mkm-zoom-in');
    var zoomOut    = modal.querySelector('#mkm-zoom-out');
    var zoomReset  = modal.querySelector('#mkm-zoom-reset');

    function applyZoom(z) {
      currentZoom = Math.max(0.75, Math.min(2.5, Math.round(z * 100) / 100));
      if (codeIframe) {
        codeIframe.style.transform = 'scale(' + currentZoom + ')';
        codeIframe.style.transformOrigin = 'top left';
        codeIframe.style.width = (100 / currentZoom) + '%';
        codeIframe.style.height = (100 / currentZoom) + '%';
      }
      if (zoomLabel) {
        zoomLabel.textContent = Math.round(currentZoom * 100) + '%';
      }
    }

    applyZoom(1.25);

    if (zoomIn) {
      zoomIn.onclick = function() {
        if (window.sounds) window.sounds.playClick();
        applyZoom(currentZoom + 0.2);
      };
    }
    if (zoomOut) {
      zoomOut.onclick = function() {
        if (window.sounds) window.sounds.playClick();
        applyZoom(currentZoom - 0.2);
      };
    }
    if (zoomReset) {
      zoomReset.onclick = function() {
        if (window.sounds) window.sounds.playClick();
        applyZoom(1.25);
      };
    }

    modal.classList.add('active');
  }

  window.openMakecodeModal = openMakecodeModal;

  // ──────────────────────────────────────────────────
  // MODAL DE PROYECTO / MISIÓN DE AVENTURA (MODO 3)
  // Con Modo Presentación interactivo (Slideshow) y Guía PDF
  // ──────────────────────────────────────────────────
  function openAdventureProjectModal(mission, initialTab) {
    if (window.sounds) window.sounds.playClick();
    if (!mission) return;

    var modal = document.getElementById('adventure-project-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'adventure-project-modal';
      modal.className = 'adventure-modal-overlay';
      document.body.appendChild(modal);
    }

    var student = window.getActiveStudent ? window.getActiveStudent() : null;
    var activeTab = initialTab || 'presentacion';
    if (activeTab === 'simulador') activeTab = 'solucion';
    var currentSlide = 0;
    var totalSlides = 4;
    var mkInfo = mission.makecodeUrl ? extractMakecodeInfo(mission.makecodeUrl) : null;
    var isMakecode = !!mission.makecodeUrl || mission.type === 'makecode' || (mission.tags && mission.tags.some(function(t){ return /makecode|micro:?bit/i.test(t); }));
    var isScratch = !isMakecode || mission.type === 'scratch' || !!mission.scratchId || (mission.tags && mission.tags.some(function(t){ return /scratch/i.test(t); }));
    var hasPdf = !!mission.pdfUrl || !!mission.downloadPdfUrl;

    var storageKey = 'entrega_' + (student ? student.id : 'anon') + '_' + mission.id;
    var savedEntrega = null;
    try { savedEntrega = JSON.parse(localStorage.getItem(storageKey)); } catch(e){}
    var savedMakecodeUrl = (savedEntrega && savedEntrega.makecodeUrl) ? savedEntrega.makecodeUrl : '';
    var studentMkInfo = savedMakecodeUrl ? extractMakecodeInfo(savedMakecodeUrl) : null;
    var savedFileName = (savedEntrega && savedEntrega.fileName) ? savedEntrega.fileName : '';
    var savedFileDate = (savedEntrega && savedEntrega.date) ? savedEntrega.date : '';
    var isAlreadyCompleted = isMissionCompleted(student, mission.id) || mission.status === 'completado';

    function closeAdventureModal() {
      if (window.sounds) window.sounds.playClick();
      modal.classList.remove('active');
      document.removeEventListener('keydown', handleKeyDown);
      modal.innerHTML = '';
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(function(){});
      }
    }

    function toggleFullscreen() {
      if (window.sounds) window.sounds.playClick();
      var fsBtn = modal.querySelector('#apm-fs-btn');
      if (!document.fullscreenElement) {
        modal.requestFullscreen().then(function(){
          if (fsBtn) fsBtn.innerHTML = '<i class="fas fa-compress"></i> Salir de Pantalla Completa';
        }).catch(function(){});
      } else {
        document.exitFullscreen().then(function(){
          if (fsBtn) fsBtn.innerHTML = '<i class="fas fa-expand"></i> Pantalla Completa';
        }).catch(function(){});
      }
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        closeAdventureModal();
      } else if (e.key === 'ArrowRight') {
        if (activeTab === 'presentacion' && currentSlide < totalSlides - 1) {
          goToSlide(currentSlide + 1);
        }
      } else if (e.key === 'ArrowLeft') {
        if (activeTab === 'presentacion' && currentSlide > 0) {
          goToSlide(currentSlide - 1);
        }
      }
    }

    // Materiales
    var materialsList = (mission.materials && mission.materials.length > 0) ? mission.materials : [
      { title: 'Placa BBC micro:bit v2', description: 'Tarjeta con pantalla LED y sensores' },
      { title: 'Cable Micro-USB', description: 'Para programar y alimentar' },
      { title: 'Piezas del Taller', description: 'Cables, pulsadores y cartón' }
    ];

    // QR Code URL para simulación o ficha
    var targetShareLink = mission.makecodeUrl || (mission.pdfUrl || window.location.href);
    var qrCodeUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=2&data=' + encodeURIComponent(targetShareLink);

    // HTML del Modal
    modal.innerHTML =
      '<div class="adventure-modal-content">' +
        // Encabezado
        '<div class="apm-header">' +
          '<div class="apm-header-info">' +
            '<div class="apm-icon-wrap"><i class="fas ' + mission.icon + '"></i></div>' +
            '<div class="apm-title-wrap">' +
              '<h3>NIVEL ' + mission.level + ' — ' + mission.title + '</h3>' +
              '<div class="apm-subtitle-row">' +
                '<span class="apm-lvl-badge">NIVEL ' + mission.level + '</span>' +
                '<span id="apm-header-status-badge">' + (isAlreadyCompleted ? '<span class="apm-lvl-badge" style="background:#10B981;margin-right:6px;"><i class="fas fa-check-circle"></i> ⭐ COMPLETADO</span>' : '') + '</span>' +
                '<span>' + (mission.gradeName || 'Taller Maker') + ' • ' + mission.badge + '</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="apm-header-actions">' +
            '<button type="button" class="apm-btn-fullscreen" id="apm-fs-btn">' +
              '<i class="fas fa-expand"></i> Pantalla Completa' +
            '</button>' +
            '<button type="button" class="apm-close-btn" id="apm-close-btn" aria-label="Cerrar modal">&times;</button>' +
          '</div>' +
        '</div>' +

        // Barra de pestañas
        '<div class="apm-tabs-bar">' +
          '<button type="button" class="apm-tab-btn ' + (activeTab === 'presentacion' ? 'active' : '') + '" data-tab="presentacion">' +
            '<i class="fas fa-chalkboard-teacher"></i> Modo Presentación' +
          '</button>' +
          '<button type="button" class="apm-tab-btn ' + (activeTab === 'entrega' ? 'active' : '') + '" data-tab="entrega">' +
            '<i class="fas fa-cloud-upload-alt"></i> Mi Entrega' +
          '</button>' +
          '<button type="button" class="apm-tab-btn ' + (activeTab === 'solucion' ? 'active' : '') + '" data-tab="solucion">' +
            '<i class="fas fa-lightbulb"></i> Solución Oficial' +
          '</button>' +
          '<button type="button" class="apm-tab-btn ' + (activeTab === 'pdf' ? 'active' : '') + '" data-tab="pdf">' +
            '<i class="fas fa-file-pdf"></i> Guía PDF' +
          '</button>' +
        '</div>' +

        // Paneles
        '<div class="apm-panes-container">' +

          // ── PANEL 1: MODO PRESENTACIÓN (SLIDESHOW) ──
          '<div class="apm-tab-pane pane-presentacion ' + (activeTab === 'presentacion' ? 'active' : '') + '">' +
            '<div class="apm-presentation-wrapper">' +
              '<div class="apm-slide-top-nav">' +
                '<div class="apm-stn-title" id="apm-stn-title">' +
                  '<i class="fas fa-bullseye"></i> <span>Paso 1: El Reto & Objetivo</span>' +
                '</div>' +
                '<div class="apm-stn-dots">' +
                  '<span class="apm-stn-dot active" data-slide="0" title="Paso 1: Reto"></span>' +
                  '<span class="apm-stn-dot" data-slide="1" title="Paso 2: Materiales"></span>' +
                  '<span class="apm-stn-dot" data-slide="2" title="Paso 3: Código y Simulador"></span>' +
                  '<span class="apm-stn-dot" data-slide="3" title="Paso 4: Misión Cumplida"></span>' +
                '</div>' +
                '<span class="apm-stn-counter" id="apm-stn-counter">Paso 1 de 4</span>' +
              '</div>' +

              '<div class="apm-slide-viewport">' +

                // SLIDE 0: Portada & Reto
                '<div class="apm-slide-page active" data-slide-idx="0">' +
                  '<div class="apm-slide-grid-2col">' +
                    '<div class="apm-sg-img-wrap">' +
                      '<img src="' + mission.coverImage + '" alt="' + mission.title + '" class="apm-sg-img" onerror="this.src=\'img/scratchjr.png\'">' +
                    '</div>' +
                    '<div>' +
                      '<div style="font-size:0.8rem;font-weight:800;color:#6366F1;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">Desafío Maker • Nivel ' + mission.level + '</div>' +
                      '<h2 style="font-size:1.6rem;font-weight:900;color:#1E293B;margin:0 0 10px;line-height:1.2;">' + mission.title + '</h2>' +
                      '<div class="apm-reto-card">' +
                        '<h4><i class="fas fa-flag-checkered"></i> ¿Cuál es nuestra misión?</h4>' +
                        '<p>' + mission.description + '</p>' +
                      '</div>' +
                      '<div class="apm-skills-pills">' +
                        '<span class="apm-skill-pill"><i class="fas fa-lightbulb"></i> Creatividad Maker</span>' +
                        '<span class="apm-skill-pill"><i class="fas fa-cubes"></i> Lógica en Bloques</span>' +
                        '<span class="apm-skill-pill"><i class="fas fa-robot"></i> Pensamiento Computacional</span>' +
                      '</div>' +
                      '<button type="button" class="arm-btn-primary apm-next-btn-internal" style="margin-top:18px;font-size:0.9rem;padding:9px 18px;">' +
                        'Ver Materiales y Preparación <i class="fas fa-arrow-right"></i>' +
                      '</button>' +
                    '</div>' +
                  '</div>' +
                '</div>' +

                // SLIDE 1: Materiales & Componentes
                '<div class="apm-slide-page" data-slide-idx="1">' +
                  '<div style="max-width:850px;margin:0 auto;">' +
                    '<div style="text-align:center;margin-bottom:20px;">' +
                      '<h3 style="font-size:1.35rem;font-weight:900;color:#1E293B;margin:0 0 6px;">🔌 Materiales y Herramientas del Taller</h3>' +
                      '<p style="font-size:0.88rem;color:#64748B;margin:0;">Asegurate de tener todo listo antes de comenzar a programar o armar:</p>' +
                    '</div>' +
                    '<div class="apm-materials-grid">' +
                      materialsList.map(function(m){
                        return '<div class="apm-mat-card">' +
                          '<div class="apm-mat-icon"><i class="fas fa-tools"></i></div>' +
                          '<div class="apm-mat-info">' +
                            '<h5>' + m.title + '</h5>' +
                            '<p>' + (m.description || 'Componente didáctico del taller') + '</p>' +
                          '</div>' +
                        '</div>';
                      }).join('') +
                    '</div>' +
                    '<div class="apm-reto-card" style="margin-top:22px;background:#F0FDF4;border-color:#16A34A;">' +
                      '<h4 style="color:#15803D;"><i class="fas fa-lightbulb"></i> Consejo del Profesor Maker</h4>' +
                      '<p style="color:#166534;">Antes de transferir o probar el código, pensá la secuencia paso a paso: ¿Qué pasa primero? ¿Qué botón activa la acción? ¡El orden de las instrucciones es la clave!</p>' +
                    '</div>' +
                    '<div style="text-align:center;margin-top:20px;">' +
                      '<button type="button" class="arm-btn-primary apm-next-btn-internal" style="font-size:0.9rem;padding:9px 18px;">' +
                        '¡Pasar al Código y Simulador! <i class="fas fa-arrow-right"></i>' +
                      '</button>' +
                    '</div>' +
                  '</div>' +
                '</div>' +

                // SLIDE 2: Código y Simulador
                '<div class="apm-slide-page" data-slide-idx="2">' +
                  '<div style="height:100%;display:flex;flex-direction:column;gap:12px;">' +
                    '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">' +
                      '<div>' +
                        '<h3 style="font-size:1.15rem;font-weight:900;color:#1E293B;margin:0 0 2px;">💻 Taller en Vivo: Código y Simulador</h3>' +
                        '<p style="font-size:0.82rem;color:#64748B;margin:0;">Probá el programa en vivo, modificá valores o inspeccioná los bloques:</p>' +
                      '</div>' +
                      (mission.makecodeUrl ?
                        '<a href="' + mission.makecodeUrl + '" target="_blank" rel="noopener noreferrer" class="arm-btn-primary">' +
                          '<i class="fas fa-external-link-alt"></i> Abrir en MakeCode' +
                        '</a>' : '') +
                    '</div>' +

                    (mkInfo ?
                      '<div class="apm-sim-slide-wrap">' +
                        '<div class="apm-sim-slide-toolbar">' +
                          '<span><i class="fas fa-microchip"></i> Micro:bit Interactivo</span>' +
                          '<button type="button" class="arm-btn-secondary" id="apm-slide-sim-reload" style="padding:4px 10px;font-size:0.75rem;">' +
                            '<i class="fas fa-redo"></i> Reiniciar' +
                          '</button>' +
                        '</div>' +
                        '<iframe src="' + mkInfo.simUrl + '" class="apm-sim-slide-iframe" sandbox="allow-scripts allow-same-origin allow-popups" scrolling="no" frameborder="0"></iframe>' +
                      '</div>' :
                      (mission.scratchId ?
                        '<div class="apm-sim-slide-wrap">' +
                          '<iframe src="https://scratch.mit.edu/projects/' + mission.scratchId + '/embed" class="apm-sim-slide-iframe" allowtransparency="true" frameborder="0" scrolling="no" allowfullscreen></iframe>' +
                        '</div>' :
                        '<div style="background:#F8FAFC;padding:30px;border-radius:16px;text-align:center;border:1.5px dashed #CBD5E1;">' +
                          '<div style="font-size:3rem;margin-bottom:10px;">🧩</div>' +
                          '<h4 style="font-size:1.1rem;font-weight:800;color:#1E293B;">Guía práctica de construcción</h4>' +
                          '<p style="color:#64748B;max-width:500px;margin:0 auto 16px;">Este proyecto se realiza en el aula física o con fichas de trabajo descargables.</p>' +
                          '<button type="button" class="arm-btn-primary" id="apm-slide2-goto-pdf"><i class="fas fa-file-pdf"></i> Ver Guía Didáctica PDF</button>' +
                        '</div>'
                      )
                    ) +

                    '<div style="text-align:right;margin-top:6px;">' +
                      '<button type="button" class="arm-btn-primary apm-next-btn-internal">' +
                        '¡Ver Misión Cumplida y Retos Finales! <i class="fas fa-arrow-right"></i>' +
                      '</button>' +
                    '</div>' +
                  '</div>' +
                '</div>' +

                // SLIDE 3: ¡Misión Cumplida y Tu Creación!
                '<div class="apm-slide-page" data-slide-idx="3">' +
                  '<div style="max-width:850px;margin:0 auto;">' +
                    '<div class="apm-win-banner">' +
                      '<div class="apm-win-trophy">🏆</div>' +
                      '<h3 class="apm-win-title">¡Misión Cumplida en el Nivel ' + mission.level + '!</h3>' +
                      '<p class="apm-win-sub">Superaste el recorrido de <strong>' + mission.title + '</strong>. ¡Sumaste <strong>+100 XP</strong> al progreso de tu grado!</p>' +
                    '</div>' +

                    '<h4 style="font-size:1rem;font-weight:900;color:#1E293B;margin:0 0 12px;"><i class="fas fa-rocket"></i> Desafíos Extra para tu Invento:</h4>' +
                    '<div class="apm-extra-challenges">' +
                      '<div class="apm-ec-item">' +
                        '<div class="apm-ec-badge">1</div>' +
                        '<div>' +
                          '<h6>Personalizá la pantalla</h6>' +
                          '<p>Cambiá el dibujo LED, el texto de bienvenida o la velocidad del personaje.</p>' +
                        '</div>' +
                      '</div>' +
                      '<div class="apm-ec-item">' +
                        '<div class="apm-ec-badge">2</div>' +
                        '<div>' +
                          '<h6>Agregá sonido o sensores</h6>' +
                          '<p>Programá un tono musical alegre cuando el sensor detecte luz o movimiento.</p>' +
                        '</div>' +
                      '</div>' +
                      '<div class="apm-ec-item">' +
                        '<div class="apm-ec-badge">3</div>' +
                        '<div>' +
                          '<h6>Compartí tu creación</h6>' +
                          '<p>Mostrá tu invento a tus compañeros y guardá tu proyecto en tu carpeta.</p>' +
                        '</div>' +
                      '</div>' +
                    '</div>' +

                    '<div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-top:24px;flex-wrap:wrap;">' +
                      '<button type="button" class="arm-btn-primary apm-slide4-goto-entrega" style="background:#10B981;border-color:#059669;font-size:0.9rem;padding:9px 18px;">' +
                        '<i class="fas fa-cloud-upload-alt"></i> Subir Mi Creación' +
                      '</button>' +
                      '<button type="button" class="arm-btn-primary apm-slide4-goto-solucion" style="background:#7C3AED;border-color:#6D28D9;font-size:0.9rem;padding:9px 18px;">' +
                        '<i class="fas fa-lightbulb"></i> Ver Solución Oficial' +
                      '</button>' +
                      '<button type="button" class="arm-btn-secondary" id="apm-goto-pdf-btn" style="font-size:0.9rem;padding:9px 18px;">' +
                        '<i class="fas fa-file-pdf"></i> Ver Guía PDF' +
                      '</button>' +
                      '<button type="button" class="arm-btn-secondary" id="apm-restart-slides-btn" style="font-size:0.9rem;padding:9px 18px;">' +
                        '<i class="fas fa-undo"></i> Repasar Presentación' +
                      '</button>' +
                    '</div>' +
                  '</div>' +
                '</div>' +

              '</div>' + // Fin apm-slide-viewport

              // Controles de diapositiva
              '<div class="apm-slide-controls">' +
                '<button type="button" class="apm-ctrl-btn apm-ctrl-prev" id="apm-ctrl-prev" disabled>' +
                  '<i class="fas fa-chevron-left"></i> Anterior' +
                '</button>' +
                '<div class="apm-ctrl-bar">' +
                  '<div class="apm-ctrl-bar-fill" id="apm-ctrl-bar-fill" style="width:25%;"></div>' +
                '</div>' +
                '<button type="button" class="apm-ctrl-btn apm-ctrl-next" id="apm-ctrl-next">' +
                  'Siguiente <i class="fas fa-chevron-right"></i>' +
                '</button>' +
              '</div>' +
            '</div>' +
          '</div>' +

          // ── PANEL 2: MI ENTREGA ──
          '<div class="apm-tab-pane pane-entrega ' + (activeTab === 'entrega' ? 'active' : '') + '">' +
            '<div class="apm-delivery-pane-wrap">' +
              '<div class="apm-deliv-format-bar" style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 16px;background:#F8FAFC;border-radius:12px;margin-bottom:14px;border:1.5px solid #E2E8F0;flex-wrap:wrap;">' +
                '<span style="font-size:0.84rem;font-weight:800;color:#334155;"><i class="fas fa-sliders-h" style="color:#6366F1;"></i> Formato de Entrega:</span>' +
                '<div style="display:flex;gap:8px;">' +
                  '<button type="button" class="apm-deliv-switch-btn ' + (isMakecode ? 'active' : '') + '" id="apm-switch-to-mk" style="padding:6px 14px;border-radius:8px;font-size:0.8rem;font-weight:800;cursor:pointer;border:none;' + (isMakecode ? 'background:#7C3AED;color:#FFF;box-shadow:0 2px 6px rgba(124,58,237,0.3);' : 'background:#E2E8F0;color:#475569;') + '">' +
                    '<i class="fas fa-microchip"></i> Link MakeCode' +
                  '</button>' +
                  '<button type="button" class="apm-deliv-switch-btn ' + (!isMakecode ? 'active' : '') + '" id="apm-switch-to-scratch" style="padding:6px 14px;border-radius:8px;font-size:0.8rem;font-weight:800;cursor:pointer;border:none;' + (!isMakecode ? 'background:#EA580C;color:#FFF;box-shadow:0 2px 6px rgba(234,88,12,0.3);' : 'background:#E2E8F0;color:#475569;') + '">' +
                    '<i class="fas fa-cat"></i> Archivo Scratch Jr / Foto' +
                  '</button>' +
                '</div>' +
              '</div>' +

              // SUB-PANEL MAKECODE
              '<div id="apm-mk-delivery-section" style="' + (isMakecode ? 'display:block;' : 'display:none;') + '">' +
                '<div class="apm-delivery-header" style="background:linear-gradient(135deg, #4C1D95 0%, #6D28D9 100%);">' +
                  '<div class="apm-dh-icon"><i class="fas fa-microchip"></i></div>' +
                  '<div>' +
                    '<h4>Subir Proyecto MakeCode Micro:bit</h4>' +
                    '<p>Pegá el link público que generaste al hacer clic en <strong>Compartir</strong> en MakeCode para probarlo en tu simulador y enviarlo a tu profesor.</p>' +
                  '</div>' +
                '</div>' +
                '<div class="apm-delivery-body">' +
                  '<div class="apm-delivery-input-group">' +
                    '<div class="apm-delivery-input-wrap">' +
                      '<i class="fas fa-link apm-delivery-link-icon"></i>' +
                      '<input type="url" id="apm-mk-student-url" class="apm-delivery-url-input" placeholder="https://makecode.microbit.org/S18043-28109-69626-83440" value="' + (savedMakecodeUrl || '') + '">' +
                    '</div>' +
                    '<button type="button" id="apm-mk-student-save-btn" class="apm-delivery-submit-btn"><i class="fas fa-paper-plane"></i> Guardar Entrega</button>' +
                  '</div>' +
                  '<div class="apm-delivery-actions-row">' +
                    '<a href="https://makecode.microbit.org" target="_blank" rel="noopener noreferrer" class="apm-delivery-link-btn"><i class="fas fa-external-link-alt"></i> Ir al Editor de MakeCode</a>' +
                    '<span class="apm-delivery-hint"><i class="fas fa-info-circle"></i> Tip: En MakeCode tocá <strong>Compartir</strong> &gt; <strong>Publicar</strong> y copiá el enlace.</span>' +
                  '</div>' +
                  '<div id="apm-mk-delivery-status">' +
                    (savedMakecodeUrl ?
                      '<div class="apm-status-badge success" style="padding:12px 18px;border-left:4px solid #10B981;"><i class="fas fa-trophy" style="font-size:1.4rem;color:#F59E0B;"></i> <div><strong style="color:#065F46;">Misión Completada ⭐ (+100 XP)</strong><br><span style="font-size:0.84rem;color:#047857;">Tu entrega está guardada. Podés actualizar el link en cualquier momento si querés mejorar tu proyecto.</span></div></div>' : '') +
                  '</div>' +
                  '<div id="apm-mk-student-preview">' +
                    (studentMkInfo ?
                      '<div class="apm-student-sim-card">' +
                        '<div class="apm-student-sim-header">' +
                          '<span><i class="fas fa-gamepad"></i> Tu Simulador Micro:bit en Vivo</span>' +
                          '<div style="display:flex;gap:8px;">' +
                            '<button type="button" id="apm-student-sim-reload" class="mkm-sim-reload-btn"><i class="fas fa-redo"></i> Reiniciar</button>' +
                            '<a href="' + savedMakecodeUrl + '" target="_blank" rel="noopener noreferrer" class="mkm-btn-entrar" style="font-size:0.75rem;padding:4px 12px;"><i class="fas fa-external-link-alt"></i> Abrir en MakeCode</a>' +
                          '</div>' +
                        '</div>' +
                        '<div class="apm-student-sim-body">' +
                          '<iframe src="' + studentMkInfo.simUrl + '" class="apm-student-sim-frame" sandbox="allow-scripts allow-same-origin allow-popups" scrolling="no" frameborder="0"></iframe>' +
                        '</div>' +
                      '</div>' :
                      '<div class="apm-delivery-empty-state">' +
                        '<i class="fas fa-laptop-code"></i>' +
                        '<p>Cuando guardes tu link de MakeCode, aquí aparecerá tu simulador interactivo para probar tu proyecto.</p>' +
                      '</div>'
                    ) +
                  '</div>' +
                '</div>' +
              '</div>' +

              // SUB-PANEL SCRATCH JR / FOTO
              '<div id="apm-scratch-delivery-section" style="' + (!isMakecode ? 'display:block;' : 'display:none;') + '">' +
                '<div class="apm-delivery-header" style="background:linear-gradient(135deg, #C2410C 0%, #EA580C 100%);">' +
                  '<div class="apm-dh-icon"><i class="fas fa-cat"></i></div>' +
                  '<div>' +
                    '<h4>Subir Creación de Scratch Jr o Imagen</h4>' +
                    '<p>Subí tu archivo de Scratch Jr (.sjr, .sb3, .pjson, .sb) o una foto/captura de pantalla de tus personajes y bloques para guardarlo en tu carpeta.</p>' +
                  '</div>' +
                '</div>' +
                '<div class="apm-delivery-body">' +
                  '<div class="apm-scratch-dropzone" id="apm-scratch-dropzone">' +
                    '<div class="apm-sd-icon"><i class="fas fa-cloud-upload-alt"></i></div>' +
                    '<h4>Arrastrá tu archivo de Scratch Jr o imagen aquí</h4>' +
                    '<p>O hacé clic en el botón para seleccionarlo (.sjr, .sb3, .pjson, .sb, .png, .jpg)</p>' +
                    '<input type="file" id="apm-scratch-file-input" style="display:none;" accept=".sjr,.sb3,.pjson,.sb,.png,.jpg,.jpeg">' +
                    '<button type="button" id="apm-scratch-browse-btn" class="apm-delivery-submit-btn" style="background:#EA580C;"><i class="fas fa-folder-open"></i> Seleccionar Archivo</button>' +
                  '</div>' +
                  '<div id="apm-scratch-delivery-status" style="margin-top:14px;">' +
                    (savedFileName ?
                      '<div class="apm-status-badge success" style="padding:12px 18px;border-left:4px solid #10B981;"><i class="fas fa-trophy" style="font-size:1.4rem;color:#F59E0B;"></i> <div><strong style="color:#065F46;">Misión Completada ⭐ (+100 XP)</strong><br><span style="font-size:0.84rem;color:#047857;">Archivo entregado: <strong>' + savedFileName + '</strong> (' + savedFileDate + ') guardado en tu Google Drive.</span></div></div>' : '') +
                  '</div>' +
                  '<div class="apm-delivery-guide" style="margin-top:16px;">' +
                    '<h5><i class="fas fa-question-circle"></i> ¿Cómo compartir desde Scratch Jr?</h5>' +
                    '<ol>' +
                      '<li>En Scratch Jr, tocá el ícono de la casita y abrí tu proyecto.</li>' +
                      '<li>Tocá el botón amarillo en la esquina superior derecha (rueda o configuración).</li>' +
                      '<li>Elegí <strong>Compartir por archivo</strong> o tomá una captura de pantalla a tus bloques.</li>' +
                      '<li>¡Subí el archivo o la imagen aquí mismo!</li>' +
                    '</ol>' +
                  '</div>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +

          // ── PANEL 3: SOLUCIÓN OFICIAL ──
          '<div class="apm-tab-pane pane-solucion ' + (activeTab === 'solucion' ? 'active' : '') + '">' +
            (isMakecode ?
              '<div style="height:100%;display:flex;flex-direction:column;">' +
                '<div class="mkm-desc-bar" style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">' +
                  '<p style="margin:0;"><i class="fas fa-lightbulb" style="color:#EAB308;"></i> <strong>Solución Oficial:</strong> ' + (mission.title || 'Proyecto MakeCode') + '</p>' +
                  (mission.makecodeUrl ?
                    '<a class="mkm-btn-entrar" href="' + mission.makecodeUrl + '" target="_blank" rel="noopener noreferrer" style="font-size:0.8rem;padding:5px 14px;">' +
                      '<i class="fas fa-external-link-alt"></i> Abrir Solución en MakeCode' +
                    '</a>' : '') +
                '</div>' +
                '<div class="mkm-tabs-bar" style="background:#F8FAFC;padding:6px 18px;">' +
                  '<button type="button" class="apm-sol-subtab-btn active" data-sol-tab="simulador"><i class="fas fa-gamepad"></i> Simulador Oficial en Vivo</button>' +
                  '<button type="button" class="apm-sol-subtab-btn" data-sol-tab="codigo"><i class="fas fa-puzzle-piece"></i> Bloques de Código</button>' +
                '</div>' +
                '<div class="apm-sol-panes-body" style="flex:1 1 auto;position:relative;">' +
                  '<div class="apm-sol-subpane pane-simulador active" style="position:absolute;inset:0;display:flex;flex-direction:column;background:#0F172A;">' +
                    '<div class="mkm-sim-toolbar">' +
                      '<span class="mkm-st-label"><i class="fas fa-gamepad"></i> Simulador Micro:bit Interactivo (Solución)</span>' +
                      '<button type="button" class="mkm-sim-reload-btn" id="apm-sol-sim-reload-btn"><i class="fas fa-redo"></i> Reiniciar</button>' +
                    '</div>' +
                    '<div class="mkm-sim-wrap" style="flex:1 1 auto;display:flex;align-items:center;justify-content:center;">' +
                      (mkInfo ?
                        '<iframe src="' + mkInfo.simUrl + '" class="mkm-sim-iframe" id="apm-sol-sim-iframe" sandbox="allow-scripts allow-same-origin allow-popups" scrolling="no" frameborder="0"></iframe>' :
                        '<p style="color:#FFF;">Simulador no disponible</p>'
                      ) +
                    '</div>' +
                  '</div>' +
                  '<div class="apm-sol-subpane pane-codigo" style="position:absolute;inset:0;display:none;flex-direction:column;background:#FFFFFF;">' +
                    '<div class="mkm-code-toolbar">' +
                      '<span class="mkm-ct-label"><i class="fas fa-cubes"></i> Bloques de Código de la Solución</span>' +
                      '<div class="mkm-code-zoom-controls">' +
                        '<button type="button" class="mkm-zoom-btn" id="apm-sol-zoom-out" title="Reducir"><i class="fas fa-search-minus"></i></button>' +
                        '<span class="mkm-zoom-val" id="apm-sol-zoom-label">125%</span>' +
                        '<button type="button" class="mkm-zoom-btn" id="apm-sol-zoom-in" title="Aumentar"><i class="fas fa-search-plus"></i></button>' +
                        '<button type="button" class="mkm-zoom-btn" id="apm-sol-zoom-reset" title="Restablecer (125%)"><i class="fas fa-undo"></i></button>' +
                      '</div>' +
                    '</div>' +
                    '<div class="mkm-code-frame-wrap" style="flex:1 1 auto;position:relative;overflow:auto;">' +
                      (mkInfo ?
                        '<iframe src="' + mkInfo.codeEmbedUrl + '" class="mkm-code-iframe" id="apm-sol-code-iframe" sandbox="allow-scripts allow-same-origin allow-popups" scrolling="yes" frameborder="0"></iframe>' :
                        '<p>Código no disponible</p>'
                      ) +
                    '</div>' +
                  '</div>' +
                '</div>' +
              '</div>' :
              '<div class="apm-sol-scratch-wrap">' +
                '<div class="apm-sol-scratch-header">' +
                  '<div class="apm-ssh-icon"><i class="fas fa-lightbulb"></i></div>' +
                  '<div>' +
                    '<h4>Solución Oficial del Proyecto Scratch Jr</h4>' +
                    '<p>Descargá el archivo terminado con toda la programación resuelta para abrirlo en Scratch Jr o estudiar los bloques explicados a continuación.</p>' +
                  '</div>' +
                '</div>' +
                '<div class="apm-sol-scratch-body">' +
                  '<div class="apm-sol-download-card">' +
                    '<div class="apm-sol-dl-icon"><i class="fas fa-file-download"></i></div>' +
                    '<div class="apm-sol-dl-info">' +
                      '<h5>Archivo de Proyecto Oficial Terminado</h5>' +
                      '<p>Incluye los personajes animados, fondos seleccionados y la secuencia completa de bloques programados.</p>' +
                      '<span class="apm-sol-dl-filename"><i class="fas fa-file-code"></i> ' + (mission.title.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_') || 'solucion') + '.sjr</span>' +
                    '</div>' +
                    '<button type="button" id="apm-scratch-dl-sol-btn" class="apm-sol-download-btn">' +
                      '<i class="fas fa-download"></i> Descargar Solución (.sjr)' +
                    '</button>' +
                  '</div>' +
                  '<div class="apm-sol-visual-guide">' +
                    '<h5><i class="fas fa-puzzle-piece"></i> Estructura y Bloques de la Solución:</h5>' +
                    '<div class="apm-sol-steps-list">' +
                      '<div class="apm-sol-step-item">' +
                        '<div class="apm-sol-step-num">1</div>' +
                        '<div><strong>Inicio con Bandera Verde / Toque:</strong> Se coloca el bloque amarillo de bandera verde para que el personaje empiece al pulsar la bandera o al tocar la pantalla.</div>' +
                      '</div>' +
                      '<div class="apm-sol-step-item">' +
                        '<div class="apm-sol-step-num">2</div>' +
                        '<div><strong>Secuencia de Movimiento:</strong> Bloques azules de caminar 4 pasos hacia adelante y salto vertical para sortear obstáculos.</div>' +
                      '</div>' +
                      '<div class="apm-sol-step-item">' +
                        '<div class="apm-sol-step-num">3</div>' +
                        '<div><strong>Expresión y Diálogo:</strong> Bloque violeta de mensaje ("¡Hola taller!") o cambio de tamaño para mostrar la emoción del personaje.</div>' +
                      '</div>' +
                      '<div class="apm-sol-step-item">' +
                        '<div class="apm-sol-step-num">4</div>' +
                        '<div><strong>Bucle Infinito o Regreso:</strong> Bloque rojo de repetir para que la animación continúe fluidamente.</div>' +
                      '</div>' +
                    '</div>' +
                  '</div>' +
                  '<div class="apm-delivery-guide" style="margin-top:16px;">' +
                    '<h5><i class="fas fa-tablet-alt"></i> ¿Cómo abrir el archivo .sjr en tu tablet o PC?</h5>' +
                    '<p style="margin:0;font-size:0.85rem;color:#475569;line-height:1.5;">1. Descargá el archivo tocando el botón azul arriba.<br>2. Abrí Scratch Jr en tu tablet o PC.<br>3. Tocá el archivo descargado desde tus Descargas para que Scratch Jr lo importe automáticamente.</p>' +
                  '</div>' +
                '</div>' +
              '</div>'
            ) +
          '</div>' +

          // ── PANEL 4: GUÍA PDF & FICHA DIDÁCTICA ──
          '<div class="apm-tab-pane pane-pdf ' + (activeTab === 'pdf' ? 'active' : '') + '">' +
            '<div class="apm-pdf-view">' +
              '<div class="apm-pdf-toolbar">' +
                '<div class="apm-pdf-title">' +
                  '<i class="fas fa-file-pdf" style="color:#DC2626;font-size:1.1rem;"></i>' +
                  '<span>Guía Didáctica — ' + mission.title + '</span>' +
                '</div>' +
                '<div class="apm-pdf-actions">' +
                  (hasPdf ?
                    '<a href="' + (mission.downloadPdfUrl || mission.pdfUrl) + '" target="_blank" rel="noopener noreferrer" class="apm-pdf-btn apm-pdf-btn-download">' +
                      '<i class="fas fa-download"></i> Descargar PDF' +
                    '</a>' : '') +
                  '<button type="button" class="apm-pdf-btn apm-pdf-btn-print" id="apm-print-sheet-btn">' +
                    '<i class="fas fa-print"></i> Imprimir Guía' +
                  '</button>' +
                  (mission.pdfUrl ?
                    '<a href="' + mission.pdfUrl + '" target="_blank" rel="noopener noreferrer" class="apm-pdf-btn apm-pdf-btn-print">' +
                      '<i class="fas fa-external-link-alt"></i> Abrir en Google Drive' +
                    '</a>' : '') +
                '</div>' +
              '</div>' +

              '<div style="flex:1 1 auto;overflow:auto;position:relative;">' +
                (mission.pdfUrl ?
                  '<iframe src="' + mission.pdfUrl + '#toolbar=0" class="apm-pdf-frame" style="width:100%;height:100%;border:none;"></iframe>' :
                  '<div class="apm-printable-sheet" id="apm-printable-sheet">' +
                    '<div class="apm-ps-header">' +
                      '<div>' +
                        '<div class="apm-ps-logo">🏫 Colegio Paulo Freire — Taller de Programación y Robótica</div>' +
                        '<h2 style="font-size:1.35rem;font-weight:900;color:#1E293B;margin:6px 0 2px;">Nivel ' + mission.level + ' • ' + mission.title + '</h2>' +
                        '<div style="font-size:0.85rem;color:#64748B;">Grado: <strong>' + (mission.gradeName || 'General') + '</strong> | Modalidad: Taller Maker</div>' +
                      '</div>' +
                      '<img src="' + qrCodeUrl + '" alt="QR Proyecto" style="width:72px;height:72px;border:1px solid #CBD5E1;border-radius:8px;padding:3px;">' +
                    '</div>' +

                    '<div class="apm-ps-section-title"><i class="fas fa-bullseye"></i> 1. Objetivo del Proyecto</div>' +
                    '<p style="font-size:0.9rem;line-height:1.5;color:#334155;margin:0 0 14px;">' + mission.description + '</p>' +

                    '<div class="apm-ps-section-title"><i class="fas fa-tools"></i> 2. Materiales y Recursos</div>' +
                    '<ul style="font-size:0.88rem;color:#334155;margin:0 0 16px;padding-left:22px;line-height:1.5;">' +
                      materialsList.map(function(m){ return '<li><strong>' + m.title + ':</strong> ' + (m.description||'') + '</li>'; }).join('') +
                    '</ul>' +

                    '<div class="apm-ps-section-title"><i class="fas fa-clipboard-check"></i> 3. Pasos de Realización</div>' +
                    '<ol style="font-size:0.88rem;color:#334155;margin:0 0 18px;padding-left:22px;line-height:1.6;">' +
                      '<li><strong>Diseño previo:</strong> Dibujar en papel el personaje o el sensor que vamos a programar.</li>' +
                      '<li><strong>Programación:</strong> Abrir el editor de código en MakeCode o Scratch y colocar los bloques secuenciales.</li>' +
                      '<li><strong>Simulación:</strong> Probar en el simulador digital que las acciones respondan correctamente al pulsar los botones.</li>' +
                      '<li><strong>Transferencia:</strong> Conectar la placa micro:bit por USB o guardar el proyecto en el panel del alumno.</li>' +
                    '</ol>' +

                    '<div style="border-top:1.5px dashed #CBD5E1;padding-top:14px;display:flex;justify-content:space-between;align-items:center;font-size:0.8rem;color:#64748B;">' +
                      '<span>Escaneá el código QR con el celular para abrir el simulador en vivo.</span>' +
                      '<span>Colegio Paulo Freire 2026</span>' +
                    '</div>' +
                  '</div>'
                ) +
              '</div>' +
            '</div>' +
          '</div>' +

        '</div>' + // Fin apm-panes-container
      '</div>';

    // ── Bindings ──
    modal.querySelector('#apm-close-btn').onclick = closeAdventureModal;
    modal.querySelector('#apm-fs-btn').onclick = toggleFullscreen;
    modal.onclick = function(e){ if (e.target === modal) closeAdventureModal(); };
    document.addEventListener('keydown', handleKeyDown);

    // Función para cambiar de pestaña principal
    function switchApmTab(tabName) {
      if (window.sounds) window.sounds.playClick();
      activeTab = tabName;
      modal.querySelectorAll('.apm-tab-btn').forEach(function(b){ b.classList.toggle('active', b.dataset.tab === activeTab); });
      modal.querySelectorAll('.apm-tab-pane').forEach(function(p){ p.classList.toggle('active', p.classList.contains('pane-' + activeTab)); });
    }

    // Botones de pestañas principales
    modal.querySelectorAll('.apm-tab-btn').forEach(function(btn){
      btn.onclick = function(){
        switchApmTab(btn.dataset.tab);
      };
    });

    // Slideshow: Lógica de navegación
    var slideTitles = [
      '🎯 Paso 1: El Reto & Objetivo',
      '🔌 Paso 2: Materiales & Conceptos',
      '💻 Paso 3: Código & Simulador en Vivo',
      '🏆 Paso 4: ¡Misión Cumplida y Tu Creación!'
    ];

    function goToSlide(idx) {
      if (window.sounds) window.sounds.playClick();
      currentSlide = Math.max(0, Math.min(totalSlides - 1, idx));

      // Actualizar vista de slides
      modal.querySelectorAll('.apm-slide-page').forEach(function(p, i){
        p.classList.toggle('active', i === currentSlide);
      });

      // Actualizar dots
      modal.querySelectorAll('.apm-stn-dot').forEach(function(d, i){
        d.classList.toggle('active', i === currentSlide);
      });

      // Actualizar título y contador
      var titleEl = modal.querySelector('#apm-stn-title');
      if (titleEl) titleEl.innerHTML = '<i class="fas fa-chevron-circle-right"></i> <span>' + slideTitles[currentSlide] + '</span>';

      var counterEl = modal.querySelector('#apm-stn-counter');
      if (counterEl) counterEl.textContent = 'Paso ' + (currentSlide + 1) + ' de ' + totalSlides;

      // Actualizar barra de progreso
      var barFill = modal.querySelector('#apm-ctrl-bar-fill');
      if (barFill) barFill.style.width = (((currentSlide + 1) / totalSlides) * 100) + '%';

      // Actualizar estado de botones prev/next
      var prevBtn = modal.querySelector('#apm-ctrl-prev');
      var nextBtn = modal.querySelector('#apm-ctrl-next');
      if (prevBtn) prevBtn.disabled = (currentSlide === 0);
      if (nextBtn) {
        if (currentSlide === totalSlides - 1) {
          nextBtn.innerHTML = '<i class="fas fa-trophy"></i> ¡Finalizar!';
        } else {
          nextBtn.innerHTML = 'Siguiente <i class="fas fa-chevron-right"></i>';
        }
      }
    }

    // Botones Anterior / Siguiente
    var prevBtn = modal.querySelector('#apm-ctrl-prev');
    var nextBtn = modal.querySelector('#apm-ctrl-next');
    if (prevBtn) prevBtn.onclick = function(){ if (currentSlide > 0) goToSlide(currentSlide - 1); };
    if (nextBtn) {
      nextBtn.onclick = function(){
        if (currentSlide < totalSlides - 1) {
          goToSlide(currentSlide + 1);
        } else {
          if (window.sounds && window.sounds.playSuccess) window.sounds.playSuccess();
          else if (window.sounds) window.sounds.playClick();
          var pdfTabBtn = modal.querySelector('.apm-tab-btn[data-tab="pdf"]');
          if (pdfTabBtn) pdfTabBtn.click();
        }
      };
    }

    // Dots interactivos
    modal.querySelectorAll('.apm-stn-dot').forEach(function(d){
      d.onclick = function(){ goToSlide(parseInt(d.dataset.slide, 10)); };
    });

    // Botones internos para avanzar
    modal.querySelectorAll('.apm-next-btn-internal').forEach(function(b){
      b.onclick = function(){ goToSlide(currentSlide + 1); };
    });

    var restartBtn = modal.querySelector('#apm-restart-slides-btn');
    if (restartBtn) restartBtn.onclick = function(){ goToSlide(0); };

    var gotoPdfBtn = modal.querySelector('#apm-goto-pdf-btn');
    if (gotoPdfBtn) {
      gotoPdfBtn.onclick = function(){
        switchApmTab('pdf');
      };
    }

    var s4EntregaBtn = modal.querySelector('.apm-slide4-goto-entrega');
    if (s4EntregaBtn) {
      s4EntregaBtn.onclick = function(){
        switchApmTab('entrega');
      };
    }

    var s4SolucionBtn = modal.querySelector('.apm-slide4-goto-solucion');
    if (s4SolucionBtn) {
      s4SolucionBtn.onclick = function(){
        switchApmTab('solucion');
      };
    }

    var slide2GotoPdf = modal.querySelector('#apm-slide2-goto-pdf');
    if (slide2GotoPdf) {
      slide2GotoPdf.onclick = function(){
        switchApmTab('pdf');
      };
    }

    // Botón reiniciar simulador en Slide 2
    var slideSimReload = modal.querySelector('#apm-slide-sim-reload');
    if (slideSimReload && mkInfo) {
      slideSimReload.onclick = function(){
        if (window.sounds) window.sounds.playClick();
        var simIf = modal.querySelector('.apm-sim-slide-iframe');
        if (simIf) simIf.src = mkInfo.simUrl;
      };
    }

    // Botón Imprimir Ficha
    var printBtn = modal.querySelector('#apm-print-sheet-btn');
    if (printBtn) {
      printBtn.onclick = function(){
        if (window.sounds) window.sounds.playClick();
        window.print();
      };
    }

    // ── CONTROLADORES DE PESTAÑA: MI ENTREGA (DUAL: MAKECODE & SCRATCH/FOTO) ──
    var switchToMk = modal.querySelector('#apm-switch-to-mk');
    var switchToScratch = modal.querySelector('#apm-switch-to-scratch');
    var secMk = modal.querySelector('#apm-mk-delivery-section');
    var secScratch = modal.querySelector('#apm-scratch-delivery-section');

    function setDeliveryMode(mode) {
      if (secMk) secMk.style.display = (mode === 'mk' ? 'block' : 'none');
      if (secScratch) secScratch.style.display = (mode === 'scratch' ? 'block' : 'none');
      if (switchToMk) {
        switchToMk.style.background = (mode === 'mk' ? '#7C3AED' : '#E2E8F0');
        switchToMk.style.color = (mode === 'mk' ? '#FFF' : '#475569');
        switchToMk.style.boxShadow = (mode === 'mk' ? '0 2px 6px rgba(124,58,237,0.3)' : 'none');
      }
      if (switchToScratch) {
        switchToScratch.style.background = (mode === 'scratch' ? '#EA580C' : '#E2E8F0');
        switchToScratch.style.color = (mode === 'scratch' ? '#FFF' : '#475569');
        switchToScratch.style.boxShadow = (mode === 'scratch' ? '0 2px 6px rgba(234,88,12,0.3)' : 'none');
      }
    }

    if (switchToMk) switchToMk.onclick = function(){ if (window.sounds) window.sounds.playClick(); setDeliveryMode('mk'); };
    if (switchToScratch) switchToScratch.onclick = function(){ if (window.sounds) window.sounds.playClick(); setDeliveryMode('scratch'); };

    // --- Subida / Guardado MakeCode ---
    var mkStudentSaveBtn = modal.querySelector('#apm-mk-student-save-btn');
    var mkStudentUrlInput = modal.querySelector('#apm-mk-student-url');

    if (mkStudentSaveBtn && mkStudentUrlInput) {
      mkStudentSaveBtn.onclick = function() {
        var rawUrl = (mkStudentUrlInput.value || '').trim();
        if (!rawUrl) {
          alert('Por favor pegá el link de tu proyecto en MakeCode.');
          return;
        }
        var info = extractMakecodeInfo(rawUrl);
        if (!info) {
          if (window.sounds) window.sounds.playError();
          alert('El link ingresado no es válido. Debe ser un enlace de MakeCode compartido (por ejemplo: https://makecode.microbit.org/S18043-...).');
          return;
        }

        if (window.sounds) window.sounds.playSuccess();
        var nowStr = new Date().toLocaleDateString('es-ES');
        var submissionData = {
          makecodeUrl: rawUrl,
          date: nowStr,
          type: 'makecode',
          missionId: mission.id,
          missionTitle: mission.title
        };

        // Registrar en FOLDER_CONTENTS.proyecto.items si aún no está
        if (!FOLDER_CONTENTS.proyecto.items.some(function(it){ return it.url === rawUrl || it.shareUrl === rawUrl; })) {
          FOLDER_CONTENTS.proyecto.items.unshift({
            name: mission.title,
            title: '💻 ' + mission.title,
            size: 'MakeCode',
            date: nowStr,
            type: 'makecode',
            url: rawUrl,
            shareUrl: rawUrl,
            isLocalPending: true
          });
        }

        // Si esta misión ya estaba completada con OTRO link, avanzar a la siguiente misión pendiente
        var targetMissionId = mission.id;
        var nextMissionTarget = null;
        if (isAlreadyCompleted && savedMakecodeUrl && savedMakecodeUrl !== rawUrl) {
          var allMissions = getAdventureMissionsForStudent(student);
          nextMissionTarget = allMissions.find(function(m){ return m.id !== mission.id && !isMissionCompleted(student, m.id); });
          if (nextMissionTarget) {
            targetMissionId = nextMissionTarget.id;
            submissionData.missionId = targetMissionId;
            submissionData.missionTitle = nextMissionTarget.title;
          }
        }

        // Guardar y marcar como completada
        markMissionCompleted(student, targetMissionId, submissionData);
        mission.status = 'completado';
        if (nextMissionTarget) nextMissionTarget.status = 'completado';

        // Actualizar insignia en el encabezado del modal a ⭐ COMPLETADO
        var headerBadge = modal.querySelector('#apm-header-status-badge');
        if (headerBadge) {
          headerBadge.innerHTML = '<span class="apm-lvl-badge" style="background:#10B981;margin-right:6px;"><i class="fas fa-check-circle"></i> ⭐ COMPLETADO</span>';
        }

        var statusEl = modal.querySelector('#apm-mk-delivery-status');
        if (statusEl) {
          var congratsText = nextMissionTarget
            ? '¡Excelente! Como ya habías entregado esta misión, tu nuevo enlace completó <strong>' + nextMissionTarget.title + '</strong> (Nivel ' + nextMissionTarget.level + ') ⭐ (+100 XP extras sumados).'
            : '¡Entrega guardada con éxito! Tu profesor ya puede ver tu proyecto en el simulador y sumaste +100 XP al Progreso del Taller.';

          statusEl.innerHTML =
            '<div class="apm-status-badge success" style="padding:12px 18px;border-left:4px solid #10B981;">' +
              '<i class="fas fa-trophy" style="font-size:1.4rem;color:#F59E0B;"></i> ' +
              '<div>' +
                '<strong style="color:#065F46;">Misión Completada ⭐ (+100 XP)</strong><br>' +
                '<span style="font-size:0.84rem;color:#047857;">' + congratsText + '</span>' +
              '</div>' +
            '</div>';
        }

        // Refrescar panel de fondo para actualizar el progreso y tarjetas inmediatamente
        refreshDashboard();

        var previewEl = modal.querySelector('#apm-mk-student-preview');
        if (previewEl) {
          previewEl.innerHTML =
            '<div class="apm-student-sim-card">' +
              '<div class="apm-student-sim-header">' +
                '<span><i class="fas fa-gamepad"></i> Tu Simulador Micro:bit en Vivo</span>' +
                '<div style="display:flex;gap:8px;">' +
                  '<button type="button" id="apm-student-sim-reload" class="mkm-sim-reload-btn"><i class="fas fa-redo"></i> Reiniciar</button>' +
                  '<a href="' + rawUrl + '" target="_blank" rel="noopener noreferrer" class="mkm-btn-entrar" style="font-size:0.75rem;padding:4px 12px;"><i class="fas fa-external-link-alt"></i> Abrir en MakeCode</a>' +
                '</div>' +
              '</div>' +
              '<div class="apm-student-sim-body">' +
                '<iframe src="' + info.simUrl + '" class="apm-student-sim-frame" sandbox="allow-scripts allow-same-origin allow-popups" scrolling="no" frameborder="0"></iframe>' +
              '</div>' +
            '</div>';

          var sRel = previewEl.querySelector('#apm-student-sim-reload');
          if (sRel) {
            sRel.onclick = function() {
              if (window.sounds) window.sounds.playClick();
              var f = previewEl.querySelector('.apm-student-sim-frame');
              if (f) f.src = info.simUrl;
            };
          }
        }
      };
    }

    var existingStudentSimReload = modal.querySelector('#apm-student-sim-reload');
    if (existingStudentSimReload && studentMkInfo) {
      existingStudentSimReload.onclick = function() {
        if (window.sounds) window.sounds.playClick();
        var f = modal.querySelector('.apm-student-sim-frame');
        if (f) f.src = studentMkInfo.simUrl;
      };
    }

    // --- Subida / Drag & Drop Scratch Jr o Foto ---
    var scratchDropzone = modal.querySelector('#apm-scratch-dropzone');
    var scratchFileInput = modal.querySelector('#apm-scratch-file-input');
    var scratchBrowseBtn = modal.querySelector('#apm-scratch-browse-btn');
    var scratchStatusEl = modal.querySelector('#apm-scratch-delivery-status');

    if (scratchBrowseBtn && scratchFileInput) {
      scratchBrowseBtn.onclick = function() {
        scratchFileInput.click();
      };
    }

    function processScratchUpload(file) {
      if (!file) return;
      var name = file.name.toLowerCase();
      var valid = /\.(sjr|sb3|pjson|sb|png|jpe?g)$/i.test(name);
      if (!valid) {
        if (window.sounds) window.sounds.playError();
        alert('Formato no válido. Por favor seleccioná un archivo de Scratch Jr (.sjr, .sb3, .pjson, .sb) o una imagen (.png, .jpg)');
        return;
      }
      if (window.sounds) window.sounds.playSuccess();
      var sz = formatFileSize(file.size);
      if (scratchStatusEl) {
        scratchStatusEl.innerHTML = '<div class="apm-status-badge warning"><i class="fas fa-sync-alt fa-spin"></i> Guardando <strong>' + file.name + '</strong> (' + sz + ')...</div>';
      }

      var reader = new FileReader();
      reader.onload = function(ev) {
        var b64 = ev.target.result.split(',')[1];
        var hook = (student && student.webhookUrl) || window.GOOGLE_DRIVE_WEBHOOK_URL;
        if (hook && student) {
          var iframe = document.getElementById('gdrive_silent_upload_iframe');
          if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.name = iframe.id = 'gdrive_silent_upload_iframe';
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
          }
          var form = document.createElement('form');
          form.target = 'gdrive_silent_upload_iframe';
          form.method = 'POST';
          form.action = hook;
          var fields = { filename: file.name, mimeType: file.type || 'application/octet-stream', base64: b64, folderId: student.driveFolderId || '', subfolder: 'proyecto' };
          for (var k in fields) {
            var inp = document.createElement('input');
            inp.type = 'hidden';
            inp.name = k;
            inp.value = fields[k];
            form.appendChild(inp);
          }
          document.body.appendChild(form);
          form.submit();
          setTimeout(function(){ form.remove(); }, 2500);
        }

        var nowStr = new Date().toLocaleDateString('es-ES');
        var submissionData = {
          fileName: file.name,
          fileSize: sz,
          date: nowStr,
          type: 'scratch',
          missionId: mission.id,
          missionTitle: mission.title
        };

        // Registrar en FOLDER_CONTENTS.proyecto.items
        if (!FOLDER_CONTENTS.proyecto.items.some(function(it){ return it.name === file.name; })) {
          FOLDER_CONTENTS.proyecto.items.unshift({
            name: file.name,
            title: '🐱 ' + file.name.replace(/\.[^.]+$/, ''),
            size: sz,
            date: nowStr,
            type: 'scratch',
            isLocalPending: true
          });
        }

        // Si esta misión ya estaba completada con OTRO archivo, completar la siguiente misión disponible
        var targetMissionId = mission.id;
        var nextMissionTarget = null;
        if (isAlreadyCompleted && savedFileName && savedFileName !== file.name) {
          var allMissions = getAdventureMissionsForStudent(student);
          nextMissionTarget = allMissions.find(function(m){ return m.id !== mission.id && !isMissionCompleted(student, m.id); });
          if (nextMissionTarget) {
            targetMissionId = nextMissionTarget.id;
            submissionData.missionId = targetMissionId;
            submissionData.missionTitle = nextMissionTarget.title;
          }
        }

        // Guardar y marcar como completada
        markMissionCompleted(student, targetMissionId, submissionData);
        mission.status = 'completado';
        if (nextMissionTarget) nextMissionTarget.status = 'completado';

        // Actualizar insignia en el encabezado del modal a ⭐ COMPLETADO
        var headerBadge = modal.querySelector('#apm-header-status-badge');
        if (headerBadge) {
          headerBadge.innerHTML = '<span class="apm-lvl-badge" style="background:#10B981;margin-right:6px;"><i class="fas fa-check-circle"></i> ⭐ COMPLETADO</span>';
        }

        if (scratchStatusEl) {
          var congratsText = nextMissionTarget
            ? '¡Excelente! Como ya habías entregado esta misión, tu nuevo archivo <strong>' + file.name + '</strong> completó <strong>' + nextMissionTarget.title + '</strong> (Nivel ' + nextMissionTarget.level + ') ⭐ (+100 XP extras sumados).'
            : '¡Proyecto entregado! Archivo: <strong>' + file.name + '</strong> (' + sz + ' • ' + nowStr + ') guardado en tu Google Drive. ¡Sumaste +100 XP al Progreso del Taller!';

          scratchStatusEl.innerHTML =
            '<div class="apm-status-badge success" style="padding:12px 18px;border-left:4px solid #10B981;">' +
              '<i class="fas fa-trophy" style="font-size:1.4rem;color:#F59E0B;"></i> ' +
              '<div>' +
                '<strong style="color:#065F46;">Misión Completada ⭐ (+100 XP)</strong><br>' +
                '<span style="font-size:0.84rem;color:#047857;">' + congratsText + '</span>' +
              '</div>' +
            '</div>';
        }

        // Refrescar panel de fondo para actualizar el progreso y tarjetas inmediatamente
        refreshDashboard();
      };
      reader.readAsDataURL(file);
    }

    if (scratchFileInput) {
      scratchFileInput.onchange = function() {
        if (scratchFileInput.files && scratchFileInput.files.length > 0) {
          processScratchUpload(scratchFileInput.files[0]);
        }
      };
    }

    if (scratchDropzone) {
      scratchDropzone.addEventListener('dragover', function(e){ e.preventDefault(); scratchDropzone.classList.add('drag-over'); }, false);
      scratchDropzone.addEventListener('dragleave', function(e){ e.preventDefault(); scratchDropzone.classList.remove('drag-over'); }, false);
      scratchDropzone.addEventListener('drop', function(e){
        e.preventDefault();
        scratchDropzone.classList.remove('drag-over');
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          processScratchUpload(e.dataTransfer.files[0]);
        }
      }, false);
    }

    // ── CONTROLADORES DE PESTAÑA: SOLUCIÓN OFICIAL ──
    if (isMakecode) {
      // Sub-pestañas Simulador vs Código
      modal.querySelectorAll('.apm-sol-subtab-btn').forEach(function(b){
        b.onclick = function(){
          if (window.sounds) window.sounds.playClick();
          var targetTab = b.dataset.solTab;
          modal.querySelectorAll('.apm-sol-subtab-btn').forEach(function(x){ x.classList.toggle('active', x === b); });
          modal.querySelectorAll('.apm-sol-subpane').forEach(function(p){
            p.classList.toggle('active', p.classList.contains('pane-' + targetTab));
          });
        };
      });

      var solSimReload = modal.querySelector('#apm-sol-sim-reload-btn');
      if (solSimReload && mkInfo) {
        solSimReload.onclick = function(){
          if (window.sounds) window.sounds.playClick();
          var sf = modal.querySelector('#apm-sol-sim-iframe');
          if (sf) sf.src = mkInfo.simUrl;
        };
      }

      // Zoom en código de solución
      if (mkInfo) {
        var solZoom = 1.25;
        var solCodeIf = modal.querySelector('#apm-sol-code-iframe');
        var solZoomLbl = modal.querySelector('#apm-sol-zoom-label');
        function applySolZoom(z) {
          solZoom = Math.max(0.75, Math.min(2.5, Math.round(z * 100) / 100));
          if (solCodeIf) {
            solCodeIf.style.transform = 'scale(' + solZoom + ')';
            solCodeIf.style.transformOrigin = 'top left';
            solCodeIf.style.width = (100 / solZoom) + '%';
            solCodeIf.style.height = (100 / solZoom) + '%';
          }
          if (solZoomLbl) solZoomLbl.textContent = Math.round(solZoom * 100) + '%';
        }
        applySolZoom(1.25);

        var sZoomIn = modal.querySelector('#apm-sol-zoom-in');
        var sZoomOut = modal.querySelector('#apm-sol-zoom-out');
        var sZoomReset = modal.querySelector('#apm-sol-zoom-reset');
        if (sZoomIn) sZoomIn.onclick = function(){ if (window.sounds) window.sounds.playClick(); applySolZoom(solZoom + 0.2); };
        if (sZoomOut) sZoomOut.onclick = function(){ if (window.sounds) window.sounds.playClick(); applySolZoom(solZoom - 0.2); };
        if (sZoomReset) sZoomReset.onclick = function(){ if (window.sounds) window.sounds.playClick(); applySolZoom(1.25); };
      }
    } else {
      // Scratch Jr: Descarga de archivo de solución
      var scratchDlSolBtn = modal.querySelector('#apm-scratch-dl-sol-btn');
      if (scratchDlSolBtn) {
        scratchDlSolBtn.onclick = function() {
          if (window.sounds) window.sounds.playSuccess();
          var cleanTitle = mission.title.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_') || 'proyecto_solucion';
          if (mission.solutionUrl) {
            window.open(mission.solutionUrl, '_blank');
          } else {
            // Generar archivo .sjr válido con estructura estándar de Scratch Jr
            var sjrData = {
              app: "ScratchJr",
              version: "1.2",
              name: mission.title,
              description: mission.description || "Solución oficial del proyecto",
              date: new Date().toISOString(),
              pages: [
                {
                  name: "Página 1",
                  background: "aula_taller",
                  sprites: [
                    {
                      name: "Robot Emociones",
                      x: 240,
                      y: 180,
                      scripts: [
                        { event: "onGreenFlag", blocks: ["forward 4", "jump", "say Hello", "repeat"] }
                      ]
                    }
                  ]
                }
              ]
            };
            var blob = new Blob([JSON.stringify(sjrData, null, 2)], { type: 'application/json' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = cleanTitle + '.sjr';
            document.body.appendChild(a);
            a.click();
            setTimeout(function(){ document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
          }
        };
      }
    }

    modal.classList.add('active');
  }

  window.openAdventureProjectModal = openAdventureProjectModal;

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

    function isValidFormat(file) {
      if (!file || !file.name) return false;
      var name = file.name.toLowerCase();
      if (subfolder === 'dibujo') {
        // Formatos permitidos para dibujo: bmp, png, jpg, jpeg
        return /\.(bmp|png|jpe?g)$/i.test(name) || /^(image\/(png|jpeg|pjpeg|bmp|x-ms-bmp))$/i.test(file.type || '');
      } else if (subfolder === 'proyecto') {
        // Formatos permitidos para Scratch Jr: .sb3, .sjr, .pjson, .sb
        return /\.(sb3|sjr|pjson|sb)$/i.test(name);
      }
      return true;
    }

    function go(file) {
      if (!file) return;

      // Validación estricta de formato
      if (!isValidFormat(file)) {
        if (window.sounds) window.sounds.playError();
        if (statusToast) {
          statusToast.classList.remove('hidden');
          var allowedText = (subfolder === 'dibujo')
            ? 'dibujos (.bmp, .png, .jpg)'
            : 'proyectos Scratch (.sb3, .sjr, .pjson, .sb)';
          statusToast.innerHTML =
            '<div class="gdz-auto-status" style="border-color:#EF4444;background:#FEF2F2;">' +
              '<div class="gdz-auto-spinner" style="color:#EF4444;"><i class="fas fa-exclamation-triangle"></i></div>' +
              '<div class="gdz-auto-text">' +
                '<h5 style="color:#991B1B;">Formato no válido</h5>' +
                '<span style="color:#B91C1C;">Solo podés subir ' + allowedText + '</span>' +
              '</div>' +
            '</div>';
          setTimeout(function() {
            statusToast.classList.add('hidden');
          }, 3500);
        }
        if (fileInput) fileInput.value = '';
        return;
      }

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
          // Marcar la siguiente misión pendiente en la Ruta de Aventuras como completada
          var advMissions = getAdventureMissionsForStudent(student);
          var nextMission = advMissions.find(function(m){ return !isMissionCompleted(student, m.id); });
          if (nextMission) {
            markMissionCompleted(student, nextMission.id, {
              fileName: file.name,
              fileSize: sz,
              date: nowStr,
              type: 'scratch',
              missionId: nextMission.id,
              missionTitle: nextMission.title
            });
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
    hasFetchedDriveFiles=hasFetchedProjectFiles=hasFetchedProyectoFiles=hasFetchedActividadesFiles=false;
    isLoadingDriveFiles=isLoadingProjectFiles=isLoadingProyectoFiles=isLoadingActividadesFiles=false;
    activeFolderKey='dibujos'; proyectoSubTab='scratch'; currentCarouselIndex=0;
    FOLDER_CONTENTS.dibujos.items=[];
    FOLDER_CONTENTS.proyectos.items=[];
    FOLDER_CONTENTS.proyecto.items=[];
    FOLDER_CONTENTS.actividades.items=[];
    FOLDER_CONTENTS.actividades.generalItems=[];
    renderGDriveDashboard('student-drive-dashboard-container');
    renderGDriveDashboard('gdrive-explorer-container');
  });

  window.renderGDriveDashboard = renderGDriveDashboard;
  window.renderGDriveExplorer  = renderGDriveDashboard;
})();

