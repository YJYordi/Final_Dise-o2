document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('.formulario');
    
    // Función para mostrar los datos de la persona
    function mostrarDatosPersona(persona) {
        // Eliminar el contenedor de resultados si existe (ya no mostraremos aquí)
        const resultadoDiv = document.querySelector('.resultado-consulta');
        if (resultadoDiv) {
            resultadoDiv.remove();
        }

        // Redirigir al formulario de registro con el número de documento para modificar
        window.location.href = `form.html?doc=${persona.numero_documento}`;
    }
    
    form.addEventListener('submit', async function(event) {
        event.preventDefault();
        const numeroDocumento = document.getElementById('doc').value;

        if (!/^\d{1,10}$/.test(numeroDocumento)) {
            alert('El número de documento debe ser numérico y no mayor a 10 caracteres');
            return;
        }

        try {
            // Mostrar indicador de carga
            const submitButton = form.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            submitButton.textContent = 'Consultando...';
            submitButton.disabled = true;

            const response = await fetch(`/api/personas/${numeroDocumento}`);
            
            // Restaurar el botón
            submitButton.textContent = originalText;
            submitButton.disabled = false;
            
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Persona no encontrada');
                }
                throw new Error(`Error al consultar: ${response.status}`);
            }

            const persona = await response.json();
            mostrarDatosPersona(persona);

        } catch (error) {
            alert(error.message);
            // Limpiar resultados si hay error
            const resultadoDiv = document.querySelector('.resultado-consulta');
            if (resultadoDiv) {
                resultadoDiv.remove();
            }
        }
    });
});

async function eliminarPersona(numeroDocumento) {
    if (confirm('¿Está seguro de eliminar esta persona?')) {
        try {
            const response = await fetch(`/api/personas/${numeroDocumento}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error(`Error al eliminar: ${response.status}`);
            }

            alert('Persona eliminada exitosamente');
            // Limpiar resultados y volver a la página principal
            const resultadoDiv = document.querySelector('.resultado-consulta');
            if (resultadoDiv) {
                resultadoDiv.remove();
            }
            window.location.href = '../index.html';
        } catch (error) {
            alert(error.message);
        }
    }
} 