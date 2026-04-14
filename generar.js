// --- 0. VALIDACIÓN DE CONEXIÓN A FIREBASE ---
// Nos aseguramos de que 'db' exista antes de hacer nada. Viene del HTML.
if (typeof db === 'undefined') {
    var db = (typeof firebase !== 'undefined' && firebase.apps.length > 0) ? firebase.database() : null;
    if (!db) console.error("Advertencia: Firebase no está conectado correctamente.");
}

// --- ESTADO INICIAL ---
let baseDatos = JSON.parse(localStorage.getItem('bingo_cartones')) || [];
let seleccionados = [];

// --- 1. LÓGICA DE SINCRONIZACIÓN MATEMÁTICA ---

function generarMatriz(id) {
    const seedBase = parseInt(id);
    const rangos = [[1,15],[16,30],[31,45],[46,60],[61,75]];
    
    const columnas = rangos.map((r, indexCol) => {
        let n = []; 
        for(let i=r[0]; i<=r[1]; i++) n.push(i);
        // Usamos (ID * 10) para evitar que las semillas se solapen
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
        // Fórmula determinista basada en Seno
        let x = Math.sin(localSeed++) * 10000;
        let randomDecimal = x - Math.floor(x);
        i = Math.floor(randomDecimal * m--);
        
        t = array[m]; 
        array[m] = array[i]; 
        array[i] = t;
    }
    return array;
}

// --- 2. GESTIÓN DE INTERFAZ Y FIREBASE ---

function renderizarLista(filtro = "") {
    const contenedor = document.getElementById('contenedorLista');
    const contador = document.getElementById('countDisplay');
    
    if (!contenedor) return; // Evita el error "Cannot read properties of null"
    
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

function actualizarApodoFirebase(index, valor) {
    baseDatos[index].apodo = valor;
    localStorage.setItem('bingo_cartones', JSON.stringify(baseDatos));
    
    if(!db) return console.error("No se pudo guardar en la nube: db no está definido.");

    const carton = baseDatos[index];
    // Sincroniza el cambio de nombre individual con Firebase
    db.ref('cartonesGenerados/' + carton.id).set({
        id: carton.id,
        apodo: carton.apodo,
        timestamp: Date.now()
    }).catch(e => console.error("Error en Firebase:", e));
}

function alternarSeleccion(id, nombre) {
    const index = seleccionados.findIndex(s => s.id === id);
    if (index > -1) {
        seleccionados.splice(index, 1);
    } else {
        if (seleccionados.length >= 4) {
            alert("Límite máximo: 4 cartones por link");
            return;
        }
        seleccionados.push({ id, nombre });
    }
    actualizarPanelSeleccion();
    renderizarLista(document.getElementById('buscador')?.value || "");
}

function actualizarPanelSeleccion() {
    const panel = document.getElementById('seleccion-maestra');
    const lista = document.getElementById('listaSeleccionados');
    const count = document.getElementById('countSeleccion');
    
    if (!panel || !lista || !count) return;

    if (seleccionados.length > 0) {
        panel.style.display = "flex";
        count.innerText = seleccionados.length;
        lista.innerHTML = seleccionados.map(s => 
            `<span style="background:#16a34a; color:white; padding:4px 10px; border-radius:20px; font-size:0.7rem; font-weight:bold; margin-right:5px;">#${s.id}</span>`
        ).join("");
    } else {
        panel.style.display = "none";
    }
}

// --- 3. GENERACIÓN DE LINKS ---

function generarLinkMultiple() {
    if (seleccionados.length === 0) return alert("Selecciona al menos un cartón para generar el link.");
    
    const loc = window.location;
    const pathActual = loc.pathname;
    const nuevoPath = pathActual.substring(0, pathActual.lastIndexOf('/')) + '/juego.html';
    
    try {
        const jsonString = JSON.stringify(seleccionados);
        const pack = btoa(unescape(encodeURIComponent(jsonString)));
        const fullUrl = `${loc.origin}${nuevoPath}?p=${pack}`;
        copiarLink(fullUrl);
    } catch (e) {
        console.error("Error al generar link:", e);
        alert("Error al procesar los nombres. Evita emojis raros.");
    }
}

function copiarLink(url) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => {
            alert("¡Link de Juego copiado! Envíalo por WhatsApp.");
            cancelarSeleccion();
        }).catch(() => fallbackCopiar(url));
    } else {
        fallbackCopiar(url);
    }
}

