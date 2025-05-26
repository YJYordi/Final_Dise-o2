document.addEventListener('DOMContentLoaded', async function() {
    console.log('update.js: DOMContentLoaded event triggered');
    const form = document.querySelector('.formulario');
    const urlParams = new URLSearchParams(window.location.search);
    const numeroDocumento = urlParams.get('doc');

    if (!numeroDocumento) {
        alert('No se proporcionó número de documento');
        window.location.href = '../index.html';
        return;
    }

    // Función para mostrar mensajes solo en actualización
    function showMessage(message, isError = false) {
        // Solo mostrar mensaje si es una actualización (no al cargar datos)
        if (!message.includes('cargar')) {
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
                <h3>${isError ? 'Error' : '¡Actualización Exitosa!'}</h3>
                <p>${message}</p>
                ${!isError ? '<p>Redirigiendo al inicio...</p>' : ''}
            `;
            document.body.appendChild(messageDiv);

            if (!isError) {
                setTimeout(() => window.location.href = '../index.html', 2000);
            } else {
                setTimeout(() => messageDiv.remove(), 5000);
            }
        }
    }

    try {
        // Verificar conexión con el backend
        console.log('update.js: Verificando conexión con el backend...');
        const testResponse = await fetch('/api/personas/test');
        console.log('update.js: Test response status:', testResponse.status);

        // Cargar datos de la persona
        console.log('update.js: Intentando cargar datos de la persona:', numeroDocumento);
        const response = await fetch(`/api/personas/${numeroDocumento}`);
        console.log('update.js: Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('update.js: Error response:', errorText);
            throw new Error(response.status === 404 ? 'Persona no encontrada' : `Error al consultar: ${response.status} - ${errorText}`);
        }

        const persona = await response.json();
        
        // Llenar el formulario silenciosamente
        document.getElementById('docTipo').value = persona.tipo_documento === 'Cédula' ? 'CC' : 'TI';
        document.getElementById('doc').value = persona.numero_documento;
        document.getElementById('primNombre').value = persona.primer_nombre;
        document.getElementById('segNombre').value = persona.segundo_nombre || '';
        document.getElementById('apellidos').value = persona.apellidos;
        document.getElementById('fechaNac').value = persona.fecha_nacimiento;
        document.getElementById('genero').value = persona.genero === 'Masculino' ? 'M' : 
                                                persona.genero === 'Femenino' ? 'F' : 
                                                persona.genero === 'No binario' ? 'NB' : 'NR';
        document.getElementById('email').value = persona.email;
        document.getElementById('cel').value = persona.celular;

        // Manejar el envío del formulario
        form.addEventListener('submit', async function(event) {
            event.preventDefault();
            console.log('update.js: Form submit event triggered');
            
            // Obtener y validar datos
            const formData = {
                tipo_documento: document.getElementById('docTipo').value,
                numero_documento: document.getElementById('doc').value,
                primer_nombre: document.getElementById('primNombre').value.trim(),
                segundo_nombre: document.getElementById('segNombre').value.trim() || null,
                apellidos: document.getElementById('apellidos').value.trim(),
                fecha_nacimiento: document.getElementById('fechaNac').value,
                genero: document.getElementById('genero').value,
                email: document.getElementById('email').value.trim(),
                celular: document.getElementById('cel').value.trim()
            };

            console.log('update.js: Datos del formulario:', formData);

            // Validaciones
            const errores = [];
            if (!/^\d{1,10}$/.test(formData.numero_documento)) 
                errores.push("El número de documento debe ser numérico y no mayor a 10 caracteres");
            if (!formData.primer_nombre || formData.primer_nombre.length > 30 || /^\d+$/.test(formData.primer_nombre)) 
                errores.push("El primer nombre es obligatorio, no debe ser numérico y debe tener máximo 30 caracteres");
            if (formData.segundo_nombre && (formData.segundo_nombre.length > 30 || /^\d+$/.test(formData.segundo_nombre))) 
                errores.push("El segundo nombre no debe ser numérico y debe tener máximo 30 caracteres");
            if (!formData.apellidos || formData.apellidos.length > 60 || /^\d+$/.test(formData.apellidos)) 
                errores.push("Los apellidos son obligatorios, no deben ser numéricos y deben tener máximo 60 caracteres");
            if (!formData.fecha_nacimiento) 
                errores.push("La fecha de nacimiento es obligatoria");
            if (!/^[\w.-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,}$/.test(formData.email)) 
                errores.push("El correo electrónico no es válido");
            if (!/^\d{10}$/.test(formData.celular)) 
                errores.push("El número de celular debe tener exactamente 10 dígitos");

            if (errores.length > 0) {
                alert('Errores en el formulario:\n\n' + errores.join('\n'));
                return;
            }

            try {
                // Deshabilitar formulario
                const submitButton = form.querySelector('button[type="submit"]');
                const originalText = submitButton.textContent;
                submitButton.textContent = 'Actualizando...';
                submitButton.disabled = true;

                // Preparar los datos para el backend
                const backendData = {
                    tipo_documento: formData.tipo_documento === 'CC' ? 'Cédula' : 'Tarjeta de identidad',
                    numero_documento: formData.numero_documento,
                    primer_nombre: formData.primer_nombre,
                    segundo_nombre: formData.segundo_nombre,
                    apellidos: formData.apellidos,
                    fecha_nacimiento: formData.fecha_nacimiento,
                    genero: formData.genero === 'M' ? 'Masculino' : 
                            formData.genero === 'F' ? 'Femenino' : 
                            formData.genero === 'NB' ? 'No binario' : 'Prefiero no reportar',
                    email: formData.email,
                    celular: formData.celular
                };

                // Crear FormData para enviar los datos y la imagen
                const formDataToSend = new FormData();
                formDataToSend.append('persona', JSON.stringify(backendData));
                
                const imagenInput = document.getElementById('imagen');
                if (imagenInput && imagenInput.files.length > 0) {
                    formDataToSend.append('foto', imagenInput.files[0]);
                }

                // Log de los datos que se enviarán
                console.log('update.js: Enviando datos:', {
                    url: `/api/personas/${numeroDocumento}`,
                    method: 'PUT',
                    data: backendData,
                    hasImage: imagenInput && imagenInput.files.length > 0
                });

                // Enviar la petición PUT
                const updateResponse = await fetch(`/api/personas/${numeroDocumento}`, {
                    method: 'PUT',
                    body: formDataToSend
                });

                console.log('update.js: Status de la respuesta:', updateResponse.status);
                const responseText = await updateResponse.text();
                console.log('update.js: Texto de la respuesta:', responseText);

                // Restaurar el botón antes de procesar la respuesta
                submitButton.textContent = originalText;
                submitButton.disabled = false;

                if (!updateResponse.ok) {
                    let errorMessage;
                    try {
                        const errorData = JSON.parse(responseText);
                        console.error('update.js: Error data:', errorData);
                        
                        if (updateResponse.status === 422) {
                            if (Array.isArray(errorData.detail)) {
                                errorMessage = errorData.detail.map(err => {
                                    const field = err.loc ? err.loc[err.loc.length - 1] : 'campo';
                                    const msg = err.msg || JSON.stringify(err);
                                    return `${field}: ${msg}`;
                                }).join('\n');
                            } else if (typeof errorData.detail === 'object') {
                                errorMessage = Object.entries(errorData.detail)
                                    .map(([field, msg]) => `${field}: ${msg}`)
                                    .join('\n');
                            } else {
                                errorMessage = errorData.detail;
                            }
                        } else {
                            errorMessage = errorData.detail || `Error ${updateResponse.status}`;
                        }
                    } catch (e) {
                        errorMessage = `Error ${updateResponse.status}: ${responseText}`;
                    }
                    throw new Error(errorMessage);
                }

                // Si llegamos aquí, la actualización fue exitosa
                const responseData = JSON.parse(responseText);
                console.log('update.js: Actualización exitosa:', responseData);
                showMessage('Persona actualizada exitosamente');
                setTimeout(() => window.location.href = '../index.html', 2000);

            } catch (error) {
                console.error('update.js: Error en la actualización:', error);
                showMessage('Error al actualizar la persona: ' + error.message, true);
                // Restaurar el botón si existe
                const submitButton = form.querySelector('button[type="submit"]');
                if (submitButton) {
                    submitButton.textContent = originalText || 'Actualizar';
                    submitButton.disabled = false;
                }
            }
        });

    } catch (error) {
        console.error('update.js: Error al cargar datos:', error);
        alert('Error al cargar los datos:\n' + error.message);
        showMessage(error.message, true);
        setTimeout(() => window.location.href = '../index.html', 2000);
    }
}); 