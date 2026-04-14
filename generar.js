// --- 0. ESTADO Y CONFIGURACIÓN ---
let baseDatos = JSON.parse(localStorage.getItem('bingo_cartones')) || [];
let seleccionados = [];

// Validación de db (Firebase) cargada desde el HTML
if (typeof db === 'undefined') {
    var db = (typeof firebase !== 'undefined') ? firebase.database() : null;
}

// --- 1. LÓGICA MATEMÁTICA (Bingo 75) ---

function generarMatriz(id) {
    const seedBase = parseInt(id);
    const rangos = [[1,15],[16,30],[31,45],[46,60],[61,75]];
    
    const columnas = rangos.map((r, indexCol) => {
        let n = []; 
        for(let i=r[0]; i<=r[1]; i++) n.push(i);
        return shuffle([...n], (seedBase * 10) + indexCol).slice(0, 5);
    });

    let m = [];
    for(let r=0; r<5; r++) {
        let fila = [];
        for(let c=0; c<5; c++) {
            fila.push((r===2 && c===2) ? "FREE" : columnas[c][r]);
        }
        m.push(fila);
    }
    return m;
}

function shuffle(array, seed) {
    let m = array.length, t, i;
    let localSeed = seed;
    while (m) {
        let x = Math.sin(localSeed++) * 10000;
        let randomDecimal = x - Math.floor(x);
        i = Math.floor(randomDecimal * m--);
        t = array[m]; array[m] = array[i]; array[i] = t;
    }
    return array;
}

// --- 2. GESTIÓN DE INTERFAZ ---

function renderizarLista(filtro = "") {
    const contenedor = document.getElementById('contenedorLista');
    const contador = document.getElementById('countDisplay');
    if (!contenedor) return;
    
    contenedor.innerHTML = "";
    if (contador) contador.innerText = baseDatos.length;

    const datosFiltrados = baseDatos.filter(item => 
        item.apodo.toLowerCase().includes(filtro.toLowerCase()) || 
        item.id.toString().includes(filtro)
    );

    datosFiltrados.forEach((item) => {
        const originalIndex = baseDatos.findIndex(orig => orig.id === item.id);
        const estaSeleccionado = seleccionados.some(s => s.id === item.id);
        
        const card = document.createElement('div');
        card.className = `id-card ${estaSeleccionado ? 'selected' : ''}`;
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size: 0.75rem; color: #e53e3e; font-weight: 900;">ID #${item.id}</span>
                <input type="checkbox" ${estaSeleccionado ? 'checked' : ''} 
                       onclick="event.stopPropagation(); alternarSeleccion(${item.id}, '${item.apodo}')" 
                       style="transform: scale(1.3); cursor:pointer;">
            </div>
            <input type="text" value="${item.apodo}" 
                   style="border: 1px solid #cbd5e0; padding: 8px; border-radius: 4px; font-weight: bold; width:100%; margin-top:5px;"
                   onchange="actualizarApodoFirebase(${originalIndex}, this.value)"
                   onclick="event.stopPropagation()">
        `;
        card.onclick = () => verCarton(item.id, item.apodo);
        contenedor.appendChild(card);
    });
    localStorage.setItem('bingo_cartones', JSON.stringify(baseDatos));
}

// --- 3. VISTA PREVIA Y VISUALIZACIÓN ---

function verCarton(id, apodo) {
    const placeholder = document.getElementById('placeholderVisor');
    const visor = document.getElementById('visorDetallado');
    const contenedor = document.getElementById('tablaContenedor');
    
    if (placeholder) placeholder.style.display = "none";
    if (visor) visor.style.display = "flex";
    
    document.getElementById('nombreVisor').innerText = apodo;
    document.getElementById('idVisor').innerText = "ID #" + id;
    
    const matriz = generarMatriz(id);
    contenedor.innerHTML = '<table id="tablaVisor"></table>';
    const tabla = document.getElementById('tablaVisor');
    
    let html = `<tr class="header-bingo"><td>B</td><td>I</td><td>N</td><td>G</td><td>O</td></tr>`;
    matriz.forEach(fila => {
        html += `<tr>${fila.map(c => `<td>${c === 'FREE' ? '★' : c}</td>`).join("")}</tr>`;
    });
    tabla.innerHTML = html;
}

function verTodosLosCartones() {
    const visor = document.getElementById('visorDetallado');
    const placeholder = document.getElementById('placeholderVisor');
    const contenedor = document.getElementById('tablaContenedor');
    
    if (baseDatos.length === 0) return alert("No hay cartones generados.");

    if (placeholder) placeholder.style.display = "none";
    if (visor) visor.style.display = "flex";
    
    document.getElementById('nombreVisor').innerText = "VISTA COMPLETA";
    document.getElementById('idVisor').innerText = `${baseDatos.length} cartones en total`;
    
    contenedor.innerHTML = ""; 
    baseDatos.forEach(item => {
        const div = document.createElement('div');
        div.style.marginBottom = "30px";
        div.innerHTML = `<h3 style="text-align:center; margin-bottom:5px;">${item.apodo} (#${item.id})</h3>`;
        
        const tabla = document.createElement('table');
        const matriz = generarMatriz(item.id);
        let html = `<tr class="header-bingo"><td>B</td><td>I</td><td>N</td><td>G</td><td>O</td></tr>`;
        matriz.forEach(fila => {
            html += `<tr>${fila.map(c => `<td>${c === 'FREE' ? '★' : c}</td>`).join("")}</tr>`;
        });
        tabla.innerHTML = html;
        div.appendChild(tabla);
        contenedor.appendChild(div);
    });
}

// --- 4. FIREBASE Y PERSISTENCIA ---

function actualizarApodoFirebase(index, valor) {
    baseDatos[index].apodo = valor;
    localStorage.setItem('bingo_cartones', JSON.stringify(baseDatos));
    
    if(db) {
        const carton = baseDatos[index];
        db.ref('cartonesGenerados/' + carton.id).set({
            id: carton.id,
            apodo: carton.apodo,
            timestamp: Date.now()
        });
    }
}

document.getElementById('btnGenerar').onclick = () => {
    const input = document.getElementById('inputCantidad');
    const cant = parseInt(input.value);
    if(!cant || cant < 1) return;
    
    const ultimoId = baseDatos.length > 0 ? Math.max(...baseDatos.map(o => o.id)) : 0;
    let updates = {};

    for(let i=1; i<=cant; i++) {
        const nuevoId = ultimoId + i;
        const nuevoApodo = `Jugador ${nuevoId}`;
        baseDatos.push({ id: nuevoId, apodo: nuevoApodo });
        
        updates['cartonesGenerados/' + nuevoId] = {
            id: nuevoId,
            apodo: nuevoApodo,
            timestamp: Date.now()
        };
    }
    
    if(db) {
        db.ref().update(updates).then(() => renderizarLista());
    } else {
        renderizarLista();
    }
    input.value = "";
};

// --- 5. IMPORTAR / EXPORTAR ---

function exportarBD() {
    if (baseDatos.length === 0) return alert("Nada que exportar.");
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(baseDatos));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", "bingo_db.json");
    dlAnchor.click();
}

