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

// --- INICIALIZACIÓN SEGURA ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("Motor de Bingo 75 Iniciado...");
    generarTableroSeguimiento();
    
    // 1. ESCUCHAR ALERTAS DE BINGO (Radar)
    db.ref('notificaciones/bingo').on('value', (snapshot) => {
        const data = snapshot.val();
        const contenedor = document.getElementById('listaAlertasBingo');
        const textoStatus = document.getElementById('textoGanadores');
        
        if (data && contenedor) {
            if (textoStatus) textoStatus.style.display = 'none';
            contenedor.innerHTML = `
                <div class="alert-bingo-card">
                    <span>🚨 CARTÓN <b>#${data.id}</b> CANTA BINGO!</span>
                    <button onclick="revisarCartonManual(${data.id})" style="background:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-weight:bold; color:#ef4444;">VER</button>
                </div>`;
            // Opcional: Sonido de alerta
            new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {});
        } else if (contenedor) {
            contenedor.innerHTML = '';
            if (textoStatus) textoStatus.style.display = 'block';
        }
    });

    // 2. SINCRONIZAR BOLAS CANTADAS
    db.ref('historialBolas').on('value', (snapshot) => {
        if (snapshot.exists()) {
            cantados = Object.values(snapshot.val());
            actualizarTableroVisual();
        } else {
            cantados = [];
            actualizarTableroVisual();
        }
    });

    // 3. SINCRONIZAR PATRÓN DE JUEGO
    db.ref('configuracion/patron').on('value', (snapshot) => {
        if (snapshot.exists()) {
            patronVictoria = snapshot.val();
            const grid = document.getElementById('gridDibujoPatron');
            if (grid) crearCuadriculaDibujo(grid);
        }
    });
});

// --- TABLERO DE SEGUIMIENTO (Panel Derecho) ---
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
    // Limpiar celdas
    document.querySelectorAll('.celda-seguimiento').forEach(c => c.classList.remove('cantada'));
    // Marcar cantadas
    cantados.forEach(num => {
        const celda = document.getElementById(`num-${num}`);
        if (celda) celda.classList.add('cantada');
    });
    // Actualizar contador
    const cont = document.getElementById('count');
    if (cont) cont.innerText = cantados.length;
}

// --- LÓGICA DE SORTEO ---
const drawBtn = document.getElementById('drawBtn');
if(drawBtn) drawBtn.onclick = sortearProximo;

function sortearProximo() {
    if (cantados.length >= 75) return alert("Todas las bolas han sido cantadas.");
    
    let num;
    do { 
        num = Math.floor(Math.random() * 75) + 1; 
    } while (cantados.includes(num));

    const letra = obtenerLetra(num);
    
    // Actualizar Interfaz
    const elLetra = document.getElementById('currentLetter');
    const elNum = document.getElementById('currentNumber');
    if (elLetra) elLetra.innerText = letra;
    if (elNum) elNum.innerText = num;

    // Guardar en Firebase
    db.ref('historialBolas').push(num);
    db.ref('partidaActual').update({
        numero: num,
        letra: letra,
        status: "jugando",
        ultimoCambio: Date.now()
    });

    actualizarUltimos(letra, num);
}

function obtenerLetra(n) {
    if (n <= 15) return 'B';
    if (n <= 30) return 'I';
    if (n <= 45) return 'N';
    if (n <= 60) return 'G';
    return 'O';
}

function actualizarUltimos(l, n) {
    const lista = document.getElementById('recentList');
    if (!lista) return;
    const div = document.createElement('div');
    div.className = 'recent-item';
    div.innerText = l + n;
    lista.prepend(div);
    if(lista.children.length > 5) lista.lastChild.remove();
}

// --- BUSCADOR DE CARTONES ---
function revisarCartonManual() {
    const id = document.getElementById('idABuscar').value;
    if(!id) return alert("Ingresa un ID de cartón");
    
    // Aquí puedes disparar la lógica para mostrar el cartón en 'areaVerificacion'
    // Por ahora simulamos la acción:
    console.log("Verificando cartón:", id);
    alert("Buscando cartón #" + id + " en la base de datos...");
}

// --- GESTIÓN DE PATRONES ---
function aplicarPredefinido(tipo) {
    if (tipo === 'lleno') patronVictoria = Array(25).fill(true);
    if (tipo === 'limpiar') patronVictoria = Array(25).fill(false);
    if (tipo === 'lineaH') {
        patronVictoria = Array(25).fill(false);
        for(let i=0; i<5; i++) patronVictoria[i] = true;
    }
    if (tipo === 'equis') {
        patronVictoria = Array(25).fill(false);
        for(let i=0; i<5; i++) {
            patronVictoria[i*6] = true;
            patronVictoria[i*4 + 4] = true;
        }
    }
    // Forzar el centro siempre activo
    patronVictoria[12] = true;
    crearCuadriculaDibujo(document.getElementById('gridDibujoPatron'));
}

function crearCuadriculaDibujo(contenedor) {
    if (!contenedor) return;
    contenedor.innerHTML = '';
    patronVictoria.forEach((activa, index) => {
        const celda = document.createElement('div');
        celda.className = `celda-patron-admin ${activa ? 'activa' : ''}`;
        
        if (index === 12) {
            celda.classList.add('activa');
            celda.innerText = "★";
        }

        celda.onclick = () => {
            if (index === 12) return;
            patronVictoria[index] = !patronVictoria[index];
            celda.classList.toggle('activa');
        };
        contenedor.appendChild(celda);
    });
}

function guardarPatron() {
    db.ref('configuracion/patron').set(patronVictoria).then(() => {
        alert("Patrón actualizado para todos los jugadores.");
        const modal = document.getElementById('modalConfig');
        if (modal) modal.style.display = 'none';
    }).catch(err => alert("Error al guardar: " + err));
}

// --- CONTROLES DE ESTADO ---
function cambiarEstado(st, msg) {
    db.ref('partidaActual').update({ status: st, anuncio: msg });
    const b = document.getElementById('badgeEstado');
    if(b) { 
        b.innerText = `Estado: ${st}`; 
        b.className = `status-badge status-${st}`; 
    }
}

function anunciarVerificacion() { cambiarEstado('verificando', '⚠️ VERIFICANDO CARTÓN...'); }

function anunciarGanador() { 
    const id = prompt("Ingrese el ID del cartón ganador:"); 
    if(id) cambiarEstado('finalizado', `🏆 ¡GANADOR CARTÓN #${id}! 🏆`); 
}

function iniciarCuentaRegresiva() {
    const min = document.getElementById('minutosInicio').value || 1;
    const target = Date.now() + (min * 60000);
    db.ref('partidaActual').update({ 
        status: 'esperando', 
        proximoJuego: target, 
        anuncio: `EL JUEGO INICIA EN ${min} MINUTOS` 
    });
}

// --- REINICIO TOTAL ---
const resetBtn = document.getElementById('resetBtn');
if(resetBtn) {
    resetBtn.onclick = () => {
        if(!confirm("¿Estás seguro de reiniciar la partida? Se borrará el historial de bolas y alertas.")) return;
        db.ref('historialBolas').remove();
        db.ref('notificaciones/bingo').remove();
        db.ref('partidaActual').set({ 
            status: "reiniciado", 
            numero: "--", 
            letra: "-", 
            ultimoCambio: Date.now() 
        });
        location.reload();
    };
}
