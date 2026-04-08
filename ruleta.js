// --- 1. VARIABLES DE ESTADO Y DATOS ---
let drawnNumbers = [];
let patronPersonalizado = [];
let ganadoresDetectados = new Set();
// Carga la base de datos sincronizada desde localStorage
let baseDatosCartones = JSON.parse(localStorage.getItem('bingo_cartones')) || [];

// Elementos del DOM
const drawBtn = document.getElementById('drawBtn');
const modal = document.getElementById('modalPatron');
const gridSeleccion = document.getElementById('gridSeleccion');
const textoGanadores = document.getElementById('textoGanadores');
const recentList = document.getElementById('recentList');
const countDisplay = document.getElementById('contadorCartonesReal');

// --- 2. INICIALIZACIÓN ---
window.onload = () => {
    // Validación de seguridad: Evita jugar sin cartones
    if (baseDatosCartones.length < 1) {
        document.body.innerHTML = `
            <div style="height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#1d3557; color:white; text-align:center; font-family:sans-serif; padding:20px;">
                <h1 style="color:#ffb703; font-size:3rem; margin-bottom:10px;">⚠️ ¡SIN CARTONES!</h1>
                <p style="font-size:1.2rem; max-width:600px;">Debes generar o importar cartones antes de iniciar la ruleta.</p>
                <br>
                <button onclick="window.location.href='index.html'" style="padding:15px 40px; background:#e63946; color:white; border:none; border-radius:10px; font-weight:900; cursor:pointer;">IR AL GENERADOR</button>
            </div>
        `;
        return;
    }

    generarTableroDerecho();
    crearCuadriculaDibujo();
    actualizarContadorCartones();
    modal.style.display = "flex"; // Abrir selector de patrón al inicio
};

