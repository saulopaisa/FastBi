// ruleta.js - Panel de Control Completo (Móvil + Desktop)

var db = firebase.database();
var SALA_ID = localStorage.getItem('salaActiva') || 'bingo-default';

window.cantados = JSON.parse(localStorage.getItem('bingo_cantados_' + SALA_ID)) || [];
window.patronBingo = JSON.parse(localStorage.getItem('bingo_patron_' + SALA_ID)) || Array(25).fill(false);
window.jugadoresActivos = JSON.parse(localStorage.getItem('bingo_jugadores_' + SALA_ID)) || [];
window.cartonActual = null;
window.cartonEnAlerta = null;
window.juegoActivo = localStorage.getItem('bingo_activo_' + SALA_ID) === 'true';
window.modoAutomatico = false;
window.intervaloAutomatico = null;
window.intervaloTemporizador = null;
window.bingoDetectado = false;
window.etapaActual = localStorage.getItem('bingo_etapa_' + SALA_ID) ? parseInt(localStorage.getItem('bingo_etapa_' + SALA_ID)) : 1;
window.modoJuegoSeleccionado = null;
window.ganadoresPartida = parseInt(sessionStorage.getItem('ganadores_' + SALA_ID) || '0');
window.enPausa = false;
window.pausaTimeout = null;

// ============ SISTEMA DE TOAST ============
function mostrarToast(mensaje, tipo) {
    var anterior = document.querySelector('.toast-notification');
    if (anterior) anterior.remove();
    
    var toast = document.createElement('div');
    toast.className = 'toast-notification';
    if (tipo === 'error') toast.classList.add('toast-error');
    if (tipo === 'success') toast.classList.add('toast-success');
    toast.textContent = mensaje;
    document.body.appendChild(toast);
    
    setTimeout(function() { toast.classList.add('show'); }, 10);
    setTimeout(function() {
        toast.classList.remove('show');
        setTimeout(function() { if (toast.parentNode) toast.remove(); }, 300);
    }, 2500);
}

// ============ SINCRONIZAR ESTADO ============
function sincronizarEstadoDesdeFirebase() {
    db.ref('partidas/' + SALA_ID).once('value', function(snap) {
        var data = snap.val();
        if (!data) return;
        
        if (data.jugadoresActivos && data.jugadoresActivos.length > 0) {
            window.jugadoresActivos = data.jugadoresActivos;
            guardarEstado();
            if (window.etapaActual < 2) window.etapaActual = 2;
        }
        
        if (data.patron && data.patron.some(function(x) { return x; })) {
            window.patronBingo = data.patron;
            guardarEstado();
            if (window.etapaActual < 3) window.etapaActual = 3;
            window.juegoActivo = true;
            localStorage.setItem('bingo_activo_' + SALA_ID, 'true');
        }
        
        if (data.cantados && data.cantados.length > 0) {
            window.cantados = data.cantados;
            guardarEstado();
            window.juegoActivo = true;
            localStorage.setItem('bingo_activo_' + SALA_ID, 'true');
            if (window.etapaActual < 3) window.etapaActual = 3;
        }
        
        if (data.ganadoresCount !== undefined) {
            window.ganadoresPartida = data.ganadoresCount;
            sessionStorage.setItem('ganadores_' + SALA_ID, window.ganadoresPartida.toString());
        }
        
        if (data.modo === 'automatico') window.modoJuegoSeleccionado = 'automatico';
        else if (data.modo === 'manual') window.modoJuegoSeleccionado = 'manual';
        if (data.pausa) window.enPausa = data.pausa;
        
        actualizarEtapas();
        actualizarOnlineCount();
        inicializarTablero75();
        console.log('✅ Estado sincronizado - Etapa: ' + window.etapaActual);
    });
}

// ============ AUDIO ============
function reproducirAudioBingo(nombreJugador) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        var msg = new SpeechSynthesisUtterance('¡Alerta! Posible Bingo de ' + nombreJugador);
        msg.lang = 'es-ES'; msg.rate = 0.85; msg.volume = 1;
        window.speechSynthesis.speak(msg);
    }
}

function reproducirAudioBingoManual(nombreJugador) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        var msg = new SpeechSynthesisUtterance('¡Bingo! ¡Bingo! ' + nombreJugador + ' cantó Bingo');
        msg.lang = 'es-ES'; msg.rate = 0.9; msg.pitch = 1.3; msg.volume = 1;
        window.speechSynthesis.speak(msg);
    }
}

function reproducirAudioGanador(nombreJugador) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        var msg = new SpeechSynthesisUtterance('¡Tenemos un ganador! ¡' + nombreJugador + ' ha ganado!');
        msg.lang = 'es-ES'; msg.rate = 0.9; msg.volume = 1;
        window.speechSynthesis.speak(msg);
    }
}

// ============ TABLERO ============
function inicializarTablero75() {
    var grid = document.getElementById('historyGrid');
    if (!grid) return;
    grid.innerHTML = '';
    for (var i = 1; i <= 75; i++) {
        var div = document.createElement('div');
        div.className = 'celda-seguimiento';
        div.id = 'seguimiento-' + i;
        div.textContent = i;
        if (window.cantados.indexOf(i) !== -1) div.classList.add('cantada');
        grid.appendChild(div);
    }
    actualizarUltimaBola();
    actualizarUltimosCantados();
}

function actualizarUltimaBola() {
    var c = document.getElementById('ultimaBola');
    if (!c) return;
    if (window.cantados.length > 0) {
        var u = window.cantados[window.cantados.length - 1];
        c.querySelector('.letra').textContent = obtenerLetra(u);
        c.querySelector('.numero').textContent = u;
    } else {
        c.querySelector('.letra').textContent = '-';
        c.querySelector('.numero').textContent = '--';
    }
}

