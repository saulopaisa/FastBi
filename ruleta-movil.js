// ruleta-movil.js - Navegación y UI móvil

var pestanaActual = 'config';
var intervaloCronometroVisual = null;
var intervaloCronometroRuleta = null;

// ============ NAVEGACIÓN ============
function navegarA(seccion) {
    document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('activo'); });
    
    var navId = 'navConfig';
    if (seccion === 'ruleta') navId = 'navRuleta';
    else if (seccion === 'verificar') navId = 'navVerificar';
    else if (seccion === 'chat') navId = 'navChat';
    
    var navEl = document.getElementById(navId);
    if (navEl) navEl.classList.add('activo');
    
    document.querySelectorAll('.section-config, .section-ruleta').forEach(function(s) { s.classList.remove('activo'); });
    
    if (seccion === 'config') {
        document.getElementById('sectionConfig').classList.add('activo');
    } else if (seccion === 'ruleta') {
        // Solo permite ir a ruleta si la partida está configurada
        if (window.etapaActual >= 3) {
            document.getElementById('sectionRuleta').classList.add('activo');
        } else {
            mostrarToast('⚠️ Configura la partida primero', 'error');
            document.getElementById('sectionConfig').classList.add('activo');
            document.getElementById('navConfig').classList.add('activo');
            return;
        }
    }
    
    pestanaActual = seccion;
}

// ============ GENERAR LINK DE SALA ============
function generarLinkSala() {
    var salaId = localStorage.getItem('salaActiva') || 'bingo-default';
    var link = location.origin + location.pathname.replace(/[^\/]*$/, '') + 'jugador.html?sala=' + encodeURIComponent(salaId);
    navigator.clipboard.writeText(link).then(function() {
        alert('✅ Link copiado!\n\nComparte con los jugadores:\n\n' + link);
    }).catch(function() {
        prompt('📋 Copia este link:', link);
    });
}

// ============ VERIFICAR PARTIDA VIGENTE ============
function verificarPartidaVigente() {
    if (typeof window.juegoActivo === 'undefined') return;
    
    var aviso = document.getElementById('partidaVigente');
    var btnComenzar = document.getElementById('btnComenzarPartida');
    var btnReiniciarConfig = document.getElementById('btnReiniciarPartida');
    var cronVisual = document.getElementById('cronometroVisual');
    
    if (window.partidaIniciada) {
        if (aviso) aviso.style.display = 'block';
        if (btnComenzar) {
            btnComenzar.disabled = true;
            btnComenzar.textContent = '✅ PARTIDA INICIADA';
            btnComenzar.style.animation = 'none';
            btnComenzar.style.boxShadow = 'none';
        }
        if (btnReiniciarConfig) btnReiniciarConfig.style.display = 'block';
        if (cronVisual) cronVisual.style.display = 'none';
    } else {
        if (aviso) aviso.style.display = 'none';
        if (btnComenzar) {
            btnComenzar.disabled = (window.etapaActual < 3);
            btnComenzar.textContent = '🚀 INICIAR PARTIDA';
            btnComenzar.style.animation = 'glowComenzar 2s infinite';
            btnComenzar.style.boxShadow = '0 4px 20px rgba(16, 185, 129, 0.4)';
        }
        if (btnReiniciarConfig) btnReiniciarConfig.style.display = 'none';
    }
}

// ============ COMENZAR PARTIDA ============
function comenzarPartida() {
    if (typeof window.juegoActivo === 'undefined') {
        alert('Error: ruleta.js no cargó. Recarga la página.');
        return;
    }
    
    if (window.etapaActual < 3) {
        alert('⚠️ Primero configura jugadores y patrón.');
        return;
    }
    
    // Actualizar variable global
    window.partidaIniciada = true;
    
    // Deshabilitar botón INICIAR PARTIDA
    var btnComenzar = document.getElementById('btnComenzarPartida');
    if (btnComenzar) {
        btnComenzar.disabled = true;
        btnComenzar.textContent = '✅ PARTIDA INICIADA';
        btnComenzar.style.animation = 'none';
        btnComenzar.style.boxShadow = 'none';
    }
    
    // Habilitar controles de ruleta
    var btnAuto = document.getElementById('btnAutoMobile');
    var btnManual = document.getElementById('drawBtnMobile');
    var btnProg = document.getElementById('btnProgramarMobile');
    var btnReiniciar = document.getElementById('btnReiniciarRuleta');
    
    if (btnAuto) {
        btnAuto.disabled = false;
        btnAuto.onclick = window.iniciarBingoAutomatico;
    }
    if (btnManual) { btnManual.disabled = false; btnManual.style.opacity = '1'; btnManual.style.pointerEvents = 'all'; }
    if (btnProg) btnProg.disabled = false;
    if (btnReiniciar) btnReiniciar.style.display = 'block';
    
    // Mostrar botón reiniciar en config también
    var btnReiniciarConfig = document.getElementById('btnReiniciarPartida');
    if (btnReiniciarConfig) btnReiniciarConfig.style.display = 'block';
    
    // Actualizar Firebase
    db.ref('partidas/' + SALA_ID).update({
        estado: 'jugando',
        partidaIniciada: true,
        mensajeAdmin: '▶️ ¡Partida iniciada! Espera los números...',
        timestamp: Date.now()
    });
    
    // Actualizar UI
    if (typeof actualizarEtapas === 'function') actualizarEtapas();
    verificarPartidaVigente();
    
    // Navegar a la ruleta
    navegarA('ruleta');
    
    mostrarToast('▶️ Partida iniciada', 'success');
}

