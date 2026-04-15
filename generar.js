// --- VARIABLES GLOBALES ---
window.baseDatos = JSON.parse(localStorage.getItem('bingo_cartones')) || [];
window.seleccionados = [];

// --- FUNCIONES MATEMÁTICAS ---
function generarMatriz(id) {
    const seedBase = parseInt(id);
    const rangos = [[1,15],[16,30],[31,45],[46,60],[61,75]];
    const columnas = rangos.map((r, i) => {
        let n = Array.from({length: 15}, (_, idx) => r[0] + idx);
        return shuffle(n, (seedBase * 10) + i).slice(0, 5);
    });
    let m = [];
    for(let r=0; r<5; r++) {
        let fila = [];
        for(let c=0; c<5; c++) fila.push((r===2 && c===2) ? "FREE" : columnas[c][r]);
        m.push(fila);
    }
    return m;
}

function shuffle(array, seed) {
    let m = array.length, t, i, localSeed = seed;
    while (m) {
        let x = Math.sin(localSeed++) * 10000;
        i = Math.floor((x - Math.floor(x)) * m--);
        t = array[m]; array[m] = array[i]; array[i] = t;
    }
    return array;
}

// --- GESTIÓN DE INTERFAZ ---
window.renderizarLista = function(filtro = "") {
    const contenedor = document.getElementById('contenedorLista');
    const contador = document.getElementById('countDisplay');
    if (!contenedor) return;
    
    contenedor.innerHTML = "";
    contador.innerText = window.baseDatos.length;

    const filtrados = window.baseDatos.filter(item => 
        item.apodo.toLowerCase().includes(filtro.toLowerCase()) || item.id.toString().includes(filtro)
    );

    filtrados.forEach((item) => {
        const estaSel = window.seleccionados.some(s => s.id === item.id);
        const card = document.createElement('div');
        card.className = `id-card ${estaSel ? 'selected' : ''}`;
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <b style="color:#ef4444;">ID #${item.id}</b>
                <input type="checkbox" ${estaSel ? 'checked' : ''} onclick="event.stopPropagation(); window.alternarSeleccion(${item.id}, '${item.apodo}')">
            </div>
            <input type="text" value="${item.apodo}" onchange="window.actualizarApodo(${item.id}, this.value)" onclick="event.stopPropagation()" style="width:100%; border:1px solid #ddd; margin-top:5px; padding:4px;">
        `;
        card.onclick = () => window.verCarton(item.id, item.apodo);
        contenedor.appendChild(card);
    });
    localStorage.setItem('bingo_cartones', JSON.stringify(window.baseDatos));
};

// --- IMPORTAR / EXPORTAR (CORREGIDO) ---
window.exportarBD = function() {
    if (window.baseDatos.length === 0) return alert("No hay nada que guardar.");
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
            if (confirm(`¿Importar ${data.length} cartones? Se borrará lo actual.`)) {
                window.baseDatos = data;
                let updates = {};
                window.baseDatos.forEach(c => {
                    updates['cartonesGenerados/' + c.id] = { id: c.id, apodo: c.apodo };
                });
                db.ref().update(updates).then(() => {
                    window.renderizarLista();
                    alert("Importación exitosa.");
                });
            }
        } catch (err) { alert("Archivo JSON no válido."); }
    };
    reader.readAsText(input.files[0]);
};

// --- FUNCIONES DE ACCIÓN ---
window.generarLote = function() {
    const cant = parseInt(document.getElementById('inputCantidad').value);
    if (!cant) return;
    const ultimoId = window.baseDatos.length > 0 ? Math.max(...window.baseDatos.map(o => o.id)) : 0;
    let updates = {};
    for(let i=1; i<=cant; i++) {
        const nId = ultimoId + i;
        const nApodo = `Jugador ${nId}`;
        window.baseDatos.push({ id: nId, apodo: nApodo });
        updates['cartonesGenerados/' + nId] = { id: nId, apodo: nApodo };
    }
    db.ref().update(updates).then(() => window.renderizarLista());
    document.getElementById('inputCantidad').value = "";
};

window.verCarton = function(id, apodo) {
    document.getElementById('placeholderVisor').style.display = "none";
    document.getElementById('visorDetallado').style.display = "flex";
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

window.verTodosLosCartones = function() {
    document.getElementById('placeholderVisor').style.display = "none";
    document.getElementById('visorDetallado').style.display = "flex";
    document.getElementById('nombreVisor').innerText = "TODOS";
    document.getElementById('tablaContenedor').innerHTML = "";
    
    window.baseDatos.forEach(item => {
        const matriz = generarMatriz(item.id);
        let html = `<div style="margin-bottom:20px; border-top:1px solid #ddd; padding-top:10px;"><b>${item.apodo} (#${item.id})</b>`;
        html += `<table><tr class="header-bingo"><td>B</td><td>I</td><td>N</td><td>G</td><td>O</td></tr>`;
        matriz.forEach(fila => {
            html += `<tr>${fila.map(c => `<td>${c === 'FREE' ? '★' : c}</td>`).join("")}</tr>`;
        });
        html += `</table></div>`;
        document.getElementById('tablaContenedor').innerHTML += html;
    });
};

window.actualizarApodo = function(id, nuevoNombre) {
    const index = window.baseDatos.findIndex(c => c.id === id);
    if (index > -1) {
        window.baseDatos[index].apodo = nuevoNombre;
        db.ref('cartonesGenerados/' + id).update({ apodo: nuevoNombre });
        localStorage.setItem('bingo_cartones', JSON.stringify(window.baseDatos));
    }
};

window.alternarSeleccion = function(id, nombre) {
    const idx = window.seleccionados.findIndex(s => s.id === id);
    if (idx > -1) window.seleccionados.splice(idx, 1);
    else if (window.seleccionados.length < 4) window.seleccionados.push({ id, nombre });
    
    const panel = document.getElementById('seleccion-maestra');
    const list = document.getElementById('listaSeleccionados');
    panel.style.display = window.seleccionados.length > 0 ? "flex" : "none";
    document.getElementById('countSeleccion').innerText = window.seleccionados.length;
    list.innerHTML = window.seleccionados.map(s => `#${s.id} `).join(", ");
    window.renderizarLista(document.getElementById('buscador').value);
};

window.generarLinkMultiple = function() {
    const pack = btoa(unescape(encodeURIComponent(JSON.stringify(window.seleccionados))));
    const url = `${window.location.origin}${window.location.pathname.replace('generar.html', 'juego.html')}?p=${pack}`;
    navigator.clipboard.writeText(url).then(() => alert("Link copiado."));
};

window.cancelarSeleccion = function() { window.seleccionados = []; window.renderizarLista(); document.getElementById('seleccion-maestra').style.display="none"; };

window.limpiarTodo = function() {
    if(confirm("¿Borrar todo?")) {
        window.baseDatos = [];
        localStorage.clear();
        db.ref('cartonesGenerados').remove().then(() => location.reload());
    }
};

document.getElementById('buscador').oninput = (e) => window.renderizarLista(e.target.value);
window.renderizarLista();