function actualizarUltimosCantados() {
    var c = document.getElementById('ultimosCantados');
    if (!c) return;
    c.innerHTML = '';
    var u = window.cantados.slice(-5).reverse();
    for (var i = 0; i < 5; i++) {
        var d = document.createElement('div');
        d.className = i < u.length ? 'ultimo-item' : 'ultimo-item vacio';
        d.innerHTML = i < u.length ? '<div class="letra-peq">' + obtenerLetra(u[i]) + '</div><div class="num-peq">' + u[i] + '</div>' : '<div class="letra-peq">-</div><div class="num-peq">--</div>';
        c.appendChild(d);
    }
}

function obtenerLetra(n) {
    if (n <= 15) return 'B'; if (n <= 30) return 'I';
    if (n <= 45) return 'N'; if (n <= 60) return 'G'; return 'O';
}

function guardarEstado() {
    localStorage.setItem('bingo_cantados_' + SALA_ID, JSON.stringify(window.cantados));
    localStorage.setItem('bingo_patron_' + SALA_ID, JSON.stringify(window.patronBingo));
    localStorage.setItem('bingo_jugadores_' + SALA_ID, JSON.stringify(window.jugadoresActivos));
    localStorage.setItem('bingo_activo_' + SALA_ID, window.juegoActivo.toString());
    localStorage.setItem('bingo_etapa_' + SALA_ID, window.etapaActual.toString());
}

function actualizarOnlineCount() {
    db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) {
        var count = 0;
        snap.forEach(function(child) {
            var c = child.val();
            if (c.estado === 'asignado' && window.jugadoresActivos.indexOf(c.asignadoA) !== -1) count++;
        });
        var el = document.getElementById('onlineCount');
        if (el) el.innerHTML = '👥 JUGADORES: ' + count + ' | 🏆 Ganadores: ' + window.ganadoresPartida + '/2';
    });
}

// ============ ETAPAS ============
function actualizarEtapas() {
    var btn1 = document.getElementById('btnEtapa1');
    var btn2 = document.getElementById('btnEtapa2');
    var btnAuto = document.getElementById('btnAutoBingo') || document.getElementById('btnAutoMobile');
    var btnManual = document.getElementById('drawBtn') || document.getElementById('drawBtnMobile');
    var btnProg = document.getElementById('btnProgramar') || document.getElementById('btnProgramarMobile');
    var panel = document.getElementById('panelJuego');
    var btnMsj = document.getElementById('btnMensaje');
    
    if (window.etapaActual === 1) {
        if (btn1) btn1.style.opacity = '1';
        if (btn2) { btn2.disabled = true; btn2.style.opacity = '0.4'; }
        if (btnAuto) { btnAuto.disabled = true; btnAuto.style.opacity = '0.4'; }
        if (btnManual) { btnManual.style.opacity = '0.4'; btnManual.style.pointerEvents = 'none'; }
        if (btnProg) btnProg.disabled = true;
        if (panel) { panel.style.opacity = '0.4'; panel.style.pointerEvents = 'none'; }
        if (btnMsj) btnMsj.disabled = true;
    } else if (window.etapaActual === 2) {
        if (btn1) btn1.style.opacity = '0.5';
        if (btn2) { btn2.disabled = false; btn2.style.opacity = '1'; }
        if (btnAuto) { btnAuto.disabled = true; btnAuto.style.opacity = '0.4'; }
        if (btnManual) { btnManual.style.opacity = '0.4'; btnManual.style.pointerEvents = 'none'; }
        if (btnProg) btnProg.disabled = true;
        if (panel) { panel.style.opacity = '0.4'; panel.style.pointerEvents = 'none'; }
        if (btnMsj) btnMsj.disabled = true;
    } else if (window.etapaActual === 3) {
        if (btn1) btn1.style.opacity = '0.5';
        if (btn2) { btn2.style.opacity = '0.5'; btn2.disabled = true; }
        if (btnAuto) { btnAuto.disabled = window.enPausa; btnAuto.style.opacity = window.enPausa ? '0.4' : '1'; }
        if (btnManual) { btnManual.style.opacity = window.enPausa ? '0.4' : '1'; btnManual.style.pointerEvents = window.enPausa ? 'none' : 'all'; }
        if (btnProg) btnProg.disabled = window.enPausa;
        if (panel) { panel.style.opacity = window.enPausa ? '0.4' : '1'; panel.style.pointerEvents = window.enPausa ? 'none' : 'all'; }
        if (btnMsj) btnMsj.disabled = false;
    }
}

function abrirModal(id) { var m = document.getElementById(id); if (m) m.classList.add('activo'); }
function cerrarModal(id) { var m = document.getElementById(id); if (m) m.classList.remove('activo'); }

