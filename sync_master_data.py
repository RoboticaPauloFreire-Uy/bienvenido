import json

with open('c:/Users/Admin/Desktop/pagina/alumnos_robotica_2026.json', 'r', encoding='utf-8') as f:
    robotica_list = json.load(f)

json_str = json.dumps(robotica_list, ensure_ascii=False, indent=2)

header = """/**
 * =============================================================
 * BASE DE DATOS DE ALUMNOS & CARPETAS DE GOOGLE DRIVE + FIRESTORE
 * =============================================================
 * Contiene los alumnos de la escuela (Sala de 5 años hasta 6° Grado)
 * sincronizados con credenciales únicas: usuario (3 nombre + 3 apellido) y PIN secreto.
 */

const GOOGLE_DRIVE_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbxZMCUvLtMmBxCldF8wps9yjWuE7OSWJGm384DpH5ppwvSPiiX_pvM_wNvu6nd08Q2q9g/exec";
const PROJECTS_DRIVE_FOLDER_ID = "1cpI7C-tkjb6Wm1B_GpqZuryPl4SWNVAG";
const PROJECTS_DRIVE_URL = "https://drive.google.com/drive/folders/1cpI7C-tkjb6Wm1B_GpqZuryPl4SWNVAG?usp=sharing";

const DEFAULT_STUDENTS_DATA = """

footer = """;

if (typeof window !== 'undefined') {
  window.DEFAULT_STUDENTS_DATA = DEFAULT_STUDENTS_DATA;
}
"""

with open('c:/Users/Admin/Desktop/pagina-admin/js/students-master-data.js', 'w', encoding='utf-8') as f:
    f.write(header + json_str + footer)

print(f"students-master-data.js actualizado con {len(robotica_list)} alumnos.")
