// ruleta-movil.js - Navegación y UI móvil

let seccionActual = 'config';
let intervaloCronometroVisual = null;

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

// ============ COMENZAR PARTIDA ============
function comenzarPartida() {
    const min = parseInt(document.getElementById('minutosInicioMobile').value) || 0;
    
    if (min <= 0) {
        // Iniciar inmediatamente
        if (window.modoJuegoSeleccionado === 'automatico') {
            window.iniciarBingoAutomatico();
        }
        navegarA('ruleta');
        actualizarUIMovil();
        return;
    }
    
    // Mostrar cronómetro visual
    const cronVisual = document.getElementById('cronometroVisual');
    cronVisual.style.display = 'block';
    
    let tiempo = min * 60;
    const tiempoTotal = tiempo;
    
    actualizarCronometroVisual(tiempo, tiempoTotal);
    
    if (intervaloCronometroVisual) clearInterval(intervaloCronometroVisual);
    
    intervaloCronometroVisual = setInterval(function() {
        tiempo--;
        actualizarCronometroVisual(tiempo, tiempoTotal);
        
        if (tiempo <= 0) {
            clearInterval(intervaloCronometroVisual);
            intervaloCronometroVisual = null;
            cronVisual.style.display = 'none';
            
            // Iniciar juego
            if (window.modoJuegoSeleccionado === 'automatico') {
                window.iniciarBingoAutomatico();
            }
            navegarA('ruleta');
            actualizarUIMovil();
            
            if ('speechSynthesis' in window) {
                const msg = new SpeechSynthesisUtterance('¡Es hora de empezar el bingo!');
                msg.lang = 'es-ES'; window.speechSynthesis.speak(msg);
            }
        }
    }, 1000);
}

function actualizarCronometroVisual(tiempo, tiempoTotal) {
    const mins = Math.floor(tiempo / 60);
    const segs = tiempo % 60;
    document.getElementById('cronometroVisualTiempo').textContent = 
        String(mins).padStart(2, '0') + ':' + String(segs).padStart(2, '0');
    
    const porcentaje = ((tiempoTotal - tiempo) / tiempoTotal) * 100;
    document.getElementById('cronometroVisualProgreso').style.width = porcentaje + '%';
}

// ============ PROGRAMAR JUEGO MÓVIL ============
function programarJuegoMobile() {
    const min = parseInt(document.getElementById('minutosInicioMobile').value) || 0;
    if (min <= 0) { alert('Ingresa los minutos'); return; }
    
    // Preguntar modo
    const modo = confirm('⏰ Cronómetro de ' + min + ' min.\n\n¿Modo AUTOMÁTICO al llegar a 0?\n✅ Aceptar = Auto\n❌ Cancelar = Manual');
    window.modoJuegoSeleccionado = modo ? 'automatico' : 'manual';
    
    // Iniciar cronómetro visual
    comenzarPartida();
    
    // También iniciar el cronómetro normal
    window.programarJuego();
}

// ============ INICIAR AUTO MÓVIL ============
function iniciarAutoMobile() {
    window.iniciarBingoAutomatico();
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
    if (window.revisarCartonManual) {
        window.revisarCartonManual();
    }
    
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
    if (document.getElementById('drawBtn')) {
        document.getElementById('drawBtn').click();
    }
}