// ============ ETAPA 1: JUGADORES ============
window.abrirModalCartones = function() {
    var modal = document.getElementById('modalCartones');
    var lista = document.getElementById('listaCheckCartones');
    if (!modal || !lista) return;
    
    abrirModal('modalCartones');
    lista.innerHTML = "<p style='color:var(--gold);text-align:center;'>Cargando...</p>";
    
    db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) {
        lista.innerHTML = '';
        if (!snap.exists()) {
            lista.innerHTML = "<p style='color:white;text-align:center;'>No hay cartones</p>";
            return;
        }
        
        var jugadoresUnicos = new Set();
        snap.forEach(function(child) {
            var c = child.val();
            if (c.asignadoA && !jugadoresUnicos.has(c.asignadoA)) {
                jugadoresUnicos.add(c.asignadoA);
                var item = document.createElement('div');
                item.className = 'item-jugador';
                item.setAttribute('data-jugador', c.asignadoA.toLowerCase());
                if (window.jugadoresActivos.indexOf(c.asignadoA) !== -1) item.classList.add('seleccionado');
                
                item.onclick = function() {
                    var idx = window.jugadoresActivos.indexOf(c.asignadoA);
                    if (idx !== -1) {
                        window.jugadoresActivos.splice(idx, 1);
                        item.classList.remove('seleccionado');
                    } else {
                        window.jugadoresActivos.push(c.asignadoA);
                        item.classList.add('seleccionado');
                    }
                    guardarEstado();
                };
                
                var count = 0;
                snap.forEach(function(ch) { if (ch.val().asignadoA === c.asignadoA) count++; });
                item.innerHTML = '<div style="font-size:1.5rem;">👤</div><div style="color:white;font-weight:bold;">' + c.asignadoA + '</div><div style="color:#ffca28;font-size:0.7rem;">' + count + ' cart.</div>';
                lista.appendChild(item);
            }
        });
        if (jugadoresUnicos.size === 0) lista.innerHTML = "<p style='color:white;text-align:center;'>No hay jugadores</p>";
    });
};

window.buscarJugadorModal = function(t) {
    document.querySelectorAll('.item-jugador').forEach(function(i) {
        var j = i.getAttribute('data-jugador');
        i.style.display = (j && j.indexOf(t.toLowerCase()) !== -1) ? '' : 'none';
    });
};

window.seleccionarTodosJugadores = function() {
    var items = document.querySelectorAll('.item-jugador');
    var todos = Array.from(items).every(function(i) { return i.classList.contains('seleccionado'); });
    if (todos) {
        window.jugadoresActivos = [];
        items.forEach(function(i) { i.classList.remove('seleccionado'); });
    } else {
        var nombres = new Set();
        db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) {
            snap.forEach(function(c) { if (c.val().asignadoA) nombres.add(c.val().asignadoA); });
            window.jugadoresActivos = Array.from(nombres);
            items.forEach(function(i) { i.classList.add('seleccionado'); });
            guardarEstado();
        });
    }
};

window.confirmarJugadores = function() {
    if (window.jugadoresActivos.length === 0) {
        mostrarToast('⚠️ Selecciona al menos un jugador', 'error');
        return;
    }
    db.ref('partidas/' + SALA_ID + '/jugadoresActivos').set(window.jugadoresActivos);
    window.etapaActual = 2;
    guardarEstado(); actualizarEtapas(); actualizarOnlineCount();
    cerrarModal('modalCartones');
    mostrarToast('✅ Jugadores confirmados', 'success');
};

// ============ ETAPA 2: PATRÓN ============
window.abrirModalPatron = function() {
    var modal = document.getElementById('modalPatron');
    var grid = document.getElementById('gridDibujoPatron');
    if (!modal || !grid) return;
    
    abrirModal('modalPatron');
    grid.innerHTML = '';
    window.patronBingo.forEach(function(a, i) {
        var celda = document.createElement('div');
        celda.className = 'celda-patron' + (a ? ' activa' : '');
        if (i === 12) celda.innerHTML = '⭐';
        celda.onclick = function() { window.patronBingo[i] = !window.patronBingo[i]; celda.classList.toggle('activa'); };
        grid.appendChild(celda);
    });
};

window.confirmarPatron = function() {
    db.ref('partidas/' + SALA_ID + '/patron').set(window.patronBingo);
    window.etapaActual = 3; window.juegoActivo = true;
    guardarEstado(); actualizarEtapas(); cerrarModal('modalPatron');
    mostrarToast('✅ Patrón confirmado - ¡Juego activado!', 'success');
};

window.aplicarPredefinido = function(t) {
    if (t === 'lleno') window.patronBingo = Array(25).fill(true);
    if (t === 'limpiar') window.patronBingo = Array(25).fill(false);
    if (t === 'equis') {
        window.patronBingo = Array(25).fill(false);
        [0,4,6,8,12,16,18,20,24].forEach(function(p) { window.patronBingo[p] = true; });
    }
    guardarEstado(); window.abrirModalPatron();
};

// ============ TEMPORIZADOR ============
window.programarJuego = function() {
    var inputMin = document.getElementById('minutosInicio') || document.getElementById('minutosInicioMobile');
    var min = parseInt(inputMin ? inputMin.value : 0) || 0;
    if (min <= 0) { mostrarToast('⚠️ Ingresa los minutos', 'error'); return; }
    
    var modo = confirm('⏰ ' + min + ' min.\n\n¿Modo AUTOMÁTICO al llegar a 0?\n✅ Aceptar = Auto\n❌ Cancelar = Manual');
    window.modoJuegoSeleccionado = modo ? 'automatico' : 'manual';
    if (window.intervaloTemporizador) clearInterval(window.intervaloTemporizador);
    
    var btnProg = document.getElementById('btnProgramar') || document.getElementById('btnProgramarMobile');
    if (btnProg) { btnProg.textContent = '⏳ ESPERANDO...'; btnProg.disabled = true; }
    
    var tiempo = min * 60;
    var cron = document.getElementById('cronometroBingo') || document.getElementById('cronometroBingoMobile');
    if (cron) cron.textContent = min + ':00';
    
    db.ref('partidas/' + SALA_ID).update({
        cronometro: tiempo, estado: 'iniciando', alertaInicio: 'inicio_' + Date.now(),
        mensajeAdmin: '⏰ Juego en ' + min + ' min', timestamp: Date.now()
    });
    
    mostrarToast('⏰ Cronómetro iniciado: ' + min + ' min', 'success');
    
    window.intervaloTemporizador = setInterval(function() {
        tiempo--;
        var mins = Math.floor(tiempo / 60), segs = tiempo % 60;
        if (cron) cron.textContent = String(mins).padStart(2,'0') + ':' + String(segs).padStart(2,'0');
        db.ref('partidas/' + SALA_ID).update({ cronometro: tiempo });
        
        if (tiempo <= 0) {
            clearInterval(window.intervaloTemporizador);
            window.intervaloTemporizador = null;
            if (cron) cron.textContent = '00:00';
            if (btnProg) { btnProg.textContent = '⏰ PROGRAMAR'; btnProg.disabled = false; }
            db.ref('partidas/' + SALA_ID).update({ estado: 'jugando', cronometro: 0, mensajeAdmin: '▶️ ¡Juego iniciado!', timestamp: Date.now() });
            if ('speechSynthesis' in window) {
                var msg = new SpeechSynthesisUtterance('¡Es hora de empezar el bingo!');
                msg.lang = 'es-ES'; window.speechSynthesis.speak(msg);
            }
            mostrarToast('▶️ ¡Juego iniciado!', 'success');
            if (window.modoJuegoSeleccionado === 'automatico') window.iniciarBingoAutomatico();
        }
    }, 1000);
};

