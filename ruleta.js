// --- 1. VARIABLES DE ESTADO Y DATOS ---
let drawnNumbers = [];
let patronPersonalizado = [];
let ganadoresDetectados = new Set();
let baseDatosCartones = JSON.parse(localStorage.getItem('bingo_cartones')) || [];
let currentStatus = "esperando"; // Estado inicial

// Elementos del DOM
const drawBtn = document.getElementById('drawBtn');
const modal = document.getElementById('modalPatron');
const gridSeleccion = document.getElementById('gridSeleccion');
const textoGanadores = document.getElementById('textoGanadores');
const recentList = document.getElementById('recentList');
const countDisplay = document.getElementById('contadorCartonesReal');
const badgeEstado = document.getElementById('badgeEstado');

// --- 2. INICIALIZACIÓN ---
window.onload = () => {
    if (baseDatosCartones.length < 1) {
        document.body.innerHTML = `
            <div style="height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#1d3557; color:white; text-align:center; font-family:sans-serif; padding:20px;">
                <h1 style="color:#ffb703; font-size:3rem; margin-bottom:10px;">⚠️ ¡SIN CARTONES!</h1>
                <p style="font-size:1.2rem; max-width:600px;">Debes generar cartones antes de iniciar la ruleta.</p>
                <br>
                <button onclick="window.location.href='generar.html'" style="padding:15px 40px; background:#e63946; color:white; border:none; border-radius:10px; font-weight:900; cursor:pointer;">IR AL GENERADOR</button>
            </div>
        `;
        return;
    }

    generarTableroDerecho();
    crearCuadriculaDibujo();
    actualizarContadorCartones();
    escucharAlertasJugadores(); // Nueva función
    modal.style.display = "flex"; 
};

// --- 3. FUNCIONES DE CONTROL DE FLUJO (Sincronización Firebase) ---

function cambiarEstado(nuevoStatus, mensajeAnuncio) {
    currentStatus = nuevoStatus;
    
    // Actualizar UI Admin
    if (badgeEstado) {
        badgeEstado.innerText = `Estado: ${nuevoStatus}`;
        badgeEstado.className = `status-badge status-${nuevoStatus}`;
    }

    // Actualizar Firebase
    db.ref('partidaActual').update({
        status: nuevoStatus,
        anuncio: mensajeAnuncio,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });
}

function iniciarCuentaRegresiva() {
    const minInput = document.getElementById('minutosInicio');
    const minutos = parseInt(minInput.value) || 1;
    const targetTimestamp = Date.now() + (minutos * 60000);

    db.ref('partidaActual').update({
        status: "esperando",
        proximoJuego: targetTimestamp,
        anuncio: `EL JUEGO COMIENZA EN BREVE`,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });

    cambiarEstado("esperando", "PREPARANDO INICIO...");
    alert(`Cronómetro enviado: El juego inicia en ${minutos} min.`);
}

function anunciarVerificacion() {
    cambiarEstado("verificando", "⚠️ VERIFICANDO UN CARTÓN... POR FAVOR ESPERE");
}

function anunciarGanador() {
    const id = prompt("Ingrese el ID del cartón ganador para anunciar a todos:");
    if (id) {
        cambiarEstado("finalizado", `🏆 ¡TENEMOS UN GANADOR! FELICIDADES CARTÓN #${id} 🏆`);
    }
}

// Escuchar cuando un jugador presiona "Cantar Bingo"
function escucharAlertasJugadores() {
    db.ref('notificaciones/bingo').on('value', (snapshot) => {
        const alerta = snapshot.val();
        const contenedorAlertas = document.getElementById('listaAlertasBingo');
        const textoStatus = document.getElementById('textoGanadores');

        if (alerta) {
            textoStatus.style.display = 'none';
            contenedorAlertas.innerHTML = `
                <div class="alert-bingo-card">
                    <span>🚨 CARTÓN <b>#${alerta.id}</b> RECLAMA BINGO!</span>
                    <button onclick="verRapido(${alerta.id})" style="background:white; color:red; border:none; padding:4px 8px; border-radius:4px; font-weight:bold; cursor:pointer;">VER</button>
                </div>
            `;
            // Reproducir sonido de alerta
            new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(()=>{});
        } else {
            if (contenedorAlertas) contenedorAlertas.innerHTML = '';
            if (textoStatus) textoStatus.style.display = 'block';
        }
    });
}

// --- 4. LÓGICA DE SORTEO Y PATRONES ---

