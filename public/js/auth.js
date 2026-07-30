// ============================================
// auth.js - Lógica de Autenticación
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('loginBtn');
    const errorMessage = document.getElementById('errorMessage');

    // Si no existe el formulario (ej: estamos en otra página), salimos
    if (!loginForm) return;

    // ============================================
    // FUNCIÓN PARA MOSTRAR ERRORES
    // ============================================
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.add('visible');
        // Ocultar el error después de 5 segundos
        setTimeout(() => {
            errorMessage.classList.remove('visible');
        }, 5000);
    }

    function hideError() {
        errorMessage.classList.remove('visible');
        errorMessage.textContent = '';
    }

    // ============================================
    // FUNCIÓN PARA CAMBIAR ESTADO DEL BOTÓN
    // ============================================
    function setLoading(isLoading) {
        if (isLoading) {
            loginBtn.disabled = true;
            loginBtn.textContent = 'Iniciando sesión...';
        } else {
            loginBtn.disabled = false;
            loginBtn.textContent = 'Iniciar Sesión';
        }
    }

    // ============================================
    // MANEJAR EL ENVÍO DEL FORMULARIO
    // ============================================
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideError();

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        // Validación básica en el cliente
        if (!email || !password) {
            showError('Por favor, completa todos los campos.');
            return;
        }

        if (!email.includes('@') || !email.includes('.')) {
            showError('Por favor, ingresa un correo electrónico válido.');
            return;
        }

        if (password.length < 6) {
            showError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        // Cambiar estado del botón a "Iniciando sesion"
        setLoading(true);

        try {
            // Usar la función global `loginUser` definida en app.js
            const result = await loginUser(email, password);

            if (result.success) {
                // Login exitoso - Redirigir al panel
                console.log('Login exitoso:', result.user.email);
                // Redirigir después de un breve tiempo para mostrar el panel.html
                setTimeout(() => {
                    window.location.href = 'panel.html';
                }, 300);
            } else {
                // Login no exitoso, Mostrar el error específico de Firebase
                let userMessage = 'Error al iniciar sesión. Verifica tus credenciales.';
                
                // Mensajes de error más amigables
                if (result.error.includes('user-not-found') || result.error.includes('invalid-credential')) {
                    userMessage = 'Correo o contraseña incorrectos.';
                } else if (result.error.includes('too-many-requests')) {
                    userMessage = 'Demasiados intentos fallidos. Por favor, espera un momento.';
                } else if (result.error.includes('invalid-email')) {
                    userMessage = 'El formato del correo electrónico no es válido.';
                } else if (result.error.includes('user-disabled')) {
                    userMessage = 'Esta cuenta ha sido deshabilitada. Contacta al administrador.';
                }
                
                showError(userMessage);
                setLoading(false);
            }
        } catch (error) {
            // Error inesperado
            console.error('Error en el proceso de login:', error);
            showError('Ocurrió un error inesperado. Por favor, intenta de nuevo.');
            setLoading(false);// habilita el boton
        }
    });

    // ============================================
    // LIMPIAR ERROR AL ESCRIBIR EN LOS CAMPOS
    // ============================================
    emailInput.addEventListener('input', hideError);
    passwordInput.addEventListener('input', hideError);

    // ============================================
    // PERMITIR ENTER PARA ENVIAR EL FORMULARIO
    // ============================================
    emailInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            passwordInput.focus();
        }
    });

    passwordInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            loginForm.dispatchEvent(new Event('submit'));
        }
    });

    // ============================================
    // AUTO-FOCUS EN EL CAMPO DE EMAIL
    // ============================================
    // Pequeño tiempo para que la página cargue completamente
    setTimeout(() => {
        emailInput.focus();
    }, 100);

    console.log('Módulo de autenticación cargado correctamente');
});