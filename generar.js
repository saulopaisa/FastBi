// --- ESTADO INICIAL ---
window.baseDatos = JSON.parse(localStorage.getItem('bingo_cartones')) || [];

// --- GENERACIÓN MATEMÁTICA ---
function generarMatriz(id) {
    const seed = parseInt(id);
    const rangos = [[1,15],[16,30],[31,45],[46,60],[61,75]];
    const columnas = rangos.map((r, i) => {
        let n = Array.from({length: 15}, (_, idx) => r[0] + idx);
        let m = n.length, t, j, s = (seed * 10) + i;
        while (m) {
            let x = Math.sin(s++) * 10000;
            j = Math.floor((x - Math.floor(x)) * m--);
            t = n[m]; n[m] = n[j]; n[j] = t;
        }
        return n.slice(0, 5);
    });
    let matriz = [];
    for(let r=0; r<5; r++) {
        let fila = [];
        for(let c=0; c<5; c++) fila.push((r===2 && c===2) ? "FREE" : columnas[c][r]);
        matriz.push(fila);
    }
    return matriz;
}

// --- RENDERIZADO Y BUSCADOR ---
window.renderizarLista = function(filtro = "") {
    const contenedor = document.getElementById('contenedorLista');
    const contador = document.getElementById('countDisplay');
    if (!contenedor) return;
    
    contenedor.innerHTML = "";
    contador.innerText = window.baseDatos.length;

    const filtrados = window.baseDatos.filter(item => 
        item.apodo.toLowerCase().includes(filtro.toLowerCase()) || 
        item.id.toString().includes(filtro)
    );

    filtrados.forEach(item => {
        const card = document.createElement('div');
        card.className = "id-card";
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <b style="color:#ef4444;">ID #${item.id}</b>
            </div>
            <input type="text" value="${item.apodo}" 
                   onchange="window.actualizarApodo(${item.id}, this.value)" 
                   onclick="event.stopPropagation()" 
                   style="width:100%; border:1px solid #ddd; margin-top:5px; padding:5px; border-radius:4px;">
        `;
        card.onclick = () => window.verCarton(item.id, item.apodo);
        contenedor.appendChild(card);
    });
    localStorage.setItem('bingo_cartones', JSON.stringify(window.baseDatos));
};

// --- ACCIONES ---
window.generarLote = function() {
    const input = document.getElementById('inputCantidad');
    const cant = parseInt(input.value);
    if (!cant || cant < 1) return alert("Ingresa una cantidad");

    const ultimoId = window.baseDatos.length > 0 ? Math.max(...window.baseDatos.map(o => o.id)) : 0;
    let updates = {};

    for(let i=1; i<=cant; i++) {
        const nId = ultimoId + i;
        const nApodo = `Jugador ${nId}`;
        window.baseDatos.push({ id: nId, apodo: nApodo });
        updates['cartonesGenerados/' + nId] = { id: nId, apodo: nApodo };
    }

    if(typeof db !== 'undefined') {
        db.ref().update(updates).then(() => {
            input.value = "";
            window.renderizarLista();
        });
    } else {
        window.renderizarLista();
    }
};

window.verCarton = function(id, apodo) {
    const visor = document.getElementById('visorDetallado');
    const placeholder = document.getElementById('placeholderVisor');
    if(!visor || !placeholder) return;

    placeholder.style.display = "none";
    visor.style.display = "flex";
    document.getElementById('nombreVisor').innerText = apodo;
    document.getElementById('idVisor').innerText = "ID: #" + id;
    
    const matriz = generarMatriz(id);
    let html = `<table><tr class="header-bingo"><td>B</td><td>I</td><td>N</td><td>G</td><td>O</td></tr>`;
    matriz.forEach(fila => {
        html += `<tr>${fila.map(c => `<td>${c === 'FREE' ? '★' : c}</td>`).join("")}</tr>`;
    });
    html += `</table>`;
    document.getElementById('tablaContenedor').innerHTML = html;
};

window.actualizarApodo = function(id, nuevoNombre) {
    const idx = window.baseDatos.findIndex(c => c.id === id);
    if (idx > -1) {
        window.baseDatos[idx].apodo = nuevoNombre;
        localStorage.setItem('bingo_cartones', JSON.stringify(window.baseDatos));
        if(typeof db !== 'undefined') db.ref('cartonesGenerados/' + id).update({ apodo: nuevoNombre });
    }
};

// --- IMPORTAR / EXPORTAR ---
window.exportarBD = function() {
    if (window.baseDatos.length === 0) return alert("No hay datos para exportar");
    const blob = new Blob([JSON.stringify(window.baseDatos)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bingo_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
};

window.importarBD = function(input) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (confirm(`¿Importar ${data.length} cartones?`)) {
                window.baseDatos = data;
                window.renderizarLista();
                alert("Importado con éxito");
            }
        } catch (err) { alert("Archivo JSON inválido"); }
    };
    reader.readAsText(input.files[0]);
};

window.limpiarTodo = function() {
    if (confirm("¿Borrar todo el registro?")) {
        window.baseDatos = [];
        localStorage.clear();
        if(typeof db !== 'undefined') db.ref('cartonesGenerados').remove();
        window.renderizarLista();
    }
};

// Carga inicial
window.renderizarLista();
