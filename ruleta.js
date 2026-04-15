// --- CONFIGURACIÓN Y PROTECCIÓN DE INICIO ---
var db;
document.addEventListener("DOMContentLoaded", () => {
    // Verificamos que Firebase esté cargado antes de usarlo
    if (typeof firebase !== 'undefined') {
        db = firebase.database();
        inicializarTablero75();
        conectarOnlineCount();
    } else {
        console.error("Firebase no detectado. Revisa las etiquetas <script> en tu HTML.");
    }
});

// Variables de estado
window.cantados = JSON.parse(localStorage.getItem('bingo_cantados')) || [];
window.patronBingo = Array(25).fill(false);
window.jugadoresActivos = [];

// --- 1. SELECCIONAR JUGADORES (Sincronizado con Generador) ---
window.abrirModalCartones = function() {
    const modal = document.getElementById('modalCartones');
    const lista = document.getElementById('listaCheckCartones');
    if(!modal || !lista) return;

    modal.style.display = 'flex';
    lista.innerHTML = "<p style='color:var(--gold)'>Cargando jugadores...</p>";

    // Accedemos al nodo que crea tu página de "Generar"
    db.ref('cartonesGenerados').once('value', (snapshot) => {
        lista.innerHTML = "";
        if (!snapshot.exists()) {
            lista.innerHTML = "<p>No hay cartones registrados.</p>";
            return;
        }
        snapshot.forEach((child) => {
            const c = child.val();
            const item = document.createElement('div');
            item.style = "background:#334155; padding:8px; border-radius:4px; font-size:0.75rem; display:flex; gap:5px; align-items:center;";
            item.innerHTML = `
                <input type="checkbox" id="chk-${c.id}" value="${c.id}">
                <label for="chk-${c.id}"><b>#${c.id}</b><br>${c.apodo}</label>
            `;
            lista.appendChild(item);
        });
    });
};

window.confirmarJugadores = function() {
    const checks = document.querySelectorAll('#listaCheckCartones input:checked');
    window.jugadoresActivos = Array.from(checks).map(c => parseInt(c.value));
    
    if (window.jugadoresActivos.length === 0) {
        alert("Debes seleccionar al menos un jugador para la ronda.");
        return;
    }

    db.ref('estadoBingo/activos').set(window.jugadoresActivos);
    document.getElementById('modalCartones').style.display = 'none';
    document.getElementById('btnEtapa2').disabled = false;
    document.getElementById('btnEtapa1').style.opacity = "0.5";
};

// --- 2. CONFIGURAR PATRÓN ---
window.abrirModalPatron = function() {
    const modal = document.getElementById('modalPatron');
    const grid = document.getElementById('gridDibujoPatron');
    if(!modal || !grid) return;

    modal.style.display = 'flex';
    grid.innerHTML = "";
    
    window.patronBingo.forEach((estado, i) => {
        const btn = document.createElement('div');
        btn.className = `celda-patron ${estado ? 'activa' : ''}`;
        if(i === 12) btn.innerHTML = "⭐";
        btn.onclick = () => {
            window.patronBingo[i] = !window.patronBingo[i];
            btn.classList.toggle('activa');
        };
        grid.appendChild(btn);
    });
};

window.confirmarPatron = function() {
    db.ref('estadoBingo/patron').set(window.patronBingo);
    document.getElementById('modalPatron').style.display = 'none';
    document.getElementById('btnEtapa2').style.opacity = "0.5";
    document.getElementById('panelJuego').style.opacity = "1";
    document.getElementById('panelJuego').style.pointerEvents = "all";
};

// --- 3. JUEGO Y SORTEO ---
const drawBtn = document.getElementById('drawBtn');
if(drawBtn) {
    drawBtn.onclick = function() {
        if (window.cantados.length >= 75) return alert("¡Todas las bolas han salido!");
        
        let bola;
        do {
            bola = Math.floor(Math.random() * 75) + 1;
        } while (window.cantados.includes(bola));

        window.cantados.push(bola);
        localStorage.setItem('bingo_cantados', JSON.stringify(window.cantados));
        
        marcarBolaEnTablero(bola);
        
        db.ref('estadoBingo').update({
            ultima: bola,
            lista: window.cantados,
            timestamp: Date.now()
        });
    };
}

// --- UTILIDADES ---
function inicializarTablero75() {
    const grid = document.getElementById('historyGrid');
    if(!grid) return;
    grid.innerHTML = "";
    for (let i = 1; i <= 75; i++) {
        const div = document.createElement('div');
        div.className = 'celda-seguimiento';
        div.id = `seguimiento-${i}`;
        div.innerText = i;
        if(window.cantados.includes(i)) div.classList.add('cantada');
        grid.appendChild(div);
    }
}

function marcarBolaEnTablero(num) {
    const el = document.getElementById(`seguimiento-${num}`);
    if(el) el.classList.add('cantada');
}

function conectarOnlineCount() {
    db.ref('presencia').on('value', (snap) => {
        const count = snap.numChildren() || 0;
        const el = document.getElementById('onlineCount');
        if(el) el.innerText = `👥 ONLINE: ${count}`;
    });
}

window.aplicarPredefinido = function(tipo) {
    if (tipo === 'lleno') window.patronBingo = Array(25).fill(true);
    if (tipo === 'limpiar') window.patronBingo = Array(25).fill(false);
    if (tipo === 'equis') {
        window.patronBingo = Array(25).fill(false);
        [0,4,6,8,12,16,18,20,24].forEach(pos => window.patronBingo[pos] = true);
    }
    window.abrirModalPatron();
};

window.cambiarEstado = function(est, msg) {
    db.ref('estadoBingo/estado').set(est);
    if(msg) alert(msg);
};
