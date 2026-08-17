// ruleta-movil.js - Navegación y UI móvil (Supabase)

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
    var base = location.origin + location.pathname.replace(/[^\/]*$/, '');
    var link = base + 'jugador.html?sala=' + encodeURIComponent(salaId);
    navigator.clipboard.writeText(link).then(function() {
        alert('✅ Link de sala copiado:\n\n' + link);
    }).catch(function() {
        prompt('📋 Copia este link:', link);
    });
}

// ============ VERIFICAR PARTIDA VIGENTE ============
function verificarPartidaVigente() {
    var aviso = document.getElementById('partidaVigente');
    var btnComenzar = document.getElementById('btnComenzarPartida');
    var btnReiniciarConfig = document.getElementById('btnReiniciarPartida');
    
    if (window.partidaIniciada) {
        if (aviso) aviso.style.display = 'block';
        if (btnComenzar) {
            btnComenzar.disabled = true;
            btnComenzar.textContent = '✅ PARTIDA INICIADA';
            btnComenzar.style.animation = 'none';
            btnComenzar.style.boxShadow = 'none';
        }
        if (btnReiniciarConfig) btnReiniciarConfig.style.display = 'block';
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
    if (window.etapaActual < 3) {
        alert('⚠️ Primero configura jugadores y patrón.');
        return;
    }
    if (window.partidaIniciada) {
        mostrarToast('⚠️ La partida ya está iniciada', 'error');
        return;
    }
    
    window.partidaIniciada = true;
    
    var btnComenzar = document.getElementById('btnComenzarPartida');
    if (btnComenzar) {
        btnComenzar.disabled = true;
        btnComenzar.textContent = '✅ PARTIDA INICIADA';
        btnComenzar.style.animation = 'none';
        btnComenzar.style.boxShadow = 'none';
    }
    
    var btnAuto = document.getElementById('btnAutoMobile');
    var btnManual = document.getElementById('drawBtnMobile');
    var btnProg = document.getElementById('btnProgramarMobile');
    var btnReiniciar = document.getElementById('btnReiniciarRuleta');
    
    if (btnAuto) { btnAuto.disabled = false; btnAuto.onclick = window.iniciarBingoAutomatico; }
    if (btnManual) { btnManual.disabled = false; btnManual.style.opacity = '1'; btnManual.style.pointerEvents = 'all'; }
    if (btnProg) btnProg.disabled = false;
    if (btnReiniciar) btnReiniciar.style.display = 'block';
    
    var btnReiniciarConfig = document.getElementById('btnReiniciarPartida');
    if (btnReiniciarConfig) btnReiniciarConfig.style.display = 'block';
    
    // Guardar en Supabase
    supabase.from('partidas').upsert({
        sala_id: SALA_ID,
        estado: 'jugando',
        cantados: window.cantados || [],
        patron: window.patronBingo || [],
        jugadores_activos: window.jugadoresActivos || [],
        partida_iniciada: true,
        timestamp: Date.now()
    }).then(function() {});
    
    if (typeof actualizarEtapas === 'function') actualizarEtapas();
    verificarPartidaVigente();
    navegarA('ruleta');
    mostrarToast('▶️ Partida iniciada', 'success');
}

// ============ REINICIAR PARTIDA ============
function reiniciarPartida() {
    if (!confirm('⚠️ ¿Reiniciar la partida?\n\nSe limpiarán todos los números cantados.')) return;
    if (window.reiniciarPartidaGlobal) { window.reiniciarPartidaGlobal(); }
    else {
        window.cantados = [];
        window.partidaIniciada = false;
        window.modoAutomatico = false;
        if (typeof limpiarTableroCompleto === 'function') limpiarTableroCompleto();
        if (typeof actualizarUltimaBolaGrande === 'function') actualizarUltimaBolaGrande();
        if (typeof actualizarUltimasBolasChicas === 'function') actualizarUltimasBolasChicas();
        supabase.from('partidas').delete().eq('sala_id', SALA_ID).then(function() {});
    }
    
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

// ============ CRONÓMETRO ============
function actualizarCronometroConfig(tiempo, tiempoTotal) {
    var mins = Math.floor(tiempo / 60), segs = tiempo % 60;
    var el = document.getElementById('cronometroVisualTiempo');
    if (el) el.textContent = String(mins).padStart(2, '0') + ':' + String(segs).padStart(2, '0');
    var prog = document.getElementById('cronometroVisualProgreso');
    if (prog) prog.style.width = ((tiempoTotal - tiempo) / tiempoTotal) * 100 + '%';
}

function actualizarCronometroRuleta(tiempo, tiempoTotal) {
    var mins = Math.floor(tiempo / 60), segs = tiempo % 60;
    var el = document.getElementById('cronometroVisualRuletaTiempo');
    if (el) el.textContent = String(mins).padStart(2, '0') + ':' + String(segs).padStart(2, '0');
    var prog = document.getElementById('cronometroVisualRuletaProgreso');
    if (prog) prog.style.width = ((tiempoTotal - tiempo) / tiempoTotal) * 100 + '%';
}

// ============ PROGRAMAR JUEGO ============
function programarJuegoMobile() {
    if (!window.partidaIniciada) { alert('⚠️ Primero inicia la partida'); return; }
    if (window.modoAutomatico && window.detenerBingoAutomatico) { window.detenerBingoAutomatico(); }
    
    var inputEl = document.getElementById('minutosInicioMobile');
    var valor = inputEl.value.trim();
    var tiempoTotal;
    
    if (valor.includes(':')) {
        var partes = valor.split(':');
        tiempoTotal = (parseInt(partes[0]) || 0) * 60 + (parseInt(partes[1]) || 0);
    } else {
        var num = parseFloat(valor);
        if (isNaN(num) || num <= 0) { alert('Ingresa un tiempo válido\nEj: 2:30 o 5'); return; }
        tiempoTotal = Math.round(num * 60);
    }
    
    if (tiempoTotal <= 0) { alert('El tiempo debe ser mayor a 0'); return; }
    
    var mins = Math.floor(tiempoTotal / 60), segs = tiempoTotal % 60;
    var tiempoStr = mins > 0 ? mins + ' min ' + segs + ' seg' : segs + ' seg';
    
    var cronVisual = document.getElementById('cronometroVisual');
    var cronVisualRuleta = document.getElementById('cronometroVisualRuleta');
    if (cronVisual) cronVisual.style.display = 'block';
    if (cronVisualRuleta) cronVisualRuleta.style.display = 'block';
    
    var tiempo = tiempoTotal;
    actualizarCronometroConfig(tiempo, tiempoTotal);
    actualizarCronometroRuleta(tiempo, tiempoTotal);
    
    supabase.from('partidas').update({ cronometro: tiempo }).eq('sala_id', SALA_ID).then(function() {});
    
    var btnProg = document.getElementById('btnProgramarMobile');
    if (btnProg) { btnProg.textContent = '⏳ ESPERANDO...'; btnProg.disabled = true; }
    
    var btnAuto = document.getElementById('btnAutoMobile');
    var btnManual = document.getElementById('drawBtnMobile');
    if (btnAuto) btnAuto.disabled = true;
    if (btnManual) { btnManual.disabled = true; btnManual.style.opacity = '0.5'; }
    
    if (intervaloCronometroVisual) clearInterval(intervaloCronometroVisual);
    
    intervaloCronometroVisual = setInterval(function() {
        tiempo--;
        actualizarCronometroConfig(tiempo, tiempoTotal);
        actualizarCronometroRuleta(tiempo, tiempoTotal);
        supabase.from('partidas').update({ cronometro: tiempo }).eq('sala_id', SALA_ID).then(function() {});
        
        if (tiempo <= 0) {
            clearInterval(intervaloCronometroVisual);
            intervaloCronometroVisual = null;
            if (cronVisual) cronVisual.style.display = 'none';
            if (cronVisualRuleta) cronVisualRuleta.style.display = 'none';
            if (btnProg) { btnProg.textContent = '⏰ PROGRAMAR'; btnProg.disabled = false; }
            if (btnAuto) { btnAuto.disabled = false; btnAuto.onclick = window.iniciarBingoAutomatico; }
            if (btnManual) { btnManual.disabled = false; btnManual.style.opacity = '1'; btnManual.style.pointerEvents = 'all'; }
            if ('speechSynthesis' in window) { var msg = new SpeechSynthesisUtterance('¡Es hora!'); msg.lang = 'es-ES'; window.speechSynthesis.speak(msg); }
            mostrarToast('▶️ ¡Juego iniciado!', 'success');
        }
    }, 1000);
    
    mostrarToast('⏰ Cronómetro: ' + tiempoStr, 'success');
}

// ============ INICIAR AUTO ============
function iniciarAutoMobile() {
    if (!window.partidaIniciada) { alert('⚠️ Inicia la partida primero'); return; }
    if (window.modoAutomatico) { if (window.detenerBingoAutomatico) window.detenerBingoAutomatico(); return; }
    if (window.iniciarBingoAutomatico) window.iniciarBingoAutomatico();
}

// ============ SORTEO MANUAL ============
function sortearManualMobile() {
    if (!window.partidaIniciada) { alert('⚠️ Inicia la partida primero'); return; }
    if (window.modoAutomatico || window.enPausa) return;
    if (window.cantados.length >= 75) { mostrarToast('🎉 Fin del juego', 'success'); return; }
    var b;
    do { b = Math.floor(Math.random() * 75) + 1; } while (window.cantados.indexOf(b) !== -1);
    if (typeof cantarBola === 'function') cantarBola(b);
}

// ============ MODAL VERIFICADOR ============
function abrirModalVerificador() {
    if (window.etapaActual < 3) { mostrarToast('⚠️ Configura la partida primero', 'error'); return; }
    document.getElementById('modalVerificador').classList.add('activo');
}

function cerrarModalVerificador() {
    document.getElementById('modalVerificador').classList.remove('activo');
}

function buscarCartonMobile() {
    var id = document.getElementById('idABuscarMobile').value.trim();
    if (!id) { alert('Ingresa un ID'); return; }
    if (window.revisarCartonManual) window.revisarCartonManual();
}

// ============ CHAT ============
function toggleChat() {
    var panel = document.getElementById('chatPanel');
    panel.classList.toggle('activo');
    if (panel.classList.contains('activo')) {
        document.getElementById('chatBadge').style.display = 'none';
        document.getElementById('chatInput').focus();
    }
}

function enviarChat() {
    var input = document.getElementById('chatInput');
    var mensaje = input.value.trim();
    if (!mensaje) return;
    
    supabase.from('chat').insert({
        sala_id: SALA_ID,
        mensaje: '📢 ' + mensaje,
        admin: true,
        sistema: false,
        timestamp: Date.now()
    }).then(function() {
        input.value = '';
        input.style.height = 'auto';
    });
}

function limpiarChat() {
    if (confirm('¿Borrar toda la conversación del chat?')) {
        supabase.from('chat').delete().eq('sala_id', SALA_ID).then(function() {
            document.getElementById('chatMensajes').innerHTML = '<p class="chat-vacio">Chat limpio</p>';
            mostrarToast('🗑️ Chat borrado', 'success');
        });
    }
}

function escucharChat() {
    // Cargar mensajes existentes
    supabase.from('chat').select('*').eq('sala_id', SALA_ID).order('id', { ascending: false }).limit(50).then(function(result) {
        var contenedor = document.getElementById('chatMensajes');
        if (!contenedor) return;
        if (!result.data || result.data.length === 0) {
            contenedor.innerHTML = '<p class="chat-vacio">No hay mensajes</p>';
            return;
        }
        contenedor.innerHTML = '';
        result.data.reverse().forEach(function(msg) {
            var div = document.createElement('div');
            if (msg.sistema) { div.className = 'msg-item msg-sistema'; }
            else if (msg.admin) { div.className = 'msg-item msg-admin'; }
            else { div.className = 'msg-item msg-jugador'; }
            div.textContent = msg.mensaje;
            var ts = document.createElement('div');
            ts.className = 'msg-timestamp';
            ts.textContent = new Date(msg.timestamp).toLocaleTimeString();
            div.appendChild(ts);
            contenedor.appendChild(div);
        });
        contenedor.scrollTop = contenedor.scrollHeight;
    });
    
    // Escuchar nuevos mensajes
    supabase.channel('chat-ruleta-' + SALA_ID)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat', filter: 'sala_id=eq.' + SALA_ID }, function(payload) {
            var msg = payload.new;
            var contenedor = document.getElementById('chatMensajes');
            if (!contenedor) return;
            var div = document.createElement('div');
            if (msg.sistema) { div.className = 'msg-item msg-sistema'; }
            else if (msg.admin) { div.className = 'msg-item msg-admin'; }
            else { div.className = 'msg-item msg-jugador'; }
            div.textContent = msg.mensaje;
            var ts = document.createElement('div');
            ts.className = 'msg-timestamp';
            ts.textContent = new Date(msg.timestamp).toLocaleTimeString();
            div.appendChild(ts);
            contenedor.appendChild(div);
            contenedor.scrollTop = contenedor.scrollHeight;
        })
        .subscribe();
}

