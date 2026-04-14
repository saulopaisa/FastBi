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

    // Sincronizar historial de bolas
    db.ref('historialBolas').on('value', (snapshot) => {
        if (snapshot.exists()) {
            cantados = Object.values(snapshot.val());
            actualizarTableroVisual();
        }
    });

    // Escuchar alertas de BINGO de jugadores
    db.ref('notificaciones/bingo').on('value', (snapshot) => {
        const contenedor = document.getElementById('listaAlertasBingo');
        const txt = document.getElementById('textoGanadores');
        if (snapshot.exists()) {
            const data = snapshot.val();
            if(txt) txt.style.display = 'none';
            contenedor.innerHTML = `<div class="alert-bingo-card">🚨 CARTÓN #${data.id}! <button onclick="revisarCartonManual(${data.id})">VER</button></div>`;
            new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(()=>{});
        } else {
            contenedor.innerHTML = '';
            if(txt) txt.style.display = 'block';
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

// --- FUNCIONES DEL TABLERO ---
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
    if (cantados.length >= 75) return alert("Bingo completo");
    let num;
    do { num = Math.floor(Math.random() * 75) + 1; } while (cantados.includes(num));

    const letra = obtenerLetra(num);
    document.getElementById('currentLetter').innerText = letra;
    document.getElementById('currentNumber').innerText = num;

    db.ref('historialBolas').push(num);
    db.ref('partidaActual').update({
        numero: num, letra: letra, status: "jugando", ultimoCambio: Date.now()
    });
    
    // Lista últimos 5
    const lista = document.getElementById('recentList');
    const item = document.createElement('div');
    item.className = 'recent-item';
    item.innerText = letra + num;
    lista.prepend(item);
    if(lista.children.length > 5) lista.lastChild.remove();
}

function obtenerLetra(n) {
    if (n <= 15) return 'B'; if (n <= 30) return 'I'; if (n <= 45) return 'N'; if (n <= 60) return 'G'; return 'O';
}

// --- PATRONES ---
function aplicarPredefinido(tipo) {
    if (tipo === 'lleno') patronVictoria = Array(25).fill(true);
    if (tipo === 'equis') {
        patronVictoria = Array(25).fill(false);
        for(let i=0; i<5; i++) { patronVictoria[i*6] = true; patronVictoria[i*4 + 4] = true; }
    }
    crearCuadriculaDibujo(document.getElementById('gridDibujoPatron'));
}

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

// --- BUSCADOR ---
function revisarCartonManual(id) {
    const targetId = id || document.getElementById('idABuscar').value;
    if(!targetId) return alert("Ingrese ID");
    alert("Buscando cartón #" + targetId);
    // Aquí puedes redirigir o abrir una ventana con el cartón
}

// --- ESTADOS ---
function cambiarEstado(st, msg) {
    db.ref('partidaActual').update({ status: st, anuncio: msg });
    const b = document.getElementById('badgeEstado');
    if(b) { b.innerText = "Estado: " + st; b.className = "status-badge status-" + st; }
}

function anunciarVerificacion() { cambiarEstado('verificando', '⚠️ VERIFICANDO...'); }
function anunciarGanador() { 
    const id = prompt("ID:"); 
    if(id) cambiarEstado('finalizado', "🏆 GANADOR #" + id); 
}

function iniciarCuentaRegresiva() {
    const min = document.getElementById('minutosInicio').value || 1;
    db.ref('partidaActual').update({ status: 'esperando', proximoJuego: Date.now() + (min * 60000), anuncio: "INICIO EN " + min + " MIN" });
}

// --- REINICIO ---
const resetBtn = document.getElementById('resetBtn');
if(resetBtn) resetBtn.onclick = () => {
    if(!confirm("¿Reiniciar?")) return;
    db.ref('historialBolas').remove();
    db.ref('notificaciones/bingo').remove();
    db.ref('partidaActual').set({ status: "reiniciado", numero: "--", letra: "-", ultimoCambio: Date.now() });
    location.reload();
};
