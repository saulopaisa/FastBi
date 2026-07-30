// ruleta-movil.js - Navegación y UI móvil

var pestanaActual = 'config';
var intervaloCronometroVisual = null;
var intervaloCronometroRuleta = null;

// ============ NAVEGACIÓN ============
function navegarA(seccion) {
    document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('activo'); });
    document.getElementById('nav' + seccion.charAt(0).toUpperCase() + seccion.slice(1)).classList.add('activo');
    
    document.querySelectorAll('.section-config, .section-ruleta').forEach(function(s) { s.classList.remove('activo'); });
    
    if (seccion === 'config') {
        document.getElementById('sectionConfig').classList.add('activo');
    } else if (seccion === 'ruleta') {
        document.getElementById('sectionRuleta').classList.add('activo');
    }
    
    pestanaActual = seccion;
}

// ============ GENERAR LINK DE SALA ============
function generarLinkSala() {
    var salaId = localStorage.getItem('salaActiva') || 'bingo-default';
    var link = location.origin + location.pathname + '?sala=' + encodeURIComponent(salaId);
    navigator.clipboard.writeText(link).then(function() {
        alert('✅ Link copiado!\n\nPégalo en el otro dispositivo:\n\n' + link);
    });
}

// ============ VERIFICAR PARTIDA VIGENTE ============
function verificarPartidaVigente() {
    if (typeof window.juegoActivo === 'undefined') return;
    
    var aviso = document.getElementById('partidaVigente');
    var btnComenzar = document.getElementById('btnComenzarPartida');
    var btnReiniciar = document.getElementById('btnReiniciarPartida');
    var cronVisual = document.getElementById('cronometroVisual');
    
    if (window.juegoActivo && window.etapaActual >= 3) {
        if (aviso) aviso.style.display = 'block';
        if (btnComenzar) btnComenzar.style.display = 'none';
        if (btnReiniciar) btnReiniciar.style.display = 'block';
        if (cronVisual) cronVisual.style.display = 'none';
        if (window.intervaloTemporizador) {
            document.getElementById('cronometroVisualRuleta').style.display = 'block';
        }
    } else {
        if (aviso) aviso.style.display = 'none';
        if (btnComenzar) btnComenzar.style.display = 'block';
        if (btnReiniciar) btnReiniciar.style.display = 'none';
    }
}

// ============ COMENZAR PARTIDA ============
function comenzarPartida() {
    if (typeof window.juegoActivo === 'undefined') {
        alert('Error: ruleta.js no cargó. Recarga la página.');
        return;
    }
    
    if (window.juegoActivo && window.etapaActual >= 3) {
        alert('⚠️ Ya hay una partida vigente. Ve a la pestaña RULETA.');
        navegarA('ruleta');
        return;
    }
    
    var min = parseInt(document.getElementById('minutosInicioMobile').value) || 0;
    
    if (min <= 0) {
        window.juegoActivo = true;
        localStorage.setItem('bingo_activo_' + (localStorage.getItem('salaActiva')||'bingo-default'), 'true');
        if (window.modoJuegoSeleccionado === 'automatico' && window.iniciarBingoAutomatico) {
            window.iniciarBingoAutomatico();
        }
        navegarA('ruleta');
        actualizarUIMovil();
        verificarPartidaVigente();
        return;
    }
    
    var cronVisual = document.getElementById('cronometroVisual');
    if (cronVisual) cronVisual.style.display = 'block';
    document.getElementById('cronometroVisualRuleta').style.display = 'block';
    
    var tiempo = min * 60;
    var tiempoTotal = tiempo;
    
    actualizarCronometroConfig(tiempo, tiempoTotal);
    actualizarCronometroRuleta(tiempo, tiempoTotal);
    
    if (intervaloCronometroVisual) clearInterval(intervaloCronometroVisual);
    if (intervaloCronometroRuleta) clearInterval(intervaloCronometroRuleta);
    
    intervaloCronometroVisual = setInterval(function() {
        tiempo--;
        actualizarCronometroConfig(tiempo, tiempoTotal);
        actualizarCronometroRuleta(tiempo, tiempoTotal);
        
        if (tiempo <= 0) {
            clearInterval(intervaloCronometroVisual);
            clearInterval(intervaloCronometroRuleta);
            intervaloCronometroVisual = null;
            intervaloCronometroRuleta = null;
            
            if (cronVisual) cronVisual.style.display = 'none';
            document.getElementById('cronometroVisualRuleta').style.display = 'none';
            
            window.juegoActivo = true;
            localStorage.setItem('bingo_activo_' + (localStorage.getItem('salaActiva')||'bingo-default'), 'true');
            
            if (window.modoJuegoSeleccionado === 'automatico' && window.iniciarBingoAutomatico) {
                window.iniciarBingoAutomatico();
            }
            
            verificarPartidaVigente();
            
            if ('speechSynthesis' in window) {
                var msg = new SpeechSynthesisUtterance('¡Es hora de empezar el bingo!');
                msg.lang = 'es-ES'; window.speechSynthesis.speak(msg);
            }
        }
    }, 1000);
}