// ============ COPIAR SALA ============
function copiarSalaId() {
    var salaId = localStorage.getItem('salaActiva') || 'bingo-default';
    navigator.clipboard.writeText(salaId).then(function() {
        alert('✅ ID de sala: ' + salaId);
    });
}

// ============ ACTUALIZAR UI ============
function actualizarUIMovil() {
    var juegoListo = window.etapaActual >= 3;
    var enPausa = window.enPausa || false;
    var partidaIniciada = window.partidaIniciada || false;
    
    if (window.jugadoresActivos && window.jugadoresActivos.length > 0) {
        var txt = document.getElementById('statusJugadoresTexto');
        var check = document.getElementById('statusJugadoresCheck');
        var card = document.getElementById('statusJugadoresCard');
        if (txt) txt.textContent = window.jugadoresActivos.length + ' jugadores';
        if (check) check.textContent = '✅';
        if (card) card.classList.add('completado');
    }
    
    if (window.patronBingo && window.patronBingo.some(function(x) { return x; })) {
        var txt = document.getElementById('statusPatronTexto');
        var check = document.getElementById('statusPatronCheck');
        var card = document.getElementById('statusPatronCard');
        if (txt) txt.textContent = 'Configurado';
        if (check) check.textContent = '✅';
        if (card) card.classList.add('completado');
    }
    
    setDisabled('btnEtapa2Mobile', !(window.etapaActual >= 2));
    setDisabled('btnProgramarMobile', !juegoListo || enPausa || !partidaIniciada);
    setDisabled('btnAutoMobile', !juegoListo || enPausa || !partidaIniciada);
    setDisabled('drawBtnMobile', !juegoListo || enPausa || !partidaIniciada);
    
    var navRuleta = document.getElementById('navRuleta');
    if (navRuleta) { navRuleta.style.opacity = juegoListo ? '1' : '0.5'; navRuleta.style.pointerEvents = juegoListo ? 'all' : 'none'; }
    
    verificarPartidaVigente();
}

function setDisabled(id, state) {
    var el = document.getElementById(id);
    if (el) el.disabled = state;
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

// ============ AUTO-AJUSTAR TEXTAREA ============
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
        if (alertaPC && alertaMobile && alertaPC.style.display === 'block') {
            alertaMobile.style.display = 'block';
            var ajPC = document.getElementById('alertaJugador');
            var acPC = document.getElementById('alertaCarton');
            if (ajPC) document.getElementById('alertaJugadorMobile').textContent = ajPC.textContent;
            if (acPC) document.getElementById('alertaCartonMobile').textContent = acPC.textContent;
        }
    }, 1000);
});