// ============ MENSAJES ============
window.enviarMensajeJugador = function() {
    var mensaje = prompt('📝 Mensaje para TODOS los jugadores:');
    if (!mensaje || !mensaje.trim()) return;
    db.ref('partidas/' + SALA_ID).update({ mensajeAdmin: mensaje.trim(), timestamp: Date.now() });
    mostrarToast('✅ Mensaje enviado', 'success');
};

// ============ BINGO AUTOMÁTICO ============
window.iniciarBingoAutomatico = function() {
    if (window.modoAutomatico || window.enPausa) return;
    window.modoAutomatico = true; window.bingoDetectado = false;
    
    var btnAuto = document.getElementById('btnAutoBingo') || document.getElementById('btnAutoMobile');
    if (btnAuto) { btnAuto.textContent = '⏸️ DETENER'; btnAuto.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)'; btnAuto.onclick = window.detenerBingoAutomatico; }
    
    var btnManual = document.getElementById('drawBtn') || document.getElementById('drawBtnMobile');
    if (btnManual) { btnManual.style.opacity = '0.5'; btnManual.style.pointerEvents = 'none'; }
    
    function cantarAuto() {
        if (!window.modoAutomatico || window.enPausa) return;
        if (window.cantados.length >= 75) { window.detenerBingoAutomatico(); return; }
        var b, i = 0;
        do { b = Math.floor(Math.random()*75)+1; i++; } while (window.cantados.indexOf(b) !== -1 && i < 1000);
        cantarBola(b); verificarTodosLosCartones(); verificarPausa();
    }
    
    window.intervaloAutomatico = setInterval(cantarAuto, 11000);
    setTimeout(cantarAuto, 500);
    db.ref('partidas/' + SALA_ID).update({ modo: 'automatico' });
    mostrarToast('🤖 Bingo Automático INICIADO', 'success');
};

window.detenerBingoAutomatico = function() {
    window.modoAutomatico = false;
    if (window.intervaloAutomatico) { clearInterval(window.intervaloAutomatico); window.intervaloAutomatico = null; }
    
    var btnAuto = document.getElementById('btnAutoBingo') || document.getElementById('btnAutoMobile');
    if (btnAuto) { btnAuto.textContent = '🤖 BINGO AUTOMÁTICO'; btnAuto.style.background = 'linear-gradient(135deg, #8b5cf6, #7c3aed)'; btnAuto.onclick = window.iniciarBingoAutomatico; }
    
    var btnManual = document.getElementById('drawBtn') || document.getElementById('drawBtnMobile');
    if (btnManual) { btnManual.style.opacity = '1'; btnManual.style.pointerEvents = 'all'; }
    db.ref('partidas/' + SALA_ID).update({ modo: 'manual' });
    mostrarToast('🤖 Bingo Automático DETENIDO', 'error');
};

// ============ PAUSA CADA 25 ============
function verificarPausa() {
    if (window.cantados.length > 0 && window.cantados.length % 25 === 0 && window.cantados.length < 75 && !window.enPausa) {
        window.enPausa = true;
        db.ref('partidas/' + SALA_ID).update({ estado: 'pausa', pausa: true, mensajeAdmin: '⏸️ PAUSA 1 min', timestamp: Date.now() });
        if (window.modoAutomatico) window.detenerBingoAutomatico();
        actualizarEtapas();
        mostrarToast('⏸️ PAUSA de 1 minuto - 25 números cantados', 'error');
        window.pausaTimeout = setTimeout(function() {
            window.enPausa = false;
            db.ref('partidas/' + SALA_ID).update({ estado: 'jugando', pausa: false, mensajeAdmin: '▶️ Juego reanudado', timestamp: Date.now() });
            actualizarEtapas();
            mostrarToast('✅ Pausa terminada - Continuamos', 'success');
        }, 60000);
    }
}

// ============ CANTAR BOLA ============
function cantarBola(bola) {
    window.cantados.push(bola); guardarEstado();
    document.querySelectorAll('.celda-seguimiento.ultima').forEach(function(c) { c.classList.remove('ultima'); });
    var celda = document.getElementById('seguimiento-' + bola);
    if (celda) { celda.classList.add('cantada', 'ultima'); }
    actualizarUltimaBola(); actualizarUltimosCantados();
    if (window.cartonActual) {
        actualizarMinicartonEnAmbasVistas(window.cartonActual);
        verificarBingoAutomatico(window.cartonActual);
    }
    db.ref('partidas/' + SALA_ID).update({ ultimaBola: bola, ultimaLetra: obtenerLetra(bola), cantados: window.cantados, timestamp: Date.now() });
    if ('speechSynthesis' in window) {
        var msg = new SpeechSynthesisUtterance(obtenerLetra(bola) + ' ' + bola);
        msg.lang = 'es-ES'; msg.rate = 0.8; window.speechSynthesis.speak(msg);
    }
}

