/**
 * =========================================================================
 * WEBHOOK GOOGLE DRIVE — COLEGIO PAULO FREIRE (TALLER DE ROBÓTICA)
 * =========================================================================
 * Google Apps Script para listar y organizar Fotos & Videos por Año y Álbum/Carpeta,
 * soportando subcarpetas recursivas (ej: fotos -> 2026 -> eventos -> halloween).
 *
 * INSTRUCCIONES DE INSTALACIÓN:
 * 1. Abrí https://script.google.com
 * 2. Abrí tu proyecto de Google Apps Script existente (o creá uno nuevo).
 * 3. Reemplazá todo el código de 'Código.gs' con este archivo.
 * 4. Hacé clic en "Implementar" (Deploy) > "Nueva implementación" (New deployment).
 * 5. Tipo: "Aplicación web" (Web App).
 * 6. Ejecutar como: "Yo" (tu cuenta de Google).
 * 7. Quién tiene acceso: "Cualquier usuario" (Anyone).
 * 8. Hacé clic en "Implementar" y copiá la URL de la aplicación web.
 * =========================================================================
 */

// Extensiones de archivos multimedia soportados
var IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.bmp', '.webp', '.gif', '.svg'];
var VIDEO_EXTS = ['.mp4', '.mov', '.webm', '.mkv', '.avi', '.m4v', '.3gp', '.ogv'];
var PROJECT_EXTS = ['.sjr', '.sb3', '.pjson', '.sb', '.hex', '.uf2'];

/**
 * Manejo de peticiones GET: listar archivos y carpetas
 */
function doGet(e) {
  try {
    var p = e.parameter || {};
    var action = (p.action || 'list').toLowerCase();
    var folderId = p.folderId || '';
    var subfolderName = (p.subfolder || 'fotos').toLowerCase();

    if (!folderId) {
      return makeJsonResponse({ status: 'error', message: 'Falta el parámetro folderId' }, 400);
    }

    var rootFolder = DriveApp.getFolderById(folderId);
    if (!rootFolder) {
      return makeJsonResponse({ status: 'error', message: 'Carpeta no encontrada con el ID provisto' }, 404);
    }

    // ─────────────────────────────────────────────────────────────
    // CASO 1: CARPETA FOTOS / DIBUJOS / VIDEOS (RECORRIDO RECURSIVO)
    // ─────────────────────────────────────────────────────────────
    if (subfolderName === 'fotos' || subfolderName === 'dibujo' || subfolderName === 'videos') {
      var targetFolder = findSubfolderByName(rootFolder, ['fotos', 'foto', 'dibujo', 'dibujos', 'videos', 'video']);
      var folderToScan = targetFolder || rootFolder;

      var scanResults = scanMediaRecursively(folderToScan, folderToScan.getName(), null);

      return makeJsonResponse({
        status: 'ok',
        folder: folderToScan.getName(),
        totalFiles: scanResults.files.length,
        years: scanResults.years,
        albums: scanResults.albums,
        files: scanResults.files
      });
    }

    // ─────────────────────────────────────────────────────────────
    // CASO 2: CARPETA PROYECTOS (SCRATCH JR / MAKECODE)
    // ─────────────────────────────────────────────────────────────
    if (subfolderName === 'proyectos' || subfolderName === 'proyecto') {
      var projFolder = findSubfolderByName(rootFolder, ['proyectos', 'proyecto']);
      var folderToScanProj = projFolder || rootFolder;
      var projFiles = listProjectFiles(folderToScanProj);

      return makeJsonResponse({
        status: 'ok',
        folder: folderToScanProj.getName(),
        count: projFiles.length,
        files: projFiles
      });
    }

    // ─────────────────────────────────────────────────────────────
    // CASO 3: CUALQUIER OTRA SUBCARPETA POR NOMBRE EXACTO
    // ─────────────────────────────────────────────────────────────
    var customFolder = findSubfolderByName(rootFolder, [subfolderName]);
    if (customFolder) {
      var customFiles = scanMediaRecursively(customFolder, customFolder.getName(), null);
      return makeJsonResponse({
        status: 'ok',
        folder: customFolder.getName(),
        totalFiles: customFiles.files.length,
        years: customFiles.years,
        albums: customFiles.albums,
        files: customFiles.files
      });
    }

    // Si no se encontró la subcarpeta, devolver lista vacía con estado OK
    return makeJsonResponse({
      status: 'ok',
      folder: subfolderName,
      totalFiles: 0,
      years: [],
      albums: [],
      files: []
    });

  } catch (err) {
    return makeJsonResponse({
      status: 'error',
      message: err.toString(),
      stack: err.stack
    }, 500);
  }
}

/**
 * Escaneo recursivo de fotos y videos identificando Año y Álbum
 */
