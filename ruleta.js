// CONFIGURACIÓN FIREBASE
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
let sorteoAutomaticoHecho = false;

document.addEventListener('DOMContentLoaded', () => {
    generarTableroSeguimiento();
    inicializarListeners();
    
    // Configuración del botón de patrón
    const btnConfig = document.getElementById('btnAbrirConfig');
    if(btnConfig) btnConfig.onclick = () => document.getElementById('modalConfig').style.display = 'flex';
});

function inicializarListeners() {
    // 1. Bolas Cantadas
    db.ref('historialBolas').on('value', snap => {
        cantados = snap.exists() ? Object.values(snap.val()) : [];
        actualizarTableroVisual();
        // Si hay una miniatura abierta, actualizar sus marcas
        if(document.getElementById('idABuscar').value) revisarCartonManual();
    });

    // 2. Cronómetro y Estado
    db.ref('partidaActual').on('value', snap => {
        const data = snap.val();
        if (!data) return;

        if (data.status === 'esperando' && data.proximoJuego) {
            correrCronometro(data.proximoJuego);
        } else {
            document.getElementById('cronometroBingo').innerText = "00:00";
        }

        const b = document.getElementById('badgeEstado');
        if(b) {
            b.innerText = `Estado: ${data.status.toUpperCase()}`;
            b.className = `status-badge status-${data.status}`;
        }
    });

    // 3. Alertas de Bingo (Radar)
    db.ref('notificaciones/bingo').on('value', snap => {
        const contenedor = document.getElementById('listaAlertasBingo');
        const txt = document.getElementById('textoGanadores');
        if (snap.exists()) {
            const data = snap.val();
            if(txt) txt.style.display = 'none';
            contenedor.innerHTML = `<div class="alert-bingo-card" style="background:#ef4444; color:white; padding:10px; border-radius:5px; margin-bottom:5px;">
                🚨 CARTÓN #${data.id} CANTÓ BINGO! 
                <button onclick="revisarCartonManual(${data.id})" style="background:white; border:none; padding:2px 5px; cursor:pointer;">VER</button>
            </div>`;
            new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(()=>{});
        } else {
            if(contenedor) contenedor.innerHTML = '';
            if(txt) txt.style.display = 'block';
        }
    });
}

// --- CRONÓMETRO ---
function correrCronometro(target) {
    const timerElement = document.getElementById('cronometroBingo');
    const interval = setInterval(() => {
        const ahora = Date.now();
        const dif = target - ahora;

        if (dif <= 0) {
            clearInterval(interval);
            timerElement.innerText = "¡YA!";
            if (!sorteoAutomaticoHecho) {
                sorteoAutomaticoHecho = true;
                cambiarEstado('jugando', '¡PARTIDA INICIADA!');
                setTimeout(sortearProximo, 1000); // Primer sorteo automático
            }
            return;
        }

        const min = Math.floor(dif / 60000);
        const seg = Math.floor((dif % 60000) / 1000);
        timerElement.innerText = `${min.toString().padStart(2,'0')}:${seg.toString().padStart(2,'0')}`;
    }, 1000);
}

function programarJuego() {
    const min = document.getElementById('minutosInicio').value || 1;
    const target = Date.now() + (min * 60000);
    sorteoAutomaticoHecho = false;
    db.ref('partidaActual').update({
        status: 'esperando',
        proximoJuego: target,
        anuncio: `INICIAMOS EN ${min} MINUTOS`
    });
}

// --- BUSCADOR CON MINIATURA ---
function revisarCartonManual(idFromRadar) {
    const id = idFromRadar || document.getElementById('idABuscar').value;
    if (!id) return;
    if(!idFromRadar) document.getElementById('idABuscar').value = id;

    db.ref(`cartonesGenerados/${id}`).once('value', snap => {
        const area = document.getElementById('areaVerificacion');
        if (!snap.exists()) {
            area.innerHTML = "<small style='color:red'>El cartón #" + id + " no existe.</small>";
            return;
        }
        
        const numeros = snap.val().numeros;
        let html = `<div class="mini-carton-grid">`;
        numeros.forEach((num, index) => {
            const esCantada = cantados.includes(num);
            const esCentro = index === 12;
            const clase = esCentro ? 'mini-celda estrella' : (esCantada ? 'mini-celda marcada' : 'mini-celda');
            html += `<div class="${clase}">${esCentro ? '★' : num}</div>`;
        });
        html += `</div>`;
        area.innerHTML = html;
    });
}

// --- LÓGICA DE JUEGO ---
function sortearProximo() {
    if (cantados.length >= 75) return;
    let num;
    do { num = Math.floor(Math.random() * 75) + 1; } while (cantados.includes(num));
    
    const letras = ['B','I','N','G','O'];
    const letra = letras[Math.floor((num-1)/15)];
    
    document.getElementById('currentLetter').innerText = letra;
    document.getElementById('currentNumber').innerText = num;

    db.ref('historialBolas').push(num);
    db.ref('partidaActual').update({ numero: num, letra: letra, status: "jugando" });
    
    // Lista de últimos 5
    const list = document.getElementById('recentList');
    if(list) {
        const item = document.createElement('div');
        item.className = 'recent-item';
        item.innerText = letra + num;
        list.prepend(item);
        if(list.children.length > 5) list.lastChild.remove();
    }
}

function cambiarEstado(st, msg) {
    db.ref('partidaActual').update({ status: st, anuncio: msg });
    if(st === 'jugando') db.ref('notificaciones/bingo').remove(); // Limpiar alerta al seguir
}

function anunciarGanador() {
    const id = document.getElementById('idABuscar').value;
    cambiarEstado('finalizado', `🏆 ¡EL CARTÓN #${id} ES EL GANADOR! 🏆`);
}

// --- TABLERO 1-75 ---
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
        const n = parseInt(c.innerText);
        c.classList.toggle('cantada', cantados.includes(n));
    });
    const cont = document.getElementById('count');
    if(cont) cont.innerText = cantados.length;
}

// --- PATRONES ---
function aplicarPredefinido(tipo) {
    patronVictoria = Array(25).fill(false);
    if (tipo === 'lleno') patronVictoria = Array(25).fill(true);
    if (tipo === 'equis') {
        for(let i=0; i<5; i++) { patronVictoria[i*6] = true; patronVictoria[i*4 + 4] = true; }
    }
    patronVictoria[12] = true;
    crearCuadriculaDibujo();
}

function crearCuadriculaDibujo() {
    const container = document.getElementById('gridDibujoPatron');
    if(!container) return;
    container.innerHTML = '';
    patronVictoria.forEach((activa, i) => {
        const d = document.createElement('div');
        d.className = `celda-patron-admin ${activa ? 'activa' : ''}`;
        if(i === 12) d.innerText = "★";
        d.onclick = () => { if(i!==12) { patronVictoria[i] = !patronVictoria[i]; d.classList.toggle('activa'); } };
        container.appendChild(d);
    });
}

function guardarPatron() {
    db.ref('configuracion/patron').set(patronVictoria).then(() => alert("Patrón guardado."));
}

document.getElementById('drawBtn').onclick = sortearProximo;
document.getElementById('resetBtn').onclick = () => {
    if(confirm("¿Reiniciar todo?")) {
        db.ref('historialBolas').remove();
        db.ref('notificaciones/bingo').remove();
        db.ref('partidaActual').set({ status: 'reiniciado', numero: '--', letra: '-', ultimoCambio: Date.now() });
        location.reload();
    }
};
