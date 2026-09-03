/**
 * =============================================================
 * BASE DE DATOS DE ALUMNOS & CARPETAS DE GOOGLE DRIVE
 * =============================================================
 */

const GOOGLE_DRIVE_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycby_83yLvczeYroaFs3O20SeWxDlWLmnNuXERZLtakdHBP1Y9fEX5o9AJHP7abslsZgr/exec";

// Carpeta global de Proyectos compartida por grado
const PROJECTS_DRIVE_FOLDER_ID = "1cpI7C-tkjb6Wm1B_GpqZuryPl4SWNVAG";
const PROJECTS_DRIVE_URL = "https://drive.google.com/drive/folders/1cpI7C-tkjb6Wm1B_GpqZuryPl4SWNVAG?usp=sharing";

const STUDENTS_DATA = [
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
  STUDENTS_DATA.push(studentObj);
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
}