function scanMediaRecursively(folder, currentPath, currentYear) {
  var fileList = [];
  var yearsSet = {};
  var albumsMap = {};

  var folderName = folder.getName();

  // Detectar si la carpeta actual representa un año (ej: 2026, 2025, 2024...)
  var yearMatch = folderName.match(/\b(20\d{2})\b/);
  var detectedYear = yearMatch ? yearMatch[1] : (currentYear || null);

  // 1. Procesar archivos de la carpeta actual
  var files = folder.getFiles();
  while (files.hasNext()) {
    var file = files.next();
    var name = file.getName();
    var mime = file.getMimeType();

    var isVid = isVideo(name, mime);
    var isImg = isImage(name, mime);

    if (isVid || isImg) {
      var createdDate = file.getDateCreated();
      var fileYear = detectedYear || Utilities.formatDate(createdDate, "America/Montevideo", "yyyy");
      var albumName = extractAlbumName(currentPath, folderName, fileYear);

      yearsSet[fileYear] = true;

      if (!albumsMap[albumName]) {
        albumsMap[albumName] = {
          name: albumName,
          icon: getAlbumIcon(albumName),
          year: fileYear,
          count: 0
        };
      }
      albumsMap[albumName].count++;

      fileList.push({
        id: file.getId(),
        name: name,
        title: name.replace(/\.[^.]+$/, ''),
        type: isVid ? 'video' : 'image',
        mimeType: mime,
        size: formatSize(file.getSize()),
        bytes: file.getSize(),
        date: Utilities.formatDate(createdDate, "America/Montevideo", "dd/MM/yyyy HH:mm"),
        updated: Utilities.formatDate(file.getLastUpdated(), "America/Montevideo", "dd/MM/yyyy HH:mm"),
        year: fileYear,
        album: albumName,
        folderPath: currentPath,
        folderName: folderName,
        downloadUrl: 'https://drive.google.com/uc?export=download&id=' + file.getId(),
        viewUrl: file.getUrl(),
        thumbnailUrl: 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1200',
        videoEmbedUrl: isVid ? ('https://drive.google.com/file/d/' + file.getId() + '/preview') : ''
      });
    }
  }

  // 2. Procesar subcarpetas recursivamente
  var subfolders = folder.getFolders();
  while (subfolders.hasNext()) {
    var sub = subfolders.next();
    var subPath = currentPath + '/' + sub.getName();
    var subResults = scanMediaRecursively(sub, subPath, detectedYear);

    fileList = fileList.concat(subResults.files);

    subResults.years.forEach(function (y) { yearsSet[y] = true; });
    subResults.albums.forEach(function (alb) {
      if (!albumsMap[alb.name]) {
        albumsMap[alb.name] = {
          name: alb.name,
          icon: alb.icon || getAlbumIcon(alb.name),
          year: alb.year || detectedYear || '2026',
          count: 0
        };
      }
      albumsMap[alb.name].count += alb.count;
    });
  }

  // Ordenar años de más reciente a más antiguo
  var sortedYears = Object.keys(yearsSet).sort(function (a, b) { return b - a; });
  var albumsArray = Object.keys(albumsMap).map(function (k) { return albumsMap[k]; });

  return {
    files: fileList,
    years: sortedYears,
    albums: albumsArray
  };
}

/**
 * Listar archivos de proyectos (Scratch Jr, MakeCode)
 */
function listProjectFiles(folder) {
  var list = [];
  var files = folder.getFiles();
  while (files.hasNext()) {
    var file = files.next();
    var name = file.getName();
    var ext = getExtension(name);

    if (PROJECT_EXTS.indexOf(ext) !== -1) {
      var isScratch = (ext === '.sjr' || ext === '.sb3' || ext === '.sb' || ext === '.pjson');
      list.push({
        id: file.getId(),
        name: name,
        title: name.replace(/\.[^.]+$/, ''),
        type: isScratch ? 'scratch' : 'makecode',
        size: formatSize(file.getSize()),
        date: Utilities.formatDate(file.getDateCreated(), "America/Montevideo", "dd/MM/yyyy HH:mm"),
        downloadUrl: 'https://drive.google.com/uc?export=download&id=' + file.getId(),
        url: file.getUrl()
      });
    }
  }
  return list;
}

/**
 * Extraer nombre de álbum intuitivo a partir de la ruta
 * Ej: "Fotos/2026/Eventos/Halloween" -> "Halloween"
 * Ej: "Fotos/2026/Eventos" -> "Eventos"
 * Ej: "Fotos/2026" -> "Taller 2026"
 */
