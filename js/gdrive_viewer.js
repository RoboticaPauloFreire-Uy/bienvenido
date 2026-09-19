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
        var isPaint    = p.type === 'paint' || (p.tags && p.tags.some(function(t){ return /paint|dibujo|cancha|bandera/i.test(t); })) || (/cancha|bandera/i.test(p.title || ''));
        var isMakecode = !isPaint && !!p.makecodeUrl;
        var isScratch  = !isPaint && (!!p.scratchId || p.type === 'scratch' || p.platform === 'codejr' || (p.tags && p.tags.some(function(t){ return /scratch ?jr|codejr|velocidad|perspectiva|perpestiva/i.test(t); })));
        var isCodeorg  = !isPaint && (p.type === 'codeorg' || p.platform === 'codeorg' || (p.externalUrl && p.externalUrl.includes('code.org')) || (p.tags && p.tags.some(function(t){ return /code\.org|angry ?birds|frozen|minecraft/i.test(t); })));
        var isElectronica = !isPaint && !isCodeorg && !isScratch && (p.type === 'electronica' || p.isElectronica || (p.tags && p.tags.some(function(t){ return /electr[oó]nica|circuito|sin programaci[oó]n|papertronics/i.test(t); })) || (!p.makecodeUrl && !p.scratchId && p.materials && p.materials.some(function(m){ return /led|pila|bater[ií]a|cobre|circuito|motor/i.test((m.title||'') + ' ' + (m.description||'')); })));
        var type  = isPaint ? 'paint' : (p.type || (isCodeorg ? 'codeorg' : (isElectronica ? 'electronica' : (isMakecode ? 'makecode' : (isScratch ? 'scratch' : 'robotica')))));
        var badge = isPaint ? (p.badge || '🎨 Arte Digital & Figuras') : (p.badge || (isCodeorg ? '🎮 Programación & Algoritmos' : (isElectronica ? '⚡ Circuito Electrónico' : (isMakecode ? '🕹️ MakeCode Arcade' : (isScratch ? '🐱 Scratch Jr' : '🚀 Proyecto Maker')))));
        var icon  = isPaint ? (p.icon || 'fa-palette') : (p.icon || (isCodeorg ? 'fa-puzzle-piece' : (isElectronica ? 'fa-bolt' : (isMakecode ? 'fa-gamepad' : (isScratch ? 'fa-cat' : 'fa-rocket')))));
        var color = isPaint ? (p.color || '#16A34A') : (p.color || (isCodeorg ? (p.color || '#E11D48') : (isElectronica ? '#D97706' : (isScratch ? '#EA580C' : (gradeObj.color || '#2563EB')))));

        missions.push({
          id: p.id || ('proj-' + idx),
          level: p.level || levelCount++,
          title: p.title,
          subtitle: p.author ? ('Por ' + p.author) : (gradeObj.name),
          description: p.description || (isPaint ? 'Actividad de dibujo digital con figuras geométricas en Paint.' : (isElectronica ? 'Construí un circuito funcional con materiales del taller sin necesidad de programar.' : 'Desafío y proyecto de programación del grado.')),
          objective: p.objective || (isPaint ? 'Aprender a utilizar las figuras geométricas y el bote de pintura en Paint para dibujar una cancha de fútbol completa.' : (isElectronica ? 'Construir un circuito eléctrico seguro con cinta de cobre conductora, pila botón CR2032 y luz LED verde en el trébol del sombrero de San Patricio, logrando que se encienda con la presión de la cabeza.' : (isCodeorg ? 'Aprender a programar y dar los primeros pasos de razonamiento en programación guiando al pájaro a través del laberinto hasta el cerdito.' : null))),
          benefits: p.benefits || (isPaint ? 'Desarrolla la motricidad fina digital con el mouse, el reconocimiento de formas geométricas y la creatividad gráfica sin frustración.' : (isElectronica ? 'Desarrolla la motricidad fina, comprensión de circuito cerrado y polaridad (+ / -), causa-efecto en electricidad y confianza creativa maker.' : (isCodeorg ? 'Desarrolla el pensamiento computacional, la estructuración de algoritmos paso a paso, la lateralidad y orientación espacial y la depuración de errores.' : null))),
          gameUrl: isPaint ? null : (p.gameUrl || p.externalUrl || null),
          externalUrl: isPaint ? null : (p.externalUrl || p.gameUrl || null),
          projectFileUrl: p.projectFileUrl || p.downloadUrl || null,
          platform: p.platform || null,
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
    if (gradeId === 'sala5' || gradeId === 'grado1' || gradeId === '1ero') {
      mkLib = [];
    }
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

    // 3. Vincular Guías PDF de Google Drive (FOLDER_CONTENTS.proyectos.items) a los proyectos existentes
    // (NO creamos misiones extra/duplicadas en la ruta de aventuras)
    var drivePdfs = (FOLDER_CONTENTS.proyectos && FOLDER_CONTENTS.proyectos.items) || [];
    drivePdfs.forEach(function(pdf) {
      var pName = (pdf.name || pdf.title || '').toLowerCase();
      missions.forEach(function(m) {
        var mTitle = (m.title || '').toLowerCase();
        if ((mTitle.includes(pName) || pName.includes(mTitle) ||
            (pName.includes('codejr') && mTitle.includes('codejr')) ||
            (pName.includes('velocidad') && mTitle.includes('velocidad')) ||
            (pName.includes('perspectiva') && mTitle.includes('perspectiva')) ||
            (pName.includes('perpestiva') && mTitle.includes('perpestiva')) ||
            (pName.includes('patricio') && mTitle.includes('patricio')) ||
            (pName.includes('frozen') && mTitle.includes('frozen')) ||
            (pName.includes('minecraft') && mTitle.includes('minecraft')) ||
            (pName.includes('angry') && mTitle.includes('angry'))) && !m.pdfUrl) {
          m.pdfUrl = pdf.url;
          m.downloadPdfUrl = pdf.downloadUrl || pdf.url;
        }
      });
    });

    // Asegurar que no queden misiones de tipo 'pdf' sueltas o duplicadas
    missions = missions.filter(function(m) {
      return m && m.type !== 'pdf' && !(m.id && m.id.toString().startsWith('pdf-'));
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
    var isSpotlightGrade = (student.gradeId === 'sala5' || student.gradeId === 'grado1' || student.gradeId === '1ero');
    if (isSpotlightGrade) {
      var adventureMissions = missions || [];
      var isGrado1 = (student.gradeId === 'grado1' || student.gradeId === '1ero');

      var idxSombrero = adventureMissions.findIndex(function(m){
        return (m.id === 's5-p1' || m.id === 'g1-p1') || (/sombrero|patricio/i.test(m.title || ''));
      });
      if (idxSombrero === -1) idxSombrero = 0;

      var idxSlide1 = -1;
      if (isGrado1) {
        idxSlide1 = adventureMissions.findIndex(function(m){
          return (m.id === 'g1-p3') || (/marca ?libro|origami|tom sawyer/i.test(m.title || ''));
        });
        if (idxSlide1 === -1) idxSlide1 = 2;
      } else {
        idxSlide1 = adventureMissions.findIndex(function(m){
          return (m.id === 's5-p3') || (/varita/i.test(m.title || ''));
        });
        if (idxSlide1 === -1) idxSlide1 = 2;
      }

      var idxMadre = adventureMissions.findIndex(function(m){
        return (m.id === 's5-p5' || m.id === 'g1-p5') || (/madre|coraz[oó]n|pop-up/i.test(m.title || ''));
      });
      if (idxMadre === -1) idxMadre = 4;

      var activeSpotlight = window.sala5SpotlightCurrentSlide || 0;
      if (activeSpotlight < 0 || activeSpotlight > 2) activeSpotlight = 0;
      var slide1Theme = isGrado1 ? 'theme-marcalibro' : 'theme-varita';
      var spotlightTheme = (activeSpotlight === 1) ? slide1Theme : (activeSpotlight === 2 ? 'theme-madre' : 'theme-sombrero');

      var slide1TabHtml = isGrado1
        ? '<button type="button" class="arm-s5-tab-pill tab-marcalibro ' + (activeSpotlight === 1 ? 'active' : '') + '" data-spotlight-idx="1" data-spotlight-theme="marcalibro">' +
            '<span>📖 Marca-Libros Tom Sawyer</span>' +
          '</button>'
        : '<button type="button" class="arm-s5-tab-pill ' + (activeSpotlight === 1 ? 'active' : '') + '" data-spotlight-idx="1">' +
            '<span>🪄 Varita Mágica</span>' +
          '</button>';

      var slide1ContentHtml = isGrado1
        ? // SLIDE 1: Marca-Libros Origami de Tom Sawyer (1° Grado)
          '<div class="arm-s5-slide ' + (activeSpotlight === 1 ? 'active' : '') + '" data-slide-idx="1" style="' + (activeSpotlight === 1 ? 'display:block;' : 'display:none;') + '">' +
            '<span class="arm-s5-watermark">📖</span>' +
            '<div class="arm-s5-content-row">' +
              '<div class="arm-s5-preview arm-s5-bookmark-preview" id="arm-g1-bookmark-interactive" role="button" tabindex="0" title="¡Hacé click para encender la luz en el gorro de Tom Sawyer!">' +
                '<img src="img/proyectos/tomsawyer_marcalibro_cover.svg" alt="Marca-Libros Origami de Tom Sawyer" class="arm-s5-preview-img">' +
                '<div class="arm-s5-led-glow glow-marcalibro" id="arm-g1-led-glow-bookmark"><i class="fas fa-lightbulb"></i></div>' +
                '<span class="arm-s5-interactive-hint" style="background:rgba(217, 119, 6, 0.95);"><i class="fas fa-hand-pointer"></i> ¡Tocá el gorro para encender!</span>' +
              '</div>' +
              '<div class="arm-s5-info">' +
                '<div class="arm-s5-tag" style="color:#D97706;"><i class="fas fa-bookmark"></i> PROYECTO OFICIAL 1° GRADO • NIVEL 3</div>' +
                '<h3 class="arm-s5-title" style="color:#78350F;">El Marca-Libros Origami de Tom Sawyer 📖🎩💡</h3>' +
                '<p class="arm-s5-desc">¡Nuestro señalador esquinero con tecnología! Doblamos una <strong>hoja de papel glacé</strong> con la técnica origami para calzar en la esquina de las páginas del libro. Montamos un circuito ultraplano con <strong>cinta de cobre</strong>, una <strong>pila botón</strong> y un <strong>LED chato (SMD)</strong> en el centro del gorro de Tom Sawyer. Al marcar el libro y presionar, ¡el gorro se ilumina con una luz brillante!</p>' +
                '<div class="arm-s5-materials-pills">' +
                  '<span style="border-color:#FDE68A;color:#B45309;"><i class="fas fa-scroll"></i> Hoja papel glacé</span>' +
                  '<span style="border-color:#FDE68A;color:#B45309;"><i class="fas fa-shapes"></i> Plegado esquinero</span>' +
                  '<span style="border-color:#FDE68A;color:#B45309;"><i class="fas fa-lightbulb"></i> LED chato (SMD)</span>' +
                  '<span style="border-color:#FDE68A;color:#B45309;"><i class="fas fa-tape"></i> Cinta de cobre</span>' +
                  '<span style="border-color:#FDE68A;color:#B45309;"><i class="fas fa-battery-full"></i> Pila CR2032</span>' +
                  '<span style="border-color:#FDE68A;color:#B45309;"><i class="fas fa-hat-cowboy"></i> Gorro Tom Sawyer</span>' +
                '</div>' +
                '<div class="arm-s5-actions">' +
                  '<button type="button" class="arm-s5-btn-main arm-btn-open-presentation" style="background:linear-gradient(135deg, #D97706 0%, #F59E0B 100%);box-shadow:0 4px 14px rgba(217,119,6,0.35);" data-mission-idx="' + idxSlide1 + '">' +
                    '<i class="fas fa-chalkboard-teacher"></i> <span>Ver Modo Presentación Guiado</span>' +
                  '</button>' +
                  '<button type="button" class="arm-s5-btn-pdf arm-btn-open-pdf" style="color:#D97706;border-color:#FDE68A;" data-mission-idx="' + idxSlide1 + '">' +
                    '<i class="fas fa-microchip"></i> <span>Guía de Doblado y Circuito</span>' +
                  '</button>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>'
        : // SLIDE 1: La Varita Mágica Luminosa (Sala de 5)
          '<div class="arm-s5-slide ' + (activeSpotlight === 1 ? 'active' : '') + '" data-slide-idx="1" style="' + (activeSpotlight === 1 ? 'display:block;' : 'display:none;') + '">' +
            '<span class="arm-s5-watermark">🪄</span>' +
            '<div class="arm-s5-content-row">' +
              '<div class="arm-s5-preview arm-s5-wand-preview" id="arm-s5-wand-interactive" role="button" tabindex="0" title="¡Hacé click para encender la luz de la varita!">' +
                '<img src="img/proyectos/varita_magica_cover.png" alt="Varita Mágica Luminosa" class="arm-s5-preview-img">' +
                '<div class="arm-s5-led-glow glow-varita" id="arm-s5-led-glow-varita"><i class="fas fa-magic"></i></div>' +
                '<span class="arm-s5-interactive-hint" style="background:rgba(124, 58, 237, 0.9);"><i class="fas fa-wand-magic-sparkles"></i> ¡Tocá para hacer magia!</span>' +
              '</div>' +
              '<div class="arm-s5-info">' +
                '<div class="arm-s5-tag" style="color:#7C3AED;"><i class="fas fa-magic"></i> PROYECTO OFICIAL SALA DE 5 AÑOS • NIVEL 3</div>' +
                '<h3 class="arm-s5-title" style="color:#581C87;">La Varita Mágica Luminosa 🪄✨</h3>' +
                '<p class="arm-s5-desc">¡Construimos una varita mágica brillante! Montamos un circuito sobre un <strong>palito de algodón de azúcar</strong> con <strong>cinta de cobre</strong>, un <strong>diodo LED</strong> en la punta y una <strong>pila botón</strong>. Al presionar el interruptor táctil en el mango, ¡la varita se ilumina con destellos mágicos!</p>' +
                '<div class="arm-s5-materials-pills">' +
                  '<span style="border-color:#D8B4FE;color:#6B21A8;"><i class="fas fa-magic"></i> Palito de algodón</span>' +
                  '<span style="border-color:#D8B4FE;color:#6B21A8;"><i class="fas fa-lightbulb"></i> LED alto brillo</span>' +
                  '<span style="border-color:#D8B4FE;color:#6B21A8;"><i class="fas fa-tape"></i> Cinta de cobre</span>' +
                  '<span style="border-color:#D8B4FE;color:#6B21A8;"><i class="fas fa-battery-full"></i> Pila CR2032</span>' +
                  '<span style="border-color:#D8B4FE;color:#6B21A8;"><i class="fas fa-hand-pointer"></i> Pulsador en mango</span>' +
                '</div>' +
                '<div class="arm-s5-actions">' +
                  '<button type="button" class="arm-s5-btn-main arm-btn-open-presentation" style="background:linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%);box-shadow:0 4px 14px rgba(124,58,237,0.35);" data-mission-idx="' + idxSlide1 + '">' +
                    '<i class="fas fa-chalkboard-teacher"></i> <span>Ver Modo Presentación Guiado</span>' +
                  '</button>' +
                  '<button type="button" class="arm-s5-btn-pdf arm-btn-open-pdf" style="color:#7C3AED;border-color:#DDD6FE;" data-mission-idx="' + idxSlide1 + '">' +
                    '<i class="fas fa-microchip"></i> <span>Guía y Esquema del Circuito</span>' +
                  '</button>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>';

      var gradeLabelText = isGrado1 ? '1° GRADO' : 'SALA DE 5 AÑOS';

      sala5SpecialBannerHtml =
        '<div class="arm-sala5-spotlight-card ' + spotlightTheme + '" id="arm-sala5-spotlight-carousel">' +
          // Barra superior del carrusel con escudo y pestañas
          '<div class="arm-s5-carousel-topbar">' +
            '<div class="arm-s5-badge-top">' +
              '<img src="img/escudo_paulo_freire.png" alt="Colegio Paulo Freire" class="arm-s5-crest">' +
              '<span>Colegio Paulo Freire · Taller de robótica y programación</span>' +
            '</div>' +
            '<div class="arm-s5-carousel-nav">' +
              '<button type="button" class="arm-s5-cnav-btn arm-s5-prev-btn" title="Proyecto Anterior" aria-label="Anterior">' +
                '<i class="fas fa-chevron-left"></i>' +
              '</button>' +
              '<div class="arm-s5-carousel-tabs">' +
                '<button type="button" class="arm-s5-tab-pill ' + (activeSpotlight === 0 ? 'active' : '') + '" data-spotlight-idx="0">' +
                  '<span>🍀 Sombrero</span>' +
                '</button>' +
                slide1TabHtml +
                '<button type="button" class="arm-s5-tab-pill ' + (activeSpotlight === 2 ? 'active' : '') + '" data-spotlight-idx="2">' +
                  '<span>💖 Tarjeta Pop-Up 3D</span>' +
                '</button>' +
              '</div>' +
              '<button type="button" class="arm-s5-cnav-btn arm-s5-next-btn" title="Proyecto Siguiente" aria-label="Siguiente">' +
                '<i class="fas fa-chevron-right"></i>' +
              '</button>' +
            '</div>' +
          '</div>' +

          // Contenedor de diapositivas
          '<div class="arm-s5-slides-container">' +
            // SLIDE 0: Sombrero de San Patricio
            '<div class="arm-s5-slide ' + (activeSpotlight === 0 ? 'active' : '') + '" data-slide-idx="0" style="' + (activeSpotlight === 0 ? 'display:block;' : 'display:none;') + '">' +
              '<span class="arm-s5-watermark">🍀</span>' +
              '<div class="arm-s5-content-row">' +
                '<div class="arm-s5-preview arm-s5-hat-preview" id="arm-s5-hat-interactive" role="button" tabindex="0" title="¡Hacé click para encender la luz verde del trébol!">' +
                  '<img src="img/proyectos/sombrero_san_patricio_solo_sombrero.png" alt="Sombrero de San Patricio" class="arm-s5-preview-img">' +
                  '<div class="arm-s5-led-glow glow-sombrero" id="arm-s5-led-glow-sombrero"><i class="fas fa-lightbulb"></i></div>' +
                  '<span class="arm-s5-interactive-hint"><i class="fas fa-hand-pointer"></i> ¡Tocá para encender!</span>' +
                '</div>' +
                '<div class="arm-s5-info">' +
                  '<div class="arm-s5-tag"><i class="fas fa-sparkles"></i> PROYECTO OFICIAL ' + gradeLabelText + ' • NIVEL 1</div>' +
                  '<h3 class="arm-s5-title">El Sombrero Luminoso de San Patricio 🍀🎩</h3>' +
                  '<p class="arm-s5-desc">¡Nuestro primer invento maker! Aprendemos cómo viaja la electricidad con <strong>cinta de cobre conductora</strong>, un <strong>diodo LED verde</strong> en el trébol y una <strong>pila botón CR2032</strong> con interruptor en la vincha.</p>' +
                  '<div class="arm-s5-materials-pills">' +
                    '<span><i class="fas fa-tape"></i> Cinta de cobre</span>' +
                    '<span><i class="fas fa-lightbulb"></i> LED verde</span>' +
                    '<span><i class="fas fa-battery-full"></i> Pila CR2032</span>' +
                    '<span><i class="fas fa-toggle-on"></i> Interruptor Vincha</span>' +
                  '</div>' +
                  '<div class="arm-s5-actions">' +
                    '<button type="button" class="arm-s5-btn-main arm-btn-open-presentation" data-mission-idx="' + idxSombrero + '">' +
                      '<i class="fas fa-chalkboard-teacher"></i> <span>Ver Modo Presentación Guiado</span>' +
                    '</button>' +
                    '<button type="button" class="arm-s5-btn-pdf arm-btn-open-pdf" data-mission-idx="' + idxSombrero + '">' +
                      '<i class="fas fa-file-pdf"></i> <span>Guía y Plantilla PDF</span>' +
                    '</button>' +
                  '</div>' +
                '</div>' +
              '</div>' +
            '</div>' +

            // SLIDE 1 (Varita para Sala 5, Marca-Libros para 1° Grado)
            slide1ContentHtml +

            // SLIDE 2: Tarjeta Pop-Up 3D (Día de la Madre)
            '<div class="arm-s5-slide ' + (activeSpotlight === 2 ? 'active' : '') + '" data-slide-idx="2" style="' + (activeSpotlight === 2 ? 'display:block;' : 'display:none;') + '">' +
              '<span class="arm-s5-watermark">💖</span>' +
              '<div class="arm-s5-content-row">' +
                '<div class="arm-s5-preview arm-s5-card-preview" id="arm-s5-card-interactive" role="button" tabindex="0" title="¡Hacé click en el escudo para iluminar el corazón!">' +
                  '<img src="img/proyectos/dia_madre_tarjeta_3d_cover.png" alt="Tarjeta Pop-Up 3D Día de la Madre" class="arm-s5-preview-img">' +
                  '<div class="arm-s5-led-glow glow-madre" id="arm-s5-led-glow-madre"><i class="fas fa-heart"></i></div>' +
                  '<span class="arm-s5-interactive-hint" style="background:rgba(225, 29, 72, 0.9);"><i class="fas fa-shield-alt"></i> ¡Tocá el escudo!</span>' +
                '</div>' +
                '<div class="arm-s5-info">' +
                  '<div class="arm-s5-tag" style="color:#BE123C;"><i class="fas fa-heart"></i> PROYECTO OFICIAL ' + gradeLabelText + ' • NIVEL 5</div>' +
                  '<h3 class="arm-s5-title" style="color:#881337;">Tarjeta Pop-Up 3D: Corazón Luminoso para Mamá 💖✨</h3>' +
                  '<p class="arm-s5-desc">¡Regalo especial en Papertronics! Al abrir la tarjeta se despliega un <strong>corazón pixel 3D en relieve</strong> con la foto del peque en el centro. Al presionar el <strong>escudo del Colegio Paulo Freire</strong>, ¡se activa un circuito con luz LED que baña los bordes del corazón con un resplandor mágico!</p>' +
                  '<div class="arm-s5-materials-pills">' +
                    '<span style="border-color:#FDA4AF;color:#9F1239;"><i class="fas fa-heart"></i> Corazón 3D Pop-Up</span>' +
                    '<span style="border-color:#FDA4AF;color:#9F1239;"><i class="fas fa-portrait"></i> Foto del Niño/a</span>' +
                    '<span style="border-color:#FDA4AF;color:#9F1239;"><i class="fas fa-shield-alt"></i> Pulsador Escudo Freire</span>' +
                    '<span style="border-color:#FDA4AF;color:#9F1239;"><i class="fas fa-lightbulb"></i> LED Alto Brillo</span>' +
                    '<span style="border-color:#FDA4AF;color:#9F1239;"><i class="fas fa-battery-full"></i> Pila CR2032</span>' +
                    '<span style="border-color:#FDA4AF;color:#9F1239;"><i class="fas fa-tape"></i> Cinta de Cobre</span>' +
                  '</div>' +
                  '<div class="arm-s5-actions">' +
                    '<button type="button" class="arm-s5-btn-main arm-btn-open-presentation" style="background:linear-gradient(135deg, #BE123C 0%, #E11D48 100%);box-shadow:0 4px 14px rgba(225,29,72,0.35);" data-mission-idx="' + idxMadre + '">' +
                      '<i class="fas fa-chalkboard-teacher"></i> <span>Ver Modo Presentación Guiado</span>' +
                    '</button>' +
                    '<button type="button" class="arm-s5-btn-pdf arm-btn-open-pdf" style="color:#BE123C;border-color:#FECDD3;" data-mission-idx="' + idxMadre + '">' +
                      '<i class="fas fa-file-pdf"></i> <span>Guía y Plantilla PDF</span>' +
                    '</button>' +
                  '</div>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +

          // Indicador de puntos (dots)
          '<div class="arm-s5-carousel-dots">' +
            '<span class="arm-s5-dot ' + (activeSpotlight === 0 ? 'active' : '') + '" data-spotlight-idx="0" title="El Sombrero Luminoso"></span>' +
            '<span class="arm-s5-dot ' + (activeSpotlight === 1 ? 'active' : '') + '" data-spotlight-idx="1" title="' + (isGrado1 ? 'Marca-Libros Tom Sawyer' : 'La Varita Mágica') + '"></span>' +
            '<span class="arm-s5-dot ' + (activeSpotlight === 2 ? 'active' : '') + '" data-spotlight-idx="2" title="Tarjeta Pop-Up 3D"></span>' +
          '</div>' +
        '</div>';
    }

    var bodyHtml = '';

    // ── Estación Llegada a la Meta (Fin del Camino Maker) ──
    var finishSideClass = (missions.length % 2 === 0) ? 'station-left' : 'station-right';
    var isAllCompleted = missions.length > 0 && completedCount === missions.length;
    var finishStatusText = isAllCompleted ? '🏆 ¡Meta Cumplida!' : (completedCount > 0 ? '🚀 ¡Rumbo a la Meta!' : '🏁 Estación Final');

    var finishHtml =
      '<div class="arm-station arm-finish-station ' + finishSideClass + '" id="arm-llegada-meta">' +
        '<div class="arm-node-column">' +
          '<div class="arm-node-bubble arm-node-finish" role="button" tabindex="0" onclick="window.celebrateMetaArrival && window.celebrateMetaArrival();" title="¡Tocar para celebrar la Llegada a la Meta! 🏁🎉">' +
            '<span class="arm-node-level">META</span>' +
            '<span class="arm-node-num">🏁</span>' +
            '<div class="arm-node-icon"><i class="fas fa-trophy"></i></div>' +
          '</div>' +
        '</div>' +
        '<div class="arm-mission-card arm-finish-card">' +
          '<div class="arm-mc-header">' +
            '<span class="arm-finish-badge">' +
              '<i class="fas fa-flag-checkered"></i> LLEGADA A LA META' +
            '</span>' +
            '<span class="arm-mc-status ' + (isAllCompleted ? 'completado' : 'activo') + '">' +
              finishStatusText +
            '</span>' +
          '</div>' +
          '<div class="arm-finish-body">' +
            '<div class="arm-finish-content">' +
              '<h4 class="arm-finish-title">' +
                '<span>🏆 ¡Llegada a la Meta del Taller Maker!</span>' +
              '</h4>' +
              '<p class="arm-finish-desc">' +
                '¡Felicitaciones por recorrer y superar los desafíos de <strong>' + student.gradeName + '</strong>! Experimentaste con circuitos de electrónica, creaste dibujos y figuras en Paint, y programaste algoritmos y velocidades en Scratch Jr. ¡Sos un gran creador tecnológico!' +
              '</p>' +
              '<div class="arm-finish-stats-row">' +
                '<div class="arm-finish-stat-pill">' +
                  '<i class="fas fa-check-circle" style="color:#10B981;"></i>' +
                  '<span><strong>' + completedCount + ' de ' + missions.length + '</strong> misiones superadas</span>' +
                '</div>' +
                '<div class="arm-finish-stat-pill">' +
                  '<i class="fas fa-star" style="color:#F59E0B;"></i>' +
                  '<span><strong>+' + (completedCount * 100) + ' XP</strong> acumulados</span>' +
                '</div>' +
                '<div class="arm-finish-stat-pill">' +
                  '<i class="fas fa-award" style="color:#4F46E5;"></i>' +
                  '<span><strong>Ciclo Maker 2026</strong></span>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="arm-mc-footer" style="margin-top:10px;">' +
            '<button type="button" class="arm-finish-celebrate-btn" onclick="window.celebrateMetaArrival && window.celebrateMetaArrival();">' +
              '<i class="fas fa-flag-checkered"></i> ¡Festejar Llegada a la Meta! 🎉' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    var gridFinishHtml =
      '<div class="arm-grid-card arm-finish-card">' +
        '<div class="arm-mc-header">' +
          '<span class="arm-finish-badge">' +
            '<i class="fas fa-flag-checkered"></i> LLEGADA A LA META' +
          '</span>' +
          '<span class="arm-mc-status ' + (isAllCompleted ? 'completado' : 'activo') + '">' +
            finishStatusText +
          '</span>' +
        '</div>' +
        '<div class="arm-finish-body" style="padding:10px 0;">' +
          '<h4 class="arm-finish-title">🏆 ¡Llegada a la Meta!</h4>' +
          '<p class="arm-finish-desc">' +
            '¡Completaste el camino de proyectos de <strong>' + student.gradeName + '</strong>! Felicitaciones por tu creatividad, pensamiento computacional y entusiasmo.' +
          '</p>' +
          '<div class="arm-finish-stats-row">' +
            '<div class="arm-finish-stat-pill">' +
              '<i class="fas fa-trophy" style="color:#F59E0B;"></i>' +
              '<span><strong>' + completedCount + ' / ' + missions.length + '</strong> misiones</span>' +
            '</div>' +
            '<div class="arm-finish-stat-pill">' +
              '<i class="fas fa-star" style="color:#F59E0B;"></i>' +
              '<span><strong>+' + (completedCount * 100) + ' XP</strong></span>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="arm-mc-footer">' +
          '<button type="button" class="arm-finish-celebrate-btn" onclick="window.celebrateMetaArrival && window.celebrateMetaArrival();">' +
            '<i class="fas fa-flag-checkered"></i> ¡Festejar Llegada a la Meta! 🎉' +
          '</button>' +
        '</div>' +
      '</div>';

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
                (m.objective ?
                  '<div class="arm-concept-accordion arm-concept-objective" data-concept-type="objective">' +
                    '<button type="button" class="arm-concept-toggle-btn" aria-expanded="false" title="Tocar para agrandar o achicar el objetivo">' +
                      '<span class="arm-ct-left"><i class="fas fa-bullseye"></i> <strong>Objetivo</strong></span>' +
                      '<span class="arm-ct-right"><span class="arm-ct-status">Agrandar</span> <i class="fas fa-chevron-down arm-ct-icon"></i></span>' +
                    '</button>' +
                    '<div class="arm-concept-drawer">' +
                      '<div class="arm-concept-content">' +
                        '<p>' + m.objective + '</p>' +
                        '<div class="arm-concept-actions">' +
                          '<button type="button" class="arm-concept-modal-btn" data-concept-type="objective" data-mission-idx="' + idx + '" title="Ampliar explicación pedagógica completa">' +
                            '<i class="fas fa-expand-alt"></i> Ampliar' +
                          '</button>' +
                        '</div>' +
                      '</div>' +
                    '</div>' +
                  '</div>' : '') +
                (m.benefits ?
                  '<div class="arm-concept-accordion arm-concept-benefits" data-concept-type="benefits">' +
                    '<button type="button" class="arm-concept-toggle-btn" aria-expanded="false" title="Tocar para agrandar o achicar los beneficios">' +
                      '<span class="arm-ct-left"><i class="fas fa-brain"></i> <strong>Beneficios</strong></span>' +
                      '<span class="arm-ct-right"><span class="arm-ct-status">Agrandar</span> <i class="fas fa-chevron-down arm-ct-icon"></i></span>' +
                    '</button>' +
                    '<div class="arm-concept-drawer">' +
                      '<div class="arm-concept-content">' +
                        '<p>' + m.benefits + '</p>' +
                        '<div class="arm-concept-actions">' +
                          '<button type="button" class="arm-concept-modal-btn" data-concept-type="benefits" data-mission-idx="' + idx + '" title="Ampliar beneficios de razonamiento completos">' +
                            '<i class="fas fa-expand-alt"></i> Ampliar' +
                          '</button>' +
                        '</div>' +
                      '</div>' +
                    '</div>' +
                  '</div>' : '') +
              '</div>' +
              '<div class="arm-mc-footer">' +
                '<button type="button" class="arm-btn-primary arm-btn-open-modal" data-mission-idx="' + idx + '">' +
                  '<i class="fas fa-play"></i> Iniciar Misión' +
                '</button>' +
                (m.type === 'canva' || /canva/i.test(m.gameUrl || '') ? '<a href="' + (m.gameUrl || 'https://www.canva.com/es_419/crear/animaciones/') + '" target="_blank" rel="noopener noreferrer" class="arm-btn-secondary" style="color:#0284C7;border-color:#BAE6FD;"><i class="fas fa-palette"></i> Abrir Canva</a>' : (m.type === 'canva' || /canva/i.test(m.gameUrl || '') ? '<a href="' + (m.gameUrl || 'https://www.canva.com/es_419/crear/animaciones/') + '" target="_blank" rel="noopener noreferrer" class="arm-btn-secondary" style="color:#0284C7;border-color:#BAE6FD;"><i class="fas fa-palette"></i> Abrir Canva</a>' : (m.gameUrl && m.type !== 'paint' && !/cancha|paint/i.test(m.title || '') ? '<a href="' + m.gameUrl + '" target="_blank" rel="noopener noreferrer" class="arm-btn-secondary" style="color:#E11D48;border-color:#FDA4AF;"><i class="fas fa-gamepad"></i> Jugar</a>' : ''))) +
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
        finishHtml +
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
              (m.objective ?
                '<div class="arm-concept-accordion arm-concept-objective" data-concept-type="objective">' +
                  '<button type="button" class="arm-concept-toggle-btn" aria-expanded="false" title="Tocar para agrandar o achicar el objetivo">' +
                    '<span class="arm-ct-left"><i class="fas fa-bullseye"></i> <strong>Objetivo</strong></span>' +
                    '<span class="arm-ct-right"><span class="arm-ct-status">Agrandar</span> <i class="fas fa-chevron-down arm-ct-icon"></i></span>' +
                  '</button>' +
                  '<div class="arm-concept-drawer">' +
                    '<div class="arm-concept-content">' +
                      '<p>' + m.objective + '</p>' +
                      '<div class="arm-concept-actions">' +
                        '<button type="button" class="arm-concept-modal-btn" data-concept-type="objective" data-mission-idx="' + idx + '" title="Ampliar explicación pedagógica completa">' +
                          '<i class="fas fa-expand-alt"></i> Ampliar' +
                        '</button>' +
                      '</div>' +
                    '</div>' +
                  '</div>' +
                '</div>' : '') +
              (m.benefits ?
                '<div class="arm-concept-accordion arm-concept-benefits" data-concept-type="benefits">' +
                  '<button type="button" class="arm-concept-toggle-btn" aria-expanded="false" title="Tocar para agrandar o achicar los beneficios">' +
                    '<span class="arm-ct-left"><i class="fas fa-brain"></i> <strong>Beneficios</strong></span>' +
                    '<span class="arm-ct-right"><span class="arm-ct-status">Agrandar</span> <i class="fas fa-chevron-down arm-ct-icon"></i></span>' +
                  '</button>' +
                  '<div class="arm-concept-drawer">' +
                    '<div class="arm-concept-content">' +
                      '<p>' + m.benefits + '</p>' +
                      '<div class="arm-concept-actions">' +
                        '<button type="button" class="arm-concept-modal-btn" data-concept-type="benefits" data-mission-idx="' + idx + '" title="Ampliar beneficios de razonamiento completos">' +
                          '<i class="fas fa-expand-alt"></i> Ampliar' +
                        '</button>' +
                      '</div>' +
                    '</div>' +
                  '</div>' +
                '</div>' : '') +
            '</div>' +
            '<div class="arm-mc-footer">' +
              '<button type="button" class="arm-btn-primary arm-btn-open-modal" data-mission-idx="' + idx + '">' +
                '<i class="fas fa-play"></i> Iniciar' +
              '</button>' +
              (m.gameUrl && m.type !== 'paint' && !/cancha|paint/i.test(m.title || '') ? '<a href="' + m.gameUrl + '" target="_blank" rel="noopener noreferrer" class="arm-btn-secondary" style="color:#E11D48;border-color:#FDA4AF;"><i class="fas fa-gamepad"></i> Jugar</a>' : '') +
              '<button type="button" class="arm-btn-secondary arm-btn-open-presentation" data-mission-idx="' + idx + '">' +
                '<i class="fas fa-chalkboard-teacher"></i> Presentación' +
              '</button>' +
              '<button type="button" class="arm-btn-ghost arm-btn-open-pdf" data-mission-idx="' + idx + '">' +
                '<i class="fas fa-file-pdf"></i> PDF' +
              '</button>' +
            '</div>' +
          '</div>';
        }).join('') +
        gridFinishHtml +
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

      // Clic en estación o tarjeta (excluyendo botones, links y acordeones de objetivo/beneficios)
      container.querySelectorAll('.arm-station, .arm-mission-card, .arm-grid-card').forEach(function(card){
        card.onclick = function(e){
          if (e.target.closest('button') || e.target.closest('a') || e.target.closest('.arm-concept-accordion')) return;
          var idx = parseInt(card.dataset.missionIdx, 10);
          var mission = adventureMissions[idx];
          if (mission) openAdventureProjectModal(mission, 'presentacion');
        };
      });

      // Clic para achicar o agrandar Objetivo o Beneficios (Acordeón colapsable)
      container.querySelectorAll('.arm-concept-toggle-btn').forEach(function(btn){
        btn.onclick = function(e){
          e.stopPropagation();
          e.preventDefault();
          if (window.sounds && window.sounds.playClick) window.sounds.playClick();
          var accordion = btn.closest('.arm-concept-accordion');
          if (!accordion) return;
          var isOpen = accordion.classList.toggle('is-open');
          btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
          var statusSpan = btn.querySelector('.arm-ct-status');
          if (statusSpan) {
            statusSpan.textContent = isOpen ? 'Achicar' : 'Agrandar';
          }
        };
      });

      // Clic para Ampliar en Detalle (Abre Modal Pedagógico completo)
      container.querySelectorAll('.arm-concept-modal-btn').forEach(function(btn){
        btn.onclick = function(e){
          e.stopPropagation();
          e.preventDefault();
          if (window.sounds && window.sounds.playClick) window.sounds.playClick();
          var cType = btn.dataset.conceptType || 'objective';
          var missionIdx = btn.dataset.missionIdx;
          var gameLevel = btn.dataset.gameLevel;
          var dataObj = null;
          if (missionIdx !== undefined && adventureMissions && adventureMissions[parseInt(missionIdx, 10)]) {
            dataObj = adventureMissions[parseInt(missionIdx, 10)];
          } else if (gameLevel !== undefined) {
            var lvl = parseInt(gameLevel, 10);
            if (gradeGames) dataObj = gradeGames.find(function(g){ return g.level === lvl; });
            if (!dataObj && adventureMissions) {
              dataObj = adventureMissions.find(function(m){ return m.level === lvl; });
            }
          }
          if (dataObj) {
            openPedagogicalConceptModal(cType, dataObj);
          }
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

      // Carrusel Spotlight para Sala de 5 (Sombrero, Varita Mágica y Tarjeta Pop-Up 3D)
      var spotlightCarousel = container.querySelector('#arm-sala5-spotlight-carousel');
      if (spotlightCarousel) {
        function setSpotlightSlide(newIdx) {
          if (newIdx < 0) newIdx = 2;
          if (newIdx > 2) newIdx = 0;
          window.sala5SpotlightCurrentSlide = newIdx;

          // Theme del card
          var isG1Student = student && (student.gradeId === 'grado1' || student.gradeId === '1ero');
          var slide1Theme = isG1Student ? 'theme-marcalibro' : 'theme-varita';
          spotlightCarousel.classList.remove('theme-sombrero', 'theme-varita', 'theme-madre', 'theme-marcalibro');
          spotlightCarousel.classList.add(newIdx === 1 ? slide1Theme : (newIdx === 2 ? 'theme-madre' : 'theme-sombrero'));

          // Slides
          spotlightCarousel.querySelectorAll('.arm-s5-slide').forEach(function(sl){
            var sIdx = parseInt(sl.dataset.slideIdx, 10);
            if (sIdx === newIdx) {
              sl.classList.add('active');
              sl.style.display = 'block';
            } else {
              sl.classList.remove('active');
              sl.style.display = 'none';
            }
          });

          // Pestañas (tabs)
          spotlightCarousel.querySelectorAll('.arm-s5-tab-pill').forEach(function(p){
            var pIdx = parseInt(p.dataset.spotlightIdx, 10);
            if (pIdx === newIdx) p.classList.add('active');
            else p.classList.remove('active');
          });

          // Puntos (dots)
          spotlightCarousel.querySelectorAll('.arm-s5-dot').forEach(function(d){
            var dIdx = parseInt(d.dataset.spotlightIdx, 10);
            if (dIdx === newIdx) d.classList.add('active');
            else d.classList.remove('active');
          });
        }

        var prevBtn = spotlightCarousel.querySelector('.arm-s5-prev-btn');
        if (prevBtn) {
          prevBtn.onclick = function(e){
            e.stopPropagation();
            if (window.sounds) window.sounds.playClick();
            setSpotlightSlide((window.sala5SpotlightCurrentSlide || 0) - 1);
          };
        }

        var nextBtn = spotlightCarousel.querySelector('.arm-s5-next-btn');
        if (nextBtn) {
          nextBtn.onclick = function(e){
            e.stopPropagation();
            if (window.sounds) window.sounds.playClick();
            setSpotlightSlide((window.sala5SpotlightCurrentSlide || 0) + 1);
          };
        }

        spotlightCarousel.querySelectorAll('.arm-s5-tab-pill, .arm-s5-dot').forEach(function(el){
          el.onclick = function(e){
            e.stopPropagation();
            if (window.sounds) window.sounds.playClick();
            var targetIdx = parseInt(el.dataset.spotlightIdx, 10);
            if (!isNaN(targetIdx)) setSpotlightSlide(targetIdx);
          };
        });

        // Soporte para gestos táctiles (swipe en tablets y celulares)
        var touchStartX = 0;
        var touchEndX = 0;
        spotlightCarousel.addEventListener('touchstart', function(e){
          touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });
        spotlightCarousel.addEventListener('touchend', function(e){
          touchEndX = e.changedTouches[0].screenX;
          var diff = touchStartX - touchEndX;
          if (Math.abs(diff) > 40) {
            if (diff > 0) {
              setSpotlightSlide((window.sala5SpotlightCurrentSlide || 0) + 1);
            } else {
              setSpotlightSlide((window.sala5SpotlightCurrentSlide || 0) - 1);
            }
          }
        }, { passive: true });

        // Previews interactivos con luces LED de cada invento
        // 1. Sombrero de San Patricio (luz verde)
        var hatInteractive = spotlightCarousel.querySelector('#arm-s5-hat-interactive');
        if (hatInteractive) {
          hatInteractive.onclick = function(e){
            e.stopPropagation();
            var glow = spotlightCarousel.querySelector('#arm-s5-led-glow-sombrero');
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

        // 2. Varita Mágica Luminosa (luz violeta / destello)
        var wandInteractive = spotlightCarousel.querySelector('#arm-s5-wand-interactive');
        if (wandInteractive) {
          wandInteractive.onclick = function(e){
            e.stopPropagation();
            var glow = spotlightCarousel.querySelector('#arm-s5-led-glow-varita');
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

        // 2b. Marca-Libros Origami de Tom Sawyer (luz ámbar en el sombrero - Grado 1)
        var bookmarkInteractive = spotlightCarousel.querySelector('#arm-g1-bookmark-interactive');
        if (bookmarkInteractive) {
          bookmarkInteractive.onclick = function(e){
            e.stopPropagation();
            var glow = spotlightCarousel.querySelector('#arm-g1-led-glow-bookmark');
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

        // 3. Tarjeta Pop-Up 3D Día de la Madre (luz rosa / corazón)
        var cardInteractive = spotlightCarousel.querySelector('#arm-s5-card-interactive');
        if (cardInteractive) {
          cardInteractive.onclick = function(e){
            e.stopPropagation();
            var glow = spotlightCarousel.querySelector('#arm-s5-led-glow-madre');
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

    // ── Juegos del Grado (botón para saltar a la misión en Ruta Maker y clic para ampliar razonamiento) ──
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

      // Clic para achicar o agrandar razonamiento pedagógico en juegos
      container.querySelectorAll('.arm-concept-toggle-btn').forEach(function(btn){
        btn.onclick = function(e){
          e.stopPropagation();
          e.preventDefault();
          if (window.sounds && window.sounds.playClick) window.sounds.playClick();
          var accordion = btn.closest('.arm-concept-accordion');
          if (!accordion) return;
          var isOpen = accordion.classList.toggle('is-open');
          btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
          var statusSpan = btn.querySelector('.arm-ct-status');
          if (statusSpan) {
            statusSpan.textContent = isOpen ? 'Achicar' : 'Agrandar';
          }
        };
      });

      // Clic para Ampliar en Detalle en juegos (Abre Modal Pedagógico)
      container.querySelectorAll('.arm-concept-modal-btn').forEach(function(btn){
        btn.onclick = function(e){
          e.stopPropagation();
          e.preventDefault();
          if (window.sounds && window.sounds.playClick) window.sounds.playClick();
          var lvl = parseInt(btn.dataset.gameLevel, 10);
          var dataObj = gradeGames.find(function(g){ return g.level === lvl; });
          if (!dataObj && adventureMissions) {
            dataObj = adventureMissions.find(function(m){ return m.level === lvl; });
          }
          if (dataObj) {
            openPedagogicalConceptModal('benefits', dataObj);
          }
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
            '<div class="arm-concept-accordion arm-concept-benefits ggc-concept-accordion" data-concept="benefits">' +
              '<button type="button" class="arm-concept-toggle-btn" aria-expanded="false" title="Tocar para agrandar o achicar el razonamiento pedagógico">' +
                '<span class="arm-ct-left"><i class="fas fa-brain"></i> <strong>Razonamiento Pedagógico</strong></span>' +
                '<span class="arm-ct-right"><span class="arm-ct-status">Agrandar</span> <i class="fas fa-chevron-down arm-ct-icon"></i></span>' +
              '</button>' +
              '<div class="arm-concept-drawer">' +
                '<div class="arm-concept-content">' +
                  '<p class="ggc-bb-text">' + game.benefits + '</p>' +
                  '<div class="arm-concept-actions">' +
                    '<button type="button" class="arm-concept-modal-btn" data-concept-type="benefits" data-game-level="' + levelNum + '" title="Ampliar razonamiento pedagógico completo">' +
                      '<i class="fas fa-expand-alt"></i> Ampliar' +
                    '</button>' +
                  '</div>' +
                '</div>' +
              '</div>' +
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
  // RENDER SOLUCIÓN OFICIAL PARA CODE.ORG (FROZEN / ANGRY BIRDS)
  // ──────────────────────────────────────────────────
  function renderFrozenSolutionHtml(mission) {
    var gameUrl = (mission && mission.gameUrl) || 'https://studio.code.org/s/frozen/lessons/1/levels/1';
    return '<div class="apm-sol-codeorg-wrap">' +
      '<div class="apm-sol-electro-header" style="background:linear-gradient(135deg, #0369A1 0%, #0284C7 100%);">' +
        '<div class="apm-seh-icon"><i class="fas fa-snowflake"></i></div>' +
        '<div>' +
          '<h4>Solución Oficial: Geometría y Algoritmos con Ana y Elsa (Code.org)</h4>' +
          '<p>Secuencias paso a paso de patinaje geométrico en <strong>' + gameUrl + '</strong>: de Paint al código con ángulos y bucles.</p>' +
        '</div>' +
      '</div>' +
      '<div class="apm-sol-electro-body" style="padding:18px;">' +
        '<div style="margin-bottom:16px;background:#F0F9FF;border:1.5px solid #BAE6FD;border-radius:12px;padding:14px;">' +
          '<h5 style="margin:0 0 6px;color:#0369A1;font-size:0.95rem;"><i class="fas fa-shapes"></i> Puente Cognitivo: De Paint a la Programación Geométrica</h5>' +
          '<p style="margin:0;font-size:0.86rem;color:#0C4A6E;line-height:1.5;">' +
            'En el Nivel 4 trazamos la cancha en Paint usando el mouse a mano alzada. Aquí le enseñamos a la computadora la receta matemática de las figuras: un cuadrado no es solo una forma, ¡es avanzar 100 píxeles y girar 90 grados repetido 4 veces en el hielo!' +
          '</p>' +
        '</div>' +
        '<div class="codeorg-levels-solutions-grid">' +
          '<div class="col-sol-card" style="border-left:3.5px solid #0284C7;">' +
            '<div class="col-sc-header"><span class="col-sc-lvl" style="background:#0284C7;">Nivel 1</span> <strong>Línea Recta sobre el Hielo</strong></div>' +
            '<div class="col-sc-blocks">' +
              '<div class="co-block when-run"><i class="fas fa-play"></i> Al ejecutar</div>' +
              '<div class="co-block move-forward" style="background:#0284C7;border-color:#0369A1;"><i class="fas fa-arrows-alt-v"></i> avanzar 100 píxeles</div>' +
            '</div>' +
            '<div class="col-sc-note">Elsa patina en línea recta. Es la base de los lados de cualquier figura geométrica.</div>' +
          '</div>' +
          '<div class="col-sol-card" style="border-left:3.5px solid #2563EB;">' +
            '<div class="col-sc-header"><span class="col-sc-lvl" style="background:#2563EB;">Nivel 2</span> <strong>Esquina y Ángulo Recto (90°)</strong></div>' +
            '<div class="col-sc-blocks">' +
              '<div class="co-block when-run"><i class="fas fa-play"></i> Al ejecutar</div>' +
              '<div class="co-block move-forward" style="background:#0284C7;border-color:#0369A1;"><i class="fas fa-arrows-alt-v"></i> avanzar 100 píxeles</div>' +
              '<div class="co-block turn-right" style="background:#2563EB;border-color:#1D4ED8;"><i class="fas fa-redo"></i> girar a la derecha 90 grados ↷</div>' +
              '<div class="co-block move-forward" style="background:#0284C7;border-color:#0369A1;"><i class="fas fa-arrows-alt-v"></i> avanzar 100 píxeles</div>' +
            '</div>' +
            '<div class="col-sc-note">Girar 90° crea una esquina recta perfecta, igual que los arcos de fútbol en Paint.</div>' +
          '</div>' +
          '<div class="col-sol-card" style="border-left:3.5px solid #10B981;">' +
            '<div class="col-sc-header"><span class="col-sc-lvl" style="background:#10B981;">Nivel 3</span> <strong>Cuadrado Completo con Bucle</strong></div>' +
            '<div class="col-sc-blocks">' +
              '<div class="co-block when-run"><i class="fas fa-play"></i> Al ejecutar</div>' +
              '<div class="co-block" style="background:#10B981;border-color:#047857;color:#FFF;padding:4px 8px;border-radius:4px;font-size:0.76rem;margin-bottom:3px;"><i class="fas fa-sync-alt"></i> repetir 4 veces</div>' +
              '<div style="padding-left:14px;border-left:2px dashed #10B981;">' +
                '<div class="co-block move-forward" style="background:#0284C7;border-color:#0369A1;"><i class="fas fa-arrows-alt-v"></i> avanzar 100 píxeles</div>' +
                '<div class="co-block turn-right" style="background:#2563EB;border-color:#1D4ED8;"><i class="fas fa-redo"></i> girar a la derecha 90° ↷</div>' +
              '</div>' +
            '</div>' +
            '<div class="col-sc-note">En lugar de usar 8 bloques, el bucle repite 4 veces las órdenes para cerrar el cuadrado.</div>' +
          '</div>' +
          '<div class="col-sol-card" style="border-left:3.5px solid #7C3AED;">' +
            '<div class="col-sc-header"><span class="col-sc-lvl" style="background:#7C3AED;">Nivel 4</span> <strong>Copos de Nieve y Estrellas</strong></div>' +
            '<div class="col-sc-blocks">' +
              '<div class="co-block when-run"><i class="fas fa-play"></i> Al ejecutar</div>' +
              '<div class="co-block" style="background:#7C3AED;border-color:#5B21B6;color:#FFF;padding:4px 8px;border-radius:4px;font-size:0.76rem;margin-bottom:3px;"><i class="fas fa-sync-alt"></i> repetir 6 veces</div>' +
              '<div style="padding-left:14px;border-left:2px dashed #7C3AED;">' +
                '<div class="co-block move-forward" style="background:#0284C7;border-color:#0369A1;"><i class="fas fa-arrows-alt-v"></i> avanzar 100 píxeles</div>' +
                '<div class="co-block turn-right" style="background:#2563EB;border-color:#1D4ED8;"><i class="fas fa-redo"></i> girar a la derecha 60° ↷</div>' +
              '</div>' +
            '</div>' +
            '<div class="col-sc-note">Reduciendo los grados del giro (60°), ¡Elsa crea un hexágono y copos de nieve mágicos!</div>' +
          '</div>' +
        '</div>' +
        '<div style="text-align:center;margin-top:20px;">' +
          '<a href="' + gameUrl + '" target="_blank" rel="noopener noreferrer" class="arm-btn-primary" style="background:#0284C7;border-color:#0369A1;padding:10px 22px;">' +
            '<i class="fas fa-external-link-alt"></i> Abrir Desafío en Code.org Frozen' +
          '</a>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function renderMinecraftSolutionHtml(mission) {
    var gameUrl = (mission && mission.gameUrl) || 'https://studio.code.org/s/mc/lessons/1/levels/1';
    return '<div class="apm-sol-codeorg-wrap">' +
      '<div class="apm-sol-electro-header" style="background:linear-gradient(135deg, #064E3B 0%, #059669 100%);">' +
        '<div class="apm-seh-icon"><i class="fas fa-cube"></i></div>' +
        '<div>' +
          '<h4>Solución Oficial: Programación en Minecraft (Code.org)</h4>' +
          '<p>Secuencias paso a paso de los primeros niveles en <strong>' + gameUrl + '</strong> para Steve y Alex.</p>' +
        '</div>' +
      '</div>' +
      '<div class="apm-sol-electro-body" style="padding:18px;">' +
        '<div style="margin-bottom:16px;background:#FEF3C7;border:1.5px solid #F59E0B;border-radius:12px;padding:14px;">' +
          '<h5 style="margin:0 0 6px;color:#92400E;font-size:0.95rem;"><i class="fas fa-exclamation-triangle"></i> Aclaración Importante: Adaptación Educativa Oficial de Code.org</h5>' +
          '<p style="margin:0;font-size:0.86rem;color:#78350F;line-height:1.5;">' +
            'Este NO es el videojuego comercial de Minecraft de supervivencia o modo libre. Es una adaptación interactiva creada por Code.org junto a Mojang para enseñar programación temprana: Steve y Alex no responden al teclado ni joystick, solo ejecutan los bloques de código que los alumnos encastran.' +
          '</p>' +
        '</div>' +
        '<div class="codeorg-levels-solutions-grid">' +
          '<div class="col-sol-card" style="border-left:3.5px solid #059669;">' +
            '<div class="col-sc-header"><span class="col-sc-lvl" style="background:#059669;">Nivel 1</span> <strong>Llegar a la Oveja</strong></div>' +
            '<div class="col-sc-blocks">' +
              '<div class="co-block when-run"><i class="fas fa-play"></i> Al ejecutar</div>' +
              '<div class="co-block move-forward" style="background:#059669;border-color:#047857;"><i class="fas fa-arrow-up"></i> avanzar</div>' +
              '<div class="co-block move-forward" style="background:#059669;border-color:#047857;"><i class="fas fa-arrow-up"></i> avanzar</div>' +
            '</div>' +
            '<div class="col-sc-note">Steve o Alex dan dos pasos en línea recta por la cuadrícula para encontrarse con la oveja.</div>' +
          '</div>' +
          '<div class="col-sol-card" style="border-left:3.5px solid #B45309;">' +
            '<div class="col-sc-header"><span class="col-sc-lvl" style="background:#B45309;">Nivel 2</span> <strong>Talar el Árbol de Madera</strong></div>' +
            '<div class="col-sc-blocks">' +
              '<div class="co-block when-run"><i class="fas fa-play"></i> Al ejecutar</div>' +
              '<div class="co-block move-forward" style="background:#059669;border-color:#047857;"><i class="fas fa-arrow-up"></i> avanzar</div>' +
              '<div class="co-block move-forward" style="background:#059669;border-color:#047857;"><i class="fas fa-arrow-up"></i> avanzar</div>' +
              '<div class="co-block" style="background:#B45309;border-color:#92400E;color:#FFF;padding:4px 8px;border-radius:4px;font-size:0.76rem;margin-bottom:3px;"><i class="fas fa-hammer"></i> destruir bloque</div>' +
            '</div>' +
            '<div class="col-sc-note">Combinar movimiento con una acción física: caminar hasta el tronco y picar la madera.</div>' +
          '</div>' +
          '<div class="col-sol-card" style="border-left:3.5px solid #2563EB;">' +
            '<div class="col-sc-header"><span class="col-sc-lvl" style="background:#2563EB;">Nivel 3</span> <strong>Esquilar las Ovejas</strong></div>' +
            '<div class="col-sc-blocks">' +
              '<div class="co-block when-run"><i class="fas fa-play"></i> Al ejecutar</div>' +
              '<div class="co-block move-forward" style="background:#059669;border-color:#047857;"><i class="fas fa-arrow-up"></i> avanzar</div>' +
              '<div class="co-block move-forward" style="background:#059669;border-color:#047857;"><i class="fas fa-arrow-up"></i> avanzar</div>' +
              '<div class="co-block" style="background:#2563EB;border-color:#1D4ED8;color:#FFF;padding:4px 8px;border-radius:4px;font-size:0.76rem;margin-bottom:3px;"><i class="fas fa-cut"></i> trasquilar</div>' +
            '</div>' +
            '<div class="col-sc-note">Aprender a obtener lana para construir la cama antes de que caiga la noche.</div>' +
          '</div>' +
          '<div class="col-sol-card" style="border-left:3.5px solid #7C3AED;">' +
            '<div class="col-sc-header"><span class="col-sc-lvl" style="background:#7C3AED;">Nivel 4</span> <strong>Talar con Bucles (Repetición)</strong></div>' +
            '<div class="col-sc-blocks">' +
              '<div class="co-block when-run"><i class="fas fa-play"></i> Al ejecutar</div>' +
              '<div class="co-block" style="background:#7C3AED;border-color:#5B21B6;color:#FFF;padding:4px 8px;border-radius:4px;font-size:0.76rem;margin-bottom:3px;"><i class="fas fa-sync-alt"></i> repetir 3 veces</div>' +
              '<div style="padding-left:14px;border-left:2px dashed #7C3AED;">' +
                '<div class="co-block move-forward" style="background:#059669;border-color:#047857;"><i class="fas fa-arrow-up"></i> avanzar</div>' +
                '<div class="co-block" style="background:#B45309;border-color:#92400E;color:#FFF;padding:4px 8px;border-radius:4px;font-size:0.76rem;margin-bottom:3px;"><i class="fas fa-hammer"></i> destruir bloque</div>' +
              '</div>' +
            '</div>' +
            '<div class="col-sc-note">Uso del bucle para que el personaje recolecte tres bloques de madera de forma automática.</div>' +
          '</div>' +
        '</div>' +
        '<div style="text-align:center;margin-top:20px;">' +
          '<a href="' + gameUrl + '" target="_blank" rel="noopener noreferrer" class="arm-btn-primary" style="background:#059669;border-color:#047857;padding:10px 22px;">' +
            '<i class="fas fa-external-link-alt"></i> Abrir Desafío en Code.org Minecraft' +
          '</a>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function renderCodeorgSolutionHtml(mission) {
    var isMinecraft = mission && ((mission.tags && mission.tags.some(function(t){ return /minecraft|steve|alex/i.test(t); })) || (/minecraft/i.test(mission.title || '')));
    if (isMinecraft) {
      return renderMinecraftSolutionHtml(mission);
    }
    var isFrozen = mission && ((mission.tags && mission.tags.some(function(t){ return /frozen|elsa|anna|ana/i.test(t); })) || (/frozen|elsa|anna|ana/i.test(mission.title || '')));
    if (isFrozen) {
      return renderFrozenSolutionHtml(mission);
    }
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

  function renderPaintBanderasSolutionHtml(mission) {
    return '<div class="apm-sol-electro-wrap">' +
      '<div class="apm-sol-electro-header" style="background:linear-gradient(135deg, #1E40AF 0%, #2563EB 100%);">' +
        '<div class="apm-seh-icon"><i class="fas fa-flag"></i></div>' +
        '<div>' +
          '<h4>Solución Oficial: Banderas del Mundial en Paint (Descomposición Geométrica)</h4>' +
          '<p>Guía de figuras paso a paso: marco exterior rectangular, división en franjas horizontales/verticales, círculo central con sol y relleno con el bote de pintura.</p>' +
        '</div>' +
      '</div>' +
      '<div class="apm-sol-electro-body">' +
        '<div class="apm-circuit-schematic-card" style="margin-bottom:16px;background:#EFF6FF;border:1.5px solid #93C5FD;">' +
          '<div class="apm-csc-header" style="border-bottom-color:#BFDBFE;">' +
            '<span style="color:#1E40AF;font-weight:900;"><i class="fas fa-image"></i> Modelo Visual de Banderas en Paint</span>' +
            '<a href="img/proyectos/banderas_mundial_paint_guia.png" target="_blank" class="apm-csc-badge" style="background:#2563EB;color:#FFF;text-decoration:none;"><i class="fas fa-external-link-alt"></i> Ver en Grande</a>' +
          '</div>' +
          '<div style="text-align:center;padding:12px;background:#FFF;border-radius:10px;margin-top:8px;">' +
            '<img src="img/proyectos/banderas_mundial_paint_guia.png" alt="Guía Banderas Paint" style="max-height:240px;max-width:100%;object-fit:contain;border-radius:6px;border:1px solid #E2E8F0;box-shadow:0 2px 8px rgba(0,0,0,0.06);">' +
            '<div style="font-size:0.8rem;color:#64748B;margin-top:6px;">Descomposición de banderas: 1. Marco rectangular base, 2. Franjas paralelas rectas, 3. Soles, círculos o estrellas, 4. Colores oficiales con balde.</div>' +
          '</div>' +
        '</div>' +
        '<div class="apm-sol-visual-guide" style="margin-top:16px;">' +
          '<h5><i class="fas fa-shapes"></i> Figuras y Herramientas Utilizadas para Cada Bandera:</h5>' +
          '<div class="apm-pinout-table-wrap">' +
            '<table class="apm-pinout-table">' +
              '<thead>' +
                '<tr>' +
                  '<th>Bandera</th>' +
                  '<th>Figuras Geométricas</th>' +
                  '<th>Herramientas de Paint</th>' +
                  '<th>Detalle y Colores</th>' +
                '</tr>' +
              '</thead>' +
              '<tbody>' +
                '<tr>' +
                  '<td><strong>🇺🇾 Uruguay</strong></td>' +
                  '<td>Rectángulo base + 9 franjas + Cuadrado cantón + Círculo sol</td>' +
                  '<td>Rectángulo, Línea recta (Shift), Elipse (Shift), Balde</td>' +
                  '<td>4 franjas azul marino, 5 franjas blancas, Sol de Mayo amarillo</td>' +
                '</tr>' +
                '<tr>' +
                  '<td><strong>🇦🇷 Argentina</strong></td>' +
                  '<td>Rectángulo base + 3 franjas horizontales + Círculo sol</td>' +
                  '<td>Rectángulo, Línea recta (Shift), Elipse (Shift), Balde</td>' +
                  '<td>2 franjas celeste cielo, 1 blanca central, Sol de Mayo amarillo</td>' +
                '</tr>' +
                '<tr>' +
                  '<td><strong>🇧🇷 Brasil</strong></td>' +
                  '<td>Rectángulo base + Rombo central + Círculo central</td>' +
                  '<td>Rectángulo, Polígono (rombo 4 lados), Elipse, Balde</td>' +
                  '<td>Fondo verde bosque, rombo amarillo oro, círculo azul central</td>' +
                '</tr>' +
                '<tr>' +
                  '<td><strong>🇫🇷 Francia</strong></td>' +
                  '<td>Rectángulo base + 3 franjas verticales iguales</td>' +
                  '<td>Rectángulo, 2 Líneas rectas verticales con Shift, Balde</td>' +
                  '<td>Azul oscuro a la izquierda, blanco al medio y rojo a la derecha</td>' +
                '</tr>' +
              '</tbody>' +
            '</table>' +
          '</div>' +
        '</div>' +
        '<div class="apm-troubleshoot-box" style="margin-top:16px;">' +
          '<h5><i class="fas fa-magic"></i> Consejos y Trucos para Dibujar Banderas en Paint</h5>' +
          '<div class="apm-tb-grid">' +
            '<div class="apm-tb-item" style="border-left-color:#2563EB;">' +
              '<h6>1. Franjas derechas y paralelas</h6>' +
              '<p>Mantené pulsada la tecla <strong>Shift (Mayús)</strong> mientras arrastrás la herramienta <strong>Línea</strong> para trazar franjas 100% horizontales sin torcerte.</p>' +
            '</div>' +
            '<div class="apm-tb-item" style="border-left-color:#10B981;">' +
              '<h6>2. Unir bien las esquinas</h6>' +
              '<p>Asegurate de que las líneas toquen exactamente el borde del marco. Si queda un milímetro abierto, el balde pintará todo el lienzo.</p>' +
            '</div>' +
            '<div class="apm-tb-item" style="border-left-color:#D97706;">' +
              '<h6>3. Sol y círculos redondos</h6>' +
              '<p>Usá la herramienta <strong>Elipse</strong> con <strong>Shift</strong> para que el sol salga redondo y no ovalado. Pintalo de amarillo antes de hacer los rayos.</p>' +
            '</div>' +
            '<div class="apm-tb-item" style="border-left-color:#7C3AED;">' +
              '<h6>4. Deshacer con Ctrl + Z</h6>' +
              '<p>Si un color se derrama o una línea sale torcida, apretá inmediatamente <strong>Ctrl + Z</strong> para corregirlo sin empezar de nuevo.</p>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function renderDiaMadreSolutionHtml(mission) {
    return '<div class="apm-sol-electro-wrap">' +
      '<div class="apm-sol-electro-header" style="background:linear-gradient(135deg, #9F1239 0%, #E11D48 100%);">' +
        '<div class="apm-seh-icon"><i class="fas fa-heart"></i></div>' +
        '<div>' +
          '<h4>Solución Oficial: Tarjeta Pop-Up 3D con Circuito Papertronics y Escudo Freire 💖</h4>' +
          '<p>Plegado escalonado del corazón pixelado, foto centrada, circuito de cinta de cobre y pulsador en el escudo del Colegio Paulo Freire.</p>' +
        '</div>' +
      '</div>' +
      '<div class="apm-sol-electro-body">' +

        // Galería de planos oficiales: Portada y Plantilla
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;margin-bottom:18px;">' +
          '<div class="apm-circuit-schematic-card" style="background:#FFF1F2;border:1.5px solid #FDA4AF;margin:0;">' +
            '<div class="apm-csc-header" style="border-bottom-color:#FECDD3;">' +
              '<span style="color:#9F1239;font-weight:900;"><i class="fas fa-heart"></i> Portada y Corazón 3D con Escudo</span>' +
              '<a href="img/proyectos/dia_madre_tarjeta_3d_cover.png" target="_blank" class="apm-csc-badge" style="background:#E11D48;color:#FFF;text-decoration:none;"><i class="fas fa-external-link-alt"></i> Ampliar</a>' +
            '</div>' +
            '<div style="text-align:center;padding:12px;background:#FFF;border-radius:10px;margin-top:8px;">' +
              '<img src="img/proyectos/dia_madre_tarjeta_3d_cover.png" alt="Portada Tarjeta Pop-Up 3D" style="max-height:220px;max-width:100%;object-fit:contain;border-radius:6px;border:1px solid #E2E8F0;box-shadow:0 2px 8px rgba(0,0,0,0.06);cursor:pointer;" onclick="window.open(this.src,\'_blank\')">' +
              '<div style="font-size:0.8rem;color:#64748B;margin-top:6px;">"Para Quien Ilumina Mi Vida", corazón 3D escalonado con foto central y escudo del Colegio Paulo Freire en la base.</div>' +
            '</div>' +
          '</div>' +

          '<div class="apm-circuit-schematic-card" style="background:#FFFBEB;border:1.5px solid #FCD34D;margin:0;">' +
            '<div class="apm-csc-header" style="border-bottom-color:#FDE68A;">' +
              '<span style="color:#92400E;font-weight:900;"><i class="fas fa-microchip"></i> Plantilla Técnica del Circuito</span>' +
              '<a href="img/proyectos/dia_madre_circuito_plantilla.png" target="_blank" class="apm-csc-badge" style="background:#D97706;color:#FFF;text-decoration:none;"><i class="fas fa-external-link-alt"></i> Ampliar</a>' +
            '</div>' +
            '<div style="text-align:center;padding:12px;background:#FFF;border-radius:10px;margin-top:8px;">' +
              '<img src="img/proyectos/dia_madre_circuito_plantilla.png" alt="Plantilla Circuito Papertronics" style="max-height:220px;max-width:100%;object-fit:contain;border-radius:6px;border:1px solid #E2E8F0;box-shadow:0 2px 8px rgba(0,0,0,0.06);cursor:pointer;" onclick="window.open(this.src,\'_blank\')">' +
              '<div style="font-size:0.8rem;color:#64748B;margin-top:6px;">Trazado de pistas de cinta de cobre, alojamiento de pila botón CR2032, patitas del LED y solapa con contactos.</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        // Diagrama esquemático
        '<div class="apm-circuit-schematic-card">' +
          '<div class="apm-csc-header">' +
            '<span><i class="fas fa-project-diagram"></i> Diagrama Esquemático: Circuito Papertronics 3V</span>' +
            '<span class="apm-csc-badge" style="background:#E11D48;">Efecto Iluminación Pop-Up</span>' +
          '</div>' +
          '<div class="apm-circuit-visual-diagram">' +
            '<div class="apm-cv-node batt">' +
              '<div class="cv-icon"><i class="fas fa-battery-full"></i></div>' +
              '<div class="cv-label">Pila Botón CR2032<br><strong>3V en Solapa</strong></div>' +
            '</div>' +
            '<div class="apm-cv-line pos">' +
              '<span class="cv-wire-label">+ Pista Positiva (Cobre)</span>' +
              '<i class="fas fa-arrow-right"></i>' +
            '</div>' +
            '<div class="apm-cv-node switch" style="border-color:#E11D48;">' +
              '<div class="cv-icon" style="color:#E11D48;"><i class="fas fa-shield-alt"></i></div>' +
              '<div class="cv-label">Escudo Paulo Freire<br><strong>Pulsador Táctil</strong></div>' +
            '</div>' +
            '<div class="apm-cv-line pos2">' +
              '<i class="fas fa-arrow-right"></i>' +
            '</div>' +
            '<div class="apm-cv-node led" style="border-color:#E11D48;">' +
              '<div class="cv-icon" style="color:#E11D48;"><i class="fas fa-lightbulb"></i></div>' +
              '<div class="cv-label">LED de Alto Brillo<br><strong>Ilumina Bordes 3D</strong></div>' +
            '</div>' +
            '<div class="apm-cv-line neg">' +
              '<span class="cv-wire-label">- Pista Negativa de Retorno</span>' +
              '<i class="fas fa-arrow-left"></i>' +
            '</div>' +
          '</div>' +
        '</div>' +

        // Tabla de componentes y conexiones
        '<div class="apm-sol-visual-guide" style="margin-top:16px;">' +
          '<h5><i class="fas fa-table"></i> Especificaciones de Armado y Conexiones:</h5>' +
          '<div class="apm-pinout-table-wrap">' +
          '<table class="apm-pinout-table">' +
            '<thead>' +
              '<tr>' +
                '<th>Elemento</th>' +
                '<th>Posición / Conexión</th>' +
                '<th>Instrucción de Armado</th>' +
                '<th>Efecto / Resultado</th>' +
              '</tr>' +
            '</thead>' +
            '<tbody>' +
              '<tr>' +
                '<td><strong>✂️ Corazón Pixelado 3D</strong></td>' +
                '<td>Centro de la tarjeta</td>' +
                '<td>Cortar solo líneas sólidas; doblar líneas de puntos hacia adelante</td>' +
                '<td>Se despliega en relieve 3D autoportante al abrir la tarjeta</td>' +
              '</tr>' +
              '<tr>' +
                '<td><strong>🖼️ Foto del Niño/a</strong></td>' +
                '<td>Centro exacto del corazón</td>' +
                '<td>Fijar con pegamento en barra dentro del marco del corazón</td>' +
                '<td>Mamá ve el rostro de su hijo/a en el centro del corazón</td>' +
              '</tr>' +
              '<tr>' +
                '<td><strong>🛡️ Escudo Paulo Freire</strong></td>' +
                '<td>Base inferior de la tarjeta</td>' +
                '<td>Solapa con cinta de cobre que al apretar cierra el contacto eléctrico</td>' +
                '<td>¡Funciona como botón pulsador secreto para encender la luz!</td>' +
              '</tr>' +
              '<tr>' +
                '<td><strong>💡 Diodo LED Alto Brillo</strong></td>' +
                '<td>Pata larga (+) a pista / Pata corta (-) a retorno</td>' +
                '<td>Orientado hacia arriba bañando la base del corazón</td>' +
                '<td>La luz resalta los bordes y relieve del corazón pixel</td>' +
              '</tr>' +
              '<tr>' +
                '<td><strong>🔋 Pila Botón CR2032</strong></td>' +
                '<td>Solapa esquinera</td>' +
                '<td>Cara rugosa (-) contra la base, cara lisa (+) hacia el interruptor</td>' +
                '<td>Alimentación eléctrica segura de bajo voltaje (3V)</td>' +
              '</tr>' +
            '</tbody>' +
          '</table>' +
          '</div>' +
        '</div>' +

        // Consejos y solución de fallas
        '<div class="apm-troubleshoot-box" style="margin-top:16px;">' +
          '<h5><i class="fas fa-stethoscope"></i> Consejos Clave para un Funcionamiento Perfecto</h5>' +
          '<div class="apm-tb-grid">' +
            '<div class="apm-tb-item" style="border-left-color:#E11D48;">' +
              '<h6>1. Si no prende al presionar el escudo</h6>' +
              '<p>Revisá que la cinta de cobre debajo del escudo del colegio baje lo suficiente para tocar firmemente la pista de la pila al presionar.</p>' +
            '</div>' +
            '<div class="apm-tb-item" style="border-left-color:#2563EB;">' +
              '<h6>2. Polaridad del LED</h6>' +
              '<p>La patita más larga del LED debe ir siempre conectada a la pista que proviene del polo positivo (+) de la pila.</p>' +
            '</div>' +
            '<div class="apm-tb-item" style="border-left-color:#D97706;">' +
              '<h6>3. Contacto firme sin soldadura</h6>' +
              '<p>Aplastá la cinta de cobre con fuerza sobre las patitas metálicas del LED para asegurar una conducción eléctrica sin chispazos.</p>' +
            '</div>' +
            '<div class="apm-tb-item" style="border-left-color:#10B981;">' +
              '<h6>4. Doblez elástico del corazón</h6>' +
              '<p>Marcá bien los pliegues con la uña. El corazón debe flexionarse suavemente al cerrar y saltar al abrir en 90 grados.</p>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div style="text-align:center;margin-top:20px;">' +
          '<a href="docs/dia_de_la_madre_tarjeta_3d.pdf" target="_blank" rel="noopener noreferrer" class="arm-btn-primary" style="background:#E11D48;border-color:#BE123C;padding:10px 22px;display:inline-flex;align-items:center;gap:8px;text-decoration:none;font-size:0.92rem;">' +
            '<i class="fas fa-file-pdf"></i> Descargar Plantilla y Guía Oficial en PDF' +
          '</a>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function renderMarcalibroOrigamiSolutionHtml(mission) {
    return '<div class="apm-sol-electro-wrap">' +
      '<div class="apm-sol-electro-header" style="background:linear-gradient(135deg, #B45309 0%, #F59E0B 100%);">' +
        '<div class="apm-seh-icon"><i class="fas fa-book-open"></i></div>' +
        '<div>' +
          '<h4>Solución Oficial: El Marca-Libros Origami de Tom Sawyer (Circuito & LED Chato) 📖🎩💡</h4>' +
          '<p>Doblado de papel glacé en esquina de libro, inserción del circuito con cinta de cobre, pila botón y LED chato en el sombrero de paja.</p>' +
        '</div>' +
      '</div>' +
      '<div class="apm-sol-electro-body">' +

        // Galería de planos oficiales: Guía Origami y Portada con Tom Sawyer
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;margin-bottom:18px;">' +
          '<div class="apm-circuit-schematic-card" style="background:#FFFBEB;border:1.5px solid #FCD34D;margin:0;">' +
            '<div class="apm-csc-header" style="border-bottom-color:#FDE68A;">' +
              '<span style="color:#92400E;font-weight:900;"><i class="fas fa-origami"></i> Guía Oficial de Doblado Origami (Paso a Paso)</span>' +
              '<a href="img/proyectos/marcalibros_origami_guia.png" target="_blank" class="apm-csc-badge" style="background:#D97706;color:#FFF;text-decoration:none;"><i class="fas fa-external-link-alt"></i> Ampliar</a>' +
            '</div>' +
            '<div style="text-align:center;padding:12px;background:#FFF;border-radius:10px;margin-top:8px;">' +
              '<img src="img/proyectos/marcalibros_origami_guia.png" alt="Guía de Doblado Marca-Libros Origami" style="max-height:220px;max-width:100%;object-fit:contain;border-radius:6px;border:1px solid #E2E8F0;box-shadow:0 2px 8px rgba(0,0,0,0.06);cursor:pointer;" onclick="window.open(this.src,\'_blank\')">' +
              '<div style="font-size:0.8rem;color:#64748B;margin-top:6px;">Doblado paso a paso con hoja de papel glacé para formar el bolsillo esquinero que calza en las hojas de los libros.</div>' +
            '</div>' +
          '</div>' +

          '<div class="apm-circuit-schematic-card" style="background:#FFF7ED;border:1.5px solid #FDBA74;margin:0;">' +
            '<div class="apm-csc-header" style="border-bottom-color:#FED7AA;">' +
              '<span style="color:#9A3412;font-weight:900;"><i class="fas fa-user"></i> Tom Sawyer con LED Chato en el Sombrero</span>' +
              '<a href="img/proyectos/tomsawyer_marcalibro_cover.svg" target="_blank" class="apm-csc-badge" style="background:#EA580C;color:#FFF;text-decoration:none;"><i class="fas fa-external-link-alt"></i> Ampliar</a>' +
            '</div>' +
            '<div style="text-align:center;padding:12px;background:#FFF;border-radius:10px;margin-top:8px;">' +
              '<img src="img/proyectos/tomsawyer_marcalibro_cover.svg" alt="Tom Sawyer Marca-Libros" style="max-height:220px;max-width:100%;object-fit:contain;border-radius:6px;border:1px solid #E2E8F0;box-shadow:0 2px 8px rgba(0,0,0,0.06);cursor:pointer;" onclick="window.open(this.src,\'_blank\')">' +
              '<div style="font-size:0.8rem;color:#64748B;margin-top:6px;">Ubicación del LED chato centrado en el gorro de Tom Sawyer y pistas de cobre conectadas a la pila botón CR2032.</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        // Diagrama esquemático
        '<div class="apm-circuit-schematic-card">' +
          '<div class="apm-csc-header">' +
            '<span><i class="fas fa-project-diagram"></i> Diagrama Esquemático: Circuito Papertronics Esquinero 3V</span>' +
            '<span class="apm-csc-badge" style="background:#D97706;">Luz en el Sombrero</span>' +
          '</div>' +
          '<div class="apm-circuit-visual-diagram">' +
            '<div class="apm-cv-node batt">' +
              '<div class="cv-icon"><i class="fas fa-battery-full"></i></div>' +
              '<div class="cv-label">Pila Botón CR2032<br><strong>3V en Bolsillo</strong></div>' +
            '</div>' +
            '<div class="apm-cv-line pos">' +
              '<span class="cv-wire-label">+ Pista Positiva (Cobre)</span>' +
              '<i class="fas fa-arrow-right"></i>' +
            '</div>' +
            '<div class="apm-cv-node switch" style="border-color:#D97706;">' +
              '<div class="cv-icon" style="color:#D97706;"><i class="fas fa-hand-pointer"></i></div>' +
              '<div class="cv-label">Solapa Esquinera<br><strong>Pulsador por Presión</strong></div>' +
            '</div>' +
            '<div class="apm-cv-line pos2">' +
              '<i class="fas fa-arrow-right"></i>' +
            '</div>' +
            '<div class="apm-cv-node led" style="border-color:#F59E0B;">' +
              '<div class="cv-icon" style="color:#F59E0B;"><i class="fas fa-lightbulb"></i></div>' +
              '<div class="cv-label">LED Chato (SMD)<br><strong>Centro del Sombrero</strong></div>' +
            '</div>' +
            '<div class="apm-cv-line neg">' +
              '<span class="cv-wire-label">- Pista Negativa de Retorno</span>' +
              '<i class="fas fa-arrow-left"></i>' +
            '</div>' +
          '</div>' +
        '</div>' +

        // Tabla de componentes y conexiones
        '<div class="apm-sol-visual-guide" style="margin-top:16px;">' +
          '<h5><i class="fas fa-table"></i> Especificaciones de Armado del Origami y Circuito:</h5>' +
          '<div class="apm-pinout-table-wrap">' +
          '<table class="apm-pinout-table">' +
            '<thead>' +
              '<tr>' +
                '<th>Fase / Elemento</th>' +
                '<th>Posición / Conexión</th>' +
                '<th>Instrucción de Armado</th>' +
                '<th>Efecto / Resultado</th>' +
              '</tr>' +
            '</thead>' +
            '<tbody>' +
              '<tr>' +
                '<td><strong>1. 📄 Plegado Triangular</strong></td>' +
                '<td>Papel glacé cuadrado</td>' +
                '<td>Doblar el papel glacé por la mitad en diagonal para formar un triángulo perfecto.</td>' +
                '<td>Base angular para el bolsillo esquinero.</td>' +
              '</tr>' +
              '<tr>' +
                '<td><strong>2. 📐 Puntas al Vértice</strong></td>' +
                '<td>Extremos izquierdo y derecho</td>' +
                '<td>Llevar las dos esquinas inferiores hacia la punta superior del triángulo y marcar bien los pliegues.</td>' +
                '<td>Se forman dos aletas simétricas.</td>' +
              '</tr>' +
              '<tr>' +
                '<td><strong>3. 📂 Formar el Bolsillo</strong></td>' +
                '<td>Capa frontal del triángulo</td>' +
                '<td>Desplegar las puntas y bajar solo la primera capa del vértice superior hacia la base.</td>' +
                '<td>Queda formado el hueco o bolsillo que encajará en la página del libro.</td>' +
              '</tr>' +
              '<tr>' +
                '<td><strong>4. 📥 Meter Puntas Adentro</strong></td>' +
                '<td>Solapas laterales</td>' +
                '<td>Doblar cada una de las dos puntas hacia adentro del bolsillo hasta que queden trabadas.</td>' +
                '<td>Estructura autoportante de origami lista sin necesidad de pegamento.</td>' +
              '</tr>' +
              '<tr>' +
                '<td><strong>5. ⚡ Circuito con LED Chato</strong></td>' +
                '<td>Pista de cobre + Pila CR2032</td>' +
                '<td>Pegar la pista positiva (+) hacia el interruptor de presión y ubicar el LED chato exactamente en el centro del sombrero de Tom Sawyer.</td>' +
                '<td>Conexión eléctrica plana y compacta que no abulta el libro.</td>' +
              '</tr>' +
              '<tr>' +
                '<td><strong>6. 🎩 Personaje Tom Sawyer</strong></td>' +
                '<td>Frente del marca-páginas</td>' +
                '<td>Pegar a Tom Sawyer en la cara visible del origami alineando el LED chato con el medio de su gorro.</td>' +
                '<td>¡Al colocar el marca-libros en la esquina o apretar la punta, el sombrero se ilumina!</td>' +
              '</tr>' +
            '</tbody>' +
          '</table>' +
          '</div>' +
        '</div>' +

        // Consejos y solución de fallas
        '<div class="apm-troubleshoot-box" style="margin-top:16px;">' +
          '<h5><i class="fas fa-stethoscope"></i> Consejos Clave para un Funcionamiento Perfecto</h5>' +
          '<div class="apm-tb-grid">' +
            '<div class="apm-tb-item" style="border-left-color:#D97706;">' +
              '<h6>1. Si no prende al presionar la esquina</h6>' +
              '<p>Verificá que las tiras de cinta de cobre de la solapa se toquen firmemente al apretar con los dedos. La pila CR2032 debe estar bien ajustada dentro del pliegue.</p>' +
            '</div>' +
            '<div class="apm-tb-item" style="border-left-color:#2563EB;">' +
              '<h6>2. Polaridad del LED Chato (SMD)</h6>' +
              '<p>El lado positivo (+) del LED chato debe conectarse con la cara lisa (+) de la pila, y el negativo (-) con la pista de retorno.</p>' +
            '</div>' +
            '<div class="apm-tb-item" style="border-left-color:#10B981;">' +
              '<h6>3. Contacto plano sin abultar</h6>' +
              '<p>Al usar un LED chato y cinta de cobre fina, el marca-libros queda completamente plano y podés cerrar el libro sin dañar las hojas.</p>' +
            '</div>' +
            '<div class="apm-tb-item" style="border-left-color:#7C3AED;">' +
              '<h6>4. Ajuste en el libro</h6>' +
              '<p>Deslizá el bolsillo esquinero sobre 2 o 3 páginas del libro para que calce bien firme sin caerse.</p>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div style="text-align:center;margin-top:20px;">' +
          '<a href="img/proyectos/marcalibros_origami_guia.png" target="_blank" rel="noopener noreferrer" class="arm-btn-primary" style="background:#D97706;border-color:#B45309;padding:10px 22px;display:inline-flex;align-items:center;gap:8px;text-decoration:none;font-size:0.92rem;">' +
            '<i class="fas fa-image"></i> Ver Guía de Doblado en Alta Resolución' +
          '</a>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  
  function renderCanvaArqueroSolutionHtml(mission) {
    return '<div class="apm-sol-electro-wrap">' +
      '<div class="apm-sol-electro-header" style="background:linear-gradient(135deg, #0284C7 0%, #7C3AED 100%);">' +
        '<div class="apm-seh-icon"><i class="fas fa-wand-magic-sparkles"></i></div>' +
        '<div>' +
          '<h4>Solución Oficial: El Arquero con Inteligencia Artificial en Canva ⚽🧤🤖</h4>' +
          '<p>Fotografía real en el aula, remoción de fondo con IA, integración en plantilla de arco de fútbol y animación generativa de la atajada en video MP4 o GIF.</p>' +
        '</div>' +
      '</div>' +
      '<div class="apm-sol-electro-body">' +

        // Galería y visual de la solución
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;margin-bottom:18px;">' +
          '<div class="apm-circuit-schematic-card" style="background:#F0F9FF;border:1.5px solid #BAE6FD;margin:0;">' +
            '<div class="apm-csc-header" style="border-bottom-color:#E0F2FE;">' +
              '<span style="color:#0369A1;font-weight:900;"><i class="fas fa-image"></i> Modelo Final del Arquero Animado</span>' +
              '<a href="img/proyectos/canva_arquero_ia_cover.svg" target="_blank" class="apm-csc-badge" style="background:#0284C7;color:#FFF;text-decoration:none;"><i class="fas fa-external-link-alt"></i> Ampliar</a>' +
            '</div>' +
            '<div style="text-align:center;padding:12px;background:#FFF;border-radius:10px;margin-top:8px;">' +
              '<img src="img/proyectos/canva_arquero_ia_cover.svg" alt="Arquero con IA Canva" style="max-height:220px;max-width:100%;object-fit:contain;border-radius:6px;border:1px solid #E2E8F0;box-shadow:0 2px 8px rgba(0,0,0,0.06);cursor:pointer;" onclick="window.open(this.src,\'_blank\')">' +
              '<div style="font-size:0.8rem;color:#64748B;margin-top:6px;">Silueta recortada con IA, guantes luminosos, red de arco y trayectoria animada de la atajada.</div>' +
            '</div>' +
          '</div>' +

          '<div class="apm-circuit-schematic-card" style="background:#FAF5FF;border:1.5px solid #D8B4FE;margin:0;">' +
            '<div class="apm-csc-header" style="border-bottom-color:#F3E8FF;">' +
              '<span style="color:#6B21A8;font-weight:900;"><i class="fas fa-robot"></i> Las 4 Fases de la Inteligencia Artificial</span>' +
              '<a href="https://www.canva.com/es_419/crear/animaciones/" target="_blank" class="apm-csc-badge" style="background:#7C3AED;color:#FFF;text-decoration:none;"><i class="fas fa-external-link-alt"></i> Abrir Canva</a>' +
            '</div>' +
            '<div style="padding:10px;background:#FFF;border-radius:10px;margin-top:8px;font-size:0.82rem;color:#475569;line-height:1.5;">' +
              '<div style="margin-bottom:8px;"><strong>1. Captura Real:</strong> Posar en suspensión horizontal simulando tapar un tiro al ángulo.</div>' +
              '<div style="margin-bottom:8px;"><strong>2. Quitafondos IA:</strong> Magic Studio detecta los bordes corporales y quita el aula en 1 clic.</div>' +
              '<div style="margin-bottom:8px;"><strong>3. Montaje de Capas:</strong> Colocar el arco detrás y la pelota delante para generar tridimensionalidad.</div>' +
              '<div><strong>4. Animación Generativa:</strong> Canva Magic Animate sintetiza la trayectoria de estirada hacia el balón.</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        // Diagrama de Flujo
        '<div class="apm-circuit-schematic-card">' +
          '<div class="apm-csc-header">' +
            '<span><i class="fas fa-project-diagram"></i> Flujo Creativo: De la Foto Real a la Animación con IA</span>' +
            '<span class="apm-csc-badge" style="background:#0284C7;">Flujo Multimedia</span>' +
          '</div>' +
          '<div class="apm-circuit-visual-diagram">' +
            '<div class="apm-cv-node" style="border-color:#0284C7;">' +
              '<div class="cv-icon" style="color:#0284C7;"><i class="fas fa-camera"></i></div>' +
              '<div class="cv-label">Foto en el Aula<br><strong>Pose de Arquero</strong></div>' +
            '</div>' +
            '<div class="apm-cv-line pos">' +
              '<span class="cv-wire-label">Subir a Canva</span>' +
              '<i class="fas fa-arrow-right"></i>' +
            '</div>' +
            '<div class="apm-cv-node" style="border-color:#7C3AED;">' +
              '<div class="cv-icon" style="color:#7C3AED;"><i class="fas fa-wand-magic-sparkles"></i></div>' +
              '<div class="cv-label">Quitafondos IA<br><strong>Magic Studio</strong></div>' +
            '</div>' +
            '<div class="apm-cv-line pos2">' +
              '<span class="cv-wire-label">Plantilla Cancha</span>' +
              '<i class="fas fa-arrow-right"></i>' +
            '</div>' +
            '<div class="apm-cv-node" style="border-color:#10B981;">' +
              '<div class="cv-icon" style="color:#10B981;"><i class="fas fa-film"></i></div>' +
              '<div class="cv-label">Animar con IA<br><strong>Video MP4 / GIF</strong></div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        // Tabla de pasos y herramientas Canva
        '<div class="apm-sol-visual-guide" style="margin-top:16px;">' +
          '<h5><i class="fas fa-table"></i> Especificaciones de Herramientas y Efectos en Canva:</h5>' +
          '<div class="apm-pinout-table-wrap">' +
          '<table class="apm-pinout-table">' +
            '<thead>' +
              '<tr>' +
                '<th>Herramienta / Menú</th>' +
                '<th>Ubicación en Canva</th>' +
                '<th>Instrucción del Alumno</th>' +
                '<th>Efecto / Resultado</th>' +
              '</tr>' +
            '</thead>' +
            '<tbody>' +
              '<tr>' +
                '<td><strong>📸 Captura de Foto</strong></td>' +
                '<td>Cámara / Dispositivo</td>' +
                '<td>Sacarse una foto con brazos extendidos simulando atajar la pelota en el aire.</td>' +
                '<td>Imagen base del protagonista del proyecto.</td>' +
              '</tr>' +
              '<tr>' +
                '<td><strong>🪄 Quitafondos con IA</strong></td>' +
                '<td>Editar la foto &gt; Efectos &gt; Quitar fondos</td>' +
                '<td>Activar la herramienta de IA para suprimir automáticamente paredes y muebles del aula.</td>' +
                '<td>Silueta transparente y limpia del arquero.</td>' +
              '</tr>' +
              '<tr>' +
                '<td><strong>🥅 Plantilla de Cancha</strong></td>' +
                '<td>Diseño &gt; Plantillas &gt; Buscar "Fútbol"</td>' +
                '<td>Elegir o armar un fondo con arco, red blanca y césped verde profesional.</td>' +
                '<td>Escenario deportivo inmersivo.</td>' +
              '</tr>' +
              '<tr>' +
                '<td><strong>⚽ Inserción de Pelota</strong></td>' +
                '<td>Elementos &gt; Gráficos &gt; Pelota de fútbol</td>' +
                '<td>Ubicar la pelota en el ángulo del arco y orientar las manos del arquero hacia ella.</td>' +
                '<td>Punto de contacto visual de la atajada.</td>' +
              '</tr>' +
              '<tr>' +
                '<td><strong>✨ Magic Animate (IA)</strong></td>' +
                '<td>Menú superior &gt; Animar</td>' +
                '<td>Seleccionar animación deportiva, crear trayectoria curva hacia el balón y ajustar velocidad.</td>' +
                '<td>¡La foto estática cobra vida con movimiento fluido!</td>' +
              '</tr>' +
              '<tr>' +
                '<td><strong>📥 Exportación</strong></td>' +
                '<td>Compartir &gt; Descargar &gt; MP4 o GIF</td>' +
                '<td>Descargar en formato de video de alta definición o GIF animado para la entrega.</td>' +
                '<td>Archivo multimedia listo para entregar (+100 XP).</td>' +
              '</tr>' +
            '</tbody>' +
          '</table>' +
          '</div>' +
        '</div>' +

        // Consejos y solución de fallas
        '<div class="apm-troubleshoot-box" style="margin-top:16px;">' +
          '<h5><i class="fas fa-stethoscope"></i> Consejos Clave para un Proyecto de Impacto</h5>' +
          '<div class="apm-tb-grid">' +
            '<div class="apm-tb-item" style="border-left-color:#0284C7;">' +
              '<h6>1. Buena iluminación al sacar la foto</h6>' +
              '<p>Ubicarse frente a una luz natural o foco blanco. Así la IA de Canva recortará dedos y contornos con máxima nitidez.</p>' +
            '</div>' +
            '<div class="apm-tb-item" style="border-left-color:#7C3AED;">' +
              '<h6>2. Orden de las capas (Posición)</h6>' +
              '<p>El fondo va atrás, el arco en el medio, el arquero volando al frente y la pelota apenas tocando las puntas de los dedos.</p>' +
            '</div>' +
            '<div class="apm-tb-item" style="border-left-color:#10B981;">' +
              '<h6>3. Trayectoria y dinamismo</h6>' +
              '<p>En Canva podés arrastrar el elemento mientras grabás su trayectoria ("Crear una animación") para simular la volada épica.</p>' +
            '</div>' +
            '<div class="apm-tb-item" style="border-left-color:#F59E0B;">' +
              '<h6>4. Entrega en Video MP4 o GIF</h6>' +
              '<p>Descargá el archivo como MP4 o GIF y subilo a la plataforma. ¡También podés compartir el link público de Canva!</p>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div style="text-align:center;margin-top:20px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">' +
          '<a href="https://www.canva.com/es_419/crear/animaciones/" target="_blank" rel="noopener noreferrer" class="arm-btn-primary" style="background:linear-gradient(135deg, #0284C7 0%, #7C3AED 100%);padding:10px 22px;display:inline-flex;align-items:center;gap:8px;text-decoration:none;font-size:0.92rem;">' +
            '<i class="fas fa-palette"></i> Abrir Canva Animaciones en Vivo' +
          '</a>' +
          '<a href="img/proyectos/canva_arquero_ia_cover.svg" download="canva_arquero_ia_cover.svg" class="arm-btn-secondary" style="color:#0284C7;border-color:#BAE6FD;padding:10px 18px;display:inline-flex;align-items:center;gap:8px;text-decoration:none;font-size:0.92rem;">' +
            '<i class="fas fa-download"></i> Descargar Portada SVG' +
          '</a>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function renderScratchJrVelocidadSolutionHtml(mission) {
    var sampleFileUrl = (mission && (mission.projectFileUrl || mission.downloadUrl)) || 'proyectos/velocidad.sjr';
    return '<div class="apm-sol-electro-wrap">' +
      '<div class="apm-sol-electro-header" style="background:linear-gradient(135deg, #C2410C 0%, #EA580C 100%);">' +
        '<div class="apm-seh-icon"><i class="fas fa-tachometer-alt"></i></div>' +
        '<div>' +
          '<h4>Solución Oficial: Escenarios y Manejo de Velocidades en Scratch Jr 🐱⚡</h4>' +
          '<p>Exploración del entorno Scratch Jr, creación de fondos, personajes y programación de velocidades (lenta, media y rápida) con el bloque naranja de control.</p>' +
        '</div>' +
      '</div>' +
      '<div class="apm-sol-electro-body" style="padding:18px;">' +
        '<div style="margin-bottom:18px;background:#FFF7ED;border:2px solid #FDBA74;border-radius:14px;padding:16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px;">' +
          '<div style="display:flex;align-items:center;gap:14px;">' +
            '<div style="width:48px;height:48px;border-radius:12px;background:#EA580C;color:#FFF;display:flex;align-items:center;justify-content:center;font-size:1.5rem;flex-shrink:0;">' +
              '<i class="fas fa-file-code"></i>' +
            '</div>' +
            '<div>' +
              '<h5 style="margin:0 0 4px;color:#9A3412;font-size:1.02rem;font-weight:900;">Archivo Oficial del Proyecto: velocidad.sjr</h5>' +
              '<p style="margin:0;font-size:0.86rem;color:#7C2D12;">Ejemplo interactivo listo para abrir o importar en Scratch Jr con la carrera de personajes a diferentes velocidades.</p>' +
            '</div>' +
          '</div>' +
          '<a href="' + sampleFileUrl + '" download="velocidad.sjr" class="arm-btn-primary" style="background:#EA580C;border-color:#C2410C;padding:10px 20px;font-size:0.92rem;text-decoration:none;display:inline-flex;align-items:center;gap:8px;">' +
            '<i class="fas fa-download"></i> Descargar velocidad.sjr' +
          '</a>' +
        '</div>' +

        '<div style="margin-bottom:16px;background:#F8FAFC;border:1.5px solid #E2E8F0;border-radius:12px;padding:14px;">' +
          '<h5 style="margin:0 0 6px;color:#1E293B;font-size:0.95rem;"><i class="fas fa-compass"></i> El Ambiente de Scratch Jr: Escenarios y Personajes</h5>' +
          '<p style="margin:0;font-size:0.86rem;color:#475569;line-height:1.5;">' +
            'Scratch Jr está diseñado con una interfaz intuitiva para niños de nivel inicial: en la columna izquierda podemos agregar y pintar personajes (+); en la parte superior central encontramos el botón del paisaje para elegir diferentes fondos o escenarios (el parque, la cancha, el bosque, el espacio); y en la parte inferior encastramos los bloques de código como piezas de rompecabezas.' +
          '</p>' +
        '</div>' +

        '<div class="apm-sol-visual-guide" style="margin-top:16px;">' +
          '<h5><i class="fas fa-tachometer-alt"></i> Las 3 Velocidades del Bloque Naranja de Scratch Jr:</h5>' +
          '<div class="apm-pinout-table-wrap">' +
            '<table class="apm-pinout-table">' +
              '<thead>' +
                '<tr>' +
                  '<th>Nivel de Velocidad</th>' +
                  '<th>Ícono en el Bloque</th>' +
                  '<th>Comportamiento del Personaje</th>' +
                  '<th>Ejemplo en la Carrera</th>' +
                '</tr>' +
              '</thead>' +
              '<tbody>' +
                '<tr>' +
                  '<td><strong>1. Velocidad Lenta</strong></td>' +
                  '<td>🐌 Persona caminando o caracol</td>' +
                  '<td>El personaje avanza con pasos lentos y pausados. Tarda más tiempo en recorrer la misma distancia.</td>' +
                  '<td>Ideal para tortugas, caminantes o personajes sigilosos.</td>' +
                '</tr>' +
                '<tr>' +
                  '<td><strong>2. Velocidad Media</strong></td>' +
                  '<td>🚶 Persona trotando a ritmo normal</td>' +
                  '<td>Velocidad estándar predeterminada. Desplazamiento regular por el escenario.</td>' +
                  '<td>Ritmo base para el gato Scratch Jr y personajes acompañantes.</td>' +
                '</tr>' +
                '<tr>' +
                  '<td><strong>3. Velocidad Rápida</strong></td>' +
                  '<td>🏃 Persona corriendo o auto veloz</td>' +
                  '<td>El personaje se desplaza a máxima aceleración, cruzando el escenario en pocos segundos.</td>' +
                  '<td>Ideal para conejos, cohetes, autos de carrera y superhéroes.</td>' +
                '</tr>' +
              '</tbody>' +
            '</table>' +
          '</div>' +
        '</div>' +

        '<div style="margin-top:20px;">' +
          '<h5 style="margin:0 0 12px;color:#1E293B;font-size:0.95rem;"><i class="fas fa-code"></i> Estructura de Programación de la Carrera (velocidad.sjr):</h5>' +
          '<div class="codeorg-levels-solutions-grid">' +
            '<div class="col-sol-card" style="border-left:3.5px solid #F59E0B;">' +
              '<div class="col-sc-header"><span class="col-sc-lvl" style="background:#F59E0B;">Personaje 1</span> <strong>Corredor Lento (Velocidad 1)</strong></div>' +
              '<div class="col-sc-blocks">' +
                '<div class="co-block" style="background:#FBBF24;border-color:#D97706;color:#78350F;"><i class="fas fa-flag"></i> Bandera Verde</div>' +
                '<div class="co-block" style="background:#EA580C;border-color:#C2410C;color:#FFF;"><i class="fas fa-tachometer-alt"></i> Velocidad: Lenta (1)</div>' +
                '<div class="co-block" style="background:#2563EB;border-color:#1D4ED8;color:#FFF;"><i class="fas fa-arrow-right"></i> Mover derecha (12 pasos)</div>' +
              '</div>' +
              '<div class="col-sc-note">Arranca al pulsar la bandera y camina despacito hacia el final del escenario.</div>' +
            '</div>' +
            '<div class="col-sol-card" style="border-left:3.5px solid #2563EB;">' +
              '<div class="col-sc-header"><span class="col-sc-lvl" style="background:#2563EB;">Personaje 2</span> <strong>Corredor Medio (Velocidad 2)</strong></div>' +
              '<div class="col-sc-blocks">' +
                '<div class="co-block" style="background:#FBBF24;border-color:#D97706;color:#78350F;"><i class="fas fa-flag"></i> Bandera Verde</div>' +
                '<div class="co-block" style="background:#EA580C;border-color:#C2410C;color:#FFF;"><i class="fas fa-tachometer-alt"></i> Velocidad: Media (2)</div>' +
                '<div class="co-block" style="background:#2563EB;border-color:#1D4ED8;color:#FFF;"><i class="fas fa-arrow-right"></i> Mover derecha (12 pasos)</div>' +
              '</div>' +
              '<div class="col-sc-note">Trota a ritmo continuo compitiendo en el medio del escenario.</div>' +
            '</div>' +
            '<div class="col-sol-card" style="border-left:3.5px solid #10B981;">' +
              '<div class="col-sc-header"><span class="col-sc-lvl" style="background:#10B981;">Personaje 3</span> <strong>Corredor Rápido (Velocidad 3)</strong></div>' +
              '<div class="col-sc-blocks">' +
                '<div class="co-block" style="background:#FBBF24;border-color:#D97706;color:#78350F;"><i class="fas fa-flag"></i> Bandera Verde</div>' +
                '<div class="co-block" style="background:#EA580C;border-color:#C2410C;color:#FFF;"><i class="fas fa-tachometer-alt"></i> Velocidad: Rápida (3)</div>' +
                '<div class="co-block" style="background:#2563EB;border-color:#1D4ED8;color:#FFF;"><i class="fas fa-arrow-right"></i> Mover derecha (12 pasos)</div>' +
              '</div>' +
              '<div class="col-sc-note">Sale disparado a toda velocidad y gana la carrera llegando primero a la meta.</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="apm-troubleshoot-box" style="margin-top:18px;">' +
          '<h5><i class="fas fa-lightbulb"></i> Secretos de Scratch Jr para Docentes y Familias</h5>' +
          '<div class="apm-tb-grid">' +
            '<div class="apm-tb-item" style="border-left-color:#EA580C;">' +
              '<h6>1. La posición del bloque de velocidad</h6>' +
              '<p>El bloque de velocidad debe colocarse <strong>antes</strong> de los bloques de movimiento para que surta efecto sobre los pasos siguientes.</p>' +
            '</div>' +
            '<div class="apm-tb-item" style="border-left-color:#2563EB;">' +
              '<h6>2. La bandera verde sincroniza</h6>' +
              '<p>Al ponerle el bloque de Bandera Verde a todos los personajes, inician su carrera exactamente en el mismo instante.</p>' +
            '</div>' +
            '<div class="apm-tb-item" style="border-left-color:#10B981;">' +
              '<h6>3. Mismo número de pasos</h6>' +
              '<p>Para notar con claridad la diferencia de velocidades, configurá el mismo número de pasos (ej: 10 o 12) en todos los personajes.</p>' +
            '</div>' +
            '<div class="apm-tb-item" style="border-left-color:#7C3AED;">' +
              '<h6>4. Fondos y escenarios múltiples</h6>' +
              '<p>Tocando el símbolo "+" a la derecha podés crear una segunda página o escenario y conectar el bloque rojo para pasar de pantalla.</p>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div style="text-align:center;margin-top:20px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">' +
          '<a href="' + sampleFileUrl + '" download="velocidad.sjr" class="arm-btn-primary" style="background:#EA580C;border-color:#C2410C;padding:10px 22px;display:inline-flex;align-items:center;gap:8px;text-decoration:none;font-size:0.92rem;">' +
            '<i class="fas fa-download"></i> Descargar Proyecto de Ejemplo (.sjr)' +
          '</a>' +
          '<a href="https://codejr.org" target="_blank" rel="noopener noreferrer" class="arm-btn-secondary" style="padding:10px 20px;display:inline-flex;align-items:center;gap:8px;font-size:0.92rem;text-decoration:none;">' +
            '<i class="fas fa-external-link-alt"></i> Abrir Scratch Jr (codejr.org)' +
          '</a>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function renderScratchJrPerspectivaSolutionHtml(mission) {
    var sampleFileUrl = (mission && (mission.projectFileUrl || mission.downloadUrl)) || 'proyectos/perpestiva.sjr';
    return '<div class="apm-sol-electro-wrap">' +
      '<div class="apm-sol-electro-header" style="background:linear-gradient(135deg, #6B21A8 0%, #9333EA 100%);">' +
        '<div class="apm-seh-icon"><i class="fas fa-search-plus"></i></div>' +
        '<div>' +
          '<h4>Solución Oficial: Escenarios y Manejo de Perspectiva en Scratch Jr 🐱🔍</h4>' +
          '<p>Creación de profundidad 3D en un escenario 2D utilizando los bloques violetas de apariencia (achicar, agrandar y restaurar tamaño) combinados con movimientos en el sendero.</p>' +
        '</div>' +
      '</div>' +
      '<div class="apm-sol-electro-body" style="padding:18px;">' +
        '<div style="margin-bottom:18px;background:#FAF5FF;border:2px solid #D8B4FE;border-radius:14px;padding:16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px;">' +
          '<div style="display:flex;align-items:center;gap:14px;">' +
            '<div style="width:48px;height:48px;border-radius:12px;background:#7C3AED;color:#FFF;display:flex;align-items:center;justify-content:center;font-size:1.5rem;flex-shrink:0;">' +
              '<i class="fas fa-file-code"></i>' +
            '</div>' +
            '<div>' +
              '<h5 style="margin:0 0 4px;color:#581C87;font-size:1.02rem;font-weight:900;">Archivo Oficial del Proyecto: perpestiva.sjr</h5>' +
              '<p style="margin:0;font-size:0.86rem;color:#6B21A8;">Ejemplo interactivo listo para abrir o importar en Scratch Jr con Teen3 caminando por el bosque hacia el frente en perspectiva.</p>' +
            '</div>' +
          '</div>' +
          '<a href="' + sampleFileUrl + '" download="perpestiva.sjr" class="arm-btn-primary" style="background:#7C3AED;border-color:#6D28D9;padding:10px 20px;font-size:0.92rem;text-decoration:none;display:inline-flex;align-items:center;gap:8px;">' +
            '<i class="fas fa-download"></i> Descargar perpestiva.sjr' +
          '</a>' +
        '</div>' +

        '<div style="margin-bottom:16px;background:#F8FAFC;border:1.5px solid #E2E8F0;border-radius:12px;padding:14px;">' +
          '<h5 style="margin:0 0 6px;color:#1E293B;font-size:0.95rem;"><i class="fas fa-eye"></i> ¿Cómo Funciona la Perspectiva y Profundidad en Scratch Jr?</h5>' +
          '<p style="margin:0;font-size:0.86rem;color:#475569;line-height:1.5;">' +
            'En el mundo real, los objetos y personas que están lejos se ven pequeños, y al acercarse a nuestros ojos se hacen más grandes. En Scratch Jr logramos esta misma <strong>ilusión óptica de profundidad 3D</strong> utilizando los <strong>bloques violetas de apariencia</strong>: encastramos el bloque de <em>Achicar</em> para enviar al personaje al fondo del sendero, y luego combinamos bloques de <em>Bajar</em> con bloques de <em>Agrandar</em> para que parezca caminar hacia la pantalla.' +
          '</p>' +
        '</div>' +

        '<div class="apm-sol-visual-guide" style="margin-top:16px;">' +
          '<h5><i class="fas fa-expand-arrows-alt"></i> Los 3 Bloques Violetas de Apariencia en Scratch Jr:</h5>' +
          '<div class="apm-pinout-table-wrap">' +
            '<table class="apm-pinout-table">' +
              '<thead>' +
                '<tr>' +
                  '<th>Bloque Violeta</th>' +
                  '<th>Símbolo en Scratch Jr</th>' +
                  '<th>Acción y Efecto Visual</th>' +
                  '<th>Uso en la Perspectiva</th>' +
                '</tr>' +
              '</thead>' +
              '<tbody>' +
                '<tr>' +
                  '<td><strong>1. Restaurar Tamaño (Reset)</strong></td>' +
                  '<td>🔄 Personita en círculo estándar</td>' +
                  '<td>Devuelve al personaje a su escala original (100%).</td>' +
                  '<td>Se coloca al inicio para reiniciar el tamaño antes de cada animación.</td>' +
                '</tr>' +
                '<tr>' +
                  '<td><strong>2. Achicar (Shrink)</strong></td>' +
                  '<td>➖ Personita con flechas hacia adentro</td>' +
                  '<td>Reduce el tamaño del personaje según el número indicado.</td>' +
                  '<td>Con número 5, el personaje parece estar al fondo del horizonte lejano.</td>' +
                '</tr>' +
                '<tr>' +
                  '<td><strong>3. Agrandar (Grow)</strong></td>' +
                  '<td>➕ Personita con flechas hacia afuera</td>' +
                  '<td>Aumenta el tamaño del personaje haciéndolo crecer.</td>' +
                  '<td>Se coloca junto con pasos hacia abajo para simular que camina hacia nosotros.</td>' +
                '</tr>' +
              '</tbody>' +
            '</table>' +
          '</div>' +
        '</div>' +

        '<div style="margin-top:20px;">' +
          '<h5 style="margin:0 0 12px;color:#1E293B;font-size:0.95rem;"><i class="fas fa-code"></i> Cadena de Bloques Exacta del Proyecto (perpestiva.sjr):</h5>' +
          '<div class="codeorg-levels-solutions-grid">' +
            '<div class="col-sol-card" style="border-left:3.5px solid #7C3AED;">' +
              '<div class="col-sc-header"><span class="col-sc-lvl" style="background:#7C3AED;">Personaje Teen3</span> <strong>Algoritmo de Caminata en Perspectiva</strong></div>' +
              '<div class="col-sc-blocks" style="gap:6px;flex-wrap:wrap;">' +
                '<div class="co-block" style="background:#FBBF24;border-color:#D97706;color:#78350F;"><i class="fas fa-flag"></i> Bandera Verde</div>' +
                '<div class="co-block" style="background:#2563EB;border-color:#1D4ED8;color:#FFF;"><i class="fas fa-home"></i> Ir a Casa (Inicio)</div>' +
                '<div class="co-block" style="background:#7C3AED;border-color:#6D28D9;color:#FFF;"><i class="fas fa-sync-alt"></i> Restaurar Tamaño</div>' +
                '<div class="co-block" style="background:#7C3AED;border-color:#6D28D9;color:#FFF;"><i class="fas fa-compress-alt"></i> Achicar (5)</div>' +
                '<div class="co-block" style="background:#2563EB;border-color:#1D4ED8;color:#FFF;"><i class="fas fa-arrow-down"></i> Bajar (2)</div>' +
                '<div class="co-block" style="background:#7C3AED;border-color:#6D28D9;color:#FFF;"><i class="fas fa-expand-alt"></i> Agrandar (2)</div>' +
                '<div class="co-block" style="background:#2563EB;border-color:#1D4ED8;color:#FFF;"><i class="fas fa-arrow-down"></i> Bajar (2)</div>' +
                '<div class="co-block" style="background:#7C3AED;border-color:#6D28D9;color:#FFF;"><i class="fas fa-expand-alt"></i> Agrandar (2)</div>' +
                '<div class="co-block" style="background:#2563EB;border-color:#1D4ED8;color:#FFF;"><i class="fas fa-arrow-down"></i> Bajar (4)</div>' +
              '</div>' +
              '<div class="col-sc-note">Inicia en la parte superior del camino como un punto diminuto y desciende por el sendero creciendo hasta llegar al primer plano.</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div style="margin-top:20px;">' +
          '<h5 style="margin:0 0 10px;color:#1E293B;font-size:0.95rem;"><i class="fas fa-lightbulb"></i> Consejos Clave para el Docente y el Alumno en Sala de 5:</h5>' +
          '<div class="apm-tb-grid">' +
            '<div class="apm-tb-item" style="border-left-color:#7C3AED;">' +
              '<h6>1. Siempre colocar Restaurar Tamaño primero</h6>' +
              '<p>Al pulsar la bandera repetidas veces, el personaje debe volver a su tamaño 100% antes de achicarse para que no quede microscópico.</p>' +
            '</div>' +
            '<div class="apm-tb-item" style="border-left-color:#2563EB;">' +
              '<h6>2. Coordinar el movimiento con la escala</h6>' +
              '<p>Cada vez que el personaje avanza casilleros hacia abajo (hacia adelante), encastramos un bloque de Agrandar.</p>' +
            '</div>' +
            '<div class="apm-tb-item" style="border-left-color:#10B981;">' +
              '<h6>3. Elegir escenarios con caminos diagonales o verticales</h6>' +
              '<p>Los fondos de bosques, montañas, parques o veredas refuerzan visualmente la línea de horizonte y la perspectiva.</p>' +
            '</div>' +
            '<div class="apm-tb-item" style="border-left-color:#EA580C;">' +
              '<h6>4. Efecto contrario: Alejarse hacia el fondo</h6>' +
              '<p>Invertir el algoritmo: empezar grande al frente, subir casilleros hacia arriba y achicar para simular que se va lejos.</p>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div style="text-align:center;margin-top:20px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">' +
          '<a href="' + sampleFileUrl + '" download="perpestiva.sjr" class="arm-btn-primary" style="background:#7C3AED;border-color:#6D28D9;padding:10px 22px;display:inline-flex;align-items:center;gap:8px;text-decoration:none;font-size:0.92rem;">' +
            '<i class="fas fa-download"></i> Descargar Proyecto de Ejemplo (.sjr)' +
          '</a>' +
          '<a href="https://codejr.org" target="_blank" rel="noopener noreferrer" class="arm-btn-secondary" style="padding:10px 20px;display:inline-flex;align-items:center;gap:8px;font-size:0.92rem;text-decoration:none;">' +
            '<i class="fas fa-external-link-alt"></i> Abrir Scratch Jr (codejr.org)' +
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
  // MODAL DE AMPLIACIÓN PEDAGÓGICA (OBJETIVO Y BENEFICIOS)
  // ──────────────────────────────────────────────────
  function openPedagogicalConceptModal(conceptType, data) {
    if (window.sounds && window.sounds.playPop) window.sounds.playPop();
    else if (window.sounds && window.sounds.playClick) window.sounds.playClick();
    if (!data) return;

    var modal = document.getElementById('pedagogical-concept-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'pedagogical-concept-modal';
      modal.className = 'pedagogical-concept-overlay';
      document.body.appendChild(modal);
    }

    var isObjective = (conceptType === 'objective');
    var isServoJoystick = (data.id === 'g6-p2') || (/servo.*joystick|joystick.*servo|ajuste intervalo|mapeo matem[aá]tico/i.test(data.title || '')) || (data.tags && data.tags.some(function(t){ return /servo|joystick|intervalo|mapeo/i.test(t); }));
    var isCanva = !isServoJoystick && (data.type === 'canva' || (data.tags && data.tags.some(function(t){ return /canva/i.test(t); })) || (/canva/i.test(data.title || '')));
    var isPaint = data.type === 'paint' || (data.tags && data.tags.some(function(t){ return /paint|dibujo|cancha|bandera/i.test(t); })) || (/cancha|paint|bandera/i.test(data.title || ''));
    var isPaintBanderas = isPaint && (/bandera/i.test(data.title || '') || (data.tags && data.tags.some(function(t){ return /bandera/i.test(t); })));
    var isPaintCancha = isPaint && !isPaintBanderas;
    var isMinecraft = !isPaint && ((data.tags && data.tags.some(function(t){ return /minecraft|steve|alex/i.test(t); })) || (/minecraft/i.test(data.title || '')));
    var isFrozen = !isPaint && !isMinecraft && ((data.tags && data.tags.some(function(t){ return /frozen|elsa|anna|ana/i.test(t); })) || (/frozen|elsa|anna|ana/i.test(data.title || '')));
    var isCodeorg = !isPaint && (isFrozen || isMinecraft || data.type === 'codeorg' || (data.platform === 'codeorg') || (data.tags && data.tags.some(function(t){ return /code\.org|angry ?birds|frozen|elsa|minecraft/i.test(t); })));
    var isAngryBirds = isCodeorg && !isFrozen && !isMinecraft;
    var isDiaMadre = !isPaint && ((data.tags && data.tags.some(function(t){ return /madre|coraz[oó]n|ilumina/i.test(t); })) || (/madre|coraz[oó]n|ilumina/i.test(data.title || '')));
    var isMarcalibro = !isPaint && !isCodeorg && (data.id === 'g1-p3' || (data.tags && data.tags.some(function(t){ return /marca ?libro|marcalibro|origami|tom sawyer/i.test(t); })) || (/marca ?libro|marcalibro|origami|tom sawyer/i.test(data.title || '')));
    var isScratchJrPerspectiva = !isPaint && !isCodeorg && !isMarcalibro && (data.id === 's5-p10' || data.id === 's5-g5' || data.id === 'g1-p10' || data.id === 'g1-g5' || (data.tags && data.tags.some(function(t){ return /perspectiva|perpestiva/i.test(t); })) || (/perspectiva|perpestiva/i.test(data.title || '')));
    var isScratchJrVelocidad = !isPaint && !isCodeorg && !isScratchJrPerspectiva && !isMarcalibro && (data.id === 's5-p9' || data.id === 's5-g1' || data.id === 'g1-p9' || data.id === 'g1-g1' || (data.tags && data.tags.some(function(t){ return /velocidad|codejr/i.test(t); })) || (/escenarios.*codejr|velocidad/i.test(data.title || '')));
    var isElectronica = !isPaint && !isCodeorg && !isScratchJrVelocidad && !isScratchJrPerspectiva && (isDiaMadre || isMarcalibro || data.type === 'electronica' || (data.tags && data.tags.some(function(t){ return /electr[oó]nica|circuito|sombrero/i.test(t); })) || (!data.gameUrl && !data.makecodeUrl && data.materials && data.materials.some(function(m){ return /cobre|led|pila/i.test(m.title || ''); })));

    var title = data.title || 'Misión Educativa';
    var levelText = data.level ? ('Nivel ' + data.level) : 'Taller Maker';
    var mainText = isObjective ? (data.objective || data.description) : (data.benefits || data.description);
    var gameUrl = isPaint ? null : (data.gameUrl || data.externalUrl || null);
    var student = window.getActiveStudent ? window.getActiveStudent() : null;
    var gradeName = (student && student.gradeName) || (data.gradeName || 'Sala de 5 años');

    var categoryLabel = isObjective ? '🎯 OBJETIVO PEDAGÓGICO' : '🧠 BENEFICIOS DEL RAZONAMIENTO';
    var categoryTheme = isObjective ? 'objective' : 'benefits';
    var platText = isServoJoystick ? 'MakeCode micro:bit (Robótica & Mapeo)' : (isCanva ? 'Canva & Animación IA' : (isMarcalibro ? 'Origami & Circuito (Tom Sawyer)' : (isScratchJrPerspectiva ? 'Scratch Jr (Perspectiva)' : (isScratchJrVelocidad ? 'Scratch Jr (CodeJr)' : (isDiaMadre ? 'Papertronics (Tarjeta 3D)' : (isPaintBanderas ? 'Paint (Banderas)' : (isPaintCancha ? 'Paint (Cancha)' : (isMinecraft ? 'Code.org Minecraft' : (isFrozen ? 'Frozen Code.org' : ((data.platform === 'codeorg' || isCodeorg) ? 'Code.org' : 'Juego'))))))))));

    // Pilares didácticos según el tipo de proyecto y concepto
    var pillars = [];
    var tipBoxText = '';

    if (isObjective) {
      if (isServoJoystick) {
        pillars = [
          { icon: 'fa-gamepad', color: '#0D9488', title: 'Palanca del Joystick Chico Negro (Pin P1)', desc: 'Adquirir valores continuos de 0 a 1023 en el pin analógico P1 según la inclinación horizontal de la palanca.' },
          { icon: 'fa-calculator', color: '#4F46E5', title: 'Ajuste de Intervalo Matemático (Math.map)', desc: 'Aplicar la fórmula proporcional en MakeCode para traducir el rango [0..1023] al rango angular [0°..180°] del arco.' },
          { icon: 'fa-futbol', color: '#EA580C', title: 'Movimiento del Arquero en el Servo (Pin P0)', desc: 'Comandar el servomotor SG90 en el pin P0 con límites de seguridad (0° a 180°) para desplazar al arquero de poste a poste.' },
          { icon: 'fa-sync-alt', color: '#16A34A', title: 'Bucle Continuo y Tasa de Refresco (20 ms)', desc: 'Ejecutar el ciclo en el bloque "para siempre" con pausa de 20 ms para lograr atajadas fluidas sin tirones mecánicos.' }
        ];
        tipBoxText = '<strong>🧤 El Arquero Mecánico con Joystick Chico Negro y Servo:</strong> En este Nivel 2 de 6° Grado, los estudiantes construyen y programan el arquero atajador. La palanca del joystick chico negro (Pin P1) envía lecturas de 0 a 1023, la micro:bit aplica el <strong>ajuste de intervalo matemático (Math.map)</strong> con límites de 0° a 180° y comanda el servomotor SG90 (Pin P0) para atajar penales de poste a poste en tiempo real.';
      } else if (isMarcalibro) {
        pillars = [
          { icon: 'fa-book-open', color: '#D97706', title: 'Geometría del Doblado Origami', desc: 'Transformar una hoja cuadrada de papel glacé en un bolsillo esquinero autoportante mediante pliegues diagonales precisos.' },
          { icon: 'fa-microchip', color: '#2563EB', title: 'Circuito Esquinero Plano', desc: 'Diseñar un circuito con cinta de cobre que recorre el interior del marca-páginas sin abultar las hojas del libro.' },
          { icon: 'fa-lightbulb', color: '#F59E0B', title: 'LED Chato en el Sombrero', desc: 'Ubicar el LED SMD en el centro exacto del sombrero de paja de Tom Sawyer para que ilumine la lectura.' },
          { icon: 'fa-hand-pointer', color: '#10B981', title: 'Pulsador Táctil por Presión', desc: 'Cerrar el circuito eléctrico al colocar el marca-libros en la esquina de la página o apretar la punta con los dedos.' }
        ];
        tipBoxText = '<strong>📖 El Marca-Libros Origami de Tom Sawyer:</strong> Esta misión para 1° Grado integra destreza motriz fina (origami), literatura de aventuras y electrónica práctica con un LED chato integrado en el gorro del personaje.';
      } else if (isCanva) {
        pillars = [
          { icon: 'fa-camera', color: '#0284C7', title: 'Captura de Fotografía en el Aula', desc: 'Sacar una foto en primer plano de la cabeza y el rostro del estudiante con buena iluminación en el taller.' },
          { icon: 'fa-wand-magic-sparkles', color: '#7C3AED', title: 'Quitafondos Inteligente con IA', desc: 'Utilizar la inteligencia artificial de Canva para eliminar el fondo del aula y aislar limpiamente la cabeza del alumno.' },
          { icon: 'fa-user-astronaut', color: '#10B981', title: 'Fotomontaje: Reemplazo de Cabeza', desc: 'Buscar una imagen de un arquero atajando y reemplazar su cabeza original encajando la foto del estudiante sobre el cuerpo.' },
          { icon: 'fa-film', color: '#F59E0B', title: 'Animación Generativa con IA (Magic Animate)', desc: 'Transformar el fotomontaje estático en una animación de video MP4 o GIF donde el arquero personalizado cobra vida y vuela al ángulo.' }
        ];
        tipBoxText = '<strong>⚽ El Arquero con Fotomontaje y Animación IA en Canva:</strong> En este proyecto los estudiantes aprenden la técnica de fotomontaje (reemplazar la cabeza de un arquero en una foto con la suya propia) y utilizan la IA generativa de Canva para transformar la imagen en una animación de atajada dinámica en video.';
      } else if (isDiaMadre) {
        pillars = [
          { icon: 'fa-heart', color: '#E11D48', title: 'Geometría y Efecto Pop-Up 3D', desc: 'Comprender cómo los cortes escalonados y pliegues inversos transforman un dibujo plano en un corazón con volumen 3D al abrir la tarjeta.' },
          { icon: 'fa-microchip', color: '#7C3AED', title: 'Papertronics & Circuito', desc: 'Construir un circuito real sobre papel con cinta de cobre autoadhesiva, pila botón CR2032 de 3V y diodo LED de alto brillo.' },
          { icon: 'fa-shield-alt', color: '#2563EB', title: 'Pulsador en Escudo Freire', desc: 'Armar un interruptor táctil oculto detrás del escudo del Colegio Paulo Freire que cierra el circuito al ser presionado.' },
          { icon: 'fa-lightbulb', color: '#D97706', title: 'Iluminación en los Bordes', desc: 'Orientar el haz de luz del LED para que resalte los bordes del corazón 3D enmarcando con orgullo la foto del niño/a.' }
        ];
        tipBoxText = '<strong>💖 Tarjeta Pop-Up 3D del Día de la Madre (Papertronics):</strong> Esta misión une arte tridimensional y electrónica segura. El niño experimenta el asombro de crear un relieve que emerge del papel y activa la luz LED al pulsar el escudo del colegio Paulo Freire.';
      } else if (isMinecraft) {
        pillars = [
          { icon: 'fa-cube', color: '#059669', title: 'Adaptación Educativa Oficial', desc: 'No es el juego comercial libre: es una plataforma oficial de Code.org para aprender programación.' },
          { icon: 'fa-laptop-code', color: '#2563EB', title: 'Programar a Steve y Alex', desc: 'Descubrir que los personajes solo se mueven cuando encastramos instrucciones algorítmicas en orden.' },
          { icon: 'fa-hammer', color: '#B45309', title: 'Acciones en el Entorno 3D', desc: 'Combinar movimiento en cuadrícula isométrica con acciones reales: talar madera, esquilar y construir.' },
          { icon: 'fa-sync-alt', color: '#7C3AED', title: 'Bucles y Optimización', desc: 'Aprender a usar el bloque "Repetir" para que el personaje complete tareas complejas sin repetir código.' }
        ];
        tipBoxText = '<strong>⛏️ Aclaración Crucial:</strong> En este taller no jugamos al Minecraft tradicional de juego libre o supervivencia; utilizamos la adaptación educativa de Code.org donde cada acción de Steve y Alex es el resultado de un programa de bloques creado por los niños.';
      } else if (isFrozen) {
        pillars = [
          { icon: 'fa-snowflake', color: '#0284C7', title: 'Geometría sobre el Hielo', desc: 'Aprender a formar figuras geométricas haciendo que Elsa y Ana patinen con líneas y giros.' },
          { icon: 'fa-shapes', color: '#2563EB', title: 'De Paint a la Programación', desc: 'Conectar lo dibujado a mano en Paint con órdenes de código exactas (avanzar píxeles y girar).' },
          { icon: 'fa-redo', color: '#D97706', title: 'Ángulos Rectos (90°)', desc: 'Comprender que las esquinas de un cuadrado o rectángulo se forman girando exactamente 90 grados.' },
          { icon: 'fa-sync-alt', color: '#16A34A', title: 'Repetición y Bucles', desc: 'Descubrir cómo repetir secuencias para trazar copos de nieve y estrellas sin repetir código.' }
        ];
        tipBoxText = '<strong>💡 Clave Pedagógica (Conexión Paint):</strong> En los niveles de Paint tu peque dibujó figuras arrastrando el mouse. Ahora en Frozen programa a Elsa para que trace esas mismas figuras con código exacto. ¡Preguntale cómo se forma una esquina con un giro de 90°!';
      } else if (isPaintBanderas) {
        pillars = [
          { icon: 'fa-flag', color: '#2563EB', title: 'Descomposición de Banderas', desc: 'Identificar que las banderas del mundo están formadas por rectángulos, franjas, círculos y estrellas.' },
          { icon: 'fa-vector-square', color: '#0284C7', title: 'Franjas y Proporciones', desc: 'Dividir el lienzo en dos mitades o tres franjas iguales horizontales o verticales.' },
          { icon: 'fa-sun', color: '#EAB308', title: 'Símbolos y Soles', desc: 'Utilizar la herramienta Elipse con Shift para trazar el Sol de Mayo y formas para emblemas patrios.' },
          { icon: 'fa-fill-drip', color: '#16A34A', title: 'Relleno de Color Cerrado', desc: 'Aprender a no dejar huecos abiertos en las líneas para que el bote de pintura no desborde.' }
        ];
        tipBoxText = '<strong>🇺🇾 Banderas del Mundial en Paint:</strong> Esta actividad une el entusiasmo deportivo con la geometría digital: enseña a los niños a mirar símbolos complejos y descomponerlos en figuras geométricas básicas y colores.';
      } else if (isPaintCancha) {
        pillars = [
          { icon: 'fa-shapes', color: '#16A34A', title: 'Figuras Geométricas', desc: 'Identificar y trazar rectángulos, círculos y líneas para delimitar el campo de juego.' },
          { icon: 'fa-paint-brush', color: '#2563EB', title: 'Manejo de Herramientas Paint', desc: 'Aprender a seleccionar figuras, bote de pintura para relleno de césped y paleta de colores.' },
          { icon: 'fa-mouse-pointer', color: '#D97706', title: 'Coordinación con el Mouse', desc: 'Ejercitar el clic sostenido y arrastre con el ratón para dimensionar y posicionar las figuras.' },
          { icon: 'fa-trophy', color: '#7C3AED', title: 'Proyecto Completo', desc: 'Completar una cancha de fútbol con arco, áreas, círculo central y pelota terminada.' }
        ];
        tipBoxText = '<strong>💡 Consejo Educativo:</strong> Preguntale a tu peque qué figuras geométricas tiene una cancha de fútbol real antes de dibujarla en la computadora.';
      } else if (isCodeorg) {
        pillars = [
          { icon: 'fa-bullseye', color: '#E11D48', title: 'Meta de la Misión', desc: 'Llevar al pájaro rojo hasta el cerdito encastrando las instrucciones correctas en orden.' },
          { icon: 'fa-compass', color: '#2563EB', title: 'Orientación Espacial', desc: 'Contar casilleros y reconocer giros a izquierda o derecha desde los ojos del personaje.' },
          { icon: 'fa-puzzle-piece', color: '#D97706', title: 'Secuencia de Bloques', desc: 'Entender que el programa ejecuta las instrucciones de arriba hacia abajo sin saltear.' },
          { icon: 'fa-trophy', color: '#16A34A', title: 'Autonomía y Éxito', desc: 'Lograr superar laberintos progresivos con motivación, alegría y concentración.' }
        ];
        tipBoxText = '<strong>💡 Consejo Pedagógico:</strong> Pedile a tu peque que señale con su dedito el camino en la pantalla antes de arrastrar los bloques. ¡Imaginar el recorrido primero es el inicio del razonamiento!';
      } else if (isElectronica) {
        pillars = [
          { icon: 'fa-bolt', color: '#D97706', title: 'Circuito Eléctrico', desc: 'Comprender que la electricidad necesita un camino continuo de cobre para viajar.' },
          { icon: 'fa-battery-full', color: '#16A34A', title: 'Polaridad Segura', desc: 'Identificar el polo positivo (+) y negativo (-) en la pila de botón CR2032 y el LED.' },
          { icon: 'fa-hat-wizard', color: '#2563EB', title: 'Creación Wearable', desc: 'Transformar papel, cinta y luz en un sombrero real que se luce en la cabeza.' },
          { icon: 'fa-toggle-on', color: '#E11D48', title: 'Interruptor Casero', desc: 'Aprender cómo al apoyar la vincha en la cabeza se cierra el contacto y brilla la luz.' }
        ];
        tipBoxText = '<strong>💡 Consejo Maker:</strong> Permitan que los niños toquen las patitas del LED sobre la pila para ver cómo prende la luz antes de pegarlo. ¡El asombro despierta la curiosidad científica!';
      } else if (isScratchJrPerspectiva) {
        pillars = [
          { icon: 'fa-eye', color: '#7C3AED', title: 'Perspectiva Visual y Profundidad (3D en 2D)', desc: 'Comprender que en el mundo real lo lejano se ve pequeño y lo cercano grande, recreando esa ilusión 3D en la pantalla.' },
          { icon: 'fa-compress-alt', color: '#9333EA', title: 'Bloque Violeta: Achicar (5 veces)', desc: 'Enviar al personaje al horizonte lejano haciéndolo diminuto en el punto de fuga superior del camino.' },
          { icon: 'fa-expand-alt', color: '#6B21A8', title: 'Bloque Violeta: Agrandar (2 veces)', desc: 'Aumentar la escala progresivamente a medida que el personaje avanza y desciende casilleros por el sendero.' },
          { icon: 'fa-sync-alt', color: '#2563EB', title: 'Restaurar Tamaño y Ejemplo .sjr', desc: 'Aprender la importancia de restaurar el tamaño original al inicio e inspeccionar el archivo oficial perpestiva.sjr.' }
        ];
        tipBoxText = '<strong>🐱 Perspectiva y Profundidad en Scratch Jr:</strong> En este Nivel 10 los exploradores descubren cómo dar volumen y profundidad a sus historias combinando los bloques violetas de apariencia con el movimiento del personaje.';
      } else if (isScratchJrVelocidad) {
        pillars = [
          { icon: 'fa-cat', color: '#EA580C', title: 'Ambiente y Entorno Scratch Jr', desc: 'Explorar la interfaz visual: biblioteca de personajes (+), botón de paisajes para cambiar escenarios y paleta de bloques encastrables.' },
          { icon: 'fa-tachometer-alt', color: '#D97706', title: 'Control de Velocidad (Bloque Naranja)', desc: 'Descubrir y experimentar con las 3 velocidades: 1 (lento / caracol), 2 (medio / trote) y 3 (rápido / corredor o auto).' },
          { icon: 'fa-flag', color: '#EAB308', title: 'Sincronización con Bandera Verde', desc: 'Aprender que la Bandera Verde permite iniciar a todos los personajes al mismo tiempo para largar una carrera justa.' },
          { icon: 'fa-file-code', color: '#2563EB', title: 'Proyecto de Ejemplo velocidad.sjr', desc: 'Descargar e inspeccionar el archivo .sjr oficial para comprender la lógica de programación y adaptarla.' }
        ];
        tipBoxText = '<strong>🐱 Escenarios y Velocidades en Scratch Jr:</strong> En este nivel los alumnos dan sus primeros pasos en Scratch Jr comprendiendo la relación entre tiempo, distancia y velocidad a través de animaciones y carreras divertidas.';
      } else {
        pillars = [
          { icon: 'fa-bullseye', color: '#E11D48', title: 'Reto Claro', desc: 'Comprender cuál es el desafío central y qué invento vamos a construir.' },
          { icon: 'fa-route', color: '#2563EB', title: 'Pasos Sencillos', desc: 'Avanzar paso a paso con instrucciones visuales adaptadas a su edad.' },
          { icon: 'fa-lightbulb', color: '#D97706', title: 'Resolución Creativa', desc: 'Descubrir cómo la tecnología nos ayuda a resolver problemas reales.' },
          { icon: 'fa-smile-beam', color: '#16A34A', title: 'Aprender Creando', desc: 'Construir proyectos tangibles o interactivos que dan orgullo compartir.' }
        ];
        tipBoxText = '<strong>💡 Clave Educativa:</strong> Cada proyecto está diseñado para desarrollar habilidades del siglo XXI a través del juego y la exploración guiada.';
      }
    } else {
      // Beneficios
      if (isServoJoystick) {
        pillars = [
          { icon: 'fa-square-root-alt', color: '#4F46E5', title: 'Abstracción Matemática y Cinemática', desc: 'Comprender la proporcionalidad directa y funciones lineales al ver cómo la fórmula matemática orienta la figura del arquero de poste a poste.' },
          { icon: 'fa-shield-alt', color: '#0D9488', title: 'Límites de Seguridad (Clamping Algorítmico)', desc: 'Aprender a proteger actuadores mecánicos mediante condiciones "si angulo < 0" y "si angulo > 180" para evitar golpes mecánicos en los postes.' },
          { icon: 'fa-project-diagram', color: '#EA580C', title: 'Integración de Hardware Físico', desc: 'Dominar la conexión de la micro:bit v2 con el módulo joystick chico negro en Pin P1 y el servo SG90 en Pin P0 con alimentación compartida.' },
          { icon: 'fa-gamepad', color: '#16A34A', title: 'Robótica Lúdica y Competitiva', desc: 'Evolucionar desde la animación en pantalla hacia un invento mecatrónico real para jugar tandas de penales con compañeros en el aula.' }
        ];
        tipBoxText = '<strong>📐 Matemáticas y Robótica en Acción:</strong> El bloque "ajustar intervalo" (Math.map) traduce las matemáticas escolares en reflejos deportivos: convierte la inclinación de la palanca del joystick en la atajada exacta del arquero mecánico en el arco.';
      } else if (isCanva) {
        pillars = [
          { icon: 'fa-crop-alt', color: '#0284C7', title: 'Composición Visual y Autoedición', desc: 'Dominar escalas, capas, rotación y encuadre para integrar su rostro con naturalidad sobre el cuerpo de un deportista en acción.' },
          { icon: 'fa-brain', color: '#7C3AED', title: 'Comprensión Crítica de la IA', desc: 'Entender cómo los modelos de visión por computadora detectan bordes anatómicos para recortar fondos y sintetizar movimiento generativo.' },
          { icon: 'fa-user-check', color: '#10B981', title: 'Identidad y Creatividad Digital', desc: 'Fortalecer la confianza y el protagonismo al convertirse en el personaje central de su propia historia deportiva.' },
          { icon: 'fa-film', color: '#F59E0B', title: 'Producción y Formatos Multimedia', desc: 'Aprender la diferencia entre imágenes fijas (PNG/JPG) y medios temporales (GIF animado / video MP4) listos para su portafolio.' }
        ];
        tipBoxText = '<strong>⚽ Fotomontaje y Animación Generativa:</strong> Al reemplazar la cabeza del arquero con su propia foto y darle vida con Magic Animate, los estudiantes de 6° grado aprenden el potencial creativo de la inteligencia artificial y el diseño gráfico digital.';
      } else if (isMarcalibro) {
        pillars = [
          { icon: 'fa-hands', color: '#D97706', title: 'Destreza Manual y Concentración', desc: 'El origami fomenta la paciencia, el orden secuencial y el refinamiento de la motricidad fina en los dedos al marcar cada pliegue.' },
          { icon: 'fa-lightbulb', color: '#F59E0B', title: 'Causalidad y Comprensión Electrónica', desc: 'Comprender cómo la corriente viaja por las pistas y se interrumpe o activa al hacer presión con las manos o el libro.' },
          { icon: 'fa-book-reader', color: '#2563EB', title: 'Estímulo a la Lectura y Fantasía', desc: 'Vincular el proyecto con Las Aventuras de Tom Sawyer, incentivando el placer por la lectura con un objeto creado por ellos.' },
          { icon: 'fa-award', color: '#10B981', title: 'Autoestima Maker', desc: 'Orgullo y satisfacción al crear un accesorio funcional y útil para sus libros escolares y de cuentos.' }
        ];
        tipBoxText = '<strong>📖 Beneficios Maker:</strong> El marca-libros origami une literatura de aventuras con ciencia práctica, demostrando que con papel, ingenio y un LED chato los alumnos de 1° grado pueden fabricar sus propios inventos.';
      } else if (isDiaMadre) {
        pillars = [
          { icon: 'fa-cut', color: '#E11D48', title: 'Motricidad Fina y Precisión', desc: 'Coordinación óculo-manual avanzada para cortar únicamente las líneas sólidas de los escalones sin cortar las líneas de puntos de pliegue.' },
          { icon: 'fa-cube', color: '#7C3AED', title: 'Percepción Espacial Tridimensional', desc: 'Visualizar cómo los planos se pliegan y despliegan en el espacio físico para cobrar vida al abrir la tarjeta en 90°.' },
          { icon: 'fa-bolt', color: '#2563EB', title: 'Causa y Efecto con Circuito Oculto', desc: 'Entender el funcionamiento del circuito eléctrico: el escudo actúa como un interruptor normalmente abierto que conecta los polos al presionar.' },
          { icon: 'fa-heart', color: '#D97706', title: 'Vínculo Afectivo y Autoestima Maker', desc: 'Empoderamiento emocional: entregar a mamá un regalo tecnológico y afectivo de alta calidad construido 100% con sus propias manos.' }
        ];
        tipBoxText = '<strong>✨ Papertronics en Acción:</strong> Combinar manualidades, ciencia de circuitos y diseño pop-up demuestra a los exploradores de 5 años que ellos pueden construir tecnología real y emocionante para compartir en familia.';
      } else if (isMinecraft) {
        pillars = [
          { icon: 'fa-user-cog', color: '#059669', title: 'De Jugador Pasivo a Creador', desc: 'Superar la fascinación pasiva por Minecraft: comprender cómo se crean y programan las reglas del juego.' },
          { icon: 'fa-cube', color: '#2563EB', title: 'Razonamiento Espacial 3D', desc: 'Estructurar el espacio en tres dimensiones: calcular pasos, giros y planos en el entorno cúbico.' },
          { icon: 'fa-puzzle-piece', color: '#B45309', title: 'Descomposición Algorítmica', desc: 'Dividir metas complejas (construir una casa) en pasos individuales encastrados con bloques lógicos.' },
          { icon: 'fa-sync-alt', color: '#7C3AED', title: 'Pensamiento en Bucles', desc: 'Descubrir que repetir órdenes mediante código ahorra tiempo y esfuerzo, base de la programación moderna.' }
        ];
        tipBoxText = '<strong>⛏️ Minecraft Educativo en Acción:</strong> Guiar a Steve y Alex en Code.org desarrolla perseverancia, pensamiento computacional y creatividad estructurada en un entorno amado por los niños.';
      } else if (isFrozen) {
        pillars = [
          { icon: 'fa-shapes', color: '#0284C7', title: 'Pensamiento Geométrico', desc: 'Descomponer figuras en partes: comprender que un cuadrado son 4 lados iguales y 4 giros de 90°.' },
          { icon: 'fa-code-branch', color: '#2563EB', title: 'Introducción a Bucles (Loops)', desc: 'Descubrir el bloque "Repetir", uno de los pilares de la programación para optimizar instrucciones.' },
          { icon: 'fa-compass', color: '#D97706', title: 'Orientación y Perspectiva', desc: 'Ponerse en el lugar de Elsa sobre la pista de hielo para calcular hacia dónde debe girar su cuerpo.' },
          { icon: 'fa-magic', color: '#7C3AED', title: 'Creatividad Matemática', desc: 'Sentir orgullo al ver cómo las matemáticas, los ángulos y el código generan arte sobre el hielo.' }
        ];
        tipBoxText = '<strong>❄️ De Paint a la Programación:</strong> Mientras Paint estimula la motricidad fina manual, Ana y Elsa desarrollan la abstracción mental: programar para que las máquinas dibujen con precisión matemática.';
      } else if (isPaintBanderas) {
        pillars = [
          { icon: 'fa-vector-square', color: '#2563EB', title: 'Fraccionamiento y Simetría', desc: 'Comprender mitades y tercios espaciales al dibujar banderas de 2 y 3 franjas equilibradas.' },
          { icon: 'fa-mouse-pointer', color: '#16A34A', title: 'Control y Motricidad Fina', desc: 'Dominio de la precisión del puntero para unir esquinas sin dejar aberturas en los trazos.' },
          { icon: 'fa-globe-americas', color: '#D97706', title: 'Cultura e Identidad Global', desc: 'Aprender sobre los países del mundial, sus colores y sus símbolos representativos.' },
          { icon: 'fa-palette', color: '#7C3AED', title: 'Autoexpresión y Autonomía', desc: 'Confianza para crear colecciones digitales propias de banderas y guardarlas en su Google Drive.' }
        ];
        tipBoxText = '<strong>🎨 Arte Digital en Acción:</strong> Dibujar banderas del mundial en Paint afianza las nociones de proporción, precisión y manejo del software gráfico.';
      } else if (isPaintCancha) {
        pillars = [
          { icon: 'fa-mouse-pointer', color: '#16A34A', title: 'Motricidad Fina Digital', desc: 'Precisión y control muscular en la mano al manipular el mouse o touchpad para trazar formas.' },
          { icon: 'fa-vector-square', color: '#2563EB', title: 'Geometría y Proporción', desc: 'Reconocer simetría bilateral (dos mitades de cancha), tamaños relativos y límites espaciales.' },
          { icon: 'fa-laptop', color: '#7C3AED', title: 'Alfabetización Digital', desc: 'Familiarizarse con el entorno operativo: abrir Paint, seleccionar herramientas y guardar archivos.' },
          { icon: 'fa-palette', color: '#E11D48', title: 'Creatividad sin Miedo al Error', desc: 'Aprender a usar la goma o Ctrl+Z para corregir trazos con confianza y autonomía artística.' }
        ];
        tipBoxText = '<strong>🎨 Arte Digital en Acción:</strong> El dibujo de la cancha en Paint une la pasión deportiva con el aprendizaje de geometría temprana y destreza informática.';
      } else if (isCodeorg) {
        pillars = [
          { icon: 'fa-layer-group', color: '#16A34A', title: 'Secuenciación de Algoritmos', desc: 'Aprender que para lograr una meta es necesario dar instrucciones precisas y ordenadas.' },
          { icon: 'fa-arrows-alt', color: '#2563EB', title: 'Lateralidad y Orientación', desc: 'Ejercitar la lateralidad cruzada (izquierda / derecha / avanzar) fortaleciendo la psicomotricidad.' },
          { icon: 'fa-cubes', color: '#7C3AED', title: 'Descomposición de Problemas', desc: 'Dividir un reto que parece difícil en pasos cortos, sencillos y alcanzables.' },
          { icon: 'fa-wrench', color: '#E11D48', title: 'Depuración y Resiliencia', desc: 'Aprender que equivocarse es normal: probar, detectar el error y corregirlo sin frustración.' }
        ];
        tipBoxText = '<strong>🧠 Razonamiento en Acción:</strong> Guiar a los Angry Birds en Code.org activa áreas cerebrales vinculadas a la planificación anticipatoria, el cálculo espacial y la lógica matemática.';
      } else if (isElectronica) {
        pillars = [
          { icon: 'fa-hands', color: '#D97706', title: 'Motricidad Fina', desc: 'Coordinación óculo-manual de alta precisión al manipular cinta de cobre adhesiva y componentes.' },
          { icon: 'fa-lightbulb', color: '#16A34A', title: 'Causa y Efecto Inmediato', desc: 'Comprender físicamente cómo la energía se transforma en luz visible al cerrar el circuito.' },
          { icon: 'fa-palette', color: '#7C3AED', title: 'Cultura Maker', desc: 'Pasar de ser espectadores a inventores: crear tecnología útil y divertida con sus propias manos.' },
          { icon: 'fa-gem', color: '#2563EB', title: 'Seguridad y Confianza', desc: 'Experimentar con pilas seguras de bajo voltaje (3V), perdiendo el miedo a la electrónica.' }
        ];
        tipBoxText = '<strong>🌱 Aprendizaje Vivencial:</strong> La electrónica de papel combina arte, ciencias y tecnología en una actividad sensorial inolvidable para niños de 5 años.';
      } else if (isScratchJrPerspectiva) {
        pillars = [
          { icon: 'fa-cube', color: '#7C3AED', title: 'Percepción Tridimensional en 2D', desc: 'Desarrolla la abstracción de distancia y escala: comprender que el tamaño de una figura comunica profundidad espacial en la pantalla.' },
          { icon: 'fa-layer-group', color: '#2563EB', title: 'Secuenciación Multidimensional', desc: 'Coordinar dos órdenes simultáneas en el algoritmo: avanzar casilleros en el eje vertical y alterar el tamaño de la figura.' },
          { icon: 'fa-undo', color: '#10B981', title: 'Gestión de Estados y Reseteo', desc: 'Comprender que al modificar el tamaño de un personaje es crucial programar una instrucción de restauración al reiniciar.' },
          { icon: 'fa-film', color: '#EA580C', title: 'Narrativa Visual y Cinematografía', desc: 'Aprender técnicas reales de animación utilizadas en cine y videojuegos para simular entradas y salidas de escena.' }
        ];
        tipBoxText = '<strong>🔍 Consejo para Familias:</strong> Descarguen el archivo <code>perpestiva.sjr</code> para ver cómo Teen3 camina por el bosque hacia el frente, y motiven a los chicos a probar qué pasa si cambian el número de veces que se agranda o achica.';
      } else if (isScratchJrVelocidad) {
        pillars = [
          { icon: 'fa-brain', color: '#EA580C', title: 'Pensamiento Computacional y Parámetros', desc: 'Comprender que las instrucciones de código pueden modificarse cualitativamente cambiando su velocidad o ritmo.' },
          { icon: 'fa-compass', color: '#2563EB', title: 'Orientación y Tiempo Espacial', desc: 'Relacionar la distancia recorrida en la cuadrícula horizontal con el tiempo que tarda cada personaje según su velocidad.' },
          { icon: 'fa-flask', color: '#16A34A', title: 'Causalidad y Formulación de Hipótesis', desc: 'Formular predicciones de causa-efecto: "¿Quién ganará la carrera si le cambio la velocidad a 3 antes de arrancar?".' },
          { icon: 'fa-palette', color: '#7C3AED', title: 'Narrativa Digital y Expresión Artística', desc: 'Ambientar historias combinando personajes, paisajes/escenarios y efectos de movimiento dinámico.' }
        ];
        tipBoxText = '<strong>💡 Consejo para Familias:</strong> Descarguen el archivo <code>velocidad.sjr</code> para ver cómo están programados los personajes y motiven a los chicos a cambiar las velocidades para ver qué sucede.';
      } else {
        pillars = [
          { icon: 'fa-brain', color: '#16A34A', title: 'Pensamiento Computacional', desc: 'Estructurar el pensamiento de forma lógica para encontrar soluciones ordenadas.' },
          { icon: 'fa-palette', color: '#E11D48', title: 'Creatividad Aplicada', desc: 'Conectar la imaginación con herramientas digitales y mecánicas reales.' },
          { icon: 'fa-sync-alt', color: '#2563EB', title: 'Tolerancia a la Frustración', desc: 'Desarrollar paciencia y perseverancia disfrutando del proceso de construcción.' },
          { icon: 'fa-star', color: '#D97706', title: 'Confianza Digital', desc: 'Sentirse capaces de controlar las máquinas y programar en lugar de solo jugar pasivamente.' }
        ];
        tipBoxText = '<strong>⭐ Formación Integral:</strong> El Taller de Programación fomenta la curiosidad, el trabajo en equipo y el pensamiento reflexivo desde nivel inicial.';
      }
    }

    var pillarsHtml = pillars.map(function(p){
      return '<div class="pcm-pillar-item">' +
        '<div class="pcm-pi-icon" style="background:' + p.color + '18;color:' + p.color + ';border-color:' + p.color + '33;">' +
          '<i class="fas ' + p.icon + '"></i>' +
        '</div>' +
        '<div class="pcm-pi-content">' +
          '<h5 class="pcm-pi-title">' + p.title + '</h5>' +
          '<p class="pcm-pi-desc">' + p.desc + '</p>' +
        '</div>' +
      '</div>';
    }).join('');

    modal.innerHTML =
      '<div class="pcm-backdrop"></div>' +
      '<div class="pcm-card ' + categoryTheme + '" role="dialog" aria-modal="true">' +
        '<div class="pcm-header">' +
          '<div class="pcm-header-top">' +
            '<div class="pcm-category-pill ' + categoryTheme + '">' +
              categoryLabel +
            '</div>' +
            '<div class="pcm-header-meta">' +
              '<span class="pcm-level-pill">' + levelText + '</span>' +
              '<span class="pcm-grade-pill"><i class="fas fa-graduation-cap"></i> ' + gradeName + '</span>' +
            '</div>' +
            '<button type="button" class="pcm-close-btn" id="pcm-btn-close-x" title="Cerrar ventana"><i class="fas fa-times"></i></button>' +
          '</div>' +
          '<h3 class="pcm-title">' + title + '</h3>' +
        '</div>' +
        '<div class="pcm-body">' +
          '<div class="pcm-quote-box ' + categoryTheme + '">' +
            '<div class="pcm-qb-label">' +
              (isObjective ? '<i class="fas fa-bullseye"></i> <span>¿Cuál es el Objetivo Pedagógico?</span>' : '<i class="fas fa-brain"></i> <span>¿Cuáles son los Beneficios de Razonamiento?</span>') +
            '</div>' +
            '<p class="pcm-qb-text">' + mainText + '</p>' +
          '</div>' +
          '<div class="pcm-pillars-section">' +
            '<h4 class="pcm-pillars-title"><i class="fas fa-cubes"></i> Pilares Didácticos y Competencias:</h4>' +
            '<div class="pcm-pillars-grid">' + pillarsHtml + '</div>' +
          '</div>' +
          '<div class="pcm-tip-box">' + tipBoxText + '</div>' +
        '</div>' +
        '<div class="pcm-footer">' +
          (gameUrl ?
            '<a href="' + gameUrl + '" target="_blank" rel="noopener noreferrer" class="pcm-btn pcm-btn-game">' +
              '<i class="fas fa-gamepad"></i> <span>Jugar en ' + platText + '</span>' +
            '</a>' : '') +
          (data.id ?
            '<button type="button" class="pcm-btn pcm-btn-launch" id="pcm-btn-launch-mission">' +
              '<i class="fas fa-rocket"></i> <span>Abrir Misión</span>' +
            '</button>' : '') +
          '<button type="button" class="pcm-btn pcm-btn-close" id="pcm-btn-close-action">' +
            '<i class="fas fa-check"></i> <span>¡Entendido!</span>' +
          '</button>' +
        '</div>' +
      '</div>';

    modal.classList.add('active');

    function closeModal() {
      if (window.sounds && window.sounds.playClick) window.sounds.playClick();
      modal.classList.remove('active');
      document.removeEventListener('keydown', handleKey);
    }

    function handleKey(e) {
      if (e.key === 'Escape') closeModal();
    }

    document.addEventListener('keydown', handleKey);

    var closeX = modal.querySelector('#pcm-btn-close-x');
    if (closeX) closeX.onclick = closeModal;

    var closeAction = modal.querySelector('#pcm-btn-close-action');
    if (closeAction) closeAction.onclick = closeModal;

    var backdrop = modal.querySelector('.pcm-backdrop');
    if (backdrop) backdrop.onclick = closeModal;

    var launchBtn = modal.querySelector('#pcm-btn-launch-mission');
    if (launchBtn) {
      launchBtn.onclick = function(){
        closeModal();
        if (window.openAdventureProjectModal) {
          window.openAdventureProjectModal(data, 'presentacion');
        }
      };
    }
  }

  window.openPedagogicalConceptModal = openPedagogicalConceptModal;

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
    var isPaint = mission.type === 'paint' || (mission.tags && mission.tags.some(function(t){ return /paint|dibujo|cancha|bandera/i.test(t); })) || (/cancha|paint|bandera/i.test(mission.title || ''));
    if (isPaint) {
      mission.gameUrl = null;
      mission.externalUrl = null;
    }
    var isPaintBanderas = isPaint && (/bandera/i.test(mission.title || '') || (mission.tags && mission.tags.some(function(t){ return /bandera/i.test(t); })));
    var isPaintCancha = isPaint && !isPaintBanderas;
    var isMinecraft = !isPaint && ((mission.tags && mission.tags.some(function(t){ return /minecraft|steve|alex/i.test(t); })) || (/minecraft/i.test(mission.title || '')));
    var isFrozen = !isPaint && !isMinecraft && ((mission.tags && mission.tags.some(function(t){ return /frozen|elsa|anna|ana/i.test(t); })) || (/frozen|elsa|anna|ana/i.test(mission.title || '')));
    var isCodeorg = !isPaint && (isFrozen || isMinecraft || mission.type === 'codeorg' || (mission.externalUrl && mission.externalUrl.includes('code.org')) || (mission.tags && mission.tags.some(function(t){ return /code\.org|angry ?birds|frozen|elsa|minecraft/i.test(t); })));
    var isAngryBirds = isCodeorg && !isFrozen && !isMinecraft;
    var isDiaMadre = !isPaint && ((mission.tags && mission.tags.some(function(t){ return /madre|coraz[oó]n|ilumina/i.test(t); })) || (/madre|coraz[oó]n|ilumina/i.test(mission.title || '')));
    var isMarcalibro = !isPaint && !isCodeorg && (mission.id === 'g1-p3' || (mission.tags && mission.tags.some(function(t){ return /marca ?libro|marcalibro|origami|tom sawyer/i.test(t); })) || (/marca ?libro|marcalibro|origami|tom sawyer/i.test(mission.title || '')));
    var isScratchJrPerspectiva = !isPaint && !isCodeorg && !isMarcalibro && (mission.id === 's5-p10' || mission.id === 's5-g5' || mission.id === 'g1-p10' || mission.id === 'g1-g5' || (mission.tags && mission.tags.some(function(t){ return /perspectiva|perpestiva/i.test(t); })) || (/perspectiva|perpestiva/i.test(mission.title || '')));
    var isScratchJrVelocidad = !isPaint && !isCodeorg && !isScratchJrPerspectiva && !isMarcalibro && (mission.id === 's5-p9' || mission.id === 's5-g1' || mission.id === 'g1-p9' || mission.id === 'g1-g1' || (mission.tags && mission.tags.some(function(t){ return /velocidad|codejr/i.test(t); })) || (/escenarios.*codejr|velocidad/i.test(mission.title || '')));
    var isServoJoystick = (mission.id === 'g6-p2') || (/servo.*joystick|joystick.*servo|ajuste intervalo|mapeo matem[aá]tico/i.test(mission.title || '')) || (mission.tags && mission.tags.some(function(t){ return /servo|joystick|intervalo|mapeo/i.test(t); }));
    var isCanva = !isServoJoystick && (mission.type === 'canva' || (mission.tags && mission.tags.some(function(t){ return /canva/i.test(t); })) || (/canva/i.test(mission.title || '')));
    var isGame = !isPaint && !isCanva && (mission.type === 'game' || isCodeorg || (mission.tags && mission.tags.some(function(t){ return /juego|game/i.test(t); })));
    var activeTab = initialTab || 'presentacion';
    if (isGame && (activeTab === 'entrega' || activeTab === 'solucion' || activeTab === 'simulador')) {
      activeTab = 'presentacion';
    } else if (activeTab === 'simulador') {
      activeTab = 'solucion';
    }
    var currentSlide = 0;
    var totalSlides = 4;
    var isElectronica = !isGame && !isPaint && !isCanva && (isDiaMadre || isMarcalibro || mission.type === 'electronica' || (mission.tags && mission.tags.some(function(t){ return /electr[oó]nica|circuito|sin programaci[oó]n|papertronics/i.test(t); })) || (!mission.makecodeUrl && !mission.scratchId && mission.materials && mission.materials.some(function(m){ return /led|pila|bater[ií]a|cobre|circuito|motor/i.test((m.title||'') + ' ' + (m.description||'')); })));
    var isMakecode = !isGame && !isElectronica && !isPaint && !isCanva && (!!mission.makecodeUrl || mission.type === 'makecode' || (mission.tags && mission.tags.some(function(t){ return /makecode|micro:?bit/i.test(t); })));
    var isScratch = !isGame && !isElectronica && !isMakecode && !isPaint && !isCanva;
    var hasPdf = !!mission.pdfUrl || !!mission.downloadPdfUrl;

    var storageKey = 'entrega_' + (student ? student.id : 'anon') + '_' + mission.id;
    var savedEntrega = null;
    try { savedEntrega = JSON.parse(localStorage.getItem(storageKey)); } catch(e){}
    var savedMakecodeUrl = (savedEntrega && savedEntrega.makecodeUrl) ? savedEntrega.makecodeUrl : '';
    var studentMkInfo = savedMakecodeUrl ? extractMakecodeInfo(savedMakecodeUrl) : null;
    var mkInfo = (mission && mission.makecodeUrl) ? extractMakecodeInfo(mission.makecodeUrl) : null;
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
          (!isGame ?
            '<button type="button" class="apm-tab-btn ' + (activeTab === 'entrega' ? 'active' : '') + '" data-tab="entrega">' +
              '<i class="fas fa-cloud-upload-alt"></i> Mi Entrega' +
            '</button>' +
            '<button type="button" class="apm-tab-btn ' + (activeTab === 'solucion' ? 'active' : '') + '" data-tab="solucion">' +
              '<i class="fas fa-lightbulb"></i> Solución Oficial' +
            '</button>' : ''
          ) +
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
                      '<div style="font-size:0.8rem;font-weight:800;color:' + (isServoJoystick ? '#0D9488' : (isCanva ? '#0284C7' : (isScratchJrPerspectiva ? '#7C3AED' : (isScratchJrVelocidad ? '#EA580C' : (isDiaMadre ? '#E11D48' : (isMinecraft ? '#059669' : (isFrozen ? '#0284C7' : (isAngryBirds ? '#E11D48' : (isPaintBanderas ? '#2563EB' : (isPaint ? '#16A34A' : (isElectronica ? '#D97706' : '#6366F1'))))))))))) + ';text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">' +
                        (isServoJoystick ? '🧤 Robótica & Matemáticas • El Arquero Mecánico MakeCode' : (isCanva ? '🤖 Inteligencia Artificial & Animación • Canva' : (isScratchJrPerspectiva ? '🐱 Scratch Jr • Escenarios & Perspectiva' : (isScratchJrVelocidad ? '🐱 Scratch Jr • Escenarios & Velocidades' : (isDiaMadre ? '💖 Tarjeta Pop-Up 3D • Papertronics & Circuito' : (isMinecraft ? '⛏️ Código en Bloques • Code.org Minecraft (Adaptación Educativa)' : (isFrozen ? '❄️ Geometría & Programación • Code.org Frozen' : (isAngryBirds ? '🎮 Programación con Bloques • Code.org' : (isPaintBanderas ? '🎨 Arte Digital & Banderas • Paint' : (isPaint ? '🎨 Arte Digital & Figuras • Paint' : (isElectronica ? '⚡ Circuito Electrónico • Sin Programación' : 'Desafío Maker • Nivel ' + mission.level))))))))))) +
                      '</div>' +
                      '<h2 style="font-size:1.6rem;font-weight:900;color:#1E293B;margin:0 0 10px;line-height:1.2;">' + mission.title + '</h2>' +
                      '<div class="apm-reto-card" style="' + (isServoJoystick ? 'border-left:4px solid #0D9488;background:#F0FDFA;' : (isCanva ? 'border-left:4px solid #0284C7;background:#F0F9FF;' : (isScratchJrPerspectiva ? 'border-left:4px solid #7C3AED;background:#FAF5FF;' : (isScratchJrVelocidad ? 'border-left:4px solid #EA580C;background:#FFF7ED;' : (isDiaMadre ? 'border-left:4px solid #E11D48;background:#FFF1F2;' : (isMinecraft ? 'border-left:4px solid #059669;background:#ECFDF5;' : (isFrozen ? 'border-left:4px solid #0284C7;background:#F0F9FF;' : (isAngryBirds ? 'border-left:4px solid #E11D48;background:#FFF1F2;' : (isPaintBanderas ? 'border-left:4px solid #2563EB;background:#EFF6FF;' : (isPaint ? 'border-left:4px solid #16A34A;background:#F0FDF4;' : '')))))))))) + '">' +
                        '<h4 style="' + (isServoJoystick ? 'color:#0F766E;' : (isCanva ? 'color:#0369A1;' : (isScratchJrPerspectiva ? 'color:#581C87;' : (isScratchJrVelocidad ? 'color:#9A3412;' : (isDiaMadre ? 'color:#9F1239;' : (isMinecraft ? 'color:#065F46;' : (isFrozen ? 'color:#0369A1;' : (isAngryBirds ? 'color:#9F1239;' : (isPaintBanderas ? 'color:#1E40AF;' : (isPaint ? 'color:#15803D;' : '')))))))))) + '"><i class="fas ' + (isServoJoystick ? 'fa-gamepad' : (isCanva ? 'fa-wand-magic-sparkles' : (isScratchJrPerspectiva ? 'fa-search-plus' : (isScratchJrVelocidad ? 'fa-tachometer-alt' : (isDiaMadre ? 'fa-heart' : (isMinecraft ? 'fa-cube' : (isFrozen ? 'fa-snowflake' : (isAngryBirds ? 'fa-bullseye' : (isPaintBanderas ? 'fa-flag' : (isPaint ? 'fa-futbol' : 'fa-flag-checkered')))))))))) + '"></i> ' + (isServoJoystick ? 'Reto Robótico: El Arquero Mecánico con Joystick Chico Negro y Servo SG90' : (isCanva ? 'Objetivo: Foto en Aula, Reemplazar Cabeza en Arquero y Animación con IA' : (isScratchJrPerspectiva ? 'Objetivo: Perspectiva 3D y Bloques Violetas' : (isScratchJrVelocidad ? 'Objetivo: Entorno Scratch Jr y Control de Velocidades' : (isDiaMadre ? 'Reto Maker: Corazón 3D y Luz en el Escudo' : (isMinecraft ? 'Reto y Aclaración de Minecraft:' : (isFrozen ? 'Objetivo y Conexión con Paint:' : (isAngryBirds ? 'Objetivo Pedagógico:' : (isPaintBanderas ? 'Reto Artístico: Banderas del Mundial' : '¿Cuál es nuestra misión?'))))))))) + '</h4>' +
                        '<p style="' + (isServoJoystick ? 'color:#134E4A;' : (isCanva ? 'color:#0C4A6E;' : (isScratchJrPerspectiva ? 'color:#6B21A8;' : (isScratchJrVelocidad ? 'color:#7C2D12;' : (isDiaMadre ? 'color:#4C0519;' : (isMinecraft ? 'color:#064E3B;' : (isFrozen ? 'color:#0C4A6E;' : (isAngryBirds ? 'color:#4C0519;' : (isPaintBanderas ? 'color:#1E3A8A;' : (isPaint ? 'color:#14532D;' : '')))))))))) + '">' + (mission.objective || mission.description) + '</p>' +
                        (isMinecraft ? '<div style="margin-top:10px;padding:8px 12px;background:#FEF3C7;border-left:3px solid #D97706;border-radius:6px;font-size:0.8rem;color:#92400E;line-height:1.4;"><strong><i class="fas fa-exclamation-triangle"></i> ¡Aclaración Importante!</strong> No es el Minecraft comercial tradicional de juego libre: es una adaptación pedagógica oficial de Code.org para aprender a programar con bloques.</div>' : '') +
                      '</div>' +
                      '<div class="apm-skills-pills">' +
                        (isServoJoystick ?
                          '<span class="apm-skill-pill" style="background:#CCFBF1;color:#0F766E;"><i class="fas fa-gamepad"></i> Joystick Chico Negro (P1)</span>' +
                          '<span class="apm-skill-pill" style="background:#CCFBF1;color:#0F766E;"><i class="fas fa-calculator"></i> Ajuste de Intervalo (Math.map)</span>' +
                          '<span class="apm-skill-pill" style="background:#CCFBF1;color:#0F766E;"><i class="fas fa-cog"></i> Servo del Arquero (Pin P0)</span>' +
                          '<span class="apm-skill-pill" style="background:#CCFBF1;color:#0F766E;"><i class="fas fa-futbol"></i> Arco & Atajadas Físicas</span>' :
                         isScratchJrPerspectiva ?
                          '<span class="apm-skill-pill" style="background:#F3E8FF;color:#6B21A8;"><i class="fas fa-search-plus"></i> Perspectiva 3D en 2D</span>' +
                          '<span class="apm-skill-pill" style="background:#F3E8FF;color:#6B21A8;"><i class="fas fa-arrows-alt-v"></i> Profundidad en el Sendero</span>' +
                          '<span class="apm-skill-pill" style="background:#F3E8FF;color:#6B21A8;"><i class="fas fa-expand-arrows-alt"></i> Bloques Violetas</span>' +
                          '<span class="apm-skill-pill" style="background:#F3E8FF;color:#6B21A8;"><i class="fas fa-cat"></i> Personajes Scratch Jr</span>' :
                         isScratchJrVelocidad ?
                          '<span class="apm-skill-pill" style="background:#FFEDD5;color:#C2410C;"><i class="fas fa-cat"></i> Ambiente Scratch Jr</span>' +
                          '<span class="apm-skill-pill" style="background:#FFEDD5;color:#C2410C;"><i class="fas fa-tachometer-alt"></i> Control de Velocidades</span>' +
                          '<span class="apm-skill-pill" style="background:#FFEDD5;color:#C2410C;"><i class="fas fa-image"></i> Escenarios y Fondos</span>' +
                          '<span class="apm-skill-pill" style="background:#FFEDD5;color:#C2410C;"><i class="fas fa-play"></i> Bloques de Movimiento</span>' :
                         isDiaMadre ?
                          '<span class="apm-skill-pill" style="background:#FFE4E6;color:#9F1239;"><i class="fas fa-heart"></i> Corazón Pop-Up 3D</span>' +
                          '<span class="apm-skill-pill" style="background:#FFE4E6;color:#9F1239;"><i class="fas fa-shield-alt"></i> Botón Escudo Freire</span>' +
                          '<span class="apm-skill-pill" style="background:#FFE4E6;color:#9F1239;"><i class="fas fa-microchip"></i> Circuito Papertronics</span>' +
                          '<span class="apm-skill-pill" style="background:#FFE4E6;color:#9F1239;"><i class="fas fa-portrait"></i> Foto del Niño/a</span>' :
                         isMinecraft ?
                          '<span class="apm-skill-pill" style="background:#D1FAE5;color:#065F46;"><i class="fas fa-cube"></i> Adaptación Code.org</span>' +
                          '<span class="apm-skill-pill" style="background:#D1FAE5;color:#065F46;"><i class="fas fa-laptop-code"></i> Programar a Steve y Alex</span>' +
                          '<span class="apm-skill-pill" style="background:#D1FAE5;color:#065F46;"><i class="fas fa-arrows-alt"></i> Cuadrícula 3D</span>' +
                          '<span class="apm-skill-pill" style="background:#D1FAE5;color:#065F46;"><i class="fas fa-sync-alt"></i> Bucles de Repetición</span>' :
                         isFrozen ?
                          '<span class="apm-skill-pill" style="background:#E0F2FE;color:#0369A1;"><i class="fas fa-snowflake"></i> Geometría en el Hielo</span>' +
                          '<span class="apm-skill-pill" style="background:#E0F2FE;color:#0369A1;"><i class="fas fa-shapes"></i> De Paint al Código</span>' +
                          '<span class="apm-skill-pill" style="background:#E0F2FE;color:#0369A1;"><i class="fas fa-redo"></i> Giros de 90°</span>' +
                          '<span class="apm-skill-pill" style="background:#E0F2FE;color:#0369A1;"><i class="fas fa-sync-alt"></i> Bucles (Repetir)</span>' :
                         isAngryBirds ?
                          '<span class="apm-skill-pill"><i class="fas fa-puzzle-piece"></i> Primeros Pasos en Programación</span>' +
                          '<span class="apm-skill-pill"><i class="fas fa-brain"></i> Razonamiento Lógico</span>' +
                          '<span class="apm-skill-pill"><i class="fas fa-compass"></i> Lateralidad & Orientación</span>' +
                          '<span class="apm-skill-pill"><i class="fas fa-bug"></i> Descomposición y Depuración</span>' :
                         isPaintBanderas ?
                          '<span class="apm-skill-pill" style="background:#DBEAFE;color:#1E40AF;"><i class="fas fa-flag"></i> Banderas del Mundial</span>' +
                          '<span class="apm-skill-pill" style="background:#DBEAFE;color:#1E40AF;"><i class="fas fa-vector-square"></i> Franjas y Proporciones</span>' +
                          '<span class="apm-skill-pill" style="background:#DBEAFE;color:#1E40AF;"><i class="fas fa-circle"></i> Soles y Símbolos</span>' +
                          '<span class="apm-skill-pill" style="background:#DBEAFE;color:#1E40AF;"><i class="fas fa-fill-drip"></i> Bote de Pintura</span>' :
                         isPaintCancha ?
                          '<span class="apm-skill-pill"><i class="fas fa-palette"></i> Dibujo en Paint</span>' +
                          '<span class="apm-skill-pill"><i class="fas fa-shapes"></i> Figuras Geométricas</span>' +
                          '<span class="apm-skill-pill"><i class="fas fa-mouse-pointer"></i> Precisión con Mouse</span>' +
                          '<span class="apm-skill-pill"><i class="fas fa-futbol"></i> Cancha de Fútbol</span>' :
                         isElectronica ?
                          '<span class="apm-skill-pill"><i class="fas fa-bolt"></i> Circuito Físico</span>' +
                          '<span class="apm-skill-pill"><i class="fas fa-battery-full"></i> Polaridad y Energía</span>' +
                          '<span class="apm-skill-pill"><i class="fas fa-tools"></i> Sin Programación</span>' :
                          '<span class="apm-skill-pill"><i class="fas fa-lightbulb"></i> Creatividad Maker</span>' +
                          '<span class="apm-skill-pill"><i class="fas fa-cubes"></i> Lógica en Bloques</span>' +
                          '<span class="apm-skill-pill"><i class="fas fa-robot"></i> Pensamiento Computacional</span>'
                        ) +
                      '</div>' +
                      '<button type="button" class="arm-btn-primary apm-next-btn-internal" style="margin-top:18px;font-size:0.9rem;padding:9px 18px;' + (isServoJoystick ? 'background:#0D9488;border-color:#0F766E;' : (isCanva ? 'background:#0284C7;border-color:#0369A1;' : (isScratchJrPerspectiva ? 'background:#7C3AED;border-color:#6D28D9;' : (isScratchJrVelocidad ? 'background:#EA580C;border-color:#C2410C;' : (isDiaMadre ? 'background:#E11D48;border-color:#BE123C;' : (isMinecraft ? 'background:#059669;border-color:#047857;' : (isFrozen ? 'background:#0284C7;border-color:#0369A1;' : (isAngryBirds ? 'background:#E11D48;border-color:#BE123C;' : (isPaintBanderas ? 'background:#2563EB;border-color:#1D4ED8;' : (isPaint ? 'background:#16A34A;border-color:#15803D;' : (isElectronica ? 'background:#D97706;border-color:#B45309;' : ''))))))))))) + '">' +
                        (isServoJoystick ? 'Ver Componentes y Ajuste Matemático <i class="fas fa-arrow-right"></i>' : (isCanva ? 'Ver Recursos y Herramientas de Canva <i class="fas fa-arrow-right"></i>' : (isScratchJrPerspectiva ? 'Ver Materiales y Bloques Violetas <i class="fas fa-arrow-right"></i>' : (isScratchJrVelocidad ? 'Ver Herramientas y Bloques <i class="fas fa-arrow-right"></i>' : (isDiaMadre ? 'Ver Materiales y Componentes <i class="fas fa-arrow-right"></i>' : (isMinecraft ? 'Ver Beneficios y ¿Por qué Code.org Minecraft? <i class="fas fa-arrow-right"></i>' : (isFrozen ? 'Ver Beneficios y Conexión con Paint <i class="fas fa-arrow-right"></i>' : (isAngryBirds ? 'Ver Beneficios del Razonamiento <i class="fas fa-arrow-right"></i>' : (isPaintBanderas ? 'Ver Herramientas de Paint para Banderas <i class="fas fa-arrow-right"></i>' : (isPaint ? 'Ver Herramientas de Paint <i class="fas fa-arrow-right"></i>' : 'Ver Materiales y Componentes <i class="fas fa-arrow-right"></i>')))))))))) +
                      '</button>' +
                    '</div>' +
                  '</div>' +
                '</div>' +

                // SLIDE 1: Materiales & Beneficios
                '<div class="apm-slide-page" data-slide-idx="1">' +
                  (isMinecraft ?
                    '<div style="max-width:850px;margin:0 auto;">' +
                      '<div style="text-align:center;margin-bottom:20px;">' +
                        '<h3 style="font-size:1.35rem;font-weight:900;color:#1E293B;margin:0 0 6px;">' +
                          '⛏️ ¿Por qué Code.org Minecraft? De Jugador a Creador de Código' +
                        '</h3>' +
                        '<p style="font-size:0.88rem;color:#64748B;margin:0;">' +
                          'En el juego tradicional solo explorás o construís con teclas. En <strong><a href="https://studio.code.org/s/mc/lessons/1/levels/1" target="_blank" style="color:#059669;text-decoration:underline;">Code.org Minecraft</a></strong>, ¡Steve y Alex se mueven ÚNICAMENTE cuando programás secuencias de bloques y bucles!' +
                        '</p>' +
                      '</div>' +
                      '<div class="apm-materials-grid">' +
                        '<div class="apm-mat-card" style="border-left:3.5px solid #059669;">' +
                          '<div class="apm-mat-icon" style="color:#059669;"><i class="fas fa-laptop-code"></i></div>' +
                          '<div class="apm-mat-info">' +
                            '<h5>1. De Jugador Pasivo a Programador Activo</h5>' +
                            '<p>En lugar de mover al personaje con el teclado o joystick en tiempo real, acá tenés que <strong>planificar una secuencia de órdenes precisas</strong> (avanzar, girar, talar o colocar bloques) antes de ejecutar.</p>' +
                          '</div>' +
                        '</div>' +
                        '<div class="apm-mat-card" style="border-left:3.5px solid #2563EB;">' +
                          '<div class="apm-mat-icon" style="color:#2563EB;"><i class="fas fa-cubes"></i></div>' +
                          '<div class="apm-mat-info">' +
                            '<h5>2. Orientación Espacial en Cuadrícula 3D</h5>' +
                            '<p>El mundo de Minecraft está formado por cubos y bloques. Los niños aprenden a <strong>calcular distancias exactas</strong> y giros de 90° para posicionar a Alex o Steve frente al recurso adecuado.</p>' +
                          '</div>' +
                        '</div>' +
                        '<div class="apm-mat-card" style="border-left:3.5px solid #D97706;">' +
                          '<div class="apm-mat-icon" style="color:#D97706;"><i class="fas fa-sync-alt"></i></div>' +
                          '<div class="apm-mat-info">' +
                            '<h5>3. Bucles y Automatización (Repetir)</h5>' +
                            '<p>Descubrir la potencia del bloque <code>repetir X veces</code> o <code>repetir hasta meta</code>. Talar 3 árboles o trasquilar ovejas sin repetir bloques innecesarios.</p>' +
                          '</div>' +
                        '</div>' +
                        '<div class="apm-mat-card" style="border-left:3.5px solid #10B981;">' +
                          '<div class="apm-mat-icon" style="color:#10B981;"><i class="fas fa-shield-alt"></i></div>' +
                          '<div class="apm-mat-info">' +
                            '<h5>4. Adaptación 100% Pedagógica y Segura</h5>' +
                            '<p>Desarrollada oficialmente por Code.org junto a Mojang / Microsoft con entornos guiados paso a paso sin chats, monstruos invasivos ni distracciones de supervivencia.</p>' +
                          '</div>' +
                        '</div>' +
                      '</div>' +
                      '<div class="apm-reto-card" style="margin-top:20px;background:#ECFDF5;border-color:#A7F3D0;">' +
                        '<h4 style="color:#065F46;"><i class="fas fa-cube"></i> Actividad Oficial: Code.org Minecraft (Hora del Código)</h4>' +
                        '<p style="color:#064E3B;margin:0 0 10px;">Plataforma mundial de iniciación a la ciencia de la computación adaptada para niñas y niños de 5 años.</p>' +
                        '<a href="https://studio.code.org/s/mc/lessons/1/levels/1" target="_blank" rel="noopener noreferrer" class="arm-btn-primary" style="background:#059669;border-color:#047857;display:inline-flex;align-items:center;gap:8px;padding:8px 18px;font-size:0.86rem;color:#FFF;text-decoration:none;">' +
                          '<i class="fas fa-play"></i> Abrir studio.code.org/s/mc en el navegador' +
                        '</a>' +
                      '</div>' +
                      '<div style="text-align:center;margin-top:20px;">' +
                        '<button type="button" class="arm-btn-primary apm-next-btn-internal" style="font-size:0.9rem;padding:9px 18px;background:#059669;border-color:#047857;">' +
                          '¡Ir al Desafío Interactivo de Minecraft! <i class="fas fa-arrow-right"></i>' +
                        '</button>' +
                      '</div>' +
                    '</div>' :
                   isFrozen ?
                    '<div style="max-width:850px;margin:0 auto;">' +
                      '<div style="text-align:center;margin-bottom:20px;">' +
                        '<h3 style="font-size:1.35rem;font-weight:900;color:#1E293B;margin:0 0 6px;">' +
                          '❄️ ¿Por qué Ana y Elsa? De Paint a la Programación Geométrica' +
                        '</h3>' +
                        '<p style="font-size:0.88rem;color:#64748B;margin:0;">' +
                          'En el Nivel 4 dibujamos con el mouse en Paint. ¡Ahora en <strong><a href="https://studio.code.org/s/frozen/lessons/1/levels/1" target="_blank" style="color:#0284C7;text-decoration:underline;">Code.org Frozen</a></strong> programamos a las patinadoras para que tracen figuras geométricas con código!' +
                        '</p>' +
                      '</div>' +
                      '<div class="apm-materials-grid">' +
                        '<div class="apm-mat-card" style="border-left:3.5px solid #0284C7;">' +
                          '<div class="apm-mat-icon" style="color:#0284C7;"><i class="fas fa-shapes"></i></div>' +
                          '<div class="apm-mat-info">' +
                            '<h5>1. De Paint a la Programación (Conexión)</h5>' +
                            '<p>En Paint trazabas líneas y rectángulos arrastrando el mouse. Acá aprendés a <strong>dar órdenes precisas</strong> (avanzar píxeles y girar) para que la computadora dibuje la figura sola.</p>' +
                          '</div>' +
                        '</div>' +
                        '<div class="apm-mat-card" style="border-left:3.5px solid #2563EB;">' +
                          '<div class="apm-mat-icon" style="color:#2563EB;"><i class="fas fa-redo"></i></div>' +
                          '<div class="apm-mat-info">' +
                            '<h5>2. Ángulos Rectos y Giros (90°)</h5>' +
                            '<p>Comprender cómo se forman las esquinas de un cuadrado o un rectángulo: un trazo recto hacia adelante y un giro perfecto de 90° hacia la derecha o izquierda.</p>' +
                          '</div>' +
                        '</div>' +
                        '<div class="apm-mat-card" style="border-left:3.5px solid #10B981;">' +
                          '<div class="apm-mat-icon" style="color:#10B981;"><i class="fas fa-sync-alt"></i></div>' +
                          '<div class="apm-mat-info">' +
                            '<h5>3. Introducción a Bucles (Repetir)</h5>' +
                            '<p>En lugar de poner 8 bloques repetidos, descubrimos la magia de <code>repetir 4 veces</code>. Es el primer paso hacia la automatización y eficiencia de los programadores.</p>' +
                          '</div>' +
                        '</div>' +
                        '<div class="apm-mat-card" style="border-left:3.5px solid #7C3AED;">' +
                          '<div class="apm-mat-icon" style="color:#7C3AED;"><i class="fas fa-snowflake"></i></div>' +
                          '<div class="apm-mat-info">' +
                            '<h5>4. Creatividad Matemática en el Hielo</h5>' +
                            '<p>Combinar giros y repeticiones para transformar simples líneas en flores de hielo, estrellas y copos de nieve mientras Elsa y Ana patinan.</p>' +
                          '</div>' +
                        '</div>' +
                      '</div>' +
                      '<div class="apm-reto-card" style="margin-top:20px;background:#F0F9FF;border-color:#BAE6FD;">' +
                        '<h4 style="color:#0369A1;"><i class="fas fa-snowflake"></i> Actividad Oficial: Code.org Frozen (Arte en el Hielo)</h4>' +
                        '<p style="color:#0C4A6E;margin:0 0 10px;">Plataforma mundial adaptada para niñas y niños de 5 años para explorar arte geométrico y algoritmos.</p>' +
                        '<a href="https://studio.code.org/s/frozen/lessons/1/levels/1" target="_blank" rel="noopener noreferrer" class="arm-btn-primary" style="background:#0284C7;border-color:#0369A1;display:inline-flex;align-items:center;gap:8px;padding:8px 18px;font-size:0.86rem;color:#FFF;text-decoration:none;">' +
                          '<i class="fas fa-play"></i> Abrir studio.code.org/s/frozen en el navegador' +
                        '</a>' +
                      '</div>' +
                      '<div style="text-align:center;margin-top:20px;">' +
                        '<button type="button" class="arm-btn-primary apm-next-btn-internal" style="font-size:0.9rem;padding:9px 18px;background:#0284C7;border-color:#0369A1;">' +
                          '¡Ir al Desafío Interactivo de Ana y Elsa! <i class="fas fa-arrow-right"></i>' +
                        '</button>' +
                      '</div>' +
                    '</div>' :
                   isAngryBirds ?
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
                          (isServoJoystick ? '🕹️ Componentes y Fórmula de Mapeo: Arquero Mecánico, Joystick y Servo' : (isCanva ? '🤖 Materiales y Herramientas: Canva & Inteligencia Artificial' : (isMarcalibro ? '📖 Materiales para el Marca-Libros Origami de Tom Sawyer' : (isScratchJrPerspectiva ? '🐱 Materiales y Bloques de Perspectiva (Scratch Jr)' : (isScratchJrVelocidad ? '🐱 Materiales y Bloques de Scratch Jr' : (isDiaMadre ? '💖 Materiales y Plantillas para la Tarjeta 3D Pop-Up' : (isPaint ? (isPaintBanderas ? '🎨 Herramientas de Paint para Dibujar Banderas' : '🎨 Herramientas y Figuras de Paint') : (isElectronica ? '⚡ Componentes y Materiales del Circuito' : '🔌 Materiales y Herramientas del Taller')))))))) +
                        '</h3>' +
                        '<p style="font-size:0.88rem;color:#64748B;margin:0;">' +
                          (isServoJoystick ? 'Asegurate de tener tu micro:bit v2, el joystick chico negro conectado a P1 y el servo SG90 con el arquero en P0:' : (isCanva ? 'Asegurate de tener abierta la plataforma Canva en tu tablet o PC y tener lista la cámara o foto del taller:' : (isMarcalibro ? 'Asegurate de tener tu papel glacé, el dibujo de Tom Sawyer con su sombrero, cinta de cobre, pila botón y LED chato:' : (isScratchJrPerspectiva ? 'Asegurate de tener abierta la aplicación Scratch Jr o descargá el archivo perpestiva.sjr de ejemplo:' : (isScratchJrVelocidad ? 'Asegurate de tener abierta la aplicación Scratch Jr o descargá el archivo velocidad.sjr de ejemplo:' : (isDiaMadre ? 'Asegurate de tener tu lámina con el corazón, tijera, foto de tu peque y los componentes electrónicos:' : (isPaint ? (isPaintBanderas ? 'Asegurate de tener abierta la aplicación Paint en tu computadora o tablet para comenzar a crear las banderas del mundial:' : 'Asegurate de tener abierta la aplicación Paint en tu computadora o tablet para comenzar:') : (isElectronica ? 'Asegurate de tener todos los elementos listos sobre tu mesa antes de armar:' : 'Asegurate de tener todo listo antes de comenzar a programar o armar:')))))))) +
                        '</p>' +
                      '</div>' +
                      '<div class="apm-materials-grid">' +
                        materialsList.map(function(m){
                          var mIcon = isServoJoystick ? (
                            /joystick|palanca/i.test(m.title) ? 'fa-gamepad' :
                            /servo|motor|sg90/i.test(m.title) ? 'fa-cog' :
                            /micro:?bit/i.test(m.title) ? 'fa-microchip' :
                            /shield|expansi[oó]n/i.test(m.title) ? 'fa-th-large' :
                            /cable|dupont/i.test(m.title) ? 'fa-project-diagram' :
                            /makecode|bloque|ajuste|matem[aá]tic|mapeo/i.test(m.title) ? 'fa-calculator' : 'fa-tools'
                          ) : isMarcalibro ? (
                            /papel|glac[eé]|cuadrado/i.test(m.title) ? 'fa-square' :
                            /origami|plegado|marca/i.test(m.title) ? 'fa-bookmark' :
                            /tom sawyer|gorro|sombrero|dibujo/i.test(m.title) ? 'fa-user' :
                            /led|chato|smd|luz/i.test(m.title) ? 'fa-lightbulb' :
                            /pila|bater[ií]a|cr2032/i.test(m.title) ? 'fa-battery-full' :
                            /cobre|cinta/i.test(m.title) ? 'fa-tape' :
                            /tijer|pegamento/i.test(m.title) ? 'fa-cut' : 'fa-tools'
                          ) : isScratchJrPerspectiva ? (
                            /perspectiva|apariencia|achicar|agrandar/i.test(m.title) ? 'fa-expand-arrows-alt' :
                            /inicio|home/i.test(m.title) ? 'fa-home' :
                            /restaurar|reset/i.test(m.title) ? 'fa-sync-alt' :
                            /bandera/i.test(m.title) ? 'fa-flag' :
                            /archivo|ejemplo|\.sjr/i.test(m.title) ? 'fa-file-code' :
                            /sendero|camino|escenario|fondo/i.test(m.title) ? 'fa-image' :
                            /desplazamiento|abajo|pasos/i.test(m.title) ? 'fa-arrow-down' :
                            /scratch|app/i.test(m.title) ? 'fa-cat' : 'fa-puzzle-piece'
                          ) : isScratchJrVelocidad ? (
                            /scratch|app|lienzo/i.test(m.title) ? 'fa-cat' :
                            /archivo|ejemplo|\.sjr/i.test(m.title) ? 'fa-file-code' :
                            /bandera/i.test(m.title) ? 'fa-flag' :
                            /velocidad|ritmo/i.test(m.title) ? 'fa-tachometer-alt' :
                            /movimiento|flecha/i.test(m.title) ? 'fa-arrows-alt-h' : 'fa-puzzle-piece'
                          ) : isDiaMadre ? (
                            /plantilla|hoja|l[aá]mina/i.test(m.title) ? 'fa-file-alt' :
                            /circuito|papertronics/i.test(m.title) ? 'fa-microchip' :
                            /foto|retrato/i.test(m.title) ? 'fa-portrait' :
                            /led|luz/i.test(m.title) ? 'fa-lightbulb' :
                            /pila|bater/i.test(m.title) ? 'fa-battery-full' :
                            /cobre|cinta/i.test(m.title) ? 'fa-tape' :
                            /escudo|bot[oó]n|pulsador/i.test(m.title) ? 'fa-shield-alt' :
                            /tijer|pegamento/i.test(m.title) ? 'fa-cut' : 'fa-tools'
                          ) : isPaint ? (
                            /rect[aá]ngulo|franja|figura|geometr/i.test(m.title) ? 'fa-vector-square' :
                            /c[ií]rculo|centro|sol|elipse/i.test(m.title) ? 'fa-circle' :
                            /estrella|pol[ií]gono/i.test(m.title) ? 'fa-star' :
                            /l[ií]nea|recta/i.test(m.title) ? 'fa-slash' :
                            /bote|balde|relleno|color|pintura/i.test(m.title) ? 'fa-fill-drip' :
                            /mouse|puntero|rat[oó]n/i.test(m.title) ? 'fa-mouse-pointer' :
                            /paint|lienzo|dibujo/i.test(m.title) ? 'fa-palette' : 'fa-shapes'
                          ) : isElectronica ? (
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
                      '<div class="apm-reto-card" style="margin-top:22px;' + (isServoJoystick ? 'background:#F0FDFA;border-color:#99F6E4;' : (isCanva ? 'background:#F0F9FF;border-color:#BAE6FD;' : (isMarcalibro ? 'background:#FFFBEB;border-color:#FCD34D;' : (isScratchJrPerspectiva ? 'background:#FAF5FF;border-color:#D8B4FE;' : (isScratchJrVelocidad ? 'background:#FFF7ED;border-color:#FDBA74;' : (isDiaMadre ? 'background:#FFF1F2;border-color:#FDA4AF;' : (isPaintBanderas ? 'background:#EFF6FF;border-color:#2563EB;' : (isPaint ? 'background:#F0FDF4;border-color:#16A34A;' : '')))))))) + '">' +
                        '<h4 style="' + (isServoJoystick ? 'color:#0F766E;' : (isCanva ? 'color:#0369A1;' : (isMarcalibro ? 'color:#92400E;' : (isScratchJrPerspectiva ? 'color:#581C87;' : (isScratchJrVelocidad ? 'color:#9A3412;' : (isDiaMadre ? 'color:#9F1239;' : (isPaintBanderas ? 'color:#1E40AF;' : (isPaint ? 'color:#15803D;' : (isElectronica ? 'color:#B45309;' : ''))))))))) + '"><i class="fas fa-lightbulb"></i> ' + (isServoJoystick ? 'Consejo de Robótica: El Secreto del Ajuste de Intervalo (Mapeo)' : (isCanva ? 'Consejo de Edición e Inteligencia Artificial' : (isMarcalibro ? 'Consejo Origami Maker: Bolsillo Esquinero y Luz en el Sombrero' : (isScratchJrPerspectiva ? 'Consejo del Programador: Bloques Violetas de Perspectiva' : (isScratchJrVelocidad ? 'Consejo del Programador: Bloque de Velocidad' : (isDiaMadre ? 'Consejo Maker: Pop-Up 3D y Escudo Freire' : (isPaint ? (isPaintBanderas ? 'Consejo del Diseñador de Banderas' : 'Consejo del Artista Digital') : (isElectronica ? 'Consejo de Polaridad' : 'Consejo del Profesor Maker')))))))) + '</h4>' +
                        '<p style="' + (isServoJoystick ? 'color:#134E4A;' : (isMarcalibro ? 'color:#78350F;' : (isScratchJrPerspectiva ? 'color:#6B21A8;' : (isScratchJrVelocidad ? 'color:#7C2D12;' : (isDiaMadre ? 'color:#4C0519;' : (isPaintBanderas ? 'color:#1E3A8A;' : (isPaint ? 'color:#166534;' : ''))))))) + '">' +
                          (isServoJoystick ? '¡El secreto del ajuste de intervalo para el arquero! La palanca del joystick chico negro entrega números continuos entre 0 y 1023 en el Pin P1. El servomotor SG90 en el Pin P0 solo puede rotar entre 0° y 180° para mover al arquero entre los postes. Con el bloque matemático <strong>Math.map(x, 0, 1023, 0, 180)</strong> y los límites de seguridad (si angulo < 0 ➔ 0; si angulo > 180 ➔ 180), logramos que al soltar la palanca el arquero quede al centro (90°), y al inclinarla vuele a los postes sin chocar ni trabarse.' :
                           isCanva ? '¡El secreto del fotomontaje y la animación con IA! Al tomarte la foto, hacelo en primer plano de tu cabeza con buena iluminación. El Quitafondos IA de Canva aislará tu rostro con gran precisión. Luego, buscá una imagen de un arquero en plena atajada y colocá tu cabeza sobre la suya, rotándola para acompañar el ángulo del cuerpo. ¡Al aplicar Magic Animate, la IA pondrá en movimiento toda la escena transformándola en un video espectacular!' :
                           isMarcalibro ? '¡El secreto del doblado y la luz en el sombrero de Tom Sawyer! Doblá con paciencia el papel glacé marcando bien cada pliegue con la yema de los dedos para que las dos puntas encajen firmes en el bolsillo esquinero. Pegá a Tom Sawyer en el frente alineando el LED chato en el medio de su sombrero de paja. Al calzarlo en una página o apretar la punta, las pistas de cobre harán contacto y el sombrero brillará.' :
                           isScratchJrPerspectiva ? '¡El secreto de la perspectiva 3D! Al tocar la <strong>Bandera Verde</strong>, colocá primero <strong>Inicio 🏠</strong> y <strong>Restaurar Tamaño 🔄</strong>. Luego <strong>Achicar 5 ➖</strong> para que Teen3 empiece chiquito en el horizonte del camino. A medida que agregás <strong>Bajar ⬇️</strong>, encastrá <strong>Agrandar 2 ➕</strong> para que crezca simulando que camina hacia el frente. ¡Probalo en perpestiva.sjr!' :
                           isScratchJrVelocidad ? '¡El secreto de la carrera a diferentes velocidades! Encastrá la <strong>Bandera Verde</strong> de inicio, luego el <strong>bloque naranja de Velocidad</strong> (tocalo para elegir 1 caracol, 2 caminante o 3 corredor) y por último la <strong>flecha azul de movimiento</strong>. ¡Al pulsar la bandera verde, todos los personajes arrancan juntos pero el más veloz llega primero!' :
                           isDiaMadre ? '¡El secreto del Pop-Up y la Luz! Cortá con tijera <strong>únicamente por las líneas continuas</strong> de los escalones del corazón pixelado (nunca cortes las líneas de puntos, esas son para doblar hacia adelante). Pegá tu foto en el centro exacto. Y asegurate de que la cinta de cobre detrás del <strong>escudo del Colegio Paulo Freire</strong> baje en solapa para tocar la pista de la pila al presionar con el dedo.' :
                           isPaint ? (isPaintBanderas ? '¡El secreto de las franjas parejas y los soles! Usá <strong>Rectángulo</strong> para el marco de la bandera, <strong>Líneas</strong> rectas con la tecla <strong>Shift</strong> para dividir las franjas iguales y <strong>Elipse con Shift</strong> para el sol amarillo. ¡Con <strong>Ctrl + Z</strong> corregís cualquier trazo sin borrar todo!' : '¡El secreto de los círculos perfectos! Mantené presionada la tecla <strong>Shift (Mayús)</strong> mientras arrastrás el mouse con la herramienta Elipse para que salga un círculo redondo perfecto en la mitad de la cancha. ¡And si te equivocás, apretá <strong>Ctrl + Z</strong> para deshacer sin borrar todo!') :
                           isElectronica ? '¡Recordá siempre la polaridad! La patita larga del LED es el polo positivo (+) y la corta el negativo (-). La cara lisa con letras de la pila es (+). Si las conectás al revés, no pasará nada malo, pero el LED no encenderá hasta que lo pongas en el sentido correcto.' : 'Antes de transferir o probar el código, pensá la secuencia paso a paso: ¿Qué pasa primero? ¿Qué botón activa la acción? ¡El orden de las instrucciones es la clave!') +
                        '</p>' +
                      '</div>' +
                      '<div style="text-align:center;margin-top:20px;">' +
                        '<button type="button" class="arm-btn-primary apm-next-btn-internal" style="font-size:0.9rem;padding:9px 18px;' + (isServoJoystick ? 'background:#0D9488;border-color:#0F766E;' : (isMarcalibro ? 'background:#D97706;border-color:#B45309;' : (isScratchJrPerspectiva ? 'background:#7C3AED;border-color:#6D28D9;' : (isScratchJrVelocidad ? 'background:#EA580C;border-color:#C2410C;' : (isDiaMadre ? 'background:#E11D48;border-color:#BE123C;' : (isPaintBanderas ? 'background:#2563EB;border-color:#1D4ED8;' : (isPaint ? 'background:#16A34A;border-color:#15803D;' : (isElectronica ? 'background:#D97706;border-color:#B45309;' : '')))))))) + '">' +
                          (isServoJoystick ? '¡Ver Circuito, Código MakeCode y Simulador! <i class="fas fa-arrow-right"></i>' : (isCanva ? '¡Ver Pasos de Creación y Animación con IA! <i class="fas fa-arrow-right"></i>' : (isMarcalibro ? '¡Ver Pasos de Doblado Origami y Circuito! <i class="fas fa-arrow-right"></i>' : (isScratchJrPerspectiva ? '¡Ver Pasos de Programación y Ejemplo perpestiva.sjr! <i class="fas fa-arrow-right"></i>' : (isScratchJrVelocidad ? '¡Ver Pasos de Programación y Ejemplo velocidad.sjr! <i class="fas fa-arrow-right"></i>' : (isDiaMadre ? '¡Ver Pasos de Armado Pop-Up y Circuito! <i class="fas fa-arrow-right"></i>' : (isPaint ? (isPaintBanderas ? '¡Ver Pasos para Dibujar las Banderas! <i class="fas fa-arrow-right"></i>' : '¡Ver Pasos para Dibujar la Cancha! <i class="fas fa-arrow-right"></i>') : (isElectronica ? '¡Ver Instrucciones de Armado Paso a Paso! <i class="fas fa-arrow-right"></i>' : '¡Pasar al Código y Simulador! <i class="fas fa-arrow-right"></i>')))))))) +
                        '</button>' +
                      '</div>' +
                    '</div>'
                  ) +
                '</div>' +

                // SLIDE 2: Instrucciones de Armado (Electrónica) O Desafío Angry Birds (Code.org) O Código y Simulador (MakeCode/Scratch)
                '<div class="apm-slide-page" data-slide-idx="2">' +
                  (isServoJoystick ?
                    '<div style="height:100%;display:flex;flex-direction:column;gap:10px;overflow-y:auto;padding-right:6px;">' +
                      '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">' +
                        '<div>' +
                          '<h3 style="font-size:1.2rem;font-weight:900;color:#1E293B;margin:0 0 2px;"><i class="fas fa-futbol" style="color:#0D9488;"></i> Nivel 2: El Arquero Mecánico — Control con Joystick & Servo 🧤🕹️⚙️</h3>' +
                          '<p style="font-size:0.82rem;color:#64748B;margin:0;">MakeCode micro:bit • Joystick Chico Negro en Pin P1 • Math.map(x, 0, 1023, 0, 180) • Servo Arquero en Pin P0 • Bucle 20 ms</p>' +
                        '</div>' +
                        '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
                          (mission.makecodeUrl ?
                            '<a href="' + mission.makecodeUrl + '" target="_blank" rel="noopener noreferrer" class="arm-btn-primary" style="background:#0D9488;border-color:#0F766E;font-size:0.84rem;padding:7px 16px;text-decoration:none;">' +
                              '<i class="fas fa-external-link-alt"></i> Abrir en MakeCode' +
                            '</a>' : '') +
                          '<button type="button" class="arm-btn-secondary" id="apm-slide-sim-reload" style="font-size:0.84rem;padding:7px 14px;">' +
                            '<i class="fas fa-redo"></i> Reiniciar Simulador' +
                          '</button>' +
                        '</div>' +
                      '</div>' +
                      '<div style="display:flex;gap:14px;align-items:center;background:#F0FDFA;border:1.5px dashed #0D9488;border-radius:14px;padding:12px 16px;margin-bottom:6px;">' +
                        '<img src="img/proyectos/servo_joystick_makecode_cover.svg" alt="El Arquero Mecánico MakeCode" style="width:100px;height:84px;object-fit:cover;background:#0F172A;border-radius:10px;border:1px solid #99F6E4;padding:2px;cursor:pointer;flex-shrink:0;" onclick="window.open(this.src,\'_blank\')" title="Tocar para ampliar esquema">' +
                        '<div style="flex:1;">' +
                          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap;">' +
                            '<span style="background:#CCFBF1;color:#0F766E;font-weight:800;font-size:0.75rem;padding:2px 8px;border-radius:6px;"><i class="fas fa-project-diagram"></i> HARDWARE & PINES</span>' +
                            '<span style="background:#E0E7FF;color:#4338CA;font-weight:800;font-size:0.75rem;padding:2px 8px;border-radius:6px;"><i class="fas fa-calculator"></i> FÓRMULA: Ángulo = (P1 × 180) / 1023</span>' +
                          '</div>' +
                          '<p style="margin:0;font-size:0.81rem;color:#134E4A;line-height:1.45;">' +
                            '<strong>🕹️ Joystick Chico Negro:</strong> VCC ➔ 3V | GND ➔ GND | VRx (Palanca) ➔ <strong>Pin P1</strong> (0..1023)<br>' +
                            '<strong>🧤 Servo del Arquero (SG90):</strong> Marrón ➔ GND | Rojo ➔ 3V | Naranja ➔ <strong>Pin P0</strong> (0° a 180°)<br>' +
                            '<strong>📐 Código MakeCode:</strong> <code style="background:#E6FFFA;color:#0F766E;padding:1px 6px;border-radius:4px;font-weight:bold;">let x = 0; let angulo = 90; pins.servoWritePin(P0, angulo); basic.forever(() => { x = pins.analogReadPin(P1); angulo = Math.map(x, 0, 1023, 0, 180); if (angulo &lt; 0) angulo = 0; if (angulo &gt; 180) angulo = 180; pins.servoWritePin(P0, angulo); basic.pause(20); })</code>' +
                          '</p>' +
                        '</div>' +
                      '</div>' +
                      (mkInfo ?
                        '<div class="apm-sim-slide-wrap" style="height:260px;margin-bottom:8px;">' +
                          '<div class="apm-sim-slide-toolbar" style="background:#0F172A;color:#FFF;padding:6px 14px;border-radius:10px 10px 0 0;display:flex;align-items:center;justify-content:space-between;">' +
                            '<span style="font-size:0.8rem;font-weight:700;"><i class="fas fa-microchip" style="color:#0D9488;"></i> Simulador Interactivo BBC micro:bit & Pines Analógicos</span>' +
                            '<span style="font-size:0.75rem;color:#94A3B8;">Pin P1 ➔ Entrada Joystick Chico Negro | Pin P0 ➔ Servo Arquero</span>' +
                          '</div>' +
                          '<iframe src="' + mkInfo.simUrl + '" class="apm-sim-slide-iframe" style="width:100%;height:220px;border:none;border-radius:0 0 10px 10px;" sandbox="allow-scripts allow-same-origin allow-popups" scrolling="no" frameborder="0"></iframe>' +
                        '</div>' : '') +
                      '<h4 style="font-size:0.95rem;font-weight:900;color:#1E293B;margin:6px 0 2px;"><i class="fas fa-tasks" style="color:#0D9488;"></i> Pasos de Construcción y Programación:</h4>' +
                      '<div class="apm-instructions-steps-grid">' +
                        instructionsList.map(function(st){
                          return '<div class="apm-step-card">' +
                            '<div class="apm-step-badge" style="background:#0D9488;">' + st.step + '</div>' +
                            '<div class="apm-step-body">' +
                              '<h5>' + st.title + '</h5>' +
                              '<p>' + st.desc + '</p>' +
                              (st.tip ? '<div class="apm-step-tip" style="background:#F0FDFA;border-left-color:#0D9488;color:#134E4A;"><i class="fas fa-lightbulb" style="color:#0D9488;"></i> ' + st.tip + '</div>' : '') +
                            '</div>' +
                          '</div>';
                        }).join('') +
                      '</div>' +
                      '<div style="text-align:right;margin-top:12px;">' +
                        '<button type="button" class="arm-btn-primary apm-next-btn-internal" style="background:#0D9488;border-color:#0F766E;">' +
                          '¡Ver Retos Finales y Entrega! <i class="fas fa-arrow-right"></i>' +
                        '</button>' +
                      '</div>' +
                    '</div>' :
                   isCanva ?
                    '<div style="height:100%;display:flex;flex-direction:column;gap:10px;overflow-y:auto;padding-right:6px;">' +
                      '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">' +
                        '<div>' +
                          '<h3 style="font-size:1.2rem;font-weight:900;color:#1E293B;margin:0 0 2px;"><i class="fas fa-wand-magic-sparkles" style="color:#0284C7;"></i> Nivel 1: El Arquero con Inteligencia Artificial en Canva ⚽🧤</h3>' +
                          '<p style="font-size:0.82rem;color:#64748B;margin:0;">Foto en el aula • Aislar cabeza con IA • Reemplazar cabeza en imagen de arquero • Animación con IA (Magic Animate) • Video MP4 / GIF</p>' +
                        '</div>' +
                        '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
                          '<a href="https://www.canva.com/es_419/crear/animaciones/" target="_blank" rel="noopener noreferrer" class="arm-btn-primary" style="background:#0284C7;border-color:#0369A1;font-size:0.84rem;padding:7px 16px;text-decoration:none;">' +
                            '<i class="fas fa-palette"></i> Abrir Canva Animaciones' +
                          '</a>' +
                        '</div>' +
                      '</div>' +
                      '<div style="display:flex;gap:12px;align-items:center;background:#F0F9FF;border:1.5px dashed #0284C7;border-radius:12px;padding:10px 14px;margin-bottom:8px;">' +
                        '<img src="img/proyectos/canva_arquero_ia_cover.svg" alt="Arquero con IA en Canva" style="width:78px;height:68px;object-fit:cover;background:#0F172A;border-radius:8px;border:1px solid #BAE6FD;padding:2px;cursor:pointer;flex-shrink:0;" onclick="window.open(this.src,\'_blank\')" title="Tocar para ampliar portada">' +
                        '<div style="flex:1;">' +
                          '<h5 style="margin:0 0 2px;font-size:0.86rem;color:#0369A1;font-weight:800;"><i class="fas fa-robot"></i> Guía Oficial de Edición y Animación Generativa</h5>' +
                          '<p style="margin:0;font-size:0.79rem;color:#0C4A6E;line-height:1.4;">Sacate una foto en el aula, aislá tu cabeza con el Quitafondos IA de Canva, colocala sobre el cuerpo de un arquero atajando y aplicá <strong>Magic Animate</strong> para que la IA transforme tu fotomontaje en una animación de atajada en video. <span style="font-weight:700;color:#0284C7;">¡Tocá la imagen para ampliar el modelo!</span></p>' +
                        '</div>' +
                      '</div>' +
                      '<div class="apm-instructions-steps-grid">' +
                        instructionsList.map(function(st){
                          return '<div class="apm-step-card">' +
                            '<div class="apm-step-badge" style="background:#0284C7;">' + st.step + '</div>' +
                            '<div class="apm-step-body">' +
                              '<h5>' + st.title + '</h5>' +
                              '<p>' + st.desc + '</p>' +
                              (st.tip ? '<div class="apm-step-tip" style="background:#F0F9FF;border-left-color:#0284C7;color:#0C4A6E;"><i class="fas fa-lightbulb" style="color:#0284C7;"></i> ' + st.tip + '</div>' : '') +
                            '</div>' +
                          '</div>';
                        }).join('') +
                      '</div>' +
                      '<div style="text-align:right;margin-top:10px;">' +
                        '<button type="button" class="arm-btn-primary apm-next-btn-internal" style="background:#0284C7;border-color:#0369A1;">' +
                          '¡Ver Retos Finales y Entrega! <i class="fas fa-arrow-right"></i>' +
                        '</button>' +
                      '</div>' +
                    '</div>' :
                   isScratchJrPerspectiva ?
                    '<div style="height:100%;display:flex;flex-direction:column;gap:12px;overflow-y:auto;padding-right:4px;">' +
                      '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">' +
                        '<div>' +
                          '<h3 style="font-size:1.2rem;font-weight:900;color:#1E293B;margin:0 0 2px;"><i class="fas fa-search-plus" style="color:#7C3AED;"></i> Nivel 10: Escenarios y Manejo de Perspectiva en Scratch Jr</h3>' +
                          '<p style="font-size:0.82rem;color:#64748B;margin:0;">Ejemplo interactivo: <strong>proyectos/perpestiva.sjr</strong> | Plataforma: <strong>https://codejr.org</strong></p>' +
                        '</div>' +
                        '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
                          '<a href="' + (mission.projectFileUrl || 'proyectos/perpestiva.sjr') + '" download="perpestiva.sjr" class="arm-btn-primary" style="background:#7C3AED;border-color:#6D28D9;font-size:0.84rem;padding:7px 16px;text-decoration:none;">' +
                            '<i class="fas fa-download"></i> Descargar perpestiva.sjr' +
                          '</a>' +
                          '<a href="https://codejr.org" target="_blank" rel="noopener noreferrer" class="arm-btn-secondary" style="font-size:0.84rem;padding:7px 14px;text-decoration:none;">' +
                            '<i class="fas fa-external-link-alt"></i> Abrir Scratch Jr' +
                          '</a>' +
                        '</div>' +
                      '</div>' +
                      '<div class="codeorg-challenge-hero-card" style="border-left:4px solid #7C3AED;">' +
                        '<div class="chc-left">' +
                          '<img src="img/scratchjr.png" alt="Scratch Jr Perspectiva" class="chc-img" onerror="this.src=\'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=400&q=80\'">' +
                        '</div>' +
                        '<div class="chc-right">' +
                          '<span class="chc-tag" style="background:#F3E8FF;color:#6B21A8;"><i class="fas fa-cat"></i> Misión Nivel 10 • Scratch Jr</span>' +
                          '<h4>Crea profundidad 3D cambiando la escala de los personajes</h4>' +
                          '<p>En Scratch Jr, podemos simular que un personaje camina desde el fondo hacia nosotros combinando la <strong>Bandera Verde</strong>, el bloque <strong>Restaurar Tamaño</strong>, <strong>Achicar</strong> y secuencias de <strong>Bajar + Agrandar</strong>.</p>' +
                          '<div class="chc-blocks-preview" style="gap:4px;flex-wrap:wrap;">' +
                            '<span class="cbp-block run" style="background:#FBBF24;border-color:#D97706;color:#78350F;"><i class="fas fa-flag"></i> bandera</span>' +
                            '<span class="cbp-arrow">➔</span>' +
                            '<span class="cbp-block move" style="background:#2563EB;border-color:#1D4ED8;color:#FFF;"><i class="fas fa-home"></i> inicio</span>' +
                            '<span class="cbp-arrow">➔</span>' +
                            '<span class="cbp-block move" style="background:#7C3AED;border-color:#6D28D9;color:#FFF;"><i class="fas fa-sync-alt"></i> restaurar</span>' +
                            '<span class="cbp-arrow">➔</span>' +
                            '<span class="cbp-block move" style="background:#7C3AED;border-color:#6D28D9;color:#FFF;"><i class="fas fa-compress-alt"></i> achicar (5)</span>' +
                            '<span class="cbp-arrow">➔</span>' +
                            '<span class="cbp-block move" style="background:#2563EB;border-color:#1D4ED8;color:#FFF;"><i class="fas fa-arrow-down"></i> bajar + crecer</span>' +
                          '</div>' +
                          '<div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;">' +
                            '<a href="' + (mission.projectFileUrl || 'proyectos/perpestiva.sjr') + '" download="perpestiva.sjr" class="arm-btn-primary" style="background:#7C3AED;border-color:#6D28D9;font-size:0.92rem;padding:9px 20px;text-decoration:none;">' +
                              '<i class="fas fa-download"></i> Descargar Archivo Ejemplo: perpestiva.sjr' +
                            '</a>' +
                          '</div>' +
                        '</div>' +
                      '</div>' +
                      '<div class="apm-tb-grid" style="margin-top:8px;">' +
                        '<div class="apm-tb-item" style="border-left:3px solid #7C3AED;">' +
                          '<h6>Paso 1: Escenario con Sendero o Bosque</h6>' +
                          '<p>Elegí un fondo donde haya un camino o perspectiva (por ejemplo el sendero en el bosque).</p>' +
                        '</div>' +
                        '<div class="apm-tb-item" style="border-left:3px solid #2563EB;">' +
                          '<h6>Paso 2: Colocar el Personaje en el Horizonte</h6>' +
                          '<p>Ubicá al personaje arriba al inicio del camino y programá <code>Ir a Casa</code> para fijar su posición.</p>' +
                        '</div>' +
                        '<div class="apm-tb-item" style="border-left:3px solid #9333EA;">' +
                          '<h6>Paso 3: Achicar al Fondo</h6>' +
                          '<p>Encastrá <code>Restaurar Tamaño</code> y luego el bloque violeta de <code>Achicar (5)</code> para que se vea lejano.</p>' +
                        '</div>' +
                        '<div class="apm-tb-item" style="border-left:3px solid #10B981;">' +
                          '<h6>Paso 4: Bajar y Crecer hacia Adelante</h6>' +
                          '<p>Combiná <code>Bajar (2)</code> con <code>Agrandar (2)</code> repetidamente para que crezca al acercarse.</p>' +
                        '</div>' +
                      '</div>' +
                      '<div style="text-align:right;margin-top:8px;">' +
                        '<button type="button" class="arm-btn-primary apm-next-btn-internal" style="background:#7C3AED;border-color:#6D28D9;">' +
                          '¡Ver Misión Cumplida y Consejos! <i class="fas fa-arrow-right"></i>' +
                        '</button>' +
                      '</div>' +
                    '</div>' :
                   isScratchJrVelocidad ?
                    '<div style="height:100%;display:flex;flex-direction:column;gap:12px;overflow-y:auto;padding-right:4px;">' +
                      '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">' +
                        '<div>' +
                          '<h3 style="font-size:1.2rem;font-weight:900;color:#1E293B;margin:0 0 2px;"><i class="fas fa-tachometer-alt" style="color:#EA580C;"></i> Nivel 9: Escenarios y Manejo de Velocidades en Scratch Jr</h3>' +
                          '<p style="font-size:0.82rem;color:#64748B;margin:0;">Ejemplo interactivo: <strong>proyectos/velocidad.sjr</strong> | Plataforma: <strong>https://codejr.org</strong></p>' +
                        '</div>' +
                        '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
                          '<a href="' + (mission.projectFileUrl || 'proyectos/velocidad.sjr') + '" download="velocidad.sjr" class="arm-btn-primary" style="background:#EA580C;border-color:#C2410C;font-size:0.84rem;padding:7px 16px;text-decoration:none;">' +
                            '<i class="fas fa-download"></i> Descargar velocidad.sjr' +
                          '</a>' +
                          '<a href="https://codejr.org" target="_blank" rel="noopener noreferrer" class="arm-btn-secondary" style="font-size:0.84rem;padding:7px 14px;text-decoration:none;">' +
                            '<i class="fas fa-external-link-alt"></i> Abrir Scratch Jr' +
                          '</a>' +
                        '</div>' +
                      '</div>' +
                      '<div class="codeorg-challenge-hero-card" style="border-left:4px solid #EA580C;">' +
                        '<div class="chc-left">' +
                          '<img src="img/scratchjr.png" alt="Scratch Jr Velocidad" class="chc-img" onerror="this.src=\'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=400&q=80\'">' +
                        '</div>' +
                        '<div class="chc-right">' +
                          '<span class="chc-tag" style="background:#FFEDD5;color:#C2410C;"><i class="fas fa-cat"></i> Misión Nivel 9 • Scratch Jr</span>' +
                          '<h4>Programá a tus personajes para correr a diferentes ritmos</h4>' +
                          '<p>En Scratch Jr, podés cambiar la velocidad de cada personaje combinando la <strong>Bandera Verde</strong>, el <strong>bloque naranja de velocidad</strong> y los <strong>bloques azules de movimiento</strong>.</p>' +
                          '<div class="chc-blocks-preview">' +
                            '<span class="cbp-block run" style="background:#FBBF24;border-color:#D97706;color:#78350F;"><i class="fas fa-flag"></i> bandera</span>' +
                            '<span class="cbp-arrow">➔</span>' +
                            '<span class="cbp-block move" style="background:#EA580C;border-color:#C2410C;"><i class="fas fa-tachometer-alt"></i> velocidad (1, 2 o 3)</span>' +
                            '<span class="cbp-arrow">➔</span>' +
                            '<span class="cbp-block move" style="background:#2563EB;border-color:#1D4ED8;"><i class="fas fa-arrow-right"></i> avanzar (10)</span>' +
                          '</div>' +
                          '<div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;">' +
                            '<a href="' + (mission.projectFileUrl || 'proyectos/velocidad.sjr') + '" download="velocidad.sjr" class="arm-btn-primary" style="background:#EA580C;border-color:#C2410C;font-size:0.92rem;padding:9px 20px;text-decoration:none;">' +
                              '<i class="fas fa-download"></i> Descargar Archivo Ejemplo: velocidad.sjr' +
                            '</a>' +
                          '</div>' +
                        '</div>' +
                      '</div>' +
                      '<div class="apm-tb-grid" style="margin-top:8px;">' +
                        '<div class="apm-tb-item" style="border-left:3px solid #EA580C;">' +
                          '<h6>Paso 1: Elegir el Escenario de Fondo</h6>' +
                          '<p>Tocá el ícono del paisaje en la barra superior para colocar una pista, parque o cancha.</p>' +
                        '</div>' +
                        '<div class="apm-tb-item" style="border-left:3px solid #2563EB;">' +
                          '<h6>Paso 2: Sumar personajes (+)</h6>' +
                          '<p>En la columna izquierda tocá "+" y agregá dos o tres personajes alineados a la izquierda.</p>' +
                        '</div>' +
                        '<div class="apm-tb-item" style="border-left:3px solid #D97706;">' +
                          '<h6>Paso 3: Encastrar el Bloque de Velocidad</h6>' +
                          '<p>En la categoría naranja, elegí velocidad 1 (lento), 2 (medio) o 3 (rápido) para cada uno.</p>' +
                        '</div>' +
                        '<div class="apm-tb-item" style="border-left:3px solid #10B981;">' +
                          '<h6>Paso 4: ¡Largada con la Bandera Verde!</h6>' +
                          '<p>Tocá la bandera verde arriba a la derecha y mirá cómo compiten a diferentes ritmos.</p>' +
                        '</div>' +
                      '</div>' +
                      '<div style="text-align:right;margin-top:8px;">' +
                        '<button type="button" class="arm-btn-primary apm-next-btn-internal" style="background:#EA580C;border-color:#C2410C;">' +
                          '¡Ver Misión Cumplida y Consejos! <i class="fas fa-arrow-right"></i>' +
                        '</button>' +
                      '</div>' +
                    '</div>' :
                   isMinecraft ?
                    '<div style="height:100%;display:flex;flex-direction:column;gap:12px;overflow-y:auto;padding-right:4px;">' +
                      '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">' +
                        '<div>' +
                          '<h3 style="font-size:1.2rem;font-weight:900;color:#1E293B;margin:0 0 2px;"><i class="fas fa-cube" style="color:#059669;"></i> Nivel 8: ¡Hora del Código con Minecraft! (Steve y Alex)</h3>' +
                          '<p style="font-size:0.82rem;color:#64748B;margin:0;">Plataforma interactiva oficial: <strong>https://studio.code.org/s/mc/lessons/1/levels/1</strong></p>' +
                        '</div>' +
                        '<a href="https://studio.code.org/s/mc/lessons/1/levels/1" target="_blank" rel="noopener noreferrer" class="arm-btn-primary" style="background:#059669;border-color:#047857;font-size:0.84rem;padding:7px 16px;">' +
                          '<i class="fas fa-external-link-alt"></i> Abrir en Pantalla Completa' +
                        '</a>' +
                      '</div>' +
                      '<div class="codeorg-challenge-hero-card" style="border-left:4px solid #059669;">' +
                        '<div class="chc-left">' +
                          '<img src="img/minecraft.png" alt="Minecraft Code.org" class="chc-img" onerror="this.src=\'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=400&q=80\'">' +
                        '</div>' +
                        '<div class="chc-right">' +
                          '<span class="chc-tag" style="background:#D1FAE5;color:#065F46;"><i class="fas fa-cube"></i> Misión Nivel 8 • Adaptación Educativa</span>' +
                          '<h4>Programá a Steve o Alex para explorar el mundo en bloques</h4>' +
                          '<p><strong>Importante:</strong> ¡No es el juego tradicional de juego libre! Aquí los personajes no se mueven con flechas ni teclado: tenés que programar con bloques de <code>avanzar</code>, <code>girar</code> y <code>destruir bloque</code>.</p>' +
                          '<div class="chc-blocks-preview">' +
                            '<span class="cbp-block run"><i class="fas fa-play"></i> al ejecutar</span>' +
                            '<span class="cbp-arrow">➔</span>' +
                            '<span class="cbp-block move" style="background:#059669;"><i class="fas fa-arrow-up"></i> avanzar</span>' +
                            '<span class="cbp-arrow">➔</span>' +
                            '<span class="cbp-block move" style="background:#059669;"><i class="fas fa-arrow-up"></i> avanzar</span>' +
                            '<span class="cbp-arrow">➔</span>' +
                            '<span class="cbp-block move" style="background:#D97706;"><i class="fas fa-hammer"></i> destruir bloque</span>' +
                          '</div>' +
                          '<div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;">' +
                            '<a href="https://studio.code.org/s/mc/lessons/1/levels/1" target="_blank" rel="noopener noreferrer" class="arm-btn-primary" style="background:#059669;border-color:#047857;font-size:0.92rem;padding:9px 20px;">' +
                              '<i class="fas fa-cube"></i> ¡Jugar Ahora en Code.org Minecraft! (studio.code.org/s/mc)' +
                            '</a>' +
                          '</div>' +
                        '</div>' +
                      '</div>' +
                      '<div class="apm-tb-grid" style="margin-top:8px;">' +
                        '<div class="apm-tb-item" style="border-left:3px solid #059669;">' +
                          '<h6>Paso 1: Elegir a Steve o Alex</h6>' +
                          '<p>Al comenzar elegí tu personaje favorito para guiarlo en cada puzzle.</p>' +
                        '</div>' +
                        '<div class="apm-tb-item" style="border-left:3px solid #2563EB;">' +
                          '<h6>Paso 2: Calcular los bloques de distancia</h6>' +
                          '<p>Contá cuántos bloques de pasto te separan de la oveja o del árbol.</p>' +
                        '</div>' +
                        '<div class="apm-tb-item" style="border-left:3px solid #D97706;">' +
                          '<h6>Paso 3: Acciones especiales (Talar / Trasquilar)</h6>' +
                          '<p>Colocá la orden <strong>destruir bloque</strong> o <strong>trasquilar</strong> justo frente al objetivo.</p>' +
                        '</div>' +
                        '<div class="apm-tb-item" style="border-left:3px solid #10B981;">' +
                          '<h6>Paso 4: Bucles de repetición</h6>' +
                          '<p>Usá <strong>repetir</strong> para tareas largas como talar árboles altos o construir refugios.</p>' +
                        '</div>' +
                      '</div>' +
                      '<div style="text-align:right;margin-top:8px;">' +
                        '<button type="button" class="arm-btn-primary apm-next-btn-internal" style="background:#059669;border-color:#047857;">' +
                          '¡Ver Misión Cumplida y Consejos! <i class="fas fa-arrow-right"></i>' +
                        '</button>' +
                      '</div>' +
                    '</div>' :
                   isFrozen ?
                    '<div style="height:100%;display:flex;flex-direction:column;gap:12px;overflow-y:auto;padding-right:4px;">' +
                      '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">' +
                        '<div>' +
                          '<h3 style="font-size:1.2rem;font-weight:900;color:#1E293B;margin:0 0 2px;"><i class="fas fa-snowflake" style="color:#0284C7;"></i> Nivel 6: ¡A Patinar y Programar con Ana y Elsa!</h3>' +
                          '<p style="font-size:0.82rem;color:#64748B;margin:0;">Plataforma interactiva: <strong>https://studio.code.org/s/frozen/lessons/1/levels/1</strong></p>' +
                        '</div>' +
                        '<a href="https://studio.code.org/s/frozen/lessons/1/levels/1" target="_blank" rel="noopener noreferrer" class="arm-btn-primary" style="background:#0284C7;border-color:#0369A1;font-size:0.84rem;padding:7px 16px;">' +
                          '<i class="fas fa-external-link-alt"></i> Abrir en Pantalla Completa' +
                        '</a>' +
                      '</div>' +
                      '<div class="codeorg-challenge-hero-card" style="border-left:4px solid #0284C7;">' +
                        '<div class="chc-left">' +
                          '<img src="img/frozen.png" alt="Ana y Elsa Frozen Code.org" class="chc-img" onerror="this.src=\'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=400&q=80\'">' +
                        '</div>' +
                        '<div class="chc-right">' +
                          '<span class="chc-tag" style="background:#E0F2FE;color:#0369A1;"><i class="fas fa-snowflake"></i> Misión Nivel 6</span>' +
                          '<h4>Ayudá a Elsa a trazar figuras geométricas en el hielo</h4>' +
                          '<p>Arrastrá los bloques de <code>avanzar píxeles</code> y <code>girar 90 grados</code> hacia el bloque <code>al ejecutar</code>. ¿Cómo creamos un cuadrado con esquinas en ángulo recto?</p>' +
                          '<div class="chc-blocks-preview">' +
                            '<span class="cbp-block run"><i class="fas fa-play"></i> al ejecutar</span>' +
                            '<span class="cbp-arrow">➔</span>' +
                            '<span class="cbp-block move" style="background:#0284C7;"><i class="fas fa-arrows-alt-v"></i> avanzar 100 px</span>' +
                            '<span class="cbp-arrow">➔</span>' +
                            '<span class="cbp-block move" style="background:#2563EB;"><i class="fas fa-redo"></i> girar 90°</span>' +
                            '<span class="cbp-arrow">➔</span>' +
                            '<span class="cbp-block move" style="background:#0284C7;"><i class="fas fa-arrows-alt-v"></i> avanzar 100 px</span>' +
                          '</div>' +
                          '<div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;">' +
                            '<a href="https://studio.code.org/s/frozen/lessons/1/levels/1" target="_blank" rel="noopener noreferrer" class="arm-btn-primary" style="background:#0284C7;border-color:#0369A1;font-size:0.92rem;padding:9px 20px;">' +
                              '<i class="fas fa-snowflake"></i> ¡Jugar Ahora en Code.org! (studio.code.org/s/frozen)' +
                            '</a>' +
                          '</div>' +
                        '</div>' +
                      '</div>' +
                      '<div class="apm-tb-grid" style="margin-top:8px;">' +
                        '<div class="apm-tb-item" style="border-left:3px solid #0284C7;">' +
                          '<h6>Paso 1: Trazar la primera línea</h6>' +
                          '<p>Encastrá el bloque <strong>avanzar 100 píxeles</strong> para que Elsa patine en línea recta.</p>' +
                        '</div>' +
                        '<div class="apm-tb-item" style="border-left:3px solid #2563EB;">' +
                          '<h6>Paso 2: Doblar en la esquina (90°)</h6>' +
                          '<p>Agregá <strong>girar a la derecha 90 grados</strong> para formar una esquina recta como en la cancha de fútbol.</p>' +
                        '</div>' +
                        '<div class="apm-tb-item" style="border-left:3px solid #10B981;">' +
                          '<h6>Paso 3: Cerrar el Cuadrado</h6>' +
                          '<p>Repetí los lados o usá el bloque <strong>repetir 4 veces</strong> para armar la figura geométrica completa.</p>' +
                        '</div>' +
                        '<div class="apm-tb-item" style="border-left:3px solid #7C3AED;">' +
                          '<h6>Paso 4: ¡Copos de nieve mágicos!</h6>' +
                          '<p>Al superar los niveles, ¡Elsa y Ana crearán copos de nieve y estrellas combinando más figuras!</p>' +
                        '</div>' +
                      '</div>' +
                      '<div style="text-align:right;margin-top:8px;">' +
                        '<button type="button" class="arm-btn-primary apm-next-btn-internal" style="background:#0284C7;border-color:#0369A1;">' +
                          '¡Ver Misión Cumplida y Consejos! <i class="fas fa-arrow-right"></i>' +
                        '</button>' +
                      '</div>' +
                    '</div>' :
                   isAngryBirds ?
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
                          '¡Ver Misión Cumplida y Consejos! <i class="fas fa-arrow-right"></i>' +
                        '</button>' +
                      '</div>' +
                    '</div>' :
                   isPaint ?
                    '<div style="height:100%;display:flex;flex-direction:column;gap:10px;overflow-y:auto;padding-right:6px;">' +
                      '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">' +
                        '<div>' +
                          '<h3 style="font-size:1.2rem;font-weight:900;color:#1E293B;margin:0 0 2px;"><i class="fas ' + (isPaintBanderas ? 'fa-flag' : 'fa-paint-brush') + '" style="color:' + (isPaintBanderas ? '#2563EB' : '#16A34A') + ';"></i> ' + (isPaintBanderas ? 'Paso a Paso: Banderas del Mundial con Geometría en Paint' : 'Paso a Paso: Cancha de Fútbol con Figuras Geométricas') + '</h3>' +
                          '<p style="font-size:0.82rem;color:#64748B;margin:0;">' + (isPaintBanderas ? 'Seguí cada paso para descomponer y dibujar banderas oficiales (Uruguay, Argentina, Brasil y otras) usando figuras en Paint:' : 'Seguí cada paso para dibujar tu cancha profesional usando figuras en Paint:') + '</p>' +
                        '</div>' +
                        '<button type="button" class="arm-btn-secondary apm-goto-pdf-btn" style="font-size:0.8rem;padding:6px 12px;">' +
                          '<i class="fas fa-print"></i> Guía Imprimible' +
                        '</button>' +
                      '</div>' +
                      '<div style="display:flex;gap:12px;align-items:center;' + (isPaintBanderas ? 'background:#EFF6FF;border:1.5px dashed #2563EB;' : 'background:#F0FDF4;border:1.5px dashed #16A34A;') + 'border-radius:12px;padding:10px 14px;margin-bottom:8px;">' +
                        '<img src="' + (isPaintBanderas ? 'img/proyectos/banderas_mundial_paint_guia.png' : 'img/proyectos/cancha_futbol_paint_guia.png') + '" alt="' + (isPaintBanderas ? 'Guía de Banderas en Paint' : 'Guía de Figuras en Paint') + '" style="width:78px;height:68px;object-fit:cover;background:#FFF;border-radius:8px;border:1px solid ' + (isPaintBanderas ? '#93C5FD' : '#86EFAC') + ';padding:2px;cursor:pointer;flex-shrink:0;" onclick="window.open(this.src,\'_blank\')" title="Tocar para ampliar guía">' +
                        '<div style="flex:1;">' +
                          '<h5 style="margin:0 0 2px;font-size:0.86rem;color:' + (isPaintBanderas ? '#1E40AF' : '#166534') + ';font-weight:800;"><i class="fas fa-shapes"></i> ' + (isPaintBanderas ? 'Guía Visual: Descomposición Geométrica de Banderas' : 'Guía Visual: Figuras Geométricas de la Cancha') + '</h5>' +
                          '<p style="margin:0;font-size:0.79rem;color:' + (isPaintBanderas ? '#1E3A8A' : '#14532D') + ';line-height:1.4;">' + (isPaintBanderas ? 'Marco rectangular base, franjas paralelas con Línea/Rectángulo, símbolos centrales (Sol de Mayo, estrellas) y relleno con el Bote de Pintura. <span style="font-weight:700;color:#2563EB;">¡Tocá la imagen para ampliar la guía!</span>' : 'Rectángulo verde (césped), rectángulo blanco (límites), línea recta (medio campo), círculo central y arcos con rectángulos pequeños. <span style="font-weight:700;color:#15803D;">¡Tocá la imagen para ampliar el modelo!</span>') + '</p>' +
                        '</div>' +
                      '</div>' +
                      '<div class="apm-instructions-steps-grid">' +
                        instructionsList.map(function(st){
                          return '<div class="apm-step-card">' +
                            '<div class="apm-step-badge" style="background:' + (isPaintBanderas ? '#2563EB' : '#16A34A') + ';">' + st.step + '</div>' +
                            '<div class="apm-step-body">' +
                              '<h5>' + st.title + '</h5>' +
                              '<p>' + st.desc + '</p>' +
                              (st.tip ? '<div class="apm-step-tip" style="' + (isPaintBanderas ? 'background:#EFF6FF;border-left-color:#2563EB;color:#1E3A8A;' : 'background:#F0FDF4;border-left-color:#16A34A;color:#14532D;') + '"><i class="fas fa-info-circle" style="color:' + (isPaintBanderas ? '#2563EB' : '#16A34A') + ';"></i> ' + st.tip + '</div>' : '') +
                            '</div>' +
                          '</div>';
                        }).join('') +
                      '</div>' +
                      '<div style="text-align:right;margin-top:10px;">' +
                        '<button type="button" class="arm-btn-primary apm-next-btn-internal" style="' + (isPaintBanderas ? 'background:#2563EB;border-color:#1D4ED8;' : 'background:#16A34A;border-color:#15803D;') + '">' +
                          '¡Ver Retos Finales y Entrega! <i class="fas fa-arrow-right"></i>' +
                        '</button>' +
                      '</div>' +
                    '</div>' :
                   isElectronica ?
                    '<div style="height:100%;display:flex;flex-direction:column;gap:10px;overflow-y:auto;padding-right:6px;">' +
                      '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">' +
                        '<div>' +
                          '<h3 style="font-size:1.2rem;font-weight:900;color:#1E293B;margin:0 0 2px;"><i class="fas ' + (isMarcalibro ? 'fa-book-open' : (isDiaMadre ? 'fa-heart' : 'fa-tools')) + '" style="color:' + (isMarcalibro ? '#D97706' : (isDiaMadre ? '#E11D48' : '#D97706')) + ';"></i> ' + (isMarcalibro ? 'Paso a Paso: Marca-Libros Origami de Tom Sawyer con LED Chato' : (isDiaMadre ? 'Paso a Paso: Tarjeta Pop-Up 3D, Foto y Botón Escudo Freire' : 'Paso a Paso: Armado del Circuito (Sin Programación)')) + '</h3>' +
                          '<p style="font-size:0.82rem;color:#64748B;margin:0;">' + (isMarcalibro ? 'Seguí cada paso para plegar el papel glacé, colocar a Tom Sawyer y armar el circuito con LED chato en su sombrero:' : (isDiaMadre ? 'Seguí cada paso para cortar el corazón 3D, colocar la foto y armar el circuito con pulsador en el escudo:' : 'Seguí cada paso en orden para ensamblar los componentes y hacer funcionar tu invento:')) + '</p>' +
                        '</div>' +
                        '<button type="button" class="arm-btn-secondary apm-goto-pdf-btn" style="font-size:0.8rem;padding:6px 12px;">' +
                          '<i class="fas fa-print"></i> Guía Imprimible' +
                        '</button>' +
                      '</div>' +
                      (mission.gallery && mission.gallery.length > 1 ?
                        '<div style="display:flex;gap:12px;align-items:center;' + (isMarcalibro ? 'background:#FFFBEB;border:1.5px dashed #F59E0B;' : (isDiaMadre ? 'background:#FFF1F2;border:1.5px dashed #E11D48;' : 'background:#FEF3C7;border:1.5px dashed #D97706;')) + 'border-radius:12px;padding:10px 14px;margin-bottom:8px;">' +
                          '<img src="' + mission.gallery[1] + '" alt="Plano del Circuito" style="width:68px;height:68px;object-fit:contain;background:#FFF;border-radius:8px;border:1px solid ' + (isMarcalibro ? '#FCD34D' : (isDiaMadre ? '#FDA4AF' : '#FCD34D')) + ';padding:2px;cursor:pointer;flex-shrink:0;" onclick="window.open(this.src,\'_blank\')" title="Tocar para ampliar plano">' +
                          '<div style="flex:1;">' +
                            '<h5 style="margin:0 0 2px;font-size:0.86rem;color:' + (isMarcalibro ? '#92400E' : (isDiaMadre ? '#9F1239' : '#92400E')) + ';font-weight:800;"><i class="fas fa-drafting-compass"></i> ' + (isMarcalibro ? 'Guía Oficial: Doblado Origami y Circuito con LED Chato en el Sombrero' : (isDiaMadre ? 'Plantilla Oficial: Circuito Papertronics y Contactos del Escudo' : (mission.title.includes('Varita') ? 'Esquema de Conexiones de la Varita Mágica' : 'Plano de Conexiones: ' + mission.title))) + '</h5>' +
                            '<p style="margin:0;font-size:0.79rem;color:' + (isMarcalibro ? '#78350F' : (isDiaMadre ? '#881337' : '#78350F')) + ';line-height:1.4;">' + (isMarcalibro ? 'Mirá cómo corre la cinta conductora desde la pila CR2032 dentro del doblez esquinero hasta el LED chato en el medio del sombrero de Tom Sawyer.' : (isDiaMadre ? 'Mirá cómo corren las pistas de cobre desde la pila CR2032 hasta el LED superior y el botón táctil en el escudo del Colegio Paulo Freire.' : (mission.title.includes('Varita') ? 'Mirá cómo van las pistas de cinta conductora desde el LED en la punta hasta la pila y el pulsador táctil en el mango.' : 'Mirá cómo van las pistas de cobre desde el trébol hasta la pila y la solapa.'))) + (mission.pdfUrl ? ' <a href="' + mission.pdfUrl + '" target="_blank" style="color:' + (isMarcalibro ? '#B45309' : (isDiaMadre ? '#BE123C' : '#B45309')) + ';font-weight:700;text-decoration:underline;">Ver plantilla completa en PDF</a>' : ' <span style="color:' + (isMarcalibro ? '#B45309' : (isDiaMadre ? '#BE123C' : '#B45309')) + ';font-weight:700;">¡Tocá el diagrama para ampliarlo!</span>') + '</p>' +
                          '</div>' +
                        '</div>' : '') +
                      '<div class="apm-instructions-steps-grid">' +
                        instructionsList.map(function(st){
                          return '<div class="apm-step-card">' +
                            '<div class="apm-step-badge" style="background:' + (isDiaMadre ? '#E11D48' : '#D97706') + ';">' + st.step + '</div>' +
                            '<div class="apm-step-body">' +
                              '<h5>' + st.title + '</h5>' +
                              '<p>' + st.desc + '</p>' +
                              (st.tip ? '<div class="apm-step-tip" style="' + (isDiaMadre ? 'background:#FFF1F2;border-left-color:#E11D48;color:#881337;' : '') + '"><i class="fas fa-info-circle"></i> ' + st.tip + '</div>' : '') +
                            '</div>' +
                          '</div>';
                        }).join('') +
                      '</div>' +
                      '<div style="text-align:right;margin-top:10px;">' +
                        '<button type="button" class="arm-btn-primary apm-next-btn-internal" style="background:' + (isDiaMadre ? '#E11D48;border-color:#BE123C;' : '#D97706;border-color:#B45309;') + '">' +
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
                      '<div class="apm-win-trophy">' + (isServoJoystick ? '🧤' : (isCanva ? '🧤' : (isMarcalibro ? '📖' : (isScratchJrPerspectiva ? '🐱' : (isScratchJrVelocidad ? '🐱' : (isMinecraft ? '⛏️' : (isFrozen ? '❄️' : (isPaintBanderas ? '🇺🇾' : (isPaint ? '⚽' : (isDiaMadre ? '💖' : (isAngryBirds ? '🐦' : '🏆'))))))))))) + '</div>' +
                      '<h3 class="apm-win-title">' + (isServoJoystick ? '¡El Arquero Mecánico Construido y Programado con Éxito!' : (isCanva ? '¡Arquero con Inteligencia Artificial Creado con Éxito en Canva!' : (isMarcalibro ? '¡Marca-Libros Origami de Tom Sawyer Terminado!' : (isScratchJrPerspectiva ? '¡Misión de Escenarios y Perspectiva en Scratch Jr Superada!' : (isScratchJrVelocidad ? '¡Misión de Escenarios y Velocidades en Scratch Jr Superada!' : (isMinecraft ? '¡Desafío de Programación en Minecraft Superado!' : (isFrozen ? '¡Patinaje Geométrico Completado con Ana y Elsa!' : (isPaintBanderas ? '¡Banderas del Mundial Creadas con Éxito en Paint!' : (isPaint ? '¡Cancha de Fútbol Completada en Paint!' : (isDiaMadre ? '¡Tarjeta Pop-Up 3D del Día de la Madre Terminada con Éxito!' : (isAngryBirds ? '¡Desafío Angry Birds Superado!' : '¡Misión Cumplida en el Nivel ' + mission.level + '!'))))))))))) + '</h3>' +
                      '<p class="apm-win-sub">' + (isServoJoystick ? '¡Conectaste el joystick chico negro en Pin P1, programaste el servomotor SG90 en Pin P0, dominaste el bloque de ajuste de intervalo matemático (Math.map de 0..1023 a 0..180°) y pusiste al arquero a atajar penales en el arco físico en tiempo real! Sumaste <strong>+100 XP</strong> al progreso del taller.' : (isCanva ? '¡Te sacaste la foto en el aula, aislaste tu cabeza con la IA de Canva, la montaste sobre la imagen de un arquero reemplazando su foto y la transformaste en una animación de atajada épica en video MP4 o GIF! Sumaste <strong>+100 XP</strong> al progreso del taller.' : (isMarcalibro ? '¡Plegaste tu marca-libros esquinero con papel glacé y le diste luz al sombrero de Tom Sawyer con un circuito y LED chato! Sumaste <strong>+100 XP</strong> al progreso del taller.' : (isScratchJrPerspectiva ? '¡Aprendiste a crear profundidad 3D en Scratch Jr cambiando la perspectiva de las figuras con los bloques de apariencia! Sumaste <strong>+100 XP</strong> al progreso del taller.' : (isScratchJrVelocidad ? '¡Aprendiste a explorar el ambiente de Scratch Jr y a dominar las velocidades lenta, media y rápida con el bloque naranja! Sumaste <strong>+100 XP</strong> al progreso del taller.' : (isMinecraft ? '¡Aprendiste a programar a Steve y Alex con bloques y bucles secuenciales en la adaptación de Code.org! Sumaste <strong>+100 XP</strong> al progreso del taller.' : (isFrozen ? '¡Dominaste los ángulos, las figuras geométricas y la programación sobre el hielo! Sumaste <strong>+100 XP</strong> al progreso del taller.' : (isPaintBanderas ? '¡Combinaste figuras geométricas, proporciones y colores para diseñar las banderas del mundial en Paint! Sumaste <strong>+100 XP</strong> al progreso del taller.' : (isPaint ? '¡Dominaste el mouse, los colores y las figuras geométricas para crear tu propio estadio digital! Sumaste <strong>+100 XP</strong> al progreso del taller.' : (isDiaMadre ? '¡Creaste un corazón 3D con tu foto y un circuito con luz LED que enciende al tocar el escudo del Colegio Paulo Freire! Sumaste <strong>+100 XP</strong> al progreso del taller.' : (isAngryBirds ? 'Aprendiste las bases de la programación y el razonamiento lógico en Code.org. ¡Sumaste <strong>+100 XP</strong> al progreso del taller!' : 'Superaste el recorrido de <strong>' + mission.title + '</strong>. ¡Sumaste <strong>+100 XP</strong> al progreso de tu grado!'))))))))))) + '</p>' +
                    '</div>' +

                    '<h4 style="font-size:1rem;font-weight:900;color:#1E293B;margin:0 0 12px;"><i class="fas fa-rocket"></i> Desafíos Extra para tu Invento:</h4>' +
                    '<div class="apm-extra-challenges">' +
                      (isServoJoystick ?
                        '<div class="apm-ec-item"><div class="apm-ec-badge" style="background:#0D9488;">1</div><div><h6>Modo Penales Rápido</h6><p>Reducí la pausa en MakeCode a 10 ms para que el arquero reaccione con velocidad de reflejo profesional ante remates potentes.</p></div></div>' +
                        '<div class="apm-ec-item"><div class="apm-ec-badge" style="background:#0D9488;">2</div><div><h6>Celebración con LEDs de la micro:bit</h6><p>Si el arquero ataja una pelota en un palo (ángulo menor a 15° o mayor a 165°), mostrá un corazón o carita feliz en los LEDs de la micro:bit.</p></div></div>' +
                        '<div class="apm-ec-item"><div class="apm-ec-badge" style="background:#0D9488;">3</div><div><h6>Marcador de Goles con Botones A y B</h6><p>Programá el botón A para sumar goles atajados y el botón B para goles recibidos, mostrando el marcador en la pantalla de la micro:bit.</p></div></div>' :
                       isMarcalibro ?
                        '<div class="apm-ec-item"><div class="apm-ec-badge" style="background:#D97706;">1</div><div><h6>Probar el Marca-Páginas en un Libro</h6><p>Calzá el bolsillo esquinero en tu libro de cuentos favorito. Al presionar suavemente la punta, el sombrero de Tom Sawyer debe encender su luz LED chata.</p></div></div>' +
                        '<div class="apm-ec-item"><div class="apm-ec-badge" style="background:#D97706;">2</div><div><h6>Decorar a Tom Sawyer</h6><p>Coloreá el sombrero de paja, la camisa y agregale pecas o detalles con lápices y marcadores para personalizar tu personaje.</p></div></div>' +
                        '<div class="apm-ec-item"><div class="apm-ec-badge" style="background:#D97706;">3</div><div><h6>Interruptor Automático al Cerrar el Libro</h6><p>Ajustá la solapa con cinta de cobre para que cuando el libro esté cerrado la presión de las hojas mantenga el contacto cerrado o lo prenda al abrirlo.</p></div></div>' :
                       isScratchJrPerspectiva ?
                        '<div class="apm-ec-item"><div class="apm-ec-badge" style="background:#7C3AED;">1</div><div><h6>Alejarse hacia el Horizonte</h6><p>Invertí el algoritmo: empezá grande al frente y programá pasos hacia arriba con bloques de achicar para que parezca que se aleja.</p></div></div>' +
                        '<div class="apm-ec-item"><div class="apm-ec-badge" style="background:#7C3AED;">2</div><div><h6>Dos Personajes Cruzándose</h6><p>Programá un personaje que camine hacia adelante agrandándose y otro que camine hacia el fondo achicándose al mismo tiempo.</p></div></div>' +
                        '<div class="apm-ec-item"><div class="apm-ec-badge" style="background:#7C3AED;">3</div><div><h6>Diálogo en Primer Plano</h6><p>Al llegar al final del camino en tamaño grande, agregá el bloque violeta de diálogo para que diga "¡Hola, llegué!".</p></div></div>' :
                       isScratchJrVelocidad ?
                        '<div class="apm-ec-item"><div class="apm-ec-badge" style="background:#EA580C;">1</div><div><h6>Carrera de 3 Personajes</h6><p>Colocá una tortuga en velocidad 1 (lenta), un gato en velocidad 2 (media) y un auto en velocidad 3 (rápida).</p></div></div>' +
                        '<div class="apm-ec-item"><div class="apm-ec-badge" style="background:#EA580C;">2</div><div><h6>Cambio de Escenario al Ganar</h6><p>Agregá una segunda página con un podio de trofeos y usá el bloque rojo de transición para pasar de pantalla.</p></div></div>' +
                        '<div class="apm-ec-item"><div class="apm-ec-badge" style="background:#EA580C;">3</div><div><h6>Grabar Sonido de Largada</h6><p>Usá el bloque verde de micrófono para grabar tu voz diciendo "Preparados, listos, ¡YA!" al iniciar.</p></div></div>' :
                       isMinecraft ?
                        '<div class="apm-ec-item"><div class="apm-ec-badge" style="background:#059669;">1</div><div><h6>Talar árboles altos con bucles</h6><p>Usá el bloque <code>repetir 3 veces</code> para talar troncos sin encastrar muchos bloques.</p></div></div>' +
                        '<div class="apm-ec-item"><div class="apm-ec-badge" style="background:#059669;">2</div><div><h6>Construir un refugio antes de la noche</h6><p>Programá una secuencia de colocar tablas de madera para armar una pared o puerta.</p></div></div>' +
                        '<div class="apm-ec-item"><div class="apm-ec-badge" style="background:#059669;">3</div><div><h6>Completar los 14 puzzles</h6><p>Llegá hasta el certificado final guiando a Steve y Alex por ríos, minas y bosques.</p></div></div>' :
                       isFrozen ?
                        '<div class="apm-ec-item"><div class="apm-ec-badge" style="background:#0284C7;">1</div><div><h6>Crear un Copo de Nieve de 6 Puntas</h6><p>Repetí el giro de 60 grados y avanza para formar un copo de nieve mágico completo en el hielo.</p></div></div>' +
                        '<div class="apm-ec-item"><div class="apm-ec-badge" style="background:#0284C7;">2</div><div><h6>Patinar Dibujando Círculos Suaves</h6><p>Usá giros pequeños de 1 grado repetidos muchas veces para que Elsa dibuje círculos perfectos como en Paint.</p></div></div>' +
                        '<div class="apm-ec-item"><div class="apm-ec-badge" style="background:#0284C7;">3</div><div><h6>Cambiar Colores de los Patines</h6><p>Programá a Ana y Elsa para que el hielo cambie de color con cada figura geométrica que tracen.</p></div></div>' :
                       isAngryBirds ?
                        '<div class="apm-ec-item"><div class="apm-ec-badge">1</div><div><h6>Superar los niveles con giros</h6><p>Llegar al nivel 3 y 4 de Code.org practicando giros a la derecha e izquierda sin perder la orientación.</p></div></div>' +
                        '<div class="apm-ec-item"><div class="apm-ec-badge">2</div><div><h6>Usar el menor número de bloques</h6><p>Encontrar la ruta más directa sin bloques sobrantes pensando el algoritmo antes de ejecutar.</p></div></div>' +
                        '<div class="apm-ec-item"><div class="apm-ec-badge" style="background:#0284C7;">3</div><div><h6>Enseñarle a un compañero</h6><p>Explicarle a un amigo cómo anticipar los pasos del pájaro antes de encastrar los bloques.</p></div></div>' :
                       isPaintBanderas ?
                        '<div class="apm-ec-item"><div class="apm-ec-badge" style="background:#2563EB;">1</div><div><h6>Dibujar la bandera de Uruguay con sus 9 franjas</h6><p>Contá 4 franjas azules y 5 blancas, y agregá el Sol de Mayo en el cantón superior izquierdo.</p></div></div>' +
                        '<div class="apm-ec-item"><div class="apm-ec-badge" style="background:#2563EB;">2</div><div><h6>Crear la bandera de Brasil con rombo y círculo</h6><p>Dibujá el fondo verde, el rombo amarillo en el medio y el círculo azul con la franja blanca curva.</p></div></div>' +
                        '<div class="apm-ec-item"><div class="apm-ec-badge" style="background:#2563EB;">3</div><div><h6>Inventar la bandera de tu propio equipo o país</h6><p>Combiná figuras y colores favoritos para crear una bandera original de tu colegio o taller maker.</p></div></div>' :
                       isPaint ?
                        '<div class="apm-ec-item"><div class="apm-ec-badge" style="background:#16A34A;">1</div><div><h6>Dibujar a los jugadores y la pelota</h6><p>Usá círculos pequeños con colores de camisetas diferentes para armar dos equipos y agregá una pelota en el centro.</p></div></div>' +
                        '<div class="apm-ec-item"><div class="apm-ec-badge" style="background:#16A34A;">2</div><div><h6>Agregar tribunas y banderas de córner</h6><p>Dibujá gradas alrededor de la cancha con rectángulos y poné banderines en los tiros de esquina.</p></div></div>' +
                        '<div class="apm-ec-item"><div class="apm-ec-badge" style="background:#16A34A;">3</div><div><h6>Escribir el marcador del partido</h6><p>Usá la herramienta de Texto "A" para escribir los nombres de los equipos y un resultado emocionante (ej: Freire FC 3 - 2 Tigres).</p></div></div>' :
                       isDiaMadre ?
                        '<div class="apm-ec-item"><div class="apm-ec-badge" style="background:#E11D48;">1</div><div><h6>Probar el Pulsador en el Escudo Paulo Freire</h6><p>Apretá el escudo del colegio en la portada: el circuito de cobre debe cerrarse y el LED brillar iluminando los bordes del corazón.</p></div></div>' +
                        '<div class="apm-ec-item"><div class="apm-ec-badge" style="background:#E11D48;">2</div><div><h6>Tu Foto y Dedicatoria con Mucho Amor</h6><p>Pegá tu foto centrada en el corazón desplegable y escribí una dedicatoria especial o dibujá detalles para mamá.</p></div></div>' +
                        '<div class="apm-ec-item"><div class="apm-ec-badge" style="background:#E11D48;">3</div><div><h6>Efecto Tridimensional Pop-Up</h6><p>Al abrir la tarjeta a 90°, verificá que las pestañas cortadas proyecten el corazón hacia adelante creando el efecto 3D.</p></div></div>' :
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
                      (isGame ?
                        '<a href="' + (mission.gameUrl || (isMinecraft ? 'https://studio.code.org/s/mc/lessons/1/levels/1' : (isFrozen ? 'https://studio.code.org/s/frozen/lessons/1/levels/1' : 'https://studio.code.org/es/hoc/1'))) + '" target="_blank" rel="noopener noreferrer" class="arm-btn-primary" style="background:' + (isMinecraft ? '#059669;border-color:#047857;' : (isFrozen ? '#0284C7;border-color:#0369A1;' : '#E11D48;border-color:#BE123C;')) + 'font-size:0.92rem;padding:9px 20px;">' +
                          (isMinecraft ? '<i class="fas fa-cube"></i> ¡Jugar Ahora en Code.org Minecraft!' : (isFrozen ? '<i class="fas fa-snowflake"></i> ¡Jugar Ahora con Ana y Elsa!' : '<i class="fas fa-gamepad"></i> ¡Jugar Ahora en Code.org!')) +
                        '</a>' +
                        '<button type="button" class="arm-btn-secondary apm-goto-pdf-btn" style="font-size:0.9rem;padding:9px 18px;"><i class="fas fa-file-pdf"></i> Ver Guía Didáctica</button>' +
                        '<button type="button" class="arm-btn-secondary" id="apm-restart-slides-btn" style="font-size:0.9rem;padding:9px 18px;">' +
                          '<i class="fas fa-undo"></i> Repasar Presentación' +
                        '</button>'
                      :
                        '<button type="button" class="arm-btn-primary apm-slide4-goto-entrega" style="background:' + (isMarcalibro ? '#D97706' : (isScratchJrPerspectiva ? '#7C3AED' : (isScratchJrVelocidad ? '#EA580C' : (isDiaMadre ? '#E11D48' : (isPaintBanderas ? '#2563EB' : (isPaint ? '#16A34A' : (isElectronica ? '#D97706' : '#10B981'))))))) + ';border-color:' + (isMarcalibro ? '#B45309' : (isScratchJrPerspectiva ? '#6D28D9' : (isScratchJrVelocidad ? '#C2410C' : (isDiaMadre ? '#BE123C' : (isPaintBanderas ? '#1D4ED8' : (isPaint ? '#15803D' : (isElectronica ? '#B45309' : '#059669'))))))) + ';font-size:0.9rem;padding:9px 18px;">' +
                          (isMarcalibro ? '<i class="fas fa-camera"></i> Subir Foto de Mi Marca-Libros' : (isScratchJrPerspectiva ? '<i class="fas fa-cloud-upload-alt"></i> Subir Mi Proyecto (.sjr)' : (isScratchJrVelocidad ? '<i class="fas fa-cloud-upload-alt"></i> Subir Mi Proyecto (.sjr)' : (isDiaMadre ? '<i class="fas fa-camera"></i> Subir Foto de Mi Tarjeta 3D' : (isPaint ? '<i class="fas fa-palette"></i> Subir Mi Dibujo de Paint' : (isElectronica ? '<i class="fas fa-camera"></i> Subir Foto de Mi Circuito' : '<i class="fas fa-cloud-upload-alt"></i> Subir Mi Creación')))))) +
                        '</button>' +
                        '<button type="button" class="arm-btn-primary apm-slide4-goto-solucion" style="background:#7C3AED;border-color:#6D28D9;font-size:0.9rem;padding:9px 18px;">' +
                          (isMarcalibro ? '<i class="fas fa-book-open"></i> Ver Guía de Doblado y Circuito' : (isScratchJrPerspectiva ? '<i class="fas fa-search-plus"></i> Ver Esquema de Perspectiva' : (isScratchJrVelocidad ? '<i class="fas fa-tachometer-alt"></i> Ver Esquema de Velocidades' : (isDiaMadre ? '<i class="fas fa-heart"></i> Ver Esquema del Corazón y Escudo' : (isPaint ? '<i class="fas fa-shapes"></i> Ver Guía de Figuras' : (isElectronica ? '<i class="fas fa-lightbulb"></i> Ver Esquema Oficial' : '<i class="fas fa-lightbulb"></i> Ver Solución Oficial')))))) +
                        '</button>' +
                        (isScratchJrPerspectiva ?
                          '<a href="' + (mission.projectFileUrl || 'proyectos/perpestiva.sjr') + '" download="perpestiva.sjr" class="arm-btn-secondary" style="font-size:0.9rem;padding:9px 18px;text-decoration:none;"><i class="fas fa-download"></i> Descargar perpestiva.sjr</a>' :
                         isScratchJrVelocidad ?
                          '<a href="' + (mission.projectFileUrl || 'proyectos/velocidad.sjr') + '" download="velocidad.sjr" class="arm-btn-secondary" style="font-size:0.9rem;padding:9px 18px;text-decoration:none;"><i class="fas fa-download"></i> Descargar velocidad.sjr</a>' : '') +
                        '<button type="button" class="arm-btn-secondary" id="apm-goto-pdf-btn" style="font-size:0.9rem;padding:9px 18px;"><i class="fas fa-file-pdf"></i> Ver Guía PDF</button>' +
                        '<button type="button" class="arm-btn-secondary" id="apm-restart-slides-btn" style="font-size:0.9rem;padding:9px 18px;">' +
                          '<i class="fas fa-undo"></i> Repasar Presentación' +
                        '</button>'
                      ) +
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

          (!isGame ?
          // ── PANEL 2: MI ENTREGA ──
          '<div class="apm-tab-pane pane-entrega ' + (activeTab === 'entrega' ? 'active' : '') + '">' +
            '<div class="apm-delivery-pane-wrap">' +
              '<div class="apm-deliv-format-bar" style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 16px;background:#F8FAFC;border-radius:12px;margin-bottom:14px;border:1.5px solid #E2E8F0;flex-wrap:wrap;">' +
                '<span style="font-size:0.84rem;font-weight:800;color:#334155;"><i class="fas fa-sliders-h" style="color:#6366F1;"></i> Formato de Entrega:</span>' +
                '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
                  '<button type="button" class="apm-deliv-switch-btn ' + (isCodeorg ? 'active' : '') + '" id="apm-switch-to-codeorg" style="padding:6px 14px;border-radius:8px;font-size:0.8rem;font-weight:800;cursor:pointer;border:none;' + (isCodeorg ? (isMinecraft ? 'background:#059669;color:#FFF;box-shadow:0 2px 6px rgba(5,150,105,0.3);' : (isFrozen ? 'background:#0284C7;color:#FFF;box-shadow:0 2px 6px rgba(2,132,199,0.3);' : 'background:#E11D48;color:#FFF;box-shadow:0 2px 6px rgba(225,29,72,0.3);')) : 'background:#E2E8F0;color:#475569;') + '">' +
                    (isMinecraft ? '<i class="fas fa-cube"></i> Desafío Minecraft' : (isFrozen ? '<i class="fas fa-snowflake"></i> Desafío Frozen' : '<i class="fas fa-gamepad"></i> Desafío Code.org')) +
                  '</button>' +
                  '<button type="button" class="apm-deliv-switch-btn ' + (isPaint ? 'active' : '') + '" id="apm-switch-to-paint" style="padding:6px 14px;border-radius:8px;font-size:0.8rem;font-weight:800;cursor:pointer;border:none;' + (isPaint ? 'background:#16A34A;color:#FFF;box-shadow:0 2px 6px rgba(22,163,74,0.3);' : 'background:#E2E8F0;color:#475569;') + '">' +
                    '<i class="fas fa-palette"></i> Dibujo Paint' +
                  '</button>' +
                  '<button type="button" class="apm-deliv-switch-btn ' + (isElectronica ? 'active' : '') + '" id="apm-switch-to-electro" style="padding:6px 14px;border-radius:8px;font-size:0.8rem;font-weight:800;cursor:pointer;border:none;' + (isElectronica ? (isMarcalibro ? 'background:#D97706;color:#FFF;box-shadow:0 2px 6px rgba(217,119,6,0.3);' : (isDiaMadre ? 'background:#E11D48;color:#FFF;box-shadow:0 2px 6px rgba(225,29,72,0.3);' : 'background:#D97706;color:#FFF;box-shadow:0 2px 6px rgba(217,119,6,0.3);')) : 'background:#E2E8F0;color:#475569;') + '">' +
                    (isMarcalibro ? '<i class="fas fa-book-open"></i> Foto Marca-Libros' : (isDiaMadre ? '<i class="fas fa-heart"></i> Foto Tarjeta 3D' : '<i class="fas fa-bolt"></i> Foto / Video Circuito')) +
                  '</button>' +
                  '<button type="button" class="apm-deliv-switch-btn ' + (isScratch ? 'active' : '') + '" id="apm-switch-to-scratch" style="padding:6px 14px;border-radius:8px;font-size:0.8rem;font-weight:800;cursor:pointer;border:none;' + (isScratch ? 'background:#EA580C;color:#FFF;box-shadow:0 2px 6px rgba(234,88,12,0.3);' : 'background:#E2E8F0;color:#475569;') + '">' +
                    '<i class="fas fa-cat"></i> Archivo Scratch Jr' +
                  '</button>' +
                  '<button type="button" class="apm-deliv-switch-btn ' + (isMakecode ? 'active' : '') + '" id="apm-switch-to-mk" style="padding:6px 14px;border-radius:8px;font-size:0.8rem;font-weight:800;cursor:pointer;border:none;' + (isMakecode ? 'background:#7C3AED;color:#FFF;box-shadow:0 2px 6px rgba(124,58,237,0.3);' : 'background:#E2E8F0;color:#475569;') + '">' +
                    '<i class="fas fa-microchip"></i> Link MakeCode' +
                  '</button>' +
                '</div>' +
              '</div>' +

              // SUB-PANEL CODE.ORG / ANGRY BIRDS / FROZEN / MINECRAFT
              '<div id="apm-codeorg-delivery-section" style="' + (isCodeorg ? 'display:block;' : 'display:none;') + '">' +
                '<div class="apm-delivery-header" style="background:' + (isMinecraft ? 'linear-gradient(135deg, #065F46 0%, #059669 100%)' : (isFrozen ? 'linear-gradient(135deg, #0369A1 0%, #0284C7 100%)' : 'linear-gradient(135deg, #BE123C 0%, #E11D48 100%)')) + ';">' +
                  '<div class="apm-dh-icon">' + (isMinecraft ? '<i class="fas fa-cube"></i>' : (isFrozen ? '<i class="fas fa-snowflake"></i>' : '<i class="fas fa-gamepad"></i>')) + '</div>' +
                  '<div>' +
                    '<h4>' + (isMinecraft ? 'Registrar Misión de Minecraft (Code.org Hora del Código)' : (isFrozen ? 'Registrar Misión de Ana y Elsa (Code.org Frozen)' : 'Registrar Misión de Angry Birds (Code.org)')) + '</h4>' +
                    '<p>' + (isMinecraft ? '¡Aprender a programar con Steve y Alex! Si superaste los retos en <strong>https://studio.code.org/s/mc/lessons/1/levels/1</strong> marcá tu entrega con un solo clic para ganar tus <strong>+100 XP</strong>.' : (isFrozen ? '¡Arte y geometría con código! Si superaste los retos en <strong>https://studio.code.org/s/frozen/lessons/1/levels/1</strong> marcá tu entrega con un solo clic para ganar tus <strong>+100 XP</strong>.' : '¡Iniciación a la programación! Si superaste los retos en <strong>https://studio.code.org/es/hoc/1</strong> marcá tu entrega con un solo clic para ganar tus <strong>+100 XP</strong>.')) + '</p>' +
                  '</div>' +
                '</div>' +
                '<div class="apm-delivery-body">' +
                  '<div style="' + (isMinecraft ? 'background:#ECFDF5;border:2px dashed #A7F3D0;' : (isFrozen ? 'background:#F0F9FF;border:2px dashed #BAE6FD;' : 'background:#FFF1F2;border:2px dashed #FDA4AF;')) + 'border-radius:16px;padding:24px;text-align:center;margin-bottom:16px;">' +
                    '<div style="font-size:3.2rem;margin-bottom:8px;">' + (isMinecraft ? '⛏️🧱' : (isFrozen ? '❄️⛸️' : '🐦🎯')) + '</div>' +
                    '<h3 style="font-size:1.3rem;font-weight:900;' + (isMinecraft ? 'color:#065F46;' : (isFrozen ? 'color:#0369A1;' : 'color:#9F1239;')) + 'margin:0 0 8px;">' + (isMinecraft ? '¿Programaste a Steve o Alex en los Desafíos de Minecraft?' : (isFrozen ? '¿Creaste Figuras Geométricas y Copos de Nieve con Elsa?' : '¿Guiaste al Pájaro hasta el Cerdito Verde?')) + '</h3>' +
                    (isMinecraft ? '<div style="margin:8px auto 14px;max-width:520px;padding:8px 12px;background:#FEF3C7;border-left:3px solid #D97706;border-radius:6px;font-size:0.8rem;color:#92400E;text-align:left;line-height:1.4;"><strong><i class="fas fa-exclamation-triangle"></i> Recordatorio pedagógico:</strong> Esta entrega certifica el aprendizaje de programación en bloques en la adaptación oficial de Code.org, no horas de juego libre.</div>' : '') +
                    '<p style="font-size:0.92rem;' + (isMinecraft ? 'color:#064E3B;' : (isFrozen ? 'color:#0C4A6E;' : 'color:#4C0519;')) + 'max-width:550px;margin:0 auto 18px;line-height:1.5;">' +
                      'Hacé clic en el botón de abajo para registrar tu logro en el sistema, completar la estación del mapa y sumar puntos al progreso de tu taller.' +
                    '</p>' +
                    '<button type="button" id="apm-btn-complete-codeorg" class="apm-delivery-submit-btn" style="background:' + (isMinecraft ? '#059669' : (isFrozen ? '#0284C7' : '#E11D48')) + ';font-size:1.05rem;padding:12px 28px;box-shadow:0 4px 12px ' + (isMinecraft ? 'rgba(5,150,105,0.35)' : (isFrozen ? 'rgba(2,132,199,0.35)' : 'rgba(225,29,72,0.35)')) + ';cursor:pointer;">' +
                      (isMinecraft ? '<i class="fas fa-cube"></i> ¡Completé el Reto de Minecraft en Code.org! (+100 XP)' : (isFrozen ? '<i class="fas fa-snowflake"></i> ¡Completé el Reto de Frozen en Code.org! (+100 XP)' : '<i class="fas fa-trophy"></i> ¡Completé el Nivel en Code.org! (+100 XP)')) +
                    '</button>' +
                    '<div style="margin-top:14px;">' +
                      '<a href="' + (mission.gameUrl || (isMinecraft ? 'https://studio.code.org/s/mc/lessons/1/levels/1' : (isFrozen ? 'https://studio.code.org/s/frozen/lessons/1/levels/1' : 'https://studio.code.org/es/hoc/1'))) + '" target="_blank" rel="noopener noreferrer" style="font-size:0.86rem;color:' + (isMinecraft ? '#059669' : (isFrozen ? '#0284C7' : '#E11D48')) + ';font-weight:700;text-decoration:underline;">' +
                        '<i class="fas fa-external-link-alt"></i> Ir a jugar en ' + (isMinecraft ? 'https://studio.code.org/s/mc/lessons/1/levels/1' : (isFrozen ? 'https://studio.code.org/s/frozen/lessons/1/levels/1' : 'https://studio.code.org/es/hoc/1')) +
                      '</a>' +
                    '</div>' +
                  '</div>' +
                  '<div id="apm-codeorg-delivery-status">' +
                    (isAlreadyCompleted ?
                      '<div class="apm-status-badge success" style="padding:12px 18px;border-left:4px solid #10B981;"><i class="fas fa-trophy" style="font-size:1.4rem;color:#F59E0B;"></i> <div><strong style="color:#065F46;">Misión Completada ⭐ (+100 XP)</strong><br><span style="font-size:0.84rem;color:#047857;">¡Desafío de ' + (isMinecraft ? 'Minecraft' : (isFrozen ? 'Ana y Elsa' : 'Angry Birds')) + ' en Code.org registrado con éxito! Tu avance está sumado.</span></div></div>' : '') +
                  '</div>' +
                  '<div class="apm-delivery-guide" style="margin-top:16px;">' +
                    '<h5><i class="fas fa-brain"></i> Objetivos Pedagógicos y Beneficios Cumplidos:</h5>' +
                    (isMinecraft ?
                      '<ol>' +
                        '<li><strong>Programar en vez de Jugar Libremente:</strong> Steve y Alex avanzan, giran o destruyen bloques únicamente cuando el alumno encastra el bloque correcto en la secuencia algorítmica.</li>' +
                        '<li><strong>Orientación Espacial y Cuadrícula:</strong> Contar distancias exactas y planificar movimientos en el plano cuadriculado sin caer al agua ni a la lava.</li>' +
                        '<li><strong>Bucles y Automatización:</strong> Aprender a repetir tareas largas (como talar un árbol completo o esquivar obstáculos) con bloques de repetición.</li>' +
                      '</ol>' :
                     isFrozen ?
                      '<ol>' +
                        '<li><strong>De Paint a la Programación:</strong> En Paint dibujaste figuras a mano con el mouse; con Ana y Elsa le das órdenes exactas (algoritmos) a la computadora para que trace esas mismas figuras en el hielo.</li>' +
                        '<li><strong>Ángulos y Geometría en el Espacio:</strong> Aprender qué es un giro de 90° (esquina recta como en la cancha) y cómo orientar a Elsa en el plano.</li>' +
                        '<li><strong>Bucles y Patrones Repetitivos:</strong> Descubrir que para hacer un cuadrado o un copo de nieve basta con repetir una secuencia de avanzar y girar.</li>' +
                      '</ol>' :
                      '<ol>' +
                        '<li><strong>Secuenciación de Algoritmos:</strong> Comprender que los bloques deben ordenarse paso a paso para que el programa funcione.</li>' +
                        '<li><strong>Lateralidad y Orientación:</strong> Diferenciar entre avanzar, girar a la derecha o izquierda en el espacio.</li>' +
                        '<li><strong>Descomposición & Depuración:</strong> Analizar el error cuando el pájaro choca y corregir el código sin frustración.</li>' +
                      '</ol>'
                    ) +
                  '</div>' +
                '</div>' +
              '</div>' +

              // SUB-PANEL PAINT / DIBUJO DIGITAL
              '<div id="apm-paint-delivery-section" style="' + (isPaint ? 'display:block;' : 'display:none;') + '">' +
                '<div class="apm-delivery-header" style="background:linear-gradient(135deg, #15803D 0%, #16A34A 100%);">' +
                  '<div class="apm-dh-icon"><i class="fas fa-palette"></i></div>' +
                  '<div>' +
                    '<h4>Subir Dibujo o Captura de Paint (.png, .jpg, .bmp)</h4>' +
                    '<p>¡Tu primer diseño digital! Guardá tu dibujo en Paint (Archivo &gt; Guardar) y arrastralo aquí para sumarlo a tu carpeta de Google Drive y ganar <strong>+100 XP</strong>.</p>' +
                  '</div>' +
                '</div>' +
                '<div class="apm-delivery-body">' +
                  '<div class="apm-scratch-dropzone" id="apm-paint-dropzone" style="border-color:#86EFAC;background:#F0FDF4;">' +
                    '<div class="apm-sd-icon" style="color:#16A34A;"><i class="fas fa-palette"></i></div>' +
                    '<h4>Arrastrá tu dibujo de Paint aquí</h4>' +
                    '<p>O hacé clic en el botón para seleccionarlo (.png, .jpg, .jpeg, .bmp, .webp)</p>' +
                    '<input type="file" id="apm-paint-file-input" style="display:none;" accept="image/*,.png,.jpg,.jpeg,.bmp,.webp">' +
                    '<button type="button" id="apm-paint-browse-btn" class="apm-delivery-submit-btn" style="background:#16A34A;"><i class="fas fa-folder-open"></i> Seleccionar Dibujo de Paint</button>' +
                  '</div>' +
                  '<div id="apm-paint-delivery-status" style="margin-top:14px;">' +
                    (savedFileName ?
                      '<div class="apm-status-badge success" style="padding:12px 18px;border-left:4px solid #10B981;"><i class="fas fa-trophy" style="font-size:1.4rem;color:#F59E0B;"></i> <div><strong style="color:#065F46;">Misión Completada ⭐ (+100 XP)</strong><br><span style="font-size:0.84rem;color:#047857;">Dibujo entregado: <strong>' + savedFileName + '</strong> (' + savedFileDate + ') guardado en tu Google Drive.</span></div></div>' : '') +
                  '</div>' +
                  '<div class="apm-delivery-guide" style="margin-top:16px;">' +
                    '<h5><i class="fas fa-lightbulb"></i> ¿Cómo guardar y subir tu dibujo desde Paint?</h5>' +
                    '<ol>' +
                      '<li>En Paint, andá arriba a la izquierda a <strong>Archivo</strong> (o el icono azul de guardar).</li>' +
                      '<li>Elegí <strong>Guardar como</strong> y seleccioná <em>Imagen PNG</em> o <em>Imagen JPEG</em>.</li>' +
                      '<li>Guardalo en el Escritorio o Documentos con tu nombre (ej: <code>' + (isPaintBanderas ? 'banderas_mundial.png' : 'cancha_futbol.png') + '</code>).</li>' +
                      '<li>¡Arrastrá ese archivo dentro del recuadro verde o tocalo con el botón "Seleccionar Dibujo de Paint"!</li>' +
                    '</ol>' +
                  '</div>' +
                '</div>' +
              '</div>' +

              // SUB-PANEL ELECTRÓNICA / CIRCUITO FÍSICO (FOTO O VIDEO)
              '<div id="apm-electro-delivery-section" style="' + (isElectronica ? 'display:block;' : 'display:none;') + '">' +
                '<div class="apm-delivery-header" style="background:' + (isMarcalibro ? 'linear-gradient(135deg, #B45309 0%, #D97706 100%)' : (isDiaMadre ? 'linear-gradient(135deg, #BE123C 0%, #E11D48 100%)' : 'linear-gradient(135deg, #B45309 0%, #D97706 100%)')) + ';">' +
                  '<div class="apm-dh-icon">' + (isMarcalibro ? '<i class="fas fa-book-open"></i>' : (isDiaMadre ? '<i class="fas fa-heart"></i>' : '<i class="fas fa-bolt"></i>')) + '</div>' +
                  '<div>' +
                    '<h4>' + (isMarcalibro ? 'Subir Foto de tu Marca-Libros Origami de Tom Sawyer' : (isDiaMadre ? 'Subir Foto de tu Tarjeta Pop-Up 3D del Día de la Madre' : 'Subir Foto o Video del Circuito Armado')) + '</h4>' +
                    '<p>' + (isMarcalibro ? '¡Proyecto maker esquinero! Tomá una foto donde se vea tu marca-libros colocado en la página de un libro con el sombrero de Tom Sawyer encendido para guardarla en tu Google Drive.' : (isDiaMadre ? '¡Regalo especial para mamá! Tomá una foto donde se vea el corazón en 3D desplegado con tu foto y el LED encendido en el escudo para guardarla en tu Google Drive.' : '¡Proyecto práctico manual! Tomá una foto o video donde se vea tu circuito funcionando con el LED encendido para guardarlo en tu carpeta de Proyectos de Google Drive.')) + '</p>' +
                  '</div>' +
                '</div>' +
                '<div class="apm-delivery-body">' +
                  '<div class="apm-scratch-dropzone" id="apm-electro-dropzone" style="' + (isMarcalibro ? 'border-color:#F59E0B;background:#FFFBEB;' : (isDiaMadre ? 'border-color:#FDA4AF;background:#FFF1F2;' : 'border-color:#F59E0B;background:#FFFBEB;')) + '">' +
                    '<div class="apm-sd-icon" style="color:' + (isMarcalibro ? '#D97706' : (isDiaMadre ? '#E11D48' : '#D97706')) + ';"><i class="fas ' + (isMarcalibro ? 'fa-book-open' : (isDiaMadre ? 'fa-heart' : 'fa-camera')) + '"></i></div>' +
                    '<h4>' + (isMarcalibro ? 'Arrastrá tu foto del marca-libros aquí' : (isDiaMadre ? 'Arrastrá tu foto de la tarjeta 3D aquí' : 'Arrastrá tu foto o video del circuito aquí')) + '</h4>' +
                    '<p>O hacé clic en el botón para seleccionarlo (.jpg, .png, .jpeg, .mp4, .mov, .webp)</p>' +
                    '<input type="file" id="apm-electro-file-input" style="display:none;" accept="image/*,video/*,.png,.jpg,.jpeg,.mp4,.mov,.webp">' +
                    '<button type="button" id="apm-electro-browse-btn" class="apm-delivery-submit-btn" style="background:' + (isMarcalibro ? '#D97706' : (isDiaMadre ? '#E11D48' : '#D97706')) + ';"><i class="fas fa-camera"></i> ' + (isMarcalibro ? 'Seleccionar Foto del Marca-Libros' : (isDiaMadre ? 'Seleccionar Foto de la Tarjeta 3D' : 'Seleccionar Foto / Video')) + '</button>' +
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
                '<div class="apm-delivery-header" style="background:linear-gradient(135deg, ' + (isScratchJrPerspectiva ? '#6B21A8 0%, #9333EA' : '#C2410C 0%, #EA580C') + ' 100%);">' +
                  '<div class="apm-dh-icon"><i class="fas ' + (isScratchJrPerspectiva ? 'fa-search-plus' : 'fa-cat') + '"></i></div>' +
                  '<div>' +
                    '<h4>Subir Creación de Scratch Jr</h4>' +
                    '<p>Subí tu archivo de Scratch Jr (.sjr, .sb3, .pjson, .sb) o una captura de pantalla de tus personajes y bloques para guardarlo en tu carpeta.</p>' +
                  '</div>' +
                '</div>' +
                '<div class="apm-delivery-body">' +
                  (isScratchJrPerspectiva ?
                    '<div style="margin-bottom:14px;background:#FAF5FF;border:1.5px solid #D8B4FE;border-radius:12px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">' +
                      '<div><strong style="color:#581C87;"><i class="fas fa-file-code"></i> ¿Querés guiarte con el ejemplo oficial?</strong><div style="font-size:0.84rem;color:#6B21A8;">Descargá <strong>perpestiva.sjr</strong> para probar la animación en Scratch Jr antes de entregar tu proyecto.</div></div>' +
                      '<a href="' + (mission.projectFileUrl || 'proyectos/perpestiva.sjr') + '" download="perpestiva.sjr" class="arm-btn-primary" style="background:#7C3AED;border-color:#6D28D9;padding:8px 16px;font-size:0.86rem;text-decoration:none;"><i class="fas fa-download"></i> Descargar perpestiva.sjr</a>' +
                    '</div>' :
                   isScratchJrVelocidad ?
                    '<div style="margin-bottom:14px;background:#FFF7ED;border:1.5px solid #FDBA74;border-radius:12px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">' +
                      '<div><strong style="color:#9A3412;"><i class="fas fa-file-code"></i> ¿Querés guiarte con el ejemplo oficial?</strong><div style="font-size:0.84rem;color:#7C2D12;">Descargá <strong>velocidad.sjr</strong> para probarlo en Scratch Jr antes de entregar tu proyecto.</div></div>' +
                      '<a href="' + (mission.projectFileUrl || 'proyectos/velocidad.sjr') + '" download="velocidad.sjr" class="arm-btn-primary" style="background:#EA580C;border-color:#C2410C;padding:8px 16px;font-size:0.86rem;text-decoration:none;"><i class="fas fa-download"></i> Descargar velocidad.sjr</a>' +
                    '</div>' : '') +
                  '<div class="apm-scratch-dropzone" id="apm-scratch-dropzone">' +
                    '<div class="apm-sd-icon" style="color:' + (isScratchJrPerspectiva ? '#7C3AED' : '#EA580C') + ';"><i class="fas fa-cloud-upload-alt"></i></div>' +
                    '<h4>Arrastrá tu archivo de Scratch Jr aquí</h4>' +
                    '<p>O hacé clic en el botón para seleccionarlo (.sjr, .sb3, .pjson, .sb, .png, .jpg)</p>' +
                    '<input type="file" id="apm-scratch-file-input" style="display:none;" accept=".sjr,.sb3,.pjson,.sb,.png,.jpg,.jpeg">' +
                    '<button type="button" id="apm-scratch-browse-btn" class="apm-delivery-submit-btn" style="background:' + (isScratchJrPerspectiva ? '#7C3AED' : '#EA580C') + ';"><i class="fas fa-folder-open"></i> Seleccionar Archivo</button>' +
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
            (isMarcalibro ?
              renderMarcalibroOrigamiSolutionHtml(mission) :
             isScratchJrPerspectiva ?
              renderScratchJrPerspectivaSolutionHtml(mission) :
             isScratchJrVelocidad ?
              renderScratchJrVelocidadSolutionHtml(mission) :
             isCodeorg ?
              renderCodeorgSolutionHtml(mission) :
             isDiaMadre ?
              renderDiaMadreSolutionHtml(mission) :
             isPaint ?
              (isPaintBanderas ? renderPaintBanderasSolutionHtml(mission) :
              '<div class="apm-sol-electro-wrap">' +
                '<div class="apm-sol-electro-header" style="background:linear-gradient(135deg, #15803D 0%, #16A34A 100%);">' +
                  '<div class="apm-seh-icon"><i class="fas fa-shapes"></i></div>' +
                  '<div>' +
                    '<h4>Solución Oficial: Cancha de Fútbol con Figuras Geométricas en Paint</h4>' +
                    '<p>Guía de figuras paso a paso: rectángulo grande (césped y perímetro), línea central, círculo central y arcos con rectángulos chicos.</p>' +
                  '</div>' +
                '</div>' +
                '<div class="apm-sol-electro-body">' +
                  '<div class="apm-circuit-schematic-card" style="margin-bottom:16px;background:#F0FDF4;border:1.5px solid #86EFAC;">' +
                    '<div class="apm-csc-header" style="border-bottom-color:#BBF7D0;">' +
                      '<span style="color:#166534;font-weight:900;"><i class="fas fa-image"></i> Modelo Visual de la Cancha en Paint</span>' +
                      '<a href="img/proyectos/cancha_futbol_paint_guia.png" target="_blank" class="apm-csc-badge" style="background:#16A34A;color:#FFF;text-decoration:none;"><i class="fas fa-external-link-alt"></i> Ver en Grande</a>' +
                    '</div>' +
                    '<div style="text-align:center;padding:12px;background:#FFF;border-radius:10px;margin-top:8px;">' +
                      '<img src="img/proyectos/cancha_futbol_paint_guia.png" alt="Guía Cancha de Fútbol Paint" style="max-height:240px;max-width:100%;object-fit:contain;border-radius:6px;border:1px solid #E2E8F0;box-shadow:0 2px 8px rgba(0,0,0,0.06);">' +
                      '<div style="font-size:0.8rem;color:#64748B;margin-top:6px;">Estructura completa de la cancha: césped verde, perímetro blanco, medio campo con círculo central, arcos y pelota.</div>' +
                    '</div>' +
                  '</div>' +
                  '<div class="apm-sol-visual-guide" style="margin-top:16px;">' +
                    '<h5><i class="fas fa-shapes"></i> Figuras Geométricas Utilizadas:</h5>' +
                    '<div class="apm-pinout-table-wrap">' +
                      '<table class="apm-pinout-table">' +
                        '<thead>' +
                          '<tr>' +
                            '<th>Figura</th>' +
                            '<th>Herramienta Paint</th>' +
                            '<th>Sector de la Cancha</th>' +
                            '<th>Color / Detalle</th>' +
                          '</tr>' +
                        '</thead>' +
                        '<tbody>' +
                          '<tr>' +
                            '<td><strong>🟩 Rectángulo Grande</strong></td>' +
                            '<td>Herramienta Rectángulo</td>' +
                            '<td>Campo de juego principal</td>' +
                            '<td>Línea blanca con relleno verde</td>' +
                          '</tr>' +
                          '<tr>' +
                            '<td><strong>📏 Línea Recta</strong></td>' +
                            '<td>Herramienta Línea</td>' +
                            '<td>Línea del medio campo</td>' +
                            '<td>Blanco (divide la cancha en dos)</td>' +
                          '</tr>' +
                          '<tr>' +
                            '<td><strong>⚪ Círculo (Elipse + Shift)</strong></td>' +
                            '<td>Herramienta Elipse</td>' +
                            '<td>Círculo central y pelota</td>' +
                            '<td>Blanco / Pelota clásica</td>' +
                          '</tr>' +
                          '<tr>' +
                            '<td><strong>🥅 Rectángulos Chicos</strong></td>' +
                            '<td>Herramienta Rectángulo</td>' +
                            '<td>Áreas grande, chica y arcos</td>' +
                            '<td>Blanco en ambos extremos</td>' +
                          '</tr>' +
                          '<tr>' +
                            '<td><strong>🪣 Bote de Pintura</strong></td>' +
                            '<td>Relleno con Color</td>' +
                            '<td>Césped y tribunas</td>' +
                            '<td>Verde brillante para el pasto</td>' +
                          '</tr>' +
                        '</tbody>' +
                      '</table>' +
                    '</div>' +
                  '</div>' +
                  '<div class="apm-troubleshoot-box" style="margin-top:16px;">' +
                    '<h5><i class="fas fa-magic"></i> Consejos y Trucos para Dibujar en Paint</h5>' +
                    '<div class="apm-tb-grid">' +
                      '<div class="apm-tb-item" style="border-left-color:#16A34A;">' +
                        '<h6>1. Círculos redondos perfectos</h6>' +
                        '<p>Mantené apretada la tecla <strong>Shift (Mayús)</strong> mientras arrastrás la herramienta Elipse.</p>' +
                      '</div>' +
                      '<div class="apm-tb-item" style="border-left-color:#2563EB;">' +
                        '<h6>2. Si se pinta toda la pantalla</h6>' +
                        '<p>¡Cuidado con los huecos! Si una línea no cierra bien, el balde se escapa. Apretá <strong>Ctrl + Z</strong> para deshacer.</p>' +
                      '</div>' +
                      '<div class="apm-tb-item" style="border-left-color:#D97706;">' +
                        '<h6>3. Líneas bien derechitas</h6>' +
                        '<p>Al igual que los círculos, mantener <strong>Shift</strong> al trazar líneas hace que salgan 100% horizontales o verticales.</p>' +
                      '</div>' +
                      '<div class="apm-tb-item" style="border-left-color:#7C3AED;">' +
                        '<h6>4. Guardar como PNG</h6>' +
                        '<p>Al terminar, andá a <em>Archivo &gt; Guardar como &gt; Imagen PNG</em> para subirla aquí y sumar tus +100 XP.</p>' +
                      '</div>' +
                    '</div>' +
                  '</div>' +
                '</div>' +
              '</div>') :
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
                    '<div class="apm-circuit-schematic-card" style="margin-bottom:16px;background:#FFFBEB;border:1.5px solid #FCD34D;color:#78350F;">' +
                      '<div class="apm-csc-header" style="border-bottom-color:#FDE68A;">' +
                        '<span style="color:#92400E;font-weight:900;"><i class="fas fa-drafting-compass"></i> ' + (mission.title.includes('Varita') ? 'Esquema de Conexiones de la Varita Mágica' : 'Plano Real de Conexiones del Circuito') + '</span>' +
                        '<a href="' + (mission.pdfUrl || mission.gallery[1]) + '" target="_blank" class="apm-csc-badge" style="background:#D97706;color:#FFF;text-decoration:none;"><i class="fas fa-external-link-alt"></i> Ver en Grande</a>' +
                      '</div>' +
                      '<div style="text-align:center;padding:12px;background:#FFF;border-radius:10px;margin-top:8px;">' +
                        '<img src="' + mission.gallery[1] + '" alt="Plano del Circuito" style="max-height:220px;max-width:100%;object-fit:contain;border-radius:6px;border:1px solid #E2E8F0;box-shadow:0 2px 8px rgba(0,0,0,0.06);">' +
                        '<div style="font-size:0.8rem;color:#64748B;margin-top:6px;">' + (mission.title.includes('Varita') ? 'Montaje en el palito: pistas de cinta conductora hacia el LED superior, pila de botón CR2032 y pulsador táctil en el mango.' : 'Lado posterior del sombrero: pistas de cobre, pila CR2032 y solapa con interruptor de vincha.') + '</div>' +
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
              (isCanva ?
                '<div class="apm-sol-canva-wrap" style="padding:18px 24px;overflow-y:auto;height:100%;">' +
                  '<div style="display:flex;align-items:center;gap:14px;background:#F0F9FF;border:1.5px solid #BAE6FD;border-radius:14px;padding:16px 20px;margin-bottom:18px;">' +
                    '<div style="width:48px;height:48px;border-radius:12px;background:#0284C7;color:#FFF;display:flex;align-items:center;justify-content:center;font-size:1.5rem;flex-shrink:0;"><i class="fas fa-wand-magic-sparkles"></i></div>' +
                    '<div style="flex:1;">' +
                      '<h4 style="margin:0 0 4px;font-size:1.1rem;font-weight:900;color:#0369A1;">Solución Oficial: Arquero con Animación IA en Canva</h4>' +
                      '<p style="margin:0;font-size:0.86rem;color:#0C4A6E;">Flujo completo de producción: fotografía en el aula, segmentación por IA, montaje escénico y animación generativa.</p>' +
                    '</div>' +
                    '<a href="https://www.canva.com/es_419/crear/animaciones/" target="_blank" rel="noopener noreferrer" class="arm-btn-primary" style="background:#0284C7;border-color:#0369A1;padding:8px 18px;font-size:0.86rem;text-decoration:none;">' +
                      '<i class="fas fa-palette"></i> Abrir Canva' +
                    '</a>' +
                  '</div>' +
                  '<div class="apm-sol-steps-list" style="display:flex;flex-direction:column;gap:12px;">' +
                    '<div class="apm-sol-step-item" style="border-left:4px solid #0284C7;background:#FFFFFF;padding:14px 18px;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">' +
                      '<div class="apm-sol-step-num" style="background:#0284C7;color:#FFF;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:0.85rem;margin-bottom:6px;">1</div>' +
                      '<div><strong>Fase 1 - Captura de Foto:</strong> Fotografía en primer plano del rostro y cabeza del alumno en el aula con buena iluminación.</div>' +
                    '</div>' +
                    '<div class="apm-sol-step-item" style="border-left:4px solid #7C3AED;background:#FFFFFF;padding:14px 18px;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">' +
                      '<div class="apm-sol-step-num" style="background:#7C3AED;color:#FFF;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:0.85rem;margin-bottom:6px;">2</div>' +
                      '<div><strong>Fase 2 - Aislamiento de Cabeza con IA:</strong> Algoritmo de visión computacional de Canva (Quitafondos) para eliminar el fondo del aula y dejar limpia la cabeza.</div>' +
                    '</div>' +
                    '<div class="apm-sol-step-item" style="border-left:4px solid #16A34A;background:#FFFFFF;padding:14px 18px;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">' +
                      '<div class="apm-sol-step-num" style="background:#16A34A;color:#FFF;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:0.85rem;margin-bottom:6px;">3</div>' +
                      '<div><strong>Fase 3 - Fotomontaje y Reemplazo de Cabeza:</strong> Búsqueda de una foto de arquero atajando y sustitución de su cabeza original encajando la cabeza del estudiante sobre el cuerpo.</div>' +
                    '</div>' +
                    '<div class="apm-sol-step-item" style="border-left:4px solid #D97706;background:#FFFFFF;padding:14px 18px;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">' +
                      '<div class="apm-sol-step-num" style="background:#D97706;color:#FFF;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:0.85rem;margin-bottom:6px;">4</div>' +
                      '<div><strong>Fase 4 - Animación con IA (Magic Animate):</strong> Motor generativo de Canva que añade movimiento cinemático de atajada y vuelo al arquero y la pelota, exportado en video MP4 o GIF.</div>' +
                    '</div>' +
                  '</div>' +
                '</div>' :
              (isMakecode ?
                '<div style="height:100%;display:flex;flex-direction:column;">' +
                  (isServoJoystick ? '<div style="background:#F0FDFA;border-left:4px solid #0D9488;padding:10px 14px;border-radius:8px;margin:10px 18px 0;font-size:0.83rem;color:#134E4A;"><strong>🧤 Circuito Hardware & Código Oficial MakeCode:</strong> Joystick chico negro en <strong>Pin P1</strong> (0..1023) | Servomotor SG90 del arquero en <strong>Pin P0</strong> (0..180°) | <strong>Lógica MakeCode:</strong> arranque centrado en 90°, mapeo proporcional continuo, límites de seguridad 0..180 y pausa de 20 ms.</div>' : '') +
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
            )) +
          '</div>' : '') +

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

    // ── CONTROLADORES DE PESTAÑA: MI ENTREGA (CODE.ORG, PAINT, ELECTRÓNICA, SCRATCH, MAKECODE) ──
    var switchToCodeorg = modal.querySelector('#apm-switch-to-codeorg');
    var switchToPaint = modal.querySelector('#apm-switch-to-paint');
    var switchToElectro = modal.querySelector('#apm-switch-to-electro');
    var switchToScratch = modal.querySelector('#apm-switch-to-scratch');
    var switchToMk = modal.querySelector('#apm-switch-to-mk');
    var secCodeorg = modal.querySelector('#apm-codeorg-delivery-section');
    var secPaint = modal.querySelector('#apm-paint-delivery-section');
    var secElectro = modal.querySelector('#apm-electro-delivery-section');
    var secScratch = modal.querySelector('#apm-scratch-delivery-section');
    var secMk = modal.querySelector('#apm-mk-delivery-section');

    function setDeliveryMode(mode) {
      if (secCodeorg) secCodeorg.style.display = (mode === 'codeorg' ? 'block' : 'none');
      if (secPaint) secPaint.style.display = (mode === 'paint' ? 'block' : 'none');
      if (secElectro) secElectro.style.display = (mode === 'electro' ? 'block' : 'none');
      if (secScratch) secScratch.style.display = (mode === 'scratch' ? 'block' : 'none');
      if (secMk) secMk.style.display = (mode === 'mk' ? 'block' : 'none');

      if (switchToCodeorg) {
        switchToCodeorg.style.background = (mode === 'codeorg' ? (isMinecraft ? '#059669' : (isFrozen ? '#0284C7' : '#E11D48')) : '#E2E8F0');
        switchToCodeorg.style.color = (mode === 'codeorg' ? '#FFF' : '#475569');
        switchToCodeorg.style.boxShadow = (mode === 'codeorg' ? (isMinecraft ? '0 2px 6px rgba(5,150,105,0.3)' : (isFrozen ? '0 2px 6px rgba(2,132,199,0.3)' : '0 2px 6px rgba(225,29,72,0.3)')) : 'none');
      }
      if (switchToPaint) {
        switchToPaint.style.background = (mode === 'paint' ? (isPaintBanderas ? '#2563EB' : '#16A34A') : '#E2E8F0');
        switchToPaint.style.color = (mode === 'paint' ? '#FFF' : '#475569');
        switchToPaint.style.boxShadow = (mode === 'paint' ? (isPaintBanderas ? '0 2px 6px rgba(37,99,235,0.3)' : '0 2px 6px rgba(22,163,74,0.3)') : 'none');
      }
      if (switchToElectro) {
        switchToElectro.style.background = (mode === 'electro' ? (isMarcalibro ? '#D97706' : (isDiaMadre ? '#E11D48' : '#D97706')) : '#E2E8F0');
        switchToElectro.style.color = (mode === 'electro' ? '#FFF' : '#475569');
        switchToElectro.style.boxShadow = (mode === 'electro' ? (isMarcalibro ? '0 2px 6px rgba(217,119,6,0.3)' : (isDiaMadre ? '0 2px 6px rgba(225,29,72,0.3)' : '0 2px 6px rgba(217,119,6,0.3)')) : 'none');
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
    if (switchToPaint) switchToPaint.onclick = function(){ if (window.sounds) window.sounds.playClick(); setDeliveryMode('paint'); };
    if (switchToElectro) switchToElectro.onclick = function(){ if (window.sounds) window.sounds.playClick(); setDeliveryMode('electro'); };
    if (switchToScratch) switchToScratch.onclick = function(){ if (window.sounds) window.sounds.playClick(); setDeliveryMode('scratch'); };
    if (switchToMk) switchToMk.onclick = function(){ if (window.sounds) window.sounds.playClick(); setDeliveryMode('mk'); };

    // Establecer modo de entrega inicial
    setDeliveryMode(isPaint ? 'paint' : (isCodeorg ? 'codeorg' : (isElectronica ? 'electro' : (isMakecode ? 'mk' : 'scratch'))));

    // --- Subida / Completar Misión Code.org (Angry Birds / Frozen / Minecraft) con 1-Click ---
    var btnCompleteCodeorg = modal.querySelector('#apm-btn-complete-codeorg');
    if (btnCompleteCodeorg) {
      btnCompleteCodeorg.onclick = function() {
        if (window.sounds && window.sounds.playSuccess) window.sounds.playSuccess();
        else if (window.sounds) window.sounds.playClick();

        var nowStr = new Date().toLocaleDateString('es-ES');
        var submissionData = {
          type: 'codeorg',
          gameUrl: mission.gameUrl || (isMinecraft ? 'https://studio.code.org/s/mc/lessons/1/levels/1' : (isFrozen ? 'https://studio.code.org/s/frozen/lessons/1/levels/1' : 'https://studio.code.org/es/hoc/1')),
          date: nowStr,
          completed: true,
          missionId: mission.id,
          missionTitle: mission.title,
          fileName: isMinecraft ? 'Minecraft Code.org (Completado)' : (isFrozen ? 'Ana y Elsa Frozen Code.org (Completado)' : 'Angry Birds Code.org (Completado)')
        };

        markMissionCompleted(student, mission.id, submissionData);

        var stContainer = modal.querySelector('#apm-codeorg-delivery-status');
        if (stContainer) {
          stContainer.innerHTML = '<div class="apm-status-badge success" style="padding:12px 18px;border-left:4px solid #10B981;margin-top:10px;"><i class="fas fa-trophy" style="font-size:1.4rem;color:#F59E0B;"></i> <div><strong style="color:#065F46;">¡Misión Completada con Éxito! ⭐ (+100 XP)</strong><br><span style="font-size:0.84rem;color:#047857;">Se registró tu entrega de ' + (isMinecraft ? 'Minecraft' : (isFrozen ? 'Ana y Elsa' : 'Angry Birds')) + ' (' + nowStr + '). ¡Puntos y avance sumados!</span></div></div>';
        }
        var topBadge = modal.querySelector('#apm-header-status-badge');
        if (topBadge) {
          topBadge.innerHTML = '<span class="apm-lvl-badge" style="background:#10B981;margin-right:6px;"><i class="fas fa-check-circle"></i> ⭐ COMPLETADO</span>';
        }

        if (typeof refreshDashboard === 'function') refreshDashboard();

        alert('🎉 ¡Felicitaciones! Completaste la misión de ' + (isMinecraft ? 'Minecraft (Nivel 8)' : (isFrozen ? 'Ana y Elsa (Nivel 6)' : 'Angry Birds (Nivel 2)')) + '.\nSumaste +100 XP al taller de robótica.');
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

    // --- Subida / Drag & Drop Dibujo de Paint (.png, .jpg, .bmp) ---
    var paintDropzone = modal.querySelector('#apm-paint-dropzone');
    var paintFileInput = modal.querySelector('#apm-paint-file-input');
    var paintBrowseBtn = modal.querySelector('#apm-paint-browse-btn');
    var paintStatusEl = modal.querySelector('#apm-paint-delivery-status');

    if (paintBrowseBtn && paintFileInput) {
      paintBrowseBtn.onclick = function() {
        paintFileInput.click();
      };
    }

    function processPaintUpload(file) {
      if (!file) return;
      var name = file.name.toLowerCase();
      var valid = /\.(jpe?g|png|webp|bmp)$/i.test(name) || /^image\//i.test(file.type || '');
      if (!valid) {
        if (window.sounds) window.sounds.playError();
        alert('Formato no válido. Por favor seleccioná un archivo de imagen o dibujo de Paint (.png, .jpg, .bmp)');
        return;
      }
      if (window.sounds) window.sounds.playSuccess();
      var sz = formatFileSize(file.size);
      if (paintStatusEl) {
        paintStatusEl.innerHTML = '<div class="apm-status-badge warning"><i class="fas fa-sync-alt fa-spin"></i> Subiendo dibujo <strong>' + file.name + '</strong> (' + sz + ')...</div>';
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
          var fields = { filename: file.name, mimeType: file.type || 'image/png', base64: b64, folderId: student.driveFolderId || '', subfolder: 'dibujos' };
          for (var k in fields) {
            var input = document.createElement('input');
            input.type = 'hidden';
            input.name = k;
            input.value = fields[k];
            form.appendChild(input);
          }
          document.body.appendChild(form);
          form.submit();
          setTimeout(function(){ form.remove(); }, 3000);
        }

        var nowStr = new Date().toLocaleDateString('es-UY', { day:'numeric', month:'short' });
        var submissionData = {
          studentId: student ? student.id : 'anon',
          studentName: student ? student.name : 'Alumno',
          fileName: file.name,
          fileSize: sz,
          date: nowStr,
          timestamp: new Date().toISOString(),
          type: 'paint',
          missionId: mission.id,
          missionTitle: mission.title
        };

        // Registrar en FOLDER_CONTENTS.dibujos.items
        if (!FOLDER_CONTENTS.dibujos.items.some(function(it){ return it.name === file.name; })) {
          FOLDER_CONTENTS.dibujos.items.unshift({
            name: file.name,
            title: '🎨 ' + file.name.replace(/\.[^.]+$/, ''),
            size: sz,
            date: nowStr,
            type: 'image',
            url: ev.target.result,
            isLocalPending: true
          });
        }

        var targetMissionId = mission.id;
        markMissionCompleted(student, targetMissionId, submissionData);
        mission.status = 'completado';

        var headerBadge = modal.querySelector('#apm-header-status-badge');
        if (headerBadge) {
          headerBadge.innerHTML = '<span class="apm-lvl-badge" style="background:#10B981;margin-right:6px;"><i class="fas fa-check-circle"></i> ⭐ COMPLETADO</span>';
        }

        if (paintStatusEl) {
          paintStatusEl.innerHTML =
            '<div class="apm-status-badge success" style="padding:12px 18px;border-left:4px solid #10B981;">' +
              '<i class="fas fa-trophy" style="font-size:1.4rem;color:#F59E0B;"></i> ' +
              '<div>' +
                '<strong style="color:#065F46;">Misión Completada ⭐ (+100 XP)</strong><br>' +
                '<span style="font-size:0.84rem;color:#047857;">¡Dibujo entregado con éxito! Archivo: <strong>' + file.name + '</strong> (' + sz + ' • ' + nowStr + ') guardado en tu carpeta de Google Drive. ¡Sumaste +100 XP al Progreso del Taller!</span>' +
              '</div>' +
            '</div>';
        }

        refreshDashboard();
      };
      reader.readAsDataURL(file);
    }

    if (paintFileInput) {
      paintFileInput.onchange = function() {
        if (paintFileInput.files && paintFileInput.files.length > 0) {
          processPaintUpload(paintFileInput.files[0]);
        }
      };
    }

    if (paintDropzone) {
      paintDropzone.addEventListener('dragover', function(e){ e.preventDefault(); paintDropzone.classList.add('drag-over'); }, false);
      paintDropzone.addEventListener('dragleave', function(e){ e.preventDefault(); paintDropzone.classList.remove('drag-over'); }, false);
      paintDropzone.addEventListener('drop', function(e){
        e.preventDefault();
        paintDropzone.classList.remove('drag-over');
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          processPaintUpload(e.dataTransfer.files[0]);
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

  function celebrateMetaArrival() {
    if (window.soundEngine && typeof window.soundEngine.playSuccess === 'function') {
      window.soundEngine.playSuccess();
    }

    var existing = document.getElementById('arm-meta-confetti-container');
    if (existing) existing.remove();

    var container = document.createElement('div');
    container.id = 'arm-meta-confetti-container';
    container.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:999999;overflow:hidden;';
    document.body.appendChild(container);

    var colors = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#FCD34D'];
    for (var i = 0; i < 75; i++) {
      var p = document.createElement('div');
      var color = colors[Math.floor(Math.random() * colors.length)];
      var left = Math.random() * 100;
      var width = Math.random() * 9 + 6;
      var height = Math.random() * 12 + 8;
      var duration = Math.random() * 2.2 + 2;
      var delay = Math.random() * 0.7;
      var rot = Math.random() * 360;

      p.style.cssText = 'position:absolute;top:-20px;left:' + left + 'vw;' +
        'width:' + width + 'px;height:' + height + 'px;background:' + color + ';' +
        'opacity:0.95;border-radius:3px;transform:rotate(' + rot + 'deg);' +
        'animation:armMetaFall ' + duration + 's cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;' +
        'animation-delay:' + delay + 's;';
      container.appendChild(p);
    }

    setTimeout(function() {
      if (container && container.parentNode) {
        container.remove();
      }
    }, 4500);
  }

  window.celebrateMetaArrival = celebrateMetaArrival;
  window.renderGDriveDashboard = renderGDriveDashboard;
  window.renderGDriveExplorer  = renderGDriveDashboard;
  window.openAdventureProjectModal = openAdventureProjectModal;
  window.getAdventureMissionsForStudent = getAdventureMissionsForStudent;
})();

