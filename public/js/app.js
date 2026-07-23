// CONFIGURACION DE FIREBASE EN EL PROYECTO

// Inicializar Firebase con la configuracion de config.js
firebase.initializeApp(firebaseConfig);

// Inicializar servicios
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

console.log("Firebase inicializado correctamente");

// app.js (agrega al final)
console.log("Firebase conectado correctamente");
console.log("Auth:", auth);
console.log("Firestore:", db);
console.log("Storage:", storage);

// Prueba de autenticación (para verificar que funciona)
// NO LO DEJES EN PRODUCCIÓN, solo para probar
auth.signInWithEmailAndPassword("superadmin@linguatec.com", "Linguatec123!")
    .then((userCredential) => {
        console.log("Usuario autenticado:", userCredential.user.email);
    })
    .catch((error) => {
        console.error("Error de autenticación:", error.message);
    });