// ============ REINICIAR PARTIDA (DESDE RULETA) ============
function reiniciarPartida() {
    if (confirm('⚠️ ¿Reiniciar la partida?\n\nSe limpiarán todos los números cantados.')) {
        // Llamar a la función global de ruleta.js
        if (window.reiniciarPartidaGlobal) {
            window.reiniciarPartidaGlobal();
        } else {
            // Fallback si no existe la función global
            if (window.intervaloAutomatico) clearInterval(window.intervaloAutomatico);
            if (window.intervaloTemporizador) clearInterval(window.intervaloTemporizador);
            window.cantados = [];
            window.partidaIniciada = false;
            window.bingoDetectado = false;
            window.modoAutomatico = false;
            if (typeof limpiarTableroCompleto === 'function') limpiarTableroCompleto();
            if (typeof actualizarUltimaBolaGrande === 'function') actualizarUltimaBolaGrande();
            if (typeof actualizarUltimasBolasChicas === 'function') actualizarUltimasBolasChicas();
            db.ref('partidas/' + SALA_ID).update({ 
                estado: 'nueva_partida', 
                cantados: [], 
                partidaIniciada: false,
                cronometro: 0,
                mensajeAdmin: '🔄 Partida reiniciada',
                timestamp: Date.now() 
            });
        }
        
        var cronVisual = document.getElementById('cronometroVisual');
        var cronVisualRuleta = document.getElementById('cronometroVisualRuleta');
        if (cronVisual) cronVisual.style.display = 'none';
        if (cronVisualRuleta) cronVisualRuleta.style.display = 'none';
        
        if (intervaloCronometroVisual) clearInterval(intervaloCronometroVisual);
        if (intervaloCronometroRuleta) clearInterval(intervaloCronometroRuleta);
        intervaloCronometroVisual = null;
        intervaloCronometroRuleta = null;
        
        var btnProg = document.getElementById('btnProgramarMobile');
        if (btnProg) { btnProg.textContent = '⏰ PROGRAMAR'; btnProg.disabled = true; }
        
        var btnAuto = document.getElementById('btnAutoMobile');
        if (btnAuto) {
            btnAuto.textContent = '🤖 AUTO';
            btnAuto.style.background = 'linear-gradient(135deg, #8b5cf6, #7c3aed)';
            btnAuto.onclick = window.iniciarBingoAutomatico;
            btnAuto.disabled = true;
        }
        
        var btnReiniciarRuleta = document.getElementById('btnReiniciarRuleta');
        if (btnReiniciarRuleta) btnReiniciarRuleta.style.display = 'none';
        
        var btnReiniciarConfig = document.getElementById('btnReiniciarPartida');
        if (btnReiniciarConfig) btnReiniciarConfig.style.display = 'none';
        
        verificarPartidaVigente();
        actualizarUIMovil();
        navegarA('config');
        
        mostrarToast('🔄 Partida reiniciada', 'success');
    }
}

// ============ CRONÓMETRO CON SEGUNDOS ============
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

