document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('.formulario');
    
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        
        // Obtener los valores del formulario
        const docTipo = document.getElementById('docTipo').value;
        const doc = document.getElementById('doc').value;
        const primNombre = document.getElementById('primNombre').value;
        const segNombre = document.getElementById('segNombre').value;
        const apellidos = document.getElementById('apellidos').value;
        const fechaNac = document.getElementById('fechaNac').value;
        const genero = document.getElementById('genero').value;
        const email = document.getElementById('email').value;
        const cel = document.getElementById('cel').value;
        const imagen = document.getElementById('imagen').files[0];
        

        //Validar datos del form
        

        // Crear objeto con los datos del formulario
        const formData = new FormData();
        formData.append('docTipo', docTipo);
        formData.append('doc', doc);
        formData.append('primNombre', primNombre);
        formData.append('segNombre', segNombre);
        formData.append('apellidos', apellidos);
        formData.append('fechaNac', fechaNac);
        formData.append('genero', genero);
        formData.append('email', email);
        formData.append('cel', cel);
        if (imagen) {
            formData.append('imagen', imagen);
        }
        
        // Enviar datos al servidor
        fetch('/api/usuarios', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            alert('Usuario registrado exitosamente');
            window.location.href = '/index.html';
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error al registrar el usuario');
        });
    });
}); 