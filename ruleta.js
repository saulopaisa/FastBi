// --- 1. CONFIGURACIÓN Y ESTADO ---
let cantados = [];
let patronVictoria = Array(25).fill(false);

// --- 2. INICIALIZACIÓN SEGURA ---
window.onload = () => {
    console.log("Panel de Control Iniciado...");
    generarTableroSeguimiento();
    
    // Solo inicializa el dibujo del patrón si el elemento existe en el HTML
    const gridDibujo = document.getElementById('gridDibujoPatron');
    if (gridDibujo) {
        crearCuadriculaDibujo(gridDibujo);
    }

    // Escuchar si hay cambios en el patrón desde la DB (opcional)
    db.ref('configuracion/patron').on('value', (snapshot) => {
        if (snapshot.exists()) {
            patronVictoria = snapshot.val();
            actualizarVisualPatron();
        }
    });
};

// --- 3. GENERACIÓN DEL TABLERO DE SEGUIMIENTO (75 números) ---
function generarTableroSeguimiento() {
    const tablero = document.getElementById('tableroSeguimiento');
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

// --- 4. LÓGICA DE SORTEO ---
function sortearProximo() {
    if (cantados.length >= 75) {
        alert("¡Ya se cantaron todos los números!");
        return;
    }

    let num;
    do {
        num = Math.floor(Math.random() * 75) + 1;
    } while (cantados.includes(num));

    cantados.push(num);
    const letra = obtenerLetra(num);

    // Actualizar Interfaz
    const bolaVisual = document.getElementById('bolaActual');
    if (bolaVisual) bolaVisual.innerText = `${letra}-${num}`;

    const celda = document.getElementById(`num-${num}`);
    if (celda) celda.classList.add('cantada');

    const contador = document.getElementById('contadorCantados');
    if (contador) contador.innerText = cantados.length;

    // Enviar a Firebase
    db.ref('partidaActual').update({
        numero: num,
        letra: letra,
        status: "jugando",
        ultimoCambio: Date.now()
    });
}

function obtenerLetra(n) {
    if (n <= 15) return 'B';
    if (n <= 30) return 'I';
    if (n <= 45) return 'N';
    if (n <= 60) return 'G';
    return 'O';
}

// --- 5. GESTIÓN DE ESTADOS DEL JUEGO ---
function setEstado(nuevoEstado) {
    const anuncios = {
        'verificando': "⏳ VERIFICANDO CARTÓN...",
        'finalizado': "🎉 ¡HAY UN GANADOR!",
        'esperando': "⌛ ESPERANDO INICIO..."
    };

    db.ref('partidaActual').update({
        status: nuevoEstado,
        anuncio: anuncios[nuevoEstado] || ""
    });
}

function programarInicio() {
    const minutos = document.getElementById('inputMinutos').value;
    if (!minutos || minutos <= 0) return alert("Ingresa minutos válidos");

    const targetTime = Date.now() + (minutos * 60000);

    db.ref('partidaActual').update({
        status: "esperando",
        proximoJuego: targetTime
    });
}

function empezarAhora() {
    db.ref('partidaActual').update({
        status: "jugando",
        proximoJuego: null
    });
}

// --- 6. DIBUJO DEL PATRÓN DE VICTORIA ---
function crearCuadriculaDibujo(contenedor) {
    contenedor.innerHTML = '';
    patronVictoria.forEach((activa, index) => {
        const celda = document.createElement('div');
        celda.className = `celda-patron-admin ${activa ? 'activa' : ''}`;
        
        // El centro suele ser libre
        if (index === 12) {
            celda.classList.add('activa');
            celda.innerText = "★";
        }

        celda.onclick = () => {
            if (index === 12) return; // No cambiar el centro
            patronVictoria[index] = !patronVictoria[index];
            celda.classList.toggle('activa');
        };
        contenedor.appendChild(celda);
    });
}

function guardarPatron() {
    db.ref('configuracion/patron').set(patronVictoria)
        .then(() => alert("Patrón guardado y sincronizado con jugadores"))
        .catch(err => console.error("Error al guardar patrón:", err));
}

// --- 7. REINICIO TOTAL ---
function reiniciarPartida() {
    if (!confirm("¿ESTÁS SEGURO? Se borrará el historial de bolas y las marcas de todos los jugadores.")) return;

    // 1. Limpiar historial local
    cantados = [];
    
    // 2. Limpiar visual
    document.getElementById('bolaActual').innerText = "-";
    document.getElementById('contadorCantados').innerText = "0";
    document.querySelectorAll('.celda-seguimiento').forEach(c => c.classList.remove('cantada'));

    // 3. Resetear Firebase
    db.ref('partidaActual').set({
        status: "reiniciado",
        numero: "-",
        letra: "",
        ultimoCambio: Date.now()
    });
}
