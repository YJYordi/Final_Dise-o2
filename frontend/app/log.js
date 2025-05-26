document.addEventListener('DOMContentLoaded', function() {
    const searchBtn = document.querySelector('.search-btn');
    const resultsDiv = document.querySelector('.results');
    const LOGS_SERVICE_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:8002'
        : 'http://log-service:8002';  // Para cuando esté en Docker

    // Función simple para probar la conexión
    async function testConnection() {
        try {
            const response = await fetch(`${LOGS_SERVICE_URL}/logs/`);
            if (!response.ok) {
                throw new Error(`Error del servidor: ${response.status}`);
            }
            const logs = await response.json();
            console.log('Conexión exitosa. Logs recibidos:', logs);
            return true;
        } catch (error) {
            console.error('Error de conexión:', error);
            return false;
        }
    }

    // Probar la conexión al cargar la página
    testConnection().then(isConnected => {
        if (!isConnected) {
            resultsDiv.innerHTML = `
                <div class="results-title">Error de Conexión</div>
                <div class="error-message">
                    No se pudo conectar al servicio de logs. 
                    Por favor, asegúrese de que el servicio esté corriendo en el puerto 8002.
                </div>
            `;
        }
    });

    searchBtn.addEventListener('click', async function() {
        try {
            // Mostrar estado de carga
            searchBtn.disabled = true;
            searchBtn.textContent = 'Buscando...';
            resultsDiv.innerHTML = '<div class="loading">Buscando registros...</div>';

            // Obtener filtros básicos
            const tipos = [];
            const createCheckbox = document.getElementById('create');
            const modifyCheckbox = document.getElementById('modify');
            const deleteCheckbox = document.getElementById('delete');

            if (createCheckbox?.checked) tipos.push('CREATE');
            if (modifyCheckbox?.checked) tipos.push('UPDATE');
            if (deleteCheckbox?.checked) tipos.push('DELETE');

            const documento = document.getElementById('document')?.value || '';
            const dateFrom = document.getElementById('date-from')?.value || '';
            const dateTo = document.getElementById('date-to')?.value || '';

            // Construir los parámetros de la URL
            const params = new URLSearchParams();
            
            // Agregar tipos como un solo parámetro con valores separados por coma
            if (tipos.length > 0) {
                params.append('tipo', tipos.join(','));
            }
            
            if (documento) {
                params.append('documento', documento);
            }
            
            if (dateFrom) {
                params.append('fecha_inicio', `${dateFrom}T00:00:00Z`);
            }
            
            if (dateTo) {
                params.append('fecha_fin', `${dateTo}T23:59:59Z`);
            }

            // Construir la URL final
            const url = `${LOGS_SERVICE_URL}/logs/?${params.toString()}`;
            console.log('Consultando URL:', url);

            // Fetch logs con manejo de errores mejorado
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `Error al buscar logs: ${response.status}`);
            }

            const logs = await response.json();
            console.log('Logs recibidos:', logs);

            // Mostrar resultados
            if (!logs || logs.length === 0) {
                resultsDiv.innerHTML = `
                    <div class="results-title">Resultados</div>
                    <div class="no-results">No se encontraron registros</div>
                `;
                return;
            }

            resultsDiv.innerHTML = `
                <div class="results-title">Resultados (${logs.length} registros)</div>
                <div class="log-entries">
                    ${logs.map(log => `
                        <div class="log-entry">
                            <div class="log-header">
                                <span class="log-type ${log.tipo.toLowerCase()}">${log.tipo}</span>
                                <span class="log-timestamp">${new Date(log.fecha).toLocaleString()}</span>
                            </div>
                            <div class="log-details">
                                ${log.detalles}
                                ${log.documento ? `<span class="log-document">Documento: ${log.documento}</span>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;

        } catch (error) {
            console.error('Error en la búsqueda:', error);
            resultsDiv.innerHTML = `
                <div class="results-title">Error</div>
                <div class="error-message">${error.message}</div>
            `;
        } finally {
            searchBtn.disabled = false;
            searchBtn.textContent = 'Buscar';
        }
    });
}); 