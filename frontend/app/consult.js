document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('.formulario');
    
    form.addEventListener('submit', async function(event) {
        event.preventDefault();
        const numeroDocumento = document.getElementById('doc').value;

        if (!/^\d{1,10}$/.test(numeroDocumento)) {
            alert('El número de documento debe ser numérico y no mayor a 10 caracteres');
            return;
        }

        try {
            const response = await fetch(`/api/personas/${numeroDocumento}`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Persona no encontrada');
                }
                throw new Error(`Error al consultar: ${response.status}`);
            }

            const persona = await response.json();
            
            // Crear elemento para mostrar los datos
            const resultadoDiv = document.createElement('div');
            resultadoDiv.className = 'resultado-consulta';
            resultadoDiv.innerHTML = `
                <h3>Datos de la Persona</h3>
                <p><strong>Tipo de Documento:</strong> ${persona.tipo_documento}</p>
                <p><strong>Número de Documento:</strong> ${persona.numero_documento}</p>
                <p><strong>Nombre Completo:</strong> ${persona.primer_nombre} ${persona.segundo_nombre || ''} ${persona.apellidos}</p>
                <p><strong>Fecha de Nacimiento:</strong> ${new Date(persona.fecha_nacimiento).toLocaleDateString()}</p>
                <p><strong>Género:</strong> ${persona.genero}</p>
                <p><strong>Email:</strong> ${persona.email}</p>
                <p><strong>Celular:</strong> ${persona.celular}</p>
                ${persona.foto_url ? `<img src="${persona.foto_url}" alt="Foto de perfil" style="max-width: 200px;">` : ''}
                <div class="acciones">
                    <button onclick="window.location.href='update.html?doc=${persona.numero_documento}'">Actualizar</button>
                    <button onclick="eliminarPersona('${persona.numero_documento}')">Eliminar</button>
                </div>
            `;

            // Limpiar resultados anteriores y mostrar el nuevo
            const resultadosAnteriores = document.querySelector('.resultado-consulta');
            if (resultadosAnteriores) {
                resultadosAnteriores.remove();
            }
            form.after(resultadoDiv);

        } catch (error) {
            alert(error.message);
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
            window.location.href = '../index.html';
        } catch (error) {
            alert(error.message);
        }
    }
} 