// --- VARIABLES DE ESTADO ---
let drawnNumbers = [];
let patronPersonalizado = [];
let ganadoresDetectados = new Set();
// Carga la base de datos de cartones (registrados o importados)
let baseDatosCartones = JSON.parse(localStorage.getItem('bingo_cartones')) || [];

// Elementos del DOM
const drawBtn = document.getElementById('drawBtn');
const modal = document.getElementById('modalPatron');
const gridSeleccion = document.getElementById('gridSeleccion');
const textoGanadores = document.getElementById('textoGanadores');
const recentList = document.getElementById('recentList');
const countDisplay = document.getElementById('contadorCartonesReal');

// --- 1. INICIALIZACIÓN CON VALIDACIÓN ---
window.onload = () => {
    // REGLA: Mínimo 2 cartones para jugar
    if (baseDatosCartones.length < 2) {
        document.body.innerHTML = `
            <div style="height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#1d3557; color:white; text-align:center; font-family:sans-serif; padding:20px;">
                <h1 style="color:#ffb703; font-size:3rem; margin-bottom:10px;">⚠️ ¡FALTAN JUGADORES!</h1>
                <p style="font-size:1.5rem; max-width:600px;">No puedes iniciar la ruleta sin cartones. Necesitas al menos <b>2 cartones</b> registrados.</p>
                <p style="background:rgba(255,255,255,0.1); padding:10px 20px; border-radius:30px;">Cartones detectados: ${baseDatosCartones.length}</p>
                <br>
                <a href="generar.html" style="padding:15px 40px; background:#e63946; color:white; text-decoration:none; border-radius:10px; font-weight:900; font-size:1.2rem; transition:0.3s; box-shadow: 0 5px 15px rgba(0,0,0,0.3);">← CONFIGURAR CARTONES AQUÍ</a>
            </div>
        `;
        return;
    }

    // Si hay cartones, inicializamos el tablero
    generarTableroDerecho();
    crearCuadriculaDibujo();
    actualizarContadorCartones();
    modal.style.display = "flex";
};

// Muestra el total de cartones activos en el radar
function actualizarContadorCartones() {
    if (countDisplay) {
        countDisplay.innerText = `JUGANDO: ${baseDatosCartones.length}`;
    }
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

function crearCuadriculaDibujo() {
    gridSeleccion.innerHTML = "";
    for (let i = 0; i < 25; i++) {
        const cell = document.createElement('div');
        cell.className = 'select-cell';
        if (i === 12) { 
            cell.classList.add('free-node', 'selected');
            cell.innerHTML = "★";
        } else {
            cell.onclick = () => cell.classList.toggle('selected');
        }
        gridSeleccion.appendChild(cell);
    }
}

// --- 2. LÓGICA DE PRESETS ---
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
    document.querySelectorAll('.select-cell').forEach((c, i) => {
        if(i !== 12) c.classList.remove('selected');
    });
}

// --- 3. CONFIGURACIÓN DEL JUEGO ---
document.getElementById('btnConfirmarPatron').onclick = () => {
    const seleccionadas = document.querySelectorAll('.select-cell.selected');
    if (seleccionadas.length <= 1) return alert("Dibuja un patrón primero.");

    patronPersonalizado = Array.from(document.querySelectorAll('.select-cell')).map((cell, index) => {
        return cell.classList.contains('selected') ? index : null;
    }).filter(val => val !== null);

    modal.style.display = "none";
    drawBtn.disabled = false;
    document.getElementById('labelPatron').innerText = "PATRÓN LISTO ✅";
};

// --- 4. SORTEO Y RECIENTES ---
drawBtn.onclick = () => {
    if (drawnNumbers.length >= 75) return;

    let num;
    do { num = Math.floor(Math.random() * 75) + 1; } while (drawnNumbers.includes(num));

    drawnNumbers.push(num);
    
    document.getElementById('currentNumber').innerText = num;
    document.getElementById('currentLetter').innerText = getLetra(num);
    document.getElementById(`slot-${num}`).classList.add('active');
    document.getElementById('count').innerText = drawnNumbers.length;

    // Efecto visual en el contador de cartones al sortear
    if(countDisplay) {
        countDisplay.style.transform = "scale(1.2)";
        setTimeout(() => countDisplay.style.transform = "scale(1)", 200);
    }

    actualizarRecientes();
    escanearCartonesRadar();
};

function getLetra(n) {
    if (n <= 15) return 'B'; if (n <= 30) return 'I';
    if (n <= 45) return 'N'; if (n <= 60) return 'G'; return 'O';
}

function actualizarRecientes() {
    const ultimos = drawnNumbers.slice(-6, -1).reverse();
    recentList.innerHTML = ultimos.map(n => `<div class="recent-ball">${n}</div>`).join("");
}

