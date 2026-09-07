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
    proyectos:   { name: '🗺️ Ruta de Aventuras', icon: 'fa-compass',        items: [] },
    juegos:      { name: '🎮 Juegos del Grado',  icon: 'fa-gamepad',        items: [] },
    dibujos:     { name: '🎨 Dibujos',             icon: 'fa-paint-brush',    items: [] },
    proyecto:    { name: '📁 Proyectos',           icon: 'fa-folder-open',    items: [] },
    actividades: { name: '🏠 Actividades de casa', icon: 'fa-house-user',     items: [], generalItems: [] },
    familiar:    { name: '👨‍👩‍👧 Actividad familiar',   icon: 'fa-heart',          items: [] }
  };

  let activeFolderKey            = 'proyectos';
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

          // Rescate automático: Si existen proyectos Scratch o MakeCode en la carpeta Dibujo (de subidas previas),
          // integrarlos en Proyectos para que se contabilicen y no se pierdan
          var scratchInDibujo = data.files.filter(function(f){
            return isScratchFile(f.name) || isMakecodeFile(f.name);
          });
          scratchInDibujo.forEach(function(f){
            if (!FOLDER_CONTENTS.proyecto.items.some(function(it){ return it.name === f.name; })) {
              FOLDER_CONTENTS.proyecto.items.push({
                id: f.id,
                name: f.name,
                title: (isScratchFile(f.name) ? '🐱 ' : '💻 ') + f.name.replace(/\.[^.]+$/,''),
                type: isScratchFile(f.name) ? 'scratch' : 'makecode',
                size: f.size || '—',
                date: f.date || '—',
                url: f.downloadUrl || (f.id ? 'https://drive.google.com/uc?export=download&id=' + f.id : ''),
                downloadUrl: f.downloadUrl || (f.id ? 'https://drive.google.com/uc?export=download&id=' + f.id : '')
              });
            }
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
  // FETCH: Proyecto del alumno (subfolder=proyectos)
  // Trae y filtra ÚNICAMENTE archivos válidos de proyecto (Scratch Jr o MakeCode)
  // ──────────────────────────────────────────────────
  function fetchProyectoFiles(student, containerId) {
    var hook = student.webhookUrl || window.GOOGLE_DRIVE_WEBHOOK_URL;
    if (!hook || isLoadingProyectoFiles) return;
    isLoadingProyectoFiles = true;
    renderGDriveDashboard(containerId);
    fetch(hook + '?action=list&folderId=' + student.driveFolderId + '&subfolder=proyectos')
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
        var isCodeorg  = p.type === 'codeorg' || p.platform === 'codeorg' || !!p.gameUrl || (p.externalUrl && p.externalUrl.includes('code.org'));
        var isElectronica = !isCodeorg && (p.type === 'electronica' || p.isElectronica || (p.tags && p.tags.some(function(t){ return /electr[oó]nica|circuito|sin programaci[oó]n|papertronics/i.test(t); })) || (!p.makecodeUrl && !p.scratchId && p.materials && p.materials.some(function(m){ return /led|pila|bater[ií]a|cobre|circuito|motor/i.test((m.title||'') + ' ' + (m.description||'')); })));
        var type  = isCodeorg ? 'codeorg' : (isElectronica ? 'electronica' : (isMakecode ? 'makecode' : (isScratch ? 'scratch' : 'robotica')));
        var badge = isCodeorg ? '🎮 Programación & Algoritmos' : (isElectronica ? '⚡ Circuito Electrónico' : (isMakecode ? '🕹️ MakeCode Arcade' : (isScratch ? '🐱 Scratch' : '🚀 Proyecto Maker')));
        var icon  = isCodeorg ? 'fa-puzzle-piece' : (isElectronica ? 'fa-bolt' : (isMakecode ? 'fa-gamepad' : (isScratch ? 'fa-cat' : 'fa-rocket')));
        var color = isCodeorg ? '#E11D48' : (isElectronica ? '#D97706' : (gradeObj.color || '#2563EB'));

        missions.push({
          id: p.id || ('proj-' + idx),
          level: p.level || levelCount++,
          title: p.title,
          subtitle: p.author ? ('Por ' + p.author) : (gradeObj.name),
          description: p.description || (isElectronica ? 'Construí un circuito funcional con materiales del taller sin necesidad de programar.' : 'Desafío y proyecto de programación del grado.'),
          objective: p.objective || null,
          benefits: p.benefits || null,
          gameUrl: p.gameUrl || p.externalUrl || null,
          externalUrl: p.externalUrl || p.gameUrl || null,
          type: type,
          badge: badge,
          icon: icon,
          color: color,
          stars: 3,
          status: 'desafio',
          coverImage: p.coverImage || (p.gallery && p.gallery[0]) || (isElectronica ? 'img/microbit.png' : 'img/scratchjr.png'),
          gallery: p.gallery || [],
          pdfUrl: p.pdfUrl || null,
          downloadPdfUrl: p.pdfUrl || null,
          makecodeUrl: p.makecodeUrl || null,
          scratchId: p.scratchId || null,
          materials: p.materials || (isElectronica ? [
            { title: 'Diodo LED 5mm', description: 'Emite luz (patita larga = + ánodo, patita corta = - cátodo)' },
            { title: 'Pila de botón CR2032 (3V)', description: 'Fuente de energía para alimentar el circuito de forma segura' },
            { title: 'Cinta de cobre conductora o cables', description: 'Pistas o caminos por donde viaja la electricidad' },
            { title: 'Clip metálico para papel', description: 'Funciona como interruptor casero de encendido y apagado' },
            { title: 'Cartulina o cartón y cinta adhesiva', description: 'Base para montar el circuito' }
          ] : [
            { title: 'Computadora o Tablet', description: 'Para programar y probar el proyecto' },
            { title: 'Materiales del Taller', description: 'Papel, colores y tarjetas para bocetos' }
          ]),
          instructions: p.instructions || p.steps || null,
          schematic: p.schematic || null,
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
      return isScratchFile(f.name) || isMakecodeFile(f.name) || f.type==='scratch' || f.type==='makecode' || f.type==='circuito' || f.type==='electronica' || /\.(bmp|png|jpe?g|webp|mp4|mov)$/i.test(f.name);
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

    var sala5SpecialBannerHtml = '';
    if (student.gradeId === 'sala5') {
      sala5SpecialBannerHtml =
        '<div class="arm-sala5-spotlight-card">' +
          '<div class="arm-s5-badge-top">' +
            '<img src="img/escudo_paulo_freire.png" alt="Colegio Paulo Freire" class="arm-s5-crest">' +
            '<span>Colegio Paulo Freire · Taller de robótica y programación</span>' +
          '</div>' +
          '<div class="arm-s5-content-row">' +
            '<div class="arm-s5-hat-preview" id="arm-s5-hat-interactive" role="button" tabindex="0" title="¡Hacé click para encender la luz verde del trébol!">' +
              '<img src="img/proyectos/sombrero_san_patricio_solo_sombrero.png" alt="Sombrero de San Patricio" class="arm-s5-hat-img">' +
              '<div class="arm-s5-led-glow" id="arm-s5-led-glow"><i class="fas fa-lightbulb"></i></div>' +
              '<span class="arm-s5-interactive-hint"><i class="fas fa-hand-pointer"></i> ¡Tocá para encender!</span>' +
            '</div>' +
            '<div class="arm-s5-info">' +
              '<div class="arm-s5-tag"><i class="fas fa-sparkles"></i> PROYECTO OFICIAL SALA DE 5 AÑOS</div>' +
              '<h3 class="arm-s5-title">El Sombrero Luminoso de San Patricio 🍀🎩</h3>' +
              '<p class="arm-s5-desc">¡Nuestro primer invento maker! Aprendemos cómo viaja la electricidad con <strong>cinta de cobre conductora</strong>, un <strong>diodo LED verde</strong> en el trébol y una <strong>pila botón CR2032</strong> con interruptor en la vincha.</p>' +
              '<div class="arm-s5-materials-pills">' +
                '<span><i class="fas fa-tape"></i> Cinta de cobre</span>' +
                '<span><i class="fas fa-lightbulb"></i> LED verde</span>' +
                '<span><i class="fas fa-battery-full"></i> Pila CR2032</span>' +
                '<span><i class="fas fa-toggle-on"></i> Interruptor Vincha</span>' +
              '</div>' +
              '<div class="arm-s5-actions">' +
                '<button type="button" class="arm-s5-btn-main arm-btn-open-presentation" data-mission-idx="0">' +
                  '<i class="fas fa-chalkboard-teacher"></i> <span>Ver Modo Presentación Guiado</span>' +
                '</button>' +
                '<button type="button" class="arm-s5-btn-pdf arm-btn-open-pdf" data-mission-idx="0">' +
                  '<i class="fas fa-file-pdf"></i> <span>Guía y Plantilla PDF</span>' +
                '</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>';
    }

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
              (m.coverImage ?
                '<div class="arm-mc-cover-wrap">' +
                  '<img src="' + m.coverImage + '" alt="' + m.title.replace(/"/g, '&quot;') + '" class="arm-mc-cover-img" loading="lazy">' +
                '</div>' : '') +
              '<div class="arm-mc-body">' +
                '<h4 class="arm-mc-title">' + m.title + '</h4>' +
                '<p class="arm-mc-desc">' + m.description + '</p>' +
                (m.objective ? '<div class="arm-mc-objective"><i class="fas fa-bullseye"></i> <strong>Objetivo:</strong> ' + m.objective + '</div>' : '') +
                (m.benefits ? '<div class="arm-mc-benefits"><i class="fas fa-brain"></i> <strong>Beneficios:</strong> ' + m.benefits + '</div>' : '') +
              '</div>' +
              '<div class="arm-mc-footer">' +
                '<button type="button" class="arm-btn-primary arm-btn-open-modal" data-mission-idx="' + idx + '">' +
                  '<i class="fas fa-play"></i> Iniciar Misión' +
                '</button>' +
                (m.gameUrl ? '<a href="' + m.gameUrl + '" target="_blank" rel="noopener noreferrer" class="arm-btn-secondary" style="color:#E11D48;border-color:#FDA4AF;"><i class="fas fa-gamepad"></i> Jugar</a>' : '') +
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
            (m.coverImage ?
              '<div class="arm-mc-cover-wrap">' +
                '<img src="' + m.coverImage + '" alt="' + m.title.replace(/"/g, '&quot;') + '" class="arm-mc-cover-img" loading="lazy">' +
              '</div>' : '') +
            '<div class="arm-mc-body">' +
              '<h4 class="arm-mc-title">' + m.title + '</h4>' +
              '<p class="arm-mc-desc">' + m.description + '</p>' +
              (m.objective ? '<div class="arm-mc-objective"><i class="fas fa-bullseye"></i> <strong>Objetivo:</strong> ' + m.objective + '</div>' : '') +
              (m.benefits ? '<div class="arm-mc-benefits"><i class="fas fa-brain"></i> <strong>Beneficios:</strong> ' + m.benefits + '</div>' : '') +
            '</div>' +
            '<div class="arm-mc-footer">' +
              '<button type="button" class="arm-btn-primary arm-btn-open-modal" data-mission-idx="' + idx + '">' +
                '<i class="fas fa-play"></i> Iniciar' +
              '</button>' +
              (m.gameUrl ? '<a href="' + m.gameUrl + '" target="_blank" rel="noopener noreferrer" class="arm-btn-secondary" style="color:#E11D48;border-color:#FDA4AF;"><i class="fas fa-gamepad"></i> Jugar</a>' : '') +
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

    return '<div class="adventure-roadmap-wrapper">' + headerHtml + sala5SpecialBannerHtml + bodyHtml + '</div>';
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

    // Juegos del Grado (por niveles y beneficios de razonamiento)
    var gradeObj = null;
    if (window.SCHOOL_DATA && Array.isArray(window.SCHOOL_DATA.grades)) {
      gradeObj = window.SCHOOL_DATA.grades.find(function(g){ return g.id === student.gradeId; });
    } else if (window.COURSE_DATA && Array.isArray(window.COURSE_DATA.grades)) {
      gradeObj = window.COURSE_DATA.grades.find(function(g){ return g.id === student.gradeId; });
    }
    var gradeGames = (gradeObj && Array.isArray(gradeObj.games)) ? gradeObj.games : [];
    var badgeJuegos = gradeGames.length;

    // Badges y conteos
    var validProyectoFiles = (FOLDER_CONTENTS.proyecto.items || []).filter(function(f){
      return isScratchFile(f.name) || isMakecodeFile(f.name) || f.type==='scratch' || f.type==='makecode' || f.type==='circuito' || f.type==='electronica' || /\.(bmp|png|jpe?g|webp|mp4|mov)$/i.test(f.name);
    });

    var badgeDibujos     = isLoadingDriveFiles ? '<i class="fas fa-spinner fa-spin"></i>' : FOLDER_CONTENTS.dibujos.items.length;
    var badgeProyectos   = adventureMissions.length;
    var badgeProyecto    = isLoadingProyectoFiles ? '<i class="fas fa-spinner fa-spin"></i>' : validProyectoFiles.length;
    var totalActividades = FOLDER_CONTENTS.actividades.items.length + (FOLDER_CONTENTS.actividades.generalItems.length > 0 ? FOLDER_CONTENTS.actividades.generalItems.length : 1);
    var badgeActividades = isLoadingActividadesFiles ? '<i class="fas fa-spinner fa-spin"></i>' : totalActividades;
    var badgeFamiliar    = 1;

    // ── Filtros por subtab ──
    var scratchItems   = validProyectoFiles.filter(function(f){ return isScratchFile(f.name) || f.type==='scratch' || f.type==='circuito' || f.type==='electronica' || /\.(bmp|png|jpe?g|webp|mp4|mov)$/i.test(f.name); }).slice(0, 10);
    var makecodeItems  = validProyectoFiles.filter(function(f){ return isMakecodeFile(f.name) || f.type==='makecode'; }).slice(0, 10);

    // countText barra
    var countText = '';
    if (activeFolderKey === 'dibujos')   countText = isLoadingDriveFiles ? '<i class="fas fa-sync-alt fa-spin"></i> Conectando...' : FOLDER_CONTENTS.dibujos.items.length + ' dibujo(s)';
    else if (activeFolderKey === 'proyectos') countText = adventureMissions.length + ' misiones de aventura (' + student.gradeName + ')';
    else if (activeFolderKey === 'juegos') countText = gradeGames.length + ' juego(s) de programación y lógica (' + student.gradeName + ')';
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

    // ═══ CARPETA: JUEGOS DEL GRADO (POR NIVELES) ═══
    } else if (activeFolderKey === 'juegos') {
      mainDisplayHtml = renderGradeGamesHtml(student, gradeGames, adventureMissions);
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
          '<div class="gdb-header-quick-pills">' +
            '<button type="button" class="gdb-qpill ' + (activeFolderKey==='proyectos'?'active':'') + '" data-folder="proyectos"><i class="fas fa-compass"></i> 🗺️ Ruta de Aventuras <span class="gdb-qp-badge">' + badgeProyectos + '</span></button>' +
            '<button type="button" class="gdb-qpill ' + (activeFolderKey==='juegos'?'active':'') + '" data-folder="juegos"><i class="fas fa-gamepad"></i> 🎮 Juegos <span class="gdb-qp-badge">' + badgeJuegos + '</span></button>' +
            '<button type="button" class="gdb-qpill ' + (activeFolderKey==='dibujos'?'active':'') + '" data-folder="dibujos"><i class="fas fa-paint-brush"></i> 🎨 Dibujos <span class="gdb-qp-badge">' + badgeDibujos + '</span></button>' +
            '<button type="button" class="gdb-qpill ' + (activeFolderKey==='proyecto'?'active':'') + '" data-folder="proyecto"><i class="fas fa-folder-open"></i> 📁 Proyectos <span class="gdb-qp-badge">' + badgeProyecto + '</span></button>' +
            '<button type="button" class="gdb-qpill ' + (activeFolderKey==='actividades'?'active':'') + '" data-folder="actividades"><i class="fas fa-house-user"></i> 🏠 Actividades</button>' +
            '<button type="button" class="gdb-qpill ' + (activeFolderKey==='familiar'?'active':'') + '" data-folder="familiar"><i class="fas fa-heart"></i> 👨‍👩‍👧 Familiar</button>' +
          '</div>' +
        '</div>' +

        '<div class="gdb-main-layout">' +

          // ÁRBOL
          '<aside class="gdb-tree-sidebar">' +
            '<div class="gts-title"><i class="fas fa-sitemap"></i> Carpetas de ' + student.name.split(' ')[0] + '</div>' +
            '<div class="gts-tree">' +
              treeFolder('dibujos', '🎨 Dibujos', badgeDibujos, activeFolderKey, '#16A34A') +
              treeFolder('proyectos', '🗺️ Ruta de Aventuras', badgeProyectos, activeFolderKey, '#2563EB') +
              treeFolder('juegos', '🎮 Juegos del Grado', badgeJuegos, activeFolderKey, '#E11D48') +
              treeFolder('proyecto', '📁 Proyectos', badgeProyecto, activeFolderKey, '#7C3AED') +
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
              '<i class="fas fa-info-circle"></i> En <strong>📁 Proyectos</strong> podés guardar proyectos Scratch Jr y MakeCode.' +
            '</div>' +
          '</aside>' +

          // CONTENIDO
          '<main class="gdb-content-area">' +
            '<div class="gca-folder-bar">' +
              '<div class="gca-fb-title">' +
                '<i class="fas ' + currentFolder.icon + '"></i>' +
                '<span>Contenido de: <strong>' +
                  (activeFolderKey === 'proyectos' ? 'Ruta de Aventuras (' + student.gradeName + ')' :
                   activeFolderKey === 'juegos' ? 'Juegos de Programación (' + student.gradeName + ')' :
                   activeFolderKey === 'proyecto'  ? 'Proyectos' :
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

    // ── Eventos de navegación rápida en cabecera (pills) ──
    container.querySelectorAll('.gdb-qpill').forEach(function(btn){
      btn.onclick = function(){
        if (window.sounds) window.sounds.playClick();
        activeFolderKey = btn.dataset.folder;
        currentCarouselIndex = 0;
        renderGDriveDashboard(containerId);
      };
    });

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
      initDropzone(container, student, 'proyectos', '.sb3,.sjr,.pjson,.sb', containerId, true, 'scratch');
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

      // Sombrero interactivo de San Patricio (enciende y apaga la luz verde con sonido)
      var interactiveHat = container.querySelector('#arm-s5-hat-interactive');
      if (interactiveHat) {
        interactiveHat.onclick = function(e){
          e.stopPropagation();
          var glow = container.querySelector('#arm-s5-led-glow');
          if (glow) {
            glow.classList.toggle('active');
            if (glow.classList.contains('active')) {
              if (window.sounds && window.sounds.playSuccess) window.sounds.playSuccess();
              else if (window.sounds) window.sounds.playClick();
            } else {
              if (window.sounds) window.sounds.playClick();
            }
          }
        };
      }
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

    // ── Juegos del Grado (botón para saltar a la misión en Ruta Maker) ──
    if (activeFolderKey === 'juegos') {
      container.querySelectorAll('.ggc-btn-mission').forEach(function(btn){
        btn.onclick = function(e){
          e.stopPropagation();
          if (window.sounds) window.sounds.playClick();
          var lvl = parseInt(btn.dataset.level, 10);
          activeFolderKey = 'proyectos';
          renderGDriveDashboard(containerId);
          setTimeout(function(){
            var advM = getAdventureMissionsForStudent(student);
            var targetM = advM.find(function(m){ return m.level === lvl; }) || advM[lvl - 1];
            if (targetM) openAdventureProjectModal(targetM, 'presentacion');
          }, 150);
        };
      });
    }
  }

  // ──────────────────────────────────────────────────
  // RENDER HTML DE JUEGOS DEL GRADO (POR NIVELES)
  // ──────────────────────────────────────────────────
  function renderGradeGamesHtml(student, gradeGames, adventureMissions) {
    if (!gradeGames || gradeGames.length === 0) {
      return '<div class="gdb-empty-state"><div class="ges-icon">🎮</div><h4>Sin juegos asignados</h4><p>Pronto se agregarán juegos de programación para ' + student.gradeName + '.</p></div>';
    }

    var cardsHtml = gradeGames.map(function(game, idx) {
      var levelNum = game.level || (idx + 1);
      var thumb = game.thumbnail || 'img/angrybirds.png';
      var platText = (game.platform === 'codeorg') ? 'Code.org' : (game.platform === 'codejr' ? 'Scratch Jr' : 'Taller Maker');
      var isCodeorg = (game.platform === 'codeorg') || (game.externalUrl && game.externalUrl.includes('code.org'));
      var themeColor = isCodeorg ? '#E11D48' : '#2563EB';

      // Verificar si hay misión de aventura vinculada
      var linkedMission = (adventureMissions || []).find(function(m){
        return m.level === levelNum || (isCodeorg && m.type === 'codeorg');
      });

      return '<div class="grade-game-card" data-game-level="' + levelNum + '">' +
        '<div class="ggc-thumb-wrap" onclick="window.open(\'' + game.externalUrl + '\', \'_blank\')" title="Hacé clic para jugar a ' + game.title + '">' +
          '<img src="' + thumb + '" alt="' + game.title + '" class="ggc-thumb-img" onerror="this.src=\'img/angrybirds.png\'">' +
          '<div class="ggc-play-overlay">' +
            '<div class="ggc-play-bubble"><i class="fas fa-play"></i></div>' +
            '<span>¡Jugar Ahora!</span>' +
          '</div>' +
          '<div class="ggc-lvl-badge" style="background:' + themeColor + ';">NIVEL ' + levelNum + '</div>' +
          '<div class="ggc-platform-badge">' + platText + '</div>' +
        '</div>' +
        '<div class="ggc-body">' +
          '<div class="ggc-top-row">' +
            '<h3 class="ggc-title">' + game.title + '</h3>' +
            (linkedMission && linkedMission.status === 'completado' ? '<span class="ggc-status-done"><i class="fas fa-check-circle"></i> ⭐ Completado</span>' : '') +
          '</div>' +
          '<p class="ggc-desc">' + game.description + '</p>' +
          (game.benefits ?
            '<div class="ggc-benefits-box">' +
              '<div class="ggc-bb-header"><i class="fas fa-brain"></i> <strong>Razonamiento Pedagógico:</strong></div>' +
              '<p class="ggc-bb-text">' + game.benefits + '</p>' +
            '</div>' : '') +
          (game.tags && game.tags.length > 0 ?
            '<div class="ggc-tags-row">' +
              game.tags.map(function(t){ return '<span class="ggc-tag">#' + t + '</span>'; }).join('') +
            '</div>' : '') +
          '<div class="ggc-actions">' +
            '<a href="' + game.externalUrl + '" target="_blank" rel="noopener noreferrer" class="ggc-btn-play" style="background:' + themeColor + ';">' +
              '<i class="fas fa-gamepad"></i> <span>Jugar en ' + platText + '</span>' +
            '</a>' +
            (linkedMission ?
              '<button type="button" class="ggc-btn-mission" data-level="' + levelNum + '" title="Ver estación en la Ruta de Aventuras">' +
                '<i class="fas fa-map-marked-alt"></i> <span>Ver en Ruta Maker</span>' +
              '</button>' : '') +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    return '<div class="gdb-actividades-container">' +
      '<div class="gac-section-block">' +
        '<div class="gac-block-header" style="border-bottom:2px solid #F1F5F9;padding-bottom:14px;margin-bottom:18px;">' +
          '<div>' +
            '<h4 style="font-size:1.3rem;font-weight:900;color:#1E293B;margin:0 0 4px;"><span class="gac-icon">🎮</span> Juegos del Grado por Niveles — ' + student.gradeName + '</h4>' +
            '<p style="font-size:0.88rem;color:#64748B;margin:0;">Juegos interactivos organizados por niveles pedagógicos para aprender a programar, ejercitar lateralidad y desarrollar el razonamiento computacional.</p>' +
          '</div>' +
        '</div>' +
        '<div class="grade-games-grid">' +
          cardsHtml +
        '</div>' +
      '</div>' +
    '</div>';
  }

  // ──────────────────────────────────────────────────
  // RENDER SOLUCIÓN OFICIAL PARA CODE.ORG / ANGRY BIRDS
  // ──────────────────────────────────────────────────
  function renderCodeorgSolutionHtml(mission) {
    var gameUrl = (mission && mission.gameUrl) || 'https://studio.code.org/es/hoc/1';
    return '<div class="apm-sol-codeorg-wrap">' +
      '<div class="apm-sol-electro-header" style="background:linear-gradient(135deg, #9F1239 0%, #E11D48 100%);">' +
        '<div class="apm-seh-icon"><i class="fas fa-puzzle-piece"></i></div>' +
        '<div>' +
          '<h4>Solución Oficial: Algoritmos y Bloques de Angry Birds (Code.org)</h4>' +
          '<p>Secuencias paso a paso de los primeros niveles en <strong>' + gameUrl + '</strong> con explicación de razonamiento.</p>' +
        '</div>' +
      '</div>' +
      '<div class="apm-sol-electro-body" style="padding:18px;">' +
        '<div style="margin-bottom:16px;background:#FFF1F2;border:1.5px solid #FDA4AF;border-radius:12px;padding:14px;">' +
          '<h5 style="margin:0 0 6px;color:#9F1239;font-size:0.95rem;"><i class="fas fa-lightbulb"></i> Clave de Razonamiento Computacional:</h5>' +
          '<p style="margin:0;font-size:0.86rem;color:#4C0519;line-height:1.5;">' +
            'En cada nivel, el niño debe anticipar mentalmente el camino antes de encastrar los bloques. Si el pájaro mira hacia el este, ¿hacia dónde debe girar para bajar? ¡Eso es razonamiento algorítmico y lateralidad espacial!' +
          '</p>' +
        '</div>' +
        '<div class="codeorg-levels-solutions-grid">' +
          '<div class="col-sol-card">' +
            '<div class="col-sc-header"><span class="col-sc-lvl">Nivel 1</span> <strong>Línea Recta Simple</strong></div>' +
            '<div class="col-sc-blocks">' +
              '<div class="co-block when-run"><i class="fas fa-play"></i> Al ejecutar</div>' +
              '<div class="co-block move-forward"><i class="fas fa-arrow-up"></i> avanzar</div>' +
              '<div class="co-block move-forward"><i class="fas fa-arrow-up"></i> avanzar</div>' +
            '</div>' +
            '<div class="col-sc-note">Dos pasos hacia adelante para atrapar al cerdo sin girar.</div>' +
          '</div>' +
          '<div class="col-sol-card">' +
            '<div class="col-sc-header"><span class="col-sc-lvl">Nivel 2</span> <strong>Camino de 3 Pasos</strong></div>' +
            '<div class="col-sc-blocks">' +
              '<div class="co-block when-run"><i class="fas fa-play"></i> Al ejecutar</div>' +
              '<div class="co-block move-forward"><i class="fas fa-arrow-up"></i> avanzar</div>' +
              '<div class="co-block move-forward"><i class="fas fa-arrow-up"></i> avanzar</div>' +
              '<div class="co-block move-forward"><i class="fas fa-arrow-up"></i> avanzar</div>' +
            '</div>' +
            '<div class="col-sc-note">Contar casilleros exactos: 3 bloques avanzar debajo de ejecutar.</div>' +
          '</div>' +
          '<div class="col-sol-card">' +
            '<div class="col-sc-header"><span class="col-sc-lvl">Nivel 3</span> <strong>Giro a la Derecha</strong></div>' +
            '<div class="col-sc-blocks">' +
              '<div class="co-block when-run"><i class="fas fa-play"></i> Al ejecutar</div>' +
              '<div class="co-block move-forward"><i class="fas fa-arrow-up"></i> avanzar</div>' +
              '<div class="co-block move-forward"><i class="fas fa-arrow-up"></i> avanzar</div>' +
              '<div class="co-block turn-right"><i class="fas fa-redo"></i> girar a la derecha ↷</div>' +
              '<div class="co-block move-forward"><i class="fas fa-arrow-up"></i> avanzar</div>' +
            '</div>' +
            '<div class="col-sc-note">El giro orienta al pájaro hacia abajo sin cambiar de casilla.</div>' +
          '</div>' +
          '<div class="col-sol-card">' +
            '<div class="col-sc-header"><span class="col-sc-lvl">Nivel 4</span> <strong>Laberinto con Giros Múltiples</strong></div>' +
            '<div class="col-sc-blocks">' +
              '<div class="co-block when-run"><i class="fas fa-play"></i> Al ejecutar</div>' +
              '<div class="co-block move-forward"><i class="fas fa-arrow-up"></i> avanzar</div>' +
              '<div class="co-block turn-left"><i class="fas fa-undo"></i> girar a la izquierda ↶</div>' +
              '<div class="co-block move-forward"><i class="fas fa-arrow-up"></i> avanzar</div>' +
              '<div class="co-block turn-right"><i class="fas fa-redo"></i> girar a la derecha ↷</div>' +
              '<div class="co-block move-forward"><i class="fas fa-arrow-up"></i> avanzar</div>' +
            '</div>' +
            '<div class="col-sc-note">Combinación de giros y avance para esquivar obstáculos de dinamita (TNT).</div>' +
          '</div>' +
        '</div>' +
        '<div style="text-align:center;margin-top:20px;">' +
          '<a href="' + gameUrl + '" target="_blank" rel="noopener noreferrer" class="arm-btn-primary" style="background:#E11D48;border-color:#BE123C;padding:10px 22px;">' +
            '<i class="fas fa-external-link-alt"></i> Practicar estos Niveles en Code.org' +
          '</a>' +
        '</div>' +
      '</div>' +
    '</div>';
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
    var isCodeorg = mission.type === 'codeorg' || !!mission.gameUrl || (mission.tags && mission.tags.some(function(t){ return /code\.org|angry ?birds/i.test(t); }));
    var isElectronica = !isCodeorg && (mission.type === 'electronica' || (mission.tags && mission.tags.some(function(t){ return /electr[oó]nica|circuito|sin programaci[oó]n|papertronics/i.test(t); })) || (!mission.makecodeUrl && !mission.scratchId && mission.materials && mission.materials.some(function(m){ return /led|pila|bater[ií]a|cobre|circuito|motor/i.test((m.title||'') + ' ' + (m.description||'')); })));
    var isMakecode = !isCodeorg && !isElectronica && (!!mission.makecodeUrl || mission.type === 'makecode' || (mission.tags && mission.tags.some(function(t){ return /makecode|micro:?bit/i.test(t); })));
    var isScratch = !isCodeorg && !isElectronica && !isMakecode;
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
    var materialsList = (mission.materials && mission.materials.length > 0) ? mission.materials : (
      isElectronica ? [
        { title: 'Diodo LED 5mm', description: 'Emite luz (patita larga = + ánodo, patita corta = - cátodo)' },
        { title: 'Pila de botón CR2032 (3V)', description: 'Fuente de energía para alimentar el circuito de forma segura' },
        { title: 'Cinta de cobre conductora o cables', description: 'Pistas o caminos por donde viaja la electricidad' },
        { title: 'Clip metálico para papel', description: 'Funciona como interruptor casero de encendido y apagado' },
        { title: 'Cartulina o cartón y tijeras', description: 'Base para montar el circuito' }
      ] : [
        { title: 'Placa BBC micro:bit v2', description: 'Tarjeta con pantalla LED y sensores' },
        { title: 'Cable Micro-USB', description: 'Para programar y alimentar' },
        { title: 'Piezas del Taller', description: 'Cables, pulsadores y cartón' }
      ]
    );

    // Instrucciones de armado para proyectos de electrónica sin programación
    var instructionsList = (mission.instructions && mission.instructions.length > 0) ? mission.instructions : [
      {
        step: 1,
        title: 'Conocer la polaridad del LED y de la pila',
        desc: 'El diodo LED tiene 2 patitas metálicas: la pata <strong>más larga es positiva (+ ánodo)</strong> y la pata <strong>más corta es negativa (- cátodo)</strong>. En la pila plana CR2032, la cara lisa con letras es el polo positivo (+) y la cara rugosa es el polo negativo (-).',
        tip: '¡Regla de oro: El positivo del LED siempre se conecta al positivo de la pila!'
      },
      {
        step: 2,
        title: 'Trazar el circuito en la base de trabajo',
        desc: 'Sobre la cartulina o soporte de cartón, dibujá con lápiz o marcadores dos líneas que salgan de la pila hacia el LED: una línea roja para el polo positivo (+) y una línea azul para el polo negativo (-).',
        tip: 'Las pistas positiva y negativa nunca deben tocarse entre sí directamente para evitar un cortocircuito.'
      },
      {
        step: 3,
        title: 'Colocar la cinta de cobre conductora',
        desc: 'Pegá la cinta de cobre autoadhesiva sobre las líneas dibujadas. Para doblar en las esquinas, doblá la cinta hacia afuera y luego hacia abajo sin cortarla, para que la electricidad fluya sin cortes.',
        tip: 'Aplastá bien la cinta con la uña para asegurar una conducción eléctrica perfecta.'
      },
      {
        step: 4,
        title: 'Fijar el LED en sus pistas',
        desc: 'Abrí las patitas del LED hacia los costados en ángulo de 90°. Pegá la patita larga sobre la pista positiva (+) y la patita corta sobre la pista negativa (-) usando trocitos de cinta de cobre.',
        tip: 'Presioná firmemente para que el metal del LED haga contacto íntimo con la cinta.'
      },
      {
        step: 5,
        title: 'Colocar la pila y armar el interruptor casero',
        desc: 'Apoyá la pila con su cara negativa (-) sobre la pista inferior. En la parte superior, colocá un clip metálico o doblá una esquina de la cartulina (solapa) que funcione como botón pulsador.',
        tip: 'Cuando soltás el clip, el circuito se abre y se apaga. Al apretarlo, se cierra.'
      },
      {
        step: 6,
        title: '¡Prueba y encendido!',
        desc: 'Apretá el clip o la solapa sobre el polo positivo (+) de la pila: ¡el circuito se cierra y el LED se enciende inmediatamente con brillo total!',
        tip: '¿No encendió? ¡No te preocupes! Invertí el sentido de las patitas del LED y revisá el contacto.'
      }
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
                  '<span class="apm-stn-dot" data-slide="2" title="' + (isElectronica ? 'Paso 3: Instrucciones de Armado' : 'Paso 3: Código y Simulador') + '"></span>' +
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
                      '<div style="font-size:0.8rem;font-weight:800;color:' + (isCodeorg ? '#E11D48' : (isElectronica ? '#D97706' : '#6366F1')) + ';text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">' +
                        (isCodeorg ? '🎮 Programación con Bloques • Code.org' : (isElectronica ? '⚡ Circuito Electrónico • Sin Programación' : 'Desafío Maker • Nivel ' + mission.level)) +
                      '</div>' +
                      '<h2 style="font-size:1.6rem;font-weight:900;color:#1E293B;margin:0 0 10px;line-height:1.2;">' + mission.title + '</h2>' +
                      '<div class="apm-reto-card" style="' + (isCodeorg ? 'border-left:4px solid #E11D48;background:#FFF1F2;' : '') + '">' +
                        '<h4 style="' + (isCodeorg ? 'color:#9F1239;' : '') + '"><i class="fas ' + (isCodeorg ? 'fa-bullseye' : 'fa-flag-checkered') + '"></i> ' + (isCodeorg ? 'Objetivo Pedagógico:' : '¿Cuál es nuestra misión?') + '</h4>' +
                        '<p style="' + (isCodeorg ? 'color:#4C0519;' : '') + '">' + (mission.objective || mission.description) + '</p>' +
                      '</div>' +
                      '<div class="apm-skills-pills">' +
                        (isCodeorg ?
                          '<span class="apm-skill-pill"><i class="fas fa-puzzle-piece"></i> Primeros Pasos en Programación</span>' +
                          '<span class="apm-skill-pill"><i class="fas fa-brain"></i> Razonamiento Lógico</span>' +
                          '<span class="apm-skill-pill"><i class="fas fa-compass"></i> Lateralidad & Orientación</span>' +
                          '<span class="apm-skill-pill"><i class="fas fa-bug"></i> Descomposición y Depuración</span>' :
                         isElectronica ?
                          '<span class="apm-skill-pill"><i class="fas fa-bolt"></i> Circuito Físico</span>' +
                          '<span class="apm-skill-pill"><i class="fas fa-battery-full"></i> Polaridad y Energía</span>' +
                          '<span class="apm-skill-pill"><i class="fas fa-tools"></i> Sin Programación</span>' :
                          '<span class="apm-skill-pill"><i class="fas fa-lightbulb"></i> Creatividad Maker</span>' +
                          '<span class="apm-skill-pill"><i class="fas fa-cubes"></i> Lógica en Bloques</span>' +
                          '<span class="apm-skill-pill"><i class="fas fa-robot"></i> Pensamiento Computacional</span>'
                        ) +
                      '</div>' +
                      '<button type="button" class="arm-btn-primary apm-next-btn-internal" style="margin-top:18px;font-size:0.9rem;padding:9px 18px;' + (isCodeorg ? 'background:#E11D48;border-color:#BE123C;' : (isElectronica ? 'background:#D97706;border-color:#B45309;' : '')) + '">' +
                        (isCodeorg ? 'Ver Beneficios del Razonamiento <i class="fas fa-arrow-right"></i>' : 'Ver Materiales y Componentes <i class="fas fa-arrow-right"></i>') +
                      '</button>' +
                    '</div>' +
                  '</div>' +
                '</div>' +

                // SLIDE 1: Materiales & Beneficios
                '<div class="apm-slide-page" data-slide-idx="1">' +
                  (isCodeorg ?
                    '<div style="max-width:850px;margin:0 auto;">' +
                      '<div style="text-align:center;margin-bottom:20px;">' +
                        '<h3 style="font-size:1.35rem;font-weight:900;color:#1E293B;margin:0 0 6px;">' +
                          '🧠 ¿Por qué Angry Birds? Beneficios del Razonamiento en Programación' +
                        '</h3>' +
                        '<p style="font-size:0.88rem;color:#64748B;margin:0;">' +
                          'A través del juego en <strong><a href="https://studio.code.org/es/hoc/1" target="_blank" style="color:#E11D48;text-decoration:underline;">https://studio.code.org/es/hoc/1</a></strong>, los niños desarrollan capacidades fundamentales de lógica:' +
                        '</p>' +
                      '</div>' +
                      '<div class="apm-materials-grid">' +
                        '<div class="apm-mat-card" style="border-left:3.5px solid #E11D48;">' +
                          '<div class="apm-mat-icon" style="color:#E11D48;"><i class="fas fa-sort-numeric-down"></i></div>' +
                          '<div class="apm-mat-info">' +
                            '<h5>1. Secuenciación de Algoritmos</h5>' +
                            '<p>Las computadoras ejecutan instrucciones en estricto orden cronológico: avanzar, girar y avanzar. Comprender la secuencia paso a paso es la base de todo software.</p>' +
                          '</div>' +
                        '</div>' +
                        '<div class="apm-mat-card" style="border-left:3.5px solid #2563EB;">' +
                          '<div class="apm-mat-icon" style="color:#2563EB;"><i class="fas fa-compass"></i></div>' +
                          '<div class="apm-mat-info">' +
                            '<h5>2. Orientación Espacial y Lateralidad</h5>' +
                            '<p>Aprender a ponerse en la perspectiva del pájaro rojo: discernir hacia dónde es "girar a la derecha" o "a la izquierda" en el plano bidimensional.</p>' +
                          '</div>' +
                        '</div>' +
                        '<div class="apm-mat-card" style="border-left:3.5px solid #16A34A;">' +
                          '<div class="apm-mat-icon" style="color:#16A34A;"><i class="fas fa-cubes"></i></div>' +
                          '<div class="apm-mat-info">' +
                            '<h5>3. Descomposición de Problemas</h5>' +
                            '<p>Dividir el trayecto largo hasta el cerdito en pequeños pasos manejables y seguros para no chocar con las paredes de madera.</p>' +
                          '</div>' +
                        '</div>' +
                        '<div class="apm-mat-card" style="border-left:3.5px solid #D97706;">' +
                          '<div class="apm-mat-icon" style="color:#D97706;"><i class="fas fa-sync-alt"></i></div>' +
                          '<div class="apm-mat-info">' +
                            '<h5>4. Prueba, Error y Depuración</h5>' +
                            '<p>Desarrollar perseverancia sin frustración: si el pájaro choca con dinamita TNT, se examina qué bloque sobró o faltó, se corrige y se vuelve a probar.</p>' +
                          '</div>' +
                        '</div>' +
                      '</div>' +
                      '<div class="apm-reto-card" style="margin-top:20px;background:#FFF1F2;border-color:#FDA4AF;">' +
                        '<h4 style="color:#9F1239;"><i class="fas fa-external-link-alt"></i> Actividad Oficial de Code.org (Hora del Código)</h4>' +
                        '<p style="color:#4C0519;margin:0 0 10px;">Plataforma mundial de iniciación a la ciencia de la computación adaptada para niñas y niños de educación inicial y primaria.</p>' +
                        '<a href="https://studio.code.org/es/hoc/1" target="_blank" rel="noopener noreferrer" class="arm-btn-primary" style="background:#E11D48;border-color:#BE123C;display:inline-flex;align-items:center;gap:8px;padding:8px 18px;font-size:0.86rem;color:#FFF;text-decoration:none;">' +
                          '<i class="fas fa-play"></i> Abrir studio.code.org/es/hoc/1 en el navegador' +
                        '</a>' +
                      '</div>' +
                      '<div style="text-align:center;margin-top:20px;">' +
                        '<button type="button" class="arm-btn-primary apm-next-btn-internal" style="font-size:0.9rem;padding:9px 18px;background:#E11D48;border-color:#BE123C;">' +
                          '¡Ir al Desafío Interactivo de Angry Birds! <i class="fas fa-arrow-right"></i>' +
                        '</button>' +
                      '</div>' +
                    '</div>' :
                    '<div style="max-width:850px;margin:0 auto;">' +
                      '<div style="text-align:center;margin-bottom:20px;">' +
                        '<h3 style="font-size:1.35rem;font-weight:900;color:#1E293B;margin:0 0 6px;">' +
                          (isElectronica ? '⚡ Componentes y Materiales del Circuito' : '🔌 Materiales y Herramientas del Taller') +
                        '</h3>' +
                        '<p style="font-size:0.88rem;color:#64748B;margin:0;">' +
                          (isElectronica ? 'Asegurate de tener todos los elementos listos sobre tu mesa antes de armar:' : 'Asegurate de tener todo listo antes de comenzar a programar o armar:') +
                        '</p>' +
                      '</div>' +
                      '<div class="apm-materials-grid">' +
                        materialsList.map(function(m){
                          var mIcon = isElectronica ? (
                            /led|luz/i.test(m.title) ? 'fa-lightbulb' :
                            /pila|bater/i.test(m.title) ? 'fa-battery-full' :
                            /cobre|cable/i.test(m.title) ? 'fa-tape' :
                            /clip|broche|interrup/i.test(m.title) ? 'fa-toggle-on' :
                            /motor/i.test(m.title) ? 'fa-cogs' :
                            /cart|tijer|papel/i.test(m.title) ? 'fa-cut' : 'fa-tools'
                          ) : 'fa-tools';
                          return '<div class="apm-mat-card">' +
                            '<div class="apm-mat-icon"><i class="fas ' + mIcon + '"></i></div>' +
                            '<div class="apm-mat-info">' +
                              '<h5>' + m.title + '</h5>' +
                              '<p>' + (m.description || 'Componente didáctico del taller') + '</p>' +
                            '</div>' +
                          '</div>';
                        }).join('') +
                      '</div>' +
                      '<div class="apm-reto-card" style="margin-top:22px;background:#F0FDF4;border-color:#16A34A;">' +
                        '<h4 style="color:#15803D;"><i class="fas fa-lightbulb"></i> ' + (isElectronica ? 'Consejo de Polaridad' : 'Consejo del Profesor Maker') + '</h4>' +
                        '<p style="color:#166534;">' +
                          (isElectronica ? '¡Recordá siempre la polaridad! La patita larga del LED es el polo positivo (+) y la corta el negativo (-). La cara lisa con letras de la pila es (+). Si las conectás al revés, no pasará nada malo, pero el LED no encenderá hasta que lo pongas en el sentido correcto.' : 'Antes de transferir o probar el código, pensá la secuencia paso a paso: ¿Qué pasa primero? ¿Qué botón activa la acción? ¡El orden de las instrucciones es la clave!') +
                        '</p>' +
                      '</div>' +
                      '<div style="text-align:center;margin-top:20px;">' +
                        '<button type="button" class="arm-btn-primary apm-next-btn-internal" style="font-size:0.9rem;padding:9px 18px;' + (isElectronica ? 'background:#D97706;border-color:#B45309;' : '') + '">' +
                          (isElectronica ? '¡Ver Instrucciones de Armado Paso a Paso! <i class="fas fa-arrow-right"></i>' : '¡Pasar al Código y Simulador! <i class="fas fa-arrow-right"></i>') +
                        '</button>' +
                      '</div>' +
                    '</div>'
                  ) +
                '</div>' +

                // SLIDE 2: Instrucciones de Armado (Electrónica) O Desafío Angry Birds (Code.org) O Código y Simulador (MakeCode/Scratch)
                '<div class="apm-slide-page" data-slide-idx="2">' +
                  (isCodeorg ?
                    '<div style="height:100%;display:flex;flex-direction:column;gap:12px;overflow-y:auto;padding-right:4px;">' +
                      '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">' +
                        '<div>' +
                          '<h3 style="font-size:1.2rem;font-weight:900;color:#1E293B;margin:0 0 2px;"><i class="fas fa-gamepad" style="color:#E11D48;"></i> Nivel 2: ¡A Jugar y Programar con Angry Birds!</h3>' +
                          '<p style="font-size:0.82rem;color:#64748B;margin:0;">Plataforma interactiva: <strong>https://studio.code.org/es/hoc/1</strong></p>' +
                        '</div>' +
                        '<a href="https://studio.code.org/es/hoc/1" target="_blank" rel="noopener noreferrer" class="arm-btn-primary" style="background:#E11D48;border-color:#BE123C;font-size:0.84rem;padding:7px 16px;">' +
                          '<i class="fas fa-external-link-alt"></i> Abrir en Pantalla Completa' +
                        '</a>' +
                      '</div>' +
                      '<div class="codeorg-challenge-hero-card">' +
                        '<div class="chc-left">' +
                          '<img src="img/angrybirds.png" alt="Angry Birds Code.org" class="chc-img" onerror="this.src=\'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=400&q=80\'">' +
                        '</div>' +
                        '<div class="chc-right">' +
                          '<span class="chc-tag"><i class="fas fa-flag-checkered"></i> Misión Nivel 2</span>' +
                          '<h4>Ayudá al pájaro a atrapar al cerdito</h4>' +
                          '<p>Arrastrá los bloques de movimiento desde el panel de herramientas hacia el bloque <code>al ejecutar</code>. ¿Cuántos pasos hacia adelante necesita dar?</p>' +
                          '<div class="chc-blocks-preview">' +
                            '<span class="cbp-block run"><i class="fas fa-play"></i> al ejecutar</span>' +
                            '<span class="cbp-arrow">➔</span>' +
                            '<span class="cbp-block move"><i class="fas fa-arrow-up"></i> avanzar</span>' +
                            '<span class="cbp-arrow">➔</span>' +
                            '<span class="cbp-block move"><i class="fas fa-arrow-up"></i> avanzar</span>' +
                          '</div>' +
                          '<div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;">' +
                            '<a href="https://studio.code.org/es/hoc/1" target="_blank" rel="noopener noreferrer" class="arm-btn-primary" style="background:#E11D48;border-color:#BE123C;font-size:0.92rem;padding:9px 20px;">' +
                              '<i class="fas fa-play"></i> ¡Jugar Ahora en Code.org! (studio.code.org/es/hoc/1)' +
                            '</a>' +
                          '</div>' +
                        '</div>' +
                      '</div>' +
                      '<div class="apm-tb-grid" style="margin-top:8px;">' +
                        '<div class="apm-tb-item" style="border-left:3px solid #E11D48;">' +
                          '<h6>Paso 1: Contar los casilleros</h6>' +
                          '<p>Mirá el laberinto y contá cuántas casillas separan al pájaro del cerdito.</p>' +
                        '</div>' +
                        '<div class="apm-tb-item" style="border-left:3px solid #2563EB;">' +
                          '<h6>Paso 2: Encastrar los bloques</h6>' +
                          '<p>Arrastrá los bloques <strong>avanzar</strong> y encastralos debajo de <em>al ejecutar</em>.</p>' +
                        '</div>' +
                        '<div class="apm-tb-item" style="border-left:3px solid #16A34A;">' +
                          '<h6>Paso 3: Ejecutar el programa</h6>' +
                          '<p>Tocá el botón naranja <strong>"Ejecutar"</strong> para ver al pájaro en acción.</p>' +
                        '</div>' +
                        '<div class="apm-tb-item" style="border-left:3px solid #D97706;">' +
                          '<h6>Paso 4: Corregir si choca</h6>' +
                          '<p>Si chocás con dinamita TNT, tocá "Reiniciar", cambiá la orden y probá de nuevo.</p>' +
                        '</div>' +
                      '</div>' +
                      '<div style="text-align:right;margin-top:8px;">' +
                        '<button type="button" class="arm-btn-primary apm-next-btn-internal" style="background:#E11D48;border-color:#BE123C;">' +
                          '¡Ver Misión Cumplida y Registrar Entrega! <i class="fas fa-arrow-right"></i>' +
                        '</button>' +
                      '</div>' +
                    '</div>' :
                   isElectronica ?
                    '<div style="height:100%;display:flex;flex-direction:column;gap:10px;overflow-y:auto;padding-right:6px;">' +
                      '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">' +
                        '<div>' +
                          '<h3 style="font-size:1.2rem;font-weight:900;color:#1E293B;margin:0 0 2px;"><i class="fas fa-tools" style="color:#D97706;"></i> Paso a Paso: Armado del Circuito (Sin Programación)</h3>' +
                          '<p style="font-size:0.82rem;color:#64748B;margin:0;">Seguí cada paso en orden para ensamblar los componentes y hacer funcionar tu invento:</p>' +
                        '</div>' +
                        '<button type="button" class="arm-btn-secondary apm-goto-pdf-btn" style="font-size:0.8rem;padding:6px 12px;">' +
                          '<i class="fas fa-print"></i> Guía Imprimible' +
                        '</button>' +
                      '</div>' +
                      (mission.gallery && mission.gallery.length > 1 ?
                        '<div style="display:flex;gap:12px;align-items:center;background:#FEF3C7;border:1.5px dashed #D97706;border-radius:12px;padding:10px 14px;margin-bottom:8px;">' +
                          '<img src="' + mission.gallery[1] + '" alt="Plano del Circuito" style="width:68px;height:68px;object-fit:contain;background:#FFF;border-radius:8px;border:1px solid #FCD34D;padding:2px;cursor:pointer;flex-shrink:0;" onclick="window.open(this.src,\'_blank\')" title="Tocar para ampliar plano">' +
                          '<div style="flex:1;">' +
                            '<h5 style="margin:0 0 2px;font-size:0.86rem;color:#92400E;font-weight:800;"><i class="fas fa-drafting-compass"></i> Plano de Conexiones del Sombrero</h5>' +
                            '<p style="margin:0;font-size:0.79rem;color:#78350F;line-height:1.4;">Mirá cómo van las pistas de cobre desde el trébol hasta la pila y la solapa. <a href="' + (mission.pdfUrl || mission.gallery[1]) + '" target="_blank" style="color:#B45309;font-weight:700;text-decoration:underline;">Ver plantilla completa en PDF</a></p>' +
                          '</div>' +
                        '</div>' : '') +
                      '<div class="apm-instructions-steps-grid">' +
                        instructionsList.map(function(st){
                          return '<div class="apm-step-card">' +
                            '<div class="apm-step-badge">' + st.step + '</div>' +
                            '<div class="apm-step-body">' +
                              '<h5>' + st.title + '</h5>' +
                              '<p>' + st.desc + '</p>' +
                              (st.tip ? '<div class="apm-step-tip"><i class="fas fa-info-circle"></i> ' + st.tip + '</div>' : '') +
                            '</div>' +
                          '</div>';
                        }).join('') +
                      '</div>' +
                      '<div style="text-align:right;margin-top:10px;">' +
                        '<button type="button" class="arm-btn-primary apm-next-btn-internal" style="background:#D97706;border-color:#B45309;">' +
                          '¡Ver Retos Finales y Entrega! <i class="fas fa-arrow-right"></i>' +
                        '</button>' +
                      '</div>' +
                    '</div>' :
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
                    '</div>'
                  ) +
                '</div>' +

                // SLIDE 3: ¡Misión Cumplida y Tu Creación!
                '<div class="apm-slide-page" data-slide-idx="3">' +
                  '<div style="max-width:850px;margin:0 auto;">' +
                    '<div class="apm-win-banner">' +
                      '<div class="apm-win-trophy">' + (isCodeorg ? '🐦' : '🏆') + '</div>' +
                      '<h3 class="apm-win-title">' + (isCodeorg ? '¡Desafío Angry Birds Superado!' : '¡Misión Cumplida en el Nivel ' + mission.level + '!') + '</h3>' +
                      '<p class="apm-win-sub">' + (isCodeorg ? 'Aprendiste las bases de la programación y el razonamiento lógico en Code.org. ¡Sumaste <strong>+100 XP</strong> al progreso del taller!' : 'Superaste el recorrido de <strong>' + mission.title + '</strong>. ¡Sumaste <strong>+100 XP</strong> al progreso de tu grado!') + '</p>' +
                    '</div>' +

                    '<h4 style="font-size:1rem;font-weight:900;color:#1E293B;margin:0 0 12px;"><i class="fas fa-rocket"></i> Desafíos Extra para tu Invento:</h4>' +
                    '<div class="apm-extra-challenges">' +
                      (isCodeorg ?
                        '<div class="apm-ec-item"><div class="apm-ec-badge">1</div><div><h6>Superar los niveles con giros</h6><p>Llegar al nivel 3 y 4 de Code.org practicando giros a la derecha e izquierda sin perder la orientación.</p></div></div>' +
                        '<div class="apm-ec-item"><div class="apm-ec-badge">2</div><div><h6>Usar el menor número de bloques</h6><p>Encontrar la ruta más directa sin bloques sobrantes pensando el algoritmo antes de ejecutar.</p></div></div>' +
                        '<div class="apm-ec-item"><div class="apm-ec-badge">3</div><div><h6>Enseñarle a un compañero</h6><p>Explicarle a un amigo cómo anticipar los pasos del pájaro antes de encastrar los bloques.</p></div></div>' :
                        '<div class="apm-ec-item">' +
                          '<div class="apm-ec-badge">1</div>' +
                          '<div>' +
                            '<h6>' + (isElectronica ? 'Agregá un segundo LED' : 'Personalizá la pantalla') + '</h6>' +
                            '<p>' + (isElectronica ? 'Conectá otro LED en paralelo para que brillen juntos al apretar el interruptor.' : 'Cambiá el dibujo LED, el texto de bienvenida o la velocidad del personaje.') + '</p>' +
                          '</div>' +
                        '</div>' +
                        '<div class="apm-ec-item">' +
                          '<div class="apm-ec-badge">2</div>' +
                          '<div>' +
                            '<h6>' + (isElectronica ? 'Probá interruptores alternativos' : 'Agregá sonido o sensores') + '</h6>' +
                            '<p>' + (isElectronica ? 'Creá un interruptor con papel aluminio, un broche de ropa de madera o trazos con lápiz de grafito.' : 'Programá un tono musical alegre cuando el sensor detecte luz o movimiento.') + '</p>' +
                          '</div>' +
                        '</div>' +
                        '<div class="apm-ec-item">' +
                          '<div class="apm-ec-badge">3</div>' +
                          '<div>' +
                            '<h6>Compartí tu creación</h6>' +
                            '<p>Mostrá tu invento a tus compañeros y guardá una foto o video en tu carpeta de Google Drive.</p>' +
                          '</div>' +
                        '</div>'
                      ) +
                    '</div>' +

                    '<div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-top:24px;flex-wrap:wrap;">' +
                      '<button type="button" class="arm-btn-primary apm-slide4-goto-entrega" style="background:' + (isCodeorg ? '#E11D48' : (isElectronica ? '#D97706' : '#10B981')) + ';border-color:' + (isCodeorg ? '#BE123C' : (isElectronica ? '#B45309' : '#059669')) + ';font-size:0.9rem;padding:9px 18px;">' +
                        (isCodeorg ? '<i class="fas fa-trophy"></i> Registrar Mi Misión (+100 XP)' : (isElectronica ? '<i class="fas fa-camera"></i> Subir Foto de Mi Circuito' : '<i class="fas fa-cloud-upload-alt"></i> Subir Mi Creación')) +
                      '</button>' +
                      '<button type="button" class="arm-btn-primary apm-slide4-goto-solucion" style="background:#7C3AED;border-color:#6D28D9;font-size:0.9rem;padding:9px 18px;">' +
                        (isCodeorg ? '<i class="fas fa-lightbulb"></i> Ver Solución Oficial' : (isElectronica ? '<i class="fas fa-lightbulb"></i> Ver Esquema Oficial' : '<i class="fas fa-lightbulb"></i> Ver Solución Oficial')) +
                      '</button>' +
                      (isCodeorg ?
                        '<a href="https://studio.code.org/es/hoc/1" target="_blank" rel="noopener noreferrer" class="arm-btn-secondary" style="font-size:0.9rem;padding:9px 18px;color:#E11D48;border-color:#FDA4AF;"><i class="fas fa-gamepad"></i> Jugar en Code.org</a>' :
                        '<button type="button" class="arm-btn-secondary" id="apm-goto-pdf-btn" style="font-size:0.9rem;padding:9px 18px;"><i class="fas fa-file-pdf"></i> Ver Guía PDF</button>'
                      ) +
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
                '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
                  '<button type="button" class="apm-deliv-switch-btn ' + (isCodeorg ? 'active' : '') + '" id="apm-switch-to-codeorg" style="padding:6px 14px;border-radius:8px;font-size:0.8rem;font-weight:800;cursor:pointer;border:none;' + (isCodeorg ? 'background:#E11D48;color:#FFF;box-shadow:0 2px 6px rgba(225,29,72,0.3);' : 'background:#E2E8F0;color:#475569;') + '">' +
                    '<i class="fas fa-gamepad"></i> Desafío Code.org' +
                  '</button>' +
                  '<button type="button" class="apm-deliv-switch-btn ' + (isElectronica ? 'active' : '') + '" id="apm-switch-to-electro" style="padding:6px 14px;border-radius:8px;font-size:0.8rem;font-weight:800;cursor:pointer;border:none;' + (isElectronica ? 'background:#D97706;color:#FFF;box-shadow:0 2px 6px rgba(217,119,6,0.3);' : 'background:#E2E8F0;color:#475569;') + '">' +
                    '<i class="fas fa-bolt"></i> Foto / Video Circuito' +
                  '</button>' +
                  '<button type="button" class="apm-deliv-switch-btn ' + (isScratch ? 'active' : '') + '" id="apm-switch-to-scratch" style="padding:6px 14px;border-radius:8px;font-size:0.8rem;font-weight:800;cursor:pointer;border:none;' + (isScratch ? 'background:#EA580C;color:#FFF;box-shadow:0 2px 6px rgba(234,88,12,0.3);' : 'background:#E2E8F0;color:#475569;') + '">' +
                    '<i class="fas fa-cat"></i> Archivo Scratch Jr' +
                  '</button>' +
                  '<button type="button" class="apm-deliv-switch-btn ' + (isMakecode ? 'active' : '') + '" id="apm-switch-to-mk" style="padding:6px 14px;border-radius:8px;font-size:0.8rem;font-weight:800;cursor:pointer;border:none;' + (isMakecode ? 'background:#7C3AED;color:#FFF;box-shadow:0 2px 6px rgba(124,58,237,0.3);' : 'background:#E2E8F0;color:#475569;') + '">' +
                    '<i class="fas fa-microchip"></i> Link MakeCode' +
                  '</button>' +
                '</div>' +
              '</div>' +

              // SUB-PANEL CODE.ORG / ANGRY BIRDS
              '<div id="apm-codeorg-delivery-section" style="' + (isCodeorg ? 'display:block;' : 'display:none;') + '">' +
                '<div class="apm-delivery-header" style="background:linear-gradient(135deg, #BE123C 0%, #E11D48 100%);">' +
                  '<div class="apm-dh-icon"><i class="fas fa-gamepad"></i></div>' +
                  '<div>' +
                    '<h4>Registrar Misión de Angry Birds (Code.org)</h4>' +
                    '<p>¡Iniciación a la programación! Si superaste los retos en <strong>https://studio.code.org/es/hoc/1</strong> marcá tu entrega con un solo clic para ganar tus <strong>+100 XP</strong>.</p>' +
                  '</div>' +
                '</div>' +
                '<div class="apm-delivery-body">' +
                  '<div style="background:#FFF1F2;border:2px dashed #FDA4AF;border-radius:16px;padding:24px;text-align:center;margin-bottom:16px;">' +
                    '<div style="font-size:3.2rem;margin-bottom:8px;">🐦🎯</div>' +
                    '<h3 style="font-size:1.3rem;font-weight:900;color:#9F1239;margin:0 0 8px;">¿Guiaste al Pájaro hasta el Cerdito Verde?</h3>' +
                    '<p style="font-size:0.92rem;color:#4C0519;max-width:550px;margin:0 auto 18px;line-height:1.5;">' +
                      'Hacé clic en el botón de abajo para registrar tu logro en el sistema, completar la estación del mapa y sumar puntos al progreso de tu taller.' +
                    '</p>' +
                    '<button type="button" id="apm-btn-complete-codeorg" class="apm-delivery-submit-btn" style="background:#E11D48;font-size:1.05rem;padding:12px 28px;box-shadow:0 4px 12px rgba(225,29,72,0.35);cursor:pointer;">' +
                      '<i class="fas fa-trophy"></i> ¡Completé el Nivel en Code.org! (+100 XP)' +
                    '</button>' +
                    '<div style="margin-top:14px;">' +
                      '<a href="https://studio.code.org/es/hoc/1" target="_blank" rel="noopener noreferrer" style="font-size:0.86rem;color:#E11D48;font-weight:700;text-decoration:underline;">' +
                        '<i class="fas fa-external-link-alt"></i> Ir a jugar en https://studio.code.org/es/hoc/1' +
                      '</a>' +
                    '</div>' +
                  '</div>' +
                  '<div id="apm-codeorg-delivery-status">' +
                    (isAlreadyCompleted ?
                      '<div class="apm-status-badge success" style="padding:12px 18px;border-left:4px solid #10B981;"><i class="fas fa-trophy" style="font-size:1.4rem;color:#F59E0B;"></i> <div><strong style="color:#065F46;">Misión Completada ⭐ (+100 XP)</strong><br><span style="font-size:0.84rem;color:#047857;">¡Desafío de Angry Birds en Code.org registrado con éxito! Tu avance está sumado.</span></div></div>' : '') +
                  '</div>' +
                  '<div class="apm-delivery-guide" style="margin-top:16px;">' +
                    '<h5><i class="fas fa-brain"></i> Objetivos Pedagógicos y Beneficios Cumplidos:</h5>' +
                    '<ol>' +
                      '<li><strong>Secuenciación de Algoritmos:</strong> Comprender que los bloques deben ordenarse paso a paso para que el programa funcione.</li>' +
                      '<li><strong>Lateralidad y Orientación:</strong> Diferenciar entre avanzar, girar a la derecha o izquierda en el espacio.</li>' +
                      '<li><strong>Descomposición & Depuración:</strong> Analizar el error cuando el pájaro choca y corregir el código sin frustración.</li>' +
                    '</ol>' +
                  '</div>' +
                '</div>' +
              '</div>' +

              // SUB-PANEL ELECTRÓNICA / CIRCUITO FÍSICO (FOTO O VIDEO)
              '<div id="apm-electro-delivery-section" style="' + (isElectronica ? 'display:block;' : 'display:none;') + '">' +
                '<div class="apm-delivery-header" style="background:linear-gradient(135deg, #B45309 0%, #D97706 100%);">' +
                  '<div class="apm-dh-icon"><i class="fas fa-bolt"></i></div>' +
                  '<div>' +
                    '<h4>Subir Foto o Video del Circuito Armado</h4>' +
                    '<p>¡Proyecto práctico manual! Tomá una foto o video donde se vea tu circuito funcionando con el LED encendido para guardarlo en tu carpeta de Proyectos de Google Drive.</p>' +
                  '</div>' +
                '</div>' +
                '<div class="apm-delivery-body">' +
                  '<div class="apm-scratch-dropzone" id="apm-electro-dropzone" style="border-color:#F59E0B;background:#FFFBEB;">' +
                    '<div class="apm-sd-icon" style="color:#D97706;"><i class="fas fa-camera"></i></div>' +
                    '<h4>Arrastrá tu foto o video del circuito aquí</h4>' +
                    '<p>O hacé clic en el botón para seleccionarlo (.jpg, .png, .jpeg, .mp4, .mov, .webp)</p>' +
                    '<input type="file" id="apm-electro-file-input" style="display:none;" accept="image/*,video/*,.png,.jpg,.jpeg,.mp4,.mov,.webp">' +
                    '<button type="button" id="apm-electro-browse-btn" class="apm-delivery-submit-btn" style="background:#D97706;"><i class="fas fa-camera"></i> Seleccionar Foto / Video</button>' +
                  '</div>' +
                  '<div id="apm-electro-delivery-status" style="margin-top:14px;">' +
                    (savedFileName ?
                      '<div class="apm-status-badge success" style="padding:12px 18px;border-left:4px solid #10B981;"><i class="fas fa-trophy" style="font-size:1.4rem;color:#F59E0B;"></i> <div><strong style="color:#065F46;">Misión Completada ⭐ (+100 XP)</strong><br><span style="font-size:0.84rem;color:#047857;">Circuito entregado: <strong>' + savedFileName + '</strong> (' + savedFileDate + ') guardado en tu Google Drive.</span></div></div>' : '') +
                  '</div>' +
                  '<div class="apm-delivery-guide" style="margin-top:16px;">' +
                    '<h5><i class="fas fa-lightbulb"></i> Consejos para tu entrega de circuito:</h5>' +
                    '<ol>' +
                      '<li>Asegurate de que haya buena iluminación y se vea el LED encendido o el movimiento del invento.</li>' +
                      '<li>Podés subir una foto de la tarjeta pop-up, de la maqueta o de tu circuito terminado.</li>' +
                      '<li>¡También podés subir un dibujo o boceto de las conexiones si lo hiciste primero en papel!</li>' +
                    '</ol>' +
                  '</div>' +
                '</div>' +
              '</div>' +

              // SUB-PANEL MAKECODE
              '<div id="apm-mk-delivery-section" style="' + (!isElectronica && isMakecode ? 'display:block;' : 'display:none;') + '">' +
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
              '<div id="apm-scratch-delivery-section" style="' + (!isElectronica && !isMakecode ? 'display:block;' : 'display:none;') + '">' +
                '<div class="apm-delivery-header" style="background:linear-gradient(135deg, #C2410C 0%, #EA580C 100%);">' +
                  '<div class="apm-dh-icon"><i class="fas fa-cat"></i></div>' +
                  '<div>' +
                    '<h4>Subir Creación de Scratch Jr</h4>' +
                    '<p>Subí tu archivo de Scratch Jr (.sjr, .sb3, .pjson, .sb) o una captura de pantalla de tus personajes y bloques para guardarlo en tu carpeta.</p>' +
                  '</div>' +
                '</div>' +
                '<div class="apm-delivery-body">' +
                  '<div class="apm-scratch-dropzone" id="apm-scratch-dropzone">' +
                    '<div class="apm-sd-icon"><i class="fas fa-cloud-upload-alt"></i></div>' +
                    '<h4>Arrastrá tu archivo de Scratch Jr aquí</h4>' +
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
            (isCodeorg ?
              renderCodeorgSolutionHtml(mission) :
             isElectronica ?
              '<div class="apm-sol-electro-wrap">' +
                '<div class="apm-sol-electro-header">' +
                  '<div class="apm-seh-icon"><i class="fas fa-bolt"></i></div>' +
                  '<div>' +
                    '<h4>Solución Oficial: Esquema y Conexiones del Circuito</h4>' +
                    '<p>Esquema de circuito cerrado, polaridad de componentes y comprobación de conexiones sin programación.</p>' +
                  '</div>' +
                '</div>' +
                '<div class="apm-sol-electro-body">' +

                  // Plano real de la plantilla (si existe en la galería)
                  (mission.gallery && mission.gallery.length > 1 ?
                    '<div class="apm-circuit-schematic-card" style="margin-bottom:16px;background:#FFFBEB;border-color:#F59E0B;">' +
                      '<div class="apm-csc-header">' +
                        '<span><i class="fas fa-drafting-compass"></i> Plano Real de Conexiones en el Sombrero</span>' +
                        '<a href="' + (mission.pdfUrl || mission.gallery[1]) + '" target="_blank" class="apm-csc-badge" style="background:#D97706;color:#FFF;text-decoration:none;"><i class="fas fa-external-link-alt"></i> Ver en Grande</a>' +
                      '</div>' +
                      '<div style="text-align:center;padding:12px;background:#FFF;border-radius:10px;margin-top:8px;">' +
                        '<img src="' + mission.gallery[1] + '" alt="Plano del Circuito" style="max-height:220px;max-width:100%;object-fit:contain;border-radius:6px;border:1px solid #E2E8F0;box-shadow:0 2px 8px rgba(0,0,0,0.06);">' +
                        '<div style="font-size:0.8rem;color:#64748B;margin-top:6px;">Lado posterior del sombrero: pistas de cobre, pila CR2032 y solapa con interruptor de vincha.</div>' +
                      '</div>' +
                    '</div>' : '') +

                  // Diagrama Esquemático del Circuito
                  '<div class="apm-circuit-schematic-card">' +
                    '<div class="apm-csc-header">' +
                      '<span><i class="fas fa-project-diagram"></i> Diagrama Esquemático del Circuito</span>' +
                      '<span class="apm-csc-badge">Circuito Cerrado 3V</span>' +
                    '</div>' +
                    '<div class="apm-circuit-visual-diagram">' +
                      '<div class="apm-cv-node batt">' +
                        '<div class="cv-icon"><i class="fas fa-battery-full"></i></div>' +
                        '<div class="cv-label">Pila Botón CR2032<br><strong>Polo (+) / (-) 3V</strong></div>' +
                      '</div>' +
                      '<div class="apm-cv-line pos">' +
                        '<span class="cv-wire-label">+ Pista Positiva (Cinta Cobre)</span>' +
                        '<i class="fas fa-arrow-right"></i>' +
                      '</div>' +
                      '<div class="apm-cv-node switch">' +
                        '<div class="cv-icon"><i class="fas fa-toggle-on"></i></div>' +
                        '<div class="cv-label">Interruptor Casero<br><strong>Clip / Broche</strong></div>' +
                      '</div>' +
                      '<div class="apm-cv-line pos2">' +
                        '<i class="fas fa-arrow-right"></i>' +
                      '</div>' +
                      '<div class="apm-cv-node led">' +
                        '<div class="cv-icon"><i class="fas fa-lightbulb"></i></div>' +
                        '<div class="cv-label">Diodo LED 5mm<br><strong>Ánodo (+) | Cátodo (-)</strong></div>' +
                      '</div>' +
                      '<div class="apm-cv-line neg">' +
                        '<span class="cv-wire-label">- Pista Negativa (Retorno)</span>' +
                        '<i class="fas fa-arrow-left"></i>' +
                      '</div>' +
                    '</div>' +
                  '</div>' +

                  // Tabla de Polaridad y Conexión
                  '<div class="apm-sol-visual-guide" style="margin-top:16px;">' +
                    '<h5><i class="fas fa-table"></i> Guía de Polaridad y Conexiones Físicas:</h5>' +
                    '<div class="apm-pinout-table-wrap">' +
                      '<table class="apm-pinout-table">' +
                        '<thead>' +
                          '<tr>' +
                            '<th>Componente</th>' +
                            '<th>Terminal / Patita</th>' +
                            '<th>Hacia dónde se conecta</th>' +
                            '<th>Función</th>' +
                          '</tr>' +
                        '</thead>' +
                        '<tbody>' +
                          '<tr>' +
                            '<td><strong>💡 Diodo LED</strong></td>' +
                            '<td><span class="tag-pos">Pata Larga (+ Ánodo)</span></td>' +
                            '<td>Pista Positiva (a través del interruptor)</td>' +
                            '<td>Emite luz al circular corriente</td>' +
                          '</tr>' +
                          '<tr>' +
                            '<td><strong>💡 Diodo LED</strong></td>' +
                            '<td><span class="tag-neg">Pata Corta (- Cátodo)</span></td>' +
                            '<td>Pista Negativa de retorno</td>' +
                            '<td>Cierra el circuito hacia la pila</td>' +
                          '</tr>' +
                          '<tr>' +
                            '<td><strong>🔋 Pila CR2032 (3V)</strong></td>' +
                            '<td><span class="tag-pos">Cara Lisa con Letras (+)</span></td>' +
                            '<td>Pista Positiva</td>' +
                            '<td>Alimentación del circuito</td>' +
                          '</tr>' +
                          '<tr>' +
                            '<td><strong>🔋 Pila CR2032 (3V)</strong></td>' +
                            '<td><span class="tag-neg">Cara Rugosa (-)</span></td>' +
                            '<td>Pista Negativa</td>' +
                            '<td>Masa / Retorno común</td>' +
                          '</tr>' +
                          '<tr>' +
                            '<td><strong>📎 Clip / Broche</strong></td>' +
                            '<td>Metálico conductor</td>' +
                            '<td>En serie sobre la pista (+)</td>' +
                            '<td>Interruptor de encendido manual</td>' +
                          '</tr>' +
                        '</tbody>' +
                      '</table>' +
                    '</div>' +
                  '</div>' +

                  // Guía de Solución de Fallas
                  '<div class="apm-troubleshoot-box" style="margin-top:16px;">' +
                    '<h5><i class="fas fa-stethoscope"></i> ¿Qué hacer si el circuito no enciende? (Resolución de Problemas)</h5>' +
                    '<div class="apm-tb-grid">' +
                      '<div class="apm-tb-item">' +
                        '<h6>1. ¿Patita del LED invertida?</h6>' +
                        '<p>Es la causa más común. Despegá el LED, gíralo 180° e intercambiá las patitas para probar si prende.</p>' +
                      '</div>' +
                      '<div class="apm-tb-item">' +
                        '<h6>2. ¿Falso contacto en la cinta?</h6>' +
                        '<p>Apretá firmemente con la yema del dedo o la uña sobre las esquinas de la cinta y las patas del LED.</p>' +
                      '</div>' +
                      '<div class="apm-tb-item">' +
                        '<h6>3. ¿Cortocircuito?</h6>' +
                        '<p>Revisá que la pista positiva y la pista negativa no se toquen en ningún punto sin pasar por el LED.</p>' +
                      '</div>' +
                      '<div class="apm-tb-item">' +
                        '<h6>4. ¿Carga de la pila?</h6>' +
                        '<p>Probá el LED tocando directamente las patitas contra las dos caras de la pila para confirmar que tenga carga.</p>' +
                      '</div>' +
                    '</div>' +
                  '</div>' +

                  '<div style="text-align:center;margin-top:20px;">' +
                    '<button type="button" class="arm-btn-primary apm-goto-pdf-btn" style="background:#D97706;border-color:#B45309;padding:9px 20px;">' +
                      '<i class="fas fa-file-pdf"></i> Descargar Ficha Técnica Imprimible del Circuito' +
                    '</button>' +
                  '</div>' +
                '</div>' +
              '</div>' :
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
              )
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
                      '<i class="fas fa-external-link-alt"></i> ' + (mission.pdfUrl.indexOf('drive.google') !== -1 ? 'Abrir en Google Drive' : 'Abrir en Pantalla Completa') +
                    '</a>' : '') +
                '</div>' +
              '</div>' +

              '<div style="flex:1 1 auto;overflow:auto;position:relative;">' +
                (mission.pdfUrl ?
                  '<object data="' + mission.pdfUrl + '#toolbar=0" type="application/pdf" class="apm-pdf-frame" style="width:100%;height:100%;min-height:500px;border:none;">' +
                    '<iframe src="' + mission.pdfUrl + '#toolbar=0" class="apm-pdf-frame" style="width:100%;height:100%;border:none;">' +
                      '<p style="padding:20px;text-align:center;color:#475569;">Tu navegador no soporta vista previa de PDF. <a href="' + mission.pdfUrl + '" target="_blank" class="arm-btn-primary" style="display:inline-block;margin-top:10px;"><i class="fas fa-download"></i> Descargar Guía PDF</a></p>' +
                    '</iframe>' +
                  '</object>' :
                  '<div class="apm-printable-sheet" id="apm-printable-sheet">' +
                    '<div class="apm-ps-header">' +
                      '<div>' +
                        '<div class="apm-ps-logo">🏫 Colegio Paulo Freire — Taller de Programación y Robótica</div>' +
                        '<h2 style="font-size:1.35rem;font-weight:900;color:#1E293B;margin:6px 0 2px;">Nivel ' + mission.level + ' • ' + mission.title + '</h2>' +
                        '<div style="font-size:0.85rem;color:#64748B;">Grado: <strong>' + (mission.gradeName || 'General') + '</strong> | Modalidad: ' + (isElectronica ? 'Electrónica y Circuitos Físicos (Sin Programación)' : 'Taller Maker y Programación') + '</div>' +
                      '</div>' +
                      '<img src="' + qrCodeUrl + '" alt="QR Proyecto" style="width:72px;height:72px;border:1px solid #CBD5E1;border-radius:8px;padding:3px;">' +
                    '</div>' +

                    '<div class="apm-ps-section-title"><i class="fas fa-bullseye"></i> 1. Objetivo del Proyecto</div>' +
                    '<p style="font-size:0.9rem;line-height:1.5;color:#334155;margin:0 0 14px;">' + mission.description + '</p>' +

                    '<div class="apm-ps-section-title"><i class="fas fa-tools"></i> 2. Materiales y Recursos</div>' +
                    '<ul style="font-size:0.88rem;color:#334155;margin:0 0 16px;padding-left:22px;line-height:1.5;">' +
                      materialsList.map(function(m){ return '<li><strong>' + m.title + ':</strong> ' + (m.description||'') + '</li>'; }).join('') +
                    '</ul>' +

                    '<div class="apm-ps-section-title"><i class="fas fa-clipboard-check"></i> 3. ' + (isElectronica ? 'Pasos de Armado y Conexión' : 'Pasos de Realización') + '</div>' +
                    '<ol style="font-size:0.88rem;color:#334155;margin:0 0 18px;padding-left:22px;line-height:1.6;">' +
                      (isElectronica && instructionsList && instructionsList.length > 0 ?
                        instructionsList.map(function(st){ return '<li><strong>' + st.title + ':</strong> ' + st.desc + (st.tip ? ' <em>(' + st.tip + ')</em>' : '') + '</li>'; }).join('') :
                        '<li><strong>Diseño previo:</strong> Dibujar en papel el personaje o el sensor que vamos a programar.</li>' +
                        '<li><strong>Programación:</strong> Abrir el editor de código en MakeCode o Scratch y colocar los bloques secuenciales.</li>' +
                        '<li><strong>Simulación:</strong> Probar en el simulador digital que las acciones respondan correctamente al pulsar los botones.</li>' +
                        '<li><strong>Transferencia:</strong> Conectar la placa micro:bit por USB o guardar el proyecto en el panel del alumno.</li>'
                      ) +
                    '</ol>' +

                    '<div style="border-top:1.5px dashed #CBD5E1;padding-top:14px;display:flex;justify-content:space-between;align-items:center;font-size:0.8rem;color:#64748B;">' +
                      '<span>' + (isElectronica ? 'Escaneá el código QR para ver la ficha técnica y fotos en la plataforma.' : 'Escaneá el código QR con el celular para abrir el simulador en vivo.') + '</span>' +
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

    modal.querySelectorAll('.apm-goto-pdf-btn, #apm-goto-pdf-btn').forEach(function(btn){
      btn.onclick = function(){
        switchApmTab('pdf');
      };
    });

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

    // ── CONTROLADORES DE PESTAÑA: MI ENTREGA (CODE.ORG, ELECTRÓNICA, SCRATCH, MAKECODE) ──
    var switchToCodeorg = modal.querySelector('#apm-switch-to-codeorg');
    var switchToElectro = modal.querySelector('#apm-switch-to-electro');
    var switchToScratch = modal.querySelector('#apm-switch-to-scratch');
    var switchToMk = modal.querySelector('#apm-switch-to-mk');
    var secCodeorg = modal.querySelector('#apm-codeorg-delivery-section');
    var secElectro = modal.querySelector('#apm-electro-delivery-section');
    var secScratch = modal.querySelector('#apm-scratch-delivery-section');
    var secMk = modal.querySelector('#apm-mk-delivery-section');

    function setDeliveryMode(mode) {
      if (secCodeorg) secCodeorg.style.display = (mode === 'codeorg' ? 'block' : 'none');
      if (secElectro) secElectro.style.display = (mode === 'electro' ? 'block' : 'none');
      if (secScratch) secScratch.style.display = (mode === 'scratch' ? 'block' : 'none');
      if (secMk) secMk.style.display = (mode === 'mk' ? 'block' : 'none');

      if (switchToCodeorg) {
        switchToCodeorg.style.background = (mode === 'codeorg' ? '#E11D48' : '#E2E8F0');
        switchToCodeorg.style.color = (mode === 'codeorg' ? '#FFF' : '#475569');
        switchToCodeorg.style.boxShadow = (mode === 'codeorg' ? '0 2px 6px rgba(225,29,72,0.3)' : 'none');
      }
      if (switchToElectro) {
        switchToElectro.style.background = (mode === 'electro' ? '#D97706' : '#E2E8F0');
        switchToElectro.style.color = (mode === 'electro' ? '#FFF' : '#475569');
        switchToElectro.style.boxShadow = (mode === 'electro' ? '0 2px 6px rgba(217,119,6,0.3)' : 'none');
      }
      if (switchToScratch) {
        switchToScratch.style.background = (mode === 'scratch' ? '#EA580C' : '#E2E8F0');
        switchToScratch.style.color = (mode === 'scratch' ? '#FFF' : '#475569');
        switchToScratch.style.boxShadow = (mode === 'scratch' ? '0 2px 6px rgba(234,88,12,0.3)' : 'none');
      }
      if (switchToMk) {
        switchToMk.style.background = (mode === 'mk' ? '#7C3AED' : '#E2E8F0');
        switchToMk.style.color = (mode === 'mk' ? '#FFF' : '#475569');
        switchToMk.style.boxShadow = (mode === 'mk' ? '0 2px 6px rgba(124,58,237,0.3)' : 'none');
      }
    }

    if (switchToCodeorg) switchToCodeorg.onclick = function(){ if (window.sounds) window.sounds.playClick(); setDeliveryMode('codeorg'); };
    if (switchToElectro) switchToElectro.onclick = function(){ if (window.sounds) window.sounds.playClick(); setDeliveryMode('electro'); };
    if (switchToScratch) switchToScratch.onclick = function(){ if (window.sounds) window.sounds.playClick(); setDeliveryMode('scratch'); };
    if (switchToMk) switchToMk.onclick = function(){ if (window.sounds) window.sounds.playClick(); setDeliveryMode('mk'); };

    // Establecer modo de entrega inicial
    setDeliveryMode(isCodeorg ? 'codeorg' : (isElectronica ? 'electro' : (isMakecode ? 'mk' : 'scratch')));

    // --- Subida / Completar Misión Code.org (Angry Birds) con 1-Click ---
    var btnCompleteCodeorg = modal.querySelector('#apm-btn-complete-codeorg');
    if (btnCompleteCodeorg) {
      btnCompleteCodeorg.onclick = function() {
        if (window.sounds && window.sounds.playSuccess) window.sounds.playSuccess();
        else if (window.sounds) window.sounds.playClick();

        var nowStr = new Date().toLocaleDateString('es-ES');
        var submissionData = {
          type: 'codeorg',
          gameUrl: mission.gameUrl || 'https://studio.code.org/es/hoc/1',
          date: nowStr,
          completed: true,
          missionId: mission.id,
          missionTitle: mission.title,
          fileName: 'Angry Birds Code.org (Completado)'
        };

        markMissionCompleted(student, mission.id, submissionData);

        var stContainer = modal.querySelector('#apm-codeorg-delivery-status');
        if (stContainer) {
          stContainer.innerHTML = '<div class="apm-status-badge success" style="padding:12px 18px;border-left:4px solid #10B981;margin-top:10px;"><i class="fas fa-trophy" style="font-size:1.4rem;color:#F59E0B;"></i> <div><strong style="color:#065F46;">¡Misión Completada con Éxito! ⭐ (+100 XP)</strong><br><span style="font-size:0.84rem;color:#047857;">Se registró tu entrega de Angry Birds (' + nowStr + '). ¡Puntos y avance sumados!</span></div></div>';
        }
        var topBadge = modal.querySelector('#apm-header-status-badge');
        if (topBadge) {
          topBadge.innerHTML = '<span class="apm-lvl-badge" style="background:#10B981;margin-right:6px;"><i class="fas fa-check-circle"></i> ⭐ COMPLETADO</span>';
        }

        if (typeof refreshDashboard === 'function') refreshDashboard();

        alert('🎉 ¡Felicitaciones! Completaste la misión de Angry Birds (Nivel 2).\nSumaste +100 XP al taller de robótica.');
      };
    }

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
          var fields = { filename: file.name, mimeType: file.type || 'application/octet-stream', base64: b64, folderId: student.driveFolderId || '', subfolder: 'proyectos' };
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

    // --- Subida / Drag & Drop Circuito Electrónico (Foto o Video) ---
    var electroDropzone = modal.querySelector('#apm-electro-dropzone');
    var electroFileInput = modal.querySelector('#apm-electro-file-input');
    var electroBrowseBtn = modal.querySelector('#apm-electro-browse-btn');
    var electroStatusEl = modal.querySelector('#apm-electro-delivery-status');

    if (electroBrowseBtn && electroFileInput) {
      electroBrowseBtn.onclick = function() {
        electroFileInput.click();
      };
    }

    function processElectroUpload(file) {
      if (!file) return;
      var name = file.name.toLowerCase();
      var valid = /\.(jpe?g|png|webp|gif|bmp|mp4|mov|webm|avi|m4v|pdf)$/i.test(name) || /^(image|video)\//i.test(file.type || '');
      if (!valid) {
        if (window.sounds) window.sounds.playError();
        alert('Formato no válido. Por favor seleccioná una foto o video de tu circuito (.jpg, .png, .mp4, .mov, etc.)');
        return;
      }
      if (window.sounds) window.sounds.playSuccess();
      var sz = formatFileSize(file.size);
      if (electroStatusEl) {
        electroStatusEl.innerHTML = '<div class="apm-status-badge warning"><i class="fas fa-sync-alt fa-spin"></i> Subiendo foto/video <strong>' + file.name + '</strong> (' + sz + ')...</div>';
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
          var fields = { filename: file.name, mimeType: file.type || 'image/jpeg', base64: b64, folderId: student.driveFolderId || '', subfolder: 'proyectos' };
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
          type: 'circuito',
          missionId: mission.id,
          missionTitle: mission.title
        };

        // Registrar en FOLDER_CONTENTS.proyecto.items
        if (!FOLDER_CONTENTS.proyecto.items.some(function(it){ return it.name === file.name; })) {
          FOLDER_CONTENTS.proyecto.items.unshift({
            name: file.name,
            title: '⚡ ' + file.name.replace(/\.[^.]+$/, ''),
            size: sz,
            date: nowStr,
            type: 'circuito',
            url: ev.target.result,
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

        if (electroStatusEl) {
          var congratsText = nextMissionTarget
            ? '¡Excelente! Como ya habías entregado esta misión, tu foto/video <strong>' + file.name + '</strong> completó <strong>' + nextMissionTarget.title + '</strong> (Nivel ' + nextMissionTarget.level + ') ⭐ (+100 XP extras sumados).'
            : '¡Circuito entregado con éxito! Archivo: <strong>' + file.name + '</strong> (' + sz + ' • ' + nowStr + ') guardado en tu carpeta de Proyectos. ¡Sumaste +100 XP al Progreso del Taller!';

          electroStatusEl.innerHTML =
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

    if (electroFileInput) {
      electroFileInput.onchange = function() {
        if (electroFileInput.files && electroFileInput.files.length > 0) {
          processElectroUpload(electroFileInput.files[0]);
        }
      };
    }

    if (electroDropzone) {
      electroDropzone.addEventListener('dragover', function(e){ e.preventDefault(); electroDropzone.classList.add('drag-over'); }, false);
      electroDropzone.addEventListener('dragleave', function(e){ e.preventDefault(); electroDropzone.classList.remove('drag-over'); }, false);
      electroDropzone.addEventListener('drop', function(e){
        e.preventDefault();
        electroDropzone.classList.remove('drag-over');
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          processElectroUpload(e.dataTransfer.files[0]);
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
      } else if (subfolder === 'proyectos' || subfolder === 'proyecto') {
        // Formatos permitidos para Scratch Jr y Electrónica / Circuitos
        return /\.(sb3|sjr|pjson|sb|png|jpe?g|webp|gif|mp4|mov)$/i.test(name);
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
            : 'proyectos Scratch (.sjr, .sb3) o fotos/videos de circuitos (.jpg, .png, .mp4)';
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
        var targetSubfolder = (subfolder === 'proyecto' || subfolder === 'proyectos') ? 'proyectos' : subfolder;
        if (hook) {
          var iframe = document.getElementById('gdrive_silent_upload_iframe');
          if (!iframe){ iframe=document.createElement('iframe'); iframe.name=iframe.id='gdrive_silent_upload_iframe'; iframe.style.display='none'; document.body.appendChild(iframe); }
          var form = document.createElement('form'); form.target='gdrive_silent_upload_iframe'; form.method='POST'; form.action=hook;
          var fields = { filename:file.name, mimeType:file.type||'application/octet-stream', base64:b64, folderId:student.driveFolderId||'', subfolder:targetSubfolder };
          for (var k in fields){ var i=document.createElement('input'); i.type='hidden'; i.name=k; i.value=fields[k]; form.appendChild(i); }
          document.body.appendChild(form); form.submit(); setTimeout(function(){ form.remove(); }, 2500);
        }

        var nowStr = new Date().toLocaleDateString('es-ES');
        var isCirc = isProyecto && /\.(jpe?g|png|webp|gif|mp4|mov)$/i.test(file.name);
        var type   = isCirc ? 'circuito' : (fileType || (isProyecto ? 'scratch' : 'image'));
        var icon   = type==='scratch' ? '🐱' : type==='makecode' ? '💻' : type==='circuito' ? '⚡' : '✨';
        var newItem = { name:file.name, title:icon+' '+file.name.replace(/\.[^.]+$/,''), size:sz, date:nowStr,
          url:ev.target.result, downloadUrl:'', isLocalPending:true, type:type };

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
              type: type,
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
    activeFolderKey='proyectos'; proyectoSubTab='scratch'; currentCarouselIndex=0;
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
  window.openAdventureProjectModal = openAdventureProjectModal;
  window.getAdventureMissionsForStudent = getAdventureMissionsForStudent;
})();

