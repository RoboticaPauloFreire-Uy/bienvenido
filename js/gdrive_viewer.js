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

  function normalizarGradoKey(g) {
    if (typeof window.normalizarGrado === 'function') return window.normalizarGrado(g);
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

  function getStudentGradeGames(student) {
    if (!student) return [];
    var allGrades = (typeof window.getGradesConJuegos === 'function')
      ? window.getGradesConJuegos()
      : ((window.SCHOOL_DATA && window.SCHOOL_DATA.grades) ? window.SCHOOL_DATA.grades : ((window.COURSE_DATA && window.COURSE_DATA.grades) ? window.COURSE_DATA.grades : []));

    var normTarget = normalizarGradoKey(student.gradeId);
    var foundGrade = allGrades.find(function(g) {
      return normalizarGradoKey(g.id) === normTarget;
    });
    return (foundGrade && Array.isArray(foundGrade.games)) ? foundGrade.games.slice() : [];
  }

  // Extensiones por tipo
  var DIBUJO_EXTS   = ['.png', '.jpg', '.jpeg', '.bmp', '.webp', '.gif', '.svg'];
  var VIDEO_EXTS    = ['.mp4', '.mov', '.webm', '.mkv', '.avi', '.m4v', '.3gp', '.ogv'];
  var SCRATCH_EXTS  = ['.sb3', '.sjr', '.pjson', '.sb'];
  var MAKECODE_EXTS = ['.hex', '.uf2', '.js', '.json', '.mkcd'];

  function isVideoFile(name, type) {
    if (type === 'video' || (typeof type === 'string' && type.indexOf('video') !== -1)) return true;
    var ext = extOf(name);
    return VIDEO_EXTS.indexOf(ext) !== -1;
  }

  function isImageFile(name, type) {
    if (type === 'image' || (typeof type === 'string' && type.indexOf('image') !== -1)) return true;
    var ext = extOf(name);
    return DIBUJO_EXTS.indexOf(ext) !== -1;
  }

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
    dibujos:     { name: '📸🎬 Fotos & Videos',    icon: 'fa-photo-video',    items: [] },
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
  let captainTablePage           = 1;
  const CAPTAIN_TABLE_PAGE_SIZE  = 6;
  let isRoadmapGridMode          = false;
  let fbMediaFilter              = 'all'; // 'all' | 'videos' | 'photos' | 'grid' | 'albums'
  let fbSelectedYear             = 'all'; // 'all' | '2026' | '2025' | ...
  let fbSelectedAlbum            = 'all'; // 'all' | 'Halloween' | ...
  let currentFbLightboxIndex     = 0;
  let currentFbLightboxItems     = [];
  let selectedClassProjectIdx    = null; // null => auto-selecciona el último proyecto de clase al ingresar
  let lastSelectedGradeId        = null;

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

  function extractDriveId(str) {
    if (!str || typeof str !== 'string') return '';
    var m1 = str.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (m1 && m1[1]) return m1[1];
    var m2 = str.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (m2 && m2[1]) return m2[1];
    var m3 = str.match(/googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
    if (m3 && m3[1]) return m3[1];
    return '';
  }

  function getDownloadUrl(item) {
    if (!item) return '#';
    var id = item.id || extractDriveId(item.downloadUrl) || extractDriveId(item.url);
    if (id) {
      return 'https://drive.usercontent.google.com/download?id=' + id + '&export=download';
    }
    if (item.downloadUrl && !/\/view(\?|$)/i.test(item.downloadUrl)) {
      return item.downloadUrl;
    }
    return item.url || '#';
  }

  function downloadDriveFileDirect(urlOrId, fileName, e) {
    if (e && e.preventDefault) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (window.sounds && window.sounds.playClick) window.sounds.playClick();

    var driveId = extractDriveId(urlOrId) || (/^[a-zA-Z0-9_-]{18,}$/.test(urlOrId || '') ? urlOrId : '');
    var safeName = (fileName || 'pergamino_taller').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'pergamino_taller';

    // Si es un data: URL local
    if (urlOrId && urlOrId.startsWith('data:')) {
      var aData = document.createElement('a');
      aData.href = urlOrId;
      aData.download = /\.[a-z0-9]{2,4}$/i.test(safeName) ? safeName : (safeName + '.png');
      document.body.appendChild(aData);
      aData.click();
      document.body.removeChild(aData);
      return false;
    }

    var directAttachmentUrl = driveId
      ? ('https://drive.usercontent.google.com/download?id=' + driveId + '&export=download')
      : urlOrId;

    if (!driveId) {
      var aDirect = document.createElement('a');
      aDirect.href = directAttachmentUrl;
      aDirect.setAttribute('download', safeName);
      document.body.appendChild(aDirect);
      aDirect.click();
      document.body.removeChild(aDirect);
      return false;
    }

    // Descarga directa vía Fetch + Blob (CORS habilitado en drive.usercontent.google.com y lh3.googleusercontent.com)
    fetch(directAttachmentUrl)
      .then(function(resp) {
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        return resp.blob();
      })
      .then(function(blob) {
        var ext = '.png';
        if (blob.type === 'image/jpeg') ext = '.jpg';
        else if (blob.type === 'image/webp') ext = '.webp';
        else if (blob.type === 'image/bmp') ext = '.bmp';
        else if (blob.type === 'application/pdf') ext = '.pdf';
        var finalName = /\.[a-z0-9]{2,4}$/i.test(safeName) ? safeName : (safeName + ext);
        var blobUrl = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = blobUrl;
        a.download = finalName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function() { URL.revokeObjectURL(blobUrl); }, 6000);
      })
      .catch(function() {
        // Fallback inmediato: enlace con Content-Disposition: attachment (descarga directo sin abrir /view)
        var aFallback = document.createElement('a');
        aFallback.href = directAttachmentUrl;
        aFallback.setAttribute('download', safeName);
        document.body.appendChild(aFallback);
        aFallback.click();
        document.body.removeChild(aFallback);
      });

    return false;
  }
  window.downloadDriveFileDirect = downloadDriveFileDirect;

  // ──────────────────────────────────────────────────
  // HELPERS: Extracción y enriquecimiento de Año y Álbum/Carpeta
  // Soporta estructura: fotos / [año] / [album (ej. halloween, eventos)]
  // ──────────────────────────────────────────────────
  function getAlbumEmoji(albumName) {
    var a = (albumName || '').toLowerCase().trim();
    if (a.indexOf('hallow') !== -1) return '🎃';
    if (a.indexOf('navi') !== -1) return '🎄';
    if (a.indexOf('event') !== -1) return '🎪';
    if (a.indexOf('feria') !== -1 || a.indexOf('muestra') !== -1 || a.indexOf('ciencia') !== -1) return '🔬';
    if (a.indexOf('robot') !== -1 || a.indexOf('taller') !== -1) return '🤖';
    if (a.indexOf('video') !== -1) return '🎬';
    if (a.indexOf('paint') !== -1 || a.indexOf('dibuj') !== -1) return '🎨';
    if (a.indexOf('poke') !== -1 || a.indexOf('juego') !== -1) return '🎮';
    if (a.indexOf('despedida') !== -1 || a.indexOf('egresad') !== -1 || a.indexOf('gradua') !== -1) return '🎓';
    if (a.indexOf('viaje') !== -1 || a.indexOf('paseo') !== -1 || a.indexOf('salida') !== -1) return '🚀';
    if (a.indexOf('diploma') !== -1) return '📜';
    if (a.indexOf('torneo') !== -1 || a.indexOf('compet') !== -1 || a.indexOf('olimpi') !== -1) return '🏆';
    return '📁';
  }
  window.getAlbumEmoji = getAlbumEmoji;

  function extractItemYear(f) {
    if (f && f.year && f.year !== 'all') return String(f.year);
    var str = ((f && f.folderPath) || '') + ' ' + ((f && f.name) || '') + ' ' + ((f && f.date) || '');
    var m = str.match(/\b(202[0-9])\b/);
    if (m) return m[1];
    return '2026';
  }
  window.extractItemYear = extractItemYear;

  function extractItemAlbum(f) {
    if (f && f.album && f.album !== 'all') return String(f.album);
    var path = ((f && f.folderPath) || '').trim();
    if (path) {
      var parts = path.split(/[\/\\]+/).filter(Boolean);
      var albumParts = parts.filter(function(p){
        var low = p.toLowerCase();
        return low !== 'fotos' && low !== 'drive' && !/^\d{4}$/.test(p);
      });
      if (albumParts.length > 0) {
        var last = albumParts[albumParts.length - 1];
        return last.charAt(0).toUpperCase() + last.slice(1);
      }
    }
    var nm = ((f && f.name) || '').toLowerCase();
    if (nm.indexOf('hallow') !== -1) return 'Halloween';
    if (nm.indexOf('navi') !== -1) return 'Navidad';
    if (nm.indexOf('feria') !== -1 || nm.indexOf('muestra') !== -1) return 'Muestra Anual';
    if (nm.indexOf('paint') !== -1 || nm.indexOf('dibuj') !== -1) return 'Dibujos Paint';
    if (isVideoFile(nm, f && f.type)) return 'Videos de Clase';
    return 'Taller & Proyectos';
  }
  window.extractItemAlbum = extractItemAlbum;

  // ──────────────────────────────────────────────────
  // FETCH: Fotos y Videos del Alumno (Google Drive)
  // Consulta concurrentemente subcarpetas dibujo, videos, fotos y raíz
  // ──────────────────────────────────────────────────
  function fetchRealDriveFiles(student, containerId) {
    var hook = window.GOOGLE_DRIVE_WEBHOOK_URL || (student && student.webhookUrl);
    if (!hook || isLoadingDriveFiles) return;
    isLoadingDriveFiles = true;
    renderGDriveDashboard(containerId);

    var reqDibujo = fetch(hook + '?action=list&folderId=' + student.driveFolderId + '&subfolder=dibujo')
      .then(function(r){ return r.json(); })
      .catch(function(){ return { files: [] }; });
    var reqVideos = fetch(hook + '?action=list&folderId=' + student.driveFolderId + '&subfolder=videos')
      .then(function(r){ return r.json(); })
      .catch(function(){ return { files: [] }; });
    var reqFotos  = fetch(hook + '?action=list&folderId=' + student.driveFolderId + '&subfolder=fotos')
      .then(function(r){ return r.json(); })
      .catch(function(){ return { files: [] }; });

    Promise.all([reqDibujo, reqVideos, reqFotos])
      .then(function(results){
        isLoadingDriveFiles = false;
        hasFetchedDriveFiles = true;

        var allRawFiles = [];
        results.forEach(function(res){
          if (res && Array.isArray(res.files)) {
            allRawFiles = allRawFiles.concat(res.files);
          }
        });

        // Deduplicar archivos
        var seenRaw = {};
        var uniqueFiles = [];
        allRawFiles.forEach(function(f){
          var key = f.id || f.name;
          if (key && !seenRaw[key]) {
            seenRaw[key] = true;
            uniqueFiles.push(f);
          }
        });

        // Rescate automático de proyectos Scratch Jr o MakeCode
        var scratchInMedia = uniqueFiles.filter(function(f){
          return isScratchFile(f.name) || isMakecodeFile(f.name);
        });
        scratchInMedia.forEach(function(f){
          if (!FOLDER_CONTENTS.proyecto.items.some(function(it){ return it.name === f.name || it.id === f.id; })) {
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

        // Filtrar exclusivamente fotos, imágenes y videos (excluyendo proyectos y PDFs)
        var mediaFilesOnly = uniqueFiles.filter(function(f){
          return !isScratchFile(f.name) && !isMakecodeFile(f.name) && f.type !== 'pdf';
        });

        var remote = mediaFilesOnly.map(function(f){
          var isVid = isVideoFile(f.name, f.type);
          var driveId = f.id || extractDriveId(f.downloadUrl) || extractDriveId(f.url);
          var itemYear = extractItemYear(f);
          var itemAlbum = extractItemAlbum(f);
          var itemAlbumIcon = f.albumIcon || getAlbumEmoji(itemAlbum);
          return {
            id: driveId || f.name,
            name: f.name,
            title: f.title || f.name.replace(/\.[^.]+$/,''),
            type: isVid ? 'video' : 'image',
            size: f.size || '—',
            date: f.date || '—',
            year: itemYear,
            album: itemAlbum,
            albumIcon: itemAlbumIcon,
            folderPath: f.folderPath || ('fotos/' + itemYear + '/' + itemAlbum.toLowerCase()),
            folderName: f.folderName || itemAlbum,
            url: isVid
              ? (driveId ? 'https://drive.google.com/file/d/' + driveId + '/preview' : (f.downloadUrl || f.url))
              : (driveId ? 'https://drive.google.com/thumbnail?id=' + driveId + '&sz=w1200' : f.url),
            thumbUrl: driveId ? 'https://drive.google.com/thumbnail?id=' + driveId + '&sz=w800' : (f.url || ''),
            videoEmbedUrl: driveId ? 'https://drive.google.com/file/d/' + driveId + '/preview' : '',
            downloadUrl: f.downloadUrl || (driveId ? 'https://drive.google.com/uc?export=download&id=' + driveId : '')
          };
        });

        var pending = (FOLDER_CONTENTS.dibujos.items || []).filter(function(l){
          return l.isLocalPending && !remote.some(function(r){ return r.name === l.name || (r.id && r.id === l.id); });
        });
        var combined = pending.concat(remote);
        var unique = [];
        var seen = {};
        combined.forEach(function(it){
          var k = it.id || it.name;
          if (!seen[k]) { seen[k] = true; unique.push(it); }
        });
        FOLDER_CONTENTS.dibujos.items = unique;
        renderGDriveDashboard(containerId);
      })
      .catch(function(){
        isLoadingDriveFiles = false;
        hasFetchedDriveFiles = true;
        renderGDriveDashboard(containerId);
      });
  }

  // ──────────────────────────────────────────────────
  // FETCH: Proyectos PDF (carpeta compartida por grado)
  // ──────────────────────────────────────────────────
  function fetchProjectsDriveFiles(student, containerId) {
    var hook = window.GOOGLE_DRIVE_WEBHOOK_URL || (student && student.webhookUrl);
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
    var hook = window.GOOGLE_DRIVE_WEBHOOK_URL || (student && student.webhookUrl);
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
    var hook = window.GOOGLE_DRIVE_WEBHOOK_URL || (student && student.webhookUrl);
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
  // ACTIVIDADES DE CLASE REMOTAS (Firestore clase_activities)
  // ──────────────────────────────────────────────────
  function getClaseActivitiesForStudent(student) {
    if (!student) return [];
    var stGrade = student.gradeId || '';

    var rawList = [];
    if (window.CLASE_ACTIVITIES_CACHE && Array.isArray(window.CLASE_ACTIVITIES_CACHE)) {
      rawList = rawList.concat(window.CLASE_ACTIVITIES_CACHE);
    }
    if (window.HOME_CONTENT && Array.isArray(window.HOME_CONTENT.actividades)) {
      window.HOME_CONTENT.actividades.forEach(function (act) {
        if (!rawList.some(function (r) { return r.id === act.id; })) {
          rawList.push(act);
        }
      });
    }

    return rawList.filter(function (act) {
      if (!act || act.deleted) return false;
      var isClase = (act.tipo === 'clase' || act.tipo === 'taller');
      if (!isClase) return false;

      var grs = act.grados || (act.grado ? [act.grado] : ['todos']);
      if (!Array.isArray(grs)) grs = [grs];

      return grs.indexOf('todos') !== -1 ||
             grs.indexOf(stGrade) !== -1 ||
             act.grado === 'todos' ||
             act.grado === stGrade;
    });
  }

  function listenToClaseActivitiesForDriveViewer() {
    try {
      if (typeof window.db !== 'undefined' && window.db && typeof window.db.collection === 'function') {
        window.db.collection('clase_activities').onSnapshot(function (snapshot) {
          if (!snapshot) return;
          var list = [];
          snapshot.forEach(function (doc) {
            var d = doc.data();
            if (d && !d.deleted) {
              var item = Object.assign({}, d, { id: doc.id });
              list.push(item);
            }
          });
          window.CLASE_ACTIVITIES_CACHE = list;
          var activeSt = window.getActiveStudent ? window.getActiveStudent() : null;
          if (activeSt && document.getElementById('student-drive-dashboard-container')) {
            renderGDriveDashboard('student-drive-dashboard-container');
          }
        }, function (err) {
          console.warn('gdrive_viewer clase_activities listener notice:', err);
        });
      } else {
        setTimeout(listenToClaseActivitiesForDriveViewer, 1000);
      }
    } catch (e) {
      console.warn('listenToClaseActivitiesForDriveViewer error:', e);
    }
  }
  listenToClaseActivitiesForDriveViewer();

  // ──────────────────────────────────────────────────
  // AGREGADOR DE MISIONES / RUTA DE AVENTURAS (MODO 3)
  // Combina proyectos del currículo, MakeCode, actividades de clase y guías de Drive
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
        var isMakecode = !isPaint && (!!p.makecodeUrl || p.type === 'makecode' || p.platform === 'makecode' || (p.tags && p.tags.some(function(t){ return /makecode|micro:?bit/i.test(t); })));
        var isScratch  = !isPaint && (p.type === 'scratch' || p.type === 'codejr' || p.platform === 'codejr' || p.platform === 'scratch' || !!p.scratchId || (p.tags && p.tags.some(function(t){ return /scratch ?jr|codejr|velocidad|perspectiva|perpestiva/i.test(t); })));
        var isCodeorg  = !isPaint && (p.type === 'codeorg' || p.platform === 'codeorg' || (p.externalUrl && p.externalUrl.includes('code.org')) || (p.tags && p.tags.some(function(t){ return /code\.org|angry ?birds|frozen|minecraft/i.test(t); })));
        var isElectronica = !isPaint && !isCodeorg && !isScratch && !isMakecode && (p.type === 'electronica' || p.isElectronica || (p.tags && p.tags.some(function(t){ return /electr[oó]nica|circuito|sin programaci[oó]n|papertronics/i.test(t); })) || (!p.makecodeUrl && !p.scratchId && p.materials && p.materials.some(function(m){ return /led|pila|bater[ií]a|cobre|circuito|motor/i.test((m.title||'') + ' ' + (m.description||'')); })));
        var isMkMicrobit = isMakecode && ((p.makecodeUrl && p.makecodeUrl.includes('microbit.org')) || (p.tags && p.tags.some(function(t){ return /micro:?bit/i.test(t); })) || p.id === 'g6-p2' || /servo|joystick|arquero/i.test(p.title || ''));
        var mkDefaultBadge = isMkMicrobit ? '💻 MakeCode Micro:bit' : '🕹️ MakeCode Arcade';
        var type  = isPaint ? 'paint' : (p.type || (isCodeorg ? 'codeorg' : (isElectronica ? 'electronica' : (isMakecode ? 'makecode' : (isScratch ? 'scratch' : 'robotica')))));
        var badge = p.badge || (isPaint ? '🎨 Arte Digital & Figuras' : (isCodeorg ? '🎮 Programación & Algoritmos' : (isElectronica ? '⚡ Circuito Electrónico' : (isMakecode ? mkDefaultBadge : (isScratch ? '🐱 Scratch Jr' : '🚀 Proyecto Maker')))));
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
          coverImage: p.coverImage || (p.gallery && p.gallery[0]) || (isMakecode || isElectronica ? 'img/microbit.png' : 'img/scratchjr.png'),
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
      if (!missions.some(function(it){
        return (it.makecodeUrl && m.shareUrl && it.makecodeUrl.includes(m.shareUrl.split('/').pop())) ||
               it.title === m.title ||
               (it.title && m.title && it.title.replace(/[^\w]/g, '') === m.title.replace(/[^\w]/g, ''));
      })) {
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
          coverImage: m.coverImage || (m.id === 'g6-p2' || /servo.*joystick|joystick.*servo/i.test(m.title || '') ? 'img/proyectos/servo_joystick_makecode_cover.svg' : 'img/microbit.png'),
          codeSnippet: m.codeSnippet || null,
          gallery: m.coverImage ? [m.coverImage] : [],
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

    // 3. Actividades de Clase (clase_activities desde Firestore o HOME_CONTENT)
    var remoteClase = getClaseActivitiesForStudent(student);
    remoteClase.forEach(function(act) {
      var already = missions.some(function(it){
        return it.id === act.id || (it.title && act.titulo && it.title.trim().toLowerCase() === act.titulo.trim().toLowerCase());
      });
      if (already) return;

      var primaryBtn = (act.botones && act.botones.find(function(b){ return b.principal; })) || (act.botones && act.botones[0]) || null;
      var primaryUrl = primaryBtn ? primaryBtn.url : '';
      var isMk = !!act.makecodeUrl || (primaryUrl && /makecode\.microbit\.org/i.test(primaryUrl));
      var isScratch = (primaryUrl && /scratch\.mit\.edu|codejr\.org/i.test(primaryUrl));
      var isGame = (primaryUrl && /code\.org|toxicode|compute-it/i.test(primaryUrl));

      var missionType = isMk ? 'makecode' : (isScratch ? 'scratch' : (isGame ? 'game' : 'clase'));
      var icon = act.icono || 'fa-chalkboard-teacher';
      if (typeof icon === 'string' && icon.indexOf('fa-') === -1) {
        icon = 'fa-chalkboard-teacher';
      }

      missions.push({
        id: act.id,
        level: levelCount++,
        title: act.titulo || 'Actividad de Clase',
        subtitle: act.desde ? ('Actividad de Clase • ' + act.desde) : (student.gradeName || 'Actividad de Clase'),
        description: act.descripcion || 'Desafío y actividad de clase en el taller de robótica.',
        objective: act.objetivo || act.descripcion || 'Completar el proyecto propuesto por el docente.',
        benefits: act.benefits || act.beneficios || 'Desarrolla el pensamiento computacional, la creatividad maker y la resolución práctica de problemas.',
        gameUrl: primaryUrl || null,
        externalUrl: primaryUrl || null,
        projectFileUrl: null,
        platform: isMk ? 'makecode' : (isScratch ? 'scratch' : null),
        type: missionType,
        tipo: 'clase',
        badge: '🛠️ Actividad de Clase',
        icon: icon,
        color: act.color || '#15803D',
        stars: 3,
        status: isMissionCompleted(student, act.id) ? 'completado' : 'desafio',
        coverImage: act.imagen || 'img/bienvenida_taller.jpg',
        gallery: act.imagen ? [act.imagen] : [],
        pdfUrl: act.pdfUrl || null,
        downloadPdfUrl: act.pdfUrl || null,
        makecodeUrl: isMk ? primaryUrl : (act.makecodeUrl || null),
        scratchId: null,
        materials: act.materiales || [
          { title: 'Materiales del Taller', description: 'Equipos, herramientas y recursos proporcionados en clase' },
          { title: 'Computadora / Tablet', description: 'Para programar y documentar el proyecto' }
        ],
        instructions: act.instrucciones || null,
        schematic: null,
        gradeName: student.gradeName,
        botones: act.botones || []
      });
    });

    // 4. Vincular Guías PDF de Google Drive (FOLDER_CONTENTS.proyectos.items) a los proyectos existentes
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

    // Para 5to y 6to: en los usuarios SOLO mostrar EXACTAMENTE UN ÚNICO proyecto oficial de Halloween con IA
    if (gradeId === 'grado5' || gradeId === 'grado6' || gradeId === '5to' || gradeId === '6to') {
      var officialHw = missions.find(function(m) {
        return m.id === 'g5-p1' || m.id === 'g6-p1';
      });
      if (!officialHw) {
        officialHw = missions.find(function(m) {
          return /halloween|hechizos|monstruo/i.test((m.title || '') + ' ' + (m.id || ''));
        });
      }
      if (officialHw) {
        officialHw.level = 1;
        missions = [officialHw];
      } else {
        missions = missions.slice(0, 1);
      }
    }

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

  function isSpaceTheme(student) {
    if (!student && window.getActiveStudent) student = window.getActiveStudent();
    if (!student) return false;
    if (window.getStudentThemeGroup) return window.getStudentThemeGroup(student) === 'space';
    var gId = (student.gradeId || '').toLowerCase();
    var gName = (student.gradeName || '').toLowerCase();
    return (gId === 'grado2' || gId === '2do' || gId === 'grado3' || gId === '3ero' ||
            /2\s*°|2do|segundo|3\s*°|3ero|tercer/i.test(gName));
  }

  function isCyberTheme(student) {
    if (!student && window.getActiveStudent) student = window.getActiveStudent();
    if (!student) return false;
    if (window.getStudentThemeGroup) return window.getStudentThemeGroup(student) === 'cyber';
    var gId = (student.gradeId || '').toLowerCase();
    var gName = (student.gradeName || '').toLowerCase();
    return (gId === 'grado4' || gId === '4to' || gId === 'grado5' || gId === '5to' ||
            /4\s*°|4to|cuarto|5\s*°|5to|quinto/i.test(gName));
  }

  function isLegacyTheme(student) {
    if (!student && window.getActiveStudent) student = window.getActiveStudent();
    if (!student) return false;
    if (window.getStudentThemeGroup) return window.getStudentThemeGroup(student) === 'legacy';
    var gId = (student.gradeId || '').toLowerCase();
    var gName = (student.gradeName || '').toLowerCase();
    return (gId === 'grado6' || gId === '6to' || /6\s*°|6to|sexto/i.test(gName));
  }

  // ──────────────────────────────────────────────────
  // RENDER HTML DE RUTA DE AVENTURAS (MODO 3)
  // ──────────────────────────────────────────────────
  function renderAdventureRoadmapHtml(student, missions, isGrid) {
    var isLegacy = isLegacyTheme(student);
    var isCyber = isCyberTheme(student);
    var isSpace = isSpaceTheme(student);
    if (!missions || missions.length === 0) {
      return '<div class="gdb-empty-state"><div class="ges-icon">' + (isLegacy ? '🎓' : (isCyber ? '🔌' : (isSpace ? '🪐' : '🗺️'))) + '</div><h4>Sin misiones aún</h4><p>Pronto se publicarán los desafíos para ' + student.gradeName + '.</p></div>';
    }

    // Progreso del Taller: cuenta exactamente las misiones completadas
    var completedCount = missions.filter(function(m){ return m.status === 'completado'; }).length;
    var progressPercent = missions.length > 0 ? Math.min(100, Math.round((completedCount / missions.length) * 100)) : 0;

    var headerHtml =
      '<div class="arm-toolbar-compact ' + (isLegacy ? 'legacy-toolbar' : (isCyber ? 'cyber-toolbar' : (isSpace ? 'space-toolbar' : ''))) + '">' +
        '<div class="atc-left">' +
          '<span class="atc-badge"><i class="fas ' + (isLegacy ? 'fa-graduation-cap' : (isCyber ? 'fa-microchip' : (isSpace ? 'fa-satellite' : 'fa-compass'))) + '"></i> ' + (isLegacy ? 'ANUARIO DE EGRESADOS 2026' : (isCyber ? 'RED NEURONAL MAKER 2026' : (isSpace ? 'CARTA ESTELAR MAKER 2026' : 'CARTA NÁUTICA MAKER 2026'))) + '</span>' +
          '<h3 class="atc-title">' + (isLegacy ? '🎓 Camino del Egresado &bull; ' : (isCyber ? '🔌 Circuito Central &bull; ' : (isSpace ? '🪐 Mapa Estelar &bull; ' : '🗺️ Mapa del Tesoro &bull; '))) + student.gradeName + '</h3>' +
        '</div>' +
        '<div class="arm-view-toggle">' +
          '<button type="button" class="arm-vt-btn ' + (!isGrid ? 'active' : '') + '" data-arm-mode="trail" title="' + (isLegacy ? 'Ver como Camino del Egresado' : (isCyber ? 'Ver como Circuito de Nodos Cyber' : (isSpace ? 'Ver como Mapa Estelar Galáctico' : 'Ver como Mapa Pirata del Tesoro'))) + '">' +
            '<i class="fas ' + (isLegacy ? 'fa-award' : (isCyber ? 'fa-network-wired' : (isSpace ? 'fa-user-astronaut' : 'fa-map-marked-alt'))) + '"></i> <span>' + (isLegacy ? 'Libro de Hitos' : (isCyber ? 'Red de Nodos' : (isSpace ? 'Mapa Estelar' : 'Mapa Pirata'))) + '</span>' +
          '</button>' +
          '<button type="button" class="arm-vt-btn ' + (isGrid ? 'active' : '') + '" data-arm-mode="grid" title="Ver como Cuadrícula">' +
            '<i class="fas fa-th-large"></i> <span>Cuadrícula</span>' +
          '</button>' +
        '</div>' +
      '</div>';

    var sala5SpecialBannerHtml = '';
    var isGrado6 = student && (student.gradeId === 'grado6' || student.gradeId === '6to');
    var isSpotlightGrade = (student.gradeId === 'sala5' || student.gradeId === 'grado1' || student.gradeId === '1ero' || isGrado6);
    if (isSpotlightGrade) {
      var adventureMissions = missions || [];
      var isGrado1 = (student.gradeId === 'grado1' || student.gradeId === '1ero');

      if (isGrado6) {
        var idxG6Canva = adventureMissions.findIndex(function(m){
          return m.id === 'g6-p1' || (/canva|arquero.*ia/i.test(m.title || ''));
        });
        if (idxG6Canva === -1) idxG6Canva = 0;

        var idxG6Servo = adventureMissions.findIndex(function(m){
          return m.id === 'g6-p2' || (/servo.*joystick|joystick.*servo/i.test(m.title || ''));
        });
        if (idxG6Servo === -1) idxG6Servo = 1;

        var idxG6Gemini = adventureMissions.findIndex(function(m){
          return m.id === 'g6-p3' || (/gemini|notebooklm|materiales.*estudio/i.test(m.title || ''));
        });
        if (idxG6Gemini === -1) idxG6Gemini = 2;

        var activeSpotlight = (window.grado6SpotlightCurrentSlide !== undefined) ? window.grado6SpotlightCurrentSlide : 2;
        if (activeSpotlight < 0 || activeSpotlight > 2) activeSpotlight = 2;
        var spotlightTheme = (activeSpotlight === 0) ? 'theme-canva' : (activeSpotlight === 1 ? 'theme-servo' : 'theme-gemini');

        sala5SpecialBannerHtml =
          '<div class="arm-sala5-spotlight-card ' + spotlightTheme + '" id="arm-sala5-spotlight-carousel">' +
            '<div class="arm-s5-carousel-topbar">' +
              '<div class="arm-s5-badge-top">' +
                '<img src="img/escudo_paulo_freire.png" alt="Colegio Paulo Freire" class="arm-s5-crest">' +
                '<span>Colegio Paulo Freire · Taller de Robótica, IA y Programación (6° Grado)</span>' +
              '</div>' +
              '<div class="arm-s5-carousel-nav">' +
                '<button type="button" class="arm-s5-cnav-btn arm-s5-prev-btn" title="Proyecto Anterior" aria-label="Anterior">' +
                  '<i class="fas fa-chevron-left"></i>' +
                '</button>' +
                '<div class="arm-s5-carousel-tabs">' +
                  '<button type="button" class="arm-s5-tab-pill tab-canva ' + (activeSpotlight === 0 ? 'active' : '') + '" data-spotlight-idx="0" data-spotlight-theme="canva">' +
                    '<span>🎨 Canva Arquero IA</span>' +
                  '</button>' +
                  '<button type="button" class="arm-s5-tab-pill tab-servo ' + (activeSpotlight === 1 ? 'active' : '') + '" data-spotlight-idx="1" data-spotlight-theme="servo">' +
                    '<span>🕹️ Servo & Joystick</span>' +
                  '</button>' +
                  '<button type="button" class="arm-s5-tab-pill tab-gemini ' + (activeSpotlight === 2 ? 'active' : '') + '" data-spotlight-idx="2" data-spotlight-theme="gemini">' +
                    '<span>🧠 Geminis Notebook ⚡</span>' +
                  '</button>' +
                '</div>' +
                '<button type="button" class="arm-s5-cnav-btn arm-s5-next-btn" title="Proyecto Siguiente" aria-label="Siguiente">' +
                  '<i class="fas fa-chevron-right"></i>' +
                '</button>' +
              '</div>' +
            '</div>' +

            '<div class="arm-s5-slides-container">' +
              // SLIDE 0: Canva Arquero con IA
              '<div class="arm-s5-slide ' + (activeSpotlight === 0 ? 'active' : '') + '" data-slide-idx="0" style="' + (activeSpotlight === 0 ? 'display:block;' : 'display:none;') + '">' +
                '<span class="arm-s5-watermark">🎨</span>' +
                '<div class="arm-s5-content-row">' +
                  '<div class="arm-s5-preview arm-s5-canva-preview" id="arm-g6-canva-interactive" role="button" tabindex="0" title="¡Hacé click para ver la animación en Canva!">' +
                    '<img src="img/proyectos/canva_arquero_ia_cover.svg" alt="Arquero con IA en Canva" class="arm-s5-preview-img">' +
                    '<div class="arm-s5-led-glow glow-canva" id="arm-g6-glow-canva"><i class="fas fa-wand-magic-sparkles"></i></div>' +
                    '<span class="arm-s5-interactive-hint" style="background:rgba(2, 132, 199, 0.95);"><i class="fas fa-magic"></i> ¡Tocá para probar IA!</span>' +
                  '</div>' +
                  '<div class="arm-s5-info">' +
                    '<div class="arm-s5-tag" style="color:#0284C7;"><i class="fas fa-robot"></i> PROYECTO OFICIAL 6° GRADO • NIVEL 1</div>' +
                    '<h3 class="arm-s5-title" style="color:#0369A1;">El Arquero con Inteligencia Artificial en Canva ⚽🧤🤖</h3>' +
                    '<p class="arm-s5-desc">Fotografía real en el aula, remoción de fondo con <strong>Quitafondos IA</strong>, montaje en plantilla de fútbol y animación de atajada con <strong>Magic Animate</strong> en formato video MP4 o GIF animado.</p>' +
                    '<div class="arm-s5-materials-pills">' +
                      '<span style="border-color:#BAE6FD;color:#0369A1;"><i class="fas fa-camera"></i> Foto en el aula</span>' +
                      '<span style="border-color:#BAE6FD;color:#0369A1;"><i class="fas fa-magic"></i> Quitafondos IA</span>' +
                      '<span style="border-color:#BAE6FD;color:#0369A1;"><i class="fas fa-futbol"></i> Fotomontaje</span>' +
                      '<span style="border-color:#BAE6FD;color:#0369A1;"><i class="fas fa-film"></i> Magic Animate</span>' +
                    '</div>' +
                    '<div class="arm-s5-actions">' +
                      '<button type="button" class="arm-s5-btn-main arm-btn-open-presentation" style="background:linear-gradient(135deg, #0284C7 0%, #7C3AED 100%);box-shadow:0 4px 14px rgba(2,132,199,0.35);" data-mission-idx="' + idxG6Canva + '">' +
                        '<i class="fas fa-chalkboard-teacher"></i> <span>Ver Modo Presentación Guiado</span>' +
                      '</button>' +
                      '<a href="https://www.canva.com/es_419/crear/animaciones/" target="_blank" rel="noopener noreferrer" class="arm-btn-secondary" style="color:#0284C7;border-color:#BAE6FD;padding:9px 18px;text-decoration:none;font-size:0.86rem;font-weight:800;border-radius:10px;display:inline-flex;align-items:center;gap:6px;">' +
                        '<i class="fas fa-palette"></i> <span>Abrir Canva</span>' +
                      '</a>' +
                    '</div>' +
                  '</div>' +
                '</div>' +
              '</div>' +

              // SLIDE 1: El Arquero Mecánico: Servo y Joystick
              '<div class="arm-s5-slide ' + (activeSpotlight === 1 ? 'active' : '') + '" data-slide-idx="1" style="' + (activeSpotlight === 1 ? 'display:block;' : 'display:none;') + '">' +
                '<span class="arm-s5-watermark">🕹️</span>' +
                '<div class="arm-s5-content-row">' +
                  '<div class="arm-s5-preview arm-s5-servo-preview" id="arm-g6-servo-interactive" role="button" tabindex="0" title="¡Hacé click para mover el servomotor!">' +
                    '<img src="img/proyectos/servo_joystick_makecode_cover.svg" alt="Arquero Mecánico Servo y Joystick" class="arm-s5-preview-img">' +
                    '<div class="arm-s5-led-glow glow-servo" id="arm-g6-glow-servo"><i class="fas fa-gamepad"></i></div>' +
                    '<span class="arm-s5-interactive-hint" style="background:linear-gradient(135deg, #0D9488 0%, #4F46E5 100%);"><i class="fas fa-futbol"></i> ¡Tocá para atajar!</span>' +
                  '</div>' +
                  '<div class="arm-s5-info">' +
                    '<div class="arm-s5-tag" style="color:#0D9488;"><i class="fas fa-microchip"></i> PROYECTO OFICIAL 6° GRADO • NIVEL 2</div>' +
                    '<h3 class="arm-s5-title" style="color:#0F766E;">El Arquero Mecánico: Control de Servo y Joystick 🧤🕹️⚙️</h3>' +
                    '<p class="arm-s5-desc">Lectura analógica del <strong>joystick chico negro</strong> en Pin P1 (0..1023), bloque matemático de <strong>ajuste de intervalo (Math.map)</strong> de 0 a 180° y control en tiempo real del <strong>servomotor SG90</strong> en Pin P0.</p>' +
                    '<div class="arm-s5-materials-pills">' +
                      '<span style="border-color:#99F6E4;color:#0F766E;"><i class="fas fa-gamepad"></i> Joystick Chico (P1)</span>' +
                      '<span style="border-color:#99F6E4;color:#0F766E;"><i class="fas fa-calculator"></i> Ajuste Math.map</span>' +
                      '<span style="border-color:#99F6E4;color:#0F766E;"><i class="fas fa-cogs"></i> Servo SG90 (P0)</span>' +
                      '<span style="border-color:#99F6E4;color:#0F766E;"><i class="fas fa-microchip"></i> micro:bit v2</span>' +
                    '</div>' +
                    '<div class="arm-s5-actions">' +
                      '<button type="button" class="arm-s5-btn-main arm-btn-open-presentation" style="background:linear-gradient(135deg, #0D9488 0%, #4F46E5 100%);box-shadow:0 4px 14px rgba(13,148,136,0.35);" data-mission-idx="' + idxG6Servo + '">' +
                        '<i class="fas fa-chalkboard-teacher"></i> <span>Ver Modo Presentación Guiado</span>' +
                      '</button>' +
                      '<a href="https://makecode.microbit.org/S17294-82339-82111-72476" target="_blank" rel="noopener noreferrer" class="arm-btn-secondary" style="color:#0D9488;border-color:#99F6E4;padding:9px 18px;text-decoration:none;font-size:0.86rem;font-weight:800;border-radius:10px;display:inline-flex;align-items:center;gap:6px;">' +
                        '<i class="fas fa-code"></i> <span>Abrir MakeCode</span>' +
                      '</a>' +
                    '</div>' +
                  '</div>' +
                '</div>' +
              '</div>' +

              // SLIDE 2: Gemini & NotebookLM: Materiales de Estudio con IA
              '<div class="arm-s5-slide ' + (activeSpotlight === 2 ? 'active' : '') + '" data-slide-idx="2" style="' + (activeSpotlight === 2 ? 'display:block;' : 'display:none;') + '">' +
                '<span class="arm-s5-watermark">🧠</span>' +
                '<div class="arm-s5-content-row">' +
                  '<div class="arm-s5-preview arm-s5-gemini-preview" id="arm-g6-gemini-interactive" role="button" tabindex="0" title="¡Hacé click para probar la generación con IA!">' +
                    '<img src="img/proyectos/gemini_notebooks_cover.svg" alt="Gemini NotebookLM Ecosistema" class="arm-s5-preview-img">' +
                    '<div class="arm-s5-led-glow glow-gemini" id="arm-g6-glow-gemini"><i class="fas fa-brain"></i></div>' +
                    '<span class="arm-s5-interactive-hint" style="background:linear-gradient(135deg, #4F46E5 0%, #EC4899 100%);"><i class="fas fa-sparkles"></i> ¡Generar con IA!</span>' +
                  '</div>' +
                  '<div class="arm-s5-info">' +
                    '<div class="arm-s5-tag" style="color:#4F46E5;"><i class="fas fa-brain"></i> PROYECTO OFICIAL 6° GRADO • NIVEL 3</div>' +
                    '<h3 class="arm-s5-title" style="color:#3730A3;">NIVEL 3 — Geminis Notebook ⚡: Creación de Materiales de Estudio con IA 🧠🎙️📽️📊</h3>' +
                    '<p class="arm-s5-desc">Ecosistema de IA con anclaje estricto a fuentes confiables (Grounding): generá <strong>podcasts con dos locutores sintetizados (Audio Overview)</strong>, <strong>guiones audiovisuales para video educativo</strong>, <strong>esquemas para Canva</strong> y <strong>guías de estudio con flashcards para autoevaluación</strong> sin alucinaciones.</p>' +
                    '<div class="arm-s5-materials-pills">' +
                      '<span style="border-color:#C7D2FE;color:#3730A3;"><i class="fas fa-microphone"></i> Podcasts (Audio Overview)</span>' +
                      '<span style="border-color:#C7D2FE;color:#3730A3;"><i class="fas fa-video"></i> Guiones de Video</span>' +
                      '<span style="border-color:#C7D2FE;color:#3730A3;"><i class="fas fa-tv"></i> Diapositivas Canva</span>' +
                      '<span style="border-color:#C7D2FE;color:#3730A3;"><i class="fas fa-question-circle"></i> Flashcards & FAQs</span>' +
                      '<span style="border-color:#C7D2FE;color:#3730A3;"><i class="fas fa-file-pdf"></i> Guía PDF Completa</span>' +
                    '</div>' +
                    '<div class="arm-s5-actions">' +
                      '<button type="button" class="arm-s5-btn-main arm-btn-open-presentation" style="background:linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);box-shadow:0 4px 14px rgba(79,70,229,0.35);" data-mission-idx="' + idxG6Gemini + '">' +
                        '<i class="fas fa-chalkboard-teacher"></i> <span>Ver Modo Presentación Guiado</span>' +
                      '</button>' +
                      '<a href="docs/guia_ia_gemini_notebooks.pdf" target="_blank" download="guia_ia_gemini_notebooks.pdf" class="arm-s5-btn-pdf arm-btn-open-pdf" style="color:#DB2777;border-color:#FBCFE8;text-decoration:none;" data-mission-idx="' + idxG6Gemini + '">' +
                        '<i class="fas fa-file-pdf"></i> <span>Descargar Guía PDF Completa</span>' +
                      '</a>' +
                      '<a href="https://notebooklm.google.com" target="_blank" rel="noopener noreferrer" class="arm-btn-secondary" style="color:#4F46E5;border-color:#C7D2FE;padding:9px 18px;text-decoration:none;font-size:0.86rem;font-weight:800;border-radius:10px;display:inline-flex;align-items:center;gap:6px;">' +
                        '<i class="fas fa-external-link-alt"></i> <span>Abrir NotebookLM</span>' +
                      '</a>' +
                    '</div>' +
                  '</div>' +
                '</div>' +
              '</div>' +
            '</div>' +

            // Dots para 6to
            '<div class="arm-s5-carousel-dots">' +
              '<span class="arm-s5-dot ' + (activeSpotlight === 0 ? 'active' : '') + '" data-spotlight-idx="0" title="Canva Arquero con IA"></span>' +
              '<span class="arm-s5-dot ' + (activeSpotlight === 1 ? 'active' : '') + '" data-spotlight-idx="1" title="El Arquero Mecánico: Servo y Joystick"></span>' +
              '<span class="arm-s5-dot ' + (activeSpotlight === 2 ? 'active' : '') + '" data-spotlight-idx="2" title="NIVEL 3 — Geminis Notebook ⚡"></span>' +
            '</div>' +
          '</div>';

      } else {

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
      // ── MAPA DEL TESORO PIRATA CON BARCO Y SENDERO CURVADO ──
      var pirateShipSvg =
        '<svg class="pirate-ship-svg" viewBox="0 0 260 210" width="150" height="120" xmlns="http://www.w3.org/2000/svg" aria-label="Galeón Paulo Freire">' +
          '<defs>' +
            '<linearGradient id="shipWoodGrad" x1="0%" y1="0%" x2="100%" y2="100%">' +
              '<stop offset="0%" stop-color="#8B4513"/>' +
              '<stop offset="50%" stop-color="#5C2C16"/>' +
              '<stop offset="100%" stop-color="#3B1D0E"/>' +
            '</linearGradient>' +
            '<linearGradient id="sailGrad" x1="0%" y1="0%" x2="100%" y2="100%">' +
              '<stop offset="0%" stop-color="#FFFDF5"/>' +
              '<stop offset="100%" stop-color="#EEDBB7"/>' +
            '</linearGradient>' +
            '<linearGradient id="goldTrimGrad" x1="0%" y1="0%" x2="100%" y2="100%">' +
              '<stop offset="0%" stop-color="#FDE047"/>' +
              '<stop offset="100%" stop-color="#D97706"/>' +
            '</linearGradient>' +
            '<filter id="shipShadow" x="-10%" y="-10%" width="130%" height="130%">' +
              '<feDropShadow dx="0" dy="5" stdDeviation="5" flood-opacity="0.35"/>' +
            '</filter>' +
          '</defs>' +
          '<g class="pirate-ship-bobbing" filter="url(#shipShadow)">' +
            '<ellipse cx="130" cy="186" rx="85" ry="10" fill="rgba(14, 116, 144, 0.28)"/>' +
            '<line x1="205" y1="125" x2="255" y2="100" stroke="#5C2C16" stroke-width="4" stroke-linecap="round"/>' +
            '<line x1="200" y1="127" x2="245" y2="105" stroke="#D97706" stroke-width="1.5"/>' +
            '<line x1="60" y1="125" x2="125" y2="35" stroke="#78350F" stroke-width="1.5" stroke-dasharray="3 2" opacity="0.65"/>' +
            '<line x1="190" y1="125" x2="125" y2="35" stroke="#78350F" stroke-width="1.5" stroke-dasharray="3 2" opacity="0.65"/>' +
            '<line x1="130" y1="125" x2="175" y2="55" stroke="#78350F" stroke-width="1.5" stroke-dasharray="3 2" opacity="0.65"/>' +
            '<line x1="240" y1="105" x2="175" y2="55" stroke="#78350F" stroke-width="1.5" opacity="0.5"/>' +
            '<rect x="75" y="60" width="6" height="75" fill="#451A03" rx="2"/>' +
            '<rect x="122" y="25" width="8" height="110" fill="#451A03" rx="3"/>' +
            '<rect x="172" y="48" width="6" height="85" fill="#451A03" rx="2"/>' +
            '<path d="M 116 40 L 136 40 L 133 50 L 119 50 Z" fill="#78350F" stroke="#3B1D0E" stroke-width="1.5"/>' +
            '<line x1="116" y1="45" x2="136" y2="45" stroke="#D97706" stroke-width="1"/>' +
            '<g class="pirate-flag-wave">' +
              '<path d="M 126 22 L 96 16 C 102 22, 96 28, 100 32 L 126 30 Z" fill="#0F172A"/>' +
              '<circle cx="111" cy="23" r="3.5" fill="#FFFFFF"/>' +
              '<path d="M 108 25.5 L 114 25.5 L 113 28 L 109 28 Z" fill="#FFFFFF"/>' +
              '<line x1="106" y1="21" x2="116" y2="27" stroke="#FFFFFF" stroke-width="1"/>' +
              '<line x1="106" y1="27" x2="116" y2="21" stroke="#FFFFFF" stroke-width="1"/>' +
            '</g>' +
            '<path d="M 170 55 C 190 65, 192 90, 172 95 C 185 85, 185 70, 170 55 Z" fill="url(#sailGrad)" stroke="#B45309" stroke-width="1.5"/>' +
            '<path d="M 105 52 C 126 48, 142 48, 147 52 C 144 72, 110 72, 105 52 Z" fill="url(#sailGrad)" stroke="#B45309" stroke-width="1.5"/>' +
            '<path d="M 120 52 L 128 52 L 128 70 L 120 70 Z" fill="none" stroke="#DC2626" stroke-width="2"/>' +
            '<path d="M 98 78 C 126 72, 150 72, 154 78 C 152 118, 102 118, 98 78 Z" fill="url(#sailGrad)" stroke="#B45309" stroke-width="2"/>' +
            '<path d="M 112 80 C 114 96, 114 105, 113 115" stroke="#DC2626" stroke-width="3" fill="none"/>' +
            '<path d="M 138 80 C 137 96, 137 105, 138 115" stroke="#DC2626" stroke-width="3" fill="none"/>' +
            '<circle cx="125" cy="97" r="7" fill="none" stroke="#1E293B" stroke-width="2"/>' +
            '<circle cx="125" cy="97" r="3" fill="#D97706"/>' +
            '<path d="M 58 70 C 74 65, 84 68, 80 82 C 70 95, 60 90, 58 70 Z" fill="url(#sailGrad)" stroke="#B45309" stroke-width="1.5"/>' +
            '<path d="M 46 128 C 48 165, 80 182, 130 182 C 185 182, 212 162, 222 135 C 226 128, 220 125, 208 125 L 48 125 C 42 125, 43 126, 46 128 Z" fill="url(#shipWoodGrad)" stroke="#3B1D0E" stroke-width="2.5"/>' +
            '<path d="M 48 138 C 90 148, 170 148, 218 138" stroke="#3B1D0E" stroke-width="1.2" fill="none" opacity="0.6"/>' +
            '<path d="M 54 150 C 95 162, 165 162, 210 150" stroke="#3B1D0E" stroke-width="1.2" fill="none" opacity="0.6"/>' +
            '<path d="M 68 164 C 100 174, 155 174, 195 164" stroke="#3B1D0E" stroke-width="1.2" fill="none" opacity="0.6"/>' +
            '<path d="M 44 126 L 216 126 L 214 130 L 46 130 Z" fill="url(#goldTrimGrad)"/>' +
            '<circle cx="82" cy="144" r="5" fill="#1E293B" stroke="#F59E0B" stroke-width="1.8"/>' +
            '<circle cx="112" cy="146" r="5" fill="#1E293B" stroke="#F59E0B" stroke-width="1.8"/>' +
            '<circle cx="142" cy="146" r="5" fill="#1E293B" stroke="#F59E0B" stroke-width="1.8"/>' +
            '<circle cx="172" cy="144" r="5" fill="#1E293B" stroke="#F59E0B" stroke-width="1.8"/>' +
            '<g transform="translate(195, 142)">' +
              '<circle cx="6" cy="4" r="3" fill="none" stroke="#64748B" stroke-width="1.5"/>' +
              '<line x1="6" y1="7" x2="6" y2="20" stroke="#475569" stroke-width="2"/>' +
              '<line x1="2" y1="10" x2="10" y2="10" stroke="#475569" stroke-width="1.5"/>' +
              '<path d="M 1 17 C 3 22, 9 22, 11 17" fill="none" stroke="#475569" stroke-width="2"/>' +
            '</g>' +
            '<rect x="42" y="112" width="22" height="15" fill="#5C2C16" stroke="#3B1D0E" stroke-width="1.5"/>' +
            '<rect x="46" y="116" width="5" height="7" fill="#FEF08A" stroke="#D97706" stroke-width="1"/>' +
            '<rect x="54" y="116" width="5" height="7" fill="#FEF08A" stroke="#D97706" stroke-width="1"/>' +
            '<circle cx="39" cy="114" r="3" fill="#FDE047" stroke="#D97706" stroke-width="1"/>' +
          '</g>' +
          '<path class="pirate-ship-front-wave" d="M 20 180 C 60 174, 90 186, 130 180 C 170 174, 200 186, 240 180 C 250 182, 250 195, 230 195 C 190 195, 70 195, 20 195 Z" fill="#0284C7" opacity="0.55"/>' +
          '<path class="pirate-ship-foam" d="M 40 178 Q 70 184 100 178 Q 130 184 160 178 Q 190 184 220 178" stroke="#FFFFFF" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
        '</svg>';

      var spaceShuttleSvg =
        '<svg class="pirate-ship-svg space-shuttle-svg" viewBox="0 0 260 210" width="150" height="120" xmlns="http://www.w3.org/2000/svg" aria-label="Nave Espacial Paulo Freire">' +
          '<defs>' +
            '<linearGradient id="hullGrad" x1="0%" y1="0%" x2="100%" y2="100%">' +
              '<stop offset="0%" stop-color="#F8FAFC"/>' +
              '<stop offset="55%" stop-color="#E2E8F0"/>' +
              '<stop offset="100%" stop-color="#94A3B8"/>' +
            '</linearGradient>' +
            '<linearGradient id="wingGrad" x1="0%" y1="0%" x2="100%" y2="100%">' +
              '<stop offset="0%" stop-color="#38BDF8"/>' +
              '<stop offset="50%" stop-color="#0284C7"/>' +
              '<stop offset="100%" stop-color="#1E3A8A"/>' +
            '</linearGradient>' +
            '<linearGradient id="thrusterGrad" x1="0%" y1="0%" x2="100%" y2="0%">' +
              '<stop offset="0%" stop-color="#22D3EE"/>' +
              '<stop offset="50%" stop-color="#FDE047"/>' +
              '<stop offset="100%" stop-color="#F97316"/>' +
            '</linearGradient>' +
          '</defs>' +
          '<g class="pirate-ship-bobbing">' +
            '<!-- Halo de propulsión antigravedad -->' +
            '<ellipse cx="130" cy="182" rx="82" ry="12" fill="rgba(56, 189, 248, 0.28)"/>' +
            '<!-- Estela de plasma del motor -->' +
            '<path d="M 55 128 L 10 116 L 26 132 L 6 142 L 55 144 Z" fill="url(#thrusterGrad)" opacity="0.9"/>' +
            '<!-- Aleta dorsal superior -->' +
            '<path d="M 75 102 L 48 64 L 88 74 L 112 104 Z" fill="url(#wingGrad)" stroke="#38BDF8" stroke-width="1.8"/>' +
            '<!-- Alas delta espaciales -->' +
            '<path d="M 82 135 L 48 168 L 115 162 L 155 138 Z" fill="url(#wingGrad)" stroke="#7DD3FC" stroke-width="2"/>' +
            '<!-- Fuselaje principal de la nave -->' +
            '<path d="M 52 118 C 52 96, 110 88, 175 96 C 212 101, 238 116, 245 128 C 238 140, 212 151, 175 154 C 110 158, 52 146, 52 118 Z" fill="url(#hullGrad)" stroke="#0284C7" stroke-width="2.5"/>' +
            '<!-- Franja tecnológica cian/violeta -->' +
            '<path d="M 62 126 L 228 126 L 220 134 L 62 134 Z" fill="#0284C7"/>' +
            '<!-- Cabina panorámica iluminada -->' +
            '<path d="M 172 103 C 196 105, 218 114, 226 123 C 210 125, 186 124, 168 118 Z" fill="#22D3EE" stroke="#0369A1" stroke-width="1.8"/>' +
            '<!-- Escotillas iluminadas -->' +
            '<circle cx="102" cy="116" r="6.5" fill="#0F172A" stroke="#38BDF8" stroke-width="2"/>' +
            '<circle cx="126" cy="116" r="6.5" fill="#0F172A" stroke="#38BDF8" stroke-width="2"/>' +
            '<circle cx="150" cy="116" r="6.5" fill="#0F172A" stroke="#38BDF8" stroke-width="2"/>' +
            '<circle cx="100" cy="114" r="2" fill="#BAE6FD"/>' +
            '<circle cx="124" cy="114" r="2" fill="#BAE6FD"/>' +
            '<circle cx="148" cy="114" r="2" fill="#BAE6FD"/>' +
            '<!-- Toberas traseras -->' +
            '<rect x="44" y="112" width="10" height="14" rx="3" fill="#1E293B" stroke="#38BDF8" stroke-width="1.5"/>' +
            '<rect x="44" y="128" width="10" height="14" rx="3" fill="#1E293B" stroke="#38BDF8" stroke-width="1.5"/>' +
          '</g>' +
          '<path class="pirate-ship-foam" d="M 35 178 Q 75 170 115 178 Q 155 186 195 178 Q 220 172 240 178" stroke="#38BDF8" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.8"/>' +
        '</svg>';

      var cyberCoreBotSvg =
        '<svg class="pirate-ship-svg cyber-bot-svg" viewBox="0 0 260 210" width="150" height="120" xmlns="http://www.w3.org/2000/svg" aria-label="Núcleo Robótico Cyber Paulo Freire">' +
          '<defs>' +
            '<linearGradient id="cyChassisGrad" x1="0%" y1="0%" x2="100%" y2="100%">' +
              '<stop offset="0%" stop-color="#1E293B"/>' +
              '<stop offset="55%" stop-color="#0F172A"/>' +
              '<stop offset="100%" stop-color="#020617"/>' +
            '</linearGradient>' +
            '<linearGradient id="cyNeonGreen" x1="0%" y1="0%" x2="100%" y2="0%">' +
              '<stop offset="0%" stop-color="#10B981"/>' +
              '<stop offset="50%" stop-color="#34D399"/>' +
              '<stop offset="100%" stop-color="#059669"/>' +
            '</linearGradient>' +
            '<linearGradient id="cyMagentaGlow" x1="0%" y1="0%" x2="100%" y2="100%">' +
              '<stop offset="0%" stop-color="#EC4899"/>' +
              '<stop offset="100%" stop-color="#8B5CF6"/>' +
            '</linearGradient>' +
          '</defs>' +
          '<g class="pirate-ship-bobbing">' +
            '<!-- Plataforma magnética de circuito -->' +
            '<ellipse cx="130" cy="182" rx="88" ry="12" fill="rgba(16, 185, 129, 0.28)"/>' +
            '<ellipse cx="130" cy="182" rx="64" ry="7" fill="none" stroke="#34D399" stroke-width="1.8" stroke-dasharray="6 4"/>' +
            '<!-- Antenas receptoras de IA -->' +
            '<line x1="95" y1="52" x2="80" y2="22" stroke="#10B981" stroke-width="3" stroke-linecap="round"/>' +
            '<circle cx="80" cy="20" r="5" fill="#34D399"/>' +
            '<line x1="165" y1="52" x2="180" y2="22" stroke="#EC4899" stroke-width="3" stroke-linecap="round"/>' +
            '<circle cx="180" cy="20" r="5" fill="#F472B6"/>' +
            '<!-- Brazos robóticos articulados laterales -->' +
            '<path d="M 68 106 L 38 92 L 30 118 L 54 132" fill="none" stroke="#10B981" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>' +
            '<circle cx="38" cy="92" r="5" fill="#FACC15" stroke="#0F172A" stroke-width="1.5"/>' +
            '<path d="M 192 106 L 222 92 L 230 118 L 206 132" fill="none" stroke="#EC4899" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>' +
            '<circle cx="222" cy="92" r="5" fill="#FACC15" stroke="#0F172A" stroke-width="1.5"/>' +
            '<!-- Chasis Central de Procesador / Robot -->' +
            '<rect x="68" y="48" width="124" height="108" rx="22" fill="url(#cyChassisGrad)" stroke="#10B981" stroke-width="3"/>' +
            '<!-- Visor Digital LED del Robot -->' +
            '<rect x="82" y="62" width="96" height="36" rx="10" fill="#020617" stroke="#34D399" stroke-width="2"/>' +
            '<circle cx="108" cy="80" r="8" fill="#10B981"/>' +
            '<circle cx="106" cy="78" r="2.5" fill="#ECFDF5"/>' +
            '<circle cx="152" cy="80" r="8" fill="#10B981"/>' +
            '<circle cx="150" cy="78" r="2.5" fill="#ECFDF5"/>' +
            '<path d="M 122 86 Q 130 92 138 86" fill="none" stroke="#34D399" stroke-width="2.5" stroke-linecap="round"/>' +
            '<!-- Matriz Micro:bit / Núcleo Cuántico en el pecho -->' +
            '<rect x="92" y="108" width="76" height="36" rx="6" fill="#090D1E" stroke="url(#cyMagentaGlow)" stroke-width="2"/>' +
            '<circle cx="106" cy="120" r="3" fill="#F43F5E"/><circle cx="118" cy="120" r="3" fill="#34D399"/><circle cx="130" cy="120" r="3" fill="#FACC15"/><circle cx="142" cy="120" r="3" fill="#34D399"/><circle cx="154" cy="120" r="3" fill="#F43F5E"/>' +
            '<circle cx="106" cy="132" r="3" fill="#34D399"/><circle cx="118" cy="132" r="3" fill="#EC4899"/><circle cx="130" cy="132" r="3" fill="#34D399"/><circle cx="142" cy="132" r="3" fill="#EC4899"/><circle cx="154" cy="132" r="3" fill="#34D399"/>' +
            '<!-- Pines dorados inferiores tipo Microchip -->' +
            '<rect x="88" y="156" width="8" height="14" rx="2" fill="#FACC15"/>' +
            '<rect x="106" y="156" width="8" height="14" rx="2" fill="#FACC15"/>' +
            '<rect x="126" y="156" width="8" height="14" rx="2" fill="#FACC15"/>' +
            '<rect x="146" y="156" width="8" height="14" rx="2" fill="#FACC15"/>' +
            '<rect x="164" y="156" width="8" height="14" rx="2" fill="#FACC15"/>' +
          '</g>' +
          '<path class="pirate-ship-foam" d="M 30 178 L 70 178 L 80 170 L 110 184 L 130 172 L 150 184 L 180 170 L 190 178 L 230 178" stroke="#10B981" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
        '</svg>';

      var legacyGradArchSvg =
        '<svg class="pirate-ship-svg legacy-arch-svg" viewBox="0 0 260 210" width="150" height="120" xmlns="http://www.w3.org/2000/svg" aria-label="Portal de Graduados Paulo Freire">' +
          '<defs>' +
            '<linearGradient id="legGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">' +
              '<stop offset="0%" stop-color="#FDE047"/>' +
              '<stop offset="50%" stop-color="#F59E0B"/>' +
              '<stop offset="100%" stop-color="#B45309"/>' +
            '</linearGradient>' +
            '<linearGradient id="legCapGrad" x1="0%" y1="0%" x2="100%" y2="100%">' +
              '<stop offset="0%" stop-color="#1E1B4B"/>' +
              '<stop offset="60%" stop-color="#0F172A"/>' +
              '<stop offset="100%" stop-color="#020617"/>' +
            '</linearGradient>' +
            '<linearGradient id="legRibbonRed" x1="0%" y1="0%" x2="100%" y2="100%">' +
              '<stop offset="0%" stop-color="#EF4444"/>' +
              '<stop offset="100%" stop-color="#991B1B"/>' +
            '</linearGradient>' +
            '<filter id="legGoldGlow" x="-20%" y="-20%" width="140%" height="140%">' +
              '<feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="rgba(245,158,11,0.5)"/>' +
            '</filter>' +
          '</defs>' +
          '<g class="pirate-ship-bobbing" filter="url(#legGoldGlow)">' +
            '<!-- Base y sombra pedestal -->' +
            '<ellipse cx="130" cy="184" rx="86" ry="12" fill="rgba(245, 158, 11, 0.28)"/>' +
            '<rect x="65" y="162" width="130" height="18" rx="5" fill="#1E1B4B" stroke="url(#legGoldGrad)" stroke-width="2.5"/>' +
            '<rect x="75" y="152" width="110" height="12" rx="3" fill="#312E81" stroke="url(#legGoldGrad)" stroke-width="1.8"/>' +
            '<!-- Columnas y Arco de Triunfo con Laureles -->' +
            '<path d="M 68 152 L 68 70 Q 130 20 192 70 L 192 152" fill="none" stroke="url(#legGoldGrad)" stroke-width="5" stroke-linecap="round"/>' +
            '<path d="M 78 152 L 78 78 Q 130 38 182 78 L 182 152" fill="none" stroke="#FDE047" stroke-width="1.8" stroke-dasharray="5 3"/>' +
            '<!-- Hojas de Laurel en el arco -->' +
            '<circle cx="85" cy="62" r="5" fill="#F59E0B"/><circle cx="102" cy="46" r="5" fill="#FDE047"/><circle cx="130" cy="38" r="6" fill="#F59E0B"/><circle cx="158" cy="46" r="5" fill="#FDE047"/><circle cx="175" cy="62" r="5" fill="#F59E0B"/>' +
            '<!-- Birrete de Graduación Central -->' +
            '<polygon points="130,55 184,78 130,101 76,78" fill="url(#legCapGrad)" stroke="url(#legGoldGrad)" stroke-width="2.5"/>' +
            '<rect x="108" y="94" width="44" height="24" rx="4" fill="url(#legCapGrad)" stroke="url(#legGoldGrad)" stroke-width="2"/>' +
            '<!-- Borla Dorada -->' +
            '<line x1="130" y1="78" x2="168" y2="92" stroke="#FDE047" stroke-width="2.2"/>' +
            '<circle cx="168" cy="95" r="4.5" fill="#F59E0B"/>' +
            '<line x1="168" y1="99" x2="170" y2="114" stroke="#FDE047" stroke-width="3" stroke-linecap="round"/>' +
            '<!-- Rollo de Diploma de Honor con Lazo -->' +
            '<rect x="90" y="128" width="80" height="18" rx="9" fill="#FFFDF5" stroke="#B45309" stroke-width="2"/>' +
            '<line x1="94" y1="137" x2="166" y2="137" stroke="#FDE047" stroke-width="1.2"/>' +
            '<rect x="122" y="125" width="16" height="24" rx="3" fill="url(#legRibbonRed)" stroke="#B45309" stroke-width="1"/>' +
            '<polygon points="122,149 130,144 138,149 135,138 125,138" fill="url(#legRibbonRed)"/>' +
            '<!-- Estrella Dorada de Excelencia -->' +
            '<circle cx="130" cy="136" r="3.5" fill="#FDE047"/>' +
          '</g>' +
          '<path class="pirate-ship-foam" d="M 35 180 Q 80 172 130 180 Q 180 188 225 180" stroke="#F59E0B" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.8"/>' +
        '</svg>';

      var pirateStartPortHtml = isLegacy
        ? '<div class="pirate-start-port legacy-start-port">' +
            '<div class="pirate-port-sky">' +
              '<span class="pirate-sun-icon">👑</span>' +
              '<span class="pirate-seagull s1">🎓</span>' +
              '<span class="pirate-seagull s2">✨</span>' +
            '</div>' +
            '<div class="pirate-ship-stage">' +
              '<div class="pirate-ship-wrapper" title="Portal de Egresados: Generación Maker Paulo Freire">' +
                legacyGradArchSvg +
              '</div>' +
              '<div class="pirate-ocean-waves-wrap">' +
                '<svg class="pirate-ocean-waves-svg" viewBox="0 0 600 45" preserveAspectRatio="none">' +
                  '<path class="wave wave-back" d="M0,18 C150,35 350,5 500,20 C650,35 850,5 1000,20 L1000,45 L0,45 Z" />' +
                  '<path class="wave wave-front" d="M0,25 C120,10 320,35 520,18 C720,5 920,35 1120,18 L1120,45 L0,45 Z" />' +
                '</svg>' +
              '</div>' +
            '</div>' +
            '<div class="pirate-port-banner">' +
              '<div class="ppb-anchor"><i class="fas fa-graduation-cap"></i></div>' +
              '<div class="ppb-text">' +
                '<h3 class="ppb-title">PORTAL DE EGRESADOS &bull; GENERACIÓN MAKER PAULO FREIRE</h3>' +
                '<p class="ppb-sub">El Camino de <strong>6.° Grado</strong> reúne los proyectos cumbre de tu paso por la escuela: Inteligencia Artificial en Canva, Gemini NotebookLM y Robótica con Servomotores. Recorré cada hito de honor para sellar tu Libro de Recuerdos y desbloquear el Gran Diploma de Graduación.</p>' +
              '</div>' +
              '<div class="ppb-compass"><i class="fas fa-award"></i></div>' +
            '</div>' +
          '</div>'
        : (isCyber
        ? '<div class="pirate-start-port cyber-start-port">' +
            '<div class="pirate-port-sky">' +
              '<span class="pirate-sun-icon">⚡</span>' +
              '<span class="pirate-seagull s1">🤖</span>' +
              '<span class="pirate-seagull s2">🧠</span>' +
            '</div>' +
            '<div class="pirate-ship-stage">' +
              '<div class="pirate-ship-wrapper" title="Núcleo Robótico Paulo Freire: ¡Sistema en línea!">' +
                cyberCoreBotSvg +
              '</div>' +
              '<div class="pirate-ocean-waves-wrap">' +
                '<svg class="pirate-ocean-waves-svg" viewBox="0 0 600 45" preserveAspectRatio="none">' +
                  '<path class="wave wave-back" d="M0,18 C150,35 350,5 500,20 C650,35 850,5 1000,20 L1000,45 L0,45 Z" />' +
                  '<path class="wave wave-front" d="M0,25 C120,10 320,35 520,18 C720,5 920,35 1120,18 L1120,45 L0,45 Z" />' +
                '</svg>' +
              '</div>' +
            '</div>' +
            '<div class="pirate-port-banner">' +
              '<div class="ppb-anchor"><i class="fas fa-microchip"></i></div>' +
              '<div class="ppb-text">' +
                '<h3 class="ppb-title">SERVIDOR CENTRAL &bull; LABORATORIO DE ROBÓTICA E IA PAULO FREIRE</h3>' +
                '<p class="ppb-sub">El Núcleo Robótico <strong>Paulo Freire</strong> inicia la compilación en la placa madre de <strong>' + student.gradeName + '</strong>. Seguí las pistas de cobre y fibra óptica, tocá cada nodo para abrir su terminal de código y desbloqueá la Supercomputadora Central de IA.</p>' +
              '</div>' +
              '<div class="ppb-compass"><i class="fas fa-network-wired"></i></div>' +
            '</div>' +
          '</div>'
        : (isSpace
          ? '<div class="pirate-start-port space-start-port">' +
              '<div class="pirate-port-sky">' +
                '<span class="pirate-sun-icon">🪐</span>' +
                '<span class="pirate-seagull s1">🛰️</span>' +
                '<span class="pirate-seagull s2">✨</span>' +
              '</div>' +
              '<div class="pirate-ship-stage">' +
                '<div class="pirate-ship-wrapper" title="Nave Exploradora Paulo Freire: ¡Lista para el despegue!">' +
                  spaceShuttleSvg +
                '</div>' +
                '<div class="pirate-ocean-waves-wrap">' +
                  '<svg class="pirate-ocean-waves-svg" viewBox="0 0 600 45" preserveAspectRatio="none">' +
                    '<path class="wave wave-back" d="M0,18 C150,35 350,5 500,20 C650,35 850,5 1000,20 L1000,45 L0,45 Z" />' +
                    '<path class="wave wave-front" d="M0,25 C120,10 320,35 520,18 C720,5 920,35 1120,18 L1120,45 L0,45 Z" />' +
                  '</svg>' +
                '</div>' +
              '</div>' +
              '<div class="pirate-port-banner">' +
                '<div class="ppb-anchor"><i class="fas fa-rocket"></i></div>' +
                '<div class="ppb-text">' +
                  '<h3 class="ppb-title">BASE DE LANZAMIENTO &bull; ESTACIÓN ESPACIAL PAULO FREIRE</h3>' +
                  '<p class="ppb-sub">La Nave Exploradora <strong>Paulo Freire</strong> inicia su misión orbital por la galaxia de <strong>' + student.gradeName + '</strong>. Seguí la ruta de constelaciones, tocá cada planeta para abrir su transmisión holográfica y alcanzá el Núcleo Galáctico Maker.</p>' +
                '</div>' +
                '<div class="ppb-compass"><i class="fas fa-satellite"></i></div>' +
              '</div>' +
            '</div>'
          : '<div class="pirate-start-port">' +
              '<div class="pirate-port-sky">' +
                '<span class="pirate-sun-icon">☀️</span>' +
                '<span class="pirate-seagull s1">🕊️</span>' +
                '<span class="pirate-seagull s2">🕊️</span>' +
              '</div>' +
              '<div class="pirate-ship-stage">' +
                '<div class="pirate-ship-wrapper" title="Galeón Paulo Freire: ¡Listo para zarpar!">' +
                  pirateShipSvg +
                '</div>' +
                '<div class="pirate-ocean-waves-wrap">' +
                  '<svg class="pirate-ocean-waves-svg" viewBox="0 0 600 45" preserveAspectRatio="none">' +
                    '<path class="wave wave-back" d="M0,18 C150,35 350,5 500,20 C650,35 850,5 1000,20 L1000,45 L0,45 Z" />' +
                    '<path class="wave wave-front" d="M0,25 C120,10 320,35 520,18 C720,5 920,35 1120,18 L1120,45 L0,45 Z" />' +
                  '</svg>' +
                '</div>' +
              '</div>' +
              '<div class="pirate-port-banner">' +
                '<div class="ppb-anchor"><i class="fas fa-anchor"></i></div>' +
                '<div class="ppb-text">' +
                  '<h3 class="ppb-title">PUERTO DE ZARPE &bull; BAHÍA DE LOS CREADORES</h3>' +
                  '<p class="ppb-sub">El Galeón <strong>Paulo Freire</strong> inicia su travesía por el archipiélago de <strong>' + student.gradeName + '</strong>. Seguí el sendero curvado, tocá cada isla para abrir su pergamino y alcanzá el Gran Tesoro Maker.</p>' +
                '</div>' +
                '<div class="ppb-compass"><i class="fas fa-compass"></i></div>' +
              '</div>' +
            '</div>'));

      function buildPirateStationHtml(m, idx, sideClass) {
        var statusSeal = '';
        var statusBadgeClass = m.status;
        var statusLabel = '';
        if (isLegacy) {
          if (m.status === 'completado') {
            statusLabel = 'Hito Cumplido';
            statusSeal = '<div class="pirate-seal-badge completado" title="¡Hito cumplido con honor!"><i class="fas fa-award"></i> Cumplido</div>';
          } else if (m.status === 'activo') {
            statusLabel = 'Hito en Curso';
            statusSeal = '<div class="pirate-seal-badge activo" title="¡Hito cumbre en curso!"><i class="fas fa-graduation-cap"></i> En Curso</div>';
          } else {
            statusLabel = 'Hito de Honor';
            statusSeal = '<div class="pirate-seal-badge desafio" title="Hito por desbloquear"><i class="fas fa-lock"></i> Por Desbloquear</div>';
          }
        } else if (isCyber) {
          if (m.status === 'completado') {
            statusLabel = 'Nodo Compilado';
            statusSeal = '<div class="pirate-seal-badge completado" title="¡Nodo compilado con éxito!"><i class="fas fa-check-double"></i> Compilado</div>';
          } else if (m.status === 'activo') {
            statusLabel = 'En Compilación';
            statusSeal = '<div class="pirate-seal-badge activo" title="¡Nodo activo en compilación!"><i class="fas fa-bolt"></i> En Línea</div>';
          } else {
            statusLabel = 'Nodo Encriptado';
            statusSeal = '<div class="pirate-seal-badge desafio" title="Nodo por desencriptar"><i class="fas fa-lock"></i> Encriptado</div>';
          }
        } else if (isSpace) {
          if (m.status === 'completado') {
            statusLabel = 'Planeta Explorado';
            statusSeal = '<div class="pirate-seal-badge completado" title="¡Planeta explorado!"><i class="fas fa-satellite"></i> Explorado</div>';
          } else if (m.status === 'activo') {
            statusLabel = 'En Órbita';
            statusSeal = '<div class="pirate-seal-badge activo" title="¡Planeta actual en órbita!"><i class="fas fa-rocket"></i> En Órbita</div>';
          } else {
            statusLabel = 'Planeta Misterioso';
            statusSeal = '<div class="pirate-seal-badge desafio" title="Planeta por explorar"><i class="fas fa-lock"></i> Por Explorar</div>';
          }
        } else {
          if (m.status === 'completado') {
            statusLabel = 'Isla Conquistada';
            statusSeal = '<div class="pirate-seal-badge completado" title="¡Isla superada!"><i class="fas fa-award"></i> Conquistada</div>';
          } else if (m.status === 'activo') {
            statusLabel = 'En Exploración';
            statusSeal = '<div class="pirate-seal-badge activo" title="¡Isla actual en exploración!"><i class="fas fa-compass fa-spin-slow"></i> En Exploración</div>';
          } else {
            statusLabel = 'Isla Misteriosa';
            statusSeal = '<div class="pirate-seal-badge desafio" title="Isla por descubrir"><i class="fas fa-lock"></i> Por Descubrir</div>';
          }
        }

        var isInitiallyOpen = false;
        var coverImgSrc = m.coverImage || (m.type === 'circuito' || m.type === 'electronica' ? 'img/microbit.png' : 'img/scratchjr.png');

        var toolBtnHtml = '';
        if (m.botones && m.botones.length > 0) {
          toolBtnHtml = m.botones.map(function(b) {
            return '<a href="' + b.url + '" target="_blank" rel="noopener noreferrer" class="pirate-btn-tool" title="' + (b.texto || 'Abrir Actividad').replace(/"/g, '&quot;') + '"><i class="' + (b.icono || 'fas fa-external-link-alt') + '"></i> ' + (b.texto || 'Abrir Actividad') + '</a>';
          }).join('');
        } else if (m.type === 'gemini_notebooks') {
          toolBtnHtml = '<a href="' + (m.externalUrl || 'https://notebooklm.google.com') + '" target="_blank" rel="noopener noreferrer" class="pirate-btn-tool tool-notebook" title="Abrir NotebookLM"><i class="fas fa-brain"></i> Abrir NotebookLM</a>';
        } else if (m.type === 'canva' || /canva/i.test(m.gameUrl || '')) {
          toolBtnHtml = '<a href="' + (m.gameUrl || 'https://www.canva.com/es_419/crear/animaciones/') + '" target="_blank" rel="noopener noreferrer" class="pirate-btn-tool tool-canva" title="Abrir Canva"><i class="fas fa-palette"></i> Abrir Canva</a>';
        } else if (m.gameUrl && m.type !== 'paint' && !/cancha|paint/i.test(m.title || '')) {
          toolBtnHtml = '<a href="' + m.gameUrl + '" target="_blank" rel="noopener noreferrer" class="pirate-btn-tool tool-game" title="Jugar"><i class="fas fa-gamepad"></i> Jugar Desafío</a>';
        } else if (m.externalUrl && m.type !== 'paint') {
          toolBtnHtml = '<a href="' + m.externalUrl + '" target="_blank" rel="noopener noreferrer" class="pirate-btn-tool" title="Abrir Enlace"><i class="fas fa-external-link-alt"></i> Abrir Actividad</a>';
        }

        var stationTitleText = isLegacy ? ('🎓 Hito ' + m.level + ': ' + m.title) : (isCyber ? ('🔌 Nodo ' + m.level + ': ' + m.title) : (isSpace ? ('🪐 Planeta ' + m.level + ': ' + m.title) : ('🏝️ Isla ' + m.level + ': ' + m.title)));
        var ctaOpenText = isLegacy ? 'Cerrar hito' : (isCyber ? 'Cerrar terminal' : (isSpace ? 'Ocultar transmisión' : 'Ocultar pergamino'));
        var ctaClosedText = isLegacy ? 'Tocá el hito para ver el registro' : (isCyber ? 'Tocá el nodo para abrir terminal' : (isSpace ? 'Tocá el planeta para ver transmisión' : 'Tocá la isla para ver pergamino'));
        var ctaIconClass = isLegacy ? 'fa-scroll' : (isCyber ? 'fa-terminal' : (isSpace ? 'fa-satellite-dish' : 'fa-scroll'));
        var stampHtml = isLegacy
          ? '<i class="fas fa-award"></i> Registro del Egresado &bull; Hito #' + m.level
          : (isCyber
            ? '<i class="fas fa-terminal"></i> Terminal de Ingeniería &bull; Nodo #' + m.level
            : (isSpace
              ? '<i class="fas fa-satellite-dish"></i> Transmisión de Comando &bull; Planeta #' + m.level
              : '<i class="fas fa-feather-alt"></i> Pergamino del Capitán &bull; Isla #' + m.level));
        var objHeaderHtml = isLegacy ? 'Objetivo Cumbre del Egresado' : (isCyber ? 'Especificación Técnica del Nodo' : (isSpace ? 'Objetivo de la Misión Orbital' : 'Objetivo del Tesoro'));
        var benHeaderHtml = isLegacy ? 'Competencias Maker de Graduación' : (isCyber ? 'Upgrade de Ingeniería (Lógica, Robótica e IA)' : (isSpace ? 'Superpoderes de Astronauta (Razonamiento y Lógica)' : 'Poderes Piratas (Razonamiento y Lógica)'));
        var mainActionText = isLegacy ? '<i class="fas fa-graduation-cap"></i> ¡Explorar Proyecto de Honor!' : (isCyber ? '<i class="fas fa-bolt"></i> ¡Ejecutar Nodo de Misión!' : (isSpace ? '<i class="fas fa-rocket"></i> ¡Iniciar Misión Planetaria!' : '<i class="fas fa-compass"></i> ¡Iniciar Misión en la Isla!'));
        var stationThemeClass = isLegacy ? 'legacy-landmark-station ' : (isCyber ? 'cyber-node-station ' : (isSpace ? 'space-planet-station ' : ''));

        return '<div class="pirate-island-station ' + stationThemeClass + sideClass + ' ' + statusBadgeClass + ' ' + (isInitiallyOpen ? 'is-expanded' : '') + '" data-mission-idx="' + idx + '" id="pirate-island-st-' + idx + '">' +
          // Landmark interactivo de la Isla / Planeta / Nodo Cyber / Hito de Graduados
          '<div class="pirate-island-landmark" role="button" tabindex="0" data-mission-idx="' + idx + '" aria-expanded="' + (isInitiallyOpen ? 'true' : 'false') + '" title="' + (isLegacy ? '¡Tocá el hito para ver el registro de honor!' : (isCyber ? '¡Tocá el nodo para abrir su terminal!' : (isSpace ? '¡Tocá el planeta para abrir su transmisión!' : '¡Tocá la isla para desplegar su pergamino de misión!'))) + '">' +
            '<div class="pirate-medallion-wrap">' +
              '<div class="pirate-medallion-ring ' + statusBadgeClass + '">' +
                '<div class="pirate-compass-ticks">' +
                  '<span class="pct-tick pct-n">N</span>' +
                  '<span class="pct-tick pct-e">E</span>' +
                  '<span class="pct-tick pct-s">S</span>' +
                  '<span class="pct-tick pct-o">O</span>' +
                '</div>' +
                '<div class="pirate-medallion-inner">' +
                  '<img src="' + coverImgSrc + '" alt="' + m.title.replace(/"/g, '&quot;') + '" class="pirate-island-cover-img" loading="lazy" onerror="this.src=\'img/scratchjr.png\'">' +
                  '<div class="pirate-level-coin">' +
                    '<span>' + (isLegacy ? '👑 H' : (isCyber ? '⚡ N' : (isSpace ? '🌟 N' : '🪙 L'))) + m.level + '</span>' +
                  '</div>' +
                '</div>' +
              '</div>' +
              statusSeal +
            '</div>' +

            '<div class="pirate-island-info-block">' +
              '<div class="pirate-tag-row">' +
                '<span class="pirate-type-badge" style="background:' + m.color + '22;color:' + m.color + ';border-color:' + m.color + '55;">' +
                  '<i class="fas ' + m.icon + '"></i> ' + m.badge +
                '</span>' +
                '<span class="pirate-status-pill ' + m.status + '">' + statusLabel + '</span>' +
              '</div>' +
              '<h4 class="pirate-island-title">' + stationTitleText + '</h4>' +
              '<div class="pirate-landmark-touch-cta">' +
                '<span class="ptp-text"><i class="fas ' + ctaIconClass + '"></i> ' + (isInitiallyOpen ? ctaOpenText : ctaClosedText) + '</span>' +
                '<span class="ptp-arrow"><i class="fas fa-chevron-down"></i></span>' +
              '</div>' +
            '</div>' +
          '</div>' +

          // Pergamino / Transmisión Holográfica / Terminal Cyber desplegable
          '<div class="pirate-scroll-drawer ' + (isInitiallyOpen ? 'is-open' : '') + '">' +
            '<div class="pirate-scroll-wood-rod top"></div>' +
            '<div class="pirate-scroll-parchment">' +
              '<div class="pirate-scroll-top-seal">' +
                '<span class="psts-stamp">' + stampHtml + '</span>' +
                '<span class="psts-status ' + m.status + '">' + statusLabel + '</span>' +
              '</div>' +
              '<h4 class="pirate-scroll-title">' + m.title + '</h4>' +
              '<div class="pirate-scroll-narrative">' +
                '<i class="fas fa-quote-left pirate-quote-icon"></i> ' + m.description +
              '</div>' +
              (m.objective ?
                '<div class="pirate-scroll-box objective">' +
                  '<div class="psb-header"><i class="fas fa-bullseye"></i> <strong>' + objHeaderHtml + '</strong></div>' +
                  '<p class="psb-body">' + m.objective + '</p>' +
                '</div>' : '') +
              (m.benefits ?
                '<div class="pirate-scroll-box benefits">' +
                  '<div class="psb-header"><i class="fas fa-brain"></i> <strong>' + benHeaderHtml + '</strong></div>' +
                  '<p class="psb-body">' + m.benefits + '</p>' +
                '</div>' : '') +
              '<div class="pirate-scroll-actions">' +
                '<button type="button" class="pirate-btn-action pirate-btn-main arm-btn-open-modal" data-mission-idx="' + idx + '" title="Abrir y comenzar la misión">' +
                  mainActionText +
                '</button>' +
                toolBtnHtml +
                '<button type="button" class="pirate-btn-action pirate-btn-sec arm-btn-open-presentation" data-mission-idx="' + idx + '" title="Ver Modo Presentación">' +
                  '<i class="fas fa-chalkboard-teacher"></i> Presentación' +
                '</button>' +
                '<button type="button" class="pirate-btn-action pirate-btn-ghost arm-btn-open-pdf" data-mission-idx="' + idx + '" title="Ver Guía PDF">' +
                  '<i class="fas fa-file-pdf"></i> Guía PDF' +
                '</button>' +
              '</div>' +
            '</div>' +
            '<div class="pirate-scroll-wood-rod bottom"></div>' +
          '</div>' +
        '</div>';
      }

      var pirateIslandsHtml = '';
      for (var r = 0; r < missions.length; r += 2) {
        var mLeft = missions[r];
        var idxLeft = r;
        var mRight = (r + 1 < missions.length) ? missions[r + 1] : null;
        var idxRight = r + 1;

        // Conector que llega a esta fila
        var incomingConnectorHtml = '';
        if (r === 0) {
          // Desde el puerto (centro 50) hacia la Isla 1 (izquierda 25)
          incomingConnectorHtml =
            '<div class="pirate-trail-connector connector-start">' +
              '<svg class="pirate-trail-curve-svg" viewBox="0 0 100 48" preserveAspectRatio="none">' +
                '<path class="ptc-glow" d="M 50,0 C 50,26 25,22 25,48" />' +
                '<path class="ptc-dash" d="M 50,0 C 50,26 25,22 25,48" />' +
              '</svg>' +
              '<div class="pirate-waypoint-marker wp-start" title="' + (isLegacy ? 'Camino de honor hacia Hito 1' : (isCyber ? 'Bus de datos hacia Nodo 1' : (isSpace ? 'Órbita hacia Planeta 1' : 'Rumbo a la Isla 1'))) + '"><i class="fas ' + (isLegacy ? 'fa-graduation-cap' : (isCyber ? 'fa-bolt' : (isSpace ? 'fa-rocket' : 'fa-compass'))) + '"></i></div>' +
            '</div>';
        } else {
          // Curva desde la isla derecha de la fila previa (75) hacia la isla izquierda de esta fila (25)
          incomingConnectorHtml =
            '<div class="pirate-trail-connector connector-turn-down">' +
              '<svg class="pirate-trail-curve-svg" viewBox="0 0 100 52" preserveAspectRatio="none">' +
                '<path class="ptc-glow" d="M 75,0 C 75,32 25,20 25,52" />' +
                '<path class="ptc-dash" d="M 75,0 C 75,32 25,20 25,52" />' +
              '</svg>' +
              '<div class="pirate-waypoint-marker wp-mid" title="' + (isLegacy ? 'Sendero de laureles hacia Hito ' : (isCyber ? 'Enlace de fibra hacia Nodo ' : (isSpace ? 'Salto hiperespacial al Planeta ' : 'Travesía náutica hacia la Isla '))) + mLeft.level + '"><i class="fas ' + (isLegacy ? 'fa-award' : (isCyber ? 'fa-microchip' : (isSpace ? 'fa-satellite' : 'fa-water'))) + '"></i></div>' +
            '</div>';
        }

        var leftStationHtml = buildPirateStationHtml(mLeft, idxLeft, 'island-left');
        var rightStationHtml = '';
        var bridgeConnectorHtml = '';

        if (mRight) {
          bridgeConnectorHtml =
            '<div class="pirate-row-bridge">' +
              '<svg class="pirate-bridge-svg" viewBox="0 0 100 40" preserveAspectRatio="none">' +
                '<path class="ptc-glow" d="M 0,20 C 35,5 65,35 100,20" />' +
                '<path class="ptc-dash" d="M 0,20 C 35,5 65,35 100,20" />' +
              '</svg>' +
              '<div class="pirate-waypoint-marker wp-bridge" title="' + (isLegacy ? 'Paso de honor hacia Hito ' : (isCyber ? 'Puente lógico hacia Nodo ' : (isSpace ? 'Rumbo orbital al Planeta ' : 'Rumbo a la Isla '))) + mRight.level + '"><i class="fas ' + (isLegacy ? 'fa-scroll' : (isCyber ? 'fa-network-wired' : (isSpace ? 'fa-user-astronaut' : 'fa-anchor'))) + '"></i></div>' +
            '</div>';
          rightStationHtml = buildPirateStationHtml(mRight, idxRight, 'island-right');
        }

        pirateIslandsHtml += incomingConnectorHtml +
          '<div class="pirate-map-row' + (mRight ? ' has-pair' : ' single-left') + '">' +
            leftStationHtml +
            (mRight ? bridgeConnectorHtml + rightStationHtml : '') +
          '</div>';
      }

      // Connector final hacia el Cofre del Tesoro / Núcleo Galáctico / Supercomputadora IA / Diploma de Honor (centro)
      var lastIdx = missions.length - 1;
      var lastSide = (lastIdx % 2 === 0) ? 'left' : 'right';
      var finishConnectorHtml = '';
      if (lastSide === 'left') {
        finishConnectorHtml =
          '<div class="pirate-trail-connector connector-to-finish">' +
            '<svg class="pirate-trail-curve-svg" viewBox="0 0 100 48" preserveAspectRatio="none">' +
              '<path class="ptc-glow" d="M 25,0 C 25,26 50,22 50,48" />' +
              '<path class="ptc-dash" d="M 25,0 C 25,26 50,22 50,48" />' +
            '</svg>' +
            '<div class="pirate-waypoint-marker wp-finish" title="' + (isLegacy ? '¡Cerca del Diploma de Graduación!' : (isCyber ? '¡Cerca del Núcleo de IA!' : (isSpace ? '¡Cerca del Núcleo Galáctico!' : '¡Cerca del tesoro!'))) + '"><i class="fas ' + (isLegacy ? 'fa-award' : (isCyber ? 'fa-brain' : (isSpace ? 'fa-star' : 'fa-gem'))) + '"></i></div>' +
          '</div>';
      } else {
        finishConnectorHtml =
          '<div class="pirate-trail-connector connector-to-finish">' +
            '<svg class="pirate-trail-curve-svg" viewBox="0 0 100 48" preserveAspectRatio="none">' +
              '<path class="ptc-glow" d="M 75,0 C 75,26 50,22 50,48" />' +
              '<path class="ptc-dash" d="M 75,0 C 75,26 50,22 50,48" />' +
            '</svg>' +
            '<div class="pirate-waypoint-marker wp-finish" title="' + (isLegacy ? '¡Cerca del Diploma de Graduación!' : (isCyber ? '¡Cerca del Núcleo de IA!' : (isSpace ? '¡Cerca del Núcleo Galáctico!' : '¡Cerca del tesoro!'))) + '"><i class="fas ' + (isLegacy ? 'fa-award' : (isCyber ? 'fa-brain' : (isSpace ? 'fa-star' : 'fa-gem'))) + '"></i></div>' +
          '</div>';
      }

      var safeGradeName = (student.gradeName || '').replace(/'/g, "\\'");
      var pirateFinishHtml =
        finishConnectorHtml +
        '<div class="pirate-finish-station ' + (isLegacy ? 'legacy-finish-station' : (isCyber ? 'cyber-finish-station' : (isSpace ? 'space-finish-station' : ''))) + '" id="pirate-finish-station">' +
          '<div class="pirate-x-marks-spot">' +
            '<div class="pirate-x-symbol">' + (isLegacy ? '🎓' : (isCyber ? '🧠' : (isSpace ? '🌌' : '❌'))) + '</div>' +
            '<div class="pirate-x-title">' + (isLegacy ? '¡DIPLOMA DE HONOR Y GRADUACIÓN MAKER DESBLOQUEADO!' : (isCyber ? '¡SUPERCOMPUTADORA CENTRAL DE IA DESBLOQUEADA!' : (isSpace ? '¡NÚCLEO DE LA GALAXIA MAKER ALCANZADO!' : '¡X MARCA EL LUGAR DEL GRAN TESORO!'))) + '</div>' +
          '</div>' +
          '<div class="pirate-chest-stage" role="button" tabindex="0" onclick="window.openPirateTreasureModal && window.openPirateTreasureModal({ gradeName: \'' + safeGradeName + '\', completedCount: ' + completedCount + ', totalCount: ' + missions.length + ' });" title="' + (isLegacy ? '¡Hacé click para abrir la Celebración de Graduación y Diploma!' : (isCyber ? '¡Hacé click para activar el Núcleo Cyber y festejar!' : (isSpace ? '¡Hacé click para abrir la Cápsula Galáctica y festejar!' : '¡Hacé click para abrir el Cofre del Tesoro y festejar!'))) + '">' +
            '<div class="pirate-chest-glow"></div>' +
            '<div class="pirate-chest-visual">' +
              '<div class="pc-chest-lid"></div>' +
              '<div class="pc-chest-base">' +
                '<div class="pc-chest-lock"><i class="fas ' + (isLegacy ? 'fa-award' : (isCyber ? 'fa-microchip' : (isSpace ? 'fa-bolt' : 'fa-key'))) + '"></i></div>' +
                '<div class="pc-chest-coins">' +
                  (isLegacy
                    ? '<span>🎓</span><span>🏆</span><span>👑</span><span>📜</span><span>⭐</span>'
                    : (isCyber
                      ? '<span>⚡</span><span>🤖</span><span>🧠</span><span>🔌</span><span>💎</span>'
                      : (isSpace
                        ? '<span>🌟</span><span>⚡</span><span>🪐</span><span>💎</span><span>🚀</span>'
                        : '<span>🪙</span><span>💎</span><span>👑</span><span>💎</span><span>🪙</span>'))) +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="pirate-chest-touch-hint">' +
              '<i class="fas fa-hand-pointer"></i> ' + (isLegacy ? '¡Tocá el Diploma y la Medalla para abrir la Celebración de Graduación! 🎓✨' : (isCyber ? '¡Tocá el Núcleo para compilar la Recompensa Cyber! ⚡' : (isSpace ? '¡Tocá la Cápsula para abrir la Recompensa Estelar! ✨' : '¡Tocá el Cofre para abrir el Tesoro! ✨'))) +
            '</div>' +
          '</div>' +
        '</div>';

      var legacyMapBackgroundHtml =
        '<div class="pirate-map-background legacy-map-background" aria-hidden="true">' +
          '<svg class="pirate-map-bg-svg" viewBox="0 0 1000 1200" preserveAspectRatio="none">' +
            '<defs>' +
              '<radialGradient id="legGlowGold" cx="50%" cy="50%" r="50%">' +
                '<stop offset="0%" stop-color="#FDE047" stop-opacity="0.32"/>' +
                '<stop offset="60%" stop-color="#F59E0B" stop-opacity="0.14"/>' +
                '<stop offset="100%" stop-color="#0F172A" stop-opacity="0"/>' +
              '</radialGradient>' +
              '<radialGradient id="legGlowNavy" cx="50%" cy="50%" r="50%">' +
                '<stop offset="0%" stop-color="#312E81" stop-opacity="0.45"/>' +
                '<stop offset="70%" stop-color="#1E1B4B" stop-opacity="0.2"/>' +
                '<stop offset="100%" stop-color="#0B0F19" stop-opacity="0"/>' +
              '</radialGradient>' +
              '<linearGradient id="legGoldRibbon" x1="0%" y1="0%" x2="100%" y2="100%">' +
                '<stop offset="0%" stop-color="#FDE047" stop-opacity="0.25"/>' +
                '<stop offset="50%" stop-color="#F59E0B" stop-opacity="0.35"/>' +
                '<stop offset="100%" stop-color="#B45309" stop-opacity="0.25"/>' +
              '</linearGradient>' +
            '</defs>' +
            '<!-- Líneas doradas de honor y constelación de hitos -->' +
            '<g stroke="rgba(245, 158, 11, 0.16)" stroke-width="1.2" stroke-dasharray="6,8" fill="none">' +
              '<circle cx="500" cy="600" r="260" />' +
              '<circle cx="500" cy="600" r="440" />' +
              '<line x1="0" y1="250" x2="1000" y2="950" />' +
              '<line x1="1000" y1="250" x2="0" y2="950" />' +
            '</g>' +
            '<!-- Halos dorados majestuosos -->' +
            '<ellipse cx="500" cy="300" rx="300" ry="180" fill="url(#legGlowGold)" />' +
            '<ellipse cx="500" cy="900" rx="320" ry="180" fill="url(#legGlowNavy)" />' +
            '<ellipse cx="800" cy="600" rx="220" ry="150" fill="url(#legGlowGold)" />' +
            '<ellipse cx="200" cy="600" rx="220" ry="150" fill="url(#legGlowGold)" />' +
          '</svg>' +
          '<!-- Decoraciones flotantes del anuario -->' +
          '<div class="pm-deco pm-deco-compass" title="Birrete de Graduación">🎓</div>' +
          '<div class="pm-deco pm-deco-kraken" title="Medalla de Honor">🎖️</div>' +
          '<div class="pm-deco pm-deco-sea-dragon" title="Gran Trofeo Maker">🏆</div>' +
          '<div class="pm-deco pm-deco-shipwreck" title="Diploma de Honor">📜</div>' +
          '<div class="pm-deco pm-deco-palm1">✨</div>' +
          '<div class="pm-deco pm-deco-palm2">👑</div>' +
          '<div class="pm-deco pm-deco-palm3">🎓</div>' +
          '<div class="pm-deco pm-deco-palm4">⭐</div>' +
          '<div class="pm-deco pm-deco-treasure-cove" title="Libro de Recuerdos">📖</div>' +
          '<div class="pm-deco pm-deco-bottle" title="Cápsula del Tiempo">⏳</div>' +
          '<div class="pm-deco pm-deco-anchor" title="Sello de la Promoción">🏛️</div>' +
          '<!-- Rótulos conmemorativos -->' +
          '<div class="pm-map-label label-sea">CAMINO DE LOS EGRESADOS</div>' +
          '<div class="pm-map-label label-bay">Pabellón Canva & IA</div>' +
          '<div class="pm-map-label label-river">Alameda Robótica & Servomotores</div>' +
          '<div class="pm-map-label label-island1">Espacio Gemini Notebook</div>' +
          '<div class="pm-map-label label-island2">Salón del Diploma Maker</div>' +
        '</div>';

      var pirateMapBackgroundHtml = isLegacy
        ? legacyMapBackgroundHtml
        : (isCyber
        ? '<div class="pirate-map-background cyber-map-background" aria-hidden="true">' +
            '<svg class="pirate-map-bg-svg" viewBox="0 0 1000 1200" preserveAspectRatio="none">' +
              '<defs>' +
                '<radialGradient id="cyGlowEmerald" cx="50%" cy="50%" r="50%">' +
                  '<stop offset="0%" stop-color="#10B981" stop-opacity="0.28"/>' +
                  '<stop offset="60%" stop-color="#059669" stop-opacity="0.12"/>' +
                  '<stop offset="100%" stop-color="#020617" stop-opacity="0"/>' +
                '</radialGradient>' +
                '<radialGradient id="cyGlowMagenta" cx="50%" cy="50%" r="50%">' +
                  '<stop offset="0%" stop-color="#EC4899" stop-opacity="0.26"/>' +
                  '<stop offset="60%" stop-color="#8B5CF6" stop-opacity="0.12"/>' +
                  '<stop offset="100%" stop-color="#020617" stop-opacity="0"/>' +
                '</radialGradient>' +
                '<linearGradient id="cyDataBus" x1="0%" y1="0%" x2="100%" y2="100%">' +
                  '<stop offset="0%" stop-color="#10B981" stop-opacity="0.22"/>' +
                  '<stop offset="50%" stop-color="#06B6D4" stop-opacity="0.28"/>' +
                  '<stop offset="100%" stop-color="#EC4899" stop-opacity="0.22"/>' +
                '</linearGradient>' +
              '</defs>' +
              '<!-- Grilla de Placa Madre (PCB) -->' +
              '<g stroke="rgba(16, 185, 129, 0.12)" stroke-width="1" fill="none">' +
                '<line x1="0" y1="200" x2="1000" y2="200" />' +
                '<line x1="0" y1="450" x2="1000" y2="450" />' +
                '<line x1="0" y1="700" x2="1000" y2="700" />' +
                '<line x1="0" y1="950" x2="1000" y2="950" />' +
                '<line x1="200" y1="0" x2="200" y2="1200" />' +
                '<line x1="500" y1="0" x2="500" y2="1200" />' +
                '<line x1="800" y1="0" x2="800" y2="1200" />' +
              '</g>' +
              '<!-- Halos de energía de procesadores -->' +
              '<ellipse cx="820" cy="180" rx="220" ry="140" fill="url(#cyGlowEmerald)" />' +
              '<ellipse cx="160" cy="480" rx="230" ry="150" fill="url(#cyGlowMagenta)" />' +
              '<ellipse cx="840" cy="720" rx="220" ry="150" fill="url(#cyGlowEmerald)" />' +
              '<ellipse cx="180" cy="960" rx="220" ry="140" fill="url(#cyGlowMagenta)" />' +
              '<!-- Bus Principal de Fibra Óptica -->' +
              '<path d="M 1000,300 L 760,300 L 620,440 L 380,440 L 260,560 L 260,760 L 440,940 L 440,1200 L 510,1200 L 510,910 L 330,730 L 330,590 L 420,500 L 660,500 L 800,360 L 1000,360 Z" fill="url(#cyDataBus)" stroke="rgba(52, 211, 153, 0.4)" stroke-width="1.5" />' +
              '<!-- Pistas de Cobre y Nodos de Soldadura PCB -->' +
              '<g stroke="rgba(52, 211, 153, 0.42)" stroke-width="2" fill="#0F172A">' +
                '<polyline points="680,70 760,70 810,120 920,120" fill="none"/>' +
                '<circle cx="680" cy="70" r="5" stroke="#10B981"/><circle cx="920" cy="120" r="5" stroke="#10B981"/>' +
                '<polyline points="60,360 150,360 210,420 290,420" fill="none" stroke="rgba(236, 72, 153, 0.45)"/>' +
                '<circle cx="60" cy="360" r="5" stroke="#EC4899"/><circle cx="290" cy="420" r="5" stroke="#EC4899"/>' +
                '<polyline points="720,610 810,610 860,660 950,660" fill="none"/>' +
                '<circle cx="720" cy="610" r="5" stroke="#10B981"/><circle cx="950" cy="660" r="5" stroke="#10B981"/>' +
                '<polyline points="70,880 160,880 220,940 310,940" fill="none" stroke="rgba(250, 204, 21, 0.45)"/>' +
                '<circle cx="70" cy="880" r="5" stroke="#FACC15"/><circle cx="310" cy="940" r="5" stroke="#FACC15"/>' +
              '</g>' +
            '</svg>' +
            '<div class="pm-deco pm-deco-compass" title="Microprocesador Central">🔌</div>' +
            '<div class="pm-deco pm-deco-kraken" title="Brazo Robótico Industrial">🦾</div>' +
            '<div class="pm-deco pm-deco-sea-dragon" title="Red Neuronal IA">🧠</div>' +
            '<div class="pm-deco pm-deco-shipwreck" title="Placa Micro:bit">📟</div>' +
            '<div class="pm-deco pm-deco-palm1">⚡</div>' +
            '<div class="pm-deco pm-deco-palm2">🔋</div>' +
            '<div class="pm-deco pm-deco-palm3">🤖</div>' +
            '<div class="pm-deco pm-deco-palm4">⚡</div>' +
            '<div class="pm-deco pm-deco-treasure-cove" title="Servidor Cuántico">🖥️</div>' +
            '<div class="pm-deco pm-deco-bottle" title="Sensor Ultrasónico">📡</div>' +
            '<div class="pm-deco pm-deco-anchor" title="Engranaje Mecatrónico">⚙️</div>' +
            '<div class="pm-map-label label-sea">PLACA MADRE DE LAS IDEAS</div>' +
            '<div class="pm-map-label label-bay">Bus de Datos IA</div>' +
            '<div class="pm-map-label label-river">Circuito Micro:bit</div>' +
            '<div class="pm-map-label label-island1">Sector Sensores</div>' +
            '<div class="pm-map-label label-island2">Núcleo Robótico</div>' +
          '</div>'
        : (isSpace
          ? '<div class="pirate-map-background space-map-background" aria-hidden="true">' +
              '<svg class="pirate-map-bg-svg" viewBox="0 0 1000 1200" preserveAspectRatio="none">' +
                '<defs>' +
                  '<radialGradient id="spNebulaCyan" cx="50%" cy="50%" r="50%">' +
                    '<stop offset="0%" stop-color="#22D3EE" stop-opacity="0.32"/>' +
                    '<stop offset="60%" stop-color="#0284C7" stop-opacity="0.14"/>' +
                    '<stop offset="100%" stop-color="#0F172A" stop-opacity="0"/>' +
                  '</radialGradient>' +
                  '<radialGradient id="spNebulaPurple" cx="50%" cy="50%" r="50%">' +
                    '<stop offset="0%" stop-color="#A855F7" stop-opacity="0.32"/>' +
                    '<stop offset="60%" stop-color="#6366F1" stop-opacity="0.14"/>' +
                    '<stop offset="100%" stop-color="#0F172A" stop-opacity="0"/>' +
                  '</radialGradient>' +
                  '<linearGradient id="spMilkyWay" x1="0%" y1="0%" x2="100%" y2="100%">' +
                    '<stop offset="0%" stop-color="#38BDF8" stop-opacity="0.18"/>' +
                    '<stop offset="50%" stop-color="#818CF8" stop-opacity="0.26"/>' +
                    '<stop offset="100%" stop-color="#C084FC" stop-opacity="0.18"/>' +
                  '</linearGradient>' +
                '</defs>' +
                '<!-- Anillos de radar estelar y coordenadas galácticas -->' +
                '<g stroke="rgba(56, 189, 248, 0.14)" stroke-width="1" stroke-dasharray="6,8" fill="none">' +
                  '<circle cx="500" cy="600" r="240" />' +
                  '<circle cx="500" cy="600" r="420" />' +
                  '<line x1="0" y1="300" x2="1000" y2="900" />' +
                  '<line x1="1000" y1="250" x2="0" y2="850" />' +
                '</g>' +
                '<!-- Nebulosas cósmicas -->' +
                '<ellipse cx="820" cy="160" rx="220" ry="140" fill="url(#spNebulaCyan)" />' +
                '<ellipse cx="160" cy="480" rx="240" ry="150" fill="url(#spNebulaPurple)" />' +
                '<ellipse cx="840" cy="700" rx="210" ry="150" fill="url(#spNebulaPurple)" />' +
                '<ellipse cx="180" cy="960" rx="220" ry="140" fill="url(#spNebulaCyan)" />' +
                '<!-- Corriente de la Vía Láctea -->' +
                '<path d="M 1000,320 C 820,360 720,440 580,520 C 420,600 280,680 340,860 C 400,1000 500,1100 520,1200 L 460,1200 C 430,1080 330,980 270,840 C 210,660 360,560 520,480 C 680,400 780,320 1000,270 Z" fill="url(#spMilkyWay)" />' +
                '<!-- Constelaciones conectadas -->' +
                '<g stroke="rgba(125, 211, 252, 0.35)" stroke-width="1.5" fill="#FEF08A">' +
                  '<polyline points="720,80 780,55 850,90 890,60" fill="none"/>' +
                  '<circle cx="720" cy="80" r="3.5"/><circle cx="780" cy="55" r="4"/><circle cx="850" cy="90" r="3.5"/><circle cx="890" cy="60" r="4.5"/>' +
                  '<polyline points="80,390 140,360 200,400 170,460" fill="none"/>' +
                  '<circle cx="80" cy="390" r="4"/><circle cx="140" cy="360" r="3.5"/><circle cx="200" cy="400" r="4.5"/><circle cx="170" cy="460" r="3.5"/>' +
                  '<polyline points="780,620 840,590 910,630 880,700" fill="none"/>' +
                  '<circle cx="780" cy="620" r="3.5"/><circle cx="840" cy="590" r="4.5"/><circle cx="910" cy="630" r="3.5"/><circle cx="880" cy="700" r="4"/>' +
                '</g>' +
              '</svg>' +
              '<div class="pm-deco pm-deco-compass" title="Radar Galáctico">🛰️</div>' +
              '<div class="pm-deco pm-deco-kraken" title="Nave Nodriza">🛸</div>' +
              '<div class="pm-deco pm-deco-sea-dragon" title="Cometa Halley">☄️</div>' +
              '<div class="pm-deco pm-deco-shipwreck" title="Telescopio Espacial">🔭</div>' +
              '<div class="pm-deco pm-deco-palm1">✨</div>' +
              '<div class="pm-deco pm-deco-palm2">🌟</div>' +
              '<div class="pm-deco pm-deco-palm3">🪐</div>' +
              '<div class="pm-deco pm-deco-palm4">✨</div>' +
              '<div class="pm-deco pm-deco-treasure-cove" title="Base Lunar">🌕</div>' +
              '<div class="pm-deco pm-deco-bottle" title="Sonda Voyager">📡</div>' +
              '<div class="pm-deco pm-deco-anchor" title="Astronauta en EVA">👨‍🚀</div>' +
              '<div class="pm-map-label label-sea">GALAXIA DE LAS IDEAS</div>' +
              '<div class="pm-map-label label-bay">Nebulosa del Código</div>' +
              '<div class="pm-map-label label-river">Vía Láctea Maker</div>' +
              '<div class="pm-map-label label-island1">Sector Robótica</div>' +
              '<div class="pm-map-label label-island2">Órbita Alfa</div>' +
            '</div>'
          : '<div class="pirate-map-background" aria-hidden="true">' +
              '<svg class="pirate-map-bg-svg" viewBox="0 0 1000 1200" preserveAspectRatio="none">' +
                '<defs>' +
                  '<linearGradient id="pmRiverGrad" x1="0%" y1="0%" x2="100%" y2="100%">' +
                    '<stop offset="0%" stop-color="#38BDF8" stop-opacity="0.36"/>' +
                    '<stop offset="50%" stop-color="#0284C7" stop-opacity="0.45"/>' +
                    '<stop offset="100%" stop-color="#0369A1" stop-opacity="0.42"/>' +
                  '</linearGradient>' +
                  '<radialGradient id="pmLagoonGrad" cx="50%" cy="50%" r="50%">' +
                    '<stop offset="0%" stop-color="#67E8F9" stop-opacity="0.45"/>' +
                    '<stop offset="70%" stop-color="#38BDF8" stop-opacity="0.25"/>' +
                    '<stop offset="100%" stop-color="#0284C7" stop-opacity="0.05"/>' +
                  '</radialGradient>' +
                  '<linearGradient id="pmIslandSand1" x1="0%" y1="0%" x2="100%" y2="100%">' +
                    '<stop offset="0%" stop-color="#FEF08A" stop-opacity="0.75"/>' +
                    '<stop offset="40%" stop-color="#86EFAC" stop-opacity="0.55"/>' +
                    '<stop offset="70%" stop-color="#BBF7D0" stop-opacity="0.55"/>' +
                    '<stop offset="100%" stop-color="#FDE68A" stop-opacity="0.80"/>' +
                  '</linearGradient>' +
                  '<linearGradient id="pmIslandSand2" x1="100%" y1="0%" x2="0%" y2="100%">' +
                    '<stop offset="0%" stop-color="#FDE68A" stop-opacity="0.80"/>' +
                    '<stop offset="45%" stop-color="#A7F3D0" stop-opacity="0.55"/>' +
                    '<stop offset="100%" stop-color="#FEF08A" stop-opacity="0.70"/>' +
                  '</linearGradient>' +
                '</defs>' +

                // Líneas de Rumbo Náuticas de Navegación
                '<g class="pm-rhumb-lines" stroke="rgba(180, 83, 9, 0.12)" stroke-width="1" stroke-dasharray="4,6">' +
                  '<line x1="880" y1="120" x2="0" y2="1000" />' +
                  '<line x1="880" y1="120" x2="200" y2="1200" />' +
                  '<line x1="880" y1="120" x2="0" y2="500" />' +
                  '<line x1="880" y1="120" x2="500" y2="1200" />' +
                  '<line x1="120" y1="950" x2="1000" y2="200" />' +
                  '<line x1="120" y1="950" x2="800" y2="0" />' +
                  '<line x1="120" y1="950" x2="1000" y2="600" />' +
                  '<line x1="120" y1="950" x2="400" y2="0" />' +
                '</g>' +

                // Isla 1: Cayo Noreste
                '<path d="M 680,20 C 720,15 820,30 900,15 C 980,0 1020,40 1000,140 C 980,220 890,260 820,240 C 750,220 700,200 660,150 C 620,100 640,25 680,20 Z" fill="none" stroke="rgba(2, 132, 199, 0.25)" stroke-width="3" stroke-dasharray="6,4" />' +
                '<path d="M 690,30 C 730,25 820,38 890,25 C 960,12 1000,50 990,135 C 970,210 885,245 820,230 C 755,210 710,190 670,145 C 635,100 655,35 690,30 Z" fill="url(#pmIslandSand1)" stroke="#B45309" stroke-width="1.8" />' +

                // Isla 2: Cayo de los Arrecifes con Laguna Interior
                '<path d="M 20,340 C 90,320 180,330 230,380 C 280,430 270,520 220,570 C 170,620 80,630 20,590 C -20,550 -10,480 0,420 C 10,380 -10,350 20,340 Z" fill="none" stroke="rgba(2, 132, 199, 0.25)" stroke-width="3" stroke-dasharray="6,4" />' +
                '<path d="M 30,350 C 95,335 175,342 220,390 C 265,435 255,510 210,555 C 165,600 85,615 30,580 C -10,540 0,480 10,425 C 18,385 0,360 30,350 Z" fill="url(#pmIslandSand2)" stroke="#B45309" stroke-width="1.8" />' +
                '<path d="M 70,430 C 110,410 150,430 160,470 C 170,510 130,540 90,535 C 60,530 45,500 50,465 C 55,445 60,435 70,430 Z" fill="url(#pmLagoonGrad)" stroke="rgba(2, 132, 199, 0.4)" stroke-width="1.2" />' +

                // Isla 3: Península Montañosa Sureste
                '<path d="M 760,540 C 830,520 920,530 970,580 C 1020,630 1000,720 960,780 C 920,840 820,870 760,840 C 700,810 680,750 690,680 C 700,610 710,555 760,540 Z" fill="none" stroke="rgba(2, 132, 199, 0.25)" stroke-width="3" stroke-dasharray="6,4" />' +
                '<path d="M 770,550 C 835,532 915,540 960,588 C 1005,635 985,712 950,768 C 912,825 820,855 765,828 C 710,800 692,745 700,680 C 710,615 722,565 770,550 Z" fill="url(#pmIslandSand1)" stroke="#B45309" stroke-width="1.8" />' +

                // Isla 4: Atolón del Tesoro
                '<path d="M 80,820 C 150,800 240,830 260,900 C 280,970 230,1050 160,1080 C 90,1110 20,1080 0,1020 C -20,960 10,890 40,850 C 55,830 65,825 80,820 Z" fill="none" stroke="rgba(2, 132, 199, 0.25)" stroke-width="3" stroke-dasharray="6,4" />' +
                '<path d="M 90,830 C 155,812 230,840 248,905 C 265,968 220,1038 155,1065 C 92,1092 30,1065 12,1012 C -5,958 20,895 50,860 C 62,842 75,835 90,830 Z" fill="url(#pmIslandSand2)" stroke="#B45309" stroke-width="1.8" />' +

                // Río Serpentino Principal que atraviesa el mapa
                '<path d="M 1000,320 C 860,340 780,390 710,430 C 640,470 590,520 540,530 C 490,540 440,510 390,530 C 330,560 300,620 280,690 C 260,760 290,820 340,870 C 390,920 440,960 480,1020 C 520,1080 500,1150 490,1200 L 535,1200 C 550,1140 570,1070 525,1005 C 480,945 425,905 385,860 C 345,815 315,765 330,705 C 345,645 375,595 425,570 C 475,545 525,575 575,565 C 625,550 675,505 745,465 C 815,425 885,385 1000,370 Z" fill="url(#pmRiverGrad)" stroke="#0284C7" stroke-width="1.6" />' +
                '<path d="M 980,345 C 850,365 770,410 725,450 C 655,490 605,535 555,545 C 505,555 455,530 405,550 C 350,578 315,635 305,695 C 295,755 315,815 360,865 C 405,912 455,950 500,1015 C 535,1065 525,1135 512,1190" fill="none" stroke="rgba(255, 255, 255, 0.65)" stroke-width="2" stroke-dasharray="10,8" />' +

                // Afluente del río (brazo izquierdo)
                '<path d="M 0,210 C 80,225 150,260 210,295 C 265,330 310,355 350,390 L 335,410 C 295,375 250,350 195,315 C 140,280 70,250 0,235 Z" fill="url(#pmRiverGrad)" stroke="#0284C7" stroke-width="1.2" />' +

                // Ondas de agua marina
                '<g stroke="rgba(2, 132, 199, 0.35)" stroke-width="1.4" fill="none" stroke-linecap="round">' +
                  '<path d="M 320,110 c 8,-4 16,-4 24,0 c 8,4 16,4 24,0" />' +
                  '<path d="M 380,125 c 8,-4 16,-4 24,0 c 8,4 16,4 24,0" />' +
                  '<path d="M 120,680 c 9,-4 18,-4 27,0 c 9,4 18,4 27,0" />' +
                  '<path d="M 820,440 c 9,-4 18,-4 27,0 c 9,4 18,4 27,0" />' +
                  '<path d="M 620,920 c 10,-4 20,-4 30,0 c 10,4 20,4 30,0" />' +
                '</g>' +

                // Cordilleras / Montañas
                '<g fill="#FDE68A" stroke="#78350F" stroke-width="1.4" stroke-linejoin="round">' +
                  '<polygon points="760,110 780,75 800,110" />' +
                  '<polygon points="790,115 815,70 840,115" />' +
                  '<polygon points="830,120 850,85 870,120" />' +
                  '<polygon points="810,680 835,635 860,680" />' +
                  '<polygon points="850,685 875,640 900,685" />' +
                  '<polygon points="890,690 910,655 930,690" />' +
                '</g>' +

                // Profundidades náuticas (Soundings)
                '<g font-family="Georgia, serif" font-size="11" font-weight="bold" fill="rgba(120, 53, 15, 0.35)" font-style="italic">' +
                  '<text x="450" y="80">14</text>' +
                  '<text x="610" y="240">8</text>' +
                  '<text x="180" y="230">12</text>' +
                  '<text x="490" y="420">18</text>' +
                  '<text x="660" y="600">9</text>' +
                  '<text x="210" y="740">22</text>' +
                  '<text x="620" y="860">15</text>' +
                  '<text x="400" y="1120">7</text>' +
                  '<text x="710" y="1150">16</text>' +
                '</g>' +
              '</svg>' +

              // Elementos decorativos náuticos flotantes
              '<div class="pm-deco pm-deco-compass" title="Rosa de los Vientos">🧭</div>' +
              '<div class="pm-deco pm-deco-kraken" title="Monstruo Marino Kraken">🐙</div>' +
              '<div class="pm-deco pm-deco-sea-dragon" title="Serpiente Marina">🐉</div>' +
              '<div class="pm-deco pm-deco-shipwreck" title="Naufragio del Galeón">⛵</div>' +
              '<div class="pm-deco pm-deco-palm1">🌴</div>' +
              '<div class="pm-deco pm-deco-palm2">🌴</div>' +
              '<div class="pm-deco pm-deco-palm3">🌴</div>' +
              '<div class="pm-deco pm-deco-palm4">🌴</div>' +
              '<div class="pm-deco pm-deco-treasure-cove" title="Cala de Piratas">🏝️</div>' +
              '<div class="pm-deco pm-deco-bottle" title="Mensaje en Botella">🍾</div>' +
              '<div class="pm-deco pm-deco-anchor" title="Fondeadero Real">⚓</div>' +

              // Rótulos cartográficos antiguos
              '<div class="pm-map-label label-sea">MAR DE LAS IDEAS</div>' +
              '<div class="pm-map-label label-bay">Bahía del Código</div>' +
              '<div class="pm-map-label label-river">Río Circuitos</div>' +
              '<div class="pm-map-label label-island1">Cayo Robótica</div>' +
              '<div class="pm-map-label label-island2">Isla Calavera</div>' +
            '</div>'));

      bodyHtml =
        '<div class="pirate-map-canvas ' + (isLegacy ? 'legacy-map-canvas' : (isCyber ? 'cyber-map-canvas' : (isSpace ? 'space-map-canvas' : ''))) + '">' +
          pirateMapBackgroundHtml +
          pirateStartPortHtml +
          pirateIslandsHtml +
          pirateFinishHtml +
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
              (m.botones && m.botones.length > 0 ?
                m.botones.map(function(b){
                  return '<a href="' + b.url + '" target="_blank" rel="noopener noreferrer" class="arm-btn-secondary" style="color:#15803D;border-color:#86EFAC;"><i class="' + (b.icono || 'fas fa-external-link-alt') + '"></i> ' + (b.texto || 'Abrir') + '</a>';
                }).join('') :
                (m.type === 'gemini_notebooks' ? '<a href="' + (m.externalUrl || 'https://notebooklm.google.com') + '" target="_blank" rel="noopener noreferrer" class="arm-btn-secondary" style="color:#4F46E5;border-color:#C7D2FE;"><i class="fas fa-brain"></i> NotebookLM</a>' : (m.type === 'canva' || /canva/i.test(m.gameUrl || '') ? '<a href="' + (m.gameUrl || 'https://www.canva.com/es_419/crear/animaciones/') + '" target="_blank" rel="noopener noreferrer" class="arm-btn-secondary" style="color:#0284C7;border-color:#BAE6FD;"><i class="fas fa-palette"></i> Canva</a>' : (m.gameUrl && m.type !== 'paint' && !/cancha|paint/i.test(m.title || '') ? '<a href="' + m.gameUrl + '" target="_blank" rel="noopener noreferrer" class="arm-btn-secondary" style="color:#E11D48;border-color:#FDA4AF;"><i class="fas fa-gamepad"></i> Jugar</a>' : (m.externalUrl && m.type !== 'paint' ? '<a href="' + m.externalUrl + '" target="_blank" rel="noopener noreferrer" class="arm-btn-secondary" style="color:#15803D;border-color:#86EFAC;"><i class="fas fa-external-link-alt"></i> Abrir</a>' : ''))))) +
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

  function fallbackCopyText(text, callback) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      if (callback) callback();
    } catch(e) {}
    document.body.removeChild(ta);
  }

  // ──────────────────────────────────────────────────
  // HELPER: Cuchillo y Tablero Rústico Pirata de la Taberna
  // ──────────────────────────────────────────────────
  function getPirateKnifeSvg() {
    return '<div class="ptb-knife-anchor">' +
      '<svg class="ptb-knife-svg" viewBox="0 0 90 200" width="75" height="165" xmlns="http://www.w3.org/2000/svg">' +
        '<defs>' +
          '<linearGradient id="ptbBladeGrad" x1="0%" y1="0%" x2="100%" y2="0%">' +
            '<stop offset="0%" stop-color="#E2E8F0"/>' +
            '<stop offset="30%" stop-color="#FFFFFF"/>' +
            '<stop offset="50%" stop-color="#94A3B8"/>' +
            '<stop offset="70%" stop-color="#CBD5E1"/>' +
            '<stop offset="100%" stop-color="#475569"/>' +
          '</linearGradient>' +
          '<linearGradient id="ptbGoldHilt" x1="0%" y1="0%" x2="100%" y2="100%">' +
            '<stop offset="0%" stop-color="#FDE68A"/>' +
            '<stop offset="40%" stop-color="#D97706"/>' +
            '<stop offset="80%" stop-color="#92400E"/>' +
            '<stop offset="100%" stop-color="#78350F"/>' +
          '</linearGradient>' +
          '<linearGradient id="ptbLeatherGrip" x1="0%" y1="0%" x2="100%" y2="0%">' +
            '<stop offset="0%" stop-color="#2D1810"/>' +
            '<stop offset="35%" stop-color="#5C3317"/>' +
            '<stop offset="70%" stop-color="#3B1E08"/>' +
            '<stop offset="100%" stop-color="#1A0D07"/>' +
          '</linearGradient>' +
          '<filter id="ptbKnifeShadow" x="-30%" y="-20%" width="170%" height="170%">' +
            '<feDropShadow dx="6" dy="10" stdDeviation="5" flood-color="rgba(0,0,0,0.65)"/>' +
          '</filter>' +
        '</defs>' +
        '<g filter="url(#ptbKnifeShadow)" transform="rotate(-12 45 110)">' +
          '<!-- POMMEL DE ORO Y CALAVERA -->' +
          '<circle cx="45" cy="18" r="12" fill="url(#ptbGoldHilt)" stroke="#451A03" stroke-width="1.5"/>' +
          '<circle cx="45" cy="18" r="7.5" fill="#F59E0B" opacity="0.85"/>' +
          '<circle cx="42" cy="16" r="1.5" fill="#451A03"/>' +
          '<circle cx="48" cy="16" r="1.5" fill="#451A03"/>' +
          '<path d="M42 22 L48 22" stroke="#451A03" stroke-width="1.2"/>' +
          '<!-- MANGO ENCUERADO CON ALAMBRE DE ORO -->' +
          '<rect x="39" y="30" width="12" height="52" rx="3" fill="url(#ptbLeatherGrip)" stroke="#1A0D07" stroke-width="1.2"/>' +
          '<line x1="39" y1="38" x2="51" y2="43" stroke="#F59E0B" stroke-width="2"/>' +
          '<line x1="39" y1="48" x2="51" y2="53" stroke="#F59E0B" stroke-width="2"/>' +
          '<line x1="39" y1="58" x2="51" y2="63" stroke="#F59E0B" stroke-width="2"/>' +
          '<line x1="39" y1="68" x2="51" y2="73" stroke="#F59E0B" stroke-width="2"/>' +
          '<!-- GAVILAN / GUARDA CURVA PIRATA -->' +
          '<path d="M16 84 C28 88, 38 82, 45 82 C52 82, 62 88, 74 84 C78 82, 76 92, 66 91 C56 90, 48 88, 45 88 C42 88, 34 90, 24 91 C14 92, 12 82, 16 84 Z" fill="url(#ptbGoldHilt)" stroke="#451A03" stroke-width="1.4"/>' +
          '<circle cx="45" cy="85" r="3.5" fill="#FEF3C7" stroke="#78350F" stroke-width="1"/>' +
          '<!-- HOJA DE ACERO CLAVADA -->' +
          '<path d="M37 90 L39 152 L45 175 L51 152 L53 90 Z" fill="url(#ptbBladeGrad)" stroke="#475569" stroke-width="1.2"/>' +
          '<line x1="45" y1="90" x2="45" y2="168" stroke="#334155" stroke-width="1.4"/>' +
          '<line x1="43.5" y1="92" x2="43.5" y2="164" stroke="#FFFFFF" stroke-width="1" opacity="0.85"/>' +
          '<polygon points="40,154 45,175 50,154" fill="#0F172A" opacity="0.7"/>' +
        '</g>' +
      '</svg>' +
      '<div class="ptb-knife-slash"></div>' +
    '</div>';
  }

  function getSpaceLaserAntennaSvg() {
    return '<div class="ptb-knife-anchor space-antenna-anchor">' +
      '<svg class="ptb-knife-svg space-antenna-svg" viewBox="0 0 90 200" width="75" height="165" xmlns="http://www.w3.org/2000/svg">' +
        '<defs>' +
          '<linearGradient id="spProbeBody" x1="0%" y1="0%" x2="100%" y2="0%">' +
            '<stop offset="0%" stop-color="#0F172A"/>' +
            '<stop offset="45%" stop-color="#334155"/>' +
            '<stop offset="100%" stop-color="#0F172A"/>' +
          '</linearGradient>' +
          '<linearGradient id="spCyanBeam" x1="0%" y1="0%" x2="100%" y2="0%">' +
            '<stop offset="0%" stop-color="#06B6D4"/>' +
            '<stop offset="50%" stop-color="#E0F2FE"/>' +
            '<stop offset="100%" stop-color="#3B82F6"/>' +
          '</linearGradient>' +
          '<filter id="spNeonGlow" x="-40%" y="-20%" width="180%" height="180%">' +
            '<feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="rgba(34,211,238,0.75)"/>' +
          '</filter>' +
        '</defs>' +
        '<g filter="url(#spNeonGlow)" transform="rotate(-10 45 110)">' +
          '<!-- Esfera de Energía Superior -->' +
          '<circle cx="45" cy="20" r="13" fill="#0F172A" stroke="#22D3EE" stroke-width="2.5"/>' +
          '<circle cx="45" cy="20" r="7" fill="#38BDF8"/>' +
          '<circle cx="42" cy="17" r="2.5" fill="#FFFFFF"/>' +
          '<!-- Cuerpo del Transmisor Orbital -->' +
          '<rect x="37" y="33" width="16" height="50" rx="5" fill="url(#spProbeBody)" stroke="#38BDF8" stroke-width="1.5"/>' +
          '<line x1="39" y1="43" x2="51" y2="43" stroke="#22D3EE" stroke-width="2.5"/>' +
          '<line x1="39" y1="53" x2="51" y2="53" stroke="#A855F7" stroke-width="2.5"/>' +
          '<line x1="39" y1="63" x2="51" y2="63" stroke="#22D3EE" stroke-width="2.5"/>' +
          '<line x1="39" y1="73" x2="51" y2="73" stroke="#A855F7" stroke-width="2.5"/>' +
          '<!-- Paneles Solares / Aletas -->' +
          '<path d="M12 84 L36 80 L36 92 L12 90 Z" fill="#1E3A8A" stroke="#38BDF8" stroke-width="1.5"/>' +
          '<path d="M54 80 L78 84 L78 90 L54 92 Z" fill="#1E3A8A" stroke="#38BDF8" stroke-width="1.5"/>' +
          '<circle cx="45" cy="86" r="5" fill="#FDE047" stroke="#0284C7" stroke-width="1.5"/>' +
          '<!-- Haz Láser de Anclaje Holográfico -->' +
          '<path d="M39 92 L41 154 L45 176 L49 154 L51 92 Z" fill="url(#spCyanBeam)" stroke="#38BDF8" stroke-width="1.2"/>' +
          '<ellipse cx="45" cy="174" rx="12" ry="4" fill="#22D3EE" opacity="0.75"/>' +
        '</g>' +
      '</svg>' +
      '<div class="ptb-knife-slash space-laser-ring"></div>' +
    '</div>';
  }

  function getCyberChipConnectorSvg() {
    return '<div class="ptb-knife-anchor cyber-chip-anchor">' +
      '<svg class="ptb-knife-svg cyber-chip-svg" viewBox="0 0 90 200" width="75" height="165" xmlns="http://www.w3.org/2000/svg">' +
        '<defs>' +
          '<linearGradient id="cyChipBody" x1="0%" y1="0%" x2="100%" y2="100%">' +
            '<stop offset="0%" stop-color="#1E293B"/>' +
            '<stop offset="50%" stop-color="#0F172A"/>' +
            '<stop offset="100%" stop-color="#020617"/>' +
          '</linearGradient>' +
          '<linearGradient id="cyGoldPins" x1="0%" y1="0%" x2="100%" y2="0%">' +
            '<stop offset="0%" stop-color="#FDE047"/>' +
            '<stop offset="50%" stop-color="#EAB308"/>' +
            '<stop offset="100%" stop-color="#CA8A04"/>' +
          '</linearGradient>' +
          '<linearGradient id="cyLaserTrack" x1="0%" y1="0%" x2="100%" y2="0%">' +
            '<stop offset="0%" stop-color="#10B981"/>' +
            '<stop offset="50%" stop-color="#34D399"/>' +
            '<stop offset="100%" stop-color="#065F46"/>' +
          '</linearGradient>' +
          '<filter id="cyNeonPulse" x="-40%" y="-20%" width="180%" height="180%">' +
            '<feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="rgba(16,185,129,0.75)"/>' +
          '</filter>' +
        '</defs>' +
        '<g filter="url(#cyNeonPulse)" transform="rotate(-8 45 110)">' +
          '<!-- Conector Superior / LED RGB -->' +
          '<rect x="33" y="10" width="24" height="16" rx="4" fill="#020617" stroke="#10B981" stroke-width="2"/>' +
          '<circle cx="45" cy="18" r="4.5" fill="#34D399"/>' +
          '<circle cx="43" cy="16" r="1.5" fill="#FFFFFF"/>' +
          '<!-- Cuerpo del Microprocesador / Chip QFP -->' +
          '<rect x="25" y="28" width="40" height="58" rx="6" fill="url(#cyChipBody)" stroke="#10B981" stroke-width="1.8"/>' +
          '<!-- Pines Dorados Laterales -->' +
          '<rect x="18" y="34" width="7" height="4" rx="1" fill="url(#cyGoldPins)"/>' +
          '<rect x="18" y="44" width="7" height="4" rx="1" fill="url(#cyGoldPins)"/>' +
          '<rect x="18" y="54" width="7" height="4" rx="1" fill="url(#cyGoldPins)"/>' +
          '<rect x="18" y="64" width="7" height="4" rx="1" fill="url(#cyGoldPins)"/>' +
          '<rect x="18" y="74" width="7" height="4" rx="1" fill="url(#cyGoldPins)"/>' +
          '<rect x="65" y="34" width="7" height="4" rx="1" fill="url(#cyGoldPins)"/>' +
          '<rect x="65" y="44" width="7" height="4" rx="1" fill="url(#cyGoldPins)"/>' +
          '<rect x="65" y="54" width="7" height="4" rx="1" fill="url(#cyGoldPins)"/>' +
          '<rect x="65" y="64" width="7" height="4" rx="1" fill="url(#cyGoldPins)"/>' +
          '<rect x="65" y="74" width="7" height="4" rx="1" fill="url(#cyGoldPins)"/>' +
          '<!-- Núcleo de Silicio y Pistas Neón -->' +
          '<rect x="31" y="36" width="28" height="42" rx="4" fill="#090D1E" stroke="#EC4899" stroke-width="1.2"/>' +
          '<path d="M 37 44 L 45 44 L 45 56 L 53 56" fill="none" stroke="#10B981" stroke-width="1.6" stroke-linecap="round"/>' +
          '<circle cx="37" cy="44" r="1.5" fill="#34D399"/>' +
          '<circle cx="53" cy="56" r="1.5" fill="#EC4899"/>' +
          '<path d="M 37 68 L 47 68 L 51 64" fill="none" stroke="#FACC15" stroke-width="1.6" stroke-linecap="round"/>' +
          '<circle cx="37" cy="68" r="1.5" fill="#FDE047"/>' +
          '<!-- Pin de Fijación / Bus de Cobre de Inserción -->' +
          '<path d="M38 88 L40 156 L45 178 L50 156 L52 88 Z" fill="url(#cyLaserTrack)" stroke="#10B981" stroke-width="1.2"/>' +
          '<ellipse cx="45" cy="176" rx="11" ry="4" fill="#10B981" opacity="0.8"/>' +
        '</g>' +
      '</svg>' +
      '<div class="ptb-knife-slash cyber-chip-ring"></div>' +
    '</div>';
  }

  function getLegacyLaurelSealSvg() {
    return '<div class="ptb-knife-anchor legacy-laurel-anchor">' +
      '<svg class="ptb-knife-svg legacy-laurel-svg" viewBox="0 0 90 200" width="75" height="165" xmlns="http://www.w3.org/2000/svg">' +
        '<defs>' +
          '<linearGradient id="legGoldMedal" x1="0%" y1="0%" x2="100%" y2="100%">' +
            '<stop offset="0%" stop-color="#FDE047"/>' +
            '<stop offset="50%" stop-color="#F59E0B"/>' +
            '<stop offset="100%" stop-color="#B45309"/>' +
          '</linearGradient>' +
          '<linearGradient id="legRedRibbon" x1="0%" y1="0%" x2="100%" y2="100%">' +
            '<stop offset="0%" stop-color="#DC2626"/>' +
            '<stop offset="50%" stop-color="#B91C1C"/>' +
            '<stop offset="100%" stop-color="#7F1D1D"/>' +
          '</linearGradient>' +
          '<filter id="legSealGlow" x="-30%" y="-20%" width="160%" height="160%">' +
            '<feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="rgba(245,158,11,0.6)"/>' +
          '</filter>' +
        '</defs>' +
        '<g filter="url(#legSealGlow)" transform="rotate(-6 45 105)">' +
          '<!-- Lazo rojo superior con corte en V -->' +
          '<path d="M 28 8 L 45 32 L 62 8 L 56 65 L 34 65 Z" fill="url(#legRedRibbon)" stroke="#7F1D1D" stroke-width="1.2"/>' +
          '<line x1="45" y1="32" x2="45" y2="65" stroke="#FDE047" stroke-width="1.5"/>' +
          '<!-- Medalla de Honor Dorada -->' +
          '<circle cx="45" cy="80" r="28" fill="url(#legGoldMedal)" stroke="#78350F" stroke-width="2"/>' +
          '<circle cx="45" cy="80" r="22" fill="#1E1B4B" stroke="#FDE047" stroke-width="1.8"/>' +
          '<!-- Corona de laureles dorados -->' +
          '<circle cx="34" cy="74" r="3" fill="#FDE047"/><circle cx="32" cy="82" r="3" fill="#F59E0B"/><circle cx="36" cy="90" r="3" fill="#FDE047"/>' +
          '<circle cx="56" cy="74" r="3" fill="#FDE047"/><circle cx="58" cy="82" r="3" fill="#F59E0B"/><circle cx="54" cy="90" r="3" fill="#FDE047"/>' +
          '<!-- Estrella central -->' +
          '<polygon points="45,69 48,76 55,76 49,81 51,88 45,83 39,88 41,81 35,76 42,76" fill="#FDE047" stroke="#B45309" stroke-width="0.8"/>' +
          '<!-- Cinta colgante con remache que fija el pergamino -->' +
          '<path d="M38 108 L40 162 L45 182 L50 162 L52 108 Z" fill="url(#legRedRibbon)" stroke="#7F1D1D" stroke-width="1.2"/>' +
          '<ellipse cx="45" cy="180" rx="10" ry="4" fill="#F59E0B" opacity="0.8"/>' +
        '</g>' +
      '</svg>' +
      '<div class="ptb-knife-slash legacy-laurel-ring"></div>' +
    '</div>';
  }

  function buildPirateTavernBoard(opts) {
    opts = opts || {};
    var isLegacy = isLegacyTheme();
    var isCyber = isCyberTheme();
    var isSpace = isSpaceTheme();
    var sealIcon = opts.sealIcon || (isLegacy ? '🎓' : (isCyber ? '🤖' : (isSpace ? '🚀' : '☠️')));
    var defaultTag = isLegacy
      ? 'LIBRO DE HONOR & RECUERDOS · PROYECTOS CUMBRE DE EGRESADOS'
      : (isCyber
        ? 'TERMINAL DE HARDWARE · ESQUEMAS Y PROTOCOLOS DE CONTROL'
        : (isSpace ? 'CONSOLA DE COMANDO · TRANSMISIÓN DE LA FLOTA ESTELAR' : 'TABLERO DE LA TABERNA · EDICTO DE RECOMPENSAS'));
    var tag = opts.tag || defaultTag;
    var title = opts.title || '';
    var sub = opts.sub || '';
    var extraHeaderHtml = opts.extraHeaderHtml || '';
    var contentHtml = opts.contentHtml || '';

    var boardWrapTheme = isLegacy ? 'legacy-board-wrap' : (isCyber ? 'cyber-board-wrap' : (isSpace ? 'space-board-wrap' : ''));
    var boardTheme = isLegacy ? 'legacy-annuary-board' : (isCyber ? 'cyber-circuit-board' : (isSpace ? 'space-command-board' : ''));
    var anchorSvg = isLegacy ? getLegacyLaurelSealSvg() : (isCyber ? getCyberChipConnectorSvg() : (isSpace ? getSpaceLaserAntennaSvg() : getPirateKnifeSvg()));
    var sealTitle = isLegacy
      ? 'Gran Medalla de Honor Paulo Freire · Promoción 6.° Grado'
      : (isCyber
        ? 'Chip Microcontrolador Paulo Freire Core'
        : (isSpace ? 'Sello Oficial de la Flota Estelar Paulo Freire' : 'Sello Oficial del Navío Paulo Freire'));
    var tagIconClass = isLegacy ? 'fa-award' : (isCyber ? 'fa-microchip' : (isSpace ? 'fa-satellite-dish' : 'fa-scroll'));

    return '<div class="gdb-actividades-container ptb-main-wrap ' + boardWrapTheme + '">' +
      '<div class="pirate-tavern-board ' + boardTheme + '">' +
        '<div class="ptb-corner-bolt top-left"></div>' +
        '<div class="ptb-corner-bolt top-right"></div>' +
        '<div class="ptb-corner-bolt bottom-left"></div>' +
        '<div class="ptb-corner-bolt bottom-right"></div>' +
        '<div class="ptb-parchment-wrap">' +
          anchorSvg +
          '<div class="ptb-parchment-sheet">' +
            '<div class="ptb-wax-seal" title="' + sealTitle + '"><span>' + sealIcon + '</span></div>' +
            '<div class="ptb-sheet-header">' +
              '<span class="ptb-sheet-tag"><i class="fas ' + tagIconClass + '"></i> ' + tag + '</span>' +
              '<h3 class="ptb-sheet-title">' + title + '</h3>' +
              (sub ? '<p class="ptb-sheet-sub">' + sub + '</p>' : '') +
              extraHeaderHtml +
            '</div>' +
          '</div>' +
        '</div>' +
        contentHtml +
      '</div>' +
    '</div>';
  }

  // ──────────────────────────────────────────────────
  // RENDER PRINCIPAL
  // ──────────────────────────────────────────────────
  function renderGDriveDashboard(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;
    var student = window.getActiveStudent ? window.getActiveStudent() : null;
    if (!student) { container.innerHTML = ''; return; }
    if (window.GOOGLE_DRIVE_WEBHOOK_URL) { student.webhookUrl = window.GOOGLE_DRIVE_WEBHOOK_URL; }

    var isLegacy = isLegacyTheme(student);
    var isCyber = isCyberTheme(student);
    var isSpace = isSpaceTheme(student);

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

    // Juegos del Grado (exactamente los mismos que la página pública según el grado)
    var gradeGames = getStudentGradeGames(student);
    var badgeJuegos = gradeGames.length;

    // Badges y conteos
    var validProyectoFiles = (FOLDER_CONTENTS.proyecto.items || []).filter(function(f){
      return isScratchFile(f.name) || isMakecodeFile(f.name) || f.type==='scratch' || f.type==='makecode' || f.type==='circuito' || f.type==='electronica' || /\.(bmp|png|jpe?g|webp|mp4|mov)$/i.test(f.name);
    });

    // ── Proyectos de Clase (Actividades del Taller según currículo real) ──
    var gradeObj = (window.SCHOOL_DATA && Array.isArray(window.SCHOOL_DATA.grades))
      ? window.SCHOOL_DATA.grades.find(function(g){ return g.id === student.gradeId; })
      : null;
    var rawGradeProjects = (gradeObj && Array.isArray(gradeObj.projects)) ? gradeObj.projects : [];
    var classProjects = [];
    var seenProjKeys = {};
    rawGradeProjects.forEach(function(p, pIdx){
      var key = p.id || (p.title || ('p-' + pIdx));
      if (!seenProjKeys[key]) {
        seenProjKeys[key] = true;
        classProjects.push(p);
      }
    });

    if (Array.isArray(adventureMissions)) {
      adventureMissions.forEach(function(m, mIdx){
        var key = m.id || (m.title || ('m-' + mIdx));
        var already = classProjects.some(function(gp){
          return gp.id === m.id || (gp.title && m.title && gp.title.trim().toLowerCase() === m.title.trim().toLowerCase());
        });
        if (!already) {
          seenProjKeys[key] = true;
          classProjects.push(m);
        }
      });
    }

    // Auto-selección: al ingresar por primera vez es siempre el último proyecto dado en clase
    if (lastSelectedGradeId !== student.gradeId) {
      lastSelectedGradeId = student.gradeId;
      selectedClassProjectIdx = null;
    }
    if (selectedClassProjectIdx === null || selectedClassProjectIdx < 0 || selectedClassProjectIdx >= classProjects.length) {
      selectedClassProjectIdx = Math.max(0, classProjects.length - 1);
    }

    var allMediaItems = FOLDER_CONTENTS.dibujos.items || [];
    var videoMediaItems = allMediaItems.filter(function(it){ return it.type === 'video'; });
    var photoMediaItems = allMediaItems.filter(function(it){ return it.type !== 'video'; });
    var badgeDibujos = isLoadingDriveFiles
      ? '<i class="fas fa-spinner fa-spin"></i>'
      : (videoMediaItems.length > 0
          ? (videoMediaItems.length + ' vid &bull; ' + photoMediaItems.length + ' fot')
          : allMediaItems.length + ' fotos');
    var badgeProyectos   = adventureMissions.length;
    var badgeProyecto    = isLoadingProyectoFiles ? '<i class="fas fa-spinner fa-spin"></i>' : validProyectoFiles.length;
    var badgeActividades = classProjects.length || (FOLDER_CONTENTS.actividades.items.length + (FOLDER_CONTENTS.actividades.generalItems.length > 0 ? FOLDER_CONTENTS.actividades.generalItems.length : 1));
    var badgeFamiliar    = 2;

    // ── Filtros por subtab ──
    var scratchItems   = validProyectoFiles.filter(function(f){ return isScratchFile(f.name) || f.type==='scratch' || f.type==='circuito' || f.type==='electronica' || /\.(bmp|png|jpe?g|webp|mp4|mov)$/i.test(f.name); }).slice(0, 10);
    var makecodeItems  = validProyectoFiles.filter(function(f){ return isMakecodeFile(f.name) || f.type==='makecode'; }).slice(0, 10);

    // countText barra
    var countText = '';
    if (activeFolderKey === 'dibujos') {
      countText = isLoadingDriveFiles
        ? '<i class="fas fa-sync-alt fa-spin"></i> Sincronizando con Google Drive...'
        : allMediaItems.length + ' publicaciones (' + videoMediaItems.length + ' videos, ' + photoMediaItems.length + ' fotos)';
    } else if (activeFolderKey === 'proyectos') {
      countText = adventureMissions.length + (isLegacy ? ' hitos del camino (' : (isCyber ? ' nodos de circuito (' : (isSpace ? ' misiones planetarias (' : ' misiones de aventura ('))) + student.gradeName + ')';
    } else if (activeFolderKey === 'juegos') {
      countText = gradeGames.length + (isLegacy ? ' desafíos del torneo final (' : (isCyber ? ' desafíos arcade y lógica (' : ' juego(s) de programación y lógica (')) + student.gradeName + ')';
    } else if (activeFolderKey === 'proyecto') {
      if (isLoadingProyectoFiles) {
        countText = '<i class="fas fa-sync-alt fa-spin"></i> Cargando...';
      } else {
        countText = (proyectoSubTab === 'scratch' ? scratchItems.length + ' proyecto(s) Scratch Jr' : makecodeItems.length + (isLegacy ? ' códigos y cápsulas de egresado' : (isCyber ? ' códigos MakeCode/Robótica' : ' proyecto(s) MakeCode')));
      }
    } else if (activeFolderKey === 'actividades') {
      var actTotal = classProjects.length || 1;
      var actCur = (selectedClassProjectIdx !== null ? selectedClassProjectIdx + 1 : actTotal);
      countText = 'Clase / Proyecto #' + actCur + ' de ' + actTotal + ' (' + student.gradeName + ')';
    } else if (activeFolderKey === 'familiar') {
      countText = '2 experiencias interactivas en familia (Álbum Mundial & Escape Room)';
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

    // ═══ CARPETA: PROYECTO DEL ALUMNO (Scratch Jr + MakeCode / Robótica) ═══
    } else if (activeFolderKey === 'proyecto') {

      var tabsHtml =
        '<div class="proyecto-tabs pirate-ptabs">' +
          (showScratch ?
            '<button type="button" class="ptab ' + (proyectoSubTab==='scratch' ? 'active' : '') + '" data-subtab="scratch">' +
              '<span class="ptab-icon">🐱</span> Scratch Jr' +
            '</button>' : '') +
          '<button type="button" class="ptab ' + (proyectoSubTab==='makecode' ? 'active' : '') + '" data-subtab="makecode">' +
            '<span class="ptab-icon">💻</span> MakeCode / Robótica' +
          '</button>' +
        '</div>';

      var tabContent = '';

      // ── Pestaña SCRATCH JR ──
      if (proyectoSubTab === 'scratch') {
        var isLoading = isLoadingProyectoFiles && scratchItems.length === 0;
        if (isLoading) {
          tabContent = loadingHtml(
            'Cargando proyectos Scratch Jr...',
            isCyber ? 'Escaneando memorias y archivos en la terminal...' : (isSpace ? 'Escaneando archivos en la cápsula de tu nave...' : 'Buscando pergaminos en tu cofre del navío...'),
            isCyber ? '#10B981' : (isSpace ? '#0284C7' : '#EA580C')
          );
        } else if (scratchItems.length === 0) {
          tabContent = '<div class="gdb-empty-state"><div class="ges-icon">🐱</div><h4>' +
            (isCyber ? '¡Aún no hay archivos de código en la terminal!' : (isSpace ? '¡Aún no hay proyectos Scratch Jr en la cápsula!' : '¡Aún no hay proyectos Scratch Jr en el cofre!')) +
            '</h4><p>Subí tu archivo <strong>.sb3</strong> o <strong>.sjr</strong> arrastrándolo a la pantalla o con el botón superior.</p></div>';
        } else {
          tabContent = '<div class="grade-games-grid ptb-games-grid">' +
            scratchItems.map(function(item, idx){
              var dlUrl = getDownloadUrl(item);
              return '<div class="grade-game-card ptb-card" data-scratch-idx="' + idx + '">' +
                '<div class="ptb-card-nail" title="' + (isCyber ? 'Conectado a la terminal' : (isSpace ? 'Anclado a la consola orbital' : 'Clavado con tachuela al muelle')) + '"></div>' +
                '<div class="ggc-thumb-wrap" ' + (dlUrl && dlUrl !== '#' ? 'onclick="window.open(\'' + dlUrl + '\', \'_blank\')"' : '') + ' title="Descargar proyecto Scratch Jr">' +
                  '<div style="background:linear-gradient(135deg, #FFEDD5 0%, #FED7AA 50%, #FDBA74 100%);width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;">' +
                    '<span style="font-size:3.6rem;filter:drop-shadow(0 4px 10px rgba(0,0,0,0.25));">🐱</span>' +
                    '<span style="font-weight:900;font-size:0.82rem;color:#9A3412;letter-spacing:0.04em;">SCRATCH JR</span>' +
                  '</div>' +
                  '<div class="ggc-play-overlay">' +
                    '<div class="ggc-play-bubble"><i class="fas fa-download"></i></div>' +
                    '<span>¡Descargar Proyecto!</span>' +
                  '</div>' +
                  '<div class="ggc-lvl-badge pirate-gold-badge"><i class="fas fa-cat"></i> Proyecto #' + (idx + 1) + '</div>' +
                  '<div class="ggc-platform-badge pirate-plat-badge">🐱 .sjr / .sb3</div>' +
                '</div>' +
                '<div class="ggc-body">' +
                  '<div class="ggc-top-row">' +
                    '<h3 class="ggc-title">' + (item.title||item.name) + '</h3>' +
                  '</div>' +
                  '<p class="ggc-desc">Proyecto interactivo de bloques Scratch Jr para explorar algoritmos, personajes y animaciones.</p>' +
                  '<div class="ggc-tags-row">' +
                    '<span class="ggc-tag"><i class="far fa-clock"></i> ' + item.date + '</span>' +
                    '<span class="ggc-tag"><i class="fas fa-hdd"></i> ' + item.size + '</span>' +
                  '</div>' +
                  '<div class="ggc-actions">' +
                    (dlUrl && dlUrl !== '#'
                      ? '<a class="ggc-btn-play pirate-btn-exec" href="' + dlUrl + '" target="_blank" rel="noopener noreferrer"><i class="fas fa-download"></i> <span>Descargar</span></a>'
                      : '<span class="sfc-btn-disabled"><i class="fas fa-download"></i> Sin link</span>') +
                  '</div>' +
                '</div>' +
              '</div>';
            }).join('') + '</div>';
        }

      // ── Pestaña MAKECODE / PROYECTOS DEL GRADO ──
      } else {
        var mkLibrary = (window.MAKECODE_LIBRARY && window.MAKECODE_LIBRARY[student.gradeId]) || [];
        var gradeProjects = (gradeObj && Array.isArray(gradeObj.projects)) ? gradeObj.projects : [];

        // Lista unificada para la carpeta Proyectos
        var displayProjects = [];
        var seenProjectIds = {};

        // 1. Proyectos del Grado
        gradeProjects.forEach(function(p) {
          if (p && p.id && !seenProjectIds[p.id]) {
            seenProjectIds[p.id] = true;
            displayProjects.push(p);
          }
        });

        // 2. Entradas de MAKECODE_LIBRARY si no están ya en displayProjects
        mkLibrary.forEach(function(entry, idx) {
          var eid = entry.id || ('mk-' + idx);
          var alreadyExists = displayProjects.some(function(p){
            return p.id === eid || (entry.shareUrl && p.makecodeUrl && p.makecodeUrl.includes(entry.shareUrl.split('/').pop()));
          });
          if (!alreadyExists) {
            seenProjectIds[eid] = true;
            displayProjects.push({
              id: eid,
              level: entry.level || (idx + 1),
              title: entry.title || ('Código MakeCode #' + (idx + 1)),
              description: entry.description || 'Proyecto interactivo de programación en MakeCode para Micro:bit.',
              shareUrl: entry.shareUrl,
              makecodeUrl: entry.shareUrl,
              coverImage: entry.coverImage || 'img/proyectos/servo_joystick_makecode_cover.svg',
              badge: entry.badge || '💻 MakeCode Micro:bit',
              icon: entry.icon || 'fa-microchip',
              color: entry.color || '#0D9488',
              codeSnippet: entry.codeSnippet || null,
              type: 'makecode'
            });
          }
        });

        if (student.gradeId === 'grado5' || student.gradeId === 'grado6' || student.gradeId === '5to' || student.gradeId === '6to') {
          displayProjects = displayProjects.filter(function(p){
            return p.id === 'g5-p1' || p.id === 'g6-p1' || /halloween|hechizos|monstruo/i.test((p.title || '') + ' ' + (p.id || ''));
          });
          displayProjects.forEach(function(p, idx){
            p.level = idx + 1;
          });
        }

        if (displayProjects.length === 0) {
          tabContent = '<div class="gdb-empty-state">' +
            '<div class="ges-icon">💻</div>' +
            '<h4>Biblioteca de Proyectos vacía</h4>' +
            '<p>' + (isCyber ? 'El equipo de ingeniería todavía no agregó códigos para ' : (isSpace ? 'El comandante todavía no agregó códigos para ' : 'El capitán todavía no agregó códigos para ')) + '<strong>' + student.gradeName + '</strong>.<br>' +
            'Los proyectos se configuran en el archivo <code>js/data.js</code>.</p>' +
          '</div>';
        } else {
          tabContent = '<div class="grade-games-grid ptb-games-grid">' +
            displayProjects.map(function(proj, idx) {
              var isServo = (proj.id === 'g6-p2') || (/servo.*joystick|joystick.*servo/i.test(proj.title || ''));
              var isCanva = proj.type === 'canva' || /canva/i.test(proj.title || '');
              var isGemini = (proj.id === 'g6-p3') || (/gemini|notebooklm|materiales.*estudio/i.test(proj.title || ''));
              var coverImg = proj.coverImage || (isServo ? 'img/proyectos/servo_joystick_makecode_cover.svg' : (isCanva ? 'img/proyectos/canva_arquero_ia_cover.svg' : (isGemini ? 'img/proyectos/gemini_notebooks_cover.svg' : 'img/microbit.png')));
              var levelNum = proj.level || (idx + 1);
              var badgeText = proj.badge || (isServo ? 'Arquero & Servo SG90' : (isCanva ? 'Canva & IA' : (isGemini ? 'Gemini & NotebookLM' : 'MakeCode Micro:bit')));
              var platformIcon = isGemini ? '🧠' : (isCanva ? '🎨' : '💻');
              var platformLabel = isGemini ? 'NotebookLM' : (isCanva ? 'Canva IA' : 'MakeCode');
              var actionUrl = proj.makecodeUrl || proj.shareUrl || proj.externalUrl || proj.gameUrl || (isGemini ? 'https://notebooklm.google.com' : '#');
              var actionLabel = isGemini ? 'Abrir NotebookLM' : (isCanva ? 'Abrir en Canva' : (proj.type === 'makecode' || proj.makecodeUrl ? 'Abrir MakeCode' : 'Abrir Proyecto'));

              var rawDesc = proj.description || 'Proyecto interactivo de robótica y programación en MakeCode para Micro:bit.';
              var shortDesc = rawDesc;
              if (shortDesc.length > 120) {
                shortDesc = shortDesc.substring(0, 115).trim() + '...';
              }

              return '<div class="grade-game-card ptb-card mklib-card-item" data-project-id="' + (proj.id || ('p-' + idx)) + '" data-entry-idx="' + idx + '">' +
                '<div class="ptb-card-nail" title="' + (isCyber ? 'Conectado a la terminal' : (isSpace ? 'Anclado a la consola orbital' : 'Clavado con tachuela al muelle')) + '"></div>' +
                '<div class="ggc-thumb-wrap mklib-btn-modal-trigger" title="Hacé clic para ver el proyecto completo">' +
                  '<img src="' + coverImg + '" alt="' + (proj.title || '').replace(/"/g, '&quot;') + '" class="ggc-thumb-img" onerror="this.src=\'img/microbit.png\'">' +
                  '<div class="ggc-play-overlay">' +
                    '<div class="ggc-play-bubble"><i class="fas fa-chalkboard-teacher"></i></div>' +
                    '<span>¡Ver Proyecto!</span>' +
                  '</div>' +
                  '<div class="ggc-lvl-badge pirate-gold-badge"><i class="fas fa-layer-group"></i> Nivel ' + levelNum + '</div>' +
                  '<div class="ggc-platform-badge pirate-plat-badge">' + platformIcon + ' ' + platformLabel + '</div>' +
                '</div>' +
                '<div class="ggc-body">' +
                  '<div class="ggc-top-row">' +
                    '<h3 class="ggc-title">' + (proj.title || '') + '</h3>' +
                  '</div>' +
                  '<p class="ggc-desc">' + shortDesc + '</p>' +
                  '<div class="ggc-tags-row">' +
                    '<span class="ggc-tag">#' + badgeText.replace(/[^\wáéíóúÁÉÍÓÚñÑ]/g, '') + '</span>' +
                    (isServo ? '<span class="ggc-tag">#ServoSG90</span><span class="ggc-tag">#Joystick</span>' : '') +
                    (isCanva ? '<span class="ggc-tag">#AnimaciónIA</span>' : '') +
                    (isGemini ? '<span class="ggc-tag">#AudioOverview</span>' : '') +
                  '</div>' +
                  '<div class="ggc-actions">' +
                    (actionUrl && actionUrl !== '#' ?
                      '<a class="ggc-btn-play pirate-btn-exec mklib-btn-entrar-link" href="' + actionUrl + '" target="_blank" rel="noopener noreferrer" title="' + actionLabel + '">' +
                        '<i class="fas fa-play"></i> <span>Ejecutar</span>' +
                      '</a>' : '') +
                    '<button type="button" class="ggc-btn-sugerencias mklib-btn-modal-trigger" title="Ver ficha pedagógica y proyecto completo">' +
                      '<i class="fas fa-chalkboard-teacher"></i> <span>Ver Ficha</span>' +
                    '</button>' +
                  '</div>' +
                '</div>' +
              '</div>';
            }).join('') +
          '</div>';
        }
        // MakeCode no tiene zona de subida — es solo lectura
        uploadZoneHtml = '';
      }

      mainDisplayHtml = buildPirateTavernBoard({
        sealIcon: isLegacy ? '🎓' : (isCyber ? '🧠' : (isSpace ? '🤖' : '💻')),
        tag: isLegacy
          ? 'CÁPSULA DEL TIEMPO · CÓDIGOS Y PROYECTOS CUMBRE DE EGRESADOS'
          : (isCyber
            ? 'TERMINAL DE CÓDIGO · LABORATORIO DE ROBÓTICA Y ALGORITMOS'
            : (isSpace ? 'CONSOLA DE COMANDO · LABORATORIO ESPACIAL DE CÓDIGOS Y ROBÓTICA' : 'TABLERO DE LA TABERNA · COFRE DE CÓDIGOS Y ROBÓTICA')),
        title: isLegacy
          ? ('🎓 Cápsula de Códigos y Proyectos Cumbre — Egresados ' + student.gradeName)
          : (isCyber
            ? ('🧠 Núcleo de Código y Algoritmos — División ' + student.gradeName)
            : (isSpace
              ? ('🤖 Laboratorio Espacial de Códigos — Nave ' + student.gradeName)
              : ('💻 Cofre de Códigos y Robótica — Navío ' + student.gradeName))),
        sub: isLegacy
          ? '¡Tus creaciones de programación, circuitos Micro:bit, robótica e Inteligencia Artificial que marcan el cierre de primaria!'
          : (isCyber
            ? '¡Explorá los algoritmos, circuitos con Micro:bit, servomotores y código interactivo de tu división tecnológica!'
            : (isSpace
              ? '¡Explorá los sistemas de MakeCode, micro:bit, sensores y Scratch Jr para programar los módulos y satélites de la Flota Estelar!'
              : '¡Explorá los proyectos de MakeCode, micro:bit, sensores y Scratch Jr para programar las naves y artefactos de la tripulación!')),
        extraHeaderHtml: tabsHtml,
        contentHtml: tabContent
      });

    // ═══ CARPETA: ACTIVIDADES DE CLASE (PROYECTOS DADOS EN EL TALLER) ═══
    } else if (activeFolderKey === 'actividades') {
      var currentProj = (classProjects && classProjects[selectedClassProjectIdx]) ? classProjects[selectedClassProjectIdx] : (classProjects && classProjects[0]) || null;
      var gradeFiles = FOLDER_CONTENTS.actividades.items || [];
      var generalFiles = FOLDER_CONTENTS.actividades.generalItems || [];

      // Barra selectora de número de clase/proyecto
      var selectorPillsHtml = classProjects.map(function(proj, idx){
        var isCur = (idx === selectedClassProjectIdx);
        var isLast = (idx === classProjects.length - 1);
        var badgeIcon = proj.type === 'electronica' ? '⚡' : (proj.type === 'paint' ? '🎨' : (proj.type === 'makecode' ? '💻' : (proj.type === 'scratch' ? '🐱' : (proj.type === 'canva' ? '🎨' : (proj.id === 'g6-p3' ? '🧠' : '🚀')))));
        var shortTitle = proj.title || ('Clase #' + (idx + 1));
        if (shortTitle.length > 28) shortTitle = shortTitle.substring(0, 26).trim() + '...';

        return '<button type="button" class="cpt-pill-btn ' + (isCur ? 'active' : '') + (isLast ? ' is-latest' : '') + '" data-class-idx="' + idx + '" title="' + (proj.title || '').replace(/"/g, '&quot;') + '">' +
          '<span class="cpt-pill-icon">' + badgeIcon + '</span>' +
          '<span class="cpt-pill-num">Clase #' + (idx + 1) + '</span>' +
          '<span class="cpt-pill-name">' + shortTitle + '</span>' +
          (isLast ? '<span class="cpt-pill-tag">⭐ Última</span>' : '') +
        '</button>';
      }).join('');

      var classSelectorBarHtml =
        '<div class="cpt-selector-container">' +
          '<div class="cpt-selector-header">' +
            '<div class="cpt-sh-left">' +
              '<span class="cpt-sh-icon">🎯</span>' +
              '<div class="cpt-sh-text">' +
                '<strong>Proyectos de Clase dados en el Taller (' + student.gradeName + ')</strong>' +
                '<small>Elegí el número para ver el proyecto trabajado (al ingresar carga por defecto la última clase dada):</small>' +
              '</div>' +
            '</div>' +
            (classProjects.length > 1 ?
              '<div class="cpt-nav-arrows">' +
                '<button type="button" class="cpt-arrow-btn cpt-prev" data-class-idx="' + (selectedClassProjectIdx - 1) + '" ' + (selectedClassProjectIdx <= 0 ? 'disabled' : '') + ' title="Ver clase anterior">' +
                  '<i class="fas fa-chevron-left"></i> Anterior' +
                '</button>' +
                '<span class="cpt-counter-badge">' + (selectedClassProjectIdx + 1) + ' de ' + classProjects.length + '</span>' +
                '<button type="button" class="cpt-arrow-btn cpt-next" data-class-idx="' + (selectedClassProjectIdx + 1) + '" ' + (selectedClassProjectIdx >= classProjects.length - 1 ? 'disabled' : '') + ' title="Ver siguiente clase">' +
                  'Siguiente <i class="fas fa-chevron-right"></i>' +
                '</button>' +
              '</div>' : '') +
          '</div>' +
          '<div class="cpt-pills-row">' +
            selectorPillsHtml +
          '</div>' +
        '</div>';

      // ── Ficha Completa del Proyecto Seleccionado ──
      var currentProjHtml = '';
      if (currentProj) {
        var isServo = (currentProj.id === 'g6-p2') || (/servo.*joystick|joystick.*servo/i.test(currentProj.title || ''));
        var isCanva = currentProj.type === 'canva' || /canva/i.test(currentProj.title || '');
        var isGemini = (currentProj.id === 'g6-p3') || (/gemini|notebooklm|materiales.*estudio/i.test(currentProj.title || ''));
        var coverImg = currentProj.coverImage || (isServo ? 'img/proyectos/servo_joystick_makecode_cover.svg' : (isCanva ? 'img/proyectos/canva_arquero_ia_cover.svg' : (isGemini ? 'img/proyectos/gemini_notebooks_cover.svg' : (currentProj.gallery && currentProj.gallery[0]) || (currentProj.type === 'makecode' || currentProj.type === 'electronica' ? 'img/microbit.png' : 'img/scratchjr.png'))));
        var safeTitleJs = (currentProj.title || 'Proyecto de Clase').replace(/'/g, "\\'");
        var pdfUrl = currentProj.pdfUrl || currentProj.downloadPdfUrl || null;
        var codeUrl = currentProj.makecodeUrl || (currentProj.scratchId ? ('https://scratch.mit.edu/projects/' + currentProj.scratchId) : (currentProj.gameUrl || currentProj.externalUrl || (isGemini ? 'https://notebooklm.google.com' : null)));
        var codeLabel = currentProj.makecodeUrl ? 'Abrir en MakeCode' : (currentProj.scratchId ? 'Abrir en Scratch' : (isGemini ? 'Abrir NotebookLM' : (isCanva ? 'Abrir en Canva' : 'Abrir Proyecto')));
        var isLast = (selectedClassProjectIdx === classProjects.length - 1);
        var projTypeBadge = currentProj.badge || (currentProj.type === 'electronica' ? '⚡ Circuito Electrónico' : (currentProj.type === 'paint' ? '🎨 Arte Digital & Paint' : (currentProj.type === 'makecode' ? '💻 MakeCode Micro:bit' : (currentProj.type === 'scratch' ? '🐱 Scratch Jr' : (isGemini ? '🧠 Gemini & NotebookLM' : (isCanva ? '🎨 Canva & Animación IA' : '🚀 Proyecto Maker'))))));

        // Pasos de clase
        var instructionsList = currentProj.instructions || currentProj.steps || [];
        var instructionsHtml = '';
        if (Array.isArray(instructionsList) && instructionsList.length > 0) {
          var stepsCards = instructionsList.map(function(s, sIdx){
            var stNum = s.step || (sIdx + 1);
            var stTitle = s.title || ('Paso ' + stNum);
            var stDesc = s.desc || s.description || (typeof s === 'string' ? s : '');
            var stTip = s.tip || null;
            return '<div class="cpfc-step-card">' +
              '<div class="cpfc-step-num">' + stNum + '</div>' +
              '<div class="cpfc-step-content">' +
                '<h5 class="cpfc-step-title">' + stTitle + '</h5>' +
                '<p class="cpfc-step-desc">' + stDesc + '</p>' +
                (stTip ? '<div class="cpfc-step-tip">💡 <strong>Tip Maker:</strong> ' + stTip + '</div>' : '') +
              '</div>' +
            '</div>';
          }).join('');

          instructionsHtml =
            '<div class="cpfc-section cpfc-steps-section">' +
              '<h3 class="cpfc-section-title"><i class="fas fa-list-ol"></i> Guía Paso a Paso de la Clase:</h3>' +
              '<div class="cpfc-steps-grid">' +
                stepsCards +
              '</div>' +
            '</div>';
        }

        // Materiales
        var materialsList = currentProj.materials || [];
        var materialsHtml = '';
        if (Array.isArray(materialsList) && materialsList.length > 0) {
          var matChips = materialsList.map(function(m){
            var mTitle = m.title || (typeof m === 'string' ? m : 'Componente');
            var mDesc = m.description || '';
            var mIcon = m.icon || 'fa-tools';
            return '<div class="cpfc-material-chip">' +
              '<div class="cpfc-mat-icon"><i class="fas ' + mIcon + '"></i></div>' +
              '<div class="cpfc-mat-info">' +
                '<strong>' + mTitle + '</strong>' +
                (mDesc ? '<span>' + mDesc + '</span>' : '') +
              '</div>' +
            '</div>';
          }).join('');

          materialsHtml =
            '<div class="cpfc-section cpfc-materials-section">' +
              '<h3 class="cpfc-section-title"><i class="fas fa-toolbox"></i> Materiales y Herramientas del Taller Utilizados:</h3>' +
              '<div class="cpfc-materials-grid">' +
                matChips +
              '</div>' +
            '</div>';
        }

        // Recursos adicionales Google Drive
        var gradeCardsHtml = '';
        if (gradeFiles.length > 0) {
          gradeCardsHtml = gradeFiles.map(function(item, idx){
            var isPdf = item.type === 'pdf' || (item.name && item.name.toLowerCase().endsWith('.pdf'));
            var dlUrl = getDownloadUrl(item);
            var viewUrl = item.id ? ('https://drive.google.com/file/d/' + item.id + '/view') : dlUrl;
            var imgThumb = (item.type === 'image' || !isPdf)
              ? ('https://lh3.googleusercontent.com/d/' + item.id)
              : 'img/pdf_preview_placeholder.png';
            var isImg = (item.type === 'image' || !isPdf);
            var displayItemTitle = item.title || ((isLegacy ? 'Recuerdo de Honor #' : (isCyber ? 'Diagrama Técnico #' : (isSpace ? 'Misión en Base Lunar #' : 'Misión en Tierra #'))) + (idx + 1));
            var safeTitle = displayItemTitle.replace(/'/g, "\\'");
            var clickAction = isImg
              ? 'if(window.openImageModal) window.openImageModal(\'' + imgThumb + '\', \'' + safeTitle + '\', \'' + dlUrl + '\');'
              : 'window.open(\'' + viewUrl + '\', \'_blank\');';

            return '<div class="grade-game-card ptb-card" data-act-idx="' + idx + '">' +
              '<div class="ptb-card-nail" title="Documento del Taller"></div>' +
              '<div class="ggc-thumb-wrap" onclick="' + clickAction + '" title="Hacé clic para ver">' +
                (isImg
                  ? '<img src="' + imgThumb + '" alt="' + displayItemTitle.replace(/"/g, '&quot;') + '" class="ggc-thumb-img" onerror="this.src=\'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80\'">'
                  : '<div style="background:linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%);width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:3.5rem;">📄</div>'
                ) +
                '<div class="ggc-play-overlay">' +
                  '<div class="ggc-play-bubble"><i class="fas fa-search-plus"></i></div>' +
                  '<span>' + (isImg ? '¡Ver Ficha!' : '¡Abrir PDF!') + '</span>' +
                '</div>' +
                '<div class="ggc-lvl-badge pirate-gold-badge"><i class="fas ' + (isCyber ? 'fa-microchip' : 'fa-graduation-cap') + '"></i> ' + student.gradeName + '</div>' +
                '<div class="ggc-platform-badge pirate-plat-badge">' + (isPdf ? '📄 Ficha PDF' : '⚡ Documento') + '</div>' +
              '</div>' +
              '<div class="ggc-body">' +
                '<div class="ggc-top-row">' +
                  '<h3 class="ggc-title">' + displayItemTitle + '</h3>' +
                '</div>' +
                '<p class="ggc-desc">Material complementario subido a Google Drive para ' + student.gradeName + '.</p>' +
                '<div class="ggc-actions">' +
                  (isImg
                    ? '<button type="button" class="ggc-btn-play pirate-btn-exec" onclick="' + clickAction + '"><i class="fas fa-eye"></i> <span>Ver Ficha</span></button>'
                    : '<a href="' + viewUrl + '" target="_blank" rel="noopener noreferrer" class="ggc-btn-play pirate-btn-exec"><i class="fas fa-eye"></i> <span>Abrir PDF</span></a>'
                  ) +
                  '<a href="' + dlUrl + '" onclick="return window.downloadDriveFileDirect(\'' + dlUrl + '\', \'' + safeTitle + '\', event);" class="ggc-btn-sugerencias" style="display:flex;align-items:center;justify-content:center;gap:6px;" title="Descargar">' +
                    '<i class="fas fa-download"></i> <span>Descargar</span>' +
                  '</a>' +
                '</div>' +
              '</div>' +
            '</div>';
          }).join('');
        }

        var extraDriveFilesHtml = '';
        if (gradeCardsHtml) {
          extraDriveFilesHtml =
            '<div class="cpfc-section cpfc-drive-section">' +
              '<h4 class="cpfc-drive-title"><i class="fab fa-google-drive"></i> Materiales y Fichas Complementarias en Google Drive (' + student.gradeName + ')</h4>' +
              '<div class="grade-games-grid ptb-games-grid" style="margin-top:14px;">' +
                gradeCardsHtml +
              '</div>' +
            '</div>';
        }

        currentProjHtml =
          '<div class="class-project-full-card">' +
            '<div class="cpfc-header">' +
              '<div class="cpfc-badge-group">' +
                '<span class="cpfc-badge-class"><i class="fas fa-chalkboard-teacher"></i> Clase / Proyecto #' + (selectedClassProjectIdx + 1) + '</span>' +
                '<span class="cpfc-badge-type">' + projTypeBadge + '</span>' +
                (isLast ? '<span class="cpfc-badge-status-latest"><i class="fas fa-star"></i> Última Clase / Proyecto Actual</span>' : '<span class="cpfc-badge-status-past"><i class="fas fa-history"></i> Clase Anterior</span>') +
              '</div>' +
              '<h2 class="cpfc-title">' + currentProj.title + '</h2>' +
              '<div class="cpfc-meta">' +
                '<span><i class="fas fa-user-tie"></i> ' + (currentProj.author || 'Taller Maker Paulo Freire') + '</span>' +
                '<span><i class="fas fa-graduation-cap"></i> ' + student.gradeName + '</span>' +
                (currentProj.date ? '<span><i class="far fa-clock"></i> ' + currentProj.date + '</span>' : '') +
              '</div>' +
            '</div>' +

            '<div class="cpfc-hero-grid">' +
              '<div class="cpfc-cover-wrap btn-open-class-project" data-class-idx="' + selectedClassProjectIdx + '" title="Hacé clic para abrir la Ficha Interactiva Completa">' +
                '<img src="' + coverImg + '" alt="' + (currentProj.title || '').replace(/"/g, '&quot;') + '" class="cpfc-cover-img" onerror="this.src=\'img/microbit.png\'">' +
                '<div class="cpfc-cover-overlay">' +
                  '<div class="cpfc-play-icon"><i class="fas fa-expand-arrows-alt"></i></div>' +
                  '<span>¡Explorar Ficha y Proyecto Completo!</span>' +
                '</div>' +
                '<div class="cpfc-cover-badge"><i class="fas fa-layer-group"></i> Nivel ' + (currentProj.level || (selectedClassProjectIdx + 1)) + '</div>' +
              '</div>' +

              '<div class="cpfc-info-col">' +
                '<div class="cpfc-desc-box">' +
                  '<h4><i class="fas fa-info-circle"></i> ¿De qué trata este proyecto?</h4>' +
                  '<p>' + (currentProj.description || 'Proyecto interactivo del taller maker.') + '</p>' +
                '</div>' +

                (currentProj.objective ?
                  '<div class="cpfc-objective-box">' +
                    '<h4><i class="fas fa-bullseye"></i> Objetivo de Aprendizaje</h4>' +
                    '<p>' + currentProj.objective + '</p>' +
                  '</div>' : '') +

                (currentProj.benefits ?
                  '<div class="cpfc-benefits-box">' +
                    '<h4><i class="fas fa-brain"></i> Habilidades y Pensamiento Computacional</h4>' +
                    '<p>' + currentProj.benefits + '</p>' +
                  '</div>' : '') +

                '<div class="cpfc-actions">' +
                  '<button type="button" class="cpfc-btn-primary btn-open-class-project" data-class-idx="' + selectedClassProjectIdx + '" title="Abrir presentación interactiva, simulador y paso a paso">' +
                    '<i class="fas fa-chalkboard-teacher"></i> <span>Abrir Guía Interactiva Completa</span>' +
                  '</button>' +
                  (pdfUrl ?
                    '<button type="button" class="cpfc-btn-pdf" onclick="openPdfModal(\'' + pdfUrl + '\', \'' + safeTitleJs + '\')" title="Ver guía PDF oficial de la clase">' +
                      '<i class="fas fa-file-pdf"></i> <span>Ver PDF</span>' +
                    '</button>' +
                    '<a href="' + pdfUrl + '" onclick="return window.downloadDriveFileDirect(\'' + pdfUrl + '\', \'' + safeTitleJs + '\', event);" class="cpfc-btn-download" title="Descargar PDF">' +
                      '<i class="fas fa-download"></i> <span>Descargar PDF</span>' +
                    '</a>' : '') +
                  (codeUrl && codeUrl !== '#' ?
                    '<a href="' + codeUrl + '" target="_blank" rel="noopener noreferrer" class="cpfc-btn-code" title="' + codeLabel + '">' +
                      '<i class="fas fa-code"></i> <span>' + codeLabel + '</span>' +
                    '</a>' : '') +
                '</div>' +
              '</div>' +
            '</div>' +

            instructionsHtml +
            materialsHtml +
            extraDriveFilesHtml +
          '</div>';
      } else {
        currentProjHtml = '<div class="gdb-empty-state"><div class="ges-icon">📚</div><h4>No hay proyectos registrados para este grado</h4><p>Pronto se cargarán proyectos en el currículo de ' + student.gradeName + '.</p></div>';
      }

      mainDisplayHtml = buildPirateTavernBoard({
        sealIcon: isLegacy ? '🎓' : (isCyber ? '⚡' : (isSpace ? '🛰️' : '📜')),
        tag: isLegacy
          ? 'PROYECTOS CUMBRE DE CLASE · ANUARIO DE EGRESADOS'
          : (isCyber
            ? 'TERMINAL DE INGENIERÍA · PROYECTOS DE CLASE'
            : (isSpace ? 'CONSOLA DE MISIONES · PROYECTOS DE CLASE' : 'PROYECTOS DEL TALLER · ACTIVIDADES DE CLASE')),
        title: 'Clase #' + (selectedClassProjectIdx + 1) + ': ' + (currentProj ? currentProj.title : 'Proyecto de Clase'),
        sub: 'Elegí el número de clase para ver su proyecto y materiales. Al ingresar se carga por defecto la última clase dada en el taller (' + student.gradeName + ').',
        extraHeaderHtml: classSelectorBarHtml,
        contentHtml: currentProjHtml
      });

      uploadZoneHtml = '';

    // ═══ CARPETA: ACTIVIDAD FAMILIAR (Escape Rooms Nostálgico) ═══
    } else if (activeFolderKey === 'familiar') {
      var escapeRoomUrl = 'https://roboticapaulofreire-uy.github.io/escape-rooms-nostalgico/index.html';
      var mundialUrl = 'https://roboticapaulofreire-uy.github.io/mundial/';
      var albumThumb = 'https://roboticapaulofreire-uy.github.io/mundial/img/tapa-album-robotica.jpg';
      var figObj = (typeof window.getStudentFigurita === 'function') ? window.getStudentFigurita(student) : null;

      var albumMundialCardHtml =
        '<div class="grade-game-card ptb-card" style="max-width: 480px; margin: 0 auto;">' +
          '<div class="ptb-card-nail" title="Álbum Oficial de Figuritas"></div>' +
          '<div class="ggc-thumb-wrap" onclick="window.open(\'' + mundialUrl + '\', \'_blank\')" title="Hacé clic para abrir el Álbum Digital CPF 2026" style="cursor:pointer;">' +
            '<img src="' + albumThumb + '" alt="Tapa Álbum Digital CPF 2026" class="ggc-thumb-img" style="object-fit:cover;">' +
            '<div class="ggc-play-overlay">' +
              '<div class="ggc-play-bubble"><i class="fas fa-book-open"></i></div>' +
              '<span>¡Abrir mi Álbum!</span>' +
            '</div>' +
            '<div class="ggc-lvl-badge pirate-gold-badge"><i class="fas fa-trophy"></i> Mundial 2026</div>' +
            '<div class="ggc-platform-badge pirate-plat-badge">⚽ 232 Figuritas</div>' +
          '</div>' +
          '<div class="ggc-body">' +
            '<div class="ggc-top-row">' +
              '<h3 class="ggc-title">Álbum Digital CPF 2026 — Robótica Mundial</h3>' +
            '</div>' +
            '<p class="ggc-desc">¡Coleccioná las 232 figuritas de tus compañeros en familia! Escaneá códigos QR, abrí paquetes virtuales con confeti y descubrí tu propio cromo coleccionable.</p>' +
            '<div class="ggc-tags-row">' +
              '<span class="ggc-tag">#FiguritasCPF</span>' +
              '<span class="ggc-tag">#EscánerQR</span>' +
              '<span class="ggc-tag">#ColecciónFamiliar</span>' +
            '</div>' +
            '<div class="ggc-actions">' +
              '<a href="' + mundialUrl + '" target="_blank" rel="noopener noreferrer" class="ggc-btn-play pirate-btn-exec" title="Abrir Álbum Digital">' +
                '<i class="fas fa-book-open"></i> <span>Abrir mi Álbum</span>' +
              '</a>' +
              (figObj ?
                '<button type="button" class="ggc-btn-sugerencias" onclick="window.abrirModalFiguritaAlumno && window.abrirModalFiguritaAlumno();" style="display:flex;align-items:center;justify-content:center;gap:6px;" title="Ver mi cromo">' +
                  '<i class="fas fa-star" style="color:#EAB308;"></i> <span>Mi Figurita</span>' +
                '</button>' : '') +
            '</div>' +
          '</div>' +
        '</div>';

      var escapeRoomCardHtml =
        '<div class="grade-game-card ptb-card" style="max-width: 480px; margin: 0 auto;">' +
          '<div class="ptb-card-nail" title="' + (isCyber ? 'Conectado a la terminal' : (isSpace ? 'Anclado a la consola orbital' : 'Clavado con tachuela al muelle')) + '"></div>' +
          '<div class="ggc-thumb-wrap" onclick="window.open(\'' + escapeRoomUrl + '\', \'_blank\')" title="Hacé clic para ingresar al Escape Room" style="background: ' + (isCyber ? 'radial-gradient(circle at center, #064E3B 0%, #022C22 60%, #020617 100%)' : 'radial-gradient(circle at center, #312E81 0%, #1E1B4B 60%, #0F172A 100%)') + '; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height: 200px;">' +
            '<div style="text-align:center; padding: 20px 10px;">' +
              '<span style="font-size: 4.2rem; filter: drop-shadow(0 6px 14px rgba(0,0,0,0.6));">' + (isCyber ? '🤖' : (isSpace ? '🚀' : '🗝️')) + '</span>' +
              '<div style="color: ' + (isCyber ? '#34D399' : '#38BDF8') + '; font-weight: 900; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.08em; text-shadow: 0 2px 4px rgba(0,0,0,0.8); margin-top: 6px;">' + (isCyber ? 'Hackeo & Enigmas Maker' : (isSpace ? 'Odisea & Misterio Estelar' : 'Misterio & Nostalgia')) + '</div>' +
            '</div>' +
            '<div class="ggc-play-overlay">' +
              '<div class="ggc-play-bubble"><i class="fas fa-play"></i></div>' +
              '<span>' + (isCyber ? '¡Hackear Escape Room!' : (isSpace ? '¡Despegar al Escape Room!' : '¡Zarpar al Escape Room!')) + '</span>' +
            '</div>' +
            '<div class="ggc-lvl-badge pirate-gold-badge"><i class="fas fa-users"></i> ' + (isCyber ? 'Hackeo Familiar' : (isSpace ? 'Odisea Familiar' : 'Travesía Familiar')) + '</div>' +
            '<div class="ggc-platform-badge pirate-plat-badge">' + (isCyber ? '🤖 Escape Room Interactivo' : '🗝️ Escape Room Interactivo') + '</div>' +
          '</div>' +
          '<div class="ggc-body">' +
            '<div class="ggc-top-row">' +
              '<h3 class="ggc-title">' + (isCyber ? 'Escape Room: Hackeo de Enigmas y Algoritmos' : (isSpace ? 'Escape Room: Odisea y Enigmas Galácticos' : 'Escape Room: Enigmas y Pistas Piratas')) + '</h3>' +
            '</div>' +
            '<p class="ggc-desc">' + (isCyber ? 'Descifrá contraseñas, secuencias binarias y pistas nostálgicas en una terminal interactiva junto a tu familia.' : (isSpace ? 'Descifrá códigos espaciales y pistas nostálgicas junto a la tripulación de tu familia en una misión colaborativa.' : 'Descifrá enigmas y pistas nostálgicas junto a tu tripulación familiar. Una aventura colaborativa con acertijos y mucha creatividad.')) + '</p>' +
            '<div class="ggc-tags-row">' +
              '<span class="ggc-tag">#Enigmas</span>' +
              '<span class="ggc-tag">#Colaboración</span>' +
              '<span class="ggc-tag">#EscapeRoom</span>' +
            '</div>' +
            '<div class="ggc-actions">' +
              '<a href="' + escapeRoomUrl + '" target="_blank" rel="noopener noreferrer" class="ggc-btn-play pirate-btn-exec" title="Abrir Escape Room">' +
                '<i class="fas ' + (isCyber ? 'fa-terminal' : (isSpace ? 'fa-rocket' : 'fa-compass')) + '"></i> <span>' + (isCyber ? 'Hackear Escape Room' : (isSpace ? 'Despegar al Escape Room' : 'Zarpar al Escape Room')) + '</span>' +
              '</a>' +
            '</div>' +
          '</div>' +
        '</div>';

      mainDisplayHtml = buildPirateTavernBoard({
        sealIcon: isLegacy ? '🎓' : (isCyber ? '🤖' : (isSpace ? '🚀' : '🗝️')),
        tag: isLegacy
          ? 'LIBRO DE RECUERDOS · HOMENAJE Y DESAFÍO EN FAMILIA'
          : (isCyber
            ? 'TERMINAL DE CONTROL · HACKEO DE ENIGMAS EN FAMILIA'
            : (isSpace ? 'CONSOLA DE COMANDO · ODISEA Y MISTERIO EN FAMILIA' : 'TABLERO DE LA TABERNA · TRAVESÍA Y MISTERIO EN FAMILIA')),
        title: isLegacy
          ? '🎓 Escape Room: Desafío Legendario y Recuerdos en Familia'
          : (isCyber
            ? '🤖 Escape Room: Hackeo de Enigmas y Algoritmos en Familia'
            : (isSpace ? '🚀 Escape Room: Odisea y Enigmas en Familia' : '🗝️ Escape Room: Enigmas y Pistas Piratas')),
        sub: isLegacy
          ? '¡Celebrá este gran cierre junto a tu familia! Resuelvan enigmas colaborativos, revivan memorias del camino y completen la misión de despedida.'
          : (isCyber
            ? '¡Conectá a toda tu familia a la terminal! Resuelvan secuencias lógicas, descifren contraseñas secretas y hackeen el sistema para completar el desafío.'
            : (isSpace
              ? '¡Despegá junto a la tripulación de tu hogar! Descifrá enigmas nostálgicos, acertijos interactivos y códigos secretos para completar la misión.'
              : '¡Zarpá junto a tu tripulación familiar! Descifrá enigmas nostálgicos, acertijos interactivos y secretos ocultos para escapar con el botín.')),
        contentHtml: '<div class="grade-games-grid ptb-games-grid" style="grid-template-columns: repeat(auto-fit, minmax(300px, 440px)); justify-content: center; gap: 20px;">' + albumMundialCardHtml + escapeRoomCardHtml + '</div>'
      });

      uploadZoneHtml = '';

    // ═══ CARPETA: JUEGOS DEL GRADO (DESAFÍOS PIRATAS / MISIONES GALÁCTICAS / ARCADE CYBER) ═══
    } else if (activeFolderKey === 'juegos') {
      mainDisplayHtml = renderGradeGamesHtml(student, gradeGames);
      uploadZoneHtml = '';

    // ═══ CARPETA: FOTOS & VIDEOS ESTILO FACEBOOK ═══
    } else {
      displayItems = FOLDER_CONTENTS.dibujos.items || [];
      mainDisplayHtml = renderFacebookMediaWallHtml(student, displayItems, fbMediaFilter, driveTargetUrl, isLoadingDriveFiles);
    }

    // ──────────────────────────────────────────────────
    // SUBIDA INTELIGENTE: Sin caja fija en pantalla
    // Solo aparece la zona activa al arrastrar un archivo o con el botón
    // ──────────────────────────────────────────────────
    var canUpload = (activeFolderKey === 'dibujos') || (activeFolderKey === 'proyecto' && proyectoSubTab === 'scratch' && showScratch);
    var uploadAccept = activeFolderKey === 'dibujos' ? '.bmp,.png,.jpg,.jpeg,.webp,.gif,.mp4,.mov,.webm,.avi,image/*,video/*' : '.sb3,.sjr,.pjson,.sb';
    var uploadBtnText = activeFolderKey === 'dibujos'
      ? '<i class="fas fa-plus-circle"></i> Subir Foto o Video'
      : '<i class="fas fa-plus-circle"></i> Subir Scratch Jr';
    var uploadBtnClass = activeFolderKey === 'dibujos' ? 'gca-btn-upload' : 'gca-btn-upload scratch';

    if (canUpload) {
      var dragTitle = activeFolderKey === 'dibujos'
        ? '¡Soltá tu foto o video aquí para guardarlo en tu muro de Google Drive!'
        : '¡Soltá tu proyecto Scratch Jr aquí!';
      var dragHint = activeFolderKey === 'dibujos'
        ? 'Formatos permitidos: <strong>fotos (.png, .jpg, .webp) o videos (.mp4, .mov, .webm)</strong>'
        : 'Formatos permitidos: <strong>.sb3, .sjr, .pjson, .sb</strong>';

      uploadZoneHtml =
        '<input type="file" id="gdz-file-input" class="gdz-input" accept="' + uploadAccept + '" style="display:none;">' +
        '<div class="gdb-drag-overlay" id="gdb-drag-overlay">' +
          '<div class="gdo-card">' +
            '<div class="gdo-icon"><i class="fas ' + (isLegacy ? 'fa-graduation-cap' : (isCyber ? 'fa-microchip' : (isSpace ? 'fa-rocket' : 'fa-gem'))) + '"></i></div>' +
            '<h3>' + dragTitle + '</h3>' +
            '<p>' + dragHint + '</p>' +
          '</div>' +
        '</div>' +
        '<div class="gdb-upload-status-toast hidden" id="gdb-upload-status-toast"></div>';
    } else {
      uploadZoneHtml = '';
    }

    // ──────────────────────────────────────────────────
    // ESTADÍSTICAS GAMER Y PROGRESO
    // ──────────────────────────────────────────────────
    var completedCount = adventureMissions.filter(function(m){ return m.status === 'completado'; }).length;
    var totalMissions = adventureMissions.length;
    var progressPercent = totalMissions > 0 ? Math.min(100, Math.round((completedCount / totalMissions) * 100)) : 0;
    var studentLevel = Math.max(1, Math.floor(completedCount / 2) + 1);
    var pirateRank = isLegacy
      ? (studentLevel >= 5 ? 'Leyenda Graduada Maker 🎓🏆' : (studentLevel >= 3 ? 'Maestro Egresado de Honor' : 'Pionero de 6.° Grado'))
      : (isCyber
        ? (studentLevel >= 5 ? 'Maestro Cyber & IA' : (studentLevel >= 3 ? 'Arquitecto de Robots' : 'Operador de Circuitos'))
        : (isSpace
          ? (studentLevel >= 5 ? 'Comandante Estelar' : (studentLevel >= 3 ? 'Piloto Interplanetario' : 'Cadete Espacial'))
          : (studentLevel >= 5 ? 'Capitán Corsario' : (studentLevel >= 3 ? 'Timonel Maker' : 'Grumete Explorador'))));
    var totalXp = completedCount * 100;
    var nextMission = adventureMissions.find(function(m){ return m.status !== 'completado'; }) || adventureMissions[0];

    // ──────────────────────────────────────────────────
    // HTML COMPLETO DEL PANEL GAMER (PIRATA, ESPACIAL, CYBER O EGRESADOS)
    // ──────────────────────────────────────────────────
    var dashboardThemeClass = isLegacy ? 'theme-legacy' : (isCyber ? 'theme-cyber' : (isSpace ? 'theme-space' : 'theme-pirate'));
    var heroCardClass = isLegacy ? 'legacy-hero-card' : (isCyber ? 'cyber-hero-card' : (isSpace ? 'space-hero-card' : ''));

    container.innerHTML =
      '<section class="gdrive-dashboard-centered gamer-dashboard-container ' + dashboardThemeClass + '" id="student-drive-dashboard">' +
        // 1. HERO HEADER: PERFIL DEL CAPITÁN / ASTRONAUTA / MAESTRO CYBER / EGRESADO
        '<div class="gamer-hero-card ' + heroCardClass + '">' +
          '<div class="gh-main-row">' +
            '<div class="gh-player-profile">' +
              '<div class="gh-avatar-container">' +
                ((typeof window.renderStudentAvatarHtml === 'function') ? window.renderStudentAvatarHtml(student, 'gh-avatar', true) : ('<span class="gh-avatar">' + (student.avatar || (isLegacy ? '🎓' : (isCyber ? '🤖' : (isSpace ? '👨‍🚀' : '👦')))) + '</span>')) +
                '<span class="gh-status-dot" title="' + (isLegacy ? 'Egresado de Honor de la Generación Maker Paulo Freire' : (isCyber ? 'Conectado a la Red Neuronal Paulo Freire' : (isSpace ? 'En órbita en la Estación Espacial Paulo Freire' : 'A bordo del Navío Paulo Freire'))) + '"></span>' +
              '</div>' +
              '<div class="gh-player-meta">' +
                '<div class="gh-tag-row">' +
                  '<span class="gh-badge grade"><i class="fas ' + (isLegacy ? 'fa-graduation-cap' : (isCyber ? 'fa-microchip' : (isSpace ? 'fa-rocket' : 'fa-anchor'))) + '"></i> ' + (isLegacy ? 'Promoción ' : (isCyber ? 'División ' : (isSpace ? 'Nave ' : 'Navío '))) + student.gradeName + '</span>' +
                  '<span class="gh-badge level"><i class="fas ' + (isLegacy ? 'fa-award' : (isCyber ? 'fa-robot' : (isSpace ? 'fa-user-astronaut' : 'fa-skull-crossbones'))) + '"></i> ' + pirateRank + ' · Nivel ' + studentLevel + '</span>' +
                '</div>' +
                '<h2 class="gh-player-name">' + (isLegacy ? ('¡Honor y Gloria, ' + student.name.split(' ')[0] + '! 🎓✨') : (isCyber ? ('¡Sistema en línea, ' + student.name.split(' ')[0] + '! 🤖⚡') : (isSpace ? ('¡Despegamos, ' + student.name.split(' ')[0] + '! 🚀👨‍🚀') : ('¡A la mar, ' + student.name.split(' ')[0] + '! 🏴‍☠️')))) + '</h2>' +
                '<span class="gh-player-sub">' + (isLegacy ? 'Libro de Recuerdos y Proyectos Cumbre · Generación Maker Paulo Freire' : (isCyber ? 'Red de Robótica, Microcontroladores e IA · Laboratorio Paulo Freire' : (isSpace ? 'Bitácora de Exploración Galáctica · Estación Espacial Paulo Freire' : 'Bitácora de Navegación Maker · Navío Paulo Freire'))) + '</span>' +
              '</div>' +
            '</div>' +

            '<div class="gh-actions-group">' +
              (nextMission ?
                '<button type="button" class="gh-btn-continue" id="gh-btn-continue-mission" title="' + (isLegacy ? 'Explorar siguiente hito de honor' : (isCyber ? 'Compilar siguiente nodo de circuito' : (isSpace ? 'Despegar a la siguiente misión planetaria' : 'Zarpar a la siguiente misión'))) + '">' +
                  '<div class="gbc-icon"><i class="fas ' + (isLegacy ? 'fa-award' : (isCyber ? 'fa-terminal' : (isSpace ? 'fa-satellite' : 'fa-compass'))) + '"></i></div>' +
                  '<div class="gbc-text">' +
                    '<span class="gbc-sub">' + (isLegacy ? 'Continuar Hito' : (isCyber ? 'Compilar Nodo' : (isSpace ? 'Viajar al Planeta' : 'Zarpar a la Misión'))) + '</span>' +
                    '<strong class="gbc-title">' + (nextMission.level ? ((isLegacy ? 'Hito ' : (isCyber ? 'Nodo ' : (isSpace ? 'Planeta ' : 'Isla '))) + nextMission.level + ': ') : '') + nextMission.title + '</strong>' +
                  '</div>' +
                  '<i class="fas fa-chevron-right gbc-arrow"></i>' +
                '</button>' : '') +

              (driveTargetUrl ?
                '<div class="gh-extra-links">' +
                  '<a href="' + driveTargetUrl + '" target="_blank" rel="noopener noreferrer" class="gh-pill-link" title="' + (isLegacy ? 'Abrir mi Anuario' : (isCyber ? 'Abrir mi Terminal' : (isSpace ? 'Abrir mi Cápsula' : 'Abrir mi Cofre'))) + '">' +
                    '<i class="fas ' + (isLegacy ? 'fa-book' : (isCyber ? 'fa-microchip' : (isSpace ? 'fa-satellite-dish' : 'fa-gem'))) + '"></i> <span>' + (isLegacy ? 'Anuario' : (isCyber ? 'Terminal' : (isSpace ? 'Cápsula' : 'Cofre'))) + '</span>' +
                  '</a>' +
                '</div>' : '') +
            '</div>' +
          '</div>' +

          '<div class="gh-stats-row">' +
            '<div class="gh-xp-badge">' +
              '<span class="gh-xp-spark">' + (isLegacy ? '👑' : (isCyber ? '⚡' : (isSpace ? '🌟' : '🪙'))) + '</span>' +
              '<span class="gh-xp-num">+' + totalXp + (isLegacy ? ' Laureles' : (isCyber ? ' TeraWatts' : (isSpace ? ' Cristales' : ' Doblones'))) + '</span>' +
            '</div>' +
            '<div class="gh-progress-wrapper">' +
              '<div class="gh-progress-header">' +
                '<span class="gh-ph-label"><i class="fas ' + (isLegacy ? 'fa-award' : (isCyber ? 'fa-network-wired' : (isSpace ? 'fa-satellite' : 'fa-map-marked-alt'))) + '"></i> ' + (isLegacy ? 'Camino a la Graduación y Diploma Maker' : (isCyber ? 'Sincronización de la Red Maker' : (isSpace ? 'Radar de Exploración Galáctica' : 'Bitácora de Travesía'))) + '</span>' +
                '<span class="gh-ph-count">' + (isLegacy ? ('<strong>' + completedCount + '</strong> de <strong>' + totalMissions + '</strong> hitos completados (' + progressPercent + '%)') : (isCyber ? ('<strong>' + completedCount + '</strong> de <strong>' + totalMissions + '</strong> nodos compilados (' + progressPercent + '%)') : ('<strong>' + completedCount + '</strong> de <strong>' + totalMissions + '</strong> ' + (isSpace ? 'planetas explorados' : 'misiones conquistadas') + ' (' + progressPercent + '%)'))) + '</span>' +
              '</div>' +
              '<div class="gh-progress-track">' +
                '<div class="gh-progress-fill" style="width:' + progressPercent + '%;">' +
                  '<div class="gh-progress-light"></div>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        // 2. NAVEGACIÓN (TABS TÁCTILES PIRATAS, GALÁCTICAS, CYBER O EGRESADOS)
        '<div class="gamer-nav-bar ' + (isLegacy ? 'legacy-nav-bar' : (isCyber ? 'cyber-nav-bar' : (isSpace ? 'space-nav-bar' : ''))) + '" role="tablist" aria-label="Secciones del Tablero">' +
          '<button type="button" class="gnb-tab gdb-qpill ' + (activeFolderKey === 'proyectos' ? 'active' : '') + '" data-folder="proyectos">' +
            '<span class="gnb-emoji">' + (isLegacy ? '📜' : (isCyber ? '🔌' : (isSpace ? '🪐' : '🗺️'))) + '</span>' +
            '<div class="gnb-info">' +
              '<span class="gnb-title">' + (isLegacy ? 'Camino del Egresado' : (isCyber ? 'Red de Nodos' : (isSpace ? 'Mapa Estelar' : 'Mapa del Tesoro'))) + '</span>' +
              '<span class="gnb-badge">' + badgeProyectos + (isLegacy ? ' hitos' : (isCyber ? ' nodos' : (isSpace ? ' planetas' : ' misiones'))) + '</span>' +
            '</div>' +
          '</button>' +
          '<button type="button" class="gnb-tab gdb-qpill ' + (activeFolderKey === 'juegos' ? 'active' : '') + '" data-folder="juegos">' +
            '<span class="gnb-emoji">' + (isLegacy ? '🕹️' : (isCyber ? '🕹️' : (isSpace ? '🛸' : '⚔️'))) + '</span>' +
            '<div class="gnb-info">' +
              '<span class="gnb-title">' + (isLegacy ? 'Torneo de Despedida' : (isCyber ? 'Arcade Cyber' : (isSpace ? 'Misiones Galácticas' : 'Desafíos Piratas'))) + '</span>' +
              '<span class="gnb-badge">' + badgeJuegos + ' juegos</span>' +
            '</div>' +
          '</button>' +
          '<button type="button" class="gnb-tab gdb-qpill ' + (activeFolderKey === 'dibujos' ? 'active' : '') + '" data-folder="dibujos">' +
            '<span class="gnb-emoji">📸🎬</span>' +
            '<div class="gnb-info">' +
              '<span class="gnb-title">Fotos & Videos</span>' +
              '<span class="gnb-badge">' + badgeDibujos + '</span>' +
            '</div>' +
          '</button>' +
          '<button type="button" class="gnb-tab gdb-qpill ' + (activeFolderKey === 'proyecto' ? 'active' : '') + '" data-folder="proyecto">' +
            '<span class="gnb-emoji">' + (isLegacy ? '🎓' : (isCyber ? '🧠' : (isSpace ? '🤖' : '💻'))) + '</span>' +
            '<div class="gnb-info">' +
              '<span class="gnb-title">' + (isLegacy ? 'Cápsula de Códigos' : (isCyber ? 'Núcleo de Código' : (isSpace ? 'Lab Espacial' : 'Cofre de Códigos'))) + '</span>' +
              '<span class="gnb-badge">' + badgeProyecto + ' inventos</span>' +
            '</div>' +
          '</button>' +
          '<button type="button" class="gnb-tab gdb-qpill ' + (activeFolderKey === 'actividades' ? 'active' : '') + '" data-folder="actividades">' +
            '<span class="gnb-emoji">' + (isLegacy ? '📜' : (isCyber ? '⚡' : (isSpace ? '🛰️' : '🏫'))) + '</span>' +
            '<div class="gnb-info">' +
              '<span class="gnb-title">Proyectos de Clase</span>' +
              '<span class="gnb-badge">' + badgeActividades + ' clases</span>' +
            '</div>' +
          '</button>' +
          '<button type="button" class="gnb-tab gdb-qpill ' + (activeFolderKey === 'familiar' ? 'active' : '') + '" data-folder="familiar">' +
            '<span class="gnb-emoji">' + (isLegacy ? '🤝' : (isCyber ? '🔐' : (isSpace ? '🚀' : '🏴‍☠️'))) + '</span>' +
            '<div class="gnb-info">' +
              '<span class="gnb-title">' + (isLegacy ? 'Homenaje Familiar' : (isCyber ? 'Hackeo Familiar' : (isSpace ? 'Odisea Familiar' : 'Travesía Familiar'))) + '</span>' +
              '<span class="gnb-badge">Escape Room</span>' +
            '</div>' +
          '</button>' +
        '</div>' +

        // 3. CONTENEDOR PRINCIPAL A PANTALLA COMPLETA
        '<div class="gamer-content-wrapper">' +
          '<main class="gdb-content-area gamer-fullwidth">' +
            '<div class="gca-folder-bar">' +
              '<div class="gca-fb-title">' +
                '<i class="fas ' + (isLegacy ? 'fa-award' : (isCyber ? 'fa-microchip' : (isSpace ? 'fa-satellite' : currentFolder.icon))) + '"></i>' +
                '<span>' + (isLegacy ? 'Libro: ' : (isCyber ? 'Terminal: ' : (isSpace ? 'Transmisión: ' : 'Bitácora: '))) + '<strong>' +
                  (activeFolderKey === 'proyectos' ? ((isLegacy ? '📜 Camino del Egresado · Proyectos Cumbre (' : (isCyber ? '🔌 Red de Nodos de Robótica e IA (' : (isSpace ? '🪐 Mapa Estelar Galáctico (' : '🗺️ Mapa del Tesoro ('))) + student.gradeName + ')') :
                   activeFolderKey === 'juegos' ? ((isLegacy ? '🕹️ Torneo de Despedida: Juegos & Desafíos Finales (' : (isCyber ? '🕹️ Arcade Cyber & Algoritmos de Programación (' : (isSpace ? '🛸 Simulador de Misiones Galácticas (' : '⚔️ Desafíos Piratas y Algoritmos ('))) + student.gradeName + ')') :
                   activeFolderKey === 'dibujos' ? ((isLegacy ? '🏆 Álbum de Recuerdos, Diplomas y Obras de Arte (' : (isCyber ? '📟 Matriz de Renders, Esquemas y Diseños (' : (isSpace ? '🌌 Consola de Hologramas y Dibujos (' : '🎨 La Mesa del Capitán: Dibujos y Pergaminos ('))) + student.gradeName + ')') :
                   activeFolderKey === 'proyecto'  ? (isLegacy ? '🎓 Cápsula de Códigos, Robótica y Creaciones de Egreso' : (isCyber ? '🧠 Núcleo de Código, Algoritmos y Robótica Micro:bit' : (isSpace ? '🤖 Laboratorio Espacial de Códigos y Robótica' : '💻 Cofre de Invenciones y Códigos Maker'))) :
                   activeFolderKey === 'actividades' ? (isLegacy ? ('📜 Proyectos y Clases Cumbre (' + student.gradeName + ')') : (isCyber ? ('⚡ Proyectos y Clases de Robótica (' + student.gradeName + ')') : (isSpace ? ('🛰️ Proyectos y Clases Galácticas (' + student.gradeName + ')') : ('🏫 Proyectos y Actividades de Clase (' + student.gradeName + ')')))) :
                   activeFolderKey === 'familiar' ? (isLegacy ? '🤝 Homenaje Familiar: Escape Room de Graduación' : (isCyber ? '🔐 Hackeo Familiar: Escape Room de Algoritmos' : (isSpace ? '🚀 Odisea Familiar: Escape Room Interestelar' : '🏴‍☠️ Travesía Familiar: Escape Room de Enigmas'))) : currentFolder.name) +
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

    // ── Botón Continuar Misión ──
    var btnCont = container.querySelector('#gh-btn-continue-mission');
    if (btnCont && nextMission) {
      btnCont.onclick = function(){
        if (window.sounds) window.sounds.playClick();
        if (activeFolderKey !== 'proyectos') {
          activeFolderKey = 'proyectos';
          renderGDriveDashboard(containerId);
          setTimeout(function(){
            openAdventureProjectModal(nextMission, 'presentacion');
          }, 150);
        } else {
          openAdventureProjectModal(nextMission, 'presentacion');
        }
      };
    }

    // ── Eventos de navegación rápida en cabecera (pills / tabs gamer) ──
    container.querySelectorAll('.gdb-qpill, .gnb-tab').forEach(function(btn){
      btn.onclick = function(){
        if (window.sounds) window.sounds.playClick();
        activeFolderKey = btn.dataset.folder;
        currentCarouselIndex = 0;
        captainTablePage = 1;
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

    // ── La Mesa del Capitán (dibujos y pergaminos) ──
    if (activeFolderKey === 'dibujos') {
      container.querySelectorAll('.captain-scroll-card').forEach(function(card){
        var imgUrl = card.dataset.imgUrl;
        var title = card.dataset.imgTitle;
        var dlUrl = card.dataset.dlUrl;

        var viewBtn = card.querySelector('.csc-btn-view');
        var thumbFrame = card.querySelector('.csc-thumb-frame');

        function openBig(e){
          e.stopPropagation();
          openImageModal(imgUrl, title, dlUrl);
        }

        if (viewBtn) viewBtn.onclick = openBig;
        if (thumbFrame) thumbFrame.onclick = openBig;
      });

      // Manejador de paginación náutica pirata (6 pergaminos por pliego)
      container.querySelectorAll('.captain-table-pagination button[data-page]').forEach(function(btn){
        btn.onclick = function(e){
          e.stopPropagation();
          if (btn.disabled) return;
          var targetPage = parseInt(btn.dataset.page, 10);
          if (isNaN(targetPage) || targetPage < 1) return;
          if (window.sounds) window.sounds.playClick();
          captainTablePage = targetPage;
          renderGDriveDashboard(containerId);
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

      // Clic en isla pirata (Landmark): Abre el Modal directamente con las pestañas pedagógicas
      container.querySelectorAll('.pirate-island-landmark').forEach(function(landmark){
        landmark.onclick = function(e){
          if (e.target.closest('button') || e.target.closest('a')) return;
          e.stopPropagation();
          if (window.sounds && window.sounds.playPop) {
            window.sounds.playPop();
          } else if (window.sounds && window.sounds.playClick) {
            window.sounds.playClick();
          }
          var idx = parseInt(landmark.dataset.missionIdx, 10);
          var mission = adventureMissions[idx];
          if (mission) {
            var isHw = (mission.id === 'g5-p1' || mission.id === 'g6-p1' || /halloween/i.test(mission.title || ''));
            openAdventureProjectModal(mission, isHw ? 'pasos' : 'presentacion');
            return;
          }
          var station = landmark.closest('.pirate-island-station');
          if (!station) return;
          var drawer = station.querySelector('.pirate-scroll-drawer');
          if (!drawer) return;
          var isOpen = drawer.classList.toggle('is-open');
          station.classList.toggle('is-expanded', isOpen);
          landmark.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
          var hintText = landmark.querySelector('.ptp-text');
          if (hintText) {
            hintText.innerHTML = isOpen
              ? (isSpace ? '<i class="fas fa-satellite-dish"></i> Ocultar transmisión' : '<i class="fas fa-scroll"></i> Ocultar pergamino')
              : (isSpace ? '<i class="fas fa-satellite-dish"></i> Tocá el planeta para ver misión' : '<i class="fas fa-scroll"></i> Tocá la isla para ver pergamino');
          }
        };
      });

      // Clic en estación o tarjeta de cuadrícula
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

      // Carrusel Spotlight para Sala de 5, 1° Grado y 6° Grado
      var spotlightCarousel = container.querySelector('#arm-sala5-spotlight-carousel');
      if (spotlightCarousel) {
        var isG6Student = student && (student.gradeId === 'grado6' || student.gradeId === '6to');
        var isG1Student = student && (student.gradeId === 'grado1' || student.gradeId === '1ero');

        function setSpotlightSlide(newIdx) {
          if (newIdx < 0) newIdx = 2;
          if (newIdx > 2) newIdx = 0;

          if (isG6Student) {
            window.grado6SpotlightCurrentSlide = newIdx;
            spotlightCarousel.classList.remove('theme-sombrero', 'theme-varita', 'theme-madre', 'theme-marcalibro', 'theme-canva', 'theme-servo', 'theme-gemini');
            spotlightCarousel.classList.add(newIdx === 0 ? 'theme-canva' : (newIdx === 1 ? 'theme-servo' : 'theme-gemini'));
          } else {
            window.sala5SpotlightCurrentSlide = newIdx;
            var slide1Theme = isG1Student ? 'theme-marcalibro' : 'theme-varita';
            spotlightCarousel.classList.remove('theme-sombrero', 'theme-varita', 'theme-madre', 'theme-marcalibro', 'theme-canva', 'theme-servo', 'theme-gemini');
            spotlightCarousel.classList.add(newIdx === 1 ? slide1Theme : (newIdx === 2 ? 'theme-madre' : 'theme-sombrero'));
          }

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
            var cur = isG6Student ? ((window.grado6SpotlightCurrentSlide !== undefined) ? window.grado6SpotlightCurrentSlide : 2) : (window.sala5SpotlightCurrentSlide || 0);
            setSpotlightSlide(cur - 1);
          };
        }

        var nextBtn = spotlightCarousel.querySelector('.arm-s5-next-btn');
        if (nextBtn) {
          nextBtn.onclick = function(e){
            e.stopPropagation();
            if (window.sounds) window.sounds.playClick();
            var cur = isG6Student ? ((window.grado6SpotlightCurrentSlide !== undefined) ? window.grado6SpotlightCurrentSlide : 2) : (window.sala5SpotlightCurrentSlide || 0);
            setSpotlightSlide(cur + 1);
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
            var cur = isG6Student ? ((window.grado6SpotlightCurrentSlide !== undefined) ? window.grado6SpotlightCurrentSlide : 2) : (window.sala5SpotlightCurrentSlide || 0);
            if (diff > 0) {
              setSpotlightSlide(cur + 1);
            } else {
              setSpotlightSlide(cur - 1);
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

        // 4. Previews Interactivos de 6° Grado
        // 4a. Canva Arquero IA
        var canvaG6Interactive = spotlightCarousel.querySelector('#arm-g6-canva-interactive');
        if (canvaG6Interactive) {
          canvaG6Interactive.onclick = function(e){
            e.stopPropagation();
            var glow = spotlightCarousel.querySelector('#arm-g6-glow-canva');
            if (glow) {
              glow.classList.toggle('active');
              if (window.sounds && window.sounds.playSuccess) window.sounds.playSuccess();
              else if (window.sounds) window.sounds.playClick();
            }
          };
        }

        // 4b. Servo SG90 Arquero Mecánico
        var servoG6Interactive = spotlightCarousel.querySelector('#arm-g6-servo-interactive');
        if (servoG6Interactive) {
          servoG6Interactive.onclick = function(e){
            e.stopPropagation();
            var glow = spotlightCarousel.querySelector('#arm-g6-glow-servo');
            if (glow) {
              glow.classList.toggle('active');
              if (window.sounds && window.sounds.playSuccess) window.sounds.playSuccess();
              else if (window.sounds) window.sounds.playClick();
            }
          };
        }

        // 4c. Gemini & NotebookLM Ecosistema IA
        var geminiG6Interactive = spotlightCarousel.querySelector('#arm-g6-gemini-interactive');
        if (geminiG6Interactive) {
          geminiG6Interactive.onclick = function(e){
            e.stopPropagation();
            var glow = spotlightCarousel.querySelector('#arm-g6-glow-gemini');
            if (glow) {
              glow.classList.toggle('active');
              if (window.sounds && window.sounds.playSuccess) window.sounds.playSuccess();
              else if (window.sounds) window.sounds.playClick();
            }
          };
        }
      }
    }

    // ── Click en tarjeta de Proyecto MakeCode / Grado para abrir Modal de Aventura ──
    if (activeFolderKey === 'proyecto') {
      var mkLibrary = (window.MAKECODE_LIBRARY && window.MAKECODE_LIBRARY[student.gradeId]) || [];
      container.querySelectorAll('.mklib-card-item').forEach(function(card) {
        card.onclick = function(e) {
          if (e.target.closest('.mklib-btn-entrar-link, .btn-copy-mklib-code, a')) return;
          var projId = card.dataset.projectId;
          var entryIdx = parseInt(card.dataset.entryIdx, 10);
          var matchingProj = null;

          if (gradeObj && Array.isArray(gradeObj.projects)) {
            matchingProj = gradeObj.projects.find(function(p){
              return projId ? (p.id === projId) : (p.id === 'g6-p2' && (student.gradeId === 'grado6' || student.gradeId === '6to'));
            });
          }
          if (!matchingProj) {
            var advMissions = getAdventureMissionsForStudent(student);
            matchingProj = advMissions.find(function(m){
              return projId ? (m.id === projId) : (m.id === 'g6-p2' && (student.gradeId === 'grado6' || student.gradeId === '6to'));
            });
          }
          if (!matchingProj && mkLibrary && mkLibrary[entryIdx]) {
            var entry = mkLibrary[entryIdx];
            matchingProj = {
              id: entry.id || ('mk-' + entryIdx),
              level: entry.level || (entryIdx + 1),
              title: entry.title || ('Código MakeCode #' + (entryIdx + 1)),
              subtitle: 'Simulador y Bloques Micro:bit',
              description: entry.description || 'Proyecto interactivo de programación en MakeCode.',
              type: entry.type || 'makecode',
              badge: entry.badge || '💻 MakeCode Micro:bit',
              icon: entry.icon || 'fa-gamepad',
              color: entry.color || '#0D9488',
              coverImage: entry.coverImage || 'img/proyectos/servo_joystick_makecode_cover.svg',
              makecodeUrl: entry.shareUrl,
              gradeName: student.gradeName,
              codeSnippet: entry.codeSnippet,
              materials: [
                { title: 'Joystick micro:bit chico negro', description: 'Palanca analógica conectada al Pin P1' },
                { title: 'Micro Servomotor SG90 (Pin P0)', description: 'Mecanismo del arquero de 0° a 180°' },
                { title: 'Placa BBC micro:bit v2', description: 'Controlador y cálculo Math.map' }
              ]
            };
          }
          if (matchingProj) {
            if (!matchingProj.coverImage || matchingProj.coverImage === 'img/microbit.png') {
              matchingProj.coverImage = (matchingProj.id === 'g6-p2' || /servo.*joystick|joystick.*servo/i.test(matchingProj.title || ''))
                ? 'img/proyectos/servo_joystick_makecode_cover.svg'
                : (matchingProj.id === 'g6-p3' || /gemini|notebooklm/i.test(matchingProj.title || ''))
                ? 'img/proyectos/gemini_notebooks_cover.svg'
                : 'img/proyectos/canva_arquero_ia_cover.svg';
            }
            openAdventureProjectModal(matchingProj, 'presentacion');
          }
        };
      });

      // Botón copiar código al portapapeles
      container.querySelectorAll('.btn-copy-mklib-code').forEach(function(btn) {
        btn.onclick = function(e) {
          e.stopPropagation();
          var code = btn.dataset.code || '';
          function showCopied() {
            var orig = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> ¡Copiado!';
            btn.style.background = '#10B981';
            btn.style.color = '#FFF';
            setTimeout(function(){
              btn.innerHTML = orig;
              btn.style.background = '';
              btn.style.color = '';
            }, 2000);
          }
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(code).then(showCopied).catch(function(){
              fallbackCopyText(code, showCopied);
            });
          } else {
            fallbackCopyText(code, showCopied);
          }
        };
      });
    }

    // ── PDFs ──
    container.querySelectorAll('.ppc-btn-view').forEach(function(btn){
      btn.onclick = function(e){ e.stopPropagation(); openPdfModal(btn.dataset.pdfUrl, btn.dataset.pdfTitle); };
    });

    // ── Actividades / Proyectos de Clase ──
    if (activeFolderKey === 'actividades') {
      // 1. Selector de número de clase (pills de clase)
      container.querySelectorAll('.cpt-pill-btn[data-class-idx]').forEach(function(btn){
        btn.onclick = function(e){
          e.stopPropagation();
          var idx = parseInt(btn.dataset.classIdx, 10);
          if (!isNaN(idx) && idx >= 0 && idx < classProjects.length) {
            selectedClassProjectIdx = idx;
            if (window.sounds && window.sounds.playClick) window.sounds.playClick();
            renderGDriveDashboard(containerId);
          }
        };
      });

      // 2. Botones de navegación Anterior / Siguiente
      container.querySelectorAll('.cpt-arrow-btn[data-class-idx]').forEach(function(btn){
        btn.onclick = function(e){
          e.stopPropagation();
          if (btn.disabled) return;
          var idx = parseInt(btn.dataset.classIdx, 10);
          if (!isNaN(idx) && idx >= 0 && idx < classProjects.length) {
            selectedClassProjectIdx = idx;
            if (window.sounds && window.sounds.playClick) window.sounds.playClick();
            renderGDriveDashboard(containerId);
          }
        };
      });

      // 3. Abrir Guía Interactiva Completa (modal pedagógico y presentación de aventura)
      container.querySelectorAll('.btn-open-class-project').forEach(function(btn){
        btn.onclick = function(e){
          e.stopPropagation();
          var idx = parseInt(btn.dataset.classIdx, 10);
          var proj = (classProjects && classProjects[idx]) ? classProjects[idx] : ((classProjects && classProjects[selectedClassProjectIdx]) || null);
          if (proj) {
            if (window.sounds && window.sounds.playClick) window.sounds.playClick();
            openAdventureProjectModal(proj, 'presentacion');
          }
        };
      });

      // 4. Zoom de fotos y lightbox de Drive
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
      // Clic para Dame sugerencias en juegos (Abre Modal Pedagógico)
      container.querySelectorAll('.arm-concept-modal-btn').forEach(function(btn){
        btn.onclick = function(e){
          e.stopPropagation();
          e.preventDefault();
          if (window.sounds && window.sounds.playClick) window.sounds.playClick();
          var idx = parseInt(btn.dataset.gameIdx, 10);
          var dataObj = (gradeGames && gradeGames[idx]) ? gradeGames[idx] : null;
          if (!dataObj && btn.dataset.gameId && gradeGames) {
            dataObj = gradeGames.find(function(g){ return g.id === btn.dataset.gameId; });
          }
          if (!dataObj && gradeGames && gradeGames.length > 0) dataObj = gradeGames[0];
          if (dataObj) {
            openPedagogicalConceptModal('benefits', dataObj);
          }
        };
      });
    }
  }

  // ──────────────────────────────────────────────────
  // RENDER HTML DE JUEGOS DEL GRADO (DESAFÍOS PIRATAS / MISIONES GALÁCTICAS)
  // ──────────────────────────────────────────────────
  function renderGradeGamesHtml(student, gradeGames) {
    var isLegacy = isLegacyTheme(student);
    var isCyber = isCyberTheme(student);
    var isSpace = isSpaceTheme(student);
    if (!gradeGames || gradeGames.length === 0) {
      return '<div class="gdb-empty-state"><div class="ges-icon">' + (isLegacy ? '🎓' : (isCyber ? '🕹️' : (isSpace ? '🛸' : '🎮'))) + '</div><h4>Sin juegos asignados</h4><p>Pronto se agregarán juegos de programación para ' + (student ? student.gradeName : 'tu grado') + '.</p></div>';
    }

    var cardsHtml = gradeGames.map(function(game, idx) {
      var thumb = game.thumbnail || 'img/angrybirds.png';
      var pm = (window.platformMeta && window.platformMeta(game.platform)) || { label: (game.platform === 'codeorg' ? 'Code.org' : (game.platform === 'codejr' ? 'Scratch Jr' : 'Taller Maker')), icon: '🎮' };
      var gameUrl = (window.getGameUrl && window.getGameUrl(game)) || game.externalUrl || '#';

      // Limpiar cualquier prefijo de aventura histórico en la descripción
      var rawDesc = (game.description || '').replace(/^¡?Nivel \d+ de la Ruta de Aventuras!?\s*:?\s*/i, '');
      var shortDesc = rawDesc;
      if (shortDesc.length > 120) {
        shortDesc = shortDesc.substring(0, 115).trim() + '...';
      }

      var gradeLabel = (student && student.gradeName) ? student.gradeName : 'Taller Freire';

      return '<div class="grade-game-card ptb-card" data-game-idx="' + idx + '" data-game-id="' + (game.id || '') + '">' +
        '<div class="ptb-card-nail" title="' + (isLegacy ? 'Sellado en el Torneo de Despedida' : (isSpace ? 'Anclado a la consola orbital' : 'Clavado con tachuela al muelle')) + '"></div>' +
        '<div class="ggc-thumb-wrap" onclick="window.open(\'' + gameUrl + '\', \'_blank\')" title="Hacé clic para jugar a ' + (game.title || 'este juego') + '">' +
          '<img src="' + thumb + '" alt="' + (game.title || '') + '" class="ggc-thumb-img" onerror="this.src=\'img/angrybirds.png\'">' +
          '<div class="ggc-play-overlay">' +
            '<div class="ggc-play-bubble"><i class="fas ' + (isLegacy ? 'fa-trophy' : (isSpace ? 'fa-rocket' : 'fa-play')) + '"></i></div>' +
            '<span>' + (isLegacy ? '¡Jugar Desafío!' : (isSpace ? '¡Despegar Ahora!' : '¡Jugar Ahora!')) + '</span>' +
          '</div>' +
          '<div class="ggc-lvl-badge pirate-gold-badge"><i class="fas ' + (isLegacy ? 'fa-graduation-cap' : (isSpace ? 'fa-user-astronaut' : 'fa-graduation-cap')) + '"></i> ' + gradeLabel + '</div>' +
          '<div class="ggc-platform-badge pirate-plat-badge">' + pm.icon + ' ' + pm.label + '</div>' +
        '</div>' +
        '<div class="ggc-body">' +
          '<div class="ggc-top-row">' +
            '<h3 class="ggc-title">' + (game.title || 'Desafío') + '</h3>' +
          '</div>' +
          '<p class="ggc-desc">' + shortDesc + '</p>' +
          (game.tags && game.tags.length > 0 ?
            '<div class="ggc-tags-row">' +
              game.tags.slice(0, 4).map(function(t){ return '<span class="ggc-tag">#' + t + '</span>'; }).join('') +
            '</div>' : '') +
          '<div class="ggc-actions">' +
            '<a href="' + gameUrl + '" target="_blank" rel="noopener noreferrer" class="ggc-btn-play pirate-btn-exec" title="Ejecutar desafío en ' + pm.label + '">' +
              '<i class="fas ' + (isLegacy ? 'fa-trophy' : (isSpace ? 'fa-rocket' : 'fa-play')) + '"></i> <span>' + (isLegacy ? 'Competir' : (isSpace ? 'Despegar' : 'Ejecutar')) + '</span>' +
            '</a>' +
            '<button type="button" class="ggc-btn-sugerencias arm-concept-modal-btn" data-concept-type="benefits" data-game-idx="' + idx + '" data-game-id="' + (game.id || '') + '" title="Ver sugerencias pedagógicas y razonamiento">' +
              '<i class="fas fa-lightbulb"></i> <span>Dame sugerencias</span>' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    return buildPirateTavernBoard({
      sealIcon: isLegacy ? '🎓' : (isCyber ? '🕹️' : (isSpace ? '🛸' : '☠️')),
      tag: isLegacy
        ? 'TORNEO DE DESPEDIDA · JUEGOS Y DESAFÍOS DE EGRESADOS'
        : (isCyber
          ? 'ARCADE CYBER · PROTOCOLOS Y DESAFÍOS'
          : (isSpace ? 'CONSOLA DE COMANDO · SIMULACIONES Y MISIONES GALÁCTICAS' : 'TABLERO DE LA TABERNA · EDICTO DE RECOMPENSAS')),
      title: isLegacy
        ? ('🏆 Torneo de Despedida por Niveles — Promoción ' + student.gradeName)
        : (isCyber
          ? ('🕹️ Arcade Cyber por Niveles — División ' + student.gradeName)
          : (isSpace
            ? ('🛸 Misiones Galácticas por Niveles — Nave ' + student.gradeName)
            : ('⚔️ Desafíos Piratas por Niveles — Navío ' + student.gradeName))),
      sub: isLegacy
        ? '¡Atención egresados! Pongan a prueba toda su trayectoria en programación, superen los desafíos finales y coronen su Libro de Honor con nuevos Laureles.'
        : (isCyber
          ? '¡Atención makers de la red! Ejecuten los protocolos de juego, compilen algoritmos de nivel y acumulen TeraWatts de energía.'
          : (isSpace
            ? '¡Atención tripulación estelar! Seleccionen una misión para despegar, ejercitar algoritmos en órbita y acumular cristales de energía para su bitácora.'
            : '¡Atención tripulación! Seleccionen un desafío para zarpar, ejercitar algoritmos en alta mar y acumular doblones de oro para la bitácora.')),
      contentHtml: '<div class="grade-games-grid ptb-games-grid">' + cardsHtml + '</div>'
    });
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

  function renderClaseActivitySolutionHtml(mission) {
    if (!mission) return '';
    var btns = (mission.botones && Array.isArray(mission.botones)) ? mission.botones : [];
    return '<div class="apm-sol-canva-wrap" style="padding:18px 24px;overflow-y:auto;height:100%;">' +
      '<div style="display:flex;align-items:center;gap:14px;background:#F0FDF4;border:1.5px solid #86EFAC;border-radius:14px;padding:16px 20px;margin-bottom:18px;">' +
        '<div style="width:48px;height:48px;border-radius:12px;background:' + (mission.color || '#15803D') + ';color:#FFF;display:flex;align-items:center;justify-content:center;font-size:1.5rem;flex-shrink:0;"><i class="' + (mission.icon || 'fas fa-chalkboard-teacher') + '"></i></div>' +
        '<div style="flex:1;">' +
          '<h4 style="margin:0 0 4px;font-size:1.1rem;font-weight:900;color:#14532D;">Guía y Recursos: ' + (mission.title || 'Actividad de Clase') + '</h4>' +
          '<p style="margin:0;font-size:0.86rem;color:#166534;">Actividad oficial del Taller de Robótica y Programación • Colegio Paulo Freire</p>' +
        '</div>' +
      '</div>' +
      '<div style="background:#FFFFFF;border-left:4px solid ' + (mission.color || '#15803D') + ';padding:16px 20px;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.04);margin-bottom:16px;">' +
        '<h5 style="margin:0 0 8px;font-size:0.95rem;font-weight:800;color:#0F172A;"><i class="fas fa-bullseye" style="color:' + (mission.color || '#15803D') + ';"></i> Consigna y Propósito</h5>' +
        '<p style="font-size:0.9rem;line-height:1.6;color:#334155;margin:0 0 10px;">' + (mission.description || '') + '</p>' +
        (mission.objective ? '<div style="background:#F8FAFC;padding:10px 14px;border-radius:8px;border:1px solid #E2E8F0;font-size:0.85rem;color:#475569;"><strong>Objetivo:</strong> ' + mission.objective + '</div>' : '') +
      '</div>' +
      (btns.length > 0 ?
        '<div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:16px 20px;margin-bottom:16px;">' +
          '<h5 style="margin:0 0 12px;font-size:0.9rem;font-weight:800;color:#0F172A;"><i class="fas fa-external-link-alt" style="color:' + (mission.color || '#15803D') + ';"></i> Enlaces y Plataformas de Trabajo:</h5>' +
          '<div style="display:flex;gap:10px;flex-wrap:wrap;">' +
            btns.map(function(b){
              return '<a href="' + b.url + '" target="_blank" rel="noopener noreferrer" class="arm-btn-primary" style="background:' + (mission.color || '#15803D') + ';font-size:0.88rem;padding:9px 18px;text-decoration:none;"><i class="' + (b.icono || 'fas fa-external-link-alt') + '"></i> ' + (b.texto || 'Abrir Plataforma') + '</a>';
            }).join('') +
          '</div>' +
        '</div>' : '') +
      (mission.pdfUrl ?
        '<div style="text-align:center;margin-top:20px;">' +
          '<a href="' + mission.pdfUrl + '" target="_blank" class="arm-btn-primary apm-goto-pdf-btn" style="background:#15803D;border-color:#166534;padding:9px 20px;text-decoration:none;">' +
            '<i class="fas fa-file-pdf"></i> Ver Guía Didáctica en PDF' +
          '</a>' +
        '</div>' : '') +
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

    function renderHalloweenSolutionHtml(mission) {
    return '<div class="apm-sol-electro-wrap">' +
      // Header con gradiente temático Halloween
      '<div class="apm-sol-electro-header" style="background:linear-gradient(135deg, #451A03 0%, #C2410C 50%, #7C3AED 100%);">' +
        '<div class="apm-seh-icon" style="background:rgba(255,255,255,0.18);color:#FDBA74;"><i class="fas fa-ghost"></i></div>' +
        '<div>' +
          '<h4>Tutorial y Solución Oficial: Especial Halloween con Inteligencia Artificial 🎃👻🎬</h4>' +
          '<p>El proceso completo en 3 clases: 1) Foto a Monstruo en Gemini con el Libro de los Hechizos, 2) Diseño Polaroid en Canva entregado impreso, y 3) Animación de video en Flow.</p>' +
        '</div>' +
      '</div>' +
      '<div class="apm-sol-electro-body">' +

        // Portada y Accesos directos a herramientas
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;margin-bottom:18px;">' +
          '<div class="apm-circuit-schematic-card" style="background:#FFF7ED;border:1.5px solid #FDBA74;margin:0;color:#7C2D12;">' +
            '<div class="apm-csc-header" style="border-bottom-color:#FED7AA;">' +
              '<span style="color:#9A3412;font-weight:900;"><i class="fas fa-image"></i> Portada del Proyecto Especial</span>' +
              '<a href="img/proyectos/halloween_ia_cover.jpg" target="_blank" class="apm-csc-badge" style="background:#EA580C;color:#FFF;text-decoration:none;"><i class="fas fa-external-link-alt"></i> Ver en Grande</a>' +
            '</div>' +
            '<div style="text-align:center;padding:12px;background:#FFF;border-radius:10px;margin-top:8px;">' +
              '<img src="img/proyectos/halloween_ia_cover.jpg" alt="Especial Halloween IA" style="max-height:220px;max-width:100%;object-fit:contain;border-radius:6px;border:1px solid #FED7AA;box-shadow:0 2px 8px rgba(0,0,0,0.08);">' +
              '<div style="font-size:0.8rem;color:#7C2D12;margin-top:6px;font-weight:600;">Ecosistema Creativo: Gemini AI &bull; Libro de los Hechizos &bull; Canva Polaroid &bull; Flow Video</div>' +
            '</div>' +
          '</div>' +

          // Tarjeta de Herramientas Oficiales con enlaces directos
          '<div style="background:#FAF5FF;border:1.5px solid #E9D5FF;border-radius:12px;padding:16px;display:flex;flex-direction:column;justify-content:space-between;">' +
            '<div>' +
              '<h5 style="margin:0 0 10px;color:#6B21A8;font-size:1.05rem;"><i class="fas fa-magic"></i> Enlaces y Herramientas del Proyecto</h5>' +
              '<div style="display:flex;flex-direction:column;gap:8px;">' +
                '<a href="https://roboticapaulofreire-uy.github.io/libro_hechizos/" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#7C3AED;color:#FFF;text-decoration:none;border-radius:8px;font-weight:700;font-size:0.9rem;box-shadow:0 2px 6px rgba(124,58,237,0.3);">' +
                  '<i class="fas fa-book-skull" style="font-size:1.2rem;"></i>' +
                  '<span>📖 Abrir "El Libro de los Hechizos" (Manual de Prompts) <i class="fas fa-external-link-alt" style="font-size:0.75rem;"></i></span>' +
                '</a>' +
                '<a href="https://gemini.google.com" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#EA580C;color:#FFF;text-decoration:none;border-radius:8px;font-weight:700;font-size:0.9rem;box-shadow:0 2px 6px rgba(234,88,12,0.3);">' +
                  '<i class="fas fa-wand-magic-sparkles" style="font-size:1.2rem;"></i>' +
                  '<span>🤖 Ir a Google Gemini AI <i class="fas fa-external-link-alt" style="font-size:0.75rem;"></i></span>' +
                '</a>' +
                '<a href="https://canva.link/polaroid-freirebotuy" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#0284C7;color:#FFF;text-decoration:none;border-radius:8px;font-weight:700;font-size:0.9rem;box-shadow:0 2px 6px rgba(2,132,199,0.3);">' +
                  '<i class="fas fa-palette" style="font-size:1.2rem;"></i>' +
                  '<span>🎨 Abrir Plantilla Polaroid en Canva <i class="fas fa-external-link-alt" style="font-size:0.75rem;"></i></span>' +
                '</a>' +
              '</div>' +
            '</div>' +
            '<div style="margin-top:10px;padding:8px 12px;background:#F3E8FF;border-radius:8px;font-size:0.8rem;color:#581C87;">' +
              '<i class="fas fa-info-circle"></i> <strong>Aclaración Pedagógica:</strong> Este proyecto se completó en clases sucesivas para que cada alumno viviera la experiencia completa de creador multimedia con IA.' +
            '</div>' +
          '</div>' +
        '</div>' +

        // SECCIÓN 1: ETAPA 1 - GEMINI & LAS 5 CAPAS DEL PROMPT
        '<div style="background:#FFF7ED;border:1.5px solid #FDBA74;border-radius:12px;padding:18px;margin-bottom:16px;">' +
          '<h5 style="margin:0 0 8px;color:#9A3412;font-size:1.1rem;"><i class="fas fa-wand-magic-sparkles"></i> Etapa 1: Transformación con Gemini AI & Las 5 Capas del Hechizo</h5>' +
          '<p style="margin:0 0 12px;font-size:0.88rem;color:#7C2D12;">Tomamos la foto con la cámara de la computadora y la subimos a Google Gemini. En clase explicamos cómo redactar un prompt preciso apoyándonos en el manual <a href="https://roboticapaulofreire-uy.github.io/libro_hechizos/" target="_blank" style="color:#EA580C;font-weight:700;">El Libro de los Hechizos</a>, estructurando el pedido en <strong>5 Capas</strong>:</p>' +
          '<div class="apm-pinout-table-wrap">' +
            '<table class="apm-pinout-table">' +
              '<thead>' +
                '<tr>' +
                  '<th style="width:18%;">Capa</th>' +
                  '<th style="width:28%;">Propósito Pedagógico</th>' +
                  '<th style="width:54%;">Ejemplo de Prompt en Clase (Hechizo de Halloween)</th>' +
                '</tr>' +
              '</thead>' +
              '<tbody>' +
                '<tr>' +
                  '<td><strong>1. Rol / Identidad</strong></td>' +
                  '<td>Define la mente y el oficio de la IA</td>' +
                  '<td><code>"Actúa como un artista digital y diseñador de criaturas de fantasía y terror cinematográfico..."</code></td>' +
                '</tr>' +
                '<tr>' +
                  '<td><strong>2. Tarea / Sujeto</strong></td>' +
                  '<td>Transforma a la persona de la foto</td>' +
                  '<td><code>"Toma a la persona de esta fotografía y transfórmala en un monstruo de Halloween (zombi cyber, vampiro o hechicero)..."</code></td>' +
                '</tr>' +
                '<tr>' +
                  '<td><strong>3. Escenario / Contexto</strong></td>' +
                  '<td>Ambienta la escena en un lugar</td>' +
                  '<td><code>"Ubicado en una mansión antigua, laboratorio abandonado o pasillo tenebroso con velas y sombras..."</code></td>' +
                '</tr>' +
                '<tr>' +
                  '<td><strong>4. Estilo / Parámetros</strong></td>' +
                  '<td>Determina luz, textura y cámara</td>' +
                  '<td><code>"Iluminación dramática claroscuro, niebla volumétrica, textura hiperrealista, plano medio cinematográfico..."</code></td>' +
                '</tr>' +
                '<tr>' +
                  '<td><strong>5. Reglas / Conservación</strong></td>' +
                  '<td>Evita deformaciones y mantiene identidad</td>' +
                  '<td><code>"Conserva la forma de los ojos, sonrisa y fisonomía facial del alumno para que siga siendo reconocible."</code></td>' +
                '</tr>' +
              '</tbody>' +
            '</table>' +
          '</div>' +
        '</div>' +

        // SECCIÓN 2: ETAPA 2 - CANVA POLAROID & IMPRESIÓN FÍSICA
        '<div style="background:#F0F9FF;border:1.5px solid #BAE6FD;border-radius:12px;padding:18px;margin-bottom:16px;">' +
          '<h5 style="margin:0 0 8px;color:#0369A1;font-size:1.1rem;"><i class="fas fa-palette"></i> Etapa 2: Diseño de Fotografía Polaroid en Canva (Para entrega impresa)</h5>' +
          '<p style="margin:0 0 12px;font-size:0.88rem;color:#075985;">En la segunda clase subimos la imagen creada con Gemini a Canva para componer una foto instantánea tipo Polaroid de recuerdo:</p>' +
          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">' +
            '<div style="background:#FFF;padding:12px;border-radius:8px;border:1px solid #E0F2FE;">' +
              '<strong style="color:#0284C7;"><i class="fas fa-crop-alt"></i> 1. Marco Polaroid</strong>' +
              '<p style="font-size:0.82rem;color:#475569;margin:4px 0 0;">Buscamos un marco blanco estilo foto instantánea retro con el borde inferior ancho característico.</p>' +
            '</div>' +
            '<div style="background:#FFF;padding:12px;border-radius:8px;border:1px solid #E0F2FE;">' +
              '<strong style="color:#0284C7;"><i class="fas fa-font"></i> 2. Tipografía Temática</strong>' +
              '<p style="font-size:0.82rem;color:#475569;margin:4px 0 0;">Agregamos textos con fuentes góticas o divertidas: "Halloween 2026", nombre del alumno y stickers de murciélagos.</p>' +
            '</div>' +
            '<div style="background:#FFF;padding:12px;border-radius:8px;border:1px solid #E0F2FE;">' +
              '<strong style="color:#0284C7;"><i class="fas fa-print"></i> 3. Entrega Impresa Física</strong>' +
              '<p style="font-size:0.82rem;color:#475569;margin:4px 0 0;">El docente imprime la foto en papel fotográfico de alta calidad para entregarla en mano como recuerdo tangible para la familia.</p>' +
            '</div>' +
          '</div>' +
        '</div>' +

        // SECCIÓN 3: ETAPA 3 - ANIMACIÓN EN FLOW CON PROMPTS DE VIDEO
        '<div style="background:#FAF5FF;border:1.5px solid #E9D5FF;border-radius:12px;padding:18px;margin-bottom:16px;">' +
          '<h5 style="margin:0 0 8px;color:#6B21A8;font-size:1.1rem;"><i class="fas fa-film"></i> Etapa 3: Generación de Video y Animación con Flow</h5>' +
          '<p style="margin:0 0 12px;font-size:0.88rem;color:#581C87;">En la tercera clase importamos la criatura a Flow (herramienta de video generativo con IA) para darle vida y movimiento. Aprendemos cómo redactar prompts específicos para video:</p>' +
          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">' +
            '<div style="background:#FFF;padding:12px;border-radius:8px;border:1px solid #F3E8FF;">' +
              '<strong style="color:#7C3AED;"><i class="fas fa-video"></i> Movimiento de Cámara</strong>' +
              '<p style="font-size:0.82rem;color:#475569;margin:4px 0 0;">Describimos movimientos cinematográficos suaves: <code>"slow zoom in on face, subtle handheld camera shake"</code>.</p>' +
            '</div>' +
            '<div style="background:#FFF;padding:12px;border-radius:8px;border:1px solid #F3E8FF;">' +
              '<strong style="color:#7C3AED;"><i class="fas fa-eye"></i> Acciones del Personaje</strong>' +
              '<p style="font-size:0.82rem;color:#475569;margin:4px 0 0;">Animamos gestos naturales: <code>"blinking slowly, deep mysterious breathing, looking straight into the camera"</code>.</p>' +
            '</div>' +
            '<div style="background:#FFF;padding:12px;border-radius:8px;border:1px solid #F3E8FF;">' +
              '<strong style="color:#7C3AED;"><i class="fas fa-smog"></i> Atmósfera en Movimiento</strong>' +
              '<p style="font-size:0.82rem;color:#475569;margin:4px 0 0;">Dinamismo ambiental: <code>"drifting fog in background, flickering candlelight on walls, cinematic shadow drift"</code>.</p>' +
            '</div>' +
          '</div>' +
        '</div>' +

        // Sello y Resultado en Google Drive
        '<div style="text-align:center;padding:14px;background:#F8FAFC;border:1.5px dashed #CBD5E1;border-radius:10px;">' +
          '<span style="font-size:1.1rem;color:#1E293B;font-weight:800;">🌟 Resultado publicado en el Muro Oficial</span>' +
          '<p style="margin:4px 0 0;font-size:0.84rem;color:#64748B;">Al subir el video y foto a Google Drive en la carpeta <code>fotos/2026/halloween</code>, quedan inmediatamente disponibles en tu muro con reproductor integrado y la marca de agua del colegio.</p>' +
        '</div>' +

      '</div>' +
    '</div>';
  }


  function renderGeminiNotebooksSolutionHtml(mission) {
    return '<div class="apm-sol-electro-wrap">' +
      '<div class="apm-sol-electro-header" style="background:linear-gradient(135deg, #1E1B4B 0%, #4338CA 50%, #4F46E5 100%);">' +
        '<div class="apm-seh-icon" style="background:rgba(255,255,255,0.18);color:#A5B4FC;"><i class="fas fa-brain"></i></div>' +
        '<div>' +
          '<h4>Solución Oficial: Estudio Inteligente con Gemini & NotebookLM 🧠🎙️📽️📊</h4>' +
          '<p>Ecosistema multimodal: Grounding en fuentes confiables, podcast con dos locutores sintetizados (Audio Overview), esquemas de diapositivas, guiones y unificación en documento PDF.</p>' +
        '</div>' +
      '</div>' +
      '<div class="apm-sol-electro-body">' +

        // Galería y visual de la solución
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;margin-bottom:18px;">' +
          '<div class="apm-circuit-schematic-card" style="background:#EEF2FF;border:1.5px solid #C7D2FE;margin:0;color:#1E1B4B;">' +
            '<div class="apm-csc-header" style="border-bottom-color:#DDD6FE;">' +
              '<span style="color:#3730A3;font-weight:900;"><i class="fas fa-image"></i> Diagrama Oficial del Sistema IA</span>' +
              '<a href="img/proyectos/gemini_notebooks_cover.svg" target="_blank" class="apm-csc-badge" style="background:#4F46E5;color:#FFF;text-decoration:none;"><i class="fas fa-external-link-alt"></i> Ampliar</a>' +
            '</div>' +
            '<div style="text-align:center;padding:12px;background:#FFF;border-radius:10px;margin-top:8px;">' +
              '<img src="img/proyectos/gemini_notebooks_cover.svg" alt="Gemini NotebookLM Ecosistema" style="max-height:220px;max-width:100%;object-fit:contain;border-radius:6px;border:1px solid #E2E8F0;box-shadow:0 2px 8px rgba(0,0,0,0.06);cursor:pointer;" onclick="window.open(this.src,\'_blank\')">' +
              '<div style="font-size:0.8rem;color:#475569;margin-top:6px;">Arquitectura de NotebookLM: Fuentes confiables a la izquierda, núcleo Gemini 1.5 Pro y los 4 artefactos de estudio generados.</div>' +
            '</div>' +
          '</div>' +

          '<div class="apm-circuit-schematic-card" style="background:#FDF2F8;border:1.5px solid #FBCFE8;margin:0;color:#831843;">' +
            '<div class="apm-csc-header" style="border-bottom-color:#FCE7F3;">' +
              '<span style="color:#9D174D;font-weight:900;"><i class="fas fa-shield-alt"></i> Grounding: IA sin Alucinaciones</span>' +
              '<a href="docs/guia_ia_gemini_notebooks.pdf" target="_blank" class="apm-csc-badge" style="background:#DB2777;color:#FFF;text-decoration:none;"><i class="fas fa-file-pdf"></i> Ver Guía PDF</a>' +
            '</div>' +
            '<div style="padding:10px;background:#FFF;border-radius:10px;margin-top:8px;font-size:0.82rem;color:#475569;line-height:1.5;">' +
              '<div style="margin-bottom:8px;"><strong>1. Anclaje Estricto:</strong> Gemini solo responde a partir de los documentos PDF, Docs o enlaces subidos al cuaderno.</div>' +
              '<div style="margin-bottom:8px;"><strong>2. Citas Verificables [1]:</strong> Cada afirmación incluye un botón numérico que resalta el párrafo original en la fuente.</div>' +
              '<div style="margin-bottom:8px;"><strong>3. Cero Alucinación:</strong> Si un dato no figura en tus apuntes, la IA declara explícitamente que no se encuentra en las fuentes.</div>' +
              '<div><strong>4. Privacidad Total:</strong> Los datos y documentos de los estudiantes no se utilizan para entrenar los modelos públicos de Google.</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        // Dashboard simulado de NotebookLM
        '<div class="apm-circuit-schematic-card" style="background:#0F172A;border:1.5px solid #334155;color:#F8FAFC;">' +
          '<div class="apm-csc-header" style="border-bottom-color:#1E293B;">' +
            '<span><i class="fas fa-laptop-code" style="color:#818CF8;"></i> Simulación de Espacio de Trabajo en Google NotebookLM</span>' +
            '<span class="apm-csc-badge" style="background:#4F46E5;color:#FFF;">Gemini 1.5 Pro</span>' +
          '</div>' +
          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin-top:10px;">' +
            // Columna 1: Fuentes
            '<div style="background:#1E293B;border-radius:10px;padding:12px;border:1px solid #334155;">' +
              '<div style="font-size:0.8rem;font-weight:800;color:#93C5FD;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;">' +
                '<span><i class="fas fa-file-alt"></i> Fuentes Activas (3)</span>' +
                '<span style="background:#065F46;color:#6EE7B7;font-size:0.7rem;padding:2px 6px;border-radius:4px;"><i class="fas fa-check"></i> Ancladas</span>' +
              '</div>' +
              '<ul style="margin:0;padding-left:16px;font-size:0.75rem;color:#CBD5E1;line-height:1.6;">' +
                '<li><strong>Historia_Uruguay_S_XIX.pdf</strong> (42 págs)</li>' +
                '<li><strong>Apuntes_Energias_Renovables.txt</strong> (Aula)</li>' +
                '<li><strong>Guia_Experimentos_Luz.pdf</strong> (Ceibal)</li>' +
              '</ul>' +
            '</div>' +
            // Columna 2: Chat Grounded
            '<div style="background:#1E293B;border-radius:10px;padding:12px;border:1px solid #334155;">' +
              '<div style="font-size:0.8rem;font-weight:800;color:#A5B4FC;margin-bottom:8px;">' +
                '<i class="fas fa-comments"></i> Pregunta al Chat Grounded' +
              '</div>' +
              '<div style="background:#0F172A;border-radius:6px;padding:8px;font-size:0.75rem;color:#E0E7FF;margin-bottom:6px;">' +
                '<em>"¿Cuáles son las 3 ventajas de la energía solar según los apuntes?"</em>' +
              '</div>' +
              '<div style="background:#312E81;border-radius:6px;padding:8px;font-size:0.74rem;color:#C7D2FE;line-height:1.4;">' +
                '1. No emite gases contaminantes <span style="background:#4F46E5;color:#FFF;padding:1px 4px;border-radius:3px;font-weight:800;">[1]</span>.<br>' +
                '2. Es inagotable y disponible en todo el territorio <span style="background:#4F46E5;color:#FFF;padding:1px 4px;border-radius:3px;font-weight:800;">[2]</span>.<br>' +
                '3. Reduce costos en escuelas rurales <span style="background:#4F46E5;color:#FFF;padding:1px 4px;border-radius:3px;font-weight:800;">[1]</span>.' +
              '</div>' +
            '</div>' +
            // Columna 3: Cuaderno de Estudio
            '<div style="background:#1E293B;border-radius:10px;padding:12px;border:1px solid #334155;">' +
              '<div style="font-size:0.8rem;font-weight:800;color:#F472B6;margin-bottom:8px;">' +
                '<i class="fas fa-layer-group"></i> Guía del Cuaderno Generada' +
              '</div>' +
              '<div style="display:flex;flex-direction:column;gap:6px;font-size:0.74rem;">' +
                '<span style="background:#0F172A;padding:6px 10px;border-radius:6px;color:#F9A8D4;"><i class="fas fa-podcast"></i> <strong>Audio Overview:</strong> Podcast de 8 min con 2 locutores</span>' +
                '<span style="background:#0F172A;padding:6px 10px;border-radius:6px;color:#93C5FD;"><i class="fas fa-file-alt"></i> <strong>Guía de Estudio:</strong> 12 términos clave y glosario</span>' +
                '<span style="background:#0F172A;padding:6px 10px;border-radius:6px;color:#6EE7B7;"><i class="fas fa-question-circle"></i> <strong>Trivia:</strong> 10 preguntas tipo test con active recall</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        // Tabla comparativa de los 6 materiales
        '<div class="apm-sol-visual-guide" style="margin-top:16px;">' +
          '<h5><i class="fas fa-cubes" style="color:#4F46E5;"></i> Catálogo de Formatos Didácticos Generados por IA:</h5>' +
          '<div class="apm-pinout-table-wrap">' +
            '<table class="apm-pinout-table">' +
              '<thead>' +
                '<tr>' +
                  '<th>Formato</th>' +
                  '<th>Herramienta IA</th>' +
                  '<th>Estructura Clave</th>' +
                  '<th>Beneficio Pedagógico</th>' +
                '</tr>' +
              '</thead>' +
              '<tbody>' +
                '<tr>' +
                  '<td><strong>🎙️ Audio Overview (Podcast)</strong></td>' +
                  '<td>NotebookLM Audio</td>' +
                  '<td>Conversación dinámica entre 2 locutores sintetizados con analogías</td>' +
                  '<td>Aprendizaje auditivo mientras viajás o descansás la vista</td>' +
                '</tr>' +
                '<tr>' +
                  '<td><strong>📽️ Guion Audiovisual</strong></td>' +
                  '<td>Gemini Chat</td>' +
                  '<td>3 actos (Gancho 0-10s, Desarrollo conceptual y Cierre reflexivo)</td>' +
                  '<td>Estructura para crear videos cortos en Canva o CapCut</td>' +
                '</tr>' +
                '<tr>' +
                  '<td><strong>📊 Esquema Diapositivas</strong></td>' +
                  '<td>Gemini Chat</td>' +
                  '<td>Regla del 6x6: máximo 6 líneas y 6 palabras por diapositiva</td>' +
                  '<td>Síntesis visual sin saturación de texto para exposiciones</td>' +
                '</tr>' +
                '<tr>' +
                  '<td><strong>📝 Guía & Glosario</strong></td>' +
                  '<td>NotebookLM Studio</td>' +
                  '<td>Resumen ejecutivo + definiciones de términos difíciles</td>' +
                  '<td>Comprensión lectora y fijación de vocabulario técnico</td>' +
                '</tr>' +
                '<tr>' +
                  '<td><strong>❓ Cuestionarios & FAQ</strong></td>' +
                  '<td>NotebookLM Chat</td>' +
                  '<td>Preguntas de opción múltiple, respuestas modelo y citas numéricas</td>' +
                  '<td>Autoevaluación inmediata con active recall y feedback</td>' +
                '</tr>' +
                '<tr>' +
                  '<td><strong>🗺️ Línea de Tiempo</strong></td>' +
                  '<td>Gemini / NotebookLM</td>' +
                  '<td>Cronología secuencial con relaciones de causa y efecto</td>' +
                  '<td>Ordenamiento temporal para ciencias sociales e inventos</td>' +
                '</tr>' +
              '</tbody>' +
            '</table>' +
          '</div>' +
        '</div>' +

        // Principios éticos
        '<div class="apm-troubleshoot-box" style="margin-top:16px;">' +
          '<h5><i class="fas fa-balance-scale" style="color:#4F46E5;"></i> Decálogo de Ética y Buenas Prácticas con IA</h5>' +
          '<div class="apm-tb-grid">' +
            '<div class="apm-tb-item" style="border-left-color:#4F46E5;">' +
              '<h6>1. Verificación Humana Siempre</h6>' +
              '<p>La IA es un copiloto, no el autor definitivo. Siempre leé las citas numéricas y comprobá los datos en los libros antes de dar por buena una respuesta.</p>' +
            '</div>' +
            '<div class="apm-tb-item" style="border-left-color:#10B981;">' +
              '<h6>2. Honestidad Académica</h6>' +
              '<p>Declarar siempre cuando un resumen, esquema o guion fue co-creado con Gemini o NotebookLM, citando el prompt y las fuentes originales utilizadas.</p>' +
            '</div>' +
            '<div class="apm-tb-item" style="border-left-color:#F59E0B;">' +
              '<h6>3. Cuidado de la Privacidad</h6>' +
              '<p>Nunca subas a los cuadernos datos personales sensibles de tus compañeros o familiares (teléfonos, documentos de identidad o contraseñas).</p>' +
            '</div>' +
            '<div class="apm-tb-item" style="border-left-color:#EC4899;">' +
              '<h6>4. Pensamiento Crítico Activo</h6>' +
              '<p>Usá la IA para debatir puntos de vista, buscar contraejemplos y enriquecer tu propio razonamiento, no para evitar leer o pensar.</p>' +
            '</div>' +
          '</div>' +
        '</div>' +

        // Botón final destacado: PDF unificado
        '<div style="text-align:center;margin-top:22px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">' +
          '<a href="docs/guia_ia_gemini_notebooks.pdf" target="_blank" download="guia_ia_gemini_notebooks.pdf" class="arm-btn-primary" style="background:linear-gradient(135deg, #EC4899 0%, #BE185D 100%);padding:11px 24px;display:inline-flex;align-items:center;gap:8px;text-decoration:none;font-size:0.95rem;box-shadow:0 4px 14px rgba(236,72,153,0.3);">' +
            '<i class="fas fa-file-pdf"></i> Descargar Guía Didáctica Oficial Completa en PDF (Todo Unificado)' +
          '</a>' +
          '<a href="https://notebooklm.google.com" target="_blank" rel="noopener noreferrer" class="arm-btn-secondary" style="color:#4F46E5;border-color:#C7D2FE;background:#EEF2FF;padding:11px 20px;display:inline-flex;align-items:center;gap:8px;text-decoration:none;font-size:0.95rem;">' +
            '<i class="fas fa-external-link-alt"></i> Abrir Google NotebookLM en Vivo' +
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
  // ──────────────────────────────────────────────────
  // FUNCIONES DEL MURO ESTILO FACEBOOK (FOTOS Y VIDEOS)
  // ──────────────────────────────────────────────────
  function isItemLiked(itemId) {
    if (!itemId) return false;
    var student = window.getActiveStudent ? window.getActiveStudent() : null;
    var u = student ? student.username : 'default';
    try {
      var likes = JSON.parse(localStorage.getItem('pf_fb_likes_' + u) || '{}');
      return !!likes[itemId];
    } catch(e) { return false; }
  }

  function toggleFbLike(itemId, e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (window.sounds && window.sounds.playClick) window.sounds.playClick();
    var student = window.getActiveStudent ? window.getActiveStudent() : null;
    var u = student ? student.username : 'default';
    var likes = {};
    try {
      likes = JSON.parse(localStorage.getItem('pf_fb_likes_' + u) || '{}');
    } catch(err) {}

    var isNowLiked = !likes[itemId];
    if (isNowLiked) {
      likes[itemId] = true;
    } else {
      delete likes[itemId];
    }
    try {
      localStorage.setItem('pf_fb_likes_' + u, JSON.stringify(likes));
    } catch(err) {}

    var btn = document.getElementById('fb-like-btn-' + itemId);
    if (btn) {
      if (isNowLiked) {
        btn.classList.add('liked');
        btn.innerHTML = '<i class="fas fa-thumbs-up"></i> <span>¡Te gusta!</span>';
      } else {
        btn.classList.remove('liked');
        btn.innerHTML = '<i class="far fa-thumbs-up"></i> <span>Me gusta</span>';
      }
    }
    var statText = document.getElementById('fb-reaction-text-' + itemId);
    if (statText) {
      statText.textContent = isNowLiked
        ? 'A vos y al equipo de Robótica les gusta esto'
        : 'Al equipo de Robótica le gusta esto';
    }
  }
  window.toggleFbLike = toggleFbLike;

  function toggleFbComments(itemId, e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    var el = document.getElementById('fb-comments-' + itemId);
    if (el) {
      el.style.display = (el.style.display === 'none') ? 'block' : 'none';
    }
  }
  window.toggleFbComments = toggleFbComments;

  function switchFbFilter(filterName, e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (window.sounds && window.sounds.playClick) window.sounds.playClick();
    fbMediaFilter = filterName || 'all';
    renderGDriveDashboard('student-drive-dashboard-container');
    renderGDriveDashboard('gdrive-explorer-container');
  }
  window.switchFbFilter = switchFbFilter;

  function switchFbYear(year, e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (window.sounds && window.sounds.playClick) window.sounds.playClick();
    fbSelectedYear = year || 'all';
    renderGDriveDashboard('student-drive-dashboard-container');
    renderGDriveDashboard('gdrive-explorer-container');
  }
  window.switchFbYear = switchFbYear;

  function switchFbAlbum(album, e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (window.sounds && window.sounds.playClick) window.sounds.playClick();
    fbSelectedAlbum = album || 'all';
    if (fbMediaFilter === 'albums') fbMediaFilter = 'all';
    renderGDriveDashboard('student-drive-dashboard-container');
    renderGDriveDashboard('gdrive-explorer-container');
  }
  window.switchFbAlbum = switchFbAlbum;

  function resetFbFilters(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (window.sounds && window.sounds.playClick) window.sounds.playClick();
    fbSelectedYear = 'all';
    fbSelectedAlbum = 'all';
    fbMediaFilter = 'all';
    renderGDriveDashboard('student-drive-dashboard-container');
    renderGDriveDashboard('gdrive-explorer-container');
  }
  window.resetFbFilters = resetFbFilters;

  function openFbLightbox(index) {
    if (window.sounds && window.sounds.playClick) window.sounds.playClick();
    if (!currentFbLightboxItems || currentFbLightboxItems.length === 0) return;
    currentFbLightboxIndex = Math.max(0, Math.min(index, currentFbLightboxItems.length - 1));
    renderFbLightboxModal();
  }
  window.openFbLightbox = openFbLightbox;

  function closeFbLightbox() {
    var modal = document.getElementById('fb-lightbox-modal');
    if (modal) modal.remove();
  }
  window.closeFbLightbox = closeFbLightbox;

  function navFbLightbox(delta) {
    if (!currentFbLightboxItems || currentFbLightboxItems.length === 0) return;
    var newIdx = currentFbLightboxIndex + delta;
    if (newIdx >= 0 && newIdx < currentFbLightboxItems.length) {
      currentFbLightboxIndex = newIdx;
      renderFbLightboxModal();
    }
  }
  window.navFbLightbox = navFbLightbox;

  function renderFbLightboxModal() {
    var item = currentFbLightboxItems[currentFbLightboxIndex];
    if (!item) return;

    var modal = document.getElementById('fb-lightbox-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'fb-lightbox-modal';
      modal.className = 'fb-lightbox-modal';
      document.body.appendChild(modal);
    }

    var total = currentFbLightboxItems.length;
    var cur = currentFbLightboxIndex + 1;
    var isVid = (item.type === 'video');
    var dlUrl = getDownloadUrl(item);

    var mediaHtml = '';
    if (isVid) {
      var embedSrc = item.videoEmbedUrl || (item.id ? ('https://drive.google.com/file/d/' + item.id + '/preview') : item.url);
      mediaHtml =
        '<div class="fb-lb-video-box" style="position:relative;">' +
          '<iframe src="' + embedSrc + '" style="width:100%;height:100%;border:0;" allow="autoplay; fullscreen" allowfullscreen></iframe>' +
          '<div class="fb-media-watermark" title="Colegio Paulo Freire &bull; Taller de Robótica">' +
            '<img src="img/escudo_paulo_freire.png" alt="Colegio Paulo Freire" />' +
          '</div>' +
        '</div>';
    } else {
      var imgSrc = getDrawingImageUrl(item);
      mediaHtml =
        '<div style="position:relative; display:inline-block; max-width:100%; max-height:100%;">' +
          '<img src="' + imgSrc + '" alt="' + (item.title || 'Foto') + '" class="fb-lb-img">' +
          '<div class="fb-media-watermark" title="Colegio Paulo Freire &bull; Taller de Robótica">' +
            '<img src="img/escudo_paulo_freire.png" alt="Colegio Paulo Freire" />' +
          '</div>' +
        '</div>';
    }

    modal.innerHTML =
      '<div class="fb-lb-header">' +
        '<div class="fb-lb-counter">' + (isVid ? '🎬 Video ' : '📸 Foto ') + cur + ' de ' + total + '</div>' +
        '<div class="fb-lb-actions">' +
          (dlUrl && dlUrl !== '#' ?
            '<a href="' + dlUrl + '" onclick="return window.downloadDriveFileDirect(\'' + dlUrl + '\', \'' + (item.title || '').replace(/'/g, "\\'") + '\', event);" class="fb-lb-btn" title="Descargar archivo"><i class="fas fa-download"></i></a>' : '') +
          (item.url ?
            '<a href="' + item.url + '" target="_blank" rel="noopener noreferrer" class="fb-lb-btn" title="Abrir en pestaña nueva"><i class="fas fa-external-link-alt"></i></a>' : '') +
          '<button type="button" class="fb-lb-btn" onclick="window.closeFbLightbox()" title="Cerrar (Esc)"><i class="fas fa-times"></i></button>' +
        '</div>' +
      '</div>' +
      '<div class="fb-lb-body">' +
        (currentFbLightboxIndex > 0 ?
          '<button type="button" class="fb-lb-nav-btn prev" onclick="window.navFbLightbox(-1)" title="Anterior"><i class="fas fa-chevron-left"></i></button>' : '') +
        '<div class="fb-lb-media-wrap">' + mediaHtml + '</div>' +
        (currentFbLightboxIndex < total - 1 ?
          '<button type="button" class="fb-lb-nav-btn next" onclick="window.navFbLightbox(1)" title="Siguiente"><i class="fas fa-chevron-right"></i></button>' : '') +
      '</div>' +
      '<div class="fb-lb-footer">' +
        '<div class="fb-lb-info">' +
          '<h4>' + (item.title || item.name) + '</h4>' +
          '<p>' + (item.date ? item.date + ' &bull; ' : '') + (item.size ? item.size + ' &bull; ' : '') + (isVid ? 'Video oficial en Google Drive' : 'Fotografía / Dibujo en Google Drive') + '</p>' +
        '</div>' +
      '</div>';
  }

  if (!window._fbLightboxKeybound) {
    window._fbLightboxKeybound = true;
    window.addEventListener('keydown', function(e){
      var modal = document.getElementById('fb-lightbox-modal');
      if (!modal) return;
      if (e.key === 'Escape') {
        closeFbLightbox();
      } else if (e.key === 'ArrowLeft') {
        navFbLightbox(-1);
      } else if (e.key === 'ArrowRight') {
        navFbLightbox(1);
      }
    });
  }

  function renderFacebookMediaWallHtml(student, allItems, filter, driveTargetUrl, isLoading) {
    allItems = allItems || [];

    // Normalizar metadatos de año y álbum para cada elemento
    allItems.forEach(function(it){
      if (!it.year) it.year = extractItemYear(it);
      if (!it.album) it.album = extractItemAlbum(it);
      if (!it.albumIcon) it.albumIcon = getAlbumEmoji(it.album);
    });

    // 1. Extraer años disponibles
    var availableYears = [];
    var yearSet = {};
    allItems.forEach(function(it){
      var y = it.year || '2026';
      if (!yearSet[y]) {
        yearSet[y] = true;
        availableYears.push(y);
      }
    });
    availableYears.sort().reverse();
    if (availableYears.length === 0) availableYears.push('2026');

    // 2. Extraer álbumes disponibles según el año seleccionado (o todos si fbSelectedYear === 'all')
    var yearFilteredPool = (fbSelectedYear === 'all')
      ? allItems
      : allItems.filter(function(it){ return it.year === fbSelectedYear; });

    var availableAlbumsMap = {};
    yearFilteredPool.forEach(function(it){
      var alb = it.album || 'Taller & Proyectos';
      if (!availableAlbumsMap[alb]) {
        availableAlbumsMap[alb] = {
          name: alb,
          icon: it.albumIcon || getAlbumEmoji(alb),
          count: 0,
          videoCount: 0,
          photoCount: 0,
          coverItem: it,
          year: it.year
        };
      }
      availableAlbumsMap[alb].count++;
      if (it.type === 'video') availableAlbumsMap[alb].videoCount++;
      else availableAlbumsMap[alb].photoCount++;
    });
    var availableAlbums = Object.keys(availableAlbumsMap).map(function(k){ return availableAlbumsMap[k]; });

    // Si el álbum seleccionado no existe en el año actual, resetear a 'all'
    if (fbSelectedAlbum !== 'all' && !availableAlbumsMap[fbSelectedAlbum]) {
      fbSelectedAlbum = 'all';
    }

    // 3. Filtrar ítems para la vista
    var filteredItems = allItems;
    if (fbSelectedYear !== 'all') {
      filteredItems = filteredItems.filter(function(it){ return it.year === fbSelectedYear; });
    }
    if (fbSelectedAlbum !== 'all') {
      filteredItems = filteredItems.filter(function(it){ return it.album === fbSelectedAlbum; });
    }

    var videoItems = filteredItems.filter(function(it){ return it.type === 'video'; });
    var photoItems = filteredItems.filter(function(it){ return it.type !== 'video'; });

    if (filter === 'videos') filteredItems = videoItems;
    else if (filter === 'photos') filteredItems = photoItems;

    currentFbLightboxItems = filteredItems;

    // 1. Perfil / Cabecera Facebook
    var profileHtml =
      '<div class="fb-profile-card">' +
        '<div class="fb-profile-cover">' +
          '<div class="fb-cover-badge"><i class="fas fa-graduation-cap"></i> Colegio Paulo Freire &bull; Taller de Robótica ' + (fbSelectedYear !== 'all' ? fbSelectedYear : '2026') + '</div>' +
        '</div>' +
        '<div class="fb-profile-info-row">' +
          '<div class="fb-avatar-ring">' +
            ((typeof window.renderStudentAvatarHtml === 'function') ? window.renderStudentAvatarHtml(student, 'fb-avatar-emoji', true) : ('<div class="fb-avatar-emoji">' + (student.avatar || '🤖') + '</div>')) +
            '<div class="fb-avatar-online" title="Conectado a Google Drive"></div>' +
          '</div>' +
          '<div class="fb-profile-details">' +
            '<div class="fb-profile-name-row">' +
              '<h3 class="fb-profile-name">' + student.name + '</h3>' +
              '<i class="fas fa-check-circle fb-verified-icon" title="Alumno Verificado FreireBot"></i>' +
            '</div>' +
            '<div class="fb-profile-sub">' +
              '<span>' + student.gradeName + '</span>' +
            '</div>' +
          '</div>' +
        '</div>' +

        // Barra de pestañas Facebook
        '<nav class="fb-nav-tabs" role="tablist">' +
          '<button type="button" class="fb-tab-btn ' + (filter==='all' ? 'active' : '') + '" onclick="window.switchFbFilter(\'all\', event)">' +
            '<i class="fas fa-stream"></i> Muro <span class="fb-tab-badge">' + filteredItems.length + '</span>' +
          '</button>' +
          '<button type="button" class="fb-tab-btn ' + (filter==='albums' ? 'active' : '') + '" onclick="window.switchFbFilter(\'albums\', event)">' +
            '<i class="fas fa-folder"></i> Álbumes <span class="fb-tab-badge">' + availableAlbums.length + '</span>' +
          '</button>' +
          '<button type="button" class="fb-tab-btn ' + (filter==='videos' ? 'active' : '') + '" onclick="window.switchFbFilter(\'videos\', event)">' +
            '<i class="fas fa-video"></i> Videos <span class="fb-tab-badge">' + videoItems.length + '</span>' +
          '</button>' +
          '<button type="button" class="fb-tab-btn ' + (filter==='photos' ? 'active' : '') + '" onclick="window.switchFbFilter(\'photos\', event)">' +
            '<i class="fas fa-images"></i> Fotos <span class="fb-tab-badge">' + photoItems.length + '</span>' +
          '</button>' +
          '<button type="button" class="fb-tab-btn ' + (filter==='grid' ? 'active' : '') + '" onclick="window.switchFbFilter(\'grid\', event)">' +
            '<i class="fas fa-th"></i> Cuadrícula' +
          '</button>' +
          (driveTargetUrl ?
            '<a href="' + driveTargetUrl + '" target="_blank" rel="noopener noreferrer" class="fb-tab-btn" style="text-decoration:none; margin-left:auto;">' +
              '<i class="fab fa-google-drive" style="color:#1877F2;"></i> Drive <i class="fas fa-external-link-alt" style="font-size:0.75rem;"></i>' +
            '</a>' : '') +
        '</nav>' +
      '</div>';

    // 2. Panel de Filtros por Año y Álbum/Carpeta
    var filtersPanelHtml =
      '<div class="fb-filters-panel">' +
        // Fila 1: Selector de Año
        '<div class="fb-selector-row">' +
          '<div class="fb-selector-label"><i class="far fa-calendar-alt"></i> Año:</div>' +
          '<div class="fb-selector-pills">' +
            '<button type="button" class="fb-filter-pill ' + (fbSelectedYear === 'all' ? 'active' : '') + '" onclick="window.switchFbYear(\'all\', event)">' +
              '🌟 Todos los Años' +
            '</button>' +
            availableYears.map(function(y){
              return '<button type="button" class="fb-filter-pill ' + (fbSelectedYear === y ? 'active' : '') + '" onclick="window.switchFbYear(\'' + y + '\', event)">' +
                '📅 ' + y +
              '</button>';
            }).join('') +
          '</div>' +
        '</div>' +

        // Fila 2: Selector de Álbum / Carpeta
        '<div class="fb-selector-row">' +
          '<div class="fb-selector-label"><i class="fas fa-folder-open"></i> Álbum:</div>' +
          '<div class="fb-selector-pills">' +
            '<button type="button" class="fb-filter-pill purple ' + (fbSelectedAlbum === 'all' ? 'active' : '') + '" onclick="window.switchFbAlbum(\'all\', event)">' +
              '📁 Todos (' + yearFilteredPool.length + ')' +
            '</button>' +
            availableAlbums.map(function(alb){
              return '<button type="button" class="fb-filter-pill purple ' + (fbSelectedAlbum === alb.name ? 'active' : '') + '" onclick="window.switchFbAlbum(\'' + alb.name.replace(/'/g, "\\'") + '\', event)">' +
                alb.icon + ' ' + alb.name + ' <span style="font-size:0.75rem; opacity:0.85;">(' + alb.count + ')</span>' +
              '</button>';
            }).join('') +
          '</div>' +
        '</div>' +

        // Banner informativo de filtro activo
        ((fbSelectedYear !== 'all' || fbSelectedAlbum !== 'all') ?
          ('<div class="fb-active-album-banner">' +
            '<div class="fb-active-album-text">' +
              '<i class="fas fa-filter"></i> Mostrando: ' +
              (fbSelectedYear !== 'all' ? '<strong>Año ' + fbSelectedYear + '</strong> ' : '') +
              (fbSelectedAlbum !== 'all' ? '<strong>&bull; Álbum ' + fbSelectedAlbum + '</strong>' : '') +
              ' (' + filteredItems.length + ' archivos)' +
            '</div>' +
            '<button type="button" class="fb-active-album-clear" onclick="window.resetFbFilters(event)">' +
              '<i class="fas fa-times"></i> Ver Todo' +
            '</button>' +
          '</div>') : '') +
      '</div>';

    // 3. Composer Box ("¿Qué aprendimos hoy en Robótica?")
    var composerHtml =
      '<div class="fb-composer-card">' +
        '<div class="fb-composer-top">' +
          '<div class="fb-composer-avatar">' + ((typeof window.renderStudentAvatarHtml === 'function') ? window.renderStudentAvatarHtml(student, 'fb-composer-avatar-fig', false) : (student.avatar || '🤖')) + '</div>' +
          '<button type="button" class="fb-composer-trigger" onclick="var inp=document.getElementById(\'gdz-file-input\'); if(inp) inp.click();">' +
            'Muro multimedia de ' + student.name.split(' ')[0] + ' &bull; Subir foto o video...' +
          '</button>' +
        '</div>' +
        '<div class="fb-composer-actions">' +
          '<button type="button" class="fb-composer-btn video-btn" onclick="window.switchFbFilter(\'videos\', event)">' +
            '<i class="fas fa-video"></i> <span>Videos (' + videoItems.length + ')</span>' +
          '</button>' +
          '<button type="button" class="fb-composer-btn photo-btn" onclick="window.switchFbFilter(\'photos\', event)">' +
            '<i class="fas fa-camera"></i> <span>Fotos (' + photoItems.length + ')</span>' +
          '</button>' +
          '<button type="button" class="fb-composer-btn album-btn" onclick="window.switchFbFilter(\'albums\', event)">' +
            '<i class="fas fa-folder"></i> <span>Álbumes (' + availableAlbums.length + ')</span>' +
          '</button>' +
          (driveTargetUrl ?
            '<a href="' + driveTargetUrl + '" target="_blank" rel="noopener noreferrer" class="fb-composer-btn drive-btn" style="text-decoration:none;">' +
              '<i class="fab fa-google-drive"></i> <span>Drive</span>' +
            '</a>' : '') +
        '</div>' +
      '</div>';

    // 4. Contenido según el filtro
    var bodyHtml = '';

    if (isLoading && allItems.length === 0) {
      bodyHtml = loadingHtml(
        'Sincronizando Muro de Fotos y Videos...',
        'Conectando en vivo con la carpeta de Google Drive del alumno...',
        '#1877F2'
      );
    } else if (filter === 'albums') {
      // ── MODO VISTA DE ÁLBUMES / CARPETAS ──
      if (availableAlbums.length === 0) {
        bodyHtml =
          '<div class="fb-empty-state">' +
            '<div class="fb-empty-icon">📁</div>' +
            '<h4 class="fb-empty-title">No hay carpetas ni álbumes en este período</h4>' +
            '<p class="fb-empty-desc">Las fotos y videos organizados en subcarpetas de Google Drive (como 2026, eventos, etc.) se agruparán automáticamente aquí.</p>' +
            '<button type="button" class="fb-empty-action-btn" onclick="window.resetFbFilters(event)"><i class="fas fa-undo"></i> Restablecer Filtros</button>' +
          '</div>';
      } else {
        bodyHtml =
          '<div class="fb-albums-grid">' +
            availableAlbums.map(function(alb){
              var coverThumb = alb.coverItem
                ? (alb.coverItem.type === 'video'
                    ? (alb.coverItem.thumbUrl || 'https://drive.google.com/thumbnail?id=' + alb.coverItem.id + '&sz=w600')
                    : getDrawingImageUrl(alb.coverItem))
                : 'img/escudo_paulo_freire.png';
              return '<div class="fb-album-card" onclick="window.switchFbAlbum(\'' + alb.name.replace(/'/g, "\\'") + '\', event)" title="Abrir álbum ' + alb.name.replace(/"/g, '&quot;') + '">' +
                '<div class="fb-album-cover-wrap">' +
                  '<img src="' + coverThumb + '" alt="' + alb.name.replace(/"/g, '&quot;') + '" class="fb-album-cover" loading="lazy" onerror="this.src=\'img/escudo_paulo_freire.png\'">' +
                  '<span class="fb-album-icon-badge">' + alb.icon + '</span>' +
                  '<span class="fb-album-year-badge"><i class="far fa-calendar-alt"></i> ' + (alb.year || fbSelectedYear) + '</span>' +
                '</div>' +
                '<div class="fb-album-info">' +
                  '<div class="fb-album-title">' + alb.name + '</div>' +
                  '<div class="fb-album-meta">' +
                    '<span><i class="fas fa-images"></i> ' + alb.count + ' archivo' + (alb.count === 1 ? '' : 's') + '</span>' +
                    (alb.videoCount > 0 ? '<span>&bull; <i class="fas fa-video"></i> ' + alb.videoCount + '</span>' : '') +
                  '</div>' +
                '</div>' +
              '</div>';
            }).join('') +
          '</div>';
      }
    } else if (filter === 'grid') {
      // ── MODO CUADRÍCULA / GALERÍA ──
      if (filteredItems.length === 0) {
        bodyHtml =
          '<div class="fb-empty-state">' +
            '<div class="fb-empty-icon">🖼️</div>' +
            '<h4 class="fb-empty-title">Aún no hay fotos ni videos en esta vista</h4>' +
            '<p class="fb-empty-desc">Los archivos que el docente o vos suban a la carpeta de Google Drive aparecerán organizados en este álbum.</p>' +
            '<div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">' +
              '<button type="button" class="fb-empty-action-btn" onclick="var inp=document.getElementById(\'gdz-file-input\'); if(inp) inp.click();"><i class="fas fa-plus"></i> Subir Foto o Video</button>' +
              ((fbSelectedYear !== 'all' || fbSelectedAlbum !== 'all') ? '<button type="button" class="fb-empty-action-btn" style="background:#475569;" onclick="window.resetFbFilters(event)"><i class="fas fa-undo"></i> Ver Todo</button>' : '') +
            '</div>' +
          '</div>';
      } else {
        bodyHtml =
          '<div class="fb-grid-gallery">' +
            filteredItems.map(function(item, idx){
              var isVid = (item.type === 'video');
              var thumb = isVid
                ? (item.thumbUrl || 'https://drive.google.com/thumbnail?id=' + item.id + '&sz=w600')
                : getDrawingImageUrl(item);
              return '<div class="fb-grid-item" onclick="window.openFbLightbox(' + idx + ')">' +
                '<img src="' + thumb + '" alt="' + (item.title || item.name).replace(/"/g, '&quot;') + '" class="fb-grid-thumb" loading="lazy" onerror="this.src=\'img/escudo_paulo_freire.png\'">' +
                (isVid ? '<div class="fb-grid-video-pill"><i class="fas fa-play"></i> Video</div>' : '') +
                '<div class="fb-grid-hover-overlay">' +
                  '<i class="fas ' + (isVid ? 'fa-play-circle' : 'fa-expand') + '"></i>' +
                  '<span class="fb-grid-hover-title">' + (item.title || item.name) + '</span>' +
                '</div>' +
              '</div>';
            }).join('') +
          '</div>';
      }
    } else {
      // ── MODO FEED DE PUBLICACIONES (ESTILO FACEBOOK WALL) ──
      if (filteredItems.length === 0) {
        var emptyMsg = filter === 'videos'
          ? { icon: '🎬', title: 'No hay videos en este filtro', desc: 'No se encontraron videos para el año o álbum seleccionado.' }
          : (filter === 'photos'
              ? { icon: '📸', title: 'No hay fotos en este filtro', desc: 'No se encontraron fotos para el año o álbum seleccionado.' }
              : { icon: '📸🎬', title: '¡No hay publicaciones para este filtro!', desc: 'Probá seleccionando otro año, otro álbum o restablecé los filtros para ver todo tu muro.' });

        bodyHtml =
          '<div class="fb-empty-state">' +
            '<div class="fb-empty-icon">' + emptyMsg.icon + '</div>' +
            '<h4 class="fb-empty-title">' + emptyMsg.title + '</h4>' +
            '<p class="fb-empty-desc">' + emptyMsg.desc + '</p>' +
            '<div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">' +
              '<button type="button" class="fb-empty-action-btn" onclick="var inp=document.getElementById(\'gdz-file-input\'); if(inp) inp.click();"><i class="fas fa-upload"></i> Subir Foto o Video</button>' +
              ((fbSelectedYear !== 'all' || fbSelectedAlbum !== 'all') ? '<button type="button" class="fb-empty-action-btn" style="background:#475569;" onclick="window.resetFbFilters(event)"><i class="fas fa-undo"></i> Restablecer Filtros</button>' : '') +
              (driveTargetUrl ? '<a href="' + driveTargetUrl + '" target="_blank" rel="noopener noreferrer" class="fb-empty-action-btn" style="background:#0F172A; text-decoration:none;"><i class="fab fa-google-drive"></i> Abrir Carpeta de Drive</a>' : '') +
            '</div>' +
          '</div>';
      } else {
        bodyHtml =
          '<div class="fb-feed-list">' +
            filteredItems.map(function(item, idx){
              var isVid = (item.type === 'video');
              var isLiked = isItemLiked(item.id || item.name);
              var dlUrl = getDownloadUrl(item);
              var title = item.title || item.name;

              // Media player
              var mediaBoxHtml = '';
              if (isVid) {
                var embedSrc = item.videoEmbedUrl || (item.id ? ('https://drive.google.com/file/d/' + item.id + '/preview') : item.url);
                mediaBoxHtml =
                  '<div class="fb-video-container">' +
                    '<div class="fb-video-aspect">' +
                      '<iframe src="' + embedSrc + '" class="fb-video-iframe" allow="autoplay; fullscreen" allowfullscreen loading="lazy" title="' + title.replace(/"/g, '&quot;') + '"></iframe>' +
                      '<div class="fb-media-watermark" title="Colegio Paulo Freire &bull; Taller de Robótica">' +
                        '<img src="img/escudo_paulo_freire.png" alt="Colegio Paulo Freire" />' +
                      '</div>' +
                    '</div>' +
                    '<div class="fb-video-bar">' +
                      '<span><i class="fas fa-video"></i> Video Oficial &bull; ' + (item.size || 'HD') + '</span>' +
                      (dlUrl && dlUrl !== '#' ?
                        '<a href="' + dlUrl + '" onclick="return window.downloadDriveFileDirect(\'' + dlUrl + '\', \'' + title.replace(/'/g, "\\'") + '\', event);"><i class="fas fa-download"></i> Descargar Video</a>' : '') +
                    '</div>' +
                  '</div>';
              } else {
                var imgSrc = getDrawingImageUrl(item);
                mediaBoxHtml =
                  '<div class="fb-photo-container" onclick="window.openFbLightbox(' + idx + ')" title="Hacé clic para ver la foto en pantalla completa">' +
                    '<img src="' + imgSrc + '" alt="' + title.replace(/"/g, '&quot;') + '" class="fb-photo-image" loading="lazy" onerror="this.src=\'img/escudo_paulo_freire.png\'">' +
                    '<div class="fb-media-watermark" title="Colegio Paulo Freire &bull; Taller de Robótica">' +
                      '<img src="img/escudo_paulo_freire.png" alt="Colegio Paulo Freire" />' +
                    '</div>' +
                    '<div class="fb-photo-zoom-hint"><i class="fas fa-search-plus"></i> Ver foto completa</div>' +
                  '</div>';
              }

              return '<article class="fb-post-card" id="fb-post-' + item.id + '">' +
                // Cabecera del Post
                '<div class="fb-post-header">' +
                  '<div class="fb-post-avatar-wrap">' +
                    ((typeof window.renderStudentAvatarHtml === 'function') ? window.renderStudentAvatarHtml(student, 'fb-post-avatar-fig', true) : ('<span class="fb-post-avatar">' + (student.avatar || '🤖') + '</span>')) +
                  '</div>' +
                  '<div class="fb-post-meta">' +
                    '<div class="fb-author-row">' +
                      '<strong class="fb-author-name">Colegio Paulo Freire &bull; ' + student.name + '</strong>' +
                      '<span class="fb-post-badge-type ' + (isVid ? 'video' : 'image') + '">' +
                        (isVid ? '<i class="fas fa-video"></i> Video' : '<i class="fas fa-image"></i> Foto') +
                      '</span>' +
                    '</div>' +
                    '<div class="fb-post-time-row">' +
                      '<span><i class="far fa-calendar-alt"></i> ' + (item.date || ('Taller ' + (item.year || '2026'))) + '</span>' +
                      '<span>&bull;</span>' +
                      '<span class="fb-post-album-tag" onclick="window.switchFbAlbum(\'' + (item.album || 'Taller').replace(/'/g, "\\'") + '\', event)" title="Ver fotos y videos del álbum ' + (item.album || 'Taller').replace(/"/g, '&quot;') + '">' +
                        (item.albumIcon || '📁') + ' ' + (item.album || 'Taller') +
                      '</span>' +
                      '<span>&bull;</span>' +
                      '<span title="Visible para alumno y familia"><i class="fas fa-user-friends"></i></span>' +
                      '<span>&bull;</span>' +
                      '<span>' + student.gradeName + '</span>' +
                    '</div>' +
                  '</div>' +
                  (driveTargetUrl ?
                    '<a href="' + driveTargetUrl + '" target="_blank" rel="noopener noreferrer" class="fb-menu-btn" title="Ver en Google Drive">' +
                      '<i class="fab fa-google-drive"></i>' +
                    '</a>' : '') +
                '</div>' +

                // Contenido del Post
                '<div class="fb-post-content">' +
                  '<h4 class="fb-post-title">' + title + '</h4>' +
                  '<p class="fb-post-desc">' +
                    (isVid ? '🎬 Demostración y registro en video de la actividad práctica de robótica y programación en clase.' : '📸 Registro fotográfico de creaciones, dibujos y maquetas del taller de tecnología.') +
                  '</p>' +
                  '<div class="fb-post-tags">' +
                    '<span class="fb-post-tag">#RoboticaFreire</span>' +
                    '<span class="fb-post-tag">#' + (item.album ? item.album.replace(/\s+/g,'') : 'Taller') + '</span>' +
                    '<span class="fb-post-tag">#Taller' + (item.year || '2026') + '</span>' +
                    '<span class="fb-post-tag">#' + (student.gradeId || 'robotica') + '</span>' +
                  '</div>' +
                '</div>' +

                // Media (Video o Foto)
                '<div class="fb-post-media">' + mediaBoxHtml + '</div>' +

                // Barra de Estadísticas / Reacciones
                '<div class="fb-post-stats">' +
                  '<div style="display:flex; align-items:center;">' +
                    '<div class="fb-reactions-icons">' +
                      '<span class="fb-rx-bubble like">👍</span>' +
                      '<span class="fb-rx-bubble love">❤️</span>' +
                      '<span class="fb-rx-bubble rocket">🚀</span>' +
                      '<span class="fb-rx-bubble robot">🤖</span>' +
                    '</div>' +
                    '<span class="fb-rx-text" id="fb-reaction-text-' + item.id + '">' +
                      (isLiked ? 'A vos y al equipo de Robótica les gusta esto' : 'Al equipo de Robótica le gusta esto') +
                    '</span>' +
                  '</div>' +
                  '<span>' + (item.size || 'HD') + ' &bull; En Google Drive</span>' +
                '</div>' +

                // Barra de Acciones Facebook (Me gusta, Comentar, Descargar, Drive)
                '<div class="fb-post-actions">' +
                  '<button type="button" class="fb-action-btn fb-btn-like ' + (isLiked ? 'liked' : '') + '" id="fb-like-btn-' + item.id + '" onclick="window.toggleFbLike(\'' + item.id + '\', event)">' +
                    '<i class="' + (isLiked ? 'fas' : 'far') + ' fa-thumbs-up"></i> <span>' + (isLiked ? '¡Te gusta!' : 'Me gusta') + '</span>' +
                  '</button>' +
                  '<button type="button" class="fb-action-btn" onclick="window.toggleFbComments(\'' + item.id + '\', event)">' +
                    '<i class="far fa-comment-alt"></i> <span>Comentario</span>' +
                  '</button>' +
                  (dlUrl && dlUrl !== '#' ?
                    '<a href="' + dlUrl + '" onclick="return window.downloadDriveFileDirect(\'' + dlUrl + '\', \'' + title.replace(/'/g, "\\'") + '\', event);" class="fb-action-btn" title="Descargar archivo en tu equipo">' +
                      '<i class="fas fa-download"></i> <span>Descargar</span>' +
                    '</a>' : '') +
                  (driveTargetUrl ?
                    '<a href="' + driveTargetUrl + '" target="_blank" rel="noopener noreferrer" class="fb-action-btn" title="Abrir carpeta de Google Drive">' +
                      '<i class="fab fa-google-drive"></i> <span>Drive</span>' +
                    '</a>' : '') +
                '</div>' +

                // Sección de Comentarios / Feedback Docente
                '<div class="fb-comments-section" id="fb-comments-' + item.id + '" style="display:none;">' +
                  '<div class="fb-comment-item">' +
                    '<div class="fb-comment-avatar">🤖</div>' +
                    '<div class="fb-comment-bubble">' +
                      '<span class="fb-comment-author">FreireBot &bull; Taller de Robótica</span>' +
                      '<p class="fb-comment-body">¡Excelente trabajo en clase! Este archivo está guardado en tu carpeta institucional de Google Drive para compartir con tu familia. 🌟</p>' +
                    '</div>' +
                  '</div>' +
                '</div>' +
              '</article>';
            }).join('') +
          '</div>';
      }
    }

    return '<div class="fb-wall-wrapper">' + profileHtml + filtersPanelHtml + composerHtml + bodyHtml + '</div>';
  }


  // ──────────────────────────────────────────────────
  // LA MESA DEL CAPITÁN (PIRATA) / PROYECTOR DE HOLOGRAMAS (ESPACIAL)
  // ──────────────────────────────────────────────────
  function renderCaptainTableHtml(allItems) {
    var isLegacy = isLegacyTheme();
    var isCyber = isCyberTheme();
    var isSpace = isSpaceTheme();
    if (!allItems || allItems.length === 0) {
      return emptyHtml(
        isLegacy ? '🎓' : (isCyber ? '📟' : (isSpace ? '🌌' : '🎨')),
        isLegacy ? 'Álbum de Recuerdos vacío' : (isCyber ? 'Terminal de Renders vacía' : (isSpace ? 'Cápsula de Hologramas vacía' : 'Cofre de Pergaminos vacío')),
        isLegacy ? '¡Subí tu primera foto, diploma o recuerdo de honor abajo para atesorarlo en el anuario!' : (isCyber ? '¡Subí tu primer render 3D o esquema técnico abajo para compilarlo en la matriz!' : (isSpace ? '¡Subí tu primer dibujo o captura espacial abajo para proyectarlo en la consola!' : '¡Depositá tu primer pergamino o dibujo abajo para desplegarlo en la mesa!'))
      );
    }

    var totalItems = allItems.length;
    var totalPages = Math.ceil(totalItems / CAPTAIN_TABLE_PAGE_SIZE) || 1;
    if (captainTablePage > totalPages) captainTablePage = totalPages;
    if (captainTablePage < 1) captainTablePage = 1;

    var startIdx = (captainTablePage - 1) * CAPTAIN_TABLE_PAGE_SIZE;
    var pageItems = allItems.slice(startIdx, startIdx + CAPTAIN_TABLE_PAGE_SIZE);

    var cardsHtml = pageItems.map(function(item, idx){
      var realIdx = startIdx + idx;
      var imgSrc = getDrawingImageUrl(item);
      var title  = item.title || item.name || ((isLegacy ? 'Recuerdo #' : (isCyber ? 'Render #' : (isSpace ? 'Holograma #' : 'Pergamino #'))) + (realIdx + 1));
      var dlUrl  = getDownloadUrl(item);
      var rotClass = 'csc-rot-' + (realIdx % 6);

      var sealTitle = isLegacy ? 'Sello Dorado de Honor Egresados Paulo Freire' : (isCyber ? 'Chip Criptográfico Paulo Freire' : (isSpace ? 'Sello de la Flota Estelar' : 'Sellado con cera pirata'));
      var sealIcon = isLegacy ? 'fa-award' : (isCyber ? 'fa-microchip' : (isSpace ? 'fa-satellite-dish' : 'fa-anchor'));
      var nailTitle = isLegacy ? 'Prendedor conmemorativo del anuario' : (isCyber ? 'Conector de bus digital' : (isSpace ? 'Anclado al proyector orbital' : 'Clavado a la mesa del capitán'));
      var ribbonPrefix = isLegacy ? 'Recuerdo #' : (isCyber ? 'Render #' : (isSpace ? 'Holograma #' : 'Pergamino #'));
      var ribbonIcon = isLegacy ? 'fa-graduation-cap' : (isCyber ? 'fa-microchip' : (isSpace ? 'fa-satellite' : 'fa-scroll'));
      var actionLabel = isLegacy ? 'Contemplar' : (isCyber ? 'Examinar' : (isSpace ? 'Proyectar' : 'Examinar'));

      return '<div class="captain-scroll-card ' + rotClass + '" data-img-url="' + imgSrc + '" data-img-title="' + title + '" data-dl-url="' + (dlUrl || '') + '">' +
        '<div class="csc-wax-seal" title="' + sealTitle + '">' +
          '<div class="csc-wax-stamp"><i class="fas ' + sealIcon + '"></i></div>' +
        '</div>' +
        '<div class="csc-card-nail" title="' + nailTitle + '"></div>' +
        '<div class="csc-thumb-frame">' +
          '<img src="' + imgSrc + '" alt="' + title + '" loading="lazy" referrerpolicy="no-referrer" onerror="this.src=\'img/escudo_paulo_freire.png\'">' +
          '<div class="csc-view-overlay">' +
            '<div class="csc-vo-icon"><i class="fas fa-search-plus"></i></div>' +
            '<span>' + actionLabel + '</span>' +
          '</div>' +
          '<span class="csc-ribbon-badge"><i class="fas ' + ribbonIcon + '"></i> ' + ribbonPrefix + (realIdx + 1) + '</span>' +
        '</div>' +
        '<div class="csc-body">' +
          '<h4 class="csc-title" title="' + title + '">' + title + '</h4>' +
          '<div class="csc-meta">' +
            (item.date ? '<span class="csc-meta-item"><i class="fas ' + (isLegacy ? 'fa-calendar-alt' : (isCyber ? 'fa-clock' : (isSpace ? 'fa-clock' : 'fa-quill'))) + '"></i> ' + item.date + '</span>' : '') +
            (item.size ? '<span class="csc-meta-item"><i class="fas ' + (isLegacy ? 'fa-medal' : (isCyber ? 'fa-memory' : (isSpace ? 'fa-microchip' : 'fa-coins'))) + '"></i> ' + item.size + '</span>' : '') +
          '</div>' +
          '<div class="csc-actions">' +
            '<button type="button" class="csc-btn-view" title="' + (isLegacy ? 'Contemplar recuerdo en pantalla completa' : (isCyber ? 'Examinar render en pantalla completa' : (isSpace ? 'Proyectar holograma en tamaño completo' : 'Examinar pergamino en tamaño completo'))) + '">' +
              '<i class="fas fa-eye"></i> <span>' + actionLabel + '</span>' +
            '</button>' +
            (dlUrl && dlUrl !== '#' ?
              '<a href="' + dlUrl + '" onclick="return window.downloadDriveFileDirect(\'' + dlUrl + '\', \'' + title.replace(/'/g, "\\'") + '\', event);" class="csc-btn-download" title="Guardar directamente en tu equipo">' +
                '<i class="fas fa-download"></i> <span>Guardar</span>' +
              '</a>' : '') +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    // Paginación náutica pirata / galáctica / cyber
    var paginationHtml = '';
    if (totalPages > 1) {
      var pagesBtns = '';
      for (var p = 1; p <= totalPages; p++) {
        var isCurrent = (p === captainTablePage);
        pagesBtns += '<button type="button" class="ctp-page-btn ' + (isCurrent ? 'active' : '') + '" data-page="' + p + '" title="Ir a página ' + p + '">' +
          '<span>' + p + '</span>' +
        '</button>';
      }

      paginationHtml =
        '<div class="captain-table-pagination">' +
          '<div class="ctp-nav-left">' +
            '<button type="button" class="ctp-nav-btn ctp-prev" data-page="' + (captainTablePage - 1) + '" ' + (captainTablePage <= 1 ? 'disabled' : '') + ' title="Anterior">' +
              '<i class="fas fa-chevron-left"></i> <span>Anterior</span>' +
            '</button>' +
          '</div>' +
          '<div class="ctp-pages-list">' +
            pagesBtns +
          '</div>' +
          '<div class="ctp-nav-right">' +
            '<button type="button" class="ctp-nav-btn ctp-next" data-page="' + (captainTablePage + 1) + '" ' + (captainTablePage >= totalPages ? 'disabled' : '') + ' title="Siguiente">' +
              '<span>Siguiente</span> <i class="fas fa-chevron-right"></i>' +
            '</button>' +
          '</div>' +
        '</div>';
    }

    var showingEnd = Math.min(startIdx + CAPTAIN_TABLE_PAGE_SIZE, totalItems);

    var boardTheme = isLegacy ? 'legacy-album-board' : (isCyber ? 'cyber-blueprint-board' : (isSpace ? 'space-hologram-board' : ''));
    var headerIcon = isLegacy ? '🎓' : (isCyber ? '📟' : (isSpace ? '🌌' : '🗺️'));
    var headerTitle = isLegacy
      ? 'Álbum de Recuerdos y Diplomas de Egresados'
      : (isCyber
        ? 'Matriz Digital de Renders y Planos Técnicos'
        : (isSpace ? 'Consola de Hologramas y Capturas Espaciales' : 'Mesa de Cartas y Pergaminos del Capitán'));
    var headerDesc = isLegacy
      ? 'Fotografías, diplomas de honor y memorias atesoradas de tu trayectoria maker'
      : (isCyber
        ? 'Tus creaciones digitales, modelados 3D y capturas de circuitos compilados'
        : (isSpace ? 'Tus diseños y capturas espaciales proyectados en la consola' : 'Tus láminas e ilustraciones náuticas desplegadas'));
    var badgeUnit = isLegacy ? ' Recuerdo(s) · Tomo ' : (isCyber ? ' Render(s) · Bloque ' : (isSpace ? ' Holograma(s) · Sector ' : ' Pergamino(s) · Pliego '));
    var badgeIcon = isLegacy ? 'fa-award' : (isCyber ? 'fa-microchip' : (isSpace ? 'fa-satellite' : 'fa-scroll'));

    return '<div class="captain-table-board ' + boardTheme + '">' +
      '<div class="ct-brass-corner ctb-tl"></div>' +
      '<div class="ct-brass-corner ctb-tr"></div>' +
      '<div class="ct-brass-corner ctb-bl"></div>' +
      '<div class="ct-brass-corner ctb-br"></div>' +
      '<div class="ct-table-header">' +
        '<div class="ct-th-left">' +
          '<div class="ct-th-icon">' + headerIcon + '</div>' +
          '<div class="ct-th-info">' +
            '<h3>' + headerTitle + '</h3>' +
            '<p>' + headerDesc + ' (mostrando ' + (startIdx + 1) + ' a ' + showingEnd + ' de ' + totalItems + ').</p>' +
          '</div>' +
        '</div>' +
        '<div class="ct-th-badge">' +
          '<i class="fas ' + badgeIcon + '"></i> ' + totalItems + badgeUnit + captainTablePage + '/' + totalPages +
        '</div>' +
      '</div>' +
      '<div class="captain-table-grid">' +
        cardsHtml +
      '</div>' +
      paginationHtml +
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
  function getPirateFrameCornersHtml() {
    var cornerSvg =
      '<svg viewBox="0 0 64 64" width="44" height="44" xmlns="http://www.w3.org/2000/svg">' +
        '<defs>' +
          '<linearGradient id="pmfBrassGrad" x1="0%" y1="0%" x2="100%" y2="100%">' +
            '<stop offset="0%" stop-color="#FEF08A"/>' +
            '<stop offset="35%" stop-color="#F59E0B"/>' +
            '<stop offset="70%" stop-color="#B45309"/>' +
            '<stop offset="100%" stop-color="#78350F"/>' +
          '</linearGradient>' +
        '</defs>' +
        '<path d="M2 2 L58 2 L48 14 L22 14 C16 14 14 16 14 22 L14 48 L2 58 Z" fill="url(#pmfBrassGrad)" stroke="#451A03" stroke-width="2"/>' +
        '<path d="M6 6 L44 6 L38 10 L10 10 L10 38 L6 44 Z" fill="#FDE68A" opacity="0.45"/>' +
        '<circle cx="9" cy="9" r="3.2" fill="#451A03" stroke="#FDE68A" stroke-width="1"/>' +
        '<circle cx="42" cy="8" r="2.5" fill="#451A03" stroke="#FDE68A" stroke-width="0.8"/>' +
        '<circle cx="8" cy="42" r="2.5" fill="#451A03" stroke="#FDE68A" stroke-width="0.8"/>' +
        '<circle cx="22" cy="8" r="2" fill="#78350F"/>' +
        '<circle cx="8" cy="22" r="2" fill="#78350F"/>' +
      '</svg>';
    return (
      '<div class="pmf-brass-corner top-left">' + cornerSvg + '</div>' +
      '<div class="pmf-brass-corner top-right">' + cornerSvg + '</div>' +
      '<div class="pmf-brass-corner bottom-left">' + cornerSvg + '</div>' +
      '<div class="pmf-brass-corner bottom-right">' + cornerSvg + '</div>'
    );
  }

  function openPdfModal(pdfUrl, title) {
    if (window.sounds) window.sounds.playClick();
    var isLegacy = isLegacyTheme();
    var isCyber = isCyberTheme();
    var isSpace = isSpaceTheme();
    var modal = document.getElementById('pdf-viewer-modal');
    if (modal && !modal.querySelector('.pmf-brass-corner')) {
      modal.remove();
      modal = null;
    }
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'pdf-viewer-modal';
      modal.className = 'student-login-modal pirate-lightbox-overlay';
      modal.innerHTML =
        '<div class="slm-content ilm-content pirate-modal-frame" style="max-width:900px;width:94vw;">' +
          getPirateFrameCornersHtml() +
          '<div class="slm-header ilm-header">' +
            '<div class="ilm-title-group">' +
              '<span class="ilm-pirate-kicker" id="pvm-kicker"><i class="fas fa-compass"></i> ARCHIVO DE LA BITÁCORA · DOCUMENTO OFICIAL</span>' +
              '<div class="slm-title" id="pvm-title"></div>' +
            '</div>' +
            '<div class="ilm-header-actions">' +
              '<button type="button" class="slm-close ilm-pirate-close" onclick="document.getElementById(\'pdf-viewer-modal\').classList.remove(\'active\')" title="Cerrar">&times;</button>' +
            '</div>' +
          '</div>' +
          '<div class="slm-body ilm-body" style="padding:22px;flex-direction:column;gap:12px;">' +
            '<div class="ilm-parchment-stage" style="width:100%;">' +
              '<div class="ilm-scroll-rod top"><span class="rod-finial left"></span><span class="rod-center-ring"></span><span class="rod-finial right"></span></div>' +
              '<div class="ilm-parchment-mat" style="width:100%;padding:10px;">' +
                '<div style="width:100%;height:68vh;border-radius:8px;overflow:hidden;border:2px solid #8B5A2B;background:#FFFDF0;">' +
                  '<iframe id="pvm-iframe" src="" style="width:100%;height:100%;border:none;"></iframe>' +
                '</div>' +
              '</div>' +
              '<div class="ilm-scroll-rod bottom"><span class="rod-finial left"></span><span class="rod-center-ring"></span><span class="rod-finial right"></span></div>' +
            '</div>' +
          '</div>' +
        '</div>';
      document.body.appendChild(modal);
      modal.onclick = function(e){ if (e.target===modal) modal.classList.remove('active'); };
    }
    var frameEl = modal.querySelector('.pirate-modal-frame');
    if (frameEl) {
      frameEl.classList.toggle('theme-legacy', isLegacy);
      frameEl.classList.toggle('theme-cyber', !isLegacy && isCyber);
      frameEl.classList.toggle('theme-space', !isLegacy && !isCyber && isSpace);
    }
    var kickerEl = document.getElementById('pvm-kicker');
    if (kickerEl) {
      kickerEl.innerHTML = isLegacy
        ? '<i class="fas fa-graduation-cap"></i> ANUARIO DE EGRESADOS · DOCUMENTO DE HONOR'
        : (isCyber
          ? '<i class="fas fa-terminal"></i> TERMINAL DE CÓDIGO · MANUAL Y PLANOS TÉCNICOS'
          : (isSpace
            ? '<i class="fas fa-satellite-dish"></i> ARCHIVO DE LA FLOTA ESTELAR · MANUAL TÉCNICO'
            : '<i class="fas fa-compass"></i> ARCHIVO DE LA BITÁCORA · DOCUMENTO OFICIAL'));
    }
    var badgeIcon = isLegacy ? '🎓' : (isCyber ? '⚡' : (isSpace ? '🛰️' : '📜'));
    var defaultTitle = isLegacy ? 'Diploma y Documento de Honor' : (isCyber ? 'Manual Técnico de Robótica' : (isSpace ? 'Manual de la Estación' : 'Documento del Navío'));
    document.getElementById('pvm-title').innerHTML = '<span class="ilm-scroll-badge">' + badgeIcon + '</span> ' + (title || defaultTitle);
    document.getElementById('pvm-iframe').src = pdfUrl;
    modal.classList.add('active');
  }

  // ──────────────────────────────────────────────────
  // LIGHTBOX IMAGEN / FICHA DIDÁCTICA (PIRATA / ESPACIAL / CYBER)
  // ──────────────────────────────────────────────────
  function openImageModal(imgUrl, title, downloadUrl) {
    if (window.sounds) window.sounds.playClick();
    var isLegacy = isLegacyTheme();
    var isCyber = isCyberTheme();
    var isSpace = isSpaceTheme();
    var modal = document.getElementById('image-lightbox-modal');
    if (modal && !modal.querySelector('.pmf-brass-corner')) {
      modal.remove();
      modal = null;
    }
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'image-lightbox-modal';
      modal.className = 'student-login-modal pirate-lightbox-overlay';
      modal.innerHTML =
        '<div class="slm-content ilm-content pirate-modal-frame">' +
          getPirateFrameCornersHtml() +
          '<div class="slm-header ilm-header">' +
            '<div class="ilm-title-group">' +
              '<span class="ilm-pirate-kicker" id="ilm-kicker"><i class="fas fa-skull-crossbones"></i> MESA DEL CAPITÁN · INSPECCIÓN DE PERGAMINO</span>' +
              '<div class="slm-title" id="ilm-title"><span class="ilm-scroll-badge">📜</span> Visor de Ficha</div>' +
            '</div>' +
            '<div class="ilm-header-actions">' +
              '<a id="ilm-dl-btn" href="#" target="_blank" rel="noopener noreferrer" class="ilm-btn-action" title="Guardar en tu equipo"><i class="fas fa-coins"></i> <span id="ilm-dl-label">Descargar Pergamino</span></a>' +
              '<button type="button" class="slm-close ilm-pirate-close" id="ilm-close-btn" aria-label="Cerrar" title="Cerrar">&times;</button>' +
            '</div>' +
          '</div>' +
          '<div class="slm-body ilm-body">' +
            '<div class="ilm-parchment-stage">' +
              '<div class="ilm-scroll-rod top">' +
                '<span class="rod-finial left"></span>' +
                '<span class="rod-center-ring"><i class="fas fa-compass" id="ilm-rod-icon"></i></span>' +
                '<span class="rod-finial right"></span>' +
              '</div>' +
              '<div class="ilm-parchment-mat">' +
                '<span class="ilm-mat-corner tl">✥</span>' +
                '<span class="ilm-mat-corner tr">✥</span>' +
                '<span class="ilm-mat-corner bl">✥</span>' +
                '<span class="ilm-mat-corner br">✥</span>' +
                '<div class="ilm-img-inner-bezel">' +
                  '<img id="ilm-img" src="" alt="Ficha" referrerpolicy="no-referrer">' +
                '</div>' +
                '<div class="ilm-wax-stamp" title="Sello Oficial Paulo Freire">' +
                  '<div class="ilm-wax-ribbons"></div>' +
                  '<div class="ilm-wax-coin"><span id="ilm-wax-emoji">☠️</span></div>' +
                '</div>' +
              '</div>' +
              '<div class="ilm-scroll-rod bottom">' +
                '<span class="rod-finial left"></span>' +
                '<span class="rod-center-ring"></span>' +
                '<span class="rod-finial right"></span>' +
              '</div>' +
            '</div>' +
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

    var frameEl = modal.querySelector('.pirate-modal-frame');
    if (frameEl) {
      frameEl.classList.toggle('theme-legacy', isLegacy);
      frameEl.classList.toggle('theme-cyber', !isLegacy && isCyber);
      frameEl.classList.toggle('theme-space', !isLegacy && !isCyber && isSpace);
    }

    var kickerEl = document.getElementById('ilm-kicker');
    if (kickerEl) {
      kickerEl.innerHTML = isLegacy
        ? '<i class="fas fa-award"></i> ANUARIO DE EGRESADOS · RECUERDO DE HONOR'
        : (isCyber
          ? '<i class="fas fa-microchip"></i> MATRIZ DIGITAL · TERMINAL DE ESQUEMAS Y BLUEPRINTS'
          : (isSpace
            ? '<i class="fas fa-satellite-dish"></i> CONSOLA ESTELAR · PROYECCIÓN HOLOGRÁFICA'
            : '<i class="fas fa-skull-crossbones"></i> MESA DEL CAPITÁN · INSPECCIÓN DE PERGAMINO'));
    }
    var dlLabelEl = document.getElementById('ilm-dl-label');
    if (dlLabelEl) {
      dlLabelEl.textContent = isLegacy ? 'Guardar Recuerdo' : (isCyber ? 'Guardar Render' : (isSpace ? 'Guardar Holograma' : 'Descargar Pergamino'));
    }
    var waxEmojiEl = document.getElementById('ilm-wax-emoji');
    if (waxEmojiEl) {
      waxEmojiEl.textContent = isLegacy ? '🎓' : (isCyber ? '🤖' : (isSpace ? '🚀' : '☠️'));
    }

    var cleanTitle = title || (isLegacy ? 'Recuerdo de Honor' : (isCyber ? 'Render y Esquema Cyber' : (isSpace ? 'Holograma de Misión' : 'Pergamino de Misión')));
    if (/^ChatGPT Image/i.test(cleanTitle)) {
      cleanTitle = isLegacy ? 'Recuerdo Especial de Egresados' : (isCyber ? 'Render Secreto de Circuito' : (isSpace ? 'Transmisión Secreta de la Flota' : 'Enigma Secreto de la Tripulación'));
    }

    var titleEl = document.getElementById('ilm-title');
    if (titleEl) {
      titleEl.innerHTML = '<span class="ilm-scroll-badge">' + (isLegacy ? '🎓' : (isCyber ? '📟' : (isSpace ? '🌌' : '📜'))) + '</span> ' + cleanTitle;
    }

    var imgEl = document.getElementById('ilm-img');
    if (imgEl) {
      imgEl.src = imgUrl;
      imgEl.alt = cleanTitle;
    }

    var dlBtn = document.getElementById('ilm-dl-btn');
    if (dlBtn) {
      var resolvedId = extractDriveId(downloadUrl) || extractDriveId(imgUrl);
      var dl = resolvedId
        ? ('https://drive.usercontent.google.com/download?id=' + resolvedId + '&export=download')
        : (downloadUrl || imgUrl);
      dlBtn.href = dl;
      dlBtn.onclick = function(e) {
        return downloadDriveFileDirect(dl, cleanTitle, e);
      };
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
    var isGeminiNotebooks = (data.id === 'g6-p3') || (/gemini|notebooklm|notebooks.*ia|materiales.*estudio/i.test(data.title || '')) || (data.tags && data.tags.some(function(t){ return /notebooklm|gemini|materiales de estudio/i.test(t); }));
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
    var levelText = isObjective ? (data.level ? ('Nivel ' + data.level) : 'Misión Maker') : (data.platform === 'codeorg' ? 'Code.org' : (data.platform === 'codejr' ? 'Scratch Jr' : ((window.platformMeta && window.platformMeta(data.platform)) ? window.platformMeta(data.platform).label : 'Desafío del Grado')));
    var mainText = isObjective ? (data.objective || data.description) : (data.benefits || data.description);
    var gameUrl = isPaint ? null : ((window.getGameUrl && window.getGameUrl(data)) || data.gameUrl || data.externalUrl || null);
    var student = window.getActiveStudent ? window.getActiveStudent() : null;
    var gradeName = (student && student.gradeName) || (data.gradeName || 'Sala de 5 años');

    var categoryLabel = isObjective ? '🎯 OBJETIVO PEDAGÓGICO' : '🧠 BENEFICIOS DEL RAZONAMIENTO';
    var categoryTheme = isObjective ? 'objective' : 'benefits';
    var platText = isServoJoystick ? 'MakeCode micro:bit (Robótica & Mapeo)' : (isCanva ? 'Canva & Animación IA' : (isGeminiNotebooks ? 'Google Gemini & NotebookLM (IA de Estudio)' : (isMarcalibro ? 'Origami & Circuito (Tom Sawyer)' : (isScratchJrPerspectiva ? 'Scratch Jr (Perspectiva)' : (isScratchJrVelocidad ? 'Scratch Jr (CodeJr)' : (isDiaMadre ? 'Papertronics (Tarjeta 3D)' : (isPaintBanderas ? 'Paint (Banderas)' : (isPaintCancha ? 'Paint (Cancha)' : (isMinecraft ? 'Code.org Minecraft' : (isFrozen ? 'Frozen Code.org' : ((data.platform === 'codeorg' || isCodeorg) ? 'Code.org' : 'Juego')))))))))));

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
      } else if (isHalloween) {
        pillars = [
          { icon: 'fa-wand-magic-sparkles', color: '#D97706', title: '1. Gemini AI & Libro de los Hechizos', desc: 'Aprender ingeniería de prompts en 5 capas para transformar la foto personal en una criatura de fantasía usando nuestro manual oficial https://roboticapaulofreire-uy.github.io/libro_hechizos/.' },
          { icon: 'fa-palette', color: '#0284C7', title: '2. Foto Polaroid en Canva (Impresión)', desc: 'Composición de una postal retro tipo Polaroid con tipografías y adornos de Halloween, que el profesor entrega impresa en papel fotográfico.' },
          { icon: 'fa-film', color: '#9333EA', title: '3. Video y Animación con Flow', desc: 'Prompts dinámicos de movimiento de cámara, gestos cinemáticos y atmósfera para convertir la foto en un video animado MP4 en Google Drive.' }
        ];
        tipBoxText = '<strong>🎃 Proyecto Real de Aula:</strong> Desarrollado en 3 clases consecutivas del taller: 1) Foto a monstruo en Gemini con el Libro de los Hechizos, 2) Diseño de recuerdo Polaroid en Canva entregado impreso a cada alumno, y 3) Animación de video en Flow.';
      } else if (isGeminiNotebooks) {
        pillars = [
          { icon: 'fa-brain', color: '#4F46E5', title: 'Grounding: Anclaje Estricto en Fuentes', desc: 'Aprender cómo Gemini 1.5 Pro y NotebookLM eliminan alucinaciones al procesar exclusivamente textos escolares y apuntes con citas verificables [1].' },
          { icon: 'fa-microphone', color: '#EC4899', title: 'Podcasts Sintéticos (Audio Overview)', desc: 'Generar debates orales entre dos locutores de IA que dialogan, explican con metáforas y resumen los temas más complejos.' },
          { icon: 'fa-film', color: '#06B6D4', title: 'Guiones de Video y Diapositivas', desc: 'Crear estructuras visuales de 3 actos para videos educativos y esquemas de presentación listos para Canva aplicando la regla del 6x6.' },
          { icon: 'fa-question-circle', color: '#10B981', title: 'Autoevaluación con Active Recall y Quizzes', desc: 'Formular cuestionarios interactivos con respuestas justificadas, preguntas trampa y flashcards para consolidar la memoria a largo plazo.' }
        ];
        tipBoxText = '<strong>🧠 Google Gemini & NotebookLM para Estudiantes de 6° Grado:</strong> En este Nivel 3, los estudiantes aprenden a utilizar la IA generativa como un copiloto de estudio grounded. En lugar de buscar respuestas genéricas en internet, suben sus propios textos escolares para transformarlos en <strong>podcasts hablados</strong>, <strong>guiones de video</strong>, <strong>presentaciones en Canva</strong> y <strong>exámenes de autoevaluación</strong> verificando siempre las fuentes originales con pensamiento crítico y ética digital.';
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
      } else if (isHalloween) {
        pillars = [
          { icon: 'fa-wand-magic-sparkles', color: '#D97706', title: '1. Gemini AI & Libro de los Hechizos', desc: 'Aprender ingeniería de prompts en 5 capas para transformar la foto personal en una criatura de fantasía usando nuestro manual oficial https://roboticapaulofreire-uy.github.io/libro_hechizos/.' },
          { icon: 'fa-palette', color: '#0284C7', title: '2. Foto Polaroid en Canva (Impresión)', desc: 'Composición de una postal retro tipo Polaroid con tipografías y adornos de Halloween, que el profesor entrega impresa en papel fotográfico.' },
          { icon: 'fa-film', color: '#9333EA', title: '3. Video y Animación con Flow', desc: 'Prompts dinámicos de movimiento de cámara, gestos cinemáticos y atmósfera para convertir la foto en un video animado MP4 en Google Drive.' }
        ];
        tipBoxText = '<strong>🎃 Proyecto Real de Aula:</strong> Desarrollado en 3 clases consecutivas del taller: 1) Foto a monstruo en Gemini con el Libro de los Hechizos, 2) Diseño de recuerdo Polaroid en Canva entregado impreso a cada alumno, y 3) Animación de video en Flow.';
      } else if (isGeminiNotebooks) {
        pillars = [
          { icon: 'fa-brain', color: '#4F46E5', title: 'Pensamiento Crítico y Verificación de Fuentes', desc: 'Aprender a no confiar ciegamente en la IA, usando las citas directas [1] para auditar la información contra los libros de texto originales.' },
          { icon: 'fa-headphones', color: '#EC4899', title: 'Adaptabilidad a Múltiples Estilos de Aprendizaje', desc: 'Aprovechar formatos auditivos (podcasts), visuales (guiones y diapositivas) e interactivos (flashcards) según la preferencia de cada estudiante.' },
          { icon: 'fa-lightbulb', color: '#F59E0B', title: 'Ingeniería de Prompts y Diálogo Pedagógico', desc: 'Aprender a formular instrucciones precisas, especificar roles, restricciones de extensión y formatos de salida para obtener resultados de calidad.' },
          { icon: 'fa-shield-alt', color: '#10B981', title: 'Ética y Ciudadanía Digital en la Era de la IA', desc: 'Desarrollar una postura responsable: no plagiar, respetar la privacidad de datos personales y usar la IA para potenciar el entendimiento propio.' }
        ];
        tipBoxText = '<strong>🌟 Alfabetización en IA de Vanguardia:</strong> Generar materiales de estudio con Gemini y NotebookLM prepara a los estudiantes de 6° grado para el futuro académico, transformándolos de consumidores pasivos de tecnología en investigadores críticos capaces de crear recursos multimedia de alto impacto.';
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

    var promptQuestion = '';
    if (isScratchJrVelocidad) {
      promptQuestion = '¿Cómo podemos hacer que un personaje se desplace más rápido que otro en la pista? Probá alternar el bloque naranja de velocidad (lenta, media y rápida) y observá el tiempo que tarda cada uno en cruzar la pantalla.';
    } else if (isScratchJrPerspectiva) {
      promptQuestion = '¿Cómo logramos que un personaje parezca que viene caminando desde muy lejos en el sendero? Usá los bloques violetas de achicar en el horizonte y agrandá progresivamente su tamaño mientras avanza hacia nosotros.';
    } else if (isFrozen) {
      promptQuestion = '¿Cuántos grados debe girar Elsa para formar la esquina de un cuadrado? ¿Y cómo podemos usar el bloque Repetir para patinar 4 lados iguales sin escribir 4 veces la misma orden?';
    } else if (isMinecraft) {
      promptQuestion = '¿Qué secuencia exacta de pasos necesita Steve o Alex para talar el árbol sin caer al agua? Contá los casilleros antes de encastrar los bloques y usá Repetir cuando camine en línea recta.';
    } else if (isAngryBirds) {
      promptQuestion = 'Antes de arrastrar bloques, señalá con el dedo el camino del pájaro rojo: ¿cuántos pasos adelante debe dar y hacia dónde debe girar para alcanzar el cerdito sin chocar dinamita?';
    } else {
      promptQuestion = '¿Qué pasos ordenados debe seguir nuestro personaje para superar el reto? Identificá la meta, probá tu algoritmo y descubrí qué ocurre si cambiás alguna instrucción.';
    }

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
          '<div class="pcm-prompt-section">' +
            '<div class="pcm-ps-header">' +
              '<div class="pcm-ps-badge"><i class="fas fa-lightbulb"></i> Preguntas Disparadoras y Sugerencias Didácticas</div>' +
              '<button type="button" class="pcm-btn-copy-prompt" id="pcm-btn-copy-prompt" title="Copiar pregunta didáctica al portapapeles">' +
                '<i class="far fa-copy"></i> <span>Copiar Pregunta</span>' +
              '</button>' +
            '</div>' +
            '<p class="pcm-ps-text" id="pcm-prompt-text">"' + promptQuestion + '"</p>' +
          '</div>' +
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
              '<i class="fas fa-play"></i> <span>Ejecutar Desafío</span>' +
            '</a>' : '') +
          (isObjective && data.id ?
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

    var copyBtn = modal.querySelector('#pcm-btn-copy-prompt');
    if (copyBtn) {
      copyBtn.onclick = function(){
        if (window.sounds && window.sounds.playClick) window.sounds.playClick();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(promptQuestion).then(function(){
            copyBtn.innerHTML = '<i class="fas fa-check" style="color:#16A34A;"></i> <span>¡Copiada!</span>';
            setTimeout(function(){
              copyBtn.innerHTML = '<i class="far fa-copy"></i> <span>Copiar Pregunta</span>';
            }, 2000);
          }).catch(function(){
            copyBtn.innerHTML = '<i class="fas fa-check"></i> <span>¡Listo!</span>';
          });
        }
      };
    }

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
    var isHalloween = (mission.id === 'g5-p1' || mission.id === 'g6-p1' || mission.type === 'halloween' || /halloween/i.test(mission.title || '') || (mission.tags && mission.tags.some(function(t){ return /halloween|hechizos|libro_hechizos|monstruo|polaroid/i.test(t); })));
    var isServoJoystick = (mission.id === 'g6-p2') || (/servo.*joystick|joystick.*servo|ajuste intervalo|mapeo matem[aá]tico/i.test(mission.title || '')) || (mission.tags && mission.tags.some(function(t){ return /servo|joystick|intervalo|mapeo/i.test(t); }));
    var isCanva = !isServoJoystick && (mission.type === 'canva' || (mission.tags && mission.tags.some(function(t){ return /canva/i.test(t); })) || (/canva/i.test(mission.title || '')));
    var isClaseActivity = (mission.tipo === 'clase' || mission.type === 'clase' || (mission.badge && mission.badge.includes('Actividad de Clase')));
    var isGeminiNotebooks = !isClaseActivity && ((mission.id === 'g6-p3') || (/gemini|notebooklm|notebooks.*ia|materiales.*estudio/i.test(mission.title || '')) || (mission.tags && mission.tags.some(function(t){ return /notebooklm|gemini|materiales de estudio/i.test(t); })));
    var isGame = !isClaseActivity && !isPaint && !isCanva && !isGeminiNotebooks && (mission.type === 'game' || isCodeorg || (mission.tags && mission.tags.some(function(t){ return /juego|game/i.test(t); })));
    var activeTab = initialTab || (isHalloween ? 'pasos' : 'presentacion');
    if (isHalloween && (!initialTab || initialTab === 'presentacion' || initialTab === 'solucion')) {
      activeTab = 'pasos';
    } else if (isGame && (activeTab === 'entrega' || activeTab === 'solucion' || activeTab === 'simulador')) {
      activeTab = 'presentacion';
    } else if (activeTab === 'simulador') {
      activeTab = 'solucion';
    }
    var currentSlide = 0;
    var totalSlides = 4;
    var isMakecode = !isClaseActivity && !isGame && !isPaint && !isCanva && !isGeminiNotebooks && (isServoJoystick || !!mission.makecodeUrl || mission.type === 'makecode' || mission.platform === 'makecode' || (mission.tags && mission.tags.some(function(t){ return /makecode|micro:?bit/i.test(t); })));
    var isElectronica = !isClaseActivity && !isGame && !isPaint && !isCanva && !isGeminiNotebooks && !isMakecode && (isDiaMadre || isMarcalibro || mission.type === 'electronica' || (mission.tags && mission.tags.some(function(t){ return /electr[oó]nica|circuito|sin programaci[oó]n|papertronics/i.test(t); })) || (!mission.makecodeUrl && !mission.scratchId && mission.materials && mission.materials.some(function(m){ return /led|pila|bater[ií]a|cobre|circuito|motor/i.test((m.title||'') + ' ' + (m.description||'')); })));
    var isScratch = !isClaseActivity && !isGame && !isElectronica && !isMakecode && !isPaint && !isCanva && !isGeminiNotebooks && (mission.type === 'scratch' || mission.type === 'codejr' || mission.platform === 'codejr' || mission.platform === 'scratch' || !!mission.scratchId || !!mission.projectFileUrl || hasScratchJr(student ? student.gradeId : ''));
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
      modal.style.display = 'none';
      modal.style.visibility = 'hidden';
      modal.style.opacity = '0';
      document.removeEventListener('keydown', handleKeyDown);
      modal.innerHTML = '';
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(function(){});
      }
    }
    window.closeAdventureModal = closeAdventureModal;

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
            '<button type="button" class="apm-close-btn" id="apm-close-btn" aria-label="Cerrar modal" title="Cerrar ventana" style="background:#EF4444;color:#FFFFFF;border:2px solid #FCA5A5;width:38px;height:38px;border-radius:50%;font-size:1.1rem;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 8px rgba(239,68,68,0.4);"><i class="fas fa-times"></i></button>' +
          '</div>' +
        '</div>' +

        // Barra de pestañas
        '<div class="apm-tabs-bar' + (isHalloween ? ' apm-tabs-bar-halloween' : '') + '" style="' + (isHalloween ? 'background:#18181B;border-bottom:2px solid #EA580C;padding:8px 16px;display:flex;gap:8px;overflow-x:auto;' : '') + '">' +
          (isHalloween ?
            '<button type="button" class="apm-tab-btn ' + (activeTab === 'pasos' ? 'active' : '') + '" data-tab="pasos" style="font-weight:800;display:inline-flex;align-items:center;gap:7px;border-radius:8px;padding:8px 16px;cursor:pointer;">' +
              '<i class="fas fa-list-check" style="color:#F97316;"></i> 🎃 Pasos del Proyecto' +
            '</button>' +
            '<button type="button" class="apm-tab-btn ' + (activeTab === 'paginas' ? 'active' : '') + '" data-tab="paginas" style="font-weight:800;display:inline-flex;align-items:center;gap:7px;border-radius:8px;padding:8px 16px;cursor:pointer;">' +
              '<i class="fas fa-globe" style="color:#38BDF8;"></i> 🌐 Páginas & Herramientas' +
            '</button>' +
            '<button type="button" class="apm-tab-btn ' + (activeTab === 'libro' ? 'active' : '') + '" data-tab="libro" style="font-weight:800;display:inline-flex;align-items:center;gap:7px;border-radius:8px;padding:8px 16px;cursor:pointer;">' +
              '<i class="fas fa-book-sparkles" style="color:#A855F7;"></i> 📖 Libro de Hechizos' +
            '</button>' +
            '<button type="button" class="apm-tab-btn ' + (activeTab === 'entrega' ? 'active' : '') + '" data-tab="entrega" style="font-weight:800;display:inline-flex;align-items:center;gap:7px;border-radius:8px;padding:8px 16px;cursor:pointer;">' +
              '<i class="fas fa-cloud-upload-alt" style="color:#10B981;"></i> 📤 Mi Entrega & Drive' +
            '</button>'
          :
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
            '</button>'
          ) +
        '</div>' +

        // Paneles
        '<div class="apm-panes-container">' +
          (isHalloween ?
            // ── PESTAÑA HALLOWEEN 1: PASOS DEL PROYECTO ──
            '<div class="apm-tab-pane pane-pasos ' + (activeTab === 'pasos' ? 'active' : '') + '" style="overflow-y:auto;padding:24px;background:#0F172A;color:#F8FAFC;display:' + (activeTab === 'pasos' ? 'flex' : 'none') + ';flex-direction:column;">' +
              '<div style="background:linear-gradient(135deg, #2A0800 0%, #581C0C 40%, #3B0764 100%);border-radius:18px;padding:24px;border:1.5px solid rgba(249,115,22,0.45);margin-bottom:24px;box-shadow:0 12px 30px rgba(0,0,0,0.5);display:flex;gap:24px;align-items:center;flex-wrap:wrap;">' +
                '<div style="flex-shrink:0;text-align:center;margin:0 auto;">' +
                  '<a href="img/proyectos/halloween_ia_cover.jpg" target="_blank" rel="noopener noreferrer" title="Ver portada oficial en tamaño completo">' +
                    '<img src="img/proyectos/halloween_ia_cover.jpg" alt="Portada Oficial: Proyecto Halloween Foto a Monstruo" style="width:190px;max-width:100%;border-radius:14px;box-shadow:0 8px 24px rgba(0,0,0,0.6);border:2.5px solid #F97316;display:block;">' +
                  '</a>' +
                  '<span style="display:inline-block;margin-top:6px;font-size:0.75rem;color:#FDBA74;font-weight:700;"><i class="fas fa-search-plus"></i> Clic para ampliar</span>' +
                '</div>' +
                '<div style="flex:1;min-width:280px;">' +
                  '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap;">' +
                    '<span style="background:#EA580C;color:#FFF;padding:5px 14px;border-radius:999px;font-size:0.78rem;font-weight:900;text-transform:uppercase;letter-spacing:0.05em;box-shadow:0 2px 8px rgba(234,88,12,0.4);"><i class="fas fa-ghost"></i> Proyecto Oficial Halloween 2026</span>' +
                    '<span style="background:rgba(255,255,255,0.15);color:#FDBA74;padding:5px 12px;border-radius:999px;font-size:0.78rem;font-weight:700;"><i class="fas fa-graduation-cap"></i> 5° y 6° de Primaria</span>' +
                    '<span style="background:rgba(124,58,237,0.45);color:#DDD6FE;padding:5px 12px;border-radius:999px;font-size:0.78rem;font-weight:700;"><i class="fas fa-clock"></i> 3 Clases Consecutivas</span>' +
                  '</div>' +
                  '<h2 style="font-size:1.85rem;font-weight:900;color:#FFF;margin:0 0 10px;line-height:1.2;text-shadow:0 2px 10px rgba(0,0,0,0.5);">PROYECTO HALLOWEEN: FOTO A MONSTRUO 🎃👻🎬</h2>' +
                  '<div style="font-size:1.05rem;font-weight:700;color:#FDBA74;margin-bottom:10px;">Transformación con IA y Generación de Video</div>' +
                  '<p style="color:#FED7AA;font-size:0.92rem;margin:0;line-height:1.55;">' +
                    'Convertimos nuestra propia fotografía en una criatura fantástica mediante Inteligencia Artificial generativa a lo largo de 3 clases del taller: captura con prompt de 5 capas en Gemini, postal Polaroid en Canva para impresión física de recuerdo familiar y animación cinemática de video en Flow.' +
                  '</p>' +
                '</div>' +
              '</div>' +

              '<div style="display:flex;flex-direction:column;gap:20px;">' +

                // ETAPA 1: FOTO & GEMINI
                '<div style="background:#1E293B;border-radius:14px;border-left:5px solid #F97316;padding:22px;border-top:1px solid #334155;border-right:1px solid #334155;border-bottom:1px solid #334155;box-shadow:0 4px 14px rgba(0,0,0,0.2);">' +
                  '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:10px;">' +
                    '<div style="display:flex;align-items:center;gap:12px;">' +
                      '<span style="background:#EA580C;color:#FFF;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:1rem;">1</span>' +
                      '<div>' +
                        '<h3 style="margin:0;font-size:1.2rem;font-weight:800;color:#FFF;">Clase 1: Foto en la Computadora y Creación del Monstruo con Google Gemini</h3>' +
                        '<span style="font-size:0.8rem;color:#94A3B8;">Inteligencia Artificial Multimodal • Técnica de las 5 Capas de Hechizo</span>' +
                      '</div>' +
                    '</div>' +
                    '<div style="display:flex;gap:8px;">' +
                      '<a href="https://gemini.google.com/app" target="_blank" rel="noopener" style="background:#2563EB;color:#FFF;padding:7px 14px;border-radius:8px;font-size:0.82rem;font-weight:700;text-decoration:none;display:inline-flex;align-items:center;gap:6px;"><i class="fas fa-brain"></i> Abrir Gemini ↗</a>' +
                      '<a href="https://roboticapaulofreire-uy.github.io/libro_hechizos/" target="_blank" rel="noopener" style="background:#7C3AED;color:#FFF;padding:7px 14px;border-radius:8px;font-size:0.82rem;font-weight:700;text-decoration:none;display:inline-flex;align-items:center;gap:6px;"><i class="fas fa-book-skull"></i> Libro de Hechizos ↗</a>' +
                    '</div>' +
                  '</div>' +
                  '<p style="color:#CBD5E1;font-size:0.9rem;line-height:1.55;margin-bottom:14px;">' +
                    '<strong>1.</strong> Sentate frente a la computadora del taller y tomate una foto nítida de tu rostro con la webcam.<br>' +
                    '<strong>2.</strong> Ingresá a <strong>Google Gemini</strong>, subí la fotografía y redactá el prompt aplicando la fórmula de las <strong>5 Capas del Hechizo</strong> que vimos en clase y en el manual oficial del colegio (<a href="https://roboticapaulofreire-uy.github.io/libro_hechizos/" target="_blank" style="color:#38BDF8;">El Libro de los Hechizos de IA</a>):' +
                  '</p>' +
                  '<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:10px;margin-bottom:14px;">' +
                    '<div style="background:#0F172A;padding:12px;border-radius:8px;border:1px solid #334155;">' +
                      '<span style="color:#F97316;font-size:0.75rem;font-weight:900;text-transform:uppercase;">Capa 1: Sujeto</span>' +
                      '<p style="margin:4px 0 0;font-size:0.83rem;color:#E2E8F0;">Quién aparece y qué postura tiene (primer plano de estudiante sonriendo).</p>' +
                    '</div>' +
                    '<div style="background:#0F172A;padding:12px;border-radius:8px;border:1px solid #334155;">' +
                      '<span style="color:#C084FC;font-size:0.75rem;font-weight:900;text-transform:uppercase;">Capa 2: Transformación</span>' +
                      '<p style="margin:4px 0 0;font-size:0.83rem;color:#E2E8F0;">Criatura o rasgos: vampiro victoriano, zombi cibernético, hechicero oscuro.</p>' +
                    '</div>' +
                    '<div style="background:#0F172A;padding:12px;border-radius:8px;border:1px solid #334155;">' +
                      '<span style="color:#38BDF8;font-size:0.75rem;font-weight:900;text-transform:uppercase;">Capa 3: Entorno</span>' +
                      '<p style="margin:4px 0 0;font-size:0.83rem;color:#E2E8F0;">Castillo gótico a medianoche, niebla baja, laboratorio o calabazas ardientes.</p>' +
                    '</div>' +
                    '<div style="background:#0F172A;padding:12px;border-radius:8px;border:1px solid #334155;">' +
                      '<span style="color:#FACC15;font-size:0.75rem;font-weight:900;text-transform:uppercase;">Capa 4: Iluminación</span>' +
                      '<p style="margin:4px 0 0;font-size:0.83rem;color:#E2E8F0;">Sombras dramáticas, luz lunar plateada, neón morado y fuego naranja.</p>' +
                    '</div>' +
                    '<div style="background:#0F172A;padding:12px;border-radius:8px;border:1px solid #334155;">' +
                      '<span style="color:#34D399;font-size:0.75rem;font-weight:900;text-transform:uppercase;">Capa 5: Estilo Visual</span>' +
                      '<p style="margin:4px 0 0;font-size:0.83rem;color:#E2E8F0;">Fotografía hiperrealista 8k, claroscuro cinematográfico y alta definición.</p>' +
                    '</div>' +
                  '</div>' +
                  '<div style="background:#0F172A;padding:10px 14px;border-radius:8px;font-size:0.84rem;color:#CBD5E1;border-left:3px solid #38BDF8;">' +
                    '💡 <strong>Tip de clase:</strong> Si algún rasgo no te convence, ajustá los adjetivos de las 5 capas hasta lograr el monstruo que más te guste y descargalo en tu computadora.' +
                  '</div>' +
                '</div>' +

                // ETAPA 2: CANVA POLAROID
                '<div style="background:#1E293B;border-radius:14px;border-left:5px solid #06B6D4;padding:22px;border-top:1px solid #334155;border-right:1px solid #334155;border-bottom:1px solid #334155;box-shadow:0 4px 14px rgba(0,0,0,0.2);">' +
                  '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:10px;">' +
                    '<div style="display:flex;align-items:center;gap:12px;">' +
                      '<span style="background:#0891B2;color:#FFF;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:1rem;">2</span>' +
                      '<div>' +
                        '<h3 style="margin:0;font-size:1.2rem;font-weight:800;color:#FFF;">Clase 2: Foto Estilo Polaroid en Canva para Impresión Física</h3>' +
                        '<span style="font-size:0.8rem;color:#94A3B8;">Diseño Gráfico Editorial • Impresión Tangible para la Familia</span>' +
                      '</div>' +
                    '</div>' +
                    '<a href="https://canva.link/polaroid-freirebotuy" target="_blank" rel="noopener" style="background:#0284C7;color:#FFF;padding:7px 14px;border-radius:8px;font-size:0.82rem;font-weight:700;text-decoration:none;display:inline-flex;align-items:center;gap:6px;"><i class="fas fa-palette"></i> Abrir Plantilla en Canva ↗</a>' +
                  '</div>' +
                  '<p style="color:#CBD5E1;font-size:0.9rem;line-height:1.55;margin-bottom:14px;">' +
                    '<strong>1.</strong> En la siguiente clase abrimos la <a href="https://canva.link/polaroid-freirebotuy" target="_blank" rel="noopener" style="color:#38BDF8;font-weight:700;">Plantilla Oficial de la Foto Polaroid en Canva (https://canva.link/polaroid-freirebotuy)</a>.<br>' +
                    '<strong>2.</strong> Colocamos la foto del monstruo de Gemini en el centro del marco.<br>' +
                    '<strong>3.</strong> Escribimos en el borde inferior tu nombre, el curso ("Halloween 2026 - Taller de Robótica") y sumamos adornos temáticos de murciélagos, telas de araña y calabazas.' +
                  '</p>' +
                  '<div style="background:linear-gradient(135deg, rgba(16,185,129,0.18) 0%, rgba(6,95,70,0.3) 100%);border:2px dashed #10B981;border-radius:12px;padding:16px;display:flex;align-items:center;gap:14px;">' +
                    '<div style="font-size:2.2rem;color:#34D399;flex-shrink:0;"><i class="fas fa-print"></i></div>' +
                    '<div>' +
                      '<h4 style="margin:0 0 4px;color:#6EE7B7;font-size:1.05rem;font-weight:900;">⭐ ¡Entrega Física en Papel Fotográfico de Alta Calidad!</h4>' +
                      '<p style="margin:0;color:#D1FAE5;font-size:0.88rem;line-height:1.5;">' +
                        'Tu foto Polaroid terminada será <strong>impresa físicamente por el profesor en papel fotográfico profesional</strong> en el colegio. Cada estudiante la recibirá en mano para llevarla a su hogar y compartirla con su familia como recuerdo del taller.' +
                      '</p>' +
                    '</div>' +
                  '</div>' +
                '</div>' +

                // ETAPA 3: FLOW & DRIVE
                '<div style="background:#1E293B;border-radius:14px;border-left:5px solid #8B5CF6;padding:22px;border-top:1px solid #334155;border-right:1px solid #334155;border-bottom:1px solid #334155;box-shadow:0 4px 14px rgba(0,0,0,0.2);">' +
                  '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:10px;">' +
                    '<div style="display:flex;align-items:center;gap:12px;">' +
                      '<span style="background:#7C3AED;color:#FFF;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:1rem;">3</span>' +
                      '<div>' +
                        '<h3 style="margin:0;font-size:1.2rem;font-weight:800;color:#FFF;">Clase 3: Video Animado con Flow y Guardado en Google Drive</h3>' +
                        '<span style="font-size:0.8rem;color:#94A3B8;">Inteligencia Artificial de Video • Prompts Cinemáticos de Movimiento</span>' +
                      '</div>' +
                    '</div>' +
                    '<div style="display:flex;gap:8px;">' +
                      '<button type="button" class="apm-quick-tab-btn" data-target-tab="entrega" style="background:#10B981;color:#FFF;padding:7px 14px;border-radius:8px;font-size:0.82rem;font-weight:700;border:none;cursor:pointer;display:inline-flex;align-items:center;gap:6px;"><i class="fas fa-cloud-upload-alt"></i> Subir Entrega a Drive ↗</button>' +
                    '</div>' +
                  '</div>' +
                  '<p style="color:#CBD5E1;font-size:0.9rem;line-height:1.55;margin-bottom:14px;">' +
                    '<strong>1.</strong> Subimos la imagen del monstruo a <strong>Flow</strong>.<br>' +
                    '<strong>2.</strong> Aprendemos a redactar prompts para video: movimiento de cámara (zoom in lento, paneo sutil), gestos del personaje (ojos brillantes parpadeando, sonrisa misteriosa) y atmósfera dinámica (humo avanzando sobre el suelo).<br>' +
                    '<strong>3.</strong> Descargamos el video MP4 terminado y lo subimos a la carpeta <strong>fotos/2026/halloween</strong> de Google Drive para verlo en el muro interactivo del colegio con el logo oficial.' +
                  '</p>' +
                '</div>' +

              '</div>' +
            '</div>' +

            // ── PESTAÑA HALLOWEEN 2: PÁGINAS & HERRAMIENTAS WEB ──
            '<div class="apm-tab-pane pane-paginas ' + (activeTab === 'paginas' ? 'active' : '') + '" style="overflow-y:auto;padding:24px;background:#0F172A;color:#F8FAFC;display:' + (activeTab === 'paginas' ? 'flex' : 'none') + ';flex-direction:column;">' +
              '<div style="margin-bottom:20px;">' +
                '<h3 style="font-size:1.35rem;font-weight:800;color:#FFF;margin:0 0 6px;"><i class="fas fa-globe" style="color:#38BDF8;"></i> Páginas Web y Herramientas del Proyecto</h3>' +
                '<p style="color:#94A3B8;font-size:0.9rem;margin:0;">Hacé clic en cualquiera de las tarjetas para abrir directamente los sitios oficiales utilizados en cada etapa de Halloween.</p>' +
              '</div>' +
              '<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:16px;">' +
                // Libro de Hechizos
                '<div style="background:#1E293B;border-radius:12px;padding:20px;border:1px solid #334155;display:flex;flex-direction:column;justify-content:space-between;box-shadow:0 4px 12px rgba(0,0,0,0.3);">' +
                  '<div>' +
                    '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">' +
                      '<div style="width:44px;height:44px;border-radius:10px;background:#7C3AED;color:#FFF;display:flex;align-items:center;justify-content:center;font-size:1.3rem;"><i class="fas fa-book-skull"></i></div>' +
                      '<div>' +
                        '<h4 style="margin:0;font-size:1.05rem;color:#FFF;font-weight:800;">El Libro de los Hechizos de IA</h4>' +
                        '<span style="font-size:0.75rem;color:#C084FC;">Manual Oficial del Colegio</span>' +
                      '</div>' +
                    '</div>' +
                    '<p style="font-size:0.85rem;color:#CBD5E1;line-height:1.45;margin-bottom:16px;">Grimorio interactivo 3D con ejemplos de fórmulas mágicas, prompts de transformación y la técnica de las 5 Capas explicada paso a paso.</p>' +
                  '</div>' +
                  '<div style="display:flex;gap:8px;">' +
                    '<a href="https://roboticapaulofreire-uy.github.io/libro_hechizos/" target="_blank" rel="noopener" style="flex:1;text-align:center;background:#7C3AED;color:#FFF;padding:9px 12px;border-radius:8px;font-weight:700;font-size:0.84rem;text-decoration:none;"><i class="fas fa-external-link-alt"></i> Abrir Libro ↗</a>' +
                    '<a href="https://roboticapaulofreire-uy.github.io/libro_hechizos/libro_de_hechizos.pdf" target="_blank" rel="noopener" style="background:#334155;color:#E2E8F0;padding:9px 12px;border-radius:8px;font-weight:700;font-size:0.84rem;text-decoration:none;" title="Descargar PDF"><i class="fas fa-file-pdf"></i> PDF</a>' +
                  '</div>' +
                '</div>' +
                // Gemini
                '<div style="background:#1E293B;border-radius:12px;padding:20px;border:1px solid #334155;display:flex;flex-direction:column;justify-content:space-between;box-shadow:0 4px 12px rgba(0,0,0,0.3);">' +
                  '<div>' +
                    '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">' +
                      '<div style="width:44px;height:44px;border-radius:10px;background:#2563EB;color:#FFF;display:flex;align-items:center;justify-content:center;font-size:1.3rem;"><i class="fas fa-brain"></i></div>' +
                      '<div>' +
                        '<h4 style="margin:0;font-size:1.05rem;color:#FFF;font-weight:800;">Google Gemini AI</h4>' +
                        '<span style="font-size:0.75rem;color:#93C5FD;">Laboratorio de Inteligencia Artificial</span>' +
                      '</div>' +
                    '</div>' +
                    '<p style="font-size:0.85rem;color:#CBD5E1;line-height:1.45;margin-bottom:16px;">Motor multimodal de inteligencia artificial para subir tu foto y aplicar las 5 capas de tu prompt para generar tu monstruo en alta definición.</p>' +
                  '</div>' +
                  '<a href="https://gemini.google.com/app" target="_blank" rel="noopener" style="text-align:center;background:#2563EB;color:#FFF;padding:9px 12px;border-radius:8px;font-weight:700;font-size:0.84rem;text-decoration:none;"><i class="fas fa-external-link-alt"></i> Abrir Google Gemini ↗</a>' +
                '</div>' +
                // Canva
                '<div style="background:#1E293B;border-radius:12px;padding:20px;border:1px solid #334155;display:flex;flex-direction:column;justify-content:space-between;box-shadow:0 4px 12px rgba(0,0,0,0.3);">' +
                  '<div>' +
                    '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">' +
                      '<div style="width:44px;height:44px;border-radius:10px;background:#0284C7;color:#FFF;display:flex;align-items:center;justify-content:center;font-size:1.3rem;"><i class="fas fa-palette"></i></div>' +
                      '<div>' +
                        '<h4 style="margin:0;font-size:1.05rem;color:#FFF;font-weight:800;">Plantilla Polaroid en Canva</h4>' +
                        '<span style="font-size:0.75rem;color:#7DD3FC;">Plantilla Oficial Freirebot</span>' +
                      '</div>' +
                    '</div>' +
                    '<p style="font-size:0.85rem;color:#CBD5E1;line-height:1.45;margin-bottom:16px;">Plantilla oficial con el marco estilo Polaroid vintage para colocar tu monstruo, nombre y curso listo para la impresión física en papel fotográfico.</p>' +
                  '</div>' +
                  '<a href="https://canva.link/polaroid-freirebotuy" target="_blank" rel="noopener" style="text-align:center;background:#0284C7;color:#FFF;padding:9px 12px;border-radius:8px;font-weight:700;font-size:0.84rem;text-decoration:none;"><i class="fas fa-external-link-alt"></i> Abrir Plantilla en Canva ↗</a>' +
                '</div>' +
                // Flow
                '<div style="background:#1E293B;border-radius:12px;padding:20px;border:1px solid #334155;display:flex;flex-direction:column;justify-content:space-between;box-shadow:0 4px 12px rgba(0,0,0,0.3);">' +
                  '<div>' +
                    '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">' +
                      '<div style="width:44px;height:44px;border-radius:10px;background:#D97706;color:#FFF;display:flex;align-items:center;justify-content:center;font-size:1.3rem;"><i class="fas fa-film"></i></div>' +
                      '<div>' +
                        '<h4 style="margin:0;font-size:1.05rem;color:#FFF;font-weight:800;">Flow (Video con IA)</h4>' +
                        '<span style="font-size:0.75rem;color:#FCD34D;">Animación de Imagen a Video</span>' +
                      '</div>' +
                    '</div>' +
                    '<p style="font-size:0.85rem;color:#CBD5E1;line-height:1.45;margin-bottom:16px;">Herramienta generativa de video con IA para animar la fotografía fija en un clip con movimientos de cámara y atmósfera tenebrosa.</p>' +
                  '</div>' +
                  '<a href="https://flow.google.com" target="_blank" rel="noopener" style="text-align:center;background:#D97706;color:#FFF;padding:9px 12px;border-radius:8px;font-weight:700;font-size:0.84rem;text-decoration:none;"><i class="fas fa-external-link-alt"></i> Abrir Flow ↗</a>' +
                '</div>' +
                // Google Drive
                '<div style="background:#1E293B;border-radius:12px;padding:20px;border:1px solid #334155;display:flex;flex-direction:column;justify-content:space-between;box-shadow:0 4px 12px rgba(0,0,0,0.3);">' +
                  '<div>' +
                    '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">' +
                      '<div style="width:44px;height:44px;border-radius:10px;background:#059669;color:#FFF;display:flex;align-items:center;justify-content:center;font-size:1.3rem;"><i class="fab fa-google-drive"></i></div>' +
                      '<div>' +
                        '<h4 style="margin:0;font-size:1.05rem;color:#FFF;font-weight:800;">Google Drive Institucional</h4>' +
                        '<span style="font-size:0.75rem;color:#6EE7B7;">Carpeta fotos/2026/halloween</span>' +
                      '</div>' +
                    '</div>' +
                    '<p style="font-size:0.85rem;color:#CBD5E1;line-height:1.45;margin-bottom:16px;">Espacio de almacenamiento del colegio para guardar las fotos Polaroid y videos de Halloween para visualizarlos en el reproductor con el logo oficial.</p>' +
                  '</div>' +
                  '<button type="button" class="apm-quick-tab-btn" data-target-tab="entrega" style="text-align:center;background:#059669;color:#FFF;padding:9px 12px;border-radius:8px;font-weight:700;font-size:0.84rem;border:none;cursor:pointer;"><i class="fas fa-cloud-upload-alt"></i> Ir a Panel de Entrega & Drive ↗</button>' +
                '</div>' +
              '</div>' +
            '</div>' +

            // ── PESTAÑA HALLOWEEN 3: LIBRO DE HECHIZOS EMBEBIDO ──
            '<div class="apm-tab-pane pane-libro ' + (activeTab === 'libro' ? 'active' : '') + '" style="height:100%;flex-direction:column;background:#0F172A;display:' + (activeTab === 'libro' ? 'flex' : 'none') + ';">' +
              '<div style="background:#1E293B;padding:10px 18px;border-bottom:1px solid #334155;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">' +
                '<div style="display:flex;align-items:center;gap:8px;">' +
                  '<i class="fas fa-book-skull" style="color:#A855F7;font-size:1.2rem;"></i>' +
                  '<strong style="color:#FFF;font-size:0.95rem;">El Libro de los Hechizos de IA — Grimorio Mágico 3D</strong>' +
                '</div>' +
                '<div style="display:flex;gap:8px;">' +
                  '<a href="https://roboticapaulofreire-uy.github.io/libro_hechizos/" target="_blank" rel="noopener" style="background:#7C3AED;color:#FFF;padding:6px 14px;border-radius:6px;font-size:0.8rem;font-weight:700;text-decoration:none;display:inline-flex;align-items:center;gap:6px;"><i class="fas fa-external-link-alt"></i> Pantalla Completa ↗</a>' +
                  '<a href="https://roboticapaulofreire-uy.github.io/libro_hechizos/libro_de_hechizos.pdf" target="_blank" rel="noopener" style="background:#334155;color:#E2E8F0;padding:6px 14px;border-radius:6px;font-size:0.8rem;font-weight:700;text-decoration:none;display:inline-flex;align-items:center;gap:6px;"><i class="fas fa-file-pdf"></i> Descargar PDF</a>' +
                '</div>' +
              '</div>' +
              '<div style="flex:1;position:relative;min-height:550px;">' +
                '<iframe src="https://roboticapaulofreire-uy.github.io/libro_hechizos/" style="width:100%;height:100%;border:none;position:absolute;inset:0;" allow="camera; clipboard-write"></iframe>' +
              '</div>' +
            '</div>' +

            // ── PESTAÑA HALLOWEEN 4: MI ENTREGA & DRIVE ──
            '<div class="apm-tab-pane pane-entrega ' + (activeTab === 'entrega' ? 'active' : '') + '" style="overflow-y:auto;padding:24px;background:#0F172A;color:#F8FAFC;display:' + (activeTab === 'entrega' ? 'flex' : 'none') + ';flex-direction:column;">' +
              '<div class="apm-delivery-card" style="border:1px solid #334155;border-radius:14px;background:#1E293B;box-shadow:0 4px 16px rgba(0,0,0,0.3);overflow:hidden;margin-bottom:20px;">' +
                '<div class="apm-delivery-header" style="background:linear-gradient(135deg, #7C2D12 0%, #C2410C 50%, #7C3AED 100%);padding:18px 22px;display:flex;align-items:center;gap:14px;">' +
                  '<div class="apm-dh-icon" style="background:rgba(255,255,255,0.18);color:#FDBA74;width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.3rem;"><i class="fas fa-ghost"></i></div>' +
                  '<div>' +
                    '<h4 style="margin:0 0 4px;font-size:1.15rem;color:#FFF;font-weight:800;">Entrega de Proyecto Especial: Halloween con IA 🎃👻🎬</h4>' +
                    '<p style="margin:0;font-size:0.85rem;color:#FED7AA;">Registrá tu entrega compartiendo tu enlace de diseño o subiendo tu foto Polaroid y video de Flow a tu carpeta de Halloween en Google Drive.</p>' +
                  '</div>' +
                '</div>' +
                '<div class="apm-delivery-body" style="padding:22px;">' +
                  '<div style="margin-bottom:20px;">' +
                    '<label style="display:block;font-size:0.88rem;font-weight:700;color:#E2E8F0;margin-bottom:8px;"><i class="fas fa-link" style="color:#F97316;"></i> Enlace de tu Proyecto (Canva o Google Drive):</label>' +
                    '<div style="display:flex;gap:10px;align-items:center;">' +
                      '<input type="url" id="apm-halloween-student-url" class="apm-delivery-url-input" placeholder="https://canva.link/polaroid-freirebotuy o link a tu diseño / Drive" value="' + (savedMakecodeUrl || '') + '" style="flex:1;background:#0F172A;border:1.5px solid #334155;color:#FFF;padding:12px 16px;border-radius:10px;font-size:0.92rem;">' +
                      '<button type="button" id="apm-halloween-save-link-btn" style="background:#EA580C;color:#FFF;padding:12px 20px;border-radius:10px;font-weight:800;border:none;cursor:pointer;white-space:nowrap;font-size:0.92rem;display:inline-flex;align-items:center;gap:8px;box-shadow:0 3px 10px rgba(234,88,12,0.3);"><i class="fas fa-paper-plane"></i> Guardar Enlace (+100 XP)</button>' +
                    '</div>' +
                  '</div>' +
                  '<div style="margin-bottom:20px;">' +
                    '<label style="display:block;font-size:0.88rem;font-weight:700;color:#E2E8F0;margin-bottom:8px;"><i class="fas fa-cloud-upload-alt" style="color:#38BDF8;"></i> Subir Archivo a Drive (Foto Polaroid o Video Flow MP4):</label>' +
                    '<div id="apm-halloween-dropzone" style="border:2px dashed #475569;border-radius:14px;padding:32px 20px;text-align:center;background:#0F172A;cursor:pointer;transition:all 0.2s;">' +
                      '<input type="file" id="apm-halloween-file-input" accept="image/*,video/mp4" style="display:none;">' +
                      '<i class="fas fa-file-arrow-up" style="font-size:2.6rem;color:#F97316;margin-bottom:12px;display:block;"></i>' +
                      '<strong style="color:#FFF;font-size:1.05rem;display:block;margin-bottom:6px;">Arrastrá aquí tu archivo o hacé click para seleccionar</strong>' +
                      '<span style="font-size:0.82rem;color:#94A3B8;">Formatos permitidos: Video (.mp4, .mov) o Foto / Polaroid (.png, .jpg, .webp)</span>' +
                    '</div>' +
                  '</div>' +
                  '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;padding-top:16px;border-top:1px solid #334155;">' +
                    '<button type="button" id="apm-mark-halloween-completed-btn" style="background:linear-gradient(135deg, #10B981 0%, #059669 100%);color:#FFF;padding:14px 26px;border-radius:12px;font-weight:900;font-size:0.95rem;border:none;cursor:pointer;box-shadow:0 4px 14px rgba(16,185,129,0.35);display:inline-flex;align-items:center;gap:10px;">' +
                      '<i class="fas fa-check-circle"></i> ⭐ Marcar Misión de Halloween Completada (+100 XP)' +
                    '</button>' +
                  '</div>' +
                  '<div id="apm-halloween-delivery-status" style="margin-top:16px;">' +
                    (savedFileName || savedMakecodeUrl || isAlreadyCompleted ?
                      '<div style="padding:14px 18px;background:rgba(16,185,129,0.15);border:1px solid #10B981;border-radius:10px;display:flex;align-items:center;gap:12px;"><i class="fas fa-trophy" style="font-size:1.6rem;color:#F59E0B;"></i> <div><strong style="color:#6EE7B7;font-size:0.95rem;">¡Misión Completada ⭐ (+100 XP)!</strong><br><span style="font-size:0.84rem;color:#A7F3D0;">' + (savedFileName ? 'Archivo guardado: <strong>' + savedFileName + '</strong>' : (savedMakecodeUrl ? 'Enlace registrado: <strong>' + savedMakecodeUrl + '</strong>' : '¡Misión de Halloween validada con éxito!')) + ' (' + (savedFileDate || 'Guardado') + ') en tu Google Drive.</span></div></div>' : '') +
                  '</div>' +
                '</div>' +
              '</div>' +
            '</div>'
          :
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
                      '<img src="' + mission.coverImage + '" alt="' + mission.title + '" class="apm-sg-img" onerror="this.src=\'' + (isMakecode || isServoJoystick ? 'img/microbit.png' : 'img/scratchjr.png') + '\'">' +
                    '</div>' +
                    '<div>' +
                      '<div style="font-size:0.8rem;font-weight:800;color:' + (isGeminiNotebooks ? '#4F46E5' : (isServoJoystick ? '#0D9488' : (isCanva ? '#0284C7' : (isScratchJrPerspectiva ? '#7C3AED' : (isScratchJrVelocidad ? '#EA580C' : (isDiaMadre ? '#E11D48' : (isMinecraft ? '#059669' : (isFrozen ? '#0284C7' : (isAngryBirds ? '#E11D48' : (isPaintBanderas ? '#2563EB' : (isPaint ? '#16A34A' : (isElectronica ? '#D97706' : '#6366F1')))))))))))) + ';text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">' +
                        (isGeminiNotebooks ? '🧠 Inteligencia Artificial Generativa • Google Gemini & NotebookLM' : (isServoJoystick ? '🧤 Robótica & Matemáticas • El Arquero Mecánico MakeCode' : (isCanva ? '🤖 Inteligencia Artificial & Animación • Canva' : (isScratchJrPerspectiva ? '🐱 Scratch Jr • Escenarios & Perspectiva' : (isScratchJrVelocidad ? '🐱 Scratch Jr • Escenarios & Velocidades' : (isDiaMadre ? '💖 Tarjeta Pop-Up 3D • Papertronics & Circuito' : (isMinecraft ? '⛏️ Código en Bloques • Code.org Minecraft (Adaptación Educativa)' : (isFrozen ? '❄️ Geometría & Programación • Code.org Frozen' : (isAngryBirds ? '🎮 Programación con Bloques • Code.org' : (isPaintBanderas ? '🎨 Arte Digital & Banderas • Paint' : (isPaint ? '🎨 Arte Digital & Figuras • Paint' : (isElectronica ? '⚡ Circuito Electrónico • Sin Programación' : 'Desafío Maker • Nivel ' + mission.level)))))))))))) +
                      '</div>' +
                      '<h2 style="font-size:1.6rem;font-weight:900;color:#1E293B;margin:0 0 10px;line-height:1.2;">' + mission.title + '</h2>' +
                      '<div class="apm-reto-card" style="' + (isGeminiNotebooks ? 'border-left:4px solid #4F46E5;background:#EEF2FF;' : (isServoJoystick ? 'border-left:4px solid #0D9488;background:#F0FDFA;' : (isCanva ? 'border-left:4px solid #0284C7;background:#F0F9FF;' : (isScratchJrPerspectiva ? 'border-left:4px solid #7C3AED;background:#FAF5FF;' : (isScratchJrVelocidad ? 'border-left:4px solid #EA580C;background:#FFF7ED;' : (isDiaMadre ? 'border-left:4px solid #E11D48;background:#FFF1F2;' : (isMinecraft ? 'border-left:4px solid #059669;background:#ECFDF5;' : (isFrozen ? 'border-left:4px solid #0284C7;background:#F0F9FF;' : (isAngryBirds ? 'border-left:4px solid #E11D48;background:#FFF1F2;' : (isPaintBanderas ? 'border-left:4px solid #2563EB;background:#EFF6FF;' : (isPaint ? 'border-left:4px solid #16A34A;background:#F0FDF4;' : ''))))))))))) + '">' +
                        '<h4 style="' + (isGeminiNotebooks ? 'color:#3730A3;' : (isServoJoystick ? 'color:#0F766E;' : (isCanva ? 'color:#0369A1;' : (isScratchJrPerspectiva ? 'color:#581C87;' : (isScratchJrVelocidad ? 'color:#9A3412;' : (isDiaMadre ? 'color:#9F1239;' : (isMinecraft ? 'color:#065F46;' : (isFrozen ? 'color:#0369A1;' : (isAngryBirds ? 'color:#9F1239;' : (isPaintBanderas ? 'color:#1E40AF;' : (isPaint ? 'color:#15803D;' : ''))))))))))) + '"><i class="fas ' + (isGeminiNotebooks ? 'fa-brain' : (isServoJoystick ? 'fa-gamepad' : (isCanva ? 'fa-wand-magic-sparkles' : (isScratchJrPerspectiva ? 'fa-search-plus' : (isScratchJrVelocidad ? 'fa-tachometer-alt' : (isDiaMadre ? 'fa-heart' : (isMinecraft ? 'fa-cube' : (isFrozen ? 'fa-snowflake' : (isAngryBirds ? 'fa-bullseye' : (isPaintBanderas ? 'fa-flag' : (isPaint ? 'fa-futbol' : 'fa-flag-checkered'))))))))))) + '"></i> ' + (isGeminiNotebooks ? 'Reto IA: Generación de Materiales de Estudio con Grounding en Fuentes Confiables' : (isServoJoystick ? 'Reto Robótico: El Arquero Mecánico con Joystick Chico Negro y Servo SG90' : (isCanva ? 'Objetivo: Foto en Aula, Reemplazar Cabeza en Arquero y Animación con IA' : (isScratchJrPerspectiva ? 'Objetivo: Perspectiva 3D y Bloques Violetas' : (isScratchJrVelocidad ? 'Objetivo: Entorno Scratch Jr y Control de Velocidades' : (isDiaMadre ? 'Reto Maker: Corazón 3D y Luz en el Escudo' : (isMinecraft ? 'Reto y Aclaración de Minecraft:' : (isFrozen ? 'Objetivo y Conexión con Paint:' : (isAngryBirds ? 'Objetivo Pedagógico:' : (isPaintBanderas ? 'Reto Artístico: Banderas del Mundial' : '¿Cuál es nuestra misión?')))))))))) + '</h4>' +
                        '<p style="' + (isGeminiNotebooks ? 'color:#1E1B4B;' : (isServoJoystick ? 'color:#134E4A;' : (isCanva ? 'color:#0C4A6E;' : (isScratchJrPerspectiva ? 'color:#6B21A8;' : (isScratchJrVelocidad ? 'color:#7C2D12;' : (isDiaMadre ? 'color:#4C0519;' : (isMinecraft ? 'color:#064E3B;' : (isFrozen ? 'color:#0C4A6E;' : (isAngryBirds ? 'color:#4C0519;' : (isPaintBanderas ? 'color:#1E3A8A;' : (isPaint ? 'color:#14532D;' : ''))))))))))) + '">' + (mission.objective || mission.description) + '</p>' +
                        (isMinecraft ? '<div style="margin-top:10px;padding:8px 12px;background:#FEF3C7;border-left:3px solid #D97706;border-radius:6px;font-size:0.8rem;color:#92400E;line-height:1.4;"><strong><i class="fas fa-exclamation-triangle"></i> ¡Aclaración Importante!</strong> No es el Minecraft comercial tradicional de juego libre: es una adaptación pedagógica oficial de Code.org para aprender a programar con bloques.</div>' : '') +
                      '</div>' +
                      '<div class="apm-skills-pills">' +
                        (isGeminiNotebooks ?
                          '<span class="apm-skill-pill" style="background:#EEF2FF;color:#4338CA;"><i class="fas fa-brain"></i> Grounding (Cero Alucinaciones)</span>' +
                          '<span class="apm-skill-pill" style="background:#FDF2F8;color:#BE185D;"><i class="fas fa-microphone"></i> Podcast (Audio Overview)</span>' +
                          '<span class="apm-skill-pill" style="background:#ECFEFF;color:#0E7490;"><i class="fas fa-video"></i> Guiones de Video</span>' +
                          '<span class="apm-skill-pill" style="background:#FEF3C7;color:#B45309;"><i class="fas fa-tv"></i> Diapositivas para Canva</span>' +
                          '<span class="apm-skill-pill" style="background:#ECFDF5;color:#047857;"><i class="fas fa-question-circle"></i> Quizzes & Flashcards</span>' +
                          '<span class="apm-skill-pill" style="background:#F1F5F9;color:#334155;"><i class="fas fa-file-pdf"></i> Guía PDF Unificada</span>' :
                         isServoJoystick ?
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
                         isClaseActivity ?
                          '<span class="apm-skill-pill" style="background:#DCFCE7;color:#15803D;"><i class="fas fa-chalkboard-teacher"></i> Actividad en el Aula</span>' +
                          '<span class="apm-skill-pill" style="background:#DCFCE7;color:#15803D;"><i class="fas fa-users"></i> Trabajo Colaborativo</span>' +
                          '<span class="apm-skill-pill" style="background:#DCFCE7;color:#15803D;"><i class="fas fa-lightbulb"></i> Creatividad Maker</span>' +
                          '<span class="apm-skill-pill" style="background:#DCFCE7;color:#15803D;"><i class="fas fa-robot"></i> Pensamiento Computacional</span>' :
                         isElectronica ?
                          '<span class="apm-skill-pill"><i class="fas fa-bolt"></i> Circuito Físico</span>' +
                          '<span class="apm-skill-pill"><i class="fas fa-battery-full"></i> Polaridad y Energía</span>' +
                          '<span class="apm-skill-pill"><i class="fas fa-tools"></i> Sin Programación</span>' :
                          '<span class="apm-skill-pill"><i class="fas fa-lightbulb"></i> Creatividad Maker</span>' +
                          '<span class="apm-skill-pill"><i class="fas fa-cubes"></i> Lógica en Bloques</span>' +
                          '<span class="apm-skill-pill"><i class="fas fa-robot"></i> Pensamiento Computacional</span>'
                        ) +
                      '</div>' +
                      '<button type="button" class="arm-btn-primary apm-next-btn-internal" style="margin-top:18px;font-size:0.9rem;padding:9px 18px;' + (isGeminiNotebooks ? 'background:#4F46E5;border-color:#4338CA;' : (isServoJoystick ? 'background:#0D9488;border-color:#0F766E;' : (isCanva ? 'background:#0284C7;border-color:#0369A1;' : (isScratchJrPerspectiva ? 'background:#7C3AED;border-color:#6D28D9;' : (isScratchJrVelocidad ? 'background:#EA580C;border-color:#C2410C;' : (isDiaMadre ? 'background:#E11D48;border-color:#BE123C;' : (isMinecraft ? 'background:#059669;border-color:#047857;' : (isFrozen ? 'background:#0284C7;border-color:#0369A1;' : (isAngryBirds ? 'background:#E11D48;border-color:#BE123C;' : (isPaintBanderas ? 'background:#2563EB;border-color:#1D4ED8;' : (isPaint ? 'background:#16A34A;border-color:#15803D;' : (isElectronica ? 'background:#D97706;border-color:#B45309;' : '')))))))))))) + '">' +
                        (isGeminiNotebooks ? 'Ver Fuentes y Herramientas de NotebookLM <i class="fas fa-arrow-right"></i>' : (isServoJoystick ? 'Ver Componentes y Ajuste Matemático <i class="fas fa-arrow-right"></i>' : (isCanva ? 'Ver Recursos y Herramientas de Canva <i class="fas fa-arrow-right"></i>' : (isScratchJrPerspectiva ? 'Ver Materiales y Bloques Violetas <i class="fas fa-arrow-right"></i>' : (isScratchJrVelocidad ? 'Ver Herramientas y Bloques <i class="fas fa-arrow-right"></i>' : (isDiaMadre ? 'Ver Materiales y Componentes <i class="fas fa-arrow-right"></i>' : (isMinecraft ? 'Ver Beneficios y ¿Por qué Code.org Minecraft? <i class="fas fa-arrow-right"></i>' : (isFrozen ? 'Ver Beneficios y Conexión con Paint <i class="fas fa-arrow-right"></i>' : (isAngryBirds ? 'Ver Beneficios del Razonamiento <i class="fas fa-arrow-right"></i>' : (isPaintBanderas ? 'Ver Herramientas de Paint para Banderas <i class="fas fa-arrow-right"></i>' : (isPaint ? 'Ver Herramientas de Paint <i class="fas fa-arrow-right"></i>' : 'Ver Materiales y Componentes <i class="fas fa-arrow-right"></i>'))))))))))) +
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
                          (isGeminiNotebooks ? '🧠 Materiales y Fuentes: Google NotebookLM & Gemini 1.5 Pro' : (isServoJoystick ? '🕹️ Componentes y Fórmula de Mapeo: Arquero Mecánico, Joystick y Servo' : (isCanva ? '🤖 Materiales y Herramientas: Canva & Inteligencia Artificial' : (isMarcalibro ? '📖 Materiales para el Marca-Libros Origami de Tom Sawyer' : (isScratchJrPerspectiva ? '🐱 Materiales y Bloques de Perspectiva (Scratch Jr)' : (isScratchJrVelocidad ? '🐱 Materiales y Bloques de Scratch Jr' : (isDiaMadre ? '💖 Materiales y Plantillas para la Tarjeta 3D Pop-Up' : (isPaint ? (isPaintBanderas ? '🎨 Herramientas de Paint para Dibujar Banderas' : '🎨 Herramientas y Figuras de Paint') : (isElectronica ? '⚡ Componentes y Materiales del Circuito' : '🔌 Materiales y Herramientas del Taller'))))))))) +
                        '</h3>' +
                        '<p style="font-size:0.88rem;color:#64748B;margin:0;">' +
                          (isGeminiNotebooks ? 'Asegurate de tener abierta la plataforma NotebookLM en notebooklm.google.com y tus fuentes de estudio listas en PDF o apuntes:' : (isServoJoystick ? 'Asegurate de tener tu micro:bit v2, el joystick chico negro conectado a P1 y el servo SG90 con el arquero en P0:' : (isCanva ? 'Asegurate de tener abierta la plataforma Canva en tu tablet o PC y tener lista la cámara o foto del taller:' : (isMarcalibro ? 'Asegurate de tener tu papel glacé, el dibujo de Tom Sawyer con su sombrero, cinta de cobre, pila botón y LED chato:' : (isScratchJrPerspectiva ? 'Asegurate de tener abierta la aplicación Scratch Jr o descargá el archivo perpestiva.sjr de ejemplo:' : (isScratchJrVelocidad ? 'Asegurate de tener abierta la aplicación Scratch Jr o descargá el archivo velocidad.sjr de ejemplo:' : (isDiaMadre ? 'Asegurate de tener tu lámina con el corazón, tijera, foto de tu peque y los componentes electrónicos:' : (isPaint ? (isPaintBanderas ? 'Asegurate de tener abierta la aplicación Paint en tu computadora o tablet para comenzar a crear las banderas del mundial:' : 'Asegurate de tener abierta la aplicación Paint en tu computadora o tablet para comenzar:') : (isElectronica ? 'Asegurate de tener todos los elementos listos sobre tu mesa antes de armar:' : 'Asegurate de tener todo listo antes de comenzar a programar o armar:'))))))))) +
                        '</p>' +
                      '</div>' +
                      '<div class="apm-materials-grid">' +
                        materialsList.map(function(m){
                          var mIcon = isGeminiNotebooks ? (
                            /notebooklm|gemini|cerebro|ia/i.test(m.title) ? 'fa-brain' :
                            /pdf|fuente|libro|apunte/i.test(m.title) ? 'fa-file-pdf' :
                            /audio|podcast|overview|mic/i.test(m.title) ? 'fa-microphone' :
                            /canva|slide|presentaci/i.test(m.title) ? 'fa-tv' :
                            /gu[ií]a|pdf|documento/i.test(m.title) ? 'fa-file-alt' :
                            /quiz|flashcard|faq|pregunta/i.test(m.title) ? 'fa-question-circle' : 'fa-lightbulb'
                          ) : isServoJoystick ? (
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
                      '<div class="apm-reto-card" style="margin-top:22px;' + (isGeminiNotebooks ? 'background:#EEF2FF;border-color:#C7D2FE;' : (isServoJoystick ? 'background:#F0FDFA;border-color:#99F6E4;' : (isCanva ? 'background:#F0F9FF;border-color:#BAE6FD;' : (isMarcalibro ? 'background:#FFFBEB;border-color:#FCD34D;' : (isScratchJrPerspectiva ? 'background:#FAF5FF;border-color:#D8B4FE;' : (isScratchJrVelocidad ? 'background:#FFF7ED;border-color:#FDBA74;' : (isDiaMadre ? 'background:#FFF1F2;border-color:#FDA4AF;' : (isPaintBanderas ? 'background:#EFF6FF;border-color:#2563EB;' : (isPaint ? 'background:#F0FDF4;border-color:#16A34A;' : ''))))))))) + '">' +
                        '<h4 style="' + (isGeminiNotebooks ? 'color:#3730A3;' : (isServoJoystick ? 'color:#0F766E;' : (isCanva ? 'color:#0369A1;' : (isMarcalibro ? 'color:#92400E;' : (isScratchJrPerspectiva ? 'color:#581C87;' : (isScratchJrVelocidad ? 'color:#9A3412;' : (isDiaMadre ? 'color:#9F1239;' : (isPaintBanderas ? 'color:#1E40AF;' : (isPaint ? 'color:#15803D;' : (isElectronica ? 'color:#B45309;' : '')))))))))) + '"><i class="fas fa-lightbulb"></i> ' + (isGeminiNotebooks ? 'Consejo de Estudio con IA: El Secreto del Grounding (Cero Alucinaciones)' : (isServoJoystick ? 'Consejo de Robótica: El Secreto del Ajuste de Intervalo (Mapeo)' : (isCanva ? 'Consejo de Edición e Inteligencia Artificial' : (isMarcalibro ? 'Consejo Origami Maker: Bolsillo Esquinero y Luz en el Sombrero' : (isScratchJrPerspectiva ? 'Consejo del Programador: Bloques Violetas de Perspectiva' : (isScratchJrVelocidad ? 'Consejo del Programador: Bloque de Velocidad' : (isDiaMadre ? 'Consejo Maker: Pop-Up 3D y Escudo Freire' : (isPaint ? (isPaintBanderas ? 'Consejo del Diseñador de Banderas' : 'Consejo del Artista Digital') : (isElectronica ? 'Consejo de Polaridad' : 'Consejo del Profesor Maker'))))))))) + '</h4>' +
                        '<p style="' + (isGeminiNotebooks ? 'color:#1E1B4B;' : (isServoJoystick ? 'color:#134E4A;' : (isMarcalibro ? 'color:#78350F;' : (isScratchJrPerspectiva ? 'color:#6B21A8;' : (isScratchJrVelocidad ? 'color:#7C2D12;' : (isDiaMadre ? 'color:#4C0519;' : (isPaintBanderas ? 'color:#1E3A8A;' : (isPaint ? 'color:#166534;' : '')))))))) + '">' +
                          (isGeminiNotebooks ? '¡El secreto del estudio con IA anclada! A diferencia de los chatbots convencionales que inventan datos o fechas falsas cuando dudan (alucinaciones), NotebookLM funciona con <strong>Grounding estricto</strong>: responde únicamente en base a los documentos escolares, libros y apuntes que tú le subas. Además, cada afirmación incluye números de cita clicables [1], [2] que te llevan de inmediato a la página y párrafo original. ¡Podés auditar y comprobar la verdad de cada concepto!' :
                           isServoJoystick ? '¡El secreto del ajuste de intervalo para el arquero! La palanca del joystick chico negro entrega números continuos entre 0 y 1023 en el Pin P1. El servomotor SG90 en el Pin P0 solo puede rotar entre 0° y 180° para mover al arquero entre los postes. Con el bloque matemático <strong>Math.map(x, 0, 1023, 0, 180)</strong> y los límites de seguridad (si angulo < 0 ➔ 0; si angulo > 180 ➔ 180), logramos que al soltar la palanca el arquero quede al centro (90°), y al inclinarla vuele a los postes sin chocar ni trabarse.' :
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
                        '<button type="button" class="arm-btn-primary apm-next-btn-internal" style="font-size:0.9rem;padding:9px 18px;' + (isGeminiNotebooks ? 'background:#4F46E5;border-color:#4338CA;' : (isServoJoystick ? 'background:#0D9488;border-color:#0F766E;' : (isMarcalibro ? 'background:#D97706;border-color:#B45309;' : (isScratchJrPerspectiva ? 'background:#7C3AED;border-color:#6D28D9;' : (isScratchJrVelocidad ? 'background:#EA580C;border-color:#C2410C;' : (isDiaMadre ? 'background:#E11D48;border-color:#BE123C;' : (isPaintBanderas ? 'background:#2563EB;border-color:#1D4ED8;' : (isPaint ? 'background:#16A34A;border-color:#15803D;' : (isElectronica ? 'background:#D97706;border-color:#B45309;' : ''))))))))) + '">' +
                          (isGeminiNotebooks ? '¡Explorar Opciones de Generación y Guía PDF! <i class="fas fa-arrow-right"></i>' : (isServoJoystick ? '¡Ver Circuito, Código MakeCode y Simulador! <i class="fas fa-arrow-right"></i>' : (isCanva ? '¡Ver Pasos de Creación y Animación con IA! <i class="fas fa-arrow-right"></i>' : (isMarcalibro ? '¡Ver Pasos de Doblado Origami y Circuito! <i class="fas fa-arrow-right"></i>' : (isScratchJrPerspectiva ? '¡Ver Pasos de Programación y Ejemplo perpestiva.sjr! <i class="fas fa-arrow-right"></i>' : (isScratchJrVelocidad ? '¡Ver Pasos de Programación y Ejemplo velocidad.sjr! <i class="fas fa-arrow-right"></i>' : (isDiaMadre ? '¡Ver Pasos de Armado Pop-Up y Circuito! <i class="fas fa-arrow-right"></i>' : (isPaint ? (isPaintBanderas ? '¡Ver Pasos para Dibujar las Banderas! <i class="fas fa-arrow-right"></i>' : '¡Ver Pasos para Dibujar la Cancha! <i class="fas fa-arrow-right"></i>') : (isElectronica ? '¡Ver Instrucciones de Armado Paso a Paso! <i class="fas fa-arrow-right"></i>' : '¡Pasar al Código y Simulador! <i class="fas fa-arrow-right"></i>'))))))))) +
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
                   isGeminiNotebooks ?
                    '<div style="height:100%;display:flex;flex-direction:column;gap:12px;overflow-y:auto;padding-right:6px;">' +
                      // Header
                      '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">' +
                        '<div>' +
                          '<h3 style="font-size:1.22rem;font-weight:900;color:#1E293B;margin:0 0 2px;"><i class="fas fa-brain" style="color:#4F46E5;"></i> Nivel 3: Materiales de Estudio con IA (Gemini & NotebookLM) 🧠🎙️📽️📊</h3>' +
                          '<p style="font-size:0.82rem;color:#64748B;margin:0;">Grounding en fuentes escolares • Cero alucinaciones • Podcasts, Guiones de Video, Slides para Canva y Quizzes FAQ</p>' +
                        '</div>' +
                        '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
                          '<a href="https://notebooklm.google.com" target="_blank" rel="noopener noreferrer" class="arm-btn-primary" style="background:#4F46E5;border-color:#4338CA;font-size:0.84rem;padding:7px 16px;text-decoration:none;">' +
                            '<i class="fas fa-external-link-alt"></i> Abrir NotebookLM' +
                          '</a>' +
                          '<a href="docs/guia_ia_gemini_notebooks.pdf" target="_blank" download="guia_ia_gemini_notebooks.pdf" class="arm-btn-secondary" style="font-size:0.84rem;padding:7px 14px;text-decoration:none;">' +
                            '<i class="fas fa-file-pdf" style="color:#DC2626;"></i> Descargar Guía PDF' +
                          '</a>' +
                        '</div>' +
                      '</div>' +

                      // Banner with cover preview
                      '<div style="display:flex;gap:14px;align-items:center;background:linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%);border:1.5px solid #818CF8;border-radius:12px;padding:12px 16px;">' +
                        '<img src="img/proyectos/gemini_notebooks_cover.svg" alt="Gemini NotebookLM" style="width:115px;height:78px;object-fit:cover;background:#0F172A;border-radius:10px;border:1px solid #A5B4FC;padding:2px;cursor:pointer;flex-shrink:0;" onclick="window.open(this.src,\'_blank\')" title="Tocar para ampliar esquema">' +
                        '<div style="flex:1;">' +
                          '<h5 style="margin:0 0 3px;font-size:0.88rem;color:#312E81;font-weight:900;"><i class="fas fa-sparkles" style="color:#6366F1;"></i> Explorador de Formatos Multimodales Grounded</h5>' +
                          '<p style="margin:0;font-size:0.80rem;color:#3730A3;line-height:1.45;">' +
                            'NotebookLM lee tus fuentes escolares (PDFs, libros, apuntes) y utiliza <strong>Gemini 1.5 Pro</strong> para crear materiales adaptados a tu forma de aprender. Tocá cada pestaña para ver la explicación, la utilidad pedagógica, una simulación en vivo y el prompt recomendado. <em>¡Al final, descargá la Guía PDF completa que reúne todos los temas!</em>' +
                          '</p>' +
                        '</div>' +
                      '</div>' +

                      // Selector tabs
                      '<div class="gie-tab-buttons-bar" style="display:flex;gap:6px;overflow-x:auto;padding:4px 2px;margin:2px 0;">' +
                        '<button type="button" class="gie-tab-btn active" data-target="podcast" style="padding:7px 13px;border-radius:8px;font-size:0.79rem;font-weight:800;border:1px solid #F472B6;background:#FDF2F8;color:#BE185D;cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:6px;"><i class="fas fa-microphone"></i> 🎙️ Podcasts (Audio Overview)</button>' +
                        '<button type="button" class="gie-tab-btn" data-target="video" style="padding:7px 13px;border-radius:8px;font-size:0.79rem;font-weight:800;border:1px solid #22D3EE;background:#ECFEFF;color:#0E7490;cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:6px;"><i class="fas fa-video"></i> 📽️ Guiones de Video</button>' +
                        '<button type="button" class="gie-tab-btn" data-target="slides" style="padding:7px 13px;border-radius:8px;font-size:0.79rem;font-weight:800;border:1px solid #FBBF24;background:#FEF3C7;color:#92400E;cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:6px;"><i class="fas fa-tv"></i> 📊 Diapositivas (Canva)</button>' +
                        '<button type="button" class="gie-tab-btn" data-target="guia" style="padding:7px 13px;border-radius:8px;font-size:0.79rem;font-weight:800;border:1px solid #A78BFA;background:#F5F3FF;color:#5B21B6;cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:6px;"><i class="fas fa-file-alt"></i> 📝 Guía & Glosario</button>' +
                        '<button type="button" class="gie-tab-btn" data-target="quizzes" style="padding:7px 13px;border-radius:8px;font-size:0.79rem;font-weight:800;border:1px solid #34D399;background:#ECFDF5;color:#065F46;cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:6px;"><i class="fas fa-question-circle"></i> ❓ Quizzes & Flashcards</button>' +
                        '<button type="button" class="gie-tab-btn" data-target="timeline" style="padding:7px 13px;border-radius:8px;font-size:0.79rem;font-weight:800;border:1px solid #60A5FA;background:#EFF6FF;color:#1E40AF;cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:6px;"><i class="fas fa-stream"></i> 🗺️ Línea de Tiempo</button>' +
                      '</div>' +

                      // Explorer panes wrapper
                      '<div class="gie-panes-wrapper" style="background:#FFF;border-radius:12px;border:1.5px solid #E2E8F0;padding:16px;box-shadow:0 2px 10px rgba(0,0,0,0.03);">' +

                        // 1. PANE PODCAST
                        '<div class="gie-pane gie-pane-podcast active" style="display:block;">' +
                          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:6px;">' +
                            '<span style="background:#FCE7F3;color:#BE185D;font-size:0.75rem;font-weight:900;padding:3px 10px;border-radius:6px;text-transform:uppercase;letter-spacing:0.04em;"><i class="fas fa-headphones"></i> Aprendizaje Auditivo • Generación Deep Dive</span>' +
                            '<span style="font-size:0.78rem;color:#64748B;">Duración habitual: 8 a 15 min • Formato WAV/MP3</span>' +
                          '</div>' +
                          '<p style="font-size:0.84rem;color:#1E293B;line-height:1.5;margin:0 0 12px;">' +
                            '<strong>¿Cómo funciona?</strong> Dos presentadores de IA debaten de forma completamente realista los temas presentes en tus documentos. Hacen chistes sutiles, discuten puntos de vista, utilizan analogías cotidianas (fútbol, montañas rusas, cocina) y aclaran dudas sin inventar nada que no esté en tus fuentes [1]. Podés descargarlo al celular para escuchar camino a la escuela o mientras hacés ejercicio.' +
                          '</p>' +
                          // Audio Simulator Box
                          '<div class="gie-audio-sim-box" style="background:#0F172A;border-radius:12px;padding:14px 18px;color:#FFF;margin-bottom:12px;">' +
                            '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">' +
                              '<div style="display:flex;align-items:center;gap:10px;">' +
                                '<button type="button" class="gie-audio-play-toggle" style="background:#EC4899;color:#FFF;border:none;width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:1rem;box-shadow:0 0 12px rgba(236,72,153,0.5);"><i class="fas fa-play"></i></button>' +
                                '<div>' +
                                  '<div style="font-size:0.86rem;font-weight:800;color:#FCE7F3;">Deep Dive: Robótica Espacial & Energía Cinética</div>' +
                                  '<div style="font-size:0.72rem;color:#94A3B8;">Locutores: Leo & Sofía (IA Gemini 1.5 Pro)</div>' +
                                '</div>' +
                              '</div>' +
                              '<span style="font-size:0.75rem;font-family:monospace;color:#38BDF8;">04:18 / 11:45</span>' +
                            '</div>' +
                            // Audio Wave simulation
                            '<div class="gie-audio-wave-wrap" style="display:flex;align-items:center;gap:3px;height:24px;background:#1E293B;padding:4px 10px;border-radius:6px;margin-bottom:10px;">' +
                              '<span style="flex:1;height:8px;background:#38BDF8;border-radius:2px;"></span>' +
                              '<span style="flex:1;height:16px;background:#818CF8;border-radius:2px;"></span>' +
                              '<span style="flex:1;height:22px;background:#EC4899;border-radius:2px;"></span>' +
                              '<span style="flex:1;height:12px;background:#F43F5E;border-radius:2px;"></span>' +
                              '<span style="flex:1;height:18px;background:#818CF8;border-radius:2px;"></span>' +
                              '<span style="flex:1;height:6px;background:#38BDF8;border-radius:2px;"></span>' +
                              '<span style="flex:1;height:14px;background:#EC4899;border-radius:2px;"></span>' +
                              '<span style="flex:1;height:20px;background:#818CF8;border-radius:2px;"></span>' +
                              '<span style="flex:1;height:10px;background:#38BDF8;border-radius:2px;"></span>' +
                              '<span style="flex:1;height:16px;background:#EC4899;border-radius:2px;"></span>' +
                              '<span style="flex:1;height:8px;background:#38BDF8;border-radius:2px;"></span>' +
                            '</div>' +
                            '<div style="font-size:0.78rem;background:rgba(255,255,255,0.06);padding:8px 12px;border-radius:6px;line-height:1.45;color:#E2E8F0;">' +
                              '💬 <strong>Sofía:</strong> <em>"¡Exacto Leo! Y como dice en la página 14 del manual escolar [1], el servomotor del arquero necesita el bloque Math.map para transformar la señal continua del joystick chico negro en un ángulo de atajada exacto de poste a poste..."</em>' +
                            '</div>' +
                          '</div>' +
                          // Prompt Box
                          '<div class="gie-prompt-box" style="background:#F8FAFC;border:1px solid #CBD5E1;border-radius:8px;padding:10px 14px;">' +
                            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">' +
                              '<span style="font-size:0.75rem;font-weight:800;color:#475569;"><i class="fas fa-terminal"></i> Botón en NotebookLM:</span>' +
                              '<button type="button" class="btn-copy-gie-prompt" data-prompt="Audio Overview -> Haz clic en Generate en el panel derecho Notebook Guide" style="background:#EEF2FF;color:#4F46E5;border:1px solid #C7D2FE;border-radius:6px;padding:3px 8px;font-size:0.72rem;cursor:pointer;"><i class="far fa-copy"></i> Copiar Guía</button>' +
                            '</div>' +
                            '<code style="font-size:0.78rem;color:#1E1B4B;display:block;">En NotebookLM &gt; Panel derecho "Notebook Guide" &gt; Clic en "Generate" dentro de Audio Overview.</code>' +
                          '</div>' +
                        '</div>' +

                        // 2. PANE VIDEO
                        '<div class="gie-pane gie-pane-video" style="display:none;">' +
                          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:gap:6px;">' +
                            '<span style="background:#CFFAFE;color:#0891B2;font-size:0.75rem;font-weight:900;padding:3px 10px;border-radius:6px;text-transform:uppercase;letter-spacing:0.04em;"><i class="fas fa-film"></i> Aprendizaje Audiovisual • Guión Cinematográfico</span>' +
                            '<span style="font-size:0.78rem;color:#64748B;">Para YouTube Shorts, TikTok o Reels educativos</span>' +
                          '</div>' +
                          '<p style="font-size:0.84rem;color:#1E293B;line-height:1.5;margin:0 0 12px;">' +
                            '<strong>¿Cómo funciona?</strong> La IA extrae la esencia de tus lecturas y la traduce en un guión con estructura en 3 actos: Gancho (primeros 5 segundos que atrapan la atención), Desarrollo (analogía sencilla que explica la teoría) y Cierre (conclusión y llamado a la acción). Especifica planos de cámara, efectos de sonido y textos sobreimpresos.' +
                          '</p>' +
                          // Storyboard visual 3 cards
                          '<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:10px;margin-bottom:12px;">' +
                            '<div style="background:#F0FDFA;border:1px solid #99F6E4;border-radius:8px;padding:10px;">' +
                              '<div style="font-size:0.75rem;font-weight:800;color:#0D9488;margin-bottom:4px;">🎬 ACTO 1: EL GANCHO (0-15s)</div>' +
                              '<div style="font-size:0.76rem;color:#134E4A;line-height:1.4;"><strong>Visual:</strong> Plano medio rápido sosteniendo el arquero con servo.<br><strong>Voz:</strong> "¿Sabías que un robot puede atajar penales usando matemáticas simples?"<br><strong>Texto:</strong> "¡Matemáticas que atajan penales!"</div>' +
                            '</div>' +
                            '<div style="background:#F0F9FF;border:1px solid #BAE6FD;border-radius:8px;padding:10px;">' +
                              '<div style="font-size:0.75rem;font-weight:800;color:#0284C7;margin-bottom:4px;">🎬 ACTO 2: EL SECRETO (15-90s)</div>' +
                              '<div style="font-size:0.76rem;color:#0C4A6E;line-height:1.4;"><strong>Visual:</strong> Zoom a la palanca del joystick chico negro y pantalla MakeCode.<br><strong>Voz:</strong> "La palanca va de 0 a 1023, y el bloque Math.map la convierte en 0° a 180° [2]."<br><strong>Efecto:</strong> Destello luminoso al girar el servo.</div>' +
                            '</div>' +
                            '<div style="background:#FAF5FF;border:1px solid #E9D5FF;border-radius:8px;padding:10px;">' +
                              '<div style="font-size:0.75rem;font-weight:800;color:#7C3AED;margin-bottom:4px;">🎬 ACTO 3: CIERRE (90-120s)</div>' +
                              '<div style="font-size:0.76rem;color:#581C87;line-height:1.4;"><strong>Visual:</strong> El arquero atajando la pelota al ángulo y festejo.<br><strong>Voz:</strong> "¡Ahora te toca a vos! Programá tu robot y compartí tu atajada."<br><strong>Texto:</strong> "¡Reto superado! +100 XP"</div>' +
                            '</div>' +
                          '</div>' +
                          // Prompt Box
                          '<div class="gie-prompt-box" style="background:#F8FAFC;border:1px solid #CBD5E1;border-radius:8px;padding:10px 14px;">' +
                            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">' +
                              '<span style="font-size:0.75rem;font-weight:800;color:#475569;"><i class="fas fa-terminal"></i> Prompt Estrella para el Chat:</span>' +
                              '<button type="button" class="btn-copy-gie-prompt" data-prompt="Escribe un guión de video de 2 minutos para YouTube Shorts explicando este tema a chicos de 6° grado. Incluye: Gancho atrapante en los primeros 5 segundos, explicaciones con analogías de la vida real, indicaciones de planos de cámara y textos que deben aparecer en pantalla." style="background:#EEF2FF;color:#4F46E5;border:1px solid #C7D2FE;border-radius:6px;padding:3px 8px;font-size:0.72rem;cursor:pointer;"><i class="far fa-copy"></i> Copiar Prompt</button>' +
                            '</div>' +
                            '<code style="font-size:0.78rem;color:#1E1B4B;display:block;">"Escribe un guión de video de 2 minutos para YouTube Shorts explicando este tema con indicaciones de cámara, analogías cotidianas y textos en pantalla."</code>' +
                          '</div>' +
                        '</div>' +

                        // 3. PANE SLIDES
                        '<div class="gie-pane gie-pane-slides" style="display:none;">' +
                          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:6px;">' +
                            '<span style="background:#FEF3C7;color:#B45309;font-size:0.75rem;font-weight:900;padding:3px 10px;border-radius:6px;text-transform:uppercase;letter-spacing:0.04em;"><i class="fas fa-tv"></i> Aprendizaje Visual • Diapositivas Listas para Canva</span>' +
                            '<span style="font-size:0.78rem;color:#64748B;">Regla del 6x6: Máximo 6 líneas con 6 palabras cada una</span>' +
                          '</div>' +
                          '<p style="font-size:0.84rem;color:#1E293B;line-height:1.5;margin:0 0 12px;">' +
                            '<strong>¿Cómo funciona?</strong> NotebookLM organiza tus apuntes en una jerarquía visual lista para trasladar a Canva o Google Slides. Separa cada diapositiva con un título potente, viñetas breves para que no aburras leyendo párrafos largos, y sugiere qué ilustración, foto o gráfico colocar en cada lámina.' +
                          '</p>' +
                          // Slide Cards Grid
                          '<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(210px, 1fr));gap:10px;margin-bottom:12px;">' +
                            '<div style="background:#0F172A;color:#FFF;border-radius:8px;padding:12px;border:1px solid #334155;">' +
                              '<div style="font-size:0.7rem;color:#38BDF8;font-weight:800;">DIAPOSITIVA 1 (PORTADA)</div>' +
                              '<div style="font-size:0.85rem;font-weight:900;margin:4px 0;">Robots en la Cancha: El Arquero Mecánico</div>' +
                              '<div style="font-size:0.75rem;color:#94A3B8;">• Presentado por: Alumnos 6° Grado<br>• Taller de Robótica Freire<br>🖼️ <em>Foto sugerida: Portada con el robot en el arco</em></div>' +
                            '</div>' +
                            '<div style="background:#0F172A;color:#FFF;border-radius:8px;padding:12px;border:1px solid #334155;">' +
                              '<div style="font-size:0.7rem;color:#FBBF24;font-weight:800;">DIAPOSITIVA 2 (EL RETO)</div>' +
                              '<div style="font-size:0.85rem;font-weight:900;margin:4px 0;">¿Cómo traducir la mano al motor?</div>' +
                              '<div style="font-size:0.75rem;color:#94A3B8;">• Joystick entrega números 0..1023<br>• Servo sólo gira de 0° a 180°<br>🖼️ <em>Gráfico: Diagrama de pines P0 y P1</em></div>' +
                            '</div>' +
                            '<div style="background:#0F172A;color:#FFF;border-radius:8px;padding:12px;border:1px solid #334155;">' +
                              '<div style="font-size:0.7rem;color:#34D399;font-weight:800;">DIAPOSITIVA 3 (LA SOLUCIÓN)</div>' +
                              '<div style="font-size:0.85rem;font-weight:900;margin:4px 0;">Mapeo Matemático con MakeCode</div>' +
                              '<div style="font-size:0.75rem;color:#94A3B8;">• Fórmula: Ángulo = (P1 * 180) / 1023<br>• Bucle seguro con pausa de 20 ms<br>🖼️ <em>Captura: Bloque Math.map en MakeCode</em></div>' +
                            '</div>' +
                          '</div>' +
                          // Prompt Box
                          '<div class="gie-prompt-box" style="background:#F8FAFC;border:1px solid #CBD5E1;border-radius:8px;padding:10px 14px;">' +
                            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">' +
                              '<span style="font-size:0.75rem;font-weight:800;color:#475569;"><i class="fas fa-terminal"></i> Prompt Estrella para el Chat:</span>' +
                              '<button type="button" class="btn-copy-gie-prompt" data-prompt="Crea el esquema de una presentación de 6 diapositivas para Canva sobre este tema. Para cada una incluye: Título llamativo, exactamente 3 viñetas concisas aplicando la regla del 6x6 y qué dibujo o ícono sugieres agregar." style="background:#EEF2FF;color:#4F46E5;border:1px solid #C7D2FE;border-radius:6px;padding:3px 8px;font-size:0.72rem;cursor:pointer;"><i class="far fa-copy"></i> Copiar Prompt</button>' +
                            '</div>' +
                            '<code style="font-size:0.78rem;color:#1E1B4B;display:block;">"Crea el esquema de una presentación de 6 diapositivas para Canva aplicando la regla del 6x6, con títulos concisos y sugerencias de elementos visuales."</code>' +
                          '</div>' +
                        '</div>' +

                        // 4. PANE GUIA
                        '<div class="gie-pane gie-pane-guia" style="display:none;">' +
                          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:6px;">' +
                            '<span style="background:#F5F3FF;color:#6D28D9;font-size:0.75rem;font-weight:900;padding:3px 10px;border-radius:6px;text-transform:uppercase;letter-spacing:0.04em;"><i class="fas fa-book"></i> Síntesis Ejecutiva & Glosario de Términos</span>' +
                            '<span style="font-size:0.78rem;color:#64748B;">Botón ' + "'Study Guide'" + ' en Notebook Guide</span>' +
                          '</div>' +
                          '<p style="font-size:0.84rem;color:#1E293B;line-height:1.5;margin:0 0 12px;">' +
                            '<strong>¿Cómo funciona?</strong> Con un solo clic en la opción "Study Guide" del panel lateral, NotebookLM procesa todos los documentos subidos y genera un resumen ejecutivo integral: índice temático, ideas clave, fórmulas indispensables y un glosario con los términos más complejos explicados en lenguaje accesible.' +
                          '</p>' +
                          // Sample Document Box
                          '<div style="background:#F8FAFC;border:1.5px solid #E2E8F0;border-radius:10px;padding:12px 16px;margin-bottom:12px;font-size:0.8rem;color:#334155;line-height:1.5;">' +
                            '<h6 style="font-size:0.85rem;color:#4338CA;margin:0 0 6px;font-weight:900;"><i class="fas fa-bookmark"></i> Glosario Destacado del Proyecto:</h6>' +
                            '<ul style="margin:0;padding-left:18px;">' +
                              '<li><strong>Grounding (Anclaje):</strong> Técnica donde la IA responde únicamente utilizando tus fuentes originales sin inventar datos.</li>' +
                              '<li><strong>Math.map (Ajuste de intervalo):</strong> Función matemática que re-escala valores de una escala a otra de forma proporcional directa.</li>' +
                              '<li><strong>Servomotor SG90:</strong> Actuador mecatrónico que permite posicionar su eje en cualquier ángulo entre 0° y 180°.</li>' +
                            '</ul>' +
                          '</div>' +
                          // Prompt Box
                          '<div class="gie-prompt-box" style="background:#F8FAFC;border:1px solid #CBD5E1;border-radius:8px;padding:10px 14px;">' +
                            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">' +
                              '<span style="font-size:0.75rem;font-weight:800;color:#475569;"><i class="fas fa-terminal"></i> Botón en NotebookLM:</span>' +
                              '<button type="button" class="btn-copy-gie-prompt" data-prompt="En la Notebook Guide (panel derecho), haz clic en ' + "'Guía de estudio'" + '" style="background:#EEF2FF;color:#4F46E5;border:1px solid #C7D2FE;border-radius:6px;padding:3px 8px;font-size:0.72rem;cursor:pointer;"><i class="far fa-copy"></i> Copiar Guía</button>' +
                            '</div>' +
                            '<code style="font-size:0.78rem;color:#1E1B4B;display:block;">En NotebookLM &gt; "Notebook Guide" &gt; Clic en "Guía de estudio" (Study Guide).</code>' +
                          '</div>' +
                        '</div>' +

                        // 5. PANE QUIZZES
                        '<div class="gie-pane gie-pane-quizzes" style="display:none;">' +
                          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:6px;">' +
                            '<span style="background:#ECFDF5;color:#047857;font-size:0.75rem;font-weight:900;padding:3px 10px;border-radius:6px;text-transform:uppercase;letter-spacing:0.04em;"><i class="fas fa-check-circle"></i> Autoevaluación • Active Recall & Flashcards</span>' +
                            '<span style="font-size:0.78rem;color:#64748B;">La técnica de estudio más efectiva según la neurociencia</span>' +
                          '</div>' +
                          '<p style="font-size:0.84rem;color:#1E293B;line-height:1.5;margin:0 0 12px;">' +
                            '<strong>¿Cómo funciona?</strong> Ponerse a prueba antes del examen activa las conexiones neuronales de la memoria a largo plazo. NotebookLM elabora preguntas de opción múltiple, flashcards de ida y vuelta y preguntas frecuentes (FAQ) citando el párrafo exacto donde se encuentra la fundamentación [1].' +
                          '</p>' +
                          // Interactive Quiz Flashcards
                          '<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px;">' +
                            '<div class="gie-quiz-item" style="background:#F0FDF4;border:1px solid #A7F3D0;border-radius:8px;padding:10px 14px;">' +
                              '<div style="display:flex;justify-content:space-between;align-items:center;">' +
                                '<span style="font-size:0.82rem;font-weight:800;color:#065F46;">❓ Pregunta 1: ¿Por qué NotebookLM no inventa información falsa como otros chats de IA?</span>' +
                                '<button type="button" class="btn-reveal-quiz" style="background:#10B981;color:#FFF;border:none;border-radius:6px;padding:3px 10px;font-size:0.72rem;cursor:pointer;font-weight:bold;">Ver Respuesta</button>' +
                              '</div>' +
                              '<div class="gie-quiz-answer" style="display:none;margin-top:8px;padding-top:8px;border-top:1px dashed #A7F3D0;font-size:0.78rem;color:#064E3B;">' +
                                '✅ <strong>Respuesta:</strong> Porque utiliza <strong>Grounding estricto</strong> en las fuentes subidas por el usuario y cita la página original con corchetes [1]. ¡No responde desde conocimiento general inventado!' +
                              '</div>' +
                            '</div>' +
                            '<div class="gie-quiz-item" style="background:#F0FDF4;border:1px solid #A7F3D0;border-radius:8px;padding:10px 14px;">' +
                              '<div style="display:flex;justify-content:space-between;align-items:center;">' +
                                '<span style="font-size:0.82rem;font-weight:800;color:#065F46;">❓ Pregunta 2: ¿Qué función cumple el bloque Math.map en el proyecto del arquero?</span>' +
                                '<button type="button" class="btn-reveal-quiz" style="background:#10B981;color:#FFF;border:none;border-radius:6px;padding:3px 10px;font-size:0.72rem;cursor:pointer;font-weight:bold;">Ver Respuesta</button>' +
                              '</div>' +
                              '<div class="gie-quiz-answer" style="display:none;margin-top:8px;padding-top:8px;border-top:1px dashed #A7F3D0;font-size:0.78rem;color:#064E3B;">' +
                                '✅ <strong>Respuesta:</strong> Re-escala los valores analógicos del joystick [0 a 1023] en los grados angulares del servomotor [0° a 180°], centrando al arquero en 90° al soltar la palanca.' +
                              '</div>' +
                            '</div>' +
                          '</div>' +
                          // Prompt Box
                          '<div class="gie-prompt-box" style="background:#F8FAFC;border:1px solid #CBD5E1;border-radius:8px;padding:10px 14px;">' +
                            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">' +
                              '<span style="font-size:0.75rem;font-weight:800;color:#475569;"><i class="fas fa-terminal"></i> Prompt Estrella para el Chat:</span>' +
                              '<button type="button" class="btn-copy-gie-prompt" data-prompt="Crea una autoevaluación tipo trivia con 5 preguntas de opción múltiple basadas en estas fuentes. Para cada pregunta incluye 4 opciones, indica la correcta y justifica la respuesta citando la página del texto donde está la prueba." style="background:#EEF2FF;color:#4F46E5;border:1px solid #C7D2FE;border-radius:6px;padding:3px 8px;font-size:0.72rem;cursor:pointer;"><i class="far fa-copy"></i> Copiar Prompt</button>' +
                            '</div>' +
                            '<code style="font-size:0.78rem;color:#1E1B4B;display:block;">"Crea una autoevaluación de 5 preguntas de opción múltiple, indicando la correcta y citando la página de la fuente original."</code>' +
                          '</div>' +
                        '</div>' +

                        // 6. PANE TIMELINE
                        '<div class="gie-pane gie-pane-timeline" style="display:none;">' +
                          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:6px;">' +
                            '<span style="background:#DBEAFE;color:#1D4ED8;font-size:0.75rem;font-weight:900;padding:3px 10px;border-radius:6px;text-transform:uppercase;letter-spacing:0.04em;"><i class="fas fa-history"></i> Cronología & Redes Conceptuales</span>' +
                            '<span style="font-size:0.78rem;color:#64748B;">Para historia, ciencias y evolución de inventos</span>' +
                          '</div>' +
                          '<p style="font-size:0.84rem;color:#1E293B;line-height:1.5;margin:0 0 12px;">' +
                            '<strong>¿Cómo funciona?</strong> Gemini rastrea fechas, eventos y relaciones de causa y efecto a lo largo de decenas de páginas y las ordena en una línea de tiempo limpia y clara con hitos numerados.' +
                          '</p>' +
                          // Timeline visual
                          '<div style="border-left:3px solid #3B82F6;margin-left:14px;padding-left:16px;display:flex;flex-direction:column;gap:10px;margin-bottom:12px;">' +
                            '<div style="position:relative;"><span style="position:absolute;left:-23px;top:2px;width:12px;height:12px;border-radius:50%;background:#3B82F6;"></span><strong style="font-size:0.82rem;color:#1E40AF;">Hito 1: Carga de Fuentes en NotebookLM</strong><p style="margin:2px 0 0;font-size:0.76rem;color:#475569;">Los estudiantes suben libros de texto y apuntes para activar el anclaje estricto (Grounding).</p></div>' +
                            '<div style="position:relative;"><span style="position:absolute;left:-23px;top:2px;width:12px;height:12px;border-radius:50%;background:#8B5CF6;"></span><strong style="font-size:0.82rem;color:#6D28D9;">Hito 2: Generación Multimodal con IA</strong><p style="margin:2px 0 0;font-size:0.76rem;color:#475569;">Creación del podcast Audio Overview y esquemas de diapositivas para Canva.</p></div>' +
                            '<div style="position:relative;"><span style="position:absolute;left:-23px;top:2px;width:12px;height:12px;border-radius:50%;background:#10B981;"></span><strong style="font-size:0.82rem;color:#047857;">Hito 3: Autoevaluación y Descarga de la Guía PDF</strong><p style="margin:2px 0 0;font-size:0.76rem;color:#475569;">Resolución de trivias y estudio integral unificado con el PDF oficial.</p></div>' +
                          '</div>' +
                          // Prompt Box
                          '<div class="gie-prompt-box" style="background:#F8FAFC;border:1px solid #CBD5E1;border-radius:8px;padding:10px 14px;">' +
                            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">' +
                              '<span style="font-size:0.75rem;font-weight:800;color:#475569;"><i class="fas fa-terminal"></i> Prompt Estrella para el Chat:</span>' +
                              '<button type="button" class="btn-copy-gie-prompt" data-prompt="Extrae una línea de tiempo cronológica con los 5 acontecimientos más importantes descritos en estas fuentes, indicando fecha, causa y consecuencia inmediata." style="background:#EEF2FF;color:#4F46E5;border:1px solid #C7D2FE;border-radius:6px;padding:3px 8px;font-size:0.72rem;cursor:pointer;"><i class="far fa-copy"></i> Copiar Prompt</button>' +
                            '</div>' +
                            '<code style="font-size:0.78rem;color:#1E1B4B;display:block;">"Extrae una línea de tiempo cronológica con los acontecimientos más importantes descritos en estas fuentes."</code>' +
                          '</div>' +
                        '</div>' +

                      '</div>' + // Fin gie-panes-wrapper

                      // ================= UNIFIED PDF BANNER (Y al final un PDF que junte todo) =================
                      '<div class="gemini-pdf-summary-banner" style="background:linear-gradient(135deg, #1E1B4B 0%, #312E81 100%);color:#FFF;border-radius:12px;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin:4px 0 8px;border:1.5px solid #6366F1;box-shadow:0 4px 14px rgba(79,70,229,0.25);">' +
                        '<div>' +
                          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">' +
                            '<span style="background:#EC4899;color:#FFF;font-size:0.72rem;font-weight:900;padding:2px 8px;border-radius:4px;text-transform:uppercase;">DOCUMENTO UNIFICADO</span>' +
                            '<h4 style="margin:0;font-size:1.02rem;font-weight:900;color:#A5B4FC;"><i class="fas fa-file-pdf" style="color:#F43F5E;"></i> Guía Oficial Integral: Todo en un solo Documento PDF</h4>' +
                          '</div>' +
                          '<p style="margin:0;font-size:0.81rem;color:#E0E7FF;max-width:560px;line-height:1.4;">' +
                            'Reúne la explicación de los 6 formatos de estudio, la tabla comparativa de Grounding, los 6 pasos guiados de clase, el catálogo de prompts estrella y el decálogo ético.' +
                          '</p>' +
                        '</div>' +
                        '<div style="display:flex;gap:10px;flex-wrap:wrap;">' +
                          '<a href="docs/guia_ia_gemini_notebooks.pdf" target="_blank" download="guia_ia_gemini_notebooks.pdf" class="arm-btn-primary" style="background:#EC4899;border-color:#BE185D;font-size:0.86rem;padding:8px 18px;text-decoration:none;">' +
                            '<i class="fas fa-download"></i> Descargar PDF Completo' +
                          '</a>' +
                          '<button type="button" class="arm-btn-secondary apm-goto-pdf-btn" style="font-size:0.86rem;padding:8px 16px;">' +
                            '<i class="fas fa-eye"></i> Abrir Lector PDF' +
                          '</button>' +
                        '</div>' +
                      '</div>' +

                      // 6 Classroom steps
                      '<h4 style="font-size:0.95rem;font-weight:900;color:#1E293B;margin:6px 0 2px;"><i class="fas fa-tasks" style="color:#4F46E5;"></i> Pasos de la Clase en el Taller:</h4>' +
                      '<div class="apm-instructions-steps-grid">' +
                        instructionsList.map(function(st){
                          return '<div class="apm-step-card">' +
                            '<div class="apm-step-badge" style="background:#4F46E5;">' + st.step + '</div>' +
                            '<div class="apm-step-body">' +
                              '<h5>' + st.title + '</h5>' +
                              '<p>' + st.desc + '</p>' +
                              (st.tip ? '<div class="apm-step-tip" style="background:#EEF2FF;border-left-color:#4F46E5;color:#312E81;"><i class="fas fa-lightbulb" style="color:#4F46E5;"></i> ' + st.tip + '</div>' : '') +
                            '</div>' +
                          '</div>';
                        }).join('') +
                      '</div>' +

                      '<div style="text-align:right;margin-top:10px;">' +
                        '<button type="button" class="arm-btn-primary apm-next-btn-internal" style="background:#4F46E5;border-color:#4338CA;">' +
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
                   isClaseActivity ?
                    '<div style="height:100%;display:flex;flex-direction:column;gap:12px;overflow-y:auto;padding-right:4px;">' +
                      '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">' +
                        '<div>' +
                          '<h3 style="font-size:1.2rem;font-weight:900;color:#1E293B;margin:0 0 2px;"><i class="fas fa-chalkboard-teacher" style="color:#15803D;"></i> Consigna y Recursos de la Actividad</h3>' +
                          '<p style="font-size:0.82rem;color:#64748B;margin:0;">Actividad oficial desarrollada en el Taller de Robótica y Programación</p>' +
                        '</div>' +
                        (mission.botones && mission.botones.length > 0 ?
                          '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
                            mission.botones.map(function(b){
                              return '<a href="' + b.url + '" target="_blank" rel="noopener noreferrer" class="arm-btn-primary" style="background:#15803D;border-color:#166534;font-size:0.84rem;padding:7px 16px;text-decoration:none;"><i class="' + (b.icono || 'fas fa-external-link-alt') + '"></i> ' + (b.texto || 'Abrir Herramienta') + '</a>';
                            }).join('') +
                          '</div>' : '') +
                      '</div>' +
                      '<div class="codeorg-challenge-hero-card" style="border-left:4px solid ' + (mission.color || '#15803D') + ';">' +
                        (mission.coverImage ?
                          '<div class="chc-left">' +
                            '<img src="' + mission.coverImage + '" alt="' + (mission.title || '').replace(/"/g, '&quot;') + '" class="chc-img" onerror="this.src=\'img/bienvenida_taller.jpg\'">' +
                          '</div>' : '') +
                        '<div class="chc-right">' +
                          '<span class="chc-tag" style="background:#DCFCE7;color:#15803D;"><i class="fas fa-chalkboard-teacher"></i> ' + (mission.badge || '🛠️ Actividad de Clase') + '</span>' +
                          '<h4>' + mission.title + '</h4>' +
                          '<p style="font-size:0.92rem;line-height:1.6;color:#334155;">' + mission.description + '</p>' +
                          (mission.botones && mission.botones.length > 0 ?
                            '<div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;">' +
                              mission.botones.map(function(b){
                                return '<a href="' + b.url + '" target="_blank" rel="noopener noreferrer" class="arm-btn-primary" style="background:' + (mission.color || '#15803D') + ';font-size:0.92rem;padding:9px 20px;text-decoration:none;"><i class="' + (b.icono || 'fas fa-external-link-alt') + '"></i> ' + (b.texto || 'Abrir Herramienta en Vivo') + '</a>';
                              }).join('') +
                            '</div>' : (mission.gameUrl ?
                            '<div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;">' +
                              '<a href="' + mission.gameUrl + '" target="_blank" rel="noopener noreferrer" class="arm-btn-primary" style="background:#15803D;font-size:0.92rem;padding:9px 20px;text-decoration:none;"><i class="fas fa-external-link-alt"></i> Abrir Actividad</a>' +
                            '</div>' : '')) +
                        '</div>' +
                      '</div>' +
                      (mission.objective ?
                        '<div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:12px 16px;">' +
                          '<h5 style="margin:0 0 4px;color:#0F172A;font-weight:800;font-size:0.88rem;"><i class="fas fa-bullseye" style="color:#15803D;"></i> ¿Qué buscamos lograr?</h5>' +
                          '<p style="margin:0;color:#475569;font-size:0.84rem;line-height:1.5;">' + mission.objective + '</p>' +
                        '</div>' : '') +
                      '<div style="text-align:right;margin-top:8px;">' +
                        '<button type="button" class="arm-btn-primary apm-next-btn-internal" style="background:#15803D;border-color:#166534;">' +
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
                      '<div class="apm-win-trophy">' + (isClaseActivity ? '🛠️' : (isGeminiNotebooks ? '🧠' : (isServoJoystick ? '🧤' : (isCanva ? '🧤' : (isMarcalibro ? '📖' : (isScratchJrPerspectiva ? '🐱' : (isScratchJrVelocidad ? '🐱' : (isMinecraft ? '⛏️' : (isFrozen ? '❄️' : (isPaintBanderas ? '🇺🇾' : (isPaint ? '⚽' : (isDiaMadre ? '💖' : (isAngryBirds ? '🐦' : '🏆'))))))))))))) + '</div>' +
                      '<h3 class="apm-win-title">' + (isClaseActivity ? '¡Actividad de Clase Completada con Éxito!' : (isGeminiNotebooks ? '¡Materiales de Estudio con IA Generados con Éxito!' : (isServoJoystick ? '¡El Arquero Mecánico Construido y Programado con Éxito!' : (isCanva ? '¡Arquero con Inteligencia Artificial Creado con Éxito en Canva!' : (isMarcalibro ? '¡Marca-Libros Origami de Tom Sawyer Terminado!' : (isScratchJrPerspectiva ? '¡Misión de Escenarios y Perspectiva en Scratch Jr Superada!' : (isScratchJrVelocidad ? '¡Misión de Escenarios y Velocidades en Scratch Jr Superada!' : (isMinecraft ? '¡Desafío de Programación en Minecraft Superado!' : (isFrozen ? '¡Patinaje Geométrico Completado con Ana y Elsa!' : (isPaintBanderas ? '¡Banderas del Mundial Creadas con Éxito en Paint!' : (isPaint ? '¡Cancha de Fútbol Completada en Paint!' : (isDiaMadre ? '¡Tarjeta Pop-Up 3D del Día de la Madre Terminada con Éxito!' : (isAngryBirds ? '¡Desafío Angry Birds Superado!' : '¡Misión Cumplida en el Nivel ' + mission.level + '!'))))))))))))) + '</h3>' +
                      '<p class="apm-win-sub">' + (isClaseActivity ? '¡Superaste el reto propuesto en <strong>' + mission.title + '</strong>! Tu esfuerzo y dedicación impulsan el progreso de tu grado. Sumaste <strong>+100 XP</strong> al progreso del taller.' : (isGeminiNotebooks ? '¡Anclaste tus apuntes y libros en NotebookLM (Grounding con fuentes verificadas), generaste podcasts con 2 locutores sintéticos (Audio Overview), guiones de video en 3 actos, diapositivas jerárquicas y autoevaluaciones con citas directas! Sumaste <strong>+100 XP</strong> al progreso del taller.' : (isServoJoystick ? '¡Conectaste el joystick chico negro en Pin P1, programaste el servomotor SG90 en Pin P0, dominaste el bloque de ajuste de intervalo matemático (Math.map de 0..1023 a 0..180°) y pusiste al arquero a atajar penales en el arco físico en tiempo real! Sumaste <strong>+100 XP</strong> al progreso del taller.' : (isCanva ? '¡Te sacaste la foto en el aula, aislaste tu cabeza con la IA de Canva, la montaste sobre la imagen de un arquero reemplazando su foto y la transformaste en una animación de atajada épica en video MP4 o GIF! Sumaste <strong>+100 XP</strong> al progreso del taller.' : (isMarcalibro ? '¡Plegaste tu marca-libros esquinero con papel glacé y le diste luz al sombrero de Tom Sawyer con un circuito y LED chato! Sumaste <strong>+100 XP</strong> al progreso del taller.' : (isScratchJrPerspectiva ? '¡Aprendiste a crear profundidad 3D en Scratch Jr cambiando la perspectiva de las figuras con los bloques de apariencia! Sumaste <strong>+100 XP</strong> al progreso del taller.' : (isScratchJrVelocidad ? '¡Aprendiste a explorar el ambiente de Scratch Jr y a dominar las velocidades lenta, media y rápida con el bloque naranja! Sumaste <strong>+100 XP</strong> al progreso del taller.' : (isMinecraft ? '¡Aprendiste a programar a Steve y Alex con bloques y bucles secuenciales en la adaptación de Code.org! Sumaste <strong>+100 XP</strong> al progreso del taller.' : (isFrozen ? '¡Dominaste los ángulos, las figuras geométricas y la programación sobre el hielo! Sumaste <strong>+100 XP</strong> al progreso del taller.' : (isPaintBanderas ? '¡Combinaste figuras geométricas, proporciones y colores para diseñar las banderas del mundial en Paint! Sumaste <strong>+100 XP</strong> al progreso del taller.' : (isPaint ? '¡Dominaste el mouse, los colores y las figuras geométricas para crear tu propio estadio digital! Sumaste <strong>+100 XP</strong> al progreso del taller.' : (isDiaMadre ? '¡Creaste un corazón 3D con tu foto y un circuito con luz LED que enciende al tocar el escudo del Colegio Paulo Freire! Sumaste <strong>+100 XP</strong> al progreso del taller.' : (isAngryBirds ? 'Aprendiste las bases de la programación y el razonamiento lógico en Code.org. ¡Sumaste <strong>+100 XP</strong> al progreso del taller!' : 'Superaste el recorrido de <strong>' + mission.title + '</strong>. ¡Sumaste <strong>+100 XP</strong> al progreso de tu grado!'))))))))))))) + '</p>' +
                    '</div>' +

                    '<h4 style="font-size:1rem;font-weight:900;color:#1E293B;margin:0 0 12px;"><i class="fas fa-rocket"></i> Desafíos Extra para tu Invento:</h4>' +
                    '<div class="apm-extra-challenges">' +
                      (isGeminiNotebooks ?
                        '<div class="apm-ec-item"><div class="apm-ec-badge" style="background:#4F46E5;">1</div><div><h6>Audio Overview con Instrucciones Personalizadas</h6><p>En NotebookLM, personalizá el podcast pidiendo a los dos anfitriones que utilicen analogías de fútbol o videojuegos para explicar los temas más difíciles.</p></div></div>' +
                        '<div class="apm-ec-item"><div class="apm-ec-badge" style="background:#4F46E5;">2</div><div><h6>Cruzar Fuentes y Detectar Citas Falsas</h6><p>Hacé una pregunta capciosa al chat y hacé clic en las citas numéricas [1] y [2] para verificar el párrafo exacto de la fuente de donde la IA extrajo la respuesta.</p></div></div>' +
                        '<div class="apm-ec-item"><div class="apm-ec-badge" style="background:#4F46E5;">3</div><div><h6>Exportar Esquema de Diapositivas a Canva</h6><p>Copiá la estructura generada de 5 diapositivas y pegala en Canva para diseñar una presentación visual interactiva con elementos gráficos.</p></div></div>' :
                       isServoJoystick ?
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
                        '<button type="button" class="arm-btn-primary apm-slide4-goto-entrega" style="background:' + (isClaseActivity ? '#15803D' : (isGeminiNotebooks ? '#4F46E5' : (isMarcalibro ? '#D97706' : (isScratchJrPerspectiva ? '#7C3AED' : (isScratchJrVelocidad ? '#EA580C' : (isDiaMadre ? '#E11D48' : (isPaintBanderas ? '#2563EB' : (isPaint ? '#16A34A' : (isElectronica ? '#D97706' : '#10B981'))))))))) + ';border-color:' + (isClaseActivity ? '#166534' : (isGeminiNotebooks ? '#4338CA' : (isMarcalibro ? '#B45309' : (isScratchJrPerspectiva ? '#6D28D9' : (isScratchJrVelocidad ? '#C2410C' : (isDiaMadre ? '#BE123C' : (isPaintBanderas ? '#1D4ED8' : (isPaint ? '#15803D' : (isElectronica ? '#B45309' : '#059669'))))))))) + ';font-size:0.9rem;padding:9px 18px;">' +
                          (isClaseActivity ? '<i class="fas fa-check-circle"></i> Entregar Actividad de Clase' : (isGeminiNotebooks ? '<i class="fas fa-brain"></i> Entregar Materiales de Estudio' : (isMarcalibro ? '<i class="fas fa-camera"></i> Subir Foto de Mi Marca-Libros' : (isScratchJrPerspectiva ? '<i class="fas fa-cloud-upload-alt"></i> Subir Mi Proyecto (.sjr)' : (isScratchJrVelocidad ? '<i class="fas fa-cloud-upload-alt"></i> Subir Mi Proyecto (.sjr)' : (isDiaMadre ? '<i class="fas fa-camera"></i> Subir Foto de Mi Tarjeta 3D' : (isPaint ? '<i class="fas fa-palette"></i> Subir Mi Dibujo de Paint' : (isElectronica ? '<i class="fas fa-camera"></i> Subir Foto de Mi Circuito' : '<i class="fas fa-cloud-upload-alt"></i> Subir Mi Creación')))))))) +
                        '</button>' +
                        '<button type="button" class="arm-btn-primary apm-slide4-goto-solucion" style="background:' + (isClaseActivity ? '#15803D;border-color:#166534;' : '#7C3AED;border-color:#6D28D9;') + 'font-size:0.9rem;padding:9px 18px;">' +
                          (isClaseActivity ? '<i class="fas fa-chalkboard-teacher"></i> Ver Consigna y Recursos' : (isGeminiNotebooks ? '<i class="fas fa-laptop-code"></i> Ver Espacio de Trabajo NotebookLM' : (isMarcalibro ? '<i class="fas fa-book-open"></i> Ver Guía de Doblado y Circuito' : (isScratchJrPerspectiva ? '<i class="fas fa-search-plus"></i> Ver Esquema de Perspectiva' : (isScratchJrVelocidad ? '<i class="fas fa-tachometer-alt"></i> Ver Esquema de Velocidades' : (isDiaMadre ? '<i class="fas fa-heart"></i> Ver Esquema del Corazón y Escudo' : (isPaint ? '<i class="fas fa-shapes"></i> Ver Guía de Figuras' : (isElectronica ? '<i class="fas fa-lightbulb"></i> Ver Esquema Oficial' : '<i class="fas fa-lightbulb"></i> Ver Solución Oficial')))))))) +
                        '</button>' +
                        (isGeminiNotebooks ?
                          '<a href="docs/guia_ia_gemini_notebooks.pdf" target="_blank" download="guia_ia_gemini_notebooks.pdf" class="arm-btn-primary" style="background:#EC4899;border-color:#BE185D;font-size:0.9rem;padding:9px 18px;text-decoration:none;"><i class="fas fa-file-pdf"></i> Descargar Guía Completa PDF</a>' :
                         isScratchJrPerspectiva ?
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
                  (isClaseActivity ?
                    '<button type="button" class="apm-deliv-switch-btn active" id="apm-switch-to-clase" style="padding:6px 14px;border-radius:8px;font-size:0.8rem;font-weight:800;cursor:pointer;border:none;background:#15803D;color:#FFF;box-shadow:0 2px 6px rgba(21,128,61,0.3);">' +
                      '<i class="fas fa-chalkboard-teacher"></i> Entrega de Actividad' +
                    '</button>' : '') +
                  (isCodeorg ?
                    '<button type="button" class="apm-deliv-switch-btn active" id="apm-switch-to-codeorg" style="padding:6px 14px;border-radius:8px;font-size:0.8rem;font-weight:800;cursor:pointer;border:none;' + (isMinecraft ? 'background:#059669;color:#FFF;box-shadow:0 2px 6px rgba(5,150,105,0.3);' : (isFrozen ? 'background:#0284C7;color:#FFF;box-shadow:0 2px 6px rgba(2,132,199,0.3);' : 'background:#E11D48;color:#FFF;box-shadow:0 2px 6px rgba(225,29,72,0.3);')) + '">' +
                      (isMinecraft ? '<i class="fas fa-cube"></i> Desafío Minecraft' : (isFrozen ? '<i class="fas fa-snowflake"></i> Desafío Frozen' : '<i class="fas fa-gamepad"></i> Desafío Code.org')) +
                    '</button>' : '') +
                  (isPaint ?
                    '<button type="button" class="apm-deliv-switch-btn active" id="apm-switch-to-paint" style="padding:6px 14px;border-radius:8px;font-size:0.8rem;font-weight:800;cursor:pointer;border:none;background:#16A34A;color:#FFF;box-shadow:0 2px 6px rgba(22,163,74,0.3);">' +
                      '<i class="fas fa-palette"></i> Dibujo Paint' +
                    '</button>' : '') +
                  ((isElectronica || isServoJoystick) ?
                    '<button type="button" class="apm-deliv-switch-btn ' + (!isMakecode && isElectronica ? 'active' : '') + '" id="apm-switch-to-electro" style="padding:6px 14px;border-radius:8px;font-size:0.8rem;font-weight:800;cursor:pointer;border:none;' + (!isMakecode && isElectronica ? (isMarcalibro ? 'background:#D97706;color:#FFF;box-shadow:0 2px 6px rgba(217,119,6,0.3);' : (isDiaMadre ? 'background:#E11D48;color:#FFF;box-shadow:0 2px 6px rgba(225,29,72,0.3);' : 'background:#D97706;color:#FFF;box-shadow:0 2px 6px rgba(217,119,6,0.3);')) : 'background:#E2E8F0;color:#475569;') + '">' +
                      (isServoJoystick ? '<i class="fas fa-camera"></i> Foto / Video del Robot' : (isMarcalibro ? '<i class="fas fa-book-open"></i> Foto Marca-Libros' : (isDiaMadre ? '<i class="fas fa-heart"></i> Foto Tarjeta 3D' : '<i class="fas fa-bolt"></i> Foto / Video Circuito'))) +
                    '</button>' : '') +
                  (isScratch ?
                    '<button type="button" class="apm-deliv-switch-btn active" id="apm-switch-to-scratch" style="padding:6px 14px;border-radius:8px;font-size:0.8rem;font-weight:800;cursor:pointer;border:none;background:#EA580C;color:#FFF;box-shadow:0 2px 6px rgba(234,88,12,0.3);">' +
                      '<i class="fas fa-cat"></i> Archivo Scratch Jr' +
                    '</button>' : '') +
                  (isMakecode ?
                    '<button type="button" class="apm-deliv-switch-btn active" id="apm-switch-to-mk" style="padding:6px 14px;border-radius:8px;font-size:0.8rem;font-weight:800;cursor:pointer;border:none;background:#7C3AED;color:#FFF;box-shadow:0 2px 6px rgba(124,58,237,0.3);">' +
                      '<i class="fas fa-microchip"></i> Link MakeCode' +
                    '</button>' : '') +
                  (isGeminiNotebooks ?
                    '<button type="button" class="apm-deliv-switch-btn active" id="apm-switch-to-gemini" style="padding:6px 14px;border-radius:8px;font-size:0.8rem;font-weight:800;cursor:pointer;border:none;background:#4F46E5;color:#FFF;box-shadow:0 2px 6px rgba(79,70,229,0.3);">' +
                      '<i class="fas fa-brain"></i> Entrega IA & NotebookLM' +
                    '</button>' : '') +
                '</div>' +
              '</div>' +

              // SUB-PANEL ACTIVIDAD DE CLASE
              '<div id="apm-clase-delivery-section" style="' + (isClaseActivity ? 'display:block;' : 'display:none;') + '">' +
                '<div class="apm-delivery-header" style="background:linear-gradient(135deg, #14532D 0%, #15803D 50%, #16A34A 100%);">' +
                  '<div class="apm-dh-icon"><i class="fas fa-chalkboard-teacher"></i></div>' +
                  '<div>' +
                    '<h4>Entrega de Actividad: ' + (mission.title || 'Actividad de Clase') + '</h4>' +
                    '<p>Podés registrar tu entrega compartiendo el enlace a tu trabajo, subiendo una captura/foto o validando la actividad con un clic para sumar tus <strong>+100 XP</strong>.</p>' +
                  '</div>' +
                '</div>' +
                '<div class="apm-delivery-body">' +
                  '<div class="apm-delivery-input-group">' +
                    '<div class="apm-delivery-input-wrap">' +
                      '<i class="fas fa-link apm-delivery-link-icon"></i>' +
                      '<input type="url" id="apm-clase-student-url" class="apm-delivery-url-input" placeholder="https://... pegá el enlace a tu proyecto, captura o trabajo" value="' + (savedMakecodeUrl || '') + '">' +
                    '</div>' +
                    '<button type="button" id="apm-clase-save-link-btn" class="apm-delivery-submit-btn" style="background:#15803D;"><i class="fas fa-paper-plane"></i> Guardar Enlace (+100 XP)</button>' +
                  '</div>' +
                  (mission.botones && mission.botones.length > 0 ?
                    '<div class="apm-delivery-actions-row">' +
                      mission.botones.map(function(b){
                        return '<a href="' + b.url + '" target="_blank" rel="noopener noreferrer" class="apm-delivery-link-btn" style="color:#15803D;"><i class="' + (b.icono || 'fas fa-external-link-alt') + '"></i> ' + (b.texto || 'Abrir Plataforma') + '</a>';
                      }).join('') +
                    '</div>' : '') +
                  '<div class="apm-scratch-dropzone" id="apm-clase-dropzone" style="margin-top:16px;border-color:#86EFAC;background:#F0FDF4;">' +
                    '<div class="apm-sd-icon" style="color:#15803D;background:#DCFCE7;"><i class="fas fa-cloud-upload-alt"></i></div>' +
                    '<h4 style="color:#14532D;">Arrastrá tu captura, foto o archivo aquí</h4>' +
                    '<p style="color:#166534;">Subí tu imagen (.png, .jpg), proyecto o documento para guardarlo en tu Google Drive</p>' +
                    '<input type="file" id="apm-clase-file-input" style="display:none;" accept="image/*,.png,.jpg,.jpeg,.pdf,.sb3,.sjr,.txt,.doc,.docx">' +
                    '<button type="button" id="apm-clase-browse-btn" class="apm-delivery-submit-btn" style="background:#15803D;"><i class="fas fa-folder-open"></i> Seleccionar Archivo o Foto</button>' +
                  '</div>' +
                  '<div style="text-align:center;margin-top:18px;padding:16px;background:#F8FAFC;border:1.5px dashed #CBD5E1;border-radius:12px;">' +
                    '<p style="margin:0 0 10px;font-size:0.86rem;color:#475569;">¿Ya realizaste la actividad en clase o en la plataforma indicada por el docente?</p>' +
                    '<button type="button" id="apm-btn-complete-clase" class="apm-delivery-submit-btn" style="background:linear-gradient(135deg, #15803D 0%, #16A34A 100%);font-size:0.95rem;padding:10px 24px;box-shadow:0 4px 12px rgba(21,128,61,0.3);">' +
                      '<i class="fas fa-check-circle"></i> Marcar Actividad de Clase Completada (+100 XP)' +
                    '</button>' +
                  '</div>' +
                  '<div id="apm-clase-delivery-status" style="margin-top:14px;">' +
                    (savedFileName || savedMakecodeUrl || isAlreadyCompleted ?
                      '<div class="apm-status-badge success" style="padding:12px 18px;border-left:4px solid #10B981;"><i class="fas fa-trophy" style="font-size:1.4rem;color:#F59E0B;"></i> <div><strong style="color:#065F46;">Actividad Completada ⭐ (+100 XP)</strong><br><span style="font-size:0.84rem;color:#047857;">' + (savedFileName ? 'Archivo entregado: <strong>' + savedFileName + '</strong>' : (savedMakecodeUrl ? 'Enlace registrado: <strong>' + savedMakecodeUrl + '</strong>' : '¡Actividad validada con éxito!')) + ' (' + (savedFileDate || 'Guardado') + ') en tu Google Drive.</span></div></div>' : '') +
                  '</div>' +
                '</div>' +
              '</div>' +

              // SUB-PANEL GEMINI / NOTEBOOKLM
                            // SUB-PANEL HALLOWEEN
              '<div id="apm-halloween-delivery-section" style="' + (isHalloween ? 'display:block;' : 'display:none;') + '">' +
                '<div class="apm-delivery-header" style="background:linear-gradient(135deg, #7C2D12 0%, #C2410C 50%, #7C3AED 100%);">' +
                  '<div class="apm-dh-icon" style="background:rgba(255,255,255,0.18);color:#FDBA74;"><i class="fas fa-ghost"></i></div>' +
                  '<div>' +
                    '<h4>Entrega de Proyecto Especial: Halloween con IA 🎃👻🎬</h4>' +
                    '<p>Podés registrar tu entrega compartiendo tu diseño de Canva o subiendo tu foto/video transformado para guardarlo en la carpeta de Halloween de tu Google Drive.</p>' +
                  '</div>' +
                '</div>' +
                '<div class="apm-delivery-body">' +
                  '<div class="apm-delivery-input-group">' +
                    '<div class="apm-delivery-input-wrap">' +
                      '<i class="fas fa-link apm-delivery-link-icon"></i>' +
                      '<input type="url" id="apm-halloween-student-url" class="apm-delivery-url-input" placeholder="https://www.canva.com/design/... o link a Drive / prompt" value="' + (savedMakecodeUrl || '') + '">' +
                    '</div>' +
                    '<button type="button" id="apm-halloween-save-link-btn" class="apm-delivery-submit-btn" style="background:#EA580C;"><i class="fas fa-paper-plane"></i> Guardar Enlace (+100 XP)</button>' +
                  '</div>' +
                  '<div class="apm-delivery-actions-row">' +
                    '<a href="https://roboticapaulofreire-uy.github.io/libro_hechizos/" target="_blank" rel="noopener noreferrer" class="apm-delivery-link-btn" style="color:#7C3AED;font-weight:700;"><i class="fas fa-book-skull"></i> 📖 Ver El Libro de Hechizos</a>' +
                    '<a href="https://canva.link/polaroid-freirebotuy" target="_blank" rel="noopener noreferrer" class="apm-delivery-link-btn" style="color:#0284C7;font-weight:700;"><i class="fas fa-palette"></i> Abrir Plantilla Polaroid en Canva</a>' +
                    '<a href="https://gemini.google.com" target="_blank" rel="noopener noreferrer" class="apm-delivery-link-btn" style="color:#EA580C;font-weight:700;"><i class="fas fa-wand-magic-sparkles"></i> Ir a Gemini</a>' +
                  '</div>' +
                  '<div class="apm-scratch-dropzone" id="apm-halloween-dropzone" style="margin-top:16px;border-color:#FDBA74;background:#FFF7ED;">' +
                    '<div class="apm-sd-icon" style="color:#EA580C;background:#FED7AA;"><i class="fas fa-cloud-upload-alt"></i></div>' +
                    '<h4 style="color:#9A3412;">Subí tu Foto o Video de Halloween aquí</h4>' +
                    '<p style="color:#7C2D12;">Formatos permitidos: Video (.mp4, .mov) o Foto / Polaroid (.png, .jpg, .webp)</p>' +
                    '<input type="file" id="apm-halloween-file-input" style="display:none;" accept=".mp4,.mov,.webm,.png,.jpg,.jpeg,.webp">' +
                    '<button type="button" id="apm-halloween-browse-btn" class="apm-delivery-submit-btn" style="background:#EA580C;"><i class="fas fa-folder-open"></i> Seleccionar Archivo de Halloween</button>' +
                  '</div>' +
                  '<div style="text-align:center;margin-top:18px;padding:16px;background:#FAF5FF;border:1.5px dashed #D8B4FE;border-radius:12px;">' +
                    '<p style="margin:0 0 10px;font-size:0.86rem;color:#581C87;">¿Ya generaste tu monstruo con Gemini, diseñaste tu Polaroid en Canva y probaste la animación en Flow?</p>' +
                    '<button type="button" id="apm-btn-complete-halloween" class="apm-delivery-submit-btn" style="background:linear-gradient(135deg, #EA580C 0%, #7C3AED 100%);font-size:0.95rem;padding:10px 24px;box-shadow:0 4px 12px rgba(234,88,12,0.3);">' +
                      '<i class="fas fa-check-circle"></i> ⭐ Marcar Misión de Halloween Completada (+100 XP)' +
                    '</button>' +
                  '</div>' +
                  '<div id="apm-halloween-delivery-status" style="margin-top:14px;">' +
                    (savedFileName || savedMakecodeUrl || isAlreadyCompleted ?
                      '<div class="apm-status-badge success" style="padding:12px 18px;border-left:4px solid #10B981;"><i class="fas fa-trophy" style="font-size:1.4rem;color:#F59E0B;"></i> <div><strong style="color:#065F46;">Misión Completada ⭐ (+100 XP)</strong><br><span style="font-size:0.84rem;color:#047857;">' + (savedFileName ? 'Archivo entregado: <strong>' + savedFileName + '</strong>' : (savedMakecodeUrl ? 'Enlace registrado: <strong>' + savedMakecodeUrl + '</strong>' : '¡Misión de Halloween validada con éxito!')) + ' (' + (savedFileDate || 'Guardado') + ') en tu Google Drive.</span></div></div>' : '') +
                  '</div>' +
                '</div>' +
              '</div>' +

              '<div id="apm-gemini-delivery-section" style="' + (isGeminiNotebooks ? 'display:block;' : 'display:none;') + '">' +
                '<div class="apm-delivery-header" style="background:linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4F46E5 100%);">' +
                  '<div class="apm-dh-icon" style="background:rgba(255,255,255,0.18);color:#A5B4FC;"><i class="fas fa-brain"></i></div>' +
                  '<div>' +
                    '<h4>Entrega de Materiales de Estudio con Google Gemini & NotebookLM</h4>' +
                    '<p>Podés registrar tu entrega compartiendo el enlace a tu cuaderno de NotebookLM, subiendo tu material (podcast, presentación, guion o guía PDF) o validando tu avance en el taller.</p>' +
                  '</div>' +
                '</div>' +
                '<div class="apm-delivery-body">' +
                  // Link input group
                  '<div class="apm-delivery-input-group">' +
                    '<div class="apm-delivery-input-wrap">' +
                      '<i class="fas fa-link apm-delivery-link-icon"></i>' +
                      '<input type="url" id="apm-gemini-student-url" class="apm-delivery-url-input" placeholder="https://notebooklm.google.com/notebook/... o link a Google Drive / Canva" value="' + (savedMakecodeUrl || '') + '">' +
                    '</div>' +
                    '<button type="button" id="apm-gemini-save-link-btn" class="apm-delivery-submit-btn" style="background:#4F46E5;"><i class="fas fa-paper-plane"></i> Guardar Enlace (+100 XP)</button>' +
                  '</div>' +
                  '<div class="apm-delivery-actions-row">' +
                    '<a href="https://notebooklm.google.com" target="_blank" rel="noopener noreferrer" class="apm-delivery-link-btn" style="color:#4F46E5;"><i class="fas fa-external-link-alt"></i> Ir a NotebookLM en vivo</a>' +
                    '<a href="docs/guia_ia_gemini_notebooks.pdf" target="_blank" download="guia_ia_gemini_notebooks.pdf" class="apm-delivery-link-btn" style="color:#EC4899;"><i class="fas fa-file-pdf"></i> Descargar Guía Completa PDF</a>' +
                    '<span class="apm-delivery-hint"><i class="fas fa-info-circle"></i> Tip: Podés compartir el enlace público de tu cuaderno o pegar el link a tu carpeta de Drive.</span>' +
                  '</div>' +
                  // File dropzone
                  '<div class="apm-scratch-dropzone" id="apm-gemini-dropzone" style="margin-top:16px;border-color:#A5B4FC;background:#EEF2FF;">' +
                    '<div class="apm-sd-icon" style="color:#4F46E5;background:#C7D2FE;"><i class="fas fa-cloud-upload-alt"></i></div>' +
                    '<h4 style="color:#312E81;">Arrastrá tu archivo de estudio aquí</h4>' +
                    '<p style="color:#4338CA;">Subí tu resumen en PDF, guion (.txt/.docx), presentación (.pptx/enlace) o audio (.mp3/.wav)</p>' +
                    '<input type="file" id="apm-gemini-file-input" style="display:none;" accept=".pdf,.doc,.docx,.txt,.mp3,.wav,.m4a,.png,.jpg,.jpeg,.pptx">' +
                    '<button type="button" id="apm-gemini-browse-btn" class="apm-delivery-submit-btn" style="background:#4F46E5;"><i class="fas fa-folder-open"></i> Seleccionar Archivo de Estudio</button>' +
                  '</div>' +
                  // 1-Click quick complete button
                  '<div style="text-align:center;margin-top:18px;padding:16px;background:#F8FAFC;border:1.5px dashed #CBD5E1;border-radius:12px;">' +
                    '<p style="margin:0 0 10px;font-size:0.86rem;color:#475569;">¿Ya probaste los prompts en NotebookLM, exploraste los 6 formatos y leíste la guía didáctica en clase?</p>' +
                    '<button type="button" id="apm-btn-complete-gemini" class="apm-delivery-submit-btn" style="background:linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);font-size:0.95rem;padding:10px 24px;box-shadow:0 4px 12px rgba(79,70,229,0.3);">' +
                      '<i class="fas fa-check-circle"></i> Marcar Misión de Estudio con IA Completada (+100 XP)' +
                    '</button>' +
                  '</div>' +
                  '<div id="apm-gemini-delivery-status" style="margin-top:14px;">' +
                    (savedFileName || savedMakecodeUrl || isAlreadyCompleted ?
                      '<div class="apm-status-badge success" style="padding:12px 18px;border-left:4px solid #10B981;"><i class="fas fa-trophy" style="font-size:1.4rem;color:#F59E0B;"></i> <div><strong style="color:#065F46;">Misión Completada ⭐ (+100 XP)</strong><br><span style="font-size:0.84rem;color:#047857;">' + (savedFileName ? 'Archivo entregado: <strong>' + savedFileName + '</strong>' : (savedMakecodeUrl ? 'Enlace registrado: <strong>' + savedMakecodeUrl + '</strong>' : '¡Misión validada con éxito!')) + ' (' + (savedFileDate || 'Guardado') + ') en tu Google Drive.</span></div></div>' : '') +
                  '</div>' +
                  // Pedagogical guide
                  '<div class="apm-delivery-guide" style="margin-top:16px;">' +
                    '<h5><i class="fas fa-balance-scale" style="color:#4F46E5;"></i> Criterios de Evaluación Pedagógica con IA:</h5>' +
                    '<ol>' +
                      '<li><strong>Grounding Estricto:</strong> La información debe estar anclada en documentos o apuntes reales, citando las fuentes numéricas [1] y evitando alucinaciones.</li>' +
                      '<li><strong>Diversidad de Formatos:</strong> Se valora la experimentación con al menos uno de los 6 materiales (Podcast, Video, Presentación, Guía, Quizzes o Línea de Tiempo).</li>' +
                      '<li><strong>Pensamiento Crítico y Ética:</strong> Uso responsable de la IA como copiloto que asiste el aprendizaje y nunca como reemplazo del razonamiento humano.</li>' +
                    '</ol>' +
                  '</div>' +
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
              (isScratch ?
              '<div id="apm-scratch-delivery-section" style="display:block;">' +
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
              '</div>' :
              '<div id="apm-scratch-delivery-section" style="display:none;"></div>') +
            '</div>' +
          '</div>' +

          // ── PANEL 3: SOLUCIÓN OFICIAL ──
          '<div class="apm-tab-pane pane-solucion ' + (activeTab === 'solucion' ? 'active' : '') + '">' +
            (isClaseActivity ?
              renderClaseActivitySolutionHtml(mission) :
             isHalloween ?
              renderHalloweenSolutionHtml(mission) :
             isMarcalibro ?
              renderMarcalibroOrigamiSolutionHtml(mission) :
             isScratchJrPerspectiva ?
              renderScratchJrPerspectivaSolutionHtml(mission) :
             isScratchJrVelocidad ?
              renderScratchJrVelocidadSolutionHtml(mission) :
             isCodeorg ?
              renderCodeorgSolutionHtml(mission) :
             isDiaMadre ?
              renderDiaMadreSolutionHtml(mission) :
             isGeminiNotebooks ?
              renderGeminiNotebooksSolutionHtml(mission) :
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
                          (mission.codeSnippet || isServoJoystick ?
                            '<button type="button" class="btn-copy-mklib-code" data-code="' + (mission.codeSnippet || 'let x = 0\nlet angulo = 90\npins.servoWritePin(AnalogPin.P0, angulo)\n// Joystick principal\nbasic.forever(function () {\n    x = pins.analogReadPin(AnalogPin.P1)\n    angulo = Math.map(x, 0, 1023, 0, 180)\n    if (angulo < 0) {\n        angulo = 0\n    }\n    if (angulo > 180) {\n        angulo = 180\n    }\n    pins.servoWritePin(AnalogPin.P0, angulo)\n    basic.pause(20)\n})').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') + '" style="background:#0D9488;color:#FFF;border:none;border-radius:6px;padding:3px 10px;font-size:0.75rem;cursor:pointer;margin-right:8px;"><i class="far fa-copy"></i> Copiar Código</button>' : '') +
                          '<button type="button" class="mkm-zoom-btn" id="apm-sol-zoom-out" title="Reducir"><i class="fas fa-search-minus"></i></button>' +
                          '<span class="mkm-zoom-val" id="apm-sol-zoom-label">125%</span>' +
                          '<button type="button" class="mkm-zoom-btn" id="apm-sol-zoom-in" title="Aumentar"><i class="fas fa-search-plus"></i></button>' +
                          '<button type="button" class="mkm-zoom-btn" id="apm-sol-zoom-reset" title="Restablecer (125%)"><i class="fas fa-undo"></i></button>' +
                        '</div>' +
                      '</div>' +
                      (mission.codeSnippet || isServoJoystick ?
                        '<div style="background:#090D16;border-bottom:1px solid #1E293B;padding:8px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">' +
                          '<span style="color:#38BDF8;font-size:0.75rem;font-weight:700;font-family:monospace;"><i class="fas fa-code"></i> Código MakeCode / TypeScript Oficial</span>' +
                          '<code style="font-family:monospace;font-size:0.73rem;color:#99F6E4;background:rgba(255,255,255,0.06);padding:2px 8px;border-radius:4px;">VRx (P1) ➔ Math.map(x, 0, 1023, 0, 180) ➔ Servo Arquero (P0)</code>' +
                        '</div>' : '') +
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

                    '<div class="apm-ps-section-title"><i class="fas fa-clipboard-check"></i> 3. ' + (isElectronica ? 'Pasos de Armado y Conexión' : (isMakecode ? 'Pasos de Construcción y Programación MakeCode' : 'Pasos de Realización')) + '</div>' +
                    '<ol style="font-size:0.88rem;color:#334155;margin:0 0 18px;padding-left:22px;line-height:1.6;">' +
                      ((mission.instructions && mission.instructions.length > 0) ?
                        mission.instructions.map(function(st){ return '<li><strong>' + st.title + ':</strong> ' + st.desc + (st.tip ? ' <em>(' + st.tip + ')</em>' : '') + '</li>'; }).join('') :
                        (isElectronica && instructionsList && instructionsList.length > 0 ?
                          instructionsList.map(function(st){ return '<li><strong>' + st.title + ':</strong> ' + st.desc + (st.tip ? ' <em>(' + st.tip + ')</em>' : '') + '</li>'; }).join('') :
                          (isMakecode ?
                            '<li><strong>Conexión de Hardware:</strong> Conectar los sensores y servomotor a los pines correspondientes de la micro:bit.</li>' +
                            '<li><strong>Programación MakeCode:</strong> Abrir el editor de MakeCode micro:bit y programar los bloques de lectura analógica y servo.</li>' +
                            '<li><strong>Simulación y Calibración:</strong> Probar el movimiento en el simulador interactivo verificando los límites de rotación.</li>' +
                            '<li><strong>Transferencia a la Placa:</strong> Conectar la micro:bit por USB y transferir el programa compilado (.hex).</li>' :
                            '<li><strong>Diseño previo:</strong> Planificar el escenario, personajes y acciones a programar.</li>' +
                            '<li><strong>Programación:</strong> Abrir el entorno visual y estructurar los bloques paso a paso.</li>' +
                            '<li><strong>Prueba y Ajuste:</strong> Probar que la animación responda con fluidez.</li>' +
                            '<li><strong>Entrega:</strong> Guardar el avance en el panel del taller.</li>'
                          )
                        )
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
          '</div>'
        ) +
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
      modal.querySelectorAll('.apm-tab-btn').forEach(function(b){
        b.classList.toggle('active', b.dataset.tab === activeTab);
      });
      modal.querySelectorAll('.apm-tab-pane').forEach(function(p){
        var isThisTab = p.classList.contains('pane-' + activeTab);
        p.classList.toggle('active', isThisTab);
        p.style.display = isThisTab ? 'flex' : 'none';
      });
    }

    // Botones de pestañas principales
    modal.querySelectorAll('.apm-tab-btn').forEach(function(btn){
      btn.onclick = function(){
        switchApmTab(btn.dataset.tab);
      };
    });

    // Botones de acceso rápido entre pestañas (ej: Ir a Entrega)
    modal.querySelectorAll('.apm-quick-tab-btn').forEach(function(btn){
      btn.onclick = function(){
        if (btn.dataset.targetTab) switchApmTab(btn.dataset.targetTab);
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

    var switchToClase = modal.querySelector('#apm-switch-to-clase');
    var switchToCodeorg = modal.querySelector('#apm-switch-to-codeorg');
    var switchToPaint = modal.querySelector('#apm-switch-to-paint');
    var switchToElectro = modal.querySelector('#apm-switch-to-electro');
    var switchToScratch = modal.querySelector('#apm-switch-to-scratch');
    var switchToMk = modal.querySelector('#apm-switch-to-mk');
    var switchToGemini = modal.querySelector('#apm-switch-to-gemini');
    var secClase = modal.querySelector('#apm-clase-delivery-section');
    var secCodeorg = modal.querySelector('#apm-codeorg-delivery-section');
    var secPaint = modal.querySelector('#apm-paint-delivery-section');
    var secElectro = modal.querySelector('#apm-electro-delivery-section');
    var secScratch = modal.querySelector('#apm-scratch-delivery-section');
    var secMk = modal.querySelector('#apm-mk-delivery-section');
    var secGemini = modal.querySelector('#apm-gemini-delivery-section');

    function setDeliveryMode(mode) {
      if (secClase) secClase.style.display = (mode === 'clase' ? 'block' : 'none');
      if (secCodeorg) secCodeorg.style.display = (mode === 'codeorg' ? 'block' : 'none');
      if (secPaint) secPaint.style.display = (mode === 'paint' ? 'block' : 'none');
      if (secElectro) secElectro.style.display = (mode === 'electro' ? 'block' : 'none');
      if (secScratch) secScratch.style.display = (mode === 'scratch' ? 'block' : 'none');
      if (secMk) secMk.style.display = (mode === 'mk' ? 'block' : 'none');
      if (secGemini) secGemini.style.display = (mode === 'gemini' ? 'block' : 'none');

      if (switchToClase) {
        switchToClase.style.background = (mode === 'clase' ? '#15803D' : '#E2E8F0');
        switchToClase.style.color = (mode === 'clase' ? '#FFF' : '#475569');
        switchToClase.style.boxShadow = (mode === 'clase' ? '0 2px 6px rgba(21,128,61,0.3)' : 'none');
      }
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
      if (switchToGemini) {
        switchToGemini.style.background = (mode === 'gemini' ? '#4F46E5' : '#E2E8F0');
        switchToGemini.style.color = (mode === 'gemini' ? '#FFF' : '#475569');
        switchToGemini.style.boxShadow = (mode === 'gemini' ? '0 2px 6px rgba(79,70,229,0.3)' : 'none');
      }
    }

    if (switchToClase) switchToClase.onclick = function(){ if (window.sounds) window.sounds.playClick(); setDeliveryMode('clase'); };
    if (switchToCodeorg) switchToCodeorg.onclick = function(){ if (window.sounds) window.sounds.playClick(); setDeliveryMode('codeorg'); };
    if (switchToPaint) switchToPaint.onclick = function(){ if (window.sounds) window.sounds.playClick(); setDeliveryMode('paint'); };
    if (switchToElectro) switchToElectro.onclick = function(){ if (window.sounds) window.sounds.playClick(); setDeliveryMode('electro'); };
    if (switchToScratch) switchToScratch.onclick = function(){ if (window.sounds) window.sounds.playClick(); setDeliveryMode('scratch'); };
    if (switchToMk) switchToMk.onclick = function(){ if (window.sounds) window.sounds.playClick(); setDeliveryMode('mk'); };
    if (switchToGemini) switchToGemini.onclick = function(){ if (window.sounds) window.sounds.playClick(); setDeliveryMode('gemini'); };

    // Establecer modo de entrega inicial
    setDeliveryMode(isClaseActivity ? 'clase' : (isGeminiNotebooks ? 'gemini' : (isPaint ? 'paint' : (isCodeorg ? 'codeorg' : (isElectronica ? 'electro' : (isMakecode ? 'mk' : 'scratch'))))));

    // --- Subida / Completar Actividad de Clase con 1-Click ---
        var btnCompleteHalloween = modal.querySelector('#apm-btn-complete-halloween');
    if (btnCompleteHalloween) {
      btnCompleteHalloween.onclick = function() {
        if (window.sounds && window.sounds.playSuccess) window.sounds.playSuccess();
        else if (window.sounds) window.sounds.playClick();
        var nowStr = new Date().toLocaleDateString('es-ES');
        var submissionData = {
          type: 'halloween',
          date: nowStr,
          missionId: mission.id,
          missionTitle: mission.title,
          url: 'https://roboticapaulofreire-uy.github.io/libro_hechizos/'
        };
        markMissionCompleted(student, mission.id, submissionData);
        mission.status = 'completado';
        var statusEl = modal.querySelector('#apm-halloween-delivery-status');
        if (statusEl) {
          statusEl.innerHTML = '<div class="apm-status-badge success" style="padding:12px 18px;border-left:4px solid #10B981;"><i class="fas fa-trophy" style="font-size:1.4rem;color:#F59E0B;"></i> <div><strong style="color:#065F46;">¡Felicitaciones! Misión Completada ⭐ (+100 XP)</strong><br><span style="font-size:0.84rem;color:#047857;">Proyecto de Halloween registrado el ' + nowStr + ' en el sistema.</span></div></div>';
        }
        var headerBadge = modal.querySelector('#apm-header-status-badge');
        if (headerBadge) {
          headerBadge.innerHTML = '<span class="apm-lvl-badge" style="background:#10B981;margin-right:6px;"><i class="fas fa-check-circle"></i> ⭐ COMPLETADO</span>';
        }
      };
    }

    var btnSaveHalloweenLink = modal.querySelector('#apm-halloween-save-link-btn');
    if (btnSaveHalloweenLink) {
      btnSaveHalloweenLink.onclick = function() {
        var input = modal.querySelector('#apm-halloween-student-url');
        var val = input ? input.value.trim() : '';
        if (!val) return;
        if (window.sounds && window.sounds.playSuccess) window.sounds.playSuccess();
        var nowStr = new Date().toLocaleDateString('es-ES');
        markMissionCompleted(student, mission.id, { type: 'halloween', date: nowStr, url: val, missionId: mission.id, missionTitle: mission.title });
        mission.status = 'completado';
        var statusEl = modal.querySelector('#apm-halloween-delivery-status');
        if (statusEl) {
          statusEl.innerHTML = '<div class="apm-status-badge success" style="padding:12px 18px;border-left:4px solid #10B981;"><i class="fas fa-trophy" style="font-size:1.4rem;color:#F59E0B;"></i> <div><strong style="color:#065F46;">Enlace Guardado con Éxito ⭐ (+100 XP)</strong><br><span style="font-size:0.84rem;color:#047857;">' + val + '</span></div></div>';
        }
      };
    }

    var btnHalloweenMarkDone = modal.querySelector('#apm-mark-halloween-completed-btn');
    if (btnHalloweenMarkDone) {
      btnHalloweenMarkDone.onclick = function() {
        if (window.sounds && window.sounds.playSuccess) window.sounds.playSuccess();
        var nowStr = new Date().toLocaleDateString('es-ES');
        var input = modal.querySelector('#apm-halloween-student-url');
        var val = input ? input.value.trim() : '';
        markMissionCompleted(student, mission.id, { type: 'halloween', date: nowStr, url: val || 'Validado en taller', missionId: mission.id, missionTitle: mission.title });
        mission.status = 'completado';
        var statusEl = modal.querySelector('#apm-halloween-delivery-status');
        if (statusEl) {
          statusEl.innerHTML = '<div style="padding:14px 18px;background:rgba(16,185,129,0.15);border:1px solid #10B981;border-radius:10px;display:flex;align-items:center;gap:12px;"><i class="fas fa-trophy" style="font-size:1.6rem;color:#F59E0B;"></i> <div><strong style="color:#6EE7B7;font-size:0.95rem;">¡Misión Completada ⭐ (+100 XP)!</strong><br><span style="font-size:0.84rem;color:#A7F3D0;">¡Misión de Halloween validada con éxito!</span></div></div>';
        }
      };
    }

    var dropzoneHalloween = modal.querySelector('#apm-halloween-dropzone');
    var inputHalloweenFileRef = modal.querySelector('#apm-halloween-file-input');
    if (dropzoneHalloween && inputHalloweenFileRef) {
      dropzoneHalloween.onclick = function() { inputHalloweenFileRef.click(); };
      dropzoneHalloween.ondragover = function(e) { e.preventDefault(); dropzoneHalloween.style.borderColor = '#F97316'; };
      dropzoneHalloween.ondragleave = function(e) { e.preventDefault(); dropzoneHalloween.style.borderColor = '#475569'; };
      dropzoneHalloween.ondrop = function(e) {
        e.preventDefault();
        dropzoneHalloween.style.borderColor = '#10B981';
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
          inputHalloweenFileRef.files = e.dataTransfer.files;
          inputHalloweenFileRef.dispatchEvent(new Event('change'));
        }
      };
    }

    var btnHalloweenBrowse = modal.querySelector('#apm-halloween-browse-btn');
    var inputHalloweenFile = modal.querySelector('#apm-halloween-file-input');
    if (btnHalloweenBrowse && inputHalloweenFile) {
      btnHalloweenBrowse.onclick = function() { inputHalloweenFile.click(); };
      inputHalloweenFile.onchange = function() {
        if (inputHalloweenFile.files && inputHalloweenFile.files[0]) {
          var file = inputHalloweenFile.files[0];
          if (window.sounds && window.sounds.playSuccess) window.sounds.playSuccess();
          var nowStr = new Date().toLocaleDateString('es-ES');
          markMissionCompleted(student, mission.id, { type: 'halloween', fileName: file.name, date: nowStr, missionId: mission.id, missionTitle: mission.title });
          mission.status = 'completado';
          var statusEl = modal.querySelector('#apm-halloween-delivery-status');
          if (statusEl) {
            statusEl.innerHTML = '<div class="apm-status-badge success" style="padding:12px 18px;border-left:4px solid #10B981;"><i class="fas fa-trophy" style="font-size:1.4rem;color:#F59E0B;"></i> <div><strong style="color:#065F46;">Archivo de Halloween Registrado ⭐ (+100 XP)</strong><br><span style="font-size:0.84rem;color:#047857;">' + file.name + ' subido con éxito.</span></div></div>';
          }
        }
      };
    }

    var btnCompleteClase = modal.querySelector('#apm-btn-complete-clase');
    if (btnCompleteClase) {
      btnCompleteClase.onclick = function() {
        if (window.sounds && window.sounds.playSuccess) window.sounds.playSuccess();
        else if (window.sounds) window.sounds.playClick();
        var nowStr = new Date().toLocaleDateString('es-ES');
        var submissionData = {
          type: 'clase',
          date: nowStr,
          completed: true,
          missionId: mission.id,
          missionTitle: mission.title,
          fileName: 'Actividad de Clase (Completada)'
        };
        markMissionCompleted(student, mission.id, submissionData);
        var stContainer = modal.querySelector('#apm-clase-delivery-status');
        if (stContainer) {
          stContainer.innerHTML = '<div class="apm-status-badge success" style="padding:12px 18px;border-left:4px solid #10B981;margin-top:10px;"><i class="fas fa-trophy" style="font-size:1.4rem;color:#F59E0B;"></i> <div><strong style="color:#065F46;">¡Actividad Completada con Éxito! ⭐ (+100 XP)</strong><br><span style="font-size:0.84rem;color:#047857;">Se registró tu entrega de ' + mission.title + ' (' + nowStr + '). ¡Puntos y avance sumados!</span></div></div>';
        }
        var topBadge = modal.querySelector('#apm-header-status-badge');
        if (topBadge) {
          topBadge.innerHTML = '<span class="apm-lvl-badge" style="background:#10B981;margin-right:6px;"><i class="fas fa-check-circle"></i> ⭐ COMPLETADO</span>';
        }
        if (typeof refreshDashboard === 'function') refreshDashboard();
        alert('🎉 ¡Felicitaciones! Completaste la actividad: ' + mission.title + '.\nSumaste +100 XP al taller de robótica.');
      };
    }

    // --- Guardar Link de Actividad de Clase ---
    var claseSaveLinkBtn = modal.querySelector('#apm-clase-save-link-btn');
    var claseUrlInput = modal.querySelector('#apm-clase-student-url');
    if (claseSaveLinkBtn && claseUrlInput) {
      claseSaveLinkBtn.onclick = function() {
        var rawUrl = (claseUrlInput.value || '').trim();
        if (!rawUrl) {
          alert('Por favor ingresá un enlace a tu entrega o proyecto.');
          return;
        }
        if (window.sounds) window.sounds.playSuccess();
        var nowStr = new Date().toLocaleDateString('es-ES');
        var submissionData = {
          makecodeUrl: rawUrl,
          date: nowStr,
          type: 'clase',
          completed: true,
          missionId: mission.id,
          missionTitle: mission.title
        };
        markMissionCompleted(student, mission.id, submissionData);
        var topBadge = modal.querySelector('#apm-header-status-badge');
        if (topBadge) {
          topBadge.innerHTML = '<span class="apm-lvl-badge" style="background:#10B981;margin-right:6px;"><i class="fas fa-check-circle"></i> ⭐ COMPLETADO</span>';
        }
        var stContainer = modal.querySelector('#apm-clase-delivery-status');
        if (stContainer) {
          stContainer.innerHTML = '<div class="apm-status-badge success" style="padding:12px 18px;border-left:4px solid #10B981;margin-top:10px;"><i class="fas fa-trophy" style="font-size:1.4rem;color:#F59E0B;"></i> <div><strong style="color:#065F46;">¡Enlace Guardado con Éxito! ⭐ (+100 XP)</strong><br><span style="font-size:0.84rem;color:#047857;">Enlace registrado: ' + rawUrl + ' (' + nowStr + '). ¡Puntos y avance sumados!</span></div></div>';
        }
        if (typeof refreshDashboard === 'function') refreshDashboard();
        alert('🎉 ¡Felicitaciones! Guardaste tu enlace para la actividad: ' + mission.title + '.\nSumaste +100 XP.');
      };
    }

    // --- Subir Archivo/Foto para Actividad de Clase ---
    var claseDropzone = modal.querySelector('#apm-clase-dropzone');
    var claseFileInput = modal.querySelector('#apm-clase-file-input');
    var claseBrowseBtn = modal.querySelector('#apm-clase-browse-btn');
    var claseStatusEl = modal.querySelector('#apm-clase-delivery-status');

    if (claseBrowseBtn && claseFileInput) {
      claseBrowseBtn.onclick = function() { claseFileInput.click(); };
    }
    if (claseFileInput) {
      claseFileInput.onchange = function(ev) {
        if (ev.target.files && ev.target.files[0]) processClaseUpload(ev.target.files[0]);
      };
    }
    if (claseDropzone) {
      claseDropzone.ondragover = function(ev) { ev.preventDefault(); claseDropzone.classList.add('dragover'); };
      claseDropzone.ondragleave = function(ev) { ev.preventDefault(); claseDropzone.classList.remove('dragover'); };
      claseDropzone.ondrop = function(ev) {
        ev.preventDefault();
        claseDropzone.classList.remove('dragover');
        if (ev.dataTransfer.files && ev.dataTransfer.files[0]) {
          processClaseUpload(ev.dataTransfer.files[0]);
        }
      };
    }
    function processClaseUpload(file) {
      if (!file) return;
      if (window.sounds) window.sounds.playSuccess();
      var sz = formatFileSize(file.size);
      if (claseStatusEl) {
        claseStatusEl.innerHTML = '<div class="apm-status-badge warning"><i class="fas fa-sync-alt fa-spin"></i> Guardando <strong>' + file.name + '</strong> (' + sz + ')...</div>';
      }
      var reader = new FileReader();
      reader.onload = function(ev) {
        var b64 = ev.target.result.split(',')[1];
        var hook = window.GOOGLE_DRIVE_WEBHOOK_URL || (student && student.webhookUrl);
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
          type: 'clase',
          completed: true,
          missionId: mission.id,
          missionTitle: mission.title
        };
        markMissionCompleted(student, mission.id, submissionData);
        var topBadge = modal.querySelector('#apm-header-status-badge');
        if (topBadge) {
          topBadge.innerHTML = '<span class="apm-lvl-badge" style="background:#10B981;margin-right:6px;"><i class="fas fa-check-circle"></i> ⭐ COMPLETADO</span>';
        }
        if (claseStatusEl) {
          claseStatusEl.innerHTML = '<div class="apm-status-badge success" style="padding:12px 18px;border-left:4px solid #10B981;"><i class="fas fa-trophy" style="font-size:1.4rem;color:#F59E0B;"></i> <div><strong style="color:#065F46;">¡Archivo Entregado con Éxito! ⭐ (+100 XP)</strong><br><span style="font-size:0.84rem;color:#047857;">Archivo: <strong>' + file.name + '</strong> (' + sz + ' • ' + nowStr + ') guardado en tu Google Drive.</span></div></div>';
        }
        if (typeof refreshDashboard === 'function') refreshDashboard();
        alert('🎉 ¡Felicitaciones! Subiste tu archivo para la actividad: ' + mission.title + '.\nSumaste +100 XP.');
      };
      reader.readAsDataURL(file);
    }

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
        var hook = window.GOOGLE_DRIVE_WEBHOOK_URL || (student && student.webhookUrl);
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
        var hook = window.GOOGLE_DRIVE_WEBHOOK_URL || (student && student.webhookUrl);
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
        var hook = window.GOOGLE_DRIVE_WEBHOOK_URL || (student && student.webhookUrl);
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

    modal.querySelectorAll('.btn-copy-mklib-code').forEach(function(btn) {
      btn.onclick = function(e) {
        e.stopPropagation();
        var code = btn.dataset.code || '';
        function showCopied() {
          var orig = btn.innerHTML;
          btn.innerHTML = '<i class="fas fa-check"></i> ¡Copiado!';
          btn.style.background = '#10B981';
          btn.style.color = '#FFF';
          setTimeout(function(){
            btn.innerHTML = orig;
            btn.style.background = '';
            btn.style.color = '';
          }, 2000);
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(code).then(showCopied).catch(function(){
            fallbackCopyText(code, showCopied);
          });
        } else {
          fallbackCopyText(code, showCopied);
        }
      };
    });

    // ── INTERACTIVE EXPLORER & GEMINI DELIVERY HANDLERS ──
    modal.querySelectorAll('.gie-tab-btn').forEach(function(tabBtn) {
      tabBtn.onclick = function() {
        if (window.sounds) window.sounds.playClick();
        var target = tabBtn.getAttribute('data-target');
        modal.querySelectorAll('.gie-tab-btn').forEach(function(b) {
          b.classList.toggle('active', b === tabBtn);
        });
        modal.querySelectorAll('.gie-pane').forEach(function(pane) {
          if (pane.classList.contains('gie-pane-' + target)) {
            pane.style.display = 'block';
          } else {
            pane.style.display = 'none';
          }
        });
      };
    });

    // Copiar Prompts Estrella
    modal.querySelectorAll('.btn-copy-gie-prompt').forEach(function(copyBtn) {
      copyBtn.onclick = function(e) {
        e.stopPropagation();
        var promptText = copyBtn.getAttribute('data-prompt') || '';
        function showPromptCopied() {
          var origHtml = copyBtn.innerHTML;
          copyBtn.innerHTML = '<i class="fas fa-check"></i> ¡Copiado!';
          copyBtn.style.background = '#10B981';
          copyBtn.style.color = '#FFF';
          setTimeout(function() {
            copyBtn.innerHTML = origHtml;
            copyBtn.style.background = '';
            copyBtn.style.color = '';
          }, 2000);
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(promptText).then(showPromptCopied).catch(function() {
            fallbackCopyText(promptText, showPromptCopied);
          });
        } else {
          fallbackCopyText(promptText, showPromptCopied);
        }
      };
    });

    // Reproducción simulada de Audio Overview
    var audioPlayToggle = modal.querySelector('.gie-audio-play-toggle');
    if (audioPlayToggle) {
      var isAudioPlaying = false;
      audioPlayToggle.onclick = function() {
        isAudioPlaying = !isAudioPlaying;
        if (window.sounds) window.sounds.playClick();
        var waveBars = modal.querySelectorAll('.gie-wave-bar');
        var iconEl = audioPlayToggle.querySelector('i');
        if (isAudioPlaying) {
          if (iconEl) { iconEl.className = 'fas fa-pause'; }
          audioPlayToggle.style.background = '#EC4899';
          waveBars.forEach(function(bar, idx) {
            bar.style.animation = 'gieWavePulse 0.8s ease-in-out infinite alternate ' + (idx * 0.1) + 's';
          });
        } else {
          if (iconEl) { iconEl.className = 'fas fa-play'; }
          audioPlayToggle.style.background = '#4F46E5';
          waveBars.forEach(function(bar) {
            bar.style.animation = 'none';
          });
        }
      };
    }

    // Revelar respuestas de Quiz
    modal.querySelectorAll('.btn-reveal-quiz').forEach(function(qBtn) {
      qBtn.onclick = function() {
        if (window.sounds) window.sounds.playClick();
        var targetId = qBtn.getAttribute('data-target');
        var targetEl = modal.querySelector('#' + targetId);
        if (targetEl) {
          var isHidden = targetEl.style.display === 'none';
          targetEl.style.display = isHidden ? 'block' : 'none';
          qBtn.innerHTML = isHidden ? '<i class="fas fa-eye-slash"></i> Ocultar Explicación' : '<i class="fas fa-lightbulb"></i> Ver Respuesta & Citas [1]';
        }
      };
    });

    // --- Subida / Entrega de Materiales de Estudio con Gemini & NotebookLM ---
    var btnCompleteGemini = modal.querySelector('#apm-btn-complete-gemini');
    if (btnCompleteGemini) {
      btnCompleteGemini.onclick = function() {
        if (window.sounds && window.sounds.playSuccess) window.sounds.playSuccess();
        else if (window.sounds) window.sounds.playClick();

        var nowStr = new Date().toLocaleDateString('es-ES');
        var submissionData = {
          type: 'gemini_notebooks',
          url: 'https://notebooklm.google.com',
          pdfUrl: 'docs/guia_ia_gemini_notebooks.pdf',
          date: nowStr,
          completed: true,
          missionId: mission.id,
          missionTitle: mission.title,
          fileName: 'Cuaderno de Estudio IA Gemini & NotebookLM (Validado)'
        };

        markMissionCompleted(student, mission.id, submissionData);
        mission.status = 'completado';

        var stContainer = modal.querySelector('#apm-gemini-delivery-status');
        if (stContainer) {
          stContainer.innerHTML = '<div class="apm-status-badge success" style="padding:12px 18px;border-left:4px solid #10B981;margin-top:10px;"><i class="fas fa-trophy" style="font-size:1.4rem;color:#F59E0B;"></i> <div><strong style="color:#065F46;">¡Misión de Estudio con IA Completada! ⭐ (+100 XP)</strong><br><span style="font-size:0.84rem;color:#047857;">Se validó tu práctica de NotebookLM y Gemini (' + nowStr + '). ¡Puntos y avance sumados a tu taller!</span></div></div>';
        }
        var topBadge = modal.querySelector('#apm-header-status-badge');
        if (topBadge) {
          topBadge.innerHTML = '<span class="apm-lvl-badge" style="background:#10B981;margin-right:6px;"><i class="fas fa-check-circle"></i> ⭐ COMPLETADO</span>';
        }

        if (typeof refreshDashboard === 'function') refreshDashboard();
        alert('🎉 ¡Felicitaciones! Completaste el Nivel 3 de 6° Grado: Creación de Materiales de Estudio con Gemini & NotebookLM.\nSumaste +100 XP al taller.');
      };
    }

    var geminiSaveLinkBtn = modal.querySelector('#apm-gemini-save-link-btn');
    var geminiStudentUrlInput = modal.querySelector('#apm-gemini-student-url');
    if (geminiSaveLinkBtn && geminiStudentUrlInput) {
      geminiSaveLinkBtn.onclick = function() {
        var rawUrl = (geminiStudentUrlInput.value || '').trim();
        if (!rawUrl) {
          alert('Por favor ingresá el link de tu cuaderno de NotebookLM, presentación de Canva o archivo en Google Drive.');
          return;
        }
        if (window.sounds) window.sounds.playSuccess();
        var nowStr = new Date().toLocaleDateString('es-ES');
        var submissionData = {
          url: rawUrl,
          date: nowStr,
          type: 'gemini_notebooks',
          missionId: mission.id,
          missionTitle: mission.title
        };

        markMissionCompleted(student, mission.id, submissionData);
        mission.status = 'completado';

        var topBadge = modal.querySelector('#apm-header-status-badge');
        if (topBadge) {
          topBadge.innerHTML = '<span class="apm-lvl-badge" style="background:#10B981;margin-right:6px;"><i class="fas fa-check-circle"></i> ⭐ COMPLETADO</span>';
        }

        var statusEl = modal.querySelector('#apm-gemini-delivery-status');
        if (statusEl) {
          statusEl.innerHTML =
            '<div class="apm-status-badge success" style="padding:12px 18px;border-left:4px solid #10B981;">' +
              '<i class="fas fa-trophy" style="font-size:1.4rem;color:#F59E0B;"></i> ' +
              '<div>' +
                '<strong style="color:#065F46;">Misión Completada ⭐ (+100 XP)</strong><br>' +
                '<span style="font-size:0.84rem;color:#047857;">Enlace guardado: <a href="' + rawUrl + '" target="_blank" style="color:#047857;text-decoration:underline;">' + rawUrl + '</a>. ¡Tu profesor ya puede revisar tus materiales!</span>' +
              '</div>' +
            '</div>';
        }
        refreshDashboard();
      };
    }

    var geminiDropzone = modal.querySelector('#apm-gemini-dropzone');
    var geminiFileInput = modal.querySelector('#apm-gemini-file-input');
    var geminiBrowseBtn = modal.querySelector('#apm-gemini-browse-btn');
    var geminiStatusEl = modal.querySelector('#apm-gemini-delivery-status');

    if (geminiBrowseBtn && geminiFileInput) {
      geminiBrowseBtn.onclick = function() {
        geminiFileInput.click();
      };
    }

    function processGeminiUpload(file) {
      if (!file) return;
      var name = file.name.toLowerCase();
      var valid = /\.(pdf|doc|docx|txt|mp3|wav|m4a|png|jpe?g|webp|pptx)$/i.test(name);
      if (!valid) {
        if (window.sounds) window.sounds.playError();
        alert('Formato no válido. Por favor seleccioná un archivo de estudio (.pdf, .docx, .txt, .mp3, .pptx, etc.)');
        return;
      }
      if (window.sounds) window.sounds.playSuccess();
      var sz = formatFileSize(file.size);
      if (geminiStatusEl) {
        geminiStatusEl.innerHTML = '<div class="apm-status-badge warning"><i class="fas fa-sync-alt fa-spin"></i> Subiendo material de estudio <strong>' + file.name + '</strong> (' + sz + ')...</div>';
      }

      var reader = new FileReader();
      reader.onload = function(ev) {
        var b64 = ev.target.result.split(',')[1];
        var hook = window.GOOGLE_DRIVE_WEBHOOK_URL || (student && student.webhookUrl);
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
          type: 'gemini_notebooks',
          missionId: mission.id,
          missionTitle: mission.title
        };

        markMissionCompleted(student, mission.id, submissionData);
        mission.status = 'completado';

        var headerBadge = modal.querySelector('#apm-header-status-badge');
        if (headerBadge) {
          headerBadge.innerHTML = '<span class="apm-lvl-badge" style="background:#10B981;margin-right:6px;"><i class="fas fa-check-circle"></i> ⭐ COMPLETADO</span>';
        }

        if (geminiStatusEl) {
          geminiStatusEl.innerHTML =
            '<div class="apm-status-badge success" style="padding:12px 18px;border-left:4px solid #10B981;">' +
              '<i class="fas fa-trophy" style="font-size:1.4rem;color:#F59E0B;"></i> ' +
              '<div>' +
                '<strong style="color:#065F46;">Misión Completada ⭐ (+100 XP)</strong><br>' +
                '<span style="font-size:0.84rem;color:#047857;">¡Material entregado con éxito! Archivo: <strong>' + file.name + '</strong> (' + sz + ' • ' + nowStr + ') guardado en tu Google Drive.</span>' +
              '</div>' +
            '</div>';
        }

        refreshDashboard();
      };
      reader.readAsDataURL(file);
    }

    if (geminiFileInput) {
      geminiFileInput.onchange = function() {
        if (geminiFileInput.files && geminiFileInput.files.length > 0) {
          processGeminiUpload(geminiFileInput.files[0]);
        }
      };
    }

    if (geminiDropzone) {
      geminiDropzone.addEventListener('dragover', function(e){ e.preventDefault(); geminiDropzone.classList.add('drag-over'); }, false);
      geminiDropzone.addEventListener('dragleave', function(e){ e.preventDefault(); geminiDropzone.classList.remove('drag-over'); }, false);
      geminiDropzone.addEventListener('drop', function(e){
        e.preventDefault();
        geminiDropzone.classList.remove('drag-over');
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          processGeminiUpload(e.dataTransfer.files[0]);
        }
      }, false);
    }

    modal.style.display = 'flex';
    modal.style.visibility = 'visible';
    modal.style.opacity = '1';
    modal.classList.add('active');

    // Inicializar pestaña activa explícitamente
    if (typeof switchApmTab === 'function') {
      switchApmTab(activeTab);
    }
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
      if (subfolder === 'dibujo' || subfolder === 'fotos' || subfolder === 'videos') {
        // Formatos permitidos para Muro: fotos (.png, .jpg, .bmp, .webp, .gif) y videos (.mp4, .mov, .webm, .avi)
        return /\.(bmp|png|jpe?g|webp|gif|mp4|mov|webm|avi|mkv)$/i.test(name) || /^(image\/|video\/)/i.test(file.type || '');
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
        var hook = window.GOOGLE_DRIVE_WEBHOOK_URL || (student && student.webhookUrl);
        var targetSubfolder = (subfolder === 'proyecto' || subfolder === 'proyectos') ? 'proyectos' : subfolder;
        var uploadYear = (fbSelectedYear && fbSelectedYear !== 'all') ? fbSelectedYear : (new Date().getFullYear().toString());
        var uploadAlbum = (fbSelectedAlbum && fbSelectedAlbum !== 'all') ? fbSelectedAlbum : 'Taller';
        if (hook) {
          var iframe = document.getElementById('gdrive_silent_upload_iframe');
          if (!iframe){ iframe=document.createElement('iframe'); iframe.name=iframe.id='gdrive_silent_upload_iframe'; iframe.style.display='none'; document.body.appendChild(iframe); }
          var form = document.createElement('form'); form.target='gdrive_silent_upload_iframe'; form.method='POST'; form.action=hook;
          var fields = {
            filename: file.name,
            mimeType: file.type || 'application/octet-stream',
            base64: b64,
            folderId: student.driveFolderId || '',
            subfolder: targetSubfolder,
            year: uploadYear,
            album: uploadAlbum
          };
          for (var k in fields){ var i=document.createElement('input'); i.type='hidden'; i.name=k; i.value=fields[k]; form.appendChild(i); }
          document.body.appendChild(form); form.submit(); setTimeout(function(){ form.remove(); }, 2500);
        }

        var nowStr = new Date().toLocaleDateString('es-ES');
        var isCirc = isProyecto && /\.(jpe?g|png|webp|gif)$/i.test(file.name);
        var isVid  = isVideoFile(file.name, file.type);
        var type   = isCirc ? 'circuito' : (fileType || (isProyecto ? 'scratch' : (isVid ? 'video' : 'image')));
        var icon   = type==='scratch' ? '🐱' : type==='makecode' ? '💻' : type==='circuito' ? '⚡' : (isVid ? '🎬' : '📸');
        var newItem = {
          name: file.name,
          title: icon + ' ' + file.name.replace(/\.[^.]+$/,''),
          size: sz,
          date: nowStr,
          year: uploadYear,
          album: uploadAlbum,
          albumIcon: getAlbumEmoji(uploadAlbum),
          folderPath: 'fotos/' + uploadYear + '/' + uploadAlbum.toLowerCase(),
          folderName: uploadAlbum,
          url: ev.target.result,
          downloadUrl: '',
          isLocalPending: true,
          type: type,
          videoEmbedUrl: (isVid ? ev.target.result : '')
        };

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

  // Modal del Tesoro Pirata: aparece al hacer click en el cofre y desaparece automáticamente a los 5 segundos
  function openPirateTreasureModal(info) {
    if (typeof celebrateMetaArrival === 'function') {
      celebrateMetaArrival();
    }

    var existing = document.getElementById('pirate-treasure-modal-overlay');
    if (existing) {
      if (existing._autoCloseTimer) clearTimeout(existing._autoCloseTimer);
      existing.remove();
    }

    var gradeName = (info && info.gradeName) || 'este curso';
    var completedCount = (info && info.completedCount) !== undefined ? info.completedCount : 0;
    var totalCount = (info && info.totalCount) || 10;
    var xpTotal = completedCount * 100;

    var overlay = document.createElement('div');
    overlay.id = 'pirate-treasure-modal-overlay';
    overlay.className = 'pirate-treasure-modal-overlay';
    overlay.innerHTML =
      '<div class="pirate-treasure-modal-dialog" role="dialog" aria-modal="true">' +
        '<button type="button" class="pirate-tm-close-btn" aria-label="Cerrar modal">&times;</button>' +
        '<div class="pirate-tm-chest-icon">' +
          '<div class="pirate-tm-glow"></div>' +
          '<span class="pirate-tm-coins">🪙 💎 👑 💎 🪙</span>' +
        '</div>' +
        '<h3 class="pirate-tm-title">🏆 ¡Llegada al Gran Tesoro Maker!</h3>' +
        '<p class="pirate-tm-desc">' +
          '¡Felicitaciones, Capitán Maker! Superaste con valentía y creatividad los desafíos de <strong>' + gradeName + '</strong>. Dominaste algoritmos, programación, robótica e inteligencia artificial. ¡El saber es el más valioso de los tesoros!' +
        '</p>' +
        '<div class="pirate-tm-stats-row">' +
          '<div class="pirate-tm-stat-pill">' +
            '<i class="fas fa-trophy" style="color:#D97706;"></i>' +
            '<span><strong>' + completedCount + ' de ' + totalCount + '</strong> islas conquistadas</span>' +
          '</div>' +
          '<div class="pirate-tm-stat-pill">' +
            '<i class="fas fa-coins" style="color:#F59E0B;"></i>' +
            '<span><strong>+' + xpTotal + ' XP</strong> en doblones de oro</span>' +
          '</div>' +
          '<div class="pirate-tm-stat-pill">' +
            '<i class="fas fa-compass" style="color:#0284C7;"></i>' +
            '<span><strong>Galeón Paulo Freire 2026</strong></span>' +
          '</div>' +
        '</div>' +
        '<div class="pirate-tm-timer-bar-wrap">' +
          '<div class="pirate-tm-timer-bar"></div>' +
          '<span class="pirate-tm-timer-text">Se cerrará automáticamente en 5 segundos...</span>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    requestAnimationFrame(function() {
      overlay.classList.add('is-visible');
    });

    function closeModal() {
      if (!overlay || !overlay.parentNode) return;
      if (overlay._autoCloseTimer) clearTimeout(overlay._autoCloseTimer);
      overlay.classList.remove('is-visible');
      overlay.classList.add('is-closing');
      setTimeout(function() {
        if (overlay && overlay.parentNode) overlay.remove();
      }, 350);
    }

    var closeBtn = overlay.querySelector('.pirate-tm-close-btn');
    if (closeBtn) closeBtn.onclick = closeModal;

    overlay.onclick = function(e) {
      if (e.target === overlay) closeModal();
    };

    overlay._autoCloseTimer = setTimeout(function() {
      closeModal();
    }, 5000);
  }

  window.celebrateMetaArrival = celebrateMetaArrival;
  window.openPirateTreasureModal = openPirateTreasureModal;
  window.renderGDriveDashboard = renderGDriveDashboard;
  window.renderGDriveExplorer  = renderGDriveDashboard;
  window.openAdventureProjectModal = openAdventureProjectModal;
  window.getAdventureMissionsForStudent = getAdventureMissionsForStudent;
})();

