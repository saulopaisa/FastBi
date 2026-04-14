// --- 1. ESTADO GLOBAL Y PERSISTENCIA ---
let historialLocal = [];
let intervaloCronometro = null;
let misCartonesIds = [];

// --- 2. ESCUCHAS DE FIREBASE (Sincronización en tiempo real) ---

const iniciarConexiones = () => {
    // A. Escuchar el Patrón de Victoria
    db.ref('configuracion/patron').on('value', (snapshot) => {
        const patron = snapshot.val() || Array(25).fill(false);
        dibujarGuiaPatron(patron);
    });

    // B. Escuchar Estado de la Partida, Números y Cronómetro
    db.ref('partidaActual').on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        gestionarEstados(data);

        // Si llega un número nuevo
        if (data.numero && !historialLocal.includes(data.numero)) {
            historialLocal.push(data.numero);
            actualizarBarraBolas(data.letra, data.numero);
            notificarNuevaBola();
        }
    });
};

// --- 3. GESTIÓN DE INTERFAZ (Estados y Cronómetro) ---

function gestionarEstados(data) {
    const overlay = document.getElementById('overlayEspera');
    const banner = document.getElementById('bannerAnuncio');
    const titulo = document.getElementById('tituloEstado');
    
    // 1. Manejo de Reinicio
    if (data.status === "reiniciado") {
        limpiarTodoElJuego();
        return;
    }

    // 2. Manejo de Overlay (Espera / Cronómetro)
    if (data.status === "esperando") {
        overlay.style.display = "flex";
        if (data.proximoJuego) {
            iniciarContadorLocal(data.proximoJuego);
        } else {
            titulo.innerText = "ESPERANDO AL ADMIN...";
            document.getElementById('cronometro').innerText = "00:00";
        }
    } else {
        overlay.style.display = "none";
        clearInterval(intervaloCronometro);
    }

    // 3. Manejo de Banners (Verificando / Ganador)
    if (data.status === "verificando" || data.status === "finalizado") {
        banner.innerText = data.anuncio || "AVISO DEL SISTEMA";
        banner.style.display = "block";
        if (data.status === "finalizado") banner.style.background = "#22c55e";
    } else {
        banner.style.display = "none";
        banner.style.background = "#e63946";
    }
}

function iniciarContadorLocal(targetTimestamp) {
    clearInterval(intervaloCronometro);
    const display = document.getElementById('cronometro');
    
    intervaloCronometro = setInterval(() => {
        const ahora = Date.now();
        const dif = targetTimestamp - ahora;

        if (dif <= 0) {
            display.innerText = "00:00";
            document.getElementById('tituloEstado').innerText = "¡EMPEZAMOS!";
            clearInterval(intervaloCronometro);
        } else {
            const min = Math.floor(dif / 60000);
            const seg = Math.floor((dif % 60000) / 1000);
            display.innerText = `${min.toString().padStart(2,'0')}:${seg.toString().padStart(2,'0')}`;
            document.getElementById('tituloEstado').innerText = "EL JUEGO INICIA EN:";
        }
    }, 1000);
}

// --- 4. MOTOR MATEMÁTICO (Paridad con Admin) ---

function generarMatrizPlayer(id) {
    const seedBase = parseInt(id);
    const rangos = [[1,15],[16,30],[31,45],[46,60],[61,75]];
    
    const shuffleSincronizado = (array, seed) => {
        let m = array.length, t, i;
        while (m) {
            let x = Math.sin(seed++) * 10000;
            i = Math.floor((x - Math.floor(x)) * m--);
            t = array[m]; array[m] = array[i]; array[i] = t;
        }
        return array;
    };

    const columnas = rangos.map((r, indexCol) => {
        let n = []; for(let i=r[0]; i<=r[1]; i++) n.push(i);
        // IMPORTANTE: Misma fórmula de semilla que el admin
        return shuffleSincronizado([...n], (seedBase * 10) + indexCol).slice(0, 5);
    });

    let m = [];
    for(let r=0; r<5; r++) {
        let fila = [];
        for(let c=0; c<5; c++) fila.push((r===2 && c===2) ? "FREE" : columnas[c][r]);
        m.push(fila);
    }
    return m;
}

