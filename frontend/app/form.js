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
        
        // Validaciones
        if (doc.length < 7 || !/^\d+$/.test(doc)) {
            errores.push("El número de documento debe tener al menos 7 dígitos numéricos.");
        }

        if (primNombre === "" || primNombre.length > 30) {
            errores.push("El primer nombre es obligatorio y debe tener máximo 30 caracteres.");
        }

        if (segNombre.length > 30) {
            errores.push("El segundo nombre debe tener máximo 30 caracteres.");
        }

        if (apellidos === "" || apellidos.length > 60) {
            errores.push("Los apellidos son obligatorios y deben tener máximo 60 caracteres.");
        }

        if (!fechaNac) {
            errores.push("La fecha de nacimiento es obligatoria.");
        }

        if (email && !/^[\w.-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,}$/.test(email)) {
            errores.push("El correo electrónico no es válido.");
        }

        if (cel && (!/^\d{10}$/.test(cel))) {
            errores.push("El número de celular debe tener exactamente 10 dígitos.");
        }

        // Si hay errores, evitamos el envío
        if (errores.length > 0) {
            event.preventDefault();
            alert("Errores en el formulario:\n\n" + errores.join("\n"));
        }

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