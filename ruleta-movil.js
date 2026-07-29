// ruleta-movil.js - Lógica de navegación y UI móvil

let seccionActual = 'config';

// ============ NAVEGACIÓN ============
function navegarA(seccion) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('activo'));
    document.getElementById('nav' + seccion.charAt(0).toUpperCase() + seccion.slice(1)).classList.add('activo');
    
    document.querySelectorAll('.section-config, .section-ruleta').forEach(s => s.classList.remove('activo'));
    
    if (seccion === 'config') {
        document.getElementById('sectionConfig').classList.add('activo');
    } else if (seccion === 'ruleta') {
        document.getElementById('sectionRuleta').classList.add('activo');
    }
    
    seccionActual = seccion;
}

// ============ MODAL VERIFICADOR ============
function abrirModalVerificador() {
    document.getElementById('modalVerificador').classList.add('activo');
}

function cerrarModalVerificador() {
    document.getElementById('modalVerificador').classList.remove('activo');
}

function buscarCartonMobile() {
    const id = document.getElementById('idABuscarMobile').value.trim();
    if (!id) { alert('Ingresa un ID'); return; }
    document.getElementById('idABuscar').value = id;
    window.revisarCartonManual();
    
    setTimeout(function() {
        const original = document.getElementById('minicartonVerificador');
        const mobile = document.getElementById('minicartonMobile');
        if (original && mobile) mobile.innerHTML = original.innerHTML;
    }, 500);
}

// ============ CHAT ============
function toggleChat() {
    const panel = document.getElementById('chatPanel');
    panel.classList.toggle('activo');
    if (panel.classList.contains('activo')) {
        document.getElementById('chatBadge').style.display = 'none';
        document.getElementById('chatBadge').textContent = '0';
    }
}

function enviarChat() {
    const input = document.getElementById('chatInput');
    const mensaje = input.value.trim();
    if (!mensaje) return;
    
    const salaId = localStorage.getItem('salaActiva') || 'sala-default';
    db.ref('partidas/' + salaId + '/chat').push({
        mensaje: mensaje,
        timestamp: Date.now(),
        admin: true
    });
    
    input.value = '';
}

function escucharChat() {
    const salaId = localStorage.getItem('salaActiva') || 'sala-default';
    db.ref('partidas/' + salaId + '/chat').limitToLast(30).on('value', function(snap) {
        const contenedor = document.getElementById('chatMensajes');
        if (!contenedor) return;
        
        if (!snap.exists()) {
            contenedor.innerHTML = '<p class="chat-vacio">No hay mensajes</p>';
            return;
        }
        
        contenedor.innerHTML = '';
        const mensajes = [];
        snap.forEach(function(child) { mensajes.push(child.val()); });
        mensajes.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        
        mensajes.forEach(function(msg) {
            const div = document.createElement('div');
            div.className = 'msg-item ' + (msg.admin ? 'msg-admin' : 'msg-jugador');
            div.innerHTML = msg.mensaje + '<div class="msg-timestamp">' + new Date(msg.timestamp).toLocaleTimeString() + '</div>';
            contenedor.appendChild(div);
        });
        
        contenedor.scrollTop = contenedor.scrollHeight;
        
        const panel = document.getElementById('chatPanel');
        if (!panel.classList.contains('activo')) {
            const badge = document.getElementById('chatBadge');
            const count = mensajes.length;
            if (count > 0) {
                badge.style.display = 'flex';
                badge.textContent = count > 99 ? '99+' : count;
            }
        }
    });
}

// ============ SORTEO MANUAL MÓVIL ============
function sortearManualMobile() {
    document.getElementById('drawBtn').click();
}

