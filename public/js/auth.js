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
                console.log('Login exitoso en Auth. Verificando rol en Firestore...');
                const user = result.user;

                try {
                    // 1. Consultar el documento del usuario en Firestore
                    const userDoc = await db.collection('usuarios').doc(user.uid).get();

                    if(!userDoc.exists) {
                        showError('Tu cuenta no esta registrada en la base de datos.');
                        await logoutUser();
                        setLoading(false);
                        return;
                    }

                    const userData = userDoc.data();

                    // 2. Verificar si esta activo
                    if (userData.estatus !== 'activo') {
                        showError('Tu cuenta esta inactiva o dada de baja.');
                        await logoutUser();
                        setLoading(false);
                        return;
                    }

                    // 3. Verificar si requiere cambio de contrasena
                    if (userData.requiereCambioPassword) {
                        // ocultamos el error si lo hubiera y mostramos el modal
                        hideError();
                        document.getElementById('modalCambioPassword').classList.remove('hidden');

                        // Guardamos los datos temporalmente para usarlos al guardar la contrasena
                        window.usuarioPendiente = user;
                        window.datosUsuarioPendiente = userData;
                        return; //El flujo se detiene aqui hasta que cambie la contrasena
                    }

                    // 4. Enrutamiento por roles
                    redirigirPorRol(userData.rol);

                } catch (error) {
                    console.error("Error al consultar Firestore: ", error);
                    showError('Error al verificar permisos.');
                    await logoutUser();
                    setLoading(false);
                }

            } else {
                // Login no exitoso, Mostrar el error específico de Firebase
                let userMessage = 'Error al iniciar sesión. Verifica tus credenciales.';
                
                // Mensajes de error
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

    // ============================================
    // FUNCIÓN DE ENRUTAMIENTO
    // ============================================
    function redirigirPorRol(rol) {
        if (rol === 'administrador' || rol === 'super_admin') {
            window.location.replace('panel.html');
        } else if (rol === 'recepcionista') {
            window.location.replace('escaner.html');
        } else {
            showError('Rol no reconocido.');
            logoutUser();
            setLoading(false);
        }
    }

    // ============================================
    // LÓGICA DEL MODAL DE CAMBIO DE CONTRASEÑA
    // ============================================
    const formCambioPassword = document.getElementById('formCambioPassword');
    const errorModalPassword = document.getElementById('errorModalPassword');

    if (formCambioPassword) {
        formCambioPassword.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const btnGuardar = document.getElementById('btnGuardarPassword');

            if (newPassword !== confirmPassword) {
                errorModalPassword.textContent = "Las contraseñas no coinciden.";
                errorModalPassword.classList.add('visible');
                return;
            }

            btnGuardar.disabled = true;
            btnGuardar.textContent = "Actualizando...";

            try {
                // 1. Actualizar contraseña en Firebase Auth
                await window.usuarioPendiente.updatePassword(newPassword);

                // 2. Quitar la bandera en Firestore para que no se lo vuelva a pedir
                await db.collection('usuarios').doc(window.usuarioPendiente.uid).update({
                    requiereCambioPassword: firebase.firestore.FieldValue.delete()
                });

                // 3. Redirigir según su rol
                redirigirPorRol(window.datosUsuarioPendiente.rol);

            } catch (error) {
                console.error("Error al actualizar contraseña:", error);
                errorModalPassword.textContent = "Error al actualizar. Intenta de nuevo.";
                errorModalPassword.classList.add('visible');
                btnGuardar.disabled = false;
                btnGuardar.textContent = "Guardar y Continuar";
            }
        });
    }


});