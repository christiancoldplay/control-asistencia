// CONFIGURACION DE FIREBASE EN EL PROYECTO

// Inicializar Firebase con la configuracion de config.js
firebase.initializeApp(firebaseConfig);

// Inicializar servicios
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

console.log("Firebase inicializado correctamente");
