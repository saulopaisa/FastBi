// --- CONFIGURACIÓN FIREBASE ---
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

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    generarTableroSeguimiento();
    
    // Abrir Modal
    const btnConfig = document.getElementById('btnAbrirConfig');
    if(btnConfig) btnConfig.onclick = () => document.getElementById('modalConfig').style.display = 'flex';

    // Sincronizar historial
    db.ref('historialBolas').on('value', (snapshot) => {
        if (snapshot.exists()) {
            cantados = Object.values(snapshot.val());
            actualizarTableroVisual();
        }
    });

    // Cargar Patrón
    db.ref('configuracion/patron').on('value', (snapshot) => {
        if (snapshot.exists()) {
            patronVictoria = snapshot.val();
            const grid = document.getElementById('gridDibujoPatron');
            if (grid) crearCuadriculaDibujo(grid);
        }
    });
});

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
    document.querySelectorAll('.celda-seguimiento').forEach(c => c.classList.remove('cantada'));
    cantados.forEach(num => {
        const celda = document.getElementById(`num-${num}`);
        if (celda) celda.classList.add('cantada');
    });
    const cont = document.getElementById('count');
    if (cont) cont.innerText = cantados.length;
}

// --- SORTEO ---
const drawBtn = document.getElementById('drawBtn');
if(drawBtn) drawBtn.onclick = sortearProximo;

function sortearProximo() {
    if (cantados.length >= 75) return alert("Bingo finalizado");
    let num;
    do { num = Math.floor(Math.random() * 75) + 1; } while (cantados.includes(num));

    const letra = obtenerLetra(num);
    document.getElementById('currentLetter').innerText = letra;
    document.getElementById('currentNumber').innerText = num;

    db.ref('historialBolas').push(num);
    db.ref('partidaActual').update({
        numero: num, letra: letra, status: "jugando", ultimoCambio: Date.now()
    });
}

function obtenerLetra(n) {
    if (n <= 15) return 'B'; if (n <= 30) return 'I'; if (n <= 45) return 'N'; if (n <= 60) return 'G'; return 'O';
}

// --- ESTADOS ---
function cambiarEstado(st, msg) {
    db.ref('partidaActual').update({ status: st, anuncio: msg });
    const b = document.getElementById('badgeEstado');
    if(b) { b.innerText = `Estado: ${st}`; b.className = `status-badge status-${st}`; }
}

function anunciarVerificacion() { cambiarEstado('verificando', '⚠️ VERIFICANDO CARTÓN...'); }
function anunciarGanador() { 
    const id = prompt("ID del Ganador:"); 
    if(id) cambiarEstado('finalizado', `🏆 GANADOR #${id} 🏆`); 
}

function iniciarCuentaRegresiva() {
    const min = document.getElementById('minutosInicio').value || 1;
    const target = Date.now() + (min * 60000);
    db.ref('partidaActual').update({ status: 'esperando', proximoJuego: target, anuncio: `INICIO EN ${min} MIN` });
}

// --- PATRÓN ---
function crearCuadriculaDibujo(contenedor) {
    contenedor.innerHTML = '';
    patronVictoria.forEach((activa, index) => {
        const celda = document.createElement('div');
        celda.className = `celda-patron-admin ${activa ? 'activa' : ''}`;
        if (index === 12) { celda.classList.add('activa'); celda.innerText = "★"; }
        celda.onclick = () => { if (index === 12) return; patronVictoria[index] = !patronVictoria[index]; celda.classList.toggle('activa'); };
        contenedor.appendChild(celda);
    });
}

function guardarPatron() {
    db.ref('configuracion/patron').set(patronVictoria).then(() => {
        alert("Patrón guardado");
        document.getElementById('modalConfig').style.display = 'none';
    });
}

// --- REINICIO ---
document.getElementById('resetBtn').onclick = () => {
    if(!confirm("¿Reiniciar?")) return;
    db.ref('historialBolas').remove();
    db.ref('partidaActual').set({ status: "reiniciado", numero: "--", letra: "-", ultimoCambio: Date.now() });
    location.reload();
};
