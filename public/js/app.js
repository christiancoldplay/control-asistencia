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

// Habilitar offline persistence (permite que la app funcione sin internet)
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

// Escuchar cambios en el estado de autenticacion (login/logout) en tiempo real.
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
// FUNCIONES DE AUTENTICACIÓN (funciones reutilizables para usar desde otros archivos)
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

// ============================================
// SISTEMA DE NOTIFICACIONES TOAST (UX)
// ============================================
window.mostrarNotificacion = function(mensaje, tipo = 'success') {
    // 1. Buscar o crear el contenedor de notificaciones
    let container = document.getElementById('toast-container-global');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container-global';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    // 2. Crear la notificación
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    toast.textContent = mensaje;

    // 3. Agregarla a la pantalla
    container.appendChild(toast);

    // 4. Temporizador para auto-destrucción (3s éxito, 4s error)
    const duracion = tipo === 'error' ? 4000 : 3000;

    setTimeout(() => {
        toast.classList.add('fade-out');
        // Esperar a que termine la animación CSS para borrar el elemento del HTML
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, duracion);
};