function importarBD(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (confirm(`¿Importar ${data.length} cartones? Se borrará lo actual.`)) {
                baseDatos = data;
                localStorage.setItem('bingo_cartones', JSON.stringify(baseDatos));
                // Sincronizar importación con Firebase
                let updates = {};
                baseDatos.forEach(c => {
                    updates['cartonesGenerados/' + c.id] = { id: c.id, apodo: c.apodo, timestamp: Date.now() };
                });
                if(db) db.ref('cartonesGenerados').set(updates).then(() => location.reload());
                else location.reload();
            }
        } catch (err) { alert("Archivo no válido."); }
    };
    reader.readAsText(file);
}

function limpiarTodo() { 
    if(confirm("¿Borrar TODO? Se eliminará de Firebase y LocalStorage.")) { 
        baseDatos = []; 
        localStorage.removeItem('bingo_cartones');
        if(db) db.ref('cartonesGenerados').remove().then(() => location.reload());
        else location.reload();
    } 
}

// --- 6. SELECCIÓN Y LINKS ---

function alternarSeleccion(id, nombre) {
    const idx = seleccionados.findIndex(s => s.id === id);
    if (idx > -1) seleccionados.splice(idx, 1);
    else {
        if (seleccionados.length >= 4) return alert("Máximo 4 cartones.");
        seleccionados.push({ id, nombre });
    }
    actualizarPanelSeleccion();
    renderizarLista(document.getElementById('buscador').value);
}

function actualizarPanelSeleccion() {
    const panel = document.getElementById('seleccion-maestra');
    const lista = document.getElementById('listaSeleccionados');
    const count = document.getElementById('countSeleccion');
    
    if (seleccionados.length > 0) {
        panel.style.display = "flex";
        count.innerText = seleccionados.length;
        lista.innerHTML = seleccionados.map(s => 
            `<span style="background:#2d3748; color:white; padding:2px 8px; border-radius:4px; font-size:0.7rem; margin-right:5px;">#${s.id}</span>`
        ).join("");
    } else {
        panel.style.display = "none";
    }
}

function generarLinkMultiple() {
    if (seleccionados.length === 0) return alert("Selecciona cartones primero.");
    const loc = window.location;
    const path = loc.pathname.substring(0, loc.pathname.lastIndexOf('/')) + '/juego.html';
    const pack = btoa(unescape(encodeURIComponent(JSON.stringify(seleccionados))));
    const url = `${loc.origin}${path}?p=${pack}`;
    
    navigator.clipboard.writeText(url).then(() => {
        alert("Link copiado al portapapeles.");
        cancelarSeleccion();
    });
}

function cancelarSeleccion() {
    seleccionados = [];
    actualizarPanelSeleccion();
    renderizarLista(document.getElementById('buscador').value);
}

// Buscador
document.getElementById('buscador').oninput = (e) => renderizarLista(e.target.value);

// Carga Inicial
renderizarLista();
