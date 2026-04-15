// --- CONFIGURACIÓN GLOBAL ---
var db = firebase.database();

// Variables de Juego
window.cantados = JSON.parse(localStorage.getItem('bingo_cantados')) || [];
window.patronBingo = Array(25).fill(false);
window.jugadoresActivos = [];

// --- ETAPA 1: SELECCIÓN DE JUGADORES ---
window.abrirModalCartones = function() {
    const modal = document.getElementById('modalCartones');
    const lista = document.getElementById('listaCheckCartones');
    
    if (!modal || !lista) return;
    
    modal.style.display = 'flex';
    lista.innerHTML = "<p style='color:var(--gold); grid-column:1/-1; text-align:center;'>Conectando con base de datos...</p>";

    // Leer los cartones generados en la otra página
    db.ref('cartonesGenerados').once('value', (snapshot) => {
        lista.innerHTML = "";
        if (!snapshot.exists()) {
            lista.innerHTML = "<p style='grid-column:1/-1; text-align:center;'>No hay cartones generados.</p>";
            return;
        }
        
        snapshot.forEach((child) => {
            const c = child.val();
            const item = document.createElement('div');
            item.className = "item-jugador-check";
            item.style = "background:#334155; padding:8px; border-radius:4px; display:flex; gap:10px; align-items:center; color:white; font-size:0.8rem;";
            item.innerHTML = `
                <input type="checkbox" id="chk-${c.id}" value="${c.id}">
                <label for="chk-${c.id}"><b>#${c.id}</b><br>${c.apodo}</label>
            `;
            lista.appendChild(item);
        });
    });
};

window.confirmarJugadores = function() {
    const seleccionados = document.querySelectorAll('#listaCheckCartones input:checked');
    window.jugadoresActivos = Array.from(seleccionados).map(cb => parseInt(cb.value));

    if (window.jugadoresActivos.length === 0) {
        alert("Selecciona al menos un jugador para iniciar.");
        return;
    }

    db.ref('estadoBingo/activos').set(window.jugadoresActivos);
    document.getElementById('modalCartones').style.display = 'none';
    document.getElementById('btnEtapa2').disabled = false;
    document.getElementById('btnEtapa1').style.opacity = "0.5";
};

// --- ETAPA 2: PATRÓN ---
window.abrirModalPatron = function() {
    const modal = document.getElementById('modalPatron');
    const grid = document.getElementById('gridDibujoPatron');
    if (!modal || !grid) return;

    modal.style.display = 'flex';
    grid.innerHTML = "";
    
    window.patronBingo.forEach((activo, i) => {
        const celda = document.createElement('div');
        celda.className = `celda-patron ${activo ? 'activa' : ''}`;
        if (i === 12) celda.innerHTML = "⭐";
        celda.onclick = () => {
            window.patronBingo[i] = !window.patronBingo[i];
            celda.classList.toggle('activa');
        };
        grid.appendChild(celda);
    });
};

window.confirmarPatron = function() {
    db.ref('estadoBingo/patron').set(window.patronBingo);
    document.getElementById('modalPatron').style.display = 'none';
    document.getElementById('btnEtapa2').style.opacity = "0.5";
    document.getElementById('panelJuego').style.opacity = "1";
    document.getElementById('panelJuego').style.pointerEvents = "all";
};

// --- ETAPA 3: SORTEO ---
const drawBtn = document.getElementById('drawBtn');
if (drawBtn) {
    drawBtn.onclick = function() {
        if (window.cantados.length >= 75) return alert("Fin del juego");

        let bola;
        do {
            bola = Math.floor(Math.random() * 75) + 1;
        } while (window.cantados.includes(bola));

        window.cantados.push(bola);
        localStorage.setItem('bingo_cantados', JSON.stringify(window.cantados));
        
        const celda = document.getElementById(`seguimiento-${bola}`);
        if (celda) celda.classList.add('cantada');

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
    if (!grid) return;
    grid.innerHTML = "";
    for (let i = 1; i <= 75; i++) {
        const div = document.createElement('div');
        div.className = 'celda-seguimiento';
        div.id = `seguimiento-${i}`;
        div.innerText = i;
        if (window.cantados.includes(i)) div.classList.add('cantada');
        grid.appendChild(div);
    }
}

window.aplicarPredefinido = function(tipo) {
    if (tipo === 'lleno') window.patronBingo = Array(25).fill(true);
    if (tipo === 'limpiar') window.patronBingo = Array(25).fill(false);
    if (tipo === 'equis') {
        window.patronBingo = Array(25).fill(false);
        [0, 4, 6, 8, 12, 16, 18, 20, 24].forEach(p => window.patronBingo[p] = true);
    }
    window.abrirModalPatron();
};

document.addEventListener("DOMContentLoaded", () => {
    inicializarTablero75();
});
