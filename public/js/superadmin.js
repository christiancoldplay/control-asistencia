// ============================================
// superadmin.js - Lógica del Panel Corporativo
// ============================================

document.addEventListener('DOMContentLoaded', () => {

    // ============================================
    // 1. PROTECCIÓN DE RUTA (Auth Guard Estricto)
    // ============================================
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            try {
                const doc = await db.collection('usuarios').doc(user.uid).get();
                if (doc.exists && doc.data().rol === 'super_admin') {
                    document.getElementById('userNameDisplay').textContent = user.email;
                    cargarDirectores();
                    cargarEmpleadosSA(); 
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
    // 2. NAVEGACIÓN SPA
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
    // 3. LÓGICA DE HORARIOS (Para Contratación Externa)
    // ============================================
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

    // ============================================
    // 4. CREAR DIRECTOR NUEVO (Contratación Externa)
    // ============================================
    const vistaListaDirectores = document.getElementById('vistaListaDirectores');
    const vistaFormularioDirector = document.getElementById('vistaFormularioDirector');
    const btnMostrarFormDirector = document.getElementById('btnMostrarFormDirector');
    const btnVolverListaDirectores = document.getElementById('btnVolverListaDirectores');
    const formRegistroDirector = document.getElementById('formRegistroDirector');
    const cajaCredencialesDirector = document.getElementById('cajaCredencialesDirector');
    const textoCredencialesDirector = document.getElementById('textoCredencialesDirector');

    function limpiarFormularioDir() {
        formRegistroDirector.reset();
        cajaCredencialesDirector.classList.add('hidden');
        textoCredencialesDirector.value = "";
        formRegistroDirector.querySelector('button[type="submit"]').classList.remove('hidden');
    }

    if (btnMostrarFormDirector && btnVolverListaDirectores) {
        btnMostrarFormDirector.addEventListener('click', () => {
            limpiarFormularioDir();
            vistaListaDirectores.classList.add('hidden');
            vistaFormularioDirector.classList.remove('hidden');
        });
        btnVolverListaDirectores.addEventListener('click', () => {
            vistaFormularioDirector.classList.add('hidden');
            vistaListaDirectores.classList.remove('hidden');
        });
    }

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

    if (formRegistroDirector) {
        formRegistroDirector.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnSubmit = formRegistroDirector.querySelector('button[type="submit"]');
            
            const jornadaSeleccionada = parseFloat(document.getElementById('dirJornada').value);
            const horasCalculadas = calcularHorasTablaSA();
            if (horasCalculadas !== jornadaSeleccionada) {
                alert(`Error de Horario:\nHas seleccionado ${jornadaSeleccionada} hrs, pero la tabla suma ${horasCalculadas} hrs.`);
                return; 
            }

            const tipoJornadaSeleccionada = document.getElementById('dirTipoJornada').value;
            const errorCongruencia = validarCongruenciaJornadaHorarioSA(tipoJornadaSeleccionada);
            if (errorCongruencia) {
                alert(errorCongruencia);
                return; 
            }

            btnSubmit.disabled = true;
            btnSubmit.textContent = "Creando perfiles...";

            try {
                const sucursal = document.getElementById('dirSucursal').value;
                const codigo = document.getElementById('dirCodigo').value.trim();
                const nombre = document.getElementById('dirNombre').value.trim();
                const email = document.getElementById('dirEmail').value.trim();
                const telefono = document.getElementById('dirTelefono').value.trim();
                const rfc = document.getElementById('dirRFC').value.trim().toUpperCase();
                const curp = document.getElementById('dirCURP').value.trim().toUpperCase();
                const imss = document.getElementById('dirIMSS').value.trim();

                const empRef = await db.collection('empleados').doc(codigo).get();
                if (empRef.exists) {
                    alert("Error: El Código de Empleado ya está registrado.");
                    btnSubmit.disabled = false;
                    btnSubmit.textContent = "Crear Director y Generar Acceso";
                    return;
                }

                const fotoFile = document.getElementById('dirFoto').files[0];
                let fotoURL = "";
                if (fotoFile) {
                    const storageRef = storage.ref(`empleados/${codigo}/${fotoFile.name}`);
                    const uploadTask = await storageRef.put(fotoFile);
                    fotoURL = await uploadTask.ref.getDownloadURL(); 
                }

                const passwordTemp = generarPasswordTemporal();
                const credencialUsuario = await authSecundario.createUserWithEmailAndPassword(email, passwordTemp);
                const nuevoUID = credencialUsuario.user.uid;

                // Crear Empleado (Identidad Laboral)
                await db.collection('empleados').doc(codigo).set({
                    codigo: codigo,
                    nombre: nombre,
                    email: email,
                    telefono: telefono,
                    rfc: rfc,
                    curp: curp,
                    numIMSS: imss,
                    fotoURL: fotoURL,
                    banco: document.getElementById('empBanco').value || "",
                    numCuenta: document.getElementById('empCuenta').value.trim() || "",
                    clabe: document.getElementById('empClabe').value.trim() || "",
                    sucursal: sucursal,
                    cargo: 'Director Administrativo',
                    departamento: 'Administracion',
                    estatus: 'activo',
                    fechaIngreso: document.getElementById('dirFechaIngreso').value,
                    jornada: jornadaSeleccionada,
                    tipoJornada: tipoJornadaSeleccionada,
                    horario: obtenerHorarioFormularioSA(),
                    saldoHorasExtra: 0,
                    saldoPendiente: 0,
                    qrCodeUrl: "",
                    fechaRegistro: firebase.firestore.FieldValue.serverTimestamp()
                });

                // Crear Usuario (Identidad de Acceso)
                await db.collection('usuarios').doc(nuevoUID).set({
                    uid: nuevoUID,
                    empleadoID: codigo,
                    nombre: nombre,
                    email: email,
                    telefono: telefono,
                    rol: 'administrador',
                    sucursal: sucursal,
                    estatus: 'activo',
                    requiereCambioPassword: true,
                    fechaRegistro: firebase.firestore.FieldValue.serverTimestamp(),
                    registradoPor: auth.currentUser.email
                });

                await authSecundario.signOut();

                const mensaje = `Bienvenido, ${nombre}.\n\nHas sido designado como Director de la sucursal ${sucursal}.\n\nUtiliza estas credenciales para ingresar al sistema:\nUsuario: ${email}\nContraseña: ${passwordTemp}\n\nNota: Deberás cambiar tu contraseña en tu primer inicio de sesión.`;
                textoCredencialesDirector.value = mensaje;
                
                cajaCredencialesDirector.classList.remove('hidden');
                btnSubmit.classList.add('hidden'); 

                alert("Éxito: Director registrado en el sistema.");

            } catch (error) {
                console.error("Error al crear director:", error);
                if (error.code === 'auth/email-already-in-use') {
                    alert("Error: Este correo ya tiene una cuenta de acceso registrada.");
                } else {
                    alert("Error: " + error.message);
                }
                btnSubmit.disabled = false;
                btnSubmit.textContent = "Crear Director y Generar Acceso";
            }
        });
    }

    const btnCopiarCredencialesDir = document.getElementById('btnCopiarCredencialesDir');
    const textoBtnCopiarDir = document.getElementById('textoBtnCopiarDir');
    if (btnCopiarCredencialesDir) {
        btnCopiarCredencialesDir.addEventListener('click', () => {
            textoCredencialesDirector.select();
            navigator.clipboard.writeText(textoCredencialesDirector.value).then(() => {
                textoBtnCopiarDir.textContent = "¡Copiado!";
                setTimeout(() => { textoBtnCopiarDir.textContent = "Copiar Mensaje"; }, 2000);
            });
        });
    }

    // ============================================
    // 5. CARGAR DIRECTORES (Read)
    // ============================================
    const tablaDirectoresBody = document.getElementById('tablaDirectoresBody');

    function cargarDirectores() {
        if (!tablaDirectoresBody) return;

        db.collection('usuarios').where('rol', '==', 'administrador').onSnapshot((consulta) => {
            tablaDirectoresBody.innerHTML = ''; 
            if (consulta.empty) {
                tablaDirectoresBody.innerHTML = `<tr><td colspan="5" class="table-empty-state">No hay directores registrados.</td></tr>`;
                return;
            }

            const directoresArray = [];
            consulta.forEach(doc => directoresArray.push({ id: doc.id, ...doc.data() }));
            directoresArray.sort((a, b) => a.nombre.localeCompare(b.nombre));

            directoresArray.forEach((dir) => {
                const tr = document.createElement('tr');
                const estatusTexto = dir.estatus.charAt(0).toUpperCase() + dir.estatus.slice(1);
                
                let btnEstatusHTML = '';
                if (dir.estatus === 'activo') {
                    btnEstatusHTML = `<button class="btn-icon icon-danger" onclick="cambiarEstatusDirector('${dir.id}', 'inactivo')" title="Deshabilitar Acceso"><img src="recursos/icono-baja.svg" alt="Deshabilitar"></button>`;
                } else {
                    btnEstatusHTML = `<button class="btn-icon icon-success" onclick="cambiarEstatusDirector('${dir.id}', 'activo')" title="Habilitar Acceso"><img src="recursos/icono-alta.svg" alt="Habilitar"></button>`;
                }

                tr.innerHTML = `
                    <td>${dir.sucursal || 'No asignada'}</td>
                    <td>
                        <strong>${dir.nombre}</strong>
                        <span class="texto-secundario">${dir.empleadoID}</span>
                    </td>
                    <td>${dir.email}</td>
                    <td><span class="estatus-${dir.estatus}">${estatusTexto}</span></td>
                    <td>
                        <button class="btn-icon" onclick="restablecerPasswordDirector('${dir.email}')" title="Restablecer Contraseña">
                            <img src="recursos/icono-llave.svg" alt="Restablecer">
                        </button>
                        ${btnEstatusHTML}
                    </td>
                `;
                tablaDirectoresBody.appendChild(tr);
            });
        });
    }

    // ============================================
    // 6. CARGAR EMPLEADOS (Solo Lectura)
    // ============================================
    const tablaEmpleadosSABody = document.getElementById('tablaEmpleadosSABody');

    function cargarEmpleadosSA() {
        if (!tablaEmpleadosSABody) return;

        db.collection('empleados').where('estatus', '==', 'activo').onSnapshot((consulta) => {
            tablaEmpleadosSABody.innerHTML = ''; 
            if (consulta.empty) {
                tablaEmpleadosSABody.innerHTML = `<tr><td colspan="5" class="table-empty-state">No hay empleados registrados.</td></tr>`;
                return;
            }

            const empArray = [];
            consulta.forEach(doc => empArray.push({ id: doc.id, ...doc.data() }));
            empArray.sort((a, b) => a.nombre.localeCompare(b.nombre));

            empArray.forEach((emp) => {
                const tr = document.createElement('tr');
                
                let botonAscender = '';
                if (emp.cargo !== 'Director Administrativo') {
                    botonAscender = `
                        <button class="btn-icon icon-success" onclick="abrirModalAscenso('${emp.id}', '${emp.nombre}', '${emp.email}', '${emp.sucursal}')" title="Ascender a Director">
                            <img src="recursos/icono-alta.svg" alt="Ascender">
                        </button>
                    `;
                }

                tr.innerHTML = `
                    <td>${emp.sucursal || 'No asignada'}</td>
                    <td><strong>${emp.codigo || emp.id}</strong></td>
                    <td>${emp.nombre}</td>
                    <td>${emp.cargo}</td>
                    <td>${botonAscender}</td>
                `;
                tablaEmpleadosSABody.appendChild(tr);
            });
        });
    }

    // ============================================
    // 7. LÓGICA DE ASCENSO (Promoción Interna)
    // ============================================
    let empleadoAscensoID = null;
    let empleadoAscensoSucursal = null;
    const modalAscender = document.getElementById('modalAscender');
    const formAscenderEmpleado = document.getElementById('formAscenderEmpleado');
    const cajaCredencialesAscenso = document.getElementById('cajaCredencialesAscenso');
    const textoCredencialesAscenso = document.getElementById('textoCredencialesAscenso');

    window.abrirModalAscenso = function(id, nombre, email, sucursal) {
        empleadoAscensoID = id;
        empleadoAscensoSucursal = sucursal;
        document.getElementById('nombreEmpleadoAscenso').textContent = nombre;
        document.getElementById('ascEmail').value = email || ""; 
        
        cajaCredencialesAscenso.classList.add('hidden');
        formAscenderEmpleado.querySelector('button[type="submit"]').classList.remove('hidden');
        modalAscender.classList.remove('hidden');
    };

    document.getElementById('btnCerrarModalAscenso')?.addEventListener('click', () => {
        modalAscender.classList.add('hidden');
        formAscenderEmpleado.reset();
    });

    if (formAscenderEmpleado) {
        formAscenderEmpleado.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnSubmit = formAscenderEmpleado.querySelector('button[type="submit"]');
            btnSubmit.disabled = true;
            btnSubmit.textContent = "Procesando ascenso...";

            try {
                const email = document.getElementById('ascEmail').value.trim();
                const nombre = document.getElementById('nombreEmpleadoAscenso').textContent;
                const passwordTemp = generarPasswordTemporal();

                // 1. Crear cuenta en Auth
                const credencialUsuario = await authSecundario.createUserWithEmailAndPassword(email, passwordTemp);
                const nuevoUID = credencialUsuario.user.uid;

                // 2. Actualizar el cargo en la colección Empleados
                await db.collection('empleados').doc(empleadoAscensoID).update({
                    cargo: 'Director Administrativo'
                });

                // 3. Crear el perfil de Usuario
                await db.collection('usuarios').doc(nuevoUID).set({
                    uid: nuevoUID,
                    empleadoID: empleadoAscensoID,
                    nombre: nombre,
                    email: email,
                    rol: 'administrador',
                    sucursal: empleadoAscensoSucursal || 'Aguascalientes Sur',
                    estatus: 'activo',
                    requiereCambioPassword: true,
                    fechaRegistro: firebase.firestore.FieldValue.serverTimestamp(),
                    registradoPor: auth.currentUser.email
                });

                await authSecundario.signOut();

                const mensaje = `¡Felicidades, ${nombre}!\n\nHas sido promovido a Director Administrativo.\n\nUtiliza estas credenciales para ingresar al panel de control:\nUsuario: ${email}\nContraseña: ${passwordTemp}\n\nNota: Deberás cambiar tu contraseña en tu primer inicio de sesión.`;
                textoCredencialesAscenso.value = mensaje;
                
                cajaCredencialesAscenso.classList.remove('hidden');
                btnSubmit.classList.add('hidden'); 

            } catch (error) {
                console.error("Error al ascender empleado:", error);
                if (error.code === 'auth/email-already-in-use') {
                    alert("Error: Este correo ya tiene una cuenta de acceso registrada.");
                } else {
                    alert("Error: " + error.message);
                }
                btnSubmit.disabled = false;
                btnSubmit.textContent = "Confirmar Ascenso";
            }
        });
    }

    // ============================================
    // 8. ACCIONES DE GESTIÓN (Estatus y Password)
    // ============================================
    window.cambiarEstatusDirector = async function(idUsuario, nuevoEstatus) {
        const accion = nuevoEstatus === 'activo' ? 'habilitar' : 'deshabilitar';
        const confirmar = confirm(`¿Estás seguro de ${accion} el acceso de este Director?`);
        if (!confirmar) return;
        try {
            await db.collection('usuarios').doc(idUsuario).update({ estatus: nuevoEstatus });
        } catch (error) {
            console.error("Error al cambiar estatus:", error);
            alert("Error al actualizar el acceso.");
        }
    };

    window.restablecerPasswordDirector = async function(emailUsuario) {
        const confirmar = confirm(`¿Deseas enviar un enlace de recuperación de contraseña a:\n${emailUsuario}?`);
        if (!confirmar) return;
        try {
            await auth.sendPasswordResetEmail(emailUsuario);
            alert(`Éxito: Enlace enviado a ${emailUsuario}.`);
        } catch (error) {
            console.error("Error al enviar correo:", error);
            alert("Error al intentar enviar el correo.");
        }
    };

    const btnCopiarCredencialesAsc = document.getElementById('btnCopiarCredencialesAsc');
    const textoBtnCopiarAsc = document.getElementById('textoBtnCopiarAsc');
    if (btnCopiarCredencialesAsc) {
        btnCopiarCredencialesAsc.addEventListener('click', () => {
            textoCredencialesAscenso.select();
            navigator.clipboard.writeText(textoCredencialesAscenso.value).then(() => {
                textoBtnCopiarAsc.textContent = "¡Copiado!";
                setTimeout(() => { textoBtnCopiarAsc.textContent = "Copiar Mensaje"; }, 2000);
            });
        });
    }

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
    configurarBuscadorSA('buscadorDirectores', 'tablaDirectoresBody');
    configurarBuscadorSA('buscadorEmpleadosSA', 'tablaEmpleadosSABody');

});