function actualizarCronometroConfig(tiempo, tiempoTotal) {
    var mins = Math.floor(tiempo / 60);
    var segs = tiempo % 60;
    var el = document.getElementById('cronometroVisualTiempo');
    if (el) el.textContent = String(mins).padStart(2, '0') + ':' + String(segs).padStart(2, '0');
    var porcentaje = ((tiempoTotal - tiempo) / tiempoTotal) * 100;
    var prog = document.getElementById('cronometroVisualProgreso');
    if (prog) prog.style.width = porcentaje + '%';
}

function actualizarCronometroRuleta(tiempo, tiempoTotal) {
    var mins = Math.floor(tiempo / 60);
    var segs = tiempo % 60;
    var el = document.getElementById('cronometroVisualRuletaTiempo');
    if (el) el.textContent = String(mins).padStart(2, '0') + ':' + String(segs).padStart(2, '0');
    var porcentaje = ((tiempoTotal - tiempo) / tiempoTotal) * 100;
    var prog = document.getElementById('cronometroVisualRuletaProgreso');
    if (prog) prog.style.width = porcentaje + '%';
}

// ============ PROGRAMAR JUEGO MÓVIL ============
function programarJuegoMobile() {
    var min = parseInt(document.getElementById('minutosInicioMobile').value) || 0;
    if (min <= 0) { alert('Ingresa los minutos'); return; }
    
    var modo = confirm('⏰ Cronómetro de ' + min + ' min.\n\n¿Modo AUTOMÁTICO al llegar a 0?\n✅ Aceptar = Auto\n❌ Cancelar = Manual');
    window.modoJuegoSeleccionado = modo ? 'automatico' : 'manual';
    
    if (window.programarJuego) window.programarJuego();
    comenzarPartida();
}

// ============ REINICIAR PARTIDA ============
function reiniciarPartida() {
    if (confirm('⚠️ ¿Reiniciar la partida? Se limpiarán los números cantados.')) {
        var resetBtn = document.getElementById('resetBtn');
        if (resetBtn) resetBtn.click();
        
        document.getElementById('cronometroVisual').style.display = 'none';
        document.getElementById('cronometroVisualRuleta').style.display = 'none';
        if (intervaloCronometroVisual) clearInterval(intervaloCronometroVisual);
        if (intervaloCronometroRuleta) clearInterval(intervaloCronometroRuleta);
        verificarPartidaVigente();
        actualizarUIMovil();
        navegarA('config');
    }
}

// ============ INICIAR AUTO MÓVIL ============
function iniciarAutoMobile() {
    if (window.iniciarBingoAutomatico) window.iniciarBingoAutomatico();
}

// ============ MODAL VERIFICADOR ============
function abrirModalVerificador() {
    document.getElementById('modalVerificador').classList.add('activo');
}

function cerrarModalVerificador() {
    document.getElementById('modalVerificador').classList.remove('activo');
}

function buscarCartonMobile() {
    var id = document.getElementById('idABuscarMobile').value.trim();
    if (!id) { alert('Ingresa un ID'); return; }
    
    var inputPC = document.getElementById('idABuscar');
    if (inputPC) inputPC.value = id;
    if (window.revisarCartonManual) window.revisarCartonManual();
    
    setTimeout(function() {
        var original = document.getElementById('minicartonVerificador');
        var mobile = document.getElementById('minicartonMobile');
        if (original && mobile) mobile.innerHTML = original.innerHTML;
    }, 500);
}

