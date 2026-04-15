// --- ESTADO GLOBAL ---
window.baseDatos = JSON.parse(localStorage.getItem('bingo_cartones')) || [];

// --- FUNCIONES MATEMÁTICAS ---
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

// --- ACCIONES DE USUARIO ---
window.generarLote = function() {
    const cant = parseInt(document.getElementById('inputCantidad').value);
    if (!cant || cant < 1) return alert("Ingresa una cantidad válida");

    const ultimoId = window.baseDatos.length > 0 ? Math.max(...window.baseDatos.map(o => o.id)) : 0;
    let updates = {};

    for(let i=1; i<=cant; i++) {
        const nuevoId = ultimoId + i;
        const nuevoObjeto = { id: nuevoId, apodo: `Jugador ${nuevoId}` };
        window.baseDatos.push(nuevoObjeto);
        updates['cartonesGenerados/' + nuevoId] = nuevoObjeto;
    }

    db.ref().update(updates).then(() => {
        document.getElementById('inputCantidad').value = "";
        window.renderizarLista();
    });
};

window.renderizarLista = function(filtro = "") {
    const contenedor = document.getElementById('contenedorLista');
    const contador = document.getElementById('countDisplay');
    contenedor.innerHTML = "";

    const filtrados = window.baseDatos.filter(item => 
        item.apodo.toLowerCase().includes(filtro.toLowerCase()) || 
        item.id.toString().includes(filtro)
    );

    filtrados.forEach(item => {
        const card = document.createElement('div');
        card.className = "id-card";
        card.innerHTML = `<b>ID #${item.id}</b><br>${item.apodo}`;
        card.onclick = () => window.verCarton(item.id, item.apodo);
        contenedor.appendChild(card);
    });

    contador.innerText = window.baseDatos.length;
    localStorage.setItem('bingo_cartones', JSON.stringify(window.baseDatos));
};

window.verCarton = function(id, apodo) {
    document.getElementById('placeholder').style.display = "none";
    document.getElementById('visorDetallado').style.display = "flex";
    document.getElementById('nombreVisor').innerText = apodo + " (#" + id + ")";
    
    const matriz = generarMatriz(id);
    let html = `<table><tr class="header-bingo"><td>B</td><td>I</td><td>N</td><td>G</td><td>O</td></tr>`;
    matriz.forEach(fila => {
        html += `<tr>${fila.map(c => `<td>${c === 'FREE' ? '★' : c}</td>`).join("")}</tr>`;
    });
    html += `</table>`;
    document.getElementById('tablaContenedor').innerHTML = html;
};

window.exportarBD = function() {
    if (window.baseDatos.length === 0) return alert("No hay datos");
    const blob = new Blob([JSON.stringify(window.baseDatos)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "bingo_backup.json";
    a.click();
};

window.importarBD = function(input) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            window.baseDatos = JSON.parse(e.target.result);
            window.renderizarLista();
            alert("Importado con éxito");
        } catch (err) { alert("Archivo inválido"); }
    };
    reader.readAsText(input.files[0]);
};

window.limpiarTodo = function() {
    if (confirm("¿Borrar todo?")) {
        window.baseDatos = [];
        db.ref('cartonesGenerados').remove();
        window.renderizarLista();
    }
};

// Carga inicial
window.renderizarLista();