function mandarPatronAlJuego(patronArray) {
    const dataParaFirebase = Array(25).fill(false);
    patronArray.forEach(idx => { if(idx !== null) dataParaFirebase[idx] = true; });
    db.ref('configuracion/patron').set(dataParaFirebase);
}

function mandarNumeroAlJuego(num) {
    // Al sacar un número, el estado pasa automáticamente a 'jugando'
    db.ref('partidaActual').update({
        numero: num,
        letra: getLetra(num),
        status: "jugando",
        anuncio: "¡NÚMERO CANTADO!",
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });
    actualizarBadgeUI("jugando");
}

function actualizarBadgeUI(status) {
    if (badgeEstado) {
        badgeEstado.innerText = `Estado: ${status}`;
        badgeEstado.className = `status-badge status-${status}`;
    }
}

drawBtn.onclick = () => {
    if (drawnNumbers.length >= 75) return alert("¡Todas las bolas han salido!");

    let num;
    do { num = Math.floor(Math.random() * 75) + 1; } while (drawnNumbers.includes(num));

    drawnNumbers.push(num);
    
    // UI Local
    document.getElementById('currentNumber').innerText = num;
    document.getElementById('currentLetter').innerText = getLetra(num);
    document.getElementById(`slot-${num}`).classList.add('active');
    document.getElementById('count').innerText = drawnNumbers.length;

    mandarNumeroAlJuego(num);
    actualizarRecientes();
    escanearCartonesRadar();
};

// --- 5. MOTOR DE VERIFICACIÓN ---

function verificarManual() {
    const idEntrada = parseInt(document.getElementById('idABuscar').value);
    const cartonInfo = baseDatosCartones.find(c => c.id === idEntrada);
    if (!cartonInfo) return alert("ID no encontrado.");
    
    const matriz = generarMatrizCarton(idEntrada);
    const win = validarBingo(matriz, patronPersonalizado, drawnNumbers);
    
    renderMiniatura(idEntrada, cartonInfo.apodo, matriz, win, document.getElementById('areaVerificacion'));
}

function escanearCartonesRadar() {
    baseDatosCartones.forEach(cartonInfo => {
        if (ganadoresDetectados.has(cartonInfo.id)) return;
        const matriz = generarMatrizCarton(cartonInfo.id);
        if (validarBingo(matriz, patronPersonalizado, drawnNumbers)) {
            ganadoresDetectados.add(cartonInfo.id);
        }
    });
    actualizarTextoRadar();
}

// --- 6. FUNCIONES AUXILIARES (DETERMINISTAS) ---

function generarMatrizCarton(id) {
    const seedBase = parseInt(id);
    const rangos = [[1,15],[16,30],[31,45],[46,60],[61,75]];
    const columnas = rangos.map((r, indexCol) => {
        let n = []; for(let i=r[0]; i<=r[1]; i++) n.push(i);
        return shuffleSincronizado([...n], (seedBase * 10) + indexCol).slice(0, 5);
    });
    let m = [];
    for(let r=0; r<5; r++) {
        let fila = [];
        for(let c=0; c<5; c++) fila.push((r===2 && c===2) ? "FREE" : columnas[c][r]);
        m.push(fila);
    }
    return m;
}

function shuffleSincronizado(array, seed) {
    let m = array.length, t, i;
    while (m) {
        let x = Math.sin(seed++) * 10000;
        i = Math.floor((x - Math.floor(x)) * m--);
        t = array[m]; array[m] = array[i]; array[i] = t;
    }
    return array;
}

function validarBingo(matrix, indices, cantados) {
    const flat = matrix.flat(); 
    return indices.every(idx => flat[idx] === "FREE" || cantados.includes(flat[idx]));
}

// --- 7. UI Y REINICIO ---

document.getElementById('resetBtn').onclick = () => { 
    if(confirm("¿Seguro? Se limpiarán bolas y marcas para TODOS.")) {
        db.ref('partidaActual').set({ status: "reiniciado" });
        db.ref('notificaciones/bingo').remove(); // Limpiar alertas
        db.ref('notificaciones/anuncio').remove();
        location.reload();
    }
};

function verRapido(id) {
    document.getElementById('idABuscar').value = id;
    verificarManual();
}

function getLetra(n) {
    if (n <= 15) return 'B'; if (n <= 30) return 'I';
    if (n <= 45) return 'N'; if (n <= 60) return 'G'; return 'O';
}

