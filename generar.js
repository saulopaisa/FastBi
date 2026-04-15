// --- CONFIGURACIÓN GLOBAL ---
var db = firebase.database();

// --- ESTADO DE LA APLICACIÓN ---
window.cartonesLocal = [];

// --- FUNCIONES DE GENERACIÓN ---
window.generarLote = function() {
    const cantInput = document.getElementById('cantidadGenerar'); // Asegúrate que el ID coincida en tu HTML
    const cantidad = cantInput ? parseInt(cantInput.value) : 0;
    
    if (cantidad <= 0 || cantidad > 500) {
        alert("Por favor, ingresa una cantidad válida (1-500).");
        return;
    }

    for (let i = 0; i < cantidad; i++) {
        const idUnico = Math.floor(1000 + Math.random() * 9000); // ID de 4 dígitos
        const nuevoCarton = {
            id: idUnico,
            apodo: "Jugador " + idUnico,
            timestamp: Date.now()
        };

        // Guardar en Firebase (Nodo que lee la ruleta)
        db.ref('cartonesGenerados/' + idUnico).set(nuevoCarton);
    }
    
    alert(cantidad + " cartones generados y sincronizados con la Ruleta.");
    actualizarContador();
};

window.verCarton = function(id) {
    const contenedor = document.getElementById('vista-previa-contenido');
    if (!contenedor) return;

    contenedor.innerHTML = `<div style="text-align:center; padding:20px;">
        <h3>CARTÓN #${id}</h3>
        <p>Generando vista previa dinámica...</p>
    </div>`;
    // Aquí puedes añadir la lógica de dibujo de la tabla 5x5
};

function actualizarContador() {
    db.ref('cartonesGenerados').on('value', (snapshot) => {
        const total = snapshot.numChildren() || 0;
        const el = document.getElementById('contadorRegistrados');
        if (el) el.innerText = `REGISTRADOS: ${total}`;
    });
}

window.borrarTodo = function() {
    if (confirm("¿Estás seguro de borrar TODOS los cartones de la base de datos?")) {
        db.ref('cartonesGenerados').remove();
    }
};

// --- INICIALIZACIÓN ---
document.addEventListener("DOMContentLoaded", () => {
    actualizarContador();
    
    const btnJuego = document.getElementById('btnIrJuego');
    if (btnJuego) {
        btnJuego.onclick = () => window.location.href = 'ruleta.html';
    }
});