function extractAlbumName(path, folderName, year) {
  var parts = path.split('/').map(function (s) { return s.trim(); }).filter(Boolean);

  // Buscar desde el final el primer nombre que no sea "fotos", "dibujo" ni el año
  for (var i = parts.length - 1; i >= 0; i--) {
    var p = parts[i];
    var low = p.toLowerCase();
    if (!low.match(/^20\d{2}$/) && low !== 'fotos' && low !== 'foto' && low !== 'dibujo' && low !== 'videos') {
      return capitalize(p);
    }
  }

  return year ? ('Taller ' + year) : 'General';
}

/**
 * Asignar ícono temático según el nombre del álbum
 */
function getAlbumIcon(albumName) {
  var low = (albumName || '').toLowerCase();
  if (low.indexOf('halloween') !== -1) return '🎃';
  if (low.indexOf('navidad') !== -1 || low.indexOf('fiesta') !== -1) return '🎄';
  if (low.indexOf('muestra') !== -1 || low.indexOf('feria') !== -1 || low.indexOf('expo') !== -1) return '🔬';
  if (low.indexOf('familia') !== -1 || low.indexOf('madre') !== -1 || low.indexOf('padre') !== -1) return '👨‍👩‍👧';
  if (low.indexOf('evento') !== -1 || low.indexOf('festejo') !== -1) return '🎉';
  if (low.indexOf('robot') !== -1 || low.indexOf('microbit') !== -1) return '🤖';
  if (low.indexOf('paint') !== -1 || low.indexOf('dibujo') !== -1) return '🎨';
  if (low.indexOf('poke') !== -1 || low.indexOf('juego') !== -1) return '🎮';
  if (low.indexOf('despedida') !== -1 || low.indexOf('egresad') !== -1 || low.indexOf('gradua') !== -1) return '🎓';
  if (low.indexOf('video') !== -1) return '🎬';
  return '📁';
}

/**
 * Buscar subcarpeta por lista de posibles nombres (insensible a mayúsculas)
 */
function findSubfolderByName(parentFolder, candidates) {
  var folders = parentFolder.getFolders();
  while (folders.hasNext()) {
    var f = folders.next();
    var nameLower = f.getName().toLowerCase();
    for (var i = 0; i < candidates.length; i++) {
      if (nameLower === candidates[i].toLowerCase()) {
        return f;
      }
    }
  }
  return null;
}

/**
 * Manejo de subida de archivos (POST)
 */
function doPost(e) {
  try {
    var p = e.parameter || {};
    var folderId = p.folderId;
    var filename = p.filename || ('archivo_' + new Date().getTime());
    var mimeType = p.mimeType || 'application/octet-stream';
    var base64Data = p.base64;
    var subfolderParam = (p.subfolder || 'fotos').toLowerCase();
    var yearParam = p.year || '2026';
    var albumParam = p.album || '';

    if (!folderId || !base64Data) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Faltan datos obligatorios (folderId o base64)' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var rootFolder = DriveApp.getFolderById(folderId);
    var targetFolder = rootFolder;

    // Si es subida de fotos/videos, colocar en fotos -> año -> album (si corresponde)
    if (subfolderParam === 'fotos' || subfolderParam === 'dibujo' || subfolderParam === 'videos') {
      var fotosFolder = getOrCreateFolder(rootFolder, 'Fotos');
      var yearFolder = getOrCreateFolder(fotosFolder, yearParam);
      targetFolder = yearFolder;

      if (albumParam) {
        targetFolder = getOrCreateFolder(yearFolder, albumParam);
      }
    } else if (subfolderParam === 'proyectos' || subfolderParam === 'proyecto') {
      targetFolder = getOrCreateFolder(rootFolder, 'Proyectos');
    }

    var bytes = Utilities.base64Decode(base64Data);
    var blob = Utilities.newBlob(bytes, mimeType, filename);
    var createdFile = targetFolder.createFile(blob);

    return ContentService.createTextOutput(JSON.stringify({
      status: 'ok',
      id: createdFile.getId(),
      name: createdFile.getName(),
      url: createdFile.getUrl()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateFolder(parent, name) {
  var folders = parent.getFoldersByName(name);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parent.createFolder(name);
}

function isImage(name, mime) {
  if (mime && mime.indexOf('image/') === 0) return true;
  var ext = getExtension(name);
  return IMAGE_EXTS.indexOf(ext) !== -1;
}

function isVideo(name, mime) {
  if (mime && mime.indexOf('video/') === 0) return true;
  var ext = getExtension(name);
  return VIDEO_EXTS.indexOf(ext) !== -1;
}

function getExtension(name) {
  var m = (name || '').match(/(\.[^.]+)$/);
  return m ? m[1].toLowerCase() : '';
}

function formatSize(bytes) {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function makeJsonResponse(data, statusCode) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