function crearCuadriculaDibujo() {
    gridSeleccion.innerHTML = "";
    for (let i = 0; i < 25; i++) {
        const cell = document.createElement('div');
        cell.className = 'select-cell';
        if (i === 12) { cell.classList.add('free-node', 'selected'); cell.innerHTML = "★"; }
        else { cell.onclick = () => cell.classList.toggle('selected'); }
        gridSeleccion.appendChild(cell);
    }
}

document.getElementById('btnConfirmarPatron').onclick = () => {
    const seleccionadas = document.querySelectorAll('.select-cell.selected');
    if (seleccionadas.length <= 1) return alert("Dibuja el patrón.");

    patronPersonalizado = Array.from(document.querySelectorAll('.select-cell')).map((cell, index) => {
        return cell.classList.contains('selected') ? index : null;
    }).filter(val => val !== null);

    mandarPatronAlJuego(patronPersonalizado);
    cambiarEstado("esperando", "ESPERANDO INICIO DE RONDA...");
    
    modal.style.display = "none";
    drawBtn.disabled = false;
    document.getElementById('labelPatron').innerText = "MODO: PERSONALIZADO ✅";
};

function aplicarPreset(tipo) {
    limpiarSeleccion();
    const celdas = document.querySelectorAll('.select-cell');
    let indices = [];
    switch(tipo) {
        case 'lleno': indices = Array.from({length: 25}, (_, i) => i); break;
        case 'cuadro': indices = [0,1,2,3,4, 5,9, 10,14, 15,19, 20,21,22,23,24]; break;
        case 'x': indices = [0,6,12,18,24, 4,8,16,20]; break;
        case 's': indices = [0,1,2,3,4, 5, 10,11,12,13,14, 19, 20,21,22,23,24]; break;
    }
    indices.forEach(idx => celdas[idx].classList.add('selected'));
}

function limpiarSeleccion() {
    document.querySelectorAll('.select-cell').forEach((c, i) => { if(i !== 12) c.classList.remove('selected'); });
}

function actualizarRecientes() {
    const ultimos = drawnNumbers.slice(-6, -1).reverse();
    recentList.innerHTML = ultimos.map(n => `<div class="recent-ball">${n}</div>`).join("");
}

function generarTableroDerecho() {
    const grid = document.getElementById('historyGrid');
    grid.innerHTML = "";
    for (let i = 1; i <= 75; i++) {
        const slot = document.createElement('div');
        slot.className = 'ball-slot';
        slot.id = `slot-${i}`;
        slot.innerText = i;
        grid.appendChild(slot);
    }
}

function actualizarContadorCartones() {
    if (countDisplay) countDisplay.innerText = `JUGANDO: ${baseDatosCartones.length}`;
}

function actualizarTextoRadar() {
    const ids = Array.from(ganadoresDetectados);
    textoGanadores.innerHTML = ids.length ? ids.map(id => {
        const p = baseDatosCartones.find(c => c.id === id);
        return `<span class="highlight-id" onclick="verRapido(${id})" style="background:#ffb703; color:#1d3557; padding:5px 12px; border-radius:20px; cursor:pointer; font-weight:bold; margin:3px; font-size:0.8rem; border:2px solid white;">🏆 ${p ? p.apodo : 'ID'} (#${id})</span>`;
    }).join(" ") : "Monitoreando señales...";
}

function renderMiniatura(id, apodo, matrix, win, container) {
    let html = `<div style="background:white; padding:15px; border-radius:15px; border:4px solid ${win?'#25d366':'#334155'};">`;
    html += `<div style="background:${win?'#25d366':'#1d3557'}; color:white; font-weight:900; text-align:center; padding:8px; margin:-15px -15px 10px -15px;">${win?'🎉 BINGO':'ID: #'+id}</div>`;
    html += `<table style="width:100%; border-collapse:collapse; text-align:center; font-weight: bold; color: #1d3557;">`;
    matrix.forEach((fila) => {
        html += "<tr>";
        fila.forEach((celda) => {
            const hit = (celda === "FREE" || drawnNumbers.includes(celda));
            html += `<td style="border:1px solid #ddd; padding:4px; background:${hit?'#ffb703':'none'}; font-size: 0.9rem;">${celda==='FREE'?'★':celda}</td>`;
        });
        html += "</tr>";
    });
    html += `</table></div>`;
    container.innerHTML = html;
}

document.getElementById('btnVerificar').onclick = verificarManual;
document.getElementById('btnAbrirConfig').onclick = () => { modal.style.display = "flex"; };
