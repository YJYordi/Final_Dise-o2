document.addEventListener('DOMContentLoaded', function() {
    console.log('delete.js: DOMContentLoaded event triggered');
    const form = document.querySelector('.delete-form');
    const messageDiv = document.getElementById('message');
    
    console.log('delete.js: Form element found?', form);
    console.log('delete.js: Message div found?', messageDiv);

    // Función para mostrar mensajes al usuario
    function showMessage(message, isError = false) {
        console.log('delete.js: Showing message:', message, 'isError:', isError);
        messageDiv.textContent = message;
        messageDiv.style.color = isError ? 'red' : 'green';
    }

    form.addEventListener('submit', async function(event) {
        console.log('delete.js: Form submit event triggered');
        event.preventDefault();
        const numeroDocumento = document.getElementById('docToDelete').value;
        console.log('delete.js: Document number to delete:', numeroDocumento);

        // Validación básica
        if (!/^\d{1,10}$/.test(numeroDocumento)) {
            console.log('delete.js: Invalid document number format');
            showMessage('El número de documento debe ser numérico y no mayor a 10 caracteres', true);
            return;
        }

        if (confirm(`¿Está seguro de eliminar a la persona con documento ${numeroDocumento}?`)) {
            console.log('delete.js: User confirmed deletion');
            try {
                // Deshabilitar botón mientras se procesa
                const submitButton = form.querySelector('button[type="submit"]');
                const originalText = submitButton.textContent;
                submitButton.textContent = 'Eliminando...';
                submitButton.disabled = true;

                console.log('delete.js: Sending DELETE request to:', `/api/personas/${numeroDocumento}`);
                const response = await fetch(`/api/personas/${numeroDocumento}`, {
                    method: 'DELETE'
                });
                console.log('delete.js: Server response status:', response.status);

                // Restaurar botón
                submitButton.textContent = originalText;
                submitButton.disabled = false;

                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error('Persona no encontrada');
                    }
                    throw new Error(`Error al eliminar: ${response.status}`);
                }

                console.log('delete.js: Deletion successful');
                showMessage(`Persona con documento ${numeroDocumento} eliminada exitosamente`, false);
                form.reset(); // Limpiar el formulario después de éxito

            } catch (error) {
                console.error('delete.js: Error in deletion:', error);
                showMessage('Error al eliminar la persona: ' + error.message, true);
            }
        } else {
            console.log('delete.js: User cancelled deletion');
        }
    });
}); 