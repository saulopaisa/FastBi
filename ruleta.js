// CONFIGURACIÓN FIREBASE (Usa la tuya)
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
let patronSeleccionado = false;
let estadoActual = 'esperando';

document.addEventListener('DOMContentLoaded', () => {
    generarTableroSeguimiento();
    inicializarListeners();
    
    document.getElementById('btnAbrirConfig').onclick = () => {
        document.getElementById('modalConfig').style.display = 'flex';
        crearCuadriculaDibujo();
    };
});

function inicializarListeners() {
    db.ref('historialBolas').on('value', snap => {
        cantados = snap.exists() ? Object.values(snap.val()) : [];
        actualizarTableroVisual();
    });

    db.ref('partidaActual').on('value', snap => {
        const data = snap.val();
        if (!data) return;
        
        estadoActual = data.status;

        // REGLA: Si hay temporizador activo, deshabilitar botón de sorteo
        const drawBtn = document.getElementById('drawBtn');
        if (data.status === 'esperando') {
            drawBtn.disabled = true;
            drawBtn.innerText = "ESPERANDO RELOJ...";
            correrReloj(data.proximoJuego);
        } else {
            drawBtn.disabled = false;
            drawBtn.innerText = "SORTEAR PRÓXIMO";
            document.getElementById('cronometroBingo').innerText = "00:00";
        }

        const b = document.getElementById('badgeEstado');
        b.innerText = `Estado: ${data.status.toUpperCase()}`;
        b.className = `status-badge status-${data.status}`;
    });
}

// --- LÓGICA DE FLUJO ADMIN ---
function programarJuego() {
    if (!patronSeleccionado) {
        alert("¡ALTO! Primero debes configurar y guardar el PATRÓN de victoria.");
        return;
    }
    const min = document.getElementById('minutosInicio').value;
    if (!min || min <= 0) {
        alert("Por favor, coloca un tiempo (minutos) para iniciar.");
        return;
    }

    const target = Date.now() + (min * 60000);
    db.ref('partidaActual').update({
        status: 'esperando',
        proximoJuego: target,
        anuncio: `EL JUEGO INICIA EN ${min} MINUTOS`
    });
}

function guardarPatron() {
    const check = patronVictoria.filter(p => p === true).length;
    if (check < 2) {
        alert("Selecciona un patrón válido (al menos 2 casillas).");
        return;
    }

    db.ref('configuracion/patron').set(patronVictoria).then(() => {
        patronSeleccionado = true;
        document.getElementById('btnProgramar').disabled = false;
        document.getElementById('guiaAdmin').innerHTML = "✅ Patrón guardado. Ahora coloca el tiempo y dale a PROGRAMAR.";
        document.getElementById('guiaAdmin').style.borderLeftColor = "#10b981";
        document.getElementById('modalConfig').style.display = 'none';
        alert("Patrón guardado correctamente. Ya puedes programar el tiempo.");
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
            if (estadoActual === 'esperando') {
                cambiarEstado('jugando', '¡EMPEZAMOS!');
                sortearProximo(); // Auto-sorteo una vez al terminar
            }
            return;
        }
        const min = Math.floor(dif / 60000);
        const seg = Math.floor((dif % 60000) / 1000);
        timer.innerText = `${min}:${seg < 10 ? '0'+seg : seg}`;
    }, 1000);
}

// --- FUNCIONES DE BINGO ---
function sortearProximo() {
    if (estadoActual === 'esperando') return;
    if (cantados.length >= 75) return;
    
    let num;
    do { num = Math.floor(Math.random() * 75) + 1; } while (cantados.includes(num));
    
    const letras = ['B','I','N','G','O'];
    const letra = letras[Math.floor((num-1)/15)];
    
    document.getElementById('currentLetter').innerText = letra;
    document.getElementById('currentNumber').innerText = num;
    db.ref('historialBolas').push(num);
    db.ref('partidaActual').update({ numero: num, letra: letra, status: "jugando" });
}

function cambiarEstado(st, msg) {
    db.ref('partidaActual').update({ status: st, anuncio: msg });
    if(st === 'jugando') db.ref('notificaciones/bingo').remove();
}

function anunciarGanador() {
    const id = document.getElementById('idABuscar').value;
    if(!id) return alert("Ingresa el ID del cartón ganador");
    cambiarEstado('finalizado', `🏆 ¡EL CARTÓN #${id} ES EL GANADOR! 🏆`);
}

// --- VISUAL ---
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
    if(confirm("¿Seguro que quieres borrar todo y reiniciar?")){
        db.ref().update({
            'historialBolas': null,
            'notificaciones/bingo': null,
            'partidaActual': { status: 'reinicio', numero: '--', letra: '-' }
        });
        location.reload();
    }
};
