// Log inmediato para verificar si el script se carga
console.log('updateSearch.js: Script file loaded');

document.addEventListener('DOMContentLoaded', function() {
    console.log('updateSearch.js: DOMContentLoaded event triggered');
    const form = document.querySelector('.formulario');
    const messageDiv = document.getElementById('message');
    
    console.log('updateSearch.js: Form element found?', form);
    console.log('updateSearch.js: Message div found?', messageDiv);

    if (!form) {
        console.error('updateSearch.js: Form element not found!');
        return;
    }

    if (!messageDiv) {
        console.error('updateSearch.js: Message div not found!');
        return;
    }

    // Función para mostrar mensajes al usuario
    function showMessage(message, isError = false) {
        console.log('updateSearch.js: Showing message:', message, 'isError:', isError);
        messageDiv.textContent = message;
        messageDiv.style.color = isError ? 'red' : 'green';
    }

    form.addEventListener('submit', async function(event) {
        console.log('updateSearch.js: Form submit event triggered');
        event.preventDefault();
        const numeroDocumento = document.getElementById('doc').value;
        console.log('updateSearch.js: Document number to search:', numeroDocumento);

        // Validación básica
        if (!/^\d{1,10}$/.test(numeroDocumento)) {
            console.log('updateSearch.js: Invalid document number format');
            showMessage('El número de documento debe ser numérico y no mayor a 10 caracteres', true);
            return;
        }

        try {
            // Deshabilitar botón mientras se procesa
            const submitButton = form.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            submitButton.textContent = 'Buscando...';
            submitButton.disabled = true;

            console.log('updateSearch.js: Sending GET request to:', `/api/personas/${numeroDocumento}`);
            const response = await fetch(`/api/personas/${numeroDocumento}`);
            console.log('updateSearch.js: Server response status:', response.status);

            // Restaurar botón
            submitButton.textContent = originalText;
            submitButton.disabled = false;

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Persona no encontrada');
                }
                throw new Error(`Error al buscar: ${response.status}`);
            }

            // Si la persona existe, redirigir al formulario de actualización
            console.log('updateSearch.js: Person found, redirecting to update form');
            window.location.href = `updateform.html?doc=${numeroDocumento}`;

        } catch (error) {
            console.error('updateSearch.js: Error in search:', error);
            showMessage('Error al buscar la persona: ' + error.message, true);
        }
    });
}); 