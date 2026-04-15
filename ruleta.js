// --- CONFIGURACIÓN Y ESTADO ---
var db = firebase.database();
window.cantados = [];
window.jugadoresActivos = [];
window.patronBingo = Array(25).fill(false); // 5x5 vacío

// --- INICIALIZAR TABLERO DE 75 ---
function inicializarTablero75() {
    const grid = document.getElementById('historyGrid');
    grid.innerHTML = "";
    for (let i = 1; i <= 75; i++) {
        const div = document.createElement('div');
        div.className = 'celda-seguimiento';
        div.id = `seguimiento-${i}`;
        div.innerText = i;
        grid.appendChild(div);
    }
}

// --- ETAPA 1: SELECCIONAR JUGADORES ---
window.abrirModalCartones = function() {
    document.getElementById('modalCartones').style.display = 'flex';
    const lista = document.getElementById('listaCheckCartones');
    lista.innerHTML = "Cargando...";

    // Leemos de 'cartonesGenerados' (lo que hizo tu página de Generar)
    db.ref('cartonesGenerados').once('value', (snapshot) => {
        lista.innerHTML = "";
        if (!snapshot.exists()) {
            lista.innerHTML = "<p>No hay cartones en la base de datos.</p>";
            return;
        }
        snapshot.forEach((child) => {
            const c = child.val();
            const item = document.createElement('div');
            item.style = "background:#334155; padding:5px; border-radius:4px; font-size:0.7rem;";
            item.innerHTML = `
                <input type="checkbox" id="chk-${c.id}" value="${c.id}">
                <label for="chk-${c.id}">ID:${c.id}<br>${c.apodo}</label>
            `;
            lista.appendChild(item);
        });
    });
};

window.confirmarJugadores = function() {
    const checks = document.querySelectorAll('#listaCheckCartones input:checked');
    window.jugadoresActivos = Array.from(checks).map(c => parseInt(c.value));
    
    if (window.jugadoresActivos.length === 0) {
        alert("Selecciona al menos un jugador");
        return;
    }

    // Guardar en Firebase y avanzar
    db.ref('estadoBingo/activos').set(window.jugadoresActivos);
    document.getElementById('modalCartones').style.display = 'none';
    document.getElementById('btnEtapa1').style.opacity = "0.5";
    document.getElementById('btnEtapa2').disabled = false;
    alert("Jugadores confirmados. Ahora configura el patrón.");
};

// --- ETAPA 2: CONFIGURAR PATRÓN ---
window.abrirModalPatron = function() {
    document.getElementById('modalPatron').style.display = 'flex';
    const grid = document.getElementById('gridDibujoPatron');
    grid.innerHTML = "";
    
    window.patronBingo.forEach((estado, i) => {
        const btn = document.createElement('div');
        btn.className = `celda-patron ${estado ? 'activa' : ''}`;
        if(i === 12) btn.innerHTML = "⭐"; // Espacio libre
        btn.onclick = () => {
            window.patronBingo[i] = !window.patronBingo[i];
            btn.classList.toggle('activa');
        };
        grid.appendChild(btn);
    });
};

window.aplicarPredefinido = function(tipo) {
    if (tipo === 'lleno') window.patronBingo = Array(25).fill(true);
    if (tipo === 'limpiar') window.patronBingo = Array(25).fill(false);
    if (tipo === 'equis') {
        window.patronBingo = Array(25).fill(false);
        [0,4,6,8,12,16,18,20,24].forEach(pos => window.patronBingo[pos] = true);
    }
    window.abrirModalPatron(); // Refrescar vista
};

window.confirmarPatron = function() {
    db.ref('estadoBingo/patron').set(window.patronBingo);
    document.getElementById('modalPatron').style.display = 'none';
    document.getElementById('btnEtapa2').style.opacity = "0.5";
    document.getElementById('panelJuego').style.opacity = "1";
    document.getElementById('panelJuego').style.pointerEvents = "all";
    alert("¡Patrón listo! Ya puedes programar o iniciar el juego.");
};

// --- ETAPA 3: SORTEO Y JUEGO ---
document.getElementById('drawBtn').onclick = function() {
    if (window.cantados.length >= 75) return alert("Bingo terminado");
    
    let bola;
    do {
        bola = Math.floor(Math.random() * 75) + 1;
    } while (window.cantados.includes(bola));

    window.cantados.push(bola);
    
    // Marcar en el tablero
    document.getElementById(`seguimiento-${bola}`).classList.add('cantada');
    
    // Enviar a Firebase
    db.ref('estadoBingo').update({
        ultima: bola,
        lista: window.cantados,
        timestamp: Date.now()
    });
};

// --- FUNCIONES DE APOYO ---
window.cambiarEstado = function(estado, mensaje) {
    db.ref('estadoBingo/estado').set(estado);
    if(mensaje) db.ref('avisosBingo').push({ texto: mensaje, tiempo: Date.now() });
};

window.programarJuego = function() {
    const min = document.getElementById('minutosInicio').value;
    if(!min) return alert("Ingresa minutos");
    db.ref('estadoBingo/tiempoGracia').set(min);
    window.cambiarEstado('esperando', `EL BINGO COMENZARÁ EN ${min} MINUTOS`);
};

// Verificador de Cartón (usando la misma lógica de semilla)
window.revisarCartonManual = function() {
    const id = document.getElementById('idABuscar').value;
    if(!id) return;
    
    // Aquí podrías abrir un modal extra o pintar la tabla en el panel derecho
    alert("Verificando ID #" + id + "... (Asegúrate que el cartón coincida con los números cantados)");
};

// Reset
document.getElementById('resetBtn').onclick = function() {
    if(confirm("¿Reiniciar todo? Se perderá el patrón y jugadores.")) {
        db.ref('estadoBingo').remove();
        location.reload();
    }
};

// Inicio
inicializarTablero75();