// --- 5. RADAR REAL (Escaneo de base de datos completa) ---
function escanearCartonesRadar() {
    let huboGanador = false;
    
    baseDatosCartones.forEach(cartonInfo => {
        if (ganadoresDetectados.has(cartonInfo.id)) return;
        
        const matriz = generarMatrizCarton(cartonInfo.id);
        if (validarBingo(matriz, patronPersonalizado, drawnNumbers)) {
            ganadoresDetectados.add(cartonInfo.id);
            huboGanador = true;
        }
    });
    
    if (huboGanador) actualizarTextoRadar();
}

function actualizarTextoRadar() {
    const ids = Array.from(ganadoresDetectados);
    if (ids.length === 0) {
        textoGanadores.innerText = "Esperando grito de Bingo...";
        return;
    }
    
    const html = ids.map(id => {
        const p = baseDatosCartones.find(c => c.id === id);
        const nombre = p ? p.apodo : "Jugador";
        return `<span class="highlight-id" onclick="verRapido(${id})" style="display:inline-block; background:rgba(255,183,3,0.2); padding:2px 8px; border-radius:5px; cursor:pointer; border:1px solid #ffb703; margin:2px;">
                    🏆 ${nombre} (#${id})
                </span>`;
    }).join(" ");
    
    textoGanadores.innerHTML = html;
}

function verRapido(id) {
    document.getElementById('idABuscar').value = id;
    verificarManual();
}

document.getElementById('btnVerificar').onclick = verificarManual;

function verificarManual() {
    const idEntrada = parseInt(document.getElementById('idABuscar').value);
    const cartonInfo = baseDatosCartones.find(c => c.id === idEntrada);
    
    if (!cartonInfo) return alert("Este ID no existe en tu lista de cartones.");
    
    const matriz = generarMatrizCarton(idEntrada);
    const win = validarBingo(matriz, patronPersonalizado, drawnNumbers);
    renderMiniatura(idEntrada, cartonInfo.apodo, matriz, win, document.getElementById('areaVerificacion'));
}

function validarBingo(matrix, indices, cantados) {
    const flat = matrix.flat();
    return indices.every(idx => flat[idx] === "FREE" || cantados.includes(flat[idx]));
}

// --- 6. GENERADOR Y RENDER ---
function generarMatrizCarton(id) {
    const seed = parseInt(id);
    const rangos = [[1,15],[16,30],[31,45],[46,60],[61,75]];
    const columnas = rangos.map(r => {
        let n = []; for(let i=r[0]; i<=r[1]; i++) n.push(i);
        return shuffle(n, seed).slice(0, 5);
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
    let m = array.length, t, i;
    while (m) {
        i = Math.floor(Math.abs(Math.sin(seed++)) * m--);
        t = array[m]; array[m] = array[i]; array[i] = t;
    }
    return array;
}

function renderMiniatura(id, apodo, matrix, win, container) {
    let html = `<div style="background:white; padding:15px; border-radius:15px; border:4px solid ${win?'#ffb703':'#334155'}; box-shadow:0 10px 20px rgba(0,0,0,0.2); animation: fadeIn 0.3s;">`;
    html += `<div style="background:${win?'#ffb703':'#1d3557'}; color:${win?'#1d3557':'white'}; font-weight:900; text-align:center; padding:5px; margin:-15px -15px 10px -15px; border-radius:10px 10px 0 0; font-size:0.9rem;">${win?'🎉 BINGO: '+apodo.toUpperCase():'ID: '+id+' - '+apodo.toUpperCase()}</div>`;
    html += `<table style="width:100%; border-collapse:collapse; text-align:center; background:#f8fafc;">`;
    
    html += `<tr>`;
    ['B','I','N','G','O'].forEach(l => html += `<td style="background:#1d3557; color:white; font-size:0.8rem; font-weight:900; border:1px solid #fff;">${l}</td>`);
    html += `</tr>`;

    matrix.forEach(fila => {
        html += "<tr>";
        fila.forEach(celda => {
            const hit = (celda === "FREE" || drawnNumbers.includes(celda));
            const bg = hit ? '#ffb703' : 'transparent';
            const color = hit ? '#1d3557' : '#64748b';
            html += `<td style="border:1px solid #e2e8f0; padding:6px; font-size:0.9rem; font-weight:900; background:${bg}; color:${color};">${celda==='FREE'?'★':celda}</td>`;
        });
        html += "</tr>";
    });
    
    html += `</table></div>`;
    container.innerHTML = html;
}

document.getElementById('resetBtn').onclick = () => { if(confirm("¿Reiniciar partida? Se borrarán los números cantados.")) location.reload(); };
document.getElementById('btnAbrirConfig').onclick = () => { modal.style.display = "flex"; };