// ============ ACTUALIZAR UI MÓVIL ============
function actualizarUIMovil() {
    if (typeof window.etapaActual === 'undefined') return;
    
    const configLista = window.etapaActual >= 2;
    const juegoListo = window.etapaActual >= 3;
    
    // Status jugadores
    if (window.jugadoresActivos && window.jugadoresActivos.length > 0) {
        document.getElementById('statusJugadoresTexto').textContent = window.jugadoresActivos.length + ' jugadores';
        document.getElementById('statusJugadoresCheck').textContent = '✅';
        document.getElementById('statusJugadoresCard').classList.add('completado');
        document.getElementById('statusJugadoresCard').classList.remove('pendiente');
    }
    
    // Status patrón
    if (window.patronBingo && window.patronBingo.some(function(x) { return x; })) {
        document.getElementById('statusPatronTexto').textContent = obtenerNombrePatronMovil();
        document.getElementById('statusPatronCheck').textContent = '✅';
        document.getElementById('statusPatronCard').classList.add('completado');
        document.getElementById('statusPatronCard').classList.remove('pendiente');
    }
    
    // Habilitar botones
    const btnEtapa2 = document.getElementById('btnEtapa2Mobile');
    const btnComenzar = document.getElementById('btnComenzarPartida');
    const btnProg = document.getElementById('btnProgramarMobile');
    const btnAuto = document.getElementById('btnAutoMobile');
    const btnManual = document.getElementById('drawBtnMobile');
    
    if (btnEtapa2) btnEtapa2.disabled = !configLista;
    if (btnComenzar) btnComenzar.disabled = !juegoListo;
    if (btnProg) btnProg.disabled = !juegoListo || (window.enPausa || false);
    if (btnAuto) btnAuto.disabled = !juegoListo || (window.enPausa || false);
    if (btnManual) btnManual.disabled = !juegoListo || (window.enPausa || false);
    
    // Habilitar pestaña ruleta
    const navRuleta = document.getElementById('navRuleta');
    if (navRuleta && juegoListo) {
        navRuleta.style.opacity = '1';
        navRuleta.style.pointerEvents = 'all';
    }
}

function obtenerNombrePatronMovil() {
    if (!window.patronBingo) return 'No configurado';
    var a = window.patronBingo.filter(function(x) { return x; }).length;
    if (a === 25) return 'Lleno';
    if (a === 0) return 'No configurado';
    if ([0,4,6,8,12,16,18,20,24].every(function(p) { return window.patronBingo[p]; }) && a === 9) return 'La X';
    return a + ' celdas';
}

// ============ TABLERO MÓVIL (NÚMEROS MÁS GRANDES) ============
function inicializarTableroMovil() {
    var grid = document.getElementById('historyGridMobile');
    if (!grid) return;
    grid.innerHTML = '';
    for (var i = 1; i <= 75; i++) {
        var div = document.createElement('div');
        div.className = 'celda-movil';
        div.textContent = i;
        if (window.cantados && window.cantados.indexOf(i) !== -1) {
            div.classList.add('cantada');
        }
        grid.appendChild(div);
    }
}

function actualizarUltimaBolaMovil() {
    var c = document.getElementById('ultimaBolaMobile');
    if (!c || !window.cantados) return;
    if (window.cantados.length > 0) {
        var u = window.cantados[window.cantados.length - 1];
        c.querySelector('.letra').textContent = obtenerLetra(u);
        c.querySelector('.numero').textContent = u;
    }
}

function actualizarUltimosMovil() {
    var c = document.getElementById('ultimosCantadosMobile');
    if (!c || !window.cantados) return;
    c.innerHTML = '';
    var ultimos = window.cantados.slice(-5).reverse();
    for (var i = 0; i < 5; i++) {
        var s = document.createElement('span');
        s.className = 'num-chico-movil';
        if (i < ultimos.length) {
            s.classList.add('cantado');
            s.textContent = obtenerLetra(ultimos[i]) + '-' + ultimos[i];
        } else {
            s.classList.add('vacio');
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
        
        var total = window.cantados ? window.cantados.length : 0;
        var el = document.getElementById('totalCantadosMobile');
        if (el) el.textContent = total + '/75';
        
        if (window.jugadoresActivos) {
            var oc = document.getElementById('onlineCountMobile');
            if (oc) oc.textContent = '👥 ' + window.jugadoresActivos.length;
        }
        
        // Sincronizar cronómetro
        var cronPC = document.getElementById('cronometroBingo');
        var cronMobile = document.getElementById('cronometroBingoMobile');
        if (cronPC && cronMobile) cronMobile.textContent = cronPC.textContent;
        
        // Sincronizar alerta
        var alertaPC = document.getElementById('alertaBingo');
        var alertaMobile = document.getElementById('alertaBingoMobile');
        if (alertaPC && alertaMobile && alertaPC.style.display === 'block') {
            alertaMobile.style.display = 'block';
            var ajPC = document.getElementById('alertaJugador');
            var acPC = document.getElementById('alertaCarton');
            if (ajPC) document.getElementById('alertaJugadorMobile').textContent = ajPC.textContent;
            if (acPC) document.getElementById('alertaCartonMobile').textContent = acPC.textContent;
        }
    }, 1000);
});