// --- 5. RENDERIZADO Y PERSISTENCIA ---

function dibujarGuiaPatron(patron) {
    const grid = document.getElementById('gridPatron');
    if (!grid) return;
    grid.innerHTML = '';
    patron.forEach((activa, i) => {
        const celda = document.createElement('div');
        celda.className = `celda-patron ${activa ? 'activa' : ''}`;
        if (i === 12) celda.innerHTML = "★";
        grid.appendChild(celda);
    });
}

function generarCartonVisual(id) {
    const matriz = generarMatrizPlayer(id);
    const card = document.createElement('div');
    card.className = 'bingo-card';
    card.dataset.id = id;
    
    let html = `<div class="card-id-label">CARTÓN # ${id}</div>
                <table class="bingo-table">
                    <thead><tr><th>B</th><th>I</th><th>N</th><th>G</th><th>O</th></tr></thead>
                    <tbody>`;
    
    matriz.forEach((fila, r) => {
        html += '<tr>';
        fila.forEach((n, c) => {
            if(n === 'FREE') html += `<td class="free-space marked" data-pos="${r}-${c}">★</td>`;
            else html += `<td onclick="marcarCelda(this)" data-num="${n}">${n}</td>`;
        });
        html += '</tr>';
    });
    html += '</tbody></table>';
    card.innerHTML = html;
    return card;
}

function marcarCelda(celda) {
    celda.classList.toggle('marked');
    if (navigator.vibrate) navigator.vibrate(30);
    guardarMarcasLocal();
}

function guardarMarcasLocal() {
    const marcas = [];
    document.querySelectorAll('.bingo-table td.marked').forEach(td => {
        if (td.dataset.num) marcas.push(td.dataset.num);
    });
    localStorage.setItem('marcas_sesion', JSON.stringify(marcas));
}

function cargarMarcasLocal() {
    const guardadas = JSON.parse(localStorage.getItem('marcas_sesion') || "[]");
    document.querySelectorAll('.bingo-table td').forEach(td => {
        if (guardadas.includes(td.dataset.num)) td.classList.add('marked');
    });
}

// --- 6. UTILIDADES ---

function actualizarBarraBolas(letra, numero) {
    const barra = document.getElementById('barraHistorial');
    const msg = document.getElementById('msgEspera');
    if (msg) msg.remove();

    const bola = document.createElement('div');
    bola.className = 'bola-historial';
    bola.innerHTML = `<div><small>${letra}</small><br>${numero}</div>`;
    barra.prepend(bola);
}

function limpiarTodoElJuego() {
    localStorage.removeItem('marcas_sesion');
    historialLocal = [];
    document.getElementById('barraHistorial').innerHTML = '<div id="msgEspera">Esperando inicio...</div>';
    document.querySelectorAll('.bingo-table td').forEach(td => {
        if (!td.classList.contains('free-space')) td.classList.remove('marked');
    });
}

function notificarNuevaBola() {
    if (window.Notification && Notification.permission === "granted") {
        // Opcional: Notificación push local si el usuario no está viendo la pestaña
    }
}

// --- 7. INICIALIZACIÓN ---

window.onload = () => {
    iniciarConexiones();
    const params = new URLSearchParams(window.location.search);
    const p = params.get('p');
    const contenedor = document.getElementById('contenedorCartones');

    if (p) {
        try {
            // Decodificar lista de IDs desde Base64
            const datos = JSON.parse(decodeURIComponent(escape(atob(p))));
            const listaIds = Array.isArray(datos) ? datos : [datos];
            
            contenedor.innerHTML = "";
            listaIds.forEach(item => {
                const id = (typeof item === 'object') ? item.id : item;
                misCartonesIds.push(id);
                contenedor.appendChild(generarCartonVisual(id));
            });

            // Guardar para el botón de "Cantar Bingo"
            localStorage.setItem('mis_cartones_ids', JSON.stringify(misCartonesIds));
            
            // Recuperar marcas si el jugador refrescó la página
            setTimeout(cargarMarcasLocal, 200);

        } catch (e) {
            contenedor.innerHTML = "<h3>Error en el enlace</h3>";
        }
    }
};
