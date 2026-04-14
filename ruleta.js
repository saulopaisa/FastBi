// --- 1. CONFIGURACIÓN Y ESTADO ---
let cantados = [];
let patronVictoria = Array(25).fill(false);

// --- 2. INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("Motor de Ruleta Iniciado...");
    generarTableroSeguimiento();
    
    // Inicializar el dibujo del patrón si el modal está presente
    const gridDibujo = document.getElementById('gridDibujoPatron');
    if (gridDibujo) {
        crearCuadriculaDibujo(gridDibujo);
    }

    // Sincronizar historial de bolas ya cantadas al cargar/actualizar
    db.ref('historialBolas').on('value', (snapshot) => {
        if (snapshot.exists()) {
            cantados = Object.values(snapshot.val());
            actualizarTableroVisual();
        }
    });

    // Escuchar el patrón desde la DB
    db.ref('configuracion/patron').on('value', (snapshot) => {
        if (snapshot.exists()) {
            patronVictoria = snapshot.val();
            const grid = document.getElementById('gridDibujoPatron');
            if (grid) crearCuadriculaDibujo(grid);
        }
    });
});

// --- 3. TABLERO DE SEGUIMIENTO (Grid de 75) ---
function generarTableroSeguimiento() {
    const tablero = document.getElementById('historyGrid'); // ID coincidente con tu HTML
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
    // Limpiar marcas previas
    document.querySelectorAll('.celda-seguimiento').forEach(c => c.classList.remove('cantada'));
    // Marcar las actuales
    cantados.forEach(num => {
        const celda = document.getElementById(`num-${num}`);
        if (celda) celda.classList.add('cantada');
    });
    // Actualizar contador
    const cont = document.getElementById('count');
    if (cont) cont.innerText = cantados.length;
}

// --- 4. LÓGICA DE SORTEO ---
const drawBtn = document.getElementById('drawBtn');
if(drawBtn) {
    drawBtn.onclick = sortearProximo;
}

function sortearProximo() {
    if (cantados.length >= 75) return alert("¡Bingo completo!");

    let num;
    do {
        num = Math.floor(Math.random() * 75) + 1;
    } while (cantados.includes(num));

    const letra = obtenerLetra(num);

    // Actualizar Interfaz Principal
    const txtLetra = document.getElementById('currentLetter');
    const txtNum = document.getElementById('currentNumber');
    if (txtLetra) txtLetra.innerText = letra;
    if (txtNum) txtNum.innerText = num;

    // Guardar en Firebase e Historial
    db.ref('historialBolas').push(num);
    db.ref('partidaActual').update({
        numero: num,
        letra: letra,
        status: "jugando",
        ultimoCambio: Date.now()
    });

    // Agregar a "Últimos 5" (Visual)
    actualizarUltimosCinco(letra, num);
}

function actualizarUltimosCinco(l, n) {
    const lista = document.getElementById('recentList');
    if (!lista) return;
    const item = document.createElement('div');
    item.className = 'recent-item';
    item.innerText = `${l}${n}`;
    lista.prepend(item);
    if (lista.children.length > 5) lista.lastChild.remove();
}

function obtenerLetra(n) {
    if (n <= 15) return 'B';
    if (n <= 30) return 'I';
    if (n <= 45) return 'N';
    if (n <= 60) return 'G';
    return 'O';
}

// --- 5. DIBUJO DEL PATRÓN ---
function crearCuadriculaDibujo(contenedor) {
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
    db.ref('configuracion/patron').set(patronVictoria)
        .then(() => {
            alert("Patrón sincronizado.");
            document.getElementById('modalConfig').style.display = 'none';
        });
}

// --- 6. REINICIO ---
const resetBtn = document.getElementById('resetBtn');
if(resetBtn) {
    resetBtn.onclick = reiniciarPartida;
}

function reiniciarPartida() {
    if (!confirm("¿Deseas reiniciar la partida actual?")) return;

    db.ref('historialBolas').remove();
    db.ref('notificaciones/bingo').remove(); // Limpiar alertas de ganadores
    db.ref('partidaActual').set({
        status: "reiniciado",
        numero: "--",
        letra: "-",
        ultimoCambio: Date.now()
    });
    
    location.reload();
}
