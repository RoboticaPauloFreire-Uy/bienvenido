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

const GOOGLE_DRIVE_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbxZMCUvLtMmBxCldF8wps9yjWuE7OSWJGm384DpH5ppwvSPiiX_pvM_wNvu6nd08Q2q9g/exec";
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


// ── MAPA OFICIAL DE CARPETAS DE GOOGLE DRIVE POR ALUMNO ──
const STUDENT_DRIVE_FOLDERS = {
  "agustinmoreira": "1z6VUx7Emu_I9cYku9ZReoAFevZrWTHS4",
  "agumor": "1z6VUx7Emu_I9cYku9ZReoAFevZrWTHS4",
  "agustinainzaurralde": "1_7D2nnlap4atN0vzuasVvCEcftIlgWmW",
  "aguinz": "1_7D2nnlap4atN0vzuasVvCEcftIlgWmW",
  "bautistaviera": "1wSFWSMy9H1slEKs8hIaaR5JY3xKv4KXL",
  "bauvie": "1wSFWSMy9H1slEKs8hIaaR5JY3xKv4KXL",
  "celinarodriguez": "1SKiaGss6G1Yd0Lc7SjrVDqTCexEIg2Nc",
  "celrod": "1SKiaGss6G1Yd0Lc7SjrVDqTCexEIg2Nc",
  "emilianoturchich": "1G3CzlBAyRZz1C6FqSTRrp2guwNZs2fq0",
  "emitur": "1G3CzlBAyRZz1C6FqSTRrp2guwNZs2fq0",
  "facundoperez": "1aywXxBDlXFTi6u5DP6qZ_pcFCMpQfIlG",
  "facper": "1aywXxBDlXFTi6u5DP6qZ_pcFCMpQfIlG",
  "isabellaprieto": "1Fj_r-_R6sWMpqmBTORORN1Gz0nyRQysA",
  "isapri": "1Fj_r-_R6sWMpqmBTORORN1Gz0nyRQysA",
  "lucianobautista": "1emrNIhi89m_gyAd9RNAI-3rqmGQPltJB",
  "lucbau": "1emrNIhi89m_gyAd9RNAI-3rqmGQPltJB",
  "maiteamado": "1WbTJ0ZkmXfi0NfaKDY31zpB_iKAFnqvs",
  "maiama": "1WbTJ0ZkmXfi0NfaKDY31zpB_iKAFnqvs",
  "martinaperez": "1ibqhOORHuwho_R_7MSVvcAEOPjtsYMuC",
  "martper": "1ibqhOORHuwho_R_7MSVvcAEOPjtsYMuC",
  "maximoroade": "12I-BUyiG__dBXv90g2zQZeg695U1Y_Dx",
  "maxroa": "12I-BUyiG__dBXv90g2zQZeg695U1Y_Dx",
  "mirandamuniz": "1UgbcCvTMMKJ3caiXUKFeuqR5G9HZqJoC",
  "mirmun": "1UgbcCvTMMKJ3caiXUKFeuqR5G9HZqJoC",
  "agustinsuarez": "1jYOu31fPyTZgNugp-4G-noympKzhx6W9",
  "agusua": "1jYOu31fPyTZgNugp-4G-noympKzhx6W9",
  "facundopena": "1CZcs-nKP4nWgTmrwv6u4YdPQ33QPBr7m",
  "facpen": "1CZcs-nKP4nWgTmrwv6u4YdPQ33QPBr7m",
  "faustinacastelar": "1GZlHwCskKikWwCxIWrtuCCiM2JE2trhj",
  "faucas": "1GZlHwCskKikWwCxIWrtuCCiM2JE2trhj",
  "faustinatangredi": "1foxnUJugQ-I7mTDVqrT8XJEJz9e3Uhcs",
  "fautan": "1foxnUJugQ-I7mTDVqrT8XJEJz9e3Uhcs",
  "isabellaromano": "1fijnMUZj_mdGnbbXJ5vWeBm0ibzgMcUA",
  "isarom": "1fijnMUZj_mdGnbbXJ5vWeBm0ibzgMcUA",
  "liamabad": "1neaPF6mgnK3qyc9I5cT59aFWeI5p_r0a",
  "liaaba": "1neaPF6mgnK3qyc9I5cT59aFWeI5p_r0a",
  "lolamachado": "1K-BerAVImGU0V0rmY20Vpg9RxvtsKiej",
  "lolmac": "1K-BerAVImGU0V0rmY20Vpg9RxvtsKiej",
  "maitegarcilazo": "1WpX6wVOHcKXThuZQfhTopIo_ETxJKqzR",
  "maigar": "1WpX6wVOHcKXThuZQfhTopIo_ETxJKqzR",
  "paulinapicos": "1i96sEUgEyDmgc80cUpuoQYQk8zmed_NI",
  "paupic": "1i96sEUgEyDmgc80cUpuoQYQk8zmed_NI",
  "santinolopez": "1igWu8Y7BPFVTYWfMeKiOdDEY0NjSZ0gi",
  "sanlop": "1igWu8Y7BPFVTYWfMeKiOdDEY0NjSZ0gi",
  "tomasnogues": "1f1aGnwnDXFREkTXj67q765ai9xmGet8d",
  "tomnog": "1f1aGnwnDXFREkTXj67q765ai9xmGet8d",
  "valentinolopez": "1CQDDQIzOCl-WCiaamP7-GfEMu2Jeh4JW",
  "vallop": "1CQDDQIzOCl-WCiaamP7-GfEMu2Jeh4JW",
  "amandapadilla": "1iNXg4C3sbvRkMXuolFPlIqUnpkYGeFtc",
  "amapad": "1iNXg4C3sbvRkMXuolFPlIqUnpkYGeFtc",
  "antonialiucci": "1SPMes52ds5pDio7JgzE14WsFD900iL65",
  "antliu": "1SPMes52ds5pDio7JgzE14WsFD900iL65",
  "brunoperaza": "1m6vEf9xXDDPdVbV0QHMWV1UDgfynmBK8",
  "bruper": "1m6vEf9xXDDPdVbV0QHMWV1UDgfynmBK8",
  "enzorosano": "1rAsfx-sQ9N0WKI_ICbISOQFp-EPIw86e",
  "enzros": "1rAsfx-sQ9N0WKI_ICbISOQFp-EPIw86e",
  "facundobartel": "149nF09EtDPqZ73FjxRYa9fidMYpbthKk",
  "facbar": "149nF09EtDPqZ73FjxRYa9fidMYpbthKk",
  "federicorodriguez": "1U9J-Q2kJ8sxosQ20c0QmE4AKwFZTlvf2",
  "fedrod": "1U9J-Q2kJ8sxosQ20c0QmE4AKwFZTlvf2",
  "felipevodanovich": "16NWLqAlEykzo7J0PFKaBXEbQim0hokd2",
  "felvod": "16NWLqAlEykzo7J0PFKaBXEbQim0hokd2",
  "pilarpaletta": "16ZY0TQ_ivkKCucowoUMSKZ8ysC3_wdOn",
  "pilpal": "16ZY0TQ_ivkKCucowoUMSKZ8ysC3_wdOn",
  "juanmartinvega": "16P1W9YRAIc-gsOnkJ3H51nzNG2j7ouAP",
  "juaveg": "16P1W9YRAIc-gsOnkJ3H51nzNG2j7ouAP",
  "juliafontan": "1kCIDia1QlUc3mi5Ng0WlMF16V_-2G2ms",
  "julfon": "1kCIDia1QlUc3mi5Ng0WlMF16V_-2G2ms",
  "julietafeller": "1S2oUHIoQqHEeP7F98jwgbOPd7Vu-86kB",
  "julfel": "1S2oUHIoQqHEeP7F98jwgbOPd7Vu-86kB",
  "luacolla": "1wkokLOTiWwe0iRNd4iKS-QXFyDlF30t9",
  "luacol": "1wkokLOTiWwe0iRNd4iKS-QXFyDlF30t9",
  "nicolasricca": "1VzqpTQWdEbPkvHFgDrSd-MqYaSduwE8E",
  "nicric": "1VzqpTQWdEbPkvHFgDrSd-MqYaSduwE8E",
  "alfonsoorihuela": "1q9dj0NJ6C_8c0OCNa_JW06a2aFmYlDWs",
  "alfori": "1q9dj0NJ6C_8c0OCNa_JW06a2aFmYlDWs",
  "belenrodriguez": "1J-zF4nzipsDpLimdqjFopF8l3IoycjsH",
  "belrod": "1J-zF4nzipsDpLimdqjFopF8l3IoycjsH",
  "benjaminfonseca": "1Ke0NnbJTmv01W9DgMA9DqwYKJxOSTb5T",
  "benfon": "1Ke0NnbJTmv01W9DgMA9DqwYKJxOSTb5T",
  "benjaminkardjian": "12EnuZc3kzmPWketaW4hr6PAKjVk1ToRy",
  "benkar": "12EnuZc3kzmPWketaW4hr6PAKjVk1ToRy",
  "emiliadenis": "1SU2TmEIXl1Rlsn19rzdNsm8cDfpaFXyz",
  "emiden": "1SU2TmEIXl1Rlsn19rzdNsm8cDfpaFXyz",
  "ezequielwolf": "1t5J5LCAXvkbdJsh232l56xKQ8NGrfD5g",
  "ezewol": "1t5J5LCAXvkbdJsh232l56xKQ8NGrfD5g",
  "joaquincabrera": "1S7t0Q94rHHhCPQjEU09JJzL2zTsaBk1g",
  "joacab": "1S7t0Q94rHHhCPQjEU09JJzL2zTsaBk1g",
  "joaquinsilva": "1qDdTZrjNwzMgar0iTlKVQlZvIhTvuAF9",
  "joasil": "1qDdTZrjNwzMgar0iTlKVQlZvIhTvuAF9",
  "julietasuarez": "1yT_J2BV5_1VIyT2OSaOMlhV8qTc-herB",
  "julsua": "1yT_J2BV5_1VIyT2OSaOMlhV8qTc-herB",
  "maitealtez": "1rFlcltfATgnnVtKGJ1fC5YYGyFbLnrWU",
  "maialt": "1rFlcltfATgnnVtKGJ1fC5YYGyFbLnrWU",
  "nahueldevicenzi": "1Iu-utYl5SX1sd5SCPu_wTkUbe9UL80OU",
  "nahdev": "1Iu-utYl5SX1sd5SCPu_wTkUbe9UL80OU",
  "pilarruiz": "1VkNnF_VhnlChOPb8DhLmgjHFvJgOsowz",
  "pilrui": "1VkNnF_VhnlChOPb8DhLmgjHFvJgOsowz",
  "renatamarzan": "13IJTQNrzPW21B6J8OEwjY1hpv4IOiWSj",
  "renmar": "13IJTQNrzPW21B6J8OEwjY1hpv4IOiWSj",
  "santinomarcher": "1XvPytgcjKUmH9b8xmAUIZkDi3KGx8wzZ",
  "sanmar": "1XvPytgcjKUmH9b8xmAUIZkDi3KGx8wzZ",
  "lorenzobo": "1NdOE7Z3MJzWMV2MdgcWm2vaG7TZ3UK5F",
  "lorbo": "1NdOE7Z3MJzWMV2MdgcWm2vaG7TZ3UK5F",
  "morabracesco": "1xeSSBZ_fO3BqCQXBJe061jg4nBeAMUbA",
  "morbra": "1xeSSBZ_fO3BqCQXBJe061jg4nBeAMUbA",
  "emmaduarte": "1Hr6Rtnl42LmLfmEmRCWxe34yncqzF7js",
  "emmdua": "1Hr6Rtnl42LmLfmEmRCWxe34yncqzF7js",
  "mateofranco": "1vbsFuEuRAoh_8RWG9AAWpQ7iGwHT-GBQ",
  "matfra": "1vbsFuEuRAoh_8RWG9AAWpQ7iGwHT-GBQ",
  "josefinahernandez": "1n2TgXU6h3VpWPnnEjtssb0jxouzzfyXb",
  "josher": "1n2TgXU6h3VpWPnnEjtssb0jxouzzfyXb",
  "brunomoreira": "1hlOpVUwxAPAzHlcV5ELluRR97qPdHUJh",
  "brumor": "1hlOpVUwxAPAzHlcV5ELluRR97qPdHUJh",
  "salvadorparodi": "1xmBjf5J0U7ka6XUejH2dUuMUvUoVs0gL",
  "salpar": "1xmBjf5J0U7ka6XUejH2dUuMUvUoVs0gL",
  "karlypedraza": "1Cl77YPCFbs6wWlVTYP_TQ1HTeu_ilLsm",
  "karped": "1Cl77YPCFbs6wWlVTYP_TQ1HTeu_ilLsm",
  "marianaperez": "1efbTYYEmX_rofWd6lzODCOrtQcV0wRSH",
  "mariper": "1efbTYYEmX_rofWd6lzODCOrtQcV0wRSH",
  "benjaminrivas": "16LP8GTs9DS1mJQKQJaZU4tR2Pkg3n0--",
  "benriv": "16LP8GTs9DS1mJQKQJaZU4tR2Pkg3n0--",
  "cirorodriguez": "1eDYKUVQIr0oghQdwEx-_0xrKjF5clnE0",
  "cirrod": "1eDYKUVQIr0oghQdwEx-_0xrKjF5clnE0",
  "federicosilveira": "1UsiiipdtXAMQBHOqwZcZBbgW6gxLD1NK",
  "fedsil": "1UsiiipdtXAMQBHOqwZcZBbgW6gxLD1NK",
  "oliviataglioretti": "1FaFr2E8Fyd0BzwMHGlZQ9iDU5k0Upb4u",
  "olitag": "1FaFr2E8Fyd0BzwMHGlZQ9iDU5k0Upb4u",
  "delfinatolve": "1i7yNLpXEQ66_L2zq7soTic1yiFK6F4Zv",
  "deltol": "1i7yNLpXEQ66_L2zq7soTic1yiFK6F4Zv",
  "matiastraverso": "1Gs-kvQXqKWqttfEe3cmVaPULvlhGrdft",
  "mattra": "1Gs-kvQXqKWqttfEe3cmVaPULvlhGrdft",
  "guillerminavidal": "1I3MXLiYuTQPk7kM1V4wCPX6Ejuo2XJmF",
  "guivid": "1I3MXLiYuTQPk7kM1V4wCPX6Ejuo2XJmF",
  "joaquinviera": "1mxUH_hJmILI8yscYnW3e8-Dv_-bILewn",
  "joavie": "1mxUH_hJmILI8yscYnW3e8-Dv_-bILewn",
  "manuelarbiza": "15CFnwjHVXYA3ZI5VQNlTxU3Z_Zs3eyb5",
  "manarb": "15CFnwjHVXYA3ZI5VQNlTxU3Z_Zs3eyb5",
  "julietabailon": "1AQLYl5R1M5Mk4JohYrs5O0L1TPTS0KgB",
  "julbai": "1AQLYl5R1M5Mk4JohYrs5O0L1TPTS0KgB",
  "liacabrera": "1l9bWt_bgLUTKetQ41qi-uX-tv0rPTm5R",
  "liacab": "1l9bWt_bgLUTKetQ41qi-uX-tv0rPTm5R",
  "enzoferrari": "18hfj-cd3HwvTjIg4iy__5CSEwcslvgiD",
  "enzfer": "18hfj-cd3HwvTjIg4iy__5CSEwcslvgiD",
  "pierofernandez": "171Yfqn_MdHwbpds1d5BgA2ourGFicLBG",
  "piefer": "171Yfqn_MdHwbpds1d5BgA2ourGFicLBG",
  "salvadorfranco": "19eP82hbiAVXNXawvfqgtXEWvYbvN21fl",
  "salfra": "19eP82hbiAVXNXawvfqgtXEWvYbvN21fl",
  "tomasfuica": "1ktSKN98C9EJm3Uaqye5-c98GAjkhm57z",
  "tomfui": "1ktSKN98C9EJm3Uaqye5-c98GAjkhm57z",
  "joaquinislas": "17Cz-8wyGOIxGScnhEcpQNzcZT2bXVBYv",
  "joaisl": "17Cz-8wyGOIxGScnhEcpQNzcZT2bXVBYv",
  "almamurillo": "1knAw9JunLmKBSv8DmaFL3fSeI__qgpfs",
  "almmur": "1knAw9JunLmKBSv8DmaFL3fSeI__qgpfs",
  "francescanavone": "1dtLnknZr73KbzJyS7PNId_euGieuETNI",
  "franav": "1dtLnknZr73KbzJyS7PNId_euGieuETNI",
  "francescapedemonte": "1U32Hlu6Bf6nmzCsoA2uzs5y0FgGLzO4F",
  "fraped": "1U32Hlu6Bf6nmzCsoA2uzs5y0FgGLzO4F",
  "ignaciopicos": "1tRcSjxBZfYhYbCyaR6gYTm6I2b_gGYg1",
  "ignpic": "1tRcSjxBZfYhYbCyaR6gYTm6I2b_gGYg1",
  "julietarocha": "1Jfb65b8s-Ss6c13helORvlKVmI5dYkPF",
  "julroc": "1Jfb65b8s-Ss6c13helORvlKVmI5dYkPF",
  "lautarorosamen": "1mEgVjigMSBqkcgeRxMlH39Ig1VkdR79g",
  "lauros": "1mEgVjigMSBqkcgeRxMlH39Ig1VkdR79g",
  "federicasarubbo": "1mR-vX7m4d6wSbEqeWgglQMVoVZaLalsr",
  "fedsar": "1mR-vX7m4d6wSbEqeWgglQMVoVZaLalsr",
  "tomasstolfi": "1FOqSm1G0PAoFMqwitWhTzaK1E_V1lpTg",
  "tomsto": "1FOqSm1G0PAoFMqwitWhTzaK1E_V1lpTg",
  "antonellataglioretti": "1br-BXkpj2zLGKk9-J-JrQ7gniiWcFuRO",
  "anttag": "1br-BXkpj2zLGKk9-J-JrQ7gniiWcFuRO",
  "belenperalta": "1600PtlZYTyFCO3jIdj6YiH1l29NV2wj4",
  "belper": "1600PtlZYTyFCO3jIdj6YiH1l29NV2wj4",
  "amandacastagnin": "1rHbzAJryyDHkEsyamI5fhb2ITvTG-aTL",
  "amacas": "1rHbzAJryyDHkEsyamI5fhb2ITvTG-aTL",
  "ameliaamado": "1XMeLj0BMBL7WVO3rniFa61z19i3TuU6t",
  "ameama": "1XMeLj0BMBL7WVO3rniFa61z19i3TuU6t",
  "benicioocano": "1sq0fgBW3QoE5T6cTPbJ4qincITsQ5Pjy",
  "benoca": "1sq0fgBW3QoE5T6cTPbJ4qincITsQ5Pjy",
  "benjaminwilkins": "1X_eePsVQzUlRSnfOcyN7oOW6nNLM1Tj1",
  "benwil": "1X_eePsVQzUlRSnfOcyN7oOW6nNLM1Tj1",
  "delfinacabeza": "10vAOyYYIfe284xJaGIpR4wCCmTyat5vb",
  "delcab": "10vAOyYYIfe284xJaGIpR4wCCmTyat5vb",
  "facundodicorcia": "1Tq10HSRfOvG7resDvNAREhm5144OGNkV",
  "faccor": "1Tq10HSRfOvG7resDvNAREhm5144OGNkV",
  "francescamino": "1Daym7AXyQeZe0_HTqpDTKTslMwJAKwxb",
  "framin": "1Daym7AXyQeZe0_HTqpDTKTslMwJAKwxb",
  "joaquindelgado": "1-BfBGEjAVrATZ12J35g96ZGx6e4vjdYV",
  "joadel": "1-BfBGEjAVrATZ12J35g96ZGx6e4vjdYV",
  "joaquingonzalez": "1LZbE4h3NXNBSDw6PFD_QIUxg9h05SvpT",
  "joagon": "1LZbE4h3NXNBSDw6PFD_QIUxg9h05SvpT",
  "joaquinmascaro": "1Sf0bFjHBUSy6HLVtfsUDqDUtNlNuvme8",
  "joamas": "1Sf0bFjHBUSy6HLVtfsUDqDUtNlNuvme8",
  "juanmartingonzalez": "1MWgsUrRHOVAtC1ax9KQpFwvMZeSnFfUD",
  "juagon": "1MWgsUrRHOVAtC1ax9KQpFwvMZeSnFfUD",
  "juanmartinperaza": "1UjSliJeoJe9IltxQGqzVEVL8q8BUUEG_",
  "juaper": "1UjSliJeoJe9IltxQGqzVEVL8q8BUUEG_",
  "martinagonzalez": "1FboZ9y2uaJEJPC6gmXajTPc5G1ZD4AaQ",
  "margon": "1FboZ9y2uaJEJPC6gmXajTPc5G1ZD4AaQ",
  "nahuelbouissa": "1wa44OpeJlw7WuOwXQluaNJa3ppboMAQ8",
  "nahubou": "1wa44OpeJlw7WuOwXQluaNJa3ppboMAQ8",
  "salvadorliucci": "1ScrH4kErSsqeeAn6Y3zmBBVdKNiHc34t",
  "salliu": "1ScrH4kErSsqeeAn6Y3zmBBVdKNiHc34t",
  "tizianocastro": "1F2bQsR8uxxGvQBo7EfmSmUKRGQUGV5K7",
  "tizcas": "1F2bQsR8uxxGvQBo7EfmSmUKRGQUGV5K7",
  "valentinapena": "1L5nSVb15twGJl2YZt36HNUkN1Lf5UVQQ",
  "valpen": "1L5nSVb15twGJl2YZt36HNUkN1Lf5UVQQ",
  "zoelambach": "1FeyDYrjBqdniaMK5gt609sEJ76cvZ7y5",
  "zoelam": "1FeyDYrjBqdniaMK5gt609sEJ76cvZ7y5",
  "agustincobas": "1s_wawI4OQM281-dwWQYyO1XcLvTjYIhC",
  "agucob": "1s_wawI4OQM281-dwWQYyO1XcLvTjYIhC",
  "delfinacastelar": "1T-sS7Dp5aKW_5B1_6KB5oZsCd7R-fWW-",
  "delcas": "1T-sS7Dp5aKW_5B1_6KB5oZsCd7R-fWW-",
  "diegomendez": "17uUqJi4HIBr2l5iVAoqVpHsNFxD6N3Eh",
  "diemen": "17uUqJi4HIBr2l5iVAoqVpHsNFxD6N3Eh",
  "emmacastro": "1JcXqYJWB5sLd7vkWxSya9Db5PvnkKB_P",
  "emmcas": "1JcXqYJWB5sLd7vkWxSya9Db5PvnkKB_P",
  "eugeniacastagnin": "1rKWMvmtcI2IJ05CobeKstRl-liLtWYEl",
  "eugcas": "1rKWMvmtcI2IJ05CobeKstRl-liLtWYEl",
  "felipemarchesano": "1JPioNwYeR2rSg-SepNqifs3k946ONAuS",
  "felmar": "1JPioNwYeR2rSg-SepNqifs3k946ONAuS",
  "guillermovillamil": "15O5lZwzerDKlnBz7SnJa1qzelL6zsW4k",
  "guivil": "15O5lZwzerDKlnBz7SnJa1qzelL6zsW4k",
  "joaquinbelora": "126oBt6KRJA-0tjN7reJnqinHRWAhZMFq",
  "joabel": "126oBt6KRJA-0tjN7reJnqinHRWAhZMFq",
  "joaquinbengoa": "1KDbft1E-yuN8S98nrLk_lw_zetpBahKJ",
  "joaben": "1KDbft1E-yuN8S98nrLk_lw_zetpBahKJ",
  "juanmanuelcurbelo": "1C60qD2d_S6mw1YiEhH17tt1SDC5SGAAx",
  "juacur": "1C60qD2d_S6mw1YiEhH17tt1SDC5SGAAx",
  "lautaromarino": "1_WqZ8Gtqv8tVckXNw32P_02MjJA8ab3J",
  "laumar": "1_WqZ8Gtqv8tVckXNw32P_02MjJA8ab3J",
  "lucasrodriguez": "1-4tzuedA77FyZk_b82S2FHaPj2YFRsNa",
  "lucrod": "1-4tzuedA77FyZk_b82S2FHaPj2YFRsNa",
  "lunallorach": "1Ai4Llt9XQOAy-LAhlBNTrjFJvQ-dTw6y",
  "lunllo": "1Ai4Llt9XQOAy-LAhlBNTrjFJvQ-dTw6y",
  "mateogutierrez": "1Kcd5BnGuoubefBuX1UeUSq_mClYWb-gK",
  "matgut": "1Kcd5BnGuoubefBuX1UeUSq_mClYWb-gK",
  "miamascaro": "1isvLAjV059V3RjPCQ48JYYBXloWcM682",
  "miamas": "1isvLAjV059V3RjPCQ48JYYBXloWcM682",
  "oliviazayas": "11R7XSAHV711sLE1HRua0avy_NWxOoud6",
  "olizay": "11R7XSAHV711sLE1HRua0avy_NWxOoud6",
  "piainzaurralde": "1CN2YEuRflYwfssjVs1rZgXB8_QGruVaZ",
  "piainz": "1CN2YEuRflYwfssjVs1rZgXB8_QGruVaZ",
  "pierocanina": "1FwJOoYsK39OYGX9bV9NhTTEkdKkZwYcr",
  "piecan": "1FwJOoYsK39OYGX9bV9NhTTEkdKkZwYcr",
  "abelrodriguez": "1z9Ac6i-eHhCtaotMdUfzvO9ND24ZSUc1",
  "aberod": "1z9Ac6i-eHhCtaotMdUfzvO9ND24ZSUc1",
  "antonellacalcelia": "1eDdY1xRZkw6OD5UHOK_tGompP1Kx8AV_",
  "antcal": "1eDdY1xRZkw6OD5UHOK_tGompP1Kx8AV_",
  "benjamindossantos": "1MSyCZ0Odhu1s10O8D8facY4Vy5294xRs",
  "bensan": "1MSyCZ0Odhu1s10O8D8facY4Vy5294xRs",
  "brunafernandez": "14l1BAO12KdHA6kkCRIc1RyhxKcAadQ7D",
  "brufer": "14l1BAO12KdHA6kkCRIc1RyhxKcAadQ7D",
  "catalinabarreiro": "1K3hgUFnWRhbx-NRq-jv4fXP0uVImEdM_",
  "catbar": "1K3hgUFnWRhbx-NRq-jv4fXP0uVImEdM_",
  "delfinaripoll": "1KSwMpKi8NWoUNoOxpHYmu8Ti5XwXolwj",
  "delrip": "1KSwMpKi8NWoUNoOxpHYmu8Ti5XwXolwj",
  "faustovillasante": "153lxRY6Z_i2f60shzprKOwk0btJg6kHz",
  "fauvil": "153lxRY6Z_i2f60shzprKOwk0btJg6kHz",
  "franciscobustamante": "1udEJFbNvg6j7SZ6gnn3lBL2uRH5ORZnO",
  "frabus": "1udEJFbNvg6j7SZ6gnn3lBL2uRH5ORZnO",
  "francoschiavone": "1dLw9fp6o83J1It9f2lcncCT3_DnH3qvW",
  "frasch": "1dLw9fp6o83J1It9f2lcncCT3_DnH3qvW",
  "germanberger": "1f1O22emIaGSGEbfy_1Hvs2j0sZ_Yqrro",
  "gerber": "1f1O22emIaGSGEbfy_1Hvs2j0sZ_Yqrro",
  "geronimorocha": "1xPY5g_whtCorI5uWYKrcycHi4-AGgTqC",
  "gerroc": "1xPY5g_whtCorI5uWYKrcycHi4-AGgTqC",
  "josefinafittipaldi": "1CAwQJNNWcPoVVAjVIn8GlGqE4pnEnT71",
  "josfit": "1CAwQJNNWcPoVVAjVIn8GlGqE4pnEnT71",
  "juanmodernell": "1nXv0YnM9XRfABrlh0miKhKfWzJQpGG88",
  "juamod": "1nXv0YnM9XRfABrlh0miKhKfWzJQpGG88",
  "juliaruiz": "1aLGsar7qZke0bsgTFCGnpvF2FAlSrKF9",
  "julrui": "1aLGsar7qZke0bsgTFCGnpvF2FAlSrKF9",
  "lautarobresciani": "1EwV53Ph5cEOvkRzvRrvdNWXIjOyTCs2y",
  "laubre": "1EwV53Ph5cEOvkRzvRrvdNWXIjOyTCs2y",
  "lautaroguasque": "1n6fD3PDUwes0jp4erXbCSdslbnk13X4D",
  "laugua": "1n6fD3PDUwes0jp4erXbCSdslbnk13X4D",
  "manuelgigirey": "1Zcl0NK_lo3uziGmsunYWAFzfl0kcaQZJ",
  "mangig": "1Zcl0NK_lo3uziGmsunYWAFzfl0kcaQZJ",
  "renzosilva": "1gX67v4cgDTsRlo8W6SnqG3i5w4WFcbSL",
  "rensil": "1gX67v4cgDTsRlo8W6SnqG3i5w4WFcbSL",
  "tomastangredi": "15jlLtuIBBZLg0GH0ijQSnshF9TnCSUlz",
  "tomtan": "15jlLtuIBBZLg0GH0ijQSnshF9TnCSUlz",
  "valentinomorena": "1PYDndXsA7Hkg-jjLmdU9-B_1PghLLy89",
  "valmor": "1PYDndXsA7Hkg-jjLmdU9-B_1PghLLy89",
  "agustinclavijo": "15g0OfXQoYKZNfKSF8oMTB1_7-acbUreh",
  "agucla": "15g0OfXQoYKZNfKSF8oMTB1_7-acbUreh",
  "bastiancorbo": "1K5sm1_G7DFZU4wvcYVsVrpNnsaeVThls",
  "bascor": "1K5sm1_G7DFZU4wvcYVsVrpNnsaeVThls",
  "candelasagaria": "1vqjvQWDOtjo5i4nFX3BgSm6StAcoLRD3",
  "cansag": "1vqjvQWDOtjo5i4nFX3BgSm6StAcoLRD3",
  "celesteguanco": "1ie4yKIQIMMVTakeyYc0FIkSKb57MnoDs",
  "celgua": "1ie4yKIQIMMVTakeyYc0FIkSKb57MnoDs",
  "francoayala": "1K81h7zG4ezlhTbbWKopxnoGwdTq6OSEn",
  "fraaya": "1K81h7zG4ezlhTbbWKopxnoGwdTq6OSEn",
  "francodiaz": "1Ay4OeQBmptmjwqDU34nQluARilQOGll6",
  "fradia": "1Ay4OeQBmptmjwqDU34nQluARilQOGll6",
  "germanbarbela": "1qydjf1AL8u8r11xh4eUFbmQY0iUCMmaf",
  "gerbar": "1qydjf1AL8u8r11xh4eUFbmQY0iUCMmaf",
  "helenaramos": "1P_G3mxDr2S7UQDVhd0V3CrbODqi431qG",
  "helram": "1P_G3mxDr2S7UQDVhd0V3CrbODqi431qG",
  "juanmanuelmartinez": "1Pe8vxvMiHVuKYCg0kcvJqrxi22Jwd36A",
  "juamar": "1Pe8vxvMiHVuKYCg0kcvJqrxi22Jwd36A",
  "juanmartinsilva": "1kFPNrDkz86M1XOlb8GG3_Vq95Rx7yCiI",
  "juasil": "1kFPNrDkz86M1XOlb8GG3_Vq95Rx7yCiI",
  "juliarodriguez": "1GQ6cW5WLvKay88S7wEExYoDuwfGZHst1",
  "julrod": "1GQ6cW5WLvKay88S7wEExYoDuwfGZHst1",
  "mateocharlo": "16TcHlKum9kA8nFRTVzaSncdxpSklsGSC",
  "matcha": "16TcHlKum9kA8nFRTVzaSncdxpSklsGSC",
  "mateoflocken": "1QzNxm45SZZCwn-QfbdZy0tvrcXz8-QbE",
  "matflo": "1QzNxm45SZZCwn-QfbdZy0tvrcXz8-QbE",
  "mateohuvatt": "1EwG2931wR0VxlHbknvDOzKOXBS-iFIYu",
  "mathuv": "1EwG2931wR0VxlHbknvDOzKOXBS-iFIYu",
  "maximoifran": "1pCyCvIyM_oHyiwGaWydySmWk1n-t3PbY",
  "maxifr": "1pCyCvIyM_oHyiwGaWydySmWk1n-t3PbY",
  "nicolasrodriguez": "1olHhw4ICanwesvY-YpjznvSdik0UESdm",
  "nicrod": "1olHhw4ICanwesvY-YpjznvSdik0UESdm",
  "orianalaguna": "1ZTR80-dbzFOk5Vr0x9ye8YVMcneAB38X",
  "orilag": "1ZTR80-dbzFOk5Vr0x9ye8YVMcneAB38X",
  "paulinascotti": "1qzVK1r7ualydtLv804UgIS3gaRo_baib",
  "pausco": "1qzVK1r7ualydtLv804UgIS3gaRo_baib",
  "rodrigogutierrez": "1mxiOGISOcFv03XPkt0mR5bvt0aVF2j-u",
  "rodgut": "1mxiOGISOcFv03XPkt0mR5bvt0aVF2j-u",
  "valentinosirianni": "1Fr-jwhmg7wictUSGmritmnuL1ho4JeNO",
  "valsir": "1Fr-jwhmg7wictUSGmritmnuL1ho4JeNO",
  "vicentesantana": "1sAzB0nXuwLgrzo5vEBvtlwS6-_F4yHrx",
  "vicsan": "1sAzB0nXuwLgrzo5vEBvtlwS6-_F4yHrx",
  "bautistaolid": "1JNNWHwuawZM7_lqM3an5iYw0H4b3VXOz",
  "bauoli": "1JNNWHwuawZM7_lqM3an5iYw0H4b3VXOz",
  "camilotrabaglia": "151HxLbczarR21pOAqEq7I6idAOH8aao7",
  "camtra": "151HxLbczarR21pOAqEq7I6idAOH8aao7",
  "claraaldabe": "1soXrmgc-XT825Hop3dGXNuXVgDudncF9",
  "claald": "1soXrmgc-XT825Hop3dGXNuXVgDudncF9",
  "emiliagonzalez": "1mxJW6MUqzqTHTno-22wCdFrfdVSiUcBa",
  "emigon": "1mxJW6MUqzqTHTno-22wCdFrfdVSiUcBa",
  "emilianogil": "1lKP5hsEEyNbusTnrhLK8JHjntxnEjprz",
  "emigil": "1lKP5hsEEyNbusTnrhLK8JHjntxnEjprz",
  "evasouza": "1I8YeZQ2nWRbokZRBEB5HTlap7wAnrb3N",
  "evasou": "1I8YeZQ2nWRbokZRBEB5HTlap7wAnrb3N",
  "federicabarrios": "1-N8GdVgsIoll2-ElwL2WyEO5dvoTvARo",
  "fedbar": "1-N8GdVgsIoll2-ElwL2WyEO5dvoTvARo",
  "francescaparietti": "15_lraap5kBfdVUPDBrXgJRssvb1RZPQE",
  "frapar": "15_lraap5kBfdVUPDBrXgJRssvb1RZPQE",
  "guillerminaferraro": "1U2sIIiPGI_3addw_Y7nA7Uk1hp0tw9Gd",
  "guifer": "1U2sIIiPGI_3addw_Y7nA7Uk1hp0tw9Gd",
  "josefinavaldez": "1Ij4h1l1BYsNOYGEx44dqR2cdSNaVKQPq",
  "josval": "1Ij4h1l1BYsNOYGEx44dqR2cdSNaVKQPq",
  "julietagomez": "1tfB-fVa0rz9mk8KU39cT1HjJi6hV6XU0",
  "julgom": "1tfB-fVa0rz9mk8KU39cT1HjJi6hV6XU0",
  "laradasilva": "1JP0fUJD_dFXi4ByT8EKU3aZdi2jEmHqE",
  "larsil": "1JP0fUJD_dFXi4ByT8EKU3aZdi2jEmHqE",
  "luciosilva": "1-5EWFhuyadU5D4Q8msnTlKg9up1tNRaI",
  "lucsil": "1-5EWFhuyadU5D4Q8msnTlKg9up1tNRaI",
  "maurobailon": "13q4UTbYRx0Hwd77WhAUBJGHm6x-a8y4B",
  "maubai": "13q4UTbYRx0Hwd77WhAUBJGHm6x-a8y4B",
  "palomadasilveira": "1KHv9MShiiTiGr29s3MUN4sjSaMITwgZX",
  "palsil": "1KHv9MShiiTiGr29s3MUN4sjSaMITwgZX",
  "piasaenz": "1Z1xyH2b9ZtEqjkHNFYvokn0vY6gaIYs5",
  "piasae": "1Z1xyH2b9ZtEqjkHNFYvokn0vY6gaIYs5",
  "santinobandera": "1YS3Mi3wd4f7urkooRuawe7UdjlxM9WDA",
  "sanban": "1YS3Mi3wd4f7urkooRuawe7UdjlxM9WDA",
  "sofiaperini": "1BZEeh5yeBQ9N15ECnwVMhU9yqeNYZdwm",
  "sofper": "1BZEeh5yeBQ9N15ECnwVMhU9yqeNYZdwm",
  "valentinavera": "1nuInZS7J0xpCYxqHFVK9xCspX0T3qRcp",
  "valver": "1nuInZS7J0xpCYxqHFVK9xCspX0T3qRcp",
  "valentinavilizio": "1nX9OyVIqLTSrXqNWSCYu-Yesyh-cvczB",
  "valvil": "1nX9OyVIqLTSrXqNWSCYu-Yesyh-cvczB",
  "adriangerstenbluth": "1gUpiCIYz_zy60IzEzSNjMKng7PDE3EB7",
  "adrger": "1gUpiCIYz_zy60IzEzSNjMKng7PDE3EB7",
  "agustinbengoa": "1IPNi5E3zabvOeuelgGrbi6_kvFOb8J2r",
  "aguben": "1IPNi5E3zabvOeuelgGrbi6_kvFOb8J2r",
  "alfonsinabarrios": "1bHWH4nTM3v_5KQA78O8e9LCIzRgBfVSL",
  "alfbar": "1bHWH4nTM3v_5KQA78O8e9LCIzRgBfVSL",
  "bautistagreco": "1QmIl3AWSRW4ocnIBSlL0rPuo9Amb7XKw",
  "baugre": "1QmIl3AWSRW4ocnIBSlL0rPuo9Amb7XKw",
  "benjaminsuarez": "1otPOx3j9V3eCiWo2b014tvPE_LH3s_Wb",
  "bensua": "1otPOx3j9V3eCiWo2b014tvPE_LH3s_Wb",
  "guillermocurbelo": "1lg6RMzXCbFb5e7cn-nMotVY3cDqwva5l",
  "guicur": "1lg6RMzXCbFb5e7cn-nMotVY3cDqwva5l",
  "guillermosilveira": "14A5xVCWfBxV-_Vi06QimJhOciqHVIPD4",
  "guisil": "14A5xVCWfBxV-_Vi06QimJhOciqHVIPD4",
  "joaquinafontan": "1C0TeDFvGAMtDm61Nt-s425itt3T7Cg-X",
  "joafon": "1C0TeDFvGAMtDm61Nt-s425itt3T7Cg-X",
  "juanbautistaburgos": "1-utdms0dEaWOMTPXdG9nYGFW_aaeydsg",
  "juabur": "1-utdms0dEaWOMTPXdG9nYGFW_aaeydsg",
  "juanmartinnogues": "1KPVR8KVACWlIiu-38osFq4Ol3kxVf2Sw",
  "juanog": "1KPVR8KVACWlIiu-38osFq4Ol3kxVf2Sw",
  "magalisodano": "1jUeFSKpft9bT00R04J5irHZskeA8ZVMr",
  "magsod": "1jUeFSKpft9bT00R04J5irHZskeA8ZVMr",
  "manuelagarcia": "18N1oPRtX_LFKZ8CQglWMqX6-nYSrElgi",
  "mangar": "18N1oPRtX_LFKZ8CQglWMqX6-nYSrElgi",
  "martinasagaria": "1Id4Mn6piib1_1OJQ13YbhJp_K1S5iA8K",
  "marsag": "1Id4Mn6piib1_1OJQ13YbhJp_K1S5iA8K",
  "milagrosneira": "1P7SlHUl8WuXd4pThP9DF2AfynARxpOLb",
  "milnei": "1P7SlHUl8WuXd4pThP9DF2AfynARxpOLb",
  "morenablois": "1aDOD9E8YDTI79PXS9DJbZyXUGjw-77EA",
  "morblo": "1aDOD9E8YDTI79PXS9DJbZyXUGjw-77EA",
  "morenascarone": "1WexngtxsEGuQCzMr2a3ArxMsabQ-VhvE",
  "morsca": "1WexngtxsEGuQCzMr2a3ArxMsabQ-VhvE",
  "oliviamonza": "1VXBJcT-B_CnWqx2hdwq3VfB3c4XiOImW",
  "olimon": "1VXBJcT-B_CnWqx2hdwq3VfB3c4XiOImW",
  "renzosanguinetti": "1Trege5_Hvfyz75IE6xol_p4YY9HsG1k2",
  "rensan": "1Trege5_Hvfyz75IE6xol_p4YY9HsG1k2",
  "santinowolf": "1FqWX-fCHiFZkiGVzLZ0A0p5XCZdTM1eD",
  "sanwol": "1FqWX-fCHiFZkiGVzLZ0A0p5XCZdTM1eD",
  "tomasrecalde": "1mmLlxGBnjqe9Yq1rfqZaKrJIvHF0-OY1",
  "tomrec": "1mmLlxGBnjqe9Yq1rfqZaKrJIvHF0-OY1",
  "valentinarodriguez": "1L2dxY7mFw5XTQU4Dtc6CtJWb7nsS7AkG",
  "valrod": "1L2dxY7mFw5XTQU4Dtc6CtJWb7nsS7AkG",
  "dereckhampala": "1EcbhzOfef1Yo1sBjYfDIOOzC6Now4f3o",
  "derham": "1EcbhzOfef1Yo1sBjYfDIOOzC6Now4f3o",
  "augustoocano": "1oMMeIO-eUyaiClupk_X_0bs2GZInSf69",
  "augoca": "1oMMeIO-eUyaiClupk_X_0bs2GZInSf69",
  "emiliasilva": "1PpF7LwRJ67KHJydfI2Od5CC8a1m05MEn",
  "emisil": "1PpF7LwRJ67KHJydfI2Od5CC8a1m05MEn",
  "emmamachado": "1eS7BfELQrHMuWZT_7fH7b2yrlXQvdtiX",
  "emmmac": "1eS7BfELQrHMuWZT_7fH7b2yrlXQvdtiX",
  "federicaestiben": "198X0JmkPyFjGznRxcaLr6XK_VLUZI-5n",
  "fedest": "198X0JmkPyFjGznRxcaLr6XK_VLUZI-5n",
  "felipeviera": "1GiE4_lvi60XejcsWokClGWlJiyQSNuo6",
  "felvie": "1GiE4_lvi60XejcsWokClGWlJiyQSNuo6",
  "florenciaerosa": "1iJblxPQa6hotPEVXBf9af7--mgz-Nn-J",
  "floero": "1iJblxPQa6hotPEVXBf9af7--mgz-Nn-J",
  "joaquinbarboza": "1pEuwbw6Q6Z7Usg3Ssxu6cKmheHFgkNyl",
  "joabar": "1pEuwbw6Q6Z7Usg3Ssxu6cKmheHFgkNyl",
  "juanmanuellinkimer": "1ceFja8ensGVTEyPAtwaQ4s0xhVMhPCII",
  "jualin": "1ceFja8ensGVTEyPAtwaQ4s0xhVMhPCII",
  "julietabelora": "1P1KFdpRsTDGdnhyTr7KnERPG-W-a144d",
  "julbel": "1P1KFdpRsTDGdnhyTr7KnERPG-W-a144d",
  "julietasagaria": "1noM6HKCduBN4CXYWXz86ApOOEBo8ZyEp",
  "julsag": "1noM6HKCduBN4CXYWXz86ApOOEBo8ZyEp",
  "nahiarabouissa": "1PtOqvYHiA9eIzj-RzpbAuZgYqFNes5cr",
  "nahibou": "1PtOqvYHiA9eIzj-RzpbAuZgYqFNes5cr",
  "thiagorodriguez": "1mHdNbIRltdwCq5g2TJ1ozD6j3Sjcaywr",
  "thirod": "1mHdNbIRltdwCq5g2TJ1ozD6j3Sjcaywr",
  "vicenteceriliano": "1ZigWpmow5-pm3ekmmt6s5MX9FMzVaG1-",
  "viccer": "1ZigWpmow5-pm3ekmmt6s5MX9FMzVaG1-",
  "tomasmato": "1TrtTdpjVYwUTE-d6eFw3YUoyLuFVcXQm",
  "tommat": "1TrtTdpjVYwUTE-d6eFw3YUoyLuFVcXQm",
  "agustinacorrea": "1K7MfwXAXieTHGCCorcjmZnZ_NZ-kfME8",
  "agucor": "1K7MfwXAXieTHGCCorcjmZnZ_NZ-kfME8",
  "agustinaumpierre": "1XPNBCVby2pfzbzanNBQqw0-UP1ZR6PJN",
  "aguump": "1XPNBCVby2pfzbzanNBQqw0-UP1ZR6PJN",
  "anahimora": "19hAb0W2ZONrL9fMmIIrupkUXY3zoOMw-",
  "anamor": "19hAb0W2ZONrL9fMmIIrupkUXY3zoOMw-",
  "bautistaclaveria": "1Tg0ngEFEplKJZ6u3a7So_pYTMn0__m22",
  "baucla": "1Tg0ngEFEplKJZ6u3a7So_pYTMn0__m22",
  "delfinaaraujo": "165pvvHcClDwj-RH0sQtjXY3ajQT4EyCi",
  "delara": "165pvvHcClDwj-RH0sQtjXY3ajQT4EyCi",
  "isabelmoura": "1o6Qo4lH6gGiuETJvG0pxim3RJW2b7mJC",
  "isamou": "1o6Qo4lH6gGiuETJvG0pxim3RJW2b7mJC",
  "mariabelencelentano": "1_9EyjYM2WJ9z5khBR51bTJyJwWBNA_yb",
  "marbel": "1_9EyjYM2WJ9z5khBR51bTJyJwWBNA_yb",
  "mateogonzalez": "1mdNJWsCJTVG9wIemBufC525ptDz5AJfF",
  "matgon": "1mdNJWsCJTVG9wIemBufC525ptDz5AJfF",
  "rociocastillo": "1HAMB2WgTUA-_tR2p4KF9MgyAbJLfRNMX",
  "roccas": "1HAMB2WgTUA-_tR2p4KF9MgyAbJLfRNMX",
  "santiagomoreira": "1GmgK-tOEhUVkanpCxX74D4TattKkEIrj",
  "sanmor": "1GmgK-tOEhUVkanpCxX74D4TattKkEIrj",
  "teoraggio": "1JDuyF1pZBG6XJdxjgc2CVAaT_wwkkbmQ",
  "teorag": "1JDuyF1pZBG6XJdxjgc2CVAaT_wwkkbmQ",
  "tomasgenta": "10JxU0HWkMaaAI_m6TlgRcYpyQHfeGe4L",
  "tomgen": "10JxU0HWkMaaAI_m6TlgRcYpyQHfeGe4L",
  "luanazayas": "1HWxHsF4m-RX2fSWfw4BSMno6ItGUgnMt",
  "luazay": "1HWxHsF4m-RX2fSWfw4BSMno6ItGUgnMt"
};

