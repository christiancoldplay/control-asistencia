// ============================================
// panel.js - Lógica de la Interfaz del Dashboard
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    
    // ============================================
    // 1. PROTECCIÓN DE RUTA (Auth Guard)
    // ============================================
    // Verifica si hay un usuario autenticado y muestra su correo en la interfaz
    // 'user' recibe al usuario si esta autenticado o null en caso contrario 
    auth.onAuthStateChanged((user) => {
        if (user) {
            document.getElementById('userNameDisplay').textContent = user.email;
            cargarMonitorDiario();//carga el monitor
            cargarEmpleados();//carga la tabla de empleados
            cargarUsuarios();//carga la tabla de usuarios
            cargarIncidencias();//carga la tabla de incidencias
            cargarDescansos();//carga la tabla de descansos
            cargarAjustes();// carga la tabla de ajustes de horario
        } else { //si no esta autenticado redirige al login (index.html)
            window.location.replace('index.html');
        }
    });

    // ============================================
    // 2. NAVEGACION SPA (Single Page Application) Menú Lateral del panel de Administracion
    // ============================================
    // Aqui se implementa un sistema de navegacion que cambia el contenido visible sin recargar la pagina,
    // utilizando clases CSS para mostrar u ocultar secciones.
    const navItems = document.querySelectorAll('.nav-item');//Seleccion de todos los botones de menu lateral con clase indicada
    const contentSections = document.querySelectorAll('.content-section');//Seleccion de todas las secciones de contenido con la clase indicada

    // itera sobre cada boton del menu lateral
    navItems.forEach(button => {
        //cada boton reacciona al detectar un click
        button.addEventListener('click', () => {
            
            // A. Quita la clase 'active' de todos los botones
            navItems.forEach(btn => btn.classList.remove('active'));
            
            // B. Oculta todas las secciones quitando la clase 'active'
            contentSections.forEach(section => section.classList.remove('active'));
            
            // C. Agrega la clase 'active' al botón clickeado
            button.classList.add('active');
            
            // D. Muestra la sección correspondiente
            const targetId = button.getAttribute('data-target');//obtiene el valor del atributo data-target
            document.getElementById(targetId).classList.add('active');//busca el elemento con ese ID (targetID) en el HTML y le agrega la clase active

            // E. Limpiar el reporte si salimos de esa pestana. 
            if (targetId !== 'seccion-reportes') {
                // si existe la funcion, la ejecuta
                if (typeof limpiarVistaReporte === 'function') {
                    limpiarVistaReporte();
                }
            }
        });
    });

    // ============================================
    // 3. CERRAR SESIÓN
    // ============================================
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            await logoutUser();
        });
    }
    
    //=======================================================
    //      FUNCION AUXILIAR: LIMPIAR FORMULARIO Y ESTADO
    // ======================================================
    function limpiarFormulario() {
        document.getElementById('formRegistroEmpleado').reset();
        empleadoEditandoID = null;
        fotoActualURL = "";
        
        // Desbloquear el input del código
        document.getElementById('empCodigo').readOnly = false;
        document.getElementById('empCodigo').style.backgroundColor = "var(--color-white)";
        
        // Volver a hacer la foto obligatoria
        document.getElementById('empFoto').required = true;
        
        // Restaurar textos originales
        document.querySelector('#vistaFormularioEmpleado h3').textContent = "Registrar Nuevo Empleado";
        document.querySelector('#formRegistroEmpleado button[type="submit"]').textContent = "Guardar Empleado";
        
        // Cambiar la vista para regresar a la tabla
        document.getElementById('vistaFormularioEmpleado').classList.add('hidden');
        document.getElementById('vistaListaEmpleados').classList.remove('hidden');

        // Ocultar previsualización de foto
        document.getElementById('previewFoto').classList.add('hidden');
        document.getElementById('previewFoto').src = "";
    }

    // ===============================================================
    // 4. SUB-NAVEGACION: INTERCAMBIO DE VISTAS LISTA DE EMPLEADOS O FORMULARIO DE REGISTRO
    // ===============================================================
    // Aqui se controla el intercambio de vistas entre el listado de empleados y el formulario para agregar nuevos empleados
    // funciona como un mini SPA dentro de la seccion principal.
    const vistaListaEmpleados = document.getElementById('vistaListaEmpleados');
    const vistaFormularioEmpleado = document.getElementById('vistaFormularioEmpleado');
    const btnMostrarFormulario = document.getElementById('btnMostrarFormulario');
    const btnVolverLista = document.getElementById('btnVolverLista');
    //control de la visibilidad de las vistas: lista de empleados o formulario de registro
    if (btnMostrarFormulario && btnVolverLista) {
        // Mostrar Formulario
        btnMostrarFormulario.addEventListener('click', () => {
            vistaListaEmpleados.classList.add('hidden');//oculta la lista de empleados con clase hidden
            vistaFormularioEmpleado.classList.remove('hidden');//muestra el formulario (elimina hidden)
        });

        // Volver a la Lista
        btnVolverLista.addEventListener('click', () => {
            limpiarFormulario();
        });
    }

    // ============================================
    // VALIDACIÓN DE LA FOTO DEL EMPLEADO
    // ============================================
    const empFotoInput = document.getElementById('empFoto');
    
    if (empFotoInput) {
        empFotoInput.addEventListener('change', function() {
            const file = this.files[0];
            
            if (file) {
                const maxSize = 3 * 1024 * 1024; //3MB
                
                if (file.size > maxSize) {
                    alert("La imagen es demasiado pesada. El límite es 3MB.\nPor favor, elige otra foto o comprímela.");
                    this.value = ''; // Limpia el input para obligar a subir otra imagen
                    return;
                }

                // Validar el tipo de archivo
                const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
                if (!validTypes.includes(file.type)) {
                    alert("Formato no válido. Solo se permiten imágenes JPG, PNG o WebP.");
                    this.value = ''; // Limpia el input
                }
            }
        });
    }

    // ============================================
    // BLOQUEAR INPUTS DE HORARIO
    // ============================================

    //Controla si los campos de descanso se habilitan o deshabilitan
    function controlInputsDescanso(checkboxOmitir) {
        const fila = checkboxOmitir.closest('tr');
        const inputInicio = fila.querySelector('.hora-descanso');
        const inputMin = fila.querySelector('.min-descanso');
        const diaLaborable = fila.querySelector('.dia-checkbox').checked;
        
        if (checkboxOmitir.checked || !diaLaborable) {
            // Si se omite el descanso o no se labora el día, bloqueamos y limpiamos
            inputInicio.disabled = true;
            inputInicio.value = '';
            inputMin.disabled = true;
            inputMin.value = 0;
        } else {
            // Si se labora y NO se omite el descanso, habilitamos
            inputInicio.disabled = false;
            inputMin.disabled = false;
        }
    }

    // Controla toda la fila cuando se marca/desmarca el dia laborable
    function controlInputsHorario(checkboxDia) {
        // obtiene el elemento 'tr' (fila de tabla) padre mas cercano
        const fila = checkboxDia.closest('tr');
        // Selecciona todos los inputs de la fila que sean tipo time o number
        const inputsTiempo = fila.querySelectorAll('input[type="time"], input[type="number"]');
        // obtiene la referencia al checkbox omitir descanso de la fila actual 
        const checkboxOmitir = fila.querySelector('.omitir-descanso-cb');

        if (!checkboxDia.checked) {
            //Dia no laborable, bloqueamos todo
            inputsTiempo.forEach(input => {
                input.disabled = true;
                input.value = '';
            });
            checkboxOmitir.disabled = true;
            checkboxOmitir.checked = false;
        }else {
            // Dia laborable: habilitamos entrada, salida y el checkbox de omitir
            fila.querySelector('.hora-entrada').disabled = false;
            fila.querySelector('.hora-salida').disabled = false;
            checkboxOmitir.disabled = false;

            //Evaluamos los campos de descanso basandonos en el checkbox de omitir
            controlInputsDescanso(checkboxOmitir);
        }        
    }

    // -- Asignar eventos a los checkboxes al cargar la pagina --
    //Busca en el documento HTML, todos los elementos con la clase 'dia-checkbox', devuelve un nodeList con los checkboxes,
    //forEach recorre uno por uno los checkboxes. 'cb' es el parametro que representa el checkbox actual.
    document.querySelectorAll('.dia-checkbox').forEach(cb => {
        //agrega un escuchador de eventos al checkbox. El evento 'change' se dispara cuando el usuario marca o desmarca el checkbox.
        //cuando pasa eso se ejecuta la funcion controlInputsHorario(cb)
        cb.addEventListener('change', () => controlInputsHorario(cb));
        controlInputsHorario(cb); // Ejecutamos una vez para inicializar el estado visual (gris)
    });

    // Busca en el documento HTML todos los elementos con la clase 'omitir-descanso-cb' y les asigna un escuchador de eventos
    // para controlar los campos de descanso. La funcion 'controlInputsDescanso' se dispara cuando el usuario marca o desmarca el checkbox "omitir descanso"
    document.querySelectorAll('.omitir-descanso-cb').forEach(cb => {
        cb.addEventListener('change', () => controlInputsDescanso(cb));
    });

    // ===========================================
    // PROCESO PARA GUARDAR EMPLEADO EN FIRESTORE
    // ==========================================
    // se obtiene un objeto con todos los campos del formulario de registro. Metodos y propiedades que dan acceso a todos los campos del mismo.
    const formRegistroEmpleado = document.getElementById('formRegistroEmpleado');

    //--- Funcion para calcular las horas seleccionadas de la tabla horario del empleado ---
    // Objetivo: Sumar las horas laborales de los dias seleccionados en la tabla de horarios del empleado, 
    // considerando horas de entrada, salida y descanso. Retorna el total de horas semanales. 
    function calcularHorasTabla() {
        let totalMinutos = 0; 
        //obtiene todas las filas de tabla horario
        const filas = document.querySelectorAll('#tablaHorario tr');
        // recorre cada fila (dia de la semana)
        filas.forEach(fila => {
            // busca el checkbox de la fila actual (dia)
            const checkbox = fila.querySelector('.dia-checkbox');
            // verifica que el checkbox exista y este marcado (dia seleccionado)
            if (checkbox && checkbox.checked) {
                // usamos '?.' (optional chaining) para proteger la lectura y evitar errores.
                // Obtiene la hora de entrada, o undefined si no existe 
                const entrada = fila.querySelector('.hora-entrada')?.value;
                // Obtiene la hora de salida, o undefined si no existe
                const salida = fila.querySelector('.hora-salida')?.value;
                // Obtiene los minutos de descanso. Si el input no existe o el valor no es valido, se usa 0.
                const minDescanso = parseInt(fila.querySelector('.min-descanso')?.value) || 0;
                // valida que ambos campos tengan un valor
                if (entrada && salida) {
                    // -- Convertir horas a minnutos --
                    // 'entrada.split(':') convierte la hora en un array de strings (08:30 -> [Ej: ["08", "30"])
                    // .map(Number) convierte cada string en numero (Ej: ["08", "30"] -> [8, 30])
                    const [entHora, entMin] = entrada.split(':').map(Number);
                    const [salHora, salMin] = salida.split(':').map(Number);
                    
                    const minutosEntrada = (entHora * 60) + entMin;//calcula la hora de entrada en minutos
                    const minutosSalida = (salHora * 60) + salMin;//calcula la hora de salida en minutos
                    
                    let minutosTrabajados = minutosSalida - minutosEntrada; 
                    minutosTrabajados -= minDescanso;
                    // Solo suma si los minutosTrabajados son positivos, para evitar errores de calculo
                    if (minutosTrabajados > 0) {
                        totalMinutos += minutosTrabajados;//acumula los minutos a trabajados de toda la semana
                    }
                }
            }
        });
        //calcula el total de horas a laborar en la semana segun la tabla de horario
        return totalMinutos / 60;
    }

    // --- Funcion para construir el objeto Map del Horario ---
    function obtenerHorarioFormulario() {
        const horario = {};
        const filas = document.querySelectorAll('#tablaHorario tr');
        
        filas.forEach(fila => {
            const checkbox = fila.querySelector('.dia-checkbox');
            if (checkbox) {
                const dia = checkbox.value;

                if (checkbox.checked) {
                    //si el dia se labora, guardamos sus horas
                    horario[dia] = {
                        //inicia construccion del objeto horario con sus claves y valores respectivas por dia seleccionado
                        // usamos ?. para evitar que la app se rompa si falta un input en el HTML
                        entrada: fila.querySelector('.hora-entrada')?.value || "",
                        salida: fila.querySelector('.hora-salida')?.value || "",
                        omitirDescanso: fila.querySelector('.omitir-descanso-cb')?.checked || false,
                        inicioDescanso: fila.querySelector('.hora-descanso')?.value || "",
                        duracionDescansoMinutos: parseInt(fila.querySelector('.min-descanso')?.value) || 0
                    };
                }else{
                    // Si el dia no se labora, le ordenamos a Firebase que lo elimine del documento
                    horario[dia] = firebase.firestore.FieldValue.delete();
                }
            }
        });
        //retorna el objeto horario completo del empleado
        return horario;
    }

    // --- funcion para validar inputs del formulario, para filtrar datos de entrada ---
    function validarDatosEmpleado() {
        const codigo = document.getElementById('empCodigo').value.trim();
        const nombre = document.getElementById('empNombre').value.trim();
        const email = document.getElementById('empEmail').value.trim();
        const telefono = document.getElementById('empTelefono').value.trim();
        const rfc = document.getElementById('empRFC').value.trim();
        const curp = document.getElementById('empCURP').value.trim();
        const imss = document.getElementById('empIMSS').value.trim();
        const cuenta = document.getElementById('empCuenta').value.trim();
        const clabe = document.getElementById('empClabe').value.trim();

        const regexAlfanumerico = /^[a-zA-Z0-9]+$/;
        const regexLetrasEspacios = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/; 
        const regexNumeros = /^[0-9]+$/;
        const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        //Expresiones regulares (regex)
        if (!regexAlfanumerico.test(codigo)) return "El Código solo debe contener letras y números.";
        if (!regexLetrasEspacios.test(nombre)) return "El Nombre solo debe contener letras y espacios.";
        if (!regexEmail.test(email)) return "El formato del Correo Electrónico no es válido.";
        if (telefono.length !== 10 || !regexNumeros.test(telefono)) return "El Teléfono debe tener exactamente 10 números.";
        if (!regexAlfanumerico.test(rfc)) return "El RFC solo debe contener letras y números.";
        if (!regexAlfanumerico.test(curp)) return "El CURP solo debe contener letras y números.";
        if (!regexNumeros.test(imss)) return "El IMSS solo debe contener números.";
        
        if (!regexNumeros.test(cuenta)) return "El Número de Cuenta solo debe contener números.";
        if (!regexNumeros.test(clabe)) return "La CLABE solo debe contener números.";

        return null; // retorna null cuando no hay errores detectados
    }

    // --- FUNCIÓN AUXILIAR para Validar Duplicados en Firestore ---
    async function verificarDuplicados(codigo, rfc, curp, idEditando) {
        // 1. Validar Código (Solo si es un empleado nuevo)
        if (!idEditando) {
            const docRef = await db.collection('empleados').doc(codigo).get();
            if (docRef.exists) return "El código de empleado que quiere ingresar ya está registrado.";
        }

        // 2. Validar RFC
        const rfcQuery = await db.collection('empleados').where('rfc', '==', rfc).get();
        if (!rfcQuery.empty) {
            // Verificamos si el RFC pertenece a OTRO empleado distinto al que estamos editando
            const esDuplicado = rfcQuery.docs.some(doc => doc.id !== idEditando);
            if (esDuplicado) return "El RFC que quiere ingresar ya esta registrado.";
        }

        // 3. Validar CURP
        const curpQuery = await db.collection('empleados').where('curp', '==', curp).get();
        if (!curpQuery.empty) {
            const esDuplicado = curpQuery.docs.some(doc => doc.id !== idEditando);
            if (esDuplicado) return "El CURP que quiere ingresar ya está registrado.";
        }

        return null; // No hay duplicados
    }

    // --- FUNCIÓN AUXILIAR para validar congruencia entre Tipo de Jornada y Horario ---
    // Verifica que los campos de descanso coincidan con el tipo de jornada elegida
    function validarCongruenciaJornadaHorario(tipoJornada) {
        const filas = document.querySelectorAll('#tablaHorario tr');
        let mensajeError = null;

        filas.forEach(fila => {
            const checkbox = fila.querySelector('.dia-checkbox');
            
            if (checkbox && checkbox.checked) {
                // usamos ?. para proteger la lectura
                const entrada = fila.querySelector('.hora-entrada')?.value;
                const salida = fila.querySelector('.hora-salida')?.value;
                const inicioDescanso = fila.querySelector('.hora-descanso')?.value || "";
                const minDescanso = parseInt(fila.querySelector('.min-descanso')?.value) || 0;
                const omitirDescanso = fila.querySelector('.omitir-descanso-cb')?.checked || false; 

                if (entrada && salida) {
                    if (tipoJornada === 'continua_sin_descanso') {
                        if (inicioDescanso !== "" || minDescanso > 0) {
                            mensajeError = "ERROR: El tipo de jornada 'Continua sin descanso' no permite registrar horas de descanso.";
                        }
                    } else if (tipoJornada === 'continua_con_descanso' || tipoJornada === 'partida') {
                        // Si NO se marcó la excepción, es obligatorio el descanso
                        if (!omitirDescanso && (inicioDescanso === "" || minDescanso === 0)) {
                            mensajeError = "ERROR: La jornada requiere especificar descanso. Si un día no debe tener descanso entonces marca la casilla 'Omitir Descanso' en esa fila.";
                        }
                    }
                }
            }
        });

        return mensajeError;
    }

    // =============================================
    //  5.  EVENTO SUBMIT DEL FORMULARIO 
    // =============================================
    if (formRegistroEmpleado) {
        formRegistroEmpleado.addEventListener('submit', async (e) => {
            e.preventDefault(); // evita que la pagina se recargue al enviar el formulario y se interrumpa la carga de datos en firestore
            
            const btnSubmit = formRegistroEmpleado.querySelector('button[type="submit"]');//Obtiene el boton de 'guardar' para manipularlo despues
            
            // 1. Validacion de formatos (Regex) - verificar que los campos cumplan con los formatos esperados
            const errorValidacion = validarDatosEmpleado();
            if (errorValidacion) {
                alert(`ERROR DE DATOS:\n${errorValidacion}`);
                return; 
            }

            // -- 2. VALIDACION MATEMATICA --
            // - Validacion de coincidencia entre horas definidas en jornada y las horas definidas en la tabla horario.
            // ambas deben coincidir para evitar inconsistencia en las horas que debe laborar el empleado
            const jornadaSeleccionada = parseFloat(document.getElementById('empJornada').value);
            const horasCalculadas = calcularHorasTabla();
            
            if (horasCalculadas !== jornadaSeleccionada) {
                alert(`ERROR DE HORARIO:\nHas seleccionado una jornada de ${jornadaSeleccionada} hrs semanales, pero el Horario seleccionado en la tabla suma ${horasCalculadas} hrs. Es necesario que coincidan para poder realizar el registro.`);
                return; 
            }

            // -- 3. VALIDACION DE CONGRUENCIA DE TIPO DE JORNADA VS HORARIO
            const tipoJornadaSeleccionada = document.getElementById('empTipoJornada').value;
            const errorCongruencia = validarCongruenciaJornadaHorario(tipoJornadaSeleccionada);
            
            if (errorCongruencia) {
                // Mostramos el error y usamos 'return' para detener el proceso.
                // Al no usar formRegistroEmpleado.reset(), los datos se quedan en pantalla.
                alert(errorCongruencia);
                return; 
            }

            // -- 4. VALIDACIÓN DE DUPLICADOS EN FIRESTORE --
            const codigo = document.getElementById('empCodigo').value.trim();
            const rfc = document.getElementById('empRFC').value.trim().toUpperCase();
            const curp = document.getElementById('empCURP').value.trim().toUpperCase();
            
            const errorDuplicado = await verificarDuplicados(codigo, rfc, curp, empleadoEditandoID);
            if (errorDuplicado) {
                alert(`ERROR DE DUPLICIDAD!:\n${errorDuplicado}`);
                return;
            }

            // -- 5. Bloquear boton 'Guardar' --
            //Evita que el usuario haga doble click al guardar y envie dos veces el mismo registro
            btnSubmit.disabled = true;
            btnSubmit.textContent = "Guardando...";
            // Procesar y Guardar datos de empleado
            try { 
                const codigo = document.getElementById('empCodigo').value.trim();//codigo de empleado
                // Obtiene el archivo de imagen seleccionado (tipo File).Si no selecciona archivo, foloFile sera undefined
                const fotoFile = document.getElementById('empFoto').files[0];  
                //urlParaGuardar es una variable que almacenara la URL definitiva de la foto del empleado que se guardara en Firestore             
                //fotoActualURL es la variable global que se llena al dar click en el boton Editar
                let urlParaGuardar = fotoActualURL;

                // 6. Subir foto a FIREBASE STORAGE (Solo si seleccionaron una nueva)
                if (fotoFile) {
                    const storageRef = storage.ref(`empleados/${codigo}/${fotoFile.name}`);//crea una referencia en storage con ruta tipo "ej: empleados/EMP-001/foto.jpg"
                    const uploadTask = await storageRef.put(fotoFile);//sube el archivo a firebase storage
                    urlParaGuardar = await uploadTask.ref.getDownloadURL(); //actualiza el nuevo link (url) de la imagen nueva
                }

                // 7. Construccion del objeto "Empleado" para Firestore
                const empleadoData = {
                    codigo: codigo,
                    nombre: document.getElementById('empNombre').value.trim(),
                    email: document.getElementById('empEmail').value.trim(),
                    telefono: document.getElementById('empTelefono').value.trim(),
                    rfc: document.getElementById('empRFC').value.trim().toUpperCase(),
                    curp: document.getElementById('empCURP').value.trim().toUpperCase(),
                    numIMSS: document.getElementById('empIMSS').value.trim(),
                    fotoURL: urlParaGuardar,//fotoURL = almacena la foto vieja o nueva si la actualizaron en la edicion 
                    
                    banco: document.getElementById('empBanco').value,
                    numCuenta: document.getElementById('empCuenta').value.trim(),
                    clabe: document.getElementById('empClabe').value.trim(),
                    
                    departamento: document.getElementById('empDepartamento').value,
                    cargo: document.getElementById('empCargo').value,
                    fechaIngreso: document.getElementById('empFechaIngreso').value,
                    jornada: jornadaSeleccionada,
                    tipoJornada: document.getElementById('empTipoJornada').value,
                    observaciones: document.getElementById('empObservaciones').value.trim(),
                    
                    horario: obtenerHorarioFormulario(),
                    sucursal: 'Aguascalientes Sur'              
                };

                // Si es un empleado nuevo (no Edicion), le agregamos los campos base al objeto "Empleado" que se enviara a firestore
                if(!empleadoEditandoID) {
                    empleadoData.estatus = 'activo';
                    empleadoData.saldoHorasExtra = 0;
                    empleadoData.qrCodeUrl = "";
                    empleadoData.fechaRegistro = firebase.firestore.FieldValue.serverTimestamp();
                }

                // 8. Guardar o Actualizar en Firestore
                // Accede a la coleccion 'empleados' en firestore, usa el codigo del empleado como ID del documento
                // Guardar en Firestore usando "merge:true" en lugar de sobrescribir 
                // permite que campos y valores que no se envian desde el formulario se conserven (como saldoHorasExtra,estatus,etc..)
                await db.collection('empleados').doc(codigo).set(empleadoData, { merge:true });

                // Operador ternario: muestra mensaje según si es edición (true) o creación (false)
                alert( empleadoEditandoID ? "Empleado actualizado exitosamente." : "Empleado registrado Exitosamente");
                                
                // Ejecutamos la funcion de limpiar el formulario
                limpiarFormulario();

            } catch (error) { //captura cualquier error en el guardado del empleado en firestore
                console.error("Error al guardar empleado:", error);
                alert("Ocurrió un error al guardar: " + error.message);
            } finally { //siempre se ejecuta independientemente de errores
                // desbloquea el boton 'Guardar Empleado" (submit)
                btnSubmit.disabled = false;
                btnSubmit.textContent = empleadoEditandoID ? "Actualizar Empleado" : "Guardar Empleado";
            }
        });
    }

    // ============================================
    // 6. CARGAR Y MOSTRAR EMPLEADOS
    // ============================================
    
    const tablaEmpleadosBody = document.getElementById('tablaEmpleadosBody');
    let filtroEstatusEmpleados = 'activo'; // Por defecto mostramos los activos

    if (btnTabEmpActivos && btnTabEmpInactivos) {
        btnTabEmpActivos.addEventListener('click', () => {
            filtroEstatusEmpleados = 'activo';
            btnTabEmpActivos.classList.add('active');
            btnTabEmpInactivos.classList.remove('active');
            cargarEmpleados(); // Recargar la tabla
        });

        btnTabEmpInactivos.addEventListener('click', () => {
            filtroEstatusEmpleados = 'baja';
            btnTabEmpInactivos.classList.add('active');
            btnTabEmpActivos.classList.remove('active');
            cargarEmpleados(); // Recargar la tabla
        });
    }

    function cargarEmpleados() {
        if (!tablaEmpleadosBody) return;//si no existe la tabla, sale de la funcion

        // onSnapshot escucha la base de datos de Firestore en tiempo real
        db.collection('empleados')
        .where('estatus', '==', filtroEstatusEmpleados)
        .onSnapshot((querySnapshot) => {
            
            // Elimina el contenido actual de la tabla
            tablaEmpleadosBody.innerHTML = ''; 

            // Si no hay empleados en la base de datos, muestra mensaje y sale de la funcion 
            if (querySnapshot.empty) {
                const mensaje = filtroEstatusEmpleados === 'activo' ? 'No hay empleados activos.' : 'No hay empleados inactivos.';
                tablaEmpleadosBody.innerHTML = `<tr><td colspan="5" class="table-empty-state">${mensaje}</td></tr>`;
                return;
            }

            // Guardamos los documentos en un arreglo para ordenarlos alfabeticamente por nombre
            const empleadosArray = [];
            querySnapshot.forEach(doc => {
                empleadosArray.push({ id: doc.id, ...doc.data() });
            });
            empleadosArray.sort((a, b) => a.nombre.localeCompare(b.nombre));

            // Recorremos el arreglo ya ordenado
            empleadosArray.forEach((emp) => {                
                const tr = document.createElement('tr');// Crea una nueva fila de tabla vacia

                //Extraccion y normalizacion de los datos del empleado
                const codigo = emp.codigo || emp.id; 
                const nombre = emp.nombre || 'Sin nombre registrado';
                const cargo = emp.cargo || 'Sin cargo';  
                const estatusDb = emp.estatus || 'inactivo';
                const estatusTexto = estatusDb.charAt(0).toUpperCase() + estatusDb.slice(1);// hace mayuscula la primer letra

                // -----------------------------------------------
                // Logica para mostrar el boton de alta o baja, de acuerdo al estatus del empleado
                // -----------------------------------------------
                let botonEstadoHTML = '';
                if (estatusDb === 'activo') {
                    // Si el estatus es activo, mostramos el botón rojo (baja) para "Dar de Baja"
                    botonEstadoHTML = `
                        <button class="btn-icon icon-danger" onclick="darDeBajaEmpleado('${emp.id}')" title="Dar de Baja">
                            <img src="recursos/icono-baja.svg" alt="Baja">
                        </button>`;
                } else {
                    // Si el estatus es inactivo, mostramos el botón verde (alta) para "Dar de Alta"
                    botonEstadoHTML = `
                        <button class="btn-icon icon-success" onclick="darDeAltaEmpleado('${emp.id}')" title="Reactivar Empleado">
                            <img src="recursos/icono-alta.svg" alt="Alta">
                        </button>`;
                }

                // Construimos el HTML de las columnas de cada fila (empleado) con sus respectivos valores o funciones
                tr.innerHTML = `
                    <td><strong>${codigo}</strong></td>
                    <td>${nombre}</td>
                    <td>${cargo}</td>
                    <td><span class="estatus-${estatusDb}">${estatusTexto}</span></td>
                    <td>
                        <button class="btn-icon" onclick="editarEmpleado('${emp.id}')" title="Editar">
                            <img src="recursos/icono-editar.svg" alt="Editar">
                        </button>
                        <button class="btn-icon" onclick="verDetalles('${emp.id}')" title="Ver Detalles">
                            <img src="recursos/icono-ver.svg" alt="Ver">
                        </button>
                        <button class="btn-icon" onclick="mostrarCredencial('${emp.id}')" title="Ver Credencial">
                            <img src="recursos/icono-credencial.svg" alt="Credencial">
                        </button>
                        ${botonEstadoHTML} <!-- Aqui se define el color del boton rojo o verde de acuerdo al estatus del empleado (estatusDb) -->
                    </td>
                `;
                // Agregamos la fila creada a la tabla para que sea visible en la interfaz usando appenChild
                tablaEmpleadosBody.appendChild(tr);
            });

        }, (error) => {
            console.error("Error al cargar empleados:", error);
            tablaEmpleadosBody.innerHTML = `
                <tr>
                    <td colspan="5" class="table-empty-state" estatus-inactivo">
                        Error al cargar los datos.
                    </td>
                </tr>`;
        });
    }
    
      // ============================================
    // 7. EDITAR EMPLEADO (UPDATE - Cargar datos)
    // =============================================
    // Variable para saber si estamos creando o editando. es null cuando creamos, y tiene codigo cuando estamos editando   
    let empleadoEditandoID = null;
    let fotoActualURL = "";// Variable global, en edicion contiene la URL de la foto en firestore. Si es un empleado nuevo esta vacia.
    // == Funcion de edicion: ==
    // - La funcion es global y asincrona.
    window.editarEmpleado = async function(id) {
        console.log("Cargando datos del empleado:", id);        
        try {
            // 1. Busca el documento del empleado desde Firestore
            const doc = await db.collection('empleados').doc(id).get();
            if (!doc.exists) {// si no existe el id, sale de la funcion
                alert("El empleado no existe.");
                return;
            }
            
            const emp = doc.data();//guarda el documento(datos) del empleado(id) buscado previamente

            // 2. Cambiamos el estado del sistema a "Modo Edición", asignando el id a 'empleadoEditandoID'
            empleadoEditandoID = id;
            fotoActualURL = emp.fotoURL || "";//almacena la URL de la foto actual en Firestore, sino tiene usa ""(string vacio)

            // 3. Asignacion de los datos del empleado a cada campo del formulario
            document.getElementById('empCodigo').value = emp.codigo;
            document.getElementById('empCodigo').readOnly = true; // Se bloquea el código, para solo permitir lectura y evitar duplicado o inconsistencia en base de datos(firestore)
            document.getElementById('empCodigo').style.backgroundColor = "#e9ecef"; 
            
            document.getElementById('empNombre').value = emp.nombre;
            document.getElementById('empEmail').value = emp.email;
            document.getElementById('empTelefono').value = emp.telefono;
            document.getElementById('empRFC').value = emp.rfc;
            document.getElementById('empCURP').value = emp.curp;
            document.getElementById('empIMSS').value = emp.numIMSS;
            
            document.getElementById('empBanco').value = emp.banco;
            document.getElementById('empCuenta').value = emp.numCuenta;
            document.getElementById('empClabe').value = emp.clabe;
            
            document.getElementById('empDepartamento').value = emp.departamento;
            document.getElementById('empCargo').value = emp.cargo;
            document.getElementById('empFechaIngreso').value = emp.fechaIngreso;
            document.getElementById('empJornada').value = emp.jornada;
            document.getElementById('empTipoJornada').value = emp.tipoJornada;
            document.getElementById('empObservaciones').value = emp.observaciones || "";

            // 4. Rellenado de la tabla de horarios
            //obtiene todas las filas de la tabla horario del empleado
            const filas = document.querySelectorAll('#tablaHorario tr');

            filas.forEach(fila => {
                const checkbox = fila.querySelector('.dia-checkbox');//busca en la fila un elemento con la clase 'dia-checkbox y devuelve la primer coincidencia
                const dia = checkbox.value;//obtiene el valor asignado en el atributo value y lo guarda en la variable 'dia'
                
                // Si el día existe en el horario guardado en Firebase marca el checkbox
                // y rellena los campos de hora de la fila actual
                if (emp.horario && emp.horario[dia]) {
                    checkbox.checked = true;
                    // desbloqueamos la fila antes de inyectar los datos    
                    controlInputsHorario(checkbox);

                    //inyectamos los datos de firebase
                    fila.querySelector('.hora-entrada').value = emp.horario[dia].entrada;
                    fila.querySelector('.hora-salida').value = emp.horario[dia].salida;
                    //cargar la excepcion
                    const cbOmitir = fila.querySelector('.omitir-descanso-cb');
                    cbOmitir.checked = emp.horario[dia].omitirDescanso || false;

                    fila.querySelector('.hora-descanso').value = emp.horario[dia].inicioDescanso || "";
                    fila.querySelector('.min-descanso').value = emp.horario[dia].duracionDescansoMinutos || 0;

                    //Actualizar la vista de los inputs
                    controlInputsDescanso(cbOmitir);
                } else {
                    // Si no trabaja ese día, desmarca el checkbox y limpia los campos de la fila del dia en turno
                    checkbox.checked = false;
                    controlInputsHorario(checkbox);
                    // fila.querySelector('.hora-entrada').value = "";
                    // fila.querySelector('.hora-salida').value = "";
                    // fila.querySelector('.hora-descanso').value = "";
                    // fila.querySelector('.min-descanso').value = 0;
                    
                    // // Desmarcamos tambien la excepcion de descanso
                    // const cbOmitir = fila.querySelector('.omitir-descanso-cb');
                    // if (cbOmitir) cbOmitir.checked = false;
                    
                    // Ejecutamos la funcion visual para que bloquee toda la fila
                }
            });

            // 5. Como es edición, la foto no es obligatoria (ya hay una en la Firebase Storage)
            document.getElementById('empFoto').required = false;
            // Mostrar la foto actual si existe
            const previewFoto = document.getElementById('previewFoto');
            if (emp.fotoURL) {
                previewFoto.src = emp.fotoURL;
                previewFoto.classList.remove('hidden');
            } else {
                previewFoto.classList.add('hidden');
            }

            // 6. Cambiamos la interfaz de usuario para mostrar el formulario
            document.getElementById('vistaListaEmpleados').classList.add('hidden');//oculta la lista de empleados
            document.getElementById('vistaFormularioEmpleado').classList.remove('hidden');//muestra el formulario
            
            // Cambia el titulo de "Registrar Nuevo Empleado" a "Editar Empleado"
            document.querySelector('#vistaFormularioEmpleado h3').textContent = "Editar Empleado";
            // Cambia el texto del boton de "Guardar Empleado" a "Actualizar Empleado"
            document.querySelector('#formRegistroEmpleado button[type="submit"]').textContent = "Actualizar Empleado";

        } catch (error) {
            console.error("Error al cargar para editar:", error);
            alert("Ocurrió un error al cargar los datos del empleado.");
        }
    };
    

    // ============================================
    // 8. DAR DE BAJA A UN EMPLEADO (Baja Logica)
    // ============================================
    //funcion global para dar de baja un empleado
    window.darDeBajaEmpleado = async function(id) {
        // 1. Confirmación y captura del motivo, mostrar ventana usando funcion prompt del navegador
        const motivo = prompt("ATENCIÓN: Estás a punto de dar de baja a este empleado.\n\nPara continuar, escribe el motivo de la baja:");
        
        // Si presionan "Cancelar" o lo deja vacío, se detiene el proceso
        if (motivo === null || motivo.trim() === "") {
            alert("Operación cancelada. Se requiere un motivo para dar de baja.");
            return;
        }

        // 2. Confirmación de seguridad
        const confirmar = confirm(`¿Estás seguro de dar de baja por el motivo: "${motivo}"?`);
        if (!confirmar) return;//si no confirma se cancela el proceso de baja

        try {
            // 3. Ejecutamos la "Baja Lógica" en Firestore (si se confirma)
            //no se elimina el empleado, solo cambia su estatus a 'inactivo' 
            //se registra la fecha de la baja, y su motivo
            await db.collection('empleados').doc(id).update({
                estatus: 'baja',
                fechaBaja: firebase.firestore.FieldValue.serverTimestamp(),
                motivoBaja: motivo.trim()
            });

            alert("Empleado dado de baja exitosamente.");

        } catch (error) {
            console.error("Error al dar de baja:", error);
            alert("Ocurrió un error al intentar dar de baja al empleado.");
        }
    };

    // ============================================
    // 9. VER DETALLES DEL EMPLEADO (Modal)
    // ============================================
    window.verDetalles = async function(id) {
        try {
            const doc = await db.collection('empleados').doc(id).get();
            if (!doc.exists) return;
            const emp = doc.data();

            const modalBody = document.getElementById('modalBodyDetalles');
            
            // Definimos el orden cronologico de los dias como se deben mostrar
            const ordenDias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
            // Formatear el horario
            let horarioHTML = "<ul class='detalle-horario-lista'>";
            if (emp.horario) {
                //recorremos el array del orden de los dias definido
                ordenDias.forEach(dia => {
                    // si el empleado tinen un horario guardado para ese dia, se imprime
                    if (emp.horario[dia]) {
                        const horas = emp.horario[dia];
                        horarioHTML += `<li><strong>${dia.toUpperCase()}:</strong> ${horas.entrada} a ${horas.salida}. Descanso: ${horas.inicioDescanso} (${horas.duracionDescansoMinutos} mins.)</li>`;
                    }
                });
            }
            horarioHTML += "</ul>";
            //proteccion del estatus por si es undefined
            const estatusDb = emp.estatus || 'inactivo';

            // Logica para el saldo de horas extra
            const saldoExtraMinutos = emp.saldoHorasExtra || 0;
            const horasExtra = Math.floor(saldoExtraMinutos / 60);
            const minsExtra = saldoExtraMinutos % 60;

            // padStart(2, '0') asegura que siempre haya dos dígitos (ej. '05' en lugar de '5')
            const horasExtraStr = String(horasExtra).padStart(2, '0');
            const minsExtraStr = String(minsExtra).padStart(2, '0');

            let saldoExtraFormateado = '';
            if (horasExtra > 0) {
                saldoExtraFormateado = `${horasExtraStr}:${minsExtraStr} hrs.`;
            } else {
                saldoExtraFormateado = `00:${minsExtraStr} mins.`;
            }

            // Inyeccion del HTML en el modal agrupado por secciones
            modalBody.innerHTML = `
                <div class="detalle-grid">
                    <div class="detalle-foto">
                        <img src="${emp.fotoURL || ''}" alt="Foto de ${emp.nombre}" onerror="this.src='recursos/sin-foto.svg'">
                        <div class="detalle-estatus-contenedor">
                            <span class="estatus-${estatusDb} detalle-estatus-texto">${estatusDb.toUpperCase()}</span>
                        </div>
                    </div>

                    <div class="detalle-info">

                        <h4 class="detalle-seccion-titulo">Datos Personales</h4>
                        <p><strong>Código:</strong> ${emp.codigo || 'No registrado'}</p>
                        <p><strong>Nombre:</strong> ${emp.nombre || 'No registrado'}</p>
                        <p><strong>Email:</strong> ${emp.email || 'No registrado'}</p>
                        <p><strong>Teléfono:</strong> ${emp.telefono || 'No registrado'}</p>
                        <p><strong>RFC:</strong> ${emp.rfc || 'No registrado'}</p>
                        <p><strong>CURP:</strong> ${emp.curp || 'No registrado'}</p>
                        <p><strong>NSS(IMSS):</strong> ${emp.numIMSS || 'No registrado'}</p>

                        <h4 class="detalle-seccion-titulo">Datos Laborales</h4>
                        <p><strong>Departamento:</strong> ${emp.departamento || 'No registrado'}</p>
                        <p><strong>Cargo:</strong> ${emp.cargo || 'No registrado'}</p>
                        <p><strong>Fecha Ingreso:</strong> ${emp.fechaIngreso || 'No registrado'}</p>
                        <p><strong>Jornada:</strong> ${emp.jornada} hrs (${emp.tipoJornada || 'No registrado'})</p>

                        <p><strong>Saldo horas extra:</strong> ${saldoExtraFormateado}</p>                        
                        
                        <h4 class="detalle-seccion-titulo">Datos Bancarios</h4>
                        <p><strong>Banco:</strong> ${emp.banco || 'No registrado'}</p>
                        <p><strong>Cuenta:</strong> ${emp.numCuenta || 'No registrado'}</p>
                        <p><strong>CLABE:</strong> ${emp.clabe || 'No registrado'}</p>

                        <h4 class="detalle-seccion-titulo">Horario Laboral</h4>
                        ${horarioHTML}
                        
                        <h4 class="detalle-seccion-titulo">Observaciones</h4>
                        <p>${emp.observaciones || 'Ninguna observacion registrada.'}</p>                        
                        
                    </div>
                </div>
            `;

            // Mostrar el modal
            document.getElementById('modalDetalles').classList.remove('hidden');

        } catch (error) {
            console.error("Error al ver detalles:", error);
            alert("Ocurrió un error al cargar los detalles.");
        }
    };    

    // Evento para cerrar el modal
    const btnCerrarModal = document.getElementById('btnCerrarModal');
    if (btnCerrarModal) {
        btnCerrarModal.addEventListener('click', () => {
            document.getElementById('modalDetalles').classList.add('hidden');
        });
    }

    // ===================================================
    // 10. REACTIVAR EMPLEADO/DAR DE ALTA (Alta Logica)
    // ===================================================
    window.darDeAltaEmpleado = async function(id) {
        // Actualizamos el mensaje para notificar al administrador que la antigüedad se reiniciará
        const confirmar = confirm("¿Estás seguro de reactivar a este empleado?\n\nSu estatus cambiará a 'Activo' y su Fecha de Ingreso se actualizará al día de hoy (reiniciando su antigüedad laboral).");
        if (!confirmar) return;

        try {
            // 1. Obtener la fecha actual en formato YYYY-MM-DD
            const hoy = new Date();
            const year = hoy.getFullYear();
            const month = String(hoy.getMonth() + 1).padStart(2, '0'); // Agrega un 0 si el mes es menor a 10
            const day = String(hoy.getDate()).padStart(2, '0');
            const fechaActual = `${year}-${month}-${day}`;

            // 2. Actualizar el documento en Firestore
            await db.collection('empleados').doc(id).update({
                estatus: 'activo',
                fechaIngreso: fechaActual, // Reinicia la antigüedad al día del nuevo registro
                // Eliminamos los campos de baja para limpiar el historial de salida
                fechaBaja: firebase.firestore.FieldValue.delete(),
                motivoBaja: firebase.firestore.FieldValue.delete()
            });

            alert("Empleado reactivado exitosamente con nueva fecha de ingreso.");
        } catch (error) {
            console.error("Error al reactivar:", error);
            alert("Ocurrió un error al intentar reactivar al empleado.");
        }
    };

    // ============================================
    // 11. MOSTRAR CREDENCIAL DIGITAL Y GENERAR QR
    // ============================================
    window.mostrarCredencial = async function(identificadorEmpleado) {
        try {
            // 1. Consultar los datos del empleado en Firestore
            const documento = await db.collection('empleados').doc(identificadorEmpleado).get();
            if (!documento.exists) {
                alert("El empleado no existe.");
                return;
            }
            
            const datosEmpleado = documento.data();//contiene los datos del empleado (documento) que corresponde al 'identificadorEmpleado' 

            // 2. Llenar los textos de la credencial
            document.getElementById('credencialNombre').textContent = datosEmpleado.nombre;
            document.getElementById('credencialCargo').textContent = datosEmpleado.cargo;
            document.getElementById('credencialDepartamento').textContent = datosEmpleado.departamento;
            
            // Usamos el código del empleado, o el ID del documento como respaldo
            const codigoFinal = datosEmpleado.codigo || identificadorEmpleado;
            document.getElementById('credencialCodigo').textContent = codigoFinal;

            // 3. Cargar la foto
            const fotoCredencial = document.getElementById('credencialFoto');
            fotoCredencial.src = datosEmpleado.fotoURL || 'recursos/sin-foto.svg';

            // 4. Generar el Código QR
            const contenedorQR = document.getElementById('credencialQR');
            contenedorQR.innerHTML = ''; // Limpiar el QR anterior para que no se amontonen

            // Usamos la librería QRCode para dibujar el código
            new QRCode(contenedorQR, {
                text: codigoFinal, // El texto oculto en el QR será el Código del Empleado
                width: 130,        // Ancho en píxeles
                height: 130,       // Alto en píxeles
                colorDark : "#1a3a5c", // Color oscuro
                colorLight : "#ffffff", // Fondo blanco
                correctLevel : QRCode.CorrectLevel.H // Alta redundancia para que se lea fácil
            });

            // 5. Mostrar la ventana modal
            document.getElementById('modalCredencial').classList.remove('hidden');

        } catch (error) {
            console.error("Error al generar credencial:", error);
            alert("Ocurrió un error al cargar la credencial digital.");
        }
    };

    // Evento para cerrar el modal de la credencial
    const botonCerrarCredencial = document.getElementById('btnCerrarCredencial');
    if (botonCerrarCredencial) {
        botonCerrarCredencial.addEventListener('click', () => {
            document.getElementById('modalCredencial').classList.add('hidden');
        });
    }

    // ============================================
    // 12. DESCARGAR CREDENCIAL (HTML a PNG)
    // ============================================
    const btnDescargarCredencial = document.getElementById('btnDescargarCredencial');
    
    if (btnDescargarCredencial) {
        btnDescargarCredencial.addEventListener('click', () => {
            // 1. Seleccionamos el elemento HTML que queremos descargar
            const tarjeta = document.getElementById('tarjetaCredencial');
            const nombreEmpleado = document.getElementById('credencialNombre').textContent;
            
            // Cambiamos el texto del botón despues del click
            const spanTexto = document.getElementById('textoBtnDescargar');
            const textoOriginal = spanTexto.textContent;//guarda el texto original del boton "Descargar credencial"
            spanTexto.textContent = "Generando imagen...";//cambia el texto del boton
            btnDescargarCredencial.disabled = true;

            // 2. Usamos html2canvas para convertir el HTML en un elemento <canvas>
            html2canvas(tarjeta, {
                scale: 2, // Aumentamos la escala para que la imagen tenga alta resolución
                useCORS: true, // Permite cargar la foto de perfil desde Firebase Storage sin errores
                backgroundColor: null // Fondo transparente si la tarjeta tiene bordes redondeados
            }).then(canvas => {
                // 3. Convertimos el canvas a una URL de datos en formato de imagen PNG
                const imagenDataUrl = canvas.toDataURL("image/png");
                
                // 4. Creamos un enlace (a) en memoria para forzar la descarga (sin mostrarlo en la interfaz)
                const enlaceDescarga = document.createElement('a');
                // Limpiamos el nombre para que no tenga espacios en el archivo
                const nombreArchivo = nombreEmpleado.replace(/\s+/g, '_'); 
                // Se define el nombre del archivo
                enlaceDescarga.download = `Credencial_${nombreArchivo}.png`;
                // Se le da la url de la imagen
                enlaceDescarga.href = imagenDataUrl;
                
                // Simulamos el clic para iniciar la descarga
                enlaceDescarga.click();

                // Restauramos el botón
                spanTexto.textContent = textoOriginal;
                btnDescargarCredencial.disabled = false;
            }).catch(error => {
                console.error("Error al generar la imagen:", error);
                alert("Ocurrió un error al intentar descargar la credencial.");
                btnDescargarCredencial.innerHTML = textoOriginal;
                btnDescargarCredencial.disabled = false;
            });
        });
    }

    // ============================================
    // 13. GESTIÓN DE USUARIOS (Registro de usuario)
    // ============================================
    
    // Inicializamos una app secundaria de Firebase.
    // Esto permite crear nuevas cuentas sin cerrar la sesión actual del 'administrador'
    const appSecundaria = firebase.initializeApp(firebaseConfig, "AppSecundaria");
    const authSecundario = appSecundaria.auth();

    // referencias al DOM
    const modalOtorgarAcceso = document.getElementById('modalOtorgarAcceso');
    const btnAbrirModalAcceso = document.getElementById('btnAbrirModalAcceso');
    const btnCerrarModalAcceso = document.getElementById('btnCerrarModalAcceso');
    const formOtorgarAcceso = document.getElementById('formOtorgarAcceso');
    const selectEmpleadoAcceso = document.getElementById('selectEmpleadoAcceso');
    const tablaUsuariosBody = document.getElementById('tablaUsuariosBody');

    // referencias a las vistas del modal
    const vistaFormCrearUsuario = document.getElementById('vistaFormCrearUsuario');
    const vistaExitoCrearUsuario = document.getElementById('vistaExitoCrearUsuario');
    const textoCredenciales = document.getElementById('textoCredenciales');
    const btnCopiarCredenciales = document.getElementById('btnCopiarCredenciales');
    const textoBtnCopiar = document.getElementById('textoBtnCopiar');

    // Función para generar contraseña aleatoria
    function generarPasswordTemporal() {
        const caracteres = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
        let password = "";
        for (let i = 0; i < 8; i++) {
            password += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
        }
        return password;
    }

    // Abrir Modal y cargar lista de Empleados Activos
    if (btnAbrirModalAcceso) {
        btnAbrirModalAcceso.addEventListener('click', () => {
            // Se muestra el formulario y se oculta el mensaje de exito
            vistaFormCrearUsuario.classList.remove('hidden');
            vistaExitoCrearUsuario.classList.add('hidden');            
            
            // Consultamos a Firestore solo por los empleados con estatus 'activo'
            db.collection('empleados').where('estatus', '==', 'activo').get().then((consulta) => {
                selectEmpleadoAcceso.innerHTML = '<option value="">Seleccione un empleado...</option>';
                
                consulta.forEach((doc) => {
                    const emp = doc.data();
                    // Guardamos el email y nombre en atributos "data-" ocultos para usarlos al guardar
                    selectEmpleadoAcceso.innerHTML += `<option value="${doc.id}" data-email="${emp.email}" data-nombre="${emp.nombre}">${emp.nombre} (${emp.codigo})</option>`;
                });
            }).catch(error => console.error("Error al cargar empleados activos:", error));

            modalOtorgarAcceso.classList.remove('hidden');
        });
    }

    // Cerrar Modal
    if (btnCerrarModalAcceso) {
        btnCerrarModalAcceso.addEventListener('click', () => {
            modalOtorgarAcceso.classList.add('hidden');
            formOtorgarAcceso.reset();
        });
    }

    // Guardar el Nuevo Usuario
    if (formOtorgarAcceso) {
        formOtorgarAcceso.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnSubmit = formOtorgarAcceso.querySelector('button[type="submit"]');
            btnSubmit.disabled = true;
            btnSubmit.textContent = "Creando cuenta...";

            try {
                // 1. Extraer datos del <select>
                const opcionSeleccionada = selectEmpleadoAcceso.options[selectEmpleadoAcceso.selectedIndex];
                const empleadoID = opcionSeleccionada.value;
                const emailEmpleado = opcionSeleccionada.getAttribute('data-email');
                const nombreEmpleado = opcionSeleccionada.getAttribute('data-nombre');
                const rolSeleccionado = document.getElementById('usuarioRol').value;
                
                // 2. Generamos la contraseña temporal 
                const passwordTemp = generarPasswordTemporal();

                // 3. Crear usuario en Firebase Authentication (Usando la App Secundaria)
                const credencialUsuario = await authSecundario.createUserWithEmailAndPassword(emailEmpleado, passwordTemp);
                const nuevoUID = credencialUsuario.user.uid;

                // 4. Guardar el registro en la colección 'usuarios' de Firestore
                await db.collection('usuarios').doc(nuevoUID).set({
                    uid: nuevoUID,
                    empleadoID: empleadoID,
                    nombre: nombreEmpleado,
                    email: emailEmpleado,
                    rol: rolSeleccionado,
                    estatus: 'activo',
                    requiereCambioPassword: true, // Bandera para forzar el cambio en el primer login
                    fechaRegistro: firebase.firestore.FieldValue.serverTimestamp(),
                    registradoPor: auth.currentUser.email
                });

                // 5. Cerramos sesión en la app secundaria
                await authSecundario.signOut();

                // 6. Redactar el mensaje con las credenciales
                const mensaje = `Bienvenid@, ${nombreEmpleado}.\n\nUtiliza estas credenciales para ingresar al sistema de control de asistencia:\n\nUsuario: ${emailEmpleado}\nContraseña: ${passwordTemp}\n\nNota: Deberás cambiar tu contraseña en tu primer inicio de sesión.`;
                textoCredenciales.value = mensaje;

                // 7. Cambiar a la vista de éxito
                vistaFormCrearUsuario.classList.add('hidden');
                vistaExitoCrearUsuario.classList.remove('hidden');
                formOtorgarAcceso.reset();

            } catch (error) {
                console.error("Error al crear usuario:", error);
                if (error.code === 'auth/email-already-in-use') {
                    alert("Este empleado ya tiene una cuenta de acceso registrada.");
                } else {
                    alert("Ocurrió un error: " + error.message);
                }
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.textContent = "Crear cuenta de usuario";
            }
        });
    }

    // Copiar al portapapeles
    if(btnCopiarCredenciales) {
        btnCopiarCredenciales.addEventListener('click', () => {
            textoCredenciales.select();
            navigator.clipboard.writeText(textoCredenciales.value).then(() => {
                textoBtnCopiar.textContent = 'Mensaje copiado';
                setTimeout(() => {
                    textoBtnCopiar.textContent = "Copiar mensaje";
                }, 2000);            
        }).catch(err => {
            console.error("Error al copiar: ", err);
            alert("No se pudo copiar el texto automáticamente.");
        });
    });
    }

    // Cargar y mostrar la tabla de Usuarios
    window.cargarUsuarios = function() {
        if (!tablaUsuariosBody) return;

        db.collection('usuarios').orderBy('nombre', 'asc').onSnapshot((consulta) => {
            tablaUsuariosBody.innerHTML = ''; 

            if (consulta.empty) {
                tablaUsuariosBody.innerHTML = `<tr><td colspan="5" class="table-empty-state">No hay usuarios registrados.</td></tr>`;
                return;
            }

            consulta.forEach((doc) => {
                const usuario = doc.data();
                //filtro de seguridad para evitar que el administrador vea al usuario super-administrador en la tabla de usuarios
                if (usuario.rol === 'super_admin') return;

                const tr = document.createElement('tr');
                const estatusTexto = usuario.estatus.charAt(0).toUpperCase() + usuario.estatus.slice(1);

                tr.innerHTML = `
                    <td><strong>${usuario.nombre}</strong></td>
                    <td>${usuario.email}</td>
                    <td>${usuario.rol}</td>
                    <td><span class="estatus-${usuario.estatus}">${estatusTexto}</span></td>
                    <td>
                        <!-- Botones para editar (pendiente de programar) -->
                        <button class="btn-icon" title="Editar">
                            <img src="recursos/icono-editar.svg" alt="Editar">
                        </button>
                        <!-- Boton para restablecer contrasena -->
                        <button class="btn-icon" onclick="restablecerPasswordUsuario('${usuario.email}')" title="Restablecer Contraseña">
                            <img src="recursos/icono-llave.svg" alt="Restablecer">
                        </button>

                    </td>
                `;
                tablaUsuariosBody.appendChild(tr);
            });
        }, (error) => {
            console.error("Error al cargar usuarios:", error);
        });
    };

    // ============================================
    // BUSCADORES EN TIEMPO REAL (Live Filtering)
    // ============================================
    // Esta funcion implementa un buscador en tiempo real que permite al usuario filtrar filas de una tabla
    // mientras escribe en un campo de texto.
    // Parametros:
    // - inputID = ID del elemento input que el usuario usara para buscar
    // - tablaBodyID = El ID del elemento tbody de la tabla que se va a filtrar 
    function configurarBuscador(inputId, tablaBodyId) {
        const input = document.getElementById(inputId);
        //si no existe el elemento buscado sale de la funcion
        if (!input) return;
        //escuchador de eventos que reacciona cuando el usuario escribe o borra texto en el input
        input.addEventListener('input', function(e) {
            //Se obtiene el termino de busqueda
            // e.target = elemento input que disparo el evento
            //.value = obtiene el texto actual del input
            //.toLowerCase convierte el texto a minusculas para hacer la busqueda sin distincion.
            const termino = e.target.value.toLowerCase();
            //Se busca en todas las filas del tbody con el ID proporcionado
            //devuelve un NodeList con todas las filas de la tabla
            const filas = document.querySelectorAll(`#${tablaBodyId} tr`);
            //Se recorren todas las filas de la tabla
            filas.forEach(fila => {
                //ignoramos las filas (vacias) con la clase table-empty-state
                if (fila.querySelector('.table-empty-state')) return;
                //obtiene todo el texto de la fila (todas las columnas) y lo convierte a minusculas
                const textoFila = fila.textContent.toLowerCase();
                //Si el termino esta contenido en el texto de la fila...
                if (textoFila.includes(termino)) {
                    //se muestra la fila 
                    fila.classList.remove('hidden');
                } else {
                    //si no coincide, se oculta la fila
                    fila.classList.add('hidden');
                }
            });
        });
    }
    //Uso de la funcion configurarBuscador
    configurarBuscador('buscadorEmpleados', 'tablaEmpleadosBody');
    configurarBuscador('buscadorUsuarios', 'tablaUsuariosBody');

    // ============================================
    // 14. RESTABLECER CONTRASEÑA DE USUARIO
    // ============================================
    window.restablecerPasswordUsuario = async function(emailUsuario) {
        // Mensaje de confirmación que sirve como documentación para pruebas
        const mensajeConfirmacion = `¿Deseas enviar un enlace de recuperación de contraseña a:\n${emailUsuario}?\n\nNota de sistema: Para que esto funcione, el correo registrado debe ser un email real y accesible.`;
        
        const confirmar = confirm(mensajeConfirmacion);
        if (!confirmar) return;

        try {
            // Firebase Auth envia el correo al usuario para gestionar la actualizacion de credenciales de acceso.
            await auth.sendPasswordResetEmail(emailUsuario);
            
            alert(`Enlace enviado exitosamente a ${emailUsuario}.\n\nEl usuario debe revisar su bandeja de entrada (o carpeta de Spam) para definir su nueva contraseña.`);
            
        } catch (error) {
            console.error("Error al enviar correo de recuperación:", error);
            
            // Manejo de errores
            if (error.code === 'auth/user-not-found') {
                alert("Error: No se encontró ningún usuario de acceso con este correo.");
            } else if (error.code === 'auth/invalid-email') {
                alert("Error: El formato del correo electrónico no es válido.");
            } else {
                alert("Ocurrió un error al intentar enviar el correo: " + error.message);
            }
        }
    };

    // --- FUNCIÓN AUXILIAR: Generar Falta Automática ---
    window.registrarFaltaAutomatica = async function (emp, horarioHoy, fecha) {
        // 1. Crear un ID único y determinista: "falta_1001_2026-09-03"
        const year = fecha.getFullYear();
        const month = String(fecha.getMonth() + 1).padStart(2, '0');
        const day = String(fecha.getDate()).padStart(2, '0');
        const fechaStr = `${year}-${month}-${day}`;
        
        const idIncidencia = `falta_${emp.id}_${fechaStr}`;

        try {
            // 2. Verificar si ya existe (Para no duplicar ni sobreescribir)
            const doc = await db.collection('incidencias').doc(idIncidencia).get();
            if (doc.exists) return; 

            // 3. Calcular las horas afectadas (en minutos) según su horario base
            const [entHora, entMin] = horarioHoy.entrada.split(':').map(Number);
            const [salHora, salMin] = horarioHoy.salida.split(':').map(Number);
            let minutosAfectados = ((salHora * 60) + salMin) - ((entHora * 60) + entMin);
            
            if (!horarioHoy.omitirDescanso) {
                minutosAfectados -= (horarioHoy.duracionDescansoMinutos || 0);
            }

            // 4. Guardar en Firestore
            await db.collection('incidencias').doc(idIncidencia).set({
                empleadoID: emp.id,
                empleadoNombre: emp.nombre,
                tipoIncidencia: 'falta_injustificada',
                fechaInicio: firebase.firestore.Timestamp.fromDate(new Date(`${fechaStr}T00:00:00`)),
                horasAfectadas: minutosAfectados,
                autorizantes: 'Sistema Automático',
                motivo: null,
                estatus: 'pendiente_de_revision',
                saldoPendiente: null,
                fechaCreacion: firebase.firestore.FieldValue.serverTimestamp(),
                registradoPor: 'sistema@linguatec.com'
            });
            
            console.log(`Falta automática registrada para ${emp.nombre}`);
        } catch (error) {
            console.error("Error al registrar falta automática:", error);
        }
    }

    // ============================================
    // 15. MÓDULO DE REPORTES Y CONSULTAS
    // ============================================
    //Objetivo: Generar un reporte de incidencias (faltas, retardos, vacaciones, permisos) de empleados activos en un rango de fechas seleccionado.  

    // --- Referencias al DOM (variables globales del modulo)---
    const formFiltrosReporte = document.getElementById('formFiltrosReporte');
    const contenedorResultadosReporte = document.getElementById('contenedorResultadosReporte');
    const tablaReportesBody = document.getElementById('tablaReportesBody');
    const tituloResultadosPeriodo = document.getElementById('tituloResultadosPeriodo');
    
    // --- Escuchador del formulario ---
    if (formFiltrosReporte) {
       formFiltrosReporte.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const btnSubmit = formFiltrosReporte.querySelector('button[type="submit"]');
            const fechaInicioStr = document.getElementById('filtroFechaInicio').value;
            const fechaFinStr = document.getElementById('filtroFechaFin').value;
            const deptoSeleccionado = document.getElementById('filtroDepartamento').value;

            const fechaInicio = new Date(fechaInicioStr + "T00:00:00");
            const fechaFin = new Date(fechaFinStr + "T23:59:59");
            const hoy = new Date(); 

            if (fechaInicio > fechaFin) {
                alert("La Fecha de Inicio no puede ser mayor a la Fecha de Fin.");
                return;
            }

            btnSubmit.disabled = true;
            btnSubmit.textContent = "Auditando y Calculando...";
            tablaReportesBody.innerHTML = '<tr><td colspan="10" class="table-empty-state">Auditando asistencias e incidencias...</td></tr>';
            contenedorResultadosReporte.classList.remove('hidden');

            try {
                // 1. Consultar Empleados
                let consultaEmpleados = db.collection('empleados').where('estatus', '==', 'activo');
                if (deptoSeleccionado !== 'todos') {
                    consultaEmpleados = consultaEmpleados.where('departamento', '==', deptoSeleccionado);
                }
                const snapshotEmpleados = await consultaEmpleados.get();
                
                if (snapshotEmpleados.empty) {
                    tablaReportesBody.innerHTML = '<tr><td colspan="10" class="table-empty-state">No se encontraron empleados activos.</td></tr>';
                    return;
                }

                // 2. Consultar Escaneos
                const snapshotAsistencias = await db.collection('registrosAsistencia')
                    .where('fechaHora', '>=', firebase.firestore.Timestamp.fromDate(fechaInicio))
                    .where('fechaHora', '<=', firebase.firestore.Timestamp.fromDate(fechaFin))
                    .get();

                const asistenciasMap = {};
                snapshotAsistencias.forEach(doc => {
                    const reg = doc.data();
                    const fechaObj = reg.fechaHora.toDate();
                    const fechaStr = `${fechaObj.getFullYear()}-${String(fechaObj.getMonth()+1).padStart(2,'0')}-${String(fechaObj.getDate()).padStart(2,'0')}`;
                    if (!asistenciasMap[reg.empleadoID]) asistenciasMap[reg.empleadoID] = {};
                    if (!asistenciasMap[reg.empleadoID][fechaStr]) asistenciasMap[reg.empleadoID][fechaStr] = 0;
                    asistenciasMap[reg.empleadoID][fechaStr]++;
                });

                // 3. Consultar Incidencias
                const snapshotIncidencias = await db.collection('incidencias')
                    .where('fechaInicio', '>=', firebase.firestore.Timestamp.fromDate(fechaInicio))
                    .where('fechaInicio', '<=', firebase.firestore.Timestamp.fromDate(fechaFin))
                    .get();

                const incidenciasMap = {};
                const incidenciasArray = [];
                
                snapshotIncidencias.forEach(doc => {
                    const inc = doc.data();
                    incidenciasArray.push(inc);
                    if (!incidenciasMap[inc.empleadoID]) incidenciasMap[inc.empleadoID] = new Set();
                    
                    const start = inc.fechaInicio.toDate();
                    const end = inc.fechaFin ? inc.fechaFin.toDate() : start;
                    const startD = new Date(start.getFullYear(), start.getMonth(), start.getDate());
                    const endD = new Date(end.getFullYear(), end.getMonth(), end.getDate());
                    
                    for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
                        const fechaStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                        incidenciasMap[inc.empleadoID].add(fechaStr);
                    }
                });

                // 4. Consultar Días de Descanso Obligatorio
                const snapshotDescansos = await db.collection('diasDescansoObligatorio').get();
                const descansosArray = [];
                snapshotDescansos.forEach(doc => descansosArray.push(doc.data()));

                // --- Consultar Ajustes de Horario ---
                const snapshotAjustes = await db.collection('ajustesHorario')
                    .where('fecha', '>=', firebase.firestore.Timestamp.fromDate(fechaInicio))
                    .where('fecha', '<=', firebase.firestore.Timestamp.fromDate(fechaFin))
                    .get();

                const ajustesMap = {};
                snapshotAjustes.forEach(doc => {
                    const ajuste = doc.data();
                    const fechaObj = ajuste.fecha.toDate();
                    const fechaStr = `${fechaObj.getFullYear()}-${String(fechaObj.getMonth()+1).padStart(2,'0')}-${String(fechaObj.getDate()).padStart(2,'0')}`;
                    if (!ajustesMap[ajuste.empleadoID]) ajustesMap[ajuste.empleadoID] = {};
                    ajustesMap[ajuste.empleadoID][fechaStr] = ajuste;
                });

                // 6. Procesar Empleados y Auditoría Día por Día
                const reporteData = {};
                const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

                snapshotEmpleados.forEach(doc => {
                    const emp = doc.data();
                    emp.id = doc.id;
                    const fechaIngresoEmp = new Date(emp.fechaIngreso + "T00:00:00");

                    reporteData[emp.id] = {
                        nombre: emp.nombre,
                        departamento: emp.departamento,
                        faltas: 0,
                        tiempoRetardos: 0,
                        vacaciones: 0,
                        permisos: 0,
                        descansosPagados: 0, 
                        descansosNoPagados: 0, 
                        tiempoAfectadoTotal: 0,
                        minutosLaborados: 0,
                        observaciones: emp.observaciones 
                    };

                    for (let d = new Date(fechaInicio); d <= fechaFin; d.setDate(d.getDate() + 1)) {
                        if (d < fechaIngresoEmp) continue; 

                        const diaStr = diasSemana[d.getDay()];
                        const dStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                        
                        // --- Logica de Prioridad de Horario (Ajuste vs Base) ---
                        let h = null;
                        if (ajustesMap[emp.id] && ajustesMap[emp.id][dStr]) {
                            h = ajustesMap[emp.id][dStr]; // Tiene prioridad el ajuste
                        } else if (emp.horario && emp.horario[diaStr]) {
                            h = emp.horario[diaStr]; // Si no hay ajuste, usa el base
                        }

                        if (h && h.entrada && h.salida) {
                            const [entHora, entMin] = h.entrada.split(':').map(Number);
                            const [salHora, salMin] = h.salida.split(':').map(Number);
                            let minDia = ((salHora * 60) + salMin) - ((entHora * 60) + entMin);
                            
                            if (!h.omitirDescanso) {
                                minDia -= (h.duracionDescansoMinutos || 0);
                            }
                            reporteData[emp.id].minutosLaborados += minDia;

                            // Escudo Protector de Días Festivos
                            let esDescansoObligatorio = false;
                            let tipoDescanso = null;

                            for (const desc of descansosArray) {
                                const startDesc = desc.fechaInicio.toDate();
                                startDesc.setHours(0,0,0,0);
                                const endDesc = desc.fechaFin ? desc.fechaFin.toDate() : new Date(startDesc);
                                endDesc.setHours(23,59,59,999);
                                
                                if (d >= startDesc && d <= endDesc) {
                                    const [y, m, day] = emp.fechaIngreso.split('-').map(Number);
                                    const fechaIngresoObj = new Date(y, m - 1, day);
                                    const unAnoDespues = new Date(fechaIngresoObj);
                                    unAnoDespues.setFullYear(unAnoDespues.getFullYear() + 1);
                                    const tieneUnAno = d >= unAnoDespues;

                                    if (desc.criterioAplicacion === 'todos' ||
                                       (desc.criterioAplicacion === 'antiguedad_mayor_1' && tieneUnAno) ||
                                       (desc.criterioAplicacion === 'antiguedad_menor_1' && !tieneUnAno)) {
                                        esDescansoObligatorio = true;
                                        tipoDescanso = desc.tipo;
                                        break;
                                    }
                                }
                            }

                            if (esDescansoObligatorio) {
                                if (tipoDescanso === 'pagado') {
                                    reporteData[emp.id].descansosPagados += 1;
                                } else {
                                    reporteData[emp.id].descansosNoPagados += 1;
                                    reporteData[emp.id].minutosLaborados -= minDia; 
                                }
                                continue; 
                            }

                            // Auditoría de Faltas Automáticas
                            const numEscaneosDia = (asistenciasMap[emp.id] && asistenciasMap[emp.id][dStr]) ? asistenciasMap[emp.id][dStr] : 0;
                            const tieneIncidencia = incidenciasMap[emp.id] && incidenciasMap[emp.id].has(dStr);
                            const horaSalidaDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), salHora, salMin, 0);
                            
                            if (hoy > horaSalidaDate) {
                                if (numEscaneosDia === 0 && !tieneIncidencia) {
                                    window.registrarFaltaAutomatica(emp, h, new Date(d));
                                    reporteData[emp.id].faltas += 1;
                                    reporteData[emp.id].tiempoAfectadoTotal += minDia;
                                    reporteData[emp.id].minutosLaborados -= minDia;
                                } 
                                else if ((numEscaneosDia === 1 || numEscaneosDia === 3) && !tieneIncidencia) {
                                    reporteData[emp.id].minutosLaborados -= minDia; 
                                }
                            } 
                            else if (d.toDateString() === hoy.toDateString()) {
                                if (numEscaneosDia === 0 && !tieneIncidencia) {
                                    reporteData[emp.id].minutosLaborados -= minDia;
                                }
                            } 
                            else if (d > hoy) {
                                reporteData[emp.id].minutosLaborados -= minDia;
                            }
                        }
                    }
                });

                // 7. Procesar Incidencias Existentes
                incidenciasArray.forEach(inc => {
                    const empID = inc.empleadoID;
                    if (reporteData[empID]) {
                        const tipo = inc.tipoIncidencia;
                        const minsAfectadosOriginales = inc.horasAfectadas || 0;
                        
                        let minsAfectadosDeuda = minsAfectadosOriginales;
                        if (inc.estatus === 'compensada_totalmente') {
                            minsAfectadosDeuda = 0; 
                        } else if (inc.estatus === 'compensada_parcialmente' || inc.estatus === 'pendiente_de_compensar') {
                            minsAfectadosDeuda = inc.saldoPendiente !== undefined ? inc.saldoPendiente : minsAfectadosOriginales;
                        }
                        
                        let diasIncidencia = 1;
                        if (inc.fechaFin) {
                            const start = inc.fechaInicio.toDate();
                            const end = inc.fechaFin.toDate();
                            const startD = new Date(start.getFullYear(), start.getMonth(), start.getDate());
                            const endD = new Date(end.getFullYear(), end.getMonth(), end.getDate());
                            diasIncidencia = Math.floor((endD - startD) / (1000 * 60 * 60 * 24)) + 1;
                        }

                        if (tipo === 'falta_injustificada') {
                            reporteData[empID].faltas += diasIncidencia; 
                        } else if (tipo === 'retardo_injustificado') {
                            reporteData[empID].tiempoRetardos += minsAfectadosOriginales; 
                        } else if (tipo === 'vacaciones') {
                            reporteData[empID].vacaciones += diasIncidencia;
                        } else if (tipo === 'permiso_con_goce' || tipo === 'permiso_sin_goce') {
                            reporteData[empID].permisos += diasIncidencia;
                        }

                        const tiposResta = ['falta_injustificada', 'retardo_injustificado', 'permiso_sin_goce', 'salida_anticipada', 'suspension', 'incapacidad'];
                        const tiposSuma = ['recuperacion_horas', 'compensacion_hora_extra'];
                        
                        if (tiposResta.includes(tipo)) {
                            reporteData[empID].tiempoAfectadoTotal += minsAfectadosDeuda; 
                            reporteData[empID].minutosLaborados -= minsAfectadosOriginales;
                        } else if (tiposSuma.includes(tipo)) {
                            const tiempoRealmentePagado = inc.tiempoCompensado !== undefined ? inc.tiempoCompensado : minsAfectadosOriginales;
                            reporteData[empID].minutosLaborados += tiempoRealmentePagado;
                        }
                    }
                });

                // 8. Dibujar la tabla
                tablaReportesBody.innerHTML = '';
                const empleadosArray = Object.entries(reporteData).map(([id, datos]) => ({ id, ...datos }));
                empleadosArray.sort((a, b) => a.nombre.localeCompare(b.nombre));

                empleadosArray.forEach(emp => {
                    const tr = document.createElement('tr');
                    if (emp.faltas >= 3) tr.classList.add('alerta-faltas');

                    const absMinutos = Math.abs(emp.minutosLaborados);
                    const horas = Math.floor(absMinutos / 60);
                    const minutos = absMinutos % 60;
                    const signo = emp.minutosLaborados < 0 ? "-" : "";
                    const horasFormateadas = `${signo}${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')} hrs`;

                    tr.innerHTML = `
                        <td><strong>${emp.nombre}</strong></td>
                        <td>${emp.departamento}</td>
                        <td class="${emp.faltas >= 3 ? 'alerta-texto' : ''}">${emp.faltas}</td>
                        <td>${formatearMinutos(emp.tiempoRetardos)}</td>
                        <td>${emp.vacaciones}</td>
                        <td>${emp.permisos}</td>
                        <td>${emp.descansosPagados}</td>
                        <td>${emp.descansosNoPagados}</td>
                        <td>${formatearMinutos(emp.tiempoAfectadoTotal)}</td>
                        <td><strong>${horasFormateadas}</strong></td>
                        <td class="columna-oculta">${emp.observaciones || 'Sin observaciones'}</td>
                        <td>
                            <button class="btn-icon" onclick="verDetallesReporte('${emp.id}', ${emp.minutosLaborados})" title="Ver Detalle">
                                <img src="recursos/icono-ver.svg" alt="Detalles">
                            </button>
                        </td>
                    `;
                    tablaReportesBody.appendChild(tr);
                });

                tituloResultadosPeriodo.textContent = `Resultados: ${fechaInicioStr} al ${fechaFinStr}`;

            } catch (error) {
                console.error("Error al generar reporte:", error);
                alert("Ocurrió un error al calcular los datos.");
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.textContent = "Generar Reporte";
            }
        });
    }

    // ============================================
    // DETALLES DEL REPORTE POR EMPLEADO (Modal)
    // ============================================
    // Funcion global que se ejecuta cuando el usuario hace clic en el boton "ver Detalles" en la tabla de resultados del reporte.
    // recibe como parametro el id del documento de la coleccion empleados de firestore
    // Flujo:
    // 1. Obtiene las fechas del filtro del reporte.
    // 2. Consulta los datos del empleado.
    // 3. Consulta todas las incidencias del empleado en el periodo seleccionado.
    // 4. Agrupa las incidencias por tipo y las muestra en un modal.
    window.verDetallesReporte = async function(idEmpleado, minutosLaboradosTotales) {
        try {
            // -- 1. Leemos las fechas que el usuario selecciono en el formulario de reportes. --
            const fechaInicioStr = document.getElementById('filtroFechaInicio').value;
            const fechaFinStr = document.getElementById('filtroFechaFin').value;
            // validamos que las fechas existan para poder continuar, sino sale de la funcion
            if (!fechaInicioStr || !fechaFinStr) {
                alert("Por favor, elige un rango de fechas, para generar el reporte.");
                return;
            }

            // -- 2. Obtenemos los datos del empleado de Firestore --
            const docEmp = await db.collection('empleados').doc(idEmpleado).get();
            if (!docEmp.exists) return;
            const empData = docEmp.data();

            // -- 3. Llenar el encabezado del modal de Detalles del reporte del empleado --
            // mostramos el nombre del empleado en el titulo del modal
            document.getElementById('detalleReporteNombre').textContent = empData.nombre;
            // mostramos el periodo seleccionado en el subtitulo del modal.
            document.getElementById('detalleReportePeriodo').textContent = `Periodo: ${fechaInicioStr} al ${fechaFinStr}`;

            // -- 4. Lógica de Observaciones Generales --
            // obtenemos la referencia al elemento donde se muestran las observaciones y se guarda en la caja de observaciones
            const cajaObservaciones = document.getElementById('contenedorObservacionesReporte');
            // verificamos si el empleado tiene observaciones registradas en firestore
            if (empData.observaciones && empData.observaciones.trim() !== "") {
                //si hay observaciones, se muestran en el texto
                document.getElementById('textoObservacionesReporte').textContent = empData.observaciones;
                // mostramos la caja de observaciones
                cajaObservaciones.classList.remove('hidden'); 
            } else {
                // si no hay observaciones, la caja se mantiene oculta
                cajaObservaciones.classList.add('hidden'); 
            }

            // -- 5. Consultar las incidencias de este empleado en el periodo seleccionado --
            // agregamos 'T00:00:00' para indicar la hora del inicio del dia
            const fechaInicio = new Date(fechaInicioStr + "T00:00:00");
            // agregarmos 'T23:29:59' para indicar la hora final del dia 
            const fechaFin = new Date(fechaFinStr + "T23:59:59");

            // 1. CONSULTAR INCIDENCIAS
            // realizamos una consulta a firestore en la coleccion 'incidencias'
            // se obtienen datos filtrados considerando el id del empleado y el rango de fechas seleccionado
            const snapshotIncidencias = await db.collection('incidencias')
                .where('empleadoID', '==', idEmpleado)
                .where('fechaInicio', '>=', firebase.firestore.Timestamp.fromDate(fechaInicio))
                .where('fechaInicio', '<=', firebase.firestore.Timestamp.fromDate(fechaFin))
                .get();

            // obtenemos y preparamos el contenedor donde se mostraran las incidencias
            const contenedorIncidencias = document.getElementById('contenedorIncidenciasDetalle');
            contenedorIncidencias.innerHTML = '';// limpiamos el contenido del contenedor

            let minutosAfectadosModal = 0;

            // Si no hay incidencias en el periodo, mostramos un mensaje
            if (snapshotIncidencias.empty) {
                contenedorIncidencias.innerHTML = '<p class="table-empty-state">No hay incidencias registradas en este periodo.</p>';
            } else {
                // -- 6. Agrupar incidencias por tipo --
                // creamo un objeto vacio para agrupar las incidencias
                const incidenciasAgrupadas = {};
                //variable para el total del modal
                let totalMinutosAfectadosModal = 0;

                // Definimos qué tipos realmente afectan el tiempo para el resumen del modal
                const tiposRestaModal = ['falta_injustificada', 'retardo_injustificado', 'permiso_sin_goce', 'salida_anticipada', 'suspension', 'incapacidad'];

                // recorremos cada incidencia encontrada en la consulta    
                snapshotIncidencias.forEach(doc => {
                    //extraemos los datos de la incidencia
                    const inc = doc.data(); 
                    // obtenemos el tipo de incidencia
                    const tipo = inc.tipoIncidencia; 
                    //si este tipo de incidencia aun no existe en el objeto agrupado, creamos un array vacio para el
                    if (!incidenciasAgrupadas[tipo]) {
                        incidenciasAgrupadas[tipo] = [];
                    }
                    // agregamos la incidencia al array de su tipo correspondiente
                    incidenciasAgrupadas[tipo].push(inc);

                    // calcular deuda real para el total del modal
                    if (tiposRestaModal.includes(tipo)) {
                        const minsAfectadosOriginales = inc.horasAfectadas || 0;
                        let minsAfectadosDeuda = minsAfectadosOriginales;
                        
                        if (inc.estatus === 'compensada_totalmente') {
                            minsAfectadosDeuda = 0;
                        } else if (inc.estatus === 'compensada_parcialmente' || inc.estatus === 'pendiente_de_compensar') {
                            minsAfectadosDeuda = inc.saldoPendiente !== undefined ? inc.saldoPendiente : minsAfectadosOriginales;
                        }

                        totalMinutosAfectadosModal += minsAfectadosDeuda; 
                    }                    
                });                
                        
                // --- 7. Generar el HTML agrupado para mostrar ---                
                for (const [tipo, lista] of Object.entries(incidenciasAgrupadas)) {
                    // formateamos el titulo del tipo, reemplazamos '_' por ' '. 
                    const tituloTipo = tipo.replace(/_/g, ' ').toUpperCase();

                    // 1. Calcular el conteo real sumando los días que abarca cada incidencia
                    let conteoReal = 0;
                    lista.forEach(inc => {
                        let diasIncidencia = 1; 
                        if (inc.fechaFin) {
                            const start = inc.fechaInicio.toDate();
                            const end = inc.fechaFin.toDate();
                            const startD = new Date(start.getFullYear(), start.getMonth(), start.getDate());
                            const endD = new Date(end.getFullYear(), end.getMonth(), end.getDate());
                            diasIncidencia = Math.floor((endD - startD) / (1000 * 60 * 60 * 24)) + 1;
                        }
                        conteoReal += diasIncidencia;
                    });

                    // Construccion del HTML del grupo
                    // 2. Imprimir el titulo con el conteo de dias abarcados por la incidencia
                    let htmlGrupo = `<h4 class="reporte-tipo-titulo">${tituloTipo} (${conteoReal})</h4>`;
                    htmlGrupo += `<ul class="reporte-lista">`;

                    // 3. Imprimir las tarjetas
                    lista.forEach(inc => {
                        // convertimos la fecha (Timestamp/Firestore) a objeto Date
                        const fechaObj = inc.fechaInicio.toDate();
                        // formeateamos la fecha al formato DD/MM/YYYY
                        let fechaFormateada = fechaObj.toLocaleDateString('es-MX');
                        
                        // Si tiene fecha de fin, mostramos el rango
                        if (inc.fechaFin) {
                            const fechaFinObj = inc.fechaFin.toDate();
                            fechaFormateada += ` al ${fechaFinObj.toLocaleDateString('es-MX')}`;
                        }

                        // obtenemos el motivo de la incidencia o un mensaje 
                        const motivo = inc.motivo || 'Sin motivo registrado';
                        // mostramos las horas afectadas (en minutos) o 'N/A' si no hay
                        const horas = inc.horasAfectadas ? `${formatearMinutos(inc.horasAfectadas)}` : 'N/A';
                        //Si la incidencia tiene estatus, la limpiamos tambien
                        let estatusIncidencia = "";
                        if (inc.estatus) {
                            estatusIncidencia = ` | Estatus: ${inc.estatus.replace(/_/g, ' ').toUpperCase()} `;
                        }   

                        // -- Construir la tarjeta de la incidencia --
                        // creamos una tajeta individual para cada incidencia
                        htmlGrupo += `
                            <li class="reporte-item">
                                <div class="reporte-item-header">
                                    <span>Fecha: ${fechaFormateada}${estatusIncidencia}</span>
                                    <span class="etq-horas">${horas}</span>
                                </div>
                                <div class="reporte-item-motivo">Motivo: ${motivo}</div>
                            </li>
                        `;
                    });

                    htmlGrupo += `</ul>`; // cerramos la lista 
                    // agregamos el HTML del grupo al contenedor de incidencias
                    contenedorIncidencias.innerHTML += htmlGrupo;
                }

                // -- LOGICA DE DESCANSOS OBLIGATORIOS PARA EL MODAL --

                const snapshotDescansos = await db.collection('diasDescansoObligatorio').get();
                const descansosArray = [];
                snapshotDescansos.forEach(doc => descansosArray.push(doc.data()));

                const descansosAplicados = [];
                const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
                const fechaIngresoEmp = new Date(empData.fechaIngreso + "T00:00:00");

                // Recorremos los días del reporte para ver si alguno fue festivo para este empleado
                for (let d = new Date(fechaInicio); d <= fechaFin; d.setDate(d.getDate() + 1)) {
                    if (d < fechaIngresoEmp) continue; 

                    const diaStr = diasSemana[d.getDay()];
                    if (empData.horario && empData.horario[diaStr]) {
                        const h = empData.horario[diaStr];
                        if (h.entrada && h.salida) {
                        
                            let esDescansoObligatorio = false;
                            let tipoDescanso = null;
                            let motivoDescanso = "";

                            for (const desc of descansosArray) {
                                const startDesc = desc.fechaInicio.toDate();
                                startDesc.setHours(0,0,0,0);
                                const endDesc = desc.fechaFin ? desc.fechaFin.toDate() : new Date(startDesc);
                                endDesc.setHours(23,59,59,999);
                            
                                if (d >= startDesc && d <= endDesc) {
                                    const [y, m, day] = empData.fechaIngreso.split('-').map(Number);
                                    const fechaIngresoObj = new Date(y, m - 1, day);
                                    const unAnoDespues = new Date(fechaIngresoObj);
                                    unAnoDespues.setFullYear(unAnoDespues.getFullYear() + 1);
                                    const tieneUnAno = d >= unAnoDespues;

                                    if (desc.criterioAplicacion === 'todos' ||
                                        (desc.criterioAplicacion === 'antiguedad_mayor_1' && tieneUnAno) ||
                                        (desc.criterioAplicacion === 'antiguedad_menor_1' && !tieneUnAno)) {
                                         esDescansoObligatorio = true;
                                         tipoDescanso = desc.tipo;
                                         motivoDescanso = desc.descripcion;
                                         break;
                                }
                            }
                        }

                        if (esDescansoObligatorio) {
                            // Calculamos cuántas horas le cubrió este descanso según su horario base
                            const [entHora, entMin] = h.entrada.split(':').map(Number);
                            const [salHora, salMin] = h.salida.split(':').map(Number);
                            let minDia = ((salHora * 60) + salMin) - ((entHora * 60) + entMin);
                            if (!h.omitirDescanso) {
                                minDia -= (h.duracionDescansoMinutos || 0);
                            }
                            
                            descansosAplicados.push({
                                fecha: new Date(d),
                                tipo: tipoDescanso,
                                motivo: motivoDescanso,
                                minutos: minDia
                            });
                        }
                    }
                }
            }

            // Inyectar el HTML de los descansos si hubo alguno
            if (descansosAplicados.length > 0) {
                let htmlDescansos = `<h4 class="reporte-tipo-titulo">DESCANSOS OBLIGATORIOS (${descansosAplicados.length})</h4>`;
                htmlDescansos += `<ul class="reporte-lista">`;
                
                descansosAplicados.forEach(desc => {
                    const fechaFormateada = desc.fecha.toLocaleDateString('es-MX');
                    const tipoTexto = desc.tipo.replace(/_/g, ' ').toUpperCase();
                    const horasTexto = formatearMinutos(desc.minutos);

                    htmlDescansos += `
                        <li class="reporte-item">
                            <div class="reporte-item-header">
                                <span>Fecha: ${fechaFormateada} | Tipo: ${tipoTexto}</span>
                                <span class="etq-horas">${horasTexto} cubiertas</span>
                            </div>
                            <div class="reporte-item-motivo">Motivo: ${desc.motivo}</div>
                        </li>
                    `;
                });
                htmlDescansos += `</ul>`;
                contenedorIncidencias.innerHTML += htmlDescansos;
            }
            // =========================================================

                // Resumenes finales
                // Formatear las horas laboradas que recibimos como parámetro
                const absMinutosLab = Math.abs(minutosLaboradosTotales);
                const horasLabFormateadas = formatearMinutos(absMinutosLab);
                const signoLab = minutosLaboradosTotales < 0 ? "-" : "";

                // Inyectar los resumenes al final (Afectaciones y Laboradas)
                contenedorIncidencias.innerHTML += `
                    <div class="resumen-afectaciones-caja">
                        <h4 class="detalle-seccion-titulo">Resumen de Afectaciones</h4>
                        <p class="reporte-texto-obs"><strong>Total de Tiempo Afectado:</strong> ${formatearMinutos(totalMinutosAfectadosModal)}</p>
                    </div>

                    <div class="resumen-laboradas-caja">
                        <h4 class="detalle-seccion-titulo titulo-verde">Resumen de Horas Laboradas</h4>
                        <p class="reporte-texto-obs"><strong>Total de Tiempo Laborado:</strong> ${signoLab}${horasLabFormateadas}</p>
                    </div>
                `;
            }

            // -- 8. Mostrar el Modal --
            // removemos la clase hidden del modal para hacerlo visible
            document.getElementById('modalDetallesReporte').classList.remove('hidden');

        } catch (error) {
            console.error("Error al cargar detalles del reporte:", error);
            alert("Ocurrió un error al consultar las incidencias.");
        }
    };

    // --- Evento para cerrar el modal de Detalles del reporte ---
    const btnCerrarModalReporte = document.getElementById('btnCerrarModalReporte');
    if (btnCerrarModalReporte) {
        btnCerrarModalReporte.addEventListener('click', () => {
            document.getElementById('modalDetallesReporte').classList.add('hidden');
        });
    }

    // Funcion auxiliar para resetear el estado del reporte
    window.limpiarVistaReporte = function() {
        const formFiltros = document.getElementById('formFiltrosReporte');
        const contenedorResultados = document.getElementById('contenedorResultadosReporte');
        const tablaBody = document.getElementById('tablaReportesBody');

        if (formFiltros) formFiltros.reset();
        if (contenedorResultados) contenedorResultados.classList.add('hidden');
        if (tablaBody) tablaBody.innerHTML = '';
    };

    const btnLimpiarReporte = document.getElementById('btnLimpiarReporte');
    if (btnLimpiarReporte) {
        btnLimpiarReporte.addEventListener('click', limpiarVistaReporte);
    }
    

    // ============================================
    // 16. EXPORTACIÓN DE REPORTES (PDF y CSV)
    // ============================================
    // Objetivo: Permite al usuario administrador descargar los resultados del reporte en formatos PDF o CSV.
    // Flujo:
    // 1. El usuario hace clic en el boton de exportacion (CSV o PDF).
    // 2. Se verifica que la tabla de resultados exista y tenga datos.
    // 3. Se procesan los datos segun el formato seleccionado.
    // 4. Se genera el archivo y se descarga automaticamente en el navegador.
    // 5. El archivo queda disponible en la carpeta de descargas del usuario.
    // ========================================================================

    // Referencias a los botones de exportacion que el usuario presionara 
    const btnExportarPDF = document.getElementById('btnExportarPDF');
    const btnExportarCSV = document.getElementById('btnExportarCSV');

    // --- Exportar a formato CSV ---
    // ========================================================================

    // Funcion auxiliar para obtener la fecha actual en formato YYYY-MM-DD
    function obtenerFechaDescarga() {
        // new Date() crea un objeto con la fecha y hora del sistema en el momento que se ejecuta la funcion
        const hoy = new Date();
        const year = hoy.getFullYear(); // getFullYear() devuelve el año en 4 digitos.
        // getMonth() devuelve el mes en base 0 (0=Enero, 11=Diciembre. Por eso se le suma 1 para que devuelva el mes actual).
        // String() convierte el numero a texto.
        // padStart(2, '0') asegura que tenga 2 digitos
        const month = String(hoy.getMonth() + 1).padStart(2, '0');
        //getDate() devuelve el dia del mes
        // padStart(2, '0') asegura que tenga 2 digitos
        const day = String(hoy.getDate()).padStart(2, '0');
        return `${day}-${month}-${year}`;
    }

    if (btnExportarCSV) {
        // agregamos un escuchador al boton de exportar CSV        
        btnExportarCSV.addEventListener('click', () => {
            // --- 1. Obtener la tabla de resultados. ---
            // buscamos la tabla que contiene los resultados del reporte. 
            const tabla = document.querySelector('#contenedorResultadosReporte .admin-table');
            // si no existe la tabla salimos de la funcion
            if (!tabla) return;
            // --- 2. Inicializar variable para el contenido CSV. ---
            // Esta variable almacenara todo el texto del archivo CSV
            let csvContenido = "";
            // -- 3. Obtener todas las filas de la tabla --
            // obtenemos un Nodelist con todas las filas, incluyendo encabezado y datos.
            const filas = tabla.querySelectorAll('tr');
            // -- 4. Recorrer cada fila --
            // se itera por cada elemento del NodeList            
            filas.forEach(fila => {
                // Se obtienen las celdas de la fila (considerando encabezado y datos)
                const celdas = fila.querySelectorAll('th, td');
                // Se crea un array para contener los valores de cada celda de la fila actual.
                const filaArray = [];

                // Recorremos las celdas, omitiendo la última columna (Detalles/Botones)
                for (let i = 0; i < celdas.length - 1; i++) {
                    // Limpiamos el texto de cada celda de espacios en blanco al inicio o final
                    let texto = celdas[i].textContent.trim();
                    // -- Manejar textos que contienen comas --
                    // En CSV las comas son el separador de columnas. Si un texto contiene una coma, lo envolveremos
                    // entre comillas, para que el programa que lea el CSV sepa que es un solo valor.
                    if (texto.includes(',')) {
                        texto = `"${texto}"`;
                    }
                    // push agrega el elemento al final de array.
                    filaArray.push(texto);
                }
                // --- Unir los elementos del array con comas ---
                // 'join' convierte el array en un string donde cada elemento esta separado por una coma. 
                // esto crea una linea del archivo CSV.
                // agregamos un salto de linea al final.
                csvContenido += filaArray.join(",") + "\n";
            });

            // --- Crear el archivo CSV ---
            // Blob es un objeto que representa datos binarios
            // en este caso, el string 'csvContenido' convertido a texto UTF-8 
            const blob = new Blob([csvContenido], { type: 'text/csv;charset=utf-8;' });
            // -- crear una URL para el Blob ---
            // URL.createObjectURL() crea una URL temporal que apunta al Blob
            // Esta URL se puede usar para descargar el archivo
            const url = URL.createObjectURL(blob);
            // Crea un elemento <a> en memoria, este elemento no se muestra en la interfaz, solo existe en JS
            const enlaceDescarga = document.createElement("a");
            // Obtenemos la fecha y armamos el nombre del archivo
            const fechaHoy = obtenerFechaDescarga();
            // -- configurar el enlace para la descarga --
            // href: la URL del Blob 
            enlaceDescarga.setAttribute("href", url);
            // download: el nombre que tendra el archivo al descargarse
            enlaceDescarga.setAttribute("download", `Reporte_Incidencias_Linguatec_${fechaHoy}.csv`);
            // agregar temporalmente el enlace al DOM, es necesario para poder hacer clic en el.
            document.body.appendChild(enlaceDescarga);
            // simular un clic para iniciar la descarga
            enlaceDescarga.click();
            // eliminar el enlace del DOM
            document.body.removeChild(enlaceDescarga);
        });
    }

    // --- Exportar a formato PDF ---
    // ================================
    
    // Para generar el PDF usamos dos librerias:
    // 1. jsPDF: Crea el documento PDF en memoria.
    // 2. jspdf-autotable: plugin que convierte tablas HTML a tablas en PDF 
    
    if (btnExportarPDF) {
        // agregamos un escuchador al boton exportar PDF
        btnExportarPDF.addEventListener('click', () => {
            // -- 1. Inicializar jsPDF --
            // Creacion de nueva instancia de jsPDF con configuracion:
            // formato horizontal (p), milímetros (mm), tamaño carta(letter)
            const { jsPDF } = window.jspdf;
            const documentoPDF = new jsPDF('l', 'mm', 'letter');
            // -- 2. Extraemos el texto que muestra el rango de fechas filtrado del reporte. --          
            const periodoTexto = document.getElementById('tituloResultadosPeriodo').textContent;

            // -- 3. Configuración del encabezado del PDF. --
            documentoPDF.setFontSize(16);
            documentoPDF.setTextColor(26, 58, 92); 
            // x=14: margen izquierdo, y=20: margen desde arriba
            documentoPDF.text("Linguatec - Reporte de Incidencias", 14, 20);

            // Configuracion del subtitulo
            documentoPDF.setFontSize(11);
            documentoPDF.setTextColor(100, 100, 100);
            documentoPDF.text(periodoTexto, 14, 28);

            // Clonamos la tabla para manipularla sin afectar la pantalla
            const tablaOriginal = document.querySelector('#contenedorResultadosReporte .admin-table');
            const tablaClon = tablaOriginal.cloneNode(true);

            // Hacemos visible la columna de observaciones en el clon
            tablaClon.querySelectorAll('.columna-oculta').forEach(el => el.classList.remove('columna-oculta'));
            
            // Eliminamos la última columna (Detalles) del clon
            tablaClon.querySelectorAll('tr').forEach(fila => {
                if (fila.lastElementChild) {
                    fila.removeChild(fila.lastElementChild);
                }
            });

            // -- 4. Convertir la tabla HTML a tabla PDF y dibujarla. --
            // Usamos el plugin autoTable de jsPDF para convertir la tabla HTML a tabla PDF y dibujarla.
            // DIBUJAMOS EL PDF CON LA TABLA CLONADA
            documentoPDF.autoTable({
                // autoTable buscara la tabla con ese selector
                html: tablaClon,
                startY: 35, // posicion donde comenzara la tabla (35mm desde arriba)
                theme: 'striped', //alterna colores entre filas para mejorar legibilidad
                headStyles: { fillColor: [26, 58, 92] }, // Personalizacion del encabezado de la tabla
                columnStyles: { 8: { cellWidth: 40 }}                
                
                // Especificamos manualmente las columnas que se quieren mostrar en el PDF
                // Omitimos la columna de acciones (acciones) porque no tiene sentido en el PDF, solo en la interfaz web.
                // columns: [
                //     { header: 'Empleado', dataKey: 0 },
                //     { header: 'Depto.', dataKey: 1 },
                //     { header: 'Faltas', dataKey: 2 },
                //     { header: 'Retardos', dataKey: 3 },
                //     { header: 'Vacaciones', dataKey: 4 },
                //     { header: 'Permisos', dataKey: 5 },
                //     { header: 'Horas Lab.', dataKey: 6 }
                // ]
            });

            // Obtenemos la fecha y definimos el nombre del archivo PDF
            const fechaHoy = obtenerFechaDescarga();
            documentoPDF.save(`Reporte_Incidencias_Linguatec_${fechaHoy}.pdf`);
        });
    }

   // ============================================
    // 17. GESTIÓN DE INCIDENCIAS (CRUD y Banco de Horas)
    // ============================================
    
    // --- FUNCIÓN AUXILIAR: Formatear minutos a Horas y Minutos ---
    function formatearMinutos(totalMinutos) {
        if (!totalMinutos || totalMinutos === 0) return '0 min';
        const horas = Math.floor(totalMinutos / 60);
        const minutos = totalMinutos % 60;
        let texto = '';
        if (horas > 0) texto += `${horas} hora${horas > 1 ? 's' : ''}`;
        if (minutos > 0) texto += ` ${minutos} min`;
        return texto.trim() || '0 min';
    }

    // Referencias al DOM
    const vistaListaIncidencias = document.getElementById('vistaListaIncidencias');
    const vistaFormularioIncidencia = document.getElementById('vistaFormularioIncidencia');
    const btnMostrarFormIncidencia = document.getElementById('btnMostrarFormIncidencia');
    const btnVolverListaIncidencias = document.getElementById('btnVolverListaIncidencias');
    const formRegistroIncidencia = document.getElementById('formRegistroIncidencia');
    const selectIncEmpleado = document.getElementById('incEmpleado');
    const selectTipoIncidencia = document.getElementById('incTipo');
    const tablaIncidenciasBody = document.getElementById('tablaIncidenciasBody');
    const incFechaFin = document.getElementById('incFechaFin');

    // Referencias del Banco de Horas
    const cajaBancoHoras = document.getElementById('cajaBancoHoras');
    const infoSaldoEmpleado = document.getElementById('infoSaldoEmpleado');
    const selectIncidenciaVinculada = document.getElementById('incIncidenciaVinculada');
    const cajaRecuperacionHoras = document.getElementById('cajaRecuperacionHoras');
    const incAutorizarRecuperacion = document.getElementById('incAutorizarRecuperacion');
    const textoCheckboxRecuperacion = document.getElementById('textoCheckboxRecuperacion');

    let incidenciaEditandoID = null;
    let estatusIncidenciaOriginal = null;
    let horasAfectadasOriginales = 0; // para saber si le cambiaron el tiempo al editar
    let saldoPendienteOriginal = null; // Guarda la deuda real si ya hubo pagos parciales

    // --- LIMPIAR FORMULARIO DE INCIDENCIAS ---
    function limpiarFormularioIncidencia() {
        formRegistroIncidencia.reset();
        incidenciaEditandoID = null;
        document.getElementById('tituloFormIncidencia').textContent = "Registrar Nueva Incidencia";
        formRegistroIncidencia.querySelector('button[type="submit"]').textContent = "Guardar Incidencia";
        
        const cajaBancoHoras = document.getElementById('cajaBancoHoras');
        const cajaRecuperacionHoras = document.getElementById('cajaRecuperacionHoras');
        if (cajaBancoHoras) cajaBancoHoras.classList.add('hidden');
        if (cajaRecuperacionHoras) cajaRecuperacionHoras.classList.add('hidden');

        // Restaurar visibilidad de los grupos de tiempo
        const grupoEstandar = document.getElementById('grupoDuracionEstandar');
        const grupoRecuperacion = document.getElementById('grupoHorarioRecuperacion');
        if (grupoEstandar) grupoEstandar.classList.remove('hidden');
        if (grupoRecuperacion) grupoRecuperacion.classList.add('hidden');
        
        // Desbloquear todos los campos para creacion nueva
        const incEmpleado = document.getElementById('incEmpleado');
        const incFechaInicio = document.getElementById('incFechaInicio');
        const incFechaFin = document.getElementById('incFechaFin');
        const incHoras = document.getElementById('incHoras');
        const incMinutos = document.getElementById('incMinutos');
        const incHoraInicioRec = document.getElementById('incHoraInicioRec');
        const incHoraFinRec = document.getElementById('incHoraFinRec');
        const incIncidenciaVinculada = document.getElementById('incIncidenciaVinculada');

        incEmpleado.disabled = false;

        incFechaInicio.disabled = false;
        incFechaInicio.classList.remove('input-bloqueado');

        incFechaFin.disabled = false;
        incFechaFin.classList.remove('input-bloqueado');

        incHoras.readOnly = false;
        incHoras.required = true;
        incHoras.classList.remove('input-bloqueado');
        
        incMinutos.readOnly = false;
        incMinutos.required = true;
        incMinutos.classList.remove('input-bloqueado');        
        
        if (incHoraInicioRec) incHoraInicioRec.required = false;
        if (incHoraFinRec) incHoraFinRec.required = false;
        if (incIncidenciaVinculada) incIncidenciaVinculada.required = false;

        // Mostrar todas las opciones del select de tipos
        Array.from(document.getElementById('incTipo').options).forEach(opt => {
            opt.hidden = false;
            opt.disabled = false;
        });
    }

    // --- B. SUB-NAVEGACIÓN Y CARGA DE EMPLEADOS ---
    if (btnMostrarFormIncidencia && btnVolverListaIncidencias) {        
        btnMostrarFormIncidencia.addEventListener('click', async () => {
            limpiarFormularioIncidencia();
            vistaListaIncidencias.classList.add('hidden');
            vistaFormularioIncidencia.classList.remove('hidden');
            
            try {
                const snapshot = await db.collection('empleados').where('estatus', '==', 'activo').orderBy('nombre', 'asc').get();
                selectIncEmpleado.innerHTML = '<option value="">Seleccione un empleado...</option>';
                snapshot.forEach(doc => {
                    const emp = doc.data();
                    selectIncEmpleado.innerHTML += `<option value="${doc.id}" data-nombre="${emp.nombre}" data-ingreso="${emp.fechaIngreso}">${emp.nombre} (${emp.codigo})</option>`;
                });
            } catch (error) {
                console.error("Error al cargar empleados:", error);
            }
        });

        btnVolverListaIncidencias.addEventListener('click', () => {
            vistaFormularioIncidencia.classList.add('hidden');
            vistaListaIncidencias.classList.remove('hidden');
            limpiarFormularioIncidencia();
        });
        
        document.getElementById('btnCancelarIncidencia').addEventListener('click', () => {
            btnVolverListaIncidencias.click();
        });
    }

    // --- C. LÓGICA VISUAL: BANCO DE HORAS Y UX ---    
    // 1. Cambiar texto del checkbox de deuda
    function actualizarTextoCheckboxBanco() {
        if (incAutorizarRecuperacion.checked) {
            textoCheckboxRecuperacion.textContent = "Desmarque la casilla si desea desaprobar la recuperación de horas.";
            textoCheckboxRecuperacion.classList.add('texto-peligro'); // Clase CSS con color rojo
            textoCheckboxRecuperacion.classList.remove('texto-primario');
        } else {
            textoCheckboxRecuperacion.textContent = "Autorizar recuperación de este tiempo.";
            textoCheckboxRecuperacion.classList.add('texto-primario'); // Clase CSS con color azul
            textoCheckboxRecuperacion.classList.remove('texto-peligro');
        }
    }
    if (incAutorizarRecuperacion) incAutorizarRecuperacion.addEventListener('change', actualizarTextoCheckboxBanco);

    // 2. Cargar deudas y saldos al seleccionar tipo de pago
    async function cargarDeudasYSaldo() {
        const empleadoID = selectIncEmpleado.value;
        const tipo = selectTipoIncidencia.value;

        // Inhabilitar Fecha Fin si no aplica
        const tiposSinFechaFin = ['recuperacion_horas', 'compensacion_hora_extra', 'retardo_justificado', 'retardo_injustificado', 'salida_anticipada', 'hora_extra'];
        if (tiposSinFechaFin.includes(tipo)) {
            incFechaFin.disabled = true;
            incFechaFin.value = '';
        } else {
            incFechaFin.disabled = false;
        }

        // Mostrar caja de recuperación (Deuda) si es incidencia negativa
        const tiposNegativos = ['falta_injustificada', 'retardo_injustificado', 'permiso_sin_goce'];
        if (tiposNegativos.includes(tipo)) {
            cajaRecuperacionHoras.classList.remove('hidden');
        } else {
            cajaRecuperacionHoras.classList.add('hidden');
            incAutorizarRecuperacion.checked = false;
        }

        // Mostrar caja de Banco de Horas (Pago) si es recuperación o compensación
        if ((tipo === 'recuperacion_horas' || tipo === 'compensacion_hora_extra') && empleadoID) {
            cajaBancoHoras.classList.remove('hidden');
            selectIncidenciaVinculada.required = true;
            selectIncidenciaVinculada.innerHTML = '<option value="">Buscando deudas...</option>';
            infoSaldoEmpleado.textContent = "Consultando saldo del empleado...";

            try {
                const empDoc = await db.collection('empleados').doc(empleadoID).get();
                const empData = empDoc.data();
                const saldoExtra = empData.saldoHorasExtra || 0;
                const saldoDeudor = empData.saldoPendiente || 0;

                infoSaldoEmpleado.innerHTML = `<strong>Saldo a favor:</strong> ${formatearMinutos(saldoExtra)} | <strong>Saldo deudor total:</strong> ${formatearMinutos(saldoDeudor)}`;
                
                // solo busca las pendientes de compensar
                const snapshotDeudas = await db.collection('incidencias')
                    .where('empleadoID', '==', empleadoID)
                    .where('estatus', '==', 'pendiente_de_compensar')
                    .get();

                if (snapshotDeudas.empty) {
                    selectIncidenciaVinculada.innerHTML = '<option value="">El empleado no tiene deudas pendientes.</option>';
                    selectIncidenciaVinculada.required = false;
                } else {
                    selectIncidenciaVinculada.innerHTML = '<option value="">Seleccione la deuda a pagar...</option>';
                    snapshotDeudas.forEach(doc => {
                        const deuda = doc.data();
                        const fechaStr = deuda.fechaInicio.toDate().toLocaleDateString('es-MX');
                        const tipoLimpio = deuda.tipoIncidencia.replace(/_/g, ' ').toUpperCase();
                        selectIncidenciaVinculada.innerHTML += `<option value="${doc.id}" data-saldo="${deuda.saldoPendiente}">Debe ${formatearMinutos(deuda.saldoPendiente)} por ${tipoLimpio} del ${fechaStr}</option>`;
                    });
                }
            } catch (error) {
                console.error("Error al cargar deudas:", error);
                infoSaldoEmpleado.textContent = "Error al cargar el saldo.";
            }
        } else {
            cajaBancoHoras.classList.add('hidden');
            selectIncidenciaVinculada.required = false;
            selectIncidenciaVinculada.value = "";
        }
    }
    
    if (selectIncEmpleado) selectIncEmpleado.addEventListener('change', cargarDeudasYSaldo);
    if (selectTipoIncidencia) selectTipoIncidencia.addEventListener('change', cargarDeudasYSaldo);

    // 3. Autocompletar inputs de tiempo al seleccionar una deuda
    if (selectIncidenciaVinculada) {
        selectIncidenciaVinculada.addEventListener('change', async (e) => {
            const opcion = e.target.options[e.target.selectedIndex];
            if (!opcion.value) {
                document.getElementById('incHoras').value = '';
                document.getElementById('incMinutos').value = '';
                return;
            }

            const deudaMinutos = parseInt(opcion.getAttribute('data-saldo'));
            let minutosSugeridos = deudaMinutos;
            const tipo = selectTipoIncidencia.value;

            if (tipo === 'compensacion_hora_extra') {
                const empDoc = await db.collection('empleados').doc(selectIncEmpleado.value).get();
                const saldoExtra = empDoc.data().saldoHorasExtra || 0;
                minutosSugeridos = Math.min(deudaMinutos, saldoExtra);
            }

            document.getElementById('incHoras').value = Math.floor(minutosSugeridos / 60);
            document.getElementById('incMinutos').value = minutosSugeridos % 60;
        });
    }

    // --- LOGICA VISUAL PARA ALTERNAR INPUTS DE TIEMPO --- 
    // Oculta los inputs de "Horas/Minutos" y muestra los de "Hora Inicio/Fin" si es recuperación
    if (selectTipoIncidencia) {
        selectTipoIncidencia.addEventListener('change', (e) => {
            const tipo = e.target.value;
            const grupoEstandar = document.getElementById('grupoDuracionEstandar');
            const grupoRecuperacion = document.getElementById('grupoHorarioRecuperacion');
            const incHoras = document.getElementById('incHoras');
            const incMinutos = document.getElementById('incMinutos');
            const incFechaFin = document.getElementById('incFechaFin');
            const incHoraInicioRec = document.getElementById('incHoraInicioRec');
            const incHoraFinRec = document.getElementById('incHoraFinRec');

            // Si estamos editando, abortamos esta función inmediatamente.
            if (incidenciaEditandoID) {
                return; 
            }

            // --- MODO CREACION ---
            
            // Resetear estados por defecto (Todo visible y requerido según el estándar)
            grupoEstandar.classList.remove('hidden');
            grupoRecuperacion.classList.add('hidden');
            
            incHoras.readOnly = false;
            incHoras.required = true; 
            incHoras.classList.remove('input-bloqueado');
            
            incMinutos.readOnly = false;
            incMinutos.required = true; 
            incMinutos.classList.remove('input-bloqueado');
            
            incFechaFin.disabled = false;
            incFechaFin.classList.remove('input-bloqueado');

            if (incHoraInicioRec) incHoraInicioRec.required = false;
            if (incHoraFinRec) incHoraFinRec.required = false;

            // Aplicar reglas segun el tipo elegido
            if (tipo === 'recuperacion_horas') {
                grupoEstandar.classList.add('hidden');
                grupoRecuperacion.classList.remove('hidden');
                
                // Hacemos obligatorios los inputs de recuperación
                if (incHoraInicioRec) incHoraInicioRec.required = true;
                if (incHoraFinRec) incHoraFinRec.required = true;
                
                incHoras.required = false;
                incMinutos.required = false;

            } else if (tipo === 'vacaciones' || tipo === 'incapacidad' || tipo === 'suspension') {
                // Bloqueamos horas/minutos, dejamos fechas libres (la fecha fin es opcional)
                incHoras.readOnly = true;
                incMinutos.readOnly = true;
                
                incHoras.required = false;
                incMinutos.required = false;
                
                incHoras.classList.add('input-bloqueado');
                incMinutos.classList.add('input-bloqueado');
                incHoras.value = '';
                incMinutos.value = '';
                
            } else if (['retardo_justificado', 'retardo_injustificado', 'salida_anticipada', 'hora_extra', 'compensacion_hora_extra'].includes(tipo)) {
                // Bloqueamos fecha fin porque son incidencias de un solo dia
                incFechaFin.disabled = true;
                incFechaFin.value = '';
                incFechaFin.classList.add('input-bloqueado');
                
                // Aseguramos que horas y minutos sigan siendo obligatorios
                incHoras.required = true;
                incMinutos.required = true;
            }      
        });
    }

    // --- D. VALIDACION Y GUARDADO EN FIRESTORE ---
    function validarDatosIncidencia() {
        const empleadoID = selectIncEmpleado.value;
        const tipoIncidencia = selectTipoIncidencia.value;
        const fechaInicio = document.getElementById('incFechaInicio').value;
        const motivo = document.getElementById('incMotivo').value.trim();

        if (!empleadoID) return "Selecciona un empleado.";
        if (!tipoIncidencia) return "Selecciona un tipo de incidencia.";
        if (!fechaInicio) return "La Fecha de Inicio es obligatoria.";
        if (!motivo || motivo.length < 5) return "Describa el motivo de la incidencia.";

        // Validacion de Antigüedad para Vacaciones
        if (tipoIncidencia === 'vacaciones') {
            const opcionSeleccionada = selectIncEmpleado.options[selectIncEmpleado.selectedIndex];
            const fechaIngresoStr = opcionSeleccionada.getAttribute('data-ingreso');

            if (!fechaIngresoStr || fechaIngresoStr === "undefined") return "Error de sistema: No se pudo verificar la antigüedad del empleado.";

            const [year, month, day] = fechaIngresoStr.split('-').map(Number);
            const fechaIngreso = new Date(year, month -1, day);
            const fechaActual = new Date();

            // Calculo de 1 año desde la fecha de ingreso
            const fechaUnAnoDespues = new Date(fechaIngreso);
            fechaUnAnoDespues.setFullYear(fechaUnAnoDespues.getFullYear() + 1);
                
            if (fechaActual < fechaUnAnoDespues) {
                return "El empleado no cumple con el requisito de 1 año de antigüedad para solicitar vacaciones.";
            }            
        }

        // --- Validacion dinamica del tiempo según el tipo de incidencia ---
        const tiposDiasCompletos = ['vacaciones', 'incapacidad', 'suspension'];
        let tiempoValido = false;
        
        if (tiposDiasCompletos.includes(tipoIncidencia)) {
            // si es de dias completos, el tiempo es valido (no requiere especificar horas)
            tiempoValido = true;
        } else if (tipoIncidencia === 'recuperacion_horas') {
            const inicioRec = document.getElementById('incHoraInicioRec').value;
            const finRec = document.getElementById('incHoraFinRec').value;
            if (!inicioRec || !finRec) return "Las horas de inicio y fin son obligatorias para la recuperación.";
            if (inicioRec >= finRec) return "La hora de fin debe ser mayor a la hora de inicio.";
            tiempoValido = true;
        } else {
            // para retardos, faltas y horas extra, si exigimos que las horas sean mayor a 0
            const horas = parseInt(document.getElementById('incHoras').value) || 0;
            const minutos = parseInt(document.getElementById('incMinutos').value) || 0;
            if (horas > 0 || minutos > 0) tiempoValido = true;
        }
        
        if (!tiempoValido) return "El tiempo afectado debe ser mayor a 0.";

        // validacion de fecha fin (opcional)
        const fechaFinVal = document.getElementById('incFechaFin').value;
        // no se exige que la fecha fin sea obligatoria. Si la ponen debe ser logica.
        if (fechaFinVal && new Date(fechaFinVal) < new Date(fechaInicio)) {
            return "La Fecha de Fin no puede ser anterior a la Fecha de Inicio.";
        }       

        return null; // sin errores 
    }
    
    if (formRegistroIncidencia) {
        formRegistroIncidencia.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const errorValidacion = validarDatosIncidencia();
            if (errorValidacion) {
                alert(`ERROR:\n${errorValidacion}`);
                return;
            }

            const btnSubmit = formRegistroIncidencia.querySelector('button[type="submit"]');
            btnSubmit.disabled = true;
            btnSubmit.textContent = "Guardando...";

            try {
                const opcionSeleccionada = selectIncEmpleado.options[selectIncEmpleado.selectedIndex];
                const empleadoID = opcionSeleccionada.value;
                const tipoIncidencia = selectTipoIncidencia.value;
                
                // --- Calculo de horas afectadas ---
                let horasAfectadas = 0;
                if (tipoIncidencia === 'recuperacion_horas') {
                    const inicioStr = document.getElementById('incHoraInicioRec').value;
                    const finStr = document.getElementById('incHoraFinRec').value;
                    const [hIni, mIni] = inicioStr.split(':').map(Number);
                    const [hFin, mFin] = finStr.split(':').map(Number);
                    horasAfectadas = ((hFin * 60) + mFin) - ((hIni * 60) + mIni);
                } else {
                    const horasInput = parseInt(document.getElementById('incHoras').value) || 0;
                    const minutosInput = parseInt(document.getElementById('incMinutos').value) || 0;
                    horasAfectadas = (horasInput * 60) + minutosInput;
                }
                
                // Validación de fondos suficientes
                if (tipoIncidencia === 'compensacion_hora_extra' && !incidenciaEditandoID) {
                    const empDoc = await db.collection('empleados').doc(empleadoID).get();
                    const saldoExtra = empDoc.data().saldoHorasExtra || 0;
                    if (horasAfectadas > saldoExtra) {
                        alert(`FONDOS INSUFICIENTES:\nEl empleado solo tiene ${formatearMinutos(saldoExtra)} a favor. No puedes compensar ${formatearMinutos(horasAfectadas)}.`);
                        btnSubmit.disabled = false;
                        btnSubmit.textContent = incidenciaEditandoID ? "Actualizar Incidencia" : "Guardar Incidencia";
                        return;
                    }
                }

                const incidenciaData = {
                    empleadoID: empleadoID,
                    empleadoNombre: opcionSeleccionada.getAttribute('data-nombre'),
                    tipoIncidencia: tipoIncidencia, 
                    fechaInicio: firebase.firestore.Timestamp.fromDate(new Date(document.getElementById('incFechaInicio').value + "T00:00:00")),
                    horasAfectadas: horasAfectadas,
                    autorizantes: document.getElementById('incAutorizantes').value.trim(),
                    motivo: document.getElementById('incMotivo').value.trim()
                };

                const fechaFinVal = document.getElementById('incFechaFin').value;
                if (fechaFinVal) {
                    incidenciaData.fechaFin = firebase.firestore.Timestamp.fromDate(new Date(fechaFinVal + "T23:59:59"));
                } else if (incidenciaEditandoID) {
                    incidenciaData.fechaFin = firebase.firestore.FieldValue.delete();
                }

                const tiposJustificados = ['falta_justificada', 'retardo_justificado', 'permiso_con_goce', 'vacaciones', 'incapacidad', 'hora_extra'];
                let estatusFinal = 'aprobada'; 

                if (incidenciaEditandoID) {
                    // --- MODO EDICION ---
                    if (tiposJustificados.includes(tipoIncidencia)) {
                        estatusFinal = 'aprobada';
                        //incidenciaData.saldoPendiente = firebase.firestore.FieldValue.delete();
                    } else if (incAutorizarRecuperacion && incAutorizarRecuperacion.checked){
                        estatusFinal = 'pendiente_de_compensar';
                        // si ya tenia un saldo pendiente (compensada parcialmente), respetamos ese valor
                        // sino respetamos las horas afectadas originales
                        incidenciaData.saldoPendiente = (saldoPendienteOriginal !== null) ? saldoPendienteOriginal : horasAfectadas;
                    } else {
                        estatusFinal = 'revisada';
                        incidenciaData.saldoPendiente = firebase.firestore.FieldValue.delete();
                    }

                    incidenciaData.estatus = estatusFinal;
                    await db.collection('incidencias').doc(incidenciaEditandoID).update(incidenciaData);

                    // Calculamos cuanta deuda tenia esta incidencia antes de editarla
                    let deudaActivaVieja = 0;

                    if (estatusIncidenciaOriginal === 'pendiente_de_compensar' || estatusIncidenciaOriginal === 'compensada_parcialmente') {
                        deudaActivaVieja = (saldoPendienteOriginal !== null) ? saldoPendienteOriginal : horasAfectadasOriginales;
                    }

                    // Calculamos cuánta deuda tiene esta incidencia AHORA
                    let deudaActivaNueva = 0;
                    if (estatusFinal === 'pendiente_de_compensar' || estatusFinal === 'compensada_parcialmente') {
                        deudaActivaNueva = incidenciaData.saldoPendiente;
                    }

                    // Sacamos la diferencia y se la aplicamos al empleado
                    const diferenciaDeuda = deudaActivaNueva - deudaActivaVieja;
                    if (diferenciaDeuda !== 0) {
                        await db.collection('empleados').doc(empleadoID).update({ 
                            saldoPendiente: firebase.firestore.FieldValue.increment(diferenciaDeuda) 
                        });
                    }

                    // Actualizar saldo a favor si editaron una Hora Extra
                    if (tipoIncidencia === 'hora_extra') {
                        const diferenciaExtra = horasAfectadas - horasAfectadasOriginales;
                        if (diferenciaExtra !== 0) {
                            await db.collection('empleados').doc(empleadoID).update({ 
                                saldoHorasExtra: firebase.firestore.FieldValue.increment(diferenciaExtra) 
                            });
                        }
                    }

                    alert("Incidencia actualizada exitosamente.");

                } else {

                     // MODO CREACIÓN
                    incidenciaData.estatus = 'aprobada'; 
                    incidenciaData.fechaCreacion = firebase.firestore.FieldValue.serverTimestamp();
                    
                    const usuarioActual = firebase.auth().currentUser;
                    const correoAdmin = (usuarioActual && usuarioActual.email) ? usuarioActual.email : document.getElementById('userNameDisplay').textContent;
                    incidenciaData.registradoPor = correoAdmin;

                    // 1. LÓGICA DE PAGO DE DEUDAS
                    if (tipoIncidencia === 'recuperacion_horas' || tipoIncidencia === 'compensacion_hora_extra') {
                        const deudaID = selectIncidenciaVinculada.value;
                        if (deudaID) {
                            const deudaDoc = await db.collection('incidencias').doc(deudaID).get();
                            const deudaActual = deudaDoc.data().saldoPendiente || 0;
                            const pago = horasAfectadas; 

                            let nuevoSaldoPendienteDeuda = deudaActual - pago;
                            let nuevoEstatusDeuda = 'pendiente_de_compensar';
                            let excedenteParaEmpleado = 0;
                            let reduccionDeudaEmpleado = pago;

                            if (nuevoSaldoPendienteDeuda <= 0) {
                                nuevoEstatusDeuda = 'compensada_totalmente';
                                excedenteParaEmpleado = Math.abs(nuevoSaldoPendienteDeuda);
                                reduccionDeudaEmpleado = deudaActual; 
                                nuevoSaldoPendienteDeuda = 0;
                            } else {
                                nuevoEstatusDeuda = 'compensada_parcialmente';
                            }

                            // A. Actualizar la deuda original en Firestore
                            await db.collection('incidencias').doc(deudaID).update({
                                saldoPendiente: nuevoSaldoPendienteDeuda,
                                estatus: nuevoEstatusDeuda
                            });

                            // B. Actualizar perfil del empleado
                            if (tipoIncidencia === 'recuperacion_horas') {
                                await db.collection('empleados').doc(empleadoID).update({
                                    saldoPendiente: firebase.firestore.FieldValue.increment(-reduccionDeudaEmpleado),
                                    saldoHorasExtra: firebase.firestore.FieldValue.increment(excedenteParaEmpleado)
                                });
                            } else if (tipoIncidencia === 'compensacion_hora_extra') {
                                await db.collection('empleados').doc(empleadoID).update({
                                    saldoPendiente: firebase.firestore.FieldValue.increment(-reduccionDeudaEmpleado),
                                    saldoHorasExtra: firebase.firestore.FieldValue.increment(-pago)
                                });
                            }
                            incidenciaData.incidenciaQueCompensa = deudaID;

                            incidenciaData.tiempoCompensado = reduccionDeudaEmpleado;
                            incidenciaData.tiempoExcedente = excedenteParaEmpleado;
                        }
                    } 
                    // 2. LOGICA DE GANANCIA DE HORAS EXTRA
                    else if (tipoIncidencia === 'hora_extra') {
                        await db.collection('empleados').doc(empleadoID).update({
                            saldoHorasExtra: firebase.firestore.FieldValue.increment(horasAfectadas)
                        });
                    }

                    // Guardar la nueva incidencia
                    await db.collection('incidencias').add(incidenciaData);
                    alert("Incidencia registrada exitosamente.");
                }
                                
                btnVolverListaIncidencias.click(); 

            } catch (error) {
                console.error("Error al guardar incidencia:", error);
                alert("Ocurrió un error al guardar la incidencia.");
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.textContent = incidenciaEditandoID ? "Actualizar Incidencia" : "Guardar Incidencia";
            }
        });
    }

    // -- E. Cargar y Mostrar Incidencias (Paginacion, Pestañas y Búsqueda) --
    let todasLasIncidencias = [];
    let incidenciasFiltradas = []; // Arreglo para guardar los resultados de búsqueda
    let paginaActualIncidencias = 1;
    const incidenciasPorPagina = 8;
    let terminoBusquedaIncidencias = ""; // Lo que escribe la Directora
    
    const controlesPaginacion = document.getElementById('controlesPaginacionIncidencias');
    const btnPaginaAnterior = document.getElementById('btnPaginaAnterior');
    const btnPaginaSiguiente = document.getElementById('btnPaginaSiguiente');
    const textoPaginacion = document.getElementById('textoPaginacion');
    const buscadorIncidencias = document.getElementById('buscadorIncidencias');

    let filtroEstatusIncidencias = 'pendiente_de_revision'; 
    const btnTabPendientes = document.getElementById('btnTabPendientes');
    const btnTabAtendidas = document.getElementById('btnTabAtendidas');

    // 1. Busqueda Inteligente en Memoria
    if (buscadorIncidencias) {
        buscadorIncidencias.addEventListener('input', (e) => {
            terminoBusquedaIncidencias = e.target.value.toLowerCase();
            paginaActualIncidencias = 1; // Si busca algo, lo regresamos a la página 1
            renderizarPaginaIncidencias();
        });
    }

    if (btnTabPendientes && btnTabAtendidas) {
        btnTabPendientes.addEventListener('click', () => {
            filtroEstatusIncidencias = 'pendiente_de_revision';
            btnTabPendientes.style.borderBottom = '3px solid var(--color-primary)';
            btnTabPendientes.style.color = 'var(--color-primary)';
            btnTabAtendidas.style.borderBottom = 'none';
            btnTabAtendidas.style.color = 'var(--color-text-light)';
            paginaActualIncidencias = 1; // Resetear página al cambiar pestaña
            cargarIncidencias(); 
        });

        btnTabAtendidas.addEventListener('click', () => {
            filtroEstatusIncidencias = 'atendidas'; 
            btnTabAtendidas.style.borderBottom = '3px solid var(--color-primary)';
            btnTabAtendidas.style.color = 'var(--color-primary)';
            btnTabPendientes.style.borderBottom = 'none';
            btnTabPendientes.style.color = 'var(--color-text-light)';
            paginaActualIncidencias = 1; // Resetear página al cambiar pestaña
            cargarIncidencias(); 
        });
    }

    window.cargarIncidencias = function() {
        if (!tablaIncidenciasBody) return;

        db.collection('incidencias').orderBy('fechaInicio', 'desc').onSnapshot((consulta) => {
            todasLasIncidencias = []; 
            
            consulta.forEach((doc) => {
                const inc = doc.data();
                if (filtroEstatusIncidencias === 'pendiente_de_revision' && inc.estatus !== 'pendiente_de_revision') return;
                if (filtroEstatusIncidencias === 'atendidas' && inc.estatus === 'pendiente_de_revision') return;
                
                todasLasIncidencias.push({ id: doc.id, ...doc.data() });
            });

            renderizarPaginaIncidencias();
        }, (error) => {
            console.error("Error al cargar incidencias:", error);
        });
    };

    function renderizarPaginaIncidencias() {
        tablaIncidenciasBody.innerHTML = ''; 
        
        // 2. APLICAR FILTRO DE BÚSQUEDA A TODOS LOS DATOS
        incidenciasFiltradas = todasLasIncidencias.filter(inc => {
            if (!terminoBusquedaIncidencias) return true;
            
            // Unimos todos los textos útiles para buscar en ellos
            const textoBusqueda = `${inc.empleadoNombre} ${inc.empleadoID} ${inc.tipoIncidencia} ${inc.estatus} ${inc.motivo}`.toLowerCase();
            return textoBusqueda.includes(terminoBusquedaIncidencias);
        });

        if (incidenciasFiltradas.length === 0) {
            tablaIncidenciasBody.innerHTML = `<tr><td colspan="6" class="table-empty-state">No se encontraron incidencias.</td></tr>`;
            if (controlesPaginacion) controlesPaginacion.classList.add('hidden');
            return;
        }
        
        if (controlesPaginacion) controlesPaginacion.classList.remove('hidden');
        
        // 3. MATEMÁTICAS DE PAGINACIÓN SOBRE LOS DATOS FILTRADOS
        const totalPaginas = Math.ceil(incidenciasFiltradas.length / incidenciasPorPagina) || 1;
        if (paginaActualIncidencias > totalPaginas) paginaActualIncidencias = totalPaginas;
        
        const indiceInicio = (paginaActualIncidencias - 1) * incidenciasPorPagina;
        const indiceFin = indiceInicio + incidenciasPorPagina;
        const incidenciasA_Mostrar = incidenciasFiltradas.slice(indiceInicio, indiceFin);
        
        incidenciasA_Mostrar.forEach((inc) => {
            const tr = document.createElement('tr');
            let fechaTexto = inc.fechaInicio ? inc.fechaInicio.toDate().toLocaleDateString('es-MX') : "Fecha pendiente";
            const tipoTexto = inc.tipoIncidencia.replace(/_/g, ' ').toUpperCase();
            const estatusTexto = inc.estatus.replace(/_/g, ' ').toUpperCase();
            const nombreEmp = inc.empleadoNombre || 'Empleado Desconocido';
            const idEmp = inc.empleadoID || 'Sin ID';

            // --- LOGICA VISUAL PARA DEUDAS PARCIALES ---
            let horasTexto = formatearMinutos(inc.horasAfectadas);
            // Si la incidencia tiene pagos parciales o está pendiente, mostramos cuánto resta realmente
            if ((inc.estatus === 'compensada_parcialmente' || inc.estatus === 'pendiente_de_compensar') && inc.saldoPendiente !== undefined && inc.saldoPendiente !== inc.horasAfectadas) {
                horasTexto = `${formatearMinutos(inc.horasAfectadas)}<br><span style="color: var(--color-error); font-size: 11px; font-weight: bold;">(Resta: ${formatearMinutos(inc.saldoPendiente)})</span>`;
            }

            tr.innerHTML = `
                <td>${fechaTexto}</td>
                <td>
                    <strong>${nombreEmp}</strong>
                    <span class="texto-secundario">${idEmp}</span>
                </td>
                <td style="font-size: 12px;">${tipoTexto}</td>                
                <td>${horasTexto}</td>
                <td><span class="estatus-${inc.estatus}">${estatusTexto}</span></td>
                <td>
                    <button class="btn-icon" onclick="editarIncidencia('${inc.id}')" title="Editar">
                        <img src="recursos/icono-editar.svg" alt="Editar">
                    </button>
                    <button class="btn-icon" onclick="verDetallesIncidencia('${inc.id}')" title="Ver Detalles">
                        <img src="recursos/icono-ver.svg" alt="Ver">
                    </button>
                    <button class="btn-icon icon-danger" onclick="eliminarIncidencia('${inc.id}')" title="Eliminar Incidencia">
                        <img src="recursos/icono-baja.svg" alt="Eliminar">
                    </button>
                </td>
            `;
            tablaIncidenciasBody.appendChild(tr);
        });
        
        actualizarBotonesPaginacion(totalPaginas);
    }

    function actualizarBotonesPaginacion(totalPaginas) {
        textoPaginacion.textContent = `Página ${paginaActualIncidencias} de ${totalPaginas}`;
        btnPaginaAnterior.disabled = paginaActualIncidencias === 1;
        btnPaginaSiguiente.disabled = paginaActualIncidencias === totalPaginas;
    }

    if (btnPaginaAnterior && btnPaginaSiguiente) {
        btnPaginaAnterior.addEventListener('click', () => {
            if (paginaActualIncidencias > 1) {
                paginaActualIncidencias--;
                renderizarPaginaIncidencias();
            }
        });
        btnPaginaSiguiente.addEventListener('click', () => {
            const totalPaginas = Math.ceil(incidenciasFiltradas.length / incidenciasPorPagina);
            if (paginaActualIncidencias < totalPaginas) {
                paginaActualIncidencias++;
                renderizarPaginaIncidencias();
            }
        });
    }

    // ============================================
    // LOGICA DE UX: BLOQUEO DE CAMPOS PARA PERMISOS EN EDICIÓN
    // ============================================
    const inputTipoIncidencia = document.getElementById('incTipo');
    if (inputTipoIncidencia) {
        inputTipoIncidencia.addEventListener('change', (e) => {
            // Solo aplicamos este candado si estamos en MODO EDICION
            if (incidenciaEditandoID) {
                const tipo = e.target.value;
                const incHoras = document.getElementById('incHoras');
                const incMinutos = document.getElementById('incMinutos');
                const incFechaFin = document.getElementById('incFechaFin');
                
                // Si elige un permiso, bloqueamos el tiempo y la fecha fin
                if (tipo === 'permiso_con_goce' || tipo === 'permiso_sin_goce') {
                    incHoras.readOnly = true;
                    incHoras.classList.add('input-bloqueado');
                    
                    incMinutos.readOnly = true;
                    incMinutos.classList.add('input-bloqueado');
                    
                    incFechaFin.readOnly = true;
                    incFechaFin.disabled = true;
                    incFechaFin.classList.add('input-bloqueado');
                } else {
                    // Si regresa a retardo o falta, desbloqueamos
                    incHoras.readOnly = false;
                    incHoras.classList.remove('input-bloqueado');
                    
                    incMinutos.readOnly = false;
                    incMinutos.classList.remove('input-bloqueado');
                    
                    incFechaFin.readOnly = false;
                    incFechaFin.disabled = false;
                    incFechaFin.classList.remove('input-bloqueado');
                }
            }
        });
    }

    // -- F. Editar Incidencia (Cargar datos al formulario) --    
    window.editarIncidencia = async function(id) {
        try {
            const doc = await db.collection('incidencias').doc(id).get();
            if (!doc.exists) return;
            const inc = doc.data();
            
            incidenciaEditandoID = id;
            estatusIncidenciaOriginal = inc.estatus;
            
            horasAfectadasOriginales = inc.horasAfectadas || 0; 
            
            // Capturamos el saldo pendiente actual para no borrar los pagos parciales
            saldoPendienteOriginal = inc.saldoPendiente !== undefined ? inc.saldoPendiente : null;

            const snapshot = await db.collection('empleados').where('estatus', '==', 'activo').orderBy('nombre', 'asc').get();
            selectIncEmpleado.innerHTML = '<option value="">Seleccione un empleado...</option>';
            snapshot.forEach(empDoc => {
                const emp = empDoc.data();
                selectIncEmpleado.innerHTML += `<option value="${empDoc.id}" data-nombre="${emp.nombre}" data-ingreso="${emp.fechaIngreso}">${emp.nombre} (${emp.codigo})</option>`;
            });

            document.getElementById('incEmpleado').value = inc.empleadoID;
            document.getElementById('incTipo').value = inc.tipoIncidencia;
            
            // Convertir minutos a horas y minutos para los inputs
            const horasAfectadas = inc.horasAfectadas || 0;
            document.getElementById('incHoras').value = Math.floor(horasAfectadas / 60);
            document.getElementById('incMinutos').value = horasAfectadas % 60;
            
            document.getElementById('incAutorizantes').value = inc.autorizantes || "";
            document.getElementById('incMotivo').value = inc.motivo || "";

            // --- PROTECCION DE EDICION  ---  
            
            // Bloquear campos estructurales para evitar corrupción de datos
            const incEmpleadoInput = document.getElementById('incEmpleado');
            const incFechaInicioInput = document.getElementById('incFechaInicio');
            const incFechaFinInput = document.getElementById('incFechaFin');
            const incHorasInput = document.getElementById('incHoras');
            const incMinutosInput = document.getElementById('incMinutos');

            // Bloqueo de empleado
            incEmpleadoInput.disabled = true;
            
            // Bloqueo de fechas 
            incFechaInicioInput.disabled = true;
            incFechaInicioInput.classList.add('input-bloqueado');

            incFechaFinInput.disabled = true;
            incFechaFinInput.classList.add('input-bloqueado'); 

            // Bloqueo de tiempo
            incHorasInput.readOnly = true;
            incHorasInput.classList.add('input-bloqueado');

            incMinutosInput.readOnly = true;
            incMinutosInput.classList.add('input-bloqueado');
            
            // Filtrar los Tipos de Incidencia permitidos
            const tipoOriginal = inc.tipoIncidencia;
            let opcionesPermitidas = [tipoOriginal]; 

            const grupoDiasCompletos = ['falta_injustificada', 'falta_justificada', 'permiso_con_goce', 'permiso_sin_goce', 'vacaciones', 'suspension', 'incapacidad'];
            const grupoParciales = ['retardo_injustificado', 'retardo_justificado', 'salida_anticipada'];
            const grupoBancoHoras = ['hora_extra', 'recuperacion_horas', 'compensacion_hora_extra'];

            if (grupoDiasCompletos.includes(tipoOriginal)) opcionesPermitidas = ['falta_injustificada', 'falta_justificada', 'permiso_con_goce', 'permiso_sin_goce', 'vacaciones', 'suspension', 'incapacidad'];
            else if (grupoParciales.includes(tipoOriginal)) opcionesPermitidas = ['retardo_injustificado', 'retardo_justificado', 'permiso_con_goce', 'permiso_sin_goce'];
            else if (grupoBancoHoras.includes(tipoOriginal)) opcionesPermitidas = [tipoOriginal]; 
            
            // Ocultar las opciones que no pertenecen grupo permitido
            Array.from(document.getElementById('incTipo').options).forEach(opt => {
                if (opt.value === "") return;                 
                if (opcionesPermitidas.includes(opt.value)) {
                    opt.hidden = false;
                    opt.disabled = false;
                } else {
                    opt.hidden = true;
                    opt.disabled = true;
                }
            });          

            if (inc.fechaInicio) {
                const f = inc.fechaInicio.toDate();
                document.getElementById('incFechaInicio').value = `${f.getFullYear()}-${String(f.getMonth()+1).padStart(2,'0')}-${String(f.getDate()).padStart(2,'0')}`;
            }
            if (inc.fechaFin) {
                const f = inc.fechaFin.toDate();
                document.getElementById('incFechaFin').value = `${f.getFullYear()}-${String(f.getMonth()+1).padStart(2,'0')}-${String(f.getDate()).padStart(2,'0')}`;
            } else {
                document.getElementById('incFechaFin').value = "";
            }

            // Disparar la logica visual para acomodar la UI según el tipo
            cargarDeudasYSaldo();

            // --- LOGICA VISUAL DEL CHECKBOX Y TEXTO DE DEUDA ---
            const tiposNegativos = ['falta_injustificada', 'retardo_injustificado', 'permiso_sin_goce'];
            // Seleccionamos el párrafo de instrucciones dentro de la caja de recuperación
            const instruccionBanco = cajaRecuperacionHoras ? cajaRecuperacionHoras.querySelector('.texto-instruccion-banco') : null;

            if (tiposNegativos.includes(inc.tipoIncidencia)) {
                if (cajaRecuperacionHoras) cajaRecuperacionHoras.classList.remove('hidden');
                
                if (incAutorizarRecuperacion) {
                    incAutorizarRecuperacion.checked = (inc.estatus === 'pendiente_de_compensar');
                    actualizarTextoCheckboxBanco(); 
                }
                
                // Mostramos al administrador cual es la deuda real si ya hay pagos parciales
                if (instruccionBanco) {
                    if (inc.estatus === 'compensada_parcialmente' && inc.saldoPendiente !== undefined) {
                        instruccionBanco.innerHTML = `<strong class="alerta-texto">Atención:</strong> Esta incidencia ya tiene pagos registrados. Al autorizar, solo se reactivará el saldo restante de <strong>${formatearMinutos(inc.saldoPendiente)}</strong>.`;
                    } else {
                        instruccionBanco.textContent = 'Al autorizar, el estatus cambiará a "Pendiente de Compensar" y las horas se sumarán al saldo deudor del empleado.';
                    }
                }
            } else {
                if (cajaRecuperacionHoras) cajaRecuperacionHoras.classList.add('hidden');
                if (incAutorizarRecuperacion) incAutorizarRecuperacion.checked = false;
            }

            // Disparar el evento 'change' para que aplique el bloqueo visual automáticamente al abrir
            document.getElementById('incTipo').dispatchEvent(new Event('change'));
            document.getElementById('tituloFormIncidencia').textContent = "Revisar / Editar Incidencia";
            formRegistroIncidencia.querySelector('button[type="submit"]').textContent = "Actualizar Incidencia";
            
            vistaListaIncidencias.classList.add('hidden');
            vistaFormularioIncidencia.classList.remove('hidden');

        } catch (error) {
            console.error("Error al cargar incidencia para editar:", error);
            alert("Ocurrió un error al cargar los datos de la incidencia.");
        }
    };

    // ============================================
    // G. ELIMINAR INCIDENCIA (Delete con Reversión Automática)
    // ============================================
    window.eliminarIncidencia = async function(id) {
        const confirmar = confirm("¿Estás seguro de eliminar esta incidencia?\n\nEsta acción no se puede deshacer. Si es un pago, los saldos y deudas se revertirán automáticamente.");
        if (!confirmar) return;

        try {
            const doc = await db.collection('incidencias').doc(id).get();
            if (!doc.exists) return;
            const inc = doc.data();

            // 1. REVERTIR SALDOS SI BORRAMOS UNA DEUDA ACTIVA (Falta o Retardo)
            if (inc.estatus === 'pendiente_de_compensar' || inc.estatus === 'compensada_parcialmente') {
                const saldoARevertir = inc.saldoPendiente || 0;
                await db.collection('empleados').doc(inc.empleadoID).update({
                    saldoPendiente: firebase.firestore.FieldValue.increment(-saldoARevertir)
                });
            }

            // 2. REVERTIR PAGOS (Ingenieria Inversa para Recuperación o Compensacion)
            if (inc.tipoIncidencia === 'recuperacion_horas' || inc.tipoIncidencia === 'compensacion_hora_extra') {
                if (inc.incidenciaQueCompensa) {
                    const deudaDoc = await db.collection('incidencias').doc(inc.incidenciaQueCompensa).get();
                    
                    if (deudaDoc.exists) {
                        const deuda = deudaDoc.data();
                        
                        // Usamos los valores exactos que guardamos al crear el pago
                        const horasRestauradasADeuda = inc.tiempoCompensado !== undefined ? inc.tiempoCompensado : (inc.horasAfectadas || 0);
                        const excedente = inc.tiempoExcedente !== undefined ? inc.tiempoExcedente : 0;

                        // Restaurar estatus de la deuda original
                        const nuevoSaldoPendiente = (deuda.saldoPendiente || 0) + horasRestauradasADeuda;
                        let nuevoEstatusDeuda = 'pendiente_de_compensar';
                        if (nuevoSaldoPendiente < deuda.horasAfectadas && nuevoSaldoPendiente > 0) {
                            nuevoEstatusDeuda = 'compensada_parcialmente';
                        } else if (nuevoSaldoPendiente <= 0) {
                            nuevoEstatusDeuda = 'compensada_totalmente';
                        }

                        // Actualizar la incidencia original (Revivir la deuda)
                        await db.collection('incidencias').doc(inc.incidenciaQueCompensa).update({
                            saldoPendiente: nuevoSaldoPendiente,
                            estatus: nuevoEstatusDeuda
                        });

                        // Revertir saldos en el perfil del empleado
                        if (inc.tipoIncidencia === 'recuperacion_horas') {
                            await db.collection('empleados').doc(inc.empleadoID).update({
                                saldoPendiente: firebase.firestore.FieldValue.increment(horasRestauradasADeuda),
                                saldoHorasExtra: firebase.firestore.FieldValue.increment(-excedente)
                            });
                        } else if (inc.tipoIncidencia === 'compensacion_hora_extra') {
                            await db.collection('empleados').doc(inc.empleadoID).update({
                                saldoPendiente: firebase.firestore.FieldValue.increment(horasRestauradasADeuda),
                                saldoHorasExtra: firebase.firestore.FieldValue.increment(inc.horasAfectadas || 0) // Devolvemos todo lo que gastó
                            });
                        }
                    }
                }
            }
            // --- REVERTIR GANANCIA DE HORA EXTRA ---
            else if (inc.tipoIncidencia === 'hora_extra') {
                // Le restamos las horas que se le habían regalado por error
                await db.collection('empleados').doc(inc.empleadoID).update({
                    saldoHorasExtra: firebase.firestore.FieldValue.increment(-(inc.horasAfectadas || 0))
                });
            }


            // 3. Eliminar el documento de Firestore
            await db.collection('incidencias').doc(id).delete();
            alert("Incidencia eliminada y saldos revertidos correctamente.");

        } catch (error) {
            console.error("Error al eliminar incidencia:", error);
            alert("Ocurrió un error al intentar eliminar el registro.");
        }
    };

    // ============================================
    // 18. VER DETALLES DE INCIDENCIA (Modal)
    // ============================================
    window.verDetallesIncidencia = async function(id) {
        try {
            // 1. Consultar la incidencia en Firestore
            const doc = await db.collection('incidencias').doc(id).get();
            if (!doc.exists) return;
            const inc = doc.data();

            const modalBody = document.getElementById('modalBodyIncidencia');

            // 2. Formatear fechas y textos
            const fechaInicioFormateada = inc.fechaInicio ? inc.fechaInicio.toDate().toLocaleDateString('es-MX') : 'No registrada';
            const fechaFinFormateada = inc.fechaFin ? inc.fechaFin.toDate().toLocaleDateString('es-MX') : 'No aplica';
            
            const tipoTexto = inc.tipoIncidencia.replace(/_/g, ' ').toUpperCase();
            const estatusTexto = inc.estatus.replace(/_/g, ' ').toUpperCase();
            const nombreEmp = inc.empleadoNombre || 'Empleado Desconocido';

            // 3. Inyectar HTML limpio usando las clases CSS
            modalBody.innerHTML = `
                <div class="incidencia-detalle-grupo" style="margin-bottom: 20px;">                    
                    <div class="incidencia-detalle-valor" style="border-bottom: 2px solid var(--color-primary); padding-bottom: 10px;">
                        <strong style="font-size: 18px; color: var(--color-primary);">${nombreEmp}</strong> 
                        <span class="texto-secundario">${inc.empleadoID}</span>
                    </div>
                </div>
                
                <div class="grid-detalles-2">
                    <div class="incidencia-detalle-grupo">
                        <span class="incidencia-detalle-etiqueta">Tipo de Incidencia</span>
                        <div class="incidencia-detalle-valor">${tipoTexto}</div>
                    </div>
                    <div class="incidencia-detalle-grupo">
                        <span class="incidencia-detalle-etiqueta">Estatus</span>
                        <div class="incidencia-detalle-valor">
                            <span class="estatus-${inc.estatus}">${estatusTexto}</span>
                        </div>
                    </div>
                </div>

                <div class="grid-detalles-2">
                    <div class="incidencia-detalle-grupo">
                        <span class="incidencia-detalle-etiqueta">Fecha de Inicio</span>
                        <div class="incidencia-detalle-valor">${fechaInicioFormateada}</div>
                    </div>
                    <div class="incidencia-detalle-grupo">
                        <span class="incidencia-detalle-etiqueta">Fecha de Fin</span>
                        <div class="incidencia-detalle-valor">${fechaFinFormateada}</div>
                    </div>
                </div>

                <div class="grid-detalles-2">
                    <div class="incidencia-detalle-grupo">
                        <span class="incidencia-detalle-etiqueta">Tiempo Afectado</span>
                        <div class="incidencia-detalle-valor">${formatearMinutos(inc.horasAfectadas)}</div>
                    </div>
                    <div class="incidencia-detalle-grupo">
                        <span class="incidencia-detalle-etiqueta">Registrado por</span>
                        <div class="incidencia-detalle-valor">${inc.registradoPor || 'Sistema'}</div>
                    </div>
                </div>

                <div class="incidencia-detalle-grupo" style="margin-top: 10px;">
                    <span class="incidencia-detalle-etiqueta">Autorizado por</span>
                    <div class="incidencia-detalle-valor">${inc.autorizantes || 'No requiere / No registrado'}</div>
                </div>

                <div class="incidencia-detalle-grupo" style="margin-top: 10px;">
                    <span class="incidencia-detalle-etiqueta">Motivo / Descripción</span>
                    <div class="incidencia-detalle-valor">${inc.motivo || 'Sin descripción'}</div>
                </div>
            `;

            // 4. Mostrar el modal
            document.getElementById('modalDetallesIncidencia').classList.remove('hidden');

        } catch (error) {
            console.error("Error al ver detalles de incidencia:", error);
            alert("Ocurrió un error al cargar los detalles.");
        }
    };

    // Evento para cerrar el modal
    const btnCerrarModalIncidencia = document.getElementById('btnCerrarModalIncidencia');
    if (btnCerrarModalIncidencia) {
        btnCerrarModalIncidencia.addEventListener('click', () => {
            document.getElementById('modalDetallesIncidencia').classList.add('hidden');
        });
    }

    // ===========================================================
    // 19. MONITOR DE ASISTENCIA DIARIO (Tiempo Real e Histórico)
    // ===========================================================
    const tablaMonitorBody = document.getElementById('tablaMonitorBody');
    const fechaMonitorHoy = document.getElementById('fechaMonitorHoy');
    const inputFechaMonitor = document.getElementById('inputFechaMonitor');
    
    let monitorSnapshotUnsubscribe = null; // Variable para apagar el escuchador de Firebase    

    // --- FUNCION PRINCIPAL: Cargar el Monitor ---
    window.cargarMonitorDiario = async function(fechaSeleccionadaStr = null) {
        if (!tablaMonitorBody) return;

        const ahora = new Date(); // La hora REAL en este momento
        let fechaMonitor;
        
        // 1. Determinar qué fecha vamos a consultar
        if (fechaSeleccionadaStr) {
            fechaMonitor = new Date(fechaSeleccionadaStr + "T00:00:00");
        } else {
            fechaMonitor = new Date();
            const year = fechaMonitor.getFullYear();
            const month = String(fechaMonitor.getMonth() + 1).padStart(2, '0');
            const day = String(fechaMonitor.getDate()).padStart(2, '0');
            fechaSeleccionadaStr = `${year}-${month}-${day}`;
        }

        // Sincronizar el input visual
        if (inputFechaMonitor && inputFechaMonitor.value !== fechaSeleccionadaStr) {
            inputFechaMonitor.value = fechaSeleccionadaStr;
        }

        const inicioDia = new Date(fechaMonitor.getFullYear(), fechaMonitor.getMonth(), fechaMonitor.getDate(), 0, 0, 0);
        const finDia = new Date(fechaMonitor.getFullYear(), fechaMonitor.getMonth(), fechaMonitor.getDate(), 23, 59, 59);

        const opcionesFecha = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        fechaMonitorHoy.textContent = `Asistencia: ${fechaMonitor.toLocaleDateString('es-MX', opcionesFecha)}`;

        // 2. Obtener empleados activos
        const empleadosData = {};
        try {
            const snapshotEmpleados = await db.collection('empleados').where('estatus', '==', 'activo').get();
            snapshotEmpleados.forEach(doc => {
                empleadosData[doc.id] = { ...doc.data(), escaneos: [] };
            });
        } catch (error) {
            console.error("Error al cargar empleados:", error);
            return;
        }

        // --- Consultar Ajustes de Horario para la fecha seleccionada ---
        const ajustesMap = {};
        try {
            const snapshotAjustes = await db.collection('ajustesHorario')
                .where('fecha', '>=', firebase.firestore.Timestamp.fromDate(inicioDia))
                .where('fecha', '<=', firebase.firestore.Timestamp.fromDate(finDia))
                .get();
            
            snapshotAjustes.forEach(doc => {
                const ajuste = doc.data();
                ajustesMap[ajuste.empleadoID] = ajuste; // Guardamos el ajuste vinculado al ID del empleado
            });
        } catch (error) {
            console.error("Error al cargar ajustes de horario:", error);
        }

        // 3. APAGAR EL ESCUCHADOR ANTERIOR (Si existe)
        if (monitorSnapshotUnsubscribe) {
            monitorSnapshotUnsubscribe();
        }
        
        // 4. Encender el nuevo escuchador para la fecha seleccionada
        monitorSnapshotUnsubscribe = db.collection('registrosAsistencia')
            .where('fechaHora', '>=', firebase.firestore.Timestamp.fromDate(inicioDia))
            .where('fechaHora', '<=', firebase.firestore.Timestamp.fromDate(finDia))
            .orderBy('fechaHora', 'asc')
            .onSnapshot((snapshot) => {
                
                Object.keys(empleadosData).forEach(id => {
                    empleadosData[id].escaneos = [];
                    empleadosData[id].ultimoEscaneoEsManual = false; 
                });

                snapshot.forEach(doc => {
                    const registro = doc.data();
                    if (empleadosData[registro.empleadoID]) {
                        empleadosData[registro.empleadoID].escaneos.push(registro.fechaHora.toDate());
                        
                        // Si el registro fue hecho a mano, encendemos la bandera
                        if (registro.fuente === 'registro_manual') {
                            empleadosData[registro.empleadoID].ultimoEscaneoEsManual = true;
                        } else {
                            empleadosData[registro.empleadoID].ultimoEscaneoEsManual = false;
                        }
                    }
                });

                tablaMonitorBody.innerHTML = '';
                const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
                const diaActualStr = diasSemana[fechaMonitor.getDay()];

                const empleadosArray = Object.entries(empleadosData).map(([id, datos]) => ({ id, ...datos }));
                empleadosArray.sort((a, b) => a.nombre.localeCompare(b.nombre));

            // --- Consultar Días de Descanso Obligatorio ---
            // Lo hacemos fuera del ciclo para no saturar la base de datos
            db.collection('diasDescansoObligatorio').get().then(snapshotDescansos => {
                    const descansosArray = [];
                    snapshotDescansos.forEach(doc => descansosArray.push(doc.data()));

                empleadosArray.forEach(emp => {
                    // Si la fecha del monitor de registro diario es menor a su contratacion, sale de la funcion
                    const fechaIngresoEmp = new Date(emp.fechaIngreso + "T00:00:00");
                    if (fechaMonitor < fechaIngresoEmp) return; 

                    // 1. Evaluar si hoy es Día de Descanso para este empleado
                    let esDescansoObligatorio = false;
                    let nombreDescanso = "";

                    for (const desc of descansosArray) {
                            const startDesc = desc.fechaInicio.toDate();
                            startDesc.setHours(0,0,0,0);
                            const endDesc = desc.fechaFin ? desc.fechaFin.toDate() : new Date(startDesc);
                            endDesc.setHours(23,59,59,999);
                            
                            if (fechaMonitor >= startDesc && fechaMonitor <= endDesc) {
                                const [y, m, day] = emp.fechaIngreso.split('-').map(Number);
                                const fechaIngresoObj = new Date(y, m - 1, day);
                                const unAnoDespues = new Date(fechaIngresoObj);
                                unAnoDespues.setFullYear(unAnoDespues.getFullYear() + 1);
                                const tieneUnAno = fechaMonitor >= unAnoDespues;

                                if (desc.criterioAplicacion === 'todos' ||
                                   (desc.criterioAplicacion === 'antiguedad_mayor_1' && tieneUnAno) ||
                                   (desc.criterioAplicacion === 'antiguedad_menor_1' && !tieneUnAno)) {
                                    esDescansoObligatorio = true;
                                    nombreDescanso = desc.descripcion;
                                    break;
                                }
                            }
                        }

                    // --- Logica de prioridad de horario (Ajuste vs Base) ---
                    let horarioHoy = null;
                    let esHorarioAjustado = false;

                    // Verificamos si existe un ajuste temporal para este empleado en el día consultado
                    if (typeof ajustesMap !== 'undefined' && ajustesMap[emp.id]) {
                        horarioHoy = ajustesMap[emp.id];
                        esHorarioAjustado = true;
                    } 
                    // Si no hay ajuste, tomamos su horario base normal
                    else if (emp.horario && emp.horario[diaActualStr]) {
                        horarioHoy = emp.horario[diaActualStr];
                    }                    
                    
                    // Si no trabaja hoy, no es festivo y no tiene escaneos, lo ignoramos
                    if (!horarioHoy && emp.escaneos.length === 0) return;

                    const tr = document.createElement('tr');
                    
                    // Formateamos el texto del horario para la tabla
                    let textoHorario = "No labora";
                    if (horarioHoy && horarioHoy.entrada) {
                        textoHorario = `${horarioHoy.entrada} a ${horarioHoy.salida}`;
                        // Si es un horario ajustado, agregamos una etiqueta visual aclaratoria
                        if (esHorarioAjustado) {
                            textoHorario += `<br><span class="texto-secundario">(Horario Ajustado)</span>`;
                        }
                    } else if (esDescansoObligatorio) {
                            textoHorario = `<span class="texto-secundario">Día Festivo</span>`;
                    }

                    let htmlEscaneos = '<ul class="lista-escaneos">';
                    if (emp.escaneos.length === 0) {
                        htmlEscaneos += '<li>Sin registros</li>';
                    } else {
                        emp.escaneos.forEach((fecha, index) => {
                            const horaStr = fecha.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                            htmlEscaneos += `<li>Escaneo ${index + 1}: <strong>${horaStr}</strong></li>`;
                        });
                    }
                    htmlEscaneos += '</ul>';

                    let claseEstatus = 'etq-gris';
                    let textoEstatus = 'No hay registro de asistencia';
                    const numEscaneos = emp.escaneos.length;
                    let botonAccion = `
                            <button class="btn-icon" title="Registrar Incidencia Manual">
                                <img src="recursos/icono-editar.svg" alt="Registrar">
                            </button>
                        `;                    
                                        
                    // 3. LÓGICA DE ESTATUS VISUAL
                        if (esDescansoObligatorio) {
                            if (numEscaneos === 0) {
                                claseEstatus = 'etq-gris';
                                textoEstatus = `Descanso: ${nombreDescanso}`;
                            } else {
                                claseEstatus = 'etq-morado';
                                textoEstatus = 'Asistencia en Día Libre';
                            }
                        } else if (!horarioHoy) {
                            if (numEscaneos > 0) {
                                claseEstatus = 'etq-morado';
                                textoEstatus = 'Asistencia en Día Libre';
                            }
                        } else {
                            // Lógica normal de turnos
                            if (numEscaneos === 1) {
                                claseEstatus = 'etq-verde';
                                textoEstatus = 'En turno';
                            } else if (numEscaneos === 2) {
                                if (emp.tipoJornada === 'continua_sin_descanso' || (horarioHoy && horarioHoy.omitirDescanso)) {
                                    claseEstatus = 'etq-azul';
                                    textoEstatus = 'Turno completado';
                                } else if (emp.ultimoEscaneoEsManual) {
                                    claseEstatus = 'etq-azul';
                                    textoEstatus = 'Turno completado';
                                } else {
                                    if (horarioHoy && horarioHoy.salida) {
                                        const [sH, sM] = horarioHoy.salida.split(':').map(Number);
                                        const finTurnoDate = new Date(fechaMonitor.getFullYear(), fechaMonitor.getMonth(), fechaMonitor.getDate(), sH, sM, 0);
                                        if (ahora > finTurnoDate) {
                                            claseEstatus = 'etq-azul';
                                            textoEstatus = 'Turno completado (Faltó escaneo de descanso)';
                                        } else {
                                            claseEstatus = 'etq-naranja';
                                            textoEstatus = 'En descanso';
                                        }
                                    } else {
                                        claseEstatus = 'etq-naranja';
                                        textoEstatus = 'En descanso';
                                    }
                                }
                            } else if (numEscaneos === 3) {
                                claseEstatus = 'etq-verde';
                                textoEstatus = 'Regresó de descanso';
                            } else if (numEscaneos >= 4) {
                                claseEstatus = 'etq-azul';
                                textoEstatus = 'Turno completado';
                            }
                    
                    
                            // Evaluación de faltas automaticas y salidas omitidas
                            if (horarioHoy && horarioHoy.salida) {
                                const [salHora, salMin] = horarioHoy.salida.split(':').map(Number);
                                const horaSalidaDate = new Date(fechaMonitor.getFullYear(), fechaMonitor.getMonth(), fechaMonitor.getDate(), salHora, salMin, 0);
                        
                        if (ahora > horaSalidaDate) {
                            if (numEscaneos === 0) {
                                claseEstatus = 'etq-rojo';
                                textoEstatus = 'Falta Injustificada';
                                // Al pasar horarioHoy, la falta se calcula con el horario ajustado
                                window.registrarFaltaAutomatica(emp, horarioHoy, fechaMonitor);
                            } else if (numEscaneos === 1 || numEscaneos === 3) {
                                claseEstatus = 'etq-rojo';
                                textoEstatus = 'Falta registro de salida';
                                
                                // Pasamos la hora oficial al modal para poder calcular la salida anticipada
                                botonAccion = `
                                    <button class="btn-secundario btn-auto btn-sm" onclick="abrirModalSalidaManual('${emp.id}', '${emp.nombre}', '${fechaSeleccionadaStr}', '${horarioHoy.salida}')">
                                        Registrar Salida
                                    </button>
                                `;
                            }
                        }
                    }
                }
                

                    tr.innerHTML = `
                        <td>
                            <strong>${emp.nombre}</strong>
                            <span class="texto-secundario">${emp.codigo || emp.id}</span>
                        </td>
                        <td>${textoHorario}</td>
                        <td>${htmlEscaneos}</td>
                        <td><span class="etq-estatus ${claseEstatus}">${textoEstatus}</span></td>
                        <td>${botonAccion}</td>
                    `;
                    tablaMonitorBody.appendChild(tr);
                });
            
            });

            }, (error) => {
                console.error("Error en el monitor:", error);
            });
    };    

    // Evento para cuando la Directora cambia la fecha en el input
    if (inputFechaMonitor) {
        inputFechaMonitor.addEventListener('change', (e) => {
            if (e.target.value) {
                cargarMonitorDiario(e.target.value);
            }
        });
    }

    configurarBuscador('buscadorMonitor', 'tablaMonitorBody');

    // ============================================
    // 20. REGISTRO MANUAL DE SALIDA 
    // ============================================
    let empleadoSalidaManualID = null;
    let nombreSalidaManualGlobal = null;
    let fechaSalidaManual = null;
    let horaSalidaOficialGlobal = null;

    window.abrirModalSalidaManual = function(idEmpleado, nombreEmpleado, fechaStr, horaOficial) {
        empleadoSalidaManualID = idEmpleado;
        nombreSalidaManualGlobal = nombreEmpleado;
        fechaSalidaManual = fechaStr;
        horaSalidaOficialGlobal = horaOficial;

        document.getElementById('nombreSalidaManual').textContent = nombreEmpleado;
        document.getElementById('modalSalidaManual').classList.remove('hidden');
    };

    const formSalidaManual = document.getElementById('formSalidaManual');
    if (formSalidaManual) {
        formSalidaManual.addEventListener('submit', async (e) => {
            e.preventDefault();
            const horaInput = document.getElementById('horaSalidaManual').value;
            const btnSubmit = e.target.querySelector('button[type="submit"]');
            
            btnSubmit.disabled = true;
            btnSubmit.textContent = "Registrando...";

            try {
                const fechaCompleta = new Date(`${fechaSalidaManual}T${horaInput}:00`);
                
                // ¡LA SOLUCIÓN AL ERROR 400! Doble protección para el correo
                const usuarioActual = firebase.auth().currentUser;
                const correoAdmin = (usuarioActual && usuarioActual.email) ? usuarioActual.email : document.getElementById('userNameDisplay').textContent;

                // 1. AUDITORÍA: Verificar si la salida manual es anticipada
                if (horaSalidaOficialGlobal) {
                    const [salHora, salMin] = horaSalidaOficialGlobal.split(':').map(Number);
                    const horaOficialDate = new Date(`${fechaSalidaManual}T${horaSalidaOficialGlobal}:00`);
                    
                    if (fechaCompleta < horaOficialDate) {
                        const diffMilisegundos = horaOficialDate - fechaCompleta;
                        const minutosAnticipados = Math.floor(diffMilisegundos / (1000 * 60));

                        if (minutosAnticipados > 0) {
                            await db.collection('incidencias').add({
                                empleadoID: empleadoSalidaManualID,
                                empleadoNombre: nombreSalidaManualGlobal,
                                tipoIncidencia: 'salida_anticipada',
                                fechaInicio: firebase.firestore.Timestamp.fromDate(fechaCompleta),
                                horasAfectadas: minutosAnticipados,
                                autorizantes: correoAdmin, // Usamos la variable protegida
                                motivo: `Salida manual registrada temprano. Se retiró ${formatearMinutos(minutosAnticipados)} antes de su hora oficial (${horaSalidaOficialGlobal}).`,
                                estatus: 'aprobada', 
                                fechaCreacion: firebase.firestore.FieldValue.serverTimestamp(),
                                registradoPor: correoAdmin // Usamos la variable protegida
                            });
                        }
                    }
                }

                // 2. Guardar el registro de asistencia
                await db.collection('registrosAsistencia').add({
                    empleadoID: empleadoSalidaManualID,
                    fechaHora: firebase.firestore.Timestamp.fromDate(fechaCompleta),
                    tipoEvento: 'registro',
                    fuente: 'registro_manual',
                    registradoPor: correoAdmin 
                });

                alert("Salida registrada exitosamente.");

                document.getElementById('modalSalidaManual').classList.add('hidden');
                document.getElementById('formSalidaManual').reset();
                
            } catch (error) {
                console.error("Error al registrar salida manual:", error);
                alert("Ocurrió un error al guardar el registro.");
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.textContent = "Registrar Salida";
            }
        });
    }

    // ============================================
    // 21. GESTIÓN DE DÍAS DE DESCANSO OBLIGATORIO
    // ============================================
    const vistaListaDescansos = document.getElementById('vistaListaDescansos');
    const vistaFormularioDescanso = document.getElementById('vistaFormularioDescanso');
    const btnMostrarFormDescanso = document.getElementById('btnMostrarFormDescanso');
    const btnVolverListaDescansos = document.getElementById('btnVolverListaDescansos');
    const formRegistroDescanso = document.getElementById('formRegistroDescanso');
    const tablaDescansosBody = document.getElementById('tablaDescansosBody');

    // --- A. Sub-navegación ---
    if (btnMostrarFormDescanso && btnVolverListaDescansos) {
        btnMostrarFormDescanso.addEventListener('click', () => {
            formRegistroDescanso.reset();
            vistaListaDescansos.classList.add('hidden');
            vistaFormularioDescanso.classList.remove('hidden');
        });

        btnVolverListaDescansos.addEventListener('click', () => {
            vistaFormularioDescanso.classList.add('hidden');
            vistaListaDescansos.classList.remove('hidden');
        });
    }

    // --- B. Guardar Descanso en Firestore ---
    if (formRegistroDescanso) {
        formRegistroDescanso.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnSubmit = formRegistroDescanso.querySelector('button[type="submit"]');
            
            const fechaInicioStr = document.getElementById('descFechaInicio').value;
            const fechaFinStr = document.getElementById('descFechaFin').value;

            // Validación de fechas lógicas
            if (fechaFinStr && new Date(fechaFinStr) < new Date(fechaInicioStr)) {
                alert("La Fecha de Fin no puede ser anterior a la Fecha de Inicio.");
                return;
            }

            btnSubmit.disabled = true;
            btnSubmit.textContent = "Guardando...";

            try {
                const descansoData = {
                    fechaInicio: firebase.firestore.Timestamp.fromDate(new Date(fechaInicioStr + "T00:00:00")),
                    tipo: document.getElementById('descTipo').value,
                    criterioAplicacion: document.getElementById('descCriterio').value,
                    descripcion: document.getElementById('descDescripcion').value.trim(),
                    fechaRegistro: firebase.firestore.FieldValue.serverTimestamp(),
                    registradoPor: auth.currentUser.email
                };

                if (fechaFinStr) {
                    descansoData.fechaFin = firebase.firestore.Timestamp.fromDate(new Date(fechaFinStr + "T23:59:59"));
                }

                await db.collection('diasDescansoObligatorio').add(descansoData);
                
                alert("Día de descanso registrado exitosamente.");
                btnVolverListaDescansos.click();

            } catch (error) {
                console.error("Error al guardar descanso:", error);
                alert("Ocurrió un error al guardar el registro.");
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.textContent = "Guardar Descanso";
            }
        });
    }

    // --- C. Cargar y Mostrar Descansos  ---
    window.cargarDescansos = function() {
        if (!tablaDescansosBody) return;

        // Ordenamos por fecha de inicio para ver los más recientes primero
        db.collection('diasDescansoObligatorio').orderBy('fechaInicio', 'desc').onSnapshot((consulta) => {
            tablaDescansosBody.innerHTML = ''; 

            if (consulta.empty) {
                tablaDescansosBody.innerHTML = `<tr><td colspan="5" class="table-empty-state">No hay días de descanso registrados.</td></tr>`;
                return;
            }

            consulta.forEach((doc) => {
                const desc = doc.data();
                const tr = document.createElement('tr');
                
                // Formateo de fechas
                const fechaInicioObj = desc.fechaInicio.toDate();
                let fechaTexto = fechaInicioObj.toLocaleDateString('es-MX');
                if (desc.fechaFin) {
                    const fechaFinObj = desc.fechaFin.toDate();
                    fechaTexto += ` al ${fechaFinObj.toLocaleDateString('es-MX')}`;
                }

                // Formateo de textos para la interfaz
                const tipoTexto = desc.tipo.replace(/_/g, ' ').toUpperCase();
                const criterioTexto = desc.criterioAplicacion.replace(/_/g, ' ').toUpperCase();

                tr.innerHTML = `
                    <td><strong>${fechaTexto}</strong></td>
                    <td>${desc.descripcion}</td>
                    <td>${tipoTexto}</td>
                    <td style="font-size: 12px;">${criterioTexto}</td>
                    <td>
                        <button class="btn-icon icon-danger" onclick="eliminarDescanso('${doc.id}')" title="Eliminar">
                            <img src="recursos/icono-baja.svg" alt="Eliminar">
                        </button>
                    </td>
                `;
                tablaDescansosBody.appendChild(tr);
            });
        }, (error) => {
            console.error("Error al cargar descansos:", error);
        });
    };

    // --- D. Eliminar Descanso ---
    window.eliminarDescanso = async function(id) {
        const confirmar = confirm("¿Estás seguro de eliminar este día de descanso?\n\nSi lo eliminas, el sistema dejará de proteger las asistencias de ese día.");
        if (!confirmar) return;

        try {
            await db.collection('diasDescansoObligatorio').doc(id).delete();
        } catch (error) {
            console.error("Error al eliminar descanso:", error);
            alert("Ocurrió un error al intentar eliminar el registro.");
        }
    };

    // ============================================
    // 22. GESTIÓN DE AJUSTES DE HORARIO
    // ============================================
    const vistaListaAjustes = document.getElementById('vistaListaAjustes');
    const vistaFormularioAjuste = document.getElementById('vistaFormularioAjuste');
    const btnMostrarFormAjuste = document.getElementById('btnMostrarFormAjuste');
    const btnVolverListaAjustes = document.getElementById('btnVolverListaAjustes');
    const formRegistroAjuste = document.getElementById('formRegistroAjuste');
    const selectAjusteEmpleado = document.getElementById('ajusteEmpleado');
    const tablaAjustesBody = document.getElementById('tablaAjustesBody');

    let ajusteEditandoID = null;

    // --- A. Sub-navegación y Carga de Empleados ---
    if (btnMostrarFormAjuste && btnVolverListaAjustes) {
        btnMostrarFormAjuste.addEventListener('click', async () => {
            formRegistroAjuste.reset();
            ajusteEditandoID = null;
            document.getElementById('tituloFormAjuste').textContent = "Registrar Ajuste de Horario";
            formRegistroAjuste.querySelector('button[type="submit"]').textContent = "Guardar Ajuste";
            
            vistaListaAjustes.classList.add('hidden');
            vistaFormularioAjuste.classList.remove('hidden');
            
            try {
                const snapshot = await db.collection('empleados').where('estatus', '==', 'activo').orderBy('nombre', 'asc').get();
                selectAjusteEmpleado.innerHTML = '<option value="">Seleccione un empleado...</option>';
                snapshot.forEach(doc => {
                    const emp = doc.data();
                    selectAjusteEmpleado.innerHTML += `<option value="${doc.id}" data-nombre="${emp.nombre}">${emp.nombre} (${emp.codigo})</option>`;
                });
            } catch (error) {
                console.error("Error al cargar empleados para ajustes:", error);
            }
        });

        btnVolverListaAjustes.addEventListener('click', () => {
            vistaFormularioAjuste.classList.add('hidden');
            vistaListaAjustes.classList.remove('hidden');
        });
    }

    // --- B. Guardar Ajuste de horario y Validacion---
    if (formRegistroAjuste) {
        formRegistroAjuste.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnSubmit = formRegistroAjuste.querySelector('button[type="submit"]');
            
            const empleadoID = selectAjusteEmpleado.value;
            const fechaStr = document.getElementById('ajusteFecha').value;
            const entradaStr = document.getElementById('ajusteEntrada').value;
            const salidaStr = document.getElementById('ajusteSalida').value;
            const inicioDescansoStr = document.getElementById('ajusteInicioDescanso').value;
            const minDescanso = parseInt(document.getElementById('ajusteMinDescanso').value) || 0;

            if (entradaStr >= salidaStr) {
                alert("La hora de salida debe ser mayor a la hora de entrada.");
                return;
            }

            btnSubmit.disabled = true;
            btnSubmit.textContent = "Validando...";

            try {
                // 1. VALIDACIÓN RN-36: Comparar con el horario base
                const empDoc = await db.collection('empleados').doc(empleadoID).get();
                const empData = empDoc.data();
                
                const fechaObj = new Date(fechaStr + "T00:00:00");
                const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
                const diaStr = diasSemana[fechaObj.getDay()];

                // Calcular minutos del horario base para ese día
                let minutosBase = 0;
                if (empData.horario && empData.horario[diaStr] && empData.horario[diaStr].entrada) {
                    const hBase = empData.horario[diaStr];
                    const [eH, eM] = hBase.entrada.split(':').map(Number);
                    const [sH, sM] = hBase.salida.split(':').map(Number);
                    minutosBase = ((sH * 60) + sM) - ((eH * 60) + eM);
                    if (!hBase.omitirDescanso) {
                        minutosBase -= (hBase.duracionDescansoMinutos || 0);
                    }
                }

                // Calcular minutos del horario ajustado
                const [aEH, aEM] = entradaStr.split(':').map(Number);
                const [aSH, aSM] = salidaStr.split(':').map(Number);
                let minutosAjustados = ((aSH * 60) + aSM) - ((aEH * 60) + aEM);
                minutosAjustados -= minDescanso;

                // Aplicar la alerta de la RN-36
                if (minutosAjustados < minutosBase) {
                    const confirmar = confirm(`El horario ajustado suma ${formatearMinutos(minutosAjustados)}, lo cual es MENOR a su jornada habitual para este día (${formatearMinutos(minutosBase)}).\n\n¿Estás seguro de aplicar este ajuste?`);
                    if (!confirmar) {
                        btnSubmit.disabled = false;
                        btnSubmit.textContent = "Guardar Ajuste";
                        return; // Abortamos el guardado
                    }
                }

                // 2. Guardar en Firestore
                const opcionSeleccionada = selectAjusteEmpleado.options[selectAjusteEmpleado.selectedIndex];
                
                const ajusteData = {
                    empleadoID: empleadoID,
                    empleadoNombre: opcionSeleccionada.getAttribute('data-nombre'),
                    fecha: firebase.firestore.Timestamp.fromDate(fechaObj),
                    entrada: entradaStr,
                    salida: salidaStr,
                    inicioDescanso: inicioDescansoStr,
                    duracionDescansoMinutos: minDescanso,
                    motivo: document.getElementById('ajusteMotivo').value.trim(),
                    autorizantes: document.getElementById('ajusteAutorizantes').value.trim(),
                    fechaRegistro: firebase.firestore.FieldValue.serverTimestamp(),
                    registradoPor: auth.currentUser.email
                };

                if (ajusteEditandoID) {
                    await db.collection('ajustesHorario').doc(ajusteEditandoID).update(ajusteData);
                    alert("Ajuste actualizado exitosamente.");
                } else {
                    await db.collection('ajustesHorario').add(ajusteData);
                    alert("Ajuste registrado exitosamente.");
                }

                btnVolverListaAjustes.click();

            } catch (error) {
                console.error("Error al guardar ajuste:", error);
                alert("Ocurrió un error al guardar el registro.");
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.textContent = ajusteEditandoID ? "Actualizar Ajuste" : "Guardar Ajuste";
            }
        });
    }

    // --- C. Cargar y Mostrar Ajustes ---
    window.cargarAjustes = function() {
        if (!tablaAjustesBody) return;

        db.collection('ajustesHorario').orderBy('fecha', 'desc').onSnapshot((consulta) => {
            tablaAjustesBody.innerHTML = ''; 

            if (consulta.empty) {
                tablaAjustesBody.innerHTML = `<tr><td colspan="5" class="table-empty-state">No hay ajustes registrados.</td></tr>`;
                return;
            }

            consulta.forEach((doc) => {
                const ajuste = doc.data();
                const tr = document.createElement('tr');
                
                const fechaTexto = ajuste.fecha.toDate().toLocaleDateString('es-MX');
                const horarioTexto = `${ajuste.entrada} a ${ajuste.salida} (Descanso: ${ajuste.duracionDescansoMinutos} min)`;

                tr.innerHTML = `
                    <td><strong>${fechaTexto}</strong></td>
                    <td>
                        <strong>${ajuste.empleadoNombre}</strong>
                        <span class="texto-secundario">${ajuste.empleadoID}</span>
                    </td>
                    <td>${horarioTexto}</td>
                    <td style="font-size: 12px; max-width: 200px;">${ajuste.motivo}</td>
                    <td>
                        <button class="btn-icon" onclick="editarAjuste('${doc.id}')" title="Editar">
                            <img src="recursos/icono-editar.svg" alt="Editar">
                        </button>
                        <button class="btn-icon icon-danger" onclick="eliminarAjuste('${doc.id}')" title="Eliminar">
                            <img src="recursos/icono-baja.svg" alt="Eliminar">
                        </button>
                    </td>
                `;
                tablaAjustesBody.appendChild(tr);
            });
        }, (error) => {
            console.error("Error al cargar ajustes:", error);
        });
    };

    // --- D. Editar y Eliminar Ajustes ---
    window.editarAjuste = async function(id) {
        try {
            const doc = await db.collection('ajustesHorario').doc(id).get();
            if (!doc.exists) return;
            const ajuste = doc.data();
            
            ajusteEditandoID = id;

            const snapshot = await db.collection('empleados').where('estatus', '==', 'activo').orderBy('nombre', 'asc').get();
            selectAjusteEmpleado.innerHTML = '<option value="">Seleccione un empleado...</option>';
            snapshot.forEach(empDoc => {
                const emp = empDoc.data();
                selectAjusteEmpleado.innerHTML += `<option value="${empDoc.id}" data-nombre="${emp.nombre}">${emp.nombre} (${emp.codigo})</option>`;
            });

            document.getElementById('ajusteEmpleado').value = ajuste.empleadoID;
            
            const f = ajuste.fecha.toDate();
            document.getElementById('ajusteFecha').value = `${f.getFullYear()}-${String(f.getMonth()+1).padStart(2,'0')}-${String(f.getDate()).padStart(2,'0')}`;
            
            document.getElementById('ajusteEntrada').value = ajuste.entrada;
            document.getElementById('ajusteSalida').value = ajuste.salida;
            document.getElementById('ajusteInicioDescanso').value = ajuste.inicioDescanso || "";
            document.getElementById('ajusteMinDescanso').value = ajuste.duracionDescansoMinutos;
            document.getElementById('ajusteAutorizantes').value = ajuste.autorizantes || "";
            document.getElementById('ajusteMotivo').value = ajuste.motivo;

            document.getElementById('tituloFormAjuste').textContent = "Editar Ajuste de Horario";
            formRegistroAjuste.querySelector('button[type="submit"]').textContent = "Actualizar Ajuste";
            
            vistaListaAjustes.classList.add('hidden');
            vistaFormularioAjuste.classList.remove('hidden');

        } catch (error) {
            console.error("Error al cargar ajuste:", error);
        }
    };

    window.eliminarAjuste = async function(id) {
        const confirmar = confirm("¿Estás seguro de eliminar este ajuste de horario?\nEl empleado regresará a su horario base para ese día.");
        if (!confirmar) return;

        try {
            await db.collection('ajustesHorario').doc(id).delete();
        } catch (error) {
            console.error("Error al eliminar ajuste:", error);
            alert("Ocurrió un error al intentar eliminar el registro.");
        }
    };

    configurarBuscador('buscadorAjustes', 'tablaAjustesBody');

  //--
});