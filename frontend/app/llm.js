async function enviarConsulta() {
  const pregunta = document.getElementById("consulta").value.trim();
  const resultadoDiv = document.getElementById("resultado");
  if (!pregunta) {
    resultadoDiv.innerHTML = "<p>Por favor, escribe una pregunta.</p>";
    return;
  }
  resultadoDiv.innerHTML = "<p>Consultando...</p>";
  try {
    const resp = await fetch("/llm/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: pregunta }),
    });
    if (!resp.ok) {
      const errorData = await resp.json();
      resultadoDiv.innerHTML = `<p>Error: ${
        errorData.detail || "No se pudo procesar la consulta."
      }</p>`;
      return;
    }
    const data = await resp.json();
    resultadoDiv.innerHTML = `<p>${data.answer}</p>`;
  } catch (e) {
    resultadoDiv.innerHTML = "<p>Error en la consulta.</p>";
  }
}