function fallbackCopiar(url) {
    const textArea = document.createElement("textarea");
    textArea.value = url;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    alert("¡Link copiado!");
    cancelarSeleccion();
}

// --- 4. FUNCIONES DE APOYO Y BOTONES ---

const btnGenerar = document.getElementById('btnGenerar');
if(btnGenerar) {
    btnGenerar.onclick = () => {
        if(!db) {
            alert("Espere un momento, conectando con Firebase...");
            return;
        }

        const input = document.getElementById('inputCantidad');
        const cant = parseInt(input.value);
        if(!cant || cant < 1) return;
        
        const ultimoId = baseDatos.length > 0 ? Math.max(...baseDatos.map(o => o.id)) : 0;
        let updates = {}; // Objeto para subir todo de golpe

        for(let i=1; i<=cant; i++) {
            const nuevoId = ultimoId + i;
            const nuevoApodo = `Jugador ${nuevoId}`;
            
            baseDatos.push({ id: nuevoId, apodo: nuevoApodo });
            
            // Preparamos la carga para la base de datos
            updates['cartonesGenerados/' + nuevoId] = {
                id: nuevoId,
                apodo: nuevoApodo,
                timestamp: Date.now()
            };
        }
        
        // Sincronización en lote (más rápida y segura)
        db.ref().update(updates).then(() => {
            console.log("Cartones sincronizados con éxito en Firebase");
            renderizarLista();
        }).catch(err => {
            console.error("Fallo al subir a Firebase", err);
            alert("Se generaron localmente, pero falló la conexión a internet.");
            renderizarLista();
        });

        input.value = "";
    };
}

function verCarton(id, apodo) {
    const placeholder = document.getElementById('placeholderVisor');
    const visor = document.getElementById('visorDetallado');
    
    if (placeholder) placeholder.style.display = "none";
    if (visor) visor.style.display = "flex";
    
    document.getElementById('nombreVisor').innerText = apodo;
    document.getElementById('idVisor').innerText = "ID REGISTRADO: #" + id;
    
    const matriz = generarMatriz(id);
    const tabla = document.getElementById('tablaVisor');
    
    let html = `<tr style="background:#1e3a8a; color:white; font-weight:900;"><td>B</td><td>I</td><td>N</td><td>G</td><td>O</td></tr>`;
    matriz.forEach(fila => {
        html += `<tr>`;
        fila.forEach(c => html += `<td>${c === 'FREE' ? '★' : c}</td>`);
        html += `</tr>`;
    });
    if(tabla) tabla.innerHTML = html;
}

function cancelarSeleccion() {
    seleccionados = [];
    actualizarPanelSeleccion();
    renderizarLista(document.getElementById('buscador')?.value || "");
}

function limpiarTodo() { 
    if(confirm("¿Borrar todos los cartones guardados en este PC y en la Ruleta?")) { 
        baseDatos = []; 
        localStorage.removeItem('bingo_cartones');
        
        if(db) {
            db.ref('cartonesGenerados').remove().then(() => {
                renderizarLista(); 
                location.reload(); 
            });
        } else {
            renderizarLista(); 
            location.reload();
        }
    } 
}

// Inicialización del buscador
const buscador = document.getElementById('buscador');
if(buscador) {
    buscador.oninput = (e) => renderizarLista(e.target.value);
}

// Carga inicial
renderizarLista();
