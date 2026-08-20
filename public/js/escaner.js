// ============================================
// escaner.js - Lógica del Módulo de Recepción
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    
    let escannerActivo = null; // Guardará la instancia de la cámara

    // ============================================
    // 1. PROTECCIÓN DE RUTA (Auth Guard)
    // ============================================
    auth.onAuthStateChanged((user) => {
        if (user) {
            document.getElementById('recepcionistaNombre').textContent = user.email;
            // Iniciamos la cámara solo si hay un usuario logueado
            iniciarCamara();
        } else {
            window.location.replace('index.html');
        }
    });

    // ============================================
    // 2. CERRAR SESIÓN
    // ============================================
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            if (escannerActivo) {
                await escannerActivo.stop(); // Apagamos la cámara antes de salir (llamada al metodo stop de html5qrcode)
            }
            await logoutUser();
        });
    }

    // ============================================
    // 3. LÓGICA DEL ESCÁNER QR
    // ============================================
    function iniciarCamara() {
        // Ocultamos la tarjeta de resultado y mostramos el contenedor de la cámara
        document.getElementById('resultadoEscaneo').classList.add('hidden');
        const contenedorLector = document.getElementById('lectorQR');
        contenedorLector.classList.remove('hidden');

        //Mensaje temporal mientras carga
        contenedorLector.innerHTML = '<p class="mensaje-camara-cargando">Iniciando camara...</p>';

        // Instanciamos el escáner apuntando al div 'lectorQR'
        escannerActivo = new Html5Qrcode("lectorQR");

        // Configuración de la cámara
        const config = { 
            fps: 10, // Cuadros por segundo (10 es buen balance entre velocidad y batería)
            qrbox: { width: 250, height: 250 } // El cuadrito guía para escanear
        };

        // Encendemos la cámara trasera (si hay, si se abre desde un dispositivo movil), (llamada al metodo start de html5qrcode)
        escannerActivo.start(
            { facingMode: "environment" }, //facingMode indica que camara usara, environment es la de atras.
            config, 
            onEscaneoExitoso, //metodo que se ejecutara cuando se detecta un QR valido
            onEscaneoFallo // metodo que se ejecuta cuando no se detecta un QR valido
        ).catch(err => {
            console.warn("No se encontro camara trasera, intentando con camara frontal...",err);

            //Intento de utilizar camara frontal o webcam de PC
            escannerActivo.start(
                { facingMode: "user" },
                config,
                onEscaneoExitoso,
                onEscaneoFallo
            ).catch(err2 => {
                console.error("Error definitivo al iniciar camara", err2);
                contenedorLector.innerHTML = '<p class="mensaje-camara-error">No se pudo acceder a la camara. Verifica los permisos del navegador.</p>';
            });
        });
    }

    // ============================================
    // 4. PROCESAR EL CÓDIGO LEÍDO
    // ============================================
    // html5qrcode envia automaticamente el parametro textoDecodificado a esta funcion
    async function onEscaneoExitoso(textoDecodificado) {
        // 1. Apagamos la cámara inmediatamente para evitar dobles lecturas
        if (escannerActivo) {
            await escannerActivo.stop();
        }

        // 2. Feedback táctil (Hace vibrar el celular por 200 milisegundos)
        if (navigator.vibrate) {
            navigator.vibrate(200);
        }

        const beepSonido = document.getElementById('beep-sonido');
        if(beepSonido) {
            beepSonido.play().catch(error => {
                console.warn("No se pudo reproducir el sonido automaticamente.", error)
            });
        }

        try {
            // 3. Buscamos al empleado en Firestore usando el código leído
            const docEmpleado = await db.collection('empleados').doc(textoDecodificado).get();
            
            if (!docEmpleado.exists) {
                alert("Código QR no válido o empleado no encontrado.");
                iniciarCamara(); // Reiniciamos la cámara
                return;
            }

            const emp = docEmpleado.data();

            // Validamos que el empleado esté activo
            if (emp.estatus !== 'activo') {
                alert(`El empleado ${emp.nombre} está dado de baja o inactivo.`);
                iniciarCamara();
                return;
            }

            // 4. Guardamos el registro de asistencia en Firestore
            const registroData = {
                empleadoID: textoDecodificado,
                fechaHora: firebase.firestore.FieldValue.serverTimestamp(),
                tipoEvento: 'registro', // Más adelante se puede calcular si es entrada o salida
                fuente: 'escaneo_qr',
                registradoPor: auth.currentUser.email
            };

            await db.collection('registrosAsistencia').add(registroData);

            // 5. Mostramos el éxito en la pantalla
            mostrarResultado(emp.nombre);

        } catch (error) {
            console.error("Error al registrar asistencia:", error);
            alert("Ocurrió un error al conectar con la base de datos.");
            iniciarCamara();
        }
    }

    function onEscaneoFallo(error) {
        // Esta función se ejecuta muchas veces por segundo mientras no detecta un QR.
        // Se deja vacía para que no llene la consola de mensajes.
    }

    // ============================================
    // 5. ACTUALIZAR INTERFAZ DE RESULTADO
    // ============================================
    function mostrarResultado(nombreEmpleado) {
        // Ocultamos la cámara y mostramos la tarjeta
        document.getElementById('lectorQR').classList.add('hidden');
        document.getElementById('resultadoEscaneo').classList.remove('hidden');

        // Actualizamos los datos
        document.getElementById('resultadoEmpleado').textContent = nombreEmpleado;
        
        // Formateamos la hora actual (ej. 08:30 AM)
        const ahora = new Date();
        const horaFormateada = ahora.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        document.getElementById('resultadoHora').textContent = horaFormateada;
    }

    // Botón para escanear a la siguiente persona
    const btnEscanearNuevo = document.getElementById('btnEscanearNuevo');
    if (btnEscanearNuevo) {
        btnEscanearNuevo.addEventListener('click', () => {
            iniciarCamara();
        });
    }

});