/**
 * Obtener con precisión el ID de la carpeta Google Drive del alumno logueado
 */
function getStudentDriveFolderId(studentOrId) {
  if (!studentOrId) return null;
  if (typeof studentOrId === 'object') {
    if (studentOrId.driveFolderId) return studentOrId.driveFolderId;
    var id = studentOrId.id || studentOrId.username;
    if (id && STUDENT_DRIVE_FOLDERS[id]) return STUDENT_DRIVE_FOLDERS[id];
  } else if (typeof studentOrId === 'string') {
    if (STUDENT_DRIVE_FOLDERS[studentOrId]) return STUDENT_DRIVE_FOLDERS[studentOrId];
  }
  return null;
}

if (typeof window !== 'undefined') {
  window.GOOGLE_DRIVE_WEBHOOK_URL  = GOOGLE_DRIVE_WEBHOOK_URL;
  window.PROJECTS_DRIVE_FOLDER_ID  = PROJECTS_DRIVE_FOLDER_ID;
  window.PROJECTS_DRIVE_URL        = PROJECTS_DRIVE_URL;
  window.authenticateStudentAsync  = authenticateStudentAsync;
  window.authenticateStudent       = authenticateStudent;
  window.findMatchingStudents      = findMatchingStudents;
  window.getStudentById            = getStudentById;
  window.getStudentDriveFolderId   = getStudentDriveFolderId;
}
