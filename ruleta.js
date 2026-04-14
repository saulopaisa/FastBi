const firebaseConfig = {
    apiKey: "AIzaSyAOHYo0w41dV6TRarAaGt58Zxn4o47dNUE",
    authDomain: "bingofast.firebaseapp.com",
    databaseURL: "https://bingofast-default-rtdb.firebaseio.com",
    projectId: "bingofast",
    storageBucket: "bingofast.firebasestorage.app",
    messagingSenderId: "473863283329",
    appId: "1:473863283329:web:2c4bf96de167d105fa6380"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let cantados = [];
let patronVictoria = Array(25).fill(false);
let cartonesParticipantes = {};

document.addEventListener('DOMContentLoaded', () => {
    generarTableroSeguimiento();
    inicializarListeners();
    cargarListaCartones(); // Cargar cartones para seleccionar quién juega
    
    document.getElementById('btnAbrirConfig').onclick = () => {
        document.getElementById('modalConfig').style.display = 'flex';
        crearCuadriculaDibujo();
    };
});

function inicializarListeners() {
    // 1. Contador de Jugadores Online
    db.ref('presencia').on('value', snap => {
        const count = snap.exists() ? Object.keys(snap.val()).length : 0;
        document.getElementById('onlineCount').innerText = `👥 JUGADORES ONLINE: ${count}`;
    });

    // 2. Bolas y Tablero
    db.ref('historialBolas').on('value', snap => {
        cantados = snap.exists() ? Object.values(snap.val()) : [];
        actualizarTableroVisual();
    });

    // 3. Estado de la Partida
    db.ref('partidaActual').on('value', snap => {
        const data = snap.val();
        if (!data) return;

        const timer = document.getElementById('cronometroBingo');
        if (data.status === 'esperando' && data.proximoJuego) {
            correrReloj(data.proximoJuego);
            bloquearTodo(true); // Bloquear sorteo mientras hay reloj
        } else if (data.status === 'jugando') {
            timer.innerText = "00:00";
            bloquearTodo(false); // Habilitar sorteo
        }
    });
}

// --- GESTIÓN DE PARTICIPANTES ---
function cargarListaCartones() {
    db.ref('cartonesGenerados').once('value', snap => {
        const lista = document.getElementById('listaParticipantes');
        lista.innerHTML = '';
        if (!snap.exists()) return;

        snap.forEach(child => {
            const id = child.key;
            const item = document.createElement('div');
            item.className = 'card-item';
            item.innerHTML = `
                <span>Cartón #${id}</span>
                <input type="checkbox" id="check-${id}" checked onchange="toggleParticipante('${id}')">
            `;
            lista.appendChild(item);
            cartonesParticipantes[id] = true; // Por defecto todos juegan
        });
        actualizarParticipantesDB();
    });
}

function toggleParticipante(id) {
    cartonesParticipantes[id] = document.getElementById(`check-${id}`).checked;
    actualizarParticipantesDB();
}

function actualizarParticipantesDB() {
    // Guardamos en un nodo aparte quiénes están activos para esta partida
    const activos = Object.keys(cartonesParticipantes).filter(id => cartonesParticipantes[id]);
    db.ref('partidaActual/participantesActivos').set(activos);
}

// --- FLUJO DE CONTROL (BLOQUEOS) ---
function bloquearTodo(bloquear) {
    document.getElementById('drawBtn').disabled = bloquear;
    document.getElementById('btnVerificando').disabled = bloquear;
    document.getElementById('btnEmpezar').disabled = !bloquear; // Solo se habilita si hay reloj o pausa
}

function guardarPatron() {
    db.ref('configuracion/patron').set(patronVictoria).then(() => {
        document.getElementById('btnProgramar').disabled = false;
        document.getElementById('btnAbrirConfig').innerText = "✅ PATRÓN LISTO";
        document.getElementById('modalConfig').style.display = 'none';
        alert("Paso 1 completado: Patrón guardado. Ahora programa el tiempo.");
    });
}

function programarJuego() {
    const min = document.getElementById('minutosInicio').value;
    if (!min) return alert("Coloca los minutos primero.");
    
    const target = Date.now() + (min * 60000);
    db.ref('partidaActual').update({
        status: 'esperando',
        proximoJuego: target,
        anuncio: `EL JUEGO INICIA EN ${min} MINUTOS`
    });
}

// --- CRONÓMETRO ---
function correrReloj(target) {
    const timer = document.getElementById('cronometroBingo');
    const interval = setInterval(() => {
        const dif = target - Date.now();
        if (dif <= 0) {
            clearInterval(interval);
            timer.innerText = "¡YA!";
            return;
        }
        const min = Math.floor(dif / 60000);
        const seg = Math.floor((dif % 60000) / 1000);
        timer.innerText = `${min}:${seg < 10 ? '0'+seg : seg}`;
    }, 1000);
}

// --- FUNCIONES DE JUEGO ---
function sortearProximo() {
    if (cantados.length >= 75) return;
    let num;
    do { num = Math.floor(Math.random() * 75) + 1; } while (cantados.includes(num));
    
    const letras = ['B','I','N','G','O'];
    const letra = letras[Math.floor((num-1)/15)];
    
    db.ref('historialBolas').push(num);
    db.ref('partidaActual').update({ numero: num, letra: letra, status: "jugando", anuncio: `BOLA CANTADA: ${letra}${num}` });
}

function cambiarEstado(st, msg) {
    db.ref('partidaActual').update({ status: st, anuncio: msg });
    if(st === 'jugando') db.ref('notificaciones/bingo').remove();
}

function anunciarGanador() {
    const id = document.getElementById('idABuscar').value;
    if(!id) return alert("ID necesario");
    cambiarEstado('finalizado', `🏆 ¡TENEMOS UN GANADOR! CARTÓN #${id} 🏆`);
}

// --- VISUAL Y TABLERO ---
function generarTableroSeguimiento() {
    const tablero = document.getElementById('historyGrid');
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
        const n = parseInt(c.innerText);
        c.classList.toggle('cantada', cantados.includes(n));
    });
}

function crearCuadriculaDibujo() {
    const cont = document.getElementById('gridDibujoPatron');
    cont.innerHTML = '';
    patronVictoria.forEach((act, i) => {
        const d = document.createElement('div');
        d.className = `celda-patron-admin ${act ? 'activa' : ''}`;
        if(i === 12) { d.innerText = "★"; d.classList.add('activa'); patronVictoria[i] = true; }
        d.onclick = () => { if(i!==12){ patronVictoria[i] = !patronVictoria[i]; d.classList.toggle('activa'); } };
        cont.appendChild(d);
    });
}

document.getElementById('drawBtn').onclick = sortearProximo;
document.getElementById('resetBtn').onclick = () => {
    if(confirm("Reiniciar partida?")) {
        db.ref().update({ 'historialBolas': null, 'notificaciones/bingo': null, 'partidaActual/status': 'reinicio' });
        location.reload();
    }
};