// ============ CHAT ============
function toggleChat() {
    var panel = document.getElementById('chatPanel');
    panel.classList.toggle('activo');
    if (panel.classList.contains('activo')) {
        document.getElementById('chatBadge').style.display = 'none';
        document.getElementById('chatBadge').textContent = '0';
    }
}

function enviarChat() {
    var input = document.getElementById('chatInput');
    var mensaje = input.value.trim();
    if (!mensaje) return;
    
    var salaId = localStorage.getItem('salaActiva') || 'bingo-default';
    db.ref('partidas/' + salaId + '/chat').push({
        mensaje: mensaje, 
        timestamp: Date.now(), 
        admin: true
    });
    input.value = '';
}

function limpiarChat() {
    if (confirm('¿Borrar toda la conversación?')) {
        var salaId = localStorage.getItem('salaActiva') || 'bingo-default';
        db.ref('partidas/' + salaId + '/chat').remove();
        document.getElementById('chatMensajes').innerHTML = '<p class="chat-vacio">No hay mensajes</p>';
    }
}

function escucharChat() {
    var salaId = localStorage.getItem('salaActiva') || 'bingo-default';
    db.ref('partidas/' + salaId + '/chat').limitToLast(30).on('value', function(snap) {
        var contenedor = document.getElementById('chatMensajes');
        if (!contenedor) return;
        if (!snap.exists()) { contenedor.innerHTML = '<p class="chat-vacio">No hay mensajes</p>'; return; }
        
        contenedor.innerHTML = '';
        var mensajes = [];
        snap.forEach(function(child) { mensajes.push(child.val()); });
        mensajes.sort(function(a, b) { return (a.timestamp || 0) - (b.timestamp || 0); });
        
        mensajes.forEach(function(msg) {
            var div = document.createElement('div');
            if (msg.sistema) {
                div.className = 'msg-item';
                div.style.background = '#fef3c7';
                div.style.color = '#92400e';
                div.style.textAlign = 'center';
                div.style.margin = '4px auto';
                div.style.fontStyle = 'italic';
            } else {
                div.className = 'msg-item ' + (msg.admin ? 'msg-admin' : 'msg-jugador');
            }
            div.innerHTML = msg.mensaje + '<div class="msg-timestamp">' + new Date(msg.timestamp).toLocaleTimeString() + '</div>';
            contenedor.appendChild(div);
        });
        contenedor.scrollTop = contenedor.scrollHeight;
        
        var panel = document.getElementById('chatPanel');
        if (!panel.classList.contains('activo') && mensajes.length > 0) {
            var badge = document.getElementById('chatBadge');
            badge.style.display = 'flex';
            badge.textContent = mensajes.length > 99 ? '99+' : mensajes.length;
        }
    });
}

// ============ GESTIÓN DE CHAT DESDE MÓVIL ============
window.abrirControlChat = function() {
    var jugadores = window.jugadoresActivos || [];
    if (jugadores.length === 0) {
        alert('No hay jugadores activos');
        return;
    }
    
    var lista = 'JUGADORES:\n\n';
    jugadores.forEach(function(j, i) {
        lista += (i + 1) + '. ' + j + '\n';
    });
    
    var jugador = prompt(lista + '\nEscribe el nombre del jugador para DESBLOQUEAR chat:');
    if (jugador && jugadores.indexOf(jugador) !== -1) {
        var minutos = prompt('¿Por cuántos minutos? (1-10):', '2');
        minutos = parseInt(minutos) || 2;
        if (minutos < 1) minutos = 1;
        if (minutos > 10) minutos = 10;
        
        if (window.desbloquearChatJugador) {
            window.desbloquearChatJugador(jugador, minutos);
        }
    }
};

// Agregar botón de gestión al chat
setTimeout(function() {
    var chatHeader = document.querySelector('.chat-header');
    if (chatHeader) {
        var btnGestion = document.createElement('button');
        btnGestion.textContent = '🔓';
        btnGestion.style.cssText = 'background:#10b981;border:none;color:white;padding:2px 8px;border-radius:4px;cursor:pointer;font-size:0.7em;margin-left:8px;';
        btnGestion.onclick = window.abrirControlChat;
        btnGestion.title = 'Gestionar chat de jugadores';
        chatHeader.appendChild(btnGestion);
    }
}, 500);