// Sorteo manual
var drawBtn = document.getElementById('drawBtn') || document.getElementById('drawBtnMobile');
if (drawBtn) {
    drawBtn.addEventListener('click', function() {
        if (window.modoAutomatico || window.etapaActual !== 3 || window.enPausa) return;
        if (window.cantados.length >= 75) { mostrarToast('🎉 Todos los números cantados', 'success'); return; }
        var b, i = 0;
        do { b = Math.floor(Math.random()*75)+1; i++; } while (window.cantados.indexOf(b) !== -1 && i < 1000);
        cantarBola(b); verificarTodosLosCartones(); verificarPausa();
    });
}

// ============ VERIFICACIONES ============
function verificarTodosLosCartones() {
    if (window.bingoDetectado) return;
    db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) {
        var bingo = false, ganador = null;
        snap.forEach(function(child) {
            var c = child.val();
            if (c.estado === 'asignado' && window.jugadoresActivos.indexOf(c.asignadoA) !== -1 && verificarBingoCarton(c) && !bingo) {
                bingo = true; ganador = c;
            }
        });
        if (bingo && ganador) { window.bingoDetectado = true; notificarBingo(ganador); }
    });
}

function verificarBingoCarton(c) {
    if (!c || !c.carton || !window.patronBingo) return false;
    for (var i = 0; i < 25; i++) {
        if (!window.patronBingo[i]) continue;
        var f = Math.floor(i/5), col = i%5, l = ['B','I','N','G','O'][col];
        if (i !== 12 && window.cantados.indexOf(c.carton[l][f]) === -1) return false;
    }
    return true;
}

// ============ VERIFICAR CARTÓN MANUAL ============
window.revisarCartonManual = function() {
    var idB = document.getElementById('idABuscar') || document.getElementById('idABuscarMobile');
    if (!idB) { mostrarToast('❌ Error: campo de búsqueda no encontrado', 'error'); return; }
    var id = idB.value.trim();
    if (!id) { mostrarToast('⚠️ Ingresa un ID o número de cartón', 'error'); return; }
    
    var contDesktop = document.getElementById('minicartonVerificador');
    var contMobile = document.getElementById('minicartonMobile');
    if (contDesktop) contDesktop.innerHTML = '<p style="color:#94a3b8;text-align:center;">Buscando...</p>';
    if (contMobile) contMobile.innerHTML = '<p style="color:#94a3b8;text-align:center;">Buscando...</p>';
    
    db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) {
        var encontrado = false, cartonEncontrado = null;
        snap.forEach(function(child) {
            var c = child.val();
            if ((c.numero == id || c.id === id) && !encontrado) { cartonEncontrado = c; encontrado = true; }
        });
        
        if (encontrado && cartonEncontrado) {
            window.cartonActual = cartonEncontrado;
            actualizarMinicartonEnAmbasVistas(cartonEncontrado);
            verificarBingoAutomatico(cartonEncontrado);
            mostrarToast('✅ Cartón #' + (cartonEncontrado.numero || id) + ' encontrado', 'success');
        } else {
            if (contDesktop) contDesktop.innerHTML = '<p style="color:#ef4444;text-align:center;">❌ Cartón no encontrado</p>';
            if (contMobile) contMobile.innerHTML = '<p style="color:#ef4444;text-align:center;">❌ Cartón no encontrado</p>';
            mostrarToast('❌ Cartón no encontrado', 'error');
        }
    });
};

// ============ GENERAR HTML DEL MINICARTÓN ============
function generarHTMLMinicarton(c) {
    if (!c || !c.carton) return '<p style="color:#ef4444;text-align:center;">Error: Cartón sin datos</p>';
    var marcados = 0;
    var html = '<div class="minicarton-info"><span><strong>#' + (c.numero||'?') + '</strong></span>';
    html += '<span class="minicarton-estado" id="estadoMini">' + (c.asignadoA||'Sin asignar') + '</span></div>';
    html += '<div style="text-align:center;font-size:0.6rem;color:#64748b;margin-bottom:5px;">Patrón: ' + obtenerNombrePatron() + '</div>';
    html += '<table style="width:100%;border-collapse:collapse;"><tr style="background:#ff4d4d;color:white;"><th style="padding:6px;font-size:0.7rem;">B</th><th style="padding:6px;font-size:0.7rem;">I</th><th style="padding:6px;font-size:0.7rem;">N</th><th style="padding:6px;font-size:0.7rem;">G</th><th style="padding:6px;font-size:0.7rem;">O</th></tr>';
    
    for (var f = 0; f < 5; f++) {
        html += '<tr>';
        ['B','I','N','G','O'].forEach(function(l) {
            var v = c.carton[l][f], centro = (l === 'N' && f === 2);
            var cantado = window.cantados.indexOf(v) !== -1;
            if (cantado && !centro) marcados++;
            var pi = f * 5 + ['B','I','N','G','O'].indexOf(l), esPatron = window.patronBingo[pi];
            html += '<td style="padding:6px;border:1px solid #e2e8f0;text-align:center;font-weight:bold;font-size:0.8rem;';
            if (centro) html += 'background:#fef3c7;';
            if (cantado && !centro) html += 'background:#10b981;color:white;';
            if (esPatron && !cantado && !centro) html += 'border:2px dashed #f59e0b;background:#fef3c7;';
            html += '">' + (centro ? '⭐' : v) + '</td>';
        });
        html += '</tr>';
    }
    html += '</table><div style="text-align:center;font-size:0.7rem;color:#64748b;margin-top:5px;">Marcados: ' + marcados + '/24</div>';
    return html;
}

