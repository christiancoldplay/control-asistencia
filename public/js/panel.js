// ============================================
// panel.js - Lógica de la Interfaz del Dashboard
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    
    // ============================================
    // PROTECCIÓN DE RUTA (Auth Guard)
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
    // NAVEGACIÓN SPA (Single Page Application) Menú Lateral del panel de Administracion
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
    // CERRAR SESIÓN
    // ============================================
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            await logoutUser();
        });
    }

    // ===============================================================
    // INTERCAMBIO DE VISTAS: LISTA DE EMPLEADOS O FORMULARIO DE REGISTRO
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
            vistaFormularioEmpleado.classList.add('hidden');//oculta el formulario
            vistaListaEmpleados.classList.remove('hidden');//muestra la lista de empleados
            document.getElementById('formRegistroEmpleado').reset();//limpia todos los campos del formulario
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

    // ===============================================================================
    //                       PROCESO PARA GUARDAR EMPLEADO EN FIRESTORE
    // ===============================================================================
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

    // ===== SUBMIT DEL FORMULARIO ========
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

            // ======= (INTENTO DE GUARDAR EL EMPLEADO EN FIRESTORE) =========
            try { 
                const codigo = document.getElementById('empCodigo').value.trim();//codigo de empleado
                const fotoFile = document.getElementById('empFoto').files[0];//objeto File de la imagen que se selecciono en el registro (nombre, tamano, tipo, etc..)
                let fotoURL = "";

                // 4. Subir foto a FIREBASE STORAGE
                if (fotoFile) {
                    const storageRef = storage.ref(`empleados/${codigo}/${fotoFile.name}`);//crea una referencia en storage con ruta tipo "ej: empleados/EMP-001/foto.jpg"
                    const uploadTask = await storageRef.put(fotoFile);//sube el archivo a firebase storage
                    fotoURL = await uploadTask.ref.getDownloadURL(); //obtiene la URL publica de la imagen
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
                    fotoURL: fotoURL, 
                    
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
                    
                    estatus: 'activo',
                    saldoHorasExtra: 0,
                    qrCodeUrl: "", 
                    fechaRegistro: firebase.firestore.FieldValue.serverTimestamp()
                };

                // 6. Guardar en Firestore
                // Accede a la coleccion 'empleados' en firestore,usa el codigo del empleado como ID del documento
                // y guarda los datos. Si el ID existe, lo sobrescribe. 
                await db.collection('empleados').doc(codigo).set(empleadoData);

                alert("Empleado registrado exitosamente.");
                formRegistroEmpleado.reset();//limpia los campos del formulario posteior al registro
                
                // Oculta el formulario de registro y muestra la lista de empleados
                document.getElementById('vistaFormularioEmpleado').classList.add('hidden');
                document.getElementById('vistaListaEmpleados').classList.remove('hidden');

            } catch (error) { //captura cualquier error en el guardado del empleado en firestore
                console.error("Error al guardar empleado:", error);
                alert("Ocurrió un error al guardar: " + error.message);
            } finally { //siempre se ejecuta independientemente de errores
                // desbloquea el boton 'Guardar Empleado" (submit)
                btnSubmit.disabled = false;
                btnSubmit.textContent = "Guardar Empleado";
            }
        });
    }

    // ============================================
    // CARGAR Y MOSTRAR EMPLEADOS
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

            // Recorremos cada documento empleado encontrado en la coleccion empleados de Firestore                    
            querySnapshot.forEach((doc) => {// doc es un objeto con: doc.id = ID del documento (codigo de empleado)
                const emp = doc.data();// doc.data = Todos los campos del empleado
                
                // Creamos una nueva fila para cada empleado
                const tr = document.createElement('tr');

                // Formateo del color del estatus: activo = verde, inactivo = rojo
                const estatusColor = emp.estatus === 'activo' ? 'green' : 'red';
                // Hace mayuscula la primer letra del estatus y la adhiere a las demas letras que conforman la palabra del estatus
                const estatusTexto = emp.estatus.charAt(0).toUpperCase() + emp.estatus.slice(1); 

                // Construccion del HTML de una fila con 5 columnas
                tr.innerHTML = `
                    <td><strong>${emp.codigo}</strong></td>
                    <td>${emp.nombre}</td>
                    <td>${emp.cargo}</td>
                    <td style="color: ${estatusColor}; font-weight: bold;">${estatusTexto}</td>
                    <td>
                        <button class="btn-icon" onclick="editarEmpleado('${doc.id}')" title="Editar">
                            <img src="recursos/icono-editar.svg" alt="Editar">    
                        </button>
                        <button class="btn-icon" onclick="verDetalles('${doc.id}')" title="Ver Detalles">
                            <img src="recursos/icono-ver.svg" alt="Ver">
                        </button>
                    </td>
                `;
                
                // Agregamos la fila creada a la tabla para que sea visible en la interfaz
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

    // Funciones temporales para los botones editar y ver empleado
    window.editarEmpleado = function(id) {
        console.log("Editar empleado con ID:", id);
        alert("Funcion editar en construccion.");
    };

    window.verDetalles = function(id) {
        console.log("Ver detalles del empleado con ID:", id);
        alert("Funcion ver en construccion.");
    };



});