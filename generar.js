// --- 0. CONFIGURACIÓN FIREBASE (Asegúrate de que estas líneas estén al inicio) ---
// Si ya tienes Firebase inicializado en tu HTML, no hace falta repetir la config aquí, 
// pero asegúrate de que la variable 'db' esté disponible.

// --- ESTADO INICIAL ---
let baseDatos = JSON.parse(localStorage.getItem('bingo_cartones')) || [];
let seleccionados = [];

// --- 1. LÓGICA DE SINCRONIZACIÓN MATEMÁTICA (Sin cambios) ---
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

// --- 2. GESTIÓN DE INTERFAZ Y FIREBASE ---

function renderizarLista(filtro = "") {
    const contenedor = document.getElementById('contenedorLista');
    const contador = document.getElementById('countDisplay');
    if (!contenedor) return;
    
    contenedor.innerHTML = "";
    contador.innerText = baseDatos.length;

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
                <span style="font-size: 0.7rem; color: #e63946; font-weight: 900;">ID #${item.id}</span>
                <input type="checkbox" ${estaSeleccionado ? 'checked' : ''} 
                       onclick="event.stopPropagation(); alternarSeleccion(${item.id}, '${item.apodo}')" 
                       style="transform: scale(1.4); cursor:pointer;">
            </div>
            <input type="text" value="${item.apodo}" 
                   style="border: 1px solid #ddd; padding: 6px; border-radius: 4px; font-weight: bold; width:100%; box-sizing:border-box;"
                   onchange="actualizarApodoFirebase(${originalIndex}, this.value)"
                   onclick="event.stopPropagation()">
        `;
        card.onclick = () => verCarton(item.id, item.apodo);
        contenedor.appendChild(card);
    });
    localStorage.setItem('bingo_cartones', JSON.stringify(baseDatos));
}

// --- NUEVA FUNCIÓN: SINCRONIZAR CON FIREBASE ---
function actualizarApodoFirebase(index, valor) {
    baseDatos[index].apodo = valor;
    localStorage.setItem('bingo_cartones', JSON.stringify(baseDatos));
    
    const carton = baseDatos[index];
    // Guardamos en Firebase para que la Ruleta lo vea
    db.ref('cartonesGenerados/' + carton.id).set({
        id: carton.id,
        apodo: carton.apodo,
        timestamp: Date.now()
    });
    console.log("Sincronizado con Firebase: Cartón " + carton.id);
}

document.getElementById('btnGenerar').onclick = () => {
    const input = document.getElementById('inputCantidad');
    const cant = parseInt(input.value);
    if(!cant || cant < 1) return;
    
    const ultimoId = baseDatos.length > 0 ? Math.max(...baseDatos.map(o => o.id)) : 0;
    
    // Objeto para actualizar Firebase en una sola carga (más eficiente)
    let updates = {};

    for(let i=1; i<=cant; i++) {
        const nuevoId = ultimoId + i;
        const nuevoApodo = `Jugador ${nuevoId}`;
        const nuevoCarton = { id: nuevoId, apodo: nuevoApodo };
        
        baseDatos.push(nuevoCarton);
        
        // Preparar para Firebase
        updates['cartonesGenerados/' + nuevoId] = {
            id: nuevoId,
            apodo: nuevoApodo,
            timestamp: Date.now()
        };
    }
    
    // Enviar todos los nuevos cartones a Firebase a la vez
    db.ref().update(updates).then(() => {
        console.log("Todos los cartones se subieron a Firebase");
        renderizarLista();
    });

    input.value = "";
};

function limpiarTodo() { 
    if(confirm("¿Borrar todos los cartones? Esto limpiará LocalStorage y Firebase.")) { 
        baseDatos = []; 
        localStorage.removeItem('bingo_cartones');
        db.ref('cartonesGenerados').remove().then(() => {
            location.reload();
        });
    } 
}

// El resto de tus funciones (alternarSeleccion, generarLinkMultiple, etc.) se mantienen igual
// ... (copia aquí el resto de tus funciones de apoyo si las necesitas) ...

renderizarLista();