function actualizarMinicartonEnAmbasVistas(c) {
    var html = generarHTMLMinicarton(c);
    var contDesktop = document.getElementById('minicartonVerificador');
    var contMobile = document.getElementById('minicartonMobile');
    if (contDesktop) contDesktop.innerHTML = html;
    if (contMobile) contMobile.innerHTML = html;
}

function verificarBingoAutomatico(c) {
    if (!c || !c.carton) return false;
    var bingo = true, faltantes = [];
    for (var i = 0; i < 25; i++) {
        if (!window.patronBingo[i]) continue;
        var f = Math.floor(i / 5), col = i % 5, l = ['B','I','N','G','O'][col], v = c.carton[l][f];
        if (i !== 12 && window.cantados.indexOf(v) === -1) { bingo = false; faltantes.push(l + '-' + v); }
    }
    var estadoEl = document.getElementById('estadoMini');
    if (estadoEl) {
        if (bingo) { estadoEl.className = 'minicarton-estado estado-bingo'; estadoEl.textContent = '🎉 ¡BINGO!'; }
        else { estadoEl.className = 'minicarton-estado'; estadoEl.textContent = 'Faltan: ' + faltantes.slice(0, 3).join(', ') + (faltantes.length > 3 ? '...' : ''); estadoEl.style.background = '#fef3c7'; estadoEl.style.color = '#92400e'; estadoEl.style.fontSize = '0.6rem'; }
    }
    var contDesktop = document.getElementById('minicartonVerificador');
    var contMobile = document.getElementById('minicartonMobile');
    if (bingo) { if (contDesktop) contDesktop.style.boxShadow = '0 0 20px #10b981'; if (contMobile) contMobile.style.boxShadow = '0 0 20px #10b981'; }
    else { if (contDesktop) contDesktop.style.boxShadow = ''; if (contMobile) contMobile.style.boxShadow = ''; }
    return bingo;
}

function obtenerNombrePatron() {
    var a = window.patronBingo.filter(function(x){return x;}).length;
    if (a === 25) return 'Lleno'; if (a === 0) return 'Sin patrón';
    if ([0,4,6,8,12,16,18,20,24].every(function(p){return window.patronBingo[p];}) && a === 9) return 'La X';
    return a + ' celdas';
}

// ============ NOTIFICAR REVISIÓN ============
window.notificarRevisionJugador = function() {
    var c = window.cartonEnAlerta || window.cartonActual;
    var nombre = c ? (c.asignadoA || 'Jugador') : 'Jugador';
    db.ref('partidas/' + SALA_ID + '/revisando').set({ activo: true, jugador: nombre, timestamp: Date.now() });
    mostrarToast('🔍 Revisando bingo de ' + nombre, 'success');
};

function finalizarRevision(jugador, resultado) {
    db.ref('partidas/' + SALA_ID + '/revisando').set({ activo: false });
    db.ref('partidas/' + SALA_ID + '/resultadoRevision').set({ jugador: jugador, resultado: resultado, timestamp: Date.now() });
}

// ============ NOTIFICACIONES ============
function notificarBingo(c) {
    var aj = document.getElementById('alertaJugador'), ac = document.getElementById('alertaCarton'), ab = document.getElementById('alertaBingo');
    if (aj) aj.textContent = '👤 ' + (c.asignadoA||'Sin asignar');
    if (ac) ac.textContent = '🎫 Cartón #' + (c.numero||'?');
    if (ab) { ab.style.display = 'block'; ab.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)'; ab.style.border = '2px solid #ffca28'; document.querySelector('.alerta-titulo').textContent = '⚠️ ALERTA: Este jugador tiene BINGO'; }
    window.cartonEnAlerta = c; reproducirAudioBingo(c.asignadoA || 'Jugador');
    mostrarToast('⚠️ ALERTA: Posible BINGO de ' + (c.asignadoA||'Jugador'), 'error');
    var cont = document.getElementById('notificacionesBingo');
    if (cont) { var notif = document.createElement('div'); notif.className = 'notificacion-bingo'; notif.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)'; notif.innerHTML = '<div class="notif-jugador">⚠️ ALERTA SISTEMA</div><div class="notif-carton">👤 ' + (c.asignadoA||'') + ' | 🎫 #' + (c.numero||'?') + '</div>'; cont.insertBefore(notif, cont.firstChild); }
}

function notificarBingoManual(c) {
    var aj = document.getElementById('alertaJugador'), ac = document.getElementById('alertaCarton'), ab = document.getElementById('alertaBingo');
    if (aj) aj.textContent = '👤 ' + (c.asignadoA||'Sin asignar');
    if (ac) ac.textContent = '🎫 Cartón #' + (c.numero||'?');
    if (ab) { ab.style.display = 'block'; ab.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)'; ab.style.border = '2px solid #ffca28'; document.querySelector('.alerta-titulo').textContent = '🚨 ¡BINGO! Jugador cantó BINGO'; }
    window.cartonEnAlerta = c; reproducirAudioBingoManual(c.asignadoA || 'Jugador');
    mostrarToast('🚨 ¡' + (c.asignadoA||'Jugador') + ' cantó BINGO!', 'error');
    db.ref('partidas/' + SALA_ID).update({ bingoCantado: c.asignadoA || 'Jugador', timestamp: Date.now() });
    var cont = document.getElementById('notificacionesBingo');
    if (cont) { var notif = document.createElement('div'); notif.className = 'notificacion-bingo'; notif.style.background = 'linear-gradient(135deg, #8b5cf6, #7c3aed)'; notif.style.borderLeft = '4px solid #ffca28'; notif.innerHTML = '<div class="notif-jugador">🚨 BINGO MANUAL</div><div class="notif-carton">👤 ' + (c.asignadoA||'') + ' | 🎫 #' + (c.numero||'?') + '</div>'; cont.insertBefore(notif, cont.firstChild); }
}

