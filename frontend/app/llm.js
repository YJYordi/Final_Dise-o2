// app/llm.js
const simulatedData = [
    { documento: "123", nombre: "Juan Pérez", ciudad: "Bogotá" },
    { documento: "456", nombre: "Ana Gómez", ciudad: "Medellín" }
  ];
  
  async function queryLLM(prompt) {
    // Simulación de API (en producción, usa una real)
    return { choices: [{ message: { content: "Respuesta simulada para: " + prompt } }] };
  }
  
  async function searchWithRAG(query) {
    // 1. Filtrar datos (simulación de retrieval)
    const results = simulatedData.filter(item => 
      item.nombre.includes(query) || item.ciudad.includes(query)
    );
  
    // 2. Generar respuesta
    const prompt = `Basado en estos datos: ${JSON.stringify(results)}, responde: ${query}`;
    return await queryLLM(prompt);
  }
  
  window.handleNaturalLanguageQuery = async () => {
    const query = prompt("¿Qué deseas consultar?");
    if (query) {
      const response = await searchWithRAG(query);
      alert(response.choices[0].message.content);
    }
  };

async function enviarConsulta() {
    const consulta = document.getElementById('consulta').value;
    const resultadoDiv = document.getElementById('resultado');
    
    if (!consulta) {
        alert('Por favor, ingrese una pregunta');
        return;
    }

    try {
        resultadoDiv.innerHTML = '<p>Procesando consulta...</p>';
        
        const response = await fetch('http://localhost:8001/query/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: consulta })
        });

        if (!response.ok) {
            throw new Error('Error en la consulta');
        }

        const data = await response.json();
        
        // Formatear la respuesta
        let htmlRespuesta = `<p><strong>Respuesta:</strong> ${data.answer}</p>`;
        
        // Si hay datos relevantes, mostrarlos
        if (data.relevant_data && data.relevant_data.length > 0) {
            htmlRespuesta += '<p><strong>Datos relevantes encontrados:</strong></p><ul>';
            data.relevant_data.forEach(item => {
                htmlRespuesta += `<li>
                    ${item.primer_nombre} ${item.segundo_nombre || ''} ${item.apellidos}
                    (Doc: ${item.numero_documento})
                </li>`;
            });
            htmlRespuesta += '</ul>';
        }
        
        resultadoDiv.innerHTML = htmlRespuesta;
    } catch (error) {
        console.error('Error:', error);
        resultadoDiv.innerHTML = '<p class="error">Error al procesar la consulta. Por favor, intente nuevamente.</p>';
    }
}