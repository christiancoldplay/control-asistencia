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
            cargarEmpleados();//carga la tabla de empleados
            cargarUsuarios();//carga la tabla de usuarios
        } else { //si no esta autenticado redirige al login (index.html)
            window.location.replace('index.html');
        }
    });

    // ============================================
    // 2. NAVEGACIÓN SPA (Single Page Application) Menú Lateral del panel de Administracion
    // ============================================
    // Aqui se implementa un sistema de navegacion que cambia el contenido visible sin recargar la pagina,
    // utilizando clases CSS para mostrar u ocultar secciones.
    const navItems = document.querySelectorAll('.nav-item');//Seleccion de todos los botones de menu lateral con clase indicada
    const contentSections = document.querySelectorAll('.content-section');//Seleccion de todas las secciones de contenido con la clase indicada

    navItems.forEach(button => {// itera sobre cada boton del menu lateral
        button.addEventListener('click', () => {//cada boton reacciona al detectar un click
            
            // A. Quita la clase 'active' de todos los botones
            navItems.forEach(btn => btn.classList.remove('active'));
            
            // B. Oculta todas las secciones quitando la clase 'active'
            contentSections.forEach(section => section.classList.remove('active'));
            
            // C. Agrega la clase 'active' al botón clickeado
            button.classList.add('active');
            
            // D. Muestra la sección correspondiente
            const targetId = button.getAttribute('data-target');//obtiene el valor del atributo data-target
            document.getElementById(targetId).classList.add('active');//busca el elemento con ese ID (targetID) en el HTML y le agrega la clase active
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
    // Controla el estado de los inputs de una fila cuando se marca o desmarca el checkbox
    // parametro: checkbox recibe el elemento html del checkbox que fue marcado/desmarcado
    function controlInputsHorario(checkbox) {
        // obtiene el elemento 'tr' (fila de tabla) padre mas cercano
        const fila = checkbox.closest('tr');
        // Selecciona todos los inputs de la fila que sean tipo time o number
        // time = campos de hora (entrada, salida, inicio descanso)
        // number = campo de minutos de descanso
        const inputs = fila.querySelectorAll('input[type="time"], input[type="number"]');
        // Recorre todos los inputs encontrados por fila
        inputs.forEach(input => {
            //cambia el valor de la propiedad disabled a false si el checkbox esta marcado, o bisceversa.
            input.disabled = !checkbox.checked;
            if (!checkbox.checked) input.value = ''; // Limpia el valor por seguridad de datos
        });
    }

    // Asignamos el evento 'change' a todos los checkboxes al cargar la página
    //busca en todo el documento html, todos los elementos html con la clase dia-checkbox
    //devuelve un nodeList con los checkboxes
    //forEach recorre uno por uno los checkboxes
    // cb es el parametro que representa el checkbox actual
    document.querySelectorAll('.dia-checkbox').forEach(cb => {
        //agrega un escuchador de eventos al checkbox
        //el evento change se dispara cuando el usuario marca o desmarca el checkbox
        //cuando pasa eso se ejecuta la funcion controlInputsHorario(cb)
        cb.addEventListener('change', () => controlInputsHorario(cb));
        controlInputsHorario(cb); // Ejecutamos una vez para inicializar el estado visual (gris)
    });

    // ===========================================
    // PROCESO PARA GUARDAR EMPLEADO EN FIRESTORE
    // ==========================================
    // se obtiene un objeto con todos los campos del formulario de registro. Metodos y propiedades que dan acceso a todos los campos del mismo.
    const formRegistroEmpleado = document.getElementById('formRegistroEmpleado');

    //--- Funcion para calcular las horas seleccionadas de la tabla horario del empleado ---
    function calcularHorasTabla() {
        let totalMinutos = 0;
        const filas = document.querySelectorAll('#tablaHorario tr');//todas las filas de tabla horario
        
        filas.forEach(fila => {//recorre cada fila
            const checkbox = fila.querySelector('.dia-checkbox');
            if (checkbox && checkbox.checked) {//verifica que el checkbox este marcado, sino itera
                const entrada = fila.querySelector('.hora-entrada').value;
                const salida = fila.querySelector('.hora-salida').value;
                const minDescanso = parseInt(fila.querySelector('.min-descanso').value) || 0;

                if (entrada && salida) {//verifica si hay datos en entrada y salida
                    const [entHora, entMin] = entrada.split(':').map(Number);
                    const [salHora, salMin] = salida.split(':').map(Number);
                    
                    const minutosEntrada = (entHora * 60) + entMin;//calcula la hora en entrada en minutos (number)
                    const minutosSalida = (salHora * 60) + salMin;//calcula la hora de salida en minutos
                    
                    let minutosTrabajados = minutosSalida - minutosEntrada;
                    minutosTrabajados -= minDescanso;//resta los minutos de descanso a los minutos trabajados
                    
                    if (minutosTrabajados > 0) {
                        totalMinutos += minutosTrabajados;//acumula los minutos a trabajados de toda la semana
                    }
                }
            }
        });
        return totalMinutos / 60;//calcula el total de horas a laborar en la semana segun la tabla de horario
    }

    // --- Funcion para construir el objeto Map del Horario ---
    function obtenerHorarioFormulario() {
        const horario = {};
        const filas = document.querySelectorAll('#tablaHorario tr');
        
        filas.forEach(fila => {
            const checkbox = fila.querySelector('.dia-checkbox');
            if (checkbox && checkbox.checked) {
                const dia = checkbox.value;
                horario[dia] = {//inicia construccion del objeto horario con sus claves y valores respectivas por dia seleccionado
                    entrada: fila.querySelector('.hora-entrada').value,
                    salida: fila.querySelector('.hora-salida').value,
                    inicioDescanso: fila.querySelector('.hora-descanso').value || "",
                    duracionDescansoMinutos: parseInt(fila.querySelector('.min-descanso').value) || 0
                };
            }
        });
        return horario;//retorna el objeto horario completo del empleado
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

            // 2. Validacion de coincidencia entre horas definidas en jornada y las horas definidas en la tabla horario.
            // ambas deben coincidir para evitar inconsistencia en las horas que debe laborar el empleado
            const jornadaSeleccionada = parseFloat(document.getElementById('empJornada').value);
            const horasCalculadas = calcularHorasTabla();
            
            if (horasCalculadas !== jornadaSeleccionada) {
                alert(`ERROR:\nHas seleccionado una jornada de ${jornadaSeleccionada} hrs semanales, pero el Horario Personalizado suma ${horasCalculadas} hrs. Es necesario que coincidan para poder realizar el registro.`);
                return; 
            }

            // 3. VALIDACIÓN DE DUPLICADOS EN FIRESTORE
            const codigo = document.getElementById('empCodigo').value.trim();
            const rfc = document.getElementById('empRFC').value.trim().toUpperCase();
            const curp = document.getElementById('empCURP').value.trim().toUpperCase();
            
            const errorDuplicado = await verificarDuplicados(codigo, rfc, curp, empleadoEditandoID);
            if (errorDuplicado) {
                alert(`ERROR AL GUARDAR!:\n${errorDuplicado}`);
                return;
            }

            // 3. Bloquear boton 'Guardar'
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

                // 4. Subir foto a FIREBASE STORAGE (Solo si seleccionaron una nueva)
                if (fotoFile) {
                    const storageRef = storage.ref(`empleados/${codigo}/${fotoFile.name}`);//crea una referencia en storage con ruta tipo "ej: empleados/EMP-001/foto.jpg"
                    const uploadTask = await storageRef.put(fotoFile);//sube el archivo a firebase storage
                    urlParaGuardar = await uploadTask.ref.getDownloadURL(); //actualiza el nuevo link (url) de la imagen nueva
                }

                // 5. Construccion del objeto "Empleado" para Firestore
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

                // 6. Guardar o Actualizar en Firestore
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
    const tablaEmpleadosBody = document.getElementById('tablaEmpleadosBody');//variable que referencia al elemento tbody de la tabla donde se muestran los empleados

    function cargarEmpleados() {
        if (!tablaEmpleadosBody) return;//si no existe la tabla, sale de la funcion

        // onSnapshot escucha la base de datos de Firestore en tiempo real
        db.collection('empleados').orderBy('nombre', 'asc').onSnapshot((querySnapshot) => {
            
            // Elimina el contenido actual de la tabla
            tablaEmpleadosBody.innerHTML = ''; 

            // Si no hay empleados en la base de datos, muestra mensaje y sale de la funcion 
            if (querySnapshot.empty) {
                tablaEmpleadosBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="table-empty-state">No hay empleados registrados aún.</td>
                    </tr>`;
                return;
            }

            // Recorremos cada empleado encontrado en Firestore 
            // - querySnapshot es un objeto que contiene el estado actual de todos los documentos de la coleccion empleados,
            //   tiene metodos para recorrer los documentos que contiene.
            querySnapshot.forEach((doc) => {
                const emp = doc.data();//doc.data devuelve un objeto con todos los campos del empleado
                const tr = document.createElement('tr');// Crea una nueva fila de tabla vacia

                //Extraccion y normalizacion de los datos del empleado
                const codigo = emp.codigo || doc.id; 
                const nombre = emp.nombre || 'Sin nombre registrado';
                const cargo = emp.cargo || 'Sin cargo';  
                const estatusDb = emp.estatus || 'inactivo'; 
                const estatusColor = estatusDb === 'activo' ? 'green' : 'red';
                const estatusTexto = estatusDb.charAt(0).toUpperCase() + estatusDb.slice(1);//hace mayuscula la primer letra de la palabra del estatus

                // -----------------------------------------------
                // Logica para mostrar el boton de alta o baja, de acuerdo al estatus del empleado
                // -----------------------------------------------
                let botonEstadoHTML = '';
                if (estatusDb === 'activo') {
                    // Si el estatus es activo, mostramos el botón rojo (baja) para "Dar de Baja"
                    botonEstadoHTML = `
                        <button class="btn-icon icon-danger" onclick="darDeBajaEmpleado('${doc.id}')" title="Dar de Baja">
                            <img src="recursos/icono-baja.svg" alt="Baja">
                        </button>`;
                } else {
                    // Si el estatus es inactivo, mostramos el botón verde (alta) para "Dar de Alta"
                    botonEstadoHTML = `
                        <button class="btn-icon icon-success" onclick="darDeAltaEmpleado('${doc.id}')" title="Reactivar Empleado">
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
                        <button class="btn-icon" onclick="editarEmpleado('${doc.id}')" title="Editar">
                            <img src="recursos/icono-editar.svg" alt="Editar">
                        </button>
                        <button class="btn-icon" onclick="verDetalles('${doc.id}')" title="Ver Detalles">
                            <img src="recursos/icono-ver.svg" alt="Ver">
                        </button>
                        <button class="btn-icon" onclick="mostrarCredencial('${doc.id}')" title="Ver Credencial">
                            <img src="recursos/icono-credencial.svg" alt="Credencial">
                        </button>
                        ${botonEstadoHTML} <!-- Aqui se define el color del boton rojo o verde de acuerdo al estatus del empleado (estatusDb) -->
                    </td>
                `;
                // Agregamos la fila creada a la tabla para que sea visible en la interfaz usando appenChild
                tablaEmpleadosBody.appendChild(tr);
            });

        }, (error) => {// -- manejo de errores --
            console.error("Error al cargar empleados:", error);
            tablaEmpleadosBody.innerHTML = `
                <tr>
                    <td colspan="5" class="table-empty-state" style="color: red;">
                        Error al cargar los datos. Verifica tus permisos.
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
            const filas = document.querySelectorAll('#tablaHorario tr');//obtiene todas las filas de la tabla horario del empleado
            filas.forEach(fila => {//recorre cada fila de la tabla horario
                const checkbox = fila.querySelector('.dia-checkbox');//busca en la fila un elemento con la clase 'dia-checkbox y devuelve la primer coincidencia
                const dia = checkbox.value;//obtiene el valor asignado en el atributo value y lo guarda en la variable 'dia'
                
                // Si el día existe en el horario guardado en Firebase marca el checkbox
                // y rellena los campos de hora de la fila actual
                if (emp.horario && emp.horario[dia]) {
                    checkbox.checked = true;
                    fila.querySelector('.hora-entrada').value = emp.horario[dia].entrada;
                    fila.querySelector('.hora-salida').value = emp.horario[dia].salida;
                    fila.querySelector('.hora-descanso').value = emp.horario[dia].inicioDescanso || "";
                    fila.querySelector('.min-descanso').value = emp.horario[dia].duracionDescansoMinutos || 0;
                } else {
                    // Si no trabaja ese día, desmarca el checkbox y limpia los campos de la fila del dia en turno
                    checkbox.checked = false;
                    fila.querySelector('.hora-entrada').value = "";
                    fila.querySelector('.hora-salida').value = "";
                    fila.querySelector('.hora-descanso').value = "";
                    fila.querySelector('.min-descanso').value = 0;
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
            const emp = doc.data();//contiene los datos del empleado indicado con el id

            const modalBody = document.getElementById('modalBodyDetalles');
            
            // Formatear el horario
            let horarioHTML = "<ul class='detalle-horario-lista'>";
            if (emp.horario) {
                for (const [dia, horas] of Object.entries(emp.horario)) {
                    horarioHTML += `<li><strong>${dia.toUpperCase()}:</strong> ${horas.entrada} a ${horas.salida} (Descanso: ${horas.duracionDescansoMinutos} min)</li>`;
                }
            }
            horarioHTML += "</ul>";
            //proteccion del estatus por si es undefined
            const estatusDb = emp.estatus || 'inactivo';

            // Inyeccion del HTML en el modal agrupado por secciones
            modalBody.innerHTML = `
                <div class="detalle-grid">
                    <div class="detalle-foto">
                        <img src="${emp.fotoURL || ''}" alt="Foto de ${emp.nombre}" onerror="this.src='recursos/sin-foto.svg'">
                        <!-- se usa la variable protegida estatusDb -->
                        <div class="detalle-estatus-contenedor">
                            <span class="estatus-${estatusDb} detalle-estatus-texto">${estatusDb.toUpperCase()}</span>
                        </div>
                    </div>

                    <div class="detalle-info">

                        <h4 class="detalle-seccion-titulo">Datos Personales</h4>
                        <p><strong>Código:</strong> ${emp.codigo}</p>
                        <p><strong>Nombre:</strong> ${emp.nombre}</p>
                        <p><strong>Email:</strong> ${emp.email}</p>
                        <p><strong>Teléfono:</strong> ${emp.telefono}</p>
                        <p><strong>RFC:</strong> ${emp.rfc}</p>
                        <p><strong>CURP:</strong> ${emp.curp}</p>
                        <p><strong>NSS(IMSS):</strong> ${emp.numIMSS}</p>

                        <h4 class="detalle-seccion-titulo">Datos Laborales</h4>
                        <p><strong>Departamento:</strong> ${emp.departamento}</p>
                        <p><strong>Cargo:</strong> ${emp.cargo}</p>
                        <p><strong>Fecha Ingreso:</strong> ${emp.fechaIngreso}</p>
                        <p><strong>Jornada:</strong> ${emp.jornada} hrs (${emp.tipoJornada})</p>
                        <p><strong>Saldo horas extra:</strong> ${emp.saldoHorasExtra || 0} hrs</p>                        
                        
                        <h4 class="detalle-seccion-titulo">Datos Bancarios</h4>
                        <p><strong>Banco:</strong> ${emp.banco}</p>
                        <p><strong>Cuenta:</strong> ${emp.cuenta}</p>
                        <p><strong>CLABE:</strong> ${emp.clabe}</p>

                        <h4 class="detalle-seccion-titulo">Horario Laboral</h4>
                        ${horarioHTML}
                        
                        <h4 class="detalle-seccion-titulo">Observaciones</h4>
                        <p>${emp.observaciones || ''}</p>                        
                        
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
            e.preventDefault(); // Evita recarga de la pagina 
            // --- Referencias al DOM (Variables locales al evento)
            const btnSubmit = formFiltrosReporte.querySelector('button[type="submit"]');
            const fechaInicioStr = document.getElementById('filtroFechaInicio').value;
            const fechaFinStr = document.getElementById('filtroFechaFin').value;
            const deptoSeleccionado = document.getElementById('filtroDepartamento').value;

            // 1. Validación de Fechas
            // La fecha de inicio no puede ser mayor a la fecha de fin
            if (new Date(fechaInicioStr) > new Date(fechaFinStr)) {
                alert("La Fecha de Inicio no puede ser mayor a la Fecha de Fin.");
                return;
            }

            // --- Feedback visual al usuario ---
            // Deshabilitamos el boton y cambiamos su texto para indicar que el proceso esta en ejecucion y evitar doble clic.
            btnSubmit.disabled = true;
            btnSubmit.textContent = "Calculando...";
            tablaReportesBody.innerHTML = '<tr><td colspan="8" class="table-empty-state">Analizando base de datos...</td></tr>';
            contenedorResultadosReporte.classList.remove('hidden');

            try {
                // --- 2. Preparar fechas para Firestore ---
                // - Convertir fechas de texto(string) a objetos Date de Firestore
                // - Concatenamos la hora para abarcar el día completo y evitar problemas de zona horaria.
                const fechaInicio = new Date(fechaInicioStr + "T00:00:00"); // JS lo interpreta como la hora de inicio del dia
                const fechaFin = new Date(fechaFinStr + "T23:59:59"); // JS lo interpreta como el ultimo segundo del dia (fin del dia)

                // --- 3. Consultar empleados --- 
                // - consultamos empleados con estatus activo
                let consultaEmpleados = db.collection('empleados').where('estatus', '==', 'activo');
                // - si el usuario selecciono un departamento especifico, se filtra por el seleccionado
                if (deptoSeleccionado !== 'todos') {
                    consultaEmpleados = consultaEmpleados.where('departamento', '==', deptoSeleccionado);
                }
                // - ejecutamos la consulta en Firestore
                const snapshotEmpleados = await consultaEmpleados.get();
                // - si no hay empleados activos, se muestra mensaje y sale de la funcion
                if (snapshotEmpleados.empty) {
                    tablaReportesBody.innerHTML = '<tr><td colspan="8" class="table-empty-state">No se encontraron empleados activos para estos filtros.</td></tr>';
                    return;
                }

                // --- 4. Crear el "Diccionario" en memoria ---
                // usamos el objeto reporteData para agrupar los datos de cada empleado en objetos (uno por cada empleado).
                // Estructura: { empleadoID { nombre:valor, departamento:valor, retardos:valor,...}}
                const reporteData = {};
                snapshotEmpleados.forEach(doc => {
                    const emp = doc.data();
                    reporteData[doc.id] = {
                        nombre: emp.nombre,
                        departamento: emp.departamento,
                        faltas: 0,
                        retardos: 0,
                        vacaciones: 0,
                        permisos: 0,
                        horasLaboradas: 0 // PENDIENTE DE IMPLEMENTACION
                    };
                });

                // --- 5. Consultar incidencias de documentos en Firestore en el rango de fechas seleccionado por el usuario ---
                const snapshotIncidencias = await db.collection('incidencias')
                    .where('fechaInicio', '>=', firebase.firestore.Timestamp.fromDate(fechaInicio))
                    .where('fechaInicio', '<=', firebase.firestore.Timestamp.fromDate(fechaFin))
                    .get();

                // --- 6. Cruzar los datos (Sumar incidencias a cada empleado segun corresponda)
                // se recorre cada incidencia, y si el empleado (empID) esta en el diccionario(reporteData), se suma +1 al tipo de incidencia que corresponda
                snapshotIncidencias.forEach(doc => {
                    const incidencia = doc.data();
                    const empID = incidencia.empleadoID;
                    
                    // Solo sumamos si el empleado (empID) está en el diccionario reporteData
                    if (reporteData[empID]) {
                        const tipo = incidencia.tipoIncidencia;
                        
                        if (tipo === 'falta_injustificada' || tipo === 'falta_justificada') {
                            reporteData[empID].faltas++;
                        } else if (tipo === 'retardo_injustificado' || tipo === 'retardo_justificado') {
                            reporteData[empID].retardos++;
                        } else if (tipo === 'vacaciones') {
                            reporteData[empID].vacaciones++;
                        } else if (tipo === 'permiso_con_goce' || tipo === 'permiso_sin_goce') {
                            reporteData[empID].permisos++;
                        }
                    }
                });

                // --- 7. Definicion de la tabla  de reporte ---
                // - limpiamos la tabla
                tablaReportesBody.innerHTML = '';
                
                // Convertir el diccionario a un Array para poder ordenarlo alfabéticamente
                // - Object.entries(reporteData) convierte un objeto en un array de pares [clave, valor]. 
                // EJ: [ [ id (clave), {propiedad1: valor, propiedad2: valor, ...}]]
                // - .map(([id, datos]) => ({ id, ...datos })) transforma cada par clave, valor en un objeto plano, combina el ID y los datos 
                // se obtiene un array de objetos. 
                // EJ: [ {id:valor, propiedad1:valor, propiedad2:valor,...}, { id2:valor, propiedad1:valor, propiedad2:valor,...} ]
                const empleadosArray = Object.entries(reporteData).map(([id, datos]) => ({ id, ...datos }));
                empleadosArray.sort((a, b) => a.nombre.localeCompare(b.nombre));

                // por cada empleado creamos una fila
                empleadosArray.forEach(emp => {
                    const tr = document.createElement('tr');
                    
                    // Resalta toda la fila si el empleado tiene 3 o mas faltas
                    if (emp.faltas >= 3) {
                        tr.classList.add('alerta-faltas');
                    }

                    // Dibujar la tabla con los resultados del reporte
                    // - se genera una fila (<tr>) por cada empleado y se agrega al cuerpo de la tabla (<tbody>)
                    // - cada fila contiene: nombre, departamento, contadores de incidencias y un boton para ver detalles.
                    tr.innerHTML = `
                        <td><strong>${emp.nombre}</strong></td>
                        <td>${emp.departamento}</td>
                        <td class="${emp.faltas >= 3 ? 'alerta-texto' : ''}">${emp.faltas}</td> <!-- muestra el numero de faltas y lo resalta en rojo si es mayor a 3 -->
                        <td>${emp.retardos}</td>
                        <td>${emp.vacaciones}</td>
                        <td>${emp.permisos}</td>
                        <td>--:-- hrs</td> <!-- Pendiente -->
                        <td>
                            <button class="btn-icon" onclick="verDetallesReporte('${emp.id}')" title="Ver Detalle">
                                <img src="recursos/icono-ver.svg" alt="Detalles">
                            </button>
                        </td>
                    `;
                    // agrega la fila al final del <tbody>
                    tablaReportesBody.appendChild(tr);
                });

                // Actualizar el título de la tarjeta agregando el rango de fechas filtrado
                tituloResultadosPeriodo.textContent = `Resultados: ${fechaInicioStr} al ${fechaFinStr}`;

            } catch (error) {
                // --- Manejo de errores ---
                console.error("Error al generar reporte:", error);
                alert("Ocurrió un error al calcular los datos. Revisa la consola.");
                tablaReportesBody.innerHTML = '<tr><td colspan="8" class="table-empty-state estatus-inactivo">Error al generar el reporte.</td></tr>';
            } finally {
                // Restaurar el botón
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
    window.verDetallesReporte = async function(idEmpleado) {
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

            // Si no hay incidencias en el periodo, mostramos un mensaje
            if (snapshotIncidencias.empty) {
                contenedorIncidencias.innerHTML = '<p class="table-empty-state">No hay incidencias registradas en este periodo.</p>';
            } else {
                // -- 6. Agrupar incidencias por tipo --
                // creamo un objeto vacio para agrupar las incidencias
                const incidenciasAgrupadas = {};
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
                });
                
                // --- 7. Generar el HTML agrupado para mostrar ---
                // Object(entries) es un metodo JS que convierte un objeto en un array de pares [clave, valor]
                // asi obtenemos un array con varios elementos con la estructura:
                // [ ['clave1', [{tipo1:valor, fecha:valor}, {tipo2:valor, fecha:valor}]], ['clave2',[{...},{...}]],... ]
                for (const [tipo, lista] of Object.entries(incidenciasAgrupadas)) {
                    // formatear el titulo del tipo, reemplazamos guion bajo por espacio. Es mas legible.
                    // (ej. "falta_injustificada" -> "falta injustificada")
                    const tituloTipo = tipo.replace(/_/g, ' ');

                    // Construccion del HTML del grupo
                    // Iniciamos el HTML con el titulo del tipo y el numero de incidencias
                    let htmlGrupo = `<h4 class="reporte-tipo-titulo">${tituloTipo} (${lista.length})</h4>`;
                    htmlGrupo += `<ul class="reporte-lista">`;// abrimos la lista

                    // Recorremos cada incidencia del grupo
                    lista.forEach(inc => {
                        // convertimos la fecha (Timestamp/Firestore) a objeto Date
                        const fechaObj = inc.fechaInicio.toDate();
                        // formeateamos la fecha al formato DD/MM/YYYY
                        const fechaFormateada = fechaObj.toLocaleDateString('es-MX');
                        // obtenemos el motivo de la incidencia o un mensaje 
                        const motivo = inc.motivo || 'Sin motivo registrado';
                        // mostramos las horas afectadas o 'N/A' si no hay
                        const horas = inc.horasAfectadas ? `${inc.horasAfectadas} hrs afectadas` : 'N/A';

                        // -- Construir la tarjeta de la incidencia --
                        // creamos una tajeta individual para cada incidencia
                        htmlGrupo += `
                            <li class="reporte-item">
                                <div class="reporte-item-header">
                                    <span>Fecha: ${fechaFormateada}</span>
                                    <span class="badge-horas">${horas}</span>
                                </div>
                                <div class="reporte-item-motivo">Motivo: ${motivo}</div>
                            </li>
                        `;
                    });

                    htmlGrupo += `</ul>`; // cerramos la lista 
                    // agregamos el HTML del grupo al contenedor de incidencias
                    contenedorIncidencias.innerHTML += htmlGrupo;
                }
            }

            // -- 8. Mostrar el Modal --
            // removemos la clase hidden del modal para hacerlo visible
            document.getElementById('modalDetallesReporte').classList.remove('hidden');

        } catch (error) {
            // -- Manejo de errores --
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

    // --- Exportar a formato CSV (compatible con Excel, Google Sheets,...) ---
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
            // formato vertical (p), milímetros (mm), tamaño carta(letter)
            const { jsPDF } = window.jspdf;
            const documentoPDF = new jsPDF('p', 'mm', 'letter');
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

            // -- 4. Convertir la tabla HTML a tabla PDF y dibujarla. --
            // Usamos el plugin autoTable de jsPDF para convertir la tabla HTML a tabla PDF y dibujarla.
            documentoPDF.autoTable({
                // autoTable buscara la tabla con ese selector
                html: '#contenedorResultadosReporte .admin-table',
                startY: 35, // posicion donde comenzara la tabla (35mm desde arriba)
                theme: 'striped', //alterna colores entre filas para mejorar legibilidad
                headStyles: { fillColor: [26, 58, 92] }, // Personalizacion del encabezado de la tabla
                // Especificamos manualmente las columnas que se quieren mostrar en el PDF
                // Omitimos la columna de acciones (acciones) porque no tiene sentido en el PDF, solo en la interfaz web.
                columns: [
                    { header: 'Empleado', dataKey: 0 },
                    { header: 'Depto.', dataKey: 1 },
                    { header: 'Faltas', dataKey: 2 },
                    { header: 'Retardos', dataKey: 3 },
                    { header: 'Vacaciones', dataKey: 4 },
                    { header: 'Permisos', dataKey: 5 },
                    { header: 'Horas Lab.', dataKey: 6 }
                ]
            });

            // Obtenemos la fecha y definimos el nombre del archivo PDF
            const fechaHoy = obtenerFechaDescarga();
            documentoPDF.save(`Reporte_Incidencias_Linguatec_${fechaHoy}.pdf`);
        });
    }


});