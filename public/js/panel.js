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
            cargarEmpleados();//carga la lista de empleados
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
                alert(`ERROR DE HORARIO:\nHas seleccionado ${jornadaSeleccionada} hrs, pero la tabla suma ${horasCalculadas} hrs.`);
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
                    
                    horario: obtenerHorarioFormulario()              
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
    const tablaEmpleadosBody = document.getElementById('tablaEmpleadosBody');//referencia a la tabla del elemento tbody de la tabla donde se muestran los empleados

    function cargarEmpleados() {
        if (!tablaEmpleadosBody) return;//si no existe la tabla, sale de la funcion

        // onSnapshot escucha la base de datos de Firestore en tiempo real
        db.collection('empleados').onSnapshot((querySnapshot) => {
            
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
            // querySnapshot es un objeto que contiene el resultado de la consulta a firestore (snapshot de la coleccion empleados)
            //tiene metodos para recorrer los documentos que contiene
            //forEach es un metodo que recorre cada documento dentro de querySnapshot
            //doc es un objeto que representa un documento individual de firestore
            querySnapshot.forEach((doc) => {
                const emp = doc.data();//Es un objeto con todos los campos del documento (empleado)
                const tr = document.createElement('tr');// Creamos una nueva fila para cada empleado

                //Si falta un dato, usamos un valor por defecto
                const codigo = emp.codigo || doc.id; // Si no hay campo código, mostramos el ID del documento (doc.id)
                const nombre = emp.nombre || 'Sin nombre registrado';
                const cargo = emp.cargo || 'Sin cargo';  
                // Protegemos el estatus por si un documento creado manualmente en firestore no lo tiene
                const estatusDb = emp.estatus || 'inactivo'; 
                const estatusColor = estatusDb === 'activo' ? 'green' : 'red';
                const estatusTexto = estatusDb.charAt(0).toUpperCase() + estatusDb.slice(1);

                // Construimos el HTML de las columnas
                tr.innerHTML = `
                    <td><strong>${codigo}</strong></td>
                    <td>${nombre}</td>
                    <td>${cargo}</td>
                    <td style="color: ${estatusColor}; font-weight: bold;">${estatusTexto}</td>
                    <td>
                        <button class="btn-icon" onclick="editarEmpleado('${doc.id}')" title="Editar">
                            <img src="recursos/icono-editar.svg" alt="Editar">
                        </button>
                        <button class="btn-icon" onclick="verDetalles('${doc.id}')" title="Ver Detalles">
                            <img src="recursos/icono-ver.svg" alt="Ver">
                        </button>
                        <button class="btn-icon" onclick="darDeBajaEmpleado('${doc.id}')" title="Dar de baja">
                            <img src="recursos/icono-eliminar.svg" alt="Baja" >
                        </button>
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
    // 8. DAR DE BAJA A UN EMPLEADO
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
            
            // Formatear el horario usando la clase CSS limpia
            let horarioHTML = "<ul class='detalle-horario-lista'>";
            if (emp.horario) {
                for (const [dia, horas] of Object.entries(emp.horario)) {
                    horarioHTML += `<li><strong>${dia.toUpperCase()}:</strong> ${horas.entrada} a ${horas.salida} (Descanso: ${horas.duracionDescansoMinutos} min)</li>`;
                }
            }
            horarioHTML += "</ul>";

            // Inyectar el HTML en el modal (Cero estilos en línea)
            modalBody.innerHTML = `
                <div class="detalle-grid">
                    <div class="detalle-foto">
                        <img src="${emp.fotoURL || ''}" alt="Foto de ${emp.nombre}" onerror="this.src='recursos/sin-foto.svg'">
                    </div>
                    <div class="detalle-info">
                        <p><strong>Código:</strong> ${emp.codigo}</p>
                        <p><strong>Nombre:</strong> ${emp.nombre}</p>
                        <p><strong>Cargo:</strong> ${emp.cargo} (${emp.departamento})</p>
                        <p><strong>Estatus:</strong> <span class="estatus-${emp.estatus}">${emp.estatus.toUpperCase()}</span></p>
                        <p><strong>Email:</strong> ${emp.email}</p>
                        <p><strong>Teléfono:</strong> ${emp.telefono}</p>
                        <p><strong>Jornada:</strong> ${emp.jornada} hrs (${emp.tipoJornada})</p>
                        
                        <hr class="detalle-separador">
                        
                        <p><strong>Horario Laboral:</strong></p>
                        ${horarioHTML}
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


});