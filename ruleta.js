// CONFIGURACIÓN FIREBASE (Mantener la tuya)
const firebaseConfig = { /* ... tu config ... */ };
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let cantados = [];
let patronVictoria = Array(25).fill(false);
let sorteoAutomaticoRealizado = false;

document.addEventListener('DOMContentLoaded', () => {
    generarTableroSeguimiento();
    inicializarListeners();
});

function inicializarListeners() {
    // Sincronizar Bolas
    db.ref('historialBolas').on('value', snap => {
        cantados = snap.exists() ? Object.values(snap.val()) : [];
        actualizarTableroVisual();
        if(document.getElementById('idABuscar').value) revisarCartonManual(); // Re-chequear miniatura si hay búsqueda activa
    });

    // Sincronizar Cronómetro y Estado
    db.ref('partidaActual').on('value', snap => {
        const data = snap.val();
        if (!data) return;

        // Lógica del Cronómetro
        if (data.status === 'esperando' && data.proximoJuego) {
            actualizarReloj(data.proximoJuego);
        } else {
            document.getElementById('cronometroBingo').innerText = "00:00";
        }
        
        // Actualizar Badge
        const b = document.getElementById('badgeEstado');
        if(b) { b.innerText = `Estado: ${data.status.toUpperCase()}`; b.className = `status-badge status-${data.status}`; }
    });
}

// --- CRONÓMETRO Y AUTO-SORTEO ---
function actualizarReloj(target) {
    const ahora = Date.now();
    const dif = target - ahora;

    if (dif <= 0) {
        document.getElementById('cronometroBingo').innerText = "¡YA!";
        if (!sorteoAutomaticoRealizado) {
            sorteoAutomaticoRealizado = true;
            cambiarEstado('jugando', '¡EL JUEGO HA COMENZADO!');
            setTimeout(sortearProximo, 1000); // Primer sorteo automático
        }
        return;
    }

    const min = Math.floor(dif / 60000);
    const seg = Math.floor((dif % 60000) / 1000);
    document.getElementById('cronometroBingo').innerText = 
        `${min.toString().padStart(2, '0')}:${seg.toString().padStart(2, '0')}`;
    
    setTimeout(() => actualizarReloj(target), 1000);
}

function programarJuego() {
    const min = document.getElementById('minutosInicio').value || 1;
    const tiempoTarget = Date.now() + (min * 60000);
    sorteoAutomaticoRealizado = false; // Reset flag
    db.ref('partidaActual').update({
        status: 'esperando',
        proximoJuego: tiempoTarget,
        anuncio: `INICIAMOS EN ${min} MINUTOS`
    });
}

// --- BUSCADOR CON MINIATURA ---
async function revisarCartonManual() {
    const id = document.getElementById('idABuscar').value;
    if (!id) return;

    // Obtener datos del cartón de Firebase
    db.ref(`cartonesGenerados/${id}`).once('value', snap => {
        if (!snap.exists()) {
            document.getElementById('areaVerificacion').innerHTML = "<small style='color:red'>No existe</small>";
            return;
        }
        dibujarMiniatura(snap.val().numeros, id);
    });
}

function dibujarMiniatura(numeros, id) {
    const area = document.getElementById('areaVerificacion');
    let html = `<div style='text-align:center; font-weight:bold; margin-top:5px;'>CARTÓN #${id}</div>`;
    html += `<div class="mini-carton-grid">`;
    
    numeros.forEach((num, index) => {
        const esCantada = cantados.includes(num);
        const esCentro = index === 12;
        const clase = esCentro ? 'mini-celda estrella' : (esCantada ? 'mini-celda marcada' : 'mini-celda');
        html += `<div class="${clase}">${esCentro ? '★' : num}</div>`;
    });
    
    html += `</div>`;
    area.innerHTML = html;
}

// --- RESTO DE FUNCIONES (CORREGIDAS) ---
function sortearProximo() {
    if (cantados.length >= 75) return;
    let num;
    do { num = Math.floor(Math.random() * 75) + 1; } while (cantados.includes(num));
    
    const letra = num <= 15 ? 'B' : num <= 30 ? 'I' : num <= 45 ? 'N' : num <= 60 ? 'G' : 'O';
    document.getElementById('currentLetter').innerText = letra;
    document.getElementById('currentNumber').innerText = num;

    db.ref('historialBolas').push(num);
    db.ref('partidaActual').update({ numero: num, letra: letra, status: "jugando" });
}

function cambiarEstado(st, msg) {
    db.ref('partidaActual').update({ status: st, anuncio: msg });
}

function generarTableroSeguimiento() {
    const tablero = document.getElementById('historyGrid');
    if (!tablero) return;
    tablero.innerHTML = '';
    for (let i = 1; i <= 75; i++) {
        const div = document.createElement('div');
        div.id = `num-${i}`;
        div.className = 'celda-seguimiento';
        div.innerText = i;
        tablero.appendChild(div);
    }
}

function actualizarTableroVisual() {
    document.querySelectorAll('.celda-seguimiento').forEach(c => {
        const num = parseInt(c.innerText);
        c.classList.toggle('cantada', cantados.includes(num));
    });
    const cont = document.getElementById('count');
    if (cont) cont.innerText = cantados.length;
}

// Evitar errores de patroneo
function crearCuadriculaDibujo() {
    const contenedor = document.getElementById('gridDibujoPatron');
    if(!contenedor) return;
    // ... lógica de dibujo ...
}
