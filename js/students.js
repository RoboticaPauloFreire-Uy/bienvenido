/**
 * =============================================================
 * BASE DE DATOS DE ALUMNOS & CARPETAS DE GOOGLE DRIVE + FIRESTORE
 * =============================================================
 */

const GOOGLE_DRIVE_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycby_83yLvczeYroaFs3O20SeWxDlWLmnNuXERZLtakdHBP1Y9fEX5o9AJHP7abslsZgr/exec";

// Carpeta global de Proyectos compartida por grado
const PROJECTS_DRIVE_FOLDER_ID = "1cpI7C-tkjb6Wm1B_GpqZuryPl4SWNVAG";
const PROJECTS_DRIVE_URL = "https://drive.google.com/drive/folders/1cpI7C-tkjb6Wm1B_GpqZuryPl4SWNVAG?usp=sharing";

// Datos locales de respaldo (offline / inicial)
const DEFAULT_STUDENTS_DATA = [
  // SALA DE 5 AÑOS
  {
    id: "agustin-moreira",
    name: "Agustín Moreira",
    username: "agustin",
    password: "5anos",
    gradeId: "sala5",
    gradeName: "Sala de 5 años",
    avatar: "👦",
    driveFolderId: "1z6VUx7Emu_I9cYku9ZReoAFevZrWTHS4",
    driveUrl: "https://drive.google.com/drive/folders/1z6VUx7Emu_I9cYku9ZReoAFevZrWTHS4?usp=drive_link",
    webhookUrl: "https://script.google.com/macros/s/AKfycby_83yLvczeYroaFs3O20SeWxDlWLmnNuXERZLtakdHBP1Y9fEX5o9AJHP7abslsZgr/exec"
  }
];

const STUDENTS_DATA = [...DEFAULT_STUDENTS_DATA];

function getStudentsByGrade(gradeId) {
  return STUDENTS_DATA.filter(s => s.gradeId === gradeId);
}

function getStudentById(studentId) {
  return STUDENTS_DATA.find(s => s.id === studentId) || null;
}

function authenticateStudent(username, password) {
  if (!username || !password) return null;
  const u = username.trim().toLowerCase();
  const p = password.trim();
  return STUDENTS_DATA.find(s => s.username.toLowerCase() === u && s.password === p) || null;
}

function addStudent(studentObj) {
  const existingIdx = STUDENTS_DATA.findIndex(s => s.id === studentObj.id || s.username.toLowerCase() === (studentObj.username || '').toLowerCase());
  if (existingIdx >= 0) {
    STUDENTS_DATA[existingIdx] = studentObj;
  } else {
    STUDENTS_DATA.push(studentObj);
  }
}

// ── Sincronización en tiempo real con Cloud Firestore ──────────
function initFirestoreSync() {
  if (!window.db) {
    setTimeout(initFirestoreSync, 300);
    return;
  }

  try {
    const studentsCol = window.db.collection('students');

    studentsCol.onSnapshot((snapshot) => {
      if (snapshot.empty) {
        console.log("🌱 Firestore vacío: sembrando alumno inicial en la nube...");
        seedInitialStudents();
        return;
      }

      const remoteList = [];
      snapshot.forEach((doc) => {
        remoteList.push({ id: doc.id, ...doc.data() });
      });

      if (remoteList.length > 0) {
        STUDENTS_DATA.length = 0;
        remoteList.forEach(s => STUDENTS_DATA.push(s));
        console.log("☁️ Firestore conectado: " + STUDENTS_DATA.length + " alumno(s) sincronizados desde la nube.");
        window.dispatchEvent(new CustomEvent('students_data_updated', { detail: STUDENTS_DATA }));
        if (window.updateAuthUI) window.updateAuthUI();
      }
    }, (error) => {
      console.warn("⚠️ Aviso Firestore (usando datos de respaldo):", error.message);
    });
  } catch (err) {
    console.warn("Error al inicializar listener de Firestore:", err);
  }
}

// Sube alumnos iniciales a Firestore si la base de datos está vacía
async function seedInitialStudents() {
  if (!window.db) return;
  try {
    for (const student of DEFAULT_STUDENTS_DATA) {
      await window.db.collection('students').doc(student.id).set(student);
    }
    console.log("✅ Alumno inicial cargado en Firestore con éxito.");
  } catch (e) {
    console.warn("Aviso al sembrar en Firestore:", e);
  }
}

// Guardar o modificar alumno en Firestore
async function saveStudentToFirestore(studentObj) {
  if (!studentObj.id) {
    studentObj.id = (studentObj.username || 'alumno').toLowerCase().replace(/\s+/g, '-');
  }
  addStudent(studentObj);
  if (window.db) {
    try {
      await window.db.collection('students').doc(studentObj.id).set(studentObj, { merge: true });
      console.log("✅ Alumno guardado en Firestore:", studentObj.name);
      return true;
    } catch (e) {
      console.error("Error guardando en Firestore:", e);
      return false;
    }
  }
  return true;
}

if (typeof window !== 'undefined') {
  window.GOOGLE_DRIVE_WEBHOOK_URL = GOOGLE_DRIVE_WEBHOOK_URL;
  window.PROJECTS_DRIVE_FOLDER_ID = PROJECTS_DRIVE_FOLDER_ID;
  window.PROJECTS_DRIVE_URL       = PROJECTS_DRIVE_URL;
  window.STUDENTS_DATA            = STUDENTS_DATA;
  window.getStudentsByGrade       = getStudentsByGrade;
  window.getStudentById           = getStudentById;
  window.authenticateStudent      = authenticateStudent;
  window.addStudent               = addStudent;
  window.saveStudentToFirestore   = saveStudentToFirestore;
  window.seedInitialStudents      = seedInitialStudents;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFirestoreSync);
  } else {
    initFirestoreSync();
  }
}
