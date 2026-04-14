// Configuración Firebase (la misma de antes)
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

document.addEventListener('DOMContentLoaded', () => {
    generarTablero75();
    vincularFirebase();
});

function vincularFirebase() {
    // Contador Online
    db.ref('presencia').on('value', snap => {
        const count = snap.exists() ? Object.keys(snap.val()).length : 0;
        document.getElementById('onlineCount').innerText = `👥 ONLINE: ${count}`;
    });

    // Historial de Bolas
    db.ref('historialBolas').on('value', snap => {
        cantados = snap.exists() ? Object.values(snap.val()) : [];
        actualizarTableroVisual();
    });
}

// --- PASO 1: SELECCIONAR JUGADORES ---
function abrirModalCartones() {
    db.ref('cartonesGenerados').once('value', snap => {
        const cont = document.getElementById('listaCheckCartones');
        cont.innerHTML = '';
        if(!snap.exists()) return alert("No hay cartones en la base de datos.");
        
        snap.forEach(child => {
            const id = child.key;
            cont.innerHTML += `<label style="display:flex; gap:5px; font-size:0.8rem; background:#334155; padding:5px; border-radius:4px;">
                <input type="checkbox" value="${id}" checked> #${id}
            </label>`;
        });
        document.getElementById('modalCartones').style.display = 'flex';
    });
}

function confirmarJugadores() {
    const checks = document.querySelectorAll('#listaCheckCartones input:checked');
    const ids = Array.from(checks).map(c => c.value);
    
    db.ref('partidaActual/participantesActivos').set(ids).then(() => {
        document.getElementById('modalCartones').style.display = 'none';
        document.getElementById('btnEtapa1').innerText = "✅ 1. JUGADORES LISTOS";
        document.getElementById('btnEtapa2').disabled = false; // DESBLOQUEA PASO 2
        alert("Paso 1 completado. Ahora configura el patrón.");
    });
}

// --- PASO 2: PATRÓN ---
function abrirModalPatron() {
    document.getElementById('modalPatron').style.display = 'flex';
    dibujarCuadriculaPatron();
}

function dibujarCuadriculaPatron() {
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

function aplicarPredefinido(tipo) {
    if(tipo === 'lleno') patronVictoria = Array(25).fill(true);
    if(tipo === 'equis') {
        patronVictoria = Array(25).fill(false);
        for(let i=0; i<5; i++) { patronVictoria[i*6] = true; patronVictoria[i*4 + 4] = true; }
    }
    if(tipo === 'limpiar') patronVictoria = Array(25).fill(false);
    patronVictoria[12] = true;
    dibujarCuadriculaPatron();
}

function confirmarPatron() {
    db.ref('configuracion/patron').set(patronVictoria).then(() => {
        document.getElementById('modalPatron').style.display = 'none';
        document.getElementById('btnEtapa2').innerText = "✅ 2. PATRÓN LISTO";
        document.getElementById('panelJuego').style.opacity = "1";
        document.getElementById('panelJuego').style.pointerEvents = "auto"; // DESBLOQUEA JUEGO
        alert("Paso 2 completado. El juego está habilitado.");
    });
}

// --- PASO 3: JUEGO ---
function programarJuego() {
    const min = document.getElementById('minutosInicio').value;
    if(!min) return alert("Indica los minutos");
    const target = Date.now() + (min * 60000);
    db.ref('partidaActual').update({ status: 'esperando', proximoJuego: target, anuncio: `EL BINGO EMPIEZA EN ${min} MIN` });
    iniciarCuentaAtras(target);
}

function iniciarCuentaAtras(target) {
    const timer = document.getElementById('cronometroBingo');
    const intv = setInterval(() => {
        const dif = target - Date.now();
        if(dif <= 0) { clearInterval(intv); timer.innerText = "¡YA!"; return; }
        const m = Math.floor(dif/60000);
        const s = Math.floor((dif%60000)/1000);
        timer.innerText = `${m}:${s < 10 ? '0'+s : s}`;
    }, 1000);
}

function cambiarEstado(st, msg) {
    db.ref('partidaActual').update({ status: st, anuncio: msg });
}

function generarTablero75() {
    const grid = document.getElementById('historyGrid');
    grid.innerHTML = '';
    for(let i=1; i<=75; i++) {
        grid.innerHTML += `<div class="celda-seguimiento" id="num-${i}">${i}</div>`;
    }
}

function actualizarTableroVisual() {
    document.querySelectorAll('.celda-seguimiento').forEach(c => {
        const n = parseInt(c.innerText);
        c.classList.toggle('cantada', cantados.includes(n));
    });
}

document.getElementById('drawBtn').onclick = () => {
    if(cantados.length >= 75) return;
    let n; do { n = Math.floor(Math.random()*75)+1; } while(cantados.includes(n));
    db.ref('historialBolas').push(n);
    const letras = ['B','I','N','G','O'];
    const letra = letras[Math.floor((n-1)/15)];
    db.ref('partidaActual').update({ numero: n, letra: letra, status: 'jugando', anuncio: `BOLA: ${letra}-${n}` });
};

document.getElementById('resetBtn').onclick = () => {
    if(confirm("¿Reiniciar todo?")) {
        db.ref().update({ historialBolas: null, 'partidaActual/status': 'reinicio' });
        location.reload();
    }
};