// ============ PROGRAMAR JUEGO (CON SEGUNDOS) ============
function programarJuegoMobile() {
    if (!window.partidaIniciada) {
        alert('⚠️ Primero inicia la partida con INICIAR PARTIDA');
        return;
    }
    
    // DETENER bingo automático si está activo
    if (window.modoAutomatico && window.detenerBingoAutomatico) {
        window.detenerBingoAutomatico();
        mostrarToast('🤖 Auto detenido para programar', 'warning');
    }
    
    var inputEl = document.getElementById('minutosInicioMobile');
    var valor = inputEl.value.trim();
    
    var tiempoTotal;
    if (valor.includes(':')) {
        var partes = valor.split(':');
        var mins = parseInt(partes[0]) || 0;
        var segs = parseInt(partes[1]) || 0;
        tiempoTotal = mins * 60 + segs;
    } else {
        var num = parseFloat(valor);
        if (isNaN(num) || num <= 0) {
            alert('Ingresa un tiempo válido\nEjemplos: 2:30 (2 min 30 seg) o 5 (5 minutos)');
            return;
        }
        if (valor.includes('.')) {
            var partes = valor.split('.');
            tiempoTotal = parseInt(partes[0]) * 60 + parseInt(partes[1] || '0');
        } else {
            tiempoTotal = Math.round(num * 60);
        }
    }
    
    if (tiempoTotal <= 0) {
        alert('El tiempo debe ser mayor a 0');
        return;
    }
    
    var mins = Math.floor(tiempoTotal / 60);
    var segs = tiempoTotal % 60;
    var tiempoStr = mins > 0 ? mins + ' min ' + segs + ' seg' : segs + ' seg';
    
    var modo = confirm('⏰ Cronómetro: ' + tiempoStr + '\n\n¿Modo AUTOMÁTICO al llegar a 0?\n✅ Aceptar = Auto\n❌ Cancelar = Manual');
    window.modoJuegoSeleccionado = modo ? 'automatico' : 'manual';
    
    var cronVisual = document.getElementById('cronometroVisual');
    var cronVisualRuleta = document.getElementById('cronometroVisualRuleta');
    
    if (cronVisual) cronVisual.style.display = 'block';
    if (cronVisualRuleta) cronVisualRuleta.style.display = 'block';
    
    var tiempo = tiempoTotal;
    actualizarCronometroConfig(tiempo, tiempoTotal);
    actualizarCronometroRuleta(tiempo, tiempoTotal);
    
    if (intervaloCronometroVisual) clearInterval(intervaloCronometroVisual);
    if (intervaloCronometroRuleta) clearInterval(intervaloCronometroRuleta);
    
    db.ref('partidas/' + SALA_ID).update({
        cronometro: tiempo,
        estado: 'iniciando',
        mensajeAdmin: '⏰ La partida comienza en ' + tiempoStr,
        timestamp: Date.now()
    });
    
    var btnProg = document.getElementById('btnProgramarMobile');
    if (btnProg) { btnProg.textContent = '⏳ ESPERANDO...'; btnProg.disabled = true; }
    
    // Deshabilitar controles durante la cuenta regresiva
    var btnAuto = document.getElementById('btnAutoMobile');
    var btnManual = document.getElementById('drawBtnMobile');
    if (btnAuto) btnAuto.disabled = true;
    if (btnManual) { btnManual.disabled = true; btnManual.style.opacity = '0.5'; btnManual.style.pointerEvents = 'none'; }
    
    intervaloCronometroVisual = setInterval(function() {
        tiempo--;
        actualizarCronometroConfig(tiempo, tiempoTotal);
        actualizarCronometroRuleta(tiempo, tiempoTotal);
        db.ref('partidas/' + SALA_ID).update({ cronometro: tiempo });
        
        if (tiempo <= 0) {
            clearInterval(intervaloCronometroVisual);
            clearInterval(intervaloCronometroRuleta);
            intervaloCronometroVisual = null;
            intervaloCronometroRuleta = null;
            
            if (cronVisual) cronVisual.style.display = 'none';
            if (cronVisualRuleta) cronVisualRuleta.style.display = 'none';
            if (btnProg) { btnProg.textContent = '⏰ PROGRAMAR'; btnProg.disabled = false; }
            
            // Re-habilitar controles
            if (btnAuto) {
                btnAuto.disabled = false;
                btnAuto.onclick = window.iniciarBingoAutomatico;
            }
            if (btnManual) { btnManual.disabled = false; btnManual.style.opacity = '1'; btnManual.style.pointerEvents = 'all'; }
            
            db.ref('partidas/' + SALA_ID).update({
                estado: 'jugando',
                cronometro: 0,
                mensajeAdmin: '▶️ ¡Juego iniciado!',
                timestamp: Date.now()
            });
            
            if (window.modoJuegoSeleccionado === 'automatico' && window.iniciarBingoAutomatico) {
                window.iniciarBingoAutomatico();
            }
            
            if ('speechSynthesis' in window) {
                var msg = new SpeechSynthesisUtterance('¡Es hora de empezar el bingo!');
                msg.lang = 'es-ES';
                window.speechSynthesis.speak(msg);
            }
            
            mostrarToast('▶️ ¡Juego iniciado!', 'success');
        }
    }, 1000);
    
    mostrarToast('⏰ Cronómetro: ' + tiempoStr, 'success');
}

