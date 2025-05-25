document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('.formulario');
    const errores = [];
    
    form.addEventListener('submit', async function(event) {
        event.preventDefault();
        errores.length = 0; // Limpiar errores anteriores
        
        // Obtener los valores del formulario
        const formData = {
            tipo_documento: document.getElementById('docTipo').value === 'CC' ? 'Cédula' : 'Tarjeta de identidad',
            numero_documento: document.getElementById('doc').value,
            primer_nombre: document.getElementById('primNombre').value,
            segundo_nombre: document.getElementById('segNombre').value || null,
            apellidos: document.getElementById('apellidos').value,
            fecha_nacimiento: document.getElementById('fechaNac').value,
            genero: document.getElementById('genero').value === 'M' ? 'Masculino' : 'Femenino',
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
            alert("Errores en el formulario:\n\n" + errores.join("\n"));
            return;
        }

        try {
            // Crear FormData para enviar la imagen si existe
            const submitData = new FormData();
            if (imagen) {
                submitData.append('foto', imagen);
            }
            submitData.append('persona', JSON.stringify(formData));

            const response = await fetch('/api/personas/', {
                method: 'POST',
                body: submitData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            alert('Persona registrada exitosamente');
            window.location.href = '../index.html';
        } catch (error) {
            console.error('Error:', error);
            alert('Error al registrar la persona: ' + error.message);
        }
    });
}); 