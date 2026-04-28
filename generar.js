// Aseguramos que la base de datos se cargue correctamente
var db = firebase.database();

// --- FUNCIÓN GENERAR ---
window.generarLote = function() {
    const input = document.getElementById('cantidadGenerar');
    if (!input) return;
    
    const cantidad = parseInt(input.value);
    if (isNaN(cantidad) || cantidad <= 0) return alert("Ingresa un número válido");

    for (let i = 0; i < cantidad; i++) {
        const id = Math.floor(1000 + Math.random() * 9000);
        db.ref('cartonesGenerados/' + id).set({
            id: id,
            apodo: "Jugador " + id,
            timestamp: Date.now()
        });
    }
    input.value = "";
};

// --- RENOMBRAR ---
window.actualizarNombre = function(id, nuevoNombre) {
    db.ref('cartonesGenerados/' + id).update({ apodo: nuevoNombre });
};

// --- MOSTRAR VISTA PREVIA ---
window.verVistaPrevia = function(id) {
    const preview = document.getElementById('vista-previa-contenido');
    if (!preview) return;

    db.ref('cartonesGenerados/' + id).once('value', (snap) => {
        const data = snap.val();
        if (data) {
            preview.innerHTML = `
                <h2 style="color:#16213e; margin:0;">${data.apodo}</h2>
                <p style="color:#ff4d4d; font-weight:bold; font-size:1.2rem;">CARTÓN #${data.id}</p>
                <hr>
                <p>Listo para el sorteo</p>
            `;
        }
    });
};

// --- SINCRONIZACIÓN DE LA LISTA ---
function cargarCartones() {
    db.ref('cartonesGenerados').on('value', (snapshot) => {
        // 1. Actualizar el Contador
        const btnContador = document.getElementById('contadorRegistrados');
        if (btnContador) {
            btnContador.innerText = "REGISTRADOS: " + (snapshot.numChildren() || 0);
        }

        // 2. Actualizar la Lista Visual
        const contenedor = document.getElementById('listaCartones');
        if (!contenedor) return;
        
        contenedor.innerHTML = "";
        snapshot.forEach((child) => {
            const c = child.val();
            const div = document.createElement('div');
            div.className = "card-jugador";
            div.onclick = (e) => {
                if(e.target.tagName !== 'INPUT') window.verVistaPrevia(c.id);
            };

            div.innerHTML = `
                <h4>ID #${c.id}</h4>
                <input type="text" class="input-apodo" value="${c.apodo}" 
                    onchange="window.actualizarNombre('${c.id}', this.value)"
                    onclick="event.stopPropagation()">
            `;
            contenedor.appendChild(div);
        });
    });
}

// --- UTILIDADES ---
window.borrarTodo = function() {
    if(confirm("¿Seguro que quieres borrar todos los cartones?")) {
        db.ref('cartonesGenerados').remove();
    }
};

window.verTodos = function() {
    const link = window.location.origin + "/FastBi/jugador.html";
    prompt("Copia el link para los jugadores:", link);
};

// Iniciar proceso cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", cargarCartones);
