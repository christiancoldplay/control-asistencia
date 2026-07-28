// ==========================================
// CONFIGURACION DE FIREBASE
// ==========================================

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Inicializar servicios
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// =========================================
// CONFIGURACION DE FIRESTORE
// =========================================

// Habilitar offline persistence (para que funcione sin internet)
db.enablePersistence()
    .catch((err) => {
        console.warn('Firestore persistence error:', err.code);
    });

// ============================================
// ESTADO DE LA APLICACIÓN
// ============================================

// Variable para controlar el estado de autenticación
let currentUser = null;

// ============================================
// OBSERVADOR DE AUTENTICACIÓN
// ============================================

// Escuchar cambios en el estado de autenticación
auth.onAuthStateChanged((user) => {
    if (user) {
        // Usuario logueado
        currentUser = user;
        console.log('Usuario autenticado:', user.email);
        
        // Redirigir según el rol (IMPLEMENTACION PENDIENTE!)
        // redirigirSegunRol(user.uid);
        
    } else {
        // Usuario no logueado
        currentUser = null;
        console.log('Usuario no autenticado');
        
        // Redirigir al login si está en una página protegida
        // window.location.href = 'login.html';
    }
});

// ==========================================================
// FUNCIONES DE AUTENTICACIÓN (para usar en otros archivos)
// ==========================================================

// Función de login
async function loginUser(email, password) {
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        return { success: true, user: userCredential.user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Función de logout
async function logoutUser() {
    try {
        await auth.signOut();
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Función para obtener el usuario actual
function getCurrentUser() {
    return currentUser;
}

