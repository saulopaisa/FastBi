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
let cartonesSeleccionados = [];

document.addEventListener('DOMContentLoaded', () => {
    generarTableroSeguimiento();
    inicializarListeners();
});

function inicializarListeners() {
    // Contador Online
    db.ref('presencia').on('value', snap => {
        const count = snap.exists() ? Object.keys(snap.val()).length : 0;
        document.getElementById('onlineCount').innerText = `👥 JUGADORES ONLINE: ${count}`;
    });

    // Bolas
    db.ref('historialBolas').on('value', snap => {
        cantados = snap.exists() ? Object.values(snap.val()) : [];
        actualizarTableroVisual();
    });

    // Estado Partida
    db.ref('partidaActual').on('value', snap => {
        const data = snap.val();
        if (!data) return;
        
        const drawBtn = document.getElementById('drawBtn');
        const vBtn = document.getElementById('btnVerificando');
        const eBtn = document.getElementById('btnErrado');
        const valBtn = document.getElementById('btnValido');

        if (data.status === 'esperando') {
            correrReloj(data.proximoJuego);
            drawBtn.disabled = true;
        } else if (data.status === 'jugando' || data.status === 'verificando') {
            document.getElementById('cronometroBingo').innerText = "00:00";
            drawBtn.disabled = false;
            vBtn.disabled = false;
            eBtn.disabled = false;
            valBtn.disabled = false;
        }
    });
}

// --- MODAL PATRÓN ---
function abrirModalPatron() {
    document.getElementById('modalPatron').style.display = 'flex';
    crearCuadriculaDibujo();
}

function aplicarPredefinido(tipo) {
    patronVictoria = Array(25).fill(false);
    if(tipo === 'lleno') patronVictoria = Array(25).fill(true);
    if(tipo === 'equis') {
        for(let i=0; i<5; i++) { patronVictoria[i*6] = true; patronVictoria[i*4 + 4] = true; }
    }
    if(tipo === 'esquinas') {
        patronVictoria[0] = patronVictoria[4] = patronVictoria[20] = patronVictoria[24] = true;
    }
    patronVictoria[12] = true; // El centro siempre es estrella
    crearCuadriculaDibujo();
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

function guardarPatron() {
    db.ref('configuracion/patron').set(patronVictoria).then(() => {
        document.getElementById('modalPatron').style.display = 'none';
        document.getElementById('btnAbrirCartones').disabled = false; // Desbloquea paso 2
        document.getElementById('btnAbrirConfig').innerText = "✅ PATRÓN GUARDADO";
        alert("Paso 1: Patrón guardado. Ahora selecciona los cartones.");
    });
}

// --- MODAL CARTONES ---
function abrirModalCartones() {
    db.ref('cartonesGenerados').once('value', snap => {
        const cont = document.getElementById('listaCheckCartones');
        cont.innerHTML = '';
        if(!snap.exists()) return alert("No hay cartones generados");
        
        snap.forEach(child => {
            const id = child.key;
            const div = document.createElement('div');
            div.className = 'check-item';
            div.innerHTML = `<input type="checkbox" value="${id}" checked> #${id}`;
            cont.appendChild(div);
        });
        document.getElementById('modalCartones').style.display = 'flex';
    });
}

function guardarSeleccionCartones() {
    const checks = document.querySelectorAll('#listaCheckCartones input:checked');
    cartonesSeleccionados = Array.from(checks).map(c => c.value);
    
    if(cartonesSeleccionados.length === 0) return alert("Selecciona al menos 1 cartón");
    
    db.ref('partidaActual/participantesActivos').set(cartonesSeleccionados).then(() => {
        document.getElementById('modalCartones').style.display = 'none';
        document.getElementById('btnProgramar').disabled = false; // Desbloquea paso 3
        document.getElementById('btnAbrirCartones').innerText = "✅ CARTONES LISTOS";
        alert("Paso 2: Jugadores confirmados. Ya puedes programar el inicio.");
    });
}

// --- LÓGICA DE JUEGO ---
function programarJuego() {
    const min = document.getElementById('minutosInicio').value;
    if(!min) return alert("Escribe los minutos.");
    const target = Date.now() + (min * 60000);
    db.ref('partidaActual').update({ status: 'esperando', proximoJuego: target, anuncio: `INICIO EN ${min} MINUTOS` });
}

function sortearProximo() {
    if (cantados.length >= 75) return;
    let num;
    do { num = Math.floor(Math.random() * 75) + 1; } while (cantados.includes(num));
    const letras = ['B','I','N','G','O'];
    const letra = letras[Math.floor((num-1)/15)];
    db.ref('historialBolas').push(num);
    db.ref('partidaActual').update({ numero: num, letra: letra, status: "jugando", anuncio: `BOLA: ${letra}-${num}` });
}

function cambiarEstado(st, msg) {
    db.ref('partidaActual').update({ status: st, anuncio: msg });
    if(st === 'jugando') db.ref('notificaciones/bingo').remove();
}

function anunciarGanador() {
    const id = document.getElementById('idABuscar').value;
    if(!id) return alert("Escribe el ID ganador");
    cambiarEstado('finalizado', `🏆 ¡CARTÓN #${id} ES EL GANADOR! 🏆`);
}

// --- TABLERO ---
function generarTableroSeguimiento() {
    const tablero = document.getElementById('historyGrid');
    tablero.innerHTML = '';
    for (let i = 1; i <= 75; i++) {
        const div = document.createElement('div');
        div.className = 'celda-seguimiento';
        div.id = `num-${i}`;
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

function correrReloj(target) {
    const interval = setInterval(() => {
        const dif = target - Date.now();
        if (dif <= 0) {
            clearInterval(interval);
            document.getElementById('cronometroBingo').innerText = "¡YA!";
            document.getElementById('btnEmpezar').disabled = false;
            return;
        }
        const min = Math.floor(dif / 60000);
        const seg = Math.floor((dif % 60000) / 1000);
        document.getElementById('cronometroBingo').innerText = `${min}:${seg < 10 ? '0'+seg : seg}`;
    }, 1000);
}

document.getElementById('drawBtn').onclick = sortearProximo;
document.getElementById('resetBtn').onclick = () => {
    if(confirm("¿Reiniciar partida?")){
        db.ref().update({ 'historialBolas': null, 'notificaciones/bingo': null, 'partidaActual/status': 'reinicio' });
        location.reload();
    }
};