function actualizarContadorCartones() {
    if (countDisplay) countDisplay.innerText = `JUGANDO: ${baseDatosCartones.length}`;
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

// --- 3. LÓGICA DE PATRONES (BINGO) ---
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

document.getElementById('btnConfirmarPatron').onclick = () => {
    const seleccionadas = document.querySelectorAll('.select-cell.selected');
    if (seleccionadas.length <= 1) return alert("Dibuja el patrón de victoria.");

    patronPersonalizado = Array.from(document.querySelectorAll('.select-cell')).map((cell, index) => {
        return cell.classList.contains('selected') ? index : null;
    }).filter(val => val !== null);

    modal.style.display = "none";
    drawBtn.disabled = false;
    document.getElementById('labelPatron').innerText = "MODO: PERSONALIZADO ✅";
};

// --- 4. SORTEO DE NÚMEROS ---
drawBtn.onclick = () => {
    if (drawnNumbers.length >= 75) return alert("¡Todas las bolas han salido!");

    let num;
    do { num = Math.floor(Math.random() * 75) + 1; } while (drawnNumbers.includes(num));

    drawnNumbers.push(num);
    
    // UI Updates
    document.getElementById('currentNumber').innerText = num;
    document.getElementById('currentLetter').innerText = getLetra(num);
    document.getElementById(`slot-${num}`).classList.add('active');
    document.getElementById('count').innerText = drawnNumbers.length;

    // --- CAMBIO CLAVE: NOTIFICAR A LOS JUGADORES VÍA FIREBASE ---
    if (typeof mandarNumeroAlJuego === "function") {
        mandarNumeroAlJuego(num);
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

// --- 5. EL "RADAR": ESCANEO AUTOMÁTICO DE GANADORES ---
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
    if (ids.length === 0) return;
    
    const html = ids.map(id => {
        const p = baseDatosCartones.find(c => c.id === id);
        const nombre = p ? p.apodo : "Jugador";
        return `<span class="highlight-id" onclick="verRapido(${id})" style="display:inline-block; background:#ffb703; color:#1d3557; padding:5px 12px; border-radius:20px; cursor:pointer; font-weight:bold; margin:3px; font-size:0.8rem; border:2px solid white;">
                    🏆 ${nombre} (#${id})
                </span>`;
    }).join(" ");
    
    textoGanadores.innerHTML = html;
}

function validarBingo(matrix, indices, cantados) {
    const flat = matrix.flat(); // Convierte tabla 5x5 a lista de 25
    return indices.every(idx => flat[idx] === "FREE" || cantados.includes(flat[idx]));
}

// --- 6. VERIFICACIÓN MANUAL (SINCRONIZADA) ---
function verRapido(id) {
    document.getElementById('idABuscar').value = id;
    verificarManual();
}

document.getElementById('btnVerificar').onclick = verificarManual;

function verificarManual() {
    const idEntrada = parseInt(document.getElementById('idABuscar').value);
    const cartonInfo = baseDatosCartones.find(c => c.id === idEntrada);
    
    if (!cartonInfo) return alert("ID no encontrado en la base de datos.");
    
    const matriz = generarMatrizCarton(idEntrada);
    const win = validarBingo(matriz, patronPersonalizado, drawnNumbers);
    renderMiniatura(idEntrada, cartonInfo.apodo, matriz, win, document.getElementById('areaVerificacion'));
}

// --- 7. LÓGICA MATEMÁTICA (EL MOTOR DE SINCRONIZACIÓN) ---
function generarMatrizCarton(id) {
    const seedBase = parseInt(id);
    const rangos = [[1,15],[16,30],[31,45],[46,60],[61,75]];
    
    const columnas = rangos.map((r, indexCol) => {
        let n = []; for(let i=r[0]; i<=r[1]; i++) n.push(i);
        // Sincronización: Cada columna usa una semilla única derivada del ID
        return shuffleSincronizado([...n], seedBase + indexCol).slice(0, 5);
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

function shuffleSincronizado(array, seed) {
    let m = array.length, t, i;
    while (m) {
        // Algoritmo determinista basado en el ID
        i = Math.floor(Math.abs(Math.sin(seed++)) * m--);
        t = array[m]; 
        array[m] = array[i]; 
        array[i] = t;
    }
    return array;
}

// --- 8. RENDERIZADO VISUAL ---
function renderMiniatura(id, apodo, matrix, win, container) {
    let html = `<div style="background:white; padding:15px; border-radius:15px; border:4px solid ${win?'#25d366':'#334155'}; box-shadow:0 10px 20px rgba(0,0,0,0.2);">`;
    html += `<div style="background:${win?'#25d366':'#1d3557'}; color:white; font-weight:900; text-align:center; padding:8px; margin:-15px -15px 10px -15px; border-radius:10px 10px 0 0;">${win?'🎉 BINGO DETECTADO':'VERIFICANDO: #'+id}</div>`;
    html += `<div style="text-align:center; margin-bottom:5px; font-weight:bold; color:#1d3557;">${apodo.toUpperCase()}</div>`;
    html += `<table style="width:100%; border-collapse:collapse; text-align:center;">`;
    
    matrix.forEach((fila, rowIndex) => {
        html += "<tr>";
        fila.forEach((celda, colIndex) => {
            const indexLineal = rowIndex * 5 + colIndex;
            const esParteDelPatron = patronPersonalizado.includes(indexLineal);
            const hit = (celda === "FREE" || drawnNumbers.includes(celda));
            
            // Estilos de celda
            let bg = hit ? '#ffb703' : 'transparent';
            let border = esParteDelPatron ? '2px solid #e63946' : '1px solid #e2e8f0';
            let color = hit ? '#1d3557' : '#94a3b8';
            
            html += `<td style="border:${border}; padding:6px; font-size:0.85rem; font-weight:900; background:${bg}; color:${color};">
                        ${celda==='FREE'?'★':celda}
                    </td>`;
        });
        html += "</tr>";
    });
    
    html += `</table></div>`;
    container.innerHTML = html;
}

// Controles Adicionales
document.getElementById('resetBtn').onclick = () => { 
    if(confirm("¿Seguro? Se perderá el progreso de esta partida.")) location.reload(); 
};
document.getElementById('btnAbrirConfig').onclick = () => { modal.style.display = "flex"; };
