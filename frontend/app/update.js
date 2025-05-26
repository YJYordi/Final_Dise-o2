document.addEventListener('DOMContentLoaded', async function() {
    // Obtener el número de documento de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const numeroDocumento = urlParams.get('doc');

    if (!numeroDocumento) {
        alert('No se proporcionó número de documento');
        window.location.href = '../index.html';
        return;
    }

    try {
        // Obtener los datos de la persona
        const response = await fetch(`/api/personas/${numeroDocumento}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Persona no encontrada');
            }
            throw new Error(`Error al consultar: ${response.status}`);
        }

        const persona = await response.json();
        
        // Llenar el formulario con los datos
        document.getElementById('docTipo').value = persona.tipo_documento === 'Cédula' ? 'CC' : 'TI';
        document.getElementById('doc').value = persona.numero_documento;
        document.getElementById('primNombre').value = persona.primer_nombre;
        document.getElementById('segNombre').value = persona.segundo_nombre || '';
        document.getElementById('apellidos').value = persona.apellidos;
        document.getElementById('fechaNac').value = persona.fecha_nacimiento;
        
        // Mapear el género
        let generoValue = 'M';
        switch(persona.genero) {
            case 'Masculino': generoValue = 'M'; break;
            case 'Femenino': generoValue = 'F'; break;
            case 'No binario': generoValue = 'NB'; break;
            case 'Prefiero no reportar': generoValue = 'NR'; break;
        }
        document.getElementById('genero').value = generoValue;
        
        document.getElementById('email').value = persona.email;
        document.getElementById('cel').value = persona.celular;

        // Configurar el envío del formulario
        const form = document.querySelector('.formulario');
        form.addEventListener('submit', async function(event) {
            event.preventDefault();
            const errores = [];

            // Obtener los valores actualizados
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

            if (errores.length > 0) {
                alert("Errores en el formulario:\n\n" + errores.join("\n"));
                return;
            }

            try {
                // Crear FormData para enviar la imagen si existe
                const submitData = new FormData();
                submitData.append('persona', JSON.stringify(formData));
                if (imagen) {
                    submitData.append('foto', imagen);
                }

                console.log('Enviando datos actualizados:', formData); // Debug

                const updateResponse = await fetch(`/api/personas/${numeroDocumento}`, {
                    method: 'PUT',
                    body: submitData
                });

                const responseData = await updateResponse.json();

                if (!updateResponse.ok) {
                    throw new Error(responseData.detail || `Error ${updateResponse.status}`);
                }

                console.log('Respuesta del servidor:', responseData); // Debug

                // Verificar que los datos se actualizaron correctamente
                const verifyResponse = await fetch(`/api/personas/${numeroDocumento}`);
                if (!verifyResponse.ok) {
                    throw new Error('Error al verificar la actualización de datos');
                }

                alert('Persona actualizada exitosamente');
                window.location.href = '../index.html';
            } catch (error) {
                console.error('Error:', error);
                alert('Error al actualizar la persona: ' + error.message);
            }
        });

    } catch (error) {
        alert(error.message);
        window.location.href = '../index.html';
    }
}); 