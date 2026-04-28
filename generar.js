var db = firebase.database();

// --- GENERACIÓN CON NÚMEROS REALES ---
window.generarLote = function() {
    const input = document.getElementById('cantidadGenerar');
    const cantidad = parseInt(input.value);

    if (isNaN(cantidad) || cantidad <= 0) return alert("Ingresa una cantidad.");

    for (let i = 0; i < cantidad; i++) {
        const id = Math.floor(1000 + Math.random() * 9000);
        db.ref('cartonesGenerados/' + id).set({
            id: id,
            apodo: "Jugador " + id,
            numeros: generarNumerosBingo(), // Función para que el cartón no esté vacío
            timestamp: Date.now()
        });
    }
    input.value = "";
};

function generarNumerosBingo() {
    const columnas = { 'B': [1,15], 'I': [16,30], 'N': [31,45], 'G': [46,60], 'O': [61,75] };
    let data = {};
    Object.keys(columnas).forEach(letra => {
        let n = [];
        while(n.length < 5) {
            let r = Math.floor(Math.random() * (columnas[letra][1] - columnas[letra][0] + 1)) + columnas[letra][0];
            if(!n.includes(r)) n.push(r);
        }
        data[letra] = n;
    });
    data['N'][2] = 0; // Centro libre
    return data;
}

// --- ACTUALIZAR NOMBRE (Renombrar) ---
window.actualizarNombre = function(id, nuevoNombre) {
    db.ref('cartonesGenerados/' + id).update({ apodo: nuevoNombre });
};

// --- LISTA DINÁMICA ---
function cargarLista() {
    db.ref('cartonesGenerados').on('value', (snapshot) => {
        const total = snapshot.numChildren() || 0;
        document.getElementById('contadorRegistrados').innerText = "REGISTRADOS: " + total;

        const lista = document.getElementById('listaCartones');
        if (!lista) return;
        lista.innerHTML = "";

        snapshot.forEach((child) => {
            const c = child.val();
            const card = document.createElement('div');
            card.className = "card-jugador";
            
            // Al hacer clic en la tarjeta (no en el input), ver vista previa
            card.onclick = (e) => {
                if(e.target.tagName !== 'INPUT') window.verVistaPrevia(c.id);
            };

            card.innerHTML = `
                <h4>ID #${c.id}</h4>
                <input type="text" class="input-renombrar" value="${c.apodo}" 
                    onchange="window.actualizarNombre('${c.id}', this.value)"
                    onclick="event.stopPropagation()">
            `;
            lista.appendChild(card);
        });
    });
}

// --- VISTA PREVIA DETALLADA ---
window.verVistaPrevia = function(id) {
    const preview = document.getElementById('vista-previa-contenido');
    db.ref('cartonesGenerados/' + id).once('value', (snap) => {
        const c = snap.val();
        if (!c) return;

        let tablaHtml = `
            <h2 style="margin:0; color:#334155;">JUGADOR: ${c.apodo}</h2>
            <p style="color:#ef4444; font-weight:bold;">CARTÓN #${c.id}</p>
            <div class="tabla-bingo">
                <div class="header-bingo">B</div><div class="header-bingo">I</div><div class="header-bingo">N</div><div class="header-bingo">G</div><div class="header-bingo">O</div>
        `;

        for (let i = 0; i < 5; i++) {
            ['B','I','N','G','O'].forEach(l => {
                const num = c.numeros[l][i] === 0 ? "⭐" : c.numeros[l][i];
                tablaHtml += `<div class="celda">${num}</div>`;
            });
        }
        tablaHtml += `</div>`;
        preview.innerHTML = tablaHtml;
    });
};

// --- OTRAS FUNCIONES ---
window.borrarTodo = function() { if(confirm("¿Borrar todo?")) db.ref('cartonesGenerados').remove(); };

window.exportarJSON = function() {
    db.ref('cartonesGenerados').once('value', s => {
        const blob = new Blob([JSON.stringify(s.val())], {type:'application/json'});
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'bingo_backup.json'; a.click();
    });
};

window.importarJSON = function(e) {
    const reader = new FileReader();
    reader.onload = (ev) => db.ref('cartonesGenerados').update(JSON.parse(ev.target.result));
    reader.readAsText(e.target.files[0]);
};

window.verTodos = function() { prompt("Link de juego:", window.location.origin + "/FastBi/jugador.html"); };

document.addEventListener("DOMContentLoaded", cargarLista);
