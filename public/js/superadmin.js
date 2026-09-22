// ============================================
// superadmin.js - Lógica del Panel Corporativo
// ============================================

document.addEventListener('DOMContentLoaded', () => {

    // ============================================
    // 1. PROTECCION DE RUTA (Auth Guard)
    // ============================================
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            try {
                const doc = await db.collection('usuarios').doc(user.uid).get();
                if (doc.exists && doc.data().rol === 'super_admin') {
                    document.getElementById('userNameDisplay').textContent = user.email;
                    cargarEmpleadosSA();
                    cargarAccesosSA();
                } else {
                    window.location.replace('index.html');
                }
            } catch (error) {
                console.error("Error al verificar rol:", error);
                window.location.replace('index.html');
            }
        } else {
            window.location.replace('index.html');
        }
    });

    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            await logoutUser();
        });
    }

    // ============================================
    // 2. NAVEGACION SPA
    // ============================================
    const navItems = document.querySelectorAll('.nav-item');
    const contentSections = document.querySelectorAll('.content-section');

    navItems.forEach(button => {
        button.addEventListener('click', () => {
            navItems.forEach(btn => btn.classList.remove('active'));
            contentSections.forEach(section => section.classList.remove('active'));
            button.classList.add('active');
            const targetId = button.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
        });
    });

    // ============================================
    // 3. LOGICA DEL FORMULARIO DE EMPLEADOS (DIRECTORES)
    // ============================================
    const vistaListaEmpleadosSA = document.getElementById('vistaListaEmpleadosSA');
    const vistaFormularioEmpleadoSA = document.getElementById('vistaFormularioEmpleadoSA');
    const btnMostrarFormEmpleadoSA = document.getElementById('btnMostrarFormEmpleadoSA');
    const btnVolverListaEmpleadosSA = document.getElementById('btnVolverListaEmpleadosSA');
    const formRegistroEmpleadoSA = document.getElementById('formRegistroEmpleadoSA');

    let empleadoEditandoID = null;
    let fotoActualURL = "";

    function limpiarFormularioSA() {
        formRegistroEmpleadoSA.reset();
        empleadoEditandoID = null;
        fotoActualURL = "";
        
        document.getElementById('empCodigo').readOnly = false;
        document.getElementById('empCodigo').classList.remove('input-bloqueado');
        document.getElementById('empFoto').required = true;
        
        document.getElementById('previewFotoSA').classList.add('hidden');
        document.getElementById('previewFotoSA').src = "";
        
        document.getElementById('tituloFormEmpleadoSA').textContent = "Registrar Nuevo Director";
        formRegistroEmpleadoSA.querySelector('button[type="submit"]').textContent = "Guardar Director";
        
        vistaFormularioEmpleadoSA.classList.add('hidden');
        vistaListaEmpleadosSA.classList.remove('hidden');
    }

    if (btnMostrarFormEmpleadoSA && btnVolverListaEmpleadosSA) {
        btnMostrarFormEmpleadoSA.addEventListener('click', () => {
            limpiarFormularioSA();
            vistaListaEmpleadosSA.classList.add('hidden');
            vistaFormularioEmpleadoSA.classList.remove('hidden');
        });
        btnVolverListaEmpleadosSA.addEventListener('click', limpiarFormularioSA);
    }

    // --- Logica de Horarios ---
    function controlInputsDescansoSA(checkboxOmitir) {
        const fila = checkboxOmitir.closest('tr');
        const inputInicio = fila.querySelector('.hora-descanso');
        const inputMin = fila.querySelector('.min-descanso');
        const diaLaborable = fila.querySelector('.dia-checkbox').checked;
        
        if (checkboxOmitir.checked || !diaLaborable) {
            inputInicio.disabled = true; inputInicio.value = '';
            inputMin.disabled = true; inputMin.value = 0;
        } else {
            inputInicio.disabled = false; inputMin.disabled = false;
        }
    }

    function controlInputsHorarioSA(checkboxDia) {
        const fila = checkboxDia.closest('tr');
        const inputsTiempo = fila.querySelectorAll('input[type="time"], input[type="number"]');
        const checkboxOmitir = fila.querySelector('.omitir-descanso-cb');
        
        if (!checkboxDia.checked) {
            inputsTiempo.forEach(input => { input.disabled = true; input.value = ''; });
            checkboxOmitir.disabled = true; checkboxOmitir.checked = false;
        } else {
            fila.querySelector('.hora-entrada').disabled = false;
            fila.querySelector('.hora-salida').disabled = false;
            checkboxOmitir.disabled = false;
            controlInputsDescansoSA(checkboxOmitir);
        }
    }

    document.querySelectorAll('#tablaHorarioSA .dia-checkbox').forEach(cb => {
        cb.addEventListener('change', () => controlInputsHorarioSA(cb));
        controlInputsHorarioSA(cb); 
    });
    document.querySelectorAll('#tablaHorarioSA .omitir-descanso-cb').forEach(cb => {
        cb.addEventListener('change', () => controlInputsDescansoSA(cb));
    });

    function calcularHorasTablaSA() {
        let totalMinutos = 0;
        const filas = document.querySelectorAll('#tablaHorarioSA tr');
        filas.forEach(fila => {
            const checkbox = fila.querySelector('.dia-checkbox');
            if (checkbox && checkbox.checked) {
                const entrada = fila.querySelector('.hora-entrada')?.value;
                const salida = fila.querySelector('.hora-salida')?.value;
                const minDescanso = parseInt(fila.querySelector('.min-descanso')?.value) || 0;

                if (entrada && salida) {
                    const [entHora, entMin] = entrada.split(':').map(Number);
                    const [salHora, salMin] = salida.split(':').map(Number);
                    let minutosTrabajados = ((salHora * 60) + salMin) - ((entHora * 60) + entMin);
                    minutosTrabajados -= minDescanso;
                    if (minutosTrabajados > 0) totalMinutos += minutosTrabajados;
                }
            }
        });
        return totalMinutos / 60;
    }

    function obtenerHorarioFormularioSA() {
        const horario = {};
        const filas = document.querySelectorAll('#tablaHorarioSA tr');
        filas.forEach(fila => {
            const checkbox = fila.querySelector('.dia-checkbox');
            if (checkbox) {
                const dia = checkbox.value;
                if (checkbox.checked) {
                    horario[dia] = {
                        entrada: fila.querySelector('.hora-entrada')?.value || "",
                        salida: fila.querySelector('.hora-salida')?.value || "",
                        omitirDescanso: fila.querySelector('.omitir-descanso-cb')?.checked || false,
                        inicioDescanso: fila.querySelector('.hora-descanso')?.value || "",
                        duracionDescansoMinutos: parseInt(fila.querySelector('.min-descanso')?.value) || 0
                    };
                } else {
                    horario[dia] = firebase.firestore.FieldValue.delete();
                }
            }
        });
        return horario;
    }

    function validarCongruenciaJornadaHorarioSA(tipoJornada) {
        const filas = document.querySelectorAll('#tablaHorarioSA tr');
        let mensajeError = null;
        filas.forEach(fila => {
            const checkbox = fila.querySelector('.dia-checkbox');
            if (checkbox && checkbox.checked) {
                const entrada = fila.querySelector('.hora-entrada')?.value;
                const salida = fila.querySelector('.hora-salida')?.value;
                const inicioDescanso = fila.querySelector('.hora-descanso')?.value || "";
                const minDescanso = parseInt(fila.querySelector('.min-descanso')?.value) || 0;
                const omitirDescanso = fila.querySelector('.omitir-descanso-cb')?.checked || false;

                if (entrada && salida) {
                    if (tipoJornada === 'continua_sin_descanso') {
                        if (inicioDescanso !== "" || minDescanso > 0) mensajeError = "El tipo de jornada 'Continua sin descanso' no permite registrar horas de descanso.";
                    } else if (tipoJornada === 'continua_con_descanso' || tipoJornada === 'partida') {
                        if (!omitirDescanso && (inicioDescanso === "" || minDescanso === 0)) mensajeError = "La jornada requiere descanso. Si un día específico no tiene descanso, marca la casilla 'Omitir Descanso'.";
                    }
                }
            }
        });
        return mensajeError;
    }

    // --- GUARDAR EMPLEADO EN FIRESTORE ---
    if (formRegistroEmpleadoSA) {
        formRegistroEmpleadoSA.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnSubmit = formRegistroEmpleadoSA.querySelector('button[type="submit"]');
            
            const jornadaSeleccionada = parseFloat(document.getElementById('empJornada').value);
            const horasCalculadas = calcularHorasTablaSA();
            if (horasCalculadas !== jornadaSeleccionada) {
                alert(`ERROR DE HORARIO:\nHas seleccionado ${jornadaSeleccionada} hrs, pero la tabla suma ${horasCalculadas} hrs.`);
                return; 
            }

            const tipoJornadaSeleccionada = document.getElementById('empTipoJornada').value;
            const errorCongruencia = validarCongruenciaJornadaHorarioSA(tipoJornadaSeleccionada);
            if (errorCongruencia) {
                alert(errorCongruencia);
                return; 
            }

            btnSubmit.disabled = true;
            btnSubmit.textContent = "Guardando...";

            try {
                const codigo = document.getElementById('empCodigo').value.trim();
                const fotoFile = document.getElementById('empFoto').files[0];
                let fotoFinalURL = fotoActualURL; 

                if (fotoFile) {
                    const storageRef = storage.ref(`empleados/${codigo}/${fotoFile.name}`);
                    const uploadTask = await storageRef.put(fotoFile);
                    fotoFinalURL = await uploadTask.ref.getDownloadURL(); 
                }

                const empleadoData = {
                    codigo: codigo,
                    nombre: document.getElementById('empNombre').value.trim(),
                    email: document.getElementById('empEmail').value.trim(),
                    telefono: document.getElementById('empTelefono').value.trim(),
                    rfc: document.getElementById('empRFC').value.trim().toUpperCase(),
                    curp: document.getElementById('empCURP').value.trim().toUpperCase(),
                    numIMSS: document.getElementById('empIMSS').value.trim(),
                    fotoURL: fotoFinalURL, 
                    banco: document.getElementById('empBanco').value,
                    numCuenta: document.getElementById('empCuenta').value.trim(),
                    clabe: document.getElementById('empClabe').value.trim(),
                    departamento: 'Administracion',
                    cargo: 'Director Administrativo',
                    sucursal: document.getElementById('empSucursal').value,
                    fechaIngreso: document.getElementById('empFechaIngreso').value,
                    jornada: jornadaSeleccionada,
                    tipoJornada: tipoJornadaSeleccionada,
                    horario: obtenerHorarioFormularioSA()
                };

                if (!empleadoEditandoID) {
                    empleadoData.estatus = 'activo';
                    empleadoData.saldoHorasExtra = 0;
                    empleadoData.saldoPendiente = 0;
                    empleadoData.qrCodeUrl = ""; 
                    empleadoData.fechaRegistro = firebase.firestore.FieldValue.serverTimestamp();
                }

                await db.collection('empleados').doc(codigo).set(empleadoData, { merge: true });
                alert(empleadoEditandoID ? "Director actualizado exitosamente." : "Director registrado exitosamente.");
                limpiarFormularioSA();

            } catch (error) {
                console.error("Error al guardar director:", error);
                alert("Ocurrió un error al guardar: " + error.message);
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.textContent = empleadoEditandoID ? "Actualizar Director" : "Guardar Director";
            }
        });
    }

    // ============================================
    // 4. CARGAR EMPLEADOS (Directores)
    // ============================================
    const tablaEmpleadosSABody = document.getElementById('tablaEmpleadosSABody');

    function cargarEmpleadosSA() {
        if (!tablaEmpleadosSABody) return;

        db.collection('empleados').where('cargo', '==', 'Director Administrativo').onSnapshot((consulta) => {
            tablaEmpleadosSABody.innerHTML = ''; 
            if (consulta.empty) {
                tablaEmpleadosSABody.innerHTML = `<tr><td colspan="5" class="table-empty-state">No hay directores registrados.</td></tr>`;
                return;
            }

            const empArray = [];
            consulta.forEach(doc => empArray.push({ id: doc.id, ...doc.data() }));
            empArray.sort((a, b) => a.nombre.localeCompare(b.nombre));

            empArray.forEach((emp) => {
                const tr = document.createElement('tr');
                const estatusTexto = emp.estatus.charAt(0).toUpperCase() + emp.estatus.slice(1);

                tr.innerHTML = `
                    <td>${emp.sucursal || 'No asignada'}</td>
                    <td><strong>${emp.codigo || emp.id}</strong></td>
                    <td>${emp.nombre}</td>
                    <td><span class="estatus-${emp.estatus}">${estatusTexto}</span></td>
                    <td>
                        <button class="btn-icon" onclick="editarEmpleadoSA('${emp.id}')" title="Editar Datos">
                            <img src="recursos/icono-editar.svg" alt="Editar">
                        </button>
                        <button class="btn-icon icon-success" onclick="abrirModalAccesoSA('${emp.id}', '${emp.nombre}', '${emp.email}', '${emp.sucursal}')" title="Otorgar Acceso al Sistema">
                            <img src="recursos/icono-llave.svg" alt="Acceso">
                        </button>
                    </td>
                `;
                tablaEmpleadosSABody.appendChild(tr);
            });
        });
    }

    // --- Editar Empleado ---
    window.editarEmpleadoSA = async function(id) {
        try {
            const doc = await db.collection('empleados').doc(id).get();
            if (!doc.exists) return;
            const emp = doc.data();

            empleadoEditandoID = id;
            fotoActualURL = emp.fotoURL || "";

            document.getElementById('empSucursal').value = emp.sucursal || "";
            document.getElementById('empCodigo').value = emp.codigo;
            document.getElementById('empCodigo').readOnly = true;
            document.getElementById('empCodigo').classList.add('input-bloqueado');
            
            document.getElementById('empNombre').value = emp.nombre;
            document.getElementById('empEmail').value = emp.email;
            document.getElementById('empTelefono').value = emp.telefono;
            document.getElementById('empRFC').value = emp.rfc;
            document.getElementById('empCURP').value = emp.curp;
            document.getElementById('empIMSS').value = emp.numIMSS;
            
            document.getElementById('empBanco').value = emp.banco || "";
            document.getElementById('empCuenta').value = emp.numCuenta || "";
            document.getElementById('empClabe').value = emp.clabe || "";
            
            document.getElementById('empFechaIngreso').value = emp.fechaIngreso;
            document.getElementById('empJornada').value = emp.jornada;
            document.getElementById('empTipoJornada').value = emp.tipoJornada;

            const filas = document.querySelectorAll('#tablaHorarioSA tr');
            filas.forEach(fila => {
                const checkbox = fila.querySelector('.dia-checkbox');
                const dia = checkbox.value;
                
                if (emp.horario && emp.horario[dia]) {
                    checkbox.checked = true;
                    controlInputsHorarioSA(checkbox);
                    
                    fila.querySelector('.hora-entrada').value = emp.horario[dia].entrada;
                    fila.querySelector('.hora-salida').value = emp.horario[dia].salida;
                    
                    const cbOmitir = fila.querySelector('.omitir-descanso-cb');
                    cbOmitir.checked = emp.horario[dia].omitirDescanso || false;
                    
                    fila.querySelector('.hora-descanso').value = emp.horario[dia].inicioDescanso || "";
                    fila.querySelector('.min-descanso').value = emp.horario[dia].duracionDescansoMinutos || 0;
                    
                    controlInputsDescansoSA(cbOmitir);
                } else {
                    checkbox.checked = false;
                    controlInputsHorarioSA(checkbox);
                }
            });

            document.getElementById('empFoto').required = false;
            const previewFoto = document.getElementById('previewFotoSA');
            if (emp.fotoURL) {
                previewFoto.src = emp.fotoURL;
                previewFoto.classList.remove('hidden');
            } else {
                previewFoto.classList.add('hidden');
            }

            document.getElementById('tituloFormEmpleadoSA').textContent = "Editar Director";
            formRegistroEmpleadoSA.querySelector('button[type="submit"]').textContent = "Actualizar Director";
            
            vistaListaEmpleadosSA.classList.add('hidden');
            vistaFormularioEmpleadoSA.classList.remove('hidden');

        } catch (error) {
            console.error("Error al cargar para editar:", error);
            alert("Ocurrió un error al cargar los datos.");
        }
    };

    // ============================================
    // 5. GESTION DE ACCESOS (Crear Usuario)
    // ============================================
    const appSecundaria = firebase.initializeApp(firebaseConfig, "AppSecundariaSuperAdmin");
    const authSecundario = appSecundaria.auth();

    function generarPasswordTemporal() {
        const caracteres = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
        let password = "";
        for (let i = 0; i < 8; i++) {
            password += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
        }
        return password;
    }

    let empleadoAccesoID = null;
    let empleadoAccesoSucursal = null;
    let passwordTemporalGlobal = "";
    
    const modalOtorgarAccesoSA = document.getElementById('modalOtorgarAccesoSA');
    const formOtorgarAccesoSA = document.getElementById('formOtorgarAccesoSA');
    const vistaFormCrearAccesoSA = document.getElementById('vistaFormCrearAccesoSA');
    const vistaExitoCrearAccesoSA = document.getElementById('vistaExitoCrearAccesoSA');
    const textoCredencialesSA = document.getElementById('textoCredencialesSA');

    window.abrirModalAccesoSA = function(id, nombre, email, sucursal) {
        empleadoAccesoID = id;
        empleadoAccesoSucursal = sucursal;
        document.getElementById('nombreEmpleadoAccesoSA').textContent = nombre;
        document.getElementById('accEmailSA').value = email || ""; 
        
        vistaFormCrearAccesoSA.classList.remove('hidden');
        vistaExitoCrearAccesoSA.classList.add('hidden');
        modalOtorgarAccesoSA.classList.remove('hidden');
    };

    document.getElementById('btnCerrarModalAccesoSA')?.addEventListener('click', () => {
        modalOtorgarAccesoSA.classList.add('hidden');
        formOtorgarAccesoSA.reset();
    });

    if (formOtorgarAccesoSA) {
        formOtorgarAccesoSA.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnSubmit = formOtorgarAccesoSA.querySelector('button[type="submit"]');
            btnSubmit.disabled = true;
            btnSubmit.textContent = "Generando...";

            try {
                const email = document.getElementById('accEmailSA').value.trim();
                const nombre = document.getElementById('nombreEmpleadoAccesoSA').textContent;
                passwordTemporalGlobal = generarPasswordTemporal();

                // 1. Crear cuenta en Auth
                const credencialUsuario = await authSecundario.createUserWithEmailAndPassword(email, passwordTemporalGlobal);
                const nuevoUID = credencialUsuario.user.uid;

                // 2. Crear el perfil de Usuario en Firestore
                await db.collection('usuarios').doc(nuevoUID).set({
                    uid: nuevoUID,
                    empleadoID: empleadoAccesoID,
                    nombre: nombre,
                    email: email,
                    rol: 'administrador', 
                    sucursal: empleadoAccesoSucursal || 'Aguascalientes Sur',
                    estatus: 'activo',
                    requiereCambioPassword: true,
                    fechaRegistro: firebase.firestore.FieldValue.serverTimestamp(),
                    registradoPor: auth.currentUser.email
                });

                await authSecundario.signOut();

                const mensaje = `Bienvenido, ${nombre}.\n\nHas sido designado como Director de la sucursal ${empleadoAccesoSucursal}.\n\nUtiliza estas credenciales para ingresar al panel de control:\nUsuario: ${email}\nContraseña: ${passwordTemporalGlobal}\n\nNota: Deberás cambiar tu contraseña en tu primer inicio de sesión.`;
                textoCredencialesSA.value = mensaje;
                
                vistaFormCrearAccesoSA.classList.add('hidden');
                vistaExitoCrearAccesoSA.classList.remove('hidden');

            } catch (error) {
                console.error("Error al generar acceso:", error);
                if (error.code === 'auth/email-already-in-use') {
                    alert("Este correo ya tiene una cuenta de acceso registrada en el sistema.");
                } else {
                    alert("Ocurrió un error: " + error.message);
                }
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.textContent = "Generar Credenciales";
            }
        });
    }

    const btnCopiarCredencialesSA = document.getElementById('btnCopiarCredencialesSA');
    const textoBtnCopiarSA = document.getElementById('textoBtnCopiarSA');
    if (btnCopiarCredencialesSA) {
        btnCopiarCredencialesSA.addEventListener('click', () => {
            textoCredencialesSA.select();
            navigator.clipboard.writeText(textoCredencialesSA.value).then(() => {
                textoBtnCopiarSA.textContent = "¡Copiado!";
                setTimeout(() => { textoBtnCopiarSA.textContent = "Copiar Mensaje"; }, 2000);
            });
        });
    }

    // ============================================
    // 6. CARGAR USUARIOS (Directores)
    // ============================================
    const tablaAccesosSABody = document.getElementById('tablaAccesosSABody');

    function cargarAccesosSA() {
        if (!tablaAccesosSABody) return;

        db.collection('usuarios').where('rol', '==', 'administrador').onSnapshot((consulta) => {
            tablaAccesosSABody.innerHTML = ''; 
            if (consulta.empty) {
                tablaAccesosSABody.innerHTML = `<tr><td colspan="5" class="table-empty-state">No hay accesos registrados.</td></tr>`;
                return;
            }

            const accesosArray = [];
            consulta.forEach(doc => accesosArray.push({ id: doc.id, ...doc.data() }));
            accesosArray.sort((a, b) => a.nombre.localeCompare(b.nombre));

            accesosArray.forEach((acc) => {
                const tr = document.createElement('tr');
                const estatusTexto = acc.estatus.charAt(0).toUpperCase() + acc.estatus.slice(1);
                
                let btnEstatusHTML = '';
                if (acc.estatus === 'activo') {
                    btnEstatusHTML = `<button class="btn-icon icon-danger" onclick="cambiarEstatusAccesoSA('${acc.id}', 'inactivo')" title="Deshabilitar Acceso"><img src="recursos/icono-baja.svg" alt="Deshabilitar"></button>`;
                } else {
                    btnEstatusHTML = `<button class="btn-icon icon-success" onclick="cambiarEstatusAccesoSA('${acc.id}', 'activo')" title="Habilitar Acceso"><img src="recursos/icono-alta.svg" alt="Habilitar"></button>`;
                }

                tr.innerHTML = `
                    <td>${acc.sucursal || 'No asignada'}</td>
                    <td><strong>${acc.nombre}</strong><span class="texto-secundario">${acc.empleadoID}</span></td>
                    <td>${acc.email}</td>
                    <td><span class="estatus-${acc.estatus}">${estatusTexto}</span></td>
                    <td>
                        <button class="btn-icon" onclick="restablecerPasswordSA('${acc.email}')" title="Restablecer Contraseña">
                            <img src="recursos/icono-llave.svg" alt="Restablecer">
                        </button>
                        ${btnEstatusHTML}
                    </td>
                `;
                tablaAccesosSABody.appendChild(tr);
            });
        });
    }

    window.cambiarEstatusAccesoSA = async function(idUsuario, nuevoEstatus) {
        const accion = nuevoEstatus === 'activo' ? 'habilitar' : 'deshabilitar';
        const confirmar = confirm(`¿Estás seguro de ${accion} el acceso de este Director?`);
        if (!confirmar) return;
        try {
            await db.collection('usuarios').doc(idUsuario).update({ estatus: nuevoEstatus });
        } catch (error) {
            console.error("Error al cambiar estatus:", error);
            alert("Ocurrió un error al actualizar el acceso.");
        }
    };

    window.restablecerPasswordSA = async function(emailUsuario) {
        const confirmar = confirm(`¿Deseas enviar un enlace de recuperación de contraseña a:\n${emailUsuario}?`);
        if (!confirmar) return;
        try {
            await auth.sendPasswordResetEmail(emailUsuario);
            alert(`Enlace enviado exitosamente a ${emailUsuario}.`);
        } catch (error) {
            console.error("Error al enviar correo:", error);
            alert("Ocurrió un error al intentar enviar el correo.");
        }
    };

    // Buscadores
    function configurarBuscadorSA(inputId, tablaBodyId) {
        const input = document.getElementById(inputId);
        if (!input) return;
        input.addEventListener('input', function(e) {
            const termino = e.target.value.toLowerCase();
            const filas = document.querySelectorAll(`#${tablaBodyId} tr`);
            filas.forEach(fila => {
                if (fila.querySelector('.table-empty-state')) return;
                const textoFila = fila.textContent.toLowerCase();
                if (textoFila.includes(termino)) fila.classList.remove('hidden');
                else fila.classList.add('hidden');
            });
        });
    }
    configurarBuscadorSA('buscadorEmpleadosSA', 'tablaEmpleadosSABody');
    configurarBuscadorSA('buscadorAccesosSA', 'tablaAccesosSABody');

});