function escucharBingosJugadores() {
    db.ref('bingos/' + SALA_ID).on('child_added', function(snap) {
        var bingo = snap.val();
        db.ref('salas/' + SALA_ID + '/cartones/' + bingo.cartonId).once('value', function(cs) {
            var c = cs.val(); if (c) { notificarBingoManual(c); }
        });
    });
}

// ============ ALERTA ============
window.cerrarAlerta = function() {
    var ab = document.getElementById('alertaBingo');
    if (ab) { ab.style.display = 'none'; ab.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)'; }
    window.cartonEnAlerta = null;
};

window.bingoValido = function() {
    var c = window.cartonEnAlerta || window.cartonActual;
    var nombre = c ? (c.asignadoA || 'Jugador') : 'Jugador';
    if (window.ganadoresPartida >= 2) { mostrarToast('⚠️ Ya hay 2 ganadores', 'error'); return; }
    if (confirm('¿BINGO VÁLIDO para ' + nombre + '?\nGanadores: ' + window.ganadoresPartida + '/2')) {
        window.ganadoresPartida++; sessionStorage.setItem('ganadores_' + SALA_ID, window.ganadoresPartida.toString()); actualizarOnlineCount();
        db.ref('partidas/' + SALA_ID).update({ ganadoresCount: window.ganadoresPartida });
        finalizarRevision(nombre, 'valido'); window.cerrarAlerta(); reproducirAudioGanador(nombre);
        mostrarToast('🎉 ¡BINGO VÁLIDO! ' + nombre, 'success');
        if (window.ganadoresPartida >= 2) {
            db.ref('partidas/' + SALA_ID).update({ estado: 'terminado', ganador: nombre, timestamp: Date.now() });
            if (window.modoAutomatico) window.detenerBingoAutomatico();
            setTimeout(function() { if (confirm('🎉 ¿NUEVA PARTIDA?')) iniciarNuevaPartida(); }, 1000);
        } else {
            db.ref('partidas/' + SALA_ID).update({ mensajeAdmin: '🎉 ¡BINGO! ' + nombre, timestamp: Date.now() });
            window.bingoDetectado = false; window.cartonActual = null; window.cartonEnAlerta = null;
            var cont = document.getElementById('minicartonVerificador'); if (cont) cont.innerHTML = '<p style="color:#64748b;text-align:center;">Busca un cartón para verificar</p>';
            var contM = document.getElementById('minicartonMobile'); if (contM) contM.innerHTML = '<p style="color:#64748b;text-align:center;">Busca un cartón para verificar</p>';
        }
    }
};

window.bingoErrado = function() {
    var c = window.cartonEnAlerta || window.cartonActual;
    var nombre = c ? (c.asignadoA || 'Jugador') : 'Jugador';
    if (confirm('¿BINGO ERRADO para ' + nombre + '?')) {
        finalizarRevision(nombre, 'errado');
        db.ref('partidas/' + SALA_ID).update({ estado: 'jugando', mensaje: 'BINGO ERRADO', timestamp: Date.now() });
        window.bingoDetectado = false; window.cerrarAlerta(); window.cartonActual = null;
        var cont = document.getElementById('minicartonVerificador'); if (cont) cont.innerHTML = '<p style="color:#64748b;text-align:center;">Busca un cartón para verificar</p>';
        var contM = document.getElementById('minicartonMobile'); if (contM) contM.innerHTML = '<p style="color:#64748b;text-align:center;">Busca un cartón para verificar</p>';
        mostrarToast('❌ BINGO ERRADO - El juego continúa', 'error');
    }
};

// ============ NUEVA PARTIDA ============
function iniciarNuevaPartida() {
    window.cantados = []; window.bingoDetectado = false; window.cartonActual = null; window.cartonEnAlerta = null;
    window.ganadoresPartida = 0; window.enPausa = false;
    if (window.pausaTimeout) clearTimeout(window.pausaTimeout);
    if (window.modoAutomatico) window.detenerBingoAutomatico();
    sessionStorage.setItem('ganadores_' + SALA_ID, '0');
    localStorage.setItem('bingo_cantados_' + SALA_ID, JSON.stringify([]));
    db.ref('partidas/' + SALA_ID).set({ estado: 'nueva_partida', cantados: [], ultimaBola: null, ultimaLetra: null, mensajeAdmin: '🔄 Nueva partida', timestamp: Date.now(), patron: Array(25).fill(false), revisando: { activo: false }, resultadoRevision: null, pausa: false, cronometro: 0, alertaInicio: null, ganador: null, bingoCantado: null, ganadoresCount: 0 });
    db.ref('bingos/' + SALA_ID).remove();
    inicializarTablero75();
    var cont = document.getElementById('minicartonVerificador'); if (cont) cont.innerHTML = '<p style="color:#64748b;text-align:center;">Busca un cartón para verificar</p>';
    var contM = document.getElementById('minicartonMobile'); if (contM) contM.innerHTML = '<p style="color:#64748b;text-align:center;">Busca un cartón para verificar</p>';
    var notif = document.getElementById('notificacionesBingo'); if (notif) notif.innerHTML = '';
    var alerta = document.getElementById('alertaBingo'); if (alerta) alerta.style.display = 'none';
    var cron = document.getElementById('cronometroBingo') || document.getElementById('cronometroBingoMobile'); if (cron) cron.textContent = '00:00';
    var btnProg = document.getElementById('btnProgramar') || document.getElementById('btnProgramarMobile'); if (btnProg) { btnProg.textContent = '⏰ PROGRAMAR'; btnProg.disabled = false; }
    var btnAuto = document.getElementById('btnAutoBingo') || document.getElementById('btnAutoMobile'); if (btnAuto) { btnAuto.textContent = '🤖 BINGO AUTOMÁTICO'; btnAuto.style.background = 'linear-gradient(135deg, #8b5cf6, #7c3aed)'; btnAuto.onclick = window.iniciarBingoAutomatico; }
    actualizarEtapas(); actualizarOnlineCount();
    mostrarToast('🔄 Nueva partida iniciada', 'success');
    setTimeout(function() { db.ref('partidas/' + SALA_ID).update({ estado: 'jugando', cantados: [], timestamp: Date.now() }); }, 2000);
}

