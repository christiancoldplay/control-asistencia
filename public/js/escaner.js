// ============================================
// escaner.js - Lógica del Módulo de Recepción
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    
    let escannerActivo = null; // Guardará la instancia de la cámara

    // --- FUNCIÓN AUXILIAR: Formatear minutos a Horas y Minutos (UX) ---
    function formatearMinutos(totalMinutos) {
        if (!totalMinutos || totalMinutos === 0) return '0 min';
        
        const horas = Math.floor(totalMinutos / 60);
        const minutos = totalMinutos % 60;
        
        let texto = '';
        if (horas > 0) {
            texto += `${horas} hora${horas > 1 ? 's' : ''}`;
        }
        if (minutos > 0) {
            texto += ` ${minutos} min`;
        }
        return texto.trim();
    }

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
    // 4. PROCESAR EL CÓDIGO LEÍDO (Con Retardos Automáticos)
    // ============================================
    async function onEscaneoExitoso(textoDecodificado) {
        if (escannerActivo) {
            await escannerActivo.stop();
        }
        
        if (navigator.vibrate) {
            navigator.vibrate(200);
        }
        
        try {
            const docEmpleado = await db.collection('empleados').doc(textoDecodificado).get();
            
            if (!docEmpleado.exists) {
                alert("Código QR no válido o empleado no encontrado.");
                iniciarCamara(); 
                return;
            }
            
            const emp = docEmpleado.data();
            
            if (emp.estatus !== 'activo') {
                alert(`El empleado ${emp.nombre} está dado de baja o inactivo.`);
                iniciarCamara();
                return;
            }
            
            const ahora = new Date();
            
            // --- BLOQUEO POR INCIDENCIAS (VACACIONES, SUSPENSIO O INCAPACIDAD) ---
            // Buscamos si el empleado tiene vacaciones, suspension o incapacidad el día de hoy
            const incidenciasBloqueantes = await db.collection('incidencias')
            .where('empleadoID', '==', textoDecodificado)
            .where('estatus', '==', 'aprobada')
            .where('fechaInicio', '<=', firebase.firestore.Timestamp.fromDate(ahora))
            .get();
            
            let estaBloqueado = false;
            let motivoBloqueo = "";
            
            incidenciasBloqueantes.forEach(doc => {
                const inc = doc.data();
                const tiposBloqueo = ['vacaciones', 'suspension', 'incapacidad'];
                
                if (tiposBloqueo.includes(inc.tipoIncidencia)) {
                    const inicio = inc.fechaInicio.toDate();

                    if (inc.fechaFin) {
                        const fin = inc.fechaFin.toDate();
                        // Asegurarnos de que el fin cubra todo el día (23:59:59)
                        fin.setHours(23, 59, 59, 999);
                        if (ahora <= fin) {
                            estaBloqueado = true;
                            motivoBloqueo = inc.tipoIncidencia.toUpperCase();
                        }
                    } else {
                        // Si no tiene fecha fin, es de un solo día. 
                        // Comparamos si 'ahora' es exactamente el mismo día que 'inicio'.
                        if (ahora.toDateString() === inicio.toDateString()) {
                            estaBloqueado = true;
                            motivoBloqueo = inc.tipoIncidencia.toUpperCase();
                        }
                    }
                }
            });

            if (estaBloqueado) {
                alert(`ACCESO DENEGADO:\n El empleado tiene un registro activo de ${motivoBloqueo.replace(/_/g, ' ')}.`);
                iniciarCamara();
                return; // Detenemos el escaneo, no se registra la asistencia
            }

            // -- LOGICA DE INCIDENCIAS AUTOMATICAS (Retardos y salidas) --
            const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
            const diaHoyStr = diasSemana[ahora.getDay()];
            const horarioHoy = (emp.horario && emp.horario[diaHoyStr]) ? emp.horario[diaHoyStr] : null;

            const inicioDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0);
            const finDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59);
            
            const escaneosHoy = await db.collection('registrosAsistencia')
                .where('empleadoID', '==', textoDecodificado)
                .where('fechaHora', '>=', firebase.firestore.Timestamp.fromDate(inicioDia))
                .where('fechaHora', '<=', firebase.firestore.Timestamp.fromDate(finDia))
                .get();

            const numEscaneos = escaneosHoy.size;

            if (horarioHoy) {
                // A) EVALUAR ENTRADA (Primer escaneo del día)
                if (numEscaneos === 0 && horarioHoy.entrada) {
                    const [entHora, entMin] = horarioHoy.entrada.split(':').map(Number);
                    const horaEntradaExacta = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), entHora, entMin, 0);
                    
                    if (ahora > horaEntradaExacta) {
                        const diffMilisegundos = ahora - horaEntradaExacta;
                        let minutosRetardo = Math.floor(diffMilisegundos / (1000 * 60));

                        // Descontar tiempo de descanso si llegó durante o después de la comida
                        if (horarioHoy.inicioDescanso && !horarioHoy.omitirDescanso) {
                            const [descHora, descMin] = horarioHoy.inicioDescanso.split(':').map(Number);
                            const horaInicioDescanso = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), descHora, descMin, 0);
                            const duracionDescanso = horarioHoy.duracionDescansoMinutos || 0;
                            const horaFinDescanso = new Date(horaInicioDescanso.getTime() + (duracionDescanso * 60000));

                            if (ahora > horaInicioDescanso) {
                                if (ahora < horaFinDescanso) {
                                    const minutosTraslapados = Math.floor((ahora - horaInicioDescanso) / (1000 * 60));
                                    minutosRetardo -= minutosTraslapados;
                                } else {
                                    minutosRetardo -= duracionDescanso;
                                }
                            }
                        }

                        if (minutosRetardo > 0) {
                            await db.collection('incidencias').add({
                                empleadoID: textoDecodificado,
                                empleadoNombre: emp.nombre,
                                tipoIncidencia: 'retardo_injustificado',
                                fechaInicio: firebase.firestore.Timestamp.fromDate(ahora),
                                horasAfectadas: minutosRetardo, 
                                autorizantes: 'Sistema Automático',
                                motivo: `El empleado registró su entrada tarde. Tuvo un retardo de: ${formatearMinutos(minutosRetardo)}. Su hora de entrada debe ser a las: ${horarioHoy.entrada}.`,
                                estatus: 'pendiente_de_revision',
                                saldoPendiente: null,
                                fechaCreacion: firebase.firestore.FieldValue.serverTimestamp(),
                                registradoPor: 'sistema@linguatec.com'
                            });
                        }
                    }
                }
                
                // B) EVALUAR SALIDA ANTICIPADA (Último escaneo del día)
                const esEscaneoDeSalida = (emp.tipoJornada === 'continua_sin_descanso' || horarioHoy.omitirDescanso) ? (numEscaneos === 1) : (numEscaneos === 3);

                if (esEscaneoDeSalida && horarioHoy.salida) {
                    const [salHora, salMin] = horarioHoy.salida.split(':').map(Number);
                    const horaSalidaExacta = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), salHora, salMin, 0);
                    
                    if (ahora < horaSalidaExacta) {
                        const diffMilisegundos = horaSalidaExacta - ahora;
                        const minutosAnticipados = Math.floor(diffMilisegundos / (1000 * 60));

                        if (minutosAnticipados > 0) {
                            await db.collection('incidencias').add({
                                empleadoID: textoDecodificado,
                                empleadoNombre: emp.nombre,
                                tipoIncidencia: 'salida_anticipada',
                                fechaInicio: firebase.firestore.Timestamp.fromDate(ahora),
                                horasAfectadas: minutosAnticipados, 
                                autorizantes: 'Sistema Automático',
                                motivo: `El empleado registró su salida temprano. Se retiró ${formatearMinutos(minutosAnticipados)} antes de su hora de salida (${horarioHoy.salida}).`,
                                estatus: 'pendiente_de_revision',
                                saldoPendiente: null,
                                fechaCreacion: firebase.firestore.FieldValue.serverTimestamp(),
                                registradoPor: 'sistema@linguatec.com'
                            });
                        }
                    }
                }
            }

            // Guardamos el registro de asistencia normal
            const registroData = {
                empleadoID: textoDecodificado,
                fechaHora: firebase.firestore.FieldValue.serverTimestamp(),
                tipoEvento: 'registro', 
                fuente: 'escaneo_qr',
                registradoPor: auth.currentUser.email
            };

            await db.collection('registrosAsistencia').add(registroData);
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