// ============ ACTUALIZAR UI MÓVIL ============
function actualizarUIMovil() {
    const configLista = window.etapaActual >= 2;
    const juegoListo = window.etapaActual >= 3;
    
    if (window.jugadoresActivos && window.jugadoresActivos.length > 0) {
        document.getElementById('statusJugadoresTexto').textContent = window.jugadoresActivos.length + ' jugadores';
        document.getElementById('statusJugadoresCheck').textContent = '✅';
        document.getElementById('statusJugadoresCard').classList.add('completado');
        document.getElementById('statusJugadoresCard').classList.remove('pendiente');
    }
    
    if (window.patronBingo && window.patronBingo.some(x => x)) {
        document.getElementById('statusPatronTexto').textContent = obtenerNombrePatronMovil();
        document.getElementById('statusPatronCheck').textContent = '✅';
        document.getElementById('statusPatronCard').classList.add('completado');
        document.getElementById('statusPatronCard').classList.remove('pendiente');
    }
    
    document.getElementById('btnEtapa2Mobile').disabled = !configLista;
    document.getElementById('btnProgramarMobile').disabled = !juegoListo;
    document.getElementById('btnAutoMobile').disabled = !juegoListo || window.enPausa;
    document.getElementById('drawBtnMobile').disabled = !juegoListo || window.enPausa;
    
    if (juegoListo) {
        document.getElementById('navRuleta').style.opacity = '1';
        document.getElementById('navRuleta').style.pointerEvents = 'all';
    }
}

function obtenerNombrePatronMovil() {
    if (!window.patronBingo) return 'No configurado';
    const a = window.patronBingo.filter(x => x).length;
    if (a === 25) return 'Lleno';
    if (a === 0) return 'No configurado';
    if ([0,4,6,8,12,16,18,20,24].every(p => window.patronBingo[p]) && a === 9) return 'La X';
    return a + ' celdas';
}

// ============ TABLERO MÓVIL ============
function inicializarTableroMovil() {
    const grid = document.getElementById('historyGridMobile');
    if (!grid) return;
    grid.innerHTML = '';
    for (let i = 1; i <= 75; i++) {
        const div = document.createElement('div');
        div.className = 'celda-movil';
        div.textContent = i;
        if (window.cantados && window.cantados.includes(i)) div.classList.add('cantada');
        grid.appendChild(div);
    }
}

function actualizarUltimaBolaMovil() {
    const c = document.getElementById('ultimaBolaMobile');
    if (!c || !window.cantados) return;
    if (window.cantados.length > 0) {
        const u = window.cantados[window.cantados.length - 1];
        c.querySelector('.letra').textContent = obtenerLetra(u);
        c.querySelector('.numero').textContent = u;
    }
}

function actualizarUltimosMovil() {
    const c = document.getElementById('ultimosCantadosMobile');
    if (!c || !window.cantados) return;
    c.innerHTML = '';
    const ultimos = window.cantados.slice(-5).reverse();
    for (let i = 0; i < 5; i++) {
        const s = document.createElement('span');
        s.className = 'num-chico-movil';
        if (i < ultimos.length) {
            s.classList.add('cantado');
            s.textContent = obtenerLetra(ultimos[i]) + '-' + ultimos[i];
        } else {
            s.style.opacity = '0.3';
            s.textContent = '--';
        }
        c.appendChild(s);
    }
}

function obtenerLetra(n) {
    if (n <= 15) return 'B';
    if (n <= 30) return 'I';
    if (n <= 45) return 'N';
    if (n <= 60) return 'G';
    return 'O';
}

// ============ INICIAR ============
document.addEventListener('DOMContentLoaded', function() {
    escucharChat();
    inicializarTableroMovil();
    
    setInterval(function() {
        actualizarUIMovil();
        inicializarTableroMovil();
        actualizarUltimaBolaMovil();
        actualizarUltimosMovil();
        
        const total = window.cantados ? window.cantados.length : 0;
        document.getElementById('totalCantadosMobile').textContent = total + '/75';
        
        if (window.jugadoresActivos) {
            document.getElementById('onlineCountMobile').textContent = '👥 ' + window.jugadoresActivos.length;
        }
        
        const cronPC = document.getElementById('cronometroBingo');
        const cronMobile = document.getElementById('cronometroBingoMobile');
        if (cronPC && cronMobile) cronMobile.textContent = cronPC.textContent;
        
        const alertaPC = document.getElementById('alertaBingo');
        const alertaMobile = document.getElementById('alertaBingoMobile');
        if (alertaPC && alertaMobile && alertaPC.style.display === 'block') {
            alertaMobile.style.display = 'block';
            document.getElementById('alertaJugadorMobile').textContent = document.getElementById('alertaJugador').textContent;
            document.getElementById('alertaCartonMobile').textContent = document.getElementById('alertaCarton').textContent;
        }
    }, 1000);
});