// ============ REINICIAR ============
var resetBtn = document.getElementById('resetBtn') || document.getElementById('btnReiniciarPartida');
if (resetBtn) {
    resetBtn.addEventListener('click', function() {
        if (confirm('⚠️ ¿Reiniciar todo?')) {
            if (window.intervaloAutomatico) clearInterval(window.intervaloAutomatico);
            if (window.intervaloTemporizador) clearInterval(window.intervaloTemporizador);
            if (window.pausaTimeout) clearTimeout(window.pausaTimeout);
            window.cantados = []; window.patronBingo = Array(25).fill(false); window.jugadoresActivos = [];
            window.juegoActivo = false; window.modoAutomatico = false; window.bingoDetectado = false;
            window.etapaActual = 1; window.modoJuegoSeleccionado = null; window.ganadoresPartida = 0; window.enPausa = false;
            sessionStorage.setItem('ganadores_' + SALA_ID, '0');
            ['bingo_cantados_','bingo_patron_','bingo_jugadores_','bingo_activo_','bingo_etapa_'].forEach(function(k) { localStorage.removeItem(k + SALA_ID); });
            db.ref('partidas/' + SALA_ID).remove(); db.ref('bingos/' + SALA_ID).remove();
            inicializarTablero75(); actualizarEtapas();
            var cont = document.getElementById('minicartonVerificador'); if (cont) cont.innerHTML = '<p style="color:#64748b;text-align:center;">Busca un cartón para verificar</p>';
            var contM = document.getElementById('minicartonMobile'); if (contM) contM.innerHTML = '<p style="color:#64748b;text-align:center;">Busca un cartón para verificar</p>';
            var notif = document.getElementById('notificacionesBingo'); if (notif) notif.innerHTML = '';
            var alerta = document.getElementById('alertaBingo'); if (alerta) alerta.style.display = 'none';
            var cron = document.getElementById('cronometroBingo') || document.getElementById('cronometroBingoMobile'); if (cron) cron.textContent = '00:00';
            var bp = document.getElementById('btnProgramar') || document.getElementById('btnProgramarMobile'); if (bp) { bp.textContent = '⏰ PROGRAMAR'; bp.disabled = false; }
            var ba = document.getElementById('btnAutoBingo') || document.getElementById('btnAutoMobile'); if (ba) { ba.textContent = '🤖 BINGO AUTOMÁTICO'; ba.style.background = 'linear-gradient(135deg, #8b5cf6, #7c3aed)'; ba.onclick = window.iniciarBingoAutomatico; }
            actualizarOnlineCount();
            mostrarToast('🔄 Todo reiniciado', 'success');
        }
    });
}

// ============ TECLAS (CORREGIDO - NO INTERFIERE CON INPUTS) ============
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        cerrarModal('modalCartones');
        cerrarModal('modalPatron');
        cerrarModal('modalEliminarJugadores');
    }
    
    if (e.code === 'Space' && window.etapaActual === 3 && !window.modoAutomatico && !window.enPausa) {
        var tag = (e.target.tagName || '').toLowerCase();
        var isInput = (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable);
        
        if (!isInput) {
            e.preventDefault();
            var btn = document.getElementById('drawBtn') || document.getElementById('drawBtnMobile');
            if (btn) btn.click();
        }
    }
});

// ============ INICIAR ============
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎮 Panel iniciado - Sala:', SALA_ID);
    inicializarTablero75();
    escucharBingosJugadores();
    actualizarEtapas();
    actualizarOnlineCount();
    sincronizarEstadoDesdeFirebase();
    
    if (window.juegoActivo && window.etapaActual === 3) actualizarEtapas();
    
    db.ref('partidas/' + SALA_ID).on('value', function(snap) {
        var data = snap.val();
        if (data && data.cantados && data.cantados.length > window.cantados.length) {
            window.cantados = data.cantados;
            guardarEstado();
            inicializarTablero75();
            if (window.cartonActual) {
                actualizarMinicartonEnAmbasVistas(window.cartonActual);
                verificarBingoAutomatico(window.cartonActual);
            }
        }
        if (data && data.pausa !== undefined && data.pausa !== window.enPausa) { window.enPausa = data.pausa; actualizarEtapas(); }
        if (data && data.ganadoresCount !== undefined && data.ganadoresCount !== window.ganadoresPartida) {
            window.ganadoresPartida = data.ganadoresCount;
            sessionStorage.setItem('ganadores_' + SALA_ID, window.ganadoresPartida.toString());
            actualizarOnlineCount();
        }
    });
});