// ============ COPIAR SALA ============
function copiarSalaId() {
    var salaId = localStorage.getItem('salaActiva') || 'bingo-default';
    navigator.clipboard.writeText(salaId).then(function() {
        alert('✅ ID de sala: ' + salaId);
    });
}

// ============ SORTEO MANUAL ============
function sortearManualMobile() {
    var btnPC = document.getElementById('drawBtn');
    if (btnPC) btnPC.click();
}

// ============ ACTUALIZAR UI ============
function actualizarUIMovil() {
    if (typeof window.etapaActual === 'undefined') return;
    
    var configLista = window.etapaActual >= 2;
    var juegoListo = window.etapaActual >= 3;
    var enPausa = window.enPausa || false;
    
    if (window.jugadoresActivos && window.jugadoresActivos.length > 0) {
        var txt = document.getElementById('statusJugadoresTexto');
        var check = document.getElementById('statusJugadoresCheck');
        var card = document.getElementById('statusJugadoresCard');
        if (txt) txt.textContent = window.jugadoresActivos.length + ' jugadores';
        if (check) check.textContent = '✅';
        if (card) { card.classList.add('completado'); card.classList.remove('pendiente'); }
    }
    
    if (window.patronBingo && window.patronBingo.some(function(x) { return x; })) {
        var txt = document.getElementById('statusPatronTexto');
        var check = document.getElementById('statusPatronCheck');
        var card = document.getElementById('statusPatronCard');
        if (txt) txt.textContent = obtenerNombrePatronMovil();
        if (check) check.textContent = '✅';
        if (card) { card.classList.add('completado'); card.classList.remove('pendiente'); }
    }
    
    setDisabled('btnEtapa2Mobile', !configLista);
    setDisabled('btnComenzarPartida', !juegoListo);
    setDisabled('btnProgramarMobile', !juegoListo || enPausa);
    setDisabled('btnAutoMobile', !juegoListo || enPausa);
    setDisabled('drawBtnMobile', !juegoListo || enPausa);
    
    var navRuleta = document.getElementById('navRuleta');
    if (navRuleta && juegoListo) {
        navRuleta.style.opacity = '1';
        navRuleta.style.pointerEvents = 'all';
    }
    
    verificarPartidaVigente();
}

function setDisabled(id, state) {
    var el = document.getElementById(id);
    if (el) el.disabled = state;
}

function obtenerNombrePatronMovil() {
    if (!window.patronBingo) return 'No configurado';
    var a = window.patronBingo.filter(function(x) { return x; }).length;
    if (a === 25) return 'Lleno';
    if (a === 0) return 'No configurado';
    if ([0,4,6,8,12,16,18,20,24].every(function(p) { return window.patronBingo[p]; }) && a === 9) return 'La X';
    return a + ' celdas';
}

// ============ TABLERO ============
function inicializarTableroMovil() {
    var grid = document.getElementById('historyGridMobile');
    if (!grid) return;
    grid.innerHTML = '';
    for (var i = 1; i <= 75; i++) {
        var div = document.createElement('div');
        div.className = 'celda-movil';
        div.textContent = i;
        if (window.cantados && window.cantados.indexOf(i) !== -1) div.classList.add('cantada');
        grid.appendChild(div);
    }
}

// ============ INICIAR ============
document.addEventListener('DOMContentLoaded', function() {
    escucharChat();
    inicializarTableroMovil();
    verificarPartidaVigente();
    
    setInterval(function() {
        actualizarUIMovil();
        inicializarTableroMovil();
        
        var total = window.cantados ? window.cantados.length : 0;
        var el = document.getElementById('totalCantadosMobile');
        if (el) el.textContent = total + '/75';
        
        var oc = document.getElementById('onlineCountMobile');
        if (oc && window.jugadoresActivos) oc.textContent = '👥 ' + window.jugadoresActivos.length;
        
        var cronPC = document.getElementById('cronometroBingo');
        var cronMobile = document.getElementById('cronometroBingoMobile');
        if (cronPC && cronMobile) cronMobile.textContent = cronPC.textContent;
        
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
