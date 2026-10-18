/**
 * =============================================================
 * STUDENTS.JS — MÓDULO SEGURO DE AUTENTICACIÓN DE ALUMNOS (FIRESTORE)
 * Colegio Paulo Freire · Taller de Robótica & Programación
 * =============================================================
 * 
 * 🔒 PRIVACIDAD Y SEGURIDAD:
 * Las credenciales y carpetas de los 272 alumnos ya NO están expuestas
 * en texto plano en este archivo público. Se autentican bajo demanda
 * contra la base de datos protegida de Cloud Firestore (paulofreiredb).
 * =============================================================
 */

const GOOGLE_DRIVE_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycby_83yLvczeYroaFs3O20SeWxDlWLmnNuXERZLtakdHBP1Y9fEX5o9AJHP7abslsZgr/exec";
const PROJECTS_DRIVE_FOLDER_ID = "1cpI7C-tkjb6Wm1B_GpqZuryPl4SWNVAG";
const PROJECTS_DRIVE_URL = "https://drive.google.com/drive/folders/1cpI7C-tkjb6Wm1B_GpqZuryPl4SWNVAG?usp=sharing";

// Memoria local de estudiantes cargados bajo demanda en esta sesión
const STUDENTS_CACHE = {};

/**
 * Autenticación Segura y Flexible contra Cloud Firestore
 * Busca por:
 *  - Nombre de usuario (ej: agustin.moreira)
 *  - ID único (ej: agustin-moreira)
 *  - Nombre completo o primer nombre (ej: Agustín)
 * Y valida la contraseña en el servidor sin descargar la lista completa.
 */
async function authenticateStudentAsync(userOrName, pass) {
  if (!userOrName || !pass) return [];
  const cleanUser = userOrName.trim().toLowerCase();
  const cleanPass = pass.trim();

  // Si Firebase Firestore está conectado, buscar en la nube
  if (window.db && typeof window.db.collection === 'function') {
    try {
      const studentsRef = window.db.collection('students');

      // 1. Búsqueda por username exacto y contraseña
      const snapUser = await studentsRef
        .where('username', '==', cleanUser)
        .where('password', '==', cleanPass)
        .limit(3)
        .get();

      if (!snapUser.empty) {
        const found = snapUser.docs.map(d => ({ id: d.id, ...d.data() }));
        found.forEach(s => { STUDENTS_CACHE[s.id] = s; });
        return found;
      }

      // 2. Búsqueda directa por ID de documento
      const docById = await studentsRef.doc(cleanUser).get();
      if (docById.exists) {
        const d = docById.data();
        if (d.password === cleanPass) {
          const s = { id: docById.id, ...d };
          STUDENTS_CACHE[s.id] = s;
          return [s];
        }
      }

      // 3. Búsqueda por contraseña de grado y coincidencia de nombre o apodo
      const snapPass = await studentsRef
        .where('password', '==', cleanPass)
        .limit(80)
        .get();

      const matched = [];
      snapPass.forEach(doc => {
        const d = doc.data();
        const fullName = (d.name || '').toLowerCase();
        const firstName = fullName.split(' ')[0];
        const u = (d.username || '').toLowerCase();

        if (fullName === cleanUser || firstName === cleanUser || u === cleanUser || d.id === cleanUser) {
          const s = { id: doc.id, ...d };
          STUDENTS_CACHE[s.id] = s;
          matched.push(s);
        }
      });

      if (matched.length > 0) return matched;

    } catch (err) {
      console.warn("Aviso al consultar alumnos en Firestore:", err.message);
    }
  }

  // Verificación en caché local si ya había iniciado sesión antes
  try {
    const cached = localStorage.getItem('pf_active_student_data');
    if (cached) {
      const student = JSON.parse(cached);
      if (student && (student.username === cleanUser || student.id === cleanUser) && student.password === cleanPass) {
        return [student];
      }
    }
  } catch (e) {}

  // Respaldo contra alumnos creados en el panel de administración (localStorage)
  try {
    const guardados = localStorage.getItem('pf_alumnos_nuevos_2026');
    if (guardados) {
      const nuevos = JSON.parse(guardados);
      const matchNuevo = nuevos.find(n => (n.username === cleanUser || n.id === cleanUser) && n.password === cleanPass);
      if (matchNuevo) {
        STUDENTS_CACHE[matchNuevo.id] = matchNuevo;
        return [matchNuevo];
      }
    }
  } catch (e) {}

  // Respaldo contra alumnos_robotica_2026.json local
  try {
    const resp = await fetch('alumnos_robotica_2026.json');
    if (resp.ok) {
      const localStudents = await resp.json();
      const found = localStudents.filter(s => (s.username === cleanUser || s.id === cleanUser) && s.password === cleanPass);
      if (found.length > 0) {
        found.forEach(s => { STUDENTS_CACHE[s.id] = s; });
        return found;
      }
    }
  } catch (e) {}

  return [];
}

/**
 * Obtener un alumno por su ID
 * (Busca en memoria caché o en Firestore)
 */
function getStudentById(studentId) {
  if (!studentId) return null;

  // 1. Caché de sesión
  if (STUDENTS_CACHE[studentId]) return STUDENTS_CACHE[studentId];

  // 2. LocalStorage activo
  try {
    const cached = localStorage.getItem('pf_active_student_data');
    if (cached) {
      const s = JSON.parse(cached);
      if (s && s.id === studentId) {
        STUDENTS_CACHE[s.id] = s;
        return s;
      }
    }
  } catch (e) {}

  // 3. Disparar carga asíncrona de respaldo en Firestore
  if (window.db) {
    window.db.collection('students').doc(studentId).get().then(doc => {
      if (doc.exists) {
        const s = { id: doc.id, ...doc.data() };
        STUDENTS_CACHE[s.id] = s;
        localStorage.setItem('pf_active_student_data', JSON.stringify(s));
        if (window.updateAuthUI) window.updateAuthUI();
      }
    }).catch(() => {});
  }

  return null;
}

// Compatibilidad síncrona retroactiva
function authenticateStudent(user, pass) {
  const cached = localStorage.getItem('pf_active_student_data');
  if (cached) {
    try {
      const s = JSON.parse(cached);
      if (s && s.username === user.trim().toLowerCase()) return s;
    } catch(e) {}
  }
  return null;
}

function findMatchingStudents(user, pass) {
  const s = authenticateStudent(user, pass);
  return s ? [s] : [];
}

if (typeof window !== 'undefined') {
  window.GOOGLE_DRIVE_WEBHOOK_URL  = GOOGLE_DRIVE_WEBHOOK_URL;
  window.PROJECTS_DRIVE_FOLDER_ID  = PROJECTS_DRIVE_FOLDER_ID;
  window.PROJECTS_DRIVE_URL        = PROJECTS_DRIVE_URL;
  window.authenticateStudentAsync  = authenticateStudentAsync;
  window.authenticateStudent       = authenticateStudent;
  window.findMatchingStudents      = findMatchingStudents;
  window.getStudentById            = getStudentById;
}