// ============ INICIAR AUTO MÓVIL (TOGGLE) ============
function iniciarAutoMobile() {
    if (!window.partidaIniciada) {
        alert('⚠️ Inicia la partida primero');
        return;
    }
    if (window.modoAutomatico) {
        // Si ya está en auto, detener
        if (window.detenerBingoAutomatico) {
            window.detenerBingoAutomatico();
        }
        return;
    }
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
        document.getElementById('chatInput').focus();
    }
}

function enviarChat() {
    var input = document.getElementById('chatInput');
    var mensaje = input.value.trim();
    if (!mensaje) return;
    
    var salaId = localStorage.getItem('salaActiva') || 'bingo-default';
    db.ref('partidas/' + salaId + '/chat').push({
        mensaje: '📢 ' + mensaje,
        timestamp: Date.now(),
        admin: true
    });
    input.value = '';
    input.style.height = 'auto';
}

function limpiarChat() {
    if (confirm('¿Borrar toda la conversación del chat?')) {
        var salaId = localStorage.getItem('salaActiva') || 'bingo-default';
        db.ref('partidas/' + salaId + '/chat').remove();
        document.getElementById('chatMensajes').innerHTML = '<p class="chat-vacio">Chat limpio</p>';
        mostrarToast('🗑️ Chat borrado', 'success');
    }
}

function escucharChat() {
    var salaId = localStorage.getItem('salaActiva') || 'bingo-default';
    db.ref('partidas/' + salaId + '/chat').limitToLast(50).on('value', function(snap) {
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
                div.className = 'msg-item msg-sistema';
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

// ============ COPIAR SALA ============
function copiarSalaId() {
    var salaId = localStorage.getItem('salaActiva') || 'bingo-default';
    navigator.clipboard.writeText(salaId).then(function() {
        alert('✅ ID de sala: ' + salaId);
    });
}

// ============ SORTEO MANUAL ============
function sortearManualMobile() {
    if (!window.partidaIniciada) {
        alert('⚠️ Inicia la partida primero');
        return;
    }
    var btnPC = document.getElementById('drawBtn');
    if (btnPC) btnPC.click();
}

// ============ ACTUALIZAR UI ============
function actualizarUIMovil() {
    if (typeof window.etapaActual === 'undefined') return;
    
    var juegoListo = window.etapaActual >= 3;
    var enPausa = window.enPausa || false;
    var partidaIniciada = window.partidaIniciada || false;
    
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
    
    setDisabled('btnEtapa2Mobile', !(window.etapaActual >= 2));
    setDisabled('btnProgramarMobile', !juegoListo || enPausa || !partidaIniciada);
    setDisabled('btnAutoMobile', !juegoListo || enPausa || !partidaIniciada);
    setDisabled('drawBtnMobile', !juegoListo || enPausa || !partidaIniciada);
    
    var navRuleta = document.getElementById('navRuleta');
    if (navRuleta) {
        if (juegoListo) {
            navRuleta.style.opacity = '1';
            navRuleta.style.pointerEvents = 'all';
        } else {
            navRuleta.style.opacity = '0.5';
            navRuleta.style.pointerEvents = 'none';
        }
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

// ============ AUTO-AJUSTAR TEXTAREA DEL CHAT ============
function autoAjustarTextarea() {
    var textarea = document.getElementById('chatInput');
    if (!textarea) return;
    
    textarea.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 100) + 'px';
    });
}

// ============ INICIAR ============
document.addEventListener('DOMContentLoaded', function() {
    escucharChat();
    inicializarTableroMovil();
    verificarPartidaVigente();
    autoAjustarTextarea();
    
    var cronVisual = document.getElementById('cronometroVisual');
    var cronVisualRuleta = document.getElementById('cronometroVisualRuleta');
    if (cronVisual) cronVisual.style.display = 'none';
    if (cronVisualRuleta) cronVisualRuleta.style.display = 'none';
    
    setInterval(function() {
        actualizarUIMovil();
        inicializarTableroMovil();
        
        var total = window.cantados ? window.cantados.length : 0;
        var el = document.getElementById('totalCantadosMobile');
        if (el) el.textContent = total + '/75';
        
        var oc = document.getElementById('onlineCountMobile');
        if (oc && window.jugadoresActivos) oc.textContent = '👥 ' + window.jugadoresActivos.length;
        
        var alertaPC = document.getElementById('alertaBingo');
        var alertaMobile = document.getElementById('alertaBingoMobile');
        if (alertaPC && alertaMobile) {
            if (alertaPC.style.display === 'block') {
                alertaMobile.style.display = 'block';
                var ajPC = document.getElementById('alertaJugador');
                var acPC = document.getElementById('alertaCarton');
                if (ajPC) document.getElementById('alertaJugadorMobile').textContent = ajPC.textContent;
                if (acPC) document.getElementById('alertaCartonMobile').textContent = acPC.textContent;
            }
        }
    }, 1000);
});
