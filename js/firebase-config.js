/**
 * =============================================================
 * FIREBASE CONFIGURATION & INITIALIZATION — COLEGIO PAULO FREIRE
 * =============================================================
 */

const firebaseConfig = {
  apiKey: "AIzaSyDBHslk40Wo36UHqXLzNEPRcIPAtw19Pco",
  authDomain: "paulofreiredb.firebaseapp.com",
  projectId: "paulofreiredb",
  storageBucket: "paulofreiredb.firebasestorage.app",
  messagingSenderId: "11038166833",
  appId: "1:11038166833:web:efa61fcd614b7f05a8ea10",
  measurementId: "G-DH4JVWY64M"
};

let firebaseApp = null;
let db = null;

try {
  if (typeof firebase !== 'undefined') {
    firebaseApp = firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    console.log("🔥 Firebase inicializado con éxito (paulofreiredb)");
  } else {
    console.warn("⚠️ SDK de Firebase no disponible.");
  }
} catch (e) {
  console.error("Error al inicializar Firebase:", e);
}

if (typeof window !== 'undefined') {
  window.firebaseConfig = firebaseConfig;
  window.firebaseApp = firebaseApp;
  window.db = db;
}
