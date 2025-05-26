document.addEventListener('DOMContentLoaded', function() {
    console.log('form.js: DOMContentLoaded event triggered');
    const form = document.querySelector('.formulario');
    console.log('form.js: Form element found?', form);
    const errores = [];
    
    // Obtener el número de documento de la URL si existe
    const urlParams = new URLSearchParams(window.location.search);
    const docToEdit = urlParams.get('doc');
    console.log('form.js: Document number to edit from URL:', docToEdit);

    // Elementos específicos del formulario que pueden necesitar ser modificados
    const docInput = document.getElementById('doc');
    const docTipoSelect = document.getElementById('docTipo');
    const submitButton = form.querySelector('button[type="submit"]');
    
    // Función para mostrar mensajes al usuario
    function showMessage(message, isError = false) {
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: ${isError ? '#f44336' : '#4CAF50'};
            color: white;
            padding: 20px;
            border-radius: 5px;
            z-index: 1000;
            text-align: center;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            min-width: 300px;
        `;
        messageDiv.innerHTML = `
            <h3>${isError ? 'Error' : '¡Registro Exitoso!'}</h3>
            <p>${message}</p>
            ${!isError ? '<p>Redirigiendo al inicio...</p>' : ''}
        `;
        document.body.appendChild(messageDiv);

        if (!isError) {
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 2000);
        } else {
            // Remover el mensaje de error después de 5 segundos
            setTimeout(() => {
                messageDiv.remove();
            }, 5000);
        }
    }

    // Función para deshabilitar/habilitar el formulario
    function setFormEnabled(enabled) {
        const inputs = form.querySelectorAll('input, select, button');
        inputs.forEach(input => {
            input.disabled = !enabled;
        });
        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.textContent = enabled ? 'Enviar' : 'Enviando...';
        }
    }
    
    // Lógica para cargar datos si se va a modificar
    if (docToEdit) {
        console.log('form.js: Editing mode enabled for document:', docToEdit);
        // Deshabilitar la edición del número y tipo de documento
        if (docInput) docInput.disabled = true;
        if (docTipoSelect) docTipoSelect.disabled = true;
        // Cambiar texto del botón
        if (submitButton) submitButton.textContent = 'Actualizar Datos';

        // Cargar los datos de la persona
        async function loadPersonaData(docNumber) {
            console.log('form.js: Attempting to load data for document:', docNumber);
            try {
                const response = await fetch(`/api/personas/${docNumber}`);
                console.log('form.js: Load data response status:', response.status);
                if (!response.ok) {
                    if (response.status === 404) {
                         showMessage('Error: Persona no encontrada para modificar.', true);
                    } else {
                         showMessage('Error al cargar los datos para modificación.', true);
                    }
                   setFormEnabled(true); // Habilitar formulario para reintento o nuevo registro si es necesario
                   return null;
                }
                const personaData = await response.json();
                console.log('form.js: Loaded persona data:', personaData);
                return personaData;
            } catch (error) {
                console.error('form.js: Error loading persona data:', error);
                showMessage('Error de red al cargar datos para modificación.', true);
                setFormEnabled(true); // Habilitar formulario
                return null;
            }
        }

        // Función para rellenar el formulario
        function fillForm(data) {
            console.log('form.js: Filling form with data:', data);
            // Mapear y rellenar los campos
            document.getElementById('docTipo').value = data.tipo_documento === 'Cédula' ? 'CC' : 'TI';
            document.getElementById('doc').value = data.numero_documento;
            document.getElementById('primNombre').value = data.primer_nombre;
            document.getElementById('segNombre').value = data.segundo_nombre || '';
            document.getElementById('apellidos').value = data.apellidos;
            // La fecha necesita un formato 'YYYY-MM-DD'
            const fechaNac = new Date(data.fecha_nacimiento);
            const formattedDate = fechaNac.toISOString().split('T')[0];
            document.getElementById('fechaNac').value = formattedDate;

            document.getElementById('genero').value = data.genero === 'Masculino' ? 'M' : (data.genero === 'Femenino' ? 'F' : (data.genero === 'No binario' ? 'NB' : 'NR'));
            document.getElementById('email').value = data.email;
            document.getElementById('cel').value = data.celular;

            // Para la foto, si existe, podrías mostrarla o indicar que existe
            // document.getElementById('imagen_preview').src = data.foto_url; // Asumiendo que tienes un img tag para preview
        }

        // Cargar y rellenar al cargar la página
        loadPersonaData(docToEdit).then(personaData => {
            if (personaData) {
                fillForm(personaData);
                setFormEnabled(true); // Habilitar formulario solo después de cargar datos
            } else {
                 // Si falló la carga, dejar el formulario deshabilitado o redirigir
                 // showMessage ya maneja el mensaje de error
            }
        });

        // Modificar el event listener para el submit (usar PUT)
        form.removeEventListener('submit', async function(event) {}); // Remover el listener original (esto puede ser problemático si hay múltiples listeners, mejor usar un flag o lógica condicional dentro del listener original)

         // Mejorar: Manejar la lógica PUT/POST dentro del mismo listener original

    }

    // Modificación del event listener original para manejar PUT/POST
    form.addEventListener('submit', async function(event) {
        event.preventDefault();
        console.log('form.js: Form submit event triggered (modified)');
        errores.length = 0; // Limpiar errores anteriores

        // Determinar si es POST o PUT
        const isUpdate = !!docToEdit; // True si docToEdit tiene valor
        const method = isUpdate ? 'PUT' : 'POST';
        const url = isUpdate ? `/api/personas/${docToEdit}` : '/api/personas/';

        console.log(`form.js: Submitting with method: ${method} to URL: ${url}`);

        // Deshabilitar el formulario mientras se procesa
        setFormEnabled(false);
        
        console.log('form.js: Starting form data extraction and validation');
        // Obtener los valores del formulario
        const formData = {
            tipo_documento: document.getElementById('docTipo').value,
            numero_documento: document.getElementById('doc').value,
            primer_nombre: document.getElementById('primNombre').value,
            segundo_nombre: document.getElementById('segNombre').value || null,
            apellidos: document.getElementById('apellidos').value,
            fecha_nacimiento: document.getElementById('fechaNac').value,
            genero: document.getElementById('genero').value,
            email: document.getElementById('email').value,
            celular: document.getElementById('cel').value
        };

        // Validaciones
        if (!/^\d{1,10}$/.test(formData.numero_documento)) {
            errores.push("El número de documento debe ser numérico y no mayor a 10 caracteres");
        }

        if (!formData.primer_nombre || formData.primer_nombre.length > 30 || /^\d+$/.test(formData.primer_nombre)) {
            errores.push("El primer nombre es obligatorio, no debe ser numérico y debe tener máximo 30 caracteres");
        }

        if (formData.segundo_nombre && (formData.segundo_nombre.length > 30 || /^\d+$/.test(formData.segundo_nombre))) {
            errores.push("El segundo nombre no debe ser numérico y debe tener máximo 30 caracteres");
        }

        if (!formData.apellidos || formData.apellidos.length > 60 || /^\d+$/.test(formData.apellidos)) {
            errores.push("Los apellidos son obligatorios, no deben ser numéricos y deben tener máximo 60 caracteres");
        }

        if (!formData.fecha_nacimiento) {
            errores.push("La fecha de nacimiento es obligatoria");
        }

        if (!/^[\w.-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,}$/.test(formData.email)) {
            errores.push("El correo electrónico no es válido");
        }

        if (!/^\d{10}$/.test(formData.celular)) {
            errores.push("El número de celular debe tener exactamente 10 dígitos");
        }

        // Validar imagen si existe
        const imagen = document.getElementById('imagen').files[0];
        if (imagen && imagen.size > 2 * 1024 * 1024) {
            errores.push("La imagen no debe superar los 2MB");
        }

        // Si hay errores, mostrarlos y detener el envío
        if (errores.length > 0) {
            console.log('form.js: Validation errors found', errores);
            showMessage("Errores en el formulario:\n\n" + errores.join("\n"), true);
            setFormEnabled(true);
            return;
        }

        console.log('form.js: No validation errors, proceeding with fetch');
        try {
            // Crear FormData para enviar la imagen si existe
            const submitData = new FormData();
            submitData.append('persona', JSON.stringify(formData));
            if (imagen) {
                submitData.append('foto', imagen);
            }

            // Logs de depuración detallados
            console.log('=== INICIO DE ENVÍO DE DATOS ===');
            console.log('Datos del formulario:', formData);

            // Intentar el envío
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Accept': 'application/json',
                },
                body: submitData
            });

            console.log('=== RESPUESTA DEL SERVIDOR ===');
            console.log('Status:', response.status);
            console.log('Status Text:', response.statusText);

            let responseData;
            try {
                responseData = await response.json();
                console.log('Datos de respuesta:', responseData);
            } catch (e) {
                console.error('Error al parsear la respuesta JSON:', e);
                throw new Error('Error al procesar la respuesta del servidor');
            }

            if (!response.ok) {
                throw new Error(responseData.detail || `Error ${response.status}: ${response.statusText}`);
            }

            // Verificar que los datos se guardaron correctamente
            console.log('=== VERIFICANDO GUARDADO ===');
            const verifyResponse = await fetch(`/api/personas/${formData.numero_documento}`);
            console.log('Status de verificación:', verifyResponse.status);
            
            if (!verifyResponse.ok) {
                throw new Error('Error al verificar el guardado de datos');
            }

            const verifyData = await verifyResponse.json();
            console.log('Datos verificados:', verifyData);

            // Mostrar mensaje de éxito
            showMessage('Los datos se han guardado correctamente en la base de datos');

        } catch (error) {
            console.error('=== ERROR EN EL PROCESO ===');
            console.error('Error completo:', error);
            console.error('Stack trace:', error.stack);
            showMessage('Error al registrar la persona: ' + error.message, true);
            setFormEnabled(true);
        }
    });
}); 