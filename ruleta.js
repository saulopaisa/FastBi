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
let autoSorteoRealizado = false;

document.addEventListener('DOMContentLoaded', () => {
    generarTableroSeguimiento();
    inicializarListeners();
    
    document.getElementById('btnAbrirConfig').onclick = () => {
        document.getElementById('modalConfig').style.display = 'flex';
        crearCuadriculaDibujo();
    };
});

function inicializarListeners() {
    // Escuchar Bolas
    db.ref('historialBolas').on('value', snap => {
        cantados = snap.exists() ? Object.values(snap.val()) : [];
        actualizarTableroVisual();
        if(document.getElementById('idABuscar').value) revisarCartonManual();
    });

    // Escuchar Cronómetro y Estado
    db.ref('partidaActual').on('value', snap => {
        const data = snap.val();
        if (!data) return;

        // Actualizar Cronómetro
        if (data.status === 'esperando' && data.proximoJuego) {
            correrReloj(data.proximoJuego);
        } else {
            document.getElementById('cronometroBingo').innerText = "00:00";
        }

        // Actualizar Badge
        const b = document.getElementById('badgeEstado');
        b.innerText = `Estado: ${data.status.toUpperCase()}`;
        b.className = `status-badge status-${data.status}`;
    });

    // Radar de Alertas
    db.ref('notificaciones/bingo').on('value', snap => {
        const contenedor = document.getElementById('listaAlertasBingo');
        const txt = document.getElementById('textoGanadores');
        if (snap.exists()) {
            const data = snap.val();
            txt.style.display = 'none';
            contenedor.innerHTML = `<div class="alert-bingo-card" style="background:#ef4444; color:white; padding:8px; border-radius:5px;">🚨 CARTÓN #${data.id}! <button onclick="revisarCartonManual(${data.id})">VER</button></div>`;
            new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(()=>{});
        } else {
            contenedor.innerHTML = '';
            txt.style.display = 'block';
        }
    });
}

// --- CRONÓMETRO Y AUTO-SORTEO ---
function correrReloj(target) {
    const interval = setInterval(() => {
        const dif = target - Date.now();
        if (dif <= 0) {
            clearInterval(interval);
            document.getElementById('cronometroBingo').innerText = "¡YA!";
            if (!autoSorteoRealizado) {
                autoSorteoRealizado = true;
                cambiarEstado('jugando', '¡PARTIDA INICIADA!');
                setTimeout(sortearProximo, 1000); 
            }
            return;
        }
        const min = Math.floor(dif / 60000);
        const seg = Math.floor((dif % 60000) / 1000);
        document.getElementById('cronometroBingo').innerText = `${min}:${seg < 10 ? '0'+seg : seg}`;
    }, 1000);
}

function programarJuego() {
    const min = document.getElementById('minutosInicio').value || 1;
    const target = Date.now() + (min * 60000);
    autoSorteoRealizado = false;
    db.ref('partidaActual').update({ status: 'esperando', proximoJuego: target, anuncio: `INICIO EN ${min} MIN` });
}

// --- BUSCADOR Y MINIATURA ---
function revisarCartonManual(idRadar) {
    const id = idRadar || document.getElementById('idABuscar').value;
    if (!id) return;
    if (idRadar) document.getElementById('idABuscar').value = id;

    db.ref(`cartonesGenerados/${id}`).once('value', snap => {
        const area = document.getElementById('areaVerificacion');
        if (!snap.exists()) {
            area.innerHTML = "<small style='color:red'>No existe el cartón</small>";
            return;
        }
        const numeros = snap.val().numeros;
        let html = `<div class="mini-carton-grid">`;
        numeros.forEach((n, i) => {
            const cantada = cantados.includes(n);
            const centro = i === 12;
            const clase = centro ? 'mini-celda estrella' : (cantada ? 'mini-celda marcada' : 'mini-celda');
            html += `<div class="${clase}">${centro ? '★' : n}</div>`;
        });
        html += `</div>`;
        area.innerHTML = html;
    });
}

// --- LÓGICA DE SORTEO ---
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

    // Historial últimos 5
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
    if(st === 'jugando') db.ref('notificaciones/bingo').remove();
}

function anunciarGanador() {
    const id = document.getElementById('idABuscar').value;
    cambiarEstado('finalizado', `🏆 ¡CARTÓN #${id} GANADOR! 🏆`);
}

// --- TABLERO GENERAL ---
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
    document.getElementById('count').innerText = cantados.length;
}

// --- PATRONES ---
function aplicarPredefinido(tipo) {
    patronVictoria = Array(25).fill(false);
    if(tipo === 'lleno') patronVictoria = Array(25).fill(true);
    if(tipo === 'equis') {
        for(let i=0; i<5; i++) { patronVictoria[i*6] = true; patronVictoria[i*4 + 4] = true; }
    }
    patronVictoria[12] = true;
    crearCuadriculaDibujo();
}

function crearCuadriculaDibujo() {
    const cont = document.getElementById('gridDibujoPatron');
    cont.innerHTML = '';
    patronVictoria.forEach((act, i) => {
        const d = document.createElement('div');
        d.className = `celda-patron-admin ${act ? 'activa' : ''}`;
        if(i === 12) d.innerText = "★";
        d.onclick = () => { if(i!==12){ patronVictoria[i] = !patronVictoria[i]; d.classList.toggle('activa'); } };
        cont.appendChild(d);
    });
}

function guardarPatron() {
    db.ref('configuracion/patron').set(patronVictoria).then(() => alert("Patrón Guardado"));
}

document.getElementById('drawBtn').onclick = sortearProximo;
document.getElementById('resetBtn').onclick = () => {
    if(confirm("¿Reiniciar todo?")){
        db.ref('historialBolas').remove();
        db.ref('notificaciones/bingo').remove();
        db.ref('partidaActual').set({ status: 'reiniciado', numero: '--', letra: '-' });
        location.reload();
    }
};
